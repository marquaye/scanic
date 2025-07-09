# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automated release workflow with GitHub Actions
- NPM package publishing on version tags
- Continuous Integration (CI) workflow
- CHANGELOG.md for release tracking

### Changed
- Updated package.json to include WASM files in NPM package
- Improved .npmignore to properly exclude development files
- Added prepublishOnly script to ensure build before publishing

### Fixed
- Package structure for proper NPM distribution

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
