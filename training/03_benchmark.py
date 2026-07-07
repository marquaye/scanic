"""
Step 3 -- Baseline benchmark.

Reports two sets of numbers side by side:

  A. ML model (DocCornerNet V2 ONNX, ORT Python)
       • Per-image: median inference latency, corner error vs ground truth
       • Aggregate: mean/median/p95 corner error, mean IoU vs ground truth

  B. Classical detector (Scanic baseline-results.json for our 17 test images)
       • Corner error vs ground truth (using testImages/baseline-results.json)

Why two separate sets? The classical Scanic pipeline runs in Rust/WASM which
we can't easily invoke from Python. So for our own 17 test images we use the
pre-computed baseline-results.json. For the large normalized dataset we only
have ML numbers (no pre-computed classical results).

Usage:
    python 03_benchmark.py [--onnx PATH] [--dataset val|train|all] [--n 200]
                           [--threads N]

    --onnx    path to ONNX model (default: ../scripts/ml-spike/model/doccornernet.onnx)
    --dataset which split to benchmark (default: val)
    --n       max images to benchmark (default: 200, use 0 for all)
    --threads ORT intra-op thread count (default: 1)
"""

import argparse
import json
import os
import time
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort
from tabulate import tabulate

SCRIPT_DIR   = Path(__file__).parent
REPO_ROOT    = SCRIPT_DIR.parent
NORM_DIR     = SCRIPT_DIR / "data" / "normalized"
DEFAULT_ONNX = REPO_ROOT / "scripts" / "ml-spike" / "model" / "doccornernet.onnx"
BASELINE_JSON = REPO_ROOT / "testImages" / "baseline-results.json"
TEST_IMAGES   = REPO_ROOT / "testImages"

SIZE = 224
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
WARMUP = 5
TIMED  = 30


# preprocessing 

def preprocess(bgr: np.ndarray) -> np.ndarray:
    """Resize to 224×224, ImageNet-normalize, return NHWC float32."""
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgb = cv2.resize(rgb, (SIZE, SIZE), interpolation=cv2.INTER_AREA).astype(np.float32)
    rgb = rgb / 255.0
    rgb = (rgb - MEAN) / STD
    return rgb[np.newaxis]  # [1, 224, 224, 3]


# decoding + metrics 

def decode_corners(coords: np.ndarray, w: int, h: int) -> dict:
    c = coords.flatten()
    return {
        "topLeft":     {"x": float(c[0] * w), "y": float(c[1] * h)},
        "topRight":    {"x": float(c[2] * w), "y": float(c[3] * h)},
        "bottomRight": {"x": float(c[4] * w), "y": float(c[5] * h)},
        "bottomLeft":  {"x": float(c[6] * w), "y": float(c[7] * h)},
    }


def corner_error_px(pred: dict, gt: dict) -> float:
    """Mean Euclidean distance between corresponding corners (in pixels)."""
    keys = ["topLeft", "topRight", "bottomRight", "bottomLeft"]
    errs = []
    for k in keys:
        dx = pred[k]["x"] - gt[k]["x"]
        dy = pred[k]["y"] - gt[k]["y"]
        errs.append((dx*dx + dy*dy) ** 0.5)
    return float(np.mean(errs))


def rasterize(poly_pts: list, R: int = 256) -> np.ndarray:
    mask = np.zeros((R, R), dtype=np.uint8)
    pts_arr = np.array([[p["x"], p["y"]] for p in poly_pts], dtype=np.float32)
    cv2.fillConvexPoly(mask, pts_arr.astype(np.int32), 1)
    return mask


def quad_iou(pred: dict, gt: dict, w: int, h: int, R: int = 256) -> float:
    sx, sy = R / w, R / h
    pred_pts = [{k: v["x"]*sx, "y": v["y"]*sy}
                if False else {"x": v["x"]*sx, "y": v["y"]*sy}
                for k, v in pred.items()]
    gt_pts   = [{"x": v["x"]*sx, "y": v["y"]*sy} for v in gt.values()]
    mp = rasterize(pred_pts, R)
    mg = rasterize(gt_pts,   R)
    inter = int((mp & mg).sum())
    union = int((mp | mg).sum())
    return inter / union if union else 0.0


