// src/config/firebase.js - Updated Firebase Implementation with CORS and Admin Fixes
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import { 
  getStorage, 
  connectStorageEmulator,
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll, 
  getMetadata 
} from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// ✅ CORS FIX: Initialize Firebase with specific settings
const app = initializeApp(firebaseConfig);

// ✅ CORS FIX: Initialize Firestore with offline persistence and CORS handling
let db;
try {
  // Try to initialize with persistence first
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    // ✅ CORS FIX: Use long polling instead of websockets to avoid CORS
    experimentalForceLongPolling: true,
  });
  console.log('🔥 Firestore initialized with persistence and long polling');
} catch (error) {
  console.warn('⚠️ Firestore persistence failed, using default:', error.message);
  // Fallback to default initialization
  db = getFirestore(app);
}

// Initialize other services
export const auth = getAuth(app);
export const storage = getStorage(app);
export { db };

// ✅ FIXED: Better environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

console.log('🔥 Firebase initialized');
console.log('🔧 Environment:', isDevelopment ? 'development' : 'production');
console.log('🔧 Project ID:', firebaseConfig.projectId);

// ✅ CORS FIX: Disable real-time listeners in production to avoid CORS
const USE_REALTIME_LISTENERS = isDevelopment;

// ✅ FIXED: Safe document existence check
export const documentExists = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking document existence:', error);
    return false;
  }
};

// ✅ FIXED: Safe document getter with proper error handling
export const safeGetDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        exists: true,
        data: docSnap.data(),
        id: docSnap.id
      };
    } else {
      return {
        exists: false,
        data: null,
        id: null
      };
    }
  } catch (error) {
    console.error('Error getting document:', error);
    return {
      exists: false,
      data: null,
      id: null,
      error: error.message
    };
  }
};

// ✅ CORS FIX: Enhanced safe set document
export const safeSetDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleanData = cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp()
    });
    
    await setDoc(docRef, cleanData);
    console.log(`✅ Document set successfully: ${collectionName}/${docId}`);
    return { success: true, id: docId };
  } catch (error) {
    console.error(`Error setting document ${collectionName}/${docId}:`, error);
    return { success: false, error: error.message };
  }
};

