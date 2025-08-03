// public/workers/extraction-worker.js
// Web Worker for batch file processing with user context support

let isProcessing = false;
let currentQueue = [];
let processingIndex = 0;

// Configuration
const API_BASE_URL = 'https://supplier-mcp-server-production.up.railway.app';
const MAX_CONCURRENT = 3;

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
        });
        break;
        
      case 'START_BATCH':
        await startBatchProcessing(payload);
        break;
        
      case 'PROCESS_BATCH':
        await processBatch(payload.files, payload.userContext);
        break;
        
      case 'CANCEL_BATCH':
        cancelBatchProcessing();
        break;
        
      case 'GET_STATUS':
        sendStatus();
        break;
        
      default:
        console.warn('🔧 WORKER: Unknown message type:', type);
        postMessage({
          type: 'WORKER_ERROR',
          payload: {
            message: `Unknown message type: ${type}`,
            type: 'UNKNOWN_MESSAGE_TYPE'
          }
        });
    }
  } catch (error) {
    console.error('🔧 WORKER: Error handling message:', error);
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
  const { files, batchId, options, userContext } = batchData;
  
  isProcessing = true;
  currentQueue = files;
  processingIndex = 0;
  
  console.log(`🚀 Worker starting batch processing: ${batchId} with ${files.length} files`, {
    userContext: userContext ? {
      email: userContext.email,
      role: userContext.role
    } : 'No user context'
  });
  
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
      
      // 🔧 FIX: Process file using REAL API with user context
      const result = await processFileWithRealAPI(file, userContext);
      
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
    
    // Small delay to prevent overwhelming the system
    await new Promise(resolve => setTimeout(resolve, 1000));
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
 * 🔧 UPDATED: Process file using the REAL Railway API with user context
 */
async function processFileWithRealAPI(file, userContext = null) {
  try {
    console.log(`📄 Processing file ${file.name} with base64 data (${file.base64Data.length} chars)`);
    
    // Convert base64 back to File object for API call
    const base64Data = file.base64Data.includes(',') ? 
      file.base64Data.split(',')[1] : file.base64Data;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: file.type });
    const apiFile = new File([blob], file.name, { type: file.type });
    
    // Create FormData for API call
    const formData = new FormData();
    formData.append('file', apiFile);
    formData.append('extractionMode', 'enhanced');
    formData.append('includeOCR', 'true');
    
    // Add user context for dual prompt system
    if (userContext) {
      formData.append('userEmail', userContext.email);
      formData.append('user_email', userContext.email);
      formData.append('user', JSON.stringify({
        email: userContext.email,
        role: userContext.role || 'user',
        uid: userContext.uid,
        displayName: userContext.displayName
      }));
      
      console.log(`🔧 WORKER: Added user context for ${file.name}:`, {
        email: userContext.email,
        role: userContext.role
      });
    } else {
      console.warn(`⚠️ WORKER: No user context for ${file.name} - will use legacy system`);
    }
    
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
    
    // Log dual system metadata
    if (result.extraction_metadata) {
      console.log(`🔧 WORKER: Extraction metadata for ${file.name}:`, {
        system_used: result.extraction_metadata.system_used,
        user_email: result.extraction_metadata.user_email,
        user_is_test_user: result.extraction_metadata.user_is_test_user,
        prompt_name: result.extraction_metadata.prompt_name,
        processing_time: result.extraction_metadata.processing_time
      });
    }
    
    console.log(`🔧 WORKER: Railway API response received for ${file.name}`);
    
    // Return the real API result
    return {
      success: true,
      data: result.data || result,
      metadata: {
        documentType: 'proforma_invoice',
        confidence: result.confidence || 0.85,
        workerProcessed: true,
        fileName: file.name,
        fileSize: file.size,
        dataLength: file.base64Data.length,
        apiEndpoint: `${API_BASE_URL}/api/extract-po`,
        processingMethod: 'real-api',
        // Include dual system metadata
        systemUsed: result.extraction_metadata?.system_used || 'unknown',
        userEmail: result.extraction_metadata?.user_email || 'anonymous',
        promptName: result.extraction_metadata?.prompt_name || 'unknown',
        processingTime: result.extraction_metadata?.processing_time
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
      progress: currentQueue.length > 0 ? processingIndex / currentQueue.length : 0
    }
  });
}

// Configuration
const MAX_CONCURRENT = 3;

console.log('🔧 WORKER: Extraction worker initialized with user context support');
async function processBatch(files, userContext = null) {
  if (isProcessing) {
    console.log('🔧 WORKER: Batch processing already in progress');
    return;
  }
  
  console.log(`🔧 WORKER: Starting batch processing of ${files.length} files`, {
    userContext: userContext ? {
      email: userContext.email,
      role: userContext.role
    } : 'No user context'
  });
  
  isProcessing = true;
  currentQueue = files;
  processingIndex = 0;
  
  const results = [];
  
  try {
    // Process files with concurrency control
    for (let i = 0; i < files.length; i += MAX_CONCURRENT) {
      if (!isProcessing) break; // Check for cancellation
      
      const batch = files.slice(i, i + MAX_CONCURRENT);
      const batchPromises = batch.map(file => processFileWithRealAPI(file, userContext));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        processingIndex = i + index + 1;
        
        if (result.status === 'fulfilled') {
          results.push(result.value);
          postMessage({
            type: 'FILE_PROCESSED',
            payload: {
              result: result.value,
              progress: processingIndex / files.length,
              currentIndex: processingIndex,
              totalFiles: files.length
            }
          });
        } else {
          const failureResult = {
            success: false,
            fileName: batch[index].name,
            error: result.reason?.message || 'Processing failed',
            metadata: {
              fileName: batch[index].name,
              processingMethod: 'worker-failed'
            }
          };
          
          results.push(failureResult);
          postMessage({
            type: 'FILE_FAILED',
            payload: {
              result: failureResult,
              progress: processingIndex / files.length,
              currentIndex: processingIndex,
              totalFiles: files.length
            }
          });
        }
      });
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Send completion message
    postMessage({
      type: 'BATCH_COMPLETE',
      payload: {
        results,
        totalFiles: files.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('🔧 WORKER: Batch processing error:', error);
    postMessage({
      type: 'BATCH_ERROR',
      payload: {
        error: error.message,
        results,
        processedFiles: processingIndex
      }
    });
  } finally {
    isProcessing = false;
    currentQueue = [];
    processingIndex = 0;
  }
}
