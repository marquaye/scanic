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

The maintained live camera example (React and Vue) lives in the
[Framework guide](./guide/frameworks.md#live-camera-scanning). It shows the
`<video>` as the preview and runs detection about 10 times per second, which
keeps phones from draining their battery.
