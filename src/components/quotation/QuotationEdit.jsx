// src/components/quotation/QuotationEdit.jsx
// Edit form for modifying existing quotations

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, ArrowLeft, Plus, Trash2, AlertCircle, Loader2,
  Package, User, Building2, FileText, DollarSign, Calculator,
  Calendar, Clock, RefreshCw, X, Check, Copy, Search
} from 'lucide-react';
import QuotationService from '../../services/QuotationService';
import QuotationPricingService from '../../services/QuotationPricingService';
import ContactSelector from './forms/ContactSelector';
import ProductSearchModal from './forms/ProductSearchModal';
import QuotationLineForm from './forms/QuotationLineForm';
import ShippingCalculator from './shipping/ShippingCalculator';
import DiscountCalculator from './pricing/DiscountCalculator';

const QuotationEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  
  // Original quotation data (for comparison)
  const [originalQuotation, setOriginalQuotation] = useState(null);
  
  // Form data
  const [quotation, setQuotation] = useState(null);
  const [lines, setLines] = useState([]);
  const [deletedLineIds, setDeletedLineIds] = useState([]);
  
  // UI states
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [editingLineIndex, setEditingLineIndex] = useState(null);
  const [showShippingCalc, setShowShippingCalc] = useState(false);
  const [showDiscountCalc, setShowDiscountCalc] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  
  // Computed values
  const [totals, setTotals] = useState({
    subtotal: 0,
    discount: 0,
    taxAmount: 0,
    shippingCost: 0,
    grandTotal: 0
  });

  // Fetch quotation data
  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const quotationData = await QuotationService.getQuotation(id);
        if (!quotationData) {
          throw new Error('Quotation not found');
        }
        
        // Check if quotation can be edited
        const nonEditableStatuses = ['converted', 'cancelled'];
        if (nonEditableStatuses.includes(quotationData.status)) {
          throw new Error(`Cannot edit quotation with status: ${quotationData.status}`);
        }
        
        // Fetch lines
        const quotationLines = await QuotationService.getQuotationLines(id);
        
        setOriginalQuotation(JSON.parse(JSON.stringify(quotationData)));
        setQuotation(quotationData);
        setLines(quotationLines.sort((a, b) => a.lineNumber - b.lineNumber));
        
      } catch (err) {
        console.error('Error fetching quotation:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchQuotation();
    }
  }, [id]);

  // Recalculate totals when lines change
  useEffect(() => {
    calculateTotals();
  }, [lines, quotation?.overallDiscount, quotation?.taxRate, quotation?.totals?.shippingCost]);

  // Track changes for dirty state
  useEffect(() => {
    if (originalQuotation && quotation) {
      const hasChanges = JSON.stringify(originalQuotation) !== JSON.stringify(quotation) ||
                        deletedLineIds.length > 0 ||
                        lines.some(l => l._modified);
      setIsDirty(hasChanges);
    }
  }, [quotation, lines, deletedLineIds, originalQuotation]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const calculateTotals = useCallback(() => {
    if (!lines.length) {
      setTotals({ subtotal: 0, discount: 0, taxAmount: 0, shippingCost: 0, grandTotal: 0 });
      return;
    }
    
    const subtotal = lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
    const overallDiscountPercent = quotation?.overallDiscount?.percentage || 0;
    const overallDiscountAmount = quotation?.overallDiscount?.amount || 0;
    const discount = overallDiscountAmount || (subtotal * overallDiscountPercent / 100);
    
    const afterDiscount = subtotal - discount;
    const taxRate = quotation?.taxRate || 0;
    const taxAmount = afterDiscount * taxRate / 100;
    const shippingCost = quotation?.totals?.shippingCost || 0;
    
    const grandTotal = afterDiscount + taxAmount + shippingCost;
    
    setTotals({
      subtotal,
      discount,
      taxAmount,
      shippingCost,
      grandTotal
    });
  }, [lines, quotation?.overallDiscount, quotation?.taxRate, quotation?.totals?.shippingCost]);

  // Update quotation field
  const updateField = (field, value) => {
    setQuotation(prev => {
      const updated = { ...prev };
      
      // Handle nested fields with dot notation
      if (field.includes('.')) {
        const parts = field.split('.');
        let current = updated;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = {};
          current = current[parts[i]];
        }
        current[parts[parts.length - 1]] = value;
      } else {
        updated[field] = value;
      }
      
      return updated;
    });
  };

  // Handle client selection
  const handleClientSelect = (client, contact) => {
    setQuotation(prev => ({
      ...prev,
      clientId: client.id,
      clientName: client.name,
      clientCode: client.clientCode,
      clientTier: client.tier || 'end_user',
      contactId: contact?.id || null,
      contactName: contact?.name || null,
      contactEmail: contact?.email || null,
      contactPhone: contact?.phone || null
    }));
    
    // Recalculate line prices based on new tier
    if (client.tier !== quotation.clientTier) {
      recalculateLinesForTier(client.tier || 'end_user');
    }
  };

  // Recalculate all line prices for new tier
  const recalculateLinesForTier = async (newTier) => {
    const updatedLines = await Promise.all(lines.map(async (line) => {
      if (line.priceSource === 'list_price' && line.listPriceBookEntry) {
        const pricing = await QuotationPricingService.calculateQuotationLinePricing(
          {
            ...line.listPriceBookEntry,
            quantity: line.quantity
          },
          newTier,
          quotation.currency || 'MYR'
        );
        // Remove undefined values from pricing before using
        const cleanedPricing = Object.fromEntries(
          Object.entries(pricing || {}).filter(([_, v]) => v !== undefined)
        );
        return {
          ...line,
          unitPrice: cleanedPricing.unitPrice,
          tierMarkup: cleanedPricing.tierMarkup,
          totalPrice: cleanedPricing.lineTotal,
          _modified: true
        };
      }
      return line;
    }));
    
    setLines(updatedLines);
  };

  // Handle product selection from search
  const handleProductSelect = (product) => {
    const nextLineNumber = lines.length > 0 
      ? Math.max(...lines.map(l => l.lineNumber)) + 10 
      : 10;
    
    const newLine = {
      id: null, // Will be generated on save
      quotationId: id,
      lineNumber: nextLineNumber,
      productId: product.id,
      sku: product.sku,
      productName: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description || '',
      descriptionType: 'standard',
      quantity: 1,
      unit: product.unit || 'EA',
      unitPrice: 0,
      priceSource: 'manual',
      lineDiscount: { percentage: 0, amount: 0 },
      totalPrice: 0,
      specifications: product.specifications || {},
      dimensions: product.dimensions || {},
      weight: product.weight || null,
      leadTime: product.leadTime || null,
      notes: '',
      _isNew: true,
      _modified: true
    };
    
    setLines(prev => [...prev, newLine]);
    setEditingLineIndex(lines.length);
    setShowProductSearch(false);
  };

  // Update line item
  const updateLine = (index, updates) => {
    setLines(prev => {
      const updated = [...prev];
      updated[index] = { 
        ...updated[index], 
        ...updates,
        _modified: true
      };
      return updated;
    });
  };

  // Delete line item
  const deleteLine = (index) => {
    const line = lines[index];
    
    // If line exists in database, track for deletion
    if (line.id && !line._isNew) {
      setDeletedLineIds(prev => [...prev, line.id]);
    }
    
    setLines(prev => prev.filter((_, i) => i !== index));
    setEditingLineIndex(null);
  };

  // Duplicate line item
  const duplicateLine = (index) => {
    const line = lines[index];
    const nextLineNumber = Math.max(...lines.map(l => l.lineNumber)) + 10;
    
    const newLine = {
      ...line,
      id: null,
      lineNumber: nextLineNumber,
      _isNew: true,
      _modified: true
    };
    
    setLines(prev => [...prev, newLine]);
  };

  // Move line up/down
  const moveLine = (index, direction) => {
    if ((direction === 'up' && index === 0) || 
        (direction === 'down' && index === lines.length - 1)) {
      return;
    }
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newLines = [...lines];
    [newLines[index], newLines[newIndex]] = [newLines[newIndex], newLines[index]];
    
    // Update line numbers
    newLines.forEach((line, i) => {
      line.lineNumber = (i + 1) * 10;
      line._modified = true;
    });
    
    setLines(newLines);
  };

  // Handle shipping update
  const handleShippingUpdate = (shippingData) => {
    updateField('totals.shippingCost', shippingData.totalCost);
    updateField('totals.shippingMethod', shippingData.method);
    updateField('totals.shippingDetails', shippingData);
    setShowShippingCalc(false);
  };

  // Handle discount update
  const handleDiscountUpdate = (discountData) => {
    updateField('overallDiscount', discountData);
    setShowDiscountCalc(false);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!quotation.clientId) {
      errors.client = 'Client is required';
    }
    
    if (lines.length === 0) {
      errors.lines = 'At least one line item is required';
    }
    
    lines.forEach((line, index) => {
      if (!line.quantity || line.quantity <= 0) {
        errors[`line_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (line.unitPrice < 0) {
        errors[`line_${index}_price`] = 'Price cannot be negative';
      }
    });
    
    if (quotation.validUntil) {
      const validDate = new Date(quotation.validUntil);
      if (validDate < new Date()) {
        errors.validUntil = 'Valid until date cannot be in the past';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save quotation
  const handleSave = async (options = {}) => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      setSaveStatus('saving');
      setError(null);
      
      // Prepare quotation update data
      const updateData = {
        ...quotation,
        totals: {
          subtotal: totals.subtotal,
          discount: totals.discount,
          taxAmount: totals.taxAmount,
          shippingCost: totals.shippingCost,
          grandTotal: totals.grandTotal,
          ...quotation.totals
        },
        updatedAt: new Date().toISOString()
      };
      
      // Remove internal fields
      delete updateData._modified;
      
      // Update quotation
      await QuotationService.updateQuotation(id, updateData);
      
      // Delete removed lines
      for (const lineId of deletedLineIds) {
        await QuotationService.deleteQuotationLine(lineId);
      }
      
      // Update/create lines
      for (const line of lines) {
        if (line._isNew) {
          // Create new line
          const lineData = { ...line };
          delete lineData.id;
          delete lineData._isNew;
          delete lineData._modified;
          await QuotationService.addQuotationLine(id, lineData);
        } else if (line._modified) {
          // Update existing line
          const lineData = { ...line };
          delete lineData._modified;
          await QuotationService.updateQuotationLine(line.id, lineData);
        }
      }
      
      // Update state
      setOriginalQuotation(JSON.parse(JSON.stringify(updateData)));
      setDeletedLineIds([]);
      setLines(lines.map(l => ({ ...l, _isNew: false, _modified: false })));
      setIsDirty(false);
      setSaveStatus('saved');
      
      // Auto-clear save status after 2 seconds
      setTimeout(() => setSaveStatus(null), 2000);
      
      // Navigate if requested
      if (options.navigateAfter) {
        navigate(options.navigateAfter);
      }
      
    } catch (err) {
      console.error('Error saving quotation:', err);
      setError(err.message);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  // Submit for approval
  const handleSubmitForApproval = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      await handleSave();
      await QuotationService.submitForApproval(id);
      navigate(`/quotations/${id}`);
    } catch (err) {
      console.error('Error submitting for approval:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    const currency = quotation?.currency || 'MYR';
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading quotation...</span>
      </div>
    );
  }

  // Error state
  if (error && !quotation) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error loading quotation</span>
        </div>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={() => navigate('/quotations')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Back to Quotations
        </button>
      </div>
    );
  }

  if (!quotation) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (isDirty) {
                    if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
                      navigate(`/quotations/${id}`);
                    }
                  } else {
                    navigate(`/quotations/${id}`);
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div>
                <h1 className="text-xl font-semibold">Edit Quotation</h1>
                <p className="text-sm text-gray-500">{quotation.quotationNumber}</p>
              </div>
              
              {/* Status badge */}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                quotation.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                quotation.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                quotation.status === 'approved' ? 'bg-green-100 text-green-700' :
                quotation.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {quotation.status?.replace(/_/g, ' ').toUpperCase()}
              </span>
              
              {/* Dirty indicator */}
              {isDirty && (
                <span className="text-xs text-orange-600 flex items-center gap-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Unsaved changes
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {/* Save status indicator */}
              {saveStatus === 'saved' && (
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <Check className="w-4 h-4" /> Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600 text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Error
                </span>
              )}
              
              <button
                onClick={() => handleSave()}
                disabled={saving || !isDirty}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              
              {quotation.status === 'draft' && (
                <button
                  onClick={handleSubmitForApproval}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Submit for Approval
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Client & Contact Section */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client & Contact
                </h2>
              </div>
              <div className="p-4">
                <ContactSelector
                  selectedClientId={quotation.clientId}
                  selectedContactId={quotation.contactId}
                  onSelect={handleClientSelect}
                  error={validationErrors.client}
                />
                
                {quotation.clientId && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-2 font-medium">{quotation.clientName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Code:</span>
                        <span className="ml-2 font-medium">{quotation.clientCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Tier:</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          quotation.clientTier === 'dealer' ? 'bg-purple-100 text-purple-700' :
                          quotation.clientTier === 'partner' ? 'bg-blue-100 text-blue-700' :
                          quotation.clientTier === 'si' ? 'bg-green-100 text-green-700' :
                          quotation.clientTier === 'trader' ? 'bg-yellow-100 text-yellow-700' :
                          quotation.clientTier === 'contractor' ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {quotation.clientTier?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      {quotation.contactName && (
                        <div>
                          <span className="text-gray-500">Contact:</span>
                          <span className="ml-2 font-medium">{quotation.contactName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items Section */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-medium flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Line Items ({lines.length})
                </h2>
                <button
                  onClick={() => setShowProductSearch(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Product
                </button>
              </div>
              
              {validationErrors.lines && (
                <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {validationErrors.lines}
                </div>
              )}
              
              <div className="divide-y">
                {lines.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No line items yet</p>
                    <button
                      onClick={() => setShowProductSearch(true)}
                      className="mt-2 text-blue-600 hover:text-blue-700"
                    >
                      Add your first product
                    </button>
                  </div>
                ) : (
                  lines.map((line, index) => (
                    <div key={line.id || `new-${index}`} className="p-4">
                      {editingLineIndex === index ? (
                        <QuotationLineForm
                          line={line}
                          clientTier={quotation.clientTier}
                          currency={quotation.currency}
                          onChange={(updates) => updateLine(index, updates)}
                          onSave={() => setEditingLineIndex(null)}
                          onCancel={() => {
                            if (line._isNew && !line.unitPrice) {
                              deleteLine(index);
                            } else {
                              setEditingLineIndex(null);
                            }
                          }}
                          validationErrors={validationErrors}
                          lineIndex={index}
                        />
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">#{line.lineNumber}</span>
                              <span className="font-medium">{line.productName}</span>
                              {line.brand && (
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {line.brand}
                                </span>
                              )}
                              {line._modified && (
                                <span className="w-2 h-2 bg-orange-500 rounded-full" title="Modified"></span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{line.sku}</p>
                            {line.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {line.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span>Qty: {line.quantity} {line.unit}</span>
                              <span>@ {formatCurrency(line.unitPrice)}</span>
                              {line.lineDiscount?.percentage > 0 && (
                                <span className="text-green-600">
                                  -{line.lineDiscount.percentage}%
                                </span>
                              )}
                              <span className="font-medium">
                                = {formatCurrency(line.totalPrice)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => moveLine(index, 'up')}
                              disabled={index === 0}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveLine(index, 'down')}
                              disabled={index === lines.length - 1}
                              className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => setEditingLineIndex(index)}
                              className="p-1 hover:bg-gray-100 rounded text-blue-600"
                              title="Edit"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => duplicateLine(index)}
                              className="p-1 hover:bg-gray-100 rounded text-gray-600"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this line item?')) {
                                  deleteLine(index);
                                }
                              }}
                              className="p-1 hover:bg-gray-100 rounded text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notes & Terms Section */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes & Terms
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (visible to client)
                  </label>
                  <textarea
                    value={quotation.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Additional notes for the client..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes (not visible to client)
                  </label>
                  <textarea
                    value={quotation.internalNotes || ''}
                    onChange={(e) => updateField('internalNotes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-yellow-50"
                    placeholder="Internal notes for reference..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={quotation.termsAndConditions || ''}
                    onChange={(e) => updateField('termsAndConditions', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Standard terms and conditions..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Company & Currency */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company & Currency
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <select
                    value={quotation.companyId || ''}
                    onChange={(e) => updateField('companyId', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="FS">Flow Solution (FS)</option>
                    <option value="FSE">Flow Solution Engineering (FSE)</option>
                    <option value="FSP">Flow Solution Projects (FSP)</option>
                    <option value="BWS">BWS</option>
                    <option value="BWE">BWE</option>
                    <option value="EMIT">EMIT</option>
                    <option value="EMIA">EMIA</option>
                    <option value="FTS">FTS</option>
                    <option value="IHS">IHS</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={quotation.currency || 'MYR'}
                    onChange={(e) => updateField('currency', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MYR">MYR - Malaysian Ringgit</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="RMB">RMB - Chinese Yuan</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Validity & Terms */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Validity & Terms
                </h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valid Until
                  </label>
                  <input
                    type="date"
                    value={quotation.validUntil?.split('T')[0] || ''}
                    onChange={(e) => updateField('validUntil', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.validUntil ? 'border-red-500' : ''
                    }`}
                  />
                  {validationErrors.validUntil && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.validUntil}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={quotation.paymentTerms || 'net30'}
                    onChange={(e) => updateField('paymentTerms', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cod">Cash on Delivery</option>
                    <option value="cbd">Cash Before Delivery</option>
                    <option value="net7">Net 7 Days</option>
                    <option value="net14">Net 14 Days</option>
                    <option value="net30">Net 30 Days</option>
                    <option value="net45">Net 45 Days</option>
                    <option value="net60">Net 60 Days</option>
                    <option value="net90">Net 90 Days</option>
                    <option value="50_50">50% Deposit, 50% Before Delivery</option>
                    <option value="30_70">30% Deposit, 70% Net 30</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Terms
                  </label>
                  <select
                    value={quotation.deliveryTerms || 'exw'}
                    onChange={(e) => updateField('deliveryTerms', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="exw">EXW - Ex Works</option>
                    <option value="fob">FOB - Free on Board</option>
                    <option value="cif">CIF - Cost, Insurance, Freight</option>
                    <option value="dap">DAP - Delivered at Place</option>
                    <option value="ddp">DDP - Delivered Duty Paid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Totals Summary */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Totals
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Discount</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">-{formatCurrency(totals.discount)}</span>
                    <button
                      onClick={() => setShowDiscountCalc(true)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Edit discount"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({quotation.taxRate || 0}%)</span>
                  <input
                    type="number"
                    value={quotation.taxRate || 0}
                    onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
                    className="w-16 text-right px-2 py-1 border rounded text-sm"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax Amount</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Shipping</span>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(totals.shippingCost)}</span>
                    <button
                      onClick={() => setShowShippingCalc(true)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Calculate shipping"
                    >
                      <Calculator className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="border-t pt-3 flex justify-between font-medium text-lg">
                  <span>Grand Total</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Reference */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-medium">Reference</h2>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Reference / RFQ No.
                  </label>
                  <input
                    type="text"
                    value={quotation.clientReference || ''}
                    onChange={(e) => updateField('clientReference', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Client's RFQ number..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={quotation.projectName || ''}
                    onChange={(e) => updateField('projectName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Project name..."
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Search Modal */}
      {showProductSearch && (
        <ProductSearchModal
          isOpen={showProductSearch}
          onClose={() => setShowProductSearch(false)}
          onSelect={handleProductSelect}
          companyId={quotation.companyId}
        />
      )}

      {/* Shipping Calculator Modal */}
      {showShippingCalc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Calculate Shipping</h3>
              <button onClick={() => setShowShippingCalc(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <ShippingCalculator
                lines={lines}
                currency={quotation.currency}
                onCalculate={handleShippingUpdate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Discount Calculator Modal */}
      {showDiscountCalc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium">Overall Discount</h3>
              <button onClick={() => setShowDiscountCalc(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <DiscountCalculator
                subtotal={totals.subtotal}
                currentDiscount={quotation.overallDiscount}
                onApply={handleDiscountUpdate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationEdit;
