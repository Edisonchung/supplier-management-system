// src/services/ai/ValidationService.js
// Handle all validation logic

import { CacheService } from './CacheService';
import { MappingService } from './MappingService';

export class ValidationService {
  /**
   * Comprehensive validation of extracted data
   */
  static async validateExtractedData(data) {
    const errors = [];
    const warnings = [];
    const suggestions = [];

    // Required field validation
    this.validateRequiredFields(data, errors);

    // Data type validation
    this.validateDataTypes(data, errors);

    // Business logic validation
    await this.validateBusinessLogic(data, errors, warnings);

    // Supplier validation
    if (data.supplierName) {
      const supplierValidation = await this.validateSupplier(data.supplierName);
      if (!supplierValidation.exists) {
        warnings.push({
          field: 'supplierName',
          message: `Supplier "${data.supplierName}" not found in system`,
          suggestion: supplierValidation.suggestion,
          severity: 'medium'
        });
      } else {
        data.supplierId = supplierValidation.supplier.id;
      }
    }

    // Product validation
    if (data.items && data.items.length > 0) {
      await this.validateItems(data.items, errors, warnings, suggestions);
    }

    // Date validation
    this.validateDates(data, warnings);

    // Price validation
    this.validatePricing(data, errors, warnings);

    // Add suggestions based on validation results
    this.generateSuggestions(data, errors, warnings, suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      validatedData: data,
      validationScore: this.calculateValidationScore(errors, warnings)
    };
  }

  /**
   * Validate required fields
   */
  static validateRequiredFields(data, errors) {
    const requiredFields = [
      { field: 'clientName', message: 'Client name is required' },
      { field: 'items', message: 'At least one item is required', validator: (val) => val && val.length > 0 }
    ];

    requiredFields.forEach(({ field, message, validator }) => {
      const value = data[field];
      const isValid = validator ? validator(value) : value;
      
      if (!isValid) {
        errors.push({
          field,
          message,
          severity: 'high',
          type: 'required'
        });
      }
    });
  }

  /**
   * Validate data types
   */
  static validateDataTypes(data, errors) {
    // Validate dates
    if (data.orderDate && !this.isValidDate(data.orderDate)) {
      errors.push({
        field: 'orderDate',
        message: 'Invalid order date format',
        severity: 'medium',
        type: 'format'
      });
    }

    if (data.deliveryDate && !this.isValidDate(data.deliveryDate)) {
      errors.push({
        field: 'deliveryDate',
        message: 'Invalid delivery date format',
        severity: 'medium',
        type: 'format'
      });
    }

    // Validate numbers
    if (data.totalAmount !== undefined && (typeof data.totalAmount !== 'number' || data.totalAmount < 0)) {
      errors.push({
        field: 'totalAmount',
        message: 'Total amount must be a positive number',
        severity: 'high',
        type: 'type'
      });
    }
  }

  /**
   * Validate business logic
   */
  static async validateBusinessLogic(data, errors, warnings) {
    // Check if delivery date is after order date
    if (data.orderDate && data.deliveryDate) {
      const orderDate = new Date(data.orderDate);
      const deliveryDate = new Date(data.deliveryDate);
      
      if (deliveryDate < orderDate) {
        errors.push({
          field: 'deliveryDate',
          message: 'Delivery date cannot be before order date',
          severity: 'high',
          type: 'logic'
        });
      }
    }

    // Check for reasonable delivery timeframe
    if (data.orderDate && data.deliveryDate) {
      const daysDiff = this.daysBetween(new Date(data.orderDate), new Date(data.deliveryDate));
      
      if (daysDiff > 365) {
        warnings.push({
          field: 'deliveryDate',
          message: 'Delivery date is more than a year from order date',
          severity: 'medium',
          type: 'unusual'
        });
      }
    }
  }

