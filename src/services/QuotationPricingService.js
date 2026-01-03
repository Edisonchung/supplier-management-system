/**
 * PricingService.js
 * 
 * Advanced pricing engine for HiggsFlow Quotation System
 * 
 * Features:
 * - List price book lookups (Grundfos, Graco, etc.)
 * - Nett price retrieval from historical purchases
 * - Client tier-based markup calculations
 * - Multi-currency support (USD, MYR, RMB, EUR, JPY)
 * - AI-powered market price estimation
 * 
 * @version 1.0.0
 * @date January 2026
 */

import { 
  collection, doc, query, where, getDocs, getDoc, 
  setDoc, updateDoc, orderBy, limit, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// CONSTANTS
// ============================================================================

// Default exchange rates (to be updated dynamically)
const DEFAULT_EXCHANGE_RATES = {
  MYR: 1,
  USD: 4.45,
  EUR: 4.85,
  JPY: 0.030,
  RMB: 0.62,
  GBP: 5.65
};

// Brands with list price books
const LIST_PRICE_BRANDS = [
  'Grundfos',
  'Graco',
  'ABB',
  'Siemens',
  'Festo',
  'Danfoss'
];

// Discount categories
const DISCOUNT_CATEGORIES = {
  equipment: 'Equipment',
  spares: 'Spare Parts',
  accessories: 'Accessories',
  consumables: 'Consumables',
  services: 'Services'
};

// ============================================================================
// PRICING SERVICE CLASS
// ============================================================================

class PricingService {
  static instance = null;
  
  // Cache for exchange rates
  exchangeRates = { ...DEFAULT_EXCHANGE_RATES };
  ratesLastUpdated = null;
  
  // Cache for tier pricing
  tierPricingCache = new Map();
  tierCacheExpiry = null;

  static getInstance() {
    if (!PricingService.instance) {
      PricingService.instance = new PricingService();
    }
    return PricingService.instance;
  }

  // ==========================================================================
  // MAIN PRICING CALCULATION
  // ==========================================================================

  /**
   * Calculate complete pricing for a quotation line
   */
  async calculateQuotationLinePricing(lineData, clientTier, quotationCurrency = 'MYR') {
    try {
      const { brand, partNumber, quantity = 1 } = lineData;
      
      let costData = null;
      let pricingSource = lineData.pricingSource || 'manual';
      
      // Determine pricing source and get cost
      if (pricingSource === 'list_price_book' && this.hasListPriceBook(brand)) {
        costData = await this.getListPriceBookCost(brand, partNumber, lineData);
        pricingSource = 'list_price_book';
      } else if (pricingSource === 'nett_price' || pricingSource === 'historical') {
        costData = await this.getNettPriceCost(brand, partNumber);
        pricingSource = costData ? 'nett_price' : 'manual';
      } else if (pricingSource === 'market_estimate') {
        costData = await this.getMarketPriceEstimate(lineData);
        pricingSource = costData ? 'market_estimate' : 'manual';
      }
      
      // If no cost found, use manual entry
      if (!costData && lineData.costPrice) {
        costData = {
          cost: lineData.costPrice,
          currency: lineData.costCurrency || 'MYR',
          source: 'manual'
        };
        pricingSource = 'manual';
      }
      
      // Convert cost to quotation currency
      let costInQuoteCurrency = 0;
      let costInMYR = 0;
      
      if (costData) {
        costInMYR = this.convertToMYR(costData.cost, costData.currency);
        costInQuoteCurrency = this.convertFromMYR(costInMYR, quotationCurrency);
      }
      
      // Get tier markup
      const tierMarkup = await this.getTierMarkup(clientTier, brand, lineData.category);
      
      // Calculate unit price with markup
      const markupMultiplier = 1 + (tierMarkup.appliedMarkup / 100);
      const unitPrice = Math.round(costInQuoteCurrency * markupMultiplier * 100) / 100;
      
      // Calculate line discount
      let lineDiscountAmount = 0;
      if (lineData.lineDiscountType === 'percentage' && lineData.lineDiscountPercentage) {
        lineDiscountAmount = (unitPrice * quantity) * (lineData.lineDiscountPercentage / 100);
      } else if (lineData.lineDiscountType === 'amount') {
        lineDiscountAmount = lineData.lineDiscountAmount || 0;
      }
      
      // Calculate line total
      const lineTotal = (unitPrice * quantity) - lineDiscountAmount;
      
      return {
        // Pricing source
        pricingSource,
        
        // List price info (if applicable)
        listPrice: costData?.listPrice || null,
        listPriceCurrency: costData?.listPriceCurrency || null,
        discountFromList: costData?.discountFromList || null,
        discountCategory: costData?.discountCategory || null,
        discountModelSeries: costData?.discountModelSeries || null,
        discountMarketSegment: costData?.discountMarketSegment || null,
        
        // Nett price info (if applicable)
        nettCost: costData?.nettCost || null,
        nettCostCurrency: costData?.nettCostCurrency || null,
        lastPurchaseDate: costData?.lastPurchaseDate || null,
        lastPurchaseRef: costData?.lastPurchaseRef || null,
        
        // Market estimate (if applicable)
        marketPriceEstimate: costData?.marketPriceEstimate || null,
        
        // Cost prices
        costPrice: Math.round(costInQuoteCurrency * 100) / 100,
        costPriceMYR: Math.round(costInMYR * 100) / 100,
        costCurrency: costData?.currency || quotationCurrency,
        
        // Markup info
        markupType: 'tier_based',
        markupPercentage: tierMarkup.appliedMarkup,
        tierMarkup: {
          tierName: clientTier,
          brandMarkup: tierMarkup.brandMarkup,
          categoryMarkup: tierMarkup.categoryMarkup,
          appliedMarkup: tierMarkup.appliedMarkup
        },
        
        // Unit price
        unitPrice,
        
        // Line discount
        lineDiscountType: lineData.lineDiscountType || 'none',
        lineDiscountPercentage: lineData.lineDiscountPercentage || 0,
        lineDiscountAmount: Math.round(lineDiscountAmount * 100) / 100,
        
        // Line total
        lineTotal: Math.round(lineTotal * 100) / 100,
        
        // Margin info (for internal use)
        margin: Math.round((unitPrice - costInQuoteCurrency) * 100) / 100,
        marginPercentage: costInQuoteCurrency > 0 
          ? Math.round(((unitPrice - costInQuoteCurrency) / costInQuoteCurrency) * 10000) / 100
          : 0
      };
      
    } catch (error) {
      console.error('❌ Error calculating pricing:', error);
      throw error;
    }
  }

  // ==========================================================================
  // LIST PRICE BOOK METHODS
  // ==========================================================================

  /**
   * Check if brand has a list price book
   */
  hasListPriceBook(brand) {
    return LIST_PRICE_BRANDS.some(b => 
      b.toLowerCase() === brand?.toLowerCase()
    );
  }

  /**
   * Get cost from list price book
   */
  async getListPriceBookCost(brand, partNumber, lineData = {}) {
    try {
      // Get active price book for brand
      const priceBookQuery = query(
        collection(db, 'brandPriceBooks'),
        where('brandName', '==', brand),
        where('hasPriceBook', '==', true),
        where('isActive', '!=', false)
      );
      
      const priceBookSnap = await getDocs(priceBookQuery);
      
      if (priceBookSnap.empty) {
        console.log(`No price book found for brand: ${brand}`);
        return null;
      }
      
      const priceBook = priceBookSnap.docs[0].data();
      
      // Look up product list price
      // First try products catalog
      const productQuery = query(
        collection(db, 'products'),
        where('brand', '==', brand),
        where('partNumber', '==', partNumber)
      );
      
      const productSnap = await getDocs(productQuery);
      
      let listPrice = null;
      if (!productSnap.empty) {
        const product = productSnap.docs[0].data();
        listPrice = product.listPrice || product.price;
      }
      
      // If no product found, check price book entries
      if (!listPrice && priceBook.priceEntries) {
        const entry = priceBook.priceEntries.find(e => e.partNumber === partNumber);
        listPrice = entry?.listPrice;
      }
      
      if (!listPrice) {
        console.log(`No list price found for: ${brand} - ${partNumber}`);
        return null;
      }
      
      // Determine applicable discount
      const discount = this.calculateListPriceDiscount(priceBook, lineData);
      
      // Calculate nett cost after discount
      const nettCost = listPrice * (1 - discount.totalDiscount / 100);
      
      return {
        source: 'list_price_book',
        listPrice,
        listPriceCurrency: priceBook.currency || 'USD',
        discountFromList: discount.totalDiscount,
        discountCategory: discount.categoryDiscount?.name,
        discountModelSeries: discount.seriesDiscount?.series,
        discountMarketSegment: discount.segmentDiscount?.segment,
        cost: nettCost,
        currency: priceBook.currency || 'USD'
      };
      
    } catch (error) {
      console.error('❌ Error getting list price:', error);
      return null;
    }
  }

  /**
   * Calculate applicable discount from list price
   */
  calculateListPriceDiscount(priceBook, lineData) {
    const discountStructure = priceBook.discountStructure || {};
    let totalDiscount = 0;
    let appliedDiscounts = [];
    
    // 1. Category discount
    const category = lineData.discountCategory || 'equipment';
    const categoryDiscount = discountStructure.byCategory?.[category] || 0;
    if (categoryDiscount > 0) {
      appliedDiscounts.push({ type: 'category', name: category, discount: categoryDiscount });
    }
    
    // 2. Model series discount (override or additional)
    let seriesDiscount = null;
    if (lineData.discountModelSeries && discountStructure.byModelSeries) {
      seriesDiscount = discountStructure.byModelSeries.find(
        s => s.series === lineData.discountModelSeries
      );
      if (seriesDiscount) {
        appliedDiscounts.push({ 
          type: 'series', 
          series: seriesDiscount.series, 
          discount: seriesDiscount.discount 
        });
      }
    }
    
    // 3. Market segment discount (additional)
    let segmentDiscount = null;
    if (lineData.discountMarketSegment && discountStructure.byMarketSegment) {
      segmentDiscount = discountStructure.byMarketSegment.find(
        s => s.segment === lineData.discountMarketSegment
      );
      if (segmentDiscount) {
        appliedDiscounts.push({ 
          type: 'segment', 
          segment: segmentDiscount.segment, 
          discount: segmentDiscount.discount 
        });
      }
    }
    
    // Calculate total discount
    // Use series discount if available (it overrides category)
    // Then add segment discount
    if (seriesDiscount) {
      totalDiscount = seriesDiscount.discount;
    } else {
      totalDiscount = categoryDiscount;
    }
    
    // Add segment discount on top
    if (segmentDiscount) {
      // Compound discount calculation
      totalDiscount = totalDiscount + (segmentDiscount.discount * (1 - totalDiscount / 100));
    }
    
    return {
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      categoryDiscount: appliedDiscounts.find(d => d.type === 'category'),
      seriesDiscount,
      segmentDiscount,
      appliedDiscounts
    };
  }

  // ==========================================================================
  // NETT PRICE METHODS
  // ==========================================================================

  /**
   * Get nett price from historical purchases
   */
  async getNettPriceCost(brand, partNumber) {
    try {
      // First check brand price books for stored nett prices
      const priceBookQuery = query(
        collection(db, 'brandPriceBooks'),
        where('brandName', '==', brand)
      );
      
      const priceBookSnap = await getDocs(priceBookQuery);
      
      if (!priceBookSnap.empty) {
        const priceBook = priceBookSnap.docs[0].data();
        
        // Check nett price map
        if (priceBook.nettPriceMap?.[partNumber]) {
          const nettPrice = priceBook.nettPriceMap[partNumber];
          return {
            source: 'nett_price',
            nettCost: nettPrice.cost,
            nettCostCurrency: nettPrice.currency,
            lastPurchaseDate: nettPrice.lastUpdated,
            cost: nettPrice.cost,
            currency: nettPrice.currency
          };
        }
        
        // Check nett prices array
        const nettEntry = priceBook.nettPrices?.find(p => p.partNumber === partNumber);
        if (nettEntry) {
          return {
            source: 'nett_price',
            nettCost: nettEntry.nettCost,
            nettCostCurrency: nettEntry.currency,
            lastPurchaseDate: nettEntry.lastPurchased,
            lastPurchaseRef: nettEntry.purchaseRef,
            cost: nettEntry.nettCost,
            currency: nettEntry.currency
          };
        }
      }
      
      // Fallback: Check PI history
      const piItemsQuery = query(
        collection(db, 'piItems'),
        where('brand', '==', brand),
        where('partNumber', '==', partNumber),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const piItemsSnap = await getDocs(piItemsQuery);
      
      if (!piItemsSnap.empty) {
        const lastPurchase = piItemsSnap.docs[0].data();
        return {
          source: 'historical_pi',
          nettCost: lastPurchase.unitPrice,
          nettCostCurrency: lastPurchase.currency || 'USD',
          lastPurchaseDate: lastPurchase.createdAt,
          lastPurchaseRef: lastPurchase.piNumber,
          cost: lastPurchase.unitPrice,
          currency: lastPurchase.currency || 'USD'
        };
      }
      
      // No nett price found
      return null;
      
    } catch (error) {
      console.error('❌ Error getting nett price:', error);
      return null;
    }
  }

  /**
   * Record new nett price from purchase
   */
  async recordNettPrice(brand, partNumber, cost, currency, purchaseRef, supplier) {
    try {
      // Find or create brand price book
      const priceBookQuery = query(
        collection(db, 'brandPriceBooks'),
        where('brandName', '==', brand)
      );
      
      const priceBookSnap = await getDocs(priceBookQuery);
      
      if (priceBookSnap.empty) {
        // Create new price book for this brand
        const newPriceBookId = `${brand.toLowerCase().replace(/\s+/g, '-')}-pricebook`;
        await setDoc(doc(db, 'brandPriceBooks', newPriceBookId), {
          brandName: brand,
          hasPriceBook: false, // No list price book
          currency: currency || 'USD',
          nettPrices: [{
            partNumber,
            nettCost: cost,
            currency: currency || 'USD',
            lastPurchased: serverTimestamp(),
            purchaseRef,
            supplier
          }],
          nettPriceMap: {
            [partNumber]: {
              cost,
              currency: currency || 'USD',
              lastUpdated: Timestamp.now()
            }
          },
          createdAt: serverTimestamp()
        });
      } else {
        // Update existing price book
        const priceBookRef = priceBookSnap.docs[0].ref;
        const priceBook = priceBookSnap.docs[0].data();
        
        // Update nett prices array
        const nettPrices = priceBook.nettPrices || [];
        const existingIndex = nettPrices.findIndex(p => p.partNumber === partNumber);
        
        if (existingIndex >= 0) {
          nettPrices[existingIndex] = {
            ...nettPrices[existingIndex],
            nettCost: cost,
            currency: currency || 'USD',
            lastPurchased: serverTimestamp(),
            purchaseRef,
            supplier
          };
        } else {
          nettPrices.push({
            partNumber,
            nettCost: cost,
            currency: currency || 'USD',
            lastPurchased: serverTimestamp(),
            purchaseRef,
            supplier
          });
        }
        
        // Update nett price map
        const nettPriceMap = priceBook.nettPriceMap || {};
        nettPriceMap[partNumber] = {
          cost,
          currency: currency || 'USD',
          lastUpdated: Timestamp.now()
        };
        
        await updateDoc(priceBookRef, {
          nettPrices,
          nettPriceMap,
          updatedAt: serverTimestamp()
        });
      }
      
      console.log('✅ Nett price recorded:', brand, partNumber, cost, currency);
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error recording nett price:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // MARKET PRICE ESTIMATION (AI)
  // ==========================================================================

  /**
   * Get AI-powered market price estimate
   */
  async getMarketPriceEstimate(lineData) {
    try {
      const response = await fetch('/api/ai/estimate-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: lineData.brand,
          partNumber: lineData.partNumber,
          description: lineData.description,
          category: lineData.category,
          specifications: lineData.technicalSpecs
        })
      });
      
      if (!response.ok) {
        console.log('Price estimation API not available');
        return null;
      }
      
      const result = await response.json();
      
      if (result.success && result.priceRange) {
        return {
          source: 'market_estimate',
          marketPriceEstimate: {
            low: result.priceRange.low,
            mid: result.priceRange.mid,
            high: result.priceRange.high,
            currency: result.priceRange.currency || 'USD',
            confidence: result.confidence,
            source: 'ai_estimate',
            estimatedAt: new Date().toISOString()
          },
          cost: result.priceRange.mid,
          currency: result.priceRange.currency || 'USD'
        };
      }
      
      return null;
      
    } catch (error) {
      console.error('Market price estimation failed:', error);
      return null;
    }
  }

  // ==========================================================================
  // TIER MARKUP METHODS
  // ==========================================================================

  /**
   * Get tier-based markup for client
   */
  async getTierMarkup(tierName, brand, category) {
    try {
      // Check cache
      const cacheKey = `${tierName}-${brand}-${category}`;
      if (this.tierPricingCache.has(cacheKey) && this.tierCacheExpiry > Date.now()) {
        return this.tierPricingCache.get(cacheKey);
      }
      
      // Query tier pricing configuration
      const tierQuery = query(
        collection(db, 'clientTierPricing'),
        where('tierName', '==', tierName),
        where('isActive', '!=', false)
      );
      
      const tierSnap = await getDocs(tierQuery);
      
      if (tierSnap.empty) {
        // Return default markup
        const defaultMarkup = this.getDefaultTierMarkup(tierName);
        return {
          tierName,
          brandMarkup: 0,
          categoryMarkup: 0,
          appliedMarkup: defaultMarkup
        };
      }
      
      const tierConfig = tierSnap.docs[0].data();
      
      // Check for brand-specific markup
      let brandMarkup = 0;
      if (brand && tierConfig.brandMarkups) {
        const brandConfig = tierConfig.brandMarkups.find(
          b => b.brandName?.toLowerCase() === brand?.toLowerCase()
        );
        if (brandConfig) {
          brandMarkup = brandConfig.markupPercentage;
        }
      }
      
      // Check for category-specific markup
      let categoryMarkup = 0;
      if (category && tierConfig.categoryMarkups) {
        const categoryConfig = tierConfig.categoryMarkups.find(
          c => c.category?.toLowerCase() === category?.toLowerCase()
        );
        if (categoryConfig) {
          categoryMarkup = categoryConfig.markupPercentage;
        }
      }
      
      // Determine applied markup (priority: brand > category > default)
      let appliedMarkup = tierConfig.defaultMarkup || 30;
      if (brandMarkup > 0) {
        appliedMarkup = brandMarkup;
      } else if (categoryMarkup > 0) {
        appliedMarkup = categoryMarkup;
      }
      
      const result = {
        tierName,
        brandMarkup,
        categoryMarkup,
        appliedMarkup,
        maxLineDiscount: tierConfig.maxLineDiscount,
        maxOverallDiscount: tierConfig.maxOverallDiscount,
        requiresApprovalAbove: tierConfig.requiresApprovalAbove
      };
      
      // Cache result
      this.tierPricingCache.set(cacheKey, result);
      this.tierCacheExpiry = Date.now() + (5 * 60 * 1000); // 5 minute cache
      
      return result;
      
    } catch (error) {
      console.error('❌ Error getting tier markup:', error);
      return {
        tierName,
        brandMarkup: 0,
        categoryMarkup: 0,
        appliedMarkup: this.getDefaultTierMarkup(tierName)
      };
    }
  }

  /**
   * Get default markup for tier
   */
  getDefaultTierMarkup(tierName) {
    const defaults = {
      end_user: 40,
      contractor: 30,
      trader: 25,
      si: 20,
      partner: 15,
      dealer: 10,
      oem: 12
    };
    return defaults[tierName] || 30;
  }

  // ==========================================================================
  // CURRENCY CONVERSION
  // ==========================================================================

  /**
   * Convert amount to MYR
   */
  convertToMYR(amount, fromCurrency) {
    if (!amount || fromCurrency === 'MYR') return amount;
    const rate = this.exchangeRates[fromCurrency] || 1;
    return Math.round(amount * rate * 100) / 100;
  }

  /**
   * Convert amount from MYR to target currency
   */
  convertFromMYR(amountMYR, toCurrency) {
    if (!amountMYR || toCurrency === 'MYR') return amountMYR;
    const rate = this.exchangeRates[toCurrency] || 1;
    return Math.round((amountMYR / rate) * 100) / 100;
  }

  /**
   * Convert between any currencies
   */
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount;
    const amountMYR = this.convertToMYR(amount, fromCurrency);
    return this.convertFromMYR(amountMYR, toCurrency);
  }

  /**
   * Update exchange rates from Firestore or API
   */
  async updateExchangeRates() {
    try {
      // First try Firestore
      const ratesDoc = await getDoc(doc(db, 'settings', 'exchangeRates'));
      
      if (ratesDoc.exists() && ratesDoc.data().rates) {
        this.exchangeRates = { ...DEFAULT_EXCHANGE_RATES, ...ratesDoc.data().rates };
        this.ratesLastUpdated = ratesDoc.data().updatedAt?.toDate();
        console.log('✅ Exchange rates updated from Firestore');
        return;
      }
      
      // Could integrate with external API here
      // For now, use defaults
      console.log('Using default exchange rates');
      
    } catch (error) {
      console.error('❌ Error updating exchange rates:', error);
    }
  }

  /**
   * Get current exchange rates
   */
  getExchangeRates() {
    return { ...this.exchangeRates };
  }

  // ==========================================================================
  // BULK PRICING OPERATIONS
  // ==========================================================================

  /**
   * Calculate pricing for multiple lines
   */
  async calculateBulkPricing(lines, clientTier, quotationCurrency = 'MYR') {
    const results = [];
    
    for (const line of lines) {
      try {
        const pricing = await this.calculateQuotationLinePricing(
          line, 
          clientTier, 
          quotationCurrency
        );
        results.push({
          lineId: line.id,
          partNumber: line.partNumber,
          success: true,
          pricing
        });
      } catch (error) {
        results.push({
          lineId: line.id,
          partNumber: line.partNumber,
          success: false,
          error: error.message
        });
      }
      
      // Small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  // ==========================================================================
  // PRICE BOOK MANAGEMENT
  // ==========================================================================

  /**
   * Import price book from Excel/CSV
   */
  async importPriceBook(brand, data, currency, options = {}) {
    try {
      const priceBookId = `${brand.toLowerCase().replace(/\s+/g, '-')}-pricebook`;
      
      // Process entries
      const priceEntries = data.map(row => ({
        partNumber: row.partNumber || row.sku || row.itemCode,
        description: row.description || row.name,
        listPrice: parseFloat(row.listPrice || row.price) || 0,
        category: row.category || 'equipment'
      }));
      
      // Build nett price map
      const nettPriceMap = {};
      if (options.includeNettPrices) {
        data.forEach(row => {
          if (row.nettPrice) {
            const partNumber = row.partNumber || row.sku || row.itemCode;
            nettPriceMap[partNumber] = {
              cost: parseFloat(row.nettPrice),
              currency,
              lastUpdated: Timestamp.now()
            };
          }
        });
      }
      
      // Create or update price book
      await setDoc(doc(db, 'brandPriceBooks', priceBookId), {
        brandId: priceBookId,
        brandName: brand,
        priceBookVersion: options.version || new Date().toISOString().split('T')[0],
        effectiveFrom: options.effectiveFrom || serverTimestamp(),
        effectiveTo: options.effectiveTo || null,
        currency,
        hasPriceBook: true,
        priceEntries,
        nettPriceMap: Object.keys(nettPriceMap).length > 0 ? nettPriceMap : {},
        discountStructure: options.discountStructure || {
          byCategory: {
            equipment: 30,
            spares: 25,
            accessories: 25,
            services: 10
          },
          byModelSeries: [],
          byMarketSegment: []
        },
        uploadedBy: options.uploadedBy,
        uploadedAt: serverTimestamp(),
        source: options.source || 'import'
      }, { merge: true });
      
      console.log(`✅ Price book imported for ${brand}:`, priceEntries.length, 'entries');
      
      return { 
        success: true, 
        data: { 
          entriesCount: priceEntries.length,
          nettPricesCount: Object.keys(nettPriceMap).length
        } 
      };
      
    } catch (error) {
      console.error('❌ Error importing price book:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // CLEAR CACHE
  // ==========================================================================

  clearCache() {
    this.tierPricingCache.clear();
    this.tierCacheExpiry = null;
    console.log('🗑️ PricingService cache cleared');
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const pricingService = PricingService.getInstance();
export default pricingService;
