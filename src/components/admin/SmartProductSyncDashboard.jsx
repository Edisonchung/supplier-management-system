import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, Eye, EyeOff, CheckCircle, AlertCircle, Clock,
  Filter, Search, RefreshCw, Upload, Download, Settings,
  TrendingUp, DollarSign, Users, Zap, ArrowRight, X,
  Edit, Save, Plus, Minus
} from 'lucide-react';
import { productSyncService } from '../services/sync/ProductSyncService';

const SmartProductSyncDashboard = () => {
  // State management
  const [internalProducts, setInternalProducts] = useState([]);
  const [publicProducts, setPublicProducts] = useState([]);
  const [syncRules, setSyncRules] = useState({
    minStock: 5,
    categories: ['electronics', 'hydraulics', 'pneumatics'],
    priceMarkup: 15,
    autoSync: false,
    requireApproval: true
  });
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
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Available categories
  const availableCategories = [
    'electronics', 'hydraulics', 'pneumatics', 'automation', 
    'cables', 'sensors', 'components', 'tools', 'safety'
  ];

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Loading product sync data...');
      
      const [productsResult, statsResult] = await Promise.all([
        productSyncService.getInternalProductsWithSyncStatus(),
        productSyncService.getSyncStatistics()
      ]);

      if (productsResult.success) {
        setInternalProducts(productsResult.data);
        console.log('Loaded products:', productsResult.data.length);
      } else {
        throw new Error(productsResult.message || 'Failed to load products');
      }

      if (statsResult.success) {
        setSyncStats(statsResult.data);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
      
      // Fallback to demo data
      setInternalProducts([
        {
          id: 'PROD-001',
          name: 'Hydraulic Pump Model HP-200',
          category: 'hydraulics',
          stock: 25,
          price: 850,
          suggestedPublicPrice: 977.50,
          status: 'active',
          supplier: 'TechFlow Systems',
          publicStatus: 'not_synced',
          eligible: true,
          priority: 'high',
          eligibilityReasons: ['Eligible for sync']
        },
        {
          id: 'PROD-002',
          name: 'Pneumatic Cylinder PC-150',
          category: 'pneumatics',
          stock: 12,
          price: 320,
          suggestedPublicPrice: 368,
          status: 'active',
          supplier: 'AirTech Solutions',
          publicStatus: 'synced',
          eligible: true,
          priority: 'medium',
          eligibilityReasons: ['Eligible for sync']
        }
      ]);
      
      setSyncStats({
        totalInternal: 2,
        totalPublic: 1,
        eligible: 2,
        syncRate: 50
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return internalProducts.filter(product => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.category?.toLowerCase().includes(searchTerm.toLowerCase());
      
      switch (filter) {
        case 'eligible':
          return matchesSearch && product.eligible;
        case 'synced':
          return matchesSearch && product.publicStatus === 'synced';
        case 'not_synced':
          return matchesSearch && product.publicStatus === 'not_synced';
        case 'high_priority':
          return matchesSearch && product.priority === 'high';
        default:
          return matchesSearch;
      }
    });
  }, [internalProducts, filter, searchTerm]);

  // Handle bulk sync
  const handleBulkSync = async () => {
    if (selectedProducts.size === 0) return;
    
    setSyncing(true);
    try {
      console.log('Starting bulk sync for', selectedProducts.size, 'products');
      
      const productIds = Array.from(selectedProducts);
      const result = await productSyncService.bulkSyncProducts(productIds);
      
      if (result.success) {
        const { results, errors } = result.data;
        
        if (errors.length > 0) {
          console.warn('Some products failed to sync:', errors);
          alert(`Synced ${results.length} products successfully. ${errors.length} failed.`);
        } else {
          alert(`Successfully synced ${results.length} products!`);
        }
        
        // Refresh data
        await loadData();
        setSelectedProducts(new Set());
      } else {
        throw new Error(result.message || 'Bulk sync failed');
      }
    } catch (err) {
      console.error('Bulk sync error:', err);
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle single product sync
  const handleSingleSync = async (productId) => {
    setSyncing(true);
    try {
      const result = await productSyncService.syncProductToPublic(productId);
      
      if (result.success) {
        alert('Product synced successfully!');
        await loadData();
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (err) {
      console.error('Single sync error:', err);
      alert('Sync failed: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // Handle product selection
  const handleProductToggle = (productId) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Update sync rules
  const handleUpdateSyncRules = async () => {
    try {
      const result = await productSyncService.updateSyncRules(syncRules);
      if (result.success) {
        alert('Sync rules updated successfully!');
        setShowRulesModal(false);
        await loadData(); // Refresh to see eligibility changes
      }
    } catch (err) {
      alert('Failed to update sync rules: ' + err.message);
    }
  };

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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEligibilityBadge = (product) => {
    if (product.eligible) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Eligible</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Not Eligible</span>;
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
          Smart Product Sync Dashboard
        </h1>
        <p className="text-gray-600">
          Manage product visibility between internal inventory and public e-commerce catalog
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">Error: {error}</p>
            <button 
              onClick={loadData}
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
              <p className="text-sm font-medium text-gray-500">Synced to Public</p>
              <p className="text-2xl font-bold text-green-600">{syncStats.totalPublic}</p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Eligible for Sync</p>
              <p className="text-2xl font-bold text-blue-600">{syncStats.eligible}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sync Rate</p>
              <p className="text-2xl font-bold text-purple-600">{syncStats.syncRate}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              />
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              <option value="eligible">Eligible for Sync</option>
              <option value="synced">Already Synced</option>
              <option value="not_synced">Not Synced</option>
              <option value="high_priority">High Priority</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowRulesModal(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Sync Rules
            </button>

            {selectedProducts.size > 0 && (
              <button
                onClick={handleBulkSync}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {syncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Sync {selectedProducts.size} Selected
              </button>
            )}
            
            <button 
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Eligibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => handleProductToggle(product.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {product.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {product.category} • {product.supplier || 'Unknown Supplier'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{product.stock || 0} units</div>
                    <div className={`text-xs ${(product.stock || 0) >= syncRules.minStock ? 'text-green-600' : 'text-red-600'}`}>
                      {(product.stock || 0) >= syncRules.minStock ? 'Above minimum' : 'Below minimum'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      Internal: RM {(product.price || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600">
                      Public: RM {(product.suggestedPublicPrice || 0).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(product.publicStatus)}
                      <span className="text-sm text-gray-900 capitalize">
                        {product.publicStatus?.replace('_', ' ')}
                      </span>
                    </div>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(product.priority)}`}>
                      {product.priority} priority
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {getEligibilityBadge(product)}
                      {product.eligibilityReasons && product.eligibilityReasons.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {product.eligibilityReasons[0]}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {product.publicStatus === 'not_synced' && product.eligible ? (
                      <button 
                        onClick={() => handleSingleSync(product.id)}
                        disabled={syncing}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1 disabled:opacity-50"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Sync Now
                      </button>
                    ) : (
                      <button className="text-gray-600 hover:text-gray-900">
                        View Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}

      {/* Sync Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Sync Rules Configuration</h3>
              <button
                onClick={() => setShowRulesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Stock Level
                </label>
                <input
                  type="number"
                  value={syncRules.minStock}
                  onChange={(e) => setSyncRules(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price Markup (%)
                </label>
                <input
                  type="number"
                  value={syncRules.priceMarkup}
                  onChange={(e) => setSyncRules(prev => ({ ...prev, priceMarkup: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enabled Categories
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {availableCategories.map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={syncRules.categories.includes(category)}
                        onChange={(e) => {
                          const newCategories = e.target.checked 
                            ? [...syncRules.categories, category]
                            : syncRules.categories.filter(c => c !== category);
                          setSyncRules(prev => ({ ...prev, categories: newCategories }));
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{category}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={syncRules.autoSync}
                  onChange={(e) => setSyncRules(prev => ({ ...prev, autoSync: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Enable Auto-Sync</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSyncRules}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartProductSyncDashboard;
