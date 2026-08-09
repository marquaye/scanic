/**
 * Pure JavaScript implementation of contour detection algorithms
 * Based on Suzuki, S. and Abe, K. (1985). Topological structural analysis of digitized binary images by border following.
 * Replaces the previous flood-fill based connected components analysis.
 */

import { DEFAULTS } from './constants.js';
import { findContoursWasm } from './edgeDetection.js';

// Constants for different retrieval modes (subset of OpenCV)
const RETR_EXTERNAL = 0;
const RETR_LIST = 1;
// Constants for different approximation methods (subset of OpenCV)
const CHAIN_APPROX_SIMPLE = 2;

// Deltas for 8-connectivity neighborhood checks (0-7 clockwise from top),
// used as parallel dx/dy arrays inside detectDocumentContour below.

/**
 * Detects contours in a binary edge image using Suzuki's border following algorithm.
 * @param {Uint8ClampedArray} edges - Binary edge image (pixels > 0 are foreground)
 * @param {Object} options - Configuration options
 * @param {number} [options.width] - Image width (required if not square)
 * @param {number} [options.height] - Image height (required if not square)
 * @param {number} [options.mode=RETR_LIST] - Contour retrieval mode (RETR_EXTERNAL or RETR_LIST)
 * @param {number} [options.method=CHAIN_APPROX_SIMPLE] - Contour approximation method (1=none, or CHAIN_APPROX_SIMPLE)
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

  // WASM traces the borders and hands back only the simplified polygons, which
  // keeps the edge map from being walked in JS at all. Area, bounding box,
  // filtering and sorting stay here either way, so the numbers are identical.
  const minPoints = method === CHAIN_APPROX_SIMPLE ? 4 : DEFAULTS.MIN_CONTOUR_POINTS;
  if (mode === RETR_LIST && method === CHAIN_APPROX_SIMPLE) {
    const encoded = findContoursWasm(edges, width, height, minPoints);
    if (encoded) {
      return finishContours(decodeWasmContours(encoded), minArea, options, null, true);
    }
  }

  // Allocated once per image and reused by every trace.
  const visitStamp = new Int32Array(paddedWidth * paddedHeight);
  const tracedPoints = createPointBuffer();
  const keptIndices = [];

  // Raster scan
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const currentPixelLabel = labels[y * paddedWidth + x];
      const leftPixelLabel = labels[y * paddedWidth + (x - 1)];

      let hasStart = false;
      let startX = 0;
      let startY = 0;
      let isOuter = false;
      let initialDirection = -1;

      if (currentPixelLabel === 1 && leftPixelLabel === 0) {
        // Found the start of an outer contour boundary (NBD = 1 in Suzuki's terms)
        isOuter = true;
        hasStart = true;
        startX = x;
        startY = y;
        initialDirection = 2; // Start searching right
        // if (options.debug) console.log(`Outer contour start at (${x-1}, ${y-1})`);
      } else if (currentPixelLabel === 0 && leftPixelLabel >= 1 && leftPixelLabel !== -1) {
         // Found the start of a hole contour boundary (NBD >= 2 in Suzuki's terms)
         // Check if the left pixel is already part of a traced contour border
         // If leftPixelLabel is > 1, it might be already traced. If it's 1, it's an unlabeled foreground pixel.
         // We only start tracing if the left pixel is unlabeled foreground (1).
         if (leftPixelLabel === 1) {
             isOuter = false;
             hasStart = true;
             startX = x - 1;
             startY = y;
             initialDirection = 6; // Start searching left
            //  if (options.debug) console.log(`Hole contour start at (${x-1-1}, ${y-1})`);
         }
      }


      if (hasStart) {
        // If mode is RETR_EXTERNAL, only process outer contours
        if (mode === RETR_EXTERNAL && !isOuter) {
          // Mark the starting pixel of the hole so we don't process it again
          // Use a special marker (-1) to distinguish from contour IDs
           labels[startY * paddedWidth + startX] = -1;
           continue;
        }

        const contourId = nextContourId++;
        const traced = traceContour(
          labels, visitStamp, paddedWidth, paddedHeight,
          startX, startY, initialDirection, contourId, tracedPoints
        );

        if (traced && tracedPoints.count > 0) {
            if (method === CHAIN_APPROX_SIMPLE) {
                simplifyChainApproxSimple(tracedPoints, keptIndices);
            } else {
                keptIndices.length = 0;
                for (let i = 0; i < tracedPoints.count; i++) keptIndices.push(i);
            }

            if (keptIndices.length >= (method === CHAIN_APPROX_SIMPLE ? 4 : DEFAULTS.MIN_CONTOUR_POINTS)) { // Need at least 4 points for a simple polygon approx
                // Materialize once, dropping the padding offset in the same pass.
                const data = tracedPoints.data;
                const adjustedPoints = new Array(keptIndices.length);
                for (let i = 0; i < keptIndices.length; i++) {
                    const offset = keptIndices[i] * 2;
                    adjustedPoints[i] = { x: data[offset] - 1, y: data[offset + 1] - 1 };
                }

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
             if (labels[startY * paddedWidth + startX] === 1) {
                 labels[startY * paddedWidth + startX] = contourId; // Mark as visited
             }
        }
      } else if (currentPixelLabel >= 1 && leftPixelLabel >= 1 && currentPixelLabel !== leftPixelLabel) {
          // Handle merging contours or complex topology if needed (not implemented for RETR_LIST/EXTERNAL)
      }
    }
  }

  return finishContours(contours, minArea, options, labels);
}

/**
 * Decodes the flat contour encoding produced by the WASM tracer.
 * Layout: [count, (id, isOuter, pointCount, x0, y0, ...) * count]
 *
 * Area and the bounding box are accumulated straight off the Int32Array, and
 * `points` is a lazy getter. A busy edge map yields ~1000 contours and >100k
 * points, but only the handful that survive the area sort are ever inspected,
 * so materializing {x, y} objects for all of them was pure waste.
 */
