// src/components/ecommerce/ShoppingCart.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingCart as CartIcon, 
  Plus, 
  Minus, 
  Trash2, 
  Heart,
  Calculator,
  Truck,
  CheckCircle,
  AlertCircle,
  CreditCard,
  User,
  LogIn
} from 'lucide-react';

const ShoppingCart = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId] = useState(() => {
    return sessionStorage.getItem('guest_session_id') || 
           'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });

  // Mock cart data for demonstration
  useEffect(() => {
    const mockCartData = [
      {
        id: 'cart_item_1',
        productId: 'product_123',
        productName: 'Industrial Steel Pipe DN50',
        productImage: '/api/placeholder/100/100',
        supplierName: 'Steel Components Malaysia',
        unitPrice: 125.50,
        quantity: 10,
        totalPrice: 1255.00,
        stockStatus: 'in_stock',
        deliveryTime: '5-7 days',
        specifications: {
          material: 'Carbon Steel',
          diameter: '50mm',
          length: '6m'
        }
      },
      {
        id: 'cart_item_2',
        productId: 'product_456',
        productName: 'Hydraulic Valve Assembly',
        productImage: '/api/placeholder/100/100',
        supplierName: 'Precision Engineering Sdn Bhd',
        unitPrice: 850.00,
        quantity: 2,
        totalPrice: 1700.00,
        stockStatus: 'limited_stock',
        deliveryTime: '3-5 days',
        specifications: {
          pressure: '200 bar',
          size: '1/2 inch',
          material: 'Stainless Steel'
        }
      }
    ];

    // Simulate loading
    setTimeout(() => {
      setCartItems(mockCartData);
      setLoading(false);
    }, 1000);
  }, []);

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCartItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, quantity: newQuantity, totalPrice: item.unitPrice * newQuantity }
          : item
      )
    );
  };

  const removeItem = (itemId) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your cart...</p>
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
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          <p className="text-gray-600">{getCartCount()} items in your cart</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          // Empty Cart
          <div className="text-center py-12">
            <CartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Discover our industrial products and start building your order</p>
            <button 
              onClick={() => navigate('/catalog')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Catalog
            </button>
          </div>
        ) : (
          // Cart with Items
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b">
                  <h2 className="text-lg font-semibold text-gray-900">Cart Items</h2>
                </div>
                
                <div className="divide-y">
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-20 h-20 object-cover rounded-lg border"
                          />
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-lg font-medium text-gray-900 mb-1">
                                {item.productName}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                Supplier: {item.supplierName}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Truck className="w-4 h-4" />
                                  {item.deliveryTime}
                                </span>
                                <span className="flex items-center gap-1">
                                  {item.stockStatus === 'in_stock' ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      In Stock
                                    </>
                                  ) : (
                                    <>
                                      <AlertCircle className="w-4 h-4 text-orange-500" />
                                      Limited Stock
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-2 text-gray-400 hover:text-red-500"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 text-gray-400 hover:text-red-500"
                                title="Save for later"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Specifications */}
                          <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                            {Object.entries(item.specifications).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-gray-500 capitalize">{key}:</span>
                                <span className="ml-1 text-gray-900">{value}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Quantity and Price */}
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">Quantity:</span>
                              <div className="flex items-center border rounded-lg">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="p-2 hover:bg-gray-50"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="px-4 py-2 min-w-[3rem] text-center">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-2 hover:bg-gray-50"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-sm text-gray-600">
                                RM {item.unitPrice.toFixed(2)} each
                              </div>
                              <div className="text-lg font-semibold text-gray-900">
                                RM {item.totalPrice.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Cart Summary */}
            <div className="lg:col-span-1 mt-8 lg:mt-0">
              <div className="bg-white rounded-lg shadow-sm sticky top-4">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({getCartCount()} items)</span>
                      <span className="text-gray-900">RM {getCartTotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated Shipping</span>
                      <span className="text-gray-900">Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="text-gray-900">Calculated at checkout</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>RM {getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Guest Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                          Register for Better Pricing
                        </h4>
                        <p className="text-sm text-blue-700 mb-3">
                          Factory accounts get wholesale pricing and credit terms
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate('/factory/register')}
                            className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
                          >
                            Register
                          </button>
                          <button
                            onClick={() => navigate('/factory/login')}
                            className="text-xs border border-blue-600 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50"
                          >
                            Sign In
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate('/quote/request')}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Calculator className="w-4 h-4" />
                      Request Quote
                    </button>
                    <button
                      onClick={() => alert('Checkout feature coming soon!')}
                      className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      Proceed to Checkout
                    </button>
                  </div>
                  
                  <div className="mt-4 text-center text-xs text-gray-500">
                    Secure checkout powered by HiggsFlow
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCart;

// src/components/ecommerce/FactoryLogin.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  Building2, 
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2
} from 'lucide-react';

const FactoryLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // TODO: Implement actual authentication
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      
      // Mock authentication success
      if (formData.email && formData.password) {
        alert('Login successful! (Demo mode)');
        navigate('/factory/dashboard');
      } else {
        setError('Please fill in all fields');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError(''); // Clear error when user starts typing
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </button>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          {/* Logo/Branding */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Factory Login</h2>
            <p className="text-gray-600 mt-2">
              Access your HiggsFlow factory account
            </p>
          </div>
          
          {/* Login Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your email address"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700"
                  onClick={() => alert('Password reset feature coming soon!')}
                >
                  Forgot password?
                </button>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
            
            {/* Registration Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account? {' '}
                <button 
                  onClick={() => navigate('/factory/register')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Register your factory
                </button>
              </p>
            </div>

            {/* Features */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Factory Account Benefits:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Wholesale pricing and bulk discounts</li>
                <li>• Credit terms (NET 30/60/90)</li>
                <li>• Dedicated account manager</li>
                <li>• Priority support and faster delivery</li>
              </ul>
            </div>
          </div>

          {/* Demo Notice */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Demo Mode: Use any email and password to test the system</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactoryLogin;

// src/components/ecommerce/QuoteRequest.jsx
import React, { useState } from 'react';
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
  X
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
      productName: initialProduct.name || '',
      specifications: initialProduct.specifications || '',
      quantity: 1,
      unit: 'pcs',
      estimatedPrice: initialProduct.price || '',
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
      
      // TODO: Implement actual quote request submission
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
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
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
                        Quantity & Unit *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          min="1"
                          required
                        />
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="pcs">pcs</option>
                          <option value="kg">kg</option>
                          <option value="m">m</option>
                          <option value="m²">m²</option>
                          <option value="l">l</option>
                          <option value="set">set</option>
                        </select>
                      </div>
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

          {/* Project Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Project Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="w-4 h-4 inline mr-1" />
                  Delivery Location
                </label>
                <input
                  type="text"
                  name="deliveryLocation"
                  value={formData.deliveryLocation}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Requested Delivery Date
                </label>
                <input
                  type="date"
                  name="requestedDeliveryDate"
                  value={formData.requestedDeliveryDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="NET 30">NET 30</option>
                  <option value="NET 60">NET 60</option>
                  <option value="NET 90">NET 90</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Special Requirements & Notes
              </label>
              <textarea
                name="specialRequirements"
                value={formData.specialRequirements}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Any special requirements, certifications needed, installation requirements, etc."
              />
            </div>
          </div>

          {/* File Attachments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              Attachments (Optional)
            </h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Paperclip className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  Click to upload drawings, specifications, or other documents
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  PDF, DOC, XLS, JPG, PNG (Max 10MB each)
                </p>
              </label>
            </div>
            
            {attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Uploaded Files:</h4>
                <div className="space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Paperclip className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                    <Clock className="w-4 h-4 animate-spin" />
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
            
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>We'll respond to your quote request within 24 hours</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuoteRequest;

// src/components/ecommerce/FactoryDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShoppingCart, 
  FileText, 
  Settings, 
  Package, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Truck,
  Users,
  BarChart3,
  Eye,
  Plus,
  Download,
  Phone,
  Mail,
  Bell
} from 'lucide-react';

const FactoryDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    profile: {
      companyName: 'Advanced Manufacturing Sdn Bhd',
      contactPerson: 'Ahmad Rahman',
      email: 'ahmad@advancedmfg.com',
      accountType: 'Premium Factory',
      joinDate: '2024-01-15'
    },
    orders: {
      total: 156,
      pending: 8,
      processing: 12,
      completed: 136,
      totalValue: 2850000
    },
    quotes: {
      active: 5,
      pending: 3,
      approved: 45,
      rejected: 2
    },
    analytics: {
      monthlySpend: 485000,
      averageOrderValue: 18750,
      topCategory: 'Steel Products',
      creditUtilization: 65
    }
  });

  const [recentOrders] = useState([
    {
      id: 'PO-2024-1234',
      date: '2024-08-15',
      status: 'processing',
      value: 125000,
      items: 15,
      supplier: 'Steel Components Malaysia'
    },
    {
      id: 'PO-2024-1233',
      date: '2024-08-12',
      status: 'completed',
      value: 89500,
      items: 8,
      supplier: 'Precision Engineering'
    },
    {
      id: 'PO-2024-1232',
      date: '2024-08-10',
      status: 'pending',
      value: 67800,
      items: 12,
      supplier: 'Industrial Solutions'
    }
  ]);

  const [recentQuotes] = useState([
    {
      id: 'QT-2024-567',
      date: '2024-08-16',
      status: 'pending',
      value: 145000,
      items: 8,
      description: 'Hydraulic Components'
    },
    {
      id: 'QT-2024-566',
      date: '2024-08-14',
      status: 'approved',
      value: 78500,
      items: 5,
      description: 'Steel Pipes & Fittings'
    }
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'text-green-700 bg-green-100';
      case 'processing':
        return 'text-blue-700 bg-blue-100';
      case 'pending':
        return 'text-orange-700 bg-orange-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Factory Dashboard</h1>
              <p className="text-gray-600">Welcome back, {dashboardData.profile.contactPerson}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/catalog')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Browse Catalog
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => alert('Settings coming soon!')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.orders.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              +12% from last month
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  RM {(dashboardData.analytics.monthlySpend / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              +8% from last month
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Quotes</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.quotes.active}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {dashboardData.quotes.pending} pending review
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credit Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.analytics.creditUtilization}%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-orange-600">
              RM 350K available
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                  <button
                    onClick={() => alert('Order history coming soon!')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <h3 className="font-medium text-gray-900">{order.id}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {order.supplier} • {order.items} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          RM {(order.value / 1000).toFixed(0)}K
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Account Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/quote/request')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span>Request New Quote</span>
                </button>
                
                <button
                  onClick={() => navigate('/catalog')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <Eye className="w-5 h-5 text-green-600" />
                  <span>Browse Products</span>
                </button>
                
                <button
                  onClick={() => alert('Reports coming soon!')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span>View Reports</span>
                </button>
                
                <button
                  onClick={() => alert('Support coming soon!')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <Phone className="w-5 h-5 text-orange-600" />
                  <span>Contact Support</span>
                </button>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Company</p>
                  <p className="text-gray-900">{dashboardData.profile.companyName}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Account Type</p>
                  <p className="text-gray-900">{dashboardData.profile.accountType}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Member Since</p>
                  <p className="text-gray-900">
                    {new Date(dashboardData.profile.joinDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact</p>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{dashboardData.profile.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Quotes */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotes</h3>
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{quote.id}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{quote.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{quote.items} items</span>
                      <span>RM {(quote.value / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactoryDashboard;
