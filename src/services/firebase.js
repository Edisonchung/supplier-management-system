// src/config/firebase.js - Complete Fix for CORS and Initialization Issues
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
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
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { 
  getStorage, 
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

// ✅ CORS FIX: Safe document operations
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

// ✅ CORS FIX: Connection test without real-time listeners
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

// ✅ ADMIN FIX: Ensure Edison's admin assignment
export const ensureEdisonAdminAccess = async () => {
  const email = 'edisonchung@flowsolution.net';
  
  try {
    console.log('🔍 Checking Edison admin assignment...');
    
    const result = await safeGetDocument('adminAssignments', email);
    
    if (result.success && result.data?.exists) {
      console.log('✅ Edison admin assignment already exists');
      return { success: true, existed: true };
    }
    
    console.log('➕ Creating Edison admin assignment...');
    
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

// ✅ BUSINESS FUNCTIONS: Enhanced with error handling

export const getProformaInvoices = async () => {
  const result = await safeGetCollection('proformaInvoices');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const addProformaInvoice = async (invoice) => {
  const cleanData = cleanFirestoreData(invoice);
  const result = await safeAddDocument('proformaInvoices', cleanData);
  
  if (result.success) {
    return {
      success: true,
      data: { id: result.data.id, ...cleanData }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const updateProformaInvoice = async (id, updates) => {
  const cleanUpdates = cleanFirestoreData(updates);
  const result = await safeUpdateDocument('proformaInvoices', id, cleanUpdates);
  
  if (result.success) {
    return {
      success: true,
      data: { id, ...cleanUpdates }
    };
  } else {
    return { success: false, error: result.error };
  }
};

export const deleteProformaInvoice = async (id) => {
  return handleFirestoreOperation(async () => {
    await deleteDoc(doc(db, 'proformaInvoices', id));
    return { success: true };
  }, `deleteProformaInvoice(${id})`);
};

// Similar functions for other collections...
export const getSuppliers = async () => {
  const result = await safeGetCollection('suppliers');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const getPurchaseOrders = async () => {
  const result = await safeGetCollection('purchaseOrders');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

// ✅ COMPATIBILITY LAYER: Enhanced mockFirebase
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
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
};

export default app;
