// src/hooks/useProformaInvoices.js
import { useState, useEffect } from 'react';
import { 
  getProformaInvoices, 
  addProformaInvoice as addPI, 
  updateProformaInvoice as updatePI,
  deleteProformaInvoice as deletePI,
  updateDeliveryStatus as updateStatus
} from '../services/firebase';

export const useProformaInvoices = () => {
  const [proformaInvoices, setProformaInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProformaInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getProformaInvoices();
      if (result.success) {
        setProformaInvoices(result.data);
      } else {
        setError(result.error || 'Failed to load proforma invoices');
        setProformaInvoices([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Error loading proforma invoices:', error);
      setError('Failed to load proforma invoices');
      setProformaInvoices([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  const addProformaInvoice = async (piData) => {
    try {
      console.log('Hook: Adding PI with data:', piData);
      
      const result = await addPI(piData);
      
      console.log('Hook: Add PI result:', result);
      
      if (result.success) {
        // Immediately refresh the list to show the new PI
        await loadProformaInvoices();
        return { success: true, data: result.data };
      } else {
        return { success: false, error: result.error || 'Failed to add PI' };
      }
    } catch (error) {
      console.error('Error adding proforma invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProformaInvoice = async (id, piData) => {
    try {
      console.log('Hook: Updating PI:', id, piData);
      
      // Check if this is a stock receiving update
      if (piData.items && piData.items.some(item => item.receivedQty !== undefined)) {
        // Calculate if all items are fully received
        const allReceived = piData.items.every(item => item.receivedQty >= item.quantity);
        const someReceived = piData.items.some(item => item.receivedQty > 0);
        const hasDiscrepancy = piData.items.some(item => 
          item.receivedQty > 0 && item.receivedQty !== item.quantity
        );
        
        // Auto-update delivery status based on receiving
        if (allReceived && !hasDiscrepancy) {
          piData.deliveryStatus = 'delivered';
        } else if (someReceived) {
          piData.deliveryStatus = 'partial';
        }
        
        piData.hasDiscrepancy = hasDiscrepancy;
      }
      
      const result = await updatePI(id, piData);
      
      console.log('Hook: Update PI result:', result);
      
      if (result.success) {
        // Immediately refresh the list to show the updated PI
        await loadProformaInvoices();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to update PI' };
      }
    } catch (error) {
      console.error('Error updating proforma invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteProformaInvoice = async (id) => {
    try {
      console.log('Hook: Deleting PI:', id);
      
      const result = await deletePI(id);
      
      console.log('Hook: Delete PI result:', result);
      
      if (result.success) {
        // Immediately refresh the list to remove the deleted PI
        await loadProformaInvoices();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to delete PI' };
      }
    } catch (error) {
      console.error('Error deleting proforma invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      console.log('Hook: Updating delivery status:', id, status);
      
      const result = await updateStatus(id, status);
      
      console.log('Hook: Update delivery status result:', result);
      
      if (result.success) {
        // Immediately refresh the list to show the status update
        await loadProformaInvoices();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Failed to update delivery status' };
      }
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

  // Load PIs when hook is first used
  useEffect(() => {
    loadProformaInvoices();
  }, []);

  // Return all functions and state
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
