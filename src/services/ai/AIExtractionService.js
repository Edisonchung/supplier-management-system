// src/services/ai/AIExtractionService.js
// Complete implementation for HiggsFlow with PTP and Supplier document handling

import { getErrorMessage } from '../../utils/errorHandling';

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'https://supplier-mcp-server-production.up.railway.app';
const DEFAULT_TIMEOUT = 120000;

// Mock configuration
const MOCK_FALLBACK = {
  enabled: false,  // Disabled to avoid confusion
  mockItems: [
    {
      lineNumber: '1',
      partNumber: '400SHA0307',
      description: '6SY7000-0AB28 TROLLEY INVERTER FAN, SIEMENS (RTN)',
      quantity: 4,
      uom: 'PCS',
      unitPrice: 1350.00,
      totalPrice: 5400.00,
      deliveryDate: '2024-10-28',
      supplierMatches: [
        {
          supplier: 'Hebei Mickey Badger',
          partNumber: 'Siemens 6SY7000-0AB28',
          unitPrice: 228.50,
          currency: 'USD',
          leadTime: '3 days',
          confidence: 0.95,
          margin: '22.1'
        }
      ]
    },
    {
      lineNumber: '2',
      partNumber: '200QCR2064',
      description: 'LED POWER SUPPLY FOR ADVANLED FLOODLIGHT, POWER: 240W',
      quantity: 5,
      uom: 'UNI',
      unitPrice: 190.00,
      totalPrice: 950.00,
      deliveryDate: '2024-10-28',
      supplierMatches: []
    }
  ]
};

export class AIExtractionService {
  constructor() {
    this.baseUrl = AI_BACKEND_URL;
    // Product matching cache
    this.productMaster = new Map();
    this.supplierProducts = new Map();
  }

  /**
   * Main extraction method with document type detection
   */
  async extractFromFile(file) {
    try {
      console.log('Starting AI extraction for:', file.name);
      
      // Validate file
      const validation = this.validateFile(file);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          data: null
        };
      }

      // Extract raw data
      const rawData = await this.callExtractionAPI(file);
      
      // Detect document type
      const docType = this.detectDocumentType(rawData);
      console.log('Detected document type:', docType.type);
      
      // Process based on document type
      let processedData;
      switch (docType.type) {
        case 'client_purchase_order':
          processedData = await this.processClientPO(rawData, file);
          break;
        case 'supplier_proforma':
          processedData = await this.processSupplierPI(rawData, file);
          break;
        case 'supplier_invoice':
          processedData = await this.processSupplierInvoice(rawData, file);
          break;
        default:
          processedData = this.processGenericDocument(rawData, file);
      }
      
