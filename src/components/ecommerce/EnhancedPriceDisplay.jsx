// src/components/ecommerce/EnhancedPriceDisplay.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { History, TrendingDown, Calendar, FileText, Crown, Tag, Users, DollarSign, Info, CheckCircle, Calculator, TrendingUp } from 'lucide-react';
import { PricingService } from '../../services/pricingService';

const EnhancedPriceDisplay = ({ 
  productId, 
  clientId, 
  showHistory = true, 
  showPriceType = true,
  showSavings = true,
  showMarkupInfo = false,
  compact = false 
}) => {
  const [pricing, setPricing] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryDetails, setShowHistoryDetails] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPricingWithHistory();
  }, [productId, clientId]);

  const loadPricingWithHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current pricing using enhanced service
      const currentPrice = await PricingService.resolvePriceForClient(productId, clientId);
      setPricing(currentPrice);

      // Load price history if showing history and client is provided
      if (showHistory && clientId) {
        const history = await PricingService.getClientPriceHistory(productId, clientId, 3);
        setPriceHistory(history);
      }
    } catch (error) {
      console.error('Error loading pricing with history:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPriceIcon = () => {
    switch (pricing?.type) {
      case 'client-specific':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'tier-based':
        return <Tag className="h-4 w-4 text-blue-500" />;
      case 'public':
        return <Users className="h-4 w-4 text-gray-500" />;
      default:
        return <DollarSign className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriceLabel = () => {
    switch (pricing?.type) {
      case 'client-specific':
        return pricing?.details?.priceSource === 'historical' ? 'Your Historical Price' : 'Special Price';
      case 'tier-based':
        const tierName = pricing?.details?.selectedTier?.tierName || pricing.tier?.toUpperCase();
        return `${tierName} Price`;
      case 'public':
        return 'Public Price';
      default:
        return 'Price';
    }
  };

  const getPriceTypeColor = () => {
    switch (pricing?.type) {
      case 'client-specific':
        return 'text-yellow-600 bg-yellow-50';
      case 'tier-based':
        return 'text-blue-600 bg-blue-50';
      case 'public':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const calculateSavings = () => {
    if (!pricing?.details) return null;

    let referencePrice = null;
    let currentPrice = pricing.price;

    // For markup-based pricing, compare against public price
    if (pricing.details.publicPrice && pricing.type !== 'public') {
      referencePrice = pricing.details.publicPrice;
    }
    // Fallback to original calculation
    else if (pricing.details.originalPrice || pricing.details.basePrice) {
      referencePrice = pricing.details.originalPrice || pricing.details.basePrice;
    }
    
    if (referencePrice && referencePrice > currentPrice) {
      const savings = referencePrice - currentPrice;
      const savingsPercentage = ((savings / referencePrice) * 100).toFixed(1);
      return { amount: savings, percentage: savingsPercentage, referencePrice };
    }
    
    return null;
  };

  const getMarkupInfo = () => {
    if (!pricing?.details || pricing.type === 'client-specific') return null;

    const details = pricing.details;
    if (details.supplierCost && details.totalMarkupPercentage) {
      return {
        supplierCost: details.supplierCost,
        markupPercentage: details.totalMarkupPercentage,
        markupAmount: details.markupAmount,
        appliedRules: details.appliedRules || []
      };
    }

    return null;
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Unknown date';
    
    // Handle Firestore timestamp
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000).toLocaleDateString();
    }
    
    // Handle regular date
    return new Date(dateValue).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${compact ? 'h-8' : 'h-16'} bg-gray-200 rounded`}></div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Unable to load pricing: {error}
      </div>
    );
  }

  const savings = calculateSavings();
  const markupInfo = getMarkupInfo();

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-lg font-bold text-gray-900">
          {formatCurrency(pricing?.price)}
        </div>
        {showPriceType && pricing?.type === 'client-specific' && (
          <Crown className="h-4 w-4 text-yellow-500" title="Special Price" />
        )}
        {markupInfo && (
          <span className="text-xs text-green-600 font-medium">
            +{markupInfo.markupPercentage}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main Price Display */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(pricing?.price)}
          </div>
          
          {/* Savings Display */}
          {showSavings && savings && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <TrendingDown className="h-4 w-4" />
              <span>You save {formatCurrency(savings.amount)} ({savings.percentage}%)</span>
            </div>
          )}

          {/* Markup Information */}
          {showMarkupInfo && markupInfo && (
            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>Cost: {formatCurrency(markupInfo.supplierCost)} + {markupInfo.markupPercentage}% markup</span>
            </div>
          )}
        </div>
        
        {/* Price Type Badge */}
        {showPriceType && pricing?.type && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getPriceTypeColor()}`}>
            {getPriceIcon()}
            <span>{getPriceLabel()}</span>
          </div>
        )}
      </div>

      {/* Markup Rules Information */}
      {showMarkupInfo && markupInfo && markupInfo.appliedRules.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-700 mb-2">
            <Calculator className="h-4 w-4" />
            <span className="text-sm font-medium">Pricing Calculation</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Supplier Cost:</span>
              <span className="font-medium">{formatCurrency(markupInfo.supplierCost)}</span>
            </div>
            {markupInfo.appliedRules.map((rule, index) => (
              <div key={index} className="flex justify-between text-orange-600">
                <span>{rule.ruleName}:</span>
                <span>+{rule.markupPercentage}%</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-orange-200 pt-1 font-medium">
              <span>Total Markup:</span>
              <span>+{formatCurrency(markupInfo.markupAmount)} ({markupInfo.markupPercentage}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Historical Price Context */}
      {pricing?.type === 'client-specific' && pricing?.details?.priceSource === 'historical' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700">
            <History className="h-4 w-4" />
            <span className="text-sm font-medium">
              Based on your last purchase
            </span>
          </div>
          {pricing?.details?.lastSoldDate && (
            <div className="text-xs text-blue-600 mt-1">
              Last purchased on {formatDate(pricing.details.lastSoldDate)}
              {pricing?.details?.agreementRef && pricing.details.agreementRef !== 'HISTORICAL' && (
                <span> • Agreement: {pricing.details.agreementRef}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tier-based Pricing Context */}
      {pricing?.type === 'tier-based' && pricing?.details?.selectedTier && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-blue-700">
            <Tag className="h-4 w-4" />
            <span className="text-sm font-medium">
              {pricing.details.selectedTier.tierName} Pricing
            </span>
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {pricing.details.selectedTier.discountPercentage > 0 ? (
              <span>
                {pricing.details.selectedTier.discountPercentage}% discount from public price 
                ({formatCurrency(pricing.details.publicPrice)})
              </span>
            ) : (
              <span>Standard public pricing</span>
            )}
          </div>
        </div>
      )}

      {/* Price History Section */}
      {showHistory && priceHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Your Purchase History</span>
            </div>
            {priceHistory.length > 2 && (
              <button
                onClick={() => setShowHistoryDetails(!showHistoryDetails)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showHistoryDetails ? 'Show Less' : 'Show More'}
              </button>
            )}
          </div>
          
          <div className="space-y-2">
            {(showHistoryDetails ? priceHistory : priceHistory.slice(0, 2)).map((record, index) => (
              <div key={index} className="flex items-center justify-between text-sm bg-white rounded p-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(record.soldDate)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-700">Qty: {record.quantity}</span>
                  <span className="font-medium">{formatCurrency(record.price || record.finalPrice)}</span>
                  {record.orderId && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {record.orderId}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Historical Price Benefits */}
          {pricing?.details?.lastSoldDate && (
            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
              Your current price reflects your purchasing history with us
            </div>
          )}
        </div>
      )}

      {/* Special Pricing Benefits */}
      {pricing?.type === 'client-specific' && showSavings && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {pricing?.details?.priceSource === 'historical' 
                ? "You're getting your proven price from previous orders"
                : "You're getting special negotiated pricing"
              }
            </span>
          </div>
          {pricing?.details?.notes && (
            <div className="text-xs text-green-600 mt-1">
              {pricing.details.notes}
            </div>
          )}
        </div>
      )}

      {/* Pricing Information Tooltip */}
      {showPriceType && (
        <div className="flex items-start gap-2 text-xs text-gray-500">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div>
            {pricing?.type === 'client-specific' && pricing?.details?.priceSource === 'historical' && (
              <span>This price is automatically applied based on your purchase history</span>
            )}
            {pricing?.type === 'client-specific' && pricing?.details?.priceSource !== 'historical' && (
              <span>This is a special price negotiated for your account</span>
            )}
            {pricing?.type === 'tier-based' && (
              <span>
                This price is based on your customer tier: {pricing?.details?.selectedTier?.tierName || pricing.tier}
                {markupInfo && ` (${markupInfo.markupPercentage}% markup applied)`}
              </span>
            )}
            {pricing?.type === 'public' && (
              <span>
                This is our standard public pricing
                {markupInfo && ` (${markupInfo.markupPercentage}% markup on cost)`}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for product grids - perfect for ecommerce product listings
export const CompactPriceDisplay = ({ productId, clientId, showMarkup = false }) => {
  return (
    <EnhancedPriceDisplay 
      productId={productId} 
      clientId={clientId} 
      compact={true}
      showHistory={false}
      showPriceType={false}
      showSavings={false}
      showMarkupInfo={showMarkup}
    />
  );
};

// Full version for product details pages
export const DetailedPriceDisplay = ({ productId, clientId, showMarkup = false }) => {
  return (
    <EnhancedPriceDisplay 
      productId={productId} 
      clientId={clientId} 
      showHistory={true}
      showPriceType={true}
      showSavings={true}
      showMarkupInfo={showMarkup}
    />
  );
};

// Admin version with markup information visible
export const AdminPriceDisplay = ({ productId, clientId }) => {
  return (
    <EnhancedPriceDisplay 
      productId={productId} 
      clientId={clientId} 
      showHistory={true}
      showPriceType={true}
      showSavings={true}
      showMarkupInfo={true}
    />
  );
};

// Price comparison component for ecommerce checkout or product comparison
export const PriceComparisonDisplay = ({ productId, clientId, showPublicPrice = false }) => {
  const [clientPricing, setClientPricing] = useState(null);
  const [publicPricing, setPublicPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriceComparison();
  }, [productId, clientId]);

  const loadPriceComparison = async () => {
    try {
      setLoading(true);
      
      // Load client pricing
      const clientPrice = await PricingService.resolvePriceForClient(productId, clientId);
      setClientPricing(clientPrice);

      // Load public pricing for comparison
      if (showPublicPrice) {
        const publicPrice = await PricingService.resolvePriceForClient(productId, null);
        setPublicPricing(publicPrice);
      }
    } catch (error) {
      console.error('Error loading price comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${amount?.toFixed(2) || '0.00'}`;
  };

  if (loading) {
    return <div className="animate-pulse h-16 bg-gray-200 rounded"></div>;
  }

  const savings = showPublicPrice && publicPricing && clientPricing 
    ? publicPricing.price - clientPricing.price 
    : 0;

  return (
    <div className="space-y-3">
      {/* Your Price */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-700 font-medium">Your Price</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(clientPricing?.price)}
            </div>
            {clientPricing?.type === 'client-specific' && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Crown className="h-3 w-3" />
                <span>Special Pricing</span>
              </div>
            )}
            {clientPricing?.type === 'tier-based' && clientPricing?.details?.selectedTier && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <Tag className="h-3 w-3" />
                <span>{clientPricing.details.selectedTier.tierName} Tier</span>
              </div>
            )}
          </div>
          {clientPricing?.type && (
            <div className="text-blue-600">
              {clientPricing.type === 'client-specific' ? <Crown className="h-6 w-6" /> : <Tag className="h-6 w-6" />}
            </div>
          )}
        </div>
      </div>

      {/* Public Price Comparison */}
      {showPublicPrice && publicPricing && savings > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600">Public Price</div>
              <div className="text-lg text-gray-700 line-through">
                {formatCurrency(publicPricing.price)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-green-600 font-medium">You Save</div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(savings)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPriceDisplay;
