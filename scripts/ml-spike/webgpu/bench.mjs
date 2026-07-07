/**
 * WebGPU benchmark for DocCornerNet, runs in a real browser (Playwright).
 * Mirrors the Node WASM spike (preprocess / decode / IoU) so numbers compare
 * directly. Exposes window.__run() which the Playwright driver awaits.
 */
import * as ort from '/node_modules/onnxruntime-web/dist/ort.webgpu.bundle.min.mjs';
ort.env.wasm.wasmPaths = '/node_modules/onnxruntime-web/dist/';

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const SIZE = 224;
const WARMUP = 5;
const TIMED = 30;

const sigmoid = (x) => 1 / (1 + Math.exp(-x));
const median = (a) => { const s = [...a].sort((m, n) => m - n); const k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };

function preprocess(img) {
  const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const t = new Float32Array(SIZE * SIZE * 3);
  for (let p = 0, o = 0; p < data.length; p += 4, o += 3) {
    t[o] = (data[p] / 255 - MEAN[0]) / STD[0];
    t[o + 1] = (data[p + 1] / 255 - MEAN[1]) / STD[1];
    t[o + 2] = (data[p + 2] / 255 - MEAN[2]) / STD[2];
  }
  return new ort.Tensor('float32', t, [1, SIZE, SIZE, 3]);
}

function quadFromCoords(c, w, h) {
  const pt = (i) => ({ x: c[i * 2] * w, y: c[i * 2 + 1] * h });
  return [pt(0), pt(1), pt(2), pt(3)];
}
function baselineQuad(k) { return k ? [k.topLeft, k.topRight, k.bottomRight, k.bottomLeft] : null; }

function rasterize(poly, R) {
  const mask = new Uint8Array(R * R);
  let minY = R, maxY = 0;
  for (const p of poly) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  minY = Math.max(0, Math.floor(minY)); maxY = Math.min(R - 1, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i])), x1 = Math.min(R - 1, Math.floor(xs[i + 1]));
      for (let x = x0; x <= x1; x++) mask[y * R + x] = 1;
    }
  }
  return mask;
}
function rasterIoU(a, b, w, h) {
  const R = 256, sx = R / w, sy = R / h;
  const ma = rasterize(a.map((p) => ({ x: p.x * sx, y: p.y * sy })), R);
  const mb = rasterize(b.map((p) => ({ x: p.x * sx, y: p.y * sy })), R);
  let inter = 0, uni = 0;
  for (let i = 0; i < R * R; i++) { const ai = ma[i], bi = mb[i]; if (ai || bi) uni++; if (ai && bi) inter++; }
  return uni ? inter / uni : 0;
}

const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });

window.__run = async () => {
  const log = [];
  const adapter = await navigator.gpu?.requestAdapter?.();
  const info = adapter ? (adapter.info || (await adapter.requestAdapterInfo?.()) || {}) : null;
  log.push(`navigator.gpu: ${!!navigator.gpu}  adapter: ${adapter ? (info.description || info.vendor || 'present') : 'NONE'}`);

  const initT = performance.now();
  const session = await ort.InferenceSession.create('/scripts/ml-spike/model/doccornernet.onnx', {
    executionProviders: ['webgpu'],
  });
  log.push(`session init: ${(performance.now() - initT).toFixed(0)} ms  | EP requested: webgpu`);

  const baseline = await (await fetch('/testImages/baseline-results.json')).json();
  const inputName = session.inputNames[0];
  const rows = [];
  for (const cse of baseline.cases) {
    const img = await loadImg('/testImages/' + cse.image);
    const feeds = { [inputName]: preprocess(img) };
    for (let i = 0; i < WARMUP; i++) await session.run(feeds);
    const times = [];
    let out;
    for (let i = 0; i < TIMED; i++) { const s = performance.now(); out = await session.run(feeds); times.push(performance.now() - s); }
    let coords, score;
    for (const n of session.outputNames) { const d = out[n]; if (d.data.length === 8) coords = d.data; else if (d.data.length === 1) score = sigmoid(d.data[0]); }
    const ml = quadFromCoords(coords, img.naturalWidth, img.naturalHeight);
    const cls = baselineQuad(cse.detect?.corners);
    const iou = cls ? rasterIoU(ml, cls, img.naturalWidth, img.naturalHeight) : null;
    rows.push({ image: cse.image, latMed: median(times), score, iou });
  }
  const lats = rows.map((r) => r.latMed);
  const ious = rows.filter((r) => r.iou != null).map((r) => r.iou);
  const summary = {
    adapter: log,
    medianLatency: median(lats),
    meanIoU: ious.reduce((a, b) => a + b, 0) / ious.length,
    medianIoU: median(ious),
    rows: rows.map((r) => ({ image: r.image, latMed: +r.latMed.toFixed(1), score: +r.score.toFixed(3), iou: r.iou != null ? +r.iou.toFixed(3) : null })),
  };
  document.getElementById('out').textContent = JSON.stringify(summary, null, 2);
  return summary;
};
