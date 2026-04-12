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
const CORNER_TOLERANCE_PX       = 3;
const OUTPUT_SIZE_TOLERANCE_PX  = 4;
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

function normalizeCorners(corners) {
  if (!corners) return null;
  return {
    topLeft:     { x: round2(corners.topLeft.x),     y: round2(corners.topLeft.y) },
    topRight:    { x: round2(corners.topRight.x),    y: round2(corners.topRight.y) },
    bottomRight: { x: round2(corners.bottomRight.x), y: round2(corners.bottomRight.y) },
    bottomLeft:  { x: round2(corners.bottomLeft.x),  y: round2(corners.bottomLeft.y) },
  };
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

      // ── Detection success must match baseline ─────────────────
      expect(detectResult.success, `detect.success mismatch`).toBe(expected.detect.success);

      // ── Extraction success must match baseline ────────────────
      expect(extractResult.success, `extract.success mismatch`).toBe(expected.extract.success);

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

      if (!expected.detect.success) {
        return; // expected failure — nothing more to assert
      }

      // ── Corners must be within tolerance ─────────────────────
      const actualCorners  = normalizeCorners(detectResult.corners);
      const expectedCorners = expected.detect.corners;

      for (const corner of ['topLeft', 'topRight', 'bottomRight', 'bottomLeft']) {
        expect(
          Math.abs(actualCorners[corner].x - expectedCorners[corner].x),
          `${corner}.x drifted`
        ).toBeLessThanOrEqual(CORNER_TOLERANCE_PX);

        expect(
          Math.abs(actualCorners[corner].y - expectedCorners[corner].y),
          `${corner}.y drifted`
        ).toBeLessThanOrEqual(CORNER_TOLERANCE_PX);
      }

      // ── Output dimensions must be within tolerance ────────────
      if (expected.extract.success) {
        const actualWidth  = extractResult.output?.width  ?? 0;
        const actualHeight = extractResult.output?.height ?? 0;

        expect(
          Math.abs(actualWidth  - expected.extract.outputWidth),  `outputWidth drifted`
        ).toBeLessThanOrEqual(OUTPUT_SIZE_TOLERANCE_PX);

        expect(
          Math.abs(actualHeight - expected.extract.outputHeight), `outputHeight drifted`
        ).toBeLessThanOrEqual(OUTPUT_SIZE_TOLERANCE_PX);
      }

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
