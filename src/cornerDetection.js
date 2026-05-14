/**
 * Pure JavaScript implementation for detecting corners of a document
 * Replaces OpenCV's corner detection and point finding logic
 */

import { approximatePolygon } from './contourDetection.js';

/**
 * Calculate distance between two points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} Distance between points
 */
export function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Find the center point of a contour
 * @param {Array} points - Array of contour points
 * @returns {Object} Center point {x, y}
 */
function findCenter(points) {
  let sumX = 0;
  let sumY = 0;
  
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  
  return {
    x: sumX / points.length,
    y: sumY / points.length
  };
}

/**
 * Find the four corners of a document contour
 * @param {Object} contour - Contour object with points property
 * @param {Object} options - Configuration options
 * @returns {Object} Object with topLeft, topRight, bottomRight, bottomLeft corners
 */
export function findCornerPoints(contour, options = {}) {
  if (!contour || !contour.points || contour.points.length < 4) {
    console.warn('Contour does not have enough points for corner detection');
    return null;
  }
  
  // Try to find a quadrilateral approximation of the contour.
  // We sweep a few larger epsilons to stabilize hard/noisy contours.
  const epsilon = options.epsilon || 0.02;
  const approximation = findBestQuadrilateralApproximation(contour.points, epsilon);
  
  let corners;
  
  // If we get exactly 4 points, we can use them as corners
  if (approximation && approximation.length === 4) {
    // console.log('Found 4-point approximation, using as corners');
    corners = orderCornerPoints(approximation);
  } else {
    // Fallback 1: legacy-style farthest corner per quadrant, more robust against
    // single-point outliers than pure coordinate-extremes.
    corners = findCornersByQuadrants(contour.points);
    if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
      // Fallback 2: coordinate-extremes heuristic.
      corners = findCornersByCoordinateExtremes(contour.points);
    }
  }
  
  // Ensure all corners were found
  if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
      console.warn('Failed to find all four corners.', corners);
      // Return null or partial corners? Returning null might be safer downstream.
      return null; 
  }

  return corners;
}

/**
 * Try multiple approximation tolerances and return the first quadrilateral.
 * @param {Array} points - Array of contour points
 * @param {number} baseEpsilon - Base relative epsilon value
 * @returns {Array|null} Approximation points if quadrilateral found
 */
function findBestQuadrilateralApproximation(points, baseEpsilon) {
  if (!points || points.length < 4) return null;

  const epsilonCandidates = [
    baseEpsilon,
    baseEpsilon * 1.3,
    baseEpsilon * 1.6,
    baseEpsilon * 2.0
  ];

  const seen = new Set();
  for (const candidate of epsilonCandidates) {
    const epsilon = Math.min(0.12, candidate);
    const key = epsilon.toFixed(4);
    if (seen.has(key)) continue;
    seen.add(key);

    const approximation = approximatePolygon(points, epsilon);
    const quad = reduceApproximationToQuadrilateral(approximation);
    if (quad && quad.length === 4) {
      return quad;
    }
  }

  return null;
}

/**
 * Reduce a polygon approximation to a quadrilateral when possible.
 * Handles near-duplicate vertices and small collinear kinks.
 * @param {Array} approximation - Approximation points
 * @returns {Array|null} Four-point approximation when reduction succeeds
 */
function reduceApproximationToQuadrilateral(approximation) {
  if (!approximation || approximation.length < 4) return null;
  if (approximation.length === 4) return approximation;
  if (approximation.length > 8) return null;

  let points = removeNearDuplicateVertices(approximation, 6);
  if (points.length === 4) return points;
  if (points.length < 4) return null;

  // Keep non-duplicate polygons as-is. The fallback corner heuristics are
  // more stable than forcing arbitrary 5->4 simplification.
  return null;
}

/**
 * Remove consecutive/cyclic vertices that are effectively duplicates.
 * @param {Array} points - Polygon points
 * @param {number} tolerance - Distance threshold in pixels
 * @returns {Array} Deduplicated points
 */
function removeNearDuplicateVertices(points, tolerance) {
  if (!points || points.length === 0) return [];

  const filtered = [];
  for (const point of points) {
    if (filtered.length === 0 || distance(point, filtered[filtered.length - 1]) > tolerance) {
      filtered.push(point);
    }
  }

  // Also collapse a closing duplicate between last and first vertices.
  if (filtered.length > 2 && distance(filtered[0], filtered[filtered.length - 1]) <= tolerance) {
    filtered.pop();
  }

  return filtered;
}

