// Fixed public/workers/extraction-worker.js
// This version calls the REAL Railway API instead of using mock data

let isProcessing = false;
let currentQueue = [];
let processingIndex = 0;

// Railway backend URL (same as single upload uses)
const API_BASE_URL = 'https://supplier-mcp-server-production.up.railway.app';

// Listen for messages from main thread
self.addEventListener('message', async function(e) {
  const { type, payload } = e.data;
  
  try {
    switch (type) {
      case 'PING':
        postMessage({
          type: 'PONG',
          payload: {
            timestamp: new Date().toISOString(),
            status: 'ready'
          }
    
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
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
      console.log(`📄 File data available: ${file.base64Data ? 'YES' : 'NO'}, length: ${file.base64Data?.length || 0}`);
      
      // Send processing update
      postMessage({
        type: 'FILE_PROCESSING',
        payload: {
          batchId,
          fileIndex: file.originalIndex !== undefined ? file.originalIndex : i,
          fileName: file.name,
          progress: Math.round((i / files.length) * 100)
        }
      });
      
      // 🔧 FIX: Process file using REAL API instead of mock data
      const result = await processFileWithRealAPI(file);
      
      console.log(`✅ Worker completed file: ${file.name}`);
      
      // Send success result
      postMessage({
        type: 'FILE_COMPLETED',
        payload: {
          batchId,
          fileIndex: file.originalIndex !== undefined ? file.originalIndex : i,
          fileName: file.name,
          result: result,
          progress: Math.round(((i + 1) / files.length) * 100),
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error(`❌ Worker failed to process ${file.name}:`, error);
      
      // Send error result
      postMessage({
        type: 'FILE_ERROR',
        payload: {
          batchId,
          fileIndex: file.originalIndex !== undefined ? file.originalIndex : i,
          fileName: file.name,
          error: error.message,
          progress: Math.round(((i + 1) / files.length) * 100),
          timestamp: new Date().toISOString()
        }
      });
    }
  }
  
  // Mark batch as completed
  isProcessing = false;
  console.log(`🎉 Worker completed batch processing: ${batchId}`);
  
  postMessage({
    type: 'BATCH_COMPLETED',
    payload: {
      batchId,
      totalFiles: files.length,
      processedFiles: files.length,
      completedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * 🔧 FIXED: Process file using the REAL Railway API (same as single upload)
 */
async function processFileWithRealAPI(file) {
  try {
    console.log(`📄 Processing file ${file.name} with base64 data (${file.base64Data.length} chars)`);
    
    // Convert base64 back to File object for API call
    const byteCharacters = atob(file.base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.type });
    const apiFile = new File([blob], file.name, { type: file.type });
    
    // Create FormData for API call (same format as single upload)
    const formData = new FormData();
    formData.append('file', apiFile);
    formData.append('extractionMode', 'enhanced');
    formData.append('includeOCR', 'true');
    
    console.log(`🔧 WORKER: Calling Railway API at ${API_BASE_URL}/api/extract-po`);
    
    // Call the REAL Railway API endpoint
    const response = await fetch(`${API_BASE_URL}/api/extract-po`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`🔧 WORKER: Railway API response received for ${file.name}`);
    
    // Return the real API result (not mock data)
    return {
      success: true,
      data: result.data || result, // Handle different response formats
      metadata: {
        documentType: 'proforma_invoice',
        confidence: result.confidence || 0.85,
        workerProcessed: true,
        fileName: file.name,
        fileSize: file.size,
        dataLength: file.base64Data.length,
        apiEndpoint: `${API_BASE_URL}/api/extract-po`,
        processingMethod: 'real-api'
      }
    };
    
  } catch (error) {
    console.error('🔧 WORKER: File processing error:', error);
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
      progress: currentQueue.length > 0 ? 
        Math.round((processingIndex / currentQueue.length) * 100) : 0
    }
  });
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
console.log('✅ Web Worker initialized and ready for REAL API processing');
postMessage({
  type: 'WORKER_READY',
  payload: {
    timestamp: new Date().toISOString(),
    status: 'initialized',
    apiEndpoint: `${API_BASE_URL}/api/extract-po`,
    processingMethod: 'real-api'
  }
});
