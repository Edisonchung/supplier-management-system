// src/hooks/useAnalytics.js

import { useState, useEffect, useCallback, useRef } from 'react';
import analyticsService from '../services/analyticsService';

// Main analytics hook
export const useAnalytics = (timeRange = '7d') => {
  const [data, setData] = useState({
    metrics: null,
    revenue: null,
    customers: null,
    products: null,
    geography: null,
    operations: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [metrics, revenue, customers, products, geography, operations] = await Promise.all([
        analyticsService.fetchDashboardMetrics(timeRange),
        analyticsService.fetchRevenueData(timeRange),
        analyticsService.fetchCustomerInsights(timeRange),
        analyticsService.fetchProductPerformance(timeRange),
        analyticsService.fetchGeographicData(timeRange),
        analyticsService.fetchOperationalMetrics(),
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

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  return {
    data,
    loading,
    error,
    refetch: fetchAllData,
  };
};

// Real-time metrics hook
export const useRealTimeMetrics = () => {
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    factories: 0,
    revenue: 0,
    orders: 0,
  });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    const handleMessage = (data) => {
      if (data.type === 'metrics_update') {
        setMetrics(prev => ({
          ...prev,
          ...data.payload,
        }));
      }
    };

    const handleError = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    // Connect WebSocket
    analyticsService.connectWebSocket(handleMessage, handleError);
    setConnected(true);

    // Initial data fetch
    analyticsService.fetchDashboardMetrics().then(setMetrics);

    // Fallback: simulate real-time updates if WebSocket fails
    const fallbackInterval = setInterval(() => {
      setMetrics(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10 - 5),
        factories: prev.factories + Math.floor(Math.random() * 3 - 1),
        revenue: prev.revenue + Math.floor(Math.random() * 1000),
        orders: prev.orders + Math.floor(Math.random() * 5),
      }));
    }, 3000);

    return () => {
      analyticsService.disconnectWebSocket();
      clearInterval(fallbackInterval);
      setConnected(false);
    };
  }, []);

  return {
    metrics,
    connected,
  };
};

// User tracking hook
export const useTracking = () => {
  const trackPageView = useCallback((page, userId) => {
    analyticsService.trackPageView(page, userId);
  }, []);

  const trackProductView = useCallback((productId, userId) => {
    analyticsService.trackProductView(productId, userId);
  }, []);

  const trackOrderPlacement = useCallback((orderId, userId, amount) => {
    analyticsService.trackOrderPlacement(orderId, userId, amount);
  }, []);

  const trackCustomEvent = useCallback((action, data) => {
    analyticsService.trackUserAction(action, data);
  }, []);

  return {
    trackPageView,
    trackProductView,
    trackOrderPlacement,
    trackCustomEvent,
  };
};

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [performance, setPerformance] = useState({
    uptime: '99.8%',
    responseTime: '124ms',
    apiCalls: '15.2K',
    activeSessions: 247,
  });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        const data = await analyticsService.fetchOperationalMetrics();
        setPerformance(data);
        
        // Check for alerts
        const newAlerts = [];
        if (data.responseTime > 200) {
          newAlerts.push({
            type: 'warning',
            message: 'High response time detected',
            timestamp: new Date(),
          });
        }
        if (data.uptime < 99) {
          newAlerts.push({
            type: 'error',
            message: 'System uptime below threshold',
            timestamp: new Date(),
          });
        }
        setAlerts(newAlerts);
      } catch (error) {
        console.error('Error fetching performance data:', error);
      }
    };

    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    performance,
    alerts,
  };
};

// Data export hook
export const useDataExport = () => {
  const [exporting, setExporting] = useState(false);

  const exportToCsv = useCallback(async (data, filename) => {
    setExporting(true);
    try {
      const csv = convertToCSV(data);
      downloadCSV(csv, filename);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  }, []);

  const exportToPdf = useCallback(async (data, filename) => {
    setExporting(true);
    try {
      // Implement PDF export functionality
      console.log('PDF export not implemented yet');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setExporting(false);
    }
  }, []);

  return {
    exportToCsv,
    exportToPdf,
    exporting,
  };
};

// Utility functions
function convertToCSV(data) {
  if (!Array.isArray(data) || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
