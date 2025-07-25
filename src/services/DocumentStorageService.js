// src/services/DocumentStorageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from 'firebase/storage';
import { storage } from '../config/firebase';

class DocumentStorageService {
  constructor() {
    this.bucketPaths = {
      po: 'documents/purchase-orders',
      pi: 'documents/proforma-invoices',
      temp: 'documents/temp'
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
   * @param {string} documentType - 'po' or 'pi'
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
          contentType: file.type
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
   * @param {string} documentType - 'po' or 'pi'
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
   * @param {string} documentType - 'po' or 'pi'
   * @param {string} documentNumber - Document number
   * @param {string} documentId - Unique document ID
   * @returns {Promise<Object>} - Storage result
   */
  async storeExtractionData(extractedData, documentType, documentNumber, documentId) {
    try {
      const timestamp = Date.now();
      const sanitizedDocNumber = this.sanitizeFileName(documentNumber);
      const fileName = `${sanitizedDocNumber}_${timestamp}_extraction.json`;
      
      // Create extraction metadata
      const extractionMetadata = {
        documentId,
        documentNumber,
        documentType: documentType.toUpperCase(),
        extractedAt: new Date().toISOString(),
        aiConfidence: extractedData.confidence || 0,
        extractedData: extractedData,
        version: '1.0'
      };

      // Convert to blob
      const jsonBlob = new Blob([JSON.stringify(extractionMetadata, null, 2)], {
        type: 'application/json'
      });

      // Create storage path
      const storagePath = `${this.bucketPaths[documentType]}/${documentId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload metadata
      const metadata = {
        customMetadata: {
          documentType: documentType.toUpperCase(),
          documentNumber: documentNumber,
          documentId: documentId,
          dataType: 'extraction',
          uploadedAt: new Date().toISOString()
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
   * Retrieve all documents for a specific PO/PI
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po' or 'pi'
   * @returns {Promise<Array>} - List of stored documents
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
      const folderPath = `${this.bucketPaths[documentType]}/${documentId}`;
      const folderRef = ref(storage, folderPath);
      
      const listResult = await listAll(folderRef);
      console.log(`📁 Found ${listResult.items.length} files in ${folderPath}`);
      
      const files = await Promise.all(
        listResult.items.map(async (itemRef) => {
          try {
            const downloadURL = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);  // ✅ Using imported getMetadata function
            
            return {
              name: itemRef.name,
              path: itemRef.fullPath,
              fullPath: itemRef.fullPath, // Added for compatibility
              downloadURL: downloadURL,
              size: metadata.size,
              contentType: metadata.contentType,
              timeCreated: metadata.timeCreated,
              updated: metadata.updated,
              customMetadata: metadata.customMetadata || {}
            };
          } catch (fileError) {
            console.error(`❌ Error processing file ${itemRef.name}:`, fileError);
            // Return basic file info even if metadata fails
            try {
              const downloadURL = await getDownloadURL(itemRef);
              return {
                name: itemRef.name,
                path: itemRef.fullPath,
                fullPath: itemRef.fullPath,
                downloadURL: downloadURL,
                size: 0,
                contentType: 'application/octet-stream',
                timeCreated: new Date().toISOString(),
                updated: new Date().toISOString(),
                customMetadata: {}
              };
            } catch (fallbackError) {
              console.error(`❌ Fallback failed for ${itemRef.name}:`, fallbackError);
              return null;
            }
          }
        })
      );

      // Filter out null results
      const validFiles = files.filter(file => file !== null);
      console.log(`✅ Successfully processed ${validFiles.length} documents`);

      return {
        success: true,
        data: validFiles.sort((a, b) => new Date(b.timeCreated) - new Date(a.timeCreated))
      };

    } catch (error) {
      console.error('❌ Error retrieving documents:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
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
   * @param {string} documentType - 'po' or 'pi'
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
      const folderPath = `${this.bucketPaths[documentType]}/${documentId}`;
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
   * @param {string} documentType - 'po' or 'pi'
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
      const folderRef = ref(storage, this.bucketPaths[documentType]);
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
}

// Export both the class and a default instance for flexibility
export { DocumentStorageService };
export default new DocumentStorageService();
