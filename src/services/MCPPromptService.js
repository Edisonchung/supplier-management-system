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
   * ✅ CRITICAL FIX: Enhanced prompt selection with document-type priority
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

    if (activePrompts.length === 0) {
      console.warn('❌ No active prompts available');
      return null;
    }

    // ✅ CRITICAL FIX: Document-type-first scoring algorithm
    const scored = activePrompts.map(prompt => {
      let score = 0;
      const promptName = prompt.name?.toLowerCase() || '';
      const promptCategory = prompt.category?.toLowerCase() || '';
      const docType = (documentType || '').toLowerCase();
      
      console.log(`🔍 Scoring prompt: "${prompt.name}" (category: ${promptCategory})`);

      // ✅ STEP 1: CRITICAL DOCUMENT TYPE MATCHING (Category-based - highest priority)
      if (docType.includes('purchase') || docType === 'purchase_order' || docType === 'po_extraction') {
        if (promptCategory === 'purchase_order' || promptCategory === 'po_extraction') {
          score += 1000; // Highest priority for exact category match
          console.log(`   ✅ Purchase Order category match: +1000 (score: ${score})`);
        } else if (promptName.includes('purchase order') || promptName.includes('po extraction') || promptName.includes(' po ')) {
          score += 800; // High priority for name-based PO match
          console.log(`   ✅ Purchase Order name match: +800 (score: ${score})`);
        } else if (promptCategory === 'product_enhancement' || promptName.includes('brand detection') || promptName.includes('product enhancement')) {
          score = -1000; // REJECT wrong prompt types completely
          console.log(`   ❌ WRONG category for purchase order: ${prompt.name} (-1000) - REJECTED`);
        } else if (promptCategory === 'proforma_invoice' || promptCategory === 'bank_payment') {
          score = -1000; // REJECT other document types
          console.log(`   ❌ WRONG category for purchase order: ${prompt.name} (-1000) - REJECTED`);
        }
      } 
      else if (docType.includes('proforma') || docType === 'proforma_invoice') {
        if (promptCategory === 'proforma_invoice') {
          score += 1000;
          console.log(`   ✅ Proforma category match: +1000 (score: ${score})`);
        } else if (promptName.includes('proforma') || promptName.includes('pi extraction')) {
          score += 800;
          console.log(`   ✅ Proforma name match: +800 (score: ${score})`);
        } else if (promptCategory === 'purchase_order' || promptCategory === 'product_enhancement' || promptCategory === 'bank_payment') {
          score = -1000; // REJECT wrong categories
          console.log(`   ❌ WRONG category for proforma: ${prompt.name} (-1000) - REJECTED`);
        }
      }
      else if (docType.includes('bank') || docType.includes('payment')) {
        if (promptCategory === 'bank_payment' || promptCategory === 'payment_extraction') {
          score += 1000;
          console.log(`   ✅ Bank/Payment category match: +1000 (score: ${score})`);
        } else if (promptName.includes('bank') || promptName.includes('payment')) {
          score += 800;
          console.log(`   ✅ Bank/Payment name match: +800 (score: ${score})`);
        } else if (promptCategory === 'purchase_order' || promptCategory === 'proforma_invoice' || promptCategory === 'product_enhancement') {
          score = -1000; // REJECT wrong categories
          console.log(`   ❌ WRONG category for bank payment: ${prompt.name} (-1000) - REJECTED`);
        }
      }

      // ✅ STEP 2: Additional scoring (only if not rejected in step 1)
      if (score >= 0) {
        // 🏢 Supplier-specific matching
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

        // 👤 User-specific targeting (Edison gets MCP prompts)
        if (userInfo?.email === 'edisonchung@flowsolution.net') {
          if (!promptName.includes('legacy') && !promptName.includes('fallback')) {
            score += 80;
            console.log(`   👤 Test user MCP preference: +80 (score: ${score})`);
          }
        }

        // 📄 Document type matching (additional points for document types array)
        if (prompt.documentTypes?.includes(documentType) || 
            prompt.category === documentType) {
          score += 90;
          console.log(`   📄 Document type match: +90 (score: ${score})`);
        }

        // 🤖 AI provider preference
        if (prompt.aiProvider === 'deepseek') {
          score += 30;
          console.log(`   🤖 AI provider match: +30 (score: ${score})`);
        }

        // 🔄 Version scoring (newer versions get bonus)
        if (prompt.version) {
          const versionMatch = prompt.version.match(/(\d+)\.(\d+)/);
          if (versionMatch) {
            const major = parseInt(versionMatch[1]);
            const minor = parseInt(versionMatch[2]);
            const versionScore = major * 10 + minor;
            score += versionScore;
            console.log(`   🔄 Version score: +${versionScore} (score: ${score})`);
          }
        }

        // ⭐ Performance boost for high accuracy
        if (prompt.performance?.accuracy > 0.9) {
          score += 40;
          console.log(`   ⭐ High accuracy boost: +40 (score: ${score})`);
        }
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
    
    // ✅ CRITICAL: Only return prompts with positive scores
    if (bestPrompt && bestPrompt._score > 0) {
      console.log(`✅ SELECTED: "${bestPrompt.name}" with score ${bestPrompt._score}`);
      
      // ✅ VALIDATION: Double-check for Purchase Orders
      if (docType.includes('purchase') || docType === 'purchase_order' || docType === 'po_extraction') {
        if (bestPrompt.name.toLowerCase().includes('brand detection') || 
            bestPrompt.name.toLowerCase().includes('product enhancement')) {
          console.error('🚨 CRITICAL ERROR: Selected wrong prompt type for Purchase Order!');
          console.error(`Expected: Purchase Order prompt`);
          console.error(`Actual: "${bestPrompt.name}"`);
          console.error(`System used: mcp`);
          console.error(`User: ${userInfo?.email}`);
          
          // Try to find a backup PO prompt
          const backupPO = sorted.find(p => 
            p._score > 0 && 
            (p.category === 'purchase_order' || 
             p.name.toLowerCase().includes('purchase order'))
          );
          
          if (backupPO) {
            console.log(`🔄 Using backup PO prompt: ${backupPO.name}`);
            return backupPO;
          } else {
            console.error('❌ No backup PO prompt available!');
            return null;
          }
        }
      }
      
      return bestPrompt;
    } else {
      console.log(`❌ No suitable prompt found - best score: ${bestPrompt?._score || 'none'}`);
      console.log('💡 Reason: No category-matched prompts available or all prompts rejected for wrong document type');
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
   * ✅ ENHANCED: Create fallback prompts when MCP API is unavailable
   */
  createFallbackPrompts() {
    return [
      {
        id: 'fallback_po_enhanced',
        name: 'Purchase Order - Enhanced Extraction (Fallback)',
        category: 'purchase_order',
        documentTypes: ['purchase_order', 'po_extraction'],
        version: '2.1.0',
        isActive: true,
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2500,
        description: 'Enhanced fallback prompt specifically for Purchase Orders when MCP API is unavailable',
        performance: { accuracy: 0.90 },
        prompt: `You are a specialized Purchase Order extraction expert with advanced table parsing capabilities.

CRITICAL INSTRUCTIONS FOR PURCHASE ORDER EXTRACTION:
1. This is a PURCHASE ORDER document - extract PO-specific information only
2. Focus on: PO number, supplier/client details, line items with precise quantities and prices
3. Parse tables with exact column identification and data extraction
4. Do NOT treat this as product enhancement or brand detection

REQUIRED OUTPUT STRUCTURE:
{
  "poNumber": "extracted PO number",
  "dateIssued": "YYYY-MM-DD format",
  "supplier": {
    "name": "supplier company name",
    "address": "full address",
    "contact": "phone/email"
  },
  "items": [
    {
      "lineNumber": number,
      "productCode": "item code",
      "productName": "item description",
      "quantity": number,
      "unit": "UOM",
      "unitPrice": number,
      "totalPrice": number,
      "projectCode": "project reference if available"
    }
  ],
  "totalAmount": total_numeric_value,
  "deliveryDate": "YYYY-MM-DD format",
  "paymentTerms": "payment terms",
  "extractedAt": "current ISO timestamp",
  "aiProvider": "deepseek",
  "confidence": confidence_score_0_to_1,
  "documentType": "purchase_order"
}

EXTRACT ONLY PURCHASE ORDER DATA. Do not confuse with proforma invoices or other document types.`
      },
      {
        id: 'fallback_po_ptp',
        name: 'Purchase Order - PTP Client Specific (Fallback)',
        category: 'purchase_order',
        documentTypes: ['purchase_order'],
        version: '2.1.0',
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
  "poNumber": "PTP's PO number",
  "dateIssued": "YYYY-MM-DD format",
  "supplier": {
    "name": "Pelabuhan Tanjung Pelepas Sdn. Bhd.",
    "address": "PTP address"
  },
  "client": {
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
  ],
  "totalAmount": number,
  "deliveryDate": "YYYY-MM-DD format",
  "paymentTerms": "payment terms",
  "extractedAt": "current ISO timestamp",
  "aiProvider": "deepseek",
  "confidence": confidence_score_0_to_1,
  "documentType": "purchase_order"
}

CRITICAL: This is a CLIENT PURCHASE ORDER, not product enhancement!`
      },
      {
        id: 'fallback_pi_base',
        name: 'Proforma Invoice - Base Extraction (Fallback)',
        category: 'proforma_invoice',
        documentTypes: ['proforma_invoice', 'pi_extraction'],
        version: '2.0.0',
        isActive: true,
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2000,
        description: 'Fallback prompt for Proforma Invoice extraction',
        performance: { accuracy: 0.88 },
        prompt: `You are a specialized Proforma Invoice extraction expert.

CRITICAL INSTRUCTIONS FOR PROFORMA INVOICE EXTRACTION:
1. This is a PROFORMA INVOICE document - extract PI-specific information only
2. Focus on: Invoice number, billing details, quoted items, prices, and terms
3. Extract supplier information and client billing details accurately

REQUIRED OUTPUT STRUCTURE:
{
  "invoiceNumber": "PI number",
  "dateIssued": "YYYY-MM-DD format",
  "supplier": {
    "name": "supplier company name",
    "address": "supplier address",
    "contact": "contact details"
  },
  "client": {
    "name": "client company name",
    "address": "billing address"
  },
  "items": [
    {
      "lineNumber": number,
      "productCode": "item code",
      "description": "item description",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "subtotal": numeric_value,
  "tax": numeric_value,
  "totalAmount": numeric_value,
  "validUntil": "YYYY-MM-DD format",
  "paymentTerms": "payment terms",
  "extractedAt": "current ISO timestamp",
  "aiProvider": "deepseek",
  "confidence": confidence_score_0_to_1,
  "documentType": "proforma_invoice"
}

EXTRACT ONLY PROFORMA INVOICE DATA. Do not confuse with purchase orders or other document types.`
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
