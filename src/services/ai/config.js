// src/services/ai/config.js
// Configuration and constants

export const AI_CONFIG = {
  MCP_SERVER_URL: import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001',
  TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_HISTORY_SIZE: 100,
  SUPPORTED_FORMATS: ['pdf', 'image', 'excel', 'email'],
};

export const FIELD_MAPPINGS = {
  clientPoNumber: ['po number', 'purchase order', 'po#', 'order number', 'po no', 'p.o. number', 'p.o.#'],
  clientName: ['client', 'customer', 'company', 'buyer', 'bill to', 'customer name', 'client name'],
  supplierName: ['supplier', 'vendor', 'seller', 'from', 'ship from', 'vendor name', 'supplier name'],
  deliveryDate: ['delivery date', 'ship date', 'required date', 'need by', 'delivery by', 'expected date'],
  orderDate: ['order date', 'po date', 'date', 'created date', 'issued date'],
  paymentTerms: ['payment terms', 'terms', 'payment', 'net terms', 'payment conditions'],
  currency: ['currency', 'curr', 'ccy'],
  totalAmount: ['total', 'total amount', 'grand total', 'total value', 'amount'],
  notes: ['notes', 'remarks', 'comments', 'special instructions', 'additional info'],
  shippingAddress: ['shipping address', 'ship to', 'delivery address', 'destination'],
  billingAddress: ['billing address', 'bill to', 'invoice address'],
};

export const ITEM_FIELD_MAPPINGS = {
  productName: ['product', 'item', 'description', 'product name', 'item description', 'name'],
  productCode: ['code', 'sku', 'product code', 'item code', 'part number', 'p/n'],
  quantity: ['quantity', 'qty', 'amount', 'units', 'pcs'],
  unitPrice: ['unit price', 'price', 'rate', 'unit cost', 'price/unit'],
  totalPrice: ['total', 'total price', 'amount', 'line total', 'extended price'],
  description: ['description', 'notes', 'remarks', 'details'],
};

export const MOCK_FALLBACK = {
  enabled: true, // Enable fallback to mock data if AI fails
  confidence: 0.75,
  provider: 'mock',
};
