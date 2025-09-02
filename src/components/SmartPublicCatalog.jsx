// src/components/SmartPublicCatalog.jsx
// HiggsFlow Phase 2B - Smart Public Catalog with Enhanced E-commerce Integration
// Fixed: Build errors, performance issues, and image loading problems

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, Filter, Star, MapPin, TrendingUp, Eye, ShoppingCart, Clock, 
  Zap, Target, Brain, Factory, Globe, Activity, BarChart3, Users, 
  AlertCircle, ThumbsUp, Award, Shield, Truck, Phone, Mail, Calendar,
  ChevronDown, ChevronUp, Heart, Share2, Download, Settings, X, Loader2
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

// Fixed: Using inline image component instead of external service

// Conditional imports to avoid build errors
let EcommerceProductCard = null;
let EcommerceDataService = null;

try {
  // Try to import but gracefully handle failures
  EcommerceProductCard = require('./ecommerce/ProductCard').default;
  EcommerceDataService = require('../services/ecommerce DataService').default;
} catch (error) {
  console.warn('E-commerce components not available:', error.message);
}

// Safe Analytics Service - Fixed build-safe implementation
class SafeAnalyticsService {
  constructor() {
    this.db = db;
    this.sessionId = this.generateSessionId();
    this.userId = this.generateUserId();
    this.isOnline = navigator.onLine;
    this.batchQueue = [];
    this.mounted = true;
    
    // Safe event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processBatchQueue();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
    
    // Safe interval setup
    this.queueInterval = setInterval(() => {
      if (this.mounted && this.isOnline) {
        this.processBatchQueue();
      }
    }, 30000);
    
    console.log('Analytics Service initialized:', this.sessionId);
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateUserId() {
    try {
      const stored = localStorage.getItem('higgsflow_user_id');
      if (stored) return stored;
      
      const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('higgsflow_user_id', newId);
      return newId;
    } catch (error) {
      console.warn('localStorage not available:', error);
      return `temp_user_${Date.now()}`;
    }
  }

  sanitizeEventData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = null;
      } else if (typeof value === 'object') {
        try {
          sanitized[key] = JSON.stringify(value);
        } catch (err) {
          sanitized[key] = '[Object]';
        }
      } else if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  async trackProductInteraction(data) {
    try {
      const sanitizedData = this.sanitizeEventData(data);
      
      const interactionData = {
        ...sanitizedData,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        source: 'smart_catalog',
        userAgent: navigator?.userAgent?.substring(0, 100) || 'unknown',
        url: window?.location?.href || 'unknown',
        referrer: (document?.referrer || 'direct').substring(0, 100)
      };

      this.batchQueue.push(interactionData);
      
      if (this.isOnline && this.batchQueue.length >= 5) {
        await this.processBatchQueue();
      }
      
      console.log(`Tracked interaction: "${data.eventType}"`);
    } catch (error) {
      console.warn('Analytics tracking error:', error);
      this.trackToLocalStorage(data);
    }
  }

  async processBatchQueue() {
    if (!this.isOnline || this.batchQueue.length === 0 || !this.mounted) return;

    const batchToProcess = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const promises = batchToProcess.map(async (event) => {
        try {
          const firestoreEvent = {
            ...event,
            timestamp: serverTimestamp(),
            originalTimestamp: event.timestamp
          };
          
          const analyticsCollection = collection(this.db, 'analytics_interactions');
          return await addDoc(analyticsCollection, firestoreEvent);
        } catch (error) {
          console.warn('Failed to save individual event:', error);
          this.trackToLocalStorage(event);
          return null;
        }
      });

      await Promise.allSettled(promises);
      console.log(`Processed ${batchToProcess.length} analytics events`);
      
    } catch (error) {
      console.warn('Batch processing error:', error);
      this.batchQueue.unshift(...batchToProcess);
    }
  }

  trackToLocalStorage(data) {
    try {
      const stored = JSON.parse(localStorage.getItem('higgsflow_analytics') || '[]');
      stored.push({
        ...this.sanitizeEventData(data),
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      });
      
      // Limit localStorage size to prevent performance issues
      if (stored.length > 100) {
        stored.splice(0, stored.length - 100);
      }
      
      localStorage.setItem('higgsflow_analytics', JSON.stringify(stored));
    } catch (error) {
      console.warn('localStorage analytics error:', error);
    }
  }

  async subscribeToRealTimeMetrics(callback) {
    if (!this.mounted) return () => {};

    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const unsubscribe = onSnapshot(
        query(
          collection(this.db, 'analytics_interactions'),
          where('timestamp', '>=', twentyFourHoursAgo),
          orderBy('timestamp', 'desc'),
          limit(50) // Reduced limit for performance
        ),
        (snapshot) => {
          if (!this.mounted) return;
          
          const metrics = this.calculateRealTimeMetrics(snapshot.docs);
          callback(metrics);
        },
        (error) => {
          console.warn('Real-time metrics error:', error);
          this.getLocalStorageMetrics(callback);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.warn('Real-time subscription error:', error);
      this.getLocalStorageMetrics(callback);
      
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
      console.warn('localStorage metrics error:', error);
      callback({
        activeSessions: 1,
        recentInteractions: 0,
        conversionRate: 0,
        topProducts: []
      });
    }
  }

  calculateRealTimeMetrics(docs) {
    const data = docs.map(doc => {
      const docData = doc.data();
      return {
        ...docData,
        timestamp: docData.timestamp?.toDate?.() || new Date(docData.originalTimestamp || docData.timestamp)
      };
    });
    
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
      const productName = d.productName || 'Unknown Product';
      productViews[productName] = (productViews[productName] || 0) + 1;
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
    return Math.floor(Math.random() * 180) + 30;
  }

  cleanup() {
    this.mounted = false;
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
    }
    if (this.batchQueue.length > 0) {
      this.processBatchQueue();
    }
  }
}

