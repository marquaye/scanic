#!/usr/bin/env bash
#
# Reproduce scanic-ml/dist/* from the source model. Builds ONE wasm flavor:
# a pthread-capable minimal ORT-Web runtime. It runs on 1 thread by default
# (works on any page, no special headers) and on more threads (roughly 2x
# faster inference) when the host page is cross-origin isolated (`COOP:
# same-origin` + `COEP: require-corp`, so `SharedArrayBuffer` is available).
# Requesting more threads without isolation falls back cleanly to 1 thread,
# so a single build safely serves both cases; see scanic-ml/MODEL_CARD.md for
# the measured single- vs multi-thread numbers, including the negligible
# (~4%) overhead of using this build in single-thread mode.
#
# Designed to run inside the build/Dockerfile image with the scanic-ml package
# mounted at /work:
#
#   docker build -t scanic-ml-build scanic-ml/build
#   docker run --rm -v "$PWD/scanic-ml:/work" \
#     -v "$PWD/scripts/ml-spike/model:/model:ro" scanic-ml-build
#
# Outputs:
#   dist/doccornernet_lean.ort         (the model, ORT format)
#   dist/ort-wasm-simd-threaded.wasm   (~1.5 MB runtime, SIMD + pthreads)
#   dist/ort-wasm-simd-threaded.mjs    (emscripten loader; the name
#                                        onnxruntime-web's JS always imports)
#
# Pinned so the JS peer (onnxruntime-web@1.27.x) matches the wasm ABI exactly.
set -euo pipefail

ORT_VERSION=v1.27.0
WORK=${WORK:-/work}
SRC_MODEL=${SRC_MODEL:-/model/doccornernet_lean.onnx}
DIST="$WORK/dist"
CONFIG="$WORK/build/required_operators.config"
BUILD_ROOT=${BUILD_ROOT:-/tmp/ortbuild}

mkdir -p "$DIST" "$BUILD_ROOT"

# 1) Convert the .onnx model to ORT format. The reduced/minimal runtime cannot
#    parse .onnx; it loads .ort. This also (re)generates the required-ops config.
echo "==> Converting $SRC_MODEL to ORT format"
cp "$SRC_MODEL" "$BUILD_ROOT/doccornernet_lean.onnx"
python -m onnxruntime.tools.convert_onnx_models_to_ort \
  "$BUILD_ROOT/doccornernet_lean.onnx" \
  --output_dir "$BUILD_ROOT/ort_out" \
  --enable_type_reduction
cp "$BUILD_ROOT/ort_out/doccornernet_lean.with_runtime_opt.ort" "$DIST/doccornernet_lean.ort"
# Keep the committed op config authoritative, but surface drift if the model changed.
cp "$BUILD_ROOT/ort_out/doccornernet_lean.required_operators_and_types.with_runtime_opt.config" \
   "$BUILD_ROOT/required_operators.generated.config"

# 2) Clone ONNX Runtime at the pinned version (shallow, with submodules; this
#    also pulls in the emsdk submodule at cmake/external/emsdk).
if [ ! -d "$BUILD_ROOT/onnxruntime" ]; then
  echo "==> Cloning onnxruntime $ORT_VERSION"
  git clone --recursive --depth 1 --branch "$ORT_VERSION" \
    https://github.com/microsoft/onnxruntime.git "$BUILD_ROOT/onnxruntime"
fi
cd "$BUILD_ROOT/onnxruntime"

BUILD_FLAGS=(
  --config MinSizeRel
  --build_wasm
  --skip_tests
  --parallel
  --minimal_build extended
  --disable_ml_ops
  --disable_rtti
  --disable_wasm_exception_catching
  --enable_wasm_simd
  --enable_reduced_operator_type_support
  --include_ops_by_config "$CONFIG"
  --allow_running_as_root
  --target onnxruntime_webassembly
  --enable_wasm_threads
  # Newer emsdk/Clang toolchains raise warnings (e.g. LLVM autovectorization
  # "-Wpass-failed=transform-warning" inside libc++ headers) that ORT's build
  # promotes to hard errors on older-pinned ORT versions that didn't account
  # for them. This doesn't affect the compiled output, only whether an
  # unrelated new warning class aborts the build.
  --compile_no_warning_as_error
)

# 3) Build the pthread-capable wasm. `--enable_wasm_threads` compiles with
#    pthread support (SIMD + threads). CMake's threaded-wasm post-build step
#    shells out to `node` directly, which needs emsdk's bundled node on PATH.
#    build.py installs/activates emsdk (generating emsdk_env.sh) as part of
#    its own run, but only partway through, so a genuinely fresh BUILD_ROOT
#    hits that node-not-on-PATH failure on the first attempt. Retry once with
#    emsdk_env.sh sourced, which by then exists.
echo "==> Building ORT-Web wasm (SIMD + pthreads)"
EMSDK_DIR="$BUILD_ROOT/onnxruntime/cmake/external/emsdk"
if ! python ./tools/ci_build/build.py --build_dir ./build/wasm_mt "${BUILD_FLAGS[@]}"; then
  if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
    echo "==> First attempt failed (expected on a fresh checkout); retrying with emsdk's node on PATH"
    # shellcheck disable=SC1091
    source "$EMSDK_DIR/emsdk_env.sh"
    python ./tools/ci_build/build.py --build_dir ./build/wasm_mt "${BUILD_FLAGS[@]}"
  else
    echo "==> Build failed and no emsdk_env.sh was generated; not a node-on-PATH issue" >&2
    exit 1
  fi
fi
OUT_MT="./build/wasm_mt/MinSizeRel"
cp "$OUT_MT/ort-wasm-simd-threaded.wasm" "$DIST/ort-wasm-simd-threaded.wasm"
cp "$OUT_MT/ort-wasm-simd-threaded.mjs" "$DIST/ort-wasm-simd-threaded.mjs"

echo "==> Done. Artifacts:"
ls -lh "$DIST"
