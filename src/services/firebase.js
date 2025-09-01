// src/services/firebase.js - Updated to use centralized Firebase configuration
// Build-Safe Implementation with Enhanced Error Handling

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
  disableNetwork,
  increment
} from 'firebase/firestore';

import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll, 
  getMetadata 
} from 'firebase/storage';

console.log('Using centralized Firebase configuration from services layer');

const cleanFirestoreData = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const cleaned = {};
  const removedFields = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const importantArrayFields = ['payments', 'items', 'attachments', 'allocations', 'products'];
    
    if (importantArrayFields.includes(key)) {
      if (Array.isArray(value)) {
        cleaned[key] = value
          .map(item => typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)
          .filter(item => item !== undefined);
      } else if (value === undefined || value === null) {
        cleaned[key] = [];
        console.log(`FIRESTORE: Converting ${key} from ${value} to empty array`);
      } else {
        cleaned[key] = value;
      }
      continue;
    }
    
    if (value === undefined) {
      removedFields.push(key);
      console.log(`FIRESTORE: Removed undefined field: ${key}`);
      continue;
    }
    
    if (value === null) {
      cleaned[key] = null;
      continue;
    }
    
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const nestedCleaned = cleanFirestoreData(value);
      if (Object.keys(nestedCleaned).length > 0) {
        cleaned[key] = nestedCleaned;
      } else {
        removedFields.push(key);
      }
    } else if (Array.isArray(value)) {
      const cleanedArray = value
        .map(item => typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)
        .filter(item => item !== undefined);
      
      if (cleanedArray.length > 0) {
        cleaned[key] = cleanedArray;
      } else {
        cleaned[key] = cleanedArray;
      }
    } else {
      cleaned[key] = value;
    }
  }
  
  if (removedFields.length > 0) {
    console.log(`FIRESTORE: Data cleaning completed - removed ${removedFields.length} fields: [${removedFields.join(', ')}]`);
  }
  
  return cleaned;
};

const handleFirestoreOperation = async (operation, operationName) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    
    if (error.message && (error.message.includes('CORS') || 
        error.message.includes('access control') ||
        error.code === 'unavailable')) {
      console.warn(`Network/CORS error in ${operationName} - operation failed`);
      return { success: false, error: 'NETWORK_ERROR', corsIssue: true };
    }
    
    return { success: false, error: error.message };
  }
};

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

