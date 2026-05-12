/**
 * @vitest-environment jsdom
 *
 * Baseline regression tests for all images in testImages/.
 * Validates detection accuracy, output dimensions, AND per-phase timing.
 *
 * Run `npm run baseline:update` to regenerate the golden baseline file.
 * Run `npm test`              to validate the current scanner against it.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { scanDocument } from './index.js';
import { loadImage, ImageData as CanvasImageData, createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const baselineFile = path.join(rootDir, 'testImages', 'baseline-results.json');

// ──────────────────────────────────────────────────────────────
// DOM shims required for node-canvas + jsdom
// ──────────────────────────────────────────────────────────────
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = CanvasImageData;
}

const originalCreateElement = globalThis.document.createElement?.bind(globalThis.document);
globalThis.document.createElement = function createElement(tagName, ...args) {
  if (tagName === 'canvas') {
    return createCanvas(1, 1);
  }
  return originalCreateElement ? originalCreateElement(tagName, ...args) : null;
};

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────
const MIN_CONFIDENCE_FOR_SUCCESS = 0.1;
const MIN_COVERAGE_RATIO_FOR_SUCCESS = 0.01;
/**
 * Maximum ratio (actual / baseline) before a timing assertion fails.
 * Set generously (5×) to absorb normal CI variance while still catching
 * regressions like an accidental O(n²) loop.
 */
const TIMING_BUDGET_MULTIPLIER  = 5;

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function round2(v) {
  return Math.round(v * 100) / 100;
}

