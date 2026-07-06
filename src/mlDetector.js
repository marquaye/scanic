/**
 * scanic — optional ML document-corner detector.
 *
 * This module is **never** imported by the classical pipeline. It is only
 * pulled in via a dynamic `import()` when `scanDocument(image, { detector:'ml' })`
 * is used, so classical-only users pay zero bytes for it.
 *
 * It runs a channel-slimmed SimCC model (DocCornerNet) on a custom *minimal*
 * ONNX Runtime Web build (~1.5 MB wasm, ~88% smaller than stock ort-web, same
 * MLAS SIMD kernels → same speed and accuracy). The runtime (`onnxruntime-web`)
 * is an optional dependency, and the model + wasm assets ship in the companion
 * `scanic-ml` package, served from a CDN by default.
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
const ML_ASSETS_VERSION = '0.1.0';
const DEFAULT_ASSET_BASE_URL = `https://cdn.jsdelivr.net/npm/scanic-ml@${ML_ASSETS_VERSION}/dist/`;

// Cache the ORT module and per-model sessions so repeated scans reuse them.
let ortModulePromise = null;
const sessionCache = new Map();

function normalizeBaseUrl(url) {
  return url.endsWith('/') ? url : `${url}/`;
}

async function loadOrt() {
  if (!ortModulePromise) {
    ortModulePromise = import('onnxruntime-web').catch((error) => {
      ortModulePromise = null;
      throw new Error(
        "scanic: failed to load the ML runtime (onnxruntime-web). " +
          "It is bundled with scanic's ESM build; if you use the UMD/CommonJS build, " +
          'install it alongside scanic: `npm install onnxruntime-web@1.23.x`. ' +
          `(original error: ${error?.message || error})`
      );
    });
  }
  return ortModulePromise;
}

async function getSession(options) {
  const baseUrl = normalizeBaseUrl(options.assetBaseUrl || DEFAULT_ASSET_BASE_URL);
  const modelUrl = options.modelUrl || `${baseUrl}doccornernet_lean.ort`;

  if (sessionCache.has(modelUrl)) return sessionCache.get(modelUrl);

  const sessionPromise = (async () => {
    const ort = await loadOrt();

    // Point ORT at our custom minimal wasm assets and keep it single-threaded
    // (no SharedArrayBuffer / cross-origin-isolation requirement on the host).
    ort.env.wasm.wasmPaths = options.wasmPaths || baseUrl;
    if (options.numThreads !== undefined) {
      ort.env.wasm.numThreads = options.numThreads;
    } else {
      ort.env.wasm.numThreads = 1;
    }
    ort.env.wasm.proxy = false;

    const modelBytes = options.modelBytes || new Uint8Array(await (await fetch(modelUrl)).arrayBuffer());
    const session = await ort.InferenceSession.create(modelBytes, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all'
    });
    return { ort, session };
  })();

  sessionCache.set(modelUrl, sessionPromise);
  try {
    return await sessionPromise;
  } catch (error) {
    sessionCache.delete(modelUrl); // allow a retry after a transient load failure
    throw error;
  }
}

function getImageDimensions(image) {
  const isImageData =
    image && typeof image.width === 'number' && typeof image.height === 'number' && image.data;
  if (isImageData) return { width: image.width, height: image.height };
  if (image) {
    return {
      width: image.width || image.naturalWidth,
      height: image.height || image.naturalHeight
    };
  }
  throw new Error('No image provided');
}

/**
 * Draw the image into a 224×224 RGB tensor with ImageNet normalization (NHWC).
 * Uses OffscreenCanvas when available, falling back to a DOM canvas — same
 * strategy the classical pipeline uses.
 */
function preprocess(image) {
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
    const w = image.width || image.naturalWidth;
    const h = image.height || image.naturalHeight;
    ctx.drawImage(image, 0, 0, w, h, 0, 0, MODEL_SIZE, MODEL_SIZE);
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
 *   - numThreads    ORT thread count (default 1; >1 needs COOP/COEP headers).
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
  const inputData = mlOptions.inputData || preprocess(image);
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
