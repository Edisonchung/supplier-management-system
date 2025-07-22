// src/utils/brandConfig.js
export const BRAND_CONFIGURATIONS = {
  faradaytech: {
    id: 'faradaytech',
    name: 'FaradayTech',
    categories: ['mechanical', 'bearings', 'gears', 'couplings', 'drives'],
    colors: { primary: '#1e40af', secondary: '#3b82f6' },
    logo: '/assets/brands/faradaytech-logo.png',
    description: 'Mechanical engineering solutions and power transmission products',
    rebrandingCriteria: {
      shouldRebrandWhen: [
        'mechanical_expertise_needed',
        'customer_prefers_local_brand', 
        'better_margins_available',
        'we_provide_better_support'
      ],
      keepOriginalWhen: [
        'premium_brand_recognition',
        'customer_mandated_original',
        'warranty_restrictions'
      ]
    }
  },
  
  faraday_instruments: {
    id: 'faraday_instruments', 
    name: 'Faraday Instruments',
    categories: ['sensors', 'instrumentation', 'networking_products', 'automation'],
    colors: { primary: '#059669', secondary: '#10b981' },
    logo: '/assets/brands/faraday-instruments-logo.png',
    description: 'Advanced instrumentation and sensor technology solutions',
    rebrandingCriteria: {
      shouldRebrandWhen: [
        'technical_support_advantage',
        'system_integration_needed',
        'customization_available',
        'faster_delivery'
      ],
      keepOriginalWhen: [
        'oem_partnership',
        'certification_requirements',
        'customer_brand_loyalty'
      ]
    }
  },
  
  hydra: {
    id: 'hydra',
    name: 'Hydra',
    categories: ['diaphragm_pumps', 'pumping_systems', 'fluid_handling', 'pneumatics'],
    colors: { primary: '#0891b2', secondary: '#0e7490' },
    logo: '/assets/brands/hydra-logo.png',
    description: 'Specialized pumping and fluid handling solutions',
    rebrandingCriteria: {
      shouldRebrandWhen: [
        'pump_specialization',
        'chemical_compatibility_expertise',
        'maintenance_support',
        'application_engineering'
      ],
      keepOriginalWhen: [
        'established_pump_brand',
        'regulatory_approvals',
        'customer_specification'
      ]
    }
  },
  
  original_brand: {
    id: 'original_brand',
    name: 'Original Brand',
    categories: ['any'],
    colors: { primary: '#6b7280', secondary: '#9ca3af' },
    logo: null,
    description: 'Maintain original manufacturer branding',
    preserveOriginal: true,
    rebrandingCriteria: {
      useWhen: [
        'premium_brand_value',
        'warranty_requirements',
        'oem_partnerships',
        'regulatory_compliance',
        'customer_brand_preference'
      ]
    }
  }
};

export const determineBrandingStrategy = (product, context = {}) => {
  const factors = analyzeRebrandingFactors(product, context);
  
  // Calculate rebranding scores
  const rebrandingScore = calculateRebrandingScore(factors);
  const originalBrandScore = calculateOriginalBrandScore(factors);
  
  if (originalBrandScore > rebrandingScore) {
    return {
      strategy: 'original_brand',
      brand: 'original_brand',
      confidence: originalBrandScore / 10,
      reasoning: generateReasoning(factors, 'original'),
      recommendation: 'Keep original manufacturer branding',
      scores: { rebranding: rebrandingScore, original: originalBrandScore }
    };
  } else {
    const customBrand = selectCustomBrand(product.category);
    return {
      strategy: 'custom_brand',
      brand: customBrand,
      confidence: rebrandingScore / 10,
      reasoning: generateReasoning(factors, 'custom'),
      recommendation: `Rebrand to ${BRAND_CONFIGURATIONS[customBrand].name}`,
      scores: { rebranding: rebrandingScore, original: originalBrandScore }
    };
  }
};

const analyzeRebrandingFactors = (product, context) => {
  return {
    // Product characteristics
    productValue: product.price || 0,
    category: product.category,
    supplier: product.supplier,
    
    // Market factors
    brandRecognition: context.brandRecognition || 'unknown',
    customerType: context.customerType || 'unknown',
    competitivePresence: context.competitivePresence || 'medium',
    
    // Business factors
    marginImprovement: context.marginImprovement || false,
    supportAdvantage: context.supportAdvantage || false,
    stockAvailability: context.stockAvailability || false,
    
    // Customer requirements
    warrantyRequirements: context.warrantyRequirements || false,
    customerPreference: context.customerPreference || 'neutral',
    oemPartnership: context.oemPartnership || false,
    
    // Application context
    applicationCriticality: context.applicationCriticality || 'standard',
    regulatoryCompliance: context.regulatoryCompliance || false
  };
};

const calculateRebrandingScore = (factors) => {
  let score = 0;
  
  // Favor rebranding for our specialized categories
  if (['mechanical', 'bearings', 'sensors', 'diaphragm_pumps'].includes(factors.category)) {
    score += 3;
  }
  
  // Business advantages
  if (factors.marginImprovement) score += 2;
  if (factors.supportAdvantage) score += 2;
  if (factors.stockAvailability) score += 1;
  
  // Customer factors
  if (factors.customerType === 'sme') score += 1;
  if (factors.customerPreference === 'local_brand') score += 2;
  
  // Market positioning
  if (factors.competitivePresence === 'high') score += 1;
  if (factors.brandRecognition === 'weak') score += 2;
  
  return Math.min(10, score);
};

