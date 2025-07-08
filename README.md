<p align="center">
  <a href="#">
    <img src="./public/scanic-logo-bg.png" alt="scanic logo" height="400">
  </a>
</p>

# Scanic

**Modern Document Scanner in Pure JavaScript**

Scanic is a blazing-fast, lightweight, and modern document scanner library written entirely in JavaScript. It enables developers to detect, scan, and process documents from images directly in the browser or Node.js, with no dependencies on native code or external services.

## Why Scanic?

I wanted to use document scanning features within web environments without the overhead of large libraries. While OpenCV makes this easy, it comes at the cost of a 30+ MB download. That's why I developed my own workflow heavily inspired by [jscanify](https://github.com/puffinsoft/jscanify) but without the OpenCV dependency.

Scanic combines pure JavaScript algorithms with **Rust-compiled WebAssembly** for performance-critical operations like Gaussian blur, Canny edge detection, and gradient calculations. This hybrid approach delivers near-native performance while maintaining JavaScript's accessibility and a lightweight footprint.

Performance-wise, I'm working to match OpenCV solutions while maintaining the lightweight footprint - this is an ongoing area of improvement.

## Features

- 📄 **Document Detection**: Accurately finds and extracts document contours from images
- ✨ **Edge & Corner Detection**: Advanced algorithms for robust edge and corner identification
- ⚡ **Pure JavaScript**: No native modules, works everywhere JavaScript runs
- 🦀 **Rust WebAssembly**: Performance-critical operations optimized with Rust-compiled WASM
- 🖼️ **Image Processing**: Built-in tools for preprocessing and enhancing scanned images
- 🛠️ **Easy Integration**: Simple API for web apps, Electron, or Node.js applications
- 🏷️ **MIT Licensed**: Free for personal and commercial use
- 📦 **Lightweight**: Small bundle size compared to OpenCV-based solutions
- 🔧 **Customizable**: Configurable parameters for different use cases

## Demo

Try the live demo: [Open Demo](https://marquaye.github.io/scanic/demo.html)

## Installation

```bash
npm install scanic
```

Or use via CDN:

```html
<script src="https://unpkg.com/scanic/dist/scanic.js"></script>
```

## Usage

```js
import { detectDocument, extractDocument, highlightDocument } from 'scanic';

// 1. Detect the document in an image (HTMLImageElement, Canvas, or ImageData)
const result = await detectDocument(imageElement);

if (result.success && result.corners) {
  // 2. Extract (warp/crop) the document from the image
  const scannedCanvas = extractDocument(imageElement, result.corners);
  // Do something with the scannedCanvas (e.g., display or save)
  
  // 3. Optionally, highlight the detected document outline
  const highlightedCanvas = await highlightDocument(imageElement, { corners: result.corners });
}
```


## API Reference

### Core Functions

#### `detectDocument(image, options?)`
Detects documents in images and returns corner coordinates.

**Parameters:**
- `image`: HTMLImageElement, Canvas, or ImageData
- `options`: Optional configuration object
  - `downscaleFactor`: Number (default: 2) - Scale factor for processing speed
  - `blurRadius`: Number (default: 5) - Gaussian blur radius for noise reduction
  - `cannyLow`: Number (default: 50) - Lower threshold for Canny edge detection
  - `cannyHigh`: Number (default: 150) - Upper threshold for Canny edge detection

**Returns:** `Promise<{ success: boolean, corners?: Array, contour?: Array, debug?: Object }>`

#### `extractDocument(image, corners)`
Warps and crops the image using detected corners, returning a canvas with the extracted document.

**Parameters:**
- `image`: HTMLImageElement, Canvas, or ImageData
- `corners`: Array of four corner points `[{x, y}, {x, y}, {x, y}, {x, y}]`

**Returns:** `HTMLCanvasElement`

#### `highlightDocument(image, options?)`
Creates a visual highlight of the detected document outline.

**Parameters:**
- `image`: HTMLImageElement, Canvas, or ImageData  
- `options`: Optional configuration object
  - `corners`: Array of corner points (if not provided, will auto-detect)

**Returns:** `Promise<HTMLCanvasElement>`

All functions work in both browser and Node.js environments. For Node.js, use a compatible canvas/image implementation like `canvas` or `node-canvas`.

## Examples

### Basic Document Scanning

```js
import { detectDocument, extractDocument } from 'scanic';

async function scanDocument(imageElement) {
  try {
    const detection = await detectDocument(imageElement);
    
    if (detection.success) {
      const scannedDocument = extractDocument(imageElement, detection.corners);
      document.body.appendChild(scannedDocument);
    } else {
      console.log('No document detected in the image');
    }
  } catch (error) {
    console.error('Scanning failed:', error);
  }
}
```

### Advanced Configuration

```js
const options = {
  downscaleFactor: 1.5,  // Higher quality, slower processing
  blurRadius: 3,         // Less noise reduction
  cannyLow: 30,          // More sensitive edge detection
  cannyHigh: 120
};

const result = await detectDocument(imageElement, options);
```

### Document Highlighting

```js
// Highlight detected document outline
const highlightedImage = await highlightDocument(imageElement);
document.body.appendChild(highlightedImage);

// Or highlight specific corners
const customHighlight = await highlightDocument(imageElement, {
  corners: [{x: 10, y: 10}, {x: 200, y: 10}, {x: 200, y: 300}, {x: 10, y: 300}]
});
```

## Development

Clone the repository and set up the development environment:

```bash
git clone https://github.com/marquaye/scanic.git
cd scanic
npm install
```

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

The built files will be available in the `dist/` directory.

### Building the WebAssembly Module

The Rust WASM module is pre-compiled and included in the repository. If you need to rebuild it use docker:

```bash
docker compose -f 'docker-compose.yml' up -d --build

```


### Performance Architecture

Scanic uses a **hybrid JavaScript + WebAssembly approach**:

- **JavaScript Layer**: High-level API, DOM manipulation, and workflow coordination
- **WebAssembly Layer**: CPU-intensive operations like:
  - Gaussian blur with SIMD optimizations
  - Canny edge detection with hysteresis thresholding  
  - Gradient calculations using Sobel operators
  - Non-maximum suppression for edge thinning
  - Morphological operations (dilation/erosion)

The WASM module is compiled from Rust using `wasm-bindgen` and includes fixed-point arithmetic optimizations for better performance on integer operations.

## Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug? Open an issue with details and reproduction steps
2. **Feature Requests**: Have an idea? Create an issue to discuss it
3. **Pull Requests**: Ready to contribute code? 
   - Fork the repository
   - Create a feature branch (`git checkout -b feature/amazing-feature`)
   - Commit your changes (`git commit -m 'Add amazing feature'`)
   - Push to the branch (`git push origin feature/amazing-feature`)
   - Open a Pull Request

Please ensure your code follows the existing style and includes appropriate tests.

## Sponsors

[zeugnisprofi](https://zeugnisprofi.com)

[zeugnisprofi.de] (https://zeugnisprofi.de)

[verlingo](https://www.verlingo.de)

## Roadmap

- [ ] Performance optimizations to match OpenCV speed
- [ ] Enhanced WASM module with additional Rust-optimized algorithms
- [ ] SIMD vectorization for more image processing operations
- [ ] TypeScript definitions
- [ ] Additional image enhancement filters
- [ ] Mobile-optimized processing
- [ ] Plugin system for custom algorithms
- [ ] WebGPU acceleration for supported browsers

## License

MIT License © [marquaye](https://github.com/marquaye)

See [LICENSE](LICENSE) for more details.
