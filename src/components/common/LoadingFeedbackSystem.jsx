// src/components/common/LoadingFeedbackSystem.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info, X, Wifi, WifiOff, Loader2, Users, Clock } from 'lucide-react';

// Loading & Feedback Context
const LoadingFeedbackContext = createContext();

export const useLoadingFeedback = () => {
  const context = useContext(LoadingFeedbackContext);
  if (!context) {
    throw new Error('useLoadingFeedback must be used within LoadingFeedbackProvider');
  }
  return context;
};

// Main Provider Component
export const LoadingFeedbackProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [activeUsers, setActiveUsers] = useState([]);
  const [pendingOperations, setPendingOperations] = useState([]);

  // Add notification
  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = { id, ...notification, timestamp: new Date() };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove success notifications
    if (notification.type === 'success' && !notification.persistent) {
      setTimeout(() => removeNotification(id), notification.duration || 3000);
    }

    return id;
  };

  // Remove notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Show loading state
  const startLoading = (operation) => {
    const id = Date.now() + Math.random();
    setPendingOperations(prev => [...prev, { id, ...operation, startTime: new Date() }]);
    return id;
  };

  // Hide loading state
  const stopLoading = (id) => {
    setPendingOperations(prev => prev.filter(op => op.id !== id));
  };

  // Simulate connection status changes (for demo)
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('connected');
    const handleOffline = () => setConnectionStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = {
    notifications,
    connectionStatus,
    activeUsers,
    pendingOperations,
    addNotification,
    removeNotification,
    startLoading,
    stopLoading,
    setConnectionStatus,
    setActiveUsers
  };

  return (
    <LoadingFeedbackContext.Provider value={value}>
      {children}
      <NotificationContainer />
      <ConnectionStatusBar />
      <LoadingOverlay />
    </LoadingFeedbackContext.Provider>
  );
};

