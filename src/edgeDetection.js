/**
 * Pure JavaScript implementation of edge detection algorithms
 * Inspired by OpenCV's Canny edge detector
 */

import { DEFAULTS } from './constants.js';
import init, { 
  blur as wasmBlur, 
  calculate_gradients as wasmGradients, 
  dilate as wasmDilate, 
  non_maximum_suppression as wasmMaximumSuppression, 
  canny_edge_detector_full as wasmFullCanny,
  hysteresis_thresholding as wasmHysteresis,
  hysteresis_thresholding_binary as wasmHysteresisBinary
} from '../wasm_blur/pkg/wasm_blur.js';

// Initialize the wasm module
const wasmReady = init();

/**
 * Converts ImageData to grayscale (separate from blur for consistency with jscanify)
 * @param {ImageData} imageData - Original image data
 * @returns {Uint8ClampedArray} Grayscale image data (1 channel)
 */
export function convertToGrayscale(imageData) {
  const { width, height, data } = imageData;
  const grayscale = new Uint8ClampedArray(width * height);
  
  // Convert to grayscale with integer math (faster than floating point)
  // Use bit shifting for multiplication (>>8 is equivalent to /256)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    // 54 (~0.2126*256), 183 (~0.7152*256), 19 (~0.0722*256)
    grayscale[j] = (data[i] * 54 + data[i+1] * 183 + data[i+2] * 19) >> 8;
  }
  
  return grayscale;
}

/**
 * Applies Gaussian blur to a grayscale image (matching jscanify's approach)
 * @param {Uint8ClampedArray} grayscale - Grayscale image data
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} kernelSize - Kernel size (should be 5 to match jscanify)
 * @param {number} sigma - Gaussian sigma parameter
 * @returns {Uint8ClampedArray} Blurred grayscale image data
 */
export function gaussianBlurGrayscale(grayscale, width, height, kernelSize = 5, sigma = 0) {
  // If sigma is 0, calculate it from kernel size (OpenCV default)
  if (sigma === 0) {
    sigma = 0.3 * ((kernelSize - 1) * 0.5 - 1) + 0.8;
  }
  
  const halfKernel = Math.floor(kernelSize / 2);
  
  // Create and normalize Gaussian kernel once
  const kernel = createGaussianKernel(kernelSize, sigma);
  
  // Preallocate arrays
  const tempArray = new Uint8ClampedArray(width * height);
  const blurred = new Uint8ClampedArray(width * height);
  
  // Horizontal pass - process rows in a single loop to improve cache locality
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    
    for (let x = 0; x < width; x++) {
      let sum = 0;
      
      // Apply kernel horizontally with bounds checking
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const xOffset = Math.min(width - 1, Math.max(0, x + k));
        sum += grayscale[rowOffset + xOffset] * kernel[halfKernel + k];
      }
      
      tempArray[rowOffset + x] = sum;
    }
  }
  
  // Vertical pass - process columns with better memory access pattern
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      
      // Apply kernel vertically with bounds checking
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const yOffset = Math.min(height - 1, Math.max(0, y + k));
        sum += tempArray[yOffset * width + x] * kernel[halfKernel + k];
      }
      
      blurred[y * width + x] = Math.round(sum);
    }
  }
  
  return blurred;
}

/**
 * Legacy wrapper for backwards compatibility
 * @param {ImageData} imageData - Original image data
 * @param {number} sigma - Gaussian sigma parameter (standard deviation)
 * @returns {Uint8ClampedArray} Blurred grayscale image data (1 channel)
 */
export function gaussianBlur(imageData, sigma = DEFAULTS.GAUSSIAN_SIGMA, forcedKernelSize = null) {
  const grayscale = convertToGrayscale(imageData);
  const kernelSize = forcedKernelSize || 5; // Default to 5 like jscanify
  return gaussianBlurGrayscale(grayscale, imageData.width, imageData.height, kernelSize, sigma);
}

/**
 * Creates a 1D Gaussian kernel
 * @param {number} size - Kernel size (odd number)
 * @param {number} sigma - Gaussian sigma parameter
 * @returns {Float32Array} Gaussian kernel
 */