  /**
   * Validate supplier existence
   */
  static async validateSupplier(supplierName) {
    // Check cache first
    const cachedSuppliers = CacheService.getAllCachedSuppliers();
    let found = cachedSuppliers.find(s => 
      s.name.toLowerCase() === supplierName.toLowerCase()
    );
    
    if (found) {
      return { exists: true, supplier: found };
    }

    // Check localStorage
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    found = suppliers.find(s => 
      s.name.toLowerCase() === supplierName.toLowerCase()
    );

    if (found) {
      CacheService.cacheSupplier(found);
      return { exists: true, supplier: found };
    }

    // Find best match using fuzzy matching
    const suggestion = this.findBestMatch(supplierName, suppliers.map(s => ({
      id: s.id,
      name: s.name
    })));
    
    return {
      exists: false,
      suggestion: suggestion ? suggestion.name : null,
      suggestedId: suggestion ? suggestion.id : null
    };
  }

  /**
   * Validate items
   */
  static async validateItems(items, errors, warnings, suggestions) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Validate required item fields
      if (!item.productName) {
        errors.push({
          field: `items[${i}].productName`,
          message: `Item ${i + 1}: Product name is required`,
          severity: 'high',
          type: 'required'
        });
      }

      // Validate quantities
      if (item.quantity <= 0) {
        errors.push({
          field: `items[${i}].quantity`,
          message: `Item ${i + 1}: Quantity must be greater than 0`,
          severity: 'high',
          type: 'validation'
        });
      }

      // Validate prices
      if (item.unitPrice < 0) {
        errors.push({
          field: `items[${i}].unitPrice`,
          message: `Item ${i + 1}: Unit price cannot be negative`,
          severity: 'high',
          type: 'validation'
        });
      }

      // Check for zero prices
      if (item.unitPrice === 0) {
        warnings.push({
          field: `items[${i}].unitPrice`,
          message: `Item ${i + 1}: Unit price is zero`,
          severity: 'medium',
          type: 'unusual'
        });
      }

      // Validate product existence
      if (item.productName) {
        const productValidation = await this.validateProduct(item.productName);
        if (!productValidation.exists) {
          warnings.push({
            field: `items[${i}].productName`,
            message: `Product "${item.productName}" not found in system`,
            suggestion: productValidation.suggestion,
            severity: 'low',
            type: 'reference'
          });
        } else {
          item.productId = productValidation.product.id;
          
          // Check stock availability
          if (productValidation.product.stock < item.quantity) {
            warnings.push({
              field: `items[${i}].quantity`,
              message: `Insufficient stock for "${item.productName}". Available: ${productValidation.product.stock}`,
              severity: 'high',
              type: 'stock'
            });
          }
        }
      }

