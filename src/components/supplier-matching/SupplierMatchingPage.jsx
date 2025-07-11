// src/components/supplier-matching/SupplierMatchingPage.jsx
// Enhanced Final Version - Combines working service layer with all AI features
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
  Brain,        // 🆕 Enhanced AI features
  Zap,          // 🆕 Enhanced AI features
  Target,       // 🆕 Enhanced AI features
  TrendingUp,   // 🆕 Enhanced AI features
  Clock,        // 🆕 Enhanced AI features
  FileText      // 🆕 Enhanced AI features
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SupplierMatchingDisplay from './SupplierMatchingDisplay';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { AIExtractionService } from '../../services/ai';

const SupplierMatchingPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  
  // Main state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // 🆕 Enhanced tracking state
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [matchingResult, setMatchingResult] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // Load purchase order data with enhanced features
  const loadPurchaseOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading PO with enhanced AI features:', poId);
      
      const po = await purchaseOrderService.getById(poId);
      
      if (!po) {
        throw new Error('Purchase order not found');
      }

      console.log('✅ Found PO:', po.orderNumber || po.poNumber);
      setPurchaseOrder(po);

      // 🆕 Load existing matching results with enhanced data
      if (po.sourcingPlan || po.matchingMetrics || po.supplierMatching) {
        console.log('📊 Found existing enhanced matching data');
        const existingResult = po.supplierMatching || {
          itemMatches: po.items,
          sourcingPlan: po.sourcingPlan,
          metrics: po.matchingMetrics
        };
        setMatchingResult(existingResult);
        
        // Check for unsaved changes
        checkForUnsavedChanges(po);
      } else {
        console.log('🚀 No matching data found, running enhanced AI matching...');
        await handleRefreshMatching(po, false);
      }
      
      // Load any previously selected suppliers
      const selections = {};
      po.items?.forEach(item => {
        if (item.selectedSupplierId || item.selectedSupplier) {
          selections[item.itemNumber] = item.selectedSupplierId || item.selectedSupplier?.supplierId;
        }
      });
      setSelectedSuppliers(selections);
      
      if (Object.keys(selections).length > 0) {
        console.log('📋 Loaded existing supplier selections:', Object.keys(selections).length);
      }
      
    } catch (err) {
      setError('Failed to load purchase order: ' + err.message);
      console.error('❌ Error loading PO:', err);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    loadPurchaseOrder();
  }, [loadPurchaseOrder]);

  // 🆕 Enhanced unsaved changes detection
  const checkForUnsavedChanges = (po) => {
    if (po.supplierSelections && po.supplierSelections.selectedItems > 0) {
      const lastSaved = po.supplierSelections.lastUpdated;
      if (lastSaved) {
        setLastSaveTime(new Date(lastSaved));
      }
    }
  };

  // 🆕 Enhanced supplier matching with AI improvements
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

      // 🆕 Call enhanced AI extraction service
      const result = await AIExtractionService.rerunSupplierMatching({
        items: po.items,
        documentType: 'client_purchase_order',
        poNumber: po.orderNumber || po.poNumber
      });
      
      if (result.success && result.data) {
        console.log('✅ Enhanced AI matching completed successfully');
        
        // 🆕 Set enhanced matching result
        setMatchingResult(result.data);
        
        // 🆕 Create enhanced PO object
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
        
        // Save the enhanced matching data
        await purchaseOrderService.update(poId, {
          items: updatedPO.items,
          sourcingPlan: result.data.sourcingPlan,
          matchingMetrics: result.data.metrics || result.data.matchingMetrics,
          supplierMatching: result.data,
          lastMatchingUpdate: new Date().toISOString()
        });
        
        console.log('💾 Saved enhanced matching results');
        
        if (showToast) {
          // 🆕 Enhanced success message with metrics
          const metrics = result.data.metrics || result.data.matchingMetrics || {};
          toast.success(
            `🎯 Enhanced AI matching complete! ${metrics.matchRate || 0}% match rate with machine learning`, 
            { id: 'matching', duration: 4000 }
          );

          // 🆕 Show AI enhancement summary
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

  // Handle supplier selection with enhanced tracking
  const handleSupplierSelection = async (itemNumber, supplierId) => {
    try {
      const newSelections = {
        ...selectedSuppliers,
        [itemNumber]: supplierId
      };
      setSelectedSuppliers(newSelections);
      setHasChanges(true);
      
      // Update local state immediately for better UX
      setPurchaseOrder(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.itemNumber === itemNumber 
            ? { ...item, selectedSupplierId: supplierId }
            : item
        )
      }));
      
      // 🆕 Enhanced feedback with AI learning
      toast.success('Supplier selected! 🧠 AI will learn from this choice.');
    } catch (error) {
      toast.error('Failed to select supplier');
      console.error('Selection error:', error);
    }
  };

  // 🆕 Enhanced save with detailed feedback
  const saveSupplierSelections = async () => {
    try {
      setSaving(true);
      
      console.log('💾 Saving enhanced supplier selections...');
      
      // Update items with selected suppliers
      const updatedItems = purchaseOrder.items.map(item => ({
        ...item,
        selectedSupplierId: selectedSuppliers[item.itemNumber] || item.selectedSupplierId
      }));
      
      // 🆕 Calculate enhanced selection summary
      const selectionSummary = calculateSelectionSummary(updatedItems);
      
      await purchaseOrderService.update(poId, {
        items: updatedItems,
        supplierSelections: selectionSummary,
        supplierSelectionsUpdated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      setHasChanges(false);
      setLastSaveTime(new Date());
      
      // 🆕 Enhanced success feedback
      const selectionCount = Object.keys(selectedSuppliers).length;
      const totalItems = purchaseOrder.items?.length || 0;
      
      toast.success(
        `✅ Enhanced selections saved! ${selectionCount}/${totalItems} items with AI optimization`, 
        { duration: 3000 }
      );
      
      // Show AI learning feedback
      setTimeout(() => {
        toast.success('🧠 AI learned from your selections and will improve future matches!', {
          duration: 2000
        });
      }, 1500);
      
      // Reload to ensure data consistency
      await loadPurchaseOrder();
    } catch (error) {
      toast.error('Failed to save enhanced selections');
      console.error('Enhanced save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // 🆕 Calculate enhanced selection summary
  const calculateSelectionSummary = (items) => {
    const selectedItems = items.filter(item => item.selectedSupplierId);
    const totalSavings = selectedItems.reduce((sum, item) => {
      // Calculate savings if we have pricing data
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

  // 🆕 Enhanced selection status calculation
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
    
    const itemsWithSelections = purchaseOrder.items.filter(item => 
      item.selectedSupplierId || selectedSuppliers[item.itemNumber]
    );
    
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

  // 🆕 Enhanced export with AI metrics
  const exportEnhancedReport = async () => {
    try {
      if (!purchaseOrder) return;
      
      console.log('📊 Generating enhanced AI report...');
      
      // Generate enhanced CSV with AI metrics
      const csvData = generateEnhancedCSV();
      
      // Create and download file
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

  // 🆕 Generate enhanced CSV with AI metrics
  const generateEnhancedCSV = () => {
    const headers = [
      'Item #', 'Product Name', 'Product Code', 'Quantity', 'Target Price',
      'Selected Supplier', 'Selected Price', 'Savings Amount', 'Savings %',
      'Lead Time', 'In Stock', 'Match Type', 'Confidence Score', 'AI Enhanced',
      'Match Quality', 'Supplier Rating'
    ];
    
    const rows = [headers];
    
    purchaseOrder.items?.forEach(item => {
      const selected = item.selectedSupplier;
      const selectedId = selectedSuppliers[item.itemNumber];
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
        'Yes', // Assume in stock for selected suppliers
        selected?.matchType || bestMatch?.matchType || 'N/A',
        selected?.confidence || bestMatch?.confidence || 0,
        (selected?.matchType || bestMatch?.matchType)?.includes('enhanced') ? 'Yes' : 'No',
        bestMatch?.matchScore ? Math.round(bestMatch.matchScore * 100) + '%' : 'N/A',
        bestMatch?.supplierRating || 'N/A'
      ];
      rows.push(row);
    });
    
    // 🆕 Add comprehensive enhanced summary
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

  const selectionStatus = getEnhancedSelectionStatus();

  // Loading state with enhanced AI theming
  if (loading) {
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
          <button
            onClick={() => navigate('/purchase-orders')}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 🆕 Enhanced Header with AI Indicators */}
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
                  
                  {/* 🆕 Enhanced Selection Status */}
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
                  
                  {/* 🆕 AI Enhancement Indicators */}
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
              {/* 🆕 Enhanced Export Button */}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Enhanced
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
              
              {/* 🆕 Last Save Status */}
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

      {/* 🆕 Enhanced Success Banner for Unsaved Changes */}
      {hasChanges && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">
                You have {Object.keys(selectedSuppliers).length} enhanced AI selections ready to save.
              </p>
            </div>
            <button
              onClick={saveSupplierSelections}
              disabled={saving}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Enhanced Selections'}
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
    </div>
  );
};

export default SupplierMatchingPage;
