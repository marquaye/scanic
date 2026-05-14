/**
 * scanic
 * JavaScript document scanner without OpenCV dependency
 * MIT License
 */


import { detectDocumentContour, approximatePolygon } from './contourDetection.js';
import { findCornerPoints } from './cornerDetection.js';
import { cannyEdgeDetector, initializeWasm } from './edgeDetection.js';

/**
 * Global initialization helper for convenience.
 */
export async function initialize() {
  return await initializeWasm();
}

/**
 * Unified Scanner class for better state and configuration management.
 */
export class Scanner {
  constructor(options = {}) {
    this.defaultOptions = {
      maxProcessingDimension: 800,
      mode: 'detect',
      output: 'canvas',
      ...options
    };
    this.initialized = false;
  }

  /**
   * Warm up the scanner (load WASM, etc.)
   */
  async initialize() {
    if (this.initialized) return;
    await initializeWasm();
    this.initialized = true;
  }

  /**
   * Scan an image for a document.
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image 
   * @param {Object} options Override default options
   */
  async scan(image, options = {}) {
    if (!this.initialized) await this.initialize();
    const combinedOptions = { ...this.defaultOptions, ...options };
    return await scanDocument(image, combinedOptions);
  }

  /**
   * Extract a document from an image using manual corners.
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image 
   * @param {Object} corners 
   * @param {Object} options 
   */
  async extract(image, corners, options = {}) {
    if (!this.initialized) await this.initialize();
    const combinedOptions = { ...this.defaultOptions, ...options };
    return await extractDocument(image, corners, combinedOptions);
  }
}



/**
 * Prepares image, downscales, and converts to grayscale in a single operation.
 * Uses OffscreenCanvas and CSS filters for maximum performance.
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image - Input image
 * @param {number} maxDimension - Maximum dimension for processing (default 800)
 * @returns {Promise<Object>} { grayscaleData, scaleFactor, originalDimensions, scaledDimensions }
 */
async function prepareScaleAndGrayscale(image, maxDimension = 800) {
  let originalWidth, originalHeight;
  
  // Robust check for ImageData without relying on global ImageData class
  const isImageData = image && typeof image.width === 'number' && typeof image.height === 'number' && image.data;

  // Get original dimensions
  if (isImageData) {
    originalWidth = image.width;
    originalHeight = image.height;
  } else if (image) {
    originalWidth = image.width || image.naturalWidth;
    originalHeight = image.height || image.naturalHeight;
  } else {
    throw new Error('No image provided');
  }
  
  const maxCurrentDimension = Math.max(originalWidth, originalHeight);
  
  // Calculate target dimensions
  let targetWidth, targetHeight, scaleFactor;
  
  if (maxCurrentDimension <= maxDimension) {
    targetWidth = originalWidth;
    targetHeight = originalHeight;
    scaleFactor = 1;
  } else {
    const scale = maxDimension / maxCurrentDimension;
    targetWidth = Math.round(originalWidth * scale);
    targetHeight = Math.round(originalHeight * scale);
    scaleFactor = 1 / scale;
  }
  
  // Use OffscreenCanvas if available (faster, no DOM interaction)
  const useOffscreen = typeof OffscreenCanvas !== 'undefined';
  const canvas = useOffscreen 
    ? new OffscreenCanvas(targetWidth, targetHeight)
    : document.createElement('canvas');
  
  if (!useOffscreen) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Draw scaled image without CSS filter
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  
  if (isImageData) {
    // For ImageData, need to put on temp canvas first
    const tempCanvas = useOffscreen
      ? new OffscreenCanvas(originalWidth, originalHeight)
      : document.createElement('canvas');
    if (!useOffscreen) {
      tempCanvas.width = originalWidth;
      tempCanvas.height = originalHeight;
    }
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.putImageData(image, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
  } else {
    ctx.drawImage(image, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
  }
  
  // Get image data and compute grayscale in a single pass (BT.709 luminance)
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;
  const pixelCount = targetWidth * targetHeight;
  const grayscaleData = new Uint8ClampedArray(pixelCount);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const gray = (data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19) >> 8;
    grayscaleData[j] = gray;
    data[i] = data[i + 1] = data[i + 2] = gray; // update RGBA for debug viz
  }
  
  return {
    grayscaleData,
    imageData, // Keep full RGBA for debug visualization
    scaleFactor,
    originalDimensions: { width: originalWidth, height: originalHeight },
    scaledDimensions: { width: targetWidth, height: targetHeight }
  };
}

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function polygonAreaFromCorners(corners) {
  if (!corners) return 0;
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

function sideLengthsFromCorners(corners) {
  return [
    pointDistance(corners.topLeft, corners.topRight),
    pointDistance(corners.topRight, corners.bottomRight),
    pointDistance(corners.bottomRight, corners.bottomLeft),
    pointDistance(corners.bottomLeft, corners.topLeft)
  ];
}

function cornerAnglesDegrees(corners) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const angles = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];

    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;

    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);
    const denom = Math.max(1e-6, mag1 * mag2);
    const cosTheta = Math.max(-1, Math.min(1, dot / denom));
    angles.push((Math.acos(cosTheta) * 180) / Math.PI);
  }

  return angles;
}

