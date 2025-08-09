// src/utils/productConstants.js

export const PRODUCT_CATEGORIES = {
  COMPONENTS: 'components',
  AUTOMATION: 'automation', 
  ELECTRONICS: 'electronics',
  MECHANICAL: 'mechanical',
  BEARINGS: 'bearings',
  SENSORS: 'sensors',
  HYDRAULICS: 'hydraulics',
  PNEUMATICS: 'pneumatics',
  CABLES: 'cables',
  PUMPS: 'pumps',
  DRIVES: 'drives'
};

export const BRAND_PATTERNS = {
  'Siemens': {
    patterns: [
      /^6[A-Z]{2}\d{4}-\d/,      // 6ES7407-0KA02-0AA0
      /^3[A-Z]{2}\d{4}-\d/,      // 3SE5162-0UB01-1AM4
      /^1[A-Z]{2}\d{4}-\d/,      // 1LA motors
      /^7[A-Z]{2}\d{4}-\d/,      // 7ML sensors
      /^5[A-Z]{2}\d{4}-\d/,      // 5SY breakers
      /SIEMENS/i, 
      /SIMATIC/i
    ],
    categories: {
      '6ES': 'automation',
      '3SE': 'automation', 
      '7ML': 'sensors',
      '1LA': 'automation',
      '5SY': 'electronics'
    }
  },
  
  'SKF': {
    patterns: [
      /^(NJ|NU|NUP|NF|NJG)\d{4}[A-Z]*$/,  // Cylindrical bearings
      /^\d{5}$/,                           // 5-digit numbers
      /^6\d{3}[A-Z\-]*$/,                  // Deep groove: 6309-2Z
      /^3\d{4}[A-Z\-]*$/,                  // Tapered: 32222
      /SKF/i
    ],
    categories: { 
      '3': 'bearings', 
      '6': 'bearings', 
      'NJ': 'bearings',
      'NU': 'bearings'
    }
  },
  
  'ABB': {
    patterns: [
      /^ACS\d{3}-\d{3}/,
      /^AF\d{2}-\d{2}/,
      /ABB/i
    ],
    categories: { 
      'ACS': 'drives', 
      'AF': 'automation' 
    }
  },
  
  'Schneider Electric': {
    patterns: [
      /^TM\d{3}[A-Z]+/,
      /^LC1[A-Z]\d{2}/,
      /^XPSMC\d{2}/,
      /^VW3A\d{4}/,
      /^BMXCPS\d{4}/,
      /^XS\d{3}B\d/,
      /SCHNEIDER/i
    ],
    categories: {
      'TM': 'automation',
      'LC1': 'electronics',
      'XPS': 'automation',
      'VW3': 'drives',
      'BMX': 'automation',
      'XS': 'sensors'
    }
  },
  
  'Festo': {
    patterns: [
      /^DSBC-\d{2}-\d{3}/,
      /^CPE\d{2}-M\d/,
      /^SIEN-M\d{2}/,
      /^MSN\d[A-Z]-\d/,
      /^VMPA\d-M\d/,
      /FESTO/i
    ],
    categories: {
      'DSBC': 'pneumatics',
      'CPE': 'pneumatics', 
      'SIEN': 'sensors',
      'MSN': 'pneumatics',
      'VMPA': 'pneumatics'
    }
  },
  
  'Allen-Bradley': {
    patterns: [
      /^1756-[A-Z]\d{2}/,
      /^440R-[A-Z]\d{5}/,
      /^2097-[A-Z]\d{2}/,
      /^1794-[A-Z]{2}\d/,
      /^800F-[A-Z]\d/,
      /ALLEN.BRADLEY/i,
      /ROCKWELL/i
    ],
    categories: {
      '1756': 'automation',
      '440R': 'automation',
      '2097': 'drives',
      '1794': 'automation',
      '800F': 'electronics'
    }
  }
};

// Export default for compatibility
export default {
  PRODUCT_CATEGORIES,
  BRAND_PATTERNS
};
