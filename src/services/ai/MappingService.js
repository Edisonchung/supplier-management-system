// src/services/ai/MappingService.js
// Handle field mapping and data transformation

import { FIELD_MAPPINGS, ITEM_FIELD_MAPPINGS } from './config';
import { CacheService } from './CacheService';
import { fuzzyMatch, levenshteinDistance } from './utils/fuzzyMatch';
import { parseNumber, formatCurrency } from './utils/numberParser';
import { normalizeDate, isValidDate } from './utils/dateUtils';

export class MappingService {
  /**
   * Intelligently map raw extracted data to our schema
   */
  static async intelligentFieldMapping(rawData) {
    const mappedData = {};

    // Apply standard field mappings
    for (const [targetField, variations] of Object.entries(FIELD_MAPPINGS)) {
      const value = this.findFieldValue(rawData, variations);
      if (value !== null && value !== undefined) {
        mappedData[targetField] = value;
      }
    }

    // Apply learned corrections
    for (const [field, value] of Object.entries(mappedData)) {
      const correction = CacheService.getCorrection(field, value);
      if (correction) {
        console.log(`Applied learned correction for ${field}: ${value} → ${correction}`);
        mappedData[field] = correction;
      }
    }

    // Process nested objects
    if (rawData.shippingAddress || rawData.shipping_address || rawData['ship to']) {
      mappedData.shippingAddress = this.extractAddress(rawData, 'shipping');
    }

    if (rawData.billingAddress || rawData.billing_address || rawData['bill to']) {
      mappedData.billingAddress = this.extractAddress(rawData, 'billing');
    }

    // Process items/line items
    mappedData.items = this.extractItems(rawData);

    // Calculate totals if not provided
    if (!mappedData.totalAmount && mappedData.items?.length > 0) {
      mappedData.totalAmount = mappedData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }

    // Ensure dates are properly formatted
    if (mappedData.orderDate) {
      mappedData.orderDate = this.normalizeDate(mappedData.orderDate);
    }
    if (mappedData.deliveryDate) {
      mappedData.deliveryDate = this.normalizeDate(mappedData.deliveryDate);
    }

    // Set default values for missing fields
    mappedData.currency = mappedData.currency || 'MYR';
    mappedData.paymentTerms = mappedData.paymentTerms || '30D';

    return mappedData;
  }

  /**
   * Find field value using multiple variations
   */
  static findFieldValue(data, variations) {
    // Direct match
    for (const variation of variations) {
      if (data[variation] !== undefined && data[variation] !== null) {
        return data[variation];
      }
    }

    // Case-insensitive match
    const dataKeys = Object.keys(data);
    for (const variation of variations) {
      const key = dataKeys.find(k => 
        k.toLowerCase() === variation.toLowerCase()
      );
      if (key && data[key] !== undefined && data[key] !== null) {
        return data[key];
      }
    }

    // Partial match
    for (const variation of variations) {
      const key = dataKeys.find(k => 
        k.toLowerCase().includes(variation.toLowerCase()) ||
        variation.toLowerCase().includes(k.toLowerCase())
      );
      if (key && data[key] !== undefined && data[key] !== null) {
        return data[key];
      }
    }

    // Check nested objects
    for (const key of dataKeys) {
      if (typeof data[key] === 'object' && data[key] !== null && !Array.isArray(data[key])) {
        const nestedValue = this.findFieldValue(data[key], variations);
        if (nestedValue !== null) {
          return nestedValue;
        }
      }
    }

    return null;
  }

