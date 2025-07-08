// src/services/ai/processors/InvoiceProcessor.js
// Process supplier invoices

import { parseNumber, parseAmount } from '../utils/numberParser';
import { normalizeDate } from '../utils/dateUtils';

export class InvoiceProcessor {
  /**
   * Process supplier invoice data
   */
  static async process(rawData, file) {
    console.log('Processing Supplier Invoice:', file.name);
    
    // Handle nested data structure
    const extractedData = rawData.data || rawData;
    const invoice = extractedData.invoice || extractedData;
    
    const processedData = {
      documentType: 'supplier_invoice',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // Invoice identification
      invoiceNumber: this.extractInvoiceNumber(invoice),
      invoiceDate: normalizeDate(invoice.invoice_date || invoice.date || new Date()),
      dueDate: this.extractDueDate(invoice),
      
      // Reference information
      referenceNumbers: {
        poNumber: invoice.po_number || invoice.purchase_order || '',
        piNumber: invoice.pi_number || invoice.proforma_reference || '',
        doNumber: invoice.do_number || invoice.delivery_order || '',
        project: invoice.project || invoice.project_reference || ''
      },
      
      // Supplier details
      supplier: this.extractSupplierInfo(invoice),
      
      // Billing details
      billTo: this.extractBillingInfo(invoice),
      
      // Items/Services
      items: await this.extractInvoiceItems(invoice),
      
      // Financial details
      subtotal: parseAmount(invoice.subtotal || invoice.sub_total || 0),
      discount: parseAmount(invoice.discount || 0),
      discountPercent: parseNumber(invoice.discount_percent || 0),
      shipping: parseAmount(invoice.shipping || invoice.freight || 0),
      tax: parseAmount(invoice.tax || invoice.gst || invoice.vat || 0),
      taxPercent: parseNumber(invoice.tax_percent || invoice.gst_percent || 0),
      totalAmount: parseAmount(invoice.total || invoice.grand_total || invoice.amount_due || 0),
      
      // Payment information
      amountPaid: parseAmount(invoice.amount_paid || invoice.paid || 0),
      balanceDue: parseAmount(invoice.balance_due || invoice.amount_due || 0),
      
      // Currency
      currency: invoice.currency || 'MYR',
      exchangeRate: parseNumber(invoice.exchange_rate || 1),
      
      // Payment details
      paymentTerms: invoice.payment_terms || 'Net 30',
      paymentMethod: invoice.payment_method || '',
      
      // Banking details
      bankDetails: this.extractBankDetails(invoice),
      
      // Additional info
      notes: invoice.notes || invoice.remarks || '',
      internalNotes: invoice.internal_notes || '',
      
      // Status
      status: this.determineInvoiceStatus(invoice),
      isOverdue: false // Will be calculated
    };
    
    // Validate and calculate
    this.validateAndCalculate(processedData);
    
    return processedData;
  }

  /**
   * Extract invoice number
   */
  static extractInvoiceNumber(data) {
    // Direct fields
    if (data.invoice_number) return data.invoice_number;
    if (data.inv_number) return data.inv_number;
    if (data.bill_number) return data.bill_number;
    
    // Pattern matching
    const text = JSON.stringify(data);
    const patterns = [
      /INV-\d{4,}/i,
      /INVOICE\s*#?\s*\d+/i,
      /\d{4}\/INV\/\d+/i,
      /SI-\d{4,}/i // Sales Invoice
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[0];
    }
    
    return this.generateInvoiceNumber();
  }

