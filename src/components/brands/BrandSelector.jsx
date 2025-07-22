// src/components/brands/BrandSelector.jsx
import React, { useState, useEffect } from 'react';
import { Star, Shield, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { BRAND_CONFIGURATIONS, determineBrandingStrategy } from '../../utils/brandConfig';

export const BrandSelector = ({ product, onBrandChange }) => {
  const [selectedBrand, setSelectedBrand] = useState(product?.brandAssociation?.primaryBrand || 'original_brand');
  const [context, setContext] = useState({
    customerType: 'unknown',
    brandRecognition: 'unknown',
    marginImprovement: false,
    supportAdvantage: false,
    warrantyRequirements: false,
    oemPartnership: false
  });
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [brandingAnalysis, setBrandingAnalysis] = useState(null);

  useEffect(() => {
    if (product) {
      const analysis = determineBrandingStrategy(product, context);
      setBrandingAnalysis(analysis);
    }
  }, [product, context]);

  const handleContextChange = (field, value) => {
    setContext(prev => ({ ...prev, [field]: value }));
  };

  const handleBrandSelection = (brandId) => {
    setSelectedBrand(brandId);
    
    const brandData = {
      primaryBrand: brandId,
      allowedBrands: getAllowedBrandsForCategory(product.category),
      autoSelectBrand: false,
      rebrandingStrategy: brandId === 'original_brand' ? 'original_brand' : 'custom_brand',
      rebrandingReason: brandId === 'original_brand' ? 'User selected original branding' : `User selected ${BRAND_CONFIGURATIONS[brandId].name}`,
      rebrandingApprovedBy: 'current_user', // Get from auth context
      rebrandingApprovedDate: new Date().toISOString()
    };
    
    onBrandChange(brandData);
  };

  const handleApplyRecommendation = () => {
    if (brandingAnalysis) {
      handleBrandSelection(brandingAnalysis.brand);
    }
  };

  const getBrandColor = (brandId) => {
    switch (brandId) {
      case 'faradaytech': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'faraday_instruments': return 'text-green-600 bg-green-100 border-green-200';
      case 'hydra': return 'text-cyan-600 bg-cyan-100 border-cyan-200';
      case 'original_brand': return 'text-orange-600 bg-orange-100 border-orange-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getRecommendationIcon = () => {
    if (!brandingAnalysis) return null;
    
    return brandingAnalysis.strategy === 'custom_brand' ? (
      <Star className="h-5 w-5 text-blue-600" />
    ) : (
      <Shield className="h-5 w-5 text-orange-600" />
    );
  };

  const getAvailableBrands = () => {
    const categoryBrands = getAllowedBrandsForCategory(product?.category);
    return Object.entries(BRAND_CONFIGURATIONS).filter(([brandId]) => 
      categoryBrands.includes(brandId)
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Brand Selection</h3>
          <p className="text-sm text-gray-600">Choose how to brand this product for customers</p>
        </div>
        
        <button
          onClick={() => setShowAnalysis(!showAnalysis)}
          className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Info size={16} />
          <span>{showAnalysis ? 'Hide' : 'Show'} Analysis</span>
        </button>
      </div>

      {/* AI Recommendation */}
      {brandingAnalysis && (
        <div className={`p-4 rounded-lg border ${
          brandingAnalysis.strategy === 'custom_brand' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded ${
              brandingAnalysis.strategy === 'custom_brand' 
                ? 'bg-blue-100' 
                : 'bg-orange-100'
            }`}>
              {getRecommendationIcon()}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">
                AI Recommendation: {brandingAnalysis.recommendation}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {brandingAnalysis.reasoning}
              </p>
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-gray-500">
                  Confidence: {(brandingAnalysis.confidence * 10).toFixed(0)}/10
                </div>
                <button
                  onClick={handleApplyRecommendation}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Apply Recommendation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context Analysis */}
      {showAnalysis && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900">Business Context</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Type
              </label>
              <select
                value={context.customerType}
                onChange={(e) => handleContextChange('customerType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="unknown">Unknown</option>
                <option value="enterprise">Enterprise</option>
                <option value="sme">SME</option>
                <option value="oem">OEM</option>
                <option value="distributor">Distributor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand Recognition
              </label>
              <select
                value={context.brandRecognition}
                onChange={(e) => handleContextChange('brandRecognition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="unknown">Unknown</option>
                <option value="strong">Strong</option>
                <option value="moderate">Moderate</option>
                <option value="weak">Weak</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { key: 'marginImprovement', label: 'Better Margins' },
              { key: 'supportAdvantage', label: 'Support Advantage' },
              { key: 'warrantyRequirements', label: 'Warranty Critical' },
              { key: 'oemPartnership', label: 'OEM Partnership' }
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={context[key]}
                  onChange={(e) => handleContextChange(key, e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Brand Options */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Available Brands</h4>
        
        <div className="grid grid-cols-1 gap-3">
          {getAvailableBrands().map(([brandId, config]) => (
            <label
              key={brandId}
              className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedBrand === brandId
                  ? getBrandColor(brandId)
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="brand"
                value={brandId}
                checked={selectedBrand === brandId}
                onChange={() => handleBrandSelection(brandId)}
                className="sr-only"
              />
              
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedBrand === brandId
                      ? 'border-current bg-current'
                      : 'border-gray-300'
                  }`}>
                    {selectedBrand === brandId && (
                      <CheckCircle size={12} className="text-white" />
                    )}
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-900">{config.name}</h5>
                    <p className="text-sm text-gray-600">
                      {brandId === 'original_brand' 
                        ? 'Keep original manufacturer branding'
                        : `Rebrand to ${config.name}`
                      }
                    </p>
                  </div>
                </div>
                
                {brandingAnalysis?.brand === brandId && (
                  <div className="flex items-center space-x-1 text-sm font-medium text-blue-600">
                    <Star size={16} />
                    <span>Recommended</span>
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Current Selection Summary */}
      {selectedBrand && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle size={16} className="text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Selected: {BRAND_CONFIGURATIONS[selectedBrand].name}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            {selectedBrand === 'original_brand'
              ? 'Product will maintain original manufacturer branding'
              : `Product will be rebranded to ${BRAND_CONFIGURATIONS[selectedBrand].name}`
            }
          </p>
        </div>
      )}
    </div>
  );
};

// Helper function to get allowed brands for a category
const getAllowedBrandsForCategory = (category) => {
  const categoryMapping = {
    'mechanical': ['faradaytech', 'original_brand'],
    'bearings': ['faradaytech', 'original_brand'],
    'gears': ['faradaytech', 'original_brand'],
    'sensors': ['faraday_instruments', 'original_brand'],
    'instrumentation': ['faraday_instruments', 'original_brand'],
    'diaphragm_pumps': ['hydra', 'original_brand'],
    'pumping_systems': ['hydra', 'original_brand']
  };
  
  return categoryMapping[category] || ['original_brand'];
};
