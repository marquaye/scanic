import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.js',
      name: 'scanic',
      fileName: 'scanic',
      formats: ['es', 'umd']
    },
    outDir: 'dist',
    sourcemap: true,
    minify: true
  },
  server: {
    open: '/debug.html'
  }
});