      return {
        success: true,
        data: processedData,
        confidence: docType.confidence,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          extractionTime: Date.now(),
          documentType: docType.type
        }
      };
      
    } catch (error) {
      console.error('AI extraction error:', error);
      return {
        success: false,
        error: getErrorMessage(error),
        data: null
      };
    }
  }

  /**
   * Call Railway backend API
   */
  async callExtractionAPI(file) {
    console.log(`Starting extraction for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    
    const formData = new FormData();
    
    // Determine the field name based on file type
    const fileType = this.getFileType(file);
    
    switch (fileType) {
      case 'pdf':
        formData.append('pdf', file);
        break;
      case 'image':
        formData.append('image', file);
        break;
      case 'excel':
        formData.append('excel', file);
        break;
      default:
        formData.append('file', file);
    }

    // Add additional parameters
    formData.append('enhancedMode', 'true');
    formData.append('validateData', 'true');

    const controller = new AbortController();
    const startTime = Date.now();
    
    // Set up timeout with progress logging
    const timeoutId = setTimeout(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.error(`Extraction timeout after ${elapsed} seconds`);
      controller.abort();
    }, DEFAULT_TIMEOUT);

    // Log progress every 10 seconds
    const progressInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`Extraction in progress... ${elapsed} seconds elapsed`);
    }, 10000);

    try {
      console.log(`Calling ${this.baseUrl}/api/extract-po...`);
      
      const response = await fetch(`${this.baseUrl}/api/extract-po`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`Response received after ${elapsed} seconds`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Extraction API error:', {
          status: response.status,
          message: errorData.message,
          data: errorData
        });
        
        throw new Error(errorData.message || `Extraction failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Extraction successful:', result);
      
      // Ensure the response has the expected structure
      if (!result.data) {
        return {
          success: true,
          data: result,
          confidence: result.confidence || 0.85
        };
      }
      
      return result;
      
    } catch (error) {
      clearTimeout(timeoutId);
      clearInterval(progressInterval);
      
      if (error.name === 'AbortError') {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        throw new Error(`Extraction timeout after ${elapsed} seconds. The file may be too large or complex.`);
      }
      throw error;
    }
  }

  getFileType(file) {
    const fileName = file.name || '';
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeType = (file.type || '').toLowerCase();

    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf';
    }
    
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
      return 'image';
    }
    
    if (
      mimeType.includes('spreadsheet') || 
      mimeType.includes('excel') || 
      ['xlsx', 'xls', 'csv'].includes(extension)
    ) {
      return 'excel';
    }
    
    return 'unknown';
  }

  /**
   * Detect document type from content
   */
  detectDocumentType(data) {
    const content = JSON.stringify(data).toLowerCase();
    
    // Check for PTP or other client POs
    if (content.includes('pelabuhan tanjung pelepas') || 
        content.includes('ptp') ||
        (content.includes('bill to:') && content.includes('flow solution'))) {
      return { type: 'client_purchase_order', confidence: 0.95 };
    }
    
    // Check for supplier proforma invoices
    if (content.includes('proforma invoice') && 
        (content.includes('consignee:edison') || 
         content.includes('consignee:flow solution') ||
         content.includes('buyer: flowsolution'))) {
      return { type: 'supplier_proforma', confidence: 0.90 };
    }
    
    // Check for supplier invoices
    if (content.includes('invoice') && 
        content.includes('flow solution') &&
        !content.includes('proforma')) {
      return { type: 'supplier_invoice', confidence: 0.85 };
    }
    
    return { type: 'unknown', confidence: 0 };
  }

  /**
   * Process Client Purchase Order (e.g., from PTP)
   */
  async processClientPO(rawData, file) {
    console.log('Processing client PO, raw data structure:', rawData);
    
    // Handle both direct data and nested data.data structure
    let extractedData = rawData.data || rawData;
    
    // Log the full extracted data to see what's available
    console.log('Full extracted data:', JSON.stringify(extractedData, null, 2));
    
    // Check if data is nested in purchase_order object
    if (extractedData.purchase_order) {
      const po = extractedData.purchase_order;
      
      const data = {
        documentType: 'client_purchase_order',
        
        // Extract PO details from nested structure
        poNumber: po.order_number || this.extractPattern(extractedData, /PO-\d{6}/),
        prNumbers: po.pr_numbers || this.extractAllPatterns(extractedData, /PR-\d{6}/),
        
        // Client information
        client: {
          name: po.bill_to?.name || this.extractClientName(extractedData),
          registration: this.extractPattern(extractedData, /\d{6}-[A-Z]/),
          address: po.bill_to?.address || this.extractValue(extractedData, ['bill to', 'billing address']),
          shipTo: po.ship_to?.address || this.extractValue(extractedData, ['ship to', 'delivery address'])
        },
        
        // Dates
        orderDate: this.convertToISO(po.order_date) || new Date().toISOString().split('T')[0],
        deliveryDate: this.convertToISO(po.items?.[0]?.delivery_date?.needed) || '',
        promisedDate: this.convertToISO(po.items?.[0]?.delivery_date?.promised),
        
        // Terms - extract from the raw data if available
        paymentTerms: po.payment_terms || '60D',
        deliveryTerms: po.delivery_terms || 'DDP',
        
        // Extract line items from nested structure
        items: po.items?.map(item => ({
          lineNumber: item.line?.toString() || '',
          partNumber: item.part_number || '',
          description: item.description || '',
          quantity: item.quantity || 0,
          uom: item.uom || 'PCS',
          unitPrice: item.unit_price || 0,
          totalPrice: (item.quantity || 0) * (item.unit_price || 0),
          deliveryDate: this.convertToISO(item.delivery_date?.needed) || '',
          reference: item.reference || ''
        })) || [],
        
        // Totals
        subtotal: po.subtotal || 0,
        tax: po.tax || 0,
        totalAmount: po.grand_total || 0,
        currency: 'MYR',
        
        // Notes
        notes: po.notes || '',
        
        // Add sourcing plan
        sourcingPlan: null
      };
      
      console.log('Extracted PO data:', data);
      
      // Create sourcing plan
      data.sourcingPlan = await this.createSourcingPlan(data);
      
      return data;
    }
    
    // Fall back to original structure if purchase_order object not found
    const data = {
      documentType: 'client_purchase_order',
      
      // Extract PO details - check multiple possible field names
      poNumber: this.extractPattern(extractedData, /PO-\d{6}/) || 
                this.extractValue(extractedData, ['po number', 'order', 'poNumber', 'orderNumber']) ||
                extractedData.poNumber ||
                extractedData.orderNumber,
      
      prNumbers: this.extractAllPatterns(extractedData, /PR-\d{6}/),
      
      // Client information
      client: {
        name: this.extractClientName(extractedData) || 
              extractedData.clientName || 
              extractedData.client || 
              extractedData.customerName,
        registration: this.extractPattern(extractedData, /\d{6}-[A-Z]/),
        address: this.extractValue(extractedData, ['bill to', 'billing address']),
        shipTo: this.extractValue(extractedData, ['ship to', 'delivery address'])
      },
      
      // Dates
      orderDate: this.convertToISO(
        this.extractValue(extractedData, ['order date', 'po date']) || 
        extractedData.orderDate || 
        extractedData.date
      ) || new Date().toISOString().split('T')[0],
      
      deliveryDate: this.convertToISO(
        this.extractValue(extractedData, ['delivery date', 'needed']) ||
        extractedData.deliveryDate
      ) || '',
      
      promisedDate: this.convertToISO(this.extractValue(extractedData, ['promised'])),
      
      // Terms
      paymentTerms: this.extractValue(extractedData, ['payment terms', '60d', '30d']) || 
                    extractedData.paymentTerms || 
                    '60D',
      
      deliveryTerms: this.extractValue(extractedData, ['delivery terms', 'ddp', 'fob']) || 
                     extractedData.deliveryTerms || 
                     'DDP',
      
      // Extract line items
      items: await this.extractAndMatchItems(extractedData),
      
      // Totals - check multiple possible field names
      subtotal: this.extractAmount(extractedData, ['subtotal']) || 
                extractedData.subtotal,
      
      tax: this.extractAmount(extractedData, ['tax', 'sst']) || 
           extractedData.tax,
      
      totalAmount: this.extractAmount(extractedData, ['grand total', 'total', 'totalAmount']) || 
                   extractedData.totalAmount || 
                   extractedData.total,
      
      currency: extractedData.currency || 'MYR',
      
      // Add sourcing plan
      sourcingPlan: null
    };
    
    console.log('Extracted PO data:', data);
    
    // Check if items are empty and mock fallback is enabled
    if ((!data.items || data.items.length === 0) && MOCK_FALLBACK.enabled) {
      console.log('No items extracted, adding mock items...');
      
      // Different mock items based on PO number
      if (data.poNumber === 'PO-020748') {
        data.items = [
          {
            lineNumber: '1',
            partNumber: '400QCR1068',
            description: 'THRUSTER',
            quantity: 1,
            uom: 'PCS',
            unitPrice: 20500.00,
            totalPrice: 20500.00,
            deliveryDate: '2024-12-23'
          },
          {
            lineNumber: '3',
            partNumber: '400QCR0662',
            description: 'SIMATIC S7-400, PS 407 POWER SUPPLY, 10A, 120/230V UC, 5V/10A DC',
            quantity: 1,
            uom: 'UNI',
            unitPrice: 1950.00,
            totalPrice: 1950.00,
            deliveryDate: '2024-12-23'
          }
        ];
      } else {
        // Default mock items for other POs
        data.items = MOCK_FALLBACK.mockItems;
      }
      
      // Recalculate totals if needed
      if (!data.totalAmount) {
        data.totalAmount = data.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      }
    }
    
    // Create sourcing plan
    data.sourcingPlan = await this.createSourcingPlan(data);
    
    return data;
  }

  /**
   * Process Supplier Proforma Invoice
   */
  // Add this enhanced processSupplierPI method to your existing AIExtractionService.js

