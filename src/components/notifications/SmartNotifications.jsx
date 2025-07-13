// src/components/notifications/SmartNotifications.jsx
// PRODUCTION VERSION - Minimal console logging
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
import { SmartNotificationsService } from '../../services/notifications/SmartNotificationsService';
import { NotificationManager } from '../common/Notification';
import SampleDataService from '../../services/data/SampleDataService.js';




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

  // Critical: Use refs to track component state and prevent memory leaks
  const mountedRef = useRef(true);
  const intervalRef = useRef(null);

  // Component lifecycle management
  useEffect(() => {
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log('🔔 SmartNotifications mounted');
    }
    mountedRef.current = true;
    
    return () => {
      if (import.meta.env.DEV) {
        console.log('🧹 SmartNotifications unmounting');
      }
      mountedRef.current = false;
      
      // Critical: Clear any remaining intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Safe data loading with error handling
  const loadTrackingData = useCallback(() => {
    if (!mountedRef.current) {
      return { deliveryTracking: {}, paymentTracking: {}, purchaseOrders: {} };
    }
    
    try {
      return {
        deliveryTracking: JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}'),
        paymentTracking: JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}'),
        purchaseOrders: JSON.parse(localStorage.getItem('higgsflow_purchaseOrders') || '[]')
      };
    } catch (error) {
      console.error('Error loading tracking data:', error);
      return { deliveryTracking: {}, paymentTracking: {}, purchaseOrders: {} };
    }
  }, []);

  const updateDeliveryStatus = useCallback((poId, updates) => {
    if (!mountedRef.current) return;
    
    try {
      const current = JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}');
      const updated = {
        ...current,
        [poId]: { ...current[poId], ...updates }
      };
      localStorage.setItem('higgsflow_deliveryTracking', JSON.stringify(updated));
      
      if (mountedRef.current) {
        NotificationManager.success('Delivery status updated');
      }
    } catch (error) {
      console.error('Error updating delivery status:', error);
    }
  }, []);

  const updatePaymentStatus = useCallback((supplierId, updates) => {
    if (!mountedRef.current) return;
    
    try {
      const current = JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}');
      const updated = {
        ...current,
        [supplierId]: { ...current[supplierId], ...updates }
      };
      localStorage.setItem('higgsflow_paymentTracking', JSON.stringify(updated));
      
      if (mountedRef.current) {
        NotificationManager.success('Payment status updated');
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
    }
  }, []);

  const showNotification = useCallback((notification) => {
    if (!mountedRef.current) return;
    NotificationManager.show(notification);
  }, []);

  // Safe business rules evaluation
  const evaluateRules = useCallback(() => {
    if (!mountedRef.current) return;
    
    try {
      const data = loadTrackingData();
      const newNotifications = SmartNotificationsService.evaluateBusinessRules(data);
      
      if (mountedRef.current) {
        setNotifications(newNotifications);
        // Only log in development
        if (import.meta.env.DEV && newNotifications.length > 0) {
          console.log('📊 Smart Notifications:', newNotifications.length, 'alerts found');
        }
      }
    } catch (error) {
      console.error('Error evaluating business rules:', error);
    }
  }, [loadTrackingData]);

  // Handle notification actions safely
  const handleAction = useCallback((notification, action) => {
    if (!mountedRef.current) return;
    
    try {
      SmartNotificationsService.handleNotificationAction(
        notification,
        action,
        updateDeliveryStatus,
        updatePaymentStatus,
        showNotification
      );

      if (mountedRef.current) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notification.id ? { ...n, acted: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      if (mountedRef.current) {
        NotificationManager.error('Failed to execute action');
      }
    }
  }, [updateDeliveryStatus, updatePaymentStatus, showNotification]);

  const dismissNotification = useCallback((notificationId) => {
    if (!mountedRef.current) return;
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

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

  // Critical: Safe interval management with proper cleanup
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

  // Helper functions
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info': return <Clock className="h-5 w-5 text-blue-500" />;
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-amber-500 bg-amber-50';
      case 'low': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    return notification.category === activeTab;
  });

  const notificationCounts = {
    all: notifications.length,
    delivery: notifications.filter(n => n.category === 'delivery').length,
    payment: notifications.filter(n => n.category === 'payment').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-500" />
            Smart Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered alerts for your procurement workflows
          </p>
        </div>
        
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-red-600">
                {notifications.filter(n => n.priority === 'high').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Payment Alerts</p>
              <p className="text-2xl font-bold text-amber-600">
                {notifications.filter(n => n.category === 'payment').length}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-amber-500" />
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
              { key: 'payment', label: 'Payments' }
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
              <p className="text-gray-600">No notifications at the moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-l-4 rounded-lg p-4 ${getPriorityColor(notification.priority)} ${
                    notification.acted ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                            notification.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {notification.priority.toUpperCase()}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 mt-1">{notification.message}</p>
                        
                        {notification.actions && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {notification.actions.map((action, index) => (
                              <button
                                key={index}
                                onClick={() => handleAction(notification, action)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
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
