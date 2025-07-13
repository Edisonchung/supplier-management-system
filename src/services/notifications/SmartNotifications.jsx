// src/components/notifications/SmartNotifications.jsx
// ENHANCED VERSION - Compatible with new SmartNotificationsService
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  X, 
  DollarSign,
  Settings as SettingsIcon 
} from 'lucide-react';
import SmartNotificationsService from '../../services/notifications/SmartNotificationsService';
import { NotificationManager } from '../common/Notification';

const SmartNotifications = () => {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    deliveryAlerts: true,
    paymentReminders: true,
    performanceAlerts: true,
    costOptimization: false
  });
  const [lastUpdate, setLastUpdate] = useState(null);

  // Critical: Use refs to track component state and prevent memory leaks
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  // Component lifecycle management
  useEffect(() => {
    console.log('🔔 SmartNotifications mounted with enhanced features');
    mountedRef.current = true;
    
    return () => {
      console.log('🧹 SmartNotifications unmounting');
      mountedRef.current = false;
      
      // Critical: Clear any remaining intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Enhanced business rules evaluation using the new service
  const evaluateRules = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      console.log('🔄 Evaluating enhanced business rules...');
      
      // Get all notifications from the enhanced service
      const newNotifications = await SmartNotificationsService.getAllNotifications();
      
      if (mountedRef.current) {
        setNotifications(newNotifications);
        setLastUpdate(new Date());
        
        console.log(`✅ Loaded ${newNotifications.length} enhanced notifications`);
        
        // Show toast for critical alerts
        const criticalAlerts = newNotifications.filter(n => n.severity === 'critical');
        if (criticalAlerts.length > 0) {
          NotificationManager.urgent(
            `${criticalAlerts.length} critical alert${criticalAlerts.length > 1 ? 's' : ''} need immediate attention`,
            { duration: 8000 }
          );
        }
      }
    } catch (error) {
      console.error('Error evaluating enhanced business rules:', error);
      if (mountedRef.current) {
        NotificationManager.error('Failed to load notifications');
      }
    }
  }, []);

  // Handle notification actions with enhanced service
  const handleAction = useCallback((notification, action) => {
    if (!mountedRef.current) return;
    
    try {
      console.log('🎯 Executing notification action:', action.label);
      
      // Execute the action
      if (action.handler) {
        const result = action.handler();
        console.log('Action result:', result);
      }

      // Mark notification as acted upon
      if (mountedRef.current) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, acted: true } : n
          )
        );
        
        NotificationManager.success(`Action "${action.label}" completed`);
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      if (mountedRef.current) {
        NotificationManager.error('Failed to execute action');
      }
    }
  }, []);

  const dismissNotification = useCallback((notificationId) => {
    if (!mountedRef.current) return;
    
    try {
      // Dismiss from service
      SmartNotificationsService.dismissNotification(notificationId);
      
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      console.log('✅ Notification dismissed:', notificationId);
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!mountedRef.current) return;
    
    try {
      console.log('🔄 Manually refreshing notifications...');
      await SmartNotificationsService.refreshNotifications();
      await evaluateRules();
      NotificationManager.success('Notifications refreshed');
    } catch (error) {
      console.error('Error refreshing notifications:', error);
      NotificationManager.error('Failed to refresh notifications');
    }
  }, [evaluateRules]);

  // Load settings safely
  useEffect(() => {
    if (!mountedRef.current) return;
    
    try {
      const savedSettings = localStorage.getItem('higgsflow_notificationSettings');
      if (savedSettings && mountedRef.current) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  // Save settings safely
  useEffect(() => {
    if (!mountedRef.current) return;
    
    try {
      localStorage.setItem('higgsflow_notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [settings]);

  // Initialize and set up automatic refresh
  useEffect(() => {
    // Initial evaluation
    evaluateRules();

    // Set up interval with safety checks
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
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

  // Helper functions for enhanced notifications
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivery_overdue':
      case 'delivery_risk':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'payment_due':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'supplier_alert':
      case 'compliance_alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
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
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-700',
      high: 'bg-orange-100 text-orange-700',
      medium: 'bg-yellow-100 text-yellow-700',
      low: 'bg-blue-100 text-blue-700'
    };
    
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  // Enhanced filtering
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    
    switch (activeTab) {
      case 'delivery':
        return ['delivery_overdue', 'delivery_risk'].includes(notification.type);
      case 'payment':
        return notification.type === 'payment_due';
      case 'critical':
        return notification.severity === 'critical';
      case 'optimization':
        return notification.type === 'cost_optimization';
      default:
        return true;
    }
  });

  const notificationCounts = {
    all: notifications.length,
    delivery: notifications.filter(n => ['delivery_overdue', 'delivery_risk'].includes(n.type)).length,
    payment: notifications.filter(n => n.type === 'payment_due').length,
    critical: notifications.filter(n => n.severity === 'critical').length,
    optimization: notifications.filter(n => n.type === 'cost_optimization').length
  };

  const getNotificationSummary = () => {
    const critical = notifications.filter(n => n.severity === 'critical').length;
    const high = notifications.filter(n => n.severity === 'high').length;
    const totalValue = notifications.reduce((sum, n) => {
      const value = n.details?.value || n.details?.amount || 0;
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);

    return { critical, high, totalValue };
  };

  const summary = getNotificationSummary();

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-500" />
            Smart Notifications
            <span className="text-sm font-normal text-gray-500">Enhanced</span>
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered procurement intelligence with realistic business scenarios
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
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            🔄 Refresh
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

      {/* Enhanced Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
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

      {/* Enhanced Tab Navigation */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { key: 'all', label: 'All Notifications' },
              { key: 'critical', label: 'Critical' },
              { key: 'delivery', label: 'Deliveries' },
              { key: 'payment', label: 'Payments' },
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

        {/* Enhanced Notifications List */}
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
                  className={`border-l-4 rounded-lg p-4 ${getSeverityColor(notification.severity)} ${
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
                            {notification.severity.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-700 mb-3">{notification.message}</p>
                        
                        {/* Enhanced Details */}
                        {notification.details && (
                          <div className="bg-gray-50 rounded p-3 mb-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(notification.details).slice(0, 6).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="font-medium capitalize">
                                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                  </span>
                                  <span className="text-gray-600">
                                    {typeof value === 'number' && (key.includes('value') || key.includes('amount')) 
                                      ? `$${value.toLocaleString()}`
                                      : String(value)
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Enhanced Actions */}
                        {notification.actions && (
                          <div className="flex flex-wrap gap-2">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleAction(notification, action)}
                                className={`px-3 py-1 text-sm rounded transition-colors ${
                                  action.style === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                  action.style === 'success' ? 'bg-green-600 text-white hover:bg-green-700' :
                                  action.style === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                                  'bg-gray-600 text-white hover:bg-gray-700'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
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
                    checked={settings[key]}
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
    </div>
  );
};

export default SmartNotifications;
