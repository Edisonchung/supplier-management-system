// src/components/procurement/EnhancedPIUpload.jsx
import React, { useState, useCallback } from 'react';
import { Upload, FileText, Sparkles, CheckCircle, AlertTriangle, Loader2, BarChart3 } from 'lucide-react';
import { PIProductSyncService } from '../../services/PIProductSyncService';
import { useEnhancedProducts } from '../../hooks/useEnhancedProducts';

const EnhancedPIUpload = ({ 
  onPIUploaded, 
  suppliers = [], 
  showNotification,
  existingPIs = [] 
}) => {
  const { products, addProduct } = useEnhancedProducts();
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    isSyncing: false,
    uploadProgress: 0,
    currentFile: '',
    syncProgress: null
  });
  
  const [syncResults, setSyncResults] = useState(null);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  /**
   * Enhanced PI upload with automatic product sync
   */
  const handleEnhancedPIUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    setUploadState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));
    setSyncResults(null);

    const allResults = {
      totalFiles: files.length,
      successfulUploads: 0,
      totalProductsCreated: 0,
      totalProductsEnhanced: 0,
      errors: [],
      piResults: []
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        setUploadState(prev => ({ 
          ...prev, 
          currentFile: file.name,
          uploadProgress: Math.round(((i + 0.5) / files.length) * 100)
        }));

        // Upload and extract PI data (your existing logic)
        const piUploadResult = await uploadSinglePI(file);
        
        if (piUploadResult.success) {
          allResults.successfulUploads++;
          
          // Enhanced product sync with AI
          setUploadState(prev => ({ ...prev, isSyncing: true }));
          
          const syncResult = await PIProductSyncService.syncPIProductsWithEnhancement(
            piUploadResult.extractedData,
            piUploadResult.savedPI,
            products,
            addProduct,
            showNotification
          );

          allResults.totalProductsCreated += syncResult.created;
          allResults.totalProductsEnhanced += syncResult.enhanced;
          allResults.piResults.push({
            fileName: file.name,
            piNumber: piUploadResult.extractedData.piNumber,
            syncResult
          });

          // Notify parent component
          if (onPIUploaded) {
            onPIUploaded(piUploadResult.savedPI, syncResult);
          }

        } else {
          allResults.errors.push({
            fileName: file.name,
            error: piUploadResult.error
          });
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        allResults.errors.push({
          fileName: file.name,
          error: error.message
        });
      }

      setUploadState(prev => ({ 
        ...prev, 
        uploadProgress: Math.round(((i + 1) / files.length) * 100)
      }));
    }

    // Show comprehensive results
    setSyncResults(allResults);
    setUploadState(prev => ({ 
      ...prev, 
      isUploading: false, 
      isSyncing: false,
      currentFile: '',
      uploadProgress: 0 
    }));

    // Show summary notification
    showEnhancedUploadNotification(allResults);

  }, [products, addProduct, showNotification, onPIUploaded]);

  /**
   * Upload single PI file (your existing logic, enhanced)
   */
  const uploadSinglePI = async (file) => {
    // This should integrate with your existing PI upload logic
    // For now, this is a placeholder that should be replaced with your actual implementation
    
    try {
      // Your existing PI extraction logic here
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-pi', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Save to database (your existing logic)
        const savedPI = await savePIToDatabase(result.extractedData);
        
        return {
          success: true,
          extractedData: result.extractedData,
          savedPI: savedPI.pi
        };
      } else {
        throw new Error(result.error || 'Extraction failed');
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  };

  /**
   * Save PI to database (placeholder - replace with your actual implementation)
   */
  const savePIToDatabase = async (piData) => {
    // Replace this with your actual PI saving logic
    try {
      const response = await fetch('/api/save-pi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(piData)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      throw new Error(`Failed to save PI: ${error.message}`);
    }
  };

  /**
   * Show enhanced upload notification
   */
  const showEnhancedUploadNotification = (results) => {
    const { successfulUploads, totalProductsCreated, totalProductsEnhanced, errors } = results;
    
    if (errors.length > 0) {
      const errorFiles = errors.map(e => e.fileName).join(', ');
      showNotification?.(
        `Upload completed with ${errors.length} errors. Failed files: ${errorFiles}`,
        'warning',
        8000
      );
    } else if (successfulUploads > 0) {
      const enhancedText = totalProductsEnhanced > 0 ? ` (${totalProductsEnhanced} AI-enhanced)` : '';
      showNotification?.(
        `🎉 Upload successful! ${successfulUploads} PIs processed, ${totalProductsCreated} products created${enhancedText}`,
        'success',
        6000
      );
    }
  };

  /**
   * Handle file drop
   */
  const handleFileDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (files.length > 0) {
      handleEnhancedPIUpload(files);
    } else {
      showNotification?.('Please upload PDF files only', 'warning');
    }
  }, [handleEnhancedPIUpload, showNotification]);

  /**
   * Handle file input change
   */
  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleEnhancedPIUpload(files);
    }
  }, [handleEnhancedPIUpload]);

  return (
    <div className="space-y-6">
      {/* Enhanced Upload Zone */}
      <div
        onDrop={handleFileDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          uploadState.isUploading 
            ? 'border-blue-300 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        }`}
      >
        {/* Upload Progress Overlay */}
        {uploadState.isUploading && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-90 rounded-xl flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-4">
              <Loader2 size={48} className="animate-spin text-blue-600 mx-auto" />
              
              <div className="space-y-2">
                <p className="font-semibold text-blue-800">
                  {uploadState.isSyncing ? 'Syncing Products with AI Enhancement...' : 'Processing PI Documents...'}
                </p>
                
                {uploadState.currentFile && (
                  <p className="text-blue-600 text-sm">
                    Current: {uploadState.currentFile}
                  </p>
                )}
                
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.uploadProgress}%` }}
                  />
                </div>
                
                <p className="text-blue-700 text-sm font-medium">
                  {uploadState.uploadProgress}% Complete
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Interface */}
        <div className={uploadState.isUploading ? 'opacity-20' : ''}>
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
              <Upload size={32} className="text-blue-600" />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Enhanced PI Upload with AI
              </h3>
              <p className="text-gray-600">
                Drop PDF files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ✨ Automatic product creation with AI enhancement
              </p>
            </div>

            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileInput}
              disabled={uploadState.isUploading}
              className="hidden"
              id="pi-file-input"
            />
            
            <label
              htmlFor="pi-file-input"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 cursor-pointer font-medium flex items-center gap-2 disabled:opacity-50"
            >
              <FileText size={20} />
              Choose Files
            </label>
          </div>
        </div>
      </div>

      {/* Enhanced Results Display */}
      {syncResults && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                Upload Results
              </h3>
              <button
                onClick={() => setShowSyncDetails(!showSyncDetails)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                {showSyncDetails ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {syncResults.successfulUploads}
                </div>
                <div className="text-sm text-blue-700">PIs Processed</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {syncResults.totalProductsCreated}
                </div>
                <div className="text-sm text-green-700">Products Created</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 flex items-center justify-center gap-1">
                  <Sparkles size={20} />
                  {syncResults.totalProductsEnhanced}
                </div>
                <div className="text-sm text-purple-700">AI Enhanced</div>
              </div>
              
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {Math.round((syncResults.totalProductsEnhanced / Math.max(syncResults.totalProductsCreated, 1)) * 100)}%
                </div>
                <div className="text-sm text-gray-700">Enhancement Rate</div>
              </div>
            </div>

            {/* Error Summary */}
            {syncResults.errors.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-600" />
                  <span className="font-medium text-red-800">
                    {syncResults.errors.length} Error(s) Occurred
                  </span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {syncResults.errors.map((error, index) => (
                    <li key={index}>
                      <strong>{error.fileName}:</strong> {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Results */}
            {showSyncDetails && (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <BarChart3 size={18} />
                  Detailed Results
                </h4>
                
                {syncResults.piResults.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-800">
                        {result.fileName}
                      </h5>
                      <span className="text-sm text-gray-600">
                        PI: {result.piNumber}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Products Created:</span>
                        <span className="ml-2 font-medium">{result.syncResult.created}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Products Updated:</span>
                        <span className="ml-2 font-medium">{result.syncResult.updated}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">AI Enhanced:</span>
                        <span className="ml-2 font-medium text-purple-600">
                          {result.syncResult.enhanced}
                        </span>
                      </div>
                    </div>
                    
                    {result.syncResult.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-red-50 rounded text-sm">
                        <span className="text-red-700 font-medium">Errors:</span>
                        <ul className="mt-1 text-red-600">
                          {result.syncResult.errors.slice(0, 3).map((error, i) => (
                            <li key={i}>• {error.item}: {error.error}</li>
                          ))}
                          {result.syncResult.errors.length > 3 && (
                            <li>• ... and {result.syncResult.errors.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhancement Statistics */}
      {syncResults && syncResults.totalProductsEnhanced > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
            <Sparkles size={18} />
            AI Enhancement Summary
          </h4>
          <p className="text-purple-700 text-sm">
            Our AI successfully enhanced {syncResults.totalProductsEnhanced} out of {syncResults.totalProductsCreated} products 
            ({Math.round((syncResults.totalProductsEnhanced / Math.max(syncResults.totalProductsCreated, 1)) * 100)}% success rate).
            Enhanced products have automatically detected brands, categories, and technical specifications.
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedPIUpload;
