function cloneCorners(corners) {
  return {
    topLeft: { x: corners.topLeft.x, y: corners.topLeft.y },
    topRight: { x: corners.topRight.x, y: corners.topRight.y },
    bottomRight: { x: corners.bottomRight.x, y: corners.bottomRight.y },
    bottomLeft: { x: corners.bottomLeft.x, y: corners.bottomLeft.y }
  };
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cornersAreFiniteAndDistinct(corners, minDistance = 4) {
  const points = [corners?.topLeft, corners?.topRight, corners?.bottomRight, corners?.bottomLeft];
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return false;
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (pointDistance(points[i], points[j]) < minDistance) {
        return false;
      }
    }
  }

  return true;
}

function isConvexQuadrilateral(corners) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const crossSigns = [];

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
    if (Math.abs(cross) < 1e-6) continue;
    crossSigns.push(Math.sign(cross));
  }

  if (crossSigns.length < 3) {
    return false;
  }

  const firstSign = crossSigns[0];
  return crossSigns.every((s) => s === firstSign);
}

function createDefaultCorners(imageWidth, imageHeight, insetRatio = 0.08) {
  const inset = Math.max(8, Math.min(imageWidth, imageHeight) * insetRatio);
  return {
    topLeft: { x: inset, y: inset },
    topRight: { x: imageWidth - inset, y: inset },
    bottomRight: { x: imageWidth - inset, y: imageHeight - inset },
    bottomLeft: { x: inset, y: imageHeight - inset }
  };
}

function normalizeImageToCanvas(image) {
  if (!image) {
    throw new Error('No image provided');
  }

  const isImageData = image && typeof image.width === 'number' && typeof image.height === 'number' && image.data;
  let width = 0;
  let height = 0;

  if (isImageData) {
    width = image.width;
    height = image.height;
  } else {
    width = image.width || image.naturalWidth;
    height = image.height || image.naturalHeight;
  }

  if (!width || !height) {
    throw new Error('Image must be loaded before creating the corner editor');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for source image');
  }

  if (isImageData) {
    ctx.putImageData(image, 0, 0);
  } else {
    ctx.drawImage(image, 0, 0, width, height);
  }

  return { canvas, width, height };
}

