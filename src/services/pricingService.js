// src/services/pricingService.js - Enhanced with Cost-Based Markup System (Updated)
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  writeBatch, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc,
  Timestamp 
} from 'firebase/firestore';

export class PricingService {
  // ================================================================
  // EXISTING METHODS - PRESERVED WITH ENHANCEMENTS
  // ================================================================

  /**
   * Main pricing resolution method - Enhanced with markup-based calculations
   * Priority: Client-specific > Tier-based > Calculated Markup > Base product price
   */
  static async resolvePriceForClient(productId, clientId) {
    try {
      // 1. Check for client-specific pricing (highest priority)
      if (clientId) {
        const clientPricing = await this.getClientSpecificPricing(productId, clientId);
        if (clientPricing) {
          return {
            price: clientPricing.finalPrice,
            type: 'client-specific',
            source: 'client_specific_pricing',
            details: clientPricing,
            priority: 1
          };
        }

        // 2. Check for tier-based pricing with markup calculation
        const client = await this.getClient(clientId);
        if (client) {
          const calculatedPricing = await this.calculatePricingForProduct(productId);
          if (calculatedPricing.success) {
            const tierPrice = calculatedPricing.data.tierPrices[client.defaultTierId] || 
                            calculatedPricing.data.tierPrices['tier_1'];
            
            return {
              price: tierPrice.finalPrice,
              type: 'tier-based',
              source: 'calculated_markup',
              tier: client.defaultTierId,
              details: {
                ...calculatedPricing.data,
                selectedTier: tierPrice
              },
              priority: 2
            };
          }
        }
      }

      // 3. Calculate public pricing using markup rules
      const calculatedPricing = await this.calculatePricingForProduct(productId);
      if (calculatedPricing.success) {
        const publicPrice = calculatedPricing.data.tierPrices['tier_0'];
        return {
          price: publicPrice.finalPrice,
          type: 'public',
          source: 'calculated_markup',
          tier: 'tier_0',
          details: calculatedPricing.data,
          priority: 3
        };
      }

      // 4. Last resort: base product price with default markup
      const product = await this.getProduct(productId);
      const fallbackPrice = this.calculateFallbackPrice(product);
      return {
        price: fallbackPrice,
        type: 'fallback',
        source: 'default_markup',
        details: { 
          originalCost: product?.price || 0,
          defaultMarkup: 20,
          fallbackPrice 
        },
        priority: 4
      };

    } catch (error) {
      console.error('Error resolving price:', error);
      return {
        price: 0,
        type: 'error',
        source: null,
        details: { error: error.message },
        priority: 999
      };
    }
  }

  // ================================================================
  // NEW MARKUP-BASED PRICING METHODS
  // ================================================================

