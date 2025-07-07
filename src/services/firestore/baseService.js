// src/services/firestore/baseService.js
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export class BaseFirestoreService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Create document
  async create(data) {
    try {
      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(this.collectionRef, docData);
      return {
        id: docRef.id,
        ...docData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get single document
  async getById(id) {
    try {
      const docRef = doc(this.collectionRef, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Get all documents
  async getAll(queryConstraints = []) {
    try {
      const q = query(this.collectionRef, ...queryConstraints);
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting all ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update document
  async update(id, data) {
    try {
      const docRef = doc(this.collectionRef, id);
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
      return {
        id,
        ...updateData,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Delete document
  async delete(id) {
    try {
      const docRef = doc(this.collectionRef, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Real-time listener
  subscribe(queryConstraints = [], callback) {
    const q = query(this.collectionRef, ...queryConstraints);
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    }, (error) => {
      console.error(`Error in ${this.collectionName} subscription:`, error);
    });
  }

  // Search documents
  async search(field, searchTerm) {
    try {
      // For simple search - in production, consider using Algolia or ElasticSearch
      const q = query(
        this.collectionRef,
        where(field, '>=', searchTerm),
        where(field, '<=', searchTerm + '\uf8ff')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error searching ${this.collectionName}:`, error);
      throw error;
    }
  }
}

// src/services/firestore/suppliers.service.js
import { BaseFirestoreService } from './baseService';
import { where, orderBy } from 'firebase/firestore';

class SuppliersService extends BaseFirestoreService {
  constructor() {
    super('suppliers');
  }

  async getActiveSuppliers() {
    return this.getAll([
      where('status', '==', 'active'),
      orderBy('name')
    ]);
  }

  async getSuppliersByStatus(status) {
    return this.getAll([
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    ]);
  }

  async searchSuppliers(searchTerm) {
    // Search by name
    const byName = await this.search('name', searchTerm);
    
    // You could also search by email, phone, etc. and combine results
    return byName;
  }
}

export const suppliersService = new SuppliersService();

// src/services/firestore/products.service.js
import { BaseFirestoreService } from './baseService';
import { where, orderBy } from 'firebase/firestore';

class ProductsService extends BaseFirestoreService {
  constructor() {
    super('products');
  }

  async getProductsBySupplier(supplierId) {
    return this.getAll([
      where('supplierId', '==', supplierId),
      orderBy('name')
    ]);
  }

  async getLowStockProducts() {
    // Firestore doesn't support querying where one field < another field
    // So we get all products and filter in memory
    const allProducts = await this.getAll();
    return allProducts.filter(product => product.stock <= product.minStock);
  }

  async updateStock(productId, newStock) {
    return this.update(productId, { stock: newStock });
  }

  async getProductsByCategory(category) {
    return this.getAll([
      where('category', '==', category),
      orderBy('name')
    ]);
  }
}

export const productsService = new ProductsService();

// src/services/firestore/purchaseOrders.service.js
import { BaseFirestoreService } from './baseService';
import { where, orderBy, limit as firestoreLimit } from 'firebase/firestore';

class PurchaseOrdersService extends BaseFirestoreService {
  constructor() {
    super('purchaseOrders');
  }

  async getRecentOrders(limit = 10) {
    return this.getAll([
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    ]);
  }

  async getOrdersByStatus(status) {
    return this.getAll([
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    ]);
  }

  async getOrdersByDateRange(startDate, endDate) {
    return this.getAll([
      where('orderDate', '>=', startDate),
      where('orderDate', '<=', endDate),
      orderBy('orderDate', 'desc')
    ]);
  }

  async getOrdersBySupplier(supplierId) {
    return this.getAll([
      where('supplierId', '==', supplierId),
      orderBy('createdAt', 'desc')
    ]);
  }

  // Generate unique PO number
  async generatePONumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of POs created today
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));
    
    const todaysOrders = await this.getAll([
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    ]);
    
    const sequence = String(todaysOrders.length + 1).padStart(3, '0');
    return `PO-${year}${month}${day}-${sequence}`;
  }
}

export const purchaseOrdersService = new PurchaseOrdersService();

// src/services/firestore/index.js
export { suppliersService } from './suppliers.service';
export { productsService } from './products.service';
export { purchaseOrdersService } from './purchaseOrders.service';
export { BaseFirestoreService } from './baseService';