export const safeGetDocument = async (collectionName, docId) => {
  return handleFirestoreOperation(async function() {
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
  return handleFirestoreOperation(async function() {
    const docRef = doc(db, collectionName, docId);
    
    const cleanData = cleanFirestoreData({
      ...data,
      updatedAt: serverTimestamp()
    });
    
    console.log(`FIRESTORE: Setting ${collectionName}/${docId}`, {
      originalFieldCount: Object.keys(data).length,
      cleanedFieldCount: Object.keys(cleanData).length,
      removedFields: Object.keys(data).filter(key => !(key in cleanData))
    });
    
    await setDoc(docRef, cleanData);
    return { id: docId };
  }, `setDocument(${collectionName}/${docId})`);
};

export const safeAddDocument = async (collectionName, data) => {
  return handleFirestoreOperation(async function() {
    const collectionRef = collection(db, collectionName);
    
    const cleanData = cleanFirestoreData({
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`FIRESTORE: Adding to ${collectionName}`, {
      originalFieldCount: Object.keys(data).length,
      cleanedFieldCount: Object.keys(cleanData).length,
      removedFields: Object.keys(data).filter(key => !(key in cleanData))
    });
    
    const docRef = await addDoc(collectionRef, cleanData);
    return { id: docRef.id };
  }, `addDocument(${collectionName})`);
};

export const safeUpdateDocument = async (collectionName, docId, updates) => {
  return handleFirestoreOperation(async function() {
    const docRef = doc(db, collectionName, docId);
    let cleanUpdates;
    
    if (updates.payments !== undefined) {
      console.log(`FIRESTORE: Processing payment update for ${collectionName}/${docId}`);
      const { payments, ...otherFields } = updates;
      const cleanedOthers = cleanFirestoreData({
        ...otherFields,
        updatedAt: serverTimestamp()
      });
      cleanUpdates = {
        ...cleanedOthers,
        payments: Array.isArray(payments) ? payments : []
      };
      console.log(`Payment protection applied - preserved ${cleanUpdates.payments.length} payments`);
    } 
    
    if (updates.payments === undefined) {
      cleanUpdates = cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log(`FIRESTORE: Updating ${collectionName}/${docId}`, {
      originalFieldCount: Object.keys(updates).length,
      cleanedFieldCount: Object.keys(cleanUpdates).length
    });
    
    Object.keys(cleanUpdates).forEach(key => {
      if (cleanUpdates[key] === undefined) {
        delete cleanUpdates[key];
        console.warn(`Removed undefined field: ${key}`);
      }
    });
    
    await updateDoc(docRef, cleanUpdates);
    return { id: docId };
  }, `updateDocument(${collectionName}/${docId})`);
};

export const safeGetCollection = async (collectionName, queryConstraints = []) => {
  return handleFirestoreOperation(async function() {
    const collectionRef = collection(db, collectionName);
    const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }, `getCollection(${collectionName})`);
};

const testFirestoreConnection = async (retryCount = 0) => {
  try {
    const testRef = doc(db, 'test', 'connection');
    await getDoc(testRef);
    console.log('Firestore connection successful');
    return true;
  } catch (error) {
    console.warn(`Connection test ${retryCount + 1} failed:`, error.code || error.message);
    
    if (retryCount < 2) {
      setTimeout(function() {
        testFirestoreConnection(retryCount + 1);
      }, 3000);
    }
    return false;
  }
};

const initializeCompanyStructure = async () => {
  try {
    console.log('Initializing company structure...');
    
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
    
    const companiesResult = await safeGetCollection('companies');
    
    if (companiesResult.success && companiesResult.data.length === 0) {
      console.log('Creating companies...');
      
      for (const company of companies) {
        const result = await safeSetDocument('companies', company.id, company);
        if (result.success) {
          console.log(`Company created: ${company.name}`);
        }
      }
    } else {
      console.log('Companies already exist');
    }
    
    const branchesResult = await safeGetCollection('branches');
    
    if (branchesResult.success && branchesResult.data.length === 0) {
      console.log('Creating branches...');
      
      for (const branch of branches) {
        const result = await safeSetDocument('branches', branch.id, branch);
        if (result.success) {
          console.log(`Branch created: ${branch.name}`);
        }
      }
    } else {
      console.log('Branches already exist');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Company structure initialization failed:', error);
    return { success: false, error: error.message };
  }
};

export const ensureEdisonAdminAccess = async () => {
  const email = 'edisonchung@flowsolution.net';
  
  try {
    console.log('Checking Edison admin assignment...');
    
    const result = await safeGetDocument('adminAssignments', email);
    
    if (result.success && result.data && result.data.exists) {
      console.log('Edison admin assignment already exists');
      return { success: true, existed: true };
    }
    
    console.log('Creating Edison admin assignment...');
    
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
      badge: 'Group CEO - All Companies',
      title: 'Group Chief Executive Officer',
      level: 1,
      email: email,
      isSystemAdmin: true,
      isSuperAdmin: true
    };
    
    const setResult = await safeSetDocument('adminAssignments', email, adminData);
    
    if (setResult.success) {
      console.log('Edison admin assignment created successfully');
      return { success: true, created: true };
    } else {
      console.error('Failed to create Edison admin assignment:', setResult.error);
      return { success: false, error: setResult.error };
    }
    
  } catch (error) {
    console.error('Error ensuring Edison admin access:', error);
    return { success: false, error: error.message };
  }
};

export const initializeSystemData = async () => {
  try {
    console.log('Initializing system data...');
    
    const adminResult = await ensureEdisonAdminAccess();
    const companyResult = await initializeCompanyStructure();
    
    const configResult = await safeGetDocument('systemConfig', 'appSettings');
    
    if (!configResult.success || !configResult.data || !configResult.data.exists) {
      console.log('Creating system configuration...');
      
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
      console.log('System configuration created');
    }
    
    const testResult = await safeSetDocument('test', 'initialization', {
      message: 'System initialization test',
      timestamp: new Date().toISOString(),
      success: true
    });
    
    if (testResult.success) {
      console.log('System initialization completed successfully');
      return { 
        success: true, 
        adminSetup: adminResult,
        companySetup: companyResult
      };
    } else {
      console.error('Test write failed:', testResult.error);
      return { success: false, error: 'Write test failed' };
    }
    
  } catch (error) {
    console.error('System initialization failed:', error);
    return { success: false, error: error.message };
  }
};

let initializationStarted = false;

const runInitialization = async () => {
  if (initializationStarted) return;
  initializationStarted = true;
  
  console.log('Running startup initialization...');
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const result = await initializeSystemData();
  
  if (result.success) {
    console.log('All systems initialized successfully');
  } else {
    console.error('System initialization failed:', result.error);
  }
};

setTimeout(runInitialization, 500);
setTimeout(testFirestoreConnection, 300);

export const getProformaInvoices = async () => {
  const result = await safeGetCollection('proformaInvoices');
  return {
    success: result.success,
    data: result.success ? result.data : [],
    error: result.error
  };
};

export const addProformaInvoice = async (invoice) => {
  try {
    console.log('FIRESTORE: Adding PI with data:', invoice);
    
    const docData = {
      ...invoice,
      documentId: invoice.documentId,
      documentNumber: invoice.documentNumber,
      documentType: invoice.documentType || 'pi',
      hasStoredDocuments: Boolean(invoice.hasStoredDocuments)
    };

    if (invoice.storageInfo) docData.storageInfo = invoice.storageInfo;
    if (invoice.originalFileName) docData.originalFileName = invoice.originalFileName;
    if (invoice.fileSize) docData.fileSize = invoice.fileSize;
    if (invoice.contentType) docData.contentType = invoice.contentType;
    if (invoice.extractedAt) docData.extractedAt = invoice.extractedAt;
    if (invoice.storedAt) docData.storedAt = invoice.storedAt;

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

export const updateProformaInvoice = async (id, updates) => {
  try {
    console.log('FIRESTORE: Updating PI:', { id, updates });
    
    const result = await safeUpdateDocument('proformaInvoices', id, updates);
    
    if (result.success) {
      console.log('PI updated successfully:', result.data);
      return {
        success: true,
        data: { id, ...result.data, updatedAt: new Date() }
      };
    } else {
      console.error('PI update failed:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error updating proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

export const updateProformaInvoicePayments = async (id, payments, paymentTotals = {}) => {
  try {
    console.log(`FIRESTORE: Updating payments for PI ${id}`);
    console.log(`Payment data:`, {
      paymentsCount: Array.isArray(payments) ? payments.length : 'not array',
      totalPaid: paymentTotals.totalPaid,
      paymentStatus: paymentTotals.paymentStatus
    });

    const updates = {
      payments: Array.isArray(payments) ? payments : []
    };

    if (paymentTotals.totalPaid !== undefined) updates.totalPaid = paymentTotals.totalPaid;
    if (paymentTotals.paymentStatus) updates.paymentStatus = paymentTotals.paymentStatus;
    if (paymentTotals.paymentPercentage !== undefined) updates.paymentPercentage = paymentTotals.paymentPercentage;

    const result = await updateProformaInvoice(id, updates);
    
    if (result.success) {
      console.log(`PI payments updated successfully: ${payments.length} payments`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error updating PI payments:`, error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

export const deleteProformaInvoice = async (id) => {
  return handleFirestoreOperation(async function() {
    await deleteDoc(doc(db, 'proformaInvoices', id));
    return { success: true };
  }, `deleteProformaInvoice(${id})`);
};

export const updateDeliveryStatus = async (id, status) => {
  return updateProformaInvoice(id, { deliveryStatus: status });
};

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
  return handleFirestoreOperation(async function() {
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
  return handleFirestoreOperation(async function() {
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
  return handleFirestoreOperation(async function() {
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
  return handleFirestoreOperation(async function() {
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

export const mockFirebase = {
  firestore: {
    collection: function(collectionName) {
      return {
        get: async function() {
          const result = await safeGetCollection(collectionName);
          
          if (result.success) {
            return {
              docs: result.data.map(item => ({
                id: item.id,
                data: function() {
                  const { id, ...data } = item;
                  return data;
                },
                exists: function() { return true; }
              }))
            };
          } else {
            console.warn(`Collection ${collectionName} get failed:`, result.error);
            return { docs: [] };
          }
        },
        
        doc: function(docId) {
          return {
            get: async function() {
              const result = await safeGetDocument(collectionName, docId);
              
              return {
                exists: function() { return result.success && result.data && result.data.exists; },
                data: function() { return result.success ? result.data && result.data.data : null; },
                id: result.success ? result.data && result.data.id : null
              };
            },
            
            set: async function(data, options = {}) {
              if (options.merge) {
                return await safeUpdateDocument(collectionName, docId, data);
              } else {
                return await safeSetDocument(collectionName, docId, data);
              }
            },
            
            update: async function(updates) {
              return await safeUpdateDocument(collectionName, docId, updates);
            },
            
            delete: async function() {
              return handleFirestoreOperation(async function() {
                await deleteDoc(doc(db, collectionName, docId));
                return { success: true };
              }, `deleteDocument(${collectionName}/${docId})`);
            }
          };
        },
        
        add: async function(data) {
          return await safeAddDocument(collectionName, data);
        },
        
        where: function(field, operator, value) {
          return {
            get: async function() {
              const result = await safeGetCollection(collectionName, [where(field, operator, value)]);
              
              if (result.success) {
                return {
                  empty: result.data.length === 0,
                  docs: result.data.map(item => ({
                    id: item.id,
                    data: function() {
                      const { id, ...data } = item;
                      return data;
                    },
                    exists: function() { return true; }
                  }))
                };
              } else {
                return { empty: true, docs: [] };
              }
            }
          };
        }
      };
    }
  }
};

export { cleanFirestoreData };

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
