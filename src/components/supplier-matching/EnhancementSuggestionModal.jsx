// src/components/supplier-matching/EnhancementSuggestionModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lightbulb, 
  Sparkles,
  AlertTriangle 
} from 'lucide-react';

const EnhancementSuggestionModal = ({ 
  items, 
  onEnhanceAndRematch, 
  onClose 
}) => {
  const [enhancedItems, setEnhancedItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Initialize enhanced items with AI suggestions
    const itemsWithSuggestions = items.map(item => ({
      ...item,
      suggestions: generateSuggestions(item),
      enhancements: {
        modelNumber: '',
        brand: '',
        alternatePartNumber: '',
        technicalSpecs: ''
      }
    }));
    setEnhancedItems(itemsWithSuggestions);
  }, [items]);

  // AI suggestion generator based on product description
  const generateSuggestions = (item) => {
    const description = (item.productName || '').toLowerCase();
    const code = (item.productCode || '').toLowerCase();
    const suggestions = [];

    // Model number extraction patterns
    const modelPatterns = [
      /([a-z0-9]+[0-9]+[a-z]*)/gi,  // alphanumeric patterns
      /([0-9]+[a-z]+[0-9]*)/gi,     // number-letter combinations
      /\b([a-z]{2,}[0-9]{3,})\b/gi  // brand codes
    ];

    modelPatterns.forEach(pattern => {
      const matches = (description + ' ' + code).match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 3 && !suggestions.find(s => s.field === 'modelNumber' && s.value === match.toUpperCase())) {
            suggestions.push({
              field: 'modelNumber',
              value: match.toUpperCase(),
              confidence: 75,
              reason: `Extracted from ${match.length > 5 ? 'description' : 'code'}`
            });
          }
        });
      }
    });

    // Brand detection
    const brandKeywords = {
      'skf': 90, 'nsk': 90, 'fag': 90, 'timken': 90, 'koyo': 85,
      'ntn': 85, 'ina': 85, 'mcgill': 85, 'mcgil': 85,
      'schaeffler': 80, 'nachi': 80, 'ntc': 75
    };

    Object.entries(brandKeywords).forEach(([brand, confidence]) => {
      if (description.includes(brand) || code.includes(brand)) {
        suggestions.push({
          field: 'brand',
          value: brand.toUpperCase(),
          confidence,
          reason: `Found "${brand}" in ${description.includes(brand) ? 'description' : 'code'}`
        });
      }
    });

    // Technical specs extraction
    const specPatterns = [
      /(\d+mm\s*x\s*\d+mm\s*x\s*\d+mm)/gi,  // dimensions
      /(\d+\.?\d*\s*x\s*\d+\.?\d*\s*x\s*\d+\.?\d*)/gi,  // numeric dimensions
      /(d\s*x\s*d\s*x\s*w:\s*\d+mm\s*x\s*\d+mm\s*x\s*\d+mm)/gi // specific format
    ];

    specPatterns.forEach(pattern => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach(match => {
          suggestions.push({
            field: 'technicalSpecs',
            value: match,
            confidence: 85,
            reason: 'Extracted dimensional specifications'
          });
        });
      }
    });

    return suggestions;
  };

  const updateEnhancement = (itemId, field, value) => {
    setEnhancedItems(prev => prev.map(item => 
      (item.id === itemId || item.itemNumber === itemId)
        ? { 
            ...item, 
            enhancements: { 
              ...item.enhancements, 
              [field]: value 
            }
          }
        : item
    ));
  };

  const applySuggestion = (itemId, suggestion) => {
    updateEnhancement(itemId, suggestion.field, suggestion.value);
  };

  const handleEnhanceAndRematch = async () => {
    setIsProcessing(true);
    
    // Prepare enhanced items data
    const enhancedData = enhancedItems.map(item => ({
      ...item,
      // Apply enhancements to the item
      enhancedProductName: item.enhancements.modelNumber 
        ? `${item.productName} (Model: ${item.enhancements.modelNumber})`
        : item.productName,
      enhancedProductCode: item.enhancements.alternatePartNumber || item.productCode,
      brand: item.enhancements.brand,
      modelNumber: item.enhancements.modelNumber,
      technicalSpecs: item.enhancements.technicalSpecs,
      enhancementApplied: true
    }));

    try {
      await onEnhanceAndRematch(enhancedData);
    } finally {
      setIsProcessing(false);
    }
  };

  const hasAnyEnhancements = enhancedItems.some(item => 
    Object.values(item.enhancements).some(value => value.trim() !== '')
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sparkles className="h-6 w-6 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  🧠 AI Enhancement Suggestions
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Add missing details to improve matching accuracy
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[calc(90vh-12rem)] overflow-y-auto">
          <div className="p-6 space-y-6">
            {enhancedItems.map(item => (
              <div key={item.id || item.itemNumber} className="bg-gray-50 rounded-lg p-5">
                {/* Original Item Info */}
                <div className="mb-4 p-3 bg-white rounded border-l-4 border-gray-300">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {item.productCode || 'No Code'} - Original Description
                  </h4>
                  <p className="text-sm text-gray-600">{item.productName}</p>
                </div>

                {/* Enhancement Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Model Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Model Number
                    </label>
                    <input
                      type="text"
                      value={item.enhancements.modelNumber}
                      onChange={(e) => updateEnhancement(item.id || item.itemNumber, 'modelNumber', e.target.value)}
                      placeholder="e.g., NJ2214ECP"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {/* AI Suggestions */}
                    {item.suggestions.filter(s => s.field === 'modelNumber').map((suggestion, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                        <div className="flex items-center">
                          <Lightbulb className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-blue-700">{suggestion.value}</span>
                          <span className="text-blue-500 ml-2">({suggestion.confidence}%)</span>
                        </div>
                        <button
                          onClick={() => applySuggestion(item.id || item.itemNumber, suggestion)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Brand */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Brand
                    </label>
                    <input
                      type="text"
                      value={item.enhancements.brand}
                      onChange={(e) => updateEnhancement(item.id || item.itemNumber, 'brand', e.target.value)}
                      placeholder="e.g., SKF, NSK"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {item.suggestions.filter(s => s.field === 'brand').map((suggestion, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                        <div className="flex items-center">
                          <Lightbulb className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-blue-700">{suggestion.value}</span>
                          <span className="text-blue-500 ml-2">({suggestion.confidence}%)</span>
                        </div>
                        <button
                          onClick={() => applySuggestion(item.id || item.itemNumber, suggestion)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Alternate Part Number */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Alternate Part Number
                    </label>
                    <input
                      type="text"
                      value={item.enhancements.alternatePartNumber}
                      onChange={(e) => updateEnhancement(item.id || item.itemNumber, 'alternatePartNumber', e.target.value)}
                      placeholder="Cross-reference code"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>

                  {/* Technical Specs */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Technical Specifications
                    </label>
                    <input
                      type="text"
                      value={item.enhancements.technicalSpecs}
                      onChange={(e) => updateEnhancement(item.id || item.itemNumber, 'technicalSpecs', e.target.value)}
                      placeholder="Key specifications"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {item.suggestions.filter(s => s.field === 'technicalSpecs').map((suggestion, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                        <div className="flex items-center">
                          <Lightbulb className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="text-blue-700">{suggestion.value}</span>
                        </div>
                        <button
                          onClick={() => applySuggestion(item.id || item.itemNumber, suggestion)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {hasAnyEnhancements 
                ? "Enhancements will be saved and used to improve future AI matching"
                : "Add at least one enhancement to proceed"
              }
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEnhanceAndRematch}
                disabled={!hasAnyEnhancements || isProcessing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Enhance & Re-match
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancementSuggestionModal;
