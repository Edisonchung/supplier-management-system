// src/hooks/useClientInvoices.js
import { useState, useEffect } from 'react';
import { 
  getClientInvoices, 
  addClientInvoice, 
  updateClientInvoice, 
  deleteClientInvoice,
  updateInvoicePaymentStatus 
} from '../services/firebase';

export const useClientInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getClientInvoices();
      if (result.success) {
        setInvoices(result.data);
      } else {
        setError(result.error || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
      setError('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const addInvoice = async (invoiceData) => {
    try {
      const result = await addClientInvoice(invoiceData);
      if (result.success) {
        await loadInvoices();
      }
      return result;
    } catch (error) {
      console.error('Error adding invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const updateInvoice = async (id, updates) => {
    try {
      const result = await updateClientInvoice(id, updates);
      if (result.success) {
        await loadInvoices();
      }
      return result;
    } catch (error) {
      console.error('Error updating invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteInvoice = async (id) => {
    try {
      const result = await deleteClientInvoice(id);
      if (result.success) {
        await loadInvoices();
      }
      return result;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return { success: false, error: error.message };
    }
  };

  const updatePaymentStatus = async (id, paymentData) => {
    try {
      const result = await updateInvoicePaymentStatus(id, paymentData);
      if (result.success) {
        await loadInvoices();
      }
      return result;
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  };

  // Calculate summary statistics
  const getStats = () => {
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.paymentStatus === 'paid').length;
    const pending = invoices.filter(inv => inv.paymentStatus === 'pending').length;
    const partial = invoices.filter(inv => inv.paymentStatus === 'partial').length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstandingAmount = totalAmount - paidAmount;
    
    return {
      total,
      paid,
      pending,
      partial,
      totalAmount,
      paidAmount,
      outstandingAmount
    };
  };

  // Get overdue invoices
  const getOverdueInvoices = () => {
    const today = new Date();
    return invoices.filter(invoice => {
      if (invoice.paymentStatus === 'paid') return false;
      const dueDate = new Date(invoice.dueDate);
      return dueDate < today;
    });
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  return {
    invoices,
    loading,
    error,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    updatePaymentStatus,
    getStats,
    getOverdueInvoices,
    refetch: loadInvoices
  };
};
