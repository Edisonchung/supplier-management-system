// Create new file: src/services/firestore/quotes.service.js

import { BaseFirestoreService } from './baseService';
import { where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

class QuotesService extends BaseFirestoreService {
  constructor() {
    super('quote_requests');
  }

  // Create quote request
  async createQuoteRequest(quoteData) {
    const enhancedQuote = {
      ...quoteData,
      createdAt: serverTimestamp(),
      status: 'pending',
      priority: this.calculateQuotePriority(quoteData),
      quoteNumber: this.generateQuoteNumber(),
      analytics: {
        responseTime: null,
        viewCount: 0,
        source: 'smart_catalog'
      }
    };

    return this.create(enhancedQuote);
  }

  // Get quotes by factory
  async getQuotesByFactory(factoryId) {
    return this.getAll([
      where('factoryId', '==', factoryId),
      orderBy('createdAt', 'desc')
    ]);
  }

  // Get quotes by status
  async getQuotesByStatus(status) {
    return this.getAll([
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    ]);
  }

  // Get recent quotes
  async getRecentQuotes(limitCount = 20) {
    return this.getAll([
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ]);
  }

  // Helper methods
  calculateQuotePriority(quoteData) {
    const value = quoteData.totalValue || 0;
    const itemCount = quoteData.items?.length || 0;
    
    if (value > 50000 || itemCount > 20) return 'high';
    if (value > 10000 || itemCount > 5) return 'medium';
    return 'low';
  }

  generateQuoteNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `QT-${year}${month}${day}-${random}`;
  }
}

export const quotesService = new QuotesService();