function createGaussianKernel(size, sigma) {
  const kernel = new Float32Array(size);
  const halfSize = Math.floor(size / 2);
  
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - halfSize;
    // Gaussian function: (1/(sigma*sqrt(2*PI))) * e^(-(x^2)/(2*sigma^2))
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  
  // Normalize kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  
  return kernel;
}

/**
 * Calculates the gradients (dx, dy) using Sobel operators
 * @param {Uint8ClampedArray} blurred - Blurred grayscale image
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {{dx: Int16Array, dy: Int16Array}} Object containing gradient arrays
 */
function calculateGradients(blurred, width, height) {
  // Use Int16Array to store gradients, allowing negative values
  const dx = new Int16Array(width * height);
  const dy = new Int16Array(width * height);
  
  // Find gradients by unrolling the Sobel operator loops
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const prevRowOffset = (y - 1) * width;
    const nextRowOffset = (y + 1) * width;

    for (let x = 1; x < width - 1; x++) {
      const currentIdx = rowOffset + x;

      // Get neighborhood pixels
      const p0 = blurred[prevRowOffset + x - 1];
      const p1 = blurred[prevRowOffset + x];
      const p2 = blurred[prevRowOffset + x + 1];
      const p3 = blurred[rowOffset + x - 1];
      const p5 = blurred[rowOffset + x + 1];
      const p6 = blurred[nextRowOffset + x - 1];
      const p7 = blurred[nextRowOffset + x];
      const p8 = blurred[nextRowOffset + x + 1];
      
      // Calculate Sobel gradients
      const gx = (p2 - p0) + 2 * (p5 - p3) + (p8 - p6);
      const gy = (p6 + 2 * p7 + p8) - (p0 + 2 * p1 + p2);
      
      dx[currentIdx] = gx;
      dy[currentIdx] = gy;
    }
  }
  
  return { dx, dy };
}


/**
 * Applies non-maximum suppression to the gradient magnitude
 * @param {Int16Array} dx - Gradient in x-direction
 * @param {Int16Array} dy - Gradient in y-direction
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {boolean} L2gradient - Whether to use L2 norm for magnitude
 * @returns {Float32Array} Suppressed magnitude (using Float32 for precision)
 */
function nonMaximumSuppression(dx, dy, width, height, L2gradient) {
  // Use Float32Array for magnitude to preserve precision before thresholding
  const magnitude = new Float32Array(width * height);
  const suppressed = new Float32Array(width * height);
  
  // Calculate magnitude for all pixels first
  for (let i = 0; i < dx.length; i++) {
    const gx = dx[i];
    const gy = dy[i];
    if (L2gradient) {
      magnitude[i] = Math.sqrt(gx * gx + gy * gy);
    } else {
      magnitude[i] = Math.abs(gx) + Math.abs(gy); // L1 norm
    }
  }
  
  // Perform non-maximum suppression
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx];
      
      // Skip pixels with zero magnitude
      if (mag === 0) {
        suppressed[idx] = 0;
        continue;
      }
      
      const gx = dx[idx];
      const gy = dy[idx];
      
      let neighbor1 = 0, neighbor2 = 0;
      
      // Determine neighbors based on gradient direction
      // Use absolute values to determine dominant direction
      const absGx = Math.abs(gx);
      const absGy = Math.abs(gy);
      
      if (absGy > absGx * 2.4142) { // Vertical edge (angle near 90 or 270)
        neighbor1 = magnitude[idx - width]; // top
        neighbor2 = magnitude[idx + width]; // bottom
      } else if (absGx > absGy * 2.4142) { // Horizontal edge (angle near 0 or 180)
        neighbor1 = magnitude[idx - 1]; // left
        neighbor2 = magnitude[idx + 1]; // right
      } else { // Diagonal edge
        // Determine diagonal direction based on signs of gx and gy
        const s = (gx ^ gy) < 0 ? -1 : 1; // Check if signs are different
        if (gy > 0) { // Gradient points down
          neighbor1 = magnitude[(y - 1) * width + (x - s)]; // top-left/right
          neighbor2 = magnitude[(y + 1) * width + (x + s)]; // bottom-right/left
        } else { // Gradient points up
          neighbor1 = magnitude[(y + 1) * width + (x - s)]; // bottom-left/right
          neighbor2 = magnitude[(y - 1) * width + (x + s)]; // top-right/left
        }
        // Refined diagonal check (approximating OpenCV's logic)
        // Check 45 degrees (top-right / bottom-left)
        if ((gx > 0 && gy > 0) || (gx < 0 && gy < 0)) { // Quadrants 1 & 3
             neighbor1 = magnitude[(y - 1) * width + (x + 1)]; // top-right
             neighbor2 = magnitude[(y + 1) * width + (x - 1)]; // bottom-left
        } else { // Quadrants 2 & 4 (135 degrees)
             neighbor1 = magnitude[(y - 1) * width + (x - 1)]; // top-left
             neighbor2 = magnitude[(y + 1) * width + (x + 1)]; // bottom-right
        }
      }
      
      // If the pixel's magnitude is greater than or equal to its neighbors
      // along the gradient direction, keep it. Otherwise, suppress it.
      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[idx] = mag;
      } else {
        suppressed[idx] = 0;
      }
    }
  }
  return suppressed;
}


