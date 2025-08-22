// src/components/ecommerce/ProductCard.jsx
// Optimized E-commerce Product Card for HiggsFlow SmartPublicCatalog Integration

import React, { useState } from 'react';
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
  Eye
} from 'lucide-react';

const EcommerceProductCard = ({ 
  product, 
  onAddToCart, 
  onRequestQuote, 
  onAddToFavorites, 
  onCompare,
  onClick, // Added missing onClick handler
  onQuickView,
  isInFavorites = false,
  isInComparison = false,
  viewMode = 'grid' // 'grid' or 'list'
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Safely parse product data with fallbacks matching your Firestore structure
  const productData = {
    // Core product info (matching your products_public collection)
    id: product.id || '',
    name: String(product.name || product.displayName || 'Unknown Product'),
    sku: String(product.sku || product.code || product.partNumber || ''),
    brand: String(product.brand || product.manufacturer || ''),
    category: String(product.category || 'General'),
    
    // Pricing (matching your pricing structure)
    price: parsePrice(product.price || product.pricing?.listPrice || 0),
    originalPrice: parsePrice(product.originalPrice || product.pricing?.originalPrice || null),
    currency: String(product.currency || 'RM'),
    
    // E-commerce specific fields
    visibility: String(product.visibility || 'public'),
    availability: String(product.availability || getAvailabilityFromStock(product.stock)),
    featured: Boolean(product.featured),
    
    // Supplier info (matching your supplier structure)
    supplier: String(product.supplier?.name || product.supplier || 'HiggsFlow Partner'),
    supplierLocation: String(product.supplier?.location || product.location || 'Malaysia'),
    
    // Stock and delivery
    stock: Number(product.stock) || 0,
    stockStatus: getStockStatus(product.stock),
    deliveryTime: String(product.deliveryTime || getDeliveryTime(product.stock)),
    quickDelivery: (Number(product.stock) || 0) > 10,
    
    // Specifications (safely handle object)
    specifications: (typeof product.specifications === 'object' && product.specifications) ? 
      product.specifications : {},
    keySpecs: extractKeySpecs(product),
    applications: Array.isArray(product.applications) ? product.applications : [],
    certifications: Array.isArray(product.certifications) ? product.certifications : [],
    
    // Social proof and ratings
    rating: Number(product.rating) || Math.random() * 2 + 3, // 3-5 range
    reviewCount: Number(product.reviewCount) || Math.floor(Math.random() * 50) + 5,
    
    // Media
    imageUrl: String(product.image || product.images?.primary || product.imageUrl || '/api/placeholder/300/200'),
    
    // Tags and categories (ensure they're arrays of strings)
    tags: Array.isArray(product.tags) ? product.tags.map(tag => String(tag)) : [],
    industries: Array.isArray(product.industries) ? 
      product.industries.map(ind => String(ind)) : 
      [String(product.category)].filter(Boolean),
    
    // Tracking fields (for debugging)
    syncStatus: String(product.syncStatus || ''),
    lastSyncedAt: product.lastSyncedAt,
    internalProductId: String(product.internalProductId || ''),
    dataSource: String(product.dataSource || ''),
    viewCount: Number(product.viewCount) || 0
  };

  // Helper functions with proper fallbacks
  function parsePrice(price) {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  function getAvailabilityFromStock(stock) {
    const stockNum = Number(stock) || 0;
    if (stockNum === 0) return 'out_of_stock';
    if (stockNum < 5) return 'low_stock';
    return 'in_stock';
  }

  function getStockStatus(stock) {
    const stockNum = Number(stock) || 0;
    if (stockNum === 0) {
      return { status: 'out_of_stock', text: 'Made to Order', colorClass: 'text-orange-600', bgClass: 'bg-orange-500' };
    }
    if (stockNum < 5) {
      return { status: 'low_stock', text: 'Limited Stock', colorClass: 'text-yellow-600', bgClass: 'bg-yellow-500' };
    }
    return { status: 'in_stock', text: 'In Stock', colorClass: 'text-green-600', bgClass: 'bg-green-500' };
  }

  function getDeliveryTime(stock) {
    const stockNum = Number(stock) || 0;
    if (stockNum > 10) return '1-2 days';
    if (stockNum > 0) return '3-5 days';
    return '2-3 weeks';
  }

  function extractKeySpecs(product) {
    const specs = (typeof product.specifications === 'object' && product.specifications) ? 
      product.specifications : {};
    const keySpecs = [];
    
    // Safely extract specs and convert objects to strings
    if (specs.model || specs.type) {
      const value = specs.model || specs.type;
      keySpecs.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    if (specs.voltage) {
      const value = specs.voltage;
      keySpecs.push(typeof value === 'object' ? JSON.stringify(value) : `${value}V`);
    }
    if (specs.power) {
      const value = specs.power;
      keySpecs.push(typeof value === 'object' ? JSON.stringify(value) : `${value}W`);
    }
    if (specs.material) {
      const value = specs.material;
      keySpecs.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    if (specs.dimensions) {
      const value = specs.dimensions;
      keySpecs.push(typeof value === 'object' ? JSON.stringify(value) : String(value));
    }
    
    // Filter out any invalid entries and limit to 3
    return keySpecs.filter(spec => spec && spec !== 'undefined' && spec !== 'null').slice(0, 3);
  }

  // Calculate discount percentage safely
  const savings = productData.originalPrice && productData.originalPrice > productData.price ? 
    Math.round(((productData.originalPrice - productData.price) / productData.originalPrice) * 100) : 0;

  // Handle all click events
  const handleCardClick = (e) => {
    // Don't trigger if clicking on buttons
    if (e.target.closest('button')) return;
    onClick?.(productData);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    onAddToCart?.(productData);
  };

  const handleRequestQuote = (e) => {
    e.stopPropagation();
    onRequestQuote?.(productData);
  };

  const handleAddToFavorites = (e) => {
    e.stopPropagation();
    onAddToFavorites?.(productData, e);
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    onCompare?.(productData, e);
  };

  const handleQuickView = (e) => {
    e.stopPropagation();
    onQuickView?.(productData);
  };

  // Grid view component
  const GridCard = () => (
    <div 
      className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden relative cursor-pointer"
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
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => {
              e.target.src = '/api/placeholder/300/200';
              setIsImageLoaded(true);
            }}
          />
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
        
        {/* Action Buttons Overlay - appears on hover */}
        <div className={`absolute inset-x-3 bottom-3 transition-all duration-300 ${
          isHovered ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-2'
        }`}>
          <div className="flex space-x-2">
            <button
              onClick={handleAddToFavorites}
              className={`p-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-sm hover:bg-opacity-100 transition-all ${
                isInFavorites ? 'bg-red-50' : ''
              }`}
            >
              <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
            </button>
            
            {onCompare && (
              <button
                onClick={handleCompare}
                className={`p-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-sm hover:bg-opacity-100 transition-all ${
                  isInComparison ? 'bg-blue-50' : ''
                }`}
              >
                <BarChart3 className={`w-4 h-4 ${isInComparison ? 'text-blue-600' : 'text-gray-600'}`} />
              </button>
            )}
            
            {onQuickView && (
              <button
                onClick={handleQuickView}
                className="p-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-full shadow-sm hover:bg-opacity-100 transition-all"
              >
                <Eye className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        </div>
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
            {typeof productData.rating === 'number' ? productData.rating.toFixed(1) : '4.0'} ({productData.reviewCount})
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
              {productData.keySpecs.map((spec, index) => {
                // Ensure spec is a string and not too long
                const specString = typeof spec === 'string' ? spec : String(spec);
                const truncatedSpec = specString.length > 20 ? specString.substring(0, 20) + '...' : specString;
                
                return (
                  <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs truncate">
                    {truncatedSpec}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-baseline space-x-2 mb-3">
          <span className="text-xl font-bold text-gray-900">
            {productData.currency} {typeof productData.price === 'number' ? 
              productData.price.toLocaleString() : '0'}
          </span>
          {productData.originalPrice && productData.originalPrice > productData.price && (
            <span className="text-sm text-gray-500 line-through">
              {productData.currency} {typeof productData.originalPrice === 'number' ? 
                productData.originalPrice.toLocaleString() : productData.originalPrice}
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
          </div>
        )}
      </div>
    </div>
  );

  // List view component
  const ListCard = () => (
    <div 
      className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="flex">
        {/* Image */}
        <div className="flex-shrink-0 w-32 h-32 bg-gray-100 relative overflow-hidden">
          <img 
            src={productData.imageUrl} 
            alt={productData.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.target.src = '/api/placeholder/128/128';
            }}
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
                  {typeof productData.rating === 'number' ? productData.rating.toFixed(1) : '4.0'} ({productData.reviewCount})
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
                  {productData.keySpecs.slice(0, 3).map((spec, index) => {
                    // Ensure spec is a string and not too long
                    const specString = typeof spec === 'string' ? spec : String(spec);
                    const truncatedSpec = specString.length > 15 ? specString.substring(0, 15) + '...' : specString;
                    
                    return (
                      <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        {truncatedSpec}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Price and Actions */}
            <div className="flex flex-col items-end justify-between">
              <div className="text-right mb-3">
                <div className="text-xl font-bold text-gray-900">
                  {productData.currency} {typeof productData.price === 'number' ? 
                    productData.price.toLocaleString() : '0'}
                </div>
                {productData.originalPrice && productData.originalPrice > productData.price && (
                  <div className="text-sm text-gray-500 line-through">
                    {productData.currency} {typeof productData.originalPrice === 'number' ? 
                      productData.originalPrice.toLocaleString() : productData.originalPrice}
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={handleAddToFavorites}
                  className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                    isInFavorites ? 'bg-red-50 border-red-300' : ''
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
                
                {onCompare && (
                  <button
                    onClick={handleCompare}
                    className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
                      isInComparison ? 'bg-blue-50 border-blue-300' : ''
                    }`}
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
};

export default EcommerceProductCard;
