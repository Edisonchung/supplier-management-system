// src/services/ai/SupplierMatcher.js
// Intelligent supplier matching service for HiggsFlow

import { fuzzyMatch } from './utils/fuzzyMatch';
import { parseAmount } from './utils/numberParser';
import { CacheService } from './CacheService';

export class SupplierMatcher {
  /**
   * Find matching suppliers for a list of items
   * @param {Array} items - Items from the PO that need supplier matching
   * @param {Object} options - Matching options (filters, preferences)
   * @returns {Promise<Array>} - Matched suppliers with confidence scores
   */
  static async findMatches(items, options = {}) {
    console.log('Starting supplier matching for', items.length, 'items');
    
    try {
      // Get all suppliers from localStorage
      const allSuppliers = this.getAllSuppliers();
      
      // Get all products from localStorage to match with items
      const allProducts = this.getAllProducts();
      
      // Match each item with potential suppliers
      const itemsWithMatches = await Promise.all(
        items.map(item => this.findSuppliersForItem(item, allSuppliers, allProducts, options))
      );
      
      // Aggregate supplier recommendations across all items
      const aggregatedSuppliers = this.aggregateSupplierRecommendations(itemsWithMatches);
      
      // Calculate overall sourcing metrics
      const sourcingMetrics = this.calculateSourcingMetrics(itemsWithMatches, aggregatedSuppliers);
      
      return {
        itemMatches: itemsWithMatches,
        recommendedSuppliers: aggregatedSuppliers.slice(0, 5), // Top 5 suppliers
        metrics: sourcingMetrics
      };
    } catch (error) {
      console.error('Supplier matching error:', error);
      return {
        itemMatches: items.map(item => ({ ...item, supplierMatches: [] })),
        recommendedSuppliers: [],
        metrics: {
          potentialSavings: 0,
          averageLeadTime: 'Unknown',
          supplierDiversity: 0
        }
      };
    }
  }

