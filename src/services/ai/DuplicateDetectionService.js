// src/services/ai/DuplicateDetectionService.js
// Check for duplicate purchase orders

import { CacheService } from './CacheService';
import { safeToLowerCase, safeIncludes } from './utils/safeString';

export class DuplicateDetectionService {
  /**
   * Check if a PO might be a duplicate
   */
  static async checkDuplicates(data) {
    const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const duplicates = [];
    
    for (const po of purchaseOrders) {
      const similarity = this.calculateSimilarity(data, po);
      
      if (similarity > 0.7) {
        duplicates.push({
          orderNumber: po.orderNumber,
          similarity: similarity,
          matchedFields: this.getMatchedFields(data, po),
          createdDate: po.dateCreated,
          totalAmount: po.totalAmount
        });
      }
    }
    
    // Sort by similarity score
    duplicates.sort((a, b) => b.similarity - a.similarity);
    
    return {
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.slice(0, 5), // Return top 5 matches
      highestSimilarity: duplicates[0]?.similarity || 0
    };
  }

  /**
   * Calculate similarity between two POs
   */
  static calculateSimilarity(po1, po2) {
    const factors = [];
    
    // Client name similarity
    if (po1.clientName && po2.clientName) {
      factors.push(this.stringSimilarity(po1.clientName, po2.clientName));
    }
    
    // Supplier name similarity
    if (po1.supplierName && po2.supplierName) {
      factors.push(this.stringSimilarity(po1.supplierName, po2.supplierName));
    }
    
    // Total amount similarity
    if (po1.totalAmount && po2.totalAmount) {
      const amountDiff = Math.abs(po1.totalAmount - po2.totalAmount);
      const avgAmount = (po1.totalAmount + po2.totalAmount) / 2;
      const amountSimilarity = avgAmount > 0 ? 1 - (amountDiff / avgAmount) : 0;
      factors.push(Math.max(0, amountSimilarity));
    }
    
    // Date proximity (within 7 days)
    if (po1.orderDate && po2.orderDate) {
      const date1 = new Date(po1.orderDate);
      const date2 = new Date(po2.orderDate);
      const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
      const dateSimilarity = daysDiff <= 7 ? 1 - (daysDiff / 7) : 0;
      factors.push(dateSimilarity);
    }
    
    // Items similarity
    if (po1.items && po2.items && po1.items.length > 0 && po2.items.length > 0) {
      const itemsSimilarity = this.compareItems(po1.items, po2.items);
      factors.push(itemsSimilarity);
    }
    
    // Calculate weighted average
    const weights = [0.3, 0.2, 0.2, 0.1, 0.2]; // Client, Supplier, Amount, Date, Items
    let weightedSum = 0;
    let totalWeight = 0;
    
    factors.forEach((factor, index) => {
      if (!isNaN(factor) && weights[index]) {
        weightedSum += factor * weights[index];
        totalWeight += weights[index];
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Get fields that match between two POs
   */
  static getMatchedFields(po1, po2) {
    const matches = [];
    
    if (po1.clientName && po2.clientName && 
        this.stringSimilarity(po1.clientName, po2.clientName) > 0.8) {
      matches.push('Client Name');
    }
    
    if (po1.supplierName && po2.supplierName && 
        this.stringSimilarity(po1.supplierName, po2.supplierName) > 0.8) {
      matches.push('Supplier');
    }
    
    if (po1.totalAmount && po2.totalAmount) {
      const diff = Math.abs(po1.totalAmount - po2.totalAmount);
      if (diff < po1.totalAmount * 0.05) { // Within 5%
        matches.push('Total Amount');
      }
    }
    
    if (po1.orderDate && po2.orderDate) {
      const date1 = new Date(po1.orderDate);
      const date2 = new Date(po2.orderDate);
      const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 1) {
        matches.push('Order Date');
      }
    }
    
    return matches;
  }

  /**
   * Calculate string similarity with safety checks
   */
  static stringSimilarity(str1, str2) {
    // Safety checks
    if (!str1 || !str2) return 0;
    
    const s1 = safeToLowerCase(str1).trim();
    const s2 = safeToLowerCase(str2).trim();
    
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Use Levenshtein distance for more accurate comparison
    const distance = this.levenshteinDistance(s1, s2);
    const maxLen = Math.max(s1.length, s2.length);
    return maxLen > 0 ? 1 - (distance / maxLen) : 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    // Safety checks
    if (!str1 || !str2) {
      return Math.max(str1?.length || 0, str2?.length || 0);
    }
    
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Compare items between two POs
   */
  static compareItems(items1, items2) {
    if (!items1?.length || !items2?.length) return 0;
    
    let matches = 0;
    const minLength = Math.min(items1.length, items2.length);
    const maxLength = Math.max(items1.length, items2.length);
    
    // Count matching items
    for (const item1 of items1) {
      for (const item2 of items2) {
        const nameSimilarity = this.stringSimilarity(
          item1.productName || '',
          item2.productName || ''
        );
        
        if (nameSimilarity > 0.8) {
          // Check quantity similarity
          const qtyDiff = Math.abs((item1.quantity || 0) - (item2.quantity || 0));
          const avgQty = ((item1.quantity || 0) + (item2.quantity || 0)) / 2;
          const qtySimilarity = avgQty > 0 ? 1 - (qtyDiff / avgQty) : 0;
          
          if (qtySimilarity > 0.8) {
            matches++;
            break; // Count each item only once
          }
        }
      }
    }
    
    // Return ratio of matching items
    return maxLength > 0 ? matches / maxLength : 0;
  }

  /**
   * Get duplicate detection report
   */
  static async getDuplicateReport(poData) {
    const duplicateCheck = await this.checkDuplicates(poData);
    
    if (!duplicateCheck.hasDuplicates) {
      return {
        status: 'clear',
        message: 'No duplicates detected.',
        action: 'proceed'
      };
    }
    
    const topMatch = duplicateCheck.duplicates[0];
    
    if (topMatch.similarity > 0.95) {
      const existingPO = JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
        .find(po => po.orderNumber === topMatch.orderNumber);
        
      return {
        status: 'high_risk',
        message: `This appears to be a duplicate of PO ${topMatch.orderNumber}`,
        action: 'block',
        duplicate: existingPO,
        similarity: topMatch.similarity,
        matchedFields: topMatch.matchedFields
      };
    } else if (topMatch.similarity > 0.8) {
      return {
        status: 'medium_risk',
        message: `Similar to PO ${topMatch.orderNumber}. Please verify.`,
        action: 'warn',
        similarity: topMatch.similarity,
        matchedFields: topMatch.matchedFields
      };
    } else {
      return {
        status: 'low_risk',
        message: 'Some similarities found with existing orders.',
        action: 'info',
        similarOrders: duplicateCheck.duplicates
      };
    }
  }

  /**
   * Mark POs as related (not duplicates)
   */
  static markAsRelated(poNumber1, poNumber2, relationship = 'related') {
    const key = `po_relationship_${poNumber1}_${poNumber2}`;
    const relationshipData = {
      po1: poNumber1,
      po2: poNumber2,
      relationship: relationship,
      markedAt: new Date().toISOString()
    };
    
    localStorage.setItem(key, JSON.stringify(relationshipData));
    CacheService.cacheRelationship(poNumber1, poNumber2, relationship);
  }

  /**
   * Check if two POs are marked as related
   */
  static areRelated(poNumber1, poNumber2) {
    const key1 = `po_relationship_${poNumber1}_${poNumber2}`;
    const key2 = `po_relationship_${poNumber2}_${poNumber1}`;
    
    const rel1 = localStorage.getItem(key1);
    const rel2 = localStorage.getItem(key2);
    
    return rel1 || rel2 ? JSON.parse(rel1 || rel2) : null;
  }

  /**
   * Get recommendation based on duplicate check
   */
  static getDuplicateRecommendation(duplicateCheck) {
    if (!duplicateCheck.hasDuplicates) {
      return {
        action: 'proceed',
        message: 'No duplicates found.',
        severity: 'low'
      };
    }
    
    const topMatch = duplicateCheck.duplicates[0];
    
    if (topMatch) {
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      const matchedPO = purchaseOrders.find(po => po.orderNumber === topMatch.orderNumber);
      
      if (topMatch.similarity > 0.95) {
        return {
          action: 'block',
          message: `This appears to be a duplicate of PO ${topMatch.orderNumber}. Please verify before proceeding.`,
          severity: 'high',
          suggestedAction: 'Review the existing PO or cancel this entry.',
          similarPO: matchedPO
        };
      } else if (topMatch.similarity > 0.85) {
        return {
          action: 'caution',
          message: `Similar to PO ${topMatch.orderNumber}. Please confirm this is intentional.`,
          severity: 'medium',
          suggestedAction: 'Review the similar PO to ensure this is not a duplicate.',
          similarPO: matchedPO
        };
      }
    }
    
    return {
      action: 'proceed',
      message: 'Some similarities found, but likely not a duplicate.',
      severity: 'low'
    };
  }

  /**
   * Find potential duplicates based on specific criteria
   */
  static async findDuplicatesByCriteria(criteria) {
    const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const matches = [];
    
    for (const po of purchaseOrders) {
      let isMatch = true;
      
      // Check each criterion
      if (criteria.clientName && po.clientName !== criteria.clientName) {
        isMatch = false;
      }
      if (criteria.supplierName && po.supplierName !== criteria.supplierName) {
        isMatch = false;
      }
      if (criteria.dateRange) {
        const poDate = new Date(po.orderDate);
        const startDate = new Date(criteria.dateRange.start);
        const endDate = new Date(criteria.dateRange.end);
        
        if (poDate < startDate || poDate > endDate) {
          isMatch = false;
        }
      }
      if (criteria.amountRange) {
        if (po.totalAmount < criteria.amountRange.min || po.totalAmount > criteria.amountRange.max) {
          isMatch = false;
        }
      }
      
      if (isMatch) {
        matches.push(po);
      }
    }
    
    return matches;
  }

  /**
   * Batch check for duplicates
   */
  static async batchCheckDuplicates(poDataArray) {
    const results = [];
    
    for (const poData of poDataArray) {
      const duplicateCheck = await this.checkDuplicates(poData);
      results.push({
        data: poData,
        duplicateCheck: duplicateCheck
      });
    }
    
    return results;
  }
}
