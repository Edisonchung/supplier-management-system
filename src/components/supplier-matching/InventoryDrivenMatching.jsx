// src/components/supplier-matching/InventoryDrivenMatching.jsx
// Complete workflow: PI Allocation → Inventory Update → Client PO Matching

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, Search, CheckCircle, AlertTriangle, ArrowRight, 
  TrendingUp, Clock, Target, Zap, RefreshCw, Info, 
  ShoppingCart, Warehouse, Users
} from 'lucide-react';
import UnifiedProductService from '../../services/UnifiedProductService';

const InventoryDrivenMatching = ({ 
  clientPOItems, 
  suppliers, 
  onCreateMatch, 
  onClose 
}) => {
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
  const [matches, setMatches] = useState({});
  const [inventoryInsights, setInventoryInsights] = useState(null);

  // Load products with inventory data
  useEffect(() => {
    loadInventoryData();
    
    // Subscribe to real-time updates
    const unsubscribe = UnifiedProductService.subscribe(handleInventoryUpdate);
    return unsubscribe;
  }, []);

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      console.log('📦 Loading inventory data for client PO matching...');
      
      const availableProducts = await UnifiedProductService.getAllAvailableProducts(true);
      setProducts(availableProducts);
      
      // Generate inventory insights
      const insights = generateInventoryInsights(availableProducts, clientPOItems);
      setInventoryInsights(insights);
      
      console.log('✅ Inventory loaded:', {
        totalProducts: availableProducts.length,
        withStock: availableProducts.filter(p => p.availableForMatching > 0).length,
        recentlyAllocated: availableProducts.filter(p => p.isRecentlyAllocated).length
      });
      
    } catch (error) {
      console.error('❌ Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryUpdate = (event) => {
    console.log('📢 Inventory update:', event.type);
    if (event.type === 'allocation-completed' || event.type === 'products-refreshed') {
      loadInventoryData();
    }
  };

  // Generate smart insights about inventory vs client demands
  const generateInventoryInsights = (products, clientItems) => {
    const insights = {
      totalDemand: clientItems.length,
      fulfillableItems: 0,
      partialFulfillment: 0,
      needMoreStock: 0,
      totalValue: 0,
      categories: {},
      recentAllocations: []
    };

    clientItems.forEach(clientItem => {
      // Find matching products in inventory
      const matchingProducts = findMatchingProducts(products, clientItem);
      const totalAvailable = matchingProducts.reduce((sum, p) => sum + p.availableForMatching, 0);
      
      if (totalAvailable >= clientItem.quantity) {
        insights.fulfillableItems++;
      } else if (totalAvailable > 0) {
        insights.partialFulfillment++;
      } else {
        insights.needMoreStock++;
      }
      
      insights.totalValue += (clientItem.quantity * (clientItem.unitPrice || 0));
      
      // Category analysis
      const category = clientItem.category || 'Unknown';
      if (!insights.categories[category]) {
        insights.categories[category] = { demand: 0, available: 0, value: 0 };
      }
      insights.categories[category].demand += clientItem.quantity;
      insights.categories[category].available += totalAvailable;
      insights.categories[category].value += (clientItem.quantity * (clientItem.unitPrice || 0));
    });

    // Recent allocations that could fulfill current demands
    insights.recentAllocations = products
      .filter(p => p.isRecentlyAllocated && p.availableForMatching > 0)
      .map(p => ({
        productCode: p.code,
        productName: p.name,
        allocatedQty: p.availableForMatching,
        allocatedAt: p.lastAllocatedAt,
        potentialMatches: clientItems.filter(item => 
          couldMatch(item, p)
        ).length
      }))
      .sort((a, b) => b.potentialMatches - a.potentialMatches);

    return insights;
  };

  // Smart matching algorithm
  const findMatchingProducts = (products, clientItem) => {
    return products.filter(product => {
      if (product.availableForMatching <= 0) return false;
      return couldMatch(clientItem, product);
    }).sort((a, b) => {
      // Sort by match quality and availability
      const aScore = calculateMatchScore(clientItem, a);
      const bScore = calculateMatchScore(clientItem, b);
      return bScore - aScore;
    });
  };

  const couldMatch = (clientItem, product) => {
    // Enhanced matching logic
    const clientDesc = (clientItem.productName || clientItem.description || '').toLowerCase();
    const productDesc = (product.name || '').toLowerCase();
    const productCode = (product.code || '').toLowerCase();
    const productCategory = (product.category || '').toLowerCase();
    
    // Direct code match
    if (clientItem.productCode && productCode.includes(clientItem.productCode.toLowerCase())) {
      return true;
    }
    
    // Category match
    if (clientItem.category && productCategory.includes(clientItem.category.toLowerCase())) {
      return true;
    }
    
    // Description keyword matching
    const keywords = ['bearing', 'pump', 'valve', 'sensor', 'motor', 'switch', 'cable'];
    for (const keyword of keywords) {
      if (clientDesc.includes(keyword) && productDesc.includes(keyword)) {
        return true;
      }
    }
    
    // Brand matching
    if (clientItem.brand && product.supplier && 
        product.supplier.toLowerCase().includes(clientItem.brand.toLowerCase())) {
      return true;
    }
    
    return false;
  };

  const calculateMatchScore = (clientItem, product) => {
    let score = 0;
    
    // Exact code match
    if (clientItem.productCode && 
        product.code?.toLowerCase() === clientItem.productCode.toLowerCase()) {
      score += 100;
    }
    
    // Category match
    if (clientItem.category && product.category &&
        product.category.toLowerCase().includes(clientItem.category.toLowerCase())) {
      score += 50;
    }
    
    // Recent allocation bonus
    if (product.isRecentlyAllocated) {
      score += 30;
    }
    
    // Sufficient quantity bonus
    if (product.availableForMatching >= clientItem.quantity) {
      score += 20;
    }
    
    // Name similarity (simple)
    const clientName = (clientItem.productName || '').toLowerCase();
    const productName = (product.name || '').toLowerCase();
    const commonWords = clientName.split(' ').filter(word => 
      word.length > 3 && productName.includes(word)
    );
    score += commonWords.length * 10;
    
    return score;
  };

  // Filter products for display
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Show only products with available stock if filter is on
    if (showOnlyAvailable) {
      filtered = filtered.filter(p => p.availableForMatching > 0);
    }
    
    // Supplier filter
    if (selectedSupplier !== 'all') {
      filtered = filtered.filter(p => p.supplierId === selectedSupplier);
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
      );
    }
    
    // Search filter
    if (searchTerm.length >= 2) {
      filtered = UnifiedProductService.searchProducts(filtered, searchTerm);
    }
    
    return filtered;
  }, [products, showOnlyAvailable, selectedSupplier, selectedCategory, searchTerm]);

  // Get fulfillment suggestions for a client item
  const getFulfillmentSuggestions = (clientItem) => {
    const matchingProducts = findMatchingProducts(products, clientItem);
    const suggestions = [];
    
    let remainingQty = clientItem.quantity;
    
    for (const product of matchingProducts) {
      if (remainingQty <= 0) break;
      
      const canFulfill = Math.min(product.availableForMatching, remainingQty);
      if (canFulfill > 0) {
        suggestions.push({
          product,
          quantity: canFulfill,
          percentage: Math.round((canFulfill / clientItem.quantity) * 100)
        });
        remainingQty -= canFulfill;
      }
    }
    
    return {
      suggestions,
      fullyFulfillable: remainingQty === 0,
      fulfillmentPercentage: Math.round(((clientItem.quantity - remainingQty) / clientItem.quantity) * 100)
    };
  };

  // Create match between client item and inventory
  const createInventoryMatch = (clientItem, product, quantity) => {
    const matchId = `${clientItem.id}_${product.id}`;
    
    const match = {
      id: matchId,
      clientItem,
      product,
      quantity: Math.min(quantity, product.availableForMatching),
      fulfilledPercentage: Math.round((Math.min(quantity, product.availableForMatching) / clientItem.quantity) * 100),
      matchScore: calculateMatchScore(clientItem, product),
      createdAt: new Date().toISOString(),
      source: 'inventory-driven'
    };
    
    setMatches(prev => ({
      ...prev,
      [clientItem.id]: match
    }));
    
    console.log('✅ Inventory match created:', match);
    return match;
  };

  const removeMatch = (clientItemId) => {
    setMatches(prev => {
      const newMatches = { ...prev };
      delete newMatches[clientItemId];
      return newMatches;
    });
  };

  const saveAllMatches = () => {
    const matchList = Object.values(matches);
    console.log('💾 Saving inventory-driven matches:', matchList.length);
    
    matchList.forEach(match => {
      onCreateMatch(match);
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Warehouse className="h-6 w-6 mr-2 text-green-600" />
                Inventory-Driven Client Matching
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Match client PO requirements with available allocated inventory
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Inventory Insights Panel */}
        {inventoryInsights && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
            <h3 className="font-medium text-blue-900 mb-3 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fulfillment Analysis
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {inventoryInsights.fulfillableItems}
                </div>
                <div className="text-gray-600">Fully Fulfillable</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {inventoryInsights.partialFulfillment}
                </div>
                <div className="text-gray-600">Partial Fulfillment</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {inventoryInsights.needMoreStock}
                </div>
                <div className="text-gray-600">Need More Stock</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ${inventoryInsights.totalValue.toLocaleString()}
                </div>
                <div className="text-gray-600">Total PO Value</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {inventoryInsights.recentAllocations.length}
                </div>
                <div className="text-gray-600">Recent Allocations</div>
              </div>
            </div>
            
            {/* Recent Allocations Preview */}
            {inventoryInsights.recentAllocations.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  🎯 Recent Allocations Ready for Matching:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {inventoryInsights.recentAllocations.slice(0, 3).map((allocation, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {allocation.productCode} ({allocation.allocatedQty} units)
                    </span>
                  ))}
                  {inventoryInsights.recentAllocations.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{inventoryInsights.recentAllocations.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="flex h-[calc(95vh-16rem)]">
          {/* Left Panel - Client PO Items */}
          <div className="w-1/3 border-r border-gray-200 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2 text-blue-500" />
                Client PO Requirements ({clientPOItems.length})
              </h3>
              <p className="text-xs text-gray-600">
                Items needing fulfillment from inventory
              </p>
            </div>
            
            <div className="overflow-y-auto h-full p-4 space-y-3">
              {clientPOItems.map((item, index) => {
                const fulfillment = getFulfillmentSuggestions(item);
                const isMatched = matches[item.id];
                
                return (
                  <div
                    key={item.id || index}
                    className={`p-3 rounded-lg border-2 ${
                      isMatched
                        ? 'border-green-200 bg-green-50'
                        : fulfillment.fullyFulfillable
                          ? 'border-blue-200 bg-blue-50'
                          : fulfillment.fulfillmentPercentage > 0
                            ? 'border-yellow-200 bg-yellow-50'
                            : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {item.productCode || `Item ${index + 1}`}
                        </div>
                        <div className="text-xs text-gray-600 line-clamp-2">
                          {item.productName || item.description}
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="text-sm font-medium text-gray-900">
                          {item.quantity} req'd
                        </div>
                        {fulfillment.fulfillmentPercentage > 0 && (
                          <div className={`text-xs font-medium ${
                            fulfillment.fullyFulfillable ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {fulfillment.fulfillmentPercentage}% available
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Fulfillment Status */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center">
                        {isMatched ? (
                          <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                        ) : fulfillment.fullyFulfillable ? (
                          <Target className="h-3 w-3 text-blue-500 mr-1" />
                        ) : fulfillment.fulfillmentPercentage > 0 ? (
                          <Clock className="h-3 w-3 text-yellow-500 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-red-500 mr-1" />
                        )}
                        <span className="text-gray-600">
                          {isMatched ? 'Matched' :
                           fulfillment.fullyFulfillable ? 'Can fulfill' :
                           fulfillment.fulfillmentPercentage > 0 ? 'Partial stock' :
                           'No stock'}
                        </span>
                      </div>
                      <span className="font-medium text-gray-700">
                        ${item.unitPrice || 'N/A'}
                      </span>
                    </div>
                    
                    {/* Quick Suggestions */}
                    {!isMatched && fulfillment.suggestions.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 mb-1">Quick match:</div>
                        {fulfillment.suggestions.slice(0, 2).map((suggestion, i) => (
                          <button
                            key={i}
                            onClick={() => createInventoryMatch(item, suggestion.product, suggestion.quantity)}
                            className="w-full text-left p-1 rounded text-xs hover:bg-white border border-gray-200 mb-1"
                          >
                            <div className="flex justify-between">
                              <span>{suggestion.product.code}</span>
                              <span className="text-blue-600">{suggestion.quantity} units</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Panel - Available Inventory */}
          <div className="w-1/2 flex flex-col">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex space-x-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search inventory..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <select
                  value={selectedSupplier}
                  onChange={(e) => setSelectedSupplier(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Suppliers</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-600">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showOnlyAvailable}
                      onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                      className="mr-1"
                    />
                    Only show available stock
                  </label>
                  <span>{filteredProducts.length} products</span>
                </div>
                <button
                  onClick={loadInventoryData}
                  disabled={loading}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3">
                {filteredProducts.map(product => {
                  const supplier = suppliers.find(s => s.id === product.supplierId);
                  const matchingClientItems = clientPOItems.filter(item => couldMatch(item, product));
                  
                  return (
                    <div
                      key={product.id}
                      className={`p-4 bg-white border-2 rounded-lg ${
                        product.isRecentlyAllocated
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200'
                      } hover:border-blue-300 transition-all`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <div className="font-medium text-sm text-gray-900 mr-2">
                              {product.code || product.name}
                            </div>
                            {product.isRecentlyAllocated && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                <Zap className="h-3 w-3 mr-1" />
                                Fresh Stock
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mb-1">
                            {product.name}
                          </div>
                          <div className="text-xs text-blue-600">
                            {supplier?.name}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {product.availableForMatching}
                          </div>
                          <div className="text-xs text-gray-500">units available</div>
                          <div className="text-sm font-medium text-gray-900">
                            ${product.price || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Potential Matches */}
                      {matchingClientItems.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-xs text-gray-500 mb-2">
                            Could fulfill {matchingClientItems.length} client item(s):
                          </div>
                          <div className="space-y-1">
                            {matchingClientItems.slice(0, 2).map((clientItem, i) => (
                              <div
                                key={i}
                                className="flex justify-between items-center text-xs p-2 bg-blue-50 rounded"
                              >
                                <span>{clientItem.productCode || `Item ${i+1}`}</span>
                                <div className="flex items-center">
                                  <span className="mr-2">
                                    {Math.min(clientItem.quantity, product.availableForMatching)} / {clientItem.quantity}
                                  </span>
                                  <button
                                    onClick={() => createInventoryMatch(
                                      clientItem, 
                                      product, 
                                      Math.min(clientItem.quantity, product.availableForMatching)
                                    )}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                  >
                                    Match
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel - Created Matches */}
          <div className="w-1/3 border-l border-gray-200 bg-gray-50">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Inventory Matches ({Object.keys(matches).length})
              </h3>
              <p className="text-xs text-gray-600">
                Client items matched with available inventory
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {Object.values(matches).map(match => (
                <div key={match.id} className="bg-white rounded-lg border border-green-200 p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {match.clientItem.productCode || 'Client Item'}
                      </div>
                      <div className="flex items-center text-xs text-gray-600 my-1">
                        <ArrowRight className="h-3 w-3 mx-1" />
                        <span>matched with</span>
                        <ArrowRight className="h-3 w-3 mx-1" />
                      </div>
                      <div className="text-sm font-medium text-green-600">
                        {match.product.code} ({match.quantity} units)
                      </div>
                    </div>
                    <button
                      onClick={() => removeMatch(match.clientItem.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Fulfillment:</span>
                      <div className="font-medium text-green-600">
                        {match.fulfilledPercentage}%
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Match Score:</span>
                      <div className="font-medium text-blue-600">
                        {match.matchScore}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(match.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              
              {Object.keys(matches).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-sm">No matches created yet</div>
                  <div className="text-xs mt-1">Click "Match" buttons to fulfill client items</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {Object.keys(matches).length} items matched • 
              {inventoryInsights ? ` ${inventoryInsights.fulfillableItems} fully fulfillable` : ''}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAllMatches}
                disabled={Object.keys(matches).length === 0}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Create {Object.keys(matches).length} Supplier POs
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDrivenMatching;
