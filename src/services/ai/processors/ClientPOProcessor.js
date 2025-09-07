// src/services/ai/processors/ClientPOProcessor.js
// Updated ClientPOProcessor with integrated supplier matching

import { parseNumber, parseAmount } from '../utils/numberParser';
import { normalizeDate } from '../utils/dateUtils';
import { safeToLowerCase } from '../utils/safeString';
import { SupplierMatcher } from '../SupplierMatcher';

export class ClientPOProcessor {
  /**
   * Process client purchase order data with supplier matching
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
      
      // Items (will be enhanced with supplier matches)
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
    
    // Perform supplier matching for all items
    if (processedData.items.length > 0) {
      console.log('Starting supplier matching for', processedData.items.length, 'items');
      const matchingResult = await SupplierMatcher.findMatches(processedData.items);
      
      // Update items with their supplier matches
      processedData.items = matchingResult.itemMatches;
      
      // Add sourcing plan with real supplier recommendations
      processedData.sourcingPlan = await this.createSourcingPlan(processedData, matchingResult);
      
      // Add supplier matching metrics
      processedData.matchingMetrics = matchingResult.metrics;
    }
    
    return processedData;
  }

  /**
   * Extract and process items with enhanced data
   */
  static async extractAndProcessItems(data) {
    const items = [];
    const rawItems = data.items || data.products || data.line_items || [];
    
    for (const [index, item] of rawItems.entries()) {
      const processedItem = {
        itemNumber: index + 1,
        
        // Product identification
        productCode: item.part_number || item.product_code || item.item_code || '',
        productName: item.description || item.product_name || item.item_description || '',
        
        // Specifications
        specifications: item.specifications || item.specs || '',
        brand: item.brand || '',
        category: item.category || this.inferCategory(item),
        
        // Quantities and pricing
        quantity: parseNumber(item.quantity || item.qty || 0),
        unitPrice: parseAmount(item.unit_price || item.price || 0),
        totalPrice: parseAmount(item.total_price || item.amount || 0),
        uom: item.uom || item.unit || 'PCS',
        
        // Delivery requirements
        deliveryDate: normalizeDate(item.delivery_date || item.needed_date || data.delivery_date),
        priority: item.priority || 'normal',
        
        // Notes and special requirements
        notes: item.notes || item.remarks || '',
        specialRequirements: item.special_requirements || ''
      };
      
      // Calculate total if not provided
      if (!processedItem.totalPrice && processedItem.quantity && processedItem.unitPrice) {
        processedItem.totalPrice = processedItem.quantity * processedItem.unitPrice;
      }
      
      // Initialize supplier matches array (will be populated by SupplierMatcher)
      processedItem.supplierMatches = [];
      
      items.push(processedItem);
    }
    
    return items;
  }

  /**
   * Create comprehensive sourcing plan with real supplier data
   */
  static async createSourcingPlan(data, matchingResult) {
    const { recommendedSuppliers, metrics } = matchingResult;
    
    // Calculate delivery timeline based on supplier lead times
    const estimatedLeadTime = metrics.averageLeadTime || '2-3 weeks';
    
    // Identify items without matches that need attention
    const itemsNeedingAttention = data.items.filter(item => 
      !item.supplierMatches || item.supplierMatches.length === 0
    );
    
    return {
      // Top recommended suppliers
      recommendedSuppliers: recommendedSuppliers.map(supplier => ({
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        itemCoverage: `${supplier.itemCoveragePercent}%`,
        estimatedCost: supplier.totalPrice,
        averageRating: supplier.averageRating,
        leadTime: supplier.averageLeadTime,
        advantages: this.getSupplierAdvantages(supplier)
      })),
      
      // Alternative sourcing strategies
      sourcingStrategies: this.generateSourcingStrategies(data, matchingResult),
      
      // Cost analysis
      costAnalysis: {
        originalBudget: data.totalAmount,
        bestCaseScenario: metrics.totalBestCost,
        potentialSavings: metrics.potentialSavings,
        savingsPercentage: `${metrics.potentialSavingsPercent.toFixed(1)}%`
      },
      
      // Timeline
      timeline: {
        estimatedLeadTime: estimatedLeadTime,
        orderPlacementDeadline: this.calculateOrderDeadline(data.deliveryDate, estimatedLeadTime),
        criticalPath: this.identifyCriticalPath(data.items)
      },
      
      // Risk assessment
      riskAssessment: {
        supplierDiversity: metrics.supplierDiversity,
        itemsWithoutMatches: itemsNeedingAttention.length,
        singleSourceItems: this.identifySingleSourceItems(data.items),
        recommendations: this.generateRiskMitigationRecommendations(data, metrics)
      },
      
      // Overall metrics
      confidenceScore: this.calculateConfidenceScore(metrics),
      matchQuality: this.assessMatchQuality(metrics)
    };
  }

