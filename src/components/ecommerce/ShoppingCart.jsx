// src/components/ecommerce/ShoppingCart.jsx - Enhanced with Advanced Features
import React, { useState, useEffect, useRef } from 'react';
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
  LogIn,
  Crown,
  Tag,
  History,
  TrendingDown,
  Info,
  Calendar,
  Package,
  Star,
  Globe,
  Shield,
  Clock,
  Save,
  Share2,
  Download,
  Eye,
  Building2,
  MapPin,
  Phone,
  Mail,
  Zap,
  TrendingUp,
  Award,
  RefreshCw
} from 'lucide-react';

// Enhanced pricing and ecommerce services with fallbacks
let EnhancedEcommerceFirebaseService, AnalyticsService, PricingService;
try {
  EnhancedEcommerceFirebaseService = require('../../services/ecommerce/EnhancedEcommerceFirebaseService').EnhancedEcommerceFirebaseService;
} catch (e) {
  EnhancedEcommerceFirebaseService = null;
}
try {
  AnalyticsService = require('../../services/AnalyticsService').AnalyticsService;
} catch (e) {
  AnalyticsService = null;
}
try {
  PricingService = require('../../services/pricingService').PricingService;
} catch (e) {
  PricingService = null;
}

const ShoppingCart = () => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  
  // Enhanced state management
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [cartPricing, setCartPricing] = useState({});
  const [pricingLoading, setPricingLoading] = useState(false);
  const [savedForLater, setSavedForLater] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [cartAnalytics, setCartAnalytics] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [supplierInfo, setSupplierInfo] = useState({});
  
  const [sessionId] = useState(() => {
    return sessionStorage.getItem('guest_session_id') || 
           'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  });

  // Enhanced Malaysian industrial product catalog
  const enhancedProductCatalog = {
    'product_123': {
      id: 'product_123',
      name: 'Industrial Steel Pipe DN50',
      brand: 'WASCO',
      category: 'Mechanical',
      subcategory: 'Pipes & Fittings',
      image: '/api/placeholder/100/100',
      specifications: {
        material: 'Carbon Steel',
        diameter: '50mm',
        length: '6m',
        standard: 'MS 930',
        grade: 'Grade B'
      },
      certifications: ['SIRIM', 'MS 930', 'ISO 9001'],
      basePrice: 125.50,
      currency: 'MYR',
      availability: 'in_stock',
      leadTime: '5-7 days',
      moq: 10,
      weight: 15.2,
      origin: 'Malaysia'
    },
    'product_456': {
      id: 'product_456',
      name: 'Hydraulic Valve Assembly HV-200',
      brand: 'Parker Hannifin',
      category: 'Hydraulics',
      subcategory: 'Valves',
      image: '/api/placeholder/100/100',
      specifications: {
        pressure: '200 bar',
        size: '1/2 inch',
        material: 'Stainless Steel 316',
        type: 'Ball Valve',
        connection: 'NPT'
      },
      certifications: ['CE', 'ISO 5599', 'ATEX'],
      basePrice: 850.00,
      currency: 'MYR',
      availability: 'limited_stock',
      leadTime: '3-5 days',
      moq: 1,
      weight: 2.8,
      origin: 'Germany'
    },
    'product_789': {
      id: 'product_789',
      name: 'ABB Variable Frequency Drive ACS580',
      brand: 'ABB',
      category: 'Electronics',
      subcategory: 'Variable Frequency Drives',
      image: '/api/placeholder/100/100',
      specifications: {
        power: '5.5kW',
        voltage: '380-480V',
        frequency: '50/60Hz',
        protection: 'IP21',
        control: 'Vector Control'
      },
      certifications: ['CE', 'UL', 'SIRIM', 'C-Tick'],
      basePrice: 1850.00,
      currency: 'MYR',
      availability: 'in_stock',
      leadTime: '2-3 days',
      moq: 1,
      weight: 8.5,
      origin: 'Finland'
    }
  };

  // Enhanced supplier information
  const supplierDatabase = {
    'Steel Components Malaysia': {
      id: 'supplier_001',
      name: 'Steel Components Malaysia',
      rating: 4.8,
      location: 'Shah Alam, Selangor',
      verified: true,
      specialties: ['Steel Products', 'Pipes', 'Fittings'],
      responseTime: '< 2 hours',
      deliveryAreas: ['Klang Valley', 'Selangor', 'KL'],
      paymentTerms: ['NET 30', 'LC', 'COD'],
      certifications: ['ISO 9001', 'SIRIM Approved']
    },
    'Precision Engineering Sdn Bhd': {
      id: 'supplier_002',
      name: 'Precision Engineering Sdn Bhd',
      rating: 4.6,
      location: 'Penang Industrial Zone',
      verified: true,
      specialties: ['Hydraulics', 'Pneumatics', 'Precision Parts'],
      responseTime: '< 4 hours',
      deliveryAreas: ['Northern Malaysia', 'Nationwide'],
      paymentTerms: ['NET 30', 'NET 60', 'Advance Payment'],
      certifications: ['ISO 9001', 'ISO 14001']
    },
    'TechnoMalaysia Automation': {
      id: 'supplier_003',
      name: 'TechnoMalaysia Automation',
      rating: 4.9,
      location: 'Cyberjaya, Selangor',
      verified: true,
      specialties: ['Electronics', 'Automation', 'Controls'],
      responseTime: '< 1 hour',
      deliveryAreas: ['Nationwide', 'ASEAN Export'],
      paymentTerms: ['NET 15', 'NET 30', 'LC'],
      certifications: ['ISO 9001', 'IEC 61508', 'SIRIM']
    }
  };

  // Component initialization
  useEffect(() => {
    mountedRef.current = true;
    initializeCart();
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initialize cart with enhanced features
  const initializeCart = async () => {
    try {
      setLoading(true);
      
      // Load user session data
      await loadUserSession();
      
      // Load cart data
      await loadCartData();
      
      // Load saved items
      loadSavedForLater();
      
      // Load recent analytics
      await loadCartAnalytics();
      
      // Track cart view
      trackCartPageView();
      
    } catch (error) {
      console.error('Cart initialization failed:', error);
      setError('Failed to load cart. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Load user session with enhanced detection
  const loadUserSession = async () => {
    try {
      // Check for factory session
      const factorySession = localStorage.getItem('factorySession');
      if (factorySession) {
        const sessionData = JSON.parse(factorySession);
        setCurrentUser({
          id: sessionData.userId || 'client_techflow',
          name: sessionData.companyName || 'TechFlow Solutions',
          email: sessionData.email || 'procurement@techflow.com',
          isLoggedIn: true,
          tier: sessionData.tier || 'tier_2',
          companyInfo: {
            registrationNumber: sessionData.registrationNumber,
            industry: sessionData.industry,
            address: sessionData.address
          }
        });
        setClientId(sessionData.userId || 'client_techflow');
      } else {
        // Guest user
        setCurrentUser({
          id: sessionId,
          name: 'Guest User',
          email: null,
          isLoggedIn: false,
          tier: 'guest'
        });
        setClientId(null);
      }
      
      setSessionData({ sessionId, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error loading user session:', error);
    }
  };

  // Load cart data with enhanced structure
  const loadCartData = async () => {
    try {
      // Try to load from enhanced service first
      let cartData = [];
      
      if (EnhancedEcommerceFirebaseService && currentUser?.isLoggedIn) {
        try {
          cartData = await EnhancedEcommerceFirebaseService.getCartItems(currentUser.id);
        } catch (error) {
          console.warn('Enhanced service failed, using fallback:', error);
        }
      }
      
      // Fallback to localStorage
      if (!cartData.length) {
        const savedCart = localStorage.getItem('higgsflow_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          cartData = parsed.items || [];
        }
      }
      
      // Use mock data if no saved cart
      if (!cartData.length) {
        cartData = generateMockCartData();
      }
      
      // Enhance cart items with product details
      const enhancedCartItems = cartData.map(item => ({
        ...item,
        productDetails: enhancedProductCatalog[item.productId] || {},
        supplierInfo: supplierDatabase[item.supplierName] || {},
        addedAt: item.addedAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }));
      
      setCartItems(enhancedCartItems);
      
      // Load pricing after items are set
      if (enhancedCartItems.length > 0) {
        await loadCartPricing(enhancedCartItems);
      }
      
      // Load supplier information
      loadSupplierInfo(enhancedCartItems);
      
    } catch (error) {
      console.error('Error loading cart data:', error);
    }
  };

  // Generate mock cart data for demo
  const generateMockCartData = () => {
    return [
      {
        id: 'cart_item_1',
        productId: 'product_123',
        productName: 'Industrial Steel Pipe DN50',
        supplierName: 'Steel Components Malaysia',
        quantity: 10,
        unitPrice: 125.50,
        totalPrice: 1255.00,
        addedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        id: 'cart_item_2',
        productId: 'product_456',
        productName: 'Hydraulic Valve Assembly HV-200',
        supplierName: 'Precision Engineering Sdn Bhd',
        quantity: 2,
        unitPrice: 850.00,
        totalPrice: 1700.00,
        addedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        id: 'cart_item_3',
        productId: 'product_789',
        productName: 'ABB Variable Frequency Drive ACS580',
        supplierName: 'TechnoMalaysia Automation',
        quantity: 1,
        unitPrice: 1850.00,
        totalPrice: 1850.00,
        addedAt: new Date().toISOString() // Today
      }
    ];
  };

  // Load enhanced pricing for cart items
  const loadCartPricing = async (items) => {
    if (!items.length) return;
    
    setPricingLoading(true);
    const pricingMap = {};

    try {
      for (const item of items) {
        try {
          let pricing;
          
          if (PricingService && clientId) {
            pricing = await PricingService.resolvePriceForClient(item.productId, clientId);
          } else {
            // Fallback pricing logic
            const basePrice = item.productDetails?.basePrice || item.unitPrice;
            pricing = {
              price: basePrice,
              type: 'base',
              source: 'fallback',
              currency: 'MYR'
            };
            
            // Simulate tier-based pricing for demo
            if (currentUser?.isLoggedIn) {
              const discount = currentUser.tier === 'tier_1' ? 0.20 : 
                              currentUser.tier === 'tier_2' ? 0.15 : 0.10;
              pricing = {
                price: basePrice * (1 - discount),
                type: 'tier-based',
                tier: currentUser.tier,
                discount: discount * 100,
                originalPrice: basePrice,
                source: 'tier_calculation',
                currency: 'MYR'
              };
            }
          }
          
          pricingMap[item.productId] = pricing;
        } catch (error) {
          console.error(`Error loading pricing for ${item.productId}:`, error);
          // Fallback to original price
          pricingMap[item.productId] = {
            price: item.unitPrice,
            type: 'base',
            source: 'fallback',
            currency: 'MYR'
          };
        }
      }

      setCartPricing(pricingMap);
      
      // Update cart items with real pricing
      setCartItems(prevItems => 
        prevItems.map(item => {
          const pricing = pricingMap[item.productId];
          const realPrice = pricing?.price || item.unitPrice;
          return {
            ...item,
            unitPrice: realPrice,
            totalPrice: realPrice * item.quantity,
            pricingInfo: pricing,
            lastUpdated: new Date().toISOString()
          };
        })
      );

    } catch (error) {
      console.error('Error loading cart pricing:', error);
    } finally {
      setPricingLoading(false);
    }
  };

  // Load supplier information
  const loadSupplierInfo = (items) => {
    const suppliers = {};
    items.forEach(item => {
      if (item.supplierName && supplierDatabase[item.supplierName]) {
        suppliers[item.supplierName] = supplierDatabase[item.supplierName];
      }
    });
    setSupplierInfo(suppliers);
  };

  // Load saved for later items
  const loadSavedForLater = () => {
    try {
      const saved = localStorage.getItem('higgsflow_saved_items');
      if (saved) {
        setSavedForLater(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading saved items:', error);
    }
  };

  // Load cart analytics
  const loadCartAnalytics = async () => {
    try {
      // Simulate cart analytics
      const analytics = {
        totalSessions: 15,
        averageCartValue: 2850,
        conversionRate: 68,
        abandonment: {
          rate: 32,
          stage: 'checkout',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        priceComparisons: 8,
        supplierViews: 12
      };
      
      setCartAnalytics(analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  // Enhanced cart operations
  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setCartItems(items =>
      items.map(item =>
        item.id === itemId
          ? { 
              ...item, 
              quantity: newQuantity, 
              totalPrice: item.unitPrice * newQuantity,
              lastUpdated: new Date().toISOString()
            }
          : item
      )
    );
    
    // Track quantity change
    trackCartItemUpdate(itemId, 'quantity_changed', newQuantity);
    
    // Save to persistent storage
    await saveCartToPersistentStorage();
  };

  const removeItem = async (itemId) => {
    const itemToRemove = cartItems.find(item => item.id === itemId);
    
    setCartItems(items => items.filter(item => item.id !== itemId));
    
    // Track removal
    if (itemToRemove) {
      trackCartItemUpdate(itemId, 'removed', itemToRemove);
    }
    
    // Save to persistent storage
    await saveCartToPersistentStorage();
  };

  const saveForLater = async (itemId) => {
    const item = cartItems.find(item => item.id === itemId);
    if (!item) return;
    
    // Add to saved items
    const savedItem = {
      ...item,
      savedAt: new Date().toISOString(),
      savedFromCart: true
    };
    
    setSavedForLater(prev => [...prev, savedItem]);
    localStorage.setItem('higgsflow_saved_items', JSON.stringify([...savedForLater, savedItem]));
    
    // Remove from cart
    await removeItem(itemId);
    
    // Track save for later
    trackCartItemUpdate(itemId, 'saved_for_later', item);
  };

  const moveToCart = async (savedItemId) => {
    const savedItem = savedForLater.find(item => item.id === savedItemId);
    if (!savedItem) return;
    
    // Add back to cart
    const cartItem = {
      ...savedItem,
      id: 'cart_item_' + Date.now(),
      addedAt: new Date().toISOString(),
      movedFromSaved: true
    };
    
    setCartItems(prev => [...prev, cartItem]);
    
    // Remove from saved
    setSavedForLater(prev => prev.filter(item => item.id !== savedItemId));
    localStorage.setItem('higgsflow_saved_items', JSON.stringify(savedForLater.filter(item => item.id !== savedItemId)));
    
    // Reload pricing for new item
    await loadCartPricing([cartItem]);
    
    // Save to persistent storage
    await saveCartToPersistentStorage();
    
    // Track move to cart
    trackCartItemUpdate(savedItemId, 'moved_to_cart', savedItem);
  };

  // Save cart to persistent storage
  const saveCartToPersistentStorage = async () => {
    try {
      const cartData = {
        items: cartItems,
        sessionId,
        lastUpdated: new Date().toISOString(),
        userId: currentUser?.id
      };
      
      // Save to localStorage
      localStorage.setItem('higgsflow_cart', JSON.stringify(cartData));
      
      // Save to enhanced service if available and user is logged in
      if (EnhancedEcommerceFirebaseService && currentUser?.isLoggedIn) {
        try {
          await EnhancedEcommerceFirebaseService.saveCartItems(currentUser.id, cartItems);
        } catch (error) {
          console.warn('Failed to save to enhanced service:', error);
        }
      }
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  // Calculate cart totals
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getCartWeight = () => {
    return cartItems.reduce((total, item) => {
      const weight = item.productDetails?.weight || 0;
      return total + (weight * item.quantity);
    }, 0);
  };

  // Calculate potential savings
  const calculatePotentialSavings = () => {
    if (currentUser?.isLoggedIn) {
      // Calculate actual savings from tier pricing
      return cartItems.reduce((savings, item) => {
        const pricing = item.pricingInfo;
        if (pricing?.originalPrice && pricing.price) {
          return savings + ((pricing.originalPrice - pricing.price) * item.quantity);
        }
        return savings;
      }, 0);
    }
    
    // Estimated savings for guest users
    const currentTotal = getCartTotal();
    return currentTotal * 0.15; // 15% estimated savings
  };

  // Enhanced analytics tracking
  const trackCartPageView = () => {
    try {
      if (AnalyticsService) {
        AnalyticsService.trackEvent('cart_page_view', {
          sessionId,
          userId: currentUser?.id,
          itemCount: cartItems.length,
          cartValue: getCartTotal(),
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  };

  const trackCartItemUpdate = (itemId, action, data) => {
    try {
      if (AnalyticsService) {
        AnalyticsService.trackEvent('cart_item_updated', {
          sessionId,
          userId: currentUser?.id,
          itemId,
          action,
          data,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  };

  // Enhanced cart item price display
  const CartItemPriceDisplay = ({ item }) => {
    const pricing = item.pricingInfo;
    
    if (pricingLoading || !pricing) {
      return (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
      );
    }

    return (
      <div className="text-right">
        <div className="text-sm text-gray-600 mb-1 flex items-center justify-end gap-2">
          <span>RM {item.unitPrice.toFixed(2)} each</span>
          {pricing.type === 'tier-based' && pricing.discount && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {pricing.discount}% off
            </span>
          )}
          {pricing.type === 'client-specific' && (
            <Crown className="w-3 h-3 text-yellow-500" title="Special pricing" />
          )}
        </div>
        
        <div className="text-lg font-semibold text-gray-900">
          RM {item.totalPrice.toLocaleString('en-MY', { minimumFractionDigits: 2 })}
        </div>
        
        {/* Enhanced pricing context */}
        {pricing.originalPrice && pricing.originalPrice > pricing.price && (
          <div className="text-xs text-gray-500 line-through">
            Was: RM {(pricing.originalPrice * item.quantity).toFixed(2)}
          </div>
        )}
        
        {pricing.type !== 'base' && (
          <div className="text-xs text-gray-500 mt-1">
            {pricing.type === 'client-specific' && pricing.details?.priceSource === 'historical' && (
              <span className="flex items-center gap-1 justify-end">
                <History className="w-3 h-3" />
                Your price
              </span>
            )}
            {pricing.type === 'tier-based' && (
              <span className="flex items-center gap-1 justify-end">
                <Tag className="w-3 h-3" />
                {pricing.tier?.toUpperCase()} price
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Enhanced order summary
  const EnhancedOrderSummary = () => {
    const potentialSavings = calculatePotentialSavings();
    const actualSavings = currentUser?.isLoggedIn ? potentialSavings : 0;
    const hasSpecialPricing = cartItems.some(item => 
      item.pricingInfo?.type !== 'base'
    );
    const cartWeight = getCartWeight();
    const supplierCount = new Set(cartItems.map(item => item.supplierName)).size;

    return (
      <div className="bg-white rounded-lg shadow-md sticky top-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Order Summary
          </h3>
          
          {/* Real-time updates indicator */}
          {pricingLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-blue-700">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Updating prices...</span>
              </div>
            </div>
          )}
          
          {/* Special pricing notification */}
          {currentUser?.isLoggedIn && hasSpecialPricing && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-green-700 mb-2">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-medium">Special Pricing Active!</span>
              </div>
              <p className="text-xs text-green-600">
                You're getting {currentUser.tier?.toUpperCase()} pricing based on your account tier
              </p>
              {actualSavings > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  Total savings: RM {actualSavings.toFixed(2)}
                </p>
              )}
            </div>
          )}
          
          {/* Order details */}
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal ({getCartCount()} items)</span>
              <span className="text-gray-900">RM {getCartTotal().toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
            </div>
            
            {actualSavings > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Your savings
                </span>
                <span>RM {actualSavings.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <Package className="w-3 h-3" />
                Total weight
              </span>
              <span className="text-gray-900">{cartWeight.toFixed(1)} kg</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Suppliers
              </span>
              <span className="text-gray-900">{supplierCount}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Estimated Shipping</span>
              <span className="text-gray-900">Calculated at checkout</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax (SST 6%)</span>
              <span className="text-gray-900">RM {(getCartTotal() * 0.06).toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-semibold">
                <span>Estimated Total</span>
                <span>RM {(getCartTotal() * 1.06).toLocaleString('en-MY', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          
          {/* Login incentive for guests */}
          {!currentUser?.isLoggedIn && potentialSavings > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-1">
                    Save RM {potentialSavings.toFixed(2)} with Factory Account
                  </h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Get wholesale pricing, credit terms, and exclusive deals
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate('/factory/register')}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors"
                    >
                      Register Now
                    </button>
                    <button
                      onClick={() => navigate('/factory/login')}
                      className="text-xs border border-blue-600 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-50 transition-colors"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced user info */}
          {currentUser?.isLoggedIn && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {currentUser.name}
                  </h4>
                  <p className="text-xs text-gray-600 mb-2">
                    {currentUser.tier?.toUpperCase()} Account • Special Pricing Active
                  </p>
                  {currentUser.companyInfo?.industry && (
                    <p className="text-xs text-gray-500">
                      Industry: {currentUser.companyInfo.industry}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600">Verified</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced actions */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/quote/request', { 
                state: { 
                  cartItems: cartItems.map(item => ({
                    productId: item.productId,
                    product: item.productDetails,
                    quantity: item.quantity,
                    supplier: item.supplierInfo
                  })), 
                  total: getCartTotal(),
                  itemCount: getCartCount(),
                  suppliers: Object.values(supplierInfo)
                }
              })}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Request Quote ({supplierCount} suppliers)
            </button>
            
            {currentUser?.isLoggedIn ? (
              <button
                onClick={() => navigate('/checkout', {
                  state: {
                    cartItems,
                    total: getCartTotal(),
                    pricing: cartPricing,
                    user: currentUser
                  }
                })}
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Proceed to Checkout
              </button>
            ) : (
              <button
                onClick={() => navigate('/factory/login', {
                  state: { returnUrl: '/cart', message: 'Sign in to access checkout' }
                })}
                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Checkout
              </button>
            )}
            
            {/* Additional actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const cartData = {
                    items: cartItems,
                    total: getCartTotal(),
                    timestamp: new Date().toISOString()
                  };
                  navigator.clipboard?.writeText(JSON.stringify(cartData, null, 2));
                  alert('Cart details copied to clipboard');
                }}
                className="text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
              >
                <Share2 className="w-3 h-3" />
                Share Cart
              </button>
              <button
                onClick={() => {
                  const data = cartItems.map(item => 
                    `${item.productName} - Qty: ${item.quantity} - RM ${item.totalPrice.toFixed(2)}`
                  ).join('\n');
                  const blob = new Blob([data], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'higgsflow-cart.txt';
                  a.click();
                }}
                className="text-xs border border-gray-300 text-gray-600 px-3 py-2 rounded hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-center text-xs text-gray-500">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="w-3 h-3" />
              <span>Secure checkout powered by HiggsFlow</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Globe className="w-3 h-3" />
              <span>Nationwide delivery available</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced saved for later section
  const SavedForLaterSection = () => {
    if (savedForLater.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm mt-6">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            Saved for Later ({savedForLater.length})
          </h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedForLater.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={item.productDetails?.image || '/api/placeholder/60/60'}
                    alt={item.productName}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {item.productName}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {item.supplierName}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      RM {item.unitPrice.toFixed(2)}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => moveToCart(item.id)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          setSavedForLater(prev => prev.filter(saved => saved.id !== item.id));
                          localStorage.setItem('higgsflow_saved_items', 
                            JSON.stringify(savedForLater.filter(saved => saved.id !== item.id))
                          );
                        }}
                        className="text-xs border border-gray-300 text-gray-600 px-2 py-1 rounded hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CartIcon className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your cart...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Cart</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <CartIcon className="w-8 h-8 text-blue-600" />
                Shopping Cart
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-gray-600">
                  {getCartCount()} items • {new Set(cartItems.map(item => item.supplierName)).size} suppliers
                </p>
                {cartWeight > 0 && (
                  <p className="text-gray-500 text-sm">
                    Total weight: {cartWeight.toFixed(1)} kg
                  </p>
                )}
              </div>
            </div>
            
            {/* Enhanced status indicators */}
            <div className="flex items-center gap-4">
              {currentUser?.isLoggedIn && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-full">
                  <Crown className="w-4 h-4" />
                  <span>Special pricing active</span>
                </div>
              )}
              
              {cartAnalytics.totalSessions > 10 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-full">
                  <TrendingUp className="w-4 h-4" />
                  <span>Returning customer</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {cartItems.length === 0 ? (
          // Enhanced Empty Cart
          <div className="text-center py-16">
            <div className="bg-white rounded-lg shadow-sm p-12 max-w-lg mx-auto">
              <CartIcon className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">
                Discover our extensive catalog of industrial products and start building your order
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => navigate('/catalog')}
                  className="w-full bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  Browse Product Catalog
                </button>
                
                {savedForLater.length > 0 && (
                  <button 
                    onClick={() => document.getElementById('saved-section')?.scrollIntoView()}
                    className="w-full border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Heart className="w-5 h-5" />
                    View Saved Items ({savedForLater.length})
                  </button>
                )}
              </div>
              
              <div className="mt-8 text-sm text-gray-500">
                <p>Need help finding products?</p>
                <div className="flex justify-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    +60 3-7890 1234
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    support@higgsflow.com
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Enhanced Cart with Items
          <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Enhanced Cart Items */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-600" />
                      Cart Items
                    </h2>
                    <div className="flex items-center gap-4">
                      {pricingLoading && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Updating prices...
                        </div>
                      )}
                      <button
                        onClick={() => loadCartPricing(cartItems)}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        title="Refresh prices"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {cartItems.map((item, index) => (
                    <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        {/* Enhanced Product Image */}
                        <div className="flex-shrink-0 relative">
                          <img
                            src={item.productDetails?.image || '/api/placeholder/100/100'}
                            alt={item.productName}
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute -top-2 -left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            {index + 1}
                          </div>
                        </div>
                        
                        {/* Enhanced Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-gray-900 mb-1">
                                {item.productName}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm text-gray-600">
                                  Brand: {item.productDetails?.brand || 'N/A'}
                                </span>
                                {item.productDetails?.certifications?.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Shield className="w-3 h-3 text-green-600" />
                                    <span className="text-xs text-green-600">
                                      {item.productDetails.certifications.slice(0, 2).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Enhanced supplier info */}
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-4 h-4" />
                                  <span>{item.supplierName}</span>
                                  {item.supplierInfo?.verified && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                                {item.supplierInfo?.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                    <span>{item.supplierInfo.rating}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                                <span className="flex items-center gap-1">
                                  <Truck className="w-4 h-4" />
                                  {item.productDetails?.leadTime || '5-7 days'}
                                </span>
                                <span className="flex items-center gap-1">
                                  {item.productDetails?.availability === 'in_stock' ? (
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
                                {item.productDetails?.origin && (
                                  <span className="flex items-center gap-1">
                                    <Globe className="w-4 h-4" />
                                    {item.productDetails.origin}
                                  </span>
                                )}
                              </div>

                              {/* Enhanced pricing context */}
                              {currentUser?.isLoggedIn && item.pricingInfo?.type === 'client-specific' && item.pricingInfo?.details?.priceSource === 'historical' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                                  <div className="flex items-center gap-2 text-xs text-blue-600">
                                    <History className="w-3 h-3" />
                                    <span>
                                      Special price based on your purchase history
                                      {item.pricingInfo.details.lastSoldDate && (
                                        <span className="ml-1">
                                          (last ordered: {new Date(item.pricingInfo.details.lastSoldDate.seconds * 1000).toLocaleDateString()})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Enhanced Actions */}
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => saveForLater(item.id)}
                                className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                                title="Save for later"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Enhanced Specifications */}
                          {item.productDetails?.specifications && (
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <h5 className="text-xs font-medium text-gray-700 mb-2">Specifications</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                {Object.entries(item.productDetails.specifications).map(([key, value]) => (
                                  <div key={key}>
                                    <span className="text-gray-500 capitalize">{key}:</span>
                                    <span className="ml-1 text-gray-900 font-medium">{value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Enhanced Quantity and Price */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700">Quantity:</span>
                                <div className="flex items-center border border-gray-300 rounded-lg">
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    className="p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <span className="px-4 py-2 min-w-[3rem] text-center font-medium">
                                    {item.quantity}
                                  </span>
                                  <button
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    className="p-2 hover:bg-gray-50 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* MOQ indicator */}
                              {item.productDetails?.moq && item.quantity < item.productDetails.moq && (
                                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                  MOQ: {item.productDetails.moq}
                                </div>
                              )}
                            </div>
                            
                            {/* Enhanced price display */}
                            <CartItemPriceDisplay item={item} />
                          </div>
                          
                          {/* Added timestamp */}
                          <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Added {new Date(item.addedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Enhanced Cart Summary */}
            <div className="lg:col-span-1 mt-8 lg:mt-0">
              <EnhancedOrderSummary />
            </div>
          </div>
        )}
        
        {/* Enhanced Saved for Later Section */}
        <div id="saved-section">
          <SavedForLaterSection />
        </div>
      </div>
    </div>
  );
};

export default ShoppingCart;
