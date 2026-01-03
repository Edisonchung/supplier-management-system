import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Sparkles, Edit3, RotateCcw, Save, 
  ChevronDown, ChevronUp, History, Copy, Check,
  AlertCircle, Wand2, RefreshCw
} from 'lucide-react';
import AIDescriptionGenerator from './AIDescriptionGenerator';
import DescriptionHistory from './DescriptionHistory';

/**
 * DescriptionEditor - Comprehensive description management for quotation line items
 * 
 * Features:
 * - Three modes: Standard (catalog), AI-generated, Custom
 * - Rich text editing with formatting preview
 * - AI description generation via MCP
 * - Version history tracking
 * - Copy/paste functionality
 * - Character count and limits
 */
const DescriptionEditor = ({
  productId,
  productName,
  productSpecs = {},
  currentDescription = '',
  standardDescription = '',
  descriptionType = 'standard', // 'standard' | 'ai' | 'custom'
  onChange,
  onTypeChange,
  maxLength = 2000,
  readOnly = false,
  showHistory = true,
  className = ''
}) => {
  // State
  const [activeTab, setActiveTab] = useState(descriptionType);
  const [customText, setCustomText] = useState(
    descriptionType === 'custom' ? currentDescription : ''
  );
  const [aiDescription, setAiDescription] = useState(
    descriptionType === 'ai' ? currentDescription : ''
  );
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState(null);

  // Determine which description to display based on active tab
  const getActiveDescription = useCallback(() => {
    switch (activeTab) {
      case 'standard':
        return standardDescription;
      case 'ai':
        return aiDescription;
      case 'custom':
        return customText;
      default:
        return standardDescription;
    }
  }, [activeTab, standardDescription, aiDescription, customText]);

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const description = tab === 'standard' 
      ? standardDescription 
      : tab === 'ai' 
        ? aiDescription 
        : customText;
    
    onTypeChange?.(tab);
    onChange?.(description, tab);
  };

  // Handle custom text change
  const handleCustomChange = (e) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setCustomText(value);
      setHasChanges(true);
      if (activeTab === 'custom') {
        onChange?.(value, 'custom');
      }
    }
  };

  // Handle AI description generated
  const handleAIGenerated = (description) => {
    setAiDescription(description);
    setShowAIGenerator(false);
    setHasChanges(true);
    if (activeTab === 'ai') {
      onChange?.(description, 'ai');
    }
    // Switch to AI tab
    handleTabChange('ai');
  };

  // Handle history selection
  const handleHistorySelect = (historyItem) => {
    if (historyItem.type === 'ai') {
      setAiDescription(historyItem.description);
      handleTabChange('ai');
    } else if (historyItem.type === 'custom') {
      setCustomText(historyItem.description);
      handleTabChange('custom');
    }
    setShowHistoryPanel(false);
    setHasChanges(true);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getActiveDescription());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  // Reset to standard
  const handleReset = () => {
    setCustomText('');
    setAiDescription('');
    handleTabChange('standard');
    setHasChanges(false);
  };

  // Copy standard to custom for editing
  const handleCopyToCustom = () => {
    setCustomText(standardDescription);
    handleTabChange('custom');
    setHasChanges(true);
  };

  // Format description for display (handle newlines, bullets, etc.)
  const formatDescription = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((line, index) => {
      // Check for bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <li key={index} className="ml-4 text-gray-700">
            {line.trim().replace(/^[•-]\s*/, '')}
          </li>
        );
      }
      // Regular line
      return (
        <p key={index} className="text-gray-700">
          {line || '\u00A0'}
        </p>
      );
    });
  };

  // Get character count info
  const getCharacterInfo = () => {
    const text = getActiveDescription();
    const count = text?.length || 0;
    const percentage = (count / maxLength) * 100;
    
    return {
      count,
      percentage,
      isWarning: percentage > 80,
      isError: percentage > 95
    };
  };

  const charInfo = getCharacterInfo();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Description</span>
          {hasChanges && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
              Modified
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* History toggle */}
          {showHistory && (
            <button
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="View history"
            >
              <History className="w-4 h-4" />
            </button>
          )}
          
          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
          
          {/* Reset button */}
          {hasChanges && !readOnly && (
            <button
              onClick={handleReset}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Reset to standard"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          
          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      {!readOnly && (
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => handleTabChange('standard')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'standard'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <FileText className="w-4 h-4" />
              Standard
            </div>
          </button>
          
          <button
            onClick={() => handleTabChange('ai')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              AI Generated
            </div>
          </button>
          
          <button
            onClick={() => handleTabChange('custom')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'custom'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-center gap-1.5">
              <Edit3 className="w-4 h-4" />
              Custom
            </div>
          </button>
        </div>
      )}

      {/* Content area */}
      <div className={`p-4 ${isExpanded ? 'min-h-[200px]' : 'min-h-[100px]'}`}>
        {/* Standard description display */}
        {activeTab === 'standard' && (
          <div>
            {standardDescription ? (
              <div className="prose prose-sm max-w-none">
                {formatDescription(standardDescription)}
              </div>
            ) : (
              <div className="text-gray-400 italic">
                No standard description available for this product.
              </div>
            )}
            
            {!readOnly && standardDescription && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleCopyToCustom}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit as custom
                </button>
              </div>
            )}
          </div>
        )}

        {/* AI description display */}
        {activeTab === 'ai' && (
          <div>
            {aiDescription ? (
              <div className="prose prose-sm max-w-none">
                {formatDescription(aiDescription)}
              </div>
            ) : (
              <div className="text-center py-6">
                <Wand2 className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                <p className="text-gray-500 mb-3">
                  No AI description generated yet.
                </p>
                {!readOnly && (
                  <button
                    onClick={() => setShowAIGenerator(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </button>
                )}
              </div>
            )}
            
            {!readOnly && aiDescription && (
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => setShowAIGenerator(true)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
                <button
                  onClick={() => {
                    setCustomText(aiDescription);
                    handleTabChange('custom');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit as custom
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom description editor */}
        {activeTab === 'custom' && (
          <div>
            {readOnly ? (
              <div className="prose prose-sm max-w-none">
                {formatDescription(customText)}
              </div>
            ) : (
              <>
                <textarea
                  value={customText}
                  onChange={handleCustomChange}
                  placeholder="Enter your custom description here..."
                  className={`w-full min-h-[120px] p-3 border rounded-lg resize-y focus:outline-none focus:ring-2 ${
                    charInfo.isError 
                      ? 'border-red-300 focus:ring-red-200' 
                      : charInfo.isWarning
                        ? 'border-amber-300 focus:ring-amber-200'
                        : 'border-gray-200 focus:ring-blue-200'
                  }`}
                  style={{ minHeight: isExpanded ? '180px' : '120px' }}
                />
                
                {/* Character count */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Supports bullets (• or -), newlines for formatting
                  </div>
                  <div className={`text-xs ${
                    charInfo.isError 
                      ? 'text-red-600' 
                      : charInfo.isWarning
                        ? 'text-amber-600'
                        : 'text-gray-500'
                  }`}>
                    {charInfo.count} / {maxLength}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="mt-3 flex gap-2">
                  {standardDescription && (
                    <button
                      onClick={() => setCustomText(standardDescription)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded"
                    >
                      Start from standard
                    </button>
                  )}
                  {aiDescription && (
                    <button
                      onClick={() => setCustomText(aiDescription)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded"
                    >
                      Start from AI
                    </button>
                  )}
                  {customText && (
                    <button
                      onClick={() => setCustomText('')}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 border border-red-200 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <AIDescriptionGenerator
          productId={productId}
          productName={productName}
          productSpecs={productSpecs}
          standardDescription={standardDescription}
          onGenerated={handleAIGenerated}
          onClose={() => setShowAIGenerator(false)}
        />
      )}

      {/* History Panel */}
      {showHistoryPanel && (
        <DescriptionHistory
          productId={productId}
          onSelect={handleHistorySelect}
          onClose={() => setShowHistoryPanel(false)}
        />
      )}
    </div>
  );
};

export default DescriptionEditor;
