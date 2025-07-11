// src/services/ai/AIExtractionService.js
// Main orchestrator for AI extraction - enhanced with Chinese supplier PI optimization and FIXED document detection

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

// Enhanced Chinese Supplier PI Extractor
class ChineseSupplierPIExtractor {
  
  /**
   * Extract PI data optimized for Chinese suppliers
   */
  static extractChineseSupplierPI(rawData, file) {
    console.log('Processing Chinese Supplier PI:', file?.name);
    
    // Handle nested data structure
    let data = rawData.data || rawData;
    if (data.proforma_invoice) {
      data = data.proforma_invoice;
    }
    
    const extractedPI = {
      documentType: 'supplier_proforma',
      confidence: rawData.confidence || 0.9,
      
      // PI identification with Chinese supplier patterns
      piNumber: this.extractPINumber(data),
      date: this.convertToISO(this.extractDate(data)),
      validUntil: this.convertToISO(this.extractValidUntil(data)),
      
      // Supplier information (Chinese patterns)
      supplier: this.extractSupplierInfo(data),
      
      // Client reference (Flow Solution patterns)
      clientRef: this.extractClientInfo(data),
      
      // Products with Chinese naming conventions
      products: this.extractChineseProducts(data),
      
      // Financial details (USD standard)
      ...this.extractFinancials(data),
      
      // Terms (Chinese supplier standards)
      ...this.extractTerms(data),
      
      // Banking details (HK/Chinese banks)
      bankDetails: this.extractBankingDetails(data),
      
      // File metadata
      sourceFile: file?.name || 'unknown',
      extractedAt: new Date().toISOString()
    };
    
    return extractedPI;
  }
  
