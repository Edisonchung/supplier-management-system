// src/components/purchase-orders/POModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Info, TrendingUp, Users, Package, CreditCard, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const POModal = ({ isOpen, onClose, onSave, editingPO = null }) => {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [formData, setFormData] = useState({
    clientPoNumber: '',
    clientName: '',
    clientContact: '',
    clientEmail: '',
    clientPhone: '',
    orderDate: new Date().toISOString().split('T')[0],
    requiredDate: '',
    paymentTerms: '',
    deliveryTerms: '',
    items: []
  });

  const [extractionResult, setExtractionResult] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);

  // AI Extraction Service embedded
  const MCP_SERVER_URL = process.env.REACT_APP_MCP_SERVER_URL || 'http://localhost:3001';

  const extractFromFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${MCP_SERVER_URL}/api/extract-po`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extract data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Extraction failed');
      }

      // Transform the extracted data to match form structure
      return {
        success: result.success,
        data: transformExtractedData(result.data),
        confidence: result.confidence || 0.85,
        model: result.model || 'multi-ai'
      };
    } catch (error) {
      console.error('AI Extraction failed:', error);
      throw error;
    }
  };

  const transformExtractedData = (data) => {
    // Ensure all required fields are present with defaults
    return {
      clientPoNumber: data.clientPoNumber || '',
      clientName: data.clientName || '',
      clientContact: data.clientContact || '',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      orderDate: data.orderDate || new Date().toISOString().split('T')[0],
      requiredDate: data.requiredDate || '',
      items: Array.isArray(data.items) ? data.items.map(item => ({
        productName: item.productName || '',
        productCode: item.productCode || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
      })) : [],
      paymentTerms: data.paymentTerms || '',
      deliveryTerms: data.deliveryTerms || '',
      _validation: data._validation,
      warnings: data.warnings,
      recommendations: data.recommendations
    };
  };

  useEffect(() => {
    if (editingPO) {
      setFormData(editingPO);
    }
  }, [editingPO]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setExtracting(true);
    setExtractionResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);

    try {
      // Extract data from file
      const result = await extractFromFile(file);
      
      // Set form data
      setFormData(result.data);
      
      // Store extraction result for display
      setExtractionResult({
        success: result.success,
        confidence: result.confidence,
        model: result.model,
        validation: result.data._validation,
        recommendations: result.data.recommendations
      });
      
      // Check for duplicates
      if (result.data.warnings) {
        const duplicateWarning = result.data.warnings.find(w => w.type === 'duplicate');
        if (duplicateWarning) {
          setDuplicateWarning(duplicateWarning);
        }
      }
      
      // Set validation results
      if (result.data._validation) {
        setValidationErrors(result.data._validation.errors || []);
        setValidationWarnings(result.data._validation.warnings || []);
      }
      
      // Show recommendations if available
      if (result.data.recommendations && result.data.recommendations.length > 0) {
        setShowRecommendations(true);
      }
      
    } catch (error) {
      console.error('Extraction failed:', error);
      alert('Failed to extract data from file. Please try again or enter manually.');
    } finally {
      setExtracting(false);
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
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        productName: '',
        productCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before saving
    const errors = [];
    if (!formData.clientPoNumber) errors.push({ field: 'clientPoNumber', message: 'PO number is required' });
    if (!formData.clientName) errors.push({ field: 'clientName', message: 'Client name is required' });
    if (formData.items.length === 0) errors.push({ field: 'items', message: 'At least one item is required' });
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      await onSave(formData);
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
                  <p className="text-sm text-gray-600">Upload PDF, Image, Excel or Email files</p>
                </div>
              </div>
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.eml,.msg"
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
                      Upload Document
                    </>
                  )}
                </div>
              </label>
            </div>

            {/* Extraction Result */}
            {extractionResult && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-medium">Extraction Complete</span>
                  <span className="text-gray-600">
                    (Confidence: {Math.round(extractionResult.confidence * 100)}%)
                  </span>
                  <span className="text-purple-600 font-medium">
                    Model: {extractionResult.model}
                  </span>
                </div>

                {/* Validation Results */}
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
                              {warning.corrected && (
                                <span className="ml-1">
                                  ({warning.original} → {warning.corrected})
                                </span>
                              )}
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
                        <button className="text-xs text-red-600 underline mt-1 hover:text-red-800">
                          View Similar PO
                        </button>
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
                  <span className="text-sm text-gray-600">
                    ({extractionResult.recommendations.length} insights available)
                  </span>
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
                      <div className="flex items-start gap-3">
                        {rec.type === 'price_optimization' && <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />}
                        {rec.type === 'supplier_recommendation' && <Users className="w-5 h-5 text-blue-600 mt-0.5" />}
                        {rec.type === 'inventory_insight' && <Package className="w-5 h-5 text-orange-600 mt-0.5" />}
                        {rec.type === 'payment_terms' && <CreditCard className="w-5 h-5 text-purple-600 mt-0.5" />}
                        
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{rec.title}</h4>
                          
                          {rec.items && (
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              {rec.items.map((item, itemIdx) => (
                                <li key={itemIdx} className="flex justify-between">
                                  <span>{item.product}</span>
                                  <span className="text-green-600 font-medium">
                                    Save ${item.potentialSaving.toFixed(2)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {rec.suppliers && (
                            <ul className="mt-2 space-y-2 text-sm">
                              {rec.suppliers.slice(0, 2).map((supplier, supIdx) => (
                                <li key={supIdx} className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium">{supplier.name}</span>
                                    <span className="text-gray-500 ml-2">★ {supplier.rating}</span>
                                  </div>
                                  <button className="text-blue-600 hover:text-blue-800 text-xs">
                                    View Details
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {rec.insights && (
                            <ul className="mt-2 space-y-1 text-sm text-gray-600">
                              {rec.insights.map((insight, insIdx) => (
                                <li key={insIdx} className="flex items-start gap-2">
                                  <Info className="w-3 h-3 text-orange-600 mt-0.5" />
                                  <span>{insight.message}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          
                          {rec.suggestion && (
                            <p className="mt-2 text-sm text-gray-600">
                              Suggestion: {rec.suggestion.reason}
                            </p>
                          )}
                        </div>
                      </div>
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
                    value={formData.clientPoNumber}
                    onChange={(e) => handleInputChange('clientPoNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.find(e => e.field === 'clientPoNumber') 
                        ? 'border-red-500' 
                        : 'border-gray-300'
                    }`}
                    required
                  />
                  {validationErrors.find(e => e.field === 'clientPoNumber') && (
                    <p className="text-red-500 text-xs mt-1">
                      {validationErrors.find(e => e.field === 'clientPoNumber').message}
                    </p>
                  )}
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
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    placeholder="e.g., 30 days"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Terms
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryTerms}
                    onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                    placeholder="e.g., DDP"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Order Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Item
                </button>
              </div>

              {validationErrors.find(e => e.field === 'items') && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    {validationErrors.find(e => e.field === 'items').message}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                      className="mt-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove Item
                    </button>
                  </div>
                ))}
              </div>

              {/* Total */}
              {formData.items.length > 0 && (
                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold">
                    Total: ${calculateTotal().toFixed(2)}
                  </p>
                </div>
              )}
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
            disabled={loading}
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
