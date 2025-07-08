// src/services/ai/config.js
// Configuration and field mappings for AI extraction
export const AI_CONFIG = {
  MCP_SERVER_URL: import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001',
  TIMEOUT: 60000, // 60 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_HISTORY_SIZE: 100,
  SUPPORTED_FORMATS: ['pdf', 'image', 'excel', 'email'],
};
/**
 * Field mappings for different document types
 * Maps our internal field names to various possible field names in extracted data
 */
export const FIELD_MAPPINGS = {
  // Document identification
  poNumber: ['po_number', 'order_number', 'purchase_order_number', 'po_no', 'p.o.', 'po#'],
  piNumber: ['pi_number', 'invoice_number', 'proforma_number', 'quotation_number', 'quote_no'],
  invoiceNumber: ['invoice_number', 'inv_number', 'invoice_no', 'bill_number'],
  
  // Dates
  orderDate: ['order_date', 'po_date', 'date', 'issue_date', 'created_date'],
  deliveryDate: ['delivery_date', 'required_date', 'need_by', 'ship_date', 'eta'],
  validUntil: ['valid_until', 'expiry_date', 'validity_date', 'quote_valid_until'],
  
  // Client/Buyer fields
  clientName: ['client_name', 'buyer_name', 'customer_name', 'bill_to.name', 'buyer.name'],
  clientAddress: ['client_address', 'buyer_address', 'bill_to.address', 'billing_address'],
  shipTo: ['ship_to', 'delivery_address', 'shipping_address', 'consignee_address'],
  
  // Supplier/Seller fields
  supplierName: ['supplier_name', 'seller_name', 'vendor_name', 'supplier.name', 'seller.company'],
  supplierEmail: ['supplier_email', 'seller_email', 'vendor_email', 'supplier.email'],
  supplierPhone: ['supplier_phone', 'seller_phone', 'vendor_phone', 'supplier.phone'],
  
  // Financial fields
  subtotal: ['subtotal', 'sub_total', 'net_amount', 'amount_before_tax'],
  tax: ['tax', 'gst', 'vat', 'tax_amount', 'total_tax'],
  discount: ['discount', 'discount_amount', 'less_discount'],
  shipping: ['shipping', 'freight', 'delivery_charge', 'shipping_cost'],
  totalAmount: ['total_amount', 'grand_total', 'total', 'invoice_total', 'amount_due'],
  
  // Terms
  paymentTerms: ['payment_terms', 'terms', 'payment_conditions', 'terms_of_payment'],
  deliveryTerms: ['delivery_terms', 'shipping_terms', 'incoterms', 'delivery_conditions'],
  warranty: ['warranty', 'guarantee', 'warranty_period', 'guarantee_period']
};

/**
 * Item/Product field mappings
 */
export const ITEM_FIELD_MAPPINGS = {
  partNumber: ['part_number', 'product_code', 'item_code', 'sku', 'catalog_number'],
  description: ['description', 'item_description', 'product_name', 'item_name', 'details'],
  quantity: ['quantity', 'qty', 'amount', 'units', 'pcs'],
  unitPrice: ['unit_price', 'price', 'rate', 'unit_cost', 'price_per_unit'],
  totalPrice: ['total_price', 'amount', 'line_total', 'extended_price', 'total'],
  uom: ['uom', 'unit', 'unit_of_measure', 'units'],
  deliveryDate: ['delivery_date', 'needed', 'required_date', 'ship_date']
};

/**
 * Document type indicators
 */
export const DOCUMENT_INDICATORS = {
  client_purchase_order: {
    keywords: ['purchase order', 'p.o.', 'buyer:', 'bill to:', 'ship to:'],
    requiredFields: ['items', 'total'],
    confidence: 0.8
  },
  supplier_proforma: {
    keywords: ['proforma', 'quotation', 'quote', 'validity', 'payment terms'],
    requiredFields: ['items', 'total', 'validity'],
    confidence: 0.8
  },
  supplier_invoice: {
    keywords: ['invoice', 'bill', 'payment due', 'invoice date'],
    requiredFields: ['invoice_number', 'items', 'total'],
    confidence: 0.8
  }
};

/**
 * Extraction settings
 */
export const EXTRACTION_SETTINGS = {
  timeout: 120000, // 2 minutes
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: ['pdf', 'image', 'excel', 'email'],
  ocrEnabled: true,
  enhancedMode: true
};

/**
 * Validation rules
 */
export const VALIDATION_RULES = {
  required: {
    client_purchase_order: ['clientName', 'items'],
    supplier_proforma: ['supplierName', 'products', 'grandTotal'],
    supplier_invoice: ['supplierName', 'invoiceNumber', 'items', 'totalAmount']
  },
  dateFormats: [
    'YYYY-MM-DD',
    'MM/DD/YYYY',
    'DD/MM/YYYY',
    'DD-MM-YYYY',
    'YYYY/MM/DD'
  ],
  currencyCodes: ['USD', 'MYR', 'SGD', 'EUR', 'GBP', 'CNY', 'JPY', 'AUD'],
  defaultCurrency: 'MYR'
};

/**
 * Supplier matching configuration
 */
export const MATCHING_CONFIG = {
  fuzzyMatchThreshold: 0.8,
  partNumberMatchWeight: 0.5,
  descriptionMatchWeight: 0.3,
  brandMatchWeight: 0.2,
  minConfidenceScore: 0.6
};

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  maxSize: 1000,
  ttl: 3600000, // 1 hour
  persistToLocalStorage: true,
  cacheKey: 'ai_extraction_cache'
};
