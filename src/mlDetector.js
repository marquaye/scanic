/**
 * scanic: optional ML document-corner detector.
 *
 * This module is **never** imported by the classical pipeline. It is only
 * pulled in via a dynamic `import()` when `scanDocument(image, { detector:'ml' })`
 * is used, so classical-only users pay zero bytes for it.
 *
 * It runs a channel-slimmed SimCC model (DocCornerNet) on a custom *minimal*
 * ONNX Runtime Web build (~1.5 MB wasm, ~88% smaller than stock ort-web, same
 * MLAS SIMD kernels → same speed and accuracy). The wasm is pthread-capable and
 * runs on min(cores, 4) threads wherever SharedArrayBuffer exists (a cross-origin
 * isolated page, or Node), which is roughly 2x faster than a single thread, and
 * on 1 thread everywhere else.
 * The runtime (`onnxruntime-web`) is an optional dependency, and the model +
 * wasm assets ship in the companion `scanic-ml` package, served from a CDN by
 * default.
 *
 * I/O contract (see scanic-ml/MODEL_CARD.md):
 *   input  `image`        [1,224,224,3] float32 NHWC, RGB, x/255 then ImageNet norm
 *   output `coords`       [1,8] normalized 0–1, order TL,TR,BR,BL (x0,y0,…,x3,y3)
 *   output `score_logit`  [1,1] → sigmoid = P(document present)
 */

const MODEL_SIZE = 224;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const ORDER = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

// scanic-ml version whose CDN-mirrored assets this build is validated against.
const ML_ASSETS_VERSION = '0.2.0';
const DEFAULT_ASSET_BASE_URL = `https://cdn.jsdelivr.net/npm/scanic-ml@${ML_ASSETS_VERSION}/dist/`;

// Cache the ORT module and per-model sessions so repeated scans reuse them.
let ortModulePromise = null;
const sessionCache = new Map();

// onnxruntime-web spins up its wasm thread pool when the *first* session is
// created and keeps it for the lifetime of the page/worker. Later sessions
// silently run on that pool no matter what `numThreads` they ask for, so we
// track the count that was actually locked in and stop pretending otherwise.
let lockedNumThreads = null;

function resolveNumThreads(requested) {
  if (lockedNumThreads === null || requested === lockedNumThreads) {
    return requested;
  }
  console.warn(
    `scanic: onnxruntime-web locked its thread pool at ${lockedNumThreads} thread(s) when the first ` +
      `session was created; the requested ${requested} cannot take effect in this page/worker. ` +
      'Set the thread count on the first call, or run the new count in a fresh worker.'
  );
  return lockedNumThreads;
}

const DEFAULT_MODEL_FETCH_TIMEOUT_MS = 30000;

