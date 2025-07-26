// =====================================================
// CREATE NEW FILE: src/components/BackgroundExtractionIndicator.jsx
// =====================================================

import React, { useState } from 'react';
import { CheckCircle, X, FileText, Clock, AlertCircle } from 'lucide-react';

/**
 * Background Extraction Progress Indicator
 * Shows ongoing extractions in a dismissible floating notification
 */
export const BackgroundExtractionIndicator = ({
  extractionProgress,
  activeExtractions = [],
  onCancel,
  onDismiss
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Don't show if dismissed or no active extractions
  if (isDismissed || (!extractionProgress && activeExtractions.length === 0)) {
    return null;
  }
  
  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };
  
  const handleCancel = () => {
    if (extractionProgress?.extractionId) {
      onCancel?.(extractionProgress.extractionId);
    }
  };
  
  // Format time remaining
  const formatTimeRemaining = (milliseconds) => {
    if (!milliseconds || milliseconds <= 0) return 'Almost done...';
    
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) return `${seconds}s remaining`;
    
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m remaining`;
  };
  
  // Get status icon and color
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' };
      case 'processing':
        return { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' };
      default:
        return { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50 border-gray-200' };
    }
  };
  
  // Main extraction to display
  const mainExtraction = extractionProgress || activeExtractions[0];
  const hasMultiple = activeExtractions.length > 1;
  
  if (!mainExtraction) return null;
  
  const { icon: StatusIcon, color, bgColor } = getStatusDisplay(mainExtraction.status);
  
  return (
    <div className={`fixed top-4 right-4 z-50 min-w-80 max-w-96 rounded-lg border ${bgColor} shadow-lg`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <StatusIcon className={`w-5 h-5 ${color}`} />
            <div>
              <h4 className="font-medium text-gray-900">
                PI Extraction {mainExtraction.status === 'processing' ? 'in Progress' : 'Complete'}
              </h4>
              {hasMultiple && (
                <p className="text-xs text-gray-500">
                  {activeExtractions.length} extractions running
                </p>
              )}
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* File Info */}
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-700 truncate" title={mainExtraction.fileName}>
            {mainExtraction.fileName}
          </p>
          
          {mainExtraction.status === 'processing' && (
            <div className="mt-2">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${mainExtraction.progressPercentage || 0}%` }}
                />
              </div>
              
              {/* Progress Text */}
              <div className="flex justify-between items-center mt-1 text-xs text-gray-600">
                <span>{mainExtraction.progressPercentage || 0}% complete</span>
                <span>{formatTimeRemaining(mainExtraction.estimatedTimeRemaining)}</span>
              </div>
            </div>
          )}
          
          {mainExtraction.status === 'completed' && (
            <p className="text-sm text-green-600 mt-1">
              ✓ Extraction completed successfully
            </p>
          )}
          
          {mainExtraction.status === 'failed' && (
            <p className="text-sm text-red-600 mt-1">
              ✗ Extraction failed: {mainExtraction.error}
            </p>
          )}
        </div>
        
        {/* Background Processing Info */}
        {mainExtraction.status === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mt-1"></div>
              </div>
              <div className="text-xs text-blue-700">
                <p className="font-medium">Running in background</p>
                <p>You can navigate to other pages while this processes</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {mainExtraction.startedAt && (
              <span>
                Started {new Date(mainExtraction.startedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex space-x-2">
            {mainExtraction.status === 'processing' && onCancel && (
              <button
                onClick={handleCancel}
                className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
              >
                Cancel
              </button>
            )}
            
            <button
              onClick={handleDismiss}
              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        {/* Multiple Extractions List */}
        {hasMultiple && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">Other active extractions:</p>
            <div className="space-y-1">
              {activeExtractions.slice(1, 4).map((extraction, index) => (
                <div key={extraction.extractionId} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 truncate flex-1" title={extraction.fileName}>
                    {extraction.fileName}
                  </span>
                  <span className={`ml-2 ${getStatusDisplay(extraction.status).color}`}>
                    {extraction.status}
                  </span>
                </div>
              ))}
              
              {activeExtractions.length > 4 && (
                <p className="text-xs text-gray-500">
                  +{activeExtractions.length - 4} more extractions...
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BackgroundExtractionIndicator;
