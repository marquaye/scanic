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
      // The ML detector lazy-imports onnxruntime-web; keep it external so it is
      // never bundled into scanic's classical build (and stays an optional dep).
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