  /**
   * Get supplier advantages for display
   */
  static getSupplierAdvantages(supplier) {
    const advantages = [];
    
    if (supplier.itemCoveragePercent >= 80) {
      advantages.push('Can supply most items');
    }
    if (supplier.averageRating >= 4.5) {
      advantages.push('Excellent rating');
    }
    if (supplier.averageLeadTime && supplier.averageLeadTime.includes('day')) {
      advantages.push('Fast delivery');
    }
    
    return advantages.length > 0 ? advantages : ['Competitive pricing'];
  }

  /**
   * Generate sourcing strategies
   */
  static generateSourcingStrategies(data, matchingResult) {
    const strategies = [];
    
    // Single supplier strategy
    if (matchingResult.recommendedSuppliers.length > 0) {
      const topSupplier = matchingResult.recommendedSuppliers[0];
      if (topSupplier.itemCoveragePercent >= 70) {
        strategies.push({
          name: 'Single Supplier Consolidation',
          description: `Order ${topSupplier.itemCoveragePercent}% of items from ${topSupplier.supplierName}`,
          pros: ['Simplified logistics', 'Better negotiation power', 'Single point of contact'],
          cons: ['Higher dependency risk', 'Less price competition'],
          estimatedSavings: '5-10% through volume discounts'
        });
      }
    }
    
    // Multi-supplier strategy
    if (matchingResult.recommendedSuppliers.length >= 3) {
      strategies.push({
        name: 'Multi-Supplier Distribution',
        description: 'Distribute orders among top 3-5 suppliers based on their strengths',
        pros: ['Risk diversification', 'Competitive pricing', 'Specialized expertise'],
        cons: ['Complex coordination', 'Higher admin overhead'],
        estimatedSavings: '10-15% through competition'
      });
    }
    
    // Hybrid strategy
    strategies.push({
      name: 'Hybrid Approach',
      description: 'Use primary supplier for 60-70% of items, secondary suppliers for specialized items',
      pros: ['Balance of efficiency and risk', 'Maintains competition', 'Backup options'],
      cons: ['Requires careful planning'],
      estimatedSavings: '7-12% overall'
    });
    
    return strategies;
  }

  /**
   * Calculate order placement deadline
   */
  static calculateOrderDeadline(deliveryDate, leadTime) {
    if (!deliveryDate) return 'ASAP';
    
    const delivery = new Date(deliveryDate);
    const leadDays = this.parseLeadTimeToDays(leadTime);
    const bufferDays = 3; // Safety buffer
    
    const deadline = new Date(delivery);
    deadline.setDate(deadline.getDate() - leadDays - bufferDays);
    
    const today = new Date();
    const daysUntilDeadline = Math.floor((deadline - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline < 0) {
      return 'URGENT - Already past deadline';
    } else if (daysUntilDeadline <= 3) {
      return `URGENT - ${daysUntilDeadline} days remaining`;
    } else if (daysUntilDeadline <= 7) {
      return `Priority - ${daysUntilDeadline} days remaining`;
    } else {
      return `${deadline.toLocaleDateString()} (${daysUntilDeadline} days)`;
    }
  }

  /**
   * Parse lead time string to days
   */
  static parseLeadTimeToDays(leadTime) {
    if (!leadTime) return 14; // Default 2 weeks
    
    const match = leadTime.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return 14;
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'day': return value;
      case 'week': return value * 7;
      case 'month': return value * 30;
      default: return 14;
    }
  }

  /**
   * Identify critical path items
   */
  static identifyCriticalPath(items) {
    const criticalItems = items
      .filter(item => {
        const hasLongLeadTime = item.bestMatch && 
          this.parseLeadTimeToDays(item.bestMatch.pricing.leadTime) > 21;
        const hasNoMatches = !item.supplierMatches || item.supplierMatches.length === 0;
        const isHighValue = item.totalPrice > 1000;
        
        return hasLongLeadTime || hasNoMatches || isHighValue;
      })
      .map(item => ({
        productName: item.productName,
        reason: !item.supplierMatches || item.supplierMatches.length === 0 
          ? 'No supplier found'
          : item.totalPrice > 1000 
          ? 'High value item'
          : 'Long lead time'
      }));
    
    return criticalItems;
  }

