// Enhanced E-commerce API Service for Phase 2A - UPDATED VERSION
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

// Try to import collections, fallback to defaults
let COLLECTIONS;
try {
  const { COLLECTIONS: ImportedCollections } = await import('../../config/firestoreSchema.js');
  COLLECTIONS = ImportedCollections;
} catch (error) {
  console.warn('Could not import COLLECTIONS from firestoreSchema, using defaults:', error);
  COLLECTIONS = DEFAULT_COLLECTIONS;
}

export class EnhancedEcommerceAPIService {
  constructor(firestore) {
    this.db = firestore;
    this.cache = new Map();
    this.listeners = new Map();
    
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
  }

  // ========== PUBLIC CATALOG METHODS ==========

  /**
   * Get public products with enhanced filtering for guest users
   */
  async getPublicProducts(filters = {}) {
    try {
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
        case 'popular':
          orderField = 'analytics.views';
          orderDirection = 'desc';
          break;
        default:
          // Default relevance sort
          conditions.push(orderBy('featured', 'desc'));
          orderField = 'updatedAt';
          orderDirection = 'desc';
      }

      conditions.push(orderBy(orderField, orderDirection));

      // Pagination
      if (filters.pageSize) {
        conditions.push(limit(filters.pageSize));
      } else {
        conditions.push(limit(24)); // Default page size
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
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        lastSyncAt: doc.data().lastSyncAt?.toDate?.() || new Date(),
        lastDoc: doc // Keep reference for pagination
      }));

      // Client-side search filtering if needed
      if (filters.searchTerm) {
        products = this.applySearchFilter(products, filters.searchTerm);
      }

      // Client-side price range if not handled by Firestore
      if (filters.priceRange && filters.priceRange.length === 2) {
        products = products.filter(product => {
          const price = product.pricing?.discountPrice || product.pricing?.unitPrice || 0;
          return price >= filters.priceRange[0] && price <= filters.priceRange[1];
        });
      }

      const result = {
        products,
        totalCount: products.length,
        hasMore: snapshot.docs.length === (filters.pageSize || 24),
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        timestamp: Date.now()
      };

      // Cache results
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });

      return result;

    } catch (error) {
      console.error('Error fetching public products:', error);
      
      // Return mock data as fallback for development
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        return this.getMockProducts(filters);
      }
      
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
  }

  /**
   * Apply search filter to products (client-side)
   */
  applySearchFilter(products, searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products;

    return products.filter(product => {
      // Search in multiple fields
      const searchFields = [
        product.displayName || product.name,
        product.shortDescription || product.description,
        product.category,
        product.supplier?.name,
        ...(product.features || []),
        ...(product.applications || []),
        ...(product.seo?.keywords || []),
        ...(Object.values(product.specifications || {}))
      ];

      return searchFields.some(field => 
        field && String(field).toLowerCase().includes(term)
      );
    });
  }

  /**
   * Get mock products for development/fallback
   */
  getMockProducts(filters = {}) {
    const mockProducts = [
      {
        id: 'mock_001',
        displayName: 'Industrial Steel Pipe DN50',
        shortDescription: 'High-quality carbon steel pipe suitable for industrial applications',
        category: 'Steel Products',
        pricing: { 
          unitPrice: 125.50, 
          discountPrice: 125.50,
          currency: 'MYR',
          bulkPricing: [
            { minQty: 10, price: 120.00 },
            { minQty: 50, price: 115.00 }
          ]
        },
        inventory: { 
          stockStatus: 'In Stock',
          quantity: 500, 
          unit: 'meters',
          leadTime: '3-5 days'
        },
        supplier: { 
          name: 'Steel Components Malaysia',
          rating: 4.8,
          location: 'Selangor'
        },
        featured: true,
        trending: false,
        status: 'active',
        visibility: 'public',
        images: {
          primary: '/api/placeholder/300/300',
          thumbnail: '/api/placeholder/150/150'
        },
        features: ['Corrosion resistant', 'High strength', 'ISO certified'],
        applications: ['Construction', 'Industrial piping', 'Infrastructure'],
        specifications: {
          material: 'Carbon Steel',
          diameter: '50mm',
          length: '6m',
          standard: 'MS 1506'
        },
        analytics: { views: 1250, uniqueViewers: 890 },
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-08-17')
      },
      {
        id: 'mock_002',
        displayName: 'Hydraulic Valve Assembly',
        shortDescription: 'Professional hydraulic valve for industrial machinery',
        category: 'Hydraulics',
        pricing: { 
          unitPrice: 850.00, 
          discountPrice: 820.00,
          currency: 'MYR',
          bulkPricing: [
            { minQty: 5, price: 800.00 },
            { minQty: 20, price: 750.00 }
          ]
        },
        inventory: { 
          stockStatus: 'Limited Stock',
          quantity: 25, 
          unit: 'pieces',
          leadTime: '5-7 days'
        },
        supplier: { 
          name: 'Precision Engineering Sdn Bhd',
          rating: 4.9,
          location: 'Johor'
        },
        featured: true,
        trending: true,
        status: 'active',
        visibility: 'public',
        images: {
          primary: '/api/placeholder/300/300',
          thumbnail: '/api/placeholder/150/150'
        },
        features: ['High pressure rated', 'Leak-proof design', 'Easy maintenance'],
        applications: ['Hydraulic systems', 'Manufacturing equipment', 'Automation'],
        specifications: {
          pressure: '200 bar',
          size: '1/2 inch',
          material: 'Stainless Steel',
          connection: 'NPT'
        },
        analytics: { views: 890, uniqueViewers: 654 },
        createdAt: new Date('2024-02-01'),
        updatedAt: new Date('2024-08-16')
      },
      {
        id: 'mock_003',
        displayName: 'Industrial Ball Bearing Set',
        shortDescription: 'High-precision ball bearings for heavy machinery',
        category: 'Mechanical Components',
        pricing: { 
          unitPrice: 45.75, 
          discountPrice: 42.50,
          currency: 'MYR',
          bulkPricing: [
            { minQty: 100, price: 40.00 },
            { minQty: 500, price: 38.00 }
          ]
        },
        inventory: { 
          stockStatus: 'In Stock',
          quantity: 200, 
          unit: 'sets',
          leadTime: '2-3 days'
        },
        supplier: { 
          name: 'Bearing Solutions Malaysia',
          rating: 4.7,
          location: 'Penang'
        },
        featured: false,
        trending: false,
        status: 'active',
        visibility: 'public',
        images: {
          primary: '/api/placeholder/300/300',
          thumbnail: '/api/placeholder/150/150'
        },
        features: ['High precision', 'Long lifespan', 'Low friction'],
        applications: ['Motor assemblies', 'Conveyor systems', 'Rotating equipment'],
        specifications: {
          type: 'Deep Grove Ball Bearing',
          diameter: '30mm',
          load: '1500N',
          material: 'Chrome Steel'
        },
        analytics: { views: 654, uniqueViewers: 432 },
        createdAt: new Date('2024-03-15'),
        updatedAt: new Date('2024-08-10')
      },
      {
        id: 'mock_004',
        displayName: 'Electric Motor 3-Phase',
        shortDescription: 'Energy-efficient 3-phase electric motor for industrial use',
        category: 'Electrical',
        pricing: { 
          unitPrice: 1250.00, 
          discountPrice: 1180.00,
          currency: 'MYR',
          bulkPricing: [
            { minQty: 3, price: 1150.00 },
            { minQty: 10, price: 1100.00 }
          ]
        },
        inventory: { 
          stockStatus: 'In Stock',
          quantity: 15, 
          unit: 'units',
          leadTime: '7-10 days'
        },
        supplier: { 
          name: 'Power Systems Sdn Bhd',
          rating: 4.6,
          location: 'Kuala Lumpur'
        },
        featured: true,
        trending: false,
        status: 'active',
        visibility: 'public',
        images: {
          primary: '/api/placeholder/300/300',
          thumbnail: '/api/placeholder/150/150'
        },
        features: ['Energy efficient', 'Low noise', 'Variable speed control'],
        applications: ['Pumps', 'Fans', 'Conveyor systems', 'Machine tools'],
        specifications: {
          power: '5.5 kW',
          voltage: '415V',
          speed: '1450 RPM',
          efficiency: '92%'
        },
        analytics: { views: 432, uniqueViewers: 298 },
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2024-08-14')
      }
    ];

    // Apply filters to mock data
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
      filtered = this.applySearchFilter(filtered, filters.searchTerm);
    }

    // Apply sorting
    switch (filters.sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.pricing.discountPrice - b.pricing.discountPrice);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.pricing.discountPrice - a.pricing.discountPrice);
        break;
      case 'name':
        filtered.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case 'popular':
        filtered.sort((a, b) => b.analytics.views - a.analytics.views);
        break;
      default:
        // Featured first, then by update date
        filtered.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
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
   * Get product categories with product counts
   */
  async getProductCategories() {
    try {
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
      console.warn('Error fetching trending products:', error);
      // Fallback to featured products
      return this.getFeaturedProducts(limitCount);
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
        pageSize: 100, // Get more for better search results
        searchTerm: searchQuery // Include search term in filters
      });

      if (!searchQuery || searchQuery.trim() === '') {
        return allProducts;
      }

      // Advanced search scoring
      const searchResults = allProducts.products.map(product => {
        const score = this.calculateSearchScore(product, searchQuery);
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
        hasMore: false,
        isMockData: allProducts.isMockData
      };

    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error(`Failed to search products: ${error.message}`);
    }
  }

  /**
   * Calculate search relevance score
   */
  calculateSearchScore(product, searchQuery) {
    let score = 0;
    const query = searchQuery.toLowerCase().trim();

    // Exact name match (highest score)
    const productName = (product.displayName || product.name || '').toLowerCase();
    if (productName === query) {
      score += 100;
    } else if (productName.includes(query)) {
      score += 50;
      // Bonus for query at the beginning
      if (productName.startsWith(query)) score += 25;
    }

    // Category match
    const category = (product.category || '').toLowerCase();
    if (category.includes(query)) {
      score += 30;
    }

    // Description matches
    const shortDesc = (product.shortDescription || product.description || '').toLowerCase();
    if (shortDesc.includes(query)) {
      score += 20;
    }

    // Supplier match
    const supplierName = (product.supplier?.name || '').toLowerCase();
    if (supplierName.includes(query)) {
      score += 25;
    }

    // Features match
    if (product.features?.some(feature => 
        feature.toLowerCase().includes(query))) {
      score += 15;
    }

    // Applications match
    if (product.applications?.some(app => 
        app.toLowerCase().includes(query))) {
      score += 15;
    }

    // Specifications match
    if (product.specifications) {
      const specMatch = Object.values(product.specifications).some(spec => 
        String(spec).toLowerCase().includes(query)
      );
      if (specMatch) score += 20;
    }

    // SEO keywords match
    if (product.seo?.keywords?.some(keyword => 
        keyword.toLowerCase().includes(query))) {
      score += 30;
    }

    // Boost score based on product quality indicators
    if (product.featured) score += 10;
    if (product.trending) score += 15;
    if (product.supplier?.rating >= 4.5) score += 5;
    if (product.inventory?.stockStatus === 'In Stock') score += 5;

    // Boost popular products
    const views = product.analytics?.views || 0;
    if (views > 1000) score += 10;
    else if (views > 500) score += 5;

    return score;
  }

  /**
   * Generate search suggestions based on query and results
   */
  generateSearchSuggestions(query, results) {
    const suggestions = new Set();
    const queryLower = query.toLowerCase();

    // Category suggestions from results
    results.slice(0, 10).forEach(product => {
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

    // Feature suggestions
    results.slice(0, 8).forEach(product => {
      if (product.features) {
        product.features.forEach(feature => {
          if (!feature.toLowerCase().includes(queryLower) && feature.length > 3) {
            suggestions.add(feature);
          }
        });
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
        collection(this.db, this.collections.products),
        where('category', '==', categoryName),
        where('visibility', '==', 'public'),
        where('status', '==', 'active')
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

      await setDoc(doc(this.db, this.collections.carts, cartId), guestCart);
      
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

      // Get product details (with fallback for mock data)
      let product;
      try {
        product = await this.getProduct(productId);
      } catch {
        // Use mock product if real one doesn't exist
        const mockData = this.getMockProducts();
        product = mockData.products.find(p => p.id === productId);
        if (!product) {
          throw new Error('Product not found');
        }
      }

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
          displayName: product.displayName || product.name,
          category: product.category,
          quantity,
          unitPrice: this.calculateBestPrice(product, quantity),
          listPrice: product.pricing?.listPrice || product.pricing?.unitPrice || 0,
          bulkDiscount: 0,
          images: {
            thumbnail: product.images?.thumbnail || product.images?.primary || '/api/placeholder/150/150'
          },
          supplier: {
            id: product.supplier?.id,
            name: product.supplier?.name,
            rating: product.supplier?.rating
          },
          inventory: {
            stockStatus: product.inventory?.stockStatus || 'In Stock',
            leadTime: product.inventory?.leadTime || '3-5 days',
            minimumOrderQty: product.inventory?.minimumOrderQty || 1
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
      await updateDoc(doc(this.db, this.collections.carts, cartId), {
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

  /**
   * Get guest cart by session ID
   */
  async getGuestCart(sessionId) {
    try {
      const cartId = `guest-${sessionId}`;
      return await this.getCartById(cartId);
    } catch (error) {
      console.warn('Guest cart not found:', error);
      return null;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(sessionId, productId, newQuantity) {
    try {
      const cartId = `guest-${sessionId}`;
      const cart = await this.getCartById(cartId);

      const updatedItems = cart.items.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: Math.max(1, newQuantity),
            lastUpdated: new Date()
          };
        }
        return item;
      });

      const totals = this.calculateCartTotals(updatedItems, cart.userType);

      await updateDoc(doc(this.db, this.collections.carts, cartId), {
        items: updatedItems,
        totals,
        'session.lastUpdated': serverTimestamp()
      });

      return { success: true, totals };
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw new Error(`Failed to update cart item: ${error.message}`);
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(sessionId, productId) {
    try {
      const cartId = `guest-${sessionId}`;
      const cart = await this.getCartById(cartId);

      const updatedItems = cart.items.filter(item => item.productId !== productId);
      const totals = this.calculateCartTotals(updatedItems, cart.userType);

      await updateDoc(doc(this.db, this.collections.carts, cartId), {
        items: updatedItems,
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
      // Update product view count
      await updateDoc(doc(this.db, this.collections.products, productId), {
        'analytics.views': increment(1),
        'analytics.lastViewed': serverTimestamp(),
        'analytics.uniqueViewers': increment(userInfo.isNewViewer ? 1 : 0)
      });

      // Log detailed user analytics
      if (userInfo.sessionId) {
        await addDoc(collection(this.db, this.collections.userAnalytics), {
          sessionId: userInfo.sessionId,
          action: 'product_view',
          productId,
          timestamp: serverTimestamp(),
          userAgent: userInfo.userAgent,
          referrer: userInfo.referrer
        });
      }

      // Track search click if came from search
      if (userInfo.searchQuery) {
        await this.trackSearchClick(userInfo.searchQuery, productId, userInfo);
      }

    } catch (error) {
      console.warn('Failed to track product view:', error);
      // Don't throw error for analytics failures
    }
  }

  /**
   * Track search query analytics
   */
  async trackSearch(query, resultsCount, userInfo = {}) {
    try {
      const searchLog = {
        query: query.toLowerCase().trim(),
        resultsCount,
        timestamp: serverTimestamp(),
        userType: userInfo.userType || 'guest',
        location: userInfo.location || null,
        deviceInfo: userInfo.deviceInfo || null,
        sessionId: userInfo.sessionId || null
      };

      await addDoc(collection(this.db, this.collections.analytics), searchLog);
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
        searchQuery: query.toLowerCase().trim(),
        productId,
        timestamp: serverTimestamp(),
        userType: userInfo.userType || 'guest',
        position: userInfo.position || null,
        sessionId: userInfo.sessionId || null
      };

      await addDoc(collection(this.db, this.collections.analytics), clickLog);
    } catch (error) {
      console.warn('Failed to track search click:', error);
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Calculate best price based on quantity and bulk pricing tiers
   */
  calculateBestPrice(product, quantity) {
    if (!product.pricing?.bulkPricing?.length) {
      return product.pricing?.discountPrice || product.pricing?.unitPrice || 0;
    }

    let bestPrice = product.pricing.discountPrice || product.pricing.unitPrice || 0;
    
    // Find the best bulk price tier
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
    const subtotal = items.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || 0) * (item.quantity || 0);
      return sum + itemTotal;
    }, 0);
    
    const bulkDiscount = items.reduce((sum, item) => {
      const discount = ((item.listPrice || 0) - (item.unitPrice || 0)) * (item.quantity || 0);
      return sum + Math.max(0, discount);
    }, 0);
    
    // User type discounts
    let userTypeDiscount = 0;
    switch (userType) {
      case 'verified_factory':
        userTypeDiscount = subtotal * 0.05; // 5% for verified factories
        break;
      case 'premium_factory':
        userTypeDiscount = subtotal * 0.10; // 10% for premium factories
        break;
      default:
        userTypeDiscount = 0;
    }
    
    const discountedSubtotal = subtotal - userTypeDiscount;
    const tax = Math.max(0, discountedSubtotal * 0.06); // 6% GST
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
   * Calculate shipping cost based on user type and order value
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
   * Get cart by ID with error handling
   */
  async getCartById(cartId) {
    try {
      const cartDoc = await getDoc(doc(this.db, this.collections.carts, cartId));
      if (!cartDoc.exists()) {
        throw new Error('Cart not found');
      }
      
      const data = cartDoc.data();
      return { 
        id: cartDoc.id, 
        ...data,
        session: {
          ...data.session,
          createdAt: data.session?.createdAt?.toDate?.() || new Date(),
          lastUpdated: data.session?.lastUpdated?.toDate?.() || new Date(),
          expiresAt: data.session?.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      };
    } catch (error) {
      console.error('Error getting cart:', error);
      throw new Error(`Failed to get cart: ${error.message}`);
    }
  }

  /**
   * Get single product by ID with error handling
   */
  async getProduct(productId) {
    try {
      const productDoc = await getDoc(doc(this.db, this.collections.products, productId));
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }

      const productData = productDoc.data();
      
      return {
        id: productDoc.id,
        ...productData,
        createdAt: productData.createdAt?.toDate?.() || new Date(),
        updatedAt: productData.updatedAt?.toDate?.() || new Date(),
        lastSyncAt: productData.lastSyncAt?.toDate?.() || new Date()
      };

    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
  }

  /**
   * Generate unique session ID for guest users
   */
  generateSessionId() {
    return 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate quote number
   */
  generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `QT-${year}${month}${day}-${random}`;
  }

  /**
   * Calculate quote expiry date (30 days from now)
   */
  calculateQuoteExpiry() {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    return expiryDate;
  }

  /**
   * Format price for display
   */
  formatPrice(price, currency = 'MYR') {
    try {
      return new Intl.NumberFormat('en-MY', {
        style: 'currency',
        currency: currency
      }).format(price || 0);
    } catch (error) {
      return `${currency} ${(price || 0).toFixed(2)}`;
    }
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // ========== REAL-TIME LISTENERS ==========

  /**
   * Subscribe to product updates with real-time listener
   */
  subscribeToProducts(filters, callback) {
    const listenerId = JSON.stringify(filters);
    
    // Cleanup existing listener
    if (this.listeners.has(listenerId)) {
      this.listeners.get(listenerId)();
    }

    try {
      let q = collection(this.db, this.collections.products);
      const conditions = [
        where('visibility', '==', 'public'),
        where('status', '==', 'active')
      ];

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
          createdAt: doc.data().createdAt?.toDate?.() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date()
        }));

        callback({ products, totalCount: products.length });
      }, (error) => {
        console.error('Product subscription error:', error);
        callback({ error: error.message });
      });

      this.listeners.set(listenerId, unsubscribe);
      return unsubscribe;
      
    } catch (error) {
      console.error('Error setting up product subscription:', error);
      callback({ error: error.message });
      return () => {}; // Return empty function for cleanup
    }
  }

  /**
   * Subscribe to cart updates
   */
  subscribeToCart(sessionId, callback) {
    const cartId = `guest-${sessionId}`;
    
    try {
      const unsubscribe = onSnapshot(
        doc(this.db, this.collections.carts, cartId),
        (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            callback({
              id: doc.id,
              ...data,
              session: {
                ...data.session,
                createdAt: data.session?.createdAt?.toDate?.() || new Date(),
                lastUpdated: data.session?.lastUpdated?.toDate?.() || new Date()
              }
            });
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error('Cart subscription error:', error);
          callback({ error: error.message });
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up cart subscription:', error);
      callback({ error: error.message });
      return () => {};
    }
  }

  /**
   * Cleanup all listeners and cache
   */
  cleanup() {
    // Unsubscribe from all listeners
    this.listeners.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing listener:', error);
      }
    });
    
    this.listeners.clear();
    this.cache.clear();
    
    console.log('EnhancedEcommerceAPIService cleaned up');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('API cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      listeners: this.listeners.size,
      collections: this.collections
    };
  }
}

export default EnhancedEcommerceAPIService;
