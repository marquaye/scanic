/**
 * Pure JavaScript implementation of contour detection algorithms
 * Based on Suzuki, S. and Abe, K. (1985). Topological structural analysis of digitized binary images by border following.
 * Replaces the previous flood-fill based connected components analysis.
 */

import { DEFAULTS } from './constants.js';

// Constants for different retrieval modes (subset of OpenCV)
const RETR_EXTERNAL = 0;
const RETR_LIST = 1;
// Constants for different approximation methods (subset of OpenCV)
const CHAIN_APPROX_NONE = 1;
const CHAIN_APPROX_SIMPLE = 2;

// Deltas for 8-connectivity neighborhood checks (0-7 clockwise from top)
// Corresponds to OpenCV's chain code directions
const deltas = [
  { dx:  0, dy: -1 }, // 0: Top
  { dx:  1, dy: -1 }, // 1: Top-right
  { dx:  1, dy:  0 }, // 2: Right
  { dx:  1, dy:  1 }, // 3: Bottom-right
  { dx:  0, dy:  1 }, // 4: Bottom
  { dx: -1, dy:  1 }, // 5: Bottom-left
  { dx: -1, dy:  0 }, // 6: Left
  { dx: -1, dy: -1 }  // 7: Top-left
];

/**
 * Detects contours in a binary edge image using Suzuki's border following algorithm.
 * @param {Uint8ClampedArray} edges - Binary edge image (pixels > 0 are foreground)
 * @param {Object} options - Configuration options
 * @param {number} [options.width] - Image width (required if not square)
 * @param {number} [options.height] - Image height (required if not square)
 * @param {number} [options.mode=RETR_LIST] - Contour retrieval mode (RETR_EXTERNAL or RETR_LIST)
 * @param {number} [options.method=CHAIN_APPROX_SIMPLE] - Contour approximation method (CHAIN_APPROX_NONE or CHAIN_APPROX_SIMPLE)
 * @param {number} [options.minArea=DEFAULTS.MIN_CONTOUR_AREA] - Minimum contour area filter (applied after detection)
 * @param {Object} [options.debug] - Optional debug object to store intermediate results
 * @returns {Array} Array of contours, each contour is an array of points {x, y}. Sorted by area (largest first).
 */
