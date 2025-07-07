/**
 * scanic
 * JavaScript document scanner without OpenCV dependency
 * MIT License
 */

import { detectDocumentContour } from './contourDetection.js';
import { findCornerPoints } from './cornerDetection.js'; 
import { createDebugLayer } from './debug.js';
import { cannyEdgeDetector } from './edgeDetection.js';

// Export live scanner functionality
export { LiveScanner, checkWebcamAvailability } from './liveScanner.js';


// Helper function to calculate smart adaptive downscale factor
function calculateAdaptiveDownscale(imageData, maxDimension = 800) {
  const { width, height } = imageData;
  const maxCurrentDimension = Math.max(width, height);
  
  // If image is already smaller than target, no scaling needed
  if (maxCurrentDimension <= maxDimension) {
    return {
      scaledImageData: imageData,
      scaleFactor: 1,
      originalDimensions: { width, height },
      scaledDimensions: { width, height }
    };
  }
  
  // Calculate scale factor to fit within maxDimension
  const scaleFactor = maxDimension / maxCurrentDimension;
  const scaledWidth = Math.round(width * scaleFactor);
  const scaledHeight = Math.round(height * scaleFactor);
  
  console.log(`Smart downscale: ${width}x${height} -> ${scaledWidth}x${scaledHeight} (factor: ${scaleFactor.toFixed(3)})`);
  
  // Create scaled image data
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.putImageData(imageData, 0, 0);

  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = scaledWidth;
  scaledCanvas.height = scaledHeight;
  const scaledCtx = scaledCanvas.getContext('2d');
  
  // Use high-quality scaling
  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = 'high';
  scaledCtx.drawImage(tempCanvas, 0, 0, width, height, 0, 0, scaledWidth, scaledHeight);
  
  const scaledImageData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight);
  
  return {
    scaledImageData,
    scaleFactor: 1 / scaleFactor, // Return inverse for compatibility with existing code
    originalDimensions: { width, height },
    scaledDimensions: { width: scaledWidth, height: scaledHeight }
  };
}

// Exported: Extracts (warps/crops) the document from the image using detected corners.
export const extractDocument = function(image, corners) {
  // Create a canvas for the output
  const width = image.width || image.naturalWidth;
  const height = image.height || image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  // Draw the image to the canvas
  ctx.drawImage(image, 0, 0, width, height);
  // Unwarp the image using the corners
  unwarpImage(ctx, image, corners);
  return canvas;
};

// Main API function to detect document in image
export async function detectDocument(imageData, options = {}) {
  
  const debugInfo = options.debug ? {} : null;
  
  // Smart adaptive downscaling - ensure largest dimension doesn't exceed maxProcessingDimension
  const maxProcessingDimension = options.maxProcessingDimension || 800;
  const { scaledImageData, scaleFactor, originalDimensions, scaledDimensions } = 
    calculateAdaptiveDownscale(imageData, maxProcessingDimension);
  
  if (debugInfo) {
    debugInfo.preprocessing = {
      originalDimensions,
      scaledDimensions,
      scaleFactor,
      maxProcessingDimension
    };
  }
  
  const { width, height } = scaledImageData; // Use scaled dimensions
  
  // Run edge detection on the adaptively scaled image
  const edges = await cannyEdgeDetector(scaledImageData, {
    lowThreshold: options.lowThreshold || 75,   // Match OpenCV values
    highThreshold: options.highThreshold || 200, // Match OpenCV values
    dilationKernelSize: options.dilationKernelSize || 3, // Match OpenCV value 
    dilationIterations: options.dilationIterations || 1,
    debug: debugInfo,
    skipNMS: false, // options.skipNMS // Optional flag to skip non-max suppression
    useWasmBlur: true, // option to use wasm blur
  });
  
  // Detect contours from edges
  const contours = detectDocumentContour(edges, {
    minArea: (options.minArea || 1000) / (scaleFactor * scaleFactor), // Adjust minArea for scaled image
    debug: debugInfo,
    width: width,     
    height: height    
  });

  if (!contours || contours.length === 0) {
    console.log('No document detected');
    return {
      success: false,
      message: 'No document detected',
      debug: debugInfo
    };
  }
  
  // Get the largest contour which is likely the document
  const documentContour = contours[0]; 
  
  // Find corner points on the scaled image
  const cornerPoints = findCornerPoints(documentContour, { 
      epsilon: options.epsilon // Pass epsilon for approximation
  });
  
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
    debug: debugInfo
  };
}

  /**
   * Computes a 3x3 perspective transform matrix that maps srcPoints to dstPoints.
   * srcPoints and dstPoints are arrays of 4 [x, y] pairs.
   * Returns a 3x3 matrix as an array of arrays.
   */
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
  // Inverse matrix for mapping output to input
  const inv = invert3x3(matrix);
  // Get source image data
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = image.width || image.naturalWidth;
  srcCanvas.height = image.height || image.naturalHeight;
  const srcCtx = srcCanvas.getContext('2d');
  srcCtx.drawImage(image, 0, 0, srcCanvas.width, srcCanvas.height);
  const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const out = ctx.createImageData(outWidth, outHeight);
  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      // Map (x, y) in output to (srcX, srcY) in input
      const denom = inv[2][0] * x + inv[2][1] * y + inv[2][2];
      const srcX = (inv[0][0] * x + inv[0][1] * y + inv[0][2]) / denom;
      const srcY = (inv[1][0] * x + inv[1][1] * y + inv[1][2]) / denom;
      // Bilinear sample
      const sx = Math.max(0, Math.min(srcCanvas.width - 2, srcX));
      const sy = Math.max(0, Math.min(srcCanvas.height - 2, srcY));
      const ix = Math.floor(sx), iy = Math.floor(sy);
      const dx = sx - ix, dy = sy - iy;
      for (let c = 0; c < 4; c++) {
        // Bilinear interpolation
        const i00 = srcData.data[(iy * srcCanvas.width + ix) * 4 + c];
        const i10 = srcData.data[(iy * srcCanvas.width + (ix + 1)) * 4 + c];
        const i01 = srcData.data[((iy + 1) * srcCanvas.width + ix) * 4 + c];
        const i11 = srcData.data[((iy + 1) * srcCanvas.width + (ix + 1)) * 4 + c];
        out.data[(y * outWidth + x) * 4 + c] =
          (1 - dx) * (1 - dy) * i00 +
          dx * (1 - dy) * i10 +
          (1 - dx) * dy * i01 +
          dx * dy * i11;
      }
    }
  }
  ctx.putImageData(out, 0, 0);
}

