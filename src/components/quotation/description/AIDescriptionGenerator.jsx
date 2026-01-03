import React, { useState, useCallback } from 'react';
import { 
  Sparkles, X, Loader2, RefreshCw, Copy, Check,
  Settings2, ChevronDown, ChevronUp, AlertCircle,
  Wand2, FileText, Tag, Ruler, Zap
} from 'lucide-react';
import AIDescriptionService from '../../../services/AIDescriptionService';

/**
 * AIDescriptionGenerator - MCP-powered AI description generation modal
 * 
 * Features:
 * - Multiple tone presets (Technical, Commercial, Simple)
 * - Configurable length and focus areas
 * - Spec highlighting options
 * - Real-time generation with streaming
 * - Copy and apply functionality
 */
const AIDescriptionGenerator = ({
  productId,
  productName,
  productSpecs = {},
  standardDescription = '',
  existingAIDescription = '',
  onGenerated,
  onClose
}) => {
  // Configuration state
  const [config, setConfig] = useState({
    tone: 'commercial', // 'technical' | 'commercial' | 'simple'
    length: 'medium', // 'short' | 'medium' | 'long'
    focusAreas: ['features', 'benefits'], // 'features' | 'benefits' | 'specs' | 'applications'
    highlightSpecs: true,
    includeModel: true,
    includeBrand: true
  });
  
  // Normalize existingAIDescription to ensure it's always a string
  const normalizeDescription = (desc) => {
    if (!desc) return '';
    if (typeof desc === 'string') return desc;
    if (typeof desc === 'object' && desc.description) return desc.description;
    return String(desc);
  };
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState(normalizeDescription(existingAIDescription));
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Tone presets
  const tonePresets = [
    {
      id: 'technical',
      name: 'Technical',
      icon: Settings2,
      description: 'Detailed specs, industry terminology',
      color: 'blue'
    },
    {
      id: 'commercial',
      name: 'Commercial',
      icon: Zap,
      description: 'Benefits-focused, persuasive',
      color: 'purple'
    },
    {
      id: 'simple',
      name: 'Simple',
      icon: FileText,
      description: 'Easy to understand, concise',
      color: 'green'
    }
  ];

  // Length options
  const lengthOptions = [
    { id: 'short', name: 'Short', chars: '100-200' },
    { id: 'medium', name: 'Medium', chars: '200-400' },
    { id: 'long', name: 'Long', chars: '400-600' }
  ];

  // Focus area options
  const focusOptions = [
    { id: 'features', name: 'Key Features', icon: Tag },
    { id: 'benefits', name: 'Benefits', icon: Zap },
    { id: 'specs', name: 'Specifications', icon: Ruler },
    { id: 'applications', name: 'Applications', icon: Settings2 }
  ];

  // Handle configuration change
  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Toggle focus area
  const toggleFocusArea = (areaId) => {
    setConfig(prev => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(areaId)
        ? prev.focusAreas.filter(a => a !== areaId)
        : [...prev.focusAreas, areaId]
    }));
  };

  // Generate description
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await AIDescriptionService.generateDescription({
        productId,
        productName,
        productSpecs,
        standardDescription,
        config: {
          tone: config.tone,
          length: config.length,
          focusAreas: config.focusAreas,
          highlightSpecs: config.highlightSpecs,
          includeModel: config.includeModel,
          includeBrand: config.includeBrand
        }
      });
      
      if (result.success) {
        // Ensure description is always a string, not an object
        const descriptionText = typeof result.description === 'string' 
          ? result.description 
          : (result.description && typeof result.description === 'object' && result.description.description)
            ? result.description.description
            : String(result.description || '');
        setGeneratedText(descriptionText);
      } else {
        setError(result.error || 'Failed to generate description');
      }
    } catch (err) {
      console.error('AI Generation error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Apply generated description
  const handleApply = () => {
    if (generatedText) {
      // Ensure generatedText is always a string before passing to parent
      const descriptionText = typeof generatedText === 'string' 
        ? generatedText 
        : (generatedText && typeof generatedText === 'object' && generatedText.description)
          ? generatedText.description
          : String(generatedText || '');
      onGenerated(descriptionText);
    }
  };

  // Get tone color classes
  const getToneColor = (toneId) => {
    const colors = {
      technical: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        ring: 'ring-blue-500'
      },
      commercial: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        ring: 'ring-purple-500'
      },
      simple: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        ring: 'ring-green-500'
      }
    };
    return colors[toneId] || colors.commercial;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Description Generator
              </h2>
              <p className="text-sm text-gray-500">
                Generate compelling product descriptions with AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-500 mb-1">Generating for:</div>
            <div className="font-medium text-gray-900">{productName || 'Unknown Product'}</div>
            {productSpecs.model && (
              <div className="text-sm text-gray-600 mt-1">
                Model: {productSpecs.model}
              </div>
            )}
          </div>

          {/* Tone Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tone & Style
            </label>
            <div className="grid grid-cols-3 gap-3">
              {tonePresets.map((preset) => {
                const Icon = preset.icon;
                const isSelected = config.tone === preset.id;
                const colors = getToneColor(preset.id);
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => updateConfig('tone', preset.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? `${colors.bg} ${colors.border} ring-2 ${colors.ring}`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? colors.text : 'text-gray-400'}`} />
                    <div className={`font-medium ${isSelected ? colors.text : 'text-gray-900'}`}>
                      {preset.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Settings2 className="w-4 h-4" />
            Advanced Settings
            {showSettings ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* Advanced Settings */}
          {showSettings && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {/* Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description Length
                </label>
                <div className="flex gap-2">
                  {lengthOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => updateConfig('length', option.id)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-colors ${
                        config.length === option.id
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{option.name}</div>
                      <div className="text-xs opacity-75">{option.chars} chars</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Areas
                </label>
                <div className="flex flex-wrap gap-2">
                  {focusOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = config.focusAreas.includes(option.id);
                    
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleFocusArea(option.id)}
                        className={`flex items-center gap-1.5 py-1.5 px-3 rounded-full text-sm transition-colors ${
                          isSelected
                            ? 'bg-purple-100 text-purple-700 border border-purple-300'
                            : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {option.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.highlightSpecs}
                    onChange={(e) => updateConfig('highlightSpecs', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Highlight key specs</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeModel}
                    onChange={(e) => updateConfig('includeModel', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Include model number</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.includeBrand}
                    onChange={(e) => updateConfig('includeBrand', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Include brand name</span>
                </label>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                Generate Description
              </>
            )}
          </button>

          {/* Error Display */}
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-red-800">Generation Failed</div>
                <div className="text-sm text-red-600 mt-1">{error}</div>
              </div>
            </div>
          )}

          {/* Generated Result */}
          {generatedText && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  Generated Description
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="Regenerate"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {typeof generatedText === 'string' 
                    ? generatedText 
                    : (generatedText && typeof generatedText === 'object' && generatedText.description)
                      ? generatedText.description
                      : String(generatedText || '')}
                </p>
                <div className="mt-3 text-xs text-gray-400">
                  {typeof generatedText === 'string' 
                    ? generatedText.length 
                    : (generatedText && typeof generatedText === 'object' && generatedText.description)
                      ? generatedText.description.length
                      : String(generatedText || '').length} characters
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!generatedText}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Use This Description
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDescriptionGenerator;
