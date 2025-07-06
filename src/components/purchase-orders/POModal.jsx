// src/components/purchase-orders/POModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Info, TrendingUp, Users, Package, CreditCard, Loader2, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { AIExtractionService, ValidationService } from "../../services/ai";

const POModal = ({ isOpen, onClose, onSave, editingPO = null }) => {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [formData, setFormData] = useState({
    poNumber: '',
    clientPoNumber: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientPhone: '',
    orderDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    paymentTerms: 'Net 30',
    deliveryTerms: 'FOB',
    status: 'draft',
    notes: '',
    items: []
  });

  const [extractionResult, setExtractionResult] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentItem, setCurrentItem] = useState({
    productName: '',
    productCode: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0
  });

  // Mock products for demo
  const mockProducts = [
    { id: '1', name: 'Industrial Sensor', code: 'ISM-001', price: 450.00, stock: 50 },
    { id: '2', name: 'Control Panel', code: 'CP-100', price: 1200.00, stock: 20 },
    { id: '3', name: 'Safety Valve', code: 'SV-200', price: 350.00, stock: 100 },
    { id: '4', name: 'Motor Drive', code: 'MD-300', price: 2500.00, stock: 15 },
  ];

  // AI Extraction Service URL
  const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';

  // Generate PO number
  const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  useEffect(() => {
    if (editingPO) {
      setFormData(editingPO);
    } else {
      setFormData(prev => ({
        ...prev,
        poNumber: generatePONumber()
      }));
    }
  }, [editingPO]);

 const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  setExtracting(true);
  setValidationErrors([]);

  try {
    // Use the real AI extraction service
    const extractedData = await AIExtractionService.extractFromFile(file);
    
    // Validate the extracted data
    const validation = ValidationService.validateExtractedData(extractedData);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      // Still populate form with partial data
    }
    
    // Update form data with extracted information
    setFormData(prev => ({
      ...prev,
      orderNumber: extractedData.orderNumber || prev.orderNumber,
      clientName: extractedData.clientName || prev.clientName,
      orderDate: extractedData.orderDate || prev.orderDate,
      deliveryDate: extractedData.deliveryDate || prev.deliveryDate,
      paymentTerms: extractedData.paymentTerms || prev.paymentTerms,
      notes: extractedData.notes || prev.notes,
    }));
    
    // Update items
    if (extractedData.items && extractedData.items.length > 0) {
      setItems(extractedData.items);
    }
    
    // Show recommendations if any
    if (extractedData.recommendations && extractedData.recommendations.length > 0) {
      const recommendationMessages = extractedData.recommendations
        .map(rec => rec.message)
        .join('\n');
      alert(`AI Recommendations:\n${recommendationMessages}`);
    }
    
    // Show confidence score
    if (extractedData.confidence) {
      console.log(`Extraction confidence: ${(extractedData.confidence * 100).toFixed(0)}%`);
    }
    
  } catch (error) {
    console.error('Extraction failed:', error);
    setValidationErrors([{ field: 'file', message: error.message || 'Failed to extract data from file' }]);
  } finally {
    setExtracting(false);
    // Reset file input
    event.target.value = '';
  }
};

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // Recalculate total if quantity or unit price changed
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? Number(value) : Number(newItems[index].quantity);
      const unitPrice = field === 'unitPrice' ? Number(value) : Number(newItems[index].unitPrice);
      newItems[index].totalPrice = quantity * unitPrice;
    }
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  const addItem = () => {
    if (currentItem.productName && currentItem.quantity > 0) {
      const totalPrice = currentItem.quantity * currentItem.unitPrice;
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, { 
          ...currentItem, 
          totalPrice, 
          id: Date.now().toString() 
        }]
      }));
      
      // Reset current item
      setCurrentItem({
        productName: '',
        productCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      });
      setSearchTerm('');
      setShowProductSearch(false);
    }
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const selectProduct = (product) => {
    setCurrentItem({
      productName: product.name,
      productCode: product.code,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price
    });
    setSearchTerm(product.name);
    setShowProductSearch(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before saving
    const errors = [];
    if (!formData.clientName) errors.push({ field: 'clientName', message: 'Client name is required' });
    if (formData.items.length === 0) errors.push({ field: 'items', message: 'At least one item is required' });
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      // Calculate totals
      const subtotal = formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      const tax = subtotal * 0.1; // 10% tax
      const totalAmount = subtotal + tax;
      
      await onSave({
        ...formData,
        subtotal,
        tax,
        totalAmount
      });
      
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            <p className="text-blue-100 mt-1">AI-Enhanced Data Entry</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* AI Upload Section */}
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600 text-white rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">AI Document Extraction</h3>
                  <p className="text-sm text-gray-600">Upload PDF to auto-fill form</p>
                </div>
              </div>
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={extracting}
                />
                <div className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                  {extracting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload PDF
                    </>
                  )}
                </div>
              </label>
            </div>
            {/* Extraction Error Display */}
            {extractionError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Extraction Error</p>
                  <p className="text-sm text-red-600 mt-1">{extractionError}</p>
                </div>
              </div>
            )}

            {/* Extraction Result */}
            {extractionResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Extraction Complete</span>
                  <span className="text-gray-600">
                    (Confidence: {Math.round(extractionResult.confidence * 100)}%)
                  </span>
                </div>

                {/* Validation Warnings */}
                {validationWarnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800 mb-1">
                          Auto-corrections Applied
                        </p>
                        <ul className="text-xs text-yellow-700 space-y-1">
                          {validationWarnings.map((warning, idx) => (
                            <li key={idx}>
                              {warning.field}: {warning.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Duplicate Warning */}
                {duplicateWarning && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                          Potential Duplicate Detected
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          {duplicateWarning.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Recommendations */}
          {extractionResult?.recommendations && extractionResult.recommendations.length > 0 && (
            <div className="mb-6">
              <div 
                className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg cursor-pointer"
                onClick={() => setShowRecommendations(!showRecommendations)}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-800">AI Recommendations</h3>
                </div>
                {showRecommendations ? 
                  <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                }
              </div>

              {showRecommendations && (
                <div className="mt-3 space-y-3">
                  {extractionResult.recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-2">{rec.title}</h4>
                      {rec.items && (
                        <ul className="text-sm text-gray-600 space-y-1">
                          {rec.items.map((item, itemIdx) => (
                            <li key={itemIdx}>{item.message}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number *
                  </label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client PO Number
                  </label>
                  <input
                    type="text"
                    value={formData.clientPoNumber}
                    onChange={(e) => handleInputChange('clientPoNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.find(e => e.field === 'clientName') 
                        ? 'border-red-500' 
                        : 'border-gray-300'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={formData.clientContact}
                    onChange={(e) => handleInputChange('clientContact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) => handleInputChange('orderDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Required Date
                  </label>
                  <input
                    type="date"
                    value={formData.requiredDate}
                    onChange={(e) => handleInputChange('requiredDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Net 90">Net 90</option>
                    <option value="Due on Receipt">Due on Receipt</option>
                    <option value="2/10 Net 30">2/10 Net 30</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Terms
                  </label>
                  <select
                    value={formData.deliveryTerms}
                    onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FOB">FOB</option>
                    <option value="CIF">CIF</option>
                    <option value="DDP">DDP</option>
                    <option value="EXW">EXW</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h3>
              
              {/* Add Item Form */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="grid grid-cols-5 gap-3 mb-3">
                  <div className="col-span-2 relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
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
                      placeholder="Search products..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {showProductSearch && searchTerm && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(product => (
                            <div
                              key={product.id}
                              onClick={() => selectProduct(product)}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-600">
                                Code: {product.code} | Price: ${product.price} | Stock: {product.stock}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-gray-500 text-center">
                            No products found
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({
                        ...currentItem,
                        quantity: parseInt(e.target.value) || 1,
                        totalPrice: (parseInt(e.target.value) || 1) * currentItem.unitPrice
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      value={currentItem.unitPrice}
                      onChange={(e) => setCurrentItem({
                        ...currentItem,
                        unitPrice: parseFloat(e.target.value) || 0,
                        totalPrice: currentItem.quantity * (parseFloat(e.target.value) || 0)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total
                    </label>
                    <input
                      type="number"
                      value={currentItem.totalPrice}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                      readOnly
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  disabled={!currentItem.productName || currentItem.quantity <= 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {/* Items List */}
              {validationErrors.find(e => e.field === 'items') && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    {validationErrors.find(e => e.field === 'items').message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={item.id || index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-6 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={item.productName}
                          onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Code
                        </label>
                        <input
                          type="text"
                          value={item.productCode}
                          onChange={(e) => handleItemChange(index, 'productCode', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          min="1"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total Price
                        </label>
                        <input
                          type="number"
                          value={item.totalPrice}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                          readOnly
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove Item
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              {formData.items.length > 0 && (
                <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    * Tax will be calculated at checkout
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add any internal notes..."
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.clientName || formData.items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingPO ? 'Update' : 'Create'} Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default POModal;