// ── Default theme & styles ───────────────────────────────────────────────────
// Shipped once per document. Everything is driven by CSS custom properties on
// `.scanic-corner-editor`, so consumers restyle the editor by overriding a few
// variables (or whole classes) — no JS required. Set `injectStyles: false` to
// supply your own stylesheet instead.
const STYLE_ID = 'scanic-corner-editor-styles';
const EDITOR_CSS = `
.scanic-corner-editor {
  --scanic-accent: #6366f1;
  --scanic-mask: rgba(15, 23, 42, 0.45);
  --scanic-edge-color: var(--scanic-accent);
  --scanic-edge-width: 2.5;
  --scanic-handle-size: 20px;
  --scanic-handle-hit: 44px;
  --scanic-handle-color: #ffffff;
  --scanic-handle-ring: 2px;
  --scanic-handle-ring-color: var(--scanic-accent);
  --scanic-handle-shadow: 0 1px 4px rgba(15, 23, 42, 0.45);
  --scanic-handle-active-shadow: 0 8px 22px rgba(15, 23, 42, 0.5);
  --scanic-handle-active-scale: 1.28;
  --scanic-surface: rgba(15, 23, 42, 0.92);
  --scanic-surface-fg: #e2e8f0;
  --scanic-surface-radius: 12px;
}
.scanic-handle {
  position: absolute;
  box-sizing: border-box;
  width: var(--scanic-handle-size);
  height: var(--scanic-handle-size);
  margin: 0;
  padding: 0;
  border: var(--scanic-handle-ring) solid var(--scanic-handle-ring-color);
  border-radius: 50%;
  background: var(--scanic-handle-color);
  box-shadow: var(--scanic-handle-shadow);
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  z-index: 2;
  transition: transform 0.12s ease, box-shadow 0.12s ease,
              background 0.12s ease, border-color 0.12s ease;
}
/* Enlarges the pointer/touch target without changing the visual size. */
.scanic-handle::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: var(--scanic-handle-hit);
  height: var(--scanic-handle-hit);
  transform: translate(-50%, -50%);
  border-radius: 50%;
}
/* Soft accent halo that blooms when a handle is grabbed — the "depth" layer. */
.scanic-handle::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: var(--scanic-accent);
  opacity: 0;
  transform: translate(-50%, -50%);
  transition: opacity 0.15s ease, width 0.15s ease, height 0.15s ease;
  pointer-events: none;
}
.scanic-handle:hover {
  transform: translate(-50%, -50%) scale(1.12);
}
.scanic-handle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--scanic-accent) 45%, transparent),
              var(--scanic-handle-shadow);
}
/* The currently selected corner — the target of nudges / keyboard. */
.scanic-handle.is-selected {
  border-color: var(--scanic-accent);
  transform: translate(-50%, -50%) scale(1.12);
}
.scanic-handle.is-selected::before {
  opacity: 0.16;
  width: calc(var(--scanic-handle-size) * 2);
  height: calc(var(--scanic-handle-size) * 2);
}
.scanic-handle.is-active {
  cursor: grabbing;
  background: var(--scanic-accent);
  border-color: #ffffff;
  transform: translate(-50%, -50%) scale(var(--scanic-handle-active-scale));
  box-shadow: var(--scanic-handle-active-shadow);
}
.scanic-handle.is-active::before {
  opacity: 0.22;
  width: calc(var(--scanic-handle-size) * 2.8);
  height: calc(var(--scanic-handle-size) * 2.8);
}
.scanic-toolbar,
.scanic-nudges {
  position: absolute;
  z-index: 3;
  display: flex;
  gap: 4px;
  padding: 5px;
  background: var(--scanic-surface);
  border-radius: var(--scanic-surface-radius);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  box-shadow: 0 6px 20px rgba(15, 23, 42, 0.35);
}
.scanic-toolbar {
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
}
.scanic-nudges {
  top: 10px;
  right: 10px;
  display: grid;
  grid-template-columns: repeat(4, auto);
  gap: 3px;
}
.scanic-toolbar button,
.scanic-nudges button {
  display: grid;
  place-items: center;
  margin: 0;
  padding: 0;
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  color: var(--scanic-surface-fg);
  background: transparent;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, filter 0.12s ease;
}
.scanic-toolbar button {
  width: 34px;
  height: 34px;
}
.scanic-nudges button {
  width: 30px;
  height: 30px;
}
.scanic-toolbar button svg {
  width: 18px;
  height: 18px;
  display: block;
}
.scanic-toolbar button:hover,
.scanic-nudges button:hover {
  background: rgba(255, 255, 255, 0.14);
}
.scanic-toolbar button:focus-visible,
.scanic-nudges button:focus-visible {
  outline: 2px solid var(--scanic-accent);
  outline-offset: 1px;
}
.scanic-toolbar .scanic-btn-apply {
  background: var(--scanic-accent);
  color: #ffffff;
}
.scanic-toolbar .scanic-btn-apply:hover {
  background: var(--scanic-accent);
  filter: brightness(1.1);
}
.scanic-toolbar .scanic-btn-expert.is-on {
  background: color-mix(in srgb, var(--scanic-accent) 32%, transparent);
  color: #ffffff;
}
`;

// Inline stroke icons (inherit `currentColor`), kept tiny and dependency-free.
const ICONS = {
  reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 4 3 10 9 10"/><path d="M3.5 14a8.5 8.5 0 1 0 2-7.4L3 10"/></svg>',
  cancel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  apply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  expert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>'
};

function injectStyles(doc) {
  if (!doc || typeof doc.getElementById !== 'function') return;
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = EDITOR_CSS;
  (doc.head || doc.documentElement).appendChild(style);
}

