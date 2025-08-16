// Public Catalog Component for Phase 2A
// File: src/components/ecommerce/PublicCatalog.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  ShoppingCart, 
  Eye, 
  Heart, 
  Star, 
  MapPin, 
  Clock, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Building2,
  Shield,
  Truck,
  AlertCircle,
  CheckCircle,
  User,
  LogIn
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EnhancedEcommerceAPIService } from '../../services/ecommerce/EnhancedEcommerceAPIService.js';
import { db } from '../../config/firebase.js';

// Initialize API service
const ecommerceAPI = new EnhancedEcommerceAPIService(db);

// Generate session ID for guest users
const generateSessionId = () => {
  return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

const HiggsFlowPublicCatalog = () => {
  const navigate = useNavigate();
  
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search and filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  
  // Guest cart state
  const [guestCart, setGuestCart] = useState([]);
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('higgsflow_session_id');
    if (stored) return stored;
    const newId = generateSessionId();
    localStorage.setItem('higgsflow_session_id', newId);
    return newId;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load products when filters change
  useEffect(() => {
    loadProducts();
  }, [searchTerm, selectedCategory, sortBy, priceRange, inStockOnly, currentPage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load categories and featured products in parallel
      const [categoriesData, featuredData] = await Promise.all([
        ecommerceAPI.getProductCategories(),
        ecommerceAPI.getFeaturedProducts(8)
      ]);

      // Add "All Categories" option
      const allCategories = [
        { 
          id: 'all', 
          name: 'All Categories', 
          productCount: categoriesData.reduce((sum, cat) => sum + (cat.productCount || 0), 0)
        },
        ...categoriesData
      ];

      setCategories(allCategories);
      setFeaturedProducts(featuredData);
      
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load catalog data');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {
        searchTerm: searchTerm.trim(),
        category: selectedCategory,
        sortBy,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        inStock: inStockOnly,
        pageSize: itemsPerPage
      };

      let result;
      if (searchTerm.trim()) {
        result = await ecommerceAPI.searchProducts(searchTerm, filters);
      } else {
        result = await ecommerceAPI.getPublicProducts(filters);
      }

      setProducts(result.products);
      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);

      // Track search analytics
      if (searchTerm.trim()) {
        ecommerceAPI.trackSearch(searchTerm, result.totalCount, {
          userType: 'guest',
          sessionId,
          deviceInfo: {
            userAgent: navigator.userAgent,
            viewport: `${window.innerWidth}x${window.innerHeight}`
          }
        });
      }

    } catch (err) {
      console.error('Error loading products:', err);
      setError('Failed to load products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const addToGuestCart = async (product) => {
    try {
      // Add to local state immediately for instant feedback
      setGuestCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => 
            item.id === product.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, { ...product, quantity: 1 }];
      });

      // Add to backend
      await ecommerceAPI.addToGuestCart(sessionId, product.id, 1);

      // Show success feedback
      showNotification(`${product.displayName} added to cart`, 'success');

    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('Failed to add item to cart', 'error');
    }
  };

  const viewProductDetails = (product) => {
    // Track product view
    ecommerceAPI.trackProductView(product.id, {
      userType: 'guest',
      sessionId,
      isNewViewer: true
    });

    navigate(`/product/${product.id}`);
  };

  const showNotification = (message, type = 'info') => {
    // Simple notification system - can be enhanced later
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 
      type === 'error' ? 'bg-red-500 text-white' : 
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  // Memoized filter options for performance
  const filterOptions = useMemo(() => {
    return {
      sortOptions: [
        { value: 'relevance', label: 'Most Relevant' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'name', label: 'Name A-Z' },
        { value: 'rating', label: 'Highest Rated' },
        { value: 'newest', label: 'Newest First' }
      ]
    };
  }, []);

  const ProductCard = ({ product }) => {
    const [isWishlisted, setIsWishlisted] = useState(false);

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border border-gray-200 group">
        {/* Product Image */}
        <div className="relative">
          <img 
            src={product.images?.primary || '/api/placeholder/300/300'}
            alt={product.displayName}
            className="w-full h-48 object-cover bg-gray-100 group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded font-medium">
                Featured
              </span>
            )}
            {product.pricing?.discountPercentage > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                -{product.pricing.discountPercentage}%
              </span>
            )}
            {product.trending && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </span>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className={`p-2 rounded-full shadow-md transition-colors ${
                isWishlisted ? 'bg-red-500 text-white' : 'bg-white text-gray-600 hover:bg-red-50'
              }`}
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              onClick={() => viewProductDetails(product)}
              className="p-2 bg-white text-gray-600 rounded-full shadow-md hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          
          {/* Stock Status */}
          <div className="absolute bottom-2 left-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
              product.inventory?.stockStatus === 'In Stock' 
                ? 'bg-green-100 text-green-800' 
                : product.inventory?.stockStatus === 'Limited Stock'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                product.inventory?.stockStatus === 'In Stock' 
                  ? 'bg-green-500' 
                  : product.inventory?.stockStatus === 'Limited Stock'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></div>
              {product.inventory?.stockStatus}
            </div>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Title and Category */}
          <div className="mb-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                onClick={() => viewProductDetails(product)}>
              {product.displayName}
            </h3>
            <p className="text-xs text-gray-600 mt-1">{product.category}</p>
          </div>

          {/* Supplier Info */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span>{product.supplier?.rating || 4.5}</span>
            </div>
            <span>•</span>
            <span className="truncate">{product.supplier?.name}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{product.supplier?.location}</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-blue-600">
                RM {(product.pricing?.discountPrice || 0).toLocaleString()}
              </span>
              {product.pricing?.discountPercentage > 0 && (
                <span className="text-sm text-gray-500 line-through">
                  RM {(product.pricing?.listPrice || 0).toLocaleString()}
                </span>
              )}
            </div>
            
            {product.pricing?.bulkPricing?.length > 0 && (
              <p className="text-xs text-purple-600">
                Best price: RM {product.pricing.bulkPricing[0].price.toLocaleString()} 
                ({product.pricing.bulkPricing[0].minQty}+ units)
              </p>
            )}
          </div>

          {/* Delivery Info */}
          <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
            <Truck className="w-3 h-3" />
            <span>Delivery: {product.inventory?.leadTime || '3-5 days'}</span>
            <span>•</span>
            <Clock className="w-3 h-3" />
            <span>MOQ: {product.inventory?.minimumOrderQty || 1}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => addToGuestCart(product)}
              disabled={product.inventory?.stockStatus === 'Out of Stock'}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </button>
            <button
              onClick={() => navigate('/factory/register')}
              className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
            >
              Quote
            </button>
          </div>
        </div>
      </div>
    );
  };

  const ProductListItem = ({ product }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <img 
          src={product.images?.primary || '/api/placeholder/80/80'}
          alt={product.displayName}
          className="w-20 h-20 object-cover rounded bg-gray-100 flex-shrink-0 cursor-pointer"
          onClick={() => viewProductDetails(product)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900 text-base cursor-pointer hover:text-blue-600"
                onClick={() => viewProductDetails(product)}>
              {product.displayName}
            </h3>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                RM {(product.pricing?.discountPrice || 0).toLocaleString()}
              </div>
              {product.pricing?.discountPercentage > 0 && (
                <div className="text-sm text-gray-500 line-through">
                  RM {(product.pricing?.listPrice || 0).toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.shortDescription}</p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span>{product.category}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span>{product.supplier?.rating || 4.5}</span>
            </div>
            <span>•</span>
            <span>{product.supplier?.name}</span>
            <span>•</span>
            <div className={`flex items-center gap-1 ${
              product.inventory?.stockStatus === 'In Stock' ? 'text-green-600' : 
              product.inventory?.stockStatus === 'Limited Stock' ? 'text-orange-600' : 'text-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                product.inventory?.stockStatus === 'In Stock' ? 'bg-green-500' : 
                product.inventory?.stockStatus === 'Limited Stock' ? 'bg-orange-500' : 'bg-red-500'
              }`}></div>
              <span>{product.inventory?.stockStatus}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {product.featured && (
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">
                  Featured
                </span>
              )}
              {product.trending && (
                <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">
                  Trending
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => addToGuestCart(product)}
                disabled={product.inventory?.stockStatus === 'Out of Stock'}
                className="bg-blue-600 text-white py-2 px-4 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-1"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart
              </button>
              <button 
                onClick={() => viewProductDetails(product)}
                className="p-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const FeaturedSection = () => (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
        <button 
          onClick={() => {
            setSelectedCategory('All Categories');
            setSearchTerm('');
            setSortBy('relevance');
            loadProducts();
          }}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          View All →
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {featuredProducts.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );

  const CategoryNavigation = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Browse Categories</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.slice(1).map((category) => ( // Skip "All Categories"
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.name);
              setCurrentPage(1);
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedCategory === category.name
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-8 h-8 rounded flex items-center justify-center ${
                selectedCategory === category.name ? 'bg-blue-600' : 'bg-gray-400'
              }`}>
                <span className="text-white text-sm font-bold">
                  {category.name.charAt(0)}
                </span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 text-sm">{category.name}</h4>
                <p className="text-xs text-gray-600">{category.productCount || 0} products</p>
              </div>
            </div>
            {category.description && (
              <p className="text-xs text-gray-600 line-clamp-2">{category.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 cursor-pointer" 
                  onClick={() => navigate('/')}>
                HiggsFlow
              </h1>
              <span className="text-sm text-gray-500">Industrial E-commerce</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/factory/login')}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <LogIn className="w-4 h-4" />
                Factory Login
              </button>
              <div className="relative">
                <button 
                  onClick={() => navigate('/cart')}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 relative"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {guestCart.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {guestCart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Hero Section - only show if no search/filters active */}
        {!searchTerm && selectedCategory === 'All Categories' && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white mb-8">
            <h2 className="text-3xl font-bold mb-4">Malaysia's Leading Industrial E-commerce Platform</h2>
            <p className="text-lg opacity-90 mb-6">
              Discover thousands of industrial products with AI-powered recommendations and wholesale pricing
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>Verified Suppliers</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Best Prices</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                <span>Fast Delivery</span>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search industrial products, suppliers, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Filter Toggle for Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-5 h-5" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter Section */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name} ({category.productCount || 0})
                  </option>
                ))}
              </select>

              {/* Sort Filter */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {filterOptions.sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Stock Filter */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">In Stock Only</span>
              </label>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <Grid3X3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Show featured section only on homepage */}
        {!searchTerm && selectedCategory === 'All Categories' && featuredProducts.length > 0 && (
          <FeaturedSection />
        )}

        {/* Show categories only on homepage */}
        {!searchTerm && selectedCategory === 'All Categories' && (
          <CategoryNavigation />
        )}

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {loading ? 'Loading...' : (
              <>
                Showing {products.length} of {totalCount} products
                {selectedCategory !== 'All Categories' && ` in ${selectedCategory}`}
                {searchTerm && ` for "${searchTerm}"`}
              </>
            )}
          </p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4" />
            <span>Live pricing updates</span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Products Grid/List */}
        {products.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <ProductListItem key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Loading...' : 'Load More Products'}
                </button>
              </div>
            )}
          </>
        ) : !loading && (
          /* No Results */
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or browse our categories
            </p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('All Categories');
                setPriceRange([0, 10000]);
                setInStockOnly(false);
                setSortBy('relevance');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Call to Action for Guest Users */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Procuring?</h2>
          <p className="text-lg mb-6 opacity-90">
            Register your factory account to access wholesale pricing, credit terms, and priority support
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => navigate('/factory/register')}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Register Factory Account
            </button>
            <button 
              onClick={() => navigate('/quote/request')}
              className="border border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
            >
              Request Quote for {guestCart.length} Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiggsFlowPublicCatalog;
