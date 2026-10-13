
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

The maintained live camera example (React and Vue) lives in the
[Framework guide](./guide/frameworks.md#live-camera-scanning). It shows the
`<video>` as the preview and runs detection about 10 times per second, which
keeps phones from draining their battery.
