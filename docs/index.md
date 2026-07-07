---
layout: home

hero:
  name: Scanic
  text: Document scanning for the modern Web
  tagline: Professional-grade edge detection and perspective correction in the browser and Node.js, powered by Rust/WebAssembly. Under 100KB, ~10ms transforms.
  image:
    src: /scanic-logo-bg.png
    alt: Scanic
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Live Demo
      link: /demo/
      target: _blank
    - theme: alt
      text: View on GitHub
      link: https://github.com/marquaye/scanic

features:
  - icon: ⚡
    title: Near-native speed
    details: Rust/WASM handles the CPU-heavy edge detection; a fast bilinear inverse-map warp does perspective correction in under 10ms.
  - icon: 📦
    title: Featherweight
    details: Under 100KB gzipped, versus 30MB+ for OpenCV.js. The WASM is inlined, so there are no extra files to host or fetch.
  - icon: 🎯
    title: Accurate detection
    details: Robust document contour detection with an adaptive multi-pass cascade that holds up even in low-contrast, noisy photos.
  - icon: 🛠️
    title: Modern API
    details: Clean, promise-based API with full TypeScript support. One call to detect, one call to extract.
  - icon: 🌐
    title: Runs everywhere
    details: Browser, Node.js, and Electron. A pure-JS fallback keeps it working even where WASM can't run.
  - icon: 🤚
    title: Manual corner editor
    details: A built-in, touch-friendly corner editor lets users fine-tune detected corners before extraction.
---

## Quick start

::: code-group

```sh [npm]
npm install scanic
```

```sh [pnpm]
pnpm add scanic
```

```sh [yarn]
yarn add scanic
```

```sh [bun]
bun add scanic
```

:::

```js
import { scanDocument } from 'scanic'

// Detect the document and get a perspective-corrected crop
const result = await scanDocument(imageElement, { mode: 'extract' })

if (result.success) {
  document.body.appendChild(result.output) // a <canvas> with the flattened page
}
```

[**Read the Getting Started guide →**](/guide/getting-started)
