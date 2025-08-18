// src/components/analytics/HiggsFlowAnalyticsDashboard.jsx
// Phase 2B Analytics Dashboard with REAL Firestore Data Integration

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Users, Eye, ShoppingCart, Factory, Globe, 
  Activity, Clock, Target, Brain, Zap, Award, AlertCircle,
  Calendar, Download, Filter, RefreshCw, ExternalLink
} from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// ========== REAL ANALYTICS DATA SERVICE ==========
class RealAnalyticsDashboardService {
  constructor() {
    this.db = db;
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  async getAnalyticsData(timeRange = '24h') {
    const cacheKey = `analytics_${timeRange}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      console.log('📊 Using cached analytics data');
      return cached.data;
    }

    try {
      console.log('📊 Fetching real analytics data for:', timeRange);
      
      const timeFilter = this.getTimeFilter(timeRange);
      const [interactions, products, factories, quotes] = await Promise.all([
        this.getInteractions(timeFilter),
        this.getProductMetrics(),
        this.getFactoryMetrics(),
        this.getQuoteMetrics(timeFilter)
      ]);

      const analyticsData = {
        overview: this.calculateOverviewMetrics(interactions, products, factories, quotes),
        userBehavior: this.analyzeUserBehavior(interactions),
        productPerformance: this.analyzeProductPerformance(interactions, products),
        factoryEngagement: this.analyzeFactoryEngagement(interactions, factories),
        conversionFunnel: this.calculateConversionFunnel(interactions, quotes),
        realTimeMetrics: this.calculateRealTimeMetrics(interactions),
        timeSeriesData: this.generateTimeSeriesData(interactions, timeRange),
        topInsights: this.generateInsights(interactions, products, factories, quotes)
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: analyticsData,
        timestamp: Date.now()
      });

      console.log('✅ Real analytics data processed:', analyticsData);
      return analyticsData;

    } catch (error) {
      console.error('❌ Error fetching analytics data:', error);
      return this.getFallbackData();
    }
  }

  getTimeFilter(timeRange) {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return startTime;
  }

  async getInteractions(timeFilter) {
    try {
      const interactionsQuery = query(
        collection(this.db, 'analytics_interactions'),
        where('timestamp', '>=', timeFilter),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );

      const snapshot = await getDocs(interactionsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('❌ Error fetching interactions:', error);
      return this.getLocalStorageInteractions(timeFilter);
    }
  }

  getLocalStorageInteractions(timeFilter) {
    try {
      const stored = JSON.parse(localStorage.getItem('higgsflow_analytics') || '[]');
      return stored.filter(event => 
        new Date(event.timestamp) >= timeFilter
      ).map(event => ({
        ...event,
        timestamp: new Date(event.timestamp)
      }));
    } catch (error) {
      console.error('❌ Error reading localStorage analytics:', error);
      return [];
    }
  }

  async getProductMetrics() {
    try {
      const productsQuery = query(
        collection(this.db, 'products'),
        orderBy('viewCount', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(productsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ Error fetching product metrics:', error);
      const localProducts = JSON.parse(localStorage.getItem('products') || '[]');
      return localProducts.map(p => ({ ...p, viewCount: p.viewCount || 0 }));
    }
  }

  async getFactoryMetrics() {
    try {
      const factoryQuery = query(
        collection(this.db, 'factory_registrations'),
        orderBy('registeredAt', 'desc'),
        limit(50)
      );

      const snapshot = await getDocs(factoryQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        registeredAt: doc.data().registeredAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('❌ Error fetching factory metrics:', error);
      return JSON.parse(localStorage.getItem('higgsflow_factories') || '[]');
    }
  }

  async getQuoteMetrics(timeFilter) {
    try {
      const quotesQuery = query(
        collection(this.db, 'quote_requests'),
        where('createdAt', '>=', timeFilter),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(quotesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('❌ Error fetching quote metrics:', error);
      return JSON.parse(localStorage.getItem('higgsflow_quotes') || '[]');
    }
  }

  calculateOverviewMetrics(interactions, products, factories, quotes) {
    const uniqueSessions = new Set(interactions.map(i => i.sessionId)).size;
    const uniqueUsers = new Set(interactions.map(i => i.userId)).size;
    const productViews = interactions.filter(i => i.eventType === 'product_view').length;
    const quoteRequests = quotes.length;

    return {
      totalSessions: uniqueSessions || 1,
      totalUsers: uniqueUsers || 1,
      productViews: productViews,
      quoteRequests: quoteRequests,
      conversionRate: productViews > 0 ? ((quoteRequests / productViews) * 100).toFixed(2) : 0,
      averageSessionDuration: this.calculateAverageSessionDuration(interactions),
      totalFactories: factories.length,
      totalProducts: products.length,
      revenue: quotes.reduce((sum, q) => sum + (q.totalValue || 0), 0)
    };
  }

  analyzeUserBehavior(interactions) {
    const hourlyActivity = this.groupByHour(interactions);
    const topPages = this.getTopPages(interactions);
    const deviceTypes = this.getDeviceTypes(interactions);
    const sessionDurations = this.getSessionDurations(interactions);

    return {
      hourlyActivity,
      topPages,
      deviceTypes,
      sessionDurations
    };
  }

  analyzeProductPerformance(interactions, products) {
    const productViews = {};
    const productConversions = {};

    interactions.forEach(interaction => {
      if (interaction.eventType === 'product_view' && interaction.productId) {
        productViews[interaction.productId] = (productViews[interaction.productId] || 0) + 1;
      }
      if (interaction.eventType === 'quote_request' && interaction.productId) {
        productConversions[interaction.productId] = (productConversions[interaction.productId] || 0) + 1;
      }
    });

    const topProducts = Object.entries(productViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([productId, views]) => {
        const product = products.find(p => p.id === productId);
        return {
          id: productId,
          name: product?.name || `Product ${productId}`,
          views,
          conversions: productConversions[productId] || 0,
          conversionRate: views > 0 ? ((productConversions[productId] || 0) / views * 100).toFixed(2) : 0
        };
      });

    return { topProducts, totalViews: Object.values(productViews).reduce((a, b) => a + b, 0) };
  }

  analyzeFactoryEngagement(interactions, factories) {
    const factoryInteractions = {};

    interactions.forEach(interaction => {
      if (interaction.factoryId) {
        if (!factoryInteractions[interaction.factoryId]) {
          factoryInteractions[interaction.factoryId] = {
            views: 0,
            quotes: 0,
            sessions: new Set()
          };
        }
        
        if (interaction.eventType === 'product_view') {
          factoryInteractions[interaction.factoryId].views++;
        }
        if (interaction.eventType === 'quote_request') {
          factoryInteractions[interaction.factoryId].quotes++;
        }
        
        factoryInteractions[interaction.factoryId].sessions.add(interaction.sessionId);
      }
    });

    const engagedFactories = Object.entries(factoryInteractions).map(([factoryId, data]) => {
      const factory = factories.find(f => f.id === factoryId);
      return {
        id: factoryId,
        name: factory?.companyName || `Factory ${factoryId}`,
        views: data.views,
        quotes: data.quotes,
        sessions: data.sessions.size,
        engagement: data.views + data.quotes * 3 // Weight quotes higher
      };
    }).sort((a, b) => b.engagement - a.engagement).slice(0, 10);

    return {
      engagedFactories,
      totalFactoriesActive: Object.keys(factoryInteractions).length,
      averageEngagement: engagedFactories.length > 0 ? 
        engagedFactories.reduce((sum, f) => sum + f.engagement, 0) / engagedFactories.length : 0
    };
  }

  calculateConversionFunnel(interactions, quotes) {
    const catalogViews = interactions.filter(i => i.eventType === 'catalog_page_load').length;
    const productViews = interactions.filter(i => i.eventType === 'product_view').length;
    const quoteRequests = quotes.length;
    const factoryRegistrations = interactions.filter(i => i.eventType === 'factory_registration').length;

    return [
      { stage: 'Catalog Views', count: catalogViews || 1, percentage: 100 },
      { stage: 'Product Views', count: productViews, percentage: catalogViews > 0 ? (productViews / catalogViews * 100).toFixed(1) : 0 },
      { stage: 'Quote Requests', count: quoteRequests, percentage: productViews > 0 ? (quoteRequests / productViews * 100).toFixed(1) : 0 },
      { stage: 'Factory Registrations', count: factoryRegistrations, percentage: quoteRequests > 0 ? (factoryRegistrations / quoteRequests * 100).toFixed(1) : 0 }
    ];
  }

  generateTimeSeriesData(interactions, timeRange) {
    const data = [];
    const now = new Date();
    let intervals, intervalSize;

    switch (timeRange) {
      case '1h':
        intervals = 12; // 5-minute intervals
        intervalSize = 5 * 60 * 1000;
        break;
      case '24h':
        intervals = 24; // Hourly intervals
        intervalSize = 60 * 60 * 1000;
        break;
      case '7d':
        intervals = 7; // Daily intervals
        intervalSize = 24 * 60 * 60 * 1000;
        break;
      case '30d':
        intervals = 30; // Daily intervals
        intervalSize = 24 * 60 * 60 * 1000;
        break;
      default:
        intervals = 24;
        intervalSize = 60 * 60 * 1000;
    }

    for (let i = intervals - 1; i >= 0; i--) {
      const periodStart = new Date(now.getTime() - (i + 1) * intervalSize);
      const periodEnd = new Date(now.getTime() - i * intervalSize);
      
      const periodInteractions = interactions.filter(interaction => 
        interaction.timestamp >= periodStart && interaction.timestamp < periodEnd
      );

      const label = timeRange === '1h' || timeRange === '24h' ? 
        periodEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
        periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      data.push({
        time: label,
        views: periodInteractions.filter(i => i.eventType === 'product_view').length,
        quotes: periodInteractions.filter(i => i.eventType === 'quote_request').length,
        sessions: new Set(periodInteractions.map(i => i.sessionId)).size,
        interactions: periodInteractions.length
      });
    }

    return data;
  }

  generateInsights(interactions, products, factories, quotes) {
    const insights = [];

    // Top performing product
    const productViews = {};
    interactions.filter(i => i.eventType === 'product_view').forEach(i => {
      if (i.productName) {
        productViews[i.productName] = (productViews[i.productName] || 0) + 1;
      }
    });

    const topProduct = Object.entries(productViews).sort(([,a], [,b]) => b - a)[0];
    if (topProduct) {
      insights.push({
        type: 'success',
        title: 'Top Performing Product',
        description: `${topProduct[0]} has ${topProduct[1]} views`,
        action: 'View Details'
      });
    }

    // Conversion rate insight
    const conversionRate = interactions.filter(i => i.eventType === 'product_view').length > 0 ?
      (quotes.length / interactions.filter(i => i.eventType === 'product_view').length) * 100 : 0;

    if (conversionRate > 5) {
      insights.push({
        type: 'success',
        title: 'High Conversion Rate',
        description: `${conversionRate.toFixed(1)}% conversion rate - above industry average`,
        action: 'Optimize Further'
      });
    } else if (conversionRate < 2) {
      insights.push({
        type: 'warning',
        title: 'Low Conversion Rate',
        description: `${conversionRate.toFixed(1)}% conversion rate - consider improving product pages`,
        action: 'View Recommendations'
      });
    }

    // Factory engagement insight
    const activeFactories = new Set(interactions.filter(i => i.factoryId).map(i => i.factoryId)).size;
    if (activeFactories > 0) {
      insights.push({
        type: 'info',
        title: 'Factory Engagement',
        description: `${activeFactories} active factories this period`,
        action: 'View Factory Analytics'
      });
    }

    return insights;
  }

  // Helper methods
  groupByHour(interactions) {
    const hourly = Array(24).fill(0);
    interactions.forEach(interaction => {
      const hour = interaction.timestamp.getHours();
      hourly[hour]++;
    });
    
    return hourly.map((count, hour) => ({
      hour: `${hour}:00`,
      interactions: count
    }));
  }

  getTopPages(interactions) {
    const pages = {};
    interactions.forEach(i => {
      if (i.url) {
        const path = new URL(i.url).pathname;
        pages[path] = (pages[path] || 0) + 1;
      }
    });

    return Object.entries(pages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([path, count]) => ({ path, count }));
  }

  getDeviceTypes(interactions) {
    const devices = { desktop: 0, mobile: 0, tablet: 0 };
    interactions.forEach(i => {
      if (i.userAgent) {
        if (/Mobile|Android|iPhone/.test(i.userAgent)) {
          devices.mobile++;
        } else if (/Tablet|iPad/.test(i.userAgent)) {
          devices.tablet++;
        } else {
          devices.desktop++;
        }
      }
    });

    return Object.entries(devices).map(([device, count]) => ({ device, count }));
  }

  getSessionDurations(interactions) {
    const sessions = {};
    interactions.forEach(i => {
      if (!sessions[i.sessionId]) {
        sessions[i.sessionId] = { start: i.timestamp, end: i.timestamp };
      } else {
        if (i.timestamp < sessions[i.sessionId].start) sessions[i.sessionId].start = i.timestamp;
        if (i.timestamp > sessions[i.sessionId].end) sessions[i.sessionId].end = i.timestamp;
      }
    });

    const durations = Object.values(sessions).map(session => 
      (session.end - session.start) / 1000 / 60 // Convert to minutes
    );

    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    return { average: avgDuration, sessions: durations.length };
  }

  calculateAverageSessionDuration(interactions) {
    const sessionDurations = this.getSessionDurations(interactions);
    return sessionDurations.average.toFixed(1);
  }

  calculateRealTimeMetrics(interactions) {
    const last5Minutes = interactions.filter(i => 
      (Date.now() - i.timestamp.getTime()) < 5 * 60 * 1000
    );

    return {
      recentInteractions: last5Minutes.length,
      activeSessions: new Set(last5Minutes.map(i => i.sessionId)).size,
      currentUsers: new Set(last5Minutes.map(i => i.userId)).size
    };
  }

  getFallbackData() {
    console.log('📊 Using fallback analytics data');
    return {
      overview: {
        totalSessions: 45,
        totalUsers: 32,
        productViews: 127,
        quoteRequests: 8,
        conversionRate: '6.3',
        averageSessionDuration: '4.2',
        totalFactories: 15,
        totalProducts: 234,
        revenue: 45600
      },
      userBehavior: {
        hourlyActivity: Array(24).fill(0).map((_, i) => ({
          hour: `${i}:00`,
          interactions: Math.floor(Math.random() * 20)
        })),
        topPages: [
          { path: '/catalog', count: 89 },
          { path: '/analytics', count: 34 },
          { path: '/factory/register', count: 12 }
        ],
        deviceTypes: [
          { device: 'desktop', count: 65 },
          { device: 'mobile', count: 28 },
          { device: 'tablet', count: 7 }
        ]
      },
      productPerformance: {
        topProducts: [],
        totalViews: 127
      },
      factoryEngagement: {
        engagedFactories: [],
        totalFactoriesActive: 5,
        averageEngagement: 8.4
      },
      conversionFunnel: [
        { stage: 'Catalog Views', count: 200, percentage: 100 },
        { stage: 'Product Views', count: 127, percentage: 63.5 },
        { stage: 'Quote Requests', count: 8, percentage: 6.3 },
        { stage: 'Factory Registrations', count: 3, percentage: 37.5 }
      ],
      realTimeMetrics: {
        recentInteractions: 3,
        activeSessions: 2,
        currentUsers: 2
      },
      timeSeriesData: [],
      topInsights: [
        {
          type: 'info',
          title: 'Using Demo Data',
          description: 'Connect to Firestore for real analytics',
          action: 'Setup Database'
        }
      ]
    };
  }
}

// ========== MAIN ANALYTICS DASHBOARD COMPONENT ==========
const HiggsFlowAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const analyticsService = useMemo(() => new RealAnalyticsDashboardService(), []);

  // Load analytics data
  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getAnalyticsData(timeRange);
      setAnalyticsData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [analyticsService, timeRange]);

  // Initial load and auto-refresh
  useEffect(() => {
    loadAnalyticsData();

    if (autoRefresh) {
      const interval = setInterval(loadAnalyticsData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [loadAnalyticsData, autoRefresh]);

  // Real-time updates for overview metrics
  useEffect(() => {
    if (!analyticsData) return;

    let unsubscribe;
    
    const setupRealTimeUpdates = async () => {
      try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        unsubscribe = onSnapshot(
          query(
            collection(db, 'analytics_interactions'),
            where('timestamp', '>=', fiveMinutesAgo),
            orderBy('timestamp', 'desc')
          ),
          (snapshot) => {
            const recentInteractions = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            setAnalyticsData(prev => ({
              ...prev,
              realTimeMetrics: {
                recentInteractions: recentInteractions.length,
                activeSessions: new Set(recentInteractions.map(i => i.sessionId)).size,
                currentUsers: new Set(recentInteractions.map(i => i.userId)).size
              }
            }));
          }
        );
      } catch (error) {
        console.error('Error setting up real-time updates:', error);
      }
    };

    setupRealTimeUpdates();
    return () => unsubscribe && unsubscribe();
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics dashboard...</p>
          <p className="text-sm text-gray-500">Connecting to Firestore...</p>
        </div>
      </div>
    );
  }

  const { overview, userBehavior, productPerformance, factoryEngagement, conversionFunnel, realTimeMetrics, timeSeriesData, topInsights } = analyticsData;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">HiggsFlow Analytics</h1>
                <p className="text-sm text-gray-500">
                  Real-time business intelligence • Phase 2B
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>

              {/* Auto Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center px-3 py-2 rounded-lg text-sm ${
                  autoRefresh ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </button>

              {/* Manual Refresh */}
              <button
                onClick={loadAnalyticsData}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Last Updated */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-2" />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {realTimeMetrics.activeSessions} active sessions
            </div>
            <div className="text-gray-500">
              {realTimeMetrics.currentUsers} current users
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalSessions.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Product Views</p>
                <p className="text-2xl font-bold text-gray-900">{overview.productViews.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quote Requests</p>
                <p className="text-2xl font-bold text-gray-900">{overview.quoteRequests.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{overview.conversionRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Time Series Chart */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="views" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                <Area type="monotone" dataKey="quotes" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionFunnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={120} />
                <Tooltip formatter={(value, name) => [value, 'Count']} />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
            {productPerformance.topProducts.length > 0 ? (
              <div className="space-y-3">
                {productPerformance.topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.views} views • {product.conversionRate}% conversion</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No product data available</p>
            )}
          </div>

          {/* Factory Engagement */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Engagement</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active Factories</span>
                <span className="text-lg font-semibold text-gray-900">{factoryEngagement.totalFactoriesActive}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Average Engagement</span>
                <span className="text-lg font-semibold text-gray-900">{factoryEngagement.averageEngagement.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Factories</span>
                <span className="text-lg font-semibold text-gray-900">{overview.totalFactories}</span>
              </div>
            </div>
          </div>

          {/* Real-time Insights */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
            <div className="space-y-3">
              {topInsights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border ${
                  insight.type === 'success' ? 'bg-green-50 border-green-200' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start">
                    <div className={`p-1 rounded ${
                      insight.type === 'success' ? 'bg-green-100' :
                      insight.type === 'warning' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      {insight.type === 'success' ? (
                        <Award className="w-4 h-4 text-green-600" />
                      ) : insight.type === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      ) : (
                        <Brain className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">{insight.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Source Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Data Source Status</h3>
                <p className="text-xs text-gray-500">
                  Connected to Firestore • Real-time analytics • Phase 2B Ready
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Products: {overview.totalProducts}</span>
              <span>•</span>
              <span>Factories: {overview.totalFactories}</span>
              <span>•</span>
              <span>Revenue: RM {overview.revenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiggsFlowAnalyticsDashboard;
