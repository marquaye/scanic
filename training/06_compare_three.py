"""
06_compare_three.py: Head-to-head: classical vs ML(no-finetune) vs ML(finetune).

Scores all approaches on the SAME ground-truth set (dcd_test) for:
  • Quality : mean/median per-corner error (px@224) + mean IoU vs GT + detect rate
  • Latency : ORT CPU single-thread median ms (ML); classical from /tmp/classical_pred.json
  • Size    : model file size

Classical predictions + latency come from scripts/eval_classical.js (run first):
    export PATH="$HOME/.local/node/bin:$PATH"
    node scripts/eval_classical.js          # writes /tmp/classical_pred.json
    python training/06_compare_three.py
"""
import json, time
from pathlib import Path
import cv2, numpy as np
import onnxruntime as ort
ort.set_default_logger_severity(3)  # silence initializer-cleanup spam

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], np.float32)
STD  = np.array([0.229, 0.224, 0.225], np.float32)
ORDER = ["topLeft", "topRight", "bottomRight", "bottomLeft"]
REPO = Path(__file__).resolve().parent.parent

EVAL_JSON = Path("/tmp/evalN.json")
CLASSICAL = Path("/tmp/classical_pred.json")
MODELS = {
    "SimCC baseline fp32 (V2, 600K)":   REPO / "scripts/ml-spike/model/doccornernet.onnx",
    "SimCC baseline INT8 (V2)":         REPO / "scripts/ml-spike/model/doccornernet_int8.onnx",
    "SimCC LEAN fp32 (456K, ours)":     REPO / "scripts/ml-spike/model/doccornernet_lean.onnx",
    "Regression finetune fp32 (a050)":  REPO / "training/models/export/a050/model_float32.onnx",
    "Regression finetune INT8 (a050)":  REPO / "training/models/export/a050/model_int8.onnx",
}


def preprocess(bgr, layout):
    rgb = cv2.cvtColor(cv2.resize(bgr, (SIZE, SIZE), interpolation=cv2.INTER_AREA),
                       cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    rgb = (rgb - MEAN) / STD
    return rgb.transpose(2, 0, 1)[None] if layout == "NCHW" else rgb[None]


def decode(coords, w, h):
    c = np.asarray(coords).flatten()
    return {ORDER[i]: {"x": float(c[2*i] * w), "y": float(c[2*i+1] * h)} for i in range(4)}


def corner_err_px224(pred, gt, w, h):
    return float(np.mean([np.hypot((pred[k]["x"]-gt[k]["x"])/w*SIZE,
                                    (pred[k]["y"]-gt[k]["y"])/h*SIZE) for k in ORDER]))


def quad_iou(pred, gt, w, h, R=256):
    sx, sy = R/w, R/h
    def rast(d):
        m = np.zeros((R, R), np.uint8)
        cv2.fillConvexPoly(m, np.array([[d[k]["x"]*sx, d[k]["y"]*sy] for k in ORDER], np.int32), 1)
        return m
    mp, mg = rast(pred), rast(gt)
    u = int((mp | mg).sum())
    return int((mp & mg).sum())/u if u else 0.0


def layout_of(sess):
    s = sess.get_inputs()[0].shape
    return "NCHW" if (len(s) == 4 and s[1] == 3) else "NHWC"


def eval_onnx(path, items):
    so = ort.SessionOptions(); so.intra_op_num_threads = 1; so.inter_op_num_threads = 1
    sess = ort.InferenceSession(str(path), so, providers=["CPUExecutionProvider"])
    lay = layout_of(sess); inp = sess.get_inputs()[0].name
    errs, ious, lats = [], [], []
    for it in items:
        bgr = cv2.imread(it["file"]); t = preprocess(bgr, lay)
        for _ in range(3): sess.run(None, {inp: t})            # warmup
        ts = []
        for _ in range(15):
            a = time.perf_counter(); outs = sess.run(None, {inp: t}); ts.append((time.perf_counter()-a)*1000)
        coords = next(o.flatten() for o in outs if o.size == 8)
        pred = decode(coords, it["w"], it["h"])
        errs.append(corner_err_px224(pred, it["gt"], it["w"], it["h"]))
        ious.append(quad_iou(pred, it["gt"], it["w"], it["h"]))
        lats.append(np.median(ts))
    return dict(errs=np.array(errs), ious=np.array(ious),
                lat=float(np.median(lats)), detect=1.0,
                size_mb=path.stat().st_size/1e6)


def eval_classical(items):
    preds = {p["file"]: p for p in json.loads(CLASSICAL.read_text())}
    errs, ious, lats, ndet = [], [], [], 0
    for it in items:
        p = preds.get(it["file"])
        if p: lats.append(p["detect_ms"])
        if p and p["corners"]:
            ndet += 1
            errs.append(corner_err_px224(p["corners"], it["gt"], it["w"], it["h"]))
            ious.append(quad_iou(p["corners"], it["gt"], it["w"], it["h"]))
    return dict(errs=np.array(errs), ious=np.array(ious),
                lat=float(np.median(lats)), detect=ndet/len(items), size_mb=0.0)


def main():
    items = json.loads(EVAL_JSON.read_text())
    print(f"\n=== Three-way comparison on {len(items)} dcd_test images (GT) ===\n")
    rows = []
    if CLASSICAL.exists():
        rows.append(("Classical (scanic, JS fallback)", eval_classical(items)))
    else:
        print("[warn] /tmp/classical_pred.json missing. Run scripts/eval_classical.js first\n")
    for name, path in MODELS.items():
        if path.exists():
            rows.append((name, eval_onnx(path, items)))
        else:
            print(f"[skip] {name}: {path} not found")

    h = f"{'approach':<34} {'err_med':>8} {'err_mean':>9} {'IoU':>6} {'<10px':>6} {'detect':>7} {'lat_ms':>8} {'size_MB':>8}"
    print(h); print("-"*len(h))
    for name, r in rows:
        e = r["errs"]
        med = f"{np.median(e):.1f}" if len(e) else "-"
        mean = f"{e.mean():.1f}" if len(e) else "-"
        iou = f"{r['ious'].mean():.3f}" if len(r["ious"]) else "-"
        p10 = f"{(e<10).mean()*100:.0f}%" if len(e) else "-"
        size = f"{r['size_mb']:.2f}" if r["size_mb"] else "-"
        print(f"{name:<34} {med:>8} {mean:>9} {iou:>6} {p10:>6} "
              f"{r['detect']*100:>6.0f}% {r['lat']:>7.1f} {size:>8}")
    print("\nNotes: err in px@224 (lower=better); IoU/<10px on DETECTED only for classical.")
    print("Classical latency = node JS-fallback (prod WASM+SIMD ~3-4x faster); ML latency = ORT CPU 1-thread.")

    summary = {name: {"err_median_px224": round(float(np.median(r["errs"])), 2) if len(r["errs"]) else None,
                      "err_mean_px224": round(float(r["errs"].mean()), 2) if len(r["errs"]) else None,
                      "iou_vs_gt": round(float(r["ious"].mean()), 3) if len(r["ious"]) else None,
                      "pct_under_10px": round(float((r["errs"]<10).mean()*100), 1) if len(r["errs"]) else None,
                      "detect_rate": round(r["detect"], 3),
                      "lat_ms": round(r["lat"], 2), "size_mb": round(r["size_mb"], 2) or None}
               for name, r in rows}
    Path("/tmp/three_way_results.json").write_text(json.dumps(summary, indent=2))
    print("\nsaved -> /tmp/three_way_results.json")


if __name__ == "__main__":
    main()
