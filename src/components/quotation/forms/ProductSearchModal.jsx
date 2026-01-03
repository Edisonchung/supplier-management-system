// ProductSearchModal.jsx
// Modal for searching and selecting products from catalog to add to quotation lines
// Supports filtering by brand, category, search text, and displays pricing info

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  Filter,
  Package,
  Tag,
  DollarSign,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Check,
  Box,
  Layers,
  Star,
  Clock,
  TrendingUp
} from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, startAfter } from 'firebase/firestore';
import { db } from '../../../firebase';
import { PricingService } from '../../../services/QuotationPricingService';

const ProductSearchModal = ({
  isOpen,
  onClose,
  onSelectProduct,
  companyCode,
  clientId,
  clientTier,
  currency = 'MYR',
  multiSelect = false, // Allow selecting multiple products at once
  excludeProductIds = [] // Products already in quotation
}) => {
  // Search state
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [stockFilter, setStockFilter] = useState('all'); // all, in-stock, available
  
  // Results state
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  
  // Facets state (for filter options)
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  
  // Selection state (for multi-select mode)
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  // Pricing cache
  const [pricingCache, setPricingCache] = useState({});
  
  const ITEMS_PER_PAGE = 20;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Load facets (brands and categories) on mount
  useEffect(() => {
    if (isOpen) {
      loadFacets();
    }
  }, [isOpen]);

  // Search products when filters change
  useEffect(() => {
    if (isOpen) {
      searchProducts(true);
    }
  }, [isOpen, debouncedSearch, selectedBrands, selectedCategories, stockFilter]);

  const loadFacets = async () => {
    try {
      // Load unique brands
      const brandsSnap = await getDocs(
        query(collection(db, 'productBrands'), orderBy('name'), limit(50))
      );
      setBrands(brandsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      // Load categories
      const categoriesSnap = await getDocs(
        query(collection(db, 'productCategories'), orderBy('name'), limit(50))
      );
      setCategories(categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error('Error loading facets:', err);
    }
  };

  const searchProducts = async (resetResults = false) => {
    if (resetResults) {
      setProducts([]);
      setLastDoc(null);
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let q = collection(db, 'products');
      const constraints = [];
      
      // Text search - search in partNumber, description, brand
      // Note: Firestore doesn't support full-text search, so we use prefix matching
      // For production, consider Algolia or Elasticsearch
      if (debouncedSearch) {
        constraints.push(where('searchTerms', 'array-contains', debouncedSearch.toLowerCase()));
      }
      
      // Brand filter
      if (selectedBrands.length > 0) {
        constraints.push(where('brand', 'in', selectedBrands.slice(0, 10))); // Firestore limit
      }
      
      // Category filter
      if (selectedCategories.length > 0) {
        constraints.push(where('categoryId', 'in', selectedCategories.slice(0, 10)));
      }
      
      // Stock filter
      if (stockFilter === 'in-stock') {
        constraints.push(where('stockStatus', '==', 'in_stock'));
      } else if (stockFilter === 'available') {
        constraints.push(where('stockStatus', 'in', ['in_stock', 'low_stock']));
      }
      
      // Order and pagination
      constraints.push(orderBy('partNumber'));
      constraints.push(limit(ITEMS_PER_PAGE));
      
      if (!resetResults && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      
      q = query(q, ...constraints);
      const snapshot = await getDocs(q);
      
      const newProducts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(p => !excludeProductIds.includes(p.id));
      
      setProducts(prev => resetResults ? newProducts : [...prev, ...newProducts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE);
      
      // Fetch pricing for new products
      fetchPricingForProducts(newProducts);
      
    } catch (err) {
      console.error('Error searching products:', err);
      setError('Failed to search products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPricingForProducts = async (productList) => {
    if (!clientTier) return;
    
    for (const product of productList) {
      if (pricingCache[product.id]) continue;
      
      try {
        // Get list price
        const listPrice = await QuotationPricingService.getListPriceBookCost(
          product.brand,
          product.partNumber
        );
        
        // Get tier markup
        const tierMarkup = await QuotationPricingService.getTierMarkup(
          clientTier,
          product.brand,
          product.categoryId
        );
        
        // Calculate suggested price
        let suggestedPrice = null;
        if (listPrice) {
          const discountedCost = listPrice.listPrice * (1 - (listPrice.discountPercent || 0) / 100);
          suggestedPrice = discountedCost * (1 + tierMarkup / 100);
        }
        
        setPricingCache(prev => ({
          ...prev,
          [product.id]: {
            listPrice: listPrice?.listPrice,
            discountPercent: listPrice?.discountPercent,
            tierMarkup,
            suggestedPrice,
            currency: listPrice?.currency || 'MYR'
          }
        }));
      } catch (err) {
        console.error('Error fetching pricing for product:', product.id, err);
      }
    }
  };

  const handleSelectProduct = (product) => {
    if (multiSelect) {
      setSelectedProducts(prev => {
        const isSelected = prev.some(p => p.id === product.id);
        if (isSelected) {
          return prev.filter(p => p.id !== product.id);
        }
        return [...prev, product];
      });
    } else {
      // Single select - immediately add and close
      const pricing = pricingCache[product.id];
      onSelectProduct({
        ...product,
        suggestedPrice: pricing?.suggestedPrice,
        listPrice: pricing?.listPrice,
        tierMarkup: pricing?.tierMarkup
      });
      handleClose();
    }
  };

  const handleAddSelected = () => {
    selectedProducts.forEach(product => {
      const pricing = pricingCache[product.id];
      onSelectProduct({
        ...product,
        suggestedPrice: pricing?.suggestedPrice,
        listPrice: pricing?.listPrice,
        tierMarkup: pricing?.tierMarkup
      });
    });
    handleClose();
  };

  const handleClose = () => {
    setSearchText('');
    setSelectedBrands([]);
    setSelectedCategories([]);
    setPriceRange({ min: '', max: '' });
    setStockFilter('all');
    setProducts([]);
    setSelectedProducts([]);
    setPricingCache({});
    onClose();
  };

  const toggleBrand = (brandName) => {
    setSelectedBrands(prev => 
      prev.includes(brandName)
        ? prev.filter(b => b !== brandName)
        : [...prev, brandName]
    );
  };

  const toggleCategory = (categoryId) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedBrands([]);
    setSelectedCategories([]);
    setPriceRange({ min: '', max: '' });
    setStockFilter('all');
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedBrands.length > 0) count++;
    if (selectedCategories.length > 0) count++;
    if (priceRange.min || priceRange.max) count++;
    if (stockFilter !== 'all') count++;
    return count;
  }, [selectedBrands, selectedCategories, priceRange, stockFilter]);

  const formatCurrency = (amount, curr = currency) => {
    if (!amount) return '-';
    const symbols = { MYR: 'RM', USD: '$', EUR: '€', RMB: '¥', JPY: '¥' };
    return `${symbols[curr] || curr} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStockStatusBadge = (status) => {
    const statusConfig = {
      in_stock: { label: 'In Stock', color: 'bg-green-100 text-green-800' },
      low_stock: { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' },
      out_of_stock: { label: 'Out of Stock', color: 'bg-red-100 text-red-800' },
      order_required: { label: 'Order Required', color: 'bg-blue-100 text-blue-800' }
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Search Products
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Search catalog to add products to your quotation
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by part number, description, or brand..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
                {showFilters ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
            
            {/* Expandable Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Brand Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Brand
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {brands.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2 text-center">No brands available</p>
                      ) : (
                        brands.map(brand => (
                          <label
                            key={brand.id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedBrands.includes(brand.name)}
                              onChange={() => toggleBrand(brand.name)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">{brand.name}</span>
                            {brand.productCount && (
                              <span className="text-xs text-gray-400 ml-auto">
                                ({brand.productCount})
                              </span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {categories.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2 text-center">No categories available</p>
                      ) : (
                        categories.map(category => (
                          <label
                            key={category.id}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-700">{category.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Stock & Price Filters */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock Status
                      </label>
                      <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Products</option>
                        <option value="in-stock">In Stock Only</option>
                        <option value="available">Available (In Stock + Low Stock)</option>
                      </select>
                    </div>
                    
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Results */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px]">
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            
            {loading && products.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                <p className="text-gray-500">
                  {debouncedSearch
                    ? `No products match "${debouncedSearch}"`
                    : 'Start typing to search products'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map(product => {
                  const pricing = pricingCache[product.id];
                  const isSelected = selectedProducts.some(p => p.id === product.id);
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Product Image or Icon */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.partNumber}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Box className="w-8 h-8 text-gray-400" />
                          )}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">
                                  {product.partNumber}
                                </h4>
                                {product.brand && (
                                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                    {product.brand}
                                  </span>
                                )}
                                {getStockStatusBadge(product.stockStatus)}
                              </div>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {product.description || 'No description available'}
                              </p>
                              {product.categoryName && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                                  <Layers className="w-3 h-3" />
                                  {product.categoryName}
                                </div>
                              )}
                            </div>
                            
                            {/* Pricing */}
                            <div className="text-right flex-shrink-0">
                              {pricing ? (
                                <>
                                  {pricing.suggestedPrice && (
                                    <div className="text-lg font-semibold text-gray-900">
                                      {formatCurrency(pricing.suggestedPrice, pricing.currency)}
                                    </div>
                                  )}
                                  {pricing.listPrice && (
                                    <div className="text-xs text-gray-500">
                                      List: {formatCurrency(pricing.listPrice, pricing.currency)}
                                      {pricing.discountPercent > 0 && (
                                        <span className="ml-1 text-green-600">
                                          (-{pricing.discountPercent}%)
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {pricing.tierMarkup && (
                                    <div className="text-xs text-blue-600">
                                      +{pricing.tierMarkup}% tier markup
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="text-sm text-gray-400">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Additional Info Row */}
                          {(product.leadTime || product.uom) && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              {product.uom && (
                                <span className="flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  UOM: {product.uom}
                                </span>
                              )}
                              {product.leadTime && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Lead Time: {product.leadTime}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Selection Indicator */}
                        {multiSelect && (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Load More */}
                {hasMore && (
                  <div className="pt-4 text-center">
                    <button
                      onClick={() => searchProducts(false)}
                      disabled={loading}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                {products.length > 0 && (
                  <span>
                    Showing {products.length} product{products.length !== 1 ? 's' : ''}
                    {multiSelect && selectedProducts.length > 0 && (
                      <span className="ml-2 text-blue-600 font-medium">
                        • {selectedProducts.length} selected
                      </span>
                    )}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                {multiSelect && (
                  <button
                    onClick={handleAddSelected}
                    disabled={selectedProducts.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add {selectedProducts.length > 0 ? `(${selectedProducts.length})` : ''} Products
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductSearchModal;
