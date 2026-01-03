/**
 * ShippingCalculatorService.js
 * Calculates shipping costs for quotations based on weight, dimensions, destination
 * Part of HiggsFlow Quotation System
 */

import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Singleton instance
let instance = null;

// Default shipping rates (Malaysia)
const DEFAULT_RATES = {
  courier: {
    name: 'Courier (J&T/DHL)',
    zones: {
      local: { // West Malaysia
        baseRate: 8.00,
        perKg: 2.50,
        minCharge: 10.00,
        maxWeight: 30,
        estimatedDays: '1-3'
      },
      regional: { // East Malaysia
        baseRate: 15.00,
        perKg: 4.00,
        minCharge: 20.00,
        maxWeight: 30,
        estimatedDays: '3-5'
      },
      international: { // International
        baseRate: 50.00,
        perKg: 15.00,
        minCharge: 80.00,
        maxWeight: 30,
        estimatedDays: '5-10'
      }
    },
    dimensionalFactor: 5000, // cm³/kg
    fuelSurcharge: 0.10, // 10%
    handlingFee: 5.00
  },
  air: {
    name: 'Air Freight',
    zones: {
      regional: { // ASEAN
        baseRate: 150.00,
        perKg: 8.00,
        minCharge: 200.00,
        maxWeight: 500,
        estimatedDays: '3-5'
      },
      international: { // Global
        baseRate: 250.00,
        perKg: 12.00,
        minCharge: 350.00,
        maxWeight: 1000,
        estimatedDays: '5-7'
      }
    },
    dimensionalFactor: 6000, // cm³/kg
    fuelSurcharge: 0.15, // 15%
    handlingFee: 50.00
  },
  sea: {
    name: 'Sea Freight',
    zones: {
      regional: { // ASEAN
        baseRate: 200.00,
        perCBM: 80.00,
        minCharge: 300.00,
        estimatedDays: '7-14'
      },
      international: { // Global
        baseRate: 400.00,
        perCBM: 120.00,
        minCharge: 600.00,
        estimatedDays: '21-35'
      }
    },
    fuelSurcharge: 0.05, // 5%
    handlingFee: 100.00
  }
};

// Zone mapping by country code
const ZONE_MAPPING = {
  MY: 'local',
  SG: 'regional',
  TH: 'regional',
  ID: 'regional',
  VN: 'regional',
  PH: 'regional',
  BN: 'regional',
  MM: 'regional',
  LA: 'regional',
  KH: 'regional',
  CN: 'international',
  JP: 'international',
  KR: 'international',
  US: 'international',
  GB: 'international',
  DE: 'international',
  AU: 'international'
};

class ShippingCalculatorService {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.ratesCache = null;
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    this.cacheTimestamp = 0;
    
