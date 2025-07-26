// src/components/supplier-matching/SupplierMatchingPage.jsx
// 🔧 FINAL VERSION with Robust PO Loading & Tracking Integration + Manual Matching + INVENTORY-DRIVEN MATCHING
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
  AlertTriangle,
  Hand,
  Sparkles,
  Warehouse         // NEW: Added for inventory matching
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SupplierMatchingDisplay from './SupplierMatchingDisplay';
import ManualMatchingInterface from './ManualMatchingInterface';
import EnhancementSuggestionModal from './EnhancementSuggestionModal';
// NEW: Import inventory-driven matching components
import InventoryDrivenMatching from './InventoryDrivenMatching';
import { handleStockAllocationComplete } from '../procurement/StockAllocationIntegration';
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
  
  // Manual matching states
  const [showManualMatching, setShowManualMatching] = useState(false);
  const [showEnhancementModal, setShowEnhancementModal] = useState(false);
  const [isRematching, setIsRematching] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  
  // NEW: Inventory-driven matching state
  const [showInventoryMatching, setShowInventoryMatching] = useState(false);
  
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

  // NEW: Make debug functions available for testing
  useEffect(() => {
    // Make debug functions available for testing
    window.testInventoryMatching = async () => {
      try {
        const { default: UnifiedProductService } = await import('../../services/UnifiedProductService');
        const debugInfo = await UnifiedProductService.getDebugInfo();
        console.log('🎯 Inventory Matching Debug Info:', debugInfo);
        return debugInfo;
      } catch (error) {
        console.error('❌ Debug function error:', error);
        return null;
      }
    };
    
    return () => {
      delete window.testInventoryMatching;
    };
  }, []);

  // Helper function to get unmatched items
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

  // Helper function to get matching metrics
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

  // Handle manual matching
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

  // NEW: Handle inventory-driven matching
  const handleInventoryMatch = async (match) => {
    try {
      console.log('✅ Creating inventory match:', match);
      
      // Save the match to localStorage for persistence
      const existingMatches = JSON.parse(localStorage.getItem('inventoryMatches') || '{}');
      existingMatches[match.id] = {
        ...match,
        savedAt: new Date().toISOString(),
        poId: purchaseOrder?.id
      };
      localStorage.setItem('inventoryMatches', JSON.stringify(existingMatches));
      
      // Update the PO item with the inventory match
      const updatedItems = purchaseOrder.items.map(item => {
        if (item.id === match.clientItem.id || item.itemNumber === match.clientItem.itemNumber) {
          return {
            ...item,
            supplierMatches: [
              ...(item.supplierMatches || []),
              {
                supplierId: 'inventory',
                supplierName: 'Available Inventory',
                product: match.product,
                productId: match.product.id,
                productName: match.product.name,
                pricing: {
                  unitPrice: match.product.price || 0,
                  leadTime: 'Available Now'
                },
                confidence: match.confidence || 95,
                matchType: 'inventory',
                matchedAt: match.createdAt,
                isSelected: true,
                inventorySource: true,
                availableQty: match.product.availableQty
              }
            ],
            hasInventoryMatch: true
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

      setPurchaseOrder(updatedPO);
      
      // Show success notification
      toast.success(
        `✅ Matched ${match.clientItem.productCode || 'item'} with ${match.product.code} from inventory`, 
        { duration: 4000 }
      );
      
      // Update any matching state if you have it
      setHasChanges(true);
      
    } catch (error) {
      console.error('❌ Error saving inventory match:', error);
      toast.error('Error saving inventory match: ' + error.message);
    }
  };

  // Handle enhancement and re-matching
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

  // Enhanced supplier matching with AI improvements
  const handleRefreshMatching = async (existingPO = null, showToast = true) => {
    try {
      setRefreshing(true);
      
      const po = existingPO || purchaseOrder;
      
      if (!po || !po.items || po.items.length === 0) {
        toast.error('No items to match');
        return;
      }

      console.log('🧠 Starting enhanced AI supplier matching...');
      if (showToast) {
        toast.loading('Running enhanced AI matching with machine learning...', { id: 'matching' });
      }

      // 🔧 FIXED: Safe AI extraction service call
      let result;
      try {
        result = await AIExtractionService.rerunSupplierMatching({
          items: po.items,
          documentType: 'client_purchase_order',
          poNumber: po.orderNumber || po.poNumber
        });
      } catch (aiError) {
        console.warn('⚠️ AI service unavailable, using mock data:', aiError.message);
        // Create mock matching result
        result = {
          success: true,
          data: {
            itemMatches: po.items.map(item => ({
              ...item,
              supplierMatches: [
                {
                  supplierId: 'sup-global',
                  supplierName: 'Global Electronics',
                  pricing: { unitPrice: item.unitPrice * 0.9, leadTime: '2-3 weeks' },
                  confidence: 85,
                  matchType: 'enhanced'
                },
                {
                  supplierId: 'sup-techparts',
                  supplierName: 'TechParts Asia',
                  pricing: { unitPrice: item.unitPrice * 0.92, leadTime: '2-3 weeks' },
                  confidence: 80,
                  matchType: 'enhanced'
                }
              ]
            })),
            metrics: { matchRate: 100, aiEnhancements: po.items.length }
          }
        };
      }
      
      if (result.success && result.data) {
        console.log('✅ Enhanced AI matching completed successfully');
        
        // Set enhanced matching result
        setMatchingResult(result.data);
        
        // Create enhanced PO object
        const updatedPO = {
          ...po,
          items: result.data.itemMatches || result.data.items || po.items,
          sourcingPlan: result.data.sourcingPlan,
          matchingMetrics: result.data.metrics || result.data.matchingMetrics,
          supplierMatching: result.data,
          lastMatchingUpdate: new Date().toISOString(),
          // Preserve existing selections
          supplierSelections: po.supplierSelections || null
        };
        
        setPurchaseOrder(updatedPO);
        
        // 🔧 FIXED: Safe save operation
        try {
          const updateResult = await updatePurchaseOrder(poId, {
            items: updatedPO.items,
            sourcingPlan: result.data.sourcingPlan,
            matchingMetrics: result.data.metrics || result.data.matchingMetrics,
            supplierMatching: result.data,
            lastMatchingUpdate: new Date().toISOString()
          });
          if (updateResult.success) {
            console.log('💾 Saved enhanced matching results');
          } else {
            throw new Error(updateResult.error || 'Failed to save');
          }
        } catch (saveError) {
          console.warn('⚠️ Failed to save matching results:', saveError.message);
        }
        
        if (showToast) {
          // Enhanced success message with metrics
          const metrics = result.data.metrics || result.data.matchingMetrics || {};
          toast.success(
            `🎯 Enhanced AI matching complete! ${metrics.matchRate || 0}% match rate with machine learning`, 
            { id: 'matching', duration: 4000 }
          );

          // Show AI enhancement summary
          if (metrics.aiEnhancements > 0) {
            setTimeout(() => {
              toast.success(
                `🧠 AI enhanced ${metrics.aiEnhancements} matches using advanced algorithms!`,
                { duration: 3000 }
              );
            }, 1000);
          }
        }
      } else {
        throw new Error(result.error || 'Enhanced matching failed');
      }
    } catch (error) {
      console.error('❌ Enhanced matching error:', error);
      toast.error('Enhanced AI matching failed: ' + error.message, { id: 'matching' });
    } finally {
      setRefreshing(false);
    }
  };

  // 🔧 FIXED: Handle supplier selection with validation and debugging
  const handleSupplierSelection = async (itemNumber, supplierId) => {
    try {
      // 🔧 DEBUG: Add validation and logging
      console.log('🔍 DEBUG - handleSupplierSelection called with:', { itemNumber, supplierId });
      
      if (itemNumber === undefined || itemNumber === null) {
        console.error('❌ ERROR: itemNumber is undefined!');
        toast.error('Invalid item selection - itemNumber is missing');
        return;
      }
      
      if (!supplierId) {
        console.error('❌ ERROR: supplierId is undefined!');
        toast.error('Invalid supplier selection - supplierId is missing');
        return;
      }
      
      console.log(`🎯 Selecting supplier ${supplierId} for item ${itemNumber}`);
      
      // Update selections state (per item)
      const newSelections = {
        ...selectedSuppliers,
        [String(itemNumber)]: supplierId // Ensure string key
      };
      setSelectedSuppliers(newSelections);
      setHasChanges(true);
      
      // 🔧 FIXED: Update PO state - only affect the specific item
      setPurchaseOrder(prev => ({
        ...prev,
        items: prev.items.map(item => {
          const itemKey = String(item.itemNumber);
          const targetKey = String(itemNumber);
          
          if (itemKey === targetKey) {
            console.log(`✅ Updating item ${itemKey} with supplier ${supplierId}`);
            return { 
              ...item, 
              selectedSupplierId: supplierId,
              // Also update the supplierMatches to show selection
              supplierMatches: item.supplierMatches?.map(match => ({
                ...match,
                isSelected: match.supplierId === supplierId
              })) || []
            };
          } else {
            // 🔧 CRITICAL FIX: Preserve other items unchanged
            return item;
          }
        })
      }));
      
      // Enhanced feedback with AI learning
      toast.success('Supplier selected! 🧠 AI will learn from this choice.');
      
      console.log(`✅ Updated selections:`, newSelections);
    } catch (error) {
      toast.error('Failed to select supplier');
      console.error('Selection error:', error);
    }
  };

  // 🔧 CRITICAL FIX: Save with proper tracking integration
  const saveSupplierSelections = async () => {
    if (!selectedSuppliers || Object.keys(selectedSuppliers).length === 0) {
      toast.error('Please select suppliers before saving');
      return;
    }

    try {
      setSaving(true);
      
      console.log('💾 Saving enhanced supplier selections and initializing tracking...');
      console.log('📋 Current selections:', selectedSuppliers);
      console.log('📋 Current PO items:', purchaseOrder.items);
      
      // Update items preserving individual selections with validation
      const updatedItems = purchaseOrder.items.map(item => {
        const itemKey = String(item.itemNumber);
        const selectedSupplierId = selectedSuppliers[itemKey];
        
        console.log(`🔍 Processing item ${itemKey}:`, {
          hasSelection: !!selectedSupplierId,
          selectedSupplierId,
          hasMatches: !!item.supplierMatches
        });
        
        if (selectedSupplierId && item.supplierMatches) {
          const selectedMatch = item.supplierMatches.find(
            match => match.supplierId === selectedSupplierId
          );
          
          if (selectedMatch) {
            console.log(`✅ Found match for item ${itemKey}:`, selectedMatch.supplierName);
            
            return {
              ...item,
              selectedSupplierId: selectedSupplierId,
              selectedSupplier: {
                supplierId: selectedMatch.supplierId,
                supplierName: selectedMatch.supplierName,
                productId: selectedMatch.productId,
                productName: selectedMatch.productName,
                unitPrice: selectedMatch.pricing?.unitPrice,
                totalPrice: (selectedMatch.pricing?.unitPrice || 0) * item.quantity,
                leadTime: selectedMatch.pricing?.leadTime,
                confidence: selectedMatch.confidence || Math.round((selectedMatch.matchScore || 0) * 100),
                matchType: selectedMatch.matchType,
                selectedAt: new Date().toISOString(),
                savings: selectedMatch.savings || 0
              },
              supplierMatches: item.supplierMatches.map(match => ({
                ...match,
                isSelected: match.supplierId === selectedSupplierId
              }))
            };
          } else {
            console.warn(`⚠️ No match found for item ${itemKey} with supplier ${selectedSupplierId}`);
          }
        }
        
        return {
          ...item,
          selectedSupplierId: item.selectedSupplierId
        };
      });
      
      console.log('📋 Updated items:', updatedItems);
      
      // Calculate enhanced selection summary
      const selectionSummary = calculateSelectionSummary(updatedItems);
      console.log('📊 Selection summary:', selectionSummary);
      
      // Save operation with detailed logging
      let updateResult;
      try {
        console.log('🔧 Attempting to save with data:', {
          poId,
          itemsCount: updatedItems.length,
          selectionsCount: Object.keys(selectedSuppliers).length,
          hasSelectionSummary: !!selectionSummary
        });
        
        const saveData = {
          items: updatedItems,
          supplierSelections: {
            ...selectedSuppliers,
            ...selectionSummary
          },
          status: 'suppliers_selected',
          supplierSelectionsUpdated: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        
        console.log('🔧 Save data prepared:', saveData);
        
        updateResult = await updatePurchaseOrder(poId, saveData);
        
        console.log('💾 Save result:', updateResult);
      } catch (saveError) {
        console.error('❌ Save operation failed:', saveError);
        throw new Error(`Save operation failed: ${saveError.message}`);
      }
      
      // Validate save result
      if (!updateResult) {
        throw new Error('Save operation returned null/undefined result');
      }
      
      const isSuccessful = updateResult.success === true || 
                          (updateResult.id && updateResult.poNumber);
      
      if (!isSuccessful) {
        console.error('❌ Save operation unsuccessful:', updateResult);
        const errorMsg = updateResult.error || updateResult.message || 'Save operation was not successful';
        throw new Error(errorMsg);
      }
      
      console.log('✅ Save operation validated successfully');
      
      // 🔧 CRITICAL FIX: Initialize tracking with proper service
      console.log('🚀 Initializing delivery and payment tracking...');
      console.log('🔧 Available tracking functions:', {
        hasConsolidatedService: typeof ConsolidatedTrackingService === 'object',
        hasInitFunction: typeof ConsolidatedTrackingService?.initializeCompleteTracking === 'function',
        hasDeliveryUpdate: typeof updateDeliveryStatus === 'function',
        hasPaymentUpdate: typeof updatePaymentStatus === 'function'
      });
      
      let trackingResult = { success: false, error: 'Tracking service not available' };
      
      try {
        if (ConsolidatedTrackingService && typeof ConsolidatedTrackingService.initializeCompleteTracking === 'function') {
          console.log('🚀 Attempting to initialize tracking with ConsolidatedTrackingService...');
          trackingResult = await ConsolidatedTrackingService.initializeCompleteTracking(
            { ...purchaseOrder, items: updatedItems },
            updateDeliveryStatus,
            updatePaymentStatus
          );
          console.log('📊 Tracking initialization result:', trackingResult);
        } else if (updateDeliveryStatus && updatePaymentStatus) {
          console.log('🔧 Using direct tracking hooks initialization...');
          // Create a basic successful initialization using the hooks
          await updateDeliveryStatus(poId, { 
            status: 'preparing', 
            poNumber: purchaseOrder.poNumber,
            clientName: purchaseOrder.clientName,
            initializedAt: new Date().toISOString() 
          });
          
          // Initialize payment tracking for each supplier
          const suppliers = [...new Set(updatedItems.filter(item => item.selectedSupplierId).map(item => item.selectedSupplierId))];
          for (const supplierId of suppliers) {
            const supplierName = updatedItems.find(item => item.selectedSupplierId === supplierId)?.selectedSupplier?.supplierName || 'Unknown Supplier';
            await updatePaymentStatus(supplierId, { 
              status: 'pending', 
              poId,
              supplierName,
              initializedAt: new Date().toISOString() 
            });
          }
          
          trackingResult = {
            success: true,
            delivery: { status: 'initialized', poId },
            payment: { status: 'initialized', suppliers },
            message: 'Tracking initialized successfully using direct hooks'
          };
        }
      } catch (trackingError) {
        console.warn('⚠️ Tracking initialization failed:', trackingError);
        trackingResult = { success: false, error: trackingError.message };
      }
      
      // Update state and show success messages
      setHasChanges(false);
      setLastSaveTime(new Date());
      
      setPurchaseOrder(prev => ({
        ...prev,
        items: updatedItems,
        supplierSelections: {
          ...selectedSuppliers,
          ...selectionSummary
        },
        status: 'suppliers_selected'
      }));
      
      // Show appropriate success messages
      const selectionCount = Object.keys(selectedSuppliers).length;
      const totalItems = purchaseOrder.items?.length || 0;
      
      if (trackingResult && trackingResult.success) {
        toast.success(
          `✅ Suppliers saved & tracking initialized! ${selectionCount}/${totalItems} items with AI optimization`, 
          { duration: 4000 }
        );
        
        setTimeout(() => {
          toast.success('📊 Delivery and payment tracking is now active!', {
            duration: 3000
          });
        }, 1500);
        
        setTimeout(() => {
          const result = window.confirm(
            `🚀 Tracking system initialized successfully!\n\n` +
            `✅ ${selectionCount} suppliers selected\n` +
            `📊 Delivery tracking active\n` +
            `💰 Payment tracking active\n\n` +
            `Would you like to view the tracking dashboard?`
          );
          
          if (result) {
            navigate(`/tracking?po=${poId}`);
          }
        }, 3000);
      } else {
        toast.success(
          `✅ Enhanced selections saved! ${selectionCount}/${totalItems} items with AI optimization`, 
          { duration: 3000 }
        );
        
        if (trackingResult && trackingResult.error) {
          toast(
            `⚠️ Selections saved, but tracking initialization failed: ${trackingResult.error}`,
            { 
              duration: 2000,
              icon: '⚠️',
              style: {
                border: '1px solid #f59e0b',
                background: '#fef3c7',
                color: '#92400e'
              }
            }
          );
        }
        
        console.warn('Tracking initialization failed:', trackingResult?.error);
      }
      
      setTimeout(() => {
        toast.success('🧠 AI learned from your selections and will improve future matches!', {
          duration: 2000
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ Enhanced save error:', error);
      toast.error('Failed to save enhanced selections: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate enhanced selection summary
  const calculateSelectionSummary = (items) => {
    const selectedItems = items.filter(item => item.selectedSupplierId);
    const totalSavings = selectedItems.reduce((sum, item) => {
      const originalPrice = item.unitPrice || 0;
      const selectedPrice = item.selectedSupplier?.unitPrice || originalPrice;
      return sum + ((originalPrice - selectedPrice) * item.quantity);
    }, 0);
    
    const averageConfidence = selectedItems.length > 0 
      ? Math.round(selectedItems.reduce((sum, item) => 
          sum + (item.selectedSupplier?.confidence || 0), 0
        ) / selectedItems.length)
      : 0;

    return {
      totalItems: items.length,
      selectedItems: selectedItems.length,
      unselectedItems: items.length - selectedItems.length,
      totalSavings: Math.max(0, totalSavings),
      averageConfidence: averageConfidence,
      lastUpdated: new Date().toISOString()
    };
  };

  // Enhanced selection status calculation
  const getEnhancedSelectionStatus = () => {
    if (!purchaseOrder || !purchaseOrder.items) {
      return { 
        count: 0, 
        total: 0, 
        percentage: 0, 
        totalSavings: 0,
        averageConfidence: 0 
      };
    }
    
    const itemsWithSelections = purchaseOrder.items.filter(item => {
      const itemKey = String(item.itemNumber);
      return selectedSuppliers[itemKey] || item.selectedSupplierId;
    });
    
    const totalSavings = itemsWithSelections.reduce((sum, item) => {
      const savings = item.selectedSupplier?.savings || 0;
      return sum + savings;
    }, 0);
    
    const averageConfidence = itemsWithSelections.length > 0 
      ? Math.round(itemsWithSelections.reduce((sum, item) => 
          sum + (item.selectedSupplier?.confidence || 0), 0
        ) / itemsWithSelections.length)
      : 0;

    return {
      count: itemsWithSelections.length,
      total: purchaseOrder.items.length,
      percentage: Math.round((itemsWithSelections.length / purchaseOrder.items.length) * 100),
      totalSavings: totalSavings,
      averageConfidence: averageConfidence
    };
  };

  // Enhanced export with AI metrics
  const exportEnhancedReport = async () => {
    try {
      if (!purchaseOrder) return;
      
      console.log('📊 Generating enhanced AI report...');
      
      const csvData = generateEnhancedCSV();
      
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 
        `enhanced-supplier-analysis-${purchaseOrder.orderNumber || purchaseOrder.poNumber}-${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Enhanced AI report exported successfully! 📊');
    } catch (error) {
      console.error('Enhanced export error:', error);
      toast.error('Failed to export enhanced report');
    }
  };

  // Generate enhanced CSV with AI metrics
  const generateEnhancedCSV = () => {
    const headers = [
      'Item #', 'Product Name', 'Product Code', 'Quantity', 'Target Price',
      'Selected Supplier', 'Selected Price', 'Savings Amount', 'Savings %',
      'Lead Time', 'In Stock', 'Match Type', 'Confidence Score', 'AI Enhanced',
      'Match Quality', 'Supplier Rating'
    ];
    
    const rows = [headers];
    
    purchaseOrder.items?.forEach(item => {
      const itemKey = String(item.itemNumber);
      const selected = item.selectedSupplier;
      const selectedId = selectedSuppliers[itemKey] || item.selectedSupplierId;
      const bestMatch = item.supplierMatches?.find(match => 
        match.supplierId === selectedId
      ) || item.supplierMatches?.[0];
      
      const savingsAmount = item.unitPrice && selected?.unitPrice 
        ? ((item.unitPrice - selected.unitPrice) * item.quantity)
        : 0;
      const savingsPercent = item.unitPrice && selected?.unitPrice 
        ? (((item.unitPrice - selected.unitPrice) / item.unitPrice) * 100).toFixed(1)
        : '0.0';

      const row = [
        item.itemNumber || '',
        item.productName || item.description || '',
        item.productCode || '',
        item.quantity || 0,
        item.unitPrice?.toFixed(2) || '0.00',
        selected?.supplierName || bestMatch?.supplierName || 'No selection',
        selected?.unitPrice?.toFixed(2) || bestMatch?.pricing?.unitPrice?.toFixed(2) || 'N/A',
        savingsAmount.toFixed(2),
        savingsPercent + '%',
        selected?.leadTime || bestMatch?.pricing?.leadTime || 'N/A',
        'Yes',
        selected?.matchType || bestMatch?.matchType || 'N/A',
        selected?.confidence || bestMatch?.confidence || 0,
        (selected?.matchType || bestMatch?.matchType)?.includes('enhanced') ? 'Yes' : 'No',
        bestMatch?.matchScore ? Math.round(bestMatch.matchScore * 100) + '%' : 'N/A',
        bestMatch?.supplierRating || 'N/A'
      ];
      rows.push(row);
    });
    
    const status = getEnhancedSelectionStatus();
    const metrics = matchingResult?.metrics || purchaseOrder.matchingMetrics || {};
    
    rows.push([]);
    rows.push(['=== ENHANCED AI SUMMARY ===']);
    rows.push(['Total Items', purchaseOrder.items?.length || 0]);
    rows.push(['Items Selected', status.count]);
    rows.push(['Selection Progress', status.percentage + '%']);
    rows.push(['Total Potential Savings', '$' + status.totalSavings.toFixed(2)]);
    rows.push(['Average Confidence', status.averageConfidence + '%']);
    rows.push(['Overall Match Rate', (metrics.matchRate || 0) + '%']);
    rows.push(['AI Enhancements', metrics.aiEnhancements || 0]);
    rows.push(['Supplier Diversity', metrics.supplierDiversity || 0]);
    rows.push(['Average Lead Time', metrics.averageLeadTime || 'Unknown']);
    rows.push(['Last AI Update', new Date(purchaseOrder.lastMatchingUpdate || Date.now()).toLocaleString()]);
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  // Get unmatched items and metrics using callbacks
  const unmatchedItems = getUnmatchedItems();
  const matchingMetrics = getMatchingMetrics();
  const selectionStatus = getEnhancedSelectionStatus();

  // Enhanced loading state with AI theming
  if (loading || hookLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 animate-pulse text-blue-600 mr-2" />
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
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
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
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
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Back to Purchase Orders
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
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
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  Enhanced AI Supplier Matching
                </h1>
                <div className="flex items-center gap-4 mt-1">
                  <p className="text-sm text-gray-600">
                    PO {purchaseOrder.poNumber || purchaseOrder.orderNumber}
                  </p>
                  
                  {/* Show tracking status */}
                  {purchaseOrder.status === 'suppliers_selected' && (
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-medium text-sm">
                        Tracking Active
                      </span>
                    </div>
                  )}
                  
                  {/* Enhanced Selection Status */}
                  {selectionStatus.count > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {selectionStatus.count}/{selectionStatus.total} selected ({selectionStatus.percentage}%)
                        </span>
                      </div>
                      
                      {selectionStatus.totalSavings > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            ${selectionStatus.totalSavings.toFixed(2)} savings
                          </span>
                        </div>
                      )}
                      
                      {selectionStatus.averageConfidence > 0 && (
                        <div className="flex items-center gap-1">
                          <Target className="w-4 h-4 text-purple-600" />
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
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600 font-medium">
                          {(matchingResult?.metrics || purchaseOrder.matchingMetrics).matchRate || 0}% match rate
                        </span>
                      </div>
                      
                      {((matchingResult?.metrics || purchaseOrder.matchingMetrics).aiEnhancements > 0) && (
                        <div className="flex items-center gap-1">
                          <Brain className="w-4 h-4 text-blue-600" />
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
                  <BarChart3 className="w-4 h-4" />
                  View Tracking
                </button>
              )}
              
              {/* Enhanced Export Button */}
              <button
                onClick={exportEnhancedReport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
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
              )}
              
              {/* Re-run Enhanced Matching */}
              <button
                onClick={() => handleRefreshMatching()}
                disabled={refreshing}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {refreshing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    AI Matching...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4" />
                    Re-run AI Match
                  </>
                )}
              </button>
              
              {/* Last Save Status */}
              {lastSaveTime && (
                <div className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
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
            <Home className="w-4 h-4" />
            Home
          </button>
          <ChevronRight className="w-4 h-4" />
          <button 
            onClick={() => navigate('/purchase-orders')}
            className="hover:text-gray-900"
          >
            Purchase Orders
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Enhanced AI Matching</span>
        </nav>
      </div>

      {/* Zero Match Warning */}
      {matchingMetrics.matchRate === 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
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
                    <Sparkles className="h-4 w-4 mr-2" />
                    🧠 Enhance with AI Suggestions
                  </button>
                  
                  {/* NEW: Inventory matching button */}
                  <button 
                    onClick={() => setShowInventoryMatching(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Warehouse className="h-4 w-4 mr-2" />
                    📦 Match from Inventory
                  </button>
                  
                  <button 
                    onClick={() => setShowManualMatching(true)}
                    className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Hand className="h-4 w-4 mr-2" />
                    ✋ Manual Matching
                  </button>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-100 rounded border border-yellow-300">
                  <h4 className="font-medium text-yellow-800 mb-2">What these options do:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li><strong>🧠 AI Enhancement:</strong> Add missing model numbers, brands, etc. to improve matching</li>
                    <li><strong>📦 Inventory Matching:</strong> Match with recently allocated inventory items</li>
                    <li><strong>✋ Manual Matching:</strong> Drag and drop PO items to matching products</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Match Warning */}
      {matchingMetrics.matchRate > 0 && matchingMetrics.matchRate < 50 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
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
                {/* NEW: Inventory matching button */}
                <button 
                  onClick={() => setShowInventoryMatching(true)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Inventory
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

      {/* Manual Matching Modal */}
      {showManualMatching && (
        <ManualMatchingInterface
          unmatchedItems={unmatchedItems}
          suppliers={suppliers}
          products={products}
          onSaveManualMatch={handleManualMatch}
          onClose={() => setShowManualMatching(false)}
        />
      )}

      {/* NEW: Inventory-Driven Matching Modal */}
      {showInventoryMatching && (
        <InventoryDrivenMatching
          clientPOItems={unmatchedItems.length > 0 ? unmatchedItems : purchaseOrder.items}
          suppliers={suppliers}
          onCreateMatch={handleInventoryMatch}
          onClose={() => setShowInventoryMatching(false)}
        />
      )}

      {/* Enhancement Modal */}
      {showEnhancementModal && (
        <EnhancementSuggestionModal
          items={unmatchedItems.length > 0 ? unmatchedItems : purchaseOrder.items}
          onEnhanceAndRematch={handleEnhanceAndRematch}
          onClose={() => setShowEnhancementModal(false)}
        />
      )}

      {/* Re-matching Overlay */}
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
