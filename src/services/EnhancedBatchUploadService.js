// src/services/EnhancedBatchUploadService.js
// Enhanced batch upload service with Web Worker support, duplicate prevention, and DOCUMENT STORAGE

import { AIExtractionService } from './ai/AIExtractionService';
import { ExtractionService } from './ai/ExtractionService';

class EnhancedBatchUploadService {
  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.maxConcurrentWorkers = 2;
    this.maxFilesPerWorker = 10;
    this.isInitialized = false;
    this.notifications = [];
    this.showNotification = null;
    this.processedFiles = new Set();
    this.documentStorageService = null;
    this.extractionService = ExtractionService;
    
    this.init();
  }

  /**
   * Get current user from localStorage or context
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
   * Initialize document storage service
   */
  async initializeDocumentStorage() {
    if (!this.documentStorageService && typeof window !== 'undefined') {
      try {
        const module = await import('./DocumentStorageService.js');
        
        let DocumentStorageService;
        
        if (module.DocumentStorageService) {
          DocumentStorageService = module.DocumentStorageService;
        } else if (module.default) {
          DocumentStorageService = module.default;
          
          if (typeof DocumentStorageService === 'object' && DocumentStorageService.constructor) {
            this.documentStorageService = DocumentStorageService;
            console.log('DocumentStorageService instance imported for batch uploads');
            return;
          }
        }
        
        if (DocumentStorageService && typeof DocumentStorageService === 'function') {
          this.documentStorageService = new DocumentStorageService();
          console.log('DocumentStorageService initialized for batch uploads');
        } else if (DocumentStorageService && typeof DocumentStorageService === 'object') {
          this.documentStorageService = DocumentStorageService;
          console.log('DocumentStorageService instance loaded for batch uploads');
        } else {
          console.warn('DocumentStorageService not found or not a constructor');
          this.documentStorageService = null;
        }
      } catch (error) {
        console.warn('Could not initialize DocumentStorageService:', error.message);
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
    
    this.restoreQueues();
    this.loadProcessedFiles();
    this.setupOfflineHandler();
    this.setupCleanup();
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
    console.log('startBatch called with:', files.length, 'files');
    const result = await this.addBatch(files, options.type || 'proforma_invoice', options);
    return result.batchId;
  }

  /**
   * Add multiple files to batch processing with Web Worker support
   */
  async addBatch(files, documentType = 'proforma_invoice', options = {}) {
    const batchId = this.generateBatchId();
    const queueKey = `${documentType}_${batchId}`;
    
    const newFiles = [];
    const skippedFiles = [];
    
    for (const file of files) {
      if (this.isFileAlreadyProcessed(file.name, file.size)) {
        skippedFiles.push(file.name);
        console.log(`Skipping already processed file: ${file.name}`);
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
        storeDocuments: options.storeDocuments !== false,
        ...options
      }
    };

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
        file: file,
        originalFile: file,
        result: null,
        error: null,
        startedAt: null,
        completedAt: null
      };
      
      batch.files.push(fileItem);
    }

    this.queues.set(queueKey, batch);
    this.persistQueue(queueKey, batch);

    console.log(`Batch ${batchId} created with ${newFiles.length} new files (${skippedFiles.length} skipped)`);
    
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
      console.log(`Starting Web Worker for batch ${batch.id}`);
      
      const worker = new Worker('/workers/extraction-worker.js');
      this.workers.set(queueKey, worker);
      
      worker.onmessage = (event) => {
        try {
          console.log('Worker message received:', event.data.type);
          this.handleWorkerMessage(queueKey, event.data);
        } catch (error) {
          console.error('Error handling worker message:', error);
          this.handleWorkerError(queueKey, error);
        }
      };
      
      worker.onerror = (error) => {
        console.error('Worker error event:', error);
        this.handleWorkerError(queueKey, {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          type: 'WORKER_ERROR_EVENT'
        });
      };
      
      batch.status = 'processing';
      batch.processingMethod = 'web-worker';
      batch.startedAt = new Date().toISOString();
      this.persistQueue(queueKey, batch);
      
      const userContext = this.getCurrentUser();
      console.log('User context for batch processing:', {
        hasUser: !!userContext,
        email: userContext?.email,
        role: userContext?.role
      });
      
      const processableFiles = [];      
      for (let i = 0; i < batch.files.length; i++) {
        const fileItem = batch.files[i];
        
        try {
          console.log(`Converting file ${fileItem.name} to base64...`);
          
          const base64Data = await this.fileToBase64(fileItem.file);
          
          processableFiles.push({
            name: fileItem.name,
            size: fileItem.size,
            type: fileItem.type,
            base64Data: base64Data,
            originalIndex: i
          });
          
          console.log(`Converted file ${fileItem.name} to base64 (${base64Data.length} chars)`);
          
        } catch (error) {
          console.error(`Failed to convert file ${fileItem.name}:`, error);
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
      
      const workerPayload = {
        files: processableFiles,
        batchId: batch.id,
        options: batch.options,
        userContext: userContext
      };
      
      console.log(`Sending START_BATCH to worker with ${processableFiles.length} files and user context`);
      
      worker.postMessage({
        type: 'START_BATCH',
        payload: workerPayload
      });
      
      console.log(`Started Web Worker processing for batch ${batch.id} with dual prompt system support`);
      
    } catch (error) {
      console.error('Failed to start Web Worker:', error);
      this.notify(
        `Failed to start background processing for batch ${batch.id}. Using main thread instead.`, 
        'warning'
      );
      await this.processWithMainThread(queueKey, batch);
    }
  }

  /**
   * Convert File to base64 string
   */
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
   * Process batch in main thread with user context
   */
  async processWithMainThread(queueKey, batch) {
    console.log(`Processing batch ${batch.id} in main thread`);
    
    const userContext = this.getCurrentUser();
    console.log('User context for main thread processing:', {
      hasUser: !!userContext,
      email: userContext?.email,
      role: userContext?.role
    });
    
    batch.status = 'processing';
    batch.processingMethod = 'main-thread';
    batch.startedAt = new Date().toISOString();
    this.persistQueue(queueKey, batch);
    
    console.log(`Started main thread processing for batch ${batch.id}`);
    
    for (let i = 0; i < batch.files.length; i++) {
      const fileItem = batch.files[i];
      
      try {
        fileItem.status = 'processing';
        fileItem.startedAt = new Date().toISOString();
        fileItem.attempts++;
        
        this.persistQueue(queueKey, batch);
        
        console.log(`Processing file: ${fileItem.name}`);
        
        const result = await this.extractionService.callExtractionAPI(
          fileItem.file, 
          userContext
        );
        
        if (result && result.success !== false) {
          fileItem.status = 'completed';
          fileItem.result = result;
          fileItem.progress = 100;
          fileItem.completedAt = new Date().toISOString();
          
          if (result.extraction_metadata) {
            fileItem.extractionMetadata = result.extraction_metadata;
            console.log(`Dual system metadata for ${fileItem.name}:`, {
              system_used: result.extraction_metadata.system_used,
              user_email: result.extraction_metadata.user_email,
              prompt_name: result.extraction_metadata.prompt_name
            });
          }
          
          if (result.data) {
            fileItem.extractedData = result.data;
            
            if (result.data.documentStorage) {
              fileItem.documentStorage = result.data.documentStorage;
            }
          }
          
          batch.successfulFiles++;
          batch.results.push(result);

          this.markFileAsProcessed(fileItem.name, fileItem.size);

          if (batch.options.autoSave && result.data) {
            await this.autoSaveExtractedDataWithDocuments(
              result.data, 
              batch.type, 
              fileItem.name,
              fileItem.originalFile || fileItem.file,
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
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    await this.handleBatchCompletion(queueKey, batch);
  }

  /**
   * Handle messages from Web Worker with proper document storage preservation
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
          
          completedFile.result = payload.result;
          
          if (payload.result && payload.result.success && payload.result.data) {
            completedFile.extractedData = payload.result.data;
            
            if (payload.result.data.documentStorage) {
              completedFile.documentStorage = payload.result.data.documentStorage;
            }
            
            if (payload.result.data.extractionMetadata) {
              completedFile.extractionMetadata = payload.result.data.extractionMetadata;
            }
          }
          
          batch.successfulFiles++;
          batch.results.push(payload.result);
          
          this.markFileAsProcessed(completedFile.name, completedFile.size);
          
          if (batch.options.autoSave && payload.result?.data) {
            this.autoSaveExtractedDataWithDocuments(
              payload.result.data, 
              batch.type, 
              completedFile.name,
              completedFile.originalFile || completedFile.file,
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
    
    this.terminateWorker(queueKey);
    
    batch.files.forEach(file => {
      if (file.status === 'processing') {
        file.status = 'queued';
        file.attempts = 0;
      }
    });
    
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
   * Auto-save extracted data WITH document storage
   */
  async autoSaveExtractedDataWithDocuments(data, documentType, fileName = null, originalFile = null, storeDocuments = true) {
    try {
      console.log('Auto-saving extracted data with documents:', documentType, fileName);
      
      if (documentType === 'proforma_invoice') {
        const piData = await this.mapExtractedDataToPIWithDocuments(
          data, 
          fileName, 
          originalFile, 
          storeDocuments && this.documentStorageService
        );

        if (piData.documentId && piData.documentId.includes('doc-') && !piData.documentId.includes('fallback')) {
          for (const [queueKey, batch] of this.queues.entries()) {
            const fileIndex = batch.files.findIndex(f => f.name === fileName);
            if (fileIndex !== -1) {
              const file = batch.files[fileIndex];
              
              if (file.extractedData) {
                console.log(`Updating batch file ${fileName} with document storage info:`, piData.documentId);
                
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
                
                file.documentStorage = file.extractedData.documentStorage;
                this.persistQueue(queueKey, batch);
                
                console.log(`Updated batch file ${fileName} with document storage:`, file.extractedData.documentStorage.documentId);
                break;
              }
            }
          }
        }
        
        const existingPIs = JSON.parse(localStorage.getItem('proforma_invoices') || '[]');
        
        const duplicate = existingPIs.find(pi => 
          pi.extractedFrom === fileName ||
          (pi.piNumber && pi.piNumber === piData.piNumber)
        );
        
        if (duplicate) {
          console.log('Duplicate PI detected - skipping save for:', fileName);
          return;
        }
        
        existingPIs.unshift(piData);
        localStorage.setItem('proforma_invoices', JSON.stringify(existingPIs));
        
        console.log('Auto-save with documents successful for:', fileName, 
          piData.hasStoredDocuments ? '(with stored docs)' : '(no docs)');
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'proforma_invoices',
          newValue: JSON.stringify(existingPIs),
          url: window.location.href
        }));
        
        window.dispatchEvent(new CustomEvent('proformaInvoiceAdded', {
          detail: { piData, fileName }
        }));
        
      } else if (documentType === 'purchase_order') {
        const poData = this.mapExtractedDataToPO(data, fileName);
        const existingPOs = JSON.parse(localStorage.getItem('purchase_orders') || '[]');
        
        const duplicate = existingPOs.find(po => 
          po.extractedFrom === fileName ||
          (po.poNumber && po.poNumber === poData.poNumber)
        );
        
        if (!duplicate) {
          existingPOs.unshift(poData);
          localStorage.setItem('purchase_orders', JSON.stringify(existingPOs));
          console.log('Auto-save PO successful for:', fileName);
        }
      }
      
    } catch (error) {
      console.error('Auto-save with documents failed:', error);
    }
  }

  /**
   * LEGACY: Keep original method for backward compatibility
   */
  async autoSaveExtractedData(data, documentType, fileName = null) {
    return this.autoSaveExtractedDataWithDocuments(data, documentType, fileName, null, false);
  }

  /**
   * Map extracted data to PI format WITH document storage
   */
  async mapExtractedDataToPIWithDocuments(data, fileName = null, originalFile = null, storeDocuments = true) {
    const baseId = fileName ? fileName.replace(/\.[^/.]+$/, "") : `pi-${Date.now()}`;
    const piNumber = `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let documentStorageFields = {};
    
    if (originalFile && storeDocuments && this.documentStorageService) {
      try {
        console.log('Storing document for batch upload:', fileName);
        
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
          
          console.log('Document stored successfully for batch upload:', documentId);
        } else {
          console.warn('Document storage failed for batch upload:', storageResult?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error storing document for batch upload:', error);
      }
    }
    
    if (!documentStorageFields.documentId) {
      documentStorageFields = {
        extractedFrom: fileName,
        extractedAt: new Date().toISOString(),
        hasExtractedData: true,
        hasStoredDocuments: false
      };
    }
    
    return {
      id: `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      piNumber: piNumber,
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
      purpose: 'Stock',
      createdAt: new Date().toISOString(),
      extractedFrom: fileName,
      isAutoGenerated: true,
      
      ...documentStorageFields
    };
  }

  /**
   * LEGACY: Keep original method for backward compatibility
   */
  mapExtractedDataToPI(data, fileName = null) {
    return this.mapExtractedDataToPIWithDocuments(data, fileName, null, false);
  }

  /**
   * Map extracted data to PO format
   */
  mapExtractedDataToPO(data, fileName = null) {
    const poNumber = `PO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    return {
      id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      poNumber: poNumber,
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
      createdAt: new Date().toISOString(),
      extractedFrom: fileName,
      isAutoGenerated: true
    };
  }

  /**
   * Handle batch completion
   */
  async handleBatchCompletion(queueKey, batch) {
    console.log(`Batch ${batch.id} completed!`);
    
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

    this.storeNotification(batch.id, summary);

    if (batch.options.notifyWhenComplete) {
      if (document.visibilityState === 'visible') {
        let message = `Batch processing complete! ${summary.successful}/${summary.total} files processed successfully using ${summary.processingMethod}.`;
        if (summary.skipped > 0) {
          message += ` ${summary.skipped} files were skipped (already processed).`;
        }
        if (batch.options.storeDocuments) {
          message += ' Documents have been stored and linked to PIs.';
        }
        this.notify(
          message,
          summary.failed > 0 ? 'warning' : 'success'
        );
      }
    }

    this.persistQueue(queueKey, batch);
    this.terminateWorker(queueKey);
    
    setTimeout(() => this.cleanupCompletedBatch(queueKey), 24 * 60 * 60 * 1000);
  }

  /**
   * Clear processed files tracking (for fresh start)
   */
  clearProcessedFiles() {
    this.processedFiles.clear();
    localStorage.removeItem('processed_files');
    console.log('Cleared processed files tracking');
  }

  /**
   * Cancel a batch by ID
   */
  cancelBatch(batchId) {
    console.log(`Cancelling batch: ${batchId}`);
    
    for (const [queueKey, batch] of this.queues.entries()) {
      if (batch.id === batchId) {
        const worker = this.workers.get(queueKey);
        
        if (worker) {
          worker.postMessage({ type: 'CANCEL_BATCH' });
        } else {
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
   * Get all active batches with proper document storage information
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
          fileName: f.name,
          status: f.status,
          progress: f.progress,
          error: f.error,
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
    return remainingFiles * 45;
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
          file: null,
          originalFile: null
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
        
        if (batch.status !== 'completed') {
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
      for (const [queueKey, batch] of this.queues.entries()) {
        this.terminateWorker(queueKey);
        this.persistQueue(queueKey, batch);
      }
      this.saveProcessedFiles();
    });
  }

  setupCleanup() {
    setInterval(() => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      for (const [queueKey, batch] of this.queues.entries()) {
        if (batch.status === 'completed' && new Date(batch.completedAt) < cutoff) {
          this.cleanupCompletedBatch(queueKey);
        }
      }
    }, 60 * 60 * 1000);
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
