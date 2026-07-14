# scanic-ml

Optional ML assets for [scanic](https://github.com/marquaye/scanic)'s machine-learning
document-corner detector. Installing or hosting this is **only** needed if you use
`scanDocument(image, { detector: 'ml' })`. The classical scanic detector has no
dependency on this package.

## What's in here

| file | size | what |
|---|---|---|
| `dist/doccornernet_lean.ort` | ~1.9 MB | The corner-detection model, a channel-slimmed SimCC ([DocCornerNet](https://github.com/mapo80/DocCornerNet-CoordClass)), in ORT format. |
| `dist/ort-wasm-simd-threaded.wasm` | ~1.5 MB | A **custom minimal** ONNX Runtime Web build (SIMD, pthread-capable) compiled with only the ~18 operators this model uses, ~88% smaller than stock ort-web (13 MB), same MLAS kernels. Runs on 1 thread by default; a cross-origin isolated host page can request more (see [Threads](#threads) below). |
| `dist/ort-wasm-simd-threaded.mjs` | ~19 KB | The emscripten loader (named for what `onnxruntime-web`'s JS expects). |

These are served from a CDN by default (jsDelivr mirrors npm), so most users never
install this package directly. Scanic fetches the assets at runtime:

```
https://cdn.jsdelivr.net/npm/scanic-ml@<version>/dist/
```

## Usage

You generally don't import this package. You point scanic's ML detector at it:

```js
import { scanDocument } from 'scanic';
// ESM build bundles the ONNX Runtime JS. No extra install needed.

const result = await scanDocument(image, { detector: 'ml' });
// result.corners, result.score (P(document present))
```

To self-host (e.g. offline, or to avoid the CDN), install this package and serve
`dist/` from your own origin:

```js
await scanDocument(image, {
  detector: 'ml',
  ml: { assetBaseUrl: '/assets/scanic-ml/' } // contains the files above
});
```

## Threads

There is one wasm build, compiled with pthread support. It runs on 1 thread by
default (works anywhere, no special headers). Opt into more threads with
`threaded: true`:

```js
await scanDocument(image, {
  detector: 'ml',
  ml: { threaded: true } // same assets, defaults to 4 threads
});
```

Running on more than 1 thread needs the host page to be
[cross origin isolated](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated)
(`COOP: same-origin` + `COEP: require-corp` response headers) for
`SharedArrayBuffer` to be available; without that it falls back to running on
1 thread (same wasm, no error), so requesting it speculatively is safe. Running
this build on 1 thread costs about 4% versus a hypothetical dedicated
single-thread build, noise-level in absolute terms (see `MODEL_CARD.md`).

Multi-threading roughly halves inference time (see `MODEL_CARD.md`): about 1.8x
in Node and 2.1x in a cross-origin-isolated browser at 4 threads. The gain is on
the ML inference step. The end-to-end `detectDocumentMl` call improves less,
about 1.1x, because canvas preprocessing runs single-threaded. So it is a clear
win when inference dominates (repeated scans, larger inputs) and a modest one
for a single one-off scan.

## Version pinning

The wasm is built from ONNX Runtime **v1.27.0**. The `onnxruntime-web` JS peer
dependency must be **1.27.x**, the JS/wasm ABI is version-locked. The `.ort`
model format is likewise tied to that runtime.

## Reproducing the assets

The build is fully scripted and pinned, see [`build/`](./build). It converts the
source `.onnx` to `.ort`, clones ORT v1.27.0, and compiles the minimal
pthread-capable wasm:

```bash
docker build -t scanic-ml-build scanic-ml/build
docker run --rm \
  -v "$PWD/scanic-ml:/work" \
  -v "$PWD/scripts/ml-spike/model:/model:ro" \
  scanic-ml-build
```

See [`MODEL_CARD.md`](./MODEL_CARD.md) for the model's I/O contract, accuracy, and
provenance.
