// src/context/UnifiedDataContext.jsx
// 🔥 ENHANCED VERSION: Your existing code + Smart Catalog Real Data Integration
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
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
  writeBatch,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

// Enhanced Action Types (keeping all your existing ones + Smart Catalog)
const ACTION_TYPES = {
  // Loading States
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Data Operations
  LOAD_DATA: 'LOAD_DATA',
  UPDATE_ENTITY: 'UPDATE_ENTITY',
  CREATE_ENTITY: 'CREATE_ENTITY',
  DELETE_ENTITY: 'DELETE_ENTITY',
  
  // Optimistic Updates
  OPTIMISTIC_UPDATE: 'OPTIMISTIC_UPDATE',
  REVERT_OPTIMISTIC: 'REVERT_OPTIMISTIC',
  
  // Cache Management
  SET_CACHE: 'SET_CACHE',
  INVALIDATE_CACHE: 'INVALIDATE_CACHE',
  
  // Tracking Specific
  UPDATE_DELIVERY_STATUS: 'UPDATE_DELIVERY_STATUS',
  UPDATE_PAYMENT_STATUS: 'UPDATE_PAYMENT_STATUS',
  SYNC_TRACKING_DATA: 'SYNC_TRACKING_DATA',
  
  // Firestore Management
  SET_DATA_SOURCE: 'SET_DATA_SOURCE',
  SET_MIGRATION_STATUS: 'SET_MIGRATION_STATUS',
  SET_REAL_TIME_STATUS: 'SET_REAL_TIME_STATUS',
  
  // 🔥 NEW: Smart Catalog Actions
  LOAD_CATALOG_PRODUCTS: 'LOAD_CATALOG_PRODUCTS',
  UPDATE_CATALOG_PRODUCT: 'UPDATE_CATALOG_PRODUCT',
  SET_CATALOG_FILTERS: 'SET_CATALOG_FILTERS',
  SET_SEARCH_RESULTS: 'SET_SEARCH_RESULTS',
  TRACK_USER_INTERACTION: 'TRACK_USER_INTERACTION',
  UPDATE_PERSONALIZATION: 'UPDATE_PERSONALIZATION',
  SET_CATALOG_PAGINATION: 'SET_CATALOG_PAGINATION',
  SYNC_CATALOG_WITH_INVENTORY: 'SYNC_CATALOG_WITH_INVENTORY',
  UPDATE_FACTORY_PROFILE: 'UPDATE_FACTORY_PROFILE'
};

// Enhanced Initial State (keeping all your existing structure + Smart Catalog)
const initialState = {
  // Core Data
  purchaseOrders: [],
  proformaInvoices: [],
  suppliers: [],
  products: [],
  
  // Tracking Data
  deliveryTracking: {},
  paymentTracking: {},
  
  // 🔥 NEW: Smart Catalog Data
  catalogProducts: [],
  featuredProducts: [],
  categories: [],
  searchResults: [],
  userInteractions: [],
  factoryProfiles: {},
  personalization: {
    recommendedProducts: [],
    viewHistory: [],
    searchHistory: [],
    preferences: {}
  },
  
  // Catalog Filters & Search
  catalogFilters: {
    category: '',
    priceRange: [0, 10000],
    availability: 'all',
    rating: 0,
    location: '',
    certifications: [],
    sortBy: 'relevance'
  },
  
  // Pagination
  catalogPagination: {
    currentPage: 1,
    pageSize: 24,
    totalProducts: 0,
    hasMore: true,
    lastDoc: null
  },
  
  // UI State
  loading: {
    global: false,
    purchaseOrders: false,
    deliveryTracking: false,
    paymentTracking: false,
    catalogProducts: false,
    searchResults: false,
    personalization: false
  },
  
  // Error State
  errors: {},
  
  // Cache
  cache: {
    lastSync: null,
    staleDuration: 5 * 60 * 1000, // 5 minutes
    data: {}
  },
  
  // Optimistic Updates
  optimisticUpdates: {},
  
  // Metadata
  metadata: {
    totalRecords: 0,
    lastModified: null,
    version: '2.0.0' // Updated version for Smart Catalog
  },
  
  // Firestore State
  dataSource: localStorage.getItem('dataSource') || 'localStorage',
  migrationStatus: {
    inProgress: false,
    completed: false,
    errors: []
  },
  realTimeStatus: {
    connected: false,
    lastSync: null,
    activeSubscriptions: 0
  }
};

