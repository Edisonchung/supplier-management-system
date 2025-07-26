// =====================================================
// CREATE NEW FILE: src/hooks/useSinglePIExtraction.js
// =====================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import EnhancedBatchUploadService from '../services/EnhancedBatchUploadService';

/**
 * Custom hook for single PI extraction with background processing
 * Provides all the benefits of batch upload infrastructure for single files
 */
export const useSinglePIExtraction = () => {
  // State management
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [activeExtractions, setActiveExtractions] = useState([]);
  
  // Refs for cleanup and persistence
  const monitoringIntervals = useRef(new Map());
  const serviceInitialized = useRef(false);
  
  // Initialize service on mount
  useEffect(() => {
    if (!serviceInitialized.current) {
      console.log('🔧 Initializing EnhancedBatchUploadService for single PI extraction...');
      
      try {
        EnhancedBatchUploadService.init();
        
        // Resume any active extractions from previous session
        const resumed = EnhancedBatchUploadService.resumeSingleExtractions();
        if (resumed.length > 0) {
          setActiveExtractions(resumed);
        }
        
        serviceInitialized.current = true;
        console.log('✅ Service initialized for single PI extraction');
        
      } catch (error) {
        console.error('❌ Failed to initialize service:', error);
        setError('Failed to initialize extraction service');
      }
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup monitoring intervals
      for (const interval of monitoringIntervals.current.values()) {
        clearInterval(interval);
      }
      monitoringIntervals.current.clear();
    };
  }, []);
  
  /**
   * Start extraction of a single PI file
   */
  const startExtraction = useCallback(async (file, options = {}) => {
    console.log('🚀 Starting single PI extraction:', file.name);
    
    try {
      setIsExtracting(true);
      setError(null);
      setExtractedData(null);
      
      // Start the extraction
      const result = await EnhancedBatchUploadService.processSingleDocument(file, 'pi', {
        storeDocuments: true,
        autoSave: true,
        ...options
      });
      
      console.log('✅ Extraction started successfully:', result);
      
      // Set initial progress
      setExtractionProgress({
        extractionId: result.extractionId,
        fileName: result.fileName,
        status: 'processing',
        progress: 0,
        startedAt: result.startedAt,
        canNavigateAway: true
      });
      
      // Start monitoring
      startMonitoring(result.extractionId);
      
      // Add to active extractions
      setActiveExtractions(prev => [...prev, result]);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to start extraction:', error);
      setError(error.message);
      setIsExtracting(false);
      throw error;
    }
  }, []);
  
  /**
   * Monitor extraction progress
   */
  const startMonitoring = useCallback((extractionId) => {
    console.log('👁️ Starting to monitor extraction:', extractionId);
    
    const interval = setInterval(() => {
      const status = EnhancedBatchUploadService.getSingleFileStatus(extractionId);
      
      if (!status || status.status === 'not_found') {
        console.warn('⚠️ Extraction not found, stopping monitoring');
        stopMonitoring(extractionId);
        return;
      }
      
      // Update progress
      setExtractionProgress(status);
      
      // Check if completed
      if (status.status === 'completed') {
        console.log('🎉 Extraction completed successfully:', status.fileName);
        
        setExtractedData(status.extractedData);
        setIsExtracting(false);
        stopMonitoring(extractionId);
        
        // Remove from active extractions
        setActiveExtractions(prev => 
          prev.filter(ext => ext.extractionId !== extractionId)
        );
        
      } else if (status.status === 'failed') {
        console.error('❌ Extraction failed:', status.error);
        
        setError(status.error);
        setIsExtracting(false);
        stopMonitoring(extractionId);
        
        // Remove from active extractions
        setActiveExtractions(prev => 
          prev.filter(ext => ext.extractionId !== extractionId)
        );
      }
      
    }, 2000); // Check every 2 seconds
    
    monitoringIntervals.current.set(extractionId, interval);
  }, []);
  
  /**
   * Stop monitoring an extraction
   */
  const stopMonitoring = useCallback((extractionId) => {
    const interval = monitoringIntervals.current.get(extractionId);
    if (interval) {
      clearInterval(interval);
      monitoringIntervals.current.delete(extractionId);
      console.log('🛑 Stopped monitoring:', extractionId);
    }
  }, []);
  
  /**
   * Cancel an active extraction
   */
  const cancelExtraction = useCallback(async (extractionId) => {
    try {
      console.log('🛑 Cancelling extraction:', extractionId);
      
      const result = await EnhancedBatchUploadService.cancelSingleExtraction(extractionId);
      
      if (result.success) {
        setIsExtracting(false);
        setExtractionProgress(null);
        stopMonitoring(extractionId);
        
        // Remove from active extractions
        setActiveExtractions(prev => 
          prev.filter(ext => ext.extractionId !== extractionId)
        );
        
        console.log('✅ Extraction cancelled successfully');
      } else {
        throw new Error(result.error || result.reason || 'Failed to cancel');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to cancel extraction:', error);
      setError(error.message);
      throw error;
    }
  }, []);
  
  /**
   * Get status of a specific extraction
   */
  const getExtractionStatus = useCallback((extractionId) => {
    return EnhancedBatchUploadService.getSingleFileStatus(extractionId);
  }, []);
  
  /**
   * Clear completed extraction data
   */
  const clearExtraction = useCallback(() => {
    setExtractedData(null);
    setExtractionProgress(null);
    setError(null);
    setIsExtracting(false);
  }, []);
  
  /**
   * Refresh active extractions list
   */
  const refreshActiveExtractions = useCallback(() => {
    const active = EnhancedBatchUploadService.getActiveSingleExtractions();
    setActiveExtractions(active);
    return active;
  }, []);
  
  return {
    // State
    isExtracting,
    extractionProgress,
    extractedData,
    error,
    activeExtractions,
    
    // Actions
    startExtraction,
    cancelExtraction,
    clearExtraction,
    
    // Utilities
    getExtractionStatus,
    refreshActiveExtractions,
    
    // Status helpers
    canNavigateAway: !isExtracting || (extractionProgress?.canNavigateAway === true),
    isBackgroundProcessing: extractionProgress?.backgroundProcessing === true,
    progressPercentage: extractionProgress?.progressPercentage || 0
  };
};

export default useSinglePIExtraction;
