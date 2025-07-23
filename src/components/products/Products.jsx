// src/components/products/Products.jsx
import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertCircle, 
  TrendingUp, DollarSign, Layers, Clock, CheckCircle,
  RefreshCw, Database, Cloud, FileText
} from 'lucide-react';
import { useProducts } from '../../hooks/useProducts';
import { useSuppliers } from '../../hooks/useSuppliers';
import { usePermissions } from '../../hooks/usePermissions';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import FurnishModal from './FurnishModal';

const Products = ({ showNotification }) => {
  const permissions = usePermissions();
  const { 
    products, 
    loading, 
    error,
    dataSource,
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductStock,
    getLowStockProducts,
    toggleDataSource,
    migrateToFirestore,
    refetch
  } = useProducts();
  
  const { suppliers } = useSuppliers();
  
  const [showModal, setShowModal] = useState(false);
  const [showFurnishModal, setShowFurnishModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [initialTab, setInitialTab] = useState('basic'); // NEW: For tab control
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [filterDocumentation, setFilterDocumentation] = useState('all'); // NEW: Documentation filter
  const [viewMode, setViewMode] = useState('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canEdit = permissions.canEditProducts || permissions.isAdmin;
  const canView = permissions.canViewProducts || permissions.isAdmin;

  // NEW: Helper function to get documentation status
  const getDocumentationStatus = (product) => {
    if (!product.documents || !product.documents.metadata) {
      return 'incomplete';
    }
    return product.documents.metadata.completeness || 'incomplete';
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const supplier = suppliers.find(s => s.id === product.supplierId);
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || product.status === filterStatus;
    
    // Stock filter - handle both 'stock' and 'currentStock' field names
    const productStock = product.stock || product.currentStock || 0;
    const productMinStock = product.minStock || product.minStockLevel || 10;
    
    const matchesStock = filterStock === 'all' ||
      (filterStock === 'low' && productStock <= productMinStock && productStock > 0) ||
      (filterStock === 'out' && productStock === 0) ||
      (filterStock === 'ok' && productStock > productMinStock);
    
    // NEW: Documentation filter
    const docStatus = getDocumentationStatus(product);
    const matchesDocumentation = filterDocumentation === 'all' || docStatus === filterDocumentation;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesStock && matchesDocumentation;
  });

  // Get categories from products
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  
  // Calculate stats
  const lowStockProducts = getLowStockProducts();
  
  // NEW: Calculate documentation stats
  const documentationStats = {
    complete: products.filter(p => getDocumentationStatus(p) === 'complete').length,
    basic: products.filter(p => getDocumentationStatus(p) === 'basic').length,
    incomplete: products.filter(p => getDocumentationStatus(p) === 'incomplete').length
  };

  const stats = {
    total: products.length,
    lowStock: lowStockProducts.length,
    outOfStock: products.filter(p => {
      const stock = p.stock || p.currentStock || 0;
      return stock === 0;
    }).length,
    totalValue: products.reduce((sum, p) => {
      const stock = p.stock || p.currentStock || 0;
      const price = p.unitCost || p.unitPrice || 0;
      return sum + (stock * price);
    }, 0),
    // NEW: Documentation stats
    documentsComplete: documentationStats.complete
  };

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setInitialTab('basic'); // Reset to basic tab
    setShowModal(true);
  };

  // NEW: Enhanced edit handler with tab support
  const handleEditProduct = (product, tab = 'basic') => {
    if (!canEdit) return;
    setSelectedProduct(product);
    setInitialTab(tab); // Set the initial tab
    setShowModal(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!canEdit) return;
    
    if (window.confirm('Are you sure you want to delete this product?')) {
      const result = await deleteProduct(id);
      if (result.success) {
        showNotification('Product deleted successfully', 'success');
      } else {
        showNotification(result.error || 'Failed to delete product', 'error');
      }
    }
  };

  const handleSaveProduct = async (productData) => {
    if (selectedProduct) {
      const result = await updateProduct(selectedProduct.id, productData);
      if (result.success) {
        showNotification('Product updated successfully', 'success');
        setShowModal(false);
        setSelectedProduct(null);
        setInitialTab('basic');
      } else {
        showNotification(result.error || 'Failed to update product', 'error');
      }
    } else {
      const result = await addProduct(productData);
      if (result.success) {
        showNotification('Product added successfully', 'success');
        setShowModal(false);
        setSelectedProduct(null);
        setInitialTab('basic');
      } else {
        showNotification(result.error || 'Failed to add product', 'error');
      }
    }
  };

  const handleFurnishProduct = (product) => {
    if (!canEdit) return;
    setSelectedProduct(product);
    setShowFurnishModal(true);
  };

  const handleFurnish = async (quantity) => {
    if (!selectedProduct || !canEdit) return;
    
    const result = await updateProductStock(selectedProduct.id, quantity, 'subtract');
    if (result.success) {
      await updateProduct(selectedProduct.id, { status: 'furnished' });
      showNotification(`Furnished ${quantity} units successfully`, 'success');
      setShowFurnishModal(false);
    } else {
      showNotification(result.error || 'Failed to furnish product', 'error');
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      showNotification('Data refreshed successfully', 'success');
    } catch (error) {
      showNotification('Failed to refresh data', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMigrate = async () => {
    try {
      const result = await migrateToFirestore();
      showNotification(`Successfully migrated ${result.migrated} products to Firestore`, 'success');
      return result;
    } catch (error) {
      showNotification('Migration failed: ' + error.message, 'error');
      throw error;
    }
  };

  // NEW: Handle modal close with cleanup
  const handleModalClose = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setInitialTab('basic');
  };

  if (!canView) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You do not have permission to view products.</p>
      </div>
    );
  }

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Source Toggle */}
        dataSource={dataSource}
        onToggle={toggleDataSource}
        onMigrate={handleMigrate}
        loading={loading}
        supplierCount={products.length}
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">
            Manage your product inventory and documentation
            {dataSource === 'firestore' && (
              <span className="ml-2 text-sm text-blue-600">(Real-time sync enabled)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {canEdit && (
            <button
              onClick={handleAddProduct}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{stats.lowStock}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <Layers className="h-8 w-8 text-red-500" />
          </div>
        </div>

        {/* NEW: Documentation Stats */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Complete Docs</p>
              <p className="text-2xl font-bold text-green-600">{stats.documentsComplete}</p>
            </div>
            <FileText className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold">
                RM{stats.totalValue.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>

          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="complete">Complete</option>
            <option value="furnished">Furnished</option>
          </select>

          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value)}
          >
            <option value="all">All Stock Levels</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>

          {/* NEW: Documentation Filter */}
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterDocumentation}
            onChange={(e) => setFilterDocumentation(e.target.value)}
          >
            <option value="all">All Documentation</option>
            <option value="complete">Complete Docs</option>
            <option value="basic">Basic Docs</option>
            <option value="incomplete">Missing Docs</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Documentation Status Summary */}
      {filterDocumentation === 'all' && (
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <FileText className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-sm font-medium text-gray-900">Documentation Progress</h3>
                <p className="text-xs text-gray-600">
                  {documentationStats.complete} complete • {documentationStats.basic} basic • {documentationStats.incomplete} missing
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: `${products.length > 0 ? (documentationStats.complete / products.length) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {products.length > 0 ? Math.round((documentationStats.complete / products.length) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Products Display */}
      {loading && products.length > 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Updating...</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              supplier={suppliers.find(s => s.id === product.supplierId)}
              onEdit={handleEditProduct} // Now supports tab parameter
              onDelete={() => handleDeleteProduct(product.id)}
              onFurnish={() => handleFurnishProduct(product)}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        // List view would go here - keeping it simple for now
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <p className="p-4 text-gray-500">List view coming soon...</p>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Products</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterStock !== 'all' || filterDocumentation !== 'all'
                ? 'No products found matching your filters.'
                : 'Get started by adding a new product.'}
            </p>
            {canEdit && !searchTerm && filterCategory === 'all' && filterStatus === 'all' && filterStock === 'all' && filterDocumentation === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleAddProduct}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Product
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ProductModal
          product={selectedProduct}
          suppliers={suppliers}
          onSave={handleSaveProduct}
          onClose={handleModalClose} // Updated to use new handler
          initialTab={initialTab} // NEW: Pass initial tab
          showNotification={showNotification} // NEW: Pass notification handler
        />
      )}

      {showFurnishModal && selectedProduct && (
        <FurnishModal
          product={selectedProduct}
          onFurnish={handleFurnish}
          onClose={() => setShowFurnishModal(false)}
        />
      )}
    </div>
  );
};

export default Products;
