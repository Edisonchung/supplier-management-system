// src/services/ProductSyncService.js
// Smart Product Sync Service - Internal to Public Catalog Integration

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  batch,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';

import { 
  db, 
  safeFirestoreOperation, 
  transformFirestoreDoc 
} from '../config/firebase';

export class ProductSyncService {
  constructor() {
    this.db = db;
    this.syncRules = {
      minStock: 5,
      categories: ['electronics', 'hydraulics', 'pneumatics', 'automation', 'cables', 'sensors', 'components'],
      priceMarkup: 15, // 15% markup
      autoSync: false,
      requireApproval: true
    };
  }

  // ====================================================================
  // CORE SYNC OPERATIONS
  // ====================================================================

  // Get all internal products with sync status
  async getInternalProductsWithSyncStatus() {
    return safeFirestoreOperation(async () => {
      console.log('📦 Fetching internal products with sync status...');
      
      try {
        // Get internal products
        const internalQuery = query(
          collection(this.db, 'products'),
          orderBy('updatedAt', 'desc')
        );
        
        const internalSnapshot = await getDocs(internalQuery);
        const internalProducts = internalSnapshot.docs.map(doc => ({
          ...transformFirestoreDoc(doc),
          source: 'internal'
        }));

        // Get public products to check sync status
        const publicQuery = query(collection(this.db, 'catalogProducts'));
        const publicSnapshot = await getDocs(publicQuery);
        const publicProductMap = new Map();
        
        publicSnapshot.docs.forEach(doc => {
          const publicProduct = transformFirestoreDoc(doc);
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
            publicStatus: publicVersion ? {
              synced: true,
              publicId: publicVersion.id,
              lastSync: publicVersion.lastSync,
              syncedAt: publicVersion.syncedAt,
              publicPrice: publicVersion.price,
              publicStock: publicVersion.stock
            } : {
              synced: false,
              eligible: isEligible,
              reason: isEligible ? 'Ready to sync' : this.getIneligibilityReason(product)
            },
            isEligible,
            priority: this.calculateSyncPriority(product)
          };
        });

        console.log(`✅ Loaded ${productsWithStatus.length} products with sync status`);
        return productsWithStatus;

      } catch (error) {
        console.warn('⚠️ Firestore unavailable, using demo data for development');
        return this.getDemoProductsWithSyncStatus();
      }
    });
  }

  // Check if product is eligible for sync
  isEligibleForSync(product) {
    // Check stock levels
    if (product.stock < this.syncRules.minStock) {
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

  // Get reason why product is not eligible
  getIneligibilityReason(product) {
    if (product.stock < this.syncRules.minStock) {
      return `Low stock (${product.stock} < ${this.syncRules.minStock})`;
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

  // Calculate sync priority
  calculateSyncPriority(product) {
    let score = 0;
    
    // Stock level (higher stock = higher priority)
    if (product.stock > 20) score += 3;
    else if (product.stock > 10) score += 2;
    else if (product.stock > 5) score += 1;
    
    // Price range (mid-range products often sell better)
    if (product.price > 100 && product.price < 1000) score += 2;
    else if (product.price >= 1000) score += 1;
    
    // Category popularity
    const popularCategories = ['electronics', 'automation', 'sensors'];
    if (popularCategories.includes(product.category?.toLowerCase())) {
      score += 2;
    }
    
    // Recent updates
    if (product.updatedAt && Date.now() - product.updatedAt.toDate() < 7 * 24 * 60 * 60 * 1000) {
      score += 1;
    }
    
    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  // Sync individual product to public catalog
  async syncProductToPublic(internalProductId) {
    return safeFirestoreOperation(async () => {
      console.log(`🔄 Syncing product ${internalProductId} to public catalog...`);
      
      // Get internal product
      const internalDoc = await getDoc(doc(this.db, 'products', internalProductId));
      if (!internalDoc.exists()) {
        throw new Error('Internal product not found');
      }
      
      const internalProduct = transformFirestoreDoc(internalDoc);
      
      // Check eligibility
      if (!this.isEligibleForSync(internalProduct)) {
        throw new Error(`Product not eligible: ${this.getIneligibilityReason(internalProduct)}`);
      }
      
      // Transform to public format
      const publicProduct = await this.transformToPublicProduct(internalProduct);
      
      // Check if already exists in public catalog
      const existingQuery = query(
        collection(this.db, 'catalogProducts'),
        where('internalProductId', '==', internalProductId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      let publicProductId;
      if (existingSnapshot.empty) {
        // Create new public product
        const docRef = await addDoc(collection(this.db, 'catalogProducts'), publicProduct);
        publicProductId = docRef.id;
        console.log(`✅ Created new public product: ${publicProductId}`);
      } else {
        // Update existing public product
        publicProductId = existingSnapshot.docs[0].id;
        await updateDoc(doc(this.db, 'catalogProducts', publicProductId), {
          ...publicProduct,
          updatedAt: serverTimestamp()
        });
        console.log(`✅ Updated existing public product: ${publicProductId}`);
      }
      
      // Log sync operation
      await this.logSyncOperation(internalProductId, publicProductId, 'sync', 'success');
      
      return publicProductId;
    });
  }

  // Bulk sync multiple products
  async bulkSyncProducts(internalProductIds) {
    return safeFirestoreOperation(async () => {
      console.log(`🔄 Bulk syncing ${internalProductIds.length} products...`);
      
      const results = {
        success: [],
        failed: [],
        total: internalProductIds.length
      };
      
      // Process in batches to avoid Firestore limits
      const batchSize = 10;
      for (let i = 0; i < internalProductIds.length; i += batchSize) {
        const batch = internalProductIds.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map(async (productId) => {
            try {
              const publicId = await this.syncProductToPublic(productId);
              results.success.push({ internalId: productId, publicId });
            } catch (error) {
              results.failed.push({ internalId: productId, error: error.message });
              await this.logSyncOperation(productId, null, 'sync', 'failed', error.message);
            }
          })
        );
        
        // Add delay between batches to avoid rate limits
        if (i + batchSize < internalProductIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Bulk sync complete: ${results.success.length} success, ${results.failed.length} failed`);
      return results;
    });
  }

  // Remove product from public catalog
  async removeFromPublic(internalProductId) {
    return safeFirestoreOperation(async () => {
      console.log(`🗑️ Removing product ${internalProductId} from public catalog...`);
      
      // Find public product
      const publicQuery = query(
        collection(this.db, 'catalogProducts'),
        where('internalProductId', '==', internalProductId)
      );
      const publicSnapshot = await getDocs(publicQuery);
      
      if (publicSnapshot.empty) {
        throw new Error('Product not found in public catalog');
      }
      
      const publicProductId = publicSnapshot.docs[0].id;
      
      // Delete from public catalog
      await deleteDoc(doc(this.db, 'catalogProducts', publicProductId));
      
      // Log operation
      await this.logSyncOperation(internalProductId, publicProductId, 'remove', 'success');
      
      console.log(`✅ Removed from public catalog: ${publicProductId}`);
      return publicProductId;
    });
  }

  // ====================================================================
  // CONFIGURATION MANAGEMENT
  // ====================================================================

  // Get sync rules configuration
  async getSyncRules() {
    return safeFirestoreOperation(async () => {
      try {
        const rulesDoc = await getDoc(doc(this.db, 'settings', 'productSyncRules'));
        if (rulesDoc.exists()) {
          return { ...this.syncRules, ...rulesDoc.data() };
        }
        return this.syncRules;
      } catch (error) {
        console.warn('⚠️ Using default sync rules');
        return this.syncRules;
      }
    });
  }

  // Update sync rules
  async updateSyncRules(newRules) {
    return safeFirestoreOperation(async () => {
      const updatedRules = { ...this.syncRules, ...newRules };
      
      await updateDoc(doc(this.db, 'settings', 'productSyncRules'), {
        ...updatedRules,
        updatedAt: serverTimestamp()
      });
      
      this.syncRules = updatedRules;
      console.log('✅ Sync rules updated');
      return updatedRules;
    });
  }

  // ====================================================================
  // ANALYTICS & REPORTING
  // ====================================================================

  // Get sync statistics
  async getSyncStatistics() {
    return safeFirestoreOperation(async () => {
      try {
        const [internalSnapshot, publicSnapshot] = await Promise.all([
          getDocs(collection(this.db, 'products')),
          getDocs(collection(this.db, 'catalogProducts'))
        ]);
        
        const totalInternal = internalSnapshot.size;
        const totalPublic = publicSnapshot.size;
        
        // Count eligible products
        const internalProducts = internalSnapshot.docs.map(doc => transformFirestoreDoc(doc));
        const eligibleCount = internalProducts.filter(product => this.isEligibleForSync(product)).length;
        
        // Calculate sync rate
        const syncRate = totalInternal > 0 ? Math.round((totalPublic / totalInternal) * 100) : 0;
        
        return {
          totalInternal,
          totalPublic,
          eligible: eligibleCount,
          syncRate,
          lastUpdated: new Date()
        };
      } catch (error) {
        console.warn('⚠️ Using demo statistics');
        return {
          totalInternal: 150,
          totalPublic: 87,
          eligible: 92,
          syncRate: 58,
          lastUpdated: new Date()
        };
      }
    });
  }

  // Get sync logs
  async getSyncLogs(limit = 50) {
    return safeFirestoreOperation(async () => {
      try {
        const logsQuery = query(
          collection(this.db, 'syncLogs'),
          orderBy('timestamp', 'desc'),
          limit(limit)
        );
        
        const logsSnapshot = await getDocs(logsQuery);
        return logsSnapshot.docs.map(doc => transformFirestoreDoc(doc));
      } catch (error) {
        console.warn('⚠️ Using demo sync logs');
        return this.getDemoSyncLogs();
      }
    });
  }

  // ====================================================================
  // INTERNAL HELPER FUNCTIONS
  // ====================================================================

  // Transform internal product to public catalog format
  async transformToPublicProduct(internalProduct) {
    const publicPrice = this.calculatePublicPrice(internalProduct.price);
    
    const publicProduct = {
      // Core product data
      internalProductId: internalProduct.id,
      name: this.generateDisplayName(internalProduct),
      description: this.generateCustomerDescription(internalProduct),
      category: internalProduct.category,
      subcategory: internalProduct.subcategory,
      
      // Pricing
      price: publicPrice,
      originalPrice: internalProduct.price,
      markup: this.syncRules.priceMarkup,
      currency: internalProduct.currency || 'USD',
      
      // Inventory
      stock: internalProduct.stock,
      minOrderQty: internalProduct.minOrderQty || 1,
      availability: this.calculateAvailability(internalProduct),
      
      // Technical details
      specifications: internalProduct.specifications || {},
      technicalSpecs: internalProduct.technicalSpecs || {},
      dimensions: internalProduct.dimensions || {},
      weight: internalProduct.weight,
      
      // Media
      images: await this.generateAIImages(internalProduct),
      documents: internalProduct.documents || [],
      
      // Business info
      brand: internalProduct.brand || 'HiggsFlow',
      model: internalProduct.model || internalProduct.partNumber,
      partNumber: internalProduct.partNumber,
      
      // SEO and discovery
      tags: this.generateTags(internalProduct),
      keywords: this.generateKeywords(internalProduct),
      searchTerms: this.generateSearchTerms(internalProduct),
      
      // Sync metadata
      syncedAt: serverTimestamp(),
      lastSync: serverTimestamp(),
      syncVersion: '1.0',
      priority: this.calculateSyncPriority(internalProduct),
      
      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    return publicProduct;
  }

  // Calculate public-facing price with markup
  calculatePublicPrice(internalPrice) {
    const markup = this.syncRules.priceMarkup / 100;
    return Math.round(internalPrice * (1 + markup) * 100) / 100;
  }

  // Calculate product availability status
  calculateAvailability(product) {
    if (product.stock <= 0) return 'out-of-stock';
    if (product.stock < 5) return 'low-stock';
    if (product.stock < 20) return 'limited';
    return 'in-stock';
  }

  // Generate customer-friendly display name
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

  // Generate customer-friendly description
  generateCustomerDescription(internalProduct) {
    let description = internalProduct.description || '';
    
    // If no description, generate one based on available data
    if (!description || description.length < 50) {
      const category = internalProduct.category || 'industrial';
      const brand = internalProduct.brand || 'Professional';
      
      description = `High-quality ${category} product from ${brand}. Ideal for industrial applications requiring reliable performance and durability.`;
      
      // Add technical highlights if available
      if (internalProduct.specifications) {
        const specs = Object.entries(internalProduct.specifications).slice(0, 2);
        if (specs.length > 0) {
          const specText = specs.map(([key, value]) => `${key}: ${value}`).join(', ');
          description += ` Key specifications: ${specText}.`;
        }
      }
    }
    
    return description;
  }

  // Generate SEO tags
  generateTags(product) {
    const tags = new Set();
    
    // Category-based tags
    if (product.category) {
      tags.add(product.category.toLowerCase());
    }
    
    // Brand tags
    if (product.brand) {
      tags.add(product.brand.toLowerCase());
    }
    
    // Application tags based on category
    const applicationTags = {
      'electronics': ['electronic', 'electrical', 'power', 'control'],
      'hydraulics': ['hydraulic', 'fluid-power', 'pressure', 'pump'],
      'pneumatics': ['pneumatic', 'air', 'compressed-air', 'actuator'],
      'automation': ['automation', 'control', 'plc', 'industrial-control'],
      'sensors': ['sensor', 'measurement', 'detection', 'monitoring'],
      'cables': ['cable', 'wire', 'connection', 'electrical-connection']
    };
    
    const categoryTags = applicationTags[product.category?.toLowerCase()] || [];
    categoryTags.forEach(tag => tags.add(tag));
    
    // General industrial tags
    tags.add('industrial');
    tags.add('professional');
    tags.add('commercial');
    
    return Array.from(tags);
  }

  // Generate search keywords
  generateKeywords(product) {
    const keywords = new Set();
    
    // Product name words
    if (product.name) {
      product.name.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }
    
    // Category keywords
    if (product.category) {
      keywords.add(product.category.toLowerCase());
    }
    
    // Brand keywords
    if (product.brand) {
      keywords.add(product.brand.toLowerCase());
    }
    
    // Part number
    if (product.partNumber) {
      keywords.add(product.partNumber.toLowerCase());
    }
    
    return Array.from(keywords);
  }

  // Generate search terms for better discoverability
  generateSearchTerms(product) {
    const terms = new Set();
    
    // Primary terms
    terms.add(product.name?.toLowerCase() || '');
    terms.add(product.brand?.toLowerCase() || '');
    terms.add(product.category?.toLowerCase() || '');
    
    // Category-specific terms
    const categoryTerms = {
      'electronics': ['electronic component', 'electrical part', 'control system'],
      'hydraulics': ['hydraulic component', 'fluid power', 'hydraulic system'],
      'pneumatics': ['pneumatic part', 'air system', 'compressed air'],
      'automation': ['automation component', 'industrial control', 'plc component'],
      'sensors': ['industrial sensor', 'measurement device', 'detection system'],
      'cables': ['industrial cable', 'electrical wire', 'connection cable']
    };
    
    const specificTerms = categoryTerms[product.category?.toLowerCase()] || [];
    specificTerms.forEach(term => terms.add(term));
    
    return Array.from(terms).filter(term => term.length > 0);
  }

  // Generate AI-enhanced product images
  async generateAIImages(internalProduct) {
    // TODO: Integrate with your Railway MCP service for AI image generation
    // For now, return placeholder structure that maintains the expected format
    
    const category = (internalProduct.category || 'industrial').toLowerCase();
    const productName = internalProduct.name?.toLowerCase() || 'product';
    const safeName = encodeURIComponent(productName.substring(0, 20));
    
    return {
      primary: `https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=${safeName}`,
      technical: `https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Technical+Specs`,
      application: `https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=${encodeURIComponent(category)}+Application`,
      gallery: [
        `https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=Angle+1`,
        `https://via.placeholder.com/300x300/6366F1/FFFFFF?text=Angle+2`,
        `https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=Detail+View`
      ]
    };
  }

  // Log sync operations for audit trail
  async logSyncOperation(internalProductId, publicProductId, operation, status, error = null) {
    try {
      await addDoc(collection(this.db, 'syncLogs'), {
        internalProductId,
        publicProductId,
        operation, // 'sync', 'remove', 'update'
        status, // 'success', 'failed'
        error,
        timestamp: serverTimestamp(),
        user: 'system' // TODO: Get actual user from auth context
      });
    } catch (error) {
      console.warn('⚠️ Failed to log sync operation:', error);
    }
  }

  // ====================================================================
  // DEMO DATA FOR DEVELOPMENT
  // ====================================================================

  getDemoProductsWithSyncStatus() {
    return [
      {
        id: 'demo-1',
        name: 'Industrial Pressure Sensor',
        category: 'sensors',
        price: 245.99,
        stock: 25,
        brand: 'Siemens',
        status: 'active',
        publicStatus: {
          synced: true,
          publicId: 'pub-demo-1',
          lastSync: new Date(),
          publicPrice: 282.89
        },
        isEligible: true,
        priority: 'high',
        updatedAt: { toDate: () => new Date() }
      },
      {
        id: 'demo-2',
        name: 'Hydraulic Valve Assembly',
        category: 'hydraulics',
        price: 156.50,
        stock: 3,
        brand: 'Parker',
        status: 'active',
        publicStatus: {
          synced: false,
          eligible: false,
          reason: 'Low stock (3 < 5)'
        },
        isEligible: false,
        priority: 'low',
        updatedAt: { toDate: () => new Date() }
      },
      {
        id: 'demo-3',
        name: 'Automation Control Module',
        category: 'automation',
        price: 445.00,
        stock: 15,
        brand: 'Allen Bradley',
        status: 'active',
        publicStatus: {
          synced: false,
          eligible: true,
          reason: 'Ready to sync'
        },
        isEligible: true,
        priority: 'medium',
        updatedAt: { toDate: () => new Date() }
      }
    ];
  }

  getDemoSyncLogs() {
    return [
      {
        id: 'log-1',
        internalProductId: 'demo-1',
        publicProductId: 'pub-demo-1',
        operation: 'sync',
        status: 'success',
        timestamp: { toDate: () => new Date(Date.now() - 2 * 60 * 60 * 1000) },
        user: 'admin'
      },
      {
        id: 'log-2',
        internalProductId: 'demo-4',
        operation: 'sync',
        status: 'failed',
        error: 'Low stock level',
        timestamp: { toDate: () => new Date(Date.now() - 4 * 60 * 60 * 1000) },
        user: 'system'
      }
    ];
  }
}

// Export singleton instance
export const productSyncService = new ProductSyncService();

// Export default for easier importing
export default productSyncService;
