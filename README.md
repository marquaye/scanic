<p align="center">
  <a href="#">
    <img src="public/scanic-logo-bg.png" alt="scanic logo" height="400">
  </a>
</p>

<p align="center">
    <a href="https://npmjs.com/package/scanic"><img src="https://badgen.net/npm/dw/scanic"></a>
    <br />
    <a href="https://github.com/marquaye/scanic/blob/master/LICENSE"><img src="https://img.shields.io/github/license/marquaye/scanic.svg"></a>
    <a href="https://npmjs.com/package/scanic"><img src="https://badgen.net/npm/v/scanic"></a>
</p>

# Scanic 📄⚡

**Ultra-fast, production-ready document scanning for the modern Web.**

Scanic is a high-performance document scanner library that brings professional-grade document edge detection and perspective correction to the browser and Node.js. By combining **Rust-powered WebAssembly** for pixel crunching and **GPU-accelerated Canvas** for image warping, Scanic delivers near-native performance (~10ms transforms) with a tiny footprint.

---

## 🚀 Why Scanic?

Traditional web scanning solutions often force a trade-off:
- **OpenCV.js**: Powerful, but requires a massive **30MB+** download.
- **Pure JS**: Lightweight, but struggles with real-time performance and complex transforms.

**Scanic bridges this gap:**
- **Hybrid Engine**: Rust/WASM handles the CPU-heavy edge detection.
- **Turbo Warp**: Custom Triangle Subdivision algorithm utilizes the GPU for perspective correction.
- **Zero Latency**: Designed for real-time applications like webcam scanning.

---

## ✨ Features

- 🎯 **Pinpoint Accuracy**: Robust document contour detection even in low-contrast environments.
- ⚡ **Turbocharged Warp**: Perspective transforms in **< 10ms** (vs 500ms+ in standard loops).
- 🦀 **WASM Core**: High-performance Gaussian Blur, Canny Edge Detection, and Dilation.
- 🛠️ **Modern API**: Clean, Promise-based API with full **TypeScript** support.
- 📦 **Featherweight**: Under **100KB** total size (gzipped).
- 🧪 **Production Grade**: Built-in regression tests with physical image baselines.

---

## 🛠️ Installation

```bash
# via npm
npm install scanic

# via yarn
yarn add scanic
```

### CDN
```html
<script src="https://unpkg.com/scanic/dist/scanic.js"></script>
```

---

## 📖 Usage

### Simple Usage
```js
import { scanDocument, extractDocument } from 'scanic';

// Simple usage - just detect document
const result = await scanDocument(imageElement);
if (result.success) {
  console.log('Document found at corners:', result.corners);
}

// Extract the document (with perspective correction)
const extracted = await scanDocument(imageElement, { mode: 'extract' });
if (extracted.success) {
  document.body.appendChild(extracted.output); // Display extracted document
}
```

### Optimized Usage (Recommended for Batch/Real-time)
The `Scanner` class maintains a persistent WebAssembly instance, avoiding the overhead of re-initializing WASM for every scan.

```js
import { Scanner } from 'scanic';

const scanner = new Scanner();

// Initialize once (optional, scan() will initialize if needed)
await scanner.initialize();

// Scan multiple images efficiently
async function onFrame(img) {
  const result = await scanner.scan(img, { mode: 'extract' });
  if (result.success) {
    // Process result...
  }
}
```

### Complete Example

```js
import { scanDocument } from 'scanic';

async function processDocument() {
  // Get image from file input or any source
  const imageFile = document.getElementById('fileInput').files[0];
  const img = new Image();
  
  img.onload = async () => {
    try {  
      // Extract and display the scanned document
      const result = await scanDocument(img, { 
        mode: 'extract',
        output: 'canvas'
      });
      
      if (result.success) {
        // Add the extracted document to the page
        document.getElementById('output').appendChild(result.output);
        
        // Or get as data URL for download/display
        const dataUrl = result.output.toDataURL('image/png');
        console.log('Extracted document as data URL:', dataUrl);
      }    
    } catch (error) {
      console.error('Error processing document:', error);
    }
  };
  
  img.src = URL.createObjectURL(imageFile);
}

// HTML setup
// <input type="file" id="fileInput" accept="image/*" onchange="processDocument()">
// <div id="output"></div>
```

## ⚙️ API Reference

### `scanDocument(image, options?)`
The primary function for detecting and extracting documents.

| Parameter | Type | Description |
| :--- | :--- | :--- |
| `image` | `HTMLImage\|Canvas\|ImageData` | The source image to scan. |
| `options` | `Object` | Configuration options (see below). |

#### `options` Properties
| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `'detect' \| 'extract'` | `'detect'` | `'detect'` returns coordinates; `'extract'` returns the warped image. |
| `output` | `'canvas' \| 'imagedata' \| 'dataurl'` | `'canvas'` | The format of the returned processed image. |
| `maxProcessingDimension` | `number` | `800` | Downscales image to this size for detection (faster). |
| `lowThreshold` | `number` | `75` | Lower threshold for Canny edge detection. |
| `highThreshold` | `number` | `200` | Upper threshold for Canny edge detection. |
| `minArea` | `number` | `1000` | Minimum pixel area to consider a contour a "document". |
| `debug` | `boolean` | `false` | If true, returns intermediate processing steps. |

