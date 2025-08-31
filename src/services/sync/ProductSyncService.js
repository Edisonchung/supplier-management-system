// src/services/sync/ProductSyncService.js
// Enhanced Product Sync Service for HiggsFlow E-commerce
// FIXED: Corrected image detection logic for placeholder vs real images

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
    
    console.log('ProductSyncService initialized with FIXED image detection logic');
  }

  // ====================================================================
  // FIXED: IMAGE DETECTION LOGIC
  // ====================================================================

  /**
   * FIXED: Check if product needs image generation
   * This now correctly identifies placeholder images vs real images
   */
  needsImageGeneration(product) {
    // No image URL at all = needs generation
    if (!product.imageUrl && !product.image_url && !product.photo) {
      return true;
    }
    
    const imageUrl = product.imageUrl || product.image_url || product.photo || '';
    
    // Empty or null image URL = needs generation
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
    const imageUrl = product.imageUrl || product.image_url || product.photo || '';
    
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
   * FIXED: Helper to identify placeholder images
   */
  isPlaceholderImage(imageUrl) {
    if (!imageUrl) return true;
    
    const placeholderPatterns = [
      'placeholder',
      'via.placeholder',
      'default-image',
      'no-image',
      'temp-image'
    ];
    
    return placeholderPatterns.some(pattern => imageUrl.includes(pattern));
  }

  // ====================================================================
  // FIXED: REAL SYNC IMPLEMENTATION
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
      
      // FIXED: Image generation setup with corrected logic
      imageUrl: internalProduct.imageUrl || null,
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
  // FIXED: AI IMAGE GENERATION METHODS
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

  async generateProductImagesWithMCP(product) {
    try {
      console.log(`Generating images for ${product.name} using MCP + OpenAI...`);
      
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
      
      console.log(`Making request to: ${this.mcpApiBase}/api/mcp/generate-product-images`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(`${this.mcpApiBase}/api/mcp/generate-product-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Image generation failed');
      }

      console.log(`MCP generated ${result.imagesGenerated} images using ${result.provider}`);
      
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
      console.error('MCP image generation failed:', error);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out after 60 seconds');
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

  async updateProductImages(publicProductId, images) {
    try {
      await updateDoc(doc(this.db, 'products_public', publicProductId), {
        imageUrl: images.primary?.url || images.technical?.url || null,
        images: images,
        hasRealImage: true,
        needsImageGeneration: false,
        imageGenerationStatus: images.generated ? 'completed' : 'failed',
        lastImageUpdate: new Date()
      });
      
      console.log(`Updated images for product ${publicProductId}`);
      
    } catch (error) {
      console.error('Failed to update product images:', error);
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
          lastImageError: new Date()
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
  // DASHBOARD MANAGEMENT METHODS (FIXED)
  // ====================================================================

  async getInternalProductsWithSyncStatus() {
    try {
      console.log('Fetching internal products with FIXED sync status...');
      
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

      // Enhance internal products with FIXED sync status
      const productsWithStatus = internalProducts.map(product => {
        const publicVersion = publicProductMap.get(product.id);
        const isEligible = this.isEligibleForSync(product);
        
        return {
          ...product,
          publicStatus: publicVersion ? 'synced' : 'not_synced',
          // FIXED: Image status tracking using corrected logic
          imageStatus: this.needsImageGeneration(product) ? 'needs_generation' : 
                      this.hasRealImage(product) ? 'has_real_image' : 'placeholder',
          hasImages: this.hasRealImage(product),
          needsImageGeneration: this.needsImageGeneration(product),
          imageProvider: publicVersion?.images?.provider || null,
          eligible: isEligible,
          priority: this.calculateSyncPriority(product),
          imagePriority: this.calculateImagePriority(product),
          suggestedPublicPrice: this.calculatePublicPrice(product.price || 0),
          eligibilityReasons: isEligible ? ['Eligible for sync'] : [this.getIneligibilityReason(product)]
        };
      });

      console.log(`Loaded ${productsWithStatus.length} products with FIXED sync status`);
      
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
      
      // FIXED: Count products with real images vs placeholders
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
          // FIXED: Image statistics with corrected logic
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
  // EXISTING SYNC METHODS (UPDATED WITH FIXES)
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
    
    // FIXED: Queue for image generation if needed
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
  // HELPER METHODS
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
      // FIXED: Image generation stats
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

  // FIXED: Demo data with corrected image status
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

  // EXISTING METHODS (UNCHANGED OR MINIMALLY UPDATED)

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
      
      // FIXED: Image handling
      imageUrl: internalProduct.imageUrl || null,
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

    // FIXED: Check for image updates
    const currentImageUrl = internalProduct.imageUrl || internalProduct.image_url;
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

    console.log('Starting HiggsFlow Product Sync Service with FIXED image detection...');
    this.isRunning = true;

    try {
      await this.performInitialSync();
      this.setupRealTimeSync();
      this.startBatchProcessor();
      
      console.log('FIXED Product sync service started successfully');
      
    } catch (error) {
      console.error('Failed to start product sync:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stopSync() {
    console.log('Stopping product sync service...');
    this.isRunning = false;
    this.processingImages = false;
    this.syncListeners.forEach(unsubscribe => unsubscribe());
    this.syncListeners.clear();
    console.log('Product sync service stopped');
  }
}

// Create and export singleton instance
export const productSyncService = new ProductSyncService();

// Export the class as default
export default ProductSyncService;
