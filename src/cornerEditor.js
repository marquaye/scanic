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

function drawHandle(ctx, point, radius, color, stroke, lineWidth) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
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

export function createCornerEditor(options = {}) {
  const container = options.container;
  if (!container || typeof container.appendChild !== 'function') {
    throw new Error('createCornerEditor requires a valid container element');
  }

  const { canvas: sourceCanvas, width: imageWidth, height: imageHeight } = normalizeImageToCanvas(options.image);

  const editorCanvas = document.createElement('canvas');
  // The canvas is positioned ABSOLUTELY and taken out of layout flow on
  // purpose. If it participated in flow, its rendered size would feed back
  // into the container size, the ResizeObserver would fire, we'd resize again,
  // and the page would grow without bound (a runaway scrollbar that makes the
  // handles impossible to grab). Out of flow, the canvas can never drive the
  // container's size, so no feedback loop is possible regardless of borders,
  // padding, or devicePixelRatio. We always set explicit pixel dimensions in
  // updateCanvasSize().
  editorCanvas.style.position = 'absolute';
  editorCanvas.style.top = '0';
  editorCanvas.style.left = '0';
  editorCanvas.style.display = 'block';
  editorCanvas.style.boxSizing = 'border-box';
  editorCanvas.style.touchAction = 'none';
  editorCanvas.style.userSelect = 'none';
  editorCanvas.style.webkitUserSelect = 'none';
  editorCanvas.style.cursor = 'crosshair';
  editorCanvas.style.outline = 'none';

  const keyboardEnabled = options.keyboard !== false;
  if (keyboardEnabled) {
    // Make the canvas focusable so it can receive keyboard input.
    editorCanvas.tabIndex = 0;
    editorCanvas.setAttribute('role', 'application');
    editorCanvas.setAttribute('aria-label', 'Document corner editor. Use arrow keys to adjust the selected corner.');
  }

  // Track inline styles we mutate so destroy() can restore the host cleanly.
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

  container.appendChild(editorCanvas);
  const ctx = editorCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for corner editor');
  }

  const magnifier = {
    enabled: options.magnifier?.enabled !== false,
    size: options.magnifier?.size || 110,
    zoom: options.magnifier?.zoom || 2,
    margin: options.magnifier?.margin || 16,
    borderColor: options.magnifier?.borderColor || '#ffffff',
    borderWidth: options.magnifier?.borderWidth || 2,
    crosshairColor: options.magnifier?.crosshairColor || '#ffffff',
    crosshairSize: options.magnifier?.crosshairSize || 18
  };

  const nudges = {
    enabled: !!options.nudges?.enabled,
    steps: (options.nudges?.steps && options.nudges.steps.length ? options.nudges.steps : [1, 5]).map((v) => Math.max(1, Math.round(v)))
  };

  const defaultCorners = createDefaultCorners(imageWidth, imageHeight);
  const requestedCorners = options.corners ? cloneCorners(options.corners) : defaultCorners;
  let corners = cornersAreFiniteAndDistinct(requestedCorners) && isConvexQuadrilateral(requestedCorners)
    ? requestedCorners
    : defaultCorners;
  const initialCorners = cloneCorners(corners);

  let isDestroyed = false;
  let activeCornerKey = null;
  let dragPointerId = null;
  let lastPointerPosition = null;

  const handleHitArea = Math.max(24, options.handleHitArea || 48);
  const handleRadius = Math.max(8, Math.min(16, handleHitArea * 0.3));
  const cornerOrder = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  let view = { scale: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 };

  let nudgeControls = null;
  let activeNudgeCorner = 'topLeft';
  const runtimeGlobal = typeof window !== 'undefined' ? window : globalThis;

  function emitChange() {
    if (typeof options.onChange === 'function') {
      options.onChange(cloneCorners(corners));
    }
  }

  let lastDisplayWidth = 0;
  let lastDisplayHeight = 0;

  function computeDisplaySize() {
    // Use the CONTENT box (clientWidth/clientHeight), never getBoundingClientRect
    // — the latter includes the border, and sizing the canvas to a border-box
    // value reintroduces the growth loop one border-width at a time.
    const width = Math.max(1, Math.round(container.clientWidth));
    let height = Math.round(container.clientHeight);

    // When the container has no usable height of its own (auto-height
    // layouts), derive one from the image aspect ratio so the editor is still
    // usable, and give the container that height so the absolutely-positioned
    // canvas is actually visible. Deterministic for a given width → no loop.
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

    // Decouple CSS size from the pixel buffer so the buffer height never feeds
    // back into layout (see note where editorCanvas is created).
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

  function hitTestCorner(canvasX, canvasY) {
    let hit = null;
    let bestDistance = Infinity;

    for (const key of cornerOrder) {
      const p = imageToView(corners[key]);
      const d = Math.hypot(canvasX - p.x, canvasY - p.y);
      if (d <= handleHitArea && d < bestDistance) {
        bestDistance = d;
        hit = key;
      }
    }

    return hit;
  }

  function drawPolygonOverlay() {
    const points = cornerOrder.map((key) => imageToView(corners[key]));

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.40)';
    ctx.beginPath();
    ctx.rect(0, 0, view.width, view.height);
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill('evenodd');
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    for (const key of cornerOrder) {
      const p = imageToView(corners[key]);
      const isActive = key === activeCornerKey;
      drawHandle(
        ctx,
        p,
        isActive ? handleRadius + 1 : handleRadius,
        isActive ? '#f59e0b' : '#ffffff',
        isActive ? '#7c2d12' : '#0f172a',
        2
      );
    }
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
    drawPolygonOverlay();
    drawMagnifier();
  }

  // Coalesce paints to one per animation frame. Pointer/keyboard updates mutate
  // corner state synchronously but only request a frame, so a fast drag over a
  // large image never triggers more than one full repaint per frame.
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
    activeNudgeCorner = nextCornerKey;
    emitChange();
    scheduleRender();
    return true;
  }

  function buildNudgeControls() {
    if (!nudges.enabled) {
      return;
    }

    nudgeControls = document.createElement('div');
    nudgeControls.style.position = 'absolute';
    nudgeControls.style.right = '8px';
    nudgeControls.style.bottom = '8px';
    nudgeControls.style.background = 'rgba(15, 23, 42, 0.9)';
    nudgeControls.style.border = '1px solid rgba(148, 163, 184, 0.5)';
    nudgeControls.style.borderRadius = '10px';
    nudgeControls.style.padding = '8px';
    nudgeControls.style.display = 'grid';
    nudgeControls.style.gridTemplateColumns = 'repeat(4, auto)';
    nudgeControls.style.gap = '6px';
    nudgeControls.style.zIndex = '2';

    const makeButton = (glyph, ariaLabel, dx, dy, step) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = glyph + (step > 1 ? ' ' + step : '');
      btn.setAttribute('aria-label', ariaLabel);
      btn.style.border = '1px solid #475569';
      btn.style.background = '#0f172a';
      btn.style.color = '#e2e8f0';
      btn.style.borderRadius = '6px';
      btn.style.padding = '4px 8px';
      btn.style.fontSize = '13px';
      btn.style.lineHeight = '1';
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', () => {
        const current = corners[activeNudgeCorner];
        setCorner(activeNudgeCorner, {
          x: current.x + dx * step,
          y: current.y + dy * step
        });
      });
      return btn;
    };

    for (const step of nudges.steps) {
      nudgeControls.appendChild(makeButton('←', `Move left ${step}px`, -1, 0, step));
      nudgeControls.appendChild(makeButton('→', `Move right ${step}px`, 1, 0, step));
      nudgeControls.appendChild(makeButton('↑', `Move up ${step}px`, 0, -1, step));
      nudgeControls.appendChild(makeButton('↓', `Move down ${step}px`, 0, 1, step));
    }

    container.appendChild(nudgeControls);
  }

  function handlePointerDown(event) {
    if (isDestroyed) return;
    const point = getEventCanvasPoint(event);
    const hitCorner = hitTestCorner(point.x, point.y);
    if (!hitCorner) return;

    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }

    activeCornerKey = hitCorner;
    activeNudgeCorner = hitCorner;
    dragPointerId = event.pointerId;
    lastPointerPosition = point;
    editorCanvas.style.cursor = 'grabbing';

    // Focus so keyboard nudging works on the corner the user just grabbed.
    if (keyboardEnabled && typeof editorCanvas.focus === 'function') {
      try { editorCanvas.focus({ preventScroll: true }); } catch (_) { editorCanvas.focus(); }
    }

    if (editorCanvas.setPointerCapture && dragPointerId !== undefined) {
      editorCanvas.setPointerCapture(dragPointerId);
    }

    scheduleRender();
  }

  function handlePointerMove(event) {
    if (isDestroyed) return;

    const point = getEventCanvasPoint(event);

    if (!activeCornerKey) {
      // Hover feedback so it's obvious the handles are grabbable.
      editorCanvas.style.cursor = hitTestCorner(point.x, point.y) ? 'grab' : 'crosshair';
      return;
    }
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;

    lastPointerPosition = point;
    const imagePoint = viewToImage(point.x, point.y);
    setCorner(activeCornerKey, imagePoint);
  }

  function handlePointerUp(event) {
    if (!activeCornerKey) return;
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;
    if (editorCanvas.releasePointerCapture && dragPointerId !== null && dragPointerId !== undefined) {
      try { editorCanvas.releasePointerCapture(dragPointerId); } catch (_) { /* ignore */ }
    }
    activeCornerKey = null;
    dragPointerId = null;
    lastPointerPosition = null;
    editorCanvas.style.cursor = 'crosshair';
    scheduleRender();
  }

  function handleKeyDown(event) {
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
    // Shift = coarse step (largest configured nudge step), otherwise 1px.
    const step = event.shiftKey ? nudges.steps[nudges.steps.length - 1] || 10 : 1;
    const current = corners[activeNudgeCorner];
    setCorner(activeNudgeCorner, {
      x: current.x + dx * step,
      y: current.y + dy * step
    });
  }

  function handleMouseDown(event) {
    handlePointerDown({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: 1
    });
  }

  function handleMouseMove(event) {
    handlePointerMove({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: 1
    });
  }

  function handleTouchStart(event) {
    const touch = event.touches[0];
    if (!touch) return;
    const point = getEventCanvasPoint(touch);
    // Only swallow the gesture (and block page scroll) when actually grabbing
    // a handle, so taps elsewhere stay responsive on legacy touch browsers.
    if (hitTestCorner(point.x, point.y)) {
      event.preventDefault();
    }
    handlePointerDown({
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: 2
    });
  }

  function handleTouchMove(event) {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    handlePointerMove({
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: 2
    });
  }

  function attachEvents() {
    if (typeof runtimeGlobal.PointerEvent !== 'undefined') {
      editorCanvas.addEventListener('pointerdown', handlePointerDown);
      editorCanvas.addEventListener('pointermove', handlePointerMove);
      editorCanvas.addEventListener('pointerup', handlePointerUp);
      editorCanvas.addEventListener('pointercancel', handlePointerUp);
    } else {
      editorCanvas.addEventListener('mousedown', handleMouseDown);
      if (typeof runtimeGlobal.addEventListener === 'function') {
        runtimeGlobal.addEventListener('mousemove', handleMouseMove);
        runtimeGlobal.addEventListener('mouseup', handlePointerUp);
      }
      editorCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      editorCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      editorCanvas.addEventListener('touchend', handlePointerUp);
      editorCanvas.addEventListener('touchcancel', handlePointerUp);
    }
    if (keyboardEnabled) {
      editorCanvas.addEventListener('keydown', handleKeyDown);
    }
  }

  function detachEvents() {
    editorCanvas.removeEventListener('pointerdown', handlePointerDown);
    editorCanvas.removeEventListener('pointermove', handlePointerMove);
    editorCanvas.removeEventListener('pointerup', handlePointerUp);
    editorCanvas.removeEventListener('pointercancel', handlePointerUp);
    editorCanvas.removeEventListener('mousedown', handleMouseDown);
    if (typeof runtimeGlobal.removeEventListener === 'function') {
      runtimeGlobal.removeEventListener('mousemove', handleMouseMove);
      runtimeGlobal.removeEventListener('mouseup', handlePointerUp);
    }
    editorCanvas.removeEventListener('touchstart', handleTouchStart);
    editorCanvas.removeEventListener('touchmove', handleTouchMove);
    editorCanvas.removeEventListener('touchend', handlePointerUp);
    editorCanvas.removeEventListener('touchcancel', handlePointerUp);
    editorCanvas.removeEventListener('keydown', handleKeyDown);
  }

  // Keep the canvas crisp when the page moves between displays with different
  // pixel densities (e.g. dragging the window to an external monitor) or on
  // browser zoom. matchMedia for the current ratio fires once when it changes.
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

  const resizeObserver = typeof ResizeObserver !== 'undefined'
    ? new ResizeObserver(() => {
        if (isDestroyed) return;
        const next = computeDisplaySize();
        // Ignore observations that don't actually change our display size.
        // This is a safety net against any layout feedback loop.
        if (next.width === lastDisplayWidth && next.height === lastDisplayHeight) {
          return;
        }
        updateCanvasSize();
        scheduleRender();
      })
    : null;

  updateCanvasSize();
  buildNudgeControls();
  attachEvents();
  watchDevicePixelRatio();
  if (resizeObserver) {
    resizeObserver.observe(container);
  }
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
      corners = cloneCorners(initialCorners);
      emitChange();
      scheduleRender();
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
      detachEvents();
      if (nudgeControls && nudgeControls.parentNode) {
        nudgeControls.parentNode.removeChild(nudgeControls);
      }
      if (editorCanvas.parentNode) {
        editorCanvas.parentNode.removeChild(editorCanvas);
      }
      // Restore any inline styles we set on the host so it can be reused cleanly.
      if (changedContainerPosition) {
        container.style.position = restoreContainerStyle.position;
      }
      if (changedContainerMinHeight) {
        container.style.minHeight = restoreContainerStyle.minHeight;
      }
    }
  };
}
