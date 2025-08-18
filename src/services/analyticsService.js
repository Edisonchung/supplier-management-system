// 🚀 HiggsFlow Phase 2B: Enhanced Analytics Service Implementation
// File: src/services/analyticsService.js

import React from 'react';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  getDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';

// 🎯 Enhanced Analytics Service for Industrial E-commerce Intelligence
export class HiggsFlowAnalyticsService {
  constructor() {
    // Firestore collections
    this.collections = {
      userSessions: collection(db, 'userSessions'),
      productInteractions: collection(db, 'productInteractions'),
      factoryProfiles: collection(db, 'factoryProfiles'),
      recommendationEvents: collection(db, 'recommendationEvents'),
      businessMetrics: collection(db, 'businessMetrics'),
      realTimeMetrics: collection(db, 'realTimeMetrics'),
      userBehavior: collection(db, 'userBehavior'),
      searchQueries: collection(db, 'searchQueries'),
      geographicData: collection(db, 'geographicData'),
      // 🚀 NEW: Phase 2B Dashboard Collections
      revenueAnalytics: collection(db, 'revenueAnalytics'),
      customerInsights: collection(db, 'customerInsights'),
      productPerformance: collection(db, 'productPerformance'),
      operationalMetrics: collection(db, 'operationalMetrics')
    };
    
    // Cache for performance optimization
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Real-time listeners storage
    this.activeListeners = new Map();
    
    // 🚀 NEW: Dashboard-specific data stores
    this.dashboardCache = {
      revenueData: null,
      customerData: null,
      productData: null,
      geographicData: null,
      operationalData: null,
      lastUpdate: null
    };
    
    // Initialize real-time analytics
    this.initializeRealTimeAnalytics();
    
    console.log('🎯 HiggsFlow Phase 2B Analytics Service initialized');
  }

  // =============================================================================
  // 🚀 NEW: PHASE 2B DASHBOARD API METHODS
  // =============================================================================

  /**
   * Fetch dashboard metrics for the main overview
   */
  async fetchDashboardMetrics(timeRange = '7d') {
    try {
      const cacheKey = `dashboard_metrics_${timeRange}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      // Generate realistic metrics based on time range
      const baseMetrics = this.generateBaseMetrics(timeRange);
      
      const metrics = {
        activeUsers: baseMetrics.activeUsers + Math.floor(Math.random() * 20),
        factories: baseMetrics.factories + Math.floor(Math.random() * 5),
        revenue: baseMetrics.revenue + Math.floor(Math.random() * 10000),
        orders: baseMetrics.orders + Math.floor(Math.random() * 15),
        timestamp: new Date().toISOString(),
        growth: {
          users: Math.floor(Math.random() * 25) + 5,
          factories: Math.floor(Math.random() * 15) + 3,
          revenue: Math.floor(Math.random() * 30) + 10,
          orders: Math.floor(Math.random() * 20) + 8
        }
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('❌ Error fetching dashboard metrics:', error);
      return this.getDefaultDashboardMetrics();
    }
  }

  /**
   * Fetch revenue analytics data
   */
  async fetchRevenueData(timeRange = '7d') {
    try {
      const cacheKey = `revenue_data_${timeRange}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const revenueData = this.generateRevenueData(timeRange);
      this.setCachedData(cacheKey, revenueData);
      return revenueData;
    } catch (error) {
      console.error('❌ Error fetching revenue data:', error);
      return this.getDefaultRevenueData();
    }
  }

  /**
   * Fetch customer insights data
   */
  async fetchCustomerInsights(timeRange = '7d') {
    try {
      const cacheKey = `customer_insights_${timeRange}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const customerData = this.generateCustomerInsights(timeRange);
      this.setCachedData(cacheKey, customerData);
      return customerData;
    } catch (error) {
      console.error('❌ Error fetching customer insights:', error);
      return this.getDefaultCustomerData();
    }
  }

  /**
   * Fetch product performance data
   */
  async fetchProductPerformance(timeRange = '7d') {
    try {
      const cacheKey = `product_performance_${timeRange}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const productData = this.generateProductPerformance(timeRange);
      this.setCachedData(cacheKey, productData);
      return productData;
    } catch (error) {
      console.error('❌ Error fetching product performance:', error);
      return this.getDefaultProductData();
    }
  }

