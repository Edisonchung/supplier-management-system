// src/services/ai/SupplierMatcher.js
// Enhanced version building on your existing logic

import { fuzzyMatch } from './utils/fuzzyMatch';
import { parseAmount } from './utils/numberParser';
import { CacheService } from './CacheService';

export class SupplierMatcher {
  
  // ENHANCED: Add synonym dictionary to your existing matcher
  static synonymDict = {
    // Electronic components
    'fuse': ['fuses', 'sitor', 'protection', 'circuit breaker'],
    'resistor': ['resistance', 'ohm', 'fixed resistor'],
    'capacitor': ['cap', 'condenser', 'electrolytic'],
    'connector': ['plug', 'socket', 'terminal'],
    'cable': ['wire', 'cord', 'harness'],
    'relay': ['contactor', 'switch relay'],
    'bearing': ['ball bearing', 'roller bearing'],
    'bolt': ['screw', 'fastener', 'hex bolt'],
    'seal': ['gasket', 'o-ring', 'sealing'],
    // Add more as needed
  };

  // ENHANCED: User selection history for learning
  static selectionHistory = JSON.parse(localStorage.getItem('supplierSelectionHistory') || '[]');

  /**
   * ENHANCED: Your existing findMatches method with AI improvements
   */
  static async findMatches(items, options = {}) {
    console.log('🔍 Starting enhanced supplier matching for', items.length, 'items');
    
    try {
      const allSuppliers = this.getAllSuppliers();
      const allProducts = this.getAllProducts();
      
      // ENHANCED: Pre-process products for better matching
      const processedProducts = this.preprocessProducts(allProducts);
      
      // ENHANCED: Use your existing logic but with enhanced matching
      const itemsWithMatches = await Promise.all(
        items.map(item => this.findSuppliersForItemEnhanced(item, allSuppliers, processedProducts, options))
      );
      
      // ENHANCED: Apply learning from user history
      const learnedMatches = this.applyLearning(itemsWithMatches);
      
      // Keep your existing aggregation and metrics logic
      const aggregatedSuppliers = this.aggregateSupplierRecommendations(learnedMatches);
      const sourcingMetrics = this.calculateSourcingMetrics(learnedMatches, aggregatedSuppliers);
      
      // ENHANCED: Add new metrics to your existing ones
      const enhancedMetrics = {
        ...sourcingMetrics,
        matchRate: this.calculateMatchRate(learnedMatches),
        improvements: this.getImprovementMetrics(learnedMatches)
      };
      
      console.log('✅ Enhanced matching complete. Match rate:', enhancedMetrics.matchRate + '%');
      
      return {
        itemMatches: learnedMatches,
        recommendedSuppliers: aggregatedSuppliers.slice(0, 5),
        metrics: enhancedMetrics
      };
      
    } catch (error) {
      console.error('❌ Enhanced supplier matching error:', error);
      return {
        itemMatches: items.map(item => ({ ...item, supplierMatches: [] })),
        recommendedSuppliers: [],
        metrics: {
          potentialSavings: 0,
          averageLeadTime: 'Unknown',
          supplierDiversity: 0,
          matchRate: 0
        }
      };
    }
  }

  /**
   * ENHANCED: New preprocessing step for better matching
   */
  static preprocessProducts(products) {
    return products.map(product => {
      const processed = { ...product };
      
      // Normalize product name
      processed.normalizedName = this.normalizeProductName(product.name || '');
      
      // Generate synonyms
      processed.synonyms = this.generateSynonyms(product.name || '');
      
      // Detect category if not present
      if (!processed.category) {
        processed.detectedCategory = this.detectCategoryFromName(product.name || '');
      }
      
      return processed;
    });
  }

