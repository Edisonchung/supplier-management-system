// src/services/PIPOMatchingService.js
// Updated with working Firestore integration

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase'; // Adjust path to your firebase config

export class PIPOMatchingService {
  static async findMatchingPOs(piItems) {
    try {
      console.log('🔍 PIPOMatchingService: Starting matching process...');
      console.log('PI Items received:', piItems);

      // Validate input
      if (!piItems || !Array.isArray(piItems) || piItems.length === 0) {
        console.warn('No PI items provided for matching');
        return {
          success: true,
          matches: [],
          summary: {
            totalItems: 0,
            unmatchedItems: 0,
            searchedItems: 0,
            matchedItems: 0,
            noMatchItems: 0,
            highConfidenceMatches: 0,
            matchRate: 0,
            alreadyMatchedItems: 0
          },
          alreadyMatchedCount: 0
        };
      }

      // ✅ UPDATED: Get all POs from Firestore with proper error handling
      let purchaseOrders = [];
      try {
        console.log('🔍 Attempting to fetch POs from Firestore...');
        
        // Try to fetch from Firestore using your existing db connection
        const posCollection = collection(db, 'purchaseOrders');
        const querySnapshot = await getDocs(posCollection);
        
        purchaseOrders = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure we have the right field names
            orderNumber: data.orderNumber || data.poNumber || data.clientPONumber || doc.id,
            items: data.items || data.lineItems || []
          };
        });
        
        console.log('✅ Successfully fetched POs from Firestore:', purchaseOrders.length);
        console.log('📋 PO Details:', purchaseOrders);
        
      } catch (firestoreError) {
        console.warn('⚠️ Could not fetch POs from Firestore:', firestoreError);
        console.log('🔄 Falling back to localStorage...');
        
        // Fallback to localStorage
        purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
        
        if (purchaseOrders.length === 0) {
          console.log('📝 No POs found in localStorage either');
          console.log('⚠️ No Purchase Orders available for matching');
        }
      }
      
      console.log('Found Purchase Orders:', purchaseOrders.length);
      
      // ✅ FILTER OUT ALREADY-MATCHED ITEMS
      const unmatchedPIItems = piItems.filter(item => !this.isAlreadyMatched(item));
      console.log('Unmatched PI Items:', unmatchedPIItems.length);
      
      // ✅ GET AVAILABLE (UNMATCHED) PO ITEMS
      const availablePOs = this.getAvailablePOs(purchaseOrders);
      console.log('Available POs with unmatched items:', availablePOs.length);
      
      const matches = [];
      
      for (const piItem of unmatchedPIItems) {
        console.log(`🔍 Finding matches for PI item: ${piItem.productName || piItem.productCode || 'Unknown'}`);
        const itemMatches = this.findItemMatches(piItem, availablePOs);
        console.log(`Found ${itemMatches.length} potential matches`);
        
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
      
      const summary = this.generateMatchingSummary(matches, piItems.length, unmatchedPIItems.length);
      console.log('Matching Summary:', summary);
      
      return {
        success: true,
        matches,
        summary,
        alreadyMatchedCount: piItems.length - unmatchedPIItems.length
      };
    } catch (error) {
      console.error('❌ Error finding PO matches:', error);
      return { 
        success: false, 
        error: error.message,
        matches: [],
        summary: {
          totalItems: piItems?.length || 0,
          unmatchedItems: 0,
          searchedItems: 0,
          matchedItems: 0,
          noMatchItems: 0,
          highConfidenceMatches: 0,
          matchRate: 0,
          alreadyMatchedItems: 0
        }
      };
    }
  }

  // ✅ Check if PI item is already matched
  static isAlreadyMatched(piItem) {
    const isMatched = !!(
      piItem.clientPO && 
      piItem.clientLineItem && 
      piItem.matchedFromPO === true
    );
    console.log(`Item ${piItem.productCode || piItem.productName} already matched:`, isMatched);
    return isMatched;
  }

  // ✅ Get POs with available (unmatched) items
  static getAvailablePOs(purchaseOrders) {
    try {
      // Get all already-matched PO items to exclude them
      let allPIs = [];
      
      try {
        // Try to get from Firestore first
        allPIs = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
      } catch (error) {
        console.warn('Could not get PIs for matching check:', error);
        allPIs = [];
      }
      
      const matchedPOItems = new Set();
      
      allPIs.forEach(pi => {
        if (pi.items && Array.isArray(pi.items)) {
          pi.items.forEach(item => {
            if (item.linkedPOId && item.clientLineItem) {
              matchedPOItems.add(`${item.linkedPOId}-${item.clientLineItem}`);
            }
          });
        }
      });

      console.log('Already matched PO items:', matchedPOItems.size);

      const availablePOs = purchaseOrders.map(po => {
        const availableItems = (po.items || []).filter(item => {
          const itemKey = `${po.id}-${item.lineNumber || item.id}`;
          return !matchedPOItems.has(itemKey);
        });

        return {
          ...po,
          items: availableItems
        };
      }).filter(po => po.items.length > 0); // Only include POs with available items

      console.log('Available POs after filtering:', availablePOs.length);
      return availablePOs;
    } catch (error) {
      console.error('Error getting available POs:', error);
      return [];
    }
  }

  // 🔧 UPDATE: findItemMatches method to pass PO reference
