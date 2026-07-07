#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createCanvas, loadImage, ImageData } from 'canvas';
import { scanDocument } from '../src/index.js';
import { computeIoU, cornerErrors } from './lib/polygonMetrics.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const imagesDir = path.join(rootDir, 'testImages');
const outputRoot = path.join(rootDir, 'test', 'output', 'baseline');

const isUpdateMode = process.argv.includes('--update');
const detectorArg = process.argv.find((arg) => arg.startsWith('--detector='));
const detector = detectorArg ? detectorArg.split('=')[1] : 'classical';
if (detector !== 'classical' && detector !== 'ml') {
  console.error(`Unknown --detector value "${detector}". Expected "classical" or "ml".`);
  process.exit(1);
}

// Classical and ML results diverge (different pipelines, different confidence
// scales) so each detector gets its own baseline file + artifact directory
// rather than overwriting one another.
const baselineFile = path.join(
  imagesDir,
  detector === 'ml' ? 'baseline-results.ml.json' : 'baseline-results.json'
);
const artifactDirName = detector === 'ml' ? 'ml' : 'classical';
const maxProcessingDimension = 800;
const cornerTolerancePx = 3;
const outputSizeTolerancePx = 4;
const minConfidenceForSuccess = 0.1;
const minCoverageRatioForSuccess = 0.01;
// A phase may be at most this many times slower than the stored baseline before
// the baseline:check command (and the Vitest baseline tests) report a regression.
const timingBudgetMultiplier = 4;
// An image's IoU may drop at most this fraction below the stored baseline's
// IoU before it's flagged as a regression. This (not an absolute floor) is
// the primary accuracy gate: some images are known-hard for the classical
// detector (e.g. 1023-receipt.jpg, 0123.jpg — see repo notes on preferring
// fail-safe behavior over low-confidence false positives there), so their
// recorded baseline IoU is itself low. We only want to catch it getting
// *worse*, not permanently fail the suite on an already-known limitation.
const iouRegressionTolerance = 0.85;

const groundTruthFile = path.join(imagesDir, 'ground-truth.json');
const groundTruth = fs.existsSync(groundTruthFile)
  ? JSON.parse(fs.readFileSync(groundTruthFile, 'utf8')).images ?? {}
  : {};

function installCanvasDomShim() {
  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = ImageData;
  }

  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElement(tagName) {
        if (tagName !== 'canvas') {
          throw new Error(`Unsupported element requested in baseline runner: ${tagName}`);
        }
        return createCanvas(1, 1);
      }
    };
    return;
  }

  const originalCreateElement = globalThis.document.createElement?.bind(globalThis.document);

  globalThis.document.createElement = function createElement(tagName, ...args) {
    if (tagName === 'canvas') {
      return createCanvas(1, 1);
    }

    if (originalCreateElement) {
      return originalCreateElement(tagName, ...args);
    }

    throw new Error(`Unsupported element requested in baseline runner: ${tagName}`);
  };
}

