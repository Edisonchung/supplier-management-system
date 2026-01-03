// DummyQuoteGenerator.jsx
// Multi-company dummy quote generator for procurement comparisons
// Allows generating competitive quotes from multiple company entities

import React, { useState, useMemo } from 'react';
import {
  Building2,
  Copy,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Eye,
  Shuffle,
  Percent,
  DollarSign,
  X,
  Sparkles
} from 'lucide-react';
import { QuotationService } from '../../services/QuotationService';
import { PricingService } from '../../../services/QuotationPricingService';

// Company configurations
const COMPANIES = [
  { code: 'FS', name: 'Flow Solution Sdn Bhd', color: 'blue' },
  { code: 'FSE', name: 'Flow Solution Engineering Sdn Bhd', color: 'emerald' },
  { code: 'FSP', name: 'Flow Solution Projects Sdn Bhd', color: 'violet' },
  { code: 'BWS', name: 'BWS Industrial Sdn Bhd', color: 'amber' },
  { code: 'BWE', name: 'BWE Engineering Sdn Bhd', color: 'orange' },
  { code: 'EMIT', name: 'EMIT Trading Sdn Bhd', color: 'cyan' },
  { code: 'EMIA', name: 'EMIT Industrial Automation Sdn Bhd', color: 'pink' },
  { code: 'FTS', name: 'FTS Technical Services Sdn Bhd', color: 'teal' },
  { code: 'IHS', name: 'IHS Holdings Sdn Bhd', color: 'indigo' }
];

// Price variation strategies
const VARIATION_STRATEGIES = [
  { 
    id: 'random', 
    name: 'Random Variation', 
    description: 'Random markup within specified range',
    icon: Shuffle 
  },
  { 
    id: 'competitive', 
    name: 'Competitive Pricing', 
    description: 'Progressive markups to simulate competition',
    icon: Percent 
  },
  { 
    id: 'fixed', 
    name: 'Fixed Markup', 
    description: 'Same markup percentage for all',
    icon: DollarSign 
  }
];

