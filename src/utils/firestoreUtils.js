// src/utils/firestoreUtils.js - CORS & Timestamp Conversion Utilities
import { Timestamp } from 'firebase/firestore';

/**
 * Safe timestamp conversion utility
 * Handles both Firestore Timestamps and regular Date objects/strings
 */
export const safeTimestampConversion = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp;
    }
    
    // If it's a Firestore Timestamp with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    // If it's a Firestore Timestamp-like object with seconds
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? null : date;
    }
    
    // If it's a number (Unix timestamp)
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    
    console.warn('Unknown timestamp format:', timestamp);
    return null;
  } catch (error) {
    console.error('Error converting timestamp:', error, timestamp);
    return null;
  }
};

/**
 * Safe data processing for Firestore documents
 * Converts timestamps and handles missing toDate methods
 */
export const processFirestoreDocument = (doc) => {
  if (!doc) return null;
  
  try {
    const data = doc.data ? doc.data() : doc;
    const processed = { id: doc.id || data.id, ...data };
    
    // Convert common timestamp fields
    const timestampFields = [
      'createdAt', 'updatedAt', 'lastModified', 'timestamp',
      'dueDate', 'deliveryDate', 'orderDate', 'invoiceDate',
      'lastSync', 'lastAccessed', 'expiryDate'
    ];
    
    timestampFields.forEach(field => {
      if (processed[field]) {
        processed[field] = safeTimestampConversion(processed[field]);
      }
    });
    
    // Process nested objects for timestamps
    Object.keys(processed).forEach(key => {
      if (processed[key] && typeof processed[key] === 'object' && !Array.isArray(processed[key])) {
        // Check if it's a timestamp object
        if (processed[key].seconds || processed[key].toDate) {
          processed[key] = safeTimestampConversion(processed[key]);
        } else {
          // Process nested timestamp fields
          timestampFields.forEach(field => {
            if (processed[key][field]) {
              processed[key][field] = safeTimestampConversion(processed[key][field]);
            }
          });
        }
      }
    });
    
    return processed;
  } catch (error) {
    console.error('Error processing Firestore document:', error);
    return doc;
  }
};

/**
 * CORS-safe Firestore operation wrapper
 * Provides fallback behavior when Firestore operations fail due to CORS
 */
export const corsAwareFirestoreOperation = async (operation, fallbackData = null, operationName = 'Firestore operation') => {
  try {
    const result = await operation();
    console.log(`✅ ${operationName} succeeded`);
    return { success: true, data: result, source: 'firestore' };
  } catch (error) {
    console.error(`❌ ${operationName} failed:`, error);
    
    // Check for CORS-related errors
    const isCorsError = error.message?.includes('CORS') || 
                       error.message?.includes('access control') ||
                       error.message?.includes('Failed to fetch') ||
                       error.code === 'unavailable' ||
                       error.code === 'permission-denied';
    
    if (isCorsError) {
      console.warn(`🌐 CORS issue detected in ${operationName}, using fallback data`);
      return { 
        success: false, 
        data: fallbackData, 
        source: 'fallback', 
        error: 'CORS_ERROR',
        corsIssue: true 
      };
    }
    
    return { 
      success: false, 
      data: fallbackData, 
      source: 'error', 
      error: error.message 
    };
  }
};

/**
 * Safe query execution with CORS fallback
 */
export const safeQueryExecution = async (queryFn, fallbackData = [], operationName = 'Query') => {
  try {
    const result = await corsAwareFirestoreOperation(queryFn, fallbackData, operationName);
    
    if (result.success && result.data) {
      // Process documents if it's a query snapshot
      if (result.data.docs) {
        return result.data.docs.map(doc => processFirestoreDocument(doc));
      }
      // Process single document
      if (result.data.exists && result.data.exists()) {
        return processFirestoreDocument(result.data);
      }
      // Return as-is if already processed
      return result.data;
    }
    
    console.warn(`📋 Using fallback data for ${operationName}`);
    return fallbackData;
  } catch (error) {
    console.error(`Error in safe query execution for ${operationName}:`, error);
    return fallbackData;
  }
};

/**
 * Retry mechanism for failed Firestore operations
 */
export const retryFirestoreOperation = async (operation, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      console.log(`✅ Firestore operation succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      console.warn(`⚠️ Firestore operation failed on attempt ${attempt}:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

/**
 * Enhanced Firestore connection checker
 */
export const checkFirestoreConnection = async (db) => {
  try {
    // Try a simple operation to test connection
    const testResult = await corsAwareFirestoreOperation(
      async () => {
        const { collection, getDocs, query, limit } = await import('firebase/firestore');
        const testQuery = query(collection(db, 'test'), limit(1));
        return await getDocs(testQuery);
      },
      null,
      'Connection Test'
    );
    
    return {
      connected: testResult.success,
      corsIssue: testResult.corsIssue || false,
      error: testResult.error || null
    };
  } catch (error) {
    return {
      connected: false,
      corsIssue: true,
      error: error.message
    };
  }
};

/**
 * Local storage fallback for when Firestore is unavailable
 */
export const getDataWithFallback = async (firestoreOperation, localStorageKey, defaultData = []) => {
  try {
    // Try Firestore first
    const firestoreResult = await safeQueryExecution(firestoreOperation, null, `Get ${localStorageKey}`);
    
    if (firestoreResult && firestoreResult.length > 0) {
      // Cache successful Firestore data to localStorage
      localStorage.setItem(`${localStorageKey}_backup`, JSON.stringify(firestoreResult));
      return { data: firestoreResult, source: 'firestore' };
    }
  } catch (error) {
    console.warn(`Firestore operation failed for ${localStorageKey}:`, error);
  }
  
  // Fallback to localStorage
  try {
    const localData = localStorage.getItem(localStorageKey);
    if (localData) {
      const parsedData = JSON.parse(localData);
      console.log(`📱 Using localStorage data for ${localStorageKey}`);
      return { data: parsedData, source: 'localStorage' };
    }
    
    // Try backup data
    const backupData = localStorage.getItem(`${localStorageKey}_backup`);
    if (backupData) {
      const parsedBackup = JSON.parse(backupData);
      console.log(`💾 Using backup data for ${localStorageKey}`);
      return { data: parsedBackup, source: 'backup' };
    }
  } catch (error) {
    console.error(`Error reading localStorage for ${localStorageKey}:`, error);
  }
  
  // Final fallback to default data
  console.log(`🔧 Using default data for ${localStorageKey}`);
  return { data: defaultData, source: 'default' };
};

/**
 * Create a Firestore-compatible timestamp for the current time
 */
export const createTimestamp = () => {
  try {
    // Try to create a Firestore server timestamp
    const { serverTimestamp } = require('firebase/firestore');
    return serverTimestamp();
  } catch (error) {
    // Fallback to regular Date
    return new Date();
  }
};

/**
 * Convert data to be Firestore-safe (removes undefined values)
 */
export const sanitizeForFirestore = (data) => {
  if (data === null || data === undefined) return null;
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForFirestore).filter(item => item !== undefined);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    Object.keys(data).forEach(key => {
      const value = sanitizeForFirestore(data[key]);
      if (value !== undefined) {
        sanitized[key] = value;
      }
    });
    return sanitized;
  }
  
  return data;
};
