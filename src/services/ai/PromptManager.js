//services/ai/PromptManager.js
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class PromptManager {
  constructor() {
    this.promptsPath = path.join(__dirname, '../../data/ai/prompts.json');
    this.prompts = new Map();
    this.loadPrompts();
  }

  async loadPrompts() {
    try {
      const data = await fs.readFile(this.promptsPath, 'utf8');
      const prompts = JSON.parse(data);
      
      prompts.forEach(prompt => {
        this.prompts.set(prompt.id, prompt);
      });
      
      console.log(`✅ Loaded ${prompts.length} AI prompts`);
    } catch (error) {
      console.log('🔄 Creating default prompts configuration...');
      await this.createDefaultPrompts();
    }
  }

  async createDefaultPrompts() {
    const defaultPrompts = [
      {
        id: 'po_extraction_base',
        name: 'Purchase Order - Base Extraction',
        moduleId: 'document_extraction',
        category: 'purchase_order',
        version: '1.3.0',
        isActive: true,
        documentTypes: ['pdf', 'image'],
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2000,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        prompt: `Extract purchase order information with PRECISE table column identification.

CRITICAL RULES FOR HIGGSFLOW:
1. ALWAYS identify exact column order from table headers
2. QUANTITY vs UNIT PRICE identification:
   - Quantity: Usually smaller numbers (1-10,000 range)
   - Unit Price: Usually larger monetary values with decimals ($100.00, $2,200.00)
3. VALIDATION: quantity × unitPrice should ≈ totalPrice
4. If calculation mismatch > 10%, SWAP values and re-check

COMMON PO TABLE PATTERNS:
- Line | Part Number | Description | Quantity | UOM | Unit Price | Amount
- Line | Part Number | Delivery Date | Quantity | UOM | Unit Price | TAX | Amount

RETURN STRUCTURED JSON:
{
  "purchase_order": {
    "poNumber": "string",
    "dateIssued": "string", 
    "supplier": {
      "name": "string",
      "address": "string"
    },
    "items": [
      {
        "lineNumber": number,
        "productCode": "string",
        "productName": "string",
        "quantity": number,
        "unit": "string", 
        "unitPrice": number,
        "totalPrice": number
      }
    ],
    "totalAmount": number
  }
}`,
        performance: { accuracy: 92, speed: 2.3, tokens: 1250, lastTested: null }
      },
      {
        id: 'ptp_supplier_specific',
        name: 'PTP Supplier - Enhanced Extraction',
        moduleId: 'document_extraction',
        category: 'purchase_order',
        version: '1.1.0',
        isActive: true,
        documentTypes: ['pdf'],
        suppliers: ['PTP', 'PT. PERINTIS TEKNOLOGI PERDANA'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2000,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        prompt: `PTP Purchase Order - SPECIALIZED EXTRACTION for PT. PERINTIS TEKNOLOGI PERDANA

TABLE LAYOUT: Line | Part Number | Delivery Date | Quantity | UOM | Unit Price | TAX | Amount

CRITICAL PTP-SPECIFIC RULES:
1. Quantity in column 4 (after Delivery Date)
2. Unit Price in column 6 (after UOM)
3. Amount in column 8 (final column)
4. Part numbers: 200RTG*, 400CON*, 400SHA*, 400RTG*

⚠️ SPECIAL PTP MULTI-LINE FORMAT:
- Line 1: "400QCR1068    1.00   PCS   20,500.00"
- Line 2: "THRUSTER" ← This is the ACTUAL product name
- DO NOT extract UOM values (PCS, UNI, SET, EA) as product names!

VALIDATION FOR PTP:
- quantity × unitPrice = amount (±5% tolerance)
- If mismatch detected, check for column misalignment

RETURN PTP-OPTIMIZED JSON:
{
  "purchase_order": {
    "supplier": {
      "name": "PT. PERINTIS TEKNOLOGI PERDANA",
      "type": "PTP_TEMPLATE"
    },
    "items": [
      {
        "productCode": "400QCR1068",
        "productName": "THRUSTER",
        "quantity": 1,
        "unit": "PCS",
        "unitPrice": 20500.00,
        "totalPrice": 20500.00,
        "extractionNotes": "Multi-line format processed"
      }
    ]
  },
  "metadata": {
    "supplier": "PTP",
    "extractionMethod": "PTP_SPECIALIZED",
    "confidence": 0.95
  }
}`,
        performance: { accuracy: 96, speed: 2.1, tokens: 980, lastTested: null }
      },
      {
        id: 'pi_extraction_base',
        name: 'Proforma Invoice - Base Extraction',
        moduleId: 'document_extraction',
        category: 'proforma_invoice',
        version: '1.1.0',
        isActive: true,
        documentTypes: ['pdf', 'email'],
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2000,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        prompt: `Extract proforma invoice information for HiggsFlow procurement system.

PROFORMA INVOICE PARSING RULES:
1. Identify PI number, date, validity period
2. Extract complete supplier and buyer information
3. Parse itemized products with accurate pricing
4. Calculate totals including taxes and terms

KEY FIELDS TO EXTRACT:
- PI Number (usually starts with "PI", "PRO", or numeric)
- Issue date and validity date
- Supplier details (name, address, contact)
- Buyer information
- Itemized products with quantities and prices
- Payment and delivery terms

RETURN STRUCTURED JSON:
{
  "proforma_invoice": {
    "piNumber": "string",
    "date": "string",
    "validityPeriod": "string",
    "supplier": {
      "name": "string",
      "address": "string",
      "contact": "string"
    },
    "buyer": {
      "name": "string",
      "address": "string"
    },
    "items": [
      {
        "productCode": "string",
        "productName": "string",
        "quantity": number,
        "unit": "string",
        "unitPrice": number,
        "totalPrice": number
      }
    ],
    "totals": {
      "subtotal": number,
      "tax": number,
      "shipping": number,
      "grandTotal": number
    },
    "terms": {
      "payment": "string",
      "delivery": "string"
    }
  }
}`,
        performance: { accuracy: 88, speed: 2.1, tokens: 980, lastTested: null }
      }
    ];

    // Save to prompts map
    defaultPrompts.forEach(prompt => {
      this.prompts.set(prompt.id, prompt);
    });

    // Save to file
    await this.savePrompts();
    console.log('✅ Created default HiggsFlow AI prompts');
  }

  async savePrompts() {
    try {
      const promptsArray = Array.from(this.prompts.values());
      
      // Ensure directory exists
      const dir = path.dirname(this.promptsPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.promptsPath, JSON.stringify(promptsArray, null, 2));
      return true;
    } catch (error) {
      console.error('❌ Failed to save prompts:', error);
      return false;
    }
  }

  // Get best prompt for task (core intelligence)
  async getPromptForTask(moduleId, taskCategory, context = {}) {
    const modulePrompts = Array.from(this.prompts.values())
      .filter(p => p.moduleId === moduleId && p.isActive);

    if (modulePrompts.length === 0) return null;

    let bestPrompt = null;
    let bestScore = 0;

    for (const prompt of modulePrompts) {
      let score = 0;

      // Category match (highest priority)
      if (prompt.category === taskCategory) score += 100;

      // Document type match
      if (context.documentType && prompt.documentTypes?.includes(context.documentType)) {
        score += 50;
      }

      // Supplier match (critical for HiggsFlow)
      if (context.supplier) {
        if (prompt.suppliers?.includes('ALL')) {
          score += 20;
        } else if (prompt.suppliers?.includes(context.supplier)) {
          score += 80; // High bonus for exact supplier match
        } else if (prompt.suppliers?.some(s => context.supplierName?.includes(s))) {
          score += 60; // Good bonus for supplier name match
        }
      }

      // Performance bonus
      score += (prompt.performance?.accuracy || 0) / 10;

      if (score > bestScore) {
        bestScore = score;
        bestPrompt = prompt;
      }
    }

    console.log(`🎯 Selected prompt: ${bestPrompt?.name} (score: ${bestScore})`);
    return bestPrompt;
  }

  // Save or update prompt
  async savePrompt(promptData) {
    const prompt = {
      id: promptData.id || `prompt_${uuidv4()}`,
      ...promptData,
      lastModified: new Date().toISOString(),
      version: promptData.version || '1.0.0'
    };

    this.prompts.set(prompt.id, prompt);
    return await this.savePrompts();
  }

  // Test prompt performance
  async testPrompt(promptId, testData) {
    const prompt = this.prompts.get(promptId);
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }

    // Simulate test results (replace with actual AI call)
    return {
      success: true,
      promptId,
      testData,
      result: {
        accuracy: Math.random() * 0.2 + 0.8, // 80-100%
        responseTime: Math.random() * 2000 + 1000, // 1-3 seconds
        tokens: Math.floor(prompt.prompt.length * 1.2),
        confidence: Math.random() * 0.3 + 0.7 // 70-100%
      },
      timestamp: new Date().toISOString()
    };
  }

  // Get all prompts
  getAllPrompts() {
    return Array.from(this.prompts.values());
  }

  // Get prompts by module
  getPromptsByModule(moduleId) {
    return Array.from(this.prompts.values()).filter(p => p.moduleId === moduleId);
  }
}

module.exports = PromptManager;
