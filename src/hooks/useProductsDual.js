// src/hooks/useProductsDual.js
import { useState, useEffect, useRef } from 'react';
import { productsService } from '../services/firestore/products.service';
import { mockFirebase } from '../services/firebase';
import { orderBy } from 'firebase/firestore';

export const useProductsDual = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(() => {
    // Initialize from localStorage preference
    return localStorage.getItem('preferredDataSource') || 'localStorage';
  });
  
  // Store unsubscribe function
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (dataSource === 'firestore') {
      loadFirestoreData();
    } else {
      loadLocalStorageData();
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [dataSource]);

  const loadLocalStorageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await mockFirebase.firestore.collection('products').get();
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      // Sort by createdAt
      data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateAdded || 0);
        const dateB = new Date(b.createdAt || b.dateAdded || 0);
        return dateB - dateA;
      });
      setProducts(data);
    } catch (err) {
      console.error('Error loading from localStorage:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFirestoreData = () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the subscribe method from the products service
      unsubscribeRef.current = productsService.subscribe(
        [orderBy('createdAt', 'desc')],
        (productsData) => {
          setProducts(productsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore subscription error:', err);
          setError(err.message);
          setLoading(false);
          
          // Handle permission errors by falling back to localStorage
          if (err.code === 'permission-denied') {
            console.log('Permission denied, falling back to localStorage');
            setDataSource('localStorage');
            localStorage.setItem('preferredDataSource', 'localStorage');
          }
        }
      );
    } catch (err) {
      console.error('Error setting up Firestore listener:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const addProduct = async (productData) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        // Add to Firestore only
        const result = await productsService.create(productData);
        return { success: true, id: result.id };
      } else {
        // localStorage only
        const newProduct = {
          ...productData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const docRef = await mockFirebase.firestore.collection('products').add(newProduct);
        await loadLocalStorageData(); // Refresh data
        return { success: true, id: docRef.id };
      }
    } catch (err) {
      console.error('Error adding product:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateProduct = async (id, updates) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        // Update in Firestore only
        await productsService.update(id, updates);
        return { success: true };
      } else {
        // localStorage only
        await mockFirebase.firestore.collection('products').doc(id).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        await loadLocalStorageData(); // Refresh data
        return { success: true };
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteProduct = async (id) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        // Delete from Firestore only
        await productsService.delete(id);
        return { success: true };
      } else {
        // localStorage only
        await mockFirebase.firestore.collection('products').doc(id).delete();
        await loadLocalStorageData(); // Refresh data
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateProductStock = async (id, stockChange, type = 'add') => {
    setError(null);
    try {
      const product = products.find(p => p.id === id);
      if (!product) throw new Error('Product not found');
      
      // Calculate new stock based on current field names
      const currentStock = product.stock || product.currentStock || 0;
      const newStock = type === 'add' 
        ? currentStock + stockChange 
        : currentStock - stockChange;
      
      if (newStock < 0) throw new Error('Insufficient stock');
      
      // Update with the correct field name
      const stockUpdate = product.hasOwnProperty('stock') 
        ? { stock: newStock }
        : { currentStock: newStock };
      
      if (dataSource === 'firestore') {
        await productsService.update(id, stockUpdate);
      } else {
        await mockFirebase.firestore.collection('products').doc(id).update({
          ...stockUpdate,
          updatedAt: new Date().toISOString()
        });
        await loadLocalStorageData();
      }
      
      return { success: true, newStock };
    } catch (err) {
      console.error('Error updating stock:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const toggleDataSource = () => {
    const newSource = dataSource === 'localStorage' ? 'firestore' : 'localStorage';
    setDataSource(newSource);
    // Save preference
    localStorage.setItem('preferredDataSource', newSource);
  };

  const migrateToFirestore = async () => {
    if (dataSource !== 'localStorage') {
      setError('Already using Firestore');
      return { migrated: 0, failed: 0 };
    }

    setLoading(true);
    setError(null);

    try {
      // Get all products from localStorage
      const snapshot = await mockFirebase.firestore.collection('products').get();
      const localProducts = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      let migrated = 0;
      let failed = 0;
      const errors = [];

      // Migrate each product
      for (const product of localProducts) {
        try {
          const { id, ...productData } = product;
          
          // Ensure proper field names and types
          const dataToMigrate = {
            ...productData,
            // Normalize stock field
            stock: productData.stock || productData.currentStock || 0,
            minStock: productData.minStock || productData.minStockLevel || 10,
            // Ensure dates
            createdAt: productData.createdAt || productData.dateAdded || new Date().toISOString(),
            updatedAt: productData.updatedAt || new Date().toISOString()
          };
          
          // Remove duplicate fields
          delete dataToMigrate.currentStock;
          delete dataToMigrate.minStockLevel;
          delete dataToMigrate.dateAdded;
          
          await productsService.create(dataToMigrate);
          migrated++;
        } catch (err) {
          console.error(`Failed to migrate product ${product.id}:`, err);
          errors.push({ product: product.name, error: err.message });
          failed++;
        }
      }

      console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
      if (errors.length > 0) {
        console.error('Migration errors:', errors);
      }
      
      // Switch to Firestore after migration
      setDataSource('firestore');
      localStorage.setItem('preferredDataSource', 'firestore');
      
      return { migrated, failed, errors };
    } catch (err) {
      console.error('Migration error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    if (dataSource === 'firestore') {
      // For Firestore, we're using real-time updates, so just ensure subscription is active
      if (!unsubscribeRef.current) {
        loadFirestoreData();
      }
    } else {
      await loadLocalStorageData();
    }
  };

  // Helper functions (same as in original useProducts)
  const getProductById = (id) => {
    return products.find(product => product.id === id);
  };

  const getProductsBySupplierId = (supplierId) => {
    return products.filter(product => product.supplierId === supplierId);
  };

  const getLowStockProducts = (threshold = 10) => {
    return products.filter(product => {
      const stock = product.stock || product.currentStock || 0;
      return stock <= threshold;
    });
  };

  return {
    products,
    loading,
    error,
    dataSource,
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductStock,
    getProductById,
    getProductsBySupplierId,
    getLowStockProducts,
    toggleDataSource,
    migrateToFirestore,
    refetch
  };
};
