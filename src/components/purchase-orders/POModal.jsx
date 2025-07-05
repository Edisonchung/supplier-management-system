// src/components/purchase-orders/POModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Trash2, AlertCircle, Upload, FileText } from 'lucide-react';
import { AIExtractionService } from '../../services/aiExtractionService';


// Inline helper functions and data
const generatePONumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `PO-${year}${month}${day}-${random}`;
};

const mockProducts = [
  { id: '1', name: 'Widget A', code: 'WDG-001', price: 25.99, stock: 150 },
  { id: '2', name: 'Gadget B', code: 'GDG-002', price: 45.50, stock: 75 },
  { id: '3', name: 'Tool C', code: 'TL-003', price: 99.99, stock: 20 },
  { id: '4', name: 'Device D', code: 'DVC-004', price: 150.00, stock: 5 },
];

const POModal = ({ isOpen, onClose, onSave, purchaseOrder }) => {
  const [formData, setFormData] = useState({
    poNumber: '',
    clientPoNumber: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientPhone: '',
    orderDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    items: [],
    status: 'draft',
    paymentTerms: 'Net 30',
    deliveryTerms: 'FOB',
    notes: '',
    piAllocations: []
  });

  const [currentItem, setCurrentItem] = useState({
    productId: '',
    productName: '',
    productCode: '',
    quantity: 1,
    unitPrice: 0,
    stockAvailable: 100
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    if (purchaseOrder) {
      // Ensure all items have totalPrice
      const fixedItems = purchaseOrder.items?.map(item => ({
        ...item,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0
      })) || [];
      
      setFormData({
        ...purchaseOrder,
        items: fixedItems
      });
    } else {
      setFormData(prev => ({
        ...prev,
        poNumber: generatePONumber()
      }));
    }
  }, [purchaseOrder]);

  const handleSubmit = () => {
    // Fix items to ensure they have totalPrice
    const fixedItems = formData.items.map(item => ({
      ...item,
      totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0
    }));
    
    const subtotal = fixedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.1; // 10% tax
    
    onSave({
      ...formData,
      items: fixedItems,
      subtotal,
      tax,
      totalAmount: subtotal + tax
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);
      setIsParsing(true);
      
      // Simulate PDF parsing
      setTimeout(() => {
        // Mock extracted data
        alert('PDF data extracted successfully! Please review and make any necessary adjustments.');
        setFormData({
          ...formData,
          clientPoNumber: 'PO-2024-001',
          clientName: 'Acme Corporation',
          clientContact: 'John Smith',
          clientEmail: 'john@acme.com',
          clientPhone: '+1-555-0123',
          requiredDate: '2024-04-15',
          items: [
            {
              id: Date.now().toString(),
              productName: 'Widget A',
              productCode: 'WDG-001',
              quantity: 10,
              unitPrice: 25.99,
              totalPrice: 259.90,
              stockAvailable: 150
            }
          ]
        });
        setIsParsing(false);
      }, 2000);
    } else {
      alert('Please upload a valid PDF file.');
    }
  };

  const addItem = () => {
    if (currentItem.productName && currentItem.quantity > 0) {
      const totalPrice = currentItem.quantity * currentItem.unitPrice;
      setFormData({
        ...formData,
        items: [...formData.items, { ...currentItem, totalPrice, id: Date.now().toString() }]
      });
      setCurrentItem({
        productId: '',
        productName: '',
        productCode: '',
        quantity: 1,
        unitPrice: 0,
        stockAvailable: 100
      });
      setShowProductSearch(false);
      setSearchTerm('');
    }
  };

  const removeItem = (itemId) => {
    setFormData({
      ...formData,
      items: formData.items.filter(item => item.id !== itemId)
    });
  };

  const selectProduct = (product) => {
    setCurrentItem({
      ...currentItem,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      unitPrice: product.price,
      stockAvailable: product.stock
    });
    setSearchTerm(product.name);
    setShowProductSearch(false);
  };

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  // Safe calculation of subtotal
  const subtotal = formData.items.reduce((sum, item) => {
    const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
    return sum + itemTotal;
  }, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-semibold">
            {purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* PDF Upload Section */}
            {!purchaseOrder && (
              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-6">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-blue-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Quick Import from PDF
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Upload a Purchase Order PDF to automatically extract and fill details
                  </p>
                  
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                    <Upload size={20} />
                    {isParsing ? 'Processing PDF...' : 'Upload PDF'}
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isParsing}
                    />
                  </label>
                  
                  {uploadedFile && (
                    <p className="mt-3 text-sm text-gray-600">
                      Uploaded: {uploadedFile.name}
                    </p>
                  )}
                  
                  {isParsing && (
                    <div className="mt-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Extracting data from PDF...</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Client Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    className="w-full px-3 py-2 border rounded-lg bg-gray-100"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client PO Reference
                  </label>
                  <input
                    type="text"
                    value={formData.clientPoNumber || ''}
                    onChange={(e) => setFormData({...formData, clientPoNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName || ''}
                    onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.clientContact || ''}
                    onChange={(e) => setFormData({...formData, clientContact: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail || ''}
                    onChange={(e) => setFormData({...formData, clientEmail: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.clientPhone || ''}
                    onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div>
              <h3 className="text-lg font-medium mb-4">Order Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formData.orderDate || ''}
                    onChange={(e) => setFormData({...formData, orderDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formData.requiredDate || ''}
                    onChange={(e) => setFormData({...formData, requiredDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms || 'Net 30'}
                    onChange={(e) => setFormData({...formData, paymentTerms: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="COD">COD</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status || 'draft'}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Products</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product Search
                      </label>
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowProductSearch(true);
                        }}
                        onFocus={() => setShowProductSearch(true)}
                        placeholder="Search by name or code..."
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {showProductSearch && searchTerm && (
                        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-10">
                          {filteredProducts.map(product => (
                            <div
                              key={product.id}
                              onClick={() => selectProduct(product)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-600">
                                {product.code} • ${product.price} • Stock: {product.stock}
                              </div>
                            </div>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="p-3 text-gray-500 text-center">
                              No products found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        value={currentItem.quantity}
                        onChange={(e) => setCurrentItem({...currentItem, quantity: parseInt(e.target.value) || 0})}
                        min="1"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      {currentItem.stockAvailable < currentItem.quantity && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle size={14} />
                          Low stock
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        value={currentItem.unitPrice}
                        onChange={(e) => setCurrentItem({...currentItem, unitPrice: parseFloat(e.target.value) || 0})}
                        step="0.01"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addItem}
                        disabled={!currentItem.productName || currentItem.quantity <= 0}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Product</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Code</th>
                          <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Unit Price</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.items.map((item) => (
                          <tr key={item.id} className="border-t">
                            <td className="px-4 py-2">{item.productName || 'Unknown'}</td>
                            <td className="px-4 py-2">{item.productCode || '-'}</td>
                            <td className="px-4 py-2 text-center">{item.quantity || 0}</td>
                            <td className="px-4 py-2 text-right">${(item.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">
                              ${((item.totalPrice || (item.quantity * item.unitPrice)) || 0).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No items added yet. Search and add products above.
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            <div>
              <h3 className="text-lg font-medium mb-4">Summary</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (10%):</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add any internal notes..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.clientName || formData.items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
          >
            {purchaseOrder ? 'Update' : 'Create'} Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default POModal;
