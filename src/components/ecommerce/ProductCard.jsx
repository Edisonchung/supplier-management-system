// src/components/ecommerce/ProductCard.jsx
// Enhanced E-commerce Product Card with improved error handling and performance

import React, { useState, useCallback, useMemo, memo } from 'react';
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
  viewMode = 'grid', // 'grid' or 'list'
  showQuickActions = true,
  className = ''
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Memoized product data processing for performance
  const productData = useMemo(() => {
    if (!product || typeof product !== 'object') {
      console.warn('Invalid product data received:', product);
      return getDefaultProductData();
    }

    try {
      return processProductData(product);
    } catch (error) {
      console.error('Error processing product data:', error, product);
      return getDefaultProductData();
    }
  }, [product]);

  // Helper function for default product data
  function getDefaultProductData() {
    return {
      id: 'unknown',
      name: 'Product Unavailable',
      sku: 'N/A',
      brand: 'Unknown',
      category: 'General',
      price: 0,
      originalPrice: null,
      currency: 'RM',
      visibility: 'public',
      availability: 'out_of_stock',
      featured: false,
      supplier: 'HiggsFlow Partner',
      supplierLocation: 'Malaysia',
      stock: 0,
      stockStatus: { status: 'out_of_stock', text: 'Unavailable', colorClass: 'text-gray-600', bgClass: 'bg-gray-500' },
      deliveryTime: 'Contact for availability',
      quickDelivery: false,
      specifications: {},
      keySpecs: [],
      applications: [],
      certifications: [],
      rating: 0,
      reviewCount: 0,
      imageUrl: '/api/placeholder/300/200',
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

  // Enhanced product data processing with comprehensive error handling
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
          stockData.inventory,
          stockData.count,
          stockData.units,
          stockData.qty
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
          if (typeof value === 'boolean' && stockData.hasOwnProperty('inStock')) {
            return value ? 1 : 0;
          }
        }
        
        if (stockData.total || stockData.sum) {
          const total = parseFloat(stockData.total || stockData.sum);
          if (!isNaN(total) && total >= 0) return Math.floor(total);
        }
        
        const numericProps = Object.values(stockData).filter(val => 
          typeof val === 'number' && !isNaN(val) && val >= 0 && val < 10000
        );
        if (numericProps.length > 0) {
          return Math.floor(Math.max(...numericProps));
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
            let specValue;
            if (typeof value === 'object') {
              specValue = JSON.stringify(value);
            } else {
              specValue = String(value);
              if (key === 'voltage' && !specValue.includes('V')) specValue += 'V';
              if (key === 'power' && !specValue.includes('W')) specValue += 'W';
            }
            
            if (specValue && specValue !== 'undefined' && specValue !== 'null' && specValue.length > 0) {
              keySpecs.push(specValue.length > 20 ? specValue.substring(0, 20) + '...' : specValue);
            }
          } catch (e) {
            console.warn('Error processing spec:', key, value, e);
          }
        }
      });
      
      return keySpecs.slice(0, 3);
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
      
      imageUrl: String(safeGet(product, 'image') || safeGet(product, 'images.primary') || 
                safeGet(product, 'imageUrl', '/api/placeholder/300/200')),
      
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

  // Enhanced event handlers with error boundaries
  const handleCardClick = useCallback((e) => {
    try {
      if (e.target.closest('button')) return;
      onClick?.(productData);
    } catch (error) {
      console.error('Error in handleCardClick:', error);
    }
  }, [onClick, productData]);

  const handleAddToCart = useCallback((e) => {
    try {
      e.stopPropagation();
      onAddToCart?.(productData);
    } catch (error) {
      console.error('Error in handleAddToCart:', error);
    }
  }, [onAddToCart, productData]);

  const handleRequestQuote = useCallback((e) => {
    try {
      e.stopPropagation();
      onRequestQuote?.(productData);
    } catch (error) {
      console.error('Error in handleRequestQuote:', error);
    }
  }, [onRequestQuote, productData]);

  const handleAddToFavorites = useCallback((e) => {
    try {
      e.stopPropagation();
      onAddToFavorites?.(productData, e);
    } catch (error) {
      console.error('Error in handleAddToFavorites:', error);
    }
  }, [onAddToFavorites, productData]);

  const handleCompare = useCallback((e) => {
    try {
      e.stopPropagation();
      onCompare?.(productData, e);
    } catch (error) {
      console.error('Error in handleCompare:', error);
    }
  }, [onCompare, productData]);

  const handleQuickView = useCallback((e) => {
    try {
      e.stopPropagation();
      onQuickView?.(productData);
    } catch (error) {
      console.error('Error in handleQuickView:', error);
    }
  }, [onQuickView, productData]);

  // Enhanced image loading handlers
  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
    setImageError(false);
  }, []);

  const handleImageError = useCallback((e) => {
    console.warn('Image load failed for product:', productData.id, productData.imageUrl);
    setImageError(true);
    setIsImageLoaded(true);
    if (e.target) {
      e.target.src = '/api/placeholder/300/200';
    }
  }, [productData.id, productData.imageUrl]);

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

  // Grid view component
  const GridCard = () => (
    <div 
      className={`group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden relative cursor-pointer ${className}`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative">
        <div className="w-full h-48 bg-gray-100 overflow-hidden">
          {!isImageLoaded && (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
          )}
          <img 
            src={productData.imageUrl} 
            alt={productData.name}
            className={`w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 ${
              isImageLoaded ? 'block' : 'hidden'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          {imageError && isImageLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <span className="text-xs text-gray-500">Image unavailable</span>
              </div>
            </div>
          )}
        </div>
        
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
          {productData.viewCount > 0 && (
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>{productData.viewCount} views</span>
            </div>
          )}
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
          {process.env.NODE_ENV === 'development' && (
            <span className="text-xs text-gray-400 ml-2">
              (Stock: {productData.stock})
            </span>
          )}
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

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && productData.syncStatus && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-500">
            <div>Sync: {productData.syncStatus}</div>
            <div>Source: {productData.dataSource}</div>
            {productData.lastSyncedAt && (
              <div>Last sync: {new Date(productData.lastSyncedAt?.seconds * 1000).toLocaleString()}</div>
            )}
            <div>Raw stock type: {typeof product.stock}</div>
            {typeof product.stock === 'object' && (
              <div>Stock keys: {Object.keys(product.stock || {}).join(', ')}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // List view component
  const ListCard = () => (
    <div 
      className={`group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer ${className}`}
      onClick={handleCardClick}
    >
      <div className="flex">
        {/* Image */}
        <div className="flex-shrink-0 w-32 h-32 bg-gray-100 relative overflow-hidden">
          <img 
            src={productData.imageUrl} 
            alt={productData.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {productData.featured && (
              <span className="px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded flex items-center">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Featured
              </span>
            )}
            
            {savings > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                -{savings}%
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex justify-between">
            <div className="flex-1 pr-4">
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 mb-2 line-clamp-2">
                {productData.name}
              </h3>
              
              {productData.sku && (
                <p className="text-xs text-gray-500 mb-2">SKU: {productData.sku}</p>
              )}
              
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
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                <span className="flex items-center">
                  <Factory className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{productData.supplier}</span>
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{productData.supplierLocation}</span>
                </span>
              </div>
              
              {/* Stock Status */}
              <div className="flex items-center mb-2">
                <div className={`w-2 h-2 rounded-full mr-2 ${productData.stockStatus.bgClass}`}></div>
                <span className={`text-sm font-medium ${productData.stockStatus.colorClass}`}>
                  {productData.stockStatus.text}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  • {productData.deliveryTime}
                </span>
              </div>
              
              {productData.keySpecs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {productData.keySpecs.slice(0, 3).map((spec, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {spec.length > 15 ? spec.substring(0, 15) + '...' : spec}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price and Actions */}
            <div className="flex flex-col items-end justify-between">
              <div className="text-right mb-3">
                <div className="text-xl font-bold text-gray-900">
                  {productData.currency} {productData.price.toLocaleString()}
                </div>
                {productData.originalPrice && (
                  <div className="text-sm text-gray-500 line-through">
                    {productData.currency} {productData.originalPrice.toLocaleString()}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={handleAddToFavorites}
                  className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                    isInFavorites ? 'bg-red-50 border-red-300' : ''
                  }`}
                  aria-label={isInFavorites ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
                
                {onCompare && (
                  <button
                    onClick={handleCompare}
                    className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                      isInComparison ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    aria-label={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
                  >
                    <BarChart3 className={`w-4 h-4 ${isInComparison ? 'text-blue-600' : 'text-gray-600'}`} />
                  </button>
                )}
                
                <button
                  onClick={productData.stockStatus.status === 'in_stock' ? handleAddToCart : handleRequestQuote}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    productData.stockStatus.status === 'in_stock'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                  disabled={!productData.isValid}
                >
                  {productData.stockStatus.status === 'in_stock' ? 'Add to Cart' : 'Get Quote'}
                </button>
              </div>
            </div>
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
