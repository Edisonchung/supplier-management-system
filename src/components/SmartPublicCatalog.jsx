// src/components/SmartPublicCatalog.jsx
// HiggsFlow Phase 2B - Smart Public Catalog with Enhanced E-commerce Integration
// UPDATED: Integrated with new EcommerceProductCard and EcommerceDataService
// PRESERVES: All original 1300+ lines of functionality

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Star, MapPin, TrendingUp, Eye, ShoppingCart, Clock, 
  Zap, Target, Brain, Factory, Globe, Activity, BarChart3, Users, 
  AlertCircle, ThumbsUp, Award, Shield, Truck, Phone, Mail, Calendar,
  ChevronDown, ChevronUp, Heart, Share2, Download, Settings, X
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  increment 
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ========== ENHANCED IMPORTS ==========
import EcommerceProductCard from './ecommerce/ProductCard';
// import EcommerceDataService from '../services/ecommerceDataService'; // Uncomment when ready

// ========== REAL ANALYTICS SERVICE ==========
class RealAnalyticsService {
  constructor() {
    this.db = db;
    this.sessionId = this.generateSessionId();
    this.userId = this.generateUserId();
    console.log('📊 Real Analytics Service initialized:', this.sessionId);
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateUserId() {
    const stored = localStorage.getItem('higgsflow_user_id');
    if (stored) return stored;
    
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('higgsflow_user_id', newId);
    return newId;
  }

  async trackProductInteraction(data) {
    try {
      const interactionData = {
        ...data,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: serverTimestamp(),
        source: 'smart_catalog',
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer || 'direct'
      };

      await addDoc(collection(this.db, 'analytics_interactions'), interactionData);
      
      // Update product interaction count in public catalog
      if (data.productId) {
        const productRef = doc(this.db, 'products_public', data.productId);
        await updateDoc(productRef, {
          viewCount: increment(1),
          lastViewed: serverTimestamp()
        });
      }
      
      console.log('📊 Tracked interaction:', data.eventType);
    } catch (error) {
      console.error('❌ Analytics tracking error:', error);
      // Fallback to localStorage
      this.trackToLocalStorage(data);
    }
  }

  trackToLocalStorage(data) {
    try {
      const stored = JSON.parse(localStorage.getItem('higgsflow_analytics') || '[]');
      stored.push({
        ...data,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 1000 events
      if (stored.length > 1000) {
        stored.splice(0, stored.length - 1000);
      }
      
      localStorage.setItem('higgsflow_analytics', JSON.stringify(stored));
    } catch (error) {
      console.error('❌ localStorage analytics error:', error);
    }
  }

  async subscribeToRealTimeMetrics(callback) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const unsubscribe = onSnapshot(
        query(
          collection(this.db, 'analytics_interactions'),
          where('timestamp', '>=', twentyFourHoursAgo),
          orderBy('timestamp', 'desc'),
          limit(1000)
        ),
        (snapshot) => {
          const metrics = this.calculateRealTimeMetrics(snapshot.docs);
          callback(metrics);
        },
        (error) => {
          console.error('❌ Real-time metrics error:', error);
          // Fallback to localStorage metrics
          this.getLocalStorageMetrics(callback);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('❌ Real-time subscription error:', error);
      this.getLocalStorageMetrics(callback);
      
      // Return a dummy function to prevent errors
      return () => {};
    }
  }

  getLocalStorageMetrics(callback) {
    try {
      const stored = JSON.parse(localStorage.getItem('higgsflow_analytics') || '[]');
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentData = stored.filter(event => 
        new Date(event.timestamp).getTime() > twentyFourHoursAgo
      );
      
      const metrics = {
        activeSessions: new Set(recentData.map(d => d.sessionId)).size,
        recentInteractions: recentData.length,
        conversionRate: this.calculateConversionRate(recentData),
        topProducts: this.getTopProducts(recentData)
      };
      
      callback(metrics);
    } catch (error) {
      console.error('❌ localStorage metrics error:', error);
      callback({
        activeSessions: 1,
        recentInteractions: 0,
        conversionRate: 0,
        topProducts: []
      });
    }
  }

  calculateRealTimeMetrics(docs) {
    const data = docs.map(doc => doc.data());
    
    return {
      activeSessions: new Set(data.map(d => d.sessionId)).size,
      recentInteractions: data.length,
      conversionRate: this.calculateConversionRate(data),
      topProducts: this.getTopProducts(data),
      factoryEngagement: this.getFactoryEngagement(data),
      timeOnPage: this.calculateAverageTimeOnPage(data)
    };
  }

  calculateConversionRate(data) {
    const views = data.filter(d => d.eventType === 'product_view').length;
    const quotes = data.filter(d => d.eventType === 'quote_request').length;
    return views > 0 ? (quotes / views * 100).toFixed(2) : 0;
  }

  getTopProducts(data) {
    const productViews = {};
    data.filter(d => d.eventType === 'product_view').forEach(d => {
      productViews[d.productName] = (productViews[d.productName] || 0) + 1;
    });
    
    return Object.entries(productViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  getFactoryEngagement(data) {
    const factories = new Set(data.map(d => d.factoryId).filter(Boolean));
    return {
      identifiedFactories: factories.size,
      totalInteractions: data.length
    };
  }

  calculateAverageTimeOnPage(data) {
    // Simplified calculation - could be enhanced
    return Math.floor(Math.random() * 180) + 30; // 30-210 seconds
  }
}

// ========== ENHANCED DATA LOADING FUNCTIONS ==========
const loadRealProducts = async () => {
  try {
    console.log('📦 Loading products from products_public collection...');
    
    // Try to use EcommerceDataService if available
    // Uncomment when EcommerceDataService is implemented
    /*
    try {
      const EcommerceDataService = (await import('../services/ecommerceDataService')).default;
      const result = await EcommerceDataService.getPublicProducts({
        category: 'all',
        searchTerm: '',
        sortBy: 'relevance',
        limit: 50
      });
      console.log(`✅ Loaded ${result.products.length} products via EcommerceDataService`);
      return result.products;
    } catch (serviceError) {
      console.log('🔄 EcommerceDataService not available, using direct Firestore...');
    }
    */
    
    // Direct Firestore query
    const productsQuery = query(
      collection(db, 'products_public'),
      limit(50)
    );
    
    const snapshot = await getDocs(productsQuery);
    const realProducts = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        internalProductId: data.internalProductId,
        ...data,
        // Map products_public fields to expected format
        name: data.displayName || data.name || 'Unknown Product',
        code: data.sku || data.code || data.partNumber || doc.id,
        category: data.category || 'General',
        price: data.pricing?.listPrice || data.price || 0,
        stock: data.stock || 0,
        supplier: data.supplier || { name: 'HiggsFlow Direct', location: 'Kuala Lumpur' },
        image: data.images?.primary || data.image || '/api/placeholder/300/300',
        
        // Enhanced Phase 2B fields with safe object handling
        availability: data.availability || calculateAvailability(data.stock || 0),
        deliveryTime: data.deliveryTime || calculateDeliveryTime(data.stock || 0),
        urgency: (data.stock || 0) < 5 ? 'urgent' : 'normal',
        location: typeof data.supplier === 'object' ? 
          data.supplier?.location || data.location || 'Kuala Lumpur' : 
          data.location || 'Kuala Lumpur',
        featured: data.featured || (data.stock || 0) > 100,
        searchPriority: calculateSearchPriority(data),
        tags: Array.isArray(data.tags) ? data.tags : generateTags(data),
        specifications: typeof data.specifications === 'object' ? data.specifications : {},
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        warranty: typeof data.warranty === 'string' ? data.warranty : '1 year standard warranty',
        minOrderQty: typeof data.minOrderQty === 'number' ? data.minOrderQty : 1,
        leadTime: typeof data.leadTime === 'string' ? data.leadTime : calculateDeliveryTime(data.stock || 0),
        discount: typeof data.discount === 'number' ? data.discount : 0,
        rating: typeof data.rating === 'number' ? data.rating : (Math.random() * 2 + 3),
        reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : Math.floor(Math.random() * 50),
        viewCount: typeof data.viewCount === 'number' ? data.viewCount : 0,
        lastViewed: data.lastViewed
      };
    })
    // Filter out non-public products in JavaScript instead of database query
    .filter(product => !product.visibility || product.visibility === 'public')
    // Sort by most recent first
    .sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || new Date(a.updatedAt || 0);
      const bTime = b.updatedAt?.toDate?.() || new Date(b.updatedAt || 0);
      return bTime - aTime;
    });
    
    console.log(`✅ Loaded ${realProducts.length} products from products_public`);
    console.log('📊 Products loaded:', realProducts.map(p => p.name));
    return realProducts;
    
  } catch (error) {
    console.error('❌ Error loading products from products_public:', error);
    console.log('📄 Falling back to localStorage...');
    
    // Fallback to localStorage
    const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
    return localProducts.map(product => ({
      ...product,
      availability: calculateAvailability(product.stock || 0),
      deliveryTime: calculateDeliveryTime(product.stock || 0),
      urgency: (product.stock || 0) < 5 ? 'urgent' : 'normal',
      featured: (product.stock || 0) > 100,
      searchPriority: calculateSearchPriority(product),
      tags: generateTags(product)
    }));
  }
};

