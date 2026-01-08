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
  
  // Try to find a quadrilateral approximation of the contour
  const epsilon = options.epsilon || 0.02;
  const approximation = approximatePolygon(contour, epsilon);
  
  let corners;
  
  // If we get exactly 4 points, we can use them as corners
  if (approximation && approximation.length === 4) {
    // console.log('Found 4-point approximation, using as corners');
    corners = orderCornerPoints(approximation);
  } else {
    // console.log(`Polygon approximation gave ${approximation ? approximation.length : 'null'} points, using coordinate extremes method`);
    // Fallback: Use the coordinate extremes method on the original contour points
    corners = findCornersByCoordinateExtremes(contour.points); 
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