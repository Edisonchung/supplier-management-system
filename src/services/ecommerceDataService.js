// src/services/ecommerceDataService.js
// Enhanced service to read data from products_public with better error handling and caching

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

class EcommerceDataService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.listeners = new Map();
  }

  /**
   * Enhanced method to get products from products_public collection
   * Now with caching, pagination, and better error handling
   */
  async getPublicProducts(filters = {}) {
    try {
      const {
        category = 'all',
        searchTerm = '',
        sortBy = 'relevance',
        pageSize = 20,
        startAfterDoc = null,
        priceRange = null,
        availability = 'all',
        featured = null,
        brands = [],
        includeOutOfStock = true
      } = filters;

      // Create cache key
      const cacheKey = JSON.stringify({
        category, searchTerm, sortBy, pageSize, 
        startAfterDoc: startAfterDoc?.id, priceRange, availability, featured, brands
      });

      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          console.log('🔄 Returning cached products');
          return cached.data;
        }
      }

      let constraints = [];

      // Base constraint - only public products
      constraints.push(where('visibility', '==', 'public'));

      // Category filter with better handling
      if (category && category !== 'all' && category !== '') {
        constraints.push(where('category', '==', category));
      }

      // Featured filter
      if (featured === true) {
        constraints.push(where('featured', '==', true));
      }

      // Availability filter (enhanced)
      if (availability && availability !== 'all') {
        switch (availability) {
          case 'in_stock':
            constraints.push(where('stock', '>', 0));
            break;
          case 'low_stock':
            constraints.push(where('stock', '<=', 5));
            constraints.push(where('stock', '>', 0));
            break;
          case 'out_of_stock':
            constraints.push(where('stock', '==', 0));
            break;
        }
      } else if (!includeOutOfStock) {
        constraints.push(where('stock', '>', 0));
      }

      // Sorting with fallbacks
      try {
        switch (sortBy) {
          case 'price-low':
            constraints.push(orderBy('price', 'asc'));
            break;
          case 'price-high':
            constraints.push(orderBy('price', 'desc'));
            break;
          case 'newest':
            constraints.push(orderBy('createdAt', 'desc'));
            break;
          case 'popular':
            constraints.push(orderBy('viewCount', 'desc'));
            break;
          case 'rating':
            constraints.push(orderBy('rating', 'desc'));
            break;
          case 'name':
            constraints.push(orderBy('name', 'asc'));
            break;
          default: // 'relevance'
            constraints.push(orderBy('updatedAt', 'desc'));
        }
      } catch (sortError) {
        console.warn('Sort failed, using default:', sortError);
        constraints.push(orderBy('updatedAt', 'desc'));
      }

      // Pagination
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }

      constraints.push(limit(pageSize));

      // Execute query with error handling
      let products = [];
      let hasMore = false;
      let lastDoc = null;

      try {
        const q = query(collection(db, 'products_public'), ...constraints);
        const snapshot = await getDocs(q);
        
        products = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Enhanced data processing
            name: data.displayName || data.name || 'Unknown Product',
            price: this.parsePrice(data.price || data.pricing?.listPrice),
            originalPrice: this.parsePrice(data.originalPrice || data.pricing?.originalPrice),
            stock: Number(data.stock) || 0,
            rating: Number(data.rating) || 0,
            viewCount: Number(data.viewCount) || 0,
            // Ensure proper date handling
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt,
            // Add computed fields
            availability: this.getAvailabilityStatus(data.stock),
            inStock: (Number(data.stock) || 0) > 0,
            // Firestore document reference for pagination
            _docRef: doc
          };
        });

        hasMore = snapshot.docs.length === pageSize;
        lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

      } catch (queryError) {
        console.error('Query failed:', queryError);
        // Fallback to simpler query
        const simpleQ = query(
          collection(db, 'products_public'),
          where('visibility', '==', 'public'),
          orderBy('updatedAt', 'desc'),
          limit(pageSize)
        );
        const snapshot = await getDocs(simpleQ);
        products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          _docRef: doc
        }));
        hasMore = snapshot.docs.length === pageSize;
        lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
      }

      // Client-side filtering
      if (searchTerm) {
        products = this.filterBySearchTerm(products, searchTerm);
      }

      if (priceRange && priceRange.min !== undefined && priceRange.max !== undefined) {
        products = products.filter(product => {
          const price = Number(product.price) || 0;
          return price >= priceRange.min && price <= priceRange.max;
        });
      }

      if (brands && brands.length > 0) {
        products = products.filter(product => 
          brands.includes(product.brand) || brands.includes(product.manufacturer)
        );
      }

      const result = {
        products,
        totalCount: products.length,
        hasMore,
        lastDoc,
        filters: {
          category,
          searchTerm,
          sortBy,
          priceRange,
          availability,
          featured,
          brands
        }
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      console.log(`✅ Loaded ${products.length} products from products_public`);
      return result;

    } catch (error) {
      console.error('❌ Error loading public products:', error);
      
      // Try to return cached data even if expired
      const cacheKey = JSON.stringify(filters);
      if (this.cache.has(cacheKey)) {
        console.log('🔄 Returning stale cached data due to error');
        return this.cache.get(cacheKey).data;
      }
      
      throw new Error(`Failed to load products: ${error.message}`);
    }
  }

  /**
   * Enhanced method to get a single product by ID with caching
   */
  async getProductById(productId) {
    try {
      const cacheKey = `product_${productId}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      const docRef = doc(db, 'products_public', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const product = {
          id: docSnap.id,
          ...data,
          // Enhanced data processing
          name: data.displayName || data.name || 'Unknown Product',
          price: this.parsePrice(data.price || data.pricing?.listPrice),
          originalPrice: this.parsePrice(data.originalPrice || data.pricing?.originalPrice),
          stock: Number(data.stock) || 0,
          rating: Number(data.rating) || 0,
          viewCount: Number(data.viewCount) || 0,
          availability: this.getAvailabilityStatus(data.stock),
          inStock: (Number(data.stock) || 0) > 0
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: product,
          timestamp: Date.now()
        });

        return product;
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('❌ Error loading product:', error);
      throw new Error(`Failed to load product: ${error.message}`);
    }
  }

  /**
   * Get featured products with enhanced handling
   */
  async getFeaturedProducts(limitCount = 8) {
    try {
      const cacheKey = `featured_${limitCount}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      const q = query(
        collection(db, 'products_public'),
        where('visibility', '==', 'public'),
        where('featured', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.displayName || data.name || 'Unknown Product',
          price: this.parsePrice(data.price || data.pricing?.listPrice),
          stock: Number(data.stock) || 0,
          availability: this.getAvailabilityStatus(data.stock)
        };
      });

      this.cache.set(cacheKey, {
        data: products,
        timestamp: Date.now()
      });

      return products;

    } catch (error) {
      console.error('❌ Error loading featured products:', error);
      return [];
    }
  }

  /**
   * Enhanced category statistics with caching
   */
  async getCategoryStats() {
    try {
      const cacheKey = 'category_stats';
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }

      const q = query(
        collection(db, 'products_public'),
        where('visibility', '==', 'public')
      );

      const snapshot = await getDocs(q);
      const categoryStats = {};
      const brandStats = {};
      let totalInStock = 0;
      let totalValue = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // Category stats
        if (data.category) {
          categoryStats[data.category] = (categoryStats[data.category] || 0) + 1;
        }
        
        // Brand stats
        const brand = data.brand || data.manufacturer;
        if (brand) {
          brandStats[brand] = (brandStats[brand] || 0) + 1;
        }
        
        // Stock and value stats
        const stock = Number(data.stock) || 0;
        const price = Number(data.price || data.pricing?.listPrice) || 0;
        
        if (stock > 0) totalInStock++;
        totalValue += price * stock;
      });

      const stats = {
        total: snapshot.docs.length,
        totalInStock,
        totalValue,
        categories: categoryStats,
        brands: brandStats,
        topCategories: Object.entries(categoryStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topBrands: Object.entries(brandStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
      };

      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      return stats;

    } catch (error) {
      console.error('❌ Error loading category stats:', error);
      return { 
        total: 0, 
        totalInStock: 0,
        totalValue: 0,
        categories: {}, 
        brands: {},
        topCategories: [],
        topBrands: []
      };
    }
  }

  /**
   * Real-time subscription to product updates
   */
  subscribeToProducts(filters, callback) {
    const subscriptionKey = JSON.stringify(filters);
    
    // Unsubscribe existing listener
    if (this.listeners.has(subscriptionKey)) {
      this.listeners.get(subscriptionKey)();
    }

    try {
      let constraints = [where('visibility', '==', 'public')];
      
      if (filters.category && filters.category !== 'all') {
        constraints.push(where('category', '==', filters.category));
      }
      
      if (filters.featured) {
        constraints.push(where('featured', '==', true));
      }

      constraints.push(orderBy('updatedAt', 'desc'));
      constraints.push(limit(filters.pageSize || 20));

      const q = query(collection(db, 'products_public'), ...constraints);
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().displayName || doc.data().name || 'Unknown Product',
          price: this.parsePrice(doc.data().price || doc.data().pricing?.listPrice),
          stock: Number(doc.data().stock) || 0,
          availability: this.getAvailabilityStatus(doc.data().stock)
        }));
        
        // Clear related cache
        this.clearCacheByPattern(subscriptionKey);
        
        callback(products);
      }, (error) => {
        console.error('❌ Real-time subscription error:', error);
      });

      this.listeners.set(subscriptionKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up real-time subscription:', error);
      return () => {}; // Return dummy unsubscribe function
    }
  }

  /**
   * Search products with enhanced text matching
   */
  async searchProducts(searchTerm, filters = {}) {
    try {
      // Get all products first (can be optimized with Algolia/ElasticSearch later)
      const result = await this.getPublicProducts({
        ...filters,
        searchTerm: '', // Don't apply search in main query
        pageSize: 100 // Get more for better search results
      });

      if (!searchTerm) return result;

      const searchResults = this.filterBySearchTerm(result.products, searchTerm);
      
      return {
        ...result,
        products: searchResults,
        totalCount: searchResults.length
      };

    } catch (error) {
      console.error('❌ Error searching products:', error);
      return { products: [], totalCount: 0, hasMore: false };
    }
  }

  // Helper methods
  parsePrice(price) {
    if (typeof price === 'number') return price;
    if (typeof price === 'string') {
      const parsed = parseFloat(price.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  getAvailabilityStatus(stock) {
    const stockNum = Number(stock) || 0;
    if (stockNum === 0) return 'out_of_stock';
    if (stockNum <= 5) return 'low_stock';
    return 'in_stock';
  }

  filterBySearchTerm(products, searchTerm) {
    if (!searchTerm) return products;
    
    const searchLower = searchTerm.toLowerCase();
    const searchWords = searchLower.split(' ').filter(word => word.length > 0);
    
    return products.filter(product => {
      const searchableText = [
        product.name,
        product.displayName,
        product.sku,
        product.code,
        product.brand,
        product.manufacturer,
        product.category,
        product.description,
        ...(Array.isArray(product.tags) ? product.tags : [])
      ].filter(Boolean).join(' ').toLowerCase();

      return searchWords.every(word => searchableText.includes(word));
    });
  }

  clearCacheByPattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }

  unsubscribeAll() {
    for (const unsubscribe of this.listeners.values()) {
      unsubscribe();
    }
    this.listeners.clear();
    console.log('🔌 All subscriptions closed');
  }
}

// Export singleton instance
const ecommerceDataService = new EcommerceDataService();
export default ecommerceDataService;
