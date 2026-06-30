// Two-pass library build.
//
// scanic's classical core must stay tiny and dependency-free, while the optional
// ML detector (lazy `import('./mlDetector.js')`, which imports onnxruntime-web)
// should "just work" after a plain `npm install scanic` — no separate
// onnxruntime-web install, and nothing extra in the classical bundle.
//
// We can't express that with a single Vite config because the two output
// formats need opposite treatment of onnxruntime-web:
//
//   ES  — bundle the wasm-only ORT JS API (~50 KB, ort.wasm.min.mjs) into a
//         SEPARATE lazy chunk via code-splitting, so classical ES consumers
//         never download it. The custom wasm + loader still stream from the CDN
//         at runtime via `ort.env.wasm.wasmPaths` (set in mlDetector.js).
//   UMD — can't code-split, so keep onnxruntime-web external; script-tag ML
//         users self-provide it (unchanged behaviour).
//
// We resolve the bare `onnxruntime-web` specifier to its `./wasm` subpath under
// the `onnxruntime-web-use-extern-wasm` export condition, which selects the
// extern-wasm wasm-only build (ort.wasm.min.mjs, ~50 KB). The all-in-one
// `ort.wasm.bundle.min.mjs` (the default for `./wasm`) is NOT usable here: it
// inlines stock ORT's own emscripten loader, which would not match our
// custom-built wasm (the custom wasm needs its matching custom loader, served
// from the CDN).
import { build } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const entry = path.resolve(root, 'src/index.js');
const terserOptions = { compress: { drop_console: true, drop_debugger: true } };

// Pass 1 — ES build with onnxruntime-web bundled into a lazy chunk.
await build({
  configFile: false,
  root,
  base: './',
  resolve: {
    // Resolve bare `onnxruntime-web` → its wasm-only subpath (exact match so we
    // don't rewrite the `/wasm` specifier recursively).
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
    // Select the extern-wasm flavour of the `./wasm` export (ort.wasm.min.mjs).
    conditions: [
      'onnxruntime-web-use-extern-wasm',
      'module',
      'browser',
      'production',
      'import',
      'default',
    ],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: 'hidden',
    minify: 'terser',
    terserOptions,
    // Keep the dynamic import of mlDetector (and onnxruntime-web) in its own
    // chunk so classical consumers don't pay for it.
    lib: { entry, name: 'scanic', formats: ['es'] },
    rollupOptions: {
      external: [],
      output: {
        entryFileNames: 'scanic.js',
        chunkFileNames: 'scanic-[name].js',
      },
    },
  },
});

// Pass 2 — UMD build with onnxruntime-web kept external.
await build({
  configFile: false,
  root,
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: 'hidden',
    minify: 'terser',
    terserOptions,
    lib: { entry, name: 'scanic', formats: ['umd'], fileName: () => 'scanic.umd.cjs' },
    rollupOptions: {
      external: ['onnxruntime-web'],
      output: { globals: { 'onnxruntime-web': 'ort' } },
    },
  },
});
