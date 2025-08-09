// src/hooks/useEnhancedProducts.js
import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { ProductEnrichmentService } from '../services/ProductEnrichmentService';

export const useEnhancedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load products from Firestore
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(collection(db, 'products'), orderBy('dateAdded', 'desc'));
      const querySnapshot = await getDocs(q);
      const productsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(productsData);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add product with AI enhancement
  const addProduct = async (productData, skipAIEnrichment = false) => {
    try {
      setLoading(true);
      
      let enrichedData = { ...productData };
      
      // AI Enhancement if part number is provided and not skipped
      if (!skipAIEnrichment && productData.partNumber) {
        try {
          const aiEnrichment = await ProductEnrichmentService.enrichProductFromPartNumber(
            productData.partNumber,
            productData.description || productData.name
          );
          
          // Merge AI suggestions with provided data (user data takes precedence)
          enrichedData = {
            ...enrichedData,
            name: productData.name || aiEnrichment.productName,
            brand: productData.brand || aiEnrichment.brand,
            category: productData.category || aiEnrichment.category,
            description: productData.description || aiEnrichment.description,
            detectedSpecs: aiEnrichment.specifications || {},
            aiEnriched: true,
            confidence: aiEnrichment.confidence || 0.5,
            lastEnhanced: new Date().toISOString()
          };
        } catch (aiError) {
          console.warn('AI enrichment failed, proceeding without:', aiError);
        }
      }

      // Generate SKU if not provided
      if (!enrichedData.sku) {
        enrichedData.sku = ProductEnrichmentService.generateInternalSKU({
          category: enrichedData.category,
          brand: enrichedData.brand,
          partNumber: enrichedData.partNumber
        });
      }

      // Set defaults
      enrichedData = {
        ...enrichedData,
        dateAdded: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: enrichedData.status || PRODUCT_STATUS.PENDING,
        stock: enrichedData.stock || 0,
        minStock: enrichedData.minStock || 1,
        price: enrichedData.price || 0,
        source: enrichedData.source || 'manual'
      };

      // Clean undefined values
      Object.keys(enrichedData).forEach(key => {
        if (enrichedData[key] === undefined || enrichedData[key] === null) {
          delete enrichedData[key];
        }
      });

      const docRef = await addDoc(collection(db, 'products'), enrichedData);
      const newProduct = { id: docRef.id, ...enrichedData };
      
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
      
    } catch (err) {
      setError('Failed to add product');
      console.error('Error adding product:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const updateProduct = async (id, updates) => {
    try {
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'products', id), updatedData);
      
      setProducts(prev => prev.map(product => 
        product.id === id ? { ...product, ...updatedData } : product
      ));
      
      return true;
    } catch (err) {
      setError('Failed to update product');
      console.error('Error updating product:', err);
      throw err;
    }
  };

  // Delete product
  const deleteProduct = async (id) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setProducts(prev => prev.filter(product => product.id !== id));
      return true;
    } catch (err) {
      setError('Failed to delete product');
      console.error('Error deleting product:', err);
      throw err;
    }
  };

  // Enhanced search with multiple fields
  const searchProducts = (searchTerm, filters = {}) => {
    if (!searchTerm && Object.keys(filters).length === 0) {
      return products;
    }

    return products.filter(product => {
      // Text search across multiple fields
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const searchFields = [
          product.name,
          product.sku,
          product.partNumber,
          product.manufacturerCode,
          product.clientItemCode,
          product.brand,
          product.description,
          ...(product.alternativePartNumbers || [])
        ];
        
        const matchesSearch = searchFields.some(field => 
          field && field.toLowerCase().includes(term)
        );
        
        if (!matchesSearch) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'all' && product.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status !== 'all' && product.status !== filters.status) {
        return false;
      }

      // Supplier filter
      if (filters.supplierId && product.supplierId !== filters.supplierId) {
        return false;
      }

      // Stock filter
      if (filters.stockStatus) {
        if (filters.stockStatus === 'low' && product.stock > product.minStock) {
          return false;
        }
        if (filters.stockStatus === 'out' && product.stock > 0) {
          return false;
        }
        if (filters.stockStatus === 'available' && product.stock <= 0) {
          return false;
        }
      }

      // AI enrichment filter
      if (filters.aiEnriched === 'enriched' && !product.aiEnriched) {
        return false;
      }
      if (filters.aiEnriched === 'manual' && product.aiEnriched) {
        return false;
      }

      // Price range filter
      if (filters.priceMin && product.price < filters.priceMin) {
        return false;
      }
      if (filters.priceMax && product.price > filters.priceMax) {
        return false;
      }

      return true;
    });
  };

  // Find existing product by multiple criteria
  const findExistingProduct = async (criteria) => {
    const { partNumber, clientItemCode, sku, name } = criteria;
    
    // Search in current products first
    let existing = products.find(product => {
      if (partNumber && product.partNumber === partNumber) return true;
      if (clientItemCode && product.clientItemCode === clientItemCode) return true;
      if (sku && product.sku === sku) return true;
      if (name && product.name.toLowerCase() === name.toLowerCase()) return true;
      return false;
    });

    if (existing) return existing;

    // If not found in memory, query Firestore
    try {
      const queries = [];
      
      if (partNumber) {
        queries.push(query(collection(db, 'products'), where('partNumber', '==', partNumber)));
      }
      if (clientItemCode) {
        queries.push(query(collection(db, 'products'), where('clientItemCode', '==', clientItemCode)));
      }
      if (sku) {
        queries.push(query(collection(db, 'products'), where('sku', '==', sku)));
      }

      for (const q of queries) {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          return { id: doc.id, ...doc.data() };
        }
      }
    } catch (err) {
      console.error('Error searching for existing product:', err);
    }

    return null;
  };

  // Get low stock products
  const getLowStockProducts = () => {
    return products.filter(product => product.stock <= product.minStock);
  };

  // Get products by supplier
  const getProductsBySupplier = (supplierId) => {
    return products.filter(product => product.supplierId === supplierId);
  };

  // Bulk product creation from PI items
  const createProductsFromPIItems = async (piItems, supplierId, aiService) => {
    const results = {
      created: [],
      skipped: [],
      updated: [],
      errors: []
    };

    for (const item of piItems) {
      try {
        // Validate part number
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(item.productCode);
        
        if (!validation.isValid) {
          results.skipped.push({
            item,
            reason: validation.error
          });
          continue;
        }

        // Check for existing product
        const existing = await findExistingProduct({
          partNumber: validation.normalized,
          clientItemCode: item.clientItemCode
        });

        if (existing) {
          // Update existing product with new information
          const updates = {};
          if (!existing.clientItemCode && item.clientItemCode) {
            updates.clientItemCode = item.clientItemCode;
          }
          if (!existing.description && item.productName) {
            updates.description = item.productName;
          }
          if (item.unitPrice && item.unitPrice > 0) {
            updates.price = item.unitPrice;
          }

          if (Object.keys(updates).length > 0) {
            await updateProduct(existing.id, updates);
            results.updated.push({
              product: { ...existing, ...updates },
              changes: Object.keys(updates)
            });
          }
          continue;
        }

        // Create new product with AI enhancement
        const newProduct = await addProduct({
          partNumber: validation.normalized,
          name: item.productName || validation.normalized,
          description: item.productName,
          clientItemCode: item.clientItemCode || '',
          supplierId: supplierId,
          price: item.unitPrice || 0,
          category: ProductEnrichmentService.categorizeProduct(validation.normalized, item.productName),
          source: 'pi_extraction'
        });

        results.created.push(newProduct);

      } catch (error) {
        results.errors.push({
          item,
          error: error.message
        });
      }
    }

    return results;
  };

  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    findExistingProduct,
    getLowStockProducts,
    getProductsBySupplier,
    createProductsFromPIItems,
    reloadProducts: loadProducts
  };
};

