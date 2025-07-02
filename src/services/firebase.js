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
      clientInvoices: JSON.parse(localStorage.getItem('clientInvoices') || '[]')
    };
    
    // Initialize with sample data if empty
    if (this.data.suppliers.length === 0) {
      this.initializeSuppliers();
    }
  }

  initializeSuppliers() {
    const sampleSuppliers = [
      {
        id: 'sup-001',
        name: 'Flow Solution Sdn. Bhd.',
        email: 'sales@flowsolution.com',
        phone: '0128070612',
        address: 'PT7257, Jalan BBN 1/2A, Bandar Baru Nilai, 71800 Nilai, SGR, Malaysia',
        contactPerson: 'Edison Chung',
        status: 'active',
        dateAdded: new Date('2024-01-15').toISOString()
      },
      {
        id: 'sup-002',
        name: 'Hebei Mickey Badger Engineering',
        email: 'wenpan@hbmickey.com',
        phone: '+86-18731810277',
        address: 'Hengshui City, Hebei Province, China',
        contactPerson: 'Wenpan',
        status: 'active',
        dateAdded: new Date('2024-02-20').toISOString()
      },
      {
        id: 'sup-003',
        name: 'Tech Components Asia',
        email: 'info@techcomponents.com',
        phone: '+65 6789 0123',
        address: '123 Tech Park, Singapore 123456',
        contactPerson: 'John Lee',
        status: 'pending',
        dateAdded: new Date('2024-03-10').toISOString()
      }
    ];
    
    this.data.suppliers = sampleSuppliers;
    localStorage.setItem('suppliers', JSON.stringify(sampleSuppliers));
  }

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
          const item = this.data[collectionName]?.find(item => item.id === docId);
          return {
            id: docId,
            data: () => item,
            exists: !!item
          };
        },
        
        set: async (data, options = {}) => {
          const updatedData = { ...data, id: docId };
          const index = this.data[collectionName]?.findIndex(item => item.id === docId);
          
          if (index >= 0) {
            if (options.merge) {
              this.data[collectionName][index] = { ...this.data[collectionName][index], ...updatedData };
            } else {
              this.data[collectionName][index] = updatedData;
            }
          } else {
            if (!this.data[collectionName]) {
              this.data[collectionName] = [];
            }
            this.data[collectionName].push(updatedData);
          }
          
          localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
          return Promise.resolve();
        },
        
        update: async (data) => {
          const index = this.data[collectionName]?.findIndex(item => item.id === docId);
          if (index >= 0) {
            this.data[collectionName][index] = { ...this.data[collectionName][index], ...data };
            localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
          }
          return Promise.resolve();
        },
        
        delete: async () => {
          this.data[collectionName] = this.data[collectionName]?.filter(item => item.id !== docId) || [];
          localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
          return Promise.resolve();
        }
      }),
      
      add: async (data) => {
        const id = `${collectionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newDoc = { ...data, id };
        
        if (!this.data[collectionName]) {
          this.data[collectionName] = [];
        }
        
        this.data[collectionName].push(newDoc);
        localStorage.setItem(collectionName, JSON.stringify(this.data[collectionName]));
        
        return Promise.resolve({ id });
      },
      
      where: (field, operator, value) => ({
        get: async () => {
          let filtered = this.data[collectionName] || [];
          
          switch (operator) {
            case '==':
              filtered = filtered.filter(item => item[field] === value);
              break;
            case '!=':
              filtered = filtered.filter(item => item[field] !== value);
              break;
            case '>':
              filtered = filtered.filter(item => item[field] > value);
              break;
            case '<':
              filtered = filtered.filter(item => item[field] < value);
              break;
            case '>=':
              filtered = filtered.filter(item => item[field] >= value);
              break;
            case '<=':
              filtered = filtered.filter(item => item[field] <= value);
              break;
            case 'array-contains':
              filtered = filtered.filter(item => Array.isArray(item[field]) && item[field].includes(value));
              break;
            default:
              break;
          }
          
          return {
            docs: filtered.map((item, index) => ({
              id: item.id || `${collectionName}-${index}`,
              data: () => item,
              exists: true
            })),
            empty: filtered.length === 0
          };
        }
      })
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
