// 🚀 Enhanced Category Management System
// File: src/utils/categoryManager.js

/**
 * 🎯 HIERARCHICAL CATEGORY STRUCTURE
 * Supports AI-suggested nested categories with intelligent mapping
 */
export const hierarchicalCategories = {
  'Industrial Automation': {
    icon: '⚙️',
    subcategories: [
      'Variable Frequency Drives (VFD)',
      'Programmable Logic Controllers (PLC)', 
      'Human Machine Interfaces (HMI)',
      'Motor Starters',
      'Safety Systems',
      'Servo Drives',
      'Motion Controllers',
      'Industrial Networks',
      'Process Controllers'
    ]
  },
  'Electronics': {
    icon: '🔌',
    subcategories: [
      'Power Supplies',
      'Circuit Breakers', 
      'Relays',
      'Contactors',
      'Transformers',
      'Capacitors',
      'Resistors',
      'Semiconductors'
    ]
  },
  'Hydraulics': {
    icon: '💧',
    subcategories: [
      'Hydraulic Pumps',
      'Hydraulic Valves',
      'Hydraulic Cylinders',
      'Hydraulic Motors',
      'Filters',
      'Accumulators',
      'Hoses & Fittings'
    ]
  },
  'Pneumatics': {
    icon: '💨',
    subcategories: [
      'Air Cylinders',
      'Pneumatic Valves',
      'Air Treatment',
      'Pneumatic Actuators',
      'Tubing & Fittings',
      'Pressure Regulators'
    ]
  },
  'Mechanical': {
    icon: '⚡',
    subcategories: [
      'Bearings',
      'Gears',
      'Couplings',
      'Belts',
      'Chains',
      'Sprockets',
      'Shafts',
      'Bushings'
    ]
  },
  'Sensors & Instrumentation': {
    icon: '📡',
    subcategories: [
      'Proximity Sensors',
      'Pressure Sensors',
      'Temperature Sensors',
      'Flow Sensors',
      'Level Sensors',
      'Vision Systems',
      'Encoders',
      'Load Cells'
    ]
  },
  'Cables & Connectivity': {
    icon: '🔗',
    subcategories: [
      'Power Cables',
      'Data Cables',
      'Fiber Optic',
      'Connectors',
      'Terminal Blocks',
      'Cable Management',
      'Industrial Ethernet'
    ]
  },
  'Fluid Handling': {
    icon: '🌊',
    subcategories: [
      'Centrifugal Pumps',
      'Diaphragm Pumps',
      'Gear Pumps',
      'Peristaltic Pumps',
      'Valves',
      'Flow Meters',
      'Pipe Fittings'
    ]
  },
  'Safety & Protection': {
    icon: '🛡️',
    subcategories: [
      'Emergency Stops',
      'Light Curtains',
      'Safety Mats',
      'Lockout/Tagout',
      'Personal Protective Equipment',
      'Gas Detection',
      'Fire Suppression'
    ]
  }
};

/**
 * 🧠 AI CATEGORY MAPPING
 * Maps AI-suggested categories to existing dropdown categories
 */
export const aiCategoryMappings = {
  // VFD & Drives
  'Industrial Automation > Variable Frequency Drives (VFD)': 'drives',
  'Variable Frequency Drives': 'drives',
  'VFD': 'drives',
  'Motor Drives': 'drives',
  'AC Drives': 'drives',
  
  // Automation
  'Industrial Automation > PLC': 'automation',
  'Programmable Logic Controllers': 'automation',
  'PLC': 'automation',
  'Industrial Automation': 'automation',
  'Process Control': 'automation',
  
  // Electronics
  'Electronics > Power Supply': 'electronics',
  'Power Electronics': 'electronics',
  'Electronic Components': 'electronics',
  'Circuit Protection': 'electronics',
  
  // Networking
  'Industrial Ethernet': 'networking',
  'Industrial Networks': 'networking',
  'Communication': 'networking',
  'Fieldbus': 'networking',
  
  // Mechanical
  'Mechanical Components': 'mechanical',
  'Power Transmission': 'mechanical',
  'Motion Control': 'mechanical',
  
  // Sensors
  'Sensors & Instrumentation': 'sensors',
  'Measurement': 'sensors',
  'Instrumentation': 'instrumentation',
  
  // Hydraulics/Pneumatics
  'Fluid Power': 'hydraulics',
  'Compressed Air': 'pneumatics',
  
  // Safety
  'Safety Systems': 'safety',
  'Machine Safety': 'safety',
  'Functional Safety': 'safety'
};

/**
 * 🎯 SMART CATEGORY MATCHER
 * Finds the best matching category using AI and fuzzy matching
 */
export const findBestCategoryMatch = (aiSuggestedCategory, availableCategories) => {
  if (!aiSuggestedCategory) return null;
  
  // Direct mapping check
  const directMatch = aiCategoryMappings[aiSuggestedCategory];
  if (directMatch && availableCategories.includes(directMatch)) {
    return {
      category: directMatch,
      confidence: 100,
      method: 'direct_mapping',
      originalSuggestion: aiSuggestedCategory
    };
  }
  
  // Fuzzy matching for partial matches
  const fuzzyMatches = availableCategories.map(category => {
    const similarity = calculateSimilarity(aiSuggestedCategory.toLowerCase(), category.toLowerCase());
    return { category, similarity };
  }).sort((a, b) => b.similarity - a.similarity);
  
  const bestFuzzyMatch = fuzzyMatches[0];
  
  if (bestFuzzyMatch.similarity > 0.6) {
    return {
      category: bestFuzzyMatch.category,
      confidence: Math.round(bestFuzzyMatch.similarity * 100),
      method: 'fuzzy_matching',
      originalSuggestion: aiSuggestedCategory
    };
  }
  
  // Keyword-based matching
  const keywordMatch = findKeywordMatch(aiSuggestedCategory, availableCategories);
  if (keywordMatch) {
    return {
      category: keywordMatch.category,
      confidence: keywordMatch.confidence,
      method: 'keyword_matching',
      originalSuggestion: aiSuggestedCategory
    };
  }
  
  return null;
};

