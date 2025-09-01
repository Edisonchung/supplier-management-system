// src/services/UnifiedProductService.js
// HiggsFlow Unified Product Service - Build-Safe Implementation
// Fixed: JavaScript syntax errors and build failures

import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  updateDoc,
  doc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Unified Product Service for HiggsFlow
 * Centralized product management with inventory, pricing, and catalog integration
 */
class UnifiedProductService {
  constructor() {
    this.db = db;
    this.collections = {
      products: 'products',
      productCategories: 'product_categories',
      productVariants: 'product_variants',
      productPricing: 'product_pricing',
      productInventory: 'product_inventory',
      productSuppliers: 'product_suppliers'
    };
    
    console.log('UnifiedProductService initialized');
  }

  /**
   * Clean and validate product data
   */
  cleanProductData(productData) {
    if (!productData || typeof productData !== 'object') {
      return {};
    }

    return {
      name: String(productData.name || '').trim(),
      description: String(productData.description || '').trim(),
      category: String(productData.category || 'general').trim(),
      sku: String(productData.sku || '').trim().toUpperCase(),
      brand: String(productData.brand || '').trim(),
      model: String(productData.model || '').trim(),
      weight: typeof productData.weight === 'number' ? productData.weight : 0,
      dimensions: {
        length: typeof productData.dimensions?.length === 'number' ? productData.dimensions.length : 0,
        width: typeof productData.dimensions?.width === 'number' ? productData.dimensions.width : 0,
        height: typeof productData.dimensions?.height === 'number' ? productData.dimensions.height : 0,
        unit: String(productData.dimensions?.unit || 'cm')
      },
      specifications: typeof productData.specifications === 'object' ? productData.specifications : {},
      tags: Array.isArray(productData.tags) ? productData.tags.map(tag => String(tag).trim()) : [],
      images: Array.isArray(productData.images) ? productData.images : [],
      status: ['active', 'inactive', 'discontinued'].includes(productData.status) ? productData.status : 'active',
      visibility: ['public', 'private', 'restricted'].includes(productData.visibility) ? productData.visibility : 'public'
    };
  }

  /**
   * Generate unique product SKU
   */
  generateSKU(productName, category) {
    const namePrefix = String(productName || 'PROD').replace(/[^A-Z0-9]/gi, '').substring(0, 4).toUpperCase();
    const categoryPrefix = String(category || 'GEN').replace(/[^A-Z0-9]/gi, '').substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 4).toUpperCase();
    
