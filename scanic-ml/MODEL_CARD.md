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

Runtime: a single custom minimal ORT-Web build (~1.5 MB, 527 KB gzip),
compiled with pthread support. It works on any page and runs on 1 thread by
default; a cross-origin isolated host page (COOP and COEP) can request more
with `ml: { threaded: true }`, without that it falls back to 1 thread
automatically, no separate build needed either way.

Two numbers matter: the ML Inference step, which is the only part thread count
touches, and the end-to-end `detectDocumentMl` call, which also includes
single-threaded canvas preprocessing. Measured via `npm run bench:detectors`
(Node) and a cross-origin-isolated Chromium page, averaged after a warm-up
call:

| ML Inference step | Node | Browser (Chromium, COI) |
|---|---|---|
| 1 thread (default) | ~13.4 ms | ~13.3 ms |
| 2 threads | ~10.3 ms | ~10.8 ms |
| 4 threads (`threaded: true`) | ~7.5 ms | ~6.4 ms |
| speedup at 4 threads | 1.8x | 2.1x |

Requesting more threads roughly halves inference time: about 1.8x in Node and
2.1x in a cross-origin-isolated browser at 4 threads. A `cpu/wall` ratio near
3.5x confirms the work really is running in parallel. The end-to-end
`detectDocumentMl` gain is smaller, about 1.1x in Node, because canvas
preprocessing runs single-threaded and, for a model this fast, is a large share
of the full call. So more threads is a clear win when inference dominates
(repeated scans, larger inputs, worker offload) and a modest one when
preprocessing dominates a single call. Absolute numbers vary by machine and
load, so treat the relative comparison as the signal, not the absolute ms.

Running this pthread-capable build on 1 thread costs about 4% versus a
hypothetical dedicated single-thread build (compared directly in both
Chromium and WebKit), noise-level against the roughly 1.5 MB it saves by not
shipping that second build. There used to be two separate wasm builds
(single-thread and multi-thread); they were consolidated into one because the
compiled size difference between them was only about 1%, so shipping both
cost nearly a full extra copy of the wasm for no real benefit.

An earlier revision of this card claimed "no measurable speedup." That was a
benchmarking artifact, not a property of the model: ORT-Web initializes its
wasm thread pool once per process, so a single-process script comparing a
1-thread and a 4-thread session ran both on whichever pool was created first,
which hid the real gain. `npm run bench:detectors` forks a fresh process per
config so each is measured correctly.

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
