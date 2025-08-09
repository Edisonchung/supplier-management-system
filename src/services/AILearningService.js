// src/services/AILearningService.js
import { ProductEnrichmentService } from './ProductEnrichmentService';

export class AILearningService {
  constructor() {
    this.storageKey = 'higgsflow_ai_learning_data';
    this.learningData = this.loadLearningData();
    this.patternConfidenceThreshold = 0.7;
    this.minExamplesForPattern = 3;
  }

  /**
   * Record a user correction for learning
   */
  recordUserCorrection(originalSuggestion, userCorrection, context = {}) {
    const correction = {
      id: this.generateCorrectionId(),
      timestamp: new Date().toISOString(),
      partNumber: context.partNumber || '',
      originalSuggestion: {
        brand: originalSuggestion.brand || '',
        category: originalSuggestion.category || '',
        confidence: originalSuggestion.confidence || 0
      },
      userCorrection: {
        brand: userCorrection.brand || '',
        category: userCorrection.category || '',
        description: userCorrection.description || ''
      },
      context: {
        description: context.description || '',
        supplier: context.supplier || '',
        source: context.source || 'manual_correction'
      },
      verified: true,
      appliedToPatterns: false
    };

    this.learningData.corrections.push(correction);
    this.saveLearningData();

    console.log('📚 User correction recorded:', correction);

    // Try to generate new patterns
    this.analyzeAndGeneratePatterns();

    return correction.id;
  }

  /**
   * Record successful AI enhancement for reinforcement learning
   */
  recordSuccessfulEnhancement(enhancement, userAcceptance = null) {
    const success = {
      id: this.generateSuccessId(),
      timestamp: new Date().toISOString(),
      partNumber: enhancement.partNumber || '',
      detectedBrand: enhancement.brand || '',
      detectedCategory: enhancement.category || '',
      confidence: enhancement.confidence || 0,
      userAccepted: userAcceptance !== null ? userAcceptance : true,
      specifications: enhancement.specifications || {},
      context: {
        description: enhancement.description || '',
        source: enhancement.source || 'ai_enhancement'
      }
    };

    this.learningData.successes.push(success);
    this.saveLearningData();

    // Update pattern confidence scores
    this.updatePatternConfidence(enhancement, userAcceptance !== false);

    return success.id;
  }

  /**
   * Analyze learning data and generate new patterns
   */
  analyzeAndGeneratePatterns() {
    console.log('🧠 Analyzing learning data for pattern generation...');

    // Group corrections by brand
    const correctionsByBrand = this.groupCorrectionsByBrand();

    for (const [brand, corrections] of Object.entries(correctionsByBrand)) {
      if (corrections.length >= this.minExamplesForPattern) {
        this.generatePatternsForBrand(brand, corrections);
      }
    }

    // Update statistics
    this.updateLearningStatistics();
  }

  /**
   * Group corrections by brand for pattern analysis
   */
  groupCorrectionsByBrand() {
    const groups = {};

    this.learningData.corrections.forEach(correction => {
      const brand = correction.userCorrection.brand;
      if (brand) {
        if (!groups[brand]) {
          groups[brand] = [];
        }
        groups[brand].push(correction);
      }
    });

    return groups;
  }

  /**
   * Generate patterns for a specific brand based on learning data
   */
  generatePatternsForBrand(brand, corrections) {
    console.log(`🎯 Generating patterns for ${brand} based on ${corrections.length} corrections...`);

    const partNumbers = corrections.map(c => c.partNumber).filter(pn => pn);
    
    if (partNumbers.length < this.minExamplesForPattern) {
      return;
    }

    // Find common patterns
    const patterns = this.findCommonPatterns(partNumbers);

    for (const pattern of patterns) {
      if (pattern.confidence >= this.patternConfidenceThreshold) {
        // Check if pattern already exists
        if (!this.patternExists(brand, pattern.regex)) {
          this.addLearnedPattern(brand, pattern, corrections);
        }
      }
    }
  }