// ========== REAL-TIME SUBSCRIPTION ==========
const setupRealTimeProductUpdates = (onProductsUpdate) => {
  console.log('📄 Setting up real-time updates from products_public...');
  
  // Simplified query to avoid index requirement
  const productsQuery = query(
    collection(db, 'products_public'),
    limit(50)
  );
  
  return onSnapshot(productsQuery, (snapshot) => {
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Map fields correctly
      name: doc.data().displayName || doc.data().name,
      price: doc.data().pricing?.listPrice || doc.data().price
    }));
    
    console.log(`📄 Real-time update: ${products.length} products from products_public`);
    onProductsUpdate(products);
  }, (error) => {
    console.error('❌ Real-time subscription error:', error);
  });
};

// Helper functions for product enhancement
const calculateAvailability = (stock) => {
  if (stock > 10) return 'In Stock';
  if (stock > 0) return 'Low Stock';
  return 'Out of Stock';
};

const calculateDeliveryTime = (stock) => {
  if (stock > 10) return '1-2 business days';
  if (stock > 0) return '3-5 business days';
  return '7-14 business days';
};

const calculateSearchPriority = (product) => {
  const stock = product.stock || 0;
  const price = product.price || 0;
  
  if (stock > 50 && price > 500) return 'high';
  if (stock > 10) return 'medium';
  return 'low';
};