# ORT session 

def make_session(onnx_path: Path, threads: int) -> ort.InferenceSession:
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = threads
    opts.inter_op_num_threads = 1
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    sess = ort.InferenceSession(str(onnx_path), opts, providers=["CPUExecutionProvider"])
    return sess


def run_inference(sess: ort.InferenceSession, tensor: np.ndarray) -> tuple[np.ndarray, float | None]:
    input_name = sess.get_inputs()[0].name
    outputs = sess.run(None, {input_name: tensor})
    coords = score = None
    for out in outputs:
        d = out.flatten()
        if d.size == 8:
            coords = d
        elif d.size == 1:
            score = float(1 / (1 + np.exp(-d[0])))
    return coords, score


def benchmark_image(sess, bgr: np.ndarray, warmup: int, timed: int):
    tensor = preprocess(bgr)
    for _ in range(warmup):
        run_inference(sess, tensor)
    times = []
    coords = score = None
    for _ in range(timed):
        t0 = time.perf_counter()
        coords, score = run_inference(sess, tensor)
        times.append((time.perf_counter() - t0) * 1000)
    return np.array(times), coords, score


# Part A: normalized dataset benchmark 

def bench_dataset(sess: ort.InferenceSession, split_json: Path, max_n: int) -> list[dict]:
    data = json.loads(split_json.read_text())["images"]
    if max_n:
        data = data[:max_n]

    rows = []
    for rec in data:
        bgr = cv2.imread(rec["file"])
        if bgr is None:
            continue
        h, w = bgr.shape[:2]
        gt = rec["corners"]

        times, coords, score = benchmark_image(sess, bgr, WARMUP, TIMED)
        pred = decode_corners(coords, w, h)
        err  = corner_error_px(pred, gt)
        iou  = quad_iou(pred, gt, w, h)

        rows.append({
            "source":       rec["source"],
            "file":         Path(rec["file"]).name[:30],
            "lat_med_ms":   round(float(np.median(times)), 1),
            "corner_err_px": round(err, 1),
            "iou_vs_gt":    round(iou, 3),
            "score":        round(score, 3) if score is not None else None,
        })

    return rows


# Part B: Scanic test-image benchmark 

def bench_scanic_testset(sess: ort.InferenceSession) -> list[dict]:
    """Benchmark our 17 test images, comparing ML vs stored classical corners."""
    if not BASELINE_JSON.exists():
        print("[skip] baseline-results.json not found")
        return []

    baseline = json.loads(BASELINE_JSON.read_text())
    rows = []

    for case in baseline["cases"]:
        img_path = TEST_IMAGES / case["image"]
        if not img_path.exists():
            continue

        bgr = cv2.imread(str(img_path))
        if bgr is None:
            continue
        h, w = bgr.shape[:2]

        times, coords, score = benchmark_image(sess, bgr, WARMUP, TIMED)
        pred = decode_corners(coords, w, h)

        classic = case.get("detect", {}).get("corners")
        iou_vs_classic = None
        if classic:
            iou_vs_classic = quad_iou(pred, classic, w, h)

        rows.append({
            "image":          case["image"],
            "lat_med_ms":     round(float(np.median(times)), 1),
            "lat_p95_ms":     round(float(np.percentile(times, 95)), 1),
            "score":          round(score, 3) if score is not None else None,
            "iou_vs_classic": round(iou_vs_classic, 3) if iou_vs_classic is not None else "no-classic",
        })

    return rows


# aggregate stats 

