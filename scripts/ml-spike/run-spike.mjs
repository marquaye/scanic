/**
 * ML detection spike — DocCornerNet (SimCC) via onnxruntime-web (WASM backend).
 *
 * Goal of step 1: answer two questions cheaply, in the *web* runtime path:
 *   1. What is the real in-browser-class inference latency (ORT-Web WASM CPU)?
 *   2. How well do the ML corners agree with Scanic's classical detector?
 *
 * We run onnxruntime-web's WASM backend under Node. Those are the *same*
 * kernels the browser ships, so the latency is representative of a desktop
 * browser on CPU (mobile will be slower; WebGPU may be faster).
 *
 * Model contract (decoded export, see DocCornerNet-CoordClass-V2/export.py):
 *   input : [1,224,224,3] float32, NHWC, RGB, x/255 then ImageNet-normalized
 *   output: coords [1,8] normalized 0..1 (x0,y0,x1,y1,x2,y2,x3,y3)
 *           score_logit [1,1] (sigmoid -> P(document present))
 *
 * Usage: node scripts/ml-spike/run-spike.mjs <path-to-model.onnx>
 */
import ort from 'onnxruntime-web';
import { loadImage, createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const imagesDir = path.join(rootDir, 'testImages');
const baselineFile = path.join(imagesDir, 'baseline-results.json');
const overlayDir = path.join(__dirname, 'overlays');

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const SIZE = 224;
const TIMED_RUNS = 30;
const WARMUP_RUNS = 5;

// Default to min(cpuCount, 4) with a floor of 2 — single-thread WASM is the
// worst-case browser baseline; multi-thread is the production target.
// Override with THREADS=N env var. Needs COOP/COEP headers in a real browser;
// in Node it uses worker_threads automatically.
import os from 'os';
const cpuThreads = Math.min(Math.max(os.cpus().length, 2), 4);
ort.env.wasm.numThreads = Number(process.env.THREADS ?? cpuThreads);
ort.env.wasm.simd = true;

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

/** Resize image to 224x224 and build a normalized NHWC float tensor. */
function preprocess(image) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0, image.width, image.height, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const t = new Float32Array(SIZE * SIZE * 3);
  for (let p = 0, o = 0; p < data.length; p += 4, o += 3) {
    t[o]     = (data[p]     / 255 - MEAN[0]) / STD[0];
    t[o + 1] = (data[p + 1] / 255 - MEAN[1]) / STD[1];
    t[o + 2] = (data[p + 2] / 255 - MEAN[2]) / STD[2];
  }
  return new ort.Tensor('float32', t, [1, SIZE, SIZE, 3]);
}

function cornersFromCoords(coords, w, h) {
  const pt = (i) => ({ x: coords[i * 2] * w, y: coords[i * 2 + 1] * h });
  return [pt(0), pt(1), pt(2), pt(3)];
}

function baselineQuad(c) {
  const k = c.detect?.corners;
  if (!k) return null;
  return [k.topLeft, k.topRight, k.bottomRight, k.bottomLeft];
}

/** Rasterized polygon IoU — order/winding independent. */
function rasterIoU(a, b, w, h) {
  const R = 256;
  const sx = R / w, sy = R / h;
  const ma = rasterize(a.map((p) => ({ x: p.x * sx, y: p.y * sy })), R);
  const mb = rasterize(b.map((p) => ({ x: p.x * sx, y: p.y * sy })), R);
  let inter = 0, uni = 0;
  for (let i = 0; i < R * R; i++) {
    const ai = ma[i], bi = mb[i];
    if (ai || bi) uni++;
    if (ai && bi) inter++;
  }
  return uni === 0 ? 0 : inter / uni;
}

