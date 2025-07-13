// src/components/notifications/SmartNotifications.jsx
// MINIMAL VERSION - Remove all potential blocking code
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CheckCircle, DollarSign } from 'lucide-react';

const SmartNotifications = () => {
  const location = useLocation();

  // Log when component renders/unmounts
  React.useEffect(() => {
    console.log('🔔 SmartNotifications mounted');
    
    return () => {
      console.log('🧹 SmartNotifications unmounting');
    };
  }, []);

  // Track location changes
  React.useEffect(() => {
    console.log('🔔 SmartNotifications sees location:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800">🔍 Navigation Test Mode</h3>
        <p className="text-sm text-blue-700">Current path: {location.pathname}</p>
        <p className="text-xs text-blue-600 mt-1">
          This is a minimal version with no intervals, no localStorage, no complex state.
        </p>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-6 w-6 text-blue-500" />
          Smart Notifications
        </h1>
        <p className="text-gray-600 mt-1">
          AI-powered alerts for your procurement workflows
        </p>
      </div>

      {/* Quick Stats - Static Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-red-600">1</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Payment Alerts</p>
              <p className="text-2xl font-bold text-amber-600">2</p>
            </div>
            <DollarSign className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Sample Notifications - Static */}
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Notifications</h3>
          
          <div className="space-y-4">
            <div className="border-l-4 border-l-red-500 bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">Delivery Overdue</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      HIGH
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">PO #12345 is 3 days overdue</p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Contact Supplier
                    </button>
                    <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                      Update Timeline
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-l-4 border-l-amber-500 bg-amber-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">Payment Due Soon</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      MEDIUM
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">Payment of $5,000 due in 2 days</p>
                  <div className="flex gap-2 mt-3">
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                      Process Payment
                    </button>
                    <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
                      Schedule Payment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-l-4 border-l-blue-500 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">Delivery Confirmed</h4>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      LOW
                    </span>
                  </div>
                  <p className="text-gray-600 mt-1">PO #12346 delivered successfully</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Test */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">🧪 Navigation Test</h3>
        <p className="text-sm text-yellow-700 mb-3">
          Try clicking navigation items. If they work, the issue was in the complex component.
          If they still don't work, there's a deeper routing issue.
        </p>
        <div className="text-xs text-yellow-600">
          <p>✅ Navigation works → Issue was in intervals/localStorage/complex state</p>
          <p>❌ Navigation still blocked → Deeper routing or React issue</p>
        </div>
      </div>
    </div>
  );
};

export default SmartNotifications;
