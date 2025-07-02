// src/components/procurement/PIModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag 
} from 'lucide-react';

const PIModal = ({ proformaInvoice, suppliers, products, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    piNumber: '',
    supplierId: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'draft',
    deliveryStatus: 'pending',
    purpose: 'stock',
    notes: '',
    attachments: []
  });

  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (proformaInvoice) {
      setFormData({
        ...proformaInvoice,
        date: proformaInvoice.date?.split('T')[0] || new Date().toISOString().split('T')[0]
      });
      setSelectedProducts(proformaInvoice.items || []);
    } else {
      // Generate PI number
      const date = new Date();
      const piNumber = `PI-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, piNumber }));
    }
  }, [proformaInvoice]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.piNumber) newErrors.piNumber = 'PI Number is required';
    if (!formData.supplierId) newErrors.supplierId = 'Supplier is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (selectedProducts.length === 0) newErrors.items = 'At least one item is required';
    
    selectedProducts.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`quantity-${index}`] = 'Valid quantity required';
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        newErrors[`price-${index}`] = 'Valid price required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const totalAmount = selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
    
    onSave({
      ...formData,
      items: selectedProducts,
      totalAmount
    });
  };

  const handleAddProduct = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity if product already exists
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setSelectedProducts(updated);
    } else {
      // Add new product
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: product.id,
          productName: product.name,
          productCode: product.sku || product.code,
          quantity: 1,
          unitPrice: product.price || 0,
          totalPrice: product.price || 0,
          notes: ''
        }
      ]);
    }
    
    setSearchProduct('');
    setShowProductSearch(false);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index][field] = value;
    
    // Recalculate total if quantity or price changed
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
    }
    
    setSelectedProducts(updated);
  };

  const handleRemoveItem = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter(product => {
    const matchesSupplier = formData.supplierId ? product.supplierId === formData.supplierId : true;
    const matchesSearch = product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchProduct.toLowerCase());
    return matchesSupplier && matchesSearch;
  });

  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
  const totalAmount = selectedProducts.reduce((sum, item) => sum + (item.totalPrice || 0), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {proformaInvoice ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PI Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.piNumber}
                onChange={(e) => setFormData({ ...formData, piNumber: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.piNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="PI-20240109-001"
              />
              {errors.piNumber && <p className="text-red-500 text-xs mt-1">{errors.piNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="stock">Stock</option>
                <option value="r&d">R&D</option>
                <option value="client-order">Client Order</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Status
              </label>
              <select
                value={formData.deliveryStatus}
                onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="in-transit">In Transit</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Items <span className="text-red-500">*</span>
              </label>
              {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}
            </div>
            
            {/* Product Search */}
            {formData.supplierId && (
              <div className="relative mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    onFocus={() => setShowProductSearch(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {showProductSearch && searchProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => handleAddProduct(product)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-600">{product.sku} - ${product.price}</div>
                          </div>
                          <Plus size={16} className="text-gray-400" />
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No products found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected Products */}
            {selectedProducts.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProducts.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <div>
                            <div className="font-medium">{item.productName}</div>
                            <div className="text-sm text-gray-600">{item.productCode}</div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`quantity-${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              errors[`price-${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </td>
                        <td className="px-4 py-2 font-medium">
                          ${item.totalPrice.toFixed(2)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right font-medium">Total:</td>
                      <td className="px-4 py-2 font-bold">${totalAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!formData.supplierId && (
              <div className="text-center py-8 text-gray-500">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                <p>Select a supplier to add products</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>
        </form>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {proformaInvoice ? 'Update' : 'Create'} PI
          </button>
        </div>
      </div>
    </div>
  );
};

export default PIModal;
