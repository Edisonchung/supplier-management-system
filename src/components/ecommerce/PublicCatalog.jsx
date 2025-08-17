// Updated Public Catalog Component for Phase 2A - ENHANCED VERSION
// File: src/components/ecommerce/PublicCatalog.jsx

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  LogIn,
  Package,
  Loader2,
  RefreshCw,
  X,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Firebase integration - Enhanced for Phase 2A
import { db } from '../../config/firebase.js';
import EnhancedEcommerceFirebaseService from '../../services/ecommerce/EnhancedEcommerceFirebaseService.js';

// Initialize enhanced service
const ecommerceService = EnhancedEcommerceFirebaseService;

// Generate session ID for guest users with better entropy
const generateSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  const userAgent = navigator.userAgent.slice(-10);
  return `guest_${timestamp}_${random}_${btoa(userAgent).slice(0, 6)}`;
};

const HiggsFlowPublicCatalog = () => {
  const navigate = useNavigate();
  
  // Component mounted tracking for cleanup
  const mountedRef = useRef(true);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // State management
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMockData, setIsMockData] = useState(false);
  
  // Search and filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [inStockOnly, setInStockOnly] = useState(false);
  
  // Enhanced guest cart state with better session management
  const [guestCartItems, setGuestCartItems] = useState([]);
  const [sessionId] = useState(() => {
    try {
      // Try sessionStorage first (better for guest sessions)
      let stored = sessionStorage.getItem('higgsflow_session_id');
      if (!stored) {
        // Fallback to localStorage if sessionStorage fails
        try {
          stored = localStorage.getItem('higgsflow_session_id');
        } catch (localError) {
          console.warn('LocalStorage not available:', localError);
        }
      }
      
      if (stored) return stored;
      
      const newId = generateSessionId();
      
      // Try to store in both locations
      try {
        sessionStorage.setItem('higgsflow_session_id', newId);
      } catch (sessionError) {
        console.warn('SessionStorage not available:', sessionError);
      }
      
      try {
        localStorage.setItem('higgsflow_session_id', newId);
      } catch (localError) {
        console.warn('LocalStorage not available:', localError);
      }
      
      return newId;
    } catch (error) {
      console.warn('Storage not available, using memory session:', error);
      return generateSessionId();
    }
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  // Notification state
  const [notification, setNotification] = useState(null);

  // Component cleanup effect - CRITICAL FIX
  useEffect(() => {
    mountedRef.current = true;
    
    // Enhanced cleanup function
    return () => {
      mountedRef.current = false;
      
      // Clear search timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      
      // Abort ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      
      // Clear any pending state updates
      setLoading(false);
      setError(null);
      setNotification(null);
    };
  }, []);

  // Safe state update function
  const safeSetState = useCallback((setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  }, []);

  // Load initial data with enhanced error handling
  const loadInitialData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      safeSetState(setLoading, true);
      safeSetState(setError, null);
      
      // Create new abort controller for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      
      // Initialize e-commerce data first
      await ecommerceService.initializeEcommerceData();
      
      // Load categories and featured products in parallel with timeout
      const loadPromises = [
        Promise.race([
          ecommerceService.getProductCategories(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Categories timeout')), 10000)
          )
        ]).catch(err => {
          console.warn('Categories failed, using fallback:', err);
          return [
            { id: 'electronics', name: 'Electronics', productCount: 45 },
            { id: 'mechanical', name: 'Mechanical', productCount: 67 },
            { id: 'safety', name: 'Safety', productCount: 21 },
            { id: 'tools', name: 'Tools', productCount: 33 },
            { id: 'hydraulics', name: 'Hydraulics', productCount: 23 },
            { id: 'pneumatics', name: 'Pneumatics', productCount: 19 }
          ];
        }),
        
        Promise.race([
          ecommerceService.getPublicCatalog({ pageSize: 8, featured: true }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Featured timeout')), 10000)
          )
        ]).catch(err => {
          console.warn('Featured products failed, using fallback:', err);
          return { products: [], isMockData: true };
        })
      ];

      const [categoriesData, featuredResult] = await Promise.all(loadPromises);

      if (!mountedRef.current) return;

      // Process categories with totals
      const totalProductCount = categoriesData.reduce((sum, cat) => sum + (cat.productCount || 0), 0);
      const allCategories = [
        { 
          id: 'all', 
          name: 'All Categories', 
          productCount: totalProductCount || 208,
          description: 'Browse all available products'
        },
        ...categoriesData
      ];

      safeSetState(setCategories, allCategories);
      safeSetState(setFeaturedProducts, featuredResult.products || []);
      safeSetState(setIsMockData, featuredResult.isMockData || false);
      
    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error loading initial data:', err);
      safeSetState(setError, 'Failed to load catalog data. Switching to demo mode.');
      safeSetState(setIsMockData, true);
      
      // Set comprehensive fallback data
      safeSetState(setCategories, [
        { id: 'all', name: 'All Categories', productCount: 208 },
        { id: 'electronics', name: 'Electronics', productCount: 45 },
        { id: 'mechanical', name: 'Mechanical Components', productCount: 67 },
        { id: 'safety', name: 'Safety Equipment', productCount: 21 },
        { id: 'tools', name: 'Tools & Equipment', productCount: 33 },
        { id: 'hydraulics', name: 'Hydraulics', productCount: 23 },
        { id: 'pneumatics', name: 'Pneumatics', productCount: 19 }
      ]);
      
      safeSetState(setFeaturedProducts, []);
    } finally {
      if (mountedRef.current) {
        safeSetState(setLoading, false);
      }
    }
  }, [safeSetState]);

  // Load products with enhanced filtering and error handling
  const loadProducts = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      safeSetState(setLoading, true);
      safeSetState(setError, null);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const filters = {
        searchTerm: searchTerm.trim(),
        category: selectedCategory === 'All Categories' ? '' : selectedCategory,
        sortBy,
        priceRange,
        inStockOnly,
        page: 1,
        pageSize: itemsPerPage
      };

      // Use enhanced service method
      const result = await ecommerceService.getPublicCatalog(filters);

      if (!mountedRef.current) return;

      safeSetState(setProducts, result.products || []);
      safeSetState(setTotalCount, result.totalCount || 0);
      safeSetState(setHasMore, result.hasMore || false);
      safeSetState(setIsMockData, result.isMockData || false);
      safeSetState(setCurrentPage, 1);

      // Enhanced analytics tracking for search
      if (searchTerm.trim()) {
        try {
          await ecommerceService.createFactoryAnalytics('guest_search', {
            searchTerm: searchTerm.trim(),
            resultCount: result.totalCount || 0,
            category: selectedCategory,
            sessionId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          });
        } catch (analyticsError) {
          console.warn('Analytics tracking failed:', analyticsError);
        }
      }

    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error loading products:', err);
      safeSetState(setError, `Failed to load products: ${err.message}`);
      safeSetState(setProducts, []);
      safeSetState(setTotalCount, 0);
      safeSetState(setHasMore, false);
    } finally {
      if (mountedRef.current) {
        safeSetState(setLoading, false);
      }
    }
  }, [searchTerm, selectedCategory, sortBy, priceRange, inStockOnly, sessionId, safeSetState]);

  // Load more products with pagination
  const loadMoreProducts = useCallback(async () => {
    if (!mountedRef.current || loading) return;
    
    try {
      safeSetState(setLoading, true);

      const filters = {
        searchTerm: searchTerm.trim(),
        category: selectedCategory === 'All Categories' ? '' : selectedCategory,
        sortBy,
        priceRange,
        inStockOnly,
        page: currentPage,
        pageSize: itemsPerPage
      };

      const result = await ecommerceService.getPublicCatalog(filters);

      if (!mountedRef.current) return;

      // Append new products, avoiding duplicates
      safeSetState(setProducts, prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = (result.products || []).filter(p => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });
      
      safeSetState(setHasMore, result.hasMore || false);

    } catch (err) {
      if (!mountedRef.current) return;
      
      console.error('Error loading more products:', err);
      showNotification('Failed to load more products', 'error');
    } finally {
      if (mountedRef.current) {
        safeSetState(setLoading, false);
      }
    }
  }, [loading, searchTerm, selectedCategory, sortBy, priceRange, inStockOnly, currentPage, safeSetState]);

  // Enhanced cart management
  const addToGuestCart = useCallback(async (product) => {
    if (!mountedRef.current) return;
    
    try {
      // Optimistic update
      safeSetState(setGuestCartItems, prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
          return prev.map(item => 
            item.id === product.id 
              ? { ...item, quantity: item.quantity + 1, updatedAt: new Date() }
              : item
          );
        }
        return [...prev, { 
          ...product, 
          quantity: 1, 
          addedAt: new Date(),
          sessionId 
        }];
      });

      // Backend update with enhanced error handling
      try {
        await ecommerceService.addToCart(sessionId, product.id, 1);
        
        // Track cart analytics
        await ecommerceService.createFactoryAnalytics('cart_addition', {
          productId: product.id,
          productName: product.displayName || product.name,
          sessionId,
          timestamp: new Date().toISOString()
        });
        
      } catch (backendError) {
        console.warn('Backend cart update failed:', backendError);
        // Keep optimistic update even if backend fails
      }

      showNotification(`${product.displayName || product.name} added to cart`, 'success');

    } catch (error) {
      if (!mountedRef.current) return;
      
      console.error('Error adding to cart:', error);
      showNotification('Failed to add item to cart', 'error');
      
      // Revert optimistic update on error
      safeSetState(setGuestCartItems, prev => 
        prev.filter(item => item.id !== product.id)
      );
    }
  }, [sessionId, safeSetState]);

  // Enhanced product view tracking
  const viewProductDetails = useCallback(async (product) => {
    if (!mountedRef.current) return;
    
    try {
      // Track product view analytics
      await ecommerceService.createFactoryAnalytics('product_view', {
        productId: product.id,
        productName: product.displayName || product.name,
        category: product.category,
        sessionId,
        searchQuery: searchTerm || null,
        referrerCategory: selectedCategory !== 'All Categories' ? selectedCategory : null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('View tracking failed:', error);
    }

    navigate(`/product/${product.id}`, { 
      state: { 
        product,
        returnTo: '/catalog',
        searchContext: { searchTerm, selectedCategory, sortBy }
      }
    });
  }, [sessionId, searchTerm, selectedCategory, sortBy, navigate]);

  // Enhanced notification system
  const showNotification = useCallback((message, type = 'info') => {
    if (!mountedRef.current) return;
    
    const notificationId = Date.now();
    safeSetState(setNotification, { message, type, id: notificationId });
    
    // Auto-dismiss with cleanup check
    setTimeout(() => {
      if (mountedRef.current) {
        safeSetState(setNotification, prev => 
          prev?.id === notificationId ? null : prev
        );
      }
    }, 4000);
  }, [safeSetState]);

  // Enhanced retry mechanism
  const handleRetry = useCallback(() => {
    if (!mountedRef.current) return;
    
    safeSetState(setError, null);
    loadInitialData();
  }, [loadInitialData, safeSetState]);

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load products when filters change with enhanced debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && currentPage === 1) {
        loadProducts();
      }
    }, searchTerm ? 600 : 100); // Longer debounce for search, faster for filters

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchTerm, selectedCategory, sortBy, priceRange, inStockOnly, loadProducts, currentPage]);

  // Load more products when page changes
  useEffect(() => {
    if (currentPage > 1 && mountedRef.current) {
      loadMoreProducts();
    }
  }, [currentPage, loadMoreProducts]);

  // Memoized filter options for performance
  const filterOptions = useMemo(() => ({
    sortOptions: [
      { value: 'relevance', label: 'Most Relevant' },
      { value: 'price-low', label: 'Price: Low to High' },
      { value: 'price-high', label: 'Price: High to Low' },
      { value: 'name', label: 'Name A-Z' },
      { value: 'rating', label: 'Highest Rated' },
      { value: 'newest', label: 'Newest First' },
      { value: 'popular', label: 'Most Popular' },
      { value: 'featured', label: 'Featured Products' }
    ]
  }), []);

  // Calculate cart metrics
  const cartMetrics = useMemo(() => {
    const itemCount = guestCartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalValue = guestCartItems.reduce((sum, item) => {
      const price = item.pricing?.discountPrice || item.pricing?.unitPrice || 0;
      return sum + (price * (item.quantity || 0));
    }, 0);
    
    return { itemCount, totalValue };
  }, [guestCartItems]);

  // Enhanced Product Card Component
  const ProductCard = ({ product }) => {
    const [isWishlisted, setIsWishlisted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleAddToCart = async () => {
      if (!mountedRef.current || isLoading) return;
      
      setIsLoading(true);
      await addToGuestCart(product);
      if (mountedRef.current) {
        setIsLoading(false);
      }
    };

    const handleWishlist = useCallback(async () => {
      if (!mountedRef.current) return;
      
      setIsWishlisted(!isWishlisted);
      
      try {
        // Track wishlist action
        await ecommerceService.createFactoryAnalytics('wishlist_toggle', {
          productId: product.id,
          action: !isWishlisted ? 'add' : 'remove',
          sessionId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn('Wishlist tracking failed:', error);
      }
    }, [isWishlisted, product.id]);

    // Safe price calculation with fallbacks
    const pricing = useMemo(() => {
      const currentPrice = product.pricing?.discountPrice || product.pricing?.unitPrice || 0;
      const originalPrice = product.pricing?.listPrice || product.pricing?.unitPrice || 0;
      const hasDiscount = originalPrice > currentPrice && currentPrice > 0;
      const discountPercentage = hasDiscount 
        ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
        : 0;
      
      return { currentPrice, originalPrice, hasDiscount, discountPercentage };
    }, [product.pricing]);

    // Safe stock status
    const stockInfo = useMemo(() => {
      const status = product.inventory?.stockStatus || 'In Stock';
      const isInStock = ['In Stock', 'Limited Stock'].includes(status);
      const quantity = product.inventory?.quantity || 0;
      
      return { status, isInStock, quantity };
    }, [product.inventory]);

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 group">
        {/* Product Image with Error Handling */}
        <div className="relative aspect-square">
          {!imageError ? (
            <img 
              src={product.images?.primary || product.images?.thumbnail || '/api/placeholder/300/300'}
              alt={product.displayName || product.name}
              className="w-full h-full object-cover bg-gray-100 group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          )}
          
          {/* Enhanced Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {product.featured && (
              <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                Featured
              </span>
            )}
            {pricing.hasDiscount && pricing.discountPercentage > 0 && (
              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                -{pricing.discountPercentage}%
              </span>
            )}
            {product.trending && (
              <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                <TrendingUp className="w-3 h-3" />
                Trending
              </span>
            )}
            {product.newArrival && (
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded font-medium shadow-sm">
                New
              </span>
            )}
          </div>
          
          {/* Enhanced Action Buttons */}
          <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleWishlist}
              className={`p-2 rounded-full shadow-lg transition-all duration-200 ${
                isWishlisted 
                  ? 'bg-red-500 text-white scale-110' 
                  : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-500 hover:scale-110'
              }`}
              title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => viewProductDetails(product)}
              className="p-2 bg-white text-gray-600 rounded-full shadow-lg hover:bg-blue-50 hover:text-blue-600 hover:scale-110 transition-all duration-200"
              title="View details"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          
          {/* Enhanced Stock Status */}
          <div className="absolute bottom-2 left-2">
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full shadow-sm ${
              stockInfo.status === 'In Stock' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : stockInfo.status === 'Limited Stock'
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                stockInfo.status === 'In Stock' 
                  ? 'bg-green-500' 
                  : stockInfo.status === 'Limited Stock'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></div>
              {stockInfo.status}
              {stockInfo.quantity > 0 && stockInfo.quantity < 10 && (
                <span className="ml-1">({stockInfo.quantity})</span>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Product Info */}
        <div className="p-4">
          {/* Title and Category */}
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer mb-1"
                onClick={() => viewProductDetails(product)}>
              {product.displayName || product.name}
            </h3>
            <p className="text-xs text-gray-500">{product.category}</p>
            {product.shortDescription && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-1">{product.shortDescription}</p>
            )}
          </div>

          {/* Enhanced Supplier Info */}
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-400 fill-current" />
              <span className="font-medium">{product.supplier?.rating || 4.5}</span>
              <span className="text-gray-400">({product.supplier?.reviewCount || 24})</span>
            </div>
            <span className="text-gray-300">•</span>
            <span className="truncate font-medium">{product.supplier?.name || 'Verified Supplier'}</span>
            {product.supplier?.verified && (
              <>
                <span className="text-gray-300">•</span>
                <div className="flex items-center gap-1 text-green-600">
                  <Shield className="w-3 h-3" />
                  <span>Verified</span>
                </div>
              </>
            )}
          </div>

          {/* Enhanced Pricing */}
          <div className="mb-3">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-lg font-bold text-blue-600">
                RM {pricing.currentPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </span>
              {pricing.hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  RM {pricing.originalPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
            
            {product.pricing?.bulkPricing?.length > 0 && (
              <p className="text-xs text-purple-600">
                Bulk: RM {product.pricing.bulkPricing[0].price.toLocaleString('en-MY', { minimumFractionDigits: 2 })} 
                <span className="text-gray-500"> ({product.pricing.bulkPricing[0].minQty}+ units)</span>
              </p>
            )}
          </div>

          {/* Enhanced Delivery Info */}
          <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Truck className="w-3 h-3" />
              <span>{product.inventory?.leadTime || '3-5 days'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>MOQ: {product.inventory?.minimumOrderQty || 1}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{product.supplier?.location || 'MY'}</span>
            </div>
          </div>

          {/* Enhanced Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleAddToCart}
              disabled={!stockInfo.isInStock || isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-1 shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              {isLoading ? 'Adding...' : 'Add to Cart'}
            </button>
            <button
              onClick={() => navigate('/quote/request', { state: { product } })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
              title="Request quote"
            >
              Quote
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Product List Item Component
  const ProductListItem = ({ product }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleAddToCart = async () => {
      if (!mountedRef.current || isLoading) return;
      
      setIsLoading(true);
      await addToGuestCart(product);
      if (mountedRef.current) {
        setIsLoading(false);
      }
    };

    const pricing = useMemo(() => {
      const currentPrice = product.pricing?.discountPrice || product.pricing?.unitPrice || 0;
      const originalPrice = product.pricing?.listPrice || product.pricing?.unitPrice || 0;
      const hasDiscount = originalPrice > currentPrice && currentPrice > 0;
      
      return { currentPrice, originalPrice, hasDiscount };
    }, [product.pricing]);

    const stockInfo = useMemo(() => {
      const status = product.inventory?.stockStatus || 'In Stock';
      const isInStock = ['In Stock', 'Limited Stock'].includes(status);
      
      return { status, isInStock };
    }, [product.inventory]);

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all duration-300">
        <div className="flex gap-4">
          {/* Enhanced Image */}
          <div className="w-24 h-24 flex-shrink-0">
            {!imageError ? (
              <img 
                src={product.images?.primary || product.images?.thumbnail || '/api/placeholder/100/100'}
                alt={product.displayName || product.name}
                className="w-full h-full object-cover rounded-lg bg-gray-100 cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => viewProductDetails(product)}
                onError={() => setImageError(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer"
                   onClick={() => viewProductDetails(product)}>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0 mr-4">
                <h3 className="font-semibold text-gray-900 text-base cursor-pointer hover:text-blue-600 transition-colors line-clamp-1"
                    onClick={() => viewProductDetails(product)}>
                  {product.displayName || product.name}
                </h3>
                <p className="text-sm text-gray-600 mb-1">{product.category}</p>
                {product.shortDescription && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{product.shortDescription}</p>
                )}
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold text-blue-600">
                  RM {pricing.currentPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                </div>
                {pricing.hasDiscount && (
                  <div className="text-sm text-gray-500 line-through">
                    RM {pricing.originalPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                  </div>
                )}
                {product.pricing?.bulkPricing?.length > 0 && (
                  <div className="text-xs text-purple-600">
                    Bulk from RM {product.pricing.bulkPricing[0].price.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
            
            {/* Enhanced Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span>{product.supplier?.rating || 4.5}</span>
                <span>({product.supplier?.reviewCount || 24})</span>
              </div>
              <span className="text-gray-300">•</span>
              <span className="font-medium">{product.supplier?.name || 'Verified Supplier'}</span>
              {product.supplier?.verified && (
                <>
                  <span className="text-gray-300">•</span>
                  <div className="flex items-center gap-1 text-green-600">
                    <Shield className="w-3 h-3" />
                    <span>Verified</span>
                  </div>
                </>
              )}
              <span className="text-gray-300">•</span>
              <div className={`flex items-center gap-1 ${
                stockInfo.status === 'In Stock' ? 'text-green-600' : 
                stockInfo.status === 'Limited Stock' ? 'text-orange-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  stockInfo.status === 'In Stock' ? 'bg-green-500' : 
                  stockInfo.status === 'Limited Stock' ? 'bg-orange-500' : 'bg-red-500'
                }`}></div>
                <span>{stockInfo.status}</span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {product.featured && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                    Featured
                  </span>
                )}
                {product.trending && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                    Trending
                  </span>
                )}
                {product.newArrival && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    New
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleAddToCart}
                  disabled={!stockInfo.isInStock || isLoading}
                  className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingCart className="w-4 h-4" />
                  )}
                  {isLoading ? 'Adding...' : 'Add'}
                </button>
                <button 
                  onClick={() => viewProductDetails(product)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
                  title="View details"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
                <button 
                  onClick={() => navigate('/quote/request', { state: { product } })}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm hover:shadow-md"
                  title="Request quote"
                >
                  Quote
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced Featured Section
  const FeaturedSection = () => (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <p className="text-gray-600">Hand-picked products with the best value and quality</p>
        </div>
        <button 
          onClick={() => {
            setSelectedCategory('All Categories');
            setSearchTerm('');
            setSortBy('featured');
          }}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All Featured
          <span>→</span>
        </button>
      </div>
      
      {featuredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Enhanced Category Navigation
  const CategoryNavigation = () => (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Browse by Category</h3>
        <span className="text-sm text-gray-500">{categories.length - 1} categories available</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {categories.slice(1).map((category) => ( // Skip "All Categories"
          <button
            key={category.id}
            onClick={() => {
              setSelectedCategory(category.name);
              setCurrentPage(1);
              setSearchTerm(''); // Clear search when selecting category
            }}
            className={`group p-4 rounded-lg border-2 transition-all text-left hover:scale-105 ${
              selectedCategory === category.name
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                selectedCategory === category.name 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600'
              }`}>
                <span className="text-sm font-bold">
                  {category.name.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-gray-900 text-sm truncate">{category.name}</h4>
                <p className="text-xs text-gray-600">{category.productCount || 0} items</p>
              </div>
            </div>
            {category.description && (
              <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{category.description}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // Loading skeleton component
  const LoadingSkeleton = () => (
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

  // Show loading skeleton on initial load
  if (loading && products.length === 0 && !error) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Notification System */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl transition-all duration-300 transform ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 
          notification.type === 'error' ? 'bg-red-500 text-white' : 
          'bg-blue-500 text-white'
        } animate-slide-in-right`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <Bell className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-2 text-white hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900 cursor-pointer hover:text-blue-600 transition-colors" 
                  onClick={() => navigate('/catalog')}>
                HiggsFlow
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Industrial E-commerce</span>
                {isMockData && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">
                    Demo Mode
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/factory/register')}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Register Factory
              </button>
              <button 
                onClick={() => navigate('/factory/login')}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 text-sm"
              >
                <LogIn className="w-4 h-4" />
                Factory Login
              </button>
              <div className="relative">
                <button 
                  onClick={() => navigate('/cart')}
                  className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 relative transition-all duration-200 hover:scale-110 shadow-md hover:shadow-lg"
                  title={`Cart (${cartMetrics.itemCount} items)`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartMetrics.itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                      {cartMetrics.itemCount > 99 ? '99+' : cartMetrics.itemCount}
                    </span>
                  )}
                </button>
                {cartMetrics.totalValue > 0 && (
                  <div className="absolute -bottom-8 right-0 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    RM {cartMetrics.totalValue.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Hero Section */}
        {!searchTerm && selectedCategory === 'All Categories' && (
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Malaysia's Leading Industrial E-commerce Platform
              </h2>
              <p className="text-lg md:text-xl opacity-90 mb-6 max-w-2xl">
                Discover thousands of industrial products with AI-powered recommendations, wholesale pricing, and verified suppliers
              </p>
              <div className="flex flex-wrap gap-6 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Verified Suppliers</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Best Prices</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                  <span className="font-medium">Fast Delivery</span>
                </div>
              </div>
              {isMockData && (
                <div className="bg-blue-700/50 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-sm">🚀</span>
                    </div>
                    <p className="text-sm">
                      Demo Mode: Experiencing enhanced mock data. Full Phase 2A functionality available in production.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Enhanced Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search industrial products, suppliers, part numbers, or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            {/* Filter Toggle for Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white shadow-sm"
            >
              <Filter className="w-5 h-5" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Enhanced Filter Section */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block transition-all duration-200`}>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 items-center">
                {/* Category Filter */}
                <div className="min-w-0 flex-shrink-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name} ({category.productCount || 0})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Filter */}
                <div className="min-w-0 flex-shrink-0">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 bg-white min-w-[180px]"
                  >
                    {filterOptions.sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock Filter */}
                <label className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">In Stock Only</span>
                </label>

                {/* View Mode Toggle */}
                <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-auto bg-white">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title="List view"
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>

                {/* Clear Filters */}
                {(searchTerm || selectedCategory !== 'All Categories' || inStockOnly || sortBy !== 'relevance') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedCategory('All Categories');
                      setInStockOnly(false);
                      setSortBy('relevance');
                      setPriceRange([0, 10000]);
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Show featured section only on homepage */}
        {!searchTerm && selectedCategory === 'All Categories' && (
          <FeaturedSection />
        )}

        {/* Show categories only on homepage */}
        {!searchTerm && selectedCategory === 'All Categories' && (
          <CategoryNavigation />
        )}

        {/* Enhanced Results Summary */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div>
            <p className="text-gray-700 font-medium">
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading products...
                </span>
              ) : (
                <>
                  Showing <span className="font-bold text-blue-600">{products.length}</span> of{' '}
                  <span className="font-bold text-blue-600">{totalCount}</span> products
                  {selectedCategory !== 'All Categories' && (
                    <span className="text-blue-600"> in {selectedCategory}</span>
                  )}
                  {searchTerm && (
                    <span className="text-blue-600"> for "{searchTerm}"</span>
                  )}
                </>
              )}
            </p>
            {!loading && totalCount > 0 && (
              <p className="text-sm text-gray-500">
                Updated {new Date().toLocaleTimeString()} • Live pricing
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span>Live updates</span>
          </div>
        </div>

        {/* Enhanced Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900 mb-1">Connection Issue</h3>
                <p className="text-red-700 mb-3">{error}</p>
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Products Display */}
        {products.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-8">
                {products.map((product) => (
                  <ProductListItem key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Enhanced Load More */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading more products...
                    </>
                  ) : (
                    <>
                      <Package className="w-5 h-5" />
                      Load More Products ({totalCount - products.length} remaining)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : !loading && (
          /* Enhanced No Results */
          <div className="text-center py-16 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="text-gray-400 mb-6">
              <Search className="w-20 h-20 mx-auto" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-3">No products found</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm ? (
                <>We couldn't find any products matching "<strong>{searchTerm}</strong>". Try adjusting your search or browse our categories.</>
              ) : (
                <>No products available in the selected category. Try different filters or browse all categories.</>
              )}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All Categories');
                  setPriceRange([0, 10000]);
                  setInStockOnly(false);
                  setSortBy('relevance');
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Clear All Filters
              </button>
              <button 
                onClick={() => navigate('/quote/request')}
                className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Request Custom Quote
              </button>
            </div>

            {/* Suggested categories */}
            {categories.length > 1 && (
              <div className="mt-8">
                <p className="text-sm text-gray-600 mb-4">Or browse these popular categories:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {categories.slice(1, 6).map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setSelectedCategory(category.name);
                        setSearchTerm('');
                      }}
                      className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Call to Action */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-xl p-8 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Transform Your Procurement?</h2>
            <p className="text-lg md:text-xl mb-8 opacity-90 max-w-3xl mx-auto">
              Join thousands of Malaysian factories already saving time and money with HiggsFlow's intelligent procurement platform
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">Verified Suppliers</h3>
                <p className="text-sm opacity-90">Access to 500+ pre-verified industrial suppliers across Malaysia</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">Wholesale Pricing</h3>
                <p className="text-sm opacity-90">Save up to 40% with bulk discounts and factory-direct pricing</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Truck className="w-8 h-8" />
                </div>
                <h3 className="font-semibold mb-2">Fast Delivery</h3>
                <p className="text-sm opacity-90">Same-day shipping for urgent orders, 3-5 days standard delivery</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/factory/register')}
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Register Factory Account
              </button>
              <button 
                onClick={() => navigate('/quote/request')}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Request Quote {cartMetrics.itemCount > 0 && `(${cartMetrics.itemCount} items)`}
              </button>
            </div>

            {/* Social proof */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-bold text-xl">2,500+</div>
                  <div className="opacity-90">Registered Factories</div>
                </div>
                <div>
                  <div className="font-bold text-xl">50,000+</div>
                  <div className="opacity-90">Products Available</div>
                </div>
                <div>
                  <div className="font-bold text-xl">RM 100M+</div>
                  <div className="opacity-90">Transactions Processed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Secure & Trusted Platform</h3>
                <p className="text-sm text-gray-600">Bank-level security with PDPA compliance</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">24/7 Platform Availability</h3>
                <p className="text-sm text-gray-600">Always-on platform with 99.9% uptime</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <User className="w-8 h-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Dedicated Support</h3>
                <p className="text-sm text-gray-600">Personal account managers for factories</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .aspect-square {
          aspect-ratio: 1 / 1;
        }
        
        .backdrop-blur-sm {
          backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
};

export default HiggsFlowPublicCatalog;
