// src/services/UnifiedProductService.js
// Centralized product management that syncs between Firestore, localStorage, and all components

class UnifiedProductService {
  static productCache = null;
  static lastCacheTime = null;
  static CACHE_DURATION = 30000; // 30 seconds
  static listeners = new Set();

  /**
   * Subscribe to product updates
   */
  static subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of product updates
   */
  static notifyListeners(eventType, data) {
    console.log(`📢 UnifiedProductService: ${eventType}`, data);
    this.listeners.forEach(callback => {
      try {
        callback({ type: eventType, data });
      } catch (error) {
        console.error('Error notifying product listener:', error);
      }
    });
  }

  /**
   * Get all available products from all sources
   */
  static async getAllAvailableProducts(forceRefresh = false) {
    console.log('🔍 UnifiedProductService: Getting all available products', { forceRefresh });
    
    // Check cache first
    const now = Date.now();
    if (!forceRefresh && this.productCache && this.lastCacheTime && 
        (now - this.lastCacheTime) < this.CACHE_DURATION) {
      console.log('📋 Using cached products:', this.productCache.length);
      return this.productCache;
    }

    try {
      // Get products from multiple sources
      const [firestoreProducts, localStorageProducts] = await Promise.all([
        this.getFirestoreProducts(),
        this.getLocalStorageProducts()
      ]);

      // Merge and deduplicate products
      const mergedProducts = this.mergeAndDeduplicateProducts(firestoreProducts, localStorageProducts);
      
      // Add allocation status and availability info
      const enrichedProducts = this.enrichProductsWithAllocationData(mergedProducts);
      
      // Cache results
      this.productCache = enrichedProducts;
      this.lastCacheTime = now;
      
      console.log('✅ Products loaded and cached:', {
        firestore: firestoreProducts.length,
        localStorage: localStorageProducts.length,
        merged: mergedProducts.length,
        enriched: enrichedProducts.length
      });

      this.notifyListeners('products-loaded', enrichedProducts);
      return enrichedProducts;

    } catch (error) {
      console.error('❌ Error loading products:', error);
      // Return cached data if available
      return this.productCache || [];
    }
  }

  /**
   * Get products from Firestore
   */
  static async getFirestoreProducts() {
    try {
      // Simulate Firestore call - replace with actual Firestore query
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      console.log('📊 Firestore products loaded:', products.length);
      return products;
    } catch (error) {
      console.error('Error loading Firestore products:', error);
      return [];
    }
  }

  /**
   * Get products from localStorage
   */
  static async getLocalStorageProducts() {
    try {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      console.log('💾 localStorage products loaded:', products.length);
      return products;
    } catch (error) {
      console.error('Error loading localStorage products:', error);
      return [];
    }
  }

  /**
   * Merge products from different sources and remove duplicates
   */
  static mergeAndDeduplicateProducts(firestoreProducts, localProducts) {
    const productMap = new Map();
    
    // Add Firestore products first (priority)
    firestoreProducts.forEach(product => {
      const key = this.getProductKey(product);
      productMap.set(key, { ...product, source: 'firestore' });
    });
    
    // Add localStorage products if not already present
    localProducts.forEach(product => {
      const key = this.getProductKey(product);
      if (!productMap.has(key)) {
        productMap.set(key, { ...product, source: 'localStorage' });
      }
    });
    
    return Array.from(productMap.values());
  }

  /**
   * Generate unique key for product deduplication
   */
  static getProductKey(product) {
    return product.code || product.sku || product.id || 
           `${product.name}-${product.supplierId}`.toLowerCase();
  }

  /**
   * Enrich products with allocation data and availability status
   */
  static enrichProductsWithAllocationData(products) {
    try {
      // Get allocation data
      const allocations = this.getAllocationData();
      const recentAllocations = this.getRecentAllocations();
      
      return products.map(product => {
        const productAllocations = allocations.filter(a => 
          a.productCode === product.code || a.productId === product.id
        );
        
        const recentAllocation = recentAllocations.find(a => 
          a.productCode === product.code || a.productId === product.id
        );
        
        // Calculate availability
        const totalAllocated = productAllocations.reduce((sum, a) => sum + (a.quantity || 0), 0);
        const currentStock = parseInt(product.stock || product.currentStock || 0);
        const availableForMatching = Math.max(0, currentStock - totalAllocated);
        
        return {
          ...product,
          // Allocation data
          allocations: productAllocations,
          totalAllocated,
          availableForMatching,
          isRecentlyAllocated: !!recentAllocation,
          lastAllocatedAt: recentAllocation?.allocatedAt,
          
          // Enhanced availability
          isAvailableForMatching: availableForMatching > 0 || !!recentAllocation,
          matchingPriority: this.calculateMatchingPriority(product, recentAllocation, availableForMatching),
          
          // Search keywords for better matching
          searchKeywords: this.generateSearchKeywords(product)
        };
      });
    } catch (error) {
      console.error('Error enriching products:', error);
      return products;
    }
  }

  /**
   * Get allocation data from all sources
   */
  static getAllocationData() {
    try {
      // Get from localStorage PI allocations
      const piAllocations = JSON.parse(localStorage.getItem('higgsflow_piAllocations') || '[]');
      
      // Get from stock allocation records
      const stockAllocations = JSON.parse(localStorage.getItem('higgsflow_stockAllocations') || '[]');
      
      return [...piAllocations, ...stockAllocations];
    } catch (error) {
      console.error('Error getting allocation data:', error);
      return [];
    }
  }

