/**
 * scanic
 * JavaScript document scanner without OpenCV dependency
 * MIT License
 */


import { detectDocumentContour } from './contourDetection.js';
import { findCornerPoints } from './cornerDetection.js';
import { cannyEdgeDetector } from './edgeDetection.js';


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

// Internal function to detect document in image
async function detectDocumentInternal(imageData, options = {}) {
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


/**
 * Main entry point for document scanning.
 * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image
 * @param {Object} options
 *   - mode: 'detect' | 'extract' (default: 'detect')
 *   - output: 'canvas' | 'imagedata' | 'dataurl' (default: 'canvas')
 *   - debug: boolean
 *   - ...other detection options
 * @returns {Promise<{output, corners, contour, debug, success, message}>}
 */
export async function scanDocument(image, options = {}) {
  const mode = options.mode || 'detect';
  const outputType = options.output || 'canvas';
  const debug = !!options.debug;

  // Prepare input image data
  let imageData, width, height;
  if (image instanceof ImageData) {
    imageData = image;
    width = image.width;
    height = image.height;
  } else {
    // HTMLImageElement or HTMLCanvasElement
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width || image.naturalWidth;
    tempCanvas.height = image.height || image.naturalHeight;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
    imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    width = tempCanvas.width;
    height = tempCanvas.height;
  }

  // Detect document
  const detection = await detectDocumentInternal(imageData, options);
  if (!detection.success) {
    return {
      output: null,
      corners: null,
      contour: null,
      debug: detection.debug,
      success: false,
      message: detection.message || 'No document detected'
    };
  }

  let resultCanvas;
  let output;

  if (mode === 'detect') {
    // Just return detection info, no image processing
    output = null;
  } else if (mode === 'extract') {
    // Return only the cropped/warped document
    resultCanvas = document.createElement('canvas');
    const ctx = resultCanvas.getContext('2d');
    unwarpImage(ctx, image, detection.corners);
  }

  // Prepare output in requested format (only if not detect mode)
  if (mode !== 'detect' && resultCanvas) {
    if (outputType === 'canvas') {
      output = resultCanvas;
    } else if (outputType === 'imagedata') {
      output = resultCanvas.getContext('2d').getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    } else if (outputType === 'dataurl') {
      output = resultCanvas.toDataURL();
    } else {
      output = resultCanvas;
    }
  }

  return {
    output,
    corners: detection.corners,
    contour: detection.contour,
    debug: detection.debug,
    success: true,
    message: 'Document detected'
  };
}