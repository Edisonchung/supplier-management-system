// src/services/ai/index.js
// Main entry point - maintains backward compatibility

export { AIExtractionService } from './AIExtractionService';
export { ValidationService } from './ValidationService';
export { MappingService } from './MappingService';
export { CacheService } from './CacheService';
export { ExtractionService } from './ExtractionService';
export { DuplicateDetectionService } from './DuplicateDetectionService';
export { RecommendationService } from './RecommendationService';

// Default export for backward compatibility
export { AIExtractionService as default } from './AIExtractionService';
