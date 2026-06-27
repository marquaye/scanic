# Classical vs ML (no-finetune) — evaluation & reproduction

This note documents the **baseline comparison** we ran *before* any QAT
fine-tuning: Scanic's **classical** corner detector vs the **off-the-shelf**
DocCornerNet V2 model (original pretrained weights, **no fine-tuning, no INT8**).
It exists so another machine/agent can reproduce the exact same numbers and use
them as the yardstick the fine-tuned model must beat.

> TL;DR of what we found (17 test images, desktop CPU):
> - **ML latency** ≈ 35 ms median, single-thread WASM+SIMD (browser-class CPU).
> - **ML vs classical agreement**: median IoU ≈ 0.87 (most 0.77–0.99).
> - The low-IoU images (`0123`, `1023-receipt`, `25_2`) are exactly where the
>   **classical detector degenerates** (collapsed/sliver quads) — the robustness
>   gap ML is meant to close.

---

## The two approaches

| | Classical | ML (no finetune) |
|---|---|---|
| **What** | Scanic's `scanDocument()` — Canny edges → contours → corner detection (Rust/WASM in prod, JS path for tests) | DocCornerNet V2 (MobileNetV2 + SimCC coord head), 600,963 params, ~2.4 MB float32 ONNX |
| **Runtime evaluated** | `canvas` + `src/index.js` under Node | `onnxruntime-web` **WASM** backend (same kernels the browser ships) |
| **Output** | 4 corners (TL/TR/BR/BL) + per-phase timings | `coords[8]` normalized 0–1 + `score_logit` (P(document present)) |
| **Strength** | Fast, no model, exact on clean high-contrast docs | Robust on perspective / low-contrast / cluttered backgrounds where classical collapses |
| **Weakness** | Degenerates on hard images (sliver/collapsed quads) | Heavier per-frame cost; needs the model file |

There is **no ground-truth box** for the 17 `testImages/` — so on that set we
measure ML↔classical **agreement (IoU)**, not correctness. For *correctness*
against real ground truth we use the normalized dataset (`training/`, Part A
below), where every image has GT corners.

---

## Three evaluation harnesses

### 1. Classical baseline — `scripts/baseline.js`

Runs `scanDocument()` over `testImages/` and writes
`testImages/baseline-results.json` (corners + per-phase timings + success flags).

```bash
npm install
npm run baseline:update     # regenerate baseline-results.json
npm run baseline:check      # re-run and assert no corner/timing regression
```

- `scannerOptions.maxProcessingDimension = 800`, corner tolerance 3 px.
- `baseline:check` fails if a phase is >4× slower than stored, or corners drift
  beyond tolerance. This file is the **classical reference** the other harnesses
  read.

### 2. ML in the browser runtime — `scripts/ml-spike/run-spike.mjs`

Runs the ONNX model via **onnxruntime-web (WASM)** over the same 17 images,
compares each ML quad to the classical quad from `baseline-results.json`, prints
latency + IoU, and writes side-by-side overlays (**green = classical, red = ML**)
to `scripts/ml-spike/overlays/` (gitignored).

```bash
node scripts/ml-spike/run-spike.mjs scripts/ml-spike/model/doccornernet.onnx
# thread count: THREADS=1 forces worst-case single-thread; default min(cpus,4)
THREADS=1 node scripts/ml-spike/run-spike.mjs scripts/ml-spike/model/doccornernet.onnx
```

Preprocessing contract (must match training/export):
`[1,224,224,3]` float32, NHWC, RGB, `x/255` then ImageNet mean/std normalize.
Outputs identified by shape: length-8 = coords, length-1 = score logit.

### 3. Python benchmark — `training/03_benchmark.py`

ORT (Python, CPU) benchmark with **two parts**:

- **Part B** — the 17 `testImages/`: ML latency (median/p95) + **IoU vs the stored
  classical corners**. Same agreement metric as the spike, cross-checks it.
- **Part A** — the normalized dataset (`training/data/normalized/*.json`): ML
  **corner error in px** and **IoU vs ground truth**, with a **per-source
  breakdown** (midv500 / fairscan / smartdoc / uvdoc / roboflow). This is the
  *correctness* number, not just agreement.

```bash
cd training
# needs: pip install -r requirements.txt ; python 01_download.py ; python 02_normalize.py
python 03_benchmark.py                         # val split, default model
python 03_benchmark.py --dataset all --n 0     # full train+val, every image
python 03_benchmark.py --threads 1             # single-thread latency
python 03_benchmark.py --onnx PATH/to/model_int8.onnx   # benchmark a NEW model
```

Default model is `scripts/ml-spike/model/doccornernet.onnx` (the no-finetune
baseline). After fine-tuning, point `--onnx` at the exported model to compare.

### (optional) WebGPU latency — `scripts/ml-spike/webgpu/`

`bench.html` / `run-webgpu.mjs` measure the same model on the WebGPU backend
(needs a real browser / `playwright`). Only relevant for latency, not accuracy.

---

## How to read the numbers

- **`corner_err_px`** (Part A) — mean Euclidean distance between predicted and GT
  corners, in original-image pixels. **Lower is better.** This is the headline
  correctness metric.
- **`iou_vs_gt`** (Part A) — rasterized quad IoU vs ground truth. **Higher is
  better** (1.0 = perfect overlap).
- **`iou_vs_classic`** (Part B / spike) — agreement with the classical detector.
  High = they concur; **low can mean ML is *better*** (classical degenerated),
  so always eyeball the overlay before trusting it.
- **`lat_med_ms` / `lat_p95_ms`** — per-frame inference latency. Report the
  thread count; single-thread WASM is the worst-case browser baseline.
- **`score`** — sigmoid(score_logit) = P(document present). The no-finetune model
  emits this; our fine-tune currently leaves it unsupervised.

---

## Using this as the fine-tune yardstick

The fine-tuned/INT8 model must **match or beat** the no-finetune baseline on
`corner_err_px` / `iou_vs_gt` while being smaller + faster. To compare apples to
apples after training (`training/05_export.py` produces `model_int8.onnx`):

```bash
cd training
# correctness + latency vs the SAME harness, new model:
python 03_benchmark.py --onnx models/exported/model_int8.onnx --dataset all --n 0
# browser-runtime latency + overlays for the new model:
node ../scripts/ml-spike/run-spike.mjs models/exported/model_int8.onnx
```

Then diff the two reports:
- `corner_err_px` should be **≤** the no-finetune baseline (ideally lower —
  that's the domain-adaptation win).
- `iou_vs_gt` should be **≥** baseline.
- INT8 model size ≈ ¼ of the 2.4 MB float32; single-thread latency ≈ ½.

---

## Caveats / gotchas

- **Agreement ≠ correctness.** On `testImages/` there's no GT; IoU-vs-classical
  only tells you where the two methods *disagree*. Trust Part A (GT) for quality.
- **Reproducing latency** depends on CPU + thread count + WASM SIMD. Always pin
  `THREADS` / `--threads` and note the machine. The ~35 ms figure is single-thread
  desktop CPU; a 4090 box's CPU will differ, and the browser/mobile will differ
  again — latency parity is about *relative* improvement, not the absolute ms.
- **The model is unchanged here.** This whole doc is the *before* picture. Nothing
  in it touches the QAT fine-tune; it only defines the target to beat.
- `overlays/` (63 MB of PNGs) is gitignored — regenerate locally with the spike.
