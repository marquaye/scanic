# Scanic — Refactor & Optimisation Opportunities

> Analysis date: April 2026
> Baseline: 12 images, 11/12 detect success, 17/17 tests passing

---

## 1. Move the entire Canny pipeline into a single WASM call ⭐ HIGHEST IMPACT

**Files:** `src/edgeDetection.js`, `wasm_blur/src/lib.rs`

`cannyEdgeDetector` calls WASM **5 separate times** (blur → gradients → NMS → hysteresis → dilation), marshalling `Uint8Array`/`Float32Array` back to JS after each step — only to pass it straight back into the next WASM call. A function `canny_edge_detector_full` already exists in the Rust code and is imported but **never used** (dead code at line 682). Routing through a single WASM call eliminates 4 intermediate TypedArray allocations + copies (~3–6 ms on HD images) and lets Rust keep data in linear memory across all phases.

- **Speed:** −3–6 ms per scan (≈5–8% of detection)
- **Quality:** Rust gradients currently use central-difference instead of Sobel (missing the 2× weighting the JS path applies). Consolidating into one WASM path lets you fix the gradient kernel in one place.

---

## 2. Replace the 8 192-triangle perspective warp with bilinear interpolation

**Files:** `src/index.js` (function `unwarpImage`)

`unwarpImage` generates a 64×64 mesh → 8 192 triangles, each calling `ctx.save / clip / setTransform / drawImage / restore`. This single function consumes **33–88% of extraction time** (42–560 ms). A pixel-by-pixel inverse-map with bilinear sampling — done either in a `putImageData` loop or in WASM — removes all Canvas 2D state-machine overhead and can be SIMD-vectorised. Even a naive JS `ImageData` loop is faster than 8 192 GPU round-trips.

- **Speed:** Easily 2–5× faster extraction on large images
- **Quality:** Eliminates visible triangle-seam artifacts and the centroid-expansion hack that tries to hide them

---

## 3. Replace the CSS `grayscale(1)` filter with a direct pixel loop

**Files:** `src/index.js` (function `prepareScaleAndGrayscale`)

`prepareScaleAndGrayscale` applies `ctx.filter = 'grayscale(1)'` (GPU flush + colour-space conversion), then reads back RGBA only to throw away G/B/A in a scalar loop. On small-to-medium images this dominates detection time (up to **86%** on `test-sized.png`). A single combined scale-and-grayscale pass via `getImageData` + the same weighted-average formula already used in `edgeDetection.js` removes the GPU round-trip entirely, produces deterministic cross-browser results, and halves the number of canvas allocations.

- **Speed:** −50–260 ms on small/medium inputs
- **Quality:** Eliminates browser-dependent grayscale rendering differences

---

## 4. Add adaptive Canny thresholds (Otsu / median-based)

**Files:** `src/edgeDetection.js`, `src/constants.js`

`lowThreshold` and `highThreshold` are hardcoded to 75 / 200 in `edgeDetection.js`, while `constants.js` declares 50 / 150 (never read). This is the root cause of the `test2-sized.png` failure and likely hurts detection on low-contrast or over-exposed photos. Computing thresholds from the gradient-magnitude histogram (e.g. Otsu's method or median-of-non-zero × 0.66 / 1.33) is a cheap O(n) pass that adapts to each image automatically.

- **Speed:** Negligible cost (one histogram pass, ~0.5 ms)
- **Quality:** Should recover the 1 currently-failing image and improve robustness on real-world inputs with varying contrast

---

## 5. Early-exit contour detection after the first valid quad

**Files:** `src/contourDetection.js`

`detectDocumentContour` traces **every** contour in the edge image using Suzuki's algorithm, sorts them all by area, then returns only the largest. On complex scenes this is responsible for up to **42%** of detection time (35 ms on `test.png`). Because we only need the single best document quad, the trace loop can maintain a running "best" and skip contours whose bounding-box area can't exceed the current best. Combined with switching from `RETR_LIST` (all contours) to `RETR_EXTERNAL` (outermost only), this cuts wasted traversal by roughly 80% on busy images.

- **Speed:** −5–25 ms on complex scenes
- **Quality:** No change (same contour is selected, just found sooner)

---

## Baseline timing reference (ms)

| Phase                        | Avg detect | Avg extract | % of detect | % of extract |
|------------------------------|-----------|------------|------------|-------------|
| Image Prep + Scale + Gray    | 27        | —          | 28%        | —           |
| Gaussian Blur                | 13.5      | —          | 14%        | —           |
| Gradients                    | 2.2       | —          | 2%         | —           |
| Non-Max Suppression          | 6.5       | —          | 7%         | —           |
| Hysteresis                   | 2.5       | —          | 3%         | —           |
| Binary Image                 | 0.5       | —          | 1%         | —           |
| Dilation                     | 6.0       | —          | 6%         | —           |
| Find Contours                | 7.0       | —          | 7%         | —           |
| Corner Detection             | 0.06      | —          | <1%        | —           |
| Perspective Transform        | —         | 170        | —          | 71%         |
