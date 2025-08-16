// Enhanced E-commerce API Service for Phase 2A
// File: src/services/ecommerce/EnhancedEcommerceAPIService.js

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  startAfter,
  endBefore,
  limitToLast
} from 'firebase/firestore';
import { COLLECTIONS } from '../../config/firestoreSchema.js';

export class EnhancedEcommerceAPIService {
  constructor(firestore) {
    this.db = firestore;
    this.cache = new Map();
    this.listeners = new Map();
  }

  // ========== PUBLIC CATALOG METHODS ==========

  /**
   * Get public products with enhanced filtering for guest users
   */
  async getPublicProducts(filters = {}) {
    try {
      let q = collection(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC);
      const conditions = [where('visibility', '==', 'public')];

      // Apply filters
      if (filters.category && filters.category !== 'All Categories') {
        conditions.push(where('category', '==', filters.category));
      }

      if (filters.featured) {
        conditions.push(where('featured', '==', true));
      }

      if (filters.trending) {
        conditions.push(where('trending', '==', true));
      }

      if (filters.inStock) {
        conditions.push(where('inventory.stockStatus', 'in', ['In Stock', 'Limited Stock']));
      }

      // Price range filtering
      if (filters.priceMin !== undefined) {
        conditions.push(where('pricing.discountPrice', '>=', filters.priceMin));
      }
      if (filters.priceMax !== undefined) {
        conditions.push(where('pricing.discountPrice', '<=', filters.priceMax));
      }

      // Apply sorting
      let orderField = 'updatedAt';
      let orderDirection = 'desc';

      switch (filters.sortBy) {
        case 'price-low':
          orderField = 'pricing.discountPrice';
          orderDirection = 'asc';
          break;
        case 'price-high':
          orderField = 'pricing.discountPrice';
          orderDirection = 'desc';
          break;
        case 'name':
          orderField = 'displayName';
          orderDirection = 'asc';
          break;
        case 'rating':
          orderField = 'supplier.rating';
          orderDirection = 'desc';
          break;
        case 'newest':
          orderField = 'createdAt';
          orderDirection = 'desc';
          break;
      }

      conditions.push(orderBy(orderField, orderDirection));

      // Pagination
      if (filters.pageSize) {
        conditions.push(limit(filters.pageSize));
      }

      if (filters.startAfter) {
        conditions.push(startAfter(filters.startAfter));
      }

      q = query(q, ...conditions);
      const snapshot = await getDocs(q);
      
      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert Firestore timestamps
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        lastSyncAt: doc.data().lastSyncAt?.toDate()
      }));

      // Client-side search filtering
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        products = products.filter(product => 
          product.displayName?.toLowerCase().includes(searchTerm) ||
          product.shortDescription?.toLowerCase().includes(searchTerm) ||
          product.category?.toLowerCase().includes(searchTerm) ||
          product.seo?.keywords?.some(keyword => 
            keyword.toLowerCase().includes(searchTerm)
          ) ||
          product.supplier?.name?.toLowerCase().includes(searchTerm) ||
          product.features?.some(feature => 
            feature.toLowerCase().includes(searchTerm)
          ) ||
          product.applications?.some(app => 
            app.toLowerCase().includes(searchTerm)
          )
        );
      }

      // Cache results
      const cacheKey = JSON.stringify(filters);
      this.cache.set(cacheKey, products);

      return {
        products,
        totalCount: products.length,
        hasMore: products.length === (filters.pageSize || 20),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
      };

    } catch (error) {
      console.error('Error fetching public products:', error);
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Get product categories with product counts
   */
  async getProductCategories() {
    try {
      const categoriesSnapshot = await getDocs(
        collection(this.db, COLLECTIONS.ECOMMERCE.PRODUCT_CATEGORIES)
      );
      
      const categories = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Update product counts in real-time
      const updatedCategories = await Promise.all(
        categories.map(async (category) => {
          const productCount = await this.getCategoryProductCount(category.name);
          return { ...category, productCount };
        })
      );

      // Sort by display order and product count
      return updatedCategories.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return (a.displayOrder || 999) - (b.displayOrder || 999);
        }
        return (b.productCount || 0) - (a.productCount || 0);
      });

    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error(`Failed to fetch categories: ${error.message}`);
    }
  }

  /**
   * Get featured products for homepage
   */
  async getFeaturedProducts(limit = 8) {
    try {
      const q = query(
        collection(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC),
        where('visibility', '==', 'public'),
        where('featured', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

    } catch (error) {
      console.error('Error fetching featured products:', error);
      throw new Error(`Failed to fetch featured products: ${error.message}`);
    }
  }

  /**
   * Get trending products based on analytics
   */
  async getTrendingProducts(limit = 6) {
    try {
      const q = query(
        collection(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC),
        where('visibility', '==', 'public'),
        where('trending', '==', true),
        orderBy('analytics.views', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

    } catch (error) {
      console.warn('Error fetching trending products:', error);
      // Fallback to regular featured products
      return this.getFeaturedProducts(limit);
    }
  }

  /**
   * Advanced product search with AI-powered ranking
   */
  async searchProducts(searchQuery, filters = {}) {
    try {
      // First, get products with basic filters
      const allProducts = await this.getPublicProducts({
        ...filters,
        pageSize: 100 // Get more for better search results
      });

      if (!searchQuery || searchQuery.trim() === '') {
        return allProducts;
      }

      // Advanced search scoring
      const searchResults = allProducts.products.map(product => {
        let score = 0;
        const query = searchQuery.toLowerCase();

        // Exact name match (highest score)
        if (product.displayName?.toLowerCase().includes(query)) {
          score += 100;
          if (product.displayName?.toLowerCase() === query) {
            score += 50; // Exact match bonus
          }
        }

        // Category match
        if (product.category?.toLowerCase().includes(query)) {
          score += 50;
        }

        // Description matches
        if (product.shortDescription?.toLowerCase().includes(query)) {
          score += 30;
        }
        if (product.fullDescription?.toLowerCase().includes(query)) {
          score += 20;
        }

        // SEO keywords match
        if (product.seo?.keywords?.some(keyword => 
            keyword.toLowerCase().includes(query))) {
          score += 40;
        }

        // Supplier match
        if (product.supplier?.name?.toLowerCase().includes(query)) {
          score += 25;
        }

        // Specifications match
        if (product.specifications && 
            Object.values(product.specifications).some(spec => 
              String(spec).toLowerCase().includes(query))) {
          score += 30;
        }

        // Features match
        if (product.features?.some(feature => 
            feature.toLowerCase().includes(query))) {
          score += 20;
        }

        // Applications match
        if (product.applications?.some(app => 
            app.toLowerCase().includes(query))) {
          score += 15;
        }

        // Boost score based on product quality indicators
        if (product.featured) score += 10;
        if (product.trending) score += 15;
        if (product.supplier?.rating >= 4.5) score += 5;
        if (product.inventory?.stockStatus === 'In Stock') score += 5;

        return { ...product, searchScore: score };
      });

      // Filter out products with zero score and sort by score
      const rankedResults = searchResults
        .filter(product => product.searchScore > 0)
        .sort((a, b) => b.searchScore - a.searchScore);

      return {
        products: rankedResults,
        totalCount: rankedResults.length,
        searchQuery,
        suggestions: this.generateSearchSuggestions(searchQuery, rankedResults),
        hasMore: false
      };

    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }

  /**
   * Generate search suggestions based on query and results
   */
  generateSearchSuggestions(query, results) {
    const suggestions = new Set();
    const queryLower = query.toLowerCase();

    // Category suggestions from results
    results.forEach(product => {
      if (product.category && !product.category.toLowerCase().includes(queryLower)) {
        suggestions.add(product.category);
      }
    });

    // Popular keywords from high-scoring results
    results.slice(0, 10).forEach(product => {
      if (product.seo?.keywords) {
        product.seo.keywords.forEach(keyword => {
          if (!keyword.toLowerCase().includes(queryLower) && keyword.length > 3) {
            suggestions.add(keyword);
          }
        });
      }
    });

    // Supplier suggestions
    results.slice(0, 5).forEach(product => {
      if (product.supplier?.name && !product.supplier.name.toLowerCase().includes(queryLower)) {
        suggestions.add(product.supplier.name);
      }
    });

    return Array.from(suggestions).slice(0, 8);
  }

  /**
   * Get product count for a category
   */
  async getCategoryProductCount(categoryName) {
    try {
      const q = query(
        collection(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC),
        where('category', '==', categoryName),
        where('visibility', '==', 'public')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;

    } catch (error) {
      console.warn('Error getting category count:', error);
      return 0;
    }
  }

  // ========== GUEST CART METHODS ==========

  /**
   * Create guest cart session
   */
  async createGuestCart(sessionId, deviceInfo = {}) {
    try {
      const cartId = `guest-${sessionId}`;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days expiry

      const guestCart = {
        factoryId: null,
        sessionId,
        userType: 'guest',
        
        items: [],
        totals: {
          subtotal: 0,
          bulkDiscount: 0,
          userTypeDiscount: 0,
          tax: 0,
          shipping: 0,
          total: 0,
          savings: 0
        },
        
        shipping: {
          method: 'standard',
          address: null,
          instructions: '',
          consolidate: true
        },
        
        session: {
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          expiresAt: expiryDate,
          status: 'active',
          deviceInfo,
          ipAddress: deviceInfo.ipAddress || null
        }
      };

      await setDoc(doc(this.db, COLLECTIONS.ECOMMERCE.SHOPPING_CARTS, cartId), guestCart);
      
      return {
        id: cartId,
        ...guestCart,
        session: {
          ...guestCart.session,
          createdAt: new Date(),
          lastUpdated: new Date(),
          expiresAt: expiryDate
        }
      };

    } catch (error) {
      console.error('Error creating guest cart:', error);
      throw new Error(`Failed to create guest cart: ${error.message}`);
    }
  }

  /**
   * Add item to guest cart
   */
  async addToGuestCart(sessionId, productId, quantity = 1, options = {}) {
    try {
      const cartId = `guest-${sessionId}`;
      
      // Get cart or create if doesn't exist
      let cart;
      try {
        cart = await this.getCartById(cartId);
      } catch {
        cart = await this.createGuestCart(sessionId);
      }

      // Get product details
      const product = await this.getProduct(productId);

      // Check if item already exists
      const existingItemIndex = cart.items.findIndex(item => item.productId === productId);

      let updatedItems;
      if (existingItemIndex >= 0) {
        // Update existing item
        updatedItems = [...cart.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
          lastUpdated: new Date()
        };
      } else {
        // Add new item
        const newItem = {
          productId,
          displayName: product.displayName,
          category: product.category,
          quantity,
          unitPrice: this.calculateBestPrice(product, quantity),
          listPrice: product.pricing?.listPrice || 0,
          bulkDiscount: 0,
          images: {
            thumbnail: product.images?.thumbnail || product.images?.primary
          },
          supplier: {
            id: product.supplier?.id,
            name: product.supplier?.name,
            rating: product.supplier?.rating
          },
          inventory: {
            stockStatus: product.inventory?.stockStatus,
            leadTime: product.inventory?.leadTime,
            minimumOrderQty: product.inventory?.minimumOrderQty
          },
          addedAt: new Date(),
          selectedOptions: options,
          notes: options.notes || '',
          urgency: options.urgency || 'standard'
        };

        updatedItems = [...cart.items, newItem];
      }

      // Calculate new totals
      const totals = this.calculateCartTotals(updatedItems, 'guest');

      // Update cart
      await updateDoc(doc(this.db, COLLECTIONS.ECOMMERCE.SHOPPING_CARTS, cartId), {
        items: updatedItems,
        totals,
        'session.lastUpdated': serverTimestamp()
      });

      return {
        success: true,
        itemCount: updatedItems.length,
        totalItems: updatedItems.reduce((sum, item) => sum + item.quantity, 0),
        totals
      };

    } catch (error) {
      console.error('Error adding to guest cart:', error);
      throw new Error(`Failed to add to guest cart: ${error.message}`);
    }
  }

  // ========== ANALYTICS METHODS ==========

  /**
   * Track product view for analytics
   */
  async trackProductView(productId, userInfo = {}) {
    try {
      await updateDoc(doc(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC, productId), {
        'analytics.views': increment(1),
        'analytics.lastViewed': serverTimestamp(),
        'analytics.uniqueViewers': increment(userInfo.isNewViewer ? 1 : 0)
      });

      // Track in search analytics if came from search
      if (userInfo.searchQuery) {
        await this.trackSearchClick(userInfo.searchQuery, productId, userInfo);
      }

    } catch (error) {
      console.warn('Failed to track product view:', error);
    }
  }

  /**
   * Track search query analytics
   */
  async trackSearch(query, resultsCount, userInfo = {}) {
    try {
      const searchLog = {
        query: query.toLowerCase(),
        resultsCount,
        timestamp: serverTimestamp(),
        userType: userInfo.userType || 'guest',
        location: userInfo.location || null,
        deviceInfo: userInfo.deviceInfo || null,
        sessionId: userInfo.sessionId || null
      };

      await setDoc(
        doc(this.db, COLLECTIONS.ECOMMERCE.SEARCH_ANALYTICS, `${Date.now()}-${Math.random()}`), 
        searchLog
      );
    } catch (error) {
      console.warn('Failed to track search:', error);
    }
  }

  /**
   * Track search result clicks
   */
  async trackSearchClick(query, productId, userInfo = {}) {
    try {
      const clickLog = {
        searchQuery: query.toLowerCase(),
        productId,
        timestamp: serverTimestamp(),
        userType: userInfo.userType || 'guest',
        position: userInfo.position || null,
        sessionId: userInfo.sessionId || null
      };

      await setDoc(
        doc(this.db, COLLECTIONS.ECOMMERCE.SEARCH_ANALYTICS, `click-${Date.now()}-${Math.random()}`), 
        clickLog
      );
    } catch (error) {
      console.warn('Failed to track search click:', error);
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Calculate best price based on quantity
   */
  calculateBestPrice(product, quantity) {
    if (!product.pricing?.bulkPricing?.length) {
      return product.pricing?.discountPrice || 0;
    }

    let bestPrice = product.pricing.discountPrice || 0;
    
    for (const tier of product.pricing.bulkPricing) {
      if (quantity >= tier.minQty) {
        bestPrice = tier.price;
      }
    }

    return bestPrice;
  }

  /**
   * Calculate cart totals with user type considerations
   */
  calculateCartTotals(items, userType = 'guest') {
    const subtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const bulkDiscount = items.reduce((sum, item) => 
      sum + ((item.listPrice - item.unitPrice) * item.quantity), 0);
    
    // User type discounts
    let userTypeDiscount = 0;
    if (userType === 'verified_factory') {
      userTypeDiscount = subtotal * 0.05; // 5% for verified factories
    } else if (userType === 'premium_factory') {
      userTypeDiscount = subtotal * 0.10; // 10% for premium factories
    }
    
    const discountedSubtotal = subtotal - userTypeDiscount;
    const tax = discountedSubtotal * 0.06; // 6% GST
    const shipping = this.calculateShipping(discountedSubtotal, userType);
    const total = discountedSubtotal + tax + shipping;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      bulkDiscount: Math.round(bulkDiscount * 100) / 100,
      userTypeDiscount: Math.round(userTypeDiscount * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      total: Math.round(total * 100) / 100,
      savings: Math.round((bulkDiscount + userTypeDiscount) * 100) / 100
    };
  }

  /**
   * Calculate shipping cost based on user type
   */
  calculateShipping(subtotal, userType = 'guest') {
    // Free shipping thresholds by user type
    const freeShippingThresholds = {
      guest: 2000,
      registered_factory: 1500,
      verified_factory: 1000,
      premium_factory: 500
    };

    const threshold = freeShippingThresholds[userType] || 2000;
    
    if (subtotal >= threshold) return 0;
    if (subtotal >= 500) return 25;
    return 50;
  }

  /**
   * Get cart by ID
   */
  async getCartById(cartId) {
    const cartDoc = await getDoc(doc(this.db, COLLECTIONS.ECOMMERCE.SHOPPING_CARTS, cartId));
    if (!cartDoc.exists()) {
      throw new Error('Cart not found');
    }
    return { id: cartDoc.id, ...cartDoc.data() };
  }

  /**
   * Get single product by ID
   */
  async getProduct(productId) {
    try {
      const productDoc = await getDoc(doc(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC, productId));
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }

      const productData = productDoc.data();
      
      return {
        id: productDoc.id,
        ...productData,
        createdAt: productData.createdAt?.toDate(),
        updatedAt: productData.updatedAt?.toDate(),
        lastSyncAt: productData.lastSyncAt?.toDate()
      };

    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }

  // ========== REAL-TIME LISTENERS ==========

  /**
   * Subscribe to product updates
   */
  subscribeToProducts(filters, callback) {
    const listenerId = JSON.stringify(filters);
    
    if (this.listeners.has(listenerId)) {
      this.listeners.get(listenerId)();
    }

    let q = collection(this.db, COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC);
    const conditions = [where('visibility', '==', 'public')];

    if (filters.category && filters.category !== 'All Categories') {
      conditions.push(where('category', '==', filters.category));
    }

    if (filters.featured) {
      conditions.push(where('featured', '==', true));
    }

    conditions.push(orderBy('updatedAt', 'desc'));

    if (filters.limit) {
      conditions.push(limit(filters.limit));
    }

    q = query(q, ...conditions);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      }));

      callback({ products, totalCount: products.length });
    }, (error) => {
      console.error('Product subscription error:', error);
      callback({ error: error.message });
    });

    this.listeners.set(listenerId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
  }
}

export default EnhancedEcommerceAPIService;
