// src/services/ai/utils/numberParser.js
// Utilities for parsing and formatting numbers

/**
 * Parse a number from various formats
 * @param {any} value - The value to parse
 * @returns {number} The parsed number or 0 if invalid
 */
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, spaces, and other non-numeric characters
    // Keep decimal points and negative signs
    const cleaned = value.replace(/[^0-9.-]/g, '');
    
    // Handle multiple decimal points (keep only first)
    const parts = cleaned.split('.');
    const normalized = parts.length > 1 
      ? parts[0] + '.' + parts.slice(1).join('') 
      : cleaned;
    
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  if (value === null || value === undefined) return 0;
  
  // Try to convert other types
  const converted = Number(value);
  return isNaN(converted) ? 0 : converted;
}

/**
 * Format a number as currency
 * @param {number|string} value - The value to format
 * @param {string} currency - The currency code (default: MYR)
 * @param {string} locale - The locale for formatting (default: en-MY)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currency = 'MYR', locale = 'en-MY') {
  const numValue = parseNumber(value);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numValue);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${numValue.toFixed(2)}`;
  }
}

/**
 * Parse a percentage value
 * @param {string|number} value - The percentage value
 * @returns {number} The decimal representation (e.g., 50% returns 0.5)
 */
export function parsePercentage(value) {
  if (typeof value === 'string' && value.includes('%')) {
    return parseNumber(value.replace('%', '')) / 100;
  }
  
  // If it's already a decimal (e.g., 0.5 for 50%)
  const num = parseNumber(value);
  return num > 1 ? num / 100 : num;
}

/**
 * Format a number as percentage
 * @param {number} value - The decimal value (e.g., 0.5 for 50%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value, decimals = 0) {
  const percentage = parseNumber(value) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Round a number to specified decimal places
 * @param {number} value - The value to round
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Rounded number
 */
export function roundToDecimals(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(parseNumber(value) * factor) / factor;
}

/**
 * Format a number with thousand separators
 * @param {number} value - The value to format
 * @param {string} locale - The locale for formatting (default: en-MY)
 * @returns {string} Formatted number string
 */
export function formatNumber(value, locale = 'en-MY') {
  const numValue = parseNumber(value);
  
  try {
    return new Intl.NumberFormat(locale).format(numValue);
  } catch (error) {
    // Fallback formatting
    return numValue.toLocaleString();
  }
}

/**
 * Parse a number from accounting format (e.g., "(1,234.56)" for negative)
 * @param {string} value - The accounting format string
 * @returns {number} The parsed number
 */
export function parseAccountingNumber(value) {
  if (typeof value !== 'string') return parseNumber(value);
  
  // Check if it's negative (wrapped in parentheses)
  const isNegative = value.trim().startsWith('(') && value.trim().endsWith(')');
  
  // Remove parentheses and parse
  const cleaned = value.replace(/[()]/g, '');
  const parsed = parseNumber(cleaned);
  
  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Convert between currencies using a rate
 * @param {number} amount - The amount to convert
 * @param {number} rate - The exchange rate
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {number} Converted amount
 */
export function convertCurrency(amount, rate, decimals = 2) {
  const value = parseNumber(amount) * parseNumber(rate);
  return roundToDecimals(value, decimals);
}

/**
 * Calculate percentage change between two values
 * @param {number} oldValue - The original value
 * @param {number} newValue - The new value
 * @returns {number} The percentage change
 */
export function calculatePercentageChange(oldValue, newValue) {
  const old = parseNumber(oldValue);
  const current = parseNumber(newValue);
  
  if (old === 0) return current === 0 ? 0 : 100;
  
  return ((current - old) / Math.abs(old)) * 100;
}

/**
 * Parse numbers from different regional formats
 * @param {string} value - The value to parse
 * @param {string} format - The format type ('US', 'EU', 'AUTO')
 * @returns {number} The parsed number
 */
export function parseRegionalNumber(value, format = 'AUTO') {
  if (typeof value !== 'string') return parseNumber(value);
  
  const trimmed = value.trim();
  
  if (format === 'AUTO') {
    // Auto-detect format
    // EU format: 1.234,56 (dot for thousands, comma for decimal)
    // US format: 1,234.56 (comma for thousands, dot for decimal)
    
    const lastComma = trimmed.lastIndexOf(',');
    const lastDot = trimmed.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // Likely EU format
      format = 'EU';
    } else {
      // Likely US format
      format = 'US';
    }
  }
  
  let normalized = trimmed;
  
  if (format === 'EU') {
    // Replace dots with nothing (thousand separators)
    // Replace comma with dot (decimal separator)
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else {
    // US format - just remove commas
    normalized = normalized.replace(/,/g, '');
  }
  
  return parseNumber(normalized);
}

/**
 * Validate if a value is a valid number
 * @param {any} value - The value to validate
 * @returns {boolean} True if valid number
 */
export function isValidNumber(value) {
  const parsed = parseNumber(value);
  return !isNaN(parsed) && isFinite(parsed);
}

/**
 * Clamp a number between min and max values
 * @param {number} value - The value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
  const num = parseNumber(value);
  return Math.min(Math.max(num, min), max);
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - The number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
  const value = parseNumber(bytes);
  
  if (value === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  
  const i = Math.floor(Math.log(value) / Math.log(k));
  
  return parseFloat((value / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Sum an array of numbers
 * @param {Array} values - Array of values to sum
 * @returns {number} The sum
 */
export function sum(values) {
  if (!Array.isArray(values)) return 0;
  return values.reduce((total, value) => total + parseNumber(value), 0);
}

/**
 * Calculate average of an array of numbers
 * @param {Array} values - Array of values
 * @returns {number} The average
 */
export function average(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return sum(values) / values.length;
}
