/**
 * QuotationLineForm.jsx
 * 
 * Form for editing individual quotation line items
 * Features: Product details, pricing, description selection, dimensions, visibility
 */

import React, { useState, useEffect } from 'react';
import {
  Package, Trash2, Search, DollarSign, Sparkles, Box, Scale,
  Clock, Eye, EyeOff, ChevronDown, RefreshCw, AlertCircle
} from 'lucide-react';
import QuotationPricingService from '../../../services/QuotationPricingService';
import AIDescriptionService from '../../../services/AIDescriptionService';
import { formatCurrency } from '../../../utils/formatters';

const PRICING_SOURCES = [
  { value: 'list_price_book', label: 'List Price Book' },
  { value: 'nett_price', label: 'Nett Price' },
  { value: 'market_estimate', label: 'Market Estimate' },
  { value: 'manual', label: 'Manual Entry' }
];

const UOM_OPTIONS = [
  'pcs', 'set', 'lot', 'unit', 'pair', 'm', 'cm', 'mm', 'kg', 'g', 'L', 'mL', 'box', 'pack'
];

const DESCRIPTION_SOURCES = [
  { value: 'standard', label: 'Standard', icon: Package },
  { value: 'ai_generated', label: 'AI Generated', icon: Sparkles },
  { value: 'custom', label: 'Custom', icon: Eye }
];

