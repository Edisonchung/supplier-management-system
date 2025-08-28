// src/components/mcp/ImageGenerationDashboard.jsx
// Fixed version using actual ProductSyncService data instead of mock data

import React, { useState, useEffect } from 'react';
import {
  Image,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  BarChart3,
  Eye,
  Download,
  Settings,
  Loader,
  TrendingUp,
  Activity,
  FileImage,
  Palette,
  X,
  ExternalLink,
  Filter,
  Search
} from 'lucide-react';
import { productSyncService } from '../../services/sync/ProductSyncService';

const ImageGenerationDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load real data from ProductSyncService
      const [statsData, healthData, logsData] = await Promise.all([
        fetchRealImageStats(),
        fetchSystemHealth(),
        fetchImageGenerationLogs()
      ]);
      
      setStats(statsData);
      setSystemHealth(healthData);
      setSyncLogs(logsData);
      setRecentGenerations(logsData); // Use real logs instead of artificial data
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRealImageStats = async () => {
    try {
      // Get actual sync statistics including image data
      const syncStats = await productSyncService.getSyncStatistics();
      const products = await productSyncService.getInternalProductsWithSyncStatus();
      
      const allProducts = products.data || [];
      const productsWithImages = allProducts.filter(p => p.hasImages);
      const todayProducts = allProducts.filter(p => {
        const syncDate = new Date(p.lastSyncDate);
        const today = new Date();
        return syncDate.toDateString() === today.toDateString() && p.hasImages;
      });

      // Calculate real category distribution
      const categoryStats = {};
      productsWithImages.forEach(product => {
        const category = product.category || 'uncategorized';
        categoryStats[category] = (categoryStats[category] || 0) + 1;
      });

      const totalWithImages = productsWithImages.length;
      const topCategories = Object.entries(categoryStats)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalWithImages > 0 ? ((count / totalWithImages) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      // Calculate real provider distribution
      const providerStats = {};
      productsWithImages.forEach(product => {
        const provider = product.imageProvider || 'unknown';
        if (!providerStats[provider]) {
          providerStats[provider] = { count: 0, totalTime: 0, times: [] };
        }
        providerStats[provider].count++;
        if (product.imageProcessingTime) {
          providerStats[provider].totalTime += parseFloat(product.imageProcessingTime);
          providerStats[provider].times.push(parseFloat(product.imageProcessingTime));
        }
      });

      // Calculate averages and percentages for providers
      Object.keys(providerStats).forEach(provider => {
        const data = providerStats[provider];
        data.percentage = totalWithImages > 0 ? ((data.count / totalWithImages) * 100).toFixed(1) : 0;
        data.avgTime = data.times.length > 0 ? (data.totalTime / data.times.length).toFixed(1) : 0;
      });

      return {
        totalGenerated: syncStats.data?.totalImagesGenerated || productsWithImages.length,
        generatedToday: syncStats.data?.todayGenerated || todayProducts.length,
        pendingQueue: syncStats.data?.imageQueueLength || 0,
        successRate: syncStats.data?.imageSuccessRate || 
          (totalWithImages > 0 ? ((productsWithImages.filter(p => p.imageStatus === 'completed').length / totalWithImages) * 100).toFixed(1) : 0),
        averageTime: syncStats.data?.averageImageTime || 
          (productsWithImages.length > 0 ? 
            productsWithImages
              .filter(p => p.imageProcessingTime)
              .reduce((sum, p) => sum + parseFloat(p.imageProcessingTime), 0) / 
            productsWithImages.filter(p => p.imageProcessingTime).length 
          : 0),
        topCategories,
        providerStats
      };
    } catch (error) {
      console.error('Failed to fetch real image stats:', error);
      throw error;
    }
  };

  const fetchImageGenerationLogs = async () => {
    try {
      // Get actual image generation logs from your ProductSyncService
      const logs = await productSyncService.getImageGenerationLogs?.() || [];
      
      if (logs.length > 0) {
        // Use real logs if available
        return logs.map(log => ({
          id: log.id || log.productId,
          productId: log.productId,
          productName: log.productName,
          category: log.category,
          imagesGenerated: log.imagesGenerated || [],
          status: log.status,
          provider: log.provider,
          processingTime: log.processingTime,
          timestamp: log.timestamp || log.createdAt,
          prompt: log.prompt,
          error: log.error,
          imageUrls: log.imageUrls || [],
          attempts: log.attempts || 1
        }));
      }
      
      // Fallback to products with image status if no dedicated logs exist
      const products = await productSyncService.getInternalProductsWithSyncStatus();
      return (products.data || [])
        .filter(p => p.imageStatus && p.imageStatus !== 'not_generated')
        .map(product => ({
          id: product.id,
          productId: product.id,
          productName: product.name,
          category: product.category,
          imagesGenerated: product.generatedImageTypes || (product.hasImages ? ['primary'] : []),
          status: product.imageStatus,
          provider: product.imageProvider,
          processingTime: product.imageProcessingTime,
          timestamp: product.lastImageGeneration || product.lastSyncDate,
          prompt: product.lastUsedPrompt || `AI Generated - ${product.category}`,
          error: product.imageError,
          imageUrls: product.imageUrls || [],
          attempts: product.imageAttempts || 1
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50); // Get last 50 generations
        
    } catch (error) {
      console.error('Failed to fetch image generation logs:', error);
      return [];
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const health = await productSyncService.getImageGenerationHealth?.() || 
                    await productSyncService.getSyncHealth();
      
      return {
        mcpApiHealthy: health?.mcpApiHealthy ?? false,
        openaiAvailable: health?.imageGeneration?.available ?? !health?.imageGeneration?.error,
        promptsLoaded: await getActivePromptCount(),
        queueProcessing: health?.imageGeneration?.processing ?? false,
        lastCheck: new Date(),
        queueLength: health?.imageGeneration?.queueLength ?? 0,
        processingRate: health?.imageGeneration?.processingRate ?? 0
      };
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return {
        mcpApiHealthy: false,
        openaiAvailable: false,
        promptsLoaded: 0,
        queueProcessing: false,
        lastCheck: new Date(),
        queueLength: 0,
        processingRate: 0
      };
    }
  };

  const getActivePromptCount = async () => {
    try {
      // Get count of active image-related prompts
      const prompts = await productSyncService.getActivePrompts?.() || [];
      return prompts.filter(p => 
        p.category && p.category.includes('image') && p.isActive
      ).length;
    } catch (error) {
      return 0;
    }
  };

  const handleStartImageGeneration = async () => {
    setIsGenerating(true);
    try {
      console.log('Starting image generation...');
      
      // Use actual ProductSyncService method
      await productSyncService.startImageProcessor();
      
      showNotification('Image generation started successfully', 'success');
      
      // Refresh data after a delay
      setTimeout(() => {
        loadDashboardData();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to start image generation:', error);
      showNotification('Failed to start image generation: ' + error.message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryGeneration = async (productId) => {
    try {
      showNotification(`Retrying image generation for product ${productId}`, 'info');
      
      // Use actual retry method if available
      if (productSyncService.retryImageGeneration) {
        await productSyncService.retryImageGeneration(productId);
      } else {
        // Fallback: re-queue for processing
        await productSyncService.queueProductForImageGeneration(productId);
      }
      
      setTimeout(() => {
        loadDashboardData();
        showNotification('Product re-queued for image generation', 'success');
      }, 1000);
      
    } catch (error) {
      showNotification('Failed to retry generation: ' + error.message, 'error');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
      case 'pending':
      case 'queued':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'processing':
      case 'pending':
      case 'queued':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'failed':
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    if (typeof seconds === 'string') return seconds.includes('s') ? seconds : `${seconds}s`;
    return `${parseFloat(seconds).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const filteredGenerations = recentGenerations.filter(generation => {
    const matchesFilter = filter === 'all' || generation.status === filter;
    const matchesSearch = !searchTerm || generation.productName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">Loading image generation dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          notification.type === 'error' ? 'bg-red-100 border border-red-400 text-red-700' :
          'bg-blue-100 border border-blue-400 text-blue-700'
        }`}>
          <div className="flex items-center justify-between">
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileImage className="w-8 h-8 text-blue-600" />
            AI Image Generation Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Monitor and manage OpenAI-powered product image generation via MCP</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleStartImageGeneration}
            disabled={isGenerating || !systemHealth?.openaiAvailable}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Generation
              </>
            )}
          </button>
        </div>
      </div>

      {/* System Health Status */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            System Health
          </h3>
          <span className="text-xs text-gray-500">
            Last check: {systemHealth?.lastCheck?.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemHealth?.mcpApiHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">MCP API</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemHealth?.openaiAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">OpenAI DALL-E</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemHealth?.promptsLoaded > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">{systemHealth?.promptsLoaded} Prompts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemHealth?.queueProcessing ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm text-gray-700">Queue ({systemHealth?.queueLength || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-700">{systemHealth?.processingRate || 0}/min</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Generated</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.totalGenerated?.toLocaleString() || '0'}</p>
            </div>
            <FileImage className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Generated Today</p>
              <p className="text-2xl font-bold text-green-600">{stats?.generatedToday || 0}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.successRate}%</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Time</p>
              <p className="text-2xl font-bold text-orange-600">{formatTime(stats?.averageTime)}</p>
            </div>
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Real Categories and Provider Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Category Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-600" />
            Generation by Category (Actual)
          </h3>
          <div className="space-y-3">
            {stats?.topCategories?.length > 0 ? (
              stats.topCategories.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-blue-500' :
                      index === 1 ? 'bg-green-500' :
                      index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {category.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-blue-500' :
                          index === 1 ? 'bg-green-500' :
                          index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {category.count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No image generation data available yet</p>
            )}
          </div>
        </div>

        {/* Real Provider Performance */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-600" />
            Provider Performance (Actual)
          </h3>
          <div className="space-y-4">
            {Object.keys(stats?.providerStats || {}).length > 0 ? (
              Object.entries(stats.providerStats).map(([provider, data]) => (
                <div key={provider} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {provider === 'openai' ? 'OpenAI DALL-E 3' : provider}
                    </span>
                    <span className="text-sm text-gray-600">
                      {data.count} images ({data.percentage}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          provider === 'openai' ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${data.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(data.avgTime)} avg
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No provider data available yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Real Generation History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Image Generation History (Live Data)
            </h3>
            
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Category</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Images</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Provider</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Time</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Generated</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredGenerations.map((generation) => (
                <tr key={`${generation.id}-${generation.timestamp}`} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {generation.productName}
                      </div>
                      <div className="text-xs text-gray-500 truncate max-w-48">
                        {generation.prompt}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {generation.category}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-1">
                      {['primary', 'technical', 'application'].map((type) => (
                        <div
                          key={type}
                          className={`w-2 h-2 rounded-full ${
                            generation.imagesGenerated?.includes(type) 
                              ? 'bg-green-500' 
                              : 'bg-gray-300'
                          }`}
                          title={`${type} image ${generation.imagesGenerated?.includes(type) ? 'generated' : 'not generated'}`}
                        />
                      ))}
                      <span className="ml-2 text-xs text-gray-600">
                        {generation.imagesGenerated?.length || 0}/3
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(generation.status)}`}>
                      {getStatusIcon(generation.status)}
                      {generation.status}
                    </div>
                    {generation.error && (
                      <div className="text-xs text-red-600 mt-1" title={generation.error}>
                        {generation.error.length > 30 ? `${generation.error.substring(0, 30)}...` : generation.error}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-700 capitalize">
                      {generation.provider === 'openai' ? 'DALL-E 3' : generation.provider || 'N/A'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-700">
                      {formatTime(generation.processingTime)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(generation.timestamp)}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button 
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        onClick={() => setSelectedProduct(generation)}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {generation.status === 'completed' && generation.imageUrls?.length > 0 && (
                        <button 
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="View images"
                          onClick={() => {
                            // Open images in new tabs or modal
                            generation.imageUrls.forEach(url => window.open(url, '_blank'));
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {(generation.status === 'failed' || generation.status === 'error') && (
                        <button 
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          onClick={() => handleRetryGeneration(generation.productId)}
                          title="Retry generation"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGenerations.length === 0 && (
          <div className="text-center py-12">
            <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No image generations found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Start syncing products to begin image generation.'}
            </p>
            {!searchTerm && filter === 'all' && (
              <button
                onClick={handleStartImageGeneration}
                disabled={isGenerating || !systemHealth?.openaiAvailable}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Generation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Product Detail Modal - Enhanced for Real Data */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Image className="w-6 h-6 text-blue-600" />
                Image Generation Details
              </h3>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedProduct.productName}</h4>
                <p className="text-sm text-gray-600 capitalize">Product ID: {selectedProduct.productId}</p>
                <p className="text-sm text-gray-600 capitalize">Category: {selectedProduct.category}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ml-2 ${getStatusColor(selectedProduct.status)}`}>
                    {getStatusIcon(selectedProduct.status)}
                    {selectedProduct.status}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Provider:</span>
                  <span className="ml-2 text-sm text-gray-900 capitalize">
                    {selectedProduct.provider === 'openai' ? 'OpenAI DALL-E 3' : selectedProduct.provider || 'N/A'}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Processing Time:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {formatTime(selectedProduct.processingTime)}
                  </span>
                </div>
                
                <div>
                  <span className="text-sm text-gray-600">Attempts:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {selectedProduct.attempts || 1}
                  </span>
                </div>
                
                <div className="col-span-2">
                  <span className="text-sm text-gray-600">Generated:</span>
                  <span className="ml-2 text-sm text-gray-900">
                    {formatTimestamp(selectedProduct.timestamp)}
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Prompt Used:</span>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {selectedProduct.prompt}
                </p>
              </div>
              
              <div>
                <span className="text-sm text-gray-600">Images Generated:</span>
                <div className="mt-2 flex items-center gap-4">
                  {['primary', 'technical', 'application'].map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        selectedProduct.imagesGenerated?.includes(type) ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                      <span className={`text-sm ${
                        selectedProduct.imagesGenerated?.includes(type) ? 'text-gray-900' : 'text-gray-500'
                      } capitalize`}>
                        {type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Show actual generated images if available */}
              {selectedProduct.imageUrls && selectedProduct.imageUrls.length > 0 && (
                <div>
                  <span className="text-sm text-gray-600">Generated Images:</span>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedProduct.imageUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Generated image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {selectedProduct.error && (
                <div>
                  <span className="text-sm text-gray-600">Error Details:</span>
                  <p className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded-lg">
                    {selectedProduct.error}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {(selectedProduct.status === 'failed' || selectedProduct.status === 'error') && (
                <button 
                  onClick={() => {
                    handleRetryGeneration(selectedProduct.productId);
                    setSelectedProduct(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Retry Generation
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationDashboard;
