import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, CheckCircle, AlertTriangle, Clock, Search, ArrowRight, Plus, Minus, AlertCircleIcon } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';

const InventoryDrivenMatching = ({ clientPOItems = [], suppliers = [], onCreateMatch, onClose }) => {
  const [inventoryData, setInventoryData] = useState([]);
  const [fulfillmentAnalysis, setFulfillmentAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [selectedClientItem, setSelectedClientItem] = useState(null);

  // Load inventory data from Firestore
  useEffect(() => {
    loadFirestoreInventoryData();
  }, []);

  const loadFirestoreInventoryData = async () => {
    try {
      console.log('📦 Loading inventory data from Firestore...');
      setLoading(true);
      setError(null);

      const inventoryProducts = [];

      // 1. Load products from Firestore products collection
      try {
        const productsRef = collection(db, 'products');
        const productsSnapshot = await getDocs(productsRef);
        
        console.log(`📦 Found ${productsSnapshot.size} products in Firestore`);
        
        productsSnapshot.forEach(doc => {
          const productData = doc.data();
          inventoryProducts.push({
            id: doc.id,
            code: productData.code || productData.productCode,
            name: productData.name || productData.productName,
            category: productData.category || 'general',
            supplier: productData.supplier || productData.supplierName,
            supplierId: productData.supplierId,
            availableQty: productData.availableQty || productData.stock || 0,
            availableForMatching: productData.availableQty || productData.stock || 0,
            price: productData.price || productData.unitPrice || 0,
            isRecentlyAllocated: false,
            source: 'firestore-products'
          });
        });
      } catch (productsError) {
        console.error('❌ Error loading products from Firestore:', productsError);
      }

      // 2. Load allocated inventory from Proforma Invoices
      try {
        const pisRef = collection(db, 'proformaInvoices');
        const pisSnapshot = await getDocs(pisRef);
        
        console.log(`📋 Found ${pisSnapshot.size} PIs in Firestore`);
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        pisSnapshot.forEach(doc => {
          const piData = doc.data();
          
          if (piData.items && Array.isArray(piData.items)) {
            piData.items.forEach(item => {
              // Check if item has allocations
              if (item.allocations && Array.isArray(item.allocations) && item.allocations.length > 0) {
                const totalAllocated = item.allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
                
                if (totalAllocated > 0) {
                  // Check if recently allocated
                  const mostRecentAllocation = item.allocations.sort((a, b) => 
                    new Date(b.allocatedAt || b.createdAt || 0) - new Date(a.allocatedAt || a.createdAt || 0)
                  )[0];
                  
                  const allocationDate = new Date(mostRecentAllocation.allocatedAt || mostRecentAllocation.createdAt || 0);
                  const isRecent = allocationDate > oneDayAgo;

                  inventoryProducts.push({
                    id: `pi-${doc.id}-${item.id}`,
                    code: item.productCode || item.itemNumber || `PI-${item.id}`,
                    name: item.productName || item.itemName || 'Unknown Product',
                    category: categorizeProduct(item.productName || item.itemName || ''),
                    supplier: piData.supplierName || 'Unknown Supplier',
                    supplierId: piData.supplierId,
                    availableQty: totalAllocated,
                    availableForMatching: totalAllocated,
                    price: item.unitPrice || 0,
                    currency: item.currency || piData.currency || 'USD',
                    isRecentlyAllocated: isRecent,
                    lastAllocatedAt: mostRecentAllocation.allocatedAt || mostRecentAllocation.createdAt,
                    allocations: item.allocations,
                    piId: doc.id,
                    piNumber: piData.piNumber || piData.orderNumber,
                    source: 'firestore-pi-allocations'
                  });
                }
              }
            });
          }
        });
      } catch (piError) {
        console.error('❌ Error loading PI allocations from Firestore:', piError);
      }

      // 3. Load from stock allocations collection if it exists
      try {
        const allocationsRef = collection(db, 'stockAllocations');
        const allocationsSnapshot = await getDocs(allocationsRef);
        
        console.log(`🏷️ Found ${allocationsSnapshot.size} stock allocations in Firestore`);
        
        allocationsSnapshot.forEach(doc => {
          const allocationData = doc.data();
          const allocationDate = new Date(allocationData.allocatedAt || allocationData.createdAt || 0);
          const isRecent = allocationDate > new Date(Date.now() - 24 * 60 * 60 * 1000);

          inventoryProducts.push({
            id: `alloc-${doc.id}`,
            code: allocationData.productCode,
            name: allocationData.productName || `Product ${allocationData.productCode}`,
            category: categorizeProduct(allocationData.productName || ''),
            supplier: allocationData.supplierName || 'Unknown Supplier',
            supplierId: allocationData.supplierId,
            availableQty: allocationData.quantity || 0,
            availableForMatching: allocationData.quantity || 0,
            price: allocationData.unitPrice || 0,
            isRecentlyAllocated: isRecent,
            lastAllocatedAt: allocationData.allocatedAt || allocationData.createdAt,
            target: allocationData.target,
            targetType: allocationData.targetType,
            source: 'firestore-allocations'
          });
        });
      } catch (allocError) {
        console.warn('⚠️ Stock allocations collection not found or accessible:', allocError.message);
      }

      // 4. Deduplicate products (prefer PI allocations over products collection)
      const uniqueProducts = deduplicateProducts(inventoryProducts);

      // 5. Generate fulfillment analysis
      const analysis = generateFulfillmentAnalysis(uniqueProducts, clientPOItems);

      console.log('✅ Firestore inventory loaded:', {
        totalProducts: uniqueProducts.length,
        withStock: uniqueProducts.filter(p => p.availableForMatching > 0).length,
        recentlyAllocated: uniqueProducts.filter(p => p.isRecentlyAllocated).length,
        sources: {
          products: uniqueProducts.filter(p => p.source === 'firestore-products').length,
          piAllocations: uniqueProducts.filter(p => p.source === 'firestore-pi-allocations').length,
          stockAllocations: uniqueProducts.filter(p => p.source === 'firestore-allocations').length
        }
      });

      console.log('🎯 Recent Allocations Ready for Matching:', 
        uniqueProducts
          .filter(p => p.isRecentlyAllocated)
          .map(p => `${p.code} (${p.availableForMatching} units)`)
          .join(', ')
      );

      setInventoryData(uniqueProducts);
      setFulfillmentAnalysis(analysis);

    } catch (error) {
      console.error('❌ Error loading Firestore inventory data:', error);
      setError('Failed to load inventory data from Firestore. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Categorize products based on name
  const categorizeProduct = (productName) => {
    const name = productName.toLowerCase();
    
    if (name.includes('bearing')) return 'bearing';
    if (name.includes('cam') || name.includes('follower')) return 'component';
    if (name.includes('valve')) return 'valve';
    if (name.includes('pump')) return 'pump';
    if (name.includes('seal')) return 'seal';
    if (name.includes('gasket')) return 'gasket';
    
    return 'general';
  };

  // Remove duplicate products (same code from different sources)
  const deduplicateProducts = (products) => {
    const seen = new Map();
    
    products.forEach(product => {
      const key = product.code || product.id;
      
      if (!seen.has(key)) {
        seen.set(key, product);
      } else {
        // Merge data, prioritizing PI allocations over products collection
        const existing = seen.get(key);
        if (product.source === 'firestore-pi-allocations' && existing.source === 'firestore-products') {
          seen.set(key, { ...existing, ...product, source: 'firestore-pi-allocations' });
        } else if (product.source === 'firestore-allocations' && existing.source === 'firestore-products') {
          seen.set(key, { ...existing, ...product, source: 'firestore-allocations' });
        } else if (product.availableForMatching > existing.availableForMatching) {
          seen.set(key, { ...existing, ...product });
        }
      }
    });
    
    return Array.from(seen.values());
  };

  // Generate fulfillment analysis
  const generateFulfillmentAnalysis = (products, clientItems) => {
    const analysis = {
      fullyFulfillable: [],
      partiallyFulfillable: [],
      needMoreStock: [],
      totalItems: clientItems.length,
      fulfillableItems: 0,
      partialFulfillment: 0,
      needMoreStock: 0,
      fulfillmentPercentage: 0,
      totalFulfillableQty: 0
    };

    clientItems.forEach(clientItem => {
      const matches = findMatchingProducts(products, clientItem);
      const totalAvailable = matches.reduce((sum, p) => sum + p.availableForMatching, 0);
      const requestedQty = clientItem.quantity || 1;

      if (totalAvailable >= requestedQty) {
        analysis.fullyFulfillable.push({
          clientItem,
          matches,
          fulfillmentStatus: 'full'
        });
        analysis.fulfillableItems++;
        analysis.totalFulfillableQty += requestedQty;
      } else if (totalAvailable > 0) {
        analysis.partiallyFulfillable.push({
          clientItem,
          matches,
          fulfillmentStatus: 'partial',
          canFulfill: totalAvailable,
          shortfall: requestedQty - totalAvailable
        });
        analysis.partialFulfillment++;
        analysis.totalFulfillableQty += totalAvailable;
      } else {
        analysis.needMoreStock.push({
          clientItem,
          fulfillmentStatus: 'none',
          matches: matches.slice(0, 3) // Top 3 potential matches
        });
        analysis.needMoreStock++;
      }
    });

    analysis.fulfillmentPercentage = clientItems.length > 0 
      ? Math.round((analysis.fulfillableItems / clientItems.length) * 100) 
      : 0;

    return analysis;
  };

  // Find matching products with enhanced logic
  const findMatchingProducts = (products, clientItem) => {
    if (!Array.isArray(products) || !clientItem) return [];

    return products.filter(product => {
      if (!product || product.availableForMatching <= 0) return false;
      return couldMatch(clientItem, product);
    }).sort((a, b) => {
      const aScore = calculateMatchScore(clientItem, a);
      const bScore = calculateMatchScore(clientItem, b);
      return bScore - aScore;
    });
  };

  // Enhanced matching logic
  const couldMatch = (clientItem, product) => {
    if (!clientItem || !product) return false;

    const clientDesc = (clientItem.productName || clientItem.description || '').toLowerCase();
    const productDesc = (product.name || '').toLowerCase();
    const productCode = (product.code || '').toLowerCase();
    const productCategory = (product.category || '').toLowerCase();
    
    // Direct code match
    if (clientItem.productCode && productCode.includes(clientItem.productCode.toLowerCase())) {
      return true;
    }
    
    // Category match (especially important for bearings)
    if (clientDesc.includes('bearing') && productCategory === 'bearing') {
      return true;
    }
    
    if (clientDesc.includes('pump') && productCategory === 'pump') {
      return true;
    }
    
    if (clientDesc.includes('valve') && productCategory === 'valve') {
      return true;
    }
    
    // Description keyword matching
    const keywords = ['bearing', 'pump', 'valve', 'sensor', 'motor', 'switch', 'cable', 'cam', 'follower'];
    for (const keyword of keywords) {
      if (clientDesc.includes(keyword) && productDesc.includes(keyword)) {
        return true;
      }
    }
    
    // Brand/supplier matching
    if (clientItem.brand && product.supplier && 
        product.supplier.toLowerCase().includes(clientItem.brand.toLowerCase())) {
      return true;
    }
    
    // Model number matching for bearings
    if (clientDesc.includes('bearing') && productCode.match(/nj\d+/i)) {
      return true;
    }
    
    return false;
  };

  // Calculate match score with enhanced logic
  const calculateMatchScore = (clientItem, product) => {
    if (!clientItem || !product) return 0;

    let score = 0;
    
    try {
      // Exact code match
      if (clientItem.productCode && 
          product.code?.toLowerCase() === clientItem.productCode.toLowerCase()) {
        score += 100;
      }
      
      // Category match with higher weight for bearings
      const clientDesc = (clientItem.productName || '').toLowerCase();
      if (clientDesc.includes('bearing') && product.category === 'bearing') {
        score += 80;
      } else if (clientItem.category && product.category &&
          product.category.toLowerCase().includes(clientItem.category.toLowerCase())) {
        score += 50;
      }
      
      // Recent allocation bonus (very important)
      if (product.isRecentlyAllocated) {
        score += 30;
      }
      
      // Sufficient quantity bonus
      const requestedQty = clientItem.quantity || 1;
      if (product.availableForMatching >= requestedQty) {
        score += 20;
      }
      
      // Name similarity
      const clientName = (clientItem.productName || '').toLowerCase();
      const productName = (product.name || '').toLowerCase();
      const commonWords = clientName.split(' ').filter(word => 
        word.length > 3 && productName.includes(word)
      );
      score += commonWords.length * 10;
      
      // Supplier match bonus
      if (product.supplier && product.supplier.toLowerCase().includes('tianhong')) {
        score += 10;
      }
      
    } catch (error) {
      console.error('Error calculating match score:', error);
    }
    
    return Math.max(0, Math.min(100, score));
  };

  // Filter inventory based on search
  const filteredInventory = useMemo(() => {
    if (!searchTerm) return inventoryData;
    
    const term = searchTerm.toLowerCase();
    return inventoryData.filter(product => 
      product.code?.toLowerCase().includes(term) ||
      product.name?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term) ||
      product.supplier?.toLowerCase().includes(term)
    );
  }, [inventoryData, searchTerm]);

  // Get available inventory (items with stock)
  const availableInventory = useMemo(() => {
    return filteredInventory.filter(product => product.availableForMatching > 0);
  }, [filteredInventory]);

  // Get recently allocated items
  const recentlyAllocated = useMemo(() => {
    return availableInventory
      .filter(product => product.isRecentlyAllocated)
      .sort((a, b) => {
        const aTime = new Date(a.lastAllocatedAt || 0).getTime();
        const bTime = new Date(b.lastAllocatedAt || 0).getTime();
        return bTime - aTime;
      });
  }, [availableInventory]);

  const handleCreateMatch = (clientItem, product, quantity) => {
    try {
      const matchQuantity = Math.min(quantity, product.availableForMatching);
      
      if (matchQuantity <= 0) {
        console.error('❌ Cannot create match: no available quantity');
        return;
      }

      const match = {
        id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientItem,
        product,
        quantity: matchQuantity,
        matchType: 'from-inventory',
        confidence: calculateMatchScore(clientItem, product),
        fulfilledPercentage: Math.round((matchQuantity / (clientItem.quantity || 1)) * 100),
        createdAt: new Date().toISOString()
      };

      setSelectedMatches(prev => [...prev, match]);
      
      if (onCreateMatch) {
        onCreateMatch(match);
      }

      console.log('✅ Inventory match created:', match);
    } catch (error) {
      console.error('❌ Error creating match:', error);
    }
  };

  const removeMatch = (matchId) => {
    setSelectedMatches(prev => prev.filter(match => match.id !== matchId));
  };

  const saveAllMatches = () => {
    try {
      console.log('💾 Saving inventory-driven matches:', selectedMatches.length);
      
      selectedMatches.forEach(match => {
        if (onCreateMatch) {
          onCreateMatch(match);
        }
      });
      
      onClose();
    } catch (error) {
      console.error('❌ Error saving matches:', error);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading inventory from Firestore...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircleIcon className="h-6 w-6 text-red-600" />
            <span className="font-medium text-red-900">Error Loading Inventory</span>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="flex space-x-3">
            <button
              onClick={loadFirestoreInventoryData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Inventory-Driven Matching</h2>
              <p className="text-blue-100 mt-1">Match client requirements with available allocated inventory</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Fulfillment Analysis Dashboard */}
        {fulfillmentAnalysis && (
          <div className="bg-gray-50 p-4 border-b">
            <h3 className="text-lg font-semibold mb-3">📊 Fulfillment Analysis</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <div className="text-green-800 font-semibold">Fully Fulfillable</div>
                <div className="text-2xl font-bold text-green-600">
                  {fulfillmentAnalysis.fulfillableItems || 0}
                </div>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <div className="text-yellow-800 font-semibold">Partial Fulfillment</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {fulfillmentAnalysis.partialFulfillment || 0}
                </div>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <div className="text-red-800 font-semibold">Need More Stock</div>
                <div className="text-2xl font-bold text-red-600">
                  {fulfillmentAnalysis.needMoreStock || 0}
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <div className="text-blue-800 font-semibold">Fulfillment Rate</div>
                <div className="text-2xl font-bold text-blue-600">
                  {fulfillmentAnalysis.fulfillmentPercentage || 0}%
                </div>
              </div>
            </div>
            
            {/* Recent Allocations Preview */}
            {recentlyAllocated.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  🎯 Recent Allocations Ready for Matching:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recentlyAllocated.slice(0, 3).map((product, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {product.code} ({product.availableForMatching} units)
                    </span>
                  ))}
                  {recentlyAllocated.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{recentlyAllocated.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex h-[calc(90vh-200px)]">
          {/* Left Panel: Client PO Requirements */}
          <div className="w-1/3 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4 border-b bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Client Requirements</h3>
              <p className="text-sm text-gray-600">{clientPOItems.length} items requested</p>
            </div>
            
            <div className="p-4 space-y-3">
              {clientPOItems.map((item, index) => {
                const matchingProducts = findMatchingProducts(availableInventory, item);
                const bestMatch = matchingProducts[0];
                const canFulfill = bestMatch && bestMatch.availableForMatching >= (item.quantity || 1);
                
                return (
                  <div
                    key={item.id || index}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedClientItem === item 
                        ? 'border-blue-500 bg-blue-50' 
                        : canFulfill 
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                    }`}
                    onClick={() => setSelectedClientItem(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {canFulfill ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium text-gray-800">
                            {item.productCode || `Item ${index + 1}`}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {item.productName}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Qty: {item.quantity || 1}
                        </div>
                      </div>
                    </div>
                    
                    {bestMatch && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-600">Best Match:</div>
                        <div className="text-sm font-medium text-blue-600">
                          {bestMatch.code}
                        </div>
                        <div className="text-xs text-gray-500">
                          Available: {bestMatch.availableForMatching} | Confidence: {calculateMatchScore(item, bestMatch)}%
                        </div>
                        {canFulfill && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateMatch(item, bestMatch, item.quantity || 1);
                            }}
                            className="mt-2 w-full px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                          >
                            ✅ Auto-Match
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Panel: Available Inventory */}
          <div className="w-1/3 overflow-y-auto">
            <div className="p-4 border-b bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Available Inventory</h3>
              <div className="mt-2 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="mt-2 text-xs text-gray-600">
                {availableInventory.length} products available from Firestore
              </div>
            </div>

            {/* Recently Allocated Section */}
            {recentlyAllocated.length > 0 && (
              <div className="bg-green-50 border-b">
                <div className="p-3 bg-green-100">
                  <h4 className="font-semibold text-green-800 flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    Recently Allocated ({recentlyAllocated.length})
                  </h4>
                </div>
                <div className="p-3 space-y-2">
                  {recentlyAllocated.slice(0, 5).map((product, index) => (
                    <div key={index} className="bg-white p-3 rounded border border-green-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{product.code}</div>
                          <div className="text-xs text-gray-600">{product.name}</div>
                          <div className="text-xs text-blue-600">
                            {product.supplier} • {product.availableForMatching} available
                          </div>
                          {product.piNumber && (
                            <div className="text-xs text-gray-500">
                              From PI: {product.piNumber}
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Fresh Stock
                          </span>
                        </div>
                      </div>
                      
                      {selectedClientItem && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600">
                              Match confidence: {calculateMatchScore(selectedClientItem, product)}%
                            </span>
                            <button
                              onClick={() => handleCreateMatch(selectedClientItem, product, selectedClientItem.quantity || 1)}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Match
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Available Inventory */}
            <div className="p-4 space-y-3">
              {availableInventory.filter(p => !p.isRecentlyAllocated).map((product, index) => (
                <div key={index} className="bg-white p-3 rounded border border-gray-200 hover:border-blue-300 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">{product.code}</div>
                      <div className="text-xs text-gray-600">{product.name}</div>
                      <div className="text-xs text-blue-600">
                        {product.supplier} • {product.availableForMatching} available
                      </div>
                      <div className="text-xs text-gray-500">
                        Source: {product.source}
                      </div>
                    </div>
                    <div className="ml-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  
                  {selectedClientItem && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">
                          Match confidence: {calculateMatchScore(selectedClientItem, product)}%
                        </span>
                        <button
                          onClick={() => handleCreateMatch(selectedClientItem, product, selectedClientItem.quantity || 1)}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          disabled={product.availableForMatching === 0}
                        >
                          Match
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {availableInventory.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p>No inventory available for matching</p>
                <p className="text-sm">Check your Firestore collections for allocated products</p>
              </div>
            )}
          </div>

          {/* Right Panel: Created Matches */}
          <div className="w-1/3 border-l bg-gray-50 overflow-y-auto">
            <div className="p-4 border-b bg-white">
              <h3 className="text-lg font-semibold text-gray-800">Created Matches</h3>
              <p className="text-sm text-gray-600">{selectedMatches.length} matches created</p>
            </div>
            
            <div className="p-4 space-y-3">
              {selectedMatches.map((match) => (
                <div key={match.id} className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900">
                        {match.clientItem.productCode || 'Client Item'}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {match.clientItem.productName}
                      </div>
                      
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <ArrowRight className="w-4 h-4 mx-2" />
                      </div>
                      
                      <div className="font-medium text-sm text-green-600">
                        {match.product.code} ({match.quantity} units)
                      </div>
                      <div className="text-xs text-gray-600">
                        {match.product.name}
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Fulfillment:</span>
                          <div className="font-medium text-green-600">
                            {match.fulfilledPercentage}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Confidence:</span>
                          <div className="font-medium text-blue-600">
                            {match.confidence}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(match.createdAt).toLocaleTimeString()}
                        </span>
                        <button
                          onClick={() => removeMatch(match.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedMatches.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-sm">No matches created yet</div>
                  <div className="text-xs mt-1">Select a client item and click Match on inventory items</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-white p-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedMatches.length} items matched • 
              {recentlyAllocated.length} recently allocated items • {availableInventory.length} total available
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveAllMatches}
                disabled={selectedMatches.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save All Matches ({selectedMatches.length})
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryDrivenMatching;
