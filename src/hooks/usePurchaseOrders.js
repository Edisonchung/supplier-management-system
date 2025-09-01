// src/hooks/usePurchaseOrders.js
// HiggsFlow Purchase Orders Hook - Build-Safe Implementation
// Fixed: React useEffect syntax errors and build failures

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
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Custom hook for managing purchase orders
 * Provides CRUD operations and real-time updates for purchase orders
 */
const usePurchaseOrders = (user) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Calculate subtotal for an order
  const calculateSubtotal = useCallback((items) => {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const price = typeof item.price === 'number' ? item.price : 0;
      const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
      return total + (price * quantity);
    }, 0);
  }, []);

  // Calculate tax amount
  const calculateTax = useCallback((subtotal, taxRate = 0.06) => {
    const amount = typeof subtotal === 'number' ? subtotal : 0;
    const rate = typeof taxRate === 'number' ? taxRate : 0.06;
    return amount * rate;
  }, []);

  // Calculate total amount
  const calculateTotal = useCallback((subtotal, tax = 0, shipping = 0) => {
    const sub = typeof subtotal === 'number' ? subtotal : 0;
    const taxAmount = typeof tax === 'number' ? tax : 0;
    const shippingAmount = typeof shipping === 'number' ? shipping : 0;
    return sub + taxAmount + shippingAmount;
  }, []);

  // Validate purchase order data
  const validatePurchaseOrder = useCallback((orderData) => {
    const errors = [];

    if (!orderData) {
      errors.push('Order data is required');
      return errors;
    }

    if (!orderData.supplier || typeof orderData.supplier !== 'object') {
      errors.push('Valid supplier information is required');
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (Array.isArray(orderData.items)) {
      orderData.items.forEach((item, index) => {
        if (!item.name || typeof item.name !== 'string') {
          errors.push(`Item ${index + 1}: Name is required`);
        }
        if (typeof item.price !== 'number' || item.price < 0) {
          errors.push(`Item ${index + 1}: Valid price is required`);
        }
        if (typeof item.quantity !== 'number' || item.quantity <= 0) {
          errors.push(`Item ${index + 1}: Valid quantity is required`);
        }
      });
    }

    return errors;
  }, []);

  // Create new purchase order
  const createPurchaseOrder = useCallback(async (orderData) => {
    if (!user || !user.uid) {
      throw new Error('User authentication required');
    }

    setCreating(true);
    setError(null);

    try {
      // Validate order data
      const validationErrors = validatePurchaseOrder(orderData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      // Calculate amounts
      const subtotal = calculateSubtotal(orderData.items || []);
      const tax = calculateTax(subtotal, orderData.taxRate);
      const total = calculateTotal(subtotal, tax, orderData.shipping || 0);

      // Prepare order document
      const orderDocument = {
        userId: user.uid,
        userEmail: user.email || 'unknown',
        supplier: {
          name: orderData.supplier.name || 'Unknown Supplier',
          email: orderData.supplier.email || '',
          address: orderData.supplier.address || '',
          phone: orderData.supplier.phone || '',
          contactPerson: orderData.supplier.contactPerson || ''
        },
        items: (orderData.items || []).map(item => ({
          id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: String(item.name || 'Unknown Item'),
          description: String(item.description || ''),
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          unit: String(item.unit || 'pcs'),
          category: String(item.category || 'General'),
          sku: String(item.sku || ''),
          specifications: item.specifications || {}
        })),
        financial: {
          subtotal: Number(subtotal),
          taxRate: Number(orderData.taxRate || 0.06),
          tax: Number(tax),
          shipping: Number(orderData.shipping || 0),
          total: Number(total),
          currency: String(orderData.currency || 'MYR')
        },
        delivery: {
          address: String(orderData.deliveryAddress || ''),
          requestedDate: orderData.requestedDeliveryDate || null,
          instructions: String(orderData.deliveryInstructions || ''),
          method: String(orderData.deliveryMethod || 'standard')
        },
        status: 'draft',
        priority: String(orderData.priority || 'normal'),
        notes: String(orderData.notes || ''),
        attachments: Array.isArray(orderData.attachments) ? orderData.attachments : [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: {
          uid: user.uid,
          email: user.email || 'unknown',
          name: user.displayName || user.email || 'Unknown User'
        },
        orderNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        version: 1,
        workflow: {
          currentStep: 'created',
          history: [{
            step: 'created',
            timestamp: new Date().toISOString(),
            user: user.uid,
            notes: 'Purchase order created'
          }]
        }
      };

      // Add to Firestore
      const purchaseOrdersCollection = collection(db, 'purchase_orders');
      const docRef = await addDoc(purchaseOrdersCollection, orderDocument);

      console.log('Purchase order created successfully:', docRef.id);
      
      return {
        id: docRef.id,
        ...orderDocument
      };

    } catch (error) {
      console.error('Error creating purchase order:', error);
      setError(error.message);
      throw error;
    } finally {
      setCreating(false);
    }
  }, [user, calculateSubtotal, calculateTax, calculateTotal, validatePurchaseOrder]);

  // Update existing purchase order
  const updatePurchaseOrder = useCallback(async (orderId, updateData) => {
    if (!user || !user.uid) {
      throw new Error('User authentication required');
    }

    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Valid order ID is required');
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
        const tax = calculateTax(subtotal, updateData.taxRate);
        const total = calculateTotal(subtotal, tax, updateData.shipping || 0);

        updateDocument.financial = {
          ...updateDocument.financial,
          subtotal: Number(subtotal),
          tax: Number(tax),
          total: Number(total)
        };
      }

      // Update workflow history if status changed
      if (updateData.status) {
        const currentOrder = purchaseOrders.find(order => order.id === orderId);
        if (currentOrder && currentOrder.status !== updateData.status) {
          updateDocument.workflow = {
            ...currentOrder.workflow,
            currentStep: updateData.status,
            history: [
              ...(currentOrder.workflow?.history || []),
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

      // Update in Firestore
      const orderDoc = doc(db, 'purchase_orders', orderId);
      await updateDoc(orderDoc, updateDocument);

      console.log('Purchase order updated successfully:', orderId);
      
      return {
        id: orderId,
        ...updateDocument
      };

    } catch (error) {
      console.error('Error updating purchase order:', error);
      setError(error.message);
      throw error;
    } finally {
      setUpdating(false);
    }
  }, [user, purchaseOrders, calculateSubtotal, calculateTax, calculateTotal]);

  // Delete purchase order
  const deletePurchaseOrder = useCallback(async (orderId) => {
    if (!user || !user.uid) {
      throw new Error('User authentication required');
    }

    if (!orderId || typeof orderId !== 'string') {
      throw new Error('Valid order ID is required');
    }

    setDeleting(true);
    setError(null);

    try {
      // Check if order can be deleted (only draft orders should be deletable)
      const currentOrder = purchaseOrders.find(order => order.id === orderId);
      if (currentOrder && currentOrder.status !== 'draft' && currentOrder.status !== 'cancelled') {
        throw new Error('Only draft or cancelled orders can be deleted');
      }

      // Delete from Firestore
      const orderDoc = doc(db, 'purchase_orders', orderId);
      await deleteDoc(orderDoc);

      console.log('Purchase order deleted successfully:', orderId);
      
      return true;

    } catch (error) {
      console.error('Error deleting purchase order:', error);
      setError(error.message);
      throw error;
    } finally {
      setDeleting(false);
    }
  }, [user, purchaseOrders]);

  // Approve purchase order
  const approvePurchaseOrder = useCallback(async (orderId, approvalData = {}) => {
    return await updatePurchaseOrder(orderId, {
      status: 'approved',
      approvedAt: serverTimestamp(),
      approvedBy: {
        uid: user.uid,
        email: user.email || 'unknown',
        name: user.displayName || user.email || 'Unknown User'
      },
      approvalNotes: String(approvalData.notes || ''),
      ...approvalData
    });
  }, [updatePurchaseOrder, user]);

  // Reject purchase order
  const rejectPurchaseOrder = useCallback(async (orderId, rejectionData = {}) => {
    return await updatePurchaseOrder(orderId, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectedBy: {
        uid: user.uid,
        email: user.email || 'unknown',
        name: user.displayName || user.email || 'Unknown User'
      },
      rejectionReason: String(rejectionData.reason || ''),
      rejectionNotes: String(rejectionData.notes || ''),
      ...rejectionData
    });
  }, [updatePurchaseOrder, user]);

  // Cancel purchase order
  const cancelPurchaseOrder = useCallback(async (orderId, cancellationData = {}) => {
    return await updatePurchaseOrder(orderId, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: {
        uid: user.uid,
        email: user.email || 'unknown',
        name: user.displayName || user.email || 'Unknown User'
      },
      cancellationReason: String(cancellationData.reason || ''),
      cancellationNotes: String(cancellationData.notes || ''),
      ...cancellationData
    });
  }, [updatePurchaseOrder, user]);

  // Get purchase orders with filtering
  const getPurchaseOrders = useCallback(async (filters = {}) => {
    if (!user || !user.uid) {
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      let purchaseOrdersQuery = query(
        collection(db, 'purchase_orders'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      // Apply filters
      if (filters.status && filters.status !== 'all') {
        purchaseOrdersQuery = query(
          purchaseOrdersQuery,
          where('status', '==', filters.status)
        );
      }

      if (filters.supplier) {
        purchaseOrdersQuery = query(
          purchaseOrdersQuery,
          where('supplier.name', '==', filters.supplier)
        );
      }

      // Execute query
      const snapshot = await getDocs(purchaseOrdersQuery);
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
      }));

      console.log(`Retrieved ${orders.length} purchase orders`);
      return orders;

    } catch (error) {
      console.error('Error getting purchase orders:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load purchase orders on mount and user change
  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      if (!user || !user.uid) {
        setPurchaseOrders([]);
        setLoading(false);
        return;
      }

      try {
        const orders = await getPurchaseOrders();
        if (isMounted) {
          setPurchaseOrders(orders);
        }
      } catch (error) {
        console.error('Error loading purchase orders:', error);
        if (isMounted) {
          setError(error.message);
          setPurchaseOrders([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [user, getPurchaseOrders]);

  // Real-time subscription to purchase orders
  useEffect(() => {
    if (!user || !user.uid) {
      return;
    }

    console.log('Setting up real-time purchase orders subscription');

    const purchaseOrdersQuery = query(
      collection(db, 'purchase_orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      purchaseOrdersQuery,
      (snapshot) => {
        const orders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt)
        }));

        console.log(`Real-time update: ${orders.length} purchase orders`);
        setPurchaseOrders(orders);
        setLoading(false);
      },
      (error) => {
        console.error('Real-time subscription error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('Cleaning up purchase orders subscription');
      unsubscribe();
    };
  }, [user]);

  // Get purchase order statistics
  const getOrderStatistics = useCallback(() => {
    if (!Array.isArray(purchaseOrders)) {
      return {
        total: 0,
        byStatus: {},
        totalValue: 0,
        averageValue: 0
      };
    }

    const stats = {
      total: purchaseOrders.length,
      byStatus: {},
      totalValue: 0,
      averageValue: 0
    };

    purchaseOrders.forEach(order => {
      // Count by status
      const status = order.status || 'unknown';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Calculate total value
      const orderTotal = order.financial?.total || 0;
      if (typeof orderTotal === 'number' && orderTotal > 0) {
        stats.totalValue += orderTotal;
      }
    });

    // Calculate average value
    if (stats.total > 0) {
      stats.averageValue = stats.totalValue / stats.total;
    }

    return stats;
  }, [purchaseOrders]);

  return {
    // State
    purchaseOrders,
    loading,
    error,
    creating,
    updating,
    deleting,

    // Actions
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    approvePurchaseOrder,
    rejectPurchaseOrder,
    cancelPurchaseOrder,
    getPurchaseOrders,

    // Utilities
    calculateSubtotal,
    calculateTax,
    calculateTotal,
    validatePurchaseOrder,
    getOrderStatistics
  };
};

export default usePurchaseOrders;
