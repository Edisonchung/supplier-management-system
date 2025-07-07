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

// Create a mock Firestore-compatible db object
export const db = {
  // Mock collection method for Firestore compatibility
  collection: (collectionName) => {
    return {
      // Mock add method
      add: async (data) => {
        const result = await mockFirebase.firestore.collection(collectionName).add(data);
        return { id: result.id };
      },
      // Mock doc method
      doc: (docId) => ({
        get: () => mockFirebase.firestore.collection(collectionName).doc(docId).get(),
        update: (data) => mockFirebase.firestore.collection(collectionName).doc(docId).update(data),
        delete: () => mockFirebase.firestore.collection(collectionName).doc(docId).delete()
      })
    };
  }
};

// Mock Firestore functions for compatibility
export const collection = (db, collectionName) => {
  return mockFirebase.firestore.collection(collectionName);
};

export const doc = (db, collectionName, docId) => {
  return mockFirebase.firestore.collection(collectionName).doc(docId);
};

export const addDoc = async (collectionRef, data) => {
  if (collectionRef.add) {
    return await collectionRef.add(data);
  }
  // Handle case where collectionRef is a string (collection name)
  const collectionName = typeof collectionRef === 'string' ? collectionRef : 'unknown';
  return await mockFirebase.firestore.collection(collectionName).add(data);
};

export const updateDoc = async (docRef, data) => {
  if (docRef.update) {
    return await docRef.update(data);
  }
  throw new Error('Invalid document reference');
};

export const deleteDoc = async (docRef) => {
  if (docRef.delete) {
    return await docRef.delete();
  }
  throw new Error('Invalid document reference');
};

export const getDoc = async (docRef) => {
  if (docRef.get) {
    return await docRef.get();
  }
  throw new Error('Invalid document reference');
};

export const getDocs = async (collectionRef) => {
  if (collectionRef.get) {
    return await collectionRef.get();
  }
  // Handle case where collectionRef is a string (collection name)
  const collectionName = typeof collectionRef === 'string' ? collectionRef : 'unknown';
  return await mockFirebase.firestore.collection(collectionName).get();
};

// Mock query functions
export const query = (collectionRef, ...constraints) => {
  // For now, just return the collection ref
  // In a real implementation, you'd apply the constraints
  return collectionRef;
};

export const where = (field, operator, value) => {
  return { field, operator, value };
};

export const orderBy = (field, direction = 'asc') => {
  return { field, direction };
};

export const serverTimestamp = () => {
  return new Date().toISOString();
};

// Mock real-time listeners
export const onSnapshot = (ref, callback, errorCallback) => {
  // Simulate real-time updates by calling the callback immediately
  if (ref.get) {
    ref.get().then(snapshot => {
      callback(snapshot);
    }).catch(error => {
      if (errorCallback) errorCallback(error);
    });
  }
  
  // Return a mock unsubscribe function
  return () => {
    // Cleanup logic would go here
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
  const invoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
  const newInvoice = {
    ...invoice,
    id: invoice.id || `pi-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  invoices.push(newInvoice);
  localStorage.setItem('proformaInvoices', JSON.stringify(invoices));
  return { success: true, data: newInvoice };
};

export const updateProformaInvoice = async (id, updates) => {
  const invoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
  const index = invoices.findIndex(inv => inv.id === id);
  
  if (index === -1) {
    return { success: false, error: 'Proforma invoice not found' };
  }
  
  invoices[index] = { ...invoices[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('proformaInvoices', JSON.stringify(invoices));
  return { success: true, data: invoices[index] };
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