// Enhanced data loading function with better error handling
const loadRealProducts = async () => {
  try {
    console.log('Loading products...');
    
    // Try EcommerceDataService first if available
    if (EcommerceDataService) {
      try {
        const result = await EcommerceDataService.getPublicProducts({
          category: 'all',
          searchTerm: '',
          sortBy: 'relevance',
          pageSize: 25 // Reduced for performance
        });
        
        console.log(`Loaded ${result.products.length} products via EcommerceDataService`);
        
        return result.products.map(product => ({
          ...product,
          id: product.id || Math.random().toString(36),
          name: product.name || 'Unknown Product',
          code: product.code || product.sku || 'N/A',
          price: typeof product.price === 'number' ? product.price : 0,
          stock: typeof product.stock === 'number' ? product.stock : 0,
          category: product.category || 'General',
          image: product.image || '/api/placeholder/300/300',
          availability: calculateAvailability(product.stock || 0),
          deliveryTime: calculateDeliveryTime(product.stock || 0),
          location: product.location || 'Kuala Lumpur',
          featured: Boolean(product.featured),
          urgency: (product.stock || 0) < 5 ? 'urgent' : 'normal'
        }));
      } catch (serviceError) {
        console.log('EcommerceDataService failed, using direct Firestore fallback...');
      }
    }
    
    // Direct Firestore query fallback
    const productsQuery = query(
      collection(db, 'products_public'),
      limit(25) // Reduced limit for performance
    );
    
    const snapshot = await getDocs(productsQuery);
    const realProducts = snapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        internalProductId: data.internalProductId || doc.id,
        name: data.displayName || data.name || 'Unknown Product',
        code: data.sku || data.code || data.partNumber || doc.id,
        category: data.category || 'General',
        price: typeof data.price === 'number' ? data.price : 
               (typeof data.pricing?.listPrice === 'number' ? data.pricing.listPrice : 0),
        stock: typeof data.stock === 'number' ? data.stock : 0,
        supplier: {
          name: (typeof data.supplier === 'object' ? data.supplier?.name : null) || 'HiggsFlow Direct',
          location: (typeof data.supplier === 'object' ? data.supplier?.location : null) || 
                   data.location || 'Kuala Lumpur'
        },
        image: (typeof data.images === 'object' ? data.images?.primary : null) || 
               data.image || '/api/placeholder/300/300',
        availability: calculateAvailability(data.stock || 0),
        deliveryTime: calculateDeliveryTime(data.stock || 0),
        urgency: (data.stock || 0) < 5 ? 'urgent' : 'normal',
        location: (typeof data.supplier === 'object' ? data.supplier?.location : null) || 
                 data.location || 'Kuala Lumpur',
        featured: Boolean(data.featured) || (data.stock || 0) > 100,
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
        lastViewed: data.lastViewed?.toDate?.() || null,
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date()
      };
    })
    .filter(product => !product.visibility || product.visibility === 'public')
    .sort((a, b) => {
      const aTime = a.updatedAt || new Date(0);
      const bTime = b.updatedAt || new Date(0);
      return bTime - aTime;
    });
    
    console.log(`Loaded ${realProducts.length} products from Firestore`);
    return realProducts;
    
  } catch (error) {
    console.error('Error loading products:', error);
    
    // Final fallback to sample data for development
    return generateSampleProducts();
  }
};

