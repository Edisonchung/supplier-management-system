// src/components/ecommerce/QuoteRequest.jsx
// Professional quote request system for HiggsFlow platform
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  FileText,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  X,
  Eye,
  Download,
  Edit,
  Save,
  ShoppingCart
} from 'lucide-react';

const QuoteRequest = () => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const fileInputRef = useRef(null);

  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Quote data
  const [quoteData, setQuoteData] = useState({
    // Company Information (auto-filled if logged in)
    company: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      industry: ''
    },
    
    // Quote Details
    quote: {
      title: '',
      description: '',
      urgency: 'standard',
      deliveryDate: '',
      deliveryAddress: '',
      paymentTerms: 'NET 30',
      additionalRequirements: ''
    },
    
    // Items
    items: [],
    
    // Attachments
    attachments: [],
    
    // Preferences
    preferences: {
      preferredSuppliers: [],
      budgetRange: '',
      qualityRequirements: '',
      certificationNeeds: '',
      afterSalesSupport: false
    }
  });

  // Cart items from localStorage (for guest users)
  const [cartItems, setCartItems] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Mock product data for search
  const mockProducts = [
    {
      id: 1,
      name: "ABB ACS580 Variable Frequency Drive",
      brand: "ABB",
      category: "Electronics",
      price: 1850,
      image: "/api/placeholder/60/60",
      specifications: { "Power": "5.5kW", "Voltage": "380-480V" }
    },
    {
      id: 2,
      name: "Siemens SIMATIC S7-1200 PLC",
      brand: "Siemens",
      category: "Electronics", 
      price: 890,
      image: "/api/placeholder/60/60",
      specifications: { "CPU": "ARM Cortex A9", "Memory": "100KB" }
    },
    {
      id: 3,
      name: "SKF Deep Groove Ball Bearing 6205",
      brand: "SKF",
      category: "Mechanical",
      price: 45,
      image: "/api/placeholder/60/60",
      specifications: { "Inner Dia": "25mm", "Outer Dia": "52mm" }
    }
  ];

  // Component cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    // Load cart items if available
    const savedCart = localStorage.getItem('higgsflow_cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        setCartItems(cartData.items || []);
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
    
    // Check if user is logged in and auto-fill company data
    const factorySession = localStorage.getItem('factorySession');
    if (factorySession) {
      try {
        const sessionData = JSON.parse(factorySession);
        setQuoteData(prev => ({
          ...prev,
          company: {
            name: sessionData.companyName || '',
            contactPerson: sessionData.contactPerson || '',
            email: sessionData.email || '',
            phone: sessionData.phone || '',
            address: sessionData.address || '',
            industry: sessionData.industry || ''
          }
        }));
      } catch (error) {
        console.error('Error loading session:', error);
      }
    }
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state update
  const safeSetState = (setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  };

  // Form handlers
  const handleCompanyChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      company: { ...prev.company, [field]: value }
    }));
    
    // Clear error when user starts typing
    if (errors[`company.${field}`]) {
      setErrors(prev => ({ ...prev, [`company.${field}`]: '' }));
    }
  };

  const handleQuoteChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      quote: { ...prev.quote, [field]: value }
    }));
    
    // Clear error when user starts typing
    if (errors[`quote.${field}`]) {
      setErrors(prev => ({ ...prev, [`quote.${field}`]: '' }));
    }
  };

  const handlePreferencesChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value }
    }));
  };

  // Item management
  const addItem = (product = null) => {
    const newItem = product ? {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      specifications: product.specifications,
      quantity: 1,
      estimatedPrice: product.price,
      notes: '',
      urgent: false
    } : {
      id: Date.now(),
      productId: null,
      name: '',
      brand: '',
      category: '',
      specifications: {},
      quantity: 1,
      estimatedPrice: 0,
      notes: '',
      urgent: false
    };

    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    setShowProductSearch(false);
  };

  const updateItem = (itemId, field, value) => {
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (itemId) => {
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  // File handling
  const handleFileUpload = (file) => {
    if (file && file.size <= 10 * 1024 * 1024) { // 10MB limit
      const newAttachment = {
        id: Date.now(),
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      };
      
      setQuoteData(prev => ({
        ...prev,
        attachments: [...prev.attachments, newAttachment]
      }));
    } else {
      alert('File size must be less than 10MB');
    }
  };

  const removeAttachment = (attachmentId) => {
    setQuoteData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }));
  };

  // Product search
  const searchProducts = (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    const results = mockProducts.filter(product =>
      product.name.toLowerCase().includes(term.toLowerCase()) ||
      product.brand.toLowerCase().includes(term.toLowerCase()) ||
      product.category.toLowerCase().includes(term.toLowerCase())
    );
    
    setSearchResults(results);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts(productSearchTerm);
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [productSearchTerm]);

  // Import cart items
  const importCartItems = () => {
    if (cartItems.length > 0) {
      const cartItemsFormatted = cartItems.map(cartItem => ({
        id: Date.now() + Math.random(),
        productId: cartItem.productId,
        name: cartItem.product?.name || 'Unknown Product',
        brand: cartItem.product?.brand || '',
        category: cartItem.product?.category || '',
        specifications: cartItem.product?.specifications || {},
        quantity: cartItem.quantity,
        estimatedPrice: cartItem.product?.price || 0,
        notes: '',
        urgent: false
      }));
      
      setQuoteData(prev => ({
        ...prev,
        items: [...prev.items, ...cartItemsFormatted]
      }));
      
      // Clear cart after import
      localStorage.removeItem('higgsflow_cart');
      setCartItems([]);
    }
  };

  // Validation
  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!quoteData.company.name.trim()) newErrors['company.name'] = 'Company name is required';
        if (!quoteData.company.contactPerson.trim()) newErrors['company.contactPerson'] = 'Contact person is required';
        if (!quoteData.company.email.trim()) newErrors['company.email'] = 'Email is required';
        if (!quoteData.company.phone.trim()) newErrors['company.phone'] = 'Phone is required';
        break;
        
      case 2:
        if (!quoteData.quote.title.trim()) newErrors['quote.title'] = 'Quote title is required';
        if (!quoteData.quote.description.trim()) newErrors['quote.description'] = 'Description is required';
        break;
        
      case 3:
        if (quoteData.items.length === 0) newErrors['items'] = 'At least one item is required';
        quoteData.items.forEach((item, index) => {
          if (!item.name.trim()) newErrors[`item.${index}.name`] = 'Item name is required';
          if (item.quantity <= 0) newErrors[`item.${index}.quantity`] = 'Quantity must be greater than 0';
        });
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Submit quote
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setSubmitting(true);
    
    try {
      // Simulate API submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (mountedRef.current) {
        setSuccess(true);
        
        // Clear form data
        setTimeout(() => {
          if (mountedRef.current) {
            navigate('/catalog');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Quote submission failed:', error);
      setErrors({ submit: 'Failed to submit quote. Please try again.' });
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Quote Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your quote request has been submitted successfully. Our suppliers will review your requirements and respond within 24-48 hours.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
              <ul className="text-sm text-blue-800 text-left space-y-1">
                <li>• Suppliers review your requirements</li>
                <li>• You'll receive quotes via email and dashboard</li>
                <li>• Compare quotes and negotiate terms</li>
                <li>• Convert approved quotes to orders</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/catalog')}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => navigate('/factory/dashboard')}
                className="flex-1 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Request Quote</h1>
              <p className="text-gray-600 mt-1">Get competitive quotes from verified suppliers</p>
            </div>
            
            {/* Progress indicator */}
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md">
          {/* Step indicator */}
          <div className="border-b border-gray-200 px-8 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {currentStep === 1 && 'Company Information'}
                {currentStep === 2 && 'Quote Details'}
                {currentStep === 3 && 'Items & Specifications'}
                {currentStep === 4 && 'Review & Submit'}
              </h2>
              <span className="text-sm text-gray-500">
                Step {currentStep} of 4
              </span>
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                {/* Import cart notification */}
                {cartItems.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ShoppingCart className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">Items in Cart</p>
                          <p className="text-sm text-blue-700">
                            You have {cartItems.length} items in your cart. Import them to this quote?
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={importCartItems}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Import Cart
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={quoteData.company.name}
                      onChange={(e) => handleCompanyChange('name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors['company.name'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Your company name"
                    />
                    {errors['company.name'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['company.name']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person *
                    </label>
                    <input
                      type="text"
                      value={quoteData.company.contactPerson}
                      onChange={(e) => handleCompanyChange('contactPerson', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors['company.contactPerson'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Full name"
                    />
                    {errors['company.contactPerson'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['company.contactPerson']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={quoteData.company.email}
                      onChange={(e) => handleCompanyChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors['company.email'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="contact@company.com"
                    />
                    {errors['company.email'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['company.email']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={quoteData.company.phone}
                      onChange={(e) => handleCompanyChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors['company.phone'] ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+60 3-1234 5678"
                    />
                    {errors['company.phone'] && (
                      <p className="mt-1 text-sm text-red-600">{errors['company.phone']}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <select
                      value={quoteData.company.industry}
                      onChange={(e) => handleCompanyChange('industry', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select industry</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Automotive">Automotive</option>
                      <option value="Construction">Construction</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Pharmaceutical">Pharmaceutical</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Company Address
                  </label>
                  <textarea
                    value={quoteData.company.address}
                    onChange={(e) => handleCompanyChange('address', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Complete address including city, state, and postcode"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Quote Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quote Title *
                  </label>
                  <input
                    type="text"
                    value={quoteData.quote.title}
                    onChange={(e) => handleQuoteChange('title', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors['quote.title'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Industrial Equipment for Production Line Upgrade"
                  />
                  {errors['quote.title'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['quote.title']}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={quoteData.quote.description}
                    onChange={(e) => handleQuoteChange('description', e.target.value)}
                    rows="4"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors['quote.description'] ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Provide detailed description of your requirements, intended use, quality standards, etc."
                  />
                  {errors['quote.description'] && (
                    <p className="mt-1 text-sm text-red-600">{errors['quote.description']}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Urgency Level
                    </label>
                    <select
                      value={quoteData.quote.urgency}
                      onChange={(e) => handleQuoteChange('urgency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="standard">Standard (5-7 days)</option>
                      <option value="urgent">Urgent (2-3 days)</option>
                      <option value="rush">Rush (24 hours)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Required Delivery Date
                    </label>
                    <input
                      type="date"
                      value={quoteData.quote.deliveryDate}
                      onChange={(e) => handleQuoteChange('deliveryDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Preferred Payment Terms
                    </label>
                    <select
                      value={quoteData.quote.paymentTerms}
                      onChange={(e) => handleQuoteChange('paymentTerms', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="COD">Cash on Delivery (COD)</option>
                      <option value="NET 15">NET 15 days</option>
                      <option value="NET 30">NET 30 days</option>
                      <option value="NET 60">NET 60 days</option>
                      <option value="NET 90">NET 90 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Budget Range (Optional)
                    </label>
                    <select
                      value={quoteData.preferences.budgetRange}
                      onChange={(e) => handlePreferencesChange('budgetRange', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select budget range</option>
                      <option value="below_5k">Below RM 5,000</option>
                      <option value="5k_20k">RM 5,000 - RM 20,000</option>
                      <option value="20k_50k">RM 20,000 - RM 50,000</option>
                      <option value="50k_100k">RM 50,000 - RM 100,000</option>
                      <option value="above_100k">Above RM 100,000</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address
                  </label>
                  <textarea
                    value={quoteData.quote.deliveryAddress}
                    onChange={(e) => handleQuoteChange('deliveryAddress', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="If different from company address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Requirements
                  </label>
                  <textarea
                    value={quoteData.quote.additionalRequirements}
                    onChange={(e) => handleQuoteChange('additionalRequirements', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any special requirements, certifications needed, installation services, etc."
                  />
                </div>
              </div>
            )}

            {/* Step 3: Items & Specifications */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Quote Items</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowProductSearch(true)}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      <Search className="w-4 h-4" />
                      Search Products
                    </button>
                    <button
                      onClick={() => addItem()}
                      className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4" />
                      Add Custom Item
                    </button>
                  </div>
                </div>

                {errors.items && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 text-sm">{errors.items}</span>
                  </div>
                )}

                {/* Product search modal */}
                {showProductSearch && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium">Search Products</h3>
                        <button
                          onClick={() => setShowProductSearch(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                      
                      <div className="mb-4">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <input
                            type="text"
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            placeholder="Search by product name, brand, or category..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        {searchResults.map(product => (
                          <div
                            key={product.id}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                            onClick={() => addItem(product)}
                          >
                            <div className="flex items-center gap-4">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{product.name}</h4>
                                <p className="text-sm text-gray-600">{product.brand} • {product.category}</p>
                                <p className="text-sm font-medium text-blue-600">RM {product.price}</p>
                              </div>
                              <Plus className="w-5 h-5 text-gray-400" />
                            </div>
                          </div>
                        ))}
                        
                        {productSearchTerm && searchResults.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No products found. Try different search terms or add a custom item.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Items list */}
                <div className="space-y-4">
                  {quoteData.items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`item.${index}.name`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Product or part name"
                          />
                          {errors[`item.${index}.name`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item.${index}.name`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Brand
                          </label>
                          <input
                            type="text"
                            value={item.brand}
                            onChange={(e) => updateItem(item.id, 'brand', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Manufacturer/brand"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select category</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Safety">Safety</option>
                            <option value="Tools">Tools</option>
                            <option value="Hydraulics">Hydraulics</option>
                            <option value="Pneumatics">Pneumatics</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              errors[`item.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {errors[`item.${index}.quantity`] && (
                            <p className="mt-1 text-sm text-red-600">{errors[`item.${index}.quantity`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estimated Price (RM)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.estimatedPrice}
                            onChange={(e) => updateItem(item.id, 'estimatedPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Specifications & Notes
                          </label>
                          <textarea
                            value={item.notes}
                            onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Technical specifications, model numbers, special requirements, etc."
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={item.urgent}
                            onChange={(e) => updateItem(item.id, 'urgent', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">Mark as urgent</span>
                        </label>
                        
                        {item.estimatedPrice > 0 && (
                          <span className="text-sm text-gray-500">
                            Subtotal: RM {(item.quantity * item.estimatedPrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {quoteData.items.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No items added</h3>
                      <p className="text-gray-600 mb-4">
                        Search for products or add custom items to your quote request
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => setShowProductSearch(true)}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                        >
                          <Search className="w-4 h-4" />
                          Search Products
                        </button>
                        <button
                          onClick={() => addItem()}
                          className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
                        >
                          <Plus className="w-4 h-4" />
                          Add Custom Item
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Attachments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Attachments (Optional)
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Upload technical drawings, specifications, photos, or other relevant documents
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dwg,.step,.iges"
                      onChange={(e) => {
                        Array.from(e.target.files).forEach(file => handleFileUpload(file));
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Click to upload files
                      </button>
                      <p className="text-sm text-gray-500 mt-1">
                        PDF, DOC, Images, CAD files (Max 10MB each)
                      </p>
                    </div>
                  </div>

                  {quoteData.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {quoteData.attachments.map(attachment => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                              <p className="text-xs text-gray-500">
                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review & Submit */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Review Your Quote Request</h3>
                  <p className="text-sm text-blue-800">
                    Please review all information carefully before submitting. You'll receive quotes from our verified suppliers within 24-48 hours.
                  </p>
                </div>

                {/* Company Summary */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Company Information</h4>
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-900">{quoteData.company.name}</span>
                        <p className="text-gray-600">{quoteData.company.contactPerson}</p>
                        <p className="text-gray-600">{quoteData.company.email}</p>
                        <p className="text-gray-600">{quoteData.company.phone}</p>
                      </div>
                      <div>
                        {quoteData.company.industry && (
                          <p className="text-gray-600">Industry: {quoteData.company.industry}</p>
                        )}
                        {quoteData.company.address && (
                          <p className="text-gray-600">{quoteData.company.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quote Summary */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Quote Details</h4>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2">{quoteData.quote.title}</h5>
                    <p className="text-gray-700 mb-3">{quoteData.quote.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Urgency:</span>
                        <p className="text-gray-600 capitalize">{quoteData.quote.urgency}</p>
                      </div>
                      {quoteData.quote.deliveryDate && (
                        <div>
                          <span className="font-medium text-gray-700">Delivery Date:</span>
                          <p className="text-gray-600">{quoteData.quote.deliveryDate}</p>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-gray-700">Payment Terms:</span>
                        <p className="text-gray-600">{quoteData.quote.paymentTerms}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">
                      Items ({quoteData.items.length})
                    </h4>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Price</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {quoteData.items.map(item => (
                            <tr key={item.id}>
                              <td className="px-4 py-3">
                                <div>
                                  <p className="font-medium text-gray-900">{item.name}</p>
                                  {item.brand && <p className="text-sm text-gray-600">{item.brand}</p>}
                                  {item.urgent && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
                                      Urgent
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">{item.category || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {item.estimatedPrice > 0 ? `RM ${item.estimatedPrice.toFixed(2)}` : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                {item.estimatedPrice > 0 ? `RM ${(item.quantity * item.estimatedPrice).toFixed(2)}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {quoteData.items.some(item => item.estimatedPrice > 0) && (
                      <div className="bg-gray-100 px-4 py-3 text-right">
                        <span className="font-medium text-gray-900">
                          Total Estimated Value: RM {quoteData.items.reduce((sum, item) => 
                            sum + (item.quantity * item.estimatedPrice), 0
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments Summary */}
                {quoteData.attachments.length > 0 && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Attachments ({quoteData.attachments.length})
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {quoteData.attachments.map(attachment => (
                          <div key={attachment.id} className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{attachment.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                {errors.submit && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-red-700 text-sm">{errors.submit}</span>
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-yellow-900">Before You Submit</h5>
                      <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                        <li>• All information will be shared with relevant suppliers</li>
                        <li>• You'll receive quotes via email and your dashboard</li>
                        <li>• Quotes are typically valid for 30 days unless specified</li>
                        <li>• Our team may contact you for clarification if needed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between pt-8 border-t border-gray-200">
              {currentStep > 1 ? (
                <button
                  onClick={prevStep}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Previous Step
                </button>
              ) : (
                <button
                  onClick={() => navigate('/catalog')}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel Request
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  onClick={nextStep}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting Quote...
                    </>
                  ) : (
                    'Submit Quote Request'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Help sidebar */}
        <div className="mt-8 bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-8 text-white">
          <h3 className="text-xl font-bold mb-6">Need Help?</h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Quote Process</h4>
              <ul className="text-sm opacity-90 space-y-1">
                <li>• Provide detailed specifications for better quotes</li>
                <li>• Include technical drawings when possible</li>
                <li>• Specify quality and certification requirements</li>
                <li>• Be clear about delivery timelines</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Expected Timeline</h4>
              <ul className="text-sm opacity-90 space-y-1">
                <li>• Standard quotes: 5-7 business days</li>
                <li>• Urgent quotes: 2-3 business days</li>
                <li>• Rush quotes: 24 hours</li>
                <li>• Complex items may take longer</li>
              </ul>
            </div>
            
            <div className="pt-4 border-t border-green-500">
              <h4 className="font-semibold mb-2">Contact Support</h4>
              <div className="space-y-2 text-sm opacity-90">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>+60 3-1234 5678</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>quotes@higgsflow.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteRequest;
