// src/components/mcp/ImageGenerationDashboard.jsx
// CRITICAL FIX: Added missing activeTab state and allProducts state
// FIXED: ReferenceError: Can't find variable: activeTab

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
  Upload,
  Database,
  Cloud,
  ShieldCheck,
  Trash2,
  Camera,
  Plus,
  Edit
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
    providerStats: {},
    // Enhanced Firebase Storage stats
    firebaseStorageRate: 0,
    firebaseStorageEnabled: 0,
    manualUploads: 0,
    uploadErrors: 0
  });
  
  // CRITICAL FIX: Added missing activeTab state
  const [activeTab, setActiveTab] = useState('needing');
  
  // CRITICAL FIX: Added missing allProducts state
  const [allProducts, setAllProducts] = useState([]);
  
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
    processingRate: 0,
    // Enhanced Firebase Storage health
    firebaseStorageHealthy: false,
    firebaseStorageEnabled: false
  });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState(null);

  // NEW: Manual upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProductForUpload, setSelectedProductForUpload] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mcpServerUrl = 'https://supplier-mcp-server-production.up.railway.app';

  // Initialize service on component mount
  useEffect(() => {
    const initialize = async () => {
      console.log('🔄 Starting ProductSyncService initialization - UPDATED VERSION v2.1...');
      
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

  // Enhanced image field migration with Firebase Storage support
  const fixProductImageFields = async () => {
    try {
      if (!isProductSyncServiceAvailable()) {
        showNotification('ProductSyncService not available', 'error');
        return;
      }

      console.log('🔧 Running enhanced image field migration with Firebase Storage support...');
      showNotification('Starting enhanced image field migration...', 'info');

      // Direct method call - the logs show this method exists
      if (typeof productSyncService.updateProductsWithImageFields === 'function') {
        const result = await productSyncService.updateProductsWithImageFields();
        console.log('✅ Enhanced image field migration result:', result);
        
        if (result?.success || result?.updatedCount !== undefined) {
          const updated = result.updated || result.updatedCount || result.modified || 0;
          showNotification(`Successfully updated ${updated} products with Firebase Storage fields`, 'success');
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
      
      const [healthData, productsData, syncStats, storageStats] = await Promise.allSettled([
        fetchSystemHealth(),
        loadProductsNeedingImages(),
        loadSyncStatistics(),
        loadStorageStatistics()
      ]);
      
      if (healthData.status === 'fulfilled') {
        setSystemHealth(healthData.value);
      } else {
        console.warn('Failed to fetch system health:', healthData.reason);
        setSystemHealth(prev => ({ 
          ...prev, 
          mcpApiHealthy: false, 
          openaiAvailable: false,
          firebaseStorageHealthy: false,
          lastCheck: new Date()
        }));
      }
      
      if (productsData.status === 'fulfilled' && Array.isArray(productsData.value)) {
        const allProductsData = productsData.value;
        const needingImagesData = allProductsData.filter(product => !hasRealImage(product));
        
        // CRITICAL FIX: Set both allProducts and productsNeedingImages
        setAllProducts(allProductsData);
        setProductsNeedingImages(needingImagesData);
        
        const generationHistory = allProductsData.map(product => ({
          id: product.id,
          productId: product.id,
          productName: product.name || 'Unknown Product',
          category: product.category || 'general',
          imagesGenerated: hasRealImage(product) ? ['primary'] : [],
          status: getProductImageStatus(product),
          provider: 'openai',
          processingTime: '15.2s',
          timestamp: product.lastImageError || new Date(),
          prompt: generateImagePrompt(product),
          imageUrls: getProductImageUrls(product),
          error: product.imageGenerationStatus === 'error' ? 'Generation failed' : null,
          // Enhanced Firebase Storage info
          firebaseStored: product.firebaseStorageComplete || false,
          storageProvider: product.firebaseStorageComplete ? 'firebase' : 'openai'
        }));
        
        setRecentGenerations(generationHistory);
      } else {
        console.warn('Failed to load products:', productsData.reason);
        setAllProducts([]);
        setProductsNeedingImages([]);
        setRecentGenerations([]);
      }
      
      if (syncStats.status === 'fulfilled' && syncStats.value && typeof syncStats.value === 'object') {
        const statsData = calculateRealStats(syncStats.value, productsData.value || []);
        
        // Merge storage stats if available
        if (storageStats.status === 'fulfilled' && storageStats.value) {
          statsData.firebaseStorageEnabled = storageStats.value.enabled || false;
          statsData.manualUploads = storageStats.value.stats?.manualUploads || 0;
          statsData.uploadErrors = storageStats.value.stats?.errors || 0;
        }
        
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
          providerStats: {},
          firebaseStorageRate: 0,
          firebaseStorageEnabled: false,
          manualUploads: 0,
          uploadErrors: 0
        });
      }
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // New method to load Firebase Storage statistics
  const loadStorageStatistics = async () => {
    try {
      if (!isProductSyncServiceAvailable()) {
        return null;
      }
      
      if (typeof productSyncService.getStorageStatistics === 'function') {
        return await productSyncService.getStorageStatistics();
      } else {
        console.warn('getStorageStatistics method not available');
        return null;
      }
    } catch (error) {
      console.error('Error loading storage statistics:', error);
      return null;
    }
  };

  // NEW: Manual upload functionality
  const openUploadModal = (product) => {
    setSelectedProductForUpload(product);
    setShowUploadModal(true);
    setUploadingFiles([]);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedProductForUpload(null);
    setUploadingFiles([]);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  };

  const handleFileSelection = (files) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      showNotification('Please select valid image files (PNG, JPG, WEBP)', 'error');
      return;
    }
    setUploadingFiles(imageFiles);
    showNotification(`Selected ${imageFiles.length} image(s) for upload`, 'info');
  };

  // FIXED: Updated manual upload function to use ProductSyncService
  const uploadManualImages = async () => {
    if (!selectedProductForUpload || uploadingFiles.length === 0) return;

    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available - cannot upload images', 'error');
      return;
    }

    setIsUploading(true);
    showNotification(`Uploading ${uploadingFiles.length} images to Firebase Storage...`, 'info');

    try {
      // FIXED: Use ProductSyncService for manual uploads
      for (const file of uploadingFiles) {
        const result = await productSyncService.uploadProductImage(
          selectedProductForUpload.id,
          file,
          {
            imageType: 'primary',
            replaceExisting: true,
            compressionQuality: 0.8
          }
        );

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }
      }
      
      showNotification(
        `Successfully uploaded ${uploadingFiles.length} images to Firebase Storage for ${selectedProductForUpload.name}`, 
        'success'
      );
      
      // Update the product in our local state
      setProductsNeedingImages(prev => 
        prev.map(p => 
          p.id === selectedProductForUpload.id 
            ? { ...p, hasRealImage: true, firebaseStorageComplete: true }
            : p
        )
      );
      
      setAllProducts(prev => 
        prev.map(p => 
          p.id === selectedProductForUpload.id 
            ? { ...p, hasRealImage: true, firebaseStorageComplete: true }
            : p
        )
      );
      
      closeUploadModal();
      await loadDashboardData();
      
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(`Failed to upload images: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // FIXED: Critical fix for single product regeneration
  const regenerateImage = async (productId) => {
    const product = allProducts.find(p => p.id === productId) || 
                   productsNeedingImages.find(p => p.id === productId) || 
                   recentGenerations.find(g => g.productId === productId);
    
    if (!product) {
      showNotification('Product not found', 'error');
      return;
    }

    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available - cannot regenerate image', 'error');
      return;
    }

    setIsGenerating(true);
    showNotification(`Regenerating image for ${product.productName || product.name} via ProductSyncService...`, 'info');

    try {
      console.log(`Calling ProductSyncService.manualImageGeneration for regeneration: ${product.productName || product.name}`);
      console.log(`Product ID being passed: "${productId}" (type: ${typeof productId})`);
      
      // CRITICAL FIX: Ensure we pass the productId as a string (not an array)
      const result = await productSyncService.manualImageGeneration(productId);
      console.log('ProductSyncService regeneration result:', result);
      
      if (result && (result.success || result.results?.length > 0)) {
        const firstResult = result.results?.[0];
        const imageUrl = firstResult?.imageUrl || result.imageUrl;
        
        showNotification(
          `Successfully regenerated image for ${product.productName || product.name}`, 
          'success'
        );
        
        // Update local state
        setRecentGenerations(prev => 
          prev.map(gen => 
            gen.productId === productId 
              ? { 
                  ...gen, 
                  status: 'completed',
                  imageUrls: imageUrl ? [imageUrl] : [],
                  firebaseStored: firstResult?.firebaseStored || false,
                  timestamp: new Date()
                }
              : gen
          )
        );
        
        await loadDashboardData();
      } else {
        const errorMessage = result?.errors?.[0]?.error || result?.error || 'Regeneration failed';
        throw new Error(errorMessage);
      }
      
    } catch (error) {
      console.error('Regeneration error:', error);
      showNotification(`Failed to regenerate image: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add this test function at the top of the component after the existing functions
  const testServerEndpoints = async () => {
    const endpoints = [
      '/api/ai/generate-image',
      '/api/mcp/generate-product-images',
      '/api/ai/generate-catalog-images',
      '/api/mcp/status',
      '/api/mcp/capabilities',
      '/api/ai/health'
    ];

    console.log('🧪 Testing server endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        console.log(`${endpoint}: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          try {
            const data = await response.json();
            console.log(`  Response:`, data);
          } catch (e) {
            console.log(`  Response: Not JSON`);
          }
        }
      } catch (error) {
        console.log(`${endpoint}: ERROR - ${error.message}`);
      }
    }
    
    // Test POST to the endpoints we're trying to use
    console.log('\n🧪 Testing POST endpoints...');
    
    try {
      const testPost = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true })
      });
      
      console.log(`POST /api/ai/generate-image: ${testPost.status} ${testPost.statusText}`);
      const responseText = await testPost.text();
      console.log(`  Response:`, responseText);
      
    } catch (error) {
      console.log(`POST /api/ai/generate-image: ERROR - ${error.message}`);
    }
  };

  // FIXED: Critical fix for batch image generation
  const generateImagesForProducts = async (productIds) => {
    if (!productIds || productIds.length === 0) return;

    // Check if ProductSyncService is available
    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available - cannot generate images', 'error');
      return;
    }

    setIsGenerating(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      showNotification(`Generating images for ${productIds.length} products via ProductSyncService...`, 'info');

      // CRITICAL FIX: Process each product ID individually as a string
      for (const productId of productIds) {
        const product = allProducts.find(p => p.id === productId) || 
                       productsNeedingImages.find(p => p.id === productId);
        if (!product) continue;

        try {
          console.log(`Calling ProductSyncService.manualImageGeneration for ${product.name}`);
          console.log(`Product ID being passed: "${productId}" (type: ${typeof productId})`);
          
          // FIXED: Pass single productId as string, not in array
          const result = await productSyncService.manualImageGeneration(productId);
          console.log('ProductSyncService result:', result);
          
          if (result && (result.success || result.results?.length > 0)) {
            successCount++;
            
            const firstResult = result.results?.[0];
            const imageUrl = firstResult?.imageUrl || result.imageUrl;
            
            showNotification(`Generated image for ${product.name}`, 'success');
            
            setRecentGenerations(prev => [...prev, {
              id: Date.now() + Math.random(),
              productId: productId,
              productName: product.name,
              status: 'completed',
              imageUrls: imageUrl ? [imageUrl] : [],
              firebaseStored: firstResult?.firebaseStored || false,
              timestamp: new Date(),
              category: product.category || 'industrial'
            }]);
            
          } else {
            const errorMessage = result?.errors?.[0]?.error || result?.error || 'Image generation failed';
            throw new Error(errorMessage);
          }
          
        } catch (productError) {
          errorCount++;
          console.error(`Error generating image for product ${productId}:`, productError);
          showNotification(`Failed to generate image for ${product.name}: ${productError.message}`, 'error');
        }
        
        // Delay between generations
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      showNotification(
        `Batch complete: ${successCount} successful, ${errorCount} failed`, 
        successCount > 0 ? 'success' : 'error'
      );
      
    } catch (error) {
      console.error('Batch generation error:', error);
      showNotification(`Failed to generate images: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
      setSelectedProducts([]);
      await loadDashboardData();
    }
  };

  // Existing methods (keeping the same logic)
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

  const loadAllProducts = async () => {
    try {
      console.log('🔍 LOADALLPRODUCTS: Starting to load all products...');
      
      if (!isProductSyncServiceAvailable()) {
        console.warn('🔍 LOADALLPRODUCTS: ProductSyncService not available, using fallback');
        return getDemoProducts();
      }
      
      // CRITICAL FIX: Try multiple methods to get ALL products from products_public
      let allProducts = [];
      
      // Method 1: Try direct Firestore query first (most reliable)
      console.log('🔍 LOADALLPRODUCTS: Attempting to load all products from Firestore...');
      allProducts = await getAllProductsFromFirestore();
      console.log(`🔍 LOADALLPRODUCTS: Direct Firestore query returned ${allProducts.length} products`);
      
      // Method 2: If direct query fails, try ProductSyncService methods
      if (allProducts.length === 0) {
        console.log('🔍 LOADALLPRODUCTS: Fallback - Using ProductSyncService methods...');
        
        // Try getAllPublicProducts if it exists
        if (typeof productSyncService.getAllPublicProducts === 'function') {
          const result = await productSyncService.getAllPublicProducts();
          if (Array.isArray(result)) {
            allProducts = result;
          } else if (result && result.data && Array.isArray(result.data)) {
            allProducts = result.data;
          }
          console.log(`🔍 LOADALLPRODUCTS: getAllPublicProducts returned ${allProducts.length} products`);
        }
        
        // If still no products, try getProductsNeedingImages with high limit
        if (allProducts.length === 0) {
          console.log('🔍 LOADALLPRODUCTS: Final fallback - Using getProductsNeedingImages...');
          const products = await productSyncService.getProductsNeedingImages(100);
          
          if (Array.isArray(products)) {
            allProducts = products;
          } else if (products && products.data && Array.isArray(products.data)) {
            allProducts = products.data;
          } else if (products && products.success && Array.isArray(products.results)) {
            allProducts = products.results;
          }
          console.log(`🔍 LOADALLPRODUCTS: getProductsNeedingImages returned ${allProducts.length} products`);
        }
      }
      
      // Ensure all products have the necessary fields
      allProducts = allProducts.map(product => ({
        ...product,
        hasRealImage: hasRealImage(product),
        needsImageGeneration: !hasRealImage(product)
      }));
      
      const needingImagesCount = allProducts.filter(p => !hasRealImage(p)).length;
      console.log(`✅ LOADALLPRODUCTS: Final result - ${allProducts.length} total products, ${needingImagesCount} need images`);
      
      return allProducts;
      
    } catch (error) {
      console.error('🔍 LOADALLPRODUCTS: Error loading all products:', error);
      return getDemoProducts();
    }
  };

  // TEMPORARY COMPATIBILITY: Keep old function name but redirect to new function  
  const loadProductsNeedingImages = async () => {
    console.log('🔄 COMPATIBILITY: loadProductsNeedingImages called, redirecting to loadAllProducts...');
    return await loadAllProducts();
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
      description: 'High-pressure hydraulic pump for industrial applications',
      firebaseStorageComplete: false
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
      description: 'Precision pneumatic control valve with manual override',
      firebaseStorageComplete: false
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
      description: 'Inductive proximity sensor, M18 thread, PNP output',
      firebaseStorageComplete: false
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
    averageImageTime: 15800,
    // Enhanced Firebase Storage demo stats
    productsWithFirebaseStorage: 5,
    firebaseStorageRate: 20,
    manualUploads: 3,
    uploadErrors: 1
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
      
      // Check Firebase Storage health
      let firebaseStorageHealthy = false;
      let firebaseStorageEnabled = false;
      
      if (isProductSyncServiceAvailable() && productSyncService.storage) {
        firebaseStorageHealthy = true;
        firebaseStorageEnabled = true;
      }
      
      return {
        mcpApiHealthy: result.success || false,
        openaiAvailable: result.providers?.providers?.openai?.available || false,
        promptsLoaded: result.prompts?.total || 0,
        queueProcessing: false,
        lastCheck: new Date(),
        queueLength: productsNeedingImages.length,
        processingRate: 0,
        // Enhanced Firebase Storage health
        firebaseStorageHealthy,
        firebaseStorageEnabled
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
        processingRate: 0,
        firebaseStorageHealthy: false,
        firebaseStorageEnabled: false
      };
    }
  };

  const calculateRealStats = (syncData, productsArray = []) => {
    try {
      const totalProducts = syncData.totalPublic || 0;
      const productsWithImages = syncData.productsWithRealImages || 0;
      const productsNeedingImagesCount = syncData.productsNeedingImages || 0;
      const totalGenerated = syncData.totalImagesGenerated || 0;
      
      // Enhanced Firebase Storage stats
      const productsWithFirebaseStorage = syncData.productsWithFirebaseStorage || 0;
      const firebaseStorageRate = syncData.firebaseStorageRate || 0;
      const manualUploads = syncData.manualUploads || 0;
      const uploadErrors = syncData.uploadErrors || 0;
      
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
        // Enhanced Firebase Storage stats
        firebaseStorageRate,
        firebaseStorageEnabled: productsWithFirebaseStorage,
        manualUploads,
        uploadErrors,
        providerStats: {
          openai: {
            count: totalGenerated,
            percentage: 100,
            avgTime: (syncData.averageImageTime || 15800) / 1000,
            totalTime: totalGenerated * ((syncData.averageImageTime || 15800) / 1000),
            times: Array(Math.max(totalGenerated, 1)).fill((syncData.averageImageTime || 15800) / 1000)
          },
          firebase: {
            count: productsWithFirebaseStorage,
            percentage: totalProducts > 0 ? Math.round((productsWithFirebaseStorage / totalProducts) * 100) : 0,
            enabled: productsWithFirebaseStorage > 0
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
        providerStats: {},
        firebaseStorageRate: 0,
        firebaseStorageEnabled: false,
        manualUploads: 0,
        uploadErrors: 0
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

  // FIXED: Updated to use new image generation method
  const handleStartImageGeneration = async () => {
    if (selectedProducts.length === 0) {
      showNotification('Please select products to generate images for', 'error');
      return;
    }

    // Use ProductSyncService for generation
    await generateImagesForProducts(selectedProducts);
  };

  // FIXED: Updated retry method
  const handleRetryGeneration = async (productId) => {
    await regenerateImage(productId);
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

  const downloadImage = (imageUrl, filename) => {
    try {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      showNotification('Failed to download image', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
        <span className="text-gray-600">Loading enhanced image generation dashboard...</span>
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
            <Cloud className="w-6 h-6 text-green-600" title="Firebase Storage Enabled" />
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage OpenAI-powered product image generation with Firebase Storage
            {!serviceInitialized || !isProductSyncServiceAvailable() ? (
              <span className="text-orange-600"> (Demo Mode - ProductSyncService unavailable)</span>
            ) : null}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Add diagnostic test button */}
          <button
            onClick={testServerEndpoints}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            title="Test server endpoints - check console"
          >
            <Settings className="w-4 h-4 mr-2" />
            Test API
          </button>

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
              title="Fix database image field structure with Firebase Storage support"
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
            disabled={isGenerating || selectedProducts.length === 0}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            title="Generate images and store in Firebase Storage"
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

      {/* Enhanced System Health Status */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" />
            Enhanced System Health
          </h3>
          <span className="text-xs text-gray-500">
            Last check: {systemHealth?.lastCheck?.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
            <div className={`w-2 h-2 rounded-full ${systemHealth?.firebaseStorageHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-700">Firebase Storage</span>
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

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
              <p className="text-sm text-gray-600">Firebase Storage</p>
              <p className="text-2xl font-bold text-green-600">{stats?.firebaseStorageRate || 0}%</p>
            </div>
            <Database className="w-8 h-8 text-green-600" />
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

      {/* Enhanced Products Section with Tabs */}
      {(productsNeedingImages.length > 0 || allProducts.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Product Management
                {!serviceInitialized && <span className="text-sm text-orange-600 ml-2">(Demo Data)</span>}
              </h3>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    const currentProducts = activeTab === 'needing' ? productsNeedingImages : allProducts;
                    setSelectedProducts(currentProducts.map(p => p.id));
                  }}
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

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('needing')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'needing'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Needs Images ({productsNeedingImages.length})
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === 'all'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Products ({allProducts.length})
              </button>
            </div>
          </div>

          <div className="divide-y max-h-96 overflow-y-auto">
            {(activeTab === 'needing' ? productsNeedingImages : allProducts).map(product => (
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
                      {product.firebaseStorageComplete && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Firebase
                        </span>
                      )}
                      {hasRealImage(product) && !product.firebaseStorageComplete && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          <Cloud className="w-3 h-3 mr-1" />
                          OpenAI Only
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">{product.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* Manual Upload Button */}
                    <button
                      onClick={() => openUploadModal(product)}
                      className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Upload Images Manually"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    
                    {/* Regenerate/Generate Button - Show for ALL products */}
                    <button
                      onClick={() => regenerateImage(product.id)}
                      disabled={isGenerating}
                      className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                      title={hasRealImage(product) ? "Regenerate Image" : "Generate Image"}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
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

          {/* Empty State */}
          {((activeTab === 'needing' && productsNeedingImages.length === 0) || 
            (activeTab === 'all' && allProducts.length === 0)) && (
            <div className="text-center py-12">
              <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {activeTab === 'needing' ? 'No products need images' : 'No products found'}
              </h3>
              <p className="text-gray-600">
                {activeTab === 'needing' 
                  ? 'All products have images or switch to "All Products" tab to regenerate existing images.'
                  : 'No products are available in the database.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Generation History Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Image Generation History with Firebase Storage
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
                <th className="text-left py-3 px-6 text-sm font-medium text-gray-700">Storage</th>
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
                    <div className="flex items-center gap-1">
                      {generation.firebaseStored ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          <Database className="w-3 h-3 mr-1" />
                          Firebase
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          <Cloud className="w-3 h-3 mr-1" />
                          OpenAI
                        </span>
                      )}
                    </div>
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
                          title="Download image"
                          onClick={() => downloadImage(generation.imageUrls[0], `${generation.productName}-image.png`)}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      {(generation.status === 'failed' || generation.status === 'error' || generation.status === 'needed') && (
                        <button 
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          onClick={() => handleRetryGeneration(generation.productId)}
                          title="Generate image with Firebase Storage"
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

      {/* Manual Upload Modal */}
      {showUploadModal && selectedProductForUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-600" />
              Upload Images for {selectedProductForUpload.name}
            </h3>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={handleFileDrop}
            >
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop images here, or</p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelection(Array.from(e.target.files))}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Browse Files
              </label>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Selected files ({uploadingFiles.length}):</p>
                <div className="max-h-32 overflow-y-auto">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between py-1 text-sm">
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-500 ml-2">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3 mt-6">
              <button
                onClick={closeUploadModal}
                disabled={isUploading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={uploadManualImages}
                disabled={uploadingFiles.length === 0 || isUploading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  `Upload ${uploadingFiles.length} Image${uploadingFiles.length !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Product Detail Modal using ImagePreview component */}
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
