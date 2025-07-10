<p align="center">
  <a href="#">
    <img src="./public/scanic-logo-bg.png" alt="scanic logo" height="400">
  </a>
</p>

# Scanic

**Modern Document Scanner for the Web**

Scanic is a blazing-fast, lightweight, and modern document scanner library written in JavaScript and rust (WASM). It enables developers to detect, scan, and process documents from images directly in the browser or Node.js, with no dependencies or external services.

## Why Scanic?

I always wanted to use document scanning features within web environments for years. While OpenCV makes this easy, it comes at the cost of a 30+ MB download.

Scanic combines pure JavaScript algorithms with **Rust-compiled WebAssembly** for performance-critical operations like Gaussian blur, Canny edge detection, and gradient calculations. This hybrid approach delivers near-native performance while maintaining JavaScript's accessibility and a lightweight footprint.

Performance-wise, I'm working to match OpenCV solutions while maintaining the lightweight footprint - this is an ongoing area of improvement.

This library is heavily inspired by [jscanify](https://github.com/puffinsoft/jscanify) 

## Features

- 📄 **Document Detection**: Accurately finds and extracts document contours from images
- ⚡ **Pure JavaScript**: Works everywhere JavaScript runs
- 🦀 **Rust WebAssembly**: Performance-critical operations optimized with Rust-compiled WASM
- 🛠️ **Easy Integration**: Simple API for web apps, Electron, or Node.js applications
- 🏷️ **MIT Licensed**: Free for personal and commercial use
- 📦 **Lightweight**: Small bundle size (< 100kb) compared to OpenCV-based solutions (+30 mb)

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
import { scanDocument } from 'scanic';

// Simple usage - just detect document
const result = await scanDocument(imageElement);
if (result.success) {
  console.log('Document found at corners:', result.corners);
}

// Extract the document (perspective correction)
const extracted = await scanDocument(imageElement, { mode: 'extract' });
if (extracted.success) {
  document.body.appendChild(extracted.output); // Display extracted document
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

## API Reference

### Core Function

#### `scanDocument(image, options?)`
Main entry point for document scanning with flexible modes and output options.

**Parameters:**
- `image`: HTMLImageElement, HTMLCanvasElement, or ImageData
- `options`: Optional configuration object
  - `mode`: String - 'detect' (default), or 'extract'
    - `'detect'`: Only detect document, return corners/contour info (no image processing)
    - `'extract'`: Extract/warp the document region
  - `output`: String - 'canvas' (default), 'imagedata', or 'dataurl'
  - `debug`: Boolean (default: false) - Enable debug information
  - Detection options:
    - `maxProcessingDimension`: Number (default: 800) - Maximum dimension for processing in pixels
    - `lowThreshold`: Number (default: 75) - Lower threshold for Canny edge detection
    - `highThreshold`: Number (default: 200) - Upper threshold for Canny edge detection
    - `dilationKernelSize`: Number (default: 3) - Kernel size for dilation
    - `dilationIterations`: Number (default: 1) - Number of dilation iterations
    - `minArea`: Number (default: 1000) - Minimum contour area for document detection
    - `epsilon`: Number - Epsilon for polygon approximation

**Returns:** `Promise<{ output, corners, contour, debug, success, message }>`

- `output`: Processed image (null for 'detect' mode)
- `corners`: Object with `{ topLeft, topRight, bottomRight, bottomLeft }` coordinates
- `contour`: Array of contour points
- `success`: Boolean indicating if document was detected
- `message`: Status message

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

The Rust WASM module is pre-compiled and included in the repository. If you need to rebuild it:

```bash
npm run build:wasm
```

This uses Docker to build the WASM module without requiring local Rust installation.


### Performance Architecture

Scanic uses a **hybrid JavaScript + WebAssembly approach**:

- **JavaScript Layer**: High-level API, DOM manipulation, and workflow coordination
- **WebAssembly Layer**: CPU-intensive operations like:
  - Gaussian blur with SIMD optimizations
  - Canny edge detection with hysteresis thresholding  
  - Gradient calculations using Sobel operators
  - Non-maximum suppression for edge thinning
  - Morphological operations (dilation/erosion)

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

Please ensure your code follows the existing style.

## 💖 Sponsors

<p align="center">
  <strong>Special thanks to our amazing sponsors who make this project possible!</strong>
</p>

<div align="center">

### 🏆 Gold Sponsors

<table>
  <tr>
    <td align="center" width="300">
      <a href="https://zeugnisprofi.com" target="_blank">
        <img src="https://via.placeholder.com/200x80/4A90E2/FFFFFF?text=ZeugnisProfi" alt="ZeugnisProfi" width="200"/>
        <br/>
        <strong>ZeugnisProfi</strong>
      </a>
      <br/>
      <em>Professional certificate and document services</em>
    </td>
    <td align="center" width="300">
      <a href="https://zeugnisprofi.de" target="_blank">
        <img src="https://via.placeholder.com/200x80/50C878/FFFFFF?text=ZeugnisProfi.de" alt="ZeugnisProfi.de" width="200"/>
        <br/>
        <strong>ZeugnisProfi.de</strong>
      </a>
      <br/>
      <em>German document processing specialists</em>
    </td>
    <td align="center" width="250">
      <a href="https://www.verlingo.de" target="_blank">
        <img src="https://via.placeholder.com/180x70/FF6B35/FFFFFF?text=Verlingo" alt="Verlingo" width="180"/>
        <br/>
        <strong>Verlingo</strong>
      </a>
      <br/>
      <em>Language and translation services</em>
    </td>
  </tr>
</table>

</div>

## Roadmap

- [ ] Performance optimizations to match OpenCV speed
- [ ] Enhanced WASM module with additional Rust-optimized algorithms
- [ ] SIMD vectorization for more image processing operations
- [ ] TypeScript definitions
- [ ] Additional image enhancement filters
- [ ] Mobile-optimized processing
- [ ] WebGPU acceleration for supported browsers

## License

MIT License © [marquaye](https://github.com/marquaye)

