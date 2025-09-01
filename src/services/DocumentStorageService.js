// src/services/DocumentStorageService.js
// HiggsFlow Document Storage Service - Build-Safe Implementation
// Fixed: JavaScript syntax errors and build failures

import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  updateDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll 
} from 'firebase/storage';
import { db, storage } from '../config/firebase';

/**
 * Document Storage Service for HiggsFlow
 * Provides comprehensive document storage and management capabilities
 */
class DocumentStorageService {
  constructor() {
    this.db = db;
    this.storage = storage;
    this.maxFileSize = 50 * 1024 * 1024; // 50MB
    this.allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];
    
    console.log('DocumentStorageService initialized');
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    const errors = [];

    if (!file) {
      errors.push('File is required');
      return errors;
    }

    if (file.size > this.maxFileSize) {
      errors.push(`File size must be less than ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    if (!this.allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`);
    }

    return errors;
  }

  /**
   * Generate unique file name
   */
  generateFileName(originalName, userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = originalName.split('.').pop();
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `${userId}/${timestamp}_${random}_${cleanName}`;
  }

  /**
   * Upload file to Firebase Storage
   */
  async uploadFile(file, metadata = {}) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      // Validate file
      const validationErrors = this.validateFile(file);
      if (validationErrors.length > 0) {
        throw new Error(`File validation failed: ${validationErrors.join(', ')}`);
      }

      const userId = metadata.userId || 'unknown';
      const fileName = this.generateFileName(file.name, userId);
      const storageRef = ref(this.storage, `documents/${fileName}`);

      console.log(`Uploading file: ${fileName}`);

      // Upload file
      const uploadMetadata = {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
          category: metadata.category || 'general',
          description: metadata.description || ''
        }
      };

      const uploadResult = await uploadBytes(storageRef, file, uploadMetadata);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      console.log('File uploaded successfully:', fileName);

      return {
        success: true,
        data: {
          fileName: fileName,
          originalName: file.name,
          downloadURL: downloadURL,
          size: file.size,
          type: file.type,
          path: uploadResult.ref.fullPath
        }
      };

    } catch (error) {
      console.error('Error uploading file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save document metadata to Firestore
   */
  async saveDocumentMetadata(documentData, userId) {
    try {
      if (!documentData || !userId) {
        throw new Error('Document data and user ID are required');
      }

      const documentMetadata = {
        userId: userId,
        fileName: documentData.fileName || '',
        originalName: documentData.originalName || '',
        downloadURL: documentData.downloadURL || '',
        size: documentData.size || 0,
        type: documentData.type || '',
        category: documentData.category || 'general',
        description: documentData.description || '',
        tags: Array.isArray(documentData.tags) ? documentData.tags : [],
        isPrivate: Boolean(documentData.isPrivate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        version: 1,
        status: 'active'
      };

      const documentsCollection = collection(this.db, 'documents');
      const docRef = await addDoc(documentsCollection, documentMetadata);

      console.log('Document metadata saved:', docRef.id);

      return {
        success: true,
        data: {
          id: docRef.id,
          ...documentMetadata
        }
      };

    } catch (error) {
      console.error('Error saving document metadata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload document (file + metadata)
   */
  async uploadDocument(file, metadata = {}) {
    try {
      const userId = metadata.userId;
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Upload file to storage
      const uploadResult = await this.uploadFile(file, metadata);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Save metadata to Firestore
      const documentData = {
        ...uploadResult.data,
        ...metadata
      };

      const metadataResult = await this.saveDocumentMetadata(documentData, userId);
      if (!metadataResult.success) {
        // Try to clean up uploaded file
        try {
          await this.deleteFile(uploadResult.data.fileName);
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError);
        }
        throw new Error(metadataResult.error);
      }

      return {
        success: true,
        data: metadataResult.data
      };

    } catch (error) {
      console.error('Error uploading document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get documents for a user
   */
  async getDocuments(userId, filters = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      let documentsQuery = query(
        collection(this.db, 'documents'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        documentsQuery = query(
          documentsQuery,
          where('category', '==', filters.category)
        );
      }

      if (filters.status && filters.status !== 'all') {
        documentsQuery = query(
          documentsQuery,
          where('status', '==', filters.status)
        );
      }

      const snapshot = await getDocs(documentsQuery);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
      }));

      console.log(`Retrieved ${documents.length} documents for user:`, userId);

      return {
        success: true,
        data: documents
      };

    } catch (error) {
      console.error('Error getting documents:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get single document by ID
   */
  async getDocument(documentId) {
    try {
      if (!documentId) {
        throw new Error('Document ID is required');
      }

      const docRef = doc(this.db, 'documents', documentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }

      const documentData = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || new Date(docSnap.data().createdAt),
        updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date(docSnap.data().updatedAt)
      };

      return {
        success: true,
        data: documentData
      };

    } catch (error) {
      console.error('Error getting document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId, updateData, userId) {
    try {
      if (!documentId || !userId) {
        throw new Error('Document ID and user ID are required');
      }

      // Verify ownership
      const documentResult = await this.getDocument(documentId);
      if (!documentResult.success) {
        throw new Error(documentResult.error);
      }

      if (documentResult.data.userId !== userId) {
        throw new Error('Unauthorized: You can only update your own documents');
      }

      const updateDocument = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: userId
      };

      const docRef = doc(this.db, 'documents', documentId);
      await updateDoc(docRef, updateDocument);

      console.log('Document updated successfully:', documentId);

      return {
        success: true,
        data: {
          id: documentId,
          ...updateDocument
        }
      };

    } catch (error) {
      console.error('Error updating document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete file from storage
   */
  async deleteFile(fileName) {
    try {
      if (!fileName) {
        throw new Error('File name is required');
      }

      const fileRef = ref(this.storage, `documents/${fileName}`);
      await deleteObject(fileRef);

      console.log('File deleted from storage:', fileName);
      return { success: true };

    } catch (error) {
      console.error('Error deleting file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete document (metadata + file)
   */
  async deleteDocument(documentId, userId) {
    try {
      if (!documentId || !userId) {
        throw new Error('Document ID and user ID are required');
      }

      // Get document data first
      const documentResult = await this.getDocument(documentId);
      if (!documentResult.success) {
        throw new Error(documentResult.error);
      }

      const documentData = documentResult.data;

      // Verify ownership
      if (documentData.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own documents');
      }

      // Delete file from storage
      if (documentData.fileName) {
        const fileDeleteResult = await this.deleteFile(documentData.fileName);
        if (!fileDeleteResult.success) {
          console.warn('Failed to delete file from storage:', fileDeleteResult.error);
        }
      }

      // Delete metadata from Firestore
      const docRef = doc(this.db, 'documents', documentId);
      await deleteDoc(docRef);

      console.log('Document deleted successfully:', documentId);

      return { success: true };

    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(userId, searchTerm, filters = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get all documents first (Firestore doesn't support full-text search)
      const documentsResult = await this.getDocuments(userId, filters);
      if (!documentsResult.success) {
        throw new Error(documentsResult.error);
      }

      let documents = documentsResult.data;

      // Filter by search term if provided
      if (searchTerm && typeof searchTerm === 'string') {
        const term = searchTerm.toLowerCase();
        documents = documents.filter(doc => {
          return (
            (doc.originalName || '').toLowerCase().includes(term) ||
            (doc.description || '').toLowerCase().includes(term) ||
            (doc.category || '').toLowerCase().includes(term) ||
            (Array.isArray(doc.tags) ? doc.tags.join(' ') : '').toLowerCase().includes(term)
          );
        });
      }

      return {
        success: true,
        data: documents
      };

    } catch (error) {
      console.error('Error searching documents:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get document categories
   */
  async getDocumentCategories(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const documentsResult = await this.getDocuments(userId);
      if (!documentsResult.success) {
        throw new Error(documentsResult.error);
      }

      const categories = new Set();
      documentsResult.data.forEach(doc => {
        if (doc.category) {
          categories.add(doc.category);
        }
      });

      return {
        success: true,
        data: Array.from(categories).sort()
      };

    } catch (error) {
      console.error('Error getting document categories:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get document statistics
   */
  async getDocumentStatistics(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const documentsResult = await this.getDocuments(userId);
      if (!documentsResult.success) {
        throw new Error(documentsResult.error);
      }

      const documents = documentsResult.data;
      const stats = {
        totalDocuments: documents.length,
        totalSize: 0,
        byCategory: {},
        byType: {},
        recentUploads: 0
      };

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      documents.forEach(doc => {
        // Total size
        if (typeof doc.size === 'number') {
          stats.totalSize += doc.size;
        }

        // By category
        const category = doc.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // By type
        const type = doc.type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Recent uploads
        if (doc.createdAt && doc.createdAt > thirtyDaysAgo) {
          stats.recentUploads++;
        }
      });

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Error getting document statistics:', error);
      return {
        success: false,
        error: error.message,
        data: {
          totalDocuments: 0,
          totalSize: 0,
          byCategory: {},
          byType: {},
          recentUploads: 0
        }
      };
    }
  }

  /**
   * Subscribe to real-time document updates
   */
  subscribeToDocuments(userId, callback) {
    try {
      if (!userId || typeof callback !== 'function') {
        throw new Error('User ID and callback function are required');
      }

      console.log('Setting up real-time documents subscription for user:', userId);

      const documentsQuery = query(
        collection(this.db, 'documents'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(
        documentsQuery,
        (snapshot) => {
          const documents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
          }));

          console.log(`Real-time update: ${documents.length} documents`);
          callback({
            success: true,
            data: documents
          });
        },
        (error) => {
          console.error('Real-time subscription error:', error);
          callback({
            success: false,
            error: error.message,
            data: []
          });
        }
      );

      return unsubscribe;

    } catch (error) {
      console.error('Error setting up documents subscription:', error);
      return () => {};
    }
  }

  /**
   * Bulk delete documents
   */
  async bulkDeleteDocuments(documentIds, userId) {
    try {
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        throw new Error('Document IDs array is required');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log(`Starting bulk delete of ${documentIds.length} documents`);

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const documentId of documentIds) {
        try {
          const deleteResult = await this.deleteDocument(documentId, userId);
          results.push({
            documentId,
            success: deleteResult.success,
            error: deleteResult.error
          });

          if (deleteResult.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          results.push({
            documentId,
            success: false,
            error: error.message
          });
          errorCount++;
        }
      }

      console.log(`Bulk delete completed: ${successCount} successful, ${errorCount} failed`);

      return {
        success: successCount > 0,
        data: {
          totalProcessed: documentIds.length,
          successCount,
          errorCount,
          results
        }
      };

    } catch (error) {
      console.error('Error in bulk delete documents:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cleanup orphaned files (files without metadata)
   */
  async cleanupOrphanedFiles(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log('Starting cleanup of orphaned files for user:', userId);

      // Get all document metadata
      const documentsResult = await this.getDocuments(userId);
      if (!documentsResult.success) {
        throw new Error(documentsResult.error);
      }

      const documentFileNames = new Set(
        documentsResult.data.map(doc => doc.fileName).filter(Boolean)
      );

      // List all files in user's folder
      const userFolderRef = ref(this.storage, `documents/${userId}`);
      const filesList = await listAll(userFolderRef);

      const orphanedFiles = [];
      for (const fileRef of filesList.items) {
        const fileName = fileRef.name;
        if (!documentFileNames.has(`${userId}/${fileName}`)) {
          orphanedFiles.push(fileName);
        }
      }

      console.log(`Found ${orphanedFiles.length} orphaned files`);

      // Delete orphaned files
      let deletedCount = 0;
      for (const fileName of orphanedFiles) {
        try {
          const deleteResult = await this.deleteFile(`${userId}/${fileName}`);
          if (deleteResult.success) {
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Failed to delete orphaned file ${fileName}:`, error);
        }
      }

      return {
        success: true,
        data: {
          orphanedFilesFound: orphanedFiles.length,
          orphanedFilesDeleted: deletedCount
        }
      };

    } catch (error) {
      console.error('Error cleaning up orphaned files:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const documentStorageService = new DocumentStorageService();

export default documentStorageService;
export { DocumentStorageService };