function computeRightAngleScore(corners) {
  const angles = cornerAnglesDegrees(corners);
  let total = 0;

  for (const angle of angles) {
    const deviation = Math.abs(angle - 90);
    total += clamp01(1 - deviation / 55);
  }

  return total / Math.max(1, angles.length);
}

function computeOppositeSideConsistency(corners) {
  const sides = sideLengthsFromCorners(corners);
  const widthConsistency = Math.min(sides[0], sides[2]) / Math.max(1e-6, Math.max(sides[0], sides[2]));
  const heightConsistency = Math.min(sides[1], sides[3]) / Math.max(1e-6, Math.max(sides[1], sides[3]));
  return (widthConsistency + heightConsistency) / 2;
}

function compareCandidates(a, b) {
  const validDelta = Number(b.isValid) - Number(a.isValid);
  if (validDelta !== 0) return validDelta;

  const confidenceDelta = b.confidence - a.confidence;
  const nearTie = Math.abs(confidenceDelta) < 0.015;
  if (!nearTie && confidenceDelta !== 0) return confidenceDelta;

  // For near ties, prefer simpler quadrilateral geometry.
  const complexityA = Math.abs((a.approxCount ?? 99) - 4);
  const complexityB = Math.abs((b.approxCount ?? 99) - 4);
  const complexityDelta = complexityA - complexityB;
  if (complexityDelta !== 0) return complexityDelta;

  const angleDelta = (b.rightAngleScore ?? 0) - (a.rightAngleScore ?? 0);
  if (Math.abs(angleDelta) > 1e-6) return angleDelta;

  const fitErrorA = Math.abs(1 - (a.contourFitRatio ?? 1));
  const fitErrorB = Math.abs(1 - (b.contourFitRatio ?? 1));
  const fitDelta = fitErrorA - fitErrorB;
  if (Math.abs(fitDelta) > 1e-6) return fitDelta;

  return (
    confidenceDelta ||
    b.score - a.score ||
    b.coverageRatio - a.coverageRatio ||
    b.area - a.area
  );
}

function cornersAreFiniteAndDistinct(corners, minDistance = 6) {
  const points = [corners?.topLeft, corners?.topRight, corners?.bottomRight, corners?.bottomLeft];
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return false;
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (pointDistance(points[i], points[j]) < minDistance) {
        return false;
      }
    }
  }

  return true;
}

function isConvexQuadrilateral(corners) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const crossSigns = [];

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
    if (Math.abs(cross) < 1e-6) {
      continue;
    }
    crossSigns.push(Math.sign(cross));
  }

  if (crossSigns.length < 3) {
    return false;
  }

  const firstSign = crossSigns[0];
  return crossSigns.every((s) => s === firstSign);
}

function computeEdgeSupportScore(contour, edges, width, height) {
  if (!contour?.points || contour.points.length === 0) {
    return 0;
  }

  const sampleStep = Math.max(1, Math.floor(contour.points.length / 240));
  let samples = 0;
  let supported = 0;

  for (let i = 0; i < contour.points.length; i += sampleStep) {
    const p = contour.points[i];
    const x = Math.max(0, Math.min(width - 1, p.x | 0));
    const y = Math.max(0, Math.min(height - 1, p.y | 0));
    samples++;

    let localHit = false;
    for (let oy = -1; oy <= 1 && !localHit; oy++) {
      const ny = y + oy;
      if (ny < 0 || ny >= height) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox;
        if (nx < 0 || nx >= width) continue;
        if (edges[ny * width + nx] > 0) {
          localHit = true;
          break;
        }
      }
    }

    if (localHit) supported++;
  }

  if (samples === 0) return 0;
  return supported / samples;
}

