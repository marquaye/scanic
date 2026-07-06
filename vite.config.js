import { defineConfig } from 'vite';

export default defineConfig({
  base: './', 
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
});