// src/hooks/useSuppliers.js - Example of dual-mode implementation
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

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [useFirestore, setUseFirestore] = useState(true); // Toggle for testing

  useEffect(() => {
    if (useFirestore) {
      // Firestore real-time listener
      const q = query(collection(db, 'suppliers'), orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const suppliersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSuppliers(suppliersData);
          setLoading(false);
        },
        (error) => {
          console.error('Firestore error:', error);
          // Fallback to localStorage
          loadFromLocalStorage();
        }
      );

      return () => unsubscribe();
    } else {
      // localStorage mode
      loadFromLocalStorage();
    }
  }, [useFirestore]);

  const loadFromLocalStorage = () => {
    try {
      const localData = JSON.parse(localStorage.getItem('suppliers') || '[]');
      setSuppliers(localData);
    } catch (error) {
      console.error('localStorage error:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const addSupplier = async (supplierData) => {
    try {
      if (useFirestore) {
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'suppliers'), {
          ...supplierData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Also save to localStorage as backup
        const newSupplier = { id: docRef.id, ...supplierData };
        const localData = [...suppliers, newSupplier];
        localStorage.setItem('suppliers', JSON.stringify(localData));
        
        return docRef.id;
      } else {
        // Add to localStorage only
        const newSupplier = {
          id: `local-${Date.now()}`,
          ...supplierData,
          createdAt: new Date().toISOString()
        };
        const updatedSuppliers = [...suppliers, newSupplier];
        localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
        setSuppliers(updatedSuppliers);
        return newSupplier.id;
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      throw error;
    }
  };

  const updateSupplier = async (id, updates) => {
    try {
      if (useFirestore) {
        await updateDoc(doc(db, 'suppliers', id), {
          ...updates,
          updatedAt: serverTimestamp()
        });
      } else {
        const updatedSuppliers = suppliers.map(s => 
          s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        );
        localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
        setSuppliers(updatedSuppliers);
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  };

  const deleteSupplier = async (id) => {
    try {
      if (useFirestore) {
        await deleteDoc(doc(db, 'suppliers', id));
      } else {
        const updatedSuppliers = suppliers.filter(s => s.id !== id);
        localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
        setSuppliers(updatedSuppliers);
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  };

  return {
    suppliers,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    useFirestore,
    setUseFirestore // For testing toggle
  };
};
