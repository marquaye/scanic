# Corner Editor

Detection is automatic, but real-world photos sometimes need a human touch.
`createCornerEditor` gives you a built-in, touch- and mouse-friendly UI where
users can drag the four corners to perfect the crop before extraction.

It's a **hybrid renderer**: the image, the dimmed mask, and the quad outline are
drawn on a canvas, while the corner handles and toolbar are real DOM elements —
so they're fully styleable with CSS, animate smoothly, and give clear depth
feedback when grabbed. It ships a polished default look and a floating
**Reset · Cancel · Apply** toolbar out of the box.

## Basic usage

Detect first, then hand the corners to the editor; extract on confirm:

```js
import { scanDocument, createCornerEditor, extractDocument } from 'scanic'

const detection = await scanDocument(imageElement, { mode: 'detect' })

const editor = createCornerEditor({
  container: document.getElementById('editorHost'),
  image: imageElement,
  corners: detection.corners, // optional — defaults to an inset quad
  onConfirm: async (corners) => {
    const extracted = await extractDocument(imageElement, corners, { output: 'canvas' })
    document.getElementById('output').appendChild(extracted.output)
    editor.destroy()
  }
})
```

## Interaction model

- **Drag** any corner handle. Handles have a large invisible hit area (44px by default) for comfortable touch use.
- **Grabbed feedback** — the active handle lifts: it scales up, switches to the accent colour, gains an elevated shadow and a soft accent halo, so it's obvious which node you're moving.
- **Magnifier** shows a zoomed view near the active corner for pixel-precise placement.
- **Keyboard** — focus a handle (Tab), then arrow keys nudge it, **Shift** = coarse step, **Enter** confirms, **Escape** cancels.
- **Toolbar** — a compact floating bar of icon buttons (Reset · Cancel · Apply) with hover tooltips, shown by default.
- **Expert nudge pad** — enable `nudges` to add a precision toggle to the toolbar; it reveals a small pad that moves the **selected** corner one pixel (or one coarse step) at a time. Great for fine-tuning without a keyboard.

## Theming

Everything visual is driven by **CSS custom properties** on the host element, so
you can restyle the editor without touching JavaScript. The defaults ship in a
stylesheet that is injected once per page.

### Quick theming with CSS

```css
.scanic-corner-editor {
  --scanic-accent: #e11d48;        /* edges, rings, active handles */
  --scanic-handle-size: 24px;
  --scanic-handle-color: #fff;
  --scanic-mask: rgba(0, 0, 0, 0.55);
}
```

### Or programmatically

```js
createCornerEditor({
  container,
  image,
  theme: {
    accent: '#e11d48',
    handleSize: 24,        // number → px
    mask: 'rgba(0,0,0,0.55)'
  }
})
```

### CSS variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `--scanic-accent` | `#6366f1` | Edges, rings, active handle fill |
| `--scanic-mask` | `rgba(15,23,42,0.45)` | Fill outside the document quad |
| `--scanic-edge-color` | `var(--scanic-accent)` | Quad outline colour |
| `--scanic-edge-width` | `2.5` | Quad outline width (unitless) |
| `--scanic-handle-size` | `20px` | Handle diameter |
| `--scanic-handle-hit` | `44px` | Pointer/touch target size |
| `--scanic-handle-color` | `#ffffff` | Handle fill (idle) |
| `--scanic-handle-ring` | `2px` | Handle ring width |
| `--scanic-handle-ring-color` | `var(--scanic-accent)` | Handle ring colour |
| `--scanic-handle-active-scale` | `1.28` | Grabbed handle scale |
| `--scanic-surface` | `rgba(15,23,42,0.92)` | Toolbar / nudge background |
| `--scanic-surface-fg` | `#e2e8f0` | Toolbar / nudge text |

You can also override the classes directly: `.scanic-handle`,
`.scanic-handle.is-active`, `.scanic-toolbar`, `.scanic-toolbar .scanic-btn-apply`,
and `.scanic-nudges`. Pass `injectStyles: false` to skip the bundled stylesheet
entirely and supply your own.

### Brand recipe

A complete, copy-paste example that themes the editor to match a brand palette
(here the indigo used across these docs). Tweak a handful of variables and the
handles, rings, outline, and toolbar all follow:

```css
.scanic-corner-editor {
  /* Core palette */
  --scanic-accent: #6366f1;             /* indigo — edges, rings, active handle */
  --scanic-mask: rgba(15, 23, 42, 0.55);

  /* Handles */
  --scanic-handle-size: 22px;
  --scanic-handle-hit: 48px;            /* roomy touch target */
  --scanic-handle-color: #ffffff;
  --scanic-handle-ring: 2px;
  --scanic-handle-active-scale: 1.3;    /* a bit more lift when grabbed */

  /* Toolbar surface */
  --scanic-surface: rgba(30, 27, 75, 0.92); /* deep indigo glass */
  --scanic-surface-fg: #e0e7ff;
  --scanic-surface-radius: 14px;
}
```