#### Return Value
Returns a `Promise<ScannerResult>`:
```ts
{
  success: boolean;       // Did we find a document?
  corners: CornerPoints;  // { topLeft, topRight, bottomRight, bottomLeft }
  output: any;            // The warped image (if mode is 'extract')
  contour: Array<Point>;  // Raw detection points
  timings: Array<Object>; // Performance breakdown
  message: string;        // Status or error message
}
```

---

### `new Scanner()`
The recommended class for high-performance applications (Webcam, Batch processing).

```js
const scanner = new Scanner();
await scanner.initialize(); // Pre-loads WASM
const result = await scanner.scan(image, options);
```

## Examples

```js
const options = {
  mode: 'extract',
  maxProcessingDimension: 1000,  // Higher quality, slower processing
  lowThreshold: 50,              // More sensitive edge detection
  highThreshold: 150,
  dilationKernelSize: 5,         // Larger dilation kernel
  minArea: 2000,                 // Larger minimum document area
  debug: true                    // Enable debug information
};

const result = await scanDocument(imageElement, options);
```

### Different Modes and Output Formats

```js
// Just detect (no image processing)
const detection = await scanDocument(imageElement, { mode: 'detect' });

// Extract as canvas
const extracted = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'canvas' 
});

// Extract as ImageData
const rawData = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'imagedata' 
});

// Extract as DataURI
const rawData = await scanDocument(imageElement, { 
  mode: 'extract',
  output: 'dataurl' 
});

```

## 💻 Framework Examples

Scanic is framework-agnostic but works great with modern UI libraries:

| Framework | Link |
| :--- | :--- |
| **Vue 3** | [Vue.js Example & Guide](docs/vue-example.md) |
| **React** | [React Example & Guide](docs/react-example.md) |

---

## 🛠️ Development

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

The Rust WASM module is pre-compiled and included in the repository. If you need to rebuild it:

```bash
npm run build:wasm
```

This uses Docker to build the WASM module without requiring local Rust installation.

### Testing

Scanic uses Vitest for unit and regression testing. We test against real document images to ensure detection accuracy remains consistent.

```bash
npm test
```


## 🖥️ Node.js Support

Scanic can run on the server! Since it relies on the Canvas API, you need to provide a canvas implementation (like `node-canvas`) and a DOM environment (`jsdom`).

```js
import { scanDocument } from 'scanic';
import { loadImage } from 'canvas';
import { JSDOM } from 'jsdom';

// Setup global environment
const dom = new JSDOM();
global.document = dom.window.document;
global.ImageData = dom.window.ImageData;

const img = await loadImage('document.jpg');
const result = await scanDocument(img, { mode: 'extract' });
```

---

## 📊 Comparison

| Feature | Scanic | jscanify | OpenCV.js |
| :--- | :--- | :--- | :--- |
| **Download Size** | **~100KB** | ~1MB | ~30MB |
| **Perspective Speed** | **~10ms** | ~200ms | ~5ms |
| **WASM Optimized** | ✅ Yes | ❌ No | ✅ Yes |
| **GPU Acceleration** | ✅ Yes | ❌ No | ❌ No |
| **TypeScript** | ✅ Yes | ❌ No | ✅ Yes |

---

## 🏗️ Performance Architecture

Scanic uses a **hybrid JavaScript + WebAssembly approach**:

- **JavaScript Layer**: High-level API, DOM manipulation, and workflow coordination
- **WebAssembly Layer**: CPU-intensive operations like:
  - Gaussian blur with SIMD optimizations
  - Canny edge detection with hysteresis thresholding  
  - Gradient calculations using Sobel operators
  - Non-maximum suppression for edge thinning
  - Morphological operations (dilation/erosion)

## 🤝 Contributing

Contributions are welcome! Whether it's reporting a bug, suggesting a feature, or submitting a pull request, your help is appreciated.

1. **Report Issues**: Use the GitHub Issue tracker.
2. **Pull Requests**:
   - Fork the repository.
   - Create a feature branch.
   - Commit your changes.
   - Open a Pull Request.

---

## 📜 Credits

- Inspired by [jscanify](https://github.com/puffinsoft/jscanify).
- WASM Blur module powered by Rust.

---

## 💖 Sponsors

<p align="center">
  <strong>Special thanks to our amazing sponsors who make this project possible!</strong>
</p>

<div align="center">

### 🏆 Gold Sponsors

<table>
  <tr style="color: black;">
    <td align="center" width="300">
      <a href="https://zeugnisprofi.com" target="_blank"> 
        <br/>
        <strong>ZeugnisProfi</strong>
      </a>
      <br/>
      <em>Professional certificate and document services</em>
    </td>
    <td align="center" width="300">
      <a href="https://zeugnisprofi.de" target="_blank">
        <br/>
        <strong>ZeugnisProfi.de</strong>
      </a>
      <br/>
      <em>German document processing specialists</em>
    </td>
    <td align="center" width="250">
      <a href="https://www.verlingo.de" target="_blank">
        <br/>
        <strong>Verlingo</strong>
      </a>
      <br/>
      <em>Language and translation services</em>
    </td>
  </tr>
</table>

</div>

## 🗺️ Roadmap

- [x] TypeScript definitions
- [x] High-performance perspective transformation (Triangle Subdivision)
- [ ] Enhanced WASM module with additional Rust-optimized algorithms
- [ ] WebGPU acceleration for supported browsers
- [ ] Mobile-optimized real-time video processing frames
- [ ] Additional image enhancement filters (Adaptive Thresholding, B&W)

## License

MIT License © [marquaye](https://github.com/marquaye)

