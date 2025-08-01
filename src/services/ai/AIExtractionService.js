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
import { BankPaymentSlipProcessor } from './processors/BankPaymentSlipProcessor'; 


// Import utilities
import { EXTRACTION_SETTINGS } from './config';
import DocumentStorageService from '../DocumentStorageService'; 

// Enhanced Chinese Supplier PI Extractor
class ChineseSupplierPIExtractor {
  
  /**
   * Extract PI data optimized for Chinese suppliers
   */
  static extractChineseSupplierPI(rawData, file) {
    console.log('Processing Chinese Supplier PI:', file?.name);
    
    // Handle nested data structure
    let data = rawData.data || rawData;

    // Quick debug fix - Add this temporarily to your ChineseSupplierPIExtractor.extractChineseSupplierPI() method
// Right after this line: let data = rawData.data || rawData;

console.log('=== PRODUCT EXTRACTION DEBUG ===');
console.log('Full rawData structure:', rawData);
console.log('Data keys:', Object.keys(data));

if (data.products) {
  console.log('Found data.products:', data.products);
  console.log('Products type:', typeof data.products);
  console.log('Products is array?', Array.isArray(data.products));
  console.log('Products length:', data.products?.length);
}

if (data.items) {
  console.log('Found data.items:', data.items);
  console.log('Items type:', typeof data.items);
  console.log('Items is array?', Array.isArray(data.items));
  console.log('Items length:', data.items?.length);
}

if (data.invoice) {
  console.log('Found data.invoice:', data.invoice);
  if (data.invoice.products) {
    console.log('Found data.invoice.products:', data.invoice.products);
  }
  if (data.invoice.items) {
    console.log('Found data.invoice.items:', data.invoice.items);
  }
}

console.log('=== END PRODUCT DEBUG ===');
    
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
      items: this.extractChineseProducts(data),  // ← ADD THIS LINE

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
    console.log('=== ENHANCED PRODUCT EXTRACTION DEBUG ===');
    console.log('Input data type:', typeof data);
    console.log('Input data keys:', Object.keys(data));
    console.log('Full data structure:', JSON.stringify(data, null, 2));
    
    // Check all possible locations for items/products
    const possibleLocations = [
      { path: 'data.items', value: data.items },
      { path: 'data.products', value: data.products },
      { path: 'data.invoice.items', value: data.invoice?.items },
      { path: 'data.invoice.products', value: data.invoice?.products },
      { path: 'data.purchase_order.items', value: data.purchase_order?.items },
      { path: 'data.purchase_order.products', value: data.purchase_order?.products },
      { path: 'data.line_items', value: data.line_items },
      { path: 'data.product_list', value: data.product_list },
      { path: 'data.item_list', value: data.item_list },
      { path: 'data.goods', value: data.goods },
      { path: 'data.merchandise', value: data.merchandise }
    ];
    
    console.log('Checking all possible item locations:');
    possibleLocations.forEach(location => {
      if (location.value !== undefined) {
        console.log(`✅ Found at ${location.path}:`, {
          type: typeof location.value,
          isArray: Array.isArray(location.value),
          length: Array.isArray(location.value) ? location.value.length : 'N/A',
          sample: Array.isArray(location.value) && location.value.length > 0 ? location.value[0] : location.value
        });
      } else {
        console.log(`❌ Not found at ${location.path}`);
      }
    });
    
    // Try to extract from the raw data string if arrays are empty
    const rawDataString = JSON.stringify(data);
    console.log('Raw data contains "items":', rawDataString.includes('"items"'));
    console.log('Raw data contains "products":', rawDataString.includes('"products"'));
    
    // Look for table-like structures in multiple locations
    let itemsArray = null;
    let foundLocation = 'none';
    
    // Check each possible location in order of preference
    for (const location of possibleLocations) {
      if (location.value && Array.isArray(location.value) && location.value.length > 0) {
        console.log(`🎯 Using items from ${location.path} with ${location.value.length} items`);
        itemsArray = location.value;
        foundLocation = location.path;
        break;
      }
    }
    
    // If still no items found, try to parse from nested structures
    if (!itemsArray || itemsArray.length === 0) {
      console.log('🔍 No items in standard locations, checking nested structures...');
      
      // Check if data has a purchase_order with items hidden deeper
      if (data.purchase_order) {
        console.log('Checking purchase_order structure:', Object.keys(data.purchase_order));
        
        // Sometimes items are nested deeper in purchase_order
        for (const key of Object.keys(data.purchase_order)) {
          const value = data.purchase_order[key];
          if (Array.isArray(value) && value.length > 0) {
            console.log(`🎯 Found array in purchase_order.${key}:`, value.length, 'items');
            // Check if this looks like product data
            if (value[0] && (value[0].description || value[0].product_name || value[0].name || value[0].model)) {
              itemsArray = value;
              foundLocation = `purchase_order.${key}`;
              break;
            }
          }
        }
      }
      
      // Check all nested objects for arrays that might be items
      const findArraysRecursively = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (Array.isArray(value) && value.length > 0) {
            console.log(`🔍 Found array at ${currentPath}:`, value.length, 'items');
            // Check if first item looks like product data
            if (value[0] && typeof value[0] === 'object') {
              const firstItem = value[0];
              const productFields = ['description', 'product_name', 'name', 'model', 'part_number', 'quantity', 'price'];
              const hasProductFields = productFields.some(field => firstItem[field] !== undefined);
              
              if (hasProductFields) {
                console.log(`🎯 This looks like product data at ${currentPath}`);
                return { array: value, path: currentPath };
              }
            }
          } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            const result = findArraysRecursively(value, currentPath);
            if (result) return result;
          }
        }
        return null;
      };
      
      if (!itemsArray && data && typeof data === 'object') {
        const found = findArraysRecursively(data);
        if (found) {
          itemsArray = found.array;
          foundLocation = found.path;
          console.log(`🎯 Using items from deep search: ${foundLocation}`);
        }
      }
    }
    
    if (!itemsArray || !Array.isArray(itemsArray) || itemsArray.length === 0) {
      console.error('❌ NO ITEMS FOUND ANYWHERE!');
      console.log('Final attempt - showing all data structure:');
      console.log(JSON.stringify(data, null, 2));
      return [];
    }
    
    console.log(`✅ SUCCESS: Found ${itemsArray.length} items at location: ${foundLocation}`);
    console.log('Sample item structure:', JSON.stringify(itemsArray[0], null, 2));
    
    const mappedProducts = itemsArray.map((item, index) => this.mapChineseProduct(item, index));
    console.log(`✅ Mapped ${mappedProducts.length} products successfully`);
    console.log('Sample mapped product:', JSON.stringify(mappedProducts[0], null, 2));
    console.log('=== END ENHANCED PRODUCT DEBUG ===');
    
    return mappedProducts;
  }
  
 /**
 * Map Chinese product data - FIXED VERSION
 */
