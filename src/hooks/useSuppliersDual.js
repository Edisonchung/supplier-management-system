// src/hooks/useSuppliersDual.js
import { useState, useEffect } from 'react';
import { suppliersService } from '../services/firestore/suppliers.service';
import { mockFirebase } from '../services/firebase';

export const useSuppliersDual = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState('localStorage'); // 'localStorage' or 'firestore'
  
  // Initialize unsubscribe function
  let unsubscribe = null;

  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribe) {
      unsubscribe();
    }

    if (dataSource === 'firestore') {
      loadFirestoreData();
    } else {
      loadLocalStorageData();
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
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
      // Set up real-time listener
      unsubscribe = suppliersService.subscribe(
        (suppliersData) => {
          setSuppliers(suppliersData);
          setLoading(false);
        },
        (err) => {
          console.error('Firestore error:', err);
          setError(err.message);
          setLoading(false);
          // Optionally fallback to localStorage
          if (err.code === 'permission-denied') {
            console.log('Falling back to localStorage due to permissions');
            setDataSource('localStorage');
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
    try {
      if (dataSource === 'firestore') {
        const docId = await suppliersService.create(supplierData);
        
        // Also save to localStorage as backup
        await mockFirebase.firestore.collection('suppliers').add({
          ...supplierData,
          dateAdded: new Date().toISOString()
        });
        
        return docId;
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
    try {
      if (dataSource === 'firestore') {
        await suppliersService.update(id, updates);
        
        // Also update localStorage backup
        await mockFirebase.firestore.collection('suppliers').doc(id).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
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
    try {
      if (dataSource === 'firestore') {
        await suppliersService.delete(id);
        
        // Also delete from localStorage backup
        await mockFirebase.firestore.collection('suppliers').doc(id).delete();
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

  // Migration helper
  const migrateToFirestore = async () => {
    if (dataSource !== 'localStorage') {
      setError('Already using Firestore');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const snapshot = await mockFirebase.firestore.collection('suppliers').get();
      const localSuppliers = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      let migrated = 0;
      let failed = 0;

      for (const supplier of localSuppliers) {
        try {
          const { id, ...supplierData } = supplier;
          await suppliersService.create(supplierData);
          migrated++;
        } catch (err) {
          console.error(`Failed to migrate supplier ${supplier.id}:`, err);
          failed++;
        }
      }

      console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
      
      // Switch to Firestore after migration
      setDataSource('firestore');
      
      return { migrated, failed };
    } catch (err) {
      console.error('Migration error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load saved preference on mount
  useEffect(() => {
    const savedSource = localStorage.getItem('preferredDataSource');
    if (savedSource && (savedSource === 'localStorage' || savedSource === 'firestore')) {
      setDataSource(savedSource);
    }
  }, []);

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
    refetch: dataSource === 'firestore' ? loadFirestoreData : loadLocalStorageData
  };
};
