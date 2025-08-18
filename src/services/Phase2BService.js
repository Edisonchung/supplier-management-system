// Create new file: src/services/Phase2BService.js

import { 
  productsService, 
  analyticsService, 
  factoriesService, 
  quotesService 
} from './firestore/index';

class Phase2BService {
  constructor() {
    this.products = productsService;
    this.analytics = analyticsService;
    this.factories = factoriesService;
    this.quotes = quotesService;
    
    console.log('📊 Phase 2B Service initialized');
  }

  // ========== SMART CATALOG METHODS ==========
  
  async getSmartCatalogProducts(options = {}) {
    return this.products.getPublicProducts(options);
  }

  async searchProducts(query, options = {}) {
    return this.products.searchProducts(query, options);
  }

  async getFeaturedProducts(limit = 10) {
    return this.products.getFeaturedProducts(limit);
  }

  async trackProductView(productId, additionalData = {}) {
    // Track in analytics
    await this.analytics.trackInteraction({
      eventType: 'product_view',
      productId,
      ...additionalData
    });

    // Update product view count
    await this.products.trackProductView(productId);
  }

  // ========== FACTORY MANAGEMENT ==========
  
  async identifyFactory(email) {
    return this.factories.getFactoryByEmail(email);
  }

  async registerFactory(factoryData) {
    const factory = await this.factories.registerFactory(factoryData);
    
    // Track registration
    await this.analytics.trackInteraction({
      eventType: 'factory_registration',
      factoryId: factory.id,
      factoryName: factoryData.companyName,
      industry: factoryData.industry
    });

    return factory;
  }

  // ========== QUOTE MANAGEMENT ==========
  
  async createQuoteRequest(quoteData) {
    const quote = await this.quotes.createQuoteRequest(quoteData);
    
    // Track quote request
    await this.analytics.trackInteraction({
      eventType: 'quote_request',
      quoteId: quote.id,
      factoryId: quoteData.factoryId,
      totalValue: quoteData.totalValue
    });

    return quote;
  }

  // ========== ANALYTICS ==========
  
  async trackInteraction(data) {
    return this.analytics.trackInteraction(data);
  }

  async getAnalytics(timeRange = '24h') {
    return this.analytics.getAnalytics(timeRange);
  }

  subscribeToRealTimeMetrics(callback, timeRange = '5m') {
    return this.analytics.subscribeToRealTimeMetrics(callback, timeRange);
  }

  // ========== INITIALIZATION ==========
  
  async initializePhase2B() {
    console.log('🚀 Initializing Phase 2B with sample data...');
    
    try {
      // Check if we already have products
      const existingProducts = await this.products.getPublicProducts({ limit: 1 });
      if (existingProducts.length > 0) {
        console.log('✅ Phase 2B data already exists');
        return { success: true, message: 'Already initialized' };
      }

      // Create sample products
      await this.createSampleProducts();
      
      console.log('✅ Phase 2B initialization completed');
      return { success: true, message: 'Initialization completed successfully' };
      
    } catch (error) {
      console.error('❌ Phase 2B initialization failed:', error);
      throw error;
    }
  }

  async createSampleProducts() {
    const sampleProducts = [
      {
        name: 'Industrial Ball Bearing SKF 6205-2RS',
        category: 'Mechanical Components',
        sku: 'SKF-6205-2RS',
        price: 45.50,
        stock: 250,
        featured: true,
        visibility: 'public',
        description: 'High-quality sealed ball bearing for industrial applications',
        supplier: { name: 'SKF Malaysia', location: 'Shah Alam' },
        tags: ['Featured', 'High Stock', 'Mechanical Components']
      },
      {
        name: 'Schneider Electric Contactor LC1D18M7',
        category: 'Electrical Components',
        sku: 'SE-LC1D18M7',
        price: 89.90,
        stock: 150,
        featured: true,
        visibility: 'public',
        description: 'TeSys D contactor for industrial control systems',
        supplier: { name: 'Schneider Electric Malaysia', location: 'Petaling Jaya' },
        tags: ['Featured', 'High Stock', 'Electrical Components']
      },
      {
        name: 'Safety Helmet with Chin Strap',
        category: 'Safety Equipment',
        sku: 'SH-WH-001',
        price: 25.00,
        stock: 500,
        featured: false,
        visibility: 'public',
        description: 'SIRIM approved safety helmet for construction',
        supplier: { name: 'Safety First Industries', location: 'Johor Bahru' },
        tags: ['High Stock', 'Safety Equipment', 'Certified']
      }
    ];

    for (const product of sampleProducts) {
      await this.products.create({
        ...product,
        viewCount: Math.floor(Math.random() * 50),
        minStock: 10,
        searchPriority: this.products.calculateSearchPriority(product)
      });
    }

    console.log(`✅ Created ${sampleProducts.length} sample products`);
  }

  // ========== UTILITY METHODS ==========
  
  async getDataCounts() {
    try {
      const [products, analytics, factories, quotes] = await Promise.all([
        this.products.getPublicProducts({ limit: 1000 }),
        this.analytics.getAnalytics('30d'),
        this.factories.getFactoriesByStatus('active'),
        this.quotes.getRecentQuotes(1000)
      ]);

      return {
        products: products.length,
        analytics: analytics.length,
        factories: factories.length,
        quotes: quotes.length
      };
    } catch (error) {
      console.error('Error getting data counts:', error);
      return { products: 0, analytics: 0, factories: 0, quotes: 0 };
    }
  }
}

// Export singleton instance
export const phase2BService = new Phase2BService();
export default Phase2BService;
