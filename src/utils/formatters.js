/**
 * Formatters utility functions
 * Common formatting functions for currency, dates, etc.
 */

/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} currency - Currency code (default: MYR)
 * @param {string} locale - Locale for formatting (default: en-MY)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value, currency = 'MYR', locale = 'en-MY') => {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  
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
};

/**
 * Format a date string or Date object
 * @param {string|Date|number} date - Date to format
 * @param {boolean} includeTime - Whether to include time (default: false)
 * @returns {string} - Formatted date string
 */
export const formatDate = (date, includeTime = false) => {
  if (!date) return '-';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return String(date);
    }
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return dateObj.toLocaleDateString('en-MY', options);
  } catch (error) {
    return String(date);
  }
};

