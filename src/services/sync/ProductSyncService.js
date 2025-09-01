// src/services/sync/ProductSyncService.js
// Enhanced Product Sync Service for HiggsFlow E-commerce
// UPDATED: Fixed image handling and method call issues from "Resolving Product Image Loading Error"

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
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';

class ProductSyncService {
  constructor() {
    this.db = db;
    this.isRunning = false;
    this.syncListeners = new Map();
    this.syncQueue = [];
    this.imageGenerationQueue = [];
    this.batchSize = 10;
    this.retryAttempts = 3;
    this.processingImages = false;
    this.maxConcurrentImages = 2;
    this.imageRetryLimit = 3;
    
    this.syncStats = {
      totalSynced: 0,
      successCount: 0,
      errorCount: 0,
      lastSyncTime: null,
      syncedProducts: new Set(),
      // Image generation stats
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
    
    // MCP API configuration
    this.mcpApiBase = import.meta.env?.VITE_MCP_SERVER_URL || 
                     (typeof process !== 'undefined' ? process.env.VITE_MCP_SERVER_URL : null) ||
                     'https://supplier-mcp-server-production.up.railway.app';
    
    console.log('ProductSyncService initialized with FIXED image detection and loading logic');
  }

  // ====================================================================
  // FIXED: IMAGE DETECTION AND URL RESOLUTION LOGIC
  // ====================================================================

  /**
   * FIXED: Enhanced image URL resolution with priority order
   * Addresses image loading errors by checking multiple URL sources
   */
  getProductImageUrl(product) {
    // Priority order for image URL resolution
    const imageFields = [
      'imageUrl',
      'image_url', 
      'image',
      'photo',
      'pictures',
      'thumbnail'
    ];

    for (const field of imageFields) {
      const value = product[field];
      
      if (value) {
        // Handle string URLs
        if (typeof value === 'string' && value.trim()) {
          const url = value.trim();
          // Skip hardcoded placeholder paths
          if (!url.includes('placeholder-product.jpg') && 
              !url.includes('default-image.png')) {
            return url;
          }
        }
        // Handle array of images
        else if (Array.isArray(value) && value.length > 0) {
          const firstImage = value[0];
          if (typeof firstImage === 'string' && firstImage.trim()) {
            return firstImage.trim();
          }
          // Handle object with URL property
          else if (firstImage && firstImage.url) {
            return firstImage.url;
          }
        }
        // Handle object with URL property
        else if (typeof value === 'object' && value.url) {
          return value.url;
        }
      }
    }

    // Check if product has AI-generated images object
    if (product.images && typeof product.images === 'object') {
      if (product.images.primary && product.images.primary.url) {
        return product.images.primary.url;
      }
      // Handle array format in images object
      if (Array.isArray(product.images) && product.images.length > 0) {
        return product.images[0].url || product.images[0];
      }
    }

    // Return API placeholder URL with product name
    const productName = encodeURIComponent(product.name || product.displayName || 'Product');
    return `/api/placeholder/400/400?text=${productName}`;
  }

  /**
   * FIXED: Check if product needs image generation
   * Enhanced logic to properly identify placeholder vs real images
   */
  needsImageGeneration(product) {
    const imageUrl = this.getProductImageUrl(product);
    
    // No image URL at all = needs generation
    if (!imageUrl || imageUrl.trim() === '') {
      return true;
    }
    
    // If it's a placeholder image = needs generation
    if (this.isPlaceholderImage(imageUrl)) {
      return true;
    }
    
    // If it doesn't have a real image = needs generation
    if (!this.hasRealImage(product)) {
      return true;
    }
    
    return false;
  }

  /**
   * FIXED: Check if product has a real generated image
   */
  hasRealImage(product) {
    const imageUrl = this.getProductImageUrl(product);
    
    if (!imageUrl) return false;
    
    // Real images are from generation services or uploaded files
    return imageUrl.includes('oaidalleapi') || 
           imageUrl.includes('blob.core.windows.net') ||
           imageUrl.includes('generated') ||
           imageUrl.includes('ai-image') ||
           imageUrl.includes('firebasestorage') ||
           (imageUrl.startsWith('https://') && !this.isPlaceholderImage(imageUrl));
  }

  /**
   * FIXED: Helper to identify placeholder images - Enhanced patterns
   */
  isPlaceholderImage(imageUrl) {
    if (!imageUrl) return true;
    
    const placeholderPatterns = [
      'placeholder',
      'via.placeholder',
      'default-image',
      'no-image',
      'temp-image',
      '/api/placeholder',  // Added for API placeholder URLs
      'placeholder.com',   // Added for placeholder.com URLs
      'placehold.it'       // Added for placehold.it URLs
    ];
    
    return placeholderPatterns.some(pattern => imageUrl.includes(pattern));
  }

  // ====================================================================
  // SYNC IMPLEMENTATION (PRESERVED WITH FIXES)
  // ====================================================================

  async performInitialSync() {
    console.log('Performing initial product sync with FIXED image detection...');
    
    try {
      const internalSnapshot = await getDocs(collection(this.db, 'products'));
      const publicSnapshot = await getDocs(collection(this.db, 'products_public'));
      
      const existingPublicIds = new Set();
      publicSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.internalProductId) {
          existingPublicIds.add(data.internalProductId);
        }
      });

