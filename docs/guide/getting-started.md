# Getting Started

## Installation

Install Scanic with your package manager of choice:

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

### CDN (no build step)

Drop it straight into a page via an import map or a module script:

```html
<script type="module">
  import { scanDocument } from 'https://unpkg.com/scanic/dist/scanic.js'
  // ...
</script>
```

::: tip No extra files to host
Scanic's WebAssembly module is **inlined as base64** inside the bundle. There is
no separate `.wasm` file to copy, configure, or serve — it just works with any
bundler (Vite, webpack, Rollup, esbuild) and on CDNs.
:::

## Your first scan

The simplest workflow is a single call to `scanDocument`. Pass it an image and
ask for `extract` mode to get back a perspective-corrected crop:

```js
import { scanDocument } from 'scanic'

const img = document.querySelector('#myImage') // HTMLImageElement

const result = await scanDocument(img, { mode: 'extract', output: 'canvas' })

if (result.success) {
  // result.output is a <canvas> with the flattened, cropped document
  document.body.appendChild(result.output)

  // result.corners holds the detected corner coordinates
  console.log(result.corners)
} else {
  console.warn('No document found:', result.message)
}
```

Scanic accepts an `HTMLImageElement`, an `HTMLCanvasElement`, or an `ImageData`
as its input, and can return the result as a `canvas`, `imagedata`, or
`dataurl` (see [`output`](/api/reference#options)).

### From a file input

```js
import { scanDocument } from 'scanic'

document.querySelector('#file').addEventListener('change', (e) => {
  const file = e.target.files[0]
  const img = new Image()
  img.onload = async () => {
    const result = await scanDocument(img, { mode: 'extract' })
    if (result.success) document.body.appendChild(result.output)
  }
  img.src = URL.createObjectURL(file)
})
```

## Try it live {#playground}

Upload a photo of a document (or pick a sample) below — Scanic runs entirely in
your browser and shows the detected corners plus the extracted result. Not happy
with the detection? Click **Adjust corners** to open the built-in
[corner editor](/guide/corner-editor) and drag them into place.

<Playground />

## Where to next?

- [How It Works](/guide/how-it-works) — understand the pipeline.
- [Browser / Web guide](/guide/web) — real-time webcam scanning with the `Scanner` class.
- [Node.js guide](/guide/nodejs) — run Scanic on the server.
- [API Reference](/api/reference) — all options and return values.
