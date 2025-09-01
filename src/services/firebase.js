// src/services/firebase.js - Updated to use centralized Firebase configuration
// ✅ FIXED: Import from centralized config instead of initializing Firebase again

// Import from the centralized Firebase configuration
import { 
  db, 
  auth, 
  storage, 
  analytics,
  AuthService,
  DatabaseService,
  SessionService,
  UserTypeService 
} from '../config/firebase.js';

// Import Firestore functions
import { 
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
  disableNetwork
} from 'firebase/firestore';

import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll, 
  getMetadata 
} from 'firebase/storage';

// ✅ NO MORE FIREBASE INITIALIZATION - Use existing instance from config
console.log('🔗 Using centralized Firebase configuration from services layer');

// 🔧 CRITICAL FIX: Enhanced clean data helper function with PAYMENT PROTECTION
const cleanFirestoreData = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const cleaned = {};
  const removedFields = [];
  
  for (const [key, value] of Object.entries(obj)) {
    // 🔧 CRITICAL: Preserve important arrays even if empty or undefined
    const importantArrayFields = ['payments', 'items', 'attachments', 'allocations', 'products'];
    
    if (importantArrayFields.includes(key)) {
      // Keep arrays even if empty, but ensure they're valid arrays
      if (Array.isArray(value)) {
        // Clean the array contents but preserve the array structure
        cleaned[key] = value
          .map(item => typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)
          .filter(item => item !== undefined);
      } else if (value === undefined || value === null) {
        // Convert undefined/null to empty array for important fields
        cleaned[key] = [];
        console.log(`🔧 FIRESTORE: Converting ${key} from ${value} to empty array`);
      } else {
        // Keep the value as-is if it's not an array but not undefined/null
        cleaned[key] = value;
      }
      continue; // Skip the normal undefined check for important fields
    }
    
    // 🔧 CRITICAL: Skip undefined values entirely (FIRESTORE REQUIREMENT)
    if (value === undefined) {
      removedFields.push(key);
      console.log(`🧹 FIRESTORE: Removed undefined field: ${key}`);
      continue;
    }
    
    // Handle null values (keep them as they're valid in Firestore)
    if (value === null) {
      cleaned[key] = null;
      continue;
    }
    
    // 🔧 CRITICAL: Recursively clean nested objects
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const nestedCleaned = cleanFirestoreData(value);
      // Only include non-empty objects
      if (Object.keys(nestedCleaned).length > 0) {
        cleaned[key] = nestedCleaned;
      } else {
        removedFields.push(key);
      }
    } else if (Array.isArray(value)) {
      // 🔧 CRITICAL: Clean arrays by filtering out undefined values
      const cleanedArray = value
        .map(item => typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)
        .filter(item => item !== undefined);
      
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      } else {
        // Keep empty arrays for non-important fields, remove only if not important
        cleaned[key] = cleanedArray;
      }
    } else {
      // Keep primitive values (string, number, boolean, Date)
      cleaned[key] = value;
    }
  }
  
  if (removedFields.length > 0) {
    console.log(`💾 FIRESTORE: Data cleaning completed - removed ${removedFields.length} fields: [${removedFields.join(', ')}]`);
  }
  
  return cleaned;
};

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
    
    // 🔧 CRITICAL: Clean data before sending to Firestore
    const cleanData = cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp()
    });
    
    console.log(`💾 FIRESTORE: Setting ${collectionName}/${docId}`, {
      originalFieldCount: Object.keys(data).length,
      cleanedFieldCount: Object.keys(cleanData).length,
      removedFields: Object.keys(data).filter(key => !(key in cleanData))
    });
    
    await setDoc(docRef, cleanData);
    return { id: docId };
  }, `setDocument(${collectionName}/${docId})`);
};

