// Shared geometry helpers for scoring detected document corners against
// hand-verified ground truth (testImages/ground-truth.json).
//
// Used by scripts/baseline.js (classical vs ML comparison table) and by
// src/baseline.test.js / src/baseline.ml.test.js (regression assertions).

/**
 * Shoelace formula. `points` must be in polygon order (not necessarily any
 * particular winding — this returns the unsigned area).
 */
export function polygonArea(points) {
  return Math.abs(signedArea(points));
}

function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return area / 2;
}

// Sutherland-Hodgman requires the clip polygon to be wound consistently with
// the `inside` half-plane test below. Normalize both polygons to the same
// (counter-clockwise, signedArea > 0) winding so orientation never matters.
function normalizeWinding(points) {
  return signedArea(points) < 0 ? points.slice().reverse() : points;
}

function inside(p, a, b) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= 0;
}

function lineIntersection(p1, p2, a, b) {
  const A1 = b.y - a.y;
  const B1 = a.x - b.x;
  const C1 = A1 * a.x + B1 * a.y;
  const A2 = p2.y - p1.y;
  const B2 = p1.x - p2.x;
  const C2 = A2 * p1.x + B2 * p1.y;
  const det = A1 * B2 - A2 * B1;
  if (Math.abs(det) < 1e-9) return p2; // parallel edges — degenerate, best effort
  return {
    x: (B2 * C1 - B1 * C2) / det,
    y: (A1 * C2 - A2 * C1) / det
  };
}

/** Clip convex polygon `subject` against convex polygon `clip` (Sutherland-Hodgman). */
export function clipPolygon(subject, clip) {
  let output = subject;
  for (let i = 0; i < clip.length && output.length > 0; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const input = output;
    output = [];
    for (let j = 0; j < input.length; j++) {
      const curr = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const currInside = inside(curr, a, b);
      const prevInside = inside(prev, a, b);
      if (currInside) {
        if (!prevInside) output.push(lineIntersection(prev, curr, a, b));
        output.push(curr);
      } else if (prevInside) {
        output.push(lineIntersection(prev, curr, a, b));
      }
    }
  }
  return output;
}

/** Corner object ({ topLeft, topRight, bottomRight, bottomLeft }) -> ordered point array. */
export function cornersToPoints(corners) {
  return [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
}

/**
 * Intersection-over-Union of two document quadrilaterals given as corner
 * objects. Returns 0 for degenerate (zero-area) input instead of throwing.
 */
export function computeIoU(cornersA, cornersB) {
  const polyA = normalizeWinding(cornersToPoints(cornersA));
  const polyB = normalizeWinding(cornersToPoints(cornersB));
  const areaA = polygonArea(polyA);
  const areaB = polygonArea(polyB);
  if (areaA <= 0 || areaB <= 0) return 0;

  const intersection = clipPolygon(polyA, polyB);
  const interArea = intersection.length >= 3 ? polygonArea(intersection) : 0;
  const unionArea = areaA + areaB - interArea;
  return unionArea > 0 ? interArea / unionArea : 0;
}

/**
 * Per-corner Euclidean pixel distance between two corner objects, plus the
 * mean across all 4 corners.
 */
export function cornerErrors(cornersA, cornersB) {
  const keys = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];
  const perCorner = {};
  let sum = 0;
  for (const key of keys) {
    const d = Math.hypot(cornersA[key].x - cornersB[key].x, cornersA[key].y - cornersB[key].y);
    perCorner[key] = d;
    sum += d;
  }
  return { mean: sum / keys.length, perCorner };
}
