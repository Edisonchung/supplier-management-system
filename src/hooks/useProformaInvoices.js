// src/hooks/useProformaInvoices.js
import { useState, useEffect } from 'react';
import { 
  getProformaInvoices, 
  addProformaInvoice as addPI, 
  updateProformaInvoice as updatePI,
  deleteProformaInvoice as deletePI,
  updateDeliveryStatus as updateStatus,
  cleanFirestoreData // 🔧 CRITICAL: Import the cleaning function
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

  // 🔧 CRITICAL FIX: Enhanced addProformaInvoice with data cleaning
  const addProformaInvoice = async (piData) => {
    try {
      console.log('Hook: Adding PI with data:', piData);
      
      // 🔧 CRITICAL: Clean data before sending to Firebase service
      const cleanedPiData = cleanFirestoreData(piData);
      
      console.log('Hook: Cleaned PI data:', {
        originalFieldCount: Object.keys(piData).length,
        cleanedFieldCount: Object.keys(cleanedPiData).length,
        removedFields: Object.keys(piData).filter(key => !(key in cleanedPiData))
      });
      
      const result = await addPI(cleanedPiData);
      
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

  // 🔧 CRITICAL FIX: Enhanced updateProformaInvoice with data cleaning
  const updateProformaInvoice = async (id, piData) => {
    try {
      console.log('Hook: Updating PI:', id);
      console.log('Hook: Original update data:', piData);
      
      // 🔧 CRITICAL: Clean data before processing
      let cleanedPiData = cleanFirestoreData(piData);
      
      // Check if this is a stock receiving update
      if (cleanedPiData.items && cleanedPiData.items.some(item => item.receivedQty !== undefined)) {
        // Calculate if all items are fully received
        const allReceived = cleanedPiData.items.every(item => item.receivedQty >= item.quantity);
        const someReceived = cleanedPiData.items.some(item => item.receivedQty > 0);
        const hasDiscrepancy = cleanedPiData.items.some(item => 
          item.receivedQty > 0 && item.receivedQty !== item.quantity
        );
        
        // Auto-update delivery status based on receiving
        if (allReceived && !hasDiscrepancy) {
          cleanedPiData.deliveryStatus = 'delivered';
        } else if (someReceived) {
          cleanedPiData.deliveryStatus = 'partial';
        }
        
        cleanedPiData.hasDiscrepancy = hasDiscrepancy;
      }
      
      // 🔧 CRITICAL: Clean data again after processing to ensure no undefined values
      cleanedPiData = cleanFirestoreData(cleanedPiData);
      
      console.log('Hook: Final cleaned update data:', {
        originalFieldCount: Object.keys(piData).length,
        cleanedFieldCount: Object.keys(cleanedPiData).length,
        removedFields: Object.keys(piData).filter(key => !(key in cleanedPiData))
      });
      
      const result = await updatePI(id, cleanedPiData);
      
      console.log('Hook: Update PI result:', result);
      
      if (result.success) {
        // Immediately refresh the list to show the updated PI
        await loadProformaInvoices();
        return { success: true, data: result.data };
      } else {
        console.error('Hook: PI update failed:', result.error);
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

  // 🔧 ENHANCED: updateDeliveryStatus with data cleaning
  const updateDeliveryStatus = async (id, status) => {
    try {
      console.log('Hook: Updating delivery status:', id, status);
      
      // 🔧 CRITICAL: Clean status data before sending
      const cleanedStatusUpdate = cleanFirestoreData({ deliveryStatus: status });
      
      const result = await updateStatus(id, cleanedStatusUpdate.deliveryStatus);
      
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

  // 🔧 NEW: Enhanced payment handling with data cleaning
  const addPayment = async (piId, paymentData) => {
    try {
      console.log('Hook: Adding payment to PI:', piId, paymentData);
      
      const pi = proformaInvoices.find(p => p.id === piId);
      if (!pi) {
        return { success: false, error: 'PI not found' };
      }

      // 🔧 CRITICAL: Clean payment data before processing
      const cleanedPaymentData = cleanFirestoreData(paymentData);

      const updatedPayments = [...(pi.payments || []), cleanedPaymentData];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const totalAmount = parseFloat(pi.totalAmount || 0);
      
      let paymentStatus = 'pending';
      if (totalAmount > 0) {
        if (totalPaid >= totalAmount - 0.01) {
          paymentStatus = 'paid';
        } else if (totalPaid > 0.01) {
          paymentStatus = 'partial';
        }
      }

      // 🔧 CRITICAL: Prepare clean update object
      const updateData = {
        payments: updatedPayments,
        totalPaid: Number(totalPaid),
        paymentStatus,
        lastPaymentDate: cleanedPaymentData.paymentDate,
        lastModified: new Date().toISOString(),
        lastModifiedBy: 'payment-system'
      };

      return await updateProformaInvoice(piId, updateData);
    } catch (error) {
      console.error('Error adding payment:', error);
      return { success: false, error: error.message };
    }
  };

  // 🔧 NEW: Enhanced payment status update with data cleaning
  const updatePaymentStatus = async (piId, paymentId, status) => {
    try {
      console.log('Hook: Updating payment status:', piId, paymentId, status);
      
      const pi = proformaInvoices.find(p => p.id === piId);
      if (!pi) {
        return { success: false, error: 'PI not found' };
      }

      const updatedPayments = (pi.payments || []).map(payment => 
        payment.id === paymentId 
          ? { ...payment, status, updatedAt: new Date().toISOString() }
          : payment
      );

      const updateData = {
        payments: updatedPayments,
        lastModified: new Date().toISOString(),
        lastModifiedBy: 'payment-system'
      };

      return await updateProformaInvoice(piId, updateData);
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  };

  // 🔧 NEW: Batch update with data cleaning
  const batchUpdatePIs = async (updates) => {
    const results = [];
    
    for (const { id, data } of updates) {
      try {
        const result = await updateProformaInvoice(id, data);
        results.push({ id, success: result.success, error: result.error });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    
    return {
      success: results.every(r => r.success),
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    };
  };

  // Existing utility functions
  const getProformaInvoiceById = (id) => {
    return proformaInvoices.find(pi => pi.id === id);
  };

  const getProformaInvoicesBySupplier = (supplierId) => {
    return proformaInvoices.filter(pi => pi.supplierId === supplierId);
  };

  const getPendingDeliveries = () => {
    return proformaInvoices.filter(pi => pi.deliveryStatus === 'pending');
  };

  // 🔧 NEW: Enhanced utility functions
  const getPendingPayments = () => {
    return proformaInvoices.filter(pi => pi.paymentStatus === 'pending');
  };

  const getPartialPayments = () => {
    return proformaInvoices.filter(pi => pi.paymentStatus === 'partial');
  };

  const getPaidInvoices = () => {
    return proformaInvoices.filter(pi => pi.paymentStatus === 'paid');
  };

  const getOverdueDeliveries = () => {
    const now = new Date();
    return proformaInvoices.filter(pi => {
      if (!pi.expectedDeliveryDate || pi.deliveryStatus === 'delivered') return false;
      const deliveryDate = new Date(pi.expectedDeliveryDate);
      return deliveryDate < now;
    });
  };

  const getTotalValue = () => {
    return proformaInvoices.reduce((sum, pi) => sum + parseFloat(pi.totalAmount || 0), 0);
  };

  const getTotalPaid = () => {
    return proformaInvoices.reduce((sum, pi) => sum + parseFloat(pi.totalPaid || 0), 0);
  };

  const getTotalOutstanding = () => {
    return proformaInvoices.reduce((sum, pi) => {
      const total = parseFloat(pi.totalAmount || 0);
      const paid = parseFloat(pi.totalPaid || 0);
      return sum + Math.max(0, total - paid);
    }, 0);
  };

  // Load PIs when hook is first used
  useEffect(() => {
    loadProformaInvoices();
  }, []);

  // Return all functions and state
  return {
    // State
    proformaInvoices,
    loading,
    error,
    
    // CRUD Operations
    addProformaInvoice,
    updateProformaInvoice,
    deleteProformaInvoice,
    updateDeliveryStatus,
    
    // Payment Operations
    addPayment,
    updatePaymentStatus,
    batchUpdatePIs,
    
    // Query Functions
    getProformaInvoiceById,
    getProformaInvoicesBySupplier,
    getPendingDeliveries,
    getPendingPayments,
    getPartialPayments,
    getPaidInvoices,
    getOverdueDeliveries,
    
    // Analytics
    getTotalValue,
    getTotalPaid,
    getTotalOutstanding,
    
    // Utility
    refetch: loadProformaInvoices,
    
    // 🔧 NEW: Data cleaning utility for external use
    cleanPIData: cleanFirestoreData
  };
};

// 🔧 NEW: Export utility functions for use outside the hook
export const PIUtils = {
  calculatePaymentStatus: (totalAmount, totalPaid) => {
    if (totalAmount <= 0) return 'pending';
    if (totalPaid >= totalAmount - 0.01) return 'paid';
    if (totalPaid > 0.01) return 'partial';
    return 'pending';
  },
  
  calculatePaymentPercentage: (totalAmount, totalPaid) => {
    if (totalAmount <= 0) return 0;
    return Math.min(100, (totalPaid / totalAmount) * 100);
  },
  
  isOverdue: (pi) => {
    if (!pi.expectedDeliveryDate || pi.deliveryStatus === 'delivered') return false;
    const deliveryDate = new Date(pi.expectedDeliveryDate);
    const now = new Date();
    return now > deliveryDate;
  },
  
  getRemainingBalance: (pi) => {
    const total = parseFloat(pi.totalAmount || 0);
    const paid = parseFloat(pi.totalPaid || 0);
    return Math.max(0, total - paid);
  },
  
  // 🔧 NEW: Clean PI data utility
  cleanPIData: (piData) => {
    // This will be imported from the firebase service
    return cleanFirestoreData ? cleanFirestoreData(piData) : piData;
  }
};

/*
🔧 DEPLOYMENT INSTRUCTIONS:

1. Replace your existing src/hooks/useProformaInvoices.js with this updated version
2. Ensure cleanFirestoreData is properly exported from your firebase service
3. Test PI updates to verify undefined field cleaning works
4. Monitor console for cleaning messages during payment processing

🎯 KEY IMPROVEMENTS:
✅ Automatic data cleaning in all update functions
✅ Enhanced payment handling with proper data validation
✅ Batch update support with individual result tracking
✅ Additional utility functions for analytics and calculations
✅ Comprehensive error handling and logging
✅ Clean data validation before all Firestore operations

📊 EXPECTED RESULTS:
- No more undefined field errors from the hook layer
- Successful PI payment record updates
- Clean state management with validated data
- Improved performance with optimized updates
- Better debugging with detailed logging
*/