/**
 * Find corners using farthest-point-in-quadrant around contour centroid.
 * This mirrors the behavior that worked well in legacy jscanify.
 * @param {Array} points - Array of contour points
 * @returns {Object|null} Object with topLeft, topRight, bottomRight, bottomLeft
 */
function findCornersByQuadrants(points) {
  if (!points || points.length < 4) return null;

  const center = findCenter(points);

  let topLeft = null;
  let topRight = null;
  let bottomRight = null;
  let bottomLeft = null;

  let topLeftDist = 0;
  let topRightDist = 0;
  let bottomRightDist = 0;
  let bottomLeftDist = 0;

  for (const point of points) {
    const dist = distance(point, center);

    if (point.x < center.x && point.y < center.y) {
      if (dist > topLeftDist) {
        topLeft = point;
        topLeftDist = dist;
      }
    } else if (point.x > center.x && point.y < center.y) {
      if (dist > topRightDist) {
        topRight = point;
        topRightDist = dist;
      }
    } else if (point.x > center.x && point.y > center.y) {
      if (dist > bottomRightDist) {
        bottomRight = point;
        bottomRightDist = dist;
      }
    } else if (point.x < center.x && point.y > center.y) {
      if (dist > bottomLeftDist) {
        bottomLeft = point;
        bottomLeftDist = dist;
      }
    }
  }

  if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
    return null;
  }

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft
  };
}

/**
 * Find corners by finding points with min/max coordinate sums/differences.
 * This is an alternative heuristic for finding corners.
 * @param {Array} points - Array of contour points
 * @returns {Object} Object with topLeft, topRight, bottomRight, bottomLeft corners
 */
function findCornersByCoordinateExtremes(points) {
  if (!points || points.length === 0) return null;

  let topLeft = points[0];      // Min sum x + y
  let topRight = points[0];     // Max diff x - y
  let bottomRight = points[0];  // Max sum x + y
  let bottomLeft = points[0];   // Min diff x - y

  let minSum = topLeft.x + topLeft.y;
  let maxDiff = topRight.x - topRight.y;
  let maxSum = bottomRight.x + bottomRight.y;
  let minDiff = bottomLeft.x - bottomLeft.y;

  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const sum = point.x + point.y;
    const diff = point.x - point.y;

    // Top-Left (min sum)
    if (sum < minSum) {
      minSum = sum;
      topLeft = point;
    }
    // Bottom-Right (max sum)
    if (sum > maxSum) {
      maxSum = sum;
      bottomRight = point;
    }
    // Top-Right (max diff)
    if (diff > maxDiff) {
      maxDiff = diff;
      topRight = point;
    }
    // Bottom-Left (min diff)
    if (diff < minDiff) {
      minDiff = diff;
      bottomLeft = point;
    }
  }

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft
  };
}

/**
 * Orders 4 points in clockwise order starting from top-left
 * @param {Array} points - Array of 4 points to order
 * @returns {Object} Object with ordered points
 */
function orderCornerPoints(points) {
  if (points.length !== 4) {
    console.warn(`Expected 4 points, got ${points.length}`);
    return null;
  }
  
  // Calculate centroid
  const center = findCenter(points);
  
  // Sort the points by their angles relative to the center
  const sortedPoints = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
  
  // Now find the top-left point (minimum sum of x and y)
  let minSum = Infinity;
  let minIndex = 0;
  
  for (let i = 0; i < 4; i++) {
    const sum = sortedPoints[i].x + sortedPoints[i].y;
    if (sum < minSum) {
      minSum = sum;
      minIndex = i;
    }
  }
  
  // Reorder array to start with the top-left point
  const orderedPoints = [
    sortedPoints[minIndex],
    sortedPoints[(minIndex + 1) % 4],
    sortedPoints[(minIndex + 2) % 4],
    sortedPoints[(minIndex + 3) % 4]
  ];
  
  // Return as named corners
  return {
    topLeft: orderedPoints[0],
    topRight: orderedPoints[1],
    bottomRight: orderedPoints[2],
    bottomLeft: orderedPoints[3]
  };
}