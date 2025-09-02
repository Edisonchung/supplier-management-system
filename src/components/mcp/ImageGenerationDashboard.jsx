// src/components/mcp/ImageGenerationDashboard.jsx
// IMPROVED: Cleaned up and simplified version with better error handling

import React, { useState, useEffect } from 'react';
import {
  Image,
  Play,
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
  Activity,
  FileImage,
  X,
  Filter,
  Search,
  Upload
} from 'lucide-react';

// Import shared ImagePreview component
import ImagePreview from './components/ImagePreview';

// Simplified service initialization
let productSyncService = null;

const initializeProductSyncService = async () => {
  try {
    console.log('🔄 Initializing ProductSyncService...');
    
    // Check if already available globally first
    if (window.productSyncService) {
      productSyncService = window.productSyncService;
      console.log('✅ Using existing ProductSyncService from window');
      return true;
    }
    
    // Try dynamic import with correct path
    const syncModule = await import('../../services/sync/ProductSyncService');
    productSyncService = new (syncModule.default || syncModule.ProductSyncService)();
    
    if (productSyncService.initialize) {
      await productSyncService.initialize();
    }
    
    console.log('✅ ProductSyncService initialized successfully');
    return true;
  } catch (error) {
    console.warn('ProductSyncService not available:', error);
    productSyncService = null;
    return false;
  }
};

