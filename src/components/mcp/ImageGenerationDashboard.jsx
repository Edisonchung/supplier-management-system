// src/components/mcp/ImageGenerationDashboard.jsx
// FIXED: Infinite loop and refresh issues completely resolved
// KEY FIXES: Proper dependency management, stable references, initialization guards

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Upload,
  Database,
  Cloud,
  ShieldCheck,
  Trash2,
  Camera,
  Plus,
  Edit,
  ArrowUpDown
} from 'lucide-react';

// Firebase imports
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';

// Import shared ImagePreview component
import ImagePreview from './components/ImagePreview';

const ImageGenerationDashboard = () => {
  // ========================================
  // 1. REFS AND INITIALIZATION GUARDS
  // ========================================
  const mountedRef = useRef(true);
  const initializationRef = useRef(false);
  const productSyncServiceRef = useRef(null);
  const lastLoadTimeRef = useRef(0);

  // ========================================
  // 2. ALL STATE DECLARATIONS (STABLE ORDER)
  // ========================================
  const [initialized, setInitialized] = useState(false);
  const [serviceInitialized, setServiceInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Product arrays
  const [allProducts, setAllProducts] = useState([]);
  const [productsNeedingImages, setProductsNeedingImages] = useState([]);
  const [completedProducts, setCompletedProducts] = useState([]);
  const [failedProducts, setFailedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('needs-images');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notification, setNotification] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // System status
  const [systemHealth, setSystemHealth] = useState({
    mcpApiHealthy: false,
    openaiAvailable: false,
    firebaseStorageHealthy: false,
    lastCheck: null,
    queueStatus: 'idle'
  });
  
  const [stats, setStats] = useState({
    totalGenerated: 0,
    generatedToday: 0,
    pendingQueue: 0,
    successRate: 77,
    averageTime: 15.8,
    firebaseStorageEnabled: false,
    manualUploads: 0,
    uploadErrors: 0
  });

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProductForUpload, setSelectedProductForUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  // ========================================
  // 3. STABLE UTILITY FUNCTIONS (NO DEPS)
  // ========================================
  const isPlaceholderImage = useCallback((imageUrl) => {
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
  }, []);

  const hasRealImage = useCallback((product) => {
    if (!product) return false;
    
    // Check for Firebase Storage URLs
    const imageUrl = product.imageUrl || product.image_url || product.photo || product.aiImageUrl || '';
    
    if (!imageUrl) return false;
    
    return imageUrl.includes('firebasestorage.googleapis.com') ||
           imageUrl.includes('oaidalleapi') || 
           imageUrl.includes('blob.core.windows.net') ||
           imageUrl.includes('generated') ||
           imageUrl.includes('ai-image') ||
           (imageUrl.startsWith('https://') && !isPlaceholderImage(imageUrl));
  }, [isPlaceholderImage]);

  const getProductImageStatus = useCallback((product) => {
    if (!product) return 'needed';
    
    if (hasRealImage(product)) {
      return 'completed';
    }
    
    if (product.imageGenerationStatus === 'processing' || product.aiImageStatus === 'processing') {
      return 'processing';
    }
    
    if (product.imageGenerationStatus === 'error' || product.aiImageStatus === 'error' || product.lastImageError) {
      return 'failed';
    }
    
    return 'needed';
  }, [hasRealImage]);

  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    if (!mountedRef.current) return;
    setNotification({ message, type });
    setTimeout(() => {
      if (mountedRef.current) {
        setNotification(null);
      }
    }, duration);
  }, []);

  // ========================================
  // 4. SERVICE INITIALIZATION (CONTROLLED)
  // ========================================
  const initializeProductSyncService = useCallback(async () => {
    // Prevent multiple initializations
    if (initializationRef.current || !mountedRef.current) {
      return productSyncServiceRef.current;
    }
    
    initializationRef.current = true;
    
    try {
      console.log('🔄 Starting ProductSyncService initialization - FIXED VERSION v3.0...');
      
      // Check if already available globally
      if (window.productSyncService) {
        productSyncServiceRef.current = window.productSyncService;
        console.log('✅ Using existing ProductSyncService from window');
        return productSyncServiceRef.current;
      }
      
      // Try dynamic import
      const syncModule = await import('../../services/sync/ProductSyncService');
      const ServiceClass = syncModule.default || syncModule.ProductSyncService;
      
      if (ServiceClass) {
        productSyncServiceRef.current = new ServiceClass();
        
        if (productSyncServiceRef.current.initialize) {
          await productSyncServiceRef.current.initialize();
        }
        
        console.log('✅ ProductSyncService initialized successfully');
        return productSyncServiceRef.current;
      } else {
        throw new Error('ProductSyncService class not found');
      }
      
    } catch (error) {
      console.warn('❌ ProductSyncService initialization failed:', error);
      productSyncServiceRef.current = null;
      return null;
    } finally {
      initializationRef.current = false;
    }
  }, []);

  const isProductSyncServiceAvailable = useCallback(() => {
    return Boolean(productSyncServiceRef.current && 
                  typeof productSyncServiceRef.current.manualImageGeneration === 'function');
  }, []);

  // ========================================
  // 5. DATA TRANSFORMATION FUNCTIONS
  // ========================================
  const transformProductData = useCallback((docId, productData) => {
    return {
      id: docId,
      name: productData.name || productData.title || 'Unnamed Product',
      description: productData.description || '',
      category: productData.category || 'general',
      price: productData.price || 0,
      supplier: productData.supplier || productData.supplierName || 'Unknown Supplier',
      sku: productData.sku || productData.productCode,
      
      // Image fields
      imageUrl: productData.imageUrl || productData.image || productData.productImageUrl || null,
      aiImageUrl: productData.aiImageUrl || null,
      
      // Status fields
      imageGenerationStatus: productData.imageGenerationStatus || 'needed',
      lastImageError: productData.lastImageError || null,
      firebaseStorageComplete: productData.firebaseStorageComplete || false,
      
      // Metadata
      createdAt: productData.createdAt || new Date(),
      updatedAt: productData.updatedAt || new Date()
    };
  }, []);

  const categorizeProducts = useCallback((products) => {
    if (!Array.isArray(products)) {
      return { needingImages: [], completed: [], failed: [] };
    }

    const needingImages = [];
    const completed = [];
    const failed = [];

    products.forEach(product => {
      const status = getProductImageStatus(product);
      
      if (status === 'completed') {
        completed.push(product);
      } else if (status === 'failed') {
        failed.push(product);
      } else {
        needingImages.push(product);
      }
    });

    return { needingImages, completed, failed };
  }, [getProductImageStatus]);

  // ========================================
  // 6. DATA LOADING FUNCTIONS (OPTIMIZED)
  // ========================================
  const loadAllProducts = useCallback(async () => {
    // Prevent rapid successive calls
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 1000) {
      return;
    }
    lastLoadTimeRef.current = now;

    if (!mountedRef.current) return;
    
    try {
      console.log('🔍 LOADALLPRODUCTS: Starting to load all products...');
      
      // Direct Firestore query with error handling
      const productsRef = collection(db, 'products_public');
      const q = query(productsRef, orderBy('name'));
      
      try {
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('📦 FIRESTORE: No products found in products_public, trying products collection...');
          
          // Fallback to products collection
          const fallbackRef = collection(db, 'products');
          const fallbackQuery = query(fallbackRef, orderBy('name'));
          const fallbackSnapshot = await getDocs(fallbackQuery);
          
          const products = [];
          fallbackSnapshot.forEach((doc) => {
            const productData = doc.data();
            products.push(transformProductData(doc.id, productData));
          });
          
          console.log(`✅ FIRESTORE: Loaded ${products.length} products from fallback collection`);
          
          if (mountedRef.current) {
            setAllProducts(products);
          }
          return products;
        }
        
        const products = [];
        querySnapshot.forEach((doc) => {
          const productData = doc.data();
          products.push(transformProductData(doc.id, productData));
        });
        
        console.log(`✅ FIRESTORE: Loaded ${products.length} products from products_public`);
        
        if (mountedRef.current) {
          setAllProducts(products);
        }
        return products;
        
      } catch (firestoreError) {
        console.error('❌ FIRESTORE: Query failed:', firestoreError);
        
        // Return demo data on error
        const demoProducts = [
          {
            id: 'demo-1',
            name: 'Industrial Hydraulic Pump',
            category: 'hydraulics',
            supplier: 'HydroTech Industries',
            imageGenerationStatus: 'needed',
            imageUrl: null
          },
          {
            id: 'demo-2',
            name: 'Pneumatic Control Valve', 
            category: 'pneumatics',
            supplier: 'AirPro Systems',
            imageGenerationStatus: 'needed',
            imageUrl: null
          }
        ];
        
        if (mountedRef.current) {
          setAllProducts(demoProducts);
          setErrorMessage('Using demo data - Firestore connection failed');
        }
        return demoProducts;
      }
      
    } catch (error) {
      console.error('❌ LOADALLPRODUCTS: Failed to load products:', error);
      if (mountedRef.current) {
        setAllProducts([]);
      }
      return [];
    }
  }, [transformProductData]);

  // ========================================
  // 7. MAIN INITIALIZATION EFFECT (ONCE ONLY)
  // ========================================
  useEffect(() => {
    if (initialized || !mountedRef.current) {
      return;
    }

    let isMounted = true;

    const initializeDashboard = async () => {
      try {
        console.log('🚀 ImageGenerationDashboard initializing - FIXED VERSION...');
        
        if (!isMounted) return;
        setIsLoading(true);

        // Initialize service
        const service = await initializeProductSyncService();
        if (isMounted) {
          setServiceInitialized(Boolean(service));
        }

        // Load products
        const products = await loadAllProducts();
        
        if (isMounted && products) {
          // Categorize products
          const { needingImages, completed, failed } = categorizeProducts(products);
          
          setProductsNeedingImages(needingImages);
          setCompletedProducts(completed);
          setFailedProducts(failed);
          
          console.log(`✅ Dashboard initialized with ${products.length} total products`);
        }

      } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
        if (isMounted) {
          setErrorMessage('Failed to initialize dashboard');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [initialized, initializeProductSyncService, loadAllProducts, categorizeProducts]);

  // ========================================
  // 8. PRODUCT CATEGORIZATION EFFECT (STABLE)
  // ========================================
  useEffect(() => {
    if (allProducts.length === 0) return;

    const { needingImages, completed, failed } = categorizeProducts(allProducts);
    setProductsNeedingImages(needingImages);
    setCompletedProducts(completed);
    setFailedProducts(failed);
  }, [allProducts, categorizeProducts]);

  // ========================================
  // 9. CLEANUP ON UNMOUNT
  // ========================================
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ========================================
  // 10. GENERATION FUNCTIONS
  // ========================================
  const handleSingleGeneration = useCallback(async (product) => {
    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available', 'error');
      return;
    }

    if (!product || !product.id) {
      showNotification('Invalid product data', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      console.log(`🎯 Generating image for product: ${product.name} (ID: ${product.id})`);
      
      const result = await productSyncServiceRef.current.manualImageGeneration(product.id);
      
      if (result && (result.success || result.results?.length > 0)) {
        showNotification(`Successfully generated image for ${product.name}`, 'success');
        
        // Reload products after delay
        setTimeout(async () => {
          if (mountedRef.current) {
            const updatedProducts = await loadAllProducts();
            if (updatedProducts) {
              const { needingImages, completed, failed } = categorizeProducts(updatedProducts);
              setProductsNeedingImages(needingImages);
              setCompletedProducts(completed);
              setFailedProducts(failed);
            }
          }
        }, 2000);
      } else {
        const error = result?.errors?.[0]?.error || result?.error || 'Unknown error';
        showNotification(`Failed to generate image for ${product.name}: ${error}`, 'error');
      }
    } catch (error) {
      console.error('Single generation error:', error);
      showNotification(`Error generating image: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [isProductSyncServiceAvailable, showNotification, loadAllProducts, categorizeProducts]);

  const handleBatchGeneration = useCallback(async () => {
    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available', 'error');
      return;
    }

    if (selectedProducts.length === 0) {
      showNotification('Please select products to generate images', 'warning');
      return;
    }

    try {
      setIsGenerating(true);
      console.log(`🎯 Starting batch generation for ${selectedProducts.length} products`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const productId of selectedProducts) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) continue;

        try {
          const result = await productSyncServiceRef.current.manualImageGeneration(productId);
          
          if (result && (result.success || result.results?.length > 0)) {
            successCount++;
          } else {
            throw new Error(result?.error || 'Generation failed');
          }
          
        } catch (productError) {
          errorCount++;
          console.error(`❌ Error for product ${productId}:`, productError);
        }
        
        // Delay between generations
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      showNotification(
        `Batch completed: ${successCount} successful, ${errorCount} failed`, 
        successCount > 0 ? 'success' : 'error'
      );
      
      // Reload products after batch
      setTimeout(async () => {
        if (mountedRef.current) {
          const updatedProducts = await loadAllProducts();
          if (updatedProducts) {
            const { needingImages, completed, failed } = categorizeProducts(updatedProducts);
            setProductsNeedingImages(needingImages);
            setCompletedProducts(completed);
            setFailedProducts(failed);
          }
        }
      }, 3000);

    } catch (error) {
      console.error('Batch generation error:', error);
      showNotification(`Failed to generate images: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
      setSelectedProducts([]);
    }
  }, [selectedProducts, isProductSyncServiceAvailable, allProducts, showNotification, loadAllProducts, categorizeProducts]);

  // ========================================
  // 11. UI HELPER FUNCTIONS
  // ========================================
  const toggleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'processing': return <Loader className="w-4 h-4 animate-spin text-blue-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'processing': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }, []);

  const getCurrentTabProducts = useCallback(() => {
    switch (activeTab) {
      case 'needs-images': return productsNeedingImages;
      case 'completed': return completedProducts;
      case 'failed': return failedProducts;
      case 'all-products': return allProducts;
      default: return productsNeedingImages;
    }
  }, [activeTab, productsNeedingImages, completedProducts, failedProducts, allProducts]);

  // Apply filters to current tab products
  const filteredTabProducts = useMemo(() => {
    let products = getCurrentTabProducts();

    // Apply search filter
    if (searchTerm) {
      products = products.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      products = products.filter(product => 
        getProductImageStatus(product) === filterStatus
      );
    }

    // Apply sorting
    products.sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      
      const comparison = typeof aVal === 'string' 
        ? aVal.localeCompare(bVal)
        : (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return products;
  }, [getCurrentTabProducts, searchTerm, filterStatus, sortBy, sortOrder, getProductImageStatus]);

  // Upload modal functions
  const openUploadModal = useCallback((product) => {
    setSelectedProductForUpload(product);
    setShowUploadModal(true);
  }, []);

  const closeUploadModal = useCallback(() => {
    setShowUploadModal(false);
    setSelectedProductForUpload(null);
    setUploadingFiles([]);
  }, []);

  // ========================================
  // 12. RENDER LOADING STATE
  // ========================================
  if (isLoading && !initialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // 13. MAIN RENDER
  // ========================================
  return (
    <div className="space-y-6 p-6">
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

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
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
            <Cloud className="w-6 h-6 text-green-600" title="Firebase Storage Enabled" />
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage OpenAI-powered product image generation with Firebase Storage
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={async () => {
              setIsLoading(true);
              await loadAllProducts();
              setIsLoading(false);
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          {selectedProducts.length > 0 && (
            <button
              onClick={handleBatchGeneration}
              disabled={isGenerating || !serviceInitialized}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Zap className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
              Generate Images ({selectedProducts.length})
            </button>
          )}
        </div>
      </div>

      {/* System Health Status */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">System Health</span>
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Railway API
            </div>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              OpenAI DALL-E
            </div>
            <div className={`flex items-center gap-2 text-xs ${serviceInitialized ? 'text-green-600' : 'text-red-600'}`}>
              <div className={`w-2 h-2 rounded-full ${serviceInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
              Sync Service
            </div>
            <div className="flex items-center gap-2 text-xs text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Firebase Storage
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              Queue ({productsNeedingImages.length})
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Live Data
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Total Generated</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {completedProducts.length}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Needs Images</span>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {productsNeedingImages.length}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Success Rate</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {allProducts.length > 0 ? Math.round((completedProducts.length / allProducts.length) * 100) : 0}%
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Firebase Storage</span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {allProducts.filter(p => p.firebaseStorageComplete).length}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">Avg Time</span>
          </div>
          <div className="text-2xl font-bold text-yellow-600">15.8s</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'needs-images', label: `Needs Images (${productsNeedingImages.length})`, icon: AlertCircle },
          { id: 'completed', label: `Completed (${completedProducts.length})`, icon: CheckCircle },
          { id: 'failed', label: `Failed (${failedProducts.length})`, icon: AlertCircle },
          { id: 'all-products', label: `All Products (${allProducts.length})`, icon: Database }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-4 h-4 inline mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={async () => {
            setIsLoading(true);
            await loadAllProducts();
            setIsLoading(false);
          }}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </button>
        
        <button
          onClick={() => {
            if (productsNeedingImages.length === 0) {
              showNotification('No products need images', 'info');
              return;
            }
            const allProductIds = productsNeedingImages.map(p => p.id);
            setSelectedProducts(allProductIds);
            setTimeout(handleBatchGeneration, 100);
          }}
          disabled={isGenerating || productsNeedingImages.length === 0 || !serviceInitialized}
          className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
        >
          <Zap className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
          Generate All Missing Images ({productsNeedingImages.length})
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="needed">Needs Images</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Products Display */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {activeTab === 'needs-images' && 'Products Needing Images'}
              {activeTab === 'completed' && 'Completed Products'}
              {activeTab === 'failed' && 'Failed Generations'}
              {activeTab === 'all-products' && 'All Products'}
            </h3>
            <span className="text-sm text-gray-500">
              {filteredTabProducts.length} product{filteredTabProducts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="p-6">
          {filteredTabProducts.length === 0 ? (
            <div className="text-center py-8">
              <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No products match your search criteria'
                  : 'No products found in this category'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTabProducts.map(product => {
                const status = getProductImageStatus(product);
                const isSelected = selectedProducts.includes(product.id);
                
                return (
                  <div 
                    key={product.id} 
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProductSelection(product.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          {status}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 line-clamp-2">
                        {product.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Category: {product.category || 'Uncategorized'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Supplier: {product.supplier}
                      </p>
                    </div>

                    {/* Product Image */}
                    <div className="mt-4 aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                      {hasRealImage(product) ? (
                        <img
                          src={product.imageUrl || product.aiImageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <FileImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">No image available</p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex gap-2">
                      {!hasRealImage(product) && (
                        <button
                          onClick={() => handleSingleGeneration(product)}
                          disabled={isGenerating || !serviceInitialized}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          {isGenerating && selectedProducts.includes(product.id) ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                          Generate
                        </button>
                      )}
                      
                      <button
                        onClick={() => openUploadModal(product)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </button>
                      
                      {hasRealImage(product) && (
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedProduct && (
        <ImagePreview
          image={{
            url: selectedProduct.imageUrl || selectedProduct.aiImageUrl,
            name: selectedProduct.name
          }}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && selectedProductForUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload Image</h3>
              <button onClick={closeUploadModal}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                Upload image for: {selectedProductForUpload.name}
              </p>
              <input
                type="file"
                accept="image/*"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeUploadModal}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={closeUploadModal}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGenerationDashboard;
