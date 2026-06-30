# scanic-ml

Optional ML assets for [scanic](https://github.com/marquaye/scanic)'s machine-learning
document-corner detector. Installing or hosting this is **only** needed if you use
`scanDocument(image, { detector: 'ml' })`. The classical scanic detector has no
dependency on this package.

## What's in here

| file | size | what |
|---|---|---|
| `dist/doccornernet_lean.ort` | ~1.9 MB | The corner-detection model — a channel-slimmed SimCC ([DocCornerNet](https://github.com/mapo80/DocCornerNet-CoordClass)), in ORT format. |
| `dist/ort-wasm-simd.wasm` | ~1.5 MB | A **custom minimal** ONNX Runtime Web build (SIMD, single-thread) compiled with only the ~18 operators this model uses — ~88% smaller than stock ort-web (13 MB), same MLAS kernels → same speed. |
| `dist/ort-wasm-simd-threaded.mjs` | ~12 KB | The emscripten loader (named for what `onnxruntime-web`'s JS expects). |

These are served from a CDN by default (jsDelivr mirrors npm), so most users never
install this package directly — scanic fetches the assets at runtime:

```
https://cdn.jsdelivr.net/npm/scanic-ml@<version>/dist/
```

## Usage

You generally don't import this package. You point scanic's ML detector at it:

```js
import { scanDocument } from 'scanic';
// ESM build bundles the ONNX Runtime JS — no extra install needed.

const result = await scanDocument(image, { detector: 'ml' });
// result.corners, result.score (P(document present))
```

To self-host (e.g. offline, or to avoid the CDN), install this package and serve
`dist/` from your own origin:

```js
await scanDocument(image, {
  detector: 'ml',
  ml: { assetBaseUrl: '/assets/scanic-ml/' } // contains the 3 files above
});
```

## Version pinning

The wasm is built from ONNX Runtime **v1.23.2**. The `onnxruntime-web` JS peer
dependency must be **1.23.x** — the JS↔wasm ABI is version-locked. The `.ort`
model format is likewise tied to that runtime.

## Reproducing the assets

The build is fully scripted and pinned — see [`build/`](./build). It converts the
source `.onnx` to `.ort`, clones ORT v1.23.2, and compiles the minimal wasm:

```bash
docker build -t scanic-ml-build scanic-ml/build
docker run --rm \
  -v "$PWD/scanic-ml:/work" \
  -v "$PWD/scripts/ml-spike/model:/model:ro" \
  scanic-ml-build
```

See [`MODEL_CARD.md`](./MODEL_CARD.md) for the model's I/O contract, accuracy, and
provenance.
