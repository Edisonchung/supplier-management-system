// src/services/ai/utils/fuzzyMatch.js
export function fuzzyMatch(str1, str2, threshold = 0.8) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
  const similarity = calculateSimilarity(s1, s2);
  return similarity >= threshold;
}

export function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

export function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
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

// ===================================
// src/services/ai/utils/numberParser.js
export function parseNumber(value) {
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and spaces
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

export function formatCurrency(value, currency = 'MYR') {
  const numValue = parseNumber(value);
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency
  }).format(numValue);
}

export function parsePercentage(value) {
  if (typeof value === 'string' && value.includes('%')) {
    return parseNumber(value) / 100;
  }
  return parseNumber(value);
}

export function roundToDecimals(value, decimals = 2) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ===================================
// src/services/ai/utils/dateUtils.js
export function normalizeDate(dateValue) {
  if (!dateValue) return '';

  // If already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  try {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try parsing common formats
    const parsedDate = parseCommonDateFormats(dateValue);
    if (parsedDate) {
      return parsedDate;
    }

    return dateValue; // Return original if can't parse
  } catch (error) {
    console.error('Date parsing error:', error);
    return dateValue;
  }
}

export function parseCommonDateFormats(dateString) {
  const formats = [
    // MM/DD/YYYY
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
      parser: (match) => new Date(match[3], match[1] - 1, match[2])
    },
    // DD/MM/YYYY
    {
      regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
      parser: (match) => new Date(match[3], match[2] - 1, match[1])
    },
    // YYYY/MM/DD
    {
      regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      parser: (match) => new Date(match[1], match[2] - 1, match[3])
    },
    // DD Month YYYY
    {
      regex: /^(\d{1,2})\s+(\w+)\s+(\d{4})$/,
      parser: (match) => new Date(`${match[2]} ${match[1]}, ${match[3]}`)
    }
  ];

  for (const format of formats) {
    const match = dateString.match(format.regex);
    if (match) {
      const date = format.parser(match);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  return null;
}

export function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

export function daysBetween(date1, date2) {
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date, format = 'YYYY-MM-DD') {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day);
}
