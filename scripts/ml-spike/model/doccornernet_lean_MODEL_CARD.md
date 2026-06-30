# DocCornerNet LEAN — model card

**File:** `doccornernet_lean.onnx` (1.82 MB, fp32) — the current best document-corner
detector for scanic's ORT-Web / WASM target. A channel-slimmed SimCC model that
beats the original DocCornerNet V2 baseline on accuracy **and** latency **and** size.

## What it is
- Architecture: DocCornerNet (MobileNetV2 backbone + mini-FPN + SimCC marginal
  coordinate-classification head), from `github.com/mapo80/DocCornerNet-CoordClass`.
- Slimmed config vs the V2 baseline: `alpha=0.35`, `fpn_ch=24` (was 32),
  `simcc_ch=64` (was 96), `img_size=224`, `num_bins=224`. **456,153 params.**
- I/O: input `image` `[1,224,224,3]` float32 **NHWC**, RGB, `x/255` then ImageNet
  mean/std. Outputs `coords` `[1,8]` normalized 0–1 (x0,y0,x1,y1,x2,y2,x3,y3,
  order TL,TR,BR,BL) + `score_logit` `[1,1]` (sigmoid → P(document)).

## Results (vs baseline)
On `dcd_test` (200 GT images, `training/06_compare_three.py`) and ORT-Web WASM:

| model | median err (px@224) | IoU vs GT | WASM 1-thr | WASM 4-thr | size | params |
|---|---|---|---|---|---|---|
| baseline V2 fp32 | 2.9 | 0.854 | 32.4 ms | 10.7 ms | 2.46 MB | 600K |
| **LEAN fp32 (this)** | **2.3** | **0.892** | **10.6 ms** | **3.8 ms** | **1.82 MB** | **456K** |

Trained val split (8,645 imgs): mean corner err **0.86 px**, mean IoU **0.986**,
recall@IoU-0.95 = 98.5%.

**Do NOT INT8/fp16 quantize this** — PTQ slowed it ~2× in WASM (QDQ overhead on the
SimCC head) for only a size drop; fp32 is the right deployment format here.

## Reproduce
```bash
cd training/simcc_train
# dataset (once): python train_ultra.py --hf_dataset mapo80/DocCornerDataset --download_hf hf_dataset
python train_ultra.py --hf_dataset hf_dataset --output_dir ../models/simcc_lean \
  --backbone mobilenetv2 --alpha 0.35 --fpn_ch 24 --simcc_ch 64 \
  --img_size 224 --num_bins 224 --batch_size 256 --epochs 80 --augment
# re-export from the checkpoint (or from doccornernet_lean.weights.h5 + config):
python export_onnx.py --checkpoint ../models/simcc_lean/<run_dir> \
  --output ../../scripts/ml-spike/model/doccornernet_lean.onnx
```
Provenance kept here: `doccornernet_lean.weights.h5`, `doccornernet_lean_config.json`,
`doccornernet_lean_history.json`. (The training checkpoint under `training/models/`
is gitignored, hence these copies.)

## Notes / next ideas
- `num_bins` must equal `img_size` in their loss pipeline.
- For more latency on low-end mobile: retrain at `img_size=192 num_bins=192`.
- Accuracy gain vs baseline partly reflects training on the full current
  DocCornerDataset; the latency/size gains are the slim architecture.
