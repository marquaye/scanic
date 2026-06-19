# Browser / Web

Scanic is framework-agnostic and runs in any modern browser. This guide covers
the common browser workflows. For React and Vue, see
[React & Vue](/guide/frameworks).

## From an `<img>` or file upload

```js
import { scanDocument } from 'scanic'

async function scan(img) {
  const result = await scanDocument(img, { mode: 'extract', output: 'canvas' })
  if (result.success) {
    document.querySelector('#output').appendChild(result.output)
  }
}
```

```js
// File input → Image → scan
document.querySelector('#file').addEventListener('change', (e) => {
  const img = new Image()
  img.onload = () => scan(img)
  img.src = URL.createObjectURL(e.target.files[0])
})
```

## Output formats

Choose what `extract` returns with the [`output`](/api/reference#options) option:

```js
// Canvas element (default) — easiest to display
const a = await scanDocument(img, { mode: 'extract', output: 'canvas' })
document.body.appendChild(a.output)

// Data URL — easy to download or set as <img src>
const b = await scanDocument(img, { mode: 'extract', output: 'dataurl' })
const link = Object.assign(document.createElement('a'), {
  href: b.output, download: 'scan.png'
})
link.click()

// Raw ImageData — for further pixel processing
const c = await scanDocument(img, { mode: 'extract', output: 'imagedata' })
```

## Detect only

If you just want the corners (for example, to draw an overlay), use `detect`
mode — it skips the warp and is faster:

```js
const result = await scanDocument(img, { mode: 'detect' })
if (result.success) {
  const { topLeft, topRight, bottomRight, bottomLeft } = result.corners
  // draw your overlay…
}
```

## Real-time scanning

For webcams and batch processing, use the [`Scanner`](/api/reference#scanner)
class. It keeps a persistent WebAssembly instance alive so you don't pay the
warm-up cost on every frame.

```js
import { Scanner } from 'scanic'

const scanner = new Scanner()
await scanner.initialize() // pre-load WASM once

const video = document.querySelector('video')
const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

async function loop() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

  // Detect on a fraction of frames to keep the UI smooth
  if (Math.random() < 0.3) {
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const result = await scanner.scan(frame, { mode: 'detect' })

    if (result.success) {
      const c = result.corners
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(c.topLeft.x, c.topLeft.y)
      ctx.lineTo(c.topRight.x, c.topRight.y)
      ctx.lineTo(c.bottomRight.x, c.bottomRight.y)
      ctx.lineTo(c.bottomLeft.x, c.bottomLeft.y)
      ctx.closePath()
      ctx.stroke()
    }
  }
  requestAnimationFrame(loop)
}
```

::: tip Performance
- Detect on a subset of frames (as above), and only `extract` when the user captures.
- Keep [`maxProcessingDimension`](/api/reference#options) low (600–800) for live preview.
- Reuse a single `Scanner` instance for the whole session.
:::

## Let users adjust corners

Detection is good, but sometimes a user wants to nudge a corner. Scanic ships a
touch-friendly [Corner Editor](/guide/corner-editor) for exactly this.