// ----------------------------------------------------------------
// 4. ENHANCED PRODUCT MODAL WITH AI SUGGESTIONS
// ----------------------------------------------------------------

// src/components/products/EnhancedProductModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { ProductEnrichmentService } from '../../services/ProductEnrichmentService';
import { PRODUCT_CATEGORIES, AI_CONFIDENCE_LEVELS } from '../../utils/productConstants';

const EnhancedProductModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  product = null, 
  suppliers = [],
  partNumber = '',
  basicDescription = '',
  aiService 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    partNumber: partNumber || '',
    manufacturerCode: '',
    clientItemCode: '',
    alternativePartNumbers: [],
    brand: '',
    description: basicDescription || '',
    category: PRODUCT_CATEGORIES.COMPONENTS,
    supplierId: '',
    price: 0,
    stock: 0,
    minStock: 1,
    status: 'pending',
    notes: ''
  });

  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [validationErrors, setValidationErrors] = useState({});

  // Initialize form data
  useEffect(() => {
    if (product) {
      setFormData(product);
    } else if (partNumber) {
      setFormData(prev => ({
        ...prev,
        partNumber: partNumber,
        description: basicDescription
      }));
    }
  }, [product, partNumber, basicDescription]);

  // Auto-trigger AI enrichment for new products with part numbers
  useEffect(() => {
    if (!product && formData.partNumber && formData.partNumber.length > 3 && !aiSuggestions) {
      enrichProductData();
    }
  }, [formData.partNumber, product, aiSuggestions]);

  const enrichProductData = async () => {
    if (!formData.partNumber) return;
    
    setIsEnriching(true);
    try {
      const suggestions = await ProductEnrichmentService.enrichProductFromPartNumber(
        formData.partNumber,
        formData.description,
        aiService
      );
      
      setAiSuggestions(suggestions);
      
      // Auto-apply high-confidence suggestions for new products
      if (!product && suggestions.confidence > AI_CONFIDENCE_LEVELS.HIGH) {
        const autoApplyFields = ['name', 'brand', 'category'];
        autoApplyFields.forEach(field => {
          if (suggestions[field] && !formData[field]) {
            applySuggestion(field, suggestions[field]);
          }
        });
      }
    } catch (error) {
      console.error('Failed to enrich product:', error);
    } finally {
      setIsEnriching(false);
    }
  };

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
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    
    if (!formData.partNumber.trim()) {
      errors.partNumber = 'Part number is required';
    } else {
      const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
      if (!validation.isValid) {
        errors.partNumber = validation.error;
      }
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    if (!formData.supplierId) {
      errors.supplierId = 'Supplier is required';
    }
    
    if (formData.price < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    if (formData.stock < 0) {
      errors.stock = 'Stock cannot be negative';
    }
    
    if (formData.minStock < 0) {
      errors.minStock = 'Minimum stock cannot be negative';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    try {
      // Normalize part number
      const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
      if (validation.isValid) {
        formData.partNumber = validation.normalized;
      }
      
      // Generate SKU if not provided
      if (!formData.sku) {
        formData.sku = ProductEnrichmentService.generateInternalSKU({
          category: formData.category,
          brand: formData.brand,
          partNumber: formData.partNumber
        });
      }
      
      // Add AI enhancement metadata
      if (aiSuggestions) {
        formData.aiEnriched = true;
        formData.confidence = aiSuggestions.confidence;
        formData.lastEnhanced = new Date().toISOString();
      }
      
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save product:', error);
    }
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* AI Suggestions Panel */}
          {aiSuggestions && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-purple-600" size={20} />
                  <h4 className="font-medium text-blue-900">AI Suggestions</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    aiSuggestions.confidence > AI_CONFIDENCE_LEVELS.HIGH ? 'bg-green-100 text-green-800' :
                    aiSuggestions.confidence > AI_CONFIDENCE_LEVELS.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    Confidence: {Math.round(aiSuggestions.confidence * 100)}%
                  </span>
                  <button
                    onClick={enrichProductData}
                    disabled={isEnriching}
                    className="text-blue-600 hover:text-blue-800 p-1"
                    title="Refresh AI suggestions"
                  >
                    <RefreshCw size={16} className={isEnriching ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              
              {/* Apply All Suggestions Button */}
              <div className="mt-4">
                <button
                  onClick={() => {
                    if (aiSuggestions.productName) applySuggestion('productName', aiSuggestions.productName);
                    if (aiSuggestions.brand) applySuggestion('brand', aiSuggestions.brand);
                    if (aiSuggestions.category) applySuggestion('category', aiSuggestions.category);
                    if (aiSuggestions.description) applySuggestion('description', aiSuggestions.description);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Apply All High-Confidence Suggestions
                </button>
              </div>
            </div>
          )}

          {/* Enhanced Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Identification */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Product Identification</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter product name"
                />
                {validationErrors.name && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal SKU
                  <span className="text-xs text-gray-500 ml-1">(Auto-generated)</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({...prev, sku: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="AUTO-001234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manufacturer Part Number *
                  <span className="text-purple-600 ml-1">🔍</span>
                </label>
                <input
                  type="text"
                  value={formData.partNumber}
                  onChange={(e) => setFormData(prev => ({...prev, partNumber: e.target.value}))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 font-mono ${
                    validationErrors.partNumber ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., 6ES7407-0KA02-0AA0"
                />
                {validationErrors.partNumber && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.partNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Item Code
                  <span className="text-blue-600 ml-1">🏷️</span>
                </label>
                <input
                  type="text"
                  value={formData.clientItemCode}
                  onChange={(e) => setFormData(prev => ({...prev, clientItemCode: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g., 400RTG0091"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternative Part Number
                </label>
                <input
                  type="text"
                  value={formData.manufacturerCode}
                  onChange={(e) => setFormData(prev => ({...prev, manufacturerCode: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="Alternative manufacturer code"
                />
              </div>
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 border-b pb-2">Product Details</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({...prev, brand: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Siemens, ABB, SKF"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({...prev, category: e.target.value}))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.category ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  {Object.entries(PRODUCT_CATEGORIES).map(([key, value]) => (
                    <option key={value} value={value}>
                      {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
                {validationErrors.category && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier *
                </label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData(prev => ({...prev, supplierId: e.target.value}))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    validationErrors.supplierId ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
                {validationErrors.supplierId && (
                  <p className="text-red-500 text-xs mt-1">{validationErrors.supplierId}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({...prev, price: parseFloat(e.target.value) || 0}))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.price ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {validationErrors.price && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.price}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="complete">Complete</option>
                    <option value="furnished">Furnished</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({...prev, stock: parseInt(e.target.value) || 0}))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.stock ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {validationErrors.stock && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.stock}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData(prev => ({...prev, minStock: parseInt(e.target.value) || 1}))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      validationErrors.minStock ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="1"
                  />
                  {validationErrors.minStock && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.minStock}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter detailed product description..."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes..."
            />
          </div>

          {/* AI Enhancement Button */}
          {!aiSuggestions && formData.partNumber && (
            <div className="text-center">
              <button
                onClick={enrichProductData}
                disabled={isEnriching}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {isEnriching ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enhancing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Enhance with AI
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {product ? 'Update Product' : 'Create Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedProductModal;
