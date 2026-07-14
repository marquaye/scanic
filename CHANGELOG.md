# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.1] - 2026-07-14

### Fixed
- **Webpack/CRA/Next.js builds broken by the lazy ML-detector import**: importing scanic's ESM entry crashed webpack-based builds with `Module not found: Error: Can't resolve 'ort.wasm.min.mjs'`, even for classical-only usage, because webpack statically followed the lazy ML-detector import into the ONNX Runtime chunk at compile time. Fixed via a `webpackIgnore` magic comment on that import, preserved through the build's minifier so future releases can't silently regress it. Vite consumers are unaffected.

### Changed
- **`scanic-ml`'s custom wasm build upgraded to ONNX Runtime v1.27.0** (was v1.23.2), and `onnxruntime-web` bumped to match (`^1.27.0`). No accuracy or performance regression: verified identical IoU against the ground-truth baseline suite and benchmark numbers within normal run-to-run variance; wasm size is unchanged (~1.5 MB).

## [1.5.0] - 2026-07-07

### Added
- **`ml.threaded` option**: shorthand for `numThreads: 4`. On a cross-origin isolated
  host page (`COOP: same-origin` + `COEP: require-corp`), this gives roughly
  2x faster ML inference. Without isolation it falls back to running on 1
  thread automatically, so it is safe to request speculatively.

### Changed
- **`scanic-ml` now ships a single wasm build** (0.2.0), down from 6.9 MB to
  3.5 MB unpacked, roughly half. There used to be two nearly identical wasm
  builds (a dedicated single-thread one and a pthread-capable one); running
  the pthread build on 1 thread costs about 4% versus the dedicated build,
  noise-level, so shipping both cost close to a full extra copy of the wasm
  for no real benefit. If you self-host the `scanic-ml` assets, update to
  `scanic-ml@0.2.0`; the file layout changed (`dist/ort-wasm-simd.wasm` and
  `dist/threaded/` are gone).

## [1.4.1] - 2026-06-30

### Changed
- Rewrote the ML detection guide and the README ML section to be clearer and aimed at developers using the library.

## [1.4.0] - 2026-06-30

### Changed
- **ML detector no longer needs a separate install**: the ONNX Runtime JS API is now bundled into scanic's ESM build as a **lazy, code-split chunk** (~50 KB, gzip ~15 KB) loaded only on first `detector: 'ml'` use. `onnxruntime-web` is no longer an (optional) peer dependency, so `npm install scanic` is all ML users need. The custom wasm + model still stream from the `scanic-ml` CDN at runtime, and classical users still download none of it. The matching ORT version is bundled, so there is no longer a peer-version mismatch to get wrong.
  - UMD/CommonJS consumers are unchanged: `onnxruntime-web` stays external there (UMD can't code-split), so script-tag/`require` ML users still self-provide `onnxruntime-web@1.23.x`.

## [1.3.0] - 2026-06-30

### Added
- **Optional ML document-corner detector**: pass `detector: 'ml'` to `scanDocument` or `Scanner` to use a neural corner detector, a channel-slimmed SimCC model (DocCornerNet, 456 K params, ~1.9 MB) paired with a custom minimal ONNX Runtime Web WASM build (~1.5 MB, 88 % smaller than stock ort-web). Classical users pay nothing: the detector is fully opt-in, lazy-loaded, and gated behind the optional peer dependency `onnxruntime-web`.
- **`scanic-ml` companion package** (`npm install scanic-ml`): the model (`.ort` format) and the custom ORT WASM loader. Published to npm and served from jsDelivr by default, so no self-hosting is required. Self-hosting supported via the `ml.assetBaseUrl` option.
- **`result.score`**: when using the ML detector, `scanDocument` returns a `score` field, the model's P(document present) confidence, 0-1.
- **`ml` options namespace**: `assetBaseUrl`, `modelUrl`, `wasmPaths`, `modelBytes`, `numThreads`, and `minScore`.

## [1.2.0] - 2026-06-19

### Added
- **Corner editor theming & API**: `createCornerEditor` is now fully styleable. Everything visual is driven by CSS custom properties (`--scanic-*`) with a shipped default stylesheet you can override or opt out of. New options: `theme`, `classNames`, `toolbar`, and `injectStyles`, plus a `refreshTheme()` method on the editor instance.
- **Corner editor toolbar**: A compact floating Reset · Cancel · Apply toolbar (icon buttons with hover tooltips), shown by default, plus an optional "expert" precision nudge-pad toggle for moving the selected corner pixel by pixel.
- **Documentation site**: A new VitePress docs site published at the GitHub Pages root, with getting started, a "How it works" explainer, guides (Web, Node.js, Electron, React/Vue), corner-editor, performance, and a full API reference, plus an interactive in-browser playground. The standalone interactive demo now lives at `/demo`.

### Changed
- **Corner editor rendering**: Reworked into a hybrid renderer. The image, mask, and outline draw on canvas while the corner handles are now DOM elements. Handles have CSS hover/focus/grabbed states (the active handle lifts with an accent ring, halo, and elevated shadow), and the currently selected corner is highlighted so it is clear which one the nudges and keyboard affect.
- Corner editor defaults: nudge steps are now `[1, 10]`, the handle hit target is `44px`, and the magnifier sits closer to the active corner.

## [1.1.1] - 2026-06-19

### Fixed
- **WASM loading under bundlers** ([#7](https://github.com/marquaye/scanic/issues/7)): the module is now instantiated from inlined bytes instead of `fetch(new URL('…wasm', import.meta.url))`. The old path broke under Vite: the inlined `data:` URL was rewritten into a bad relative request (`/node_modules/.vite/deps/data:application/wasm;base64…`), the fetch failed, and the library silently fell back to JS. It also emitted a `new URL(…, import.meta.url) doesn't exist at build time` warning in downstream builds. Both are resolved, and the change also simplifies Node usage (no `fs`/path resolution).
- **Electron 13 / old-Chromium renderer crash** ([#8](https://github.com/marquaye/scanic/issues/8)): instantiating the SIMD WebAssembly module hard-crashed the renderer on engines based on Chromium < 96 (e.g. Electron 13 / V8 9.1), a native abort that a surrounding `try/catch` could not recover from. The WASM module is now feature-gated behind a non-crashing `WebAssembly.validate()` probe, and incompatible engines transparently use the existing pure-JS implementation instead. `initialize()` and `Scanner.initialize()` no longer reject when WASM is unavailable, since it is an optional accelerator.

## [1.0.7] - 2026-05-14

### Added
- **Adaptive Multi-Pass Detection**: Added detection-pass cascade profiles (`default`, `connect-edges`, `no-dilation`, `fixed-mid-thresholds`) with pass-aware candidate selection.
- **Richer Candidate Geometry Scoring**: Added right-angle, opposite-side consistency, and contour-fit metrics to improve document candidate ranking.
- **Corner Approximation Stabilization**: Added multi-epsilon quadrilateral search and near-duplicate approximation-point cleanup for more stable corners on hard contours.
- **Debug Comparison Enhancements**: Added full test image set in debug UI and corner-by-corner Scanic vs jscanify delta reporting.
- **Live Demo Sample Expansion**: Expanded demo sample image gallery to cover more real test cases from `testImages/`.

### Changed
- Updated detection candidate sorting to prefer valid geometry and better near-tie tie-breaking.
- Improved non-debug performance by storing timings without retaining heavy debug arrays.
- Updated public detection options typings with cascade and geometry-threshold controls.
- **Rewrote the perspective warp**: replaced the GPU-accelerated 8,192-triangle Canvas subdivision (introduced in 1.0.0) with a per-pixel bilinear inverse-map (`getImageData`/`putImageData`). Removes all Canvas 2D state-machine overhead and the triangle-seam artifacts the old approach needed a centroid-expansion hack to hide, while keeping the ~10ms transform time.

### Fixed
- Fixed corner regression caused by near-duplicate approximation vertices on `test.png`.
- Restored stable hard-case behavior by limiting approximation reduction to duplicate cleanup instead of aggressive polygon collapse.

## [1.0.0] - 2026-01-08

### Added
- **Scanner Class**: Added a stateful `Scanner` class for persistent WebAssembly instances and improved performance in batch processing.
- **TypeScript Support**: Full `.d.ts` type definitions for all public APIs and options.
- **Regression Testing**: Implemented a comprehensive test suite using `vitest`, `jsdom`, and real test images to ensure detection stability.
- **Turbocharged Warp**: Implemented **Triangle Subdivision** for perspective transforms, reducing processing time from ~700ms to <10ms by utilizing GPU-accelerated Canvas APIs.
- **Centroid Expansion**: Added vector-based centroid expansion to eliminate "patch line" artifacts in warped images.

### Changed
- Reorganized exports in `package.json` to properly support modern build tools and TypeScript resolution.
- Refactored WASM instantiation to be lazy-loaded and thread-safe.
- Improved `scanDocument` API with cleaner options handling.

### Fixed
- Fixed visual artifacts at the seams of triangle patches in perspective transformations.
- Resolved environmental issues when running in Node.js/JSDOM environments.

## [0.1.1] - 2025-01-09

### Added
- Live scanner functionality with webcam integration
- Real-time document detection with frame rate optimization
- WebAssembly-optimized image processing operations
- Adaptive downscaling for better performance
- Debug mode for development and troubleshooting

### Changed
- Improved API structure with `detectDocument` and `scanDocument` functions
- Enhanced edge detection with configurable thresholds
- Better corner detection accuracy
- Optimized contour detection algorithms

### Fixed
- Performance improvements in image processing pipeline
- Memory management optimizations
- Cross-browser compatibility issues

## [0.1.0] - Initial Release

### Added
- Basic document detection functionality
- Canny edge detection implementation
- Contour detection and corner finding
- Perspective transformation for document extraction
- Pure JavaScript implementation with Rust WASM optimization
- MIT License
- Basic documentation and examples
