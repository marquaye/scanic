// @vitest-environment node
//
// cannyEdgeDetector has two implementations of the same pipeline: the default
// step-by-step path (WASM blur/NMS/dilation, JS gradients + hysteresis) and the
// `useWasmFullCanny` fast path, which keeps every stage inside WASM linear
// memory. They must agree bit for bit - that equivalence is what makes the fast
// path safe to opt into (and, eventually, to default to).
import { describe, it, expect } from 'vitest';
import {
  cannyEdgeDetector,
  computeAdaptiveThresholds,
  convertToGrayscale,
  initializeWasm
} from './edgeDetection.js';
import { blur as wasmBlur, canny_edge_detector_full as wasmFullCanny } from '../wasm_blur/pkg/wasm_blur.js';

const WIDTH = 64;
const HEIGHT = 48;

// A bright rectangle on a dark background: strong, unambiguous edges.
function makeGrayscale() {
  const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const inside = x >= 12 && x < 52 && y >= 10 && y < 38;
      const v = inside ? 230 : 20;
      const i = (y * WIDTH + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return convertToGrayscale({ data, width: WIDTH, height: HEIGHT });
}

const baseOptions = {
  width: WIDTH,
  height: HEIGHT,
  skipGrayscale: true,
  lowThreshold: 75,
  highThreshold: 200,
  kernelSize: 5,
  sigma: 0
};

describe('cannyEdgeDetector WASM fast path', () => {
  for (const applyDilation of [false, true]) {
    it(`matches the step-by-step path (applyDilation: ${applyDilation})`, async () => {
      const grayscale = makeGrayscale();
      const options = { ...baseOptions, applyDilation };

      const stepByStep = await cannyEdgeDetector(grayscale, { ...options });
      const fullWasm = await cannyEdgeDetector(grayscale, { ...options, useWasmFullCanny: true });

      expect(fullWasm.length).toBe(WIDTH * HEIGHT);
      expect(Array.from(fullWasm)).toEqual(Array.from(stepByStep));
      // Sanity: the rectangle really does produce edges.
      expect(stepByStep.some((v) => v === 255)).toBe(true);
    });
  }

  it('agrees with the step-by-step path on adaptive thresholds too', async () => {
    const grayscale = makeGrayscale();
    const options = { width: WIDTH, height: HEIGHT, skipGrayscale: true };

    const stepByStep = await cannyEdgeDetector(grayscale, { ...options });
    const fullWasm = await cannyEdgeDetector(grayscale, { ...options, useWasmFullCanny: true });

    expect(Array.from(fullWasm)).toEqual(Array.from(stepByStep));
  });
});

// Called on the WASM exports directly: cannyEdgeDetector would swallow a trap
// and quietly fall back to JS, which is exactly what must not hide here.
describe('WASM on tiny images', () => {
  const sizes = [[0, 0], [1, 1], [1, 5], [2, 2], [3, 3], [2, 10], [10, 1], [4, 4]];

  for (const kernelSize of [3, 5, 7]) {
    it(`runs the full Canny without trapping (kernel ${kernelSize})`, async () => {
      await initializeWasm();
      for (const [w, h] of sizes) {
        const input = new Uint8Array(w * h).fill(100);
        const edges = wasmFullCanny(input, w, h, 40, 120, kernelSize, 0, false, true, 3);
        expect(edges.length, `${w}x${h}`).toBe(w * h);
      }
    });
  }

  it('blurs a uniform image to the same value, first column included (kernel 3)', async () => {
    await initializeWasm();
    const out = wasmBlur(new Uint8Array(8 * 8).fill(100), 8, 8, 3, 0);
    expect(Array.from(out).every((v) => v === 100)).toBe(true);
  });
});

describe('computeAdaptiveThresholds', () => {
  it('keeps the fallback pivot on a frame with no gradient at all', () => {
    const flat = new Uint8ClampedArray(32 * 32).fill(128);
    expect(computeAdaptiveThresholds(flat, 32, 32)).toEqual({ lowThreshold: 38, highThreshold: 113 });
  });

  it('keeps high above low on a near-flat, noisy frame', () => {
    // Faint +-1 noise, like a covered lens: tiny gradients only.
    const noisy = new Uint8ClampedArray(32 * 32);
    for (let i = 0; i < noisy.length; i++) noisy[i] = 128 + ((i * 7919) % 3) - 1;
    const { lowThreshold, highThreshold } = computeAdaptiveThresholds(noisy, 32, 32);
    expect(lowThreshold).toBe(5);
    expect(highThreshold).toBeGreaterThanOrEqual(10);
  });

  it('matches what cannyEdgeDetector computes when thresholds are left unset', async () => {
    const grayscale = makeGrayscale();
    const { lowThreshold, highThreshold } = computeAdaptiveThresholds(grayscale, WIDTH, HEIGHT);
    const options = { width: WIDTH, height: HEIGHT, skipGrayscale: true, useWasmFullCanny: true };

    const implicit = await cannyEdgeDetector(grayscale, { ...options });
    const explicit = await cannyEdgeDetector(grayscale, { ...options, lowThreshold, highThreshold });
    expect(Array.from(explicit)).toEqual(Array.from(implicit));
  });
});
