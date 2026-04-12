/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { scanDocument, Scanner } from './index.js';
import { loadImage } from 'canvas';
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
      
      // We check if coordinates are close enough (within 2 pixels) to account for small math variations
      const precision = 2;
      
      Object.keys(expected).forEach(corner => {
        expect(result.corners[corner].x).toBeCloseTo(expected[corner].x, -Math.log10(precision));
        expect(result.corners[corner].y).toBeCloseTo(expected[corner].y, -Math.log10(precision));
      });
    });
  });
});


