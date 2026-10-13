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
// Canvas element (default), easiest to display
const a = await scanDocument(img, { mode: 'extract', output: 'canvas' })
document.body.appendChild(a.output)

// Data URL, easy to download or set as <img src>
const b = await scanDocument(img, { mode: 'extract', output: 'dataurl' })
const link = Object.assign(document.createElement('a'), {
  href: b.output, download: 'scan.png'
})
link.click()

// Raw ImageData, for further pixel processing
const c = await scanDocument(img, { mode: 'extract', output: 'imagedata' })
```

## Detect only

If you just want the corners (for example, to draw an overlay), use `detect`
mode. It skips the warp and is faster:

```js
const result = await scanDocument(img, { mode: 'detect' })
if (result.success) {
  const { topLeft, topRight, bottomRight, bottomLeft } = result.corners
  // draw your overlay…
}
```

## Real-time scanning

For a live camera view, use the [`Scanner`](/api/reference#scanner) class. It
keeps a persistent WebAssembly instance alive so you don't pay the warm-up cost
on every frame.

Show the `<video>` itself as the preview and put a transparent canvas on top
for the overlay. The browser plays the video at full frame rate at almost no
cost, while detection runs about 10 times per second. That is plenty for a
steady overlay and leaves the CPU idle most of the time, which is what saves
battery on phones.

```html
<div style="position: relative">
  <video id="video" playsinline muted style="width: 100%; display: block"></video>
  <canvas id="overlay" style="position: absolute; inset: 0; width: 100%; height: 100%"></canvas>
</div>
```

```js
import { Scanner } from 'scanic'

const DETECT_INTERVAL_MS = 100 // about 10 detections per second

const scanner = new Scanner()
await scanner.initialize() // pre-load WASM once

const video = document.querySelector('#video')
const overlay = document.querySelector('#overlay')
const ctx = overlay.getContext('2d')

video.srcObject = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
})
await video.play()
overlay.width = video.videoWidth // corners come back in video pixels
overlay.height = video.videoHeight

let running = true

async function detectLoop() {
  if (!running) return
  const started = performance.now()

  // Nothing to show while the tab is hidden, so skip the work.
  if (!document.hidden) {
    // Pass the video directly. Calling getImageData() first would copy every
    // frame at full resolution for nothing.
    const result = await scanner.scan(video, { mode: 'detect' })

    ctx.clearRect(0, 0, overlay.width, overlay.height)
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

  // Wait out the rest of the interval. A slow device simply gets fewer
  // detections per second instead of a growing backlog.
  const elapsed = performance.now() - started
  setTimeout(detectLoop, Math.max(0, DETECT_INTERVAL_MS - elapsed))
}

detectLoop()

// When the user taps "capture":
async function capture() {
  running = false
  const result = await scanner.scan(video, { mode: 'extract' })
  video.srcObject.getTracks().forEach((t) => t.stop())
  return result.output
}
```

::: tip Performance
- Run detection about 8 to 10 times per second, not on every animation frame.
  `requestAnimationFrame` fires 60 to 120 times per second on modern phones.
- Pass the `<video>` (or a canvas) directly. `scan()` accepts images, canvases,
  videos, `ImageBitmap`, `VideoFrame` and `ImageData`.
- Only `extract` when the user captures.
- Keep [`maxProcessingDimension`](/api/reference#options) low (600 to 800) for
  live preview.
- Reuse a single `Scanner` instance for the whole session, and stop the camera
  tracks when you are done. A running camera costs battery on its own.
:::

## In a Web Worker

Detection and extraction also run inside a Web Worker, which keeps the main
thread free for the UI. Send a frame over as an `ImageBitmap`; the worker gets
an `OffscreenCanvas` back for `output: 'canvas'`, or use `'imagedata'`.
Workers need `OffscreenCanvas` (Chrome 69+, Firefox 105+, Safari 16.4+); on
older browsers keep scanning on the main thread.

```js
// main.js
const worker = new Worker(new URL('./scan-worker.js', import.meta.url), { type: 'module' })
const frame = await createImageBitmap(video)
worker.postMessage(frame, [frame])
worker.onmessage = (e) => console.log(e.data.corners)
```

```js
// scan-worker.js
import { Scanner } from 'scanic'

const scanner = new Scanner()

self.onmessage = async (e) => {
  const frame = e.data
  const result = await scanner.scan(frame, { mode: 'detect' })
  frame.close()
  self.postMessage({ success: result.success, corners: result.corners })
}
```

## Let users adjust corners

Detection is good, but sometimes a user wants to nudge a corner. Scanic ships a
touch-friendly [Corner Editor](/guide/corner-editor) for exactly this.
