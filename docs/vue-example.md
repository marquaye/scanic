
# Using Scanic with Vue.js

## Installation

```bash
npm install scanic
```

## Composition API Example

```vue
<template>
  <div>
    <input type="file" accept="image/*" @change="handleFileSelect" />
    <button v-if="selectedImage" @click="processDocument" :disabled="isProcessing">
      {{ isProcessing ? 'Processing...' : 'Scan Document' }}
    </button>
    <button v-if="result && result.success" @click="downloadResult">Download</button>
    <div v-if="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { scanDocument } from 'scanic';

const selectedImage = ref(null);
const isProcessing = ref(false);
const result = ref(null);
const error = ref(null);

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        selectedImage.value = img;
        result.value = null;
        error.value = null;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

const processDocument = async () => {
  if (!selectedImage.value) return;
  
  isProcessing.value = true;
  error.value = null;

  try {
    const scanResult = await scanDocument(selectedImage.value, {
      mode: 'extract',
      output: 'canvas'
    });
    
    result.value = scanResult;
    
    if (!scanResult.success) {
      error.value = 'No document detected';
    }
  } catch (err) {
    error.value = `Error: ${err.message}`;
  } finally {
    isProcessing.value = false;
  }
};

const downloadResult = () => {
  if (result.value && result.value.output) {
    const link = document.createElement('a');
    link.download = 'scanned-document.png';
    link.href = result.value.output.toDataURL();
    link.click();
  }
};
</script>
```

## Options API Example

```vue
<template>
  <div>
    <input type="file" accept="image/*" @change="handleFileSelect" />
    <button v-if="selectedImage" @click="processDocument" :disabled="isProcessing">
      {{ isProcessing ? 'Processing...' : 'Scan Document' }}
    </button>
    <button v-if="result && result.success" @click="downloadResult">Download</button>
    <div v-if="error">{{ error }}</div>
  </div>
</template>

<script>
import { scanDocument } from 'scanic';

export default {
  data() {
    return {
      selectedImage: null,
      isProcessing: false,
      result: null,
      error: null
    };
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.selectedImage = img;
            this.result = null;
            this.error = null;
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    },

    async processDocument() {
      if (!this.selectedImage) return;
      
      this.isProcessing = true;
      this.error = null;

      try {
        const result = await scanDocument(this.selectedImage, {
          mode: 'extract',
          output: 'canvas'
        });
        
        this.result = result;
        
        if (!result.success) {
          this.error = 'No document detected';
        }
      } catch (err) {
        this.error = `Error: ${err.message}`;
      } finally {
        this.isProcessing = false;
      }
    },

    downloadResult() {
      if (this.result && this.result.output) {
        const link = document.createElement('a');
        link.download = 'scanned-document.png';
        link.href = this.result.output.toDataURL();
        link.click();
      }
    }
  }
};
</script>
```

## Live Camera Scanning

```vue
<template>
  <div>
    <button @click="startCamera" :disabled="isScanning">Start Camera</button>
    <button @click="stopCamera" :disabled="!isScanning">Stop Camera</button>
    <button @click="captureDocument" :disabled="!documentDetected">Capture</button>
    
    <canvas ref="liveCanvas"></canvas>
    
    <div v-if="capturedDocument">
      <button @click="downloadCaptured">Download</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { scanDocument } from 'scanic';

const isScanning = ref(false);
const documentDetected = ref(false);
const capturedDocument = ref(null);

const liveCanvas = ref(null);

let stream = null;
let video = null;
let animationId = null;

const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    
    video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    
    await new Promise(resolve => {
      video.onloadedmetadata = resolve;
    });
    
    liveCanvas.value.width = video.videoWidth;
    liveCanvas.value.height = video.videoHeight;
    
    isScanning.value = true;
    scanLoop();
  } catch (error) {
    alert('Camera access failed');
  }
};

const stopCamera = () => {
  isScanning.value = false;
  documentDetected.value = false;
  
  if (animationId) cancelAnimationFrame(animationId);
  if (stream) stream.getTracks().forEach(track => track.stop());
};

const scanLoop = async () => {
  if (!isScanning.value || !video) return;
  
  const canvas = liveCanvas.value;
  const ctx = canvas.getContext('2d');
  
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  if (Math.random() < 0.3) {
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await scanDocument(imageData, { mode: 'detect' });
      
      if (result.success && result.corners) {
        documentDetected.value = true;
        
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
        documentDetected.value = false;
      }
    } catch (error) {
      console.error('Detection error:', error);
    }
  }
  
  animationId = requestAnimationFrame(scanLoop);
};

const captureDocument = async () => {
  if (!video) return;
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const result = await scanDocument(imageData, { mode: 'extract', output: 'canvas' });
    
    if (result.success && result.output) {
      capturedDocument.value = result.output;
    }
  } catch (error) {
    alert('Capture failed');
  }
};

const downloadCaptured = () => {
  if (capturedDocument.value) {
    const link = document.createElement('a');
    link.download = `document-${Date.now()}.png`;
    link.href = capturedDocument.value.toDataURL();
    link.click();
  }
};

onUnmounted(() => {
  stopCamera();
});
</script>
```
