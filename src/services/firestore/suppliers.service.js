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

  /**
   * Bank Account Management
   * -----------------------
   * Bank accounts are stored as an embedded array on the supplier document:
   * supplier.bankAccounts: [
   *   {
   *     id: string;
   *     currency: string;
   *     bankName: string;
   *     accountNumber: string;
   *     swiftCode?: string;
   *     isDefault?: boolean;
   *     createdAt: string;
   *     updatedAt?: string;
   *     // ... other fields
   *   }
   * ]
   */

  // Get all bank accounts for a supplier
  async getBankAccounts(supplierId) {
    try {
      const supplier = await this.getById(supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      return supplier.bankAccounts || [];
    } catch (error) {
      console.error('Error getting bank accounts for supplier:', error);
      throw error;
    }
  }

  // Add a new bank account to a supplier
  async addBankAccount(supplierId, bankAccount) {
    try {
      const supplier = await this.getById(supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const existingAccounts = supplier.bankAccounts || [];

      // Check for duplicate (same accountNumber + swiftCode)
      const duplicate = existingAccounts.find(acc =>
        acc.accountNumber === bankAccount.accountNumber &&
        acc.swiftCode === bankAccount.swiftCode
      );

      if (duplicate) {
        const error = new Error('Bank account already exists for this supplier');
        error.code = 'BANK_ACCOUNT_DUPLICATE';
        throw error;
      }

      const timestamp = new Date().toISOString();

      const newAccount = {
        id: bankAccount.id || `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...bankAccount,
        addedFrom: bankAccount.addedFrom || bankAccount.addedFrom === null ? bankAccount.addedFrom : 'manual',
        createdAt: bankAccount.createdAt || timestamp,
        updatedAt: timestamp
      };

      let updatedAccounts = [...existingAccounts];

      // If this is the first account or marked as default, unset other defaults
      if (newAccount.isDefault || updatedAccounts.length === 0) {
        updatedAccounts = updatedAccounts.map(acc => ({ ...acc, isDefault: false }));
        newAccount.isDefault = true;
      }

      updatedAccounts.push(newAccount);

      await this.update(supplierId, {
        bankAccounts: updatedAccounts
      });

      return newAccount;
    } catch (error) {
      console.error('Error adding bank account for supplier:', error);
      throw error;
    }
  }

  // Update an existing bank account on a supplier
  async updateBankAccount(supplierId, accountId, updates) {
    try {
      const supplier = await this.getById(supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const existingAccounts = supplier.bankAccounts || [];
      if (existingAccounts.length === 0) {
        throw new Error('No bank accounts found for this supplier');
      }

      let found = false;
      const timestamp = new Date().toISOString();

      const updatedAccounts = existingAccounts.map(acc => {
        if (acc.id === accountId) {
          found = true;
          return {
            ...acc,
            ...updates,
            updatedAt: timestamp
          };
        }

        // If this account is being set as default, unset others
        if (updates.isDefault && acc.id !== accountId) {
          return { ...acc, isDefault: false };
        }

        return acc;
      });

      if (!found) {
        throw new Error('Bank account not found');
      }

      await this.update(supplierId, {
        bankAccounts: updatedAccounts
      });
    } catch (error) {
      console.error('Error updating bank account for supplier:', error);
      throw error;
    }
  }

  // Delete a bank account from a supplier
  async deleteBankAccount(supplierId, accountId) {
    try {
      const supplier = await this.getById(supplierId);
      if (!supplier) {
        throw new Error('Supplier not found');
      }

      const existingAccounts = supplier.bankAccounts || [];
      if (existingAccounts.length === 0) {
        // Nothing to delete
        return;
      }

      const accountToDelete = existingAccounts.find(acc => acc.id === accountId);
      if (!accountToDelete) {
        throw new Error('Bank account not found');
      }

      let updatedAccounts = existingAccounts.filter(acc => acc.id !== accountId);

      // If deleted account was default and others exist, set first remaining as default
      if (
        accountToDelete.isDefault &&
        updatedAccounts.length > 0 &&
        !updatedAccounts.some(acc => acc.isDefault)
      ) {
        updatedAccounts[0] = {
          ...updatedAccounts[0],
          isDefault: true
        };
      }

      await this.update(supplierId, {
        bankAccounts: updatedAccounts
      });
    } catch (error) {
      console.error('Error deleting bank account for supplier:', error);
      throw error;
    }
  }
}

export const suppliersService = new SuppliersService();