const DummyQuoteGenerator = ({
  isOpen,
  onClose,
  sourceQuotation, // The original quotation to base dummies on
  sourceLines, // Line items from original quotation
  onGenerated, // Callback when generation complete
  currentUser
}) => {
  // Selection state
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [variationStrategy, setVariationStrategy] = useState('random');
  const [variationRange, setVariationRange] = useState({ min: -5, max: 15 }); // percentage
  const [fixedMarkup, setFixedMarkup] = useState(10);
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [previewQuotes, setPreviewQuotes] = useState([]);
  
  // Generation state
  const [generating, setGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Filter out the original quotation's company
  const availableCompanies = useMemo(() => {
    return COMPANIES.filter(c => c.code !== sourceQuotation?.companyCode);
  }, [sourceQuotation?.companyCode]);

  // Toggle company selection
  const toggleCompany = (companyCode) => {
    setSelectedCompanies(prev => 
      prev.includes(companyCode)
        ? prev.filter(c => c !== companyCode)
        : [...prev, companyCode]
    );
  };

  // Select all companies
  const selectAllCompanies = () => {
    setSelectedCompanies(availableCompanies.map(c => c.code));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedCompanies([]);
  };

  // Calculate price with variation
  const calculateVariedPrice = (originalPrice, index, total) => {
    if (variationStrategy === 'fixed') {
      return originalPrice * (1 + fixedMarkup / 100);
    }
    
    if (variationStrategy === 'competitive') {
      // Progressive markup based on position
      const step = (variationRange.max - variationRange.min) / Math.max(1, total - 1);
      const markup = variationRange.min + (step * index);
      return originalPrice * (1 + markup / 100);
    }
    
    // Random variation
    const range = variationRange.max - variationRange.min;
    const randomMarkup = variationRange.min + (Math.random() * range);
    return originalPrice * (1 + randomMarkup / 100);
  };

  // Generate preview
  const generatePreview = () => {
    if (selectedCompanies.length === 0 || !sourceQuotation || !sourceLines) return;

    const previews = selectedCompanies.map((companyCode, index) => {
      const company = COMPANIES.find(c => c.code === companyCode);
      
      // Calculate varied line totals
      const previewLines = sourceLines.map(line => {
        const variedPrice = calculateVariedPrice(
          line.unitPrice || 0,
          index,
          selectedCompanies.length
        );
        return {
          ...line,
          unitPrice: Math.round(variedPrice * 100) / 100,
          lineTotal: Math.round(variedPrice * (line.quantity || 1) * 100) / 100
        };
      });

      // Calculate totals
      const subtotal = previewLines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
      const variance = ((subtotal - sourceQuotation.subtotal) / sourceQuotation.subtotal) * 100;

      return {
        companyCode,
        companyName: company?.name,
        lines: previewLines,
        subtotal: Math.round(subtotal * 100) / 100,
        variance: Math.round(variance * 100) / 100
      };
    });

    setPreviewQuotes(previews);
    setShowPreview(true);
  };

  // Generate dummy quotes
  const generateDummyQuotes = async () => {
    if (selectedCompanies.length === 0 || !sourceQuotation || !sourceLines) return;

    setGenerating(true);
    setGeneratedCount(0);
    setError(null);
    setSuccess(false);

    try {
      // Prepare dummy quote data
      const dummyQuotesData = previewQuotes.map((preview, index) => ({
        companyCode: preview.companyCode,
        markupVariation: preview.variance,
        lines: preview.lines.map(line => ({
          ...line,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal
        }))
      }));

      // Call service to create dummy quotes
      const results = await QuotationService.createDummyQuotes(
        sourceQuotation.id,
        dummyQuotesData,
        currentUser
      );

      setGeneratedCount(results.createdQuotes.length);
      setSuccess(true);

      // Callback with results
      if (onGenerated) {
        onGenerated({
          sourceQuotationId: sourceQuotation.id,
          dummyQuotes: results.createdQuotes,
          groupId: results.dummyGroupId
        });
      }

      // Close after short delay
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      console.error('Error generating dummy quotes:', err);
      setError(err.message || 'Failed to generate dummy quotes');
    } finally {
      setGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedCompanies([]);
    setVariationStrategy('random');
    setVariationRange({ min: -5, max: 15 });
    setFixedMarkup(10);
    setShowPreview(false);
    setPreviewQuotes([]);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const formatCurrency = (amount, currency = sourceQuotation?.currency || 'MYR') => {
    const symbols = { MYR: 'RM', USD: '$', EUR: '€', RMB: '¥', JPY: '¥' };
    return `${symbols[currency] || currency} ${amount.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-3xl bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Copy className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Generate Dummy Quotes
                </h2>
                <p className="text-sm text-gray-500">
                  Create competitive quotes from multiple companies
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {success ? (
              /* Success State */
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Dummy Quotes Generated!
                </h3>
                <p className="text-gray-600">
                  Successfully created {generatedCount} dummy quote{generatedCount !== 1 ? 's' : ''}.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Source Quote Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        Source: {sourceQuotation?.quotationNumber}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {sourceQuotation?.clientName} • {sourceLines?.length || 0} line items
                      </p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        Total: {formatCurrency(sourceQuotation?.grandTotal || 0)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Company Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700">
                      Select Companies for Dummy Quotes
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllCompanies}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="text-xs text-gray-600 hover:text-gray-700"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableCompanies.map(company => {
                      const isSelected = selectedCompanies.includes(company.code);
                      const colorClasses = {
                        blue: 'bg-blue-50 border-blue-500 text-blue-700',
                        emerald: 'bg-emerald-50 border-emerald-500 text-emerald-700',
                        violet: 'bg-violet-50 border-violet-500 text-violet-700',
                        amber: 'bg-amber-50 border-amber-500 text-amber-700',
                        orange: 'bg-orange-50 border-orange-500 text-orange-700',
                        cyan: 'bg-cyan-50 border-cyan-500 text-cyan-700',
                        pink: 'bg-pink-50 border-pink-500 text-pink-700',
                        teal: 'bg-teal-50 border-teal-500 text-teal-700',
                        indigo: 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      };
                      
                      return (
                        <button
                          key={company.code}
                          type="button"
                          onClick={() => toggleCompany(company.code)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected
                              ? colorClasses[company.color]
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected ? 'bg-current border-current' : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <div className="font-semibold">{company.code}</div>
                              <div className="text-xs opacity-75 truncate">{company.name}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {selectedCompanies.length > 0 && (
                    <p className="text-sm text-gray-500">
                      {selectedCompanies.length} compan{selectedCompanies.length !== 1 ? 'ies' : 'y'} selected
                    </p>
                  )}
                </div>
                
                {/* Price Variation Strategy */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">
                    Price Variation Strategy
                  </label>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {VARIATION_STRATEGIES.map(strategy => {
                      const Icon = strategy.icon;
                      return (
                        <button
                          key={strategy.id}
                          type="button"
                          onClick={() => setVariationStrategy(strategy.id)}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            variationStrategy === strategy.id
                              ? 'bg-purple-50 border-purple-500 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <div className="text-sm font-medium">{strategy.name}</div>
                          <div className="text-xs opacity-75">{strategy.description}</div>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Variation Parameters */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    {variationStrategy === 'fixed' ? (
                      <div>
                        <label className="text-sm text-gray-600">Fixed Markup Percentage</label>
                        <div className="flex items-center gap-3 mt-2">
                          <input
                            type="range"
                            min="-10"
                            max="30"
                            value={fixedMarkup}
                            onChange={(e) => setFixedMarkup(parseInt(e.target.value))}
                            className="flex-1"
                          />
                          <span className="w-16 text-center font-medium">
                            {fixedMarkup > 0 ? '+' : ''}{fixedMarkup}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="text-sm text-gray-600">
                          {variationStrategy === 'competitive' 
                            ? 'Markup Range (progressive from min to max)'
                            : 'Random Variation Range'}
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Min</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={variationRange.min}
                                onChange={(e) => setVariationRange(prev => ({
                                  ...prev,
                                  min: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded"
                              />
                              <span className="text-gray-500">%</span>
                            </div>
                          </div>
                          <div className="text-gray-400 mt-5">to</div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Max</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={variationRange.max}
                                onChange={(e) => setVariationRange(prev => ({
                                  ...prev,
                                  max: parseInt(e.target.value) || 0
                                }))}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded"
                              />
                              <span className="text-gray-500">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Preview Section */}
                {showPreview && previewQuotes.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700">Quote Preview</h4>
                      <button
                        type="button"
                        onClick={() => setShowPreview(false)}
                        className="text-xs text-gray-600 hover:text-gray-700"
                      >
                        Hide Preview
                      </button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium text-gray-700">Company</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-700">Subtotal</th>
                            <th className="text-right px-4 py-2 font-medium text-gray-700">Variance</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t bg-blue-50">
                            <td className="px-4 py-2">
                              <span className="font-medium">{sourceQuotation?.companyCode}</span>
                              <span className="text-gray-500 ml-1">(Original)</span>
                            </td>
                            <td className="text-right px-4 py-2 font-medium">
                              {formatCurrency(sourceQuotation?.subtotal || 0)}
                            </td>
                            <td className="text-right px-4 py-2 text-gray-500">-</td>
                          </tr>
                          {previewQuotes.map(quote => (
                            <tr key={quote.companyCode} className="border-t">
                              <td className="px-4 py-2">
                                <span className="font-medium">{quote.companyCode}</span>
                                <span className="text-xs text-gray-500 ml-1">(Dummy)</span>
                              </td>
                              <td className="text-right px-4 py-2">
                                {formatCurrency(quote.subtotal)}
                              </td>
                              <td className={`text-right px-4 py-2 ${
                                quote.variance > 0 ? 'text-red-600' : 
                                quote.variance < 0 ? 'text-green-600' : 'text-gray-500'
                              }`}>
                                {quote.variance > 0 ? '+' : ''}{quote.variance}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {/* Info Note */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-sm">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-amber-800">
                    <p className="font-medium">About Dummy Quotes</p>
                    <p className="mt-1">
                      Dummy quotes are automatically marked and linked to the original quotation. 
                      They help simulate competitive bidding scenarios for procurement analysis.
                    </p>
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {!success && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <div className="flex gap-3">
                  {!showPreview ? (
                    <button
                      type="button"
                      onClick={generatePreview}
                      disabled={selectedCompanies.length === 0}
                      className="px-4 py-2 bg-white text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Preview Quotes
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={generateDummyQuotes}
                      disabled={generating || previewQuotes.length === 0}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Generate {previewQuotes.length} Dummy Quote{previewQuotes.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DummyQuoteGenerator;