const QuotationLineForm = ({
  line,
  index,
  currency,
  clientTier,
  tierPricing,
  onUpdate,
  onRemove,
  onProductSearch
}) => {
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate derived values
  const margin = line.unitPrice > 0 && line.costPrice > 0
    ? ((line.unitPrice - line.costPrice) / line.costPrice * 100).toFixed(1)
    : 0;

  // Handle pricing source change
  const handlePricingSourceChange = async (source) => {
    onUpdate({ pricingSource: source });

    if (source === 'list_price_book' && line.brand && line.partNumber) {
      setIsLoadingPrice(true);
      try {
        const result = await QuotationPricingService.getListPriceBookCost({
          brand: line.brand,
          partNumber: line.partNumber,
          category: line.category
        });
        if (result) {
          onUpdate({
            listPrice: result.listPrice,
            discountFromList: result.discount,
            costPrice: result.cost,
            pricingSource: 'list_price_book'
          });
        }
      } catch (err) {
        console.error('Error loading list price:', err);
      } finally {
        setIsLoadingPrice(false);
      }
    } else if (source === 'nett_price' && line.brand && line.partNumber) {
      setIsLoadingPrice(true);
      try {
        const result = await QuotationPricingService.getNettPriceCost({
          brand: line.brand,
          partNumber: line.partNumber
        });
        if (result) {
          onUpdate({
            nettCost: result.cost,
            costPrice: result.cost,
            pricingSource: 'nett_price'
          });
        }
      } catch (err) {
        console.error('Error loading nett price:', err);
      } finally {
        setIsLoadingPrice(false);
      }
    } else if (source === 'market_estimate') {
      handleGetMarketEstimate();
    }
  };

  // Get market price estimate
  const handleGetMarketEstimate = async () => {
    if (!line.partNumber && !line.description) return;

    setIsLoadingPrice(true);
    try {
      const estimate = await QuotationPricingService.getMarketPriceEstimate({
        partNumber: line.partNumber,
        description: line.description,
        brand: line.brand,
        category: line.category
      });
      setPriceEstimate(estimate);
      onUpdate({
        marketPriceEstimate: estimate,
        costPrice: estimate.mid,
        pricingSource: 'market_estimate'
      });
    } catch (err) {
      console.error('Error getting market estimate:', err);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  // Generate AI description
  const handleGenerateDescription = async () => {
    if (!line.partNumber && !line.standardDescription) return;

    setIsGeneratingDescription(true);
    try {
      const generated = await AIDescriptionService.generateProductDescription({
        partNumber: line.partNumber,
        brand: line.brand,
        category: line.category,
        standardDescription: line.standardDescription,
        technicalSpecs: line.technicalSpecs,
        style: 'professional'
      });
      onUpdate({
        aiGeneratedDescription: generated,
        descriptionSource: 'ai_generated',
        description: generated
      });
    } catch (err) {
      console.error('Error generating description:', err);
      alert('Failed to generate AI description');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Handle description source change
  const handleDescriptionSourceChange = (source) => {
    let description = '';
    switch (source) {
      case 'standard':
        description = line.standardDescription || '';
        break;
      case 'ai_generated':
        description = line.aiGeneratedDescription || '';
        if (!description) {
          handleGenerateDescription();
          return;
        }
        break;
      case 'custom':
        description = line.customDescription || line.description || '';
        break;
    }
    onUpdate({ descriptionSource: source, description });
  };

  // Apply tier markup
  const applyTierMarkup = () => {
    if (!tierPricing || !line.costPrice) return;

    let markup = tierPricing.defaultMarkup;

    // Check for brand-specific markup
    if (line.brand && tierPricing.brandMarkups) {
      const brandMarkup = tierPricing.brandMarkups.find(
        bm => bm.brandName?.toLowerCase() === line.brand?.toLowerCase()
      );
      if (brandMarkup) markup = brandMarkup.markupPercentage;
    }

    // Check for category-specific markup
    if (line.category && tierPricing.categoryMarkups) {
      const categoryMarkup = tierPricing.categoryMarkups.find(
        cm => cm.category?.toLowerCase() === line.category?.toLowerCase()
      );
      if (categoryMarkup) markup = categoryMarkup.markupPercentage;
    }

    onUpdate({
      markupPercentage: markup,
      tierMarkup: {
        tierName: clientTier,
        brandMarkup: tierPricing.brandMarkups?.find(bm => bm.brandName?.toLowerCase() === line.brand?.toLowerCase())?.markupPercentage || 0,
        categoryMarkup: tierPricing.categoryMarkups?.find(cm => cm.category?.toLowerCase() === line.category?.toLowerCase())?.markupPercentage || 0,
        appliedMarkup: markup
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Product Identification */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Part Number / SKU
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={line.partNumber || ''}
              onChange={(e) => onUpdate({ partNumber: e.target.value, sku: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              placeholder="e.g., CR-32-2"
            />
            <button
              onClick={onProductSearch}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Brand
          </label>
          <input
            type="text"
            value={line.brand || ''}
            onChange={(e) => onUpdate({ brand: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            placeholder="e.g., Grundfos"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Category
          </label>
          <input
            type="text"
            value={line.category || ''}
            onChange={(e) => onUpdate({ category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            placeholder="e.g., Pumps"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Client Material Code
          </label>
          <input
            type="text"
            value={line.clientMaterialCode || ''}
            onChange={(e) => onUpdate({ clientMaterialCode: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            placeholder="e.g., PTP-MAT-001"
          />
        </div>
      </div>

      {/* Description Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">
            Description
          </label>
          <div className="flex gap-1">
            {DESCRIPTION_SOURCES.map(src => (
              <button
                key={src.value}
                onClick={() => handleDescriptionSourceChange(src.value)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  line.descriptionSource === src.value
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <src.icon className="w-3 h-3" />
                {src.label}
              </button>
            ))}
            {line.descriptionSource === 'ai_generated' && (
              <button
                onClick={handleGenerateDescription}
                disabled={isGeneratingDescription}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
              >
                <RefreshCw className={`w-3 h-3 ${isGeneratingDescription ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            )}
          </div>
        </div>
        <textarea
          value={line.description || ''}
          onChange={(e) => onUpdate({ 
            description: e.target.value,
            customDescription: e.target.value,
            descriptionSource: 'custom'
          })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          placeholder="Product description..."
        />
      </div>

      {/* Quantity and Pricing */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            value={line.quantity || 1}
            onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            UOM
          </label>
          <select
            value={line.uom || 'pcs'}
            onChange={(e) => onUpdate({ uom: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          >
            {UOM_OPTIONS.map(uom => (
              <option key={uom} value={uom}>{uom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Pricing Source
          </label>
          <select
            value={line.pricingSource || 'manual'}
            onChange={(e) => handlePricingSourceChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          >
            {PRICING_SOURCES.map(src => (
              <option key={src.value} value={src.value}>{src.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Cost Price ({currency})
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              value={line.costPrice || ''}
              onChange={(e) => onUpdate({ costPrice: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
            {isLoadingPrice && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Markup %
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              step="0.1"
              min="0"
              value={line.markupPercentage || ''}
              onChange={(e) => onUpdate({ markupPercentage: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
            {tierPricing && (
              <button
                onClick={applyTierMarkup}
                title={`Apply ${clientTier} tier markup (${tierPricing.defaultMarkup}%)`}
                className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <DollarSign className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Price Display */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Unit Price</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(line.unitPrice || 0, currency)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Line Total</span>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(line.lineTotal || 0, currency)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Margin</span>
          <p className={`font-medium ${margin >= 20 ? 'text-green-600' : margin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
            {margin}%
          </p>
        </div>
        {priceEstimate && (
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400">Market Range</span>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {formatCurrency(priceEstimate.low, currency)} - {formatCurrency(priceEstimate.high, currency)}
            </p>
          </div>
        )}
      </div>

      {/* Line Discount */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Line Discount
          </label>
          <select
            value={line.lineDiscountType || 'none'}
            onChange={(e) => onUpdate({ lineDiscountType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          >
            <option value="none">None</option>
            <option value="percentage">Percentage</option>
            <option value="amount">Fixed Amount</option>
          </select>
        </div>

        {line.lineDiscountType === 'percentage' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Discount %
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={line.lineDiscountPercentage || ''}
              onChange={(e) => onUpdate({ lineDiscountPercentage: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
          </div>
        )}

        {line.lineDiscountType === 'amount' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Discount Amount ({currency})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={line.lineDiscountAmount || ''}
              onChange={(e) => onUpdate({ lineDiscountAmount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Lead Time
          </label>
          <input
            type="text"
            value={line.leadTime || ''}
            onChange={(e) => onUpdate({ leadTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
            placeholder="e.g., 4-6 weeks"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Stock Status
          </label>
          <select
            value={line.stockStatus || 'order_required'}
            onChange={(e) => onUpdate({ stockStatus: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
          >
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
            <option value="order_required">Order Required</option>
          </select>
        </div>
      </div>

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Dimensions */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <Box className="w-4 h-4" /> Dimensions
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Length"
                  value={line.dimensions?.length || ''}
                  onChange={(e) => onUpdate({
                    dimensions: { ...line.dimensions, length: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Width"
                  value={line.dimensions?.width || ''}
                  onChange={(e) => onUpdate({
                    dimensions: { ...line.dimensions, width: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Height"
                  value={line.dimensions?.height || ''}
                  onChange={(e) => onUpdate({
                    dimensions: { ...line.dimensions, height: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
              </div>
              <div>
                <select
                  value={line.dimensions?.unit || 'mm'}
                  onChange={(e) => onUpdate({
                    dimensions: { ...line.dimensions, unit: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="mm">mm</option>
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="inch">inch</option>
                </select>
              </div>
            </div>
          </div>

          {/* Weight */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <Scale className="w-4 h-4" /> Weight
            </label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Actual Weight"
                  value={line.weight?.actual || ''}
                  onChange={(e) => onUpdate({
                    weight: { ...line.weight, actual: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
                <span className="text-xs text-gray-500 mt-1">Actual</span>
              </div>
              <div>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Dimensional"
                  value={line.weight?.dimensional || ''}
                  onChange={(e) => onUpdate({
                    weight: { ...line.weight, dimensional: parseFloat(e.target.value) || 0 }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                />
                <span className="text-xs text-gray-500 mt-1">Dimensional</span>
              </div>
              <div>
                <select
                  value={line.weight?.unit || 'kg'}
                  onChange={(e) => onUpdate({
                    weight: { ...line.weight, unit: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                >
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
                <span className="text-xs text-gray-500 mt-1">Unit</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Notes (Visible to Client)
              </label>
              <textarea
                value={line.notes || ''}
                onChange={(e) => onUpdate({ notes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                Internal Notes (Hidden)
              </label>
              <textarea
                value={line.internalNotes || ''}
                onChange={(e) => onUpdate({ internalNotes: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>
          </div>

          {/* Visibility Options */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={line.hideFromPDF || false}
                onChange={(e) => onUpdate({ hideFromPDF: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <EyeOff className="w-4 h-4" /> Hide from PDF
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={line.isSystemComponent || false}
                onChange={(e) => onUpdate({ isSystemComponent: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                System Component
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onRemove}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        >
          <Trash2 className="w-4 h-4" /> Remove Line
        </button>
      </div>
    </div>
  );
};

export default QuotationLineForm;
