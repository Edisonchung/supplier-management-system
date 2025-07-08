// src/services/ai/CacheService.js
// Handle all caching logic
import { safeEquals } from './utils/safeString';
import { AI_CONFIG } from './config';

export class CacheService {
  static supplierCache = new Map();
  static productCache = new Map();
  static extractionHistory = [];
  static corrections = new Map();
  static fieldMappingCache = new Map();
  static extractionCache = new Map(); // General cache for extraction results

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

  // General cache methods for extraction results
  static get(key) {
    const cached = this.extractionCache.get(key);
    if (!cached) return null;
    
    // Check if expired (if expiry is set)
    if (cached.expiry && Date.now() > cached.expiry) {
      this.extractionCache.delete(key);
      return null;
    }
    
    return cached.value;
  }

  static set(key, value, ttl = 3600000) { // 1 hour default
    this.extractionCache.set(key, {
      value: value,
      timestamp: Date.now(),
      expiry: ttl ? Date.now() + ttl : null
    });
    
    // Limit cache size to prevent memory issues
    if (this.extractionCache.size > 100) {
      // Remove oldest entries
      const firstKey = this.extractionCache.keys().next().value;
      this.extractionCache.delete(firstKey);
    }
  }

  static clearExtractionCache() {
    this.extractionCache.clear();
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
      // Filter out invalid suppliers before caching
      const validSuppliers = suppliers.filter(s => s && s.id && s.name);
      validSuppliers.forEach(supplier => this.cacheSupplier(supplier));

      // Load products
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      // Filter out invalid products before caching
      const validProducts = products.filter(p => p && p.id && p.name);
      validProducts.forEach(product => this.cacheProduct(product));
    } catch (error) {
      console.error('Failed to refresh cache from localStorage:', error);
    }
  }

  // Initialize cache
  static initialize() {
    this.loadCorrectionsFromStorage();
    this.loadHistoryFromStorage();
    this.refreshFromLocalStorage();
    this.extractionCache = new Map(); // Initialize extraction cache
  }

  // Get statistics
  static getStatistics() {
    return {
      suppliersInCache: this.supplierCache.size,
      productsInCache: this.productCache.size,
      extractionsInHistory: this.extractionHistory.length,
      correctionsLearned: this.corrections.size,
      fieldMappingsCached: this.fieldMappingCache.size,
      extractionsCached: this.extractionCache.size
    };
  }

  // Helper method to check if a relationship exists
  static cacheRelationship(key1, key2, relationship) {
    const cacheKey = `rel_${key1}_${key2}`;
    this.fieldMappingCache.set(cacheKey, {
      relationship,
      timestamp: Date.now()
    });
  }

  static getCachedRelationship(key1, key2) {
    const cacheKey = `rel_${key1}_${key2}`;
    const cached = this.fieldMappingCache.get(cacheKey);
    return cached ? cached.relationship : null;
  }
}
