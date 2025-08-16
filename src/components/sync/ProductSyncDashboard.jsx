// src/components/sync/ProductSyncDashboard.jsx
// Dashboard for monitoring and controlling Product Sync Service

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  BarChart3,
  Settings,
  Eye,
  Zap,
  Database,
  ArrowRightLeft,
  Image,
  TrendingUp
} from 'lucide-react';
import { initializeProductSync, useProductSyncStatus } from '../../services/sync/ProductSyncService';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

const ProductSyncDashboard = () => {
  const [syncService, setSyncService] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const syncStatus = useProductSyncStatus(syncService);

  // Load initial data
  useEffect(() => {
    loadHealthData();
    loadRecentActivity();
    
    // Check if sync service is already running
    if (window.productSyncService) {
      setSyncService(window.productSyncService);
    }
  }, []);

  const loadHealthData = async () => {
    try {
      // Get collection counts
      const internalProducts = await getDocs(collection(db, 'products'));
      const ecommerceProducts = await getDocs(collection(db, 'products_public'));
      
      // Get sync statistics
      const syncLogs = await getDocs(
        query(collection(db, 'product_sync_log'), orderBy('syncedAt', 'desc'), limit(100))
      );
      
      const successfulSyncs = syncLogs.docs.filter(doc => doc.data().syncStatus === 'success').length;
      const failedSyncs = syncLogs.docs.filter(doc => doc.data().syncStatus === 'failed').length;
      
      setHealthData({
        internalCount: internalProducts.size,
        ecommerceCount: ecommerceProducts.size,
        syncCoverage: internalProducts.size > 0 ? (ecommerceProducts.size / internalProducts.size * 100) : 0,
        totalSyncOps: syncLogs.size,
        successfulSyncs,
        failedSyncs,
        lastUpdate: new Date()
      });
      
    } catch (error) {
      console.error('Error loading health data:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const syncLogs = await getDocs(
        query(collection(db, 'product_sync_log'), orderBy('syncedAt', 'desc'), limit(10))
      );
      
      const activities = syncLogs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        syncedAt: doc.data().syncedAt?.toDate() || new Date()
      }));
      
      setRecentActivity(activities);
      
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const startSyncService = async () => {
    setIsStarting(true);
    try {
      const service = await initializeProductSync();
      setSyncService(service);
      
      // Refresh data after starting
      setTimeout(() => {
        loadHealthData();
        loadRecentActivity();
      }, 2000);
      
    } catch (error) {
      console.error('Failed to start sync service:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const stopSyncService = async () => {
    if (syncService) {
      await syncService.stopSync();
      setSyncService(null);
      window.productSyncService = null;
    }
  };

  const refreshData = () => {
    loadHealthData();
    loadRecentActivity();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <AlertCircle size={16} className="text-red-600" />;
      case 'pending': return <Clock size={16} className="text-yellow-600" />;
      default: return <RefreshCw size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ArrowRightLeft className="mr-3 text-blue-600" size={32} />
                Product Sync Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Real-time synchronization between internal products and e-commerce catalog
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshData}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </button>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Settings size={16} className="mr-2" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Sync Service Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sync Service</p>
                <p className={`text-2xl font-bold ${syncStatus?.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                  {syncStatus?.isRunning ? 'Running' : 'Stopped'}
                </p>
              </div>
              <div className={`p-3 rounded-full ${syncStatus?.isRunning ? 'bg-green-100' : 'bg-red-100'}`}>
                {syncStatus?.isRunning ? 
                  <Play className="text-green-600" size={24} /> : 
                  <Pause className="text-red-600" size={24} />
                }
              </div>
            </div>
            
            <div className="mt-4">
              {!syncService ? (
                <button
                  onClick={startSyncService}
                  disabled={isStarting}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isStarting ? 'Starting...' : 'Start Sync Service'}
                </button>
              ) : (
                <button
                  onClick={stopSyncService}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Stop Sync Service
                </button>
              )}
            </div>
          </div>

          {/* Product Counts */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Product Collections</p>
                <p className="text-2xl font-bold text-blue-600">
                  {healthData?.internalCount || 0} → {healthData?.ecommerceCount || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Database className="text-blue-600" size={24} />
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              <span>Internal: {healthData?.internalCount || 0}</span><br />
              <span>E-commerce: {healthData?.ecommerceCount || 0}</span>
            </div>
          </div>

          {/* Sync Coverage */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sync Coverage</p>
                <p className="text-2xl font-bold text-purple-600">
                  {healthData?.syncCoverage?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="text-purple-600" size={24} />
              </div>
            </div>
            
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, healthData?.syncCoverage || 0)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Queue Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Queue Status</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(syncStatus?.queueLength || 0) + (syncStatus?.imageQueueLength || 0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Clock className="text-orange-600" size={24} />
              </div>
            </div>
            
            <div className="mt-2 text-sm text-gray-600">
              <span>Sync: {syncStatus?.queueLength || 0}</span><br />
              <span>Images: {syncStatus?.imageQueueLength || 0}</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Real-time Stats */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Zap className="mr-2 text-yellow-500" size={20} />
                Real-time Statistics
              </h3>
            </div>
            
            <div className="p-6">
              {syncStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Synced</span>
                    <span className="font-semibold">{syncStatus.totalSynced}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Successful</span>
                    <span className="font-semibold text-green-600">{syncStatus.successCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Failed</span>
                    <span className="font-semibold text-red-600">{syncStatus.errorCount}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Listeners</span>
                    <span className="font-semibold text-blue-600">{syncStatus.activeListeners}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Processing Images</span>
                    <span className={`font-semibold ${syncStatus.processingImages ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {syncStatus.processingImages ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  {syncStatus.lastSyncTime && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Sync</span>
                      <span className="font-semibold text-purple-600">
                        {new Date(syncStatus.lastSyncTime).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Sync service not running
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Eye className="mr-2 text-blue-500" size={20} />
                Recent Sync Activity
              </h3>
            </div>
            
            <div className="p-6">
              {recentActivity.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(activity.syncStatus)}
                        <div>
                          <p className="font-medium text-sm">
                            {activity.syncType?.toUpperCase()} - {activity.metadata?.productName || 'Product'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {activity.syncedAt.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className={`text-sm font-medium ${getStatusColor(activity.syncStatus)}`}>
                          {activity.syncStatus}
                        </span>
                        {activity.processingTime && (
                          <p className="text-xs text-gray-500">
                            {activity.processingTime}ms
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No recent sync activity
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sync Health Overview */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart3 className="mr-2 text-green-500" size={20} />
              Sync Health Overview
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Success Rate */}
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {healthData?.totalSyncOps > 0 
                    ? ((healthData.successfulSyncs / healthData.totalSyncOps) * 100).toFixed(1)
                    : '0'
                  }%
                </div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-xs text-gray-500 mt-1">
                  {healthData?.successfulSyncs || 0} of {healthData?.totalSyncOps || 0} operations
                </p>
              </div>
              
              {/* Data Consistency */}
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {healthData?.syncCoverage?.toFixed(1) || '0'}%
                </div>
                <p className="text-sm text-gray-600">Data Consistency</p>
                <p className="text-xs text-gray-500 mt-1">
                  E-commerce products vs Internal products
                </p>
              </div>
              
              {/* Error Rate */}
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">
                  {healthData?.totalSyncOps > 0 
                    ? ((healthData.failedSyncs / healthData.totalSyncOps) * 100).toFixed(1)
                    : '0'
                  }%
                </div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-xs text-gray-500 mt-1">
                  {healthData?.failedSyncs || 0} failed operations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproducts', '_blank')}
                className="flex items-center justify-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <Database className="mr-2 text-blue-600" size={20} />
                View Internal Products
              </button>
              
              <button
                onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproducts_public', '_blank')}
                className="flex items-center justify-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <Database className="mr-2 text-green-600" size={20} />
                View E-commerce Products
              </button>
              
              <button
                onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproduct_sync_log', '_blank')}
                className="flex items-center justify-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <BarChart3 className="mr-2 text-purple-600" size={20} />
                View Sync Logs
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mt-8 bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Settings className="mr-2" size={20} />
                Sync Configuration
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    defaultValue="10"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of products per batch"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Number of products to sync in each batch operation
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retry Attempts
                  </label>
                  <input
                    type="number"
                    defaultValue="3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Number of retry attempts"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How many times to retry failed sync operations
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI Image Generation
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="auto">Automatic</option>
                    <option value="manual">Manual Only</option>
                    <option value="disabled">Disabled</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    When to generate AI product images
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sync Frequency
                  </label>
                  <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                    <option value="realtime">Real-time</option>
                    <option value="5min">Every 5 minutes</option>
                    <option value="15min">Every 15 minutes</option>
                    <option value="1hour">Every hour</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    How often to check for product changes
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex items-center space-x-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  Save Settings
                </button>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Last updated: {healthData?.lastUpdate?.toLocaleTimeString() || 'Never'}
          {syncStatus?.isRunning && (
            <span className="ml-4 text-green-600">
              ● Sync service active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductSyncDashboard;
