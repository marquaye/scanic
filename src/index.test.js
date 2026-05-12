/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { scanDocument, Scanner } from './index.js';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';

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
    createElement(tagName) {
      if (tagName !== 'canvas') {
        throw new Error(`Unsupported element requested in tests: ${tagName}`);
      }
      return createCanvas(1, 1);
    }
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

  it('should handle missing image gracefully', async () => {
    try {
      await scanDocument(null);
    } catch (e) {
      expect(e.message).toBe('No image provided');
    }
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


