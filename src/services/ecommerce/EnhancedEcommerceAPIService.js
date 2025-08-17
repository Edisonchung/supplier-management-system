// Enhanced E-commerce API Service for Phase 2A - FIXED VERSION
// File: src/services/ecommerce/EnhancedEcommerceAPIService.js

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc,
  updateDoc, 
  deleteDoc,
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

// Fallback collections if COLLECTIONS import fails
const DEFAULT_COLLECTIONS = {
  ECOMMERCE: {
    PRODUCTS_PUBLIC: 'products_public',
    PRODUCT_CATEGORIES: 'product_categories',
    SHOPPING_CARTS: 'shopping_carts',
    SEARCH_ANALYTICS: 'search_analytics',
    FACTORIES: 'factories',
    QUOTES: 'quotes',
    ORDERS: 'orders_ecommerce',
    USER_ANALYTICS: 'user_analytics'
  }
};

// Collections promise for lazy loading
let collectionsPromise = null;

const getCollections = async () => {
  if (!collectionsPromise) {
    collectionsPromise = (async () => {
      try {
        const { COLLECTIONS: ImportedCollections } = await import('../../config/firestoreSchema.js');
        return ImportedCollections;
      } catch (error) {
        console.warn('Could not import COLLECTIONS from firestoreSchema, using defaults:', error);
        return DEFAULT_COLLECTIONS;
      }
    })();
  }
  return collectionsPromise;
};

export class EnhancedEcommerceAPIService {
  constructor(firestore) {
    this.db = firestore;
    this.cache = new Map();
    this.listeners = new Map();
    this.collectionsInitialized = false;
    this.collections = null;
    
    // Initialize collections asynchronously
    this.initializeCollections();
  }

  async initializeCollections() {
    if (this.collectionsInitialized) return this.collections;
    
    try {
      const COLLECTIONS = await getCollections();
      
      // Collection names with fallbacks
      this.collections = {
        products: COLLECTIONS?.ECOMMERCE?.PRODUCTS_PUBLIC || 'products_public',
        categories: COLLECTIONS?.ECOMMERCE?.PRODUCT_CATEGORIES || 'product_categories',
        carts: COLLECTIONS?.ECOMMERCE?.SHOPPING_CARTS || 'shopping_carts',
        analytics: COLLECTIONS?.ECOMMERCE?.SEARCH_ANALYTICS || 'search_analytics',
        factories: COLLECTIONS?.ECOMMERCE?.FACTORIES || 'factories',
        quotes: COLLECTIONS?.ECOMMERCE?.QUOTES || 'quotes',
        orders: COLLECTIONS?.ECOMMERCE?.ORDERS || 'orders_ecommerce',
        userAnalytics: COLLECTIONS?.ECOMMERCE?.USER_ANALYTICS || 'user_analytics'
      };
      
      this.collectionsInitialized = true;
      return this.collections;
    } catch (error) {
      console.error('Error initializing collections:', error);
      // Use defaults
      this.collections = {
        products: 'products_public',
        categories: 'product_categories',
        carts: 'shopping_carts',
        analytics: 'search_analytics',
        factories: 'factories',
        quotes: 'quotes',
        orders: 'orders_ecommerce',
        userAnalytics: 'user_analytics'
      };
      this.collectionsInitialized = true;
      return this.collections;
    }
  }

  // Helper method to ensure collections are initialized
  async ensureCollections() {
    if (!this.collectionsInitialized) {
      await this.initializeCollections();
    }
    return this.collections;
  }

  // ========== PUBLIC CATALOG METHODS ==========

  /**
   * Get public products with enhanced filtering for guest users
   */
  async getPublicProducts(filters = {}) {
    try {
      await this.ensureCollections();
      
      const cacheKey = JSON.stringify(filters);
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cachedData = this.cache.get(cacheKey);
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge < 300000) { // 5 minutes cache
          return cachedData.data;
        }
      }

      let q = collection(this.db, this.collections.products);
      const conditions = [];

      // Basic visibility filter
      conditions.push(where('visibility', '==', 'public'));
      conditions.push(where('status', '==', 'active'));

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

      // Price range filtering (basic - in production use composite indexes)
      if (filters.priceMin !== undefined) {
        conditions.push(where('pricing.discountPrice', '>=', filters.priceMin));
      }
      if (filters.priceMax !== undefined) {
        conditions.push(where('pricing.discountPrice', '<=', filters.priceMax));
      }

      // Search filtering (basic text matching)
      if (filters.searchTerm) {
        // In production, use Algolia or similar for full-text search
        // For now, we'll filter client-side after fetching
      }

