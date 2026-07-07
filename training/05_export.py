"""
Step 5 -- Export fine-tuned model to ONNX INT8.

Two-stage export:
  Stage 1: SavedModel -> ONNX float32 (via tf2onnx)
  Stage 2: ONNX float32 -> ONNX INT8 via static quantization with calibration
            data from our val split. This is NOT dynamic (weight-only) quant --
            it uses real image statistics to calibrate every op's scale and
            zero-point, which is the path that keeps accuracy intact for
            depthwise separable convolutions in MobileNetV2.

If the input is a QAT model (contains FakeQuant nodes), tf2onnx automatically
converts them to QuantizeLinear / DequantizeLinear ops (QDQ format), giving a
pure INT8 ONNX graph without the Stage 2 static-quant step.

Output:
  models/exported/model_float32.onnx
  models/exported/model_int8.onnx      ← final deploy artifact
  models/exported/benchmark_report.json

Usage:
    python 05_export.py [--model PATH] [--opset 17] [--calibration-n 200]
                        [--no-static-quant]   (skip Stage 2, keep float32 only)
                        [--onnx-only PATH]    (skip Stage 1, start from existing ONNX)
"""

import argparse
import json
import os
import time
from pathlib import Path

import cv2
import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")

SCRIPT_DIR  = Path(__file__).parent
MODELS_DIR  = SCRIPT_DIR / "models"
EXPORT_DIR  = MODELS_DIR / "exported"
NORM_DIR    = SCRIPT_DIR / "data" / "normalized"
REPO_ROOT   = SCRIPT_DIR.parent

# Default: prefer QAT checkpoint; fall back to float checkpoint
DEFAULT_MODEL = (
    MODELS_DIR / "qat_checkpoint" / "final_model"
    if (MODELS_DIR / "qat_checkpoint" / "final_model").exists()
    else MODELS_DIR / "float_checkpoint" / "final_model"
)

ORIGINAL_ONNX = REPO_ROOT / "scripts" / "ml-spike" / "model" / "doccornernet.onnx"

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)


# preprocessing 

def preprocess(bgr: np.ndarray) -> np.ndarray:
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgb = cv2.resize(rgb, (SIZE, SIZE), interpolation=cv2.INTER_AREA).astype(np.float32)
    rgb = (rgb / 255.0 - MEAN) / STD
    return rgb[np.newaxis]


# Stage 1: SavedModel -> ONNX 

def export_to_onnx(model_path: Path, out_path: Path, opset: int = 17) -> Path:
    """Convert Keras SavedModel to ONNX float32 (or QDQ INT8 if QAT model)."""
    import tensorflow as tf
    import tf2onnx  # type: ignore

    print(f"\n Stage 1: SavedModel -> ONNX (opset {opset}) ")
    print(f"  Input:  {model_path}")
    print(f"  Output: {out_path}")

    out_path.parent.mkdir(parents=True, exist_ok=True)

    model = tf.keras.models.load_model(str(model_path))
    spec = (tf.TensorSpec((1, SIZE, SIZE, 3), tf.float32, name="image"),)

    model_proto, _ = tf2onnx.convert.from_keras(
        model,
        input_signature=spec,
        opset=opset,
        output_path=str(out_path),
    )

    size_kb = out_path.stat().st_size / 1024
    print(f"  Written: {out_path.name} ({size_kb:.0f} KB)")

    # Rename outputs to match the original model contract
    _rename_onnx_outputs(out_path, model)
    return out_path


def _rename_onnx_outputs(onnx_path: Path, keras_model):
    """Attempt to rename ONNX outputs to 'coords' and 'score_logit'."""
    try:
        import onnx

        model_proto = onnx.load(str(onnx_path))
        graph = model_proto.graph
        renamed = []
        for out in graph.output:
            shape = [d.dim_value for d in out.type.tensor_type.shape.dim]
            flat = 1
            for d in shape:
                flat *= d if d > 0 else 1
            if flat == 8 and "coords" not in renamed:
                out.name = "coords"
                renamed.append("coords")
            elif flat == 1 and "score_logit" not in renamed:
                out.name = "score_logit"
                renamed.append("score_logit")
        onnx.save(model_proto, str(onnx_path))
        print(f"  Outputs renamed: {renamed}")
    except Exception as exc:
        print(f"  [WARN] Could not rename outputs: {exc}")


# Stage 2: ONNX float32 -> ONNX INT8 (static quantization) 

