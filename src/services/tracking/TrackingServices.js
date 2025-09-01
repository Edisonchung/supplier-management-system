// src/services/tracking/TrackingServices.js
// HiggsFlow Enhanced Tracking Services - Build-Safe Implementation
// Fixed: JavaScript syntax errors, build failures, and performance issues

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  onSnapshot,
  doc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Build-safe toast implementation
const safeToast = {
  success: function(message) {
    console.log('SUCCESS:', message);
  },
  error: function(message) {
    console.error('ERROR:', message);
  },
  info: function(message) {
    console.info('INFO:', message);
  },
  warning: function(message) {
    console.warn('WARNING:', message);
  }
};

// Try to import toast but fall back gracefully
let toast = safeToast;
try {
  // Attempt to import react-hot-toast if available
  const toastModule = require('react-hot-toast');
  if (toastModule && toastModule.toast) {
    toast = toastModule.toast;
  }
} catch (error) {
  console.warn('Toast library not available, using console fallback');
}

/**
 * Enhanced Tracking Services for HiggsFlow
 * Provides comprehensive tracking, analytics, and monitoring capabilities
 */
class TrackingServices {
  constructor() {
    this.initialized = false;
    this.sessionId = this.generateSessionId();
    this.userId = this.generateUserId();
    this.isOnline = navigator.onLine;
    this.eventQueue = [];
    this.batchSize = 10;
    this.flushInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    
    this.init();
  }

  /**
   * Initialize tracking services
   */
  async init() {
    try {
      console.log('Initializing TrackingServices...');
      
      // Setup online/offline listeners
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.isOnline = true;
          this.flushEventQueue();
        });
        
