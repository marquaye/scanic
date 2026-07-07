import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dev-only endpoint used by dev/annotate.html (the ground-truth corner
// annotation tool) to persist annotations straight to disk with one click,
// instead of requiring a manual "download + move file" step.
function groundTruthSavePlugin() {
  const outFile = path.join(__dirname, 'testImages', 'ground-truth.json');
  return {
    name: 'scanic-ground-truth-save',
    configureServer(server) {
      server.middlewares.use('/__save-ground-truth', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            fs.writeFileSync(outFile, `${JSON.stringify(parsed, null, 2)}\n`);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, file: 'testImages/ground-truth.json' }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: String(error?.message || error) }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [groundTruthSavePlugin()],
  // Only applied for the dev server (mode !== 'test'), not for Vitest: resolve
  // bare `onnxruntime-web` to its wasm-only "extern-wasm" flavour (same
  // resolution scripts/build-lib.mjs uses for the published ES build). The
  // default full package entry expects a `.jsep.` (WebGPU-capable) wasm+loader
  // pair that our custom minimal scanic-ml build doesn't ship, and fails with
  // "no available backend found" in a real browser. mlDetector.test.js /
  // baseline.ml.test.js run in Node and don't hit this path, so they're
  // unaffected by keeping this dev-only.
  resolve: mode === 'test' ? undefined : {
    alias: [{ find: /^onnxruntime-web$/, replacement: 'onnxruntime-web/wasm' }],
    conditions: [
      'onnxruntime-web-use-extern-wasm',
      'module',
      'browser',
      'production',
      'import',
      'default'
    ]
  },
  build: {
    lib: {
      entry: './src/index.js',
      name: 'scanic',
      fileName: 'scanic',
      formats: ['es', 'umd']
    },
    outDir: 'dist',
    sourcemap: 'hidden',
    rollupOptions: {
      // NOTE: the canonical library build is `npm run build` (scripts/build-lib.mjs),
      // which bundles onnxruntime-web into a lazy ESM chunk and keeps it external
      // only for UMD. This config is the fallback for a bare `vite build` / preview
      // and just keeps ORT external for both formats.
      external: ['onnxruntime-web']
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.js', 'src/scanic.d.ts'],
      reporter: ['text', 'html']
    }
  },
  server: {
    open: './dev/debug.html'
  }
}));