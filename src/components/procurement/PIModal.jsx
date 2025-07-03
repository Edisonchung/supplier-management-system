// src/components/procurement/PIModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag,
  DollarSign, CreditCard
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
    paymentTerms: '30% down payment, 70% before delivery',
    paymentStatus: 'pending',
    totalPaid: 0,
    payments: [],
    shareableId: ''
  });

  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (proformaInvoice) {
      setFormData({
        ...proformaInvoice,
        date: proformaInvoice.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        shareableId: proformaInvoice.shareableId || generateShareableId()
      });
      setSelectedProducts(proformaInvoice.items || []);
    } else {
      // Generate new PI number and shareable ID
      const date = new Date();
      const piNumber = `PI-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const shareableId = generateShareableId();
      setFormData(prev => ({ ...prev, piNumber, shareableId }));
    }
  }, [proformaInvoice]);

  const generateShareableId = () => {
    return `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleAddProduct = (product) => {
    const newItem = {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      quantity: 1,
      unitPrice: product.price || 0,
      totalPrice: product.price || 0,
      receivedQty: 0
    };
    setSelectedProducts([...selectedProducts, newItem]);
    setShowProductSearch(false);
    setSearchProduct('');
  };

  const handleUpdateItem = (index, field, value) => {
    const updatedItems = [...selectedProducts];
    updatedItems[index][field] = value;
    
    if (field === 'quantity' || field === 'unitPrice') {
      updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
    }
    
    setSelectedProducts(updatedItems);
  };

  const handleRemoveItem = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

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

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
    product.code.toLowerCase().includes(searchProduct.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {proformaInvoice ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  readOnly={proformaInvoice ? true : false}
                />
                {errors.piNumber && (
                  <p className="text-red-500 text-xs mt-1">{errors.piNumber}</p>
                )}
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
                {errors.supplierId && (
                  <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>
                )}
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
                {errors.date && (
                  <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
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
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 30% down payment, 70% before delivery"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <button
                type="button"
                onClick={() => setShowProductSearch(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Add Product
              </button>
            </div>

            {errors.items && (
              <p className="text-red-500 text-sm mb-2">{errors.items}</p>
            )}

            {selectedProducts.length > 0 ? (
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
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-600">{item.productCode}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`w-20 px-2 py-1 border rounded ${
                              errors[`quantity-${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            min="0"
                            step="1"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-24 px-2 py-1 border rounded ${
                              errors[`price-${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            min="0"
                            step="0.01"
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
                      <td className="px-4 py-2 font-bold">
                        ${selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">No items added yet</p>
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

        {/* Product Search Modal */}
        {showProductSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Product</h3>
                <button
                  onClick={() => setShowProductSearch(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredProducts.map(product => (
                      <div
                        key={product.id}
                        onClick={() => handleAddProduct(product)}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-gray-600">{product.code}</p>
                          </div>
                          <p className="font-medium">${product.price?.toFixed(2) || '0.00'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No products found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PIModal;