export function detectDocumentContour(edges, options = {}) {
  const width = options.width || Math.sqrt(edges.length);
  const height = options.height || edges.length / width;
  const mode = options.mode !== undefined ? options.mode : RETR_LIST;
  const method = options.method !== undefined ? options.method : CHAIN_APPROX_SIMPLE;
  const minArea = options.minArea || DEFAULTS.MIN_CONTOUR_AREA;

  // Create a padded label map to simplify boundary checks.
  // 0: background
  // 1: foreground (unlabeled)
  // >= 2: contour ID (2, 3, ...)
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const labels = new Int32Array(paddedWidth * paddedHeight); // Initialized to 0

  // Copy edges data to the label map, mapping foreground pixels to 1
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > 0) {
        labels[(y + 1) * paddedWidth + (x + 1)] = 1;
      }
    }
  }

  const contours = [];
  let nextContourId = 2; // Start labeling contours from 2

  // Raster scan
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const currentPixelLabel = labels[y * paddedWidth + x];
      const leftPixelLabel = labels[y * paddedWidth + (x - 1)];

      let startPoint = null;
      let isOuter = false;
      let initialDirection = -1;

      if (currentPixelLabel === 1 && leftPixelLabel === 0) {
        // Found the start of an outer contour boundary (NBD = 1 in Suzuki's terms)
        isOuter = true;
        startPoint = { x: x, y: y };
        initialDirection = 2; // Start searching right
        // if (options.debug) console.log(`Outer contour start at (${x-1}, ${y-1})`);
      } else if (currentPixelLabel === 0 && leftPixelLabel >= 1 && leftPixelLabel !== -1) {
         // Found the start of a hole contour boundary (NBD >= 2 in Suzuki's terms)
         // Check if the left pixel is already part of a traced contour border
         // If leftPixelLabel is > 1, it might be already traced. If it's 1, it's an unlabeled foreground pixel.
         // We only start tracing if the left pixel is unlabeled foreground (1).
         if (leftPixelLabel === 1) {
             isOuter = false;
             startPoint = { x: x - 1, y: y };
             initialDirection = 6; // Start searching left
            //  if (options.debug) console.log(`Hole contour start at (${x-1-1}, ${y-1})`);
         }
      }


      if (startPoint) {
        // If mode is RETR_EXTERNAL, only process outer contours
        if (mode === RETR_EXTERNAL && !isOuter) {
          // Mark the starting pixel of the hole so we don't process it again
          // Use a special marker (-1) to distinguish from contour IDs
           labels[startPoint.y * paddedWidth + startPoint.x] = -1;
           continue;
        }

        const contourId = nextContourId++;
        const points = traceContour(labels, paddedWidth, paddedHeight, startPoint, initialDirection, contourId);

        if (points && points.length > 0) {
            let finalPoints = points;
            if (method === CHAIN_APPROX_SIMPLE) {
                finalPoints = simplifyChainApproxSimple(points);
            }

            // Adjust points to original image coordinates (remove padding offset)
            const adjustedPoints = finalPoints.map(p => ({ x: p.x - 1, y: p.y - 1 }));

            if (adjustedPoints.length >= (method === CHAIN_APPROX_SIMPLE ? 4 : DEFAULTS.MIN_CONTOUR_POINTS)) { // Need at least 4 points for a simple polygon approx
                const contour = {
                    id: contourId,
                    points: adjustedPoints,
                    isOuter: isOuter,
                    // Calculate area and bounding box later if needed for filtering/sorting
                };
                contours.push(contour);
            }
        } else {
             // Handle single point contours or errors if necessary
             // Mark the start point if trace failed or resulted in no points
             if (labels[startPoint.y * paddedWidth + startPoint.x] === 1) {
                 labels[startPoint.y * paddedWidth + startPoint.x] = contourId; // Mark as visited
             }
        }
      } else if (currentPixelLabel >= 1 && leftPixelLabel >= 1 && currentPixelLabel !== leftPixelLabel) {
          // Handle merging contours or complex topology if needed (not implemented for RETR_LIST/EXTERNAL)
      }
    }
  }

  // Calculate area and bounding box for filtering and sorting
  contours.forEach(contour => {
    contour.area = calculateContourArea(contour.points);
    contour.boundingBox = calculateBoundingBox(contour.points);
  });

  // Filter by minimum area
  const filteredContours = contours.filter(contour => contour.area >= minArea);

  // Sort contours by area (largest first)
  filteredContours.sort((a, b) => b.area - a.area);

  // console.log(`Found ${contours.length} contours before filtering, ${filteredContours.length} after filtering.`);

  // Store debug info if requested
  if (options.debug) {
    options.debug.labels = labels; // Store the final label map
    options.debug.rawContours = contours; // Store contours before filtering/sorting
    options.debug.finalContours = filteredContours;
    // console.log('Contour detection debug info stored');
  }
  return filteredContours // Return only the points array per contour
}

/**
 * Traces a contour boundary using border following.
 * Optimized to minimize object allocations.
 * @param {Int32Array} labels - The label map (modified during tracing)
 * @param {number} width - Padded width of the label map
 * @param {number} height - Padded height of the label map
 * @param {Object} startPoint - Starting point {x, y} in padded coordinates
 * @param {number} initialDirection - Initial search direction (0-7)
 * @param {number} contourId - The ID to label this contour with
 * @returns {Array} Array of points {x, y} in padded coordinates, or null if error
 */
