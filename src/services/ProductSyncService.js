// src/services/ProductSyncService.js
// Smart Product Sync Service - Internal to Public Catalog

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
      categories: ['electronics', 'hydraulics', 'pneumatics', 'automation', 'cables'],
      priceMarkup: 15, // 15% markup
      autoSync: false,
      requireApproval: true
    };
  }

  // Get all internal products with sync status
  async getInternalProductsWithSyncStatus() {
    return safeFirestoreOperation(async () => {
      console.log('📦 Fetching internal products with sync status...');
      
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
          publicStatus: publicVersion ? 'synced' : 'not_synced',
          publicProductId: publicVersion?.id || null,
          publicPrice: publicVersion?.price || null,
          publicViews: publicVersion?.viewCount || 0,
          publicQuotes: publicVersion?.quoteCount || 0,
          suggestedPublicPrice: this.calculatePublicPrice(product.price || 0),
          eligible: isEligible,
          eligibilityReasons: this.getEligibilityReasons(product),
          lastSyncAt: publicVersion?.lastSyncAt || null,
          priority: this.calculateSyncPriority(product)
        };
      });

      console.log('✅ Loaded products with sync status:', productsWithStatus.length);
      return productsWithStatus;
    }, 'Get Internal Products With Sync Status');
  }

  // Get public catalog products
  async getPublicProducts() {
    return safeFirestoreOperation(async () => {
      const publicQuery = query(
        collection(this.db, 'catalogProducts'),
        orderBy('updatedAt', 'desc')
      );
      
      const snapshot = await getDocs(publicQuery);
      return snapshot.docs.map(doc => transformFirestoreDoc(doc));
    }, 'Get Public Products');
  }

  // Check if product is eligible for sync
  isEligibleForSync(product) {
    const hasStock = (product.stock || 0) >= this.syncRules.minStock;
    const validCategory = this.syncRules.categories.includes(product.category || '');
    const isActive = product.status === 'active';
    const hasPrice = (product.price || 0) > 0;
    
    return hasStock && validCategory && isActive && hasPrice;
  }

  // Get detailed eligibility reasons
  getEligibilityReasons(product) {
    const reasons = [];
    
    if ((product.stock || 0) < this.syncRules.minStock) {
      reasons.push(`Stock below minimum (${product.stock || 0} < ${this.syncRules.minStock})`);
    }
    
    if (!this.syncRules.categories.includes(product.category || '')) {
      reasons.push(`Category not enabled (${product.category || 'unknown'})`);
    }
    
    if (product.status !== 'active') {
      reasons.push(`Status not active (${product.status || 'unknown'})`);
    }
    
    if ((product.price || 0) <= 0) {
      reasons.push('No price set');
    }
    
    if (reasons.length === 0) {
      reasons.push('Eligible for sync');
    }
    
    return reasons;
  }

  // Calculate suggested public price
  calculatePublicPrice(internalPrice) {
    if (!internalPrice || internalPrice <= 0) return 0;
    
    const markup = this.syncRules.priceMarkup / 100;
    return Math.round(internalPrice * (1 + markup) * 100) / 100;
  }

  // Calculate sync priority
  calculateSyncPriority(product) {
    const stock = product.stock || 0;
    const price = product.price || 0;
    
    // High priority: high stock and high value
    if (stock > 50 && price > 1000) return 'high';
    
    // Medium priority: decent stock or good value
    if (stock > 20 || price > 500) return 'medium';
    
    // Low priority: everything else
    return 'low';
  }

  // Sync single product to public catalog
  async syncProductToPublic(internalProductId, options = {}) {
    return safeFirestoreOperation(async () => {
      console.log('🔄 Syncing product to public catalog:', internalProductId);
      
      // Get internal product
      const internalDoc = await getDoc(doc(this.db, 'products', internalProductId));
      if (!internalDoc.exists()) {
        throw new Error('Internal product not found');
      }
      
      const internalProduct = transformFirestoreDoc(internalDoc);
      
      // Check eligibility
      if (!this.isEligibleForSync(internalProduct) && !options.forceSync) {
        throw new Error('Product not eligible for sync');
      }
      
      // Check if already exists in public catalog
      const existingQuery = query(
        collection(this.db, 'catalogProducts'),
        where('internalProductId', '==', internalProductId)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      // Prepare public product data
      const publicProductData = this.transformToPublicProduct(internalProduct, options);
      
      let result;
      
      if (!existingSnapshot.empty) {
        // Update existing public product
        const existingDoc = existingSnapshot.docs[0];
        await updateDoc(existingDoc.ref, {
          ...publicProductData,
          lastSyncAt: serverTimestamp(),
          syncCount: (existingDoc.data().syncCount || 0) + 1
        });
        
        result = {
          action: 'updated',
          publicProductId: existingDoc.id,
          internalProductId
        };
      } else {
        // Create new public product
        const docRef = await addDoc(collection(this.db, 'catalogProducts'), {
          ...publicProductData,
          createdAt: serverTimestamp(),
          lastSyncAt: serverTimestamp(),
          syncCount: 1
        });
        
        result = {
          action: 'created',
          publicProductId: docRef.id,
          internalProductId
        };
      }
      
      // Log sync operation
      await this.logSyncOperation(internalProductId, result.action, result.publicProductId);
      
      console.log('✅ Product sync completed:', result);
      return result;
    }, 'Sync Product To Public');
  }

  // Transform internal product to public catalog format
  transformToPublicProduct(internalProduct, options = {}) {
    const publicPrice = options.customPrice || this.calculatePublicPrice(internalProduct.price);
    
    return {
      // Core product information
      internalProductId: internalProduct.id,
      name: options.customName || internalProduct.name || 'Industrial Product',
      description: options.customDescription || internalProduct.description || 'Contact for detailed specifications',
      category: internalProduct.category || 'industrial',
      
      // Pricing
      price: publicPrice,
      internalPrice: internalProduct.price, // For reference only
      currency: 'MYR',
      
      // Availability
      stock: internalProduct.stock || 0,
      availability: this.calculateAvailability(internalProduct.stock),
      deliveryTime: this.calculateDeliveryTime(internalProduct.stock),
      
      // Product details
      sku: internalProduct.sku || `PUB-${internalProduct.id?.slice(-6)}`,
      brand: internalProduct.brand || 'Professional Grade',
      model: internalProduct.model || internalProduct.name,
      
      // Specifications
      specifications: {
        weight: internalProduct.weight || null,
        dimensions: internalProduct.dimensions || null,
        color: internalProduct.color || null,
        material: internalProduct.material || null,
        warranty: '1 year manufacturer warranty',
        compliance: ['Industry Standard'],
        origin: 'Malaysia'
      },
      
      // Supplier information (anonymized)
      supplier: {
        verified: true,
        rating: 4.5,
        location: 'Malaysia',
        responseTime: '< 24 hours'
      },
      
      // SEO and search
      tags: this.generateProductTags(internalProduct),
      searchKeywords: this.generateSearchKeywords(internalProduct),
      
      // Status and visibility
      isActive: true,
      isFeatured: options.featured || false,
      visibility: options.visibility || 'public',
      
      // Analytics
      viewCount: 0,
      quoteCount: 0,
      popularityScore: 0,
      
      // Metadata
      updatedAt: serverTimestamp(),
      syncRules: this.syncRules,
      syncOptions: options
    };
  }

  // Bulk sync multiple products
  async bulkSyncProducts(productIds, options = {}) {
    return safeFirestoreOperation(async () => {
      console.log('🔄 Starting bulk sync for products:', productIds.length);
      
      const results = [];
      const errors = [];
      
      // Process in batches of 10 to avoid overwhelming Firestore
      const batchSize = 10;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (productId) => {
          try {
            const result = await this.syncProductToPublic(productId, options);
            results.push(result);
          } catch (error) {
            console.error('❌ Sync failed for product:', productId, error);
            errors.push({ productId, error: error.message });
          }
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches
        if (i + batchSize < productIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      console.log('✅ Bulk sync completed:', {
        total: productIds.length,
        successful: results.length,
        errors: errors.length
      });
      
      return { results, errors };
    }, 'Bulk Sync Products');
  }

  // Remove product from public catalog
  async removeFromPublic(internalProductId) {
    return safeFirestoreOperation(async () => {
      const publicQuery = query(
        collection(this.db, 'catalogProducts'),
        where('internalProductId', '==', internalProductId)
      );
      
      const snapshot = await getDocs(publicQuery);
      
      if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        await this.logSyncOperation(internalProductId, 'removed', snapshot.docs[0].id);
      }
      
      return { removed: true, internalProductId };
    }, 'Remove From Public');
  }

  // Update sync rules
  async updateSyncRules(newRules) {
    this.syncRules = { ...this.syncRules, ...newRules };
    
    // Save to Firestore for persistence
    return safeFirestoreOperation(async () => {
      const rulesDoc = doc(this.db, 'settings', 'productSyncRules');
      await updateDoc(rulesDoc, {
        ...this.syncRules,
        updatedAt: serverTimestamp()
      });
      
      return this.syncRules;
    }, 'Update Sync Rules');
  }

  // Get sync statistics
  async getSyncStatistics() {
    return safeFirestoreOperation(async () => {
      const [internalProducts, publicProducts] = await Promise.all([
        getDocs(collection(this.db, 'products')),
        getDocs(collection(this.db, 'catalogProducts'))
      ]);
      
      const totalInternal = internalProducts.size;
      const totalPublic = publicProducts.size;
      
      // Count eligible products
      let eligible = 0;
      internalProducts.docs.forEach(doc => {
        const product = transformFirestoreDoc(doc);
        if (this.isEligibleForSync(product)) {
          eligible++;
        }
      });
      
      const syncRate = totalInternal > 0 ? (totalPublic / totalInternal * 100).toFixed(1) : '0';
      
      return {
        totalInternal,
        totalPublic,
        eligible,
        syncRate: parseFloat(syncRate),
        notSynced: totalInternal - totalPublic,
        eligibilityRate: totalInternal > 0 ? (eligible / totalInternal * 100).toFixed(1) : '0'
      };
    }, 'Get Sync Statistics');
  }

  // Helper methods
  calculateAvailability(stock) {
    if (stock > 10) return 'In Stock';
    if (stock > 0) return 'Low Stock';
    return 'Out of Stock';
  }

  calculateDeliveryTime(stock) {
    if (stock > 10) return '1-2 business days';
    if (stock > 0) return '3-5 business days';
    return '7-14 business days';
  }

  generateProductTags(product) {
    const tags = [];
    
    if (product.category) tags.push(product.category);
    if (product.brand) tags.push(product.brand.toLowerCase());
    if ((product.stock || 0) > 100) tags.push('high-stock');
    if ((product.stock || 0) <= 5) tags.push('limited-stock');
    if ((product.price || 0) > 1000) tags.push('premium');
    
    return tags;
  }

  generateSearchKeywords(product) {
    const keywords = [];
    
    if (product.name) keywords.push(...product.name.toLowerCase().split(' '));
    if (product.category) keywords.push(product.category.toLowerCase());
    if (product.brand) keywords.push(product.brand.toLowerCase());
    if (product.description) {
      // Extract key terms from description
      const descWords = product.description.toLowerCase()
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 10);
      keywords.push(...descWords);
    }
    
    return [...new Set(keywords)].filter(Boolean);
  }

  // Log sync operations for audit trail
  async logSyncOperation(internalProductId, action, publicProductId = null) {
    try {
      await addDoc(collection(this.db, 'syncLogs'), {
        internalProductId,
        publicProductId,
        action, // 'created', 'updated', 'removed'
        timestamp: serverTimestamp(),
        rules: this.syncRules
      });
    } catch (error) {
      console.warn('Failed to log sync operation:', error);
    }
  }
}

// Export singleton instance
export const productSyncService = new ProductSyncService();
