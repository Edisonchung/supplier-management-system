// src/utils/productConstants.js
export const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  HYDRAULICS: 'hydraulics', 
  PNEUMATICS: 'pneumatics',
  AUTOMATION: 'automation',
  SENSORS: 'sensors',
  CABLES: 'cables',
  COMPONENTS: 'components',
  BEARINGS: 'bearings',
  PUMPS: 'pumps',
  VALVES: 'valves',
  MOTORS: 'motors'
};

export const PRODUCT_STATUS = {
  PENDING: 'pending',
  COMPLETE: 'complete',
  FURNISHED: 'furnished'
};

export const AI_CONFIDENCE_LEVELS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.3
};

// Enhanced Product Model Schema
export const ENHANCED_PRODUCT_SCHEMA = {
  // Core identification fields
  id: 'string',
  name: 'string',                    // Product name
  sku: 'string',                     // Internal SKU (auto-generated)
  partNumber: 'string',              // Manufacturer's part number (from PI)
  manufacturerCode: 'string',        // Alternative manufacturer codes
  clientItemCode: 'string',          // Client's reference codes
  alternativePartNumbers: '[string]', // Array of alternative part numbers
  
  // Product details
  brand: 'string',                   // Auto-detected from part numbers
  description: 'string',
  category: 'string',
  supplierId: 'string',
  
  // AI-powered fields
  detectedSpecs: {
    dimensions: 'string',            // e.g., "70x105x49mm"
    weight: 'string',
    material: 'string',
    voltage: 'string',
    specifications: 'string'
  },
  
  // Pricing & inventory
  price: 'number',
  stock: 'number',
  minStock: 'number',
  status: 'string',
  
  // AI enhancement tracking
  aiEnriched: 'boolean',             // Indicates AI-enhanced data
  confidence: 'number',              // AI confidence score (0-1)
  lastEnhanced: 'ISO_DATE',          // When AI last enhanced this product
  enhancementHistory: '[object]',    // Track enhancement changes
  
  // Media & documentation
  photo: 'string',
  catalog: 'string',
  notes: 'string',
  
  // Metadata
  source: 'string',                  // 'pi_extraction', 'manual', 'import'
  dateAdded: 'ISO_DATE',
  updatedAt: 'ISO_DATE',
  furnishedAt: 'ISO_DATE'
};
