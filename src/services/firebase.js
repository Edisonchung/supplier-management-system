// src/services/firebase.js
import { initializeSampleData } from '../utils/mockData';

// Mock Firebase implementation for demo
class MockFirebase {
  constructor() {
    this.data = {
      suppliers: JSON.parse(localStorage.getItem('suppliers') || '[]'),
      products: JSON.parse(localStorage.getItem('products') || '[]'),
      purchaseOrders: JSON.parse(localStorage.getItem('purchaseOrders') || '[]'),
      users: JSON.parse(localStorage.getItem('users') || '[]'),
      proformaInvoices: JSON.parse(localStorage.getItem('proformaInvoices') || '[]'),
      clientInvoices: JSON.parse(localStorage.getItem('clientInvoices') || '[]'),
      clientPurchaseOrders: JSON.parse(localStorage.getItem('clientPurchaseOrders') || '[]')
    };
    
    // Initialize with sample data if empty
    if (this.data.suppliers.length === 0) {
      this.initializeSuppliers();
    }
    if (this.data.products.length === 0) {
      this.initializeProducts();
    }
    if (this.data.proformaInvoices.length === 0) {
      this.initializeProformaInvoices();
    }
  }

  initializeSuppliers() {
    const sampleSuppliers = [
      {
        id: 'sup-001',
        name: 'Flow Solution Sdn. Bhd.',
        email: 'sales@flowsolution.my',
        phone: '+60 3-1234 5678',
        address: '123 Industrial Park, Petaling Jaya, Selangor',
        contactPerson: 'Ahmad Rahman',
        status: 'active',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'sup-002',
        name: 'TechParts Malaysia',
        email: 'info@techparts.com.my',
        phone: '+60 3-9876 5432',
        address: '456 Tech Avenue, Cyberjaya, Selangor',
        contactPerson: 'Sarah Lim',
        status: 'active',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'sup-003',
        name: 'Global Components Pte Ltd',
        email: 'order@globalcomp.sg',
        phone: '+65 6789 0123',
        address: '789 Business Hub, Singapore',
        contactPerson: 'David Tan',
        status: 'pending',
        dateAdded: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('suppliers', JSON.stringify(sampleSuppliers));
    this.data.suppliers = sampleSuppliers;
  }

  initializeProducts() {
    const sampleProducts = [
      {
        id: 'prod-001',
        name: 'Industrial Pump A-200',
        category: 'Pumps',
        supplierId: 'sup-001',
        currentStock: 25,
        minStock: 10,
        price: 1500,
        status: 'complete',
        furnishedTo: '',
        clientSupplied: '',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'prod-002',
        name: 'Control Valve CV-50',
        category: 'Valves',
        supplierId: 'sup-001',
        currentStock: 8,
        minStock: 15,
        price: 750,
        status: 'pending',
        furnishedTo: '',
        clientSupplied: '',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'prod-003',
        name: 'Sensor Module SM-100',
        category: 'Electronics',
        supplierId: 'sup-002',
        currentStock: 50,
        minStock: 20,
        price: 250,
        status: 'complete',
        furnishedTo: '',
        clientSupplied: '',
        dateAdded: new Date().toISOString()
      }
    ];
    
    localStorage.setItem('products', JSON.stringify(sampleProducts));
    this.data.products = sampleProducts;
  }

  initializeProformaInvoices() {
    const samplePIs = [
      {
        id: 'pi-001',
        piNumber: 'PI-2024-001',
        supplierId: 'sup-001',
        date: '2024-01-15',
        items: [
          {
            productId: 'prod-001',
            productName: 'Industrial Pump A-200',
            quantity: 10,
            unitPrice: 1500,
            totalPrice: 15000
          }
        ],
        totalAmount: 15000,
        status: 'confirmed',
        purpose: 'stock',
        deliveryStatus: 'pending',
        paymentStatus: 'paid',
        expectedDelivery: '2024-02-15',
        notes: 'Urgent order for stock replenishment'
      }
    ];
    
    localStorage.setItem('proformaInvoices', JSON.stringify(samplePIs));
    this.data.proformaInvoices = samplePIs;
  }

  // Firestore-like API
  firestore = {
    collection: (collectionName) => ({
      get: async () => {
        const data = this.data[collectionName] || [];
        return {
          docs: data.map(item => ({
            id: item.id,
            data: () => ({ ...item })
          }))
        };
      },
      doc: (docId) => ({
        get: async () => {
          const data = this.data[collectionName] || [];
          const doc = data.find(item => item.id === docId);
          return {
            exists: !!doc,
            data: () => doc
          };
        },
        update: async (updates) => {
          const data = this.data[collectionName] || [];
          const index = data.findIndex(item => item.id === docId);
          if (index !== -1) {
            data[index] = { ...data[index], ...updates };
            localStorage.setItem(collectionName, JSON.stringify(data));
            this.data[collectionName] = data;
          }
        },
        delete: async () => {
          let data = this.data[collectionName] || [];
          data = data.filter(item => item.id !== docId);
          localStorage.setItem(collectionName, JSON.stringify(data));
          this.data[collectionName] = data;
        }
      }),
      add: async (newDoc) => {
        const data = this.data[collectionName] || [];
        const id = `${collectionName.slice(0, 3)}-${Date.now()}`;
        const docWithId = { ...newDoc, id };
        data.push(docWithId);
        localStorage.setItem(collectionName, JSON.stringify(data));
        this.data[collectionName] = data;
        return { id };
      }
    })
  };

  // Auth-like API
  auth = {
    signInWithEmailAndPassword: async (email, password) => {
      // Demo accounts
      const demoAccounts = {
        'admin@company.com': { password: 'admin123', role: 'admin', name: 'Admin User' },
        'manager@company.com': { password: 'manager123', role: 'manager', name: 'Manager User' },
        'employee@company.com': { password: 'employee123', role: 'employee', name: 'Employee User' },
        'viewer@company.com': { password: 'viewer123', role: 'viewer', name: 'Viewer User' }
      };

      const account = demoAccounts[email];
      if (account && account.password === password) {
        const user = {
          uid: email.split('@')[0],
          email,
          displayName: account.name,
          role: account.role
        };
        localStorage.setItem('currentUser', JSON.stringify(user));
        return { user };
      }
      throw new Error('Invalid email or password');
    },
    signOut: async () => {
      localStorage.removeItem('currentUser');
    },
    onAuthStateChanged: (callback) => {
      const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
      callback(user);
    }
  };
}

// Create singleton instance
export const mockFirebase = new MockFirebase();

// Create a mock Firestore database object
export const db = {
  // Mock properties to satisfy Firestore checks
  _delegate: {},
  _persistenceKey: 'mock',
  _settings: {},
  type: 'firestore',
  
  toJSON: () => ({ type: 'firestore-mock' })
};

// Mock collection reference class
class MockCollectionReference {
  constructor(db, collectionName) {
    this._db = db;
    this._collectionName = collectionName;
    this.firestore = db;
    this.path = collectionName;
    this.id = collectionName;
  }
}

// Mock document reference class
class MockDocumentReference {
  constructor(collectionRef, docId) {
    this._collectionRef = collectionRef;
    this._docId = docId;
    this.firestore = collectionRef._db;
    this.path = `${collectionRef.path}/${docId}`;
    this.id = docId;
  }
}

// Mock Firestore functions
export const collection = (database, collectionName) => {
  const collectionRef = new MockCollectionReference(database, collectionName);
  
  // Add methods to the collection reference
  collectionRef.add = async (data) => {
    return mockFirebase.firestore.collection(collectionName).add(data);
  };
  
  collectionRef.get = async () => {
    return mockFirebase.firestore.collection(collectionName).get();
  };
  
  collectionRef.doc = (docId) => {
    return doc(database, collectionName, docId);
  };
  
  return collectionRef;
};

export const doc = (database, collectionName, docId) => {
  const collectionRef = new MockCollectionReference(database, collectionName);
  const docRef = new MockDocumentReference(collectionRef, docId);
  
  // Add methods to the document reference
  docRef.get = async () => {
    return mockFirebase.firestore.collection(collectionName).doc(docId).get();
  };
  
  docRef.update = async (data) => {
    return mockFirebase.firestore.collection(collectionName).doc(docId).update(data);
  };
  
  docRef.delete = async () => {
    return mockFirebase.firestore.collection(collectionName).doc(docId).delete();
  };
  
  return docRef;
};

export const addDoc = async (collectionRef, data) => {
  const collectionName = collectionRef._collectionName || collectionRef.path || 'unknown';
  return mockFirebase.firestore.collection(collectionName).add(data);
};

export const updateDoc = async (docRef, data) => {
  const pathParts = docRef.path.split('/');
  const collectionName = pathParts[0];
  const docId = pathParts[1];
  return mockFirebase.firestore.collection(collectionName).doc(docId).update(data);
};

export const deleteDoc = async (docRef) => {
  const pathParts = docRef.path.split('/');
  const collectionName = pathParts[0];
  const docId = pathParts[1];
  return mockFirebase.firestore.collection(collectionName).doc(docId).delete();
};

export const getDoc = async (docRef) => {
  const pathParts = docRef.path.split('/');
  const collectionName = pathParts[0];
  const docId = pathParts[1];
  return mockFirebase.firestore.collection(collectionName).doc(docId).get();
};

export const getDocs = async (queryOrCollection) => {
  const collectionName = queryOrCollection._collectionName || queryOrCollection.path || 'unknown';
  return mockFirebase.firestore.collection(collectionName).get();
};

// Mock query functions
export const query = (collectionRef, ...constraints) => {
  // Create a query object that extends the collection reference
  const queryObj = Object.create(collectionRef);
  queryObj._constraints = constraints;
  queryObj._isQuery = true;
  return queryObj;
};

export const where = (field, operator, value) => {
  return { type: 'where', field, operator, value };
};

export const orderBy = (field, direction = 'asc') => {
  return { type: 'orderBy', field, direction };
};

export const serverTimestamp = () => {
  return new Date().toISOString();
};

// Mock real-time listeners
export const onSnapshot = (ref, callbackOrOptions, errorCallback) => {
  const callback = typeof callbackOrOptions === 'function' ? callbackOrOptions : callbackOrOptions.next;
  const onError = errorCallback || (typeof callbackOrOptions === 'object' ? callbackOrOptions.error : undefined);
  
  // Determine collection name
  let collectionName;
  if (ref._collectionName) {
    collectionName = ref._collectionName;
  } else if (ref.path && !ref.path.includes('/')) {
    collectionName = ref.path;
  } else {
    collectionName = 'unknown';
  }
  
  // Initial data fetch
  const fetchData = async () => {
    try {
      const snapshot = await mockFirebase.firestore.collection(collectionName).get();
      
      // Apply query constraints if any
      let docs = snapshot.docs;
      if (ref._constraints) {
        ref._constraints.forEach(constraint => {
          if (constraint.type === 'where') {
            docs = docs.filter(doc => {
              const data = doc.data();
              const fieldValue = data[constraint.field];
              
              if (constraint.operator === '==') {
                return fieldValue === constraint.value;
              } else if (constraint.operator === 'in') {
                return constraint.value.includes(fieldValue);
              }
              // Add more operators as needed
              return true;
            });
          } else if (constraint.type === 'orderBy') {
            docs.sort((a, b) => {
              const aValue = a.data()[constraint.field];
              const bValue = b.data()[constraint.field];
              const multiplier = constraint.direction === 'desc' ? -1 : 1;
              
              if (aValue < bValue) return -1 * multiplier;
              if (aValue > bValue) return 1 * multiplier;
              return 0;
            });
          }
        });
      }
      
      callback({ docs });
    } catch (error) {
      if (onError) onError(error);
    }
  };
  
  // Fetch initial data
  fetchData();
  
  // Set up polling for updates (simulate real-time)
  const intervalId = setInterval(fetchData, 5000);
  
  // Return unsubscribe function
  return () => {
    clearInterval(intervalId);
  };
};

// Initialize sample data
initializeSampleData();

// Export individual functions for compatibility
export const signInWithEmailAndPassword = (email, password) => 
  mockFirebase.auth.signInWithEmailAndPassword(email, password);

export const signOut = () => mockFirebase.auth.signOut();

export const onAuthStateChanged = (callback) => 
  mockFirebase.auth.onAuthStateChanged(callback);

// Purchase Order Functions
export const getPurchaseOrders = async () => {
  const orders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
  return { success: true, data: orders };
};

export const addPurchaseOrder = async (order) => {
  const orders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
  const newOrder = {
    ...order,
    id: order.id || `po-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  orders.push(newOrder);
  localStorage.setItem('purchaseOrders', JSON.stringify(orders));
  return { success: true, data: newOrder };
};

export const updatePurchaseOrder = async (id, updates) => {
  const orders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
  const index = orders.findIndex(order => order.id === id);
  
  if (index === -1) {
    return { success: false, error: 'Purchase order not found' };
  }
  
  orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('purchaseOrders', JSON.stringify(orders));
  return { success: true, data: orders[index] };
};

export const deletePurchaseOrder = async (id) => {
  let orders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
  orders = orders.filter(order => order.id !== id);
  localStorage.setItem('purchaseOrders', JSON.stringify(orders));
  return { success: true };
};

// Proforma Invoice Functions
export const getProformaInvoices = async () => {
  const invoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
  return { success: true, data: invoices };
};

export const addProformaInvoice = async (invoice) => {
  console.log('💾 FIREBASE: Adding PI with data:', invoice);
  
  const invoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
  const newInvoice = {
    ...invoice, // ✅ This should preserve ALL fields from the input
    id: invoice.id || `pi-${Date.now()}`,
    
    // ✅ EXPLICIT: Ensure document storage fields are preserved
    documentId: invoice.documentId || null,
    documentNumber: invoice.documentNumber || null,
    documentType: 'pi',
    hasStoredDocuments: invoice.hasStoredDocuments || false,
    
    // ✅ OPTIONAL: Storage metadata
    storageInfo: invoice.storageInfo || null,
    originalFileName: invoice.originalFileName || null,
    fileSize: invoice.fileSize || null,
    contentType: invoice.contentType || null,
    extractedAt: invoice.extractedAt || null,
    storedAt: invoice.storedAt || null,
    
    // ✅ Timestamps
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('💾 FIREBASE: Complete PI object being saved:', {
    id: newInvoice.id,
    piNumber: newInvoice.piNumber,
    documentId: newInvoice.documentId, // ✅ This should NOT be undefined
    hasStoredDocuments: newInvoice.hasStoredDocuments
  });
  
  invoices.push(newInvoice);
  localStorage.setItem('proformaInvoices', JSON.stringify(invoices));
  return { success: true, data: newInvoice };
};

export const updateProformaInvoice = async (id, updates) => {
  console.log('💾 FIREBASE: Updating PI with data:', { id, updates });
  
  const invoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
  const index = invoices.findIndex(inv => inv.id === id);
  
  if (index === -1) {
    return { success: false, error: 'Proforma invoice not found' };
  }
  
  // ✅ ENHANCED: Preserve document storage fields during updates
  const updatedInvoice = { 
    ...invoices[index], 
    ...updates, 
    
    // ✅ CRITICAL: Preserve or update document storage fields
    documentId: updates.documentId || invoices[index].documentId,
    documentNumber: updates.documentNumber || invoices[index].documentNumber,
    documentType: updates.documentType || invoices[index].documentType || 'pi',
    hasStoredDocuments: updates.hasStoredDocuments !== undefined ? updates.hasStoredDocuments : invoices[index].hasStoredDocuments,
    
    // ✅ OPTIONAL: Preserve storage metadata
    storageInfo: updates.storageInfo || invoices[index].storageInfo,
    originalFileName: updates.originalFileName || invoices[index].originalFileName,
    fileSize: updates.fileSize || invoices[index].fileSize,
    contentType: updates.contentType || invoices[index].contentType,
    extractedAt: updates.extractedAt || invoices[index].extractedAt,
    storedAt: updates.storedAt || invoices[index].storedAt,
    
    updatedAt: new Date().toISOString() 
  };
  
  console.log('💾 FIREBASE: Complete updated PI object:', {
    id: updatedInvoice.id,
    piNumber: updatedInvoice.piNumber,
    documentId: updatedInvoice.documentId,
    hasStoredDocuments: updatedInvoice.hasStoredDocuments
  });
  
  invoices[index] = updatedInvoice;
  localStorage.setItem('proformaInvoices', JSON.stringify(invoices));
  return { success: true, data: updatedInvoice };
};

export const deleteProformaInvoice = async (id) => {
  let invoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
  invoices = invoices.filter(inv => inv.id !== id);
  localStorage.setItem('proformaInvoices', JSON.stringify(invoices));
  return { success: true };
};

export const updateDeliveryStatus = async (id, status) => {
  return updateProformaInvoice(id, { deliveryStatus: status });
};

// Client Invoice Functions
export const getClientInvoices = async () => {
  try {
    const invoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
    return { success: true, data: invoices };
  } catch (error) {
    console.error('Error getting client invoices:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const addClientInvoice = async (invoice) => {
  try {
    const invoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
    const newInvoice = {
      ...invoice,
      id: invoice.id || `inv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    invoices.push(newInvoice);
    localStorage.setItem('clientInvoices', JSON.stringify(invoices));
    return { success: true, data: newInvoice };
  } catch (error) {
    console.error('Error adding client invoice:', error);
    return { success: false, error: error.message };
  }
};

export const updateClientInvoice = async (id, updates) => {
  try {
    const invoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
    const index = invoices.findIndex(inv => inv.id === id);
    
    if (index === -1) {
      return { success: false, error: 'Invoice not found' };
    }
    
    invoices[index] = { 
      ...invoices[index], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    localStorage.setItem('clientInvoices', JSON.stringify(invoices));
    return { success: true, data: invoices[index] };
  } catch (error) {
    console.error('Error updating client invoice:', error);
    return { success: false, error: error.message };
  }
};

export const deleteClientInvoice = async (id) => {
  try {
    let invoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
    invoices = invoices.filter(inv => inv.id !== id);
    localStorage.setItem('clientInvoices', JSON.stringify(invoices));
    return { success: true };
  } catch (error) {
    console.error('Error deleting client invoice:', error);
    return { success: false, error: error.message };
  }
};

// Get invoices by PO ID
export const getInvoicesByPOId = async (poId) => {
  try {
    const invoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
    const filtered = invoices.filter(inv => inv.poId === poId);
    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error getting invoices by PO:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Update payment status
export const updateInvoicePaymentStatus = async (id, paymentData) => {
  try {
    const invoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
    const index = invoices.findIndex(inv => inv.id === id);
    
    if (index === -1) {
      return { success: false, error: 'Invoice not found' };
    }
    
    invoices[index] = {
      ...invoices[index],
      paymentStatus: paymentData.status,
      paidAmount: paymentData.paidAmount || 0,
      paymentDate: paymentData.paymentDate,
      paymentMethod: paymentData.paymentMethod,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('clientInvoices', JSON.stringify(invoices));
    return { success: true, data: invoices[index] };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
};

// Export default
export default mockFirebase;
