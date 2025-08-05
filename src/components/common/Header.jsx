// src/components/common/Header.jsx - Enhanced with Smart Notifications and Dark Mode
import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Bell, LogOut, User, ChevronDown, AlertTriangle, DollarSign, Package, Brain, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationManager } from './Notification';
import SmartNotificationsService from '../../services/notifications/SmartNotificationsService';
import DarkModeToggle from './DarkModeToggle';

const Header = ({ toggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [smartNotifications, setSmartNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      NotificationManager.error('Failed to logout', { title: 'Error' });
    }
  };

  // ✅ ENHANCED: Load notifications from SmartNotificationsService
  const loadSmartNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading smart notifications in header...');
      
      // Get notifications from the service
      const serviceNotifications = await SmartNotificationsService.getAllNotifications();
      
      // Convert service notifications to header format
      const headerNotifications = serviceNotifications.map(notification => ({
        id: notification.id,
        message: notification.title,
        time: formatTime(notification.timestamp),
        unread: true,
        type: notification.type,
        priority: notification.severity === 'critical' ? 'high' : 
                 notification.severity === 'high' ? 'medium' : 'low',
        icon: getNotificationIcon(notification.type),
        color: getNotificationColor(notification.severity),
        isNew: isRecentNotification(notification.timestamp),
        details: notification.details
      }));

      // Also load legacy localStorage notifications for backward compatibility
      const legacyNotifications = loadLegacyNotifications();
      
      // Combine and deduplicate
      const allNotifications = [...headerNotifications, ...legacyNotifications];
      const uniqueNotifications = allNotifications.filter((notification, index, self) => 
        index === self.findIndex(n => n.id === notification.id)
      );

      setSmartNotifications(uniqueNotifications);
      console.log(`✅ Loaded ${uniqueNotifications.length} notifications in header`);
      
    } catch (error) {
      console.error('❌ Error loading smart notifications in header:', error);
      // Fallback to legacy method
      const legacyNotifications = loadLegacyNotifications();
      setSmartNotifications(legacyNotifications);
    } finally {
      setLoading(false);
    }
  }, []);

  // Helper functions
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delivery': return AlertTriangle;
      case 'payment': return DollarSign;
      case 'procurement': return Package;
      case 'urgent': return AlertTriangle;
      default: return Bell;
    }
  };

  const getNotificationColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-500 dark:text-red-400';
      case 'high': return 'text-amber-500 dark:text-amber-400';
      case 'medium': return 'text-blue-500 dark:text-blue-400';
      case 'low': return 'text-green-500 dark:text-green-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const isRecentNotification = (timestamp) => {
    if (!timestamp) return true;
    const now = new Date();
    const time = new Date(timestamp);
    return (now - time) < 300000; // 5 minutes
  };

  // ✅ LEGACY: Keep existing localStorage logic as fallback
  const loadLegacyNotifications = () => {
    try {
      const deliveryTracking = JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}');
      const paymentTracking = JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}');
      
      const alerts = [];
      const now = new Date();

      // Check for overdue deliveries
      Object.entries(deliveryTracking).forEach(([poId, delivery]) => {
        if (delivery.estimatedDelivery) {
          const expectedDate = new Date(delivery.estimatedDelivery);
          const daysOverdue = Math.floor((now - expectedDate) / (1000 * 60 * 60 * 24));
          
          if (daysOverdue > 0 && delivery.status !== 'completed') {
            alerts.push({
              id: `legacy-overdue-${poId}`,
              message: `PO ${delivery.poNumber || poId} is ${daysOverdue} days overdue`,
              time: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
              unread: true,
              type: 'delivery',
              priority: daysOverdue > 7 ? 'high' : 'medium',
              icon: AlertTriangle,
              color: 'text-red-500 dark:text-red-400',
              isNew: daysOverdue === 1
            });
          }
        }
      });

      // Check for payment due dates
      Object.entries(paymentTracking).forEach(([supplierId, payment]) => {
        if (payment.dueDate) {
          const dueDate = new Date(payment.dueDate);
          const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDue <= 3 && daysUntilDue >= 0 && payment.status === 'pending') {
            alerts.push({
              id: `legacy-payment-${supplierId}`,
              message: `Payment of $${payment.totalAmount?.toLocaleString() || '0'} due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}`,
              time: daysUntilDue === 0 ? 'Due today' : `Due in ${daysUntilDue} days`,
              unread: true,
              type: 'payment',
              priority: daysUntilDue <= 1 ? 'high' : 'medium',
              icon: DollarSign,
              color: daysUntilDue <= 1 ? 'text-red-500 dark:text-red-400' : 'text-amber-500 dark:text-amber-400',
              isNew: daysUntilDue <= 1
            });
          }
        }
      });

      return alerts;
    } catch (error) {
      console.error('Error loading legacy notifications:', error);
      return [];
    }
  };

  // ✅ ENHANCED: Smart notification loading with error handling
  useEffect(() => {
    // Initial load
    loadSmartNotifications();
    
    // Set up periodic checking (every 30 seconds)
    const interval = setInterval(loadSmartNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [loadSmartNotifications]);

  // Regular notifications (your existing ones)
  const regularNotifications = [
    { 
      id: 'regular-1', 
      message: 'New order received', 
      time: '5 minutes ago', 
      unread: true, 
      type: 'order',
      priority: 'low',
      icon: Bell,
      color: 'text-blue-500 dark:text-blue-400'
    },
    { 
      id: 'regular-2', 
      message: 'Low stock alert: Product ABC', 
      time: '1 hour ago', 
      unread: true, 
      type: 'stock',
      priority: 'medium',
      icon: AlertTriangle,
      color: 'text-amber-500 dark:text-amber-400'
    },
    { 
      id: 'regular-3', 
      message: 'Supplier updated catalog', 
      time: '2 hours ago', 
      unread: false, 
      type: 'update',
      priority: 'low',
      icon: Package,
      color: 'text-gray-500 dark:text-gray-400'
    },
  ];

  // Combine and sort all notifications
  const allNotifications = [
    ...smartNotifications,
    ...regularNotifications
  ].sort((a, b) => {
    // Sort by priority first, then by unread status
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    
    if (aPriority !== bPriority) return bPriority - aPriority;
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return 0;
  });

  const unreadCount = allNotifications.filter(n => n.unread).length;
  const highPriorityCount = allNotifications.filter(n => n.priority === 'high').length;

  // Enhanced notification badge styling
  const getNotificationBadgeStyle = () => {
    if (highPriorityCount > 0) {
      return "absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse font-medium";
    }
    if (unreadCount > 0) {
      return "absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800";
    }
    return "";
  };

  // ✅ FIXED: Enhanced click handlers with proper event handling
  const handleNotificationIconClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔔 Notification icon clicked');
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };

  const handleNotificationClick = (notification) => {
    console.log('📱 Notification clicked:', notification.message);
    // Mark as read and navigate
    NotificationManager.success('Navigating to Smart Notifications dashboard', {
      title: 'Opening Notifications...'
    });
    navigate('/notifications');
    setShowNotifications(false);
  };

  const handleViewAllNotifications = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📋 View all notifications clicked');
    NotificationManager.ai('Opening comprehensive notifications dashboard with smart insights', {
      title: '🚀 Loading Smart Dashboard'
    });
    navigate('/notifications');
    setShowNotifications(false);
  };

  const handleSettingsClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('⚙️ Settings clicked');
    navigate('/settings');
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  const handleUserMenuClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };

  // ✅ ENHANCED: Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications || showUserMenu) {
        setShowNotifications(false);
        setShowUserMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showNotifications, showUserMenu]);

  return (
    <header className="fixed top-0 z-50 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu button and Title */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="ml-4 lg:ml-0 flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <span className="text-white font-bold text-sm">HF</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white whitespace-nowrap transition-colors">
                HiggsFlow
              </h1>
            </div>
          </div>

          {/* Right side - Dark mode toggle, Enhanced Notifications, Settings, and User menu */}
          <div className="flex items-center space-x-2">
            {/* Dark Mode Toggle */}
            <DarkModeToggle />

            {/* ✅ ENHANCED: Notifications with proper click handling */}
            <div className="relative">
              <button
                onClick={handleNotificationIconClick}
                className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-6 w-6" />
                {loading && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {!loading && unreadCount > 0 && (
                  <span className={getNotificationBadgeStyle()}>
                    {highPriorityCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
                  </span>
                )}
              </button>

              {/* Enhanced Notifications Dropdown */}
              {showNotifications && (
                <div 
                  className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 backdrop-blur-sm transition-colors duration-300"
                  onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                      {loading && <div className="animate-spin h-3 w-3 border border-blue-500 border-t-transparent rounded-full"></div>}
                    </h3>
                    <button 
                      onClick={handleViewAllNotifications}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                    >
                      View all
                    </button>
                  </div>

                  {/* Priority Alert Banner */}
                  {highPriorityCount > 0 && (
                    <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 dark:from-red-900/20 dark:to-amber-900/20 border-b border-red-100 dark:border-red-800">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">
                          {highPriorityCount} urgent alert{highPriorityCount > 1 ? 's' : ''} requiring attention
                        </span>
                        <Brain className="h-4 w-4 text-purple-500 dark:text-purple-400 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {allNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No notifications at the moment</p>
                      </div>
                    ) : (
                      allNotifications.slice(0, 8).map(notification => {
                        const Icon = notification.icon || Bell;
                        return (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-l-4 transition-all ${
                              notification.unread ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''
                            } ${
                              notification.priority === 'high' ? 'border-l-red-500 hover:bg-red-50/30 dark:hover:bg-red-900/30' :
                              notification.priority === 'medium' ? 'border-l-amber-500 hover:bg-amber-50/30 dark:hover:bg-amber-900/30' :
                              'border-l-transparent'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start space-x-3">
                              <Icon className={`h-5 w-5 mt-0.5 ${notification.color || 'text-gray-400 dark:text-gray-500'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-tight ${
                                  notification.unread ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{notification.time}</p>
                                  <div className="flex items-center space-x-1">
                                    {notification.priority === 'high' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                                        Urgent
                                      </span>
                                    )}
                                    {notification.isNew && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 animate-pulse">
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  {allNotifications.length > 8 && (
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 text-center">
                      <button 
                        onClick={handleViewAllNotifications}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                      >
                        View all {allNotifications.length} notifications →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ✅ NEW: Settings Button */}
            <button
              onClick={handleSettingsClick}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-6 w-6" />
            </button>

            {/* ✅ ENHANCED: User Menu with proper click handling */}
            <div className="relative">
              <button
                onClick={handleUserMenuClick}
                className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.email || 'User'}
                </span>
                <ChevronDown className="hidden md:block h-4 w-4 text-gray-400 dark:text-gray-500" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div 
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50 transition-colors duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-900 dark:text-white">{user?.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleSettingsClick}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
