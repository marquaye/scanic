# Scanic ML Training

Fine-tunes DocCornerNet V2 on a combined document-corner dataset and exports
an optimized ONNX INT8 model for ORT-Web deployment.

## Setup

```bash
cd training
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

### GPU training (Linux + NVIDIA, e.g. RTX 4090)

The pinned `tensorflow==2.13.1` is CPU-only on Windows but GPU-capable on Linux.
TF 2.13 targets **CUDA 11.8 / cuDNN 8.6**, which fully supports Ada (sm_89) cards
like the 4090. The cleanest setup is conda for the CUDA runtime + pip for the
rest:

```bash
conda create -n scanic-train python=3.10 -y
conda activate scanic-train
conda install -c conda-forge cudatoolkit=11.8 cudnn=8.6 -y
pip install -r requirements.txt

# verify the GPU is visible to TF
python -c "import tensorflow as tf; print(tf.config.list_physical_devices('GPU'))"
```

> The TF 2.13 + tfmot 0.7.5 pin is required for `quantize_model` to work (see the
> note in `requirements.txt`); it holds on Linux too, so QAT runs the same on the
> 4090, just far faster.

## Pipeline: run in order

### Step 1: Download datasets + model weights

```bash
python 01_download.py
```

Downloads into `data/raw/` (gitignored):

| Dataset | Images | Format | License |
|---------|--------|--------|---------|
| MIDV-500 | ~15K | JSON quad corners | Public domain |
| SmartDoc 2015 | ~1K | XML quad corners | CC-BY-4.0 |
| UVDoc | ~1K | grid2d coords | MIT |
| WarpDoc | 1,020 | masks / JSON | CVPR 2022 |
| Roboflow DS | varies | YOLO pose (4 kpts) | MIT |

Options:
```bash
python 01_download.py --datasets midv500,smartdoc   # selective
python 01_download.py --midv-clips 200              # more MIDV clips (default 50)
python 01_download.py --smartdoc-full               # full 1.5 GB test set
python 01_download.py --no-model                    # skip model download
```

> **WarpDoc note**: downloads from Google Drive via `gdown`. If it fails, see
> the printed manual-download instructions.

### Step 2: Normalize annotations

```bash
python 02_normalize.py
```

Reads all raw datasets → writes `data/normalized/train.json` + `val.json`.
Each entry: `{file, width, height, source, corners: {topLeft, topRight, bottomRight, bottomLeft}}`.

Options:
```bash
python 02_normalize.py --val-split 0.20   # use 20% for validation (default 15%)
python 02_normalize.py --min-area 0.05    # stricter area filter
```

### Step 3: Baseline benchmark

```bash
python 03_benchmark.py
```

Reports for the original DocCornerNet V2 ONNX:
- Scanic test images: ML latency + IoU vs stored classical corners  
- Normalized val split: corner error (px) vs ground truth, per-source breakdown

Options:
```bash
python 03_benchmark.py --threads 4         # multi-threaded ORT
python 03_benchmark.py --n 0               # benchmark all val images
python 03_benchmark.py --onnx path/to/model.onnx
```

> **Classical vs ML (no-finetune) baseline**: for the full methodology,
> reproduction commands, and findings comparing Scanic's classical detector
> against the off-the-shelf model, see
> [`../scripts/ml-spike/EVALUATION.md`](../scripts/ml-spike/EVALUATION.md).
> That is the yardstick the fine-tuned/INT8 model must beat.

### Step 4: Two-stage fine-tuning

```bash
python 04_finetune_qat.py          # full pipeline: Stage A (float) -> Stage B (QAT)
```

Runs in two stages (recipe from NVIDIA's integer-quant guidance + the TF Model
Optimization QAT docs):

- **Stage A: float32 domain adaptation.** Fine-tunes the original float model
  on our combined corner dataset with geometric + photometric augmentation and
  a cosine-with-warmup LR (default 1e-4). Moves weights onto our distribution
  *before* any quantization noise. Saved to `models/float_checkpoint/final_model`.
- **Stage B: QAT.** Loads the Stage-A weights, applies
  `tfmot.quantization.keras.quantize_model` (fake-quant nodes for INT8), and
  fine-tunes at a much lower LR (default 2e-5, ~1 order below the float LR).
  BatchNorm running stats are frozen in the last ~30% of epochs so the simulated
  INT8 activation ranges settle. Saved to `models/qat_checkpoint/final_model`.

**Loss:** Wing Loss (Feng et al. 2018) computed in **pixel units** (coords ×224)
so the `w=10px` / `eps=2px` knobs are meaningful. On normalized [0,1] coords the
loss degenerates to pure log.

**Validation (dual, reported separately):**
- `val.json`: group-aware held-out split, used for checkpointing / early stop.
- `roboflow_test.json`: real-world phone photos, logged each epoch as a
  deployment-representative sanity metric (`roboflow_test_err_px224`).

**Why QAT and not dynamic quantization?**  
Dynamic INT8 (weight-only) destroyed accuracy on this model: mean IoU dropped
from 0.865 to 0.009. MobileNetV2's depthwise convolutions accumulate large
errors when only weights are quantized post-hoc. QAT simulates both weight and
activation quantization during training, so the model learns to compensate.
Accuracy is preserved at INT8.

Options:
```bash
python 04_finetune_qat.py --stage float          # Stage A only (baseline)
python 04_finetune_qat.py --stage qat            # Stage B only (needs Stage A ckpt)
python 04_finetune_qat.py --float-epochs 30 --qat-epochs 15
python 04_finetune_qat.py --float-lr 1e-4 --qat-lr 2e-5 --batch 16
python 04_finetune_qat.py --no-geom-aug          # photometric-only ablation
python 04_finetune_qat.py --freeze-backbone      # only train the head
```

Saves to `models/qat_checkpoint/final_model` (SavedModel format).

### Step 5: Export to ONNX INT8

```bash
python 05_export.py
```

**Stage 1**: SavedModel → ONNX float32 via `tf2onnx`. If the model contains
QAT fake-quant nodes, tf2onnx converts them to ONNX `QuantizeLinear` /
`DequantizeLinear` ops automatically.

**Stage 2**: ONNX float32 → ONNX INT8 via ORT static quantization with
calibration data from `val.json`. Uses `QDQ` format (QLinearConv), which is
the standard ONNX INT8 path. ORT-Web's WASM SIMD backend has optimized
kernels for this format.

Outputs:
```
models/exported/model_float32.onnx   (reference)
models/exported/model_int8.onnx      (deploy this)
models/exported/benchmark_report.json
scripts/ml-spike/model/doccornernet_finetuned.onnx  ← copied here for spike
```

Options:
```bash
python 05_export.py --no-static-quant        # float32 only, skip INT8 stage
python 05_export.py --onnx-only path/f32.onnx  # skip Stage 1
python 05_export.py --calibration-n 500      # more calibration images
```

## Expected outcomes

| Model | Size | Latency (1-thread) | Corner err (px@224) |
|-------|------|--------------------|----------------------|
| Original V2 float32 | 2.4 MB | ~32 ms | ~8 px |
| Fine-tuned float32 | 2.4 MB | ~32 ms | lower (domain-adapted) |
| Fine-tuned INT8 (QAT) | ~0.6 MB | ~12–18 ms | ≈ float32 |

The INT8 model is ~4× smaller (better CDN load time) and ~2× faster on
single-thread WASM SIMD. With 4 threads (`--threads 4`) expect ~8–12 ms.

## File structure

```
training/
  01_download.py       # fetch datasets + HuggingFace model
  02_normalize.py      # unify annotations → train.json / val.json
  03_benchmark.py      # report ML vs classical accuracy + latency
  04_finetune_qat.py   # QAT fine-tuning
  05_export.py         # ONNX INT8 export + validation
  requirements.txt
  README.md
  data/                # gitignored, created at runtime
    raw/               # downloaded datasets
    normalized/        # train.json, val.json
  models/              # gitignored
    base/              # HuggingFace SavedModel
    qat_checkpoint/    # training output
    exported/          # final ONNX files
```
