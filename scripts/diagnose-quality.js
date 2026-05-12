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

function installCanvasDomShim() {
  if (typeof globalThis.ImageData === 'undefined') {
    globalThis.ImageData = ImageData;
  }

  if (typeof globalThis.document === 'undefined') {
    globalThis.document = {
      createElement(tagName) {
        if (tagName !== 'canvas') {
          throw new Error(`Unsupported element requested in diagnostics: ${tagName}`);
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
    throw new Error(`Unsupported element requested in diagnostics: ${tagName}`);
  };
}

function listImageFiles() {
  const supported = new Set(['.png', '.jpg', '.jpeg']);
  return fs.readdirSync(imagesDir)
    .filter((entry) => supported.has(path.extname(entry).toLowerCase()))
    .sort((a, b) => a.localeCompare(b));
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

function round(value, digits = 3) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function main() {
  installCanvasDomShim();

  const rows = [];
  for (const imageName of listImageFiles()) {
    const img = await loadImage(path.join(imagesDir, imageName));
    const result = await scanDocument(img, {
      mode: 'detect',
      debug: true,
      maxProcessingDimension: 800
    });

    const imageArea = img.width * img.height;
    const coverage = result.corners ? polygonAreaFromCorners(result.corners) / Math.max(1, imageArea) : 0;

    const bestCandidate = result.debug?.selectedCandidate;
    rows.push({
      image: imageName,
      success: result.success,
      confidence: round(result.confidence || 0, 3),
      coverage: round(coverage, 3),
      contourPoints: result.contour?.points?.length || 0,
      topCandidateFill: round(bestCandidate?.fillRatio || 0, 3),
      topCandidateApprox: bestCandidate?.approxCount || 0,
      topCandidateScore: round(bestCandidate?.score || 0, 3)
    });
  }

  console.table(rows);

  const failures = rows.filter((row) => !row.success);
  console.log(`\nDetection failures: ${failures.length}`);
  if (failures.length > 0) {
    for (const row of failures) {
      console.log(`- ${row.image}: confidence=${row.confidence}, coverage=${row.coverage}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