static findItemMatches(piItem, availablePOs) {
  const matches = [];
  
  if (!piItem || !availablePOs || !Array.isArray(availablePOs)) {
    console.warn('Invalid parameters for findItemMatches');
    return matches;
  }
  
  availablePOs.forEach(po => {
    if (po.items && Array.isArray(po.items)) {
      po.items.forEach(poItem => {
        // Add PO reference to poItem for matching
        const enhancedPOItem = {
          ...poItem,
          po: po // Add PO reference for manual matching
        };
        
        const matchScore = this.calculateItemMatchScore(piItem, enhancedPOItem);
        
        console.log(`🔍 Comparing "${piItem.productCode}" vs "${poItem.productCode}" - Score: ${matchScore.toFixed(3)}`);
        
        if (matchScore > 0.3) { // 30% minimum match threshold
          matches.push({
            po,
            poItem,
            poNumber: po.orderNumber || po.poNumber || po.id,
            lineItem: poItem.lineNumber || poItem.id,
            matchScore,
            matchType: this.getMatchType(piItem, enhancedPOItem, matchScore)
          });
          console.log(`✅ Added match: ${poItem.productCode} (${(matchScore * 100).toFixed(1)}%)`);
        }
      });
    }
  });
  
  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

  static calculateItemMatchScore(piItem, poItem) {
  if (!piItem || !poItem) {
    return 0;
  }

  let score = 0;
  let maxScore = 0;
  
  // ✅ NEW: Manual Client PO and Item Code Priority (60% weight)
  const manualWeight = 0.6;
  
  // Check if PI item has manually entered Client PO and Client Item Code
  const hasManualClientPO = piItem.clientPO && piItem.clientPO.trim() !== '';
  const hasManualClientItemCode = piItem.clientItemCode && piItem.clientItemCode.trim() !== '';
  
  if (hasManualClientPO || hasManualClientItemCode) {
    maxScore += manualWeight;
    
    let manualScore = 0;
    let manualChecks = 0;
    
    // 🔧 FIXED: Manual Client PO matching (30% of total)
    if (hasManualClientPO) {
      manualChecks++;
      
      // ✅ CORRECTED: Check all possible PO number fields in the correct order
      const poNumber = poItem.po?.clientPoNumber ||     // ← Primary: Client PO Number
                      poItem.po?.orderNumber ||         // ← Secondary: Order Number  
                      poItem.po?.poNumber ||            // ← Tertiary: Internal PO Number
                      poItem.po?.id;                    // ← Fallback: Document ID
                      
      console.log(`🔍 Checking PO fields: clientPoNumber="${poItem.po?.clientPoNumber}", orderNumber="${poItem.po?.orderNumber}", poNumber="${poItem.po?.poNumber}", id="${poItem.po?.id}"`);
      console.log(`🎯 Selected PO Number for matching: "${poNumber}"`);
      
      if (piItem.clientPO.toLowerCase().trim() === poNumber?.toLowerCase().trim()) {
        manualScore += 0.5; // 50% of manual weight
        console.log(`  ✅ Manual Client PO EXACT match: "${piItem.clientPO}" = "${poNumber}"`);
      } else {
        console.log(`  ❌ Manual Client PO mismatch: "${piItem.clientPO}" ≠ "${poNumber}"`);
      }
    }
    
    // Manual Client Item Code matching (30% of total)
    if (hasManualClientItemCode) {
      manualChecks++;
      if (piItem.clientItemCode.toLowerCase().trim() === poItem.productCode?.toLowerCase().trim()) {
        manualScore += 0.5; // 50% of manual weight
        console.log(`  ✅ Manual Client Item Code EXACT match: "${piItem.clientItemCode}" = "${poItem.productCode}"`);
      } else {
        console.log(`  ❌ Manual Client Item Code mismatch: "${piItem.clientItemCode}" ≠ "${poItem.productCode}"`);
      }
    }
    
    score += (manualScore / Math.max(manualChecks, 1)) * manualWeight;
    console.log(`  📋 Manual matching score: ${((manualScore / Math.max(manualChecks, 1)) * manualWeight).toFixed(3)} (${(((manualScore / Math.max(manualChecks, 1)) * manualWeight) * 100).toFixed(1)}%)`);
  }
  
  // Automatic matching gets remaining weight (40% if manual data exists, 100% if no manual data)
  const autoWeight = hasManualClientPO || hasManualClientItemCode ? 0.4 : 1.0;
  
  // Product code matching (40% of auto weight)
  const codeWeight = autoWeight * 0.4;
  if (piItem.productCode && poItem.productCode) {
    maxScore += codeWeight;
    const codeMatch = this.fuzzyMatch(piItem.productCode, poItem.productCode);
    score += codeMatch * codeWeight;
    console.log(`  Code match: "${piItem.productCode}" vs "${poItem.productCode}" = ${codeMatch.toFixed(3)} (weight: ${codeWeight.toFixed(3)})`);
  }
  
  // Product name matching (35% of auto weight)
  const nameWeight = autoWeight * 0.35;
  if (piItem.productName && poItem.productName) {
    maxScore += nameWeight;
    const nameMatch = this.fuzzyMatch(piItem.productName, poItem.productName);
    score += nameMatch * nameWeight;
    console.log(`  Name match: "${piItem.productName}" vs "${poItem.productName}" = ${nameMatch.toFixed(3)} (weight: ${nameWeight.toFixed(3)})`);
  }
  
  // Quantity matching (15% of auto weight)
  const qtyWeight = autoWeight * 0.15;
  if (piItem.quantity && poItem.quantity) {
    maxScore += qtyWeight;
    const qtyMatch = piItem.quantity === poItem.quantity ? 1 : 0.5;
    score += qtyMatch * qtyWeight;
    console.log(`  Qty match: ${piItem.quantity} vs ${poItem.quantity} = ${qtyMatch.toFixed(3)} (weight: ${qtyWeight.toFixed(3)})`);
  }
  
  // Price similarity (10% of auto weight)
  const priceWeight = autoWeight * 0.10;
  if (piItem.unitPrice && poItem.unitPrice) {
    maxScore += priceWeight;
    const priceDiff = Math.abs(piItem.unitPrice - poItem.unitPrice) / Math.max(piItem.unitPrice, poItem.unitPrice);
    const priceMatch = Math.max(0, 1 - priceDiff);
    score += priceMatch * priceWeight;
    console.log(`  Price match: ${piItem.unitPrice} vs ${poItem.unitPrice} = ${priceMatch.toFixed(3)} (weight: ${priceWeight.toFixed(3)})`);
  }
  
  const finalScore = maxScore > 0 ? score / maxScore : 0;
  console.log(`  🎯 Final score: ${finalScore.toFixed(3)} (${(finalScore * 100).toFixed(1)}%)`);
  
  return finalScore;
}


  static fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = String(str1).toLowerCase().trim();
    const s2 = String(str2).toLowerCase().trim();
    
    // Exact match
    if (s1 === s2) return 1;
    
    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    // Similarity using Levenshtein distance
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength > 0 ? Math.max(0, 1 - (distance / maxLength)) : 0;
  }

  static levenshteinDistance(str1, str2) {
    if (!str1 || !str2) return Math.max(String(str1 || '').length, String(str2 || '').length);
    
    const matrix = [];
    const s1 = String(str1);
    const s2 = String(str2);
    
    for (let i = 0; i <= s2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= s1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
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
    
    return matrix[s2.length][s1.length];
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

  // 🔧 UPDATE: getMatchedFields to include manual matching
static getMatchedFields(piItem, poItem) {
  const fields = [];
  
  // Check manual Client PO matching
  if (piItem.clientPO && poItem.po) {
    const poNumber = poItem.po.orderNumber || poItem.po.clientPONumber || poItem.po.id;
    if (piItem.clientPO.toLowerCase().trim() === poNumber?.toLowerCase().trim()) {
      fields.push('clientPO');
    }
  }
  
  // Check manual Client Item Code matching
  if (piItem.clientItemCode && poItem.productCode && 
      piItem.clientItemCode.toLowerCase().trim() === poItem.productCode.toLowerCase().trim()) {
    fields.push('clientItemCode');
  }
  
  // Existing automatic matching checks
  if (piItem.productCode && poItem.productCode && 
      this.fuzzyMatch(piItem.productCode, poItem.productCode) > 0.8) {
    fields.push('productCode');
  }
  
  if (piItem.productName && poItem.productName && 
      this.fuzzyMatch(piItem.productName, poItem.productName) > 0.7) {
    fields.push('productName');
  }
  
  if (piItem.quantity && poItem.quantity && piItem.quantity === poItem.quantity) {
    fields.push('quantity');
  }
  
  if (piItem.unitPrice && poItem.unitPrice && 
      Math.abs(piItem.unitPrice - poItem.unitPrice) / Math.max(piItem.unitPrice, poItem.unitPrice) < 0.1) {
    fields.push('unitPrice');
  }
  
  return fields;
}

  static generateMatchingSummary(matches, totalItems, unmatchedItems) {
    const matchedItems = matches.filter(m => m.matches && m.matches.length > 0).length;
    const highConfidenceMatches = matches.filter(m => 
      m.matches && m.matches.some(match => match.confidence >= 80)
    ).length;
    
    return {
      totalItems: totalItems || 0,
      unmatchedItems: unmatchedItems || 0,
      searchedItems: unmatchedItems || 0, // Items that were searched for matches
      matchedItems: matchedItems || 0,
      noMatchItems: Math.max(0, (unmatchedItems || 0) - (matchedItems || 0)),
      highConfidenceMatches: highConfidenceMatches || 0,
      matchRate: unmatchedItems > 0 ? Math.round((matchedItems / unmatchedItems) * 100) : 0,
      alreadyMatchedItems: Math.max(0, (totalItems || 0) - (unmatchedItems || 0))
    };
  }

  // Apply matches to PI items
  static applyMatches(piItems, selectedMatches) {
    if (!piItems || !Array.isArray(piItems) || !selectedMatches || !Array.isArray(selectedMatches)) {
      console.error('Invalid parameters for applyMatches');
      return piItems || [];
    }

    return piItems.map(item => {
      const selectedMatch = selectedMatches.find(m => m.piItemId === item.id);
      
      if (selectedMatch) {
        return {
          ...item,
          clientPO: selectedMatch.poNumber,
          clientLineItem: selectedMatch.lineItem,
          clientItemCode: selectedMatch.poItem?.productCode || selectedMatch.poItem?.itemCode,
          fsProjectCode: selectedMatch.po?.projectCode || selectedMatch.po?.orderNumber,
          // Metadata for tracking
          matchedFromPO: true,
          matchConfidence: selectedMatch.confidence,
          matchType: selectedMatch.matchType,
          linkedPOId: selectedMatch.po?.id
        };
      }
      
      return item;
    });
  }
}

// Note: Class is already exported above with "export class PIPOMatchingService"
