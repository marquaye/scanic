# ML detection (optional)

Scanic's default detector is the classical Canny and contour pipeline. It is
small, fast, and needs no extra dependencies, and it handles clean documents
well. On harder photos (cluttered backgrounds, low contrast, or strong
perspective) it can miss the document. For those cases you can switch to a neural
detector that is more robust, at the cost of a one time download of about 2 MB
the first time it runs.

::: tip It is opt in
You enable the ML detector per call with `detector: 'ml'`. If your app never
passes that option, none of the ML code or assets are loaded, so it adds nothing
to what your users download. Your default scanning path stays exactly as it is.
:::

## Installation

```bash
npm install scanic
```

There is no separate package to install. The ONNX Runtime JavaScript API is
bundled inside scanic as a lazy chunk (about 50 KB, roughly 15 KB gzipped) that
loads only the first time you call `detector: 'ml'`. The model and the WebAssembly
runtime are fetched from a CDN on that first call, so you do not pin or manage any
runtime version yourself.

## Basic usage

```js
import { scanDocument } from 'scanic';

const result = await scanDocument(image, { detector: 'ml' });

if (result.success) {
  console.log(result.corners); // { topLeft, topRight, bottomRight, bottomLeft }
  console.log(result.score);   // P(document present), 0 to 1
}
```

`extract` mode works the same way. The detected corners feed the same perspective
warp:

```js
const { output } = await scanDocument(image, { detector: 'ml', mode: 'extract' });
```

::: tip Using the UMD or `<script>` build
The bundled runtime applies to the ESM build (the `import` path). If you load
scanic through `require('scanic')` or a `<script>` tag and want ML, add
`onnxruntime-web@1.23.x` to your page yourself. It stays external in that build
because the UMD format cannot split code into separate chunks.
:::

## Warming up

The first ML scan loads the runtime and model (about 2 MB). To avoid that delay
on the first user action, warm it up ahead of time with the `Scanner` class:

```js
import { Scanner } from 'scanic';

const scanner = new Scanner({ detector: 'ml' });
await scanner.initialize();   // fetches and compiles the wasm and model
const result = await scanner.scan(image);
```

## Options

All ML options live under `options.ml`:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `assetBaseUrl` | `string` | jsDelivr `scanic-ml` | Base URL that serves the `.wasm` and `.ort` assets. Set this to self host. |
| `modelUrl` | `string` | `${assetBaseUrl}doccornernet_lean.ort` | Explicit model URL. |
| `wasmPaths` | `string` | `assetBaseUrl` | Directory for the ORT wasm and loader. |
| `modelBytes` | `Uint8Array` | (none) | Pre fetched model bytes, which skips the network request. |
| `numThreads` | `number` | `1` | ORT thread count. Values above 1 need COOP and COEP headers (see below). |
| `minScore` | `number` | `0.5` | Minimum P(document) for `success` to be `true`. |

## Self hosting (offline or no CDN)

If you cannot rely on the CDN, install the companion
[`scanic-ml`](https://www.npmjs.com/package/scanic-ml) package, serve its `dist/`
folder from your own origin, and point scanic at it:

```js
await scanDocument(image, {
  detector: 'ml',
  ml: { assetBaseUrl: '/assets/scanic-ml/' }
});
```

## Threads (advanced)

The shipped wasm is single threaded (about 10 ms per scan) and works on any page
with no special headers. A multi threaded build (about 4 ms per scan) needs both
a four thread wasm build and
[cross origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated)
(`COOP: same-origin` and `COEP: require-corp`). Most apps do not need this.

## Classical or ML: which to use

| | Classical (default) | ML (`detector: 'ml'`) |
| :--- | :--- | :--- |
| Extra download | none | about 15 KB gzipped JS, then about 2 MB of assets on first use |
| Dependencies | none | none. The runtime is bundled, assets come from a CDN |
| Latency | 3 to 10 ms | about 10 ms (single thread) |
| Clean documents | excellent | excellent |
| Cluttered, low contrast, or skewed | can miss | more robust |

A good default is to run classical first and fall back to ML when the classical
result is missing or low confidence, or to use ML directly for camera scenes you
know are messy.

## How it stays small and fast

The ML detector is deliberately small. The model is a channel slimmed SimCC
network ([DocCornerNet](https://github.com/mapo80/DocCornerNet-CoordClass)) that
treats each corner coordinate as a 1D classification over pixel bins, then takes a
soft argmax. At 456K parameters it reaches a median error around 2 to 3 px,
sub pixel on clean documents, and is faster and smaller than the larger baseline
it replaced. All of this is plain fp32. Quantization was tried and made things
worse: INT8 roughly doubled WASM latency because the per operator overhead on such
a small model costs more than it saves.

The runtime is the part that is usually large. Stock `onnxruntime-web` ships 13 to
26 MB of WASM, which would dwarf scanic. Other options were measured rather than
guessed:

| Approach | wasm size | latency (single thread) | result |
| :--- | :--- | :--- | :--- |
| stock onnxruntime-web | 13 MB | about 10 ms | too large |
| WebGPU backend | n/a | about 358 ms | 35x slower, per dispatch overhead on a small graph |
| tract (pure Rust ONNX to WASM) | 4.1 MB | about 104 ms | 10x slower, no MLAS class kernels |
| hand written WASM kernels | about 0.5 MB | about 100 ms (projected) | slower and weeks of work |
| custom minimal ORT build | 1.5 MB | about 11 ms | chosen |

ONNX Runtime can be compiled for the web with only the operators a specific model
uses, dropping the ONNX parser, RTTI, and exception handling, while keeping the
same MLAS SIMD kernels. This model needs about 18 operators. The result is a
1.5 MB wasm (about 527 KB gzipped), roughly 88 percent smaller than stock, with
the same single thread latency as stock ORT and output that matches it to within
about 0.00004. The build is scripted and reproducible in
[`scanic-ml/build/`](https://github.com/marquaye/scanic/tree/main/scanic-ml/build).

The net effect for you: a single `npm install scanic`, nothing extra for users who
do not use ML, and about 2 MB of lazy assets for users who do, at full ORT speed
and accuracy.
