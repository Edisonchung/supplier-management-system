// src/components/common/Notification.jsx - Enhanced with Smart Procurement Types
import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  X, 
  Info,
  Loader2,
  Bell,
  Zap,
  Users,
  Brain,
  DollarSign,
  Package,
  Clock,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

const Notification = ({ 
  message, 
  type = 'success', 
  onClose, 
  duration = 5000,
  title = null,
  action = null,
  persistent = false,
  position = 'bottom-right'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [onClose, duration, persistent]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'team':
        return <Users className="w-5 h-5 text-purple-500" />;
      case 'ai':
        return <Brain className="w-5 h-5 text-purple-500" />;
      case 'system':
        return <Bell className="w-5 h-5 text-gray-500" />;
      case 'feature':
        return <Zap className="w-5 h-5 text-indigo-500" />;
      // 🆕 NEW: Smart Procurement Types
      case 'delivery':
        return <Package className="w-5 h-5 text-orange-500" />;
      case 'payment':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'overdue':
        return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'urgent':
        return <Clock className="w-5 h-5 text-red-600 animate-bounce" />;
      case 'procurement':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStyles = () => {
    const baseStyles = "backdrop-blur-sm border shadow-lg";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50/95 border-green-200/50 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50/95 border-red-200/50 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50/95 border-yellow-200/50 text-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50/95 border-blue-200/50 text-blue-800`;
      case 'loading':
        return `${baseStyles} bg-blue-50/95 border-blue-200/50 text-blue-800`;
      case 'team':
        return `${baseStyles} bg-purple-50/95 border-purple-200/50 text-purple-800`;
      case 'ai':
        return `${baseStyles} bg-gradient-to-r from-purple-50/95 to-blue-50/95 border-purple-200/50 text-purple-800`;
      case 'system':
        return `${baseStyles} bg-gray-50/95 border-gray-200/50 text-gray-800`;
      case 'feature':
        return `${baseStyles} bg-indigo-50/95 border-indigo-200/50 text-indigo-800`;
      // 🆕 NEW: Smart Procurement Styles
      case 'delivery':
        return `${baseStyles} bg-orange-50/95 border-orange-200/50 text-orange-800`;
      case 'payment':
        return `${baseStyles} bg-emerald-50/95 border-emerald-200/50 text-emerald-800`;
      case 'overdue':
        return `${baseStyles} bg-gradient-to-r from-red-50/95 to-pink-50/95 border-red-300/50 text-red-900 shadow-red-100`;
      case 'urgent':
        return `${baseStyles} bg-gradient-to-r from-red-100/95 to-orange-100/95 border-red-400/50 text-red-900 shadow-red-200`;
      case 'procurement':
        return `${baseStyles} bg-gradient-to-r from-blue-50/95 to-cyan-50/95 border-blue-200/50 text-blue-800`;
      default:
        return `${baseStyles} bg-blue-50/95 border-blue-200/50 text-blue-800`;
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
      default:
        return 'bottom-4 right-4';
    }
  };

  const getAnimationClass = () => {
    if (!isVisible) return 'opacity-0';
    if (isLeaving) return 'animate-slide-out';
    return 'animate-slide-in';
  };

  const isUrgentType = () => {
    return ['overdue', 'urgent', 'error'].includes(type);
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed z-50 ${getPositionStyles()} ${getAnimationClass()}`}>
      <div className={`flex flex-col gap-1 px-4 py-3 rounded-xl ${getStyles()} min-w-[320px] max-w-[480px] shadow-xl ${
        isUrgentType() ? 'ring-2 ring-red-200 ring-opacity-50' : ''
      }`}>
        {/* Header with icon and close button */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className={`text-sm font-semibold mb-1 leading-tight ${
                isUrgentType() ? 'text-red-900' : ''
              }`}>
                {title}
              </h4>
            )}
            <p className={`${title ? 'text-sm' : 'text-sm font-medium'} leading-relaxed`}>
              {message}
            </p>
          </div>

          {!persistent && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 hover:bg-white/30 rounded-md transition-colors ml-2"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action button if provided */}
        {action && (
          <div className="mt-2 flex justify-end">
            <button
              onClick={() => {
                action.onClick();
                if (!action.keepOpen) handleClose();
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                type === 'success' ? 'bg-green-200/50 hover:bg-green-200/70 text-green-900' :
                type === 'error' ? 'bg-red-200/50 hover:bg-red-200/70 text-red-900' :
                type === 'warning' ? 'bg-yellow-200/50 hover:bg-yellow-200/70 text-yellow-900' :
                type === 'team' ? 'bg-purple-200/50 hover:bg-purple-200/70 text-purple-900' :
                type === 'ai' ? 'bg-purple-200/50 hover:bg-purple-200/70 text-purple-900' :
                type === 'delivery' ? 'bg-orange-200/50 hover:bg-orange-200/70 text-orange-900' :
                type === 'payment' ? 'bg-emerald-200/50 hover:bg-emerald-200/70 text-emerald-900' :
                type === 'overdue' ? 'bg-red-300/50 hover:bg-red-300/70 text-red-900 font-semibold' :
                type === 'urgent' ? 'bg-red-300/50 hover:bg-red-300/70 text-red-900 font-semibold' :
                type === 'procurement' ? 'bg-blue-200/50 hover:bg-blue-200/70 text-blue-900' :
                'bg-blue-200/50 hover:bg-blue-200/70 text-blue-900'
              }`}
            >
              {action.label}
            </button>
          </div>
        )}

        {/* Progress bar for timed notifications */}
        {!persistent && duration > 0 && (
          <div className="mt-2 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full opacity-30 animate-shrink ${
                isUrgentType() ? 'bg-red-400' : 'bg-current'
              }`}
              style={{ 
                animationDuration: `${duration}ms`,
                animationTimingFunction: 'linear'
              }}
            />
          </div>
        )}

        {/* Urgent pulse indicator */}
        {isUrgentType() && (
          <div className="absolute -inset-1 bg-gradient-to-r from-red-400 to-pink-400 rounded-xl opacity-20 animate-pulse -z-10"></div>
        )}
      </div>
    </div>
  );
};

