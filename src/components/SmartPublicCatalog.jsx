// src/components/SmartPublicCatalog.jsx
// HiggsFlow Phase 2B - Smart Public Catalog with Enhanced E-commerce Integration
// CRITICAL FIX: Completely eliminates infinite console warnings from failed image loading

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, Filter, Star, MapPin, TrendingUp, Eye, ShoppingCart, Clock, 
  Zap, Target, Brain, Factory, Globe, Activity, BarChart3, Users, 
  AlertCircle, ThumbsUp, Award, Shield, Truck, Phone, Mail, Calendar,
  ChevronDown, ChevronUp, Heart, Share2, Download, Settings, X, Loader2,
  Package
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

// CRITICAL FIX: Comprehensive error throttling system
class ErrorThrottle {
  constructor(maxErrorsPerMinute = 3) {
    this.errors = new Map();
    this.maxErrorsPerMinute = maxErrorsPerMinute;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      // Clean up old error records every 2 minutes
      for (const [key, data] of this.errors.entries()) {
        if (now - data.firstSeen > 120000) { // 2 minutes
          this.errors.delete(key);
        }
      }
    }, 120000);
  }

  shouldLog(key, errorType) {
    const now = Date.now();
    const errorKey = `${key}_${errorType}`;
    
    if (!this.errors.has(errorKey)) {
      this.errors.set(errorKey, { count: 1, firstSeen: now, lastSeen: now });
      return true;
    }

    const errorData = this.errors.get(errorKey);
    
    // Reset counter if more than a minute has passed
    if (now - errorData.firstSeen > 60000) {
      this.errors.set(errorKey, { count: 1, firstSeen: now, lastSeen: now });
      return true;
    }

    // Don't log if we've exceeded the limit
    if (errorData.count >= this.maxErrorsPerMinute) {
      return false;
    }

    errorData.count++;
    errorData.lastSeen = now;
    return errorData.count <= this.maxErrorsPerMinute;
  }

  cleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.errors.clear();
  }
}

// Global error throttle instance - reduced to max 3 errors per minute per product
const globalErrorThrottle = new ErrorThrottle(3);

// Conditional imports to avoid build errors
let EcommerceProductCard = null;
let EcommerceDataService = null;

try {
  EcommerceProductCard = require('./ecommerce/ProductCard').default;
  EcommerceDataService = require('../services/ecommerce DataService').default;
} catch (error) {
  console.warn('E-commerce components not available:', error.message);
}

