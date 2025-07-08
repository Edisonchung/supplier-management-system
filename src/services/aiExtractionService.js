// src/services/aiExtractionService.js

const MCP_SERVER_URL = import.meta.env.VITE_AI_BACKEND_URL || import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';

export class AIExtractionService {
  // Cache for supplier and product data
  static supplierCache = new Map();
  static productCache = new Map();
  static extractionHistory = [];

  /**
   * Extract data from multiple file formats with document type detection
   */
  static async extractFromFile(file) {
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

      // Get file type
      const fileType = this.getFileType(file);
      
      // Extract raw data based on file type
      let rawData;
      switch (fileType) {
        case 'pdf':
          rawData = await this.extractFromPDF(file);
          break;
        case 'image':
          rawData = await this.extractFromImage(file);
          break;
        case 'excel':
          rawData = await this.extractFromExcel(file);
          break;
        case 'email':
          rawData = await this.extractFromEmail(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Detect document type from extracted data
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
          processedData = await this.processGenericDocument(rawData, file);
      }
      
      // Store in extraction history
      this.extractionHistory.push({
        timestamp: new Date(),
        fileName: file.name,
        extractedData: processedData,
        confidence: docType.confidence
      });
      
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
      console.error('AI Extraction failed:', error);
      return {
        success: false,
        error: error.message || 'Extraction failed',
        data: null
      };
    }
  }

  /**
   * Enhanced PDF extraction (keeping existing method signature for backward compatibility)
   */
  static async extractPOFromPDF(file) {
    console.warn('extractPOFromPDF is deprecated. Use extractFromFile instead.');
    return this.extractFromFile(file);
  }

  /**
   * Extract from PDF files
   */
  static async extractFromPDF(file) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('enhancedMode', 'true');
    formData.append('validateData', 'true');

    const response = await fetch(`${MCP_SERVER_URL}/api/extract-po`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from PDF');
    }

