// ShippingCalculator.jsx
// Shipping method selection, zone-based rates, and dimensional weight calculation
// Supports multiple shipping methods and automatic cost calculation

import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Package,
  Plane,
  Ship,
  MapPin,
  Calculator,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Check,
  HelpCircle,
  Globe,
  Building2
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';

// Delivery terms (Incoterms)
const DELIVERY_TERMS = [
  { code: 'EXW', name: 'Ex-Works', description: 'Buyer arranges all shipping' },
  { code: 'FOB', name: 'Free On Board', description: 'Seller delivers to port' },
  { code: 'CIF', name: 'Cost, Insurance & Freight', description: 'Seller pays shipping & insurance' },
  { code: 'DDP', name: 'Delivered Duty Paid', description: 'Seller handles everything' },
  { code: 'DAP', name: 'Delivered At Place', description: 'Seller delivers to destination' }
];

// Shipping methods
const SHIPPING_METHODS = [
  { id: 'sea', name: 'Sea Freight', icon: Ship, estDays: '14-30', color: 'blue' },
  { id: 'air', name: 'Air Freight', icon: Plane, estDays: '3-7', color: 'purple' },
  { id: 'land', name: 'Land Transport', icon: Truck, estDays: '2-5', color: 'green' },
  { id: 'courier', name: 'Courier/Express', icon: Package, estDays: '1-3', color: 'orange' },
  { id: 'pickup', name: 'Self Pickup', icon: Building2, estDays: 'N/A', color: 'gray' }
];

// Dimensional weight divisor (industry standard)
const DIM_WEIGHT_DIVISOR = {
  air: 5000, // cm³ per kg for air freight
  sea: 6000, // cm³ per kg for sea freight
  land: 5000, // cm³ per kg for land transport
  courier: 5000 // cm³ per kg for courier
};

