// src/services/ProductEnrichmentService.js
class ProductEnrichmentService {
  
  // Brand detection patterns for major manufacturers
  static BRAND_PATTERNS = {
    'Siemens': [
      /^6[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}-\d[A-Z]{2}\d{1}$/,
      /^3[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}$/,
      /^1[A-Z]{2}\d{4}-\d[A-Z]{2}\d{2}$/
    ],
    'ABB': [
      /^[A-Z]{2,3}\d{3,6}(-\d{1,3})?$/,
      /^ACS\d{3}-\d{3}[A-Z]?$/
    ],
    'Schneider Electric': [
      /^[A-Z]{2,4}\d{4,6}[A-Z]?$/,
      /^LC1[A-Z]\d{2,4}$/,
      /^TM\d{3}[A-Z]+$/
    ],
    'Festo': [
      /^[A-Z]{2,4}-\d{2,4}(-[A-Z\d]+)?$/,
      /^DNC-\d{2,3}-\d{2,4}$/
    ],
    'SMC': [
      /^[A-Z]{2,4}\d{2,4}[A-Z]?(-\d+)?$/,
      /^CQ2[A-Z]\d{2}$/
    ],
    'Parker': [
      /^[A-Z]{1,3}\d{3,6}[A-Z]?$/,
      /^D1[A-Z]{2}\d{3}$/
    ],
    'Bosch Rexroth': [
      /^R\d{6}(-\d+)?$/,
      /^4WE\d{1,2}[A-Z]\d{2}$/
    ],
    'Omron': [
      /^[A-Z]{2,4}\d{3,6}(-[A-Z\d]+)?$/,
      /^E2E-[A-Z]\d{2}$/
    ],
    'SKF': [
      /^(NJ|NU|NUP|NF|NJG)\d{4}[A-Z]*$/,
      /^\d{5}$/,
      /^[A-Z]{2}\d{4}(-[A-Z\d]+)?$/
    ],
    'Timken': [
      /^[A-Z]{1,3}\d{4,6}[A-Z]?$/,
      /^HM\d{6}(\/\d+)?$/
    ],
    'Bearing Numbers': [
      /^\d{5}$/,
      /^32\d{3}$/,
      /^6\d{3}[A-Z]*$/
    ]
  };

  /**
   * Detect brand from part number using pattern matching
   */
  static detectBrandFromPartNumber(partNumber) {
    if (!partNumber) return null;
    
    const cleanPartNumber = partNumber.trim().toUpperCase();
    
    for (const [brand, patterns] of Object.entries(this.BRAND_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(cleanPartNumber)) {
          return brand;
        }
      }
    }
    
    // Additional heuristic checks
    if (cleanPartNumber.includes('SIEMENS') || cleanPartNumber.startsWith('6ES')) {
      return 'Siemens';
    }
    if (cleanPartNumber.includes('SKF') || /^(NJ|NU|32)\d{3,4}/.test(cleanPartNumber)) {
      return 'SKF';
    }
    
    return null;
  }

  /**
   * Categorize product based on part number and description
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
      [PRODUCT_CATEGORIES.CABLES]: ['cable', 'wire', 'connector', 'harness']
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
   * AI-powered product enrichment (uses your existing AI service)
   */
  static async enrichProductFromPartNumber(partNumber, basicDescription = '', aiService) {
    try {
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

      // Use your existing AI service to get enriched data
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

      // Fallback to pattern-based enrichment
      return this.patternBasedEnrichment(partNumber, basicDescription);
      
    } catch (error) {
      console.warn('AI enrichment failed, using pattern-based fallback:', error);
      return this.patternBasedEnrichment(partNumber, basicDescription);
    }
  }

  /**
   * Pattern-based enrichment fallback
   */
  static patternBasedEnrichment(partNumber, description) {
    const brand = this.detectBrandFromPartNumber(partNumber);
    const category = this.categorizeProduct(partNumber, description);
    const specs = this.extractSpecifications(description);
    
    // Generate product name
    let productName = description || partNumber;
    if (brand && !productName.toLowerCase().includes(brand.toLowerCase())) {
      productName = `${brand} ${productName}`;
    }

    return {
      productName: productName,
      brand: brand,
      category: category,
      description: description || `${brand || 'Industrial'} component - ${partNumber}`,
      specifications: specs,
      applications: [],
      confidence: brand ? 0.7 : 0.5
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
   * Validate and normalize part number
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
}