```js
import { createCornerEditor } from 'scanic'

createCornerEditor({
  container: document.getElementById('editorHost'),
  image: imageElement,
  corners: detectedCorners
  // No theme/style options needed — the CSS above styles everything.
})
```

Prefer keeping styling in JS? The same result via the `theme` option:

```js
createCornerEditor({
  container, image, corners,
  theme: {
    accent: '#6366f1',
    mask: 'rgba(15, 23, 42, 0.55)',
    handleSize: 22,
    handleHit: 48,
    surface: 'rgba(30, 27, 75, 0.92)',
    surfaceColor: '#e0e7ff',
    radius: '14px'
  }
})
```

### Going headless

For full control, opt out of the bundled stylesheet with `injectStyles: false`
and ship your own. The editor still adds the same class names and the `.is-active`
state — you decide everything else. Here's a minimal but complete stylesheet to
start from:

```js
createCornerEditor({
  container,
  image,
  corners,
  injectStyles: false // ← we provide all the CSS ourselves
})
```

```css
/* Handles — positioned by the editor; you own the look. */
.scanic-handle {
  position: absolute;
  width: 18px;
  height: 18px;
  margin: 0;
  padding: 0;
  border: 2px solid #0ea5e9;
  border-radius: 50%;
  background: #fff;
  transform: translate(-50%, -50%); /* centre on the corner point */
  cursor: grab;
  touch-action: none;
  transition: transform 0.12s ease;
}
.scanic-handle:hover { transform: translate(-50%, -50%) scale(1.15); }

/* Grabbed state — give it your own sense of depth. */
.scanic-handle.is-active {
  cursor: grabbing;
  background: #0ea5e9;
  transform: translate(-50%, -50%) scale(1.3);
  box-shadow: 0 8px 20px rgba(2, 132, 199, 0.5);
}

/* Toolbar (Reset · Cancel · Apply). */
.scanic-toolbar {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 10px;
  background: #0f172a;
}
.scanic-toolbar button {
  border: 0;
  padding: 8px 14px;
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  font-weight: 600;
  cursor: pointer;
}
.scanic-toolbar .scanic-btn-apply { background: #0ea5e9; color: #fff; }
```

::: tip Two things the editor relies on
The handles are absolutely positioned and the editor sets their `left`/`top`
each frame, so keep `position: absolute` and the `translate(-50%, -50%)` centring.
Everything else — colours, sizes, shadows, transitions — is yours.
:::

## Options

| Option | Type | Description |
| :--- | :--- | :--- |
| `container` | `HTMLElement` | Host element the editor mounts into. **Required.** |
| `image` | `HTMLImageElement \| HTMLCanvasElement \| ImageData` | Source image. **Required.** |
| `corners` | `CornerPoints` | Initial corners (image-space pixels). Defaults to an inset quad. |
| `toolbar` | `object` | `{ enabled, reset, cancel, apply, labels }` — floating icon toolbar (shown by default). `labels` are used as hover tooltips. |
| `theme` | `object` | Programmatic CSS-variable overrides (see above). |
| `classNames` | `object` | `{ root, handle, toolbar, nudges }` extra classes. |
| `injectStyles` | `boolean` | Inject the default stylesheet. Default `true`. |
| `magnifier` | `object` | `{ enabled, size, zoom, margin, borderColor, borderWidth, crosshairColor, crosshairSize }` |
| `nudges` | `object` | `{ enabled, steps }` — precision nudge pad for the selected corner (off by default). With the toolbar on it appears behind an expert toggle; otherwise it's always visible. |
| `handleHitArea` | `number` | Pointer/touch target size (px). Default `44`. |
| `keyboard` | `boolean` | Enable arrow-key control. Default `true`. |
| `onChange` | `(corners) => void` | Fired on every change (drag, nudge, keyboard). |
| `onConfirm` | `(corners) => void` | Fired by Apply / `confirm()` / Enter. |
| `onCancel` | `() => void` | Fired by Cancel / `cancel()` / Escape. |

## Returned instance

`createCornerEditor` returns a handle you can drive programmatically:

```ts
interface CornerEditor {
  getCorners(): CornerPoints
  setCorners(corners: CornerPoints): boolean
  reset(): void
  nudge(cornerKey, dx, dy, step?): boolean
  refreshTheme(theme?): void  // re-read CSS vars after a runtime theme change
  confirm(): CornerPoints
  cancel(): void
  destroy(): void
}
```

::: warning Clean up
Call `editor.destroy()` when you're done (after confirm/cancel, or when
unmounting a component) to remove listeners, handles, and restore the host.
:::
