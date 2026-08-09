// @vitest-environment node
//
// The model fetch must fail loudly. Before these guards existed, a 404 (or any
// CDN error page) was handed to ORT as model bytes and surfaced as an opaque
// ONNX parse error, and a hanging CDN hung scan() forever.
//
// Own file because mlDetector.js caches the ORT module and its thread-pool
// state per process; vitest isolates each test file (pool: 'forks').
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';

let available = false;
let initializeMl;

beforeAll(async () => {
  try {
    await import('onnxruntime-web');
    ({ initializeMl } = await import('./mlDetector.js'));
    available = true;
  } catch {
    available = false;
  }
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mlDetector model fetch', () => {
  it('rejects with the HTTP status when the model URL is not ok', async () => {
    if (!available) {
      console.warn('[mlDetector.modelFetch.test] skipped: onnxruntime-web unavailable');
      return;
    }

    vi.stubGlobal('fetch', async () => new Response('<html>not found</html>', {
      status: 404,
      statusText: 'Not Found'
    }));

    await expect(initializeMl({ modelUrl: 'https://example.invalid/model.ort' }))
      .rejects.toThrow(/HTTP 404/);
  }, 30000);

  it('aborts the fetch once modelFetchTimeoutMs elapses', async () => {
    if (!available) return;

    vi.stubGlobal('fetch', (url, init) => new Promise((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    }));

    await expect(initializeMl({
      modelUrl: 'https://example.invalid/slow.ort',
      modelFetchTimeoutMs: 50
    })).rejects.toThrow(/timed out after 50ms/);
  }, 30000);

  it('surfaces a network failure with the model URL', async () => {
    if (!available) return;

    vi.stubGlobal('fetch', async () => {
      throw new TypeError('fetch failed');
    });

    await expect(initializeMl({ modelUrl: 'https://example.invalid/gone.ort' }))
      .rejects.toThrow(/failed to fetch the ML model from https:\/\/example\.invalid\/gone\.ort/);
  }, 30000);
});
