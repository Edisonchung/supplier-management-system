// Fixed SmartProductSyncDashboard.jsx
// This version properly connects to your real Firestore data and sync service

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, Eye, EyeOff, CheckCircle, AlertCircle, Clock,
  Filter, Search, RefreshCw, Upload, Download, Settings,
  TrendingUp, DollarSign, Users, Zap, ArrowRight, X,
  Edit, Save, Plus, Minus
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const SmartProductSyncDashboard = () => {
  // State management
  const [internalProducts, setInternalProducts] = useState([]);
  const [publicProducts, setPublicProducts] = useState([]);
  const [syncStats, setSyncStats] = useState({
    totalInternal: 0,
    totalPublic: 0,
    eligible: 0,
    syncRate: 0
  });
  
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Direct Firestore data loading (bypassing ProductSyncService)
  const loadRealData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading REAL data from Firestore...');
      
      // Get internal products
      const internalQuery = query(
        collection(db, 'products'),
        orderBy('updatedAt', 'desc')
      );
      const internalSnapshot = await getDocs(internalQuery);
      const internalProductsList = internalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get public products  
      const publicQuery = query(collection(db, 'products_public'));
      const publicSnapshot = await getDocs(publicQuery);
      const publicProductsList = publicSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Create a map of synced products
      const syncedProductsMap = new Map();
      publicProductsList.forEach(pub => {
        if (pub.internalProductId) {
          syncedProductsMap.set(pub.internalProductId, pub);
        }
      });
      
      // Enhance internal products with sync status
      const enhancedProducts = internalProductsList.map(product => {
        const isPublic = syncedProductsMap.has(product.id);
        const eligible = checkEligibility(product);
        
        return {
          ...product,
          syncStatus: isPublic ? 'synced' : 'not_synced',
          eligible: eligible.eligible,
          eligibilityReason: eligible.reason,
          publicProduct: syncedProductsMap.get(product.id) || null
        };
      });
      
      setInternalProducts(enhancedProducts);
      setPublicProducts(publicProductsList);
      
      // Calculate stats
      const stats = {
        totalInternal: internalProductsList.length,
        totalPublic: publicProductsList.length,
        eligible: enhancedProducts.filter(p => p.eligible).length,
        syncRate: internalProductsList.length > 0 ? 
          Math.round((publicProductsList.length / internalProductsList.length) * 100) : 0
      };
      setSyncStats(stats);
      
      console.log('✅ Real data loaded:', stats);
      
    } catch (err) {
      console.error('❌ Error loading real data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if product is eligible for sync
  const checkEligibility = (product) => {
    // Basic eligibility rules
    if (!product.name || product.name.trim() === '') {
      return { eligible: false, reason: 'Missing product name' };
    }
    
    if (!product.price || product.price <= 0) {
      return { eligible: false, reason: 'Invalid price' };
    }
    
    if (product.stock === undefined || product.stock < 0) {
      return { eligible: false, reason: 'Invalid stock level' };
    }
    
    // Stock level 0 products are eligible but marked differently
    if (product.stock === 0) {
      return { eligible: true, reason: 'Eligible but out of stock' };
    }
    
    if (product.status === 'discontinued') {
      return { eligible: false, reason: 'Product discontinued' };
    }
    
    return { eligible: true, reason: 'Eligible for sync' };
  };

  // Perform actual sync to public catalog
  const syncProductToPublic = async (internalProduct) => {
    try {
      // Check if already exists
      const existingQuery = query(
        collection(db, 'products_public'),
        where('internalProductId', '==', internalProduct.id)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        throw new Error('Product already synced');
      }
      
      // Create public product
      const publicProduct = {
        internalProductId: internalProduct.id,
        displayName: internalProduct.name,
        description: internalProduct.description || 'Industrial product',
        pricing: {
          listPrice: internalProduct.price,
          currency: 'MYR'
        },
        category: internalProduct.category || 'Industrial',
        subcategory: internalProduct.subcategory || 'General',
        sku: internalProduct.sku || internalProduct.partNumber || internalProduct.name,
        stock: internalProduct.stock || 0,
        images: {
          primary: internalProduct.image || '/placeholder-product.jpg'
        },
        specifications: internalProduct.specifications || {},
        supplier: internalProduct.supplier || 'Unknown',
        visibility: internalProduct.stock === 0 ? 'out_of_stock' : 'public',
        availability: internalProduct.stock === 0 ? 'out_of_stock' : 'in_stock',
        featured: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedAt: serverTimestamp(),
        lastModifiedBy: 'admin_sync',
        version: 1.0,
        dataSource: 'admin_dashboard'
      };
      
      // Add to public collection
      const docRef = await addDoc(collection(db, 'products_public'), publicProduct);
      
      // Log the sync operation
      const syncLog = {
        internalProductId: internalProduct.id,
        ecommerceProductId: docRef.id,
        syncType: 'create',
        syncDirection: 'internal_to_ecommerce',
        syncStatus: 'success',
        syncedAt: serverTimestamp(),
        metadata: {
          triggeredBy: 'admin_dashboard',
          productName: internalProduct.name,
          adminUser: 'current_user'
        }
      };
      
      await addDoc(collection(db, 'product_sync_log'), syncLog);
      
      return { success: true, publicId: docRef.id };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle single product sync
  const handleSingleSync = async (product) => {
    setSyncing(true);
    try {
      console.log('🔄 Syncing product:', product.name);
      
      const result = await syncProductToPublic(product);
      
      if (result.success) {
        alert(`✅ Successfully synced "${product.name}" to public catalog!`);
        await loadRealData(); // Refresh data
      } else {
        alert(`❌ Failed to sync: ${result.error}`);
      }
      
    } catch (error) {
      alert(`❌ Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Unsync product from public catalog
  const unsyncProduct = async (internalProductId, productName) => {
    try {
      console.log('Removing product from public catalog:', productName);
      
      // Find and delete from products_public
      const publicQuery = query(
        collection(db, 'products_public'),
        where('internalProductId', '==', internalProductId)
      );
      const publicSnapshot = await getDocs(publicQuery);
      
      if (!publicSnapshot.empty) {
        const publicDoc = publicSnapshot.docs[0];
        await deleteDoc(doc(db, 'products_public', publicDoc.id));
        
        // Log the unsync operation
        await addDoc(collection(db, 'product_sync_log'), {
          internalProductId,
          ecommerceProductId: publicDoc.id,
          syncType: 'delete',
          syncDirection: 'ecommerce_removal',
          syncStatus: 'success',
          syncedAt: serverTimestamp(),
          metadata: {
            triggeredBy: 'admin_unsync',
            productName: productName,
            reason: 'Manual removal from public catalog',
            adminUser: 'current_user'
          }
        });
        
        return { success: true };
      } else {
        throw new Error('Product not found in public catalog');
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle unsync
  const handleUnsync = async (product) => {
    if (!confirm(`Remove "${product.name}" from public catalog? Customers will no longer see this product.`)) {
      return;
    }
    
    setSyncing(true);
    try {
      const result = await unsyncProduct(product.id, product.name);
      
      if (result.success) {
        alert(`Successfully removed "${product.name}" from public catalog!`);
        await loadRealData(); // Refresh data
      } else {
        alert(`Failed to remove: ${result.error}`);
      }
      
    } catch (error) {
      alert(`Unsync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };
  const handleBulkSync = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select products to sync');
      return;
    }
    
    setSyncing(true);
    const results = { success: 0, failed: 0, errors: [] };
    
    try {
      for (const productId of selectedProducts) {
        const product = internalProducts.find(p => p.id === productId);
        if (!product) continue;
        
        const result = await syncProductToPublic(product);
        if (result.success) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`${product.name}: ${result.error}`);
        }
      }
      
      alert(`Sync complete! ✅ ${results.success} success, ❌ ${results.failed} failed`);
      
      if (results.errors.length > 0) {
        console.log('Sync errors:', results.errors);
      }
      
      setSelectedProducts(new Set());
      await loadRealData(); // Refresh data
      
    } catch (error) {
      alert(`Bulk sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  // Product selection handlers
  const handleProductToggle = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return internalProducts.filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      
      switch (filter) {
        case 'eligible':
          return matchesSearch && product.eligible;
        case 'synced':
          return matchesSearch && product.syncStatus === 'synced';
        case 'not_synced':
          return matchesSearch && product.syncStatus === 'not_synced';
        default:
          return matchesSearch;
      }
    });
  }, [internalProducts, filter, searchTerm]);

  // Load data on mount
  useEffect(() => {
    loadRealData();
  }, [loadRealData]);

  // Utility functions
  const getStatusIcon = (status) => {
    switch (status) {
      case 'synced':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <EyeOff className="w-5 h-5 text-gray-400" />;
    }
  };

  const getEligibilityBadge = (product) => {
    if (product.eligible) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Eligible</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={product.eligibilityReason}>Not Eligible</span>;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Product Sync Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Product Sync Dashboard
        </h1>
        <p className="text-gray-600">
          Manage product visibility between internal inventory and public e-commerce catalog
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={loadRealData}
              className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Internal</p>
              <p className="text-2xl font-bold text-gray-900">{syncStats.totalInternal}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">In Public Catalog</p>
              <p className="text-2xl font-bold text-green-600">{syncStats.totalPublic}</p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Eligible to Sync</p>
              <p className="text-2xl font-bold text-purple-600">{syncStats.eligible}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sync Coverage</p>
              <p className="text-2xl font-bold text-orange-600">{syncStats.syncRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Products</option>
              <option value="eligible">Eligible Only</option>
              <option value="synced">Synced</option>
              <option value="not_synced">Not Synced</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {selectedProducts.size > 0 && (
              <>
                {/* Sync Button - only show if there are unsynced products selected */}
                {Array.from(selectedProducts).some(id => {
                  const product = internalProducts.find(p => p.id === id);
                  return product && product.syncStatus === 'not_synced' && product.eligible;
                }) && (
                  <button
                    onClick={handleBulkSync}
                    disabled={syncing}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Sync Selected ({Array.from(selectedProducts).filter(id => {
                          const product = internalProducts.find(p => p.id === id);
                          return product && product.syncStatus === 'not_synced' && product.eligible;
                        }).length})
                      </>
                    )}
                  </button>
                )}

                {/* Unsync Button - only show if there are synced products selected */}
                {Array.from(selectedProducts).some(id => {
                  const product = internalProducts.find(p => p.id === id);
                  return product && product.syncStatus === 'synced';
                }) && (
                  <button
                    onClick={handleBulkUnsync}
                    disabled={syncing}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Removing...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Remove Selected ({Array.from(selectedProducts).filter(id => {
                          const product = internalProducts.find(p => p.id === id);
                          return product && product.syncStatus === 'synced';
                        }).length})
                      </>
                    )}
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={loadRealData}
              disabled={loading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Products ({filteredProducts.length})
            </h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Select All</span>
            </label>
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredProducts.map((product) => (
            <div key={product.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product.id)}
                    onChange={() => handleProductToggle(product.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {product.name}
                      </h4>
                      {getEligibilityBadge(product)}
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>SKU: {product.sku || product.partNumber || 'N/A'}</div>
                      <div>Price: RM {product.price || '0'} | Stock: {product.stock || '0'}</div>
                      <div>Category: {product.category || 'Uncategorized'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(product.syncStatus)}
                    <span className="text-sm text-gray-600 capitalize">
                      {product.syncStatus.replace('_', ' ')}
                    </span>
                    {product.syncStatus === 'synced' && product.stock === 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Out of Stock
                      </span>
                    )}
                  </div>
                  
                  {product.syncStatus === 'not_synced' && product.eligible && (
                    <button
                      onClick={() => handleSingleSync(product)}
                      disabled={syncing}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-3 py-1 rounded text-sm"
                    >
                      Sync Now
                    </button>
                  )}
                  
                  {product.syncStatus === 'synced' && (
                    <button
                      onClick={() => handleUnsync(product)}
                      disabled={syncing}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-3 py-1 rounded text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No products found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          Sync dashboard shows real-time data from Firestore. 
          Products synced here will appear immediately in the public catalog.
        </p>
      </div>
    </div>
  );
};

export default SmartProductSyncDashboard;
