// @vitest-environment node
//
// onnxruntime-web creates its wasm thread pool with the FIRST session in a
// process and keeps it. A later session asking for a different numThreads runs
// on the existing pool regardless, so scanic must say so instead of handing back
// a second session that only looks like it honoured the request.
//
// Own file because that state is per process; vitest isolates each test file
// (pool: 'forks').
import { describe, it, expect, beforeAll, vi } from 'vitest';
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

describe('mlDetector thread pool', () => {
  it('warns and reuses the locked thread count when a later call asks for another', async () => {
    if (!available) {
      console.warn('[mlDetector.threadLock.test] skipped: onnxruntime-web or scanic-ml assets unavailable');
      return;
    }

    const options = {
      inputData: new Float32Array(224 * 224 * 3).fill(0.1),
      modelBytes,
      assetBaseUrl: pathToFileURL(distDir).href + '/'
    };
    const image = { width: 640, height: 480, data: new Uint8ClampedArray(1) };

    // First session locks the pool at 1 thread.
    const first = await detectDocumentMl(image, { ...options, numThreads: 1 });
    expect(first.corners).toBeTruthy();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const second = await detectDocumentMl(image, { ...options, numThreads: 4 });
      expect(second.corners).toEqual(first.corners);
      expect(warn.mock.calls.flat().join(' ')).toMatch(/locked its thread pool at 1 thread/);
    } finally {
      warn.mockRestore();
    }
  }, 60000);

  it('does not warn when the same thread count is requested again', async () => {
    if (!available) return;

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      await detectDocumentMl(
        { width: 640, height: 480, data: new Uint8ClampedArray(1) },
        {
          inputData: new Float32Array(224 * 224 * 3).fill(0.1),
          modelBytes,
          assetBaseUrl: pathToFileURL(distDir).href + '/',
          numThreads: 1
        }
      );
      expect(warn.mock.calls.flat().join(' ')).not.toMatch(/locked its thread pool/);
    } finally {
      warn.mockRestore();
    }
  }, 60000);
});
