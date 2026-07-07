#!/usr/bin/env bash
#
# Reproduce scanic-ml/dist/* from the source model. Builds TWO wasm flavors:
#
#   dist/            single-threaded (default, zero-config, works on any page)
#   dist/threaded/   multi-threaded (~2-3x faster inference; the HOST PAGE must
#                    be cross-origin isolated: `COOP: same-origin` and
#                    `COEP: require-corp` response headers, so `SharedArrayBuffer`
#                    is available)
#
# Designed to run inside the build/Dockerfile image with the scanic-ml package
# mounted at /work:
#
#   docker build -t scanic-ml-build scanic-ml/build
#   docker run --rm -v "$PWD/scanic-ml:/work" \
#     -v "$PWD/scripts/ml-spike/model:/model:ro" scanic-ml-build
#
# Outputs:
#   dist/doccornernet_lean.ort               (the model, ORT format)
#   dist/ort-wasm-simd.wasm                  (~1.5 MB single-thread runtime, SIMD)
#   dist/ort-wasm-simd-threaded.mjs          (single-thread loader, copied to the
#                                              name ort-web requests)
#   dist/threaded/ort-wasm-simd-threaded.wasm (multi-thread runtime, SIMD + pthreads)
#   dist/threaded/ort-wasm-simd-threaded.mjs  (native multi-thread loader)
#
# The threaded dir ships only the wasm + loader. The .ort model is identical
# between flavors, so it lives once at dist/ and both flavors load it from there
# (mlDetector.js fetches the model from the base URL and the wasm from
# dist/threaded/ when `threaded: true`).
#
# Pinned so the JS peer (onnxruntime-web@1.23.x) matches the wasm ABI exactly.
set -euo pipefail

ORT_VERSION=v1.23.2
WORK=${WORK:-/work}
SRC_MODEL=${SRC_MODEL:-/model/doccornernet_lean.onnx}
DIST="$WORK/dist"
DIST_THREADED="$DIST/threaded"
CONFIG="$WORK/build/required_operators.config"
BUILD_ROOT=${BUILD_ROOT:-/tmp/ortbuild}

mkdir -p "$DIST" "$DIST_THREADED" "$BUILD_ROOT"

# 1) Convert the .onnx model to ORT format. The reduced/minimal runtime cannot
#    parse .onnx; it loads .ort. This also (re)generates the required-ops config.
#    One model, shared by both wasm flavors (it lives only in dist/).
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

# 2) Clone ONNX Runtime at the pinned version (shallow, with submodules). One
#    checkout, built twice below (once per wasm flavor, into separate build dirs).
if [ ! -d "$BUILD_ROOT/onnxruntime" ]; then
  echo "==> Cloning onnxruntime $ORT_VERSION"
  git clone --recursive --depth 1 --branch "$ORT_VERSION" \
    https://github.com/microsoft/onnxruntime.git "$BUILD_ROOT/onnxruntime"
fi
cd "$BUILD_ROOT/onnxruntime"

COMMON_FLAGS=(
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
)

# 3) Single-threaded build (default, zero-config, works on any page).
echo "==> Building single-thread ORT-Web wasm"
python ./tools/ci_build/build.py --build_dir ./build/wasm_min "${COMMON_FLAGS[@]}"
OUT="./build/wasm_min/MinSizeRel"
cp "$OUT/ort-wasm-simd.wasm" "$DIST/ort-wasm-simd.wasm"
# onnxruntime-web's JS loader always imports `ort-wasm-simd-threaded.mjs`; our
# single-thread loader works under that name and references ort-wasm-simd.wasm.
cp "$OUT/ort-wasm-simd.mjs" "$DIST/ort-wasm-simd-threaded.mjs"

# 4) Multi-threaded build: same op set, `--enable_wasm_threads` compiles with
#    pthread support. Needs cross-origin isolation on the host page to run with
#    more than 1 thread (falls back gracefully to 1 thread otherwise).
#    CMake's threaded-wasm post-build step shells out to `node` directly, so
#    (unlike the single-thread build) it needs emsdk's bundled Node on PATH.
#    emsdk itself was already installed as a side effect of the single-thread
#    build.py run above.
EMSDK_DIR="$BUILD_ROOT/onnxruntime/cmake/external/emsdk"
if [ -f "$EMSDK_DIR/emsdk_env.sh" ]; then
  # shellcheck disable=SC1091
  source "$EMSDK_DIR/emsdk_env.sh"
fi
echo "==> Building multi-thread ORT-Web wasm"
python ./tools/ci_build/build.py --build_dir ./build/wasm_mt "${COMMON_FLAGS[@]}" --enable_wasm_threads
OUT_MT="./build/wasm_mt/MinSizeRel"
cp "$OUT_MT/ort-wasm-simd-threaded.wasm" "$DIST_THREADED/ort-wasm-simd-threaded.wasm"
cp "$OUT_MT/ort-wasm-simd-threaded.mjs" "$DIST_THREADED/ort-wasm-simd-threaded.mjs"

echo "==> Done. Artifacts:"
ls -lh "$DIST"
ls -lh "$DIST_THREADED"

