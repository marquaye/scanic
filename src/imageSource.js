/**
 * Helpers for the image sources scanic accepts and the canvases it draws on.
 *
 * Accepted sources: HTMLImageElement, HTMLCanvasElement, OffscreenCanvas,
 * HTMLVideoElement, ImageBitmap, VideoFrame and ImageData.
 *
 * src/mlDetector.js keeps its own copy of getImageSize on purpose: it is built
 * as a separate lazy chunk, and a module shared with index.js would become a
 * third chunk that the published package does not ship.
 */

export function isImageData(image) {
  return !!image && typeof image.width === 'number' && typeof image.height === 'number' && !!image.data;
}

/**
 * Intrinsic pixel size of an image source.
 *
 * Intrinsic sizes come first: `<img>.width` is the *rendered* width once the
 * image is laid out, and `<video>.width` is the (usually unset) attribute.
 * VideoFrame only has `displayWidth`/`displayHeight`, which is also the size
 * drawImage() uses for it.
 * @returns {{width: number, height: number}}
 */
export function getImageSize(image) {
  if (!image) throw new Error('No image provided');
  const width = image.naturalWidth || image.videoWidth || image.displayWidth || image.width;
  const height = image.naturalHeight || image.videoHeight || image.displayHeight || image.height;
  if (!(width > 0 && height > 0)) {
    throw new Error(
      'scanic: the image has no pixels yet. Wait for an <img> to load, or for a <video> to fire loadedmetadata.'
    );
  }
  return { width, height };
}

/**
 * Canvas for output handed back to the caller: a DOM canvas where there is a
 * document (unchanged behaviour), an OffscreenCanvas in a Web Worker.
 */
export function createOutputCanvas(width, height) {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  throw new Error('scanic: no canvas implementation available (needs a DOM or OffscreenCanvas).');
}

/**
 * Canvas for internal pixel work that never leaves the library. OffscreenCanvas
 * is preferred because it skips the DOM entirely.
 */
export function createScratchCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  return createOutputCanvas(width, height);
}

/**
 * Converts a rendered extraction into the requested output format.
 * `imageData` is the pixel buffer the canvas was filled from, so the
 * 'imagedata' output never reads the canvas back.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 * @param {ImageData} imageData
 * @param {'canvas'|'imagedata'|'dataurl'} outputType
 */
export async function toOutput(canvas, imageData, outputType) {
  if (outputType === 'imagedata') return imageData;
  if (outputType === 'dataurl') {
    if (typeof canvas.toDataURL === 'function') return canvas.toDataURL();
    // OffscreenCanvas (Web Worker) has no toDataURL.
    const blob = await canvas.convertToBlob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  return canvas;
}