  /**
   * ENHANCED: Enhanced version of your findSuppliersForItem method
   */
  static async findSuppliersForItemEnhanced(item, suppliers, processedProducts, options) {
    const matches = [];
    
    // Keep your existing normalization logic
    const normalizedItem = {
      code: (item.productCode || '').toLowerCase().trim(),
      name: (item.productName || item.description || '').toLowerCase().trim(),
      quantity: parseFloat(item.quantity || 0),
      targetPrice: parseFloat(item.unitPrice || 0)
    };

    // ENHANCED: Multi-strategy matching
    for (const product of processedProducts) {
      let matchScore = 0;
      let matchType = 'standard';
      
      // Strategy 1: Your existing calculateProductMatchScore
      const standardScore = this.calculateProductMatchScore(normalizedItem, product);
      
      // Strategy 2: ENHANCED - Synonym matching
      const synonymScore = this.calculateSynonymMatchScore(normalizedItem, product);
      
      // Strategy 3: ENHANCED - Improved fuzzy matching
      const enhancedFuzzyScore = this.calculateEnhancedFuzzyScore(normalizedItem, product);
      
      // Take the best score and record the match type
      if (synonymScore > standardScore && synonymScore > enhancedFuzzyScore) {
        matchScore = synonymScore;
        matchType = 'synonym_match';
      } else if (enhancedFuzzyScore > standardScore) {
        matchScore = enhancedFuzzyScore;
        matchType = 'fuzzy_enhanced';
      } else {
        matchScore = standardScore;
        matchType = standardScore > 0.8 ? 'exact_match' : 'standard';
      }
      
      // ENHANCED: Lower threshold for better recall
      if (matchScore > 0.4) { // Reduced from your 0.5 threshold
        const supplier = suppliers.find(s => s.id === product.supplierId);
        
        if (supplier && supplier.status === 'active') {
          const match = this.createEnhancedMatch(item, product, supplier, matchScore, matchType);
          matches.push(match);
        }
      }
    }
    
    // Keep your existing ranking logic but enhance it
    const rankedMatches = this.rankSupplierMatchesEnhanced(matches, normalizedItem);
    
    return {
      ...item,
      supplierMatches: rankedMatches.slice(0, 10),
      bestMatch: rankedMatches[0] || null,
      matchCount: rankedMatches.length,
      // ENHANCED: Add match strategy info
      matchStrategy: rankedMatches.length > 0 ? rankedMatches[0].matchType : 'no_match'
    };
  }

  /**
   * ENHANCED: New synonym matching capability
   */
  static calculateSynonymMatchScore(item, product) {
    const itemSynonyms = this.generateSynonyms(item.name);
    const productSynonyms = product.synonyms || [];
    
    let bestScore = 0;
    
    // Test item synonyms against product name and synonyms
    itemSynonyms.forEach(itemSyn => {
      // Against product name
      const nameScore = fuzzyMatch(itemSyn, product.normalizedName || product.name.toLowerCase());
      if (nameScore > bestScore) bestScore = nameScore;
      
      // Against product synonyms
      productSynonyms.forEach(prodSyn => {
        const synScore = fuzzyMatch(itemSyn, prodSyn);
        if (synScore > bestScore) bestScore = synScore;
      });
    });
    
    return bestScore;
  }

  /**
   * ENHANCED: Improved fuzzy matching with better normalization
   */
  static calculateEnhancedFuzzyScore(item, product) {
    const normalizedItemName = this.normalizeProductName(item.name);
    const normalizedProductName = product.normalizedName || this.normalizeProductName(product.name);
    
    if (!normalizedItemName || !normalizedProductName) return 0;
    
    // Multiple fuzzy match strategies
    const directMatch = fuzzyMatch(normalizedItemName, normalizedProductName);
    
    // Keyword extraction and matching
    const itemKeywords = this.extractKeywords(normalizedItemName);
    const productKeywords = this.extractKeywords(normalizedProductName);
    const keywordMatch = this.calculateKeywordOverlap(itemKeywords, productKeywords);
    
    // Return the best score
    return Math.max(directMatch, keywordMatch * 0.8);
  }

