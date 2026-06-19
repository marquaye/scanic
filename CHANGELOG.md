# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-06-19

### Added
- **Corner editor theming & API**: `createCornerEditor` is now fully styleable. Everything visual is driven by CSS custom properties (`--scanic-*`) with a shipped default stylesheet you can override or opt out of. New options: `theme`, `classNames`, `toolbar`, and `injectStyles`, plus a `refreshTheme()` method on the editor instance.
- **Corner editor toolbar**: A compact floating Reset · Cancel · Apply toolbar (icon buttons with hover tooltips), shown by default, plus an optional "expert" precision nudge-pad toggle for moving the selected corner pixel by pixel.
- **Documentation site**: A new VitePress docs site published at the GitHub Pages root — getting started, a "How it works" explainer, guides (Web, Node.js, Electron, React/Vue), corner-editor, performance, and a full API reference, with an interactive in-browser playground. The standalone interactive demo now lives at `/demo`.

### Changed
- **Corner editor rendering**: Reworked into a hybrid renderer — the image, mask, and outline draw on canvas while the corner handles are now DOM elements. Handles have CSS hover/focus/grabbed states (the active handle lifts with an accent ring, halo, and elevated shadow), and the currently selected corner is highlighted so it is clear which one the nudges and keyboard affect.
- Corner editor defaults: nudge steps are now `[1, 10]`, the handle hit target is `44px`, and the magnifier sits closer to the active corner.

## [1.1.1] - 2026-06-19

### Fixed
- **WASM loading under bundlers** ([#7](https://github.com/marquaye/scanic/issues/7)): the module is now instantiated from inlined bytes instead of `fetch(new URL('…wasm', import.meta.url))`. The old path broke under Vite — the inlined `data:` URL was rewritten into a bad relative request (`/node_modules/.vite/deps/data:application/wasm;base64…`), the fetch failed, and the library silently fell back to JS — and it also emitted a `new URL(…, import.meta.url) doesn't exist at build time` warning in downstream builds. Both are resolved, and the change also simplifies Node usage (no `fs`/path resolution).
- **Electron 13 / old-Chromium renderer crash** ([#8](https://github.com/marquaye/scanic/issues/8)): instantiating the SIMD WebAssembly module hard-crashed the renderer on engines based on Chromium < 96 (e.g. Electron 13 / V8 9.1) — a native abort that a surrounding `try/catch` could not recover from. The WASM module is now feature-gated behind a non-crashing `WebAssembly.validate()` probe, and incompatible engines transparently use the existing pure-JS implementation instead. `initialize()` and `Scanner.initialize()` no longer reject when WASM is unavailable, since it is an optional accelerator.

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
