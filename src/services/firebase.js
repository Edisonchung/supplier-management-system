// src/services/firebase.js
// HiggsFlow Firebase Service - Build-Safe Implementation
// Fixed: JavaScript syntax errors and build failures

import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyC8K9X9QJY9YGJ9X9X9X9X9X9X9X9X9X9X",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "higgsflow-b9f81.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "higgsflow-b9f81",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "higgsflow-b9f81.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:123456789012:web:abc123def456ghi789jkl"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_USE_EMULATORS === 'true') {
  try {
    // Only connect if not already connected
    if (!db._delegate._databaseId.projectId.includes('demo-')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099');
    }
    if (!storage._delegate._host.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
    if (!functions._delegate.region.includes('localhost')) {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    }
    
    console.log('Connected to Firebase emulators');
  } catch (error) {
    console.warn('Firebase emulator connection failed:', error.message);
  }
}

/**
 * Clean data for Firestore compatibility
 * Removes undefined values and handles complex objects
 */
export const cleanFirestoreData = (data) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => cleanFirestoreData(item)).filter(item => item !== undefined);
  }

  const cleaned = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      // Skip undefined values as Firestore doesn't support them
      continue;
    } else if (value === null) {
      cleaned[key] = null;
    } else if (typeof value === 'function') {
      // Skip functions
      continue;
    } else if (value instanceof Date) {
      cleaned[key] = value;
    } else if (typeof value === 'object') {
      const cleanedValue = cleanFirestoreData(value);
      if (cleanedValue !== undefined && cleanedValue !== null) {
        cleaned[key] = cleanedValue;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

/**
 * Safe document update with data cleaning
 */
export const safeUpdateDocument = async (docRef, updates) => {
  try {
    if (!docRef || !updates) {
      throw new Error('Document reference and updates are required');
    }

    // Clean updates based on type
    let cleanUpdates;
    
    // Check if this is a payment-related update
    if (updates.paymentStatus || updates.stripePaymentIntentId || updates.paymentMethod) {
      // Special handling for payment updates to preserve important fields
      cleanUpdates = {
        ...updates,
        paymentStatus: updates.paymentStatus || null,
        paymentMethod: updates.paymentMethod || null,
        stripePaymentIntentId: updates.stripePaymentIntentId || null,
        paymentDate: updates.paymentDate || null,
        paymentAmount: typeof updates.paymentAmount === 'number' ? updates.paymentAmount : null,
        updatedAt: updates.updatedAt || new Date()
      };
      
      // Remove undefined values
      Object.keys(cleanUpdates).forEach(key => {
        if (cleanUpdates[key] === undefined) {
          delete cleanUpdates[key];
        }
      });
    } else {
      // Normal cleaning for non-payment updates
      cleanUpdates = cleanFirestoreData({
        ...updates,
        updatedAt: updates.updatedAt || new Date()
      });
    }

    // Import updateDoc dynamically to avoid circular dependency
    const { updateDoc } = await import('firebase/firestore');
    
    await updateDoc(docRef, cleanUpdates);
    
    console.log('Document updated successfully');
    
    return {
      success: true,
      data: cleanUpdates
    };

  } catch (error) {
    console.error('Error updating document:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Safe document creation with data cleaning
 */
export const safeCreateDocument = async (collectionRef, data) => {
  try {
    if (!collectionRef || !data) {
      throw new Error('Collection reference and data are required');
    }

    const cleanedData = cleanFirestoreData({
      ...data,
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date()
    });

    // Import addDoc dynamically to avoid circular dependency
    const { addDoc } = await import('firebase/firestore');
    
    const docRef = await addDoc(collectionRef, cleanedData);
    
    console.log('Document created successfully:', docRef.id);
    
    return {
      success: true,
      id: docRef.id,
      data: cleanedData
    };

  } catch (error) {
    console.error('Error creating document:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Safe batch operations with data cleaning
 */
export const safeBatchOperation = async (operations) => {
  try {
    if (!Array.isArray(operations) || operations.length === 0) {
      throw new Error('Operations array is required');
    }

    // Import batch operations dynamically
    const { writeBatch } = await import('firebase/firestore');
    
    const batch = writeBatch(db);
    
    operations.forEach(operation => {
      const { type, ref, data } = operation;
      
      switch (type) {
        case 'create':
        case 'set':
          batch.set(ref, cleanFirestoreData(data));
          break;
        case 'update':
          batch.update(ref, cleanFirestoreData(data));
          break;
        case 'delete':
          batch.delete(ref);
          break;
        default:
          console.warn('Unknown batch operation type:', type);
      }
    });
    
    await batch.commit();
    
    console.log(`Batch operation completed: ${operations.length} operations`);
    
    return {
      success: true,
      operationsCount: operations.length
    };

  } catch (error) {
    console.error('Error in batch operation:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Safe query execution with error handling
 */
export const safeQueryExecution = async (query) => {
  try {
    if (!query) {
      throw new Error('Query is required');
    }

    // Import getDocs dynamically
    const { getDocs } = await import('firebase/firestore');
    
    const snapshot = await getDocs(query);
    
    const docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to Date objects
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
    }));
    
    console.log(`Query executed successfully: ${docs.length} documents`);
    
    return {
      success: true,
      data: docs,
      count: docs.length
    };

  } catch (error) {
    console.error('Error executing query:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Safe real-time subscription with error handling
 */
export const safeRealtimeSubscription = (query, callback, errorCallback) => {
  try {
    if (!query || typeof callback !== 'function') {
      throw new Error('Query and callback function are required');
    }

    // Import onSnapshot dynamically
    import('firebase/firestore').then(({ onSnapshot }) => {
      const unsubscribe = onSnapshot(
        query,
        (snapshot) => {
          try {
            const docs = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
              updatedAt: doc.data().updatedAt?.toDate?.() || doc.data().updatedAt
            }));

            callback({
              success: true,
              data: docs,
              count: docs.length
            });
          } catch (callbackError) {
            console.error('Error in subscription callback:', callbackError);
            if (typeof errorCallback === 'function') {
              errorCallback(callbackError);
            }
          }
        },
        (error) => {
          console.error('Real-time subscription error:', error);
          if (typeof errorCallback === 'function') {
            errorCallback(error);
          } else {
            callback({
              success: false,
              error: error.message,
              data: []
            });
          }
        }
      );

      return unsubscribe;
    });

  } catch (error) {
    console.error('Error setting up real-time subscription:', error);
    if (typeof errorCallback === 'function') {
      errorCallback(error);
    }
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Validate Firestore data before operations
 */
export const validateFirestoreData = (data, requiredFields = []) => {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be a valid object');
    return errors;
  }

  // Check required fields
  requiredFields.forEach(field => {
    if (!data.hasOwnProperty(field) || data[field] === undefined || data[field] === null) {
      errors.push(`Required field '${field}' is missing or null`);
    }
  });

  // Check for unsupported values
  const checkValue = (value, path = '') => {
    if (value === undefined) {
      errors.push(`Undefined value found at ${path || 'root'}`);
    } else if (typeof value === 'function') {
      errors.push(`Function found at ${path || 'root'} - functions are not supported`);
    } else if (typeof value === 'symbol') {
      errors.push(`Symbol found at ${path || 'root'} - symbols are not supported`);
    } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          checkValue(item, `${path}[${index}]`);
        });
      } else {
        Object.entries(value).forEach(([key, val]) => {
          checkValue(val, path ? `${path}.${key}` : key);
        });
      }
    }
  };

  checkValue(data);

  return errors;
};

/**
 * Get document safely with error handling
 */
export const safeGetDocument = async (docRef) => {
  try {
    if (!docRef) {
      throw new Error('Document reference is required');
    }

    // Import getDoc dynamically
    const { getDoc } = await import('firebase/firestore');
    
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return {
        success: false,
        error: 'Document not found',
        exists: false
      };
    }

    const data = {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() || docSnap.data().createdAt,
      updatedAt: docSnap.data().updatedAt?.toDate?.() || docSnap.data().updatedAt
    };

    return {
      success: true,
      data,
      exists: true
    };

  } catch (error) {
    console.error('Error getting document:', error);
    return {
      success: false,
      error: error.message,
      exists: false
    };
  }
};

/**
 * Delete document safely with error handling
 */
export const safeDeleteDocument = async (docRef) => {
  try {
    if (!docRef) {
      throw new Error('Document reference is required');
    }

    // Import deleteDoc dynamically
    const { deleteDoc } = await import('firebase/firestore');
    
    await deleteDoc(docRef);
    
    console.log('Document deleted successfully');
    
    return {
      success: true
    };

  } catch (error) {
    console.error('Error deleting document:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize Firebase services with error handling
 */
export const initializeFirebaseServices = () => {
  try {
    console.log('Firebase services initialized successfully');
    console.log('Project ID:', firebaseConfig.projectId);
    
    return {
      app,
      db,
      auth,
      storage,
      functions,
      initialized: true
    };
  } catch (error) {
    console.error('Error initializing Firebase services:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
};

// Default export
export default app;
