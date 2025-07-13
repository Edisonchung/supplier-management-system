// src/components/notifications/SmartNotifications.jsx
// SIMPLE TEST VERSION - No intervals, just basic display
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

const SmartNotifications = () => {
  const location = useLocation();

  console.log('🔍 SmartNotifications rendered, path:', location.pathname);

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800">🔍 Navigation Test</h3>
        <p className="text-sm text-yellow-700">Current path: {location.pathname}</p>
        <p className="text-xs text-yellow-600 mt-1">
          If you can see this and navigation works, the basic component is fine.
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-500" />
            Smart Notifications (Test Version)
          </h1>
          <p className="text-gray-600 mt-1">
            AI-powered alerts for your procurement workflows
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Alerts</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
            <Bell className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-red-600">0</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Payment Alerts</p>
              <p className="text-2xl font-bold text-amber-600">0</p>
            </div>
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Test Navigation */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Navigation Test</h3>
        <p className="text-gray-600 mb-4">
          Click on navigation items (Dashboard, Suppliers, etc.) to test if navigation works.
        </p>
        <div className="text-sm text-gray-500">
          <p>✅ If you can navigate away from this page, the issue is in the full component</p>
          <p>❌ If navigation is still blocked, the issue is in routing/layout</p>
        </div>
      </div>

      {/* Sample Notifications */}
      <div className="bg-white rounded-lg border">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sample Notifications</h3>
          
          <div className="space-y-4">
            <div className="border-l-4 border-l-red-500 bg-red-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Sample High Priority Alert</h4>
                  <p className="text-gray-600 mt-1">This is a test notification</p>
                </div>
              </div>
            </div>
            
            <div className="border-l-4 border-l-blue-500 bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">Sample Info Alert</h4>
                  <p className="text-gray-600 mt-1">This is another test notification</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartNotifications;
