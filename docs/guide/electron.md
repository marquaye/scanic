# Electron

Scanic works in Electron's renderer process just like in any browser — import it
and call `scanDocument`. Because the renderer is Chromium, the WASM core and the
Canvas warp are both available on modern Electron versions.

```js
import { scanDocument } from 'scanic'

const result = await scanDocument(img, { mode: 'extract' })
if (result.success) document.body.appendChild(result.output)
```

## Old Chromium versions

Some older Electron builds bundle a Chromium/V8 that **hard-crashes the process**
while compiling Scanic's SIMD WebAssembly module (notably Electron 13 /
Chromium 91). A normal `try/catch` can't recover from that kind of abort.

Scanic guards against this: before touching WASM it runs a static
`WebAssembly.validate()` feature probe (SIMD + reference-types). On engines that
fail the probe, it **never starts the WASM module** and uses the pure-JavaScript
implementation instead. You don't have to do anything — the same API works, just
a little slower on those old engines.

```js
import { initialize } from 'scanic'

// Optional, best-effort warm-up. Resolves to null (not a rejection)
// on engines where WASM can't run, so it's always safe to await.
await initialize()
```

::: tip Recommendation
Target a recent Electron (Chromium ≥ 96) to get the full WASM-accelerated path.
On anything older, Scanic still functions via its JS fallback.
:::

## Node integration vs. renderer

- **Renderer (recommended):** use Scanic directly, exactly like in a browser.
- **Main / Node context:** treat it like [Node.js](/guide/nodejs) — provide `canvas` and `jsdom` globals.
