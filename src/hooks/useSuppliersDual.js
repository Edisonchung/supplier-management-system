// src/hooks/useSuppliersDual.js
import { useState, useEffect, useRef } from 'react';
import { suppliersService } from '../services/firestore/suppliers.service';
import { mockFirebase } from '../services/firebase';
import { orderBy } from 'firebase/firestore';

export const useSuppliersDual = () => {
  const [suppliers, setSuppliers] = useState([]);
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
      const snapshot = await mockFirebase.firestore.collection('suppliers').get();
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      // Sort by createdAt or dateAdded
      data.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.dateAdded);
        const dateB = new Date(b.createdAt || b.dateAdded);
        return dateB - dateA;
      });
      setSuppliers(data);
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
      // Use the subscribe method from the base service
      unsubscribeRef.current = suppliersService.subscribe(
        [orderBy('createdAt', 'desc')],
        (suppliersData) => {
          setSuppliers(suppliersData);
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

  const addSupplier = async (supplierData) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        // Add to Firestore only - no localStorage backup needed
        const result = await suppliersService.create(supplierData);
        return result.id;
      } else {
        // localStorage only
        const result = await mockFirebase.firestore.collection('suppliers').add({
          ...supplierData,
          dateAdded: new Date().toISOString()
        });
        await loadLocalStorageData(); // Refresh data
        return result.id;
      }
    } catch (err) {
      console.error('Error adding supplier:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateSupplier = async (id, updates) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        // Update in Firestore only - no localStorage backup needed
        await suppliersService.update(id, updates);
      } else {
        // localStorage only
        await mockFirebase.firestore.collection('suppliers').doc(id).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        await loadLocalStorageData(); // Refresh data
      }
    } catch (err) {
      console.error('Error updating supplier:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteSupplier = async (id) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        // Delete from Firestore only - no localStorage backup needed
        await suppliersService.delete(id);
      } else {
        // localStorage only
        await mockFirebase.firestore.collection('suppliers').doc(id).delete();
        await loadLocalStorageData(); // Refresh data
      }
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError(err.message);
      throw err;
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
      // Get all suppliers from localStorage
      const snapshot = await mockFirebase.firestore.collection('suppliers').get();
      const localSuppliers = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      let migrated = 0;
      let failed = 0;
      const errors = [];

      // Migrate each supplier
      for (const supplier of localSuppliers) {
        try {
          const { id, ...supplierData } = supplier;
          
          // Ensure proper date fields
          const dataToMigrate = {
            ...supplierData,
            createdAt: supplierData.createdAt || supplierData.dateAdded || new Date().toISOString(),
            updatedAt: supplierData.updatedAt || new Date().toISOString()
          };
          
          // Remove dateAdded if it exists (use createdAt instead)
          delete dataToMigrate.dateAdded;
          
          await suppliersService.create(dataToMigrate);
          migrated++;
        } catch (err) {
          console.error(`Failed to migrate supplier ${supplier.id}:`, err);
          errors.push({ supplier: supplier.name, error: err.message });
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

  return {
    suppliers,
    loading,
    error,
    dataSource,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    toggleDataSource,
    migrateToFirestore,
    refetch
  };
};
