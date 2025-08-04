// Fixed SmartNotifications.jsx Component
// Replace your existing SmartNotifications.jsx with this version

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  Settings,
  RefreshCw
} from 'lucide-react';
import SmartNotificationsService from '../../services/notifications/SmartNotificationsService';

const SmartNotifications = () => {
  const [notifications, setNotifications] = useState([]); // ✅ FIXED: Always initialize as array
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [settings, setSettings] = useState({
    enableNotifications: true,
    soundEnabled: true,
    emailAlerts: false
  });
  
  const location = useLocation();
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  // ✅ FIXED: Safe evaluation function with proper error handling
  const evaluateRules = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      console.log('🔄 Evaluating notification rules...');
      
      const newNotifications = await SmartNotificationsService.getAllNotifications();
      
      // ✅ FIXED: Ensure we always get an array
      const safeNotifications = Array.isArray(newNotifications) ? newNotifications : [];
      
      if (mountedRef.current) {
        setNotifications(safeNotifications);
        console.log(`✅ Updated with ${safeNotifications.length} notifications`);
      }
    } catch (error) {
      console.error('❌ Error evaluating notification rules:', error);
      if (mountedRef.current) {
        setNotifications([]); // Set empty array on error
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Component mount and cleanup
  useEffect(() => {
    console.log('🔔 SmartNotifications mounted');
    mountedRef.current = true;
    
    // Initial evaluation
    evaluateRules();

    // Cleanup function - CRITICAL for preventing navigation blocking
    return () => {
      console.log('🧹 SmartNotifications unmounting - cleaning up...');
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log('🧹 Interval cleared on unmount');
      }
    };
  }, [evaluateRules]);

  // Set up refresh interval
  useEffect(() => {
    if (!mountedRef.current) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        console.log('⏰ Refreshing notifications...');
        evaluateRules();
      } else {
        // Component unmounted, clear interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 30000); // 30 seconds

    // Cleanup function - CRITICAL for preventing navigation blocking
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [evaluateRules]);

  // Additional cleanup on location change (extra safety)
  useEffect(() => {
    if (location.pathname !== '/notifications' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [location.pathname]);

  // Settings management
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('notification_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('notification_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  // Helper functions for enhanced notifications
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivery':
      case 'delivery_overdue':
      case 'delivery_risk':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'payment':
      case 'payment_due':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'urgent':
      case 'supplier_alert':
      case 'compliance_alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'procurement':
      case 'cost_optimization':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'daily_summary':
        return <Bell className="h-5 w-5 text-purple-500" />;
      default: 
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-amber-500 bg-amber-50';
      case 'medium': return 'border-l-blue-500 bg-blue-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-amber-100 text-amber-800';
      case 'medium': return 'bg-blue-100 text-blue-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ✅ FIXED: Safe filtering with proper null checks
  const filteredNotifications = React.useMemo(() => {
    if (!Array.isArray(notifications)) {
      console.warn('⚠️ Notifications is not an array:', typeof notifications);
      return [];
    }

    if (activeTab === 'all') {
      return notifications;
    }

    return notifications.filter(notification => {
      if (!notification) return false;
      
      // Map notification types to categories
      const category = notification.category || notification.type;
      return category === activeTab;
    });
  }, [notifications, activeTab]);

  // ✅ FIXED: Safe notification counts calculation
  const notificationCounts = React.useMemo(() => {
    if (!Array.isArray(notifications)) {
      return { all: 0, delivery: 0, payment: 0, procurement: 0, urgent: 0 };
    }

    return {
      all: notifications.length,
      delivery: notifications.filter(n => n?.type === 'delivery' || n?.category === 'delivery').length,
      payment: notifications.filter(n => n?.type === 'payment' || n?.category === 'payment').length,
      procurement: notifications.filter(n => n?.type === 'procurement' || n?.category === 'procurement').length,
      urgent: notifications.filter(n => n?.severity === 'critical' || n?.severity === 'high').length
    };
  }, [notifications]);

  const handleDismiss = (notificationId) => {
    SmartNotificationsService.dismissNotification(notificationId);
    setNotifications(prev => Array.isArray(prev) ? prev.filter(n => n.id !== notificationId) : []);
  };

  const handleAction = (action) => {
    if (typeof action === 'function') {
      action();
    }
  };

  const refreshNotifications = async () => {
    await evaluateRules();
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mr-3" />
          <span className="text-lg text-gray-600">Loading notifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Notifications</h1>
          <p className="text-gray-600 mt-2">AI-powered procurement alerts and insights</p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={refreshNotifications}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm 
                     font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm 
                           text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{notificationCounts.all}</p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-red-600">{notificationCounts.urgent}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivery Alerts</p>
              <p className="text-2xl font-bold text-amber-600">{notificationCounts.delivery}</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Payment Alerts</p>
              <p className="text-2xl font-bold text-green-600">{notificationCounts.payment}</p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All Notifications' },
              { key: 'delivery', label: 'Delivery' },
              { key: 'payment', label: 'Payments' },
              { key: 'procurement', label: 'Procurement' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
                {notificationCounts[key] > 0 && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full ml-2">
                    {notificationCounts[key]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Notifications List */}
        <div className="p-6">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
              <p className="text-gray-600">
                {activeTab === 'all' 
                  ? 'No notifications at the moment.' 
                  : `No ${activeTab} notifications at the moment.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 rounded-lg p-4 transition-all duration-200 ${getSeverityColor(notification.severity)} ${
                    notification.acted ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(notification.severity)}`}>
                            {notification.severity?.toUpperCase() || 'INFO'}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        
                        {/* Enhanced Details */}
                        {notification.details && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(notification.details).slice(0, 6).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium capitalize text-gray-600">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                  </span>
                                  <span className="text-gray-800">
                                    {typeof value === 'number' && (key.includes('value') || key.includes('amount')) 
                                      ? `$${value.toLocaleString()}` 
                                      : String(value || 'N/A')
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleAction(action.action)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                  action.style === 'primary' 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : action.style === 'success'
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : action.style === 'danger'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                          <span>
                            {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : 'Just now'}
                          </span>
                          {notification.priority && (
                            <span className="bg-gray-100 px-2 py-1 rounded">
                              Priority: {notification.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDismiss(notification.id)}
                      className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer with last update time */}
      <div className="mt-6 text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default SmartNotifications;
