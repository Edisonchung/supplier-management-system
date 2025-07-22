// src/components/products/ProductModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Layers, Tag, Hash, Image, FileText, Info, Clock, AlertCircle, Save } from 'lucide-react';
import { DocumentManager } from '../documents/DocumentManager';

const ProductModal = ({ product, suppliers, onSave, onClose, initialTab = 'basic', showNotification }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    supplierId: '',
    category: 'electronics',
    price: '',
    status: 'pending',
    description: '',
    sku: '',
    stock: 0,
    minStock: 5,
    photo: '',
    catalog: '',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tab configuration
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'History', icon: Clock }
  ];

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        brand: product.brand || '',
        supplierId: product.supplierId || '',
        category: product.category || 'electronics',
        price: product.price || '',
        status: product.status || 'pending',
        description: product.description || '',
        sku: product.sku || '',
        stock: product.stock || 0,
        minStock: product.minStock || 5,
        photo: product.photo || '',
        catalog: product.catalog || '',
        notes: product.notes || ''
      });
    } else {
      // Reset form for new product
      setFormData({
        name: '',
        brand: '',
        supplierId: '',
        category: 'electronics',
        price: '',
        status: 'pending',
        description: '',
        sku: '',
        stock: 0,
        minStock: 5,
        photo: '',
        catalog: '',
        notes: ''
      });
    }
    setErrors({});
    setActiveTab(initialTab);
  }, [product, initialTab]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    if (formData.minStock < 0) {
      newErrors.minStock = 'Minimum stock cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setActiveTab('basic'); // Switch to basic tab if validation fails
      return;
    }

    setIsSubmitting(true);
    
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        updatedAt: new Date().toISOString()
      };

      if (product?.id) {
        productData.id = product.id;
      }

      await onSave(productData);
      
      if (showNotification) {
        showNotification(
          `Product ${product?.id ? 'updated' : 'created'} successfully`, 
          'success'
        );
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      if (showNotification) {
        showNotification('Error saving product', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDocumentSave = async (updatedProduct) => {
    try {
      await onSave(updatedProduct);
      if (showNotification) {
        showNotification('Product documents updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating product documents:', error);
      if (showNotification) {
        showNotification('Error updating documents', 'error');
      }
    }
  };

  const categories = [
    'electronics',
    'hydraulics',
    'pneumatics',
    'automation',
    'sensors',
    'cables',
    'components',
    'mechanical',
    'bearings',
    'gears',
    'couplings',
    'drives',
    'instrumentation',
    'networking_products',
    'diaphragm_pumps',
    'pumping_systems',
    'fluid_handling'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const hasErrors = tab.id === 'basic' && Object.keys(errors).length > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {hasErrors && (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'basic' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter product name"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product brand"
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SKU
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="SKU-12345"
                    />
                  </div>
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => handleChange('supplierId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.supplierId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.price ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="complete">Complete</option>
                    {product?.status === 'furnished' && <option value="furnished">Furnished</option>}
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product description..."
                  />
                </div>

                {/* Photo URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo URL
                  </label>
                  <div className="relative">
                    <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="url"
                      value={formData.photo}
                      onChange={(e) => handleChange('photo', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>

                {/* Catalog URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catalog URL
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="url"
                      value={formData.catalog}
                      onChange={(e) => handleChange('catalog', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/catalog.pdf"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => handleChange('stock', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.stock ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                </div>

                {/* Minimum Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => handleChange('minStock', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.minStock ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="5"
                  />
                  {errors.minStock && <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>}
                </div>
              </div>

              {/* Stock Alert */}
              {formData.stock && formData.minStock && parseInt(formData.stock) <= parseInt(formData.minStock) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Low Stock Warning</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Current stock ({formData.stock}) is at or below minimum level ({formData.minStock}).
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documents' && product?.id && (
            <div className="p-6">
              <DocumentManager 
                product={{ ...product, ...formData }}
                onSave={handleDocumentSave}
              />
            </div>
          )}

          {activeTab === 'documents' && !product?.id && (
            <div className="p-6">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Save Product First
                </h3>
                <p className="text-gray-600 mb-4">
                  You need to save the product before managing documents.
                </p>
                <button
                  onClick={() => setActiveTab('basic')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Basic Info
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Product History</h3>
              
              {product?.id ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Created:</strong> {product.dateAdded ? new Date(product.dateAdded).toLocaleDateString() : 'Unknown'}
                    </p>
                    {product.updatedAt && (
                      <p className="text-sm text-gray-600">
                        <strong>Last Modified:</strong> {new Date(product.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                    {product.status && (
                      <p className="text-sm text-gray-600">
                        <strong>Current Status:</strong> {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Detailed history tracking coming soon</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">History will be available after saving the product</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Actions - Only show for non-document tabs */}
        {activeTab !== 'documents' && (
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              <Save size={16} />
              <span>{isSubmitting ? 'Saving...' : (product ? 'Update' : 'Add')} Product</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductModal;
