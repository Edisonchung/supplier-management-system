// src/components/purchase-orders/hooks/usePurchaseOrders.js
import { useState, useEffect } from 'react';
import { MockFirebase } from '../utils/mockFirebase';

const firebase = new MockFirebase('purchaseOrders');

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    const data = await firebase.getAll();
    setPurchaseOrders(data);
    setLoading(false);
  };

  const addPurchaseOrder = async (data) => {
    const newOrder = await firebase.add(data);
    setPurchaseOrders([...purchaseOrders, newOrder]);
    return newOrder;
  };

  const updatePurchaseOrder = async (id, data) => {
    const updated = await firebase.update(id, data);
    if (updated) {
      setPurchaseOrders(purchaseOrders.map(order => 
        order.id === id ? updated : order
      ));
    }
    return updated;
  };

  const deletePurchaseOrder = async (id) => {
    await firebase.delete(id);
    setPurchaseOrders(purchaseOrders.filter(order => order.id !== id));
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
