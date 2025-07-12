// src/context/UnifiedDataContext.jsx
import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';

// Action Types
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
  SYNC_TRACKING_DATA: 'SYNC_TRACKING_DATA'
};

// Initial State
const initialState = {
  // Core Data
  purchaseOrders: [],
  proformaInvoices: [],
  suppliers: [],
  products: [],
  
  // Tracking Data
  deliveryTracking: {},
  paymentTracking: {},
  
  // UI State
  loading: {
    global: false,
    purchaseOrders: false,
    deliveryTracking: false,
    paymentTracking: false
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
    version: '1.0.0'
  }
};

// Reducer
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
      
    default:
      return state;
  }
}

// Context
const UnifiedDataContext = createContext();

// Storage Service
class StorageService {
  static getStorageKey(entityType) {
    return `higgsflow_${entityType}`;
  }
  
  static async loadData(entityType) {
    try {
      const stored = localStorage.getItem(this.getStorageKey(entityType));
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error loading ${entityType}:`, error);
      return [];
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
}

// Provider Component
export function UnifiedDataProvider({ children }) {
  const [state, dispatch] = useReducer(unifiedDataReducer, initialState);
  
  // Initialize data on mount
  useEffect(() => {
    async function initializeData() {
      dispatch({ type: ACTION_TYPES.SET_LOADING, payload: { key: 'global', value: true } });
      
      try {
        const entityTypes = ['purchaseOrders', 'proformaInvoices', 'suppliers', 'products'];
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
    }
    
    initializeData();
  }, []);
  
  // Generic CRUD Operations
  const createEntity = useCallback(async (entityType, data) => {
    const id = data.id || `${entityType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entity = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    dispatch({
      type: ACTION_TYPES.CREATE_ENTITY,
      payload: { entityType, data: entity }
    });
    
    // Save to storage
    const success = await StorageService.saveData(entityType, [...state[entityType], entity]);
    
    if (success) {
      toast.success(`${entityType.slice(0, -1)} created successfully`);
      return { success: true, data: entity };
    } else {
      toast.error(`Failed to create ${entityType.slice(0, -1)}`);
      return { success: false, error: 'Storage failed' };
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
      // Update storage
      const updatedArray = state[entityType].map(item =>
        item.id === id ? { ...item, ...updatedData } : item
      );
      
      const success = await StorageService.saveData(entityType, updatedArray);
      
      if (success) {
        if (!useOptimistic) {
          dispatch({
            type: ACTION_TYPES.UPDATE_ENTITY,
            payload: { entityType, id, updates: updatedData }
          });
        }
        return { success: true, data: { ...originalData, ...updatedData } };
      } else {
        throw new Error('Storage failed');
      }
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
    dispatch({
      type: ACTION_TYPES.DELETE_ENTITY,
      payload: { entityType, id }
    });
    
    const filteredArray = state[entityType].filter(item => item.id !== id);
    const success = await StorageService.saveData(entityType, filteredArray);
    
    if (success) {
      toast.success(`${entityType.slice(0, -1)} deleted successfully`);
      return { success: true };
    } else {
      toast.error(`Failed to delete ${entityType.slice(0, -1)}`);
      return { success: false, error: 'Storage failed' };
    }
  }, [state]);
  
  // Tracking-Specific Operations
  const updateDeliveryStatus = useCallback(async (poId, updates) => {
    dispatch({
      type: ACTION_TYPES.UPDATE_DELIVERY_STATUS,
      payload: { poId, updates }
    });
    
    const newDeliveryTracking = {
      ...state.deliveryTracking,
      [poId]: {
        ...state.deliveryTracking[poId],
        ...updates,
        lastUpdated: new Date().toISOString()
      }
    };
    
    await StorageService.saveData('deliveryTracking', newDeliveryTracking);
    return { success: true };
  }, [state.deliveryTracking]);
  
  const updatePaymentStatus = useCallback(async (supplierId, updates) => {
    dispatch({
      type: ACTION_TYPES.UPDATE_PAYMENT_STATUS,
      payload: { supplierId, updates }
    });
    
    const newPaymentTracking = {
      ...state.paymentTracking,
      [supplierId]: {
        ...state.paymentTracking[supplierId],
        ...updates,
        lastUpdated: new Date().toISOString()
      }
    };
    
    await StorageService.saveData('paymentTracking', newPaymentTracking);
    return { success: true };
  }, [state.paymentTracking]);
  
  // Advanced Query Operations
  const findEntity = useCallback((entityType, predicate) => {
    return state[entityType].find(predicate);
  }, [state]);
  
  const filterEntities = useCallback((entityType, predicate) => {
    return state[entityType].filter(predicate);
  }, [state]);
  
  const getEntityById = useCallback((entityType, id) => {
    return state[entityType].find(item => item.id === id);
  }, [state]);
  
  // Cache Operations
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
  
  // Context Value
  const value = {
    // State
    state,
    
    // CRUD Operations
    createEntity,
    updateEntity,
    deleteEntity,
    
    // Query Operations
    findEntity,
    filterEntities,
    getEntityById,
    
    // Tracking Operations
    updateDeliveryStatus,
    updatePaymentStatus,
    
    // Cache Operations
    getCachedData,
    setCachedData,
    
    // Utility
    isLoading: (key) => state.loading[key] || false,
    getError: (key) => state.errors[key] || null,
    clearError: (key) => dispatch({ type: ACTION_TYPES.CLEAR_ERROR, payload: { key } })
  };
  
  return (
    <UnifiedDataContext.Provider value={value}>
      {children}
    </UnifiedDataContext.Provider>
  );
}

// Hook
export function useUnifiedData() {
  const context = useContext(UnifiedDataContext);
  if (!context) {
    throw new Error('useUnifiedData must be used within a UnifiedDataProvider');
  }
  return context;
}

// Specific hooks for common operations
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
  const { state, updateDeliveryStatus } = useUnifiedData();
  
  return {
    deliveryTracking: state.deliveryTracking,
    updateDeliveryStatus,
    getDeliveryStatus: (poId) => state.deliveryTracking[poId] || null
  };
}

export function usePaymentTracking() {
  const { state, updatePaymentStatus } = useUnifiedData();
  
  return {
    paymentTracking: state.paymentTracking,
    updatePaymentStatus,
    getPaymentStatus: (supplierId) => state.paymentTracking[supplierId] || null
  };
}
