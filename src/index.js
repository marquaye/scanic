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
    // Gaussian elimination for 8x8 with partial pivoting
    const m = A.length;
    const n = A[0].length;
    const M = A.map(row => row.slice());
    const B = b.slice();

    for (let i = 0; i < n; i++) {
      // Find max row for partial pivoting
      let maxRow = i;
      for (let k = i + 1; k < m; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      
      // Check for numerical issues
      if (Math.abs(M[maxRow][i]) < 1e-12) {
        console.warn('Matrix is nearly singular, perspective transform may be inaccurate');
      }
      
      // Swap rows
      [M[i], M[maxRow]] = [M[maxRow], M[i]];
      [B[i], B[maxRow]] = [B[maxRow], B[i]];

      // Eliminate
      for (let k = i + 1; k < m; k++) {
        if (Math.abs(M[i][i]) < 1e-12) continue; // Skip if pivot is too small
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
      if (Math.abs(M[i][i]) < 1e-12) {
        console.warn('Singular matrix encountered during back substitution');
        x[i] = 0;
      } else {
        x[i] = sum / M[i][i];
      }
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
  // Calculate the output dimensions based on the corner distances
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  
  // Calculate width and height of the corrected document
  const topWidth = Math.sqrt(Math.pow(topRight.x - topLeft.x, 2) + Math.pow(topRight.y - topLeft.y, 2));
  const bottomWidth = Math.sqrt(Math.pow(bottomRight.x - bottomLeft.x, 2) + Math.pow(bottomRight.y - bottomLeft.y, 2));
  const leftHeight = Math.sqrt(Math.pow(bottomLeft.x - topLeft.x, 2) + Math.pow(bottomLeft.y - topLeft.y, 2));
  const rightHeight = Math.sqrt(Math.pow(bottomRight.x - topRight.x, 2) + Math.pow(bottomRight.y - topRight.y, 2));
  
  // Use the maximum dimensions to preserve detail
  const outputWidth = Math.max(topWidth, bottomWidth);
  const outputHeight = Math.max(leftHeight, rightHeight);
  
  // Resize canvas to fit the corrected document
  ctx.canvas.width = Math.round(outputWidth);
  ctx.canvas.height = Math.round(outputHeight);
  
  const srcPoints = [
    [topLeft.x, topLeft.y],
    [topRight.x, topRight.y],
    [bottomRight.x, bottomRight.y],
    [bottomLeft.x, bottomLeft.y]
  ];
  const dstPoints = [
    [0, 0],
    [outputWidth, 0],
    [outputWidth, outputHeight],
    [0, outputHeight]
  ];
  
  // Get perspective transform matrix (correct parameter order: src -> dst)
  const perspectiveMatrix = getPerspectiveTransform(srcPoints, dstPoints);
  console.log('Perspective Matrix:', perspectiveMatrix);
  
  // Apply the perspective transform using manual pixel mapping
  warpTransform(ctx, image, perspectiveMatrix, outputWidth, outputHeight);
}

function warpTransform(ctx, image, matrix, outputWidth, outputHeight) {
  // Create a temporary canvas to draw the original image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.width || image.naturalWidth;
  tempCanvas.height = image.height || image.naturalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(image, 0, 0, tempCanvas.width, tempCanvas.height);
  
  // Get the source image data
  const sourceImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const sourceData = sourceImageData.data;
  const sourceWidth = tempCanvas.width;
  const sourceHeight = tempCanvas.height;
  
  // Create output image data
  const outputImageData = ctx.createImageData(outputWidth, outputHeight);
  const outputData = outputImageData.data;
  
  console.log(`Transforming from ${sourceWidth}x${sourceHeight} to ${outputWidth}x${outputHeight}`);
  
  // For each pixel in the output image, find the corresponding pixel in the source
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      // Apply inverse perspective transform to find source coordinates
      const denominator = matrix[2][0] * x + matrix[2][1] * y + matrix[2][2];
      
      if (Math.abs(denominator) < 1e-10) continue; // Skip if denominator is too small
      
      let srcX = (matrix[0][0] * x + matrix[0][1] * y + matrix[0][2]) / denominator;
      let srcY = (matrix[1][0] * x + matrix[1][1] * y + matrix[1][2]) / denominator;
      
      // Check if source coordinates are within bounds
      if (srcX >= 0 && srcX < sourceWidth - 1 && srcY >= 0 && srcY < sourceHeight - 1) {
        // Use bilinear interpolation for better quality
        const x1 = Math.floor(srcX);
        const y1 = Math.floor(srcY);
        const x2 = x1 + 1;
        const y2 = y1 + 1;
        
        const dx = srcX - x1;
        const dy = srcY - y1;
        
        // Get the four neighboring pixels
        const getPixel = (px, py) => {
          const idx = (py * sourceWidth + px) * 4;
          return [
            sourceData[idx],     // R
            sourceData[idx + 1], // G
            sourceData[idx + 2], // B
            sourceData[idx + 3]  // A
          ];
        };
        
        const p1 = getPixel(x1, y1); // top-left
        const p2 = getPixel(x2, y1); // top-right
        const p3 = getPixel(x1, y2); // bottom-left
        const p4 = getPixel(x2, y2); // bottom-right
        
        // Bilinear interpolation
        const outputIdx = (y * outputWidth + x) * 4;
        for (let c = 0; c < 4; c++) {
          const top = p1[c] * (1 - dx) + p2[c] * dx;
          const bottom = p3[c] * (1 - dx) + p4[c] * dx;
          const interpolated = top * (1 - dy) + bottom * dy;
          outputData[outputIdx + c] = Math.round(interpolated);
        }
      } else {
        // Fill with transparent black for out-of-bounds pixels
        const outputIdx = (y * outputWidth + x) * 4;
        outputData[outputIdx] = 0;     // R
        outputData[outputIdx + 1] = 0; // G
        outputData[outputIdx + 2] = 0; // B
        outputData[outputIdx + 3] = 0; // A
      }
    }
  }
  
  // Put the transformed image data onto the canvas
  ctx.putImageData(outputImageData, 0, 0);
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
    // unwarpImage(ctx, image, result.corners);
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