// Safe Analytics Service - Enhanced with better error handling
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
      
      if (globalErrorThrottle.shouldLog('analytics', 'track_interaction')) {
        console.log(`Tracked interaction: "${data.eventType}"`);
      }
    } catch (error) {
      if (globalErrorThrottle.shouldLog('analytics', 'track_error')) {
        console.warn('Analytics tracking error:', error);
      }
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
          if (globalErrorThrottle.shouldLog('analytics', 'batch_error')) {
            console.warn('Failed to save individual event:', error);
          }
          this.trackToLocalStorage(event);
          return null;
        }
      });

      await Promise.allSettled(promises);
      console.log(`Processed ${batchToProcess.length} analytics events`);
      
    } catch (error) {
      if (globalErrorThrottle.shouldLog('analytics', 'process_error')) {
        console.warn('Batch processing error:', error);
      }
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
      // Silent fail for localStorage analytics
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
          limit(50)
        ),
        (snapshot) => {
          if (!this.mounted) return;
          
          const metrics = this.calculateRealTimeMetrics(snapshot.docs);
          callback(metrics);
        },
        (error) => {
          if (globalErrorThrottle.shouldLog('analytics', 'metrics_error')) {
            console.warn('Real-time metrics error:', error);
          }
          this.getLocalStorageMetrics(callback);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      if (globalErrorThrottle.shouldLog('analytics', 'subscription_error')) {
        console.warn('Real-time subscription error:', error);
      }
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
          pageSize: 25
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
      limit(25)
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
      limit(25)
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
        if (globalErrorThrottle.shouldLog('firestore', 'realtime_error')) {
          console.error('Real-time subscription error:', error);
        }
      }
    );
  } catch (error) {
    if (globalErrorThrottle.shouldLog('firestore', 'setup_error')) {
      console.error('Failed to setup real-time subscription:', error);
    }
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
    if (globalErrorThrottle.shouldLog('factory', 'identification_error')) {
      console.error('Factory identification error:', error);
    }
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

// CRITICAL FIX: Completely rewritten Product Card with no external image failures
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
  const [imageState, setImageState] = useState({
    loaded: false,
    error: false,
    attempts: 0
  });

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

  // ENHANCED: Smart image URL resolution supporting your Firebase Storage implementation
  const getImageUrl = useCallback(() => {
    // Check if we've had errors or too many attempts
    if (imageState.error || imageState.attempts > 1) {
      return null;
    }
    
    // Priority order for image URL resolution - optimized for your Firebase Storage system
    const imageFields = [
      'imageUrl',           // Primary image URL (highest priority)
      'generatedImages',    // AI-generated images with Firebase Storage
      'firebaseStorage',    // Direct Firebase Storage data
      'manualUpload',       // Manually uploaded images
      'image_url', 
      'image',
      'photo', 
      'pictures', 
      'thumbnail'
    ];
    
    for (const field of imageFields) {
      const imageValue = product?.[field];
      
      if (imageValue) {
        // Handle your Firebase Storage implementation structure
        if (field === 'firebaseStorage' && typeof imageValue === 'object') {
          // Direct Firebase Storage object from your uploadSingleImageToFirebase method
          if (imageValue.downloadURL && isValidImageUrl(imageValue.downloadURL)) {
            return imageValue.downloadURL;
          }
          if (imageValue.url && isValidImageUrl(imageValue.url)) {
            return imageValue.url;
          }
        }
        
        // Handle generated images object from your diagnostic implementation
        else if (field === 'generatedImages' && typeof imageValue === 'object') {
          // Check for Firebase Storage data first (your implementation priority)
          if (imageValue.firebaseStorage) {
            if (imageValue.firebaseStorage.downloadURL && isValidImageUrl(imageValue.firebaseStorage.downloadURL)) {
              return imageValue.firebaseStorage.downloadURL;
            }
            if (imageValue.firebaseStorage.url && isValidImageUrl(imageValue.firebaseStorage.url)) {
              return imageValue.firebaseStorage.url;
            }
          }
          
          // Check for primary generated image
          if (imageValue.primary?.url && isValidImageUrl(imageValue.primary.url)) {
            return imageValue.primary.url;
          }
          
          // Check for any valid image in imageUrls array
          if (Array.isArray(imageValue.imageUrls)) {
            for (const urlObj of imageValue.imageUrls) {
              const url = typeof urlObj === 'string' ? urlObj : urlObj?.url;
              if (url && isValidImageUrl(url)) return url;
            }
          }
          
          // Check for saved Firebase URLs from your bulk upload system
          if (imageValue.saved?.firebaseUrl && isValidImageUrl(imageValue.saved.firebaseUrl)) {
            return imageValue.saved.firebaseUrl;
          }
        }
        
        // Handle manual upload object structure
        else if (field === 'manualUpload' && typeof imageValue === 'object') {
          // Prioritize Firebase URL for manual uploads
          if (imageValue.firebaseUrl && isValidImageUrl(imageValue.firebaseUrl)) {
            return imageValue.firebaseUrl;
          }
          
          // Check for downloadURL from Firebase Storage
          if (imageValue.downloadURL && isValidImageUrl(imageValue.downloadURL)) {
            return imageValue.downloadURL;
          }
          
          // Fallback to regular imageUrl
          if (imageValue.imageUrl && isValidImageUrl(imageValue.imageUrl)) {
            return imageValue.imageUrl;
          }
        }
        
        // Handle arrays of images
        else if (Array.isArray(imageValue) && imageValue.length > 0) {
          const validImage = imageValue.find(img => {
            const url = typeof img === 'string' ? img : 
                        img?.downloadURL || img?.firebaseUrl || img?.url;
            return url && isValidImageUrl(url);
          });
          if (validImage) {
            const url = typeof validImage === 'string' ? validImage : 
                        validImage.downloadURL || validImage.firebaseUrl || validImage.url;
            return url;
          }
        }
        
        // Handle string URLs
        else if (typeof imageValue === 'string' && imageValue.trim() !== '') {
          if (isValidImageUrl(imageValue)) {
            return imageValue;
          }
        }
        
        // Handle image objects with URL property
        else if (typeof imageValue === 'object' && imageValue?.url) {
          if (isValidImageUrl(imageValue.url)) {
            return imageValue.url;
          }
        }
      }
    }
    
    // No valid image found, use fallback
    return null;
  }, [product, imageState.error, imageState.attempts]);

  // Enhanced helper function supporting your Firebase Storage URLs
  const isValidImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    // Must be HTTPS for security
    if (!url.startsWith('https://')) return false;
    
    // Allow Firebase Storage URLs (your primary storage system)
    if (url.includes('firebasestorage.googleapis.com')) return true;
    
    // Allow Firebase Functions URLs (for generated images)
    if (url.includes('cloudfunctions.net')) return true;
    
    // Allow your Railway backend URLs
    if (url.includes('railway.app')) return true;
    
    // Allow your own domain images
    if (url.includes('higgsflow.com')) return true;
    
    // Allow common reliable CDN providers
    if (url.includes('cloudinary.com') || 
        url.includes('amazonaws.com') || 
        url.includes('googleapis.com')) return true;
    
    // Reject known problematic URLs from your diagnostic
    if (url.includes('placeholder-product.jpg') ||
        url.includes('supplier-mcp-server') ||
        (url.includes('img-') && !url.includes('firebasestorage')) ||
        url.includes('oaidalleapiprodscus.blob.core.windows.net')) {
      return false;
    }
    
    return true;
  };

  // CRITICAL FIX: Enhanced image handlers with strict error limiting
  const handleImageLoad = useCallback(() => {
    setImageState(prev => ({
      ...prev,
      loaded: true,
      error: false
    }));
  }, []);

  const handleImageError = useCallback((e) => {
    setImageState(prev => {
      const newAttempts = prev.attempts + 1;
      
      // Only log first error to prevent spam
      if (newAttempts === 1 && globalErrorThrottle.shouldLog(safeProduct.id, 'image_load_error')) {
        console.warn(`[SmartCatalog] Image load failed for ${safeProduct.name}`);
      }
      
      return {
        loaded: false,
        error: true,
        attempts: newAttempts
      };
    });
    
    // Don't attempt to set another src to prevent infinite loops
    if (e.target) {
      e.target.style.display = 'none';
    }
  }, [safeProduct.id, safeProduct.name]);

  // Event handlers with error protection
  const handleClick = useCallback(() => {
    try {
      onClick?.(safeProduct);
    } catch (error) {
      if (globalErrorThrottle.shouldLog(safeProduct.id, 'click_error')) {
        console.warn('[ProductCard] Click error:', error.message);
      }
    }
  }, [onClick, safeProduct]);

  const handleAddToCart = useCallback((e) => {
    try {
      e.stopPropagation();
      onAddToCart?.(safeProduct);
    } catch (error) {
      if (globalErrorThrottle.shouldLog(safeProduct.id, 'cart_error')) {
        console.warn('[ProductCard] Add to cart error:', error.message);
      }
    }
  }, [onAddToCart, safeProduct]);

  const handleRequestQuote = useCallback((e) => {
    try {
      e.stopPropagation();
      onRequestQuote?.(safeProduct);
    } catch (error) {
      if (globalErrorThrottle.shouldLog(safeProduct.id, 'quote_error')) {
        console.warn('[ProductCard] Quote request error:', error.message);
      }
    }
  }, [onRequestQuote, safeProduct]);

  const handleFavorite = useCallback((e) => {
    try {
      e.stopPropagation();
      onAddToFavorites?.(safeProduct, e);
    } catch (error) {
      if (globalErrorThrottle.shouldLog(safeProduct.id, 'favorite_error')) {
        console.warn('[ProductCard] Favorite error:', error.message);
      }
    }
  }, [onAddToFavorites, safeProduct]);

  const handleCompare = useCallback((e) => {
    try {
      e.stopPropagation();
      onCompare?.(safeProduct, e);
    } catch (error) {
      if (globalErrorThrottle.shouldLog(safeProduct.id, 'compare_error')) {
        console.warn('[ProductCard] Compare error:', error.message);
      }
    }
  }, [onCompare, safeProduct]);

  // ENHANCED: ProductImage component with Firebase Storage status indicators
  const ProductImage = () => {
    const imageUrl = getImageUrl();
    
    if (!imageUrl || imageState.error) {
      // Enhanced gradient fallback with Firebase Storage generation status
      const gradients = [
        'from-blue-400 to-blue-600',
        'from-purple-400 to-purple-600', 
        'from-green-400 to-green-600',
        'from-pink-400 to-pink-600',
        'from-yellow-400 to-yellow-600',
        'from-indigo-400 to-indigo-600',
        'from-red-400 to-red-600',
        'from-teal-400 to-teal-600'
      ];
      
      const gradientClass = gradients[Math.abs(safeProduct.name.charCodeAt(0)) % gradients.length];
      const imageStatus = product?.imageGenerationStatus;
      const hasFirebaseStorage = product?.firebaseStorage || product?.generatedImages?.firebaseStorage;
      
      return (
        <div className={`w-full h-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white relative overflow-hidden`}>
          {/* Background pattern for visual interest */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-1 bg-white transform -skew-y-2"></div>
            <div className="absolute bottom-0 right-0 w-full h-1 bg-white transform skew-y-2"></div>
          </div>
          
          {/* Processing indicator for generating images */}
          {(imageStatus === 'processing' || imageStatus === 'pending') && (
            <div className="absolute top-2 left-2">
              <Loader2 className="w-4 h-4 animate-spin opacity-75" />
            </div>
          )}
          
          {/* Firebase Storage indicator */}
          {hasFirebaseStorage && (
            <div className="absolute top-2 right-2 flex items-center space-x-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full opacity-75"></div>
              <div className="text-xs bg-orange-500 text-white px-1 py-0.5 rounded opacity-80">
                FB
              </div>
            </div>
          )}
          
          <div className="text-center p-4 z-10">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-90" />
            <div className="text-xs font-semibold leading-tight mb-1">
              {safeProduct.name.length > 25 ? 
                safeProduct.name.substring(0, 22) + '...' : 
                safeProduct.name
              }
            </div>
            {safeProduct.code !== 'N/A' && (
              <div className="text-xs opacity-75 mb-1">
                {safeProduct.code}
              </div>
            )}
            
            {/* Show Firebase Storage generation status */}
            {imageStatus && (
              <div className="mt-2 text-xs opacity-80 bg-black bg-opacity-20 rounded px-2 py-1">
                {imageStatus === 'pending' && 'Queued for AI generation'}
                {imageStatus === 'processing' && 'AI generating & saving to Firebase'}
                {imageStatus === 'manual_upload' && 'Custom image uploaded'}
                {imageStatus === 'generated' && hasFirebaseStorage && 'AI generated + Firebase stored'}
                {imageStatus === 'generated' && !hasFirebaseStorage && 'AI generated (no Firebase)'}
                {imageStatus === 'not_needed' && 'No image needed'}
              </div>
            )}
          </div>
          
          {/* Corner indicator for real images */}
          {product?.hasRealImage && (
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-green-400 rounded-full opacity-75"></div>
          )}
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {!imageState.loaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
            <div className="text-center">
              <Package className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <div className="text-xs text-gray-500">Loading from Firebase...</div>
            </div>
          </div>
        )}
        <img 
          src={imageUrl}
          alt={safeProduct.name}
          className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${
            imageState.loaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
        />
        
        {/* Success indicators for loaded Firebase Storage images */}
        {imageState.loaded && (
          <div className="absolute top-2 right-2 flex flex-col space-y-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            
            {/* Show source indicator */}
            {imageUrl.includes('firebasestorage.googleapis.com') && (
              <div className="text-xs bg-orange-500 text-white px-1 py-0.5 rounded opacity-80">
                FB
              </div>
            )}
            
            {product?.imageGenerationStatus === 'generated' && (
              <div className="text-xs bg-blue-500 text-white px-1 py-0.5 rounded opacity-80">
                AI
              </div>
            )}
            
            {product?.imageGenerationStatus === 'manual_upload' && (
              <div className="text-xs bg-purple-500 text-white px-1 py-0.5 rounded opacity-80">
                Manual
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
        onClick={handleClick}
      >
        <div className="p-4 flex items-center space-x-4">
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
            <ProductImage />
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

  // Grid view
  return (
    <div
      className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 overflow-hidden"
      onClick={handleClick}
    >
      {/* Image container */}
      <div className="relative h-48 bg-gray-50 overflow-hidden">
        <ProductImage />
        
        {/* Quick action buttons */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex flex-col space-y-1">
            <button
              onClick={handleFavorite}
              className={`p-2 rounded-full shadow-sm transition-colors ${
                isInFavorites 
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-current' : ''}`} />
            </button>
            {onCompare && (
              <button
                onClick={handleCompare}
                className={`p-2 rounded-full shadow-sm transition-colors ${
                  isInComparison 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {safeProduct.featured && (
            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
              Featured
            </span>
          )}
          {safeProduct.urgency === 'urgent' && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
              Urgent
            </span>
          )}
          {safeProduct.stock < 10 && safeProduct.stock > 0 && (
            <span className="px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
              Low Stock
            </span>
          )}
        </div>

        {/* Availability badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            safeProduct.availability === 'In Stock' ? 'bg-green-100 text-green-800' :
            safeProduct.availability === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {safeProduct.availability}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 flex-1">
            {safeProduct.name}
          </h3>
        </div>

        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500">Code: {safeProduct.code}</span>
          <span className="text-sm text-gray-500">{safeProduct.category}</span>
        </div>

        {/* Rating */}
        {safeProduct.rating > 0 && (
          <div className="flex items-center mb-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(safeProduct.rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500 ml-2">
              ({safeProduct.reviewCount})
            </span>
          </div>
        )}

        {/* Price and availability */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-col">
            {safeProduct.price > 0 ? (
              <span className="text-lg font-bold text-gray-900">
                RM {safeProduct.price.toLocaleString()}
              </span>
            ) : (
              <span className="text-sm text-gray-500">Price on request</span>
            )}
            <span className="text-xs text-gray-500">
              Stock: {safeProduct.stock > 0 ? safeProduct.stock : 'Out of stock'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {safeProduct.deliveryTime}
            </div>
            <div className="text-xs text-gray-500">
              📍 {safeProduct.location}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleAddToCart}
            disabled={safeProduct.stock === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center"
          >
            <ShoppingCart className="w-4 h-4 mr-1" />
            {safeProduct.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
          <button
            onClick={handleRequestQuote}
            className="px-3 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            Quote
          </button>
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
      globalErrorThrottle.cleanup();
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
        if (globalErrorThrottle.shouldLog('main', 'subscription_error')) {
          console.error('Error setting up real-time subscription:', error);
        }
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
        if (globalErrorThrottle.shouldLog('main', 'analytics_error')) {
          console.error('Error setting up analytics:', error);
        }
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
      // Silent fail for localStorage operations
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('higgsflow_guest_cart', JSON.stringify(guestCart));
    } catch (error) {
      // Silent fail for localStorage operations
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
      // Silent fail for localStorage operations
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('higgsflow_favorites', JSON.stringify(Array.from(favorites)));
    } catch (error) {
      // Silent fail for localStorage operations
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
        if (globalErrorThrottle.shouldLog('main', 'factory_detection_error')) {
          console.error('Factory detection error:', error);
        }
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

  // Event handlers with comprehensive error handling
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
      if (globalErrorThrottle.shouldLog('main', 'cart_error')) {
        console.error('Add to cart error:', error);
      }
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
      if (globalErrorThrottle.shouldLog('main', 'quote_error')) {
        console.error('Quote request error:', error);
      }
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
      if (globalErrorThrottle.shouldLog('main', 'favorite_error')) {
        console.error('Favorite toggle error:', error);
      }
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
      if (globalErrorThrottle.shouldLog('main', 'comparison_error')) {
        console.error('Product comparison error:', error);
      }
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
      if (globalErrorThrottle.shouldLog('main', 'click_error')) {
        console.error('Product click tracking error:', error);
      }
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
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                    <div className="text-center">
                      <Package className="w-6 h-6 mx-auto mb-1" />
                      <div className="text-xs font-medium leading-tight">
                        {selectedProduct.name.length > 8 ? 
                          selectedProduct.name.substring(0, 8) + '...' : 
                          selectedProduct.name
                        }
                      </div>
                    </div>
                  </div>
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
