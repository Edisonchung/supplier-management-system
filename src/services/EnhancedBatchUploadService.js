// src/services/EnhancedBatchUploadService.js
// Enhanced batch upload service with Web Worker support, duplicate prevention, and DOCUMENT STORAGE

import { AIExtractionService } from './ai/AIExtractionService';
import { ExtractionService } from './ai/ExtractionService'; // ✅ NEW: Import for dual prompt system

class EnhancedBatchUploadService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.maxConcurrentWorkers = 2;
    this.maxFilesPerWorker = 10;
    this.isInitialized = false;
    this.notifications = [];
    this.showNotification = null; // Will be set by component
    this.processedFiles = new Set(); // Track processed files to prevent duplicates
    this.documentStorageService = null; // Document storage service
    this.extractionService = ExtractionService; // ✅ NEW: Reference to extraction service

    
    this.init();
  }

  /**
   * ✅ NEW: Get current user from localStorage or context
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user for batch processing:', error);
      return null;
    }
  }
  
  /**
   * ✅ NEW: Initialize document storage service
   */
  async initializeDocumentStorage() {
  if (!this.documentStorageService && typeof window !== 'undefined') {
    try {
      // ✅ UPDATED: Import from the correct path and handle new export structure
      const module = await import('./DocumentStorageService.js');
      
      // Try different export patterns
      let DocumentStorageService;
      
      if (module.DocumentStorageService) {
        // Named export
        DocumentStorageService = module.DocumentStorageService;
      } else if (module.default) {
        // Default export
        DocumentStorageService = module.default;
        
        // Check if default export is an instance, not a class
        if (typeof DocumentStorageService === 'object' && DocumentStorageService.constructor) {
          // It's already an instance, use it directly
          this.documentStorageService = DocumentStorageService;
          console.log('📁 DocumentStorageService instance imported for batch uploads');
          return;
        }
      }
      
      // If we have a constructor, create new instance
      if (DocumentStorageService && typeof DocumentStorageService === 'function') {
        this.documentStorageService = new DocumentStorageService();
        console.log('📁 DocumentStorageService initialized for batch uploads');
      } else if (DocumentStorageService && typeof DocumentStorageService === 'object') {
        // It's already an instance
        this.documentStorageService = DocumentStorageService;
        console.log('📁 DocumentStorageService instance loaded for batch uploads');
      } else {
        console.warn('⚠️ DocumentStorageService not found or not a constructor');
        this.documentStorageService = null;
      }
    } catch (error) {
      console.warn('⚠️ Could not initialize DocumentStorageService:', error.message);
      // Fallback: disable document storage for batch uploads
      this.documentStorageService = null;
    }
  }
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
    
    // Load processed files tracking
    this.loadProcessedFiles();
    
    // Set up offline handling
    this.setupOfflineHandler();
    
    // Set up periodic cleanup
    this.setupCleanup();
    
    // ✅ NEW: Initialize document storage
    this.initializeDocumentStorage();
    
    this.isInitialized = true;
    console.log('EnhancedBatchUploadService initialized');
  }

  /**
   * Load processed files tracking from localStorage
   */
  loadProcessedFiles() {
    try {
      const processedFiles = JSON.parse(localStorage.getItem('processed_files') || '[]');
      this.processedFiles = new Set(processedFiles);
      console.log(`Loaded ${this.processedFiles.size} processed file records`);
    } catch (error) {
      console.error('Failed to load processed files:', error);
      this.processedFiles = new Set();
    }
  }

  /**
   * Save processed files tracking to localStorage
   */
  saveProcessedFiles() {
    try {
      const processedFilesArray = Array.from(this.processedFiles);
      localStorage.setItem('processed_files', JSON.stringify(processedFilesArray));
    } catch (error) {
      console.error('Failed to save processed files:', error);
    }
  }

  /**
   * Generate a unique file identifier based on name and size
   */
  generateFileId(fileName, fileSize) {
    return `${fileName}_${fileSize}`;
  }

  /**
   * Check if a file has already been processed
   */
  isFileAlreadyProcessed(fileName, fileSize) {
    const fileId = this.generateFileId(fileName, fileSize);
    return this.processedFiles.has(fileId);
  }

  /**
   * Mark a file as processed
   */
  markFileAsProcessed(fileName, fileSize) {
    const fileId = this.generateFileId(fileName, fileSize);
    this.processedFiles.add(fileId);
    this.saveProcessedFiles();
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
    
    // Filter out already processed files
    const newFiles = [];
    const skippedFiles = [];
    
    for (const file of files) {
      if (this.isFileAlreadyProcessed(file.name, file.size)) {
        skippedFiles.push(file.name);
        console.log(`⚠️ Skipping already processed file: ${file.name}`);
      } else {
        newFiles.push(file);
      }
    }
    
    if (skippedFiles.length > 0) {
      this.notify(
        `Skipped ${skippedFiles.length} already processed file${skippedFiles.length > 1 ? 's' : ''}: ${skippedFiles.join(', ')}`,
        'info'
      );
    }
    
    if (newFiles.length === 0) {
      this.notify('All files have already been processed. No new files to process.', 'warning');
      return {
        batchId,
        queueKey,
        totalFiles: 0,
        estimatedTime: 0,
        processingMethod: 'none',
        skippedFiles: skippedFiles.length
      };
    }
    
    const batch = {
      id: batchId,
      type: documentType,
      status: 'queued',
      createdAt: new Date().toISOString(),
      totalFiles: newFiles.length,
      processedFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      skippedFiles: skippedFiles.length,
      files: [],
      results: [],
      options: {
        priority: options.priority || 'normal',
        notifyWhenComplete: options.notifyWhenComplete !== false,
        autoSave: options.autoSave !== false,
        useWebWorker: options.useWebWorker !== false,
        storeDocuments: options.storeDocuments !== false, // ✅ NEW: Enable document storage
        ...options
      }
    };

    // Process each new file and add to batch
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const fileItem = {
        id: `${batchId}_file_${i}`,
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'queued',
        progress: 0,
        attempts: 0,
        file: file, // ✅ PRESERVE: Keep original file for document storage
        originalFile: file, // ✅ NEW: Explicit reference to original file
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

    console.log(`Batch ${batchId} created with ${newFiles.length} new files (${skippedFiles.length} skipped)`);
    
    // Start processing
    if (batch.options.useWebWorker && this.canUseWebWorkers()) {
      await this.processWithWebWorker(queueKey, batch);
    } else {
      await this.processWithMainThread(queueKey, batch);
    }

    return {
      batchId,
      queueKey,
      totalFiles: newFiles.length,
      estimatedTime: newFiles.length * 45,
      processingMethod: batch.options.useWebWorker ? 'web-worker' : 'main-thread',
      skippedFiles: skippedFiles.length
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
      
// ✅ NEW: Get current user context for dual prompt system
      const userContext = this.getCurrentUser();
      console.log('🔧 User context for batch processing:', {
        hasUser: !!userContext,
        email: userContext?.email,
        role: userContext?.role
      });
      
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
      
      // ✅ UPDATED: Send files to worker with user context for dual prompt system
      const workerPayload = {
        files: processableFiles,
        batchId: batch.id,
        options: batch.options,
        userContext: userContext // ← ADD THIS LINE
      };
      
      console.log(`📤 Sending START_BATCH to worker with ${processableFiles.length} files and user context`);
      
      // Send to worker with user context
      worker.postMessage({
        type: 'START_BATCH',
        payload: workerPayload
      });
      
      console.log(`✅ Started Web Worker processing for batch ${batch.id} with dual prompt system support`);
      
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
   * ✅ UPDATED: Process batch in main thread with user context
   */
  async processWithMainThread(queueKey, batch) {
    console.log(`🔄 Processing batch ${batch.id} in main thread`);
    
    // Get user context for dual prompt system
    const userContext = this.getCurrentUser();
    console.log('🔧 User context for main thread processing:', {
      hasUser: !!userContext,
      email: userContext?.email,
      role: userContext?.role
    });
    
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
        
        // ✅ UPDATED: Use ExtractionService with user context for dual prompt system
        const result = await this.extractionService.callExtractionAPI(
          fileItem.file, 
          userContext // ← ADD THIS PARAMETER
        );
        
       if (result && result.success !== false) {
          fileItem.status = 'completed';
          fileItem.result = result;
          fileItem.progress = 100;
          fileItem.completedAt = new Date().toISOString();
          
          // ✅ UPDATED: Store extraction metadata including dual system info
          if (result.extraction_metadata) {
            fileItem.extractionMetadata = result.extraction_metadata;
            console.log(`📊 Dual system metadata for ${fileItem.name}:`, {
              system_used: result.extraction_metadata.system_used,
              user_email: result.extraction_metadata.user_email,
              prompt_name: result.extraction_metadata.prompt_name
            });
          }
          
          // ✅ CRITICAL FIX: Store extracted data including document storage
          if (result.data) {
            fileItem.extractedData = result.data;
            
            // Store document storage information if available
            if (result.data.documentStorage) {
              fileItem.documentStorage = result.data.documentStorage;
            }
          }
          
          batch.successfulFiles++;
          batch.results.push(result);

          // Mark file as processed to prevent future duplicates
          this.markFileAsProcessed(fileItem.name, fileItem.size);

          // ✅ ENHANCED: Auto-save with document storage
          if (batch.options.autoSave && result.data) {
            await this.autoSaveExtractedDataWithDocuments(
              result.data, 
              batch.type, 
              fileItem.name,
              fileItem.originalFile || fileItem.file, // Pass original file
              batch.options.storeDocuments
            );
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
   * ✅ FIXED: Handle messages from Web Worker with proper document storage preservation
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
          completedFile.progress = 100;
          completedFile.completedAt = new Date().toISOString();
          
          // ✅ CRITICAL FIX: Store the complete result including document storage info
          completedFile.result = payload.result;
          
          // ✅ FIX: Ensure extracted data includes document storage information
          if (payload.result && payload.result.success && payload.result.data) {
            // Store the raw extracted data for batch completion processing
            completedFile.extractedData = payload.result.data;
            
            // ✅ CRITICAL: Preserve document storage metadata if it exists
            if (payload.result.data.documentStorage) {
              completedFile.documentStorage = payload.result.data.documentStorage;
            }
            
            if (payload.result.data.extractionMetadata) {
              completedFile.extractionMetadata = payload.result.data.extractionMetadata;
            }
          }
          
          batch.successfulFiles++;
          batch.results.push(payload.result);
          
          // Mark file as processed to prevent future duplicates
          this.markFileAsProcessed(completedFile.name, completedFile.size);
          
          // ✅ ENHANCED: Auto-save with document storage (pass filename for duplicate prevention)
          if (batch.options.autoSave && payload.result?.data) {
            this.autoSaveExtractedDataWithDocuments(
              payload.result.data, 
              batch.type, 
              completedFile.name,
              completedFile.originalFile || completedFile.file, // Pass original file
              batch.options.storeDocuments
            );
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
   * ✅ ENHANCED: Auto-save extracted data WITH document storage
   */
  async autoSaveExtractedDataWithDocuments(data, documentType, fileName = null, originalFile = null, storeDocuments = true) {
    try {
      console.log('🔄 Auto-saving extracted data with documents:', documentType, fileName);
      
      if (documentType === 'proforma_invoice') {
        // ✅ NEW: Create PI data with document storage fields
        const piData = await this.mapExtractedDataToPIWithDocuments(
          data, 
          fileName, 
          originalFile, 
          storeDocuments && this.documentStorageService // Only if service is available
        );

        // ✅ CRITICAL FIX: Update the batch file object with document storage info
if (piData.documentId && piData.documentId.includes('doc-') && !piData.documentId.includes('fallback')) {
  // Find the corresponding batch file and update it with document storage info
  for (const [queueKey, batch] of this.queues.entries()) {
    const fileIndex = batch.files.findIndex(f => f.name === fileName);
    if (fileIndex !== -1) {
      const file = batch.files[fileIndex];
      
      // Update the file's extracted data with document storage information
      if (file.extractedData) {
        console.log(`📋 Updating batch file ${fileName} with document storage info:`, piData.documentId);
        
        // Add document storage to extracted data
        file.extractedData.documentStorage = {
          documentId: piData.documentId,
          documentNumber: piData.documentNumber,
          originalFileName: piData.originalFileName,
          fileSize: piData.fileSize,
          contentType: piData.contentType,
          storedAt: piData.extractedAt,
          hasStoredDocuments: piData.hasStoredDocuments,
          storageInfo: piData.storageInfo
        };
        
        // Also set it at the file level for batch completion
        file.documentStorage = file.extractedData.documentStorage;
        
        // Persist the updated batch
        this.persistQueue(queueKey, batch);
        
        console.log(`✅ Updated batch file ${fileName} with document storage:`, file.extractedData.documentStorage.documentId);
        break;
      }
    }
  }
}
        
        // Get existing PIs from localStorage
        const existingPIs = JSON.parse(localStorage.getItem('proforma_invoices') || '[]');
        
        // Check for duplicates by filename and PI number
        const duplicate = existingPIs.find(pi => 
          pi.extractedFrom === fileName ||
          (pi.piNumber && pi.piNumber === piData.piNumber)
        );
        
        if (duplicate) {
          console.log('⚠️ Duplicate PI detected - skipping save for:', fileName);
          return;
        }
        
        // Add new PI to the beginning of the array (so it shows at top)
        existingPIs.unshift(piData);
        
        // Save back to localStorage
        localStorage.setItem('proforma_invoices', JSON.stringify(existingPIs));
        
        console.log('✅ Auto-save with documents successful for:', fileName, 
          piData.hasStoredDocuments ? '(with stored docs)' : '(no docs)');
        
        // Trigger a storage event to refresh any components listening for changes
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'proforma_invoices',
          newValue: JSON.stringify(existingPIs),
          url: window.location.href
        }));
        
        // Also trigger a custom event that components can listen to
        window.dispatchEvent(new CustomEvent('proformaInvoiceAdded', {
          detail: { piData, fileName }
        }));
        
      } else if (documentType === 'purchase_order') {
        // Handle PO auto-save if needed
        const poData = this.mapExtractedDataToPO(data, fileName);
        const existingPOs = JSON.parse(localStorage.getItem('purchase_orders') || '[]');
        
        // Check for duplicates
        const duplicate = existingPOs.find(po => 
          po.extractedFrom === fileName ||
          (po.poNumber && po.poNumber === poData.poNumber)
        );
        
        if (!duplicate) {
          existingPOs.unshift(poData);
          localStorage.setItem('purchase_orders', JSON.stringify(existingPOs));
          console.log('✅ Auto-save PO successful for:', fileName);
        }
      }
      
    } catch (error) {
      console.error('❌ Auto-save with documents failed:', error);
      // Don't throw - let batch processing continue
    }
  }

  /**
   * ✅ LEGACY: Keep original method for backward compatibility
   */
  async autoSaveExtractedData(data, documentType, fileName = null) {
    return this.autoSaveExtractedDataWithDocuments(data, documentType, fileName, null, false);
  }

  /**
   * ✅ ENHANCED: Map extracted data to PI format WITH document storage
   */
  async mapExtractedDataToPIWithDocuments(data, fileName = null, originalFile = null, storeDocuments = true) {
    // Create a consistent PI number based on filename
    const baseId = fileName ? fileName.replace(/\.[^/.]+$/, "") : `pi-${Date.now()}`;
    const piNumber = `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // ✅ NEW: Generate document ID and prepare document storage
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let documentStorageFields = {};
    
    // ✅ NEW: Store original file if available and document storage is enabled
    if (originalFile && storeDocuments && this.documentStorageService) {
      try {
        console.log('📁 Storing document for batch upload:', fileName);
        
        // Store both original file and extraction data
        const storageResult = await this.documentStorageService.storeDocumentWithExtraction(
          originalFile,
          data,
          'pi',
          piNumber,
          documentId
        );
        
        if (storageResult && storageResult.success) {
          documentStorageFields = {
            documentId: documentId,
            documentNumber: piNumber,
            documentType: 'pi',
            hasStoredDocuments: true,
            storageInfo: storageResult.data,
            originalFileName: fileName,
            fileSize: originalFile.size,
            contentType: originalFile.type,
            extractedAt: new Date().toISOString(),
            storedAt: new Date().toISOString()
          };
          
          console.log('✅ Document stored successfully for batch upload:', documentId);
        } else {
          console.warn('⚠️ Document storage failed for batch upload:', storageResult?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('❌ Error storing document for batch upload:', error);
        // Continue without document storage
      }
    }
    
    // ✅ Fallback: Set basic document info even without file storage
    if (!documentStorageFields.documentId) {
      documentStorageFields = {
        extractedFrom: fileName,
        extractedAt: new Date().toISOString(),
        hasExtractedData: true,
        hasStoredDocuments: false // Explicitly set to false when no documents stored
      };
    }
    
    return {
      id: `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID for storage
      piNumber: piNumber, // Consistent PI number
      date: data.date || new Date().toISOString().split('T')[0],
      supplierName: data.supplier?.name || data.supplierName || `Supplier ${Math.floor(Math.random() * 100)}`,
      totalAmount: data.grandTotal || data.totalAmount || Math.floor(Math.random() * 50000) + 1000,
      currency: data.currency || 'USD',
      items: (data.products || data.items || []).map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        productCode: item.productCode || '',
        productName: item.productName || item.description || `Product ${Math.floor(Math.random() * 1000)}`,
        quantity: parseInt(item.quantity) || Math.floor(Math.random() * 10) + 1,
        unitPrice: parseFloat(item.unitPrice) || Math.floor(Math.random() * 1000) + 100,
        totalPrice: parseFloat(item.totalPrice) || 0
      })),
      status: 'draft',
      purpose: 'Stock', // Default purpose
      createdAt: new Date().toISOString(),
      extractedFrom: fileName, // Track which file this came from
      isAutoGenerated: true, // Mark as auto-generated for easy identification
      
      // ✅ CRITICAL: Include document storage fields
      ...documentStorageFields
    };
  }

  /**
   * ✅ LEGACY: Keep original method for backward compatibility
   */
  mapExtractedDataToPI(data, fileName = null) {
    return this.mapExtractedDataToPIWithDocuments(data, fileName, null, false);
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
      skipped: batch.skippedFiles || 0,
      duration: this.calculateDuration(batch.createdAt, batch.completedAt),
      processingMethod: batch.processingMethod
    };

    // Store notification for offline users
    this.storeNotification(batch.id, summary);

    // Show notification if user is online
    if (batch.options.notifyWhenComplete) {
      if (document.visibilityState === 'visible') {
        let message = `Batch processing complete! ${summary.successful}/${summary.total} files processed successfully using ${summary.processingMethod}.`;
        if (summary.skipped > 0) {
          message += ` ${summary.skipped} files were skipped (already processed).`;
        }
        // ✅ NEW: Mention document storage if enabled
        if (batch.options.storeDocuments) {
          message += ' Documents have been stored and linked to PIs.';
        }
        this.notify(
          message,
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
   * Clear processed files tracking (for fresh start)
   */
  clearProcessedFiles() {
    this.processedFiles.clear();
    localStorage.removeItem('processed_files');
    console.log('🧹 Cleared processed files tracking');
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
          skippedFiles: batch.skippedFiles || 0,
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
   * ✅ FIXED: Get all active batches with proper document storage information
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
        skippedFiles: batch.skippedFiles || 0,
        files: batch.files.map(f => ({
          id: f.id,
          name: f.name,
          fileName: f.name, // For compatibility
          status: f.status,
          progress: f.progress,
          error: f.error,
          // ✅ CRITICAL FIX: Include complete extracted data with document storage
          extractedData: f.extractedData || f.result?.data,
          documentStorage: f.documentStorage,
          extractionMetadata: f.extractionMetadata,
          result: f.result
        })),
        progress: batch.totalFiles > 0 ? 
          Math.round((batch.processedFiles / batch.totalFiles) * 100) : 0,
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
      processedFilesTracked: this.processedFiles.size,
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
          file: null, // Remove file object for storage
          originalFile: null // ✅ Also remove originalFile for storage
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
      // Save processed files tracking
      this.saveProcessedFiles();
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
        let message = `Batch ${notification.batchId} completed while you were away! ${notification.summary.successful}/${notification.summary.total} files processed via ${notification.summary.processingMethod}.`;
        if (notification.summary.skipped > 0) {
          message += ` ${notification.summary.skipped} files were skipped.`;
        }
        this.notify(
          message,
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
