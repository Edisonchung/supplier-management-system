// src/hooks/useClientPOsDual.js
import { useState, useEffect, useRef } from 'react';
import { clientPOService } from '../services/clientPOService';
import { mockFirebase } from '../services/firebase';

export const useClientPOsDual = () => {
  const [clientPOs, setClientPOs] = useState([]);
  const [sourcingRequired, setSourcingRequired] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataSource, setDataSource] = useState(() => {
    return localStorage.getItem('preferredDataSource') || 'localStorage';
  });
  
  const unsubscribeRef = useRef(null);
  const unsubscribeSourcingRef = useRef(null);

  useEffect(() => {
    if (dataSource === 'firestore') {
      loadFirestoreData();
    } else {
      loadLocalStorageData();
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (unsubscribeSourcingRef.current) {
        unsubscribeSourcingRef.current();
      }
    };
  }, [dataSource]);

  const loadLocalStorageData = async () => {
    setLoading(true);
    try {
      const snapshot = await mockFirebase.firestore.collection('clientPurchaseOrders').get();
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClientPOs(data);
      
      // Filter sourcing required
      const sourcingData = data.filter(po => 
        po.sourcingStatus === 'pending' || po.sourcingStatus === 'partial'
      );
      setSourcingRequired(sourcingData);
      
      setError(null);
    } catch (err) {
      console.error('Error loading localStorage data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadFirestoreData = () => {
    setLoading(true);
    setError(null);
    
    try {
      // Subscribe to all client POs
      unsubscribeRef.current = clientPOService.subscribe(
        (posData) => {
          setClientPOs(posData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore subscription error:', err);
          setError(err.message);
          setLoading(false);
          
          if (err.code === 'permission-denied') {
            console.log('Permission denied, falling back to localStorage');
            setDataSource('localStorage');
            localStorage.setItem('preferredDataSource', 'localStorage');
          }
        }
      );

      // Subscribe to sourcing required POs
      unsubscribeSourcingRef.current = clientPOService.subscribeSourcingRequired(
        (posData) => {
          setSourcingRequired(posData);
        },
        (err) => {
          console.error('Sourcing subscription error:', err);
        }
      );
    } catch (err) {
      console.error('Error setting up Firestore listeners:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const addClientPO = async (poData) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        const result = await clientPOService.create(poData);
        return { success: true, id: result.id };
      } else {
        const newPO = {
          ...poData,
          status: 'sourcing_required',
          sourcingStatus: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const docRef = await mockFirebase.firestore.collection('clientPurchaseOrders').add(newPO);
        await loadLocalStorageData();
        return { success: true, id: docRef.id };
      }
    } catch (err) {
      console.error('Error adding client PO:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateClientPO = async (id, updates) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        await clientPOService.update(id, updates);
        return { success: true };
      } else {
        await mockFirebase.firestore.collection('clientPurchaseOrders').doc(id).update({
          ...updates,
          updatedAt: new Date().toISOString()
        });
        await loadLocalStorageData();
        return { success: true };
      }
    } catch (err) {
      console.error('Error updating client PO:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const updateItemSourcing = async (poId, itemId, sourcingData) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        await clientPOService.updateItemSourcing(poId, itemId, sourcingData);
        return { success: true };
      } else {
        // Handle localStorage update
        const doc = await mockFirebase.firestore.collection('clientPurchaseOrders').doc(poId).get();
        const po = { id: doc.id, ...doc.data() };
        
        const updatedItems = po.items.map(item => 
          item.id === itemId 
            ? { ...item, sourcing: sourcingData, sourcingStatus: 'sourced' }
            : item
        );
        
        const allSourced = updatedItems.every(item => item.sourcingStatus === 'sourced');
        const someSourced = updatedItems.some(item => item.sourcingStatus === 'sourced');
        const sourcingStatus = allSourced ? 'complete' : someSourced ? 'partial' : 'pending';
        
        await updateClientPO(poId, { items: updatedItems, sourcingStatus });
        return { success: true };
      }
    } catch (err) {
      console.error('Error updating item sourcing:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const deleteClientPO = async (id) => {
    setError(null);
    try {
      if (dataSource === 'firestore') {
        await clientPOService.delete(id);
        return { success: true };
      } else {
        await mockFirebase.firestore.collection('clientPurchaseOrders').doc(id).delete();
        await loadLocalStorageData();
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting client PO:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const toggleDataSource = () => {
    const newSource = dataSource === 'localStorage' ? 'firestore' : 'localStorage';
    setDataSource(newSource);
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
      const snapshot = await mockFirebase.firestore.collection('clientPurchaseOrders').get();
      const localPOs = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));

      let migrated = 0;
      let failed = 0;
      const errors = [];

      for (const po of localPOs) {
        try {
          const { id, ...poData } = po;
          await clientPOService.create(poData);
          migrated++;
        } catch (err) {
          console.error(`Failed to migrate client PO ${po.id}:`, err);
          errors.push({ po: po.clientPONumber, error: err.message });
          failed++;
        }
      }

      console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);
      
      setDataSource('firestore');
      localStorage.setItem('preferredDataSource', 'firestore');
      
      return { migrated, failed, errors };
    } catch (err) {
      console.error('Migration error:', err);
      setError(err.message);
      return { migrated: 0, failed: 0, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    clientPOs,
    sourcingRequired,
    loading,
    error,
    dataSource,
    addClientPO,
    updateClientPO,
    updateItemSourcing,
    deleteClientPO,
    toggleDataSource,
    migrateToFirestore,
    refetch: dataSource === 'localStorage' ? loadLocalStorageData : null
  };
};
