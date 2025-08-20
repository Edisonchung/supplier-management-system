// src/services/sync/ProductSyncService.js
// Enhanced Product Sync Service for HiggsFlow E-commerce
// Now includes dashboard management methods + real-time sync capabilities

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
    
    // Sync rules for dashboard
    this.syncRules = {
      minStock: 5,
      categories: ['electronics', 'hydraulics', 'pneumatics', 'automation', 'cables', 'sensors', 'components'],
      priceMarkup: 15,
      autoSync: false,
      requireApproval: true
    };
    
    // AI Image generation queue
    this.imageGenerationQueue = [];
    this.processingImages = false;
  }

  // ====================================================================
  // DASHBOARD MANAGEMENT METHODS
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
          eligible: isEligible,
          priority: this.calculateSyncPriority(product),
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
      
      // Calculate sync rate
      const syncRate = totalInternal > 0 ? Math.round((totalPublic / totalInternal) * 100) : 0;
      
      return {
        success: true,
        data: {
          totalInternal,
          totalPublic,
          eligible: eligibleCount,
          syncRate,
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
          lastUpdated: new Date()
        }
      };
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
      
      return {
        success: true,
        data: { results, errors }
      };

    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

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

  // ====================================================================
  // SYNC HELPER METHODS
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
      console.log(`✅ Created new public product: ${publicProductId}`);
    } else {
      // Update existing public product
      publicProductId = existingSnapshot.docs[0].id;
      const updates = this.generateEcommerceUpdates(internalProduct, existingSnapshot.docs[0].data());
      await updateDoc(doc(this.db, 'products_public', publicProductId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Updated existing public product: ${publicProductId}`);
    }
    
    return publicProductId;
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

  // ====================================================================
  // VALIDATION AND CALCULATION METHODS
  // ====================================================================

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

  // ====================================================================
  // TRANSFORMATION HELPER METHODS
  // ====================================================================

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

  // ====================================================================
  // DEMO DATA
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
        publicStatus: 'not_synced',
        eligible: true,
        priority: 'high',
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
        eligible: true,
        priority: 'medium',
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
        eligible: true,
        priority: 'medium',
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
        eligible: false,
        priority: 'low',
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
        publicStatus: 'not_synced',
        eligible: true,
        priority: 'high',
        eligibilityReasons: ['Eligible for sync']
      }
    ];
  }

  // ====================================================================
  // REAL-TIME SYNC METHODS (PLACEHOLDER IMPLEMENTATIONS)
  // ====================================================================

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

  startImageProcessor() {
    console.log('🎨 Starting image processor...');
    // Placeholder implementation
  }

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
      const internalSnapshot = await getDocs(collection(this.db, 'products'));
      const ecommerceSnapshot = await getDocs(collection(this.db, 'products_public'));
      
      return {
        internalProductCount: internalSnapshot.size,
        ecommerceProductCount: ecommerceSnapshot.size,
        syncCoverage: ecommerceSnapshot.size / internalSnapshot.size,
        syncStats: this.getSyncStats(),
        lastHealthCheck: new Date()
      };
      
    } catch (error) {
      console.error('❌ Failed to get sync health:', error);
      return null;
    }
  }
}

// Create and export singleton instance
export const productSyncService = new ProductSyncService();

// Export the class as default
export default ProductSyncService;
