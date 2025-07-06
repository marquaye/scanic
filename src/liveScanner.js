/**
 * Live document scanner for webcam integration
 * Provides efficient real-time document detection with frame rate optimization
 */

import { detectDocument, highlightDocument } from './index.js';

export class LiveScanner {
  constructor(options = {}) {
    this.options = {
      targetFPS: options.targetFPS || 10, // Limit FPS for performance
      detectionInterval: options.detectionInterval || 150, // ms between detections
      confidenceThreshold: options.confidenceThreshold || 0.7,
      stabilizationFrames: options.stabilizationFrames || 3,
      maxProcessingDimension: options.maxProcessingDimension || 600, // Lower for live processing
      ...options
    };
    
    this.isRunning = false;
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.outputCanvas = null;
    this.outputCtx = null;
    
    // Performance tracking
    this.lastDetectionTime = 0;
    this.frameCount = 0;
    this.detectionCount = 0;
    this.lastFPSUpdate = 0;
    this.currentFPS = 0;
    
    // Detection state
    this.lastResult = null;
    this.stableResults = [];
    this.currentCorners = null;
    
    // Callbacks
    this.onDetection = null;
    this.onFPSUpdate = null;
    this.onError = null;
  }
  
  /**
   * Initialize webcam access and start live scanning
   * @param {HTMLElement} outputElement - Canvas element to render results to
   * @param {Object} constraints - MediaStream constraints
   */
  async init(outputElement, constraints = {}) {
    try {
      this.outputCanvas = outputElement;
      this.outputCtx = this.outputCanvas.getContext('2d');
      
      // Create hidden video element for webcam stream
      this.video = document.createElement('video');
      this.video.style.display = 'none';
      this.video.autoplay = true;
      this.video.muted = true;
      this.video.playsInline = true;
      document.body.appendChild(this.video);
      
      // Create hidden canvas for processing
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      
      // Get webcam stream
      const defaultConstraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: false
      };
      
      const finalConstraints = { ...defaultConstraints, ...constraints };
      this.stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
      this.video.srcObject = this.stream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        this.video.addEventListener('loadedmetadata', resolve, { once: true });
      });
      
      // Set canvas sizes
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.outputCanvas.width = this.video.videoWidth;
      this.outputCanvas.height = this.video.videoHeight;
      
      console.log(`Live scanner initialized: ${this.video.videoWidth}x${this.video.videoHeight}`);
      
    } catch (error) {
      console.error('Failed to initialize live scanner:', error);
      if (this.onError) this.onError(error);
      throw error;
    }
  }
  
  /**
   * Start the live scanning loop
   */
  start() {
    if (this.isRunning || !this.video) {
      console.warn('Scanner already running or not initialized');
      return;
    }
    
    this.isRunning = true;
    this.lastDetectionTime = Date.now();
    this.lastFPSUpdate = Date.now();
    this.frameCount = 0;
    this.detectionCount = 0;
    
    console.log('Live scanner started');
    this.processFrame();
  }
  
  /**
   * Stop the live scanning
   */
  stop() {
    this.isRunning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.video) {
      this.video.remove();
      this.video = null;
    }
    
    console.log('Live scanner stopped');
  }
  
  /**
   * Main processing loop - optimized for performance
   */
  async processFrame() {
    if (!this.isRunning) return;
    
    const now = Date.now();
    this.frameCount++;
    
    try {
      // Draw current video frame to output canvas
      this.outputCtx.drawImage(this.video, 0, 0, this.outputCanvas.width, this.outputCanvas.height);
      
      // Only run detection at specified intervals
      const timeSinceLastDetection = now - this.lastDetectionTime;
      if (timeSinceLastDetection >= this.options.detectionInterval) {
        this.lastDetectionTime = now;
        this.detectionCount++;
        
        // Capture frame for processing
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Run detection asynchronously to avoid blocking
        this.detectDocumentAsync(imageData).catch(error => {
          console.error('Detection error:', error);
          if (this.onError) this.onError(error);
        });
      }
      
      // Draw current overlay if we have stable corners
      if (this.currentCorners) {
        this.drawDocumentOverlay(this.currentCorners);
      }
      
      // Update FPS counter
      if (now - this.lastFPSUpdate >= 1000) {
        this.currentFPS = Math.round(this.frameCount * 1000 / (now - this.lastFPSUpdate));
        this.frameCount = 0;
        this.lastFPSUpdate = now;
        
        if (this.onFPSUpdate) {
          this.onFPSUpdate({
            renderFPS: this.currentFPS,
            detectionFPS: Math.round(this.detectionCount * 1000 / 1000),
            lastDetectionTime: timeSinceLastDetection
          });
        }
        this.detectionCount = 0;
      }
      
    } catch (error) {
      console.error('Frame processing error:', error);
      if (this.onError) this.onError(error);
    }
    
    // Schedule next frame
    requestAnimationFrame(() => this.processFrame());
  }
  
  /**
   * Run document detection asynchronously
   */
  async detectDocumentAsync(imageData) {
    try {
      const result = await detectDocument(imageData, {
        ...this.options,
        debug: false // Disable debug for performance
      });
      
      if (result.success && result.corners) {
        this.updateStableCorners(result.corners);
        
        if (this.onDetection) {
          this.onDetection({
            corners: result.corners,
            confidence: this.calculateConfidence(result),
            isStable: this.stableResults.length >= this.options.stabilizationFrames
          });
        }
      } else {
        // Gradually fade out corners if no detection
        if (this.stableResults.length > 0) {
          this.stableResults.pop();
          if (this.stableResults.length === 0) {
            this.currentCorners = null;
          }
        }
      }
      
    } catch (error) {
      console.error('Document detection failed:', error);
      throw error;
    }
  }
  
  /**
   * Update stable corner detection with smoothing
   */
  updateStableCorners(newCorners) {
    this.stableResults.push(newCorners);
    
    // Keep only recent results
    if (this.stableResults.length > this.options.stabilizationFrames) {
      this.stableResults.shift();
    }
    
    // Calculate average corners for stability
    if (this.stableResults.length >= this.options.stabilizationFrames) {
      this.currentCorners = this.averageCorners(this.stableResults);
    }
  }
  
  /**
   * Calculate average corners from multiple detections for smoothing
   */
  averageCorners(cornersList) {
    const avg = {
      topLeft: { x: 0, y: 0 },
      topRight: { x: 0, y: 0 },
      bottomRight: { x: 0, y: 0 },
      bottomLeft: { x: 0, y: 0 }
    };
    
    cornersList.forEach(corners => {
      Object.keys(avg).forEach(key => {
        avg[key].x += corners[key].x;
        avg[key].y += corners[key].y;
      });
    });
    
    const count = cornersList.length;
    Object.keys(avg).forEach(key => {
      avg[key].x = Math.round(avg[key].x / count);
      avg[key].y = Math.round(avg[key].y / count);
    });
    
    return avg;
  }
  
  /**
   * Draw document overlay on output canvas
   */
  drawDocumentOverlay(corners, ctx = null) {
    const targetCtx = ctx || this.outputCtx;
    
    // Save context
    targetCtx.save();
    
    // Draw document border
    targetCtx.strokeStyle = '#00FF00';
    targetCtx.lineWidth = 3;
    targetCtx.setLineDash([5, 5]);
    
    targetCtx.beginPath();
    targetCtx.moveTo(corners.topLeft.x, corners.topLeft.y);
    targetCtx.lineTo(corners.topRight.x, corners.topRight.y);
    targetCtx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
    targetCtx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
    targetCtx.closePath();
    targetCtx.stroke();
    
    // Draw corners
    targetCtx.fillStyle = '#00FF00';
    targetCtx.setLineDash([]);
    const cornerSize = 8;
    
    Object.values(corners).forEach(corner => {
      targetCtx.beginPath();
      targetCtx.arc(corner.x, corner.y, cornerSize, 0, 2 * Math.PI);
      targetCtx.fill();
    });
    
    // Restore context
    targetCtx.restore();
  }
  
  /**
   * Calculate detection confidence (placeholder - can be enhanced)
   */
  calculateConfidence(result) {
    // Simple confidence based on contour area and corner detection
    // This could be enhanced with more sophisticated metrics
    return 0.8; // Placeholder
  }
  
  /**
   * Capture current frame as document
   */
  async captureDocument() {
    if (!this.currentCorners || !this.video) {
      throw new Error('No stable document detected');
    }
    
    // Create a high-quality capture
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = this.video.videoWidth;
    captureCanvas.height = this.video.videoHeight;
    const captureCtx = captureCanvas.getContext('2d');
    captureCtx.drawImage(this.video, 0, 0);
    
    // Just return the canvas with the current overlay drawn
    this.drawDocumentOverlay(this.currentCorners, captureCtx);
    
    return captureCanvas;
  }
  
  /**
   * Get current scanner statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      currentFPS: this.currentFPS,
      videoResolution: this.video ? `${this.video.videoWidth}x${this.video.videoHeight}` : null,
      hasStableDetection: this.currentCorners !== null,
      stabilizationProgress: `${this.stableResults.length}/${this.options.stabilizationFrames}`
    };
  }
}

// Helper function to check webcam availability
export async function checkWebcamAvailability() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    return {
      available: videoDevices.length > 0,
      deviceCount: videoDevices.length,
      devices: videoDevices
    };
  } catch (error) {
    console.error('Error checking webcam availability:', error);
    return { available: false, error: error.message };
  }
}