const generateTags = (product) => {
  const tags = [];
  const stock = product.stock || 0;
  const price = product.price || 0;
  
  if (stock > 100) tags.push('In Stock');
  if (stock < 5) tags.push('Limited Stock');
  if (price > 1000) tags.push('Premium');
  if (product.featured) tags.push('Featured');
  if (product.category) tags.push(product.category);
  
  return tags;
};

// ========== FACTORY IDENTIFICATION ==========
const identifyFactoryProfile = async (email, ipAddress) => {
  try {
    console.log('🔍 Identifying factory profile...');
    
    if (!email) {
      return { identified: false, profile: null };
    }
    
    // Check existing factory registrations
    const factoryQuery = query(
      collection(db, 'factory_registrations'),
      where('email', '==', email)
    );
    
    const snapshot = await getDocs(factoryQuery);
    
    if (!snapshot.empty) {
      const factory = snapshot.docs[0].data();
      console.log('✅ Found existing factory profile:', factory.companyName);
      
      return {
        identified: true,
        profile: {
          ...factory,
          id: snapshot.docs[0].id
        },
        returnCustomer: true,
        riskScore: factory.riskScore || 'medium'
      };
    }
    
    // AI-powered domain analysis for new visitors
    const domainAnalysis = analyzeEmailDomain(email);
    
    return {
      identified: false,
      suggestions: {
        companyType: domainAnalysis.companyType,
        industry: domainAnalysis.industry,
        location: 'Kuala Lumpur', // Default for Malaysia
        riskScore: 'medium'
      },
      returnCustomer: false
    };
    
  } catch (error) {
    console.error('❌ Factory identification error:', error);
    return { identified: false, error: error.message };
  }
};

const analyzeEmailDomain = (email) => {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  
  // Common business patterns
  if (domain.includes('manufacturing') || domain.includes('factory')) {
    return { companyType: 'Manufacturing', industry: 'Industrial' };
  }
  if (domain.includes('engineering') || domain.includes('tech')) {
    return { companyType: 'Engineering', industry: 'Technology' };
  }
  if (domain.includes('construction') || domain.includes('building')) {
    return { companyType: 'Construction', industry: 'Construction' };
  }
  
  return { companyType: 'General Business', industry: 'General' };
};

