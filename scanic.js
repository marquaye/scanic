const DEFAULTS = {
  // Contour detection params
  MIN_CONTOUR_AREA: 1e3,
  MIN_CONTOUR_POINTS: 10
};
const RETR_EXTERNAL = 0;
const RETR_LIST = 1;
const CHAIN_APPROX_SIMPLE = 2;
function detectDocumentContour(edges, options = {}) {
  const width = options.width || Math.sqrt(edges.length);
  const height = options.height || edges.length / width;
  const mode = options.mode !== void 0 ? options.mode : RETR_LIST;
  const method = options.method !== void 0 ? options.method : CHAIN_APPROX_SIMPLE;
  const minArea = options.minArea || DEFAULTS.MIN_CONTOUR_AREA;
  const paddedWidth = width + 2;
  const paddedHeight = height + 2;
  const labels = new Int32Array(paddedWidth * paddedHeight);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y * width + x] > 0) {
        labels[(y + 1) * paddedWidth + (x + 1)] = 1;
      }
    }
  }
  const contours = [];
  let nextContourId = 2;
  for (let y = 1; y <= height; y++) {
    for (let x = 1; x <= width; x++) {
      const currentPixelLabel = labels[y * paddedWidth + x];
      const leftPixelLabel = labels[y * paddedWidth + (x - 1)];
      let startPoint = null;
      let isOuter = false;
      let initialDirection = -1;
      if (currentPixelLabel === 1 && leftPixelLabel === 0) {
        isOuter = true;
        startPoint = { x, y };
        initialDirection = 2;
      } else if (currentPixelLabel === 0 && leftPixelLabel >= 1 && leftPixelLabel !== -1) {
        if (leftPixelLabel === 1) {
          isOuter = false;
          startPoint = { x: x - 1, y };
          initialDirection = 6;
        }
      }
      if (startPoint) {
        if (mode === RETR_EXTERNAL && !isOuter) {
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
          const adjustedPoints = finalPoints.map((p) => ({ x: p.x - 1, y: p.y - 1 }));
          if (adjustedPoints.length >= (method === CHAIN_APPROX_SIMPLE ? 4 : DEFAULTS.MIN_CONTOUR_POINTS)) {
            const contour = {
              id: contourId,
              points: adjustedPoints,
              isOuter
              // Calculate area and bounding box later if needed for filtering/sorting
            };
            contours.push(contour);
          }
        } else {
          if (labels[startPoint.y * paddedWidth + startPoint.x] === 1) {
            labels[startPoint.y * paddedWidth + startPoint.x] = contourId;
          }
        }
      }
    }
  }
  contours.forEach((contour) => {
    contour.area = calculateContourArea(contour.points);
    contour.boundingBox = calculateBoundingBox(contour.points);
  });
  const filteredContours = contours.filter((contour) => contour.area >= minArea);
  filteredContours.sort((a, b) => b.area - a.area);
  if (options.debug) {
    options.debug.labels = labels;
    options.debug.rawContours = contours;
    options.debug.finalContours = filteredContours;
  }
  return filteredContours;
}
function traceContour(labels, width, height, startPoint, initialDirection, contourId) {
  const points = [];
  const visited = /* @__PURE__ */ new Set();
  let currentX = startPoint.x;
  let currentY = startPoint.y;
  const startX = currentX;
  const startY = currentY;
  let prevDirection = -1;
  labels[startY * width + startX] = contourId;
  let count = 0;
  const maxSteps = width * height;
  const dx = [0, 1, 1, 1, 0, -1, -1, -1];
  const dy = [-1, -1, 0, 1, 1, 1, 0, -1];
  while (count++ < maxSteps) {
    let searchDirection;
    if (prevDirection === -1) {
      let found = false;
      for (let i = 0; i < 8; i++) {
        searchDirection = initialDirection + i & 7;
        const nextX2 = currentX + dx[searchDirection];
        const nextY2 = currentY + dy[searchDirection];
        if (nextX2 >= 0 && nextX2 < width && nextY2 >= 0 && nextY2 < height && labels[nextY2 * width + nextX2] > 0) {
          found = true;
          break;
        }
      }
      if (!found) return null;
    } else {
      searchDirection = prevDirection + 2 & 7;
    }
    let nextX = -1;
    let nextY = -1;
    for (let i = 0; i < 8; i++) {
      const checkDirection = searchDirection + i & 7;
      const checkX = currentX + dx[checkDirection];
      const checkY = currentY + dy[checkDirection];
      if (checkX >= 0 && checkX < width && checkY >= 0 && checkY < height) {
        if (labels[checkY * width + checkX] > 0) {
          nextX = checkX;
          nextY = checkY;
          prevDirection = checkDirection + 4 & 7;
          break;
        }
      }
    }
    if (nextX === -1) {
      if (points.length === 0) {
        points.push({ x: currentX, y: currentY });
      }
      console.warn(`Contour tracing stopped unexpectedly at (${currentX - 1}, ${currentY - 1}) for contour ${contourId}`);
      break;
    }
    const visitedKey = currentY * width + currentX;
    if (visited.has(visitedKey)) {
      return points;
    }
    points.push({ x: currentX, y: currentY });
    visited.add(visitedKey);
    const nextIdx = nextY * width + nextX;
    if (labels[nextIdx] === 1) {
      labels[nextIdx] = contourId;
    }
    currentX = nextX;
    currentY = nextY;
    if (currentX === startX && currentY === startY) {
      break;
    }
  }
  if (count >= maxSteps) {
    console.warn(`Contour tracing exceeded max steps for contour ${contourId}`);
    return null;
  }
  return points;
}
function simplifyChainApproxSimple(points) {
  const n = points.length;
  if (n <= 2) {
    return points;
  }
  const simplifiedPoints = [];
  const lastPoint = points[n - 1];
  const firstPoint = points[0];
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
  if (simplifiedPoints.length === 0) {
    if (n === 1) return [points[0]];
    if (n === 2) return points;
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
function simplifyContour(points, epsilon = 1) {
  if (points.length <= 2) {
    return points;
  }
  let maxDistance = 0;
  let index = 0;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const distance2 = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance2 > maxDistance) {
      maxDistance = distance2;
      index = i;
    }
  }
  if (maxDistance > epsilon) {
    const firstSegment = simplifyContour(points.slice(0, index + 1), epsilon);
    const secondSegment = simplifyContour(points.slice(index), epsilon);
    return firstSegment.slice(0, -1).concat(secondSegment);
  } else {
    return [firstPoint, lastPoint];
  }
}
function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLengthSq = dx * dx + dy * dy;
  if (lineLengthSq === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }
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
  const distDx = point.x - closestPointX;
  const distDy = point.y - closestPointY;
  return Math.sqrt(distDx * distDx + distDy * distDy);
}
function approximatePolygon(contourPoints, epsilon = 0.02) {
  const perimeter = calculateContourPerimeter(contourPoints);
  const actualEpsilon = epsilon * perimeter;
  const simplifiedPoints = simplifyContour(contourPoints, actualEpsilon);
  return simplifiedPoints;
}
function calculateContourPerimeter(points) {
  let perimeter = 0;
  const n = points.length;
  if (n < 2) return 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const dx = points[i].x - points[j].x;
    const dy = points[i].y - points[j].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
}
function distance(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}
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
function findCornerPoints(contour, options = {}) {
  if (!contour || !contour.points || contour.points.length < 4) {
    console.warn("Contour does not have enough points for corner detection");
    return null;
  }
  const epsilon = options.epsilon || 0.02;
  const approximation = findBestQuadrilateralApproximation(contour.points, epsilon);
  let corners;
  if (approximation && approximation.length === 4) {
    corners = orderCornerPoints(approximation);
  } else {
    corners = findCornersByQuadrants(contour.points);
    if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
      corners = findCornersByCoordinateExtremes(contour.points);
    }
  }
  if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
    console.warn("Failed to find all four corners.", corners);
    return null;
  }
  return corners;
}
function findBestQuadrilateralApproximation(points, baseEpsilon) {
  if (!points || points.length < 4) return null;
  const epsilonCandidates = [
    baseEpsilon,
    baseEpsilon * 1.3,
    baseEpsilon * 1.6,
    baseEpsilon * 2
  ];
  const seen = /* @__PURE__ */ new Set();
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
function reduceApproximationToQuadrilateral(approximation) {
  if (!approximation || approximation.length < 4) return null;
  if (approximation.length === 4) return approximation;
  if (approximation.length > 8) return null;
  let points = removeNearDuplicateVertices(approximation, 6);
  if (points.length === 4) return points;
  if (points.length < 4) return null;
  return null;
}
function removeNearDuplicateVertices(points, tolerance) {
  if (!points || points.length === 0) return [];
  const filtered = [];
  for (const point of points) {
    if (filtered.length === 0 || distance(point, filtered[filtered.length - 1]) > tolerance) {
      filtered.push(point);
    }
  }
  if (filtered.length > 2 && distance(filtered[0], filtered[filtered.length - 1]) <= tolerance) {
    filtered.pop();
  }
  return filtered;
}
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
function findCornersByCoordinateExtremes(points) {
  if (!points || points.length === 0) return null;
  let topLeft = points[0];
  let topRight = points[0];
  let bottomRight = points[0];
  let bottomLeft = points[0];
  let minSum = topLeft.x + topLeft.y;
  let maxDiff = topRight.x - topRight.y;
  let maxSum = bottomRight.x + bottomRight.y;
  let minDiff = bottomLeft.x - bottomLeft.y;
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const sum = point.x + point.y;
    const diff = point.x - point.y;
    if (sum < minSum) {
      minSum = sum;
      topLeft = point;
    }
    if (sum > maxSum) {
      maxSum = sum;
      bottomRight = point;
    }
    if (diff > maxDiff) {
      maxDiff = diff;
      topRight = point;
    }
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
function orderCornerPoints(points) {
  if (points.length !== 4) {
    console.warn(`Expected 4 points, got ${points.length}`);
    return null;
  }
  const center = findCenter(points);
  const sortedPoints = [...points].sort((a, b) => {
    const angleA = Math.atan2(a.y - center.y, a.x - center.x);
    const angleB = Math.atan2(b.y - center.y, b.x - center.x);
    return angleA - angleB;
  });
  let minSum = Infinity;
  let minIndex = 0;
  for (let i = 0; i < 4; i++) {
    const sum = sortedPoints[i].x + sortedPoints[i].y;
    if (sum < minSum) {
      minSum = sum;
      minIndex = i;
    }
  }
  const orderedPoints = [
    sortedPoints[minIndex],
    sortedPoints[(minIndex + 1) % 4],
    sortedPoints[(minIndex + 2) % 4],
    sortedPoints[(minIndex + 3) % 4]
  ];
  return {
    topLeft: orderedPoints[0],
    topRight: orderedPoints[1],
    bottomRight: orderedPoints[2],
    bottomLeft: orderedPoints[3]
  };
}
let wasm;
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
let WASM_VECTOR_LEN = 0;
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function blur(grayscale, width, height, kernel_size, sigma) {
  const ptr0 = passArray8ToWasm0(grayscale, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.blur(ptr0, len0, width, height, kernel_size, sigma);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}
let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
  if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
    cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
  }
  return cachedFloat32ArrayMemory0;
}
function passArrayF32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getFloat32ArrayMemory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function hysteresis_thresholding(suppressed, width, height, low_threshold, high_threshold) {
  const ptr0 = passArrayF32ToWasm0(suppressed, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.hysteresis_thresholding(ptr0, len0, width, height, low_threshold, high_threshold);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}
function dilate(edges, width, height, kernel_size) {
  const ptr0 = passArray8ToWasm0(edges, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.dilate(ptr0, len0, width, height, kernel_size);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}
let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
  if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
    cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
  }
  return cachedUint16ArrayMemory0;
}
function passArray16ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 2, 2) >>> 0;
  getUint16ArrayMemory0().set(arg, ptr / 2);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function getArrayF32FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}
