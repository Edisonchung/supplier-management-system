// src/hooks/usePurchaseOrders.js
import { useState, useEffect } from 'react';

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      // Get data from localStorage
      const stored = localStorage.getItem('purchaseOrders');
      const data = stored ? JSON.parse(stored) : [];
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPurchaseOrder = async (data) => {
    const newOrder = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updated = [...purchaseOrders, newOrder];
    setPurchaseOrders(updated);
    localStorage.setItem('purchaseOrders', JSON.stringify(updated));
    return newOrder;
  };

  const updatePurchaseOrder = async (id, data) => {
    const updated = purchaseOrders.map(order => 
      order.id === id 
        ? { ...order, ...data, updatedAt: new Date().toISOString() }
        : order
    );
    setPurchaseOrders(updated);
    localStorage.setItem('purchaseOrders', JSON.stringify(updated));
    return updated.find(o => o.id === id);
  };

  const deletePurchaseOrder = async (id) => {
    const updated = purchaseOrders.filter(order => order.id !== id);
    setPurchaseOrders(updated);
    localStorage.setItem('purchaseOrders', JSON.stringify(updated));
  };

  useEffect(() => {
    loadPurchaseOrders();
  }, []);

  return {
    purchaseOrders,
    loading,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
  };
};
