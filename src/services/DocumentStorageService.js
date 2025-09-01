//// src/services/DocumentStorageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { storage } from '../config/firebase';

class DocumentStorageService {
  constructor() {
    this.bucketPaths = {
      po: 'documents/purchase-orders',
      pi: 'documents/proforma-invoices',
      trade: 'documents/trade-documents',
      temp: 'documents/temp',
      // 🆕 NEW: Payment slip storage path
      'payment-slips': 'documents/payment-slips'
    };
    this.isInitialized = false;
    this.initializeService();
  }

  /**
   * Initialize the service and verify Firebase connection
   */
  async initializeService() {
    try {
      // Simple connectivity test
      if (storage && storage.app) {
        this.isInitialized = true;
        console.log('✅ DocumentStorageService initialized successfully');
      } else {
        console.warn('⚠️ Firebase storage not properly configured');
      }
    } catch (error) {
      console.warn('⚠️ DocumentStorageService initialization warning:', error.message);
    }
  }

  /**
   * Check if service is ready for use
   */
  isReady() {
    return this.isInitialized && storage;
  }

  /**
   * Upload and store original document
   * @param {File} file - The uploaded file
   * @param {string} documentType - 'po', 'pi', 'payment-slips', etc.
   * @param {string} documentNumber - PO/PI number for organizing
   * @param {string} documentId - Unique document ID
   * @returns {Promise<Object>} - Storage result with download URL
   */
  async storeOriginalDocument(file, documentType, documentNumber, documentId) {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService is not ready. Check Firebase configuration.');
    }

