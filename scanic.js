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
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
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
  const approximation = approximatePolygon(contour, epsilon);
  let corners;
  if (approximation && approximation.length === 4) {
    corners = orderCornerPoints(approximation);
  } else {
    corners = findCornersByCoordinateExtremes(contour.points);
  }
  if (!corners || !corners.topLeft || !corners.topRight || !corners.bottomRight || !corners.bottomLeft) {
    console.warn("Failed to find all four corners.", corners);
    return null;
  }
  return corners;
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
    module_or_path = new URL("data:application/wasm;base64,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KAIARw0BQYCbwAAgADYCAA8LIAIgA0F+cTYCBCABIABBAXI2AgQgACABaiAANgIACyAAQYACSQ0CIAEgABALQQAhAUGgm8AAQaCbwAAoAgBBAWsiADYCACAADQRB6JjAACgCACIABEADQCABQQFqIQEgACgCCCIADQALC0Ggm8AAQf8fIAEgAUH/H00bNgIADwtBjJvAACABNgIAQYSbwABBhJvAACgCACAAaiIANgIAIAEgAEEBcjYCBEGIm8AAKAIAIAFGBEBBgJvAAEEANgIAQYibwABBADYCAAsgAEGYm8AAKAIAIgNNDQNBjJvAACgCACICRQ0DQQAhAEGEm8AAKAIAIgRBKUkNAkHgmMAAIQEDQCACIAEoAgAiBU8EQCACIAUgASgCBGpJDQQLIAEoAgghAQwACwALQYibwAAgATYCAEGAm8AAQYCbwAAoAgAgAGoiADYCACABIABBAXI2AgQgACABaiAANgIADwsCQEH4msAAKAIAIgJBASAAQQN2dCIDcUUEQEH4msAAIAIgA3I2AgAgAEH4AXFB8JjAAGoiACECDAELIABB+AFxIgBB8JjAAGohAiAAQfiYwABqKAIAIQALIAIgATYCCCAAIAE2AgwgASACNgIMIAEgADYCCA8LQeiYwAAoAgAiAQRAA0AgAEEBaiEAIAEoAggiAQ0ACwtBoJvAAEH/HyAAIABB/x9NGzYCACADIARPDQBBmJvAAEF/NgIACwu4BAEIfyMAQRBrIgMkACADIAE2AgQgAyAANgIAIANCoICAgA43AggCfwJAAkACQCACKAIQIgkEQCACKAIUIgANAQwCCyACKAIMIgBFDQEgAigCCCIBIABBA3QiAGohBCAAQQhrQQN2QQFqIQYgAigCACEAA0ACQCAAQQRqKAIAIgVFDQAgAygCACAAKAIAIAUgAygCBCgCDBEDAEUNAEEBDAULQQEgASgCACADIAFBBGooAgARAgANBBogAEEIaiEAIAQgAUEIaiIBRw0ACwwCCyAAQRhsIQogAEEBa0H/////AXFBAWohBiACKAIIIQQgAigCACEAA0ACQCAAQQRqKAIAIgFFDQAgAygCACAAKAIAIAEgAygCBCgCDBEDAEUNAEEBDAQLQQAhB0EAIQgCQAJAAkAgBSAJaiIBQQhqLwEAQQFrDgIBAgALIAFBCmovAQAhCAwB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DAELIAJBEGogACgCDCgCACIAQQhqKQIANwMAIAJBGGogAEEQaikCADcDACACIAApAgA3AwggASgCACABKAIEIAJBCGoQBgsgAkEgaiQAC2kBA38jAEEQayIBJAAgAUEEaiAAKAIAIgIgACgCBEEEIAJBAXQiAiACQQRNGyICQQRBBBARIAEoAgRBAUYEQCABKAIIIAEoAgwQLQALIAEoAgghAyAAIAI2AgAgACADNgIEIAFBEGokAAtpAQN/IwBBEGsiASQAIAFBBGogACgCACICIAAoAgRBBCACQQF0IgIgAkEETRsiAkEEQQgQESABKAIEQQFGBEAgASgCCCABKAIMEC0ACyABKAIIIQMgACACNgIAIAAgAzYCBCABQRBqJAALaQEDfyMAQRBrIgEkACABQQRqIAAoAgAiAiAAKAIEQQQgAkEBdCICIAJBBE0bIgJBAkECEBEgASgCBEEBRgRAIAEoAgggASgCDBAtAAsgASgCCCEDIAAgAjYCACAAIAM2AgQgAUEQaiQACxIAIwBBMGsiACQAIABBMGokAAtoAgF/AX4jAEEwayIDJAAgAyABNgIEIAMgADYCACADQQI2AgwgA0Gkl8AANgIIIANCAjcCFCADQoCAgIAwIgQgA62ENwMoIAMgBCADQQRqrYQ3AyAgAyADQSBqNgIQIANBCGogAhAmAAtHAQF/IAAoAgAgACgCCCIDayACSQRAIAAgAyACEBIgACgCCCEDCyACBEAgACgCBCADaiABIAL8CgAACyAAIAIgA2o2AghBAAtEAQJ/IAEoAgQhAiABKAIAIQNBCEEEEDUiAUUEQEEEQQgQOQALIAEgAjYCBCABIAM2AgAgAEGcksAANgIEIAAgATYCAAvGAgACQCAAIAJNBEAgACABTSABIAJLcg0BIwBBMGsiAiQAIAIgATYCBCACIAA2AgAgAkECNgIMIAJBmJbAADYCCCACQgI3AhQgAiACQQRqrUKAgICAMIQ3AyggAiACrUKAgICAMIQ3AyAgAiACQSBqNgIQIAJBCGogAxAmAAsjAEEwayIBJAAgASACNgIEIAEgADYCACABQQI2AgwgAUG8lsAANgIIIAFCAjcCFCABIAFBBGqtQoCAgIAwhDcDKCABIAGtQoCAgIAwhDcDICABIAFBIGo2AhAgAUEIaiADECYACyMAQTBrIgAkACAA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bGxvY2F0aW9uIG9mICBieXRlcyBmYWlsZWQAAIgIEAAVAAAAnQgQAA0AAAAvARAAGAAAAGQBAAAJAAAABAAAAAwAAAAEAAAABQAAAAYAAAAHAAAAAAAAAAgAAAAEAAAACAAAAAkAAAAKAAAACwAAAAwAAAAQAAAABAAAAA0AAAAOAAAADwAAABAAAAAAAAAACAAAAAQAAAARAAAAYXNzZXJ0aW9uIGZhaWxlZDogcHNpemUgPj0gc2l6ZSArIG1pbl9vdmVyaGVhZAAABAEQACoAAACxBAAACQAAAGFzc2VydGlvbiBmYWlsZWQ6IHBzaXplIDw9IHNpemUgKyBtYXhfb3ZlcmhlYWQAAAQBEAAqAAAAtwQAAA0AAAAEAAAADAAAAAQAAAASAAAAY2FwYWNpdHkgb3ZlcmZsb3cAAAC8CRAAEQAAAOMAEAAgAAAAHAAAAAUAAAAwMDAxMDIwMzA0MDUwNjA3MDgwOTEwMTExMjEzMTQxNTE2MTcxODE5MjAyMTIyMjMyNDI1MjYyNzI4MjkzMDMxMzIzMzM0MzUzNjM3MzgzOTQwNDE0MjQzNDQ0NTQ2NDc0ODQ5NTA1MTUyNTM1NDU1NTY1NzU4NTk2MDYxNjI2MzY0NjU2NjY3Njg2OTcwNzE3MjczNzQ3NTc2Nzc3ODc5ODA4MTgyODM4NDg1ODY4Nzg4ODk5MDkxOTI5Mzk0OTU5Njk3OTg5OXJhbmdlIGVuZCBpbmRleCAgb3V0IG9mIHJhbmdlIGZvciBzbGljZSBvZiBsZW5ndGggAACwChAAEAAAAMAKEAAiAAAAc2xpY2UgaW5kZXggc3RhcnRzIGF0ICBidXQgZW5kcyBhdCAA9AoQABYAAAAKCxAADQAAAHJhbmdlIHN0YXJ0IGluZGV4IAAAKAsQABIAAADAChAAIgAAAGF0dGVtcHQgdG8gZGl2aWRlIGJ5IHplcm8AAABMCxAAGQAAAGluZGV4IG91dCBvZiBib3VuZHM6IHRoZSBsZW4gaXMgIGJ1dCB0aGUgaW5kZXggaXMgAABwCxAAIAAAAJALEAASAAAAAAAAPwAAAL8AQdSXwAALAQEAfAlwcm9kdWNlcnMCCGxhbmd1YWdlAQRSdXN0AAxwcm9jZXNzZWQtYnkDBXJ1c3RjHTEuOTIuMCAoZGVkNWMwNmNmIDIwMjUtMTItMDgpBndhbHJ1cwYwLjIzLjMMd2FzbS1iaW5kZ2VuEzAuMi4xMDAgKDI0MDVlYzJiNCkAdA90YXJnZXRfZmVhdHVyZXMHKw9tdXRhYmxlLWdsb2JhbHMrE25vbnRyYXBwaW5nLWZwdG9pbnQrB3NpbWQxMjgrC2J1bGstbWVtb3J5KwhzaWduLWV4dCsPcmVmZXJlbmNlLXR5cGVzKwptdWx0aXZhbHVl", import.meta.url);
  }
  const imports = __wbg_get_imports();
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module);
}
let wasmReadyPromise = null;
function initializeWasm() {
  if (!wasmReadyPromise) {
    wasmReadyPromise = __wbg_init();
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
  const timings = [];
  const tStart = performance.now();
  const skipGrayscale = options.skipGrayscale || false;
  let width, height, grayscale;
  if (skipGrayscale) {
    width = options.width;
    height = options.height;
    grayscale = input;
    if (options.debug) options.debug.grayscale = grayscale;
  } else {
    width = input.width;
    height = input.height;
    let t02 = performance.now();
    grayscale = convertToGrayscale(input);
    let t12 = performance.now();
    timings.push({ step: "Grayscale", ms: (t12 - t02).toFixed(2) });
    if (options.debug) options.debug.grayscale = grayscale;
  }
  let lowThreshold = options.lowThreshold !== void 0 ? options.lowThreshold : 75;
  let highThreshold = options.highThreshold !== void 0 ? options.highThreshold : 200;
  const kernelSize = options.kernelSize || 5;
  const sigma = options.sigma || 0;
  const L2gradient = options.L2gradient === void 0 ? false : options.L2gradient;
  const applyDilation = options.applyDilation !== void 0 ? options.applyDilation : true;
  const dilationKernelSize = options.dilationKernelSize || 5;
  const useWasmHysteresis = options.useWasmHysteresis !== void 0 ? options.useWasmHysteresis : false;
  if (lowThreshold >= highThreshold) {
    console.warn(`Canny Edge Detector: lowThreshold (${lowThreshold}) should be lower than highThreshold (${highThreshold}). Swapping them.`);
    [lowThreshold, highThreshold] = [highThreshold, lowThreshold];
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
  if (options.debug) {
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
  if (options.debug) {
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
async function initialize() {
  return await initializeWasm();
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
    await initializeWasm();
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
  ctx.filter = "grayscale(1)";
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
  const grayscaleData = new Uint8ClampedArray(targetWidth * targetHeight);
  const data = imageData.data;
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayscaleData[j] = data[i];
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
  const edges = await cannyEdgeDetector(grayscaleData, {
    width,
    height,
    lowThreshold: options.lowThreshold || 75,
    // Match OpenCV values
    highThreshold: options.highThreshold || 200,
    // Match OpenCV values
    dilationKernelSize: options.dilationKernelSize || 3,
    // Match OpenCV value 
    dilationIterations: options.dilationIterations || 1,
    debug: debugInfo,
    skipGrayscale: true
  });
  if (debugInfo.timings) {
    debugInfo.timings.forEach((t) => {
      if (t.step !== "Edge Detection Total") timings.push(t);
    });
  }
  let t0 = performance.now();
  const contours = detectDocumentContour(edges, {
    minArea: (options.minArea || 1e3) / (scaleFactor * scaleFactor),
    // Adjust minArea for scaled image
    debug: debugInfo,
    width,
    height
  });
  timings.push({ step: "Find Contours", ms: (performance.now() - t0).toFixed(2) });
  if (!contours || contours.length === 0) {
    console.log("No document detected");
    return {
      success: false,
      message: "No document detected",
      debug: debugInfo._timingsOnly ? null : debugInfo,
      timings
    };
  }
  const documentContour = contours[0];
  t0 = performance.now();
  const cornerPoints = findCornerPoints(documentContour, {
    epsilon: options.epsilon
    // Pass epsilon for approximation
  });
  timings.push({ step: "Corner Detection", ms: (performance.now() - t0).toFixed(2) });
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
  const srcWidth = image.width || image.naturalWidth;
  const srcHeight = image.height || image.naturalHeight;
  const inv = invert3x3(matrix);
  function mapPoint(x, y) {
    const denom = inv[2][0] * x + inv[2][1] * y + inv[2][2];
    return {
      x: (inv[0][0] * x + inv[0][1] * y + inv[0][2]) / denom,
      y: (inv[1][0] * x + inv[1][1] * y + inv[1][2]) / denom
    };
  }
  const gridX = 64;
  const gridY = 64;
  const cellW = outWidth / gridX;
  const cellH = outHeight / gridY;
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext("2d");
  srcCtx.drawImage(image, 0, 0, srcWidth, srcHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  for (let gy = 0; gy < gridY; gy++) {
    for (let gx = 0; gx < gridX; gx++) {
      const dx0 = gx * cellW;
      const dy0 = gy * cellH;
      const dx1 = (gx + 1) * cellW;
      const dy1 = (gy + 1) * cellH;
      const s00 = mapPoint(dx0, dy0);
      const s10 = mapPoint(dx1, dy0);
      const s01 = mapPoint(dx0, dy1);
      const s11 = mapPoint(dx1, dy1);
      drawTexturedTriangle(
        ctx,
        srcCanvas,
        s00.x,
        s00.y,
        s10.x,
        s10.y,
        s01.x,
        s01.y,
        // source triangle
        dx0,
        dy0,
        dx1,
        dy0,
        dx0,
        dy1
        // dest triangle
      );
      drawTexturedTriangle(
        ctx,
        srcCanvas,
        s10.x,
        s10.y,
        s11.x,
        s11.y,
        s01.x,
        s01.y,
        // source triangle
        dx1,
        dy0,
        dx1,
        dy1,
        dx0,
        dy1
        // dest triangle
      );
    }
  }
  ctx.restore();
}
function drawTexturedTriangle(ctx, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
  const denom = (sx0 - sx2) * (sy1 - sy2) - (sx1 - sx2) * (sy0 - sy2);
  if (Math.abs(denom) < 1e-10) return;
  const invDenom = 1 / denom;
  const a = ((dx0 - dx2) * (sy1 - sy2) - (dx1 - dx2) * (sy0 - sy2)) * invDenom;
  const b = ((dx1 - dx2) * (sx0 - sx2) - (dx0 - dx2) * (sx1 - sx2)) * invDenom;
  const c = dx0 - a * sx0 - b * sy0;
  const d = ((dy0 - dy2) * (sy1 - sy2) - (dy1 - dy2) * (sy0 - sy2)) * invDenom;
  const e = ((dy1 - dy2) * (sx0 - sx2) - (dy0 - dy2) * (sx1 - sx2)) * invDenom;
  const f = dy0 - d * sx0 - e * sy0;
  ctx.save();
  const expand = 1;
  const centerX = (dx0 + dx1 + dx2) / 3;
  const centerY = (dy0 + dy1 + dy2) / 3;
  const grow = (x, y) => {
    const vx = x - centerX;
    const vy = y - centerY;
    const len = Math.sqrt(vx * vx + vy * vy);
    if (len < 1e-6) return { x, y };
    return {
      x: x + vx / len * expand,
      y: y + vy / len * expand
    };
  };
  const p0 = grow(dx0, dy0);
  const p1 = grow(dx1, dy1);
  const p2 = grow(dx2, dy2);
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, d, b, e, c, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
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
    debug: detection.debug,
    success: true,
    message: "Document detected",
    timings
  };
}
export {
  Scanner,
  extractDocument,
  initialize,
  scanDocument
};
