// src/hooks/usePricing.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { PricingService } from '../services/pricingService';

/**
 * Main pricing hook - resolves price for a specific product and client
 */
export const usePricing = (productId, clientId) => {
  const [pricing, setPricing] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const loadPricing = useCallback(async () => {
    if (!productId) {
      setLoading(false);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);

      // Load current pricing
      const currentPricing = await PricingService.resolvePriceForClient(productId, clientId);
      
      // Check if request was cancelled
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      setPricing(currentPricing);

      // Load price history if client is provided
      if (clientId) {
        const history = await PricingService.getClientPriceHistory(productId, clientId, 5);
        
        if (!abortControllerRef.current.signal.aborted) {
          setPriceHistory(history);
        }
      } else {
        setPriceHistory([]);
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        setError(err.message);
        console.error('Error loading pricing:', err);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, [productId, clientId]);

  useEffect(() => {
    loadPricing();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadPricing]);

  const refreshPricing = useCallback(() => {
    loadPricing();
  }, [loadPricing]);

  return {
    pricing,
    priceHistory,
    loading,
    error,
    refreshPricing
  };
};

/**
 * Hook for tier-based pricing (admin use)
 */
export const useTierPricing = (productId, tierId) => {
  const [tierPricing, setTierPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!productId || !tierId) {
      setLoading(false);
      return;
    }

    const loadTierPricing = async () => {
      try {
        setLoading(true);
        setError(null);
        const pricing = await PricingService.getTierPricing(productId, tierId);
        setTierPricing(pricing);
      } catch (err) {
        setError(err.message);
        console.error('Error loading tier pricing:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTierPricing();
  }, [productId, tierId]);

  const refreshTierPricing = useCallback(async () => {
    if (!productId || !tierId) return;
    
    try {
      setLoading(true);
      const pricing = await PricingService.getTierPricing(productId, tierId);
      setTierPricing(pricing);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [productId, tierId]);

  return { 
    tierPricing, 
    loading, 
    error,
    refreshTierPricing 
  };
};

/**
 * Hook for bulk pricing operations (cart, product lists)
 */
export const useBulkPricing = (productIds, clientId) => {
  const [pricingMap, setPricingMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(new Set());

  const loadBulkPricing = useCallback(async () => {
    if (!productIds || productIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await PricingService.resolvePricesForProducts(productIds, clientId);
      setPricingMap(results);
    } catch (err) {
      setError(err.message);
      console.error('Error loading bulk pricing:', err);
    } finally {
      setLoading(false);
    }
  }, [productIds, clientId]);

  // Load individual product pricing (useful for dynamic additions)
  const loadProductPricing = useCallback(async (productId) => {
    if (pricingMap[productId] || loadingProducts.has(productId)) {
      return; // Already loaded or loading
    }

    setLoadingProducts(prev => new Set(prev).add(productId));

    try {
      const pricing = await PricingService.resolvePriceForClient(productId, clientId);
      setPricingMap(prev => ({
        ...prev,
        [productId]: pricing
      }));
    } catch (err) {
      console.error(`Error loading pricing for ${productId}:`, err);
    } finally {
      setLoadingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  }, [pricingMap, clientId, loadingProducts]);

  useEffect(() => {
    loadBulkPricing();
  }, [loadBulkPricing]);

  return {
    pricingMap,
    loading,
    error,
    loadProductPricing,
    refreshBulkPricing: loadBulkPricing
  };
};

/**
 * Hook for client-specific pricing management (admin use)
 */
export const useClientPricing = (clientId) => {
  const [clientPricing, setClientPricing] = useState({
    clientSpecific: [],
    tierBased: [],
    client: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadClientPricing = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await PricingService.getClientAllPricing(clientId);
      setClientPricing(results);
    } catch (err) {
      setError(err.message);
      console.error('Error loading client pricing:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClientPricing();
  }, [loadClientPricing]);

  const updateClientSpecificPricing = useCallback(async (productId, pricingData) => {
    try {
      const result = await PricingService.setClientSpecificPricing(clientId, productId, pricingData);
      
      if (result.success) {
        // Refresh the data
        await loadClientPricing();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Error updating client pricing:', err);
      return { success: false, error: err.message };
    }
  }, [clientId, loadClientPricing]);

  return {
    clientPricing,
    loading,
    error,
    updateClientSpecificPricing,
    refreshClientPricing: loadClientPricing
  };
};

/**
 * Hook for pricing statistics (analytics use)
 */
export const usePricingStats = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    clientsWithSpecialPricing: 0,
    totalPriceHistory: 0,
    averageDiscount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const statsData = await PricingService.getPricingStats();
      setStats(statsData);
    } catch (err) {
      setError(err.message);
      console.error('Error loading pricing stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refreshStats: loadStats
  };
};

/**
 * Hook for price history operations
 */
export const usePriceHistory = (productId, clientId) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPriceHistory = useCallback(async () => {
    if (!productId || !clientId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const history = await PricingService.getClientPriceHistory(productId, clientId, 10);
      setPriceHistory(history);
    } catch (err) {
      setError(err.message);
      console.error('Error loading price history:', err);
    } finally {
      setLoading(false);
    }
  }, [productId, clientId]);

  useEffect(() => {
    loadPriceHistory();
  }, [loadPriceHistory]);

  return {
    priceHistory,
    loading,
    error,
    refreshPriceHistory: loadPriceHistory
  };
};

/**
 * Hook for historical price import operations
 */
export const useHistoricalPriceImport = () => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  const importHistoricalPrices = useCallback(async (clientId, priceData) => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);
      
      const result = await PricingService.importHistoricalPrices(clientId, priceData);
      setImportResult(result);
      
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error importing historical prices:', err);
      return { success: false, error: err.message };
    } finally {
      setImporting(false);
    }
  }, []);

  const clearImportResult = useCallback(() => {
    setImportResult(null);
    setError(null);
  }, []);

  return {
    importing,
    importResult,
    error,
    importHistoricalPrices,
    clearImportResult
  };
};

/**
 * Utility hook for price calculations
 */
export const usePriceCalculations = () => {
  const calculateFinalPrice = useCallback((basePrice, discountType, discountValue) => {
    if (discountType === 'percentage') {
      return basePrice * (1 - discountValue / 100);
    } else {
      return basePrice - discountValue;
    }
  }, []);

  const calculateSavings = useCallback((originalPrice, finalPrice) => {
    if (originalPrice <= finalPrice) return null;
    
    const savings = originalPrice - finalPrice;
    const percentage = (savings / originalPrice) * 100;
    
    return {
      amount: savings,
      percentage: percentage.toFixed(1)
    };
  }, []);

  const formatPrice = useCallback((price, currency = 'RM') => {
    return `${currency} ${price.toFixed(2)}`;
  }, []);

  return {
    calculateFinalPrice,
    calculateSavings,
    formatPrice
  };
};

/**
 * Hook for real-time pricing updates (for admin dashboard)
 */
export const useRealtimePricing = (productIds, clientIds) => {
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const refreshPricingData = useCallback(async () => {
    if (!productIds?.length) return;

    try {
      setLoading(true);
      const results = {};

      for (const productId of productIds) {
        results[productId] = {};
        
        for (const clientId of (clientIds || [null])) {
          const pricing = await PricingService.resolvePriceForClient(productId, clientId);
          results[productId][clientId || 'public'] = pricing;
        }
      }

      setPricingData(results);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing pricing data:', err);
    } finally {
      setLoading(false);
    }
  }, [productIds, clientIds]);

  useEffect(() => {
    refreshPricingData();
    
    // Set up periodic refresh for real-time updates
    const interval = setInterval(refreshPricingData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [refreshPricingData]);

  return {
    pricingData,
    loading,
    lastUpdated,
    refreshPricingData
  };
};