export function createCornerEditor(options = {}) {
  const container = options.container;
  if (!container || typeof container.appendChild !== 'function') {
    throw new Error('createCornerEditor requires a valid container element');
  }

  const doc = container.ownerDocument || (typeof document !== 'undefined' ? document : null);
  const runtimeGlobal = typeof window !== 'undefined' ? window : globalThis;

  if (options.injectStyles !== false) {
    injectStyles(doc);
  }

  const { canvas: sourceCanvas, width: imageWidth, height: imageHeight } = normalizeImageToCanvas(options.image);

  // ── Host element ───────────────────────────────────────────────────────────
  const addedRootClass = !container.classList.contains('scanic-corner-editor');
  container.classList.add('scanic-corner-editor');
  if (options.classNames?.root) container.classList.add(options.classNames.root);

  const restoreContainerStyle = {
    position: container.style.position,
    minHeight: container.style.minHeight
  };
  let changedContainerPosition = false;
  let changedContainerMinHeight = false;

  if (getComputedStyle(container).position === 'static') {
    container.style.position = 'relative';
    changedContainerPosition = true;
  }

  // Programmatic theme overrides → CSS variables on the host.
  applyThemeOption(options.theme);

  // ── Canvas (image + mask + edges + magnifier) ───────────────────────────────
  const editorCanvas = doc.createElement('canvas');
  editorCanvas.style.position = 'absolute';
  editorCanvas.style.top = '0';
  editorCanvas.style.left = '0';
  editorCanvas.style.display = 'block';
  editorCanvas.style.touchAction = 'none';
  editorCanvas.style.userSelect = 'none';
  editorCanvas.style.webkitUserSelect = 'none';
  editorCanvas.style.cursor = 'default';
  container.appendChild(editorCanvas);
  const ctx = editorCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for corner editor');
  }

  const magnifier = {
    enabled: options.magnifier?.enabled !== false,
    size: options.magnifier?.size || 120,
    zoom: options.magnifier?.zoom || 2,
    margin: options.magnifier?.margin || 8,
    borderColor: options.magnifier?.borderColor || '#ffffff',
    borderWidth: options.magnifier?.borderWidth || 2,
    crosshairColor: options.magnifier?.crosshairColor || '#ffffff',
    crosshairSize: options.magnifier?.crosshairSize || 18
  };

  const nudges = {
    enabled: !!options.nudges?.enabled,
    steps: (options.nudges?.steps && options.nudges.steps.length ? options.nudges.steps : [1, 10]).map((v) => Math.max(1, Math.round(v)))
  };

  const toolbar = {
    enabled: options.toolbar?.enabled !== false,
    reset: options.toolbar?.reset !== false,
    cancel: options.toolbar?.cancel !== false,
    apply: options.toolbar?.apply !== false,
    labels: {
      reset: options.toolbar?.labels?.reset || 'Reset',
      cancel: options.toolbar?.labels?.cancel || 'Cancel',
      apply: options.toolbar?.labels?.apply || 'Apply'
    }
  };

  const keyboardEnabled = options.keyboard !== false;

  const defaultCorners = createDefaultCorners(imageWidth, imageHeight);
  const requestedCorners = options.corners ? cloneCorners(options.corners) : defaultCorners;
  let corners = cornersAreFiniteAndDistinct(requestedCorners) && isConvexQuadrilateral(requestedCorners)
    ? requestedCorners
    : defaultCorners;
  const initialCorners = cloneCorners(corners);

  let isDestroyed = false;
  let activeCornerKey = null;     // currently grabbed (dragging)
  let focusedCornerKey = 'topLeft'; // last focused/active → target for nudges & keyboard
  let dragPointerId = null;
  let lastPointerPosition = null;

  const handleHit = Math.max(24, options.handleHitArea || 44);
  // Only override the stylesheet/theme default when an explicit size was passed.
  if (options.handleHitArea) {
    container.style.setProperty('--scanic-handle-hit', handleHit + 'px');
  }
  const cornerOrder = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  const cornerLabels = {
    topLeft: 'Top-left corner',
    topRight: 'Top-right corner',
    bottomRight: 'Bottom-right corner',
    bottomLeft: 'Bottom-left corner'
  };
  let view = { scale: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 };
  const resolved = { mask: 'rgba(15,23,42,0.45)', edgeColor: '#6366f1', edgeWidth: 2.5 };

  // ── DOM handles ──────────────────────────────────────────────────────────────
  const handleEls = {};
  for (const key of cornerOrder) {
    const el = doc.createElement('button');
    el.type = 'button';
    el.className = 'scanic-handle' + (options.classNames?.handle ? ' ' + options.classNames.handle : '');
    el.dataset.corner = key;
    el.setAttribute('aria-label', cornerLabels[key]);
    if (!keyboardEnabled) el.tabIndex = -1;
    el.addEventListener('pointerdown', (e) => onHandlePointerDown(key, e));
    el.addEventListener('pointermove', (e) => onHandlePointerMove(key, e));
    el.addEventListener('pointerup', (e) => onHandlePointerUp(key, e));
    el.addEventListener('pointercancel', (e) => onHandlePointerUp(key, e));
    el.addEventListener('focus', () => { focusedCornerKey = key; updateSelected(); });
    if (keyboardEnabled) el.addEventListener('keydown', (e) => onHandleKeyDown(key, e));
    container.appendChild(el);
    handleEls[key] = el;
  }

  // ── Theme resolution for the canvas layer ────────────────────────────────────
  // CSS custom properties can contain unresolved var() references, which canvas
  // can't use directly. We resolve them to concrete values by letting the browser
  // compute them through the `color` property on a probe element.
  function resolveColor(expr, fallback) {
    const prev = editorCanvas.style.color;
    editorCanvas.style.color = `var(${expr}, ${fallback})`;
    const value = getComputedStyle(editorCanvas).color || fallback;
    editorCanvas.style.color = prev;
    return value;
  }

  function resolveTheme() {
    resolved.mask = resolveColor('--scanic-mask', 'rgba(15, 23, 42, 0.45)');
    resolved.edgeColor = resolveColor('--scanic-edge-color', '#6366f1');
    const widthRaw = getComputedStyle(container).getPropertyValue('--scanic-edge-width');
    const parsed = parseFloat(widthRaw);
    resolved.edgeWidth = Number.isFinite(parsed) && parsed > 0 ? parsed : 2.5;
  }

  function applyThemeOption(theme) {
    if (!theme || typeof theme !== 'object') return;
    const pxKeys = new Set(['handleSize', 'handleHit']);
    const map = {
      accent: '--scanic-accent',
      mask: '--scanic-mask',
      edgeColor: '--scanic-edge-color',
      edgeWidth: '--scanic-edge-width',
      handleSize: '--scanic-handle-size',
      handleHit: '--scanic-handle-hit',
      handleColor: '--scanic-handle-color',
      handleRingColor: '--scanic-handle-ring-color',
      surface: '--scanic-surface',
      surfaceColor: '--scanic-surface-fg',
      radius: '--scanic-surface-radius'
    };
    for (const [key, cssVar] of Object.entries(map)) {
      const value = theme[key];
      if (value == null) continue;
      const cssValue = (typeof value === 'number' && pxKeys.has(key)) ? `${value}px` : String(value);
      container.style.setProperty(cssVar, cssValue);
    }
  }

  function emitChange() {
    if (typeof options.onChange === 'function') {
      options.onChange(cloneCorners(corners));
    }
  }

  // ── Sizing (kept loop-safe: canvas is out of flow, see original notes) ────────
  let lastDisplayWidth = 0;
  let lastDisplayHeight = 0;

  function computeDisplaySize() {
    const width = Math.max(1, Math.round(container.clientWidth));
    let height = Math.round(container.clientHeight);

    if (height < 80) {
      const aspect = imageHeight / Math.max(1, imageWidth);
      const viewportCap = (runtimeGlobal.innerHeight || 800) * 0.7;
      height = Math.max(240, Math.round(Math.min(width * aspect, viewportCap)));
      container.style.minHeight = height + 'px';
      changedContainerMinHeight = true;
    }

    return { width, height: Math.max(1, height) };
  }

  function updateCanvasSize() {
    const { width, height } = computeDisplaySize();
    const dpr = runtimeGlobal.devicePixelRatio || 1;

    lastDisplayWidth = width;
    lastDisplayHeight = height;

    editorCanvas.style.width = width + 'px';
    editorCanvas.style.height = height + 'px';

    const bufferWidth = Math.round(width * dpr);
    const bufferHeight = Math.round(height * dpr);
    if (editorCanvas.width !== bufferWidth) editorCanvas.width = bufferWidth;
    if (editorCanvas.height !== bufferHeight) editorCanvas.height = bufferHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = 12;
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;

    view = {
      scale,
      offsetX: Math.round((width - drawWidth) / 2),
      offsetY: Math.round((height - drawHeight) / 2),
      width,
      height
    };

    resolveTheme();
  }

  function imageToView(point) {
    return {
      x: view.offsetX + point.x * view.scale,
      y: view.offsetY + point.y * view.scale
    };
  }

  function viewToImage(x, y) {
    const px = (x - view.offsetX) / view.scale;
    const py = (y - view.offsetY) / view.scale;
    return {
      x: Math.max(0, Math.min(imageWidth, px)),
      y: Math.max(0, Math.min(imageHeight, py))
    };
  }

  function cornersValid(nextCorners) {
    return cornersAreFiniteAndDistinct(nextCorners) && isConvexQuadrilateral(nextCorners);
  }

  function getEventCanvasPoint(event) {
    const rect = editorCanvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────
  function drawOverlay() {
    const points = cornerOrder.map((key) => imageToView(corners[key]));

    // Dim everything outside the quad.
    ctx.save();
    ctx.fillStyle = resolved.mask;
    ctx.beginPath();
    ctx.rect(0, 0, view.width, view.height);
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    // Quad edges.
    ctx.save();
    ctx.strokeStyle = resolved.edgeColor;
    ctx.lineWidth = resolved.edgeWidth;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function drawMagnifier() {
    if (!magnifier.enabled || !activeCornerKey || !lastPointerPosition) {
      return;
    }

    const active = corners[activeCornerKey];
    const size = magnifier.size;
    const radius = size / 2;
    const zoom = Math.max(1.1, magnifier.zoom);

    let lensX = lastPointerPosition.x + radius + magnifier.margin;
    let lensY = lastPointerPosition.y - radius - magnifier.margin;

    if (lensX + radius > view.width) {
      lensX = lastPointerPosition.x - radius - magnifier.margin;
    }
    if (lensY - radius < 0) {
      lensY = lastPointerPosition.y + radius + magnifier.margin;
    }

    lensX = Math.max(radius + 2, Math.min(view.width - radius - 2, lensX));
    lensY = Math.max(radius + 2, Math.min(view.height - radius - 2, lensY));

    const sampleSize = size / zoom;
    const sx = Math.max(0, Math.min(imageWidth - sampleSize, active.x - sampleSize / 2));
    const sy = Math.max(0, Math.min(imageHeight - sampleSize, active.y - sampleSize / 2));

    ctx.save();
    ctx.beginPath();
    ctx.arc(lensX, lensY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(sourceCanvas, sx, sy, sampleSize, sampleSize, lensX - radius, lensY - radius, size, size);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(lensX, lensY, radius, 0, Math.PI * 2);
    ctx.lineWidth = magnifier.borderWidth;
    ctx.strokeStyle = magnifier.borderColor;
    ctx.stroke();

    const ch = magnifier.crosshairSize / 2;
    ctx.strokeStyle = magnifier.crosshairColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lensX - ch, lensY);
    ctx.lineTo(lensX + ch, lensY);
    ctx.moveTo(lensX, lensY - ch);
    ctx.lineTo(lensX, lensY + ch);
    ctx.stroke();
    ctx.restore();
  }

  function positionHandles() {
    for (const key of cornerOrder) {
      const p = imageToView(corners[key]);
      const el = handleEls[key];
      el.style.left = p.x + 'px';
      el.style.top = p.y + 'px';
    }
  }

  // Marks which handle is the current target for nudges / keyboard, so it's
  // always clear which corner you're about to move (esp. in expert mode).
  function updateSelected() {
    for (const key of cornerOrder) {
      handleEls[key].classList.toggle('is-selected', key === focusedCornerKey);
    }
  }

  function render() {
    if (isDestroyed) return;

    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      imageWidth,
      imageHeight,
      view.offsetX,
      view.offsetY,
      imageWidth * view.scale,
      imageHeight * view.scale
    );
    drawOverlay();
    drawMagnifier();
    positionHandles();
  }

  const raf = typeof runtimeGlobal.requestAnimationFrame === 'function'
    ? runtimeGlobal.requestAnimationFrame.bind(runtimeGlobal)
    : null;
  const caf = typeof runtimeGlobal.cancelAnimationFrame === 'function'
    ? runtimeGlobal.cancelAnimationFrame.bind(runtimeGlobal)
    : null;
  let rafId = null;

  function scheduleRender() {
    if (isDestroyed) return;
    if (!raf) {
      render();
      return;
    }
    if (rafId !== null) return;
    rafId = raf(() => {
      rafId = null;
      render();
    });
  }

  function setCorner(nextCornerKey, nextPoint) {
    const candidate = cloneCorners(corners);
    candidate[nextCornerKey] = {
      x: Math.max(0, Math.min(imageWidth, nextPoint.x)),
      y: Math.max(0, Math.min(imageHeight, nextPoint.y))
    };

    if (!cornersValid(candidate)) {
      return false;
    }

    corners = candidate;
    focusedCornerKey = nextCornerKey;
    updateSelected();
    emitChange();
    scheduleRender();
    return true;
  }

  // ── Handle interaction ───────────────────────────────────────────────────────
  function onHandlePointerDown(key, event) {
    if (isDestroyed) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();

    activeCornerKey = key;
    focusedCornerKey = key;
    updateSelected();
    dragPointerId = event.pointerId;
    lastPointerPosition = getEventCanvasPoint(event);
    handleEls[key].classList.add('is-active');

    if (keyboardEnabled && typeof handleEls[key].focus === 'function') {
      try { handleEls[key].focus({ preventScroll: true }); } catch (_) { handleEls[key].focus(); }
    }
    if (handleEls[key].setPointerCapture && event.pointerId != null) {
      try { handleEls[key].setPointerCapture(event.pointerId); } catch (_) { /* ignore */ }
    }
    scheduleRender();
  }

  function onHandlePointerMove(key, event) {
    if (isDestroyed || activeCornerKey !== key) return;
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;
    lastPointerPosition = getEventCanvasPoint(event);
    setCorner(key, viewToImage(lastPointerPosition.x, lastPointerPosition.y));
  }

  function onHandlePointerUp(key, event) {
    if (activeCornerKey !== key) return;
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;
    if (handleEls[key].releasePointerCapture && dragPointerId != null) {
      try { handleEls[key].releasePointerCapture(dragPointerId); } catch (_) { /* ignore */ }
    }
    handleEls[key].classList.remove('is-active');
    activeCornerKey = null;
    dragPointerId = null;
    lastPointerPosition = null;
    scheduleRender();
  }

  function onHandleKeyDown(key, event) {
    if (isDestroyed || !keyboardEnabled) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      confirmEditor();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditor();
      return;
    }

    let dx = 0;
    let dy = 0;
    if (event.key === 'ArrowLeft') dx = -1;
    else if (event.key === 'ArrowRight') dx = 1;
    else if (event.key === 'ArrowUp') dy = -1;
    else if (event.key === 'ArrowDown') dy = 1;
    else return;

    event.preventDefault();
    const step = event.shiftKey ? (nudges.steps[nudges.steps.length - 1] || 10) : 1;
    setCorner(key, { x: corners[key].x + dx * step, y: corners[key].y + dy * step });
  }

  // ── Toolbar & nudge pad ──────────────────────────────────────────────────────
  let toolbarEl = null;
  let nudgeControls = null;
  let expertBtn = null;
  let expertVisible = false;
  // An expert toggle only exists when both a toolbar and the nudge pad are on;
  // otherwise the pad (if enabled) is shown directly.
  const hasExpertToggle = toolbar.enabled && nudges.enabled;

  function makeButton({ html, text, title, className, onClick }) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    if (html != null) btn.innerHTML = html;
    else btn.textContent = text;
    if (title) {
      btn.title = title;          // simple native hover tooltip
      btn.setAttribute('aria-label', title);
    }
    if (className) btn.className = className;
    btn.addEventListener('click', onClick);
    return btn;
  }

  function setExpert(on) {
    expertVisible = on;
    if (nudgeControls) nudgeControls.style.display = on ? '' : 'none';
    if (expertBtn) {
      expertBtn.classList.toggle('is-on', on);
      expertBtn.setAttribute('aria-pressed', String(on));
    }
  }

  function buildToolbar() {
    if (!toolbar.enabled) return;
    if (!toolbar.reset && !toolbar.cancel && !toolbar.apply && !hasExpertToggle) return;

    toolbarEl = doc.createElement('div');
    toolbarEl.className = 'scanic-toolbar' + (options.classNames?.toolbar ? ' ' + options.classNames.toolbar : '');

    if (toolbar.reset) {
      toolbarEl.appendChild(makeButton({ html: ICONS.reset, title: toolbar.labels.reset, className: 'scanic-btn-reset', onClick: () => publicReset() }));
    }
    if (hasExpertToggle) {
      expertBtn = makeButton({ html: ICONS.expert, title: 'Precision nudge (expert)', className: 'scanic-btn-expert', onClick: () => setExpert(!expertVisible) });
      expertBtn.setAttribute('aria-pressed', 'false');
      toolbarEl.appendChild(expertBtn);
    }
    if (toolbar.cancel) {
      toolbarEl.appendChild(makeButton({ html: ICONS.cancel, title: toolbar.labels.cancel, className: 'scanic-btn-cancel', onClick: () => cancelEditor() }));
    }
    if (toolbar.apply) {
      toolbarEl.appendChild(makeButton({ html: ICONS.apply, title: toolbar.labels.apply, className: 'scanic-btn-apply', onClick: () => confirmEditor() }));
    }

    container.appendChild(toolbarEl);
  }

  function buildNudgeControls() {
    if (!nudges.enabled) return;

    nudgeControls = doc.createElement('div');
    nudgeControls.className = 'scanic-nudges' + (options.classNames?.nudges ? ' ' + options.classNames.nudges : '');

    const makeNudge = (glyph, label, dx, dy, step) => makeButton({
      text: glyph,
      title: label,
      className: 'scanic-btn-nudge',
      onClick: () => {
        const current = corners[focusedCornerKey];
        setCorner(focusedCornerKey, { x: current.x + dx * step, y: current.y + dy * step });
      }
    });

    for (const step of nudges.steps) {
      nudgeControls.appendChild(makeNudge('←', `Move left ${step}px`, -1, 0, step));
      nudgeControls.appendChild(makeNudge('↑', `Move up ${step}px`, 0, -1, step));
      nudgeControls.appendChild(makeNudge('↓', `Move down ${step}px`, 0, 1, step));
      nudgeControls.appendChild(makeNudge('→', `Move right ${step}px`, 1, 0, step));
    }

    container.appendChild(nudgeControls);
    // Hidden until the expert toggle is pressed (when a toolbar hosts the toggle).
    if (hasExpertToggle) nudgeControls.style.display = 'none';
  }

  // ── DPR watch (crisp on monitor moves / zoom) ────────────────────────────────
  let dprCleanup = null;
  function watchDevicePixelRatio() {
    if (typeof runtimeGlobal.matchMedia !== 'function') return;
    if (dprCleanup) dprCleanup();
    const dpr = runtimeGlobal.devicePixelRatio || 1;
    const mq = runtimeGlobal.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => {
      if (isDestroyed) return;
      updateCanvasSize();
      scheduleRender();
      watchDevicePixelRatio();
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      dprCleanup = () => mq.removeEventListener('change', onChange);
    } else if (typeof mq.addListener === 'function') {
      mq.addListener(onChange);
      dprCleanup = () => mq.removeListener(onChange);
    } else {
      dprCleanup = null;
    }
  }

  function confirmEditor() {
    const output = cloneCorners(corners);
    if (typeof options.onConfirm === 'function') {
      options.onConfirm(output);
    }
    return output;
  }

  function cancelEditor() {
    if (typeof options.onCancel === 'function') {
      options.onCancel();
    }
  }

  function publicReset() {
    corners = cloneCorners(initialCorners);
    emitChange();
    scheduleRender();
  }

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        if (isDestroyed) return;
        const next = computeDisplaySize();
        if (next.width === lastDisplayWidth && next.height === lastDisplayHeight) {
          return;
        }
        updateCanvasSize();
        scheduleRender();
      })
    : null;

  updateCanvasSize();
  buildToolbar();
  buildNudgeControls();
  watchDevicePixelRatio();
  if (resizeObserver) {
    resizeObserver.observe(container);
  }
  updateSelected();
  render();

  return {
    getCorners() {
      return cloneCorners(corners);
    },

    setCorners(nextCorners) {
      if (!nextCorners || !cornersValid(nextCorners)) {
        return false;
      }
      corners = cloneCorners(nextCorners);
      emitChange();
      scheduleRender();
      return true;
    },

    reset() {
      publicReset();
    },

    nudge(cornerKey, dx, dy, step = 1) {
      if (!cornerOrder.includes(cornerKey)) {
        return false;
      }
      return setCorner(cornerKey, {
        x: corners[cornerKey].x + dx * step,
        y: corners[cornerKey].y + dy * step
      });
    },

    /** Re-read CSS variables into the canvas layer after a runtime theme change. */
    refreshTheme(theme) {
      applyThemeOption(theme);
      resolveTheme();
      scheduleRender();
    },

    confirm() {
      return confirmEditor();
    },

    cancel() {
      cancelEditor();
    },

    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      if (rafId !== null && caf) {
        caf(rafId);
        rafId = null;
      }
      if (dprCleanup) {
        dprCleanup();
        dprCleanup = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      for (const key of cornerOrder) {
        const el = handleEls[key];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
      if (toolbarEl && toolbarEl.parentNode) toolbarEl.parentNode.removeChild(toolbarEl);
      if (nudgeControls && nudgeControls.parentNode) nudgeControls.parentNode.removeChild(nudgeControls);
      if (editorCanvas.parentNode) editorCanvas.parentNode.removeChild(editorCanvas);

      if (addedRootClass) container.classList.remove('scanic-corner-editor');
      if (options.classNames?.root) container.classList.remove(options.classNames.root);
      if (changedContainerPosition) {
        container.style.position = restoreContainerStyle.position;
      }
      if (changedContainerMinHeight) {
        container.style.minHeight = restoreContainerStyle.minHeight;
      }
    }
  };
}
