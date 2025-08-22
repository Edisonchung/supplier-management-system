// src/components/ecommerce/ProductCard.jsx
// E-commerce Product Card that works with your SmartProductSyncDashboard data

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
  ExternalLink
} from 'lucide-react';

const EcommerceProductCard = ({ 
  product, 
  onAddToCart, 
  onRequestQuote, 
  onAddToFavorites, 
  onCompare,
  onQuickView,
  isInFavorites = false,
  isInComparison = false,
  viewMode = 'grid' // 'grid' or 'list'
}) => {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Parse product data from your SmartProductSyncDashboard format
  const productData = {
    // Core product info (from your sync dashboard)
    id: product.id,
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    category: product.category,
    
    // Pricing (handled by your dashboard's pricing logic)
    price: product.displayPrice || product.customerPrice || product.price,
    originalPrice: product.originalPrice || product.price,
    currency: product.currency || 'RM',
    
    // E-commerce specific fields (from products_public collection)
    visibility: product.visibility || 'public',
    availability: product.availability || 'in_stock',
    featured: product.featured || false,
    
    // Supplier info (transformed for customer view)
    supplier: product.supplier || 'HiggsFlow Partner',
    supplierLocation: product.supplierLocation || product.location || 'Malaysia',
    
    // Stock and delivery (transformed from internal data)
    stockStatus: getStockStatus(product),
    deliveryTime: getDeliveryTime(product),
    quickDelivery: product.stock > 10,
    
    // Customer-facing specifications
    specifications: product.specifications || {},
    keySpecs: extractKeySpecs(product),
    applications: product.applications || [],
    certifications: product.certifications || [],
    
    // Social proof and ratings
    rating: product.customerRating || product.rating || 4.5,
    reviewCount: product.reviewCount || Math.floor(Math.random() * 50) + 5,
    
    // E-commerce metadata
    imageUrl: product.imageUrl || product.image || '/api/placeholder/300/200',
    tags: product.tags || [],
    industries: product.industries || [],
    
    // Sync status for internal tracking (hidden from customers)
    syncStatus: product.syncStatus,
    lastSyncedAt: product.lastSyncedAt,
    internalProductId: product.internalProductId,
    dataSource: product.dataSource
  };

  // Helper functions to transform internal data for customer view
  function getStockStatus(product) {
    if (product.availability === 'out_of_stock' || product.stock === 0) {
      return { status: 'out_of_stock', text: 'Made to Order', color: 'orange' };
    }
    if (product.stock && product.stock < 5) {
      return { status: 'low_stock', text: 'Limited Stock', color: 'yellow' };
    }
    return { status: 'in_stock', text: 'In Stock', color: 'green' };
  }

  function getDeliveryTime(product) {
    if (product.stock > 10) return '1-2 days';
    if (product.stock > 0) return '3-5 days';
    return '2-3 weeks';
  }

  function extractKeySpecs(product) {
    // Extract 2-3 most important specs for the card display
    const specs = product.specifications || {};
    const keySpecs = [];
    
    if (specs.model) keySpecs.push(specs.model);
    if (specs.voltage) keySpecs.push(`${specs.voltage}V`);
    if (specs.power) keySpecs.push(`${specs.power}W`);
    if (specs.material) keySpecs.push(specs.material);
    
    return keySpecs.slice(0, 3);
  }

  // Calculate savings percentage
  const savings = productData.originalPrice && productData.originalPrice > productData.price ? 
    Math.round(((productData.originalPrice - productData.price) / productData.originalPrice) * 100) : 0;

  // Industry badge color
  const getIndustryColor = (industry) => {
    const colors = {
      'Manufacturing': 'bg-blue-100 text-blue-800',
      'Electronics': 'bg-purple-100 text-purple-800',
      'Automotive': 'bg-green-100 text-green-800',
      'Food Processing': 'bg-yellow-100 text-yellow-800',
      'Chemicals': 'bg-red-100 text-red-800'
    };
    return colors[industry] || 'bg-gray-100 text-gray-800';
  };

  // Grid view component
  const GridCard = () => (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 overflow-hidden relative">
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
            onError={() => setIsImageLoaded(true)}
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
        
        {/* Favorite Button */}
        <button
          onClick={() => onAddToFavorites?.(productData)}
          className="absolute bottom-3 right-3 p-2 bg-white bg-opacity-90 rounded-full shadow-sm hover:bg-opacity-100 transition-all"
        >
          <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
        </button>
      </div>

      {/* Content Section */}
      <div className="p-4">
        {/* Product Name & Brand */}
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer">
            {productData.name}
          </h3>
          {productData.brand && (
            <p className="text-sm text-gray-600 mt-1">{productData.brand}</p>
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
            {productData.rating.toFixed(1)} ({productData.reviewCount} reviews)
          </span>
        </div>

        {/* Industrial Information */}
        <div className="space-y-1.5 mb-3 text-sm text-gray-600">
          <div className="flex items-center">
            <Factory className="w-4 h-4 mr-2 text-gray-400" />
            <span className="font-medium">{productData.supplier}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
            <span>{productData.supplierLocation}</span>
          </div>
          {productData.industries.length > 0 && (
            <div className="flex items-center">
              <Award className="w-4 h-4 mr-2 text-gray-400" />
              <span>For {productData.industries[0]}</span>
            </div>
          )}
        </div>

        {/* Key Specifications */}
        {productData.keySpecs.length > 0 && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {productData.keySpecs.map((spec, index) => (
                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-baseline space-x-2 mb-3">
          <span className="text-xl font-bold text-gray-900">
            {productData.currency} {typeof productData.price === 'number' ? 
              productData.price.toLocaleString() : productData.price}
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
          <div className={`w-2 h-2 rounded-full mr-2 bg-${productData.stockStatus.color}-500`}></div>
          <span className={`text-sm font-medium text-${productData.stockStatus.color}-600`}>
            {productData.stockStatus.text}
          </span>
          <span className="text-sm text-gray-500 ml-2">
            • {productData.deliveryTime}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => productData.stockStatus.status === 'in_stock' ? 
              onAddToCart?.(productData) : onRequestQuote?.(productData)}
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
                Request Quote
              </>
            )}
          </button>
          
          <button
            onClick={() => onCompare?.(productData)}
            className={`px-3 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${
              isInComparison ? 'bg-blue-50 border-blue-300' : ''
            }`}
            title="Compare"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {/* Quick View */}
        <button
          onClick={() => onQuickView?.(productData)}
          className="w-full mt-2 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center"
        >
          <Info className="w-4 h-4 mr-1" />
          Quick View Details
        </button>

        {/* Debug Info (only in development) */}
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

  // List view component (simplified for space)
  const ListCard = () => (
    <div className="group bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-200 transition-all duration-300 overflow-hidden">
      <div className="flex">
        {/* Image */}
        <div className="flex-shrink-0 w-32 h-32 bg-gray-100 relative">
          <img 
            src={productData.imageUrl} 
            alt={productData.name}
            className="w-full h-full object-cover"
          />
          {productData.featured && (
            <span className="absolute top-2 left-2 px-2 py-1 bg-yellow-600 text-white text-xs font-medium rounded flex items-center">
              <Star className="w-3 h-3 mr-1 fill-current" />
              Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex justify-between">
            <div className="flex-1">
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
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                <span className="flex items-center">
                  <Factory className="w-4 h-4 mr-1" />
                  {productData.supplier}
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {productData.supplierLocation}
                </span>
              </div>
              
              {productData.keySpecs.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {productData.keySpecs.slice(0, 3).map((spec, index) => (
                    <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                      {spec}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Price and Actions */}
            <div className="flex flex-col items-end justify-between ml-4">
              <div className="text-right mb-2">
                <div className="text-xl font-bold text-gray-900">
                  {productData.currency} {typeof productData.price === 'number' ? 
                    productData.price.toLocaleString() : productData.price}
                </div>
                {productData.originalPrice && productData.originalPrice > productData.price && (
                  <div className="text-sm text-gray-500 line-through">
                    {productData.currency} {typeof productData.originalPrice === 'number' ? 
                      productData.originalPrice.toLocaleString() : productData.originalPrice}
                  </div>
                )}
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => onAddToFavorites?.(productData)}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                </button>
                
                <button
                  onClick={() => onCompare?.(productData)}
                  className={`p-2 border border-gray-300 rounded-lg hover:bg-gray-50 ${
                    isInComparison ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => productData.stockStatus.status === 'in_stock' ? 
                    onAddToCart?.(productData) : onRequestQuote?.(productData)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
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