    try {
      console.log(`📁 Storing original ${documentType.toUpperCase()} document:`, {
        fileName: file.name,
        size: file.size,
        type: file.type,
        documentNumber,
        documentId
      });

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(file.name);
      const sanitizedDocNumber = this.sanitizeFileName(documentNumber);
      const fileName = `${sanitizedDocNumber}_${timestamp}_original${fileExtension}`;
      
      // Create storage path - support payment-slips
      const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
      const storagePath = `${basePath}/${documentId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Add metadata with payment slip support
      const metadata = {
        customMetadata: {
          originalFileName: file.name,
          documentType: documentType.toUpperCase(),
          documentNumber: documentNumber,
          documentId: documentId,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
          contentType: file.type,
          
          // 🆕 NEW: Payment slip specific metadata
          ...(documentType === 'payment-slips' && {
            paymentSlipId: documentId,
            storageType: 'payment-slip-original'
          })
        }
      };

      // Upload file
      console.log(`📤 Uploading to: ${storagePath}`);
      const uploadResult = await uploadBytes(storageRef, file, metadata);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log(`✅ Document stored successfully:`, {
        path: storagePath,
        downloadURL,
        size: file.size
      });

      return {
        success: true,
        data: {
          fileName: fileName,
          originalFileName: file.name,
          storagePath: storagePath,
          downloadURL: downloadURL,
          fileSize: file.size,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          documentType: documentType.toUpperCase(),
          documentNumber: documentNumber,
          documentId: documentId
        }
      };

    } catch (error) {
      console.error('❌ Error storing document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store multiple document versions (original + processed)
   * @param {File} originalFile - Original uploaded file
   * @param {Object} extractedData - Processed data for reference
   * @param {string} documentType - 'po', 'pi', 'payment-slips', etc.
   * @param {string} documentNumber - PO/PI number
   * @param {string} documentId - Unique document ID
   * @returns {Promise<Object>} - Storage results
   */
  async storeDocumentWithExtraction(originalFile, extractedData, documentType, documentNumber, documentId) {
    if (!this.isReady()) {
      console.warn('⚠️ DocumentStorageService not ready, skipping document storage');
      return {
        success: false,
        error: 'DocumentStorageService not ready',
        fallbackMode: true
      };
    }

    try {
      console.log(`📋 Storing ${documentType.toUpperCase()} with extraction data`);

      // Store original document
      const originalResult = await this.storeOriginalDocument(
        originalFile, 
        documentType, 
        documentNumber, 
        documentId
      );

      if (!originalResult.success) {
        throw new Error(`Failed to store original document: ${originalResult.error}`);
      }

      // Store extraction metadata as JSON
      const extractionResult = await this.storeExtractionData(
        extractedData, 
        documentType, 
        documentNumber, 
        documentId
      );

      return {
        success: true,
        data: {
          original: originalResult.data,
          extraction: extractionResult.data,
          summary: {
            documentId,
            documentNumber,
            documentType: documentType.toUpperCase(),
            originalFileName: originalFile.name,
            filesStored: 2,
            totalSize: originalResult.data.fileSize,
            storedAt: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      console.error('❌ Error storing document with extraction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Store extraction metadata as JSON file
   * @param {Object} extractedData - AI extraction results
   * @param {string} documentType - 'po', 'pi', 'payment-slips', etc.
   * @param {string} documentNumber - Document number
   * @param {string} documentId - Unique document ID
   * @returns {Promise<Object>} - Storage result
   */
  async storeExtractionData(extractedData, documentType, documentNumber, documentId) {
    try {
      const timestamp = Date.now();
      const sanitizedDocNumber = this.sanitizeFileName(documentNumber);
      const fileName = `${sanitizedDocNumber}_${timestamp}_extraction.json`;
      
      // Create enhanced extraction metadata with payment slip support
      const extractionMetadata = {
        documentId,
        documentNumber,
        documentType: documentType.toUpperCase(),
        extractedAt: new Date().toISOString(),
        aiConfidence: extractedData.confidence || 0,
        extractedData: extractedData,
        version: '1.0',
        
        // 🆕 NEW: Payment slip specific metadata
        ...(documentType === 'payment-slips' && {
          paymentSlipMetadata: {
            referenceNumber: extractedData.referenceNumber,
            paymentDate: extractedData.paymentDate,
            bankName: extractedData.bankName,
            paidAmount: extractedData.paidAmount,
            paidCurrency: extractedData.paidCurrency,
            beneficiaryName: extractedData.beneficiaryName,
            extractionSystem: extractedData.extractionMethod
          }
        })
      };

      // Convert to blob
      const jsonBlob = new Blob([JSON.stringify(extractionMetadata, null, 2)], {
        type: 'application/json'
      });

      // Create storage path
      const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
      const storagePath = `${basePath}/${documentId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload metadata with payment slip support
      const metadata = {
        customMetadata: {
          documentType: documentType.toUpperCase(),
          documentNumber: documentNumber,
          documentId: documentId,
          dataType: 'extraction',
          uploadedAt: new Date().toISOString(),
          
          // 🆕 NEW: Payment slip specific metadata
          ...(documentType === 'payment-slips' && {
            paymentReference: extractedData.referenceNumber,
            paymentAmount: extractedData.paidAmount?.toString(),
            paymentCurrency: extractedData.paidCurrency,
            storageType: 'payment-slip-extraction'
          })
        }
      };

      const uploadResult = await uploadBytes(storageRef, jsonBlob, metadata);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      return {
        success: true,
        data: {
          fileName: fileName,
          storagePath: storagePath,
          downloadURL: downloadURL,
          uploadedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error storing extraction data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 NEW: Specialized method for storing payment slips with enhanced metadata
   * @param {File} file - Payment slip file
   * @param {Object} extractedData - AI-extracted payment data
   * @param {Array} piAllocations - Array of PI allocation information
   * @returns {Promise<Object>} - Storage result with payment-specific metadata
   */
  async storePaymentSlip(file, extractedData, piAllocations = []) {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService is not ready. Check Firebase configuration.');
    }

    try {
      console.log('💰 Storing payment slip with allocations:', file.name);
      
      // Generate unique payment slip ID
      const paymentSlipId = `payment-slip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Enhanced metadata for payment slips
      const paymentMetadata = {
        paymentSlipId,
        referenceNumber: extractedData.referenceNumber,
        paymentDate: extractedData.paymentDate,
        bankName: extractedData.bankName,
        accountName: extractedData.accountName,
        
        // Amount details
        paidAmount: extractedData.paidAmount,
        paidCurrency: extractedData.paidCurrency,
        debitAmount: extractedData.debitAmount,
        debitCurrency: extractedData.debitCurrency,
        exchangeRate: extractedData.exchangeRate,
        bankCharges: extractedData.bankCharges,
        
        // Beneficiary information
        beneficiaryName: extractedData.beneficiaryName,
        beneficiaryBank: extractedData.beneficiaryBank,
        beneficiaryCountry: extractedData.beneficiaryCountry,
        
        // Processing metadata
        extractionMethod: extractedData.extractionMethod,
        extractionConfidence: extractedData.confidence,
        processedAt: new Date().toISOString(),
        
        // PI allocation information
        piAllocations: piAllocations.map(allocation => ({
          piId: allocation.piId,
          piNumber: allocation.piNumber,
          supplierName: allocation.supplierName,
          allocatedAmount: allocation.allocatedAmount,
          currency: allocation.currency,
          paymentPercentage: allocation.paymentPercentage,
          isPartialPayment: allocation.isPartialPayment
        })),
        
        // Summary statistics
        totalAllocatedPIs: piAllocations.length,
        totalAllocatedAmount: piAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0),
        
        // File information
        originalFileName: file.name,
        fileSize: file.size,
        fileType: file.type
      };

      // Store the original payment slip file
      const fileResult = await this.storeOriginalDocument(
        file,
        'payment-slips',
        extractedData.referenceNumber || 'Unknown-Ref',
        paymentSlipId
      );

      if (!fileResult.success) {
        throw new Error(`Failed to store payment slip file: ${fileResult.error}`);
      }

      // Store the enhanced extraction data with payment metadata
      const enhancedExtractionData = {
        ...extractedData,
        paymentMetadata,
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };

      const extractionResult = await this.storeExtractionData(
        enhancedExtractionData,
        'payment-slips',
        extractedData.referenceNumber || 'Unknown-Ref',
        paymentSlipId
      );

      console.log('✅ Payment slip storage complete:', {
        paymentSlipId,
        fileStored: fileResult.success,
        extractionStored: extractionResult.success
      });

      return {
        success: true,
        data: {
          paymentSlipId,
          fileStorage: fileResult.data,
          extractionStorage: extractionResult.success ? extractionResult.data : null,
          paymentMetadata,
          storedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('❌ Error storing payment slip:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generic document storage method for any document type
   * @param {File} file - The uploaded file
   * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
   * @param {string} documentNumber - Document number for organizing
   * @param {string} documentId - Unique document ID
   * @returns {Promise<Object>} - Storage result with download URL
   */
  async storeDocument(file, documentType, documentNumber, documentId) {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService is not ready. Check Firebase configuration.');
    }

    // 🆕 NEW: Support payment-slips document type
    if (!this.bucketPaths[documentType]) {
      throw new Error(`Unsupported document type: ${documentType}. Supported types: ${Object.keys(this.bucketPaths).join(', ')}`);
    }

    try {
      console.log(`📁 Storing ${documentType.toUpperCase()} document:`, {
        fileName: file.name,
        size: file.size,
        type: file.type,
        documentNumber,
        documentId
      });

      // Generate unique filename with timestamp
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(file.name);
      const sanitizedDocNumber = this.sanitizeFileName(documentNumber);
      const fileName = `${sanitizedDocNumber}_${timestamp}_${documentType}${fileExtension}`;
      
      // Create storage path
      const storagePath = `${this.bucketPaths[documentType]}/${documentId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Add metadata
      const metadata = {
        customMetadata: {
          originalFileName: file.name,
          documentType: documentType.toUpperCase(),
          documentNumber: documentNumber,
          documentId: documentId,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
          contentType: file.type,
          
          // 🆕 NEW: Payment slip specific metadata
          ...(documentType === 'payment-slips' && {
            paymentSlipId: documentId,
            storageType: 'payment-slip'
          })
        }
      };

      // Upload file
      console.log(`📤 Uploading to: ${storagePath}`);
      const uploadResult = await uploadBytes(storageRef, file, metadata);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      console.log(`✅ Document stored successfully:`, {
        path: storagePath,
        downloadURL,
        size: file.size
      });

      return {
        success: true,
        data: {
          fileName: fileName,
          originalFileName: file.name,
          storagePath: storagePath,
          downloadURL: downloadURL,
          fileSize: file.size,
          contentType: file.type,
          uploadedAt: new Date().toISOString(),
          documentType: documentType.toUpperCase(),
          documentNumber: documentNumber,
          documentId: documentId
        }
      };

    } catch (error) {
      console.error('❌ Error storing document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
 * ✅ FIXED: Retrieve all documents for a specific PO/PI/Payment Slip/Trade
 * @param {string} documentId - Document ID
 * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
 * @returns {Promise<Object>} - List of stored documents with correct filenames
 */
async getDocumentFiles(documentId, documentType) {
  if (!this.isReady()) {
    console.warn('⚠️ DocumentStorageService not ready');
    return {
      success: false,
      error: 'DocumentStorageService not ready',
      data: []
    };
  }

  try {
    console.log(`📋 Getting documents for ${documentType} ${documentId}`);
    const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
    const folderPath = `${basePath}/${documentId}`;
    const folderRef = ref(storage, folderPath);
    
    const listResult = await listAll(folderRef);
    console.log(`📁 Found ${listResult.items.length} files in ${folderPath}`);
    
    const files = await Promise.all(
      listResult.items.map(async (itemRef) => {
        try {
          const downloadURL = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          
          return {
            // ✅ CRITICAL FIX: Map Firebase Storage fields to expected component fields
            fileName: itemRef.name,  // ← This is the actual filename in Firebase Storage!
            originalFileName: metadata.customMetadata?.originalFileName || itemRef.name,
            
            // Legacy fields for compatibility
            name: itemRef.name,
            path: itemRef.fullPath,
            fullPath: itemRef.fullPath,
            
            // File properties
            downloadURL: downloadURL,
            fileSize: metadata.size,
            size: metadata.size, // Legacy field
            contentType: metadata.contentType,
            
            // Timestamps
            uploadedAt: metadata.customMetadata?.uploadedAt || metadata.timeCreated,
            timeCreated: metadata.timeCreated,
            updated: metadata.updated,
            
            // Document metadata
            documentType: metadata.customMetadata?.documentType || documentType.toUpperCase(),
            documentNumber: metadata.customMetadata?.documentNumber,
            documentId: metadata.customMetadata?.documentId || documentId,
            
            // Raw metadata
            customMetadata: metadata.customMetadata || {},
            
            // 🆕 Payment slip specific metadata extraction (if applicable)
            ...(documentType === 'payment-slips' && metadata.customMetadata && {
              paymentInfo: {
                reference: metadata.customMetadata.paymentReference,
                amount: metadata.customMetadata.paymentAmount,
                currency: metadata.customMetadata.paymentCurrency,
                date: metadata.customMetadata.paymentDate
              }
            })
          };
          
        } catch (error) {
          console.error(`❌ Error processing file ${itemRef.name}:`, error);
          
          // Return basic file info even if metadata fails
          return {
            fileName: itemRef.name,
            originalFileName: itemRef.name,
            name: itemRef.name,
            path: itemRef.fullPath,
            fullPath: itemRef.fullPath,
            fileSize: 0,
            size: 0,
            contentType: 'application/octet-stream',
            uploadedAt: new Date().toISOString(),
            documentType: documentType.toUpperCase(),
            documentId: documentId,
            error: `Failed to load metadata: ${error.message}`
          };
        }
      })
    );

    console.log(`✅ Successfully processed ${files.length} documents`);
    
    // Debug log to show actual filenames
    files.forEach((file, index) => {
      console.log(`📄 Document ${index + 1}: fileName="${file.fileName}", originalFileName="${file.originalFileName}"`);
    });

    return {
      success: true,
      data: files
    };

  } catch (error) {
    console.error(`❌ Error getting ${documentType} documents:`, error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

  /**
   * 🆕 NEW: Get payment slips by reference number or date range
   * @param {Object} filters - Search filters
   * @returns {Promise<Object>} - List of matching payment slips
   */
  async getPaymentSlips(filters = {}) {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService is not ready');
    }

    try {
      console.log('🔍 Searching payment slips with filters:', filters);
      
      const paymentSlipsRef = ref(storage, this.bucketPaths['payment-slips']);
      const result = await listAll(paymentSlipsRef);
      
      const allPaymentSlips = [];
      
      // Process each payment slip folder
      for (const folderRef of result.prefixes) {
        try {
          const folderItems = await listAll(folderRef);
          
          for (const itemRef of folderItems.items) {
            try {
              const metadata = await getMetadata(itemRef);
              
              // Apply filters if provided
              if (filters.referenceNumber && 
                  metadata.customMetadata?.paymentReference !== filters.referenceNumber) {
                continue;
              }
              
              if (filters.dateFrom || filters.dateTo) {
                const itemDate = new Date(metadata.timeCreated);
                if (filters.dateFrom && itemDate < new Date(filters.dateFrom)) continue;
                if (filters.dateTo && itemDate > new Date(filters.dateTo)) continue;
              }
              
              if (filters.minAmount && 
                  parseFloat(metadata.customMetadata?.paymentAmount || 0) < filters.minAmount) {
                continue;
              }
              
              const downloadURL = await getDownloadURL(itemRef);
              
              allPaymentSlips.push({
                name: itemRef.name,
                fullPath: itemRef.fullPath,
                downloadURL: downloadURL,
                size: metadata.size,
                contentType: metadata.contentType,
                timeCreated: metadata.timeCreated,
                updated: metadata.updated,
                customMetadata: metadata.customMetadata || {},
                paymentInfo: {
                  reference: metadata.customMetadata?.paymentReference,
                  amount: metadata.customMetadata?.paymentAmount,
                  currency: metadata.customMetadata?.paymentCurrency,
                  documentId: metadata.customMetadata?.documentId,
                  storageType: metadata.customMetadata?.storageType
                }
              });
              
            } catch (itemError) {
              console.warn('⚠️ Error processing payment slip item:', itemError);
            }
          }
        } catch (folderError) {
          console.warn('⚠️ Error processing payment slip folder:', folderError);
        }
      }
      
      console.log(`💰 Found ${allPaymentSlips.length} payment slips matching filters`);
      
      return {
        success: true,
        data: allPaymentSlips,
        count: allPaymentSlips.length
      };

    } catch (error) {
      console.error('❌ Error searching payment slips:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Retrieve documents with consistent interface
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
   * @returns {Promise<Object>} - Documents result
   */
  async getDocuments(documentId, documentType) {
    const result = await this.getDocumentFiles(documentId, documentType);
    return {
      success: result.success,
      error: result.error,
      documents: result.data || []
    };
  }

  /**
   * Delete specific document file
   * @param {string} filePath - Full storage path to the file
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteDocumentFile(filePath) {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'DocumentStorageService not ready'
      };
    }

    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      
      console.log(`🗑️ Deleted file: ${filePath}`);
      return {
        success: true,
        deletedFile: filePath
      };

    } catch (error) {
      console.error('❌ Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete all document files for a document
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteDocumentFiles(documentId, documentType) {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'DocumentStorageService not ready'
      };
    }

    try {
      const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
      const folderPath = `${basePath}/${documentId}`;
      const folderRef = ref(storage, folderPath);
      
      const listResult = await listAll(folderRef);
      
      // Delete all files in the folder
      await Promise.all(
        listResult.items.map(itemRef => deleteObject(itemRef))
      );

      console.log(`🗑️ Deleted ${listResult.items.length} files for ${documentType} ${documentId}`);

      return {
        success: true,
        deletedCount: listResult.items.length
      };

    } catch (error) {
      console.error('❌ Error deleting documents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🆕 NEW: Delete entire payment slip folder (both file and extraction data)
   * @param {string} paymentSlipId - Payment slip ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deletePaymentSlip(paymentSlipId) {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService is not ready');
    }

    try {
      console.log('🗑️ Deleting payment slip folder:', paymentSlipId);
      
      const folderRef = ref(storage, `${this.bucketPaths['payment-slips']}/${paymentSlipId}`);
      const folderContents = await listAll(folderRef);
      
      // Delete all items in the folder
      const deletePromises = folderContents.items.map(itemRef => deleteObject(itemRef));
      await Promise.all(deletePromises);
      
      console.log(`✅ Payment slip deleted: ${folderContents.items.length} files removed`);
      
      return {
        success: true,
        message: `Payment slip deleted: ${folderContents.items.length} files removed`,
        deletedFiles: folderContents.items.length
      };

    } catch (error) {
      console.error('❌ Error deleting payment slip:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a specific document by filename
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
   * @param {string} fileName - Name of file to delete
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteDocument(documentId, documentType, fileName) {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'DocumentStorageService not ready'
      };
    }

    try {
      const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
      const filePath = `${basePath}/${documentId}/${fileName}`;
      const result = await this.deleteDocumentFile(filePath);
      
      return result;

    } catch (error) {
      console.error('❌ Error deleting specific document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate document download link with authentication
   * @param {string} storagePath - Full storage path
   * @returns {Promise<string>} - Authenticated download URL
   */
  async getAuthenticatedDownloadURL(storagePath) {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService not ready');
    }

    try {
      const storageRef = ref(storage, storagePath);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error getting download URL:', error);
      throw error;
    }
  }

  /**
   * Download document by filename
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
   * @param {string} fileName - Name of file to download
   * @returns {Promise<Object>} - Download result with URL
   */
  async downloadDocument(documentId, documentType, fileName) {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'DocumentStorageService not ready'
      };
    }

    try {
      const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
      const filePath = `${basePath}/${documentId}/${fileName}`;
      const downloadURL = await this.getAuthenticatedDownloadURL(filePath);
      
      return {
        success: true,
        downloadURL,
        fileName
      };

    } catch (error) {
      console.error('❌ Error downloading document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Utility functions
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  getFileExtension(fileName) {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot === -1 ? '' : fileName.substring(lastDot);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get storage usage statistics
   * @param {string} documentType - 'po', 'pi', 'payment-slips', or 'trade'
   * @returns {Promise<Object>} - Storage statistics
   */
  async getStorageStats(documentType) {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'DocumentStorageService not ready',
        data: { fileCount: 0, totalSize: 0, formattedSize: '0 Bytes' }
      };
    }

    try {
      const basePath = this.bucketPaths[documentType] || this.bucketPaths.temp;
      const folderRef = ref(storage, basePath);
      const listResult = await listAll(folderRef);
      
      let totalSize = 0;
      let fileCount = 0;
      
      // Get metadata for all files to calculate total size
      await Promise.all(
        listResult.items.map(async (itemRef) => {
          try {
            const metadata = await getMetadata(itemRef);
            totalSize += metadata.size;
            fileCount++;
          } catch (error) {
            console.warn(`⚠️ Could not get metadata for ${itemRef.name}`);
            fileCount++; // Count the file even if we can't get size
          }
        })
      );

      return {
        success: true,
        data: {
          documentType: documentType.toUpperCase(),
          fileCount,
          totalSize,
          formattedSize: this.formatFileSize(totalSize)
        }
      };

    } catch (error) {
      console.error('❌ Error getting storage stats:', error);
      return {
        success: false,
        error: error.message,
        data: { fileCount: 0, totalSize: 0, formattedSize: '0 Bytes' }
      };
    }
  }

  /**
   * 🆕 NEW: Get comprehensive storage statistics including payment slips
   * @returns {Promise<Object>} - Complete storage usage statistics
   */
  async getAllStorageStats() {
    if (!this.isReady()) {
      throw new Error('DocumentStorageService is not ready');
    }

    try {
      console.log('📊 Calculating comprehensive storage statistics...');
      
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byDocumentType: {},
        paymentSlips: {
          count: 0,
          totalAmount: 0,
          currencies: new Set()
        }
      };

      // Process each document type
      for (const [docType, path] of Object.entries(this.bucketPaths)) {
        try {
          const typeRef = ref(storage, path);
          const typeResult = await listAll(typeRef);
          
          let typeStats = {
            folders: typeResult.prefixes.length,
            files: 0,
            size: 0
          };

          // Process folders within document type
          for (const folderRef of typeResult.prefixes) {
            const folderContents = await listAll(folderRef);
            
            for (const itemRef of folderContents.items) {
              try {
                const metadata = await getMetadata(itemRef);
                typeStats.files++;
                typeStats.size += metadata.size;
                stats.totalFiles++;
                stats.totalSize += metadata.size;

                // Special handling for payment slips
                if (docType === 'payment-slips' && metadata.customMetadata) {
                  stats.paymentSlips.count++;
                  const amount = parseFloat(metadata.customMetadata.paymentAmount || 0);
                  if (amount > 0) {
                    stats.paymentSlips.totalAmount += amount;
                  }
                  if (metadata.customMetadata.paymentCurrency) {
                    stats.paymentSlips.currencies.add(metadata.customMetadata.paymentCurrency);
                  }
                }
              } catch (itemError) {
                console.warn('⚠️ Error processing item for stats:', itemError);
              }
            }
          }

          stats.byDocumentType[docType] = typeStats;
          
        } catch (typeError) {
          console.warn(`⚠️ Error processing ${docType} for stats:`, typeError);
          stats.byDocumentType[docType] = { folders: 0, files: 0, size: 0 };
        }
      }

      // Convert Set to Array for JSON serialization
      stats.paymentSlips.currencies = Array.from(stats.paymentSlips.currencies);
      
      // Add formatted sizes
      stats.totalSizeFormatted = this.formatFileSize(stats.totalSize);
      
      for (const docType of Object.keys(stats.byDocumentType)) {
        stats.byDocumentType[docType].sizeFormatted = 
          this.formatFileSize(stats.byDocumentType[docType].size);
      }

      console.log('📊 Storage statistics calculated:', stats);
      
      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ Error calculating storage statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Health check method
   * @returns {Promise<Object>} - Service health status
   */
  async healthCheck() {
    try {
      const isReady = this.isReady();
      return {
        isReady,
        hasStorage: !!storage,
        hasApp: !!(storage && storage.app),
        bucketPaths: this.bucketPaths,
        supportedTypes: Object.keys(this.bucketPaths),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        isReady: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 🆕 NEW: Validate Firebase Storage connection
   * @returns {Promise<Object>} - Connection status
   */
  async validateConnection() {
    try {
      console.log('🔍 Validating Firebase Storage connection...');
      
      if (!this.isReady()) {
        throw new Error('Service not ready');
      }

      // Try to list the root documents folder
      const testRef = ref(storage, 'documents');
      await listAll(testRef);
      
      console.log('✅ Firebase Storage connection validated');
      
      return {
        success: true,
        status: 'connected',
        message: 'Firebase Storage is accessible'
      };

    } catch (error) {
      console.error('❌ Firebase Storage connection validation failed:', error);
      
      return {
        success: false,
        status: 'disconnected',
        error: error.message
      };
    }
  }
}

// Export both the class and a default instance for flexibility
export { DocumentStorageService };
export default new DocumentStorageService();
