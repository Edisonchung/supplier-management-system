/// src/services/EnhancedBatchUploadService.js
// Enhanced batch upload service with Web Worker support for true background processing

import { AIExtractionService } from './ai/AIExtractionService';

class EnhancedBatchUploadService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.maxConcurrentWorkers = 2;
    this.maxFilesPerWorker = 10;
    this.isInitialized = false;
    this.notifications = [];
    this.showNotification = null; // Will be set by component
    
    this.init();
  }

  /**
   * Set notification function from component
   */
  setNotificationFunction(notificationFn) {
    this.showNotification = notificationFn;
  }

  /**
   * Show notification if function is available
   */
  notify(message, type = 'info') {
    if (this.showNotification) {
      this.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Initialize the service
   */
  init() {
    if (this.isInitialized) return;
    
    // Restore queues from localStorage
    this.restoreQueues();
    
    // Set up offline handling
    this.setupOfflineHandler();
    
    // Set up periodic cleanup
    this.setupCleanup();
    
    this.isInitialized = true;
    console.log('EnhancedBatchUploadService initialized');
  }

  /**
   * COMPATIBILITY METHOD: Alias for addBatch to match component expectations
   */
  async startBatch(files, options = {}) {
    console.log('🚀 startBatch called with:', files.length, 'files');
    const result = await this.addBatch(files, options.type || 'proforma_invoice', options);
    
    // Return batch ID for compatibility
    return result.batchId;
  }

  /**
   * Add multiple files to batch processing with Web Worker support
   */
  async addBatch(files, documentType = 'proforma_invoice', options = {}) {
    const batchId = this.generateBatchId();
    const queueKey = `${documentType}_${batchId}`;
    
    const batch = {
      id: batchId,
      type: documentType,
      status: 'queued',
      createdAt: new Date().toISOString(),
      totalFiles: files.length,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      files: [],
      results: [],
      options: {
        priority: options.priority || 'normal',
        notifyWhenComplete: options.notifyWhenComplete !== false,
        autoSave: options.autoSave !== false,
        useWebWorker: options.useWebWorker !== false,
        ...options
      }
    };

    // Process each file and add to batch
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileItem = {
        id: `${batchId}_file_${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'queued',
        progress: 0,
        attempts: 0,
        file: file,
        result: null,
        error: null,
        startedAt: null,
        completedAt: null
      };
      
      batch.files.push(fileItem);
    }

    // Store batch
    this.queues.set(queueKey, batch);
    this.persistQueue(queueKey, batch);

    console.log(`Batch ${batchId} created with ${files.length} files`);
    
    // Start processing
    if (batch.options.useWebWorker && this.canUseWebWorkers()) {
      await this.processWithWebWorker(queueKey, batch);
    } else {
      await this.processWithMainThread(queueKey, batch);
    }

    return {
      batchId,
      queueKey,
      totalFiles: files.length,
      estimatedTime: files.length * 45,
      processingMethod: batch.options.useWebWorker ? 'web-worker' : 'main-thread'
    };
  }

  /**
   * Process batch using Web Worker (true background processing)
   */
  async processWithWebWorker(queueKey, batch) {
  try {
    console.log(`🚀 Starting Web Worker for batch ${batch.id}`);
    
    // Create new Web Worker with enhanced error handling
    const worker = new Worker('/workers/extraction-worker.js');
    this.workers.set(queueKey, worker);
    
    // Set up worker message handlers
    worker.onmessage = (event) => {
      try {
        console.log('📨 Worker message received:', event.data.type);
        this.handleWorkerMessage(queueKey, event.data);
      } catch (error) {
        console.error('Error handling worker message:', error);
        this.handleWorkerError(queueKey, error);
      }
    };
    
    worker.onerror = (error) => {
      console.error('❌ Worker error event:', error);
      this.handleWorkerError(queueKey, {
        message: error.message,
        filename: error.filename,
        lineno: error.lineno,
        type: 'WORKER_ERROR_EVENT'
      });
    };
    
    // Update batch status
    batch.status = 'processing';
    batch.processingMethod = 'web-worker';
    batch.startedAt = new Date().toISOString();
    this.persistQueue(queueKey, batch);
    
    // Convert files to base64 strings (safer for Web Worker transfer)
    const processableFiles = [];
    
    for (let i = 0; i < batch.files.length; i++) {
      const fileItem = batch.files[i];
      
      try {
        console.log(`📄 Converting file ${fileItem.name} to base64...`);
        
        // Convert File to base64 string directly
        const base64Data = await this.fileToBase64(fileItem.file);
        
        processableFiles.push({
          name: fileItem.name,
          size: fileItem.size,
          type: fileItem.type,
          base64Data: base64Data,
          originalIndex: i
        });
        
        console.log(`✅ Converted file ${fileItem.name} to base64 (${base64Data.length} chars)`);
        
      } catch (error) {
        console.error(`❌ Failed to convert file ${fileItem.name}:`, error);
        // Mark this file as failed
        fileItem.status = 'failed';
        fileItem.error = `File conversion failed: ${error.message}`;
        fileItem.completedAt = new Date().toISOString();
        batch.failedFiles++;
        batch.processedFiles++;
        this.persistQueue(queueKey, batch);
      }
    }
    
    if (processableFiles.length === 0) {
      throw new Error('No files could be converted for processing');
    }
    
    // Send files to worker for processing (using regular postMessage, not transferable)
    const workerPayload = {
      files: processableFiles,
      batchId: batch.id,
      options: batch.options
    };
    
    console.log(`📤 Sending START_BATCH to worker with ${processableFiles.length} files`);
    
    // Send without transferable objects
    worker.postMessage({
      type: 'START_BATCH',
      payload: workerPayload
    });
    
    console.log(`✅ Started Web Worker processing for batch ${batch.id}`);
    
  } catch (error) {
    console.error('Failed to start Web Worker:', error);
    this.notify(
      `Failed to start background processing for batch ${batch.id}. Using main thread instead.`, 
      'warning'
    );
    // Fallback to main thread processing
    await this.processWithMainThread(queueKey, batch);
  }
}

// Add this helper method to convert File to base64 string
async fileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File)) {
      reject(new Error('Invalid file object'));
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = () => {
      try {
        const result = reader.result;
        if (!result || typeof result !== 'string') {
          reject(new Error('Failed to read file as data URL'));
          return;
        }
        
        // Extract base64 data (remove data:mime/type;base64, prefix)
        const base64 = result.split(',')[1];
        if (!base64) {
          reject(new Error('Failed to extract base64 data from file'));
          return;
        }
        
        resolve(base64);
      } catch (error) {
        reject(new Error(`Error processing file reader result: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error(`FileReader error: ${reader.error?.message || 'Unknown error'}`));
    };
    
    reader.readAsDataURL(file);
  });
}

  /**
   * Process batch in main thread (traditional approach)
   */
  async processWithMainThread(queueKey, batch) {
    batch.status = 'processing';
    batch.processingMethod = 'main-thread';
    batch.startedAt = new Date().toISOString();
    this.persistQueue(queueKey, batch);
    
    console.log(`Started main thread processing for batch ${batch.id}`);
    
    // Process files sequentially with delay to prevent blocking
    for (let i = 0; i < batch.files.length; i++) {
      const fileItem = batch.files[i];
      
      try {
        fileItem.status = 'processing';
        fileItem.startedAt = new Date().toISOString();
        fileItem.attempts++;
        
        this.persistQueue(queueKey, batch);
        
        console.log(`Processing file: ${fileItem.name}`);
        
        // Use AI extraction service
        const result = await AIExtractionService.extractFromFile(fileItem.file);
        
        if (result.success) {
          fileItem.status = 'completed';
          fileItem.result = result;
          fileItem.progress = 100;
          fileItem.completedAt = new Date().toISOString();
          batch.successfulFiles++;
          batch.results.push(result);

          // Auto-save if enabled
          if (batch.options.autoSave && result.data) {
            await this.autoSaveExtractedData(result.data, batch.type);
          }
        } else {
          throw new Error(result.error || 'Extraction failed');
        }

      } catch (error) {
        console.error(`Failed to process ${fileItem.name}:`, error);
        fileItem.status = 'failed';
        fileItem.error = error.message;
        fileItem.completedAt = new Date().toISOString();
        batch.failedFiles++;
      }
      
      batch.processedFiles++;
      this.persistQueue(queueKey, batch);
      
      // Small delay to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Mark batch as completed
    await this.handleBatchCompletion(queueKey, batch);
  }

  /**
   * Handle messages from Web Worker
   */
  handleWorkerMessage(queueKey, message) {
    const { type, payload } = message;
    const batch = this.queues.get(queueKey);
    if (!batch) return;

    switch (type) {
      case 'WORKER_READY':
        console.log('Worker ready for batch:', batch.id);
        break;

      case 'BATCH_STARTED':
        console.log('Batch processing started in worker:', payload.batchId);
        break;

      case 'FILE_PROCESSING':
        const processingFile = batch.files[payload.fileIndex];
        if (processingFile) {
          processingFile.status = 'processing';
          processingFile.progress = payload.progress;
          processingFile.startedAt = new Date().toISOString();
        }
        this.persistQueue(queueKey, batch);
        break;

      case 'FILE_COMPLETED':
        const completedFile = batch.files[payload.fileIndex];
        if (completedFile) {
          completedFile.status = 'completed';
          completedFile.result = payload.result;
          completedFile.progress = 100;
          completedFile.completedAt = new Date().toISOString();
          batch.successfulFiles++;
          batch.results.push(payload.result);
          
          // Auto-save if enabled
          if (batch.options.autoSave && payload.result.data) {
            this.autoSaveExtractedData(payload.result.data, batch.type);
          }
        }
        batch.processedFiles++;
        this.persistQueue(queueKey, batch);
        break;

      case 'FILE_FAILED':
        const failedFile = batch.files[payload.fileIndex];
        if (failedFile) {
          failedFile.status = 'failed';
          failedFile.error = payload.error;
          failedFile.completedAt = new Date().toISOString();
          batch.failedFiles++;
        }
        batch.processedFiles++;
        this.persistQueue(queueKey, batch);
        break;

      case 'BATCH_COMPLETED':
        this.handleBatchCompletion(queueKey, batch);
        this.terminateWorker(queueKey);
        break;

      case 'BATCH_CANCELLED':
        batch.status = 'cancelled';
        this.persistQueue(queueKey, batch);
        this.terminateWorker(queueKey);
        break;

      case 'WORKER_ERROR':
        console.error('Worker error:', payload);
        this.handleWorkerError(queueKey, payload);
        break;
    }
  }

  /**
   * Handle Web Worker errors
   */
  handleWorkerError(queueKey, error) {
    const batch = this.queues.get(queueKey);
    if (!batch) return;
    
    console.error('Worker error for batch:', batch.id, error);
    
    // Terminate worker and fallback to main thread
    this.terminateWorker(queueKey);
    
    // Reset any processing files to queued
    batch.files.forEach(file => {
      if (file.status === 'processing') {
        file.status = 'queued';
        file.attempts = 0;
      }
    });
    
    // Fallback to main thread processing
    this.processWithMainThread(queueKey, batch);
  }

  /**
   * Terminate Web Worker
   */
  terminateWorker(queueKey) {
    const worker = this.workers.get(queueKey);
    if (worker) {
      worker.terminate();
      this.workers.delete(queueKey);
      console.log('Worker terminated for queue:', queueKey);
    }
  }

  /**
   * Check if Web Workers are supported
   */
  canUseWebWorkers() {
    return typeof Worker !== 'undefined';
  }

  /**
   * Auto-save extracted data
   */
  async autoSaveExtractedData(data, documentType) {
    try {
      if (documentType === 'proforma_invoice') {
        // Import dynamically to avoid circular dependencies
        const { createProformaInvoice } = await import('../hooks/useProformaInvoices');
        await createProformaInvoice(this.mapExtractedDataToPI(data));
      } else if (documentType === 'purchase_order') {
        const { createPurchaseOrder } = await import('../hooks/usePurchaseOrders');
        await createPurchaseOrder(this.mapExtractedDataToPO(data));
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }

  /**
   * Map extracted data to PI format
   */
  mapExtractedDataToPI(data) {
    return {
      piNumber: data.piNumber || '',
      date: data.date || new Date().toISOString().split('T')[0],
      supplierName: data.supplier?.name || '',
      totalAmount: data.grandTotal || data.totalAmount || 0,
      currency: data.currency || 'USD',
      items: (data.products || data.items || []).map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        productCode: item.productCode || '',
        productName: item.productName || item.description || '',
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || 0
      })),
      status: 'draft',
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Handle batch completion
   */
  async handleBatchCompletion(queueKey, batch) {
    console.log(`🎉 Batch ${batch.id} completed!`);
    
    batch.status = 'completed';
    batch.completedAt = new Date().toISOString();
    
    const summary = {
      total: batch.totalFiles,
      successful: batch.successfulFiles,
      failed: batch.failedFiles,
      duration: this.calculateDuration(batch.createdAt, batch.completedAt),
      processingMethod: batch.processingMethod
    };

    // Store notification for offline users
    this.storeNotification(batch.id, summary);

    // Show notification if user is online
    if (batch.options.notifyWhenComplete) {
      if (document.visibilityState === 'visible') {
        this.notify(
          `Batch processing complete! ${summary.successful}/${summary.total} files processed successfully using ${summary.processingMethod}.`,
          summary.failed > 0 ? 'warning' : 'success'
        );
      }
    }

    // Persist final state
    this.persistQueue(queueKey, batch);
    
    // Cleanup worker if exists
    this.terminateWorker(queueKey);
    
    // Schedule cleanup
    setTimeout(() => this.cleanupCompletedBatch(queueKey), 24 * 60 * 60 * 1000);
  }

  /**
   * Cancel a batch by ID
   */
  cancelBatch(batchId) {
    console.log(`🛑 Cancelling batch: ${batchId}`);
    
    for (const [queueKey, batch] of this.queues.entries()) {
      if (batch.id === batchId) {
        const worker = this.workers.get(queueKey);
        
        if (worker) {
          // Send cancel message to worker
          worker.postMessage({ type: 'CANCEL_BATCH' });
        } else {
          // Cancel main thread processing
          batch.status = 'cancelled';
          batch.cancelledAt = new Date().toISOString();
          batch.files.forEach(file => {
            if (file.status === 'queued' || file.status === 'processing') {
              file.status = 'cancelled';
            }
          });
          this.persistQueue(queueKey, batch);
        }
        
        this.notify(`Batch ${batchId} cancelled`, 'info');
        return true;
      }
    }
    
    console.warn(`Batch ${batchId} not found for cancellation`);
    return false;
  }

  /**
   * Get batch status by ID
   */
  getBatchStatus(batchId) {
    for (const batch of this.queues.values()) {
      if (batch.id === batchId) {
        return {
          id: batch.id,
          status: batch.status,
          progress: batch.totalFiles > 0 ? Math.round((batch.processedFiles / batch.totalFiles) * 100) : 0,
          totalFiles: batch.totalFiles,
          processedFiles: batch.processedFiles,
          successfulFiles: batch.successfulFiles,
          failedFiles: batch.failedFiles,
          processingMethod: batch.processingMethod,
          files: batch.files.map(f => ({
            id: f.id,
            name: f.name,
            status: f.status,
            progress: f.progress,
            error: f.error
          })),
          estimatedTimeRemaining: this.calculateEstimatedTime(batch),
          createdAt: batch.createdAt,
          startedAt: batch.startedAt,
          completedAt: batch.completedAt
        };
      }
    }
    return null;
  }

  /**
   * Get all active batches (compatible with existing components)
   */
  getActiveBatches() {
    const batches = [];
    
    for (const [queueKey, batch] of this.queues.entries()) {
      batches.push({
        id: batch.id,
        status: batch.status,
        totalFiles: batch.totalFiles,
        completedFiles: batch.processedFiles,
        successfulFiles: batch.successfulFiles,
        failedFiles: batch.failedFiles,
        files: batch.files.map(f => ({
          id: f.id,
          name: f.name,
          status: f.status,
          progress: f.progress,
          error: f.error,
          extractedData: f.result?.data
        })),
        processingMethod: batch.processingMethod,
        createdAt: batch.createdAt,
        startedAt: batch.startedAt,
        completedAt: batch.completedAt,
        estimatedTimeRemaining: this.calculateEstimatedTime(batch)
      });
    }

    return batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    const stats = {
      totalBatches: this.queues.size,
      activeBatches: 0,
      activeWorkers: this.workers.size,
      completedBatches: 0,
      totalFiles: 0,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      webWorkerSupported: this.canUseWebWorkers()
    };

    for (const batch of this.queues.values()) {
      if (batch.status === 'completed') {
        stats.completedBatches++;
      } else if (batch.status === 'processing') {
        stats.activeBatches++;
      }
      
      stats.totalFiles += batch.totalFiles;
      stats.processedFiles += batch.processedFiles;
      stats.successfulFiles += batch.successfulFiles;
      stats.failedFiles += batch.failedFiles;
    }

    return stats;
  }

  /**
   * Utility methods
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  calculateEstimatedTime(batch) {
    const remainingFiles = batch.totalFiles - batch.processedFiles;
    return remainingFiles * 45; // 45 seconds average per file
  }

  calculateDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  /**
   * Persistence and offline handling
   */
  persistQueue(queueKey, batch) {
    try {
      const persistBatch = {
        ...batch,
        files: batch.files.map(f => ({
          ...f,
          file: null // Remove file object for storage
        }))
      };
      
      localStorage.setItem(`enhanced_batch_${queueKey}`, JSON.stringify(persistBatch));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  restoreQueues() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('enhanced_batch_'));
      
      keys.forEach(key => {
        const batch = JSON.parse(localStorage.getItem(key));
        const queueKey = key.replace('enhanced_batch_', '');
        
        // Only restore non-completed batches
        if (batch.status !== 'completed') {
          // Reset processing files to queued
          batch.files.forEach(file => {
            if (file.status === 'processing') {
              file.status = 'queued';
            }
          });
          
          this.queues.set(queueKey, batch);
        }
      });
      
      console.log(`Restored ${keys.length} batch queues`);
    } catch (error) {
      console.error('Failed to restore queues:', error);
    }
  }

  setupOfflineHandler() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.showPendingNotifications();
      }
    });

    window.addEventListener('beforeunload', () => {
      // Terminate all workers and persist state
      for (const [queueKey, batch] of this.queues.entries()) {
        this.terminateWorker(queueKey);
        this.persistQueue(queueKey, batch);
      }
    });
  }

  setupCleanup() {
    // Clean up completed batches every hour
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      
      for (const [queueKey, batch] of this.queues.entries()) {
        if (batch.status === 'completed' && new Date(batch.completedAt) < cutoff) {
          this.cleanupCompletedBatch(queueKey);
        }
      }
    }, 60 * 60 * 1000); // Every hour
  }

  storeNotification(batchId, summary) {
    this.notifications.push({
      batchId,
      summary,
      timestamp: new Date().toISOString(),
      shown: false
    });
    
    localStorage.setItem('batch_notifications', JSON.stringify(this.notifications));
  }

  showPendingNotifications() {
    const notifications = JSON.parse(localStorage.getItem('batch_notifications') || '[]');
    
    notifications.forEach(notification => {
      if (!notification.shown) {
        this.notify(
          `Batch ${notification.batchId} completed while you were away! ${notification.summary.successful}/${notification.summary.total} files processed via ${notification.summary.processingMethod}.`,
          notification.summary.failed > 0 ? 'warning' : 'success'
        );
        notification.shown = true;
      }
    });

    localStorage.setItem('batch_notifications', JSON.stringify(notifications));
  }

  cleanupCompletedBatch(queueKey) {
    this.queues.delete(queueKey);
    localStorage.removeItem(`enhanced_batch_${queueKey}`);
    console.log(`Cleaned up completed batch: ${queueKey}`);
  }
}

// Export singleton instance
const enhancedBatchUploadService = new EnhancedBatchUploadService();
export default enhancedBatchUploadService;