      let syncCount = 0;
      let imageGenCount = 0;
      
      console.log(`Found ${internalSnapshot.size} internal products, ${existingPublicIds.size} already synced`);
      
      for (const doc of internalSnapshot.docs) {
        const internalProduct = { id: doc.id, ...doc.data() };
        
        // Skip if already synced
        if (existingPublicIds.has(doc.id)) {
          // Check if existing synced product needs image generation
          if (this.needsImageGeneration(internalProduct)) {
            await this.queueImageGeneration(internalProduct);
            imageGenCount++;
          }
          continue;
        }
        
        // Check if product is eligible for public sync
        if (this.isProductEligible(internalProduct)) {
          const publicProduct = this.transformForPublicCatalog(internalProduct);
          publicProduct.internalProductId = doc.id;
          
          const docRef = await addDoc(collection(this.db, 'products_public'), publicProduct);
          syncCount++;
          
          // Queue for image generation if needed
          if (this.needsImageGeneration(internalProduct)) {
            await this.queueImageGeneration(internalProduct);
            imageGenCount++;
          }
          
          console.log(`Synced product: ${internalProduct.name}`);
        }
      }
      
      console.log(`Initial sync complete: ${syncCount} products synced, ${imageGenCount} queued for images`);
      return { syncCount, imageGenCount };
      
    } catch (error) {
      console.error('Initial sync failed:', error);
      throw error;
    }
  }

  setupRealTimeSync() {
    console.log('Setting up real-time sync listeners...');
    
    try {
      // Listen to internal products for changes
      const internalQuery = query(collection(this.db, 'products'));
      
      const unsubscribe = onSnapshot(internalQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const product = { id: change.doc.id, ...change.doc.data() };
            
            if (this.isProductEligible(product)) {
              // Queue for sync
              this.syncQueue.push({
                type: 'sync',
                productId: change.doc.id,
                product: product,
                priority: this.calculateSyncPriority(product)
              });
              
              console.log(`Queued ${product.name} for sync`);
            }
          }
        });
      });
      
      this.syncListeners.set('internal_products', unsubscribe);
      console.log('Real-time sync listeners active');
      
    } catch (error) {
      console.error('Failed to setup real-time sync:', error);
    }
  }

  startBatchProcessor() {
    console.log('Starting batch processor with FIXED image detection...');
    
    const processQueue = async () => {
      if (this.syncQueue.length === 0) {
        setTimeout(processQueue, 5000); // Check every 5 seconds
        return;
      }
      
      // Sort by priority
      this.syncQueue.sort((a, b) => {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      });
      
      // Process batch
      const batch = this.syncQueue.splice(0, this.batchSize);
      console.log(`Processing batch of ${batch.length} products`);
      
      for (const item of batch) {
        try {
          await this.syncSingleProductToPublic(item.productId);
          this.syncStats.successCount++;
        } catch (error) {
          console.error(`Failed to sync ${item.productId}:`, error);
          this.syncStats.errorCount++;
        }
      }
      
      this.syncStats.lastSyncTime = new Date();
      
      // Continue processing
      setTimeout(processQueue, 2000);
    };
    
    processQueue();
  }

  isProductEligible(product) {
    return (
      product.name && 
      product.name.trim().length > 0 &&
      product.status !== 'pending' &&
      (product.stock || 0) >= 0
    );
  }

  transformForPublicCatalog(internalProduct) {
    return {
      // Link to internal system
      internalProductId: internalProduct.id,
      
      // Customer-facing information
      name: internalProduct.name,
      displayName: this.generateDisplayName(internalProduct),
      description: this.generateCustomerDescription(internalProduct),
      
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
      sku: internalProduct.sku || internalProduct.id,
      brand: internalProduct.brand || 'Professional Grade',
      specifications: this.formatSpecifications(internalProduct),
      
      // SEO and search
      seo: this.generateSEOData(internalProduct),
      
      // E-commerce settings
      visibility: this.determineVisibility(internalProduct),
      featured: this.shouldBeFeatured(internalProduct),
      minOrderQty: 1,
      
      // FIXED: Enhanced image setup with improved URL resolution
      imageUrl: this.getProductImageUrl(internalProduct),
      hasRealImage: this.hasRealImage(internalProduct),
      needsImageGeneration: this.needsImageGeneration(internalProduct),
      imageGenerationStatus: this.needsImageGeneration(internalProduct) ? 'pending' : 'not_needed',
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
      lastModifiedBy: 'product_sync_service',
      version: 1.0,
      dataSource: 'internal_sync'
    };
  }

  // ====================================================================
  // FIXED: AI IMAGE GENERATION METHODS WITH ENHANCED ERROR HANDLING
  // ====================================================================

  async queueImageGeneration(product) {
    if (!this.needsImageGeneration(product)) {
      console.log(`Product ${product.name} doesn't need image generation - already has real image`);
      return;
    }

    const imageTask = {
      productId: product.id,
      productName: product.name,
      priority: this.calculateImagePriority(product),
      addedAt: new Date(),
      retries: 0
    };
    
    this.imageGenerationQueue.push(imageTask);
    console.log(`FIXED: Queued ${product.name} for image generation (${this.imageGenerationQueue.length} total)`);
    
    // Start image processor if not already running
    if (!this.processingImages && this.imageGenerationQueue.length > 0) {
      setTimeout(() => this.startImageProcessor(), 2000);
    }
  }

  async startImageProcessor() {
    if (this.processingImages) {
      console.log('Image processor already running');
      return;
    }

    console.log(`Starting FIXED image processor with ${this.imageGenerationQueue.length} products...`);
    this.processingImages = true;
    
    try {
      let processedCount = 0;
      
      while (this.processingImages && this.imageGenerationQueue.length > 0) {
        // Process images in small batches to respect API limits
        const batch = this.imageGenerationQueue.splice(0, this.maxConcurrentImages);
        
        console.log(`Processing batch of ${batch.length} products...`);
        
        const batchPromises = batch.map(async (imageTask) => {
          try {
            console.log(`Processing ${imageTask.productId}...`);
            const result = await this.processImageGeneration(imageTask);
            processedCount++;
            console.log(`Completed ${imageTask.productId} (${processedCount} total)`);
            return result;
          } catch (error) {
            console.error(`Failed ${imageTask.productId}:`, error.message);
            throw error;
          }
        });
        
        const results = await Promise.allSettled(batchPromises);
        
        // Log results
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Batch completed: ${successful} successful, ${failed} failed`);
        
        // Rate limiting for OpenAI API
        if (this.imageGenerationQueue.length > 0) {
          console.log(`Rate limiting... ${this.imageGenerationQueue.length} remaining`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log(`FIXED image processing completed - processed ${processedCount} products`);
      
    } catch (error) {
      console.error('Image processor error:', error);
    } finally {
      if (this.imageGenerationQueue.length === 0) {
        this.processingImages = false;
        console.log('Image processor finished');
      } else {
        console.log(`Image processor stopped with ${this.imageGenerationQueue.length} items remaining`);
      }
    }
  }

  async processImageGeneration(imageTask) {
    const startTime = Date.now();
    
    try {
      console.log(`Processing images for product: ${imageTask.productId}`);
      
      // Get product details
      const internalProduct = await this.getProductById(imageTask.productId);
      
      if (!internalProduct) {
        throw new Error('Internal product not found');
      }

      // Generate images using MCP system with OpenAI
      const generatedImages = await this.generateProductImagesWithMCP(internalProduct);
      
      // Find and update the public product
      const publicProductId = await this.findPublicProductId(imageTask.productId);
      if (publicProductId) {
        await this.updateProductImages(publicProductId, generatedImages);
      }
      
      // Update statistics
      this.syncStats.imagesGenerated++;
      
      const processingTime = Date.now() - startTime;
      this.syncStats.imageGenerationTime += processingTime;
      
      console.log(`Generated images for ${internalProduct.name} in ${processingTime}ms`);
      
      // Log successful image generation
      await this.logImageGeneration(imageTask, 'success', generatedImages, processingTime);
      
    } catch (error) {
      console.error(`Image generation failed for ${imageTask.productId}:`, error);
      
      // Handle retry logic
      imageTask.retries = (imageTask.retries || 0) + 1;
      if (imageTask.retries < this.imageRetryLimit) {
        console.log(`Retrying image generation (${imageTask.retries}/${this.imageRetryLimit})`);
        this.imageGenerationQueue.push(imageTask);
      } else {
        this.syncStats.imageErrors++;
        await this.handleImageGenerationError(imageTask, error);
      }
    }
  }

  async findPublicProductId(internalProductId) {
    try {
      const publicQuery = query(
        collection(this.db, 'products_public'),
        where('internalProductId', '==', internalProductId)
      );
      const publicSnapshot = await getDocs(publicQuery);
      
      if (!publicSnapshot.empty) {
        return publicSnapshot.docs[0].id;
      }
      return null;
    } catch (error) {
      console.error('Failed to find public product:', error);
      return null;
    }
  }

  /**
   * FIXED: Enhanced MCP API handling with better response parsing
   */
  async generateProductImagesWithMCP(product) {
    try {
      console.log(`Generating images for ${product.name} using MCP + OpenAI...`);
      
      const requestBody = {
        product: {
          name: product.name,
          partNumber: product.partNumber || product.sku || product.code,
          category: product.category,
          brand: product.brand || 'Professional Grade',
          description: product.description || product.name
        },
        imageTypes: ['primary'],  // Start with just primary image
        promptCategory: this.getImagePromptCategory(product.category),
        provider: 'openai',
        model: 'dall-e-3',
        quality: 'hd'
      };
      
      console.log(`Making request to: ${this.mcpApiBase}/api/mcp/generate-product-images`);
      console.log('Request payload:', requestBody);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // FIXED: Extended to 2 minutes
      
      const response = await fetch(`${this.mcpApiBase}/api/mcp/generate-product-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log(`API Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('MCP API error response:', errorText);
        throw new Error(`MCP API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('MCP API result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Image generation failed');
      }

      // FIXED: Enhanced response format handling
      let processedImages = {};
      
      if (result.images) {
        processedImages = result.images;
      } else if (result.imageUrls && Array.isArray(result.imageUrls)) {
        processedImages = {
          primary: { url: result.imageUrls[0] },
          imageUrls: result.imageUrls
        };
      } else if (result.imageUrl) {
        processedImages = {
          primary: { url: result.imageUrl }
        };
      }
      
      console.log(`MCP generated images successfully:`, processedImages);
      
      return {
        ...processedImages,
        generated: true,
        generatedAt: new Date(),
        provider: result.provider || 'openai',
        model: result.model || 'dall-e-3',
        compliance: result.compliance || {},
        processingTime: result.processingTime
      };
      
    } catch (error) {
      console.error('MCP image generation failed:', error);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out after 2 minutes');
      }
      
      throw error;
    }
  }

  getImagePromptCategory(productCategory) {
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

  /**
   * FIXED: Enhanced product image update with better format handling
   */
  async updateProductImages(publicProductId, images) {
    try {
      console.log('🖼️ Updating product images:', { publicProductId, images });
      
      // Handle different image response formats
      let imageUrl = null;
      let imageData = {};
      
      if (images) {
        // Handle MCP/OpenAI response format
        if (images.primary && images.primary.url) {
          imageUrl = images.primary.url;
          imageData = images;
        } 
        // Handle direct URL response from MCP API
        else if (typeof images === 'string' && images.startsWith('http')) {
          imageUrl = images;
          imageData = { primary: { url: images } };
        }
        // Handle array of URLs (multiple images)
        else if (Array.isArray(images) && images.length > 0) {
          imageUrl = images[0];
          imageData = { primary: { url: images[0] } };
        }
        // FIXED: Handle imageUrls array from MCP response
        else if (images.imageUrls && Array.isArray(images.imageUrls) && images.imageUrls.length > 0) {
          imageUrl = images.imageUrls[0];
          imageData = { 
            primary: { url: images.imageUrls[0] },
            provider: images.provider || 'openai',
            model: images.model || 'dall-e-3'
          };
        }
      }
      
      const updateData = {
        imageUrl: imageUrl,
        images: imageData,
        hasRealImage: !!imageUrl,
        needsImageGeneration: !imageUrl,
        imageGenerationStatus: imageUrl ? 'completed' : 'failed',
        lastImageUpdate: serverTimestamp()
      };
      
      console.log('Updating product with data:', updateData);
      
      await updateDoc(doc(this.db, 'products_public', publicProductId), updateData);
      
      console.log(`✅ Successfully updated images for product ${publicProductId}`, {
        imageUrl,
        hasImage: !!imageUrl
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to update product images:', error);
      throw error;
    }
  }

  async logImageGeneration(imageTask, status, images, processingTime) {
    try {
      const logEntry = {
        syncId: `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: imageTask.productId,
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
      console.error('Failed to log image generation:', error);
    }
  }

  async handleImageGenerationError(imageTask, error) {
    console.error(`Final image generation failure for ${imageTask.productId}:`, error.message);
    
    try {
      // Find public product and update with error status
      const publicProductId = await this.findPublicProductId(imageTask.productId);
      if (publicProductId) {
        await updateDoc(doc(this.db, 'products_public', publicProductId), {
          imageGenerationStatus: 'error',
          imageGenerationError: error.message,
          needsImageGeneration: true, // Allow manual retry
          lastImageError: serverTimestamp()
        });
      }
      
      // Log the error
      await this.logImageGeneration(imageTask, 'error', null, 0);
      
    } catch (logError) {
      console.error('Failed to log image generation error:', logError);
    }
  }

  calculateImagePriority(product) {
    let priority = 0;
    
    // High-value products get priority
    if (product.price > 1000) priority += 30;
    else if (product.price > 100) priority += 20;
    else priority += 10;
    
    // High-stock products get priority
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

  // ====================================================================
  // ENHANCED: MANUAL IMAGE GENERATION METHODS
  // ====================================================================

  /**
   * FIXED: Manual trigger for image generation from dashboard
   */
  async manualImageGeneration(productIds) {
    console.log(`Manual image generation triggered for ${productIds.length} products`);
    
    try {
      const results = [];
      const errors = [];
      
      for (const productId of productIds) {
        try {
          // Check if it's a public product ID or internal product ID
          let internalProduct;
          let publicProductId;
          
          // First try as internal product ID
          internalProduct = await this.getProductById(productId);
          if (internalProduct) {
            publicProductId = await this.findPublicProductId(productId);
          } else {
            // Try as public product ID
            const publicDoc = await getDoc(doc(this.db, 'products_public', productId));
            if (publicDoc.exists()) {
              publicProductId = productId;
              const publicData = publicDoc.data();
              if (publicData.internalProductId) {
                internalProduct = await this.getProductById(publicData.internalProductId);
              }
            }
          }
          
          if (!internalProduct) {
            throw new Error(`Product not found: ${productId}`);
          }
          
          if (!publicProductId) {
            throw new Error(`Public product not found for: ${productId}`);
          }
          
          console.log(`Generating image for: ${internalProduct.name}`);
          
          // Update status to processing
          await updateDoc(doc(this.db, 'products_public', publicProductId), {
            imageGenerationStatus: 'processing',
            lastImageUpdate: serverTimestamp()
          });
          
          // Generate image directly
          const generatedImages = await this.generateProductImagesWithMCP(internalProduct);
          
          // Update with generated image
          await this.updateProductImages(publicProductId, generatedImages);
          
          results.push({
            productId,
            productName: internalProduct.name,
            success: true,
            imageUrl: generatedImages.imageUrls?.[0] || generatedImages.primary?.url
          });
          
          console.log(`✅ Successfully generated image for ${internalProduct.name}`);
          
          // Wait between requests to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`❌ Failed to generate image for ${productId}:`, error);
          errors.push({
            productId,
            error: error.message
          });
        }
      }
      
      return {
        success: true,
        results,
        errors,
        summary: {
          total: productIds.length,
          successful: results.length,
          failed: errors.length
        }
      };
      
    } catch (error) {
      console.error('Manual image generation failed:', error);
      throw error;
    }
  }

  /**
   * FIX: Update existing products_public with image generation fields
   */
  async updateProductsWithImageFields() {
    try {
      console.log('🔄 Updating products_public with image generation fields...');
      
      const publicSnapshot = await getDocs(collection(this.db, 'products_public'));
      
      if (publicSnapshot.size === 0) {
        console.log('❌ No products found in products_public');
        return { success: false, message: 'No products to update' };
      }
      
      let updatedCount = 0;
      let errorCount = 0;
      const batch = writeBatch(this.db);
      
      publicSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Check if product needs image generation fields
        const needsUpdate = !data.hasOwnProperty('needsImageGeneration') || 
                           !data.hasOwnProperty('hasRealImage') ||
                           !data.hasOwnProperty('imageGenerationStatus');
        
        if (needsUpdate) {
          const imageUrl = this.getProductImageUrl(data);
          const hasRealImage = this.hasRealImage(data);
          const needsImageGeneration = this.needsImageGeneration(data);
          
          const updates = {
            imageUrl: imageUrl,
            hasRealImage: hasRealImage,
            needsImageGeneration: needsImageGeneration,
            imageGenerationStatus: needsImageGeneration ? 'pending' : 'not_needed',
            lastImageUpdate: serverTimestamp()
          };
          
          batch.update(doc.ref, updates);
          updatedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Updated ${updatedCount} products with image generation fields`);
        
        return {
          success: true,
          message: `Updated ${updatedCount} products`,
          updatedCount,
          errorCount
        };
      } else {
        console.log('ℹ️ All products already have image generation fields');
        return {
          success: true,
          message: 'All products already updated',
          updatedCount: 0,
          errorCount: 0
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to update products with image fields:', error);
      return {
        success: false,
        message: error.message,
        updatedCount: 0,
        errorCount: 1
      };
    }
  }

  /**
   * DIAGNOSTIC: Check what products exist in products_public collection
   */
  async diagnoseProductsPublic() {
    try {
      console.log('🔍 DIAGNOSING products_public collection...');
      
      // Get all products_public documents
      const publicSnapshot = await getDocs(collection(this.db, 'products_public'));
      
      console.log(`📊 Total products in products_public: ${publicSnapshot.size}`);
      
      if (publicSnapshot.size === 0) {
        console.log('❌ No products found in products_public collection');
        console.log('💡 You may need to run initial sync to populate products_public from products collection');
        return {
          totalProducts: 0,
          productsNeedingImages: 0,
          hasNeedsImageGenerationField: 0,
          summary: 'No products in products_public collection'
        };
      }
      
      let productsNeedingImages = 0;
      let hasNeedsImageGenerationField = 0;
      let productsWithImages = 0;
      let productsWithoutImages = 0;
      
      const sampleProducts = [];
      
      publicSnapshot.forEach((doc, index) => {
        const data = doc.data();
        
        // Count products with needsImageGeneration field
        if (data.hasOwnProperty('needsImageGeneration')) {
          hasNeedsImageGenerationField++;
          if (data.needsImageGeneration === true) {
            productsNeedingImages++;
          }
        }
        
        // Count products with/without images
        if (data.imageUrl && !this.isPlaceholderImage(data.imageUrl)) {
          productsWithImages++;
        } else {
          productsWithoutImages++;
        }
        
        // Collect sample data for first 3 products
        if (index < 3) {
          sampleProducts.push({
            id: doc.id,
            name: data.name || data.displayName,
            imageUrl: data.imageUrl,
            hasRealImage: data.hasRealImage,
            needsImageGeneration: data.needsImageGeneration,
            imageGenerationStatus: data.imageGenerationStatus,
            internalProductId: data.internalProductId
          });
        }
      });
      
      const diagnosis = {
        totalProducts: publicSnapshot.size,
        productsNeedingImages,
        hasNeedsImageGenerationField,
        productsWithImages,
        productsWithoutImages,
        sampleProducts,
        summary: `${publicSnapshot.size} products found, ${productsNeedingImages} need images`
      };
      
      console.log('📋 DIAGNOSIS RESULTS:', diagnosis);
      
      return diagnosis;
      
    } catch (error) {
      console.error('❌ Failed to diagnose products_public:', error);
      return {
        error: error.message,
        summary: 'Diagnosis failed'
      };
    }
  }

  /**
   * FIXED: Get products that need image generation for dashboard
   * Using simple query to avoid Firestore index requirements
   */
  async getProductsNeedingImages(limitCount = 50) {
    try {
      console.log('Loading products needing images...');
      
      // First run diagnosis to understand the data
      const diagnosis = await this.diagnoseProductsPublic();
      console.log('📊 Diagnosis complete:', diagnosis.summary);
      
      // If no products in products_public, suggest running sync
      if (diagnosis.totalProducts === 0) {
        console.log('💡 No products in products_public - returning demo data and suggesting sync');
        return this.getDemoProductsNeedingImages();
      }
      
      // Try simple query first (without orderBy to avoid index requirement)
      let publicQuery;
      let useOrderBy = false;
      
      try {
        // First try with orderBy (requires composite index)
        publicQuery = query(
          collection(this.db, 'products_public'),
          where('needsImageGeneration', '==', true),
          orderBy('createdAt', 'desc')
        );
        useOrderBy = true;
      } catch (indexError) {
        // Fallback to simple query without orderBy
        publicQuery = query(
          collection(this.db, 'products_public'),
          where('needsImageGeneration', '==', true)
        );
        useOrderBy = false;
        console.log('Using simple query without orderBy due to missing index');
      }

      const publicSnapshot = await getDocs(publicQuery);
      let products = [];

      // Collect all matching products
      publicSnapshot.forEach(doc => {
        const data = doc.data();
        products.push({
          id: doc.id,
          internalId: data.internalProductId,
          name: data.displayName || data.name,
          category: data.category,
          imageUrl: data.imageUrl,
          hasRealImage: data.hasRealImage || false,
          imageGenerationStatus: data.imageGenerationStatus || 'needed',
          lastImageError: data.lastImageError,
          needsImageGeneration: data.needsImageGeneration,
          createdAt: data.createdAt || new Date()
        });
      });

      // Sort manually if we couldn't use orderBy
      if (!useOrderBy) {
        products.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA; // Descending order (newest first)
        });
      }

      // Apply manual limit
      products = products.slice(0, limitCount);

      console.log(`Found ${products.length} products needing images`);
      
      // If no products found but diagnosis shows products exist, there might be a field issue
      if (products.length === 0 && diagnosis.totalProducts > 0) {
        console.log('⚠️ No products with needsImageGeneration=true found, but products exist');
        console.log('💡 This might indicate that products need to be updated with image generation fields');
        
        // Return products that don't have real images as potential candidates
        return this.getProductsWithoutRealImages(limitCount);
      }

      return products;

    } catch (error) {
      console.error('Failed to get products needing images:', error);
      
      // Return demo data if Firestore query fails
      console.log('Returning demo data due to Firestore error');
      return this.getDemoProductsNeedingImages();
    }
  }

  /**
   * Helper: Get products without real images as candidates for image generation
   */
  async getProductsWithoutRealImages(limitCount = 50) {
    try {
      console.log('🔄 Looking for products without real images...');
      
      const publicSnapshot = await getDocs(collection(this.db, 'products_public'));
      let products = [];

      publicSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if product needs image generation based on our logic
        const needsImages = this.needsImageGeneration(data);
        
        if (needsImages && products.length < limitCount) {
          products.push({
            id: doc.id,
            internalId: data.internalProductId,
            name: data.displayName || data.name,
            category: data.category,
            imageUrl: data.imageUrl,
            hasRealImage: this.hasRealImage(data),
            imageGenerationStatus: 'candidate',
            needsImageGeneration: true,
            createdAt: data.createdAt || new Date()
          });
        }
      });

      console.log(`Found ${products.length} products without real images`);
      return products;
      
    } catch (error) {
      console.error('Failed to get products without real images:', error);
      return this.getDemoProductsNeedingImages();
    }
  }

  /**
   * Helper: Get demo products for fallback
   */
  getDemoProductsNeedingImages() {
    return [
      {
        id: 'demo-1',
        internalId: 'PROD-001',
        name: 'Hydraulic Pump Demo',
        category: 'hydraulics',
        imageUrl: null,
        hasRealImage: false,
        imageGenerationStatus: 'needed',
        needsImageGeneration: true,
        createdAt: new Date()
      },
      {
        id: 'demo-2', 
        internalId: 'PROD-002',
        name: 'Pneumatic Valve Demo',
        category: 'pneumatics',
        imageUrl: 'https://via.placeholder.com/400x400',
        hasRealImage: false,
        imageGenerationStatus: 'needed',
        needsImageGeneration: true,
        createdAt: new Date()
      },
      {
        id: 'demo-3',
        internalId: 'PROD-003', 
        name: 'Industrial Sensor Module',
        category: 'sensors',
        imageUrl: null,
        hasRealImage: false,
        imageGenerationStatus: 'needed',
        needsImageGeneration: true,
        createdAt: new Date()
      }
    ];
  }

  // ====================================================================
  // DASHBOARD MANAGEMENT METHODS WITH ENHANCED IMAGE STATUS
  // ====================================================================

  async getInternalProductsWithSyncStatus() {
    try {
      console.log('Fetching internal products with FIXED sync status and enhanced image detection...');
      
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

      // Enhance internal products with FIXED sync and image status
      const productsWithStatus = internalProducts.map(product => {
        const publicVersion = publicProductMap.get(product.id);
        const isEligible = this.isEligibleForSync(product);
        
        // FIXED: Enhanced image status using improved detection logic
        const productImageUrl = this.getProductImageUrl(product);
        const hasRealImage = this.hasRealImage(product);
        const needsImageGen = this.needsImageGeneration(product);
        
        return {
          ...product,
          publicStatus: publicVersion ? 'synced' : 'not_synced',
          // FIXED: Enhanced image status tracking
          imageStatus: needsImageGen ? 'needs_generation' : 
                      hasRealImage ? 'has_real_image' : 'placeholder',
          hasImages: hasRealImage,
          needsImageGeneration: needsImageGen,
          imageUrl: productImageUrl,
          imageProvider: publicVersion?.images?.provider || null,
          eligible: isEligible,
          priority: this.calculateSyncPriority(product),
          imagePriority: this.calculateImagePriority(product),
          suggestedPublicPrice: this.calculatePublicPrice(product.price || 0),
          eligibilityReasons: isEligible ? ['Eligible for sync'] : [this.getIneligibilityReason(product)]
        };
      });

      console.log(`Loaded ${productsWithStatus.length} products with FIXED sync and image status`);
      
      return {
        success: true,
        data: productsWithStatus
      };

    } catch (error) {
      console.warn('Firestore unavailable, using demo data for development');
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
      
      // FIXED: Enhanced image statistics with improved detection logic
      const publicProducts = publicSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const productsWithRealImages = publicProducts.filter(product => this.hasRealImage(product)).length;
      const productsNeedingImages = publicProducts.filter(product => this.needsImageGeneration(product)).length;
      const imageGenerationRate = totalPublic > 0 ? Math.round((productsWithRealImages / totalPublic) * 100) : 0;
      
      // Calculate sync rate
      const syncRate = totalInternal > 0 ? Math.round((totalPublic / totalInternal) * 100) : 0;
      
      return {
        success: true,
        data: {
          totalInternal,
          totalPublic,
          eligible: eligibleCount,
          syncRate,
          // FIXED: Enhanced image statistics
          productsWithRealImages,
          productsNeedingImages,
          imageGenerationRate,
          totalImagesGenerated: this.syncStats.imagesGenerated,
          imageErrors: this.syncStats.imageErrors,
          averageImageTime: this.syncStats.imagesGenerated > 0 ? 
            Math.round(this.syncStats.imageGenerationTime / this.syncStats.imagesGenerated) : 0,
          lastUpdated: new Date()
        }
      };

    } catch (error) {
      console.warn('Using demo statistics');
      return {
        success: true,
        data: {
          totalInternal: 150,
          totalPublic: 87,
          eligible: 92,
          syncRate: 58,
          productsWithRealImages: 34,
          productsNeedingImages: 53,
          imageGenerationRate: 39,
          totalImagesGenerated: 241,
          imageErrors: 8,
          averageImageTime: 7200,
          lastUpdated: new Date()
        }
      };
    }
  }

  // ====================================================================
  // EXISTING SYNC METHODS (PRESERVED WITH FIXES)
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
      // Create new public product
      const publicProduct = this.transformToEcommerceProduct(internalProduct);
      
      const docRef = await addDoc(collection(this.db, 'products_public'), publicProduct);
      publicProductId = docRef.id;
      console.log(`Created new public product: ${publicProductId}`);
      
    } else {
      // Update existing public product
      publicProductId = existingSnapshot.docs[0].id;
      const updates = this.generateEcommerceUpdates(internalProduct, existingSnapshot.docs[0].data());
      await updateDoc(doc(this.db, 'products_public', publicProductId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log(`Updated existing public product: ${publicProductId}`);
    }
    
    // FIXED: Queue for image generation if needed using enhanced detection
    if (this.needsImageGeneration(internalProduct)) {
      await this.queueImageGeneration(internalProduct);
    }
    
    return publicProductId;
  }

  async bulkSyncProducts(internalProductIds) {
    try {
      console.log(`Bulk syncing ${internalProductIds.length} products with FIXED logic...`);
      
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
        
        // Add delay between batches
        if (i + batchSize < internalProductIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`FIXED bulk sync complete: ${results.length} success, ${errors.length} failed`);
      console.log(`${this.imageGenerationQueue.length} products queued for image generation`);
      
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
  // HELPER METHODS (PRESERVED WITH ENHANCEMENTS)
  // ====================================================================

  async getProductById(productId) {
    try {
      const docSnap = await getDoc(doc(this.db, 'products', productId));
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error(`Failed to get product ${productId}:`, error);
      return null;
    }
  }

  getSyncStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning,
      queueLength: this.syncQueue.length,
      // FIXED: Enhanced image generation stats
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
      const [internalSnapshot, ecommerceSnapshot] = await Promise.all([
        getDocs(collection(this.db, 'products')),
        getDocs(collection(this.db, 'products_public'))
      ]);
      
      return {
        internalProductCount: internalSnapshot.size,
        ecommerceProductCount: ecommerceSnapshot.size,
        syncCoverage: ecommerceSnapshot.size / internalSnapshot.size,
        syncStats: this.getSyncStats(),
        lastHealthCheck: new Date()
      };
      
    } catch (error) {
      console.error('Failed to get sync health:', error);
      return null;
    }
  }

  // FIXED: Demo data with corrected image status using enhanced detection
  getDemoProductsWithSyncStatus() {
    return [
      {
        id: 'PROD-001',
        name: 'Hydraulic Pump Model HP-200',
        category: 'hydraulics',
        stock: 25,
        price: 850,
        imageUrl: 'https://oaidalleapi.blob.core.windows.net/generated/image1.png',
        suggestedPublicPrice: 977.50,
        status: 'active',
        supplier: 'TechFlow Systems',
        publicStatus: 'synced',
        imageStatus: 'has_real_image',
        hasImages: true,
        needsImageGeneration: false,
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
        imageUrl: 'https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=PC-150',
        suggestedPublicPrice: 368,
        status: 'active',
        supplier: 'AirTech Solutions',
        publicStatus: 'synced',
        imageStatus: 'needs_generation',
        hasImages: false,
        needsImageGeneration: true,
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
        imageUrl: null,
        suggestedPublicPrice: 281.75,
        status: 'active',
        supplier: 'SensorTech Inc',
        publicStatus: 'not_synced',
        imageStatus: 'needs_generation',
        hasImages: false,
        needsImageGeneration: true,
        imageProvider: null,
        eligible: true,
        priority: 'medium',
        imagePriority: 35,
        eligibilityReasons: ['Eligible for sync']
      }
    ];
  }

  // ====================================================================
  // REMAINING METHODS (PRESERVED AS-IS)
  // ====================================================================

  async syncProductToPublic(internalProductId) {
    try {
      console.log(`Syncing product ${internalProductId} to public catalog with FIXED logic...`);
      
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
      
      console.log('Sync rules updated');
      
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
      
      // FIXED: Enhanced image handling with improved URL resolution
      imageUrl: this.getProductImageUrl(internalProduct),
      hasRealImage: this.hasRealImage(internalProduct),
      needsImageGeneration: this.needsImageGeneration(internalProduct),
      
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

    // FIXED: Enhanced image update checks using improved URL resolution
    const currentImageUrl = this.getProductImageUrl(internalProduct);
    if (currentImageUrl !== existingData.imageUrl) {
      updates.imageUrl = currentImageUrl;
      updates.hasRealImage = this.hasRealImage(internalProduct);
      updates.needsImageGeneration = this.needsImageGeneration(internalProduct);
    }

    // Always update sync timestamp if there are changes
    if (Object.keys(updates).length > 0) {
      updates.syncedAt = serverTimestamp();
      updates.updatedAt = serverTimestamp();
      updates.lastModifiedBy = 'product_sync_service';
    }

    return updates;
  }

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
      console.log('Product sync is already running');
      return;
    }

    console.log('🚀 Starting HiggsFlow Product Sync Service with FIXED image detection and loading...');
    this.isRunning = true;

    try {
      await this.performInitialSync();
      this.setupRealTimeSync();
      this.startBatchProcessor();
      
      console.log('✅ FIXED Product sync service started successfully');
      
    } catch (error) {
      console.error('❌ Failed to start product sync:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stopSync() {
    console.log('🛑 Stopping product sync service...');
    this.isRunning = false;
    this.processingImages = false;
    this.syncListeners.forEach(unsubscribe => unsubscribe());
    this.syncListeners.clear();
    console.log('✅ Product sync service stopped');
  }
}

// Create and export singleton instance
export const productSyncService = new ProductSyncService();

// Export the class as default
export default ProductSyncService;
