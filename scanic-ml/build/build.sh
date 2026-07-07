#!/usr/bin/env bash
#
# Reproduce scanic-ml/dist/* from the source model. Designed to run inside the
# build/Dockerfile image with the scanic-ml package mounted at /work:
#
#   docker build -t scanic-ml-build scanic-ml/build
#   docker run --rm -v "$PWD/scanic-ml:/work" \
#     -v "$PWD/scripts/ml-spike/model:/model:ro" scanic-ml-build
#
# Outputs into /work/dist:
#   doccornernet_lean.ort          (the model, ORT format; minimal builds need this)
#   ort-wasm-simd.wasm             (~1.5 MB custom minimal runtime, SIMD)
#   ort-wasm-simd-threaded.mjs     (emscripten loader, copied to the name ort-web requests)
#
# Pinned so the JS peer (onnxruntime-web@1.23.x) matches the wasm ABI exactly.
set -euo pipefail

ORT_VERSION=v1.23.2
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

# 2) Clone ONNX Runtime at the pinned version (shallow, with submodules).
if [ ! -d "$BUILD_ROOT/onnxruntime" ]; then
  echo "==> Cloning onnxruntime $ORT_VERSION"
  git clone --recursive --depth 1 --branch "$ORT_VERSION" \
    https://github.com/microsoft/onnxruntime.git "$BUILD_ROOT/onnxruntime"
fi

# 3) Build the minimal, SIMD, single-thread wasm with only our ops compiled in.
echo "==> Building minimal ORT-Web wasm"
cd "$BUILD_ROOT/onnxruntime"
python ./tools/ci_build/build.py \
  --build_dir ./build/wasm_min \
  --config MinSizeRel \
  --build_wasm \
  --skip_tests \
  --parallel \
  --minimal_build extended \
  --disable_ml_ops \
  --disable_rtti \
  --disable_wasm_exception_catching \
  --enable_wasm_simd \
  --enable_reduced_operator_type_support \
  --include_ops_by_config "$CONFIG" \
  --allow_running_as_root \
  --target onnxruntime_webassembly

OUT=./build/wasm_min/MinSizeRel
cp "$OUT/ort-wasm-simd.wasm" "$DIST/ort-wasm-simd.wasm"
# onnxruntime-web's JS loader always imports `ort-wasm-simd-threaded.mjs`; our
# single-thread loader works under that name and references ort-wasm-simd.wasm.
cp "$OUT/ort-wasm-simd.mjs" "$DIST/ort-wasm-simd-threaded.mjs"

echo "==> Done. Artifacts:"
ls -lh "$DIST"