    instance = this;
  }

  /**
   * Calculate shipping for a quotation
   * @param {string} quotationId - Quotation ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} - Shipping calculation result
   */
  async calculateQuotationShipping(quotationId, options = {}) {
    const {
      method = 'courier', // courier, air, sea
      destination = 'local', // local, regional, international
      includeInsurance = false,
      insuranceValue = 0
    } = options;

    // Fetch quotation lines to get dimensions and weights
    const linesQuery = query(
      collection(db, 'quotationLines'),
      where('quotationId', '==', quotationId)
    );
    const linesSnap = await getDocs(linesQuery);
    const lines = linesSnap.docs.map(doc => doc.data());

    // Aggregate weight and dimensions
    const aggregated = this.aggregateLineItems(lines);

    // Calculate shipping
    return this.calculateShipping({
      ...aggregated,
      method,
      destination,
      includeInsurance,
      insuranceValue
    });
  }

  /**
   * Calculate shipping for given parameters
   * @param {Object} params - Shipping parameters
   * @returns {Object} - Shipping calculation result
   */
  async calculateShipping(params) {
    const {
      totalWeight = 0,
      totalVolume = 0,
      dimensions = null,
      method = 'courier',
      destination = 'local',
      includeInsurance = false,
      insuranceValue = 0,
      countryCode = null
    } = params;

    // Load rates
    const rates = await this.loadRates();
    const methodRates = rates[method] || DEFAULT_RATES[method];
    
    if (!methodRates) {
      throw new Error(`Unknown shipping method: ${method}`);
    }

    // Determine zone from country code if provided
    const zone = countryCode 
      ? this.getZoneFromCountry(countryCode)
      : destination;

    const zoneRates = methodRates.zones[zone] || methodRates.zones.international;

    // Calculate chargeable weight
    const chargeableWeight = this.calculateChargeableWeight(
      totalWeight,
      totalVolume,
      methodRates.dimensionalFactor
    );

    // Calculate base cost
    let baseCost = 0;
    
    if (method === 'sea') {
      // Sea freight: per CBM
      const cbm = totalVolume / 1000000; // cm³ to m³
      baseCost = zoneRates.baseRate + (cbm * zoneRates.perCBM);
    } else {
      // Air/Courier: per kg
      baseCost = zoneRates.baseRate + (chargeableWeight * zoneRates.perKg);
    }

    // Apply minimum charge
    baseCost = Math.max(baseCost, zoneRates.minCharge);

    // Add handling fee
    const handlingFee = methodRates.handlingFee || 0;

    // Add fuel surcharge
    const fuelSurcharge = baseCost * (methodRates.fuelSurcharge || 0);

    // Add insurance if requested
    let insuranceCost = 0;
    if (includeInsurance && insuranceValue > 0) {
      insuranceCost = insuranceValue * 0.005; // 0.5% of value
      insuranceCost = Math.max(insuranceCost, 10); // Minimum RM10
    }

    // Calculate total
    const totalCost = baseCost + handlingFee + fuelSurcharge + insuranceCost;

    return {
      method,
      methodName: methodRates.name,
      destination: zone,
      weight: {
        actual: totalWeight,
        dimensional: this.calculateDimensionalWeight(totalVolume, methodRates.dimensionalFactor),
        chargeable: chargeableWeight,
        unit: 'kg'
      },
      volume: {
        total: totalVolume,
        cbm: totalVolume / 1000000,
        unit: 'cm³'
      },
      costs: {
        base: baseCost,
        handling: handlingFee,
        fuelSurcharge,
        insurance: insuranceCost,
        total: totalCost
      },
      currency: 'MYR',
      estimatedDays: zoneRates.estimatedDays,
      breakdown: {
        baseRate: zoneRates.baseRate,
        perKg: zoneRates.perKg,
        perCBM: zoneRates.perCBM,
        fuelSurchargeRate: methodRates.fuelSurcharge,
        insuranceRate: includeInsurance ? 0.005 : 0
      }
    };
  }

  /**
   * Calculate shipping for multiple methods
   */
  async calculateAllMethods(params) {
    const methods = ['courier', 'air', 'sea'];
    const results = {};

    for (const method of methods) {
      try {
        results[method] = await this.calculateShipping({ ...params, method });
      } catch (error) {
        results[method] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * Aggregate line items for shipping calculation
   */
  aggregateLineItems(lines) {
    let totalWeight = 0;
    let totalVolume = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let maxHeight = 0;

    for (const line of lines) {
      const qty = line.quantity || 1;
      
      // Weight
      if (line.weight?.actual) {
        totalWeight += line.weight.actual * qty;
      }

      // Dimensions/Volume
      if (line.dimensions) {
        const { length = 0, width = 0, height = 0 } = line.dimensions;
        const volume = length * width * height * qty;
        totalVolume += volume;

        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    return {
      totalWeight,
      totalVolume,
      dimensions: {
        length: maxLength,
        width: maxWidth,
        height: maxHeight
      },
      itemCount: lines.length
    };
  }

  /**
   * Calculate dimensional weight
   */
  calculateDimensionalWeight(volume, factor = 5000) {
    if (!volume || volume <= 0) return 0;
    return volume / factor;
  }

  /**
   * Calculate chargeable weight (higher of actual vs dimensional)
   */
  calculateChargeableWeight(actualWeight, volume, factor = 5000) {
    const dimensionalWeight = this.calculateDimensionalWeight(volume, factor);
    return Math.max(actualWeight || 0, dimensionalWeight);
  }

  /**
   * Get zone from country code
   */
  getZoneFromCountry(countryCode) {
    return ZONE_MAPPING[countryCode?.toUpperCase()] || 'international';
  }

  /**
   * Load shipping rates from Firestore
   */
  async loadRates(forceRefresh = false) {
    // Return cached if valid
    if (!forceRefresh && this.ratesCache && Date.now() - this.cacheTimestamp < this.cacheExpiry) {
      return this.ratesCache;
    }

    try {
      const ratesRef = doc(db, 'settings', 'shippingRates');
      const ratesSnap = await getDoc(ratesRef);

      if (ratesSnap.exists()) {
        this.ratesCache = {
          ...DEFAULT_RATES,
          ...ratesSnap.data()
        };
      } else {
        this.ratesCache = DEFAULT_RATES;
      }

      this.cacheTimestamp = Date.now();
      return this.ratesCache;
    } catch (error) {
      console.error('Error loading shipping rates:', error);
      return DEFAULT_RATES;
    }
  }

  /**
   * Get available shipping methods
   */
  async getAvailableMethods() {
    const rates = await this.loadRates();
    
    return Object.entries(rates).map(([key, config]) => ({
      id: key,
      name: config.name,
      zones: Object.keys(config.zones),
      estimatedDays: Object.values(config.zones).map(z => z.estimatedDays).join(' / ')
    }));
  }

  /**
   * Get shipping estimate preview (quick estimate without full calculation)
   */
  estimateShippingPreview(weight, volume, method = 'courier', destination = 'local') {
    const rates = DEFAULT_RATES[method];
    if (!rates) return null;

    const zoneRates = rates.zones[destination] || rates.zones.local;
    const chargeableWeight = this.calculateChargeableWeight(weight, volume, rates.dimensionalFactor);
    
    let estimate = zoneRates.baseRate + (chargeableWeight * zoneRates.perKg);
    estimate = Math.max(estimate, zoneRates.minCharge);
    estimate = estimate * (1 + rates.fuelSurcharge) + rates.handlingFee;

    return {
      estimate: Math.round(estimate * 100) / 100,
      currency: 'MYR',
      method: rates.name,
      estimatedDays: zoneRates.estimatedDays
    };
  }

  /**
   * Format shipping display
   */
  formatShippingDisplay(shipping) {
    if (!shipping) return 'TBC';
    if (shipping.included) return 'Included';
    
    return `${shipping.currency} ${shipping.costs?.total?.toFixed(2) || '0.00'}`;
  }

  /**
   * Clear rates cache
   */
  clearCache() {
    this.ratesCache = null;
    this.cacheTimestamp = 0;
  }
}

// Export singleton
export default new ShippingCalculatorService();
export { ShippingCalculatorService };