// 🔧 CRITICAL FIX: Enhanced safe add document with comprehensive cleaning
export const safeAddDocument = async (collectionName, data) => {
  return handleFirestoreOperation(async () => {
    const collectionRef = collection(db, collectionName);
    
    // 🔧 CRITICAL: Clean data before sending to Firestore
    const cleanData = cleanFirestoreData({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`💾 FIRESTORE: Adding to ${collectionName}`, {
      originalFieldCount: Object.keys(data).length,
      cleanedFieldCount: Object.keys(cleanData).length,
      removedFields: Object.keys(data).filter(key => !(key in cleanData))
    });
    
    const docRef = await addDoc(collectionRef, cleanData);
    return { id: docRef.id };
  }, `addDocument(${collectionName})`);
};

// 🔧 CRITICAL FIX: Enhanced safe update document with PAYMENT PROTECTION
export const safeUpdateDocument = async (collectionName, docId, updates) => {
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId);
    
    // 🔧 CRITICAL: Special handling for payment updates
    let cleanUpdates;
    
    if (updates.payments !== undefined) {
      console.log(`💰 FIRESTORE: Processing payment update for ${collectionName}/${docId}`);
      console.log(`📊 Payment data: ${Array.isArray(updates.payments) ? updates.payments.length : 'not array'} payments`);
      
      // Clean everything EXCEPT payments
      const { payments, ...otherFields } = updates;
      const cleanedOthers = cleanFirestoreData({
        ...otherFields,
        updatedAt: serverTimestamp()
      });
      
      // Combine with protected payments
      cleanUpdates = {
        ...cleanedOthers,
        payments: Array.isArray(payments) ? payments : []
      };
      
      console.log(`✅ Payment protection applied - preserved ${cleanUpdates.payments.length} payments`);
    } else {
      // Normal cleaning for non-payment updates
      cleanUpdates = cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log(`💾 FIRESTORE: Updating ${collectionName}/${docId}`, {
      originalFieldCount: Object.keys(updates).length,
      cleanedFieldCount: Object.keys(cleanUpdates).length,
      removedFields: Object.keys(updates).filter(key => !(key in cleanUpdates))
    });
    
    // 🔧 CRITICAL: Final safety check - ensure no undefined values
    Object.keys(cleanUpdates).forEach(key => {
      if (cleanUpdates[key] === undefined) {
        delete cleanUpdates[key];
        console.warn(`🚨 EMERGENCY: Removed undefined field at final check: ${key}`);
      }
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

// ✅ SYSTEM INITIALIZATION: Complete setup (reduced timeout to prevent conflicts)
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

// ✅ STARTUP: Initialize after Firebase is ready (reduced timing to prevent double runs)
let initializationStarted = false;

const runInitialization = async () => {
  if (initializationStarted) return;
  initializationStarted = true;
  
  console.log('🔥 Running startup initialization...');
  
  // Reduced wait time since Firebase is already initialized from config
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const result = await initializeSystemData();
  
  if (result.success) {
    console.log('🎉 All systems initialized successfully');
  } else {
    console.error('❌ System initialization failed:', result.error);
  }
};

// Reduced startup delay to prevent conflicts with config initialization
setTimeout(runInitialization, 500);
setTimeout(testFirestoreConnection, 300);

// ✅ ENHANCED: Proforma Invoices with better error handling
export const getProformaInvoices = async () => {
  const result = await safeGetCollection('proformaInvoices');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

// 🔧 CRITICAL FIX: Enhanced Add PI with comprehensive data cleaning
export const addProformaInvoice = async (invoice) => {
  try {
    console.log('💾 FIRESTORE: Adding PI with data:', invoice);
    
    // 🔧 CRITICAL: Build clean document data structure
    const docData = {
      ...invoice,
      // Core document storage fields (always include these)
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
    };

    // 🔧 CRITICAL: Use safeAddDocument which automatically cleans data
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

// 🔧 CRITICAL FIX: Enhanced Update PI with PAYMENT PROTECTION
export const updateProformaInvoice = async (id, updates) => {
  try {
    console.log('💾 FIRESTORE: Updating PI:', { id, updates });
    
    // 🔧 CRITICAL: Use safeUpdateDocument which has payment protection
    const result = await safeUpdateDocument('proformaInvoices', id, updates);
    
    if (result.success) {
      console.log('✅ PI updated successfully:', result.data);
      return {
        success: true,
        data: { id, ...result.data, updatedAt: new Date() }
      };
    } else {
      console.error('❌ PI update failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error updating proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

// 🔧 NEW: Payment-specific update function for enhanced payment operations
export const updateProformaInvoicePayments = async (id, payments, paymentTotals = {}) => {
  try {
    console.log(`💰 FIRESTORE: Updating payments for PI ${id}`);
    console.log(`📊 Payment data:`, {
      paymentsCount: Array.isArray(payments) ? payments.length : 'not array',
      totalPaid: paymentTotals.totalPaid,
      paymentStatus: paymentTotals.paymentStatus
    });

    const updates = {
      payments: Array.isArray(payments) ? payments : [],
      ...(paymentTotals.totalPaid !== undefined && { totalPaid: paymentTotals.totalPaid }),
      ...(paymentTotals.paymentStatus && { paymentStatus: paymentTotals.paymentStatus }),
      ...(paymentTotals.paymentPercentage !== undefined && { paymentPercentage: paymentTotals.paymentPercentage })
    };

    // Use the regular updateProformaInvoice which now has payment protection
    const result = await updateProformaInvoice(id, updates);
    
    if (result.success) {
      console.log(`✅ PI payments updated successfully: ${payments.length} payments`);
    }
    
    return result;
  } catch (error) {
    console.error(`❌ Error updating PI payments:`, error);
    return { 
      success: false, 
      error: error.message 
    };
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

// ✅ ENHANCED: Other entity functions (keeping your existing implementations)
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
      data: { id: result.data.id, ...supplier }
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
      data: { id, ...updates }
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
      data: { id: result.data.id, ...product }
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
      data: { id, ...updates }
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
      data: { id: result.data.id, ...order }
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
      data: { id, ...updates }
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
      data: { id: result.data.id, ...invoice }
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
      data: { id, ...updates }
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

// 🔧 CRITICAL: Export the cleaning function for use in other components
export { cleanFirestoreData };

// Export the centralized Firebase services (no double initialization)
export { 
  db, 
  auth, 
  storage, 
  analytics,
  AuthService,
  DatabaseService,
  SessionService,
  UserTypeService
};

// Export Firebase functions from existing config
export {
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