function polygonAreaFromCorners(corners) {
  if (!corners) return 0;
  const pts = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Extract per-phase timing breakdown from a scan result.
 * Returns a map of phase name → ms (number), excluding the 'Total' entry.
 */
function parseTimings(result) {
  const timings = {};
  if (!result?.timings) return timings;
  for (const t of result.timings) {
    if (t.step === 'Total') continue;
    const ms = Number.parseFloat(t.ms);
    if (Number.isFinite(ms)) timings[t.step] = round2(ms);
  }
  return timings;
}

function getTotalMs(result) {
  const t = result?.timings?.find((e) => e.step === 'Total');
  return round2(Number.parseFloat(t?.ms ?? '0') || 0);
}

/**
 * Print a formatted timing comparison table to stdout (visible in vitest output).
 * Rows with ratio > TIMING_BUDGET_MULTIPLIER are flagged with ⚠.
 */
function printTimingTable(imageName, mode, actualTimings, baselineTimings, actualTotal, baselineTotal) {
  const COL = { phase: 38, actual: 10, baseline: 10, ratio: 7 };
  const sep = '─'.repeat(COL.phase + COL.actual + COL.baseline + COL.ratio + 6);

  const header =
    `  ${'Phase'.padEnd(COL.phase)} ${'Actual'.padStart(COL.actual)}  ${'Baseline'.padStart(COL.baseline)}  ${'Ratio'.padStart(COL.ratio)}`;

  const allSteps = Array.from(
    new Set([...Object.keys(baselineTimings), ...Object.keys(actualTimings)])
  );

  const rows = allSteps.map((step) => {
    const actual  = actualTimings[step];
    const base    = baselineTimings[step];
    const actualStr   = actual  != null ? `${actual}ms`  : '-';
    const baseStr     = base    != null ? `${base}ms`    : '-';
    const ratio       = (actual != null && base != null && base > 0)
      ? actual / base
      : null;
    const ratioStr    = ratio != null ? `${ratio.toFixed(2)}x` : '-';
    const flag        = (ratio != null && ratio > TIMING_BUDGET_MULTIPLIER) ? ' ⚠' : '';
    return `    ${step.padEnd(COL.phase)} ${actualStr.padStart(COL.actual)}  ${baseStr.padStart(COL.baseline)}  ${ratioStr.padStart(COL.ratio)}${flag}`;
  });

  const totalRatio =
    baselineTotal > 0 ? `${(actualTotal / baselineTotal).toFixed(2)}x` : '-';

  const totalRow =
    `    ${'TOTAL'.padEnd(COL.phase)} ${`${actualTotal}ms`.padStart(COL.actual)}  ${`${baselineTotal}ms`.padStart(COL.baseline)}  ${totalRatio.padStart(COL.ratio)}`;

  console.log([
    `\n  Timings: ${imageName}  [${mode}]`,
    `  ${sep}`,
    header,
    `  ${sep}`,
    ...rows,
    `  ${sep}`,
    totalRow,
  ].join('\n'));
}

// ──────────────────────────────────────────────────────────────
// Load baseline + warm up WASM before any test runs
// ──────────────────────────────────────────────────────────────
let baselineData;
beforeAll(async () => {
  if (!fs.existsSync(baselineFile)) {
    throw new Error(
      `Baseline file not found at ${baselineFile}. ` +
      'Run `npm run baseline:update` to generate it first.'
    );
  }
  baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
}, 30_000);

// ──────────────────────────────────────────────────────────────
// Dynamic per-image tests
// ──────────────────────────────────────────────────────────────
describe('Baseline regression (all test images)', () => {
  const imagesDir = path.join(rootDir, 'testImages');

  const supportedExtensions = new Set(['.png', '.jpg', '.jpeg']);
  const imageFiles = fs.readdirSync(imagesDir)
    .filter((f) => supportedExtensions.has(path.extname(f).toLowerCase()))
    .sort();

  for (const imageName of imageFiles) {
    it(`${imageName}`, async () => {
      const expected = baselineData.cases.find((c) => c.image === imageName);
      if (!expected) {
        throw new Error(`No baseline entry for "${imageName}". Re-run baseline:update.`);
      }

      const maxProcessingDimension = baselineData.scannerOptions?.maxProcessingDimension ?? 800;
      const imgPath = path.join(imagesDir, imageName);
      const image = await loadImage(imgPath);

      // Suppress the console.table timings output emitted by scanDocument.
      const originalTable = console.table;
      console.table = () => {};

      let detectResult, extractResult;
      try {
        // Run detect and extract sequentially so timings are not skewed by
        // parallelism sharing the same JS thread.
        detectResult = await scanDocument(image, { mode: 'detect', maxProcessingDimension });
        extractResult = await scanDocument(image, { mode: 'extract', output: 'canvas', maxProcessingDimension });
      } finally {
        console.table = originalTable;
      }

      // ── Timing tables (always printed, even on failed detections) ─
      const actualDetectTimings  = parseTimings(detectResult);
      const actualExtractTimings = parseTimings(extractResult);
      const baselineDetectTimings  = expected.detect.timings  ?? {};
      const baselineExtractTimings = expected.extract.timings ?? {};

      printTimingTable(
        imageName, 'detect',
        actualDetectTimings,  baselineDetectTimings,
        getTotalMs(detectResult),  expected.detect.totalMs
      );
      printTimingTable(
        imageName, 'extract',
        actualExtractTimings, baselineExtractTimings,
        getTotalMs(extractResult), expected.extract.totalMs
      );

      const actualCoverage = detectResult.corners
        ? polygonAreaFromCorners(detectResult.corners) / Math.max(1, image.width * image.height)
        : 0;

      // All baseline images are expected to be detected and extracted.
      expect(detectResult.success, `detect should succeed`).toBe(true);
      expect(extractResult.success, `extract should succeed`).toBe(true);

      // ── Quality gates for successful detections ───────────────
      expect(
        detectResult.confidence ?? 0,
        `detection confidence too low`
      ).toBeGreaterThanOrEqual(MIN_CONFIDENCE_FOR_SUCCESS);

      const expectedCoverage = expected.metrics?.documentCoverageRatio ?? 0;
      const minCoverage = Math.max(MIN_COVERAGE_RATIO_FOR_SUCCESS, expectedCoverage * 0.15);
      expect(
        actualCoverage,
        `coverage ratio too low`
      ).toBeGreaterThanOrEqual(minCoverage);

      const actualWidth = extractResult.output?.width ?? 0;
      const actualHeight = extractResult.output?.height ?? 0;
      expect(actualWidth, 'extract output width must be positive').toBeGreaterThan(0);
      expect(actualHeight, 'extract output height must be positive').toBeGreaterThan(0);

      // ── Per-phase timing budget assertions ────────────────────
      // Only phases present in the stored baseline are checked.
      // Phases with a baseline of ≤1 ms are skipped to avoid noise on
      // near-instant operations where jitter dominates.
      const MIN_ASSERTABLE_MS = 2;

      for (const [step, baselineMs] of Object.entries(baselineDetectTimings)) {
        if (baselineMs < MIN_ASSERTABLE_MS) continue;
        const actualMs = actualDetectTimings[step];
        if (actualMs == null) continue;
        expect(
          actualMs,
          `detect "${step}" exceeded ${TIMING_BUDGET_MULTIPLIER}× budget ` +
          `(${actualMs}ms vs baseline ${baselineMs}ms)`
        ).toBeLessThanOrEqual(baselineMs * TIMING_BUDGET_MULTIPLIER);
      }

      for (const [step, baselineMs] of Object.entries(baselineExtractTimings)) {
        if (baselineMs < MIN_ASSERTABLE_MS) continue;
        const actualMs = actualExtractTimings[step];
        if (actualMs == null) continue;
        expect(
          actualMs,
          `extract "${step}" exceeded ${TIMING_BUDGET_MULTIPLIER}× budget ` +
          `(${actualMs}ms vs baseline ${baselineMs}ms)`
        ).toBeLessThanOrEqual(baselineMs * TIMING_BUDGET_MULTIPLIER);
      }
    });
  }
});
