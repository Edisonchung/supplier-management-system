// src/services/firebase.js
// Minimal build-safe implementation

import { 
  db, 
  auth, 
  storage, 
  analytics
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
  onSnapshot
} from 'firebase/firestore';

import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll, 
  getMetadata 
} from 'firebase/storage';

console.log('Firebase services loaded');

const cleanFirestoreData = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
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
      }
    } else if (Array.isArray(value)) {
      const cleanedArray = value
        .map(item => typeof item === 'object' && item !== null ? cleanFirestoreData(item) : item)
        .filter(item => item !== undefined);
      cleaned[key] = cleanedArray;
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
};

const handleFirestoreOperation = async (operation, operationName) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    return { success: false, error: error.message };
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
    
    const docRef = await addDoc(collectionRef, cleanData);
    return { id: docRef.id };
  }, `addDocument(${collectionName})`);
};

export const safeUpdateDocument = async (collectionName, docId, updates) => {
  return handleFirestoreOperation(async function() {
    const docRef = doc(db, collectionName, docId);
    
    let cleanUpdates;
    if (updates.payments !== undefined) {
      const { payments, ...otherFields } = updates;
      const cleanedOthers = cleanFirestoreData({
        ...otherFields,
        updatedAt: serverTimestamp()
      });
      cleanUpdates = {
        ...cleanedOthers,
        payments: Array.isArray(payments) ? payments : []
      };
    }
    
    if (updates.payments === undefined) {
      cleanUpdates = cleanFirestoreData({
        ...updates,
        updatedAt: serverTimestamp()
      });
    }
    
    Object.keys(cleanUpdates).forEach(key => {
      if (cleanUpdates[key] === undefined) {
        delete cleanUpdates[key];
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
    const result = await safeAddDocument('proformaInvoices', invoice);
    
    if (result.success) {
      return {
        success: true,
        data: { id: result.data.id, ...invoice, createdAt: new Date(), updatedAt: new Date() }
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
    const result = await safeUpdateDocument('proformaInvoices', id, updates);
    
    if (result.success) {
      return {
        success: true,
        data: { id, ...result.data, updatedAt: new Date() }
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
  return handleFirestoreOperation(async function() {
    await deleteDoc(doc(db, 'proformaInvoices', id));
    return { success: true };
  }, `deleteProformaInvoice(${id})`);
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

export { cleanFirestoreData };

export { 
  db, 
  auth, 
  storage, 
  analytics
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
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
};