      // Sorting
      let sortField = 'updatedAt';
      let sortDirection = 'desc';
      
      switch (filters.sortBy) {
        case 'price_low':
          sortField = 'pricing.discountPrice';
          sortDirection = 'asc';
          break;
        case 'price_high':
          sortField = 'pricing.discountPrice';
          sortDirection = 'desc';
          break;
        case 'newest':
          sortField = 'createdAt';
          sortDirection = 'desc';
          break;
        case 'popular':
          sortField = 'analytics.views';
          sortDirection = 'desc';
          break;
        case 'rating':
          sortField = 'rating.average';
          sortDirection = 'desc';
          break;
        default:
          sortField = 'updatedAt';
          sortDirection = 'desc';
      }

      // Build final query
      if (conditions.length > 0) {
        conditions.push(orderBy(sortField, sortDirection));
        q = query(q, ...conditions);
      } else {
        q = query(q, orderBy(sortField, sortDirection));
      }

      // Add pagination
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      if (filters.startAfter) {
        q = query(q, startAfter(filters.startAfter));
      }

      const snapshot = await getDocs(q);
      const products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));

      // Client-side search filtering (temporary solution)
      let filteredProducts = products;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        filteredProducts = products.filter(product => 
          product.name?.toLowerCase().includes(searchLower) ||
          product.description?.toLowerCase().includes(searchLower) ||
          product.category?.toLowerCase().includes(searchLower) ||
          product.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      const result = {
        products: filteredProducts,
        totalCount: filteredProducts.length,
        hasMore: snapshot.docs.length === (filters.limit || 20),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        isMockData: false
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Error fetching public products:', error);
      
      // Return mock data as fallback
      return this.getMockProducts(filters);
    }
  }

  /**
   * Get single product by ID
   */
  async getProductById(productId) {
    try {
      await this.ensureCollections();
      
      const docRef = doc(this.db, this.collections.products, productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const productData = docSnap.data();
        
        // Track view
        this.trackProductView(productId, { isAnonymous: true });
        
        return {
          id: docSnap.id,
          ...productData,
          createdAt: productData.createdAt?.toDate?.() || new Date(),
          updatedAt: productData.updatedAt?.toDate?.() || new Date()
        };
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }

  /**
   * Get product categories with product counts
   */
  async getProductCategories() {
    try {
      await this.ensureCollections();
      
      const categoriesSnapshot = await getDocs(
        collection(this.db, this.collections.categories)
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
      
      // Return mock categories as fallback
      return [
        { id: 'all', name: 'All Categories', productCount: 156, displayOrder: 0 },
        { id: 'steel', name: 'Steel Products', productCount: 45, displayOrder: 1 },
        { id: 'hydraulics', name: 'Hydraulics', productCount: 23, displayOrder: 2 },
        { id: 'mechanical', name: 'Mechanical Components', productCount: 67, displayOrder: 3 },
        { id: 'electrical', name: 'Electrical', productCount: 21, displayOrder: 4 }
      ];
    }
  }

  /**
   * Get featured products for homepage
   */
  async getFeaturedProducts(limitCount = 8) {
    try {
      await this.ensureCollections();
      
      const q = query(
        collection(this.db, this.collections.products),
        where('visibility', '==', 'public'),
        where('featured', '==', true),
        where('status', '==', 'active'),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));

    } catch (error) {
      console.error('Error fetching featured products:', error);
      // Return mock featured products
      const mockData = this.getMockProducts({ featured: true });
      return mockData.products.slice(0, limitCount);
    }
  }

  /**
   * Get trending products based on analytics
   */
  async getTrendingProducts(limitCount = 6) {
    try {
      await this.ensureCollections();
      
      const q = query(
        collection(this.db, this.collections.products),
        where('visibility', '==', 'public'),
        where('trending', '==', true),
        where('status', '==', 'active'),
        orderBy('analytics.views', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
      }));

    } catch (error) {
      console.error('Error fetching trending products:', error);
      // Return mock trending products
      const mockData = this.getMockProducts({ trending: true });
      return mockData.products.slice(0, limitCount);
    }
  }

  // ========== GUEST CART MANAGEMENT ==========

  /**
   * Add item to guest cart (session-based)
   */
  async addToGuestCart(sessionId, productId, quantity = 1, options = {}) {
    try {
      await this.ensureCollections();
      
      const cartRef = doc(this.db, this.collections.carts, sessionId);
      const cartSnap = await getDoc(cartRef);
      
      let cartData;
      if (cartSnap.exists()) {
        cartData = cartSnap.data();
      } else {
        cartData = {
          sessionId,
          userType: 'guest',
          items: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, total: 0 },
          session: {
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
          }
        };
      }

      // Find existing item or add new one
      const existingItemIndex = cartData.items.findIndex(item => 
        item.productId === productId && 
        JSON.stringify(item.options) === JSON.stringify(options)
      );

      if (existingItemIndex >= 0) {
        cartData.items[existingItemIndex].quantity += quantity;
      } else {
        // Get product details
        const product = await this.getProductById(productId);
        cartData.items.push({
          productId,
          name: product.name,
          price: product.pricing?.discountPrice || product.pricing?.retailPrice || 0,
          image: product.images?.[0]?.url || '/placeholder-product.jpg',
          quantity,
          options,
          addedAt: new Date()
        });
      }

      // Recalculate totals
      const totals = this.calculateCartTotals(cartData.items);
      cartData.totals = totals;
      cartData.session.lastUpdated = serverTimestamp();

      await setDoc(cartRef, cartData);

      return { success: true, totals };
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw new Error(`Failed to add to cart: ${error.message}`);
    }
  }

  /**
   * Get guest cart
   */
  async getGuestCart(sessionId) {
    try {
      await this.ensureCollections();
      
      const cartRef = doc(this.db, this.collections.carts, sessionId);
      const cartSnap = await getDoc(cartRef);
      
      if (cartSnap.exists()) {
        return cartSnap.data();
      } else {
        return {
          sessionId,
          userType: 'guest',
          items: [],
          totals: { subtotal: 0, shipping: 0, tax: 0, total: 0 },
          session: {
            createdAt: new Date(),
            lastUpdated: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        };
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      return {
        sessionId,
        userType: 'guest',
        items: [],
        totals: { subtotal: 0, shipping: 0, tax: 0, total: 0 },
        session: {
          createdAt: new Date(),
          lastUpdated: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };
    }
  }

  /**
   * Remove item from guest cart
   */
  async removeFromGuestCart(sessionId, productId, options = {}) {
    try {
      await this.ensureCollections();
      
      const cartRef = doc(this.db, this.collections.carts, sessionId);
      const cartSnap = await getDoc(cartRef);
      
      if (!cartSnap.exists()) {
        throw new Error('Cart not found');
      }

      const cartData = cartSnap.data();
      cartData.items = cartData.items.filter(item => 
        !(item.productId === productId && 
          JSON.stringify(item.options) === JSON.stringify(options))
      );

      // Recalculate totals
      const totals = this.calculateCartTotals(cartData.items);
      cartData.totals = totals;

      await updateDoc(cartRef, {
        items: cartData.items,
        totals,
        'session.lastUpdated': serverTimestamp()
      });

      return { success: true, totals };
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw new Error(`Failed to remove from cart: ${error.message}`);
    }
  }

  // ========== FACTORY MANAGEMENT ==========

  /**
   * Register new factory
   */
  async registerFactory(factoryData) {
    try {
      await this.ensureCollections();
      
      const factory = {
        ...factoryData,
        status: 'pending_verification',
        userType: 'registered_factory',
        registrationDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        emailVerified: false,
        documentsSubmitted: false
      };

      const docRef = await addDoc(collection(this.db, this.collections.factories), factory);
      
      return {
        success: true,
        factoryId: docRef.id,
        message: 'Factory registration submitted for review'
      };
    } catch (error) {
      console.error('Error registering factory:', error);
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Submit quote request
   */
  async submitQuoteRequest(quoteData) {
    try {
      await this.ensureCollections();
      
      const quote = {
        ...quoteData,
        quoteNumber: this.generateQuoteNumber(),
        status: 'pending',
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        responses: [],
        expiresAt: this.calculateQuoteExpiry()
      };

      const docRef = await addDoc(collection(this.db, this.collections.quotes), quote);
      
      return {
        success: true,
        quoteId: docRef.id,
        quoteNumber: quote.quoteNumber,
        message: 'Quote request submitted successfully'
      };
    } catch (error) {
      console.error('Error submitting quote:', error);
      throw new Error(`Quote submission failed: ${error.message}`);
    }
  }

  // ========== ANALYTICS METHODS ==========

  /**
   * Track product view for analytics
   */
  async trackProductView(productId, userInfo = {}) {
    try {
      await this.ensureCollections();
      
      // Update product view count
      await updateDoc(doc(this.db, this.collections.products, productId), {
        'analytics.views': increment(1),
        'analytics.lastViewed': serverTimestamp(),
        'analytics.uniqueViewers': increment(userInfo.isNewViewer ? 1 : 0)
      });

      // Track in analytics collection
      await addDoc(collection(this.db, this.collections.analytics), {
        event: 'product_view',
        productId,
        sessionId: userInfo.sessionId || 'anonymous',
        userType: userInfo.userType || 'guest',
        timestamp: serverTimestamp(),
        metadata: {
          platform: 'web',
          source: userInfo.source || 'direct',
          ...userInfo.metadata
        }
      });

    } catch (error) {
      console.error('Error tracking product view:', error);
      // Non-blocking error - analytics failure shouldn't break the app
    }
  }

  /**
   * Track search analytics
   */
  async trackSearchQuery(searchTerm, filters = {}, results = {}) {
    try {
      await this.ensureCollections();
      
      await addDoc(collection(this.db, this.collections.analytics), {
        event: 'search_query',
        searchTerm: searchTerm.toLowerCase(),
        filters,
        results: {
          count: results.count || 0,
          hasResults: (results.count || 0) > 0
        },
        timestamp: serverTimestamp(),
        sessionId: filters.sessionId || 'anonymous',
        userType: filters.userType || 'guest'
      });

    } catch (error) {
      console.error('Error tracking search:', error);
      // Non-blocking error
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Calculate cart totals
   */
  calculateCartTotals(items) {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal > 1000 ? 0 : 50; // Free shipping over RM 1000
    const tax = subtotal * 0.06; // 6% SST
    const total = subtotal + shipping + tax;

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      shipping: parseFloat(shipping.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2))
    };
  }

  /**
   * Generate quote number
   */
  generateQuoteNumber() {
    const prefix = 'HF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Calculate quote expiry (7 days from now)
   */
  calculateQuoteExpiry() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Get category product count
   */
  async getCategoryProductCount(categoryName) {
    try {
      await this.ensureCollections();
      
      const q = query(
        collection(this.db, this.collections.products),
        where('category', '==', categoryName),
        where('visibility', '==', 'public'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting category count:', error);
      return 0;
    }
  }

  /**
   * Mock data for development/fallback
   */
  getMockProducts(filters = {}) {
    const mockProducts = [
      {
        id: 'mock-1',
        name: 'Industrial Steel Beam - I-Section',
        description: 'High-grade structural steel beam suitable for construction and manufacturing applications.',
        category: 'Steel Products',
        pricing: { retailPrice: 450, discountPrice: 380 },
        images: [{ url: '/placeholder-product.jpg', alt: 'Steel Beam' }],
        inventory: { stockStatus: 'In Stock', quantity: 150 },
        featured: true,
        trending: false,
        rating: { average: 4.7, count: 23 },
        supplier: { name: 'SteelCorp Malaysia', location: 'Kuala Lumpur' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mock-2',
        name: 'Hydraulic Cylinder - 200mm Bore',
        description: 'Heavy-duty hydraulic cylinder for industrial machinery and equipment.',
        category: 'Hydraulics',
        pricing: { retailPrice: 1200, discountPrice: 980 },
        images: [{ url: '/placeholder-product.jpg', alt: 'Hydraulic Cylinder' }],
        inventory: { stockStatus: 'In Stock', quantity: 45 },
        featured: false,
        trending: true,
        rating: { average: 4.9, count: 15 },
        supplier: { name: 'HydroTech Solutions', location: 'Penang' },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'mock-3',
        name: 'Precision Ball Bearing Set',
        description: 'High-precision ball bearings for manufacturing equipment and machinery.',
        category: 'Mechanical Components',
        pricing: { retailPrice: 85, discountPrice: 68 },
        images: [{ url: '/placeholder-product.jpg', alt: 'Ball Bearings' }],
        inventory: { stockStatus: 'Limited Stock', quantity: 12 },
        featured: true,
        trending: false,
        rating: { average: 4.5, count: 67 },
        supplier: { name: 'Precision Parts Ltd', location: 'Johor' },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Apply filters
    let filtered = mockProducts;

    if (filters.category && filters.category !== 'All Categories') {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (filters.featured) {
      filtered = filtered.filter(p => p.featured);
    }

    if (filters.trending) {
      filtered = filtered.filter(p => p.trending);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    if (filters.sortBy === 'price_low') {
      filtered.sort((a, b) => a.pricing.discountPrice - b.pricing.discountPrice);
    } else if (filters.sortBy === 'price_high') {
      filtered.sort((a, b) => b.pricing.discountPrice - a.pricing.discountPrice);
    } else {
      // Default sort by updated date
      filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    return {
      products: filtered,
      totalCount: filtered.length,
      hasMore: false,
      lastDoc: null,
      isMockData: true
    };
  }

  /**
   * Cleanup method
   */
  dispose() {
    // Clear cache
    this.cache.clear();
    
    // Unsubscribe from listeners
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }
}

export default EnhancedEcommerceAPIService;
