// src/hooks/useProducts.js
import { useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp 
} from 'firebase/firestore';

// ✅ ADDED: Helper function to clean undefined values
const cleanFormDataForFirestore = (data) => {
  const cleaned = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Skip undefined values completely
    if (value !== undefined) {
      // Handle different data types
      if (value === null) {
        cleaned[key] = null; // Firestore accepts null
      } else if (Array.isArray(value)) {
        // Clean arrays of undefined values
        const cleanedArray = value.filter(item => item !== undefined);
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively clean nested objects
        const cleanedObject = cleanFormDataForFirestore(value);
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

export const useProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Firestore real-time listener
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const productsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(productsData);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore error:', error);
        setError('Failed to load products');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const addProduct = async (productData) => {
    try {
      // ✅ FIXED: Clean undefined values before adding
      const cleanedData = cleanFormDataForFirestore(productData);
      
      const newProduct = {
        ...cleanedData,
        createdAt: new Date().toISOString(), // ✅ Use ISO string instead of serverTimestamp
        updatedAt: new Date().toISOString()
      };
      
      console.log('🚨 addProduct: Final data for Firestore:', newProduct);
      
      const docRef = await addDoc(collection(db, 'products'), newProduct);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error adding product:', error);
      return { success: false, error: error.message };
    }
  };

  // ✅ CRITICAL FIX: Updated updateProduct function
  const updateProduct = async (id, productData) => {
    try {
      console.log('🚨 updateProduct received data:', productData);
      
      // ✅ CRITICAL FIX: Clean the data before Firestore update
      const cleanedData = cleanFormDataForFirestore(productData);
      
      // Add updatedAt timestamp
      cleanedData.updatedAt = new Date().toISOString(); // ✅ Use ISO string instead of serverTimestamp
      
      console.log('🚨 updateProduct cleaned data:', cleanedData);
      
      // ✅ FINAL CHECK: Remove any remaining undefined values (extra safety)
      Object.keys(cleanedData).forEach(key => {
        if (cleanedData[key] === undefined) {
          delete cleanedData[key];
          console.log(`🧹 updateProduct: Removed undefined field: ${key}`);
        }
      });
      
      console.log('🚨 Final data being sent to Firestore:', cleanedData);
      
      await updateDoc(doc(db, 'products', id), cleanedData);
      
      console.log('✅ updateProduct: Firestore update successful');
      return { success: true };
    } catch (error) {
      console.error('🚨 Error in updateProduct:', error);
      console.error('🚨 Product ID:', id);
      console.error('🚨 Original productData:', productData);
      return { success: false, error: error.message };
    }
  };

  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      return { success: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }
  };

  const getProductById = (id) => {
    return products.find(product => product.id === id);
  };

  const getProductsBySupplierId = (supplierId) => {
    return products.filter(product => product.supplierId === supplierId);
  };

  const getLowStockProducts = (threshold = 10) => {
    return products.filter(product => (product.currentStock || product.stock || 0) <= threshold);
  };

  // ✅ FIXED: updateProductStock function also cleaned
  const updateProductStock = async (id, stockChange, type = 'add') => {
    try {
      const product = getProductById(id);
      if (!product) throw new Error('Product not found');
      
      const currentStock = product.currentStock || product.stock || 0;
      const newStock = type === 'add' 
        ? currentStock + stockChange 
        : currentStock - stockChange;
      
      if (newStock < 0) throw new Error('Insufficient stock');
      
      // ✅ FIXED: Use cleaned data for stock update
      const stockUpdate = {
        currentStock: newStock,
        stock: newStock, // Keep both fields in sync
        updatedAt: new Date().toISOString()
      };
      
      await updateProduct(id, stockUpdate);
      return { success: true, newStock };
    } catch (error) {
      console.error('Error updating stock:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getProductsBySupplierId,
    getLowStockProducts,
    updateProductStock
  };
};
