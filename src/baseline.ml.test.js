/**
 * @vitest-environment jsdom
 *
 * Baseline regression tests for the optional ML detector, run against every
 * image in testImages/. Mirrors baseline.test.js but exercises
 * `scanDocument(image, { detector: 'ml' })` instead of the classical pipeline.
 *
 * Skips automatically (like src/mlDetector.test.js) when onnxruntime-web or the
 * companion scanic-ml/dist model assets aren't present, so it never breaks a
 * classical-only checkout.
 *
 * Run `npm run baseline:update:ml` to regenerate the golden baseline file.
 * Run `npm test`                  to validate the current ML detector against it.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { scanDocument } from './index.js';
import { loadImage, ImageData as CanvasImageData, createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { computeIoU, cornerErrors } from '../scripts/lib/polygonMetrics.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const baselineFile = path.join(rootDir, 'testImages', 'baseline-results.ml.json');
const groundTruthFile = path.join(rootDir, 'testImages', 'ground-truth.json');
const distDir = path.join(rootDir, 'scanic-ml', 'dist');
const modelPath = path.join(distDir, 'doccornernet_lean.ort');

// DOM shims required for node-canvas + jsdom
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

// Constants
const MIN_CONFIDENCE_FOR_SUCCESS = 0.1;
const MIN_COVERAGE_RATIO_FOR_SUCCESS = 0.01;
const IOU_REGRESSION_TOLERANCE = 0.85;
const TIMING_BUDGET_MULTIPLIER = 5;
// See src/baseline.test.js for rationale: absorbs CI scheduling jitter on
// near-instant phases without loosening the check for slower phases.
const ABSOLUTE_JITTER_BUFFER_MS = 80;
const SKIP_TIMING_BUDGETS = process.env.npm_lifecycle_event === 'test:coverage';

// Helpers
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

function printTimingTable(imageName, mode, actualTimings, baselineTimings, actualTotal, baselineTotal) {
  const COL = { phase: 38, actual: 10, baseline: 10, ratio: 7 };
  const sep = '─'.repeat(COL.phase + COL.actual + COL.baseline + COL.ratio + 6);

  const header =
    `  ${'Phase'.padEnd(COL.phase)} ${'Actual'.padStart(COL.actual)}  ${'Baseline'.padStart(COL.baseline)}  ${'Ratio'.padStart(COL.ratio)}`;

  const allSteps = Array.from(
    new Set([...Object.keys(baselineTimings), ...Object.keys(actualTimings)])
  );

  const rows = allSteps.map((step) => {
    const actual = actualTimings[step];
    const base = baselineTimings[step];
    const actualStr = actual != null ? `${actual}ms` : '-';
    const baseStr = base != null ? `${base}ms` : '-';
    const ratio = (actual != null && base != null && base > 0)
      ? actual / base
      : null;
    const ratioStr = ratio != null ? `${ratio.toFixed(2)}x` : '-';
    const flag = (ratio != null && ratio > TIMING_BUDGET_MULTIPLIER) ? ' ⚠' : '';
    return `    ${step.padEnd(COL.phase)} ${actualStr.padStart(COL.actual)}  ${baseStr.padStart(COL.baseline)}  ${ratioStr.padStart(COL.ratio)}${flag}`;
  });

  const totalRatio =
    baselineTotal > 0 ? `${(actualTotal / baselineTotal).toFixed(2)}x` : '-';

  const totalRow =
    `    ${'TOTAL'.padEnd(COL.phase)} ${`${actualTotal}ms`.padStart(COL.actual)}  ${`${baselineTotal}ms`.padStart(COL.baseline)}  ${totalRatio.padStart(COL.ratio)}`;

  console.log([
    `\n  Timings: ${imageName}  [ml/${mode}]`,
    `  ${sep}`,
    header,
    `  ${sep}`,
    ...rows,
    `  ${sep}`,
    totalRow,
  ].join('\n'));
}

// Feature-detect the optional ML runtime + model assets before defining tests.
let available = false;
let mlOptions = null;
try {
  await import('onnxruntime-web');
  if (fs.existsSync(modelPath)) {
    mlOptions = {
      modelBytes: new Uint8Array(fs.readFileSync(modelPath)),
      assetBaseUrl: `${pathToFileURL(distDir).href}/`
    };
    available = true;
  }
} catch {
  available = false;
}

let baselineData;
let groundTruthData = null;
beforeAll(async () => {
  if (!available) return;

  if (!fs.existsSync(baselineFile)) {
    throw new Error(
      `ML baseline file not found at ${baselineFile}. ` +
      'Run `npm run baseline:update:ml` to generate it first.'
    );
  }
  baselineData = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));

  if (fs.existsSync(groundTruthFile)) {
    groundTruthData = JSON.parse(fs.readFileSync(groundTruthFile, 'utf8')).images ?? {};
  }

  // Warm up the ORT session (model load + wasm init) before timed assertions.
  const maxProcessingDimension = baselineData.scannerOptions?.maxProcessingDimension ?? 800;
  const warmupImagePath = path.join(rootDir, 'testImages', 'test.png');
  if (fs.existsSync(warmupImagePath)) {
    const warmupImage = await loadImage(warmupImagePath);
    const originalTable = console.table;
    console.table = () => {};
    try {
      await scanDocument(warmupImage, { mode: 'detect', maxProcessingDimension, detector: 'ml', ml: mlOptions });
    } finally {
      console.table = originalTable;
    }
  }
}, 30_000);

describe('Baseline regression (ML detector, all test images)', () => {
  const imagesDir = path.join(rootDir, 'testImages');

  const supportedExtensions = new Set(['.png', '.jpg', '.jpeg']);
  const imageFiles = fs.readdirSync(imagesDir)
    .filter((f) => supportedExtensions.has(path.extname(f).toLowerCase()))
    .sort();

  for (const imageName of imageFiles) {
    it(`${imageName}`, async () => {
      if (!available) {
        console.warn('[baseline.ml.test] skipped: onnxruntime-web or scanic-ml/dist assets unavailable');
        return;
      }

      const expected = baselineData.cases.find((c) => c.image === imageName);
      if (!expected) {
        throw new Error(`No ML baseline entry for "${imageName}". Re-run baseline:update:ml.`);
      }

      const maxProcessingDimension = baselineData.scannerOptions?.maxProcessingDimension ?? 800;
      const imgPath = path.join(imagesDir, imageName);
      const image = await loadImage(imgPath);

      const originalTable = console.table;
      console.table = () => {};

      let detectResult, extractResult;
      try {
        detectResult = await scanDocument(image, { mode: 'detect', maxProcessingDimension, detector: 'ml', ml: mlOptions });
        extractResult = await scanDocument(image, { mode: 'extract', output: 'canvas', maxProcessingDimension, detector: 'ml', ml: mlOptions });
      } finally {
        console.table = originalTable;
      }

      const actualDetectTimings = parseTimings(detectResult);
      const actualExtractTimings = parseTimings(extractResult);
      const baselineDetectTimings = expected.detect.timings ?? {};
      const baselineExtractTimings = expected.extract.timings ?? {};

      printTimingTable(
        imageName, 'detect',
        actualDetectTimings, baselineDetectTimings,
        getTotalMs(detectResult), expected.detect.totalMs
      );
      printTimingTable(
        imageName, 'extract',
        actualExtractTimings, baselineExtractTimings,
        getTotalMs(extractResult), expected.extract.totalMs
      );

      const actualCoverage = detectResult.corners
        ? polygonAreaFromCorners(detectResult.corners) / Math.max(1, image.width * image.height)
        : 0;

      expect(detectResult.success, `detect should succeed`).toBe(true);
      expect(extractResult.success, `extract should succeed`).toBe(true);

      // Accuracy against hand-verified ground truth, when available.
      const gtEntry = groundTruthData?.[imageName];
      if (gtEntry?.corners && detectResult.corners) {
        const iou = computeIoU(detectResult.corners, gtEntry.corners);
        const { mean: meanCornerErrorPx } = cornerErrors(detectResult.corners, gtEntry.corners);
        console.log(`\n  Ground truth: ${imageName}  IoU=${iou.toFixed(3)}  meanCornerError=${meanCornerErrorPx.toFixed(1)}px`);
        const expectedIou = expected.metrics?.groundTruthIou;
        if (expectedIou != null) {
          expect(
            iou,
            `IoU vs ground truth regressed (${iou} vs baseline ${expectedIou})`
          ).toBeGreaterThanOrEqual(expectedIou * IOU_REGRESSION_TOLERANCE);
        }
      }

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

      const MIN_ASSERTABLE_MS = 2;

      if (!SKIP_TIMING_BUDGETS) {
        for (const [step, baselineMs] of Object.entries(baselineDetectTimings)) {
          if (baselineMs < MIN_ASSERTABLE_MS) continue;
          const actualMs = actualDetectTimings[step];
          if (actualMs == null) continue;
          const budgetMs = Math.max(baselineMs * TIMING_BUDGET_MULTIPLIER, baselineMs + ABSOLUTE_JITTER_BUFFER_MS);
          expect(
            actualMs,
            `detect "${step}" exceeded budget ` +
            `(${actualMs}ms vs baseline ${baselineMs}ms, budget ${budgetMs.toFixed(2)}ms)`
          ).toBeLessThanOrEqual(budgetMs);
        }

        for (const [step, baselineMs] of Object.entries(baselineExtractTimings)) {
          if (baselineMs < MIN_ASSERTABLE_MS) continue;
          const actualMs = actualExtractTimings[step];
          if (actualMs == null) continue;
          const budgetMs = Math.max(baselineMs * TIMING_BUDGET_MULTIPLIER, baselineMs + ABSOLUTE_JITTER_BUFFER_MS);
          expect(
            actualMs,
            `extract "${step}" exceeded budget ` +
            `(${actualMs}ms vs baseline ${baselineMs}ms, budget ${budgetMs.toFixed(2)}ms)`
          ).toBeLessThanOrEqual(budgetMs);
        }
      }
    }, 30_000);
  }
});