/**
 * Applies double thresholding and hysteresis using a stack-based approach.
 * Follows OpenCV's logic more closely.
 * @param {Float32Array} suppressed - Suppressed magnitude (Float32Array)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} lowThreshold - Low threshold value
 * @param {number} highThreshold - High threshold value
 * @returns {Uint8Array} Edge map (0: non-edge, 2: edge pixel)
 */
function hysteresisThresholding(suppressed, width, height, lowThreshold, highThreshold) {
  // Map values: 0 = weak edge (potential), 1 = non-edge, 2 = strong edge
  const edgeMap = new Uint8Array(width * height);
  const stack = [];
  
  // First pass: Identify strong edges and potential weak edges
  for (let y = 1; y < height - 1; y++) { // Iterate excluding borders
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = suppressed[idx];
      
      if (mag >= highThreshold) {
        // Strong edge pixel
        edgeMap[idx] = 2;
        stack.push({ x, y });
      } else if (mag >= lowThreshold) {
        // Weak edge pixel (potential edge)
        edgeMap[idx] = 0; // Mark as potential
      } else {
        // Non-edge pixel
        edgeMap[idx] = 1; // Mark as non-edge
      }
    }
  }
  // Initialize borders as non-edge (value 1)
   for (let x = 0; x < width; x++) {
       edgeMap[x] = 1; // Top row
       edgeMap[(height - 1) * width + x] = 1; // Bottom row
   }
   for (let y = 1; y < height - 1; y++) {
       edgeMap[y * width] = 1; // Left column
       edgeMap[y * width + width - 1] = 1; // Right column
   }


  // Second pass: Hysteresis - connect weak edges to strong edges
  const dxNeighbors = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dyNeighbors = [-1, -1, -1, 0, 0, 1, 1, 1];
  
  while (stack.length > 0) {
    const { x, y } = stack.pop();
    
    // Check all 8 neighbors
    for (let i = 0; i < 8; i++) {
      const nx = x + dxNeighbors[i];
      const ny = y + dyNeighbors[i];
      const nidx = ny * width + nx;
      
      // Check bounds (already handled by border initialization)
      // If neighbor is a weak edge (value 0), promote it to strong (value 2) and add to stack
      if (edgeMap[nidx] === 0) {
        edgeMap[nidx] = 2; // Promote to strong edge
        stack.push({ x: nx, y: ny });
      }
    }
  }
  
  // Note: Pixels that were initially weak (0) but not connected remain 0.
  // Pixels below lowThreshold remain 1. Only pixels marked 2 are considered final edges.
  
  return edgeMap; // Return the map with 0, 1, 2 values
}

