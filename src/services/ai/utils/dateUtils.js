// src/services/ai/utils/dateUtils.js
// Utilities for parsing and formatting dates

/**
 * Normalize a date to YYYY-MM-DD format
 * @param {string|Date} dateValue - The date to normalize
 * @returns {string} Normalized date string or empty string if invalid
 */
export function normalizeDate(dateValue) {
  if (!dateValue) return '';

  // If already in YYYY-MM-DD format
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  try {
    // Try parsing as Date object
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return formatDate(date, 'YYYY-MM-DD');
    }

    // Try parsing common formats
    if (typeof dateValue === 'string') {
      const parsed = parseCommonDateFormats(dateValue);
      if (parsed) return parsed;
    }

    return ''; // Return empty string if can't parse
  } catch (error) {
    console.error('Date parsing error:', error);
    return '';
  }
}

/**
 * Parse common date formats
 * @param {string} dateString - The date string to parse
 * @returns {string|null} Normalized date or null if can't parse
 */
export function parseCommonDateFormats(dateString) {
  const formats = [
    // MM/DD/YYYY or MM-DD-YYYY
    {
      regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
      parser: (match) => {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        
        // Validate month and day
        if (month > 12) {
          // Might be DD/MM/YYYY format
          return new Date(year, day - 1, month);
        }
        return new Date(year, month - 1, day);
      }
    },
    // YYYY/MM/DD or YYYY-MM-DD
    {
      regex: /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
      parser: (match) => new Date(match[1], match[2] - 1, match[3])
    },
    // DD MMM YYYY or DD MMMM YYYY (e.g., "15 Jan 2024" or "15 January 2024")
    {
      regex: /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
      parser: (match) => new Date(`${match[2]} ${match[1]}, ${match[3]}`)
    },
    // MMM DD, YYYY (e.g., "Jan 15, 2024")
    {
      regex: /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/,
      parser: (match) => new Date(`${match[1]} ${match[2]}, ${match[3]}`)
    },
    // YYYY年MM月DD日 (Asian format)
    {
      regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/,
      parser: (match) => new Date(match[1], match[2] - 1, match[3])
    },
    // DD.MM.YYYY (European format)
    {
      regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
      parser: (match) => new Date(match[3], match[2] - 1, match[1])
    },
    // ISO 8601 with time (2024-01-15T10:30:00)
    {
      regex: /^(\d{4})-(\d{2})-(\d{2})T/,
      parser: (match) => new Date(dateString)
    }
  ];

  for (const format of formats) {
    const match = dateString.trim().match(format.regex);
    if (match) {
      try {
        const date = format.parser(match);
        if (!isNaN(date.getTime())) {
          return formatDate(date, 'YYYY-MM-DD');
        }
      } catch (e) {
        continue;
      }
    }
  }

  return null;
}

/**
 * Check if a date string is valid
 * @param {string} dateString - The date string to validate
 * @returns {boolean} True if valid date
 */
export function isValidDate(dateString) {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format a date according to a pattern
 * @param {Date|string} date - The date to format
 * @param {string} format - The format pattern (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthNamesShort = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return format
    .replace('YYYY', year)
    .replace('YY', String(year).slice(-2))
    .replace('MMMM', monthNames[d.getMonth()])
    .replace('MMM', monthNamesShort[d.getMonth()])
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * Calculate days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days between dates
 */
export function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Add days to a date
 * @param {Date|string} date - The base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} New date
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add months to a date
 * @param {Date|string} date - The base date
 * @param {number} months - Number of months to add (can be negative)
 * @returns {Date} New date
 */
export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the start of a time period
 * @param {Date|string} date - The date
 * @param {string} period - 'day', 'week', 'month', 'year'
 * @returns {Date} Start of period
 */
export function startOf(date, period) {
  const d = new Date(date);
  
  switch (period) {
    case 'day':
      d.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = d.getDay();
      const diff = d.getDate() - day;
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      break;
    case 'month':
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      break;
    case 'year':
      d.setMonth(0, 1);
      d.setHours(0, 0, 0, 0);
      break;
  }
  
  return d;
}

/**
 * Get the end of a time period
 * @param {Date|string} date - The date
 * @param {string} period - 'day', 'week', 'month', 'year'
 * @returns {Date} End of period
 */
export function endOf(date, period) {
  const d = new Date(date);
  
  switch (period) {
    case 'day':
      d.setHours(23, 59, 59, 999);
      break;
    case 'week':
      const day = d.getDay();
      const diff = 6 - day;
      d.setDate(d.getDate() + diff);
      d.setHours(23, 59, 59, 999);
      break;
    case 'month':
      d.setMonth(d.getMonth() + 1, 0);
      d.setHours(23, 59, 59, 999);
      break;
    case 'year':
      d.setMonth(11, 31);
      d.setHours(23, 59, 59, 999);
      break;
  }
  
  return d;
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the past
 */
export function isPast(date) {
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < now;
}

/**
 * Check if a date is in the future
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the future
 */
export function isFuture(date) {
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d > now;
}

/**
 * Check if a date is today
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

/**
 * Get relative time string (e.g., "2 days ago", "in 3 hours")
 * @param {Date|string} date - The date
 * @returns {string} Relative time string
 */
export function getRelativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = d - now;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (Math.abs(diffDays) > 30) {
    return formatDate(d, 'MMM DD, YYYY');
  }
  
  if (diffDays === 0) {
    if (diffHours === 0) {
      if (diffMins === 0) {
        return 'just now';
      }
      return diffMins > 0 ? `in ${diffMins} minutes` : `${Math.abs(diffMins)} minutes ago`;
    }
    return diffHours > 0 ? `in ${diffHours} hours` : `${Math.abs(diffHours)} hours ago`;
  }
  
  if (diffDays === 1) return 'tomorrow';
  if (diffDays === -1) return 'yesterday';
  
  return diffDays > 0 ? `in ${diffDays} days` : `${Math.abs(diffDays)} days ago`;
}

/**
 * Parse a date with timezone
 * @param {string} dateString - The date string with timezone
 * @param {string} timezone - The timezone (e.g., 'America/New_York')
 * @returns {Date} Date object
 */
export function parseWithTimezone(dateString, timezone = 'UTC') {
  try {
    // This is a simplified version. For full timezone support,
    // consider using a library like date-fns-tz or moment-timezone
    const date = new Date(dateString);
    if (timezone === 'UTC') {
      return new Date(date.toISOString());
    }
    return date;
  } catch (error) {
    console.error('Timezone parsing error:', error);
    return new Date(dateString);
  }
}

/**
 * Get the quarter of a date
 * @param {Date|string} date - The date
 * @returns {number} Quarter (1-4)
 */
export function getQuarter(date) {
  const d = new Date(date);
  return Math.floor(d.getMonth() / 3) + 1;
}

/**
 * Check if a year is a leap year
 * @param {number} year - The year
 * @returns {boolean} True if leap year
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Get business days between two dates (excluding weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Number of business days
 */
export function businessDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  while (start <= end) {
    const dayOfWeek = start.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      count++;
    }
    start.setDate(start.getDate() + 1);
  }
  
  return count;
}

/**
 * Add business days to a date
 * @param {Date|string} date - The base date
 * @param {number} days - Number of business days to add
 * @returns {Date} New date
 */
export function addBusinessDays(date, days) {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
      addedDays++;
    }
  }
  
  return result;
}
