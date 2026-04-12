#!/usr/bin/env node
/**
 * Benchmark: step-by-step WASM calls vs single full-Canny WASM call.
 *
 * Loads the .wasm binary from disk (bypassing fetch) so we can actually
 * measure WASM performance in Node.js.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, ImageData } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ── DOM shims ──────────────────────────────────────────────────
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = ImageData;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement(tag) {
      if (tag === 'canvas') return createCanvas(1, 1);
      throw new Error(`Unsupported: ${tag}`);
    }
  };
}

// ── Load WASM from disk into the module ────────────────────────
const wasmPath = path.join(rootDir, 'wasm_blur', 'pkg', 'wasm_blur_bg.wasm');
const wasmBytes = fs.readFileSync(wasmPath);

const {
  initSync,
  blur,
  calculate_gradients,
  non_maximum_suppression,
  hysteresis_thresholding_binary,
  dilate,
  canny_edge_detector_full,
} = await import('../wasm_blur/pkg/wasm_blur.js');

initSync(wasmBytes);
console.log('WASM loaded from disk.\n');

// ── Helpers ────────────────────────────────────────────────────
function toGrayscale(imageData) {
  const { width, height, data } = imageData;
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    gray[j] = (data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8;
  }
  return gray;
}

function edgesMatch(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }
  return { match: diff === 0, diffPixels: diff, total: a.length, pct: ((diff / a.length) * 100).toFixed(4) };
}

// ── Step-by-step WASM path (current production code) ───────────
function cannyStepByStep(gray, w, h, lowT, highT, kernelSize, sigma, l2, dilation, dilKernel) {
  const blurred = blur(gray, w, h, kernelSize, sigma);

  const gradientResult = calculate_gradients(blurred, w, h);
  const dx = new Int16Array(gradientResult.length / 2);
  const dy = new Int16Array(gradientResult.length / 2);
  for (let i = 0; i < dx.length; i++) {
    dx[i] = gradientResult[2 * i];
    dy[i] = gradientResult[2 * i + 1];
  }

  const suppressed = non_maximum_suppression(dx, dy, w, h, l2);

  const finalLow = l2 ? lowT * lowT : lowT;
  const finalHigh = l2 ? highT * highT : highT;
  const cannyEdges = hysteresis_thresholding_binary(suppressed, w, h, finalLow, finalHigh);

  let finalEdges = cannyEdges;
  if (dilation) {
    finalEdges = dilate(cannyEdges, w, h, dilKernel);
  }
  return new Uint8ClampedArray(finalEdges);
}

// ── Single WASM call path (new optimisation) ───────────────────
function cannySingleCall(gray, w, h, lowT, highT, kernelSize, sigma, l2, dilation, dilKernel) {
  return new Uint8ClampedArray(
    canny_edge_detector_full(gray, w, h, lowT, highT, kernelSize, sigma, l2, dilation, dilKernel)
  );
}

// ── Benchmark runner ───────────────────────────────────────────
async function benchmarkImage(imagePath) {
  const image = await loadImage(imagePath);
  const maxDim = 800;
  const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
  const w = Math.round(image.width * scale);
  const h = Math.round(image.height * scale);

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const gray = toGrayscale(imageData);

  const params = [gray, w, h, 75, 200, 5, 0, false, true, 5];
  const WARMUP = 3;
  const RUNS = 10;

  // Warm up
  for (let i = 0; i < WARMUP; i++) {
    cannyStepByStep(...params);
    cannySingleCall(...params);
  }

  // Benchmark step-by-step
  const stepTimes = [];
  let stepResult;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    stepResult = cannyStepByStep(...params);
    stepTimes.push(performance.now() - t0);
  }

  // Benchmark single call
  const singleTimes = [];
  let singleResult;
  for (let i = 0; i < RUNS; i++) {
    const t0 = performance.now();
    singleResult = cannySingleCall(...params);
    singleTimes.push(performance.now() - t0);
  }

  const stepAvg = stepTimes.reduce((a, b) => a + b) / RUNS;
  const singleAvg = singleTimes.reduce((a, b) => a + b) / RUNS;
  const comparison = edgesMatch(stepResult, singleResult);

  return { w, h, stepAvg, singleAvg, comparison };
}

// ── Main ───────────────────────────────────────────────────────
const imagesDir = path.join(rootDir, 'testImages');
const supported = new Set(['.png', '.jpg', '.jpeg']);
const imageFiles = fs.readdirSync(imagesDir)
  .filter(f => supported.has(path.extname(f).toLowerCase()))
  .sort();

console.log(`Benchmarking ${imageFiles.length} images (3 warmup, 10 timed runs each)\n`);

console.log('Image'.padEnd(22), 'Size'.padEnd(10), 'Step-by-step'.padStart(14), 'Single WASM'.padStart(14), 'Speedup'.padStart(9), 'Pixel diff'.padStart(12));
console.log('─'.repeat(85));

for (const imageName of imageFiles) {
  const result = await benchmarkImage(path.join(imagesDir, imageName));
  const speedup = result.stepAvg / result.singleAvg;
  const diffStr = result.comparison.match ? 'identical' : `${result.comparison.diffPixels} (${result.comparison.pct}%)`;

  console.log(
    imageName.padEnd(22),
    `${result.w}×${result.h}`.padEnd(10),
    `${result.stepAvg.toFixed(2)}ms`.padStart(14),
    `${result.singleAvg.toFixed(2)}ms`.padStart(14),
    `${speedup.toFixed(2)}x`.padStart(9),
    diffStr.padStart(12)
  );
}
