// @vitest-environment node
//
// Integration test for the optional ML detector. Runs in the Node environment
// (onnxruntime-web's wasm backend works cleanly there). Skips automatically when
// the optional runtime or the companion `scanic-ml` assets aren't present, so it
// never breaks a classical-only CI checkout.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../scanic-ml/dist');
const modelPath = path.join(distDir, 'doccornernet_lean.ort');

let available = false;
let detectDocumentMl;
let modelBytes;

beforeAll(async () => {
  try {
    await import('onnxruntime-web');
    if (!fs.existsSync(modelPath)) return;
    modelBytes = new Uint8Array(fs.readFileSync(modelPath));
    ({ detectDocumentMl } = await import('./mlDetector.js'));
    available = true;
  } catch {
    available = false;
  }
});

describe('mlDetector', () => {
  it('runs inference on the minimal-build wasm and returns 4 corners + a score', async () => {
    if (!available) {
      console.warn('[mlDetector.test] skipped: onnxruntime-web or scanic-ml assets unavailable');
      return;
    }

    // A constant normalized input — we assert structure/contract, not exact coords.
    const inputData = new Float32Array(224 * 224 * 3).fill(0.1);
    const image = { width: 640, height: 480, data: new Uint8ClampedArray(1) };

    const res = await detectDocumentMl(image, {
      inputData,
      modelBytes,
      assetBaseUrl: pathToFileURL(distDir).href + '/',
    });

    expect(res).toBeTruthy();
    expect(typeof res.success).toBe('boolean');
    for (const k of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']) {
      expect(Number.isFinite(res.corners[k].x)).toBe(true);
      expect(Number.isFinite(res.corners[k].y)).toBe(true);
      // coords are scaled back into the original image dimensions
      expect(res.corners[k].x).toBeGreaterThanOrEqual(-image.width);
      expect(res.corners[k].x).toBeLessThanOrEqual(image.width * 2);
    }
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(1);
  }, 30000);
});
