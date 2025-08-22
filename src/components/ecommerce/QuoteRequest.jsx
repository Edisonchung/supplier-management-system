// src/components/ecommerce/QuoteRequest.jsx
// Enhanced professional quote request system for HiggsFlow platform
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
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
  Factory,
  Shield,
  Zap,
  Heart,
  MessageSquare,
  FileCheck,
  Award,
  Globe
} from 'lucide-react';

// Import enhanced services (ensure these are available)
import { EnhancedEcommerceFirebaseService } from '../../services/EnhancedEcommerceFirebaseService';
import { AnalyticsService } from '../../services/AnalyticsService';

const QuoteRequest = () => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const fileInputRef = useRef(null);

  // Enhanced state management
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [sessionData, setSessionData] = useState(null);
  const [realTimeSuppliers, setRealTimeSuppliers] = useState([]);
  const [estimatedDelivery, setEstimatedDelivery] = useState(null);
  const [quoteProgress, setQuoteProgress] = useState(0);
  
  // Quote data with enhanced structure
  const [quoteData, setQuoteData] = useState({
    // Enhanced company information
    company: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      industry: '',
      companySize: '',
      registrationNumber: '',
      taxId: '',
      preferredLanguage: 'en',
      businessType: 'manufacturer'
    },
    
    // Enhanced quote details
    quote: {
      title: '',
      description: '',
      urgency: 'standard',
      deliveryDate: '',
      deliveryAddress: '',
      paymentTerms: 'NET 30',
      additionalRequirements: '',
      projectType: 'regular',
      estimatedBudget: '',
      negotiable: true,
      requiresInstallation: false,
      requiresTraining: false,
      requiresWarranty: true,
      rfqNumber: '',
      projectTimeline: ''
    },
    
    // Enhanced items structure
    items: [],
    
    // Enhanced attachments
    attachments: [],
    
    // Enhanced preferences
    preferences: {
      preferredSuppliers: [],
      budgetRange: '',
      qualityRequirements: '',
      certificationNeeds: '',
      afterSalesSupport: false,
      localSupplierPreference: false,
      sustainabilityRequirements: '',
      complianceNeeds: [],
      deliveryPreferences: 'standard'
    },

    // New metadata
    metadata: {
      source: 'public_catalog',
      referrer: '',
      deviceType: 'desktop',
      sessionId: '',
      timestamp: new Date().toISOString(),
      version: '2.1.0'
    }
  });

  // Enhanced cart and product management
  const [cartItems, setCartItems] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [supplierRecommendations, setSupplierRecommendations] = useState([]);

  // Enhanced product catalog with Malaysian industrial focus
  const enhancedProductCatalog = [
    // Electronics & Automation
    {
      id: 1,
      name: "ABB ACS580 Variable Frequency Drive",
      brand: "ABB",
      category: "Electronics",
      subcategory: "Variable Frequency Drives",
      price: 1850,
      currency: "MYR",
      image: "/api/placeholder/80/80",
      specifications: { 
        "Power": "5.5kW", 
        "Voltage": "380-480V",
        "Frequency": "50/60Hz",
        "Protection": "IP21"
      },
      certifications: ["CE", "UL", "SIRIM"],
      availability: "in_stock",
      leadTime: "3-5 days",
      moq: 1,
      popular: true
    },
    {
      id: 2,
      name: "Siemens SIMATIC S7-1200 PLC",
      brand: "Siemens",
      category: "Electronics", 
      subcategory: "Programmable Logic Controllers",
      price: 890,
      currency: "MYR",
      image: "/api/placeholder/80/80",
      specifications: { 
        "CPU": "ARM Cortex A9", 
        "Memory": "100KB",
        "I/O Points": "14DI/10DO",
        "Communication": "Ethernet"
      },
      certifications: ["CE", "UL", "SIRIM"],
      availability: "in_stock",
      leadTime: "2-3 days",
      moq: 1,
      popular: true
    },
    
    // Mechanical Components
    {
      id: 3,
      name: "SKF Deep Groove Ball Bearing 6205",
      brand: "SKF",
      category: "Mechanical",
      subcategory: "Bearings",
      price: 45,
      currency: "MYR",
      image: "/api/placeholder/80/80",
      specifications: { 
        "Inner Diameter": "25mm", 
        "Outer Diameter": "52mm",
        "Width": "15mm",
        "Load Rating": "14kN"
      },
      certifications: ["ISO 9001", "ABMA"],
      availability: "in_stock",
      leadTime: "1-2 days",
      moq: 10,
      popular: false
    },
    
    // Safety Equipment
    {
      id: 4,
      name: "3M Peltor WorkTunes Pro Hearing Protection",
      brand: "3M",
      category: "Safety",
      subcategory: "Hearing Protection",
      price: 185,
      currency: "MYR",
      image: "/api/placeholder/80/80",
      specifications: { 
        "NRR": "25dB", 
        "Battery Life": "40 hours",
        "Bluetooth": "Yes",
        "Weight": "260g"
      },
      certifications: ["ANSI", "CE", "SIRIM"],
      availability: "in_stock",
      leadTime: "1-2 days",
      moq: 1,
      popular: true
    },

    // Pneumatics
    {
      id: 5,
      name: "Festo Pneumatic Cylinder DSBC-32-100",
      brand: "Festo",
      category: "Pneumatics",
      subcategory: "Cylinders",
      price: 320,
      currency: "MYR",
      image: "/api/placeholder/80/80",
      specifications: { 
        "Bore Size": "32mm", 
        "Stroke": "100mm",
        "Operating Pressure": "1-10 bar",
        "Material": "Anodized Aluminum"
      },
      certifications: ["ISO 6431", "CE"],
      availability: "in_stock",
      leadTime: "3-5 days",
      moq: 1,
      popular: false
    },

    // Hydraulics
    {
      id: 6,
      name: "Parker Hydraulic Pump PV032R1K1T1NMM1",
      brand: "Parker",
      category: "Hydraulics",
      subcategory: "Pumps",
      price: 2850,
      currency: "MYR",
      image: "/api/placeholder/80/80",
      specifications: { 
        "Displacement": "32cc/rev", 
        "Max Pressure": "280 bar",
        "Speed Range": "1200-3600 rpm",
        "Mounting": "SAE A-2"
      },
      certifications: ["ISO 9001", "CE"],
      availability: "made_to_order",
      leadTime: "10-14 days",
      moq: 1,
      popular: false
    }
  ];

  // Component initialization
  useEffect(() => {
    mountedRef.current = true;
    initializeComponent();
    
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Initialize component with enhanced features
  const initializeComponent = async () => {
    try {
      setLoading(true);
      
      // Generate or retrieve session ID
      const sessionId = generateSessionId();
      
      // Load session data
      await loadSessionData(sessionId);
      
      // Load cart items
      loadCartItems();
      
      // Initialize real-time features
      await initializeRealTimeFeatures();
      
      // Track page view
      trackQuotePageView();
      
    } catch (error) {
      console.error('Component initialization failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate enhanced session ID
  const generateSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.slice(-10) : 'unknown';
    return `quote_${timestamp}_${random}_${btoa(userAgent).slice(0, 6)}`;
  };

  // Load session data with enhanced user detection
  const loadSessionData = async (sessionId) => {
    try {
      // Check for existing factory session
      const factorySession = localStorage.getItem('factorySession');
      if (factorySession) {
        const sessionData = JSON.parse(factorySession);
        setSessionData(sessionData);
        
        // Auto-fill company data
        setQuoteData(prev => ({
          ...prev,
          company: {
            ...prev.company,
            name: sessionData.companyName || '',
            contactPerson: sessionData.contactPerson || '',
            email: sessionData.email || '',
            phone: sessionData.phone || '',
            address: sessionData.address || '',
            industry: sessionData.industry || '',
            businessType: sessionData.businessType || 'manufacturer'
          },
          metadata: {
            ...prev.metadata,
            sessionId,
            source: 'logged_in_factory'
          }
        }));
      } else {
        // Guest user - set basic metadata
        setQuoteData(prev => ({
          ...prev,
          metadata: {
            ...prev.metadata,
            sessionId,
            source: 'guest_user'
          }
        }));
      }
    } catch (error) {
      console.error('Error loading session data:', error);
    }
  };

  // Load cart items with enhanced structure
  const loadCartItems = () => {
    try {
      const savedCart = localStorage.getItem('higgsflow_cart');
      if (savedCart) {
        const cartData = JSON.parse(savedCart);
        setCartItems(cartData.items || []);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  // Initialize real-time features
  const initializeRealTimeFeatures = async () => {
    try {
      // Load supplier recommendations
      await loadSupplierRecommendations();
      
      // Load featured products
      loadFeaturedProducts();
      
      // Start real-time supplier tracking
      startRealTimeSupplierTracking();
      
    } catch (error) {
      console.error('Real-time initialization failed:', error);
    }
  };

  // Load supplier recommendations
  const loadSupplierRecommendations = async () => {
    try {
      // Simulate API call for supplier recommendations
      const recommendations = [
        {
          id: 'sup_001',
          name: 'TechnoMalaysia Sdn Bhd',
          rating: 4.8,
          responseTime: '< 2 hours',
          specialties: ['Electronics', 'Automation'],
          verified: true,
          location: 'Shah Alam, Selangor'
        },
        {
          id: 'sup_002', 
          name: 'Industrial Parts Malaysia',
          rating: 4.6,
          responseTime: '< 4 hours',
          specialties: ['Mechanical', 'Safety'],
          verified: true,
          location: 'Penang'
        }
      ];
      
      setSupplierRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading supplier recommendations:', error);
    }
  };

  // Load featured products
  const loadFeaturedProducts = () => {
    const featured = enhancedProductCatalog
      .filter(product => product.popular)
      .slice(0, 4);
    setFeaturedProducts(featured);
  };

  // Start real-time supplier tracking
  const startRealTimeSupplierTracking = () => {
    // Simulate real-time supplier availability
    const interval = setInterval(() => {
      if (mountedRef.current) {
        const onlineSuppliers = Math.floor(Math.random() * 50) + 20;
        setRealTimeSuppliers(prev => [...prev.slice(-4), {
          timestamp: new Date(),
          count: onlineSuppliers
        }]);
      }
    }, 30000); // Update every 30 seconds

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  };

  // Enhanced form handlers
  const handleCompanyChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      company: { ...prev.company, [field]: value }
    }));
    
    // Clear error and update progress
    if (errors[`company.${field}`]) {
      setErrors(prev => ({ ...prev, [`company.${field}`]: '' }));
    }
    updateQuoteProgress();
  };

  const handleQuoteChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      quote: { ...prev.quote, [field]: value }
    }));
    
    // Clear error and update progress
    if (errors[`quote.${field}`]) {
      setErrors(prev => ({ ...prev, [`quote.${field}`]: '' }));
    }
    updateQuoteProgress();
    
    // Update estimated delivery if delivery date changes
    if (field === 'deliveryDate') {
      calculateEstimatedDelivery(value);
    }
  };

  const handlePreferencesChange = (field, value) => {
    setQuoteData(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [field]: value }
    }));
    updateQuoteProgress();
  };

  // Calculate estimated delivery times
  const calculateEstimatedDelivery = (deliveryDate) => {
    if (!deliveryDate) return;
    
    const targetDate = new Date(deliveryDate);
    const today = new Date();
    const diffTime = Math.abs(targetDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let urgencyLevel = 'standard';
    if (diffDays <= 1) urgencyLevel = 'rush';
    else if (diffDays <= 3) urgencyLevel = 'urgent';
    
    setEstimatedDelivery({
      days: diffDays,
      urgencyLevel,
      feasible: diffDays >= 1
    });
  };

  // Update quote completion progress
  const updateQuoteProgress = () => {
    const steps = [
      // Company info completion (25%)
      quoteData.company.name && quoteData.company.email && quoteData.company.phone,
      // Quote details completion (25%)
      quoteData.quote.title && quoteData.quote.description,
      // Items completion (25%)
      quoteData.items.length > 0,
      // Final review (25%)
      currentStep === 4
    ];
    
    const completedSteps = steps.filter(Boolean).length;
    const progress = (completedSteps / steps.length) * 100;
    setQuoteProgress(progress);
  };

  // Enhanced item management
  const addItem = (product = null) => {
    const newItem = product ? {
      id: Date.now(),
      productId: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory || '',
      specifications: product.specifications || {},
      quantity: 1,
      estimatedPrice: product.price || 0,
      currency: product.currency || 'MYR',
      notes: '',
      urgent: false,
      certificationNeeds: [],
      customizations: '',
      leadTimeAcceptable: true,
      alternativesAccepted: true
    } : {
      id: Date.now(),
      productId: null,
      name: '',
      brand: '',
      category: '',
      subcategory: '',
      specifications: {},
      quantity: 1,
      estimatedPrice: 0,
      currency: 'MYR',
      notes: '',
      urgent: false,
      certificationNeeds: [],
      customizations: '',
      leadTimeAcceptable: true,
      alternativesAccepted: true
    };

    setQuoteData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    
    setShowProductSearch(false);
    updateQuoteProgress();
    
    // Track item addition
    trackItemAddition(newItem);
  };

  const updateItem = (itemId, field, value) => {
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    }));
    updateQuoteProgress();
  };

  const removeItem = (itemId) => {
    setQuoteData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    updateQuoteProgress();
  };

  // Enhanced file handling with validation
  const handleFileUpload = (file) => {
    // Enhanced validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/dwg',
      'application/step',
      'application/iges'
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('File type not supported. Please upload PDF, DOC, Excel, Images, or CAD files.');
      return;
    }

    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }
    
    const newAttachment = {
      id: Date.now(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type,
      category: categorizeFile(file.type),
      uploadedAt: new Date().toISOString(),
      status: 'uploaded'
    };
    
    setQuoteData(prev => ({
      ...prev,
      attachments: [...prev.attachments, newAttachment]
    }));
    
    updateQuoteProgress();
  };

  // Categorize uploaded files
  const categorizeFile = (fileType) => {
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('pdf')) return 'document';
    if (fileType.includes('word')) return 'document';
    if (fileType.includes('excel') || fileType.includes('sheet')) return 'spreadsheet';
    if (fileType.includes('dwg') || fileType.includes('step') || fileType.includes('iges')) return 'cad';
    return 'other';
  };

  const removeAttachment = (attachmentId) => {
    setQuoteData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }));
    updateQuoteProgress();
  };

  // Enhanced product search with better filtering
  const searchProducts = (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    
    const searchTerm = term.toLowerCase();
    const results = enhancedProductCatalog.filter(product =>
      product.name.toLowerCase().includes(searchTerm) ||
      product.brand.toLowerCase().includes(searchTerm) ||
      product.category.toLowerCase().includes(searchTerm) ||
      product.subcategory?.toLowerCase().includes(searchTerm) ||
      Object.values(product.specifications).some(spec => 
        spec.toString().toLowerCase().includes(searchTerm)
      )
    );
    
    // Sort by relevance and popularity
    results.sort((a, b) => {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
      return 0;
    });
    
    setSearchResults(results);
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchProducts(productSearchTerm);
    }, 300);
    
    return () => clearTimeout(debounceTimer);
  }, [productSearchTerm]);

  // Import cart items with enhanced processing
  const importCartItems = () => {
    if (cartItems.length > 0) {
      const cartItemsFormatted = cartItems.map(cartItem => ({
        id: Date.now() + Math.random(),
        productId: cartItem.productId,
        name: cartItem.product?.name || 'Unknown Product',
        brand: cartItem.product?.brand || '',
        category: cartItem.product?.category || '',
        subcategory: cartItem.product?.subcategory || '',
        specifications: cartItem.product?.specifications || {},
        quantity: cartItem.quantity,
        estimatedPrice: cartItem.product?.price || 0,
        currency: cartItem.product?.currency || 'MYR',
        notes: '',
        urgent: false,
        certificationNeeds: [],
        customizations: '',
        leadTimeAcceptable: true,
        alternativesAccepted: true
      }));
      
      setQuoteData(prev => ({
        ...prev,
        items: [...prev.items, ...cartItemsFormatted]
      }));
      
      // Clear cart after import
      localStorage.removeItem('higgsflow_cart');
      setCartItems([]);
      updateQuoteProgress();
      
      // Track cart import
      trackCartImport(cartItemsFormatted.length);
    }
  };

  // Enhanced validation with detailed checks
  const validateStep = (step) => {
    const newErrors = {};
    
    switch (step) {
      case 1:
        if (!quoteData.company.name.trim()) newErrors['company.name'] = 'Company name is required';
        if (!quoteData.company.contactPerson.trim()) newErrors['company.contactPerson'] = 'Contact person is required';
        if (!quoteData.company.email.trim()) {
          newErrors['company.email'] = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(quoteData.company.email)) {
          newErrors['company.email'] = 'Please enter a valid email address';
        }
        if (!quoteData.company.phone.trim()) {
          newErrors['company.phone'] = 'Phone is required';
        } else if (!/^[\+]?[0-9\s\-\(\)]{8,}$/.test(quoteData.company.phone)) {
          newErrors['company.phone'] = 'Please enter a valid phone number';
        }
        break;
        
      case 2:
        if (!quoteData.quote.title.trim()) newErrors['quote.title'] = 'Quote title is required';
        if (quoteData.quote.title.length < 10) newErrors['quote.title'] = 'Title should be at least 10 characters';
        if (!quoteData.quote.description.trim()) newErrors['quote.description'] = 'Description is required';
        if (quoteData.quote.description.length < 20) newErrors['quote.description'] = 'Description should be at least 20 characters';
        break;
        
      case 3:
        if (quoteData.items.length === 0) newErrors['items'] = 'At least one item is required';
        quoteData.items.forEach((item, index) => {
          if (!item.name.trim()) newErrors[`item.${index}.name`] = 'Item name is required';
          if (item.quantity <= 0) newErrors[`item.${index}.quantity`] = 'Quantity must be greater than 0';
          if (item.estimatedPrice < 0) newErrors[`item.${index}.price`] = 'Price cannot be negative';
        });
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced navigation with progress tracking
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
      trackStepCompletion(currentStep);
      updateQuoteProgress();
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    updateQuoteProgress();
  };

  // Enhanced submit with comprehensive processing
  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    
    setSubmitting(true);
    
    try {
      // Prepare comprehensive quote data
      const enhancedQuoteData = {
        ...quoteData,
        submittedAt: new Date().toISOString(),
        quoteId: `HF-${Date.now()}`,
        status: 'submitted',
        estimatedValue: calculateTotalValue(),
        itemCount: quoteData.items.length,
        attachmentCount: quoteData.attachments.length
      };

      // Simulate enhanced API submission with real processing
      await submitQuoteToFirebase(enhancedQuoteData);
      
      // Send to analytics
      await trackQuoteSubmission(enhancedQuoteData);
      
      // Notify suppliers (simulate)
      await notifySuppliers(enhancedQuoteData);
      
      if (mountedRef.current) {
        setSuccess(true);
        
        // Auto-redirect after success
        setTimeout(() => {
          if (mountedRef.current) {
            navigate('/catalog', { 
              state: { 
                message: 'Quote submitted successfully! Check your email for updates.',
                quoteId: enhancedQuoteData.quoteId
              }
            });
          }
        }, 4000);
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

  // Calculate total estimated value
  const calculateTotalValue = () => {
    return quoteData.items.reduce((sum, item) => 
      sum + (item.quantity * item.estimatedPrice), 0
    );
  };

  // Submit quote to Firebase
  const submitQuoteToFirebase = async (quoteData) => {
    try {
      // Use enhanced service if available
      if (typeof EnhancedEcommerceFirebaseService !== 'undefined') {
        await EnhancedEcommerceFirebaseService.submitQuoteRequest(quoteData);
      } else {
        // Fallback to localStorage for demo
        const quotes = JSON.parse(localStorage.getItem('higgsflow_quotes') || '[]');
        quotes.push(quoteData);
        localStorage.setItem('higgsflow_quotes', JSON.stringify(quotes));
      }
    } catch (error) {
      console.error('Firebase submission failed:', error);
      throw error;
    }
  };

  // Notify suppliers
  const notifySuppliers = async (quoteData) => {
    // Simulate supplier notification system
    return new Promise(resolve => setTimeout(resolve, 1000));
  };

  // Analytics tracking functions
  const trackQuotePageView = () => {
    if (typeof AnalyticsService !== 'undefined') {
      AnalyticsService.trackEvent('quote_page_view', {
        source: quoteData.metadata.source,
        timestamp: new Date().toISOString()
      });
    }
  };

  const trackStepCompletion = (step) => {
    if (typeof AnalyticsService !== 'undefined') {
      AnalyticsService.trackEvent('quote_step_completed', {
        step,
        progress: quoteProgress,
        timestamp: new Date().toISOString()
      });
    }
  };

  const trackItemAddition = (item) => {
    if (typeof AnalyticsService !== 'undefined') {
      AnalyticsService.trackEvent('quote_item_added', {
        productId: item.productId,
        category: item.category,
        estimatedPrice: item.estimatedPrice
      });
    }
  };

  const trackCartImport = (itemCount) => {
    if (typeof AnalyticsService !== 'undefined') {
      AnalyticsService.trackEvent('cart_imported_to_quote', {
        itemCount,
        timestamp: new Date().toISOString()
      });
    }
  };

  const trackQuoteSubmission = async (quoteData) => {
    if (typeof AnalyticsService !== 'undefined') {
      await AnalyticsService.trackEvent('quote_submitted', {
        quoteId: quoteData.quoteId,
        totalValue: quoteData.estimatedValue,
        itemCount: quoteData.itemCount,
        company: quoteData.company.name,
        urgency: quoteData.quote.urgency
      });
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Initializing quote request system...</p>
        </div>
      </div>
    );
  }

  // Enhanced success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-lg w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="relative mb-6">
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                <Zap className="w-3 h-3 inline mr-1" />
                Live
              </div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Quote Request Submitted Successfully!
            </h2>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-medium mb-2">
                Quote ID: HF-{Date.now()}
              </p>
              <p className="text-green-700 text-sm">
                Your request has been sent to {supplierRecommendations.length + 3} verified suppliers
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <p className="font-medium text-blue-900">Expected Quotes</p>
                <p className="text-blue-700">3-5 suppliers</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                <p className="font-medium text-purple-900">Response Time</p>
                <p className="text-purple-700">24-48 hours</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-3 flex items-center justify-center gap-2">
                <FileCheck className="w-5 h-5" />
                What Happens Next?
              </h3>
              <ul className="text-sm text-blue-800 text-left space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <span>Suppliers review your requirements and specifications</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <span>You'll receive competitive quotes via email and dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <span>Compare prices, terms, and supplier capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                  <span>Negotiate and convert approved quotes to purchase orders</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate('/catalog')}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Continue Shopping
              </button>
              <button
                onClick={() => navigate('/factory/dashboard')}
                className="flex-1 border border-gray-300 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                View Dashboard
              </button>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Need help? Contact our support team at quotes@higgsflow.com
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Real-time Status */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </button>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Request Quote</h1>
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  {realTimeSuppliers.length > 0 ? 
                    `${realTimeSuppliers[realTimeSuppliers.length - 1]?.count || 35} suppliers online` :
                    '35+ suppliers online'
                  }
                </div>
              </div>
              <p className="text-gray-600">Get competitive quotes from verified Malaysian suppliers</p>
            </div>
            
            {/* Enhanced Progress indicator */}
            <div className="flex flex-col items-end">
              <div className="flex items-center space-x-2 mb-2">
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      step < currentStep
                        ? 'bg-green-500 text-white'
                        : step === currentStep
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {step < currentStep ? <CheckCircle className="w-5 h-5" /> : step}
                  </div>
                ))}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${quoteProgress}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 mt-1">{Math.round(quoteProgress)}% complete</span>
            </div>
          </div>

          {/* Real-time supplier status bar */}
          {supplierRecommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Top-rated suppliers ready to quote
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {supplierRecommendations.slice(0, 3).map((supplier, idx) => (
                    <div
                      key={supplier.id}
                      className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
                      title={supplier.name}
                    >
                      {supplier.name.charAt(0)}
                    </div>
                  ))}
                  {supplierRecommendations.length > 3 && (
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-xs border-2 border-white">
                      +{supplierRecommendations.length - 3}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main quote form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md">
              {/* Enhanced step indicator */}
              <div className="border-b border-gray-200 px-8 py-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {currentStep === 1 && 'Company Information'}
                      {currentStep === 2 && 'Quote Details'}
                      {currentStep === 3 && 'Items & Specifications'}
                      {currentStep === 4 && 'Review & Submit'}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentStep === 1 && 'Tell us about your company'}
                      {currentStep === 2 && 'Provide project details and requirements'}
                      {currentStep === 3 && 'Add products and specifications'}
                      {currentStep === 4 && 'Review and submit your quote request'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Step {currentStep} of 4</span>
                    <div className="text-xs text-gray-400 mt-1">
                      {currentStep === 1 && 'Basic information required'}
                      {currentStep === 2 && 'Project details required'}
                      {currentStep === 3 && 'At least 1 item required'}
                      {currentStep === 4 && 'Ready to submit'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Step 1: Enhanced Company Information */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Import cart notification with enhanced design */}
                    {cartItems.length > 0 && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <ShoppingCart className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-blue-900">Items in Cart</p>
                              <p className="text-sm text-blue-700">
                                You have {cartItems.length} items in your cart. Import them to this quote?
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={importCartItems}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
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
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors['company.name'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Your company name"
                        />
                        {errors['company.name'] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors['company.name']}
                          </p>
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
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors['company.contactPerson'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Full name"
                        />
                        {errors['company.contactPerson'] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors['company.contactPerson']}
                          </p>
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
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors['company.email'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="contact@company.com"
                        />
                        {errors['company.email'] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors['company.email']}
                          </p>
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
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                            errors['company.phone'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="+60 3-1234 5678"
                        />
                        {errors['company.phone'] && (
                          <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors['company.phone']}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Factory className="w-4 h-4 inline mr-1" />
                          Industry
                        </label>
                        <select
                          value={quoteData.company.industry}
                          onChange={(e) => handleCompanyChange('industry', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select industry</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Electronics">Electronics & Technology</option>
                          <option value="Automotive">Automotive</option>
                          <option value="Construction">Construction & Infrastructure</option>
                          <option value="Food & Beverage">Food & Beverage</option>
                          <option value="Pharmaceutical">Pharmaceutical & Healthcare</option>
                          <option value="Oil & Gas">Oil & Gas</option>
                          <option value="Textile">Textile & Apparel</option>
                          <option value="Chemical">Chemical & Petrochemical</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Users className="w-4 h-4 inline mr-1" />
                          Company Size
                        </label>
                        <select
                          value={quoteData.company.companySize}
                          onChange={(e) => handleCompanyChange('companySize', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select size</option>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Registration Number
                        </label>
                        <input
                          type="text"
                          value={quoteData.company.registrationNumber}
                          onChange={(e) => handleCompanyChange('registrationNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g., 123456-A"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Globe className="w-4 h-4 inline mr-1" />
                          Preferred Language
                        </label>
                        <select
                          value={quoteData.company.preferredLanguage}
                          onChange={(e) => handleCompanyChange('preferredLanguage', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="en">English</option>
                          <option value="ms">Bahasa Malaysia</option>
                          <option value="zh">中文</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Enhanced Quote Details */}
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
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors['quote.title'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., Industrial Equipment for Production Line Upgrade"
                      />
                      {errors['quote.title'] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors['quote.title']}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {quoteData.quote.title.length}/100 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Detailed Description *
                      </label>
                      <textarea
                        value={quoteData.quote.description}
                        onChange={(e) => handleQuoteChange('description', e.target.value)}
                        rows="4"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                          errors['quote.description'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Provide detailed description of your requirements, intended use, quality standards, compliance needs, installation requirements, etc."
                      />
                      {errors['quote.description'] && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors['quote.description']}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {quoteData.quote.description.length}/1000 characters
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                        {estimatedDelivery && (
                          <p className={`mt-1 text-xs ${
                            estimatedDelivery.feasible ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {estimatedDelivery.feasible ? 
                              `Feasible - ${estimatedDelivery.days} days available` :
                              'Very tight timeline - rush order required'
                            }
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <DollarSign className="w-4 h-4 inline mr-1" />
                          Payment Terms
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
                          <option value="LC">Letter of Credit</option>
                          <option value="Advance">Advance Payment</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Project Type
                        </label>
                        <select
                          value={quoteData.quote.projectType}
                          onChange={(e) => handleQuoteChange('projectType', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="regular">Regular Purchase</option>
                          <option value="maintenance">Maintenance & Repair</option>
                          <option value="upgrade">Equipment Upgrade</option>
                          <option value="expansion">Facility Expansion</option>
                          <option value="replacement">Equipment Replacement</option>
                          <option value="trial">Trial/Sample Order</option>
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
                          <option value="100k_500k">RM 100,000 - RM 500,000</option>
                          <option value="above_500k">Above RM 500,000</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
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
                        Additional Requirements & Specifications
                      </label>
                      <textarea
                        value={quoteData.quote.additionalRequirements}
                        onChange={(e) => handleQuoteChange('additionalRequirements', e.target.value)}
                        rows="4"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Special requirements, certifications needed, installation services, training requirements, warranty terms, compliance standards, etc."
                      />
                    </div>

                    {/* Enhanced service requirements */}
                    <div className="border-t pt-6">
                      <h4 className="font-medium text-gray-900 mb-4">Service Requirements</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={quoteData.quote.requiresInstallation}
                            onChange={(e) => handleQuoteChange('requiresInstallation', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium">Installation Required</span>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={quoteData.quote.requiresTraining}
                            onChange={(e) => handleQuoteChange('requiresTraining', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium">Training Required</span>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={quoteData.quote.requiresWarranty}
                            onChange={(e) => handleQuoteChange('requiresWarranty', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium">Extended Warranty</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Enhanced Items & Specifications */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Quote Items</h3>
                        <p className="text-sm text-gray-600">Add products and specifications</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowProductSearch(true)}
                          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                          Search Products
                        </button>
                        <button
                          onClick={() => addItem()}
                          className="flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
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

                    {/* Enhanced Product search modal */}
                    {showProductSearch && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[80vh] overflow-y-auto">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-medium">Search Industrial Products</h3>
                              <p className="text-sm text-gray-600">Find products from our verified supplier catalog</p>
                            </div>
                            <button
                              onClick={() => setShowProductSearch(false)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-6 h-6" />
                            </button>
                          </div>
                          
                          <div className="mb-6">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                              <input
                                type="text"
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                placeholder="Search by product name, brand, category, or specifications..."
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>

                          {/* Featured products when no search */}
                          {!productSearchTerm && featuredProducts.length > 0 && (
                            <div className="mb-6">
                              <h4 className="font-medium text-gray-900 mb-3">Featured Products</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {featuredProducts.map(product => (
                                  <div
                                    key={product.id}
                                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => addItem(product)}
                                  >
                                    <div className="flex items-center gap-4">
                                      <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-16 h-16 object-cover rounded"
                                      />
                                      <div className="flex-1">
                                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                                        <p className="text-sm text-gray-600">{product.brand} • {product.category}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-sm font-medium text-blue-600">RM {product.price}</span>
                                          <span className={`text-xs px-2 py-1 rounded-full ${
                                            product.availability === 'in_stock' 
                                              ? 'bg-green-100 text-green-800' 
                                              : 'bg-yellow-100 text-yellow-800'
                                          }`}>
                                            {product.availability === 'in_stock' ? 'In Stock' : 'Made to Order'}
                                          </span>
                                          {product.popular && (
                                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                          )}
                                        </div>
                                      </div>
                                      <Plus className="w-5 h-5 text-gray-400" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Search results */}
                          <div className="space-y-3">
                            {searchResults.map(product => (
                              <div
                                key={product.id}
                                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                onClick={() => addItem(product)}
                              >
                                <div className="flex items-start gap-4">
                                  <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-16 h-16 object-cover rounded"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <h4 className="font-medium text-gray-900">{product.name}</h4>
                                        <p className="text-sm text-gray-600">{product.brand} • {product.category}</p>
                                        {product.subcategory && (
                                          <p className="text-xs text-gray-500">{product.subcategory}</p>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="text-lg font-medium text-blue-600">RM {product.price}</p>
                                        <p className="text-xs text-gray-500">Lead time: {product.leadTime}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="mt-2 flex items-center gap-4">
                                      <span className={`text-xs px-2 py-1 rounded-full ${
                                        product.availability === 'in_stock' 
                                          ? 'bg-green-100 text-green-800' 
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {product.availability === 'in_stock' ? 'In Stock' : 'Made to Order'}
                                      </span>
                                      
                                      {product.certifications && product.certifications.length > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Shield className="w-3 h-3 text-green-600" />
                                          <span className="text-xs text-green-600">
                                            {product.certifications.join(', ')}
                                          </span>
                                        </div>
                                      )}
                                      
                                      {product.popular && (
                                        <div className="flex items-center gap-1">
                                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                          <span className="text-xs text-yellow-600">Popular</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Specifications preview */}
                                    {product.specifications && Object.keys(product.specifications).length > 0 && (
                                      <div className="mt-2 text-xs text-gray-600">
                                        {Object.entries(product.specifications).slice(0, 3).map(([key, value]) => (
                                          <span key={key} className="mr-3">
                                            {key}: {value}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Plus className="w-5 h-5 text-gray-400" />
                                </div>
                              </div>
                            ))}
                            
                            {productSearchTerm && searchResults.length === 0 && (
                              <div className="text-center py-12 text-gray-500">
                                <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-medium mb-2">No products found</h3>
                                <p>Try different search terms or add a custom item instead.</p>
                                <button
                                  onClick={() => {
                                    setShowProductSearch(false);
                                    addItem();
                                  }}
                                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                  Add Custom Item
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Enhanced Items list */}
                    <div className="space-y-4">
                      {quoteData.items.map((item, index) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-6 bg-white">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                                {item.urgent && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Urgent
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2">
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
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" />
                                  {errors[`item.${index}.name`]}
                                </p>
                              )}
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
                                <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-4 h-4" />
                                  {errors[`item.${index}.quantity`]}
                                </p>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Brand/Manufacturer
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
                                <option value="Automation">Automation</option>
                                <option value="Power">Power & Electrical</option>
                                <option value="Material Handling">Material Handling</option>
                                <option value="Other">Other</option>
                              </select>
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
                          </div>

                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Technical Specifications & Requirements
                            </label>
                            <textarea
                              value={item.notes}
                              onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                              rows="3"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Technical specifications, model numbers, dimensions, materials, performance requirements, compliance standards, etc."
                            />
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.urgent}
                                  onChange={(e) => updateItem(item.id, 'urgent', e.target.checked)}
                                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-700">Mark as urgent</span>
                              </label>
                              
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={item.alternativesAccepted}
                                  onChange={(e) => updateItem(item.id, 'alternativesAccepted', e.target.checked)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Accept alternatives</span>
                              </label>
                            </div>
                            
                            {item.estimatedPrice > 0 && (
                              <div className="text-right">
                                <span className="text-sm text-gray-500">Subtotal: </span>
                                <span className="font-medium text-gray-900">
                                  RM {(item.quantity * item.estimatedPrice).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {quoteData.items.length === 0 && (
                        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
                          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No items added yet</h3>
                          <p className="text-gray-600 mb-6">
                            Search our product catalog or add custom items to your quote request
                          </p>
                          <div className="flex justify-center gap-3">
                            <button
                              onClick={() => setShowProductSearch(true)}
                              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Search className="w-4 h-4" />
                              Browse Product Catalog
                            </button>
                            <button
                              onClick={() => addItem()}
                              className="flex items-center gap-2 border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              Add Custom Item
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Total estimation */}
                      {quoteData.items.length > 0 && quoteData.items.some(item => item.estimatedPrice > 0) && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">Total Estimated Value:</span>
                            <span className="text-xl font-bold text-blue-600">
                              RM {calculateTotalValue().toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            This is an estimate. Final prices may vary based on specifications and market conditions.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Attachments section */}
                    <div className="border-t pt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Technical Documents & Attachments
                      </label>
                      <p className="text-sm text-gray-600 mb-4">
                        Upload technical drawings, specifications, datasheets, photos, or other relevant documents to help suppliers provide accurate quotes
                      </p>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.dwg,.step,.iges,.zip,.rar"
                          onChange={(e) => {
                            Array.from(e.target.files).forEach(file => handleFileUpload(file));
                            e.target.value = '';
                          }}
                          className="hidden"
                        />
                        
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Click to upload files or drag and drop
                          </button>
                          <p className="text-sm text-gray-500 mt-2">
                            Supported: PDF, DOC, Excel, Images, CAD files (Max 10MB each)
                          </p>
                        </div>
                      </div>

                      {quoteData.attachments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h5 className="font-medium text-gray-900">Uploaded Files ({quoteData.attachments.length})</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {quoteData.attachments.map(attachment => (
                              <div
                                key={attachment.id}
                                className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-2 rounded ${
                                    attachment.category === 'image' ? 'bg-green-100 text-green-600' :
                                    attachment.category === 'document' ? 'bg-blue-100 text-blue-600' :
                                    attachment.category === 'cad' ? 'bg-purple-100 text-purple-600' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 truncate max-w-48">
                                      {attachment.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {(attachment.size / 1024 / 1024).toFixed(2)} MB • {attachment.category}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => removeAttachment(attachment.id)}
                                  className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Remove file"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 4: Enhanced Review & Submit */}
                {currentStep === 4 && (
                  <div className="space-y-8">
                    {/* Enhanced review header */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 p-3 rounded-full">
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-blue-900 mb-2">Review Your Quote Request</h3>
                          <p className="text-sm text-blue-800">
                            Please review all information carefully before submitting. Your request will be sent to our network of verified suppliers who will respond with competitive quotes within 24-48 hours.
                          </p>
                          
                          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="font-medium text-gray-900">{quoteData.items.length}</div>
                              <div className="text-gray-600">Items</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="font-medium text-gray-900">{quoteData.attachments.length}</div>
                              <div className="text-gray-600">Attachments</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="font-medium text-gray-900">5-8</div>
                              <div className="text-gray-600">Expected Quotes</div>
                            </div>
                            <div className="bg-white rounded-lg p-3 text-center">
                              <div className="font-medium text-gray-900">24-48h</div>
                              <div className="text-gray-600">Response Time</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Company Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-gray-600" />
                          <h4 className="text-lg font-medium text-gray-900">Company Information</h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(1)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                      
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Company</dt>
                              <dd className="text-sm text-gray-900">{quoteData.company.name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Contact Person</dt>
                              <dd className="text-sm text-gray-900">{quoteData.company.contactPerson}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Email</dt>
                              <dd className="text-sm text-gray-900">{quoteData.company.email}</dd>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Phone</dt>
                              <dd className="text-sm text-gray-900">{quoteData.company.phone}</dd>
                            </div>
                            {quoteData.company.industry && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Industry</dt>
                                <dd className="text-sm text-gray-900">{quoteData.company.industry}</dd>
                              </div>
                            )}
                            {quoteData.company.companySize && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Company Size</dt>
                                <dd className="text-sm text-gray-900">{quoteData.company.companySize}</dd>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {quoteData.company.address && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                            <dd className="text-sm text-gray-900 mt-1">{quoteData.company.address}</dd>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Quote Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <h4 className="text-lg font-medium text-gray-900">Quote Details</h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                      
                      <div className="p-6">
                        <h5 className="font-medium text-gray-900 mb-2">{quoteData.quote.title}</h5>
                        <p className="text-gray-700 mb-4">{quoteData.quote.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <dt className="font-medium text-gray-700">Urgency Level</dt>
                            <dd className="text-gray-600 capitalize">{quoteData.quote.urgency}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-700">Payment Terms</dt>
                            <dd className="text-gray-600">{quoteData.quote.paymentTerms}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-gray-700">Project Type</dt>
                            <dd className="text-gray-600 capitalize">{quoteData.quote.projectType}</dd>
                          </div>
                          
                          {quoteData.quote.deliveryDate && (
                            <div>
                              <dt className="font-medium text-gray-700">Required Delivery</dt>
                              <dd className="text-gray-600">{new Date(quoteData.quote.deliveryDate).toLocaleDateString()}</dd>
                            </div>
                          )}
                          
                          {quoteData.preferences.budgetRange && (
                            <div>
                              <dt className="font-medium text-gray-700">Budget Range</dt>
                              <dd className="text-gray-600">{quoteData.preferences.budgetRange.replace('_', ' - RM ')}</dd>
                            </div>
                          )}
                        </div>

                        {/* Service requirements */}
                        {(quoteData.quote.requiresInstallation || quoteData.quote.requiresTraining || quoteData.quote.requiresWarranty) && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <dt className="font-medium text-gray-700 mb-2">Additional Services Required</dt>
                            <div className="flex flex-wrap gap-2">
                              {quoteData.quote.requiresInstallation && (
                                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Installation</span>
                              )}
                              {quoteData.quote.requiresTraining && (
                                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Training</span>
                              )}
                              {quoteData.quote.requiresWarranty && (
                                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">Extended Warranty</span>
                              )}
                            </div>
                          </div>
                        )}

                        {quoteData.quote.additionalRequirements && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <dt className="font-medium text-gray-700">Additional Requirements</dt>
                            <dd className="text-gray-600 mt-1">{quoteData.quote.additionalRequirements}</dd>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Items Summary */}
                    <div className="bg-white border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-gray-600" />
                          <h4 className="text-lg font-medium text-gray-900">
                            Quote Items ({quoteData.items.length})
                          </h4>
                        </div>
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {quoteData.items.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4">
                                    <div>
                                      <p className="font-medium text-gray-900">{item.name}</p>
                                      {item.brand && <p className="text-sm text-gray-600">{item.brand}</p>}
                                      <div className="flex items-center gap-2 mt-1">
                                        {item.urgent && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Urgent
                                          </span>
                                        )}
                                        {item.alternativesAccepted && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            Alternatives OK
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-600">{item.category || '-'}</td>
                                  <td className="px-6 py-4 text-sm text-gray-900">{item.quantity}</td>
                                  <td className="px-6 py-4 text-sm text-gray-900">
                                    {item.estimatedPrice > 0 ? `RM ${item.estimatedPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {item.estimatedPrice > 0 ? 
                                      `RM ${(item.quantity * item.estimatedPrice).toLocaleString('en-MY', { minimumFractionDigits: 2 })}` : 
                                      '-'
                                    }
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {quoteData.items.some(item => item.estimatedPrice > 0) && (
                          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">Total Estimated Value:</span>
                              <span className="text-xl font-bold text-blue-600">
                                RM {calculateTotalValue().toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              Final prices may vary based on market conditions and supplier terms
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Attachments Summary */}
                    {quoteData.attachments.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-lg">
                        <div className="p-6 border-b border-gray-200">
                          <h4 className="text-lg font-medium text-gray-900 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-gray-600" />
                            Attachments ({quoteData.attachments.length})
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {quoteData.attachments.map(attachment => (
                              <div key={attachment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className={`p-2 rounded ${
                                  attachment.category === 'image' ? 'bg-green-100 text-green-600' :
                                  attachment.category === 'document' ? 'bg-blue-100 text-blue-600' :
                                  attachment.category === 'cad' ? 'bg-purple-100 text-purple-600' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{attachment.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit errors */}
                    {errors.submit && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-700 text-sm">{errors.submit}</span>
                      </div>
                    )}
                    
                    {/* Final submission notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h5 className="font-medium text-amber-900">Before You Submit</h5>
                          <ul className="text-sm text-amber-800 mt-2 space-y-1">
                            <li>• Your request will be shared with verified suppliers in our network</li>
                            <li>• You'll receive competitive quotes via email and your dashboard</li>
                            <li>• Quotes are typically valid for 30 days unless specified otherwise</li>
                            <li>• Our team may contact you for clarification if needed</li>
                            <li>• All supplier communications are tracked for quality assurance</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Enhanced Navigation buttons */}
                <div className="flex justify-between pt-8 border-t border-gray-200">
                  {currentStep > 1 ? (
                    <button
                      onClick={prevStep}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Previous Step
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/catalog')}
                      className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancel Request
                    </button>
                  )}

                  {currentStep < 4 ? (
                    <button
                      onClick={nextStep}
                      className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Next Step
                      <ArrowLeft className="w-4 h-4 rotate-180" />
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
                        <>
                          <Send className="w-5 h-5" />
                          Submit Quote Request
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Real-time supplier status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Supplier Network Status
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Online Suppliers</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="font-medium text-green-600">
                      {realTimeSuppliers.length > 0 ? 
                        realTimeSuppliers[realTimeSuppliers.length - 1]?.count || 42 : 42
                      }
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Response Rate</span>
                  <span className="font-medium text-gray-900">94%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg. Response Time</span>
                  <span className="font-medium text-gray-900">18 hours</span>
                </div>
              </div>

              {supplierRecommendations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Top Suppliers for Your Industry</h4>
                  <div className="space-y-2">
                    {supplierRecommendations.slice(0, 3).map(supplier => (
                      <div key={supplier.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          {supplier.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{supplier.name}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${
                                  i < Math.floor(supplier.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`} />
                              ))}
                            </div>
                            <span className="text-xs text-gray-500">{supplier.rating}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Progress summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Quote Progress
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Completion</span>
                    <span className="font-medium">{Math.round(quoteProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${quoteProgress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${
                      quoteData.company.name && quoteData.company.email ? 'text-green-500' : 'text-gray-300'
                    }`} />
                    <span className={
                      quoteData.company.name && quoteData.company.email ? 'text-gray-900' : 'text-gray-500'
                    }>
                      Company Information
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${
                      quoteData.quote.title && quoteData.quote.description ? 'text-green-500' : 'text-gray-300'
                    }`} />
                    <span className={
                      quoteData.quote.title && quoteData.quote.description ? 'text-gray-900' : 'text-gray-500'
                    }>
                      Quote Details
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${
                      quoteData.items.length > 0 ? 'text-green-500' : 'text-gray-300'
                    }`} />
                    <span className={
                      quoteData.items.length > 0 ? 'text-gray-900' : 'text-gray-500'
                    }>
                      Items Added ({quoteData.items.length})
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${
                      currentStep === 4 ? 'text-green-500' : 'text-gray-300'
                    }`} />
                    <span className={
                      currentStep === 4 ? 'text-gray-900' : 'text-gray-500'
                    }>
                      Ready to Submit
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Need Help?
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Best Practices</h4>
                  <ul className="text-sm opacity-90 space-y-1">
                    <li>• Provide detailed specifications for accurate quotes</li>
                    <li>• Include technical drawings and datasheets when possible</li>
                    <li>• Specify quality standards and certifications clearly</li>
                    <li>• Be realistic about delivery timelines</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Response Timeline</h4>
                  <ul className="text-sm opacity-90 space-y-1">
                    <li>• Standard: 24-48 business hours</li>
                    <li>• Urgent: 12-24 hours</li>
                    <li>• Rush: 4-8 hours</li>
                    <li>• Complex items may require additional time</li>
                  </ul>
                </div>
                
                <div className="pt-4 border-t border-green-500">
                  <h4 className="font-semibold mb-2">Contact Support</h4>
                  <div className="space-y-2 text-sm opacity-90">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>+60 3-7890 1234</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>quotes@higgsflow.com</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      <span>Live Chat Available</span>
                    </div>
                  </div>
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
