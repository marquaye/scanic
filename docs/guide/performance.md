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

- **JavaScript layer**: high-level API, DOM/canvas handling, contour logic, workflow coordination.
- **WebAssembly layer**: the CPU-intensive inner loops:
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
  WASM instance warm. Essential for webcams and batch jobs. Call
  `initialize()` once.
- **Detect about 10 times per second, not on every frame.** In live preview,
  show the `<video>` itself and run `mode: 'detect'` on a timer of about 100ms.
  `requestAnimationFrame` fires 60 to 120 times per second on phones, which
  keeps the CPU busy and drains the battery without a visibly better overlay.
  Only `extract` on capture. See [Real-time scanning](/guide/web#real-time-scanning).
- **Pass the video or canvas directly.** `scan()` accepts `<video>`, canvases,
  `ImageBitmap` and `VideoFrame`. Calling `getImageData()` first copies the full
  frame for nothing; Scanic downscales before it reads any pixels.
- **Move scanning off the main thread** if the UI must stay perfectly smooth:
  detection and extraction run in a [Web Worker](/guide/web#in-a-web-worker).
- **Mind the cascade.** [`enableDetectionCascade`](/api/reference#options) retries
  hard images with extra passes. It improves accuracy but costs time; disable it
  if you control image quality and need maximum throughput.

## Measuring

Every result includes a `timings` array with a per-step breakdown:

```js
const result = await scanDocument(img, { mode: 'extract' })
console.table(result.timings) // [{ step, ms }, ...]
```
