// src/components/products/ProductModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Package, DollarSign, Layers, Tag, Hash, Image, FileText, Info, Clock, 
  AlertCircle, Save, Sparkles, Check, RefreshCw, Loader2, Wand2, Brain
} from 'lucide-react';
import { DocumentManager } from '../documents/DocumentManager';

// ================================================================
// ENHANCED PRODUCT ENRICHMENT SERVICE
// ================================================================
class ProductEnrichmentService {
  // Brand detection patterns for major manufacturers
  static BRAND_PATTERNS = {
    'Siemens': [
      /^6[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}-\d[A-Z]{2}\d{1}$/,
      /^3[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}$/,
      /^1[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}$/
    ],
    'ABB': [
      /^[A-Z]{2,3}\d{3,6}(-\d{1,3})?$/,
      /^ACS\d{3}-\d{3}[A-Z]?$/
    ],
    'Schneider Electric': [
      /^[A-Z]{2,4}\d{4,6}[A-Z]?$/,
      /^LC1[A-Z]\d{2,4}$/,
      /^TM\d{3}[A-Z]+$/
    ],
    'Festo': [
      /^[A-Z]{2,4}-\d{2,4}(-[A-Z\d]+)?$/,
      /^DNC-\d{2,3}-\d{2,4}$/
    ],
    'SMC': [
      /^[A-Z]{2,4}\d{2,4}[A-Z]?(-\d+)?$/,
      /^CQ2[A-Z]\d{2}$/
    ],
    'Parker': [
      /^[A-Z]{1,3}\d{3,6}[A-Z]?$/,
      /^D1[A-Z]{2}\d{3}$/
    ],
    'Bosch Rexroth': [
      /^R\d{6}(-\d+)?$/,
      /^4WE\d{1,2}[A-Z]\d{2}$/
    ],
    'Omron': [
      /^[A-Z]{2,4}\d{3,6}(-[A-Z\d]+)?$/,
      /^E2E-[A-Z]\d{2}$/
    ],
    'SKF': [
      /^(NJ|NU|NUP|NF|NJG)\d{4}[A-Z]*$/,
      /^\d{5}$/,
      /^[A-Z]{2}\d{4}(-[A-Z\d]+)?$/
    ],
    'Timken': [
      /^[A-Z]{1,3}\d{4,6}[A-Z]?$/,
      /^HM\d{6}(\/\d+)?$/
    ]
  };

  static detectBrandFromPartNumber(partNumber) {
    if (!partNumber) return null;
    
    const cleanPartNumber = partNumber.trim().toUpperCase();
    
    for (const [brand, patterns] of Object.entries(this.BRAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(cleanPartNumber)) {
          return brand;
        }
      }
    }
    
    // Additional heuristic checks
    if (cleanPartNumber.includes('SIEMENS') || cleanPartNumber.startsWith('6ES')) {
      return 'Siemens';
    }
    if (cleanPartNumber.includes('SKF') || /^(NJ|NU|32)\d{3,4}/.test(cleanPartNumber)) {
      return 'SKF';
    }
    
