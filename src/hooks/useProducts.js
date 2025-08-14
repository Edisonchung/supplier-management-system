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
  // 🎯 PRODUCTION VERSION: Keep the aggressive cleaning but reduce debug logging

const updateProduct = async (id, productData) => {
  try {
    // ✅ AGGRESSIVE FIX: Convert to JSON and back to remove undefined values completely
    const jsonString = JSON.stringify(productData, (key, value) => {
      if (value === undefined) {
        console.log(`🧹 Cleaning undefined value for key: ${key}`); // Keep minimal logging
        return null;
      }
      return value;
    });
    
    // Parse back and remove null values
    const parsedData = JSON.parse(jsonString);
    
    // ✅ DEEP CLEAN: Recursively remove null values and empty objects
    const deepClean = (obj) => {
      if (Array.isArray(obj)) {
        return obj.map(deepClean).filter(item => item !== null && item !== undefined);
      } else if (obj && typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          if (value !== null && value !== undefined) {
            if (typeof value === 'object' && value !== null) {
              const cleanedValue = deepClean(value);
              if (Array.isArray(cleanedValue) ? cleanedValue.length > 0 : Object.keys(cleanedValue).length > 0) {
                cleaned[key] = cleanedValue;
              }
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      }
      return obj;
    };
    
    const cleanedData = deepClean(parsedData);
    cleanedData.updatedAt = new Date().toISOString();
    
    // ✅ SAFE DATA CONSTRUCTION: Manual construction for critical fields
    const safeData = {
      // Core product fields
      name: cleanedData.name || '',
      brand: cleanedData.brand || '',
      category: cleanedData.category || '',
      description: cleanedData.description || '',
      price: typeof cleanedData.price === 'number' ? cleanedData.price : 0,
      stock: typeof cleanedData.stock === 'number' ? cleanedData.stock : 0,
      minStock: typeof cleanedData.minStock === 'number' ? cleanedData.minStock : 1,
      partNumber: cleanedData.partNumber || '',
      sku: cleanedData.sku || '',
      status: cleanedData.status || 'active',
      supplierId: cleanedData.supplierId || '',
      
      // Optional fields - only add if they exist
      ...(cleanedData.manufacturerCode && { manufacturerCode: cleanedData.manufacturerCode }),
      ...(cleanedData.clientItemCode && { clientItemCode: cleanedData.clientItemCode }),
      ...(cleanedData.catalog && { catalog: cleanedData.catalog }),
      ...(cleanedData.photo && { photo: cleanedData.photo }),
      ...(cleanedData.notes && { notes: cleanedData.notes }),
      ...(cleanedData.source && { source: cleanedData.source }),
      ...(cleanedData.dateAdded && { dateAdded: cleanedData.dateAdded }),
      
      // AI Enhancement fields
      ...(typeof cleanedData.aiEnriched === 'boolean' && { aiEnriched: cleanedData.aiEnriched }),
      ...(typeof cleanedData.mcpEnhanced === 'boolean' && { mcpEnhanced: cleanedData.mcpEnhanced }),
      ...(typeof cleanedData.webEnhanced === 'boolean' && { webEnhanced: cleanedData.webEnhanced }),
      ...(typeof cleanedData.confidence === 'number' && { confidence: cleanedData.confidence }),
      ...(cleanedData.lastEnhanced && { lastEnhanced: cleanedData.lastEnhanced }),
      ...(cleanedData.enhancementSource && { enhancementSource: cleanedData.enhancementSource }),
      ...(cleanedData.selectedPromptId && { selectedPromptId: cleanedData.selectedPromptId }),
      
      // Complex objects - only add if they exist and have content
      ...(cleanedData.detectedSpecs && Object.keys(cleanedData.detectedSpecs).length > 0 && { 
        detectedSpecs: cleanedData.detectedSpecs 
      }),
      ...(cleanedData.mcpMetadata && Object.keys(cleanedData.mcpMetadata).length > 0 && { 
        mcpMetadata: cleanedData.mcpMetadata 
      }),
      ...(cleanedData.enhancementHistory && Array.isArray(cleanedData.enhancementHistory) && cleanedData.enhancementHistory.length > 0 && { 
        enhancementHistory: cleanedData.enhancementHistory 
      }),
      
      // Always add updatedAt
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(doc(db, 'products', id), safeData);
    
    console.log('✅ Product updated successfully'); // Keep success logging
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product:', error);
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
