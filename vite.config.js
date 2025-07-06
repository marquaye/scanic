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
    sourcemap: true,
    minify: true
  },
  server: {
    open: './dev/debug.html'
  }
});