  /**
   * Get recent allocations (last 24 hours)
   */
  static getRecentAllocations() {
    try {
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      const allocations = this.getAllocationData();
      
      return allocations.filter(allocation => {
        const allocTime = new Date(allocation.allocatedAt || allocation.createdAt).getTime();
        return allocTime > oneDayAgo;
      });
    } catch (error) {
      console.error('Error getting recent allocations:', error);
      return [];
    }
  }

  /**
   * Calculate matching priority for products
   */
  static calculateMatchingPriority(product, recentAllocation, availableQty) {
    let priority = 0;
    
    // Higher priority for recently allocated items
    if (recentAllocation) priority += 100;
    
    // Higher priority for items with available stock
    priority += Math.min(availableQty * 10, 50);
    
    // Higher priority for certain categories
    if (product.category?.toLowerCase().includes('bearing')) priority += 20;
    if (product.category?.toLowerCase().includes('component')) priority += 15;
    
    // Higher priority for trusted suppliers
    if (product.supplier?.toLowerCase().includes('tianhong')) priority += 10;
    
    return priority;
  }

  /**
   * Generate search keywords for better product discovery
   */
  static generateSearchKeywords(product) {
    const keywords = new Set();
    
    // Add product code variations
    if (product.code) {
      keywords.add(product.code.toLowerCase());
      keywords.add(product.code.replace(/[^a-z0-9]/gi, ''));
    }
    
    // Add name words
    if (product.name) {
      product.name.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 2) keywords.add(word);
      });
    }
    
    // Add category
    if (product.category) {
      keywords.add(product.category.toLowerCase());
    }
    
    // Add supplier
    if (product.supplier) {
      keywords.add(product.supplier.toLowerCase());
    }
    
    return Array.from(keywords);
  }

  /**
   * Search products with enhanced matching
   */
  static searchProducts(products, searchTerm) {
    if (!searchTerm || searchTerm.length < 2) return products;
    
    const term = searchTerm.toLowerCase();
    
    return products.filter(product => {
      // Search in all standard fields
      const standardMatch = [
        product.code,
        product.name,
        product.category,
        product.supplier,
        product.description
      ].some(field => field?.toLowerCase().includes(term));
      
      // Search in generated keywords
      const keywordMatch = product.searchKeywords?.some(keyword => 
        keyword.includes(term)
      );
      
      return standardMatch || keywordMatch;
    }).sort((a, b) => {
      // Sort by matching priority
      return (b.matchingPriority || 0) - (a.matchingPriority || 0);
    });
  }

  /**
   * Filter products for manual matching
   */
  static getProductsForManualMatching(searchTerm = '', selectedSupplier = 'all') {
    return this.getAllAvailableProducts().then(products => {
      let filtered = products.filter(product => {
        // Must be available for matching
        if (!product.isAvailableForMatching) return false;
        
        // Supplier filter
        if (selectedSupplier !== 'all' && product.supplierId !== selectedSupplier) {
          return false;
        }
        
        return true;
      });
      
      // Apply search
      if (searchTerm) {
        filtered = this.searchProducts(filtered, searchTerm);
      }
      
      // Sort by priority
      filtered.sort((a, b) => (b.matchingPriority || 0) - (a.matchingPriority || 0));
      
      console.log('🎯 Products for manual matching:', {
        total: products.length,
        available: filtered.length,
        recentlyAllocated: filtered.filter(p => p.isRecentlyAllocated).length
      });
      
      return filtered;
    });
  }

  /**
   * Refresh product cache after allocation
   */
  static async refreshAfterAllocation(allocationData) {
    console.log('🔄 Refreshing products after allocation:', allocationData);
    
    // Store allocation data
    const existingAllocations = this.getAllocationData();
    const updatedAllocations = [...existingAllocations, ...allocationData];
    localStorage.setItem('higgsflow_stockAllocations', JSON.stringify(updatedAllocations));
    
    // Force refresh cache
    await this.getAllAvailableProducts(true);
    
    // Notify all listeners
    this.notifyListeners('allocation-completed', allocationData);
    this.notifyListeners('products-refreshed', this.productCache);
  }

  /**
   * Get debug information
   */
  static async getDebugInfo() {
    const products = await this.getAllAvailableProducts();
    const allocations = this.getAllocationData();
    const recentAllocations = this.getRecentAllocations();
    
    return {
      totalProducts: products.length,
      availableForMatching: products.filter(p => p.isAvailableForMatching).length,
      recentlyAllocated: products.filter(p => p.isRecentlyAllocated).length,
      bearingProducts: products.filter(p => 
        p.name?.toLowerCase().includes('bearing') || 
        p.category?.toLowerCase().includes('bearing')
      ).length,
      totalAllocations: allocations.length,
      recentAllocations: recentAllocations.length,
      cacheAge: this.lastCacheTime ? Date.now() - this.lastCacheTime : null,
      sources: {
        firestore: products.filter(p => p.source === 'firestore').length,
        localStorage: products.filter(p => p.source === 'localStorage').length
      }
    };
  }

  /**
   * Force refresh all product data
   */
  static async forceRefresh() {
    console.log('🔄 Force refreshing all product data...');
    this.productCache = null;
    this.lastCacheTime = null;
    
    const products = await this.getAllAvailableProducts(true);
    this.notifyListeners('force-refresh-completed', products);
    
    return products;
  }
}

export default UnifiedProductService;
