# Model card: DocCornerNet LEAN (scanic ML detector)

A channel-slimmed **SimCC** document-corner detector (MobileNetV2 backbone +
mini-FPN + 1D coordinate-classification head), deployed for scanic on a custom
minimal ONNX Runtime Web build.

Source model + training provenance:
[`scripts/ml-spike/model/`](../scripts/ml-spike/model/) in the scanic repo
(architecture from [DocCornerNet-CoordClass](https://github.com/mapo80/DocCornerNet-CoordClass)).

## I/O contract

| | |
|---|---|
| **input** `image` | `[1, 224, 224, 3]` float32, **NHWC**, RGB, `x/255` then ImageNet mean/std (`mean=[0.485,0.456,0.406]`, `std=[0.229,0.224,0.225]`) |
| **output** `coords` | `[1, 8]` normalized `0–1`, order **TL, TR, BR, BL** (`x0,y0,x1,y1,x2,y2,x3,y3`) |
| **output** `score_logit` | `[1, 1]` → `sigmoid` = P(document present) |

scanic's `mlDetector` scales `coords` back into the original image dimensions and
exposes `sigmoid(score_logit)` as `result.score`.

## Accuracy & cost

Measured on 200 ground-truth `dcd_test` images (err in px @224):

| model | median err | IoU vs GT | size | params |
|---|---|---|---|---|
| DocCornerNet V2 baseline | 2.9 px | 0.854 | 2.46 MB | 600K |
| **LEAN (this)** | **2.3 px** | **0.892** | 1.82 MB onnx / 1.9 MB ort | 456K |

Runtime (custom minimal ORT-Web build, measured in Node, single image repeated):

| backend | wasm size | latency |
|---|---|---|
| stock onnxruntime-web | 13 MB | ~10.6 ms (1 thread) |
| **minimal build (shipped)** | **1.5 MB** (527 KB gzip) | **~10.9 ms (1 thread)** |
| minimal build, 4 threads* | 1.5 MB | ~4.0 ms |

\* Threads need a 4-thread build **and** cross-origin isolation (COOP/COEP) on the
host page. The shipped artifact is single-thread for universal, header-free use.

**Do not INT8/fp16-quantize this model.** Post-training quantization *slowed* it
~2× in WASM (QDQ overhead on the SimCC head) for only a size drop. fp32 is the
right deployment format here. The size/latency wins came from architecture
slimming, not quantization.

## Why a custom ONNX Runtime build

Stock `onnxruntime-web` is ~13 MB of wasm, at odds with scanic's small-library
goal. Alternatives were measured and rejected:

- **tract** (pure-Rust ONNX): 4.1 MB wasm but **~10× slower** (104 ms), no
  XNNPACK/MLAS-class kernels.
- **Hand-written WASM kernels**: smallest, but the tract result shows the realistic
  floor is ~100 ms without reimplementing XNNPACK-grade SIMD, weeks of work for
  worse latency.
- **WebGPU**: ~35× slower than WASM for this small op-heavy graph.

The winner: compile ORT-Web with only the operators this model needs
(`build/required_operators.config`), SIMD on, RTTI/exceptions/ML-ops stripped.
Same MLAS kernels → **same speed and bit-identical output**, ~88% smaller.
