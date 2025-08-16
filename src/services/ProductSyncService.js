// src/services/sync/ProductSyncService.js
// Real-time Product Sync Service for HiggsFlow E-commerce
// Syncs between internal products/ and e-commerce products_public/ collections

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
      syncedProducts: new Set()
    };
    
    // AI Image generation queue
    this.imageGenerationQueue = [];
    this.processingImages = false;
  }

  // ====================================================================
  // MAIN SYNC ORCHESTRATOR
  // ====================================================================

  async startSync() {
    if (this.isRunning) {
      console.log('🔄 Product sync is already running');
      return;
    }

    console.log('🚀 Starting HiggsFlow Product Sync Service...');
    this.isRunning = true;

    try {
      // 1. Initial full sync (existing products)
      await this.performInitialSync();
      
      // 2. Set up real-time listeners
      this.setupRealTimeSync();
      
      // 3. Start batch processing queue
      this.startBatchProcessor();
      
      // 4. Start AI image generation processor
      this.startImageProcessor();
      
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

    // Clean up all listeners
    this.syncListeners.forEach(unsubscribe => unsubscribe());
    this.syncListeners.clear();

    console.log('✅ Product sync service stopped');
  }

  // ====================================================================
  // INITIAL SYNC (Existing Products)
  // ====================================================================

  async performInitialSync() {
    console.log('📦 Performing initial product sync from internal to e-commerce...');

    try {
      // Get all products from internal system
      const internalProductsQuery = query(
        collection(this.db, 'products'), 
        orderBy('dateAdded', 'desc')
      );
      const internalSnapshot = await getDocs(internalProductsQuery);

      console.log(`📊 Found ${internalSnapshot.size} products in internal system`);

      // Get existing e-commerce products for comparison
      const ecommerceSnapshot = await getDocs(collection(this.db, 'products_public'));
      const existingEcommerceProducts = new Map();
      
      ecommerceSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.internalProductId) {
          existingEcommerceProducts.set(data.internalProductId, {
            id: doc.id,
            data: data
          });
        }
      });

      console.log(`📊 Found ${existingEcommerceProducts.size} existing e-commerce products`);

      // Process each internal product
      const batch = writeBatch(this.db);
      let batchCount = 0;
      let syncedCount = 0;

      for (const internalDoc of internalSnapshot.docs) {
        const internalProduct = { id: internalDoc.id, ...internalDoc.data() };
        
        try {
          if (existingEcommerceProducts.has(internalProduct.id)) {
            // Update existing e-commerce product
            const existing = existingEcommerceProducts.get(internalProduct.id);
            const updates = this.generateEcommerceUpdates(internalProduct, existing.data);
            
            if (Object.keys(updates).length > 0) {
              batch.update(doc(this.db, 'products_public', existing.id), updates);
              batchCount++;
              syncedCount++;
              this.syncStats.syncedProducts.add(internalProduct.id);
            }
          } else {
            // Create new e-commerce product
            const ecommerceProduct = this.transformToEcommerceProduct(internalProduct);
            
            batch.set(doc(collection(this.db, 'products_public')), ecommerceProduct);
            batchCount++;
            syncedCount++;
            this.syncStats.syncedProducts.add(internalProduct.id);
            
            // Queue for AI image generation
            this.queueImageGeneration(internalProduct);
          }

          // Commit batch when it reaches size limit
          if (batchCount >= this.batchSize) {
            await batch.commit();
            console.log(`📦 Synced batch of ${batchCount} products`);
            batchCount = 0;
            
            // Small delay to prevent overwhelming Firestore
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error) {
          console.error(`❌ Error syncing product ${internalProduct.id}:`, error);
          this.syncStats.errorCount++;
        }
      }

      // Commit remaining items in batch
      if (batchCount > 0) {
        await batch.commit();
        console.log(`📦 Synced final batch of ${batchCount} products`);
      }

      this.syncStats.totalSynced += syncedCount;
      this.syncStats.successCount += syncedCount;
      this.syncStats.lastSyncTime = new Date();

      console.log(`✅ Initial sync completed: ${syncedCount} products synced`);

    } catch (error) {
      console.error('❌ Initial sync failed:', error);
      throw error;
    }
  }

  // ====================================================================
  // REAL-TIME SYNC LISTENERS
  // ====================================================================

  setupRealTimeSync() {
    console.log('👂 Setting up real-time sync listeners...');

    // Listen to internal products collection changes
    const internalProductsQuery = query(
      collection(this.db, 'products'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      internalProductsQuery,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const productData = { id: change.doc.id, ...change.doc.data() };
          
          // Skip if this is from the initial sync
          if (this.syncStats.syncedProducts.has(productData.id)) {
            this.syncStats.syncedProducts.delete(productData.id);
            return;
          }
          
          switch (change.type) {
            case 'added':
              console.log(`📦 New product detected: ${productData.name}`);
              this.queueSync('create', productData);
              break;
            case 'modified':
              console.log(`🔄 Product updated: ${productData.name}`);
              this.queueSync('update', productData);
              break;
            case 'removed':
              console.log(`🗑️ Product deleted: ${productData.name}`);
              this.queueSync('delete', productData);
              break;
          }
        });
      },
      (error) => {
        console.error('❌ Real-time sync listener error:', error);
      }
    );

    this.syncListeners.set('internal_products', unsubscribe);
    console.log('✅ Real-time sync listeners active');
  }

  // ====================================================================
  // SYNC QUEUE MANAGEMENT
  // ====================================================================

  queueSync(operation, productData) {
    const syncItem = {
      id: `${operation}_${productData.id}_${Date.now()}`,
      operation,
      productData,
      timestamp: new Date(),
      retryCount: 0,
      status: 'queued'
    };

    this.syncQueue.push(syncItem);
    console.log(`📋 Queued ${operation} operation for product: ${productData.name}`);
  }

  startBatchProcessor() {
    console.log('⚡ Starting batch processor...');

    const processQueue = async () => {
      if (!this.isRunning || this.syncQueue.length === 0) {
        return;
      }

      const batch = this.syncQueue.splice(0, this.batchSize);
      console.log(`🔄 Processing batch of ${batch.length} sync operations`);

      const promises = batch.map(item => this.processSyncItem(item));
      await Promise.allSettled(promises);

      // Log batch completion
      const completed = batch.filter(item => item.status === 'completed').length;
      const failed = batch.filter(item => item.status === 'failed').length;
      
      console.log(`📊 Batch completed: ${completed} success, ${failed} failed`);
    };

    // Process queue every 3 seconds
    setInterval(processQueue, 3000);
  }

  async processSyncItem(syncItem) {
    try {
      syncItem.status = 'processing';
      
      switch (syncItem.operation) {
        case 'create':
          await this.createEcommerceProduct(syncItem.productData);
          break;
        case 'update':
          await this.updateEcommerceProduct(syncItem.productData);
          break;
        case 'delete':
          await this.deleteEcommerceProduct(syncItem.productData);
          break;
      }

      syncItem.status = 'completed';
      this.syncStats.successCount++;
      
      // Log sync operation
      await this.logSyncOperation(syncItem, 'success');
      
    } catch (error) {
      console.error(`❌ Sync operation failed for ${syncItem.productData.name}:`, error);
      
      syncItem.retryCount++;
      if (syncItem.retryCount < this.retryAttempts) {
        syncItem.status = 'queued';
        this.syncQueue.push(syncItem); // Re-queue for retry
      } else {
        syncItem.status = 'failed';
        this.syncStats.errorCount++;
        await this.logSyncOperation(syncItem, 'failed', error.message);
      }
    }
  }

  // ====================================================================
  // E-COMMERCE PRODUCT OPERATIONS
  // ====================================================================

  async createEcommerceProduct(internalProduct) {
    console.log(`➕ Creating e-commerce product for: ${internalProduct.name}`);

    const ecommerceProduct = this.transformToEcommerceProduct(internalProduct);
    
    const docRef = await addDoc(collection(this.db, 'products_public'), ecommerceProduct);
    
    // Queue for AI image generation
    this.queueImageGeneration(internalProduct, docRef.id);
    
    console.log(`✅ Created e-commerce product ${docRef.id} from internal ${internalProduct.id}`);
    return docRef.id;
  }

  async updateEcommerceProduct(internalProduct) {
    console.log(`🔄 Updating e-commerce product for: ${internalProduct.name}`);

    // Find corresponding e-commerce product
    const ecommerceQuery = query(
      collection(this.db, 'products_public'),
      where('internalProductId', '==', internalProduct.id)
    );

    const ecommerceSnapshot = await getDocs(ecommerceQuery);
    
    if (ecommerceSnapshot.empty) {
      console.log(`⚠️ No e-commerce product found for internal ${internalProduct.id}, creating new one`);
      return await this.createEcommerceProduct(internalProduct);
    }

    // Update all matching e-commerce products (should typically be only one)
    const updatePromises = ecommerceSnapshot.docs.map(async (ecommerceDoc) => {
      const existingData = ecommerceDoc.data();
      const updates = this.generateEcommerceUpdates(internalProduct, existingData);
      
      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(this.db, 'products_public', ecommerceDoc.id), updates);
        console.log(`✅ Updated e-commerce product ${ecommerceDoc.id}`);
        
        // Check if image regeneration is needed
        if (this.shouldRegenerateImages(updates)) {
          this.queueImageGeneration(internalProduct, ecommerceDoc.id);
        }
      } else {
        console.log(`📝 No updates needed for e-commerce product ${ecommerceDoc.id}`);
      }
    });

    await Promise.all(updatePromises);
  }

  async deleteEcommerceProduct(internalProduct) {
    console.log(`🗑️ Deleting e-commerce product for: ${internalProduct.name}`);

    // Find corresponding e-commerce product
    const ecommerceQuery = query(
      collection(this.db, 'products_public'),
      where('internalProductId', '==', internalProduct.id)
    );

    const ecommerceSnapshot = await getDocs(ecommerceQuery);
    
    if (ecommerceSnapshot.empty) {
      console.log(`⚠️ No e-commerce product found for internal ${internalProduct.id}`);
      return;
    }

    // Delete all matching e-commerce products
    const deletePromises = ecommerceSnapshot.docs.map(async (ecommerceDoc) => {
      await deleteDoc(doc(this.db, 'products_public', ecommerceDoc.id));
      console.log(`✅ Deleted e-commerce product ${ecommerceDoc.id}`);
    });

    await Promise.all(deletePromises);
  }

  // ====================================================================
  // DATA TRANSFORMATION (Internal → E-commerce)
  // ====================================================================

  transformToEcommerceProduct(internalProduct) {
    console.log(`🔄 Transforming internal product: ${internalProduct.name}`);

    // Generate customer-friendly display name
    const displayName = this.generateDisplayName(internalProduct);
    
    // Generate customer description
    const customerDescription = this.generateCustomerDescription(internalProduct);
    
    // Calculate e-commerce pricing
    const pricing = this.calculateEcommercePricing(internalProduct);
    
    // Generate SEO data
    const seo = this.generateSEOData(internalProduct);

    // Determine availability status
    const availability = this.calculateAvailability(internalProduct);

    return {
      // Link to internal system
      internalProductId: internalProduct.id,
      
      // Customer-facing information
      displayName: displayName,
      customerDescription: customerDescription,
      
      // Pricing (optimized for customers)
      pricing: pricing,
      
      // Images (will be generated by AI processor)
      images: {
        primary: null, // Will be filled by AI image generation
        technical: null,
        application: null,
        gallery: [],
        imageGenerated: false,
        lastImageUpdate: null
      },
      
      // SEO & Search Optimization
      seo: seo,
      
      // Category & Classification
      category: this.mapCategory(internalProduct.category),
      subcategory: this.mapSubcategory(internalProduct.category),
      industryApplications: this.determineIndustryApplications(internalProduct),
      productTags: this.generateProductTags(internalProduct),
      
      // Availability & Stock (synced from internal)
      availability: availability,
      
      // Technical Specifications
      specifications: this.formatSpecifications(internalProduct),
      
      // Supplier Information (public-facing)
      supplier: this.getSupplierInfo(internalProduct),
      
      // E-commerce Settings
      visibility: this.determineVisibility(internalProduct),
      featured: this.shouldBeFeatured(internalProduct),
      trending: false,
      newProduct: this.isNewProduct(internalProduct),
      minOrderQty: 1,
      maxOrderQty: Math.max(1000, internalProduct.stock || 100),
      freeShippingThreshold: 200.00,
      estimatedDelivery: this.calculateDeliveryTime(internalProduct),
      
      // Customer Analytics (initialized)
      analytics: {
        views: 0,
        uniqueViews: 0,
        inquiries: 0,
        cartAdds: 0,
        orders: 0,
        revenue: 0,
        conversionRate: 0,
        averageRating: 0,
        reviewCount: 0,
        lastViewed: null,
        popularityScore: 0
      },
      
      // Marketing & Promotions
      promotions: {
        onSale: false,
        saleEndDate: null,
        freeShipping: pricing.discountPrice >= 200,
        bulkDiscount: true,
        volumeDiscount: true,
        loyaltyPoints: Math.round(pricing.discountPrice),
        referralBonus: Math.round(pricing.discountPrice * 0.05)
      },
      
      // Reviews & Ratings (structure for future)
      reviews: {
        enabled: true,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        lastReviewDate: null
      },
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
      lastModifiedBy: 'product_sync_service',
      version: 1.0,
      dataSource: 'internal_sync'
    };
  }

  generateEcommerceUpdates(internalProduct, existingEcommerceData) {
    const updates = {};

    // Check for price changes
    const newPricing = this.calculateEcommercePricing(internalProduct);
    if (JSON.stringify(newPricing) !== JSON.stringify(existingEcommerceData.pricing)) {
      updates.pricing = newPricing;
      console.log(`💰 Price update for ${internalProduct.name}: ${newPricing.discountPrice}`);
    }

    // Check for stock changes
    const newAvailability = this.calculateAvailability(internalProduct);
    if (JSON.stringify(newAvailability) !== JSON.stringify(existingEcommerceData.availability)) {
      updates.availability = newAvailability;
      console.log(`📦 Stock update for ${internalProduct.name}: ${newAvailability.stockLevel}`);
    }

    // Check for name/description changes
    const newDisplayName = this.generateDisplayName(internalProduct);
    if (newDisplayName !== existingEcommerceData.displayName) {
      updates.displayName = newDisplayName;
      updates.customerDescription = this.generateCustomerDescription(internalProduct);
      console.log(`📝 Content update for ${internalProduct.name}`);
    }

    // Check for category changes
    const newCategory = this.mapCategory(internalProduct.category);
    if (newCategory !== existingEcommerceData.category) {
      updates.category = newCategory;
      updates.subcategory = this.mapSubcategory(internalProduct.category);
      updates.seo = this.generateSEOData(internalProduct);
      console.log(`🏷️ Category update for ${internalProduct.name}: ${newCategory}`);
    }

    // Check for supplier changes
    const newSupplier = this.getSupplierInfo(internalProduct);
    if (JSON.stringify(newSupplier) !== JSON.stringify(existingEcommerceData.supplier)) {
      updates.supplier = newSupplier;
      console.log(`🏢 Supplier update for ${internalProduct.name}`);
    }

    // Check for specification changes
    const newSpecs = this.formatSpecifications(internalProduct);
    if (JSON.stringify(newSpecs) !== JSON.stringify(existingEcommerceData.specifications)) {
      updates.specifications = newSpecs;
      console.log(`📋 Specifications update for ${internalProduct.name}`);
    }

    // Always update sync timestamp if there are changes
    if (Object.keys(updates).length > 0) {
      updates.syncedAt = serverTimestamp();
      updates.updatedAt = serverTimestamp();
      updates.lastModifiedBy = 'product_sync_service';
    }

    return updates;
  }

  // ====================================================================
  // AI IMAGE GENERATION
  // ====================================================================

  queueImageGeneration(internalProduct, ecommerceProductId = null) {
    const imageJob = {
      id: `img_${internalProduct.id}_${Date.now()}`,
      internalProduct,
      ecommerceProductId,
      timestamp: new Date(),
      retryCount: 0,
      status: 'queued'
    };

    this.imageGenerationQueue.push(imageJob);
    console.log(`🎨 Queued AI image generation for: ${internalProduct.name}`);
  }

  startImageProcessor() {
    console.log('🎨 Starting AI image generation processor...');

    const processImages = async () => {
      if (!this.isRunning || this.processingImages || this.imageGenerationQueue.length === 0) {
        return;
      }

      this.processingImages = true;
      const imageJob = this.imageGenerationQueue.shift();

      try {
        console.log(`🎨 Generating AI images for: ${imageJob.internalProduct.name}`);
        
        // Generate AI images using your existing MCP service
        const images = await this.generateAIImages(imageJob.internalProduct);
        
        // Update e-commerce product with generated images
        if (imageJob.ecommerceProductId) {
          await updateDoc(doc(this.db, 'products_public', imageJob.ecommerceProductId), {
            images: {
              ...images,
              imageGenerated: true,
              lastImageUpdate: serverTimestamp()
            },
            updatedAt: serverTimestamp()
          });
        } else {
          // Find the e-commerce product and update
          const ecommerceQuery = query(
            collection(this.db, 'products_public'),
            where('internalProductId', '==', imageJob.internalProduct.id)
          );
          const snapshot = await getDocs(ecommerceQuery);
          
          for (const docSnap of snapshot.docs) {
            await updateDoc(docSnap.ref, {
              images: {
                ...images,
                imageGenerated: true,
                lastImageUpdate: serverTimestamp()
              },
              updatedAt: serverTimestamp()
            });
          }
        }
        
        console.log(`✅ AI images generated for: ${imageJob.internalProduct.name}`);
        
      } catch (error) {
        console.error(`❌ AI image generation failed for ${imageJob.internalProduct.name}:`, error);
        
        // Retry logic
        imageJob.retryCount++;
        if (imageJob.retryCount < 2) {
          this.imageGenerationQueue.push(imageJob);
        }
      }

      this.processingImages = false;
    };

    // Process images every 10 seconds
    setInterval(processImages, 10000);
  }

  async generateAIImages(internalProduct) {
    // TODO: Integrate with your Railway MCP service for AI image generation
    // For now, return placeholder structure
    
    const category = (internalProduct.category || 'industrial').toLowerCase();
    const productName = internalProduct.name?.toLowerCase() || 'product';
    
    return {
      primary: `https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=${encodeURIComponent(productName.substring(0, 20))}`,
      technical: `https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Technical+Specs`,
      application: `https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=${encodeURIComponent(category)}+Application`,
      gallery: [
        `https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=Angle+1`,
        `https://via.placeholder.com/300x300/6366F1/FFFFFF?text=Angle+2`
      ]
    };
  }

  shouldRegenerateImages(updates) {
    // Regenerate images if category, name, or major specs changed
    return updates.category || updates.displayName || updates.specifications;
  }

  // ====================================================================
  // HELPER FUNCTIONS
  // ====================================================================

  generateDisplayName(internalProduct) {
    let displayName = internalProduct.name || 'Industrial Product';
    
    // Add brand if available
    if (internalProduct.brand) {
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
    
    const qualifier = categoryQualifiers[internalProduct.category];
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
      
      description = `High-quality ${category} product from ${brand}. `;
      description += `Suitable for professional industrial applications. `;
      description += `Manufactured to industry standards with reliable performance and durability.`;
      
      if (internalProduct.sku) {
        description += ` Model/SKU: ${internalProduct.sku}.`;
      }
    }
    
    return description;
  }

  calculateEcommercePricing(internalProduct) {
    const basePrice = internalProduct.price || 0;
    
    // Apply markup for e-commerce (20% markup)
    const markup = 1.20;
    const listPrice = basePrice * markup;
    
    // Calculate discount price (10% discount from list)
    const discountPrice = listPrice * 0.90;
    
    // Generate bulk pricing tiers
    const bulkPricing = [
      { minQty: 10, unitPrice: Math.round(discountPrice * 0.95 * 100) / 100, discount: '5%' },
      { minQty: 25, unitPrice: Math.round(discountPrice * 0.90 * 100) / 100, discount: '10%' },
      { minQty: 50, unitPrice: Math.round(discountPrice * 0.85 * 100) / 100, discount: '15%' },
      { minQty: 100, unitPrice: Math.round(discountPrice * 0.80 * 100) / 100, discount: '20%' }
    ];

    return {
      listPrice: Math.round(listPrice * 100) / 100,
      discountPrice: Math.round(discountPrice * 100) / 100,
      bulkPricing: bulkPricing,
      currency: 'MYR',
      priceValidUntil: '2025-12-31T23:59:59Z',
      lastPriceUpdate: serverTimestamp()
    };
  }

  calculateAvailability(internalProduct) {
    const stockLevel = internalProduct.stock || 0;
    const minStock = internalProduct.minStock || 0;
    
    let stockStatus = 'good';
    if (stockLevel === 0) {
      stockStatus = 'out_of_stock';
    } else if (stockLevel <= minStock) {
      stockStatus = 'low';
    } else if (stockLevel <= minStock * 2) {
      stockStatus = 'critical';
    }

    return {
      inStock: stockLevel > 0,
      stockLevel: stockLevel,
      reservedStock: 0, // Could be calculated from pending orders
      availableStock: stockLevel,
      leadTime: this.calculateLeadTime(internalProduct),
      supplierStockLevel: null, // Would need supplier integration
      lastStockUpdate: serverTimestamp(),
      stockStatus: stockStatus,
      nextRestockDate: null // Could be calculated based on supplier lead times
    };
  }

  calculateLeadTime(internalProduct) {
    const stockLevel = internalProduct.stock || 0;
    
    if (stockLevel > 10) {
      return '1-2 business days';
    } else if (stockLevel > 0) {
      return '2-3 business days';
    } else {
      return '5-7 business days';
    }
  }

  generateSEOData(internalProduct) {
    const name = (internalProduct.name || '').toLowerCase();
    const category = (internalProduct.category || '').toLowerCase();
    const brand = (internalProduct.brand || '').toLowerCase();
    
    const keywords = [
      name,
      category,
      brand,
      'industrial',
      'malaysia',
      'professional',
      'quality'
    ].filter(Boolean);

    const searchTerms = [
      ...keywords,
      internalProduct.sku?.toLowerCase(),
      'equipment',
      'supply',
      'manufacturer'
    ].filter(Boolean);

    return {
      keywords: keywords,
      searchTerms: searchTerms,
      categoryTags: [category, 'industrial', 'professional', brand].filter(Boolean),
      metaTitle: `${internalProduct.name} - Professional ${category} | HiggsFlow`,
      metaDescription: `Professional ${category} - ${internalProduct.name}. High-quality industrial equipment from verified Malaysian suppliers. Fast delivery and competitive pricing.`,
      searchPriority: this.calculateSearchPriority(internalProduct)
    };
  }

  // Additional helper methods...
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
    
    return categoryMap[internalCategory] || 'Industrial Equipment';
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
    
    return subcategoryMap[internalCategory] || 'General Equipment';
  }

  determineIndustryApplications(internalProduct) {
    const category = internalProduct.category?.toLowerCase() || '';
    
    const applicationMap = {
      'electronics': ['Electronics Manufacturing', 'Telecommunications', 'Automotive'],
      'hydraulics': ['Manufacturing', 'Construction', 'Heavy Machinery'],
      'pneumatics': ['Automation', 'Manufacturing', 'Packaging'],
      'automation': ['Manufacturing', 'Process Control', 'Robotics'],
      'sensors': ['Quality Control', 'Process Monitoring', 'Safety Systems'],
      'cables': ['Infrastructure', 'Manufacturing', 'Power Distribution'],
      'components': ['General Manufacturing', 'Assembly', 'Maintenance']
    };

    return applicationMap[category] || ['General Industrial', 'Manufacturing'];
  }

  generateProductTags(internalProduct) {
    const tags = [];
    
    if (internalProduct.brand) tags.push(internalProduct.brand.toLowerCase());
    if (internalProduct.category) tags.push(internalProduct.category);
    if (internalProduct.stock > 100) tags.push('high-stock');
    if (internalProduct.stock <= internalProduct.minStock) tags.push('low-stock');
    if (this.isNewProduct(internalProduct)) tags.push('new-product');
    if (internalProduct.price > 1000) tags.push('premium');
    
    return tags;
  }

  formatSpecifications(internalProduct) {
    return {
      sku: internalProduct.sku || 'Contact for details',
      brand: internalProduct.brand || 'Professional Grade',
      category: internalProduct.category || 'Industrial',
      description: internalProduct.description || 'Contact for detailed specifications',
      notes: internalProduct.notes || null,
      warranty: '1 year manufacturer warranty',
      compliance: ['Industry Standard'],
      packageInfo: 'Standard industrial packaging'
    };
  }

  getSupplierInfo(internalProduct) {
    // This would typically fetch from suppliers collection
    // For now, return default structure
    return {
      name: 'Verified Industrial Supplier',
      rating: 4.5,
      location: 'Malaysia',
      verified: true,
      supplierId: internalProduct.supplierId || 'VERIFIED',
      yearsOfExperience: 10,
      responseTime: '< 24 hours',
      onTimeDelivery: 95.0
    };
  }

  determineVisibility(internalProduct) {
    // Make product public if it has stock and is not in 'pending' status
    const hasStock = (internalProduct.stock || 0) > 0;
    const isActive = internalProduct.status !== 'pending';
    
    return (hasStock && isActive) ? 'public' : 'private';
  }

  shouldBeFeatured(internalProduct) {
    // Feature products with good stock and higher prices
    const hasGoodStock = (internalProduct.stock || 0) > 20;
    const isHighValue = (internalProduct.price || 0) > 500;
    
    return hasGoodStock && isHighValue;
  }

  isNewProduct(internalProduct) {
    // Consider products added in the last 30 days as new
    if (!internalProduct.dateAdded) return false;
    
    const addedDate = new Date(internalProduct.dateAdded);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return addedDate > thirtyDaysAgo;
  }

  calculateDeliveryTime(internalProduct) {
    const stockLevel = internalProduct.stock || 0;
    
    if (stockLevel > 10) {
      return '1-2 business days';
    } else if (stockLevel > 0) {
      return '3-5 business days';
    } else {
      return '7-14 business days';
    }
  }

  calculateSearchPriority(internalProduct) {
    let priority = 'medium';
    
    const hasGoodStock = (internalProduct.stock || 0) > 10;
    const isHighValue = (internalProduct.price || 0) > 500;
    const isNew = this.isNewProduct(internalProduct);
    
    if (hasGoodStock && isHighValue) priority = 'high';
    if (isNew) priority = 'high';
    if ((internalProduct.stock || 0) === 0) priority = 'low';
    
    return priority;
  }

  // ====================================================================
  // SYNC LOGGING
  // ====================================================================

  async logSyncOperation(syncItem, status, errorMessage = null) {
    try {
      const logEntry = {
        internalProductId: syncItem.productData.id,
        ecommerceProductId: null, // Would be set if known
        syncType: syncItem.operation,
        syncDirection: 'internal_to_ecommerce',
        syncStatus: status,
        syncedAt: serverTimestamp(),
        errorMessage: errorMessage,
        retryCount: syncItem.retryCount,
        processingTime: Date.now() - syncItem.timestamp.getTime(),
        metadata: {
          triggeredBy: 'real_time_sync',
          productName: syncItem.productData.name,
          productCategory: syncItem.productData.category,
          batchId: null
        }
      };

      await addDoc(collection(this.db, 'product_sync_log'), logEntry);
      
    } catch (error) {
      console.error('❌ Failed to log sync operation:', error);
    }
  }

  // ====================================================================
  // STATUS & MONITORING
  // ====================================================================

  getSyncStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning,
      queueLength: this.syncQueue.length,
      imageQueueLength: this.imageGenerationQueue.length,
      activeListeners: this.syncListeners.size,
      processingImages: this.processingImages
    };
  }

  async getSyncHealth() {
    try {
      // Count products in both collections
      const internalSnapshot = await getDocs(collection(this.db, 'products'));
      const ecommerceSnapshot = await getDocs(collection(this.db, 'products_public'));
      
      // Check recent sync operations
      const recentSyncQuery = query(
        collection(this.db, 'product_sync_log'),
        orderBy('syncedAt', 'desc')
      );
      const recentSyncSnapshot = await getDocs(recentSyncQuery);
      const recentSyncs = recentSyncSnapshot.docs.slice(0, 10).map(doc => doc.data());

      return {
        internalProductCount: internalSnapshot.size,
        ecommerceProductCount: ecommerceSnapshot.size,
        syncCoverage: ecommerceSnapshot.size / internalSnapshot.size,
        recentSyncOperations: recentSyncs,
        syncStats: this.getSyncStats(),
        lastHealthCheck: new Date()
      };
      
    } catch (error) {
      console.error('❌ Failed to get sync health:', error);
      return null;
    }
  }
}

// ====================================================================
// USAGE & EXPORT
// ====================================================================

// Initialize and start the sync service
export const initializeProductSync = async () => {
  const syncService = new ProductSyncService();
  
  try {
    await syncService.startSync();
    console.log('🎉 Product sync service is now running!');
    
    // Make service available globally for monitoring
    window.productSyncService = syncService;
    
    return syncService;
    
  } catch (error) {
    console.error('❌ Failed to initialize product sync:', error);
    throw error;
  }
};

// React hook for monitoring sync status
export const useProductSyncStatus = (syncService) => {
  const [syncStatus, setSyncStatus] = useState(null);
  
  useEffect(() => {
    if (!syncService) return;
    
    const updateStatus = () => {
      setSyncStatus(syncService.getSyncStats());
    };
    
    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    updateStatus(); // Initial update
    
    return () => clearInterval(interval);
  }, [syncService]);
  
  return syncStatus;
};

export default ProductSyncService;