  /**
   * Extract due date
   */
  static extractDueDate(data) {
    // Direct field
    if (data.due_date || data.payment_due_date) {
      return normalizeDate(data.due_date || data.payment_due_date);
    }
    
    // Calculate from invoice date and payment terms
    if (data.invoice_date && data.payment_terms) {
      const invoiceDate = new Date(data.invoice_date);
      const terms = data.payment_terms.toLowerCase();
      
      let daysToAdd = 0;
      if (terms.includes('net 30')) daysToAdd = 30;
      else if (terms.includes('net 60')) daysToAdd = 60;
      else if (terms.includes('net 90')) daysToAdd = 90;
      else if (terms.includes('due on receipt')) daysToAdd = 0;
      
      invoiceDate.setDate(invoiceDate.getDate() + daysToAdd);
      return normalizeDate(invoiceDate);
    }
    
    // Default to 30 days from invoice date
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 30);
    return normalizeDate(defaultDue);
  }

  /**
   * Extract supplier information
   */
  static extractSupplierInfo(data) {
    const supplier = data.supplier || data.vendor || data.from || {};
    
    return {
      name: supplier.name || supplier.company || data.supplier_name || '',
      address: supplier.address || data.supplier_address || '',
      phone: supplier.phone || supplier.tel || data.supplier_phone || '',
      email: supplier.email || data.supplier_email || '',
      taxId: supplier.tax_id || supplier.gst_no || data.supplier_tax_id || '',
      registrationNo: supplier.registration || supplier.reg_no || ''
    };
  }

  /**
   * Extract billing information
   */
  static extractBillingInfo(data) {
    const billTo = data.bill_to || data.customer || data.client || {};
    
    return {
      name: billTo.name || billTo.company || data.customer_name || '',
      address: billTo.address || data.billing_address || '',
      attention: billTo.attention || billTo.attn || '',
      phone: billTo.phone || '',
      email: billTo.email || '',
      taxId: billTo.tax_id || billTo.gst_no || ''
    };
  }

  /**
   * Extract invoice items
   */
  static async extractInvoiceItems(data) {
    const items = [];
    const rawItems = data.items || data.line_items || data.invoice_items || [];
    
    for (const item of rawItems) {
      const invoiceItem = {
        lineNumber: item.line || item.no || String(items.length + 1),
        description: item.description || item.item_description || '',
        partNumber: item.part_number || item.product_code || '',
        poLineReference: item.po_line || item.po_reference || '',
        quantity: parseNumber(item.quantity || item.qty || 0),
        uom: item.uom || item.unit || '',
        unitPrice: parseAmount(item.unit_price || item.price || 0),
        totalPrice: parseAmount(item.total || item.amount || 0),
        taxRate: parseNumber(item.tax_rate || 0),
        taxAmount: parseAmount(item.tax_amount || 0)
      };
      
      // Calculate total if not provided
      if (!invoiceItem.totalPrice && invoiceItem.quantity && invoiceItem.unitPrice) {
        invoiceItem.totalPrice = invoiceItem.quantity * invoiceItem.unitPrice;
      }
      
      items.push(invoiceItem);
    }
    
    return items;
  }

  /**
   * Extract bank details
   */
  static extractBankDetails(data) {
    const bank = data.bank_details || data.payment_details || data.bank || {};
    
    return {
      bankName: bank.bank_name || bank.name || '',
      accountNumber: bank.account_number || bank.account || '',
      accountName: bank.account_name || bank.beneficiary || '',
      swiftCode: bank.swift || bank.swift_code || '',
      routingNumber: bank.routing || bank.aba || '',
      iban: bank.iban || '',
      reference: bank.reference || bank.payment_reference || ''
    };
  }

  /**
   * Determine invoice status
   */
  static determineInvoiceStatus(data) {
    // Check explicit status field
    if (data.status) {
      return data.status.toLowerCase();
    }
    
    // Determine from payment information
    const total = parseAmount(data.total || data.amount_due || 0);
    const paid = parseAmount(data.amount_paid || data.paid || 0);
    
    if (paid >= total) return 'paid';
    if (paid > 0) return 'partial';
    if (data.cancelled || data.voided) return 'cancelled';
    
    return 'pending';
  }

  /**
   * Validate and calculate totals
   */
  static validateAndCalculate(data) {
    // Calculate subtotal from items if not provided
    if (!data.subtotal && data.items.length > 0) {
      data.subtotal = data.items.reduce((sum, item) => {
        return sum + (item.totalPrice || 0);
      }, 0);
    }
    
    // Calculate discount amount
    let discountAmount = data.discount;
    if (data.discountPercent && !data.discount) {
      discountAmount = data.subtotal * (data.discountPercent / 100);
      data.discount = discountAmount;
    }
    
    // Calculate tax amount
    let taxAmount = data.tax;
    if (data.taxPercent && !data.tax) {
      const taxableAmount = data.subtotal - (discountAmount || 0);
      taxAmount = taxableAmount * (data.taxPercent / 100);
      data.tax = taxAmount;
    }
    
    // Calculate total if not provided
    if (!data.totalAmount) {
      data.totalAmount = data.subtotal + 
                        (taxAmount || 0) + 
                        (data.shipping || 0) - 
                        (discountAmount || 0);
    }
    
    // Calculate balance due
    if (!data.balanceDue) {
      data.balanceDue = data.totalAmount - (data.amountPaid || 0);
    }
    
    // Check if overdue
    if (data.dueDate && data.balanceDue > 0) {
      const dueDate = new Date(data.dueDate);
      const today = new Date();
      data.isOverdue = today > dueDate;
    }
  }

  /**
   * Generate invoice number
   */
  static generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }
}
