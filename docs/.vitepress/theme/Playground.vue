<script setup>
import { ref, shallowRef, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'

// Bundled sample images (committed under docs/public/samples).
const samples = [
  { label: 'Document', src: withBase('/samples/document.jpg') },
  { label: 'Page', src: withBase('/samples/page.jpg') },
  { label: 'Photo', src: withBase('/samples/photo.png') }
]

// The library is imported lazily (client-only) so VitePress SSR never touches
// browser-only APIs (Canvas, WebAssembly). We import the local source directly
// so the playground always reflects the current working tree.
const scanic = shallowRef(null)

const ready = ref(false)
const busy = ref(false)
const dragging = ref(false)
const error = ref('')

const mode = ref('extract') // 'detect' | 'extract'
const detector = ref('classical') // 'classical' | 'ml'
const maxDim = ref(800)
const mlReady = ref(false) // true once the ML model has been fetched once

const sourceCanvas = ref(null) // original image + detection overlay
const resultCanvas = ref(null) // extracted document (extract mode)
const editorHost = ref(null) // mount point for the corner editor
const status = ref('') // human-readable result line
const timeMs = ref(null)
const dimensions = ref('')

const hasCorners = ref(false) // a detection succeeded, corners available
const editing = ref(false) // corner editor is open

let currentImage = null
let currentCorners = null
let activeEditor = null

onMounted(async () => {
  // Dynamic import keeps this out of the server bundle.
  scanic.value = await import('../../../src/index.js')
  ready.value = true
})

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

function onSelect(e) {
  const file = e.target.files?.[0]
  if (file) loadFile(file)
}

function loadFile(file) {
  if (!file.type.startsWith('image/')) {
    error.value = 'Please choose an image file.'
    return
  }
  loadImageSrc(URL.createObjectURL(file), true)
}

function loadSample(src) {
  // crossOrigin so the canvas stays untainted (samples are same-origin anyway)
  loadImageSrc(src, false, true)
}

function loadImageSrc(url, revoke, crossOrigin = false) {
  error.value = ''
  const img = new Image()
  if (crossOrigin) img.crossOrigin = 'anonymous'
  img.onload = () => {
    if (revoke) URL.revokeObjectURL(url)
    currentImage = img
    dimensions.value = `${img.naturalWidth} × ${img.naturalHeight}px`
    drawSource(img, null)
    runScan()
  }
  img.onerror = () => {
    if (revoke) URL.revokeObjectURL(url)
    error.value = 'Could not load that image.'
  }
  img.src = url
}

// Draw the source image (scaled to fit) and, if provided, a corner overlay.
function drawSource(img, corners) {
  const canvas = sourceCanvas.value
  if (!canvas) return
  const maxW = 520
  const scale = Math.min(1, maxW / img.naturalWidth)
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  if (corners) {
    const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
      .map(p => ({ x: p.x * scale, y: p.y * scale }))
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y))
    ctx.closePath()
    ctx.fillStyle = 'rgba(99, 102, 241, 0.15)'
    ctx.fill()
    ctx.lineWidth = 3
    ctx.strokeStyle = '#6366f1'
    ctx.stroke()
    ctx.fillStyle = '#6366f1'
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

async function runScan() {
  if (!currentImage || !scanic.value) return
  closeEditor()
  busy.value = true
  error.value = ''
  status.value = ''
  timeMs.value = null

  try {
    const t0 = performance.now()
    const opts = {
      mode: mode.value,
      output: 'canvas',
      maxProcessingDimension: Number(maxDim.value)
    }
    if (detector.value === 'ml') opts.detector = 'ml'
    const result = await scanic.value.scanDocument(currentImage, opts)
    timeMs.value = Math.round(performance.now() - t0)
    if (detector.value === 'ml') mlReady.value = true

    if (!result.success) {
      status.value = result.message || 'No document detected.'
      currentCorners = null
      hasCorners.value = false
      drawSource(currentImage, null)
      clearResult()
      return
    }

    currentCorners = result.corners
    hasCorners.value = true
    drawSource(currentImage, result.corners)
    const scoreStr = result.score != null
      ? ` · score ${(result.score * 100).toFixed(0)}%`
      : result.confidence != null
        ? ` · confidence ${(result.confidence * 100).toFixed(0)}%`
        : ''
    status.value = `Document detected${scoreStr}`

    if (mode.value === 'extract' && result.output) {
      drawResult(result.output)
    } else {
      clearResult()
    }
  } catch (err) {
    error.value = err?.message || String(err)
  } finally {
    busy.value = false
  }
}

// ── Corner editor ──────────────────────────────────────────────────────────
function startEditing() {
  if (!currentImage || !currentCorners || !scanic.value) return
  editing.value = true
  // Wait for the host element to render before mounting the editor.
  requestAnimationFrame(() => {
    if (!editorHost.value) return
    activeEditor = scanic.value.createCornerEditor({
      container: editorHost.value,
      image: currentImage,
      corners: currentCorners,
      magnifier: { enabled: true, zoom: 2, size: 120 },
      nudges: { enabled: true, steps: [1] },
      toolbar: { labels: { apply: 'Apply & extract' } },
      onConfirm: (corners) => applyCorners(corners),
      onCancel: () => closeEditor()
    })
  })
}

async function applyCorners(corners) {
  currentCorners = corners
  closeEditor()
  drawSource(currentImage, corners)
  busy.value = true
  error.value = ''
  try {
    const result = await scanic.value.extractDocument(currentImage, corners, { output: 'canvas' })
    if (result.success && result.output) {
      drawResult(result.output)
      status.value = 'Document extracted with your adjusted corners'
    } else {
      error.value = result.message || 'Extraction failed.'
    }
  } catch (err) {
    error.value = err?.message || String(err)
  } finally {
    busy.value = false
  }
}

function closeEditor() {
  if (activeEditor) {
    activeEditor.destroy()
    activeEditor = null
  }
  editing.value = false
}

function drawResult(outputCanvas) {
  const canvas = resultCanvas.value
  if (!canvas) return
  const maxW = 520
  const scale = Math.min(1, maxW / outputCanvas.width)
  canvas.width = Math.round(outputCanvas.width * scale)
  canvas.height = Math.round(outputCanvas.height * scale)
  canvas.getContext('2d').drawImage(outputCanvas, 0, 0, canvas.width, canvas.height)
}

function clearResult() {
  const canvas = resultCanvas.value
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
}

function download() {
  const canvas = resultCanvas.value
  if (!canvas || !canvas.width) return
  const link = document.createElement('a')
  link.download = 'scanic-document.png'
  link.href = canvas.toDataURL('image/png')
  link.click()
}

onUnmounted(() => closeEditor())
</script>

<template>
  <ClientOnly>
    <div class="pg">
      <div
        class="pg-drop"
        :class="{ 'pg-drop--active': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <input id="pg-file" type="file" accept="image/*" class="pg-file" @change="onSelect" />
        <label for="pg-file" class="pg-label">
          <strong>Drop an image here</strong> or click to upload
          <span class="pg-hint">A photo of a receipt, page, or card works great.</span>
        </label>
      </div>

      <div class="pg-samples">
        <span class="pg-samples-label">Or try a sample:</span>
        <button
          v-for="s in samples"
          :key="s.src"
          type="button"
          class="pg-sample"
          @click="loadSample(s.src)"
        >
          <img :src="s.src" :alt="s.label" loading="lazy" />
          <span>{{ s.label }}</span>
        </button>
      </div>

      <div class="pg-controls">
        <label>
          Mode
          <select v-model="mode" @change="runScan">
            <option value="extract">Extract (crop &amp; flatten)</option>
            <option value="detect">Detect (outline only)</option>
          </select>
        </label>
        <label>
          Detector
          <select v-model="detector" @change="runScan">
            <option value="classical">Classical (default)</option>
            <option value="ml">ML (neural)</option>
          </select>
        </label>
        <label>
          Max dimension
          <select v-model="maxDim" @change="runScan">
            <option :value="600">600px (fastest)</option>
            <option :value="800">800px (default)</option>
            <option :value="1200">1200px (sharper)</option>
          </select>
        </label>
        <span v-if="!ready" class="pg-loading">Loading engine…</span>
        <span v-else-if="busy && detector === 'ml' && !mlReady" class="pg-loading">Loading ML model (~2 MB)…</span>
        <span v-else-if="busy" class="pg-loading">Scanning…</span>
      </div>

      <p v-if="error" class="pg-error">⚠️ {{ error }}</p>

      <div class="pg-panes">
        <figure class="pg-pane">
          <figcaption>
            <span>{{ editing ? 'Drag the corners' : 'Source' }}{{ dimensions ? ` · ${dimensions}` : '' }}</span>
            <button
              v-if="hasCorners && !editing"
              class="pg-dl"
              @click="startEditing"
            >Adjust corners</button>
          </figcaption>

          <!-- Detection view -->
          <canvas v-show="!editing" ref="sourceCanvas" class="pg-canvas"></canvas>

          <!-- Corner editor (ships its own Reset / Cancel / Apply toolbar) -->
          <div v-show="editing" ref="editorHost" class="pg-editor"></div>
        </figure>

        <figure class="pg-pane" v-show="mode === 'extract' || editing">
          <figcaption>
            Result
            <button v-if="resultCanvas && resultCanvas.width" class="pg-dl" @click="download">Download</button>
          </figcaption>
          <canvas ref="resultCanvas" class="pg-canvas"></canvas>
        </figure>
      </div>

      <p v-if="status || timeMs != null" class="pg-status">
        <span v-if="status">{{ status }}</span>
        <span v-if="timeMs != null" class="pg-time">· {{ timeMs }}ms</span>
      </p>
    </div>
  </ClientOnly>
</template>

<style scoped>
.pg {
  margin: 1.5rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 1.25rem;
  background: var(--vp-c-bg-soft);
}
.pg-drop {
  position: relative;
  border: 2px dashed var(--vp-c-divider);
  border-radius: 10px;
  padding: 1.5rem;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;
}
.pg-drop--active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}
.pg-file {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.pg-label {
  cursor: pointer;
  display: block;
}
.pg-hint {
  display: block;
  font-size: 0.85em;
  color: var(--vp-c-text-2);
  margin-top: 0.35rem;
}
.pg-samples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-top: 1rem;
}
.pg-samples-label {
  font-size: 0.85em;
  color: var(--vp-c-text-2);
}
.pg-sample {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: var(--vp-c-bg);
  transition: border-color 0.2s, transform 0.1s;
}
.pg-sample:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-1px);
}
.pg-sample img {
  width: 72px;
  height: 54px;
  object-fit: cover;
  display: block;
}
.pg-sample span {
  font-size: 0.72em;
  color: var(--vp-c-text-2);
  padding-bottom: 0.25rem;
}
.pg-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
  font-size: 0.9em;
}
.pg-controls label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-weight: 600;
}
.pg-controls select {
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 400;
}
.pg-loading {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.pg-error {
  color: var(--vp-c-danger-1, #ef4444);
}
.pg-panes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
.pg-pane {
  margin: 0;
}
.pg-pane figcaption {
  font-size: 0.8em;
  color: var(--vp-c-text-2);
  margin-bottom: 0.4rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pg-canvas {
  width: 100%;
  height: auto;
  border-radius: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
}
.pg-dl {
  font-size: 0.85em;
  color: var(--vp-c-brand-1);
  font-weight: 600;
  cursor: pointer;
}
.pg-editor {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  touch-action: none;
}
.pg-status {
  margin-top: 1rem;
  font-weight: 600;
}
.pg-time {
  color: var(--vp-c-text-2);
  font-weight: 400;
}
</style>
