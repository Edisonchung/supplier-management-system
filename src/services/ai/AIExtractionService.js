// src/services/ai/AIExtractionService.js
// Main service that orchestrates everything

import { ExtractionService } from './ExtractionService';
import { MappingService } from './MappingService';
import { ValidationService } from './ValidationService';
import { CacheService } from './CacheService';
import { DuplicateDetectionService } from './DuplicateDetectionService';
import { RecommendationService } from './RecommendationService';
import { AI_CONFIG } from './config';

export class AIExtractionService {
  /**
   * Main extraction method that coordinates all services
   */
  static async extractFromFile(file) {
    const startTime = performance.now();
    const fileType = ExtractionService.getFileType(file);
    
    if (!AI_CONFIG.SUPPORTED_FORMATS.includes(fileType)) {
      throw new Error(`Unsupported file type: ${fileType}. Supported formats: ${AI_CONFIG.SUPPORTED_FORMATS.join(', ')}`);
    }

    // Check file size
    if (file.size > AI_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${AI_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }
    
    try {
      // Step 1: Extract raw data
      console.log(`Starting extraction for ${fileType} file: ${file.name}`);
      let extractionResult;
      
      switch (fileType) {
        case 'pdf':
          extractionResult = await ExtractionService.extractFromPDF(file);
          break;
        case 'image':
          extractionResult = await ExtractionService.extractFromImage(file);
          break;
        case 'excel':
          extractionResult = await ExtractionService.extractFromExcel(file);
          break;
        case 'email':
          extractionResult = await ExtractionService.extractFromEmail(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      if (!extractionResult.success) {
        throw new Error(extractionResult.message || 'Extraction failed');
      }

      // Step 2: Map fields intelligently
      console.log('Mapping fields...');
      const mappedData = await MappingService.intelligentFieldMapping(extractionResult.data);

      // Step 3: Validate data
      console.log('Validating data...');
      const validation = await ValidationService.validateExtractedData(mappedData);

      // Step 4: Check for duplicates
      console.log('Checking for duplicates...');
      const duplicateCheck = await DuplicateDetectionService.checkDuplicates(validation.validatedData);

      // Step 5: Get AI recommendations
      console.log('Generating recommendations...');
      const recommendations = await RecommendationService.getRecommendations(validation.validatedData);

      // Step 6: Prepare final result
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      const finalResult = {
        success: true,
        data: validation.validatedData,
        validation: {
          isValid: validation.isValid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions,
          score: validation.validationScore
        },
        duplicateCheck: duplicateCheck,
        recommendations: recommendations,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: fileType,
          extractionTime: processingTime,
          confidence: extractionResult.confidence || 0.85,
          aiProvider: extractionResult.aiProvider || 'unknown',
          extractedAt: new Date().toISOString()
        }
      };

      // Step 7: Cache the extraction
      CacheService.addToHistory({
        fileName: file.name,
        fileType: fileType,
        extractedData: validation.validatedData,
        validation: validation,
        duplicateCheck: duplicateCheck,
        recommendations: recommendations,
        confidence: extractionResult.confidence || 0.85,
        processingTime: processingTime
      });

      console.log(`Extraction completed in ${processingTime.toFixed(2)}ms`);
      return finalResult;

    } catch (error) {
      console.error('Extraction failed:', error);
      
      // Add to history even for failures
      CacheService.addToHistory({
        fileName: file.name,
        fileType: fileType,
        error: error.message,
        failed: true
      });

      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async extractPOFromPDF(file) {
    console.warn('extractPOFromPDF is deprecated. Use extractFromFile instead.');
    return this.extractFromFile(file);
  }

  /**
   * Process extracted data (for backward compatibility)
   */
  static async processExtractedData(data) {
    const mapped = await MappingService.intelligentFieldMapping(data);
    const validated = await ValidationService.validateExtractedData(mapped);
    const duplicates = await DuplicateDetectionService.checkDuplicates(validated.validatedData);
    const recommendations = await RecommendationService.getRecommendations(validated.validatedData);

    return {
      ...validated.validatedData,
      validation: validated,
      duplicateCheck: duplicates,
      recommendations: recommendations
    };
  }

  /**
   * Check for duplicates (delegate to service)
   */
  static async checkForDuplicates(data) {
    return DuplicateDetectionService.checkDuplicates(data);
  }

  /**
   * Get AI recommendations (delegate to service)
   */
  static async getAIRecommendations(data) {
    return RecommendationService.getRecommendations(data);
  }

  /**
   * Save correction for future use
   */
  static async saveCorrection(field, originalValue, correctedValue, context = {}) {
    return CacheService.saveCorrection(field, originalValue, correctedValue, context);
  }

  /**
   * Get file type (delegate to service)
   */
  static getFileType(file) {
    return ExtractionService.getFileType(file);
  }

  /**
   * Validate extraction results
   */
  static async validateExtractedData(data) {
    return ValidationService.validateExtractedData(data);
  }

  /**
   * Apply intelligent field mapping
   */
  static async intelligentFieldMapping(rawData) {
    return MappingService.intelligentFieldMapping(rawData);
  }

  /**
   * Get extraction history
   */
  static getExtractionHistory() {
    return CacheService.getHistory();
  }

  /**
   * Clear extraction history
   */
  static clearExtractionHistory() {
    return CacheService.clearHistory();
  }

  /**
   * Get cached suppliers
   */
  static getCachedSuppliers() {
    return CacheService.getAllCachedSuppliers();
  }

  /**
   * Get cached products
   */
  static getCachedProducts() {
    return CacheService.getAllCachedProducts();
  }

  /**
   * Refresh cache from localStorage
   */
  static refreshCache() {
    return CacheService.refreshFromLocalStorage();
  }

  /**
   * Get service statistics
   */
  static getStatistics() {
    return CacheService.getStatistics();
  }

  /**
   * Test backend connection
   */
  static async testConnection() {
    return ExtractionService.testConnection();
  }

  /**
   * Get available AI providers
   */
  static async getAvailableProviders() {
    return ExtractionService.getAvailableProviders();
  }

  /**
   * Format extraction results for display
   */
  static formatExtractionResults(data) {
    return {
      summary: {
        orderNumber: data.orderNumber || 'Not specified',
        client: data.clientName || 'Unknown',
        supplier: data.supplierName || 'Unknown',
        date: data.orderDate || 'Not specified',
        totalAmount: MappingService.formatCurrency(data.totalAmount || 0, data.currency),
        itemCount: data.items?.length || 0,
        confidence: data.confidence ? `${Math.round(data.confidence * 100)}%` : 'N/A',
        aiProvider: data.aiProvider || 'Unknown'
      },
      details: data,
      validation: data.validation || null
    };
  }

  /**
   * Batch process multiple files
   */
  static async batchExtract(files) {
    const results = [];
    const errors = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`Processing file ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const result = await this.extractFromFile(file);
        results.push({
          fileName: file.name,
          success: true,
          data: result.data,
          validation: result.validation,
          metadata: result.metadata
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        errors.push({
          fileName: file.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      processed: results.length + errors.length,
      successful: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    };
  }

  /**
   * Initialize the service
   */
  static initialize() {
    console.log('Initializing AI Extraction Service...');
    CacheService.initialize();
    console.log('AI Extraction Service initialized');
  }

  /**
   * Parse number utility (for backward compatibility)
   */
  static parseNumber(value) {
    return MappingService.parseNumber(value);
  }

  /**
   * Format currency utility (for backward compatibility)
   */
  static formatCurrency(value, currency) {
    return MappingService.formatCurrency(value, currency);
  }
}

// Initialize on import
AIExtractionService.initialize();
