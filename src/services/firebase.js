// src/services/firebase.js

// Mock Firebase implementation for demo
class MockFirebase {
  constructor() {
    this.data = {
      suppliers: JSON.parse(localStorage.getItem('suppliers') || '[]'),
      products: JSON.parse(localStorage.getItem('products') || '[]'),
      purchaseOrders: JSON.parse(localStorage.getItem('purchaseOrders') || '[]'),
      users: JSON.parse(localStorage.getItem('users') || '[]'),
      proformaInvoices: JSON.parse(localStorage.getItem('proformaInvoices') || '[]'),
      clientInvoices: JSON.parse(localStorage.getItem('clientInvoices') || '[]')
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
        address: 'Lot 123, Jalan Industrial 1, 47100 Puchong, Selangor',
        contactPerson: 'Mr. Ahmad Rahman',
        status: 'active',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'sup-002',
        name: 'Tech Components Asia',
        email: 'info@techcomponents.sg',
        phone: '+65 6789 0123',
        address: '8 Jurong East, Singapore 123456',
        contactPerson: 'Ms. Sarah Lee',
        status: 'active',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'sup-003',
        name: 'Industrial Parts Malaysia',
        email: 'procurement@industrialparts.my',
        phone: '+60 3-9876 5432',
        address: 'Block B, Damansara Business Park, 46200 Petaling Jaya',
        contactPerson: 'Mr. David Tan',
        status: 'pending',
        dateAdded: new Date().toISOString()
      }
    ];

    this.data.suppliers = sampleSuppliers;
    localStorage.setItem('suppliers', JSON.stringify(sampleSuppliers));
  }

  initializeProducts() {
    const sampleProducts = [
      {
        id: 'prod-001',
        name: 'SMC Pneumatic Cylinder',
        code: 'CY1B25-300',
        brand: 'SMC',
        supplierId: 'sup-001',
        category: 'pneumatics',
        price: 450.00,
        stock: 15,
        minStock: 5,
        status: 'complete',
        description: 'Rodless cylinder, 25mm bore, 300mm stroke',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'prod-002',
        name: 'Omron Safety Relay',
        code: 'G9SA-301',
        brand: 'Omron',
        supplierId: 'sup-002',
        category: 'automation',
        price: 320.00,
        stock: 8,
        minStock: 3,
        status: 'complete',
        description: '3-pole safety relay unit',
        dateAdded: new Date().toISOString()
      },
      {
        id: 'prod-003',
        name: 'Festo Solenoid Valve',
        code: 'VUVG-L14-M52',
        brand: 'Festo',
        supplierId: 'sup-001',
        category: 'pneumatics',
        price: 180.00,
        stock: 25,
        minStock: 10,
        status: 'pending',
        description: '5/2-way solenoid valve',
        dateAdded: new Date().toISOString()
      }
    ];

    this.data.products = sampleProducts;
    localStorage.setItem('products', JSON.stringify(sampleProducts));
  }

  initializeProformaInvoices() {
    const samplePIs = [
      {
        id: 'pi-001',
        piNumber: 'PI-20250124-001',
        supplierId: 'sup-001',
        date: new Date().toISOString(),
        items: [
          {
            productId: 'prod-001',
            productName: 'SMC Pneumatic Cylinder',
            productCode: 'CY1B25-300',
            quantity: 5,
            unitPrice: 450.00,
            totalPrice: 2250.00,
            receivedQty: 0
          }
        ],
        totalAmount: 2250.00,
        status: 'confirmed',
        deliveryStatus: 'pending',
        purpose: 'stock',
        notes: 'Urgent order for stock replenishment',
        paymentTerms: '30% down payment, 70% before delivery',
        paymentStatus: 'pending',
        totalPaid: 0,
        payments: [],
        shareableId: 'pi-1737650000000-abc123xyz',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.data.proformaInvoices = samplePIs;
    localStorage.setItem('proformaInvoices', JSON.stringify(samplePIs));
  }

  // Firestore-like API
  firestore = {
    collection: (collectionName) => ({
      get: async () => {
        const data = this.data[collectionName] || [];
        return {
          docs: data.map((item, index) => ({
            id: item.id || `${collectionName}-${index}`,
            data: () => item,
            exists: true
          })),
          empty: data.length === 0
        };
      },
      
      doc: (docId) => ({
        get: async () => {
          const data = this.data[collectionName] || [];
          const doc = data.find(item => item.id === docId);
          return {
            exists: !!doc,
            data: () => doc,
            id: docId
          };
        },
        update: async (updates) => {
          const data = this.data[collectionName] || [];
          const index = data.findIndex(item => item.id === docId);
          if (index !== -1) {
            this.data[collectionName][index] = { ...data[index], ...updates };
            localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
          }
        },
        delete: async () => {
          const data = this.data[collectionName] || [];
          this.data[collectionName] = data.filter(item => item.id !== docId);
          localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
        }
      }),
      
      // Add where query support
      where: (field, operator, value) => ({
        get: async () => {
          const data = this.data[collectionName] || [];
          const filtered = data.filter(item => {
            if (operator === '==') return item[field] === value;
            if (operator === '!=') return item[field] !== value;
            if (operator === '>') return item[field] > value;
            if (operator === '<') return item[field] < value;
            if (operator === '>=') return item[field] >= value;
            if (operator === '<=') return item[field] <= value;
            if (operator === 'in') return value.includes(item[field]);
            if (operator === 'array-contains') return item[field]?.includes(value);
            return false;
          });
          
          return {
            docs: filtered.map((item, index) => ({
              id: item.id || `${collectionName}-${index}`,
              data: () => item,
              exists: true
            })),
            empty: filtered.length === 0
          };
        }
      }),
      
      add: async (documentData) => {
        const id = `${collectionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newDoc = { ...documentData, id };
        
        if (!this.data[collectionName]) {
          this.data[collectionName] = [];
        }
        
        this.data[collectionName].push(newDoc);
        localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
        
        return { id };
      }
    })
  };
}

// Export mock Firebase instance
export const mockFirebase = new MockFirebase();

// Mock authentication
export const auth = {
  currentUser: JSON.parse(localStorage.getItem('currentUser') || 'null'),
  
  signInWithEmailAndPassword: async (email, password) => {
    // For demo, accept predefined users
    const demoUsers = [
      { email: 'admin@company.com', password: 'admin123', role: 'admin', fullName: 'Admin User' },
      { email: 'manager@company.com', password: 'manager123', role: 'manager', fullName: 'Manager User' },
      { email: 'employee@company.com', password: 'employee123', role: 'employee', fullName: 'Employee User' },
      { email: 'viewer@company.com', password: 'viewer123', role: 'viewer', fullName: 'Viewer User' }
    ];
    
    const user = demoUsers.find(u => u.email === email && u.password === password);
    
    if (user) {
      const userData = {
        uid: `user-${Date.now()}`,
        email: user.email,
        role: user.role,
        fullName: user.fullName
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
      auth.currentUser = userData;
      
      return { user: userData };
    } else {
      throw new Error('Invalid email or password');
    }
  },
  
  signOut: async () => {
    localStorage.removeItem('currentUser');
    auth.currentUser = null;
  },
  
  onAuthStateChanged: (callback) => {
    // Call callback with current user
    callback(auth.currentUser);
    
    // Return unsubscribe function
    return () => {};
  }
};

// Export for backward compatibility
export const firestore = mockFirebase.firestore;
export default mockFirebase;
