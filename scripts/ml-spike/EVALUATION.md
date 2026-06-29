# Three-way comparison — classical vs ML(no-finetune) vs ML(finetune)

> **Update (finetune added).** The original baseline below compared classical vs
> the off-the-shelf DocCornerNet V2. We've now added our **fine-tuned** model and
> scored all approaches on the **same GT set** (`dcd_test`, 200 images) for
> quality + latency + size. Reproduce with:
> ```bash
> export PATH="$HOME/.local/node/bin:$PATH"
> node scripts/eval_classical.js          # classical preds + latency -> /tmp/classical_pred.json
> python training/06_compare_three.py     # scores all three, writes /tmp/three_way_results.json
> ```
>
> | approach | err_median (px@224) | err_mean | IoU vs GT | <10px | detect | latency | size |
> |---|---|---|---|---|---|---|---|
> | Classical (scanic) | 78.7 | 113.3 | 0.393 | 20% | 100% | 135 ms¹ | — |
> | **ML no-finetune (DocCornerNet V2, SimCC)** | **2.9** | **9.0** | **0.854** | **72%** | 100% | 8.4 ms² | 2.46 MB |
> | ML finetune fp32 (a050, regression) | 25.0 | 37.5 | 0.536 | 23% | 100% | 1.9 ms² | 4.08 MB |
> | ML finetune INT8 (a050, regression) | 25.4 | 37.4 | 0.535 | 26% | 100% | 1.9 ms² | 1.30 MB |
>
> ¹ node JS-fallback (no Rust/WASM build here); production WASM+SIMD ≈ 3–4× faster.
> ² ORT CPU **single-thread**.
>
> ## WINNER: lean SimCC retrain (smaller + faster + more accurate)
>
> Retraining a **channel-slimmed SimCC** (MobileNetV2 α=0.35, `fpn_ch` 24,
> `simcc_ch` 64, 224px, 80 epochs on DocCornerDataset via `training/simcc_train/`)
> beats the baseline on **every axis** — and without any quantization:
>
> | model | dcd_test median err | IoU vs GT | WASM 1-thr | WASM 4-thr | size | params |
> |---|---|---|---|---|---|---|
> | SimCC baseline fp32 (V2) | 2.9 px | 0.854 | 32.4 ms | 10.7 ms | 2.46 MB | 600K |
> | SimCC baseline INT8 | 3.3 px | 0.831 | 49.2 ms | 22.2 ms | 1.30 MB | 600K |
> | **SimCC LEAN fp32 (ours)** | **2.3 px** | **0.892** | **10.6 ms** | **3.8 ms** | **1.82 MB** | **456K** |
>
> ~3× faster in WASM, 26% smaller, and *more* accurate. This is the key lesson:
> **architecture slimming (a lighter SimCC head) is the lever — not post-training
> quantization**, which only added size at the cost of latency. Export with
> `training/simcc_train/export_onnx.py`; model at
> `scripts/ml-spike/model/doccornernet_lean.onnx`. (Accuracy gain partly reflects
> training on the full current DocCornerDataset; latency/size gains are the slim
> architecture.)
>
> ---
>
> **Verdict (earlier baseline).** The **no-finetune SimCC model is the clear quality winner** (2.9 px
> median, IoU 0.85). Our fine-tuned **regression** model is ~8× worse on median
> error despite being smaller/faster — size & speed don't matter when accuracy
> regresses this hard. Classical collapses to the image frame on ~half of these
> cluttered phone photos (IoU 0.39). INT8 quantisation of the finetune is
> **lossless** (25.0 → 25.4 px). **Conclusion: the architecture, not the training,
> is the lever — adopt SimCC and compress *that*, rather than regressing 8 coords.**
> See `training/04_train_pytorch.py` (regression A/B) and `06_compare_three.py`.

---

# Classical vs ML (no-finetune) — original baseline

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