/**
 * 🔍 KEYWORD MATCHING
 * Matches categories based on keywords
 */
const findKeywordMatch = (aiCategory, availableCategories) => {
  const categoryKeywords = {
    'drives': ['drive', 'vfd', 'frequency', 'motor', 'inverter', 'speed'],
    'automation': ['plc', 'logic', 'control', 'automation', 'programmable'],
    'electronics': ['electronic', 'power', 'supply', 'circuit', 'electrical'],
    'networking': ['network', 'ethernet', 'communication', 'fieldbus', 'protocol'],
    'sensors': ['sensor', 'detection', 'measurement', 'proximity', 'temperature'],
    'hydraulics': ['hydraulic', 'fluid', 'pump', 'valve', 'cylinder'],
    'pneumatics': ['pneumatic', 'air', 'compressed', 'cylinder'],
    'mechanical': ['bearing', 'gear', 'coupling', 'mechanical', 'transmission'],
    'safety': ['safety', 'protection', 'emergency', 'guard']
  };
  
  const aiCategoryLower = aiCategory.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (availableCategories.includes(category)) {
      const matchCount = keywords.filter(keyword => 
        aiCategoryLower.includes(keyword)
      ).length;
      
      if (matchCount > 0) {
        return {
          category,
          confidence: Math.min(90, 50 + (matchCount * 15))
        };
      }
    }
  }
  
  return null;
};

/**
 * 📊 SIMILARITY CALCULATION
 * Levenshtein distance based similarity
 */
const calculateSimilarity = (str1, str2) => {
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
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  return (maxLength - matrix[str2.length][str1.length]) / maxLength;
};

/**
 * 🎯 DYNAMIC CATEGORY GENERATOR
 * Creates new categories from AI suggestions
 */
export const generateDynamicCategory = (aiSuggestedCategory) => {
  if (!aiSuggestedCategory) return null;
  
  // Clean and format the category
  let cleanCategory = aiSuggestedCategory
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
  
  // Handle hierarchical categories (e.g., "Industrial Automation > VFD")
  if (aiSuggestedCategory.includes('>')) {
    const parts = aiSuggestedCategory.split('>').map(part => part.trim());
    cleanCategory = parts[parts.length - 1]
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }
  
  return {
    value: cleanCategory,
    label: aiSuggestedCategory,
    isAIGenerated: true,
    confidence: 85,
    source: 'ai_suggestion'
  };
};

/**
 * 🔄 CATEGORY LEARNING SYSTEM
 * Learns from user corrections to improve future suggestions
 */
export class CategoryLearningSystem {
  constructor() {
    this.corrections = this.loadCorrections();
  }
  
  loadCorrections() {
    try {
      return JSON.parse(localStorage.getItem('category_corrections') || '[]');
    } catch {
      return [];
    }
  }
  
  saveCorrections() {
    try {
      localStorage.setItem('category_corrections', JSON.stringify(this.corrections));
    } catch (error) {
      console.warn('Failed to save category corrections:', error);
    }
  }
  
  recordCorrection(aiSuggestion, userChoice, context = {}) {
    const correction = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      aiSuggestion,
      userChoice,
      context: {
        productName: context.productName,
        brand: context.brand,
        description: context.description?.substring(0, 100),
        ...context
      }
    };
    
    this.corrections.push(correction);
    this.saveCorrections();
    
    console.log('📚 Category Learning: Recorded correction', correction);
  }
  
  getCorrectionPattern(aiSuggestion) {
    const patterns = this.corrections.filter(c => 
      c.aiSuggestion === aiSuggestion
    );
    
    if (patterns.length === 0) return null;
    
    // Find most common user choice
    const choiceCounts = {};
    patterns.forEach(p => {
      choiceCounts[p.userChoice] = (choiceCounts[p.userChoice] || 0) + 1;
    });
    
    const mostCommon = Object.entries(choiceCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      suggestedCategory: mostCommon[0],
      confidence: Math.round((mostCommon[1] / patterns.length) * 100),
      correctionCount: patterns.length
    };
  }
}

/**
 * 🎨 CATEGORY DISPLAY UTILITIES
 */
export const getCategoryDisplay = (category) => {
  // Find in hierarchical structure
  for (const [mainCategory, data] of Object.entries(hierarchicalCategories)) {
    if (data.subcategories.includes(category)) {
      return {
        main: mainCategory,
        sub: category,
        icon: data.icon,
        display: `${data.icon} ${mainCategory} > ${category}`
      };
    }
  }
  
  // Handle flat categories
  const categoryLabels = {
    'drives': '⚡ Variable Frequency Drives',
    'automation': '⚙️ Industrial Automation',
    'electronics': '🔌 Electronics',
    'networking': '🌐 Networking',
    'sensors': '📡 Sensors',
    'hydraulics': '💧 Hydraulics',
    'pneumatics': '💨 Pneumatics',
    'mechanical': '⚡ Mechanical',
    'safety': '🛡️ Safety',
    'cables': '🔗 Cables',
    'components': '🔧 Components'
  };
  
  return {
    main: category,
    sub: null,
    icon: categoryLabels[category]?.split(' ')[0] || '📦',
    display: categoryLabels[category] || category
  };
};

// 🚀 Export the learning system instance
export const categoryLearning = new CategoryLearningSystem();