/**
 * Applies morphological dilation to binary image using a separable (two-pass) approach.
 * This is much faster than a 2D kernel for square structuring elements.
 * @param {Uint8ClampedArray} edges - Binary edge image (0 or 255)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} kernelSize - Kernel size (default 5 to match jscanify)
 * @returns {Uint8ClampedArray} Dilated edge image
 */
export function dilateEdges(edges, width, height, kernelSize = 5) {
  const halfKernel = Math.floor(kernelSize / 2);
  const temp = new Uint8ClampedArray(width * height);
  const dilated = new Uint8ClampedArray(width * height);

  // Horizontal pass
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      // Find max in horizontal neighborhood
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const nx = x + k;
        if (nx >= 0 && nx < width) {
          const val = edges[rowOffset + nx];
          if (val > maxVal) {
            maxVal = val;
          }
        }
      }
      temp[rowOffset + x] = maxVal;
    }
  }

  // Vertical pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let maxVal = 0;
      // Find max in vertical neighborhood from temp array
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const ny = y + k;
        if (ny >= 0 && ny < height) {
          const val = temp[ny * width + x];
          if (val > maxVal) {
            maxVal = val;
          }
        }
      }
      dilated[y * width + x] = maxVal;
    }
  }
  
  return dilated;
}

/**
 * Full Canny edge detector implementation matching jscanify's approach
 * @param {ImageData} imageData - Original image data
 * @param {Object} options - Configuration options
 * @param {number} [options.lowThreshold=75] - Low threshold for hysteresis (matching jscanify)
 * @param {number} [options.highThreshold=200] - High threshold for hysteresis (matching jscanify)
 * @param {number} [options.sigma=0] - Gaussian blur sigma (0 means auto-calculate from kernel size)
 * @param {number} [options.kernelSize=5] - Gaussian kernel size (matching jscanify)
 * @param {boolean} [options.L2gradient=false] - Use L2 norm for gradient magnitude (like OpenCV default)
 * @param {boolean} [options.applyDilation=true] - Apply dilation after Canny (matching jscanify)
 * @param {number} [options.dilationKernelSize=5] - Dilation kernel size
 * @param {boolean} [options.useWasmBlur=false] - Use WASM for Gaussian blur
 * @param {boolean} [options.useWasmGradients=false] - Use WASM for gradient calculation
 * @param {boolean} [options.useWasmDilation=false] - Use WASM for dilation
 * @param {boolean} [options.useWasmNMS=false] - Use WASM for non-maximum suppression
 * @param {boolean} [options.useWasmHysteresis=false] - Use WASM for hysteresis thresholding
 * @param {boolean} [options.useWasmFullCanny=false] - Use the full WASM Canny implementation
 * @param {object} [options.debug={}] - Object to store intermediate results if provided
 * @param {boolean} [options.skipGrayscale=false] - Skip grayscale conversion (input is already grayscale Uint8ClampedArray)
 * @param {number} [options.width] - Image width (required if skipGrayscale is true)
 * @param {number} [options.height] - Image height (required if skipGrayscale is true)
 * @returns {Promise<Uint8ClampedArray>} Binary edge image (0 or 255)
 */