function listTestImages() {
  const supportedExtensions = new Set(['.png', '.jpg', '.jpeg']);
  return fs
    .readdirSync(imagesDir)
    .filter((entry) => supportedExtensions.has(path.extname(entry).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
}

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function normalizeCorners(corners) {
  if (!corners) return null;
  return {
    topLeft: { x: round2(corners.topLeft.x), y: round2(corners.topLeft.y) },
    topRight: { x: round2(corners.topRight.x), y: round2(corners.topRight.y) },
    bottomRight: { x: round2(corners.bottomRight.x), y: round2(corners.bottomRight.y) },
    bottomLeft: { x: round2(corners.bottomLeft.x), y: round2(corners.bottomLeft.y) }
  };
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

function parseTotalMs(result) {
  const totalStep = result?.timings?.find((timing) => timing.step === 'Total');
  const value = Number.parseFloat(totalStep?.ms ?? '0');
  return Number.isFinite(value) ? round2(value) : 0;
}

/**
 * Extract per-phase timing breakdown from a scan result.
 * Returns a plain object mapping phase name → ms (number), excluding the
 * synthetic 'Total' entry which is tracked separately.
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

function saveExtractedOutput(canvasOutput, outPath) {
  const pngBuffer = canvasOutput.toBuffer('image/png');
  fs.writeFileSync(outPath, pngBuffer);
}

/**
 * Load the ML detector options needed to run fully offline: model bytes read
 * straight from the local scanic-ml/dist build, plus a file:// asset base URL
 * so the wasm loader never hits the network. Mirrors the pattern used by
 * src/mlDetector.test.js.
 *
 * Uses the DEFAULT thread count (1), because this regression suite validates
 * the configuration `detector: 'ml'` ships out of the box (identical corners
 * to running with more threads, just slower). Keeping the generator and the
 * checker (src/baseline.ml.test.js, also default thread count) on the same
 * config keeps the per-phase timing budgets self-consistent. The multi-thread
 * path has its own coverage: src/mlDetector.threaded.test.js (correctness) and
 * `npm run bench:detectors` (the ~1.8x inference speedup; see
 * scanic-ml/MODEL_CARD.md).
 */
function loadMlOptions() {
  const distDir = path.join(rootDir, 'scanic-ml', 'dist');
  const modelPath = path.join(distDir, 'doccornernet_lean.ort');
  if (!fs.existsSync(modelPath)) {
    console.error(
      `ML model not found at ${modelPath}.\n` +
      'Build/fetch the scanic-ml assets first (see scanic-ml/README.md).'
    );
    process.exit(1);
  }
  return {
    modelBytes: new Uint8Array(fs.readFileSync(modelPath)),
    assetBaseUrl: `${pathToFileURL(distDir).href}/`
  };
}

const mlOptions = detector === 'ml' ? loadMlOptions() : null;

async function runCase(imageName, artifactsDir) {
  const imagePath = path.join(imagesDir, imageName);
  const image = await loadImage(imagePath);

  const detectResult = await scanDocument(image, {
    mode: 'detect',
    maxProcessingDimension,
    detector,
    ml: mlOptions
  });

  const extractResult = await scanDocument(image, {
    mode: 'extract',
    output: 'canvas',
    maxProcessingDimension,
    detector,
    ml: mlOptions
  });

  let extractedFile = null;
  let outputWidth = null;
  let outputHeight = null;

  if (extractResult.success && extractResult.output) {
    outputWidth = extractResult.output.width;
    outputHeight = extractResult.output.height;
    extractedFile = `${path.parse(imageName).name}.extracted.png`;
    saveExtractedOutput(extractResult.output, path.join(artifactsDir, extractedFile));
  }

  const corners = normalizeCorners(detectResult.corners);
  const docArea = polygonAreaFromCorners(corners);
  const imageArea = image.width * image.height;

  let groundTruthIou = null;
  let groundTruthCornerErrorPx = null;
  const gtEntry = groundTruth[imageName];
  if (gtEntry?.corners && corners) {
    groundTruthIou = round2(computeIoU(corners, gtEntry.corners));
    groundTruthCornerErrorPx = round2(cornerErrors(corners, gtEntry.corners).mean);
  }

  return {
    image: imageName,
    input: {
      width: image.width,
      height: image.height
    },
    detect: {
      success: detectResult.success,
      corners,
      totalMs: parseTotalMs(detectResult),
      timings: parseTimings(detectResult)
    },
    extract: {
      success: extractResult.success,
      outputWidth,
      outputHeight,
      totalMs: parseTotalMs(extractResult),
      timings: parseTimings(extractResult),
      artifact: extractedFile
    },
    metrics: {
      documentCoverageRatio: imageArea > 0 ? round2(docArea / imageArea) : 0,
      detectionConfidence: round2(detectResult.confidence ?? 0),
      groundTruthIou,
      groundTruthCornerErrorPx
    }
  };
}

function buildSummary(cases) {
  const total = cases.length;
  const detectSuccesses = cases.filter((entry) => entry.detect.success).length;
  const extractSuccesses = cases.filter((entry) => entry.extract.success).length;
  const avgDetectMs = round2(
    cases.reduce((sum, entry) => sum + entry.detect.totalMs, 0) / (total || 1)
  );
  const avgExtractMs = round2(
    cases.reduce((sum, entry) => sum + entry.extract.totalMs, 0) / (total || 1)
  );

  const withGroundTruth = cases.filter((entry) => entry.metrics?.groundTruthIou != null);
  const avgGroundTruthIou = withGroundTruth.length > 0
    ? round2(withGroundTruth.reduce((sum, entry) => sum + entry.metrics.groundTruthIou, 0) / withGroundTruth.length)
    : null;
  const avgGroundTruthCornerErrorPx = withGroundTruth.length > 0
    ? round2(withGroundTruth.reduce((sum, entry) => sum + entry.metrics.groundTruthCornerErrorPx, 0) / withGroundTruth.length)
    : null;

  return {
    totalImages: total,
    detectSuccesses,
    extractSuccesses,
    avgDetectMs,
    avgExtractMs,
    groundTruthImages: withGroundTruth.length,
    avgGroundTruthIou,
    avgGroundTruthCornerErrorPx
  };
}

function compareAgainstBaseline(currentCases, baselineCases) {
  const baselineByImage = new Map(baselineCases.map((entry) => [entry.image, entry]));
  const failures = [];

  for (const current of currentCases) {
    const expected = baselineByImage.get(current.image);
    if (!expected) {
      failures.push(`${current.image}: missing baseline entry`);
      continue;
    }

    // All baseline images should be detected and extracted.
    if (!current.detect.success) {
      failures.push(`${current.image}: detect failed`);
      continue;
    }

    if (!current.extract.success) {
      failures.push(`${current.image}: extract failed`);
      continue;
    }

    const currentConfidence = current.metrics?.detectionConfidence ?? 0;
    if (currentConfidence < minConfidenceForSuccess) {
      failures.push(`${current.image}: detection confidence too low (${currentConfidence} < ${minConfidenceForSuccess})`);
    }

    const expectedCoverage = expected.metrics?.documentCoverageRatio ?? 0;
    const minCoverage = Math.max(minCoverageRatioForSuccess, expectedCoverage * 0.15);
    const currentCoverage = current.metrics?.documentCoverageRatio ?? 0;
    if (currentCoverage < minCoverage) {
      failures.push(
        `${current.image}: document coverage too low (${currentCoverage} < ${round2(minCoverage)})`
      );
    }

    // Accuracy against hand-verified ground truth (testImages/ground-truth.json),
    // when available for this image. Gated relative to the stored baseline's
    // own IoU (like the timing checks below) rather than an absolute floor,
    // since some images are known-hard for the classical detector.
    const currentIou = current.metrics?.groundTruthIou;
    if (currentIou != null) {
      const expectedIou = expected.metrics?.groundTruthIou;
      if (expectedIou != null && currentIou < expectedIou * iouRegressionTolerance) {
        failures.push(
          `${current.image}: IoU vs ground truth regressed (${currentIou} vs baseline ${expectedIou})`
        );
      }
    }

    // Timing regressions – flag if any phase is slower than budget.
    // Skip near-zero baseline phases where timing jitter dominates.
    const minAssertableMs = 2;
    for (const [step, baselineMs] of Object.entries(expected.detect.timings ?? {})) {
      if (baselineMs < minAssertableMs) continue;
      const actualMs = (current.detect.timings ?? {})[step];
      if (actualMs !== undefined && baselineMs > 0) {
        const ratio = actualMs / baselineMs;
        if (ratio > timingBudgetMultiplier) {
          failures.push(
            `${current.image}: detect "${step}" regressed ` +
            `${actualMs}ms vs baseline ${baselineMs}ms (${ratio.toFixed(1)}x, budget=${timingBudgetMultiplier}x)`
          );
        }
      }
    }
  }

  return failures;
}

function createContactSheet(cases, artifactsDir) {
  const extractedCases = cases.filter((entry) => entry.extract.success && entry.extract.artifact);
  if (extractedCases.length === 0) return null;

  const columns = 3;
  const thumbWidth = 320;
  const thumbHeight = 240;
  const labelHeight = 26;
  const padding = 16;
  const rows = Math.ceil(extractedCases.length / columns);

  const sheetWidth = columns * thumbWidth + (columns + 1) * padding;
  const sheetHeight = rows * (thumbHeight + labelHeight) + (rows + 1) * padding;

  const sheet = createCanvas(sheetWidth, sheetHeight);
  const ctx = sheet.getContext('2d');
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, sheetWidth, sheetHeight);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#1f2937';

  return Promise.all(
    extractedCases.map(async (entry, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = padding + col * (thumbWidth + padding);
      const y = padding + row * (thumbHeight + labelHeight + padding);

      const img = await loadImage(path.join(artifactsDir, entry.extract.artifact));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, thumbWidth, thumbHeight);

      const scale = Math.min(thumbWidth / img.width, thumbHeight / img.height);
      const drawW = Math.round(img.width * scale);
      const drawH = Math.round(img.height * scale);
      const drawX = x + Math.floor((thumbWidth - drawW) / 2);
      const drawY = y + Math.floor((thumbHeight - drawH) / 2);

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      ctx.fillStyle = '#111827';
      ctx.fillText(entry.image, x + 4, y + thumbHeight + 18);
    })
  ).then(() => {
    const sheetPath = path.join(artifactsDir, 'contact-sheet.png');
    fs.writeFileSync(sheetPath, sheet.toBuffer('image/png'));
    return sheetPath;
  });
}

function writeBaseline(cases) {
  const baseline = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
    detector,
    scannerOptions: {
      maxProcessingDimension
    },
    tolerances: {
      cornerTolerancePx,
      outputSizeTolerancePx
    },
    summary: buildSummary(cases),
    cases
  };

  fs.writeFileSync(baselineFile, `${JSON.stringify(baseline, null, 2)}\n`);
  return baseline;
}

