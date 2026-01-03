// DiscountCalculator.jsx
// Overall discount and tax calculation component for quotation pricing section
// Supports percentage and fixed discounts, SST/tax calculations

import React, { useState, useEffect, useMemo } from 'react';
import {
  Percent,
  DollarSign,
  Calculator,
  Info,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const DiscountCalculator = ({
  subtotal = 0,
  currency = 'MYR',
  // Discount props
  discountType = 'none', // none, percentage, fixed
  discountValue = 0,
  onDiscountChange, // ({ type, value }) => void
  // Tax props
  taxType = 'none', // none, sst, custom
  taxRate = 0, // percentage
  taxInclusive = false, // true = price includes tax, false = add tax on top
  onTaxChange, // ({ type, rate, inclusive }) => void
  // Calculated values output
  onTotalsCalculated, // ({ discount, taxableAmount, tax, grandTotal }) => void
  // Display options
  showBreakdown = true,
  disabled = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // SST rate for Malaysia (as of 2024)
  const SST_RATE = 8;

  // Calculate discount amount
  const discountAmount = useMemo(() => {
    if (discountType === 'none' || !discountValue) return 0;
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal); // Fixed amount, capped at subtotal
  }, [discountType, discountValue, subtotal]);

  // Calculate taxable amount (after discount)
  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Calculate effective tax rate
  const effectiveTaxRate = useMemo(() => {
    if (taxType === 'none') return 0;
    if (taxType === 'sst') return SST_RATE;
    return taxRate || 0;
  }, [taxType, taxRate]);

  // Calculate tax amount
  const taxAmount = useMemo(() => {
    if (effectiveTaxRate === 0) return 0;
    
    if (taxInclusive) {
      // Price includes tax - extract tax from taxable amount
      return taxableAmount - (taxableAmount / (1 + effectiveTaxRate / 100));
    } else {
      // Add tax on top
      return (taxableAmount * effectiveTaxRate) / 100;
    }
  }, [taxableAmount, effectiveTaxRate, taxInclusive]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    if (taxInclusive) {
      // Tax is already included in the price
      return taxableAmount;
    } else {
      return taxableAmount + taxAmount;
    }
  }, [taxableAmount, taxAmount, taxInclusive]);

  // Report calculated values to parent
  useEffect(() => {
    if (onTotalsCalculated) {
      onTotalsCalculated({
        discount: discountAmount,
        taxableAmount,
        tax: taxAmount,
        taxRate: effectiveTaxRate,
        grandTotal
      });
    }
  }, [discountAmount, taxableAmount, taxAmount, effectiveTaxRate, grandTotal, onTotalsCalculated]);

  const formatCurrency = (amount) => {
    const symbols = { MYR: 'RM', USD: '$', EUR: '€', RMB: '¥', JPY: '¥' };
    const symbol = symbols[currency] || currency;
    return `${symbol} ${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const handleDiscountTypeChange = (type) => {
    if (onDiscountChange) {
      onDiscountChange({
        type,
        value: type === 'none' ? 0 : discountValue
      });
    }
  };

  const handleDiscountValueChange = (value) => {
    const numValue = parseFloat(value) || 0;
    // Cap percentage at 100
    const cappedValue = discountType === 'percentage' ? Math.min(numValue, 100) : numValue;
    if (onDiscountChange) {
      onDiscountChange({
        type: discountType,
        value: cappedValue
      });
    }
  };

  const handleTaxTypeChange = (type) => {
    if (onTaxChange) {
      onTaxChange({
        type,
        rate: type === 'sst' ? SST_RATE : (type === 'none' ? 0 : taxRate),
        inclusive: taxInclusive
      });
    }
  };

  const handleTaxRateChange = (rate) => {
    const numRate = parseFloat(rate) || 0;
    if (onTaxChange) {
      onTaxChange({
        type: taxType,
        rate: Math.min(numRate, 100),
        inclusive: taxInclusive
      });
    }
  };

  const handleTaxInclusiveChange = (inclusive) => {
    if (onTaxChange) {
      onTaxChange({
        type: taxType,
        rate: effectiveTaxRate,
        inclusive
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Discount Section */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Percent className="w-4 h-4" />
          Overall Discount
        </label>
        
        {/* Discount Type Selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleDiscountTypeChange('none')}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              discountType === 'none'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            No Discount
          </button>
          <button
            type="button"
            onClick={() => handleDiscountTypeChange('percentage')}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              discountType === 'percentage'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Percent className="w-4 h-4 inline mr-1" />
            Percentage
          </button>
          <button
            type="button"
            onClick={() => handleDiscountTypeChange('fixed')}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              discountType === 'fixed'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <DollarSign className="w-4 h-4 inline mr-1" />
            Fixed Amount
          </button>
        </div>
        
        {/* Discount Value Input */}
        {discountType !== 'none' && (
          <div className="relative">
            <input
              type="number"
              min="0"
              max={discountType === 'percentage' ? 100 : subtotal}
              step={discountType === 'percentage' ? 0.5 : 1}
              value={discountValue || ''}
              onChange={(e) => handleDiscountValueChange(e.target.value)}
              disabled={disabled}
              className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder={discountType === 'percentage' ? 'Enter discount %' : 'Enter discount amount'}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              {discountType === 'percentage' ? '%' : currency}
            </span>
          </div>
        )}
        
        {/* Discount Preview */}
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm bg-green-50 text-green-700 px-3 py-2 rounded-lg">
            <span>Discount Applied:</span>
            <span className="font-medium">
              -{formatCurrency(discountAmount)}
              {discountType === 'percentage' && (
                <span className="text-green-600 ml-1">({discountValue}%)</span>
              )}
            </span>
          </div>
        )}
      </div>
      
      {/* Tax Section */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Calculator className="w-4 h-4" />
          Tax / SST
        </label>
        
        {/* Tax Type Selector */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTaxTypeChange('none')}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              taxType === 'none'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            No Tax
          </button>
          <button
            type="button"
            onClick={() => handleTaxTypeChange('sst')}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              taxType === 'sst'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            SST ({SST_RATE}%)
          </button>
          <button
            type="button"
            onClick={() => handleTaxTypeChange('custom')}
            disabled={disabled}
            className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
              taxType === 'custom'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Custom Rate
          </button>
        </div>
        
        {/* Custom Tax Rate Input */}
        {taxType === 'custom' && (
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={taxRate || ''}
              onChange={(e) => handleTaxRateChange(e.target.value)}
              disabled={disabled}
              className="w-full pl-4 pr-12 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
              placeholder="Enter tax rate"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
        )}
        
        {/* Tax Inclusive Toggle */}
        {taxType !== 'none' && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Tax Inclusive Pricing</span>
              <div className="group relative">
                <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <p className="mb-1"><strong>Tax Inclusive:</strong> Prices already include tax. Tax amount will be extracted from the total.</p>
                  <p><strong>Tax Exclusive:</strong> Tax will be added on top of the prices.</p>
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={taxInclusive}
                onChange={(e) => handleTaxInclusiveChange(e.target.checked)}
                disabled={disabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        )}
        
        {/* Tax Preview */}
        {effectiveTaxRate > 0 && (
          <div className="flex items-center justify-between text-sm bg-blue-50 text-blue-700 px-3 py-2 rounded-lg">
            <span>
              Tax ({effectiveTaxRate}%{taxInclusive ? ' inclusive' : ''}):
            </span>
            <span className="font-medium">
              {taxInclusive ? 'Included: ' : '+'}
              {formatCurrency(taxAmount)}
            </span>
          </div>
        )}
      </div>
      
      {/* Breakdown Summary */}
      {showBreakdown && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-3"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {showAdvanced ? 'Hide' : 'Show'} Calculation Breakdown
          </button>
          
          {showAdvanced && (
            <div className="space-y-2 text-sm bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Discount
                    {discountType === 'percentage' && ` (${discountValue}%)`}
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="text-gray-600">
                  {taxInclusive ? 'Amount (Tax Inclusive)' : 'Taxable Amount'}
                </span>
                <span className="font-medium">{formatCurrency(taxableAmount)}</span>
              </div>
              
              {effectiveTaxRate > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>
                    {taxType === 'sst' ? 'SST' : 'Tax'} ({effectiveTaxRate}%)
                    {taxInclusive && ' (included)'}
                  </span>
                  <span>
                    {taxInclusive ? '' : '+'}
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-semibold">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            handleDiscountTypeChange('percentage');
            handleDiscountValueChange(5);
          }}
          disabled={disabled}
          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          5% off
        </button>
        <button
          type="button"
          onClick={() => {
            handleDiscountTypeChange('percentage');
            handleDiscountValueChange(10);
          }}
          disabled={disabled}
          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          10% off
        </button>
        <button
          type="button"
          onClick={() => {
            handleDiscountTypeChange('percentage');
            handleDiscountValueChange(15);
          }}
          disabled={disabled}
          className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
        >
          15% off
        </button>
        <div className="flex-1" />
        {(discountType !== 'none' || taxType !== 'none') && (
          <button
            type="button"
            onClick={() => {
              handleDiscountTypeChange('none');
              handleTaxTypeChange('none');
            }}
            disabled={disabled}
            className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
};

// Compact inline version for summary display
export const DiscountSummary = ({ discount, discountType, tax, taxRate, currency }) => {
  const formatCurrency = (amount) => {
    const symbols = { MYR: 'RM', USD: '$', EUR: '€', RMB: '¥', JPY: '¥' };
    return `${symbols[currency] || currency} ${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  return (
    <div className="space-y-1 text-sm">
      {discount > 0 && (
        <div className="flex justify-between text-green-600">
          <span>Discount{discountType === 'percentage' ? ' (%)' : ''}</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      {tax > 0 && (
        <div className="flex justify-between text-gray-600">
          <span>Tax ({taxRate}%)</span>
          <span>+{formatCurrency(tax)}</span>
        </div>
      )}
    </div>
  );
};

export default DiscountCalculator;