  /**
   * Extract items from various formats
   */
  static extractItems(data) {
    // Check for items in various locations
    const itemsArray = data.items || data.lineItems || data.products || 
                      data.line_items || data['line items'] || data.details || [];

    // If it's not an array, try to extract from table structure
    if (!Array.isArray(itemsArray)) {
      if (data.table || data.itemTable) {
        return this.extractItemsFromTable(data.table || data.itemTable);
      }
      return [];
    }

    // Map items to our schema
    return itemsArray.map((item, index) => {
      const mappedItem = {
        id: item.id || `item-${Date.now()}-${index}`,
        productName: '',
        productCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        description: ''
      };

      // Map fields for each item
      for (const [targetField, variations] of Object.entries(ITEM_FIELD_MAPPINGS)) {
        const value = this.findFieldValue(item, variations);
        if (value !== null && value !== undefined) {
          mappedItem[targetField] = value;
        }
      }

      // Parse numeric values
      mappedItem.quantity = this.parseNumber(mappedItem.quantity) || 1;
      mappedItem.unitPrice = this.parseNumber(mappedItem.unitPrice) || 0;
      mappedItem.totalPrice = this.parseNumber(mappedItem.totalPrice) || 
                             (mappedItem.quantity * mappedItem.unitPrice);

      // Ensure product name is filled
      if (!mappedItem.productName) {
        mappedItem.productName = mappedItem.description || 
                                item.name || item.title || 'Unknown Product';
      }

      return mappedItem;
    });
  }

  /**
   * Extract items from table structure
   */
  static extractItemsFromTable(tableData) {
    if (!Array.isArray(tableData)) return [];

    // Skip header row if it exists
    const hasHeader = tableData[0] && typeof tableData[0][0] === 'string' && 
                     tableData[0][0].toLowerCase().includes('product');
    const dataRows = hasHeader ? tableData.slice(1) : tableData;

    return dataRows.map((row, index) => ({
      id: `item-${Date.now()}-${index}`,
      productName: row[0] || row.description || '',
      productCode: row[1] || row.code || '',
      quantity: this.parseNumber(row[2] || row.quantity || 1),
      unitPrice: this.parseNumber(row[3] || row.price || 0),
      totalPrice: this.parseNumber(row[4] || row.total || 0),
      description: row[5] || row.notes || ''
    }));
  }

  /**
   * Extract address information
   */
  static extractAddress(data, type) {
    const addressFields = {
      shipping: ['shippingAddress', 'shipping_address', 'ship to', 'delivery address'],
      billing: ['billingAddress', 'billing_address', 'bill to', 'invoice address']
    };

    const fields = addressFields[type] || [];
    const addressData = this.findFieldValue(data, fields);

    if (typeof addressData === 'string') {
      return addressData;
    }

    if (typeof addressData === 'object' && addressData !== null) {
      // Construct address from parts
      const parts = [
        addressData.line1 || addressData.street || addressData.address1,
        addressData.line2 || addressData.address2,
        addressData.city,
        addressData.state || addressData.province,
        addressData.postalCode || addressData.zip || addressData.postcode,
        addressData.country
      ].filter(Boolean);

      return parts.join(', ');
    }

    return '';
  }

  /**
   * Parse number from various formats
   */
  static parseNumber(value) {
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and spaces
      const cleaned = value.replace(/[^0-9.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    
    return 0;
  }

  /**
   * Normalize date formats
   */
  static normalizeDate(dateValue) {
    if (!dateValue) return '';

    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // Try parsing different formats
        const formats = [
          /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
          /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
          /(\d{4})\/(\d{1,2})\/(\d{1,2})/, // YYYY/MM/DD
          /(\d{1,2})\s+(\w+)\s+(\d{4})/ // DD Month YYYY
        ];

        for (const format of formats) {
          const match = dateValue.match(format);
          if (match) {
            // Convert to Date object based on format
            // This is simplified - you might want more robust parsing
            return this.parseMatchedDate(match);
          }
        }

        return dateValue; // Return original if can't parse
      }

      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date parsing error:', error);
      return dateValue;
    }
  }

  /**
   * Parse matched date from regex
   */
  static parseMatchedDate(match) {
    // Simplified date parsing - enhance as needed
    try {
      const date = new Date(match[0]);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Failed to parse matched date:', error);
    }
    return match[0];
  }

  /**
   * Format currency values
   */
  static formatCurrency(value, currency = 'MYR') {
    const numValue = this.parseNumber(value);
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency
    }).format(numValue);
  }

  /**
   * Apply fuzzy matching for field values
   */
  static fuzzyMatch(input, target, threshold = 0.8) {
    const s1 = input.toLowerCase().trim();
    const s2 = target.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;
    
    // Simple similarity calculation
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    const similarity = (longer.length - editDistance) / longer.length;
    
    return similarity >= threshold;
  }

  /**
   * Calculate Levenshtein distance
   */
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
}
