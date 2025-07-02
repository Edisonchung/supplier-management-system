// src/hooks/useProducts.js
import { useState, useEffect } from 'react';
import { mockFirebase } from '../services/firebase';

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await mockFirebase.firestore.collection('products').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData) => {
    try {
      const newProduct = {
        ...productData,
        dateAdded: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await mockFirebase.firestore.collection('products').add(newProduct);
      await loadProducts();
      
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProduct = async (id, productData) => {
    try {
      await mockFirebase.firestore.collection('products').doc(id).update({
        ...productData,
        updatedAt: new Date().toISOString()
      });
      
      await loadProducts();
      return { success: true };
    } catch (error) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
    }
  };

  const updateProductStock = async (id, quantityChange) => {
    try {
      const product = products.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      
      const newStock = product.stock + quantityChange;
      
      await mockFirebase.firestore.collection('products').doc(id).update({
        stock: newStock,
        updatedAt: new Date().toISOString()
      });
      
      await loadProducts();
      return { success: true, newStock };
    } catch (error) {
      console.error('Error updating product stock:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteProduct = async (id) => {
    try {
      await mockFirebase.firestore.collection('products').doc(id).delete();
      await loadProducts();
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }
  };

  const getProductById = (id) => {
    return products.find(product => product.id === id);
  };

  const getProductsBySupplier = (supplierId) => {
    return products.filter(product => product.supplierId === supplierId);
  };

  const getLowStockProducts = () => {
    return products.filter(product => product.stock <= product.minStock);
  };

  const getProductsByCategory = (category) => {
    return products.filter(product => product.category === category);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    updateProductStock,
    deleteProduct,
    getProductById,
    getProductsBySupplier,
    getLowStockProducts,
    getProductsByCategory,
    refetch: loadProducts
  };
};
