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

  initializeProducts() {
    const sampleProducts = [
      {
        id: 'prod-001',
        name: 'LOAD CELL CABLE C/W SENSOR CONNECTOR SERIES',
        brand: 'Generic',
        supplierId: 'sup-001',
        category: 'cables',
        price: 400,
        status: 'complete',
        description: 'Cable Length 2 Meter',
        sku: '200QCR1634',
        stock: 10,
        minStock: 5,
        dateAdded: new Date('2024-01-20').toISOString()
      },
      {
        id: 'prod-002',
        name: 'CIRCUIT BREAKER POLE: 3 220 9kW',
        brand: 'Schneider',
        supplierId: 'sup-001',
        category: 'electronics',
        price: 230,
        status: 'complete',
        description: 'Industrial circuit breaker',
        sku: '200QCR1372',
        stock: 15,
        minStock: 10,
        dateAdded: new Date('2024-01-25').toISOString()
      },
      {
        id: 'prod-003',
        name: 'Siemens Push Button 3SB3400-0B',
        brand: 'Siemens',
        supplierId: 'sup-002',
        category: 'components',
        price: 4.50,
        status: 'pending',
        description: 'Industrial push button',
        sku: 'S3628',
        stock: 25,
        minStock: 20,
        dateAdded: new Date('2024-02-10').toISOString()
      },
      {
        id: 'prod-004',
        name: 'Siemens Communication Module 6AG1972-0BA12-2XA0',
        brand: 'Siemens',
        supplierId: 'sup-002',
        category: 'electronics',
        price: 42,
        status: 'complete',
        description: 'SIMATIC S7 communication module',
        sku: 'S3626',
        stock: 3,
        minStock: 5,
        dateAdded: new Date('2024-02-15').toISOString()
      },
      {
        id: 'prod-005',
        name: 'Hydraulic Valve DG4V-5-2C-MU-C6-20',
        brand: 'Parker',
        supplierId: 'sup-001',
        category: 'hydraulics',
        price: 157,
        status: 'complete',
        description: 'Directional control valve',
        sku: 'PKR-DG4V-002',
        stock: 0,
        minStock: 2,
        dateAdded: new Date('2024-03-01').toISOString()
      },
      {
        id: 'prod-006',
        name: 'Proximity Sensor E2E-X5ME1',
        brand: 'Omron',
        supplierId: 'sup-003',
        category: 'sensors',
        price: 85,
        status: 'pending',
        description: 'Inductive proximity sensor, M12',
        sku: 'OMR-E2E-001',
        stock: 8,
        minStock: 10,
        dateAdded: new Date('2024-03-05').toISOString()
      }
    ];
    
    this.data.products = sampleProducts;
    localStorage.setItem('products', JSON.stringify(sampleProducts));
  }

  initializeProformaInvoices() {
    const samplePIs = [
      {
        id: 'pi-001',
        piNumber: 'PI-2024-001',
        supplierId: 'sup-001',
        date: '2024-07-09',
        items: [
          {
            productId: 'prod-001',
            productName: 'LOAD CELL CABLE C/W SENSOR CONNECTOR SERIES',
            productCode: '200QCR1634',
            quantity: 1,
            unitPrice: 400,
            totalPrice: 400,
            notes: ''
          },
          {
            productId: 'prod-002',
            productName: 'CIRCUIT BREAKER POLE: 3 220 9kW',
            productCode: '200QCR1372',
            quantity: 1,
            unitPrice: 230,
            totalPrice: 230,
            notes: ''
          }
        ],
        totalAmount: 630,
        status: 'confirmed',
        deliveryStatus: 'pending',
        purpose: 'client-order',
        notes: 'For Pelabuhan Tanjung Pelepas project',
        createdAt: new Date('2024-07-09').toISOString(),
        updatedAt: new Date('2024-07-09').toISOString()
      },
      {
        id: 'pi-002',
        piNumber: 'PI-2024-002',
        supplierId: 'sup-002',
        date: '2024-07-10',
        items: [
          {
            productId: 'prod-003',
            productName: 'Siemens Push Button 3SB3400-0B',
            productCode: 'S3628',
            quantity: 4,
            unitPrice: 4.50,
            totalPrice: 18,
            notes: ''
          },
          {
            productId: 'prod-004',
            productName: 'Siemens Communication Module 6AG1972-0BA12-2XA0',
            productCode: 'S3626',
            quantity: 19,
            unitPrice: 42,
            totalPrice: 798,
            notes: ''
          }
        ],
        totalAmount: 816,
        status: 'confirmed',
        deliveryStatus: 'in-transit',
        purpose: 'stock',
        notes: 'Regular stock replenishment',
        createdAt: new Date('2024-07-10').toISOString(),
        updatedAt: new Date('2024-08-15').toISOString()
      },
      {
        id: 'pi-003',
        piNumber: 'PI-2024-003',
        supplierId: 'sup-001',
        date: '2024-09-01',
        items: [
          {
            productId: 'prod-005',
            productName: 'Hydraulic Valve DG4V-5-2C-MU-C6-20',
            productCode: 'PKR-DG4V-002',
            quantity: 5,
            unitPrice: 157,
            totalPrice: 785,
            notes: 'Urgent order'
          }
        ],
        totalAmount: 785,
        status: 'pending',
        deliveryStatus: 'pending',
        purpose: 'r&d',
        notes: 'For R&D testing new hydraulic system',
        createdAt: new Date('2024-09-01').toISOString(),
        updatedAt: new Date('2024-09-01').toISOString()
      },
      {
        id: 'pi-004',
        piNumber: 'PI-2024-004',
        supplierId: 'sup-003',
        date: '2024-09-10',
        items: [
          {
            productId: 'prod-006',
            productName: 'Proximity Sensor E2E-X5ME1',
            productCode: 'OMR-E2E-001',
            quantity: 20,
            unitPrice: 85,
            totalPrice: 1700,
            notes: ''
          }
        ],
        totalAmount: 1700,
        status: 'draft',
        deliveryStatus: 'pending',
        purpose: 'stock',
        notes: 'Awaiting approval',
        createdAt: new Date('2024-09-10').toISOString(),
        updatedAt: new Date('2024-09-10').toISOString()
      }
    ];
    
    this.data.proformaInvoices = samplePIs;
    localStorage.setItem('proformaInvoices', JSON.stringify(samplePIs));
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
