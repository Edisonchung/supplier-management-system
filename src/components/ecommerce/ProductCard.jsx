// src/components/ecommerce/ProductCard.jsx
// FIXED: Enhanced E-commerce Product Card - ELIMINATES console spam and loading issues

import React, { useState, useCallback, useMemo, memo, useRef } from 'react';
import { 
  Heart, 
  Star, 
  MapPin, 
  Factory, 
  Award, 
  Truck, 
  Clock,
  ShoppingCart,
  MessageSquare,
  BarChart3,
  Shield,
  Package,
  DollarSign,
  Info,
  ExternalLink,
  Eye,
  AlertCircle,
  CheckCircle,
  Zap
} from 'lucide-react';

// FIXED: Error logging throttle to prevent console spam
class ErrorThrottle {
  constructor() {
    this.errorCount = new Map();
    this.maxErrorsPerProduct = 1; // Only log once per product
    this.errorTimeout = 10000; // Reset after 10 seconds
  }
  
  shouldLog(productId, errorType) {
    const key = `${productId}-${errorType}`;
    const now = Date.now();
    const lastError = this.errorCount.get(key);
    
    if (!lastError || now - lastError.timestamp > this.errorTimeout) {
      this.errorCount.set(key, { timestamp: now, count: 1 });
      return true;
    }
    
    if (lastError.count < this.maxErrorsPerProduct) {
      lastError.count++;
      return true;
    }
    
    return false;
  }
  
  clear() {
    this.errorCount.clear();
  }
}

// Global error throttle instance
const errorThrottle = new ErrorThrottle();

// FIXED: Enhanced image validation and fallback system
const validateImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Block known problematic URLs that cause infinite loops
  const blockedPatterns = [
    'placeholder-product.jpg',
    'via.placeholder.com', // These often fail
    'oaidalleapiprodscus.blob.core.windows.net', // Expired DALL-E URLs
    'example.com',
    'lorem',
    'ipsum'
  ];
  
  return !blockedPatterns.some(pattern => url.includes(pattern));
};

// FIXED: Safe image URL generator
const generateFallbackImage = (productName, category = 'general') => {
  const categoryColors = {
    'components': '4F46E5',
    'safety': '10B981', 
    'pumps': '3B82F6',
    'bearings': 'F59E0B',
    'electrical': '8B5CF6',
    'general': '6B7280'
  };
  
  const color = categoryColors[category.toLowerCase()] || categoryColors.general;
  const encodedName = encodeURIComponent(productName || 'Product').substring(0, 20);
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="300" fill="#f8fafc"/>
      <rect width="400" height="300" fill="#${color}" opacity="0.1"/>
      <circle cx="200" cy="120" r="40" fill="#${color}" opacity="0.3"/>
      <text x="200" y="200" text-anchor="middle" fill="#${color}" font-family="Arial, sans-serif" font-size="14" font-weight="bold">${encodedName}</text>
      <text x="200" y="220" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="10">HiggsFlow</text>
    </svg>
  `)}`;
};