// Enhanced Notification Manager with Smart Procurement Types
export class NotificationManager {
  static notifications = [];
  static listeners = [];

  static show(message, options = {}) {
    const notification = {
      id: Date.now() + Math.random(),
      message,
      type: options.type || 'success',
      title: options.title,
      duration: options.duration || 5000,
      action: options.action,
      persistent: options.persistent || false,
      position: options.position || 'bottom-right',
      timestamp: new Date()
    };

    this.notifications.push(notification);
    this.notifyListeners();

    return notification.id;
  }

  static dismiss(id) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  static dismissAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  static addListener(callback) {
    this.listeners.push(callback);
  }

  static removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  static notifyListeners() {
    this.listeners.forEach(listener => listener(this.notifications));
  }

  // Existing notification methods
  static success(message, options = {}) {
    return this.show(message, { ...options, type: 'success' });
  }

  static error(message, options = {}) {
    return this.show(message, { ...options, type: 'error' });
  }

  static warning(message, options = {}) {
    return this.show(message, { ...options, type: 'warning' });
  }

  static info(message, options = {}) {
    return this.show(message, { ...options, type: 'info' });
  }

  static team(message, options = {}) {
    return this.show(message, { ...options, type: 'team' });
  }

  static ai(message, options = {}) {
    return this.show(message, { ...options, type: 'ai' });
  }

