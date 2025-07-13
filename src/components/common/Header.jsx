// src/components/common/Header.jsx - Enhanced with Smart Notifications
import React, { useState, useEffect } from 'react';
import { Menu, Bell, LogOut, User, ChevronDown, AlertTriangle, DollarSign, Package, Brain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { NotificationManager } from './Notification';

const Header = ({ toggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [smartNotifications, setSmartNotifications] = useState([]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Smart Notifications Logic
  useEffect(() => {
    const loadSmartNotifications = () => {
      try {
        const deliveryTracking = JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}');
        const paymentTracking = JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}');
        
        const alerts = [];
        const now = new Date();
        let hasNewUrgent = false;

        // Check for overdue deliveries
        Object.entries(deliveryTracking).forEach(([poId, delivery]) => {
          if (delivery.estimatedDelivery) {
            const expectedDate = new Date(delivery.estimatedDelivery);
            const daysOverdue = Math.floor((now - expectedDate) / (1000 * 60 * 60 * 24));
            
            if (daysOverdue > 0 && delivery.status !== 'completed') {
              const isJustOverdue = daysOverdue === 1; // Just became overdue today
              
              alerts.push({
                id: `overdue-${poId}`,
                message: `PO ${delivery.poNumber || poId} is ${daysOverdue} days overdue`,
                time: `${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
                unread: true,
                type: 'delivery',
                priority: daysOverdue > 7 ? 'high' : 'medium',
                icon: AlertTriangle,
                color: 'text-red-500',
                isNew: isJustOverdue
              });

              // Trigger toast notification for newly overdue items
              if (isJustOverdue) {
                hasNewUrgent = true;
                NotificationManager.warning(
                  `PO ${delivery.poNumber || poId} delivery is now overdue`, 
                  {
                    title: '⚠️ Delivery Alert',
                    action: {
                      label: 'View Details',
                      onClick: () => navigate('/notifications')
                    },
                    duration: 8000
                  }
                );
              }
            }
          }
        });

        // Check for payment due dates
        Object.entries(paymentTracking).forEach(([supplierId, payment]) => {
          if (payment.dueDate) {
            const dueDate = new Date(payment.dueDate);
            const daysUntilDue = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue <= 3 && daysUntilDue >= 0 && payment.status === 'pending') {
              const isDueToday = daysUntilDue === 0;
              const isDueTomorrow = daysUntilDue === 1;
              
              alerts.push({
                id: `payment-${supplierId}`,
                message: `Payment of $${payment.totalAmount?.toLocaleString() || '0'} due ${isDueToday ? 'today' : `in ${daysUntilDue} days`}`,
                time: isDueToday ? 'Due today' : `Due in ${daysUntilDue} days`,
                unread: true,
                type: 'payment',
                priority: daysUntilDue <= 1 ? 'high' : 'medium',
                icon: DollarSign,
                color: daysUntilDue <= 1 ? 'text-red-500' : 'text-amber-500',
                isNew: isDueToday || isDueTomorrow
              });

              // Trigger toast notifications for urgent payments
              if (isDueToday) {
                hasNewUrgent = true;
                NotificationManager.error(
                  `Payment of $${payment.totalAmount?.toLocaleString()} is due today`, 
                  {
                    title: '🚨 Urgent Payment Due',
                    action: {
                      label: 'Process Payment',
                      onClick: () => navigate('/notifications')
                    },
                    duration: 10000
                  }
                );
              } else if (isDueTomorrow) {
                NotificationManager.warning(
                  `Payment of $${payment.totalAmount?.toLocaleString()} due tomorrow`, 
                  {
                    title: '💰 Payment Reminder',
                    action: {
                      label: 'Schedule Payment',
                      onClick: () => navigate('/notifications')
                    },
                    duration: 6000
                  }
                );
              }
            }
          }
        });

        // Show AI summary for multiple urgent items
        const urgentCount = alerts.filter(a => a.priority === 'high').length;
        if (hasNewUrgent && urgentCount > 1) {
          NotificationManager.ai(
            `Found ${urgentCount} urgent procurement alerts requiring immediate attention`, 
            {
              title: '🧠 Smart Procurement Alert',
              action: {
                label: 'Review All Alerts',
                onClick: () => navigate('/notifications')
              },
              duration: 8000
            }
          );
        }

        setSmartNotifications(alerts);
      } catch (error) {
        console.error('Error loading smart notifications:', error);
        NotificationManager.error('Failed to load smart notifications', {
          title: 'System Error'
        });
      }
    };

    // Initial load
    loadSmartNotifications();
    
    // Set up periodic checking (every 30 seconds)
    const interval = setInterval(loadSmartNotifications, 30000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  // Regular notifications (your existing ones)
  const regularNotifications = [
    { 
      id: 1, 
      message: 'New order received', 
      time: '5 minutes ago', 
      unread: true, 
      type: 'order',
      icon: Bell,
      color: 'text-blue-500'
    },
    { 
      id: 2, 
      message: 'Low stock alert: Product ABC', 
      time: '1 hour ago', 
      unread: true, 
      type: 'stock',
      icon: AlertTriangle,
      color: 'text-amber-500'
    },
    { 
      id: 3, 
      message: 'Supplier updated catalog', 
      time: '2 hours ago', 
      unread: false, 
      type: 'update',
      icon: Package,
      color: 'text-gray-500'
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
  const highPriorityCount = smartNotifications.filter(n => n.priority === 'high').length;

  // Enhanced notification badge styling
  const getNotificationBadgeStyle = () => {
    if (highPriorityCount > 0) {
      return "absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse font-medium";
    }
    if (unreadCount > 0) {
      return "absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-400 ring-2 ring-white";
    }
    return "";
  };

  const handleNotificationClick = (notification) => {
    // Mark as read
    if (notification.type === 'delivery' || notification.type === 'payment') {
      NotificationManager.success('Navigating to Smart Notifications dashboard', {
        title: 'Opening Notifications...'
      });
      navigate('/notifications');
    }
    setShowNotifications(false);
  };

  const handleViewAllNotifications = () => {
    NotificationManager.ai('Opening comprehensive notifications dashboard with smart insights', {
      title: '🚀 Loading Smart Dashboard'
    });
    navigate('/notifications');
    setShowNotifications(false);
  };

  return (
    <header className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Menu button and Title */}
          <div className="flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            <div className="ml-4 lg:ml-0 flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <span className="text-white font-bold text-sm">HF</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                HiggsFlow
              </h1>
            </div>
          </div>

          {/* Right side - Enhanced Notifications and User menu */}
          <div className="flex items-center space-x-4">
            {/* Enhanced Notifications */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full transition-colors"
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className={getNotificationBadgeStyle()}>
                    {highPriorityCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : ''}
                  </span>
                )}
              </button>

              {/* Enhanced Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 backdrop-blur-sm">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </h3>
                    <button 
                      onClick={handleViewAllNotifications}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      View all
                    </button>
                  </div>

                  {/* Priority Alert Banner */}
                  {highPriorityCount > 0 && (
                    <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 border-b border-red-100">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700">
                          {highPriorityCount} urgent alert{highPriorityCount > 1 ? 's' : ''} requiring attention
                        </span>
                        <Brain className="h-4 w-4 text-purple-500 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto">
                    {allNotifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">All caught up!</p>
                        <p className="text-xs text-gray-400 mt-1">No notifications at the moment</p>
                      </div>
                    ) : (
                      allNotifications.slice(0, 8).map(notification => {
                        const Icon = notification.icon || Bell;
                        return (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-l-4 transition-all ${
                              notification.unread ? 'bg-blue-50/50' : ''
                            } ${
                              notification.priority === 'high' ? 'border-l-red-500 hover:bg-red-50/30' :
                              notification.priority === 'medium' ? 'border-l-amber-500 hover:bg-amber-50/30' :
                              'border-l-transparent'
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start space-x-3">
                              <Icon className={`h-5 w-5 mt-0.5 ${notification.color || 'text-gray-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-tight ${
                                  notification.unread ? 'font-medium text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-gray-500">{notification.time}</p>
                                  <div className="flex items-center space-x-1">
                                    {notification.priority === 'high' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                        Urgent
                                      </span>
                                    )}
                                    {notification.isNew && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 animate-pulse">
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
                    <div className="px-4 py-3 border-t border-gray-100 text-center">
                      <button 
                        onClick={handleViewAllNotifications}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        View all {allNotifications.length} notifications →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu - Keep existing */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center space-x-3 p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.email || 'User'}
                </span>
                <ChevronDown className="hidden md:block h-4 w-4 text-gray-400" />
              </button>

              {/* User Dropdown - Keep existing */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <User className="h-4 w-4" />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
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

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
