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

const analyzeRebrandingFactors = (product, context) =>