function traceContour(labels, width, height, startPoint, initialDirection, contourId) {
    const points = [];
    // Use Set with numeric keys (y * width + x) - much faster than string keys
    const visited = new Set();
    
    // Avoid object creation in hot loop - use primitive coordinates
    let currentX = startPoint.x;
    let currentY = startPoint.y;
    const startX = currentX;
    const startY = currentY;
    
    let prevDirection = -1; // Store the direction from which we arrived at currentPoint

    // Mark the starting pixel with the contour ID
    labels[startY * width + startX] = contourId;

    let count = 0; // Safety break
    const maxSteps = width * height; // Max possible steps
    
    // Pre-extract delta values for faster access in hot loop
    const dx = [0, 1, 1, 1, 0, -1, -1, -1];
    const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

    while (count++ < maxSteps) {
        // Determine the direction to start searching from (relative to the direction we came from)
        // In Suzuki's paper, this is based on the chain code of the previous step.
        // Simplified: Start searching from the direction after the one that led us here.
        // If we arrived from direction `d`, the next pixel must be in `(d+1)%8` to `(d+7)%8`.
        // Let's adapt OpenCV's logic: search starts from (prevDirection + 2) % 8 clockwise.
        // If it's the first step, prevDirection is unknown, use initialDirection logic.

        let searchDirection;
        if (prevDirection === -1) {
            // First step: Use initialDirection logic (e.g., start right for outer, left for inner)
            // The initial search should find the *first* pixel of the contour boundary clockwise.
            // Let's refine the initial search based on OpenCV's approach:
            // Find the first non-zero pixel starting from `initialDirection` clockwise.
            let found = false;
            for (let i = 0; i < 8; i++) {
                searchDirection = (initialDirection + i) & 7; // Faster than % 8
                const nextX = currentX + dx[searchDirection];
                const nextY = currentY + dy[searchDirection];
                if (nextX >= 0 && nextX < width && nextY >= 0 && nextY < height && labels[nextY * width + nextX] > 0) {
                    found = true;
                    break;
                }
            }
            if (!found) return null; // Should not happen if startPoint is valid

        } else {
            // Subsequent steps: Start search from (prevDirection + 2) % 8 clockwise
             searchDirection = (prevDirection + 2) & 7;
        }


        let nextX = -1;
        let nextY = -1;
        let nextDirection = -1;

        // Search clockwise for the next boundary pixel
        for (let i = 0; i < 8; i++) {
            const checkDirection = (searchDirection + i) & 7;
            const checkX = currentX + dx[checkDirection];
            const checkY = currentY + dy[checkDirection];

            // Check bounds (should be within padded area)
            if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
                if (labels[checkY * width + checkX] > 0) { // Found a foreground pixel (labeled or unlabeled)
                    nextX = checkX;
                    nextY = checkY;
                    // The direction *from* currentPoint *to* nextPoint is checkDirection
                    nextDirection = checkDirection;
                    // The direction *from* which we will arrive *at* nextPoint is (checkDirection + 4) % 8
                    prevDirection = (checkDirection + 4) & 7;
                    break;
                }
            }
        }

        if (nextX === -1) {
            // Should not happen in a well-formed contour, maybe isolated pixel?
             if (points.length === 0) { // If it's just the start point
                 points.push({ x: currentX, y: currentY }); // Add the single point
             }
            console.warn(`Contour tracing stopped unexpectedly at (${currentX-1}, ${currentY-1}) for contour ${contourId}`);
            break;
        }

        // Add the *current* point to the list before moving
        // Use numeric key for Set (much faster than string concatenation)
        const visitedKey = currentY * width + currentX;
        if (visited.has(visitedKey)) {
            // Duplicate point detected - return to avoid infinite loops
            return points;
        }
        points.push({ x: currentX, y: currentY });
        visited.add(visitedKey);

        // Mark the next pixel if it's unlabeled
        const nextIdx = nextY * width + nextX;
        if (labels[nextIdx] === 1) {
            labels[nextIdx] = contourId;
        }

        // Move to the next point
        currentX = nextX;
        currentY = nextY;

        // Check if we returned to the start point
        if (currentX === startX && currentY === startY) {
            // Check if we came from the same direction as the initial step search ended.
            // This is complex, let's use a simpler check: if we are back at start, we are done.
            // OpenCV has more sophisticated checks involving i4 == i0 && i3 == i1.
            break;
        }
    }

     if (count >= maxSteps) {
        console.warn(`Contour tracing exceeded max steps for contour ${contourId}`);
        return null; // Indicate potential error
    }

    return points;
}