    const result = await response.json();
    return result;
  }

  /**
   * Extract from image files (PNG, JPG, etc.)
   */
  static async extractFromImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ocrMode', 'advanced');

    const response = await fetch(`${MCP_SERVER_URL}/api/extract-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from image');
    }

    const result = await response.json();
    return result;
  }

  /**
   * Extract from Excel files
   */
  static async extractFromExcel(file) {
    const formData = new FormData();
    formData.append('excel', file);

    const response = await fetch(`${MCP_SERVER_URL}/api/extract-excel`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from Excel');
    }

    const result = await response.json();
    return result;
  }

  /**
   * Extract from email files (.eml, .msg)
   */
  static async extractFromEmail(file) {
    const formData = new FormData();
    formData.append('email', file);

    const response = await fetch(`${MCP_SERVER_URL}/api/extract-email`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from email');
    }

    const result = await response.json();
    return result;
  }

  /**
   * Detect document type from extracted data
   */
  static detectDocumentType(rawData) {
    const data = rawData.data || rawData;
    const text = JSON.stringify(data).toLowerCase();
    
    // Check for various document indicators
    if (data.proforma_invoice || text.includes('proforma') || text.includes('quotation')) {
      return { type: 'supplier_proforma', confidence: 0.9 };
    }
    
    if (data.purchase_order || text.includes('purchase order') || text.includes('p.o.')) {
      return { type: 'client_purchase_order', confidence: 0.9 };
    }
    
    if (data.invoice && !text.includes('proforma')) {
      return { type: 'supplier_invoice', confidence: 0.8 };
    }
    
    return { type: 'unknown', confidence: 0.5 };
  }

  /**
   * Process Supplier PI - NEW METHOD
   */
  static async processSupplierPI(rawData, file) {
    console.log('Processing Supplier PI:', file.name);
    
    // Handle nested JSON structure from backend
    let extractedData = rawData.data || rawData;
    
    // Check for nested proforma_invoice object
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
          unitPrice: this.parseNumber(item.unit_price || item.price || 0),
          totalPrice: this.parseNumber(item.total_price || item.total || (item.quantity * item.unit_price) || 0),
          leadTime: item.lead_time || item.delivery_time || '',
          warranty: item.warranty || '',
          notes: item.notes || item.remarks || ''
        })).filter(item => item.productCode || item.productName),
        
        // Financial details
        subtotal: this.parseNumber(pi.subtotal || pi.net_amount || 0),
        discount: this.parseNumber(pi.discount || pi.discount_amount || 0),
        discountPercent: this.parseNumber(pi.discount_percent || 0),
        shipping: this.parseNumber(pi.shipping || pi.freight || pi.delivery_charge || 0),
        tax: this.parseNumber(pi.tax || pi.gst || pi.vat || 0),
        taxPercent: this.parseNumber(pi.tax_percent || pi.gst_percent || pi.vat_percent || 0),
        grandTotal: this.parseNumber(pi.grand_total || pi.total || pi.total_amount || 0),
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
      
      // Validate and add recommendations
      const validatedData = await this.validateExtractedData(processedData);
      const recommendations = await this.getAIRecommendations(validatedData);
      validatedData.recommendations = recommendations;
      
      return validatedData;
    }
    
    // Fallback to processing as generic PI
    return this.processSupplierPIGeneric(rawData, file);
  }

  /**
   * Process Client PO (enhanced from existing)
   */
  static async processClientPO(rawData, file) {
    console.log('Processing Client PO:', file.name);
    
    let extractedData = rawData.data || rawData;
    
    // Apply intelligent field mapping
    const mappedData = await this.intelligentFieldMapping(extractedData);
    
    // Validate extracted data
    const validatedData = await this.validateExtractedData(mappedData);
    
    // Check for duplicates
    const duplicateCheck = await this.checkForDuplicates(validatedData);
    if (duplicateCheck.isDuplicate) {
      validatedData.warnings = validatedData.warnings || [];
      validatedData.warnings.push({
        type: 'duplicate',
        message: `Similar PO found: ${duplicateCheck.similarPO.poNumber}`,
        similarPO: duplicateCheck.similarPO
      });
    }
    
    // Get AI recommendations
    const recommendations = await this.getAIRecommendations(validatedData);
    validatedData.recommendations = recommendations;
    
    validatedData.documentType = 'client_purchase_order';
    
    return validatedData;
  }

  /**
   * Process Supplier Invoice
   */
  static processSupplierInvoice(rawData, file) {
    // Similar to proforma but for actual invoices
    const processedData = this.processSupplierPI(rawData, file);
    processedData.documentType = 'supplier_invoice';
    return processedData;
  }

  /**
   * Process generic document
   */
  static async processGenericDocument(rawData, file) {
    const mappedData = await this.intelligentFieldMapping(rawData);
    const validatedData = await this.validateExtractedData(mappedData);
    
    return {
      documentType: 'unknown',
      ...validatedData,
      rawData: rawData,
      extractedText: JSON.stringify(rawData)
    };
  }

  /**
   * Intelligent field mapping using AI (existing method enhanced)
   */
  static async intelligentFieldMapping(rawData) {
    // Check if it's already processed
    if (rawData.proforma_invoice || rawData.purchase_order) {
      return rawData;
    }

    // Load field mapping rules
    const mappingRules = await this.getFieldMappingRules();
    
    // Apply AI-powered field detection
    const mappedData = {
      clientPoNumber: this.findField(rawData, ['po number', 'purchase order', 'po#', 'order number']),
      clientName: this.findField(rawData, ['client', 'customer', 'company', 'buyer']),
      clientContact: this.findField(rawData, ['contact', 'contact person', 'attn']),
      clientEmail: this.findField(rawData, ['email', 'e-mail', 'mail']),
      clientPhone: this.findField(rawData, ['phone', 'tel', 'telephone', 'mobile']),
      orderDate: this.findDateField(rawData, ['order date', 'po date', 'date']),
      requiredDate: this.findDateField(rawData, ['required date', 'delivery date', 'ship date']),
      items: this.extractItems(rawData),
      paymentTerms: this.findField(rawData, ['payment terms', 'payment', 'terms']),
      deliveryTerms: this.findField(rawData, ['delivery terms', 'shipping terms', 'incoterms']),
    };

    // Apply learned corrections from history
    return this.applyLearnedCorrections(mappedData);
  }

  /**
   * Validate extracted data with error correction (existing method maintained)
   */
  static async validateExtractedData(data) {
    const errors = [];
    const warnings = [];
    const corrections = {};

    // Validate email format
    if (data.clientEmail && !this.isValidEmail(data.clientEmail)) {
      const correctedEmail = this.correctEmail(data.clientEmail);
      if (correctedEmail) {
        corrections.clientEmail = correctedEmail;
        warnings.push({
          field: 'clientEmail',
          original: data.clientEmail,
          corrected: correctedEmail,
          message: 'Email format corrected'
        });
      } else {
        errors.push({
          field: 'clientEmail',
          message: 'Invalid email format'
        });
      }
    }

    // Validate phone format
    if (data.clientPhone) {
      const correctedPhone = this.correctPhoneNumber(data.clientPhone);
      if (correctedPhone !== data.clientPhone) {
        corrections.clientPhone = correctedPhone;
        warnings.push({
          field: 'clientPhone',
          original: data.clientPhone,
          corrected: correctedPhone,
          message: 'Phone format standardized'
        });
      }
    }

    // Validate dates
    if (data.orderDate && !this.isValidDate(data.orderDate)) {
      const correctedDate = this.correctDate(data.orderDate);
      if (correctedDate) {
        corrections.orderDate = correctedDate;
        warnings.push({
          field: 'orderDate',
          original: data.orderDate,
          corrected: correctedDate,
          message: 'Date format corrected'
        });
      }
    }

    // Validate items
    if (data.items && data.items.length > 0) {
      data.items = data.items.map((item, index) => {
        const validatedItem = { ...item };
        
        // Ensure numeric values
        validatedItem.quantity = this.parseNumber(item.quantity) || 1;
        validatedItem.unitPrice = this.parseNumber(item.unitPrice) || 0;
        validatedItem.totalPrice = validatedItem.quantity * validatedItem.unitPrice;
        
        // Check if calculated total matches extracted total
        if (item.totalPrice) {
          const extractedTotal = this.parseNumber(item.totalPrice);
          if (Math.abs(extractedTotal - validatedItem.totalPrice) > 0.01) {
            warnings.push({
              field: `items[${index}].totalPrice`,
              message: `Total price mismatch. Extracted: ${extractedTotal}, Calculated: ${validatedItem.totalPrice}`,
              calculated: validatedItem.totalPrice,
              extracted: extractedTotal
            });
          }
        }
        
        return validatedItem;
      });
    }

    // Validate products for PI documents
    if (data.products && data.products.length > 0) {
      data.products = data.products.map((product, index) => {
        const validatedProduct = { ...product };
        
        validatedProduct.quantity = this.parseNumber(product.quantity) || 1;
        validatedProduct.unitPrice = this.parseNumber(product.unitPrice) || 0;
        validatedProduct.totalPrice = validatedProduct.quantity * validatedProduct.unitPrice;
        
        return validatedProduct;
      });
    }

    // Apply corrections
    const validatedData = { ...data, ...corrections };
    
    // Add metadata
    validatedData._validation = {
      errors,
      warnings,
      corrections: Object.keys(corrections).length > 0 ? corrections : null,
      validatedAt: new Date().toISOString()
    };

    return validatedData;
  }

  /**
   * Check for duplicate POs (existing method maintained)
   */
  static async checkForDuplicates(data) {
    try {
      // Get existing POs from localStorage
      const existingPOs = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      
      // Check for exact PO number match
      const exactMatch = existingPOs.find(po => 
        po.clientPoNumber === data.clientPoNumber && po.status !== 'cancelled'
      );
      
      if (exactMatch) {
        return {
          isDuplicate: true,
          type: 'exact',
          similarPO: exactMatch
        };
      }
      
      // Check for similar POs using fuzzy matching
      const similarPOs = existingPOs.filter(po => {
        if (po.status === 'cancelled') return false;
        
        // Calculate similarity score
        let score = 0;
        
        // Same client
        if (this.fuzzyMatch(po.clientName, data.clientName) > 0.8) score += 30;
        
        // Similar date (within 7 days)
        if (this.dateDifference(po.orderDate, data.orderDate) < 7) score += 20;
        
        // Similar items
        const itemSimilarity = this.calculateItemSimilarity(po.items || [], data.items || []);
        score += itemSimilarity * 30;
        
        // Similar total amount (within 5%)
        const poTotal = this.calculateTotal(po.items || []);
        const dataTotal = this.calculateTotal(data.items || []);
        if (Math.abs(poTotal - dataTotal) / poTotal < 0.05) score += 20;
        
        return score > 70; // 70% similarity threshold
      });
      
      if (similarPOs.length > 0) {
        return {
          isDuplicate: true,
          type: 'similar',
          similarPO: similarPOs[0],
          similarityScore: this.calculateSimilarityScore(similarPOs[0], data)
        };
      }
      
      return { isDuplicate: false };
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Get AI-powered recommendations (existing method maintained)
   */
  static async getAIRecommendations(data) {
    const recommendations = [];
    
    try {
      // Price optimization
      const priceRecommendations = await this.getPriceOptimization(data.items || data.products || []);
      if (priceRecommendations.length > 0) {
        recommendations.push({
          type: 'price_optimization',
          title: 'Price Optimization Opportunities',
          items: priceRecommendations
        });
      }
      
      // Supplier recommendations
      const supplierRecs = await this.getSupplierRecommendations(data);
      if (supplierRecs.length > 0) {
        recommendations.push({
          type: 'supplier_recommendation',
          title: 'Recommended Suppliers',
          suppliers: supplierRecs
        });
      }
      
      // Inventory insights
      const inventoryInsights = await this.getInventoryInsights(data.items || data.products || []);
      if (inventoryInsights.length > 0) {
        recommendations.push({
          type: 'inventory_insight',
          title: 'Inventory Insights',
          insights: inventoryInsights
        });
      }
      
      // Payment terms optimization
      const paymentRecs = this.getPaymentTermsRecommendation(data.paymentTerms);
      if (paymentRecs) {
        recommendations.push({
          type: 'payment_terms',
          title: 'Payment Terms Suggestion',
          suggestion: paymentRecs
        });
      }
      
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
    }
    
    return recommendations;
  }

  /**
   * Price optimization analysis (existing method maintained)
   */
  static async getPriceOptimization(items) {
    const recommendations = [];
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    for (const item of items) {
      // Find product in inventory
      const product = products.find(p => 
        this.fuzzyMatch(p.name, item.productName) > 0.8 ||
        p.code === item.productCode
      );
      
      if (product) {
        // Check historical prices
        const priceHistory = this.getPriceHistory(product.id);
        const avgPrice = priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length;
        const currentPrice = item.unitPrice;
        
        if (currentPrice > avgPrice * 1.1) { // 10% higher than average
          recommendations.push({
            product: item.productName,
            currentPrice,
            averagePrice: avgPrice,
            potentialSaving: currentPrice - avgPrice,
            message: `Price is ${Math.round((currentPrice / avgPrice - 1) * 100)}% higher than average`
          });
        }
      }
    }
    
    return recommendations;
  }

  /**
   * Get supplier recommendations based on product categories (existing method maintained)
   */
  static async getSupplierRecommendations(data) {
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    const recommendations = [];
    
    // Analyze product categories
    const categories = this.extractProductCategories(data.items || data.products || []);
    
    // Find suppliers specializing in these categories
    const relevantSuppliers = suppliers.filter(supplier => {
      if (supplier.status !== 'active') return false;
      
      // Check if supplier handles these categories
      const supplierCategories = supplier.categories || [];
      return categories.some(cat => supplierCategories.includes(cat));
    });
    
    // Rank suppliers
    const rankedSuppliers = relevantSuppliers.map(supplier => {
      let score = 0;
      
      // Rating score
      score += (supplier.rating || 0) * 20;
      
      // Price competitiveness (mock calculation)
      score += Math.random() * 30;
      
      // Delivery performance (mock)
      score += Math.random() * 25;
      
      // Payment terms flexibility
      if (supplier.paymentTerms && supplier.paymentTerms.includes('60')) score += 25;
      
      return {
        ...supplier,
        recommendationScore: score,
        reasons: this.getSupplierRecommendationReasons(supplier, data)
      };
    }).sort((a, b) => b.recommendationScore - a.recommendationScore);
    
    return rankedSuppliers.slice(0, 3); // Top 3 suppliers
  }

  /**
   * Get inventory insights (existing method maintained)
   */
  static async getInventoryInsights(items) {
    const insights = [];
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    for (const item of items) {
      const product = products.find(p => 
        p.name === item.productName || p.code === item.productCode
      );
      
      if (product) {
        // Check stock levels
        if (product.stockQuantity < item.quantity) {
          insights.push({
            type: 'low_stock',
            product: item.productName,
            requested: item.quantity,
            available: product.stockQuantity,
            message: `Insufficient stock. Need to order ${item.quantity - product.stockQuantity} more units`
          });
        }
        
        // Check reorder point
        if (product.stockQuantity - item.quantity <= (product.reorderPoint || 10)) {
          insights.push({
            type: 'reorder_alert',
            product: item.productName,
            afterOrder: product.stockQuantity - item.quantity,
            reorderPoint: product.reorderPoint || 10,
            message: 'Stock will reach reorder point after this order'
          });
        }
      }
    }
    
    return insights;
  }

  /**
   * Auto-categorize products and suppliers (existing method maintained)
   */
  static async autoCategorize(data) {
    const categories = {
      products: [],
      supplier: null
    };
    
    // Categorize products using AI patterns
    if (data.items || data.products) {
      const items = data.items || data.products;
      for (const item of items) {
        const category = await this.detectProductCategory(item.productName);
        categories.products.push({
          product: item.productName,
          category,
          confidence: 0.85
        });
      }
    }
    
    // Categorize supplier
    if (data.clientName || data.supplier?.name) {
      categories.supplier = await this.detectSupplierCategory(data.clientName || data.supplier?.name);
    }
    
    return categories;
  }

  // New helper methods for PI extraction
  static generatePINumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PI-${year}${month}-${random}`;
  }

  static cleanText(text) {
    if (!text) return '';
    return String(text).trim().replace(/\s+/g, ' ');
  }

  static calculateTotal(data) {
    const products = data.products || data.items || [];
    const subtotal = products.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const discountAmount = data.discountPercent ? subtotal * (data.discountPercent / 100) : data.discount || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = data.taxPercent ? taxableAmount * (data.taxPercent / 100) : data.tax || 0;
    return taxableAmount + taxAmount + (data.shipping || 0);
  }

  static extractPattern(data, pattern) {
    const text = JSON.stringify(data);
    const match = text.match(pattern);
    return match ? match[0] : null;
  }

  static convertToISO(dateString) {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  static processSupplierPIGeneric(rawData, file) {
    console.log('Using generic PI extraction');
    
    return {
      documentType: 'supplier_proforma',
      piNumber: this.generatePINumber(),
      date: new Date().toISOString().split('T')[0],
      supplier: { name: 'Unknown Supplier' },
      products: [],
      grandTotal: 0,
      currency: 'USD',
      paymentTerms: '30% down payment, 70% before delivery',
      notes: 'Extracted using generic method - manual review recommended'
    };
  }

  static validateFile(file) {
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

  // All existing helper methods maintained below...
  static getFileType(file) {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf';
    if (mimeType.includes('image') || /\.(jpg|jpeg|png|gif|bmp)$/.test(fileName)) return 'image';
    if (mimeType.includes('excel') || /\.(xlsx|xls)$/.test(fileName)) return 'excel';
    if (/\.(eml|msg)$/.test(fileName)) return 'email';
    
    return 'unknown';
  }

  static findField(data, fieldNames) {
    for (const fieldName of fieldNames) {
      const value = this.searchInObject(data, fieldName);
      if (value) return value;
    }
    return '';
  }

  static searchInObject(obj, searchTerm) {
    const search = searchTerm.toLowerCase();
    
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes(search)) {
        return value;
      }
      if (typeof value === 'object' && value !== null) {
        const result = this.searchInObject(value, searchTerm);
        if (result) return result;
      }
    }
    
    return null;
  }

  static findDateField(data, fieldNames) {
    const dateStr = this.findField(data, fieldNames);
    return this.parseDate(dateStr);
  }

  static parseDate(dateStr) {
    if (!dateStr) return '';
    
    // Try multiple date formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
      /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
      /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        // Convert to YYYY-MM-DD format
        return this.standardizeDate(match);
      }
    }
    
    // Try parsing with Date object
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return '';
  }

  static standardizeDate(match) {
    // Implementation depends on the format matched
    // This is a simplified version
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }

  static extractItems(data) {
    // Look for arrays that might contain items
    const possibleItemArrays = ['items', 'products', 'lineItems', 'orderItems'];
    
    for (const key of possibleItemArrays) {
      if (data[key] && Array.isArray(data[key])) {
        return data[key].map(item => this.normalizeItem(item));
      }
    }
    
    // If no array found, try to extract from table data
    if (data.table || data.tableData) {
      return this.extractItemsFromTable(data.table || data.tableData);
    }
    
    return [];
  }

  static normalizeItem(item) {
    return {
      productName: item.productName || item.name || item.description || '',
      productCode: item.productCode || item.code || item.sku || '',
      quantity: this.parseNumber(item.quantity || item.qty || 1),
      unitPrice: this.parseNumber(item.unitPrice || item.price || 0),
      totalPrice: this.parseNumber(item.totalPrice || item.total || 0)
    };
  }

  static parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove currency symbols and commas
      const cleaned = value.replace(/[^0-9.-]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static correctEmail(email) {
    // Common corrections
    let corrected = email.trim().toLowerCase();
    
    // Fix common typos
    corrected = corrected
      .replace(/\.con$/i, '.com')
      .replace(/\.cpm$/i, '.com')
      .replace(/\.comm$/i, '.com')
      .replace(/gmial\.com/i, 'gmail.com')
      .replace(/gmai\.com/i, 'gmail.com');
    
    // Add @ if missing but has domain
    if (!corrected.includes('@') && corrected.includes('.')) {
      const parts = corrected.split('.');
      if (parts.length >= 2) {
        const domainPart = parts[parts.length - 2] + '.' + parts[parts.length - 1];
        const namePart = parts.slice(0, -2).join('.');
        corrected = namePart + '@' + domainPart;
      }
    }
    
    return this.isValidEmail(corrected) ? corrected : null;
  }

  static correctPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if missing (assuming Malaysia +60)
    if (cleaned.length === 9 || cleaned.length === 10) {
      cleaned = '60' + cleaned;
    }
    
    // Format as +60 XX-XXXX XXXX
    if (cleaned.startsWith('60') && cleaned.length >= 11) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)}-${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
    }
    
    return phone; // Return original if can't correct
  }

  static isValidDate(dateStr) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr.match(/\d{4}-\d{2}-\d{2}/);
  }

  static correctDate(dateStr) {
    const date = this.parseDate(dateStr);
    return date || null;
  }

  static fuzzyMatch(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // Simple Levenshtein distance-based similarity
    const maxLen = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1, s2);
    
    return 1 - (distance / maxLen);
  }

  static levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  static dateDifference(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  static calculateItemSimilarity(items1, items2) {
    if (!items1.length || !items2.length) return 0;
    
    let matchCount = 0;
    
    for (const item1 of items1) {
      for (const item2 of items2) {
        const nameSimilarity = this.fuzzyMatch(item1.productName, item2.productName);
        const codeSimilarity = item1.productCode === item2.productCode ? 1 : 0;
        
        if (nameSimilarity > 0.8 || codeSimilarity === 1) {
          matchCount++;
          break;
        }
      }
    }
    
    return matchCount / Math.max(items1.length, items2.length);
  }

  static calculateSimilarityScore(po1, po2) {
    let score = 0;
    
    // Client similarity (30%)
    score += this.fuzzyMatch(po1.clientName, po2.clientName) * 30;
    
    // Date similarity (20%)
    const daysDiff = this.dateDifference(po1.orderDate, po2.orderDate);
    score += Math.max(0, 20 - daysDiff);
    
    // Items similarity (30%)
    score += this.calculateItemSimilarity(po1.items || [], po2.items || []) * 30;
    
    // Total amount similarity (20%)
    const total1 = this.calculateTotal(po1.items || []);
    const total2 = this.calculateTotal(po2.items || []);
    const totalDiff = Math.abs(total1 - total2) / Math.max(total1, total2);
    score += (1 - totalDiff) * 20;
    
    return Math.round(score);
  }

  static getPriceHistory(productId) {
    // Mock implementation - in real app, fetch from database
    const history = [];
    const basePrice = Math.random() * 1000 + 500;
    
    for (let i = 0; i < 5; i++) {
      history.push({
        date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
        price: basePrice + (Math.random() - 0.5) * 200
      });
    }
    
    return history;
  }

  static extractProductCategories(items) {
    const categories = new Set();
    
    for (const item of items) {
      const category = this.detectProductCategory(item.productName);
      if (category) categories.add(category);
    }
    
    return Array.from(categories);
  }

  static detectProductCategory(productName) {
    const categoryKeywords = {
      'Electronics': ['thruster', 'power supply', 'sensor', 'controller', 'plc'],
      'Industrial': ['valve', 'pump', 'motor', 'bearing', 'gear'],
      'Safety': ['helmet', 'gloves', 'safety', 'protection'],
      'Tools': ['drill', 'hammer', 'wrench', 'tool'],
      'Materials': ['steel', 'aluminum', 'plastic', 'material'],
    };
    
    const lowerName = productName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'General';
  }

  static getSupplierRecommendationReasons(supplier, data) {
    const reasons = [];
    
    if (supplier.rating >= 4.5) {
      reasons.push('High customer rating');
    }
    
    if (supplier.deliveryPerformance >= 95) {
      reasons.push('Excellent delivery track record');
    }
    
    if (supplier.paymentTerms && supplier.paymentTerms.includes('60')) {
      reasons.push('Flexible payment terms');
    }
    
    if (supplier.specializations && supplier.specializations.length > 0) {
      reasons.push(`Specializes in ${supplier.specializations[0]}`);
    }
    
    return reasons;
  }

  static getPaymentTermsRecommendation(currentTerms) {
    const termsDays = parseInt(currentTerms);
    
    if (termsDays < 30) {
      return {
        current: currentTerms,
        suggested: '30 days',
        reason: 'Standard industry payment terms are 30 days minimum'
      };
    }
    
    if (termsDays > 90) {
      return {
        current: currentTerms,
        suggested: '60 days',
        reason: 'Consider negotiating to 60 days for better cash flow'
      };
    }
    
    return null;
  }

  static detectSupplierCategory(supplierName) {
    // Simple categorization based on name patterns
    const patterns = {
      'Technology': ['tech', 'solution', 'system', 'software'],
      'Industrial': ['industrial', 'machinery', 'equipment'],
      'Trading': ['trading', 'trade', 'import', 'export'],
      'Manufacturing': ['manufacturing', 'sdn bhd', 'factory'],
    };
    
    const lowerName = supplierName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return 'General Supplier';
  }

  static applyLearnedCorrections(data) {
    // Apply corrections learned from user feedback
    const corrections = JSON.parse(localStorage.getItem('aiCorrections') || '{}');
    
    for (const [field, correction] of Object.entries(corrections)) {
      if (data[field] && correction.from === data[field]) {
        data[field] = correction.to;
        data._corrected = data._corrected || [];
        data._corrected.push({
          field,
          from: correction.from,
          to: correction.to,
          reason: 'Applied from learned corrections'
        });
      }
    }
    
    return data;
  }

  static async saveCorrection(field, originalValue, correctedValue) {
    const corrections = JSON.parse(localStorage.getItem('aiCorrections') || '{}');
    
    corrections[field] = {
      from: originalValue,
      to: correctedValue,
      learnedAt: new Date().toISOString()
    };
    
    localStorage.setItem('aiCorrections', JSON.stringify(corrections));
  }

  static getFieldMappingRules() {
    // In a real implementation, this would fetch from a rules engine
    return {
      clientPoNumber: ['po number', 'purchase order', 'po#', 'order number', 'po no'],
      clientName: ['client', 'customer', 'company', 'buyer', 'bill to'],
      // ... more rules
    };
  }

  static extractItemsFromTable(tableData) {
    // Extract items from table structure
    // This is a simplified implementation
    if (!Array.isArray(tableData)) return [];
    
    return tableData.map(row => ({
      productName: row[0] || row.description || '',
      productCode: row[1] || row.code || '',
      quantity: this.parseNumber(row[2] || row.quantity || 1),
      unitPrice: this.parseNumber(row[3] || row.price || 0),
      totalPrice: this.parseNumber(row[4] || row.total || 0)
    }));
  }

  static processExtractedData(data) {
    return this.intelligentFieldMapping(data)
      .then(mapped => this.validateExtractedData(mapped))
      .then(validated => this.checkForDuplicates(validated))
      .then(checked => ({
        ...checked,
        recommendations: this.getAIRecommendations(checked)
      }));
  }
}