async processSupplierPI(rawData, file) {
  console.log('Processing Supplier PI:', file.name);
  
  // Handle nested JSON structure from backend
  let extractedData = rawData.data || rawData;
  
  // Check for nested proforma_invoice object (similar to purchase_order)
  if (extractedData.proforma_invoice) {
    const pi = extractedData.proforma_invoice;
    
    const processedData = {
      documentType: 'supplier_proforma',
      
      // PI identification
      piNumber: pi.invoice_number || pi.pi_number || pi.number || this.generatePINumber(),
      date: this.convertToISO(pi.date || pi.invoice_date || pi.issue_date),
      validUntil: this.convertToISO(pi.valid_until || pi.expiry_date || pi.validity_date),
      
      // Supplier details
      supplier: {
        name: pi.supplier?.name || pi.seller?.company || pi.vendor?.name || '',
        contact: pi.supplier?.contact || pi.seller?.contact_person || pi.vendor?.contact || '',
        email: pi.supplier?.email || pi.seller?.email || pi.vendor?.email || '',
        phone: pi.supplier?.phone || pi.supplier?.mobile || pi.seller?.phone || '',
        address: pi.supplier?.address || pi.seller?.address || pi.vendor?.address || ''
      },
      
      // Client reference
      clientRef: {
        name: pi.buyer?.name || pi.consignee?.name || pi.client?.name || '',
        poNumber: pi.reference?.po_number || this.extractPattern(extractedData, /PO-\d{6}/) || '',
        rfqNumber: pi.reference?.rfq_number || this.extractPattern(extractedData, /RFQ-\d{6}/) || ''
      },
      
      // Products/Items with enhanced mapping
      products: (pi.items || pi.products || pi.line_items || []).map(item => ({
        productCode: item.part_number || item.product_code || item.sku || item.code || '',
        productName: item.description || item.product_name || item.name || '',
        quantity: this.parseNumber(item.quantity || item.qty || 0),
        unitPrice: this.parseAmount(item.unit_price || item.price || 0),
        totalPrice: this.parseAmount(item.total_price || item.total || (item.quantity * item.unit_price) || 0),
        leadTime: item.lead_time || item.delivery_time || '',
        warranty: item.warranty || '',
        notes: item.notes || item.remarks || ''
      })).filter(item => item.productCode || item.productName), // Filter out empty items
      
      // Financial details
      subtotal: this.parseAmount(pi.subtotal || pi.net_amount || 0),
      discount: this.parseAmount(pi.discount || pi.discount_amount || 0),
      discountPercent: this.parseNumber(pi.discount_percent || 0),
      shipping: this.parseAmount(pi.shipping || pi.freight || pi.delivery_charge || 0),
      tax: this.parseAmount(pi.tax || pi.gst || pi.vat || 0),
      taxPercent: this.parseNumber(pi.tax_percent || pi.gst_percent || pi.vat_percent || 0),
      grandTotal: this.parseAmount(pi.grand_total || pi.total || pi.total_amount || 0),
      currency: pi.currency || 'USD',
      exchangeRate: this.parseNumber(pi.exchange_rate || 1),
      
      // Terms and conditions
      paymentTerms: pi.payment_terms || pi.terms_of_payment || '30% down payment, 70% before delivery',
      deliveryTerms: pi.delivery_terms || pi.incoterms || 'FOB',
      leadTime: pi.lead_time || pi.delivery_time || '2-3 weeks',
      warranty: pi.warranty || pi.warranty_period || '12 months',
      validity: pi.validity || pi.valid_for || '30 days',
      
      // Banking details (for international suppliers)
      bankDetails: {
        bankName: pi.bank?.name || pi.bank_details?.bank_name || '',
        accountNumber: pi.bank?.account_number || pi.bank_details?.account || '',
        accountName: pi.bank?.account_name || pi.bank_details?.beneficiary || '',
        swiftCode: pi.bank?.swift || pi.bank_details?.swift_code || '',
        iban: pi.bank?.iban || pi.bank_details?.iban || '',
        routingNumber: pi.bank?.routing || pi.bank_details?.routing_number || ''
      },
      
      // Additional extracted info
      notes: pi.notes || pi.remarks || pi.comments || '',
      specialInstructions: pi.special_instructions || pi.instructions || ''
    };
    
    // Clean up and validate the data
    processedData.supplier.name = this.cleanText(processedData.supplier.name);
    processedData.grandTotal = processedData.grandTotal || this.calculateTotal(processedData);
    
    return processedData;
  }
  
  // Fallback to legacy extraction if new format not found
  return this.processSupplierPILegacy(rawData, file);
}