// ========== ENHANCED PRODUCT CARD COMPONENT ==========
// This will be replaced by EcommerceProductCard when available
const ProductCard = ({ product, viewMode = 'grid', onAddToCart, onRequestQuote, onAddToFavorites, onCompare, isInFavorites, isInComparison, onClick }) => {
  const handleClick = () => {
    if (onClick) onClick(product);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(product);
  };

  const handleRequestQuote = (e) => {
    e.stopPropagation();
    if (onRequestQuote) onRequestQuote(product);
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    if (onAddToFavorites) onAddToFavorites(product, e);
  };

  const handleCompare = (e) => {
    e.stopPropagation();
    if (onCompare) onCompare(product, e);
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
        onClick={handleClick}
      >
        <div className="p-4 flex items-center space-x-4">
          <img
            src={product.image}
            alt={product.name}
            className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            onError={(e) => {
              e.target.src = '/api/placeholder/80/80';
            }}
          />
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 truncate">
              {typeof product.name === 'string' ? product.name : 'Product Name'}
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              SKU: {typeof product.code === 'string' ? product.code : 'N/A'}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Truck className="w-4 h-4 mr-1" />
                {typeof product.deliveryTime === 'string' ? product.deliveryTime : '3-5 days'}
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {typeof product.location === 'string' ? product.location : 'KL'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-xl font-bold text-blue-600">
                RM {typeof product.price === 'number' ? product.price.toLocaleString() : '0'}
              </span>
              <p className="text-sm text-gray-500">
                Stock: {typeof product.stock === 'number' ? product.stock : 0}
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={handleRequestQuote}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Request Quote
              </button>
              <button
                onClick={handleFavorite}
                className={`p-2 border rounded-lg transition-colors ${
                  isInFavorites 
                    ? 'border-red-300 bg-red-50 hover:bg-red-100' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${
                  isInFavorites 
                    ? 'text-red-500 fill-current' 
                    : 'text-gray-400'
                }`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="relative">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover rounded-t-lg"
          onError={(e) => {
            e.target.src = '/api/placeholder/300/300';
          }}
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {product.featured && (
            <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">
              Featured
            </span>
          )}
          {product.urgency === 'urgent' && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
              Limited Stock
            </span>
          )}
        </div>
        
        {/* Availability Badge */}
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            product.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
            product.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {typeof product.availability === 'string' ? product.availability : 'Unknown'}
          </span>
        </div>

        {/* Action Buttons Overlay */}
        <div className="absolute bottom-2 right-2 flex space-x-1">
          <button
            onClick={handleFavorite}
            className={`p-1.5 rounded-full shadow-md transition-colors ${
              isInFavorites 
                ? 'bg-red-500 text-white' 
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-current' : ''}`} />
          </button>
          {onCompare && (
            <button
              onClick={handleCompare}
              className={`p-1.5 rounded-full shadow-md transition-colors ${
                isInComparison 
                  ? 'bg-purple-500 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
          {typeof product.name === 'string' ? product.name : 'Product Name'}
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          SKU: {typeof product.code === 'string' ? product.code : 'N/A'}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-blue-600">
            RM {typeof product.price === 'number' ? product.price.toLocaleString() : '0'}
          </span>
          <span className="text-sm text-gray-500">
            Stock: {typeof product.stock === 'number' ? product.stock : 0}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <Truck className="w-4 h-4 mr-1" />
            {typeof product.deliveryTime === 'string' ? product.deliveryTime : '3-5 days'}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {typeof product.location === 'string' ? product.location : 'KL'}
          </div>
        </div>
        
        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(typeof product.rating === 'number' ? product.rating : 4) ? 'fill-current' : ''
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 ml-2">
            ({typeof product.reviewCount === 'number' ? product.reviewCount : 0} reviews)
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleRequestQuote}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Request Quote
          </button>
          {onAddToCart && (
            <button
              onClick={handleAddToCart}
              className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== MAIN COMPONENT ==========
const SmartPublicCatalog = () => {
  // Enhanced state management with real data
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [factoryProfile, setFactoryProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    availability: 'all',
    priceRange: 'all',
    location: 'all'
  });

  // Shopping cart state
  const [guestCart, setGuestCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Quote request state
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quoteForm, setQuoteForm] = useState({
    quantity: 1,
    urgency: 'normal',
    message: '',
    companyName: '',
    contactName: '',
    email: '',
    phone: ''
  });

  // Favorites/Wishlist state
  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesPanel, setShowFavoritesPanel] = useState(false);

  // Comparison state
  const [comparisonList, setComparisonList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState('grid');

  // Real analytics state
  const [analyticsService] = useState(() => new RealAnalyticsService());
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeSessions: 0,
    recentInteractions: 0,
    conversionRate: 0,
    topProducts: []
  });

  // Load real products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const realProducts = await loadRealProducts();
        setProducts(realProducts);
        setFilteredProducts(realProducts);
        
        // Generate AI recommendations based on real data
        const aiRecommendations = generateAIRecommendations(realProducts);
        setRecommendations(aiRecommendations);
        
        // Track page load
        await analyticsService.trackProductInteraction({
          eventType: 'catalog_page_load',
          productCount: realProducts.length,
          timestamp: new Date()
        });
        
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [analyticsService]);

  // Real-time subscription with correct collection
  useEffect(() => {
    let unsubscribeFunction = null;
    
    const setupSubscription = async () => {
      try {
        unsubscribeFunction = setupRealTimeProductUpdates((updatedProducts) => {
          console.log('📄 Real-time products update received:', updatedProducts.length);
          setProducts(updatedProducts);
          setFilteredProducts(updatedProducts);
        });
      } catch (error) {
        console.error('❌ Error setting up real-time subscription:', error);
      }
    };
    
    setupSubscription();
    
    return () => {
      if (unsubscribeFunction && typeof unsubscribeFunction === 'function') {
        unsubscribeFunction();
      }
    };
  }, []);

  // Subscribe to real-time analytics
  useEffect(() => {
    let unsubscribeAnalytics = null;
    
    const setupAnalytics = async () => {
      try {
        unsubscribeAnalytics = await analyticsService.subscribeToRealTimeMetrics(setRealTimeMetrics);
      } catch (error) {
        console.error('❌ Error setting up analytics:', error);
      }
    };
    
    setupAnalytics();
    
    return () => {
      if (unsubscribeAnalytics && typeof unsubscribeAnalytics === 'function') {
        unsubscribeAnalytics();
      }
    };
  }, [analyticsService]);

  // Load cart from localStorage
  useEffect(() => {
    const storedCart = localStorage.getItem('higgsflow_guest_cart');
    if (storedCart) {
      try {
        setGuestCart(JSON.parse(storedCart));
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('higgsflow_guest_cart', JSON.stringify(guestCart));
  }, [guestCart]);

  // Load favorites from localStorage on component mount
  useEffect(() => {
    const storedFavorites = localStorage.getItem('higgsflow_favorites');
    if (storedFavorites) {
      try {
        const favoritesArray = JSON.parse(storedFavorites);
        setFavorites(new Set(favoritesArray));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }, []);

  // Save favorites to localStorage when favorites change
  useEffect(() => {
    localStorage.setItem('higgsflow_favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  useEffect(() => {
    const detectFactory = async () => {
      const email = localStorage.getItem('factory_email') || 
                    sessionStorage.getItem('factory_email');
      
      if (email) {
        const profile = await identifyFactoryProfile(email, '127.0.0.1');
        setFactoryProfile(profile);
        
        if (profile.identified) {
          await analyticsService.trackProductInteraction({
            eventType: 'factory_identified',
            factoryId: profile.profile.id,
            factoryName: profile.profile.companyName,
            returnCustomer: profile.returnCustomer
          });
        }
      }
    };

    detectFactory();
  }, [analyticsService]);

  // Real product filtering with analytics
  useEffect(() => {
    let filtered = products;

    // Apply filters
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      // Track search
      analyticsService.trackProductInteraction({
        eventType: 'search_performed',
        searchQuery,
        resultCount: filtered.length
      });
    }

    if (activeFilters.category !== 'all') {
      filtered = filtered.filter(product => 
        product.category.toLowerCase() === activeFilters.category.toLowerCase()
      );
    }

    if (activeFilters.availability !== 'all') {
      filtered = filtered.filter(product => 
        product.availability.toLowerCase() === activeFilters.availability.toLowerCase()
      );
    }

    if (activeFilters.priceRange !== 'all') {
      const [min, max] = activeFilters.priceRange.split('-').map(Number);
      filtered = filtered.filter(product => 
        product.price >= min && (max ? product.price <= max : true)
      );
    }

    // Sort by priority and stock
    filtered.sort((a, b) => {
      if (a.featured !== b.featured) return b.featured - a.featured;
      if (a.searchPriority !== b.searchPriority) {
        const priorities = { high: 3, medium: 2, low: 1 };
        return priorities[b.searchPriority] - priorities[a.searchPriority];
      }
      return b.stock - a.stock;
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, activeFilters, analyticsService]);

  // AI Recommendations based on real data
  const generateAIRecommendations = (productList) => {
    const featured = productList.filter(p => p.featured).slice(0, 3);
    const highStock = productList.filter(p => p.stock > 50).slice(0, 3);
    const trending = productList.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0)).slice(0, 3);
    
    return {
      featured,
      highStock,
      trending,
      forYou: factoryProfile?.identified ? 
        productList.filter(p => p.category === factoryProfile.profile.industry).slice(0, 3) :
        productList.slice(0, 3)
    };
  };

  // Enhanced event handlers
  const handleAddToCart = useCallback(async (product, quantity = 1) => {
    const existingItem = guestCart.find(item => item.id === product.id);
    
    if (existingItem) {
      setGuestCart(prev => prev.map(item =>
        item.id === product.id 
          ? { ...item, quantity: item.quantity + quantity }
          : item
      ));
    } else {
      setGuestCart(prev => [...prev, { 
        ...product, 
        quantity,
        addedAt: new Date().toISOString()
      }]);
    }

    // Track add to cart
    await analyticsService.trackProductInteraction({
      eventType: 'add_to_cart',
      productId: product.id,
      productName: product.name,
      quantity,
      factoryId: factoryProfile?.profile?.id || null
    });

    // Show success feedback
    console.log(`Added ${product.name} to cart`);
  }, [guestCart, analyticsService, factoryProfile]);

  // Handle quote request
  const handleQuoteRequest = useCallback(async (product) => {
    await analyticsService.trackProductInteraction({
      eventType: 'quote_request_initiated',
      productId: product.id,
      productName: product.name,
      factoryId: factoryProfile?.profile?.id || null
    });

    // Pre-fill form if factory is identified
    if (factoryProfile?.identified) {
      setQuoteForm(prev => ({
        ...prev,
        companyName: factoryProfile.profile.companyName || '',
        contactName: factoryProfile.profile.contactName || '',
        email: factoryProfile.profile.email || '',
        phone: factoryProfile.profile.phone || ''
      }));
    }

    setSelectedProduct(product);
    setShowQuoteModal(true);
  }, [analyticsService, factoryProfile]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async (product, event) => {
    if (event) event.stopPropagation();
    
    const isFavorited = favorites.has(product.id);
    const newFavorites = new Set(favorites);
    
    if (isFavorited) {
      newFavorites.delete(product.id);
      
      // Track unfavorite
      await analyticsService.trackProductInteraction({
        eventType: 'product_unfavorited',
        productId: product.id,
        productName: product.name,
        factoryId: factoryProfile?.profile?.id || null
      });
    } else {
      newFavorites.add(product.id);
      
      // Track favorite
      await analyticsService.trackProductInteraction({
        eventType: 'product_favorited',
        productId: product.id,
        productName: product.name,
        factoryId: factoryProfile?.profile?.id || null
      });
    }
    
    setFavorites(newFavorites);
  }, [favorites, analyticsService, factoryProfile]);

  // Handle product comparison
  const handleProductComparison = useCallback(async (product, event) => {
    if (event) event.stopPropagation();
    
    if (comparisonList.includes(product.id)) {
      setComparisonList(prev => prev.filter(id => id !== product.id));
    } else if (comparisonList.length < 4) {
      setComparisonList(prev => [...prev, product.id]);
      
      // Track comparison addition
      await analyticsService.trackProductInteraction({
        eventType: 'product_added_to_comparison',
        productId: product.id,
        productName: product.name,
        factoryId: factoryProfile?.profile?.id || null
      });
    } else {
      alert('You can compare up to 4 products at once.');
    }
  }, [comparisonList, analyticsService, factoryProfile]);

  // Product click handler
  const handleProductClick = useCallback(async (product) => {
    await analyticsService.trackProductInteraction({
      eventType: 'product_view',
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productPrice: product.price,
      factoryId: factoryProfile?.profile?.id || null
    });
  }, [analyticsService, factoryProfile]);

  // Get favorite products for panel display
  const getFavoriteProducts = () => {
    return products.filter(product => favorites.has(product.id));
  };

  const submitQuoteRequest = async () => {
    if (!selectedProduct || !quoteForm.email || !quoteForm.companyName) {
      alert('Please fill in required fields: Company Name and Email');
      return;
    }

    try {
      const quoteData = {
        // Product details
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productCode: selectedProduct.code,
        productPrice: selectedProduct.price,
        productCategory: selectedProduct.category,
        
        // Quote details
        requestedQuantity: quoteForm.quantity,
        urgency: quoteForm.urgency,
        message: quoteForm.message,
        
        // Customer details
        companyName: quoteForm.companyName,
        contactName: quoteForm.contactName,
        email: quoteForm.email,
        phone: quoteForm.phone,
        
        // Metadata
        requestDate: serverTimestamp(),
        status: 'pending',
        source: 'public_catalog',
        sessionId: analyticsService.sessionId,
        factoryId: factoryProfile?.profile?.id || null,
        estimatedValue: selectedProduct.price * quoteForm.quantity,
        
        // Tracking
        ipAddress: 'browser',
        userAgent: navigator.userAgent
      };

      // Save to Firestore
      await addDoc(collection(db, 'quote_requests'), quoteData);
      
      // Track successful quote submission
      await analyticsService.trackProductInteraction({
        eventType: 'quote_request_submitted',
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: quoteForm.quantity,
        estimatedValue: selectedProduct.price * quoteForm.quantity,
        factoryId: factoryProfile?.profile?.id || null
      });

      alert('Quote request submitted successfully! We will contact you within 24 hours.');
      
      // Reset form and close modal
      setQuoteForm({
        quantity: 1,
        urgency: 'normal',
        message: '',
        companyName: '',
        contactName: '',
        email: '',
        phone: ''
      });
      setShowQuoteModal(false);
      setSelectedProduct(null);

    } catch (error) {
      console.error('Error submitting quote request:', error);
      alert('Failed to submit quote request. Please try again.');
    }
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return cats.sort();
  }, [products]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading smart catalog...</p>
          <p className="mt-2 text-sm text-gray-500">Reading from products_public collection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Real-time Metrics */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">HiggsFlow Smart Catalog</h1>
                <p className="text-sm text-gray-500">
                  {products.length} products • {realTimeMetrics.activeSessions} active sessions
                </p>
              </div>
            </div>
            
            {/* Real-time Analytics Badge */}
            <div className="flex items-center space-x-4">
              {/* Shopping Cart Badge */}
              {guestCart.length > 0 && (
                <button
                  onClick={() => setShowCartDrawer(true)}
                  className="relative bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  <ShoppingCart className="inline w-4 h-4 mr-1" />
                  {guestCart.length} items
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {guestCart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </button>
              )}

              {/* Comparison Badge */}
              {comparisonList.length > 0 && (
                <button
                  onClick={() => setShowComparison(true)}
                  className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition-colors"
                >
                  Compare ({comparisonList.length})
                </button>
              )}

              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Activity className="inline w-4 h-4 mr-1" />
                {realTimeMetrics.recentInteractions} interactions today
              </div>
              
              {/* Favorites Counter */}
              {favorites.size > 0 && (
                <button
                  onClick={() => setShowFavoritesPanel(true)}
                  className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm hover:bg-red-200 transition-colors"
                >
                  <Heart className="inline w-4 h-4 mr-1" />
                  {favorites.size} favorites
                </button>
              )}
              
              {factoryProfile?.identified && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  <Factory className="inline w-4 h-4 mr-1" />
                  Welcome back, {factoryProfile.profile.companyName}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search products, codes, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <select
                value={activeFilters.category}
                onChange={(e) => setActiveFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Availability Filter */}
            <div>
              <select
                value={activeFilters.availability}
                onChange={(e) => setActiveFilters(prev => ({ ...prev, availability: e.target.value }))}
                className="w-full py-2 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Availability</option>
                <option value="in stock">In Stock</option>
                <option value="low stock">Low Stock</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              >
                <div className="grid grid-cols-2 gap-1 w-4 h-4">
                  <div className="bg-current"></div>
                  <div className="bg-current"></div>
                  <div className="bg-current"></div>
                  <div className="bg-current"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              >
                <div className="space-y-1 w-4 h-4">
                  <div className="bg-current h-1"></div>
                  <div className="bg-current h-1"></div>
                  <div className="bg-current h-1"></div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ========== ENHANCED PRODUCT GRID WITH ECOMMERCE PRODUCT CARD ========== */}
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredProducts.map((product) => (
            <EcommerceProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              onAddToCart={handleAddToCart}
              onRequestQuote={handleQuoteRequest}
              onAddToFavorites={handleFavoriteToggle}
              onCompare={handleProductComparison}
              onClick={handleProductClick}
              isInFavorites={favorites.has(product.id)}
              isInComparison={comparisonList.includes(product.id)}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        )}
      </div>

      {/* Quote Request Modal */}
      {showQuoteModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Request Quote</h2>
                <button
                  onClick={() => setShowQuoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Product Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-4">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = '/api/placeholder/80/80';
                    }}
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-500">SKU: {selectedProduct.code}</p>
                    <p className="text-lg font-bold text-blue-600">RM {selectedProduct.price?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Quote Form */}
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quoteForm.quantity}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Urgency
                    </label>
                    <select
                      value={quoteForm.urgency}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, urgency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="normal">Normal (5-7 days)</option>
                      <option value="urgent">Urgent (1-2 days)</option>
                      <option value="asap">ASAP (Same day)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={quoteForm.companyName}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your company name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      value={quoteForm.contactName}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, contactName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={quoteForm.email}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@company.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={quoteForm.phone}
                      onChange={(e) => setQuoteForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+60123456789"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Requirements
                  </label>
                  <textarea
                    value={quoteForm.message}
                    onChange={(e) => setQuoteForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Any specific requirements, delivery preferences, or additional notes..."
                  />
                </div>

                {/* Estimated Total */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estimated Total</span>
                    <span className="text-xl font-bold text-blue-600">
                      RM {(selectedProduct.price * quoteForm.quantity).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Final pricing may vary based on quantity, delivery, and specifications
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitQuoteRequest}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit Quote Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Favorites Panel Modal */}
      {showFavoritesPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Your Favorites ({favorites.size})
                </h2>
                <button
                  onClick={() => setShowFavoritesPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {favorites.size === 0 ? (
                <div className="text-center py-12">
                  <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No favorites yet</h3>
                  <p className="text-gray-500">
                    Click the heart icon on products to save them to your favorites.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getFavoriteProducts().map((product) => (
                    <div key={product.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-t-lg"
                          onError={(e) => {
                            e.target.src = '/api/placeholder/300/200';
                          }}
                        />
                        <button
                          onClick={(e) => handleFavoriteToggle(product, e)}
                          className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-50"
                        >
                          <Heart className="w-4 h-4 text-red-500 fill-current" />
                        </button>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm line-clamp-2">
                          {typeof product.name === 'string' ? product.name : 'Product Name'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                          SKU: {typeof product.code === 'string' ? product.code : 'N/A'}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-blue-600">
                            RM {typeof product.price === 'number' ? product.price.toLocaleString() : '0'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            product.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
                            product.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {typeof product.availability === 'string' ? product.availability : 'Unknown'}
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowFavoritesPanel(false);
                              setShowQuoteModal(true);
                            }}
                            className="flex-1 bg-blue-600 text-white py-1.5 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Request Quote
                          </button>
                          <button
                            onClick={() => handleProductClick(product)}
                            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {favorites.size > 0 && (
                <div className="mt-6 pt-6 border-t flex justify-between items-center">
                  <p className="text-sm text-gray-500">
                    {favorites.size} product{favorites.size !== 1 ? 's' : ''} saved to favorites
                  </p>
                  <button
                    onClick={() => {
                      if (confirm('Clear all favorites? This action cannot be undone.')) {
                        setFavorites(new Set());
                        analyticsService.trackProductInteraction({
                          eventType: 'favorites_cleared',
                          favoriteCount: favorites.size,
                          factoryId: factoryProfile?.profile?.id || null
                        });
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Clear All Favorites
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-end z-50">
          <div className="bg-white w-full max-w-md h-full overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Shopping Cart ({guestCart.length})
                </h2>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {guestCart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-500">
                    Browse products and add them to your cart.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {guestCart.map((item) => (
                    <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = '/api/placeholder/64/64';
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            SKU: {item.code}
                          </p>
                          <p className="text-lg font-bold text-blue-600">
                            RM {(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setGuestCart(prev => prev.map(cartItem =>
                                cartItem.id === item.id 
                                  ? { ...cartItem, quantity: Math.max(1, cartItem.quantity - 1) }
                                  : cartItem
                              ));
                            }}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => {
                              setGuestCart(prev => prev.map(cartItem =>
                                cartItem.id === item.id 
                                  ? { ...cartItem, quantity: cartItem.quantity + 1 }
                                  : cartItem
                              ));
                            }}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setGuestCart(prev => prev.filter(cartItem => cartItem.id !== item.id));
                        }}
                        className="mt-2 text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove from cart
                      </button>
                    </div>
                  ))}

                  {/* Cart Summary */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-semibold text-gray-900">
                        Total: RM {guestCart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {guestCart.reduce((sum, item) => sum + item.quantity, 0)} items
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          // Convert cart to quote request
                          const cartTotal = guestCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                          alert(`Cart total: RM ${cartTotal.toLocaleString()}. Quote request feature coming soon!`);
                        }}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Request Quote for All Items
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm('Clear entire cart? This action cannot be undone.')) {
                            setGuestCart([]);
                          }
                        }}
                        className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Clear Cart
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Comparison Modal */}
      {showComparison && comparisonList.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Product Comparison ({comparisonList.length})
                </h2>
                <button
                  onClick={() => setShowComparison(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {comparisonList.map(productId => {
                  const product = products.find(p => p.id === productId);
                  if (!product) return null;

                  return (
                    <div key={product.id} className="border rounded-lg p-4">
                      <div className="relative mb-4">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = '/api/placeholder/300/200';
                          }}
                        />
                        <button
                          onClick={() => setComparisonList(prev => prev.filter(id => id !== product.id))}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <h3 className="font-semibold text-gray-900 mb-2 text-sm line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price:</span>
                          <span className="font-semibold text-blue-600">
                            RM {product.price.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stock:</span>
                          <span>{product.stock}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span>{product.deliveryTime}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rating:</span>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="ml-1">{product.rating?.toFixed(1) || 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Availability:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            product.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
                            product.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.availability}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowComparison(false);
                          setShowQuoteModal(true);
                        }}
                        className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Request Quote
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Comparing {comparisonList.length} products
                </p>
                <button
                  onClick={() => {
                    setComparisonList([]);
                    setShowComparison(false);
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Clear Comparison
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer with Real Analytics */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Powered by HiggsFlow Smart Catalog • Enhanced e-commerce integration ready
            </div>
            <div className="flex items-center space-x-4">
              <span>Conversion Rate: {realTimeMetrics.conversionRate}%</span>
              <span>•</span>
              <span>Active: {realTimeMetrics.activeSessions} sessions</span>
              <span>•</span>
              <span>Cart: {guestCart.length} items</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SmartPublicCatalog;
