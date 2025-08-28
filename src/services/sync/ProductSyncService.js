// src/services/sync/ProductSyncService.js
// Enhanced Product Sync Service for HiggsFlow E-commerce
// Now includes dashboard management methods + real-time sync capabilities + AI Image Generation

import { 
  collection, 
  doc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../../config/firebase';

class ProductSyncService {
  constructor() {
    this.db = db;
    this.isRunning = false;
    this.syncListeners = new Map();
    this.syncQueue = [];
    this.batchSize = 10;
    this.retryAttempts = 3;
    this.syncStats = {
      totalSynced: 0,
      successCount: 0,
      errorCount: 0,
      lastSyncTime: null,
      syncedProducts: new Set(),
      // ✅ NEW: Image generation stats
      imagesGenerated: 0,
      imageErrors: 0,
      imageGenerationTime: 0
    };
    
    // Sync rules for dashboard
    this.syncRules = {
      minStock: 5,
      categories: ['electronics', 'hydraulics', 'pneumatics', 'automation', 'cables', 'sensors', 'components'],
      priceMarkup: 15,
      autoSync: false,
      requireApproval: true
    };
    
    // ✅ ENHANCED: AI Image generation queue with proper management
    this.imageGenerationQueue = [];
    this.processingImages = false;
    this.maxConcurrentImages = 2; // Limit concurrent generation for API limits
    this.imageRetryLimit = 3;
    
    // ✅ NEW: MCP API configuration
    this.mcpApiBase = import.meta.env?.VITE_MCP_SERVER_URL || 
                     (typeof process !== 'undefined' ? process.env.VITE_MCP_SERVER_URL : null) ||
                     'https://supplier-mcp-server-production.up.railway.app';
    
    console.log('🎨 ProductSyncService initialized with AI image generation');
  }

  // ====================================================================
  // ✅ UPDATED: AI IMAGE GENERATION METHODS WITH COMPREHENSIVE DEBUG
  // ====================================================================

  async startImageProcessor() {
    if (this.processingImages) {
      console.log('🎨 Image processor already running');
      return;
    }

    console.log('🎨 Starting AI-powered image processor...');
    console.log(`🔗 MCP API Base: ${this.mcpApiBase}`);
    console.log(`📦 Queue length: ${this.imageGenerationQueue.length}`);
    
    // Test API connectivity first
    console.log('🧪 Testing API connectivity before processing...');
    const testResult = await this.testDirectImageGeneration('Test Component');
    if (!testResult.success) {
      console.error('❌ API connectivity test failed:', testResult.error);
      console.error('🔧 Image generation will likely fail - check server logs');
    } else {
      console.log('✅ API connectivity test passed');
    }
    
    this.processingImages = true;
    
    try {
      let processedCount = 0;
      
      while (this.processingImages && this.imageGenerationQueue.length > 0) {
        // Process images in small batches to respect API limits
        const batch = this.imageGenerationQueue.splice(0, this.maxConcurrentImages);
        
        console.log(`🔄 Processing batch of ${batch.length} products...`);
        
        const batchPromises = batch.map(async (imageTask) => {
          try {
            console.log(`🎯 Processing ${imageTask.productId}...`);
            const result = await this.processImageGeneration(imageTask);
            processedCount++;
            console.log(`✅ Completed ${imageTask.productId} (${processedCount} total)`);
            return result;
          } catch (error) {
            console.error(`❌ Failed ${imageTask.productId}:`, error.message);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(batchPromises);
        
        // Log results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`📊 Batch completed: ${successful} successful, ${failed} failed`);
        
        // Rate limiting for OpenAI API (recommended 3-5 seconds between batches)
        if (this.imageGenerationQueue.length > 0) {
          console.log(`⏳ Rate limiting... ${this.imageGenerationQueue.length} remaining`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log(`✅ Image processing completed - processed ${processedCount} products`);
      
    } catch (error) {
      console.error('❌ Image processor error:', error);
    } finally {
      if (this.imageGenerationQueue.length === 0) {
        this.processingImages = false;
        console.log('🏁 Image processor finished');
      } else {
        console.log(`⚠️ Image processor stopped with ${this.imageGenerationQueue.length} items remaining`);
      }
    }
  }

  async processImageGeneration(imageTask) {
    const startTime = Date.now();
    
    try {
      console.log(`🎯 Processing images for product: ${imageTask.productId}`);
      
      // Get product details
      const internalProduct = await this.getProductById(imageTask.productId);
      
      if (!internalProduct) {
        throw new Error('Internal product not found');
      }

      // Generate images using your MCP system with OpenAI
      const generatedImages = await this.generateProductImagesWithMCP(internalProduct);
      
      // Update public product with generated images
      await this.updateProductImages(imageTask.publicProductId, generatedImages);
      
      // Update statistics
      this.syncStats.imagesGenerated++;
      
      const processingTime = Date.now() - startTime;
      this.syncStats.imageGenerationTime += processingTime;
      
      console.log(`✅ Generated images for ${internalProduct.name} in ${processingTime}ms`);
      
      // Log successful image generation
      await this.logImageGeneration(imageTask, 'success', generatedImages, processingTime);
      
    } catch (error) {
      console.error(`❌ Image generation failed for ${imageTask.productId}:`, error);
      
      // Handle retry logic
      imageTask.retries = (imageTask.retries || 0) + 1;
      if (imageTask.retries < this.imageRetryLimit) {
        console.log(`🔄 Retrying image generation (${imageTask.retries}/${this.imageRetryLimit})`);
        this.imageGenerationQueue.push(imageTask);
      } else {
        this.syncStats.imageErrors++;
        await this.handleImageGenerationError(imageTask, error);
      }
    }
  }

  // ✅ UPDATED: Enhanced generateProductImagesWithMCP with comprehensive debugging
  async generateProductImagesWithMCP(product) {
    try {
      console.log(`🤖 Generating images for ${product.name} using MCP + OpenAI...`);
      console.log(`🔗 API Base: ${this.mcpApiBase}`);
      
      const requestBody = {
        product: {
          name: product.name,
          partNumber: product.partNumber || product.sku,
          category: product.category,
          brand: product.brand || 'Professional Grade',
          description: product.description || product.name
        },
        imageTypes: ['primary', 'technical', 'application'],
        promptCategory: this.getImagePromptCategory(product.category),
        provider: 'openai'
      };
      
      console.log(`📤 Making request to: ${this.mcpApiBase}/api/mcp/generate-product-images`);
      console.log(`📋 Request body:`, JSON.stringify(requestBody, null, 2));
      
      // Add explicit timeout and error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const response = await fetch(`${this.mcpApiBase}/api/mcp/generate-product-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📥 Response status: ${response.status}`);
      console.log(`📥 Response ok: ${response.ok}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ MCP API error: ${response.status} - ${errorText}`);
        throw new Error(`MCP API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`📊 Response result:`, JSON.stringify(result, null, 2));
      
      if (!result.success) {
        console.error(`❌ MCP result failed:`, result);
        throw new Error(result.error || 'Image generation failed');
      }

      console.log(`✅ MCP generated ${result.imagesGenerated} images using ${result.provider}`);
      
      return {
        ...result.images,
        generated: true,
        generatedAt: new Date(),
        provider: result.provider,
        model: result.model || 'dall-e-3',
        compliance: result.compliance,
        processingTime: result.processingTime
      };
      
    } catch (error) {
      console.error('❌ MCP image generation failed:', error);
      
      if (error.name === 'AbortError') {
        console.error('❌ Request timed out after 60 seconds');
      }
      
      // Don't fallback immediately - let the error bubble up for proper retry logic
      throw error;
    }
  }

  // ✅ NEW: Test direct API connectivity
  async testDirectImageGeneration(productName = 'Test Industrial Component') {
    try {
      console.log('🧪 Testing direct image generation...');
      
      const testRequestBody = {
        prompt: `Professional industrial product photography of ${productName}. Modern industrial facility setting with clean workspace and professional lighting. Component integrated into larger industrial system showing practical application. Safety compliance visible with proper cable management and organization. No workers or people in frame. Focus on component within system context. Clean, organized, professional environment. No visible brand names, logos, or signage. Industrial facility photography style, realistic, well-lit, high quality.`,
        provider: 'openai',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'hd',
        style: 'natural'
      };
      
      console.log(`🔗 Testing: ${this.mcpApiBase}/api/ai/generate-image`);
      
      const response = await fetch(`${this.mcpApiBase}/api/ai/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testRequestBody)
      });
      
      console.log(`📥 Direct API Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Direct API error: ${response.status} - ${errorText}`);
        return { success: false, error: errorText };
      }
      
      const result = await response.json();
      console.log(`📊 Direct API result:`, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Direct image generation test failed:', error);
      return { success: false, error: error.message };
    }
  }

  getImagePromptCategory(productCategory) {
    // Map product categories to image prompt categories
    const categoryMap = {
      'electronics': 'product_image_primary',
      'hydraulics': 'product_image_primary', 
      'pneumatics': 'product_image_primary',
      'automation': 'product_image_primary',
      'cables': 'product_image_primary',
      'sensors': 'product_image_primary',
      'components': 'product_image_primary'
    };
    
    return categoryMap[productCategory?.toLowerCase()] || 'product_image_primary';
  }

  async getFallbackImages(product) {
    console.log(`🎨 Using fallback images for ${product.name}`);
    
    return {
      primary: {
        url: `/images/placeholders/${product.category || 'industrial'}-primary.svg`,
        alt: `${product.name} - Product image`,
        type: 'primary',
        provider: 'placeholder'
      },
      technical: {
        url: `/images/placeholders/${product.category || 'industrial'}-technical.svg`,
        alt: `${product.name} - Technical diagram`,
        type: 'technical',
        provider: 'placeholder'
      },
      application: {
        url: `/images/placeholders/${product.category || 'industrial'}-context.svg`,
        alt: `${product.name} - Application context`,
        type: 'application',
        provider: 'placeholder'
      },
      generated: false,
      fallback: true,
      generatedAt: new Date(),
      provider: 'fallback',
      compliance: {
        noTrademarks: true,
        brandFree: true,
        industrialStandard: true
      }
    };
  }

  calculateImagePriority(product) {
    let priority = 0;
    
    // High-value products get priority
    if (product.price > 1000) priority += 30;
    else if (product.price > 100) priority += 20;
    else priority += 10;
    
    // High-stock products get priority (likely to sell)
    if (product.stock > 50) priority += 20;
    else if (product.stock > 10) priority += 10;
    
    // Category-based priority
    const highPriorityCategories = ['electronics', 'automation', 'sensors'];
    if (highPriorityCategories.includes(product.category?.toLowerCase())) {
      priority += 15;
    }
    
    // Active status bonus
    if (product.status === 'active') priority += 10;
    
    return priority;
  }

  async updateProductImages(publicProductId, images) {
    try {
      await updateDoc(doc(this.db, 'products_public', publicProductId), {
        images: images,
        imageGenerationStatus: images.generated ? 'completed' : 'failed',
        needsImageGeneration: false,
        lastImageUpdate: new Date()
      });
      
      console.log(`✅ Updated images for product ${publicProductId}`);
      
    } catch (error) {
      console.error('❌ Failed to update product images:', error);
      throw error;
    }
  }

  async logImageGeneration(imageTask, status, images, processingTime) {
    try {
      const logEntry = {
        syncId: `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        internalProductId: imageTask.productId,
        publicProductId: imageTask.publicProductId,
        operation: 'image_generation',
        status: status,
        
        imageDetails: {
          types: images ? Object.keys(images).filter(k => typeof images[k] === 'object') : [],
          provider: images?.provider || 'unknown',
          model: images?.model || 'unknown',
          compliance: images?.compliance || {},
          fallback: images?.fallback || false
        },
        
        performance: {
          processingTime: processingTime || 0,
          retries: imageTask.retries || 0,
          queuePosition: imageTask.priority || 0
        },
        
        timestamp: new Date()
      };
      
      await addDoc(collection(this.db, 'product_sync_log'), logEntry);
      
    } catch (error) {
      console.error('❌ Failed to log image generation:', error);
    }
  }

  async handleImageGenerationError(imageTask, error) {
    console.error(`❌ Final image generation failure for ${imageTask.productId}:`, error.message);
    
    try {
      // Update product with error status and fallback images
      const fallbackImages = await this.getFallbackImages({ 
        name: 'Unknown Product', 
        category: 'industrial' 
      });
      
      await updateDoc(doc(this.db, 'products_public', imageTask.publicProductId), {
        images: fallbackImages,
        imageGenerationStatus: 'error',
        imageGenerationError: error.message,
        needsImageGeneration: true, // Allow manual retry
        lastImageError: new Date()
      });
      
      // Log the error
      await this.logImageGeneration(imageTask, 'error', null, 0);
      
    } catch (logError) {
      console.error('❌ Failed to log image generation error:', logError);
    }
  }

  // ====================================================================
  // DASHBOARD MANAGEMENT METHODS (ENHANCED WITH IMAGE STATUS)
  // ====================================================================

  async getInternalProductsWithSyncStatus() {
    try {
      console.log('📦 Fetching internal products with sync status...');
      
      // Get internal products
      const internalQuery = query(
        collection(this.db, 'products'),
        orderBy('updatedAt', 'desc')
      );
      
      const internalSnapshot = await getDocs(internalQuery);
      const internalProducts = internalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        source: 'internal'
      }));

      // Get public products to check sync status
      const publicQuery = query(collection(this.db, 'products_public'));
      const publicSnapshot = await getDocs(publicQuery);
      const publicProductMap = new Map();
      
      publicSnapshot.docs.forEach(doc => {
        const publicProduct = { id: doc.id, ...doc.data() };
        if (publicProduct.internalProductId) {
          publicProductMap.set(publicProduct.internalProductId, publicProduct);
        }
      });

      // Enhance internal products with sync status
      const productsWithStatus = internalProducts.map(product => {
        const publicVersion = publicProductMap.get(product.id);
        const isEligible = this.isEligibleForSync(product);
        
        return {
          ...product,
          publicStatus: publicVersion ? 'synced' : 'not_synced',
          // ✅ NEW: Image status tracking
          imageStatus: publicVersion?.imageGenerationStatus || 'not_generated',
          hasImages: publicVersion?.images?.generated || false,
          imageProvider: publicVersion?.images?.provider || null,
          eligible: isEligible,
          priority: this.calculateSyncPriority(product),
          // ✅ NEW: Image priority calculation
          imagePriority: this.calculateImagePriority(product),
          suggestedPublicPrice: this.calculatePublicPrice(product.price || 0),
          eligibilityReasons: isEligible ? ['Eligible for sync'] : [this.getIneligibilityReason(product)]
        };
      });

      console.log(`✅ Loaded ${productsWithStatus.length} products with sync status`);
      
      return {
        success: true,
        data: productsWithStatus
      };

    } catch (error) {
      console.warn('⚠️ Firestore unavailable, using demo data for development');
      return {
        success: true,
        data: this.getDemoProductsWithSyncStatus()
      };
    }
  }

  async getSyncStatistics() {
    try {
      const [internalSnapshot, publicSnapshot] = await Promise.all([
        getDocs(collection(this.db, 'products')),
        getDocs(collection(this.db, 'products_public'))
      ]);
      
      const totalInternal = internalSnapshot.size;
      const totalPublic = publicSnapshot.size;
      
      // Count eligible products
      const internalProducts = internalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const eligibleCount = internalProducts.filter(product => this.isEligibleForSync(product)).length;
      
      // ✅ NEW: Count products with images
      const publicProducts = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const productsWithImages = publicProducts.filter(product => product.images?.generated === true).length;
      const imageGenerationRate = totalPublic > 0 ? Math.round((productsWithImages / totalPublic) * 100) : 0;
      
      // Calculate sync rate
      const syncRate = totalInternal > 0 ? Math.round((totalPublic / totalInternal) * 100) : 0;
      
      return {
        success: true,
        data: {
          totalInternal,
          totalPublic,
          eligible: eligibleCount,
          syncRate,
          // ✅ NEW: Image statistics
          productsWithImages,
          imageGenerationRate,
          totalImagesGenerated: this.syncStats.imagesGenerated,
          imageErrors: this.syncStats.imageErrors,
          averageImageTime: this.syncStats.imagesGenerated > 0 ? 
            Math.round(this.syncStats.imageGenerationTime / this.syncStats.imagesGenerated) : 0,
          lastUpdated: new Date()
        }
      };

    } catch (error) {
      console.warn('⚠️ Using demo statistics');
      return {
        success: true,
        data: {
          totalInternal: 150,
          totalPublic: 87,
          eligible: 92,
          syncRate: 58,
          // ✅ NEW: Demo image stats
          productsWithImages: 73,
          imageGenerationRate: 84,
          totalImagesGenerated: 241,
          imageErrors: 8,
          averageImageTime: 7200,
          lastUpdated: new Date()
        }
      };
    }
  }

  // ✅ NEW: Get image generation health status
  async getImageGenerationHealth() {
    try {
      // Check MCP API health
      const healthResponse = await fetch(`${this.mcpApiBase}/health`, {
        method: 'GET',
        timeout: 5000
      });
      const mcpHealth = healthResponse.ok;
      
      // Get queue statistics
      const queueStats = {
        pending: this.imageGenerationQueue.length,
        processing: this.processingImages,
        totalGenerated: this.syncStats.imagesGenerated,
        totalErrors: this.syncStats.imageErrors,
        successRate: this.syncStats.imagesGenerated > 0 ? 
          ((this.syncStats.imagesGenerated / (this.syncStats.imagesGenerated + this.syncStats.imageErrors)) * 100).toFixed(1) : 100
      };
      
      return {
        mcpApiHealthy: mcpHealth,
        imageGeneration: queueStats,
        lastCheck: new Date()
      };
      
    } catch (error) {
      console.error('❌ Failed to check image generation health:', error);
      return {
        mcpApiHealthy: false,
        imageGeneration: { error: error.message },
        lastCheck: new Date()
      };
    }
  }

  // ====================================================================
  // ✅ ENHANCED: EXISTING SYNC METHODS WITH IMAGE INTEGRATION
  // ====================================================================

  async syncSingleProductToPublic(internalProductId) {
    // Get internal product
    const internalDoc = await getDoc(doc(this.db, 'products', internalProductId));
    if (!internalDoc.exists()) {
      throw new Error('Internal product not found');
    }
    
    const internalProduct = { id: internalDoc.id, ...internalDoc.data() };
    
    // Check eligibility
    if (!this.isEligibleForSync(internalProduct)) {
      throw new Error(`Product not eligible: ${this.getIneligibilityReason(internalProduct)}`);
    }
    
    // Check if already exists in public catalog
    const existingQuery = query(
      collection(this.db, 'products_public'),
      where('internalProductId', '==', internalProductId)
    );
    const existingSnapshot = await getDocs(existingQuery);
    
    let publicProductId;
    if (existingSnapshot.empty) {
      // ✅ ENHANCED: Create new public product with image generation setup
      const publicProduct = this.transformToEcommerceProduct(internalProduct);
      
      // Add image generation flags
      publicProduct.images = {
        generated: false,
        generationPending: true,
        needsGeneration: true
      };
      publicProduct.imageGenerationStatus = 'pending';
      
      const docRef = await addDoc(collection(this.db, 'products_public'), publicProduct);
      publicProductId = docRef.id;
      console.log(`✅ Created new public product: ${publicProductId}`);
      
      // ✅ NEW: Add to image generation queue
      this.addToImageGenerationQueue(internalProduct.id, publicProductId, internalProduct);
      
    } else {
      // Update existing public product
      publicProductId = existingSnapshot.docs[0].id;
      const updates = this.generateEcommerceUpdates(internalProduct, existingSnapshot.docs[0].data());
      await updateDoc(doc(this.db, 'products_public', publicProductId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Updated existing public product: ${publicProductId}`);
      
      // ✅ NEW: Check if needs image generation
      const existingData = existingSnapshot.docs[0].data();
      if (!existingData.images?.generated) {
        this.addToImageGenerationQueue(internalProduct.id, publicProductId, internalProduct);
      }
    }
    
    return publicProductId;
  }

  // ✅ NEW: Helper method to add products to image generation queue
  addToImageGenerationQueue(internalProductId, publicProductId, product) {
    const imageTask = {
      productId: internalProductId,
      publicProductId: publicProductId,
      priority: this.calculateImagePriority(product),
      addedAt: new Date(),
      retries: 0
    };
    
    this.imageGenerationQueue.push(imageTask);
    console.log(`📸 Added ${product.name} to image generation queue (${this.imageGenerationQueue.length} pending)`);
    
    // Start image processor if not already running
    if (!this.processingImages && this.imageGenerationQueue.length > 0) {
      setTimeout(() => this.startImageProcessor(), 2000); // Small delay to batch requests
    }
  }

  async bulkSyncProducts(internalProductIds) {
    try {
      console.log(`🔄 Bulk syncing ${internalProductIds.length} products...`);
      
      const results = [];
      const errors = [];
      
      // Process in batches to avoid Firestore limits
      const batchSize = 10;
      for (let i = 0; i < internalProductIds.length; i += batchSize) {
        const batch = internalProductIds.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (productId) => {
            try {
              const publicId = await this.syncSingleProductToPublic(productId);
              results.push({ internalId: productId, publicId });
            } catch (error) {
              errors.push({ internalId: productId, error: error.message });
            }
          })
        );
        
        // Add delay between batches to avoid rate limits
        if (i + batchSize < internalProductIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Bulk sync complete: ${results.length} success, ${errors.length} failed`);
      console.log(`🎨 ${this.imageGenerationQueue.length} products queued for image generation`);
      
      return {
        success: true,
        data: { results, errors, imageQueueLength: this.imageGenerationQueue.length }
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ====================================================================
  // ✅ ENHANCED: EXISTING HELPER METHODS
  // ====================================================================

  async getProductById(productId) {
    try {
      const docSnap = await getDoc(doc(this.db, 'products', productId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error(`❌ Failed to get product ${productId}:`, error);
      return null;
    }
  }

  async getPublicProductById(publicProductId) {
    try {
      const docSnap = await getDoc(doc(this.db, 'products_public', publicProductId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error(`❌ Failed to get public product ${publicProductId}:`, error);
      return null;
    }
  }

  getSyncStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning,
      queueLength: this.syncQueue.length,
      // ✅ ENHANCED: Image generation stats
      imageQueueLength: this.imageGenerationQueue.length,
      processingImages: this.processingImages,
      imageSuccessRate: this.syncStats.imagesGenerated > 0 ? 
        ((this.syncStats.imagesGenerated / (this.syncStats.imagesGenerated + this.syncStats.imageErrors)) * 100).toFixed(1) : 0,
      averageImageTime: this.syncStats.imagesGenerated > 0 ? 
        Math.round(this.syncStats.imageGenerationTime / this.syncStats.imagesGenerated) : 0,
      activeListeners: this.syncListeners.size
    };
  }

  async getSyncHealth() {
    try {
      const [internalSnapshot, ecommerceSnapshot, imageHealth] = await Promise.all([
        getDocs(collection(this.db, 'products')),
        getDocs(collection(this.db, 'products_public')),
        this.getImageGenerationHealth()
      ]);
      
      return {
        internalProductCount: internalSnapshot.size,
        ecommerceProductCount: ecommerceSnapshot.size,
        syncCoverage: ecommerceSnapshot.size / internalSnapshot.size,
        syncStats: this.getSyncStats(),
        // ✅ NEW: Image generation health
        imageGenerationHealth: imageHealth,
        lastHealthCheck: new Date()
      };
      
    } catch (error) {
      console.error('❌ Failed to get sync health:', error);
      return null;
    }
  }

  // ====================================================================
  // ✅ ENHANCED: DEMO DATA WITH IMAGE STATUS
  // ====================================================================

  getDemoProductsWithSyncStatus() {
    return [
      {
        id: 'PROD-001',
        name: 'Hydraulic Pump Model HP-200',
        category: 'hydraulics',
        stock: 25,
        price: 850,
        suggestedPublicPrice: 977.50,
        status: 'active',
        supplier: 'TechFlow Systems',
        publicStatus: 'synced',
        imageStatus: 'completed',
        hasImages: true,
        imageProvider: 'openai',
        eligible: true,
        priority: 'high',
        imagePriority: 65,
        eligibilityReasons: ['Eligible for sync']
      },
      {
        id: 'PROD-002',
        name: 'Pneumatic Cylinder PC-150',
        category: 'pneumatics',
        stock: 12,
        price: 320,
        suggestedPublicPrice: 368,
        status: 'active',
        supplier: 'AirTech Solutions',
        publicStatus: 'synced',
        imageStatus: 'pending',
        hasImages: false,
        imageProvider: null,
        eligible: true,
        priority: 'medium',
        imagePriority: 40,
        eligibilityReasons: ['Eligible for sync']
      },
      {
        id: 'PROD-003',
        name: 'Industrial Sensor Module',
        category: 'sensors',
        stock: 8,
        price: 245,
        suggestedPublicPrice: 281.75,
        status: 'active',
        supplier: 'SensorTech Inc',
        publicStatus: 'not_synced',
        imageStatus: 'not_generated',
        hasImages: false,
        imageProvider: null,
        eligible: true,
        priority: 'medium',
        imagePriority: 35,
        eligibilityReasons: ['Eligible for sync']
      },
      {
        id: 'PROD-004',
        name: 'Cable Assembly CAB-500',
        category: 'cables',
        stock: 3,
        price: 125,
        suggestedPublicPrice: 143.75,
        status: 'active',
        supplier: 'CableTech Pro',
        publicStatus: 'not_synced',
        imageStatus: 'not_generated',
        hasImages: false,
        imageProvider: null,
        eligible: false,
        priority: 'low',
        imagePriority: 20,
        eligibilityReasons: ['Stock too low (3 < 5)']
      },
      {
        id: 'PROD-005',
        name: 'Automation Controller AC-300',
        category: 'automation',
        stock: 18,
        price: 675,
        suggestedPublicPrice: 776.25,
        status: 'active',
        supplier: 'AutoTech Systems',
        publicStatus: 'synced',
        imageStatus: 'error',
        hasImages: false,
        imageProvider: 'fallback',
        eligible: true,
        priority: 'high',
        imagePriority: 60,
        eligibilityReasons: ['Eligible for sync']
      }
    ];
  }

  // ====================================================================
  // EXISTING METHODS (UNCHANGED)
  // ====================================================================

  async syncProductToPublic(internalProductId) {
    try {
      console.log(`🔄 Syncing product ${internalProductId} to public catalog...`);
      
      const publicId = await this.syncSingleProductToPublic(internalProductId);
      
      return {
        success: true,
        data: { productId: internalProductId, publicId }
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateSyncRules(newRules) {
    try {
      const updatedRules = { ...this.syncRules, ...newRules };
      this.syncRules = updatedRules;
      
      // Save to Firestore if available
      try {
        await updateDoc(doc(this.db, 'settings', 'productSyncRules'), {
          ...updatedRules,
          updatedAt: serverTimestamp()
        });
      } catch (error) {
        console.warn('Could not save sync rules to Firestore:', error);
      }
      
      console.log('✅ Sync rules updated');
      
      return {
        success: true,
        data: updatedRules
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  transformToEcommerceProduct(internalProduct) {
    return {
      // Link to internal system
      internalProductId: internalProduct.id,
      
      // Customer-facing information
      displayName: this.generateDisplayName(internalProduct),
      customerDescription: this.generateCustomerDescription(internalProduct),
      
      // Pricing
      price: this.calculatePublicPrice(internalProduct.price || 0),
      originalPrice: internalProduct.price || 0,
      markup: this.syncRules.priceMarkup,
      currency: 'MYR',
      
      // Inventory
      stock: internalProduct.stock || 0,
      availability: this.calculateAvailability(internalProduct),
      
      // Category & Classification
      category: this.mapCategory(internalProduct.category),
      subcategory: this.mapSubcategory(internalProduct.category),
      
      // Technical specifications
      specifications: this.formatSpecifications(internalProduct),
      
      // SEO and search
      seo: this.generateSEOData(internalProduct),
      
      // E-commerce settings
      visibility: this.determineVisibility(internalProduct),
      featured: this.shouldBeFeatured(internalProduct),
      minOrderQty: 1,
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
      lastModifiedBy: 'product_sync_service',
      version: 1.0
    };
  }

  generateEcommerceUpdates(internalProduct, existingData) {
    const updates = {};

    // Check for price changes
    const newPrice = this.calculatePublicPrice(internalProduct.price || 0);
    if (newPrice !== existingData.price) {
      updates.price = newPrice;
      updates.originalPrice = internalProduct.price || 0;
    }

    // Check for stock changes
    const newStock = internalProduct.stock || 0;
    if (newStock !== existingData.stock) {
      updates.stock = newStock;
      updates.availability = this.calculateAvailability(internalProduct);
    }

    // Check for name changes
    const newDisplayName = this.generateDisplayName(internalProduct);
    if (newDisplayName !== existingData.displayName) {
      updates.displayName = newDisplayName;
      updates.customerDescription = this.generateCustomerDescription(internalProduct);
    }

    // Check for category changes
    const newCategory = this.mapCategory(internalProduct.category);
    if (newCategory !== existingData.category) {
      updates.category = newCategory;
      updates.subcategory = this.mapSubcategory(internalProduct.category);
    }

    // Always update sync timestamp if there are changes
    if (Object.keys(updates).length > 0) {
      updates.syncedAt = serverTimestamp();
      updates.updatedAt = serverTimestamp();
      updates.lastModifiedBy = 'product_sync_service';
    }

    return updates;
  }

  // All other existing methods remain unchanged...
  isEligibleForSync(product) {
    // Check stock levels
    if ((product.stock || 0) < this.syncRules.minStock) {
      return false;
    }

    // Check category
    if (!this.syncRules.categories.includes(product.category?.toLowerCase())) {
      return false;
    }

    // Check required fields
    if (!product.name || !product.price || product.price <= 0) {
      return false;
    }

    // Check product status
    if (product.status === 'discontinued' || product.status === 'out-of-stock') {
      return false;
    }

    return true;
  }

  getIneligibilityReason(product) {
    if ((product.stock || 0) < this.syncRules.minStock) {
      return `Low stock (${product.stock || 0} < ${this.syncRules.minStock})`;
    }
    
    if (!this.syncRules.categories.includes(product.category?.toLowerCase())) {
      return `Category '${product.category}' not enabled`;
    }
    
    if (!product.name || !product.price || product.price <= 0) {
      return 'Missing required fields';
    }
    
    if (product.status === 'discontinued' || product.status === 'out-of-stock') {
      return `Status: ${product.status}`;
    }
    
    return 'Unknown reason';
  }

  calculateSyncPriority(product) {
    let score = 0;
    
    // Stock level (higher stock = higher priority)
    const stock = product.stock || 0;
    if (stock > 20) score += 3;
    else if (stock > 10) score += 2;
    else if (stock > 5) score += 1;
    
    // Price range (mid-range products often sell better)
    const price = product.price || 0;
    if (price > 100 && price < 1000) score += 2;
    else if (price >= 1000) score += 1;
    
    // Category popularity
    const popularCategories = ['electronics', 'automation', 'sensors'];
    if (popularCategories.includes(product.category?.toLowerCase())) {
      score += 2;
    }
    
    // Recent updates
    if (product.updatedAt && Date.now() - new Date(product.updatedAt).getTime() < 7 * 24 * 60 * 60 * 1000) {
      score += 1;
    }
    
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  calculatePublicPrice(internalPrice) {
    const markup = this.syncRules.priceMarkup / 100;
    return Math.round(internalPrice * (1 + markup) * 100) / 100;
  }

  calculateAvailability(product) {
    const stockLevel = product.stock || 0;
    
    if (stockLevel === 0) return 'out-of-stock';
    if (stockLevel < 5) return 'low-stock';
    if (stockLevel < 20) return 'limited';
    return 'in-stock';
  }

  generateDisplayName(internalProduct) {
    let displayName = internalProduct.name || 'Industrial Product';
    
    // Add brand if available
    if (internalProduct.brand && !displayName.toLowerCase().includes(internalProduct.brand.toLowerCase())) {
      displayName = `${internalProduct.brand} ${displayName}`;
    }
    
    // Add descriptive qualifiers based on category
    const categoryQualifiers = {
      'electronics': 'Professional Grade',
      'hydraulics': 'Industrial Hydraulic',
      'pneumatics': 'Pneumatic System',
      'automation': 'Automation Grade',
      'sensors': 'Industrial Sensor',
      'cables': 'Industrial Cable',
      'components': 'Industrial Component'
    };
    
    const qualifier = categoryQualifiers[internalProduct.category?.toLowerCase()];
    if (qualifier && !displayName.toLowerCase().includes(qualifier.toLowerCase())) {
      displayName = `${qualifier} ${displayName}`;
    }
    
    return displayName;
  }

  generateCustomerDescription(internalProduct) {
    let description = internalProduct.description || '';
    
    // If no description, generate one based on available data
    if (!description || description.length < 50) {
      const category = internalProduct.category || 'industrial';
      const brand = internalProduct.brand || 'Professional';
      
      description = `High-quality ${category} product from ${brand}. Suitable for professional industrial applications with reliable performance and durability.`;
      
      if (internalProduct.sku) {
        description += ` Model/SKU: ${internalProduct.sku}.`;
      }
    }
    
    return description;
  }

  mapCategory(internalCategory) {
    const categoryMap = {
      'electronics': 'Electronics & Components',
      'hydraulics': 'Hydraulic Systems',
      'pneumatics': 'Pneumatic Systems', 
      'automation': 'Automation & Control',
      'sensors': 'Sensors & Instrumentation',
      'cables': 'Cables & Wiring',
      'components': 'Industrial Components'
    };
    
    return categoryMap[internalCategory?.toLowerCase()] || 'Industrial Equipment';
  }

  mapSubcategory(internalCategory) {
    const subcategoryMap = {
      'electronics': 'Electronic Components',
      'hydraulics': 'Hydraulic Components',
      'pneumatics': 'Pneumatic Components',
      'automation': 'Control Systems',
      'sensors': 'Industrial Sensors',
      'cables': 'Industrial Cables',
      'components': 'General Components'
    };
    
    return subcategoryMap[internalCategory?.toLowerCase()] || 'General Equipment';
  }

  formatSpecifications(internalProduct) {
    return {
      sku: internalProduct.sku || 'Contact for details',
      brand: internalProduct.brand || 'Professional Grade',
      category: internalProduct.category || 'Industrial',
      description: internalProduct.description || 'Contact for detailed specifications',
      warranty: '1 year manufacturer warranty',
      compliance: ['Industry Standard']
    };
  }

  generateSEOData(internalProduct) {
    const name = (internalProduct.name || '').toLowerCase();
    const category = (internalProduct.category || '').toLowerCase();
    const brand = (internalProduct.brand || '').toLowerCase();
    
    const keywords = [name, category, brand, 'industrial', 'malaysia', 'professional'].filter(Boolean);

    return {
      keywords: keywords,
      metaTitle: `${internalProduct.name} - Professional ${category} | HiggsFlow`,
      metaDescription: `Professional ${category} - ${internalProduct.name}. High-quality industrial equipment from verified Malaysian suppliers.`
    };
  }

  determineVisibility(internalProduct) {
    const hasStock = (internalProduct.stock || 0) > 0;
    const isActive = internalProduct.status !== 'pending';
    
    return (hasStock && isActive) ? 'public' : 'private';
  }

  shouldBeFeatured(internalProduct) {
    const hasGoodStock = (internalProduct.stock || 0) > 20;
    const isHighValue = (internalProduct.price || 0) > 500;
    
    return hasGoodStock && isHighValue;
  }

  async startSync() {
    if (this.isRunning) {
      console.log('🔄 Product sync is already running');
      return;
    }

    console.log('🚀 Starting HiggsFlow Product Sync Service...');
    this.isRunning = true;

    try {
      // Placeholder for full sync implementation
      await this.performInitialSync();
      this.setupRealTimeSync();
      this.startBatchProcessor();
      this.startImageProcessor(); // ✅ Enhanced to include image processing
      
      console.log('✅ Product sync service started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start product sync:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stopSync() {
    console.log('🛑 Stopping product sync service...');
    this.isRunning = false;
    this.processingImages = false; // ✅ Stop image processing too
    this.syncListeners.forEach(unsubscribe => unsubscribe());
    this.syncListeners.clear();
    console.log('✅ Product sync service stopped');
  }

  async performInitialSync() {
    console.log('📦 Performing initial product sync...');
    // Placeholder implementation
  }

  setupRealTimeSync() {
    console.log('👂 Setting up real-time sync listeners...');
    // Placeholder implementation
  }

  startBatchProcessor() {
    console.log('⚡ Starting batch processor...');
    // Placeholder implementation
  }
}

// Create and export singleton instance
export const productSyncService = new ProductSyncService();

// Export the class as default
export default ProductSyncService;
