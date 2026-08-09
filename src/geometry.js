/**
 * Quadrilateral helpers shared by the detection pipeline (index.js) and the
 * interactive corner editor (cornerEditor.js). Both validate the same shape -
 * four named corners in TL, TR, BR, BL order - so the checks live here rather
 * than being kept in sync by hand.
 */

/** Corner keys in traversal order. A quad is only well defined walking these in sequence. */
export const CORNER_ORDER = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

export function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The four corners as an array, in traversal order. */
export function cornersToPoints(corners) {
  return CORNER_ORDER.map((key) => corners?.[key]);
}

/**
 * Rejects corners that are missing, non-finite, or collapsed onto each other.
 * @param {Object} corners
 * @param {number} minDistance - Closest two corners may be, in the corners' own units.
 */
export function cornersAreFiniteAndDistinct(corners, minDistance) {
  const points = cornersToPoints(corners);
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return false;
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (pointDistance(points[i], points[j]) < minDistance) {
        return false;
      }
    }
  }

  return true;
}

/**
 * True when the quad is convex, i.e. every cross product along the traversal
 * has the same sign. Collinear corners are skipped; fewer than three usable
 * signs means the shape is degenerate, not convex.
 */
export function isConvexQuadrilateral(corners) {
  const points = cornersToPoints(corners);
  const crossSigns = [];

  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
    if (Math.abs(cross) < 1e-6) {
      continue;
    }
    crossSigns.push(Math.sign(cross));
  }

  if (crossSigns.length < 3) {
    return false;
  }

  const firstSign = crossSigns[0];
  return crossSigns.every((s) => s === firstSign);
}

/** Shoelace area of the quad. */
export function polygonAreaFromCorners(corners) {
  if (!corners) return 0;
  const points = cornersToPoints(corners);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/** Side lengths in traversal order: top, right, bottom, left. */
export function sideLengthsFromCorners(corners) {
  const points = cornersToPoints(corners);
  return points.map((p, i) => pointDistance(p, points[(i + 1) % points.length]));
}
