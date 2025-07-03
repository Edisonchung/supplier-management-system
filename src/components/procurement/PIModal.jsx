// src/components/procurement/PIModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag,
  Truck, AlertCircle, CheckSquare, Square
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
    attachments: [],
    etaDate: '',
    receivedDate: '',
    hasDiscrepancy: false
  });

  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details'); // details or receiving

  useEffect(() => {
    if (proformaInvoice) {
      setFormData({
        ...proformaInvoice,
        date: proformaInvoice.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        etaDate: proformaInvoice.etaDate?.split('T')[0] || '',
        receivedDate: proformaInvoice.receivedDate?.split('T')[0] || ''
      });
      
      // Initialize items with receiving data
      const itemsWithReceiving = proformaInvoice.items?.map(item => ({
        ...item,
        receivedQty: item.receivedQty || 0,
        isReceived: item.isReceived || false,
        receivingNotes: item.receivingNotes || '',
        allocations: item.allocations || []
      })) || [];
      
      setSelectedProducts(itemsWithReceiving);
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
    
    // Check for discrepancies
    const hasDiscrepancy = selectedProducts.some(item => 
      item.receivedQty > 0 && item.receivedQty !== item.quantity
    );
    
    onSave({
      ...formData,
      items: selectedProducts,
      totalAmount,
      hasDiscrepancy
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
          notes: '',
          receivedQty: 0,
          isReceived: false,
          receivingNotes: '',
          allocations: []
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
    
    // Check if item is fully received
    if (field === 'receivedQty') {
      updated[index].isReceived = value >= updated[index].quantity;
    }
    
    setSelectedProducts(updated);
  };

  const handleToggleReceived = (index) => {
    const updated = [...selectedProducts];
    updated[index].isReceived = !updated[index].isReceived;
    
    // If marking as received, set received qty to ordered qty
    if (updated[index].isReceived) {
      updated[index].receivedQty = updated[index].quantity;
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
  const totalReceived = selectedProducts.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
  const totalOrdered = selectedProducts.reduce((sum, item) => sum + (item.quantity || 0), 0);

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

        {/* Tabs for Edit Mode */}
        {proformaInvoice && (
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'details' 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                PI Details
              </button>
              <button
                onClick={() => setActiveTab('receiving')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'receiving' 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stock Receiving
                {formData.hasDiscrepancy && (
                  <AlertCircle className="inline-block ml-2 h-4 w-4 text-orange-500" />
                )}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'details' ? (
            <>
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
                    <option value="partial">Partial Delivery</option>
                  </select>
                </div>

                {/* ETA Date - Show when in-transit */}
                {formData.deliveryStatus === 'in-transit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ETA Date
                    </label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={formData.etaDate}
                        onChange={(e) => setFormData({ ...formData, etaDate: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                )}

                {/* Received Date - Show when delivered */}
                {(formData.deliveryStatus === 'delivered' || formData.deliveryStatus === 'partial') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Date
                    </label>
                    <input
                      type="date"
                      value={formData.receivedDate}
                      onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
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
            </>
          ) : (
            // Receiving Tab
            <div className="space-y-6">
              {/* Receiving Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Ordered</p>
                    <p className="text-xl font-bold">{totalOrdered} items</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Received</p>
                    <p className="text-xl font-bold text-green-600">{totalReceived} items</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pending</p>
                    <p className="text-xl font-bold text-orange-600">{totalOrdered - totalReceived} items</p>
                  </div>
                </div>
              </div>

              {/* Receiving Items */}
              <div className="space-y-4">
                {selectedProducts.map((item, index) => {
                  const hasDiscrepancy = item.receivedQty > 0 && item.receivedQty !== item.quantity;
                  
                  return (
                    <div key={index} className={`border rounded-lg p-4 ${hasDiscrepancy ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.productName}</h4>
                          <p className="text-sm text-gray-600">{item.productCode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleReceived(index)}
                          className="ml-4"
                        >
                          {item.isReceived ? (
                            <CheckSquare className="h-5 w-5 text-green-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Ordered Qty</label>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Received Qty</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={item.receivedQty}
                            onChange={(e) => handleUpdateItem(index, 'receivedQty', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Difference</label>
                          <p className={`font-medium ${
                            item.quantity - item.receivedQty > 0 ? 'text-orange-600' : 
                            item.quantity - item.receivedQty < 0 ? 'text-red-600' : 
                            'text-green-600'
                          }`}>
                            {item.quantity - item.receivedQty}
                          </p>
                        </div>
                      </div>

                      {hasDiscrepancy && (
                        <div className="mt-3 p-2 bg-orange-100 rounded flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-800">Quantity discrepancy detected</span>
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="block text-sm text-gray-600 mb-1">Receiving Notes</label>
                        <input
                          type="text"
                          value={item.receivingNotes}
                          onChange={(e) => handleUpdateItem(index, 'receivingNotes', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Damaged packaging, Wrong item, etc."
                        />
                      </div>

                      {/* PO Allocation Section (Future Enhancement) */}
                      {item.receivedQty > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Note:</span> Stock allocation to POs will be available in the next update
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
