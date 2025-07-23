// src/services/BatchUploadService.js
// Comprehensive batch upload service with offline processing capabilities

import { AIExtractionService } from './ai/AIExtractionService';
import { showNotification } from '../utils/notifications';

class BatchUploadService {
  constructor() {
    this.queues = new Map(); // Store multiple queues by type
    this.workers = new Map(); // Web workers for background processing
    this.maxConcurrent = 3; // Maximum concurrent extractions
    this.retryAttempts = 3;
    this.isInitialized = false;
    
    this.init();
  }

  /**
   * Initialize the service and set up persistence
   */
  init() {
    if (this.isInitialized) return;
    
    // Restore queues from localStorage on page load
    this.restoreQueues();
    
    // Set up periodic queue processing
    this.setupQueueProcessor();
    
    // Set up visibility change handler for offline processing
    this.setupOfflineHandler();
    
    this.isInitialized = true;
    console.log('BatchUploadService initialized');
  }

  /**
   * Add multiple files to batch processing queue
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
      options: {
        priority: options.priority || 'normal',
        notifyWhenComplete: options.notifyWhenComplete !== false,
        autoSave: options.autoSave !== false,
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
        status: 'queued', // queued, processing, completed, failed, retrying
        progress: 0,
        attempts: 0,
        file: file, // Store file object for processing
        result: null,
        error: null,
        startedAt: null,
        completedAt: null
      };
      
      batch.files.push(fileItem);
    }

    // Store batch in memory and localStorage
    this.queues.set(queueKey, batch);
    this.persistQueue(queueKey, batch);

    console.log(`Batch ${batchId} created with ${files.length} files`);
    
    // Start processing immediately if not at capacity
    this.processNextInQueue();

    return {
      batchId,
      queueKey,
      totalFiles: files.length,
      estimatedTime: files.length * 45 // 45 seconds average per file
    };
  }

  /**
   * Process the next items in all queues
   */
  async processNextInQueue() {
    const activeProcessing = this.getActiveProcessingCount();
    
    if (activeProcessing >= this.maxConcurrent) {
      console.log(`Max concurrent processing reached (${this.maxConcurrent})`);
      return;
    }

    // Find next queued file across all batches
    const nextFile = this.findNextQueuedFile();
    
    if (!nextFile) {
      console.log('No files in queue to process');
      return;
    }

    await this.processFile(nextFile.queueKey, nextFile.fileId);
    
    // Continue processing if capacity allows
    if (activeProcessing < this.maxConcurrent - 1) {
      setTimeout(() => this.processNextInQueue(), 100);
    }
  }

  /**
   * Process a single file from the queue
   */
  async processFile(queueKey, fileId) {
    const batch = this.queues.get(queueKey);
    if (!batch) return;

    const fileItem = batch.files.find(f => f.id === fileId);
    if (!fileItem || fileItem.status !== 'queued') return;

    // Update status to processing
    fileItem.status = 'processing';
    fileItem.startedAt = new Date().toISOString();
    fileItem.attempts++;
    batch.processedFiles++;

    this.updateBatchStatus(queueKey);
    this.persistQueue(queueKey, batch);

    try {
      console.log(`Processing file: ${fileItem.name}`);
      
      // Use AI extraction service
      const result = await AIExtractionService.extractFromFile(fileItem.file);
      
      if (result.success) {
        fileItem.status = 'completed';
        fileItem.result = result;
        fileItem.progress = 100;
        fileItem.completedAt = new Date().toISOString();
        batch.successfulFiles++;

        // Auto-save if enabled
        if (batch.options.autoSave && result.data) {
          await this.autoSaveExtractedData(result.data, batch.type);
        }

        console.log(`✅ Successfully processed: ${fileItem.name}`);
      } else {
        throw new Error(result.error || 'Extraction failed');
      }

    } catch (error) {
      console.error(`❌ Failed to process ${fileItem.name}:`, error);
      
      // Retry logic
      if (fileItem.attempts < this.retryAttempts) {
        fileItem.status = 'retrying';
        setTimeout(() => {
          fileItem.status = 'queued';
          this.processNextInQueue();
        }, 5000 * fileItem.attempts); // Exponential backoff
      } else {
        fileItem.status = 'failed';
        fileItem.error = error.message;
        batch.failedFiles++;
      }
    }

    // Update batch status
    this.updateBatchStatus(queueKey);
    this.persistQueue(queueKey, batch);

    // Check if batch is complete
    if (this.isBatchComplete(batch)) {
      await this.handleBatchCompletion(queueKey, batch);
    }

    // Continue processing next file
    setTimeout(() => this.processNextInQueue(), 1000);
  }

