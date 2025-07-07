// src/services/clientPOService.js
import { 
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
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'clientPurchaseOrders';

export const clientPOService = {
  // Create a new client PO
  async create(poData) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...poData,
        status: 'sourcing_required',
        sourcingStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: docRef.id, ...poData };
    } catch (error) {
      console.error('Error creating client PO:', error);
      throw error;
    }
  },

  // Get all client POs
  async getAll() {
    try {
      const querySnapshot = await getDocs(
        query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
      );
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching client POs:', error);
      throw error;
    }
  },

  // Get client POs requiring sourcing
  async getSourcingRequired() {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sourcingStatus', 'in', ['pending', 'partial']),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching sourcing required POs:', error);
      throw error;
    }
  },

  // Get a single client PO
  async getById(id) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Client PO not found');
      }
    } catch (error) {
      console.error('Error fetching client PO:', error);
      throw error;
    }
  },

  // Update a client PO
  async update(id, updates) {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { id, ...updates };
    } catch (error) {
      console.error('Error updating client PO:', error);
      throw error;
    }
  },

  // Update sourcing status for items
  async updateItemSourcing(poId, itemId, sourcingData) {
    try {
      const po = await this.getById(poId);
      const updatedItems = po.items.map(item => 
        item.id === itemId 
          ? { ...item, sourcing: sourcingData, sourcingStatus: 'sourced' }
          : item
      );
      
      // Check if all items are sourced
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

  // Delete a client PO
  async delete(id) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting client PO:', error);
      throw error;
    }
  },

  // Subscribe to real-time updates
  subscribe(callback, errorCallback = console.error) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, 
        (snapshot) => {
          const clientPOs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(clientPOs);
        },
        errorCallback
      );
    } catch (error) {
      console.error('Error subscribing to client POs:', error);
      errorCallback(error);
    }
  },

  // Subscribe to sourcing required POs only
  subscribeSourcingRequired(callback, errorCallback = console.error) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sourcingStatus', 'in', ['pending', 'partial']),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, 
        (snapshot) => {
          const clientPOs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(clientPOs);
        },
        errorCallback
      );
    } catch (error) {
      console.error('Error subscribing to sourcing required POs:', error);
      errorCallback(error);
    }
  },

  // Create supplier PO from client PO items
  async createSupplierPO(clientPOId, supplierId, selectedItems) {
    try {
      const clientPO = await this.getById(clientPOId);
      
      // Create supplier PO data
      const supplierPOData = {
        clientPOReference: {
          id: clientPOId,
          poNumber: clientPO.clientPONumber,
          clientName: clientPO.clientName
        },
        supplierId,
        items: selectedItems,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // This would typically call your existing PO service
      // For now, we'll just return the data structure
      return supplierPOData;
    } catch (error) {
      console.error('Error creating supplier PO:', error);
      throw error;
    }
  }
};
