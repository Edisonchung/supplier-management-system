// src/context/UnifiedDataContext.jsx
// 🔥 ENHANCED VERSION: Real-time Firestore + localStorage fallback
import React, { createContext, useContext, useReducer, useCallback, useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Enhanced Storage Service with Firestore + localStorage
const StorageService = {
  // Data source preference
  getDataSource: () => localStorage.getItem('dataSource') || 'localStorage',
  setDataSource: (source) => localStorage.setItem('dataSource', source),
  
  // Firestore operations
  async saveToFirestore(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error(`Firestore save error (${collectionName}):`, error);
      return { success: false, error: error.message };
    }
  },
  
  async updateInFirestore(collectionName, id, updates) {
    try {
      await updateDoc(doc(db, collectionName, id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error(`Firestore update error (${collectionName}):`, error);
      return { success: false, error: error.message };
    }
  },
  
  async deleteFromFirestore(collectionName, id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (error) {
      console.error(`Firestore delete error (${collectionName}):`, error);
      return { success: false, error: error.message };
    }
  },
  
  // localStorage operations (fallback)
  async saveToLocalStorage(key, data) {
    try {
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      const updated = { ...existing, ...data };
      localStorage.setItem(key, JSON.stringify(updated));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  async getFromLocalStorage(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch (error) {
      return {};
    }
  }
};

// Enhanced Action Types
const ACTION_TYPES = {
  // Data source management
  SET_DATA_SOURCE: 'SET_DATA_SOURCE',
  SET_MIGRATION_STATUS: 'SET_MIGRATION_STATUS',
  
  // Real-time data updates
  SET_DELIVERY_TRACKING: 'SET_DELIVERY_TRACKING',
  UPDATE_DELIVERY_STATUS: 'UPDATE_DELIVERY_STATUS',
  SET_PAYMENT_TRACKING: 'SET_PAYMENT_TRACKING',
  UPDATE_PAYMENT_STATUS: 'UPDATE_PAYMENT_STATUS',
  
  // Purchase Orders
  SET_PURCHASE_ORDERS: 'SET_PURCHASE_ORDERS',
  ADD_PURCHASE_ORDER: 'ADD_PURCHASE_ORDER',
  UPDATE_PURCHASE_ORDER: 'UPDATE_PURCHASE_ORDER',
  DELETE_PURCHASE_ORDER: 'DELETE_PURCHASE_ORDER',
  
  // Loading and error states
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Cache management
  SET_CACHE: 'SET_CACHE',
  CLEAR_CACHE: 'CLEAR_CACHE'
};

// Enhanced Initial State
const initialState = {
  // Data source configuration
  dataSource: StorageService.getDataSource(),
  migrationStatus: {
    inProgress: false,
    completed: false,
    errors: []
  },
  
  // Real-time tracking data
  deliveryTracking: {},
  paymentTracking: {},
  
  // Core entities
  purchaseOrders: [],
  
  // State management
  loading: {},
  errors: {},
  lastSync: null,
  
  // Cache with TTL
  cache: {
    data: {},
    timestamps: {},
    staleDuration: 5 * 60 * 1000 // 5 minutes
  }
};

// Enhanced Reducer
function unifiedDataReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_DATA_SOURCE:
      return {
        ...state,
        dataSource: action.payload,
        lastSync: new Date().toISOString()
      };
      
    case ACTION_TYPES.SET_MIGRATION_STATUS:
      return {
        ...state,
        migrationStatus: { ...state.migrationStatus, ...action.payload }
      };
      
    case ACTION_TYPES.SET_DELIVERY_TRACKING:
      return {
        ...state,
        deliveryTracking: action.payload,
        lastSync: new Date().toISOString()
      };
      
    case ACTION_TYPES.UPDATE_DELIVERY_STATUS:
      return {
        ...state,
        deliveryTracking: {
          ...state.deliveryTracking,
          [action.payload.poId]: {
            ...state.deliveryTracking[action.payload.poId],
            ...action.payload.updates,
            lastUpdated: new Date().toISOString()
          }
        }
      };
      
    case ACTION_TYPES.SET_PAYMENT_TRACKING:
      return {
        ...state,
        paymentTracking: action.payload,
        lastSync: new Date().toISOString()
      };
      
    case ACTION_TYPES.UPDATE_PAYMENT_STATUS:
      return {
        ...state,
        paymentTracking: {
          ...state.paymentTracking,
          [action.payload.supplierId]: {
            ...state.paymentTracking[action.payload.supplierId],
            ...action.payload.updates,
            lastUpdated: new Date().toISOString()
          }
        }
      };
      
    case ACTION_TYPES.SET_PURCHASE_ORDERS:
      return {
        ...state,
        purchaseOrders: action.payload
      };
      
    case ACTION_TYPES.ADD_PURCHASE_ORDER:
      return {
        ...state,
        purchaseOrders: [...state.purchaseOrders, action.payload]
      };
      
    case ACTION_TYPES.UPDATE_PURCHASE_ORDER:
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.map(po =>
          po.id === action.payload.id ? { ...po, ...action.payload.updates } : po
        )
      };
      
    case ACTION_TYPES.DELETE_PURCHASE_ORDER:
      return {
        ...state,
        purchaseOrders: state.purchaseOrders.filter(po => po.id !== action.payload.id)
      };
      
    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
      
    case ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error }
      };
      
    case ACTION_TYPES.CLEAR_ERROR:
      const { [action.payload.key]: removed, ...restErrors } = state.errors;
      return {
        ...state,
        errors: restErrors
      };
      
    case ACTION_TYPES.SET_CACHE:
      return {
        ...state,
        cache: {
          ...state.cache,
          data: { ...state.cache.data, [action.payload.key]: action.payload.data },
          timestamps: { ...state.cache.timestamps, [action.payload.key]: Date.now() }
        }
      };
      
    case ACTION_TYPES.CLEAR_CACHE:
      return {
        ...state,
        cache: initialState.cache
      };
      
    default:
      return state;
  }
}