  /**
   * Find common patterns in part numbers
   */
  findCommonPatterns(partNumbers) {
    const patterns = [];

    // Pattern 1: Common prefix (3+ characters)
    const prefixPattern = this.findCommonPrefix(partNumbers);
    if (prefixPattern.length >= 3) {
      patterns.push({
        type: 'prefix',
        regex: `^${this.escapeRegex(prefixPattern)}`,
        confidence: 0.8,
        examples: partNumbers.filter(pn => pn.startsWith(prefixPattern))
      });
    }

    // Pattern 2: Common structure (letters/numbers pattern)
    const structurePattern = this.findCommonStructure(partNumbers);
    if (structurePattern) {
      patterns.push({
        type: 'structure',
        regex: structurePattern.pattern,
        confidence: structurePattern.confidence,
        examples: structurePattern.examples
      });
    }

    // Pattern 3: Common suffix
    const suffixPattern = this.findCommonSuffix(partNumbers);
    if (suffixPattern.length >= 2) {
      patterns.push({
        type: 'suffix',
        regex: `${this.escapeRegex(suffixPattern)}$`,
        confidence: 0.6,
        examples: partNumbers.filter(pn => pn.endsWith(suffixPattern))
      });
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Find common prefix among part numbers
   */
  findCommonPrefix(partNumbers) {
    if (partNumbers.length === 0) return '';

    let prefix = partNumbers[0];
    for (let i = 1; i < partNumbers.length; i++) {
      while (prefix.length > 0 && !partNumbers[i].startsWith(prefix)) {
        prefix = prefix.slice(0, -1);
      }
    }

    return prefix;
  }

  /**
   * Find common suffix among part numbers
   */
  findCommonSuffix(partNumbers) {
    if (partNumbers.length === 0) return '';

    let suffix = partNumbers[0];
    for (let i = 1; i < partNumbers.length; i++) {
      while (suffix.length > 0 && !partNumbers[i].endsWith(suffix)) {
        suffix = suffix.slice(1);
      }
    }

    return suffix;
  }

  /**
   * Find common structure pattern (e.g., 3 letters + 4 numbers)
   */
  findCommonStructure(partNumbers) {
    if (partNumbers.length < 2) return null;

    // Convert part numbers to structure patterns
    const structures = partNumbers.map(pn => this.getStructurePattern(pn));
    
    // Find most common structure
    const structureFreq = {};
    structures.forEach(structure => {
      structureFreq[structure] = (structureFreq[structure] || 0) + 1;
    });

    const mostCommon = Object.entries(structureFreq)
      .sort(([,a], [,b]) => b - a)[0];

    if (mostCommon && mostCommon[1] >= Math.ceil(partNumbers.length * 0.6)) {
      return {
        pattern: this.structureToRegex(mostCommon[0]),
        confidence: mostCommon[1] / partNumbers.length,
        examples: partNumbers.filter(pn => this.getStructurePattern(pn) === mostCommon[0])
      };
    }

    return null;
  }

  /**
   * Convert part number to structure pattern (L=letter, N=number, S=symbol)
   */
  getStructurePattern(partNumber) {
    return partNumber.replace(/[A-Za-z]/g, 'L')
                    .replace(/[0-9]/g, 'N')
                    .replace(/[^LN]/g, 'S');
  }

  /**
   * Convert structure pattern to regex
   */
  structureToRegex(structure) {
    return '^' + structure.replace(/L/g, '[A-Za-z]')
                         .replace(/N/g, '[0-9]')
                         .replace(/S/g, '[^A-Za-z0-9]') + '$';
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Check if pattern already exists for brand
   */
  patternExists(brand, regexString) {
    return this.learningData.learnedPatterns.some(
      pattern => pattern.brand === brand && pattern.regex === regexString
    );
  }

  /**
   * Add a learned pattern to the system
   */
  addLearnedPattern(brand, pattern, corrections) {
    const learnedPattern = {
      id: this.generatePatternId(),
      brand: brand,
      regex: pattern.regex,
      type: pattern.type,
      confidence: pattern.confidence,
      examples: pattern.examples,
      corrections: corrections.map(c => c.id),
      createdAt: new Date().toISOString(),
      appliedAt: null,
      verified: false
    };

    this.learningData.learnedPatterns.push(learnedPattern);
    this.saveLearningData();

    console.log(`✨ New pattern learned for ${brand}:`, learnedPattern);

    // Automatically apply high-confidence patterns
    if (pattern.confidence >= 0.9) {
      this.applyPattern(learnedPattern);
    }

    return learnedPattern.id;
  }

  /**
   * Apply a learned pattern to the ProductEnrichmentService
   */
  applyPattern(pattern) {
    try {
      ProductEnrichmentService.addBrandPattern(
        pattern.brand,
        pattern.regex,
        'components' // Default category, could be made smarter
      );

      // Update pattern as applied
      pattern.appliedAt = new Date().toISOString();
      pattern.verified = true;

      // Mark related corrections as applied
      this.learningData.corrections.forEach(correction => {
        if (pattern.corrections.includes(correction.id)) {
          correction.appliedToPatterns = true;
        }
      });

      this.saveLearningData();

      console.log(`🚀 Pattern applied for ${pattern.brand}: ${pattern.regex}`);
      return true;
    } catch (error) {
      console.error('Failed to apply pattern:', error);
      return false;
    }
  }

  /**
   * Update pattern confidence based on success/failure
   */
  updatePatternConfidence(enhancement, wasSuccessful) {
    // Find patterns that might have contributed to this enhancement
    const relevantPatterns = this.learningData.learnedPatterns.filter(
      pattern => pattern.brand === enhancement.brand && pattern.appliedAt
    );

    relevantPatterns.forEach(pattern => {
      if (wasSuccessful) {
        pattern.confidence = Math.min(1.0, pattern.confidence + 0.05);
      } else {
        pattern.confidence = Math.max(0.1, pattern.confidence - 0.1);
      }
    });

    this.saveLearningData();
  }

  /**
   * Get learning statistics and insights
   */
  getLearningStatistics() {
    const stats = {
      totalCorrections: this.learningData.corrections.length,
      totalSuccesses: this.learningData.successes.length,
      totalPatterns: this.learningData.learnedPatterns.length,
      appliedPatterns: this.learningData.learnedPatterns.filter(p => p.appliedAt).length,
      brandStats: {},
      recentActivity: []
    };

    // Brand-specific statistics
    this.learningData.corrections.forEach(correction => {
      const brand = correction.userCorrection.brand;
      if (brand) {
        if (!stats.brandStats[brand]) {
          stats.brandStats[brand] = { corrections: 0, patterns: 0, lastActivity: null };
        }
        stats.brandStats[brand].corrections++;
        stats.brandStats[brand].lastActivity = correction.timestamp;
      }
    });

    this.learningData.learnedPatterns.forEach(pattern => {
      if (stats.brandStats[pattern.brand]) {
        stats.brandStats[pattern.brand].patterns++;
      }
    });

    // Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    stats.recentActivity = [
      ...this.learningData.corrections.filter(c => c.timestamp > weekAgo),
      ...this.learningData.successes.filter(s => s.timestamp > weekAgo)
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return stats;
  }

  /**
   * Export learning data for analysis
   */
  exportLearningData() {
    return {
      ...this.learningData,
      statistics: this.getLearningStatistics(),
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import learning data (for backup/restore)
   */
  importLearningData(data) {
    if (data && data.corrections && data.successes && data.learnedPatterns) {
      this.learningData = {
        corrections: data.corrections || [],
        successes: data.successes || [],
        learnedPatterns: data.learnedPatterns || [],
        metadata: data.metadata || this.learningData.metadata
      };
      this.saveLearningData();
      console.log('📥 Learning data imported successfully');
      return true;
    }
    console.error('❌ Invalid learning data format');
    return false;
  }

  /**
   * Clear all learning data (for reset)
   */
  clearLearningData() {
    this.learningData = this.getInitialLearningData();
    this.saveLearningData();
    console.log('🗑️ Learning data cleared');
  }

  /**
   * Load learning data from storage
   */
  loadLearningData() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          ...this.getInitialLearningData(),
          ...data
        };
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error);
    }
    return this.getInitialLearningData();
  }

  /**
   * Save learning data to storage
   */
  saveLearningData() {
    try {
      this.learningData.metadata.lastUpdated = new Date().toISOString();
      localStorage.setItem(this.storageKey, JSON.stringify(this.learningData));
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  }

  /**
   * Get initial learning data structure
   */
  getInitialLearningData() {
    return {
      corrections: [],
      successes: [],
      learnedPatterns: [],
      metadata: {
        version: '1.0',
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    };
  }

  /**
   * Update learning statistics
   */
  updateLearningStatistics() {
    const stats = this.getLearningStatistics();
    this.learningData.metadata.statistics = stats;
    this.saveLearningData();
  }

  /**
   * Generate unique IDs
   */
  generateCorrectionId() {
    return `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSuccessId() {
    return `success_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generatePatternId() {
    return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// React Hook for using the learning service
export const useAILearning = () => {
  const [learningService] = React.useState(() => new AILearningService());
  const [statistics, setStatistics] = React.useState(null);

  const recordCorrection = React.useCallback((originalSuggestion, userCorrection, context) => {
    return learningService.recordUserCorrection(originalSuggestion, userCorrection, context);
  }, [learningService]);

  const recordSuccess = React.useCallback((enhancement, userAcceptance) => {
    return learningService.recordSuccessfulEnhancement(enhancement, userAcceptance);
  }, [learningService]);

  const refreshStatistics = React.useCallback(() => {
    const stats = learningService.getLearningStatistics();
    setStatistics(stats);
    return stats;
  }, [learningService]);

  const applyPattern = React.useCallback((patternId) => {
    const pattern = learningService.learningData.learnedPatterns.find(p => p.id === patternId);
    if (pattern) {
      return learningService.applyPattern(pattern);
    }
    return false;
  }, [learningService]);

  React.useEffect(() => {
    refreshStatistics();
  }, [refreshStatistics]);

  return {
    recordCorrection,
    recordSuccess,
    refreshStatistics,
    applyPattern,
    statistics,
    learningService
  };
};

export default AILearningService;