function evaluateContourCandidate(contour, edges, width, height, options = {}) {
  const epsilon = options.epsilon || 0.02;
  const approx = approximatePolygon(contour.points, epsilon);
  const approxCount = approx.length;
  const corners = findCornerPoints(contour, { epsilon });

  if (!corners) {
    return {
      contour,
      corners: null,
      score: 0,
      confidence: 0,
      isValid: false,
      area: contour.area || 0,
      fillRatio: 0,
      coverageRatio: 0,
      cornersArea: 0,
      approxCount,
      convex: false,
      edgeSupport: 0,
      aspectRatio: Infinity,
      minSide: 0,
      rightAngleScore: 0,
      oppositeSideConsistency: 0,
      contourFitRatio: 0,
      contourFitScore: 0
    };
  }

  const imageArea = width * height;
  const area = contour.area || 0;
  const box = contour.boundingBox || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const boxArea = Math.max(1, (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1));
  const fillRatio = area / boxArea;
  const cornersArea = polygonAreaFromCorners(corners);
  const coverageRatio = cornersArea / Math.max(1, imageArea);

  const sides = sideLengthsFromCorners(corners);
  const minSide = Math.min(...sides);
  const avgWidth = (sides[0] + sides[2]) / 2;
  const avgHeight = (sides[1] + sides[3]) / 2;
  const aspectRatio = avgWidth > avgHeight ? avgWidth / Math.max(1e-6, avgHeight) : avgHeight / Math.max(1e-6, avgWidth);

  const convex = isConvexQuadrilateral(corners);
  const edgeSupport = computeEdgeSupportScore(contour, edges, width, height);
  const rightAngleScore = computeRightAngleScore(corners);
  const oppositeSideConsistency = computeOppositeSideConsistency(corners);
  const contourFitRatio = area / Math.max(1, cornersArea);
  const contourFitScore = clamp01(1 - Math.abs(contourFitRatio - 1) / 0.55);
  const quadLikeness = approxCount === 4
    ? 1
    : approxCount === 5
      ? 0.9
      : approxCount === 6
        ? 0.7
        : approxCount <= 8
          ? 0.5
          : 0.28;

  const areaScore = clamp01(area / Math.max(1, imageArea * 0.4));
  const fillScore = clamp01((fillRatio - 0.08) / 0.72);
  const coverageScore = clamp01((coverageRatio - 0.03) / 0.82);

  const minSideRatio = options.minDocumentSideRatio !== undefined ? options.minDocumentSideRatio : 0.06;
  const minCoverage = options.minDocumentCoverageRatio !== undefined ? options.minDocumentCoverageRatio : 0.04;
  const maxAspect = options.maxDocumentAspectRatio !== undefined ? options.maxDocumentAspectRatio : 8;
  const minFillRatio = options.minDocumentFillRatio !== undefined ? options.minDocumentFillRatio : 0.07;
  const minContourFitRatio = options.minContourFitRatio !== undefined ? options.minContourFitRatio : 0.11;
  const maxContourFitRatio = options.maxContourFitRatio !== undefined ? options.maxContourFitRatio : 1.2;
  const minRightAngleScore = options.minRightAngleScore !== undefined ? options.minRightAngleScore : 0.42;
  const minOppositeSideConsistency = options.minOppositeSideConsistency !== undefined ? options.minOppositeSideConsistency : 0.3;
  const minSidePx = Math.min(width, height) * minSideRatio;

  const geometryValid =
    cornersAreFiniteAndDistinct(corners) &&
    convex &&
    minSide >= minSidePx &&
    coverageRatio >= minCoverage &&
    aspectRatio <= maxAspect &&
    fillRatio >= minFillRatio &&
    contourFitRatio >= minContourFitRatio &&
    contourFitRatio <= maxContourFitRatio &&
    rightAngleScore >= minRightAngleScore &&
    oppositeSideConsistency >= minOppositeSideConsistency;

  const score =
    areaScore * 0.22 +
    fillScore * 0.14 +
    quadLikeness * 0.15 +
    (convex ? 1 : 0) * 0.08 +
    edgeSupport * 0.08 +
    coverageScore * 0.13 +
    rightAngleScore * 0.1 +
    oppositeSideConsistency * 0.05 +
    contourFitScore * 0.05;

  const confidence = geometryValid ? score : score * 0.33;

  return {
    contour,
    corners,
    score,
    confidence,
    isValid: geometryValid,
    area,
    fillRatio,
    coverageRatio,
    cornersArea,
    approxCount,
    convex,
    edgeSupport,
    aspectRatio,
    minSide,
    rightAngleScore,
    oppositeSideConsistency,
    contourFitRatio,
    contourFitScore
  };
}

