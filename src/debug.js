/**
 * Debugging utilities for visualizing the document detection process
 */

import { DEFAULTS } from './constants.js';

/**
 * Creates a debug visualization layer for the document detection process
 * @param {HTMLCanvasElement} canvas - Canvas to overlay debug information on
 * @param {Object} debugInfo - Debug information collected during processing
 */
export function createDebugLayer(canvas, debugInfo) {
  if (!debugInfo) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  // Create a debug canvas that will be positioned absolutely over the main canvas
  const debugCanvas = document.createElement('canvas');
  debugCanvas.width = width;
  debugCanvas.height = height;
  debugCanvas.style.position = 'absolute';
  debugCanvas.style.left = canvas.offsetLeft + 'px';
  debugCanvas.style.top = canvas.offsetTop + 'px';
  debugCanvas.style.zIndex = 1000;
  debugCanvas.style.opacity = DEFAULTS.DEBUG_OVERLAY_OPACITY;
  debugCanvas.className = 'jscanify-debug-layer';
  
  // Add dropdown to switch between different debug views
  const debugControls = document.createElement('div');
  debugControls.style.position = 'absolute';
  debugControls.style.left = canvas.offsetLeft + 'px';
  debugControls.style.top = (canvas.offsetTop + canvas.height + 10) + 'px';
  debugControls.style.zIndex = 1001;
  debugControls.className = 'jscanify-debug-controls';
  
  const select = document.createElement('select');
  const views = ['none', 'edges', 'contours', 'magnitude', 'suppressed'];
  
  views.forEach(view => {
    if (view === 'none' || debugInfo[view]) {
      const option = document.createElement('option');
      option.value = view;
      option.text = `Debug view: ${view}`;
      select.appendChild(option);
    }
  });
  
  debugControls.appendChild(select);
  
  // Add elements to the document
  canvas.parentNode.appendChild(debugCanvas);
  canvas.parentNode.appendChild(debugControls);
  
  // Handle debug view changes
  select.addEventListener('change', function() {
    updateDebugView(debugCanvas, debugInfo, this.value);
  });
  
  // Initialize with edges view if available
  if (debugInfo.edges) {
    select.value = 'edges';
    updateDebugView(debugCanvas, debugInfo, 'edges');
  }
  
  // Return the debug elements for potential future cleanup
  return { debugCanvas, debugControls };
}

/**
 * Updates the debug canvas with the selected view
 * @param {HTMLCanvasElement} canvas - Debug canvas to draw on
 * @param {Object} debugInfo - Debug information
 * @param {string} view - Selected debug view
 */
function updateDebugView(canvas, debugInfo, view) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  if (view === 'none') {
    return;
  }
  
  if (view === 'edges' && debugInfo.edges) {
    // Draw edges as white pixels on black background
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < debugInfo.edges.length; i++) {
      const pixelValue = debugInfo.edges[i];
      const pixelIdx = i * 4;
      
      imageData.data[pixelIdx] = pixelValue;     // R
      imageData.data[pixelIdx + 1] = pixelValue; // G
      imageData.data[pixelIdx + 2] = pixelValue; // B
      imageData.data[pixelIdx + 3] = 255;        // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    
  } else if (view === 'contours' && debugInfo.contours) {
    // Draw contours with different colors
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF'];
    
    // Clear with transparent black
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw each contour with a different color
    debugInfo.contours.forEach((contour, index) => {
      const colorIndex = index % colors.length;
      ctx.strokeStyle = colors[colorIndex];
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      
      const points = contour.points;
      if (points && points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        
        // Close the contour
        ctx.lineTo(points[0].x, points[0].y);
      }
      
      ctx.stroke();
      
      // Label the contour
      if (contour.area) {
        const bb = contour.boundingBox;
        const centerX = (bb.minX + bb.maxX) / 2;
        const centerY = (bb.minY + bb.maxY) / 2;
        
        ctx.font = '12px Arial';
        ctx.fillStyle = colors[colorIndex];
        ctx.fillText(`#${index} (${Math.round(contour.area)})`, centerX, centerY);
      }
    });
    
  } else if (view === 'magnitude' && debugInfo.magnitude) {
    // Draw gradient magnitude
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < debugInfo.magnitude.length; i++) {
      const pixelValue = debugInfo.magnitude[i];
      const pixelIdx = i * 4;
      
      imageData.data[pixelIdx] = pixelValue;     // R
      imageData.data[pixelIdx + 1] = pixelValue; // G
      imageData.data[pixelIdx + 2] = pixelValue; // B
      imageData.data[pixelIdx + 3] = 255;        // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
    
  } else if (view === 'suppressed' && debugInfo.suppressed) {
    // Draw non-maximum suppression result
    const imageData = ctx.createImageData(width, height);
    
    for (let i = 0; i < debugInfo.suppressed.length; i++) {
      const pixelValue = debugInfo.suppressed[i];
      const pixelIdx = i * 4;
      
      imageData.data[pixelIdx] = pixelValue;     // R
      imageData.data[pixelIdx + 1] = pixelValue; // G
      imageData.data[pixelIdx + 2] = pixelValue; // B
      imageData.data[pixelIdx + 3] = 255;        // Alpha
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Creates a console-friendly representation of the detection result
 * @param {Object} result - Detection result from detectDocument
 * @returns {Object} Simplified object for logging
 */
export function createDebugOutput(result) {
  if (!result) return null;
  
  return {
    success: result.success,
    corners: result.corners,
    contourPoints: result.contour ? result.contour.points.length : 0,
    contourArea: result.contour ? result.contour.area : 0
  };
}