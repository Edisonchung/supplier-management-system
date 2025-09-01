// src/hooks/useProformaInvoices.js
// HiggsFlow Proforma Invoices Hook - Build-Safe Implementation
// Fixed: JavaScript syntax errors and build failures

import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  updateDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Custom hook for managing proforma invoices
 * Provides CRUD operations and real-time updates for proforma invoices
 */
const useProformaInvoices = (user) => {
  const [proformaInvoices, setProformaInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Clean data for Firestore storage
  const cleanDataForFirestore = useCallback((data) => {
    if (!data || typeof data !== 'object') return data;
    
    const cleaned = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        cleaned[key] = null;
      } else if (typeof value === 'string') {
        cleaned[key] = value.trim();
      } else if (typeof value === 'number') {
        cleaned[key] = isFinite(value) ? value : 0;
      } else if (typeof value === 'boolean') {
        cleaned[key] = value;
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(item => cleanDataForFirestore(item));
      } else if (typeof value === 'object') {
        cleaned[key] = cleanDataForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }, []);

  // Generate invoice number
  const generateInvoiceNumber = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `PI-${timestamp}-${random}`;
  }, []);

  // Calculate line total
  const calculateLineTotal = useCallback((quantity, unitPrice) => {
    const qty = typeof quantity === 'number' ? quantity : 0;
    const price = typeof unitPrice === 'number' ? unitPrice : 0;
    return qty * price;
  }, []);

  // Calculate subtotal
  const calculateSubtotal = useCallback((items) => {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const lineTotal = calculateLineTotal(item.quantity, item.unitPrice);
      return total + lineTotal;
    }, 0);
  }, [calculateLineTotal]);

  // Calculate tax amount
  const calculateTaxAmount = useCallback((subtotal, taxRate = 0) => {
    const amount = typeof subtotal === 'number' ? subtotal : 0;
    const rate = typeof taxRate === 'number' ? taxRate : 0;
    return amount * (rate / 100);
  }, []);

  // Calculate total amount
  const calculateTotalAmount = useCallback((subtotal, taxAmount = 0, discountAmount = 0) => {
    const sub = typeof subtotal === 'number' ? subtotal : 0;
    const tax = typeof taxAmount === 'number' ? taxAmount : 0;
    const discount = typeof discountAmount === 'number' ? discountAmount : 0;
    return sub + tax - discount;
  }, []);

  // Validate proforma invoice data
  const validateProformaInvoice = useCallback((invoiceData) => {
    const errors = [];

    if (!invoiceData) {
      errors.push('Invoice data is required');
      return errors;
    }

    if (!invoiceData.customer || typeof invoiceData.customer !== 'object') {
      errors.push('Valid customer information is required');
    } else {
      if (!invoiceData.customer.name) {
        errors.push('Customer name is required');
      }
      if (!invoiceData.customer.email) {
        errors.push('Customer email is required');
      }
    }

    if (!Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      errors.push('At least one item is required');
    } else {
      invoiceData.items.forEach((item, index) => {
        if (!item.description) {
          errors.push(`Item ${index + 1}: Description is required`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
        if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
          errors.push(`Item ${index + 1}: Valid unit price is required`);
        }
      });
    }

    if (invoiceData.dueDate && isNaN(new Date(invoiceData.dueDate))) {
      errors.push('Valid due date is required');
    }

    return errors;
  }, []);

  // Create new proforma invoice
  const createProformaInvoice = useCallback(async (invoiceData) => {
    if (!user || !user.uid) {
      throw new Error('User authentication required');
    }

    setCreating(true);
    setError(null);

    try {
      // Validate invoice data
      const validationErrors = validateProformaInvoice(invoiceData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Calculate financial amounts
      const subtotal = calculateSubtotal(invoiceData.items || []);
      const taxAmount = calculateTaxAmount(subtotal, invoiceData.taxRate || 0);
      const discountAmount = invoiceData.discountAmount || 0;
      const totalAmount = calculateTotalAmount(subtotal, taxAmount, discountAmount);

      // Prepare invoice document
      const invoiceDocument = {
        userId: user.uid,
        userEmail: user.email || 'unknown',
        invoiceNumber: invoiceData.invoiceNumber || generateInvoiceNumber(),
        customer: {
          name: String(invoiceData.customer?.name || ''),
          email: String(invoiceData.customer?.email || ''),
          company: String(invoiceData.customer?.company || ''),
          address: String(invoiceData.customer?.address || ''),
          phone: String(invoiceData.customer?.phone || ''),
          taxId: String(invoiceData.customer?.taxId || '')
        },
        items: (invoiceData.items || []).map((item, index) => ({
          id: item.id || `item_${index + 1}_${Date.now()}`,
          description: String(item.description || ''),
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          lineTotal: calculateLineTotal(item.quantity, item.unitPrice),
          unit: String(item.unit || 'pcs'),
          category: String(item.category || '')
        })),
        financial: {
          subtotal: Number(subtotal),
          taxRate: Number(invoiceData.taxRate || 0),
          taxAmount: Number(taxAmount),
          discountAmount: Number(discountAmount),
          totalAmount: Number(totalAmount),
          currency: String(invoiceData.currency || 'MYR')
        },
        dates: {
          issueDate: invoiceData.issueDate ? new Date(invoiceData.issueDate) : new Date(),
          dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
          validUntil: invoiceData.validUntil ? new Date(invoiceData.validUntil) : null
        },
        status: 'draft',
        notes: String(invoiceData.notes || ''),
        terms: String(invoiceData.terms || ''),
        paymentTerms: String(invoiceData.paymentTerms || ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          email: user.email || 'unknown',
          name: user.displayName || user.email || 'Unknown User'
        },
        version: 1,
        workflow: {
          currentStep: 'draft',
          history: [{
            step: 'draft',
            timestamp: new Date().toISOString(),
            user: user.uid,
            notes: 'Proforma invoice created'
          }]
        }
      };

      // Clean data before saving
      const cleanedDocument = cleanDataForFirestore(invoiceDocument);

      // Add to Firestore
      const proformaInvoicesCollection = collection(db, 'proforma_invoices');
      const docRef = await addDoc(proformaInvoicesCollection, cleanedDocument);

      console.log('Proforma invoice created successfully:', docRef.id);
      
      return {
        success: true,
        data: {
          id: docRef.id,
          ...cleanedDocument
        }
      };

    } catch (error) {
      console.error('Error creating proforma invoice:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setCreating(false);
    }
  }, [user, validateProformaInvoice, calculateSubtotal, calculateTaxAmount, calculateTotalAmount, generateInvoiceNumber, calculateLineTotal, cleanDataForFirestore]);

  // Update existing proforma invoice
  const updateProformaInvoice = useCallback(async (invoiceId, updateData) => {
    if (!user || !user.uid) {
      throw new Error('User authentication required');
    }

    if (!invoiceId || typeof invoiceId !== 'string') {
      throw new Error('Valid invoice ID is required');
    }

    setUpdating(true);
    setError(null);

    try {
      // Prepare update document
      const updateDocument = {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: {
          uid: user.uid,
          email: user.email || 'unknown',
          name: user.displayName || user.email || 'Unknown User'
        }
      };

      // Recalculate financial amounts if items were updated
      if (updateData.items) {
        const subtotal = calculateSubtotal(updateData.items);
        const taxAmount = calculateTaxAmount(subtotal, updateData.taxRate || 0);
        const discountAmount = updateData.discountAmount || 0;
        const totalAmount = calculateTotalAmount(subtotal, taxAmount, discountAmount);

        updateDocument.financial = {
          ...updateDocument.financial,
          subtotal: Number(subtotal),
          taxAmount: Number(taxAmount),
          totalAmount: Number(totalAmount)
        };

        // Update line totals for items
        updateDocument.items = updateData.items.map(item => ({
          ...item,
          lineTotal: calculateLineTotal(item.quantity, item.unitPrice)
        }));
      }

      // Update workflow history if status changed
      if (updateData.status) {
        const currentInvoice = proformaInvoices.find(invoice => invoice.id === invoiceId);
        if (currentInvoice && currentInvoice.status !== updateData.status) {
          updateDocument.workflow = {
            ...currentInvoice.workflow,
            currentStep: updateData.status,
            history: [
              ...(currentInvoice.workflow?.history || []),
              {
                step: updateData.status,
                timestamp: new Date().toISOString(),
                user: user.uid,
                notes: `Status changed to ${updateData.status}`
              }
            ]
          };
        }
      }

      // Clean data before saving
      const cleanedDocument = cleanDataForFirestore(updateDocument);

      // Update in Firestore
      const invoiceDoc = doc(db, 'proforma_invoices', invoiceId);
      await updateDoc(invoiceDoc, cleanedDocument);

      console.log('Proforma invoice updated successfully:', invoiceId);
      
      return {
        success: true,
        data: {
          id: invoiceId,
          ...cleanedDocument
        }
      };

    } catch (error) {
      console.error('Error updating proforma invoice:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setUpdating(false);
    }
  }, [user, proformaInvoices, calculateSubtotal, calculateTaxAmount, calculateTotalAmount, calculateLineTotal, cleanDataForFirestore]);

  // Delete proforma invoice
  const deleteProformaInvoice = useCallback(async (invoiceId) => {
    if (!user || !user.uid) {
      throw new Error('User authentication required');
    }

    if (!invoiceId || typeof invoiceId !== 'string') {
      throw new Error('Valid invoice ID is required');
    }

    setDeleting(true);
    setError(null);

    try {
      // Check if invoice can be deleted (only draft invoices should be deletable)
      const currentInvoice = proformaInvoices.find(invoice => invoice.id === invoiceId);
      if (currentInvoice && currentInvoice.status !== 'draft' && currentInvoice.status !== 'cancelled') {
        throw new Error('Only draft or cancelled invoices can be deleted');
      }

      // Delete from Firestore
      const invoiceDoc = doc(db, 'proforma_invoices', invoiceId);
      await deleteDoc(invoiceDoc);

      console.log('Proforma invoice deleted successfully:', invoiceId);
      
      return { success: true };

    } catch (error) {
      console.error('Error deleting proforma invoice:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setDeleting(false);
    }
  }, [user, proformaInvoices]);

  // Send invoice to customer
  const sendInvoice = useCallback(async (invoiceId, sendOptions = {}) => {
    return await updateProformaInvoice(invoiceId, {
      status: 'sent',
      sentAt: serverTimestamp(),
      sentTo: sendOptions.email || '',
      sentBy: {
        uid: user.uid,
        email: user.email || 'unknown',
        name: user.displayName || user.email || 'Unknown User'
      },
      sendNotes: String(sendOptions.notes || '')
    });
  }, [updateProformaInvoice, user]);

  // Mark invoice as accepted
  const acceptInvoice = useCallback(async (invoiceId, acceptanceData = {}) => {
    return await updateProformaInvoice(invoiceId, {
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      acceptedBy: acceptanceData.acceptedBy || '',
      acceptanceNotes: String(acceptanceData.notes || '')
    });
  }, [updateProformaInvoice]);

  // Mark invoice as rejected
  const rejectInvoice = useCallback(async (invoiceId, rejectionData = {}) => {
    return await updateProformaInvoice(invoiceId, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: rejectionData.rejectedBy || '',
      rejectionReason: String(rejectionData.reason || ''),
      rejectionNotes: String(rejectionData.notes || '')
    });
  }, [updateProformaInvoice]);

  // Convert to final invoice
  const convertToInvoice = useCallback(async (invoiceId, conversionData = {}) => {
    return await updateProformaInvoice(invoiceId, {
      status: 'converted',
      convertedAt: serverTimestamp(),
      convertedBy: {
        uid: user.uid,
        email: user.email || 'unknown',
        name: user.displayName || user.email || 'Unknown User'
      },
      finalInvoiceId: conversionData.finalInvoiceId || '',
      conversionNotes: String(conversionData.notes || '')
    });
  }, [updateProformaInvoice, user]);

  // Get proforma invoices with filtering
  const getProformaInvoices = useCallback(async (filters = {}) => {
    if (!user || !user.uid) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      let invoicesQuery = query(
        collection(db, 'proforma_invoices'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        invoicesQuery = query(
          invoicesQuery,
          where('status', '==', filters.status)
        );
      }

      if (filters.customer) {
        invoicesQuery = query(
          invoicesQuery,
          where('customer.name', '==', filters.customer)
        );
      }

      // Execute query
      const snapshot = await getDocs(invoicesQuery);
      const invoices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
      }));

      console.log(`Retrieved ${invoices.length} proforma invoices`);
      return invoices;

    } catch (error) {
      console.error('Error getting proforma invoices:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load proforma invoices on mount and user change
  useEffect(() => {
    let isMounted = true;

    const loadInvoices = async () => {
      if (!user || !user.uid) {
        setProformaInvoices([]);
        setLoading(false);
        return;
      }

      try {
        const invoices = await getProformaInvoices();
        if (isMounted) {
          setProformaInvoices(invoices);
        }
      } catch (error) {
        console.error('Error loading proforma invoices:', error);
        if (isMounted) {
          setError(error.message);
          setProformaInvoices([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [user, getProformaInvoices]);

  // Real-time subscription to proforma invoices
  useEffect(() => {
    if (!user || !user.uid) {
      return;
    }

    console.log('Setting up real-time proforma invoices subscription');

    const invoicesQuery = query(
      collection(db, 'proforma_invoices'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        const invoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
        }));

        console.log(`Real-time update: ${invoices.length} proforma invoices`);
        setProformaInvoices(invoices);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time subscription error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up proforma invoices subscription');
      unsubscribe();
    };
  }, [user]);

  // Get invoice statistics
  const getInvoiceStatistics = useCallback(() => {
    if (!Array.isArray(proformaInvoices)) {
      return {
        total: 0,
        byStatus: {},
        totalValue: 0,
        averageValue: 0
      };
    }

    const stats = {
      total: proformaInvoices.length,
      byStatus: {},
      totalValue: 0,
      averageValue: 0
    };

    proformaInvoices.forEach(invoice => {
      // Count by status
      const status = invoice.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Calculate total value
      const invoiceTotal = invoice.financial?.totalAmount || 0;
      if (typeof invoiceTotal === 'number' && invoiceTotal > 0) {
        stats.totalValue += invoiceTotal;
      }
    });

    // Calculate average value
    if (stats.total > 0) {
      stats.averageValue = stats.totalValue / stats.total;
    }

    return stats;
  }, [proformaInvoices]);

  return {
    // State
    proformaInvoices,
    loading,
    error,
    creating,
    updating,
    deleting,

    // Actions
    createProformaInvoice,
    updateProformaInvoice,
    deleteProformaInvoice,
    sendInvoice,
    acceptInvoice,
    rejectInvoice,
    convertToInvoice,
    getProformaInvoices,

    // Utilities
    calculateLineTotal,
    calculateSubtotal,
    calculateTaxAmount,
    calculateTotalAmount,
    validateProformaInvoice,
    generateInvoiceNumber,
    getInvoiceStatistics,
    cleanDataForFirestore
  };
};

export default useProformaInvoices;