// Function to highlight document in an image element or canvas
export async function highlightDocument(image, options = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Set canvas size to match input image
  canvas.width = image.width || image.naturalWidth;
  canvas.height = image.height || image.naturalHeight;
  console.log(`Canvas size: ${canvas.width}x${canvas.height}`);
  
  
  // Draw original image
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  
  // Get image data for processing
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Detect document
  const result = await detectDocument(imageData, options);
  
  if (result.success && result.corners) {
    // Draw the sleek document outline
    drawSleekDocumentOutline(ctx, result.corners, canvas.width, canvas.height, {
      cornerRadius: options.cornerRadius || 15,
      cornerLineLength: options.cornerLineLength || 25,
      cornerLineWidth: options.cornerLineWidth || 4,
      borderWidth: options.borderWidth || 2,
      cornerColor: options.cornerColor || '#FFFFFF',
      borderColor: options.borderColor || '#4A90E2',
      darkenOpacity: options.darkenOpacity || 0.4
    });
    unwarpImage(ctx, image, result.corners);
  }
  
  // Add the debug info to the canvas object itself for later use if needed
  if (options.debug) {
    canvas.debugInfo = result.debug;
  }

  return canvas;
}

// Function to draw sleek document outline with rounded corners and effects
function drawSleekDocumentOutline(ctx, corners, canvasWidth, canvasHeight, options = {}) {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  
  // Configuration
  const cornerRadius = options.cornerRadius || 15;
  const cornerLineLength = options.cornerLineLength || 25;
  const cornerLineWidth = options.cornerLineWidth || 4;
  const borderWidth = options.borderWidth || 2;
  const cornerColor = options.cornerColor || '#FFFFFF';
  const borderColor = options.borderColor || '#4A90E2';
  const darkenOpacity = options.darkenOpacity || 0.4;
  
  // Save current context state
  ctx.save();
  
  // Step 1: Darken areas outside the document
  // Create a path for the entire canvas
  ctx.beginPath();
  ctx.rect(0, 0, canvasWidth, canvasHeight);
  
  // Create a path for the document (as a hole)
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.closePath();
  
  // Use even-odd fill rule to create a "hole" in the rectangle
  ctx.fillStyle = `rgba(0, 0, 0, ${darkenOpacity})`;
  ctx.fill('evenodd');
  
  // Step 2: Draw the main blue border around the document
  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);
  ctx.lineTo(topRight.x, topRight.y);
  ctx.lineTo(bottomRight.x, bottomRight.y);
  ctx.lineTo(bottomLeft.x, bottomLeft.y);
  ctx.closePath();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();
  
  // Step 3: Draw white rounded corners with extending lines
  ctx.strokeStyle = cornerColor;
  ctx.lineWidth = cornerLineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Make corners more rounded by increasing the miter limit
  ctx.miterLimit = 10;
  
  // Helper function to draw L-shaped corner with rounded line caps
  function drawCorner(cornerPoint, adjacentPoint1, adjacentPoint2) {
    const x = cornerPoint.x;
    const y = cornerPoint.y;
    
    // Calculate normalized direction vectors to adjacent points
    const dx1 = adjacentPoint1.x - x;
    const dy1 = adjacentPoint1.y - y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dir1 = { x: dx1 / len1, y: dy1 / len1 };
    
    const dx2 = adjacentPoint2.x - x;
    const dy2 = adjacentPoint2.y - y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const dir2 = { x: dx2 / len2, y: dy2 / len2 };
    
    // Calculate line endpoints pointing towards adjacent corners
    const line1EndX = x + dir1.x * cornerLineLength;
    const line1EndY = y + dir1.y * cornerLineLength;
    const line2EndX = x + dir2.x * cornerLineLength;
    const line2EndY = y + dir2.y * cornerLineLength;
    
    // Draw L-shaped corner as one continuous path with rounded joins
    ctx.beginPath();
    ctx.moveTo(line1EndX, line1EndY);
    ctx.lineTo(x, y);
    ctx.lineTo(line2EndX, line2EndY);
    ctx.stroke();
  }
  
  // Draw corners pointing towards their adjacent corner points
  drawCorner(topLeft, topRight, bottomLeft);
  drawCorner(topRight, topLeft, bottomRight);
  drawCorner(bottomRight, topRight, bottomLeft);
  drawCorner(bottomLeft, topLeft, bottomRight);
  
  // Restore context state
  ctx.restore();
}