/**
 * Simplifies a contour polygon using CHAIN_APPROX_SIMPLE.
 * Removes intermediate points that lie on the straight line segment between their neighbors.
 * Optimized to avoid modulo operations in hot loop.
 * @param {Array} points - Array of contour points {x, y}
 * @returns {Array} Simplified array of points
 */
function simplifyChainApproxSimple(points) {
    const n = points.length;
    if (n <= 2) {
        return points;
    }

    const simplifiedPoints = [];
    
    // Cache first and last points for wrap-around
    const lastPoint = points[n - 1];
    const firstPoint = points[0];
    
    // Check first point (prev = last, next = second)
    let prevPoint = lastPoint;
    let currentPoint = firstPoint;
    let nextPoint = points[1];
    
    let dx1 = currentPoint.x - prevPoint.x;
    let dy1 = currentPoint.y - prevPoint.y;
    let dx2 = nextPoint.x - currentPoint.x;
    let dy2 = nextPoint.y - currentPoint.y;
    
    if (dx1 * dy2 !== dy1 * dx2) {
        simplifiedPoints.push(currentPoint);
    }
    
    // Middle points (no wrap-around needed)
    for (let i = 1; i < n - 1; i++) {
        prevPoint = points[i - 1];
        currentPoint = points[i];
        nextPoint = points[i + 1];

        dx1 = currentPoint.x - prevPoint.x;
        dy1 = currentPoint.y - prevPoint.y;
        dx2 = nextPoint.x - currentPoint.x;
        dy2 = nextPoint.y - currentPoint.y;

        if (dx1 * dy2 !== dy1 * dx2) {
            simplifiedPoints.push(currentPoint);
        }
    }
    
    // Check last point (prev = second-to-last, next = first)
    prevPoint = points[n - 2];
    currentPoint = lastPoint;
    nextPoint = firstPoint;
    
    dx1 = currentPoint.x - prevPoint.x;
    dy1 = currentPoint.y - prevPoint.y;
    dx2 = nextPoint.x - currentPoint.x;
    dy2 = nextPoint.y - currentPoint.y;
    
    if (dx1 * dy2 !== dy1 * dx2) {
        simplifiedPoints.push(currentPoint);
    }

    // Handle cases where all points are collinear (e.g., straight line)
    if (simplifiedPoints.length === 0) {
         if (n === 1) return [points[0]];
         if (n === 2) return points;

         // Find the point most distant from the first point
         let maxDistSq = 0;
         let farthestIdx = 1;
         const p0x = firstPoint.x;
         const p0y = firstPoint.y;
         for (let i = 1; i < n; i++) {
             const pi = points[i];
             const dx = pi.x - p0x;
             const dy = pi.y - p0y;
             const distSq = dx * dx + dy * dy;
             if (distSq > maxDistSq) {
                 maxDistSq = distSq;
                 farthestIdx = i;
             }
         }
         return [firstPoint, points[farthestIdx]];
    }

    return simplifiedPoints;
}


// --- Helper functions (keep or adapt from original) ---

/**
 * Calculates the area of a contour using the shoelace formula
 * @param {Array} points - Array of point coordinates {x, y}
 * @returns {number} Contour area
 */
function calculateContourArea(points) {
  let area = 0;
  const n = points.length;

  if (n < 3) return 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area) / 2;
}

/**
 * Calculates the bounding box of a contour
 * @param {Array} points - Array of point coordinates
 * @returns {Object} Bounding box with minX, minY, maxX, maxY properties
 */
