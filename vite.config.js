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