const calculateOriginalBrandScore = (factors) => {
  let score = 0;
  
  // Strong original brand factors
  if (factors.productValue > 1000) score += 2; // High-value products
  if (factors.brandRecognition === 'strong') score += 3;
  if (factors.warrantyRequirements) score += 3;
  if (factors.oemPartnership) score += 3;
  if (factors.customerPreference === 'original_brand') score += 3;
  if (factors.regulatoryCompliance) score += 2;
  if (factors.applicationCriticality === 'critical') score += 2;
  if (factors.customerType === 'enterprise') score += 1;
  
  return Math.min(10, score);
};

const selectCustomBrand = (category) => {
  const categoryMapping = {
    'mechanical': 'faradaytech',
    'bearings': 'faradaytech', 
    'gears': 'faradaytech',
    'couplings': 'faradaytech',
    'drives': 'faradaytech',
    'sensors': 'faraday_instruments',
    'instrumentation': 'faraday_instruments',
    'networking_products': 'faraday_instruments',
    'automation': 'faraday_instruments',
    'diaphragm_pumps': 'hydra',
    'pumping_systems': 'hydra',
    'fluid_handling': 'hydra',
    'pneumatics': 'hydra'
  };
  
  return categoryMapping[category] || 'original_brand';
};

const generateReasoning = (factors, strategy) => {
  const reasons = [];
  
  if (strategy === 'original') {
    if (factors.brandRecognition === 'strong') reasons.push('Strong brand recognition');
    if (factors.warrantyRequirements) reasons.push('Warranty requirements');
    if (factors.oemPartnership) reasons.push('OEM partnership restrictions');
    if (factors.productValue > 1000) reasons.push('High-value product benefits from original branding');
    if (factors.customerPreference === 'original_brand') reasons.push('Customer brand preference');
    if (factors.regulatoryCompliance) reasons.push('Regulatory compliance requirements');
    if (factors.applicationCriticality === 'critical') reasons.push('Critical application requires established brand trust');
  } else {
    if (factors.marginImprovement) reasons.push('Better profit margins with our branding');
    if (factors.supportAdvantage) reasons.push('Superior technical support capability');
    if (factors.stockAvailability) reasons.push('Better stock availability and delivery');
    if (factors.customerType === 'sme') reasons.push('SME customers prefer local brands');
    if (factors.brandRecognition === 'weak') reasons.push('Weak original brand recognition');
    if (['mechanical', 'sensors', 'diaphragm_pumps'].includes(factors.category)) {
      reasons.push('Our specialized expertise in this category');
    }
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'Based on overall analysis';
};

// Export utility functions
export const getBrandForCategory = (category) => {
  return selectCustomBrand(category);
};

export const getAllowedBrands = (category) => {
  const categoryBrandMap = {
    'mechanical': ['faradaytech', 'original_brand'],
    'bearings': ['faradaytech', 'original_brand'],
    'gears': ['faradaytech', 'original_brand'],
    'couplings': ['faradaytech', 'original_brand'],
    'drives': ['faradaytech', 'original_brand'],
    'sensors': ['faraday_instruments', 'original_brand'],
    'instrumentation': ['faraday_instruments', 'original_brand'],
    'networking_products': ['faraday_instruments', 'original_brand'],
    'automation': ['faraday_instruments', 'original_brand'],
    'diaphragm_pumps': ['hydra', 'original_brand'],
    'pumping_systems': ['hydra', 'original_brand'],
    'fluid_handling': ['hydra', 'original_brand'],
    'pneumatics': ['hydra', 'original_brand']
  };
  
  return categoryBrandMap[category] || ['original_brand'];
};

export const getBrandConfig = (brandId) => {
  return BRAND_CONFIGURATIONS[brandId] || BRAND_CONFIGURATIONS.original_brand;
};

export const validateBrandSelection = (brandId, category) => {
  const allowedBrands = getAllowedBrands(category);
  return allowedBrands.includes(brandId);
};

// Document type configurations for different brands
export const DOCUMENT_TEMPLATES = {
  faradaytech: {
    logoPlacement: 'top-right',
    colorScheme: '#1e40af',
    footer: 'FaradayTech - Mechanical Engineering Solutions',
    contactInfo: {
      website: 'www.faradaytech.com',
      email: 'sales@faradaytech.com',
      phone: '+1-555-FARADAY'
    }
  },
  faraday_instruments: {
    logoPlacement: 'top-center',
    colorScheme: '#059669',
    footer: 'Faraday Instruments - Advanced Instrumentation Solutions',
    contactInfo: {
      website: 'www.faraday-instruments.com',
      email: 'info@faraday-instruments.com',
      phone: '+1-555-INSTRUM'
    }
  },
  hydra: {
    logoPlacement: 'top-left',
    colorScheme: '#0891b2',
    footer: 'Hydra - Pumping & Fluid Handling Solutions',
    contactInfo: {
      website: 'www.hydrapumps.com',
      email: 'support@hydrapumps.com',
      phone: '+1-555-HYDRA-1'
    }
  },
  original_brand: {
    preserveOriginal: true,
    modifications: 'none'
  }
};