  /**
   * Fetch geographic analytics data
   */
  async fetchGeographicData(timeRange = '7d') {
    try {
      const cacheKey = `geographic_data_${timeRange}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const geoData = this.generateGeographicData(timeRange);
      this.setCachedData(cacheKey, geoData);
      return geoData;
    } catch (error) {
      console.error('❌ Error fetching geographic data:', error);
      return this.getDefaultGeographicData();
    }
  }

  /**
   * Fetch operational metrics
   */
  async fetchOperationalMetrics() {
    try {
      const cacheKey = 'operational_metrics';
      const cached = this.getCachedData(cacheKey, 30000); // 30 second cache
      if (cached) return cached;

      const operationalData = this.generateOperationalMetrics();
      this.setCachedData(cacheKey, operationalData);
      return operationalData;
    } catch (error) {
      console.error('❌ Error fetching operational metrics:', error);
      return this.getDefaultOperationalData();
    }
  }

  // =============================================================================
  // 🚀 NEW: DATA GENERATION METHODS FOR DASHBOARD
  // =============================================================================

  /**
   * Generate base metrics based on time range
   */
  generateBaseMetrics(timeRange) {
    const baseValues = {
      '24h': { activeUsers: 45, factories: 12, revenue: 25000, orders: 35 },
      '7d': { activeUsers: 247, factories: 89, revenue: 125847, orders: 156 },
      '30d': { activeUsers: 1250, factories: 234, revenue: 485000, orders: 678 },
      '90d': { activeUsers: 3200, factories: 445, revenue: 1250000, orders: 1890 }
    };

    return baseValues[timeRange] || baseValues['7d'];
  }

  /**
   * Generate revenue analytics data
   */
  generateRevenueData(timeRange) {
    const periods = this.getTimePeriods(timeRange);
    return periods.map((period, index) => {
      const baseRevenue = 45000 + (index * 8000);
      const variation = Math.floor(Math.random() * 10000) - 5000;
      
      return {
        date: period.label,
        revenue: Math.max(baseRevenue + variation, 20000),
        orders: Math.floor((baseRevenue + variation) / 450) + Math.floor(Math.random() * 20),
        factories: Math.floor(45 + (index * 5) + Math.random() * 8),
        avgOrderValue: Math.floor(3500 + Math.random() * 2000),
        growth: Math.floor(Math.random() * 25) + 5
      };
    });
  }

  /**
   * Generate customer insights data
   */
  generateCustomerInsights(timeRange) {
    return {
      totalFactories: 89 + Math.floor(Math.random() * 20),
      activeThisMonth: 67 + Math.floor(Math.random() * 15),
      newRegistrations: 15 + Math.floor(Math.random() * 10),
      churnRisk: 3 + Math.floor(Math.random() * 3),
      lifetimeValue: {
        high: 23 + Math.floor(Math.random() * 8),
        medium: 34 + Math.floor(Math.random() * 10),
        low: 32 + Math.floor(Math.random() * 8)
      },
      engagement: {
        avgSessionDuration: `${7 + Math.floor(Math.random() * 4)}m ${20 + Math.floor(Math.random() * 40)}s`,
        pagesPerSession: (10 + Math.random() * 5).toFixed(1),
        monthlyActiveRate: (70 + Math.random() * 15).toFixed(1),
        conversionRate: (20 + Math.random() * 10).toFixed(1)
      },
      segments: [
        { name: 'Electronics', count: 31, percentage: 35, growth: 12 },
        { name: 'Automotive', count: 25, percentage: 28, growth: 8 },
        { name: 'Textile', count: 16, percentage: 18, growth: 15 },
        { name: 'Chemical', count: 11, percentage: 12, growth: 5 },
        { name: 'Food Processing', count: 6, percentage: 7, growth: 22 }
      ]
    };
  }

  /**
   * Generate product performance data
   */
  generateProductPerformance(timeRange) {
    const categories = [
      'Industrial Pumps', 'Electrical Components', 'Safety Equipment',
      'Automation Tools', 'Raw Materials', 'Chemical Processing',
      'Mechanical Parts', 'Power Systems'
    ];

    return categories.slice(0, 5).map(category => ({
      category,
      sales: Math.floor(Math.random() * 80) + 20,
      revenue: Math.floor(Math.random() * 100000) + 50000,
      margin: Math.floor(Math.random() * 30) + 15,
      growth: Math.floor(Math.random() * 40) + 5,
      topProduct: this.generateTopProduct(category),
      trend: Math.random() > 0.5 ? 'up' : 'down'
    }));
  }

  /**
   * Generate geographic analytics data
   */
  generateGeographicData(timeRange) {
    const regions = [
      { region: 'Selangor', baseFactories: 32, baseRevenue: 45000 },
      { region: 'Johor', baseFactories: 28, baseRevenue: 38000 },
      { region: 'Penang', baseFactories: 15, baseRevenue: 29000 },
      { region: 'Perak', baseFactories: 8, baseRevenue: 12000 },
      { region: 'Kedah', baseFactories: 6, baseRevenue: 8500 },
      { region: 'Negeri Sembilan', baseFactories: 5, baseRevenue: 7200 },
      { region: 'Melaka', baseFactories: 4, baseRevenue: 6800 }
    ];

    return regions.map(region => ({
      region: region.region,
      factories: region.baseFactories + Math.floor(Math.random() * 8),
      revenue: region.baseRevenue + Math.floor(Math.random() * 5000),
      growth: Math.floor(Math.random() * 30) + 5,
      avgOrderValue: Math.floor(3000 + Math.random() * 2500),
      topIndustry: this.getRandomIndustry(),
      marketPenetration: (Math.random() * 40 + 10).toFixed(1)
    }));
  }

  /**
   * Generate operational metrics data
   */
  generateOperationalMetrics() {
    return {
      uptime: (99.5 + Math.random() * 0.4).toFixed(1) + '%',
      responseTime: Math.floor(80 + Math.random() * 80) + 'ms',
      apiCalls: (12 + Math.random() * 8).toFixed(1) + 'K',
      activeSessions: Math.floor(200 + Math.random() * 100),
      systemHealth: {
        database: Math.random() > 0.1 ? 'normal' : 'warning',
        apiGateway: Math.random() > 0.05 ? 'normal' : 'warning',
        cacheHitRate: Math.random() > 0.2 ? 'normal' : 'warning',
        loadBalancer: Math.random() > 0.05 ? 'normal' : 'warning'
      },
      resourceUtilization: {
        cpu: Math.floor(40 + Math.random() * 40),
        memory: Math.floor(30 + Math.random() * 40),
        storage: Math.floor(60 + Math.random() * 25),
        bandwidth: Math.floor(20 + Math.random() * 40)
      },
      errors: {
        total: Math.floor(Math.random() * 20),
        rate: (Math.random() * 0.2).toFixed(2),
        critical: Math.floor(Math.random() * 3),
        warnings: Math.floor(Math.random() * 15)
      },
      performance: {
        avgLoadTime: (1 + Math.random() * 1.5).toFixed(1),
        dbQueryTime: Math.floor(30 + Math.random() * 40),
        cacheHitRate: (80 + Math.random() * 15).toFixed(1),
        throughput: Math.floor(1000 + Math.random() * 500)
      }
    };
  }

  // =============================================================================
  // 🚀 NEW: USER TRACKING METHODS FOR DASHBOARD
  // =============================================================================

  /**
   * Track page view for analytics dashboard
   */
  async trackPageView(page, userId) {
    try {
      const trackingData = {
        page,
        userId,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        userAgent: navigator.userAgent,
        referrer: document.referrer
      };

      await this.trackUserAction('page_view', trackingData);
      console.log('📄 Page view tracked:', page);
    } catch (error) {
      console.error('❌ Error tracking page view:', error);
    }
  }

  /**
   * Track product view for analytics
   */
  async trackProductView(productId, userId) {
    try {
      const trackingData = {
        productId,
        userId,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        action: 'product_view'
      };

      await this.trackUserAction('product_view', trackingData);
      console.log('🛍️ Product view tracked:', productId);
    } catch (error) {
      console.error('❌ Error tracking product view:', error);
    }
  }

  /**
   * Track order placement for analytics
   */
  async trackOrderPlacement(orderId, userId, amount) {
    try {
      const trackingData = {
        orderId,
        userId,
        amount,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        action: 'order_placement'
      };

      await this.trackUserAction('order_placement', trackingData);
      console.log('💰 Order placement tracked:', orderId, amount);
    } catch (error) {
      console.error('❌ Error tracking order placement:', error);
    }
  }

  /**
   * Track custom user action
   */
  async trackUserAction(action, data) {
    try {
      const actionData = {
        action,
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.getSessionId(),
        userId: auth.currentUser?.uid || 'anonymous'
      };

      // Store in Firestore if available, otherwise log
      if (this.collections.userBehavior) {
        await addDoc(this.collections.userBehavior, actionData);
      } else {
        console.log('📊 Analytics Action:', actionData);
      }
    } catch (error) {
      console.error('❌ Error tracking user action:', error);
    }
  }

  // =============================================================================
  // 🚀 ENHANCED REAL-TIME ANALYTICS SYSTEM (EXISTING + ENHANCED)
  // =============================================================================

  /**
   * Initialize real-time analytics with enhanced monitoring
   */
  async initializeRealTimeAnalytics() {
    try {
      console.log('🔄 Initializing enhanced real-time analytics...');

      // Setup real-time metrics listener
      await this.setupRealTimeMetricsListener();
      
      // Initialize behavior tracking
      await this.initializeBehaviorTracking();
      
      // Setup geographic intelligence
      await this.initializeGeographicIntelligence();

      // 🚀 NEW: Initialize dashboard real-time updates
      await this.initializeDashboardRealTime();

      console.log('✅ Enhanced real-time analytics initialized');
    } catch (error) {
      console.error('❌ Error initializing real-time analytics:', error);
    }
  }

  /**
   * 🚀 NEW: Initialize dashboard-specific real-time updates
   */
  async initializeDashboardRealTime() {
    try {
      // Setup dashboard metrics auto-refresh
      setInterval(() => {
        this.refreshDashboardMetrics();
      }, 30000); // Refresh every 30 seconds

      // Setup real-time revenue tracking
      setInterval(() => {
        this.updateRevenueMetrics();
      }, 10000); // Update every 10 seconds

      console.log('📊 Dashboard real-time updates initialized');
    } catch (error) {
      console.error('❌ Error initializing dashboard real-time:', error);
    }
  }

  /**
   * Refresh dashboard metrics automatically
   */
  async refreshDashboardMetrics() {
    try {
      // Clear cache to force fresh data
      const keys = ['dashboard_metrics_7d', 'operational_metrics'];
      keys.forEach(key => this.cache.delete(key));

      // Emit update event
      this.emitRealTimeUpdate('dashboard_refresh', {
        timestamp: new Date().toISOString(),
        type: 'auto_refresh'
      });
    } catch (error) {
      console.error('❌ Error refreshing dashboard metrics:', error);
    }
  }

  /**
   * Update revenue metrics in real-time
   */
  async updateRevenueMetrics() {
    try {
      const currentMetrics = await this.fetchDashboardMetrics();
      
      // Simulate small incremental changes
      const updatedMetrics = {
        ...currentMetrics,
        revenue: currentMetrics.revenue + Math.floor(Math.random() * 1000),
        orders: currentMetrics.orders + Math.floor(Math.random() * 3),
        activeUsers: currentMetrics.activeUsers + Math.floor(Math.random() * 5) - 2
      };

      // Emit revenue update
      this.emitRealTimeUpdate('revenue_update', updatedMetrics);
    } catch (error) {
      console.error('❌ Error updating revenue metrics:', error);
    }
  }

  // =============================================================================
  // 🚀 ENHANCED EXISTING METHODS (PRESERVED + ENHANCED)
  // =============================================================================

  /**
   * Setup real-time metrics listener with enhanced features
   */
  async setupRealTimeMetricsListener() {
    try {
      // Active sessions listener
      const activeSessionsQuery = query(
        this.collections.userSessions,
        where('isActive', '==', true),
        where('timestamp', '>', new Date(Date.now() - 30 * 60 * 1000)) // Last 30 minutes
      );
      
      const unsubscribe = onSnapshot(activeSessionsQuery, (snapshot) => {
        const activeSessions = snapshot.size;
        const sessionData = snapshot.docs.map(doc => doc.data());
        
        // Analyze session types
        const factoryTypes = {};
        const regions = {};
        sessionData.forEach(session => {
          if (session.factory?.industry) {
            factoryTypes[session.factory.industry] = (factoryTypes[session.factory.industry] || 0) + 1;
          }
          if (session.location) {
            regions[session.location] = (regions[session.location] || 0) + 1;
          }
        });

        // Emit real-time update
        this.emitRealTimeUpdate('sessions', {
          activeSessions,
          factoryTypes,
          regions,
          timestamp: new Date().toISOString()
        });
      });

      this.activeListeners.set('activeSessions', unsubscribe);

      // Recent interactions listener
      const interactionsQuery = query(
        this.collections.productInteractions,
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const interactionsUnsubscribe = onSnapshot(interactionsQuery, (snapshot) => {
        const recentInteractions = snapshot.size;
        const interactionData = snapshot.docs.map(doc => doc.data());
        
        // Calculate conversion metrics
        const quotes = interactionData.filter(i => i.action === 'quote').length;
        const views = interactionData.filter(i => i.action === 'view').length;
        const conversionRate = views > 0 ? (quotes / views) : 0;

        this.emitRealTimeUpdate('interactions', {
          recentInteractions,
          conversionRate,
          quotes,
          views,
          timestamp: new Date().toISOString()
        });
      });

      this.activeListeners.set('interactions', interactionsUnsubscribe);

    } catch (error) {
      console.error('❌ Error setting up real-time metrics:', error);
    }
  }

  /**
   * Enhanced user behavior tracking
   */
  async initializeBehaviorTracking() {
    try {
      // Track scroll depth, time on page, click patterns
      if (typeof window !== 'undefined') {
        let maxScrollDepth = 0;
        let startTime = Date.now();

        // Scroll tracking
        window.addEventListener('scroll', () => {
          const scrollDepth = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          );
          maxScrollDepth = Math.max(maxScrollDepth, scrollDepth);
        });

        // Page visibility tracking
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.trackBehaviorEvent('page_hidden', {
              timeOnPage: Date.now() - startTime,
              maxScrollDepth
            });
          } else {
            startTime = Date.now();
            this.trackBehaviorEvent('page_visible');
          }
        });

        // Click pattern tracking
        document.addEventListener('click', (event) => {
          this.trackBehaviorEvent('click', {
            element: event.target.tagName,
            className: event.target.className,
            timestamp: Date.now()
          });
        });
      }
    } catch (error) {
      console.error('❌ Error initializing behavior tracking:', error);
    }
  }

  /**
   * Initialize geographic intelligence system
   */
  async initializeGeographicIntelligence() {
    try {
      // Load and cache geographic data for Malaysian industrial zones
      const geoData = {
        industrialZones: [
          {
            name: 'Port Klang Free Zone',
            coordinates: { lat: 3.0019, lng: 101.3978 },
            dominantIndustries: ['Logistics', 'Manufacturing', 'Oil & Gas'],
            averageOrderValue: 45000,
            competitionLevel: 'High',
            marketOpportunity: 'Strong'
          },
          {
            name: 'Shah Alam Industrial Area',
            coordinates: { lat: 3.0733, lng: 101.5185 },
            dominantIndustries: ['Electronics', 'Automotive', 'Precision Manufacturing'],
            averageOrderValue: 32000,
            competitionLevel: 'Medium',
            marketOpportunity: 'Growing'
          },
          {
            name: 'Pengerang Industrial Complex',
            coordinates: { lat: 1.3592, lng: 104.0989 },
            dominantIndustries: ['Petrochemical', 'Oil & Gas', 'Chemical Processing'],
            averageOrderValue: 65000,
            competitionLevel: 'Low',
            marketOpportunity: 'Excellent'
          }
        ]
      };

      // Cache geographic data
      this.cache.set('geographic_data', {
        data: geoData,
        timestamp: Date.now()
      });

      console.log('🗺️ Geographic intelligence initialized');
    } catch (error) {
      console.error('❌ Error initializing geographic intelligence:', error);
    }
  }

  // =============================================================================
  // 🛠️ UTILITY METHODS & HELPERS (ENHANCED)
  // =============================================================================

  /**
   * 🚀 NEW: Cache management methods
   */
  getCachedData(key, maxAge = this.cacheTimeout) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 🚀 NEW: Get session ID for tracking
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('higgsflow_session_id');
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('higgsflow_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * 🚀 NEW: Helper methods for data generation
   */
  getTimePeriods(timeRange) {
    const periods = [];
    const now = new Date();
    
    switch (timeRange) {
      case '24h':
        for (let i = 23; i >= 0; i--) {
          const time = new Date(now - i * 60 * 60 * 1000);
          periods.push({ label: time.getHours() + ':00', value: time });
        }
        break;
      case '7d':
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now - i * 24 * 60 * 60 * 1000);
          periods.push({ label: date.toLocaleDateString('en-US', { weekday: 'short' }), value: date });
        }
        break;
      case '30d':
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now - i * 24 * 60 * 60 * 1000);
          periods.push({ label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: date });
        }
        break;
      default:
        return this.getTimePeriods('7d');
    }
    
    return periods;
  }

  generateTopProduct(category) {
    const products = {
      'Industrial Pumps': 'Centrifugal Pump Model X200',
      'Electrical Components': 'Industrial Switch Panel Pro',
      'Safety Equipment': 'Safety Helmet Pro Series',
      'Automation Tools': 'PLC Controller Advanced',
      'Raw Materials': 'Steel Grade A Quality'
    };
    
    return products[category] || `${category} Pro Series`;
  }

  getRandomIndustry() {
    const industries = ['Electronics', 'Automotive', 'Manufacturing', 'Chemical', 'Food Processing', 'Textile'];
    return industries[Math.floor(Math.random() * industries.length)];
  }

  /**
   * 🚀 NEW: Default data methods for fallbacks
   */
  getDefaultDashboardMetrics() {
    return {
      activeUsers: 247,
      factories: 89,
      revenue: 125847,
      orders: 156,
      growth: { users: 12, factories: 8, revenue: 23, orders: 15 }
    };
  }

  getDefaultRevenueData() {
    return [
      { date: 'Mon', revenue: 45000, orders: 120, factories: 45 },
      { date: 'Tue', revenue: 52000, orders: 145, factories: 52 },
      { date: 'Wed', revenue: 48000, orders: 135, factories: 48 },
      { date: 'Thu', revenue: 61000, orders: 165, factories: 58 },
      { date: 'Fri', revenue: 75000, orders: 195, factories: 67 },
      { date: 'Sat', revenue: 82000, orders: 220, factories: 74 },
      { date: 'Sun', revenue: 95000, orders: 245, factories: 82 }
    ];
  }

  getDefaultCustomerData() {
    return {
      totalFactories: 89,
      activeThisMonth: 67,
      newRegistrations: 15,
      churnRisk: 3,
      lifetimeValue: { high: 23, medium: 34, low: 32 },
      engagement: {
        avgSessionDuration: '8m 34s',
        pagesPerSession: '12.7',
        monthlyActiveRate: '75.3',
        conversionRate: '23.8'
      }
    };
  }

  getDefaultProductData() {
    return [
      { category: 'Industrial Pumps', sales: 45, revenue: 125000, margin: 32 },
      { category: 'Electrical Components', sales: 89, revenue: 89500, margin: 28 },
      { category: 'Safety Equipment', sales: 67, revenue: 67800, margin: 35 },
      { category: 'Automation Tools', sales: 34, revenue: 156000, margin: 42 },
      { category: 'Raw Materials', sales: 78, revenue: 78900, margin: 18 }
    ];
  }

  getDefaultGeographicData() {
    return [
      { region: 'Selangor', factories: 32, revenue: 45000 },
      { region: 'Johor', factories: 28, revenue: 38000 },
      { region: 'Penang', factories: 15, revenue: 29000 },
      { region: 'Perak', factories: 8, revenue: 12000 },
      { region: 'Kedah', factories: 6, revenue: 8500 }
    ];
  }

  getDefaultOperationalData() {
    return {
      uptime: '99.8%',
      responseTime: '124ms',
      apiCalls: '15.2K',
      activeSessions: 247,
      systemHealth: { database: 'normal', apiGateway: 'normal', cacheHitRate: 'warning' },
      resourceUtilization: { cpu: 67, memory: 45, storage: 78 }
    };
  }

  // =============================================================================
  // 🭍 EXISTING METHODS (PRESERVED AS-IS)
  // =============================================================================

  /**
   * Advanced factory identification using multiple AI signals
   */
  async identifyFactory(sessionData) {
    try {
      console.log('🔍 Starting enhanced factory identification...', sessionData);
      
      const identificationSignals = {
        emailDomain: 0,
        ipGeolocation: 0,
        behaviorPattern: 0,
        existingProfile: 0,
        timePattern: 0
      };

      let factoryProfile = {
        factoryId: null,
        companyName: null,
        industry: null,
        size: null,
        location: null,
        confidence: 0,
        identificationMethod: [],
        industrialZone: null,
        technicalProfile: {},
        marketIntelligence: {}
      };

      // 1. Email Domain Analysis (Highest Confidence)
      if (sessionData.email) {
        const emailAnalysis = await this.analyzeEmailDomain(sessionData.email);
        identificationSignals.emailDomain = emailAnalysis.confidence;
        
        if (emailAnalysis.confidence > 0.8) {
          factoryProfile = { ...factoryProfile, ...emailAnalysis.factoryInfo };
          factoryProfile.identificationMethod.push('email_domain');
          console.log('✅ Factory identified via email domain:', factoryProfile.companyName);
        }
      }

      // 2. Enhanced IP Geolocation Analysis
      const geoAnalysis = await this.enhancedGeolocationAnalysis(sessionData);
      identificationSignals.ipGeolocation = geoAnalysis.confidence;
      
      if (geoAnalysis.confidence > 0.5) {
        factoryProfile.location = factoryProfile.location || geoAnalysis.location;
        factoryProfile.industrialZone = geoAnalysis.industrialZone;
        factoryProfile.identificationMethod.push('enhanced_geolocation');
        console.log('🗺️ Enhanced location identified:', geoAnalysis.location);
      }

      // 3. Behavior Pattern Analysis
      const behaviorAnalysis = await this.analyzeBehaviorPatterns(sessionData);
      identificationSignals.behaviorPattern = behaviorAnalysis.confidence;
      
      if (behaviorAnalysis.confidence > 0.6) {
        factoryProfile.industry = factoryProfile.industry || behaviorAnalysis.likelyIndustry;
        factoryProfile.identificationMethod.push('behavior_analysis');
      }

      // 4. Time Pattern Analysis (Business hours, timezone)
      const timeAnalysis = await this.analyzeTimePatterns(sessionData);
      identificationSignals.timePattern = timeAnalysis.confidence;

      // Calculate overall confidence
      const weights = {
        emailDomain: 0.4,
        ipGeolocation: 0.25,
        behaviorPattern: 0.2,
        existingProfile: 0.1,
        timePattern: 0.05
      };

      factoryProfile.confidence = Object.keys(weights).reduce((total, key) => {
        return total + (identificationSignals[key] * weights[key]);
      }, 0);

      // Enhance with market intelligence
      if (factoryProfile.confidence > 0.6) {
        factoryProfile.marketIntelligence = await this.getMarketIntelligence(factoryProfile);
        factoryProfile.technicalProfile = await this.getTechnicalProfile(factoryProfile);
      }

      console.log('🎯 Enhanced factory identification complete:', factoryProfile);
      
      // Store factory profile for future reference
      if (factoryProfile.confidence > 0.7) {
        await this.storeFactoryProfile(factoryProfile);
      }

      return factoryProfile;

    } catch (error) {
      console.error('❌ Error in enhanced factory identification:', error);
      return this.getDefaultFactoryProfile();
    }
  }

  /**
   * Enhanced geolocation analysis with industrial zone mapping
   */
  async enhancedGeolocationAnalysis(sessionData) {
    try {
      // Get IP-based location (mock implementation)
      const ipLocation = await this.getIPLocation(sessionData.userAgent);
      
      // Map to industrial zones
      const geoData = this.cache.get('geographic_data')?.data;
      if (geoData) {
        const nearestZone = this.findNearestIndustrialZone(ipLocation, geoData.industrialZones);
        
        return {
          confidence: nearestZone ? 0.7 : 0.3,
          location: ipLocation,
          industrialZone: nearestZone?.name || 'Port Klang Free Zone',
          nearestZones: geoData.industrialZones.slice(0, 3)
        };
      }

      return {
        confidence: 0.3,
        location: 'Klang Valley, Malaysia',
        industrialZone: 'Port Klang Free Zone'
      };
    } catch (error) {
      console.error('❌ Error in enhanced geolocation analysis:', error);
      return { confidence: 0, location: null };
    }
  }

  /**
   * Analyze user behavior patterns for factory identification
   */
  async analyzeBehaviorPatterns(sessionData) {
    try {
      const patterns = {
        isIndustrial: false,
        likelyIndustry: null,
        confidence: 0
      };

      // Analyze user agent for industrial software signatures
      const industrialSoftware = [
        'SAP', 'Oracle', 'Siemens', 'Honeywell', 'GE', 'Schneider',
        'AutoCAD', 'SolidWorks', 'MATLAB', 'LabVIEW'
      ];

      if (industrialSoftware.some(software => 
        sessionData.userAgent?.toLowerCase().includes(software.toLowerCase())
      )) {
        patterns.isIndustrial = true;
        patterns.confidence += 0.3;
      }

      // Analyze timing patterns (business hours)
      const accessTime = new Date();
      const hour = accessTime.getHours();
      if (hour >= 8 && hour <= 17) { // Business hours
        patterns.confidence += 0.2;
      }

      // Analyze browser and OS patterns
      if (sessionData.userAgent?.includes('Windows') && 
          !sessionData.userAgent?.includes('Mobile')) {
        patterns.confidence += 0.1; // Desktop Windows common in industrial settings
      }

      // Determine likely industry based on patterns
      if (patterns.confidence > 0.4) {
        const industries = ['Manufacturing', 'Oil & Gas', 'Electronics', 'Automotive'];
        patterns.likelyIndustry = industries[Math.floor(Math.random() * industries.length)];
      }

      return patterns;
    } catch (error) {
      console.error('❌ Error analyzing behavior patterns:', error);
      return { confidence: 0, isIndustrial: false };
    }
  }

  /**
   * Analyze time-based patterns for factory identification
   */
  async analyzeTimePatterns(sessionData) {
    try {
      const now = new Date();
      const hour = now.getHours();
      const dayOfWeek = now.getDay();
      
      let confidence = 0;
      
      // Business hours pattern (8 AM - 6 PM weekdays)
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 8 && hour <= 18) {
        confidence += 0.3;
      }
      
      // Shift patterns (industrial factories often have multiple shifts)
      if (hour >= 6 && hour <= 22) {
        confidence += 0.2;
      }
      
      // Weekend activity (some industrial operations run 24/7)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        confidence += 0.1; // Lower confidence but still possible
      }

      return {
        confidence,
        businessHours: hour >= 8 && hour <= 18,
        likelyShift: this.determineShift(hour),
        timezone: sessionData.timezone || 'Asia/Kuala_Lumpur'
      };
    } catch (error) {
      console.error('❌ Error analyzing time patterns:', error);
      return { confidence: 0 };
    }
  }

  /**
   * Enhanced product interaction tracking with deep analytics
   */
  async trackProductInteraction(interactionData) {
    try {
      const enhancedData = {
        ...interactionData,
        timestamp: serverTimestamp(),
        enhancedMetrics: {
          deviceType: this.getDeviceType(interactionData.contextData?.userAgent),
          sessionDuration: interactionData.contextData?.timeOnPage || 0,
          scrollDepth: interactionData.contextData?.scrollDepth || 0,
          clickSequence: this.getClickSequence(interactionData.sessionId),
          predictedIntent: this.predictUserIntent(interactionData)
        },
        geolocation: {
          industrialZone: interactionData.factoryProfile?.industrialZone,
          region: interactionData.factoryProfile?.location?.region
        }
      };

      // Store interaction
      await addDoc(this.collections.productInteractions, enhancedData);

      // Update behavior profile
      await this.updateBehaviorProfile(interactionData.sessionId, enhancedData);

      // Trigger real-time analytics
      this.emitRealTimeUpdate('product_interaction', enhancedData);

      console.log('📊 Enhanced product interaction tracked:', enhancedData.productId);

    } catch (error) {
      console.error('❌ Error tracking enhanced product interaction:', error);
    }
  }

  /**
   * Enhanced user session tracking
   */
  async trackUserSession(sessionData) {
    try {
      const enhancedSessionData = {
        ...sessionData,
        timestamp: serverTimestamp(),
        isActive: true,
        enhancedMetrics: {
          deviceInfo: this.getDeviceInfo(sessionData.userAgent),
          networkInfo: this.getNetworkInfo(),
          performanceMetrics: this.getPerformanceMetrics(),
          entrySource: this.analyzeEntrySource(sessionData.referrer)
        },
        behaviorProfile: {
          clickPattern: [],
          scrollBehavior: {},
          timeSpent: 0,
          interactionScore: 0
        }
      };

      // Store session
      const sessionRef = await addDoc(this.collections.userSessions, enhancedSessionData);
      
      // Start session monitoring
      this.startSessionMonitoring(sessionRef.id, enhancedSessionData);

      console.log('🔗 Enhanced user session tracked:', sessionRef.id);
      
      return sessionRef.id;

    } catch (error) {
      console.error('❌ Error tracking enhanced user session:', error);
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  async generateSmartRecommendations(factoryProfile, userBehavior = {}) {
    try {
      console.log('🤖 Generating smart recommendations...');

      const recommendations = {
        predictedNeeds: await this.predictFactoryNeeds(factoryProfile),
        geographicOptimized: await this.getGeographicRecommendations(factoryProfile),
        behaviorBased: await this.getBehaviorBasedRecommendations(userBehavior),
        industryTrending: await this.getIndustryTrendingProducts(factoryProfile.industry),
        costOptimized: await this.getCostOptimizedRecommendations(factoryProfile)
      };

      // Store recommendation event for analytics
      await this.trackRecommendationEvent(factoryProfile.factoryId, recommendations);

      return recommendations;

    } catch (error) {
      console.error('❌ Error generating smart recommendations:', error);
      return {};
    }
  }

  /**
   * Subscribe to real-time metrics with enhanced callback support
   */
  async subscribeToRealTimeMetrics(callback) {
    try {
      // Store callback for future updates
      this.realTimeCallbacks = this.realTimeCallbacks || [];
      this.realTimeCallbacks.push(callback);

      // Send initial data
      const initialMetrics = {
        activeSessions: Math.floor(Math.random() * 50) + 10,
        recentInteractions: Math.floor(Math.random() * 100) + 20,
        conversionRate: Math.random() * 0.1 + 0.05,
        timestamp: new Date().toISOString()
      };

      callback(initialMetrics);

      // Setup periodic updates
      const updateInterval = setInterval(() => {
        const updatedMetrics = {
          activeSessions: Math.floor(Math.random() * 50) + 10,
          recentInteractions: Math.floor(Math.random() * 100) + 20,
          conversionRate: Math.random() * 0.1 + 0.05,
          timestamp: new Date().toISOString()
        };
        
        this.realTimeCallbacks?.forEach(cb => cb(updatedMetrics));
      }, 5000);

      // Return unsubscribe function
      return () => {
        clearInterval(updateInterval);
        if (this.realTimeCallbacks) {
          this.realTimeCallbacks = this.realTimeCallbacks.filter(cb => cb !== callback);
        }
      };

    } catch (error) {
      console.error('❌ Error subscribing to real-time metrics:', error);
      return () => {}; // Return no-op unsubscribe
    }
  }

  /**
   * Enhanced user behavior tracking with callbacks
   */
  async trackUserBehavior(sessionId, handlers) {
    try {
      console.log('🔍 Starting enhanced behavior tracking for session:', sessionId);
      
      // Store handlers for this session
      this.behaviorHandlers = this.behaviorHandlers || {};
      this.behaviorHandlers[sessionId] = handlers;

      // Return handlers for immediate use
      return handlers;

    } catch (error) {
      console.error('❌ Error in enhanced behavior tracking setup:', error);
      return {};
    }
  }

  /**
   * Emit real-time update to all subscribers
   */
  emitRealTimeUpdate(type, data) {
    try {
      // Custom event for browser environment
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('higgsflowAnalyticsUpdate', {
          detail: { type, data, timestamp: new Date().toISOString() }
        }));
      }

      // Call registered callbacks
      if (this.realTimeCallbacks) {
        this.realTimeCallbacks.forEach(callback => {
          try {
            callback(data);
          } catch (error) {
            console.error('❌ Error in real-time callback:', error);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error emitting real-time update:', error);
    }
  }

  /**
   * Get device type from user agent
   */
  getDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  /**
   * Get enhanced device information
   */
  getDeviceInfo(userAgent) {
    const parser = {
      browser: this.getBrowserInfo(userAgent),
      os: this.getOSInfo(userAgent),
      device: this.getDeviceType(userAgent)
    };
    
    return parser;
  }

  /**
   * Get browser information from user agent
   */
  getBrowserInfo(userAgent) {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'other';
  }

  /**
   * Get operating system information
   */
  getOSInfo(userAgent) {
    if (!userAgent) return 'unknown';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'other';
  }

  /**
   * Get network information (if available)
   */
  getNetworkInfo() {
    try {
      if (typeof navigator !== 'undefined' && navigator.connection) {
        return {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          saveData: navigator.connection.saveData
        };
      }
    } catch (error) {
      // Network API not supported
    }
    
    return { effectiveType: 'unknown' };
  }

  /**
   * Get basic performance metrics
   */
  getPerformanceMetrics() {
    try {
      if (typeof performance !== 'undefined') {
        return {
          loadTime: performance.timing?.loadEventEnd - performance.timing?.navigationStart,
          domContentLoaded: performance.timing?.domContentLoadedEventEnd - performance.timing?.navigationStart
        };
      }
    } catch (error) {
      // Performance API not supported
    }
    
    return {};
  }

  /**
   * Analyze entry source from referrer
   */
  analyzeEntrySource(referrer) {
    if (!referrer) return 'direct';
    
    if (referrer.includes('google')) return 'google_search';
    if (referrer.includes('bing')) return 'bing_search';
    if (referrer.includes('facebook')) return 'social_facebook';
    if (referrer.includes('linkedin')) return 'social_linkedin';
    
    return 'referral';
  }

  /**
   * Find nearest industrial zone based on location
   */
  findNearestIndustrialZone(location, zones) {
    // Simple implementation - in production, use proper distance calculation
    if (location && location.includes('Klang')) {
      return zones.find(zone => zone.name.includes('Klang'));
    }
    if (location && location.includes('Shah Alam')) {
      return zones.find(zone => zone.name.includes('Shah Alam'));
    }
    if (location && location.includes('Johor')) {
      return zones.find(zone => zone.name.includes('Pengerang'));
    }
    
    // Default to Port Klang
    return zones.find(zone => zone.name.includes('Port Klang')) || zones[0];
  }

  /**
   * Determine work shift based on hour
   */
  determineShift(hour) {
    if (hour >= 6 && hour < 14) return 'morning_shift';
    if (hour >= 14 && hour < 22) return 'afternoon_shift';
    return 'night_shift';
  }

  /**
   * Get IP-based location (mock implementation)
   */
  async getIPLocation(userAgent) {
    // Mock implementation - in production, use IP geolocation service
    const malaysianLocations = [
      'Kuala Lumpur, Malaysia',
      'Selangor, Malaysia', 
      'Johor, Malaysia',
      'Penang, Malaysia',
      'Klang Valley, Malaysia'
    ];
    
    return malaysianLocations[Math.floor(Math.random() * malaysianLocations.length)];
  }

  /**
   * Get default factory profile for fallback
   */
  getDefaultFactoryProfile() {
    return {
      factoryId: 'factory_default',
      companyName: 'Malaysian Industrial Factory',
      industry: 'Manufacturing',
      size: 'Medium Scale',
      location: {
        region: 'Klang Valley',
        state: 'Selangor'
      },
      confidence: 0.6,
      identificationMethod: ['default_profile'],
      industrialZone: 'Port Klang Free Zone',
      technicalProfile: {
        primaryProducts: ['Industrial Equipment', 'Safety Systems'],
        operationalScale: 'Medium Scale Operations'
      },
      marketIntelligence: {
        competitorAnalysis: 'Regional competitors present',
        marketPosition: 'Established player'
      }
    };
  }

  // Placeholder methods for future implementation
  async analyzeEmailDomain(email) { 
    return { confidence: 0.3, factoryInfo: {} }; 
  }
  
  async getMarketIntelligence(profile) { 
    return { competitorCount: 5, marketSize: 'large' }; 
  }
  
  async getTechnicalProfile(profile) { 
    return { capabilities: ['manufacturing'], scale: 'medium' }; 
  }
  
  async storeFactoryProfile(profile) { 
    console.log('Storing factory profile:', profile.factoryId); 
  }
  
  async predictFactoryNeeds(profile) { return []; }
  async getGeographicRecommendations(profile) { return []; }
  async getBehaviorBasedRecommendations(behavior) { return []; }
  async getIndustryTrendingProducts(industry) { return []; }
  async getCostOptimizedRecommendations(profile) { return []; }
  async trackRecommendationEvent(factoryId, recommendations) { }
  async updateBehaviorProfile(sessionId, data) { }
  async trackBehaviorEvent(event, data = {}) { }
  async startSessionMonitoring(sessionId, data) { }
  
  getClickSequence(sessionId) { return []; }
  predictUserIntent(data) { return 'browse'; }
}

// =============================================================================
// 🚀 GLOBAL INSTANCE & HOOKS
// =============================================================================

// Create global analytics instance
export const higgsFlowAnalytics = new HiggsFlowAnalyticsService();

// React hook for HiggsFlow Analytics
export const useHiggsFlowAnalytics = () => {
  return {
    trackSession: higgsFlowAnalytics.trackUserSession.bind(higgsFlowAnalytics),
    trackInteraction: higgsFlowAnalytics.trackProductInteraction.bind(higgsFlowAnalytics),
    identifyFactory: higgsFlowAnalytics.identifyFactory.bind(higgsFlowAnalytics),
    generateRecommendations: higgsFlowAnalytics.generateSmartRecommendations.bind(higgsFlowAnalytics),
    subscribeToMetrics: higgsFlowAnalytics.subscribeToRealTimeMetrics.bind(higgsFlowAnalytics),
    trackBehavior: higgsFlowAnalytics.trackUserBehavior.bind(higgsFlowAnalytics),
    // 🚀 NEW: Dashboard-specific methods
    fetchDashboardMetrics: higgsFlowAnalytics.fetchDashboardMetrics.bind(higgsFlowAnalytics),
    fetchRevenueData: higgsFlowAnalytics.fetchRevenueData.bind(higgsFlowAnalytics),
    fetchCustomerInsights: higgsFlowAnalytics.fetchCustomerInsights.bind(higgsFlowAnalytics),
    fetchProductPerformance: higgsFlowAnalytics.fetchProductPerformance.bind(higgsFlowAnalytics),
    fetchGeographicData: higgsFlowAnalytics.fetchGeographicData.bind(higgsFlowAnalytics),
    fetchOperationalMetrics: higgsFlowAnalytics.fetchOperationalMetrics.bind(higgsFlowAnalytics),
    trackPageView: higgsFlowAnalytics.trackPageView.bind(higgsFlowAnalytics),
    trackProductView: higgsFlowAnalytics.trackProductView.bind(higgsFlowAnalytics),
    trackOrderPlacement: higgsFlowAnalytics.trackOrderPlacement.bind(higgsFlowAnalytics)
  };
};

// 🔄 Real-time analytics hook
export const useRealTimeAnalytics = (eventType) => {
  const [data, setData] = React.useState(null);
  const [lastUpdate, setLastUpdate] = React.useState(null);

  React.useEffect(() => {
    const handleUpdate = (event) => {
      if (event.detail.type === eventType) {
        setData(event.detail.data);
        setLastUpdate(event.detail.timestamp);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('higgsflowAnalyticsUpdate', handleUpdate);
      return () => window.removeEventListener('higgsflowAnalyticsUpdate', handleUpdate);
    }
  }, [eventType]);

  return { data, lastUpdate };
};

// 🎯 Factory identification hook
export const useFactoryIdentification = (sessionData) => {
  const [factoryInfo, setFactoryInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (sessionData) {
      setLoading(true);
      higgsFlowAnalytics.identifyFactory(sessionData)
        .then(setFactoryInfo)
        .finally(() => setLoading(false));
    }
  }, [sessionData]);

  return { factoryInfo, loading };
};

// 🚀 NEW: Dashboard analytics hook
export const useDashboardAnalytics = (timeRange = '7d') => {
  const [data, setData] = React.useState({
    metrics: null,
    revenue: null,
    customers: null,
    products: null,
    geography: null,
    operations: null,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const fetchAllData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [metrics, revenue, customers, products, geography, operations] = await Promise.all([
        higgsFlowAnalytics.fetchDashboardMetrics(timeRange),
        higgsFlowAnalytics.fetchRevenueData(timeRange),
        higgsFlowAnalytics.fetchCustomerInsights(timeRange),
        higgsFlowAnalytics.fetchProductPerformance(timeRange),
        higgsFlowAnalytics.fetchGeographicData(timeRange),
        higgsFlowAnalytics.fetchOperationalMetrics(),
      ]);

      setData({
        metrics,
        revenue,
        customers,
        products,
        geography,
        operations,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  React.useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    data,
    loading,
    error,
    refetch: fetchAllData,
  };
};

// 🚀 NEW: Real-time metrics hook for dashboard
export const useRealTimeMetrics = () => {
  const [metrics, setMetrics] = React.useState({
    activeUsers: 0,
    factories: 0,
    revenue: 0,
    orders: 0,
  });
  const [connected, setConnected] = React.useState(false);

  React.useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = higgsFlowAnalytics.subscribeToRealTimeMetrics((data) => {
      setMetrics(prev => ({
        activeUsers: data.activeSessions || prev.activeUsers,
        factories: prev.factories + Math.floor(Math.random() * 3 - 1),
        revenue: prev.revenue + Math.floor(Math.random() * 1000),
        orders: prev.orders + Math.floor(Math.random() * 5),
      }));
      setConnected(true);
    });

    // Initial data fetch
    higgsFlowAnalytics.fetchDashboardMetrics().then(data => {
      setMetrics({
        activeUsers: data.activeUsers,
        factories: data.factories,
        revenue: data.revenue,
        orders: data.orders,
      });
    });

    return unsubscribe;
  }, []);

  return {
    metrics,
    connected,
  };
};

console.log('🚀 HiggsFlow Phase 2B Enhanced Analytics Service loaded successfully!');
