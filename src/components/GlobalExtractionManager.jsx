// =====================================================
// CREATE NEW FILE: src/components/GlobalExtractionManager.jsx
// =====================================================

import React, { useEffect, useState } from 'react';
import { useSinglePIExtraction } from '../hooks/useSinglePIExtraction';
import BackgroundExtractionIndicator from './BackgroundExtractionIndicator';

/**
 * Global Background Extraction Manager
 * Monitors and displays all background extractions across the entire app
 * Mount this in your main App.jsx or layout component
 */
export const GlobalExtractionManager = () => {
  const {
    activeExtractions,
    cancelExtraction,
    refreshActiveExtractions
  } = useSinglePIExtraction();
  
  const [visibleExtraction, setVisibleExtraction] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Monitor active extractions
  useEffect(() => {
    // Refresh active extractions on mount
    refreshActiveExtractions();
    
    // Set up periodic refresh to catch any missed updates
    const interval = setInterval(() => {
      refreshActiveExtractions();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [refreshActiveExtractions]);
  
  // Update visible extraction when active extractions change
  useEffect(() => {
    if (activeExtractions.length > 0 && !isDismissed) {
      // Show the most recent processing extraction
      const processingExtractions = activeExtractions.filter(ext => ext.status === 'processing');
      setVisibleExtraction(processingExtractions[0] || activeExtractions[0]);
    } else {
      setVisibleExtraction(null);
    }
  }, [activeExtractions, isDismissed]);
  
  // Reset dismissed state when no active extractions
  useEffect(() => {
    if (activeExtractions.length === 0) {
      setIsDismissed(false);
    }
  }, [activeExtractions.length]);
  
  const handleCancel = async (extractionId) => {
    try {
      await cancelExtraction(extractionId);
    } catch (error) {
      console.error('Failed to cancel extraction:', error);
    }
  };
  
  const handleDismiss = () => {
    setIsDismissed(true);
    setVisibleExtraction(null);
  };
  
  // Don't render if no active extractions or dismissed
  if (!visibleExtraction || isDismissed) {
    return null;
  }
  
  return (
    <BackgroundExtractionIndicator
      extractionProgress={visibleExtraction}
      activeExtractions={activeExtractions}
      onCancel={handleCancel}
      onDismiss={handleDismiss}
    />
  );
};

export default GlobalExtractionManager;