// Add these helper methods if they don't exist in your AIExtractionService class:

generatePINumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PI-${year}${month}-${random}`;
}

parseNumber(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d.-]/g, '');
  return parseFloat(cleaned) || 0;
}

parseAmount(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  // Remove currency symbols, commas, and spaces
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

cleanText(text) {
  if (!text) return '';
  return String(text).trim().replace(/\s+/g, ' ');
}

calculateTotal(data) {
  const subtotal = data.products.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const discountAmount = data.discountPercent ? subtotal * (data.discountPercent / 100) : data.discount;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = data.taxPercent ? taxableAmount * (data.taxPercent / 100) : data.tax;
  return taxableAmount + taxAmount + data.shipping;
}

extractPattern(data, pattern) {
  const text = JSON.stringify(data);
  const match = text.match(pattern);
  return match ? match[0] : null;
}

// Legacy extraction method for backward compatibility
processSupplierPILegacy(rawData, file) {
  console.log('Using legacy PI extraction');
  
  // Implement your existing extraction logic here
  // This ensures backward compatibility with older PI formats
  
  return {
    documentType: 'supplier_proforma',
    piNumber: this.generatePINumber(),
    date: new Date().toISOString().split('T')[0],
    supplier: { name: 'Unknown Supplier' },
    products: [],
    grandTotal: 0,
    currency: 'USD',
    paymentTerms: '30% down payment, 70% before delivery',
    notes: 'Extracted using legacy method - manual review recommended'
  };
}

  /**
   * Process Supplier Invoice (placeholder)
   */
  processSupplierInvoice(rawData, file) {
    // Similar to proforma but for actual invoices
    return this.processSupplierPI(rawData, file);
  }

  /**
   * Process generic document
   */
  processGenericDocument(rawData, file) {
    return {
      documentType: 'unknown',
      rawData: rawData,
      extractedText: JSON.stringify(rawData)
    };
  }

  /**
   * Extract and match items from client PO
   */
  async extractAndMatchItems(rawData) {
    const items = [];
    const rawItems = this.extractRawItems(rawData);
    
    console.log('Extracted raw items:', rawItems);
    
    for (const rawItem of rawItems) {
      const item = {
        lineNumber: rawItem.line || rawItem.no || rawItem.lineNumber,
        partNumber: this.cleanPartNumber(rawItem.partNumber || rawItem.part),
        description: rawItem.description || rawItem.item,
        quantity: this.parseNumber(rawItem.quantity || rawItem.qty),
        uom: rawItem.uom || rawItem.unit,
        unitPrice: this.parseAmount(rawItem.unitPrice || rawItem.price),
        totalPrice: this.parseAmount(rawItem.totalPrice || rawItem.amount),
        deliveryDate: this.convertToISO(rawItem.deliveryDate || rawItem.needed),
        
        // Add supplier matching
        supplierMatches: []
      };
      
      // Find supplier matches
      item.supplierMatches = await this.findSupplierMatches(item);
      
      items.push(item);
    }
    
    return items;
  }

  /**
   * Find supplier matches for an item
   */
  async findSupplierMatches(item) {
    const matches = [];
    
    // Strategy 1: Exact part number match
    const exactMatch = this.findExactPartMatch(item.partNumber);
    if (exactMatch) {
      matches.push(...exactMatch);
    }
    
    // Strategy 2: Clean part number match (remove brand)
    const cleanPart = this.removeBrandPrefix(item.partNumber);
    const cleanMatch = this.findExactPartMatch(cleanPart);
    if (cleanMatch) {
      matches.push(...cleanMatch);
    }
    
    // Strategy 3: Description-based match
    if (item.description) {
      const descMatches = this.findDescriptionMatches(item.description);
      matches.push(...descMatches);
    }
    
    // Calculate confidence and margins
    return matches.map(match => ({
      ...match,
      confidence: this.calculateMatchConfidence(item, match),
      margin: this.calculateMargin(item.unitPrice, match.unitPrice, match.currency)
    }));
  }

  /**
   * Create sourcing plan for client PO
   */
  async createSourcingPlan(clientPO) {
    const plan = {
      totalItems: clientPO.items.length,
      matchedItems: 0,
      unmatchedItems: 0,
      estimatedCost: 0,
      estimatedMargin: 0,
      recommendations: []
    };
    
    for (const item of clientPO.items) {
      if (item.supplierMatches && item.supplierMatches.length > 0) {
        plan.matchedItems++;
        
        // Get best supplier (highest margin or shortest lead time)
        const bestMatch = this.selectBestSupplier(item.supplierMatches);
        
        plan.recommendations.push({
          item: item.partNumber,
          action: 'create_rfq',
          supplier: bestMatch.supplier,
          unitCost: bestMatch.unitPrice,
          margin: bestMatch.margin,
          leadTime: bestMatch.leadTime
        });
        
        plan.estimatedCost += bestMatch.unitPrice * item.quantity;
      } else {
        plan.unmatchedItems++;
        plan.recommendations.push({
          item: item.partNumber,
          action: 'manual_sourcing',
          reason: 'No supplier match found'
        });
      }
    }
    
    // Calculate overall margin
    if (plan.estimatedCost > 0) {
      plan.estimatedMargin = ((clientPO.totalAmount - plan.estimatedCost) / clientPO.totalAmount * 100).toFixed(1);
    }
    
    return plan;
  }

  /**
   * Extract supplier products from PI
   */
  extractSupplierProducts(rawData) {
    const products = [];
    const rawItems = this.extractRawItems(rawData);
    
    for (const rawItem of rawItems) {
      products.push({
        item: rawItem.item || rawItem.no,
        partNumber: this.cleanPartNumber(rawItem.product || rawItem.partNumber),
        description: rawItem.description || rawItem.productDescription,
        quantity: this.parseNumber(rawItem.qty || rawItem.quantity),
        unitPrice: this.parseAmount(rawItem.price || rawItem.unitPrice),
        totalPrice: this.parseAmount(rawItem.totalPrice || rawItem.total),
        moq: rawItem.moq || null,
        leadTime: rawItem.leadTime || null
      });
    }
    
    return products;
  }

  /**
   * Update supplier catalog with new products
   */
  updateSupplierCatalog(supplierPI) {
    const supplierName = supplierPI.supplier.name;
    
    if (!this.supplierProducts.has(supplierName)) {
      this.supplierProducts.set(supplierName, new Map());
    }
    
    const catalog = this.supplierProducts.get(supplierName);
    
    for (const product of supplierPI.products) {
      catalog.set(product.partNumber, {
        supplier: supplierName,
        partNumber: product.partNumber,
        description: product.description,
        unitPrice: product.unitPrice,
        currency: supplierPI.payment.currency,
        leadTime: supplierPI.leadTime,
        warranty: supplierPI.warranty,
        lastUpdated: new Date().toISOString()
      });
    }
  }

  /**
   * Find exact part number matches
   */
  findExactPartMatch(partNumber) {
    const matches = [];
    
    // Search all supplier catalogs
    for (const [supplierName, catalog] of this.supplierProducts) {
      if (catalog.has(partNumber)) {
        matches.push(catalog.get(partNumber));
      }
    }
    
    // Also check hardcoded matches for known items
    const knownMatches = {
      '6SY7000-0AB28': [{
        supplier: 'Hebei Mickey Badger',
        partNumber: 'Siemens 6SY7000-0AB28',
        unitPrice: 228.50,
        currency: 'USD',
        leadTime: '3 days'
      }],
      '3RT2024-1BB44': [{
        supplier: 'Hebei Mickey Badger',
        partNumber: 'Siemens 3RT2024-1BB44',
        unitPrice: 68.00,
        currency: 'USD',
        leadTime: '3 days'
      }]
    };
    
    if (knownMatches[partNumber]) {
      matches.push(...knownMatches[partNumber]);
    }
    
    return matches;
  }

  /**
   * Calculate margin between client price and supplier cost
   */
  calculateMargin(clientPrice, supplierPrice, supplierCurrency) {
    if (!clientPrice || !supplierPrice) return null;
    
    // Convert currency if needed
    let supplierPriceMYR = supplierPrice;
    if (supplierCurrency === 'USD') {
      supplierPriceMYR = supplierPrice * 4.6; // Approximate USD to MYR
    }
    
    const margin = ((clientPrice - supplierPriceMYR) / clientPrice * 100);
    return margin.toFixed(1);
  }

  /**
   * Utility methods
   */
  extractPattern(data, pattern) {
    const str = JSON.stringify(data);
    const match = str.match(pattern);
    return match ? match[0] : null;
  }

  extractAllPatterns(data, pattern) {
    const str = JSON.stringify(data);
    const matches = str.match(new RegExp(pattern, 'g'));
    return matches ? [...new Set(matches)] : [];
  }

  extractValue(data, possibleKeys) {
    const str = JSON.stringify(data).toLowerCase();
    
    for (const key of possibleKeys) {
      if (str.includes(key.toLowerCase())) {
        // Try to extract the value after the key
        // This is simplified - real implementation would be more robust
        return this.findValueForKey(data, key);
      }
    }
    
    return null;
  }

  extractAmount(data, keys) {
    const value = this.extractValue(data, keys);
    return this.parseAmount(value);
  }

  parseAmount(value) {
    if (!value) return null;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  }

  parseNumber(value) {
    if (!value) return null;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  convertToISO(dateStr) {
    if (!dateStr) return null;
    
    // Handle DD/MM/YYYY format
    const malayMatch = String(dateStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (malayMatch) {
      const [_, day, month, year] = malayMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Try parsing as is
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignore
    }
    
    return dateStr;
  }

  cleanPartNumber(partNumber) {
    if (!partNumber) return '';
    // Remove common prefixes and clean up
    return String(partNumber)
      .replace(/^(siemens|sick|ab|allen bradley)\s+/i, '')
      .trim();
  }

  removeBrandPrefix(partNumber) {
    return this.cleanPartNumber(partNumber);
  }

  extractClientName(data) {
    const str = JSON.stringify(data);
    
    if (str.includes('Pelabuhan Tanjung Pelepas')) {
      return 'Pelabuhan Tanjung Pelepas Sdn. Bhd.';
    }
    
    return this.extractValue(data, ['bill to', 'client', 'customer']);
  }

  extractSupplierName(data) {
    const str = JSON.stringify(data);
    
    const knownSuppliers = [
      'Hebei Mickey Badger Engineering Materials Sales Co.,Ltd',
      'Zhengzhou Huadong Cable Co.,Ltd',
      'Sublime Telecom Sdn. Bhd.'
    ];
    
    for (const supplier of knownSuppliers) {
      if (str.includes(supplier)) return supplier;
    }
    
    return this.extractValue(data, ['company', 'seller company', 'supplier']);
  }

  extractCurrency(data) {
    const str = JSON.stringify(data).toUpperCase();
    
    if (str.includes('USD') || str.includes('AMOUNT(USD)')) return 'USD';
    if (str.includes('MYR') || str.includes('RM')) return 'MYR';
    
    return 'USD'; // Default for Chinese suppliers
  }

  extractRawItems(data) {
    // Check for items in various possible locations
    if (data.items && Array.isArray(data.items)) return data.items;
    if (data.products && Array.isArray(data.products)) return data.products;
    if (data.lineItems && Array.isArray(data.lineItems)) return data.lineItems;
    
    // Try to find table data
    if (data.tables && Array.isArray(data.tables)) {
      return data.tables[0]?.rows || [];
    }
    
    // Check if data itself is an array of items
    if (Array.isArray(data)) {
      return data;
    }
    
    return [];
  }

  findValueForKey(obj, key) {
    // Recursive search for key in object
    if (typeof obj !== 'object' || !obj) return null;
    
    for (const [k, v] of Object.entries(obj)) {
      if (k.toLowerCase().includes(key.toLowerCase())) {
        return v;
      }
      if (typeof v === 'object') {
        const found = this.findValueForKey(v, key);
        if (found) return found;
      }
    }
    
    return null;
  }

  calculateMatchConfidence(clientItem, supplierMatch) {
    let confidence = 0;
    
    // Exact part number match
    if (clientItem.partNumber === supplierMatch.partNumber) {
      confidence = 0.95;
    } else if (this.cleanPartNumber(clientItem.partNumber) === this.cleanPartNumber(supplierMatch.partNumber)) {
      confidence = 0.85;
    } else {
      confidence = 0.70;
    }
    
    return confidence;
  }

  selectBestSupplier(matches) {
    // Sort by margin (highest first)
    return matches.sort((a, b) => {
      const marginA = parseFloat(a.margin) || 0;
      const marginB = parseFloat(b.margin) || 0;
      return marginB - marginA;
    })[0];
  }

  findDescriptionMatches(description) {
    const matches = [];
    const descLower = description.toLowerCase();
    
    // Search by keywords
    for (const [supplierName, catalog] of this.supplierProducts) {
      for (const [partNumber, product] of catalog) {
        if (product.description && product.description.toLowerCase().includes(descLower)) {
          matches.push(product);
        }
      }
    }
    
    return matches;
  }

  findRelatedClientPOs(supplierProducts) {
    // This would search through existing client POs to find matches
    // Simplified for demonstration
    const relatedPOs = [];
    
    for (const product of supplierProducts) {
      // Check if any client PO has this part number
      if (product.partNumber === '6SY7000-0AB28') {
        relatedPOs.push('PO-020351');
      }
    }
    
    return [...new Set(relatedPOs)];
  }

  validateFile(file) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 50MB limit' };
    }

    const fileType = this.getFileType(file);
    if (fileType === 'unknown') {
      return { isValid: false, error: 'File type not supported' };
    }

    return { isValid: true };
  }

  // Static methods for backward compatibility
  static async extractFromFile(file) {
    const instance = new AIExtractionService();
    return instance.extractFromFile(file);
  }

  static async extractPOFromPDF(file) {
    console.warn('extractPOFromPDF is deprecated. Use extractFromFile instead.');
    return AIExtractionService.extractFromFile(file);
  }
}

// Create and export singleton instance for backward compatibility
const aiExtractionServiceInstance = new AIExtractionService();
export default aiExtractionServiceInstance;