// Enhanced Reducer (keeping all your existing cases + new Smart Catalog cases)
function unifiedDataReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value
        }
      };
      
    case ACTION_TYPES.SET_ERROR:
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.payload.key]: action.payload.error
        }
      };
      
    case ACTION_TYPES.CLEAR_ERROR:
      const newErrors = { ...state.errors };
      delete newErrors[action.payload.key];
      return {
        ...state,
        errors: newErrors
      };
      
    case ACTION_TYPES.LOAD_DATA:
      return {
        ...state,
        [action.payload.entityType]: action.payload.data,
        loading: {
          ...state.loading,
          [action.payload.entityType]: false
        },
        metadata: {
          ...state.metadata,
          lastModified: new Date().toISOString()
        }
      };
      
    case ACTION_TYPES.CREATE_ENTITY:
      return {
        ...state,
        [action.payload.entityType]: [
          ...state[action.payload.entityType],
          action.payload.data
        ],
        metadata: {
          ...state.metadata,
          totalRecords: state.metadata.totalRecords + 1,
          lastModified: new Date().toISOString()
        }
      };
      
    case ACTION_TYPES.UPDATE_ENTITY:
      return {
        ...state,
        [action.payload.entityType]: state[action.payload.entityType].map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        ),
        metadata: {
          ...state.metadata,
          lastModified: new Date().toISOString()
        }
      };
      
    case ACTION_TYPES.DELETE_ENTITY:
      return {
        ...state,
        [action.payload.entityType]: state[action.payload.entityType].filter(
          item => item.id !== action.payload.id
        ),
        metadata: {
          ...state.metadata,
          totalRecords: state.metadata.totalRecords - 1,
          lastModified: new Date().toISOString()
        }
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
      
    case ACTION_TYPES.OPTIMISTIC_UPDATE:
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          [action.payload.id]: {
            type: action.payload.type,
            originalData: action.payload.originalData,
            timestamp: Date.now()
          }
        },
        // Apply optimistic update immediately
        [action.payload.entityType]: state[action.payload.entityType].map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        )
      };
      
    case ACTION_TYPES.REVERT_OPTIMISTIC:
      const optimistic = state.optimisticUpdates[action.payload.id];
      if (!optimistic) return state;
      
      const newOptimisticUpdates = { ...state.optimisticUpdates };
      delete newOptimisticUpdates[action.payload.id];
      
      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates,
        [action.payload.entityType]: state[action.payload.entityType].map(item =>
          item.id === action.payload.id
            ? optimistic.originalData
            : item
        )
      };
      
    case ACTION_TYPES.SET_CACHE:
      return {
        ...state,
        cache: {
          ...state.cache,
          data: {
            ...state.cache.data,
            [action.payload.key]: {
              data: action.payload.data,
              timestamp: Date.now()
            }
          }
        }
      };
      
    case ACTION_TYPES.INVALIDATE_CACHE:
      const newCacheData = { ...state.cache.data };
      if (action.payload.key) {
        delete newCacheData[action.payload.key];
      } else {
        // Clear all cache
        Object.keys(newCacheData).forEach(key => delete newCacheData[key]);
      }
      
      return {
        ...state,
        cache: {
          ...state.cache,
          data: newCacheData
        }
      };
      
    // Firestore-specific actions
    case ACTION_TYPES.SET_DATA_SOURCE:
      return {
        ...state,
        dataSource: action.payload,
        metadata: {
          ...state.metadata,
          lastModified: new Date().toISOString()
        }
      };
      
    case ACTION_TYPES.SET_MIGRATION_STATUS:
      return {
        ...state,
        migrationStatus: { ...state.migrationStatus, ...action.payload }
      };
      
    case ACTION_TYPES.SET_REAL_TIME_STATUS:
      return {
        ...state,
        realTimeStatus: { ...state.realTimeStatus, ...action.payload }
      };
      
    // 🔥 NEW: Smart Catalog Actions
    case ACTION_TYPES.LOAD_CATALOG_PRODUCTS:
      return {
        ...state,
        catalogProducts: action.payload.append 
          ? [...state.catalogProducts, ...action.payload.products]
          : action.payload.products,
        loading: {
          ...state.loading,
          catalogProducts: false
        }
      };
      
    case ACTION_TYPES.UPDATE_CATALOG_PRODUCT:
      return {
        ...state,
        catalogProducts: state.catalogProducts.map(product =>
          product.id === action.payload.id
            ? { ...product, ...action.payload.updates }
            : product
        )
      };
      
    case ACTION_TYPES.SET_CATALOG_FILTERS:
      return {
        ...state,
        catalogFilters: { ...state.catalogFilters, ...action.payload }
      };
      
    case ACTION_TYPES.SET_SEARCH_RESULTS:
      return {
        ...state,
        searchResults: action.payload,
        loading: {
          ...state.loading,
          searchResults: false
        }
      };
      
    case ACTION_TYPES.TRACK_USER_INTERACTION:
      return {
        ...state,
        userInteractions: [action.payload, ...state.userInteractions.slice(0, 99)] // Keep last 100
      };
      
    case ACTION_TYPES.UPDATE_PERSONALIZATION:
      return {
        ...state,
        personalization: { ...state.personalization, ...action.payload },
        loading: {
          ...state.loading,
          personalization: false
        }
      };
      
    case ACTION_TYPES.SET_CATALOG_PAGINATION:
      return {
        ...state,
        catalogPagination: { ...state.catalogPagination, ...action.payload }
      };
      
    case ACTION_TYPES.UPDATE_FACTORY_PROFILE:
      return {
        ...state,
        factoryProfiles: {
          ...state.factoryProfiles,
          [action.payload.factoryId]: {
            ...state.factoryProfiles[action.payload.factoryId],
            ...action.payload.profile
          }
        }
      };
      
    default:
      return state;
  }
}