const ShippingCalculator = ({
  currency = 'MYR',
  // Delivery terms
  deliveryTerm = 'EXW',
  onDeliveryTermChange,
  // Shipping method
  shippingMethod = null,
  onShippingMethodChange,
  // Shipping cost
  shippingCost = 0,
  onShippingCostChange,
  // Include shipping in total
  includeShipping = true,
  onIncludeShippingChange,
  // Package dimensions (for calculation)
  packages = [], // Array of { length, width, height, weight, quantity }
  onPackagesChange,
  // Destination
  destinationZone = null, // Zone ID for rate lookup
  destinationCountry = null,
  destinationState = null,
  // Calculated values output
  onCalculatedValues, // ({ actualWeight, dimWeight, chargeableWeight, estimatedCost }) => void
  // Display options
  showDimensionCalculator = true,
  showRateLookup = false,
  disabled = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState(null);

  // Load shipping rates when method or zone changes
  useEffect(() => {
    if (showRateLookup && shippingMethod && destinationZone) {
      loadShippingRates();
    }
  }, [shippingMethod, destinationZone, showRateLookup]);

  const loadShippingRates = async () => {
    if (!shippingMethod || !destinationZone) return;
    
    setLoadingRates(true);
    try {
      const q = query(
        collection(db, 'shippingRates'),
        where('method', '==', shippingMethod),
        where('zoneId', '==', destinationZone),
        where('isActive', '==', true),
        orderBy('minWeight')
      );
      
      const snapshot = await getDocs(q);
      setRates(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      console.error('Error loading shipping rates:', err);
    } finally {
      setLoadingRates(false);
    }
  };

  // Calculate weights from packages
  const weightCalculations = useMemo(() => {
    if (!packages || packages.length === 0) {
      return {
        actualWeight: 0,
        dimWeight: 0,
        chargeableWeight: 0,
        totalVolume: 0
      };
    }

    const divisor = DIM_WEIGHT_DIVISOR[shippingMethod] || 5000;
    
    let actualWeight = 0;
    let dimWeight = 0;
    let totalVolume = 0;

    packages.forEach(pkg => {
      const qty = pkg.quantity || 1;
      const volume = (pkg.length || 0) * (pkg.width || 0) * (pkg.height || 0);
      
      actualWeight += (pkg.weight || 0) * qty;
      totalVolume += volume * qty;
      dimWeight += (volume / divisor) * qty;
    });

    const chargeableWeight = Math.max(actualWeight, dimWeight);

    return {
      actualWeight: Math.round(actualWeight * 100) / 100,
      dimWeight: Math.round(dimWeight * 100) / 100,
      chargeableWeight: Math.round(chargeableWeight * 100) / 100,
      totalVolume: Math.round(totalVolume * 100) / 100
    };
  }, [packages, shippingMethod]);

  // Auto-calculate cost from rates
  useEffect(() => {
    if (rates.length > 0 && weightCalculations.chargeableWeight > 0) {
      const weight = weightCalculations.chargeableWeight;
      const applicableRate = rates.find(r => 
        weight >= r.minWeight && weight <= r.maxWeight
      );
      
      if (applicableRate) {
        const cost = applicableRate.baseRate + (applicableRate.perKgRate * weight);
        setCalculatedCost(Math.round(cost * 100) / 100);
      } else {
        setCalculatedCost(null);
      }
    } else {
      setCalculatedCost(null);
    }
  }, [rates, weightCalculations]);

  // Report calculated values to parent
  useEffect(() => {
    if (onCalculatedValues) {
      onCalculatedValues({
        ...weightCalculations,
        estimatedCost: calculatedCost
      });
    }
  }, [weightCalculations, calculatedCost, onCalculatedValues]);

  const formatCurrency = (amount) => {
    const symbols = { MYR: 'RM', USD: '$', EUR: '€', RMB: '¥', JPY: '¥' };
    return `${symbols[currency] || currency} ${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const handleAddPackage = () => {
    const newPackage = {
      id: Date.now(),
      length: 0,
      width: 0,
      height: 0,
      weight: 0,
      quantity: 1
    };
    onPackagesChange([...packages, newPackage]);
  };

  const handleUpdatePackage = (index, field, value) => {
    const updated = [...packages];
    updated[index] = {
      ...updated[index],
      [field]: parseFloat(value) || 0
    };
    onPackagesChange(updated);
  };

  const handleRemovePackage = (index) => {
    const updated = packages.filter((_, i) => i !== index);
    onPackagesChange(updated);
  };

  const handleUseCalculatedCost = () => {
    if (calculatedCost !== null && onShippingCostChange) {
      onShippingCostChange(calculatedCost);
    }
  };

  const selectedMethodConfig = SHIPPING_METHODS.find(m => m.id === shippingMethod);
  const selectedTermConfig = DELIVERY_TERMS.find(t => t.code === deliveryTerm);

  return (
    <div className="space-y-6">
      {/* Delivery Terms */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Globe className="w-4 h-4" />
          Delivery Terms (Incoterms)
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {DELIVERY_TERMS.map(term => (
            <button
              key={term.code}
              type="button"
              onClick={() => onDeliveryTermChange && onDeliveryTermChange(term.code)}
              disabled={disabled}
              className={`p-3 rounded-lg border text-center transition-colors ${
                deliveryTerm === term.code
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="font-semibold">{term.code}</div>
              <div className="text-xs text-gray-500 mt-1">{term.name}</div>
            </button>
          ))}
        </div>
        
        {selectedTermConfig && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <span className="text-blue-700">
              <strong>{selectedTermConfig.code}:</strong> {selectedTermConfig.description}
            </span>
          </div>
        )}
      </div>
      
      {/* Shipping Method */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Truck className="w-4 h-4" />
          Shipping Method
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {SHIPPING_METHODS.map(method => {
            const Icon = method.icon;
            const colorClasses = {
              blue: 'bg-blue-50 border-blue-500 text-blue-700',
              purple: 'bg-purple-50 border-purple-500 text-purple-700',
              green: 'bg-green-50 border-green-500 text-green-700',
              orange: 'bg-orange-50 border-orange-500 text-orange-700',
              gray: 'bg-gray-50 border-gray-500 text-gray-700'
            };
            
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => onShippingMethodChange && onShippingMethodChange(method.id)}
                disabled={disabled}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  shippingMethod === method.id
                    ? colorClasses[method.color]
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon className="w-5 h-5 mx-auto mb-1" />
                <div className="text-sm font-medium">{method.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {method.estDays !== 'N/A' ? `${method.estDays} days` : 'Customer pickup'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Shipping Cost */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calculator className="w-4 h-4" />
            Shipping Cost
          </label>
          
          {/* Include in Total Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600">Include in Total</span>
            <input
              type="checkbox"
              checked={includeShipping}
              onChange={(e) => onIncludeShippingChange && onIncludeShippingChange(e.target.checked)}
              disabled={disabled}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
          </label>
        </div>
        
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {currency === 'MYR' ? 'RM' : currency}
            </span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={shippingCost || ''}
              onChange={(e) => onShippingCostChange && onShippingCostChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Enter shipping cost"
            />
          </div>
          
          {/* Use Calculated Cost Button */}
          {calculatedCost !== null && calculatedCost !== shippingCost && (
            <button
              type="button"
              onClick={handleUseCalculatedCost}
              disabled={disabled}
              className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 text-sm whitespace-nowrap"
            >
              Use {formatCurrency(calculatedCost)}
            </button>
          )}
        </div>
        
        {/* Quick Amount Buttons */}
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-500 py-1">Quick:</span>
          {[0, 50, 100, 200, 500].map(amount => (
            <button
              key={amount}
              type="button"
              onClick={() => onShippingCostChange && onShippingCostChange(amount)}
              disabled={disabled}
              className={`text-xs px-2 py-1 rounded ${
                shippingCost === amount
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              } disabled:opacity-50`}
            >
              {amount === 0 ? 'Free' : formatCurrency(amount)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              onShippingCostChange && onShippingCostChange(0);
              onIncludeShippingChange && onIncludeShippingChange(false);
            }}
            disabled={disabled}
            className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            Not Quoted
          </button>
        </div>
        
        {/* Included Status */}
        {shippingCost > 0 && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
            includeShipping
              ? 'bg-green-50 text-green-700'
              : 'bg-amber-50 text-amber-700'
          }`}>
            <Info className="w-4 h-4" />
            {includeShipping
              ? `Shipping of ${formatCurrency(shippingCost)} will be added to the quotation total`
              : `Shipping is ${formatCurrency(shippingCost)} - not included in quotation total (separate arrangement)`
            }
          </div>
        )}
      </div>
      
      {/* Dimension Calculator (Advanced) */}
      {showDimensionCalculator && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Package Dimension Calculator
          </button>
          
          {showAdvanced && (
            <div className="space-y-4 bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Package Dimensions</h4>
                <button
                  type="button"
                  onClick={handleAddPackage}
                  disabled={disabled}
                  className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  + Add Package
                </button>
              </div>
              
              {packages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No packages added. Click "Add Package" to calculate dimensional weight.
                </p>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg, index) => (
                    <div key={pkg.id || index} className="bg-white p-3 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Package {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => handleRemovePackage(index)}
                          disabled={disabled}
                          className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">L (cm)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={pkg.length || ''}
                            onChange={(e) => handleUpdatePackage(index, 'length', e.target.value)}
                            disabled={disabled}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">W (cm)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={pkg.width || ''}
                            onChange={(e) => handleUpdatePackage(index, 'width', e.target.value)}
                            disabled={disabled}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">H (cm)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={pkg.height || ''}
                            onChange={(e) => handleUpdatePackage(index, 'height', e.target.value)}
                            disabled={disabled}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Weight (kg)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={pkg.weight || ''}
                            onChange={(e) => handleUpdatePackage(index, 'weight', e.target.value)}
                            disabled={disabled}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Qty</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={pkg.quantity || 1}
                            onChange={(e) => handleUpdatePackage(index, 'quantity', e.target.value)}
                            disabled={disabled}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                            placeholder="1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Weight Calculation Summary */}
              {packages.length > 0 && (weightCalculations.actualWeight > 0 || weightCalculations.dimWeight > 0) && (
                <div className="bg-blue-50 rounded-lg p-3 mt-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Weight Calculation</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-blue-600">Actual Weight</span>
                      <div className="font-medium">{weightCalculations.actualWeight} kg</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Dim. Weight</span>
                      <div className="font-medium">{weightCalculations.dimWeight} kg</div>
                    </div>
                    <div>
                      <span className="text-blue-600">Chargeable</span>
                      <div className="font-semibold text-blue-800">
                        {weightCalculations.chargeableWeight} kg
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-600">Total Volume</span>
                      <div className="font-medium">{weightCalculations.totalVolume.toLocaleString()} cm³</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Chargeable weight is the higher of actual weight and dimensional weight.
                      Dimensional weight = Volume ÷ {DIM_WEIGHT_DIVISOR[shippingMethod] || 5000}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Compact shipping summary for display
export const ShippingSummary = ({ 
  deliveryTerm, 
  shippingMethod, 
  shippingCost, 
  includeShipping,
  currency 
}) => {
  const methodConfig = SHIPPING_METHODS.find(m => m.id === shippingMethod);
  const termConfig = DELIVERY_TERMS.find(t => t.code === deliveryTerm);
  
  const formatCurrency = (amount) => {
    const symbols = { MYR: 'RM', USD: '$', EUR: '€', RMB: '¥', JPY: '¥' };
    return `${symbols[currency] || currency} ${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-gray-600">Delivery Terms</span>
        <span className="font-medium">{termConfig?.code || deliveryTerm}</span>
      </div>
      {methodConfig && (
        <div className="flex justify-between">
          <span className="text-gray-600">Shipping Method</span>
          <span className="font-medium">{methodConfig.name}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span className="text-gray-600">Shipping Cost</span>
        <span className={`font-medium ${!includeShipping ? 'text-gray-400' : ''}`}>
          {shippingCost > 0 ? formatCurrency(shippingCost) : 'Not quoted'}
          {shippingCost > 0 && !includeShipping && ' (excluded)'}
        </span>
      </div>
    </div>
  );
};

export default ShippingCalculator;
