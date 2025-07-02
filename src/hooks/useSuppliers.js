// src/hooks/useSuppliers.js
import { useState, useEffect } from 'react';
import { mockFirebase } from '../services/firebase';

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await mockFirebase.firestore.collection('suppliers').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(data);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (supplierData) => {
    try {
      const newSupplier = {
        ...supplierData,
        dateAdded: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await mockFirebase.firestore.collection('suppliers').add(newSupplier);
      await loadSuppliers();
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding supplier:', error);
      return { success: false, error: error.message };
    }
  };

  const updateSupplier = async (id, supplierData) => {
    try {
      await mockFirebase.firestore.collection('suppliers').doc(id).update({
        ...supplierData,
        updatedAt: new Date().toISOString()
      });
      
      await loadSuppliers();
      return { success: true };
    } catch (error) {
      console.error('Error updating supplier:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteSupplier = async (id) => {
    try {
      await mockFirebase.firestore.collection('suppliers').doc(id).delete();
      await loadSuppliers();
      return { success: true };
    } catch (error) {
      console.error('Error deleting supplier:', error);
      return { success: false, error: error.message };
    }
  };

  const getSupplierById = (id) => {
    return suppliers.find(supplier => supplier.id === id);
  };

  const getActiveSuppliers = () => {
    return suppliers.filter(supplier => supplier.status === 'active');
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  return {
    suppliers,
    loading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById,
    getActiveSuppliers,
    refetch: loadSuppliers
  };
};
