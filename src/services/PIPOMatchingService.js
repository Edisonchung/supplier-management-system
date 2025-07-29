// src/services/PIPOMatchingService.js
export class PIPOMatchingService {
  static async findMatchingPOs(piItems) {
    try {
      // Get all POs from storage/database
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      
      // ✅ FILTER OUT ALREADY-MATCHED ITEMS
      const unmatchedPIItems = piItems.filter(item => !this.isAlreadyMatched(item));
      
      // ✅ GET AVAILABLE (UNMATCHED) PO ITEMS
      const availablePOs = this.getAvailablePOs(purchaseOrders);
      
      const matches = [];
      
      for (const piItem of unmatchedPIItems) {
        const itemMatches = this.findItemMatches(piItem, availablePOs);
        if (itemMatches.length > 0) {
          matches.push({
            piItem,
            matches: itemMatches.map(match => ({
              ...match,
              confidence: this.calculateMatchConfidence(piItem, match.poItem),
              matchedFields: this.getMatchedFields(piItem, match.poItem)
            }))
          });
        }
      }
      
      return {
        success: true,
        matches,
        summary: this.generateMatchingSummary(matches, piItems.length, unmatchedPIItems.length),
        alreadyMatchedCount: piItems.length - unmatchedPIItems.length
      };
    } catch (error) {
      console.error('Error finding PO matches:', error);
      return { success: false, error: error.message };
    }
  }

  // ✅ NEW: Check if PI item is already matched
  static isAlreadyMatched(piItem) {
    return !!(
      piItem.clientPO && 
      piItem.clientLineItem && 
      piItem.matchedFromPO === true
    );
  }

  // ✅ NEW: Get POs with available (unmatched) items
  static getAvailablePOs(purchaseOrders) {
    // Get all already-matched PO items to exclude them
    const allPIs = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
    const matchedPOItems = new Set();
    
    allPIs.forEach(pi => {
      pi.items?.forEach(item => {
        if (item.linkedPOId && item.clientLineItem) {
          matchedPOItems.add(`${item.linkedPOId}-${item.clientLineItem}`);
        }
      });
    });

    return purchaseOrders.map(po => ({
      ...po,
      items: po.items?.filter(item => {
        const itemKey = `${po.id}-${item.lineNumber || item.id}`;
        return !matchedPOItems.has(itemKey);
      }) || []
    })).filter(po => po.items.length > 0); // Only include POs with available items
  }

  static findItemMatches(piItem, availablePOs) {
    const matches = [];
    
    availablePOs.forEach(po => {
      po.items?.forEach(poItem => {
        const matchScore = this.calculateItemMatchScore(piItem, poItem);
        
        if (matchScore > 0.3) { // 30% minimum match threshold
          matches.push({
            po,
            poItem,
            poNumber: po.orderNumber,
            lineItem: poItem.lineNumber || poItem.id,
            matchScore,
            matchType: this.getMatchType(piItem, poItem, matchScore)
          });
        }
      });
    });
    
    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  static calculateItemMatchScore(piItem, poItem) {
    let score = 0;
    let maxScore = 0;
    
    // Product code matching (40% weight)
    const codeWeight = 0.4;
    maxScore += codeWeight;
    if (piItem.productCode && poItem.productCode) {
      const codeMatch = this.fuzzyMatch(piItem.productCode, poItem.productCode);
      score += codeMatch * codeWeight;
    }
    
    // Product name matching (35% weight)
    const nameWeight = 0.35;
    maxScore += nameWeight;
    if (piItem.productName && poItem.productName) {
      const nameMatch = this.fuzzyMatch(piItem.productName, poItem.productName);
      score += nameMatch * nameWeight;
    }
    
    // Quantity matching (15% weight)
    const qtyWeight = 0.15;
    maxScore += qtyWeight;
    if (piItem.quantity && poItem.quantity) {
      const qtyMatch = piItem.quantity === poItem.quantity ? 1 : 0.5;
      score += qtyMatch * qtyWeight;
    }
    
    // Price similarity (10% weight)
    const priceWeight = 0.10;
    maxScore += priceWeight;
    if (piItem.unitPrice && poItem.unitPrice) {
      const priceDiff = Math.abs(piItem.unitPrice - poItem.unitPrice) / Math.max(piItem.unitPrice, poItem.unitPrice);
      const priceMatch = Math.max(0, 1 - priceDiff);
      score += priceMatch * priceWeight;
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }

  static fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Similarity using Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength > 0 ? 1 - (distance / maxLength) : 0;
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  static calculateMatchConfidence(piItem, poItem) {
    const score = this.calculateItemMatchScore(piItem, poItem);
    return Math.round(score * 100);
  }

  static getMatchType(piItem, poItem, score) {
    if (score >= 0.9) return 'exact';
    if (score >= 0.7) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }

  static getMatchedFields(piItem, poItem) {
    const fields = [];
    
    if (piItem.productCode && poItem.productCode && 
        this.fuzzyMatch(piItem.productCode, poItem.productCode) > 0.8) {
      fields.push('productCode');
    }
    
    if (piItem.productName && poItem.productName && 
        this.fuzzyMatch(piItem.productName, poItem.productName) > 0.7) {
      fields.push('productName');
    }
    
    if (piItem.quantity === poItem.quantity) {
      fields.push('quantity');
    }
    
    return fields;
  }

  static generateMatchingSummary(matches, totalItems, unmatchedItems) {
    const matchedItems = matches.filter(m => m.matches.length > 0).length;
    const highConfidenceMatches = matches.filter(m => 
      m.matches.some(match => match.confidence >= 80)
    ).length;
    
    return {
      totalItems,
      unmatchedItems,
      searchedItems: unmatchedItems, // Items that were searched for matches
      matchedItems,
      noMatchItems: unmatchedItems - matchedItems,
      highConfidenceMatches,
      matchRate: unmatchedItems > 0 ? Math.round((matchedItems / unmatchedItems) * 100) : 0,
      alreadyMatchedItems: totalItems - unmatchedItems
    };
  }

  // Apply matches to PI items
  static applyMatches(piItems, selectedMatches) {
    return piItems.map(item => {
      const selectedMatch = selectedMatches.find(m => m.piItemId === item.id);
      
      if (selectedMatch) {
        return {
          ...item,
          clientPO: selectedMatch.poNumber,
          clientLineItem: selectedMatch.lineItem,
          clientItemCode: selectedMatch.poItem.productCode,
          fsProjectCode: selectedMatch.po.projectCode || selectedMatch.po.orderNumber,
          // Metadata for tracking
          matchedFromPO: true,
          matchConfidence: selectedMatch.confidence,
          matchType: selectedMatch.matchType,
          linkedPOId: selectedMatch.po.id
        };
      }
      
      return item;
    });
  }
}