// Create Context
const UnifiedDataContext = createContext();

// Enhanced Provider Component
export function UnifiedDataProvider({ children }) {
  const [state, dispatch] = useReducer(unifiedDataReducer, initialState);
  const { user } = useAuth();
  const [realtimeSubscriptions, setRealtimeSubscriptions] = useState({});

  // Set up real-time subscriptions when data source changes to Firestore
  useEffect(() => {
    if (state.dataSource === 'firestore' && user) {
      setupRealtimeSubscriptions();
    } else {
      cleanupSubscriptions();
      // Load from localStorage when not using Firestore
      loadFromLocalStorage();
    }
    
    return () => cleanupSubscriptions();
  }, [state.dataSource, user]);

  const setupRealtimeSubscriptions = useCallback(() => {
    console.log('🔥 Setting up Firestore real-time subscriptions...');
    
    try {
      // Delivery Tracking Subscription
      const deliveryQuery = query(
        collection(db, 'deliveryTracking'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribeDelivery = onSnapshot(deliveryQuery, (snapshot) => {
        const deliveryData = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          deliveryData[data.poId] = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          };
        });
        
        dispatch({
          type: ACTION_TYPES.SET_DELIVERY_TRACKING,
          payload: deliveryData
        });
        
        console.log('📦 Delivery tracking updated:', Object.keys(deliveryData).length, 'items');
      }, (error) => {
        console.error('Delivery tracking subscription error:', error);
        toast.error('Lost connection to delivery tracking');
      });
      
      // Payment Tracking Subscription
      const paymentQuery = query(
        collection(db, 'paymentTracking'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribePayment = onSnapshot(paymentQuery, (snapshot) => {
        const paymentData = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          paymentData[data.supplierId] = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          };
        });
        
        dispatch({
          type: ACTION_TYPES.SET_PAYMENT_TRACKING,
          payload: paymentData
        });
        
        console.log('💰 Payment tracking updated:', Object.keys(paymentData).length, 'items');
      }, (error) => {
        console.error('Payment tracking subscription error:', error);
        toast.error('Lost connection to payment tracking');
      });
      
      // Purchase Orders Subscription
      const poQuery = query(
        collection(db, 'purchaseOrders'),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribePO = onSnapshot(poQuery, (snapshot) => {
        const poData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
        }));
        
        dispatch({
          type: ACTION_TYPES.SET_PURCHASE_ORDERS,
          payload: poData
        });
        
        console.log('📋 Purchase orders updated:', poData.length, 'items');
      }, (error) => {
        console.error('Purchase orders subscription error:', error);
        toast.error('Lost connection to purchase orders');
      });
      
      // Store subscriptions for cleanup
      setRealtimeSubscriptions({
        delivery: unsubscribeDelivery,
        payment: unsubscribePayment,
        purchaseOrders: unsubscribePO
      });
      
      toast.success('🔥 Real-time sync activated!', { duration: 2000 });
      
    } catch (error) {
      console.error('Failed to setup real-time subscriptions:', error);
      toast.error('Failed to connect to real-time updates');
    }
  }, [user]);

  const cleanupSubscriptions = useCallback(() => {
    Object.values(realtimeSubscriptions).forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    setRealtimeSubscriptions({});
  }, [realtimeSubscriptions]);

  const loadFromLocalStorage = useCallback(async () => {
    try {
      const deliveryData = await StorageService.getFromLocalStorage('deliveryTracking');
      const paymentData = await StorageService.getFromLocalStorage('paymentTracking');
      
      dispatch({
        type: ACTION_TYPES.SET_DELIVERY_TRACKING,
        payload: deliveryData
      });
      
      dispatch({
        type: ACTION_TYPES.SET_PAYMENT_TRACKING,
        payload: paymentData
      });
      
      console.log('💾 Loaded data from localStorage');
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
    }
  }, []);

  // Data Source Management
  const switchDataSource = useCallback(async (newSource) => {
    if (newSource === state.dataSource) return;
    
    console.log(`🔄 Switching data source: ${state.dataSource} → ${newSource}`);
    
    dispatch({
      type: ACTION_TYPES.SET_DATA_SOURCE,
      payload: newSource
    });
    
    StorageService.setDataSource(newSource);
    
    if (newSource === 'firestore') {
      toast.success('Switched to real-time Firestore!');
    } else {
      toast.success('Switched to local storage');
    }
  }, [state.dataSource]);

  // Enhanced Delivery Tracking
  const updateDeliveryStatus = useCallback(async (poId, updates) => {
    console.log('📦 Updating delivery status:', { poId, updates });
    
    // Optimistic update
    dispatch({
      type: ACTION_TYPES.UPDATE_DELIVERY_STATUS,
      payload: { poId, updates }
    });
    
    try {
      if (state.dataSource === 'firestore') {
        // Find the document for this PO
        const deliveryDoc = Object.values(state.deliveryTracking).find(d => d.poId === poId);
        
        if (deliveryDoc) {
          const result = await StorageService.updateInFirestore('deliveryTracking', deliveryDoc.id, updates);
          if (!result.success) throw new Error(result.error);
        } else {
          // Create new delivery tracking document
          const result = await StorageService.saveToFirestore('deliveryTracking', {
            poId,
            ...updates,
            createdBy: user?.uid
          });
          if (!result.success) throw new Error(result.error);
        }
      } else {
        // Save to localStorage
        const currentData = await StorageService.getFromLocalStorage('deliveryTracking');
        const updated = {
          ...currentData,
          [poId]: {
            ...currentData[poId],
            ...updates,
            lastUpdated: new Date().toISOString()
          }
        };
        await StorageService.saveToLocalStorage('deliveryTracking', updated);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      toast.error(`Failed to update delivery status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [state.dataSource, state.deliveryTracking, user]);

  // Enhanced Payment Tracking
  const updatePaymentStatus = useCallback(async (supplierId, updates) => {
    console.log('💰 Updating payment status:', { supplierId, updates });
    
    // Optimistic update
    dispatch({
      type: ACTION_TYPES.UPDATE_PAYMENT_STATUS,
      payload: { supplierId, updates }
    });
    
    try {
      if (state.dataSource === 'firestore') {
        // Find the document for this supplier
        const paymentDoc = Object.values(state.paymentTracking).find(p => p.supplierId === supplierId);
        
        if (paymentDoc) {
          const result = await StorageService.updateInFirestore('paymentTracking', paymentDoc.id, updates);
          if (!result.success) throw new Error(result.error);
        } else {
          // Create new payment tracking document
          const result = await StorageService.saveToFirestore('paymentTracking', {
            supplierId,
            ...updates,
            createdBy: user?.uid
          });
          if (!result.success) throw new Error(result.error);
        }
      } else {
        // Save to localStorage
        const currentData = await StorageService.getFromLocalStorage('paymentTracking');
        const updated = {
          ...currentData,
          [supplierId]: {
            ...currentData[supplierId],
            ...updates,
            lastUpdated: new Date().toISOString()
          }
        };
        await StorageService.saveToLocalStorage('paymentTracking', updated);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error(`Failed to update payment status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [state.dataSource, state.paymentTracking, user]);

  // Firestore Migration Function
  const migrateToFirestore = useCallback(async () => {
    if (state.dataSource === 'firestore') {
      toast.error('Already using Firestore');
      return { success: false, error: 'Already using Firestore' };
    }
    
    dispatch({
      type: ACTION_TYPES.SET_MIGRATION_STATUS,
      payload: { inProgress: true, completed: false, errors: [] }
    });
    
    try {
      console.log('🚀 Starting Firestore migration...');
      toast.loading('Migrating to Firestore...', { id: 'migration' });
      
      const batch = writeBatch(db);
      let migrationCount = 0;
      
      // Migrate delivery tracking
      const deliveryData = await StorageService.getFromLocalStorage('deliveryTracking');
      Object.entries(deliveryData).forEach(([poId, data]) => {
        const docRef = doc(collection(db, 'deliveryTracking'));
        batch.set(docRef, {
          poId,
          ...data,
          migratedAt: serverTimestamp(),
          createdBy: user?.uid
        });
        migrationCount++;
      });
      
      // Migrate payment tracking
      const paymentData = await StorageService.getFromLocalStorage('paymentTracking');
      Object.entries(paymentData).forEach(([supplierId, data]) => {
        const docRef = doc(collection(db, 'paymentTracking'));
        batch.set(docRef, {
          supplierId,
          ...data,
          migratedAt: serverTimestamp(),
          createdBy: user?.uid
        });
        migrationCount++;
      });
      
      // Execute batch
      await batch.commit();
      
      dispatch({
        type: ACTION_TYPES.SET_MIGRATION_STATUS,
        payload: { inProgress: false, completed: true, errors: [] }
      });
      
      // Switch to Firestore
      await switchDataSource('firestore');
      
      toast.success(`✅ Migrated ${migrationCount} items to Firestore!`, { id: 'migration' });
      
      return { success: true, migrated: migrationCount };
    } catch (error) {
      console.error('Migration failed:', error);
      
      dispatch({
        type: ACTION_TYPES.SET_MIGRATION_STATUS,
        payload: { 
          inProgress: false, 
          completed: false, 
          errors: [error.message] 
        }
      });
      
      toast.error(`Migration failed: ${error.message}`, { id: 'migration' });
      
      return { success: false, error: error.message };
    }
  }, [state.dataSource, user, switchDataSource]);

  // Context Value
  const value = {
    // State
    ...state,
    
    // Data Source Management
    switchDataSource,
    migrateToFirestore,
    
    // Tracking Operations
    updateDeliveryStatus,
    updatePaymentStatus,
    
    // Utility
    isLoading: (key) => state.loading[key] || false,
    getError: (key) => state.errors[key] || null,
    clearError: (key) => dispatch({ type: ACTION_TYPES.CLEAR_ERROR, payload: { key } }),
    
    // Real-time status
    isRealTimeActive: state.dataSource === 'firestore' && Object.keys(realtimeSubscriptions).length > 0,
    lastSync: state.lastSync
  };

  return (
    <UnifiedDataContext.Provider value={value}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

// Enhanced Hooks
export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
}

export function useDeliveryTracking() {
  const { deliveryTracking, updateDeliveryStatus, isRealTimeActive } = useUnifiedData();
  
  return {
    deliveryTracking,
    updateDeliveryStatus,
    isRealTimeActive,
    getDeliveryStatus: (poId) => deliveryTracking[poId] || null
  };
}

export function usePaymentTracking() {
  const { paymentTracking, updatePaymentStatus, isRealTimeActive } = useUnifiedData();
  
  return {
    paymentTracking,
    updatePaymentStatus,
    isRealTimeActive,
    getPaymentStatus: (supplierId) => paymentTracking[supplierId] || null
  };
}
