# What is Scanic?

Scanic is a high-performance document scanner library for JavaScript. It finds
the edges of a document in a photo, then straightens and crops it into a clean,
flat image, the same "scan from a photo" experience you get in mobile scanner
apps, but running entirely in the browser or in Node.js.

It combines **Rust-powered WebAssembly** for the pixel-crunching parts (blur,
edge detection, morphology) with a **fast bilinear inverse-map warp** for
perspective correction, giving near-native performance in a tiny package.

## Why Scanic?

Web document scanning has traditionally forced a trade-off:

- **OpenCV.js** is powerful but ships a **30MB+** download.
- **Pure JS** libraries are lightweight but struggle with real-time performance and complex transforms.

Scanic bridges the gap:

| | Scanic | jscanify | OpenCV.js |
| :--- | :--- | :--- | :--- |
| **Download size** | **~100KB** | ~31MB | ~30MB |
| **Perspective speed** | **~10ms** | ~200ms | ~5ms |
| **WASM optimized** | ✅ | ❌ | ✅ |
| **GPU acceleration** | ✅ | ❌ | ❌ |
| **TypeScript** | ✅ | ❌ | ✅ |

## What you can build

- **Receipt / document capture** in web forms: upload a photo, get a clean scan.
- **Real-time webcam scanning** with live edge overlays (see the [`Scanner`](/guide/web#real-time-scanning) class).
- **Server-side batch processing** of uploaded images in [Node.js](/guide/nodejs).
- **Desktop apps** via [Electron](/guide/electron).

## Next steps

- [Getting Started](/guide/getting-started): install and run your first scan, with a live playground.
- [How It Works](/guide/how-it-works): a short tour of the detection pipeline.
- [API Reference](/api/reference): every function and option.
