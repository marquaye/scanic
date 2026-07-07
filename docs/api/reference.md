# API Reference

Scanic exports four entry points:

- [`scanDocument`](#scandocument): detect and (optionally) extract a document.
- [`extractDocument`](#extractdocument): warp a document using corners you provide.
- [`Scanner`](#scanner): a reusable, stateful scanner (keeps WASM warm).
- [`createCornerEditor`](#createcornereditor): the manual corner-editing UI.

There's also [`initialize()`](#initialize), an optional WASM warm-up helper.

## `scanDocument`

```ts
function scanDocument(
  image: HTMLImageElement | HTMLCanvasElement | ImageData,
  options?: DetectionOptions
): Promise<ScannerResult>
```

The primary function. In `detect` mode it returns corner coordinates; in
`extract` mode it also returns the perspective-corrected image.

```js
const result = await scanDocument(img, { mode: 'extract', output: 'canvas' })
```

### Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `'detect' \| 'extract'` | `'detect'` | `detect` returns coordinates; `extract` returns the warped image. |
| `output` | `'canvas' \| 'imagedata' \| 'dataurl'` | `'canvas'` | Format of the returned processed image. |
| `detector` | `'classical' \| 'ml'` | `'classical'` | Detection backend. `'ml'` uses the optional DocCornerNet model, see the [ML Detection guide](/guide/ml-detection). |
| `ml` | `MlDetectorOptions` | - | Options for the ML detector (`assetBaseUrl`, `modelUrl`, `numThreads`, `minScore`, …). Only used when `detector: 'ml'`. |
| `maxProcessingDimension` | `number` | `800` | Downscale to this size for detection (faster). Classical only. |
| `lowThreshold` | `number` | adaptive | Lower Canny threshold. Omit (with `highThreshold`) for adaptive. |
| `highThreshold` | `number` | adaptive | Upper Canny threshold. |
| `applyDilation` | `boolean` | `true` | Enable dilation in the primary pass. |
| `dilationKernelSize` | `number` | `3` | Dilation kernel size for edge connection. |
| `dilationIterations` | `number` | `1` | Number of dilation passes. |
| `minArea` | `number` | `1000` | Minimum pixel area to consider a contour a document. |
| `enableDetectionCascade` | `boolean` | `true` | Enable fallback pass profiles for hard images. |
| `minCascadeTriggerConfidence` | `number` | `0.68` | Confidence below which extra pass profiles are tried. |
| `maxCandidateContours` | `number` | `12` | Number of largest contours scored per pass. |
| `minDocumentCoverageRatio` | `number` | `0.04` | Minimum image coverage for a valid candidate. |
| `minDocumentFillRatio` | `number` | `0.07` | Minimum contour fill ratio within its bounding box. |
| `maxDocumentAspectRatio` | `number` | `8` | Maximum accepted aspect ratio for candidates. |
| `debug` | `boolean` | `false` | Return intermediate processing steps in `result.debug`. |

::: details Advanced tuning options
These finer-grained scoring controls are also accepted (see the TypeScript
`DetectionOptions` type): `epsilon`, `minDetectionConfidence`,
`minDocumentSideRatio`, `minContourFitRatio`, `maxContourFitRatio`,
`minRightAngleScore`, `minOppositeSideConsistency`, `useWasmHysteresis`,
`useWasmFullCanny`. Most projects never need to touch these.
:::

### Return value

```ts
interface ScannerResult {
  success: boolean       // Was a document found?
  message: string        // Status or error message
  confidence?: number | null
  score?: number | null          // P(document present), ML detector only
  corners: CornerPoints | null   // { topLeft, topRight, bottomRight, bottomLeft }
  output: HTMLCanvasElement | ImageData | string | null  // warped image (extract mode)
  contour: Point[] | null        // raw detection points
  debug: any | null              // intermediate steps (when debug: true)
  timings: { step: string; ms: string }[]  // performance breakdown
}
```

## `extractDocument`

```ts
function extractDocument(
  image: HTMLImageElement | HTMLCanvasElement | ImageData,
  corners: CornerPoints,
  options?: Pick<DetectionOptions, 'output'>
): Promise<ScannerResult>
```

Warps a document using corners **you** supply, typically the corners confirmed
by the [Corner Editor](/guide/corner-editor) or adjusted by the user.

```js
const extracted = await extractDocument(img, corners, { output: 'canvas' })
document.body.appendChild(extracted.output)
```

## `Scanner`

```ts
class Scanner {
  constructor(options?: DetectionOptions)
  initialize(): Promise<void>
  scan(image, options?: DetectionOptions): Promise<ScannerResult>
}
```

A stateful wrapper that keeps a persistent WebAssembly instance, avoiding
per-call warm-up. Recommended for webcams and batch processing. Constructor
options become defaults for every `scan()` call (and are overridable per call).

```js
const scanner = new Scanner({ maxProcessingDimension: 1000 })
await scanner.initialize()           // optional; scan() initializes if needed
const result = await scanner.scan(img, { mode: 'extract' })
```

## `createCornerEditor`

```ts
function createCornerEditor(options: CornerEditorOptions): CornerEditor
```

Creates the interactive corner-adjustment UI. See the dedicated
[Corner Editor guide](/guide/corner-editor) for options, the returned instance,
and interaction details.

## `initialize`

```ts
function initialize(): Promise<unknown | null>
```

Optional, best-effort WASM warm-up. It **never rejects**. On engines that can't
run the WASM module it resolves to `null` and Scanic uses its pure-JS fallback.
Useful to pay the load cost ahead of a user's first scan.

```js
import { initialize } from 'scanic'
await initialize()
```

## Types

```ts
interface Point { x: number; y: number }

interface CornerPoints {
  topLeft: Point
  topRight: Point
  bottomRight: Point
  bottomLeft: Point
}
```

Full type definitions ship with the package (`scanic.d.ts`).
