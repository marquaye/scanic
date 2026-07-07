// @vitest-environment node
//
// Integration test for the optional ML detector on the MULTI-THREAD wasm build
// (scanic-ml/dist/threaded/, `threaded: true`, 4 threads). Deliberately its own
// file: onnxruntime-web initializes its wasm thread pool once per process, so
// the only way to genuinely exercise the 4-thread path is to run it in a fresh
// process with no prior single-thread session. Vitest's default `pool: 'forks'`
// + `isolate: true` gives each test file its own process, so this file's first
// (and only) session initializes the pool at numThreads: 4.
//
// Skips automatically when the optional runtime or the companion threaded
// scanic-ml assets aren't present, so it never breaks a classical-only checkout.
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../scanic-ml/dist');
const threadedModelPath = path.join(distDir, 'threaded', 'doccornernet_lean.ort');

let available = false;
let detectDocumentMl;
let threadedModelBytes;

beforeAll(async () => {
  try {
    await import('onnxruntime-web');
    if (!fs.existsSync(threadedModelPath)) return;
    threadedModelBytes = new Uint8Array(fs.readFileSync(threadedModelPath));
    ({ detectDocumentMl } = await import('./mlDetector.js'));
    available = true;
  } catch {
    available = false;
  }
});

describe('mlDetector (multi-thread)', () => {
  it('runs inference on the multi-thread (threaded:true) wasm build with 4 threads', async () => {
    if (!available) {
      console.warn('[mlDetector.threaded.test] skipped: threaded scanic-ml/dist assets unavailable');
      return;
    }

    const inputData = new Float32Array(224 * 224 * 3).fill(0.1);
    const image = { width: 640, height: 480, data: new Uint8ClampedArray(1) };

    const res = await detectDocumentMl(image, {
      inputData,
      modelBytes: threadedModelBytes,
      assetBaseUrl: pathToFileURL(distDir).href + '/',
      threaded: true, // -> assetBaseUrl + 'threaded/', numThreads defaults to 4
    });

    expect(res).toBeTruthy();
    expect(typeof res.success).toBe('boolean');
    for (const k of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']) {
      expect(Number.isFinite(res.corners[k].x)).toBe(true);
      expect(Number.isFinite(res.corners[k].y)).toBe(true);
    }
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(1);
  }, 30000);
});
