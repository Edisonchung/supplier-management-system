// src/services/firestore/suppliers.service.js
import { BaseFirestoreService } from './baseService';
import { query, where, getDocs } from 'firebase/firestore';

class SuppliersService extends BaseFirestoreService {
  constructor() {
    super('suppliers');
  }

  // Get suppliers by status
  async getByStatus(status) {
    try {
      const q = query(this.collectionRef, where('status', '==', status));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting suppliers by status:', error);
      throw error;
    }
  }

  // Search suppliers by name
  async searchByName(searchTerm) {
    try {
      // Firestore doesn't support full-text search natively
      // This is a simple implementation - for production, consider Algolia or ElasticSearch
      const allSuppliers = await this.getAll();
      return allSuppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error('Error searching suppliers:', error);
      throw error;
    }
  }

  // Get active suppliers
  async getActiveSuppliers() {
    return this.getByStatus('active');
  }

  // Check if email exists
  async emailExists(email, excludeId = null) {
    try {
      const q = query(this.collectionRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      if (excludeId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeId);
      }
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email existence:', error);
      throw error;
    }
  }

  // Get supplier statistics
  async getStatistics() {
    try {
      const allSuppliers = await this.getAll();
      
      return {
        total: allSuppliers.length,
        active: allSuppliers.filter(s => s.status === 'active').length,
        pending: allSuppliers.filter(s => s.status === 'pending').length,
        inactive: allSuppliers.filter(s => s.status === 'inactive').length
      };
    } catch (error) {
      console.error('Error getting supplier statistics:', error);
      throw error;
    }
  }
}

export const suppliersService = new SuppliersService();
