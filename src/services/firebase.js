// src/config/firebase.js - Real Firestore Implementation
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
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

console.log('🔥 Firebase initialized with Firestore and Storage');

// Real Firestore service functions
export const getProformaInvoices = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'proformaInvoices'));
    const invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📋 Loaded ${invoices.length} Proforma Invoices from Firestore`);
    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error getting proforma invoices:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const addProformaInvoice = async (invoice) => {
  try {
    console.log('💾 FIRESTORE: Adding PI with data:', invoice);
    console.log('💾 FIRESTORE: DocumentId in input:', invoice.documentId);
    
    const docData = {
      ...invoice,
      // Preserve document storage fields
      documentId: invoice.documentId,
      documentNumber: invoice.documentNumber,
      documentType: 'pi',
      hasStoredDocuments: !!invoice.hasStoredDocuments,
      
      // Optional storage metadata
      storageInfo: invoice.storageInfo,
      originalFileName: invoice.originalFileName,
      fileSize: invoice.fileSize,
      contentType: invoice.contentType,
      extractedAt: invoice.extractedAt,
      storedAt: invoice.storedAt,
      
      // Firestore timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'proformaInvoices'), docData);
    
    const savedInvoice = {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 FIRESTORE: Complete PI object saved:', {
      id: savedInvoice.id,
      piNumber: savedInvoice.piNumber,
      documentId: savedInvoice.documentId,
      hasStoredDocuments: savedInvoice.hasStoredDocuments
    });
    
    return { success: true, data: savedInvoice };
  } catch (error) {
    console.error('Error adding proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

export const updateProformaInvoice = async (id, updates) => {
  try {
    console.log('💾 FIRESTORE: Updating PI with data:', { id, updates });
    
    const updateData = {
      ...updates,
      
      // Preserve document storage fields during updates
      documentId: updates.documentId,
      documentNumber: updates.documentNumber,
      documentType: updates.documentType || 'pi',
      hasStoredDocuments: updates.hasStoredDocuments,
      
      // Optional storage metadata
      storageInfo: updates.storageInfo,
      originalFileName: updates.originalFileName,
      fileSize: updates.fileSize,
      contentType: updates.contentType,
      extractedAt: updates.extractedAt,
      storedAt: updates.storedAt,
      
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(db, 'proformaInvoices', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    console.log('💾 FIRESTORE: Complete updated PI object:', {
      id: result.id,
      piNumber: result.piNumber,
      documentId: result.documentId,
      hasStoredDocuments: result.hasStoredDocuments
    });
    
    return { success: true, data: result };
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

// Suppliers
export const getSuppliers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'suppliers'));
    const suppliers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`👥 Loaded ${suppliers.length} suppliers from Firestore`);
    return { success: true, data: suppliers };
  } catch (error) {
    console.error('Error getting suppliers:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const addSupplier = async (supplier) => {
  try {
    const docData = {
      ...supplier,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'suppliers'), docData);
    const result = {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`👥 Added supplier: ${result.name}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding supplier:', error);
    return { success: false, error: error.message };
  }
};

export const updateSupplier = async (id, updates) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(db, 'suppliers', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    console.log(`👥 Updated supplier: ${id}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating supplier:', error);
    return { success: false, error: error.message };
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

// Products
export const getProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📦 Loaded ${products.length} products from Firestore`);
    return { success: true, data: products };
  } catch (error) {
    console.error('Error getting products:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const addProduct = async (product) => {
  try {
    const docData = {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'products'), docData);
    const result = {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`📦 Added product: ${result.name}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding product:', error);
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    console.log(`📦 Updated product: ${id}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating product:', error);
    return { success: false, error: error.message };
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

// Purchase Orders
export const getPurchaseOrders = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'purchaseOrders'));
    const orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📋 Loaded ${orders.length} purchase orders from Firestore`);
    return { success: true, data: orders };
  } catch (error) {
    console.error('Error getting purchase orders:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const addPurchaseOrder = async (order) => {
  try {
    const docData = {
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'purchaseOrders'), docData);
    const result = {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`📋 Added purchase order: ${result.poNumber}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding purchase order:', error);
    return { success: false, error: error.message };
  }
};

export const updatePurchaseOrder = async (id, updates) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(db, 'purchaseOrders', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    console.log(`📋 Updated purchase order: ${id}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating purchase order:', error);
    return { success: false, error: error.message };
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

// Client Invoices
export const getClientInvoices = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'clientInvoices'));
    const invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📋 Loaded ${invoices.length} client invoices from Firestore`);
    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error getting client invoices:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const addClientInvoice = async (invoice) => {
  try {
    const docData = {
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'clientInvoices'), docData);
    const result = {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log(`📋 Added client invoice: ${result.invoiceNumber}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error adding client invoice:', error);
    return { success: false, error: error.message };
  }
};

export const updateClientInvoice = async (id, updates) => {
  try {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(db, 'clientInvoices', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    console.log(`📋 Updated client invoice: ${id}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating client invoice:', error);
    return { success: false, error: error.message };
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

// Get invoices by PO ID
export const getInvoicesByPOId = async (poId) => {
  try {
    const q = query(collection(db, 'clientInvoices'), where('poId', '==', poId));
    const querySnapshot = await getDocs(q);
    const invoices = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error getting invoices by PO:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Update payment status
export const updateInvoicePaymentStatus = async (id, paymentData) => {
  try {
    const updateData = {
      paymentStatus: paymentData.status,
      paidAmount: paymentData.paidAmount || 0,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      updatedAt: serverTimestamp()
    };
    
    const docRef = doc(db, 'clientInvoices', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
};

// Auth functions
export {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
};

// Firestore functions  
export {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
};

// Storage functions
export {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
  getMetadata
};

export default app;