        window.addEventListener('offline', () => {
          this.isOnline = false;
        });
      }
      
      // Start periodic flush
      setInterval(() => {
        if (this.isOnline) {
          this.flushEventQueue();
        }
      }, this.flushInterval);
      
      this.initialized = true;
      console.log('TrackingServices initialized successfully');
      toast.success('Tracking services initialized');
      
    } catch (error) {
      console.error('Failed to initialize TrackingServices:', error);
      toast.error('Failed to initialize tracking services');
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate or retrieve user ID
   */
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

  /**
   * Sanitize event data for safe storage
   */
  sanitizeEventData(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = {};
    const maxStringLength = 1000;
    
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) {
        sanitized[key] = null;
      } else if (typeof value === 'string') {
        sanitized[key] = value.substring(0, maxStringLength);
      } else if (typeof value === 'number') {
        sanitized[key] = isFinite(value) ? value : null;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (typeof value === 'object') {
        try {
          sanitized[key] = JSON.stringify(value).substring(0, maxStringLength);
        } catch (err) {
          sanitized[key] = '[Object]';
        }
      } else if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else {
        sanitized[key] = String(value).substring(0, maxStringLength);
      }
    }
    
    return sanitized;
  }

  /**
   * Track user interaction events
   */
  async trackUserInteraction(eventType, eventData = {}) {
    try {
      if (!this.initialized) {
        console.warn('TrackingServices not initialized');
        return false;
      }

      const sanitizedData = this.sanitizeEventData(eventData);
      
      const event = {
        eventType,
        eventData: sanitizedData,
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
        url: window?.location?.href || 'unknown',
        userAgent: navigator?.userAgent?.substring(0, 200) || 'unknown',
        source: 'higgsflow_catalog'
      };

      // Add to queue
      this.eventQueue.push(event);
      
      // Flush if queue is full or critical event
      if (this.eventQueue.length >= this.batchSize || this.isCriticalEvent(eventType)) {
        await this.flushEventQueue();
      }

      console.log(`Tracked: ${eventType}`, sanitizedData);
      return true;

    } catch (error) {
      console.error('Error tracking user interaction:', error);
      this.storeEventLocally({ eventType, eventData, error: error.message });
      return false;
    }
  }

  /**
   * Track product interactions
   */
  async trackProductInteraction(productData) {
    try {
      const eventData = {
        ...productData,
        trackingType: 'product_interaction'
      };
      
      return await this.trackUserInteraction('product_interaction', eventData);
    } catch (error) {
      console.error('Error tracking product interaction:', error);
      return false;
    }
  }

  /**
   * Track search events
   */
  async trackSearchEvent(searchQuery, resultCount = 0, filters = {}) {
    try {
      const eventData = {
        searchQuery: String(searchQuery).substring(0, 200),
        resultCount: Number(resultCount) || 0,
        filters: this.sanitizeEventData(filters),
        trackingType: 'search_event'
      };
      
      return await this.trackUserInteraction('search_performed', eventData);
    } catch (error) {
      console.error('Error tracking search event:', error);
      return false;
    }
  }

  /**
   * Track quote requests
   */
  async trackQuoteRequest(quoteData) {
    try {
      const eventData = {
        ...this.sanitizeEventData(quoteData),
        trackingType: 'quote_request'
      };
      
      return await this.trackUserInteraction('quote_request', eventData);
    } catch (error) {
      console.error('Error tracking quote request:', error);
      return false;
    }
  }

  /**
   * Track cart interactions
   */
  async trackCartInteraction(action, productData) {
    try {
      const eventData = {
        action: String(action),
        product: this.sanitizeEventData(productData),
        trackingType: 'cart_interaction'
      };
      
      return await this.trackUserInteraction('cart_interaction', eventData);
    } catch (error) {
      console.error('Error tracking cart interaction:', error);
      return false;
    }
  }

  /**
   * Track page views
   */
  async trackPageView(pageData = {}) {
    try {
      const eventData = {
        page: window?.location?.pathname || 'unknown',
        title: document?.title || 'unknown',
        referrer: document?.referrer || 'direct',
        ...this.sanitizeEventData(pageData),
        trackingType: 'page_view'
      };
      
      return await this.trackUserInteraction('page_view', eventData);
    } catch (error) {
      console.error('Error tracking page view:', error);
      return false;
    }
  }

  /**
   * Check if event is critical and should be flushed immediately
   */
  isCriticalEvent(eventType) {
    const criticalEvents = [
      'quote_request',
      'purchase_complete',
      'error_occurred',
      'user_registration'
    ];
    return criticalEvents.includes(eventType);
  }

  /**
   * Flush event queue to Firestore
   */
  async flushEventQueue() {
    if (!this.isOnline || this.eventQueue.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventQueue];
    this.eventQueue = [];

    try {
      const promises = eventsToFlush.map(async (event) => {
        try {
          const firestoreEvent = {
            ...event,
            timestamp: serverTimestamp(),
            originalTimestamp: event.timestamp
          };
          
          const analyticsCollection = collection(db, 'user_interactions');
          return await addDoc(analyticsCollection, firestoreEvent);
        } catch (error) {
          console.warn('Failed to save individual event:', error);
          this.storeEventLocally(event);
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      console.log(`Flushed ${successful}/${eventsToFlush.length} events to Firestore`);
      
    } catch (error) {
      console.error('Error flushing event queue:', error);
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToFlush);
    }
  }

  /**
   * Store event locally when Firestore fails
   */
  storeEventLocally(event) {
    try {
      const stored = JSON.parse(localStorage.getItem('higgsflow_offline_events') || '[]');
      stored.push({
        ...event,
        storedAt: new Date().toISOString()
      });
      
      // Limit stored events to prevent memory issues
      if (stored.length > 50) {
        stored.splice(0, stored.length - 50);
      }
      
      localStorage.setItem('higgsflow_offline_events', JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to store event locally:', error);
    }
  }

  /**
   * Get analytics data for dashboard
   */
  async getAnalytics(timeRange = '24h') {
    try {
      const timeRanges = {
        '1h': 1 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const startTime = new Date(Date.now() - (timeRanges[timeRange] || timeRanges['24h']));
      
      const analyticsQuery = query(
        collection(db, 'user_interactions'),
        where('timestamp', '>=', startTime),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      const snapshot = await getDocs(analyticsQuery);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().originalTimestamp)
      }));

      return this.processAnalyticsData(events);
      
    } catch (error) {
      console.error('Error getting analytics:', error);
      return this.getLocalAnalytics();
    }
  }

  /**
   * Process analytics data into useful metrics
   */
  processAnalyticsData(events) {
    const metrics = {
      totalEvents: events.length,
      uniqueSessions: new Set(events.map(e => e.sessionId)).size,
      uniqueUsers: new Set(events.map(e => e.userId)).size,
      pageViews: events.filter(e => e.eventType === 'page_view').length,
      productViews: events.filter(e => e.eventType === 'product_interaction').length,
      searchEvents: events.filter(e => e.eventType === 'search_performed').length,
      quoteRequests: events.filter(e => e.eventType === 'quote_request').length,
      cartEvents: events.filter(e => e.eventType === 'cart_interaction').length,
      topPages: this.getTopItems(events.filter(e => e.eventType === 'page_view'), 'eventData.page'),
      topProducts: this.getTopItems(events.filter(e => e.eventType === 'product_interaction'), 'eventData.productName'),
      topSearches: this.getTopItems(events.filter(e => e.eventType === 'search_performed'), 'eventData.searchQuery'),
      timeline: this.createTimeline(events)
    };

    // Calculate conversion rates
    if (metrics.productViews > 0) {
      metrics.quoteConversionRate = (metrics.quoteRequests / metrics.productViews * 100).toFixed(2);
    } else {
      metrics.quoteConversionRate = 0;
    }

    return metrics;
  }

  /**
   * Get top items from analytics data
   */
  getTopItems(events, field) {
    const counts = {};
    
    events.forEach(event => {
      const value = this.getNestedValue(event, field);
      if (value && typeof value === 'string') {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr && curr[key], obj);
  }

  /**
   * Create timeline data for charts
   */
  createTimeline(events) {
    const timeline = {};
    
    events.forEach(event => {
      const date = event.timestamp.toDateString();
      if (!timeline[date]) {
        timeline[date] = { date, events: 0, pageViews: 0, productViews: 0, quotes: 0 };
      }
      
      timeline[date].events++;
      if (event.eventType === 'page_view') timeline[date].pageViews++;
      if (event.eventType === 'product_interaction') timeline[date].productViews++;
      if (event.eventType === 'quote_request') timeline[date].quotes++;
    });
    
    return Object.values(timeline).sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Get analytics from localStorage when Firestore fails
   */
  getLocalAnalytics() {
    try {
      const stored = JSON.parse(localStorage.getItem('higgsflow_offline_events') || '[]');
      const events = stored.map(event => ({
        ...event,
        timestamp: new Date(event.storedAt || event.timestamp)
      }));
      
      return this.processAnalyticsData(events);
    } catch (error) {
      console.error('Error getting local analytics:', error);
      return {
        totalEvents: 0,
        uniqueSessions: 0,
        uniqueUsers: 0,
        pageViews: 0,
        productViews: 0,
        searchEvents: 0,
        quoteRequests: 0,
        cartEvents: 0,
        quoteConversionRate: 0,
        topPages: [],
        topProducts: [],
        topSearches: [],
        timeline: []
      };
    }
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToAnalytics(callback) {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'user_interactions'),
          where('timestamp', '>=', twentyFourHoursAgo),
          orderBy('timestamp', 'desc'),
          limit(100)
        ),
        (snapshot) => {
          const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().originalTimestamp)
          }));
          
          const analytics = this.processAnalyticsData(events);
          callback(analytics);
        },
        (error) => {
          console.error('Real-time analytics error:', error);
          callback(this.getLocalAnalytics());
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up analytics subscription:', error);
      return () => {};
    }
  }

  /**
   * Track factory engagement
   */
  async trackFactoryEngagement(factoryData) {
    try {
      const eventData = {
        ...this.sanitizeEventData(factoryData),
        trackingType: 'factory_engagement'
      };
      
      return await this.trackUserInteraction('factory_engagement', eventData);
    } catch (error) {
      console.error('Error tracking factory engagement:', error);
      return false;
    }
  }

  /**
   * Track delivery events
   */
  async trackDeliveryEvent(deliveryData) {
    try {
      const eventData = {
        ...this.sanitizeEventData(deliveryData),
        trackingType: 'delivery_event'
      };
      
      return await this.trackUserInteraction('delivery_event', eventData);
    } catch (error) {
      console.error('Error tracking delivery event:', error);
      return false;
    }
  }

  /**
   * Initialize complete tracking system
   */
  static async initializeCompleteTracking() {
    try {
      console.log('Initializing complete tracking system...');
      
      const trackingService = new TrackingServices();
      
      // Wait for initialization
      await new Promise(resolve => {
        const checkInit = () => {
          if (trackingService.initialized) {
            resolve();
          } else {
            setTimeout(checkInit, 100);
          }
        };
        checkInit();
      });
      
      // Track initial page load
      await trackingService.trackPageView({
        initialLoad: true,
        loadTime: performance.now()
      });
      
      console.log('Complete tracking system initialized successfully');
      toast.success('Tracking system ready');
      
      return trackingService;
      
    } catch (error) {
      console.error('Error initializing complete tracking:', error);
      toast.error('Failed to initialize tracking system');
      
      // Return a mock service for graceful degradation
      return {
        trackUserInteraction: () => Promise.resolve(false),
        trackProductInteraction: () => Promise.resolve(false),
        trackSearchEvent: () => Promise.resolve(false),
        trackQuoteRequest: () => Promise.resolve(false),
        trackCartInteraction: () => Promise.resolve(false),
        trackPageView: () => Promise.resolve(false),
        trackFactoryEngagement: () => Promise.resolve(false),
        trackDeliveryEvent: () => Promise.resolve(false),
        getAnalytics: () => Promise.resolve({}),
        subscribeToAnalytics: () => () => {}
      };
    }
  }

  /**
   * Initialize delivery tracking
   */
  static async initializeDeliveryTracking(purchaseOrder, updateDeliveryStatusFn) {
    try {
      console.log('Initializing delivery tracking for PO:', purchaseOrder?.id);
      
      const trackingService = new TrackingServices();
      
      // Set up delivery status monitoring
      const deliveryData = {
        purchaseOrderId: purchaseOrder?.id,
        status: 'initialized',
        timestamp: new Date().toISOString()
      };
      
      await trackingService.trackDeliveryEvent(deliveryData);
      
      // Mock delivery updates for demo
      if (typeof updateDeliveryStatusFn === 'function') {
        setTimeout(() => {
          updateDeliveryStatusFn('processing');
          trackingService.trackDeliveryEvent({
            ...deliveryData,
            status: 'processing'
          });
        }, 5000);
        
        setTimeout(() => {
          updateDeliveryStatusFn('shipped');
          trackingService.trackDeliveryEvent({
            ...deliveryData,
            status: 'shipped'
          });
        }, 15000);
      }
      
      console.log('Delivery tracking initialized successfully');
      return { 
        success: true, 
        trackingService,
        trackingId: `TRK_${Date.now()}`
      };
      
    } catch (error) {
      console.error('Error initializing delivery tracking:', error);
      return { 
        success: false, 
        error: error.message,
        trackingService: null
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      if (this.eventQueue.length > 0) {
        this.flushEventQueue();
      }
      
      console.log('TrackingServices cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Export singleton instance
const trackingServices = new TrackingServices();

export default trackingServices;
export { TrackingServices };
