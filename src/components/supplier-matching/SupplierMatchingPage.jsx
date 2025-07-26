// src/components/supplier-matching/SupplierMatchingPage.jsx
// 🔧 FINAL VERSION with Robust PO Loading & Tracking Integration + Manual Matching
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Save, 
  CheckCircle,
  Home,
  ChevronRight,
  AlertCircle,
  Package,
  Brain,        
  Zap,          
  Target,       
  TrendingUp,   
  Clock,        
  FileText,     
  BarChart3,    
  Truck,
  ExclamationTriangle,
  HandRaised,
  Sparkles         
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SupplierMatchingDisplay from './SupplierMatchingDisplay';
import ManualMatchingInterface from './ManualMatchingInterface';
import EnhancementSuggestionModal from './EnhancementSuggestionModal';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { AIExtractionService } from '../../services/ai';

// 🔧 CRITICAL FIX: Import Firestore directly for robust PO loading
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// 🔧 CRITICAL FIX: Import tracking services properly
import { ConsolidatedTrackingService } from '../../services/tracking/TrackingServices';
import { useDeliveryTracking, usePaymentTracking } from '../../context/UnifiedDataContext';

const SupplierMatchingPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  
  // 🔧 CRITICAL FIX: Use tracking hooks directly
  const { updateDeliveryStatus } = useDeliveryTracking();
  const { updatePaymentStatus } = usePaymentTracking();
  
  // Use the existing hook but with fallback
  const { getPurchaseOrderById, updatePurchaseOrder, purchaseOrders, loading: hookLoading } = usePurchaseOrders();
  
  // Main state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // NEW: Manual matching states
  const [showManualMatching, setShowManualMatching] = useState(false);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  // Enhanced tracking state
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [matchingResult, setMatchingResult] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // Log tracking availability
  useEffect(() => {
    console.log('🔧 Tracking System Status:', {
      hasConsolidatedService: typeof ConsolidatedTrackingService === 'object',
      hasInitFunction: typeof ConsolidatedTrackingService?.initializeCompleteTracking === 'function',
      updateDeliveryAvailable: typeof updateDeliveryStatus === 'function',
      updatePaymentAvailable: typeof updatePaymentStatus === 'function'
    });
  }, [updateDeliveryStatus, updatePaymentStatus]);

  // NEW: Load suppliers and products data
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        // Load suppliers and products from localStorage or API
        const storedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const storedProducts = JSON.parse(localStorage.getItem('products') || '[]');
        
        setSuppliers(storedSuppliers);
        setProducts(storedProducts);
        
        console.log('📦 Loaded static data:', {
          suppliers: storedSuppliers.length,
          products: storedProducts.length
        });
      } catch (error) {
        console.error('Error loading static data:', error);
      }
    };
    
    loadStaticData();
  }, []);

  // NEW: Helper function to get unmatched items
  const getUnmatchedItems = useCallback(() => {
    if (!purchaseOrder?.items) return [];
    
    return purchaseOrder.items.filter(item => {
      // Item is unmatched if it has no supplier matches or all matches have low confidence
      const hasValidMatch = item.supplierMatches?.some(match => 
        match.confidence > 50 && match.product
      );
      return !hasValidMatch;
    });
  }, [purchaseOrder]);

  // NEW: Helper function to get matching metrics
  const getMatchingMetrics = useCallback(() => {
    if (!purchaseOrder?.matchingMetrics) {
      // Calculate basic metrics if not available
      const totalItems = purchaseOrder?.items?.length || 0;
      const unmatchedItems = getUnmatchedItems().length;
      const matchedItems = totalItems - unmatchedItems;
      
      return {
        totalItems,
        matchedItems,
        unmatchedItems,
        matchRate: totalItems > 0 ? Math.round((matchedItems / totalItems) * 100) : 0
      };
    }
    
    return purchaseOrder.matchingMetrics;
  }, [purchaseOrder, getUnmatchedItems]);

  // NEW: Load suppliers and products data
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        // Load suppliers and products from localStorage or API
        const storedSuppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const storedProducts = JSON.parse(localStorage.getItem('products') || '[]');
        
        setSuppliers(storedSuppliers);
        setProducts(storedProducts);
        
        console.log('📦 Loaded static data:', {
          suppliers: storedSuppliers.length,
          products: storedProducts.length
        });
      } catch (error) {
        console.error('Error loading static data:', error);
      }
    };
    
    loadStaticData();
  }, []);

  // NEW: Helper function to get unmatched items
  const getUnmatchedItems = useCallback(() => {
    if (!purchaseOrder?.items) return [];
    
    return purchaseOrder.items.filter(item => {
      // Item is unmatched if it has no supplier matches or all matches have low confidence
      const hasValidMatch = item.supplierMatches?.some(match => 
        match.confidence > 50 && match.product
      );
      return !hasValidMatch;
    });
  }, [purchaseOrder]);

  // NEW: Helper function to get matching metrics
  const getMatchingMetrics = useCallback(() => {
    if (!purchaseOrder?.matchingMetrics) {
      // Calculate basic metrics if not available
      const totalItems = purchaseOrder?.items?.length || 0;
      const unmatchedItems = getUnmatchedItems().length;
      const matchedItems = totalItems - unmatchedItems;
      
      return {
        totalItems,
        matchedItems,
        unmatchedItems,
        matchRate: totalItems > 0 ? Math.round((matchedItems / totalItems) * 100) : 0
      };
    }
    
    return purchaseOrder.matchingMetrics;
  }, [purchaseOrder, getUnmatchedItems]);

  // 🔧 ADD: Debug function to check item structure
  const debugItemStructure = useCallback(() => {
    console.log('🔍 DEBUG: Checking item structure...');
    console.log('📋 Purchase Order:', purchaseOrder);
    console.log('📋 Items:', purchaseOrder?.items);
    
    if (purchaseOrder?.items) {
      purchaseOrder.items.forEach((item, index) => {
        console.log(`📋 Item ${index}:`, {
          itemNumber: item.itemNumber,
          itemNumberType: typeof item.itemNumber,
          productName: item.productName,
          hasMatches: !!item.supplierMatches,
          matchCount: item.supplierMatches?.length || 0
        });
      });
    }
  }, [purchaseOrder]);

  // 🔧 ROBUST PO LOADING with multiple fallback strategies
  const loadPurchaseOrderRobust = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading PO with enhanced AI features:', poId);
      
      // Strategy 1: Try the hook first (fast path)
      let po = getPurchaseOrderById(poId);
      
      if (po) {
        console.log('✅ Found PO via hook:', po.poNumber || po.orderNumber);
      } else {
        console.log('⚠️ Hook didn\'t find PO, trying direct search in purchaseOrders array...');
        
        // Strategy 2: Search directly in the purchaseOrders array
        po = purchaseOrders.find(order => order.id === poId);
        
        if (po) {
          console.log('✅ Found PO via direct array search:', po.poNumber || po.orderNumber);
        } else {
          console.log('⚠️ Array search failed, trying direct Firestore query...');
          
          // Strategy 3: Direct Firestore query as ultimate fallback
          try {
            const docRef = doc(db, 'purchaseOrders', poId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              po = { id: docSnap.id, ...docSnap.data() };
              console.log('✅ Found PO via direct Firestore query:', po.poNumber || po.orderNumber);
            } else {
              console.log('❌ PO not found in Firestore either');
            }
          } catch (firestoreError) {
            console.error('❌ Firestore direct query failed:', firestoreError);
          }
        }
      }

      if (!po) {
        throw new Error('Purchase order not found');
      }

      console.log('✅ Found PO:', po.orderNumber || po.poNumber);
      
      // 🔧 FIXED: Ensure all items have itemNumber
      const itemsWithNumbers = po.items?.map((item, index) => ({
        ...item,
        itemNumber: item.itemNumber !== undefined ? item.itemNumber : (index + 1) // Fallback if missing
      })) || [];
      
      const updatedPO = {
        ...po,
        items: itemsWithNumbers
      };
      
      setPurchaseOrder(updatedPO);

      // Load existing matching results with enhanced data
      if (po.sourcingPlan || po.matchingMetrics || po.supplierMatching) {
        console.log('📊 Found existing enhanced matching data');
        const existingResult = po.supplierMatching || {
          itemMatches: itemsWithNumbers,
          sourcingPlan: po.sourcingPlan,
          metrics: po.matchingMetrics
        };
        setMatchingResult(existingResult);
        
        // Check for unsaved changes
        checkForUnsavedChanges(po);
      } else {
        console.log('🚀 No matching data found, running enhanced AI matching...');
        await handleRefreshMatching(updatedPO, false);
      }
      
      // 🔧 FIXED: Load supplier selections from multiple sources
      const selections = {};
      
      // First, check the supplierSelections object (filter out metadata)
      if (po.supplierSelections && typeof po.supplierSelections === 'object') {
        Object.entries(po.supplierSelections).forEach(([key, value]) => {
          if (!['totalItems', 'selectedItems', 'averageConfidence', 'totalSavings', 'lastUpdated'].includes(key)) {
            selections[key] = value;
          }
        });
      }
      
      // Check individual item selections
      itemsWithNumbers.forEach(item => {
        const itemKey = String(item.itemNumber);
        
        if (!selections[itemKey]) {
          if (item.selectedSupplier?.supplierId) {
            selections[itemKey] = item.selectedSupplier.supplierId;
          } else if (item.selectedSupplierId) {
            selections[itemKey] = item.selectedSupplierId;
          } else if (item.supplierMatches) {
            const previouslySelected = item.supplierMatches.find(match => match.isSelected);
            if (previouslySelected) {
              selections[itemKey] = previouslySelected.supplierId;
            }
          }
        }
      });
      
      setSelectedSuppliers(selections);
      
      console.log('📋 Loaded existing selections:', Object.keys(selections).length, 'items');
      if (Object.keys(selections).length > 0) {
        console.log('Selections detail:', selections);
      }
      
    } catch (err) {
      setError('Failed to load purchase order: ' + err.message);
      console.error('❌ Error loading PO:', err);
    } finally {
      setLoading(false);
    }
  }, [poId, getPurchaseOrderById, purchaseOrders]);

  // 🔧 Wait for hook to load before trying to get PO
  useEffect(() => {
    // Only try to load PO when:
    // 1. We have a poId
    // 2. The hook is not loading
    // 3. We haven't loaded the PO yet
    if (poId && !hookLoading && !purchaseOrder) {
      loadPurchaseOrderRobust();
    }
  }, [poId, hookLoading, purchaseOrder, loadPurchaseOrderRobust]);

  // 🔧 ADD: Debug when PO changes
  useEffect(() => {
    if (purchaseOrder?.items) {
      debugItemStructure();
    }
  }, [purchaseOrder, debugItemStructure]);

  // Enhanced unsaved changes detection
  const checkForUnsavedChanges = (po) => {
    if (po.supplierSelections && po.supplierSelections.selectedItems > 0) {
      const lastSaved = po.supplierSelections.lastUpdated;
      if (lastSaved) {
        setLastSaveTime(new Date(lastSaved));
      }
    }
  };

  // NEW: Handle manual matching
  const handleManualMatch = async (matchData) => {
    try {
      // Find the PO item and update it with the manual match
      const updatedItems = purchaseOrder.items.map(item => {
        if (item.id === matchData.poItem.id || item.itemNumber === matchData.poItem.itemNumber) {
          return {
            ...item,
            supplierMatches: [
              ...(item.supplierMatches || []),
              {
                supplierId: matchData.product.supplierId,
                supplierName: suppliers.find(s => s.id === matchData.product.supplierId)?.name || 'Unknown',
                product: matchData.product,
                productId: matchData.product.id,
                productName: matchData.product.name,
                pricing: {
                  unitPrice: matchData.product.price,
                  leadTime: matchData.product.leadTime || '2-3 weeks'
                },
                confidence: 100,
                matchType: 'manual',
                matchedAt: matchData.matchedAt,
                isSelected: true // Auto-select manual matches
              }
            ],
            hasManualMatch: true
          };
        }
        return item;
      });

      // Update the purchase order
      const updatedPO = {
        ...purchaseOrder,
        items: updatedItems,
        lastUpdated: new Date().toISOString()
      };

      // Save to Firestore
      try {
        const updateResult = await updatePurchaseOrder(poId, {
          items: updatedItems,
          lastUpdated: new Date().toISOString()
        });
        
        if (updateResult.success) {
          console.log('💾 Saved manual match successfully');
        } else {
          throw new Error(updateResult.error || 'Failed to save');
        }
      } catch (saveError) {
        console.warn('⚠️ Failed to save manual match:', saveError.message);
      }

      // Save manual match for AI learning
      const manualMatches = JSON.parse(localStorage.getItem('manualMatches') || '[]');
      manualMatches.push({
        poItemDescription: matchData.poItem.productName,
        poItemCode: matchData.poItem.productCode,
        matchedProductId: matchData.product.id,
        matchedProductName: matchData.product.name,
        matchedProductCode: matchData.product.code,
        confidence: 100,
        matchType: 'manual',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('manualMatches', JSON.stringify(manualMatches));

      setPurchaseOrder(updatedPO);
      
      // Show success notification
      toast.success('✅ Manual match saved successfully! AI will learn from this choice.');
      
    } catch (error) {
      console.error('Error saving manual match:', error);
      toast.error('Failed to save manual match: ' + error.message);
    }
  };

  // NEW: Handle enhancement and re-matching
  const handleEnhanceAndRematch = async (enhancedItems) => {
    try {
      setIsRematching(true);
      
      // Update PO items with enhancements
      const updatedItems = purchaseOrder.items.map(originalItem => {
        const enhanced = enhancedItems.find(e => e.id === originalItem.id || e.itemNumber === originalItem.itemNumber);
        if (enhanced) {
          return {
            ...originalItem,
            // Store original values
            originalProductName: originalItem.productName,
            originalProductCode: originalItem.productCode,
            
            // Apply enhancements
            productName: enhanced.enhancedProductName || originalItem.productName,
            productCode: enhanced.enhancedProductCode || originalItem.productCode,
            brand: enhanced.brand,
            modelNumber: enhanced.modelNumber,
            technicalSpecs: enhanced.technicalSpecs,
            enhancementApplied: true,
            enhancementData: enhanced.enhancements
          };
        }
        return originalItem;
      });

      // Re-run supplier matching with enhanced data
      const result = await handleRefreshMatching({
        ...purchaseOrder,
        items: updatedItems
      }, false);

      if (result) {
        setShowEnhancementModal(false);
        toast.success('✅ Enhanced AI matching completed successfully!');
      }
      
    } catch (error) {
      console.error('Error in enhanced matching:', error);
      toast.error('Enhanced matching failed: ' + error.message);
    } finally {
      setIsRematching(false);
    }
  };

  // NEW: Handle manual matching
  const handleManualMatch = async (matchData) => {
    try {
      // Find the PO item and update it with the manual match
      const updatedItems = purchaseOrder.items.map(item => {
        if (item.id === matchData.poItem.id) {
          return {
            ...item,
            supplierMatches: [
              ...(item.supplierMatches || []),
              {
                supplierId: matchData.product.supplierId,
                product: matchData.product,
                confidence: 100,
                matchType: 'manual',
                matchedAt: matchData.matchedAt,
                isSelected: true // Auto-select manual matches
              }
            ],
            hasManualMatch: true
          };
        }
        return item;
      });

      // Update the purchase order
      const updatedPO = {
        ...purchaseOrder,
        items: updatedItems,
        status: 'suppliers_selected',
        lastUpdated: new Date().toISOString()
      };

      // Save to localStorage/Firestore
      try {
        const updateResult = await updatePurchaseOrder(poId, {
          items: updatedItems,
          status: 'suppliers_selected',
          lastUpdated: new Date().toISOString()
        });
        
        if (updateResult.success) {
          console.log('💾 Saved manual match successfully');
        } else {
          throw new Error(updateResult.error || 'Failed to save');
        }
      } catch (saveError) {
        console.warn('⚠️ Failed to save manual match:', saveError.message);
      }

      // Save manual match for AI learning
      const manualMatches = JSON.parse(localStorage.getItem('manualMatches') || '[]');
      manualMatches.push({
        poItemDescription: matchData.poItem.productName,
        poItemCode: matchData.poItem.productCode,
        matchedProductId: matchData.product.id,
        matchedProductName: matchData.product.name,
        matchedProductCode: matchData.product.code,
        confidence: 100,
        matchType: 'manual',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('manualMatches', JSON.stringify(manualMatches));

      setPurchaseOrder(updatedPO);
      
      // Show success notification
      toast.success('✅ Manual match saved successfully');
      
    } catch (error) {
      console.error('Error saving manual match:', error);
      toast.error('Failed to save manual match: ' + error.message);
    }
  };

  // NEW: Handle enhancement and re-matching
  const handleEnhanceAndRematch = async (enhancedItems) => {
    try {
      setIsRematching(true);
      
      // Update PO items with enhancements
      const updatedItems = purchaseOrder.items.map(originalItem => {
        const enhanced = enhancedItems.find(e => e.id === originalItem.id);
        if (enhanced) {
          return {
            ...originalItem,
            // Store original values
            originalProductName: originalItem.productName,
            originalProductCode: originalItem.productCode,
            
            // Apply enhancements
            productName: enhanced.enhancedProductName || originalItem.productName,
            productCode: enhanced.enhancedProductCode || originalItem.productCode,
            brand: enhanced.brand,
            modelNumber: enhanced.modelNumber,
            technicalSpecs: enhanced.technicalSpecs,
            enhancementApplied: true,
            enhancementData: enhanced.enhancements
          };
        }
        return originalItem;
      });

      // Re-run supplier matching with enhanced data
      const result = await AIExtractionService.rerunSupplierMatching({
        items: updatedItems,
        poNumber: purchaseOrder.orderNumber
      });

      if (result.success) {
        const updatedPO = {
          ...purchaseOrder,
          items: result.data.itemMatches,
          matchingMetrics: result.data.metrics,
          enhancementApplied: true,
          lastUpdated: new Date().toISOString()
        };

        // Save updated PO
        try {
          const updateResult = await updatePurchaseOrder(poId, {
            items: result.data.itemMatches,
            matchingMetrics: result.data.metrics,
            enhancementApplied: true,
            lastUpdated: new Date().toISOString()
          });
          
          if (updateResult.success) {
            console.log('💾 Saved enhanced matching results');
          } else {
            throw new Error(updateResult.error || 'Failed to save');
          }
        } catch (saveError) {
          console.warn('⚠️ Failed to save enhanced results:', saveError.message);
        }

        setPurchaseOrder(updatedPO);
        setShowEnhancementModal(false);
        
        toast.success('✅ Enhanced AI matching completed successfully');
      }
      
    } catch (error) {
      console.error('Error in enhanced matching:', error);
      toast.error('Enhanced matching failed: ' + error.message);
    } finally {
      setIsRematching(false);
    }
  };

  // Get unmatched items and metrics using callbacks
  const unmatchedItems = getUnmatchedItems();
  const matchingMetrics = getMatchingMetrics();

  // Enhanced loading state with AI theming
  if (loading || hookLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CpuChipIcon className="w-8 h-8 animate-pulse text-blue-600 mr-2" />
            <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <p className="text-gray-600 text-lg">Loading enhanced AI supplier matching...</p>
          <p className="text-gray-500 text-sm mt-2">Initializing machine learning algorithms</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !purchaseOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-900 mb-2">
            {error || 'Purchase order not found'}
          </h3>
          <p className="text-red-700 mb-6">
            The purchase order could not be loaded. Please check the URL or try again.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/purchase-orders')}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 inline mr-2" />
              Back to Purchase Orders
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 inline mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with AI Indicators */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/purchase-orders')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <CpuChipIcon className="w-5 h-5 text-blue-600" />
                  Enhanced AI Supplier Matching
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-gray-600">
                    PO {purchaseOrder.poNumber || purchaseOrder.orderNumber}
                  </p>
                  
                  {/* Show tracking status */}
                  {purchaseOrder.status === 'suppliers_selected' && (
                    <div className="flex items-center gap-1">
                      <ChartBarIcon className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium text-sm">
                        Tracking Active
                      </span>
                    </div>
                  )}
                  
                  {/* Enhanced Selection Status */}
                  {selectionStatus.count > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {selectionStatus.count}/{selectionStatus.total} selected ({selectionStatus.percentage}%)
                        </span>
                      </div>
                      
                      {selectionStatus.totalSavings > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUpIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            ${selectionStatus.totalSavings.toFixed(2)} savings
                          </span>
                        </div>
                      )}
                      
                      {selectionStatus.averageConfidence > 0 && (
                        <div className="flex items-center gap-1">
                          <RocketLaunchIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-purple-600 font-medium">
                            {selectionStatus.averageConfidence}% confidence
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* AI Enhancement Indicators */}
                  {(matchingResult?.metrics || purchaseOrder.matchingMetrics) && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <BoltIcon className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600 font-medium">
                          {(matchingResult?.metrics || purchaseOrder.matchingMetrics).matchRate || 0}% match rate
                        </span>
                      </div>
                      
                      {((matchingResult?.metrics || purchaseOrder.matchingMetrics).aiEnhancements > 0) && (
                        <div className="flex items-center gap-1">
                          <CpuChipIcon className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            {(matchingResult?.metrics || purchaseOrder.matchingMetrics).aiEnhancements} AI enhanced
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Tracking Dashboard Link */}
              {purchaseOrder.status === 'suppliers_selected' && (
                <button
                  onClick={() => navigate(`/tracking?po=${poId}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <ChartBarIcon className="w-4 h-4" />
                  View Tracking
                </button>
              )}
              
              {/* Enhanced Export Button */}
              <button
                onClick={exportEnhancedReport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export AI Analysis
              </button>
              
              {/* Enhanced Save Button */}
              {hasChanges && (
                <button
                  onClick={saveSupplierSelections}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Saving & Initializing...
                    </>
                  ) : (
                    <>
                      <BookmarkIcon className="w-4 h-4" />
                      Save & Initialize Tracking
                    </>
                  )}
                </button>
              )}
              
              {/* Re-run Enhanced Matching */}
              <button
                onClick={() => handleRefreshMatching()}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    AI Matching...
                  </>
                ) : (
                  <>
                    <CpuChipIcon className="w-4 h-4" />
                    Re-run AI Match
                  </>
                )}
              </button>
              
              {/* Last Save Status */}
              {lastSaveTime && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>Saved: {lastSaveTime.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <nav className="flex items-center gap-2 text-sm text-gray-600">
          <button 
            onClick={() => navigate('/')}
            className="hover:text-gray-900 flex items-center gap-1"
          >
            <HomeIcon className="w-4 h-4" />
            Home
          </button>
          <ChevronRightIcon className="w-4 h-4" />
          <button 
            onClick={() => navigate('/purchase-orders')}
            className="hover:text-gray-900"
          >
            Purchase Orders
          </button>
          <ChevronRightIcon className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Enhanced AI Matching</span>
        </nav>
      </div>

      {/* NEW: Zero Match Warning */}
      {matchingMetrics.matchRate === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-800 mb-2">
                  No Automatic Matches Found
                </h3>
                <p className="text-yellow-700 mb-4">
                  The AI couldn't automatically match PO items with your supplier catalog. 
                  This usually happens when product descriptions lack model numbers or use different terminology.
                </p>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setShowEnhancementModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    🧠 Enhance with AI Suggestions
                  </button>
                  
                  <button 
                    onClick={() => setShowManualMatching(true)}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <HandRaisedIcon className="h-4 w-4 mr-2" />
                    ✋ Manual Matching
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
                  <h4 className="font-medium text-yellow-800 mb-2">What these options do:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li><strong>🧠 AI Enhancement:</strong> Add missing model numbers, brands, etc. to improve matching</li>
                    <li><strong>✋ Manual Matching:</strong> Drag and drop PO items to matching products</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Low Match Warning */}
      {matchingMetrics.matchRate > 0 && matchingMetrics.matchRate < 50 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mr-2" />
              <div className="flex-1">
                <p className="text-orange-700">
                  Low match rate detected. {unmatchedItems.length} items still need matching.
                </p>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowEnhancementModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Enhance
                </button>
                <button 
                  onClick={() => setShowManualMatching(true)}
                  className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                >
                  Manual Match
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Banner for Unsaved Changes with Tracking Info */}
      {hasChanges && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-yellow-800 font-medium">
                  You have {Object.keys(selectedSuppliers).length} enhanced AI selections ready to save.
                </p>
                <p className="text-yellow-700 text-sm">
                  Saving will initialize delivery and payment tracking systems.
                </p>
              </div>
            </div>
            <button
              onClick={saveSupplierSelections}
              disabled={saving}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Saving & Initializing...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Initialize Tracking
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Tracking Status Banner */}
      {purchaseOrder.status === 'suppliers_selected' && !hasChanges && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-medium">
                  Tracking systems are active for this purchase order.
                </p>
                <p className="text-green-700 text-sm">
                  Monitor delivery status and payment progress in the tracking dashboard.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/tracking?po=${poId}`)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              Open Tracking Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {(matchingResult || purchaseOrder.items) ? (
          <SupplierMatchingDisplay
            items={matchingResult?.itemMatches || purchaseOrder.items}
            sourcingPlan={matchingResult?.sourcingPlan || purchaseOrder.sourcingPlan}
            metrics={matchingResult?.metrics || purchaseOrder.matchingMetrics}
            purchaseOrder={purchaseOrder}
            onSupplierSelect={handleSupplierSelection}
            selectedSuppliers={selectedSuppliers}
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Package className="w-12 h-12 text-gray-400 mr-2" />
              <Brain className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Enhanced AI Matching Results
            </h3>
            <p className="text-gray-600 mb-4">
              Run the enhanced AI supplier matching to see intelligent recommendations with machine learning.
            </p>
            <button
              onClick={() => handleRefreshMatching()}
              disabled={refreshing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Running Enhanced AI Matching...
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  Run Enhanced AI Matching
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* NEW: Manual Matching Modal */}
      {showManualMatching && (
        <ManualMatchingInterface
          unmatchedItems={unmatchedItems}
          suppliers={suppliers}
          products={products}
          onSaveManualMatch={handleManualMatch}
          onClose={() => setShowManualMatching(false)}
        />
      )}

      {/* NEW: Enhancement Modal */}
      {showEnhancementModal && (
        <EnhancementSuggestionModal
          items={unmatchedItems.length > 0 ? unmatchedItems : purchaseOrder.items}
          onEnhanceAndRematch={handleEnhanceAndRematch}
          onClose={() => setShowEnhancementModal(false)}
        />
      )}

      {/* NEW: Re-matching Overlay */}
      {isRematching && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                🧠 Enhanced AI Matching
              </h3>
              <p className="text-gray-600">
                Re-analyzing items with enhanced data...
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierMatchingPage;

export default SupplierMatchingPage;
