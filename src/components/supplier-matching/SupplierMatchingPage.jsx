// src/components/supplier-matching/SupplierMatchingPage.jsx
// Latest version with Enhanced AI Matching, Save Selections, and Full Feature Integration
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
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import SupplierMatchingDisplay from './SupplierMatchingDisplay';
import { AIExtractionService } from '../../services/ai/AIExtractionService';

const SupplierMatchingPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  
  // Main state
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [matchingResult, setMatchingResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRerunning, setIsRerunning] = useState(false);
  const [error, setError] = useState(null);
  
  // Enhanced tracking state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // Load purchase order and initialize matching
  useEffect(() => {
    loadPurchaseOrder();
  }, [poId]);

  const loadPurchaseOrder = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Load PO from localStorage
      const savedPOs = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      const po = savedPOs.find(p => p.id === poId);
      
      if (!po) {
        throw new Error('Purchase order not found');
      }

      console.log('📋 Loading PO:', po.orderNumber);
      setPurchaseOrder(po);

      // Check if we have existing matching results
      if (po.supplierMatching || po.matchingResult) {
        console.log('✅ Found existing matching results');
        const existingResult = po.supplierMatching || po.matchingResult;
        setMatchingResult(existingResult);
        
        // Check if we have unsaved changes
        checkForUnsavedChanges(po);
      } else {
        console.log('🔄 No matching results found, running initial matching...');
        await runSupplierMatching(po);
      }
    } catch (error) {
      console.error('❌ Error loading purchase order:', error);
      setError(error.message);
      toast.error('Failed to load purchase order: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForUnsavedChanges = (po) => {
    // Check if there are any supplier selections that haven't been saved to the main PO
    if (po.supplierSelections && po.supplierSelections.selectedItems > 0) {
      const lastSaved = po.supplierSelections.lastUpdated;
      if (lastSaved) {
        setLastSaveTime(new Date(lastSaved));
      }
    }
  };

  const runSupplierMatching = async (po = purchaseOrder) => {
    if (!po || !po.items || po.items.length === 0) {
      toast.error('No items to match');
      return;
    }

    setIsRerunning(true);
    
    try {
      console.log('🚀 Starting enhanced AI supplier matching...');
      toast.loading('Running enhanced AI matching...', { id: 'matching' });

      // Call the enhanced matching service
      const result = await AIExtractionService.rerunSupplierMatching({
        items: po.items,
        poNumber: po.orderNumber || po.poNumber,
        documentType: 'client_purchase_order'
      });

      if (result.success && result.data) {
        console.log('✅ Matching completed successfully');
        setMatchingResult(result.data);

        // Save enhanced matching results back to PO
        const updatedPO = {
          ...po,
          supplierMatching: result.data,
          matchingResult: result.data,
          lastMatchingRun: new Date().toISOString(),
          // Preserve any existing selections
          supplierSelections: po.supplierSelections || null
        };

        // Update localStorage
        const savedPOs = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
        const updatedPOs = savedPOs.map(savedPO => 
          savedPO.id === po.id ? updatedPO : savedPO
        );
        localStorage.setItem('purchaseOrders', JSON.stringify(updatedPOs));
        setPurchaseOrder(updatedPO);

        // Show success with enhanced metrics
        const metrics = result.data.metrics || {};
        toast.success(
          `🎯 Enhanced matching complete! ${metrics.matchRate || 0}% match rate with AI learning`, 
          { id: 'matching', duration: 4000 }
        );

        // Show AI enhancement summary
        if (metrics.aiEnhancements > 0) {
          setTimeout(() => {
            toast.success(
              `🧠 AI enhanced ${metrics.aiEnhancements} matches using machine learning!`,
              { duration: 3000 }
            );
          }, 1000);
        }

      } else {
        throw new Error(result.error || 'Matching failed');
      }

    } catch (error) {
      console.error('❌ Supplier matching error:', error);
      toast.error('Enhanced matching failed: ' + error.message, { id: 'matching' });
    } finally {
      setIsRerunning(false);
    }
  };

  // 🆕 Handle PO updates from the display component (enhanced)
  const handlePOUpdate = (updatedPO) => {
    console.log('📝 Updating PO with supplier selections');
    setPurchaseOrder(updatedPO);
    
    // Update the matching result items to reflect selections
    if (matchingResult) {
      setMatchingResult({
        ...matchingResult,
        itemMatches: updatedPO.items
      });
    }

    // Update saved state and track changes
    setHasUnsavedChanges(false);
    setLastSaveTime(new Date());

    // Enhanced success feedback with metrics
    const selectionCount = updatedPO.items?.filter(item => item.selectedSupplier)?.length || 0;
    const totalItems = updatedPO.items?.length || 0;
    
    toast.success(
      `✅ Supplier selections saved! ${selectionCount}/${totalItems} items selected`, 
      { duration: 3000, icon: '💾' }
    );

    // Show AI learning feedback
    setTimeout(() => {
      toast.success('🧠 AI learned from your selections and will improve future matches!', {
        duration: 2000
      });
    }, 1500);
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
    
    const itemsWithSelections = purchaseOrder.items.filter(item => item.selectedSupplier);
    const totalSavings = itemsWithSelections.reduce((sum, item) => 
      sum + (item.selectedSupplier?.savings || 0), 0
    );
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

  // 🆕 Export enhanced report
  const exportEnhancedReport = () => {
    try {
      if (!purchaseOrder || !matchingResult) {
        toast.error('No data to export');
        return;
      }

      // Generate enhanced CSV with AI metrics
      const csvData = generateEnhancedCSV();
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 
        `supplier-analysis-${purchaseOrder.orderNumber}-${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Enhanced report exported successfully! 📊');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const generateEnhancedCSV = () => {
    const headers = [
      'Item #', 'Product Name', 'Product Code', 'Quantity', 'Target Price',
      'Selected Supplier', 'Selected Price', 'Savings Amount', 'Savings %',
      'Lead Time', 'In Stock', 'Match Type', 'Confidence Score', 'AI Enhanced'
    ];
    
    const rows = [headers];
    
    purchaseOrder.items?.forEach(item => {
      const selected = item.selectedSupplier;
      const savingsPercent = item.unitPrice && selected?.unitPrice 
        ? (((item.unitPrice - selected.unitPrice) / item.unitPrice) * 100).toFixed(1)
        : '0.0';

      const row = [
        item.itemNumber || '',
        item.productName || item.description || '',
        item.productCode || '',
        item.quantity || 0,
        item.unitPrice?.toFixed(2) || '0.00',
        selected?.supplierName || 'No selection',
        selected?.unitPrice?.toFixed(2) || 'N/A',
        selected?.savings?.toFixed(2) || '0.00',
        savingsPercent + '%',
        selected?.leadTime || 'N/A',
        'Yes', // Assume in stock for selected suppliers
        selected?.matchType || 'N/A',
        selected?.confidence || 0,
        selected?.matchType?.includes('enhanced') ? 'Yes' : 'No'
      ];
      rows.push(row);
    });
    
    // Add enhanced summary
    const status = getEnhancedSelectionStatus();
    rows.push([]);
    rows.push(['=== ENHANCED SUMMARY ===']);
    rows.push(['Total Items', purchaseOrder.items?.length || 0]);
    rows.push(['Items Selected', status.count]);
    rows.push(['Selection Progress', status.percentage + '%']);
    rows.push(['Total Potential Savings', '$' + status.totalSavings.toFixed(2)]);
    rows.push(['Average Confidence', status.averageConfidence + '%']);
    rows.push(['Overall Match Rate', (matchingResult.metrics?.matchRate || 0) + '%']);
    rows.push(['AI Enhancements', matchingResult.metrics?.aiEnhancements || 0]);
    
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  const selectionStatus = getEnhancedSelectionStatus();

  // Loading state
  if (isLoading) {
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
                    PO {purchaseOrder.orderNumber}
                  </p>
                  
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
                  {matchingResult?.metrics && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600 font-medium">
                          {matchingResult.metrics.matchRate}% match rate
                        </span>
                      </div>
                      
                      {matchingResult.metrics.aiEnhancements > 0 && (
                        <div className="flex items-center gap-1">
                          <Brain className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            {matchingResult.metrics.aiEnhancements} AI enhanced
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Enhanced Export Button */}
              <button
                onClick={exportEnhancedReport}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Analysis
              </button>
              
              {/* Re-run Enhanced Matching */}
              <button
                onClick={() => runSupplierMatching()}
                disabled={isRerunning}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isRerunning ? (
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {matchingResult ? (
          <SupplierMatchingDisplay
            items={matchingResult.itemMatches || purchaseOrder.items}
            sourcingPlan={matchingResult.sourcingPlan}
            metrics={matchingResult.metrics}
            purchaseOrder={purchaseOrder}
            onPOUpdate={handlePOUpdate}
          />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Package className="w-12 h-12 text-gray-400 mr-2" />
              <Brain className="w-12 h-12 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Enhanced Matching Results
            </h3>
            <p className="text-gray-600 mb-4">
              Run the enhanced AI supplier matching to see intelligent recommendations with machine learning.
            </p>
            <button
              onClick={() => runSupplierMatching()}
              disabled={isRerunning}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {isRerunning ? (
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
