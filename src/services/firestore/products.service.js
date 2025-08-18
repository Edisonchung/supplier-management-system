import { BaseFirestoreService } from './baseService';
import { where, orderBy } from 'firebase/firestore';

class ProductsService extends BaseFirestoreService {
  constructor() {
    super('products');
  }

  async getProductsBySupplier(supplierId) {
    return this.getAll([
      where('supplierId', '==', supplierId),
      orderBy('name')
    ]);
  }

  async getLowStockProducts() {
    const allProducts = await this.getAll();
    return allProducts.filter(product => product.stock <= product.minStock);
  }

  async updateStock(productId, newStock) {
    return this.update(productId, { stock: newStock });
  }
  // Get products for smart catalog
  async getPublicProducts(options = {}) {
    const constraints = [
      where('visibility', '==', 'public'),
      orderBy('featured', 'desc'),
      orderBy('stock', 'desc')
    ];

    if (options.category && options.category !== 'all') {
      constraints.unshift(where('category', '==', options.category));
    }

    if (options.inStockOnly) {
      constraints.unshift(where('stock', '>', 0));
    }

    if (options.limit) {
      constraints.push(limit(options.limit));
    }

    const products = await this.getAll(constraints);
    
    // Enhance with Phase 2B fields
    return products.map(product => ({
      ...product,
      availability: this.calculateAvailability(product.stock || 0),
      deliveryTime: this.calculateDeliveryTime(product.stock || 0),
      urgency: (product.stock || 0) < 5 ? 'urgent' : 'normal',
      searchPriority: this.calculateSearchPriority(product)
    }));
  }

  // Track product view
  async trackProductView(productId) {
    try {
      await this.update(productId, {
        viewCount: increment(1),
        lastViewed: serverTimestamp()
      });
    } catch (error) {
      console.error('Error tracking product view:', error);
    }
  }

  // Get featured products
  async getFeaturedProducts(limit = 10) {
    return this.getAll([
      where('featured', '==', true),
      where('visibility', '==', 'public'),
      where('stock', '>', 0),
      orderBy('viewCount', 'desc'),
      limit(limit)
    ]);
  }

  // Search products
  async searchProducts(searchQuery, options = {}) {
    // Note: Firestore doesn't support full-text search
    // This is a simplified version - for production, consider Algolia or Elasticsearch
    const allProducts = await this.getPublicProducts(options);
    
    const lowercaseQuery = searchQuery.toLowerCase();
    return allProducts.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.sku.toLowerCase().includes(lowercaseQuery) ||
      product.category.toLowerCase().includes(lowercaseQuery) ||
      (product.tags && product.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery)))
    );
  }

  // Helper methods for Phase 2B
  calculateAvailability(stock) {
    if (stock > 10) return 'In Stock';
    if (stock > 0) return 'Low Stock';
    return 'Out of Stock';
  }

  calculateDeliveryTime(stock) {
    if (stock > 50) return '1-2 business days';
    if (stock > 10) return '3-5 business days';
    if (stock > 0) return '5-7 business days';
    return '2-3 weeks';
  }

  calculateSearchPriority(product) {
    const stock = product.stock || 0;
    const price = product.price || 0;
    const featured = product.featured || false;
    
    if (featured && stock > 50) return 'high';
    if (stock > 20 && price > 100) return 'medium';
    if (stock > 0) return 'low';
    return 'hidden';
  }
}
}

export const productsService = new ProductsService();
