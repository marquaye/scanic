/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { scanDocument, Scanner, createCornerEditor } from './index.js';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shim ImageData if it's not defined (JSDOM doesn't have it by default)
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    body: {
      appendChild() {},
      removeChild() {}
    },
    createElement(tagName) {
      if (tagName === 'canvas') {
        const c = createCanvas(1, 1);
        c.style = {};
        c.addEventListener = () => {};
        c.removeEventListener = () => {};
        c.setPointerCapture = () => {};
        c.getBoundingClientRect = () => ({ width: 640, height: 480, left: 0, top: 0 });
        return c;
      }

      return {
        style: {},
        appendChild() {},
        removeChild() {},
        remove() {},
        addEventListener() {},
        removeEventListener() {},
        getBoundingClientRect() {
          return { width: 640, height: 480, left: 0, top: 0 };
        }
      };
    }
  };
}

if (typeof globalThis.getComputedStyle === 'undefined') {
  globalThis.getComputedStyle = () => ({ position: 'static' });
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
}

describe('Scanner API', () => {
  it('should expose scanDocument function', () => {
    expect(scanDocument).toBeDefined();
  });

  it('should expose Scanner class', () => {
    const scanner = new Scanner();
    expect(scanner.scan).toBeDefined();
    expect(scanner.initialize).toBeDefined();
  });

  it('should expose createCornerEditor function', () => {
    expect(createCornerEditor).toBeDefined();
  });

  it('should handle missing image gracefully', async () => {
    try {
      await scanDocument(null);
    } catch (e) {
      expect(e.message).toBe('No image provided');
    }
  });
});

describe('Corner Editor API', () => {
  it('should create and confirm manual corner updates', async () => {
    const host = document.createElement('div');
    host.style.width = '640px';
    host.style.height = '480px';
    document.body.appendChild(host);

    const imgPath = path.join(__dirname, '..', 'testImages', 'test-sized.png');
    const img = await loadImage(imgPath);

    let confirmed = null;
    const editor = createCornerEditor({
      container: host,
      image: img,
      nudges: { enabled: true, steps: [1] },
      onConfirm(corners) {
        confirmed = corners;
      }
    });

    const before = editor.getCorners();
    const nudged = editor.nudge('topLeft', 1, 0, 1);
    expect(nudged).toBe(true);

    const after = editor.confirm();
    expect(after.topLeft.x).toBeGreaterThan(before.topLeft.x);
    expect(confirmed).toBeTruthy();

    editor.destroy();
    host.remove();
  });

  it('should reject invalid corner sets', async () => {
    const host = document.createElement('div');
    host.style.width = '640px';
    host.style.height = '480px';
    document.body.appendChild(host);

    const imgPath = path.join(__dirname, '..', 'testImages', 'test-sized.png');
    const img = await loadImage(imgPath);
    const editor = createCornerEditor({ container: host, image: img });

    const invalid = {
      topLeft: { x: 100, y: 100 },
      topRight: { x: 100, y: 100 },
      bottomRight: { x: 110, y: 110 },
      bottomLeft: { x: 120, y: 120 }
    };

    expect(editor.setCorners(invalid)).toBe(false);
    editor.destroy();
    host.remove();
  });
});

describe('Regression Tests', () => {
  const imagesDir = path.join(__dirname, '..', 'testImages');

  const testCases = [
    { 
      name: 'test.png', 
      expected: {
        topLeft: { x: 310.2, y: 78.1 },
        topRight: { x: 649, y: 95.7 },
        bottomRight: { x: 652.3, y: 594 },
        bottomLeft: { x: 151.8, y: 531.3 }
      }
    },
    { 
      name: 'test2.png', 
      expected: {
        topLeft: { x: 198, y: 178 },
        topRight: { x: 974, y: 188 },
        bottomRight: { x: 1150, y: 1360 },
        bottomLeft: { x: 50, y: 1382 }
      }
    }
  ];

  testCases.forEach(({ name, expected }) => {
    it(`should match baseline for ${name}`, async () => {
      const imgPath = path.join(imagesDir, name);
      const img = await loadImage(imgPath);
      const result = await scanDocument(img, { maxProcessingDimension: 800 });
      
      expect(result.success).toBe(true);
      
      // Allow coordinate drift across runtimes (Node, canvas backend, SIMD path).
      const tolerancePx = 25;
      
      Object.keys(expected).forEach(corner => {
        expect(Math.abs(result.corners[corner].x - expected[corner].x)).toBeLessThanOrEqual(tolerancePx);
        expect(Math.abs(result.corners[corner].y - expected[corner].y)).toBeLessThanOrEqual(tolerancePx);
      });
    });
  });

  it('should support extract mode with ImageData input', async () => {
    const imgPath = path.join(imagesDir, 'test-sized.png');
    const img = await loadImage(imgPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = await scanDocument(imageData, {
      mode: 'extract',
      output: 'canvas',
      maxProcessingDimension: 800
    });

    expect(result.success).toBe(true);
    expect(result.output).toBeTruthy();
    expect(result.output.width).toBeGreaterThan(0);
    expect(result.output.height).toBeGreaterThan(0);
  });
});


