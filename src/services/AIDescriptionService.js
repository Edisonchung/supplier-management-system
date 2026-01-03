/**
 * AIDescriptionService.js
 * 
 * Service for generating AI-powered product descriptions using MCP engine
 * Integrates with HiggsFlow MCP system for intelligent content generation
 */

import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

class AIDescriptionService {
  constructor() {
    this.apiEndpoint = process.env.REACT_APP_MCP_API_URL || '/api/mcp';
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  // ============================================================================
  // MAIN DESCRIPTION GENERATION
  // ============================================================================

  /**
   * Generate a product description using AI
   * @param {Object} params - Product parameters
   * @param {string} params.sku - Product SKU
   * @param {string} params.brand - Brand name
   * @param {string} params.category - Product category
   * @param {string} params.existingDescription - Current description
   * @param {Object} params.technicalSpecs - Technical specifications
   * @param {string} params.style - Description style: 'professional', 'technical', 'marketing'
   * @returns {Promise<Object>} Generated description with metadata
   */
  async generateProductDescription({
    sku,
    brand,
    category,
    existingDescription,
    technicalSpecs = {},
    style = 'professional'
  }) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey({ sku, brand, style });
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }

      // Build the prompt
      const prompt = this.buildDescriptionPrompt({
        sku,
        brand,
        category,
        existingDescription,
        technicalSpecs,
        style
      });

      // Call MCP API
      const response = await fetch(`${this.apiEndpoint}/generate-description`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          context: {
            type: 'quotation_product_description',
            brand,
            category,
            style
          },
          options: {
            maxTokens: 500,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`MCP API error: ${response.status}`);
      }

      const data = await response.json();

      const result = {
        description: data.content || data.description,
        style,
        generatedAt: new Date().toISOString(),
        source: 'mcp_ai',
        confidence: data.confidence || 0.85,
        metadata: {
          model: data.model || 'claude-3',
          tokensUsed: data.tokensUsed || 0,
          processingTime: data.processingTime || 0
        }
      };

      // Cache the result
      this.setToCache(cacheKey, result);

      // Store in Firestore for future reference
      await this.storeGeneratedDescription({
        sku,
        brand,
        ...result
      });

