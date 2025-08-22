// src/services/ecommerceDataService.js
// Enhanced service with CORS protection, better error handling, and improved caching

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
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
    this.offlineMode = false;
    
    // Monitor connection status
    this.setupConnectionMonitoring();
    
    console.log('EcommerceDataService initialized with CORS protection');
  }

  setupConnectionMonitoring() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.offlineMode = false;
        console.log('Connection restored, exiting offline mode');
      });
      
      window.addEventListener('offline', () => {
        this.offlineMode = true;
        console.log('Connection lost, entering offline mode');
      });
    }
  }

  /**
   * Enhanced method with CORS protection and better error handling
   */
  async getPublicProducts(filters = {}) {
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
        console.log('Returning cached products');
        return cached.data;
      }
    }

    // If offline, return cached data or localStorage fallback
    if (this.offlineMode || !navigator.onLine) {
      return this.getOfflineFallback(cacheKey, filters);
    }

    // Try main query with retries
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`Loading products attempt ${attempt}/${this.retryAttempts}`);
        
        const result = await this.executeProductQuery(filters, cacheKey);
        
        // Cache successful result
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        // Also save to localStorage as backup
        this.saveToLocalStorage(cacheKey, result);
        
        console.log(`Successfully loaded ${result.products.length} products`);
        return result;
        
      } catch (error) {
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        // Check if it's a CORS or network error
        if (this.isCorsOrNetworkError(error)) {
          console.log('CORS/Network error detected, trying fallback approach...');
          
          if (attempt === this.retryAttempts) {
            return this.getOfflineFallback(cacheKey, filters);
          }
          
          // Wait before retry
          await this.delay(this.retryDelay * attempt);
          continue;
        }
        
        // For other errors, throw immediately
        if (attempt === this.retryAttempts) {
          throw error;
        }
      }
    }
  }

  async executeProductQuery(filters, cacheKey) {
    const {
      category, sortBy, pageSize, startAfterDoc,
      priceRange, availability, featured, brands, includeOutOfStock
    } = filters;

    // Start with simple query to avoid CORS issues
    let constraints = [];
    let useComplexQuery = true;

    try {
      // Try complex query first
      constraints = this.buildQueryConstraints(filters);
      
      const q = query(collection(db, 'products_public'), ...constraints);
      const snapshot = await getDocs(q);
      
      return this.processQueryResults(snapshot, filters);
      
    } catch (complexError) {
      console.warn('Complex query failed, trying simple approach:', complexError.message);
      
      // Fallback to simple query
      try {
        const simpleConstraints = [
          where('visibility', '==', 'public'),
          orderBy('updatedAt', 'desc'),
          limit(Math.min(pageSize * 2, 50)) // Get more to filter client-side
        ];
        
        const simpleQ = query(collection(db, 'products_public'), ...simpleConstraints);
        const snapshot = await getDocs(simpleQ);
        
        const result = this.processQueryResults(snapshot, filters);
        
        // Apply client-side filtering since server-side failed
        result.products = this.applyClientSideFilters(result.products, filters);
        result.totalCount = result.products.length;
        
        return result;
        
      } catch (simpleError) {
        console.error('Simple query also failed:', simpleError.message);
        throw simpleError;
      }
    }
  }

  buildQueryConstraints(filters) {
    const {
      category, sortBy, pageSize, startAfterDoc,
      availability, featured, includeOutOfStock
    } = filters;

    let constraints = [];

    // Base constraint
    constraints.push(where('visibility', '==', 'public'));

    // Category filter
    if (category && category !== 'all' && category !== '') {
      constraints.push(where('category', '==', category));
    }

    // Featured filter
    if (featured === true) {
      constraints.push(where('featured', '==', true));
    }

    // Availability filter
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

    // Sorting - use simple sorting to avoid index issues
    switch (sortBy) {
      case 'price-low':
      case 'price-high':
        // Price sorting often causes CORS issues, handle client-side
        constraints.push(orderBy('updatedAt', 'desc'));
        break;
      case 'newest':
        constraints.push(orderBy('createdAt', 'desc'));
        break;
      case 'name':
        constraints.push(orderBy('name', 'asc'));
        break;
      default:
        constraints.push(orderBy('updatedAt', 'desc'));
    }

    // Pagination
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    constraints.push(limit(pageSize));

    return constraints;
  }

  processQueryResults(snapshot, filters) {
    const products = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Enhanced data processing with safe extraction
        name: data.displayName || data.name || 'Unknown Product',
        price: this.parsePrice(data.price || data.pricing?.listPrice),
        originalPrice: this.parsePrice(data.originalPrice || data.pricing?.originalPrice),
        stock: Number(data.stock) || 0,
        rating: Number(data.rating) || 0,
        viewCount: Number(data.viewCount) || 0,
        // Safely handle timestamps
        createdAt: this.parseTimestamp(data.createdAt),
        updatedAt: this.parseTimestamp(data.updatedAt),
        // Add computed fields
        availability: this.getAvailabilityStatus(data.stock),
        inStock: (Number(data.stock) || 0) > 0,
        // Keep doc reference for pagination
        _docRef: doc
      };
    });

    const hasMore = snapshot.docs.length === filters.pageSize;
    const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return {
      products,
      totalCount: products.length,
      hasMore,
      lastDoc,
      filters
    };
  }

  applyClientSideFilters(products, filters) {
    let filtered = [...products];

    // Search term filter
    if (filters.searchTerm) {
      filtered = this.filterBySearchTerm(filtered, filters.searchTerm);
    }

    // Price range filter
    if (filters.priceRange && filters.priceRange.min !== undefined && filters.priceRange.max !== undefined) {
      filtered = filtered.filter(product => {
        const price = Number(product.price) || 0;
        return price >= filters.priceRange.min && price <= filters.priceRange.max;
      });
    }

    // Brand filter
    if (filters.brands && filters.brands.length > 0) {
      filtered = filtered.filter(product => 
        filters.brands.includes(product.brand) || filters.brands.includes(product.manufacturer)
      );
    }

    // Apply sorting if needed
    if (filters.sortBy === 'price-low') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (filters.sortBy === 'price-high') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return filtered.slice(0, filters.pageSize || 20);
  }

  async getProductById(productId) {
    const cacheKey = `product_${productId}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    // If offline, try localStorage
    if (this.offlineMode || !navigator.onLine) {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.warn('Failed to parse stored product:', e);
        }
      }
    }

    try {
      const docRef = doc(db, 'products_public', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        const product = {
          id: docSnap.id,
          ...data,
          name: data.displayName || data.name || 'Unknown Product',
          price: this.parsePrice(data.price || data.pricing?.listPrice),
          originalPrice: this.parsePrice(data.originalPrice || data.pricing?.originalPrice),
          stock: Number(data.stock) || 0,
          rating: Number(data.rating) || 0,
          viewCount: Number(data.viewCount) || 0,
          availability: this.getAvailabilityStatus(data.stock),
          inStock: (Number(data.stock) || 0) > 0,
          createdAt: this.parseTimestamp(data.createdAt),
          updatedAt: this.parseTimestamp(data.updatedAt)
        };

        // Cache the result
        this.cache.set(cacheKey, {
          data: product,
          timestamp: Date.now()
        });

        // Save to localStorage
        localStorage.setItem(cacheKey, JSON.stringify(product));

        return product;
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      
      // Try localStorage fallback
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          console.log('Using localStorage fallback for product');
          return JSON.parse(stored);
        } catch (e) {
          console.warn('Failed to parse stored product:', e);
        }
      }
      
      throw new Error(`Failed to load product: ${error.message}`);
    }
  }

  async getFeaturedProducts(limitCount = 8) {
    const cacheKey = `featured_${limitCount}`;
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    if (this.offlineMode || !navigator.onLine) {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return [];
        }
      }
    }

    try {
      // Use simple query to avoid CORS issues
      const q = query(
        collection(db, 'products_public'),
        where('visibility', '==', 'public'),
        orderBy('updatedAt', 'desc'),
        limit(limitCount * 2) // Get more to filter
      );

      const snapshot = await getDocs(q);
      const allProducts = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: data.displayName || data.name || 'Unknown Product',
          price: this.parsePrice(data.price || data.pricing?.listPrice),
          stock: Number(data.stock) || 0,
          availability: this.getAvailabilityStatus(data.stock),
          featured: Boolean(data.featured)
        };
      });

      // Filter for featured products client-side
      const featured = allProducts.filter(p => p.featured).slice(0, limitCount);

      this.cache.set(cacheKey, {
        data: featured,
        timestamp: Date.now()
      });

      localStorage.setItem(cacheKey, JSON.stringify(featured));

      return featured;

    } catch (error) {
      console.error('Error loading featured products:', error);
      
      // Try localStorage fallback
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return [];
        }
      }
      
      return [];
    }
  }

  subscribeToProducts(filters, callback) {
    const subscriptionKey = JSON.stringify(filters);
    
    // Unsubscribe existing listener
    if (this.listeners.has(subscriptionKey)) {
      this.listeners.get(subscriptionKey)();
    }

    try {
      // Use simple subscription to avoid CORS issues
      const constraints = [
        where('visibility', '==', 'public'),
        orderBy('updatedAt', 'desc'),
        limit(filters.pageSize || 20)
      ];

      // Add category filter if specified
      if (filters.category && filters.category !== 'all') {
        constraints.splice(1, 0, where('category', '==', filters.category));
      }

      const q = query(collection(db, 'products_public'), ...constraints);
      
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            name: doc.data().displayName || doc.data().name || 'Unknown Product',
            price: this.parsePrice(doc.data().price || doc.data().pricing?.listPrice),
            stock: Number(doc.data().stock) || 0,
            availability: this.getAvailabilityStatus(doc.data().stock)
          }));
          
          // Apply client-side filters
          const filtered = this.applyClientSideFilters(products, filters);
          
          // Clear related cache
          this.clearCacheByPattern(subscriptionKey);
          
          callback(filtered);
        },
        (error) => {
          console.error('Real-time subscription error:', error);
          // Don't callback on error, let the app use cached data
        }
      );

      this.listeners.set(subscriptionKey, unsubscribe);
      return unsubscribe;

    } catch (error) {
      console.error('Error setting up real-time subscription:', error);
      return () => {}; // Return dummy unsubscribe function
    }
  }

  // Helper methods
  isCorsOrNetworkError(error) {
    const message = error.message.toLowerCase();
    return message.includes('cors') || 
           message.includes('network') || 
           message.includes('xmlhttprequest') ||
           message.includes('fetch') ||
           error.code === 'unavailable' ||
           error.code === 'deadline-exceeded';
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getOfflineFallback(cacheKey, filters) {
    console.log('Using offline fallback');
    
    // Try cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      console.log('Returning stale cached data');
      return cached.data;
    }
    
    // Try localStorage
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
      try {
        console.log('Returning localStorage fallback');
        return JSON.parse(stored);
      } catch (e) {
        console.warn('Failed to parse stored data:', e);
      }
    }
    
    // Return empty result
    return {
      products: [],
      totalCount: 0,
      hasMore: false,
      lastDoc: null,
      filters,
      offline: true
    };
  }

  saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  parseTimestamp(timestamp) {
    if (!timestamp) return new Date();
    if (timestamp.toDate) return timestamp.toDate();
    if (timestamp instanceof Date) return timestamp;
    return new Date(timestamp);
  }

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
    console.log('Cache cleared');
  }

  unsubscribeAll() {
    for (const unsubscribe of this.listeners.values()) {
      unsubscribe();
    }
    this.listeners.clear();
    console.log('All subscriptions closed');
  }

  // Additional helper for category stats with CORS protection
  async getCategoryStats() {
    const cacheKey = 'category_stats';
    
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    if (this.offlineMode || !navigator.onLine) {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return this.getEmptyStats();
        }
      }
    }

    try {
      // Simple query to avoid CORS
      const q = query(
        collection(db, 'products_public'),
        where('visibility', '==', 'public'),
        limit(100) // Limit to prevent large transfers
      );

      const snapshot = await getDocs(q);
      const categoryStats = {};
      const brandStats = {};
      let totalInStock = 0;
      let totalValue = 0;

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.category) {
          categoryStats[data.category] = (categoryStats[data.category] || 0) + 1;
        }
        
        const brand = data.brand || data.manufacturer;
        if (brand) {
          brandStats[brand] = (brandStats[brand] || 0) + 1;
        }
        
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

      localStorage.setItem(cacheKey, JSON.stringify(stats));

      return stats;

    } catch (error) {
      console.error('Error loading category stats:', error);
      
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          return this.getEmptyStats();
        }
      }
      
      return this.getEmptyStats();
    }
  }

  getEmptyStats() {
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

  async searchProducts(searchTerm, filters = {}) {
    try {
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
      console.error('Error searching products:', error);
      return { products: [], totalCount: 0, hasMore: false };
    }
  }
}

// Export singleton instance
const ecommerceDataService = new EcommerceDataService();
export default ecommerceDataService;