def print_stats(rows: list[dict], value_key: str, label: str):
    vals = [r[value_key] for r in rows if r.get(value_key) not in (None, "no-classic")]
    if not vals:
        return
    vals = np.array(vals, dtype=float)
    print(f"\n  {label}:")
    print(f"    mean   {vals.mean():.3f}")
    print(f"    median {np.median(vals):.3f}")
    print(f"    p95    {np.percentile(vals, 95):.3f}")
    print(f"    min    {vals.min():.3f}   max {vals.max():.3f}")


# main 

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--onnx",    type=Path, default=DEFAULT_ONNX)
    parser.add_argument("--dataset", choices=["val", "train", "all"], default="val")
    parser.add_argument("--n",       type=int, default=200,
                        help="Max images to benchmark (0 = all)")
    parser.add_argument("--threads", type=int,
                        default=min(max(os.cpu_count() or 2, 2), 4),
                        help="ORT intra-op threads (default: min(cpu_count, 4), at least 2)")
    parser.add_argument("--warmup",  type=int, default=WARMUP)
    parser.add_argument("--timed",   type=int, default=TIMED)
    args = parser.parse_args()

    if not args.onnx.exists():
        print(f"[error] ONNX model not found: {args.onnx}")
        print("  Run  python 01_download.py --model  first.")
        return

    print(f"\n=== Benchmark ===")
    print(f"  Model:   {args.onnx}")
    print(f"  Threads: {args.threads}")

    sess = make_session(args.onnx, args.threads)
    print(f"  Inputs:  {[i.name for i in sess.get_inputs()]}")
    print(f"  Outputs: {[o.name for o in sess.get_outputs()]}")

    # Part B: Scanic test images 
    print("\n Part B: Scanic test images (ML vs stored classical) ")
    scanic_rows = bench_scanic_testset(sess)
    if scanic_rows:
        print(tabulate(scanic_rows, headers="keys", tablefmt="rounded_outline"))
        lats = [r["lat_med_ms"] for r in scanic_rows]
        print(f"\n  Latency (median of medians): {np.median(lats):.1f} ms  "
              f"({args.threads} thread(s))")
        print_stats(scanic_rows, "iou_vs_classic", "IoU vs classical")

    # Part A: normalized dataset 
    splits = ["train", "val"] if args.dataset == "all" else [args.dataset]
    for split in splits:
        split_json = NORM_DIR / f"{split}.json"
        if not split_json.exists():
            print(f"\n[skip] {split_json} not found -- run 02_normalize.py first")
            continue

        print(f"\n Part A: {split} split (ML vs ground-truth corners) ")
        ds_rows = bench_dataset(sess, split_json, args.n)
        if not ds_rows:
            print("  No images benchmarked.")
            continue

        # Show a sample (first 25)
        print(tabulate(ds_rows[:25], headers="keys", tablefmt="rounded_outline"))
        if len(ds_rows) > 25:
            print(f"  ... {len(ds_rows) - 25} more rows not shown")

        print_stats(ds_rows, "corner_err_px", "Corner error (px)")
        print_stats(ds_rows, "iou_vs_gt",     "IoU vs ground truth")

        lats = [r["lat_med_ms"] for r in ds_rows]
        print(f"\n  Latency: median {np.median(lats):.1f} ms  "
              f"p95 {np.percentile(lats, 95):.1f} ms  ({args.threads} thread(s))")

        # Per-source breakdown
        from collections import defaultdict
        by_src: dict[str, list] = defaultdict(list)
        for r in ds_rows:
            by_src[r["source"]].append(r)
        print("\n  Per-source summary:")
        src_summary = []
        for src, recs in sorted(by_src.items()):
            errs = [r["corner_err_px"] for r in recs]
            ious = [r["iou_vs_gt"] for r in recs]
            src_summary.append({
                "source": src,
                "n": len(recs),
                "err_mean": round(np.mean(errs), 1),
                "err_p95":  round(np.percentile(errs, 95), 1),
                "iou_mean": round(np.mean(ious), 3),
            })
        print(tabulate(src_summary, headers="keys", tablefmt="simple"))

    print("\nok Benchmark done. Run  python 04_finetune_qat.py  next.")


if __name__ == "__main__":
    main()
