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

// ✅ ADD: Enhanced connection handling and debugging
console.log('🔥 Firebase initialized with Firestore and Storage');
console.log('🔧 Environment:', import.meta.env.VITE_APP_ENV);
console.log('🔧 Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);

// ✅ ADD: Connection retry logic
const connectWithRetry = async () => {
  try {
    // Test Firestore connection with a simple read
    const testDoc = doc(db, 'test', 'connection');
    await getDoc(testDoc);
    console.log('✅ Firestore connection successful');
  } catch (error) {
    console.warn('⚠️ Firestore connection issue:', error.code);
    
    if (error.code === 'unavailable') {
      console.log('🔄 Retrying Firestore connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000);
    }
  }
};

// Test connection after a short delay
setTimeout(connectWithRetry, 2000);

// ✅ ADD: Enhanced error handling for offline mode
const handleOfflineMode = () => {
  window.addEventListener('online', () => {
    console.log('🌐 Back online - reconnecting to Firestore');
    connectWithRetry();
  });
  
  window.addEventListener('offline', () => {
    console.log('📴 Offline mode - Firestore will cache changes');
  });
};

handleOfflineMode();

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

// ✅ FIXED: addProformaInvoice function with proper undefined field handling
export const addProformaInvoice = async (invoice) => {
  try {
    console.log('💾 FIRESTORE: Adding PI with data:', invoice);
    console.log('💾 FIRESTORE: DocumentId in input:', invoice.documentId);
    
    // ✅ CRITICAL FIX: Build clean document data without undefined fields
    const docData = {
      ...invoice,
      // Core document storage fields (always include these)
      documentId: invoice.documentId,
      documentNumber: invoice.documentNumber,
      documentType: invoice.documentType || 'pi',
      hasStoredDocuments: !!invoice.hasStoredDocuments,
      
      // ✅ FIXED: Only include optional storage metadata if they have values
      ...(invoice.storageInfo !== undefined && invoice.storageInfo !== null && { storageInfo: invoice.storageInfo }),
      ...(invoice.originalFileName !== undefined && invoice.originalFileName !== null && { originalFileName: invoice.originalFileName }),
      ...(invoice.fileSize !== undefined && invoice.fileSize !== null && { fileSize: invoice.fileSize }),
      ...(invoice.contentType !== undefined && invoice.contentType !== null && { contentType: invoice.contentType }),
      ...(invoice.extractedAt !== undefined && invoice.extractedAt !== null && { extractedAt: invoice.extractedAt }),
      ...(invoice.storedAt !== undefined && invoice.storedAt !== null && { storedAt: invoice.storedAt }),
      
      // Firestore timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // ✅ CRITICAL FIX: Remove any remaining undefined or null values that might cause issues
    Object.keys(docData).forEach(key => {
      if (docData[key] === undefined || docData[key] === null) {
        delete docData[key];
        console.log(`🧹 FIRESTORE: Removed undefined/null field: ${key}`);
      }
    });

    console.log('💾 FIRESTORE: Clean document data being sent:', {
      piNumber: docData.piNumber,
      documentId: docData.documentId,
      documentNumber: docData.documentNumber,
      documentType: docData.documentType,
      hasStoredDocuments: docData.hasStoredDocuments,
      hasStorageInfo: !!docData.storageInfo,
      totalFields: Object.keys(docData).length
    });
    
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

// ✅ FIXED: updateProformaInvoice function with proper undefined field handling
export const updateProformaInvoice = async (id, updates) => {
  try {
    console.log('💾 FIRESTORE: Updating PI with data:', { id, updates });
    
    // ✅ FIXED: Build clean update data without undefined fields
    const updateData = {
      ...updates,
      
      // Preserve document storage fields during updates (only if they exist)
      ...(updates.documentId !== undefined && updates.documentId !== null && { documentId: updates.documentId }),
      ...(updates.documentNumber !== undefined && updates.documentNumber !== null && { documentNumber: updates.documentNumber }),
      ...(updates.documentType !== undefined && updates.documentType !== null && { documentType: updates.documentType }),
      ...(updates.hasStoredDocuments !== undefined && updates.hasStoredDocuments !== null && { hasStoredDocuments: updates.hasStoredDocuments }),
      
      // ✅ FIXED: Only include optional storage metadata if they have values
      ...(updates.storageInfo !== undefined && updates.storageInfo !== null && { storageInfo: updates.storageInfo }),
      ...(updates.originalFileName !== undefined && updates.originalFileName !== null && { originalFileName: updates.originalFileName }),
      ...(updates.fileSize !== undefined && updates.fileSize !== null && { fileSize: updates.fileSize }),
      ...(updates.contentType !== undefined && updates.contentType !== null && { contentType: updates.contentType }),
      ...(updates.extractedAt !== undefined && updates.extractedAt !== null && { extractedAt: updates.extractedAt }),
      ...(updates.storedAt !== undefined && updates.storedAt !== null && { storedAt: updates.storedAt }),
      
      updatedAt: serverTimestamp()
    };

    // ✅ CRITICAL FIX: Remove any remaining undefined or null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        delete updateData[key];
        console.log(`🧹 FIRESTORE: Removed undefined/null field from update: ${key}`);
      }
    });
    
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

// Add this to the END of your firebase.js file to maintain compatibility

// Compatibility layer for components still importing mockFirebase
export const mockFirebase = {
  firestore: {
    collection: (collectionName) => ({
      get: async () => {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return {
          docs: querySnapshot.docs.map(doc => ({
            id: doc.id,
            data: () => ({ ...doc.data() })
          }))
        };
      },
      doc: (docId) => ({
        get: async () => {
          const docRef = doc(db, collectionName, docId);
          const docSnap = await getDoc(docRef);
          return {
            exists: docSnap.exists(),
            data: () => docSnap.data()
          };
        },
        update: async (updates) => {
          const docRef = doc(db, collectionName, docId);
          await updateDoc(docRef, updates);
        },
        delete: async () => {
          const docRef = doc(db, collectionName, docId);
          await deleteDoc(docRef);
        }
      }),
      add: async (newDoc) => {
        const docRef = await addDoc(collection(db, collectionName), newDoc);
        return { id: docRef.id };
      },
      where: (field, operator, value) => {
        return {
          get: async () => {
            const q = query(collection(db, collectionName), where(field, operator, value));
            const querySnapshot = await getDocs(q);
            return {
              empty: querySnapshot.empty,
              docs: querySnapshot.docs.map(doc => ({
                id: doc.id,
                data: () => ({ ...doc.data() })
              }))
            };
          }
        };
      }
    })
  }
};

export default app;
