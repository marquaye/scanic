# ML Detection (optional)

Scanic's default detector is the classical Canny + contour pipeline — tiny, fast,
and dependency-free. For **hard photos** (cluttered desks, low contrast, strong
perspective) you can opt into a neural detector that's far more robust, at the
cost of a one-time ~2 MB lazy download.

::: tip Classical stays the default
The ML detector is **fully opt-in and lazy-loaded**. If you never pass
`detector: 'ml'`, scanic's bundle and behaviour are exactly as before — no
onnxruntime, no model, ~15 KB gzipped core. Classical users pay nothing.
:::

## Using it

```bash
npm install scanic
```

That's it — no separate `onnxruntime-web` install. The ONNX Runtime **JS API**
(`InferenceSession`, `Tensor`) is bundled into scanic as a **lazy, code-split
chunk** (~50 KB, gzip ~15 KB) that is only loaded the first time you use
`detector: 'ml'`. Classical users never download it.

On that first ML call, the browser fetches ~2 MB from a CDN — a 1.9 MB model
plus the **custom 1.5 MB ONNX Runtime WASM** (~88% smaller than stock) — from
the companion [`scanic-ml`](https://www.npmjs.com/package/scanic-ml) package,
mirrored by jsDelivr. scanic ships the exact ABI-matched ORT JS, so there is
nothing to pin and no version mismatch to get wrong.

::: tip UMD / `<script>` users
The bundled chunk applies to the ESM build (the `import` path). If you consume
the UMD/CommonJS build (`require('scanic')` or a `<script>` tag) and want ML,
load `onnxruntime-web@1.23.x` yourself — it stays external there because UMD
can't code-split.
:::

```js
import { scanDocument } from 'scanic';

const result = await scanDocument(image, { detector: 'ml' });

if (result.success) {
  console.log(result.corners); // { topLeft, topRight, bottomRight, bottomLeft }
  console.log(result.score);   // P(document present), 0–1
}
```

`extract` mode works identically — the ML corners feed the same perspective warp:

```js
const { output } = await scanDocument(image, { detector: 'ml', mode: 'extract' });
```

### Warming up

The first ML scan loads the runtime + model (~2 MB). Warm it up ahead of time with
the `Scanner` class so the first user-facing scan is instant:

```js
import { Scanner } from 'scanic';

const scanner = new Scanner({ detector: 'ml' });
await scanner.initialize();          // fetches + compiles wasm + model
const result = await scanner.scan(image);
```

## Options

All under `options.ml`:

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `assetBaseUrl` | `string` | jsDelivr `scanic-ml` | Base URL serving the `.wasm` + `.ort` assets. Set this to self-host. |
| `modelUrl` | `string` | `${assetBaseUrl}doccornernet_lean.ort` | Explicit model URL. |
| `wasmPaths` | `string` | `assetBaseUrl` | Directory for the ORT wasm/loader. |
| `modelBytes` | `Uint8Array` | — | Pre-fetched model bytes (skips the network). |
| `numThreads` | `number` | `1` | ORT threads. `>1` needs COOP/COEP headers (see below). |
| `minScore` | `number` | `0.5` | Minimum P(document) for `success: true`. |

### Self-hosting (offline / no CDN)

```js
await scanDocument(image, {
  detector: 'ml',
  ml: { assetBaseUrl: '/assets/scanic-ml/' }
});
```

Install `scanic-ml` and copy its `dist/` (3 files) to that path.

### Threads (advanced)

The shipped wasm is **single-thread** (~10 ms/scan) so it works on any page with
no special headers. Multi-threading (~4 ms/scan) needs both a 4-thread build and
[cross-origin isolation](https://developer.mozilla.org/en-US/docs/Web/API/Window/crossOriginIsolated)
(`COOP: same-origin` + `COEP: require-corp`). Most apps don't need it.

## Classical vs ML — which to use?

| | Classical (default) | ML (`detector: 'ml'`) |
| :--- | :--- | :--- |
| **Download** | ~15 KB gz core | + ~15 KB gz JS chunk, then ~2 MB assets (lazy, once) |
| **Dependencies** | none | none — ORT JS bundled, assets from CDN |
| **Latency** | ~3–10 ms | ~10 ms (1 thread) |
| **Clean docs** | excellent | excellent |
| **Cluttered / low-contrast / skewed** | can degrade | robust |

Rule of thumb: ship **classical** by default; offer **ML** as a fallback when the
classical result is low-confidence, or for camera scenes you know are messy.

---

## The journey: how we got a small + fast ML detector

We wanted ML-grade robustness without betraying scanic's "small library" identity.
That tension drove a series of experiments — recorded here so the dead-ends stay
dead.

### 1. Architecture beats quantization

The first lesson was about the *model*, not the runtime:

- **Direct 8-coordinate regression** (MobileNetV2 + a regression head): median
  error ~25 px. ~8× worse than the alternative. Wrong architecture.
- **SimCC** (treat each coordinate as a 1D classification over pixel bins, then
  soft-argmax): **2–3 px** median, sub-pixel on clean docs. This is the
  [DocCornerNet](https://github.com/mapo80/DocCornerNet-CoordClass) approach.

Then we tried to shrink the SimCC model with **post-training quantization** (INT8,
fp16). It *backfired*: INT8 made WASM inference **~2× slower** (quantize/dequantize
overhead on the SimCC head exceeds the compute saved on such a small model), and
fp16 produced mixed-type graphs. The real lever turned out to be **architecture
slimming** — narrower FPN/head channels (α=0.35, 456K params). That beat the
600K-param baseline on *every* axis: **2.3 px median (vs 2.9), higher IoU, ~3×
faster, 26 % smaller — all in fp32**.

> **Takeaway:** for tiny vision models targeting WASM, slim the architecture; don't
> reach for quantization. PTQ's per-op overhead can cost more than it saves.

### 2. The runtime was the real size problem

The model was now 1.8 MB — fine. The runtime wasn't. Stock `onnxruntime-web`
ships **13–26 MB** of WASM. Bolting that onto a 38 KB-WASM library defeats the
purpose. We measured the alternatives instead of guessing:

| approach | wasm size | latency (1 thread) | verdict |
| :--- | :--- | :--- | :--- |
| stock onnxruntime-web | 13 MB | ~10 ms | too big ❌ |
| **WebGPU** backend | — | ~358 ms (**35× slower**) | per-dispatch overhead on a small op-heavy graph ❌ |
| **tract** (pure-Rust ONNX → WASM) | 4.1 MB | ~104 ms (**10× slower**) | no XNNPACK/MLAS-class kernels ❌ |
| **hand-written WASM kernels** | ~0.5 MB | ~100 ms (projected) | tract proves the floor; matching XNNPACK by hand = weeks, worse latency ❌ |
| **custom minimal ORT build** | **1.5 MB** | **~11 ms** | ✅ |

The decisive data point was **tract**: a mature Rust ONNX engine, compiled tiny,
but **10× slower** than ORT in WASM. That's because ORT's speed comes from
**MLAS/XNNPACK** — years of hand-tuned SIMD microkernels. Hand-writing our own
kernels would, optimistically, land at tract's ~100 ms — slower, for weeks of
risky work. WebGPU was worse still (35×), throttled by per-op dispatch overhead.

### 3. The winner: a model-specific ONNX Runtime build

ONNX Runtime can be **compiled from source for the web with only the operators a
specific model uses**, stripped of the ONNX parser, RTTI, and exception handling,
*while keeping the same MLAS SIMD kernels*. Our model needs ~18 ops.

The result:

- **1.52 MB wasm** (527 KB gzipped) — **~88 % smaller** than stock.
- **~11 ms** single-thread — identical to stock ORT (same kernels).
- **bit-identical output** — verified against stock ORT to within 4 × 10⁻⁵.

It requires converting the model to ORT's `.ort` format (minimal builds can't
parse `.onnx`) and pinning the `onnxruntime-web` JS to the matching version
(1.23.x — the JS↔wasm ABI is locked). The full build is scripted and reproducible
in [`scanic-ml/build/`](https://github.com/marquaye/scanic/tree/main/scanic-ml/build).

> **Takeaway:** before writing your own inference kernels, try a **reduced-operator
> ORT build**. You keep production-grade kernel speed and drop ~90 % of the size
> for free.

### Net result

ML mode costs classical users **nothing** (lazy, separate code-split chunk), and
ML users get a **single `npm install scanic`** plus **~2 MB total** (custom
runtime + model) at full ORT speed and accuracy — instead of 15 MB and a manual
peer-dependency install. The small-library promise survives.
