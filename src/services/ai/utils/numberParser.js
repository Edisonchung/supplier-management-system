// src/services/ai/utils/numberParser.js
// Utilities for parsing and formatting numbers

/**
 * Parse a value to a number, handling various formats
 * @param {*} value - The value to parse
 * @returns {number} - Parsed number or 0 if invalid
 */
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Convert to string and clean
  const str = String(value);
  
  // Remove common formatting characters
  const cleaned = str
    .replace(/[^0-9.,\-]/g, '') // Keep only numbers, dots, commas, and minus
    .replace(/,/g, ''); // Remove thousand separators
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse an amount/currency value
 * @param {*} value - The value to parse
 * @returns {number} - Parsed amount
 */
export function parseAmount(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Convert to string
  const str = String(value);
  
  // Remove currency symbols and formatting
  const cleaned = str
    .replace(/[A-Z]{3}/g, '') // Remove currency codes (USD, MYR, etc.)
    .replace(/[^\d.-]/g, ''); // Keep only digits, dots, and minus
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (default: MYR)
 * @param {string} locale - Locale for formatting (default: en-MY)
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(value, currency = 'MYR', locale = 'en-MY') {
  const num = parseNumber(value);
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${num.toFixed(2)}`;
  }
}

/**
 * Format a number with thousand separators
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number
 */
export function formatNumber(value, decimals = 2) {
  const num = parseNumber(value);
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Parse percentage value
 * @param {*} value - The value to parse
 * @returns {number} - Percentage as decimal (e.g., 10% returns 0.1)
 */
export function parsePercentage(value) {
  if (!value) return 0;
  
  const str = String(value);
  
  // Check if it includes % sign
  if (str.includes('%')) {
    const cleaned = str.replace(/[^0-9.-]/g, '');
    return parseFloat(cleaned) / 100;
  }
  
  // If it's already a decimal (e.g., 0.1 for 10%)
  const num = parseFloat(str);
  if (!isNaN(num) && num < 1) {
    return num;
  }
  
  // If it's a whole number (e.g., 10 for 10%)
  return num / 100;
}

/**
 * Round a number to specified decimal places
 * @param {number} value - The value to round
 * @param {number} decimals - Number of decimal places
 * @returns {number} - Rounded number
 */
export function roundNumber(value, decimals = 2) {
  const num = parseNumber(value);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

/**
 * Calculate percentage
 * @param {number} value - The value
 * @param {number} total - The total
 * @returns {number} - Percentage
 */
export function calculatePercentage(value, total) {
  if (!total || total === 0) return 0;
  return (parseNumber(value) / parseNumber(total)) * 100;
}

/**
 * Parse quantity with unit detection
 * @param {*} value - The value to parse
 * @returns {object} - { quantity: number, unit: string }
 */
export function parseQuantity(value) {
  if (!value) return { quantity: 0, unit: '' };
  
  const str = String(value);
  const match = str.match(/^([\d.,]+)\s*([a-zA-Z]+)?$/);
  
  if (match) {
    return {
      quantity: parseNumber(match[1]),
      unit: match[2] || ''
    };
  }
  
  return {
    quantity: parseNumber(str),
    unit: ''
  };
}
