// src/services/ai/processors/SupplierPIProcessor.js
// Process supplier proforma invoices

import { parseNumber, parseAmount, formatCurrency } from '../utils/numberParser';
import { normalizeDate } from '../utils/dateUtils';

export class SupplierPIProcessor {
  /**
   * Process supplier proforma invoice data
   */
  static async process(rawData, file) {
    console.log('Processing Supplier PI:', file.name);
    
    // Handle nested data structure
    const extractedData = rawData.data || rawData;
    const pi = extractedData.proforma_invoice || extractedData;
    
    const processedData = {
      documentType: 'supplier_proforma',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // PI identification
      piNumber: this.extractPINumber(pi),
      date: normalizeDate(pi.date || pi.invoice_date || pi.issue_date || new Date()),
      validUntil: this.extractValidityDate(pi),
      
      // Supplier details
      supplier: this.extractSupplierInfo(pi),
      
      // Client reference
      clientRef: this.extractClientReference(pi),
      
      // Products/Items
      products: await this.extractProducts(pi),
      
      // Financial details
      subtotal: parseAmount(pi.subtotal || pi.sub_total || 0),
      discount: parseAmount(pi.discount || 0),
      discountPercent: parseNumber(pi.discount_percent || 0),
      shipping: parseAmount(pi.shipping || pi.freight || pi.delivery_charge || pi.shipping_cost || 0),
      tax: parseAmount(pi.tax || pi.gst || pi.vat || 0),
      taxPercent: parseNumber(pi.tax_percent || pi.gst_percent || 0),
      grandTotal: parseAmount(pi.grand_total || pi.total || pi.total_amount || 0),
      
      // Currency and exchange
      currency: pi.currency || 'USD',
      exchangeRate: parseNumber(pi.exchange_rate || 1),
      localCurrency: pi.local_currency || 'MYR',
      localAmount: 0, // Will calculate
      
      // Terms and conditions
      paymentTerms: pi.payment_terms || '30% down payment, 70% before delivery',
      deliveryTerms: pi.delivery_terms || pi.incoterms || 'FOB',
      leadTime: pi.lead_time || pi.delivery_time || '2-3 weeks',
      warranty: pi.warranty || pi.guarantee || '12 months',
      validity: pi.validity || pi.valid_for || '30 days',
      
      // Banking details (for international suppliers)
      bankDetails: this.extractBankDetails(pi),
      
      // Additional info
      notes: pi.notes || pi.remarks || pi.comments || '',
      specialInstructions: pi.special_instructions || pi.instructions || ''
    };
    
    // Validate and calculate totals
    this.validateAndCalculate(processedData);
    
    return processedData;
  }