function selectBestContourCandidate(contours, edges, width, height, options = {}) {
  const maxCandidateContours = options.maxCandidateContours || 12;
  const candidates = contours
    .slice(0, maxCandidateContours)
    .map((contour, index) => ({
      rankByArea: index,
      ...evaluateContourCandidate(contour, edges, width, height, options)
    }))
    .sort(compareCandidates);

  return {
    best: candidates[0] || null,
    candidates
  };
}

function shouldRunDetectionCascade(bestCandidate, options = {}) {
  if (options.enableDetectionCascade === false) return false;
  if (!bestCandidate || !bestCandidate.corners) return true;

  const minConfidenceForSinglePass = options.minCascadeTriggerConfidence !== undefined
    ? options.minCascadeTriggerConfidence
    : 0.68;

  if (!bestCandidate.isValid) return true;
  if (bestCandidate.confidence < minConfidenceForSinglePass) return true;
  if (bestCandidate.approxCount > 5) return true;
  if (bestCandidate.rightAngleScore < 0.55) return true;
  if (bestCandidate.contourFitRatio < 0.14) return true;

  return false;
}

function buildDetectionPassProfiles(options = {}) {
  const baseKernel = options.dilationKernelSize || 3;
  const baseIterations = options.dilationIterations || 1;
  const baseApplyDilation = options.applyDilation !== undefined ? options.applyDilation : true;

  const profiles = [
    {
      name: 'default',
      lowThreshold: options.lowThreshold,
      highThreshold: options.highThreshold,
      dilationKernelSize: baseKernel,
      dilationIterations: baseIterations,
      applyDilation: baseApplyDilation
    }
  ];

  if (options.enableDetectionCascade === false) {
    return profiles;
  }

  profiles.push({
    name: 'connect-edges',
    lowThreshold: options.lowThreshold,
    highThreshold: options.highThreshold,
    dilationKernelSize: Math.max(baseKernel, 5),
    dilationIterations: Math.max(baseIterations, 2),
    applyDilation: true
  });

  profiles.push({
    name: 'no-dilation',
    lowThreshold: options.lowThreshold,
    highThreshold: options.highThreshold,
    dilationKernelSize: baseKernel,
    dilationIterations: baseIterations,
    applyDilation: false
  });

  if (options.lowThreshold === undefined && options.highThreshold === undefined) {
    profiles.push({
      name: 'fixed-mid-thresholds',
      lowThreshold: 60,
      highThreshold: 180,
      dilationKernelSize: baseKernel,
      dilationIterations: baseIterations,
      applyDilation: baseApplyDilation
    });
  }

  const deduped = [];
  const seen = new Set();
  for (const profile of profiles) {
    const key = [
      profile.lowThreshold,
      profile.highThreshold,
      profile.dilationKernelSize,
      profile.dilationIterations,
      profile.applyDilation
    ].join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(profile);
  }

  return deduped;
}