// Notification Toast Component
const NotificationToast = ({ notification, onRemove }) => {
  const { type, title, message, actions } = notification;
  
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const icons = {
    success: CheckCircle,
    error: AlertTriangle,
    warning: AlertTriangle,
    info: Info
  };

  const Icon = icons[type];

  return (
    <div className={`border rounded-lg p-4 shadow-lg ${styles[type]} transition-all duration-300 transform translate-x-0`}>
      <div className="flex items-start space-x-3">
        <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium">{title}</h4>
          {message && <p className="text-sm mt-1 opacity-90">{message}</p>}
          
          {actions && (
            <div className="mt-3 flex space-x-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <button
          onClick={() => onRemove(notification.id)}
          className="p-1 hover:bg-white/20 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Notification Container
const NotificationContainer = () => {
  const { notifications, removeNotification } = useLoadingFeedback();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 w-96 max-w-[calc(100vw-2rem)]">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

// Connection Status Bar
const ConnectionStatusBar = () => {
  const { connectionStatus, activeUsers, pendingOperations } = useLoadingFeedback();

  const statusConfig = {
    connected: {
      icon: Wifi,
      text: 'Connected',
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    connecting: {
      icon: Loader2,
      text: 'Reconnecting...',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    },
    offline: {
      icon: WifiOff,
      text: 'Offline',
      color: 'text-red-600',
      bg: 'bg-red-50'
    }
  };

  const config = statusConfig[connectionStatus];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border shadow-sm ${config.bg} ${config.color}`}>
        <Icon className={`w-4 h-4 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{config.text}</span>
        
        {activeUsers.length > 0 && (
          <>
            <div className="w-px h-4 bg-current opacity-30 mx-2" />
            <Users className="w-4 h-4" />
            <span className="text-xs">{activeUsers.length}</span>
          </>
        )}
        
        {pendingOperations.length > 0 && connectionStatus === 'offline' && (
          <>
            <div className="w-px h-4 bg-current opacity-30 mx-2" />
            <Clock className="w-4 h-4" />
            <span className="text-xs">{pendingOperations.length} queued</span>
          </>
        )}
      </div>
    </div>
  );
};

// Loading Overlay for full-screen operations
const LoadingOverlay = () => {
  const { pendingOperations } = useLoadingFeedback();
  
  const fullScreenOperations = pendingOperations.filter(op => op.fullScreen);
  
  if (fullScreenOperations.length === 0) return null;

  const currentOperation = fullScreenOperations[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {currentOperation.title}
        </h3>
        {currentOperation.message && (
          <p className="text-sm text-gray-600">{currentOperation.message}</p>
        )}
      </div>
    </div>
  );
};

// Skeleton Loading Component
export const SkeletonLoader = ({ type = 'card', count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        );
      
      case 'table-row':
        return (
          <tr className="animate-pulse">
            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-16"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-24"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-20"></div></td>
            <td className="px-6 py-4"><div className="h-4 bg-gray-200 rounded w-12"></div></td>
          </tr>
        );
      
      case 'form':
        return (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        );
      
      default:
        return <div className="h-4 bg-gray-200 rounded animate-pulse"></div>;
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={count > 1 ? 'mb-4' : ''}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
};

// Real-time Status Indicator Component
export const RealtimeStatusIndicator = ({ status, lastUpdated, size = 'sm' }) => {
  const statusConfig = {
    synced: { color: 'bg-green-400', text: 'Synced' },
    syncing: { color: 'bg-blue-400', text: 'Syncing' },
    error: { color: 'bg-red-400', text: 'Error' },
    offline: { color: 'bg-yellow-400', text: 'Offline' }
  };

  const config = statusConfig[status] || statusConfig.synced;
  const sizeClasses = size === 'sm' ? 'w-2 h-2' : 'w-3 h-3';

  return (
    <div className="flex items-center space-x-2">
      <div className={`${sizeClasses} ${config.color} rounded-full ${status === 'syncing' ? 'animate-pulse' : ''}`} />
      <span className="text-xs text-gray-500">{config.text}</span>
      {lastUpdated && (
        <span className="text-xs text-gray-400">
          {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

// User Presence Component
export const UserPresence = ({ users = [], currentUser }) => {
  if (!users.length) return null;

  return (
    <div className="flex items-center space-x-2">
      <span className="text-xs text-gray-500">Online:</span>
      <div className="flex -space-x-2">
        {users.slice(0, 3).map(user => (
          <div
            key={user.id}
            className="relative w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white"
            title={user.name}
          >
            {user.name?.[0]?.toUpperCase()}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
          </div>
        ))}
        {users.length > 3 && (
          <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
            +{users.length - 3}
          </div>
        )}
      </div>
    </div>
  );
};

// Hook for easy notification usage
export const useNotifications = () => {
  const { addNotification, removeNotification } = useLoadingFeedback();

  const showSuccess = (title, message, options = {}) => {
    return addNotification({ type: 'success', title, message, ...options });
  };

  const showError = (title, message, options = {}) => {
    return addNotification({ type: 'error', title, message, persistent: true, ...options });
  };

  const showWarning = (title, message, options = {}) => {
    return addNotification({ type: 'warning', title, message, ...options });
  };

  const showInfo = (title, message, options = {}) => {
    return addNotification({ type: 'info', title, message, ...options });
  };

  return { showSuccess, showError, showWarning, showInfo, removeNotification };
};

// Hook for loading states
export const useLoadingStates = () => {
  const { startLoading, stopLoading } = useLoadingFeedback();

  const withLoading = async (operation, options = {}) => {
    const loadingId = startLoading({
      title: options.title || 'Loading...',
      message: options.message,
      fullScreen: options.fullScreen || false
    });

    try {
      const result = await operation();
      stopLoading(loadingId);
      return result;
    } catch (error) {
      stopLoading(loadingId);
      throw error;
    }
  };

  return { withLoading, startLoading, stopLoading };
};
