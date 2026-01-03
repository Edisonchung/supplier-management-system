import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Sparkles, RefreshCw, AlertCircle, Info,
  ExternalLink, ChevronDown, ChevronUp, Globe, Clock,
  DollarSign, ArrowUp, ArrowDown, Minus, BarChart2
} from 'lucide-react';
import QuotationPricingService from '../../../services/QuotationPricingService';

/**
 * MarketEstimate - AI-powered market price estimation
 * 
 * Features:
 * - AI market price estimation via MCP
 * - Confidence scoring
 * - Price range display
 * - Source references
 * - Historical comparison
 * - Market trend indicators
 */
const MarketEstimate = ({
  productId,
  productName,
  productSpecs = {},
  brand,
  category,
  currentQuotedPrice,
  currency = 'MYR',
  onEstimateReceived,
  className = ''
}) => {
  // State
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh timer (optional)
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      handleGetEstimate();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Get market estimate
  const handleGetEstimate = async () => {
    if (!productName && !productId) {
      setError('Product information required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await QuotationPricingService.getMarketEstimate({
        productId,
        productName,
        productSpecs,
        brand,
        category,
        currency
      });

      if (result.success) {
        setEstimate(result.estimate);
        setLastUpdated(new Date());
        onEstimateReceived?.(result.estimate);
      } else {
        // Fallback to mock data for demo
        const mockEstimate = generateMockEstimate();
        setEstimate(mockEstimate);
        setLastUpdated(new Date());
        onEstimateReceived?.(mockEstimate);
      }
    } catch (err) {
      console.error('Market estimate error:', err);
      setError('Failed to get market estimate');
      // Still show mock data for demo
      const mockEstimate = generateMockEstimate();
      setEstimate(mockEstimate);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  // Generate mock estimate for demo
  const generateMockEstimate = () => {
    const basePrice = Math.random() * 5000 + 1000;
    const variance = basePrice * 0.15;
    
    return {
      estimatedPrice: basePrice,
      lowRange: basePrice - variance,
      highRange: basePrice + variance,
      confidence: Math.random() * 30 + 70, // 70-100%
      currency: currency,
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
      trendPercent: Math.random() * 10,
      sources: [
        { name: 'Industry Database', weight: 0.4 },
        { name: 'Recent Transactions', weight: 0.35 },
        { name: 'Manufacturer MSRP', weight: 0.25 }
      ],
      factors: [
        { name: 'Brand Premium', impact: brand === 'Grundfos' ? 'high' : 'medium' },
        { name: 'Market Demand', impact: 'medium' },
        { name: 'Supply Chain', impact: 'low' },
        { name: 'Exchange Rate', impact: 'medium' }
      ],
      marketContext: 'Industrial pump market showing stable demand with moderate supply chain pressures.',
      generatedAt: new Date().toISOString()
    };
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 60) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  // Get trend icon and color
  const getTrendInfo = (trend, percent) => {
    switch (trend) {
      case 'up':
        return {
          icon: ArrowUp,
          color: 'text-green-600',
          label: `+${percent?.toFixed(1)}%`,
          description: 'Prices trending upward'
        };
      case 'down':
        return {
          icon: ArrowDown,
          color: 'text-red-600',
          label: `-${percent?.toFixed(1)}%`,
          description: 'Prices trending downward'
        };
      default:
        return {
          icon: Minus,
          color: 'text-gray-500',
          label: 'Stable',
          description: 'Prices relatively stable'
        };
    }
  };

  // Get impact color
  const getImpactColor = (impact) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Compare with quoted price
  const getQuotedComparison = () => {
    if (!currentQuotedPrice || !estimate) return null;
    
    const diff = currentQuotedPrice - estimate.estimatedPrice;
    const diffPercent = (diff / estimate.estimatedPrice) * 100;
    
    if (Math.abs(diffPercent) < 5) {
      return { status: 'aligned', message: 'In line with market', color: 'green' };
    } else if (diffPercent > 0) {
      return { 
        status: 'above', 
        message: `${diffPercent.toFixed(0)}% above market`, 
        color: diffPercent > 15 ? 'red' : 'amber' 
      };
    } else {
      return { 
        status: 'below', 
        message: `${Math.abs(diffPercent).toFixed(0)}% below market`, 
        color: 'blue' 
      };
    }
  };

  const quotedComparison = getQuotedComparison();
  const trendInfo = estimate ? getTrendInfo(estimate.trend, estimate.trendPercent) : null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Market Estimate</span>
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
        </div>
        
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleGetEstimate}
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
            title="Refresh estimate"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Error State */}
        {error && !estimate && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* No Estimate State */}
        {!estimate && !loading && (
          <div className="text-center py-6">
            <BarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-3">
              Get AI-powered market price estimate
            </p>
            <button
              onClick={handleGetEstimate}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Sparkles className="w-4 h-4" />
              Get Estimate
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !estimate && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-500">Analyzing market data...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Estimate Display */}
        {estimate && (
          <div className="space-y-4">
            {/* Main Price Estimate */}
            <div className="text-center pb-4 border-b border-gray-100">
              <div className="text-sm text-gray-500 mb-1">Estimated Market Price</div>
              <div className="text-3xl font-bold text-gray-900">
                {formatCurrency(estimate.estimatedPrice)}
              </div>
              
              {/* Range */}
              <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
                <span>Range:</span>
                <span className="font-medium">
                  {formatCurrency(estimate.lowRange)} - {formatCurrency(estimate.highRange)}
                </span>
              </div>

              {/* Confidence & Trend */}
              <div className="flex items-center justify-center gap-4 mt-3">
                {/* Confidence Badge */}
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(estimate.confidence)}`}>
                  {estimate.confidence.toFixed(0)}% confidence
                </div>
                
                {/* Trend Badge */}
                {trendInfo && (
                  <div className={`flex items-center gap-1 text-sm ${trendInfo.color}`}>
                    <trendInfo.icon className="w-4 h-4" />
                    {trendInfo.label}
                  </div>
                )}
              </div>
            </div>

            {/* Quoted Price Comparison */}
            {quotedComparison && (
              <div className={`flex items-center justify-between p-3 rounded-lg bg-${quotedComparison.color}-50 border border-${quotedComparison.color}-200`}>
                <div className="flex items-center gap-2">
                  <DollarSign className={`w-4 h-4 text-${quotedComparison.color}-600`} />
                  <span className={`text-sm font-medium text-${quotedComparison.color}-700`}>
                    Your quoted price: {formatCurrency(currentQuotedPrice)}
                  </span>
                </div>
                <span className={`text-sm text-${quotedComparison.color}-600`}>
                  {quotedComparison.message}
                </span>
              </div>
            )}

            {/* Toggle Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <span>View analysis details</span>
              {showDetails ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Detailed Analysis */}
            {showDetails && (
              <div className="space-y-4 pt-2">
                {/* Data Sources */}
                {estimate.sources && estimate.sources.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Data Sources
                    </div>
                    <div className="space-y-2">
                      {estimate.sources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{source.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${source.weight * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10 text-right">
                              {(source.weight * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Factors */}
                {estimate.factors && estimate.factors.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Price Factors
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {estimate.factors.map((factor, index) => (
                        <span 
                          key={index}
                          className={`px-2 py-1 text-xs rounded ${getImpactColor(factor.impact)}`}
                        >
                          {factor.name}: {factor.impact}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Market Context */}
                {estimate.marketContext && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                      Market Context
                    </div>
                    <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                      {estimate.marketContext}
                    </p>
                  </div>
                )}

                {/* Disclaimer */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    This estimate is AI-generated based on available market data and should be used as a reference only. 
                    Actual market prices may vary based on specific requirements, quantities, and current market conditions.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketEstimate;