    return null;
  }

  static categorizeProduct(partNumber, description) {
    const text = `${partNumber} ${description}`.toLowerCase();
    
    const categoryMap = {
      'bearings': ['bearing', 'ball bearing', 'roller bearing', 'thrust bearing'],
      'pumps': ['pump', 'hydraulic pump', 'gear pump', 'piston pump'],
      'hydraulics': ['hydraulic', 'cylinder', 'actuator', 'manifold'],
      'pneumatics': ['pneumatic', 'air cylinder', 'air valve', 'festo', 'smc'],
      'electronics': ['plc', 'hmi', 'inverter', 'relay', 'contactor'],
      'automation': ['automation', 'robot', 'servo', 'controller'],
      'sensors': ['sensor', 'proximity sensor', 'pressure sensor', 'temperature sensor'],
      'mechanical': ['gear', 'coupling', 'shaft', 'bushing'],
      'drives': ['drive', 'motor drive', 'frequency drive', 'vfd'],
      'cables': ['cable', 'wire', 'connector', 'harness']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'components';
  }

  static extractSpecifications(description) {
    if (!description) return {};
    
    const specs = {};
    
    // Dimension patterns
    const dimensionPatterns = [
      /(\d+\.?\d*\s*x\s*\d+\.?\d*\s*x\s*\d+\.?\d*)\s*(mm|cm|inch|in)/gi,
      /(d\s*x\s*d\s*x\s*w:\s*\d+mm\s*x\s*\d+mm\s*x\s*\d+mm)/gi,
      /(\d+mm\s*x\s*\d+mm\s*x\s*\d+mm)/gi
    ];
    
    dimensionPatterns.forEach(pattern => {
      const match = description.match(pattern);
      if (match) {
        specs.dimensions = match[0];
      }
    });

    // Voltage patterns
    const voltageMatch = description.match(/(\d+\.?\d*\s*v(?:olts?)?)/gi);
    if (voltageMatch) {
      specs.voltage = voltageMatch[0];
    }

    // Weight patterns
    const weightMatch = description.match(/(\d+\.?\d*\s*(?:kg|g|lb|lbs))/gi);
    if (weightMatch) {
      specs.weight = weightMatch[0];
    }

    return specs;
  }

  static validateAndNormalizePartNumber(partNumber) {
    if (!partNumber || typeof partNumber !== 'string') {
      return { isValid: false, error: 'Part number required' };
    }

    // Clean and normalize
    let normalized = partNumber.trim().toUpperCase();
    
    // Remove common prefixes/suffixes
    normalized = normalized.replace(/^(PART|P\/N|PN|SKU)[\s\-\:]/i, '');
    normalized = normalized.replace(/[\s\-\:](PART|P\/N|PN|SKU)$/i, '');
    
    // Validation patterns
    const validPatterns = [
      /^[A-Z0-9\-\.\/]+$/i,           // Alphanumeric with separators
      /^\d{4,}[A-Z]*$/,               // Numeric with optional letters
      /^[A-Z]{2,}\d{3,}[A-Z\d\-]*$/,  // Letters + numbers
      /^[A-Z\d]{3,}$/                 // Mixed alphanumeric minimum 3 chars
    ];
    
    const isValid = normalized.length >= 3 && validPatterns.some(pattern => pattern.test(normalized));
    
    return {
      isValid,
      normalized,
      original: partNumber,
      error: isValid ? null : 'Invalid part number format (minimum 3 characters, alphanumeric)'
    };
  }

  static generateInternalSKU({ category, brand, partNumber }) {
    const timestamp = Date.now().toString().slice(-6);
    const categoryCode = (category || 'GEN').toUpperCase().slice(0, 3);
    const brandCode = (brand || 'UNK').toUpperCase().slice(0, 3);
    
    return `${categoryCode}-${brandCode}-${timestamp}`;
  }

  // Pattern-based enrichment (fallback when AI is not available)
  static patternBasedEnrichment(partNumber, description) {
    const brand = this.detectBrandFromPartNumber(partNumber);
    const category = this.categorizeProduct(partNumber, description);
    const specs = this.extractSpecifications(description);
    
    // Generate product name
    let productName = description || partNumber;
    if (brand && !productName.toLowerCase().includes(brand.toLowerCase())) {
      productName = `${brand} ${productName}`;
    }

    return {
      productName: productName,
      brand: brand,
      category: category,
      description: description || `${brand || 'Industrial'} component - ${partNumber}`,
      specifications: specs,
      confidence: brand ? 0.7 : 0.5
    };
  }
}

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

  // Enhanced tab configuration
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { id: 'ai', label: 'AI Enhancement', icon: Brain, badge: aiSuggestions ? '!' : null },
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
  }, [product, initialTab, partNumber, basicDescription]);

  // ✅ NEW: Auto-trigger AI enrichment for new products with part numbers
  useEffect(() => {
    if (!product && formData.partNumber && formData.partNumber.length > 3 && !aiSuggestions) {
      enrichProductData();
    }
  }, [formData.partNumber, product, aiSuggestions]);

  // ✅ NEW: AI enrichment function
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
      
      // Fallback to pattern-based enrichment
      if (!suggestions) {
        suggestions = ProductEnrichmentService.patternBasedEnrichment(
          formData.partNumber,
          formData.description
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
      
      showNotification?.(`AI analysis complete with ${Math.round(suggestions.confidence * 100)}% confidence`, 'success');
      
    } catch (error) {
      console.error('Failed to enrich product:', error);
      showNotification?.('Failed to enhance product data', 'error');
    } finally {
      setIsEnriching(false);
    }
  };

  // ✅ NEW: Apply AI suggestion
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
    
    // ✅ NEW: Part number validation
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
      // ✅ NEW: Normalize part number
      let normalizedPartNumber = formData.partNumber;
      if (formData.partNumber) {
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
        if (validation.isValid) {
          normalizedPartNumber = validation.normalized;
        }
      }

      // ✅ NEW: Generate SKU if not provided
      let sku = formData.sku;
      if (!sku && formData.partNumber) {
        sku = ProductEnrichmentService.generateInternalSKU({
          category: formData.category,
          brand: formData.brand,
          partNumber: normalizedPartNumber
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
        updatedAt: new Date().toISOString()
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

  // ✅ NEW: AI Suggestion Component
  const SuggestionField = ({ label, field, suggestion, current }) => {
    const isApplied = appliedSuggestions.has(field);
    const isDifferent = suggestion && suggestion !== current;
    
    if (!suggestion || !isDifferent) return null;
    
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex-1">
          <div className="font-medium text-blue-900 text-sm">{label}</div>
          <div className="text-blue-700 text-sm">{suggestion}</div>
        </div>
        <button
          type="button"
          onClick={() => applySuggestion(field, suggestion)}
          disabled={isApplied}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isApplied 
              ? 'bg-green-100 text-green-800 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isApplied ? <Check size={14} /> : 'Apply'}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {product ? 'Edit Product' : 'Add New Product'}
            </h2>
            <div className="flex items-center gap-3">
              {/* ✅ NEW: AI Enhancement Button in Header */}
              {formData.partNumber && (
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
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

          {/* ✅ NEW: AI Enhancement Tab */}
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
                  <button
                    type="button"
                    onClick={enrichProductData}
                    disabled={!formData.partNumber}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    <Sparkles size={20} />
                    Enhance with AI
                  </button>
                )}
                
                {isEnriching && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-blue-600" />
                    <span className="text-gray-600">Analyzing product data...</span>
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
                  <div className="text-center">
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
                    <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-3">Detected Specifications</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(aiSuggestions.specifications).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{key}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!formData.partNumber && (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-gray-600">
                    Please enter a part number in the Basic Info tab to enable AI enhancement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('basic')}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Basic Info
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
                    {/* ✅ NEW: AI Enhancement History */}
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
                      </div>
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
