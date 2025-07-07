// src/services/clientPOService.js
import { mockFirebase } from './firebase';

const COLLECTION_NAME = 'clientPurchaseOrders';

// Check if we're using real Firestore or mock
const isRealFirestore = typeof window !== 'undefined' && 
  window.location.hostname !== 'localhost' && 
  !window.location.hostname.includes('127.0.0.1');

// Helper function to generate timestamps
const timestamp = () => new Date().toISOString();

// Mock implementation using localStorage
const mockClientPOService = {
  async create(poData) {
    try {
      const newPO = {
        ...poData,
        status: 'sourcing_required',
        sourcingStatus: 'pending',
        createdAt: timestamp(),
        updatedAt: timestamp()
      };
      const docRef = await mockFirebase.firestore.collection(COLLECTION_NAME).add(newPO);
      return { id: docRef.id, ...newPO };
    } catch (error) {
      console.error('Error creating client PO:', error);
      throw error;
    }
  },

  async getAll() {
    try {
      const snapshot = await mockFirebase.firestore.collection(COLLECTION_NAME).get();
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by createdAt descending
      return docs.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
    } catch (error) {
      console.error('Error fetching client POs:', error);
      throw error;
    }
  },

  async getSourcingRequired() {
    try {
      const snapshot = await mockFirebase.firestore.collection(COLLECTION_NAME).get();
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Filter and sort
      return docs
        .filter(po => po.sourcingStatus === 'pending' || po.sourcingStatus === 'partial')
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } catch (error) {
      console.error('Error fetching sourcing required POs:', error);
      throw error;
    }
  },

  async getById(id) {
    try {
      const doc = await mockFirebase.firestore.collection(COLLECTION_NAME).doc(id).get();
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        throw new Error('Client PO not found');
      }
    } catch (error) {
      console.error('Error fetching client PO:', error);
      throw error;
    }
  },

  async update(id, updates) {
    try {
      await mockFirebase.firestore.collection(COLLECTION_NAME).doc(id).update({
        ...updates,
        updatedAt: timestamp()
      });
      return { id, ...updates };
    } catch (error) {
      console.error('Error updating client PO:', error);
      throw error;
    }
  },

  async updateItemSourcing(poId, itemId, sourcingData) {
    try {
      const po = await this.getById(poId);
      const updatedItems = po.items.map(item => 
        item.id === itemId 
          ? { ...item, sourcing: sourcingData, sourcingStatus: 'sourced' }
          : item
      );
      
      const allSourced = updatedItems.every(item => item.sourcingStatus === 'sourced');
      const someSourced = updatedItems.some(item => item.sourcingStatus === 'sourced');
      const sourcingStatus = allSourced ? 'complete' : someSourced ? 'partial' : 'pending';
      
      return await this.update(poId, {
        items: updatedItems,
        sourcingStatus
      });
    } catch (error) {
      console.error('Error updating item sourcing:', error);
      throw error;
    }
  },

  async delete(id) {
    try {
      await mockFirebase.firestore.collection(COLLECTION_NAME).doc(id).delete();
      return { success: true };
    } catch (error) {
      console.error('Error deleting client PO:', error);
      throw error;
    }
  },

  subscribe(callback, errorCallback = console.error) {
    try {
      // Initial load
      this.getAll().then(callback).catch(errorCallback);
      
      // Poll for changes every 3 seconds
      const interval = setInterval(async () => {
        try {
          const data = await this.getAll();
          callback(data);
        } catch (error) {
          errorCallback(error);
        }
      }, 3000);
      
      // Return unsubscribe function
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error subscribing to client POs:', error);
      errorCallback(error);
      return () => {};
    }
  },

  subscribeSourcingRequired(callback, errorCallback = console.error) {
    try {
      // Initial load
      this.getSourcingRequired().then(callback).catch(errorCallback);
      
      // Poll for changes every 3 seconds
      const interval = setInterval(async () => {
        try {
          const data = await this.getSourcingRequired();
          callback(data);
        } catch (error) {
          errorCallback(error);
        }
      }, 3000);
      
      // Return unsubscribe function
      return () => clearInterval(interval);
    } catch (error) {
      console.error('Error subscribing to sourcing required POs:', error);
      errorCallback(error);
      return () => {};
    }
  },

  async createSupplierPO(clientPOId, supplierId, selectedItems) {
    try {
      const clientPO = await this.getById(clientPOId);
      
      const supplierPOData = {
        clientPOReference: {
          id: clientPOId,
          poNumber: clientPO.clientPONumber,
          clientName: clientPO.clientName
        },
        supplierId,
        items: selectedItems,
        status: 'draft',
        createdAt: timestamp(),
        updatedAt: timestamp()
      };
      
      return supplierPOData;
    } catch (error) {
      console.error('Error creating supplier PO:', error);
      throw error;
    }
  }
};

// For now, always use mock service since real Firestore isn't set up
export const clientPOService = mockClientPOService;

// If you want to switch to real Firestore later, you can uncomment this:
/*
if (isRealFirestore) {
  // Import real Firestore functions at the top
  const { collection, doc, addDoc, ... } = await import('firebase/firestore');
  const { db } = await import('./firebase');
  
  // Real Firestore implementation
  export const clientPOService = {
    // ... real Firestore methods
  };
} else {
  export const clientPOService = mockClientPOService;
}
*/
