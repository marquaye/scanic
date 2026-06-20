#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage, ImageData } from 'canvas';
import { scanDocument } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const imagesDir = path.join(rootDir, 'testImages');
const baselineFile = path.join(imagesDir, 'baseline-results.json');
const outputRoot = path.join(rootDir, 'test', 'output', 'baseline');

const isUpdateMode = process.argv.includes('--update');
const maxProcessingDimension = 800;
const cornerTolerancePx = 3;
const outputSizeTolerancePx = 4;
const minConfidenceForSuccess = 0.1;
const minCoverageRatioForSuccess = 0.01;
// A phase may be at most this many times slower than the stored baseline before
// the baseline:check command (and the Vitest baseline tests) report a regression.
const timingBudgetMultiplier = 4;

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

async function runCase(imageName, artifactsDir) {
  const imagePath = path.join(imagesDir, imageName);
  const image = await loadImage(imagePath);

  const detectResult = await scanDocument(image, {
    mode: 'detect',
    maxProcessingDimension
  });

  const extractResult = await scanDocument(image, {
    mode: 'extract',
    output: 'canvas',
    maxProcessingDimension
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
      detectionConfidence: round2(detectResult.confidence ?? 0)
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

  return {
    totalImages: total,
    detectSuccesses,
    extractSuccesses,
    avgDetectMs,
    avgExtractMs
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

function writeBaseline(cases, artifactsDir) {
  const baseline = {
    formatVersion: 1,
    generatedAt: new Date().toISOString(),
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
    ? path.join(outputRoot, 'reference')
    : path.join(outputRoot, 'current');

  ensureCleanDir(artifactsDir);

  const imageNames = listTestImages();
  const cases = [];

  for (const imageName of imageNames) {
    const result = await runCase(imageName, artifactsDir);
    cases.push(result);
  }

  const contactSheetPath = await createContactSheet(cases, artifactsDir);

  console.table = originalTable;

  if (isUpdateMode) {
    const baseline = writeBaseline(cases, artifactsDir);
    console.log('Baseline updated successfully.');
    console.log(`Images processed: ${baseline.summary.totalImages}`);
    console.log(`Detection successes: ${baseline.summary.detectSuccesses}`);
    console.log(`Extraction successes: ${baseline.summary.extractSuccesses}`);
    if (contactSheetPath) {
      console.log(`Contact sheet: ${contactSheetPath}`);
    }
    return;
  }

  if (!fs.existsSync(baselineFile)) {
    console.error('Baseline file not found. Run `npm run baseline:update` first.');
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
  console.log('Baseline check passed.');
  console.log(`Images processed: ${summary.totalImages}`);
  console.log(`Detection successes: ${summary.detectSuccesses}`);
  console.log(`Extraction successes: ${summary.extractSuccesses}`);
  console.log(`Average detect time: ${summary.avgDetectMs} ms`);
  console.log(`Average extract time: ${summary.avgExtractMs} ms`);
  if (contactSheetPath) {
    console.log(`Current contact sheet: ${contactSheetPath}`);
  }
}

run().catch((error) => {
  console.error('Baseline runner failed:', error);
  process.exit(1);
});
