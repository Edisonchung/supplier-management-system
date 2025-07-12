// src/hooks/usePurchaseOrders.js
import { useState, useEffect, useCallback } from 'react';

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load purchase orders from localStorage
  const loadPurchaseOrders = useCallback(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem('purchaseOrders');
      
      if (stored) {
        const orders = JSON.parse(stored);
        
        // Ensure each PO has required fields and unique ID
        const validatedOrders = orders.map((order, index) => ({
          // Core fields
          id: order.id || `po-${Date.now()}-${index}`,
          poNumber: order.poNumber || generatePONumber(),
          
          // Client information
          clientPoNumber: order.clientPoNumber || '',
          projectCode: order.projectCode || '',
          clientName: order.clientName || '',
          clientContact: order.clientContact || '',
          clientEmail: order.clientEmail || '',
          clientPhone: order.clientPhone || '',
          
          // Dates
          orderDate: order.orderDate || new Date().toISOString().split('T')[0],
          requiredDate: order.requiredDate || '',
          
          // Items with validation
          items: Array.isArray(order.items) ? order.items.map(item => ({
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            productName: item.productName || '',
            productCode: item.productCode || '',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            totalPrice: Number(item.totalPrice) || (Number(item.quantity || 1) * Number(item.unitPrice || 0)),
            stockAvailable: Number(item.stockAvailable) || 0,
            category: item.category || ''
          })) : [],
          
          // Financial
          subtotal: Number(order.subtotal) || calculateSubtotal(order.items || []),
          tax: Number(order.tax) || 0,
          totalAmount: Number(order.totalAmount) || calculateTotal(order.items || []),
          
          // Terms and status
          paymentTerms: order.paymentTerms || 'Net 30',
          deliveryTerms: order.deliveryTerms || 'FOB',
          status: order.status || 'draft',
          fulfillmentProgress: Number(order.fulfillmentProgress) || 0,
          
          // Additional fields
          notes: order.notes || '',
          piAllocations: order.piAllocations || [],
          
          // Metadata
          createdAt: order.createdAt || new Date().toISOString(),
          updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          createdBy: order.createdBy || 'system',
          
          // AI extraction metadata (if applicable)
          extractionConfidence: order.extractionConfidence || null,
          extractionModel: order.extractionModel || null,
          warnings: order.warnings || [],
          recommendations: order.recommendations || []
        }));
        
        setPurchaseOrders(validatedOrders);
      } else {
        // Initialize with empty array if no data exists
        setPurchaseOrders([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error loading purchase orders:', err);
      setError('Failed to load purchase orders');
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save purchase orders to localStorage
  const savePurchaseOrders = useCallback((orders) => {
    try {
      localStorage.setItem('purchaseOrders', JSON.stringify(orders));
      return true;
    } catch (err) {
      console.error('Error saving purchase orders:', err);
      setError('Failed to save purchase orders');
      return false;
    }
  }, []);

  // Generate unique PO number
  const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  // Calculate subtotal from items
  const calculateSubtotal = (items) => {
    return items.reduce((sum, item) => {
      const itemTotal = Number(item.totalPrice) || (Number(item.quantity || 0) * Number(item.unitPrice || 0));
      return sum + itemTotal;
    }, 0);
  };

  // Calculate total with tax
  const calculateTotal = (items, taxRate = 0.1) => {
    const subtotal = calculateSubtotal(items);
    const tax = subtotal * taxRate;
    return subtotal + tax;
  };

  // Add new purchase order
  const addPurchaseOrder = useCallback(async (poData) => {
    try {
      // Ensure all required fields
      const newPO = {
        ...poData,
        id: poData.id || `po-${Date.now()}`,
        poNumber: poData.poNumber || generatePONumber(),
        status: poData.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: poData.createdBy || 'current-user',
        
        // Calculate financial totals
        subtotal: calculateSubtotal(poData.items || []),
        tax: poData.tax || calculateSubtotal(poData.items || []) * 0.1,
        totalAmount: poData.totalAmount || calculateTotal(poData.items || [])
      };
      
      const updatedOrders = [...purchaseOrders, newPO];
      setPurchaseOrders(updatedOrders);
      
      if (savePurchaseOrders(updatedOrders)) {
        return { success: true, data: newPO };
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Error adding purchase order:', err);
      setError('Failed to add purchase order');
      return { success: false, error: err.message };
    }
  }, [purchaseOrders, savePurchaseOrders]);

  // Update existing purchase order
  const updatePurchaseOrder = useCallback(async (id, updates) => {
    try {
      const updatedOrders = purchaseOrders.map(po => {
        if (po.id === id) {
          // Recalculate totals if items changed
          const updatedPO = {
            ...po,
            ...updates,
            updatedAt: new Date().toISOString()
          };
          
          if (updates.items) {
            updatedPO.subtotal = calculateSubtotal(updates.items);
            updatedPO.tax = updatedPO.subtotal * 0.1;
            updatedPO.totalAmount = updatedPO.subtotal + updatedPO.tax;
          }
          
          return updatedPO;
        }
        return po;
      });
      
      setPurchaseOrders(updatedOrders);
      
      if (savePurchaseOrders(updatedOrders)) {
        return { success: true };
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Error updating purchase order:', err);
      setError('Failed to update purchase order');
      return { success: false, error: err.message };
    }
  }, [purchaseOrders, savePurchaseOrders]);

  // Delete purchase order
  const deletePurchaseOrder = useCallback(async (id) => {
    try {
      const updatedOrders = purchaseOrders.filter(po => po.id !== id);
      setPurchaseOrders(updatedOrders);
      
      if (savePurchaseOrders(updatedOrders)) {
        return { success: true };
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Error deleting purchase order:', err);
      setError('Failed to delete purchase order');
      return { success: false, error: err.message };
    }
  }, [purchaseOrders, savePurchaseOrders]);

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
      po.clientName.toLowerCase().includes(clientName.toLowerCase())
    );
  }, [purchaseOrders]);

  // Update purchase order status
  const updatePurchaseOrderStatus = useCallback(async (id, status) => {
    return updatePurchaseOrder(id, { status });
  }, [updatePurchaseOrder]);

  // Update fulfillment progress
  const updateFulfillmentProgress = useCallback(async (id, progress) => {
    return updatePurchaseOrder(id, { 
      fulfillmentProgress: Math.min(100, Math.max(0, progress)),
      status: progress >= 100 ? 'delivered' : 'processing'
    });
  }, [updatePurchaseOrder]);

  // Search purchase orders
  const searchPurchaseOrders = useCallback((searchTerm) => {
    const term = searchTerm.toLowerCase();
    return purchaseOrders.filter(po => 
      po.poNumber.toLowerCase().includes(term) ||
      po.clientPoNumber.toLowerCase().includes(term) ||
      po.clientName.toLowerCase().includes(term) ||
      po.items.some(item => 
        item.productName.toLowerCase().includes(term) ||
        item.productCode.toLowerCase().includes(term)
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
        cancelled: 0
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
      stats.totalValue += po.totalAmount || 0;
      
      // Track top clients
      if (!stats.topClients[po.clientName]) {
        stats.topClients[po.clientName] = {
          name: po.clientName,
          orderCount: 0,
          totalValue: 0
        };
      }
      stats.topClients[po.clientName].orderCount++;
      stats.topClients[po.clientName].totalValue += po.totalAmount || 0;
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

  // Clear all data (for development/testing)
  const clearAllPurchaseOrders = useCallback(() => {
    if (window.confirm('Are you sure you want to clear all purchase orders? This cannot be undone.')) {
      setPurchaseOrders([]);
      localStorage.removeItem('purchaseOrders');
      return { success: true };
    }
    return { success: false };
  }, []);

  // Load data on mount
  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

  // Return all functions and data
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
    refetch: loadPurchaseOrders,
    clearAllPurchaseOrders
  };
};