  /**
   * Find suppliers for a single item
   */
  static async findSuppliersForItem(item, suppliers, products, options) {
    const matches = [];
    
    // Normalize item data for matching
    const normalizedItem = {
      code: (item.productCode || '').toLowerCase().trim(),
      name: (item.productName || item.description || '').toLowerCase().trim(),
      quantity: parseFloat(item.quantity || 0),
      targetPrice: parseFloat(item.unitPrice || 0)
    };
    
    // Search through all products to find matches
    for (const product of products) {
      const matchScore = this.calculateProductMatchScore(normalizedItem, product);
      
      if (matchScore > 0.5) { // Threshold for considering a match
        const supplier = suppliers.find(s => s.id === product.supplierId);
        
        if (supplier && supplier.status === 'active') {
          matches.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            matchScore: matchScore,
            pricing: {
              unitPrice: parseFloat(product.price || 0),
              moq: parseInt(product.moq || 1),
              leadTime: product.leadTime || supplier.leadTime || '2-3 weeks',
              inStock: product.stock >= normalizedItem.quantity
            },
            supplier: {
              rating: supplier.rating || 4,
              location: supplier.country || 'Unknown',
              certifications: supplier.certifications || [],
              paymentTerms: supplier.paymentTerms || '30 days',
              reliability: this.calculateReliability(supplier)
            }
          });
        }
      }
    }
    
    // Sort matches by score and price competitiveness
    const sortedMatches = this.rankSupplierMatches(matches, normalizedItem);
    
    return {
      ...item,
      supplierMatches: sortedMatches.slice(0, 10), // Top 10 matches per item
      bestMatch: sortedMatches[0] || null,
      matchCount: sortedMatches.length
    };
  }

  /**
   * Calculate match score between item and product
   */
  static calculateProductMatchScore(item, product) {
    let score = 0;
    const weights = {
      code: 0.4,
      name: 0.35,
      category: 0.15,
      brand: 0.1
    };
    
    // Match by product code (highest weight)
    if (item.code && product.code) {
      const codeMatch = fuzzyMatch(item.code, product.code.toLowerCase());
      score += codeMatch * weights.code;
    }
    
    // Match by product name/description
    if (item.name && product.name) {
      const nameMatch = fuzzyMatch(item.name, product.name.toLowerCase());
      score += nameMatch * weights.name;
      
      // Bonus for partial matches in description
      if (product.description) {
        const descMatch = this.containsKeywords(item.name, product.description.toLowerCase());
        score += descMatch * 0.1;
      }
    }
    
    // Category matching (if available)
    if (product.category && item.name) {
      const categoryMatch = this.matchCategory(item.name, product.category);
      score += categoryMatch * weights.category;
    }
    
    // Brand matching (if detected in item name)
    if (product.brand && item.name) {
      const brandMatch = item.name.includes(product.brand.toLowerCase()) ? 1 : 0;
      score += brandMatch * weights.brand;
    }
    
    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Check if text contains keywords
   */
  static containsKeywords(searchText, targetText) {
    const keywords = searchText.split(' ').filter(word => word.length > 2);
    const matchedKeywords = keywords.filter(keyword => 
      targetText.includes(keyword)
    );
    return matchedKeywords.length / keywords.length;
  }

  /**
   * Match category intelligently
   */
  static matchCategory(itemName, category) {
    const categoryKeywords = {
      'electronics': ['electronic', 'circuit', 'board', 'chip', 'component', 'lcd', 'led'],
      'mechanical': ['bearing', 'gear', 'motor', 'shaft', 'coupling', 'belt'],
      'electrical': ['cable', 'wire', 'connector', 'switch', 'relay', 'fuse'],
      'raw-material': ['steel', 'aluminum', 'plastic', 'resin', 'sheet', 'bar'],
      'tools': ['tool', 'drill', 'cutter', 'wrench', 'screwdriver'],
      'safety': ['glove', 'helmet', 'goggles', 'mask', 'boots', 'vest'],
      'stationery': ['paper', 'pen', 'folder', 'stapler', 'notebook'],
      'packaging': ['box', 'tape', 'bubble', 'wrap', 'carton', 'pallet']
    };
    
    const categoryLower = category.toLowerCase();
    if (categoryKeywords[categoryLower]) {
      const keywords = categoryKeywords[categoryLower];
      const found = keywords.some(keyword => itemName.includes(keyword));
      return found ? 0.8 : 0.2;
    }
    
    // Direct category name match
    return itemName.includes(categoryLower) ? 0.6 : 0;
  }

  /**
   * Rank supplier matches by multiple factors
   */
  static rankSupplierMatches(matches, item) {
    return matches.map(match => {
      let rankScore = match.matchScore;
      
      // Price competitiveness (compared to target price)
      if (item.targetPrice > 0 && match.pricing.unitPrice > 0) {
        const priceDiff = Math.abs(match.pricing.unitPrice - item.targetPrice) / item.targetPrice;
        const priceScore = Math.max(0, 1 - priceDiff);
        rankScore += priceScore * 0.3;
      }
      
      // Stock availability
      if (match.pricing.inStock) {
        rankScore += 0.2;
      }
      
      // Supplier rating
      const ratingScore = (match.supplier.rating - 1) / 4; // Normalize 1-5 to 0-1
      rankScore += ratingScore * 0.1;
      
      // Reliability score
      rankScore += match.supplier.reliability * 0.1;
      
      return {
        ...match,
        rankScore: rankScore / 1.7 // Normalize to 0-1 range
      };
    }).sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * Calculate supplier reliability score
   */
  static calculateReliability(supplier) {
    let score = 0.5; // Base score
    
    // Account age (longer = more reliable)
    if (supplier.dateAdded || supplier.createdAt) {
      const accountAge = new Date() - new Date(supplier.dateAdded || supplier.createdAt);
      const monthsActive = accountAge / (1000 * 60 * 60 * 24 * 30);
      score += Math.min(monthsActive / 24, 0.2); // Max 0.2 for 2+ years
    }
    
    // Certifications
    if (supplier.certifications && supplier.certifications.length > 0) {
      score += 0.1 * Math.min(supplier.certifications.length / 3, 1);
    }
    
    // Payment terms (more flexible = better)
    if (supplier.paymentTerms) {
      const terms = supplier.paymentTerms.toLowerCase();
      if (terms.includes('60') || terms.includes('90')) score += 0.1;
      else if (terms.includes('45')) score += 0.05;
    }
    
    // Country risk (simplified)
    const lowRiskCountries = ['singapore', 'japan', 'germany', 'usa', 'uk'];
    if (supplier.country && lowRiskCountries.includes(supplier.country.toLowerCase())) {
      score += 0.1;
    }
    
    return Math.min(score, 1);
  }

  /**
   * Aggregate supplier recommendations across all items
   */
  static aggregateSupplierRecommendations(itemsWithMatches) {
    const supplierScores = new Map();
    
    // Aggregate scores for each supplier
    itemsWithMatches.forEach(item => {
      item.supplierMatches.forEach(match => {
        const supplierId = match.supplierId;
        
        if (!supplierScores.has(supplierId)) {
          supplierScores.set(supplierId, {
            supplierId: supplierId,
            supplierName: match.supplierName,
            totalScore: 0,
            itemsCovered: 0,
            averagePrice: 0,
            prices: [],
            leadTimes: [],
            ratings: [],
            matchedProducts: []
          });
        }
        
        const supplier = supplierScores.get(supplierId);
        supplier.totalScore += match.rankScore;
        supplier.itemsCovered += 1;
        supplier.prices.push(match.pricing.unitPrice * item.quantity);
        supplier.leadTimes.push(match.pricing.leadTime);
        supplier.ratings.push(match.supplier.rating);
        supplier.matchedProducts.push({
          itemName: item.productName,
          matchScore: match.matchScore
        });
      });
    });
    
    // Calculate final scores and metrics
    const recommendations = Array.from(supplierScores.values()).map(supplier => {
      const itemCoverage = supplier.itemsCovered / itemsWithMatches.length;
      const avgRating = supplier.ratings.reduce((a, b) => a + b, 0) / supplier.ratings.length;
      const totalPrice = supplier.prices.reduce((a, b) => a + b, 0);
      
      return {
        ...supplier,
        itemCoverage: itemCoverage,
        itemCoveragePercent: Math.round(itemCoverage * 100),
        averageRating: avgRating,
        totalPrice: totalPrice,
        averageLeadTime: this.calculateAverageLeadTime(supplier.leadTimes),
        recommendationScore: (supplier.totalScore / supplier.itemsCovered) * itemCoverage
      };
    });
    
    // Sort by recommendation score
    return recommendations.sort((a, b) => b.recommendationScore - a.recommendationScore);
  }

  /**
   * Calculate average lead time from array of lead time strings
   */
  static calculateAverageLeadTime(leadTimes) {
    if (!leadTimes.length) return 'Unknown';
    
    const daysList = leadTimes.map(lt => {
      const match = lt.match(/(\d+)/);
      return match ? parseInt(match[1]) : 14; // Default 2 weeks
    });
    
    const avgDays = Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length);
    
    if (avgDays < 7) return `${avgDays} days`;
    if (avgDays < 30) return `${Math.round(avgDays / 7)} weeks`;
    return `${Math.round(avgDays / 30)} months`;
  }

  /**
   * Calculate overall sourcing metrics
   */
  static calculateSourcingMetrics(itemsWithMatches, aggregatedSuppliers) {
    // Calculate potential savings (comparing best prices vs target prices)
    let totalTargetCost = 0;
    let totalBestCost = 0;
    
    itemsWithMatches.forEach(item => {
      const targetCost = item.unitPrice * item.quantity;
      totalTargetCost += targetCost;
      
      if (item.bestMatch) {
        const bestCost = item.bestMatch.pricing.unitPrice * item.quantity;
        totalBestCost += bestCost;
      } else {
        totalBestCost += targetCost; // No savings if no match
      }
    });
    
    const savings = totalTargetCost - totalBestCost;
    const savingsPercent = totalTargetCost > 0 ? (savings / totalTargetCost) * 100 : 0;
    
    // Average lead time from top suppliers
    const topSuppliers = aggregatedSuppliers.slice(0, 3);
    const avgLeadTime = topSuppliers.length > 0
      ? topSuppliers[0].averageLeadTime
      : 'Unknown';
    
    return {
      potentialSavings: Math.max(0, savings),
      potentialSavingsPercent: Math.max(0, savingsPercent),
      totalTargetCost: totalTargetCost,
      totalBestCost: totalBestCost,
      averageLeadTime: avgLeadTime,
      supplierDiversity: aggregatedSuppliers.length,
      itemsWithMatches: itemsWithMatches.filter(item => item.matchCount > 0).length,
      itemsWithoutMatches: itemsWithMatches.filter(item => item.matchCount === 0).length,
      averageMatchesPerItem: itemsWithMatches.reduce((sum, item) => sum + item.matchCount, 0) / itemsWithMatches.length
    };
  }

  /**
   * Get all suppliers from localStorage
   */
  static getAllSuppliers() {
    try {
      const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
      return suppliers.filter(s => s && s.id && s.name); // Filter out invalid entries
    } catch (error) {
      console.error('Error loading suppliers:', error);
      return [];
    }
  }

  /**
   * Get all products from localStorage
   */
  static getAllProducts() {
    try {
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      return products.filter(p => p && p.id && p.name); // Filter out invalid entries
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    }
  }

  /**
   * Save supplier preference for an item
   */
  static async saveSupplierPreference(itemId, supplierId, reason) {
    const key = `pref_${itemId}_${supplierId}`;
    CacheService.cacheRelationship(itemId, supplierId, {
      type: 'preferred_supplier',
      reason: reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get historical matching data for learning
   */
  static getMatchingHistory() {
    return CacheService.extractionHistory.filter(entry => 
      entry.type === 'supplier_match' && entry.success
    );
  }
}
