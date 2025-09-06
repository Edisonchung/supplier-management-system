// src/services/MCPPromptService.js
// MCP (Managed Claude Prompts) Service for dual prompt system

const MCP_API_BASE = import.meta.env.VITE_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class MCPPromptService {
  constructor() {
    this.cache = new Map();
    this.apiBase = MCP_API_BASE;
  }

  /**
   * Get available prompts from MCP system
   */
  async getPrompts() {
    const cacheKey = 'mcp_prompts';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📋 Using cached MCP prompts');
      return cached.data;
    }

    try {
      console.log('🌐 Fetching prompts from MCP API...');
      
      const response = await fetch(`${this.apiBase}/api/ai/prompts`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      if (!response.ok) {
        throw new Error(`MCP API error: ${response.status}`);
      }

      const data = await response.json();
      const prompts = data.prompts || data || [];

      // Cache the results
      this.cache.set(cacheKey, {
        data: prompts,
        timestamp: Date.now()
      });

      console.log(`✅ Fetched ${prompts.length} prompts from MCP system`);
      return prompts;

    } catch (error) {
      console.warn('⚠️ MCP API unavailable, using fallback prompts:', error);
      return this.createFallbackPrompts();
    }
  }

  /**
   * Select best prompt for extraction based on context
   */
  async selectPromptForExtraction(prompts, supplierInfo, documentType, userInfo, fileType) {
    console.log('🎯 Selecting prompt for:', {
      documentType,
      supplier: supplierInfo?.name,
      user: userInfo?.email,
      fileType,
      availablePrompts: prompts?.length || 0
    });

    if (!prompts || prompts.length === 0) {
      console.warn('❌ No prompts available for selection');
      return null;
    }

    // Filter to active prompts only
    const activePrompts = prompts.filter(p => p.isActive !== false);
    console.log(`📋 Active prompts: ${activePrompts.length}/${prompts.length}`);

    // Score each prompt based on context
    const scored = activePrompts.map(prompt => {
      let score = 0;
      const promptName = prompt.name?.toLowerCase() || '';
      const promptCategory = prompt.category?.toLowerCase() || '';
      
      console.log(`🔍 Scoring prompt: "${prompt.name}"`);

      // CRITICAL: Purchase Order Detection
      if (documentType === 'purchase_order' || documentType === 'po_extraction') {
        if (promptName.includes('purchase order') || 
            promptName.includes('po extraction') ||
            promptName.includes('po ') ||
            promptCategory === 'purchase_order') {
          score += 200; // High priority for PO prompts
          console.log(`   📋 Purchase Order match: +200 (score: ${score})`);
        }
        
        // Penalize wrong prompt types for PO documents
        if (promptName.includes('brand detection') || 
            promptName.includes('product enhancement') ||
            promptCategory === 'product_enhancement') {
          score -= 150; // Heavy penalty for wrong prompt type
          console.log(`   ⚠️ Wrong prompt type penalty: -150 (score: ${score})`);
        }
      }

      // Supplier-specific matching
      if (supplierInfo?.name) {
        const supplierName = supplierInfo.name.toLowerCase();
        
        if (prompt.suppliers?.includes(supplierInfo.name) || 
            prompt.suppliers?.includes('ALL') ||
            promptName.includes(supplierName)) {
          score += 100;
          console.log(`   🏢 Supplier match: +100 (score: ${score})`);
        }
        
        // Special PTP handling
        if (supplierName.includes('tanjung pelepas') || supplierName.includes('ptp')) {
          if (promptName.includes('ptp') || promptName.includes('tanjung pelepas')) {
            score += 150;
            console.log(`   🚢 PTP specific match: +150 (score: ${score})`);
          }
        }
      }

      // User-specific targeting (Edison gets MCP prompts)
      if (userInfo?.email === 'edisonchung@flowsolution.net') {
        if (!promptName.includes('legacy') && !promptName.includes('fallback')) {
          score += 80;
          console.log(`   👤 Test user MCP preference: +80 (score: ${score})`);
        }
      }

      // Document type matching
      if (prompt.documentTypes?.includes(documentType) || 
          prompt.category === documentType) {
        score += 90;
        console.log(`   📄 Document type match: +90 (score: ${score})`);
      }

      // AI provider preference
      if (prompt.aiProvider === 'deepseek') {
        score += 30;
        console.log(`   🤖 AI provider match: +30 (score: ${score})`);
      }

      // Version scoring
      if (prompt.version) {
        const versionMatch = prompt.version.match(/(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);
          const versionScore = major * 10 + minor;
          score += versionScore;
          console.log(`   📊 Version score: +${versionScore} (score: ${score})`);
        }
      }

      // Performance boost
      if (prompt.performance?.accuracy > 0.9) {
        score += 40;
        console.log(`   ⭐ High accuracy boost: +40 (score: ${score})`);
      }

      console.log(`📊 Final score for "${prompt.name}": ${score}`);
      return { ...prompt, _score: score };
    });

    // Sort by score (highest first)
    const sorted = scored.sort((a, b) => b._score - a._score);
    
    console.log('🏆 Top 3 scoring prompts:');
    sorted.slice(0, 3).forEach((prompt, i) => {
      console.log(`   ${i + 1}. ${prompt.name} (score: ${prompt._score})`);
    });

    const bestPrompt = sorted[0];
    
    // Only return prompts with positive scores
    if (bestPrompt && bestPrompt._score > 0) {
      console.log(`✅ SELECTED: "${bestPrompt.name}" with score ${bestPrompt._score}`);
      
      // Validation for purchase orders
      if (documentType === 'purchase_order' || documentType === 'po_extraction') {
        if (bestPrompt.name.toLowerCase().includes('brand detection')) {
          console.error('🚨 CRITICAL ERROR: Selected brand detection prompt for Purchase Order!');
        }
      }
      
      return bestPrompt;
    } else {
      console.log(`❌ No suitable prompt found - best score: ${bestPrompt?._score || 'none'}`);
      return null;
    }
  }

  /**
   * Track prompt usage analytics
   */
  async trackPromptUsage(promptId, context) {
    try {
      await fetch(`${this.apiBase}/api/ai/prompts/${promptId}/usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: context,
          timestamp: new Date().toISOString(),
          system: 'dual_extraction'
        }),
        timeout: 5000
      });
    } catch (error) {
      // Silently fail - analytics shouldn't break extraction
      console.warn('Analytics tracking failed:', error.message);
    }
  }

  /**
   * Get count of available MCP prompts
   */
  async getPromptCount() {
    try {
      const prompts = await this.getPrompts();
      return prompts.length;
    } catch {
      return 0;
    }
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ MCPPromptService cache cleared');
  }

  /**
   * Create fallback prompts when MCP API is unavailable
   */
  createFallbackPrompts() {
    return [
      {
        id: 'fallback_po_base',
        name: 'Purchase Order - Base Extraction (Fallback)',
        category: 'purchase_order',
        documentTypes: ['purchase_order', 'po_extraction'],
        version: '2.0.0',
        isActive: true,
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2000,
        description: 'Fallback prompt when MCP API is unavailable - specifically for Purchase Orders',
        performance: { accuracy: 0.85 },
        prompt: `You are a specialized Purchase Order extraction expert. Extract PO information with precision.

CRITICAL INSTRUCTIONS:
1. This is a PURCHASE ORDER document - extract PO-specific data
2. Focus on: PO number, client info, line items, quantities, prices, delivery terms
3. Do NOT treat this as a product enhancement or brand detection task

EXTRACT PURCHASE ORDER DATA:
- Purchase Order Number
- Client Information (name, address, contact)
- Supplier Information (recipient of PO)
- Order Date and Delivery Date
- Payment Terms and Delivery Terms
- Line Items with:
  * Item codes/part numbers
  * Descriptions
  * Quantities
  * Unit prices
  * Total amounts
- Subtotal, Tax, Grand Total

OUTPUT STRUCTURED JSON:
{
  "purchase_order": {
    "order_number": "extracted PO number",
    "client": {
      "name": "client company name",
      "address": "client address"
    },
    "items": [
      {
        "lineNumber": 1,
        "productCode": "item code",
        "productName": "item description",
        "quantity": number,
        "unitPrice": number,
        "totalPrice": number
      }
    ],
    "totals": {
      "subtotal": number,
      "tax": number,
      "total": number
    }
  }
}

Remember: This is a PURCHASE ORDER extraction, not product enhancement!`
      },
      {
        id: 'fallback_po_ptp',
        name: 'Purchase Order - PTP Client Specific (Fallback)',
        category: 'purchase_order',
        documentTypes: ['purchase_order'],
        version: '2.0.0',
        isActive: true,
        suppliers: ['Pelabuhan Tanjung Pelepas', 'PTP', 'ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2500,
        description: 'PTP-specific purchase order extraction fallback',
        performance: { accuracy: 0.91 },
        prompt: `SPECIALIZED PTP PURCHASE ORDER EXTRACTION

You are extracting from a Purchase Order issued BY Pelabuhan Tanjung Pelepas Sdn. Bhd. TO Flow Solution Sdn Bhd.

CLIENT IDENTIFICATION:
- Client: Pelabuhan Tanjung Pelepas Sdn. Bhd. (PTP)
- Supplier: Flow Solution Sdn Bhd (recipient)
- Client PO Number: Look for PTP's internal PO reference
- Client Item Codes: PTP's internal part numbers (e.g., 400MEQ0025)

EXTRACT WITH PTP CONTEXT:
{
  "purchase_order": {
    "order_number": "PTP's PO number",
    "client": {
      "name": "Pelabuhan Tanjung Pelepas Sdn. Bhd.",
      "address": "PTP address"
    },
    "supplier": {
      "name": "Flow Solution Sdn Bhd",
      "address": "Flow Solution address"
    },
    "items": [
      {
        "lineNumber": 1,
        "clientItemCode": "PTP's item code (e.g., 400MEQ0025)",
        "productCode": "manufacturer part number",
        "productName": "item description",
        "quantity": number,
        "unitPrice": number,
        "totalPrice": number,
        "projectCode": "FS-XXXX project code if present"
      }
    ]
  }
}

CRITICAL: This is a CLIENT PURCHASE ORDER, not product enhancement!`
      },
      {
        id: 'fallback_brand_detection',
        name: 'Product Enhancement - Brand Detection & Analysis (Fallback)',
        category: 'product_enhancement',
        documentTypes: ['product_enhancement', 'brand_detection'],
        version: '1.0.0',
        isActive: true,
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.2,
        maxTokens: 1500,
        description: 'Generic brand and product enhancement fallback',
        performance: { accuracy: 0.75 },
        prompt: `You are a product analysis expert. Analyze and enhance product information.

FOCUS AREAS:
- Brand identification
- Product categorization
- Technical specifications
- Market positioning

OUTPUT FORMAT:
{
  "detected_brand": "brand name",
  "category": "product category",
  "enhanced_description": "improved description",
  "specifications": {},
  "confidence": 0.8
}

Note: This is for PRODUCT ENHANCEMENT only, not purchase order extraction.`
      }
    ];
  }

  /**
   * Test if user should get MCP system
   */
  isTestUser(userEmail) {
    const testUsers = [
      'edisonchung@flowsolution.net',
      'edison@flowsolution.net'
    ];
    return testUsers.includes(userEmail?.toLowerCase());
  }

  /**
   * Get prompt system preference for user
   */
  async getSystemPreference(userEmail) {
    try {
      const response = await fetch(`${this.apiBase}/api/prompt-system-status?userEmail=${userEmail}`);
      if (response.ok) {
        const data = await response.json();
        return {
          system: data.current_system,
          isTestUser: data.user_info?.is_test_user,
          selectedPrompt: data.selected_prompt
        };
      }
    } catch (error) {
      console.warn('Could not get system preference:', error);
    }
    
    // Fallback logic
    return {
      system: this.isTestUser(userEmail) ? 'mcp' : 'legacy',
      isTestUser: this.isTestUser(userEmail),
      selectedPrompt: null
    };
  }
}

// Export singleton instance
export const mcpPromptService = new MCPPromptService();
export default mcpPromptService;
