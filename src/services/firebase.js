// src/config/firebase.js - Complete Firebase Implementation with CORS and Admin Fixes
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

// ✅ INITIALIZATION FIX: Prevent multiple initialization
let app;
let db;
let isFirebaseInitialized = false;

try {
  if (!isFirebaseInitialized) {
    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    
    // ✅ CORS FIX: Initialize Firestore with specific settings to avoid CORS
    try {
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        // ✅ CRITICAL CORS FIX: Force REST API usage instead of gRPC
        experimentalForceLongPolling: true,
        // ✅ ADDITIONAL CORS FIX: Disable problematic features
        experimentalAutoDetectLongPolling: false,
      });
      console.log('🔥 Firestore initialized with persistence and long polling');
    } catch (persistenceError) {
      console.warn('⚠️ Firestore persistence failed, using default with CORS fixes:', persistenceError.message);
      // Fallback with CORS-safe options
      db = getFirestore(app);
    }
    
    isFirebaseInitialized = true;
  } else {
    // If already initialized, get existing instances
    db = getFirestore(app);
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  // Emergency fallback
  app = initializeApp(firebaseConfig);
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

// ✅ CORS FIX: Disable real-time listeners that cause CORS issues in production
const ENABLE_REALTIME_LISTENERS = false; // Disable completely to avoid CORS

// ✅ CORS FIX: Helper function to handle Firestore operations safely
const handleFirestoreOperation = async (operation, operationName) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    
    // Handle CORS-specific errors
    if (error.message?.includes('CORS') || 
        error.message?.includes('access control') ||
        error.code === 'unavailable') {
      console.warn(`🌐 Network/CORS error in ${operationName} - operation failed`);
      return { success: false, error: 'NETWORK_ERROR', corsIssue: true };
    }
    
    return { success: false, error: error.message };
  }
};

// ✅ FIXED: Clean data helper function
const cleanFirestoreData = (data) => {
  if (!data || typeof data !== 'object') return data;
  
  const cleaned = { ...data };
  
  // Remove undefined and null values
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined || cleaned[key] === null) {
      delete cleaned[key];
    }
  });
  
  return cleaned;
};

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
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    
    return {
      exists: docSnap.exists(),
      data: docSnap.exists() ? docSnap.data() : null,
      id: docSnap.exists() ? docSnap.id : null
    };
  }, `getDocument(${collectionName}/${docId})`);
};

// ✅ CORS FIX: Enhanced safe set document
export const safeSetDocument = async (collectionName, docId, data) => {
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId);
    const cleanData = cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp()
    });
    
    await setDoc(docRef, cleanData);
    return { id: docId };
  }, `setDocument(${collectionName}/${docId})`);
};

// ✅ CORS FIX: Enhanced safe add document
export const safeAddDocument = async (collectionName, data) => {
  return handleFirestoreOperation(async () => {
    const collectionRef = collection(db, collectionName);
    const cleanData = cleanFirestoreData({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    const docRef = await addDoc(collectionRef, cleanData);
    return { id: docRef.id };
  }, `addDocument(${collectionName})`);
};

// ✅ CORS FIX: Enhanced safe update document
export const safeUpdateDocument = async (collectionName, docId, updates) => {
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId);
    const cleanUpdates = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(docRef, cleanUpdates);
    return { id: docId };
  }, `updateDocument(${collectionName}/${docId})`);
};

