# ML detection spike — DocCornerNet (SimCC) in the browser runtime

Throwaway spike (step 1 of the ML-detection investigation) to answer two
questions *in the web runtime path*, before committing to any architecture:

1. **Latency** — what does ML corner detection cost via onnxruntime-web (WASM)?
2. **Accuracy** — how well do the ML corners agree with Scanic's classical
   detector, and how do they behave where the classical detector fails?

## Model

`model/doccornernet.onnx` — DocCornerNet V2 (coordinate-classification / SimCC),
exported from [mapo80/DocCornerNet-CoordClass-V2](https://github.com/mapo80/DocCornerNet-CoordClass-V2)
(**MIT licensed**). 600,963 params, ~2.4 MB float32 ONNX.

- Input: `[1,224,224,3]` float32, NHWC, RGB, `x/255` then ImageNet-normalised.
- Output: `coords [1,8]` normalised 0–1 `(x0,y0,…,x3,y3)`, soft-argmax decoding
  baked into the graph; `score_logit [1,1]` (sigmoid → P(document present)).

### Regenerating the ONNX

`export.py --format onnx` in the upstream repo is a no-op (no onnx branch), so
the model was converted directly:

```bash
pip install "tensorflow-cpu>=2.13,<2.17" tf2onnx "onnx==1.16.2"
# load weights via export.load_model_for_export, then:
tf2onnx.convert.from_keras(model, input_signature=spec, opset=17, output_path=...)
```

## Running

```bash
node scripts/ml-spike/run-spike.mjs scripts/ml-spike/model/doccornernet.onnx
```

Runs onnxruntime-web's **WASM** backend (single-thread + SIMD) under Node — the
same kernels a browser ships, so latency is representative of desktop browser
CPU. Writes overlay PNGs (green = classical, red = ML) to `overlays/`.

## Findings (17 test images, this machine)

- **Latency** ≈ 35 ms median per frame, single-thread WASM+SIMD CPU. Multi-thread
  or WebGPU would reduce this; mobile CPU would be higher. Real-time capable,
  not the native-TFLite "4 ms" (no NNAPI/ANE in the browser).
- **Agreement** with the classical detector: median IoU ≈ 0.87, with most images
  0.77–0.99.
- The low-IoU images (`0123`, `1023-receipt`, `25_2`) are cases where the
  **classical detector degenerates** (collapsed/sliver quads) — precisely the
  robustness gap ML is meant to close. `test6` (steep perspective) shows ML and
  classical overlapping almost exactly (IoU 0.99).

Conclusion: in-browser SimCC inference is feasible end-to-end (standard ONNX
ops, no blockers) and robust where the classical pipeline fails.
