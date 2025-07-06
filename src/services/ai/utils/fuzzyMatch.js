// src/services/ai/utils/fuzzyMatch.js

import { safeToLowerCase } from './safeString';

/**
 * Fuzzy match two strings with safety checks
 * @param {*} str1 - First string to compare
 * @param {*} str2 - Second string to compare
 * @param {number} threshold - Matching threshold (0-1)
 * @returns {boolean} - Whether the strings match above the threshold
 */
export function fuzzyMatch(str1, str2, threshold = 0.8) {
  // Null/undefined checks
  if (!str1 || !str2) {
    return false;
  }
  
  // Convert to strings if necessary using the imported function
  const s1 = safeToLowerCase(str1).trim();
  const s2 = safeToLowerCase(str2).trim();
  
  // Empty string checks after conversion
  if (!s1 || !s2) {
    return false;
  }
  
  // Exact match
  if (s1 === s2) {
    return true;
  }
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) {
    return true;
  }
  
  // Calculate similarity
  const similarity = calculateSimilarity(s1, s2);
  return similarity >= threshold;
}

/**
 * Calculate similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score (0-1)
 */
export function calculateSimilarity(str1, str2) {
  // Safety checks
  if (!str1 || !str2) {
    return 0;
  }
  
  // Ensure strings
  const s1 = String(str1);
  const s2 = String(str2);
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
export function levenshteinDistance(str1, str2) {
  // Safety checks
  if (!str1 || !str2) {
    return Math.max(str1?.length || 0, str2?.length || 0);
  }
  
  // Ensure strings
  const s1 = String(str1);
  const s2 = String(str2);
  
  // Quick returns
  if (s1 === s2) {
    return 0;
  }
  
  if (s1.length === 0) {
    return s2.length;
  }
  
  if (s2.length === 0) {
    return s1.length;
  }
  
  // Create matrix
  const matrix = [];
  
  // Initialize first column
  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }
  
  // Initialize first row
  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
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
  
  return matrix[s2.length][s1.length];
}

/**
 * Find best matching string from an array
 * @param {string} input - Input string to match
 * @param {string[]} options - Array of strings to match against
 * @param {number} threshold - Minimum similarity threshold
 * @returns {string|null} - Best matching string or null
 */
export function findBestMatch(input, options, threshold = 0.5) {
  if (!input || !Array.isArray(options) || options.length === 0) {
    return null;
  }
  
  const inputLower = safeToLowerCase(input).trim();
  if (!inputLower) {
    return null;
  }
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const option of options) {
    if (!option) continue;
    
    const optionLower = safeToLowerCase(option).trim();
    if (!optionLower) continue;
    
    // Exact match
    if (optionLower === inputLower) {
      return option;
    }
    
    // Calculate similarity
    const similarity = calculateSimilarity(inputLower, optionLower);
    
    if (similarity > bestScore && similarity >= threshold) {
      bestScore = similarity;
      bestMatch = option;
    }
  }
  
  return bestMatch;
}

/**
 * Check if two strings are similar enough
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} maxDistance - Maximum allowed edit distance
 * @returns {boolean} - Whether strings are similar
 */
export function areSimilar(str1, str2, maxDistance = 3) {
  if (!str1 || !str2) {
    return false;
  }
  
  const s1 = safeToLowerCase(str1).trim();
  const s2 = safeToLowerCase(str2).trim();
  
  if (!s1 || !s2) {
    return false;
  }
  
  if (s1 === s2) {
    return true;
  }
  
  const distance = levenshteinDistance(s1, s2);
  return distance <= maxDistance;
}

/**
 * Get similarity percentage between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
export function getSimilarityPercentage(str1, str2) {
  const similarity = calculateSimilarity(str1, str2);
  return Math.round(similarity * 100);
}

// Export all functions as default as well
export default {
  fuzzyMatch,
  calculateSimilarity,
  levenshteinDistance,
  findBestMatch,
  areSimilar,
  getSimilarityPercentage
};