async function run() {
  installCanvasDomShim();

  const originalTable = console.table;
  console.table = () => {};

  const artifactsDir = isUpdateMode
    ? path.join(outputRoot, artifactDirName, 'reference')
    : path.join(outputRoot, artifactDirName, 'current');

  ensureCleanDir(artifactsDir);

  // Warm up before any timed runs: for the ML detector this pays the ORT
  // session load / wasm compile cost once up front (otherwise it lands on
  // whichever image happens to run first, wildly skewing that image's
  // numbers and the average). For classical this also warms the WASM Canny
  // module. Uses the first test image; result is discarded.
  const imageNames = listTestImages();
  if (imageNames.length > 0) {
    const warmupImage = await loadImage(path.join(imagesDir, imageNames[0]));
    await scanDocument(warmupImage, { mode: 'detect', maxProcessingDimension, detector, ml: mlOptions });
  }

  const cases = [];

  for (const imageName of imageNames) {
    const result = await runCase(imageName, artifactsDir);
    cases.push(result);
  }

  const contactSheetPath = await createContactSheet(cases, artifactsDir);

  console.table = originalTable;

  if (isUpdateMode) {
    const baseline = writeBaseline(cases);
    console.log(`Baseline updated successfully [detector=${detector}].`);
    console.log(`Images processed: ${baseline.summary.totalImages}`);
    console.log(`Detection successes: ${baseline.summary.detectSuccesses}`);
    console.log(`Extraction successes: ${baseline.summary.extractSuccesses}`);
    if (baseline.summary.avgGroundTruthIou != null) {
      console.log(`Average IoU vs ground truth: ${baseline.summary.avgGroundTruthIou} (${baseline.summary.groundTruthImages} images)`);
      console.log(`Average corner error vs ground truth: ${baseline.summary.avgGroundTruthCornerErrorPx} px`);
    }
    if (contactSheetPath) {
      console.log(`Contact sheet: ${contactSheetPath}`);
    }
    return;
  }

  if (!fs.existsSync(baselineFile)) {
    const updateCmd = detector === 'ml' ? 'npm run baseline:update:ml' : 'npm run baseline:update';
    console.error(`Baseline file not found. Run \`${updateCmd}\` first.`);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const failures = compareAgainstBaseline(cases, baseline.cases || []);

  if (failures.length > 0) {
    console.error('Baseline check failed:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    if (contactSheetPath) {
      console.error(`Current contact sheet: ${contactSheetPath}`);
    }
    process.exit(1);
  }

  const summary = buildSummary(cases);
  console.log(`Baseline check passed [detector=${detector}].`);
  console.log(`Images processed: ${summary.totalImages}`);
  console.log(`Detection successes: ${summary.detectSuccesses}`);
  console.log(`Extraction successes: ${summary.extractSuccesses}`);
  console.log(`Average detect time: ${summary.avgDetectMs} ms`);
  console.log(`Average extract time: ${summary.avgExtractMs} ms`);
  if (summary.avgGroundTruthIou != null) {
    console.log(`Average IoU vs ground truth: ${summary.avgGroundTruthIou} (${summary.groundTruthImages} images)`);
    console.log(`Average corner error vs ground truth: ${summary.avgGroundTruthCornerErrorPx} px`);
  }
  if (contactSheetPath) {
    console.log(`Current contact sheet: ${contactSheetPath}`);
  }
}

run().catch((error) => {
  console.error('Baseline runner failed:', error);
  process.exit(1);
});
