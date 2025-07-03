// src/components/products/Products.jsx
import React, { useState, useEffect } from 'react';
import { 
  Package, Plus, Search, Filter, AlertCircle, 
  TrendingUp, DollarSign, Layers, Clock, CheckCircle
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
    addProduct,
    updateProduct,
    deleteProduct,
    updateProductStock,
    getLowStockProducts
  } = useProducts();
  
  const { suppliers } = useSuppliers();
  
  const [showModal, setShowModal] = useState(false);
  const [showFurnishModal, setShowFurnishModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStock, setFilterStock] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const canEdit = permissions.canEditProducts || permissions.isAdmin;
  const canView = permissions.canViewProducts || permissions.isAdmin;

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
    
    let matchesStock = true;
    if (filterStock === 'low') {
      matchesStock = product.stock <= product.minStock;
    } else if (filterStock === 'out') {
      matchesStock = product.stock === 0;
    } else if (filterStock === 'in-stock') {
      matchesStock = product.stock > product.minStock;
    }
    
    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    if (!canEdit) return;
    setSelectedProduct(product);
    setShowModal(true);
  };

  const handleFurnishProduct = (product) => {
    if (!canEdit) return;
    setSelectedProduct(product);
    setShowFurnishModal(true);
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
      } else {
        showNotification(result.error || 'Failed to update product', 'error');
      }
    } else {
      const result = await addProduct(productData);
      if (result.success) {
        showNotification('Product added successfully', 'success');
        setShowModal(false);
      } else {
        showNotification(result.error || 'Failed to add product', 'error');
      }
    }
  };

  const handleFurnish = async (furnishData) => {
    const result = await updateProduct(selectedProduct.id, {
      status: 'furnished',
      furnishedAt: new Date().toISOString(),
      furnishDetails: furnishData
    });
    
    if (result.success) {
      showNotification('Product furnished successfully', 'success');
      setShowFurnishModal(false);
    } else {
      showNotification(result.error || 'Failed to furnish product', 'error');
    }
  };

  // Calculate statistics
  const stats = {
    total: products.length,
    lowStock: getLowStockProducts().length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product inventory</p>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold">${stats.totalValue.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStock > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <p className="text-orange-800">
              <span className="font-medium">{stats.lowStock} products</span> are running low on stock
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
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
            <option value="electronics">Electronics</option>
            <option value="hydraulics">Hydraulics</option>
            <option value="pneumatics">Pneumatics</option>
            <option value="automation">Automation</option>
            <option value="sensors">Sensors</option>
            <option value="cables">Cables</option>
            <option value="components">Components</option>
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
            <option value="all">All Stock</option>
            <option value="in-stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
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

      {/* Product List/Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              supplier={suppliers.find(s => s.id === product.supplierId)}
              onEdit={() => handleEditProduct(product)}
              onDelete={() => handleDeleteProduct(product.id)}
              onFurnish={() => handleFurnishProduct(product)}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map(product => {
                const supplier = suppliers.find(s => s.id === product.supplierId);
                const isLowStock = product.stock <= product.minStock;
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.brand}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {product.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {supplier?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      ${product.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-medium ${
                        product.stock === 0 ? 'text-red-600' :
                        isLowStock ? 'text-orange-600' : 'text-gray-900'
                      }`}>
                        {product.stock}
                      </span>
                      <span className="text-gray-500 text-sm"> / {product.minStock}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.status === 'complete' ? 'bg-green-100 text-green-800' :
                        product.status === 'furnished' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleEditProduct(product)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </button>
                      {canEdit && product.status === 'complete' && (
                        <button
                          onClick={() => handleFurnishProduct(product)}
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          Furnish
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Products</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all' || filterStock !== 'all'
                ? 'No products found matching your filters.'
                : 'Get started by adding a new product.'}
            </p>
            {canEdit && !searchTerm && filterCategory === 'all' && filterStatus === 'all' && filterStock === 'all' && (
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
          onClose={() => setShowModal(false)}
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
