// src/hooks/useFirestoreSuppliers.js
import { useState, useEffect } from 'react';
import { suppliersService } from '../services/firestore';
import { useAuth } from './useAuth';

export const useFirestoreSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = suppliersService.subscribe(
      [],
      (data) => {
        setSuppliers(data);
        setLoading(false);
      }
    );

    // Cleanup subscription
    return () => unsubscribe();
  }, [user]);

  const addSupplier = async (supplierData) => {
    try {
      const newSupplier = await suppliersService.create({
        ...supplierData,
        createdBy: user.uid
      });
      return newSupplier;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateSupplier = async (id, updates) => {
    try {
      const updated = await suppliersService.update(id, updates);
      return updated;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const deleteSupplier = async (id) => {
    try {
      await suppliersService.delete(id);
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getSupplierById = async (id) => {
    try {
      return await suppliersService.getById(id);
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  return {
    suppliers,
    loading,
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierById
  };
};

// src/hooks/useFirestoreProducts.js
import { useState, useEffect } from 'react';
import { productsService } from '../services/firestore';
import { useAuth } from './useAuth';

export const useFirestoreProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = productsService.subscribe(
      [],
      (data) => {
        setProducts(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addProduct = async (productData) => {
    try {
      // Get supplier name for denormalization
      const supplier = suppliers.find(s => s.id === productData.supplierId);
      
      const newProduct = await productsService.create({
        ...productData,
        supplierName: supplier?.name || '',
        createdBy: user.uid
      });
      return newProduct;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateProduct = async (id, updates) => {
    try {
      // If supplier is being updated, update supplier name too
      if (updates.supplierId) {
        const supplier = suppliers.find(s => s.id === updates.supplierId);
        updates.supplierName = supplier?.name || '';
      }
      
      const updated = await productsService.update(id, updates);
      return updated;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const deleteProduct = async (id) => {
    try {
      await productsService.delete(id);
      return true;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const updateStock = async (id, quantity, operation = 'set') => {
    try {
      const product = await productsService.getById(id);
      let newStock;
      
      switch (operation) {
        case 'add':
          newStock = product.stock + quantity;
          break;
        case 'subtract':
          newStock = Math.max(0, product.stock - quantity);
          break;
        default:
          newStock = quantity;
      }
      
      await productsService.updateStock(id, newStock);
      return newStock;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const getLowStockProducts = async () => {
    try {
      return await productsService.getLowStockProducts();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getLowStockProducts
  };
};

// src/hooks/useDataSource.js
// Wrapper hook to switch between localStorage and Firestore
import { useFirestoreSuppliers } from './useFirestoreSuppliers';
import { useSuppliers as useLocalSuppliers } from './useSuppliers';

export const useDataSource = (useFirestore = true) => {
  const firestoreData = useFirestoreSuppliers();
  const localData = useLocalSuppliers();
  
  return useFirestore ? firestoreData : localData;
};

// Example usage in a component
/*
const MyComponent = () => {
  // Toggle this to switch between localStorage and Firestore
  const useFirestore = true;
  const { suppliers, loading, addSupplier } = useDataSource(useFirestore);
  
  return (
    // Your component JSX
  );
};
*/
