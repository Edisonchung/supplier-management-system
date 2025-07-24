// public/workers/extraction-worker.js
// Web Worker for background AI extraction processing

let isProcessing = false;
let currentQueue = [];
let processingIndex = 0;

// Listen for messages from main thread
self.addEventListener('message', async function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'START_BATCH':
      await startBatchProcessing(payload);
      break;
    case 'CANCEL_BATCH':
      cancelBatchProcessing();
      break;
    case 'GET_STATUS':
      sendStatus();
      break;
    default:
      console.warn('Unknown message type:', type);
  }
});

async function startBatchProcessing(batchData) {
  const { files, batchId, options } = batchData;
  
  isProcessing = true;
  currentQueue = files;
  processingIndex = 0;
  
  // Send initial status
  postMessage({
    type: 'BATCH_STARTED',
    payload: {
      batchId,
      totalFiles: files.length,
      currentIndex: 0
    }
  });
  
  // Process files sequentially
  for (let i = 0; i < files.length; i++) {
    if (!isProcessing) break; // Check for cancellation
    
    processingIndex = i;
    const file = files[i];
    
    try {
      // Send processing update
      postMessage({
        type: 'FILE_PROCESSING',
        payload: {
          batchId,
          fileIndex: i,
          fileName: file.name,
          progress: Math.round((i / files.length) * 100)
        }
      });
      
      // Simulate file processing (in real implementation, this would call AI service)
      const result = await processFile(file);
      
      // Send success result
      postMessage({
        type: 'FILE_COMPLETED',
        payload: {
          batchId,
          fileIndex: i,
          fileName: file.name,
          result: result,
          progress: Math.round(((i + 1) / files.length) * 100)
        }
      });
      
    } catch (error) {
      // Send error result
      postMessage({
        type: 'FILE_FAILED',
        payload: {
          batchId,
          fileIndex: i,
          fileName: file.name,
          error: error.message,
          progress: Math.round(((i + 1) / files.length) * 100)
        }
      });
    }
    
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Send completion message
  postMessage({
    type: 'BATCH_COMPLETED',
    payload: {
      batchId,
      totalFiles: files.length,
      processedFiles: files.length,
      completedAt: new Date().toISOString()
    }
  });
  
  isProcessing = false;
}

async function processFile(file) {
  // Convert file to base64 for processing
  const base64Data = await fileToBase64(file);
  
  // In a real implementation, this would make an API call to your extraction service
  // For now, we'll simulate the processing
  return new Promise((resolve, reject) => {
    // Simulate processing time (30-70 seconds)
    const processingTime = Math.random() * 40000 + 30000;
    
    setTimeout(() => {
      // Simulate 90% success rate
      if (Math.random() > 0.1) {
        resolve({
          success: true,
          data: {
            piNumber: `PI-${Date.now()}`,
            supplierName: `Supplier ${Math.floor(Math.random() * 100)}`,
            totalAmount: Math.floor(Math.random() * 50000) + 1000,
            currency: 'USD',
            items: [
              {
                productName: `Product ${Math.floor(Math.random() * 1000)}`,
                quantity: Math.floor(Math.random() * 10) + 1,
                unitPrice: Math.floor(Math.random() * 1000) + 100
              }
            ]
          },
          metadata: {
            documentType: 'proforma_invoice',
            processingTime: processingTime,
            confidence: Math.random() * 0.3 + 0.7
          }
        });
      } else {
        reject(new Error('Extraction failed - document format not recognized'));
      }
    }, processingTime);
  });
}

function cancelBatchProcessing() {
  isProcessing = false;
  
  postMessage({
    type: 'BATCH_CANCELLED',
    payload: {
      processedFiles: processingIndex,
      totalFiles: currentQueue.length
    }
  });
}

function sendStatus() {
  postMessage({
    type: 'STATUS_UPDATE',
    payload: {
      isProcessing,
      currentIndex: processingIndex,
      totalFiles: currentQueue.length,
      progress: currentQueue.length > 0 ? Math.round((processingIndex / currentQueue.length) * 100) : 0
    }
  });
}

// Utility function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}

// Handle errors
self.addEventListener('error', function(error) {
  postMessage({
    type: 'WORKER_ERROR',
    payload: {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno
    }
  });
});

// Notify that worker is ready
postMessage({
  type: 'WORKER_READY',
  payload: {
    timestamp: new Date().toISOString()
  }
});
