// src/services/ai/DuplicateDetectionService.js
// Handle duplicate detection logic

import { MappingService } from './MappingService';

export class DuplicateDetectionService {
  /**
   * Check for duplicate purchase orders
   */
  static async checkDuplicates(data) {
    try {
      // Get existing purchase orders from localStorage
      const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      
      const duplicates = [];
      const similarPOs = [];

      // Check each existing PO for duplicates
      for (const po of purchaseOrders) {
        // Exact PO number match
        if (data.orderNumber && po.orderNumber === data.orderNumber) {
          duplicates.push({
            type: 'exact',
            field: 'orderNumber',
            existingPO: po,
            confidence: 1.0,
            message: `Exact match found: PO ${po.orderNumber}`
          });
          continue;
        }

        // Calculate similarity score
        const similarity = this.calculateSimilarity(data, po);
        if (similarity > 0.8) {
          similarPOs.push({
            po: po,
            similarity: similarity,
            matchedFields: this.getMatchedFields(data, po)
          });
        }
      }

      // Sort similar POs by similarity score
      similarPOs.sort((a, b) => b.similarity - a.similarity);

      return {
        isDuplicate: duplicates.length > 0,
        hasSimilar: similarPOs.length > 0,
        duplicates: duplicates,
        similarPOs: similarPOs,
        recommendation: this.getDuplicateRecommendation(duplicates, similarPOs)
      };
    } catch (error) {
      console.error('Duplicate check error:', error);
      return {
        isDuplicate: false,
        hasSimilar: false,
        duplicates: [],
        similarPOs: [],
        error: error.message
      };
    }
  }

  /**
   * Calculate similarity score between two POs
   */
  static calculateSimilarity(data1, data2) {
    let score = 0;
    let factors = 0;

    // Client name similarity (30% weight)
    if (data1.clientName && data2.clientName) {
      score += this.stringSimilarity(data1.clientName, data2.clientName) * 0.3;
      factors += 0.3;
    }

    // Supplier name similarity (20% weight)
    if (data1.supplierName && data2.supplierName) {
      score += this.stringSimilarity(data1.supplierName, data2.supplierName) * 0.2;
      factors += 0.2;
    }

    // Date proximity (20% weight)
    if (data1.orderDate && data2.orderDate) {
      const daysDiff = Math.abs(
        new Date(data1.orderDate) - new Date(data2.orderDate)
      ) / (1000 * 60 * 60 * 24);
      
      if (daysDiff === 0) score += 0.2;
      else if (daysDiff <= 7) score += 0.1;
      else if (daysDiff <= 30) score += 0.05;
      factors += 0.2;
    }

    // Total amount similarity (15% weight)
    if (data1.totalAmount && data2.totalAmount) {
      const amountDiff = Math.abs(data1.totalAmount - data2.totalAmount);
      const avgAmount = (data1.totalAmount + data2.totalAmount) / 2;
      
      if (avgAmount > 0) {
        const amountSimilarity = 1 - (amountDiff / avgAmount);
        if (amountSimilarity > 0.95) {
          score += 0.15;
        } else if (amountSimilarity > 0.9) {
          score += 0.1;
        } else if (amountSimilarity > 0.8) {
          score += 0.05;
        }
      }
      factors += 0.15;
    }

    // Items similarity (15% weight)
    if (data1.items && data2.items && data1.items.length > 0 && data2.items.length > 0) {
      const itemsSimilarity = this.compareItems(data1.items, data2.items);
      score += itemsSimilarity * 0.15;
      factors += 0.15;
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Calculate string similarity
   */
  static stringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
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
    if (items1.length === 0 || items2.length === 0) return 0;
    
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
          const qtyDiff = Math.abs(item1.quantity - item2.quantity);
          const avgQty = (item1.quantity + item2.quantity) / 2;
          const qtySimilarity = avgQty > 0 ? 1 - (qtyDiff / avgQty) : 0;
          
          if (qtySimilarity > 0.8) {
            matches += 1;
          } else {
            matches += 0.5; // Partial match
          }
          break;
        }
      }
    }
    
    // Return ratio of matches to total items
    return matches / maxLength;
  }

  /**
   * Get list of matched fields between two POs
   */
  static getMatchedFields(data1, data2) {
    const matched = [];
    
    if (data1.clientName === data2.clientName && data1.clientName) {
      matched.push('clientName');
    }
    if (data1.supplierName === data2.supplierName && data1.supplierName) {
      matched.push('supplierName');
    }
    if (data1.orderDate === data2.orderDate && data1.orderDate) {
      matched.push('orderDate');
    }
    if (data1.totalAmount === data2.totalAmount && data1.totalAmount) {
      matched.push('totalAmount');
    }
    if (data1.paymentTerms === data2.paymentTerms && data1.paymentTerms) {
      matched.push('paymentTerms');
    }
    
    return matched;
  }

  /**
   * Generate duplicate recommendation
   */
  static getDuplicateRecommendation(duplicates, similarPOs) {
    if (duplicates.length > 0) {
      return {
        action: 'reject',
        message: 'This appears to be a duplicate PO. The PO number already exists.',
        severity: 'high',
        suggestedAction: 'Please use a different PO number or update the existing PO.'
      };
    }
    
    if (similarPOs.length > 0) {
      const topMatch = similarPOs[0];
      if (topMatch.similarity > 0.95) {
        return {
          action: 'warning',
          message: `Very similar to PO ${topMatch.po.orderNumber}. This might be a duplicate.`,
          severity: 'high',
          suggestedAction: 'Please verify this is a new order before proceeding.',
          similarPO: topMatch.po
        };
      } else if (topMatch.similarity > 0.85) {
        return {
          action: 'caution',
          message: `Similar to PO ${topMatch.po.orderNumber}. Please confirm this is intentional.`,
          severity: 'medium',
          suggestedAction: 'Review the similar PO to ensure this is not a duplicate.',
          similarPO: topMatch.po
        };
      }
    }
    
    return {
      action: 'proceed',
      message: 'No duplicates found.',
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
