// @vitest-environment node
//
// cannyEdgeDetector has two implementations of the same pipeline: the default
// step-by-step path (WASM blur/NMS/dilation, JS gradients + hysteresis) and the
// `useWasmFullCanny` fast path, which keeps every stage inside WASM linear
// memory. They must agree bit for bit - that equivalence is what makes the fast
// path safe to opt into (and, eventually, to default to).
import { describe, it, expect } from 'vitest';
import { cannyEdgeDetector, convertToGrayscale } from './edgeDetection.js';

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
