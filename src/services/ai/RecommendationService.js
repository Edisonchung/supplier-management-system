// src/services/ai/RecommendationService.js
// Generate AI recommendations based on extracted data

import { CacheService } from './CacheService';
import { DuplicateDetectionService } from './DuplicateDetectionService';

export class RecommendationService {
  /**
   * Safe string comparison helper
   */
  static safeIncludes(str, searchStr) {
    if (!str || !searchStr) return false;
    const s1 = typeof str === 'string' ? str : String(str);
    const s2 = typeof searchStr === 'string' ? searchStr : String(searchStr);
    return s1.toLowerCase().includes(s2.toLowerCase());
  }

  /**
   * Safe find by property helper
   */
  static safeFindByProperty(array, property, value) {
    if (!Array.isArray(array) || !property || !value) {
      return undefined;
    }
    
    return array.find(item => {
      if (!item || !item[property]) return false;
      const itemValue = typeof item[property] === 'string' ? item[property] : String(item[property]);
      const searchValue = typeof value === 'string' ? value : String(value);
      return itemValue.toLowerCase() === searchValue.toLowerCase();
    });
  }

  /**
   * Generate comprehensive recommendations
   */
  static async getRecommendations(data) {
    const recommendations = [];
    
    try {
      // 1. Supplier recommendations
      const supplierRecs = await this.getSupplierRecommendations(data);
      recommendations.push(...supplierRecs);
      
      // 2. Product recommendations
      const productRecs = await this.getProductRecommendations(data);
      recommendations.push(...productRecs);
      
      // 3. Pricing recommendations
      const pricingRecs = await this.getPricingRecommendations(data);
      recommendations.push(...pricingRecs);
      
      // 4. Delivery recommendations
      const deliveryRecs = await this.getDeliveryRecommendations(data);
      recommendations.push(...deliveryRecs);
      
      // 5. Process recommendations
      const processRecs = await this.getProcessRecommendations(data);
      recommendations.push(...processRecs);
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
    
    return recommendations;
  }

  /**
   * Supplier-related recommendations
   */
  static async getSupplierRecommendations(data) {
    const recommendations = [];
    
    if (!data.supplierName) {
      recommendations.push({
        type: 'supplier',
        priority: 'high',
        message: 'No supplier specified. Please select a supplier.',
        field: 'supplierName',
        category: 'validation'
      });
      return recommendations;
    }
    
    // Check supplier status
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    const supplier = this.safeFindByProperty(suppliers, 'name', data.supplierName);
    
    if (supplier) {
      if (supplier.status === 'inactive') {
        recommendations.push({
          type: 'supplier',
          priority: 'high',
          message: `Supplier "${supplier.name}" is inactive. Consider choosing an active supplier.`,
          field: 'supplierName',
          category: 'business'
        });
      } else if (supplier.status === 'pending') {
        recommendations.push({
          type: 'supplier',
          priority: 'medium',
          message: `Supplier "${supplier.name}" is pending approval. Verify supplier status before proceeding.`,
          field: 'supplierName',
          category: 'business'
        });
      }
      
      // Check supplier performance
      const performance = await this.getSupplierPerformance(supplier.name);
      if (performance.deliveryRate < 0.9) {
        recommendations.push({
          type: 'supplier',
          priority: 'medium',
          message: `Supplier has ${Math.round(performance.deliveryRate * 100)}% on-time delivery rate. Consider delivery buffer.`,
          field: 'deliveryDate',
          category: 'performance'
        });
      }
    }
    
    // Find alternative suppliers
    if (data.items && data.items.length > 0) {
      const alternatives = await this.findAlternativeSuppliers(data.items);
      if (alternatives.length > 0) {
        recommendations.push({
          type: 'supplier',
          priority: 'low',
          message: `Alternative suppliers available: ${alternatives.join(', ')}`,
          field: 'supplierName',
          category: 'optimization',
          alternatives
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Product-related recommendations
   */
  static async getProductRecommendations(data) {
    const recommendations = [];
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    if (!data.items || data.items.length === 0) {
      return recommendations;
    }
    
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      
      // Check stock availability
      const stockInfo = await this.checkStockAvailability(item.productName, item.quantity);
      if (!stockInfo.inStock) {
        recommendations.push({
          type: 'product',
          priority: 'high',
          message: `Insufficient stock for "${item.productName}". Available: ${stockInfo.available}, Required: ${item.quantity}`,
          field: `items[${i}].quantity`,
          category: 'inventory',
          itemIndex: i
        });
      } else if (stockInfo.available < item.quantity * 1.5) {
        recommendations.push({
          type: 'product',
          priority: 'medium',
          message: `Low stock warning for "${item.productName}". Consider reordering soon.`,
          field: `items[${i}]`,
          category: 'inventory',
          itemIndex: i
        });
      }
      
      // Check for discontinued products
      const product = products.find(p => 
        p && p.name && item.productName && 
        this.safeIncludes(p.name, item.productName)
      );
      
      if (product && product.status === 'discontinued') {
        recommendations.push({
          type: 'product',
          priority: 'high',
          message: `Product "${item.productName}" is discontinued. Consider alternatives.`,
          field: `items[${i}].productName`,
          category: 'product',
          itemIndex: i
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Pricing recommendations
   */
  static async getPricingRecommendations(data) {
    const recommendations = [];
    
    if (!data.items || data.items.length === 0) {
      return recommendations;
    }
    
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      
      // Get price history
      const priceHistory = await this.getProductPriceHistory(item.productName);
      
      if (priceHistory.averagePrice) {
        const currentPrice = item.unitPrice;
        const avgPrice = priceHistory.averagePrice;
        const priceDiff = ((currentPrice - avgPrice) / avgPrice) * 100;
        
        if (priceDiff > 10) {
          recommendations.push({
            type: 'pricing',
            priority: 'medium',
            message: `Price for "${item.productName}" is ${priceDiff.toFixed(1)}% higher than average (${this.formatCurrency(avgPrice)})`,
            field: `items[${i}].unitPrice`,
            category: 'cost',
            itemIndex: i,
            suggestedPrice: avgPrice
          });
        } else if (priceDiff < -10) {
          recommendations.push({
            type: 'pricing',
            priority: 'low',
            message: `Good deal! Price for "${item.productName}" is ${Math.abs(priceDiff).toFixed(1)}% lower than average`,
            field: `items[${i}].unitPrice`,
            category: 'cost',
            itemIndex: i
          });
        }
      }
    }
    
    // Check total order value
    if (data.totalAmount) {
      if (data.totalAmount > 50000) {
        recommendations.push({
          type: 'pricing',
          priority: 'medium',
          message: 'Large order value. Consider negotiating bulk discount.',
          field: 'totalAmount',
          category: 'cost'
        });
      }
    }
    
    return recommendations;
  }

  /**
   * Delivery recommendations
   */
  static async getDeliveryRecommendations(data) {
    const recommendations = [];
    
    if (data.deliveryDate) {
      const deliveryDate = new Date(data.deliveryDate);
      const today = new Date();
      const daysUntilDelivery = Math.floor((deliveryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDelivery < 7) {
        recommendations.push({
          type: 'delivery',
          priority: 'high',
          message: 'Rush delivery requested. Confirm supplier can meet deadline.',
          field: 'deliveryDate',
          category: 'logistics'
        });
      } else if (daysUntilDelivery > 60) {
        recommendations.push({
          type: 'delivery',
          priority: 'low',
          message: 'Long lead time. Consider ordering closer to requirement date to optimize inventory.',
          field: 'deliveryDate',
          category: 'logistics'
        });
      }
    } else {
      recommendations.push({
        type: 'delivery',
        priority: 'medium',
        message: 'No delivery date specified. Add expected delivery date for better planning.',
        field: 'deliveryDate',
        category: 'logistics'
      });
    }
    
    return recommendations;
  }

  /**
   * Process recommendations
   */
  static async getProcessRecommendations(data) {
    const recommendations = [];
    
    // Check for duplicate PO
    const duplicateCheck = await DuplicateDetectionService.checkDuplicates(data);
    if (duplicateCheck.hasDuplicates) {
      recommendations.push({
        type: 'process',
        priority: 'high',
        message: `Similar order found: ${duplicateCheck.duplicates[0].orderNumber}. Verify this is not a duplicate.`,
        field: 'orderNumber',
        category: 'validation',
        duplicates: duplicateCheck.duplicates
      });
    }
    
    // Payment terms
    if (!data.paymentTerms) {
      recommendations.push({
        type: 'process',
        priority: 'medium',
        message: 'No payment terms specified. Add payment terms for clarity.',
        field: 'paymentTerms',
        category: 'finance',
        suggestion: '30D'
      });
    }
    
    // Check for notes/special instructions
    if (!data.notes) {
      recommendations.push({
        type: 'process',
        priority: 'low',
        message: 'Consider adding notes for special instructions or requirements.',
        field: 'notes',
        category: 'communication'
      });
    }
    
    return recommendations;
  }

  /**
   * Helper methods
   */
  static async getSupplierPerformance(supplierName) {
    // In a real system, this would fetch from a database
    // For now, return mock data
    return {
      deliveryRate: 0.95,
      qualityRate: 0.98,
      responseTime: 24 // hours
    };
  }

  static async findAlternativeSuppliers(items) {
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    
    const alternatives = new Set();
    
    for (const item of items) {
      const matchingProducts = products.filter(p => 
        p && p.name && item.productName && 
        this.safeIncludes(p.name, item.productName)
      );
      
      for (const product of matchingProducts) {
        const supplier = suppliers.find(s => s && s.id === product.supplierId);
        if (supplier && supplier.name) {
          alternatives.add(supplier.name);
        }
      }
    }
    
    return Array.from(alternatives).slice(0, 3); // Return top 3
  }

  static async getProductPriceHistory(productName) {
    const orders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const prices = [];
    
    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          if (item.productName === productName && item.unitPrice > 0) {
            prices.push(item.unitPrice);
          }
        }
      }
    }
    
    if (prices.length === 0) {
      return { averagePrice: null };
    }
    
    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    return {
      averagePrice,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      priceCount: prices.length
    };
  }

  static async checkStockAvailability(productName, requiredQuantity) {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const product = this.safeFindByProperty(products, 'name', productName);
    
    if (!product) {
      return { available: 0, inStock: false };
    }
    
    return {
      available: product.stock || 0,
      inStock: (product.stock || 0) >= requiredQuantity
    };
  }

  static formatCurrency(value, currency = 'MYR') {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency
    }).format(value);
  }

  /**
   * Get all recommendations as a formatted report
   */
  static formatRecommendationsReport(recommendations) {
    const grouped = {};
    
    // Group by category
    recommendations.forEach(rec => {
      const category = rec.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(rec);
    });
    
    return grouped;
  }
}