// Internal function to detect document in image
// Now accepts pre-computed grayscale data (from prepareScaleAndGrayscale)
async function detectDocumentInternal(grayscaleData, width, height, scaleFactor, options = {}) {
  // Always create a debug object to collect timings (even if not in debug mode)
  const debugInfo = options.debug ? {} : { _timingsOnly: true };
  const timings = [];
  
  if (debugInfo && !debugInfo._timingsOnly) {
    debugInfo.preprocessing = {
      scaledDimensions: { width, height },
      scaleFactor,
      maxProcessingDimension: options.maxProcessingDimension || 800
    };
  }
  
  const passProfiles = buildDetectionPassProfiles(options);
  const passResults = [];

  const runDetectionPass = async (profile, passIndex) => {
    const passLabel = profile.name || `pass-${passIndex + 1}`;
    const passSuffix = passIndex === 0 ? '' : ` (${passLabel})`;
    const passDebug = options.debug ? {} : { _timingsOnly: true };

    const edges = await cannyEdgeDetector(grayscaleData, {
      width,
      height,
      lowThreshold: profile.lowThreshold,
      highThreshold: profile.highThreshold,
      dilationKernelSize: profile.dilationKernelSize,
      dilationIterations: profile.dilationIterations,
      applyDilation: profile.applyDilation,
      debug: passDebug,
      skipGrayscale: true,
      useWasmBlur: true,
      useWasmHysteresis: options.useWasmHysteresis,
      useWasmFullCanny: options.useWasmFullCanny,
    });

    if (passDebug.timings) {
      passDebug.timings.forEach((timing) => {
        if (timing.step === 'Edge Detection Total') return;
        timings.push({ step: `${timing.step}${passSuffix}`, ms: timing.ms });
      });
    }

    let t0 = performance.now();
    const contours = detectDocumentContour(edges, {
      minArea: (options.minArea || 1000) / (scaleFactor * scaleFactor),
      width,
      height
    });
    timings.push({ step: `Find Contours${passSuffix}`, ms: (performance.now() - t0).toFixed(2) });

    t0 = performance.now();
    const { best, candidates } = selectBestContourCandidate(contours, edges, width, height, options);
    timings.push({ step: `Corner Detection${passSuffix}`, ms: (performance.now() - t0).toFixed(2) });

    return {
      name: passLabel,
      params: {
        lowThreshold: profile.lowThreshold,
        highThreshold: profile.highThreshold,
        dilationKernelSize: profile.dilationKernelSize,
        dilationIterations: profile.dilationIterations,
        applyDilation: profile.applyDilation
      },
      contours,
      best,
      candidates
    };
  };

  const primaryPass = await runDetectionPass(passProfiles[0], 0);
  passResults.push(primaryPass);

  if (shouldRunDetectionCascade(primaryPass.best, options)) {
    for (let i = 1; i < passProfiles.length; i++) {
      passResults.push(await runDetectionPass(passProfiles[i], i));
    }
  }

  const allCandidates = [];
  for (const pass of passResults) {
    for (const candidate of pass.candidates) {
      allCandidates.push({
        ...candidate,
        passName: pass.name,
        passParams: pass.params
      });
    }
  }

  allCandidates.sort(compareCandidates);
  const best = allCandidates[0] || null;
  const candidates = allCandidates;

  if (!best || !best.corners) {
    console.log('No document detected');
    return {
      success: false,
      message: 'No document detected',
      debug: debugInfo._timingsOnly ? null : debugInfo,
      timings: timings
    };
  }

  if (debugInfo && !debugInfo._timingsOnly) {
    debugInfo.passes = passResults.map((pass) => ({
      name: pass.name,
      params: pass.params,
      contourCount: pass.contours.length,
      bestCandidate: pass.best
        ? {
            score: pass.best.score,
            confidence: pass.best.confidence,
            isValid: pass.best.isValid,
            approxCount: pass.best.approxCount,
            coverageRatio: pass.best.coverageRatio,
            fillRatio: pass.best.fillRatio,
            rightAngleScore: pass.best.rightAngleScore,
            contourFitRatio: pass.best.contourFitRatio
          }
        : null
    }));

    debugInfo.candidates = candidates.map((candidate) => ({
      passName: candidate.passName,
      rankByArea: candidate.rankByArea,
      area: candidate.area,
      fillRatio: candidate.fillRatio,
      coverageRatio: candidate.coverageRatio,
      cornersArea: candidate.cornersArea,
      approxCount: candidate.approxCount,
      convex: candidate.convex,
      edgeSupport: candidate.edgeSupport,
      aspectRatio: candidate.aspectRatio,
      minSide: candidate.minSide,
      rightAngleScore: candidate.rightAngleScore,
      oppositeSideConsistency: candidate.oppositeSideConsistency,
      contourFitRatio: candidate.contourFitRatio,
      contourFitScore: candidate.contourFitScore,
      score: candidate.score,
      confidence: candidate.confidence,
      isValid: candidate.isValid
    }));
    debugInfo.selectedCandidate = candidates[0]
      ? {
          passName: candidates[0].passName,
          rankByArea: candidates[0].rankByArea,
          area: candidates[0].area,
          fillRatio: candidates[0].fillRatio,
          coverageRatio: candidates[0].coverageRatio,
          approxCount: candidates[0].approxCount,
          edgeSupport: candidates[0].edgeSupport,
          aspectRatio: candidates[0].aspectRatio,
          minSide: candidates[0].minSide,
          rightAngleScore: candidates[0].rightAngleScore,
          oppositeSideConsistency: candidates[0].oppositeSideConsistency,
          contourFitRatio: candidates[0].contourFitRatio,
          score: candidates[0].score,
          confidence: candidates[0].confidence,
          isValid: candidates[0].isValid
        }
      : null;
  }

  const cornerPoints = best.corners;
  const documentContour = best.contour;
  
  // Scale corner points back to original image size
  let finalCorners = cornerPoints;
  if (scaleFactor !== 1) {
    finalCorners = {
      topLeft: { x: cornerPoints.topLeft.x * scaleFactor, y: cornerPoints.topLeft.y * scaleFactor },
      topRight: { x: cornerPoints.topRight.x * scaleFactor, y: cornerPoints.topRight.y * scaleFactor },
      bottomRight: { x: cornerPoints.bottomRight.x * scaleFactor, y: cornerPoints.bottomRight.y * scaleFactor },
      bottomLeft: { x: cornerPoints.bottomLeft.x * scaleFactor, y: cornerPoints.bottomLeft.y * scaleFactor },
    };
  }
  
  // Return the result, scaling the contour points back up as well
  return {
    success: true,
    contour: documentContour,
    corners: finalCorners,
    confidence: best.confidence,
    debug: debugInfo._timingsOnly ? null : debugInfo,
    timings: timings
  };
}

