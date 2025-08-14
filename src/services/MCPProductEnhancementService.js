// src/services/MCPProductEnhancementService.js - FIXED with Correct Field Mapping
class MCPProductEnhancementService {
  static MCP_SERVER_URL = process.env.REACT_APP_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';

  /**
   * ✅ FIXED: Enhanced product enhancement with correct field mapping
   */
  static async enhanceProduct(productData, userEmail = 'user@company.com', options = {}) {
    try {
      console.log('🚀 MCP Product Enhancement - Starting...');
      
      // ✅ STANDARDIZED: Build enhancement request with user attribution
      const enhancementRequest = {
        productData: {
          partNumber: productData.partNumber,
          name: productData.name || '',
          brand: productData.brand || '',
          description: productData.description || '',
          category: productData.category || 'electronics'
        },
        userEmail: userEmail,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'ProductModal',
          version: '3.2.0',
          userAgent: navigator.userAgent.substring(0, 100),
          ...options.metadata
        }
      };

      // ✅ STANDARDIZED: Add forced prompt if specified
      if (options.forcedPromptId) {
        enhancementRequest.forcedPromptId = options.forcedPromptId;
        enhancementRequest.metadata.promptSelectionMethod = 'user_selected';
      } else {
        enhancementRequest.metadata.promptSelectionMethod = 'auto_selected';
      }

      console.log('📋 Enhancement Request:', enhancementRequest);

      const response = await fetch(`${this.MCP_SERVER_URL}/api/enhance-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'HiggsFlow-ProductModal/3.2.0'
        },
        body: JSON.stringify(enhancementRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ MCP Enhancement Result:', result);

      if (result.success && result.extractedData) {
        // ✅ CRITICAL FIX: Map the actual field names from the response
        const extractedData = result.extractedData;
        
        console.log('🔧 Mapping fields from extractedData:', {
          'detected_brand': extractedData.detected_brand,
          'enhanced_name': extractedData.enhanced_name,
          'detected_category': extractedData.detected_category,
          'enhanced_description': extractedData.enhanced_description
        });

        const mappedResult = {
          found: true,
          // ✅ FIX: Map actual field names from response
          productName: extractedData.enhanced_name || extractedData.detected_name || extractedData.productName || extractedData.name,
          brand: extractedData.detected_brand || extractedData.brand,
          category: extractedData.detected_category || extractedData.category,
          description: extractedData.enhanced_description || extractedData.description,
          specifications: extractedData.specifications || {},
          confidence: result.confidence_score || extractedData.confidence || 0.85,
          processingTime: result.processing_time || 0,
          source: this.formatSourceDisplay(result.metadata?.source || 'MCP AI Enhancement'),
          mcpMetadata: {
            prompt_used: result.metadata?.prompt_used,
            prompt_id: result.metadata?.prompt_id,
            ai_provider: result.metadata?.ai_provider || 'deepseek',
            processing_time: result.processing_time,
            system_version: result.metadata?.system_version || '3.2.0',
            confidence_score: result.confidence_score,
            enhancement_method: result.metadata?.enhancement_method || 'mcp_ai',
            user_email: userEmail,
            timestamp: new Date().toISOString(),
            prompt_selection_method: enhancementRequest.metadata.promptSelectionMethod
          },
          mcpEnhanced: true
        };

        // ✅ DEBUG: Log the final mapping
        console.log('✅ Final mapped result:', {
          'brand': mappedResult.brand,
          'productName': mappedResult.productName,
          'category': mappedResult.category,
          'description': mappedResult.description,
          'confidence': mappedResult.confidence
        });

        return mappedResult;
      } else {
        console.warn('⚠️ MCP Enhancement failed or returned no data');
        return {
          found: false,
          error: result.error || 'No enhancement data returned',
          confidence: 0,
          source: 'MCP Enhancement Failed'
        };
      }
    } catch (error) {
      console.error('💥 MCP Product Enhancement Error:', error);
      return {
        found: false,
        error: error.message,
        confidence: 0,
        source: 'MCP Enhancement Error'
      };
    }
  }

  /**
   * ✅ STANDARDIZED: Get available prompts with enhanced metadata
   */
  static async getAvailablePrompts() {
    try {
      const response = await fetch(`${this.MCP_SERVER_URL}/api/available-prompts`);
      const prompts = await response.json();
      
      return prompts
        .filter(p => p.type === 'product_enhancement')
        .map(prompt => ({
          id: prompt.id,
          name: prompt.name,
          description: prompt.description,
          confidence: this.calculatePromptConfidence(prompt),
          usage_count: prompt.usage_count || 0,
          last_used: prompt.last_used,
          recommended_for: this.getRecommendedFor(prompt.name),
          specialization: this.getSpecialization(prompt.name)
        }));
    } catch (error) {
      console.error('Failed to load available prompts:', error);
      return [];
    }
  }

  /**
   * ✅ STANDARDIZED: Enhanced re-run with different prompt
   */
  static async rerunWithPrompt(productData, promptId, userEmail, originalPromptId = null) {
    console.log(`🔄 Re-running enhancement with prompt: ${promptId}`);
    
    const options = {
      forcedPromptId: promptId,
      metadata: {
        rerun: true,
        originalPrompt: originalPromptId,
        userSelected: true
      }
    };

    return await this.enhanceProduct(productData, userEmail, options);
  }

  /**
   * ✅ STANDARDIZED: Smart prompt selection based on part number patterns
   */
  static selectBestPrompt(partNumber, availablePrompts) {
    if (!partNumber || !availablePrompts.length) {
      return availablePrompts[0] || null;
    }

    const upperPartNumber = partNumber.toUpperCase();
    
    // ✅ Siemens patterns (6XV, 6ES, 3SE series)
    if (upperPartNumber.match(/^(6XV|6ES|3SE)/)) {
      return availablePrompts.find(p => 
        p.name.toLowerCase().includes('siemens') || 
        p.name.toLowerCase().includes('industrial specialist')
      ) || availablePrompts[0];
    }
    
    // ✅ SKF bearings (NJ, NU, etc.)
    if (upperPartNumber.match(/^(NJ|NU|NUP|23|22|21)\d+/)) {
      return availablePrompts.find(p => 
        p.name.toLowerCase().includes('skf') ||
        p.name.toLowerCase().includes('bearing')
      ) || availablePrompts[0];
    }
    
    // ✅ ABB drives (ACS series)
    if (upperPartNumber.match(/^ACS\d{3}/)) {
      return availablePrompts.find(p => 
        p.name.toLowerCase().includes('abb') ||
        p.name.toLowerCase().includes('drive')
      ) || availablePrompts[0];
    }
    
    // ✅ Default to brand detection prompt
    return availablePrompts.find(p => 
      p.name.toLowerCase().includes('brand detection') ||
      p.name.toLowerCase().includes('analysis')
    ) || availablePrompts[0];
  }

  /**
   * ✅ STANDARDIZED: Calculate prompt confidence based on usage and type
   */
  static calculatePromptConfidence(prompt) {
    let confidence = 0.85; // Base confidence
    
    const name = prompt.name.toLowerCase();
    
    // Specialized prompts typically have higher confidence
    if (name.includes('specialist') || name.includes('siemens') || name.includes('skf')) {
      confidence = 0.95;
    } else if (name.includes('brand detection') || name.includes('analysis')) {
      confidence = 0.88;
    }
    
    // Adjust based on usage count (more usage = higher confidence)
    const usageCount = prompt.usage_count || 0;
    if (usageCount > 50) confidence = Math.min(confidence + 0.05, 0.98);
    else if (usageCount > 20) confidence = Math.min(confidence + 0.02, 0.95);
    
    return confidence;
  }

  /**
   * ✅ STANDARDIZED: Get recommended use cases for prompts
   */
  static getRecommendedFor(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('siemens')) {
      return ['6XV', '6ES', '3SE', 'siemens'];
    } else if (lowerName.includes('skf')) {
      return ['NJ', 'NU', 'bearings', 'mechanical'];
    } else if (lowerName.includes('abb')) {
      return ['ACS', 'drives', 'automation'];
    } else if (lowerName.includes('brand detection')) {
      return ['unknown', 'multi-brand', 'general'];
    } else {
      return ['general', 'components'];
    }
  }

  /**
   * ✅ STANDARDIZED: Get specialization area for prompts
   */
  static getSpecialization(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('siemens')) {
      return 'Siemens Industrial Components';
    } else if (lowerName.includes('skf')) {
      return 'SKF Bearings & Mechanical';
    } else if (lowerName.includes('abb')) {
      return 'ABB Drives & Automation';
    } else if (lowerName.includes('brand detection')) {
      return 'Multi-manufacturer Analysis';
    } else {
      return 'General Industrial Components';
    }
  }

  /**
   * ✅ STANDARDIZED: Format source display for UI
   */
  static formatSourceDisplay(source) {
    if (!source) return 'MCP AI Enhancement';
    
    // Standardize source display names
    const sourceMap = {
      'mcp_true': 'MCP AI Enhancement',
      'mcp_ai': 'MCP AI Enhancement',
      'deepseek': 'DeepSeek AI Enhancement',
      'unified_ai': 'MCP AI Enhancement',
      'pattern_analysis': 'Basic Enhance',
      'basic_enhance': 'Basic Enhance'
    };
    
    return sourceMap[source] || source;
  }

  /**
   * ✅ STANDARDIZED: Create enhancement history entry
   */
  static createHistoryEntry(result, userEmail, promptId = null) {
    return {
      timestamp: new Date().toISOString(),
      confidence: result.confidence || 0,
      mcpEnhanced: result.mcpEnhanced || false,
      enhancementSource: result.source || 'Unknown',
      mcpMetadata: result.mcpMetadata || null,
      selectedPromptId: promptId,
      userEmail: userEmail,
      enhancementMethod: result.mcpEnhanced ? 'mcp_ai' : 'basic_enhance',
      processingTime: result.processingTime || 0
    };
  }

  /**
   * ✅ STANDARDIZED: Validate enhancement request
   */
  static validateEnhancementRequest(productData) {
    const errors = [];
    
    if (!productData.partNumber || !productData.partNumber.trim()) {
      errors.push('Part number is required');
    }
    
    if (productData.partNumber && productData.partNumber.length > 100) {
      errors.push('Part number too long (max 100 characters)');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * ✅ STANDARDIZED: Get enhancement status for UI display
   */
  static getEnhancementStatus(productData) {
    if (productData.mcpEnhanced && productData.mcpMetadata) {
      return {
        type: 'mcp_ai_enhanced',
        display: 'MCP AI Enhanced',
        confidence: Math.round((productData.confidence || 0) * 100),
        badge: '🧠 MCP AI Enhanced',
        color: 'purple',
        lastEnhanced: productData.lastEnhanced,
        promptUsed: productData.mcpMetadata.prompt_used
      };
    } else if (productData.aiEnriched) {
      return {
        type: 'basic_enhanced',
        display: 'Basic Enhanced',
        confidence: Math.round((productData.confidence || 0) * 100),
        badge: '⚙️ Basic Enhanced',
        color: 'gray',
        lastEnhanced: productData.lastEnhanced
      };
    } else {
      return {
        type: 'manual',
        display: 'Manual Entry',
        confidence: 0,
        badge: '📝 Manual',
        color: 'blue',
        lastEnhanced: null
      };
    }
  }
}

export { MCPProductEnhancementService };