const ImageGenerationDashboard = () => {
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [stats, setStats] = useState({
    totalGenerated: 0,
    generatedToday: 0,
    pendingQueue: 0,
    successRate: 0,
    averageTime: 15.8,
    topCategories: [],
    providerStats: {}
  });
  const [productsNeedingImages, setProductsNeedingImages] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [systemHealth, setSystemHealth] = useState({
    mcpApiHealthy: false,
    openaiAvailable: false,
    promptsLoaded: 0,
    queueProcessing: false,
    lastCheck: new Date(),
    queueLength: 0,
    processingRate: 0
  });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  const mcpServerUrl = 'https://supplier-mcp-server-production.up.railway.app';

  // Initialize service on component mount
  useEffect(() => {
    const initialize = async () => {
      console.log('🔄 Starting ProductSyncService initialization...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const initialized = await initializeProductSyncService();
      setServiceInitialized(initialized);
      
      if (initialized && isProductSyncServiceAvailable()) {
        console.log('✅ ProductSyncService is fully available');
        await fixProductImageFields();
      } else {
        console.warn('⚠️ ProductSyncService not available, using demo mode');
      }
      
      await loadDashboardData();
    };
    
    initialize();
    
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message, type = 'info', duration = 5000) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), duration);
  };

  // Simplified image field migration
  const fixProductImageFields = async () => {
    try {
      if (!isProductSyncServiceAvailable()) {
        showNotification('ProductSyncService not available', 'error');
        return;
      }

      console.log('🔧 Running image field migration fix...');
      showNotification('Starting image field migration...', 'info');

      // Direct method call - the logs show this method exists
      if (typeof productSyncService.updateProductsWithImageFields === 'function') {
        const result = await productSyncService.updateProductsWithImageFields();
        console.log('✅ Image field migration result:', result);
        
        if (result?.success || result?.updatedCount !== undefined) {
          const updated = result.updated || result.updatedCount || result.modified || 0;
          showNotification(`Successfully updated ${updated} products with proper image flags`, 'success');
          setTimeout(() => loadDashboardData(), 1000);
        } else if (result?.message) {
          showNotification(`Migration completed: ${result.message}`, 'info');
        } else {
          showNotification('Migration completed', 'info');
        }
      } else {
        showNotification('Image field migration method not available', 'error');
        console.error('Available methods:', Object.getOwnPropertyNames(productSyncService));
      }
    } catch (error) {
      console.error('Error fixing product image fields:', error);
      showNotification(`Failed to update product image fields: ${error.message}`, 'error');
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [healthData, productsData, syncStats] = await Promise.allSettled([
        fetchSystemHealth(),
        loadProductsNeedingImages(),
        loadSyncStatistics()
      ]);
      
      if (healthData.status === 'fulfilled') {
        setSystemHealth(healthData.value);
      } else {
        console.warn('Failed to fetch system health:', healthData.reason);
        setSystemHealth(prev => ({ 
          ...prev, 
          mcpApiHealthy: false, 
          openaiAvailable: false,
          lastCheck: new Date()
        }));
      }
      
      if (productsData.status === 'fulfilled' && Array.isArray(productsData.value)) {
        setProductsNeedingImages(productsData.value);
        
        const generationHistory = productsData.value.map(product => ({
          id: product.id,
          productId: product.id,
          productName: product.name || 'Unknown Product',
          category: product.category || 'general',
          imagesGenerated: product.hasRealImage ? ['primary'] : [],
          status: getProductImageStatus(product),
          provider: 'openai',
          processingTime: '15.2s',
          timestamp: product.lastImageError || new Date(),
          prompt: generateImagePrompt(product),
          imageUrls: getProductImageUrls(product),
          error: product.imageGenerationStatus === 'error' ? 'Generation failed' : null
        }));
        
        setRecentGenerations(generationHistory);
      } else {
        console.warn('Failed to load products:', productsData.reason);
        setProductsNeedingImages([]);
        setRecentGenerations([]);
      }
      
      if (syncStats.status === 'fulfilled' && syncStats.value && typeof syncStats.value === 'object') {
        const statsData = calculateRealStats(syncStats.value, productsData.value || []);
        setStats(statsData);
      } else {
        console.warn('Failed to load sync stats:', syncStats.reason);
        setStats({
          totalGenerated: 0,
          generatedToday: 0,
          pendingQueue: productsData.value ? productsData.value.length : 0,
          successRate: 0,
          averageTime: 15.8,
          topCategories: [],
          providerStats: {}
        });
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const getProductImageStatus = (product) => {
    if (!product) return 'needed';
    
    if (hasRealImage(product)) {
      return 'completed';
    }
    
    if (product.imageGenerationStatus === 'processing') {
      return 'processing';
    }
    
    if (product.imageGenerationStatus === 'error' || product.lastImageError) {
      return 'failed';
    }
    
    return 'needed';
  };

  const hasRealImage = (product) => {
    const imageUrl = product.imageUrl || product.image_url || product.photo || '';
    
    if (!imageUrl) return false;
    
    return imageUrl.includes('oaidalleapi') || 
           imageUrl.includes('blob.core.windows.net') ||
           imageUrl.includes('generated') ||
           imageUrl.includes('ai-image') ||
           imageUrl.includes('firebasestorage') ||
           (imageUrl.startsWith('https://') && !isPlaceholderImage(imageUrl));
  };

  const isPlaceholderImage = (imageUrl) => {
    if (!imageUrl) return true;
    
    const placeholderPatterns = [
      'placeholder',
      'via.placeholder',
      'default-image',
      'no-image',
      'temp-image'
    ];
    
    return placeholderPatterns.some(pattern => 
      imageUrl.toLowerCase().includes(pattern.toLowerCase())
    );
  };

  const getProductImageUrls = (product) => {
    const urls = [];
    
    const imageFields = ['imageUrl', 'image_url', 'image', 'photo', 'pictures', 'thumbnail'];
    
    for (const field of imageFields) {
      const value = product[field];
      if (value) {
        if (Array.isArray(value)) {
          urls.push(...value.filter(url => url && !isPlaceholderImage(url)));
        } else if (typeof value === 'string' && !isPlaceholderImage(value)) {
          urls.push(value);
        }
      }
    }
    
    if (product.images && typeof product.images === 'object') {
      Object.values(product.images).forEach(img => {
        if (typeof img === 'string' && !isPlaceholderImage(img)) {
          urls.push(img);
        } else if (img && img.url && !isPlaceholderImage(img.url)) {
          urls.push(img.url);
        }
      });
    }
    
    return [...new Set(urls)];
  };

  const generateImagePrompt = (product) => {
    const category = product.category || 'component';
    const name = product.name || 'product';
    const brand = product.brand || '';
    
    return `Professional industrial ${category} photography of ${name}${brand ? ` by ${brand}` : ''}, high quality product shot, white background, commercial lighting`;
  };

  const isProductSyncServiceAvailable = () => {
    if (!productSyncService) return false;
    
    const requiredMethods = [
      'getProductsNeedingImages',
      'getSyncStatistics',
      'manualImageGeneration'
    ];
    
    for (const method of requiredMethods) {
      if (typeof productSyncService[method] !== 'function') {
        console.warn(`ProductSyncService missing method: ${method}`);
        return false;
      }
    }
    
    return true;
  };

  const loadProductsNeedingImages = async () => {
    try {
      if (!isProductSyncServiceAvailable()) {
        console.warn('ProductSyncService not available, using fallback');
        return getDemoProducts();
      }
      
      const products = await productSyncService.getProductsNeedingImages(50);
      
      let productList = [];
      if (Array.isArray(products)) {
        productList = products;
      } else if (products && products.data && Array.isArray(products.data)) {
        productList = products.data;
      } else if (products && products.success && Array.isArray(products.results)) {
        productList = products.results;
      } else {
        console.warn('Invalid products format returned:', typeof products);
        return getDemoProducts();
      }
      
      const filteredProducts = productList.filter(product => {
        return !hasRealImage(product);
      });
      
      console.log(`Found ${productList.length} total products, ${filteredProducts.length} need images`);
      return filteredProducts;
      
    } catch (error) {
      console.error('Error loading products needing images:', error);
      return getDemoProducts();
    }
  };

  const loadSyncStatistics = async () => {
    try {
      if (!isProductSyncServiceAvailable()) {
        console.warn('ProductSyncService not available');
        return getDemoStats();
      }
      
      const result = await productSyncService.getSyncStatistics();
      
      if (result && typeof result === 'object') {
        if (result.data) {
          return result.data;
        } else if (result.success && result.data) {
          return result.data;
        } else if (result.success && result.statistics) {
          return result.statistics;
        } else {
          return result;
        }
      }
      
      return getDemoStats();
      
    } catch (error) {
      console.error('Error loading sync statistics:', error);
      return getDemoStats();
    }
  };

  const getDemoProducts = () => [
    {
      id: 'demo-1',
      name: 'Industrial Hydraulic Pump',
      category: 'hydraulics',
      imageGenerationStatus: 'needed',
      hasRealImage: false,
      imageUrl: null,
      sku: 'IHP-001',
      brand: 'HydroTech',
      description: 'High-pressure hydraulic pump for industrial applications'
    },
    {
      id: 'demo-2', 
      name: 'Pneumatic Control Valve',
      category: 'pneumatics',
      imageGenerationStatus: 'needed',
      hasRealImage: false,
      imageUrl: null,
      sku: 'PCV-002',
      brand: 'AirPro',
      description: 'Precision pneumatic control valve with manual override'
    },
    {
      id: 'demo-3',
      name: 'Proximity Sensor M18',
      category: 'sensors', 
      imageGenerationStatus: 'needed',
      hasRealImage: false,
      imageUrl: null,
      sku: 'PS-M18-003',
      brand: 'SensorTech',
      description: 'Inductive proximity sensor, M18 thread, PNP output'
    }
  ];

  const getDemoStats = () => ({
    totalInternal: 31,
    totalPublic: 25,
    productsWithRealImages: 8,
    productsNeedingImages: 17,
    imageGenerationRate: 32,
    totalImagesGenerated: 15,
    imageErrors: 2,
    averageImageTime: 15800
  });

  const fetchSystemHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${mcpServerUrl}/api/ai/health`, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        mcpApiHealthy: result.success || false,
        openaiAvailable: result.providers?.providers?.openai?.available || false,
        promptsLoaded: result.prompts?.total || 0,
        queueProcessing: false,
        lastCheck: new Date(),
        queueLength: productsNeedingImages.length,
        processingRate: 0
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

  const calculateRealStats = (syncData, productsArray = []) => {
    try {
      const totalProducts = syncData.totalPublic || 0;
      const productsWithImages = syncData.productsWithRealImages || 0;
      const productsNeedingImagesCount = syncData.productsNeedingImages || 0;
      const totalGenerated = syncData.totalImagesGenerated || 0;
      
      const categoryCount = {};
      if (Array.isArray(productsArray)) {
        productsArray.forEach(p => {
          if (p && typeof p === 'object') {
            const category = p.category || 'general';
            categoryCount[category] = (categoryCount[category] || 0) + 1;
          }
        });
      }
      
      const topCategories = Object.entries(categoryCount)
        .map(([category, count]) => ({
          category,
          count,
          percentage: totalProducts > 0 ? Math.round((count / totalProducts) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);

      return {
        totalGenerated: totalGenerated,
        generatedToday: 0,
        pendingQueue: productsNeedingImagesCount,
        successRate: syncData.imageGenerationRate || 0,
        averageTime: (syncData.averageImageTime || 15800) / 1000,
        topCategories,
        providerStats: {
          openai: {
            count: totalGenerated,
            percentage: 100,
            avgTime: (syncData.averageImageTime || 15800) / 1000,
            totalTime: totalGenerated * ((syncData.averageImageTime || 15800) / 1000),
            times: Array(Math.max(totalGenerated, 1)).fill((syncData.averageImageTime || 15800) / 1000)
          }
        }
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return {
        totalGenerated: 0,
        generatedToday: 0,
        pendingQueue: 0,
        successRate: 0,
        averageTime: 15.8,
        topCategories: [],
        providerStats: {}
      };
    }
  };

  // Simplified navigation function
  const navigateToManualUpload = () => {
    if (typeof window !== 'undefined') {
      // Try React Router first
      if (window.history && window.history.pushState) {
        window.history.pushState({}, '', '/manual-image-upload');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        // Fallback to hash routing
        window.location.hash = '#/manual-image-upload';
      }
    }
  };

  const handleStartImageGeneration = async () => {
    if (selectedProducts.length === 0) {
      showNotification('Please select products to generate images for', 'error');
      return;
    }

    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available', 'error');
      return;
    }

    setIsGenerating(true);
    try {
      console.log(`Starting image generation for ${selectedProducts.length} products...`);
      showNotification(`Starting image generation for ${selectedProducts.length} products...`, 'info');
      
      const result = await productSyncService.manualImageGeneration(selectedProducts);
      
      if (result && result.success) {
        const { successful, failed, total } = result.summary || { successful: 0, failed: 0, total: 0 };
        
        if (successful > 0) {
          showNotification(`Successfully generated images for ${successful}/${total} products!`, 'success');
        }
        
        if (failed > 0) {
          showNotification(`Failed to generate images for ${failed} products`, 'error', 8000);
          console.error('Failed generations:', result.errors);
        }
        
        setSelectedProducts([]);
        setTimeout(async () => {
          await loadDashboardData();
        }, 2000);
        
      } else {
        throw new Error(result?.message || 'Manual image generation failed');
      }
      
    } catch (error) {
      console.error('Failed to start image generation:', error);
      showNotification(`Failed to start image generation: ${error.message}`, 'error');
    } finally {
      setTimeout(() => setIsGenerating(false), 3000);
    }
  };

  const handleRetryGeneration = async (productId) => {
    try {
      showNotification(`Retrying image generation for product ${productId}`, 'info');
      
      setRecentGenerations(prev => prev.map(gen => 
        gen.productId === productId ? { 
          ...gen, 
          status: 'processing', 
          attempts: (gen.attempts || 1) + 1,
          error: null 
        } : gen
      ));

      if (!isProductSyncServiceAvailable()) {
        throw new Error('Image generation service not available');
      }

      const result = await productSyncService.manualImageGeneration([productId]);
      
      if (result && result.success && result.results && result.results.length > 0) {
        const generationResult = result.results[0];
        if (generationResult && generationResult.success) {
          setRecentGenerations(prev => prev.map(gen => 
            gen.productId === productId ? { 
              ...gen, 
              status: 'completed',
              processingTime: '15.2s',
              imageUrls: [generationResult.imageUrl],
              imagesGenerated: ['primary'],
              error: null,
              timestamp: new Date()
            } : gen
          ));
          showNotification('Retry successful!', 'success');
          setTimeout(() => loadDashboardData(), 1000);
        } else {
          throw new Error('Retry generation failed');
        }
      } else {
        throw new Error('Retry failed');
      }
      
    } catch (error) {
      setRecentGenerations(prev => prev.map(gen => 
        gen.productId === productId ? { 
          ...gen, 
          status: 'failed',
          error: error.message 
        } : gen
      ));
      showNotification(`Failed to retry generation: ${error.message}`, 'error');
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
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
      case 'needed':
        return <Clock className="w-4 h-4 text-yellow-600" />;
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
      case 'needed':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    if (typeof seconds === 'string') return seconds.includes('s') ? seconds : `${seconds}s`;
    return `${parseFloat(seconds).toFixed(1)}s`;
  };

  const filteredGenerations = React.useMemo(() => {
    try {
      if (!Array.isArray(recentGenerations)) return [];
      
      return recentGenerations.filter(generation => {
        if (!generation || typeof generation !== 'object') return false;
        
        const matchesFilter = filter === 'all' || generation.status === filter;
        const matchesSearch = !searchTerm || 
          (generation.productName && 
           generation.productName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchesFilter && matchesSearch;
      });
    } catch (error) {
      console.error('Error filtering generations:', error);
      return [];
    }
  }, [recentGenerations, filter, searchTerm]);

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
          <p className="text-gray-600 mt-1">
            Monitor and manage OpenAI-powered product image generation 
            {!serviceInitialized || !isProductSyncServiceAvailable() ? (
              <span className="text-orange-600"> (Demo Mode - ProductSyncService unavailable)</span>
            ) : null}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={navigateToManualUpload}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Manual Upload
          </button>

          {serviceInitialized && isProductSyncServiceAvailable() && (
            <button
              onClick={fixProductImageFields}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              title="Fix database image field structure"
            >
              <Settings className="w-4 h-4 mr-2" />
              Fix Fields
            </button>
          )}
          
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
            disabled={isGenerating || selectedProducts.length === 0 || !isProductSyncServiceAvailable()}
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
                Generate Images ({selectedProducts.length})
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
            <span className="text-sm text-gray-700">Railway API</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${systemHealth?.openaiAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">OpenAI DALL-E</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${serviceInitialized && isProductSyncServiceAvailable() ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">Sync Service</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${productsNeedingImages.length > 0 ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-sm text-gray-700">Queue ({productsNeedingImages.length || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-gray-700">
              {serviceInitialized && isProductSyncServiceAvailable() ? 'Live Data' : 'Demo Data'}
            </span>
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
              <p className="text-sm text-gray-600">Needs Images</p>
              <p className="text-2xl font-bold text-yellow-600">{productsNeedingImages.length || 0}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-purple-600">{stats?.successRate || 0}%</p>
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

      {/* Products Needing Images Section */}
      {productsNeedingImages.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Products Needing Images ({productsNeedingImages.length})
                {!serviceInitialized && <span className="text-sm text-orange-600 ml-2">(Demo Data)</span>}
              </h3>
              
              <div className="flex space-x-3">
                <button
                  onClick={navigateToManualUpload}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Manual Upload
                </button>
                
                <button
                  onClick={() => setSelectedProducts(productsNeedingImages.map(p => p.id))}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isGenerating}
                >
                  Select All
                </button>
                
                <button
                  onClick={() => setSelectedProducts([])}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isGenerating}
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {productsNeedingImages.map(product => (
              <div key={product.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    disabled={isGenerating}
                  />
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Category: {product.category}</span>
                      {product.sku && <span>SKU: {product.sku}</span>}
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(getProductImageStatus(product))}`}>
                        {getProductImageStatus(product)}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                  
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    {hasRealImage(product) && getProductImageUrls(product).length > 0 ? (
                      <img 
                        src={getProductImageUrls(product)[0]} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.innerHTML = '<div class="text-gray-400 text-xs text-center">No Image</div>';
                        }}
                      />
                    ) : (
                      <div className="text-gray-400 text-xs text-center">
                        No Image
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation History Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Image Generation History 
              {!serviceInitialized || !isProductSyncServiceAvailable() ? (
                <span className="text-sm text-orange-600">(Demo Data)</span>
              ) : null}
            </h3>
            
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
                <option value="needed">Needs Images</option>
                <option value="failed">Failed</option>
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
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Provider</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Time</th>
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredGenerations.map((generation, index) => (
                <tr key={`${generation.id}-${index}`} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {generation.productName}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {generation.productId}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                      {(generation.category || 'general').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(generation.status)}`}>
                      {getStatusIcon(generation.status)}
                      {generation.status}
                    </div>
                    {generation.error && (
                      <div className="text-xs text-red-600 mt-1" title={generation.error}>
                        Error: {generation.error.length > 20 ? `${generation.error.substring(0, 20)}...` : generation.error}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-700">DALL-E 3</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-gray-700">
                      {formatTime(generation.processingTime)}
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
                            generation.imageUrls.forEach(url => window.open(url, '_blank'));
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {(generation.status === 'failed' || generation.status === 'error' || generation.status === 'needed') && serviceInitialized && isProductSyncServiceAvailable() && (
                        <button 
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          onClick={() => handleRetryGeneration(generation.productId)}
                          title="Generate image"
                          disabled={isGenerating}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'All products have images or no products need image generation.'}
            </p>
          </div>
        )}
      </div>

      {/* Product Detail Modal using ImagePreview component */}
      {selectedProduct && (
        <ImagePreview
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
          onRetry={handleRetryGeneration}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
};

export default ImageGenerationDashboard;
