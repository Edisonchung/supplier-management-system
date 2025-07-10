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
      
      // Step 3.5: Pre-process document type detection
      // Check for specific structures that indicate document type
      let preDetectedType = null;
      if (rawData.data?.purchase_order || rawData.purchase_order) {
        preDetectedType = 'client_purchase_order';
        console.log('Pre-detected as client purchase order based on structure');
      } else if (rawData.data?.proforma_invoice || rawData.proforma_invoice) {
        preDetectedType = 'supplier_proforma';
        console.log('Pre-detected as supplier proforma based on structure');
      } else if (rawData.data?.invoice || rawData.invoice) {
        preDetectedType = 'supplier_invoice';
        console.log('Pre-detected as supplier invoice based on structure');
      }
      
      // Step 4: Detect document type
      const docType = preDetectedType 
        ? { type: preDetectedType, confidence: 0.9, preDetected: true }
        : DocumentDetector.detectDocumentType(rawData);
        
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
      let validationResult = { 
        isValid: true, 
        errors: [], 
        warnings: [], 
        suggestions: [],
        validationScore: 100 
      };
      
      // Only validate if we have a known document type
      if (docType.type !== 'unknown') {
        try {
          validationResult = await ValidationService.validateExtractedData(processedData);
          if (validationResult.warnings.length > 0) {
            console.warn('Validation warnings:', validationResult.warnings);
          }
        } catch (validationError) {
          console.error('Validation error:', validationError);
          // Continue with extraction even if validation fails
        }
      }
      
      // Step 7: Check for duplicates (only for known document types)
      let duplicateCheck = { hasDuplicates: false, duplicates: [] };
      if (docType.type !== 'unknown') {
        try {
          duplicateCheck = await DuplicateDetectionService.checkDuplicates(processedData);
          if (duplicateCheck.hasDuplicates) {
            console.warn('Potential duplicates found:', duplicateCheck.duplicates);
          }
        } catch (duplicateError) {
          console.error('Duplicate check error:', duplicateError);
          // Continue even if duplicate check fails
        }
      }
      
      // Step 8: Generate recommendations
      let recommendations = [];
      if (docType.type !== 'unknown') {
        try {
          recommendations = await RecommendationService.getRecommendations(processedData);
        } catch (recommendationError) {
          console.error('Recommendation error:', recommendationError);
          // Continue even if recommendations fail
        }
      }
      
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
          validationScore: validationResult.validationScore,
          preDetected: docType.preDetected || false
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
      
      // Step 10: Cache the result (only cache successful extractions of known types)
      if (docType.type !== 'unknown') {
        CacheService.set(cacheKey, result);
      }
      
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
    
    console.log(`Extracting from ${fileType} file: ${file.name}`);
    
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
    console.log('Processing as generic document');
    
    // Try to extract as much useful information as possible
    const data = rawData.data || rawData;
    
    return {
      documentType: 'unknown',
      fileName: file.name,
      rawData: data,
      extractedText: JSON.stringify(data, null, 2),
      message: 'Document type could not be determined. Manual review required.',
      // Try to extract common fields
      possibleFields: {
        orderNumber: this.findFieldValue(data, ['order_number', 'po_number', 'invoice_number']),
        date: this.findFieldValue(data, ['date', 'order_date', 'invoice_date']),
        total: this.findFieldValue(data, ['total', 'grand_total', 'amount']),
        items: data.items || data.products || data.line_items || []
      }
    };
  }

  /**
   * Helper to find field values in unknown structures
   */
  findFieldValue(data, possibleKeys) {
    for (const key of possibleKeys) {
      if (data[key]) return data[key];
      
      // Check nested objects
      for (const prop in data) {
        if (typeof data[prop] === 'object' && data[prop] !== null) {
          const nested = this.findFieldValue(data[prop], possibleKeys);
          if (nested) return nested;
        }
      }
    }
    return null;
  }

  /**
   * Generate cache key for file
   */
  async generateCacheKey(file) {
    try {
      const content = await this.getFileHash(file);
      return `extraction_${file.name}_${file.size}_${content}`;
    } catch (error) {
      // Fallback to simple key if hashing fails
      return `extraction_${file.name}_${file.size}_${Date.now()}`;
    }
  }

  /**
   * Simple file hash for caching
   */
  async getFileHash(file) {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 8); // Use first 8 chars
    } catch (error) {
      console.error('Error generating file hash:', error);
      throw error;
    }
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
   * Re-run supplier matching for existing PO data
   * This method allows re-running the supplier matching algorithm on already extracted PO data
   */
  static async rerunSupplierMatching(data) {
    try {
      console.log('Re-running supplier matching for:', data.poNumber);
      
      // Dynamically import SupplierMatcher to avoid circular dependencies
      const { SupplierMatcher } = await import('./SupplierMatcher');
      
      // Ensure we have items to match
      if (!data.items || data.items.length === 0) {
        throw new Error('No items found in the purchase order');
      }
      
      // Run the supplier matching algorithm
      const matchingResult = await SupplierMatcher.findMatches(data.items);
      
      // Process the results to create a comprehensive sourcing plan
      const processedData = {
        ...data,
        items: matchingResult.itemMatches,
        sourcingPlan: {
          // Transform recommended suppliers to the expected format
          recommendedSuppliers: matchingResult.recommendedSuppliers.map(supplier => ({
            supplierId: supplier.supplierId,
            supplierName: supplier.supplierName,
            itemCoverage: `${supplier.itemCoveragePercent}%`,
            estimatedCost: supplier.totalPrice,
            averageRating: supplier.averageRating,
            leadTime: supplier.averageLeadTime,
            advantages: AIExtractionService.getSupplierAdvantages(supplier),
            matchedProducts: supplier.matchedProducts
          })),
          
          // Generate sourcing strategies
          sourcingStrategies: AIExtractionService.generateSourcingStrategies(data, matchingResult),
          
          // Cost analysis
          costAnalysis: {
            originalBudget: data.totalAmount || 0,
            bestCaseScenario: matchingResult.metrics.totalBestCost,
            potentialSavings: matchingResult.metrics.potentialSavings,
            savingsPercentage: `${matchingResult.metrics.potentialSavingsPercent.toFixed(1)}%`
          },
          
          // Timeline analysis
          timeline: {
            estimatedLeadTime: matchingResult.metrics.averageLeadTime,
            orderPlacementDeadline: AIExtractionService.calculateOrderDeadline(
              data.deliveryDate || data.requiredDate,
              matchingResult.metrics.averageLeadTime
            ),
            criticalPath: AIExtractionService.identifyCriticalPath(matchingResult.itemMatches)
          },
          
          // Risk assessment
          riskAssessment: {
            supplierDiversity: matchingResult.metrics.supplierDiversity,
            itemsWithoutMatches: matchingResult.metrics.itemsWithoutMatches,
            singleSourceItems: AIExtractionService.identifySingleSourceItems(matchingResult.itemMatches),
            recommendations: AIExtractionService.generateRiskRecommendations(matchingResult.metrics)
          },
          
          // Overall quality metrics
          confidenceScore: AIExtractionService.calculateConfidenceScore(matchingResult.metrics),
          matchQuality: AIExtractionService.assessMatchQuality(matchingResult.metrics)
        },
        matchingMetrics: matchingResult.metrics
      };
      
      return {
        success: true,
        data: processedData,
        message: 'Supplier matching updated successfully'
      };
      
    } catch (error) {
      console.error('Error re-running supplier matching:', error);
      return {
        success: false,
        error: error.message || 'Failed to re-run supplier matching',
        data: null
      };
    }
  }

  /**
   * Helper method to determine supplier advantages
   */
  static getSupplierAdvantages(supplier) {
    const advantages = [];
    
    if (supplier.itemCoveragePercent >= 80) {
      advantages.push('Can supply most items');
    }
    if (supplier.itemCoveragePercent === 100) {
      advantages.push('Single-source solution');
    }
    if (supplier.averageRating >= 4.5) {
      advantages.push('Excellent rating');
    }
    if (supplier.averageLeadTime && supplier.averageLeadTime.includes('day')) {
      advantages.push('Fast delivery');
    }
    if (supplier.totalPrice && supplier.itemsCovered > 5) {
      advantages.push('Volume discount potential');
    }
    
    return advantages.length > 0 ? advantages : ['Competitive pricing'];
  }

  /**
   * Generate sourcing strategies based on matching results
   */
  static generateSourcingStrategies(data, matchingResult) {
    const strategies = [];
    
    // Single supplier consolidation strategy
    if (matchingResult.recommendedSuppliers.length > 0) {
      const topSupplier = matchingResult.recommendedSuppliers[0];
      if (topSupplier.itemCoveragePercent >= 70) {
        strategies.push({
          name: 'Single Supplier Consolidation',
          description: `Order ${topSupplier.itemCoveragePercent}% of items from ${topSupplier.supplierName}`,
          pros: ['Simplified logistics', 'Better negotiation power', 'Single point of contact', 'Volume discounts'],
          cons: ['Higher dependency risk', 'Less price competition'],
          estimatedSavings: '5-10% through volume discounts'
        });
      }
    }
    
    // Multi-supplier strategy
    if (matchingResult.recommendedSuppliers.length >= 3) {
      strategies.push({
        name: 'Multi-Supplier Distribution',
        description: 'Distribute orders among top 3-5 suppliers based on their strengths',
        pros: ['Risk diversification', 'Competitive pricing', 'Specialized expertise', 'Flexibility'],
        cons: ['Complex coordination', 'Higher admin overhead', 'Multiple relationships to manage'],
        estimatedSavings: '10-15% through competition'
      });
    }
    
    // Hybrid strategy (always included)
    strategies.push({
      name: 'Hybrid Approach',
      description: 'Use primary supplier for 60-70% of items, secondary suppliers for specialized items',
      pros: ['Balance of efficiency and risk', 'Maintains competition', 'Backup options', 'Optimal pricing'],
      cons: ['Requires careful planning', 'Moderate complexity'],
      estimatedSavings: '7-12% overall'
    });
    
    // Just-in-time strategy for fast delivery items
    const fastDeliverySuppliers = matchingResult.recommendedSuppliers.filter(
      s => s.averageLeadTime && s.averageLeadTime.includes('day')
    );
    if (fastDeliverySuppliers.length > 0) {
      strategies.push({
        name: 'Just-In-Time Sourcing',
        description: 'Use fast-delivery suppliers for urgent or high-turnover items',
        pros: ['Reduced inventory costs', 'Fresh stock', 'Quick response to demand'],
        cons: ['Higher unit costs', 'Requires accurate forecasting'],
        estimatedSavings: '3-5% on inventory carrying costs'
      });
    }
    
    return strategies;
  }

  /**
   * Calculate order placement deadline
   */
  static calculateOrderDeadline(deliveryDate, leadTime) {
    if (!deliveryDate) return 'ASAP - No delivery date specified';
    
    const delivery = new Date(deliveryDate);
    const leadDays = AIExtractionService.parseLeadTimeToDays(leadTime);
    const bufferDays = 3; // Safety buffer
    
    const deadline = new Date(delivery);
    deadline.setDate(deadline.getDate() - leadDays - bufferDays);
    
    const today = new Date();
    const daysUntilDeadline = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) {
      return 'URGENT - Already past deadline';
    } else if (daysUntilDeadline <= 3) {
      return `URGENT - ${daysUntilDeadline} days remaining`;
    } else if (daysUntilDeadline <= 7) {
      return `Priority - ${daysUntilDeadline} days remaining`;
    } else {
      return `${deadline.toLocaleDateString()} (${daysUntilDeadline} days)`;
    }
  }

  /**
   * Parse lead time string to days
   */
  static parseLeadTimeToDays(leadTime) {
    if (!leadTime) return 14; // Default 2 weeks
    
    const match = leadTime.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return 14;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'day': return value;
      case 'week': return value * 7;
      case 'month': return value * 30;
      default: return 14;
    }
  }

  /**
   * Identify critical path items
   */
  static identifyCriticalPath(items) {
    const criticalItems = items
      .filter(item => {
        const hasLongLeadTime = item.bestMatch && 
          AIExtractionService.parseLeadTimeToDays(item.bestMatch.pricing.leadTime) > 21;
        const hasNoMatches = !item.supplierMatches || item.supplierMatches.length === 0;
        const isHighValue = item.totalPrice > 1000;
        const isLargeQuantity = item.quantity > 100;
        
        return hasLongLeadTime || hasNoMatches || isHighValue || isLargeQuantity;
      })
      .map(item => ({
        productName: item.productName,
        productCode: item.productCode,
        quantity: item.quantity,
        reason: !item.supplierMatches || item.supplierMatches.length === 0 
          ? 'No supplier found'
          : item.totalPrice > 1000 
          ? 'High value item'
          : item.quantity > 100
          ? 'Large quantity'
          : 'Long lead time'
      }));
    
    return criticalItems;
  }

  /**
   * Identify single source items
   */
  static identifySingleSourceItems(items) {
    return items
      .filter(item => item.supplierMatches && item.supplierMatches.length === 1)
      .map(item => ({
        productName: item.productName,
        productCode: item.productCode,
        supplierName: item.supplierMatches[0].supplierName
      }));
  }

  /**
   * Generate risk mitigation recommendations
   */
  static generateRiskRecommendations(metrics) {
    const recommendations = [];
    
    // Check for items without matches
    if (metrics.itemsWithoutMatches > 0) {
      recommendations.push({
        type: 'warning',
        message: `${metrics.itemsWithoutMatches} items have no supplier matches`,
        action: 'Consider adding more suppliers or updating product catalog'
      });
    }
    
    // Check for limited supplier diversity
    if (metrics.supplierDiversity < 3) {
      recommendations.push({
        type: 'caution',
        message: 'Limited supplier options available',
        action: 'Expand supplier base for better risk distribution'
      });
    }
    
    // Check for low match rate
    const matchRate = metrics.itemsWithMatches / (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    if (matchRate < 0.8) {
      recommendations.push({
        type: 'warning',
        message: `Only ${(matchRate * 100).toFixed(0)}% of items have supplier matches`,
        action: 'Review unmatched items and consider alternative products'
      });
    }
    
    // Suggest optimization for high savings
    if (metrics.potentialSavingsPercent > 15) {
      recommendations.push({
        type: 'info',
        message: `Significant savings opportunity: ${metrics.potentialSavingsPercent.toFixed(1)}%`,
        action: 'Review and validate pricing with recommended suppliers'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate overall confidence score
   */
  static calculateConfidenceScore(metrics) {
    let score = 0.5; // Base score
    
    // Factor in match coverage (30% weight)
    const matchCoverage = metrics.itemsWithMatches / 
      (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    score += matchCoverage * 0.3;
    
    // Factor in supplier diversity (20% weight)
    if (metrics.supplierDiversity >= 5) score += 0.2;
    else if (metrics.supplierDiversity >= 3) score += 0.15;
    else if (metrics.supplierDiversity >= 1) score += 0.1;
    
    // Factor in average matches per item (10% weight)
    if (metrics.averageMatchesPerItem >= 3) score += 0.1;
    else if (metrics.averageMatchesPerItem >= 2) score += 0.07;
    else if (metrics.averageMatchesPerItem >= 1) score += 0.05;
    
    // Factor in savings potential (5% weight)
    if (metrics.potentialSavingsPercent > 10) score += 0.05;
    
    return Math.min(score, 0.95); // Cap at 0.95
  }

  /**
   * Assess overall match quality
   */
  static assessMatchQuality(metrics) {
    const coverage = metrics.itemsWithMatches / 
      (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    const avgMatches = metrics.averageMatchesPerItem || 0;
    
    if (coverage >= 0.9 && avgMatches >= 3) {
      return 'Excellent';
    } else if (coverage >= 0.7 && avgMatches >= 2) {
      return 'Good';
    } else if (coverage >= 0.5 && avgMatches >= 1) {
      return 'Fair';
    } else {
      return 'Needs Improvement';
    }
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
        'Pre-detection for common structures',
        'Duplicate detection',
        'Data validation',
        'Smart recommendations',
        'Supplier matching',
        'Re-run supplier matching',
        'Multi-language support',
        'Caching for performance',
        'Error recovery'
      ]
    };
  }

  /**
   * Clear all caches
   */
  static clearCache() {
    CacheService.clearExtractionCache();
    console.log('Extraction cache cleared');
  }

  /**
   * Get extraction statistics
   */
  static getStatistics() {
    return CacheService.getStatistics();
  }
}

// Export singleton instance for backward compatibility
const aiExtractionServiceInstance = new AIExtractionService();
export default aiExtractionServiceInstance;
