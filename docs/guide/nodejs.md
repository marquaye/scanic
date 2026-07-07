# Node.js

Scanic runs on the server too. Because it relies on the Canvas API and a few DOM
globals, you provide a canvas implementation ([`canvas`](https://www.npmjs.com/package/canvas),
aka node-canvas) and a DOM environment ([`jsdom`](https://www.npmjs.com/package/jsdom)).

## Install

::: code-group

```sh [npm]
npm install scanic canvas jsdom
```

```sh [pnpm]
pnpm add scanic canvas jsdom
```

```sh [yarn]
yarn add scanic canvas jsdom
```

:::

## Setup & scan

Wire up the globals Scanic expects, then call it as usual:

```js
import { scanDocument } from 'scanic'
import { loadImage } from 'canvas'
import { JSDOM } from 'jsdom'

// Provide a minimal DOM environment
const dom = new JSDOM()
global.document = dom.window.document
global.ImageData = dom.window.ImageData

const img = await loadImage('document.jpg')
const result = await scanDocument(img, { mode: 'extract', output: 'imagedata' })

if (result.success) {
  console.log('Corners:', result.corners)
  // result.output is ImageData; draw it onto a node-canvas to save it
}
```

## Saving the result to a file

Use `output: 'canvas'`-style data by drawing the returned `ImageData` onto a
node-canvas and writing a PNG:

```js
import { createCanvas } from 'canvas'
import { writeFileSync } from 'node:fs'

const out = result.output // ImageData
const canvas = createCanvas(out.width, out.height)
canvas.getContext('2d').putImageData(out, 0, 0)
writeFileSync('scanned.png', canvas.toBuffer('image/png'))
```

::: tip Reuse a Scanner for batches
Processing many files? Create one [`Scanner`](/api/reference#scanner) and call
`scanner.scan()` per image so the WASM module is initialized only once.
:::

::: info WASM in Node
Scanic's WASM is inlined and decoded with `Buffer` when no global `atob` is
available, so it works in Node without any extra configuration. If the runtime
can't run it, Scanic falls back to pure JavaScript automatically.
:::