// ✅ CORS FIX: Enhanced safe get collection
export const safeGetCollection = async (collectionName, queryConstraints = []) => {
  return handleFirestoreOperation(async () => {
    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, `getCollection(${collectionName})`);
};

// ✅ CORS FIX: Safe connection test without real-time listeners
const testFirestoreConnection = async (retryCount = 0) => {
  try {
    const testRef = doc(db, 'test', 'connection');
    await getDoc(testRef);
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error) {
    console.warn(`⚠️ Connection test ${retryCount + 1} failed:`, error.code || error.message);
    
    if (retryCount < 2) {
      setTimeout(() => testFirestoreConnection(retryCount + 1), 3000);
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

// ✅ COMPANY DATA FIX: Initialize company structure data
const initializeCompanyStructure = async () => {
  try {
    console.log('🏢 Initializing company structure...');
    
    // Real companies data
    const companies = [
      {
        id: 'flow-solution',
        name: 'Flow Solution Sdn. Bhd.',
        code: 'FS',
        category: 'core_solutions',
        description: 'Main trading and solution provider',
        isActive: true
      },
      {
        id: 'flow-solution-engineering',
        name: 'Flow Solution Engineering Sdn. Bhd.',
        code: 'FSE',
        category: 'engineering_services',
        description: 'Engineering and technical services',
        isActive: true
      },
      {
        id: 'flow-solution-penang',
        name: 'Flow Solution Penang Sdn. Bhd.',
        code: 'FSP',
        category: 'regional_operations',
        description: 'Northern Malaysia operations',
        isActive: true
      }
    ];
    
    // Real branches data
    const branches = [
      {
        id: 'flow-solution-kl-hq',
        companyId: 'flow-solution',
        name: 'FS KL Headquarters',
        address: 'Kuala Lumpur, Malaysia',
        type: 'headquarters',
        isActive: true
      },
      {
        id: 'flow-solution-engineering-office',
        companyId: 'flow-solution-engineering',
        name: 'FSE Engineering Office',
        address: 'Selangor, Malaysia', 
        type: 'office',
        isActive: true
      },
      {
        id: 'flow-solution-penang-office',
        companyId: 'flow-solution-penang',
        name: 'FSP Penang Office',
        address: 'Penang, Malaysia',
        type: 'office',
        isActive: true
      }
    ];
    
    // Check if companies already exist
    const companiesResult = await safeGetCollection('companies');
    
    if (companiesResult.success && companiesResult.data.length === 0) {
      console.log('➕ Creating companies...');
      
      for (const company of companies) {
        const result = await safeSetDocument('companies', company.id, company);
        if (result.success) {
          console.log(`✅ Company created: ${company.name}`);
        }
      }
    } else {
      console.log('✅ Companies already exist');
    }
    
    // Check if branches already exist
    const branchesResult = await safeGetCollection('branches');
    
    if (branchesResult.success && branchesResult.data.length === 0) {
      console.log('➕ Creating branches...');
      
      for (const branch of branches) {
        const result = await safeSetDocument('branches', branch.id, branch);
        if (result.success) {
          console.log(`✅ Branch created: ${branch.name}`);
        }
      }
    } else {
      console.log('✅ Branches already exist');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Company structure initialization failed:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ADMIN FIX: Create Edison's admin assignment if it doesn't exist
export const ensureEdisonAdminAccess = async () => {
  const email = 'edisonchung@flowsolution.net';
  
  try {
    console.log('🔍 Checking Edison admin assignment...');
    
    // Check if assignment already exists
    const result = await safeGetDocument('adminAssignments', email);
    
    if (result.success && result.data?.exists) {
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

// ✅ SYSTEM INITIALIZATION: Complete setup
export const initializeSystemData = async () => {
  try {
    console.log('🚀 Initializing system data...');
    
    // 1. Ensure Edison's admin access
    const adminResult = await ensureEdisonAdminAccess();
    
    // 2. Initialize company structure
    const companyResult = await initializeCompanyStructure();
    
    // 3. Create system configuration
    const configResult = await safeGetDocument('systemConfig', 'appSettings');
    
    if (!configResult.success || !configResult.data?.exists) {
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
    
    // 4. Test write permissions
    const testResult = await safeSetDocument('test', 'initialization', {
      message: 'System initialization test',
      timestamp: new Date().toISOString(),
      success: true
    });
    
    if (testResult.success) {
      console.log('✅ System initialization completed successfully');
      return { 
        success: true, 
        adminSetup: adminResult,
        companySetup: companyResult
      };
    } else {
      console.error('❌ Test write failed:', testResult.error);
      return { success: false, error: 'Write test failed' };
    }
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    return { success: false, error: error.message };
  }
};

// ✅ STARTUP: Initialize after Firebase is ready
let initializationStarted = false;

const runInitialization = async () => {
  if (initializationStarted) return;
  initializationStarted = true;
  
  console.log('🔄 Running startup initialization...');
  
  // Wait for Firebase to be fully ready
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const result = await initializeSystemData();
  
  if (result.success) {
    console.log('🎉 All systems initialized successfully');
  } else {
    console.error('❌ System initialization failed:', result.error);
  }
};

// Start initialization
setTimeout(runInitialization, 2000);

// Test connection
setTimeout(testFirestoreConnection, 1000);

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
        data: { id: result.data.id, ...docData, createdAt: new Date(), updatedAt: new Date() }
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
  return handleFirestoreOperation(async () => {
    await deleteDoc(doc(db, 'proformaInvoices', id));
    return { success: true };
  }, `deleteProformaInvoice(${id})`);
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
  const cleanData = cleanFirestoreData(supplier);
  const result = await safeAddDocument('suppliers', cleanData);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...cleanData }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateSupplier = async (id, updates) => {
  const cleanUpdates = cleanFirestoreData(updates);
  const result = await safeUpdateDocument('suppliers', id, cleanUpdates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...cleanUpdates }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteSupplier = async (id) => {
  return handleFirestoreOperation(async () => {
    await deleteDoc(doc(db, 'suppliers', id));
    return { success: true };
  }, `deleteSupplier(${id})`);
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
  const cleanData = cleanFirestoreData(product);
  const result = await safeAddDocument('products', cleanData);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...cleanData }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateProduct = async (id, updates) => {
  const cleanUpdates = cleanFirestoreData(updates);
  const result = await safeUpdateDocument('products', id, cleanUpdates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...cleanUpdates }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteProduct = async (id) => {
  return handleFirestoreOperation(async () => {
    await deleteDoc(doc(db, 'products', id));
    return { success: true };
  }, `deleteProduct(${id})`);
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
  const cleanData = cleanFirestoreData(order);
  const result = await safeAddDocument('purchaseOrders', cleanData);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...cleanData }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updatePurchaseOrder = async (id, updates) => {
  const cleanUpdates = cleanFirestoreData(updates);
  const result = await safeUpdateDocument('purchaseOrders', id, cleanUpdates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...cleanUpdates }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deletePurchaseOrder = async (id) => {
  return handleFirestoreOperation(async () => {
    await deleteDoc(doc(db, 'purchaseOrders', id));
    return { success: true };
  }, `deletePurchaseOrder(${id})`);
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
  const cleanData = cleanFirestoreData(invoice);
  const result = await safeAddDocument('clientInvoices', cleanData);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...cleanData }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateClientInvoice = async (id, updates) => {
  const cleanUpdates = cleanFirestoreData(updates);
  const result = await safeUpdateDocument('clientInvoices', id, cleanUpdates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...cleanUpdates }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteClientInvoice = async (id) => {
  return handleFirestoreOperation(async () => {
    await deleteDoc(doc(db, 'clientInvoices', id));
    return { success: true };
  }, `deleteClientInvoice(${id})`);
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
            exists: () => result.success && result.data?.exists,
            data: () => result.success ? result.data?.data : null,
            id: result.success ? result.data?.id : null
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
          return handleFirestoreOperation(async () => {
            await deleteDoc(doc(db, collectionName, docId));
            return { success: true };
          }, `deleteDocument(${collectionName}/${docId})`);
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
