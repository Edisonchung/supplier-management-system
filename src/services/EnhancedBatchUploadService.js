// src/services/EnhancedBatchUploadService.js - Minimal stub for build
class EnhancedBatchUploadService {
  constructor() {
    this.isInitialized = false;
  }

  init() {
    this.isInitialized = true;
    console.log('EnhancedBatchUploadService initialized');
  }

  setNotificationFunction(fn) {
    // stub
  }

  notify(message, type) {
    console.log(message);
  }

  async processBatch() {
    return { success: false, error: 'Service temporarily disabled' };
  }

  async processFile() {
    return { success: false, error: 'Service temporarily disabled' };
  }

  getBatchStatus() {
    return { status: 'disabled' };
  }

  getAllBatches() {
    return [];
  }

  clearProcessedFiles() {
    // stub
  }
}

export default new EnhancedBatchUploadService();
