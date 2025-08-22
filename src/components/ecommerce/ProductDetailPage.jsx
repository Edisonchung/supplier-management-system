// Updated Product Detail Page Component - Integrated with EcommerceDataService
// File: src/components/ecommerce/ProductDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Star,
  Heart,
  ShoppingCart,
  Plus,
  Minus,
  Building2,
  MapPin,
  Clock,
  Truck,
  Shield,
  CheckCircle,
  AlertCircle,
  Share2,
  Eye,
  Phone,
  Mail,
  MessageSquare,
  Calculator,
  Download,
  ExternalLink,
  TrendingUp,
  Award,
  Zap,
  Package,
  Tag
} from 'lucide-react';

// Updated imports to use new services
import EcommerceDataService from '../../services/ecommerceDataService';
import { db } from '../../config/firebase';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showContactSupplier, setShowContactSupplier] = useState(false);

  // Session management
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('higgsflow_session_id');
    return stored || 'guest_' + Date.now();
  });

  // Load product data using new EcommerceDataService
  useEffect(() => {
    if (productId) {
      loadProductData();
    }
  }, [productId]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load product details using EcommerceDataService
      const productData = await EcommerceDataService.getProductById(productId);
      setProduct(productData);
      
      // Set initial quantity to minimum order quantity
      setSelectedQuantity(productData.minOrderQty || 1);

      // Load related products from same category
      if (productData.category) {
        const relatedData = await EcommerceDataService.getPublicProducts({
          category: productData.category,
          pageSize: 4
        });
        
        // Filter out current product from related products
        const filtered = relatedData.products.filter(p => p.id !== productId);
        setRelatedProducts(filtered.slice(0, 4));
      }

      // Track product view (if analytics service is available)
      try {
        // You can integrate analytics tracking here if needed
        console.log('Product viewed:', productData.name);
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError);
      }

    } catch (err) {
      console.error('Error loading product:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async () => {
    try {
      // Get existing cart from localStorage
      const existingCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
      
      // Check if product already exists in cart
      const existingItemIndex = existingCart.findIndex(item => item.id === product.id);
      
      if (existingItemIndex >= 0) {
        // Update quantity
        existingCart[existingItemIndex].quantity += selectedQuantity;
      } else {
        // Add new item
        existingCart.push({
          id: product.id,
          name: product.name || product.displayName,
          price: product.price || product.customerPrice || product.displayPrice,
          quantity: selectedQuantity,
          image: product.imageUrl || product.image,
          supplier: product.supplier,
          category: product.category
        });
      }
      
      // Save updated cart
      localStorage.setItem('guest_cart', JSON.stringify(existingCart));
      
      // Update cart count in header (trigger custom event)
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      
      showNotification(`${product.name || product.displayName} added to cart`, 'success');
    } catch (error) {
      console.error('Error adding to cart:', error);
      showNotification('Failed to add item to cart', 'error');
    }
  };

  const requestQuote = () => {
    // Navigate to quote request with pre-filled product data
    navigate('/quote/request', {
      state: {
        products: [{
          ...product,
          quantity: selectedQuantity
        }]
      }
    });
  };

  const contactSupplier = () => {
    setShowContactSupplier(true);
  };

  const calculateBestPrice = (quantity = selectedQuantity) => {
    // Use the price from your ProductSyncService transformation
    let basePrice = product.price || product.customerPrice || product.displayPrice || 0;
    let discount = 0;
    
    // Check for bulk pricing if available
    if (product.bulkPricing && Array.isArray(product.bulkPricing)) {
      for (const tier of product.bulkPricing) {
        if (quantity >= tier.minQty) {
          basePrice = tier.price;
          discount = tier.discount || 0;
        }
      }
    }

    return { price: basePrice, discount };
  };

  const calculateTotal = () => {
    const { price } = calculateBestPrice();
    return price * selectedQuantity;
  };

  const getSavings = () => {
    const originalPrice = product.originalPrice || product.price || 0;
    const { price } = calculateBestPrice();
    return Math.max(0, (originalPrice - price) * selectedQuantity);
  };

  const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
      type === 'success' ? 'bg-green-500 text-white' : 
      type === 'error' ? 'bg-red-500 text-white' : 
      'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const shareProduct = async () => {
    try {
      await navigator.share({
        title: product.name || product.displayName,
        text: product.description || product.customerDescription,
        url: window.location.href
      });
    } catch (error) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      showNotification('Product link copied to clipboard', 'success');
    }
  };

  // Get product images from the synced data structure
  const getProductImages = () => {
    if (!product) return [];
    
    const images = [];
    
    // Check different possible image fields from your sync service
    if (product.imageUrl) images.push(product.imageUrl);
    if (product.image) images.push(product.image);
    if (product.images) {
      if (typeof product.images === 'string') {
        images.push(product.images);
      } else if (Array.isArray(product.images)) {
        images.push(...product.images);
      } else if (typeof product.images === 'object') {
        if (product.images.primary) images.push(product.images.primary);
        if (product.images.gallery) images.push(...product.images.gallery);
        if (product.images.technical) images.push(product.images.technical);
      }
    }
    
    // Remove duplicates and empty values
    return [...new Set(images.filter(Boolean))];
  };

  const images = getProductImages();

  // Get stock status based on your ProductSyncService data structure
  const getStockStatus = () => {
    if (!product) return { status: 'Unknown', color: 'gray', inStock: false };
    
    // Check availability from your sync service
    if (product.availability === 'in_stock' || product.stock > 0) {
      return { 
        status: product.stock > 10 ? 'In Stock' : 'Limited Stock', 
        color: 'green', 
        inStock: true 
      };
    }
    
    if (product.availability === 'out_of_stock' || product.stock === 0) {
      return { status: 'Made to Order', color: 'orange', inStock: false };
    }
    
    return { status: 'Contact for Availability', color: 'gray', inStock: false };
  };

  const stockStatus = getStockStatus();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-96 bg-gray-200 rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The product you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={shareProduct}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/cart')}
                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <button onClick={() => navigate('/')} className="hover:text-blue-600">
              Home
            </button>
            <span>/</span>
            <button 
              onClick={() => navigate(`/?category=${encodeURIComponent(product.category)}`)}
              className="hover:text-blue-600"
            >
              {product.category}
            </button>
            <span>/</span>
            <span className="text-gray-900">{product.name || product.displayName}</span>
          </div>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div>
            <div className="mb-4">
              <img
                src={images[selectedImage] || '/api/placeholder/600/600'}
                alt={product.name || product.displayName}
                className="w-full h-96 object-cover rounded-lg shadow-md bg-gray-100"
              />
            </div>
            
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                      selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`View ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Product Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              {product.featured && (
                <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-sm px-3 py-1 rounded-full">
                  <Award className="w-4 h-4" />
                  Featured Product
                </span>
              )}
              {product.badge && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                  {product.badge}
                </span>
              )}
              {product.certifications && product.certifications.length > 0 && (
                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full">
                  <Shield className="w-4 h-4" />
                  Certified
                </span>
              )}
              {stockStatus.inStock && (
                <span className="flex items-center gap-1 bg-green-100 text-green-700 text-sm px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4" />
                  {stockStatus.status}
                </span>
              )}
            </div>
          </div>

          {/* Product Information */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {product.name || product.displayName}
            </h1>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-lg text-gray-600">{product.category}</span>
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-medium">{product.rating || product.customerRating || 4.5}</span>
                <span className="text-gray-500">({product.reviewCount || Math.floor(Math.random() * 50) + 10} reviews)</span>
              </div>
            </div>

            <p className="text-gray-700 mb-6 leading-relaxed">
              {product.description || product.customerDescription || product.fullDescription || 'Professional industrial component suitable for various applications.'}
            </p>

            {/* Supplier Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.supplier || 'HiggsFlow Partner'}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{product.location || product.supplierLocation || 'Malaysia'}</span>
                      <span>•</span>
                      <Clock className="w-4 h-4" />
                      <span>Response: 24h</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={contactSupplier}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Contact
                </button>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl font-bold text-blue-600">
                  RM {calculateBestPrice().price.toLocaleString()}
                </span>
                {product.originalPrice && product.originalPrice > calculateBestPrice().price && (
                  <span className="text-xl text-gray-500 line-through">
                    RM {product.originalPrice.toLocaleString()}
                  </span>
                )}
                {calculateBestPrice().discount > 0 && (
                  <span className="bg-red-100 text-red-700 text-sm px-2 py-1 rounded">
                    -{calculateBestPrice().discount}% bulk discount
                  </span>
                )}
              </div>
              
              {product.bulkPricing && product.bulkPricing.length > 0 && (
                <div className="text-sm text-purple-600 mb-4">
                  <p className="font-medium mb-2">Volume Discounts Available:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {product.bulkPricing.map((tier, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded border ${
                          selectedQuantity >= tier.minQty 
                            ? 'border-purple-300 bg-purple-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="font-medium">{tier.minQty}+ units</div>
                        <div className="text-lg font-bold text-purple-700">
                          RM {tier.price.toLocaleString()}
                        </div>
                        <div className="text-xs">Save {tier.discount}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quantity and Actions */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity (Min: {product.minOrderQty || 1})
                  </label>
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setSelectedQuantity(Math.max(product.minOrderQty || 1, selectedQuantity - 1))}
                      className="p-2 hover:bg-gray-100 rounded-l-lg"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Math.max(product.minOrderQty || 1, parseInt(e.target.value) || 1))}
                      className="w-24 px-3 py-2 text-center border-0 focus:ring-0"
                      min={product.minOrderQty || 1}
                    />
                    <button
                      onClick={() => setSelectedQuantity(selectedQuantity + 1)}
                      className="p-2 hover:bg-gray-100 rounded-r-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-1">Total Price</div>
                  <div className="text-2xl font-bold text-green-600">
                    RM {calculateTotal().toLocaleString()}
                  </div>
                  {getSavings() > 0 && (
                    <div className="text-sm text-green-600">
                      Save RM {getSavings().toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full bg-${stockStatus.color}-500`}></div>
                <span className="text-sm font-medium text-gray-700">{stockStatus.status}</span>
                <span className="text-sm text-gray-500">•</span>
                <Truck className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-500">Ships in {product.leadTime || '3-5 days'}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mb-4">
                <button
                  onClick={addToCart}
                  disabled={!stockStatus.inStock}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {stockStatus.inStock ? 'Add to Cart' : 'Request Quote'}
                </button>
                
                <button
                  onClick={requestQuote}
                  className="flex-1 border border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  <Calculator className="w-5 h-5" />
                  Request Quote
                </button>
                
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`p-3 rounded-lg border transition-colors ${
                    isWishlisted 
                      ? 'border-red-500 bg-red-50 text-red-600' 
                      : 'border-gray-300 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                </button>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Professional Grade</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  <span>Free shipping over RM 1,000</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>1 Year Warranty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>Technical Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-12">
          <div className="border-b mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'specifications', label: 'Specifications' },
                { id: 'applications', label: 'Applications' },
                { id: 'documentation', label: 'Documentation' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="min-h-[200px]">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Product Description</h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    {product.description || product.customerDescription || product.fullDescription || 'Professional industrial component designed for reliable performance in demanding applications.'}
                  </p>
                  
                  {product.keySpecs && product.keySpecs.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-3">Key Features:</h4>
                      <ul className="space-y-2">
                        {product.keySpecs.map((feature, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Quick Info</h3>
                  <dl className="space-y-3">
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Category:</dt>
                      <dd className="font-medium">{product.category}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Brand:</dt>
                      <dd className="font-medium">{product.brand || product.supplier}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Minimum Order:</dt>
                      <dd className="font-medium">{product.minOrderQty || 1} units</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Lead Time:</dt>
                      <dd className="font-medium">{product.leadTime || '3-5 days'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Origin:</dt>
                      <dd className="font-medium">{product.location || product.supplierLocation || 'Malaysia'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Technical Specifications</h3>
                {product.specifications && Object.keys(product.specifications).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="border-b border-gray-100 pb-3">
                        <dt className="text-sm font-medium text-gray-600 mb-1">{key}</dt>
                        <dd className="text-gray-900 font-medium">{value}</dd>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Detailed specifications will be provided upon request.</p>
                    <button
                      onClick={requestQuote}
                      className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Request Specifications
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'applications' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Applications & Use Cases</h3>
                {product.applications && product.applications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {product.applications.map((application, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="font-medium text-gray-900">{application}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>This product is suitable for various industrial applications.</p>
                    <p className="mt-2">Contact our technical team for specific use case guidance.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documentation' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Documentation & Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-6 h-6 text-blue-600" />
                      <span className="font-medium">Product Datasheet</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Technical specifications and dimensions</p>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <Download className="w-6 h-6 text-blue-600" />
                      <span className="font-medium">Installation Guide</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Step-by-step installation instructions</p>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <ExternalLink className="w-6 h-6 text-blue-600" />
                      <span className="font-medium">3D CAD Model</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">Download 3D model for design integration</p>
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                      <ExternalLink className="w-4 h-4" />
                      Download STEP
                    </button>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    <strong>Need additional documentation?</strong> Our technical team can provide custom drawings, 
                    compliance certificates, and integration support.
                  </p>
                  <button
                    onClick={contactSupplier}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
                  >
                    Contact Technical Support
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <div 
                  key={relatedProduct.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                >
                  <img 
                    src={relatedProduct.imageUrl || relatedProduct.image || '/api/placeholder/300/200'}
                    alt={relatedProduct.name || relatedProduct.displayName}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
                      {relatedProduct.name || relatedProduct.displayName}
                    </h3>
                    <p className="text-blue-600 font-bold">
                      RM {(relatedProduct.price || relatedProduct.customerPrice || relatedProduct.displayPrice || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Contact Supplier Modal */}
      {showContactSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Supplier</h3>
            <div className="space-y-4">
              <div>
                <strong>{product.supplier || 'HiggsFlow Partner'}</strong>
                <p className="text-gray-600">{product.location || product.supplierLocation || 'Malaysia'}</p>
              </div>
              
              <div className="flex gap-3">
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call Now
                </button>
                <button className="flex-1 border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
              
              <div className="text-center">
                <button
                  onClick={() => setShowContactSupplier(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
