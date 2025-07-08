// src/services/ai/processors/ClientPOProcessor.js
// Process client purchase orders

import { parseNumber, parseAmount } from '../utils/numberParser';
import { normalizeDate } from '../utils/dateUtils';
import { safeToLowerCase } from '../utils/safeString';

export class ClientPOProcessor {
  /**
   * Process client purchase order data
   */
  static async process(rawData, file) {
    console.log('Processing client PO:', file.name);
    
    // Handle nested data structure
    const extractedData = rawData.data || rawData;
    const po = extractedData.purchase_order || extractedData;
    
    const processedData = {
      documentType: 'client_purchase_order',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // PO identification
      poNumber: this.extractPONumber(po),
      prNumbers: this.extractPRNumbers(po),
      
      // Client information
      client: this.extractClientInfo(po),
      
      // Dates
      orderDate: normalizeDate(po.order_date || po.date || new Date()),
      deliveryDate: this.extractDeliveryDate(po),
      
      // Items
      items: await this.extractAndProcessItems(po),
      
      // Financial summary
      subtotal: parseAmount(po.subtotal || po.sub_total),
      tax: parseAmount(po.tax || po.gst || 0),
      discount: parseAmount(po.discount || 0),
      shipping: parseAmount(po.shipping || po.freight || 0),
      totalAmount: parseAmount(po.total || po.grand_total || po.total_amount),
      
      // Additional info
      terms: po.terms || po.payment_terms || '',
      notes: po.notes || po.remarks || '',
      status: 'pending'
    };
    
    // Validate and calculate totals if needed
    this.validateAndCalculateTotals(processedData);
    
    // Add supplier matching if enabled
    if (processedData.items.length > 0) {
      processedData.sourcingPlan = await this.createSourcingPlan(processedData);
    }
    
    return processedData;
  }

  /**
   * Extract PO number
   */
  static extractPONumber(data) {
    // Direct fields
    if (data.order_number) return data.order_number;
    if (data.po_number) return data.po_number;
    if (data.purchase_order_number) return data.purchase_order_number;
    
    // Pattern matching
    const text = JSON.stringify(data);
    const poPattern = /PO-\d{6}|PO\d{6}|P\.O\.\s*\d+/i;
    const match = text.match(poPattern);
    
    return match ? match[0] : this.generatePONumber();
  }

  /**
   * Extract PR numbers
   */
  static extractPRNumbers(data) {
    const prNumbers = [];
    
    // Check direct fields
    if (data.pr_numbers && Array.isArray(data.pr_numbers)) {
      return data.pr_numbers;
    }
    
    // Pattern matching
    const text = JSON.stringify(data);
    const prPattern = /PR-\d{6}/g;
    const matches = text.match(prPattern);
    
    if (matches) {
      return [...new Set(matches)]; // Remove duplicates
    }
    
    return prNumbers;
  }

  /**
   * Extract client information
   */
  static extractClientInfo(data) {
    const client = {
      name: '',
      registration: '',
      address: '',
      shipTo: '',
      contact: '',
      email: '',
      phone: ''
    };
    
    // Extract from bill_to section
    if (data.bill_to) {
      client.name = data.bill_to.name || data.bill_to.company || '';
      client.address = data.bill_to.address || '';
      client.registration = data.bill_to.registration || '';
      client.contact = data.bill_to.contact || '';
      client.email = data.bill_to.email || '';
      client.phone = data.bill_to.phone || '';
    }
    
    // Extract from ship_to section
    if (data.ship_to) {
      client.shipTo = data.ship_to.address || '';
      
      // If no client name from bill_to, try ship_to
      if (!client.name) {
        client.name = data.ship_to.name || data.ship_to.company || '';
      }
    }
    
    // Fallback to other fields
    if (!client.name) {
      client.name = data.buyer?.name || data.client?.name || 'Unknown Client';
    }
    
    // Extract registration number pattern
    if (!client.registration) {
      const text = JSON.stringify(data);
      const regPattern = /\d{6}-[A-Z]/;
      const match = text.match(regPattern);
      if (match) client.registration = match[0];
    }
    
    return client;
  }

  /**
   * Extract delivery date
   */
  static extractDeliveryDate(data) {
    // Check items for delivery dates
    if (data.items && data.items.length > 0) {
      const firstItemDelivery = data.items[0].delivery_date || 
                               data.items[0].needed_date ||
                               data.items[0].required_date;
      if (firstItemDelivery) {
        return normalizeDate(firstItemDelivery);
      }
    }
    
    // Check main fields
    const deliveryDate = data.delivery_date || 
                        data.required_date || 
                        data.need_by_date;
    
    return deliveryDate ? normalizeDate(deliveryDate) : '';
  }

  /**
   * Extract and process items
   */
  static async extractAndProcessItems(data) {
  const items = [];
  // OLD: const rawItems = data.items || data.line_items || data.products || [];
  // NEW: Check for products first since that's what the backend returns
  const rawItems = data.products || data.items || data.line_items || [];
  
  for (const rawItem of rawItems) {
    const item = {
      lineNumber: rawItem.line || rawItem.no || rawItem.line_number || String(items.length + 1),
      partNumber: this.cleanPartNumber(rawItem.part_number || rawItem.product_code || ''),
      description: rawItem.description || rawItem.item_description || '',
      quantity: parseNumber(rawItem.quantity || rawItem.qty || 0),
      uom: rawItem.uom || rawItem.unit || 'PCS',
      unitPrice: parseAmount(rawItem.unit_price || rawItem.price || 0),
      totalPrice: parseAmount(rawItem.total_price || rawItem.amount || 0),
      deliveryDate: normalizeDate(rawItem.delivery_date || rawItem.needed || ''),
      prNumber: rawItem.pr_number || '',
      reference: rawItem.reference || '', // Add reference field
      promisedDate: normalizeDate(rawItem.promised_date || ''), // Add promised date
      supplierMatches: []
    };
    
    // Calculate total if not provided
    if (!item.totalPrice && item.quantity && item.unitPrice) {
      item.totalPrice = item.quantity * item.unitPrice;
    }
    
    items.push(item);
  }
  
  return items;
}

  /**
   * Clean part number
   */
  static cleanPartNumber(partNumber) {
    if (!partNumber) return '';
    
    return String(partNumber)
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  /**
   * Validate and calculate totals
   */
  static validateAndCalculateTotals(data) {
    if (!data.items || data.items.length === 0) return;
    
    // Calculate subtotal from items
    const calculatedSubtotal = data.items.reduce((sum, item) => {
      return sum + (item.totalPrice || 0);
    }, 0);
    
    // If no subtotal provided, use calculated
    if (!data.subtotal) {
      data.subtotal = calculatedSubtotal;
    }
    
    // Calculate total if not provided
    if (!data.totalAmount) {
      data.totalAmount = data.subtotal + 
                        (data.tax || 0) + 
                        (data.shipping || 0) - 
                        (data.discount || 0);
    }
  }

  /**
   * Create sourcing plan (placeholder for supplier matching)
   */
  static async createSourcingPlan(data) {
    // This would integrate with SupplierMatcher service
    return {
      recommendedSuppliers: [],
      alternativeSuppliers: [],
      estimatedCost: data.totalAmount,
      estimatedLeadTime: '2-3 weeks',
      confidenceScore: 0.85
    };
  }

  /**
   * Generate PO number
   */
  static generatePONumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}${random}`;
  }
}