  /**
   * Extract PI number
   */
  static extractPINumber(data) {
    // Direct fields
    if (data.invoice_number) return data.invoice_number;
    if (data.pi_number) return data.pi_number;
    if (data.proforma_number) return data.proforma_number;
    if (data.quotation_number) return data.quotation_number;
    
    // Pattern matching
    const text = JSON.stringify(data);
    const patterns = [
      /PI-\d{4,}/i,
      /INV-\d{4,}/i,
      /PROF-\d{4,}/i,
      /\d{4}\/PI\/\d+/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    
    return this.generatePINumber();
  }

  /**
   * Extract validity date
   */
  static extractValidityDate(data) {
    // Direct fields
    const validUntil = data.valid_until || 
                      data.expiry_date || 
                      data.validity_date ||
                      data.quote_valid_until;
    
    if (validUntil) {
      return normalizeDate(validUntil);
    }
    
    // Calculate from issue date + validity period
    if (data.date && data.validity) {
      const issueDate = new Date(data.date);
      const validityDays = parseInt(data.validity) || 30;
      issueDate.setDate(issueDate.getDate() + validityDays);
      return normalizeDate(issueDate);
    }
    
    // Default to 30 days from now
    const defaultValid = new Date();
    defaultValid.setDate(defaultValid.getDate() + 30);
    return normalizeDate(defaultValid);
  }

  /**
   * Extract supplier information
   */
  static extractSupplierInfo(data) {
    const supplier = {
      name: '',
      contact: '',
      email: '',
      phone: '',
      address: '',
      country: '',
      website: ''
    };
    
    // Check various supplier field names
    const supplierData = data.supplier || data.seller || data.vendor || {};
    
    supplier.name = supplierData.name || 
                   supplierData.company || 
                   data.supplier_name ||
                   data.seller_name || '';
    
    supplier.contact = supplierData.contact || 
                      supplierData.contact_person ||
                      data.contact_person || '';
    
    supplier.email = supplierData.email || data.supplier_email || '';
    supplier.phone = supplierData.phone || 
                    supplierData.mobile || 
                    supplierData.tel ||
                    data.supplier_phone || '';
    
    supplier.address = supplierData.address || 
                      data.supplier_address || '';
    
    supplier.country = supplierData.country || 
                      data.supplier_country || '';
    
    supplier.website = supplierData.website || 
                      data.supplier_website || '';
    
    return supplier;
  }

  /**
   * Extract client reference
   */
  static extractClientReference(data) {
    const clientRef = {
      name: '',
      poNumber: '',
      rfqNumber: '',
      project: ''
    };
    
    // Check buyer/consignee fields
    const buyer = data.buyer || data.consignee || data.client || {};
    
    clientRef.name = buyer.name || 
                    buyer.company || 
                    data.buyer_name ||
                    data.consignee_name || '';
    
    // Extract reference numbers
    const reference = data.reference || data.your_reference || {};
    
    clientRef.poNumber = reference.po_number || 
                        data.client_po || 
                        data.your_po || '';
    
    clientRef.rfqNumber = reference.rfq_number || 
                         data.rfq || 
                         data.request_number || '';
    
    clientRef.project = reference.project || 
                       data.project_name || '';
    
    // Pattern matching for PO numbers
    if (!clientRef.poNumber) {
      const text = JSON.stringify(data);
      const poPattern = /PO-\d{6}|your\s+po[:\s]+[\w-]+/i;
      const match = text.match(poPattern);
      if (match) {
        clientRef.poNumber = match[0].replace(/your\s+po[:\s]+/i, '');
      }
    }
    
    return clientRef;
  }

  /**
   * Extract products/items
   */
  static async extractProducts(data) {
    const products = [];
    const items = data.items || data.products || data.line_items || [];
    
    for (const item of items) {
      const product = {
        productCode: item.part_number || 
                    item.product_code || 
                    item.item_code || '',
        
        productName: item.description || 
                    item.product_name || 
                    item.item_description || '',
        
        quantity: parseNumber(item.quantity || item.qty || 0),
        uom: item.uom || item.unit || 'PCS',
        
        unitPrice: parseAmount(item.unit_price || item.price || 0),
        totalPrice: parseAmount(item.total_price || item.amount || 0),
        
        leadTime: item.lead_time || item.delivery || '',
        warranty: item.warranty || '',
        
        specifications: item.specifications || item.specs || '',
        brand: item.brand || item.manufacturer || '',
        origin: item.origin || item.country_of_origin || ''
      };
      
      // Calculate total if not provided
      if (!product.totalPrice && product.quantity && product.unitPrice) {
        product.totalPrice = product.quantity * product.unitPrice;
      }
      
      products.push(product);
    }
    
    return products;
  }

  /**
   * Extract bank details
   */
  static extractBankDetails(data) {
    const bank = data.bank || 
                data.bank_details || 
                data.banking_details || 
                data.payment_details || {};
    
    return {
      bankName: bank.name || bank.bank_name || '',
      accountNumber: bank.account_number || bank.account || '',
      accountName: bank.account_name || bank.beneficiary || '',
      swiftCode: bank.swift || bank.swift_code || '',
      iban: bank.iban || '',
      routingNumber: bank.routing || bank.routing_number || '',
      branchName: bank.branch || bank.branch_name || '',
      branchAddress: bank.branch_address || ''
    };
  }

  /**
   * Validate and calculate totals
   */
  static validateAndCalculate(data) {
    // Calculate subtotal from products if not provided
    if (!data.subtotal && data.products.length > 0) {
      data.subtotal = data.products.reduce((sum, product) => {
        return sum + (product.totalPrice || 0);
      }, 0);
    }
    
    // Calculate discount amount if percentage given
    let discountAmount = data.discount;
    if (data.discountPercent && !data.discount) {
      discountAmount = data.subtotal * (data.discountPercent / 100);
      data.discount = discountAmount;
    }
    
    // Calculate tax amount if percentage given
    let taxAmount = data.tax;
    if (data.taxPercent && !data.tax) {
      const taxableAmount = data.subtotal - (discountAmount || 0);
      taxAmount = taxableAmount * (data.taxPercent / 100);
      data.tax = taxAmount;
    }
    
    // Calculate grand total if not provided
    if (!data.grandTotal) {
      data.grandTotal = data.subtotal + 
                       (taxAmount || 0) + 
                       (data.shipping || 0) - 
                       (discountAmount || 0);
    }
    
    // Calculate local currency amount
    if (data.currency !== data.localCurrency && data.exchangeRate) {
      data.localAmount = data.grandTotal * data.exchangeRate;
    } else {
      data.localAmount = data.grandTotal;
    }
  }

  /**
   * Generate PI number
   */
  static generatePINumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PI-${year}${month}-${random}`;
  }
}
