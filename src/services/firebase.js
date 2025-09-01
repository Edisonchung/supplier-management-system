// src/services/firebase.js - Clean minimal version
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
        console.log(`Converting ${key} from ${value} to empty array`);
      } else {
        cleaned[key] = value;
      }
      continue;
    }
    
    if (value === undefined) {
      removedFields.push(key);
      console.log(`Removed undefined field: ${key}`);
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
    console.log(`Data cleaning completed - removed ${removedFields.length} fields: [${removedFields.join(', ')}]`);
  }
  
  return cleaned;
};

const handleFirestoreOperation = async (operation, operationName) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    
    if (error.message?.includes('CORS') || 
        error.message?.includes('access control') ||
        error.code === 'unavailable') {
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
  return handleFirestoreOperation(async () => {
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
  return handleFirestoreOperation(async () => {
    const docRef = doc(db, collectionName, docId);
    
    let cleanUpdates;
    
    if (updates.payments !== undefined) {
      console.log('Payment update detected');
      const paymentsLength = Array.isArray(updates.payments) ? updates.payments.length : 'not array';
      console.log(`Payment data: ${paymentsLength} payments`);
      
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
    } else {
      cleanUpdates = cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
    
    console.log(`FIRESTORE: Updating ${collectionName}/${docId}`, {
      originalFieldCount: Object.keys(updates).length,
      cleanedFieldCount: Object.keys(cleanUpdates).length,
      removedFields: Object.keys(updates).filter(key => !(key in cleanUpdates))
    });
    
    Object.keys(cleanUpdates).forEach(key => {
      if (cleanUpdates[key] === undefined) {
        delete cleanUpdates[key];
        console.warn(`EMERGENCY: Removed undefined field at final check: ${key}`);
      }
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
      hasStoredDocuments: !!invoice.hasStoredDocuments,
      
      ...(invoice.storageInfo && { storageInfo: invoice.storageInfo }),
      ...(invoice.originalFileName && { originalFileName: invoice.originalFileName }),
      ...(invoice.fileSize && { fileSize: invoice.fileSize }),
      ...(invoice.contentType && { contentType: invoice.contentType }),
      ...(invoice.extractedAt && { extractedAt: invoice.extractedAt }),
      ...(invoice.storedAt && { storedAt: invoice.storedAt }),
    };

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
      payments: Array.isArray(payments) ? payments : [],
      ...(paymentTotals.totalPaid !== undefined && { totalPaid: paymentTotals.totalPaid }),
      ...(paymentTotals.paymentStatus && { paymentStatus: paymentTotals.paymentStatus }),
      ...(paymentTotals.paymentPercentage !== undefined && { paymentPercentage: paymentTotals.paymentPercentage })
    };

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
  return handleFirestoreOperation(async () => {
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