function rasterize(poly, R) {
  const mask = new Uint8Array(R * R);
  let minY = R, maxY = 0;
  for (const p of poly) { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  minY = Math.max(0, Math.floor(minY));
  maxY = Math.min(R - 1, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) {
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const p1 = poly[i], p2 = poly[(i + 1) % poly.length];
      if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
        xs.push(p1.x + ((y - p1.y) / (p2.y - p1.y)) * (p2.x - p1.x));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i]));
      const x1 = Math.min(R - 1, Math.floor(xs[i + 1]));
      for (let x = x0; x <= x1; x++) mask[y * R + x] = 1;
    }
  }
  return mask;
}

function median(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

async function saveOverlay(image, mlQuad, classicQuad, name) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  const draw = (quad, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = Math.max(2, image.width / 300);
    ctx.beginPath();
    quad.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath(); ctx.stroke();
  };
  if (classicQuad) draw(classicQuad, '#22c55e'); // green = classical
  draw(mlQuad, '#ef4444');                        // red   = ML
  fs.writeFileSync(path.join(overlayDir, `${name}.png`), canvas.toBuffer('image/png'));
}

async function main() {
  const modelPath = process.argv[2];
  if (!modelPath || !fs.existsSync(modelPath)) {
    console.error('Usage: node run-spike.mjs <model.onnx>'); process.exit(1);
  }
  fs.mkdirSync(overlayDir, { recursive: true });

  const stat = fs.statSync(modelPath);
  console.log(`Model: ${modelPath} (${(stat.size / 1024).toFixed(0)} KB)`);

  const t0 = performance.now();
  const session = await ort.InferenceSession.create(modelPath, { executionProviders: ['wasm'] });
  console.log(`Session init: ${(performance.now() - t0).toFixed(0)} ms`);
  console.log('inputs:', session.inputNames, 'outputs:', session.outputNames);

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const inputName = session.inputNames[0];

  const files = fs.readdirSync(imagesDir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();

  const rows = [];
  for (const file of files) {
    const image = await loadImage(path.join(imagesDir, file));
    const feeds = { [inputName]: preprocess(image) };

    // Warmup + timed runs.
    for (let i = 0; i < WARMUP_RUNS; i++) await session.run(feeds);
    const times = [];
    let out;
    for (let i = 0; i < TIMED_RUNS; i++) {
      const s = performance.now();
      out = await session.run(feeds);
      times.push(performance.now() - s);
    }

    // Identify outputs by shape: coords = length-8, score = length-1.
    let coords, scoreLogit;
    for (const name of session.outputNames) {
      const d = out[name];
      if (d.data.length === 8) coords = d.data;
      else if (d.data.length === 1) scoreLogit = d.data[0];
    }
    const score = scoreLogit != null ? sigmoid(scoreLogit) : null;
    const mlQuad = cornersFromCoords(coords, image.width, image.height);

    const c = baseline.cases.find((x) => x.image === file);
    const classicQuad = c ? baselineQuad(c) : null;
    const iou = classicQuad ? rasterIoU(mlQuad, classicQuad, image.width, image.height) : null;

    await saveOverlay(image, mlQuad, classicQuad, file.replace(/\.[^.]+$/, ''));

    rows.push({
      image: file,
      dims: `${image.width}x${image.height}`,
      score: score != null ? score.toFixed(3) : '-',
      'lat_med_ms': median(times).toFixed(1),
      'lat_p95_ms': times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)].toFixed(1),
      'IoU_vs_classic': iou != null ? iou.toFixed(3) : '-',
    });
  }

  console.table(rows);
  const lats = rows.map((r) => Number(r.lat_med_ms));
  const ious = rows.filter((r) => r.IoU_vs_classic !== '-').map((r) => Number(r.IoU_vs_classic));
  console.log(`\nLatency  median-of-medians: ${median(lats).toFixed(1)} ms  (single-thread WASM+SIMD, CPU)`);
  console.log(`IoU vs classical  mean: ${(ious.reduce((a, b) => a + b, 0) / ious.length).toFixed(3)}  median: ${median(ious).toFixed(3)}`);
  console.log(`Overlays written to ${overlayDir} (green=classical, red=ML)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