      // Verify total price calculation
      const calculatedTotal = item.quantity * item.unitPrice;
      if (Math.abs(calculatedTotal - item.totalPrice) > 0.01) {
        warnings.push({
          field: `items[${i}].totalPrice`,
          message: `Item ${i + 1}: Total price doesn't match quantity × unit price`,
          suggestedValue: calculatedTotal,
          severity: 'medium',
          type: 'calculation'
        });
      }
    }
  }

  /**
   * Validate product existence
   */
  static async validateProduct(productName) {
    const cachedProducts = CacheService.getAllCachedProducts();
    let found = cachedProducts.find(p => 
      p.name.toLowerCase() === productName.toLowerCase()
    );

    if (found) {
      return { exists: true, product: found };
    }

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    found = products.find(p => 
      p.name.toLowerCase() === productName.toLowerCase()
    );

    if (found) {
      CacheService.cacheProduct(found);
      return { exists: true, product: found };
    }

    const suggestion = this.findBestMatch(productName, products.map(p => ({
      id: p.id,
      name: p.name
    })));
    
    return {
      exists: false,
      suggestion: suggestion ? suggestion.name : null,
      suggestedId: suggestion ? suggestion.id : null
    };
  }

  /**
   * Validate dates
   */
  static validateDates(data, warnings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (data.deliveryDate) {
      const deliveryDate = new Date(data.deliveryDate);
      deliveryDate.setHours(0, 0, 0, 0);
      
      if (deliveryDate < today) {
        warnings.push({
          field: 'deliveryDate',
          message: 'Delivery date is in the past',
          severity: 'high',
          type: 'date'
        });
      }
    }

    if (data.orderDate) {
      const orderDate = new Date(data.orderDate);
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      if (orderDate < oneYearAgo) {
        warnings.push({
          field: 'orderDate',
          message: 'Order date is more than a year old',
          severity: 'medium',
          type: 'date'
        });
      }
    }
  }

  /**
   * Validate pricing
   */
  static validatePricing(data, errors, warnings) {
    if (data.items && data.items.length > 0) {
      const calculatedTotal = data.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
      
      if (data.totalAmount !== undefined) {
        const difference = Math.abs(calculatedTotal - data.totalAmount);
        
        if (difference > 0.01) {
          warnings.push({
            field: 'totalAmount',
            message: 'Total amount does not match sum of items',
            calculatedValue: calculatedTotal,
            providedValue: data.totalAmount,
            difference: difference,
            severity: difference > 1 ? 'high' : 'medium',
            type: 'calculation'
          });
        }
      } else {
        data.totalAmount = calculatedTotal;
      }
    }
  }

  /**
   * Generate suggestions based on validation
   */
  static generateSuggestions(data, errors, warnings, suggestions) {
    // Suggest order number if missing
    if (!data.orderNumber) {
      suggestions.push({
        field: 'orderNumber',
        message: 'Consider generating a PO number',
        suggestedValue: this.generatePONumber(),
        type: 'enhancement'
      });
    }

    // Suggest default payment terms
    if (!data.paymentTerms) {
      suggestions.push({
        field: 'paymentTerms',
        message: 'Consider adding payment terms',
        suggestedValue: '30D',
        type: 'enhancement'
      });
    }

    // Suggest delivery date if missing
    if (!data.deliveryDate && data.orderDate) {
      const suggestedDate = new Date(data.orderDate);
      suggestedDate.setDate(suggestedDate.getDate() + 30);
      
      suggestions.push({
        field: 'deliveryDate',
        message: 'Consider setting a delivery date',
        suggestedValue: suggestedDate.toISOString().split('T')[0],
        type: 'enhancement'
      });
    }
  }

  /**
   * Helper methods
   */
  static isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  static daysBetween(date1, date2) {
    const diffTime = Math.abs(date2 - date1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static generatePONumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  }

  static findBestMatch(input, options) {
    const lowInput = input.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const option of options) {
      const lowOption = option.name.toLowerCase();
      
      // Exact match
      if (lowOption === lowInput) {
        return option;
      }

      // Calculate similarity score
      let score = 0;
      
      // Contains match
      if (lowOption.includes(lowInput) || lowInput.includes(lowOption)) {
        score = 0.7;
      }

      // Word match
      const inputWords = lowInput.split(/\s+/);
      const optionWords = lowOption.split(/\s+/);
      const matchingWords = inputWords.filter(w => optionWords.includes(w));
      const wordScore = matchingWords.length / Math.max(inputWords.length, optionWords.length);
      
      score = Math.max(score, wordScore);

      // Fuzzy match
      if (MappingService.fuzzyMatch(lowInput, lowOption, 0.6)) {
        score = Math.max(score, 0.6);
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = option;
      }
    }

    return bestScore > 0.5 ? bestMatch : null;
  }

  static calculateValidationScore(errors, warnings) {
    const maxScore = 100;
    const errorPenalty = 10;
    const warningPenalty = 3;
    
    const score = maxScore - (errors.length * errorPenalty) - (warnings.length * warningPenalty);
    return Math.max(0, Math.min(100, score));
  }
}
