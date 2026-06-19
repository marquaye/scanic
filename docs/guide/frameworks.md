# React & Vue

Scanic is framework-agnostic — it works with plain DOM, so it drops into any UI
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
across renders so WASM is initialized only once.

::: code-group

```jsx [React]
import { useRef, useState, useEffect } from 'react'
import { Scanner } from 'scanic'

export function LiveScanner() {
  const canvasRef = useRef(null)
  const scannerRef = useRef(new Scanner())
  const stateRef = useRef({ stream: null, video: null, raf: 0, running: false })
  const [scanning, setScanning] = useState(false)

  const start = async () => {
    await scannerRef.current.initialize()
    const s = stateRef.current
    s.stream = await navigator.mediaDevices.getUserMedia({ video: true })
    s.video = Object.assign(document.createElement('video'), {
      srcObject: s.stream, autoplay: true, muted: true,
    })
    await new Promise((r) => (s.video.onloadedmetadata = r))
    canvasRef.current.width = s.video.videoWidth
    canvasRef.current.height = s.video.videoHeight
    s.running = true
    setScanning(true)
    loop()
  }

  const loop = async () => {
    const s = stateRef.current
    if (!s.running) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.drawImage(s.video, 0, 0, canvasRef.current.width, canvasRef.current.height)

    if (Math.random() < 0.3) {
      const frame = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
      const result = await scannerRef.current.scan(frame, { mode: 'detect' })
      if (result.success) drawQuad(ctx, result.corners)
    }
    s.raf = requestAnimationFrame(loop)
  }

  const stop = () => {
    const s = stateRef.current
    s.running = false
    cancelAnimationFrame(s.raf)
    s.stream?.getTracks().forEach((t) => t.stop())
    setScanning(false)
  }

  useEffect(() => stop, [])

  return (
    <div>
      <button onClick={start} disabled={scanning}>Start</button>
      <button onClick={stop} disabled={!scanning}>Stop</button>
      <canvas ref={canvasRef} />
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

const scanner = new Scanner()
const canvas = ref(null)
const scanning = ref(false)
let stream = null, video = null, raf = 0, running = false

const start = async () => {
  await scanner.initialize()
  stream = await navigator.mediaDevices.getUserMedia({ video: true })
  video = Object.assign(document.createElement('video'), {
    srcObject: stream, autoplay: true, muted: true,
  })
  await new Promise((r) => (video.onloadedmetadata = r))
  canvas.value.width = video.videoWidth
  canvas.value.height = video.videoHeight
  running = true
  scanning.value = true
  loop()
}

const loop = async () => {
  if (!running) return
  const ctx = canvas.value.getContext('2d')
  ctx.drawImage(video, 0, 0, canvas.value.width, canvas.value.height)
  if (Math.random() < 0.3) {
    const frame = ctx.getImageData(0, 0, canvas.value.width, canvas.value.height)
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
  raf = requestAnimationFrame(loop)
}

const stop = () => {
  running = false
  cancelAnimationFrame(raf)
  stream?.getTracks().forEach((t) => t.stop())
  scanning.value = false
}

onUnmounted(stop)
</script>

<template>
  <div>
    <button @click="start" :disabled="scanning">Start</button>
    <button @click="stop" :disabled="!scanning">Stop</button>
    <canvas ref="canvas" />
  </div>
</template>
```

:::

::: tip
Want users to fine-tune detected corners before capture? Drop in the
[Corner Editor](/guide/corner-editor) — it works in any framework.
:::