// ✅ CORS FIX: Enhanced safe add document
export const safeAddDocument = async (collectionName, data) => {
  try {
    const collectionRef = collection(db, collectionName);
    const cleanData = cleanFirestoreData({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const docRef = await addDoc(collectionRef, cleanData);
    console.log(`✅ Document added successfully: ${collectionName}/${docRef.id}`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error(`Error adding document to ${collectionName}:`, error);
    return { success: false, error: error.message };
  }
};

// ✅ CORS FIX: Enhanced safe update document
export const safeUpdateDocument = async (collectionName, docId, updates) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const cleanUpdates = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(docRef, cleanUpdates);
    console.log(`✅ Document updated successfully: ${collectionName}/${docId}`);
    return { success: true, id: docId };
  } catch (error) {
    console.error(`Error updating document ${collectionName}/${docId}:`, error);
    return { success: false, error: error.message };
  }
};

// ✅ CORS FIX: Enhanced safe get collection
export const safeGetCollection = async (collectionName, queryConstraints = []) => {
  try {
    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Collection loaded successfully: ${collectionName} (${data.length} items)`);
    return { success: true, data };
  } catch (error) {
    console.error(`Error getting collection ${collectionName}:`, error);
    return { success: false, data: [], error: error.message };
  }
};

// ✅ FIXED: Clean data helper function
const cleanFirestoreData = (data) => {
  const cleaned = { ...data };
  
  // Remove undefined and null values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null) {
      delete cleaned[key];
    }
  });
  
  return cleaned;
};

// ✅ CORS FIX: Safe connection test without real-time listeners
const testFirestoreConnection = async (retryCount = 0) => {
  try {
    // Simple read operation instead of real-time listener
    const testRef = doc(db, 'test', 'connection');
    await getDoc(testRef);
    
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error) {
    console.warn(`⚠️ Firestore connection attempt ${retryCount + 1} failed:`, error.code || error.message);
    
    // Handle specific CORS errors
    if (error.message?.includes('CORS') || error.code === 'unavailable') {
      console.log('🌐 CORS issue detected - using fallback mode');
      return false;
    }
    
    // Retry logic for other errors
    if (retryCount < 3 && (error.code === 'unavailable' || error.code === 'failed-precondition')) {
      console.log(`🔄 Retrying connection in ${(retryCount + 1) * 2} seconds...`);
      setTimeout(() => testFirestoreConnection(retryCount + 1), (retryCount + 1) * 2000);
    }
    
    return false;
  }
};

// ✅ CORS FIX: Enhanced network handling with CORS awareness
const handleNetworkStatus = () => {
  let isOnline = navigator.onLine;
  
  const handleOnline = async () => {
    if (!isOnline) {
      console.log('🌐 Network restored');
      isOnline = true;
      
      try {
        await enableNetwork(db);
        setTimeout(() => testFirestoreConnection(), 1000);
      } catch (error) {
        console.warn('Failed to enable network:', error.message);
      }
    }
  };
  
  const handleOffline = async () => {
    if (isOnline) {
      console.log('📱 Network lost - enabling offline mode');
      isOnline = false;
      
      try {
        await disableNetwork(db);
      } catch (error) {
        console.warn('Failed to disable network:', error.message);
      }
    }
  };
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Initial network state check
  if (!navigator.onLine) {
    handleOffline();
  }
};

// Initialize network handling
handleNetworkStatus();

// ✅ CORS FIX: Delay initial connection test to avoid startup CORS issues
setTimeout(() => {
  testFirestoreConnection();
}, 2000);

// ✅ ADMIN FIX: Create Edison's admin assignment if it doesn't exist
export const ensureEdisonAdminAccess = async () => {
  const email = 'edisonchung@flowsolution.net';
  
  try {
    console.log('🔍 Checking Edison admin assignment...');
    
    // Check if assignment already exists
    const result = await safeGetDocument('adminAssignments', email);
    
    if (result.success && result.exists) {
      console.log('✅ Edison admin assignment already exists');
      return { success: true, existed: true };
    }
    
    console.log('➕ Creating Edison admin assignment...');
    
    // Create the admin assignment
    const adminData = {
      role: 'group_admin',
      companyIds: ['*'],
      branchIds: ['*'],
      permissions: [
        'view_all', 
        'edit_all', 
        'manage_users', 
        'manage_companies', 
        'financial_oversight',
        'system_admin'
      ],
      assignedDate: new Date().toISOString(),
      assignedBy: 'system',
      badge: '👑 Group CEO - All Companies',
      title: 'Group Chief Executive Officer',
      level: 1,
      email: email,
      isSystemAdmin: true,
      isSuperAdmin: true
    };
    
    const setResult = await safeSetDocument('adminAssignments', email, adminData);
    
    if (setResult.success) {
      console.log('✅ Edison admin assignment created successfully');
      return { success: true, created: true };
    } else {
      console.error('❌ Failed to create Edison admin assignment:', setResult.error);
      return { success: false, error: setResult.error };
    }
    
  } catch (error) {
    console.error('❌ Error ensuring Edison admin access:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ADMIN FIX: Initialize system data for first-time setup
export const initializeSystemData = async () => {
  try {
    console.log('🚀 Initializing system data...');
    
    // 1. Ensure Edison's admin access
    const adminResult = await ensureEdisonAdminAccess();
    
    if (!adminResult.success) {
      console.error('❌ Failed to setup admin access');
      return { success: false, error: 'Admin setup failed' };
    }
    
    // 2. Create system configuration if it doesn't exist
    const configResult = await safeGetDocument('systemConfig', 'appSettings');
    
    if (!configResult.success || !configResult.exists) {
      console.log('➕ Creating system configuration...');
      
      const systemConfig = {
        appName: 'HiggsFlow Supplier Management',
        version: '1.0.0',
        initialized: true,
        initializationDate: new Date().toISOString(),
        superAdmin: 'edisonchung@flowsolution.net',
        defaultRole: 'viewer',
        features: {
          multiCompany: true,
          paymentProcessing: true,
          aiExtraction: true,
          batchUpload: true
        }
      };
      
      await safeSetDocument('systemConfig', 'appSettings', systemConfig);
      console.log('✅ System configuration created');
    }
    
    // 3. Create a test document to verify write permissions
    const testData = {
      message: 'System initialization test',
      timestamp: new Date().toISOString(),
      success: true
    };
    
    const testResult = await safeSetDocument('test', 'initialization', testData);
    
    if (testResult.success) {
      console.log('✅ System initialization completed successfully');
      return { success: true, adminSetup: adminResult };
    } else {
      console.error('❌ Test write failed:', testResult.error);
      return { success: false, error: 'Write test failed' };
    }
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    return { success: false, error: error.message };
  }
};

// ✅ STARTUP: Run initialization checks
setTimeout(async () => {
  console.log('🔄 Running startup initialization...');
  await initializeSystemData();
}, 5000); // Wait 5 seconds for Firebase to fully initialize

// ✅ ENHANCED: Proforma Invoices with better error handling
export const getProformaInvoices = async () => {
  const result = await safeGetCollection('proformaInvoices');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

// ✅ ENHANCED: Add PI with better data cleaning
export const addProformaInvoice = async (invoice) => {
  try {
    console.log('💾 FIRESTORE: Adding PI with data:', invoice);
    
    // ✅ FIXED: Build clean document data without undefined fields
    const docData = cleanFirestoreData({
      ...invoice,
      // Core document storage fields
      documentId: invoice.documentId,
      documentNumber: invoice.documentNumber,
      documentType: invoice.documentType || 'pi',
      hasStoredDocuments: !!invoice.hasStoredDocuments,
      
      // Optional storage metadata (only if they have values)
      ...(invoice.storageInfo && { storageInfo: invoice.storageInfo }),
      ...(invoice.originalFileName && { originalFileName: invoice.originalFileName }),
      ...(invoice.fileSize && { fileSize: invoice.fileSize }),
      ...(invoice.contentType && { contentType: invoice.contentType }),
      ...(invoice.extractedAt && { extractedAt: invoice.extractedAt }),
      ...(invoice.storedAt && { storedAt: invoice.storedAt }),
    });

    const result = await safeAddDocument('proformaInvoices', docData);
    
    if (result.success) {
      return {
        success: true,
        data: { id: result.id, ...docData, createdAt: new Date(), updatedAt: new Date() }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error adding proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ENHANCED: Update PI with proper data cleaning
export const updateProformaInvoice = async (id, updates) => {
  try {
    console.log('💾 FIRESTORE: Updating PI:', { id, updates });
    
    const result = await safeUpdateDocument('proformaInvoices', id, updates);
    
    if (result.success) {
      return {
        success: true,
        data: { id, ...updates, updatedAt: new Date() }
      };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error updating proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

export const deleteProformaInvoice = async (id) => {
  try {
    await deleteDoc(doc(db, 'proformaInvoices', id));
    console.log(`🗑️ FIRESTORE: Deleted PI ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

export const updateDeliveryStatus = async (id, status) => {
  return updateProformaInvoice(id, { deliveryStatus: status });
};

// ✅ ENHANCED: Suppliers with error handling
export const getSuppliers = async () => {
  const result = await safeGetCollection('suppliers');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const addSupplier = async (supplier) => {
  const result = await safeAddDocument('suppliers', supplier);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.id, ...supplier, createdAt: new Date(), updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateSupplier = async (id, updates) => {
  const result = await safeUpdateDocument('suppliers', id, updates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...updates, updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteSupplier = async (id) => {
  try {
    await deleteDoc(doc(db, 'suppliers', id));
    console.log(`🗑️ Deleted supplier: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ENHANCED: Products with error handling
export const getProducts = async () => {
  const result = await safeGetCollection('products');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const addProduct = async (product) => {
  const result = await safeAddDocument('products', product);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.id, ...product, createdAt: new Date(), updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateProduct = async (id, updates) => {
  const result = await safeUpdateDocument('products', id, updates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...updates, updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteProduct = async (id) => {
  try {
    await deleteDoc(doc(db, 'products', id));
    console.log(`🗑️ Deleted product: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ENHANCED: Purchase Orders with error handling
export const getPurchaseOrders = async () => {
  const result = await safeGetCollection('purchaseOrders');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const addPurchaseOrder = async (order) => {
  const result = await safeAddDocument('purchaseOrders', order);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.id, ...order, createdAt: new Date(), updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updatePurchaseOrder = async (id, updates) => {
  const result = await safeUpdateDocument('purchaseOrders', id, updates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...updates, updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deletePurchaseOrder = async (id) => {
  try {
    await deleteDoc(doc(db, 'purchaseOrders', id));
    console.log(`🗑️ Deleted purchase order: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ENHANCED: Client Invoices with error handling
export const getClientInvoices = async () => {
  const result = await safeGetCollection('clientInvoices');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const addClientInvoice = async (invoice) => {
  const result = await safeAddDocument('clientInvoices', invoice);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.id, ...invoice, createdAt: new Date(), updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateClientInvoice = async (id, updates) => {
  const result = await safeUpdateDocument('clientInvoices', id, updates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...updates, updatedAt: new Date() }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteClientInvoice = async (id) => {
  try {
    await deleteDoc(doc(db, 'clientInvoices', id));
    console.log(`🗑️ Deleted client invoice: ${id}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting client invoice:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ENHANCED: Query functions with error handling
export const getInvoicesByPOId = async (poId) => {
  const result = await safeGetCollection('clientInvoices', [where('poId', '==', poId)]);
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const updateInvoicePaymentStatus = async (id, paymentData) => {
  const updateData = {
    paymentStatus: paymentData.status,
    paidAmount: paymentData.paidAmount || 0,
    paymentDate: paymentData.paymentDate,
    paymentMethod: paymentData.paymentMethod
  };
  
  return updateClientInvoice(id, updateData);
};

// ✅ FIXED: Enhanced compatibility layer with proper error handling
export const mockFirebase = {
  firestore: {
    collection: (collectionName) => ({
      get: async () => {
        const result = await safeGetCollection(collectionName);
        
        if (result.success) {
          return {
            docs: result.data.map(item => ({
              id: item.id,
              data: () => {
                const { id, ...data } = item;
                return data;
              },
              exists: () => true
            }))
          };
        } else {
          console.warn(`Collection ${collectionName} get failed:`, result.error);
          return { docs: [] };
        }
      },
      
      doc: (docId) => ({
        get: async () => {
          const result = await safeGetDocument(collectionName, docId);
          
          return {
            exists: () => result.success && result.exists,
            data: () => result.success ? result.data : null,
            id: result.success ? result.id : null
          };
        },
        
        set: async (data, options = {}) => {
          if (options.merge) {
            return await safeUpdateDocument(collectionName, docId, data);
          } else {
            return await safeSetDocument(collectionName, docId, data);
          }
        },
        
        update: async (updates) => {
          return await safeUpdateDocument(collectionName, docId, updates);
        },
        
        delete: async () => {
          try {
            const docRef = doc(db, collectionName, docId);
            await deleteDoc(docRef);
            return { success: true };
          } catch (error) {
            console.error(`Error deleting document ${docId}:`, error);
            return { success: false, error: error.message };
          }
        }
      }),
      
      add: async (data) => {
        return await safeAddDocument(collectionName, data);
      },
      
      where: (field, operator, value) => ({
        get: async () => {
          const result = await safeGetCollection(collectionName, [where(field, operator, value)]);
          
          if (result.success) {
            return {
              empty: result.data.length === 0,
              docs: result.data.map(item => ({
                id: item.id,
                data: () => {
                  const { id, ...data } = item;
                  return data;
                },
                exists: () => true
              }))
            };
          } else {
            console.warn(`Query ${collectionName} where ${field} ${operator} ${value} failed:`, result.error);
            return { empty: true, docs: [] };
          }
        }
      })
    })
  }
};

// Export all Firebase functions
export {
  // Auth functions
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  
  // Firestore functions  
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  enableNetwork,
  disableNetwork,
  
  // Storage functions
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
};

export default app;
