// src/services/ai/CacheService.js
// Handle all caching logic

import { AI_CONFIG } from './config';

export class CacheService {
  static supplierCache = new Map();
  static productCache = new Map();
  static extractionHistory = [];
  static corrections = new Map();
  static fieldMappingCache = new Map();

  // Supplier caching
  static cacheSupplier(supplier) {
    this.supplierCache.set(supplier.id, supplier);
  }

  static getCachedSupplier(id) {
    return this.supplierCache.get(id);
  }

  static getAllCachedSuppliers() {
    return Array.from(this.supplierCache.values());
  }

  static clearSupplierCache() {
    this.supplierCache.clear();
  }

  // Product caching
  static cacheProduct(product) {
    this.productCache.set(product.id, product);
  }

  static getCachedProduct(id) {
    return this.productCache.get(id);
  }

  static getAllCachedProducts() {
    return Array.from(this.productCache.values());
  }

  static clearProductCache() {
    this.productCache.clear();
  }

  // Extraction history
  static addToHistory(extraction) {
    this.extractionHistory.push({
      id: `extraction-${Date.now()}`,
      timestamp: new Date(),
      ...extraction
    });
    
    // Keep only last N extractions
    if (this.extractionHistory.length > AI_CONFIG.MAX_HISTORY_SIZE) {
      this.extractionHistory = this.extractionHistory.slice(-AI_CONFIG.MAX_HISTORY_SIZE);
    }

    // Persist to localStorage
    this.saveHistoryToStorage();
  }

  static getHistory() {
    return this.extractionHistory;
  }

  static getHistoryItem(id) {
    return this.extractionHistory.find(item => item.id === id);
  }

  static clearHistory() {
    this.extractionHistory = [];
    localStorage.removeItem('aiExtractionHistory');
  }

  // Corrections management
  static saveCorrection(field, originalValue, correctedValue, context = {}) {
    const key = `${field}:${originalValue}`;
    this.corrections.set(key, {
      correctedValue,
      field,
      originalValue,
      learnedAt: new Date().toISOString(),
      context
    });
    
    // Persist to localStorage
    this.saveCorrectionsToStorage();
  }

  static getCorrection(field, value) {
    const key = `${field}:${value}`;
    const correction = this.corrections.get(key);
    return correction ? correction.correctedValue : null;
  }

  static getAllCorrections() {
    return Array.from(this.corrections.entries()).map(([key, value]) => ({
      key,
      ...value
    }));
  }

  // Field mapping cache
  static cacheFieldMapping(documentType, mapping) {
    this.fieldMappingCache.set(documentType, mapping);
  }

  static getCachedFieldMapping(documentType) {
    return this.fieldMappingCache.get(documentType);
  }

  // Persistence methods
  static saveCorrectionsToStorage() {
    try {
      const correctionsObj = Object.fromEntries(this.corrections);
      localStorage.setItem('aiCorrections', JSON.stringify(correctionsObj));
    } catch (error) {
      console.error('Failed to save corrections:', error);
    }
  }

  static loadCorrectionsFromStorage() {
    try {
      const saved = localStorage.getItem('aiCorrections');
      if (saved) {
        const corrections = JSON.parse(saved);
        this.corrections = new Map(Object.entries(corrections));
      }
    } catch (error) {
      console.error('Failed to load corrections:', error);
    }
  }

  static saveHistoryToStorage() {
    try {
      // Only save last 50 items to localStorage
      const recentHistory = this.extractionHistory.slice(-50);
      localStorage.setItem('aiExtractionHistory', JSON.stringify(recentHistory));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  static loadHistoryFromStorage() {
    try {
      const saved = localStorage.getItem('aiExtractionHistory');
      if (saved) {
        this.extractionHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  // Load suppliers and products from localStorage
  static refreshFromLocalStorage() {
    try {
      // Load suppliers
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
      suppliers.forEach(supplier => this.cacheSupplier(supplier));

      // Load products
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      products.forEach(product => this.cacheProduct(product));
    } catch (error) {
      console.error('Failed to refresh cache from localStorage:', error);
    }
  }

  // Initialize cache
  static initialize() {
    this.loadCorrectionsFromStorage();
    this.loadHistoryFromStorage();
    this.refreshFromLocalStorage();
  }

  // Get statistics
  static getStatistics() {
    return {
      suppliersInCache: this.supplierCache.size,
      productsInCache: this.productCache.size,
      extractionsInHistory: this.extractionHistory.length,
      correctionsLearned: this.corrections.size,
      fieldMappingsCached: this.fieldMappingCache.size
    };
  }
}
