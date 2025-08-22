// src/services/ecommerceDataService.js
// Simple service to read data from products_public (synced by ProductSyncService)

import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';

export class EcommerceDataService {
  /**
   * Get products from products_public collection (transformed by your ProductSyncService)
   * This service just reads - all transformation is handled by ProductSyncService
   */
  static async getPublicProducts(filters = {}) {
    try {
      const {
        category = 'all',
        searchTerm = '',
        sortBy = 'relevance',
        pageSize = 20
      } = filters;

      // Simple query - your ProductSyncService handles all the complex logic
      let constraints = [];

      // Only show public products (set by ProductSyncService)
      constraints.push(where('visibility', '==', 'public'));

      // Category filter  
      if (category && category !== 'all') {
        constraints.push(where('category', '==', category));
      }

      // Simple sorting
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
        default:
          constraints.push(orderBy('updatedAt', 'desc'));
      }

      constraints.push(limit(pageSize));

      const q = query(collection(db, 'products_public'), ...constraints);
      const snapshot = await getDocs(q);
      
      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Simple client-side search if needed
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        products = products.filter(product => 
          product.name?.toLowerCase().includes(searchLower) ||
          product.displayName?.toLowerCase().includes(searchLower) ||
          product.sku?.toLowerCase().includes(searchLower) ||
          product.brand?.toLowerCase().includes(searchLower)
        );
      }

      return {
        products,
        totalCount: products.length,
        hasMore: snapshot.docs.length === pageSize
      };

    } catch (error) {
      console.error('Error loading public products:', error);
      throw new Error(`Failed to load products: ${error.message}`);
    }
  }

  /**
   * Get a single product by ID
   */
  static async getProductById(productId) {
    try {
      const docRef = doc(db, 'products_public', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Product not found');
      }
    } catch (error) {
      console.error('Error loading product:', error);
      throw new Error(`Failed to load product: ${error.message}`);
    }
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(limit = 8) {
    try {
      const q = query(
        collection(db, 'products_public'),
        where('visibility', '==', 'public'),
        where('featured', '==', true),
        orderBy('updatedAt', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('Error loading featured products:', error);
      return [];
    }
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats() {
    try {
      const q = query(
        collection(db, 'products_public'),
        where('visibility', '==', 'public')
      );

      const snapshot = await getDocs(q);
      const categoryStats = {};

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.category) {
          categoryStats[data.category] = (categoryStats[data.category] || 0) + 1;
        }
      });

      return {
        total: snapshot.docs.length,
        categories: categoryStats
      };

    } catch (error) {
      console.error('Error loading category stats:', error);
      return { total: 0, categories: {} };
    }
  }
}

export default EcommerceDataService;
