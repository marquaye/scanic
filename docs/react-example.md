# Using Scanic with React

## Installation

```bash
npm install scanic
```

## Function Component Example

```jsx
import React, { useState } from 'react';
import { scanDocument } from 'scanic';

function DocumentScanner() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setSelectedImage(img);
          setResult(null);
          setError(null);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const processDocument = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const scanResult = await scanDocument(selectedImage, {
        mode: 'extract',
        output: 'canvas'
      });
      
      setResult(scanResult);
      
      if (!scanResult.success) {
        setError('No document detected');
      }
    } catch (err) {
      setError(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (result && result.output) {
      const link = document.createElement('a');
      link.download = 'scanned-document.png';
      link.href = result.output.toDataURL();
      link.click();
    }
  };

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileSelect} />
      {selectedImage && (
        <button onClick={processDocument} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Scan Document'}
        </button>
      )}
      {result && result.success && (
        <button onClick={downloadResult}>Download</button>
      )}
      {error && <div>{error}</div>}
    </div>
  );
}

export default DocumentScanner;
```

## Live Camera Scanning

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { scanDocument } from 'scanic';

function LiveScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [documentDetected, setDocumentDetected] = useState(false);
  const [capturedDocument, setCapturedDocument] = useState(null);
  
  const liveCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const animationIdRef = useRef(null);

  const startCamera = async () => {
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: true });
      
      videoRef.current = document.createElement('video');
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.autoplay = true;
      videoRef.current.muted = true;
      
      await new Promise(resolve => {
        videoRef.current.onloadedmetadata = resolve;
      });
      
      liveCanvasRef.current.width = videoRef.current.videoWidth;
      liveCanvasRef.current.height = videoRef.current.videoHeight;
      
      setIsScanning(true);
      scanLoop();
    } catch (error) {
      alert('Camera access failed');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    setDocumentDetected(false);
    
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const scanLoop = async () => {
    if (!isScanning || !videoRef.current) return;
    
    const canvas = liveCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    if (Math.random() < 0.3) {
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = await scanDocument(imageData, { mode: 'detect' });
        
        if (result.success && result.corners) {
          setDocumentDetected(true);
          
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(result.corners.topLeft.x, result.corners.topLeft.y);
          ctx.lineTo(result.corners.topRight.x, result.corners.topRight.y);
          ctx.lineTo(result.corners.bottomRight.x, result.corners.bottomRight.y);
          ctx.lineTo(result.corners.bottomLeft.x, result.corners.bottomLeft.y);
          ctx.closePath();
          ctx.stroke();
        } else {
          setDocumentDetected(false);
        }
      } catch (error) {
        console.error('Detection error:', error);
      }
    }
    
    animationIdRef.current = requestAnimationFrame(scanLoop);
  };

  const captureDocument = async () => {
    if (!videoRef.current) return;
    
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await scanDocument(imageData, { mode: 'extract', output: 'canvas' });
      
      if (result.success && result.output) {
        setCapturedDocument(result.output);
      }
    } catch (error) {
      alert('Capture failed');
    }
  };

  const downloadCaptured = () => {
    if (capturedDocument) {
      const link = document.createElement('a');
      link.download = `document-${Date.now()}.png`;
      link.href = capturedDocument.toDataURL();
      link.click();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div>
      <button onClick={startCamera} disabled={isScanning}>Start Camera</button>
      <button onClick={stopCamera} disabled={!isScanning}>Stop Camera</button>
      <button onClick={captureDocument} disabled={!documentDetected}>Capture</button>
      
      <canvas ref={liveCanvasRef}></canvas>
      
      {capturedDocument && (
        <div>
          <button onClick={downloadCaptured}>Download</button>
        </div>
      )}
    </div>
  );
}

export default LiveScanner;
```