// src/config/firebase.js - Updated Firebase Implementation with Error Fixes
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
  disableNetwork
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ FIXED: Better environment detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

console.log('🔥 Firebase initialized');
console.log('🔧 Environment:', isDevelopment ? 'development' : 'production');
console.log('🔧 Project ID:', firebaseConfig.projectId);

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

// ✅ FIXED: Connection testing with proper error handling
const testFirestoreConnection = async () => {
  try {
    // Enable network first
    await enableNetwork(db);
    
    // Test with a simple query that doesn't require exists()
    const testCollection = collection(db, 'test');
    const snapshot = await getDocs(query(testCollection, limit(1)));
    
    console.log('✅ Firestore connection successful');
    return true;
  } catch (error) {
    console.warn('⚠️ Firestore connection issue:', error.code || error.message);
    
    // Handle specific error cases
    if (error.code === 'unavailable' || error.code === 'failed-precondition') {
      console.log('🔄 Retrying connection in 3 seconds...');
      setTimeout(testFirestoreConnection, 3000);
    } else if (error.code === 'permission-denied') {
      console.log('🔒 Permission denied - check Firestore security rules');
    }
    
    return false;
  }
};

// ✅ FIXED: Network status handling
const handleNetworkStatus = () => {
  window.addEventListener('online', async () => {
    console.log('🌐 Network restored - enabling Firestore');
    try {
      await enableNetwork(db);
      testFirestoreConnection();
    } catch (error) {
      console.warn('Failed to enable network:', error);
    }
  });
  
  window.addEventListener('offline', async () => {
    console.log('📱 Network lost - Firestore offline mode');
    try {
      await disableNetwork(db);
    } catch (error) {
      console.warn('Failed to disable network:', error);
    }
  });
};

// Initialize network handling
handleNetworkStatus();

// Test connection after initialization
setTimeout(testFirestoreConnection, 1000);

// ✅ ENHANCED: Proforma Invoices with better error handling
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
      
      // Firestore timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log('💾 FIRESTORE: Clean document data:', {
      piNumber: docData.piNumber,
      documentId: docData.documentId,
      totalFields: Object.keys(docData).length
    });
    
    const docRef = await addDoc(collection(db, 'proformaInvoices'), docData);
    
    const savedInvoice = {
      id: docRef.id,
      ...docData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('💾 FIRESTORE: PI saved successfully:', savedInvoice.id);
    return { success: true, data: savedInvoice };
  } catch (error) {
    console.error('Error adding proforma invoice:', error);
    return { success: false, error: error.message };
  }
};

// ✅ ENHANCED: Update PI with proper data cleaning
export const updateProformaInvoice = async (id, updates) => {
  try {
    console.log('💾 FIRESTORE: Updating PI:', { id, updates });
    
    // ✅ FIXED: Build clean update data
    const updateData = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
    const docRef = doc(db, 'proformaInvoices', id);
    await updateDoc(docRef, updateData);
    
    const result = {
      id,
      ...updateData,
      updatedAt: new Date()
    };
    
    console.log('💾 FIRESTORE: PI updated successfully:', id);
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

// ✅ ENHANCED: Suppliers with error handling
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
    const docData = cleanFirestoreData({
      ...supplier,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
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
    const updateData = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
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

// ✅ ENHANCED: Products with error handling
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
    const docData = cleanFirestoreData({
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
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
    const updateData = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
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

// ✅ ENHANCED: Purchase Orders with error handling
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
    const docData = cleanFirestoreData({
      ...order,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
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
    const updateData = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
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

// ✅ ENHANCED: Client Invoices with error handling
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
    const docData = cleanFirestoreData({
      ...invoice,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
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
    const updateData = cleanFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });
    
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

// ✅ ENHANCED: Query functions with error handling
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

export const updateInvoicePaymentStatus = async (id, paymentData) => {
  try {
    const updateData = cleanFirestoreData({
      paymentStatus: paymentData.status,
      paidAmount: paymentData.paidAmount || 0,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      updatedAt: serverTimestamp()
    });
    
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

// ✅ FIXED: Enhanced compatibility layer with proper error handling
export const mockFirebase = {
  firestore: {
    collection: (collectionName) => ({
      get: async () => {
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
          return {
            docs: querySnapshot.docs.map(doc => ({
              id: doc.id,
              data: () => ({ ...doc.data() }),
              exists: () => true,
              ref: {
                update: async (updates) => {
                  const docRef = doc(db, collectionName, doc.id);
                  await updateDoc(docRef, cleanFirestoreData(updates));
                }
              }
            }))
          };
        } catch (error) {
          console.error(`Error getting collection ${collectionName}:`, error);
          return { docs: [] };
        }
      },
      doc: (docId) => ({
        get: async () => {
          try {
            const result = await safeGetDocument(collectionName, docId);
            return {
              exists: () => result.exists,
              data: () => result.data,
              id: result.id
            };
          } catch (error) {
            console.error(`Error getting document ${docId}:`, error);
            return {
              exists: () => false,
              data: () => null,
              id: null
            };
          }
        },
        set: async (data, options = {}) => {
          try {
            const docRef = doc(db, collectionName, docId);
            const cleanData = cleanFirestoreData(data);
            
            if (options.merge) {
              await updateDoc(docRef, cleanData);
            } else {
              await setDoc(docRef, cleanData);
            }
            return { success: true };
          } catch (error) {
            console.error(`Error setting document ${docId}:`, error);
            throw error;
          }
        },
        update: async (updates) => {
          try {
            const docRef = doc(db, collectionName, docId);
            await updateDoc(docRef, cleanFirestoreData(updates));
            return { success: true };
          } catch (error) {
            console.error(`Error updating document ${docId}:`, error);
            throw error;
          }
        },
        delete: async () => {
          try {
            const docRef = doc(db, collectionName, docId);
            await deleteDoc(docRef);
            return { success: true };
          } catch (error) {
            console.error(`Error deleting document ${docId}:`, error);
            throw error;
          }
        }
      }),
      add: async (newDoc) => {
        try {
          const docRef = await addDoc(collection(db, collectionName), cleanFirestoreData(newDoc));
          return { id: docRef.id };
        } catch (error) {
          console.error(`Error adding document to ${collectionName}:`, error);
          throw error;
        }
      },
      where: (field, operator, value) => {
        return {
          get: async () => {
            try {
              const q = query(collection(db, collectionName), where(field, operator, value));
              const querySnapshot = await getDocs(q);
              return {
                empty: querySnapshot.empty,
                docs: querySnapshot.docs.map(doc => ({
                  id: doc.id,
                  data: () => ({ ...doc.data() }),
                  exists: () => true
                }))
              };
            } catch (error) {
              console.error(`Error querying ${collectionName}:`, error);
              return { empty: true, docs: [] };
            }
          }
        };
      }
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
