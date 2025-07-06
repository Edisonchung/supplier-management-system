// src/services/ai/RecommendationService.js
// Generate AI-powered recommendations

import { MappingService } from './MappingService';
import { CacheService } from './CacheService';

export class RecommendationService {
  /**
   * Get comprehensive recommendations for PO data
   */
  static async getRecommendations(data) {
    const recommendations = [];

    // Field-level recommendations
    this.addFieldRecommendations(data, recommendations);

    // Business logic recommendations
    await this.addBusinessRecommendations(data, recommendations);

    // Pricing recommendations
    await this.addPricingRecommendations(data, recommendations);

    // Supplier recommendations
    await this.addSupplierRecommendations(data, recommendations);

    // Delivery recommendations
    this.addDeliveryRecommendations(data, recommendations);

    // Item-specific recommendations
    if (data.items && data.items.length > 0) {
      await this.addItemRecommendations(data.items, recommendations);
    }

    // Sort recommendations by severity
    recommendations.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return recommendations;
  }

  /**
   * Add field-level recommendations
   */
  static addFieldRecommendations(data, recommendations) {
    // Check for missing PO number
    if (!data.orderNumber) {
      recommendations.push({
        field: 'orderNumber',
        type: 'missing',
        message: 'PO number is missing',
        action: 'generate',
        suggestedValue: this.generatePONumber(),
        severity: 'high',
        category: 'required'
      });
    }

    // Check for missing delivery date
    if (!data.deliveryDate) {
      const suggestedDate = this.calculateSuggestedDeliveryDate(data.orderDate);
      recommendations.push({
        field: 'deliveryDate',
        type: 'missing',
        message: 'No delivery date specified',
        action: 'suggest',
        suggestedValue: suggestedDate,
        severity: 'medium',
        category: 'planning'
      });
    }

    // Check for missing payment terms
    if (!data.paymentTerms) {
      recommendations.push({
        field: 'paymentTerms',
        type: 'missing',
        message: 'Payment terms not specified',
        action: 'suggest',
        suggestedValue: '30D',
        severity: 'low',
        category: 'financial'
      });
    }

    // Check for missing supplier
    if (!data.supplierName && data.items && data.items.length > 0) {
      recommendations.push({
        field: 'supplierName',
        type: 'missing',
        message: 'Supplier name is missing',
        action: 'required',
        severity: 'high',
        category: 'required'
      });
    }
  }

  /**
   * Add business logic recommendations
   */
  static async addBusinessRecommendations(data, recommendations) {
    // Check order date validity
    if (data.orderDate) {
      const orderDate = new Date(data.orderDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (orderDate > today) {
        recommendations.push({
          field: 'orderDate',
          type: 'warning',
          message: 'Order date is in the future',
          severity: 'medium',
          category: 'validation'
        });
      }
    }

    // Check delivery timeline
    if (data.orderDate && data.deliveryDate) {
      const daysBetween = this.calculateDaysBetween(data.orderDate, data.deliveryDate);
      
      if (daysBetween < 0) {
        recommendations.push({
          field: 'deliveryDate',
          type: 'error',
          message: 'Delivery date is before order date',
          severity: 'high',
          category: 'validation'
        });
      } else if (daysBetween < 7) {
        recommendations.push({
          field: 'deliveryDate',
          type: 'warning',
          message: `Very short delivery timeline (${daysBetween} days)`,
          severity: 'medium',
          category: 'planning'
        });
      } else if (daysBetween > 180) {
        recommendations.push({
          field: 'deliveryDate',
          type: 'info',
          message: `Long delivery timeline (${daysBetween} days)`,
          severity: 'low',
          category: 'planning'
        });
      }
    }

    // Check for historical patterns
    const historicalData = await this.getHistoricalData(data.clientName);
    if (historicalData.averageOrderValue && data.totalAmount) {
      const deviation = Math.abs(data.totalAmount - historicalData.averageOrderValue) / historicalData.averageOrderValue;
      
      if (deviation > 0.5) {
        recommendations.push({
          field: 'totalAmount',
          type: 'info',
          message: `Order value differs significantly from client's average (${MappingService.formatCurrency(historicalData.averageOrderValue)})`,
          severity: 'low',
          category: 'analysis'
        });
      }
    }
  }

  /**
   * Add pricing recommendations
   */
  static async addPricingRecommendations(data, recommendations) {
    if (!data.items || data.items.length === 0) return;

    // Check total calculation
    const calculatedTotal = data.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    if (data.totalAmount && Math.abs(calculatedTotal - data.totalAmount) > 0.01) {
      recommendations.push({
        field: 'totalAmount',
        type: 'error',
        message: 'Total amount does not match sum of items',
        action: 'fix',
        suggestedValue: calculatedTotal,
        calculatedValue: calculatedTotal,
        providedValue: data.totalAmount,
        severity: 'high',
        category: 'calculation'
      });
    }

    // Check for bulk discount opportunities
    const totalQuantity = data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (totalQuantity > 100) {
      recommendations.push({
        field: 'discount',
        type: 'suggestion',
        message: `Large order quantity (${totalQuantity} units). Consider negotiating bulk discount.`,
        severity: 'low',
        category: 'cost-saving'
      });
    }

    // Check for unusual pricing
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      if (item.unitPrice === 0) {
        recommendations.push({
          field: `items[${i}].unitPrice`,
          type: 'error',
          message: `Zero price for "${item.productName}"`,
          severity: 'high',
          category: 'pricing'
        });
      }
    }
  }