// Context
const UnifiedDataContext = createContext();

// Enhanced Storage Service (keeping your existing structure + Smart Catalog)
class StorageService {
  static getStorageKey(entityType) {
    return `higgsflow_${entityType}`;
  }
  
  static async loadData(entityType) {
    try {
      const stored = localStorage.getItem(this.getStorageKey(entityType));
      return stored ? JSON.parse(stored) : (entityType.includes('Tracking') ? {} : []);
    } catch (error) {
      console.error(`Error loading ${entityType}:`, error);
      return entityType.includes('Tracking') ? {} : [];
    }
  }
  
  static async saveData(entityType, data) {
    try {
      localStorage.setItem(this.getStorageKey(entityType), JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error saving ${entityType}:`, error);
      return false;
    }
  }
  
  static async batchSave(updates) {
    const results = {};
    for (const [entityType, data] of Object.entries(updates)) {
      results[entityType] = await this.saveData(entityType, data);
    }
    return results;
  }
  
  // Firestore operations
  static async saveToFirestore(collectionName, data) {
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
  }
  
  static async updateInFirestore(collectionName, id, updates) {
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
  }
  
  static async deleteFromFirestore(collectionName, id) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return { success: true };
    } catch (error) {
      console.error(`Firestore delete error (${collectionName}):`, error);
      return { success: false, error: error.message };
    }
  }
  
  // 🔥 NEW: Smart Catalog Firestore Operations
  static async searchCatalogProducts(searchParams) {
    try {
      const { 
        searchTerm, 
        category, 
        priceRange, 
        availability, 
        rating,
        limit: limitCount = 24,
        lastDoc = null 
      } = searchParams;
      
      let q = collection(db, 'catalogProducts');
      
      // Apply filters
      if (category && category !== 'all') {
        q = query(q, where('category', '==', category));
      }
      
      if (availability === 'in-stock') {
        q = query(q, where('stockQuantity', '>', 0));
      }
      
      if (rating > 0) {
        q = query(q, where('rating', '>=', rating));
      }
      
      // Apply sorting
      q = query(q, orderBy('updatedAt', 'desc'));
      
      // Apply pagination
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
      
      q = query(q, limit(limitCount));
      
      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
      }));
      
      return { 
        success: true, 
        products,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === limitCount
      };
    } catch (error) {
      console.error('Catalog search error:', error);
      return { success: false, error: error.message };
    }
  }
  
  static async trackUserInteraction(interaction) {
    try {
      await addDoc(collection(db, 'userInteractions'), {
        ...interaction,
        timestamp: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Interaction tracking error:', error);
      return { success: false, error: error.message };
    }
  }
  
  static async updateProductViews(productId) {
    try {
      const productRef = doc(db, 'catalogProducts', productId);
      await updateDoc(productRef, {
        viewCount: increment(1),
        lastViewed: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Product view update error:', error);
      return { success: false, error: error.message };
    }
  }
}

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
      if (state.dataSource === 'localStorage') {
        initializeLocalStorageData();
      }
    }
    
    return () => cleanupSubscriptions();
  }, [state.dataSource, user]);

  // Keep your existing initialization but make it conditional
  const initializeLocalStorageData = useCallback(async () => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { key: 'global', value: true } });
    
    try {
      const entityTypes = ['purchaseOrders', 'proformaInvoices', 'suppliers', 'products', 'catalogProducts'];
      const loadPromises = entityTypes.map(async (entityType) => {
        const data = await StorageService.loadData(entityType);
        dispatch({
          type: ACTION_TYPES.LOAD_DATA,
          payload: { entityType, data }
        });
      });
      
      // Load tracking data
      const deliveryTracking = await StorageService.loadData('deliveryTracking') || {};
      const paymentTracking = await StorageService.loadData('paymentTracking') || {};
      
      dispatch({
        type: ACTION_TYPES.LOAD_DATA,
        payload: { entityType: 'deliveryTracking', data: deliveryTracking }
      });
      
      dispatch({
        type: ACTION_TYPES.LOAD_DATA,
        payload: { entityType: 'paymentTracking', data: paymentTracking }
      });
      
      await Promise.all(loadPromises);
      
    } catch (error) {
      console.error('Error initializing data:', error);
      dispatch({
        type: ACTION_TYPES.SET_ERROR,
        payload: { key: 'global', error: 'Failed to load data' }
      });
    } finally {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { key: 'global', value: false } });
    }
  }, []);

  // Initialize data on mount (your existing logic)
  useEffect(() => {
    if (state.dataSource === 'localStorage') {
      initializeLocalStorageData();
    }
  }, []);

  // Real-time subscriptions setup
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
          type: ACTION_TYPES.LOAD_DATA,
          payload: { entityType: 'deliveryTracking', data: deliveryData }
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
          type: ACTION_TYPES.LOAD_DATA,
          payload: { entityType: 'paymentTracking', data: paymentData }
        });
        
        console.log('💰 Payment tracking updated:', Object.keys(paymentData).length, 'items');
      }, (error) => {
        console.error('Payment tracking subscription error:', error);
        toast.error('Lost connection to payment tracking');
      });
      
      // 🔥 NEW: Catalog Products Subscription
      const catalogQuery = query(
        collection(db, 'catalogProducts'),
        where('isActive', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(50) // Load first 50 products
      );
      
      const unsubscribeCatalog = onSnapshot(catalogQuery, (snapshot) => {
        const catalogData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
          updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || doc.data().updatedAt
        }));
        
        dispatch({
          type: ACTION_TYPES.LOAD_CATALOG_PRODUCTS,
          payload: { products: catalogData, append: false }
        });
        
        console.log('🛍️ Catalog products updated:', catalogData.length, 'items');
      }, (error) => {
        console.error('Catalog products subscription error:', error);
        toast.error('Lost connection to catalog updates');
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
          type: ACTION_TYPES.LOAD_DATA,
          payload: { entityType: 'purchaseOrders', data: poData }
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
        catalog: unsubscribeCatalog,
        purchaseOrders: unsubscribePO
      });
      
      dispatch({
        type: ACTION_TYPES.SET_REAL_TIME_STATUS,
        payload: { 
          connected: true, 
          lastSync: new Date().toISOString(),
          activeSubscriptions: 4
        }
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
    
    dispatch({
      type: ACTION_TYPES.SET_REAL_TIME_STATUS,
      payload: { 
        connected: false, 
        activeSubscriptions: 0
      }
    });
  }, [realtimeSubscriptions]);

  // Data Source Management
  const switchDataSource = useCallback(async (newSource) => {
    if (newSource === state.dataSource) return;
    
    console.log(`🔄 Switching data source: ${state.dataSource} → ${newSource}`);
    
    dispatch({
      type: ACTION_TYPES.SET_DATA_SOURCE,
      payload: newSource
    });
    
    localStorage.setItem('dataSource', newSource);
    
    if (newSource === 'firestore') {
      toast.success('Switched to real-time Firestore!');
    } else {
      toast.success('Switched to local storage');
    }
  }, [state.dataSource]);

  // Keep all your existing CRUD operations but enhance them for Firestore
  const createEntity = useCallback(async (entityType, data) => {
    const id = data.id || `${entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entity = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Optimistic update
    dispatch({
      type: ACTION_TYPES.CREATE_ENTITY,
      payload: { entityType, data: entity }
    });
    
    try {
      if (state.dataSource === 'firestore') {
        const result = await StorageService.saveToFirestore(entityType, entity);
        if (!result.success) throw new Error(result.error);
      } else {
        // Save to localStorage
        const success = await StorageService.saveData(entityType, [...state[entityType], entity]);
        if (!success) throw new Error('Storage failed');
      }
      
      toast.success(`${entityType.slice(0, -1)} created successfully`);
      return { success: true, data: entity };
    } catch (error) {
      toast.error(`Failed to create ${entityType.slice(0, -1)}`);
      return { success: false, error: error.message };
    }
  }, [state]);
  
  const updateEntity = useCallback(async (entityType, id, updates, useOptimistic = true) => {
    const originalData = state[entityType].find(item => item.id === id);
    if (!originalData) {
      return { success: false, error: 'Entity not found' };
    }
    
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    if (useOptimistic) {
      // Apply optimistic update
      dispatch({
        type: ACTION_TYPES.OPTIMISTIC_UPDATE,
        payload: {
          id,
          entityType,
          updates: updatedData,
          originalData,
          type: 'update'
        }
      });
    }
    
    try {
      if (state.dataSource === 'firestore') {
        // Find Firestore document and update
        const firestoreItem = state[entityType].find(item => item.id === id);
        if (firestoreItem?.firestoreId) {
          const result = await StorageService.updateInFirestore(entityType, firestoreItem.firestoreId, updatedData);
          if (!result.success) throw new Error(result.error);
        }
      } else {
        // Update localStorage
        const updatedArray = state[entityType].map(item =>
          item.id === id ? { ...item, ...updatedData } : item
        );
        
        const success = await StorageService.saveData(entityType, updatedArray);
        if (!success) throw new Error('Storage failed');
      }
      
      if (!useOptimistic) {
        dispatch({
          type: ACTION_TYPES.UPDATE_ENTITY,
          payload: { entityType, id, updates: updatedData }
        });
      }
      
      return { success: true, data: { ...originalData, ...updatedData } };
    } catch (error) {
      if (useOptimistic) {
        // Revert optimistic update
        dispatch({
          type: ACTION_TYPES.REVERT_OPTIMISTIC,
          payload: { id, entityType }
        });
      }
      
      toast.error(`Failed to update ${entityType.slice(0, -1)}`);
      return { success: false, error: error.message };
    }
  }, [state]);
  
  const deleteEntity = useCallback(async (entityType, id) => {
    // Optimistic update
    dispatch({
      type: ACTION_TYPES.DELETE_ENTITY,
      payload: { entityType, id }
    });
    
    try {
      if (state.dataSource === 'firestore') {
        const firestoreItem = state[entityType].find(item => item.id === id);
        if (firestoreItem?.firestoreId) {
          const result = await StorageService.deleteFromFirestore(entityType, firestoreItem.firestoreId);
          if (!result.success) throw new Error(result.error);
        }
      } else {
        const filteredArray = state[entityType].filter(item => item.id !== id);
        const success = await StorageService.saveData(entityType, filteredArray);
        if (!success) throw new Error('Storage failed');
      }
      
      toast.success(`${entityType.slice(0, -1)} deleted successfully`);
      return { success: true };
    } catch (error) {
      toast.error(`Failed to delete ${entityType.slice(0, -1)}`);
      return { success: false, error: error.message };
    }
  }, [state]);
  
  // Enhanced tracking operations with Firestore support
  const updateDeliveryStatus = useCallback(async (poId, updates) => {
    console.log('📦 Updating delivery status:', { poId, updates });
    
    // Optimistic update
    dispatch({
      type: ACTION_TYPES.UPDATE_DELIVERY_STATUS,
      payload: { poId, updates }
    });
    
    try {
      if (state.dataSource === 'firestore') {
        // Find the Firestore document for this PO
        const deliveryDoc = Object.values(state.deliveryTracking).find(d => d.poId === poId);
        
        if (deliveryDoc?.id) {
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
        // Update localStorage
        const newDeliveryTracking = {
          ...state.deliveryTracking,
          [poId]: {
            ...state.deliveryTracking[poId],
            ...updates,
            lastUpdated: new Date().toISOString()
          }
        };
        
        await StorageService.saveData('deliveryTracking', newDeliveryTracking);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update delivery status:', error);
      toast.error(`Failed to update delivery status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [state.dataSource, state.deliveryTracking, user]);
  
  const updatePaymentStatus = useCallback(async (supplierId, updates) => {
    console.log('💰 Updating payment status:', { supplierId, updates });
    
    // Optimistic update
    dispatch({
      type: ACTION_TYPES.UPDATE_PAYMENT_STATUS,
      payload: { supplierId, updates }
    });
    
    try {
      if (state.dataSource === 'firestore') {
        // Find the Firestore document for this supplier
        const paymentDoc = Object.values(state.paymentTracking).find(p => p.supplierId === supplierId);
        
        if (paymentDoc?.id) {
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
        // Update localStorage
        const newPaymentTracking = {
          ...state.paymentTracking,
          [supplierId]: {
            ...state.paymentTracking[supplierId],
            ...updates,
            lastUpdated: new Date().toISOString()
          }
        };
        
        await StorageService.saveData('paymentTracking', newPaymentTracking);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update payment status:', error);
      toast.error(`Failed to update payment status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [state.dataSource, state.paymentTracking, user]);

  // 🔥 NEW: Smart Catalog Functions
  const searchCatalogProducts = useCallback(async (searchParams) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { key: 'searchResults', value: true } });
    
    try {
      if (state.dataSource === 'firestore') {
        const result = await StorageService.searchCatalogProducts(searchParams);
        if (result.success) {
          dispatch({
            type: ACTION_TYPES.SET_SEARCH_RESULTS,
            payload: result.products
          });
          
          if (searchParams.searchTerm) {
            // Track search interaction
            trackUserInteraction({
              type: 'search',
              searchTerm: searchParams.searchTerm,
              resultCount: result.products.length
            });
          }
          
          return result;
        }
        throw new Error(result.error);
      } else {
        // Local search implementation
        let filtered = state.catalogProducts;
        
        if (searchParams.searchTerm) {
          const term = searchParams.searchTerm.toLowerCase();
          filtered = filtered.filter(product => 
            product.name.toLowerCase().includes(term) ||
            product.description?.toLowerCase().includes(term) ||
            product.category?.toLowerCase().includes(term)
          );
        }
        
        if (searchParams.category && searchParams.category !== 'all') {
          filtered = filtered.filter(product => product.category === searchParams.category);
        }
        
        dispatch({
          type: ACTION_TYPES.SET_SEARCH_RESULTS,
          payload: filtered
        });
        
        return { success: true, products: filtered };
      }
    } catch (error) {
      console.error('Search error:', error);
      dispatch({
        type: ACTION_TYPES.SET_ERROR,
        payload: { key: 'searchResults', error: error.message }
      });
      return { success: false, error: error.message };
    }
  }, [state.dataSource, state.catalogProducts]);
  
  const trackUserInteraction = useCallback(async (interaction) => {
    const interactionData = {
      ...interaction,
      userId: user?.uid,
      timestamp: new Date().toISOString(),
      sessionId: `session_${Date.now()}`
    };
    
    // Store locally immediately
    dispatch({
      type: ACTION_TYPES.TRACK_USER_INTERACTION,
      payload: interactionData
    });
    
    // Send to Firestore if available
    if (state.dataSource === 'firestore') {
      try {
        await StorageService.trackUserInteraction(interactionData);
      } catch (error) {
        console.error('Failed to track interaction:', error);
      }
    }
  }, [user, state.dataSource]);
  
  const updatePersonalization = useCallback(async (updates) => {
    dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { key: 'personalization', value: true } });
    
    try {
      dispatch({
        type: ACTION_TYPES.UPDATE_PERSONALIZATION,
        payload: updates
      });
      
      // Save to storage
      if (state.dataSource === 'firestore' && user) {
        await StorageService.updateInFirestore('userProfiles', user.uid, {
          personalization: { ...state.personalization, ...updates }
        });
      } else {
        await StorageService.saveData('personalization', { ...state.personalization, ...updates });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to update personalization:', error);
      return { success: false, error: error.message };
    }
  }, [state.dataSource, state.personalization, user]);

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
      Object.entries(state.deliveryTracking).forEach(([poId, data]) => {
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
      Object.entries(state.paymentTracking).forEach(([supplierId, data]) => {
        const docRef = doc(collection(db, 'paymentTracking'));
        batch.set(docRef, {
          supplierId,
          ...data,
          migratedAt: serverTimestamp(),
          createdBy: user?.uid
        });
        migrationCount++;
      });
      
      // 🔥 NEW: Migrate catalog products
      state.catalogProducts.forEach((product) => {
        const docRef = doc(collection(db, 'catalogProducts'));
        batch.set(docRef, {
          ...product,
          migratedAt: serverTimestamp(),
          createdBy: user?.uid,
          isActive: true
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
  }, [state.dataSource, state.deliveryTracking, state.paymentTracking, state.catalogProducts, user, switchDataSource]);
  
  // Keep all your existing query operations unchanged
  const findEntity = useCallback((entityType, predicate) => {
    return state[entityType].find(predicate);
  }, [state]);
  
  const filterEntities = useCallback((entityType, predicate) => {
    return state[entityType].filter(predicate);
  }, [state]);
  
  const getEntityById = useCallback((entityType, id) => {
    return state[entityType].find(item => item.id === id);
  }, [state]);
  
  // Keep your existing cache operations unchanged
  const getCachedData = useCallback((key) => {
    const cached = state.cache.data[key];
    if (!cached) return null;
    
    const isStale = (Date.now() - cached.timestamp) > state.cache.staleDuration;
    return isStale ? null : cached.data;
  }, [state.cache]);
  
  const setCachedData = useCallback((key, data) => {
    dispatch({
      type: ACTION_TYPES.SET_CACHE,
      payload: { key, data }
    });
  }, []);
  
  // Enhanced Context Value (keeping all your existing + new Smart Catalog features)
  const value = {
    // State (all your existing + Smart Catalog)
    state,
    
    // CRUD Operations (all your existing)
    createEntity,
    updateEntity,
    deleteEntity,
    
    // Query Operations (all your existing)
    findEntity,
    filterEntities,
    getEntityById,
    
    // Tracking Operations (enhanced)
    updateDeliveryStatus,
    updatePaymentStatus,
    
    // Cache Operations (all your existing)
    getCachedData,
    setCachedData,
    
    // 🔥 NEW: Smart Catalog Operations
    searchCatalogProducts,
    trackUserInteraction,
    updatePersonalization,
    
    // Utility (all your existing)
    isLoading: (key) => state.loading[key] || false,
    getError: (key) => state.errors[key] || null,
    clearError: (key) => dispatch({ type: ACTION_TYPES.CLEAR_ERROR, payload: { key } }),
    
    // Firestore Features
    dataSource: state.dataSource,
    switchDataSource,
    migrateToFirestore,
    isRealTimeActive: state.dataSource === 'firestore' && state.realTimeStatus.connected,
    lastSync: state.realTimeStatus.lastSync,
    migrationStatus: state.migrationStatus
  };
  
  return (
    <UnifiedDataContext.Provider value={value}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

// Keep all your existing hooks unchanged + new Smart Catalog hooks
export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
}

export function usePurchaseOrders() {
  const { state, createEntity, updateEntity, deleteEntity, getEntityById, filterEntities } = useUnifiedData();
  
  return {
    purchaseOrders: state.purchaseOrders,
    createPurchaseOrder: (data) => createEntity('purchaseOrders', data),
    updatePurchaseOrder: (id, updates) => updateEntity('purchaseOrders', id, updates),
    deletePurchaseOrder: (id) => deleteEntity('purchaseOrders', id),
    getPurchaseOrderById: (id) => getEntityById('purchaseOrders', id),
    getPurchaseOrdersByStatus: (status) => filterEntities('purchaseOrders', po => po.status === status),
    getPurchaseOrdersByClient: (clientName) => filterEntities('purchaseOrders', po => 
      po.clientName?.toLowerCase().includes(clientName.toLowerCase())
    )
  };
}

export function useDeliveryTracking() {
  const { state, updateDeliveryStatus, isRealTimeActive } = useUnifiedData();
  
  return {
    deliveryTracking: state.deliveryTracking,
    updateDeliveryStatus,
    isRealTimeActive,
    getDeliveryStatus: (poId) => state.deliveryTracking[poId] || null
  };
}

export function usePaymentTracking() {
  const { state, updatePaymentStatus, isRealTimeActive } = useUnifiedData();
  
  return {
    paymentTracking: state.paymentTracking,
    updatePaymentStatus,
    isRealTimeActive,
    getPaymentStatus: (supplierId) => state.paymentTracking[supplierId] || null
  };
}

// 🔥 NEW: Smart Catalog Hooks
export function useSmartCatalog() {
  const { 
    state, 
    searchCatalogProducts, 
    trackUserInteraction, 
    updatePersonalization,
    isRealTimeActive 
  } = useUnifiedData();
  
  return {
    catalogProducts: state.catalogProducts,
    searchResults: state.searchResults,
    catalogFilters: state.catalogFilters,
    catalogPagination: state.catalogPagination,
    personalization: state.personalization,
    userInteractions: state.userInteractions,
    searchCatalogProducts,
    trackUserInteraction,
    updatePersonalization,
    isRealTimeActive,
    
    // Helper functions
    getFeaturedProducts: () => state.catalogProducts.filter(p => p.featured === true),
    getProductsByCategory: (category) => state.catalogProducts.filter(p => p.category === category),
    getRecommendedProducts: () => state.personalization.recommendedProducts || [],
    getSearchHistory: () => state.personalization.searchHistory || [],
    getViewHistory: () => state.personalization.viewHistory || []
  };
}

export function useFactoryProfile() {
  const { state, trackUserInteraction } = useUnifiedData();
  
  return {
    factoryProfiles: state.factoryProfiles,
    currentProfile: state.factoryProfiles[state.user?.uid] || null,
    trackFactoryInteraction: trackUserInteraction,
    
    // Factory-specific helpers
    getFactoryPreferences: (factoryId) => state.factoryProfiles[factoryId]?.preferences || {},
    getFactoryPurchaseHistory: (factoryId) => state.factoryProfiles[factoryId]?.purchaseHistory || [],
    getFactoryRecommendations: (factoryId) => state.factoryProfiles[factoryId]?.recommendations || []
  };
}
