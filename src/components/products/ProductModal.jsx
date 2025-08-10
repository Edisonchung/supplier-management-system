// src/components/products/ProductModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Package, DollarSign, Layers, Tag, Hash, Image, FileText, Info, Clock, 
  AlertCircle, Save, Sparkles, Check, RefreshCw, Loader2, Wand2, Brain,
  ExternalLink, TrendingUp, CheckCircle, AlertTriangle
} from 'lucide-react';
import { DocumentManager } from '../documents/DocumentManager';
import { ProductEnrichmentService } from '../../services/ProductEnrichmentService';
// ✅ FIXED: Import the correct factory function instead of non-existent hook
import { createAILearningHook } from '../../services/AILearningService';

// ================================================================
// ENHANCED PRODUCT MODAL COMPONENT
// ================================================================
const ProductModal = ({ 
  product, 
  suppliers, 
  onSave, 
  onClose, 
  initialTab = 'basic', 
  showNotification,
  partNumber = '',
  basicDescription = '',
  aiService // Optional AI service for advanced enrichment
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    supplierId: '',
    category: 'electronics',
    price: '',
    status: 'pending',
    description: '',
    // ✅ ENHANCED: Separate identifier fields
    sku: '',
    partNumber: partNumber || '',
    manufacturerCode: '',
    clientItemCode: '',
    alternativePartNumbers: [],
    // ✅ NEW: AI enhancement fields
    detectedSpecs: {},
    aiEnriched: false,
    confidence: 0,
    lastEnhanced: null,
    enhancementHistory: [],
    source: 'manual',
    // Existing fields
    stock: 0,
    minStock: 5,
    photo: '',
    catalog: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ NEW: AI enhancement state
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState(null);
  const [isWebSearching, setIsWebSearching] = useState(false);

  // ✅ FIXED: Use the factory function to create AI learning capabilities
  const aiLearning = createAILearningHook();

  // Enhanced tab configuration
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'ai', label: 'AI Enhancement', icon: Brain, badge: aiSuggestions ? '!' : null },
    { id: 'identifiers', label: 'Identifiers', icon: Tag },
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
        // ✅ ENHANCED: Load new fields
        sku: product.sku || '',
        partNumber: product.partNumber || '',
        manufacturerCode: product.manufacturerCode || '',
        clientItemCode: product.clientItemCode || '',
        alternativePartNumbers: product.alternativePartNumbers || [],
        detectedSpecs: product.detectedSpecs || {},
        aiEnriched: product.aiEnriched || false,
        confidence: product.confidence || 0,
        lastEnhanced: product.lastEnhanced || null,
        enhancementHistory: product.enhancementHistory || [],
        source: product.source || 'manual',
        // Existing fields
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
        description: basicDescription || '',
        // ✅ ENHANCED: Initialize new fields
        sku: '',
        partNumber: partNumber || '',
        manufacturerCode: '',
        clientItemCode: '',
        alternativePartNumbers: [],
        detectedSpecs: {},
        aiEnriched: false,
        confidence: 0,
        lastEnhanced: null,
        enhancementHistory: [],
        source: 'manual',
        // Existing fields
        stock: 0,
        minStock: 5,
        photo: '',
        catalog: '',
        notes: ''
      });
    }
    setErrors({});
    setActiveTab(initialTab);
    setAiSuggestions(null);
    setAppliedSuggestions(new Set());
    setWebSearchResults(null);
  }, [product, initialTab, partNumber, basicDescription]);

  // ✅ NEW: Auto-trigger AI enrichment for new products with part numbers
  useEffect(() => {
    if (!product && formData.partNumber && formData.partNumber.length > 3 && !aiSuggestions) {
      enrichProductData();
    }
  }, [formData.partNumber, product, aiSuggestions]);

  // ✅ NEW: Enhanced AI enrichment function with web search
  const enrichProductData = async () => {
    if (!formData.partNumber) {
      showNotification?.('Please enter a part number first', 'warning');
      return;
    }
    
    setIsEnriching(true);
    try {
      let suggestions;
      
      // Try AI service first if available
      if (aiService) {
        try {
          const enrichmentPrompt = `
          Analyze this industrial part number and description to provide detailed product information:
          
          Part Number: ${formData.partNumber}
          Description: ${formData.description}
          
          Please extract and provide:
          1. Full descriptive product name
          2. Manufacturer/brand name
          3. Product category
          4. Detailed technical description
          5. Technical specifications (dimensions, voltage, material, etc.)
          
          Return JSON format:
          {
            "productName": "Complete descriptive name",
            "brand": "Manufacturer name",
            "category": "Product category",
            "description": "Detailed technical description", 
            "specifications": {
              "dimensions": "Physical dimensions if available",
              "voltage": "Operating voltage if applicable",
              "material": "Construction material"
            },
            "confidence": 0.85
          }`;

          const result = await aiService.extractFromDocument(enrichmentPrompt, 'product_enrichment', {
            partNumber: formData.partNumber,
            description: formData.description
          });

          if (result.success && result.data) {
            suggestions = {
              ...result.data,
              confidence: result.confidence || 0.7
            };
          }
        } catch (aiError) {
          console.warn('AI enrichment failed, using pattern-based fallback:', aiError);
        }
      }
      
      // Enhanced fallback using ProductEnrichmentService
      if (!suggestions) {
        suggestions = await ProductEnrichmentService.enrichProductFromPartNumber(
          formData.partNumber,
          formData.description || formData.name,
          aiService
        );
      }
      
      setAiSuggestions(suggestions);
      setShowAIPanel(true);
      
      // Auto-apply high-confidence suggestions for new products
      if (!product && suggestions.confidence > 0.8) {
        const autoApplyFields = ['brand', 'category'];
        autoApplyFields.forEach(field => {
          if (suggestions[field] && !formData[field]) {
            applySuggestion(field, suggestions[field]);
          }
        });
      }
      
      // Switch to AI tab to show suggestions
      setActiveTab('ai');
      
      // ✅ FIXED: Record successful enhancement using aiLearning instance
      aiLearning.recordSuccess(suggestions, true);
      
      showNotification?.(`AI analysis complete with ${Math.round(suggestions.confidence * 100)}% confidence`, 'success');
      
    } catch (error) {
      console.error('Failed to enrich product:', error);
      showNotification?.('Failed to enhance product data', 'error');
    } finally {
      setIsEnriching(false);
    }
  };

  // ✅ NEW: Web search enhancement (optional)
  const performWebSearch = async () => {
  if (!formData.partNumber) {
    showNotification?.('Please enter a part number first', 'warning');
    return;
  }

  setIsWebSearching(true);
  try {
    console.log('🔍 Starting web search for:', formData.partNumber);
    
    // ✅ FIXED: Ensure correct URL and method
    const response = await fetch('https://supplier-mcp-server-production.up.railway.app/api/web-search', {
      method: 'POST',  // ✅ CRITICAL: Must be POST, not GET
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        partNumber: formData.partNumber,
        brand: formData.brand,
        description: formData.description,
        type: 'product_search'
      })
    });

    console.log('Web search response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Web search failed:', response.status, errorText);
      throw new Error(`Web search failed: ${response.status} ${response.statusText}`);
    }

    const searchResults = await response.json();
    console.log('Web search results:', searchResults);
    
    setWebSearchResults(searchResults);
    
    if (searchResults.found) {
      // Merge web search results with AI suggestions
      const enhancedSuggestions = {
        ...aiSuggestions,
        ...searchResults,
        webEnhanced: true,
        confidence: Math.max(aiSuggestions?.confidence || 0, searchResults.confidence || 0.6)
      };
      setAiSuggestions(enhancedSuggestions);
      showNotification?.('Web search completed - additional data found!', 'success');
    } else {
      showNotification?.(`Web search completed: ${searchResults.reason || 'No additional data found'}`, 'info');
    }
    
  } catch (error) {
    console.error('Web search error:', error);
    showNotification?.(`Web search failed: ${error.message}`, 'error');
  } finally {
    setIsWebSearching(false);
  }
};
  // ✅ NEW: Apply AI suggestion with learning
  const applySuggestion = (field, value) => {
    const fieldMapping = {
      productName: 'name',
      category: 'category',
      brand: 'brand',
      description: 'description'
    };
    
    const formField = fieldMapping[field] || field;
    setFormData(prev => ({
      ...prev,
      [formField]: value
    }));
    
    setAppliedSuggestions(prev => new Set([...prev, field]));
    
    // Clear any validation errors for the updated field
    if (errors[formField]) {
      setErrors(prev => ({ ...prev, [formField]: '' }));
    }
  };

  // ✅ FIXED: Handle user correction for learning
  const handleUserCorrection = (field, originalValue, newValue) => {
    if (aiSuggestions && originalValue !== newValue) {
      // ✅ FIXED: Use aiLearning instance
      aiLearning.recordCorrection(
        { [field]: originalValue, confidence: aiSuggestions.confidence },
        { [field]: newValue },
        {
          partNumber: formData.partNumber,
          description: formData.description,
          source: 'manual_correction'
        }
      );
      showNotification?.('Thanks! This correction will improve future AI suggestions.', 'info');
    }
  };

  // ✅ ENHANCED: Improved validation
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
    
    // ✅ NEW: Part number validation using service
    if (!formData.partNumber.trim()) {
      newErrors.partNumber = 'Part number is required';
    } else {
      const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
      if (!validation.isValid) {
        newErrors.partNumber = validation.error;
      }
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

  // ✅ ENHANCED: Improved submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setActiveTab('basic'); // Switch to basic tab if validation fails
      return;
    }

    setIsSubmitting(true);
    
    try {
      // ✅ NEW: Normalize part number using service
      let normalizedPartNumber = formData.partNumber;
      if (formData.partNumber) {
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
        if (validation.isValid) {
          normalizedPartNumber = validation.normalized;
        }
      }

      // ✅ NEW: Generate SKU if not provided using service
      let sku = formData.sku;
      if (!sku && formData.partNumber) {
        sku = ProductEnrichmentService.generateInternalSKU({
          category: formData.category,
          brand: formData.brand,
          partNumber: normalizedPartNumber
        });
      }

      // ✅ NEW: Build enhancement history
      const enhancementHistory = [...(formData.enhancementHistory || [])];
      if (aiSuggestions) {
        enhancementHistory.push({
          timestamp: new Date().toISOString(),
          confidence: aiSuggestions.confidence,
          appliedFields: Array.from(appliedSuggestions),
          webEnhanced: !!aiSuggestions.webEnhanced
        });
      }

      const productData = {
        ...formData,
        partNumber: normalizedPartNumber,
        sku: sku,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        // ✅ NEW: Add AI enhancement metadata
        aiEnriched: aiSuggestions ? true : formData.aiEnriched,
        confidence: aiSuggestions ? aiSuggestions.confidence : formData.confidence,
        lastEnhanced: aiSuggestions ? new Date().toISOString() : formData.lastEnhanced,
        enhancementHistory: enhancementHistory,
        detectedSpecs: aiSuggestions?.specifications || formData.detectedSpecs,
        webEnhanced: !!aiSuggestions?.webEnhanced,
        updatedAt: new Date().toISOString(),
        dateAdded: product?.dateAdded || new Date().toISOString()
      };

      if (product?.id) {
        productData.id = product.id;
      }

      // ✅ NEW: Clean undefined values
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined || productData[key] === null) {
          delete productData[key];
        }
      });

      await onSave(productData);
      
      if (showNotification) {
        const enhancementText = productData.aiEnriched ? ' with AI enhancement' : '';
        showNotification(
          `Product ${product?.id ? 'updated' : 'created'} successfully${enhancementText}`, 
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
    // Handle user corrections for learning
    if (aiSuggestions && ['brand', 'category', 'name', 'description'].includes(field)) {
      const originalValue = aiSuggestions[field === 'name' ? 'productName' : field];
      if (originalValue && originalValue !== value) {
        handleUserCorrection(field, originalValue, value);
      }
    }

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

  // ✅ ENHANCED: Updated categories
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
    'fluid_handling',
    'pumps',
    'valves'
  ];

  // ✅ NEW: AI Suggestion Component with enhanced features
  const SuggestionField = ({ label, field, suggestion, current }) => {
    const isApplied = appliedSuggestions.has(field);
    const isDifferent = suggestion && suggestion !== current;
    
    if (!suggestion || !isDifferent) return null;
    
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex-1">
          <div className="font-medium text-blue-900 text-sm">{label}</div>
          <div className="text-blue-700 text-sm">{suggestion}</div>
          {current && (
            <div className="text-xs text-gray-500 mt-1">Current: {current}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => applySuggestion(field, suggestion)}
          disabled={isApplied}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isApplied 
              ? 'bg-green-100 text-green-800 cursor-not-allowed flex items-center gap-1' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isApplied ? (
            <>
              <Check size={12} />
              Applied
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {product ? 'Edit Product' : 'Add New Product'}
              </h2>
              {formData.aiEnriched && (
                <div className="flex items-center gap-2 mt-1">
                  <Sparkles size={16} className="text-purple-600" />
                  <span className="text-sm text-purple-700">
                    AI Enhanced ({Math.round(formData.confidence * 100)}% confidence)
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* ✅ NEW: Enhanced AI Enhancement Button in Header */}
              {formData.partNumber && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={enrichProductData}
                    disabled={isEnriching}
                    className="px-3 py-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-sm flex items-center gap-2"
                  >
                    {isEnriching ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Enhancing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        AI Enhance
                      </>
                    )}
                  </button>
                  
                  {/* Web Search Button */}
                  <button
                    type="button"
                    onClick={performWebSearch}
                    disabled={isWebSearching || !formData.partNumber}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center gap-2"
                    title="Search web for additional product information"
                  >
                    {isWebSearching ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ExternalLink size={14} />
                    )}
                  </button>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
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
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors relative ${
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
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
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
                    {formData.aiEnriched && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
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
                    {formData.aiEnriched && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Siemens, ABB, SKF"
                  />
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
                    {formData.aiEnriched && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
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
                    {formData.aiEnriched && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
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

          {/* ✅ NEW: Enhanced Identifiers Tab */}
          {activeTab === 'identifiers' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ✅ ENHANCED: Part Number Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer Part Number <span className="text-red-500">*</span>
                    <span className="text-purple-600 ml-1" title="Used for AI enhancement">🔍</span>
                  </label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => handleChange('partNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono ${
                      errors.partNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 6ES7407-0KA02-0AA0"
                  />
                  {errors.partNumber && <p className="text-red-500 text-xs mt-1">{errors.partNumber}</p>}
                </div>

                {/* ✅ ENHANCED: Internal SKU Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal SKU
                    <span className="text-xs text-gray-500 ml-1">(Auto-generated)</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="AUTO-001234"
                    />
                  </div>
                </div>

                {/* ✅ NEW: Client Item Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Item Code
                    <span className="text-blue-600 ml-1" title="Client's unique identifier">🏷️</span>
                  </label>
                  <input
                    type="text"
                    value={formData.clientItemCode}
                    onChange={(e) => handleChange('clientItemCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g., 400RTG0091"
                  />
                </div>

                {/* ✅ NEW: Alternative Part Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternative Part Number
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturerCode}
                    onChange={(e) => handleChange('manufacturerCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Alternative manufacturer code"
                  />
                </div>
              </div>

              {/* Part Number Validation Status */}
              {formData.partNumber && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Part Number Validation</h4>
                  {(() => {
                    const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
                    return validation.isValid ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle size={16} />
                        <span className="text-sm">Valid format - normalized to: <code className="bg-green-100 px-2 py-1 rounded">{validation.normalized}</code></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle size={16} />
                        <span className="text-sm">{validation.error}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ✅ NEW: Enhanced AI Enhancement Tab */}
          {activeTab === 'ai' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <Brain className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI Product Enhancement
                </h3>
                <p className="text-gray-600 mb-6">
                  Enhance your product data using AI analysis of the part number and description.
                </p>
                
                {!aiSuggestions && !isEnriching && (
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={enrichProductData}
                      disabled={!formData.partNumber}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Sparkles size={20} />
                      Enhance with AI
                    </button>
                    
                    <button
                      type="button"
                      onClick={performWebSearch}
                      disabled={!formData.partNumber}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ExternalLink size={20} />
                      Web Search
                    </button>
                  </div>
                )}
                
                {(isEnriching || isWebSearching) && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-blue-600" />
                    <span className="text-gray-600">
                      {isEnriching ? 'Analyzing product data...' : 'Searching web...'}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Suggestions Panel */}
              {aiSuggestions && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-purple-600" size={20} />
                      <h4 className="font-medium text-blue-900">AI Enhancement Results</h4>
                      {aiSuggestions.webEnhanced && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Web Enhanced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        aiSuggestions.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                        aiSuggestions.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Confidence: {Math.round(aiSuggestions.confidence * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={enrichProductData}
                        disabled={isEnriching}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Refresh AI suggestions"
                      >
                        <RefreshCw size={16} className={isEnriching ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <SuggestionField 
                      label="Product Name" 
                      field="productName"
                      suggestion={aiSuggestions.productName}
                      current={formData.name}
                    />
                    <SuggestionField 
                      label="Brand" 
                      field="brand"
                      suggestion={aiSuggestions.brand}
                      current={formData.brand}
                    />
                    <SuggestionField 
                      label="Category" 
                      field="category"
                      suggestion={aiSuggestions.category}
                      current={formData.category}
                    />
                    <SuggestionField 
                      label="Description" 
                      field="description"
                      suggestion={aiSuggestions.description}
                      current={formData.description}
                    />
                  </div>
                  
                  {/* Apply All Button */}
                  <div className="text-center mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (aiSuggestions.productName) applySuggestion('productName', aiSuggestions.productName);
                        if (aiSuggestions.brand) applySuggestion('brand', aiSuggestions.brand);
                        if (aiSuggestions.category) applySuggestion('category', aiSuggestions.category);
                        if (aiSuggestions.description) applySuggestion('description', aiSuggestions.description);
                      }}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center gap-2 mx-auto"
                    >
                      <Wand2 size={16} />
                      Apply All Suggestions
                    </button>
                  </div>

                  {/* Detected Specifications */}
                  {aiSuggestions.specifications && Object.keys(aiSuggestions.specifications).length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-3">Detected Specifications</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(aiSuggestions.specifications).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Web Search Results */}
                  {webSearchResults && webSearchResults.found && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h5 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        <ExternalLink size={16} />
                        Additional Web Information
                      </h5>
                      {webSearchResults.datasheetUrl && (
                        <a 
                          href={webSearchResults.datasheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 hover:text-green-900 text-sm flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          View Datasheet
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!formData.partNumber && (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-gray-600">
                    Please enter a part number in the Identifiers tab to enable AI enhancement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('identifiers')}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Identifiers
                  </button>
                </div>
              )}
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
                  type="button"
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
                    {/* ✅ NEW: Enhanced AI Enhancement History */}
                    {product.aiEnriched && (
                      <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                        <p className="text-sm text-purple-700">
                          <strong>AI Enhanced:</strong> {product.lastEnhanced ? new Date(product.lastEnhanced).toLocaleDateString() : 'Yes'}
                        </p>
                        {product.confidence && (
                          <p className="text-sm text-purple-700">
                            <strong>Confidence Score:</strong> {Math.round(product.confidence * 100)}%
                          </p>
                        )}
                        {product.webEnhanced && (
                          <p className="text-sm text-purple-700">
                            <strong>Web Enhanced:</strong> Yes
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Enhancement History */}
                  {formData.enhancementHistory && formData.enhancementHistory.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Enhancement History</h4>
                      {formData.enhancementHistory.map((enhancement, index) => (
                        <div key={index} className="p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-800">
                              Enhancement #{index + 1}
                            </span>
                            <span className="text-xs text-blue-600">
                              {new Date(enhancement.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-blue-700 mt-1">
                            Confidence: {Math.round(enhancement.confidence * 100)}%
                            {enhancement.webEnhanced && ' • Web Enhanced'}
                          </div>
                          {enhancement.appliedFields && enhancement.appliedFields.length > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              Applied to: {enhancement.appliedFields.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
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
          <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* ✅ NEW: Enhancement Status Indicator */}
              {formData.aiEnriched && (
                <div className="flex items-center gap-2 text-purple-700">
                  <Sparkles size={16} />
                  <span className="text-sm font-medium">
                    AI Enhanced ({Math.round(formData.confidence * 100)}%)
                  </span>
                </div>
              )}
              {appliedSuggestions.size > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <TrendingUp size={16} />
                  <span className="text-sm">
                    {appliedSuggestions.size} suggestion(s) applied
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductModal;
