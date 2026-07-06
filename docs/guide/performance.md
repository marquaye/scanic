# Performance

Scanic is built to be fast and small. This page covers how it achieves that and
how to tune it for your workload.

## How it compares

| Feature | Scanic | jscanify | OpenCV.js |
| :--- | :--- | :--- | :--- |
| **Download size** | **~100KB** | ~31MB | ~30MB |
| **Perspective speed** | **~10ms** | ~200ms | ~5ms |
| **WASM optimized** | ✅ | ❌ | ✅ |
| **TypeScript** | ✅ | ❌ | ✅ |

## Architecture

Scanic uses a **hybrid JavaScript + WebAssembly** approach:

- **JavaScript layer** — high-level API, DOM/canvas handling, contour logic, workflow coordination.
- **WebAssembly layer** — the CPU-intensive inner loops:
  - Gaussian blur with SIMD
  - Canny edge detection with hysteresis thresholding
  - Sobel gradient calculations
  - Non-maximum suppression (edge thinning)
  - Morphological dilation

The perspective warp uses a **per-pixel bilinear inverse-map**: for each output
pixel, the inverse perspective matrix locates the corresponding source
coordinate, which is then bilinearly sampled directly via `ImageData`. This
completes in roughly **10ms**, versus 500ms+ for a naive forward per-pixel loop
and versus the older GPU/Canvas triangle-subdivision approach it replaced,
which also had visible seam artifacts.

## Tuning tips

- **Downscale for detection.** [`maxProcessingDimension`](/api/reference#options)
  (default 800) caps the size Scanic detects on. Lower it (600) for speed, raise
  it (1200) for sharper corner accuracy on large images. Corners are scaled back
  to full resolution automatically.
- **Reuse a `Scanner`.** The [`Scanner`](/api/reference#scanner) class keeps the
  WASM instance warm — essential for webcams and batch jobs. Call
  `initialize()` once.
- **Detect, then extract.** In live preview, run `mode: 'detect'` on a fraction
  of frames and only `extract` on capture.
- **Mind the cascade.** [`enableDetectionCascade`](/api/reference#options) retries
  hard images with extra passes. It improves accuracy but costs time; disable it
  if you control image quality and need maximum throughput.

## Measuring

Every result includes a `timings` array with a per-step breakdown:

```js
const result = await scanDocument(img, { mode: 'extract' })
console.table(result.timings) // [{ step, ms }, ...]
```