  /**
   * Add supplier recommendations
   */
  static async addSupplierRecommendations(data, recommendations) {
    if (!data.supplierName || !data.items || data.items.length === 0) return;

    // Get supplier performance data
    const supplierPerformance = await this.getSupplierPerformance(data.supplierName);
    
    if (supplierPerformance.deliveryRate && supplierPerformance.deliveryRate < 0.8) {
      recommendations.push({
        field: 'supplierName',
        type: 'warning',
        message: `Supplier has low on-time delivery rate (${Math.round(supplierPerformance.deliveryRate * 100)}%)`,
        severity: 'medium',
        category: 'risk'
      });
    }

    // Suggest alternative suppliers for items
    const alternativeSuppliers = await this.findAlternativeSuppliers(data.items);
    if (alternativeSuppliers.length > 0) {
      recommendations.push({
        field: 'supplierName',
        type: 'info',
        message: 'Alternative suppliers available for these products',
        alternatives: alternativeSuppliers,
        severity: 'low',
        category: 'options'
      });
    }
  }

  /**
   * Add delivery recommendations
   */
  static addDeliveryRecommendations(data, recommendations) {
    if (!data.deliveryDate) return;

    const deliveryDate = new Date(data.deliveryDate);
    const dayOfWeek = deliveryDate.getDay();

    // Check for weekend delivery
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      recommendations.push({
        field: 'deliveryDate',
        type: 'info',
        message: 'Delivery date falls on a weekend',
        severity: 'low',
        category: 'planning'
      });
    }

    // Check for holiday delivery (simplified - you'd want a proper holiday calendar)
    if (this.isHoliday(deliveryDate)) {
      recommendations.push({
        field: 'deliveryDate',
        type: 'warning',
        message: 'Delivery date might fall on a holiday',
        severity: 'medium',
        category: 'planning'
      });
    }
  }

  /**
   * Add item-specific recommendations
   */
  static async addItemRecommendations(items, recommendations) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Check quantity thresholds
      if (item.quantity > 1000) {
        recommendations.push({
          field: `items[${i}].quantity`,
          type: 'info',
          message: `Large quantity for "${item.productName}" (${item.quantity} units)`,
          severity: 'low',
          category: 'verification'
        });
      }

      // Check price history
      const priceHistory = await this.getProductPriceHistory(item.productName);
      if (priceHistory.averagePrice && item.unitPrice) {
        const priceDeviation = (item.unitPrice - priceHistory.averagePrice) / priceHistory.averagePrice;
        
        if (priceDeviation > 0.2) {
          recommendations.push({
            field: `items[${i}].unitPrice`,
            type: 'warning',
            message: `Price for "${item.productName}" is ${Math.round(priceDeviation * 100)}% higher than average (${MappingService.formatCurrency(priceHistory.averagePrice)})`,
            severity: 'medium',
            category: 'pricing'
          });
        } else if (priceDeviation < -0.2) {
          recommendations.push({
            field: `items[${i}].unitPrice`,
            type: 'info',
            message: `Good price for "${item.productName}" - ${Math.round(Math.abs(priceDeviation) * 100)}% below average`,
            severity: 'low',
            category: 'cost-saving'
          });
        }
      }

      // Check stock availability
      const stockInfo = await this.checkStockAvailability(item.productName, item.quantity);
      if (stockInfo.available < item.quantity) {
        recommendations.push({
          field: `items[${i}].quantity`,
          type: 'warning',
          message: `Insufficient stock for "${item.productName}". Available: ${stockInfo.available}`,
          severity: 'high',
          category: 'inventory'
        });
      }
    }
  }

  /**
   * Helper methods
   */
  static generatePONumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  }

  static calculateSuggestedDeliveryDate(orderDate) {
    const date = orderDate ? new Date(orderDate) : new Date();
    date.setDate(date.getDate() + 30); // Default 30 days
    return date.toISOString().split('T')[0];
  }

  static calculateDaysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = d2 - d1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static isHoliday(date) {
    // Simplified holiday check - you'd want a proper holiday calendar
    const month = date.getMonth();
    const day = date.getDate();
    
    // Check for common holidays (US)
    if (month === 0 && day === 1) return true; // New Year
    if (month === 11 && day === 25) return true; // Christmas
    // Add more holidays as needed
    
    return false;
  }

  static async getHistoricalData(clientName) {
    if (!clientName) return { averageOrderValue: null };

    const orders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    const clientOrders = orders.filter(o => o.clientName === clientName);
    
    if (clientOrders.length === 0) {
      return { averageOrderValue: null };
    }

    const totalValue = clientOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const averageOrderValue = totalValue / clientOrders.length;

    return {
      averageOrderValue,
      orderCount: clientOrders.length,
      totalValue
    };
  }

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
        p.name.toLowerCase().includes(item.productName.toLowerCase())
      );
      
      for (const product of matchingProducts) {
        const supplier = suppliers.find(s => s.id === product.supplierId);
        if (supplier) {
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
    const product = products.find(p => 
      p.name.toLowerCase() === productName.toLowerCase()
    );
    
    if (!product) {
      return { available: 0, inStock: false };
    }
    
    return {
      available: product.stock || 0,
      inStock: (product.stock || 0) >= requiredQuantity
    };
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