class _CalibrationReader:
    """ORT calibration data reader -- feeds real document images."""

    def __init__(self, records: list[dict], n: int, input_name: str):
        self._data = []
        for rec in records[:n]:
            bgr = cv2.imread(rec["file"])
            if bgr is not None:
                self._data.append({input_name: preprocess(bgr)})
        self._idx = 0

    def get_next(self):
        if self._idx >= len(self._data):
            return None
        d = self._data[self._idx]
        self._idx += 1
        return d


def quantize_static(fp32_onnx: Path, int8_onnx: Path, val_records: list[dict],
                    n_calib: int = 200, input_name: str = "image") -> Path:
    """Run ORT static (calibration-based) INT8 quantization."""
    from onnxruntime.quantization import (  # type: ignore
        CalibrationDataReader,
        QuantFormat,
        QuantType,
        quantize_static as ort_quantize_static,
        quant_pre_process,
    )

    print(f"\n Stage 2: ONNX float32 -> INT8 (static, {n_calib} calibration images) ")
    print(f"  Input:  {fp32_onnx}")
    print(f"  Output: {int8_onnx}")

    int8_onnx.parent.mkdir(parents=True, exist_ok=True)

    # Pre-process: shape inference + constant folding (improves quantization quality)
    prep_path = fp32_onnx.parent / (fp32_onnx.stem + ".prep.onnx")
    try:
        quant_pre_process(str(fp32_onnx), str(prep_path), skip_symbolic_shape=True)
        src = prep_path
    except Exception as exc:
        print(f"  [WARN] Pre-process failed ({exc}), using raw float32 ONNX")
        src = fp32_onnx

    class _Reader(CalibrationDataReader):
        def __init__(self, records, n, name):
            inner = _CalibrationReader(records, n, name)
            self._data = inner._data
            self._idx = 0

        def get_next(self):
            if self._idx >= len(self._data):
                return None
            d = self._data[self._idx]
            self._idx += 1
            return d

    reader = _Reader(val_records, n_calib, input_name)
    if not reader._data:
        print("  [WARN] No calibration images found -- skipping static quantization")
        return fp32_onnx

    ort_quantize_static(
        model_input=str(src),
        model_output=str(int8_onnx),
        calibration_data_reader=reader,
        quant_format=QuantFormat.QDQ,          # QLinearConv / QLinearMatMul
        per_channel=False,                      # per-tensor: safer for ORT-Web
        weight_type=QuantType.QInt8,
        activation_type=QuantType.QInt8,
        optimize_model=False,                   # let ORT-Web do its own opt
    )

    if prep_path.exists():
        prep_path.unlink()

    size_kb = int8_onnx.stat().st_size / 1024
    print(f"  Written: {int8_onnx.name} ({size_kb:.0f} KB)")
    return int8_onnx


# accuracy / latency validation 

def decode_corners(coords: np.ndarray, w: int, h: int) -> dict:
    c = coords.flatten()
    return {
        "topLeft":     {"x": float(c[0] * w), "y": float(c[1] * h)},
        "topRight":    {"x": float(c[2] * w), "y": float(c[3] * h)},
        "bottomRight": {"x": float(c[4] * w), "y": float(c[5] * h)},
        "bottomLeft":  {"x": float(c[6] * w), "y": float(c[7] * h)},
    }


def corner_error_px(pred: dict, gt: dict) -> float:
    keys = ["topLeft", "topRight", "bottomRight", "bottomLeft"]
    return float(np.mean([
        ((pred[k]["x"] - gt[k]["x"])**2 + (pred[k]["y"] - gt[k]["y"])**2) ** 0.5
        for k in keys
    ]))


def validate_onnx(onnx_path: Path, records: list[dict], n: int = 100,
                  warmup: int = 3, timed: int = 20) -> dict:
    """Run validation: latency + corner error vs ground truth."""
    import onnxruntime as ort

    print(f"\n Validation: {onnx_path.name} ")
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 1
    sess = ort.InferenceSession(str(onnx_path), opts, providers=["CPUExecutionProvider"])
    input_name = sess.get_inputs()[0].name

    lats, errs = [], []
    for rec in records[:n]:
        bgr = cv2.imread(rec["file"])
        if bgr is None:
            continue
        h, w = bgr.shape[:2]
        tensor = preprocess(bgr)
        feeds = {input_name: tensor}

        # Warmup
        for _ in range(warmup):
            sess.run(None, feeds)

        # Timed
        run_times = []
        coords_out = None
        for _ in range(timed):
            t0 = time.perf_counter()
            outs = sess.run(None, feeds)
            run_times.append((time.perf_counter() - t0) * 1000)
            for out in outs:
                if out.size == 8:
                    coords_out = out

        if coords_out is None:
            continue

        lats.append(float(np.median(run_times)))
        pred = decode_corners(coords_out, w, h)
        errs.append(corner_error_px(pred, rec["corners"]))

    result = {
        "model":           onnx_path.name,
        "size_kb":         round(onnx_path.stat().st_size / 1024, 1),
        "n_images":        len(lats),
        "lat_med_ms":      round(float(np.median(lats)), 2) if lats else None,
        "lat_p95_ms":      round(float(np.percentile(lats, 95)), 2) if lats else None,
        "corner_err_mean": round(float(np.mean(errs)), 2) if errs else None,
        "corner_err_p95":  round(float(np.percentile(errs, 95)), 2) if errs else None,
    }
    print(f"  Size:          {result['size_kb']} KB")
    print(f"  Latency:       {result['lat_med_ms']} ms median  {result['lat_p95_ms']} ms p95")
    print(f"  Corner error:  {result['corner_err_mean']} px mean  {result['corner_err_p95']} px p95")
    return result