function decodeWasmContours(encoded) {
  const contours = [];
  const count = encoded[0];
  let offset = 1;

  for (let c = 0; c < count; c++) {
    const id = encoded[offset];
    const isOuter = encoded[offset + 1] === 1;
    const pointCount = encoded[offset + 2];
    const start = offset + 3;
    offset = start + pointCount * 2;

    // Same shoelace accumulation order as calculateContourArea. The
    // coordinates are integers, so every intermediate is exact in f64 and the
    // two tracers cannot disagree.
    let area = 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pointCount; i++) {
      const xi = encoded[start + i * 2];
      const yi = encoded[start + i * 2 + 1];
      const j = i + 1 === pointCount ? 0 : i + 1;
      area += xi * encoded[start + j * 2 + 1];
      area -= encoded[start + j * 2] * yi;
      if (xi < minX) minX = xi;
      if (xi > maxX) maxX = xi;
      if (yi < minY) minY = yi;
      if (yi > maxY) maxY = yi;
    }

    contours.push({
      id,
      isOuter,
      area: pointCount < 3 ? 0 : Math.abs(area) / 2,
      boundingBox: pointCount === 0
        ? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
        : { minX, minY, maxX, maxY },
      get points() {
        const materialized = new Array(pointCount);
        for (let i = 0; i < pointCount; i++) {
          materialized[i] = { x: encoded[start + i * 2], y: encoded[start + i * 2 + 1] };
        }
        // Replace the getter so repeated reads cost nothing.
        Object.defineProperty(this, 'points', { value: materialized, writable: true, configurable: true });
        return materialized;
      }
    });
  }

  return contours;
}

/**
 * Area, bounding box, min-area filter and area sort. Shared by both tracers so
 * the two paths cannot drift numerically.
 */
function finishContours(contours, minArea, options, labels, alreadyMeasured = false) {
  // Calculate area and bounding box for filtering and sorting
  if (!alreadyMeasured) {
    contours.forEach(contour => {
      contour.area = calculateContourArea(contour.points);
      contour.boundingBox = calculateBoundingBox(contour.points);
    });
  }

  // Filter by minimum area
  const filteredContours = contours.filter(contour => contour.area >= minArea);

  // Sort contours by area (largest first)
  filteredContours.sort((a, b) => b.area - a.area);

  // Store debug info if requested
  if (options.debug) {
    options.debug.labels = labels; // null when the WASM tracer ran
    options.debug.rawContours = contours; // Store contours before filtering/sorting
    options.debug.finalContours = filteredContours;
  }
  return filteredContours // Return only the points array per contour
}

/**
 * Growable flat point buffer: [x0, y0, x1, y1, ...] in padded coordinates.
 * Tracing a border touches one entry per boundary pixel, so this is the hottest
 * allocation in the whole pipeline. Keeping the coordinates in an Int32Array and
 * materializing {x, y} objects only for the simplified output avoids allocating
 * a short-lived object per traced pixel.
 */
function createPointBuffer(initialPairs = 1024) {
  return { data: new Int32Array(initialPairs * 2), count: 0 };
}

function pushPoint(buffer, x, y) {
  const offset = buffer.count * 2;
  if (offset + 2 > buffer.data.length) {
    const grown = new Int32Array(buffer.data.length * 2);
    grown.set(buffer.data);
    buffer.data = grown;
  }
  buffer.data[offset] = x;
  buffer.data[offset + 1] = y;
  buffer.count++;
}

