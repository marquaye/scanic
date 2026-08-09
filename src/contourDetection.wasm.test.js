// @vitest-environment node
//
// The Suzuki tracer exists twice: once in JS (src/contourDetection.js) and once
// in Rust (wasm_blur/src/contours.rs). detectDocumentContour prefers the WASM
// one and silently falls back, so a regression there would be invisible - these
// tests pin that both produce exactly the same contours.
//
// The JS path is reachable because findContoursWasm returns null until the
// module is instantiated, so anything run before initializeWasm() uses JS.
import { describe, it, expect } from 'vitest';
import { detectDocumentContour } from './contourDetection.js';
import { initializeWasm, findContoursWasm, cannyEdgeDetector, convertToGrayscale } from './edgeDetection.js';

const WIDTH = 96;
const HEIGHT = 72;

// A rotated quad plus a smaller box and some speckle: several contours, corners
// in every direction, and collinear runs for CHAIN_APPROX_SIMPLE to collapse.
function makeEdges() {
  const rgba = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  const put = (x, y, v) => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 4;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
    rgba[i + 3] = 255;
  };
  for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) put(x, y, 15);
  for (let y = 8; y < 60; y++) {
    for (let x = 10; x < 80; x++) {
      const skewed = x - Math.floor((y - 8) * 0.35);
      if (skewed > 14 && skewed < 70) put(x, y, 235);
    }
  }
  for (let y = 20; y < 34; y++) for (let x = 30; x < 50; x++) put(x, y, 40);
  for (let i = 0; i < 40; i++) put((i * 7919) % WIDTH, (i * 104729) % HEIGHT, 200);
  return convertToGrayscale({ data: rgba, width: WIDTH, height: HEIGHT });
}

async function edgeMap() {
  return cannyEdgeDetector(makeEdges(), {
    width: WIDTH,
    height: HEIGHT,
    skipGrayscale: true,
    lowThreshold: 50,
    highThreshold: 150,
    useWasmFullCanny: false
  });
}

describe('contour detection: WASM vs JS tracer', () => {
  it('produces identical contours from both implementations', async () => {
    // Before initializeWasm() the WASM tracer is unavailable, so this is JS.
    expect(findContoursWasm(new Uint8ClampedArray(4), 2, 2, 4)).toBeNull();

    const edges = await edgeMap();
    const fromJs = detectDocumentContour(edges, { width: WIDTH, height: HEIGHT, minArea: 1 });

    await initializeWasm();
    expect(findContoursWasm(edges, WIDTH, HEIGHT, 4)).not.toBeNull(); // WASM path is live
    const fromWasm = detectDocumentContour(edges, { width: WIDTH, height: HEIGHT, minArea: 1 });

    // The fixture has to be non-trivial for the comparison to mean anything.
    expect(fromJs.length).toBeGreaterThan(3);
    expect(fromWasm.length).toBe(fromJs.length);

    for (let i = 0; i < fromJs.length; i++) {
      expect(fromWasm[i].id, `contour ${i} id`).toBe(fromJs[i].id);
      expect(fromWasm[i].isOuter, `contour ${i} isOuter`).toBe(fromJs[i].isOuter);
      expect(fromWasm[i].area, `contour ${i} area`).toBe(fromJs[i].area);
      expect(fromWasm[i].boundingBox, `contour ${i} bbox`).toEqual(fromJs[i].boundingBox);
      expect(fromWasm[i].points, `contour ${i} points`).toEqual(fromJs[i].points);
    }
  });

  it('applies the same min-area filter and area ordering', async () => {
    const edges = await edgeMap();
    await initializeWasm();
    const all = detectDocumentContour(edges, { width: WIDTH, height: HEIGHT, minArea: 1 });
    const big = detectDocumentContour(edges, { width: WIDTH, height: HEIGHT, minArea: 500 });

    expect(big.length).toBeLessThan(all.length);
    expect(big.every((c) => c.area >= 500)).toBe(true);
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].area).toBeGreaterThanOrEqual(all[i].area);
    }
  });
});