export async function cannyEdgeDetector(input, options = {}) {
  // Timing table setup
  const timings = [];
  const tStart = performance.now();

  // Handle both ImageData and pre-computed grayscale Uint8ClampedArray
  const skipGrayscale = options.skipGrayscale || false;
  let width, height, grayscale;
  
  if (skipGrayscale) {
    // Input is already grayscale Uint8ClampedArray
    width = options.width;
    height = options.height;
    grayscale = input;
    if (options.debug) options.debug.grayscale = grayscale;
  } else {
    // Input is ImageData - extract dimensions and convert to grayscale
    width = input.width;
    height = input.height;
    
    let t0 = performance.now();
    grayscale = convertToGrayscale(input);
    let t1 = performance.now();
    timings.push({ step: 'Grayscale', ms: (t1 - t0).toFixed(2) });
    if (options.debug) options.debug.grayscale = grayscale;
  }

  let lowThreshold = options.lowThreshold !== undefined ? options.lowThreshold : 75;
  let highThreshold = options.highThreshold !== undefined ? options.highThreshold : 200;
  const kernelSize = options.kernelSize || 5; // Match jscanify's 5x5 kernel
  const sigma = options.sigma || 0; // Let the blur function calculate sigma
  const L2gradient = options.L2gradient === undefined ? false : options.L2gradient;
  const applyDilation = options.applyDilation !== undefined ? options.applyDilation : true;
  const dilationKernelSize = options.dilationKernelSize || 5;
  const useWasmBlur = true;
  const useWasmGradients = false; 
  const useWasmDilation = true;
  const useWasmNMS = true;
  const useWasmHysteresis = options.useWasmHysteresis !== undefined ? options.useWasmHysteresis : false;
  const useWasmFullCanny = false;

  // Ensure high threshold is greater than low threshold
  if (lowThreshold >= highThreshold) {
      console.warn(`Canny Edge Detector: lowThreshold (${lowThreshold}) should be lower than highThreshold (${highThreshold}). Swapping them.`);
      [lowThreshold, highThreshold] = [highThreshold, lowThreshold];
  }

  // Timing variables
  let t0, t1;

  // Step 2: Apply Gaussian blur (JS or WASM)
  let blurred;
  t0 = performance.now();
  if (useWasmBlur) {
    try {
      await wasmReady; // Ensure wasm is initialized
      blurred = wasmBlur(grayscale, width, height, kernelSize, sigma);
    } catch (e) {
      blurred = gaussianBlurGrayscale(grayscale, width, height, kernelSize, sigma);
    }
  } else {
    blurred = gaussianBlurGrayscale(grayscale, width, height, kernelSize, sigma);
  }
  t1 = performance.now();
  timings.push({ step: 'Gaussian Blur', ms: (t1 - t0).toFixed(2) });
  if (options.debug) {
    options.debug.blurred = blurred;
  }

  // Step 3: Compute gradients (dx, dy)
  t0 = performance.now();
  let dx, dy;
  if (useWasmGradients) {
    try {
      await wasmReady; // Ensure wasm is initialized
      const gradientResult = wasmGradients(blurred, width, height);
      dx = new Int16Array(gradientResult.gx);
      dy = new Int16Array(gradientResult.gy);
    } catch (e) {
      const gradients = calculateGradients(blurred, width, height);
      dx = gradients.dx;
      dy = gradients.dy;
    }
  } else {
    const gradients = calculateGradients(blurred, width, height);
    dx = gradients.dx;
    dy = gradients.dy;
  }
  t1 = performance.now();
  timings.push({ step: 'Gradients', ms: (t1 - t0).toFixed(2) });

  // Step 4: Apply non-maximum suppression
  t0 = performance.now();
  let suppressed;
  if (useWasmNMS) {
    try {
      await wasmReady;
      suppressed = await wasmMaximumSuppression(dx, dy, width, height, L2gradient);
    } catch (e) {
      suppressed = nonMaximumSuppression(dx, dy, width, height, L2gradient);
    }
  } else {
    suppressed = nonMaximumSuppression(dx, dy, width, height, L2gradient);
  }
  t1 = performance.now();
  timings.push({ step: 'Non-Max Suppression', ms: (t1 - t0).toFixed(2) });

  // Step 5: Apply double thresholding and hysteresis
  t0 = performance.now();
  const finalLowThreshold = L2gradient ? lowThreshold * lowThreshold : lowThreshold;
  const finalHighThreshold = L2gradient ? highThreshold * highThreshold : highThreshold;
  
  let edgeMap;
  if (useWasmHysteresis) {
    try {
      await wasmReady;
      edgeMap = wasmHysteresis(suppressed, width, height, finalLowThreshold, finalHighThreshold);
    } catch (e) {
      console.warn("WASM hysteresis failed, falling back to JS:", e);
      edgeMap = hysteresisThresholding(suppressed, width, height, finalLowThreshold, finalHighThreshold);
    }
  } else {
    edgeMap = hysteresisThresholding(suppressed, width, height, finalLowThreshold, finalHighThreshold);
  }
  
  t1 = performance.now();
  timings.push({ step: 'Hysteresis', ms: (t1 - t0).toFixed(2) });

  // Step 6: Create binary image (0 or 255)
  t0 = performance.now();
  const cannyEdges = new Uint8ClampedArray(width * height);
  for (let i = 0; i < edgeMap.length; i++) {
    cannyEdges[i] = edgeMap[i] === 2 ? 255 : 0;
  }
  t1 = performance.now();
  timings.push({ step: 'Binary Image', ms: (t1 - t0).toFixed(2) });

  // Step 7: Apply dilation if requested (matching jscanify)
  t0 = performance.now();
  let finalEdges = cannyEdges;
  if (applyDilation) {
    if (useWasmDilation) {
      try {
        await wasmReady; // Ensure wasm is initialized
        finalEdges = wasmDilate(cannyEdges, width, height, dilationKernelSize);
      } catch (e) {
        finalEdges = dilateEdges(cannyEdges, width, height, dilationKernelSize);
      }
    } else {
      finalEdges = dilateEdges(cannyEdges, width, height, dilationKernelSize);
    }
  }
  t1 = performance.now();
  timings.push({ step: 'Dilation', ms: (t1 - t0).toFixed(2) });

  // Store debug info if requested
  if (options.debug) {
    options.debug.dx = dx; // Int16Array
    options.debug.dy = dy; // Int16Array
    // Calculate magnitude separately for debugging if needed
     const magnitude = new Float32Array(width * height);
     for (let i = 0; i < dx.length; i++) {
         const gx = dx[i]; const gy = dy[i];
         magnitude[i] = L2gradient ? Math.sqrt(gx * gx + gy * gy) : Math.abs(gx) + Math.abs(gy);
     }
     options.debug.magnitude = magnitude; // Float32Array (raw magnitude)
    options.debug.suppressed = suppressed; // Float32Array (after NMS)
    options.debug.edgeMap = edgeMap; // Uint8Array (0, 1, 2 values from hysteresis)
    options.debug.cannyEdges = cannyEdges; // Uint8ClampedArray (0 or 255, before dilation)
    options.debug.finalEdges = finalEdges; // Uint8ClampedArray (0 or 255, after dilation if applied)
  }
  
  // Always store timings in debug object (create minimal one if needed)
  if (options.debug) {
    options.debug.timings = timings;
  } else if (!options.debug) {
    // Create a minimal debug object just for timings if none provided
    options.debug = { timings: timings };
  }

  const tEnd = performance.now();
  timings.unshift({ step: 'Edge Detection Total', ms: (tEnd - tStart).toFixed(2) });
  // Timings available via options.debug.timings

  return finalEdges; // Return the final binary edge image
}

/**
 * Full Canny edge detector implementation using WASM, for comparison or direct use
 * This function is intended to match the performance and output of the JS cannyEdgeDetector,
 * but runs entirely in WASM for potentially faster execution.
 * @param {ImageData} imageData - Original image data
 * @param {Object} options - Configuration options (same as cannyEdgeDetector)
 * @returns {Promise<Uint8ClampedArray>} Binary edge image (0 or 255)
 */
export async function cannyEdgeDetectorWasm(imageData, options = {}) {
  // Directly call the WASM canny_edge_detector_full function
  let result;
  try {
    await wasmReady; // Ensure wasm is initialized
    console.log('Using WASM Full Canny');
    result = wasmFullCanny(imageData.data, imageData.width, imageData.height, options.lowThreshold, options.highThreshold, options.sigma, options.kernelSize, options.L2gradient, options.applyDilation, options.dilationKernelSize);
  } catch (e) {
    console.error("WASM full Canny failed:", e);
    throw e; // Rethrow to let the caller handle the error
  }
  
  // Convert result to Uint8ClampedArray (if not already)
  const edges = new Uint8ClampedArray(result);
  
  return edges;
}