  /**
   * Calculate pricing for a product using markup rules
   */
  static async calculatePricingForProduct(productId, overrides = {}) {
    try {
      // 1. Get product data
      const product = await this.getProductById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // 2. Get applicable markup rules
      const markupRules = await this.getApplicableMarkupRules(product);
      
      // 3. Calculate base pricing structure
      const basePricing = this.calculateBasePricing(product, markupRules, overrides);
      
      // 4. Add metadata
      basePricing.calculatedAt = new Date().toISOString();
      basePricing.productId = productId;
      
      return { success: true, data: basePricing };
    } catch (error) {
      console.error('Error calculating pricing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get markup rules applicable to a product
   */
  static async getApplicableMarkupRules(product) {
    try {
      const rulesResult = await this.getMarkupRules();
      if (!rulesResult.success) {
        return [];
      }

      // Filter rules that apply to this product
      const applicableRules = rulesResult.data.filter(rule => {
        return this.doesRuleApply(rule, product);
      });

      // Sort by priority (higher priority first)
      return applicableRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    } catch (error) {
      console.error('Error getting applicable rules:', error);
      return [];
    }
  }

  /**
   * Check if a markup rule applies to a product
   */
  static doesRuleApply(rule, product) {
    switch (rule.type) {
      case 'global':
        return true;
      
      case 'category':
        return rule.categoryId === product.category;
      
      case 'brand':
        return rule.brandName?.toLowerCase() === product.brand?.toLowerCase();
      
      case 'series':
        return rule.seriesName?.toLowerCase() === product.series?.toLowerCase() ||
               product.name?.toLowerCase().includes(rule.seriesName?.toLowerCase());
      
      case 'brand_category':
        return rule.brandName?.toLowerCase() === product.brand?.toLowerCase() &&
               rule.categoryId === product.category;
      
      case 'brand_series':
        return rule.brandName?.toLowerCase() === product.brand?.toLowerCase() &&
               (rule.seriesName?.toLowerCase() === product.series?.toLowerCase() ||
                product.name?.toLowerCase().includes(rule.seriesName?.toLowerCase()));
      
      case 'supplier':
        return rule.supplierId === product.supplierId;

      case 'value_based':
        const cost = this.getProductCost(product);
        return cost >= (rule.minValue || 0) && 
               (rule.maxValue ? cost <= rule.maxValue : true);
      
      default:
        return false;
    }
  }

  /**
   * Get product cost - handles different cost field names
   */
  static getProductCost(product) {
    return product.supplierCost || product.cost || product.price || 0;
  }

  /**
   * Calculate fallback price when markup calculation fails
   */
  static calculateFallbackPrice(product) {
    const cost = this.getProductCost(product);
    if (cost <= 0) {
      return 0; // Return 0 if no valid cost data
    }
    // Apply default 20% markup for fallback
    return Math.round(cost * 1.20 * 100) / 100;
  }

  /**
   * Calculate base pricing using markup rules - FIXED for cost structure
   */
  static calculateBasePricing(product, markupRules, overrides = {}) {
    // Use product.price as the supplier cost since that's your internal cost structure
    const supplierCost = overrides.supplierCost || this.getProductCost(product);
    
    if (supplierCost <= 0) {
      console.warn(`Product ${product.id} has no valid cost data (price: ${product.price}, supplierCost: ${product.supplierCost})`);
      // Return fallback pricing instead of throwing error
      return this.generateFallbackPricing(product);
    }

    // Apply markup rules in priority order
    let currentMarkup = 0;
    const appliedRules = [];

    for (const rule of markupRules) {
      if (rule.combinable || appliedRules.length === 0) {
        currentMarkup += rule.markupPercentage;
        appliedRules.push({
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          markupPercentage: rule.markupPercentage,
          reason: rule.description || `${rule.type} markup`
        });
      } else if (!rule.combinable && rule.priority > (appliedRules[0]?.priority || 0)) {
        // Replace with higher priority non-combinable rule
        currentMarkup = rule.markupPercentage;
        appliedRules.splice(0, appliedRules.length, {
          ruleId: rule.id,
          ruleName: rule.name,
          type: rule.type,
          markupPercentage: rule.markupPercentage,
          reason: rule.description || `${rule.type} markup`
        });
      }
    }

    // Use default markup if no rules applied
    if (appliedRules.length === 0) {
      currentMarkup = 20; // Default 20% markup
      appliedRules.push({
        ruleId: 'default',
        ruleName: 'Default Markup',
        type: 'default',
        markupPercentage: 20,
        reason: 'No specific markup rules found'
      });
    }

    // Calculate prices
    const markupAmount = supplierCost * (currentMarkup / 100);
    const publicPrice = supplierCost + markupAmount;
    
    // Calculate tier-based prices
    const tierPrices = this.calculateTierPrices(publicPrice, product);

    return {
      supplierCost,
      totalMarkupPercentage: currentMarkup,
      markupAmount: Math.round(markupAmount * 100) / 100,
      publicPrice: Math.round(publicPrice * 100) / 100,
      tierPrices,
      appliedRules,
      calculationBreakdown: {
        step1_supplierCost: supplierCost,
        step2_markupPercentage: currentMarkup,
        step3_markupAmount: markupAmount,
        step4_publicPrice: publicPrice,
        step5_roundedPublicPrice: Math.round(publicPrice * 100) / 100
      }
    };
  }

  /**
   * Generate fallback pricing when cost data is invalid
   */
  static generateFallbackPricing(product) {
    const fallbackPrice = 100; // Minimum fallback price
    
    return {
      supplierCost: 0,
      totalMarkupPercentage: 0,
      markupAmount: 0,
      publicPrice: fallbackPrice,
      tierPrices: this.calculateTierPrices(fallbackPrice, product),
      appliedRules: [{
        ruleId: 'fallback',
        ruleName: 'Fallback Pricing',
        type: 'fallback',
        markupPercentage: 0,
        reason: 'No valid cost data available'
      }],
      calculationBreakdown: {
        step1_supplierCost: 0,
        step2_markupPercentage: 0,
        step3_markupAmount: 0,
        step4_publicPrice: fallbackPrice,
        step5_roundedPublicPrice: fallbackPrice
      },
      warning: 'Fallback pricing used due to invalid cost data'
    };
  }

  /**
   * Calculate tier-based prices from public price
   */
  static calculateTierPrices(publicPrice, product) {
    // Default tier discount percentages from public price
    const tierDiscounts = {
      'tier_0': 0,     // Public - no discount
      'tier_1': 5,     // End User - 5% discount
      'tier_2': 15,    // System Integrator - 15% discount  
      'tier_3': 25,    // Trader - 25% discount
      'tier_4': 35     // VIP/Distributor - 35% discount
    };

    const tierPrices = {};
    
    Object.entries(tierDiscounts).forEach(([tierId, discountPercentage]) => {
      const discountAmount = publicPrice * (discountPercentage / 100);
      tierPrices[tierId] = {
        tierId,
        tierName: this.getTierName(tierId),
        discountPercentage,
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalPrice: Math.round((publicPrice - discountAmount) * 100) / 100
      };
    });

    return tierPrices;
  }

  /**
   * Get tier name display
   */
  static getTierName(tierId) {
    const tierNames = {
      'tier_0': 'Public',
      'tier_1': 'End User',
      'tier_2': 'System Integrator',
      'tier_3': 'Trader',
      'tier_4': 'VIP Distributor'
    };
    return tierNames[tierId] || 'Unknown Tier';
  }

  /**
   * Get all markup rules - ENHANCED with error handling
   */
  static async getMarkupRules() {
    try {
      const rulesQuery = query(
        collection(db, 'pricing_markup_rules'),
        where('isActive', '==', true),
        orderBy('priority', 'desc')
      );
      
      const snapshot = await getDocs(rulesQuery);
      const rules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: rules };
    } catch (error) {
      console.error('Error fetching markup rules:', error);
      // Return empty array instead of failing - allows fallback pricing
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create markup rule
   */
  static async createMarkupRule(ruleData) {
    try {
      const ruleRef = doc(collection(db, 'pricing_markup_rules'));
      const rule = {
        ...ruleData,
        id: ruleRef.id,
        isActive: true,
        createdAt: Timestamp.now(),
        lastModified: Timestamp.now()
      };
      
      await setDoc(ruleRef, rule);
      return { success: true, data: rule };
    } catch (error) {
      console.error('Error creating markup rule:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================================================
  // ENHANCED EXISTING METHODS
  // ================================================================

  /**
   * Get product by ID - Enhanced to use doc() for better performance
   */
  static async getProductById(productId) {
    try {
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        return null;
      }

      return {
        id: productId,
        ...productSnap.data()
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  /**
   * Get client-specific pricing with validity checks - PRESERVED
   */
  static async getClientSpecificPricing(productId, clientId) {
    try {
      const q = query(
        collection(db, 'client_specific_pricing'),
        where('productId', '==', productId),
        where('clientId', '==', clientId),
        where('isActive', '==', true),
        orderBy('priority', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const pricing = snapshot.docs[0].data();
        
        // Check validity period
        const now = new Date();
        const validFrom = pricing.validFrom ? new Date(pricing.validFrom) : null;
        const validUntil = pricing.validUntil ? new Date(pricing.validUntil) : null;
        
        if ((!validFrom || now >= validFrom) && (!validUntil || now <= validUntil)) {
          return { id: snapshot.docs[0].id, ...pricing };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting client-specific pricing:', error);
      return null;
    }
  }

  /**
   * Get tier-based pricing for a product - PRESERVED but enhanced
   */
  static async getTierPricing(productId, tierId) {
    try {
      const q = query(
        collection(db, 'product_pricing'),
        where('productId', '==', productId),
        where('tierId', '==', tierId),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      
      // Fallback: calculate using markup rules
      const calculatedPricing = await this.calculatePricingForProduct(productId);
      if (calculatedPricing.success) {
        return calculatedPricing.data.tierPrices[tierId];
      }
      
      return null;
    } catch (error) {
      console.error('Error getting tier pricing:', error);
      return null;
    }
  }

  /**
   * Get client information - PRESERVED
   */
  static async getClient(clientId) {
    try {
      const clientRef = doc(db, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      
      if (!clientSnap.exists()) {
        return null;
      }

      return {
        id: clientId,
        ...clientSnap.data()
      };
    } catch (error) {
      console.error('Error getting client:', error);
      return null;
    }
  }

  /**
   * Get product information - PRESERVED (using legacy method for compatibility)
   */
  static async getProduct(productId) {
    try {
      // Try direct document access first (more efficient)
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        return {
          id: productId,
          ...productSnap.data()
        };
      }

      // Fallback to query method for compatibility
      const q = query(
        collection(db, 'products'),
        where('id', '==', productId)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting product:', error);
      return null;
    }
  }

  /**
   * Get client's price history for a product - PRESERVED
   */
  static async getClientPriceHistory(productId, clientId, limitCount = 5) {
    try {
      const q = query(
        collection(db, 'price_history'),
        where('productId', '==', productId),
        where('clientId', '==', clientId),
        where('isActive', '==', true),
        orderBy('soldDate', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting price history:', error);
      return [];
    }
  }

  /**
   * Import historical prices and create pricing rules - ENHANCED
   */
  static async importHistoricalPrices(clientId, priceData) {
    const batch = writeBatch(db);
    const importedPrices = [];
    
    try {
      for (const priceRecord of priceData) {
        // Validate required fields
        if (!priceRecord.productId || !priceRecord.price || priceRecord.price <= 0) {
          continue;
        }

        // Get product for cost context
        const product = await this.getProductById(priceRecord.productId);
        const productCost = this.getProductCost(product);

        // Add to price history with enhanced tracking
        const historyRef = doc(collection(db, 'price_history'));
        batch.set(historyRef, {
          ...priceRecord,
          clientId,
          sellingPrice: priceRecord.price,
          productCost: productCost,
          margin: productCost > 0 ? priceRecord.price - productCost : 0,
          marginPercentage: productCost > 0 ? 
            (((priceRecord.price - productCost) / productCost) * 100).toFixed(2) : 0,
          createdAt: Timestamp.now(),
          source: 'import',
          isActive: true,
          recordType: 'historical_import'
        });

        // Check if client-specific pricing already exists
        const existingPricing = await this.getClientSpecificPricing(priceRecord.productId, clientId);
        
        if (!existingPricing) {
          // Create client-specific pricing based on historical price
          const pricingRef = doc(collection(db, 'client_specific_pricing'));
          batch.set(pricingRef, {
            clientId,
            productId: priceRecord.productId,
            pricingType: 'historical',
            fixedPrice: priceRecord.price,
            finalPrice: priceRecord.price,
            basedOnHistoryId: historyRef.id,
            lastSoldPrice: priceRecord.price,
            lastSoldDate: priceRecord.soldDate || new Date(),
            
            // Cost context
            productCost: productCost,
            margin: productCost > 0 ? priceRecord.price - productCost : 0,
            marginPercentage: productCost > 0 ? 
              (((priceRecord.price - productCost) / productCost) * 100).toFixed(2) : 0,
            
            priceSource: 'historical',
            autoApproved: true,
            agreementRef: priceRecord.contractRef || 'HISTORICAL',
            validFrom: new Date(),
            notes: `Auto-imported from historical sale. Cost: $${productCost}, Selling: $${priceRecord.price}`,
            isActive: true,
            priority: 2,
            createdAt: Timestamp.now(),
            createdBy: 'system_import'
          });

          importedPrices.push({
            productId: priceRecord.productId,
            price: priceRecord.price,
            margin: productCost > 0 ? priceRecord.price - productCost : 0,
            historyId: historyRef.id
          });
        }
      }

      await batch.commit();
      return { 
        success: true, 
        importedCount: importedPrices.length, 
        importedPrices 
      };
    } catch (error) {
      console.error('Error importing historical prices:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Calculate pricing for multiple products - ENHANCED
   */
  static async resolvePricesForProducts(productIds, clientId) {
    try {
      const results = {};
      
      // Process in batches to avoid overwhelming Firestore
      const batchSize = 10;
      for (let i = 0; i < productIds.length; i += batchSize) {
        const batch = productIds.slice(i, i + batchSize);
        const batchPromises = batch.map(productId => 
          this.resolvePriceForClient(productId, clientId)
        );
        
        const batchResults = await Promise.all(batchPromises);
        
        batch.forEach((productId, index) => {
          results[productId] = batchResults[index];
        });
      }
      
      return results;
    } catch (error) {
      console.error('Error resolving bulk prices:', error);
      return {};
    }
  }

  /**
   * Get pricing statistics for analytics - ENHANCED
   */
  static async getPricingStats() {
    try {
      const stats = {
        totalClients: 0,
        clientsWithSpecialPricing: 0,
        totalPriceHistory: 0,
        activeMarkupRules: 0,
        productsWithCostData: 0,
        averageMarkup: 0
      };

      // Get total clients
      const clientsQuery = query(collection(db, 'clients'), where('isActive', '==', true));
      const clientsSnap = await getDocs(clientsQuery);
      stats.totalClients = clientsSnap.size;

      // Get clients with special pricing
      const specialPricingQuery = query(collection(db, 'client_specific_pricing'), where('isActive', '==', true));
      const specialPricingSnap = await getDocs(specialPricingQuery);
      stats.clientsWithSpecialPricing = new Set(specialPricingSnap.docs.map(doc => doc.data().clientId)).size;

      // Get total price history records
      const historyQuery = query(collection(db, 'price_history'), where('isActive', '==', true));
      const historySnap = await getDocs(historyQuery);
      stats.totalPriceHistory = historySnap.size;

      // Get active markup rules
      const rulesResult = await this.getMarkupRules();
      stats.activeMarkupRules = rulesResult.success ? rulesResult.data.length : 0;

      // Get products with cost data
      const productsQuery = query(collection(db, 'products'));
      const productsSnap = await getDocs(productsQuery);
      let productsWithCost = 0;
      let totalMarkup = 0;
      let markupCount = 0;

      productsSnap.docs.forEach(doc => {
        const product = doc.data();
        const cost = this.getProductCost(product);
        if (cost > 0) {
          productsWithCost++;
        }
        if (product.pricing?.totalMarkupPercentage) {
          totalMarkup += product.pricing.totalMarkupPercentage;
          markupCount++;
        }
      });

      stats.productsWithCostData = productsWithCost;
      stats.averageMarkup = markupCount > 0 ? totalMarkup / markupCount : 0;

      return stats;
    } catch (error) {
      console.error('Error getting pricing stats:', error);
      return {
        totalClients: 0,
        clientsWithSpecialPricing: 0,
        totalPriceHistory: 0,
        activeMarkupRules: 0,
        productsWithCostData: 0,
        averageMarkup: 0
      };
    }
  }

  /**
   * Create or update client-specific pricing - PRESERVED
   */
  static async setClientSpecificPricing(clientId, productId, pricingData) {
    try {
      // Check if pricing already exists
      const existingPricing = await this.getClientSpecificPricing(productId, clientId);
      
      if (existingPricing) {
        // Update existing pricing
        const docRef = doc(db, 'client_specific_pricing', existingPricing.id);
        await updateDoc(docRef, {
          ...pricingData,
          lastModified: Timestamp.now(),
          modifiedBy: 'admin_user' // Replace with actual user ID
        });
        return { success: true, action: 'updated', id: existingPricing.id };
      } else {
        // Create new pricing
        const docRef = await addDoc(collection(db, 'client_specific_pricing'), {
          clientId,
          productId,
          ...pricingData,
          isActive: true,
          priority: 1,
          createdAt: Timestamp.now(),
          createdBy: 'admin_user' // Replace with actual user ID
        });
        return { success: true, action: 'created', id: docRef.id };
      }
    } catch (error) {
      console.error('Error setting client-specific pricing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all pricing for a client - ENHANCED
   */
  static async getClientAllPricing(clientId) {
    try {
      const results = {
        clientSpecific: [],
        tierBased: [],
        calculatedPricing: {},
        client: null
      };

      // Get client info
      results.client = await this.getClient(clientId);

      // Get client-specific pricing
      const clientPricingQuery = query(
        collection(db, 'client_specific_pricing'),
        where('clientId', '==', clientId),
        where('isActive', '==', true)
      );
      const clientPricingSnap = await getDocs(clientPricingQuery);
      results.clientSpecific = clientPricingSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get tier-based pricing for client's tier
      if (results.client?.defaultTierId) {
        const tierPricingQuery = query(
          collection(db, 'product_pricing'),
          where('tierId', '==', results.client.defaultTierId),
          where('isActive', '==', true)
        );
        const tierPricingSnap = await getDocs(tierPricingQuery);
        results.tierBased = tierPricingSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      return results;
    } catch (error) {
      console.error('Error getting client pricing:', error);
      return {
        clientSpecific: [],
        tierBased: [],
        calculatedPricing: {},
        client: null
      };
    }
  }

  // ================================================================
  // NEW BULK OPERATIONS
  // ================================================================

  /**
   * Recalculate pricing for all products
   */
  static async recalculateAllProductPricing() {
    try {
      console.log('Starting bulk price recalculation...');
      
      const productsQuery = collection(db, 'products');
      const snapshot = await getDocs(productsQuery);
      
      const results = {
        total: snapshot.size,
        successful: 0,
        failed: 0,
        errors: []
      };

      for (const productDoc of snapshot.docs) {
        try {
          const productId = productDoc.id;
          const pricingResult = await this.calculatePricingForProduct(productId);
          
          if (pricingResult.success) {
            // Update product with new pricing
            await updateDoc(productDoc.ref, {
              pricing: pricingResult.data,
              pricingLastUpdated: Timestamp.now()
            });
            results.successful++;
          } else {
            results.failed++;
            results.errors.push({
              productId,
              error: pricingResult.error
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            productId: productDoc.id,
            error: error.message
          });
        }
      }

      console.log('Bulk recalculation completed:', results);
      return { success: true, data: results };
    } catch (error) {
      console.error('Error in bulk recalculation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Record price history - ENHANCED with cost context
   */
  static async recordPriceHistory(productId, clientId, priceData, context = {}) {
    try {
      // Get product for cost context
      const product = await this.getProductById(productId);
      const productCost = this.getProductCost(product);

      const historyRef = doc(collection(db, 'price_history'));
      const historyRecord = {
        id: historyRef.id,
        productId,
        clientId,
        supplierCost: productCost,
        sellingPrice: priceData.finalPrice || priceData.price,
        finalPrice: priceData.finalPrice || priceData.price,
        markupPercentage: priceData.totalMarkupPercentage,
        pricingType: priceData.pricingType || priceData.type,
        
        // Enhanced cost context
        productCost: productCost,
        margin: productCost > 0 ? (priceData.finalPrice || priceData.price) - productCost : 0,
        marginPercentage: productCost > 0 ? 
          ((((priceData.finalPrice || priceData.price) - productCost) / productCost) * 100).toFixed(2) : 0,
        
        // Context information
        orderId: context.orderId,
        quotationId: context.quotationId,
        salesRep: context.salesRep,
        
        // Metadata
        recordType: context.recordType || 'quote', // 'quote', 'order', 'sale'
        createdAt: Timestamp.now(),
        source: 'pricing_service',
        isActive: true
      };

      await setDoc(historyRef, historyRecord);
      return { success: true, data: historyRecord };
    } catch (error) {
      console.error('Error recording price history:', error);
      return { success: false, error: error.message };
    }
  }
}
