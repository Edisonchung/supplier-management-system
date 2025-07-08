// src/services/ai/AIExtractionService.js
// Main orchestrator for AI extraction - refactored version

import { ExtractionService } from './ExtractionService';
import { DocumentDetector } from './DocumentDetector';
import { ValidationService } from './ValidationService';
import { DuplicateDetectionService } from './DuplicateDetectionService';
import { RecommendationService } from './RecommendationService';
import { CacheService } from './CacheService';

// Import processors
import { ClientPOProcessor } from './processors/ClientPOProcessor';
import { SupplierPIProcessor } from './processors/SupplierPIProcessor';

// Import utilities
import { EXTRACTION_SETTINGS } from './config';

export class AIExtractionService {
  constructor() {
    this.processors = {
      client_purchase_order: ClientPOProcessor,
      supplier_proforma: SupplierPIProcessor,
      supplier_invoice: SupplierPIProcessor, // Using same processor for now
      supplier_quotation: SupplierPIProcessor,
      unknown: null
    };
    
    // Initialize cache
    CacheService.initialize();
  }

  /**
   * Main extraction method with document type detection
   */
  async extractFromFile(file) {
    try {
      console.log('Starting AI extraction for:', file.name);
      
      // Step 1: Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          data: null
        };
      }

      // Step 2: Check cache
      const cacheKey = await this.generateCacheKey(file);
      const cachedResult = CacheService.get(cacheKey);
      if (cachedResult) {
        console.log('Returning cached result');
        return cachedResult;
      }

      // Step 3: Extract raw data from file
      const rawData = await this.extractRawData(file);
      
      // Step 4: Detect document type
      const docType = DocumentDetector.detectDocumentType(rawData);
      console.log('Detected document type:', docType.type, 'with confidence:', docType.confidence);
      
      // Step 5: Process based on document type
      const processor = this.processors[docType.type];
      let processedData;
      
      if (processor) {
        processedData = await processor.process(rawData, file);
      } else {
        processedData = this.processGenericDocument(rawData, file);
      }
      
      // Step 6: Validate extracted data
      const validationResult = await ValidationService.validateExtractedData(processedData);
      if (validationResult.warnings.length > 0) {
        console.warn('Validation warnings:', validationResult.warnings);
      }
      
      // Step 7: Check for duplicates
      const duplicateCheck = await DuplicateDetectionService.checkDuplicates(processedData);
      if (duplicateCheck.hasDuplicates) {
        console.warn('Potential duplicates found:', duplicateCheck.duplicates);
      }
      
      // Step 8: Generate recommendations
      const recommendations = await RecommendationService.getRecommendations(processedData);
      
      // Step 9: Prepare final result
      const result = {
        success: true,
        data: processedData,
        confidence: docType.confidence,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: ExtractionService.getFileType(file),
          extractionTime: Date.now(),
          documentType: docType.type,
          validationScore: validationResult.validationScore
        },
        validation: {
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          suggestions: validationResult.suggestions
        },
        duplicateCheck: duplicateCheck,
        recommendations: recommendations
      };
      
      // Step 10: Cache the result
      CacheService.set(cacheKey, result);
      
      return result;
      
    } catch (error) {
      console.error('AI Extraction failed:', error);
      
      // Return a standardized error response
      return {
        success: false,
        error: error.message || 'Extraction failed',
        data: null,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          extractionTime: Date.now(),
          errorType: error.name || 'UnknownError'
        }
      };
    }
  }

  /**
   * Extract raw data from file using appropriate method
   */
  async extractRawData(file) {
    const fileType = ExtractionService.getFileType(file);
    
    switch (fileType) {
      case 'pdf':
        return ExtractionService.extractFromPDF(file);
      case 'image':
        return ExtractionService.extractFromImage(file);
      case 'excel':
        return ExtractionService.extractFromExcel(file);
      case 'email':
        return ExtractionService.extractFromEmail(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  /**
   * Validate file before processing
   */
  validateFile(file) {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > EXTRACTION_SETTINGS.maxFileSize) {
      return { 
        isValid: false, 
        error: `File size exceeds ${EXTRACTION_SETTINGS.maxFileSize / 1024 / 1024}MB limit` 
      };
    }

    const fileType = ExtractionService.getFileType(file);
    if (!EXTRACTION_SETTINGS.supportedFormats.includes(fileType)) {
      return { 
        isValid: false, 
        error: `File type not supported. Supported types: ${EXTRACTION_SETTINGS.supportedFormats.join(', ')}` 
      };
    }

    return { isValid: true };
  }

  /**
   * Process generic/unknown document type
   */
  processGenericDocument(rawData, file) {
    return {
      documentType: 'unknown',
      fileName: file.name,
      rawData: rawData,
      extractedText: JSON.stringify(rawData, null, 2),
      message: 'Document type could not be determined. Manual review required.'
    };
  }

  /**
   * Generate cache key for file
   */
  async generateCacheKey(file) {
    const content = await this.getFileHash(file);
    return `extraction_${file.name}_${file.size}_${content}`;
  }

  /**
   * Simple file hash for caching
   */
  async getFileHash(file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 8); // Use first 8 chars
  }

  /**
   * Batch extraction for multiple files
   */
  async batchExtract(files) {
    const results = [];
    
    for (const file of files) {
      const result = await this.extractFromFile(file);
      results.push({
        fileName: file.name,
        ...result
      });
    }
    
    return results;
  }

  /**
   * Static methods for backward compatibility
   */
  static async extractFromFile(file) {
    const instance = new AIExtractionService();
    return instance.extractFromFile(file);
  }

  static async extractPOFromPDF(file) {
    console.warn('extractPOFromPDF is deprecated. Use extractFromFile instead.');
    return AIExtractionService.extractFromFile(file);
  }

  /**
   * Get extraction capabilities
   */
  static getCapabilities() {
    return {
      supportedFormats: EXTRACTION_SETTINGS.supportedFormats,
      maxFileSize: EXTRACTION_SETTINGS.maxFileSize,
      documentTypes: Object.keys(new AIExtractionService().processors),
      features: [
        'OCR support for scanned documents',
        'Multi-format extraction (PDF, Images, Excel, Email)',
        'Automatic document type detection',
        'Duplicate detection',
        'Data validation',
        'Smart recommendations',
        'Supplier matching',
        'Multi-language support'
      ]
    };
  }
}

// Export singleton instance for backward compatibility
const aiExtractionServiceInstance = new AIExtractionService();
export default aiExtractionServiceInstance;
