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
              message: `Payment of ${payment.totalAmount?.toLocaleString() || '0'} due ${daysUntilDue === 0 ? 'today' : `in ${daysUntilDue} days`}`,
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

export default Header;
