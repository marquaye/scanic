# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