  /**
   * Identify single source items
   */
  static identifySingleSourceItems(items) {
    return items
      .filter(item => item.supplierMatches && item.supplierMatches.length === 1)
      .map(item => ({
        productName: item.productName,
        supplierName: item.supplierMatches[0].supplierName
      }));
  }

  /**
   * Generate risk mitigation recommendations
   */
  static generateRiskMitigationRecommendations(data, metrics) {
    const recommendations = [];
    
    if (metrics.itemsWithoutMatches > 0) {
      recommendations.push({
        type: 'warning',
        message: `${metrics.itemsWithoutMatches} items have no supplier matches`,
        action: 'Consider adding more suppliers or updating product catalog'
      });
    }
    
    if (metrics.supplierDiversity < 3) {
      recommendations.push({
        type: 'caution',
        message: 'Limited supplier options available',
        action: 'Expand supplier base for better risk distribution'
      });
    }
    
    if (data.totalAmount > 10000 && metrics.supplierDiversity < 5) {
      recommendations.push({
        type: 'info',
        message: 'High-value order with limited suppliers',
        action: 'Consider splitting order or negotiating payment terms'
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate overall confidence score
   */
  static calculateConfidenceScore(metrics) {
    let score = 0.5; // Base score
    
    // Factor in match coverage
    const matchCoverage = metrics.itemsWithMatches / 
      (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    score += matchCoverage * 0.3;
    
    // Factor in supplier diversity
    if (metrics.supplierDiversity >= 5) score += 0.1;
    else if (metrics.supplierDiversity >= 3) score += 0.05;
    
    // Factor in average matches per item
    if (metrics.averageMatchesPerItem >= 3) score += 0.1;
    else if (metrics.averageMatchesPerItem >= 2) score += 0.05;
    
    return Math.min(score, 0.95); // Cap at 0.95
  }

  /**
   * Assess match quality
   */
  static assessMatchQuality(metrics) {
    const coverage = metrics.itemsWithMatches / 
      (metrics.itemsWithMatches + metrics.itemsWithoutMatches);
    
    if (coverage >= 0.9 && metrics.averageMatchesPerItem >= 3) {
      return 'Excellent';
    } else if (coverage >= 0.7 && metrics.averageMatchesPerItem >= 2) {
      return 'Good';
    } else if (coverage >= 0.5) {
      return 'Fair';
    } else {
      return 'Needs Improvement';
    }
  }

  /**
   * Infer category from item data
   */
  static inferCategory(item) {
    const name = (item.description || item.product_name || '').toLowerCase();
    
    // Simple category inference based on keywords
    if (name.includes('electronic') || name.includes('circuit') || name.includes('chip')) {
      return 'electronics';
    } else if (name.includes('steel') || name.includes('aluminum') || name.includes('metal')) {
      return 'raw-material';
    } else if (name.includes('tool') || name.includes('equipment')) {
      return 'tools';
    } else if (name.includes('safety') || name.includes('ppe')) {
      return 'safety';
    }
    
    return 'general';
  }

  /**
 * Extract PO number - UPDATED for nested AI response
 */
static extractPONumber(data) {
  // CRITICAL FIX: Handle nested AI response structure first
  let actualData = data;
  if (data.data?.data) {
    actualData = data.data.data; // Handle nested: data.data.clientPoNumber
  } else if (data.data) {
    actualData = data.data; // Handle single level: data.clientPoNumber
  }

  // PRIORITY 1: Check for clientPoNumber (from new AI prompt)
  if (actualData.clientPoNumber) return actualData.clientPoNumber;
  if (actualData.poNumber) return actualData.poNumber;

  // PRIORITY 2: Check legacy direct fields
  if (actualData.order_number) return actualData.order_number;
  if (actualData.po_number) return actualData.po_number;
  if (actualData.purchase_order_number) return actualData.purchase_order_number;
  
  // PRIORITY 3: Check original data structure (fallback)
  if (data.order_number) return data.order_number;
  if (data.po_number) return data.po_number;
  if (data.purchase_order_number) return data.purchase_order_number;
  
  // Pattern matching (existing logic)
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
    
    return deliveryDate ? normalizeDate(deliveryDate) : null;
  }

  /**
   * Validate and calculate totals
   */
  static validateAndCalculateTotals(data) {
    // Calculate subtotal from items if not provided
    if (!data.subtotal && data.items.length > 0) {
      data.subtotal = data.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    }
    
    // Ensure items total matches subtotal
    const calculatedSubtotal = data.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    if (Math.abs(calculatedSubtotal - data.subtotal) > 0.01) {
      console.warn('Items total does not match subtotal, using calculated value');
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
