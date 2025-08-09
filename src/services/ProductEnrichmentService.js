// src/services/ProductEnrichmentService.js

// ✅ FIXED: Add constants directly since import might not be available
const PRODUCT_CATEGORIES = {
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
  DRIVES: 'drives',
  VALVES: 'valves',
  MOTORS: 'motors'
};

// ✅ ENHANCED: Export the class with proper export statement
export class ProductEnrichmentService {
  
  // ✅ ENHANCED: Updated brand detection patterns with confidence scoring
  static BRAND_PATTERNS = {
    'Siemens': {
      patterns: [
        /^6[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}-\d[A-Z]{2}\d{1}$/,
        /^3[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}$/,
        /^1[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}$/,
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
    'ABB': {
      patterns: [
        /^[A-Z]{2,3}\d{3,6}(-\d{1,3})?$/,
        /^ACS\d{3}-\d{3}[A-Z]?$/,
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
        /^[A-Z]{2,4}\d{4,6}[A-Z]?$/,
        /^LC1[A-Z]\d{2,4}$/,
        /^TM\d{3}[A-Z]+$/,
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
        /^[A-Z]{2,4}-\d{2,4}(-[A-Z\d]+)?$/,
        /^DNC-\d{2,3}-\d{2,4}$/,
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
    'SMC': {
      patterns: [
        /^[A-Z]{2,4}\d{2,4}[A-Z]?(-\d+)?$/,
        /^CQ2[A-Z]\d{2}$/,
        /SMC/i
      ],
      categories: {
        'CQ2': 'pneumatics'
      }
    },
    'Parker': {
      patterns: [
        /^[A-Z]{1,3}\d{3,6}[A-Z]?$/,
        /^D1[A-Z]{2}\d{3}$/,
        /PARKER/i
      ],
      categories: {
        'D1': 'hydraulics'
      }
    },
    'Bosch Rexroth': {
      patterns: [
        /^R\d{6}(-\d+)?$/,
        /^4WE\d{1,2}[A-Z]\d{2}$/,
        /REXROTH/i,
        /BOSCH/i
      ],
      categories: {
        'R': 'hydraulics',
        '4WE': 'hydraulics'
      }
    },
    'Omron': {
      patterns: [
        /^[A-Z]{2,4}\d{3,6}(-[A-Z\d]+)?$/,
        /^E2E-[A-Z]\d{2}$/,
        /OMRON/i
      ],
      categories: {
        'E2E': 'sensors'
      }
    },
    'SKF': {
      patterns: [
        /^(NJ|NU|NUP|NF|NJG)\d{4}[A-Z]*$/,
        /^\d{5}$/,
        /^[A-Z]{2}\d{4}(-[A-Z\d]+)?$/,
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
    'Timken': {
      patterns: [
        /^[A-Z]{1,3}\d{4,6}[A-Z]?$/,
        /^HM\d{6}(\/\d+)?$/,
        /TIMKEN/i
      ],
      categories: {
        'HM': 'bearings'
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

  /**
   * ✅ ENHANCED: Detect brand from part number with confidence scoring
   */
  static detectBrandFromPartNumber(partNumber, description = '') {
    if (!partNumber) return null;
    
    const cleanPartNumber = partNumber.trim().toUpperCase();
    const combinedText = `${partNumber} ${description}`.toUpperCase();
    
    for (const [brandName, brandConfig] of Object.entries(this.BRAND_PATTERNS)) {
      let confidence = 0;
      
      // Pattern matching (high confidence)
      for (const pattern of brandConfig.patterns) {
        if (pattern.test(cleanPartNumber)) {
          confidence = Math.max(confidence, 0.9);
          break;
        }
      }
      
      // Text matching (medium confidence)
      if (confidence === 0) {
        for (const pattern of brandConfig.patterns) {
          if (pattern.test(combinedText)) {
            confidence = Math.max(confidence, 0.7);
          }
        }
      }
      
      if (confidence > 0.5) {
        return {
          brand: brandName,
          confidence,
          category: this.detectCategory(cleanPartNumber, brandConfig)
        };
      }
    }
    
    // Additional heuristic checks with confidence
    if (cleanPartNumber.includes('SIEMENS') || cleanPartNumber.startsWith('6ES')) {
      return { brand: 'Siemens', confidence: 0.8, category: 'automation' };
    }
    if (cleanPartNumber.includes('SKF') || /^(NJ|NU|32)\d{3,4}/.test(cleanPartNumber)) {
      return { brand: 'SKF', confidence: 0.8, category: 'bearings' };
    }
    
    return null;
  }

  /**
   * ✅ NEW: Detect category from part number using brand config
   */
  static detectCategory(partNumber, brandConfig) {
    if (!brandConfig.categories) return 'components';
    
    for (const [prefix, category] of Object.entries(brandConfig.categories)) {
      if (partNumber.startsWith(prefix)) {
        return category;
      }
    }
    
    return 'components';
  }

  /**
   * ✅ ENHANCED: Categorize product based on part number and description
   */
  static categorizeProduct(partNumber, description) {
    const text = `${partNumber} ${description}`.toLowerCase();
    
    const categoryMap = {
      [PRODUCT_CATEGORIES.BEARINGS]: ['bearing', 'ball bearing', 'roller bearing', 'thrust bearing'],
      [PRODUCT_CATEGORIES.PUMPS]: ['pump', 'hydraulic pump', 'gear pump', 'piston pump'],
      [PRODUCT_CATEGORIES.VALVES]: ['valve', 'ball valve', 'gate valve', 'control valve', 'solenoid valve'],
      [PRODUCT_CATEGORIES.MOTORS]: ['motor', 'servo motor', 'stepper motor', 'ac motor', 'dc motor'],
      [PRODUCT_CATEGORIES.SENSORS]: ['sensor', 'proximity sensor', 'pressure sensor', 'temperature sensor'],
      [PRODUCT_CATEGORIES.HYDRAULICS]: ['hydraulic', 'cylinder', 'actuator', 'manifold'],
      [PRODUCT_CATEGORIES.PNEUMATICS]: ['pneumatic', 'air cylinder', 'air valve', 'festo', 'smc'],
      [PRODUCT_CATEGORIES.ELECTRONICS]: ['plc', 'hmi', 'inverter', 'relay', 'contactor'],
      [PRODUCT_CATEGORIES.AUTOMATION]: ['automation', 'robot', 'servo', 'controller'],
      [PRODUCT_CATEGORIES.CABLES]: ['cable', 'wire', 'connector', 'harness'],
      [PRODUCT_CATEGORIES.DRIVES]: ['drive', 'motor drive', 'frequency drive', 'vfd']
    };

    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return PRODUCT_CATEGORIES.COMPONENTS;
  }

  /**
   * Extract specifications from product description
   */
  static extractSpecifications(description) {
    if (!description) return {};
    
    const specs = {};
    
    // Dimension patterns
    const dimensionPatterns = [
      /(\d+\.?\d*\s*x\s*\d+\.?\d*\s*x\s*\d+\.?\d*)\s*(mm|cm|inch|in)/gi,
      /(d\s*x\s*d\s*x\s*w:\s*\d+mm\s*x\s*\d+mm\s*x\s*\d+mm)/gi,
      /(\d+mm\s*x\s*\d+mm\s*x\s*\d+mm)/gi
    ];
    
    dimensionPatterns.forEach(pattern => {
      const match = description.match(pattern);
      if (match) {
        specs.dimensions = match[0];
      }
    });

    // Voltage patterns
    const voltageMatch = description.match(/(\d+\.?\d*\s*v(?:olts?)?)/gi);
    if (voltageMatch) {
      specs.voltage = voltageMatch[0];
    }

    // Weight patterns
    const weightMatch = description.match(/(\d+\.?\d*\s*(?:kg|g|lb|lbs))/gi);
    if (weightMatch) {
      specs.weight = weightMatch[0];
    }

    // Material patterns
    const materialPatterns = ['steel', 'stainless steel', 'aluminum', 'brass', 'plastic', 'rubber'];
    materialPatterns.forEach(material => {
      if (description.toLowerCase().includes(material)) {
        specs.material = material;
      }
    });

    return specs;
  }

  /**
   * ✅ ENHANCED: AI-powered product enrichment with improved fallback
   */
  static async enrichProductFromPartNumber(partNumber, basicDescription = '', aiService) {
    try {
      // Try AI service first if available
      if (aiService) {
        const enrichmentPrompt = `
        Analyze this industrial part number and description to provide detailed product information:
        
        Part Number: ${partNumber}
        Description: ${basicDescription}
        
        Please extract and provide:
        1. Full descriptive product name
        2. Manufacturer/brand name
        3. Product category
        4. Detailed technical description
        5. Technical specifications (dimensions, voltage, material, etc.)
        6. Common applications
        
        Return JSON format:
        {
          "productName": "Complete descriptive name",
          "brand": "Manufacturer name",
          "category": "Product category",
          "description": "Detailed technical description", 
          "specifications": {
            "dimensions": "Physical dimensions if available",
            "voltage": "Operating voltage if applicable",
            "material": "Construction material",
            "weight": "Product weight",
            "other": "Any other technical specs"
          },
          "applications": ["common", "use", "cases"],
          "confidence": 0.85
        }`;

        const result = await aiService.extractFromDocument(enrichmentPrompt, 'product_enrichment', {
          partNumber,
          description: basicDescription
        });

        if (result.success && result.data) {
          return {
            ...result.data,
            confidence: result.confidence || 0.7
          };
        }
      }

      // Fallback to pattern-based enrichment
      return this.patternBasedEnrichment(partNumber, basicDescription);
      
    } catch (error) {
      console.warn('AI enrichment failed, using pattern-based fallback:', error);
      return this.patternBasedEnrichment(partNumber, basicDescription);
    }
  }

  /**
   * ✅ ENHANCED: Pattern-based enrichment with improved brand detection
   */
  static patternBasedEnrichment(partNumber, description) {
    const brandResult = this.detectBrandFromPartNumber(partNumber, description);
    const category = this.categorizeProduct(partNumber, description);
    const specs = this.extractSpecifications(description);
    
    // Generate product name
    let productName = description || partNumber;
    if (brandResult?.brand && !productName.toLowerCase().includes(brandResult.brand.toLowerCase())) {
      productName = `${brandResult.brand} ${productName}`;
    }

    return {
      productName: productName,
      brand: brandResult?.brand || null,
      category: brandResult?.category || category,
      description: description || `${brandResult?.brand || 'Industrial'} component - ${partNumber}`,
      specifications: specs,
      applications: [],
      confidence: brandResult ? brandResult.confidence : 0.5
    };
  }

  /**
   * Generate internal SKU
   */
  static generateInternalSKU({ category, brand, partNumber }) {
    const timestamp = Date.now().toString().slice(-6);
    const categoryCode = (category || 'GEN').toUpperCase().slice(0, 3);
    const brandCode = (brand || 'UNK').toUpperCase().slice(0, 3);
    
    return `${categoryCode}-${brandCode}-${timestamp}`;
  }

  /**
   * ✅ ENHANCED: Validate and normalize part number with better patterns
   */
  static validateAndNormalizePartNumber(partNumber) {
    if (!partNumber || typeof partNumber !== 'string') {
      return { isValid: false, error: 'Part number required' };
    }

    // Clean and normalize
    let normalized = partNumber.trim().toUpperCase();
    
    // Remove common prefixes/suffixes
    normalized = normalized.replace(/^(PART|P\/N|PN|SKU)[\s\-\:]/i, '');
    normalized = normalized.replace(/[\s\-\:](PART|P\/N|PN|SKU)$/i, '');
    
    // Validation patterns
    const validPatterns = [
      /^[A-Z0-9\-\.\/]+$/i,           // Alphanumeric with separators
      /^\d{4,}[A-Z]*$/,               // Numeric with optional letters
      /^[A-Z]{2,}\d{3,}[A-Z\d\-]*$/,  // Letters + numbers
      /^[A-Z\d]{3,}$/                 // Mixed alphanumeric minimum 3 chars
    ];
    
    const isValid = normalized.length >= 3 && validPatterns.some(pattern => pattern.test(normalized));
    
    return {
      isValid,
      normalized,
      original: partNumber,
      error: isValid ? null : 'Invalid part number format (minimum 3 characters, alphanumeric)',
      suggestions: isValid ? [] : this.generatePartNumberSuggestions(partNumber)
    };
  }

  /**
   * Generate part number suggestions for invalid inputs
   */
  static generatePartNumberSuggestions(partNumber) {
    if (!partNumber) return [];
    
    const suggestions = [];
    const cleaned = partNumber.replace(/[^A-Z0-9\-]/gi, '').toUpperCase();
    
    if (cleaned.length >= 3) {
      suggestions.push(cleaned);
    }
    
    if (partNumber.includes(' ')) {
      suggestions.push(partNumber.replace(/\s+/g, '-').toUpperCase());
    }
    
    return suggestions;
  }

  /**
   * ✅ NEW: Add new brand pattern dynamically for learning
   */
  static addBrandPattern(brandName, pattern, category = 'components') {
    if (!this.BRAND_PATTERNS[brandName]) {
      this.BRAND_PATTERNS[brandName] = { patterns: [], categories: {} };
    }
    
    this.BRAND_PATTERNS[brandName].patterns.push(new RegExp(pattern, 'i'));
    
    const prefix = pattern.match(/\^([A-Z]+)/)?.[1];
    if (prefix && category !== 'components') {
      this.BRAND_PATTERNS[brandName].categories[prefix] = category;
    }
    
    console.log(`✅ Added pattern for ${brandName}: ${pattern}`);
  }

  /**
   * ✅ NEW: Get enhancement statistics
   */
  static getEnhancementStatistics() {
    return {
      totalBrands: Object.keys(this.BRAND_PATTERNS).length,
      totalPatterns: Object.values(this.BRAND_PATTERNS).reduce((sum, brand) => sum + brand.patterns.length, 0),
      supportedCategories: Object.keys(PRODUCT_CATEGORIES),
      version: '1.0.0'
    };
  }
}

// ✅ CRITICAL: Export the class as default AND named export for compatibility
export default ProductEnrichmentService;

// ✅ ALSO: Export the constants for use in other files
export { PRODUCT_CATEGORIES };
