/**
 * ClientMatchingService - Phase 4
 * 
 * Provides fuzzy matching of extracted client names to existing clients.
 * Used after AI extraction to auto-populate client data and business terms.
 */

import { db } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

class ClientMatchingService {
  
  /**
   * Find best matching client from extracted name
   * Uses multiple matching strategies with confidence scoring
   * 
   * @param {string} extractedName - Client name from AI extraction
   * @param {Array} existingClients - Array of client objects from Firestore
   * @returns {Object} - { match: client|null, confidence: number, matchType: string }
   */
  static findBestMatch(extractedName, existingClients = []) {
    if (!extractedName || !existingClients.length) {
      return { match: null, confidence: 0, matchType: 'none' };
    }

    const normalizedExtracted = this.normalizeName(extractedName);
    let bestMatch = null;
    let bestScore = 0;
    let matchType = 'none';

    for (const client of existingClients) {
      // Strategy 1: Exact match on name
      const normalizedClientName = this.normalizeName(client.name);
      if (normalizedExtracted === normalizedClientName) {
        return { match: client, confidence: 100, matchType: 'exact' };
      }

      // Strategy 2: Exact match on short name
      if (client.shortName) {
        const normalizedShortName = this.normalizeName(client.shortName);
        if (normalizedExtracted === normalizedShortName || 
            normalizedExtracted.includes(normalizedShortName) ||
            normalizedShortName.includes(normalizedExtracted)) {
          if (95 > bestScore) {
            bestScore = 95;
            bestMatch = client;
            matchType = 'shortName';
          }
        }
      }

      // Strategy 3: Contains match (extracted contains client name or vice versa)
      if (normalizedExtracted.includes(normalizedClientName) || 
          normalizedClientName.includes(normalizedExtracted)) {
        const score = this.calculateContainsScore(normalizedExtracted, normalizedClientName);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = client;
          matchType = 'contains';
        }
      }

      // Strategy 4: Fuzzy match using Levenshtein distance
      const fuzzyScore = this.calculateFuzzyScore(normalizedExtracted, normalizedClientName);
      if (fuzzyScore > bestScore) {
        bestScore = fuzzyScore;
        bestMatch = client;
        matchType = 'fuzzy';
      }

      // Strategy 5: Token-based matching
      const tokenScore = this.calculateTokenScore(normalizedExtracted, normalizedClientName);
      if (tokenScore > bestScore) {
        bestScore = tokenScore;
        bestMatch = client;
        matchType = 'token';
      }
    }

    // Only return match if confidence is above threshold
    if (bestScore >= 70) {
      return { match: bestMatch, confidence: bestScore, matchType };
    }

    return { match: null, confidence: bestScore, matchType: 'none' };
  }

  /**
   * Normalize company name for comparison
   */
  static normalizeName(name) {
    if (!name) return '';
    
    return name
      .toLowerCase()
      .trim()
      // Remove common suffixes
      .replace(/\s*(sdn\.?\s*bhd\.?|bhd\.?|plt|llc|inc\.?|corp\.?|ltd\.?|pte\.?|co\.?)\s*/gi, '')
      // Remove punctuation
      .replace(/[.,\-_()]/g, ' ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate score for contains-type matches
   */
  static calculateContainsScore(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.includes(shorter)) {
      // Score based on how much of the longer string is matched
      const ratio = shorter.length / longer.length;
      return Math.round(70 + (ratio * 25)); // 70-95 range
    }
    return 0;
  }

  /**
   * Calculate fuzzy match score using Levenshtein distance
   */
  static calculateFuzzyScore(str1, str2) {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    if (maxLength === 0) return 100;
    
    const similarity = ((maxLength - distance) / maxLength) * 100;
    return Math.round(similarity);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }
    
    return dp[m][n];
  }

  /**
   * Calculate token-based matching score
   */
  static calculateTokenScore(str1, str2) {
    const tokens1 = new Set(str1.split(/\s+/).filter(t => t.length > 2));
    const tokens2 = new Set(str2.split(/\s+/).filter(t => t.length > 2));
    
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = [...tokens1].filter(t => tokens2.has(t));
    const union = new Set([...tokens1, ...tokens2]);
    
    // Jaccard similarity
    const jaccardScore = (intersection.length / union.size) * 100;
    
    return Math.round(jaccardScore);
  }

  /**
   * Load all active clients from Firestore
   * Utility method for components that don't use useClients hook
   */
  static async loadClientsForMatching() {
    try {
      const q = query(
        collection(db, 'clients'),
        where('status', '==', 'active')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[ClientMatchingService] Error loading clients:', error);
      return [];
    }
  }

  /**
   * Process extracted PO data and match client
   * Main entry point for POModal integration
   * 
   * @param {Object} extractedData - Data from AI extraction
   * @param {Array} clients - Array of existing clients
   * @returns {Object} - Enhanced extracted data with client match info
   */
  static processExtractedDataWithClientMatch(extractedData, clients = []) {
    const clientName = extractedData.clientName || 
                       extractedData.client?.name || 
                       extractedData.buyer?.name ||
                       extractedData.shipTo?.company ||
                       '';

    console.log('[ClientMatchingService] Attempting to match client:', clientName);

    const { match, confidence, matchType } = this.findBestMatch(clientName, clients);

    if (match) {
      console.log(`[ClientMatchingService] ✅ Found match: "${match.name}" (${confidence}% confidence, ${matchType})`);
      
      return {
        ...extractedData,
        // Client match info
        clientMatch: {
          found: true,
          clientId: match.id,
          clientName: match.name,
          shortName: match.shortName,
          confidence,
          matchType,
          originalExtractedName: clientName
        },
        // Auto-populate from matched client
        clientId: match.id,
        clientName: match.name,
        clientShortName: match.shortName,
        clientEmail: match.email || extractedData.clientEmail || '',
        clientPhone: match.phone || extractedData.clientPhone || '',
        // Business terms from client profile
        paymentTerms: match.paymentTerms || extractedData.paymentTerms || 'Net 30',
        deliveryTerms: match.deliveryTerms || extractedData.deliveryTerms || 'DDP',
        currency: match.currency || extractedData.currency || 'MYR'
      };
    } else {
      console.log(`[ClientMatchingService] ❌ No match found for: "${clientName}" (best score: ${confidence}%)`);
      
      return {
        ...extractedData,
        clientMatch: {
          found: false,
          confidence,
          matchType,
          originalExtractedName: clientName,
          suggestedAction: 'manual_entry'
        }
      };
    }
  }

  /**
   * Get match suggestions for ambiguous matches
   * Returns top 3 potential matches for user selection
   */
  static getMatchSuggestions(extractedName, clients, limit = 3) {
    if (!extractedName || !clients.length) return [];

    const normalizedExtracted = this.normalizeName(extractedName);
    const scored = [];

    for (const client of clients) {
      const normalizedClientName = this.normalizeName(client.name);
      
      // Calculate combined score
      const fuzzyScore = this.calculateFuzzyScore(normalizedExtracted, normalizedClientName);
      const tokenScore = this.calculateTokenScore(normalizedExtracted, normalizedClientName);
      const combinedScore = Math.max(fuzzyScore, tokenScore);

      if (combinedScore >= 40) { // Lower threshold for suggestions
        scored.push({
          client,
          score: combinedScore,
          matchType: fuzzyScore > tokenScore ? 'fuzzy' : 'token'
        });
      }
    }

    // Sort by score descending and return top matches
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ client, score, matchType }) => ({
        id: client.id,
        name: client.name,
        shortName: client.shortName,
        confidence: score,
        matchType
      }));
  }
}

export default ClientMatchingService;