// --- Perspective transform helpers (internal use only) ---
function getPerspectiveTransform(srcPoints, dstPoints) {
  // Helper to build the system of equations
  function buildMatrix(points) {
    const matrix = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = points[i];
      matrix.push([x, y, 1, 0, 0, 0, -x * dstPoints[i][0], -y * dstPoints[i][0]]);
      matrix.push([0, 0, 0, x, y, 1, -x * dstPoints[i][1], -y * dstPoints[i][1]]);
    }
    return matrix;
  }

  const A = buildMatrix(srcPoints);
  const b = [
    dstPoints[0][0], dstPoints[0][1],
    dstPoints[1][0], dstPoints[1][1],
    dstPoints[2][0], dstPoints[2][1],
    dstPoints[3][0], dstPoints[3][1]
  ];

  // Solve Ah = b for h (h is 8x1, last element is 1)
  // Use Gaussian elimination or Cramer's rule for 8x8
  // For simplicity, use numeric.js if available, else implement basic solver
  function solve(A, b) {
    // Gaussian elimination for 8x8
    const m = A.length;
    const n = A[0].length;
    const M = A.map(row => row.slice());
    const B = b.slice();

    for (let i = 0; i < n; i++) {
      // Find max row
      let maxRow = i;
      for (let k = i + 1; k < m; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      // Swap rows
      [M[i], M[maxRow]] = [M[maxRow], M[i]];
      [B[i], B[maxRow]] = [B[maxRow], B[i]];

      // Eliminate
      for (let k = i + 1; k < m; k++) {
        const c = M[k][i] / M[i][i];
        for (let j = i; j < n; j++) {
          M[k][j] -= c * M[i][j];
        }
        B[k] -= c * B[i];
      }
    }

    // Back substitution
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let sum = B[i];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      x[i] = sum / M[i][i];
    }
    return x;
  }

  const h = solve(A, b);
  // h is [h0,h1,h2,h3,h4,h5,h6,h7], h8 = 1
  const matrix = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];
  return matrix;
}




function unwarpImage(ctx, image, corners) {
  // Get perspective transform matrix
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  // Compute output rectangle size
  const widthA = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const widthB = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const maxWidth = Math.round(Math.max(widthA, widthB));
  const heightA = Math.hypot(topRight.x - bottomRight.x, topRight.y - bottomRight.y);
  const heightB = Math.hypot(topLeft.x - bottomLeft.x, topLeft.y - bottomLeft.y);
  const maxHeight = Math.round(Math.max(heightA, heightB));

  // Set output canvas size
  ctx.canvas.width = maxWidth;
  ctx.canvas.height = maxHeight;

  const srcPoints = [
    [topLeft.x, topLeft.y],
    [topRight.x, topRight.y],
    [bottomRight.x, bottomRight.y],
    [bottomLeft.x, bottomLeft.y]
  ];
  const dstPoints = [
    [0, 0],
    [maxWidth - 1, 0],
    [maxWidth - 1, maxHeight - 1],
    [0, maxHeight - 1]
  ];
  const perspectiveMatrix = getPerspectiveTransform(srcPoints, dstPoints);
  warpTransform(ctx, image, perspectiveMatrix, maxWidth, maxHeight);
}