async function fetchModelBytes(modelUrl, timeoutMs) {
  const canAbort = typeof AbortController !== 'undefined' && timeoutMs > 0;
  const controller = canAbort ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetch(modelUrl, controller ? { signal: controller.signal } : undefined);
    if (!response.ok) {
      // Without this check an error page (404 HTML, CDN outage) would be handed
      // to ORT as model bytes and surface as an opaque parse failure.
      throw new Error(
        `scanic: failed to fetch the ML model from ${modelUrl} (HTTP ${response.status} ${response.statusText})`
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  } catch (error) {
    if (controller?.signal.aborted) {
      throw new Error(`scanic: timed out after ${timeoutMs}ms fetching the ML model from ${modelUrl}`, { cause: error });
    }
    if (error instanceof Error && error.message.startsWith('scanic:')) throw error;
    throw new Error(`scanic: failed to fetch the ML model from ${modelUrl} (${error?.message || error})`, { cause: error });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

// Measured on this model (see MODEL_CARD.md): 1 thread 13.2ms, 2 threads 8.8ms,
// 4 threads 6.4ms, 8 threads 7.5ms. Past 4 the pool oversubscribes and inference
// gets slower again, so 4 is the ceiling regardless of core count.
const MAX_USEFUL_THREADS = 4;

/**
 * Threads need SharedArrayBuffer, which a browser only exposes to a
 * cross-origin isolated page (COOP/COEP). Asking for more than one thread
 * without it makes ORT warn and silently fall back, so the default only raises
 * the count where it can actually take effect. Node has no isolation concept
 * and always supports the pool.
 */
function defaultNumThreads() {
  if (typeof SharedArrayBuffer === 'undefined') return 1;
  const inBrowser = typeof window !== 'undefined' || typeof importScripts === 'function';
  if (inBrowser && !globalThis.crossOriginIsolated) return 1;

  const cores = globalThis.navigator?.hardwareConcurrency
    || globalThis.process?.availableParallelism?.()
    || MAX_USEFUL_THREADS;
  return Math.max(2, Math.min(cores, MAX_USEFUL_THREADS));
}

async function loadOrt() {
  if (!ortModulePromise) {
    ortModulePromise = import('onnxruntime-web').catch((error) => {
      ortModulePromise = null;
      throw new Error(
        "scanic: failed to load the ML runtime (onnxruntime-web). " +
          "It is bundled with scanic's ESM build; if you use the UMD/CommonJS build, " +
          'install it alongside scanic: `npm install onnxruntime-web@1.27.x`. ' +
          `(original error: ${error?.message || error})`
      );
    });
  }
  return ortModulePromise;
}

async function getSession(options) {
  // There is a single wasm build (pthread-capable), used at every thread count.
  // See defaultNumThreads() for how the default is picked.
  const baseUrl = options.assetBaseUrl ? normalizeBaseUrl(options.assetBaseUrl) : DEFAULT_ASSET_BASE_URL;
  const modelUrl = options.modelUrl || `${baseUrl}doccornernet_lean.ort`;
  const wasmPaths = options.wasmPaths || baseUrl;
  const requestedThreads = options.numThreads !== undefined
    ? options.numThreads
    : (options.threaded ? MAX_USEFUL_THREADS : defaultNumThreads());
  // A thread count that can't take effect must not create a second session that
  // only looks distinct, so the key uses the effective count.
  const numThreads = resolveNumThreads(requestedThreads);
  const fetchTimeoutMs = options.modelFetchTimeoutMs !== undefined
    ? options.modelFetchTimeoutMs
    : DEFAULT_MODEL_FETCH_TIMEOUT_MS;

  const cacheKey = `${modelUrl}|${wasmPaths}|${numThreads}`;
  if (sessionCache.has(cacheKey)) return sessionCache.get(cacheKey);

  const sessionPromise = (async () => {
    const ort = await loadOrt();

    // Point ORT at our custom minimal wasm assets.
    ort.env.wasm.wasmPaths = wasmPaths;
    ort.env.wasm.numThreads = numThreads;
    ort.env.wasm.proxy = false;

    const modelBytes = options.modelBytes || (await fetchModelBytes(modelUrl, fetchTimeoutMs));
    const session = await ort.InferenceSession.create(modelBytes, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });
    return { ort, session };
  })();

  // Claim the pool now rather than after the await: concurrent callers asking
  // for different counts must all resolve to the one that actually gets built.
  const previousLockedNumThreads = lockedNumThreads;
  lockedNumThreads = numThreads;
  sessionCache.set(cacheKey, sessionPromise);
  try {
    return await sessionPromise;
  } catch (error) {
    sessionCache.delete(cacheKey); // allow a retry after a transient load failure
    // Nothing was created, so a later call may still pick the thread count -
    // unless another session did get through in the meantime.
    if (sessionCache.size === 0) lockedNumThreads = previousLockedNumThreads;
    throw error;
  }
}

// Same as getImageSize in imageSource.js, kept local so this lazy chunk shares
// no module with index.js (a shared module would become an unshipped chunk).
// Intrinsic sizes come first: `<img>.width` is the rendered width and
// `<video>.width` the usually unset attribute.
function getImageDimensions(image) {
  if (!image) throw new Error('No image provided');
  const width = image.naturalWidth || image.videoWidth || image.displayWidth || image.width;
  const height = image.naturalHeight || image.videoHeight || image.displayHeight || image.height;
  if (!(width > 0 && height > 0)) {
    throw new Error(
      'scanic: the image has no pixels yet. Wait for an <img> to load, or for a <video> to fire loadedmetadata.'
    );
  }
  return { width, height };
}

/**
 * Draw the image into a 224×224 RGB tensor with ImageNet normalization (NHWC).
 * Uses OffscreenCanvas when available, falling back to a DOM canvas. Same
 * strategy the classical pipeline uses.
 */
function preprocess(image, width, height) {
  const useOffscreen = typeof OffscreenCanvas !== 'undefined';
  const canvas = useOffscreen
    ? new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE)
    : document.createElement('canvas');
  if (!useOffscreen) {
    canvas.width = MODEL_SIZE;
    canvas.height = MODEL_SIZE;
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';

  const isImageData =
    image && typeof image.width === 'number' && typeof image.height === 'number' && image.data;
  if (isImageData) {
    const tmp = useOffscreen
      ? new OffscreenCanvas(image.width, image.height)
      : document.createElement('canvas');
    if (!useOffscreen) {
      tmp.width = image.width;
      tmp.height = image.height;
    }
    tmp.getContext('2d').putImageData(image, 0, 0);
    ctx.drawImage(tmp, 0, 0, image.width, image.height, 0, 0, MODEL_SIZE, MODEL_SIZE);
  } else {
    ctx.drawImage(image, 0, 0, width, height, 0, 0, MODEL_SIZE, MODEL_SIZE);
  }

  const { data } = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);
  const tensor = new Float32Array(MODEL_SIZE * MODEL_SIZE * 3);
  for (let p = 0, o = 0; p < data.length; p += 4, o += 3) {
    tensor[o] = (data[p] / 255 - MEAN[0]) / STD[0];
    tensor[o + 1] = (data[p + 1] / 255 - MEAN[1]) / STD[1];
    tensor[o + 2] = (data[p + 2] / 255 - MEAN[2]) / STD[2];
  }
  return tensor;
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function decodeOutputs(outputs, width, height) {
  let coords = null;
  let scoreLogit = null;
  for (const key in outputs) {
    const d = outputs[key].data;
    if (d.length === 8) coords = d;
    else if (d.length === 1) scoreLogit = d[0];
  }
  if (!coords) return null;

  const corners = {};
  for (let i = 0; i < 4; i++) {
    corners[ORDER[i]] = { x: coords[i * 2] * width, y: coords[i * 2 + 1] * height };
  }
  const score = scoreLogit === null ? null : sigmoid(scoreLogit);
  return { corners, score };
}

/**
 * Run the ML corner detector on an image.
 *
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image
 * @param {Object} [mlOptions] - `options.ml` forwarded from scanDocument.
 *   - assetBaseUrl  Base URL for the wasm + model (default: scanic-ml on jsDelivr).
 *   - modelUrl      Explicit model URL (overrides assetBaseUrl for the model).
 *   - wasmPaths     Explicit wasm directory (overrides assetBaseUrl for the wasm).
 *   - modelBytes    Pre-fetched model bytes (skips the network fetch).
 *   - modelFetchTimeoutMs  Abort the model fetch after this many ms (default 30000; 0 disables).
 *   - threaded      Forces numThreads to 4. Rarely needed now that the default
 *                    already uses threads wherever they work.
 *   - numThreads    ORT thread count. Defaults to min(cores, 4) on a cross-origin
 *                    isolated page or in Node, and to 1 anywhere SharedArrayBuffer
 *                    is unavailable. Only the first session in a page/worker can
 *                    set it: ORT locks its thread pool there, and later differing
 *                    values warn and are ignored.
 *   - minScore      Minimum P(document) to report success (default 0.5).
 * @returns {Promise<{success, corners, confidence, score, timings, message}>}
 */
export async function detectDocumentMl(image, mlOptions = {}) {
  const timings = [];
  const { width, height } = getImageDimensions(image);

  let t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const { session } = await getSession(mlOptions);
  timings.push({ step: 'ML Session Load', ms: (((typeof performance !== 'undefined' ? performance : Date).now()) - t0).toFixed(2) });

  const ortMod = await loadOrt();
  t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  // `inputData` lets callers supply their own normalized [1,224,224,3] NHWC tensor
  // (also used by tests to exercise inference without a canvas backend).
  const inputData = mlOptions.inputData || preprocess(image, width, height);
  const tensor = new ortMod.Tensor('float32', inputData, [1, MODEL_SIZE, MODEL_SIZE, 3]);
  timings.push({ step: 'ML Preprocess', ms: (((typeof performance !== 'undefined' ? performance : Date).now()) - t0).toFixed(2) });

  t0 = (typeof performance !== 'undefined' ? performance : Date).now();
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  timings.push({ step: 'ML Inference', ms: (((typeof performance !== 'undefined' ? performance : Date).now()) - t0).toFixed(2) });

  const decoded = decodeOutputs(outputs, width, height);
  if (!decoded) {
    return { success: false, corners: null, confidence: null, score: null, message: 'ML model produced no coordinates', timings };
  }

  const minScore = mlOptions.minScore !== undefined ? mlOptions.minScore : 0.5;
  const success = decoded.score === null ? true : decoded.score >= minScore;

  return {
    success,
    corners: decoded.corners,
    confidence: decoded.score,
    score: decoded.score,
    message: success ? 'Document detected (ml)' : 'No confident document (ml)',
    timings
  };
}

/**
 * Warm up the ML detector (load ORT + model) ahead of first use.
 * @param {Object} [mlOptions]
 */
export async function initializeMl(mlOptions = {}) {
  await getSession(mlOptions);
}
