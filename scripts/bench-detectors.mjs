#!/usr/bin/env node
/**
 * Latency benchmark comparing the three detector execution paths:
 *
 *   classical   the pure-wasm classical pipeline (detector: 'classical')
 *   ml-st       ML detector, single-thread wasm (scanic-ml/dist/)
 *   ml-mt       ML detector, multi-thread wasm  (scanic-ml/dist/threaded/, 4 threads)
 *
 * IMPORTANT — why each config runs in its own child process:
 * onnxruntime-web initializes its wasm heap + thread pool exactly ONCE per
 * process (its `initializeWebAssembly()` short-circuits on subsequent calls).
 * The very first InferenceSession locks the thread count for the whole process.
 * So a single-process benchmark that creates a 1-thread session and then a
 * 4-thread session actually runs BOTH on the pool the first one created,
 * reporting a bogus "no speedup". This orchestrator forks a clean process per
 * config so each ML run gets the thread count it asks for.
 *
 * Usage:
 *   node scripts/bench-detectors.mjs            # run all three, print a table
 *   node scripts/bench-detectors.mjs --rounds=5 # N passes over the image set
 *   node scripts/bench-detectors.mjs --worker=<config>  # internal (one child)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fork } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const imagesDir = path.join(rootDir, 'testImages');
const distDir = path.join(rootDir, 'scanic-ml', 'dist');

const CONFIGS = ['classical', 'ml-st', 'ml-mt'];
const MULTI_THREAD_COUNT = 4;

const roundsArg = process.argv.find((a) => a.startsWith('--rounds='));
const rounds = roundsArg ? Math.max(1, Number(roundsArg.split('=')[1])) : 3;
const maxProcessingDimension = 800;

function listTestImages() {
  const exts = new Set(['.png', '.jpg', '.jpeg']);
  return fs.readdirSync(imagesDir)
    .filter((e) => exts.has(path.extname(e).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function mlOptionsFor(config) {
  if (config === 'ml-st') {
    return {
      modelBytes: new Uint8Array(fs.readFileSync(path.join(distDir, 'doccornernet_lean.ort'))),
      assetBaseUrl: `${pathToFileURL(distDir).href}/`,
      threaded: false,
      numThreads: 1,
    };
  }
  // ml-mt: same shared model, threaded wasm loaded from dist/threaded/
  return {
    modelBytes: new Uint8Array(fs.readFileSync(path.join(distDir, 'doccornernet_lean.ort'))),
    assetBaseUrl: `${pathToFileURL(distDir).href}/`,
    threaded: true,
    numThreads: MULTI_THREAD_COUNT,
  };
}

// ── Worker: measures one config in this (fresh) process ──────────────────────
async function runWorker(config) {
  const { createCanvas, loadImage, ImageData } = await import('canvas');
  const { scanDocument } = await import('../src/index.js');

  if (typeof globalThis.ImageData === 'undefined') globalThis.ImageData = ImageData;
  if (typeof globalThis.document === 'undefined') {
    globalThis.document = { createElement: (t) => {
      if (t !== 'canvas') throw new Error(`unsupported element: ${t}`);
      return createCanvas(1, 1);
    } };
  }

  const detector = config === 'classical' ? 'classical' : 'ml';
  const ml = config === 'classical' ? null : mlOptionsFor(config);

  const imageNames = listTestImages();
  const images = await Promise.all(imageNames.map((n) => loadImage(path.join(imagesDir, n))));

  const originalTable = console.table;
  console.table = () => {};

  // Warm up once (pays ORT session load / wasm compile up front).
  await scanDocument(images[0], { mode: 'detect', maxProcessingDimension, detector, ml });

  const totalMsList = [];
  const inferMsList = [];
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  for (let r = 0; r < rounds; r++) {
    for (const image of images) {
      const res = await scanDocument(image, { mode: 'detect', maxProcessingDimension, detector, ml });
      const total = res?.timings?.find((s) => s.step === 'Total');
      if (total) totalMsList.push(Number.parseFloat(total.ms));
      // ML runs expose a discrete 'ML Inference' step — the only part threads
      // touch. Classical has no equivalent, so its inference column is blank.
      const infer = res?.timings?.find((s) => s.step === 'ML Inference');
      if (infer) inferMsList.push(Number.parseFloat(infer.ms));
    }
  }
  const wallMs = performance.now() - t0;
  const cpu = process.cpuUsage(cpu0);
  console.table = originalTable;

  const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const n = rounds * images.length;
  process.send({
    config,
    images: images.length,
    rounds,
    runs: n,
    avgDetectMs: mean(totalMsList),
    avgInferenceMs: mean(inferMsList),
    wallPerRunMs: wallMs / n,
    cpuWallRatio: ((cpu.user + cpu.system) / 1000) / wallMs,
  });
}

// ── Orchestrator: forks one child per config, then prints a comparison ───────
function runChild(config) {
  return new Promise((resolve, reject) => {
    const child = fork(__filename, [`--worker=${config}`], { stdio: ['inherit', 'inherit', 'inherit', 'ipc'] });
    let result = null;
    child.on('message', (m) => { result = m; });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0) return reject(new Error(`worker ${config} exited ${code}`));
      if (!result) return reject(new Error(`worker ${config} sent no result`));
      resolve(result);
    });
  });
}

async function orchestrate() {
  // Fail early with a clear message if the ML assets aren't built/fetched.
  // The model is shared; the threaded flavor only adds its own wasm.
  for (const p of [path.join(distDir, 'doccornernet_lean.ort'), path.join(distDir, 'threaded', 'ort-wasm-simd-threaded.wasm')]) {
    if (!fs.existsSync(p)) {
      console.error(`ML assets missing at ${p}. Build/fetch scanic-ml first (see scanic-ml/README.md).`);
      process.exit(1);
    }
  }

  console.log(`Benchmarking detectors over ${listTestImages().length} images × ${rounds} rounds (fresh process per config)…\n`);
  const results = [];
  for (const config of CONFIGS) {
    results.push(await runChild(config));
  }

  const stInfer = results.find((r) => r.config === 'ml-st')?.avgInferenceMs ?? null;
  const stDetect = results.find((r) => r.config === 'ml-st')?.avgDetectMs ?? null;
  const label = { classical: 'classical (wasm)', 'ml-st': 'ML single-thread', 'ml-mt': `ML multi-thread (${MULTI_THREAD_COUNT}t)` };

  const pad = (s, n) => String(s).padEnd(n);
  const padS = (s, n) => String(s).padStart(n);
  const ms = (v) => (v == null ? '—' : `${v.toFixed(2)} ms`);
  console.log(`  ${pad('detector', 24)} ${padS('end-to-end', 12)} ${padS('inference', 12)} ${padS('cpu/wall', 10)} ${padS('infer vs 1t', 12)}`);
  console.log(`  ${'─'.repeat(24 + 12 + 12 + 10 + 12 + 4)}`);
  for (const r of results) {
    const inferSpeedup = (stInfer && r.avgInferenceMs) ? `${(stInfer / r.avgInferenceMs).toFixed(2)}x` : '—';
    console.log(`  ${pad(label[r.config], 24)} ${padS(ms(r.avgDetectMs), 12)} ${padS(ms(r.avgInferenceMs), 12)} ${padS(`${r.cpuWallRatio.toFixed(2)}x`, 10)} ${padS(inferSpeedup, 12)}`);
  }
  if (stDetect && results.find((r) => r.config === 'ml-mt')) {
    const mt = results.find((r) => r.config === 'ml-mt');
    console.log(`\n  ML end-to-end speedup (incl. single-threaded preprocessing): ${(stDetect / mt.avgDetectMs).toFixed(2)}x`);
  }
  console.log('  (end-to-end = full detect call incl. preprocessing; inference = the ML Inference step only,');
  console.log('   the only part threads touch; cpu/wall > 1 confirms real parallel work)');
}

// ── Entry ────────────────────────────────────────────────────────────────────
const workerArg = process.argv.find((a) => a.startsWith('--worker='));
if (workerArg) {
  runWorker(workerArg.split('=')[1]).catch((err) => { console.error(err); process.exit(1); });
} else {
  orchestrate().catch((err) => { console.error(err); process.exit(1); });
}
