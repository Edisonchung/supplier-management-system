// src/hooks/useProformaInvoices.js
import { useState, useEffect } from 'react';
import { mockFirebase } from '../services/firebase';

export const useProformaInvoices = () => {
  const [proformaInvoices, setProformaInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProformaInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await mockFirebase.firestore.collection('proformaInvoices').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProformaInvoices(data);
    } catch (error) {
      console.error('Error loading proforma invoices:', error);
      setError('Failed to load proforma invoices');
    } finally {
      setLoading(false);
    }
  };

  const addProformaInvoice = async (piData) => {
    try {
      const newPI = {
        ...piData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await mockFirebase.firestore.collection('proformaInvoices').add(newPI);
      
      // Refresh the list
      await loadProformaInvoices();
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding proforma invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProformaInvoice = async (id, piData) => {
    try {
      await mockFirebase.firestore.collection('proformaInvoices').doc(id).update({
        ...piData,
        updatedAt: new Date().toISOString()
      });
      
      await loadProformaInvoices();
      return { success: true };
    } catch (error) {
      console.error('Error updating proforma invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteProformaInvoice = async (id) => {
    try {
      await mockFirebase.firestore.collection('proformaInvoices').doc(id).delete();
      await loadProformaInvoices();
      return { success: true };
    } catch (error) {
      console.error('Error deleting proforma invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      await mockFirebase.firestore.collection('proformaInvoices').doc(id).update({
        deliveryStatus: status,
        updatedAt: new Date().toISOString()
      });
      
      await loadProformaInvoices();
      return { success: true };
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return { success: false, error: error.message };
    }
  };

  const getProformaInvoiceById = (id) => {
    return proformaInvoices.find(pi => pi.id === id);
  };

  const getProformaInvoicesBySupplier = (supplierId) => {
    return proformaInvoices.filter(pi => pi.supplierId === supplierId);
  };

  const getPendingDeliveries = () => {
    return proformaInvoices.filter(pi => pi.deliveryStatus === 'pending');
  };

  useEffect(() => {
    loadProformaInvoices();
  }, []);

  return {
    proformaInvoices,
    loading,
    error,
    addProformaInvoice,
    updateProformaInvoice,
    deleteProformaInvoice,
    updateDeliveryStatus,
    getProformaInvoiceById,
    getProformaInvoicesBySupplier,
    getPendingDeliveries,
    refetch: loadProformaInvoices
  };
};
