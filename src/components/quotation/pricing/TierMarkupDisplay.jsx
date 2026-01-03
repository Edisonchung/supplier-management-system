import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, TrendingUp, Info, ChevronDown, ChevronUp,
  DollarSign, Percent, Award, Building2, Package,
  Calculator, AlertCircle, Check
} from 'lucide-react';

/**
 * TierMarkupDisplay - Display client tier-based markup and pricing breakdown
 * 
 * Features:
 * - Visual tier indicator
 * - Markup percentage display
 * - Price breakdown calculation
 * - Tier comparison view
 * - Margin analysis
 */
const TierMarkupDisplay = ({
  clientTier = 'end_user',
  costPrice = 0,
  nettPrice = 0,
  listPrice = 0,
  currentSellingPrice = 0,
  currency = 'MYR',
  showBreakdown = true,
  showComparison = false,
  onTierChange,
  readOnly = false,
  className = ''
}) => {
  // State
  const [showDetails, setShowDetails] = useState(false);
  const [showTierComparison, setShowTierComparison] = useState(showComparison);

  // Tier configurations with markup percentages
  const tierConfig = {
    end_user: {
      name: 'End User',
      markup: 40,
      icon: Users,
      color: 'blue',
      description: 'Direct end customer'
    },
    contractor: {
      name: 'Contractor',
      markup: 30,
      icon: Building2,
      color: 'green',
      description: 'Project contractors'
    },
    trader: {
      name: 'Trader',
      markup: 25,
      icon: Package,
      color: 'amber',
      description: 'Trading companies'
    },
    system_integrator: {
      name: 'System Integrator',
      markup: 20,
      icon: TrendingUp,
      color: 'purple',
      description: 'SI/OEM partners'
    },
    partner: {
      name: 'Partner',
      markup: 15,
      icon: Award,
      color: 'pink',
      description: 'Strategic partners'
    },
    dealer: {
      name: 'Dealer',
      markup: 10,
      icon: Award,
      color: 'orange',
      description: 'Authorized dealers'
    }
  };

  // Get current tier info
  const currentTierInfo = tierConfig[clientTier] || tierConfig.end_user;

  // Calculate prices based on tier
  const calculatePricing = useMemo(() => {
    // Determine base price (use nett price if available, otherwise cost)
    const basePrice = nettPrice > 0 ? nettPrice : costPrice;
    
    if (basePrice <= 0) {
      return {
        basePrice: 0,
        markupAmount: 0,
        sellingPrice: currentSellingPrice || 0,
        grossMargin: 0,
        grossMarginPercent: 0,
        tierMarkup: currentTierInfo.markup
      };
    }

    // Calculate selling price based on tier markup
    const tierMarkup = currentTierInfo.markup / 100;
    const calculatedSellingPrice = basePrice * (1 + tierMarkup);
    const actualSellingPrice = currentSellingPrice > 0 ? currentSellingPrice : calculatedSellingPrice;

    // Calculate margins
    const markupAmount = actualSellingPrice - basePrice;
    const grossMargin = actualSellingPrice - (costPrice > 0 ? costPrice : basePrice);
    const grossMarginPercent = actualSellingPrice > 0 
      ? (grossMargin / actualSellingPrice) * 100 
      : 0;

    // Calculate deviation from recommended price
    const recommendedPrice = calculatedSellingPrice;
    const priceDeviation = actualSellingPrice - recommendedPrice;
    const priceDeviationPercent = recommendedPrice > 0 
      ? (priceDeviation / recommendedPrice) * 100 
      : 0;

    return {
      basePrice,
      markupAmount,
      sellingPrice: actualSellingPrice,
      recommendedPrice,
      grossMargin,
      grossMarginPercent,
      tierMarkup: currentTierInfo.markup,
      priceDeviation,
      priceDeviationPercent,
      isOverRecommended: priceDeviation > 0,
      isUnderRecommended: priceDeviation < -0.01
    };
  }, [nettPrice, costPrice, currentSellingPrice, currentTierInfo]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get color classes for tier
  const getTierColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        border: 'border-blue-200',
        ring: 'ring-blue-500',
        badge: 'bg-blue-600'
      },
      green: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        border: 'border-green-200',
        ring: 'ring-green-500',
        badge: 'bg-green-600'
      },
      amber: {
        bg: 'bg-amber-100',
        text: 'text-amber-700',
        border: 'border-amber-200',
        ring: 'ring-amber-500',
        badge: 'bg-amber-600'
      },
      purple: {
        bg: 'bg-purple-100',
        text: 'text-purple-700',
        border: 'border-purple-200',
        ring: 'ring-purple-500',
        badge: 'bg-purple-600'
      },
      pink: {
        bg: 'bg-pink-100',
        text: 'text-pink-700',
        border: 'border-pink-200',
        ring: 'ring-pink-500',
        badge: 'bg-pink-600'
      },
      orange: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        border: 'border-orange-200',
        ring: 'ring-orange-500',
        badge: 'bg-orange-600'
      }
    };
    return colors[color] || colors.blue;
  };

  const tierColors = getTierColorClasses(currentTierInfo.color);
  const TierIcon = currentTierInfo.icon;

  // Calculate tier comparison prices
  const tierPrices = useMemo(() => {
    const basePrice = nettPrice > 0 ? nettPrice : costPrice;
    if (basePrice <= 0) return [];

    return Object.entries(tierConfig).map(([key, tier]) => ({
      key,
      ...tier,
      price: basePrice * (1 + tier.markup / 100),
      isCurrent: key === clientTier
    }));
  }, [nettPrice, costPrice, clientTier]);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Tier Pricing</span>
        </div>
        
        {showBreakdown && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Current Tier Display */}
        <div className={`flex items-center gap-3 p-3 rounded-lg ${tierColors.bg} ${tierColors.border} border`}>
          <div className={`p-2 ${tierColors.badge} rounded-lg`}>
            <TierIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className={`font-medium ${tierColors.text}`}>
              {currentTierInfo.name}
            </div>
            <div className="text-sm text-gray-600">
              {currentTierInfo.description}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${tierColors.text}`}>
              {currentTierInfo.markup}%
            </div>
            <div className="text-xs text-gray-500">markup</div>
          </div>
        </div>

        {/* Price Summary */}
        {calculatePricing.basePrice > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Recommended Price:</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(calculatePricing.recommendedPrice)}
              </span>
            </div>
            
            {currentSellingPrice > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current Selling Price:</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(currentSellingPrice)}
                </span>
              </div>
            )}

            {/* Price Deviation Warning */}
            {currentSellingPrice > 0 && Math.abs(calculatePricing.priceDeviationPercent) > 1 && (
              <div className={`flex items-center gap-2 p-2 rounded text-sm ${
                calculatePricing.isUnderRecommended 
                  ? 'bg-amber-50 text-amber-700' 
                  : 'bg-blue-50 text-blue-700'
              }`}>
                <AlertCircle className="w-4 h-4" />
                <span>
                  {calculatePricing.isUnderRecommended
                    ? `${Math.abs(calculatePricing.priceDeviationPercent).toFixed(1)}% below recommended`
                    : `${calculatePricing.priceDeviationPercent.toFixed(1)}% above recommended`
                  }
                </span>
              </div>
            )}

            {/* Gross Margin */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
              <span className="text-gray-600">Gross Margin:</span>
              <span className={`font-medium ${
                calculatePricing.grossMarginPercent >= 30 ? 'text-green-600' :
                calculatePricing.grossMarginPercent >= 20 ? 'text-blue-600' :
                calculatePricing.grossMarginPercent >= 10 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {calculatePricing.grossMarginPercent.toFixed(1)}%
                ({formatCurrency(calculatePricing.grossMargin)})
              </span>
            </div>
          </div>
        )}

        {/* Detailed Breakdown */}
        {showDetails && calculatePricing.basePrice > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Price Breakdown
            </div>
            
            <div className="space-y-2">
              {/* Cost Price */}
              {costPrice > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Cost Price</span>
                  <span className="text-gray-700">{formatCurrency(costPrice)}</span>
                </div>
              )}
              
              {/* Nett Price */}
              {nettPrice > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Nett Price</span>
                  <span className="text-gray-700">{formatCurrency(nettPrice)}</span>
                </div>
              )}
              
              {/* Base for Markup */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Base Price (for markup)</span>
                <span className="font-medium text-gray-900">{formatCurrency(calculatePricing.basePrice)}</span>
              </div>
              
              {/* Markup */}
              <div className="flex items-center justify-between text-sm text-green-600">
                <span>+ Tier Markup ({currentTierInfo.markup}%)</span>
                <span>{formatCurrency(calculatePricing.markupAmount)}</span>
              </div>
              
              {/* Divider */}
              <div className="border-t border-gray-200 my-2" />
              
              {/* Recommended Price */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-700">Recommended Selling Price</span>
                <span className="font-bold text-gray-900">{formatCurrency(calculatePricing.recommendedPrice)}</span>
              </div>
              
              {/* List Price Reference */}
              {listPrice > 0 && (
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>List Price Reference</span>
                  <span>{formatCurrency(listPrice)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tier Comparison Toggle */}
        <button
          onClick={() => setShowTierComparison(!showTierComparison)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
        >
          <Calculator className="w-4 h-4" />
          {showTierComparison ? 'Hide' : 'Show'} tier comparison
        </button>

        {/* Tier Comparison Grid */}
        {showTierComparison && tierPrices.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Compare All Tiers
            </div>
            
            <div className="space-y-2">
              {tierPrices.map((tier) => {
                const tierColorClasses = getTierColorClasses(tier.color);
                
                return (
                  <div 
                    key={tier.key}
                    className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                      tier.isCurrent 
                        ? `${tierColorClasses.bg} ${tierColorClasses.border} border-2` 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <tier.icon className={`w-4 h-4 ${tier.isCurrent ? tierColorClasses.text : 'text-gray-400'}`} />
                      <span className={`text-sm ${tier.isCurrent ? 'font-medium' : ''} ${tier.isCurrent ? tierColorClasses.text : 'text-gray-700'}`}>
                        {tier.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({tier.markup}%)
                      </span>
                      {tier.isCurrent && (
                        <Check className={`w-4 h-4 ${tierColorClasses.text}`} />
                      )}
                    </div>
                    <span className={`font-medium ${tier.isCurrent ? tierColorClasses.text : 'text-gray-900'}`}>
                      {formatCurrency(tier.price)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tier Selection (if not readonly) */}
        {!readOnly && onTierChange && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Change Tier
            </label>
            <select
              value={clientTier}
              onChange={(e) => onTierChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {Object.entries(tierConfig).map(([key, tier]) => (
                <option key={key} value={key}>
                  {tier.name} ({tier.markup}% markup)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Info Note */}
        <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Tier pricing provides a guideline. Final price may be adjusted based on 
            volume, relationship, and market conditions.
          </span>
        </div>
      </div>
    </div>
  );
};

export default TierMarkupDisplay;