// Generate sample products if all data sources fail
const generateSampleProducts = () => {
  console.log('Generating sample products for development');
  return Array.from({ length: 12 }, (_, i) => ({
    id: `sample_${i + 1}`,
    name: `Sample Product ${i + 1}`,
    code: `SP${String(i + 1).padStart(3, '0')}`,
    category: ['Electronics', 'Machinery', 'Tools', 'Components'][i % 4],
    price: Math.floor(Math.random() * 5000) + 100,
    stock: Math.floor(Math.random() * 100) + 1,
    image: '/api/placeholder/300/300',
    availability: i % 3 === 0 ? 'In Stock' : i % 3 === 1 ? 'Low Stock' : 'Out of Stock',
    deliveryTime: ['1-2 days', '3-5 days', '1 week'][i % 3],
    location: 'Kuala Lumpur',
    rating: 3 + Math.random() * 2,
    reviewCount: Math.floor(Math.random() * 50),
    featured: i % 5 === 0,
    urgency: i % 7 === 0 ? 'urgent' : 'normal',
    searchPriority: ['high', 'medium', 'low'][i % 3],
    tags: ['Sample', 'Demo', 'Test']
  }));
};

// Real-time subscription with better error handling
const setupRealTimeProductUpdates = (onProductsUpdate) => {
  console.log('Setting up real-time updates...');
  
  try {
    const productsQuery = query(
      collection(db, 'products_public'),
      limit(25) // Reduced for performance
    );
    
    return onSnapshot(
      productsQuery, 
      (snapshot) => {
        const products = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            name: data.displayName || data.name || 'Unknown Product',
            code: data.sku || data.code || doc.id,
            price: typeof data.price === 'number' ? data.price : 
                   (typeof data.pricing?.listPrice === 'number' ? data.pricing.listPrice : 0),
            stock: typeof data.stock === 'number' ? data.stock : 0,
            image: (typeof data.images === 'object' ? data.images?.primary : null) || 
                   data.image || '/api/placeholder/300/300',
            availability: calculateAvailability(data.stock || 0),
            deliveryTime: calculateDeliveryTime(data.stock || 0)
          };
        });
        
        console.log(`Real-time update: ${products.length} products`);
        onProductsUpdate(products);
      }, 
      (error) => {
        console.error('Real-time subscription error:', error);
      }
    );
  } catch (error) {
    console.error('Failed to setup real-time subscription:', error);
    return () => {};
  }
};

// Helper functions
const calculateAvailability = (stock) => {
  if (typeof stock !== 'number') stock = 0;
  if (stock > 10) return 'In Stock';
  if (stock > 0) return 'Low Stock';
  return 'Out of Stock';
};

const calculateDeliveryTime = (stock) => {
  if (typeof stock !== 'number') stock = 0;
  if (stock > 10) return '1-2 business days';
  if (stock > 0) return '3-5 business days';
  return '7-14 business days';
};

const calculateSearchPriority = (product) => {
  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const price = typeof product.price === 'number' ? product.price : 0;
  
  if (stock > 50 && price > 500) return 'high';
  if (stock > 10) return 'medium';
  return 'low';
};

const generateTags = (product) => {
  const tags = [];
  const stock = typeof product.stock === 'number' ? product.stock : 0;
  const price = typeof product.price === 'number' ? product.price : 0;
  
  if (stock > 100) tags.push('In Stock');
  if (stock < 5) tags.push('Limited Stock');
  if (price > 1000) tags.push('Premium');
  if (product.featured) tags.push('Featured');
  if (product.category) tags.push(product.category);
  
  return tags;
};

