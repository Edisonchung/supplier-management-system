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
      process
