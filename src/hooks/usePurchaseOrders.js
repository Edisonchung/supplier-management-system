// src/hooks/usePurchaseOrders.js - Updated with Firestore
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  where,
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export const usePurchaseOrders = () => {
  const { user } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Generate unique PO number
  const generatePONumber = useCallback(() => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  }, []);

  // Calculate subtotal from items
  const calculateSubtotal = useCallback((items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const itemTotal = Number(item.totalPrice) || (Number(item.quantity || 0) * Number(item.unitPrice || 0));
      return sum + itemTotal;
    }, 0);
  }, []);

  // Calculate total with tax
  const calculateTotal = useCallback((items, taxRate = 0.1) => {
    const subtotal = calculateSubtotal(items);
    const tax = subtotal * taxRate;
    return subtotal + tax;
  }, [calculateSubtotal]);

  // Validate and normalize PO data
  const validatePOData = useCallback((poData) => {
    const items = Array.isArray(poData.items) ? poData.items.map(item => ({
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      productName: item.productName || '',
      productCode: item.productCode || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || (Number(item.quantity || 1) * Number(item.unitPrice || 0)),
      stockAvailable: Number(item.stockAvailable) || 0,
      category: item.category || ''
    })) : [];

    return {
      // Core fields
      poNumber: poData.poNumber || generatePONumber(),
      
      // Client information
      clientPoNumber: poData.clientPoNumber || '',
      projectCode: poData.projectCode || '',
      clientName: poData.clientName || '',
      clientContact: poData.clientContact || '',
      clientEmail: poData.clientEmail || '',
      clientPhone: poData.clientPhone || '',
      
      // Dates
      orderDate: poData.orderDate || new Date().toISOString().split('T')[0],
      requiredDate: poData.requiredDate || '',
      
      // Items
      items: items,
      
      // Financial
      subtotal: calculateSubtotal(items),
      tax: poData.tax || calculateSubtotal(items) * 0.1,
      totalAmount: poData.totalAmount || calculateTotal(items),
      
      // Terms and status
      paymentTerms: poData.paymentTerms || 'Net 30',
      deliveryTerms: poData.deliveryTerms || 'FOB',
      status: poData.status || 'draft',
      fulfillmentProgress: Number(poData.fulfillmentProgress) || 0,
      
      // Additional fields
      notes: poData.notes || '',
      piAllocations: poData.piAllocations || [],
      
      // AI extraction metadata (if applicable)
      extractionConfidence: poData.extractionConfidence || null,
      extractionModel: poData.extractionModel || null,
      warnings: poData.warnings || [],
      recommendations: poData.recommendations || []
    };
  }, [generatePONumber, calculateSubtotal, calculateTotal]);

  // Set up real-time listener for Firestore
  useEffect(() => {
    if (!user) {
      setPurchaseOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    const q = query(
      collection(db, 'purchaseOrders'),
      where('createdBy', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
  (snapshot) => {
    console.log('🔍 Firestore snapshot received:', {
      docsCount: snapshot.docs.length,
      currentUser: user?.uid,
      query: 'purchaseOrders where createdBy == user.uid'
    });

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`📋 Firestore Doc ${index}:`, {
        id: doc.id,
        poNumber: data.poNumber,
        clientPoNumber: data.clientPoNumber,
        createdBy: data.createdBy,
        userMatches: data.createdBy === user?.uid,
        status: data.status,
        createdAt: data.createdAt
      });
    });

    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort in memory instead
    
    setPurchaseOrders(orders);
    setLoading(false);
    console.log(`📋 Loaded ${orders.length} purchase orders from Firestore`);
  },
      (err) => {
        console.error('Firestore subscription error:', err);
        setError(err.message);
        setLoading(false);
        toast.error('Failed to sync with database');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Add new purchase order
  const addPurchaseOrder = useCallback(async (poData) => {
    if (!user) {
      toast.error('Please sign in to create purchase orders');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);
      
      // Validate and normalize data
      const validatedData = validatePOData(poData);
      
      const docData = {
        ...validatedData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'purchaseOrders'), docData);
      
      console.log(`📋 Added purchase order to Firestore: ${validatedData.poNumber}`);
      toast.success('Purchase order created successfully');
      
      return { 
        success: true, 
        data: {
          id: docRef.id,
          ...validatedData,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error('Error adding purchase order:', err);
      setError('Failed to add purchase order');
      toast.error(`Failed to create purchase order: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, validatePOData]);

  // Update existing purchase order
  const updatePurchaseOrder = useCallback(async (id, updates) => {
    if (!user) {
      toast.error('Please sign in to update purchase orders');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);
      
      // Recalculate totals if items changed
      let processedUpdates = { ...updates };
      if (updates.items) {
        processedUpdates.subtotal = calculateSubtotal(updates.items);
        processedUpdates.tax = processedUpdates.subtotal * 0.1;
        processedUpdates.totalAmount = processedUpdates.subtotal + processedUpdates.tax;
      }
      
      const updateData = {
        ...processedUpdates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'purchaseOrders', id), updateData);
      
      console.log(`📋 Updated purchase order in Firestore: ${id}`);
      toast.success('Purchase order updated successfully');
      
      return { success: true };
    } catch (err) {
      console.error('Error updating purchase order:', err);
      setError('Failed to update purchase order');
      toast.error(`Failed to update purchase order: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, calculateSubtotal]);

  // Delete purchase order
  const deletePurchaseOrder = useCallback(async (id) => {
    if (!user) {
      toast.error('Please sign in to delete purchase orders');
      return { success: false, error: 'Not authenticated' };
    }

    if (!window.confirm('Are you sure you want to delete this purchase order?')) {
      return { success: false };
    }

    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'purchaseOrders', id));
      
      console.log(`🗑️ Deleted purchase order from Firestore: ${id}`);
      toast.success('Purchase order deleted successfully');
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting purchase order:', err);
      setError('Failed to delete purchase order');
      toast.error(`Failed to delete purchase order: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get purchase order by ID
  const getPurchaseOrderById = useCallback((id) => {
    return purchaseOrders.find(po => po.id === id);
  }, [purchaseOrders]);

  // Get purchase orders by status
  const getPurchaseOrdersByStatus = useCallback((status) => {
    return purchaseOrders.filter(po => po.status === status);
  }, [purchaseOrders]);

  // Get purchase orders by client
  const getPurchaseOrdersByClient = useCallback((clientName) => {
    return purchaseOrders.filter(po => 
      po.clientName && po.clientName.toLowerCase().includes(clientName.toLowerCase())
    );
  }, [purchaseOrders]);

  // Update purchase order status
  const updatePurchaseOrderStatus = useCallback(async (id, status) => {
    return updatePurchaseOrder(id, { status });
  }, [updatePurchaseOrder]);

  // Update fulfillment progress
  const updateFulfillmentProgress = useCallback(async (id, progress) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const status = clampedProgress >= 100 ? 'delivered' : 'processing';
    
    return updatePurchaseOrder(id, { 
      fulfillmentProgress: clampedProgress,
      status
    });
  }, [updatePurchaseOrder]);

  // Search purchase orders
  const searchPurchaseOrders = useCallback((searchTerm) => {
    if (!searchTerm) return purchaseOrders;
    
    const term = searchTerm.toLowerCase();
    return purchaseOrders.filter(po => 
      po.poNumber?.toLowerCase().includes(term) ||
      po.clientPoNumber?.toLowerCase().includes(term) ||
      po.projectCode?.toLowerCase().includes(term) ||
      po.clientName?.toLowerCase().includes(term) ||
      po.items?.some(item => 
        item.productName?.toLowerCase().includes(term) ||
        item.productCode?.toLowerCase().includes(term)
      )
    );
  }, [purchaseOrders]);

  // Get statistics
  const getStatistics = useCallback(() => {
    const stats = {
      total: purchaseOrders.length,
      byStatus: {
        draft: 0,
        confirmed: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0,
        pending: 0,
        approved: 0,
        in_progress: 0,
        completed: 0
      },
      totalValue: 0,
      averageValue: 0,
      recentOrders: [],
      topClients: {}
    };
    
    purchaseOrders.forEach(po => {
      // Count by status
      if (stats.byStatus[po.status] !== undefined) {
        stats.byStatus[po.status]++;
      }
      
      // Calculate total value
      const value = po.totalAmount || po.grandTotal || po.total || 0;
      stats.totalValue += Number(value);
      
      // Track top clients
      const clientName = po.clientName || 'Unknown Client';
      if (!stats.topClients[clientName]) {
        stats.topClients[clientName] = {
          name: clientName,
          orderCount: 0,
          totalValue: 0
        };
      }
      stats.topClients[clientName].orderCount++;
      stats.topClients[clientName].totalValue += Number(value);
    });
    
    // Calculate average
    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
    
    // Get recent orders (last 5)
    stats.recentOrders = [...purchaseOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    // Convert top clients to array and sort
    stats.topClients = Object.values(stats.topClients)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
    
    return stats;
  }, [purchaseOrders]);

  // Refresh data (for manual refresh)
  const refetch = useCallback(() => {
    // Firestore real-time listener handles this automatically
    // This is just for UI feedback
    toast.success('Purchase orders refreshed');
  }, []);

  // Clear all purchase orders (for development/testing)
  const clearAllPurchaseOrders = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to perform this action');
      return { success: false };
    }

    if (!window.confirm('Are you sure you want to clear all purchase orders? This cannot be undone.')) {
      return { success: false };
    }
    
    const confirmText = prompt('Type "DELETE ALL" to confirm:');
    if (confirmText !== 'DELETE ALL') {
      toast.info('Operation cancelled');
      return { success: false };
    }
    
    try {
      setLoading(true);
      
      // Delete all purchase orders for this user
      const q = query(
        collection(db, 'purchaseOrders'),
        where('createdBy', '==', user.uid)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`🗑️ Deleted ${snapshot.docs.length} purchase orders`);
      toast.success(`Deleted ${snapshot.docs.length} purchase orders`);
      
      return { success: true, deleted: snapshot.docs.length };
    } catch (err) {
      console.error('Error clearing purchase orders:', err);
      setError('Failed to clear purchase orders');
      toast.error('Failed to clear purchase orders');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Return all functions and data (same interface as before)
  return {
    // Data
    purchaseOrders,
    loading,
    error,
    
    // CRUD operations
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    
    // Queries
    getPurchaseOrderById,
    getPurchaseOrdersByStatus,
    getPurchaseOrdersByClient,
    searchPurchaseOrders,
    
    // Status management
    updatePurchaseOrderStatus,
    updateFulfillmentProgress,
    
    // Utilities
    getStatistics,
    generatePONumber,
    refetch,
    clearAllPurchaseOrders
  };
};
