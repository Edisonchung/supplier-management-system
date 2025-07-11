// src/components/supplier-matching/SupplierMatchingDisplay.jsx
// Updated with enhanced matching features and Save Selections functionality

import React, { useState, useEffect } from 'react';
import { SupplierMatcher } from '../../services/ai/SupplierMatcher';
import { toast } from 'react-hot-toast';
import { 
  Building2, 
  TrendingDown, 
  Clock, 
  Star, 
  Package, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  X,
  DollarSign,
  Truck,
  Shield,
  Info,
  Brain,     
  Zap,       
  Target,    
  CreditCard,
  Save,      // 🆕 NEW IMPORT
  Download,  // 🆕 NEW IMPORT
  History    // 🆕 NEW IMPORT
} from 'lucide-react';

const SupplierMatchingDisplay = ({ items, sourcingPlan, metrics, purchaseOrder, onPOUpdate }) => {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const [activeTab, setActiveTab] = useState('overview');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 🆕 Load existing selections when component mounts
  useEffect(() => {
    if (purchaseOrder && items) {
      loadExistingSelections();
    }
  }, [purchaseOrder, items]);

  // 🆕 Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(Object.keys(selectedSuppliers).length > 0);
  }, [selectedSuppliers]);

  // 🆕 Load previously saved supplier selections
  const loadExistingSelections = () => {
    const selections = {};
    
    items.forEach(item => {
      // Check if item already has a selected supplier
      if (item.selectedSupplier) {
        selections[item.itemNumber] = item.selectedSupplier.supplierId || item.selectedSupplier.id;
      }
      // Also check in the supplierMatches for previously selected ones
      else if (item.supplierMatches) {
        const previouslySelected = item.supplierMatches.find(match => match.isSelected);
        if (previouslySelected) {
          selections[item.itemNumber] = previouslySelected.supplierId;
        }
      }
    });
    
    setSelectedSuppliers(selections);
    console.log('📋 Loaded existing selections:', Object.keys(selections).length, 'items');
  };

  const toggleItemExpansion = (itemNumber) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemNumber)) {
      newExpanded.delete(itemNumber);
    } else {
      newExpanded.add(itemNumber);
    }
    setExpandedItems(newExpanded);
  };

  const selectSupplier = (itemNumber, supplierId, supplierMatch = null) => {
    setSelectedSuppliers(prev => ({
      ...prev,
      [itemNumber]: supplierId
    }));

    // Record selection for AI learning
    if (supplierMatch) {
      try {
        const item = items.find(i => i.itemNumber === itemNumber);
        if (item) {
          SupplierMatcher.recordSelection(item, supplierMatch);
          toast.success('Selection recorded! 🧠 AI will learn from this choice.', { 
            duration: 3000,
            icon: '🎯'
          });
        }
      } catch (error) {
        console.error('Failed to record selection:', error);
      }
    }
  };

  // 🆕 Save all supplier selections to PO
  const saveSupplierSelections = async () => {
    if (Object.keys(selectedSuppliers).length === 0) {
      toast.error('No supplier selections to save');
      return;
    }

    setIsSaving(true);

    try {
      console.log('💾 Saving supplier selections...');

      // Create updated items with supplier selections
      const updatedItems = items.map(item => {
        const selectedSupplierId = selectedSuppliers[item.itemNumber];
        
        if (selectedSupplierId && item.supplierMatches) {
          // Find the selected supplier match
          const selectedMatch = item.supplierMatches.find(
            match => match.supplierId === selectedSupplierId
          );

          if (selectedMatch) {
            return {
              ...item,
              selectedSupplier: {
                supplierId: selectedMatch.supplierId,
                supplierName: selectedMatch.supplierName,
                productId: selectedMatch.productId,
                productName: selectedMatch.productName,
                unitPrice: selectedMatch.pricing.unitPrice,
                totalPrice: selectedMatch.pricing.unitPrice * item.quantity,
                leadTime: selectedMatch.pricing.leadTime,
                confidence: selectedMatch.confidence || Math.round(selectedMatch.matchScore * 100),
                matchType: selectedMatch.matchType,
                selectedAt: new Date().toISOString(),
                savings: selectedMatch.savings || 0
              },
              // Mark this supplier as selected in the matches
              supplierMatches: item.supplierMatches.map(match => ({
                ...match,
                isSelected: match.supplierId === selectedSupplierId
              }))
            };
          }
        }

        return item;
      });

      // Calculate selection summary
      const selectionSummary = {
        totalItems: items.length,
        selectedItems: Object.keys(selectedSuppliers).length,
        unselectedItems: items.length - Object.keys(selectedSuppliers).length,
        totalSavings: updatedItems.reduce((sum, item) => 
          sum + (item.selectedSupplier?.savings || 0), 0
        ),
        averageConfidence: Math.round(
          updatedItems.filter(item => item.selectedSupplier)
            .reduce((sum, item) => sum + (item.selectedSupplier.confidence || 0), 0) /
          Object.keys(selectedSuppliers).length
        ),
        lastUpdated: new Date().toISOString()
      };

      // Create updated PO object
      const updatedPO = {
        ...purchaseOrder,
        items: updatedItems,
        supplierSelections: {
          ...selectionSummary,
          selections: Object.keys(selectedSuppliers).map(itemNumber => ({
            itemNumber,
            supplierId: selectedSuppliers[itemNumber],
            selectedAt: new Date().toISOString()
          }))
        },
        status: 'suppliers_selected',
        lastModified: new Date().toISOString()
      };

      // Save to localStorage (you can replace with Firestore later)
      const savedPOs = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      const updatedPOs = savedPOs.map(po => 
        po.id === purchaseOrder.id ? updatedPO : po
      );
      localStorage.setItem('purchaseOrders', JSON.stringify(updatedPOs));

      // Call parent update function if provided
      if (onPOUpdate) {
        onPOUpdate(updatedPO);
      }

      // Clear unsaved changes
      setHasUnsavedChanges(false);

      // Success notification
      toast.success(
        `Saved ${Object.keys(selectedSuppliers).length} supplier selections! 💾`,
        { 
          duration: 4000,
          icon: '✅'
        }
      );

      console.log('✅ Supplier selections saved successfully:', selectionSummary);

    } catch (error) {
      console.error('❌ Failed to save supplier selections:', error);
      toast.error('Failed to save selections. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🆕 Clear all selections
  const clearAllSelections = () => {
    setSelectedSuppliers({});
    setHasUnsavedChanges(false);
    toast.info('All selections cleared', { duration: 2000 });
  };

  // 🆕 Export selections as CSV
  const exportSelections = () => {
    if (Object.keys(selectedSuppliers).length === 0) {
      toast.error('No selections to export');
      return;
    }

    try {
      const csvData = generateSelectionsCSV();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `supplier-selections-${purchaseOrder?.orderNumber || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Selections exported to CSV!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export selections');
    }
  };

  // 🆕 Generate CSV data for selections
  const generateSelectionsCSV = () => {
    const headers = [
      'Item Number',
      'Product Code', 
      'Description',
      'Quantity',
      'Original Price',
      'Selected Supplier',
      'Selected Price',
      'Total Cost',
      'Savings %',
      'Lead Time',
      'Confidence',
      'Match Type',
      'Selection Date'
    ];

    const rows = items
      .filter(item => selectedSuppliers[item.itemNumber])
      .map(item => {
        const selectedMatch = item.supplierMatches?.find(
          match => match.supplierId === selectedSuppliers[item.itemNumber]
        );

        return [
          item.itemNumber,
          item.productCode || '',
          item.productName || item.description,
          item.quantity,
          `$${item.unitPrice?.toFixed(2) || '0.00'}`,
          selectedMatch?.supplierName || '',
          `$${selectedMatch?.pricing.unitPrice?.toFixed(2) || '0.00'}`,
          `$${((selectedMatch?.pricing.unitPrice || 0) * item.quantity).toFixed(2)}`,
          `${selectedMatch?.savings?.toFixed(1) || '0'}%`,
          selectedMatch?.pricing.leadTime || '',
          `${selectedMatch?.confidence || Math.round((selectedMatch?.matchScore || 0) * 100)}%`,
          selectedMatch?.matchType || '',
          new Date().toISOString().split('T')[0]
        ];
      });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  };

  // 🆕 Get selection statistics
  const getSelectionStats = () => {
    const selectedCount = Object.keys(selectedSuppliers).length;
    const totalCount = items.length;
    const selectedItems = items.filter(item => selectedSuppliers[item.itemNumber]);
    
    const totalSavings = selectedItems.reduce((sum, item) => {
      const selectedMatch = item.supplierMatches?.find(
        match => match.supplierId === selectedSuppliers[item.itemNumber]
      );
      return sum + (selectedMatch?.savings || 0);
    }, 0);

    const averageConfidence = selectedItems.length > 0
      ? selectedItems.reduce((sum, item) => {
          const selectedMatch = item.supplierMatches?.find(
            match => match.supplierId === selectedSuppliers[item.itemNumber]
          );
          return sum + (selectedMatch?.confidence || Math.round((selectedMatch?.matchScore || 0) * 100));
        }, 0) / selectedItems.length
      : 0;

    return {
      selectedCount,
      totalCount,
      percentage: Math.round((selectedCount / totalCount) * 100),
      totalSavings,
      averageConfidence: Math.round(averageConfidence)
    };
  };

  const stats = getSelectionStats();

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>No items to match with suppliers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'overview' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'items' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Item Matches ({metrics?.itemsWithMatches || 0})
        </button>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 py-2 px-4 rounded-md transition-colors ${
            activeTab === 'suppliers' 
              ? 'bg-white shadow-sm text-blue-600 font-medium' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Suppliers ({sourcingPlan?.recommendedSuppliers?.length || 0})
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Enhanced Metrics Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Supplier Matching Summary</h3>
              <div className="flex items-center gap-2">
                {metrics?.matchRate && (
                  <span className="text-sm font-medium text-green-600">
                    {metrics.matchRate}% Match Rate (Enhanced)
                  </span>
                )}
                
                {metrics?.improvements?.synonymMatchCount > 0 && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    🧠 {metrics.improvements.synonymMatchCount} AI matches
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="text-green-600 w-6 h-6" />
                  <span className="text-xs text-green-600 font-medium">
                    {metrics?.potentialSavingsPercent?.toFixed(1) || '0'}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">Potential Savings</p>
                <p className="text-xl font-bold text-gray-900">
                  ${metrics?.potentialSavings?.toFixed(2) || '0.00'}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <Clock className="text-blue-600 w-6 h-6 mb-2" />
                <p className="text-sm text-gray-600">Avg Lead Time</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.averageLeadTime || 'Unknown'}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="text-purple-600 w-6 h-6" />
                  <span className="text-xs text-purple-600 font-medium">AI</span>
                </div>
                <p className="text-sm text-gray-600">Synonym Matches</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.improvements?.synonymMatchCount || 0}
                </p>
              </div>
              
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <Zap className="text-orange-600 w-6 h-6 mb-2" />
                <p className="text-sm text-gray-600">High Confidence</p>
                <p className="text-xl font-bold text-gray-900">
                  {metrics?.improvements?.highConfidenceRate || 0}%
                </p>
              </div>
            </div>

            {/* AI Enhancement Summary */}
            {metrics?.improvements && (
              <div className="mt-6 p-4 bg-white rounded-lg border border-purple-100">
                <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  AI Enhancement Details
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {metrics.improvements.synonymMatchCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">Synonym Matches</div>
                    <div className="text-xs text-purple-600 mt-1">AI found variations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">
                      {metrics.improvements.learnedMatchCount || 0}
                    </div>
                    <div className="text-xs text-gray-600">Learned Matches</div>
                    <div className="text-xs text-green-600 mt-1">From user selections</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">
                      {metrics.improvements.averageMatchesPerItem || 0}
                    </div>
                    <div className="text-xs text-gray-600">Avg Options/Item</div>
                    <div className="text-xs text-blue-600 mt-1">More choices</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600">
                      {metrics.improvements.highConfidenceRate || 0}%
                    </div>
                    <div className="text-xs text-gray-600">High Confidence</div>
                    <div className="text-xs text-indigo-600 mt-1">Reliable matches</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Your existing Sourcing Strategies section */}
          {sourcingPlan?.sourcingStrategies && sourcingPlan.sourcingStrategies.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recommended Sourcing Strategies</h3>
              <div className="space-y-4">
                {sourcingPlan.sourcingStrategies.map((strategy, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium text-gray-900">{strategy.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">{strategy.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-green-600">Savings: {strategy.estimatedSavings}</span>
                      {strategy.pros && (
                        <span className="text-gray-500">
                          Pros: {strategy.pros.length} | Cons: {strategy.cons.length}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your existing Timeline & Critical Path section */}
          {sourcingPlan?.timeline && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Timeline & Critical Items</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <span className="font-medium">Order Placement Deadline</span>
                  <span className={`font-bold ${
                    sourcingPlan.timeline.orderPlacementDeadline?.includes('URGENT') 
                      ? 'text-red-600' 
                      : 'text-gray-900'
                  }`}>
                    {sourcingPlan.timeline.orderPlacementDeadline}
                  </span>
                </div>
                
                {sourcingPlan.timeline.criticalPath && sourcingPlan.timeline.criticalPath.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Critical Path Items:</p>
                    <div className="space-y-1">
                      {sourcingPlan.timeline.criticalPath.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm p-2 bg-red-50 rounded">
                          <span>{item.productName}</span>
                          <span className="text-red-600 font-medium">{item.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Item-by-Item Supplier Matches</h3>
            <p className="text-sm text-gray-600 mt-1">
              Click on items to see detailed supplier options
            </p>
          </div>
          <div className="divide-y divide-gray-200">
            {items.map((item) => (
              <div key={item.itemNumber} className="p-4">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -m-4 p-4"
                  onClick={() => toggleItemExpansion(item.itemNumber)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.productName}</span>
                      {item.productCode && (
                        <span className="text-sm text-gray-500">({item.productCode})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>Qty: {item.quantity} {item.uom}</span>
                      <span>Target: ${item.unitPrice?.toFixed(2) || '0.00'}/unit</span>
                      <span className="font-medium">Total: ${item.totalPrice?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.supplierMatches && item.supplierMatches.length > 0 ? (
                      <>
                        <div className="flex items-center gap-2">
                          {item.supplierMatches[0].matchType === 'synonym_match' && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              🧠 AI
                            </span>
                          )}
                          {item.supplierMatches[0].matchType === 'exact_match' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                              🎯 Exact
                            </span>
                          )}
                          
                          {item.supplierMatches[0].confidence && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.supplierMatches[0].confidence >= 90 ? 'bg-green-100 text-green-700' :
                              item.supplierMatches[0].confidence >= 70 ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {item.supplierMatches[0].confidence}%
                            </span>
                          )}
                          
                          {item.supplierMatches[0].isLearned && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                              📚
                            </span>
                          )}
                        </div>

                        <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                          {item.supplierMatches.length} matches
                        </span>
                        {item.bestMatch && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                            Save ${((item.unitPrice - item.bestMatch.pricing.unitPrice) * item.quantity).toFixed(2)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" />
                        No matches
                      </span>
                    )}
                    {expandedItems.has(item.itemNumber) ? 
                      <ChevronUp className="w-5 h-5 text-gray-400" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    }
                  </div>
                </div>

                {/* Expanded Supplier Options */}
                {expandedItems.has(item.itemNumber) && item.supplierMatches && item.supplierMatches.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {item.supplierMatches.slice(0, 5).map((match, index) => (
                      <div 
                        key={`${item.itemNumber}-${match.supplierId}`}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedSuppliers[item.itemNumber] === match.supplierId
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                        }`}
                        onClick={() => selectSupplier(item.itemNumber, match.supplierId, match)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-medium text-gray-900">{match.supplierName}</span>
                              {index === 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                  Best Match
                                </span>
                              )}
                              
                              <div className="flex items-center gap-2">
                                {match.matchType === 'synonym_match' && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                    🧠 AI Synonym
                                  </span>
                                )}
                                {match.matchType === 'exact_match' && (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                    🎯 Exact Code
                                  </span>
                                )}
                                {match.matchType === 'fuzzy_enhanced' && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    ⚡ Enhanced
                                  </span>
                                )}
                                
                                <span className="text-sm text-gray-500">
                                  {match.confidence ? `${match.confidence}%` : `Match: ${(match.matchScore * 100).toFixed(0)}%`}
                                </span>
                              </div>

                              {selectedSuppliers[item.itemNumber] === match.supplierId && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                            
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Price:</span>
                                <span className="ml-1 font-medium">${match.pricing.unitPrice.toFixed(2)}/unit</span>
                              </div>
                              <div>
                                <span className="text-gray-500">MOQ:</span>
                                <span className="ml-1 font-medium">{match.pricing.moq} units</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Lead:</span>
                                <span className="ml-1 font-medium">{match.pricing.leadTime}</span>
                              </div>
                              <div>
                                <span className={`font-medium ${match.pricing.inStock ? 'text-green-600' : 'text-red-600'}`}>
                                  {match.pricing.inStock ? '✓ In Stock' : '✗ Out of Stock'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500" />
                                {match.supplier.rating.toFixed(1)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {match.supplier.location}
                              </span>
                              <span className="flex items-center gap-1">
                                <CreditCard className="w-3 h-3" />
                                {match.supplier.paymentTerms}
                              </span>
                              <span className="flex items-center gap-1">
                                <Shield className="w-3 h-3" />
                                {(match.supplier.reliability * 100).toFixed(0)}% reliable
                              </span>
                            </div>

                            {match.learningNote && (
                              <div className="mt-2 text-xs text-indigo-600 italic">
                                💡 {match.learningNote}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right ml-4">
                            <p className="text-2xl font-bold text-gray-900">
                              ${(match.pricing.unitPrice * item.quantity).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-500">Total Cost</p>
                            {item.unitPrice > 0 && (
                              <p className={`text-sm mt-1 font-medium ${
                                match.pricing.unitPrice < item.unitPrice 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {match.pricing.unitPrice < item.unitPrice ? '▼' : '▲'} 
                                {Math.abs(((match.pricing.unitPrice - item.unitPrice) / item.unitPrice) * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suppliers Tab - Keep your existing implementation */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          {sourcingPlan?.recommendedSuppliers && sourcingPlan.recommendedSuppliers.length > 0 ? (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Recommended Suppliers Ranking</h3>
                <div className="space-y-4">
                  {sourcingPlan.recommendedSuppliers.map((supplier, index) => (
                    <div 
                      key={supplier.supplierId} 
                      className={`p-4 rounded-lg border-2 ${
                        index === 0 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-gray-400">#{index + 1}</span>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {supplier.supplierName}
                              </h4>
                              {index === 0 && (
                                <span className="inline-block mt-1 px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                                  Recommended Supplier
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Item Coverage</p>
                              <p className="font-semibold text-lg">{supplier.itemCoverage}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Estimated Cost</p>
                              <p className="font-semibold text-lg">${supplier.estimatedCost?.toFixed(2)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Avg Rating</p>
                              <p className="font-semibold text-lg flex items-center gap-1">
                                <Star className="w-4 h-4 text-yellow-500" />
                                {supplier.averageRating?.toFixed(1)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Lead Time</p>
                              <p className="font-semibold text-lg">{supplier.leadTime}</p>
                            </div>
                          </div>
                          
                          {supplier.advantages && supplier.advantages.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {supplier.advantages.map((advantage, idx) => (
                                <span 
                                  key={idx} 
                                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                                >
                                  {advantage}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Analysis */}
              {sourcingPlan.costAnalysis && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Cost Analysis</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Original Budget</span>
                      <span className="text-lg font-medium">${sourcingPlan.costAnalysis.originalBudget?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Best Case Scenario</span>
                      <span className="text-lg font-medium text-green-600">
                        ${sourcingPlan.costAnalysis.bestCaseScenario?.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="font-medium">Potential Savings</span>
                      <span className="text-xl font-bold text-green-600">
                        ${sourcingPlan.costAnalysis.potentialSavings?.toFixed(2)} 
                        ({sourcingPlan.costAnalysis.savingsPercentage})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-600">No supplier recommendations available.</p>
              <p className="text-sm text-gray-500 mt-1">
                Make sure you have suppliers and products in your database.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 🆕 Enhanced Action Buttons Section */}
      {purchaseOrder && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Supplier Selection Actions</h3>
              <p className="text-sm text-gray-600 mt-1">
                {stats.selectedCount} of {stats.totalCount} items have supplier selections
                {stats.selectedCount > 0 && (
                  <span className="ml-2 text-green-600 font-medium">
                    ({stats.percentage}% complete)
                  </span>
                )}
              </p>
            </div>
            
            {/* Selection Status Indicator */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Unsaved changes</span>
              </div>
            )}
          </div>

          {/* Selection Statistics */}
          {stats.selectedCount > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{stats.selectedCount}</div>
                  <div className="text-gray-600">Selected</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{stats.totalSavings.toFixed(1)}%</div>
                  <div className="text-gray-600">Avg Savings</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">{stats.averageConfidence}%</div>
                  <div className="text-gray-600">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{stats.totalCount - stats.selectedCount}</div>
                  <div className="text-gray-600">Remaining</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Save Selections Button */}
            <button
              onClick={saveSupplierSelections}
              disabled={isSaving || Object.keys(selectedSuppliers).length === 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                Object.keys(selectedSuppliers).length > 0
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : `Save ${stats.selectedCount} Selections`}
            </button>

            {/* Export CSV Button */}
            <button
              onClick={exportSelections}
              disabled={Object.keys(selectedSuppliers).length === 0}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                Object.keys(selectedSuppliers).length > 0
                  ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            {/* Clear All Button */}
            <button
              onClick={clearAllSelections}
              disabled={Object.keys(selectedSuppliers).length === 0}
              className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                Object.keys(selectedSuppliers).length > 0
                  ? 'border-red-300 text-red-700 hover:bg-red-50'
                  : 'border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <X className="w-4 h-4" />
              Clear All
            </button>

            {/* Selection History Button */}
            <button
              onClick={() => {
                const history = JSON.parse(localStorage.getItem('supplierSelectionHistory') || '[]');
                console.log('📚 Selection History:', history);
                toast.info(`Found ${history.length} historical selections in console`);
              }}
              className="flex items-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <History className="w-4 h-4" />
              View History ({JSON.parse(localStorage.getItem('supplierSelectionHistory') || '[]').length})
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-4 text-xs text-gray-500">
            💡 <strong>Tip:</strong> Selections are automatically recorded for AI learning. 
            Save your selections to update the purchase order and track progress.
          </div>
        </div>
      )}

      {/* Risk Assessment (shown in all tabs) - Keep your existing implementation */}
      {sourcingPlan?.riskAssessment?.recommendations && sourcingPlan.riskAssessment.recommendations.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Risk Assessment</h3>
              <div className="space-y-2">
                {sourcingPlan.riskAssessment.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                      rec.type === 'warning' ? 'bg-red-500' : 
                      rec.type === 'caution' ? 'bg-yellow-500' : 
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{rec.message}</p>
                      <p className="text-sm text-gray-600">{rec.action}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Overall match quality */}
              {sourcingPlan.matchQuality && (
                <div className="mt-4 pt-4 border-t border-yellow-300">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-900">Overall Match Quality</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      sourcingPlan.matchQuality === 'Excellent' ? 'bg-green-100 text-green-700' :
                      sourcingPlan.matchQuality === 'Good' ? 'bg-blue-100 text-blue-700' :
                      sourcingPlan.matchQuality === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {sourcingPlan.matchQuality}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-yellow-800">Confidence Score</span>
                    <span className="font-medium text-yellow-900">
                      {((sourcingPlan.confidenceScore || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierMatchingDisplay;
