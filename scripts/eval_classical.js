#!/usr/bin/env node
// Produce scanic classical-detector predictions + per-image latency over a
// shared GT set (/tmp/evalN.json). Python (unified_benchmark.py) scores them.
import fs from 'fs';
import { createCanvas, loadImage, ImageData } from 'canvas';

globalThis.ImageData = ImageData;
globalThis.document = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('unsupported element: ' + tag);
    return createCanvas(1, 1);
  },
};
console.table = () => {};
const origLog = console.log; console.log = () => {};
const { scanDocument } = await import('../src/index.js');
console.log = origLog;

const items = JSON.parse(fs.readFileSync('/tmp/evalN.json', 'utf8'));
const out = [];
// warm up (JIT) once
await scanDocument(await loadImage(items[0].file), { mode: 'detect', maxProcessingDimension: 800 });

for (const it of items) {
  const img = await loadImage(it.file);
  const t0 = performance.now();
  let res;
  try {
    res = await scanDocument(img, { mode: 'detect', maxProcessingDimension: 800 });
  } catch {
    res = { success: false };
  }
  const ms = performance.now() - t0;
  out.push({
    file: it.file,
    detect_ms: +ms.toFixed(2),
    corners: res && res.success && res.corners ? res.corners : null,
    confidence: res ? (res.confidence ?? null) : null,
  });
}
fs.writeFileSync('/tmp/classical_pred.json', JSON.stringify(out));
const ok = out.filter((o) => o.corners).length;
const lat = out.map((o) => o.detect_ms).sort((a, b) => a - b);
console.log(`classical: ${ok}/${out.length} detected,  median latency ${lat[lat.length>>1].toFixed(1)} ms (JS fallback, node)`);
console.log('wrote /tmp/classical_pred.json');
