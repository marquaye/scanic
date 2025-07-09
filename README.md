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
import { detectDocument, scanDocument, LiveScanner, checkWebcamAvailability } from 'scanic';

// 1. Detect the document in an image (HTMLImageElement, Canvas, or ImageData)
const result = await detectDocument(imageElement);

if (result.success && result.corners) {
  // 2. Extract (warp/crop) the document from the image
  const extractedResult = await scanDocument(imageElement, { mode: 'extract' });
  document.body.appendChild(extractedResult.output);
  
  // 3. Or highlight the detected document outline
  const highlightedResult = await scanDocument(imageElement, { mode: 'highlight' });
  document.body.appendChild(highlightedResult.output);
}
```


## API Reference

### Core Functions

#### `detectDocument(imageData, options?)`
Detects documents in images and returns corner coordinates and contour information.

**Parameters:**
- `imageData`: ImageData object (use canvas.getImageData() for HTMLImageElement/Canvas)
- `options`: Optional configuration object
  - `maxProcessingDimension`: Number (default: 800) - Maximum dimension for processing (adaptive downscaling)
  - `lowThreshold`: Number (default: 75) - Lower threshold for Canny edge detection
  - `highThreshold`: Number (default: 200) - Upper threshold for Canny edge detection
  - `dilationKernelSize`: Number (default: 3) - Kernel size for dilation
  - `dilationIterations`: Number (default: 1) - Number of dilation iterations
  - `minArea`: Number (default: 1000) - Minimum contour area for document detection
  - `epsilon`: Number - Epsilon for polygon approximation
  - `debug`: Boolean (default: false) - Enable debug information

**Returns:** `Promise<{ success: boolean, corners?: Object, contour?: Array, debug?: Object, message?: string }>`

The `corners` object contains: `{ topLeft, topRight, bottomRight, bottomLeft }` with `{x, y}` coordinates.

#### `scanDocument(image, options?)`
Main entry point for document scanning with flexible output options.

**Parameters:**
- `image`: HTMLImageElement, HTMLCanvasElement, or ImageData
- `options`: Optional configuration object
  - `mode`: String - 'highlight' (default) or 'extract'
  - `output`: String - 'canvas' (default), 'imagedata', or 'dataurl'
  - `debug`: Boolean (default: false) - Enable debug information
  - All `detectDocument` options are also supported

**Returns:** `Promise<{ output, corners, contour, debug, success, message }>`

### Live Scanner

#### `LiveScanner`
Real-time document scanner for webcam integration.

**Constructor Options:**
- `targetFPS`: Number (default: 10) - Target frames per second
- `detectionInterval`: Number (default: 150) - Milliseconds between detections
- `confidenceThreshold`: Number (default: 0.7) - Confidence threshold for detections
- `stabilizationFrames`: Number (default: 3) - Frames needed for stable detection
- `maxProcessingDimension`: Number (default: 500) - Max dimension for live processing

**Methods:**
- `init(outputElement, constraints)` - Initialize webcam and start scanning
- `stop()` - Stop scanning and release resources
- `pause()` - Pause scanning
- `resume()` - Resume scanning
- `capture()` - Capture current frame

**Events:**
- `onDetection(result)` - Called when document is detected
- `onFPSUpdate(fps)` - Called with current FPS
- `onError(error)` - Called on errors

#### `checkWebcamAvailability()`
Checks if webcam is available and lists video devices.

**Returns:** `Promise<{ available: boolean, deviceCount?: number, devices?: Array, error?: string }>`

All functions work in both browser and Node.js environments. For Node.js, use a compatible canvas/image implementation like `canvas` or `node-canvas`.

## Examples

### Basic Document Scanning

```js
import { detectDocument, scanDocument } from 'scanic';

async function processDocument(imageElement) {
  try {
    // Convert image to ImageData
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width || imageElement.naturalWidth;
    canvas.height = imageElement.height || imageElement.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const detection = await detectDocument(imageData);
    
    if (detection.success) {
      const result = await scanDocument(imageElement, { mode: 'extract' });
      document.body.appendChild(result.output);
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
  maxProcessingDimension: 1000,  // Higher quality, slower processing
  lowThreshold: 50,              // More sensitive edge detection
  highThreshold: 150,
  dilationKernelSize: 5,         // Larger dilation kernel
  minArea: 2000,                 // Larger minimum document area
  debug: true                    // Enable debug information
};

const result = await detectDocument(imageData, options);
```

### Document Highlighting vs Extraction

```js
// Extract the document (cropped and warped)
const extractedResult = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'canvas' 
});

// Highlight the document outline on original image
const highlightedResult = await scanDocument(imageElement, { 
  mode: 'highlight',
  output: 'dataurl' 
});

// Get raw ImageData output
const rawResult = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'imagedata' 
});
```

### Live Scanner Usage

```js
import { LiveScanner, checkWebcamAvailability } from 'scanic';

// Check if webcam is available
const webcamStatus = await checkWebcamAvailability();
if (!webcamStatus.available) {
  console.error('No webcam available');
  return;
}

// Create live scanner
const liveScanner = new LiveScanner({
  targetFPS: 15,
  detectionInterval: 100,
  maxProcessingDimension: 600
});

// Set up event handlers
liveScanner.onDetection = (result) => {
  if (result.success) {
    console.log('Document detected:', result.corners);
  }
};

liveScanner.onFPSUpdate = (fps) => {
  console.log('Current FPS:', fps);
};

// Start scanning
const outputCanvas = document.getElementById('scanner-output');
await liveScanner.init(outputCanvas);

// Stop scanning when done
// liveScanner.stop();
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
