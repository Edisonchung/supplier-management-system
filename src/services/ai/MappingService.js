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
    // Ensure data is an object and variations is an array
    if (!data || typeof data !== 'object' || !Array.isArray(variations)) {
      return null;
    }

    // Direct match
    for (const variation of variations) {
      if (data[variation] !== undefined && data[variation] !== null) {
        return data[variation];
      }
    }

    // Case-insensitive match
    const dataKeys = Object.keys(data);
    for (const variation of variations) {
      // Ensure variation is a string
      if (typeof variation !== 'string') continue;
      
      const key = dataKeys.find(k => {
        // Ensure k is a string before calling toLowerCase
        if (typeof k !== 'string') return false;
        return k.toLowerCase() === variation.toLowerCase();
      });
      
      if (key && data[key] !== undefined && data[key] !== null) {
        return data[key];
      }
    }

    // Partial match
    for (const variation of variations) {
      // Ensure variation is a string
      if (typeof variation !== 'string') continue;
      
      const key = dataKeys.find(k => {
        // Ensure k is a string before calling toLowerCase
        if (typeof k !== 'string') return false;
        const kLower = k.toLowerCase();
        const variationLower = variation.toLowerCase();
        return kLower.includes(variationLower) || variationLower.includes(kLower);
      });
      
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
                      data.line_items || data['line items'] || [];

    if (!Array.isArray(itemsArray)) {
      return [];
    }

    return itemsArray.map((item, index) => {
      const mappedItem = {};

      // Map item fields
      for (const [targetField, variations] of Object.entries(ITEM_FIELD_MAPPINGS)) {
        const value = this.findFieldValue(item, variations);
        if (value !== null && value !== undefined) {
          mappedItem[targetField] = value;
        }
      }

      // Ensure numeric fields are properly parsed
      if (mappedItem.quantity !== undefined) {
        mappedItem.quantity = this.parseNumber(mappedItem.quantity);
      }
      if (mappedItem.unitPrice !== undefined) {
        mappedItem.unitPrice = this.parseNumber(mappedItem.unitPrice);
      }
      if (mappedItem.totalPrice !== undefined) {
        mappedItem.totalPrice = this.parseNumber(mappedItem.totalPrice);
      }

      // Calculate total if not provided
      if (!mappedItem.totalPrice && mappedItem.quantity && mappedItem.unitPrice) {
        mappedItem.totalPrice = mappedItem.quantity * mappedItem.unitPrice;
      }

      // Set defaults
      mappedItem.productName = mappedItem.productName || `Item ${index + 1}`;
      mappedItem.quantity = mappedItem.quantity || 1;
      mappedItem.unitPrice = mappedItem.unitPrice || 0;
      mappedItem.totalPrice = mappedItem.totalPrice || 0;

      return mappedItem;
    });
  }

  /**
   * Extract address information
   */
  static extractAddress(data, type) {
    const addressFields = {
      shipping: ['shippingAddress', 'shipping_address', 'ship to', 'ship_to', 'delivery_address'],
      billing: ['billingAddress', 'billing_address', 'bill to', 'bill_to', 'invoice_address']
    };

    const fields = addressFields[type] || [];
    const addressValue = this.findFieldValue(data, fields);

    if (typeof addressValue === 'string') {
      return addressValue;
    }

    if (typeof addressValue === 'object' && addressValue !== null) {
      // Format address object into string
      const parts = [];
      if (addressValue.street || addressValue.address1) parts.push(addressValue.street || addressValue.address1);
      if (addressValue.address2) parts.push(addressValue.address2);
      if (addressValue.city) parts.push(addressValue.city);
      if (addressValue.state || addressValue.province) parts.push(addressValue.state || addressValue.province);
      if (addressValue.zip || addressValue.postal_code) parts.push(addressValue.zip || addressValue.postal_code);
      if (addressValue.country) parts.push(addressValue.country);
      
      return parts.filter(Boolean).join(', ');
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
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
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

        if (typeof dateValue === 'string') {
          for (const format of formats) {
            const match = dateValue.match(format);
            if (match) {
              // Convert to Date object based on format
              return this.parseMatchedDate(match);
            }
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
    // Ensure both inputs are strings
    if (typeof input !== 'string' || typeof target !== 'string') {
      return false;
    }
    
    const s1 = input.toLowerCase().trim();
    const s2 = target.toLowerCase().trim();
    
    if (s1 === s2) return true;
    if (s1.includes(s2) || s2.includes(s1)) return true;
    
    // Simple similarity calculation
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return true;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    const similarity = (longer.length - editDistance) / longer.length;
    
    return similarity >= threshold;
  }

  /**
   * Calculate Levenshtein distance
   */
  static levenshteinDistance(str1, str2) {
    // Ensure inputs are strings
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
      return 0;
    }

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