      return result;
    } catch (error) {
      console.error('AI description generation error:', error);
      
      // Return fallback description
      return {
        description: this.generateFallbackDescription({ sku, brand, category }),
        style,
        generatedAt: new Date().toISOString(),
        source: 'fallback',
        confidence: 0.5,
        error: error.message
      };
    }
  }

  /**
   * Generate description - wrapper method for quotation system
   * @param {Object} params - Product parameters
   * @param {string} params.productId - Product ID
   * @param {string} params.productName - Product name
   * @param {Object} params.productSpecs - Product specifications
   * @param {string} params.standardDescription - Standard description
   * @param {Object} params.config - Configuration options
   * @returns {Promise<Object>} Result with success flag and description
   */
  async generateDescription({ productId, productName, productSpecs = {}, standardDescription = '', config = {} }) {
    try {
      // Extract product info from specs or use defaults
      const sku = productSpecs.sku || productSpecs.partNumber || '';
      const brand = productSpecs.brand || '';
      const category = productSpecs.category || 'Industrial Equipment';
      const style = config.tone === 'technical' ? 'technical' : 
                   config.tone === 'commercial' ? 'marketing' : 
                   'professional';
      
      const result = await this.generateProductDescription({
        sku,
        brand,
        category,
        existingDescription: standardDescription,
        technicalSpecs: productSpecs,
        style
      });
      
      // Return in expected format with success flag
      return {
        success: true,
        description: result.description || '',
        ...result
      };
    } catch (error) {
      console.error('AI description generation error:', error);
      return {
        success: false,
        description: '',
        error: error.message
      };
    }
  }

  /**
   * Build the prompt for description generation
   */
  buildDescriptionPrompt({ sku, brand, category, existingDescription, technicalSpecs, style }) {
    const styleInstructions = {
      professional: `Write a professional, clear product description suitable for a B2B quotation. 
                     Focus on key features and benefits. Keep it concise but informative.`,
      technical: `Write a detailed technical description emphasizing specifications, 
                  performance characteristics, and engineering details. 
                  Use industry-standard terminology.`,
      marketing: `Write an engaging product description that highlights unique selling points, 
                  quality, and value proposition. Make it compelling while remaining professional.`
    };

    let prompt = `Generate a product description for a quotation.

Product Information:
- SKU: ${sku || 'N/A'}
- Brand: ${brand || 'N/A'}
- Category: ${category || 'Industrial Equipment'}

${Object.keys(technicalSpecs).length > 0 ? `
Technical Specifications:
${Object.entries(technicalSpecs).map(([key, value]) => `- ${key}: ${value}`).join('\n')}
` : ''}

${existingDescription ? `
Current Description (for reference):
${existingDescription}
` : ''}

Style: ${style}
${styleInstructions[style] || styleInstructions.professional}

Requirements:
- Keep the description between 50-150 words
- Highlight key features and benefits
- Maintain factual accuracy
- Use appropriate industry terminology
- Do not include pricing information
- Format for easy reading (can use bullet points for specs)

Generate the description:`;

    return prompt;
  }

  /**
   * Generate fallback description when AI is unavailable
   */
  generateFallbackDescription({ sku, brand, category }) {
    const templates = {
      'Pumps': `High-quality ${brand || ''} pump designed for reliable industrial performance. This ${sku || 'unit'} features robust construction and efficient operation for demanding applications.`,
      'Valves': `Premium ${brand || ''} valve engineered for precise flow control. Model ${sku || ''} offers excellent durability and consistent performance in industrial environments.`,
      'Instruments': `Professional-grade ${brand || ''} instrumentation providing accurate measurement and monitoring. Model ${sku || ''} delivers reliable results for process control applications.`,
      'default': `Quality ${brand || ''} ${category || 'industrial'} product. Model ${sku || ''} - engineered for performance and reliability in demanding applications.`
    };

    return templates[category] || templates.default;
  }

  // ============================================================================
  // BATCH GENERATION
  // ============================================================================

  /**
   * Generate descriptions for multiple products
   * @param {Array} products - Array of product objects
   * @param {string} style - Description style
   * @returns {Promise<Array>} Array of generated descriptions
   */
  async generateBatchDescriptions(products, style = 'professional') {
    const results = [];
    const batchSize = 5; // Process in batches to avoid rate limiting

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(product => this.generateProductDescription({
          ...product,
          style
        }))
      );

      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < products.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  // ============================================================================
  // DESCRIPTION SUGGESTIONS
  // ============================================================================

  /**
   * Get description suggestions for a product
   * Returns standard, AI-generated, and custom options
   */
  async getDescriptionSuggestions({ productId, sku, brand, category, existingDescription }) {
    const suggestions = [];

    // 1. Standard description from catalog
    if (productId) {
      try {
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
          const productData = productDoc.data();
          if (productData.description) {
            suggestions.push({
              type: 'standard',
              label: 'Standard (Catalog)',
              description: productData.description,
              source: 'product_catalog'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching product description:', err);
      }
    }

    // 2. AI-generated descriptions (multiple styles)
    const styles = ['professional', 'technical', 'marketing'];
    for (const style of styles) {
      try {
        const aiResult = await this.generateProductDescription({
          sku,
          brand,
          category,
          existingDescription,
          style
        });

        suggestions.push({
          type: 'ai_generated',
          label: `AI ${style.charAt(0).toUpperCase() + style.slice(1)}`,
          description: aiResult.description,
          source: 'mcp_ai',
          style,
          confidence: aiResult.confidence
        });
      } catch (err) {
        console.error(`Error generating ${style} description:`, err);
      }
    }

    // 3. Last custom description (if exists)
    if (existingDescription && !suggestions.some(s => s.description === existingDescription)) {
      suggestions.push({
        type: 'custom',
        label: 'Custom (Last Edited)',
        description: existingDescription,
        source: 'user_custom'
      });
    }

    return suggestions;
  }

  // ============================================================================
  // ENHANCEMENT & IMPROVEMENT
  // ============================================================================

  /**
   * Enhance an existing description
   */
  async enhanceDescription(existingDescription, { brand, category, improvements = [] }) {
    try {
      const improvementInstructions = improvements.length > 0
        ? `Specific improvements requested: ${improvements.join(', ')}`
        : 'Improve clarity, professionalism, and completeness';

      const prompt = `Enhance the following product description:

Original Description:
${existingDescription}

Brand: ${brand || 'N/A'}
Category: ${category || 'Industrial Equipment'}

${improvementInstructions}

Requirements:
- Keep the core meaning and key information
- Improve grammar and clarity
- Add any missing important details
- Maintain professional tone
- Keep similar length (±20%)

Enhanced Description:`;

      const response = await fetch(`${this.apiEndpoint}/enhance-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          context: { type: 'description_enhancement' }
        })
      });

      if (!response.ok) {
        throw new Error(`Enhancement API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        original: existingDescription,
        enhanced: data.content || data.description,
        changes: data.changes || [],
        confidence: data.confidence || 0.8
      };
    } catch (error) {
      console.error('Description enhancement error:', error);
      return {
        original: existingDescription,
        enhanced: existingDescription,
        error: error.message
      };
    }
  }

  /**
   * Translate description to another language
   */
  async translateDescription(description, targetLanguage = 'zh') {
    try {
      const response = await fetch(`${this.apiEndpoint}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: description,
          targetLanguage,
          context: { type: 'product_description' }
        })
      });

      if (!response.ok) {
        throw new Error(`Translation API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        original: description,
        translated: data.translation,
        targetLanguage,
        confidence: data.confidence || 0.9
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        original: description,
        translated: description,
        error: error.message
      };
    }
  }

  // ============================================================================
  // STORAGE & CACHING
  // ============================================================================

  /**
   * Store generated description in Firestore for analytics and reuse
   */
  async storeGeneratedDescription({ sku, brand, description, style, source, confidence }) {
    try {
      const docRef = doc(collection(db, 'ai_generated_descriptions'));
      await setDoc(docRef, {
        sku,
        brand,
        description,
        style,
        source,
        confidence,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error storing generated description:', error);
    }
  }

  getCacheKey({ sku, brand, style }) {
    return `${sku}-${brand}-${style}`.toLowerCase().replace(/\s+/g, '-');
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // ============================================================================
  // SPECIFICATION EXTRACTION
  // ============================================================================

  /**
   * Extract specifications from a description
   */
  async extractSpecifications(description) {
    try {
      const response = await fetch(`${this.apiEndpoint}/extract-specs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: description,
          context: { type: 'product_description' }
        })
      });

      if (!response.ok) {
        throw new Error(`Spec extraction API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        specifications: data.specifications || {},
        features: data.features || [],
        confidence: data.confidence || 0.7
      };
    } catch (error) {
      console.error('Specification extraction error:', error);
      return {
        specifications: {},
        features: [],
        error: error.message
      };
    }
  }
}

// Singleton instance
const aiDescriptionService = new AIDescriptionService();
export default aiDescriptionService;