function invert3x3(m) {
  // Invert a 3x3 matrix
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;
  const det = a * A + b * B + c * C;
  if (det === 0) throw new Error('Singular matrix');
  return [
    [A / det, D / det, G / det],
    [B / det, E / det, H / det],
    [C / det, F / det, I / det]
  ];
}

function warpTransform(ctx, image, matrix, outWidth, outHeight) {
  // Pixel-level bilinear interpolation approach.
  // For each output pixel, compute the corresponding source coordinate via the
  // inverse perspective matrix, then sample the source image with bilinear
  // blending.  This replaces the 8 192-triangle Canvas 2D approach and is
  // both faster (no ctx.save/clip/setTransform/drawImage/restore per triangle)
  // and produces seamless output (no triangle-seam artifacts).

  const isImageData = image && typeof image.width === 'number' && typeof image.height === 'number' && image.data;
  const srcWidth = image.width || image.naturalWidth;
  const srcHeight = image.height || image.naturalHeight;

  // Read source pixels once
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
  if (isImageData) {
    srcCtx.putImageData(image, 0, 0);
  } else {
    srcCtx.drawImage(image, 0, 0, srcWidth, srcHeight);
  }
  const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight).data;

  // Inverse matrix for mapping output coords → source coords
  const inv = invert3x3(matrix);
  // Destructure for tight inner loop
  const i00 = inv[0][0], i01 = inv[0][1], i02 = inv[0][2];
  const i10 = inv[1][0], i11 = inv[1][1], i12 = inv[1][2];
  const i20 = inv[2][0], i21 = inv[2][1], i22 = inv[2][2];

  const outData = ctx.createImageData(outWidth, outHeight);
  const dst = outData.data;
  const maxSrcX = srcWidth - 1;
  const maxSrcY = srcHeight - 1;

  for (let oy = 0; oy < outHeight; oy++) {
    // Precompute the y-dependent part of the inverse transform
    const iy1 = i01 * oy + i02;
    const iy2 = i11 * oy + i12;
    const iy3 = i21 * oy + i22;

    for (let ox = 0; ox < outWidth; ox++) {
      const w = i20 * ox + iy3;
      const invW = 1 / w;
      const sx = (i00 * ox + iy1) * invW;
      const sy = (i10 * ox + iy2) * invW;

      // Clamp to source bounds
      const csx = sx < 0 ? 0 : sx > maxSrcX ? maxSrcX : sx;
      const csy = sy < 0 ? 0 : sy > maxSrcY ? maxSrcY : sy;

      // Bilinear interpolation
      const x0 = csx | 0;        // floor
      const y0 = csy | 0;
      const x1 = x0 < maxSrcX ? x0 + 1 : x0;
      const y1 = y0 < maxSrcY ? y0 + 1 : y0;
      const fx = csx - x0;
      const fy = csy - y0;
      const fx1 = 1 - fx;
      const fy1 = 1 - fy;

      const w00 = fx1 * fy1;
      const w10 = fx  * fy1;
      const w01 = fx1 * fy;
      const w11 = fx  * fy;

      const idx00 = (y0 * srcWidth + x0) << 2;
      const idx10 = (y0 * srcWidth + x1) << 2;
      const idx01 = (y1 * srcWidth + x0) << 2;
      const idx11 = (y1 * srcWidth + x1) << 2;

      const di = (oy * outWidth + ox) << 2;
      dst[di]     = srcData[idx00]     * w00 + srcData[idx10]     * w10 + srcData[idx01]     * w01 + srcData[idx11]     * w11 + 0.5 | 0;
      dst[di + 1] = srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11 + 0.5 | 0;
      dst[di + 2] = srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11 + 0.5 | 0;
      dst[di + 3] = 255;
    }
  }

  ctx.putImageData(outData, 0, 0);
}


/**
 * Extract document with manual corner points (no detection).
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image
 * @param {Object} corners - Corner points object with topLeft, topRight, bottomRight, bottomLeft
 * @param {Object} options
 *   - output: 'canvas' | 'imagedata' | 'dataurl' (default: 'canvas')
 * @returns {Promise<{output, corners, success, message}>}
 */
