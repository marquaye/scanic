/**
 * Playwright driver: serve the repo root statically, open the WebGPU bench page
 * in headless Chromium (real GPU), and print the result.
 *
 * Usage: node scripts/ml-spike/webgpu/run-webgpu.mjs
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');

const MIME = {
  '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript',
  '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.JPG': 'image/jpeg',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(rootDir, urlPath);
  if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
});

async function main() {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const url = `http://localhost:${port}/scripts/ml-spike/webgpu/bench.html`;

  // Headless Chromium can't acquire a real GPU adapter; headed (or new-headless)
  // exposes the Intel Arc adapter via Dawn/D3D12.
  const browser = await chromium.launch({
    headless: process.env.HEADLESS === '1',
    args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist',
      ...(process.env.HEADLESS === '1' ? ['--headless=new', '--use-angle=d3d11'] : [])],
  });
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.text(); if (/error|warn|gpu|webgpu/i.test(t)) console.log('  [browser]', t); });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));

  await page.goto(url, { waitUntil: 'load' });
  const result = await page.evaluate(() => window.__run(), null);

  console.log('\n=== WebGPU adapter ===');
  result.adapter.forEach((l) => console.log('  ' + l));
  console.log('\n=== Per-image (WebGPU) ===');
  console.table(result.rows);
  console.log(`\nWebGPU median latency: ${result.medianLatency.toFixed(1)} ms`);
  console.log(`IoU vs classical  mean: ${result.meanIoU.toFixed(3)}  median: ${result.medianIoU.toFixed(3)}`);

  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