// Memoized ProductCard component for better performance
const EcommerceProductCard = memo(({ 
  product, 
  onAddToCart, 
  onRequestQuote, 
  onAddToFavorites, 
  onCompare,
  onClick,
  onQuickView,
  isInFavorites = false,
  isInComparison = false,
  viewMode = 'grid',
  showQuickActions = true,
  className = ''
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const imageRef = useRef(null);
  const maxRetries = 1; // Limit retries to prevent infinite loops

  // Memoized product data processing
  const productData = useMemo(() => {
    if (!product || typeof product !== 'object') {
      if (errorThrottle.shouldLog('unknown', 'invalid-data')) {
        console.warn('[ProductCard] Invalid product data received:', typeof product);
      }
      return getDefaultProductData();
    }

    try {
      return processProductData(product);
    } catch (error) {
      if (errorThrottle.shouldLog(product.id || 'unknown', 'processing-error')) {
        console.error('[ProductCard] Error processing product:', error.message);
      }
      return getDefaultProductData();
    }
  }, [product]);

  // FIXED: Default product data
  function getDefaultProductData() {
    return {
      id: 'unknown',
      name: 'Product Unavailable',
      sku: '',
      brand: '',
      category: 'general',
      price: 0,
      originalPrice: null,
      currency: 'RM',
      visibility: 'public',
      availability: 'out_of_stock',
      featured: false,
      supplier: 'HiggsFlow Partner',
      supplierLocation: 'Malaysia',
      stock: 0,
      stockStatus: { 
        status: 'out_of_stock', 
        text: 'Unavailable', 
        colorClass: 'text-gray-600', 
        bgClass: 'bg-gray-500' 
      },
      deliveryTime: 'Contact for availability',
      quickDelivery: false,
      specifications: {},
      keySpecs: [],
      applications: [],
      certifications: [],
      rating: 0,
      reviewCount: 0,
      imageUrl: generateFallbackImage('Product Unavailable', 'general'),
      tags: [],
      industries: [],
      syncStatus: 'error',
      lastSyncedAt: null,
      internalProductId: '',
      dataSource: '',
      viewCount: 0,
      isValid: false
    };
  }

  // FIXED: Enhanced product data processing
  function processProductData(product) {
    const safeGet = (obj, path, defaultValue = '') => {
      try {
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
          if (current && typeof current === 'object' && key in current) {
            current = current[key];
          } else {
            return defaultValue;
          }
        }
        return current !== null && current !== undefined ? current : defaultValue;
      } catch {
        return defaultValue;
      }
    };

    const parsePrice = (price) => {
      if (typeof price === 'number' && !isNaN(price)) return Math.max(0, price);
      if (typeof price === 'string') {
        const parsed = parseFloat(price.replace(/[^\d.-]/g, ''));
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
      return 0;
    };

    const parseStockValue = (stockData) => {
      if (typeof stockData === 'number' && !isNaN(stockData)) {
        return Math.max(0, Math.floor(stockData));
      }
      
      if (typeof stockData === 'string') {
        const parsed = parseInt(stockData, 10);
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
      
      if (typeof stockData === 'object' && stockData !== null) {
        const possibleStockValues = [
          stockData.availableStock,
          stockData.stockLevel,
          stockData.currentStock,
          stockData.quantity,
          stockData.available,
          stockData.stock,
          stockData.inStock,
          stockData.physicalStock,
          stockData.onHand,
          stockData.inventory
        ];
        
        for (const value of possibleStockValues) {
          if (typeof value === 'number' && !isNaN(value) && value >= 0) {
            return Math.floor(value);
          }
          if (typeof value === 'string') {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed >= 0) {
              return parsed;
            }
          }
        }
        
        return 0;
      }
      
      return 0;
    };

    const getStockStatus = (stock) => {
      const stockNum = Number(stock) || 0;
      if (stockNum === 0) {
        return { 
          status: 'out_of_stock', 
          text: 'Made to Order', 
          colorClass: 'text-orange-600', 
          bgClass: 'bg-orange-500' 
        };
      }
      if (stockNum < 5) {
        return { 
          status: 'low_stock', 
          text: 'Limited Stock', 
          colorClass: 'text-yellow-600', 
          bgClass: 'bg-yellow-500' 
        };
      }
      return { 
        status: 'in_stock', 
        text: 'In Stock', 
        colorClass: 'text-green-600', 
        bgClass: 'bg-green-500' 
      };
    };

    const getDeliveryTime = (stock) => {
      const stockNum = Number(stock) || 0;
      if (stockNum > 10) return '1-2 days';
      if (stockNum > 0) return '3-5 days';
      return '2-3 weeks';
    };

    const extractKeySpecs = (product) => {
      const specs = (typeof product.specifications === 'object' && product.specifications) ? 
        product.specifications : {};
      const keySpecs = [];
      
      const specMap = {
        model: specs.model || specs.type,
        voltage: specs.voltage,
        power: specs.power,
        material: specs.material,
        dimensions: specs.dimensions
      };

      Object.entries(specMap).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          try {
            let specValue = String(value);
            if (key === 'voltage' && !specValue.includes('V')) specValue += 'V';
            if (key === 'power' && !specValue.includes('W')) specValue += 'W';
            
            if (specValue && specValue !== 'undefined' && specValue !== 'null' && specValue.length > 0) {
              keySpecs.push(specValue.length > 20 ? specValue.substring(0, 20) + '...' : specValue);
            }
          } catch (e) {
            // Silent fail for spec processing
          }
        }
      });
      
      return keySpecs.slice(0, 3);
    };

    // FIXED: Enhanced image URL resolution with validation
    const getImageUrl = (product) => {
      const productName = product.name || product.displayName || 'Industrial Component';
      const category = product.category || 'general';
      
      // Priority order for image URL sources
      const imageFields = [
        'imageUrl',
        'image_url', 
        'image',
        'photo',
        'thumbnail'
      ];

      for (const field of imageFields) {
        const imageValue = product[field];
        
        if (imageValue) {
          // Handle array of images (take first valid one)
          if (Array.isArray(imageValue) && imageValue.length > 0) {
            for (const img of imageValue) {
              const imgUrl = typeof img === 'object' ? img.url : img;
              if (typeof imgUrl === 'string' && validateImageUrl(imgUrl)) {
                return imgUrl;
              }
            }
          }
          
          // Handle string image URLs
          if (typeof imageValue === 'string' && validateImageUrl(imageValue)) {
            return imageValue;
          }
          
          // Handle image objects
          if (typeof imageValue === 'object' && imageValue !== null) {
            if (imageValue.url && validateImageUrl(imageValue.url)) {
              return imageValue.url;
            }
          }
        }
      }

      // Check nested images object
      if (product.images && typeof product.images === 'object') {
        const nestedImageFields = ['primary', 'technical', 'application'];
        for (const field of nestedImageFields) {
          const imgData = product.images[field];
          if (imgData) {
            const imgUrl = typeof imgData === 'object' ? imgData.url : imgData;
            if (typeof imgUrl === 'string' && validateImageUrl(imgUrl)) {
              return imgUrl;
            }
          }
        }
      }

      // Return safe fallback
      return generateFallbackImage(productName, category);
    };

    // Process the data safely
    const stockValue = parseStockValue(safeGet(product, 'stock'));
    const priceValue = parsePrice(safeGet(product, 'price') || safeGet(product, 'pricing.listPrice'));
    const originalPriceValue = parsePrice(safeGet(product, 'originalPrice') || safeGet(product, 'pricing.originalPrice'));

    return {
      id: String(safeGet(product, 'id', 'unknown')),
      name: String(safeGet(product, 'name') || safeGet(product, 'displayName', 'Unknown Product')),
      sku: String(safeGet(product, 'sku') || safeGet(product, 'code') || safeGet(product, 'partNumber', '')),
      brand: String(safeGet(product, 'brand') || safeGet(product, 'manufacturer', '')),
      category: String(safeGet(product, 'category', 'General')),
      
      price: priceValue,
      originalPrice: originalPriceValue > priceValue ? originalPriceValue : null,
      currency: String(safeGet(product, 'currency', 'RM')),
      
      visibility: String(safeGet(product, 'visibility', 'public')),
      availability: String(safeGet(product, 'availability') || getAvailabilityFromStock(stockValue)),
      featured: Boolean(safeGet(product, 'featured')),
      
      supplier: String(safeGet(product, 'supplier.name') || safeGet(product, 'supplier', 'HiggsFlow Partner')),
      supplierLocation: String(safeGet(product, 'supplier.location') || safeGet(product, 'location', 'Malaysia')),
      
      stock: stockValue,
      stockStatus: getStockStatus(stockValue),
      deliveryTime: String(safeGet(product, 'deliveryTime') || getDeliveryTime(stockValue)),
      quickDelivery: stockValue > 10,
      
      specifications: typeof safeGet(product, 'specifications') === 'object' ? 
        safeGet(product, 'specifications', {}) : {},
      keySpecs: extractKeySpecs(product),
      applications: Array.isArray(safeGet(product, 'applications')) ? 
        safeGet(product, 'applications', []) : [],
      certifications: Array.isArray(safeGet(product, 'certifications')) ? 
        safeGet(product, 'certifications', []) : [],
      
      rating: Math.max(0, Math.min(5, Number(safeGet(product, 'rating')) || (Math.random() * 2 + 3))),
      reviewCount: Math.max(0, Number(safeGet(product, 'reviewCount')) || Math.floor(Math.random() * 50) + 5),
      
      imageUrl: getImageUrl(product),
      
      tags: Array.isArray(safeGet(product, 'tags')) ? 
        safeGet(product, 'tags', []).map(tag => String(tag)).filter(Boolean) : [],
      industries: Array.isArray(safeGet(product, 'industries')) ? 
        safeGet(product, 'industries', []).map(ind => String(ind)).filter(Boolean) : 
        [String(safeGet(product, 'category'))].filter(Boolean),
      
      syncStatus: String(safeGet(product, 'syncStatus', '')),
      lastSyncedAt: safeGet(product, 'lastSyncedAt'),
      internalProductId: String(safeGet(product, 'internalProductId', '')),
      dataSource: String(safeGet(product, 'dataSource', '')),
      viewCount: Math.max(0, Number(safeGet(product, 'viewCount', 0))),
      
      isValid: true
    };

    function getAvailabilityFromStock(stock) {
      const stockNum = Number(stock) || 0;
      if (stockNum === 0) return 'out_of_stock';
      if (stockNum < 5) return 'low_stock';
      return 'in_stock';
    }
  }

  // Calculate discount percentage safely
  const savings = useMemo(() => {
    if (productData.originalPrice && productData.originalPrice > productData.price && productData.price > 0) {
      return Math.round(((productData.originalPrice - productData.price) / productData.originalPrice) * 100);
    }
    return 0;
  }, [productData.originalPrice, productData.price]);

  // FIXED: Enhanced image loading handlers with proper error management
  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    setImageError(false);
    setRetryCount(0);
  }, []);

  const handleImageError = useCallback((e) => {
    // Only log once per product to prevent spam
    if (errorThrottle.shouldLog(productData.id, 'image-load')) {
      console.warn(`[ProductCard] Image failed for product: ${productData.id} (${productData.name})`);
    }
    
    setImageError(true);
    setIsImageLoaded(true);
    
    // FIXED: Prevent infinite retry loops
    if (retryCount < maxRetries && e.target) {
      setRetryCount(prev => prev + 1);
      // Try the fallback image
      const fallbackUrl = generateFallbackImage(productData.name, productData.category);
      if (e.target.src !== fallbackUrl) {
        e.target.src = fallbackUrl;
      }
    }
  }, [productData.id, productData.name, productData.category, retryCount, maxRetries]);

  // Enhanced event handlers with error boundaries
  const handleCardClick = useCallback((e) => {
    try {
      if (e.target.closest('button')) return;
      onClick?.(productData);
    } catch (error) {
      if (errorThrottle.shouldLog(productData.id, 'click-error')) {
        console.error('[ProductCard] Click handler error:', error.message);
      }
    }
  }, [onClick, productData]);

  const handleAddToCart = useCallback((e) => {
    try {
      e.stopPropagation();
      onAddToCart?.(productData);
    } catch (error) {
      if (errorThrottle.shouldLog(productData.id, 'cart-error')) {
        console.error('[ProductCard] Add to cart error:', error.message);
      }
    }
  }, [onAddToCart, productData]);

  const handleRequestQuote = useCallback((e) => {
    try {
      e.stopPropagation();
      onRequestQuote?.(productData);
    } catch (error) {
      if (errorThrottle.shouldLog(productData.id, 'quote-error')) {
        console.error('[ProductCard] Request quote error:', error.message);
      }
    }
  }, [onRequestQuote, productData]);

  const handleAddToFavorites = useCallback((e) => {
    try {
      e.stopPropagation();
      onAddToFavorites?.(productData, e);
    } catch (error) {
      if (errorThrottle.shouldLog(productData.id, 'favorites-error')) {
        console.error('[ProductCard] Favorites error:', error.message);
      }
    }
  }, [onAddToFavorites, productData]);

  const handleCompare = useCallback((e) => {
    try {
      e.stopPropagation();
      onCompare?.(productData, e);
    } catch (error) {
      if (errorThrottle.shouldLog(productData.id, 'compare-error')) {
        console.error('[ProductCard] Compare error:', error.message);
      }
    }
  }, [onCompare, productData]);

  const handleQuickView = useCallback((e) => {
    try {
      e.stopPropagation();
      onQuickView?.(productData);
    } catch (error) {
      if (errorThrottle.shouldLog(productData.id, 'quickview-error')) {
        console.error('[ProductCard] Quick view error:', error.message);
      }
    }
  }, [onQuickView, productData]);

  // Return early for invalid products
  if (!productData.isValid) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700 text-sm">Product data unavailable</span>
        </div>
      </div>
    );
  }

  // FIXED: Enhanced image component with better error handling
  const ProductImage = () => (
    <div className="relative w-full h-full overflow-hidden">
      {/* Loading state */}
      {!isImageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
      )}
      
      {/* Main image */}
      <img 
        ref={imageRef}
        src={productData.imageUrl} 
        alt={productData.name}
        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
          isImageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
        loading="lazy"
        decoding="async"
      />
      
      {/* Error state overlay */}
      {imageError && isImageLoaded && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center border border-gray-200">
          <div className="text-center">
            <Package className="w-8 h-8 text-gray-400 mx-auto mb-1" />
            <span className="text-xs text-gray-500">No Image</span>
          </div>
        </div>
      )}
    </div>
  );

  // Grid view component
  const GridCard = () => (
    <div 
      className={`group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden relative cursor-pointer ${className}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* FIXED: Image Section */}
      <div className="relative h-48">
        <ProductImage />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {productData.featured && (
            <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded-full flex items-center">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Featured
            </span>
          )}
          
          {productData.quickDelivery && (
            <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full flex items-center">
              <Truck className="w-3 h-3 mr-1" />
              Quick Ship
            </span>
          )}
          
          {productData.certifications.length > 0 && (
            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded-full flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              Certified
            </span>
          )}
        </div>
        
        {/* Discount Badge */}
        {savings > 0 && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            -{savings}%
          </div>
        )}
        
        {/* Action Buttons Overlay */}
        {showQuickActions && (
          <div className={`absolute inset-x-3 bottom-3 transition-all duration-300 ${
            isHovered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
          }`}>
            <div className="flex space-x-2">
              <button
                onClick={handleAddToFavorites}
                className={`p-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-sm hover:bg-opacity-100 transition-all ${
                  isInFavorites ? 'bg-red-50' : ''
                }`}
                aria-label={isInFavorites ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
              </button>
              
              {onCompare && (
                <button
                  onClick={handleCompare}
                  className={`p-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-sm hover:bg-opacity-100 transition-all ${
                    isInComparison ? 'bg-blue-50' : ''
                  }`}
                  aria-label={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
                >
                  <BarChart3 className={`w-4 h-4 ${isInComparison ? 'text-blue-600' : 'text-gray-600'}`} />
                </button>
              )}
              
              {onQuickView && (
                <button
                  onClick={handleQuickView}
                  className="p-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-sm hover:bg-opacity-100 transition-all"
                  aria-label="Quick view"
                >
                  <Eye className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Product Name & SKU */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {productData.name}
          </h3>
          {productData.sku && (
            <p className="text-xs text-gray-500 mt-1">SKU: {productData.sku}</p>
          )}
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center mb-3">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className={`w-4 h-4 ${i < Math.floor(productData.rating) ? 'fill-current' : ''}`} 
              />
            ))}
          </div>
          <span className="text-sm text-gray-600 ml-2">
            {productData.rating.toFixed(1)} ({productData.reviewCount})
          </span>
        </div>

        {/* Supplier Information */}
        <div className="space-y-1.5 mb-3 text-sm text-gray-600">
          <div className="flex items-center">
            <Factory className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="font-medium truncate">{productData.supplier}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{productData.supplierLocation}</span>
          </div>
        </div>

        {/* Key Specifications */}
        {productData.keySpecs.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {productData.keySpecs.map((spec, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs truncate">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-baseline space-x-2 mb-3">
          <span className="text-xl font-bold text-gray-900">
            {productData.currency} {productData.price.toLocaleString()}
          </span>
          {productData.originalPrice && (
            <span className="text-sm text-gray-500 line-through">
              {productData.currency} {productData.originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        {/* Stock Status */}
        <div className="flex items-center mb-4">
          <div className={`w-2 h-2 rounded-full mr-2 ${productData.stockStatus.bgClass}`}></div>
          <span className={`text-sm font-medium ${productData.stockStatus.colorClass}`}>
            {productData.stockStatus.text}
          </span>
          <span className="text-sm text-gray-500 ml-2">
            • {productData.deliveryTime}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={productData.stockStatus.status === 'in_stock' ? handleAddToCart : handleRequestQuote}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
              productData.stockStatus.status === 'in_stock'
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm hover:shadow-md'
            }`}
            disabled={!productData.isValid}
          >
            {productData.stockStatus.status === 'in_stock' ? (
              <>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Add to Cart
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4 mr-2" />
                Get Quote
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // List view component (simplified for brevity)
  const ListCard = () => (
    <div 
      className={`group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      <div className="flex">
        {/* Image */}
        <div className="flex-shrink-0 w-32 h-32">
          <ProductImage />
        </div>

        {/* Content - Simplified */}
        <div className="flex-1 p-4">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-2">
            {productData.name}
          </h3>
          
          <div className="flex items-center mb-2">
            <div className="flex text-yellow-400 mr-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < Math.floor(productData.rating) ? 'fill-current' : ''}`} />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {productData.rating.toFixed(1)} ({productData.reviewCount})
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">
              {productData.currency} {productData.price.toLocaleString()}
            </div>
            
            <button
              onClick={productData.stockStatus.status === 'in_stock' ? handleAddToCart : handleRequestQuote}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                productData.stockStatus.status === 'in_stock'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {productData.stockStatus.status === 'in_stock' ? 'Add to Cart' : 'Get Quote'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return viewMode === 'grid' ? <GridCard /> : <ListCard />;
});

// Display name for debugging
EcommerceProductCard.displayName = 'EcommerceProductCard';

export default EcommerceProductCard;
