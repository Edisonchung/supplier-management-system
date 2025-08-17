
// src/components/ecommerce/QuoteRequest.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Plus, 
  Minus, 
  Building2, 
  Mail, 
  Phone, 
  MessageSquare,
  Calculator,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Paperclip,
  X,
  Loader2
} from 'lucide-react';

const QuoteRequest = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get product from navigation state or initialize empty
  const initialProduct = location.state?.product || null;
  
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    
    // Quote Details
    projectName: '',
    deliveryLocation: '',
    requestedDeliveryDate: '',
    paymentTerms: 'NET 30',
    specialRequirements: ''
  });

  const [quoteItems, setQuoteItems] = useState(
    initialProduct ? [{
      id: Date.now(),
      productName: initialProduct.displayName || initialProduct.name || '',
      specifications: '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: initialProduct.pricing?.unitPrice || '',
      notes: ''
    }] : [{
      id: Date.now(),
      productName: '',
      specifications: '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: '',
      notes: ''
    }]
  );

  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (id, field, value) => {
    setQuoteItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addQuoteItem = () => {
    setQuoteItems(prev => [...prev, {
      id: Date.now(),
      productName: '',
      specifications: '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: '',
      notes: ''
    }]);
  };

  const removeQuoteItem = (id) => {
    setQuoteItems(prev => prev.filter(item => item.id !== id));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Quote Request Data:', {
        formData,
        quoteItems,
        attachments: attachments.map(f => f.name)
      });
      
      setSubmitted(true);
    } catch (error) {
      alert('Error submitting quote request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quote Request Submitted!</h2>
          <p className="text-gray-600 mb-6">
            We've received your quote request and will respond within 24 hours.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/catalog')}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
            >
              Continue Shopping
            </button>
            <button
              onClick={() => navigate('/factory/register')}
              className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
            >
              Create Factory Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Request Quote</h1>
          <p className="text-gray-600">Get customized pricing for your industrial needs</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Company Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Company Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Quote Items */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Quote Items
              </h2>
              <button
                type="button"
                onClick={addQuoteItem}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {quoteItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-900">Item {index + 1}</h3>
                    {quoteItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuoteItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specifications & Requirements
                    </label>
                    <textarea
                      value={item.specifications}
                      onChange={(e) => handleItemChange(item.id, 'specifications', e.target.value)}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe technical specifications, quality requirements, standards, etc."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    Submit Quote Request
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteRequest;

// ===================================================================

// src/components/ecommerce/ProductDetailPage.jsx  
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
  Package
} from 'lucide-react';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Mock product data (replace with actual API call)
  const mockProduct = {
    id: productId,
    displayName: 'Industrial Steel Pipe DN50',
    shortDescription: 'High-quality carbon steel pipe suitable for industrial applications',
    fullDescription: 'Professional-grade carbon steel pipe manufactured to international standards. Perfect for industrial piping systems, water distribution, and structural applications. Features corrosion-resistant coating and precise dimensional accuracy.',
    category: 'Steel Products',
    pricing: {
      unitPrice: 125.50,
      discountPrice: 120.00,
      listPrice: 135.00,
      currency: 'MYR',
      bulkPricing: [
        { minQty: 10, price: 115.00, savings: 10.50 },
        { minQty: 50, price: 110.00, savings: 15.50 },
        { minQty: 100, price: 105.00, savings: 20.50 }
      ]
    },
    inventory: {
      stockStatus: 'In Stock',
      quantity: 500,
      unit: 'meters',
      leadTime: '3-5 days',
      minimumOrderQty: 1
    },
    supplier: {
      name: 'Steel Components Malaysia',
      rating: 4.8,
      location: 'Selangor',
      verified: true,
      responseTime: '< 2 hours'
    },
    images: {
      primary: '/api/placeholder/600/600',
      gallery: [
        '/api/placeholder/600/600',
        '/api/placeholder/600/600',
        '/api/placeholder/600/600'
      ]
    },
    specifications: {
      material: 'Carbon Steel',
      diameter: '50mm',
      length: '6m',
      standard: 'MS 1506',
      thickness: '3.2mm',
      coating: 'Galvanized'
    },
    features: [
      'Corrosion resistant galvanized coating',
      'High strength carbon steel construction',
      'ISO 9001:2015 certified manufacturing',
      'Precision dimensional accuracy',
      'Suitable for high-pressure applications'
    ],
    applications: [
      'Industrial piping systems',
      'Water distribution networks',
      'Structural construction',
      'Agricultural irrigation',
      'Municipal infrastructure'
    ],
    certifications: ['ISO 9001:2015', 'MS 1506', 'SIRIM Approved'],
    featured: true,
    trending: false
  };

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setProduct(mockProduct);
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [productId]);

  const handleAddToCart = () => {
    alert(`Added ${selectedQuantity} x ${product.displayName} to cart`);
  };

  const handleRequestQuote = () => {
    navigate('/quote/request', { state: { product } });
  };

  const calculateBulkPrice = (quantity) => {
    if (!product?.pricing?.bulkPricing) return product?.pricing?.discountPrice || 0;
    
    let bestPrice = product.pricing.discountPrice;
    for (const tier of product.pricing.bulkPricing) {
      if (quantity >= tier.minQty) {
        bestPrice = tier.price;
      }
    }
    return bestPrice;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/catalog')}
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <nav className="text-sm text-gray-500">
            <span>HiggsFlow</span> → <span>{product.category}</span> → <span className="text-gray-900">{product.displayName}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-lg overflow-hidden border">
              <img
                src={product.images.gallery[selectedImage]}
                alt={product.displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {product.images.gallery.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <img src={image} alt={`View ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Status */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.featured && (
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-medium">
                    Featured
                  </span>
                )}
                {product.trending && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-medium">
                    Trending
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product.displayName}</h1>
              <p className="text-lg text-gray-600 mt-2">{product.shortDescription}</p>
            </div>

            {/* Supplier Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{product.supplier.name}</h3>
                  {product.supplier.verified && (
                    <Shield className="w-4 h-4 text-green-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span>{product.supplier.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{product.supplier.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Response: {product.supplier.responseTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl font-bold text-blue-600">
                    RM {calculateBulkPrice(selectedQuantity).toFixed(2)}
                  </span>
                  {product.pricing.listPrice > product.pricing.discountPrice && (
                    <span className="text-lg text-gray-500 line-through">
                      RM {product.pricing.listPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">per {product.inventory.unit}</p>
              </div>

              {/* Bulk Pricing */}
              {product.pricing.bulkPricing?.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-2">Bulk Pricing Available</h4>
                  <div className="space-y-1">
                    {product.pricing.bulkPricing.map((tier, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-purple-700">{tier.minQty}+ units:</span>
                        <span className="font-medium">RM {tier.price.toFixed(2)} (Save RM {tier.savings.toFixed(2)})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                {product.inventory.stockStatus} - {product.inventory.quantity} {product.inventory.unit} available
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                      className="p-2 hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 px-3 py-2 text-center border-0 focus:ring-0"
                      min="1"
                    />
                    <button
                      onClick={() => setSelectedQuantity(selectedQuantity + 1)}
                      className="p-2 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm text-gray-600">
                    Total: RM {(calculateBulkPrice(selectedQuantity) * selectedQuantity).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Add to Cart
                </button>
                <button
                  onClick={handleRequestQuote}
                  className="flex-1 border border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-medium hover:bg-blue-50 flex items-center justify-center gap-2"
                >
                  <Calculator className="w-5 h-5" />
                  Request Quote
                </button>
                <button
                  onClick={() => setIsWishlisted(!isWishlisted)}
                  className={`p-3 rounded-lg border ${
                    isWishlisted ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Heart className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Delivery Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Delivery Time</p>
                  <p className="text-sm text-blue-700">{product.inventory.leadTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Min Order</p>
                  <p className="text-sm text-blue-700">{product.inventory.minimumOrderQty} {product.inventory.unit}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'specifications', label: 'Specifications' },
                { id: 'features', label: 'Features' },
                { id: 'applications', label: 'Applications' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="py-6">
            {activeTab === 'overview' && (
              <div className="prose max-w-none">
                <p className="text-gray-600 leading-relaxed">{product.fullDescription}</p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900 capitalize">{key}:</span>
                    <span className="text-gray-600">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'features' && (
              <ul className="space-y-3">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === 'applications' && (
              <ul className="space-y-3">
                {product.applications.map((application, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <span className="text-gray-700">{application}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;

// ===================================================================

// src/components/ecommerce/FactoryRegistration.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Mail, Phone, MapPin, User, ArrowLeft, Loader2 } from 'lucide-react';

const FactoryRegistration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    industry: '',
    companySize: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Factory registration:', formData);
      alert('Registration submitted! We will review and contact you within 24 hours.');
      navigate('/factory/login');
    } catch (error) {
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Factory Registration</h1>
          <p className="text-gray-600 mt-2">Join Malaysia's leading industrial procurement platform</p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Company Name *
                </label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Contact Person *
                </label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry Type *
                </label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select industry</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="construction">Construction</option>
                  <option value="automotive">Automotive</option>
                  <option value="electronics">Electronics</option>
                  <option value="textiles">Textiles</option>
                  <option value="food-beverage">Food & Beverage</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size *
                </label>
                <select
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select company size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Company Address *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter complete company address"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/catalog')}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Factory'
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Already have an account? <button onClick={() => navigate('/factory/login')} className="text-blue-600 hover:text-blue-700">Sign in here</button></p>
        </div>
      </div>
    </div>
  );
};

export default FactoryRegistration;