static mapChineseProduct(item, index) {
  console.log(`Mapping product ${index + 1}:`, item);
  
  const mappedItem = {
    id: `item_${index + 1}`,
    
    // ✅ FIXED: Use the correct field names from backend response
    productCode: item.productCode || item.model || item.part_number || item.product_code || item.code || item.item_code || '',
    partNumber: item.productCode || item.model || item.part_number || item.product_code || item.code || '',
    productName: item.productName || item.description || item.product_name || item.name || item.specification || item.item_name || item.title || '',
    
    brand: item.brand || item.manufacturer || '',
    category: this.categorizeProduct(item.productName || item.description || item.product_name || item.name || ''),
    
    // ✅ FIXED: Use correct quantity and price fields  
    quantity: parseFloat(item.quantity || item.qty || item.amount || item.pieces) || 0,
    unit: item.unit || item.uom || item.measure || 'PCS',
    unitPrice: this.parseAmount(item.unitPrice || item.unit_price || item.price || item.rate || item.cost) || 0,
    totalPrice: this.parseAmount(item.totalPrice || item.total_price || item.total || item.amount || item.line_total) || 0,
    
    hsCode: item.hs_code || item.hscode || item.harmonized_code || '',
    leadTime: item.lead_time || item.delivery_time || item.shipping_time || '',
    warranty: item.warranty || item.guarantee || '',
    specifications: item.specifications || item.spec || item.notes || item.remarks || item.details || ''
  };
  
  // If total price is missing, calculate it
  if (!mappedItem.totalPrice && mappedItem.quantity && mappedItem.unitPrice) {
    mappedItem.totalPrice = mappedItem.quantity * mappedItem.unitPrice;
  }
  
  console.log(`✅ Fixed mapped item ${index + 1}:`, mappedItem);
  return mappedItem;
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
  console.log('🚢 Extracting financials with enhanced shipping calculation');
  const text = JSON.stringify(data);
  
  // Extract basic amounts
  let subtotal = this.extractAmount(text, ['subtotal', 'goods amount', 'total amount']);
  let discount = this.extractAmount(text, ['discount']) || 0;
  let tax = this.extractAmount(text, ['tax', 'gst', 'vat']) || 0;
  let grandTotal = this.extractAmount(text, ['total cost', 'grand total', 'total amount', 'total']);
  
  // ENHANCED SHIPPING EXTRACTION
  let shipping = this.extractAmount(text, ['shipping', 'freight', 'ship fee', 'courier fee']);
  
  // ✅ NEW: Smart shipping calculation from total vs items difference
  if (shipping === 0 && data.purchase_order) {
    console.log('🔍 No direct shipping found, calculating from purchase_order difference...');
    
    const po = data.purchase_order;
    const totalAmount = parseFloat(po.total_amount || 0);
    
    if (po.items && Array.isArray(po.items) && totalAmount > 0) {
      const itemsTotal = po.items.reduce((sum, item) => {
        const itemTotal = parseFloat(item.total_price || item.total || item.amount || 0);
        console.log(`Item total: ${itemTotal}`);
        return sum + itemTotal;
      }, 0);
      
      console.log(`📊 Calculation: Total Amount: ${totalAmount}, Items Total: ${itemsTotal}`);
      
      const calculatedShipping = totalAmount - itemsTotal;
      
      // Only use if the difference makes sense (positive and reasonable)
      if (calculatedShipping > 0 && calculatedShipping < totalAmount) {
        shipping = calculatedShipping;
        console.log(`✅ Calculated shipping cost: ${shipping}`);
        
        // Update grandTotal if it wasn't extracted properly
        if (!grandTotal || grandTotal === 0) {
          grandTotal = totalAmount;
        }
        
        // Update subtotal if it wasn't extracted properly  
        if (!subtotal || subtotal === 0) {
          subtotal = itemsTotal;
        }
      } else {
        console.log(`❌ Calculated shipping (${calculatedShipping}) seems unreasonable, keeping as 0`);
      }
    } else {
      console.log('❌ No items array or total_amount found for shipping calculation');
    }
  } else if (shipping > 0) {
    console.log(`✅ Direct shipping cost found: ${shipping}`);
  } else {
    console.log('❌ No shipping cost found and no purchase_order structure for calculation');
  }
  
  const result = {
    currency: 'USD', // All Chinese suppliers use USD
    exchangeRate: 1,
    subtotal: subtotal || 0,
    discount: discount,
    shipping: shipping,  // ✅ Now properly calculated
    tax: tax,
    grandTotal: grandTotal || 0
  };
  
  console.log('💰 Final financial extraction result:', result);
  return result;
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


class PTPClientPODetector {
  /**
   * Detect if this is a PTP Client Purchase Order
   */
  static detectPTPClientPO(rawData) {
    const data = rawData.data?.purchase_order || rawData.purchase_order || rawData.data || rawData;
    const textContent = JSON.stringify(rawData).toLowerCase();
    
    console.log('🔍 PTP Client PO Detection Starting...');
    console.log('Data structure:', {
      hasPurchaseOrder: !!data,
      billTo: data.bill_to?.name,
      supplier: data.supplier?.name,
      shipTo: data.ship_to?.name,
      orderNumber: data.order_number
    });
    
    // Key indicators for PTP Client PO
    const indicators = [
      // 1. Flow Solution is the bill_to (WE are receiving the order)
      {
        test: data.bill_to?.name?.toLowerCase().includes('flow solution'),
        name: 'Flow Solution as bill_to',
        weight: 10
      },
      
      // 2. PTP is in supplier field (THEY are sending us the order)
      {
        test: data.supplier?.name?.toLowerCase().includes('tanjung pelepas') ||
              data.supplier?.name?.toLowerCase().includes('ptp'),
        name: 'PTP as supplier/sender',
        weight: 10
      },
      
      // 3. Ship_to contains PTP address (delivery to PTP)
      {
        test: data.ship_to?.name?.toLowerCase().includes('ptp') ||
              data.ship_to?.name?.toLowerCase().includes('tanjung pelepas'),
        name: 'Shipping to PTP',
        weight: 8
      },
      
      // 4. PO number structure
      {
        test: data.order_number?.startsWith('PO-'),
        name: 'PO number format',
        weight: 5
      },
      
      // 5. Has PR number (internal requisition) - handles both single and array
      {
        test: !!data.pr_number || (data.pr_numbers && Array.isArray(data.pr_numbers) && data.pr_numbers.length > 0),
        name: 'Has PR number',
        weight: 5
      },
      
      // 6. Contains PTP domain/references
      {
        test: textContent.includes('ptp.com.my') ||
              textContent.includes('pelabuhan tanjung pelepas'),
        name: 'PTP domain/reference',
        weight: 8
      },
      
      // 7. Order structure (not invoice/proforma structure)
      {
        test: (textContent.includes('purchase order') || textContent.includes('purchase_order')) &&
              !textContent.includes('proforma') &&
              !textContent.includes('invoice'),
        name: 'Purchase order structure',
        weight: 7
      },
      
      // 8. Has items array
      {
        test: (data.items && Array.isArray(data.items) && data.items.length > 0) ||
              (data.purchase_order?.items && Array.isArray(data.purchase_order.items) && data.purchase_order.items.length > 0) ||
              (data.line_items && Array.isArray(data.line_items) && data.line_items.length > 0),
        name: 'Has items array',
        weight: 5
      }
    ];
    
    let totalScore = 0;
    let matchedIndicators = [];
    
    indicators.forEach(indicator => {
      if (indicator.test) {
        totalScore += indicator.weight;
        matchedIndicators.push(`✅ ${indicator.name} (${indicator.weight})`);
      } else {
        console.log(`❌ ${indicator.name}`);
      }
    });
    
    console.log('PTP Client PO Detection Results:');
    console.log('Matched indicators:', matchedIndicators);
    console.log('Total score:', totalScore, '/ 58 possible');
    
    const isClientPO = totalScore >= 25; // Need at least 25 points
    const confidence = Math.min(totalScore / 58, 0.95);
    
    if (isClientPO) {
      console.log('🎯 DETECTED: PTP Client Purchase Order');
      console.log('Confidence:', confidence);
    }
    
    return {
      isClientPO,
      confidence,
      score: totalScore,
      maxScore: 58,
      matchedIndicators
    };
  }
}


export class AIExtractionService {
  constructor() {
    this.processors = {
      client_purchase_order: ClientPOProcessor,
      //supplier_proforma: SupplierPIProcessor,
      //supplier_invoice: SupplierPIProcessor, // Using same processor for now
      //supplier_quotation: SupplierPIProcessor,
      bank_payment_slip: BankPaymentSlipProcessor,
      unknown: null
    };
    
    // Initialize cache
    CacheService.initialize();
  } // ✅ Constructor ends here

  /**
   * Enhanced extraction with document storage
   * @param {File} file - Uploaded file
   * @param {string} documentType - 'po' or 'pi' 
   * @returns {Promise<Object>} - Extraction result with stored document info
   */
  async extractWithDocumentStorage(file, documentType = 'auto') {
    console.log(`🚀 Starting enhanced extraction with storage for: ${file.name}`);
    
    try {
      // Step 1: Perform AI extraction
      const extractionResult = await this.extractFromFile(file);
      
      if (!extractionResult.success) {
        throw new Error(`AI extraction failed: ${extractionResult.error}`);
      }

      const extractedData = extractionResult.data;
      const detectedType = documentType === 'auto' ? 
        this.detectDocumentType(extractedData) : documentType;

      // Step 2: Generate document ID and number
      const documentId = this.generateDocumentId();
      const documentNumber = this.extractDocumentNumber(extractedData, detectedType);

      console.log(`📋 Detected document type: ${detectedType}, Number: ${documentNumber}`);

      // Step 3: Store original document with extraction data
      const storageResult = await DocumentStorageService.storeDocumentWithExtraction(
        file,
        {
          ...extractedData,
          extractionMetadata: {
            documentType: detectedType,
            documentNumber: documentNumber,
            documentId: documentId,
            aiProvider: 'deepseek',
            extractedAt: new Date().toISOString(),
            confidence: extractionResult.confidence || 0,
            processingTime: extractionResult.processingTime || 0
          }
        },
        detectedType,
        documentNumber,
        documentId
      );

      if (!storageResult.success) {
        console.warn('⚠️ Document storage failed, but extraction succeeded:', storageResult.error);
      }

      // Step 4: Return enhanced result
      return {
        success: true,
        data: {
          ...extractedData,
          // Add document storage info
          documentStorage: storageResult.success ? {
            documentId,
            documentNumber,
            documentType: detectedType,
            originalFile: storageResult.data?.original,
            extractionFile: storageResult.data?.extraction,
            storedAt: new Date().toISOString()
          } : null,
          // Add extraction metadata
          extractionMetadata: {
            documentId,
            documentNumber,
            documentType: detectedType,
            originalFileName: file.name,
            fileSize: file.size,
            contentType: file.type,
            extractedAt: new Date().toISOString(),
            confidence: extractionResult.confidence || 0,
            aiProvider: 'deepseek'
          }
        },
        confidence: extractionResult.confidence,
        documentStorage: storageResult.success ? storageResult.data : null
      };

    } catch (error) {
      console.error('❌ Enhanced extraction failed:', error);
      return {
        success: false,
        error: error.message,
        documentStorage: null
      };
    }
  }

  /**
   * Process PO with document storage
   * @param {File} file - Uploaded PO file
   * @returns {Promise<Object>} - PO extraction with storage
   */
  async extractPOWithStorage(file) {
    console.log(`🏢 Extracting PO with storage: ${file.name}`);
    
    const result = await this.extractWithDocumentStorage(file, 'po');
    
    if (result.success) {
      // Enhance PO-specific processing
      result.data = this.enhancePOData(result.data);
    }
    
    return result;
  }

  /**
 * Process PI with document storage - COMPLETELY FIXED VERSION
 * @param {File} file - Uploaded PI file
 * @returns {Promise<Object>} - PI extraction with storage
 */
async extractPIWithStorage(file) {
  console.log(`📄 FIXED: Extracting PI with storage: ${file.name}`);
  
  try {
    // Step 1: Extract data using existing method
    console.log('🔍 FIXED: Calling extractFromFile...');
    const extractionResult = await this.extractFromFile(file);
    
    if (!extractionResult.success) {
      throw new Error(`AI extraction failed: ${extractionResult.error}`);
    }

    console.log('✅ FIXED: AI extraction successful');

    // Step 2: Generate document metadata
    const extractedData = extractionResult.data;
    const documentId = this.generateDocumentId();
    const documentNumber = this.extractDocumentNumber(extractedData, 'pi');
    
    console.log(`📋 FIXED: Generated document metadata:`, {
      documentId,
      documentNumber,
      documentType: 'pi'
    });
    // Step 3: Store documents in Firebase Storage
    console.log(`💾 FIXED: Storing documents in Firebase...`);
    
    // Import DocumentStorageService dynamically to avoid circular imports
    const { default: DocumentStorageService } = await import('../DocumentStorageService.js');
    
    const storageResult = await DocumentStorageService.storeDocumentWithExtraction(
      file,
      extractedData,
      'pi',
      documentNumber,
      documentId
    );

    console.log(`📁 FIXED: Storage operation completed:`, {
      success: storageResult.success,
      error: storageResult.error,
      filesStored: storageResult.success ? 2 : 0
    });

    // Step 4: Enhance PI data with storage information
    const enhancedData = {
      ...extractedData,
      // ✅ CRITICAL: Add document storage identifiers
      documentId: documentId,
      documentNumber: documentNumber,
      documentType: 'pi',
      
      // ✅ CRITICAL: Add storage metadata
      storageInfo: storageResult.success ? storageResult.data : null,
      hasStoredDocuments: storageResult.success,
      
      // Add file metadata
      originalFileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      
      // Add timestamps
      extractedAt: new Date().toISOString(),
      storedAt: storageResult.success ? new Date().toISOString() : null
    };

    // Step 5: Return complete result
    const result = {
      success: true,
      data: enhancedData,
      confidence: extractionResult.confidence,
      documentStorage: storageResult.success ? storageResult.data : null,
      metadata: {
        documentId,
        documentNumber,
        documentType: 'pi',
        originalFileName: file.name,
        extractionSuccess: true,
        storageSuccess: storageResult.success
      }
    };

    console.log(`✅ FIXED: Complete extraction result:`, {
      success: result.success,
      documentId: result.data.documentId,
      hasStorageInfo: !!result.data.storageInfo,
      documentsStored: result.data.hasStoredDocuments
    });

    return result;

  } catch (error) {
    console.error('❌ FIXED: Enhanced extraction failed:', error);
    return {
      success: false,
      error: error.message,
      data: null,
      documentStorage: null,
      metadata: {
        originalFileName: file.name,
        extractionSuccess: false,
        storageSuccess: false
      }
    };
  }
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
     // Step 3.5: ENHANCED pre-processing with smart document type detection
      let preDetectedType = null;
let confidence = 0.9;

      // NEW: Bank Payment Slip Detection - ADD THIS BLOCK
const textContent = JSON.stringify(rawData).toLowerCase();
const bankIndicators = [
  'cross border payment',
  'payment advice', 
  'remittance advice',
  'wire transfer',
  'international transfer',
  'hong leong bank',
  'maybank',
  'cimb bank',
  'rhb bank',
  'public bank',
  'reference number',
  'beneficiary bank',
  'swift code',
  'debit amount',
  'payment amount',
  'exchange rate'
];

const bankScore = bankIndicators.filter(indicator => textContent.includes(indicator)).length;
if (bankScore >= 3) {
  preDetectedType = 'bank_payment_slip';
  confidence = Math.min(0.6 + (bankScore * 0.1), 0.95);
  console.log(`✅ PRE-DETECTED: Bank Payment Slip (score: ${bankScore})`);
}

// PRIORITY CHECK: PTP Client Purchase Order Detection
const ptpDetection = PTPClientPODetector.detectPTPClientPO(rawData);
if (ptpDetection.isClientPO) {
  preDetectedType = 'client_purchase_order';
  confidence = ptpDetection.confidence;
  console.log('✅ PRE-DETECTED: PTP Client Purchase Order');
  console.log('Detection score:', ptpDetection.score, '/', ptpDetection.maxScore);
  console.log('Matched indicators:', ptpDetection.matchedIndicators);
} else if (rawData.data?.purchase_order || rawData.purchase_order) {
  // ENHANCED VALIDATION: Don't just trust the structure, validate the content
  const textContent = JSON.stringify(rawData).toLowerCase();
  
  console.log('Found purchase_order structure, validating content...');
  
  // ✅ FIXED: Enhanced supplier indicators (Chinese suppliers sending PI)
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
    'co., ltd',
    'co ltd',
    'technology co',
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
  
  // ✅ FIXED: More specific client PO indicators
  const clientPOIndicators = [
    'purchase order no',
    'po number',
    'purchase requisition',
    'requisition number',
    'buyer: flow solution', // Very specific
    'bill to: flow solution', // Very specific
    'order from client',
    'client order'
  ];
  
  const hasSupplierIndicators = supplierIndicators.some(indicator => 
    textContent.includes(indicator.toLowerCase())
  );
  
  const hasClientPOIndicators = clientPOIndicators.some(indicator => 
    textContent.includes(indicator.toLowerCase())
  );
  
  // ✅ CRITICAL FIX: Check if Flow Solution is mentioned as CONSIGNEE/BUYER
  // This indicates it's a PI FROM a supplier TO us, not a PO from a client
  const flowSolutionAsConsignee = textContent.includes('flow solution') && 
    (textContent.includes('consignee') || textContent.includes('buyer:'));
  
  // ✅ CRITICAL FIX: Check if we see Chinese company names as SELLER
  const chineseCompanyAsSeller = textContent.includes('hengshui') || 
    textContent.includes('anzhishun') || 
    textContent.includes('technology co., ltd');
  
  console.log('Supplier indicators found:', hasSupplierIndicators);
  console.log('Client PO indicators found:', hasClientPOIndicators);
  console.log('Flow Solution as consignee/buyer:', flowSolutionAsConsignee);
  console.log('Chinese company as seller:', chineseCompanyAsSeller);
  
  // ✅ FIXED DECISION LOGIC: 
  // Priority 1: If Chinese company is seller AND Flow Solution is buyer = PI from supplier
  // Priority 2: If strong supplier indicators + no specific client PO indicators = PI
  // Priority 3: Only then consider it a client PO
  
  if (chineseCompanyAsSeller && flowSolutionAsConsignee) {
    preDetectedType = 'supplier_proforma';
    confidence = 0.95;
    console.log('✅ CORRECTED: Chinese supplier PI detected (Chinese company as seller, Flow Solution as buyer)');
  } else if (hasSupplierIndicators && !hasClientPOIndicators) {
    preDetectedType = 'supplier_proforma';
    confidence = 0.9;
    console.log('✅ CORRECTED: Supplier proforma detected based on strong supplier indicators');
  } else if (hasClientPOIndicators) {
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

if (docType.type === 'bank_payment_slip') {
  // 🏦 NEW: Process Bank Payment Slip
  console.log('Processing Bank Payment Slip from:', 
    rawData.data?.bank_name || rawData.bank_name || 'Unknown Bank');
  
  try {
    processedData = await BankPaymentSlipProcessor.process(rawData, file);
    console.log('✅ Successfully processed Bank Payment Slip:', processedData.referenceNumber);
  } catch (error) {
    console.error('❌ Bank payment slip processing failed:', error);
    throw new Error(`Bank payment slip processing failed: ${error.message}`);
  }
  
} else if (docType.type === 'client_purchase_order') {

  
  // NEW: Process Client Purchase Order (like PTP)
  console.log('Processing Client Purchase Order from:', 
    rawData.data?.purchase_order?.supplier?.name || 'Unknown Client');
  
  // FIX: Access the correct data structure
  const actualData = rawData.data || rawData;
  const data = actualData.purchase_order || actualData;
  
  // Enhanced multi-location item search with debugging
  let itemsArray = [];
  const possibleItemLocations = [
    { path: 'actualData.items', value: actualData.items },
    { path: 'actualData.purchase_order.items', value: actualData.purchase_order?.items },
    { path: 'actualData.line_items', value: actualData.line_items },
    { path: 'rawData.items', value: rawData.items },
    { path: 'data.items', value: data.items },
    { path: 'data.purchase_order.items', value: data.purchase_order?.items },
    { path: 'data.line_items', value: data.line_items }
  ];

  console.log('🔍 Searching for items in multiple locations:');
  for (const location of possibleItemLocations) {
    console.log(`- ${location.path}:`, {
      exists: !!location.value,
      isArray: Array.isArray(location.value),
      length: Array.isArray(location.value) ? location.value.length : 'N/A',
      sample: Array.isArray(location.value) && location.value.length > 0 ? location.value[0] : location.value
    });
    
    if (Array.isArray(location.value) && location.value.length > 0) {
      console.log(`🎯 Found items at ${location.path} with ${location.value.length} items`);
      itemsArray = location.value;
      break;
    }
  }

  // If still no items found, search recursively in the data structure
  if (itemsArray.length === 0) {
    console.log('🔍 No items found in standard locations, searching recursively...');
    itemsArray = this.findItemsRecursively(actualData) || this.findItemsRecursively(rawData) || [];
  }

  console.log(`📦 Final items array found: ${itemsArray.length} items`);

  processedData = {
  documentType: 'client_purchase_order',
  confidence: docType.confidence,
  
  // FIXED: Client info (the one sending us the PO)
  clientName: this.extractClientName(data),
  clientPONumber: data.order_number || data.po_number || '',
  clientAddress: data.supplier?.address || data.ship_to?.address || '',
  prNumber: data.pr_number || (data.pr_numbers && data.pr_numbers.length > 0 ? data.pr_numbers.join(', ') : ''),
  
  // FIXED: Our info (Flow Solution as recipient)  
  recipientName: data.bill_to?.name || 'Flow Solution Sdn. Bhd.',
  recipientAddress: data.bill_to?.address || '',
  
  // FIXED: Order details
  orderDate: data.order_date ? data.order_date.split(' ')[0] : new Date().toISOString().split('T')[0], // Remove time part
  requiredDate: data.required_date || data.delivery_date || '', // Not specified in PTP POs
  
  // ✅ Items to source using the found items array (this is working)
  items: this.mapClientPOItems(itemsArray),

  // FIXED: Financial totals
  totalAmount: parseFloat(data.grand_total || data.total_amount || data.subtotal || 0),
  subtotal: parseFloat(data.subtotal || data.sub_total || 0),
  tax: parseFloat(data.tax || data.gst || 0),
  
  // Status
  status: 'sourcing_required',
  sourcingStatus: 'pending',
  priority: 'normal',
  
  // Notes
  notes: data.notes || data.remarks || '',
  termsAndConditions: data.terms_and_conditions || data.terms || '',
  
  // Metadata
  extractedAt: new Date().toISOString(),
  sourceFile: file?.name || 'unknown'
};
  
  console.log('✅ Successfully processed Client PO:', processedData.clientPONumber);
  
} else if (docType.type === 'supplier_proforma' || docType.type === 'supplier_invoice') {
  // Use enhanced Chinese supplier extraction for both proforma and invoice
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
   * Map items from client PO format
   */
  mapClientPOItems(items) {
    if (!items || !Array.isArray(items)) {
      console.warn('No items array provided to mapClientPOItems');
      return [];
    }
    
    console.log('📦 Mapping', items.length, 'client PO items...');
    
    return items.map((item, index) => {
  // ✅ SUPER DETAILED DEBUG
  console.log(`🔍 FULL ITEM ${index + 1} DUMP:`);
  console.log(JSON.stringify(item, null, 2));
  
  console.log(`🔍 Item ${index + 1} field check:`, {
    part_number: item.part_number,
    product_code: item.product_code, 
    code: item.code,
    item_code: item.item_code,
    client_code: item.client_code,
    client_item_code: item.client_item_code,
      projectCode: item.projectCode, // ✅ ADD THIS
  project_code: item.project_code, // ✅ ADD THIS  
    reference: item.reference,
    material_code: item.material_code,
    pn: item.pn,
    ALL_KEYS: Object.keys(item)
  });
  
  console.log(`Mapping item ${index + 1}:`, {
    part_number: item.part_number,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    amount: item.amount
  });
      
      const mappedItem = {
  id: `item_${index + 1}`,
  productCode: this.extractManufacturerCode(item),  // ✅ CHANGED: Extract from description
  clientItemCode: item.part_number || '',  // ✅ NEW: Client codes go here
  productName: this.cleanProductName(item.description || item.product_name || item.name || ''),
        projectCode: item.projectCode || item.project_code || '',
        quantity: this.parseQuantity(item.quantity),
        unit: item.uom || item.unit || 'PCS',
        unitPrice: this.parsePrice(item.unit_price),
        totalPrice: this.parsePrice(item.amount) || (this.parseQuantity(item.quantity) * this.parsePrice(item.unit_price)),
        
        // Sourcing status
        sourcingStatus: 'pending',
        supplierMatches: [],
        recommendedSupplier: null,
        
        // Additional fields
        category: this.categorizeProduct(item.description || ''),
        specifications: item.description || '',
        urgency: 'normal'
      };
      
      console.log(`✅ Mapped item ${index + 1}:`, {
  productCode: mappedItem.productCode,
  clientItemCode: mappedItem.clientItemCode,  // ✅ ADD THIS LINE
        projectCode: mappedItem.projectCode,
  productName: mappedItem.productName.substring(0, 50) + '...',
        quantity: mappedItem.quantity,
        unitPrice: mappedItem.unitPrice,
        totalPrice: mappedItem.totalPrice
      });
      
      return mappedItem;
    });
  }

  /**
 * Parse quantity from various formats
 */
parseQuantity(quantityValue) {
  if (!quantityValue) return 0;
  
  // Handle string values like "3.00"
  if (typeof quantityValue === 'string') {
    // Remove any non-numeric characters except decimal point
    const cleaned = quantityValue.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed); // Round to nearest integer
  }
  
  // Handle numeric values
  if (typeof quantityValue === 'number') {
    return Math.round(quantityValue);
  }
  
  return 0;
}

/**
 * Parse price from various formats
 */
parsePrice(priceValue) {
  if (!priceValue) return 0;
  
  // Handle string values like "1,400.00"
  if (typeof priceValue === 'string') {
    // Remove currency symbols, commas, and spaces
    const cleaned = priceValue.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  // Handle numeric values
  if (typeof priceValue === 'number') {
    return priceValue;
  }
  
  return 0;
}

  /**
 * Extract manufacturer product code from description/specifications
 */
extractManufacturerCode(item) {
  const description = item.description || item.product_name || item.name || '';
  
  // Common manufacturer code patterns
  const patterns = [
    // Parentheses format: (ABC123) - Priority 10
    /\(([A-Z0-9\-\.\/]{4,})\)/gi,
    
    // Siemens part numbers: 6ES7407-0KA02-0AA0 - Priority 9  
    /\b([0-9][A-Z]{2}[0-9]{4}[-][0-9][A-Z]{2}[0-9]{2}[-][0-9][A-Z]{2}[0-9]{2})\b/gi,
    
    // Standard manufacturer codes: 6XV1830-3EH10
    /\b([A-Z0-9]{2,}-[A-Z0-9\-]{4,})\b/gi,
    
    // Model numbers: RUT240, S7-400
    /\b([A-Z]{2,}[0-9]+[A-Z]*)\b/gi,
    
    // Technical part numbers
    /\b([0-9][A-Z0-9\-]{6,})\b/gi
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      // Validate it's not a client code pattern (3digits+3letters+4digits)
      const clientPattern = /^[0-9]{3}[A-Z]{3}[0-9]{4}$/;
      if (!clientPattern.test(match[1])) {
        return match[1];
      }
    }
  }
  
  return ''; // Return empty if no manufacturer code found
}

/**
 * Validate client item code patterns  
 */
validateClientItemCode(clientCode) {
  // Validate it matches client code patterns (like 200RTG0750, 400CON0060)
  const clientCodePatterns = [
    /^[0-9]{3}[A-Z]{3}[0-9]{4}$/,  // 200RTG0750 pattern
    /^[0-9]{3}[A-Z]{3}[0-9]{3}$/,  // Alternative pattern
    /^[0-9]{3}[A-Z]{2,4}[0-9]{3,5}$/ // Flexible pattern
  ];
  
  for (const pattern of clientCodePatterns) {
    if (pattern.test(clientCode)) {
      return true;
    }
  }
  
  return false;
}
  
  /**
   * Extract and clean client name from various sources
   */
  extractClientName(data) {
  console.log('🏢 Extracting client name from data:', {
    supplier: data.supplier,
    ship_to: data.ship_to,
    bill_to: data.bill_to
  });

  // For PTP client POs, the client info is in the supplier field (they're sending us the PO)
  let clientName = '';
  
  // First try: supplier.name (most common)
  if (data.supplier?.name) {
    clientName = data.supplier.name;
  }
  // Second try: extract from supplier address
  else if (data.supplier?.address) {
    clientName = data.supplier.address;
  }
  // Third try: extract from ship_to address
  else if (data.ship_to?.address) {
    clientName = data.ship_to.address;
  }
  // Fallback: check ship_to name
  else if (data.ship_to?.name) {
    clientName = data.ship_to.name;
  }

  console.log('🏢 Raw client name extracted:', clientName);

  // Clean up the client name
  if (clientName) {
    // Handle PTP variations - check if address contains PTP identifiers
    if (clientName.toLowerCase().includes('tanjung pelepas') || 
        clientName.toLowerCase().includes('pelabuhan tanjung pelepas')) {
      return 'Pelabuhan Tanjung Pelepas (PTP)';
    }
    
    // Handle Petronas variations
    if (clientName.toLowerCase().includes('petronas')) {
      return 'PETRONAS';
    }
    
    // Handle Siemens variations
    if (clientName.toLowerCase().includes('siemens')) {
      return 'Siemens Malaysia';
    }
    
    // Handle general address-like strings
    if (clientName.includes('JALAN') || clientName.includes('Jalan')) {
      // Extract company name from address
      const parts = clientName.split(',');
      if (parts.length > 0) {
        const firstPart = parts[0].trim();
        
        // Check if first part contains identifiable company info
        if (firstPart.toLowerCase().includes('tanjung pelepas') || 
            firstPart.toLowerCase().includes('pelabuhan')) {
          return 'Pelabuhan Tanjung Pelepas (PTP)';
        }
        
        // For other addresses, try to extract meaningful company name
        if (firstPart.length > 10 && firstPart.includes(' ')) {
          // Look for company patterns in address
          const companyPatterns = [
            /PELABUHAN\s+([^,]+)/i,
            /PT\.\s*([^,]+)/i,
            /([A-Z][a-z]+\s+[A-Z][a-z]+)/
          ];
          
          for (const pattern of companyPatterns) {
            const match = firstPart.match(pattern);
            if (match && match[1]) {
              return match[1].trim();
            }
          }
        }
      }
    }
    
    // If it's a clean company name already, return as is
    if (clientName.length < 100 && !clientName.includes('JALAN') && clientName.split(',').length <= 2) {
      return clientName.trim();
    }
  }

  console.log('🏢 Final client name:', clientName || 'Unknown Client');
  return clientName || 'Unknown Client';
}

  /**
   * Clean and shorten product names
   */
  cleanProductName(productName) {
    if (!productName) return '';
    
    // Remove excessive capitalization and clean up
    let cleaned = productName.trim();
    
    // Handle TELTONIKA products specifically
    if (cleaned.toLowerCase().includes('teltonika')) {
      // Extract key information
      const model = cleaned.match(/RUT\d+/i);
      const connectivity = cleaned.match(/(LTE|4G|3G|2G|WIFI|VPN)/gi);
      
      if (model) {
        let shortName = `TELTONIKA ${model[0]}`;
        if (connectivity && connectivity.length > 0) {
          shortName += ` (${connectivity.slice(0, 3).join('/')})`;
        }
        return shortName;
      }
    }
    
    // General cleaning for other products
    if (cleaned.length > 80) {
      // Truncate very long names but keep important keywords
      const keywords = ['ROUTER', 'MODEM', 'SWITCH', 'GATEWAY', 'CONTROLLER', 'SENSOR', 'PUMP', 'VALVE'];
      const foundKeywords = keywords.filter(keyword => 
        cleaned.toUpperCase().includes(keyword)
      );
      
      if (foundKeywords.length > 0) {
        const truncated = cleaned.substring(0, 60);
        return `${truncated}... (${foundKeywords.join('/')})`;
      } else {
        return cleaned.substring(0, 80) + '...';
      }
    }
    
    return cleaned;
  }

  /**
   * Categorize products based on description
   */
  categorizeProduct(description) {
    if (!description) return 'General';
    
    const desc = description.toLowerCase();
    
    // Networking equipment
    if (desc.includes('router') || desc.includes('modem') || desc.includes('wifi') || 
        desc.includes('ethernet') || desc.includes('switch') || desc.includes('gateway')) {
      return 'Networking Equipment';
    }
    
    // Industrial automation
    if (desc.includes('controller') || desc.includes('plc') || desc.includes('hmi') ||
        desc.includes('automation') || desc.includes('industrial')) {
      return 'Industrial Automation';
    }
    
    // Power and electrical
    if (desc.includes('power') || desc.includes('electrical') || desc.includes('transformer') ||
        desc.includes('relay') || desc.includes('circuit')) {
      return 'Electrical Components';
    }
    
    // Mechanical
    if (desc.includes('pump') || desc.includes('valve') || desc.includes('bearing') ||
        desc.includes('motor') || desc.includes('gear')) {
      return 'Mechanical Components';
    }
    
    // Sensors and instruments
    if (desc.includes('sensor') || desc.includes('transmitter') || desc.includes('gauge') ||
        desc.includes('meter') || desc.includes('monitor')) {
      return 'Sensors & Instrumentation';
    }
    
    return 'General';
  }

     /**
   * Recursively search for items array in nested data structures
   */
  findItemsRecursively(obj, path = '') {
    if (!obj || typeof obj !== 'object') return null;
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if this is an items array
      if (Array.isArray(value) && value.length > 0) {
        // Check if this looks like a product/item array
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object') {
          const hasProductFields = firstItem.description || 
                                  firstItem.product_name || 
                                  firstItem.name || 
                                  firstItem.part_number ||
                                  firstItem.product_code ||
                                  firstItem.quantity ||
                                  firstItem.unit_price;
          
          if (hasProductFields) {
            console.log(`🎯 Found potential items array at ${currentPath} with ${value.length} items`);
            console.log('First item sample:', firstItem);
            return value;
          }
        }
      }
      
      // Recursively search nested objects
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const result = this.findItemsRecursively(value, currentPath);
        if (result) return result;
      }
    }
    
    return null;
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


  // ✅ ADD THIS NEW METHOD RIGHT HERE
  /**
   * Extract project codes from PO data
   */
  extractProjectCodesFromPO(extractedData) {
    // Look for project codes in various formats from PTP PO and other formats
    const projectCodePatterns = [
      /FS-S\d+/gi,        // FS-S3798, FS-S3845 (from PTP)
      /BWS-S\d+/gi,       // BWS-S1046 
      /[A-Z]{2,3}-[A-Z]\d+/gi, // General pattern XX-X1234
      /Project\s*Code[:\s]+([A-Z0-9-]+)/gi,
      /Job\s*No[:\s]+([A-Z0-9-]+)/gi,
      /Ref[:\s]+([A-Z0-9-]+)/gi
    ];
    
    console.log('🏢 EXTRACTING PROJECT CODES from PO data');
    
    if (extractedData.items) {
      extractedData.items = extractedData.items.map((item, index) => {
        let projectCode = '';
        
        // Check if project code is already extracted
        if (item.projectCode) {
          projectCode = item.projectCode;
          console.log(`  ✅ Item ${index + 1}: Found existing project code: ${projectCode}`);
        } else {
          // Try to extract from description, notes, or part number
          const textToSearch = [
            item.description || '',
            item.notes || '',
            item.partNumber || '',
            item.productName || '',
            item.clientItemCode || '',
            item.part_number || '', // Backend might use snake_case
            JSON.stringify(item) // Search entire item object
          ].join(' ');
          
          console.log(`  🔍 Item ${index + 1}: Searching in text: "${textToSearch.substring(0, 100)}..."`);
          
          for (const pattern of projectCodePatterns) {
            const matches = textToSearch.match(pattern);
            if (matches) {
              projectCode = matches[0];
              console.log(`  ✅ Item ${index + 1}: Extracted project code: ${projectCode}`);
              break;
            }
          }
          
          if (!projectCode) {
            console.log(`  ⚠️ Item ${index + 1}: No project code found`);
          }
        }
        
        return {
          ...item,
          projectCode: projectCode || ''
        };
      });
    }
    
    return extractedData;
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
   * Helper methods for document storage integration
   */
  detectDocumentType(extractedData) {
    // Your existing document type detection logic
    if (extractedData.documentType) {
      return extractedData.documentType === 'supplier_proforma' ? 'pi' : 'po';
    }
    
    // Fallback detection
    if (extractedData.piNumber || extractedData.invoiceNumber) {
      return 'pi';
    } else if (extractedData.poNumber || extractedData.orderNumber) {
      return 'po';
    }
    
    return 'po'; // Default
  }

  extractDocumentNumber(extractedData, documentType) {
    if (documentType === 'pi') {
      return extractedData.piNumber || 
             extractedData.invoiceNumber || 
             `PI-${Date.now()}`;
    } else {
      return extractedData.poNumber || 
             extractedData.orderNumber || 
             extractedData.clientPONumber ||
             `PO-${Date.now()}`;
    }
  }

  generateDocumentId() {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  enhancePOData(data) {
    // Add PO-specific enhancements
    return {
      ...data,
      documentType: 'po',
      // Add any PO-specific fields
    };
  }

  enhancePIData(data) {
    // Add PI-specific enhancements
    return {
      ...data,
      documentType: 'pi',
      // Add any PI-specific fields
    };
  }

  /**
   * Retrieve stored documents for a PO/PI
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po' or 'pi'
   * @returns {Promise<Array>} - List of stored documents
   */
  async getStoredDocuments(documentId, documentType) {
    try {
      const result = await DocumentStorageService.getDocumentFiles(documentId, documentType);
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error retrieving stored documents:', error);
      return [];
    }
  }

  /**
   * Delete stored documents for a PO/PI
   * @param {string} documentId - Document ID
   * @param {string} documentType - 'po' or 'pi'
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteStoredDocuments(documentId, documentType) {
    try {
      return await DocumentStorageService.deleteDocumentFiles(documentId, documentType);
    } catch (error) {
      console.error('Error deleting stored documents:', error);
      return { success: false, error: error.message };
    }
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

  // ✅ ADD NEW STATIC METHODS FOR DOCUMENT STORAGE
  static async extractPOWithStorage(file) {
    const instance = new AIExtractionService();
    return instance.extractPOWithStorage(file);
  }

  static async extractPIWithStorage(file) {
    const instance = new AIExtractionService();
    return instance.extractPIWithStorage(file);
  }

  // 🏦 ADD THESE NEW BANK PAYMENT METHODS HERE:
  /**
   * Extract bank payment slip - NEW METHOD
   */
  static async extractBankPaymentSlip(file) {
  try {
    console.log('🏦 Extracting bank payment slip via Railway backend:', file.name);
    
    // Validate file first
    const instance = new AIExtractionService();
    const validation = instance.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    // Call the specific bank payment backend endpoint
    const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'https://supplier-mcp-server-production.up.railway.app';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', 'bank_payment_slip');
    
    console.log('📡 Calling backend endpoint:', `${AI_BACKEND_URL}/api/bank-payments/extract`);
    
    const response = await fetch(`${AI_BACKEND_URL}/api/bank-payments/extract`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to extract bank payment data' }));
      throw new Error(error.message || error.error || 'Bank payment extraction failed');
    }

    const result = await response.json();
    console.log('✅ Backend extraction successful:', result);

    // ✅ ADD PROJECT CODE EXTRACTION HERE
if (result.success && result.data) {
  result.data = this.extractProjectCodesFromPO(result.data);
  console.log('🏢 Project codes extracted and added to result');
}
    
    // Return in the format expected by your system
    return {
      success: true,
      data: result.data, // This contains the bank_payment object from backend
      confidence: result.data.confidence || 0.9,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        documentType: 'bank_payment_slip',
        extractionMethod: 'backend_ai_service',
        processingTime: result.processing_time,
        extractedAt: new Date().toISOString(),
        ...result.metadata
      }
    };

  } catch (error) {
    console.error('❌ Bank payment extraction failed:', error);
    
    // Only fall back to mock data if in development AND backend is unreachable
    if (import.meta.env.MODE === 'development' || import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      console.log('🔄 Backend failed, using development fallback');
      return {
        success: true,
        data: AIExtractionService.getMockBankPaymentData(file),
        confidence: 0.7,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          documentType: 'bank_payment_slip',
          mockData: true,
          extractedAt: new Date().toISOString(),
          fallbackReason: error.message
        }
      };
    }
    
    return {
      success: false,
      error: error.message,
      data: null,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        errorType: 'bank_payment_extraction_failed'
      }
    };
  }
}

  /**
   * Generate mock bank payment data for development
   */
  static getMockBankPaymentData(file) {
    // Array of different mock scenarios for testing
    const scenarios = [
      {
        referenceNumber: 'C776010725152519',
        paidAmount: 5796.00,
        debitAmount: 25757.42,
        exchangeRate: 4.4449,
        beneficiaryName: 'HENGSHUI ANZHISHUN TECHNOLOGY CO.,LTD'
      },
      {
        referenceNumber: 'C887021025163428',
        paidAmount: 3200.00,
        debitAmount: 14208.00,
        exchangeRate: 4.44,
        beneficiaryName: 'BEIJING ELECTRONICS CO LTD'
      },
      {
        referenceNumber: 'C998031125174537',
        paidAmount: 8750.00,
        debitAmount: 38875.00,
        exchangeRate: 4.44,
        beneficiaryName: 'SHENZHEN TECH SOLUTIONS LIMITED'
      }
    ];

    // Randomly pick a scenario
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    return {
      documentType: 'bank_payment_slip',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // Transaction details
      referenceNumber: scenario.referenceNumber,
      transactionId: `TXN${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      paymentDate: new Date().toISOString().split('T')[0],
      makerDate: new Date().toISOString().split('T')[0],
      
      // Bank information
      bankName: 'Hong Leong Bank',
      branchName: 'KEPALA BATAS BRANCH',
      accountNumber: '17301010259',
      accountName: 'FLOW SOLUTION SDN BH',
      
      // Payment amounts
      paidCurrency: 'USD',
      paidAmount: scenario.paidAmount,
      debitCurrency: 'MYR',
      debitAmount: scenario.debitAmount,
      exchangeRate: scenario.exchangeRate,
      
      // Beneficiary details
      beneficiaryName: scenario.beneficiaryName,
      beneficiaryBank: 'JPMorgan Chase Bank NA',
      beneficiaryAccount: '63001397989',
      beneficiaryCountry: 'HONG KONG',
      beneficiaryAddress: 'HENGSHUI CITY, HEBEI PROVINCE, CHINA (MAINLAND)',
      
      // Additional details
      bankCharges: 50.00,
      totalCost: scenario.debitAmount + 50.00,
      swiftCode: 'CHASHKHHXXX',
      status: 'Sent to Bank',
      paymentPurpose: '300-Goods',
      chargeBearer: 'OUR',
      createdBy: 'CHUNG YOOK FONG',
      
      // Validation results
      validation: {
        isValid: true,
        errors: [],
        warnings: []
      },
      confidence: 0.92
    };
  }


  static async getStoredDocuments(documentId, documentType) {
    const instance = new AIExtractionService();
    return instance.getStoredDocuments(documentId, documentType);
  }

  static async deleteStoredDocuments(documentId, documentType) {
    const instance = new AIExtractionService();
    return instance.deleteStoredDocuments(documentId, documentType);
  }

  /**
   * Get extraction capabilities
   */
  static getCapabilities() {
    return {
      supportedFormats: EXTRACTION_SETTINGS.supportedFormats,
      maxFileSize: EXTRACTION_SETTINGS.maxFileSize,
      documentTypes: [
      'client_purchase_order',
      'supplier_proforma', 
      'bank_payment_slip', // ← ADD THIS LINE
      'unknown'
    ],
      features: [
        'OCR support for scanned documents',
        'Multi-format extraction (PDF, Images, Excel, Email)',
        'Automatic document type detection',
        'Enhanced Chinese supplier PI optimization',
        'Bank payment slip processing',
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
