// src/components/mcp/ImageGenerationDashboard.jsx
// COMPLETE FIX: Resolved getAllProductsFromFirestore ReferenceError and product ID parsing issues
// UPDATED: Enhanced Firebase integration and proper error handling

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { collection, getDocs, query, orderBy, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Import shared ImagePreview component
import ImagePreview from './ImagePreview';

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
    firebaseStorageRate: 0,
    firebaseStorageEnabled: 0,
    manualUploads: 0,
    uploadErrors: 0
  });
  
  // Tab and product management state
  const [activeTab, setActiveTab] = useState('overview');
  const [allProducts, setAllProducts] = useState([]);
  const [productsNeedingImages, setProductsNeedingImages] = useState([]);
  const [completedProducts, setCompletedProducts] = useState([]);
  const [failedProducts, setFailedProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  
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
    firebaseStorageHealthy: false,
    firebaseStorageEnabled: false
  });
  
  // Search and filter state
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notification, setNotification] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Manual upload states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedProductForUpload, setSelectedProductForUpload] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const mcpServerUrl = 'https://supplier-mcp-server-production.up.railway.app';

  /**
   * 🔧 CRITICAL FIX: Missing getAllProductsFromFirestore function
   * This was causing the ReferenceError in the "All Products" tab
   */
  const getAllProductsFromFirestore = useCallback(async () => {
    console.log('🔍 LOADALLPRODUCTS: getAllProductsFromFirestore called');
    
    try {
      console.log('🔍 LOADALLPRODUCTS: Loading from products_public collection...');
      
      // Query the products_public collection (as shown in your logs)
      const productsRef = collection(db, 'products_public');
      const q = query(productsRef, orderBy('name')); // Order by name for better UX
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('📦 LOADALLPRODUCTS: No products found in products_public, trying products collection...');
        
        // Fallback to products collection
        const fallbackRef = collection(db, 'products');
        const fallbackQuery = query(fallbackRef, orderBy('name'));
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (fallbackSnapshot.empty) {
          console.log('📦 LOADALLPRODUCTS: No products found in either collection');
          return getDemoProducts();
        }
        
        const products = [];
        fallbackSnapshot.forEach((doc) => {
          const productData = doc.data();
          products.push(transformProductData(doc.id, productData));
        });
        
        console.log(`✅ LOADALLPRODUCTS: Loaded ${products.length} products from fallback collection`);
        return products;
      }
      
      const products = [];
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        products.push(transformProductData(doc.id, productData));
      });
      
      console.log(`✅ LOADALLPRODUCTS: Successfully loaded ${products.length} products from Firestore`);
      console.log('📊 LOADALLPRODUCTS: Product breakdown:', {
        total: products.length,
        needsImages: products.filter(p => p.needsImageGeneration && !p.hasCurrentImage).length,
        hasImages: products.filter(p => p.hasCurrentImage).length,
        aiGenerated: products.filter(p => p.aiImageGenerated).length
      });
      
      return products;
      
    } catch (error) {
      console.error('❌ LOADALLPRODUCTS: Error loading products from Firestore:', error);
      
      // Provide fallback demo products for testing
      console.log('🔄 LOADALLPRODUCTS: Using demo products due to error');
      return getDemoProducts();
    }
  }, []);

  /**
   * Transform product data from Firestore to dashboard format
   */
  const transformProductData = useCallback((docId, productData) => {
    return {
      id: docId,
      name: productData.name || productData.title || 'Unnamed Product',
      description: productData.description || '',
      category: productData.category || 'general',
      price: productData.price || 0,
      stock: productData.stock || 0,
      supplier: productData.supplier || productData.supplierName || 'Unknown Supplier',
      sku: productData.sku || productData.productCode,
      brand: productData.brand || '',
      
      // Image generation specific fields
      needsImageGeneration: productData.needsImageGeneration !== false, // Default to true
      hasCurrentImage: !!(productData.imageUrl || productData.image || productData.productImageUrl || productData.aiImageUrl),
      imageUrl: productData.imageUrl || productData.image || productData.productImageUrl || null,
      
      // AI Image generation fields
      aiImageUrl: productData.aiImageUrl || null,
      aiImageGenerated: !!productData.aiImageGenerated,
      aiImageStatus: productData.aiImageStatus || 'pending',
      aiImageGeneratedAt: productData.aiImageGeneratedAt || null,
      
      // Firebase Storage fields
      firebaseStorageComplete: productData.firebaseStorageComplete || false,
      
      // Status fields
      imageGenerationStatus: productData.imageGenerationStatus || 'needed',
      lastImageError: productData.lastImageError || null,
      
      // Additional fields for dashboard display
      status: productData.status || 'active',
      visibility: productData.visibility || 'private',
      featured: productData.featured || false,
      
      // Metadata
      createdAt: productData.createdAt || new Date(),
      updatedAt: productData.updatedAt || new Date()
    };
  }, []);

  /**
   * 🔧 UPDATED: loadAllProducts function with proper error handling
   */
  const loadAllProducts = useCallback(async () => {
    console.log('🔍 LOADALLPRODUCTS: Starting to load all products...');
    setIsLoading(true);
    
    try {
      // Use the newly created getAllProductsFromFirestore function
      const products = await getAllProductsFromFirestore();
      
      if (!products || products.length === 0) {
        console.log('📭 LOADALLPRODUCTS: No products found');
        setAllProducts([]);
        setFilteredProducts([]);
        setProductsNeedingImages([]);
        setCompletedProducts([]);
        setFailedProducts([]);
        return;
      }
      
      console.log(`✅ LOADALLPRODUCTS: Setting ${products.length} products in state`);
      setAllProducts(products);
      setFilteredProducts(products);
      
      // Categorize products
      const needingImages = products.filter(p => !hasRealImage(p));
      const completed = products.filter(p => hasRealImage(p));
      const failed = products.filter(p => getProductImageStatus(p) === 'failed');
      
      setProductsNeedingImages(needingImages);
      setCompletedProducts(completed);
      setFailedProducts(failed);
      
    } catch (error) {
      console.error('❌ LOADALLPRODUCTS: Error in loadAllProducts:', error);
      
      // Set empty arrays on error
      setAllProducts([]);
      setFilteredProducts([]);
      setProductsNeedingImages([]);
      setCompletedProducts([]);
      setFailedProducts([]);
      
      // Show user-friendly error message
      setErrorMessage('Failed to load products. Please refresh the page.');
      
    } finally {
      setIsLoading(false);
      console.log('✅ LOADALLPRODUCTS: Loading completed');
    }
  }, [getAllProductsFromFirestore]);

  // Load products needing images - redirects to loadAllProducts for compatibility
  const loadProductsNeedingImages = useCallback(async () => {
    console.log('🔄 COMPATIBILITY: loadProductsNeedingImages called, redirecting to loadAllProducts...');
    return await loadAllProducts();
  }, [loadAllProducts]);

  // Initialize dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const [healthData, productsData, syncStats, storageStats] = await Promise.allSettled([
        fetchSystemHealth(),
        loadAllProducts(),
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
      
      // Update statistics
      if (syncStats.status === 'fulfilled' && syncStats.value && typeof syncStats.value === 'object') {
        const statsData = calculateRealStats(syncStats.value, allProducts);
        
        // Merge storage stats if available
        if (storageStats.status === 'fulfilled' && storageStats.value) {
          statsData.firebaseStorageEnabled = storageStats.value.enabled || false;
          statsData.manualUploads = storageStats.value.stats?.manualUploads || 0;
          statsData.uploadErrors = storageStats.value.stats?.errors || 0;
        }
        
        setStats(statsData);
      }
      
      updateGenerationHistory();
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      showNotification('Failed to load dashboard data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [loadAllProducts, allProducts]);

  // Update generation history based on products
  const updateGenerationHistory = useCallback(() => {
    if (!allProducts.length) return;

    const generationHistory = allProducts.map(product => ({
      id: product.id,
      productId: product.id,
      productName: product.name || 'Unknown Product',
      category: product.category || 'general',
      imagesGenerated: hasRealImage(product) ? ['primary'] : [],
      status: getProductImageStatus(product),
      provider: 'openai',
      processingTime: '15.2s',
      timestamp: product.lastImageError || product.aiImageGeneratedAt || new Date(),
      prompt: generateImagePrompt(product),
      imageUrls: getProductImageUrls(product),
      error: product.imageGenerationStatus === 'error' ? 'Generation failed' : null,
      firebaseStored: product.firebaseStorageComplete || false,
      storageProvider: product.firebaseStorageComplete ? 'firebase' : 'openai'
    }));
    
    setRecentGenerations(generationHistory);
  }, [allProducts]);

  // Update generation history when products change
  useEffect(() => {
    updateGenerationHistory();
  }, [allProducts, updateGenerationHistory]);

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      console.log('🚀 ImageGenerationDashboard initializing...');
      
      // Check for ProductSyncService
      const initialized = await initializeProductSyncService();
      setServiceInitialized(initialized);
      
      if (initialized && isProductSyncServiceAvailable()) {
        console.log('✅ ProductSyncService is fully available');
        await fixProductImageFields();
      } else {
        console.log('⚠️ ProductSyncService not available, using demo mode');
      }

      await loadDashboardData();
    };
    
    initialize();
    
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  // Filter and sort products
  const processProducts = useCallback((products) => {
    let processed = [...products];

    // Apply search filter
    if (searchTerm) {
      processed = processed.filter(product =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      processed = processed.filter(product => {
        const status = getProductImageStatus(product);
        return status === filterStatus;
      });
    }

    // Apply sorting
    processed.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    return processed;
  }, [searchTerm, filterStatus, sortBy, sortOrder]);

  // Update filtered products when filters change
  useEffect(() => {
    const currentProducts = getCurrentTabProducts();
    const filtered = processProducts(currentProducts);
    setFilteredProducts(filtered);
  }, [allProducts, productsNeedingImages, completedProducts, failedProducts, activeTab, processProducts]);

  // Get products for current tab
  const getCurrentTabProducts = useCallback(() => {
    switch (activeTab) {
      case 'needed':
        return productsNeedingImages;
      case 'completed':
        return completedProducts;
      case 'failed':
        return failedProducts;
      case 'all':
        return allProducts;
      default:
        return allProducts;
    }
  }, [activeTab, allProducts, productsNeedingImages, completedProducts, failedProducts]);

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

  // Manual upload functionality
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

  const uploadManualImages = async () => {
    if (!selectedProductForUpload || uploadingFiles.length === 0) return;

    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available - cannot upload images', 'error');
      return;
    }

    setIsUploading(true);
    showNotification(`Uploading ${uploadingFiles.length} images to Firebase Storage...`, 'info');

    try {
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
      
      closeUploadModal();
      await loadDashboardData();
      
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(`Failed to upload images: ${error.message}`, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // 🔧 CRITICAL FIX: Single product generation with proper ID handling
  const handleSingleGeneration = useCallback(async (product) => {
    if (!isProductSyncServiceAvailable()) {
      showNotification('ProductSyncService not available', 'error');
      return;
    }

    try {
      setIsGenerating(true);
      const productId = typeof product === 'object' ? product.id : product;
      const productName = typeof product === 'object' ? product.name : 'Unknown Product';
      
      console.log(`🎯 Generating image for product: ${productId} - ${productName}`);
      console.log(`🔧 Product ID type: ${typeof productId}, value: "${productId}"`);
      
      // CRITICAL FIX: Ensure productId is passed as string, not array
      const result = await productSyncService.manualImageGeneration(productId);
      
      if (result && (result.success || result.results?.length > 0)) {
        showNotification(`Image generated successfully for ${productName}`, 'success');
        await loadDashboardData(); // Refresh data
      } else {
        const error = result?.error || result?.errors?.[0]?.error || 'Unknown error occurred';
        showNotification(`Failed to generate image for ${productName}: ${error}`, 'error');
      }
    } catch (error) {
      console.error('Single generation error:', error);
      showNotification(`Error generating image: ${error.message}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [isProductSyncServiceAvailable, loadDashboardData]);

  // 🔧 CRITICAL FIX: Batch generation with proper ID handling
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
      
      // CRITICAL FIX: Process each product ID individually as a string
      for (const productId of selectedProducts) {
        const product = allProducts.find(p => p.id === productId) || 
                       productsNeedingImages.find(p => p.id === productId);
        if (!product) continue;

        try {
          console.log(`Processing product: ${productId} - ${product.name}`);
          console.log(`Product ID type: ${typeof productId}, value: "${productId}"`);
          
          // FIXED: Pass single productId as string, not in array
          const result = await productSyncService.manualImageGeneration(productId);
          
          if (result && (result.success || result.results?.length > 0)) {
            successCount++;
            console.log(`✅ Generated image for ${product.name}`);
          } else {
            const errorMessage = result?.errors?.[0]?.error || result?.error || 'Image generation failed';
            throw new Error(errorMessage);
          }
          
        } catch (productError) {
          errorCount++;
          console.error(`❌ Error generating image for product ${productId}:`, productError);
        }
        
        // Delay between generations to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      showNotification(
        `Batch generation completed: ${successCount} successful, ${errorCount} failed`, 
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
  }, [selectedProducts, isProductSyncServiceAvailable, allProducts, productsNeedingImages, loadDashboardData]);

  // Retry generation for failed products
  const handleRetryGeneration = useCallback(async (productId) => {
    const product = allProducts.find(p => p.id === productId) || 
                   productsNeedingImages.find(p => p.id === productId) || 
                   recentGenerations.find(g => g.productId === productId);
    
    if (!product) {
      showNotification('Product not found', 'error');
      return;
    }

    await handleSingleGeneration(product);
  }, [allProducts, productsNeedingImages, recentGenerations, handleSingleGeneration]);

  // Toggle product selection
  const toggleProductSelection = useCallback((productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  // Helper functions for product status and images
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
  }, []);

  const hasRealImage = useCallback((product) => {
    const imageUrl = product.imageUrl || product.image_url || product.photo || product.aiImageUrl || '';
    
    if (!imageUrl) return false;
    
    return imageUrl.includes('oaidalleapi') || 
           imageUrl.includes('blob.core.windows.net') ||
           imageUrl.includes('generated') ||
           imageUrl.includes('ai-image') ||
           imageUrl.includes('firebasestorage') ||
           (imageUrl.startsWith('https://') && !isPlaceholderImage(imageUrl));
  }, []);

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

  const getProductImageUrls = useCallback((product) => {
    const urls = [];
    
    const imageFields = ['imageUrl', 'image_url', 'image', 'photo', 'pictures', 'thumbnail', 'aiImageUrl'];
    
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
  }, [isPlaceholderImage]);

  const generateImagePrompt = useCallback((product) => {
    const category = product.category || 'component';
    const name = product.name || 'product';
    const brand = product.brand || '';
    
    return `Professional industrial ${category} photography of ${name}${brand ? ` by ${brand}` : ''}, high quality product shot, white background, commercial lighting`;
  }, []);

  const isProductSyncServiceAvailable = useCallback(() => {
    if (!productSyncService) return false;
    
    const requiredMethods = [
      'manualImageGeneration'
    ];
    
    for (const method of requiredMethods) {
      if (typeof productSyncService[method] !== 'function') {
        console.warn(`ProductSyncService missing method: ${method}`);
        return false;
      }
    }
    
    return true;
  }, []);

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
      hasCurrentImage: false,
      imageUrl: null,
      aiImageUrl: null,
      sku: 'IHP-001',
      brand: 'HydroTech',
      description: 'High-pressure hydraulic pump for industrial applications',
      firebaseStorageComplete: false,
      needsImageGeneration: true,
      supplier: 'HydroTech Industries'
    },
    {
      id: 'demo-2', 
      name: 'Pneumatic Control Valve',
      category: 'pneumatics',
      imageGenerationStatus: 'needed',
      hasRealImage: false,
      hasCurrentImage: false,
      imageUrl: null,
      aiImageUrl: null,
      sku: 'PCV-002',
      brand: 'AirPro',
      description: 'Precision pneumatic control valve with manual override',
      firebaseStorageComplete: false,
      needsImageGeneration: true,
      supplier: 'AirPro Systems'
    },
    {
      id: 'demo-3',
      name: 'Proximity Sensor M18',
      category: 'sensors', 
      imageGenerationStatus: 'needed',
      hasRealImage: false,
      hasCurrentImage: false,
      imageUrl: null,
      aiImageUrl: null,
      sku: 'PS-M18-003',
      brand: 'SensorTech',
      description: 'Inductive proximity sensor, M18 thread, PNP output',
      firebaseStorageComplete: false,
      needsImageGeneration: true,
      supplier: 'SensorTech Solutions'
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
      const totalProducts = productsArray.length || syncData.totalPublic || 0;
      const productsWithImages = productsArray.filter(p => hasRealImage(p)).length || syncData.productsWithRealImages || 0;
      const productsNeedingImagesCount = productsArray.filter(p => !hasRealImage(p)).length || syncData.productsNeedingImages || 0;
      const totalGenerated = syncData.totalImagesGenerated || productsWithImages;
      
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
        successRate: totalProducts > 0 ? Math.round((productsWithImages / totalProducts) * 100) : 0,
        averageTime: (syncData.averageImageTime || 15800) / 1000,
        topCategories,
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

  const filteredGenerations = useMemo(() => {
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

  // Memoized tab content
  const tabContent = useMemo(() => {
    const currentProducts = getCurrentTabProducts();
    const displayProducts = filteredProducts.length > 0 ? filteredProducts : currentProducts;

    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">Quick Actions</h3>
              <div className="flex gap-4">
                <button
                  onClick={loadDashboardData}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Data
                </button>
                <button
                  onClick={handleBatchGeneration}
                  disabled={isGenerating || productsNeedingImages.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Generate All Missing Images ({productsNeedingImages.length})
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {completedProducts.slice(0, 5).map(product => (
                  <div key={product.id} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-600">
                      Image generated for <strong>{product.name}</strong>
                    </span>
                  </div>
                ))}
                {completedProducts.length === 0 && (
                  <p className="text-sm text-gray-500">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <ProductTable
            products={displayProducts}
            isLoading={isLoading}
            onGenerate={handleSingleGeneration}
            onViewDetails={setSelectedProduct}
            selectedProducts={selectedProducts}
            onToggleSelect={toggleProductSelection}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
            getProductImageStatus={getProductImageStatus}
            isGenerating={isGenerating}
            showCheckboxes={activeTab !== 'overview'}
            showRetry={activeTab === 'failed'}
            onUpload={openUploadModal}
          />
        );
    }
  }, [
    activeTab,
    isLoading,
    isGenerating,
    productsNeedingImages,
    completedProducts,
    filteredProducts,
    selectedProducts,
    loadDashboardData,
    handleBatchGeneration,
    handleSingleGeneration,
    toggleProductSelection,
    getStatusIcon,
    getStatusColor,
    getProductImageStatus,
    getCurrentTabProducts,
    openUploadModal
  ]);

  if (isLoading && allProducts.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
            {!serviceInitialized || !isProductSyncServiceAvailable() ? (
              <span className="text-orange-600"> (Demo Mode - ProductSyncService unavailable)</span>
            ) : null}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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
            onClick={handleBatchGeneration}
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

      {/* Statistics Cards */}
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'needed', label: `Needs Images (${productsNeedingImages.length})`, icon: Clock },
            { id: 'completed', label: `Completed (${completedProducts.length})`, icon: CheckCircle },
            { id: 'failed', label: `Failed (${failedProducts.length})`, icon: AlertCircle },
            { id: 'all', label: `All Products (${allProducts.length})`, icon: FileImage }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filters and Controls for product tabs */}
      {activeTab !== 'overview' && (
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="needed">Needs Images</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="supplier">Supplier</option>
                <option value="updatedAt">Updated</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Actions */}
      {activeTab !== 'overview' && selectedProducts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedProducts([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Selection
              </button>
              <button
                onClick={handleBatchGeneration}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isGenerating ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isGenerating ? 'Generating...' : 'Generate Images'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {tabContent}

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

// Product Table Component
const ProductTable = ({ 
  products, 
  isLoading, 
  onGenerate, 
  onViewDetails, 
  selectedProducts = [],
  onToggleSelect,
  getStatusIcon,
  getStatusColor,
  getProductImageStatus,
  isGenerating,
  showCheckboxes = false,
  showRetry = false,
  onUpload
}) => {
  if (isLoading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileImage className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>No products found</p>
      </div>
    );
  }

  const hasRealImage = (product) => {
    const imageUrl = product.imageUrl || product.image_url || product.photo || product.aiImageUrl || '';
    
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
    
    const imageFields = ['imageUrl', 'image_url', 'image', 'photo', 'pictures', 'thumbnail', 'aiImageUrl'];
    
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
    
    return [...new Set(urls)];
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showCheckboxes && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedProducts.length === products.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        products.forEach(product => {
                          if (!selectedProducts.includes(product.id)) {
                            onToggleSelect(product.id);
                          }
                        });
                      } else {
                        products.forEach(product => {
                          if (selectedProducts.includes(product.id)) {
                            onToggleSelect(product.id);
                          }
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Supplier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => {
              const status = getProductImageStatus(product);
              const hasImage = hasRealImage(product);
              const imageUrls = getProductImageUrls(product);
              
              return (
                <tr key={product.id} className="hover:bg-gray-50">
                  {showCheckboxes && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => onToggleSelect(product.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {product.description}
                        {product.sku && <span className="ml-2">({product.sku})</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {product.category?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.supplier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
                        {getStatusIcon(status)}
                        <span className="ml-1 capitalize">{status}</span>
                      </span>
                      {product.firebaseStorageComplete && (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Firebase
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {hasImage && imageUrls.length > 0 ? (
                      <img
                        src={imageUrls[0]}
                        alt={product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        onError={(e) => {
                          e.target.src = '/api/placeholder/40/40';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Camera className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => onViewDetails(product)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {onUpload && (
                        <button
                          onClick={() => onUpload(product)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Upload Images Manually"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                      {(status === 'needed' || (showRetry && status === 'failed') || status === 'completed') && (
                        <button
                          onClick={() => onGenerate(product)}
                          disabled={isGenerating}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title={showRetry || status === 'completed' ? 'Regenerate Image' : 'Generate Image'}
                        >
                          {isGenerating ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ImageGenerationDashboard;
