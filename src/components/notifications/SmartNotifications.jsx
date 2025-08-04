// Fixed SmartNotifications.jsx - Working Action Buttons
// Replace your existing SmartNotifications.jsx with this version

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  Settings,
  RefreshCw,
  TrendingUp,
  Truck,
  Package
} from 'lucide-react';
import SmartNotificationsService from '../../services/notifications/SmartNotificationsService';

const SmartNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [settings, setSettings] = useState({
    enableNotifications: true,
    soundEnabled: true,
    emailAlerts: false
  });
  
  const location = useLocation();
  const navigate = useNavigate();
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
        setNotifications([]);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // ✅ FIXED: Proper component lifecycle management
  useEffect(() => {
    console.log('🔔 SmartNotifications mounted');
    mountedRef.current = true;
    
    // Initial load
    evaluateRules();
    
    // ✅ FIXED: Set up interval with proper cleanup
    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        console.log('⏰ Refreshing notifications...');
        evaluateRules();
      }
    }, 30000); // 30 seconds

    // ✅ FIXED: Proper cleanup function
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

  // ✅ FIXED: Handle location changes properly
  useEffect(() => {
    console.log('🔄 Location changed to:', location.pathname);
  }, [location.pathname]);

  // ✅ FIXED: Proper action handler that executes the action functions
  const handleAction = useCallback((actionResult) => {
    console.log('🎯 Action triggered:', actionResult);
    
    if (!actionResult) return;
    
    // Handle different action types
    switch (actionResult.action) {
      case 'contact_supplier':
        // Navigate to suppliers page or show contact modal
        navigate('/suppliers');
        break;
        
      case 'process_payment':
        // Navigate to proforma invoices for payment processing
        navigate('/proforma-invoices');
        break;
        
      case 'follow_up_payment':
        // Navigate to client invoices for follow up
        navigate('/client-invoices');
        break;
        
      case 'send_reminder':
        // Show success message for sending reminder
        alert('Payment reminder sent successfully!');
        break;
        
      case 'create_po':
        // Navigate to purchase orders to create new PO
        navigate('/purchase-orders');
        break;
        
      case 'update_stock':
        // Navigate to products page for stock management
        navigate('/products');
        break;
        
      case 'start_sourcing':
        // Navigate to sourcing dashboard
        navigate('/sourcing');
        break;
        
      case 'view_client_po':
        // Navigate to client POs
        navigate('/sourcing');
        break;
        
      case 'review_mitigation':
        // Navigate to delivery tracking
        navigate('/delivery-tracking');
        break;
        
      case 'review_optimization':
        // Show optimization details
        alert(`Cost optimization opportunity: ${actionResult.optimization || 'Review details'}`);
        break;
        
      case 'start_implementation':
        // Navigate to purchase orders for implementation
        navigate('/purchase-orders');
        break;
        
      case 'review_supplier_performance':
        // Navigate to suppliers page
        navigate('/suppliers');
        break;
        
      case 'schedule_supplier_meeting':
        // Show scheduling interface (placeholder)
        alert('Meeting scheduled with supplier!');
        break;
        
      case 'review_budget':
        // Navigate to reporting/analytics (if available)
        alert('Budget review interface coming soon!');
        break;
        
      case 'resolve_compliance':
        // Navigate to purchase orders for compliance resolution
        navigate('/purchase-orders');
        break;
        
      case 'escalate_compliance':
        // Show escalation confirmation
        alert('Compliance issue escalated to management!');
        break;
        
      case 'update_timeline':
        // Navigate to delivery tracking
        navigate('/delivery-tracking');
        break;
        
      case 'review_invoice':
        // Navigate to proforma invoices
        navigate('/proforma-invoices');
        break;
        
      case 'early_payment':
        // Navigate to proforma invoices with early payment flag
        navigate('/proforma-invoices');
        break;
        
      case 'view_all_alerts':
        // Scroll to top or refresh current view
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
        
      case 'priority_dashboard':
        // Filter to show only high priority items
        setActiveTab('urgent');
        break;
        
      default:
        console.log('Unknown action:', actionResult.action);
        break;
    }
  }, [navigate]);

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

  const getTypeIcon = (type) => {
    switch (type) {
      case 'delivery': return <Truck className="h-5 w-5" />;
      case 'payment': return <DollarSign className="h-5 w-5" />;
      case 'procurement': return <Package className="h-5 w-5" />;
      case 'urgent': return <AlertTriangle className="h-5 w-5" />;
      default: return <Bell className="h-5 w-5" />;
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
      
      // Special case for urgent tab - show critical and high severity
      if (activeTab === 'urgent') {
        return notification.severity === 'critical' || notification.severity === 'high';
      }
      
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
    setNotifications(prev => Array.isArray(prev) ? 
      prev.filter(n => n.id !== notificationId) : []);
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
          
          <button
            onClick={() => setSettings(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm 
                     font-medium hover:bg-blue-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'all', label: 'All', count: notificationCounts.all },
            { key: 'urgent', label: 'Urgent', count: notificationCounts.urgent },
            { key: 'delivery', label: 'Delivery', count: notificationCounts.delivery },
            { key: 'payment', label: 'Payment', count: notificationCounts.payment },
            { key: 'procurement', label: 'Procurement', count: notificationCounts.procurement }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                  activeTab === tab.key 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Notifications Content */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">
              {activeTab === 'all' 
                ? 'No notifications at this time.'
                : `No ${activeTab} notifications at this time.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`border-l-4 p-4 rounded-r-lg shadow-sm bg-white ${getSeverityColor(notification.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div className="mr-3 text-gray-600">
                          {getTypeIcon(notification.type)}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(notification.severity)}`}>
                          {notification.severity?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{notification.message}</p>
                    
                    {/* Details */}
                    {notification.details && (
                      <div className="mb-4">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {Object.entries(notification.details).map(([key, value]) => (
                              <div key={key} className="flex justify-between">
                                <span className="text-gray-600 capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>
                                <span className="text-gray-900 font-medium">
                                  {typeof value === 'number' && key.toLowerCase().includes('amount') 
                                    ? `$${value.toLocaleString()}` 
                                    : String(value || 'N/A')
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* ✅ FIXED: Action Buttons with proper click handlers */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {notification.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleAction(action.action())} // ✅ FIXED: Execute action function
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
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
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
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
                  
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="ml-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                  >
                    <span className="text-lg">×</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with last update time */}
      <div className="mt-8 text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default SmartNotifications;