function calculateBoundingBox(points) {
  if (points.length === 0) {
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
      const point = points[i];
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}


// --- Functions below are no longer directly used by detectDocumentContour ---
// --- but might be useful elsewhere or can be removed ---

/**
 * Simplifies a contour using the Ramer-Douglas-Peucker algorithm
 * (No longer used by default contour detection, kept for potential external use)
 * @param {Array} points - Array of point coordinates
 * @param {number} epsilon - Epsilon value for simplification
 * @returns {Array} Simplified contour points
 */
export function simplifyContour(points, epsilon = 1.0) {
  // ... (keep existing implementation if needed elsewhere) ...
   if (points.length <= 2) {
    return points;
  }

  // Find point with the maximum distance
  let maxDistance = 0;
  let index = 0;

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);

    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    // Recursive simplification
    const firstSegment = simplifyContour(points.slice(0, index + 1), epsilon);
    const secondSegment = simplifyContour(points.slice(index), epsilon);

    // Concatenate the two segments
    return firstSegment.slice(0, -1).concat(secondSegment);
  } else {
    // Return just the endpoints
    return [firstPoint, lastPoint];
  }
}

/**
 * Calculates the perpendicular distance from a point to a line
 * (Helper for RDP simplifyContour, keep if that function is kept)
 * @param {Object} point - Point to measure from
 * @param {Object} lineStart - Start point of the line
 * @param {Object} lineEnd - End point of the line
 * @returns {number} Perpendicular distance
 */
function perpendicularDistance(point, lineStart, lineEnd) {
 // ... (keep existing implementation if needed elsewhere) ...
   const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // Line length squared
  const lineLengthSq = dx * dx + dy * dy;

  if (lineLengthSq === 0) {
    // Point to point distance if the line has zero length
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) +
      Math.pow(point.y - lineStart.y, 2)
    );
  }

   // Calculate the projection parameter t
  const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq;

  let closestPointX, closestPointY;

  if (t < 0) {
    closestPointX = lineStart.x;
    closestPointY = lineStart.y;
  } else if (t > 1) {
    closestPointX = lineEnd.x;
    closestPointY = lineEnd.y;
  } else {
    closestPointX = lineStart.x + t * dx;
    closestPointY = lineStart.y + t * dy;
  }

  // Calculate the distance from the point to the closest point on the line segment
  const distDx = point.x - closestPointX;
  const distDy = point.y - closestPointY;
  return Math.sqrt(distDx * distDx + distDy * distDy);

  /* // Original implementation using area formula (distance to infinite line)
  const lineLength = Math.sqrt(lineLengthSq);
  const area = Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
  return area / lineLength;
  */
}

/**
 * Creates a polygon approximation of a contour using RDP.
 * (No longer used by default contour detection, kept for potential external use)
 * @param {Array} contourPoints - Array of points {x, y}
 * @param {number} epsilon - Epsilon for polygon approximation (relative to perimeter)
 * @returns {Array} Array of polygon points
 */
export function approximatePolygon(contourPoints, epsilon = 0.02) {
  // Calculate contour perimeter
  const perimeter = calculateContourPerimeter(contourPoints);

  // Calculate epsilon based on perimeter
  const actualEpsilon = epsilon * perimeter;

  // Simplify the contour using RDP
  const simplifiedPoints = simplifyContour(contourPoints, actualEpsilon);

  return simplifiedPoints;
}

/**
 * Calculates the perimeter of a contour
 * (Helper for RDP approximatePolygon, keep if that function is kept)
 * @param {Array} points - Array of point coordinates
 * @returns {number} Contour perimeter
 */
function calculateContourPerimeter(points) {
 // ... (keep existing implementation if needed elsewhere) ...
   let perimeter = 0;
  const n = points.length;

  if (n < 2) return 0;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; // Wrap around for the last segment
    const dx = points[i].x - points[j].x;
    const dy = points[i].y - points[j].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }

  return perimeter;
}

// Flood fill is no longer used for contour detection
/*
function floodFill(edges, labels, width, height, startX, startY, label) {
  // ... (original floodFill implementation removed) ...
}
*/