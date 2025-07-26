// src/components/procurement/StockAllocationIntegration.jsx
// Integration component that bridges stock allocation with manual matching workflow

import React, { useEffect } from 'react';
import UnifiedProductService from '../../services/UnifiedProductService';

/**
 * Integration component for stock allocation workflow
 * This component ensures proper data flow between allocation and matching
 */
const StockAllocationIntegration = ({ children }) => {
  useEffect(() => {
    // Initialize the unified product service
    console.log('🔧 Initializing Stock Allocation Integration...');
    
    // Pre-load products to warm the cache
    UnifiedProductService.getAllAvailableProducts().then(products => {
      console.log('✅ Products cache warmed:', products.length);
    });

    // Set up storage event listener for cross-tab synchronization
    const handleStorageChange = (e) => {
      if (e.key === 'higgsflow_stockAllocations' || e.key === 'products') {
        console.log('📢 Storage changed, refreshing products...');
        UnifiedProductService.forceRefresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return <>{children}</>;
};

/**
 * Enhanced Stock Allocation completion handler
 * Call this after successful stock allocation to update all systems
 */
export const handleStockAllocationComplete = async (allocationData) => {
  console.log('🎯 Stock allocation completed, updating systems...', allocationData);
  
  try {
    // Update the unified product service
    await UnifiedProductService.refreshAfterAllocation(allocationData);
    
    // Emit custom event for other components
    window.dispatchEvent(new CustomEvent('stock-allocation-completed', {
      detail: allocationData
    }));
    
    // Show success notification
    if (window.showNotification) {
      window.showNotification('Stock allocated successfully and products updated', 'success');
    }
    
    console.log('✅ All systems updated after stock allocation');
    
  } catch (error) {
    console.error('❌ Error updating systems after allocation:', error);
  }
};

/**
 * Hook for components that need to react to stock allocation changes
 */
export const useStockAllocationUpdates = (callback) => {
  useEffect(() => {
    const handleAllocationUpdate = (event) => {
      if (callback) {
        callback(event.detail);
      }
    };

    window.addEventListener('stock-allocation-completed', handleAllocationUpdate);
    
    return () => {
      window.removeEventListener('stock-allocation-completed', handleAllocationUpdate);
    };
  }, [callback]);
};

/**
 * Enhanced PI Modal integration
 * Replace your existing PIModal onAllocationComplete with this
 */
export const enhancedPIModalProps = {
  onAllocationComplete: async (allocations) => {
    console.log('📋 PI Modal: Allocation completed:', allocations);
    
    // Process allocations for unified service
    const allocationData = allocations.map(allocation => ({
      productCode: allocation.productCode,
      productId: allocation.productId,
      quantity: allocation.quantity,
      target: allocation.target,
      targetType: allocation.targetType,
      piId: allocation.piId,
      itemId: allocation.itemId,
      allocatedAt: new Date().toISOString(),
      source: 'pi-allocation'
    }));
    
    // Update all systems
    await handleStockAllocationComplete(allocationData);
  }
};

/**
 * Enhanced Manual Matching integration
 * Use this to integrate with existing manual matching components
 */
export const enhancedManualMatchingProps = {
  // Get products from unified service
  getProducts: async (searchTerm = '', selectedSupplier = 'all') => {
    return await UnifiedProductService.getProductsForManualMatching(searchTerm, selectedSupplier);
  },
  
  // Save manual match and update learning system
  onSaveManualMatch: (match) => {
    console.log('💾 Saving manual match:', match);
    
    // Save to existing manual matching system
    const existingMatches = JSON.parse(localStorage.getItem('manualMatches') || '{}');
    existingMatches[match.id] = match;
    localStorage.setItem('manualMatches', JSON.stringify(existingMatches));
    
    // Notify unified service for learning
    UnifiedProductService.notifyListeners('manual-match-created', match);
  }
};

/**
 * Debugging utilities for troubleshooting workflow issues
 */
export const debugWorkflow = async () => {
  console.log('🔍 Debugging workflow...');
  
  try {
    // Get debug info from unified service
    const debugInfo = await UnifiedProductService.getDebugInfo();
    
    // Get manual matching data
    const manualMatches = JSON.parse(localStorage.getItem('manualMatches') || '{}');
    const stockAllocations = JSON.parse(localStorage.getItem('higgsflow_stockAllocations') || '[]');
    const piAllocations = JSON.parse(localStorage.getItem('higgsflow_piAllocations') || '[]');
    
    const fullDebugInfo = {
      ...debugInfo,
      manualMatches: Object.keys(manualMatches).length,
      stockAllocations: stockAllocations.length,
      piAllocations: piAllocations.length,
      workflow: {
        lastAllocation: stockAllocations[stockAllocations.length - 1],
        lastManualMatch: Object.values(manualMatches).pop(),
        systemStatus: 'operational'
      }
    };
    
    console.table(fullDebugInfo);
    
    return fullDebugInfo;
    
  } catch (error) {
    console.error('❌ Error debugging workflow:', error);
    return null;
  }
};

/**
 * Workflow validation - checks if systems are properly connected
 */
export const validateWorkflow = async () => {
  console.log('✅ Validating workflow integration...');
  
  const issues = [];
  
  try {
    // Check if unified service is working
    const products = await UnifiedProductService.getAllAvailableProducts();
    if (products.length === 0) {
      issues.push('No products loaded in unified service');
    }
    
    // Check if products have allocation data
    const productsWithAllocations = products.filter(p => p.isAvailableForMatching);
    if (productsWithAllocations.length === 0) {
      issues.push('No products available for matching - check allocation workflow');
    }
    
    // Check if bearing products are present
    const bearingProducts = products.filter(p => 
      p.name?.toLowerCase().includes('bearing') || 
      p.category?.toLowerCase().includes('bearing')
    );
    if (bearingProducts.length === 0) {
      issues.push('No bearing products found - check product data');
    }
    
    // Check recent allocations
    const debugInfo = await UnifiedProductService.getDebugInfo();
    if (debugInfo.recentAllocations === 0) {
      issues.push('No recent allocations found - may need to re-allocate');
    }
    
    console.log('🔍 Workflow validation results:', {
      totalProducts: products.length,
      availableForMatching: productsWithAllocations.length,
      bearingProducts: bearingProducts.length,
      recentAllocations: debugInfo.recentAllocations,
      issues: issues.length
    });
    
    if (issues.length > 0) {
      console.warn('⚠️ Workflow issues found:', issues);
    } else {
      console.log('✅ Workflow validation passed - all systems connected');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      stats: {
        totalProducts: products.length,
        availableForMatching: productsWithAllocations.length,
        bearingProducts: bearingProducts.length,
        recentAllocations: debugInfo.recentAllocations
      }
    };
    
  } catch (error) {
    console.error('❌ Error validating workflow:', error);
    return {
      isValid: false,
      issues: ['Workflow validation failed: ' + error.message],
      stats: {}
    };
  }
};

// Global debugging functions (available in browser console)
if (typeof window !== 'undefined') {
  window.debugHiggsFlowWorkflow = debugWorkflow;
  window.validateHiggsFlowWorkflow = validateWorkflow;
  window.forceRefreshProducts = () => UnifiedProductService.forceRefresh();
}

export default StockAllocationIntegration;
