// Updated public/workers/extraction-worker.js
// This version handles ArrayBuffer files correctly

let isProcessing = false;
let currentQueue = [];
let processingIndex = 0;

// Listen for messages from main thread
self.addEventListener('message', async function(e) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'PING':
        // Respond to ping to confirm worker is loaded
        postMessage({
          type: 'PONG',
          payload: {
            timestamp: new Date().toISOString(),
            status: 'ready'
          }
        });
        break;
        
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
        postMessage({
          type: 'WORKER_ERROR',
          payload: {
            message: `Unknown message type: ${type}`,
            type: 'UNKNOWN_MESSAGE_TYPE'
          }
        });
    }
  } catch (error) {
    console.error('Worker message handling error:', error);
    postMessage({
      type: 'WORKER_ERROR',
      payload: {
        message: error.message,
        stack: error.stack,
        type: 'MESSAGE_HANDLER_ERROR'
      }
    });
  }
});

async function startBatchProcessing(batchData) {
  const { files, batchId, options } = batchData;
  
  isProcessing = true;
  currentQueue = files;
  processingIndex = 0;
  
  console.log(`🚀 Worker starting batch processing: ${batchId} with ${files.length} files`);
  
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
      console.log(`📄 Worker processing file: ${file.name} (${i + 1}/${files.length})`);
      
      // Send processing update
      postMessage({
        type: 'FILE_PROCESSING',
        payload: {
          batchId,
          fileIndex: file.index || i, // Use original index if available
          fileName: file.name,
          progress: Math.round((i / files.length) * 100)
        }
      });
      
      // Process the file
      const result = await processFile(file);
      
      console.log(`✅ Worker completed file: ${file.name}`);
      
      // Send success result
      postMessage({
        type: 'FILE_COMPLETED',
        payload: {
          batchId,
          fileIndex: file.index || i,
          fileName: file.name,
          result: result,
          progress: Math.round(((i + 1) / files.length) * 100)
        }
      });
      
    } catch (error) {
      console.error(`❌ Worker failed to process file: ${file.name}`, error);
      
      // Send error result
      postMessage({
        type: 'FILE_FAILED',
        payload: {
          batchId,
          fileIndex: file.index || i,
          fileName: file.name,
          error: error.message,
          progress: Math.round(((i + 1) / files.length) * 100)
        }
      });
    }
    
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`🎉 Worker completed batch processing: ${batchId}`);
  
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
  try {
    // Convert ArrayBuffer back to base64 for processing
    let base64Data;
    
    if (file.arrayBuffer) {
      // Convert ArrayBuffer to base64
      base64Data = arrayBufferToBase64(file.arrayBuffer);
      console.log(`📄 Converted ArrayBuffer to base64 for ${file.name}`);
    } else {
      throw new Error('No file data available');
    }
    
    if (!base64Data) {
      throw new Error('Failed to convert file to base64');
    }
    
    // Simulate AI processing (replace with actual API call)
    return new Promise((resolve, reject) => {
      // Simulate processing time (5-10 seconds for testing)
      const processingTime = Math.random() * 5000 + 5000;
      
      setTimeout(() => {
        // Simulate 85% success rate
        if (Math.random() > 0.15) {
          resolve({
            success: true,
            data: {
              piNumber: `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              supplierName: `Supplier ${Math.floor(Math.random() * 100)}`,
              totalAmount: Math.floor(Math.random() * 50000) + 1000,
              currency: 'USD',
              date: new Date().toISOString().split('T')[0],
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
              confidence: Math.random() * 0.3 + 0.7,
              workerProcessed: true,
              fileName: file.name
            }
          });
        } else {
          reject(new Error('Extraction failed - document format not recognized or corrupted'));
        }
      }, processingTime);
    });
  } catch (error) {
    console.error('File processing error in worker:', error);
    throw new Error(`File processing failed: ${error.message}`);
  }
}

function cancelBatchProcessing() {
  isProcessing = false;
  console.log('🛑 Worker batch processing cancelled');
  
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

// Utility function to convert ArrayBuffer to base64
function arrayBufferToBase64(arrayBuffer) {
  try {
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 1024;
    
    // Process in chunks to avoid call stack issues with large files
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, chunk);
    }
    
    return btoa(binary);
  } catch (error) {
    console.error('Error converting ArrayBuffer to base64:', error);
    throw new Error(`ArrayBuffer conversion failed: ${error.message}`);
  }
}

// Enhanced error handling for the worker
self.addEventListener('error', function(error) {
  console.error('Worker global error:', error);
  postMessage({
    type: 'WORKER_ERROR',
    payload: {
      message: error.message,
      filename: error.filename,
      lineno: error.lineno,
      colno: error.colno,
      type: 'GLOBAL_ERROR'
    }
  });
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', function(event) {
  console.error('Worker unhandled promise rejection:', event.reason);
  postMessage({
    type: 'WORKER_ERROR',
    payload: {
      message: event.reason?.message || 'Unhandled promise rejection',
      type: 'UNHANDLED_REJECTION'
    }
  });
  event.preventDefault();
});

// Notify that worker is ready
console.log('✅ Web Worker initialized and ready');
postMessage({
  type: 'WORKER_READY',
  payload: {
    timestamp: new Date().toISOString(),
    status: 'initialized'
  }
});
