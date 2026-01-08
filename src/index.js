/**
 * scanic
 * JavaScript document scanner without OpenCV dependency
 * MIT License
 */


import { detectDocumentContour } from './contourDetection.js';
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
  
  // Apply grayscale filter during draw - GPU accelerated!
  ctx.filter = 'grayscale(1)';
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
    // Direct draw with scaling + grayscale filter
    ctx.drawImage(image, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
  }
  
  // Get the grayscale image data
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  
  // Extract single-channel grayscale (R=G=B after filter, so just take R)
  const grayscaleData = new Uint8ClampedArray(targetWidth * targetHeight);
  const data = imageData.data;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayscaleData[j] = data[i]; // R channel (same as G and B after grayscale filter)
  }
  
  return {
    grayscaleData,
    imageData, // Keep full RGBA for debug visualization
    scaleFactor,
    originalDimensions: { width: originalWidth, height: originalHeight },
    scaledDimensions: { width: targetWidth, height: targetHeight }
  };
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
  
  // Run edge detection on pre-computed grayscale data (skip grayscale conversion)
  const edges = await cannyEdgeDetector(grayscaleData, {
    width,
    height,
    lowThreshold: options.lowThreshold || 75,   // Match OpenCV values
    highThreshold: options.highThreshold || 200, // Match OpenCV values
    dilationKernelSize: options.dilationKernelSize || 3, // Match OpenCV value 
    dilationIterations: options.dilationIterations || 1,
    debug: debugInfo,
    skipGrayscale: true, // Skip grayscale - already done in prep
    useWasmBlur: true,
  });
  
  // Extract edge detection timings (skip the 'Total' entry)
  if (debugInfo.timings) {
    debugInfo.timings.forEach(t => {
      if (t.step !== 'Edge Detection Total') timings.push(t);
    });
  }
  
  // Detect contours from edges
  let t0 = performance.now();
  const contours = detectDocumentContour(edges, {
    minArea: (options.minArea || 1000) / (scaleFactor * scaleFactor), // Adjust minArea for scaled image
    debug: debugInfo,
    width: width,     
    height: height    
  });
  timings.push({ step: 'Find Contours', ms: (performance.now() - t0).toFixed(2) });

  if (!contours || contours.length === 0) {
    console.log('No document detected');
    return {
      success: false,
      message: 'No document detected',
      debug: debugInfo._timingsOnly ? null : debugInfo,
      timings: timings
    };
  }
  
  // Get the largest contour which is likely the document
  const documentContour = contours[0]; 
  
  // Find corner points on the scaled image
  t0 = performance.now();
  const cornerPoints = findCornerPoints(documentContour, { 
      epsilon: options.epsilon // Pass epsilon for approximation
  });
  timings.push({ step: 'Corner Detection', ms: (performance.now() - t0).toFixed(2) });
  
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
  // Triangle subdivision approach - uses GPU-accelerated affine transforms
  // Split the quad into a grid, then draw each cell as 2 triangles with affine transforms
  
  const srcWidth = image.width || image.naturalWidth;
  const srcHeight = image.height || image.naturalHeight;
  
  // Inverse matrix for mapping output coords to source coords
  const inv = invert3x3(matrix);
  
  // Helper: map output point to source point using perspective transform
  function mapPoint(x, y) {
    const denom = inv[2][0] * x + inv[2][1] * y + inv[2][2];
    return {
      x: (inv[0][0] * x + inv[0][1] * y + inv[0][2]) / denom,
      y: (inv[1][0] * x + inv[1][1] * y + inv[1][2]) / denom
    };
  }
  
  // Grid subdivisions - 64x64 = 8192 triangles
  const gridX = 64;
  const gridY = 64;
  const cellW = outWidth / gridX;
  const cellH = outHeight / gridY;
  
  // Build source canvas once
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(image, 0, 0, srcWidth, srcHeight);
  
  // High quality results
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw each grid cell as 2 triangles
  ctx.save();
  
  for (let gy = 0; gy < gridY; gy++) {
    for (let gx = 0; gx < gridX; gx++) {
      // Destination quad corners (in output space)
      const dx0 = gx * cellW;
      const dy0 = gy * cellH;
      const dx1 = (gx + 1) * cellW;
      const dy1 = (gy + 1) * cellH;
      
      // Map to source quad corners
      const s00 = mapPoint(dx0, dy0);
      const s10 = mapPoint(dx1, dy0);
      const s01 = mapPoint(dx0, dy1);
      const s11 = mapPoint(dx1, dy1);
      
      // Draw 2 triangles per cell
      // Triangle 1: top-left, top-right, bottom-left
      drawTexturedTriangle(ctx, srcCanvas,
        s00.x, s00.y, s10.x, s10.y, s01.x, s01.y,  // source triangle
        dx0, dy0, dx1, dy0, dx0, dy1               // dest triangle
      );
      
      // Triangle 2: top-right, bottom-right, bottom-left
      drawTexturedTriangle(ctx, srcCanvas,
        s10.x, s10.y, s11.x, s11.y, s01.x, s01.y,  // source triangle
        dx1, dy0, dx1, dy1, dx0, dy1               // dest triangle
      );
    }
  }
  
  ctx.restore();
}

// Draw a textured triangle using affine transform + clipping
function drawTexturedTriangle(ctx, img,
  sx0, sy0, sx1, sy1, sx2, sy2,  // source triangle coords
  dx0, dy0, dx1, dy1, dx2, dy2   // dest triangle coords
) {
  // Compute affine transform that maps source triangle to dest triangle
  const denom = (sx0 - sx2) * (sy1 - sy2) - (sx1 - sx2) * (sy0 - sy2);
  if (Math.abs(denom) < 1e-10) return; 
  
  const invDenom = 1 / denom;
  const a = ((dx0 - dx2) * (sy1 - sy2) - (dx1 - dx2) * (sy0 - sy2)) * invDenom;
  const b = ((dx1 - dx2) * (sx0 - sx2) - (dx0 - dx2) * (sx1 - sx2)) * invDenom;
  const c = dx0 - a * sx0 - b * sy0;
  
  const d = ((dy0 - dy2) * (sy1 - sy2) - (dy1 - dy2) * (sy0 - sy2)) * invDenom;
  const e = ((dy1 - dy2) * (sx0 - sx2) - (dy0 - dy2) * (sx1 - sx2)) * invDenom;
  const f = dy0 - d * sx0 - e * sy0;
  
  ctx.save();
  
  // SEAM FIX: Robust Centroid-based Expansion
  // We expand the clipping path by 1px in the direction of the triangle's center to ensure overlap.
  const expand = 1.0; 
  const centerX = (dx0 + dx1 + dx2) / 3;
  const centerY = (dy0 + dy1 + dy2) / 3;
  
  const grow = (x, y) => {
    const vx = x - centerX;
    const vy = y - centerY;
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len < 1e-6) return { x, y };
    return {
      x: x + (vx / len) * expand,
      y: y + (vy / len) * expand
    };
  };

  const p0 = grow(dx0, dy0);
  const p1 = grow(dx1, dy1);
  const p2 = grow(dx2, dy2);

  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();
  
  ctx.setTransform(a, d, b, e, c, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
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
    debug: detection.debug,
    success: true,
    message: 'Document detected',
    timings
  };
}