    return `${categoryPrefix}-${namePrefix}-${timestamp}-${random}`;
  }

  /**
   * Create new product
   */
  async createProduct(productData, userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!productData || !productData.name) {
        throw new Error('Product name is required');
      }

      const cleanedData = this.cleanProductData(productData);
      
      // Generate SKU if not provided
      if (!cleanedData.sku) {
        cleanedData.sku = this.generateSKU(cleanedData.name, cleanedData.category);
      }

      // Check if SKU already exists
      const existingSKU = await this.getProductBySKU(cleanedData.sku);
      if (existingSKU.success && existingSKU.data) {
        throw new Error(`Product with SKU ${cleanedData.sku} already exists`);
      }

      const productDocument = {
        ...cleanedData,
        userId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: userId,
        version: 1,
        isActive: true,
        totalViews: 0,
        totalSales: 0,
        lastViewedAt: null,
        searchKeywords: this.generateSearchKeywords(cleanedData)
      };

      const productsCollection = collection(this.db, this.collections.products);
      const docRef = await addDoc(productsCollection, productDocument);

      console.log('Product created successfully:', docRef.id);

      return {
        success: true,
        data: {
          id: docRef.id,
          ...productDocument
        }
      };

    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const docRef = doc(this.db, this.collections.products, productId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const productData = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
        updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date()
      };

      return {
        success: true,
        data: productData
      };

    } catch (error) {
      console.error('Error getting product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(sku) {
    try {
      if (!sku) {
        throw new Error('SKU is required');
      }

      const productsQuery = query(
        collection(this.db, this.collections.products),
        where('sku', '==', String(sku).toUpperCase()),
        limit(1)
      );

      const snapshot = await getDocs(productsQuery);

      if (snapshot.empty) {
        return {
          success: false,
          error: 'Product not found'
        };
      }

      const doc = snapshot.docs[0];
      const productData = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      };

      return {
        success: true,
        data: productData
      };

    } catch (error) {
      console.error('Error getting product by SKU:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get products with filtering and pagination
   */
  async getProducts(filters = {}, userId = null) {
    try {
      let productsQuery = collection(this.db, this.collections.products);
      const queryConstraints = [];

      // User filter
      if (userId) {
        queryConstraints.push(where('userId', '==', userId));
      }

      // Category filter
      if (filters.category && filters.category !== 'all') {
        queryConstraints.push(where('category', '==', filters.category));
      }

      // Status filter
      if (filters.status && filters.status !== 'all') {
        queryConstraints.push(where('status', '==', filters.status));
      }

      // Visibility filter
      if (filters.visibility && filters.visibility !== 'all') {
        queryConstraints.push(where('visibility', '==', filters.visibility));
      }

      // Active filter
      if (filters.isActive !== undefined) {
        queryConstraints.push(where('isActive', '==', Boolean(filters.isActive)));
      }

      // Sort order
      const sortBy = filters.sortBy || 'updatedAt';
      const sortOrder = filters.sortOrder === 'asc' ? 'asc' : 'desc';
      queryConstraints.push(orderBy(sortBy, sortOrder));

      // Limit
      const limitCount = Math.min(Math.max(filters.limit || 50, 1), 100);
      queryConstraints.push(limit(limitCount));

      // Apply constraints
      if (queryConstraints.length > 0) {
        productsQuery = query(productsQuery, ...queryConstraints);
      }

      const snapshot = await getDocs(productsQuery);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));

      // Apply search filter if provided (client-side filtering)
      let filtered = products;
      if (filters.search && typeof filters.search === 'string') {
        const searchTerm = filters.search.toLowerCase();
        filtered = products.filter(product => {
          const searchableFields = [
            product.name,
            product.description,
            product.sku,
            product.brand,
            product.model,
            ...(Array.isArray(product.tags) ? product.tags : []),
            ...(Array.isArray(product.searchKeywords) ? product.searchKeywords : [])
          ];

          return searchableFields.some(field => 
            String(field || '').toLowerCase().includes(searchTerm)
          );
        });
      }

      console.log(`Retrieved ${filtered.length} products`);

      return {
        success: true,
        data: filtered,
        total: filtered.length,
        hasMore: products.length === limitCount
      };

    } catch (error) {
      console.error('Error getting products:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Update product
   */
  async updateProduct(productId, updateData, userId) {
    try {
      if (!productId || !userId) {
        throw new Error('Product ID and user ID are required');
      }

      // Verify product exists and ownership
      const productResult = await this.getProduct(productId);
      if (!productResult.success) {
        throw new Error(productResult.error);
      }

      if (productResult.data.userId !== userId) {
        throw new Error('Unauthorized: You can only update your own products');
      }

      const cleanedData = this.cleanProductData(updateData);
      
      const updateDocument = {
        ...cleanedData,
        updatedAt: serverTimestamp(),
        updatedBy: userId,
        searchKeywords: this.generateSearchKeywords({
          ...productResult.data,
          ...cleanedData
        })
      };

      const docRef = doc(this.db, this.collections.products, productId);
      await updateDoc(docRef, updateDocument);

      console.log('Product updated successfully:', productId);

      return {
        success: true,
        data: {
          id: productId,
          ...updateDocument
        }
      };

    } catch (error) {
      console.error('Error updating product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId, userId) {
    try {
      if (!productId || !userId) {
        throw new Error('Product ID and user ID are required');
      }

      // Verify product exists and ownership
      const productResult = await this.getProduct(productId);
      if (!productResult.success) {
        throw new Error(productResult.error);
      }

      if (productResult.data.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own products');
      }

      const docRef = doc(this.db, this.collections.products, productId);
      await deleteDoc(docRef);

      console.log('Product deleted successfully:', productId);

      return {
        success: true
      };

    } catch (error) {
      console.error('Error deleting product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search products
   */
  async searchProducts(searchTerm, filters = {}) {
    try {
      // Use getProducts with search filter
      const searchFilters = {
        ...filters,
        search: searchTerm,
        limit: filters.limit || 50
      };

      return await this.getProducts(searchFilters, filters.userId);

    } catch (error) {
      console.error('Error searching products:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Generate search keywords for better searchability
   */
  generateSearchKeywords(productData) {
    const keywords = new Set();

    // Add basic fields
    const fields = [
      productData.name,
      productData.description,
      productData.sku,
      productData.brand,
      productData.model,
      productData.category
    ];

    fields.forEach(field => {
      if (field && typeof field === 'string') {
        // Split by spaces and add individual words
        field.toLowerCase().split(/\s+/).forEach(word => {
          if (word.length > 2) {
            keywords.add(word);
          }
        });
      }
    });

    // Add tags
    if (Array.isArray(productData.tags)) {
      productData.tags.forEach(tag => {
        if (tag && typeof tag === 'string') {
          keywords.add(tag.toLowerCase());
        }
      });
    }

    // Add specification values
    if (typeof productData.specifications === 'object') {
      Object.values(productData.specifications).forEach(value => {
        if (value && typeof value === 'string') {
          keywords.add(value.toLowerCase());
        }
      });
    }

    return Array.from(keywords);
  }

  /**
   * Get product categories
   */
  async getProductCategories(userId = null) {
    try {
      const filters = { limit: 1000 };
      if (userId) {
        filters.userId = userId;
      }

      const productsResult = await this.getProducts(filters, userId);
      if (!productsResult.success) {
        throw new Error(productsResult.error);
      }

      const categories = new Set();
      productsResult.data.forEach(product => {
        if (product.category) {
          categories.add(product.category);
        }
      });

      return {
        success: true,
        data: Array.from(categories).sort()
      };

    } catch (error) {
      console.error('Error getting product categories:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Get product statistics
   */
  async getProductStatistics(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const productsResult = await this.getProducts({ limit: 1000 }, userId);
      if (!productsResult.success) {
        throw new Error(productsResult.error);
      }

      const products = productsResult.data;
      const stats = {
        totalProducts: products.length,
        byCategory: {},
        byStatus: {},
        totalViews: 0,
        totalSales: 0,
        averageViews: 0,
        activeProducts: 0,
        inactiveProducts: 0
      };

      products.forEach(product => {
        // By category
        const category = product.category || 'uncategorized';
        stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;

        // By status
        const status = product.status || 'active';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Active/inactive
        if (product.isActive) {
          stats.activeProducts++;
        } else {
          stats.inactiveProducts++;
        }

        // Views and sales
        stats.totalViews += product.totalViews || 0;
        stats.totalSales += product.totalSales || 0;
      });

      // Calculate averages
      if (stats.totalProducts > 0) {
        stats.averageViews = Math.round(stats.totalViews / stats.totalProducts);
      }

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('Error getting product statistics:', error);
      return {
        success: false,
        error: error.message,
        data: {
          totalProducts: 0,
          byCategory: {},
          byStatus: {},
          totalViews: 0,
          totalSales: 0,
          averageViews: 0,
          activeProducts: 0,
          inactiveProducts: 0
        }
      };
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(productIds, updateData, userId) {
    try {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        throw new Error('Product IDs array is required');
      }

      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log(`Starting bulk update of ${productIds.length} products`);

      const batch = writeBatch(this.db);
      const results = [];

      for (const productId of productIds) {
        try {
          // Verify ownership
          const productResult = await this.getProduct(productId);
          if (!productResult.success) {
            results.push({
              productId,
              success: false,
              error: productResult.error
            });
            continue;
          }

          if (productResult.data.userId !== userId) {
            results.push({
              productId,
              success: false,
              error: 'Unauthorized'
            });
            continue;
          }

          const cleanedData = this.cleanProductData(updateData);
          const updateDocument = {
            ...cleanedData,
            updatedAt: serverTimestamp(),
            updatedBy: userId
          };

          const docRef = doc(this.db, this.collections.products, productId);
          batch.update(docRef, updateDocument);

          results.push({
            productId,
            success: true
          });

        } catch (error) {
          results.push({
            productId,
            success: false,
            error: error.message
          });
        }
      }

      // Commit batch
      await batch.commit();

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      console.log(`Bulk update completed: ${successCount} successful, ${errorCount} failed`);

      return {
        success: successCount > 0,
        data: {
          totalProcessed: productIds.length,
          successCount,
          errorCount,
          results
        }
      };

    } catch (error) {
      console.error('Error in bulk update products:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Subscribe to real-time product updates
   */
  subscribeToProducts(userId, callback, filters = {}) {
    try {
      if (!userId || typeof callback !== 'function') {
        throw new Error('User ID and callback function are required');
      }

      console.log('Setting up real-time products subscription for user:', userId);

      let productsQuery = collection(this.db, this.collections.products);
      const queryConstraints = [
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc'),
        limit(filters.limit || 50)
      ];

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        queryConstraints.push(where('category', '==', filters.category));
      }

      if (filters.status && filters.status !== 'all') {
        queryConstraints.push(where('status', '==', filters.status));
      }

      productsQuery = query(productsQuery, ...queryConstraints);

      const unsubscribe = onSnapshot(
        productsQuery,
        (snapshot) => {
          const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
          }));

          console.log(`Real-time update: ${products.length} products`);
          callback({
            success: true,
            data: products
          });
        },
        (error) => {
          console.error('Real-time subscription error:', error);
          callback({
            success: false,
            error: error.message,
            data: []
          });
        }
      );

      return unsubscribe;

    } catch (error) {
      console.error('Error setting up products subscription:', error);
      return () => {};
    }
  }

  /**
   * Increment product views
   */
  async incrementProductViews(productId) {
    try {
      if (!productId) {
        throw new Error('Product ID is required');
      }

      const docRef = doc(this.db, this.collections.products, productId);
      await updateDoc(docRef, {
        totalViews: increment(1),
        lastViewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        success: true
      };

    } catch (error) {
      console.error('Error incrementing product views:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
const unifiedProductService = new UnifiedProductService();

export default unifiedProductService;
export { UnifiedProductService };