/**
 * Traces a contour boundary using border following.
 * Optimized to minimize object allocations.
 * @param {Int32Array} labels - The label map (modified during tracing)
 * @param {Int32Array} visitStamp - Per-pixel "last contour that visited me" marks
 * @param {number} width - Padded width of the label map
 * @param {number} height - Padded height of the label map
 * @param {number} startX - Starting x in padded coordinates
 * @param {number} startY - Starting y in padded coordinates
 * @param {number} initialDirection - Initial search direction (0-7)
 * @param {number} contourId - The ID to label this contour with
 * @param {Object} points - Reusable point buffer, filled with padded coordinates
 * @returns {boolean} False when tracing failed (caller treats it as "no contour")
 */
function traceContour(labels, visitStamp, width, height, startX, startY, initialDirection, contourId, points) {
    points.count = 0;

    // Avoid object creation in hot loop - use primitive coordinates
    let currentX = startX;
    let currentY = startY;
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
            if (!found) return false; // Should not happen if startPoint is valid

        } else {
            // Subsequent steps: Start search from (prevDirection + 2) % 8 clockwise
             searchDirection = (prevDirection + 2) & 7;
        }


        let nextX = -1;
        let nextY = -1;

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
                    // The direction *from* which we will arrive *at* nextPoint is (checkDirection + 4) % 8
                    prevDirection = (checkDirection + 4) & 7;
                    break;
                }
            }
        }

        if (nextX === -1) {
            // Should not happen in a well-formed contour, maybe isolated pixel?
             if (points.count === 0) { // If it's just the start point
                 pushPoint(points, currentX, currentY); // Add the single point
             }
            console.warn(`Contour tracing stopped unexpectedly at (${currentX-1}, ${currentY-1}) for contour ${contourId}`);
            break;
        }

        // Add the *current* point to the list before moving. contourId is unique
        // per contour, so stamping it doubles as "visited by THIS trace" without
        // having to clear the array between contours.
        const visitedIdx = currentY * width + currentX;
        if (visitStamp[visitedIdx] === contourId) {
            // Duplicate point detected - return to avoid infinite loops
            return true;
        }
        pushPoint(points, currentX, currentY);
        visitStamp[visitedIdx] = contourId;

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
        return false; // Indicate potential error
    }

    return true;
}

/**
 * Simplifies a contour polygon using CHAIN_APPROX_SIMPLE.
 * Removes intermediate points that lie on the straight line segment between their neighbors.
 * Works on indices into the flat point buffer so nothing is allocated per point;
 * the caller materializes only the surviving points.
 * @param {Object} points - Flat point buffer from traceContour
 * @param {number[]} kept - Output array of surviving point indices (cleared first)
 */
function simplifyChainApproxSimple(points, kept) {
    kept.length = 0;
    const n = points.count;
    const data = points.data;

    if (n <= 2) {
        for (let i = 0; i < n; i++) kept.push(i);
        return;
    }

    // Corner turns are kept, collinear runs dropped. Indices wrap around, so the
    // first and last points compare against each other.
    for (let i = 0; i < n; i++) {
        const prev = (i === 0 ? n - 1 : i - 1) * 2;
        const curr = i * 2;
        const next = (i === n - 1 ? 0 : i + 1) * 2;

        const dx1 = data[curr] - data[prev];
        const dy1 = data[curr + 1] - data[prev + 1];
        const dx2 = data[next] - data[curr];
        const dy2 = data[next + 1] - data[curr + 1];

        if (dx1 * dy2 !== dy1 * dx2) {
            kept.push(i);
        }
    }

    // Handle cases where all points are collinear (e.g., straight line)
    if (kept.length === 0) {
        // Find the point most distant from the first point
        let maxDistSq = 0;
        let farthestIdx = 1;
        const p0x = data[0];
        const p0y = data[1];
        for (let i = 1; i < n; i++) {
            const dx = data[i * 2] - p0x;
            const dy = data[i * 2 + 1] - p0y;
            const distSq = dx * dx + dy * dy;
            if (distSq > maxDistSq) {
                maxDistSq = distSq;
                farthestIdx = i;
            }
        }
        kept.push(0, farthestIdx);
    }
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


// --- Ramer-Douglas-Peucker polygon approximation ---
// Not used by the border-following pass above; it runs afterwards, on the
// traced contours, from cornerDetection.js and the candidate scoring in index.js.

/**
 * Simplifies a contour using the Ramer-Douglas-Peucker algorithm
 * @param {Array} points - Array of point coordinates
 * @param {number} epsilon - Epsilon value for simplification
 * @returns {Array} Simplified contour points
 */
export function simplifyContour(points, epsilon = 1.0) {
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
 * Helper for the RDP simplifyContour above.
 * @param {Object} point - Point to measure from
 * @param {Object} lineStart - Start point of the line
 * @param {Object} lineEnd - End point of the line
 * @returns {number} Perpendicular distance
 */
function perpendicularDistance(point, lineStart, lineEnd) {
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
}

/**
 * Creates a polygon approximation of a contour using RDP.
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
 * Helper for the RDP approximatePolygon above.
 * @param {Array} points - Array of point coordinates
 * @returns {number} Contour perimeter
 */
function calculateContourPerimeter(points) {
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
