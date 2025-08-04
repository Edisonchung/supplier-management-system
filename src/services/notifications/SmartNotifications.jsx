// src/components/notifications/SmartNotifications.jsx
// BULLETPROOF VERSION - Guaranteed to work with Firestore
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X, 
  DollarSign,
  Settings as SettingsIcon,
  RefreshCw,
  Package,
  TrendingUp
} from 'lucide-react';
import SmartNotificationsService from '../../services/notifications/SmartNotificationsService';

const SmartNotifications = () => {
  const location = useLocation();
  
  // ✅ BULLETPROOF: Always initialize as empty array
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Settings with safe defaults
  const [settings, setSettings] = useState({
    deliveryAlerts: true,
    paymentReminders: true,
    performanceAlerts: true,
    costOptimization: false
  });

  // Critical: Use refs to track component state and prevent memory leaks
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  // ✅ BULLETPROOF: Component lifecycle management
  useEffect(() => {
    console.log('🔔 SmartNotifications mounted - BULLETPROOF version');
    mountedRef.current = true;
    
    return () => {
      console.log('🧹 SmartNotifications unmounting - cleaning up');
      mountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ✅ BULLETPROOF: Safe evaluation with comprehensive error handling
  const evaluateRules = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Evaluating BULLETPROOF business rules...');
      
      // Get notifications with timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const notificationPromise = SmartNotificationsService.getAllNotifications();
      
      const result = await Promise.race([notificationPromise, timeoutPromise]);
      
      // ✅ BULLETPROOF: Multiple layers of safety
      let safeNotifications = [];
      
      if (result) {
        if (Array.isArray(result)) {
          safeNotifications = result;
        } else if (result.data && Array.isArray(result.data)) {
          safeNotifications = result.data;
        } else if (result.notifications && Array.isArray(result.notifications)) {
          safeNotifications = result.notifications;
        } else {
          console.warn('⚠️ Unexpected notification format:', typeof result);
          safeNotifications = [];
        }
      }
      
      // Additional safety: ensure each notification is valid
      safeNotifications = safeNotifications.filter(n => n && typeof n === 'object' && n.id);
      
      if (mountedRef.current) {
        setNotifications(safeNotifications);
        setLastUpdate(new Date());
        setError(null);
        
        console.log(`✅ BULLETPROOF: Loaded ${safeNotifications.length} notifications`);
      }
      
    } catch (error) {
      console.error('❌ BULLETPROOF: Error loading notifications:', error);
      
      if (mountedRef.current) {
        setNotifications([]);
        setError(error.message || 'Failed to load notifications');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ✅ BULLETPROOF: Safe action handling
  const handleAction = useCallback((notification, action) => {
    if (!mountedRef.current || !notification || !action) return;
    
    try {
      console.log('🎯 Executing action:', action.label);
      
      // Execute the action safely
      if (typeof action.action === 'function') {
        action.action();
      } else if (typeof action.handler === 'function') {
        action.handler();
      }

      // Update notification state safely
      setNotifications(prev => {
        if (!Array.isArray(prev)) return [];
        
        return prev.map(n => 
          n && n.id === notification.id ? { ...n, acted: true } : n
        );
      });
      
    } catch (error) {
      console.error('❌ Action execution failed:', error);
    }
  }, []);

  // ✅ BULLETPROOF: Safe dismissal
  const dismissNotification = useCallback((notificationId) => {
    if (!mountedRef.current || !notificationId) return;
    
    try {
      // Dismiss from service
      if (SmartNotificationsService && SmartNotificationsService.dismissNotification) {
        SmartNotificationsService.dismissNotification(notificationId);
      }
      
      // Update local state safely
      setNotifications(prev => {
        if (!Array.isArray(prev)) return [];
        return prev.filter(n => n && n.id !== notificationId);
      });
      
      console.log('✅ Notification dismissed:', notificationId);
    } catch (error) {
      console.error('❌ Error dismissing notification:', error);
    }
  }, []);

  // ✅ BULLETPROOF: Safe refresh
  const refreshNotifications = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      console.log('🔄 BULLETPROOF: Manual refresh');
      
      if (SmartNotificationsService && SmartNotificationsService.refreshNotifications) {
        await SmartNotificationsService.refreshNotifications();
      }
      
      await evaluateRules();
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      setError('Failed to refresh notifications');
    }
  }, [evaluateRules]);

  // ✅ BULLETPROOF: Settings management
  useEffect(() => {
    if (!mountedRef.current) return;
    
    try {
      const saved = localStorage.getItem('higgsflow_notifications_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setSettings(prev => ({ ...prev, ...parsed }));
        }
      }
    } catch (error) {
      console.error('Settings load error:', error);
    }
  }, []);

  useEffect(() => {
    if (!mountedRef.current) return;
    
    try {
      localStorage.setItem('higgsflow_notifications_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Settings save error:', error);
    }
  }, [settings]);

  // ✅ BULLETPROOF: Initialization and refresh cycle
  useEffect(() => {
    // Initial load
    evaluateRules();

    // Set up refresh interval
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        evaluateRules();
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 30000); // 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [evaluateRules]);

  // ✅ BULLETPROOF: Location cleanup
  useEffect(() => {
    if (location.pathname !== '/notifications' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [location.pathname]);

  // ✅ BULLETPROOF: Helper functions with multiple fallbacks
  const getNotificationIcon = (type) => {
    if (!type) return <Bell className="h-5 w-5 text-gray-500" />;
    
    const iconMap = {
      delivery: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      delivery_overdue: <AlertTriangle className="h-5 w-5 text-red-500" />,
      delivery_risk: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      payment: <DollarSign className="h-5 w-5 text-green-500" />,
      payment_due: <DollarSign className="h-5 w-5 text-orange-500" />,
      urgent: <AlertTriangle className="h-5 w-5 text-red-500" />,
      supplier_alert: <AlertTriangle className="h-5 w-5 text-red-500" />,
      compliance_alert: <AlertTriangle className="h-5 w-5 text-purple-500" />,
      procurement: <Package className="h-5 w-5 text-blue-500" />,
      cost_optimization: <TrendingUp className="h-5 w-5 text-blue-500" />,
      daily_summary: <Bell className="h-5 w-5 text-purple-500" />
    };
    
    return iconMap[type] || <Bell className="h-5 w-5 text-gray-500" />;
  };

  const getSeverityColor = (severity) => {
    if (!severity) return 'border-l-gray-500 bg-gray-50';
    
    const colorMap = {
      critical: 'border-l-red-500 bg-red-50',
      high: 'border-l-orange-500 bg-orange-50',
      medium: 'border-l-yellow-500 bg-yellow-50',
      low: 'border-l-blue-500 bg-blue-50'
    };
    
    return colorMap[severity] || 'border-l-gray-500 bg-gray-50';
  };

  const getSeverityBadge = (severity) => {
    if (!severity) return 'bg-gray-100 text-gray-700';
    
    const badgeMap = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700', 
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    
    return badgeMap[severity] || 'bg-gray-100 text-gray-700';
  };

  // ✅ BULLETPROOF: Safe filtering with maximum protection
  const getFilteredNotifications = () => {
    // Multiple safety checks
    if (!notifications) return [];
    if (!Array.isArray(notifications)) return [];
    if (notifications.length === 0) return [];
    
    // Filter out invalid notifications
    const validNotifications = notifications.filter(n => 
      n && 
      typeof n === 'object' && 
      n.id && 
      (n.type || n.category)
    );
    
    if (activeTab === 'all') {
      return validNotifications;
    }
    
    // Safe filtering by type/category
    return validNotifications.filter(notification => {
      const type = notification.type || '';
      const category = notification.category || '';
      const severity = notification.severity || '';
      
      switch (activeTab) {
        case 'delivery':
          return type.includes('delivery') || category === 'delivery';
        case 'payment':
          return type.includes('payment') || category === 'payment';
        case 'critical':
          return severity === 'critical';
        case 'procurement':
          return type === 'procurement' || category === 'procurement';
        case 'optimization':
          return type === 'cost_optimization' || category === 'optimization';
        default:
          return true;
      }
    });
  };

  // ✅ BULLETPROOF: Safe counts calculation
  const getNotificationCounts = () => {
    if (!Array.isArray(notifications)) {
      return { all: 0, delivery: 0, payment: 0, critical: 0, procurement: 0, optimization: 0 };
    }
    
    const validNotifications = notifications.filter(n => n && typeof n === 'object');
    
    return {
      all: validNotifications.length,
      delivery: validNotifications.filter(n => {
        const type = n.type || '';
        const category = n.category || '';
        return type.includes('delivery') || category === 'delivery';
      }).length,
      payment: validNotifications.filter(n => {
        const type = n.type || '';
        const category = n.category || '';
        return type.includes('payment') || category === 'payment';
      }).length,
      critical: validNotifications.filter(n => n.severity === 'critical').length,
      procurement: validNotifications.filter(n => {
        const type = n.type || '';
        const category = n.category || '';
        return type === 'procurement' || category === 'procurement';
      }).length,
      optimization: validNotifications.filter(n => {
        const type = n.type || '';
        const category = n.category || '';
        return type === 'cost_optimization' || category === 'optimization';
      }).length
    };
  };

  // ✅ BULLETPROOF: Safe summary calculation
  const getSummary = () => {
    if (!Array.isArray(notifications)) {
      return { critical: 0, high: 0, totalValue: 0 };
    }
    
    const validNotifications = notifications.filter(n => n && typeof n === 'object');
    
    const critical = validNotifications.filter(n => n.severity === 'critical').length;
    const high = validNotifications.filter(n => n.severity === 'high').length;
    
    const totalValue = validNotifications.reduce((sum, n) => {
      if (!n.details) return sum;
      const value = n.details.value || n.details.amount || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);

    return { critical, high, totalValue };
  };

  // Calculate values safely
  const filteredNotifications = getFilteredNotifications();
  const notificationCounts = getNotificationCounts();
  const summary = getSummary();

  // ✅ BULLETPROOF: Loading state
  if (loading && notifications.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mr-3" />
          <span className="text-lg text-gray-600">Loading smart notifications...</span>
        </div>
      </div>
    );
  }

  // ✅ BULLETPROOF: Error state
  if (error && notifications.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Notifications</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refreshNotifications}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-500" />
            Smart Notifications
            <span className="text-sm font-normal text-gray-500 bg-green-100 px-2 py-1 rounded">
              Bulletproof ✅
            </span>
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered procurement intelligence with real Firestore data
          </p>
          {lastUpdate && (
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refreshNotifications}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm ${
              loading ? 'opacity-50' : ''
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <SettingsIcon className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Value at Risk</p>
              <p className="text-2xl font-bold text-green-600">
                ${summary.totalValue.toLocaleString()}
              </p>
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
              { key: 'critical', label: 'Critical' },
              { key: 'delivery', label: 'Deliveries' },
              { key: 'payment', label: 'Payments' },
              { key: 'procurement', label: 'Procurement' },
              { key: 'optimization', label: 'Opportunities' }
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
                  <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                    key === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
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
                          <h4 className="font-medium text-gray-900">{notification.title || 'Notification'}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityBadge(notification.severity)}`}>
                            {(notification.severity || 'info').toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{notification.message || 'No message available'}</p>
                        
                        {/* Details */}
                        {notification.details && Object.keys(notification.details).length > 0 && (
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
                        
                        {/* Actions */}
                        {notification.actions && Array.isArray(notification.actions) && notification.actions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleAction(notification, action)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                  action.style === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                  action.style === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                                  action.style === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                                  'bg-gray-600 text-white hover:bg-gray-700'
                                }`}
                              >
                                {action.label || 'Action'}
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
                      onClick={() => dismissNotification(notification.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors ml-4"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
          
          <div className="space-y-4">
            {[
              { key: 'deliveryAlerts', label: 'Delivery Alerts', desc: 'Overdue and delayed deliveries' },
              { key: 'paymentReminders', label: 'Payment Reminders', desc: 'Due dates and overdue payments' },
              { key: 'performanceAlerts', label: 'Performance Alerts', desc: 'Supplier performance issues' },
              { key: 'costOptimization', label: 'Cost Optimization', desc: 'Savings opportunities' }
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{label}</p>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[key] || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="mt-6 text-center text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        <p>
          🔧 <strong>Debug Info:</strong> 
          Notifications loaded: {notifications.length} • 
          Filtered: {filteredNotifications.length} • 
          Active tab: {activeTab} • 
          Last update: {lastUpdate ? lastUpdate.toLocaleString() : 'Never'} •
          {error && <span className="text-red-600"> Error: {error}</span>}
        </p>
      </div>
    </div>
  );
};

export default SmartNotifications;