function non_maximum_suppression(dx, dy, width, height, l2_gradient) {
  const ptr0 = passArray16ToWasm0(dx, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray16ToWasm0(dy, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.non_maximum_suppression(ptr0, len0, ptr1, len1, width, height, l2_gradient);
  var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
  return v3;
}
function canny_edge_detector_full(grayscale, width, height, low_threshold, high_threshold, kernel_size, sigma, l2_gradient, apply_dilation, dilation_kernel_size) {
  const ptr0 = passArray8ToWasm0(grayscale, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.canny_edge_detector_full(ptr0, len0, width, height, low_threshold, high_threshold, kernel_size, sigma, l2_gradient, apply_dilation, dilation_kernel_size);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        if (module.headers.get("Content-Type") != "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
        } else {
          throw e;
        }
      }
    }
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
}
function __wbg_get_imports() {
  const imports = {};
  imports.wbg = {};
  imports.wbg.__wbindgen_init_externref_table = function() {
    const table = wasm.__wbindgen_export_0;
    const offset = table.grow(4);
    table.set(0, void 0);
    table.set(offset + 0, void 0);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
  };
  return imports;
}
function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  __wbg_init.__wbindgen_wasm_module = module;
  cachedFloat32ArrayMemory0 = null;
  cachedUint16ArrayMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  wasm.__wbindgen_start();
  return wasm;
}
async function __wbg_init(module_or_path) {
  if (wasm !== void 0) return wasm;
  if (typeof module_or_path !== "undefined") {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (typeof module_or_path === "undefined") {
    module_or_path = new URL("data:application/wasm;base64,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JAAgAiABIAJqIgFLBEBBAEEAEC0ACyADQQRqIAAoAgAiAiAAKAIEQQggASACQQF0IgIgASACSxsiASABQQhNGyIBQQFBARARIAMoAgRBAUYEQCADKAIIIAMoAgwQLQALIAMoAgghAiAAIAE2AgAgACACNgIEIANBEGokAAt5AQF/IwBBIGsiAiQAAn8gACgCAEGAgICAeEcEQCABIAAoAgQgACgCCBAwDAELIAJBEGogACgCDCgCACIAQQhqKQIANwMAIAJBGGogAEEQaikCADcDACACIAApAgA3AwggASgCACABKAIEIAJBCGoQBwsgAkEgaiQAC2kBA38jAEEQayIBJAAgAUEEaiAAKAIAIgIgACgCBEEEIAJBAXQiAiACQQRNGyICQQRBBBARIAEoAgRBAUYEQCABKAIIIAEoAgwQLQALIAEoAgghAyAAIAI2AgAgACADNgIEIAFBEGokAAtpAQN/IwBBEGsiASQAIAFBBGogACgCACICIAAoAgRBBCACQQF0IgIgAkEETRsiAkEEQQgQESABKAIEQQFGBEAgASgCCCABKAIMEC0ACyABKAIIIQMgACACNgIAIAAgAzYCBCABQRBqJAALaQEDfyMAQRBrIgEkACABQQRqIAAoAgAiAiAAKAIEQQQgAkEBdCICIAJBBE0bIgJBAkECEBEgASgCBEEBRgRAIAEoAgggASgCDBAtAAsgASgCCCEDIAAgAjYCACAAIAM2AgQgAUEQaiQACxIAIwBBMGsiACQAIABBMGokAAtoAgF/AX4jAEEwayIDJAAgAyABNgIEIAMgADYCACADQQI2AgwgA0Hkl8AANgIIIANCAjcCFCADQoCAgIAwIgQgA62ENwMoIAMgBCADQQRqrYQ3AyAgAyADQSBqNgIQIANBCGogAhAmAAtHAQF/IAAoAgAgACgCCCIDayACSQRAIAAgAyACEBIgACgCCCEDCyACBEAgACgCBCADaiABIAL8CgAACyAAIAIgA2o2AghBAAtEAQJ/IAEoAgQhAiABKAIAIQNBCEEEEDUiAUUEQEEEQQgQOQALIAEgAjYCBCABIAM2AgAgAEHcksAANgIEIAAgATYCAAvGAgACQCAAIAJNBEAgACABTSABIAJLcg0BIwBBMGsiAiQAIAIgATYCBCACIAA2AgAgAkECNgIMIAJB2JbAADYCCCACQgI3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IAAAABwAEAAMAAAAEgAAABcAAAAcABAADAAAABcAAAAZAAAAHAAQAAwAAAAUAAAAGQAAABwAEAAMAAAAUQAAAB4AAAAcABAADAAAAFIAAAAeAAAATGF6eSBpbnN0YW5jZSBoYXMgcHJldmlvdXNseSBiZWVuIHBvaXNvbmVkAAA8CBAAKgAAAEgBEABaAAAACAMAABkAAAByZWVudHJhbnQgaW5pdAAAgAgQAA4AAABIARAAWgAAAHoCAAANAAAAfP2LMlfmV/kC30S/40jnr21dy9YsUOtjeEGmV3Ebi7ltZW1vcnkgYWxsb2NhdGlvbiBvZiAgYnl0ZXMgZmFpbGVkAADICBAAFQAAAN0IEAANAAAALwEQABgAAABkAQAACQAAAAQAAAAMAAAABAAAAAUAAAAGAAAABwAAAAAAAAAIAAAABAAAAAgAAAAJAAAACgAAAAsAAAAMAAAAEAAAAAQAAAANAAAADgAAAA8AAAAQAAAAAAAAAAgAAAAEAAAAEQAAAGFzc2VydGlvbiBmYWlsZWQ6IHBzaXplID49IHNpemUgKyBtaW5fb3ZlcmhlYWQAAAQBEAAqAAAAsQQAAAkAAABhc3NlcnRpb24gZmFpbGVkOiBwc2l6ZSA8PSBzaXplICsgbWF4X292ZXJoZWFkAAAEARAAKgAAALcEAAANAAAABAAAAAwAAAAEAAAAEgAAAGNhcGFjaXR5IG92ZXJmbG93AAAA/AkQABEAAADjABAAIAAAABwAAAAFAAAAMDAwMTAyMDMwNDA1MDYwNzA4MDkxMDExMTIxMzE0MTUxNjE3MTgxOTIwMjEyMjIzMjQyNTI2MjcyODI5MzAzMTMyMzMzNDM1MzYzNzM4Mzk0MDQxNDI0MzQ0NDU0NjQ3NDg0OTUwNTE1MjUzNTQ1NTU2NTc1ODU5NjA2MTYyNjM2NDY1NjY2NzY4Njk3MDcxNzI3Mzc0NzU3Njc3Nzg3OTgwODE4MjgzODQ4NTg2ODc4ODg5OTA5MTkyOTM5NDk1OTY5Nzk4OTlyYW5nZSBlbmQgaW5kZXggIG91dCBvZiByYW5nZSBmb3Igc2xpY2Ugb2YgbGVuZ3RoIAAA8AoQABAAAAAACxAAIgAAAHNsaWNlIGluZGV4IHN0YXJ0cyBhdCAgYnV0IGVuZHMgYXQgADQLEAAWAAAASgsQAA0AAAByYW5nZSBzdGFydCBpbmRleCAAAGgLEAASAAAAAAsQACIAAABhdHRlbXB0IHRvIGRpdmlkZSBieSB6ZXJvAAAAjAsQABkAAABpbmRleCBvdXQgb2YgYm91bmRzOiB0aGUgbGVuIGlzICBidXQgdGhlIGluZGV4IGlzIAAAsAsQACAAAADQCxAAEgAAAAAAAD8AAAC/AEGUmMAACwEBAHwJcHJvZHVjZXJzAghsYW5ndWFnZQEEUnVzdAAMcHJvY2Vzc2VkLWJ5AwVydXN0Yx0xLjkyLjAgKGRlZDVjMDZjZiAyMDI1LTEyLTA4KQZ3YWxydXMGMC4yMy4zDHdhc20tYmluZGdlbhMwLjIuMTAwICgyNDA1ZWMyYjQpAHQPdGFyZ2V0X2ZlYXR1cmVzBysPbXV0YWJsZS1nbG9iYWxzKxNub250cmFwcGluZy1mcHRvaW50KwdzaW1kMTI4KwtidWxrLW1lbW9yeSsIc2lnbi1leHQrD3JlZmVyZW5jZS10eXBlcysKbXVsdGl2YWx1ZQ==", import.meta.url);
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module);
}
let wasmReadyPromise = null;
let hasLoggedFullCannyFallback = false;
let wasmSupportCache = null;
function isNodeRuntime() {
  var _a;
  return typeof process !== "undefined" && !!((_a = process.versions) == null ? void 0 : _a.node);
}
function wasmModuleSupported() {
  if (wasmSupportCache !== null) return wasmSupportCache;
  let supported = false;
  if (typeof WebAssembly === "object" && typeof WebAssembly.validate === "function") {
    const simd = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
    const referenceTypes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 111, 3, 2, 1, 0, 10, 6, 1, 4, 0, 208, 111, 11]);
    try {
      supported = WebAssembly.validate(simd) && WebAssembly.validate(referenceTypes);
    } catch {
      supported = false;
    }
  }
  wasmSupportCache = supported;
  return supported;
}
async function initializeWasmInternal() {
  if (!wasmModuleSupported()) {
    throw new Error("scanic: WebAssembly features required by the WASM module (reference-types, SIMD) are unavailable in this engine; using the JavaScript fallback.");
  }
  if (isNodeRuntime()) {
    try {
      const fsModule = "node:fs/promises";
      const urlModule = "node:url";
      const { readFile } = await import(
        /* @vite-ignore */
        fsModule
      );
      const { fileURLToPath } = await import(
        /* @vite-ignore */
        urlModule
      );
      const moduleUrl = new URL(import.meta.url);
      moduleUrl.search = "";
      moduleUrl.hash = "";
      const wasmUrl = new URL("../wasm_blur/pkg/wasm_blur_bg.wasm", moduleUrl);
      const wasmBytes = await readFile(fileURLToPath(wasmUrl));
      return await __wbg_init({ module_or_path: wasmBytes });
    } catch {
      return await __wbg_init();
    }
  }
  return await __wbg_init();
}
function initializeWasm() {
  if (!wasmReadyPromise) {
    wasmReadyPromise = initializeWasmInternal().catch((error) => {
      wasmReadyPromise = null;
      throw error;
    });
  }
  return wasmReadyPromise;
}
function convertToGrayscale(imageData) {
  const { width, height, data } = imageData;
  const grayscale = new Uint8ClampedArray(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayscale[j] = data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19 >> 8;
  }
  return grayscale;
}
function gaussianBlurGrayscale(grayscale, width, height, kernelSize = 5, sigma = 0) {
  if (sigma === 0) {
    sigma = 0.3 * ((kernelSize - 1) * 0.5 - 1) + 0.8;
  }
  const halfKernel = Math.floor(kernelSize / 2);
  const kernel = createGaussianKernel(kernelSize, sigma);
  const tempArray = new Uint8ClampedArray(width * height);
  const blurred = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const xOffset = Math.min(width - 1, Math.max(0, x + k));
        sum += grayscale[rowOffset + xOffset] * kernel[halfKernel + k];
      }
      tempArray[rowOffset + x] = sum;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let k = -halfKernel; k <= halfKernel; k++) {
        const yOffset = Math.min(height - 1, Math.max(0, y + k));
        sum += tempArray[yOffset * width + x] * kernel[halfKernel + k];
      }
      blurred[y * width + x] = Math.round(sum);
    }
  }
  return blurred;
}
function createGaussianKernel(size, sigma) {
  const kernel = new Float32Array(size);
  const halfSize = Math.floor(size / 2);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - halfSize;
    kernel[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += kernel[i];
  }
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  return kernel;
}
function calculateGradients(blurred, width, height) {
  const dx = new Int16Array(width * height);
  const dy = new Int16Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    const prevRowOffset = (y - 1) * width;
    const nextRowOffset = (y + 1) * width;
    for (let x = 1; x < width - 1; x++) {
      const currentIdx = rowOffset + x;
      const p0 = blurred[prevRowOffset + x - 1];
      const p1 = blurred[prevRowOffset + x];
      const p2 = blurred[prevRowOffset + x + 1];
      const p3 = blurred[rowOffset + x - 1];
      const p5 = blurred[rowOffset + x + 1];
      const p6 = blurred[nextRowOffset + x - 1];
      const p7 = blurred[nextRowOffset + x];
      const p8 = blurred[nextRowOffset + x + 1];
      const gx = p2 - p0 + 2 * (p5 - p3) + (p8 - p6);
      const gy = p6 + 2 * p7 + p8 - (p0 + 2 * p1 + p2);
      dx[currentIdx] = gx;
      dy[currentIdx] = gy;
    }
  }
  return { dx, dy };
}
function nonMaximumSuppression(dx, dy, width, height, L2gradient) {
  const magnitude = new Float32Array(width * height);
  const suppressed = new Float32Array(width * height);
  for (let i = 0; i < dx.length; i++) {
    const gx = dx[i];
    const gy = dy[i];
    if (L2gradient) {
      magnitude[i] = Math.sqrt(gx * gx + gy * gy);
    } else {
      magnitude[i] = Math.abs(gx) + Math.abs(gy);
    }
  }
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = magnitude[idx];
      if (mag === 0) {
        suppressed[idx] = 0;
        continue;
      }
      const gx = dx[idx];
      const gy = dy[idx];
      let neighbor1 = 0, neighbor2 = 0;
      const absGx = Math.abs(gx);
      const absGy = Math.abs(gy);
      if (absGy > absGx * 2.4142) {
        neighbor1 = magnitude[idx - width];
        neighbor2 = magnitude[idx + width];
      } else if (absGx > absGy * 2.4142) {
        neighbor1 = magnitude[idx - 1];
        neighbor2 = magnitude[idx + 1];
      } else {
        const s = (gx ^ gy) < 0 ? -1 : 1;
        if (gy > 0) {
          neighbor1 = magnitude[(y - 1) * width + (x - s)];
          neighbor2 = magnitude[(y + 1) * width + (x + s)];
        } else {
          neighbor1 = magnitude[(y + 1) * width + (x - s)];
          neighbor2 = magnitude[(y - 1) * width + (x + s)];
        }
        if (gx > 0 && gy > 0 || gx < 0 && gy < 0) {
          neighbor1 = magnitude[(y - 1) * width + (x + 1)];
          neighbor2 = magnitude[(y + 1) * width + (x - 1)];
        } else {
          neighbor1 = magnitude[(y - 1) * width + (x - 1)];
          neighbor2 = magnitude[(y + 1) * width + (x + 1)];
        }
      }
      if (mag >= neighbor1 && mag >= neighbor2) {
        suppressed[idx] = mag;
      } else {
        suppressed[idx] = 0;
      }
    }
  }
  return suppressed;
}
function hysteresisThresholding(suppressed, width, height, lowThreshold, highThreshold) {
  const edgeMap = new Uint8Array(width * height);
  const stack = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const mag = suppressed[idx];
      if (mag >= highThreshold) {
        edgeMap[idx] = 2;
        stack.push({ x, y });
      } else if (mag >= lowThreshold) {
        edgeMap[idx] = 0;
      } else {
        edgeMap[idx] = 1;
      }
    }
  }
  for (let x = 0; x < width; x++) {
    edgeMap[x] = 1;
    edgeMap[(height - 1) * width + x] = 1;
  }
  for (let y = 1; y < height - 1; y++) {
    edgeMap[y * width] = 1;
    edgeMap[y * width + width - 1] = 1;
  }
  const dxNeighbors = [-1, 0, 1, -1, 1, -1, 0, 1];
  const dyNeighbors = [-1, -1, -1, 0, 0, 1, 1, 1];
  while (stack.length > 0) {
    const { x, y } = stack.pop();
    for (let i = 0; i < 8; i++) {
      const nx = x + dxNeighbors[i];
      const ny = y + dyNeighbors[i];
      const nidx = ny * width + nx;
      if (edgeMap[nidx] === 0) {
        edgeMap[nidx] = 2;
        stack.push({ x: nx, y: ny });
      }
    }
  }
  return edgeMap;
}
function dilateEdges(edges, width, height, kernelSize = 5) {
  const halfKernel = Math.floor(kernelSize / 2);
  const temp = new Uint8ClampedArray(width * height);
  const dilated = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
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
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let maxVal = 0;
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
async function cannyEdgeDetector(input, options = {}) {
  const storeFullDebug = !!(options.debug && !options.debug._timingsOnly);
  const timings = [];
  const tStart = performance.now();
  const skipGrayscale = options.skipGrayscale || false;
  let width, height, grayscale;
  if (skipGrayscale) {
    width = options.width;
    height = options.height;
    grayscale = input;
    if (storeFullDebug) options.debug.grayscale = grayscale;
  } else {
    width = input.width;
    height = input.height;
    let t02 = performance.now();
    grayscale = convertToGrayscale(input);
    let t12 = performance.now();
    timings.push({ step: "Grayscale", ms: (t12 - t02).toFixed(2) });
    if (storeFullDebug) options.debug.grayscale = grayscale;
  }
  let lowThreshold = options.lowThreshold !== void 0 ? options.lowThreshold : null;
  let highThreshold = options.highThreshold !== void 0 ? options.highThreshold : null;
  if (lowThreshold === null || highThreshold === null) {
    const HIST_SIZE = 1024;
    const hist = new Uint32Array(HIST_SIZE);
    let nonZeroCount = 0;
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const gx = -grayscale[idx - width - 1] + grayscale[idx - width + 1] - 2 * grayscale[idx - 1] + 2 * grayscale[idx + 1] - grayscale[idx + width - 1] + grayscale[idx + width + 1];
        const gy = -grayscale[idx - width - 1] - 2 * grayscale[idx - width] - grayscale[idx - width + 1] + grayscale[idx + width - 1] + 2 * grayscale[idx + width] + grayscale[idx + width + 1];
        let mag = Math.abs(gx) + Math.abs(gy);
        if (mag >= HIST_SIZE) mag = HIST_SIZE - 1;
        if (mag > 0) {
          hist[mag]++;
          nonZeroCount++;
        }
      }
    }
    const targetCount = Math.round(nonZeroCount * 0.7);
    let cumulative = 0;
    let pivot = 75;
    for (let i = 1; i < HIST_SIZE; i++) {
      cumulative += hist[i];
      if (cumulative >= targetCount) {
        pivot = i;
        break;
      }
    }
    if (lowThreshold === null) lowThreshold = Math.max(5, Math.round(pivot * 0.5));
    if (highThreshold === null) highThreshold = Math.min(500, Math.round(pivot * 1.5));
  }
  const kernelSize = options.kernelSize || 5;
  const sigma = options.sigma || 0;
  const L2gradient = options.L2gradient === void 0 ? false : options.L2gradient;
  const applyDilation = options.applyDilation !== void 0 ? options.applyDilation : true;
  const dilationKernelSize = options.dilationKernelSize || 5;
  const useWasmHysteresis = options.useWasmHysteresis !== void 0 ? options.useWasmHysteresis : false;
  const useWasmFullCanny = options.useWasmFullCanny !== void 0 ? options.useWasmFullCanny : false;
  if (lowThreshold >= highThreshold) {
    console.warn(`Canny Edge Detector: lowThreshold (${lowThreshold}) should be lower than highThreshold (${highThreshold}). Swapping them.`);
    [lowThreshold, highThreshold] = [highThreshold, lowThreshold];
  }
  if (useWasmFullCanny) {
    try {
      await initializeWasm();
      const t0w = performance.now();
      const finalEdges2 = new Uint8ClampedArray(
        canny_edge_detector_full(
          grayscale,
          width,
          height,
          lowThreshold,
          highThreshold,
          kernelSize,
          sigma,
          L2gradient,
          applyDilation,
          dilationKernelSize
        )
      );
      const t1w = performance.now();
      const wasmMs = (t1w - t0w).toFixed(2);
      timings.push({ step: "Edge Processing (WASM)", ms: wasmMs });
      if (storeFullDebug) {
        options.debug.finalEdges = finalEdges2;
      }
      if (options.debug) options.debug.timings = timings;
      else options.debug = { timings };
      const tEnd2 = performance.now();
      timings.unshift({ step: "Edge Detection Total", ms: (tEnd2 - tStart).toFixed(2) });
      return finalEdges2;
    } catch (error) {
      if (!hasLoggedFullCannyFallback) {
        hasLoggedFullCannyFallback = true;
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`Full WASM Canny unavailable, using step-by-step path: ${reason}`);
      }
    }
  }
  let t0, t1;
  let blurred;
  t0 = performance.now();
  {
    try {
      await initializeWasm();
      blurred = blur(grayscale, width, height, kernelSize, sigma);
    } catch (e) {
      blurred = gaussianBlurGrayscale(grayscale, width, height, kernelSize, sigma);
    }
  }
  t1 = performance.now();
  timings.push({ step: "Gaussian Blur", ms: (t1 - t0).toFixed(2) });
  if (storeFullDebug) {
    options.debug.blurred = blurred;
  }
  t0 = performance.now();
  let dx, dy;
  {
    const gradients = calculateGradients(blurred, width, height);
    dx = gradients.dx;
    dy = gradients.dy;
  }
  t1 = performance.now();
  timings.push({ step: "Gradients", ms: (t1 - t0).toFixed(2) });
  t0 = performance.now();
  let suppressed;
  {
    try {
      await initializeWasm();
      suppressed = await non_maximum_suppression(dx, dy, width, height, L2gradient);
    } catch (e) {
      suppressed = nonMaximumSuppression(dx, dy, width, height, L2gradient);
    }
  }
  t1 = performance.now();
  timings.push({ step: "Non-Max Suppression", ms: (t1 - t0).toFixed(2) });
  t0 = performance.now();
  const finalLowThreshold = L2gradient ? lowThreshold * lowThreshold : lowThreshold;
  const finalHighThreshold = L2gradient ? highThreshold * highThreshold : highThreshold;
  let edgeMap;
  if (useWasmHysteresis) {
    try {
      await initializeWasm();
      edgeMap = hysteresis_thresholding(suppressed, width, height, finalLowThreshold, finalHighThreshold);
    } catch (e) {
      console.warn("WASM hysteresis failed, falling back to JS:", e);
      edgeMap = hysteresisThresholding(suppressed, width, height, finalLowThreshold, finalHighThreshold);
    }
  } else {
    edgeMap = hysteresisThresholding(suppressed, width, height, finalLowThreshold, finalHighThreshold);
  }
  t1 = performance.now();
  timings.push({ step: "Hysteresis", ms: (t1 - t0).toFixed(2) });
  t0 = performance.now();
  const cannyEdges = new Uint8ClampedArray(width * height);
  for (let i = 0; i < edgeMap.length; i++) {
    cannyEdges[i] = edgeMap[i] === 2 ? 255 : 0;
  }
  t1 = performance.now();
  timings.push({ step: "Binary Image", ms: (t1 - t0).toFixed(2) });
  t0 = performance.now();
  let finalEdges = cannyEdges;
  if (applyDilation) {
    {
      try {
        await initializeWasm();
        finalEdges = dilate(cannyEdges, width, height, dilationKernelSize);
      } catch (e) {
        finalEdges = dilateEdges(cannyEdges, width, height, dilationKernelSize);
      }
    }
  }
  t1 = performance.now();
  timings.push({ step: "Dilation", ms: (t1 - t0).toFixed(2) });
  if (storeFullDebug) {
    options.debug.dx = dx;
    options.debug.dy = dy;
    const magnitude = new Float32Array(width * height);
    for (let i = 0; i < dx.length; i++) {
      const gx = dx[i];
      const gy = dy[i];
      magnitude[i] = L2gradient ? Math.sqrt(gx * gx + gy * gy) : Math.abs(gx) + Math.abs(gy);
    }
    options.debug.magnitude = magnitude;
    options.debug.suppressed = suppressed;
    options.debug.edgeMap = edgeMap;
    options.debug.cannyEdges = cannyEdges;
    options.debug.finalEdges = finalEdges;
  }
  if (options.debug) {
    options.debug.timings = timings;
  } else if (!options.debug) {
    options.debug = { timings };
  }
  const tEnd = performance.now();
  timings.unshift({ step: "Edge Detection Total", ms: (tEnd - tStart).toFixed(2) });
  return finalEdges;
}
function cloneCorners(corners) {
  return {
    topLeft: { x: corners.topLeft.x, y: corners.topLeft.y },
    topRight: { x: corners.topRight.x, y: corners.topRight.y },
    bottomRight: { x: corners.bottomRight.x, y: corners.bottomRight.y },
    bottomLeft: { x: corners.bottomLeft.x, y: corners.bottomLeft.y }
  };
}
function pointDistance$1(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function cornersAreFiniteAndDistinct$1(corners, minDistance = 4) {
  const points = [corners == null ? void 0 : corners.topLeft, corners == null ? void 0 : corners.topRight, corners == null ? void 0 : corners.bottomRight, corners == null ? void 0 : corners.bottomLeft];
  if (points.some((p) => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    return false;
  }
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (pointDistance$1(points[i], points[j]) < minDistance) {
        return false;
      }
    }
  }
  return true;
}
function isConvexQuadrilateral$1(corners) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const crossSigns = [];
  for (let i = 0; i < points.length; i++) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
    if (Math.abs(cross) < 1e-6) continue;
    crossSigns.push(Math.sign(cross));
  }
  if (crossSigns.length < 3) {
    return false;
  }
  const firstSign = crossSigns[0];
  return crossSigns.every((s) => s === firstSign);
}
function createDefaultCorners(imageWidth, imageHeight, insetRatio = 0.08) {
  const inset = Math.max(8, Math.min(imageWidth, imageHeight) * insetRatio);
  return {
    topLeft: { x: inset, y: inset },
    topRight: { x: imageWidth - inset, y: inset },
    bottomRight: { x: imageWidth - inset, y: imageHeight - inset },
    bottomLeft: { x: inset, y: imageHeight - inset }
  };
}
function drawHandle(ctx, point, radius, color, stroke, lineWidth) {
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}
function normalizeImageToCanvas(image) {
  if (!image) {
    throw new Error("No image provided");
  }
  const isImageData = image && typeof image.width === "number" && typeof image.height === "number" && image.data;
  let width = 0;
  let height = 0;
  if (isImageData) {
    width = image.width;
    height = image.height;
  } else {
    width = image.width || image.naturalWidth;
    height = image.height || image.naturalHeight;
  }
  if (!width || !height) {
    throw new Error("Image must be loaded before creating the corner editor");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Failed to create 2D canvas context for source image");
  }
  if (isImageData) {
    ctx.putImageData(image, 0, 0);
  } else {
    ctx.drawImage(image, 0, 0, width, height);
  }
  return { canvas, width, height };
}
function createCornerEditor(options = {}) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
  const container = options.container;
  if (!container || typeof container.appendChild !== "function") {
    throw new Error("createCornerEditor requires a valid container element");
  }
  const { canvas: sourceCanvas, width: imageWidth, height: imageHeight } = normalizeImageToCanvas(options.image);
  const editorCanvas = document.createElement("canvas");
  editorCanvas.style.position = "absolute";
  editorCanvas.style.top = "0";
  editorCanvas.style.left = "0";
  editorCanvas.style.display = "block";
  editorCanvas.style.boxSizing = "border-box";
  editorCanvas.style.touchAction = "none";
  editorCanvas.style.userSelect = "none";
  editorCanvas.style.webkitUserSelect = "none";
  editorCanvas.style.cursor = "crosshair";
  editorCanvas.style.outline = "none";
  const keyboardEnabled = options.keyboard !== false;
  if (keyboardEnabled) {
    editorCanvas.tabIndex = 0;
    editorCanvas.setAttribute("role", "application");
    editorCanvas.setAttribute("aria-label", "Document corner editor. Use arrow keys to adjust the selected corner.");
  }
  const restoreContainerStyle = {
    position: container.style.position,
    minHeight: container.style.minHeight
  };
  let changedContainerPosition = false;
  let changedContainerMinHeight = false;
  if (getComputedStyle(container).position === "static") {
    container.style.position = "relative";
    changedContainerPosition = true;
  }
  container.appendChild(editorCanvas);
  const ctx = editorCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to create 2D canvas context for corner editor");
  }
  const magnifier = {
    enabled: ((_a = options.magnifier) == null ? void 0 : _a.enabled) !== false,
    size: ((_b = options.magnifier) == null ? void 0 : _b.size) || 110,
    zoom: ((_c = options.magnifier) == null ? void 0 : _c.zoom) || 2,
    margin: ((_d = options.magnifier) == null ? void 0 : _d.margin) || 16,
    borderColor: ((_e = options.magnifier) == null ? void 0 : _e.borderColor) || "#ffffff",
    borderWidth: ((_f = options.magnifier) == null ? void 0 : _f.borderWidth) || 2,
    crosshairColor: ((_g = options.magnifier) == null ? void 0 : _g.crosshairColor) || "#ffffff",
    crosshairSize: ((_h = options.magnifier) == null ? void 0 : _h.crosshairSize) || 18
  };
  const nudges = {
    enabled: !!((_i = options.nudges) == null ? void 0 : _i.enabled),
    steps: (((_j = options.nudges) == null ? void 0 : _j.steps) && options.nudges.steps.length ? options.nudges.steps : [1, 5]).map((v) => Math.max(1, Math.round(v)))
  };
  const defaultCorners = createDefaultCorners(imageWidth, imageHeight);
  const requestedCorners = options.corners ? cloneCorners(options.corners) : defaultCorners;
  let corners = cornersAreFiniteAndDistinct$1(requestedCorners) && isConvexQuadrilateral$1(requestedCorners) ? requestedCorners : defaultCorners;
  const initialCorners = cloneCorners(corners);
  let isDestroyed = false;
  let activeCornerKey = null;
  let dragPointerId = null;
  let lastPointerPosition = null;
  const handleHitArea = Math.max(24, options.handleHitArea || 48);
  const handleRadius = Math.max(8, Math.min(16, handleHitArea * 0.3));
  const cornerOrder = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
  let view = { scale: 1, offsetX: 0, offsetY: 0, width: 1, height: 1 };
  let nudgeControls = null;
  let activeNudgeCorner = "topLeft";
  const runtimeGlobal = typeof window !== "undefined" ? window : globalThis;
  function emitChange() {
    if (typeof options.onChange === "function") {
      options.onChange(cloneCorners(corners));
    }
  }
  let lastDisplayWidth = 0;
  let lastDisplayHeight = 0;
  function computeDisplaySize() {
    const width = Math.max(1, Math.round(container.clientWidth));
    let height = Math.round(container.clientHeight);
    if (height < 80) {
      const aspect = imageHeight / Math.max(1, imageWidth);
      const viewportCap = (runtimeGlobal.innerHeight || 800) * 0.7;
      height = Math.max(240, Math.round(Math.min(width * aspect, viewportCap)));
      container.style.minHeight = height + "px";
      changedContainerMinHeight = true;
    }
    return { width, height: Math.max(1, height) };
  }
  function updateCanvasSize() {
    const { width, height } = computeDisplaySize();
    const dpr = runtimeGlobal.devicePixelRatio || 1;
    lastDisplayWidth = width;
    lastDisplayHeight = height;
    editorCanvas.style.width = width + "px";
    editorCanvas.style.height = height + "px";
    const bufferWidth = Math.round(width * dpr);
    const bufferHeight = Math.round(height * dpr);
    if (editorCanvas.width !== bufferWidth) editorCanvas.width = bufferWidth;
    if (editorCanvas.height !== bufferHeight) editorCanvas.height = bufferHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const padding = 12;
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight);
    const drawWidth = imageWidth * scale;
    const drawHeight = imageHeight * scale;
    view = {
      scale,
      offsetX: Math.round((width - drawWidth) / 2),
      offsetY: Math.round((height - drawHeight) / 2),
      width,
      height
    };
  }
  function imageToView(point) {
    return {
      x: view.offsetX + point.x * view.scale,
      y: view.offsetY + point.y * view.scale
    };
  }
  function viewToImage(x, y) {
    const px = (x - view.offsetX) / view.scale;
    const py = (y - view.offsetY) / view.scale;
    return {
      x: Math.max(0, Math.min(imageWidth, px)),
      y: Math.max(0, Math.min(imageHeight, py))
    };
  }
  function cornersValid(nextCorners) {
    return cornersAreFiniteAndDistinct$1(nextCorners) && isConvexQuadrilateral$1(nextCorners);
  }
  function getEventCanvasPoint(event) {
    const rect = editorCanvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  function hitTestCorner(canvasX, canvasY) {
    let hit = null;
    let bestDistance = Infinity;
    for (const key of cornerOrder) {
      const p = imageToView(corners[key]);
      const d = Math.hypot(canvasX - p.x, canvasY - p.y);
      if (d <= handleHitArea && d < bestDistance) {
        bestDistance = d;
        hit = key;
      }
    }
    return hit;
  }
  function drawPolygonOverlay() {
    const points = cornerOrder.map((key) => imageToView(corners[key]));
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.40)";
    ctx.beginPath();
    ctx.rect(0, 0, view.width, view.height);
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill("evenodd");
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    for (const key of cornerOrder) {
      const p = imageToView(corners[key]);
      const isActive = key === activeCornerKey;
      drawHandle(
        ctx,
        p,
        isActive ? handleRadius + 1 : handleRadius,
        isActive ? "#f59e0b" : "#ffffff",
        isActive ? "#7c2d12" : "#0f172a",
        2
      );
    }
  }
  function drawMagnifier() {
    if (!magnifier.enabled || !activeCornerKey || !lastPointerPosition) {
      return;
    }
    const active = corners[activeCornerKey];
    const size = magnifier.size;
    const radius = size / 2;
    const zoom = Math.max(1.1, magnifier.zoom);
    let lensX = lastPointerPosition.x + radius + magnifier.margin;
    let lensY = lastPointerPosition.y - radius - magnifier.margin;
    if (lensX + radius > view.width) {
      lensX = lastPointerPosition.x - radius - magnifier.margin;
    }
    if (lensY - radius < 0) {
      lensY = lastPointerPosition.y + radius + magnifier.margin;
    }
    lensX = Math.max(radius + 2, Math.min(view.width - radius - 2, lensX));
    lensY = Math.max(radius + 2, Math.min(view.height - radius - 2, lensY));
    const sampleSize = size / zoom;
    const sx = Math.max(0, Math.min(imageWidth - sampleSize, active.x - sampleSize / 2));
    const sy = Math.max(0, Math.min(imageHeight - sampleSize, active.y - sampleSize / 2));
    ctx.save();
    ctx.beginPath();
    ctx.arc(lensX, lensY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(sourceCanvas, sx, sy, sampleSize, sampleSize, lensX - radius, lensY - radius, size, size);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(lensX, lensY, radius, 0, Math.PI * 2);
    ctx.lineWidth = magnifier.borderWidth;
    ctx.strokeStyle = magnifier.borderColor;
    ctx.stroke();
    const ch = magnifier.crosshairSize / 2;
    ctx.strokeStyle = magnifier.crosshairColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lensX - ch, lensY);
    ctx.lineTo(lensX + ch, lensY);
    ctx.moveTo(lensX, lensY - ch);
    ctx.lineTo(lensX, lensY + ch);
    ctx.stroke();
    ctx.restore();
  }
  function render() {
    if (isDestroyed) return;
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      imageWidth,
      imageHeight,
      view.offsetX,
      view.offsetY,
      imageWidth * view.scale,
      imageHeight * view.scale
    );
    drawPolygonOverlay();
    drawMagnifier();
  }
  const raf = typeof runtimeGlobal.requestAnimationFrame === "function" ? runtimeGlobal.requestAnimationFrame.bind(runtimeGlobal) : null;
  const caf = typeof runtimeGlobal.cancelAnimationFrame === "function" ? runtimeGlobal.cancelAnimationFrame.bind(runtimeGlobal) : null;
  let rafId = null;
  function scheduleRender() {
    if (isDestroyed) return;
    if (!raf) {
      render();
      return;
    }
    if (rafId !== null) return;
    rafId = raf(() => {
      rafId = null;
      render();
    });
  }
  function setCorner(nextCornerKey, nextPoint) {
    const candidate = cloneCorners(corners);
    candidate[nextCornerKey] = {
      x: Math.max(0, Math.min(imageWidth, nextPoint.x)),
      y: Math.max(0, Math.min(imageHeight, nextPoint.y))
    };
    if (!cornersValid(candidate)) {
      return false;
    }
    corners = candidate;
    activeNudgeCorner = nextCornerKey;
    emitChange();
    scheduleRender();
    return true;
  }
  function buildNudgeControls() {
    if (!nudges.enabled) {
      return;
    }
    nudgeControls = document.createElement("div");
    nudgeControls.style.position = "absolute";
    nudgeControls.style.right = "8px";
    nudgeControls.style.bottom = "8px";
    nudgeControls.style.background = "rgba(15, 23, 42, 0.9)";
    nudgeControls.style.border = "1px solid rgba(148, 163, 184, 0.5)";
    nudgeControls.style.borderRadius = "10px";
    nudgeControls.style.padding = "8px";
    nudgeControls.style.display = "grid";
    nudgeControls.style.gridTemplateColumns = "repeat(4, auto)";
    nudgeControls.style.gap = "6px";
    nudgeControls.style.zIndex = "2";
    const makeButton = (glyph, ariaLabel, dx, dy, step) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = glyph + (step > 1 ? " " + step : "");
      btn.setAttribute("aria-label", ariaLabel);
      btn.style.border = "1px solid #475569";
      btn.style.background = "#0f172a";
      btn.style.color = "#e2e8f0";
      btn.style.borderRadius = "6px";
      btn.style.padding = "4px 8px";
      btn.style.fontSize = "13px";
      btn.style.lineHeight = "1";
      btn.style.cursor = "pointer";
      btn.addEventListener("click", () => {
        const current = corners[activeNudgeCorner];
        setCorner(activeNudgeCorner, {
          x: current.x + dx * step,
          y: current.y + dy * step
        });
      });
      return btn;
    };
    for (const step of nudges.steps) {
      nudgeControls.appendChild(makeButton("←", `Move left ${step}px`, -1, 0, step));
      nudgeControls.appendChild(makeButton("→", `Move right ${step}px`, 1, 0, step));
      nudgeControls.appendChild(makeButton("↑", `Move up ${step}px`, 0, -1, step));
      nudgeControls.appendChild(makeButton("↓", `Move down ${step}px`, 0, 1, step));
    }
    container.appendChild(nudgeControls);
  }
  function handlePointerDown(event) {
    if (isDestroyed) return;
    const point = getEventCanvasPoint(event);
    const hitCorner = hitTestCorner(point.x, point.y);
    if (!hitCorner) return;
    if (typeof event.preventDefault === "function") {
      event.preventDefault();
    }
    activeCornerKey = hitCorner;
    activeNudgeCorner = hitCorner;
    dragPointerId = event.pointerId;
    lastPointerPosition = point;
    editorCanvas.style.cursor = "grabbing";
    if (keyboardEnabled && typeof editorCanvas.focus === "function") {
      try {
        editorCanvas.focus({ preventScroll: true });
      } catch (_) {
        editorCanvas.focus();
      }
    }
    if (editorCanvas.setPointerCapture && dragPointerId !== void 0) {
      editorCanvas.setPointerCapture(dragPointerId);
    }
    scheduleRender();
  }
  function handlePointerMove(event) {
    if (isDestroyed) return;
    const point = getEventCanvasPoint(event);
    if (!activeCornerKey) {
      editorCanvas.style.cursor = hitTestCorner(point.x, point.y) ? "grab" : "crosshair";
      return;
    }
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;
    lastPointerPosition = point;
    const imagePoint = viewToImage(point.x, point.y);
    setCorner(activeCornerKey, imagePoint);
  }
  function handlePointerUp(event) {
    if (!activeCornerKey) return;
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;
    if (editorCanvas.releasePointerCapture && dragPointerId !== null && dragPointerId !== void 0) {
      try {
        editorCanvas.releasePointerCapture(dragPointerId);
      } catch (_) {
      }
    }
    activeCornerKey = null;
    dragPointerId = null;
    lastPointerPosition = null;
    editorCanvas.style.cursor = "crosshair";
    scheduleRender();
  }
  function handleKeyDown(event) {
    if (isDestroyed || !keyboardEnabled) return;
    if (event.key === "Enter") {
      event.preventDefault();
      confirmEditor();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditor();
      return;
    }
    let dx = 0;
    let dy = 0;
    if (event.key === "ArrowLeft") dx = -1;
    else if (event.key === "ArrowRight") dx = 1;
    else if (event.key === "ArrowUp") dy = -1;
    else if (event.key === "ArrowDown") dy = 1;
    else return;
    event.preventDefault();
    const step = event.shiftKey ? nudges.steps[nudges.steps.length - 1] || 10 : 1;
    const current = corners[activeNudgeCorner];
    setCorner(activeNudgeCorner, {
      x: current.x + dx * step,
      y: current.y + dy * step
    });
  }
  function handleMouseDown(event) {
    handlePointerDown({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: 1
    });
  }
  function handleMouseMove(event) {
    handlePointerMove({
      clientX: event.clientX,
      clientY: event.clientY,
      pointerId: 1
    });
  }
  function handleTouchStart(event) {
    const touch = event.touches[0];
    if (!touch) return;
    const point = getEventCanvasPoint(touch);
    if (hitTestCorner(point.x, point.y)) {
      event.preventDefault();
    }
    handlePointerDown({
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: 2
    });
  }
  function handleTouchMove(event) {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    handlePointerMove({
      clientX: touch.clientX,
      clientY: touch.clientY,
      pointerId: 2
    });
  }
  function attachEvents() {
    if (typeof runtimeGlobal.PointerEvent !== "undefined") {
      editorCanvas.addEventListener("pointerdown", handlePointerDown);
      editorCanvas.addEventListener("pointermove", handlePointerMove);
      editorCanvas.addEventListener("pointerup", handlePointerUp);
      editorCanvas.addEventListener("pointercancel", handlePointerUp);
    } else {
      editorCanvas.addEventListener("mousedown", handleMouseDown);
      if (typeof runtimeGlobal.addEventListener === "function") {
        runtimeGlobal.addEventListener("mousemove", handleMouseMove);
        runtimeGlobal.addEventListener("mouseup", handlePointerUp);
      }
      editorCanvas.addEventListener("touchstart", handleTouchStart, { passive: false });
      editorCanvas.addEventListener("touchmove", handleTouchMove, { passive: false });
      editorCanvas.addEventListener("touchend", handlePointerUp);
      editorCanvas.addEventListener("touchcancel", handlePointerUp);
    }
    if (keyboardEnabled) {
      editorCanvas.addEventListener("keydown", handleKeyDown);
    }
  }
  function detachEvents() {
    editorCanvas.removeEventListener("pointerdown", handlePointerDown);
    editorCanvas.removeEventListener("pointermove", handlePointerMove);
    editorCanvas.removeEventListener("pointerup", handlePointerUp);
    editorCanvas.removeEventListener("pointercancel", handlePointerUp);
    editorCanvas.removeEventListener("mousedown", handleMouseDown);
    if (typeof runtimeGlobal.removeEventListener === "function") {
      runtimeGlobal.removeEventListener("mousemove", handleMouseMove);
      runtimeGlobal.removeEventListener("mouseup", handlePointerUp);
    }
    editorCanvas.removeEventListener("touchstart", handleTouchStart);
    editorCanvas.removeEventListener("touchmove", handleTouchMove);
    editorCanvas.removeEventListener("touchend", handlePointerUp);
    editorCanvas.removeEventListener("touchcancel", handlePointerUp);
    editorCanvas.removeEventListener("keydown", handleKeyDown);
  }
  let dprCleanup = null;
  function watchDevicePixelRatio() {
    if (typeof runtimeGlobal.matchMedia !== "function") return;
    if (dprCleanup) dprCleanup();
    const dpr = runtimeGlobal.devicePixelRatio || 1;
    const mq = runtimeGlobal.matchMedia(`(resolution: ${dpr}dppx)`);
    const onChange = () => {
      if (isDestroyed) return;
      updateCanvasSize();
      scheduleRender();
      watchDevicePixelRatio();
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      dprCleanup = () => mq.removeEventListener("change", onChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(onChange);
      dprCleanup = () => mq.removeListener(onChange);
    } else {
      dprCleanup = null;
    }
  }
  function confirmEditor() {
    const output = cloneCorners(corners);
    if (typeof options.onConfirm === "function") {
      options.onConfirm(output);
    }
    return output;
  }
  function cancelEditor() {
    if (typeof options.onCancel === "function") {
      options.onCancel();
    }
  }
  const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => {
    if (isDestroyed) return;
    const next = computeDisplaySize();
    if (next.width === lastDisplayWidth && next.height === lastDisplayHeight) {
      return;
    }
    updateCanvasSize();
    scheduleRender();
  }) : null;
  updateCanvasSize();
  buildNudgeControls();
  attachEvents();
  watchDevicePixelRatio();
  if (resizeObserver) {
    resizeObserver.observe(container);
  }
  render();
  return {
    getCorners() {
      return cloneCorners(corners);
    },
    setCorners(nextCorners) {
      if (!nextCorners || !cornersValid(nextCorners)) {
        return false;
      }
      corners = cloneCorners(nextCorners);
      emitChange();
      scheduleRender();
      return true;
    },
    reset() {
      corners = cloneCorners(initialCorners);
      emitChange();
      scheduleRender();
    },
    nudge(cornerKey, dx, dy, step = 1) {
      if (!cornerOrder.includes(cornerKey)) {
        return false;
      }
      return setCorner(cornerKey, {
        x: corners[cornerKey].x + dx * step,
        y: corners[cornerKey].y + dy * step
      });
    },
    confirm() {
      return confirmEditor();
    },
    cancel() {
      cancelEditor();
    },
    destroy() {
      if (isDestroyed) return;
      isDestroyed = true;
      if (rafId !== null && caf) {
        caf(rafId);
        rafId = null;
      }
      if (dprCleanup) {
        dprCleanup();
        dprCleanup = null;
      }
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      detachEvents();
      if (nudgeControls && nudgeControls.parentNode) {
        nudgeControls.parentNode.removeChild(nudgeControls);
      }
      if (editorCanvas.parentNode) {
        editorCanvas.parentNode.removeChild(editorCanvas);
      }
      if (changedContainerPosition) {
        container.style.position = restoreContainerStyle.position;
      }
      if (changedContainerMinHeight) {
        container.style.minHeight = restoreContainerStyle.minHeight;
      }
    }
  };
}
async function initialize() {
  try {
    return await initializeWasm();
  } catch {
    return null;
  }
}
class Scanner {
  constructor(options = {}) {
    this.defaultOptions = {
      maxProcessingDimension: 800,
      mode: "detect",
      output: "canvas",
      ...options
    };
    this.initialized = false;
  }
  /**
   * Warm up the scanner (load WASM, etc.)
   */
  async initialize() {
    if (this.initialized) return;
    try {
      await initializeWasm();
    } catch {
    }
    this.initialized = true;
  }
  /**
   * Scan an image for a document.
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image 
   * @param {Object} options Override default options
   */
  async scan(image, options = {}) {
    if (!this.initialized) await this.initialize();
    const combinedOptions = { ...this.defaultOptions, ...options };
    return await scanDocument(image, combinedOptions);
  }
  /**
   * Extract a document from an image using manual corners.
   * @param {HTMLImageElement|HTMLCanvasElement|ImageData} image 
   * @param {Object} corners 
   * @param {Object} options 
   */
  async extract(image, corners, options = {}) {
    if (!this.initialized) await this.initialize();
    const combinedOptions = { ...this.defaultOptions, ...options };
    return await extractDocument(image, corners, combinedOptions);
  }
}
async function prepareScaleAndGrayscale(image, maxDimension = 800) {
  let originalWidth, originalHeight;
  const isImageData = image && typeof image.width === "number" && typeof image.height === "number" && image.data;
  if (isImageData) {
    originalWidth = image.width;
    originalHeight = image.height;
  } else if (image) {
    originalWidth = image.width || image.naturalWidth;
    originalHeight = image.height || image.naturalHeight;
  } else {
    throw new Error("No image provided");
  }
  const maxCurrentDimension = Math.max(originalWidth, originalHeight);
  let targetWidth, targetHeight, scaleFactor;
  if (maxCurrentDimension <= maxDimension) {
    targetWidth = originalWidth;
    targetHeight = originalHeight;
    scaleFactor = 1;
  } else {
    const scale = maxDimension / maxCurrentDimension;
    targetWidth = Math.round(originalWidth * scale);
    targetHeight = Math.round(originalHeight * scale);
    scaleFactor = 1 / scale;
  }
  const useOffscreen = typeof OffscreenCanvas !== "undefined";
  const canvas = useOffscreen ? new OffscreenCanvas(targetWidth, targetHeight) : document.createElement("canvas");
  if (!useOffscreen) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";
  if (isImageData) {
    const tempCanvas = useOffscreen ? new OffscreenCanvas(originalWidth, originalHeight) : document.createElement("canvas");
    if (!useOffscreen) {
      tempCanvas.width = originalWidth;
      tempCanvas.height = originalHeight;
    }
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.putImageData(image, 0, 0);
    ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
  } else {
    ctx.drawImage(image, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
  }
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;
  const pixelCount = targetWidth * targetHeight;
  const grayscaleData = new Uint8ClampedArray(pixelCount);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const gray = data[i] * 54 + data[i + 1] * 183 + data[i + 2] * 19 >> 8;
    grayscaleData[j] = gray;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  return {
    grayscaleData,
    imageData,
    // Keep full RGBA for debug visualization
    scaleFactor,
    originalDimensions: { width: originalWidth, height: originalHeight },
    scaledDimensions: { width: targetWidth, height: targetHeight }
  };
}
function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}
function pointDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function polygonAreaFromCorners(corners) {
  if (!corners) return 0;
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y - points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}
function sideLengthsFromCorners(corners) {
  return [
    pointDistance(corners.topLeft, corners.topRight),
    pointDistance(corners.topRight, corners.bottomRight),
    pointDistance(corners.bottomRight, corners.bottomLeft),
    pointDistance(corners.bottomLeft, corners.topLeft)
  ];
}
function cornerAnglesDegrees(corners) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
  const angles = [];
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i + points.length - 1) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const dot = v1x * v2x + v1y * v2y;
    const mag1 = Math.hypot(v1x, v1y);
    const mag2 = Math.hypot(v2x, v2y);
    const denom = Math.max(1e-6, mag1 * mag2);
    const cosTheta = Math.max(-1, Math.min(1, dot / denom));
    angles.push(Math.acos(cosTheta) * 180 / Math.PI);
  }
  return angles;
}
function computeRightAngleScore(corners) {
  const angles = cornerAnglesDegrees(corners);
  let total = 0;
  for (const angle of angles) {
    const deviation = Math.abs(angle - 90);
    total += clamp01(1 - deviation / 55);
  }
  return total / Math.max(1, angles.length);
}
function computeOppositeSideConsistency(corners) {
  const sides = sideLengthsFromCorners(corners);
  const widthConsistency = Math.min(sides[0], sides[2]) / Math.max(1e-6, Math.max(sides[0], sides[2]));
  const heightConsistency = Math.min(sides[1], sides[3]) / Math.max(1e-6, Math.max(sides[1], sides[3]));
  return (widthConsistency + heightConsistency) / 2;
}
function compareCandidates(a, b) {
  const validDelta = Number(b.isValid) - Number(a.isValid);
  if (validDelta !== 0) return validDelta;
  const confidenceDelta = b.confidence - a.confidence;
  const nearTie = Math.abs(confidenceDelta) < 0.015;
  if (!nearTie && confidenceDelta !== 0) return confidenceDelta;
  const complexityA = Math.abs((a.approxCount ?? 99) - 4);
  const complexityB = Math.abs((b.approxCount ?? 99) - 4);
  const complexityDelta = complexityA - complexityB;
  if (complexityDelta !== 0) return complexityDelta;
  const angleDelta = (b.rightAngleScore ?? 0) - (a.rightAngleScore ?? 0);
  if (Math.abs(angleDelta) > 1e-6) return angleDelta;
  const fitErrorA = Math.abs(1 - (a.contourFitRatio ?? 1));
  const fitErrorB = Math.abs(1 - (b.contourFitRatio ?? 1));
  const fitDelta = fitErrorA - fitErrorB;
  if (Math.abs(fitDelta) > 1e-6) return fitDelta;
  return confidenceDelta || b.score - a.score || b.coverageRatio - a.coverageRatio || b.area - a.area;
}
function cornersAreFiniteAndDistinct(corners, minDistance = 6) {
  const points = [corners == null ? void 0 : corners.topLeft, corners == null ? void 0 : corners.topRight, corners == null ? void 0 : corners.bottomRight, corners == null ? void 0 : corners.bottomLeft];
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
function isConvexQuadrilateral(corners) {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft];
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
function computeEdgeSupportScore(contour, edges, width, height) {
  if (!(contour == null ? void 0 : contour.points) || contour.points.length === 0) {
    return 0;
  }
  const sampleStep = Math.max(1, Math.floor(contour.points.length / 240));
  let samples = 0;
  let supported = 0;
  for (let i = 0; i < contour.points.length; i += sampleStep) {
    const p = contour.points[i];
    const x = Math.max(0, Math.min(width - 1, p.x | 0));
    const y = Math.max(0, Math.min(height - 1, p.y | 0));
    samples++;
    let localHit = false;
    for (let oy = -1; oy <= 1 && !localHit; oy++) {
      const ny = y + oy;
      if (ny < 0 || ny >= height) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox;
        if (nx < 0 || nx >= width) continue;
        if (edges[ny * width + nx] > 0) {
          localHit = true;
          break;
        }
      }
    }
    if (localHit) supported++;
  }
  if (samples === 0) return 0;
  return supported / samples;
}
function evaluateContourCandidate(contour, edges, width, height, options = {}) {
  const epsilon = options.epsilon || 0.02;
  const approx = approximatePolygon(contour.points, epsilon);
  const approxCount = approx.length;
  const corners = findCornerPoints(contour, { epsilon });
  if (!corners) {
    return {
      contour,
      corners: null,
      score: 0,
      confidence: 0,
      isValid: false,
      area: contour.area || 0,
      fillRatio: 0,
      coverageRatio: 0,
      cornersArea: 0,
      approxCount,
      convex: false,
      edgeSupport: 0,
      aspectRatio: Infinity,
      minSide: 0,
      rightAngleScore: 0,
      oppositeSideConsistency: 0,
      contourFitRatio: 0,
      contourFitScore: 0
    };
  }
  const imageArea = width * height;
  const area = contour.area || 0;
  const box = contour.boundingBox || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const boxArea = Math.max(1, (box.maxX - box.minX + 1) * (box.maxY - box.minY + 1));
  const fillRatio = area / boxArea;
  const cornersArea = polygonAreaFromCorners(corners);
  const coverageRatio = cornersArea / Math.max(1, imageArea);
  const sides = sideLengthsFromCorners(corners);
  const minSide = Math.min(...sides);
  const avgWidth = (sides[0] + sides[2]) / 2;
  const avgHeight = (sides[1] + sides[3]) / 2;
  const aspectRatio = avgWidth > avgHeight ? avgWidth / Math.max(1e-6, avgHeight) : avgHeight / Math.max(1e-6, avgWidth);
  const convex = isConvexQuadrilateral(corners);
  const edgeSupport = computeEdgeSupportScore(contour, edges, width, height);
  const rightAngleScore = computeRightAngleScore(corners);
  const oppositeSideConsistency = computeOppositeSideConsistency(corners);
  const contourFitRatio = area / Math.max(1, cornersArea);
  const contourFitScore = clamp01(1 - Math.abs(contourFitRatio - 1) / 0.55);
  const quadLikeness = approxCount === 4 ? 1 : approxCount === 5 ? 0.9 : approxCount === 6 ? 0.7 : approxCount <= 8 ? 0.5 : 0.28;
  const areaScore = clamp01(area / Math.max(1, imageArea * 0.4));
  const fillScore = clamp01((fillRatio - 0.08) / 0.72);
  const coverageScore = clamp01((coverageRatio - 0.03) / 0.82);
  const minSideRatio = options.minDocumentSideRatio !== void 0 ? options.minDocumentSideRatio : 0.06;
  const minCoverage = options.minDocumentCoverageRatio !== void 0 ? options.minDocumentCoverageRatio : 0.04;
  const maxAspect = options.maxDocumentAspectRatio !== void 0 ? options.maxDocumentAspectRatio : 8;
  const minFillRatio = options.minDocumentFillRatio !== void 0 ? options.minDocumentFillRatio : 0.07;
  const minContourFitRatio = options.minContourFitRatio !== void 0 ? options.minContourFitRatio : 0.11;
  const maxContourFitRatio = options.maxContourFitRatio !== void 0 ? options.maxContourFitRatio : 1.2;
  const minRightAngleScore = options.minRightAngleScore !== void 0 ? options.minRightAngleScore : 0.42;
  const minOppositeSideConsistency = options.minOppositeSideConsistency !== void 0 ? options.minOppositeSideConsistency : 0.3;
  const minSidePx = Math.min(width, height) * minSideRatio;
  const geometryValid = cornersAreFiniteAndDistinct(corners) && convex && minSide >= minSidePx && coverageRatio >= minCoverage && aspectRatio <= maxAspect && fillRatio >= minFillRatio && contourFitRatio >= minContourFitRatio && contourFitRatio <= maxContourFitRatio && rightAngleScore >= minRightAngleScore && oppositeSideConsistency >= minOppositeSideConsistency;
  const score = areaScore * 0.22 + fillScore * 0.14 + quadLikeness * 0.15 + (convex ? 1 : 0) * 0.08 + edgeSupport * 0.08 + coverageScore * 0.13 + rightAngleScore * 0.1 + oppositeSideConsistency * 0.05 + contourFitScore * 0.05;
  const confidence = geometryValid ? score : score * 0.33;
  return {
    contour,
    corners,
    score,
    confidence,
    isValid: geometryValid,
    area,
    fillRatio,
    coverageRatio,
    cornersArea,
    approxCount,
    convex,
    edgeSupport,
    aspectRatio,
    minSide,
    rightAngleScore,
    oppositeSideConsistency,
    contourFitRatio,
    contourFitScore
  };
}
function selectBestContourCandidate(contours, edges, width, height, options = {}) {
  const maxCandidateContours = options.maxCandidateContours || 12;
  const candidates = contours.slice(0, maxCandidateContours).map((contour, index) => ({
    rankByArea: index,
    ...evaluateContourCandidate(contour, edges, width, height, options)
  })).sort(compareCandidates);
  return {
    best: candidates[0] || null,
    candidates
  };
}
function shouldRunDetectionCascade(bestCandidate, options = {}) {
  if (options.enableDetectionCascade === false) return false;
  if (!bestCandidate || !bestCandidate.corners) return true;
  const minConfidenceForSinglePass = options.minCascadeTriggerConfidence !== void 0 ? options.minCascadeTriggerConfidence : 0.68;
  if (!bestCandidate.isValid) return true;
  if (bestCandidate.confidence < minConfidenceForSinglePass) return true;
  if (bestCandidate.approxCount > 5) return true;
  if (bestCandidate.rightAngleScore < 0.55) return true;
  if (bestCandidate.contourFitRatio < 0.14) return true;
  return false;
}
function buildDetectionPassProfiles(options = {}) {
  const baseKernel = options.dilationKernelSize || 3;
  const baseIterations = options.dilationIterations || 1;
  const baseApplyDilation = options.applyDilation !== void 0 ? options.applyDilation : true;
  const profiles = [
    {
      name: "default",
      lowThreshold: options.lowThreshold,
      highThreshold: options.highThreshold,
      dilationKernelSize: baseKernel,
      dilationIterations: baseIterations,
      applyDilation: baseApplyDilation
    }
  ];
  if (options.enableDetectionCascade === false) {
    return profiles;
  }
  profiles.push({
    name: "connect-edges",
    lowThreshold: options.lowThreshold,
    highThreshold: options.highThreshold,
    dilationKernelSize: Math.max(baseKernel, 5),
    dilationIterations: Math.max(baseIterations, 2),
    applyDilation: true
  });
  profiles.push({
    name: "no-dilation",
    lowThreshold: options.lowThreshold,
    highThreshold: options.highThreshold,
    dilationKernelSize: baseKernel,
    dilationIterations: baseIterations,
    applyDilation: false
  });
  if (options.lowThreshold === void 0 && options.highThreshold === void 0) {
    profiles.push({
      name: "fixed-mid-thresholds",
      lowThreshold: 60,
      highThreshold: 180,
      dilationKernelSize: baseKernel,
      dilationIterations: baseIterations,
      applyDilation: baseApplyDilation
    });
  }
  const deduped = [];
  const seen = /* @__PURE__ */ new Set();
  for (const profile of profiles) {
    const key = [
      profile.lowThreshold,
      profile.highThreshold,
      profile.dilationKernelSize,
      profile.dilationIterations,
      profile.applyDilation
    ].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(profile);
  }
  return deduped;
}
async function detectDocumentInternal(grayscaleData, width, height, scaleFactor, options = {}) {
  const debugInfo = options.debug ? {} : { _timingsOnly: true };
  const timings = [];
  if (debugInfo && !debugInfo._timingsOnly) {
    debugInfo.preprocessing = {
      scaledDimensions: { width, height },
      scaleFactor,
      maxProcessingDimension: options.maxProcessingDimension || 800
    };
  }
  const passProfiles = buildDetectionPassProfiles(options);
  const passResults = [];
  const runDetectionPass = async (profile, passIndex) => {
    const passLabel = profile.name || `pass-${passIndex + 1}`;
    const passSuffix = passIndex === 0 ? "" : ` (${passLabel})`;
    const passDebug = options.debug ? {} : { _timingsOnly: true };
    const edges = await cannyEdgeDetector(grayscaleData, {
      width,
      height,
      lowThreshold: profile.lowThreshold,
      highThreshold: profile.highThreshold,
      dilationKernelSize: profile.dilationKernelSize,
      dilationIterations: profile.dilationIterations,
      applyDilation: profile.applyDilation,
      debug: passDebug,
      skipGrayscale: true,
      useWasmBlur: true,
      useWasmHysteresis: options.useWasmHysteresis,
      useWasmFullCanny: options.useWasmFullCanny
    });
    if (passDebug.timings) {
      passDebug.timings.forEach((timing) => {
        if (timing.step === "Edge Detection Total") return;
        timings.push({ step: `${timing.step}${passSuffix}`, ms: timing.ms });
      });
    }
    let t0 = performance.now();
    const contours = detectDocumentContour(edges, {
      minArea: (options.minArea || 1e3) / (scaleFactor * scaleFactor),
      width,
      height
    });
    timings.push({ step: `Find Contours${passSuffix}`, ms: (performance.now() - t0).toFixed(2) });
    t0 = performance.now();
    const { best: best2, candidates: candidates2 } = selectBestContourCandidate(contours, edges, width, height, options);
    timings.push({ step: `Corner Detection${passSuffix}`, ms: (performance.now() - t0).toFixed(2) });
    return {
      name: passLabel,
      params: {
        lowThreshold: profile.lowThreshold,
        highThreshold: profile.highThreshold,
        dilationKernelSize: profile.dilationKernelSize,
        dilationIterations: profile.dilationIterations,
        applyDilation: profile.applyDilation
      },
      contours,
      best: best2,
      candidates: candidates2
    };
  };
  const primaryPass = await runDetectionPass(passProfiles[0], 0);
  passResults.push(primaryPass);
  if (shouldRunDetectionCascade(primaryPass.best, options)) {
    for (let i = 1; i < passProfiles.length; i++) {
      passResults.push(await runDetectionPass(passProfiles[i], i));
    }
  }
  const allCandidates = [];
  for (const pass of passResults) {
    for (const candidate of pass.candidates) {
      allCandidates.push({
        ...candidate,
        passName: pass.name,
        passParams: pass.params
      });
    }
  }
  allCandidates.sort(compareCandidates);
  const best = allCandidates[0] || null;
  const candidates = allCandidates;
  if (!best || !best.corners) {
    console.log("No document detected");
    return {
      success: false,
      message: "No document detected",
      debug: debugInfo._timingsOnly ? null : debugInfo,
      timings
    };
  }
  if (debugInfo && !debugInfo._timingsOnly) {
    debugInfo.passes = passResults.map((pass) => ({
      name: pass.name,
      params: pass.params,
      contourCount: pass.contours.length,
      bestCandidate: pass.best ? {
        score: pass.best.score,
        confidence: pass.best.confidence,
        isValid: pass.best.isValid,
        approxCount: pass.best.approxCount,
        coverageRatio: pass.best.coverageRatio,
        fillRatio: pass.best.fillRatio,
        rightAngleScore: pass.best.rightAngleScore,
        contourFitRatio: pass.best.contourFitRatio
      } : null
    }));
    debugInfo.candidates = candidates.map((candidate) => ({
      passName: candidate.passName,
      rankByArea: candidate.rankByArea,
      area: candidate.area,
      fillRatio: candidate.fillRatio,
      coverageRatio: candidate.coverageRatio,
      cornersArea: candidate.cornersArea,
      approxCount: candidate.approxCount,
      convex: candidate.convex,
      edgeSupport: candidate.edgeSupport,
      aspectRatio: candidate.aspectRatio,
      minSide: candidate.minSide,
      rightAngleScore: candidate.rightAngleScore,
      oppositeSideConsistency: candidate.oppositeSideConsistency,
      contourFitRatio: candidate.contourFitRatio,
      contourFitScore: candidate.contourFitScore,
      score: candidate.score,
      confidence: candidate.confidence,
      isValid: candidate.isValid
    }));
    debugInfo.selectedCandidate = candidates[0] ? {
      passName: candidates[0].passName,
      rankByArea: candidates[0].rankByArea,
      area: candidates[0].area,
      fillRatio: candidates[0].fillRatio,
      coverageRatio: candidates[0].coverageRatio,
      approxCount: candidates[0].approxCount,
      edgeSupport: candidates[0].edgeSupport,
      aspectRatio: candidates[0].aspectRatio,
      minSide: candidates[0].minSide,
      rightAngleScore: candidates[0].rightAngleScore,
      oppositeSideConsistency: candidates[0].oppositeSideConsistency,
      contourFitRatio: candidates[0].contourFitRatio,
      score: candidates[0].score,
      confidence: candidates[0].confidence,
      isValid: candidates[0].isValid
    } : null;
  }
  const cornerPoints = best.corners;
  const documentContour = best.contour;
  let finalCorners = cornerPoints;
  if (scaleFactor !== 1) {
    finalCorners = {
      topLeft: { x: cornerPoints.topLeft.x * scaleFactor, y: cornerPoints.topLeft.y * scaleFactor },
      topRight: { x: cornerPoints.topRight.x * scaleFactor, y: cornerPoints.topRight.y * scaleFactor },
      bottomRight: { x: cornerPoints.bottomRight.x * scaleFactor, y: cornerPoints.bottomRight.y * scaleFactor },
      bottomLeft: { x: cornerPoints.bottomLeft.x * scaleFactor, y: cornerPoints.bottomLeft.y * scaleFactor }
    };
  }
  return {
    success: true,
    contour: documentContour,
    corners: finalCorners,
    confidence: best.confidence,
    debug: debugInfo._timingsOnly ? null : debugInfo,
    timings
  };
}
function getPerspectiveTransform(srcPoints, dstPoints) {
  function buildMatrix(points) {
    const matrix2 = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = points[i];
      matrix2.push([x, y, 1, 0, 0, 0, -x * dstPoints[i][0], -y * dstPoints[i][0]]);
      matrix2.push([0, 0, 0, x, y, 1, -x * dstPoints[i][1], -y * dstPoints[i][1]]);
    }
    return matrix2;
  }
  const A = buildMatrix(srcPoints);
  const b = [
    dstPoints[0][0],
    dstPoints[0][1],
    dstPoints[1][0],
    dstPoints[1][1],
    dstPoints[2][0],
    dstPoints[2][1],
    dstPoints[3][0],
    dstPoints[3][1]
  ];
  function solve(A2, b2) {
    const m = A2.length;
    const n = A2[0].length;
    const M = A2.map((row) => row.slice());
    const B = b2.slice();
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < m; k++) {
        if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) maxRow = k;
      }
      [M[i], M[maxRow]] = [M[maxRow], M[i]];
      [B[i], B[maxRow]] = [B[maxRow], B[i]];
      for (let k = i + 1; k < m; k++) {
        const c = M[k][i] / M[i][i];
        for (let j = i; j < n; j++) {
          M[k][j] -= c * M[i][j];
        }
        B[k] -= c * B[i];
      }
    }
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
  const matrix = [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1]
  ];
  return matrix;
}
function unwarpImage(ctx, image, corners) {
  const { topLeft, topRight, bottomRight, bottomLeft } = corners;
  const widthA = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const widthB = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const maxWidth = Math.round(Math.max(widthA, widthB));
  const heightA = Math.hypot(topRight.x - bottomRight.x, topRight.y - bottomRight.y);
  const heightB = Math.hypot(topLeft.x - bottomLeft.x, topLeft.y - bottomLeft.y);
  const maxHeight = Math.round(Math.max(heightA, heightB));
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
  if (det === 0) throw new Error("Singular matrix");
  return [
    [A / det, D / det, G / det],
    [B / det, E / det, H / det],
    [C / det, F / det, I / det]
  ];
}
function warpTransform(ctx, image, matrix, outWidth, outHeight) {
  const isImageData = image && typeof image.width === "number" && typeof image.height === "number" && image.data;
  const srcWidth = image.width || image.naturalWidth;
  const srcHeight = image.height || image.naturalHeight;
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (isImageData) {
    srcCtx.putImageData(image, 0, 0);
  } else {
    srcCtx.drawImage(image, 0, 0, srcWidth, srcHeight);
  }
  const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight).data;
  const inv = invert3x3(matrix);
  const i00 = inv[0][0], i01 = inv[0][1], i02 = inv[0][2];
  const i10 = inv[1][0], i11 = inv[1][1], i12 = inv[1][2];
  const i20 = inv[2][0], i21 = inv[2][1], i22 = inv[2][2];
  const outData = ctx.createImageData(outWidth, outHeight);
  const dst = outData.data;
  const maxSrcX = srcWidth - 1;
  const maxSrcY = srcHeight - 1;
  for (let oy = 0; oy < outHeight; oy++) {
    const iy1 = i01 * oy + i02;
    const iy2 = i11 * oy + i12;
    const iy3 = i21 * oy + i22;
    for (let ox = 0; ox < outWidth; ox++) {
      const w = i20 * ox + iy3;
      const invW = 1 / w;
      const sx = (i00 * ox + iy1) * invW;
      const sy = (i10 * ox + iy2) * invW;
      const csx = sx < 0 ? 0 : sx > maxSrcX ? maxSrcX : sx;
      const csy = sy < 0 ? 0 : sy > maxSrcY ? maxSrcY : sy;
      const x0 = csx | 0;
      const y0 = csy | 0;
      const x1 = x0 < maxSrcX ? x0 + 1 : x0;
      const y1 = y0 < maxSrcY ? y0 + 1 : y0;
      const fx = csx - x0;
      const fy = csy - y0;
      const fx1 = 1 - fx;
      const fy1 = 1 - fy;
      const w00 = fx1 * fy1;
      const w10 = fx * fy1;
      const w01 = fx1 * fy;
      const w11 = fx * fy;
      const idx00 = y0 * srcWidth + x0 << 2;
      const idx10 = y0 * srcWidth + x1 << 2;
      const idx01 = y1 * srcWidth + x0 << 2;
      const idx11 = y1 * srcWidth + x1 << 2;
      const di = oy * outWidth + ox << 2;
      dst[di] = srcData[idx00] * w00 + srcData[idx10] * w10 + srcData[idx01] * w01 + srcData[idx11] * w11 + 0.5 | 0;
      dst[di + 1] = srcData[idx00 + 1] * w00 + srcData[idx10 + 1] * w10 + srcData[idx01 + 1] * w01 + srcData[idx11 + 1] * w11 + 0.5 | 0;
      dst[di + 2] = srcData[idx00 + 2] * w00 + srcData[idx10 + 2] * w10 + srcData[idx01 + 2] * w01 + srcData[idx11 + 2] * w11 + 0.5 | 0;
      dst[di + 3] = 255;
    }
  }
  ctx.putImageData(outData, 0, 0);
}
async function extractDocument(image, corners, options = {}) {
  const outputType = options.output || "canvas";
  if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
    return {
      output: null,
      corners: null,
      success: false,
      message: "Invalid corner points provided"
    };
  }
  try {
    const resultCanvas = document.createElement("canvas");
    const ctx = resultCanvas.getContext("2d");
    unwarpImage(ctx, image, corners);
    let output;
    if (outputType === "canvas") {
      output = resultCanvas;
    } else if (outputType === "imagedata") {
      output = resultCanvas.getContext("2d").getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    } else if (outputType === "dataurl") {
      output = resultCanvas.toDataURL();
    } else {
      output = resultCanvas;
    }
    return {
      output,
      corners,
      success: true,
      message: "Document extracted successfully"
    };
  } catch (error) {
    return {
      output: null,
      corners,
      success: false,
      message: `Extraction failed: ${error.message}`
    };
  }
}
async function scanDocument(image, options = {}) {
  const timings = [];
  const totalStart = performance.now();
  const mode = options.mode || "detect";
  const outputType = options.output || "canvas";
  !!options.debug;
  const maxProcessingDimension = options.maxProcessingDimension || 800;
  let t0 = performance.now();
  const { grayscaleData, imageData, scaleFactor, originalDimensions, scaledDimensions } = await prepareScaleAndGrayscale(image, maxProcessingDimension);
  timings.push({ step: "Image Prep + Scale + Gray", ms: (performance.now() - t0).toFixed(2) });
  const detection = await detectDocumentInternal(
    grayscaleData,
    scaledDimensions.width,
    scaledDimensions.height,
    scaleFactor,
    options
  );
  if (detection.timings) {
    detection.timings.forEach((t) => timings.push(t));
  }
  if (!detection.success) {
    const totalEnd2 = performance.now();
    timings.unshift({ step: "Total", ms: (totalEnd2 - totalStart).toFixed(2) });
    console.table(timings);
    return {
      output: null,
      corners: null,
      contour: null,
      confidence: detection.confidence || null,
      debug: detection.debug,
      success: false,
      message: detection.message || "No document detected",
      timings
    };
  }
  let resultCanvas;
  let output;
  if (mode === "detect") {
    output = null;
  } else if (mode === "extract") {
    t0 = performance.now();
    resultCanvas = document.createElement("canvas");
    const ctx = resultCanvas.getContext("2d");
    unwarpImage(ctx, image, detection.corners);
    timings.push({ step: "Perspective Transform", ms: (performance.now() - t0).toFixed(2) });
  }
  if (mode !== "detect" && resultCanvas) {
    t0 = performance.now();
    if (outputType === "canvas") {
      output = resultCanvas;
    } else if (outputType === "imagedata") {
      output = resultCanvas.getContext("2d").getImageData(0, 0, resultCanvas.width, resultCanvas.height);
    } else if (outputType === "dataurl") {
      output = resultCanvas.toDataURL();
    } else {
      output = resultCanvas;
    }
    timings.push({ step: "Output Conversion", ms: (performance.now() - t0).toFixed(2) });
  }
  const totalEnd = performance.now();
  timings.unshift({ step: "Total", ms: (totalEnd - totalStart).toFixed(2) });
  console.table(timings);
  return {
    output,
    corners: detection.corners,
    contour: detection.contour,
    confidence: detection.confidence || null,
    debug: detection.debug,
    success: true,
    message: "Document detected",
    timings
  };
}
export {
  Scanner,
  createCornerEditor,
  extractDocument,
  initialize,
  scanDocument
};