  /**
   * Auto-save extracted data to the appropriate module
   */
  async autoSaveExtractedData(data, documentType) {
    try {
      if (documentType === 'proforma_invoice') {
        // Import the PI hook dynamically to avoid circular dependencies
        const { createProformaInvoice } = await import('../hooks/useProformaInvoices');
        await createProformaInvoice(data);
      } else if (documentType === 'purchase_order') {
        const { createPurchaseOrder } = await import('../hooks/usePurchaseOrders');
        await createPurchaseOrder(data);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
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
      duration: this.calculateDuration(batch.createdAt, batch.completedAt)
    };

    // Show notification if user is online
    if (batch.options.notifyWhenComplete) {
      if (document.visibilityState === 'visible') {
        showNotification(
          `Batch processing complete! ${summary.successful}/${summary.total} files processed successfully.`,
          summary.failed > 0 ? 'warning' : 'success'
        );
      } else {
        // Store notification for when user returns
        this.storeOfflineNotification(batch.id, summary);
      }
    }

    // Persist final state
    this.persistQueue(queueKey, batch);
    
    // Optional: Auto-cleanup completed batches after 24 hours
    setTimeout(() => this.cleanupCompletedBatch(queueKey), 24 * 60 * 60 * 1000);
  }

  /**
   * Get batch status and progress
   */
  getBatchStatus(batchId) {
    const queueKey = Array.from(this.queues.keys()).find(key => key.includes(batchId));
    if (!queueKey) return null;

    const batch = this.queues.get(queueKey);
    
    return {
      id: batch.id,
      status: batch.status,
      progress: batch.totalFiles > 0 ? Math.round((batch.processedFiles / batch.totalFiles) * 100) : 0,
      totalFiles: batch.totalFiles,
      processedFiles: batch.processedFiles,
      successfulFiles: batch.successfulFiles,
      failedFiles: batch.failedFiles,
      files: batch.files.map(f => ({
        id: f.id,
        name: f.name,
        status: f.status,
        progress: f.progress,
        error: f.error
      })),
      estimatedTimeRemaining: this.calculateEstimatedTime(batch),
      createdAt: batch.createdAt,
      completedAt: batch.completedAt
    };
  }

  /**
   * Get all active batches
   */
  getActiveBatches() {
    const batches = [];
    
    for (const [queueKey, batch] of this.queues.entries()) {
      if (batch.status !== 'completed' && batch.status !== 'cancelled') {
        batches.push(this.getBatchStatus(batch.id));
      }
    }

    return batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Cancel a batch
   */
  cancelBatch(batchId) {
    const queueKey = Array.from(this.queues.keys()).find(key => key.includes(batchId));
    if (!queueKey) return false;

    const batch = this.queues.get(queueKey);
    batch.status = 'cancelled';
    
    // Cancel any queued files
    batch.files.forEach(file => {
      if (file.status === 'queued') {
        file.status = 'cancelled';
      }
    });

    this.persistQueue(queueKey, batch);
    return true;
  }

  /**
   * Retry failed files in a batch
   */
  retryFailedFiles(batchId) {
    const queueKey = Array.from(this.queues.keys()).find(key => key.includes(batchId));
    if (!queueKey) return false;

    const batch = this.queues.get(queueKey);
    
    batch.files.forEach(file => {
      if (file.status === 'failed') {
        file.status = 'queued';
        file.attempts = 0;
        file.error = null;
      }
    });

    batch.status = 'processing';
    this.persistQueue(queueKey, batch);
    this.processNextInQueue();
    
    return true;
  }

  /**
   * Utility methods
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getActiveProcessingCount() {
    let count = 0;
    for (const batch of this.queues.values()) {
      count += batch.files.filter(f => f.status === 'processing').length;
    }
    return count;
  }

  findNextQueuedFile() {
    // Priority: normal batches first, then high priority
    const priorities = ['high', 'normal', 'low'];
    
    for (const priority of priorities) {
      for (const [queueKey, batch] of this.queues.entries()) {
        if (batch.options.priority === priority && batch.status !== 'completed' && batch.status !== 'cancelled') {
          const queuedFile = batch.files.find(f => f.status === 'queued');
          if (queuedFile) {
            return { queueKey, fileId: queuedFile.id };
          }
        }
      }
    }
    
    return null;
  }

  updateBatchStatus(queueKey) {
    const batch = this.queues.get(queueKey);
    if (!batch) return;

    const hasProcessing = batch.files.some(f => f.status === 'processing');
    const hasQueued = batch.files.some(f => f.status === 'queued' || f.status === 'retrying');
    
    if (hasProcessing || hasQueued) {
      batch.status = 'processing';
    } else if (batch.processedFiles === batch.totalFiles) {
      batch.status = 'completed';
    }
  }

  isBatchComplete(batch) {
    return batch.files.every(f => 
      f.status === 'completed' || f.status === 'failed' || f.status === 'cancelled'
    );
  }

  calculateEstimatedTime(batch) {
    const remainingFiles = batch.files.filter(f => 
      f.status === 'queued' || f.status === 'retrying'
    ).length;
    
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
   * Persistence methods
   */
  persistQueue(queueKey, batch) {
    try {
      // Store without file objects to avoid localStorage size limits
      const persistBatch = {
        ...batch,
        files: batch.files.map(f => ({
          ...f,
          file: null // Remove file object for storage
        }))
      };
      
      localStorage.setItem(`batch_queue_${queueKey}`, JSON.stringify(persistBatch));
    } catch (error) {
      console.error('Failed to persist queue:', error);
    }
  }

  restoreQueues() {
    try {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('batch_queue_'));
      
      keys.forEach(key => {
        const batch = JSON.parse(localStorage.getItem(key));
        const queueKey = key.replace('batch_queue_', '');
        
        // Only restore non-completed batches
        if (batch.status !== 'completed') {
          // Reset processing files to queued (in case app was closed during processing)
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

  setupQueueProcessor() {
    // Process queues every 10 seconds
    setInterval(() => {
      if (this.queues.size > 0) {
        this.processNextInQueue();
      }
    }, 10000);
  }

  setupOfflineHandler() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.showPendingNotifications();
        this.processNextInQueue(); // Resume processing if needed
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      // Ensure all queues are persisted
      for (const [queueKey, batch] of this.queues.entries()) {
        this.persistQueue(queueKey, batch);
      }
    });
  }

  storeOfflineNotification(batchId, summary) {
    const notifications = JSON.parse(localStorage.getItem('offline_notifications') || '[]');
    notifications.push({
      batchId,
      summary,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('offline_notifications', JSON.stringify(notifications));
  }

  showPendingNotifications() {
    const notifications = JSON.parse(localStorage.getItem('offline_notifications') || '[]');
    
    notifications.forEach(notification => {
      showNotification(
        `Batch ${notification.batchId} completed while you were away! ${notification.summary.successful}/${notification.summary.total} files processed.`,
        notification.summary.failed > 0 ? 'warning' : 'success'
      );
    });

    // Clear shown notifications
    localStorage.removeItem('offline_notifications');
  }

  cleanupCompletedBatch(queueKey) {
    this.queues.delete(queueKey);
    localStorage.removeItem(`batch_queue_${queueKey}`);
    console.log(`Cleaned up completed batch: ${queueKey}`);
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    const stats = {
      totalBatches: this.queues.size,
      activeBatches: 0,
      completedBatches: 0,
      totalFiles: 0,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0
    };

    for (const batch of this.queues.values()) {
      if (batch.status === 'completed') {
        stats.completedBatches++;
      } else {
        stats.activeBatches++;
      }
      
      stats.totalFiles += batch.totalFiles;
      stats.processedFiles += batch.processedFiles;
      stats.successfulFiles += batch.successfulFiles;
      stats.failedFiles += batch.failedFiles;
    }

    return stats;
  }
}

// Export singleton instance
const batchUploadService = new BatchUploadService();
export default batchUploadService;
