# React & Vue

Scanic is framework-agnostic. It works with plain DOM, so it drops into any UI
library. Below are idiomatic starting points for React and Vue. The pattern is
always the same: turn a file into an `HTMLImageElement`, pass it to
`scanDocument`, and render `result.output`.

## Upload & scan

::: code-group

```jsx [React]
import { useState } from 'react'
import { scanDocument } from 'scanic'

export function DocumentScanner() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [output, setOutput] = useState(null)

  const onFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const img = new Image()
    img.onload = async () => {
      setBusy(true)
      setError(null)
      try {
        const result = await scanDocument(img, { mode: 'extract', output: 'dataurl' })
        if (result.success) setOutput(result.output)
        else setError('No document detected')
      } catch (err) {
        setError(err.message)
      } finally {
        setBusy(false)
      }
    }
    img.src = URL.createObjectURL(file)
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
      {busy && <p>Scanning…</p>}
      {error && <p>{error}</p>}
      {output && <img src={output} alt="Scanned document" />}
    </div>
  )
}
```

```vue [Vue]
<script setup>
import { ref } from 'vue'
import { scanDocument } from 'scanic'

const busy = ref(false)
const error = ref(null)
const output = ref(null)

const onFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const img = new Image()
  img.onload = async () => {
    busy.value = true
    error.value = null
    try {
      const result = await scanDocument(img, { mode: 'extract', output: 'dataurl' })
      if (result.success) output.value = result.output
      else error.value = 'No document detected'
    } catch (err) {
      error.value = err.message
    } finally {
      busy.value = false
    }
  }
  img.src = URL.createObjectURL(file)
}
</script>

<template>
  <div>
    <input type="file" accept="image/*" @change="onFile" :disabled="busy" />
    <p v-if="busy">Scanning…</p>
    <p v-if="error">{{ error }}</p>
    <img v-if="output" :src="output" alt="Scanned document" />
  </div>
</template>
```

:::

## Live camera scanning

For webcam capture, hold a single [`Scanner`](/api/reference#scanner) instance
across renders so WASM is initialized only once. The `<video>` is the preview,
a transparent canvas on top holds the overlay, and detection runs about 10
times per second instead of on every animation frame. See
[Real-time scanning](/guide/web#real-time-scanning) for why that matters on
phones.

::: code-group

```jsx [React]
import { useRef, useState, useEffect } from 'react'
import { Scanner } from 'scanic'

const DETECT_INTERVAL_MS = 100 // about 10 detections per second

export function LiveScanner() {
  const videoRef = useRef(null)
  const overlayRef = useRef(null)
  const scannerRef = useRef(new Scanner())
  const stateRef = useRef({ stream: null, timer: 0, running: false })
  const [scanning, setScanning] = useState(false)

  const start = async () => {
    await scannerRef.current.initialize()
    const s = stateRef.current
    const video = videoRef.current
    s.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
    })
    video.srcObject = s.stream
    await video.play()
    // Corners come back in video pixels, so the overlay uses the same size.
    overlayRef.current.width = video.videoWidth
    overlayRef.current.height = video.videoHeight
    s.running = true
    setScanning(true)
    detectLoop()
  }

  const detectLoop = async () => {
    const s = stateRef.current
    if (!s.running) return
    const started = performance.now()

    if (!document.hidden) {
      // Pass the video directly, no getImageData() copy per frame.
      const result = await scannerRef.current.scan(videoRef.current, { mode: 'detect' })
      if (!s.running) return
      const ctx = overlayRef.current.getContext('2d')
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height)
      if (result.success) drawQuad(ctx, result.corners)
    }

    const elapsed = performance.now() - started
    s.timer = setTimeout(detectLoop, Math.max(0, DETECT_INTERVAL_MS - elapsed))
  }

  const stop = () => {
    const s = stateRef.current
    s.running = false
    clearTimeout(s.timer)
    s.stream?.getTracks().forEach((t) => t.stop())
    setScanning(false)
  }

  useEffect(() => stop, [])

  return (
    <div>
      <button onClick={start} disabled={scanning}>Start</button>
      <button onClick={stop} disabled={!scanning}>Stop</button>
      <div style={{ position: 'relative' }}>
        <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block' }} />
        <canvas
          ref={overlayRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />
      </div>
    </div>
  )
}

function drawQuad(ctx, c) {
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
```

```vue [Vue]
<script setup>
import { ref, onUnmounted } from 'vue'
import { Scanner } from 'scanic'

const DETECT_INTERVAL_MS = 100 // about 10 detections per second

const scanner = new Scanner()
const video = ref(null)
const overlay = ref(null)
const scanning = ref(false)
let stream = null, timer = 0, running = false

const start = async () => {
  await scanner.initialize()
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
  })
  video.value.srcObject = stream
  await video.value.play()
  // Corners come back in video pixels, so the overlay uses the same size.
  overlay.value.width = video.value.videoWidth
  overlay.value.height = video.value.videoHeight
  running = true
  scanning.value = true
  detectLoop()
}

const detectLoop = async () => {
  if (!running) return
  const started = performance.now()

  if (!document.hidden) {
    // Pass the video directly, no getImageData() copy per frame.
    const result = await scanner.scan(video.value, { mode: 'detect' })
    if (!running) return
    const ctx = overlay.value.getContext('2d')
    ctx.clearRect(0, 0, overlay.value.width, overlay.value.height)
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

  const elapsed = performance.now() - started
  timer = setTimeout(detectLoop, Math.max(0, DETECT_INTERVAL_MS - elapsed))
}

const stop = () => {
  running = false
  clearTimeout(timer)
  stream?.getTracks().forEach((t) => t.stop())
  scanning.value = false
}

onUnmounted(stop)
</script>

<template>
  <div>
    <button @click="start" :disabled="scanning">Start</button>
    <button @click="stop" :disabled="!scanning">Stop</button>
    <div style="position: relative">
      <video ref="video" playsinline muted style="width: 100%; display: block" />
      <canvas ref="overlay" style="position: absolute; inset: 0; width: 100%; height: 100%" />
    </div>
  </div>
</template>
```

:::

::: tip
Want users to fine-tune detected corners before capture? Drop in the
[Corner Editor](/guide/corner-editor), it works in any framework.
:::