# main 

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model",          type=Path, default=DEFAULT_MODEL)
    parser.add_argument("--opset",          type=int,  default=17)
    parser.add_argument("--calibration-n",  type=int,  default=200)
    parser.add_argument("--no-static-quant", action="store_true",
                        help="Only export float32 ONNX, skip INT8 quantization")
    parser.add_argument("--onnx-only",      type=Path, default=None,
                        help="Skip Stage 1, start from an existing ONNX float32 model")
    parser.add_argument("--validate-n",     type=int,  default=100)
    args = parser.parse_args()

    EXPORT_DIR.mkdir(parents=True, exist_ok=True)

    # Stage 1 
    fp32_out = EXPORT_DIR / "model_float32.onnx"

    if args.onnx_only:
        fp32_out = args.onnx_only
        print(f"  Skipping Stage 1; using existing ONNX: {fp32_out}")
    elif not args.model.exists():
        # Fall back to original spike model for testing the pipeline
        if ORIGINAL_ONNX.exists():
            print(f"  [WARN] No fine-tuned model found. Using original spike model for export test.")
            fp32_out = ORIGINAL_ONNX
        else:
            print(f"[error] No model found at {args.model}")
            print("  Run  python 01_download.py --model  +  python 04_finetune_qat.py  first.")
            return
    else:
        fp32_out = export_to_onnx(args.model, fp32_out, args.opset)

    # Load calibration data 
    val_json = NORM_DIR / "val.json"
    val_records = []
    if val_json.exists():
        val_records = json.loads(val_json.read_text())["images"]
        print(f"\n  Calibration data: {len(val_records)} val images")
    else:
        print("  [WARN] No val.json found -- skipping calibration-based quantization")
        args.no_static_quant = True

    # Stage 2 
    int8_out = EXPORT_DIR / "model_int8.onnx"
    if not args.no_static_quant:
        # Determine the correct input name from the float32 model
        import onnxruntime as ort
        sess_fp32 = ort.InferenceSession(str(fp32_out), providers=["CPUExecutionProvider"])
        input_name = sess_fp32.get_inputs()[0].name
        del sess_fp32

        int8_out = quantize_static(fp32_out, int8_out, val_records,
                                   args.calibration_n, input_name)

    # Validate all models 
    print("\n=== Validation report ===")
    results = []

    # Always validate the original spike model as baseline
    if ORIGINAL_ONNX.exists() and ORIGINAL_ONNX != fp32_out:
        results.append(validate_onnx(ORIGINAL_ONNX, val_records, args.validate_n))

    results.append(validate_onnx(fp32_out, val_records, args.validate_n))

    if int8_out.exists() and int8_out != fp32_out:
        results.append(validate_onnx(int8_out, val_records, args.validate_n))

    report_path = EXPORT_DIR / "benchmark_report.json"
    report_path.write_text(json.dumps({"models": results}, indent=2))
    print(f"\n  Report written -> {report_path}")

    # Copy best model to scripts/ml-spike for immediate use 
    best = int8_out if (int8_out.exists() and not args.no_static_quant) else fp32_out
    dest = REPO_ROOT / "scripts" / "ml-spike" / "model" / "doccornernet_finetuned.onnx"
    import shutil
    shutil.copy2(best, dest)
    print(f"\n  Best model copied -> {dest}")
    print(f"  Size: {dest.stat().st_size / 1024:.0f} KB")
    print("\nok Export complete.")
    print("  Test with:  node scripts/ml-spike/run-spike.mjs scripts/ml-spike/model/doccornernet_finetuned.onnx")


if __name__ == "__main__":
    main()