  /**
   * Extract PI number with various Chinese formats
   */
  static extractPINumber(data) {
    const text = JSON.stringify(data);
    
    // Common PI number patterns from Chinese suppliers
    const patterns = [
      /PI[\s\-\#]*NO[\.\:\s]*([A-Z0-9\-]+)/i,
      /INVOICE[\s\-\#]*[\.\:\s]*([A-Z0-9\-]+)/i,
      /QUOTE[\s\-\#]*NO[\.\:\s]*([A-Z0-9\-]+)/i,
      /Invoice[\s\-\#]*No[\.\:\s]*([A-Z0-9\-]+)/i,
      /NO[\.\:\s]*([A-Z]{2,}[0-9]{6,})/i,
      /([A-Z]{2,}[0-9]{8,}[A-Z]*)/g
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // Fallback to finding alphanumeric codes
    const fallbackMatch = text.match(/([A-Z]{2,}[0-9]{6,})/);
    return fallbackMatch ? fallbackMatch[1] : '';
  }
  
  /**
   * Extract date with Chinese formats
   */
  static extractDate(data) {
    const text = JSON.stringify(data);
    
    // Date patterns
    const datePatterns = [
      /DATE[\:\s]*([0-9]{4}[-\.\/][0-9]{1,2}[-\.\/][0-9]{1,2})/i,
      /Date[\:\s]*([A-Za-z]+[\,\s]*[0-9]{1,2}[\,\s]*[0-9]{4})/i,
      /([0-9]{4}[-\.][0-9]{1,2}[-\.][0-9]{1,2})/g,
      /([A-Za-z]+[\s]*[0-9]{1,2}[\,\s]*[0-9]{4})/g
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return new Date().toISOString().split('T')[0];
  }
  
  /**
   * Extract supplier info with Chinese patterns
   */
  static extractSupplierInfo(data) {
    const text = JSON.stringify(data);
    
    return {
      name: this.extractSupplierName(data),
      contact: this.extractValue(data, ['contact person', 'seller', 'attention', 'contact']),
      email: this.extractEmail(text),
      phone: this.extractPhone(text),
      address: this.extractValue(data, ['address', 'add', 'location']),
      country: this.extractCountry(text)
    };
  }
  
  /**
   * Extract supplier name with Chinese company patterns
   */
  static extractSupplierName(data) {
    const text = JSON.stringify(data);
    
    // Chinese company name patterns
    const patterns = [
      /Company[\s]*Name[\:\s]*([^,\n\r]+(?:Co[\.\,\s]*Ltd|Technology|Machinery|Equipment|Hydraulic)[^,\n\r]*)/i,
      /SELLER[\:\s]*([^,\n\r]+(?:Co[\.\,\s]*Ltd|Technology|Machinery|Equipment|Hydraulic)[^,\n\r]*)/i,
      /Issuer[\:\s]*([^,\n\r]+(?:Co[\.\,\s]*Ltd|Technology|Machinery|Equipment|Hydraulic)[^,\n\r]*)/i,
      /([A-Za-z\s]+(?:Co[\.\,\s]*Ltd|Technology|Machinery|Equipment|Hydraulic|Automation|Environmental)[^,\n\r]*)/g
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[\"\'\[\]]/g, '');
      }
    }
    
    return '';
  }
  
  /**
   * Extract client info (Flow Solution patterns)
   */
  static extractClientInfo(data) {
    const text = JSON.stringify(data);
    
    return {
      name: this.extractClientName(text),
      contact: this.extractValue(data, ['edison chung', 'edison', 'attention', 'consignee']),
      poNumber: this.extractPOReference(text),
      address: this.extractClientAddress(text)
    };
  }
  
  /**
   * Extract client name with Flow Solution variations
   */
  static extractClientName(text) {
    const patterns = [
      /Flow\s*Solution\s*Sdn\s*Bhd/i,
      /Broadwater\s*Solution\s*Sdn\s*Bhd/i,
      /BUYER[\:\s]*([^,\n\r]*Solution[^,\n\r]*)/i,
      /Company[\:\s]*([^,\n\r]*Solution[^,\n\r]*)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] ? match[1].trim() : match[0].trim();
      }
    }
    
    return 'Flow Solution Sdn Bhd';
  }
  
  /**
   * Extract products with Chinese supplier naming
   */
  static extractChineseProducts(data) {
    // Look for table-like structures
    if (data.items && Array.isArray(data.items)) {
      return data.items.map((item, index) => this.mapChineseProduct(item, index));
    }
    
    if (data.products && Array.isArray(data.products)) {
      return data.products.map((item, index) => this.mapChineseProduct(item, index));
    }
    
    return [];
  }
  
  /**
   * Map Chinese product data
   */
  static mapChineseProduct(item, index) {
    return {
      id: `item_${index + 1}`,
      productCode: item.model || item.part_number || item.product_code || item.code || '',
      partNumber: item.model || item.part_number || item.product_code || '',
      productName: item.description || item.product_name || item.name || item.specification || '',
      brand: item.brand || '',
      category: this.categorizeProduct(item.description || item.product_name || ''),
      quantity: parseFloat(item.quantity || item.qty) || 0,
      unit: item.unit || item.uom || 'pcs',
      unitPrice: this.parseAmount(item.unit_price || item.price) || 0,
      totalPrice: this.parseAmount(item.total_price || item.total || item.amount) || 0,
      hsCode: item.hs_code || item.hscode || '',
      leadTime: item.lead_time || item.delivery_time || '',
      warranty: item.warranty || '',
      specifications: item.specifications || item.spec || item.notes || ''
    };
  }
  
  /**
   * Categorize products based on Chinese supplier types
   */
  static categorizeProduct(description) {
    const desc = description.toLowerCase();
    
    if (desc.includes('pump') || desc.includes('hydraulic')) return 'Pumps & Hydraulics';
    if (desc.includes('bearing')) return 'Bearings';
    if (desc.includes('valve')) return 'Valves';
    if (desc.includes('sensor')) return 'Sensors & Instruments';
    if (desc.includes('motor') || desc.includes('drive')) return 'Motors & Drives';
    if (desc.includes('relay') || desc.includes('electrical')) return 'Electrical Components';
    if (desc.includes('brake')) return 'Brakes & Clutches';
    if (desc.includes('filter')) return 'Filters';
    
    return 'General';
  }
  
  /**
   * Extract financial data (USD standard)
   */
  static extractFinancials(data) {
    const text = JSON.stringify(data);
    
    return {
      currency: 'USD', // All Chinese suppliers use USD
      exchangeRate: 1,
      subtotal: this.extractAmount(text, ['subtotal', 'goods amount', 'total amount']),
      discount: this.extractAmount(text, ['discount']) || 0,
      shipping: this.extractAmount(text, ['shipping', 'freight', 'ship fee', 'courier fee']),
      tax: this.extractAmount(text, ['tax', 'gst', 'vat']) || 0,
      grandTotal: this.extractAmount(text, ['total cost', 'grand total', 'total amount', 'total'])
    };
  }
  
  /**
   * Extract terms with Chinese supplier standards
   */
  static extractTerms(data) {
    const text = JSON.stringify(data);
    
    return {
      paymentTerms: this.extractPaymentTerms(text),
      deliveryTerms: this.extractDeliveryTerms(text),
      leadTime: this.extractLeadTime(text),
      warranty: this.extractWarranty(text)
    };
  }
  
  /**
   * Extract payment terms
   */
  static extractPaymentTerms(text) {
    const patterns = [
      /100%\s*(?:T\/T|TT|In\s*advance)/i,
      /Payment[\:\s]*([^,\n\r]*T\/T[^,\n\r]*)/i,
      /Terms\s*of\s*payment[\:\s]*([^,\n\r]*)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] ? match[1].trim() : match[0].trim();
      }
    }
    
    return '100% T/T in advance';
  }
  
  /**
   * Extract delivery terms
   */
  static extractDeliveryTerms(text) {
    const terms = ['DDP', 'CFR', 'FOB', 'EXW', 'CIF'];
    
    for (const term of terms) {
      if (text.toUpperCase().includes(term)) {
        return term;
      }
    }
    
    return 'DDP';
  }
  
  /**
   * Extract banking details (HK/Chinese bank patterns)
   */
  static extractBankingDetails(data) {
    const text = JSON.stringify(data);
    
    return {
      bankName: this.extractBankName(text),
      accountNumber: this.extractAccountNumber(text),
      accountName: this.extractAccountName(text),
      swiftCode: this.extractSwiftCode(text),
      iban: '',
      bankAddress: this.extractBankAddress(text),
      bankCode: this.extractBankCode(text),
      branchCode: this.extractBranchCode(text)
    };
  }
  
  /**
   * Extract bank name
   */
  static extractBankName(text) {
    const patterns = [
      /Bank\s*Name[\:\s]*([^,\n\r]*)/i,
      /Beneficiary\s*bank[\:\s]*([^,\n\r]*)/i,
      /(JPMorgan\s*Chase\s*Bank[^,\n\r]*)/i,
      /(Bank\s*of\s*China[^,\n\r]*)/i,
      /(Construction\s*Bank[^,\n\r]*)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[\"\'\[\]]/g, '');
      }
    }
    
    return '';
  }
  
  // Utility methods
  static extractValue(data, keys) {
    const text = JSON.stringify(data).toLowerCase();
    
    for (const key of keys) {
      const pattern = new RegExp(key.toLowerCase() + '[\\:\\s]*([^,\\n\\r]*)', 'i');
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[\"\'\[\]]/g, '');
      }
    }
    
    return '';
  }
  
  static extractEmail(text) {
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = text.match(emailPattern);
    return matches ? matches[0] : '';
  }
  
  static extractPhone(text) {
    const phonePatterns = [
      /(\+?86[-\s]?[0-9]{11})/g,
      /(\+?[0-9]{10,15})/g
    ];
    
    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  static extractCountry(text) {
    if (text.toLowerCase().includes('china')) return 'China';
    if (text.toLowerCase().includes('hong kong')) return 'Hong Kong';
    if (text.toLowerCase().includes('singapore')) return 'Singapore';
    return 'China'; // Default for Chinese suppliers
  }
  
  static parseAmount(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;
    
    // Remove currency symbols and commas
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  static extractAmount(text, keywords) {
    for (const keyword of keywords) {
      const patterns = [
        new RegExp(keyword + '[\\s\\:]*\\$?([0-9,\\.]+)', 'i'),
        new RegExp('\\$([0-9,\\.]+)[\\s]*' + keyword, 'i'),
        new RegExp(keyword + '[\\s\\:]*USD[\\s]*([0-9,\\.]+)', 'i')
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          return this.parseAmount(match[1]);
        }
      }
    }
    
    return 0;
  }
  
  static convertToISO(dateStr) {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.warn('Date conversion failed:', dateStr, error);
      return '';
    }
  }
  
  // Additional utility methods for Chinese suppliers
  static extractPOReference(text) {
    const patterns = [
      /PO[-\s]?(\d{6,})/i,
      /Purchase\s+Order[-:\s]?(\d{6,})/i,
      /Order\s+No[-:\s]?(\d{6,})/i,
      /P\.O\.[-\s]?(\d{6,})/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return `PO-${match[1]}`;
    }
    return '';
  }
  
  static extractClientAddress(text) {
    const addressPattern = /PT\s*7257[^,\n\r]*Malaysia/i;
    const match = text.match(addressPattern);
    return match ? match[0].trim() : 'PT7257, Jalan BBN 1/2a, Bandar Baru Nilai, 71800 Negeri Sembilan, Malaysia';
  }
  
  static extractValidUntil(data) {
    const text = JSON.stringify(data);
    
    const validityPatterns = [
      /VALID[\s]*UNTIL[\:\s]*([0-9]{4}[-\.\/][0-9]{1,2}[-\.\/][0-9]{1,2})/i,
      /EXPIRY[\:\s]*([0-9]{4}[-\.\/][0-9]{1,2}[-\.\/][0-9]{1,2})/i,
      /VALIDITY[\:\s]*([0-9]+\s*days?)/i
    ];
    
    for (const pattern of validityPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        if (match[1].includes('day')) {
          // Convert days to date
          const days = parseInt(match[1]);
          const validDate = new Date();
          validDate.setDate(validDate.getDate() + days);
          return validDate.toISOString().split('T')[0];
        }
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  static extractLeadTime(text) {
    const patterns = [
      /Lead\s*Time[\:\s]*([^,\n\r]*)/i,
      /Delivery[\:\s]*([0-9\-]+\s*(?:days?|working\s*days?))/i,
      /Production\s*time[\:\s]*([^,\n\r]*)/i,
      /([0-9\-]+\s*(?:days?|working\s*days?))/g
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '5-10 working days';
  }
  
  static extractWarranty(text) {
    const patterns = [
      /Warranty[\:\s]*([^,\n\r]*)/i,
      /([0-9]+\s*months?)\s*warranty/i,
      /warranty\s*time[\:\s]*([^,\n\r]*)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '12 months';
  }
  
  static extractAccountNumber(text) {
    const patterns = [
      /Account\s*Number[\:\s]*([0-9\s\-]+)/i,
      /USD\s*Account[\:\s]*([0-9\s\-]+)/i,
      /Beneficiary\s*account\s*number[\:\s]*([0-9\s\-]+)/i,
      /([0-9]{10,})/g
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/\s/g, '');
      }
    }
    
    return '';
  }
  
  static extractAccountName(text) {
    const patterns = [
      /Account\s*Name[\:\s]*([^,\n\r]*Co[\.\,\s]*Ltd[^,\n\r]*)/i,
      /Holder\s*Name[\:\s]*([^,\n\r]*Co[\.\,\s]*Ltd[^,\n\r]*)/i,
      /Beneficiary\s*name[\:\s]*([^,\n\r]*Co[\.\,\s]*Ltd[^,\n\r]*)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/[\"\'\[\]]/g, '');
      }
    }
    
    return '';
  }
  
  static extractSwiftCode(text) {
    const patterns = [
      /SWIFT[\s\/]*(?:CODE|BIC)[\:\s]*([A-Z0-9]{8,11})/i,
      /Swift\s*Code[\:\s]*([A-Z0-9]{8,11})/i,
      /BIC[\:\s]*([A-Z0-9]{8,11})/i,
      /([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}[A-Z0-9]{3}?)/g
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().toUpperCase();
      }
    }
    
    return '';
  }
  
  static extractBankAddress(text) {
    const patterns = [
      /Bank\s*Address[\:\s]*([^,\n\r]*)/i,
      /Beneficiary\s*bank\s*address[\:\s]*([^,\n\r]*)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  static extractBankCode(text) {
    const patterns = [
      /Bank\s*Code[\:\s]*([0-9]+)/i,
      /BANK\s*CODE[\:\s]*([0-9]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }
  
  static extractBranchCode(text) {
    const patterns = [
      /Branch\s*Code[\:\s]*([0-9]+)/i,
      /BRANCH\s*CODE[\:\s]*([0-9]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return '';
  }
}

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
   * Main extraction method with ENHANCED document type detection
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
      
      // DEBUGGING: Add debug information
      console.log('=== DEBUGGING DOCUMENT CONTENT ===');
      console.log('Raw data structure:', Object.keys(rawData));
      if (rawData.data) {
        console.log('rawData.data keys:', Object.keys(rawData.data));
      }
      console.log('Document text sample:', JSON.stringify(rawData).substring(0, 500));
      
      // Step 3.5: ENHANCED pre-processing with smart document type detection
      let preDetectedType = null;
      let confidence = 0.9;
      
      // Check for specific structures that indicate document type
      if (rawData.data?.purchase_order || rawData.purchase_order) {
        // ENHANCED VALIDATION: Don't just trust the structure, validate the content
        const textContent = JSON.stringify(rawData).toLowerCase();
        
        console.log('Found purchase_order structure, validating content...');
        
        // Check for supplier indicators (if these exist, it's likely a PI, not client PO)
        const supplierIndicators = [
          'proforma invoice',
          'pi number',
          'pi no',
          'proforma',
          'seller:',
          'vendor:',
          'supplier:',
          'bank name:',
          'swift code:',
          'account number:',
          'validity:',
          'valid until',
          'payment terms:',
          'delivery terms:',
          // Chinese supplier patterns
          'co.,ltd',
          'co ltd',
          'technology',
          'machinery',
          'equipment',
          'hydraulic',
          'automation',
          'environmental',
          'electromechanical',
          'jpmorgan chase',
          'hong kong',
          'manufacturing',
          't/t',
          'ddp',
          'cfr',
          'fob',
          'beneficiary'
        ];
        
        const hasSupplierIndicators = supplierIndicators.some(indicator => 
          textContent.includes(indicator)
        );
        
        // Check for client PO indicators
        const clientPOIndicators = [
          'bill to:',
          'ship to:',
          'buyer:',
          'order date:',
          'required by:',
          'purchase order'
        ];
        
        const hasClientPOIndicators = clientPOIndicators.some(indicator => 
          textContent.includes(indicator)
        );
        
        // Check specifically for Flow Solution as buyer (not seller)
        const flowSolutionAsBuyer = textContent.includes('flow solution') && 
          (textContent.includes('buyer') || textContent.includes('bill to'));
        
        console.log('Supplier indicators found:', hasSupplierIndicators);
        console.log('Client PO indicators found:', hasClientPOIndicators);
        console.log('Flow Solution as buyer:', flowSolutionAsBuyer);
        
        if (hasSupplierIndicators && !flowSolutionAsBuyer) {
          preDetectedType = 'supplier_proforma';
          console.log('✅ CORRECTED: Pre-detected as supplier proforma (was incorrectly marked as purchase_order)');
        } else if (hasClientPOIndicators || flowSolutionAsBuyer) {
          preDetectedType = 'client_purchase_order';
          console.log('Pre-detected as client purchase order based on structure and content');
        } else {
          // Ambiguous - let document detector decide
          preDetectedType = null;
          console.log('Ambiguous purchase_order structure - will use document detector');
        }
      } else if (rawData.data?.proforma_invoice || rawData.proforma_invoice) {
        preDetectedType = 'supplier_proforma';
        console.log('Pre-detected as supplier proforma based on structure');
      } else if (rawData.data?.invoice || rawData.invoice) {
        preDetectedType = 'supplier_invoice';
        console.log('Pre-detected as supplier invoice based on structure');
      } else {
        // Enhanced detection for documents without clear structure
        const textContent = JSON.stringify(rawData).toLowerCase();
        
        // Enhanced Chinese supplier PI indicators
        const chineseSupplierPatterns = [
          'proforma invoice',
          'pi no',
          'pi number',
          'proforma',
          'co.,ltd',
          'co ltd',
          'technology',
          'machinery',
          'equipment',
          'hydraulic',
          'automation',
          'environmental',
          'electromechanical',
          'jpmorgan chase',
          'hong kong',
          'china',
          'manufacturing',
          't/t',
          'ddp',
          'cfr',
          'fob',
          'swift',
          'beneficiary',
          'bank name',
          'account number',
          'validity',
          'payment terms',
          'delivery terms'
        ];
        
        const chineseSupplierScore = chineseSupplierPatterns.filter(pattern => 
          textContent.includes(pattern)
        ).length;
        
        // Client PO indicators
        const clientPOPatterns = [
          'purchase order',
          'bill to',
          'ship to',
          'buyer:',
          'order date',
          'required by'
        ];
        
        const clientPOScore = clientPOPatterns.filter(pattern => 
          textContent.includes(pattern)
        ).length;
        
        console.log('Chinese supplier score:', chineseSupplierScore);
        console.log('Client PO score:', clientPOScore);
        
        if (chineseSupplierScore >= 3) {
          preDetectedType = 'supplier_proforma';
          confidence = Math.min(0.6 + (chineseSupplierScore * 0.1), 0.95);
          console.log(`Pre-detected as Chinese supplier proforma (score: ${chineseSupplierScore})`);
        } else if (clientPOScore >= 2) {
          preDetectedType = 'client_purchase_order';
          confidence = Math.min(0.6 + (clientPOScore * 0.1), 0.95);
          console.log(`Pre-detected as client purchase order (score: ${clientPOScore})`);
        } else {
          console.log('No clear pre-detection - will use document detector');
        }
      }
      
      console.log('=== END DEBUG ===');
      
      // Step 4: Detect document type
      const docType = preDetectedType 
        ? { type: preDetectedType, confidence: confidence, preDetected: true }
        : DocumentDetector.detectDocumentType(rawData);
        
      console.log('Final detected document type:', docType.type, 'with confidence:', docType.confidence);
      
      // Step 5: Enhanced processing based on document type
      let processedData;
      
      if (docType.type === 'supplier_proforma') {
        // Use enhanced Chinese supplier extraction
        processedData = ChineseSupplierPIExtractor.extractChineseSupplierPI(rawData, file);
        console.log('Using enhanced Chinese supplier PI extraction');
      } else if (this.processors[docType.type]) {
        processedData = await this.processors[docType.type].process(rawData, file);
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
          preDetected: docType.preDetected || false,
          chineseSupplierOptimized: docType.type === 'supplier_proforma'
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
   * Check for Chinese supplier patterns in text
   */
  hasChineseSupplierPatterns(text) {
    const chinesePatterns = [
      'co.,ltd', 'co ltd', 'technology', 'machinery', 'equipment',
      'hydraulic', 'automation', 'environmental', 'electromechanical',
      'jpmorgan chase', 'hong kong', 'china', 'manufacturing',
      'industrial', 'trading', 'export', 'import', 'supplier',
      't/t', 'ddp', 'cfr', 'fob', 'swift', 'beneficiary'
    ];
    
    return chinesePatterns.some(pattern => text.includes(pattern));
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
   * Process generic/unknown document type with enhanced fallback
   */
  processGenericDocument(rawData, file) {
    console.log('Processing as generic document');
    
    // Try Chinese supplier extraction as fallback
    const textContent = JSON.stringify(rawData).toLowerCase();
    
    if (this.hasChineseSupplierPatterns(textContent)) {
      console.log('Attempting Chinese supplier extraction on generic document');
      try {
        return ChineseSupplierPIExtractor.extractChineseSupplierPI(rawData, file);
      } catch (error) {
        console.warn('Chinese supplier extraction failed on generic document:', error);
      }
    }
    
    // Original generic processing
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

  // Keep all existing supplier matching methods exactly the same...
  static async rerunSupplierMatching(data) {
    try {
      console.log('Re-running supplier matching for:', data.poNumber);
      
      const { SupplierMatcher } = await import('./SupplierMatcher');
      
      if (!data.items || data.items.length === 0) {
        throw new Error('No items found in the purchase order');
      }
      
      const matchingResult = await SupplierMatcher.findMatches(data.items);
      
      const processedData = {
        ...data,
        items: matchingResult.itemMatches,
        sourcingPlan: {
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
          sourcingStrategies: AIExtractionService.generateSourcingStrategies(data, matchingResult),
          costAnalysis: {
            originalBudget: data.totalAmount || 0,
            bestCaseScenario: matchingResult.metrics.totalBestCost,
            potentialSavings: matchingResult.metrics.potentialSavings,
            savingsPercentage: `${matchingResult.metrics.potentialSavingsPercent.toFixed(1)}%`
          },
          timeline: {
            estimatedLeadTime: matchingResult.metrics.averageLeadTime,
            orderPlacementDeadline: AIExtractionService.calculateOrderDeadline(
              data.deliveryDate || data.requiredDate,
              matchingResult.metrics.averageLeadTime
            ),
            criticalPath: AIExtractionService.identifyCriticalPath(matchingResult.itemMatches)
          },
          riskAssessment: {
            supplierDiversity: matchingResult.metrics.supplierDiversity,
            itemsWithoutMatches: matchingResult.metrics.itemsWithoutMatches,
            singleSourceItems: AIExtractionService.identifySingleSourceItems(matchingResult.itemMatches),
            recommendations: AIExtractionService.generateRiskRecommendations(matchingResult.metrics)
          },
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

  // All existing helper methods remain exactly the same...
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

  static generateSourcingStrategies(data, matchingResult) {
    const strategies = [];
    
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
    
    if (matchingResult.recommendedSuppliers.length >= 3) {
      strategies.push({
        name: 'Multi-Supplier Distribution',
        description: 'Distribute orders among top 3-5 suppliers based on their strengths',
        pros: ['Risk diversification', 'Competitive pricing', 'Specialized expertise', 'Flexibility'],
        cons: ['Complex coordination', 'Higher admin overhead', 'Multiple relationships to manage'],
        estimatedSavings: '10-15% through competition'
      });
    }
    
    strategies.push({
      name: 'Hybrid Approach',
      description: 'Use primary supplier for 60-70% of items, secondary suppliers for specialized items',
      pros: ['Balance of efficiency and risk', 'Maintains competition', 'Backup options', 'Optimal pricing'],
      cons: ['Requires careful planning', 'Moderate complexity'],
      estimatedSavings: '7-12% overall'
    });
    
    return strategies;
  }

  static calculateOrderDeadline(deliveryDate, leadTime) {
    if (!deliveryDate) return 'ASAP - No delivery date specified';
    
    const delivery = new Date(deliveryDate);
    const leadDays = AIExtractionService.parseLeadTimeToDays(leadTime);
    const bufferDays = 3;
    
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

  static parseLeadTimeToDays(leadTime) {
    if (!leadTime) return 14;
    
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

  static identifySingleSourceItems(items) {
    return items
      .filter(item => item.supplierMatches && item.supplierMatches.length === 1)
      .map(item => ({
        productName: item.productName,
        productCode: item.productCode,
        supplierName: item.supplierMatches[0].supplierName
      }));
  }

  static generateRiskRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.itemsWithoutMatches > 0) {
      recommendations.push({
        type: 'warning',
        message: `${metrics.itemsWithoutMatches} items have no supplier matches`,
        action: 'Consider adding more suppliers or updating product catalog'
      });
    }
    
    if (metrics.supplierDiversity < 3) {
      recommendations.push({
        type: 'caution',
        message: 'Limited supplier options available',
        action: 'Expand supplier base for better risk distribution'
      });
    }
    
    const matchRate = metrics.itemsWithMatches / (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    if (matchRate < 0.8) {
      recommendations.push({
        type: 'warning',
        message: `Only ${(matchRate * 100).toFixed(0)}% of items have supplier matches`,
        action: 'Review unmatched items and consider alternative products'
      });
    }
    
    if (metrics.potentialSavingsPercent > 15) {
      recommendations.push({
        type: 'info',
        message: `Significant savings opportunity: ${metrics.potentialSavingsPercent.toFixed(1)}%`,
        action: 'Review and validate pricing with recommended suppliers'
      });
    }
    
    return recommendations;
  }

  static calculateConfidenceScore(metrics) {
    let score = 0.5;
    
    const matchCoverage = metrics.itemsWithMatches / 
      (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    score += matchCoverage * 0.3;
    
    if (metrics.supplierDiversity >= 5) score += 0.2;
    else if (metrics.supplierDiversity >= 3) score += 0.15;
    else if (metrics.supplierDiversity >= 1) score += 0.1;
    
    if (metrics.averageMatchesPerItem >= 3) score += 0.1;
    else if (metrics.averageMatchesPerItem >= 2) score += 0.07;
    else if (metrics.averageMatchesPerItem >= 1) score += 0.05;
    
    if (metrics.potentialSavingsPercent > 10) score += 0.05;
    
    return Math.min(score, 0.95);
  }

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
        'Enhanced Chinese supplier PI optimization',
        'Smart document type correction',
        'Pre-detection for common structures',
        'Duplicate detection',
        'Data validation',
        'Smart recommendations',
        'Supplier matching',
        'Re-run supplier matching',
        'Multi-language support',
        'Caching for performance',
        'Error recovery',
        'Flow Solution client pattern recognition',
        'HK/Chinese banking details extraction'
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