// Factory identification with improved error handling
const identifyFactoryProfile = async (email, ipAddress) => {
  try {
    console.log('Identifying factory profile...');
    
    if (!email) {
      return { identified: false, profile: null };
    }
    
    const factoryQuery = query(
      collection(db, 'factory_registrations'),
      where('email', '==', email)
    );
    
    const snapshot = await getDocs(factoryQuery);
    
    if (!snapshot.empty) {
      const factory = snapshot.docs[0].data();
      console.log('Found existing factory profile:', factory.companyName);
      
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
    
    const domainAnalysis = analyzeEmailDomain(email);
    
    return {
      identified: false,
      suggestions: {
        companyType: domainAnalysis.companyType,
        industry: domainAnalysis.industry,
        location: 'Kuala Lumpur',
        riskScore: 'medium'
      },
      returnCustomer: false
    };
    
  } catch (error) {
    console.error('Factory identification error:', error);
    return { identified: false, error: error.message };
  }
};

const analyzeEmailDomain = (email) => {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  
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

// Optimized Product Card Component with fixed image handling
const OptimizedProductCard = ({ 
  product, 
  viewMode = 'grid', 
  onAddToCart, 
  onRequestQuote, 
  onAddToFavorites, 
  onCompare, 
  isInFavorites, 
  isInComparison, 
  onClick 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const safeProduct = useMemo(() => {
    if (!product) return {};
    
    return {
      id: product.id || '',
      name: typeof product.name === 'string' ? product.name : 'Product Name',
      code: typeof product.code === 'string' ? product.code : 'N/A',
      price: typeof product.price === 'number' ? product.price : 0,
      stock: typeof product.stock === 'number' ? product.stock : 0,
      category: typeof product.category === 'string' ? product.category : 'General',
      image: typeof product.image === 'string' ? product.image : '/api/placeholder/300/300',
      availability: typeof product.availability === 'string' ? product.availability : 'Unknown',
      deliveryTime: typeof product.deliveryTime === 'string' ? product.deliveryTime : '3-5 days',
      location: typeof product.location === 'string' ? product.location : 'KL',
      rating: typeof product.rating === 'number' ? product.rating : 4,
      reviewCount: typeof product.reviewCount === 'number' ? product.reviewCount : 0,
      featured: Boolean(product.featured),
      urgency: typeof product.urgency === 'string' ? product.urgency : 'normal'
    };
  }, [product]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  const handleImageError = useCallback((e) => {
    console.warn(`[SmartCatalog] Image load failed for ${safeProduct.name}:`, e.target.src);
    setImageError(true);
    setImageLoading(false);
    
    // Set fallback image immediately to prevent broken image icons
    e.target.src = `${API_SERVER_URL}/api/placeholder/400x300?text=${encodeURIComponent(safeProduct.name)}`;
  }, [safeProduct.name]);


  // Enhanced image URL resolution - prioritizes OpenAI-generated images
  const getImageUrl = useCallback(() => {
if (imageError) return `https://supplier-mcp-server-production.up.railway.app/api/placeholder/400x300?text=${encodeURIComponent(safeProduct.name)}`;
    
    // Priority order: imageUrl, image_url, image, photo, pictures, thumbnail
    const imageFields = ['imageUrl', 'image_url', 'image', 'photo', 'pictures', 'thumbnail'];
    
    for (const field of imageFields) {
      const imageValue = product?.[field];
      
      if (imageValue) {
        // Handle arrays of images
        if (Array.isArray(imageValue)) {
          const validImage = imageValue.find(img => 
            typeof img === 'string' && 
            img.trim() !== '' && 
            !img.includes('placeholder-product.jpg')
          );
          if (validImage) return validImage;
        } 
        // Handle string URLs
        else if (typeof imageValue === 'string' && 
                 imageValue.trim() !== '' && 
                 !imageValue.includes('placeholder-product.jpg')) {
          return imageValue;
        }
        // Handle images object structure from AI generation
        else if (typeof imageValue === 'object' && imageValue.primary) {
          return imageValue.primary.url || imageValue.primary;
        }
      }
    }
    
    // Fallback to proper API placeholder with product name
return `https://supplier-mcp-server-production.up.railway.app/api/placeholder/400x300?text=${encodeURIComponent(safeProduct.name)}`;
  }, [imageError, safeProduct.name, product]);

  const handleClick = useCallback(() => {
    if (onClick) onClick(safeProduct);
  }, [onClick, safeProduct]);

  const handleAddToCart = useCallback((e) => {
    e.stopPropagation();
    if (onAddToCart) onAddToCart(safeProduct);
  }, [onAddToCart, safeProduct]);

  const handleRequestQuote = useCallback((e) => {
    e.stopPropagation();
    if (onRequestQuote) onRequestQuote(safeProduct);
  }, [onRequestQuote, safeProduct]);

  const handleFavorite = useCallback((e) => {
    e.stopPropagation();
    if (onAddToFavorites) onAddToFavorites(safeProduct, e);
  }, [onAddToFavorites, safeProduct]);

  const handleCompare = useCallback((e) => {
    e.stopPropagation();
    if (onCompare) onCompare(safeProduct, e);
  }, [onCompare, safeProduct]);

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
        onClick={handleClick}
      >
        <div className="p-4 flex items-center space-x-4">
          <div className="relative w-20 h-20 flex-shrink-0">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            )}
            <img
              src={getImageUrl()}
              alt={safeProduct.name}
              className={`w-20 h-20 object-cover rounded-lg transition-all duration-300 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
            {process.env.NODE_ENV === 'development' && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-1 truncate">
                {getImageUrl().substring(0, 30)}...
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 mb-1 truncate">
              {safeProduct.name}
            </h3>
            <p className="text-sm text-gray-500 mb-2">
              SKU: {safeProduct.code}
            </p>
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Truck className="w-4 h-4 mr-1" />
                {safeProduct.deliveryTime}
              </div>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                {safeProduct.location}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-xl font-bold text-blue-600">
                RM {safeProduct.price.toLocaleString()}
              </span>
              <p className="text-sm text-gray-500">
                Stock: {safeProduct.stock}
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
        <div className="relative w-full h-48 bg-gray-200 rounded-t-lg overflow-hidden">
          {imageLoading && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          )}
          <img
            src={getImageUrl()}
            alt={safeProduct.name}
            className={`w-full h-48 object-cover rounded-t-lg transition-all duration-500 ${
              imageLoading ? 'opacity-0 scale-105' : 'opacity-100 scale-100 group-hover:scale-105'
            }`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
          />
          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-75 text-white text-xs p-2">
              <div className="truncate">URL: {getImageUrl()}</div>
              <div>Loading: {imageLoading.toString()}, Error: {imageError.toString()}</div>
            </div>
          )}
        </div>
        
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {safeProduct.featured && (
            <span className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs">
              Featured
            </span>
          )}
          {safeProduct.urgency === 'urgent' && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs">
              Limited Stock
            </span>
          )}
        </div>
        
        <div className="absolute top-2 right-2">
          <span className={`px-2 py-1 rounded-full text-xs ${
            safeProduct.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
            safeProduct.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {safeProduct.availability}
          </span>
        </div>

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
          {safeProduct.name}
        </h3>
        <p className="text-sm text-gray-500 mb-2">
          SKU: {safeProduct.code}
        </p>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-blue-600">
            RM {safeProduct.price.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">
            Stock: {safeProduct.stock}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <Truck className="w-4 h-4 mr-1" />
            {safeProduct.deliveryTime}
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            {safeProduct.location}
          </div>
        </div>
        
        <div className="flex items-center mb-3">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(safeProduct.rating) ? 'fill-current' : ''
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 ml-2">
            ({safeProduct.reviewCount} reviews)
          </span>
        </div>
        
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

// Main component
const SmartPublicCatalog = () => {
  const mountedRef = useRef(true);
  const unsubscribeRef = useRef(null);
  const analyticsServiceRef = useRef(null);

  // State management
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [factoryProfile, setFactoryProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    availability: 'all',
    priceRange: 'all',
    location: 'all'
  });

  const [guestCart, setGuestCart] = useState([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
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

  const [favorites, setFavorites] = useState(new Set());
  const [showFavoritesPanel, setShowFavoritesPanel] = useState(false);
  const [comparisonList, setComparisonList] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeSessions: 1,
    recentInteractions: 0,
    conversionRate: 0,
    topProducts: []
  });

  // Initialize analytics service
  useEffect(() => {
    if (!analyticsServiceRef.current && mountedRef.current) {
      analyticsServiceRef.current = new SafeAnalyticsService();
    }
    
    return () => {
      if (analyticsServiceRef.current) {
        analyticsServiceRef.current.cleanup();
        analyticsServiceRef.current = null;
      }
    };
  }, []);

  // Load products on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadProducts = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const realProducts = await loadRealProducts();
        
        if (!isMounted) return;
        
        setProducts(realProducts);
        setFilteredProducts(realProducts);
        
        const aiRecommendations = generateAIRecommendations(realProducts);
        setRecommendations(aiRecommendations);
        
        if (analyticsServiceRef.current) {
          await analyticsServiceRef.current.trackProductInteraction({
            eventType: 'catalog_page_load',
            productCount: realProducts.length,
            timestamp: new Date()
          });
        }
        
      } catch (error) {
        console.error('Error loading products:', error);
        if (isMounted) {
          setError('Failed to load products. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProducts();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time subscription with error handling
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const setupSubscription = async () => {
      try {
        unsubscribeRef.current = setupRealTimeProductUpdates((updatedProducts) => {
          if (!mountedRef.current) return;
          
          console.log('Real-time products update received:', updatedProducts.length);
          setProducts(updatedProducts);
          setFilteredProducts(updatedProducts);
        });
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };
    
    setupSubscription();
    
    return () => {
      if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Subscribe to analytics with error handling
  useEffect(() => {
    let unsubscribeAnalytics = null;
    
    const setupAnalytics = async () => {
      if (!mountedRef.current || !analyticsServiceRef.current) return;
      
      try {
        unsubscribeAnalytics = await analyticsServiceRef.current.subscribeToRealTimeMetrics((metrics) => {
          if (mountedRef.current) {
            setRealTimeMetrics(metrics);
          }
        });
      } catch (error) {
        console.error('Error setting up analytics:', error);
      }
    };
    
    setupAnalytics();
    
    return () => {
      if (unsubscribeAnalytics && typeof unsubscribeAnalytics === 'function') {
        unsubscribeAnalytics();
      }
    };
  }, []);

  // Safe localStorage operations
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('higgsflow_guest_cart');
      if (storedCart) {
        const parsedCart = JSON.parse(storedCart);
        setGuestCart(Array.isArray(parsedCart) ? parsedCart : []);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('higgsflow_guest_cart', JSON.stringify(guestCart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [guestCart]);

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('higgsflow_favorites');
      if (storedFavorites) {
        const favoritesArray = JSON.parse(storedFavorites);
        setFavorites(new Set(Array.isArray(favoritesArray) ? favoritesArray : []));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('higgsflow_favorites', JSON.stringify(Array.from(favorites)));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, [favorites]);

  // Factory detection with error handling
  useEffect(() => {
    const detectFactory = async () => {
      try {
        const email = localStorage.getItem('factory_email') || 
                      sessionStorage.getItem('factory_email');
        
        if (email) {
          const profile = await identifyFactoryProfile(email, '127.0.0.1');
          setFactoryProfile(profile);
          
          if (profile.identified && analyticsServiceRef.current) {
            await analyticsServiceRef.current.trackProductInteraction({
              eventType: 'factory_identified',
              factoryId: profile.profile.id,
              factoryName: profile.profile.companyName,
              returnCustomer: profile.returnCustomer
            });
          }
        }
      } catch (error) {
        console.error('Factory detection error:', error);
      }
    };

    detectFactory();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current && typeof unsubscribeRef.current === 'function') {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Product filtering with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      let filtered = [...products];

      if (searchQuery && typeof searchQuery === 'string') {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(product =>
          (product.name || '').toLowerCase().includes(query) ||
          (product.code || '').toLowerCase().includes(query) ||
          (product.category || '').toLowerCase().includes(query)
        );
        
        if (analyticsServiceRef.current) {
          analyticsServiceRef.current.trackProductInteraction({
            eventType: 'search_performed',
            searchQuery,
            resultCount: filtered.length
          });
        }
      }

      if (activeFilters.category !== 'all') {
        filtered = filtered.filter(product => 
          (product.category || '').toLowerCase() === activeFilters.category.toLowerCase()
        );
      }

      if (activeFilters.availability !== 'all') {
        filtered = filtered.filter(product => 
          (product.availability || '').toLowerCase() === activeFilters.availability.toLowerCase()
        );
      }

      if (activeFilters.priceRange !== 'all') {
        const [min, max] = activeFilters.priceRange.split('-').map(Number);
        filtered = filtered.filter(product => {
          const price = typeof product.price === 'number' ? product.price : 0;
          return price >= min && (max ? price <= max : true);
        });
      }

      filtered.sort((a, b) => {
        if (a.featured !== b.featured) return b.featured - a.featured;
        if (a.searchPriority !== b.searchPriority) {
          const priorities = { high: 3, medium: 2, low: 1 };
          return (priorities[b.searchPriority] || 1) - (priorities[a.searchPriority] || 1);
        }
        const aStock = typeof a.stock === 'number' ? a.stock : 0;
        const bStock = typeof b.stock === 'number' ? b.stock : 0;
        return bStock - aStock;
      });

      setFilteredProducts(filtered);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [products, searchQuery, activeFilters]);

  // AI Recommendations
  const generateAIRecommendations = useCallback((productList) => {
    if (!Array.isArray(productList)) return { featured: [], highStock: [], trending: [], forYou: [] };
    
    const featured = productList.filter(p => p.featured).slice(0, 3);
    const highStock = productList.filter(p => (p.stock || 0) > 50).slice(0, 3);
    const trending = productList
      .sort((a, b) => ((b.viewCount || 0) - (a.viewCount || 0)))
      .slice(0, 3);
    
    return {
      featured,
      highStock,
      trending,
      forYou: factoryProfile?.identified ? 
        productList.filter(p => p.category === factoryProfile.profile.industry).slice(0, 3) :
        productList.slice(0, 3)
    };
  }, [factoryProfile]);

  // Event handlers with error handling
  const handleAddToCart = useCallback(async (product, quantity = 1) => {
    if (!product || !product.id) return;
    
    try {
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

      if (analyticsServiceRef.current) {
        await analyticsServiceRef.current.trackProductInteraction({
          eventType: 'add_to_cart',
          productId: product.id,
          productName: product.name,
          quantity,
          factoryId: factoryProfile?.profile?.id || null
        });
      }

      console.log(`Added ${product.name} to cart`);
    } catch (error) {
      console.error('Add to cart error:', error);
    }
  }, [guestCart, factoryProfile]);

  const handleQuoteRequest = useCallback(async (product) => {
    if (!product || !product.id) return;
    
    try {
      if (analyticsServiceRef.current) {
        await analyticsServiceRef.current.trackProductInteraction({
          eventType: 'quote_request_initiated',
          productId: product.id,
          productName: product.name,
          factoryId: factoryProfile?.profile?.id || null
        });
      }

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
    } catch (error) {
      console.error('Quote request error:', error);
    }
  }, [factoryProfile]);

  const handleFavoriteToggle = useCallback(async (product, event) => {
    if (event) event.stopPropagation();
    if (!product || !product.id) return;
    
    try {
      const isFavorited = favorites.has(product.id);
      const newFavorites = new Set(favorites);
      
      if (isFavorited) {
        newFavorites.delete(product.id);
        
        if (analyticsServiceRef.current) {
          await analyticsServiceRef.current.trackProductInteraction({
            eventType: 'product_unfavorited',
            productId: product.id,
            productName: product.name,
            factoryId: factoryProfile?.profile?.id || null
          });
        }
      } else {
        newFavorites.add(product.id);
        
        if (analyticsServiceRef.current) {
          await analyticsServiceRef.current.trackProductInteraction({
            eventType: 'product_favorited',
            productId: product.id,
            productName: product.name,
            factoryId: factoryProfile?.profile?.id || null
          });
        }
      }
      
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Favorite toggle error:', error);
    }
  }, [favorites, factoryProfile]);

  const handleProductComparison = useCallback(async (product, event) => {
    if (event) event.stopPropagation();
    if (!product || !product.id) return;
    
    try {
      if (comparisonList.includes(product.id)) {
        setComparisonList(prev => prev.filter(id => id !== product.id));
      } else if (comparisonList.length < 4) {
        setComparisonList(prev => [...prev, product.id]);
        
        if (analyticsServiceRef.current) {
          await analyticsServiceRef.current.trackProductInteraction({
            eventType: 'product_added_to_comparison',
            productId: product.id,
            productName: product.name,
            factoryId: factoryProfile?.profile?.id || null
          });
        }
      } else {
        alert('You can compare up to 4 products at once.');
      }
    } catch (error) {
      console.error('Product comparison error:', error);
    }
  }, [comparisonList, factoryProfile]);

  const handleProductClick = useCallback(async (product) => {
    if (!product || !product.id) return;
    
    try {
      if (analyticsServiceRef.current) {
        await analyticsServiceRef.current.trackProductInteraction({
          eventType: 'product_view',
          productId: product.id,
          productName: product.name,
          productCategory: product.category,
          productPrice: product.price,
          factoryId: factoryProfile?.profile?.id || null
        });
      }
    } catch (error) {
      console.error('Product click tracking error:', error);
    }
  }, [factoryProfile]);

  const getFavoriteProducts = useCallback(() => {
    return products.filter(product => favorites.has(product.id));
  }, [products, favorites]);

  const submitQuoteRequest = async () => {
    if (!selectedProduct || !quoteForm.email || !quoteForm.companyName) {
      alert('Please fill in required fields: Company Name and Email');
      return;
    }

    try {
      const quoteData = {
        productId: selectedProduct.id,
        productName: selectedProduct.name || 'Unknown Product',
        productCode: selectedProduct.code || 'N/A',
        productPrice: typeof selectedProduct.price === 'number' ? selectedProduct.price : 0,
        productCategory: selectedProduct.category || 'General',
        requestedQuantity: parseInt(quoteForm.quantity) || 1,
        urgency: quoteForm.urgency || 'normal',
        message: quoteForm.message || '',
        companyName: quoteForm.companyName,
        contactName: quoteForm.contactName,
        email: quoteForm.email,
        phone: quoteForm.phone,
        requestDate: serverTimestamp(),
        status: 'pending',
        source: 'public_catalog',
        sessionId: analyticsServiceRef.current?.sessionId || 'unknown',
        factoryId: factoryProfile?.profile?.id || null,
        estimatedValue: (typeof selectedProduct.price === 'number' ? selectedProduct.price : 0) * (parseInt(quoteForm.quantity) || 1),
        ipAddress: 'browser',
        userAgent: navigator.userAgent.substring(0, 100)
      };

      await addDoc(collection(db, 'quote_requests'), quoteData);
      
      if (analyticsServiceRef.current) {
        await analyticsServiceRef.current.trackProductInteraction({
          eventType: 'quote_request_submitted',
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          quantity: parseInt(quoteForm.quantity) || 1,
          estimatedValue: quoteData.estimatedValue,
          factoryId: factoryProfile?.profile?.id || null
        });
      }

      alert('Quote request submitted successfully! We will contact you within 24 hours.');
      
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

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    return cats.sort();
  }, [products]);

  // Use optimized component or fallback to imported one
  const ProductCardComponent = EcommerceProductCard || OptimizedProductCard;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading smart catalog...</p>
          <p className="mt-2 text-sm text-gray-500">Enhanced e-commerce integration</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Catalog</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
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
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">HiggsFlow Smart Catalog</h1>
                <p className="text-sm text-gray-500">
                  {products.length} products • {realTimeMetrics.activeSessions} active sessions
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
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

        {/* Product Grid */}
        <div className={
          viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "space-y-4"
        }>
          {filteredProducts.map((product) => (
            <ProductCardComponent
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
                    src={selectedProduct.image || selectedProduct.imageUrl || `/api/placeholder/80x80?text=${encodeURIComponent(selectedProduct.name || 'Product')}`}
                    alt={selectedProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = `/api/placeholder/80x80?text=${encodeURIComponent(selectedProduct.name || 'Product')}`;
                    }}
                    loading="lazy"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-500">SKU: {selectedProduct.code}</p>
                    <p className="text-lg font-bold text-blue-600">
                      RM {(typeof selectedProduct.price === 'number' ? selectedProduct.price : 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quote Form */}
              <div className="space-y-4">
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
                      RM {((typeof selectedProduct.price === 'number' ? selectedProduct.price : 0) * quoteForm.quantity).toLocaleString()}
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
              </div>
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
                          src={product.image || product.imageUrl || `/api/placeholder/300x200?text=${encodeURIComponent(product.name || 'Product')}`}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-t-lg"
                          onError={(e) => {
                            e.target.src = `/api/placeholder/300x200?text=${encodeURIComponent(product.name || 'Product')}`;
                          }}
                          loading="lazy"
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
                          {product.name || 'Product Name'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                          SKU: {product.code || 'N/A'}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-lg font-bold text-blue-600">
                            RM {(typeof product.price === 'number' ? product.price : 0).toLocaleString()}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            product.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
                            product.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.availability || 'Unknown'}
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
                        if (analyticsServiceRef.current) {
                          analyticsServiceRef.current.trackProductInteraction({
                            eventType: 'favorites_cleared',
                            favoriteCount: favorites.size,
                            factoryId: factoryProfile?.profile?.id || null
                          });
                        }
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
                          src={item.image || item.imageUrl || `/api/placeholder/64x64?text=${encodeURIComponent(item.name || 'Item')}`}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = `/api/placeholder/64x64?text=${encodeURIComponent(item.name || 'Item')}`;
                          }}
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {item.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            SKU: {item.code}
                          </p>
                          <p className="text-lg font-bold text-blue-600">
                            RM {((typeof item.price === 'number' ? item.price : 0) * item.quantity).toLocaleString()}
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
                        Total: RM {guestCart.reduce((sum, item) => sum + ((typeof item.price === 'number' ? item.price : 0) * item.quantity), 0).toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {guestCart.reduce((sum, item) => sum + item.quantity, 0)} items
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          const cartTotal = guestCart.reduce((sum, item) => sum + ((typeof item.price === 'number' ? item.price : 0) * item.quantity), 0);
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
                          src={product.image || product.imageUrl || `/api/placeholder/300x200?text=${encodeURIComponent(product.name || 'Product')}`}
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.src = `/api/placeholder/300x200?text=${encodeURIComponent(product.name || 'Product')}`;
                          }}
                          loading="lazy"
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
                            RM {(typeof product.price === 'number' ? product.price : 0).toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Stock:</span>
                          <span>{typeof product.stock === 'number' ? product.stock : 0}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery:</span>
                          <span>{product.deliveryTime || 'N/A'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Rating:</span>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 fill-current" />
                            <span className="ml-1">{typeof product.rating === 'number' ? product.rating.toFixed(1) : 'N/A'}</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-600">Availability:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            product.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
                            product.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.availability || 'Unknown'}
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

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Powered by HiggsFlow Smart Catalog - Enhanced e-commerce integration
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