export async function extractDocument(image, corners, options = {}) {
  const outputType = options.output || 'canvas';

  if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
    return {
      output: null,
      corners: null,
      success: false,
      message: 'Invalid corner points provided'
    };
  }

  try {
    // Create result canvas and extract document
    const resultCanvas = document.createElement('canvas');
    const ctx = resultCanvas.getContext('2d');
    unwarpImage(ctx, image, corners);

    let output;
    // Prepare output in requested format
    if (outputType === 'canvas') {
      output = resultCanvas;
    } else if (outputType === 'imagedata') {
      output = resultCanvas.getContext('2d').getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    } else if (outputType === 'dataurl') {
      output = resultCanvas.toDataURL();
    } else {
      output = resultCanvas;
    }

    return {
      output,
      corners,
      success: true,
      message: 'Document extracted successfully'
    };
  } catch (error) {
    return {
      output: null,
      corners,
      success: false,
      message: `Extraction failed: ${error.message}`
    };
  }
}

/**
 * Main entry point for document scanning.
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image
 * @param {Object} options
 *   - mode: 'detect' | 'extract' (default: 'detect')
 *   - output: 'canvas' | 'imagedata' | 'dataurl' (default: 'canvas')
 *   - debug: boolean
 *   - ...other detection options
 * @returns {Promise<{output, corners, contour, debug, success, message, timings}>}
 */
export async function scanDocument(image, options = {}) {
  const timings = [];
  const totalStart = performance.now();
  
  const mode = options.mode || 'detect';
  const outputType = options.output || 'canvas';
  const debug = !!options.debug;
  const maxProcessingDimension = options.maxProcessingDimension || 800;

  // Combined image preparation + downscaling + grayscale (OffscreenCanvas + CSS filter)
  let t0 = performance.now();
  const { grayscaleData, imageData, scaleFactor, originalDimensions, scaledDimensions } = 
    await prepareScaleAndGrayscale(image, maxProcessingDimension);
  timings.push({ step: 'Image Prep + Scale + Gray', ms: (performance.now() - t0).toFixed(2) });

  // Detect document (pass pre-computed grayscale data)
  const detection = await detectDocumentInternal(
    grayscaleData, 
    scaledDimensions.width, 
    scaledDimensions.height, 
    scaleFactor, 
    options
  );
  
  // Merge detailed detection timings
  if (detection.timings) {
    detection.timings.forEach(t => timings.push(t));
  }
  
  if (!detection.success) {
    const totalEnd = performance.now();
    timings.unshift({ step: 'Total', ms: (totalEnd - totalStart).toFixed(2) });
    console.table(timings);
    return {
      output: null,
      corners: null,
      contour: null,
      confidence: detection.confidence || null,
      debug: detection.debug,
      success: false,
      message: detection.message || 'No document detected',
      timings
    };
  }

  let resultCanvas;
  let output;

  if (mode === 'detect') {
    // Just return detection info, no image processing
    output = null;
  } else if (mode === 'extract') {
    // Return only the cropped/warped document
    t0 = performance.now();
    resultCanvas = document.createElement('canvas');
    const ctx = resultCanvas.getContext('2d');
    unwarpImage(ctx, image, detection.corners);
    timings.push({ step: 'Perspective Transform', ms: (performance.now() - t0).toFixed(2) });
  }

  // Prepare output in requested format (only if not detect mode)
  if (mode !== 'detect' && resultCanvas) {
    t0 = performance.now();
    if (outputType === 'canvas') {
      output = resultCanvas;
    } else if (outputType === 'imagedata') {
      output = resultCanvas.getContext('2d').getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    } else if (outputType === 'dataurl') {
      output = resultCanvas.toDataURL();
    } else {
      output = resultCanvas;
    }
    timings.push({ step: 'Output Conversion', ms: (performance.now() - t0).toFixed(2) });
  }

  const totalEnd = performance.now();
  timings.unshift({ step: 'Total', ms: (totalEnd - totalStart).toFixed(2) });
  console.table(timings);

  return {
    output,
    corners: detection.corners,
    contour: detection.contour,
    confidence: detection.confidence || null,
    debug: detection.debug,
    success: true,
    message: 'Document detected',
    timings
  };
}