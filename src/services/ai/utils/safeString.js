// src/services/ai/utils/safeString.js
// Safe string operations to prevent toLowerCase errors

/**
 * Safely convert a value to lowercase string
 * @param {*} value - Any value to convert to lowercase
 * @returns {string} - Lowercase string or empty string if invalid
 */
export function safeToLowerCase(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value !== 'string') {
    return String(value).toLowerCase();
  }
  return value.toLowerCase();
}

/**
 * Safely check if a string includes another string (case-insensitive)
 * @param {*} str - String to search in
 * @param {*} searchStr - String to search for
 * @returns {boolean} - Whether searchStr is found in str
 */
export function safeIncludes(str, searchStr) {
  if (!str || !searchStr) return false;
  return safeToLowerCase(str).includes(safeToLowerCase(searchStr));
}

/**
 * Safely compare two strings (case-insensitive)
 * @param {*} str1 - First string
 * @param {*} str2 - Second string
 * @returns {boolean} - Whether the strings are equal
 */
export function safeEquals(str1, str2) {
  if (str1 === str2) return true;
  if (!str1 || !str2) return false;
  return safeToLowerCase(str1) === safeToLowerCase(str2);
}

/**
 * Safely find an item in an array by comparing a property (case-insensitive)
 * @param {Array} array - Array to search
 * @param {string} property - Property name to compare
 * @param {*} value - Value to find
 * @returns {*} - Found item or undefined
 */
export function safeFindByProperty(array, property, value) {
  if (!Array.isArray(array) || !property || !value) {
    return undefined;
  }
  
  return array.find(item => {
    if (!item || !item[property]) return false;
    return safeEquals(item[property], value);
  });
}

/**
 * Safely filter an array by property inclusion (case-insensitive)
 * @param {Array} array - Array to filter
 * @param {string} property - Property name to check
 * @param {*} searchValue - Value to search for
 * @returns {Array} - Filtered array
 */
export function safeFilterByIncludes(array, property, searchValue) {
  if (!Array.isArray(array) || !property || !searchValue) {
    return [];
  }
  
  return array.filter(item => {
    if (!item || !item[property]) return false;
    return safeIncludes(item[property], searchValue);
  });
}

/**
 * Debug wrapper for toLowerCase to help identify error source
 * @param {*} value - Value to convert
 * @param {string} location - Where this is being called from
 * @returns {string} - Lowercase string
 */
export function debugToLowerCase(value, location = 'unknown') {
  try {
    if (value === null || value === undefined) {
      console.warn(`[SafeString] Attempted toLowerCase on ${value} at ${location}`);
      return '';
    }
    if (typeof value !== 'string') {
      console.warn(`[SafeString] toLowerCase called on non-string (${typeof value}) at ${location}:`, value);
      return String(value).toLowerCase();
    }
    return value.toLowerCase();
  } catch (error) {
    console.error(`[SafeString] toLowerCase error at ${location}:`, error, 'Value:', value);
    return '';
  }
}

// Export all functions
export default {
  safeToLowerCase,
  safeIncludes,
  safeEquals,
  safeFindByProperty,
  safeFilterByIncludes,
  debugToLowerCase
};
