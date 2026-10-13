// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getImageSize, isImageData } from './imageSource.js';

describe('getImageSize', () => {
  it('uses the intrinsic size of an <img>, not its rendered width', () => {
    // A 4000x3000 photo shown at 400px wide: `width` is the rendered size.
    const img = { naturalWidth: 4000, naturalHeight: 3000, width: 400, height: 300 };
    expect(getImageSize(img)).toEqual({ width: 4000, height: 3000 });
  });

  it('reads videoWidth/videoHeight from a <video>', () => {
    // The width attribute of a <video> is usually unset (0).
    const video = { videoWidth: 1280, videoHeight: 720, width: 0, height: 0 };
    expect(getImageSize(video)).toEqual({ width: 1280, height: 720 });
  });

  it('reads displayWidth/displayHeight from a VideoFrame', () => {
    const frame = { displayWidth: 1920, displayHeight: 1080, codedWidth: 1920, codedHeight: 1088 };
    expect(getImageSize(frame)).toEqual({ width: 1920, height: 1080 });
  });

  it('falls back to width/height for canvases, ImageBitmap and ImageData', () => {
    expect(getImageSize({ width: 640, height: 480 })).toEqual({ width: 640, height: 480 });
    expect(getImageSize({ width: 10, height: 20, data: new Uint8ClampedArray(800) })).toEqual({ width: 10, height: 20 });
  });

  it('throws a clear error for a source without pixels yet', () => {
    expect(() => getImageSize({ videoWidth: 0, videoHeight: 0, width: 0, height: 0 })).toThrow(/no pixels yet/);
    expect(() => getImageSize(null)).toThrow('No image provided');
  });
});

describe('isImageData', () => {
  it('recognises ImageData-like objects only', () => {
    expect(isImageData({ width: 1, height: 1, data: new Uint8ClampedArray(4) })).toBe(true);
    expect(isImageData({ width: 1, height: 1 })).toBe(false);
    expect(isImageData(null)).toBe(false);
  });
});
