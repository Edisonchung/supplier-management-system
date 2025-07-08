// src/services/ai/DocumentDetector.js
// Detect document types from extracted data

export class DocumentDetector {
  /**
   * Detect document type from raw extracted data
   */
  static detectDocumentType(rawData) {
    const data = rawData.data || rawData;
    const textContent = JSON.stringify(data).toLowerCase();
    
    // Create a scoring system for each document type
    const scores = {
      client_purchase_order: 0,
      supplier_proforma: 0,
      supplier_invoice: 0,
      supplier_quotation: 0,
      delivery_order: 0,
      unknown: 0
    };
    
    // Check for Client Purchase Orders
    if (this.isClientPurchaseOrder(data, textContent)) {
      scores.client_purchase_order += 10;
    }
    
    // Check for Supplier Proforma Invoices
    if (this.isSupplierProforma(data, textContent)) {
      scores.supplier_proforma += 10;
    }
    
    // Check for Supplier Invoices
    if (this.isSupplierInvoice(data, textContent)) {
      scores.supplier_invoice += 10;
    }
    
    // Check for Quotations
    if (this.isQuotation(data, textContent)) {
      scores.supplier_quotation += 10;
    }
    
    // Check for Delivery Orders
    if (this.isDeliveryOrder(data, textContent)) {
      scores.delivery_order += 10;
    }
    
    // Find the type with highest score
    let detectedType = 'unknown';
    let highestScore = 0;
    
    for (const [type, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        detectedType = type;
      }
    }
    
    // Calculate confidence based on score
    const confidence = Math.min(highestScore / 10, 1);
    
    return {
      type: detectedType,
      confidence: confidence,
      scores: scores,
      indicators: this.getIndicators(data, textContent)
    };
  }

  /**
   * Check if document is a client purchase order
   */
  static isClientPurchaseOrder(data, textContent) {
    const indicators = [
      // Direct field checks
      data.purchase_order !== undefined,
      data.po_number !== undefined,
      data.order_number !== undefined,
      
      // Text content checks
      textContent.includes('purchase order'),
      textContent.includes('p.o. number'),
      textContent.includes('buyer:'),
      textContent.includes('bill to:'),
      textContent.includes('ship to:'),
      
      // Client indicators (Flow Solution as buyer)
      textContent.includes('flow solution') && textContent.includes('buyer'),
      textContent.includes('edison flow') && !textContent.includes('supplier'),
      
      // Structure checks
      data.bill_to !== undefined,
      data.ship_to !== undefined,
      data.items && Array.isArray(data.items) && data.items.length > 0
    ];
    
    return indicators.filter(Boolean).length >= 3;
  }

  /**
   * Check if document is a supplier proforma invoice
   */
  static isSupplierProforma(data, textContent) {
    const indicators = [
      // Direct field checks
      data.proforma_invoice !== undefined,
      data.pi_number !== undefined,
      
      // Text content checks
      textContent.includes('proforma'),
      textContent.includes('quotation'),
      textContent.includes('pro forma'),
      textContent.includes('validity'),
      textContent.includes('payment terms'),
      
      // Supplier indicators
      textContent.includes('seller:'),
      textContent.includes('vendor:'),
      textContent.includes('supplier:'),
      
      // Banking info (common in international PIs)
      textContent.includes('bank:'),
      textContent.includes('swift:'),
      textContent.includes('account number:')
    ];
    
    return indicators.filter(Boolean).length >= 3;
  }

  /**
   * Check if document is a supplier invoice
   */
  static isSupplierInvoice(data, textContent) {
    const indicators = [
      // Direct field checks
      data.invoice !== undefined,
      data.invoice_number !== undefined,
      
      // Text content checks
      textContent.includes('invoice') && !textContent.includes('proforma'),
      textContent.includes('tax invoice'),
      textContent.includes('payment due'),
      textContent.includes('invoice date'),
      
      // Financial indicators
      textContent.includes('subtotal'),
      textContent.includes('tax'),
      textContent.includes('total due'),
      
      // Has invoice-specific fields
      data.payment_due_date !== undefined,
      data.invoice_date !== undefined
    ];
    
    return indicators.filter(Boolean).length >= 3;
  }

  /**
   * Check if document is a quotation
   */
  static isQuotation(data, textContent) {
    const indicators = [
      // Text content checks
      textContent.includes('quotation') && !textContent.includes('proforma'),
      textContent.includes('quote'),
      textContent.includes('rfq'),
      textContent.includes('request for quotation'),
      textContent.includes('quote valid'),
      
      // Structure checks
      data.quotation_number !== undefined,
      data.quote_number !== undefined,
      data.validity_period !== undefined
    ];
    
    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Check if document is a delivery order
   */
  static isDeliveryOrder(data, textContent) {
    const indicators = [
      // Text content checks
      textContent.includes('delivery order'),
      textContent.includes('d.o.'),
      textContent.includes('delivery note'),
      textContent.includes('packing list'),
      textContent.includes('shipped'),
      
      // Structure checks
      data.delivery_order_number !== undefined,
      data.do_number !== undefined,
      data.tracking_number !== undefined,
      data.shipment_date !== undefined
    ];
    
    return indicators.filter(Boolean).length >= 2;
  }

  /**
   * Get specific indicators found in the document
   */
  static getIndicators(data, textContent) {
    const found = [];
    
    // Document identifiers
    if (data.po_number || textContent.includes('po number')) found.push('po_number');
    if (data.pi_number || textContent.includes('pi number')) found.push('pi_number');
    if (data.invoice_number || textContent.includes('invoice number')) found.push('invoice_number');
    if (data.quotation_number || textContent.includes('quotation number')) found.push('quotation_number');
    
    // Entity indicators
    if (textContent.includes('buyer:')) found.push('buyer');
    if (textContent.includes('seller:')) found.push('seller');
    if (textContent.includes('supplier:')) found.push('supplier');
    if (textContent.includes('vendor:')) found.push('vendor');
    
    // Document type keywords
    if (textContent.includes('purchase order')) found.push('purchase_order_keyword');
    if (textContent.includes('proforma')) found.push('proforma_keyword');
    if (textContent.includes('invoice')) found.push('invoice_keyword');
    if (textContent.includes('quotation')) found.push('quotation_keyword');
    
    return found;
  }

  /**
   * Get confidence explanation
   */
  static getConfidenceExplanation(result) {
    const explanations = {
      high: 'Strong indicators found for this document type',
      medium: 'Some indicators found, manual verification recommended',
      low: 'Few indicators found, document type uncertain'
    };
    
    if (result.confidence >= 0.8) return explanations.high;
    if (result.confidence >= 0.5) return explanations.medium;
    return explanations.low;
  }
}
