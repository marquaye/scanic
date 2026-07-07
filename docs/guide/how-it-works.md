# How It Works

Scanic turns a casual photo of a document into a clean, flat scan in two phases:
**detection** (find the four corners) and **extraction** (warp the quad into a
rectangle). Here's the journey of a single image, kept conceptual. You don't
need to understand any of it to use the library.

## The pipeline

```
Image ─▶ Downscale + grayscale ─▶ Blur ─▶ Canny edges ─▶ Dilate
      ─▶ Find contours ─▶ Pick best quad ─▶ Order corners ─▶ Warp ─▶ Scan
         └────────────── detection ──────────────┘   └─ extraction ─┘
```

### 1. Prepare: downscale & grayscale

The source image is drawn to a canvas and scaled down so its longest side is at
most [`maxProcessingDimension`](/api/reference#options) (800px by default).
Working on a smaller image makes detection dramatically faster, and the detected
corners are scaled back up to full resolution at the end. In the same pass the
pixels are converted to grayscale (BT.709 luminance), since edges don't need
colour.

### 2. Blur (WASM)

A Gaussian blur smooths out noise and texture so that only meaningful edges
survive. This is one of the hot loops handled by the **Rust/WebAssembly** core
with SIMD optimizations.

### 3. Edge detection

A **Canny edge detector** finds the document's outline. It computes Sobel
gradients (JS), thins edges to one pixel wide with non-maximum suppression
(**WASM**), and keeps only connected, confident edges with hysteresis
thresholding (JS by default; a WASM path exists and can be opted into).
Thresholds are **adaptive** by default, but you can pin them with
[`lowThreshold`](/api/reference#options) / `highThreshold`.

### 4. Dilation (WASM)

Real photos produce broken edges. A morphological **dilation** thickens and
reconnects edge fragments so the document border becomes a continuous loop.
Tunable via [`dilationKernelSize`](/api/reference#options) and
`dilationIterations`.

### 5. Contour detection & corner selection

Scanic traces the closed contours in the edge map and scores the largest
candidates to find the one that best looks like a document, checking area
coverage, fill ratio, aspect ratio, and how close its corners are to right
angles. The winning contour is approximated to a four-point polygon, and its
points are ordered into `topLeft`, `topRight`, `bottomRight`, `bottomLeft`.

::: tip Adaptive cascade
If the first pass isn't confident enough
([`minCascadeTriggerConfidence`](/api/reference#options)), Scanic automatically
retries with alternative profiles (different thresholds/dilation) to handle hard,
low-contrast images. This is the `enableDetectionCascade` behaviour.
:::

### 6. Extraction: the perspective warp

In `extract` mode, the four corners define a quadrilateral that gets mapped onto
a clean rectangle. Instead of a slow forward per-pixel loop, Scanic uses a
**bilinear inverse-map**: for every output pixel it computes the corresponding
source coordinate via the inverse perspective matrix and bilinearly samples the
source image, completing the warp in roughly **10ms**, with no Canvas
state-machine overhead and no seam artifacts.

## Why hybrid JS + WASM?

- **JavaScript layer**: the high-level API, DOM/canvas handling, contour detection, corner selection, the perspective warp, and workflow coordination.
- **WebAssembly layer**: the pixel-crunching inner loops where it pays off most by default: Gaussian blur, non-maximum suppression, and dilation. Sobel gradients and hysteresis thresholding also have WASM implementations, but currently run in JS by default.

This split keeps the bundle tiny (~100KB) while delivering near-native speed
where it matters.

::: info Graceful fallback
If the engine can't run the WASM module (for example, very old Chromium in some
Electron builds), Scanic transparently falls back to a pure-JavaScript
implementation. See the [Electron guide](/guide/electron).
:::