  /**
   * ENHANCED: Create match with enhanced metadata
   */
  static createEnhancedMatch(item, product, supplier, matchScore, matchType) {
    // Keep your existing match structure but add enhancements
    const unitPrice = parseFloat(product.price || 0);
    const targetPrice = parseFloat(item.unitPrice || 0);
    const savings = targetPrice > 0 ? ((targetPrice - unitPrice) / targetPrice * 100) : 0;
    
    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      matchScore: matchScore,
      // ENHANCED: Add new fields
      matchType: matchType,
      confidence: Math.round(matchScore * 100),
      savings: Math.round(savings * 100) / 100,
      
      pricing: {
        unitPrice: unitPrice,
        moq: parseInt(product.moq || 1),
        leadTime: product.leadTime || supplier.leadTime || '2-3 weeks',
        inStock: product.stock >= parseFloat(item.quantity || 0)
      },
      supplier: {
        rating: supplier.rating || 4,
        location: supplier.country || 'Unknown',
        certifications: supplier.certifications || [],
        paymentTerms: supplier.paymentTerms || '30 days',
        reliability: this.calculateReliability(supplier)
      }
    };
  }

  /**
   * ENHANCED: Enhanced ranking with new factors
   */
  static rankSupplierMatchesEnhanced(matches, item) {
    return matches.map(match => {
      let rankScore = match.matchScore;
      
      // Keep your existing price competitiveness logic
      if (item.targetPrice > 0 && match.pricing.unitPrice > 0) {
        const priceDiff = Math.abs(match.pricing.unitPrice - item.targetPrice) / item.targetPrice;
        const priceScore = Math.max(0, 1 - priceDiff);
        rankScore += priceScore * 0.3;
      }
      
      // Keep your existing stock and rating logic
      if (match.pricing.inStock) rankScore += 0.2;
      const ratingScore = (match.supplier.rating - 1) / 4;
      rankScore += ratingScore * 0.1;
      rankScore += match.supplier.reliability * 0.1;
      
      // ENHANCED: Bonus for certain match types
      if (match.matchType === 'exact_match') rankScore += 0.1;
      if (match.matchType === 'synonym_match') rankScore += 0.05;
      
      return {
        ...match,
        rankScore: rankScore / 1.8 // Normalize
      };
    }).sort((a, b) => b.rankScore - a.rankScore);
  }

  /**
   * ENHANCED: Apply machine learning from user selections
   */
  static applyLearning(itemsWithMatches) {
    return itemsWithMatches.map(item => {
      if (!item.supplierMatches || item.supplierMatches.length === 0) return item;
      
      // Find historical selections for similar items
      const historicalSelections = this.findHistoricalSelections(item);
      
      if (historicalSelections.length > 0) {
        // Boost confidence of previously selected suppliers
        item.supplierMatches = item.supplierMatches.map(match => {
          const historicalBoost = historicalSelections.find(h => 
            h.supplierId === match.supplierId
          );
          
          if (historicalBoost) {
            return {
              ...match,
              confidence: Math.min(100, match.confidence + 10),
              isLearned: true,
              learningNote: `Previously selected ${historicalBoost.count} times`
            };
          }
          
          return match;
        });
        
        // Re-sort by confidence
        item.supplierMatches.sort((a, b) => b.confidence - a.confidence);
      }
      
      return item;
    });
  }

  /**
   * ENHANCED: New utility methods
   */
  static normalizeProductName(name) {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b(pcs?|pieces?|each|ea|sets?|kits?)\b/g, '')
      .replace(/\b\d+\s*(mm|cm|m|kg|g|a|v|w)\b/g, '')
      .trim();
  }

  static extractKeywords(text) {
    return text.split(' ')
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'for', 'with', 'type'].includes(word));
  }

  static calculateKeywordOverlap(keywords1, keywords2) {
    if (keywords1.length === 0 || keywords2.length === 0) return 0;
    
    const overlap = keywords1.filter(k1 => 
      keywords2.some(k2 => fuzzyMatch(k1, k2) > 0.8)
    ).length;
    
    return overlap / Math.max(keywords1.length, keywords2.length);
  }

  static generateSynonyms(name) {
    const normalized = this.normalizeProductName(name);
    const words = normalized.split(' ');
    const synonyms = new Set([normalized]);
    
    words.forEach(word => {
      if (this.synonymDict[word]) {
        this.synonymDict[word].forEach(synonym => {
          const synonymPhrase = normalized.replace(
            new RegExp(`\\b${word}\\b`, 'g'), 
            synonym
          );
          synonyms.add(synonymPhrase);
        });
      }
    });
    
    return Array.from(synonyms);
  }

  static detectCategoryFromName(name) {
    const categoryPatterns = {
      'electrical': ['fuse', 'resistor', 'capacitor', 'cable', 'wire', 'relay'],
      'mechanical': ['bearing', 'seal', 'bolt', 'screw', 'spring', 'gasket'],
      'electronics': ['circuit', 'board', 'chip', 'component', 'lcd', 'led']
    };
    
    const normalized = name.toLowerCase();
    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      if (patterns.some(pattern => normalized.includes(pattern))) {
        return category;
      }
    }
    return null;
  }

  static calculateMatchRate(itemsWithMatches) {
    const itemsWithSuppliers = itemsWithMatches.filter(item => 
      item.supplierMatches && item.supplierMatches.length > 0
    );
    return Math.round((itemsWithSuppliers.length / itemsWithMatches.length) * 100);
  }

  static getImprovementMetrics(itemsWithMatches) {
    const synonymMatches = itemsWithMatches.filter(item =>
      item.supplierMatches && 
      item.supplierMatches.some(match => match.matchType === 'synonym_match')
    ).length;

    const learnedMatches = itemsWithMatches.filter(item =>
      item.supplierMatches && 
      item.supplierMatches.some(match => match.isLearned)
    ).length;

    const highConfidenceMatches = itemsWithMatches.filter(item => 
      item.supplierMatches && 
      item.supplierMatches.length > 0 && 
      item.supplierMatches[0].confidence >= 85
    ).length;

    return {
      synonymMatchCount: synonymMatches,
      learnedMatchCount: learnedMatches,
      highConfidenceRate: Math.round((highConfidenceMatches / itemsWithMatches.length) * 100),
      averageMatchesPerItem: Math.round(
        itemsWithMatches.reduce((sum, item) => 
          sum + (item.supplierMatches?.length || 0), 0
        ) / itemsWithMatches.length
      )
    };
  }

  static findHistoricalSelections(item) {
    const itemSignature = this.createItemSignature(item);
    
    return this.selectionHistory
      .filter(history => {
        const historySignature = this.createItemSignature(history.item);
        return this.compareItemSignatures(itemSignature, historySignature) > 0.8;
      })
      .reduce((acc, history) => {
        const existing = acc.find(a => a.supplierId === history.supplierId);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ supplierId: history.supplierId, count: 1 });
        }
        return acc;
      }, []);
  }

  static createItemSignature(item) {
    const name = this.normalizeProductName(item.description || item.productName || '');
    const code = (item.productCode || '').toLowerCase().trim();
    return { name, code };
  }

  static compareItemSignatures(sig1, sig2) {
    let score = 0;
    if (sig1.code && sig2.code && sig1.code === sig2.code) score += 0.5;
    if (sig1.name && sig2.name) score += fuzzyMatch(sig1.name, sig2.name) * 0.5;
    return score;
  }

  /**
   * ENHANCED: Record user selection for learning
   */
  static recordSelection(item, selectedSupplier) {
    const selection = {
      id: Date.now(),
      item: this.createItemSignature(item),
      supplierId: selectedSupplier.supplierId || selectedSupplier.id,
      selectedAt: new Date().toISOString(),
      confidence: selectedSupplier.confidence || 0
    };
    
    this.selectionHistory.push(selection);
    
    // Keep only last 1000 selections
    if (this.selectionHistory.length > 1000) {
      this.selectionHistory = this.selectionHistory.slice(-1000);
    }
    
    localStorage.setItem('supplierSelectionHistory', JSON.stringify(this.selectionHistory));
    console.log('🎓 Recorded supplier selection for learning');
  }

  // Keep all your existing methods unchanged:
  // - calculateProductMatchScore (your existing logic)
  // - containsKeywords
  // - matchCategory  
  // - rankSupplierMatches (now has enhanced version)
  // - calculateReliability
  // - aggregateSupplierRecommendations
  // - calculateAverageLeadTime
  // - calculateSourcingMetrics
  // - getAllSuppliers
  // - getAllProducts
  // - saveSupplierPreference
  // - getMatchingHistory

  // [Keep all your existing methods here - they remain unchanged]
  
  /**
   * Your existing calculateProductMatchScore method (unchanged)
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
   * Your existing containsKeywords method (unchanged)
   */
  static containsKeywords(searchText, targetText) {
    const keywords = searchText.split(' ').filter(word => word.length > 2);
    const matchedKeywords = keywords.filter(keyword => 
      targetText.includes(keyword)
    );
    return matchedKeywords.length / keywords.length;
  }

  /**
   * Your existing matchCategory method (unchanged)
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
   * Your existing calculateReliability method (unchanged)
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
   * Your existing aggregateSupplierRecommendations method (unchanged)
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
   * Your existing calculateAverageLeadTime method (unchanged)
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
   * Your existing calculateSourcingMetrics method (unchanged)
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
   * Your existing getAllSuppliers method (unchanged)
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
   * Your existing getAllProducts method (unchanged)
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
   * Your existing saveSupplierPreference method (unchanged)
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
   * Your existing getMatchingHistory method (unchanged)
   */
  static getMatchingHistory() {
    return CacheService.extractionHistory.filter(entry => 
      entry.type === 'supplier_match' && entry.success
    );
  }
}

if (typeof window !== 'undefined') {
  window.SupplierMatcher = SupplierMatcher;
}