  static loading(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'loading', 
      persistent: true,
      duration: 0 
    });
  }

  static feature(message, options = {}) {
    return this.show(message, { ...options, type: 'feature' });
  }

  // 🆕 NEW: Smart Procurement Notification Methods
  static delivery(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'delivery',
      duration: options.duration || 6000
    });
  }

  static payment(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'payment',
      duration: options.duration || 6000
    });
  }

  static overdue(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'overdue',
      duration: options.duration || 8000,
      position: options.position || 'top-right' // More prominent position for urgent items
    });
  }

  static urgent(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'urgent',
      duration: options.duration || 10000,
      position: options.position || 'top-right'
    });
  }

  static procurement(message, options = {}) {
    return this.show(message, { 
      ...options, 
      type: 'procurement',
      duration: options.duration || 5000
    });
  }

  // 🆕 NEW: Smart Procurement Helper Methods
  static deliveryOverdue(poNumber, daysOverdue, options = {}) {
    return this.overdue(
      `PO ${poNumber} delivery is ${daysOverdue} days overdue`,
      {
        title: '🚨 Delivery Overdue',
        action: {
          label: 'Contact Supplier',
          onClick: options.onContactSupplier || (() => {})
        },
        ...options
      }
    );
  }

  static paymentDue(amount, daysUntilDue, options = {}) {
    const urgency = daysUntilDue <= 0 ? 'urgent' : 'payment';
    const title = daysUntilDue <= 0 ? '🚨 Payment Overdue' : '💰 Payment Due Soon';
    
    return this[urgency](
      `Payment of $${amount.toLocaleString()} ${daysUntilDue <= 0 ? 'is overdue' : `due in ${daysUntilDue} days`}`,
      {
        title,
        action: {
          label: daysUntilDue <= 0 ? 'Pay Now' : 'Schedule Payment',
          onClick: options.onPaymentAction || (() => {})
        },
        ...options
      }
    );
  }

  static smartSummary(alertCount, options = {}) {
    return this.ai(
      `Found ${alertCount} urgent procurement alerts requiring immediate attention`,
      {
        title: '🧠 Smart Procurement Alert',
        action: {
          label: 'Review All Alerts',
          onClick: options.onReviewAll || (() => {})
        },
        duration: 8000,
        ...options
      }
    );
  }
}

// Enhanced hook with new procurement methods
export const useNotifications = () => {
  const [notifications, setNotifications] = useState(NotificationManager.notifications);

  useEffect(() => {
    const handleUpdate = (updatedNotifications) => {
      setNotifications([...updatedNotifications]);
    };

    NotificationManager.addListener(handleUpdate);
    return () => NotificationManager.removeListener(handleUpdate);
  }, []);

  return {
    notifications,
    show: NotificationManager.show.bind(NotificationManager),
    dismiss: NotificationManager.dismiss.bind(NotificationManager),
    dismissAll: NotificationManager.dismissAll.bind(NotificationManager),
    success: NotificationManager.success.bind(NotificationManager),
    error: NotificationManager.error.bind(NotificationManager),
    warning: NotificationManager.warning.bind(NotificationManager),
    info: NotificationManager.info.bind(NotificationManager),
    team: NotificationManager.team.bind(NotificationManager),
    ai: NotificationManager.ai.bind(NotificationManager),
    loading: NotificationManager.loading.bind(NotificationManager),
    feature: NotificationManager.feature.bind(NotificationManager),
    // 🆕 NEW: Smart Procurement Methods
    delivery: NotificationManager.delivery.bind(NotificationManager),
    payment: NotificationManager.payment.bind(NotificationManager),
    overdue: NotificationManager.overdue.bind(NotificationManager),
    urgent: NotificationManager.urgent.bind(NotificationManager),
    procurement: NotificationManager.procurement.bind(NotificationManager),
    deliveryOverdue: NotificationManager.deliveryOverdue.bind(NotificationManager),
    paymentDue: NotificationManager.paymentDue.bind(NotificationManager),
    smartSummary: NotificationManager.smartSummary.bind(NotificationManager)
  };
};

export default Notification;
