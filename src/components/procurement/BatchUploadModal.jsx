// src/components/procurement/BatchUploadModal.jsx
// Fixed version with proper PI integration and duplicate prevention

import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Clock, Download } from 'lucide-react';
import enhancedBatchUploadService from '../../services/EnhancedBatchUploadService';

const BatchUploadModal = ({ 
  isOpen, 
  onClose, 
  showNotification,
  addProformaInvoice, // NEW: Function to save PIs to database
  suppliers,          // NEW: For supplier matching
  addSupplier        // NEW: For creating new suppliers
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [priority, setPriority] = useState('normal');
  const [autoSave, setAutoSave] = useState(true);
  const [notifyComplete, setNotifyComplete] = useState(true);

  // ✅ NEW: Track processed batches to prevent duplicates
  const [processedBatches, setProcessedBatches] = useState(new Set());

  // Poll for batch updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const batches = enhancedBatchUploadService.getActiveBatches();
      setActiveBatches(batches);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // ✅ FIXED: Load processed batches from localStorage on mount
  useEffect(() => {
    const savedProcessedBatches = localStorage.getItem('processedBatches');
    if (savedProcessedBatches) {
      try {
        const batchIds = JSON.parse(savedProcessedBatches);
        setProcessedBatches(new Set(batchIds));
      } catch (error) {
        console.error('Failed to load processed batches:', error);
      }
    }
  }, []);

  // ✅ FIXED: Handle batch completion with proper duplicate prevention
  useEffect(() => {
    const handleBatchComplete = async (batchId) => {
      // ✅ Check if this batch has already been processed
      if (processedBatches.has(batchId)) {
        console.log('⚠️ Batch already processed, skipping:', batchId);
        return;
      }

      console.log('🎉 Processing completed batch for first time:', batchId);
      
      try {
        const batch = activeBatches.find(b => b.id === batchId);
        if (!batch) {
          console.log('❌ Batch not found:', batchId);
          return;
        }

        // Get all successful extractions
        const successfulFiles = batch.files.filter(f => 
          f.status === 'completed' && f.extractedData
        );

        console.log(`📊 Found ${successfulFiles.length} successful extractions`);

        let savedCount = 0;
        let errors = [];

        for (const file of successfulFiles) {
          try {
            const piData = await convertExtractedDataToPI(file.extractedData, file.fileName);
            
            // ✅ Save to database
            const result = await addProformaInvoice(piData);
            
            if (result && result.success !== false) {
              savedCount++;
              console.log('✅ Saved PI:', piData.piNumber);
            } else {
              throw new Error(result?.error || 'Failed to save PI');
            }
          } catch (error) {
            console.error('❌ Failed to save PI:', error);
            errors.push(`${file.fileName}: ${error.message}`);
          }
        }

        // ✅ Mark batch as processed and persist to localStorage
        const newProcessedBatches = new Set([...processedBatches, batchId]);
        setProcessedBatches(newProcessedBatches);
        
        // Persist to localStorage
        localStorage.setItem('processedBatches', JSON.stringify([...newProcessedBatches]));

        // Show final notification
        if (savedCount > 0) {
          showNotification(
            `Successfully imported ${savedCount} proforma invoice(s) to your database!`,
            'success'
          );
        }

        if (errors.length > 0) {
          showNotification(
            `${errors.length} files had errors: ${errors.join(', ')}`,
            'error'
          );
        }

      } catch (error) {
        console.error('Batch completion error:', error);
        showNotification('Failed to save extracted data to database', 'error');
      }
    };

    // ✅ FIXED: Only process newly completed batches
    activeBatches.forEach(batch => {
      if (batch.status === 'completed' && !processedBatches.has(batch.id)) {
        handleBatchComplete(batch.id);
      }
    });
  }, [activeBatches, processedBatches, addProformaInvoice, showNotification, suppliers, addSupplier]);

  // NEW: Convert extracted data to PI format
  const convertExtractedDataToPI = async (extractedData, fileName) => {
    // Handle nested structure from AI extraction
    const data = extractedData.proforma_invoice || extractedData;
    
    // Find or create supplier
    let supplierId = '';
    let supplierName = data.supplier?.name || data.supplierName || 'Unknown Supplier';
    
    if (supplierName && supplierName !== 'Unknown Supplier') {
      // Try to find existing supplier
      const existingSupplier = suppliers.find(s => 
        s.name.toLowerCase().includes(supplierName.toLowerCase()) ||
        supplierName.toLowerCase().includes(s.name.toLowerCase())
      );
      
      if (existingSupplier) {
        supplierId = existingSupplier.id;
        supplierName = existingSupplier.name;
      } else if (addSupplier) {
        // Create new supplier
        try {
          const newSupplierData = {
            name: supplierName,
            email: data.supplier?.email || '',
            phone: data.supplier?.phone || '',
            address: data.supplier?.address || '',
            status: 'active',
            createdAt: new Date().toISOString()
          };
          
          const result = await addSupplier(newSupplierData);
          if (result && (result.success !== false)) {
            supplierId = result.data?.id || result.id || result;
            console.log('✅ Created new supplier:', supplierName);
          }
        } catch (error) {
          console.warn('Failed to create supplier, proceeding without:', error);
        }
      }
    }

    // Convert to PI format
    const piData = {
      piNumber: data.pi_number || data.piNumber || `PI-${Date.now()}`,
      date: data.date || new Date().toISOString().split('T')[0],
      supplierId: supplierId,
      supplierName: supplierName,
      currency: data.currency || 'USD',
      totalAmount: parseFloat(data.total_amount || data.grandTotal || data.totalAmount || 0),
      items: (data.items || data.products || []).map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        productCode: item.product_code || item.productCode || item.sku || '',
        productName: item.product_name || item.productName || item.description || item.name || '',
        quantity: parseInt(item.quantity) || 1,
        unitPrice: parseFloat(item.unit_price || item.unitPrice || item.price || 0),
        totalPrice: parseFloat(item.total_price || item.totalPrice || item.total || 0),
        receivedQuantity: 0,
        deliveredQuantity: 0
      })),
      status: 'pending',
      deliveryStatus: 'pending',
      priority: 'normal',
      notes: `Imported from ${fileName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Document storage
      documents: {
        originalFile: fileName,
        extractedAt: new Date().toISOString(),
        extractionSource: 'batch_upload'
      }
    };

    return piData;
  };

  // ✅ NEW: Clear processed batches (for debugging/admin)
  const clearProcessedBatches = () => {
    if (window.confirm('This will allow completed batches to be processed again. Continue?')) {
      setProcessedBatches(new Set());
      localStorage.removeItem('processedBatches');
      showNotification('Processed batches cleared', 'info');
    }
  };

  // ✅ NEW: Clear processed files (for debugging/admin)
  const clearProcessedFiles = () => {
    if (window.confirm('This will allow the same files to be processed again. Continue?')) {
      enhancedBatchUploadService.clearProcessedFiles();
      showNotification('Processed files cleared - you can now reprocess the same files', 'info');
    }
  };

  // ✅ NEW: Clear everything (for debugging/admin)
  const clearAll = () => {
    if (window.confirm('This will clear all processing history. Continue?')) {
      setProcessedBatches(new Set());
      localStorage.removeItem('processedBatches');
      enhancedBatchUploadService.clearProcessedFiles();
      showNotification('All processing history cleared', 'info');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type === 'application/pdf' || 
      file.type.startsWith('image/') ||
      file.name.toLowerCase().endsWith('.xlsx') ||
      file.name.toLowerCase().endsWith('.xls')
    );
    
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleStartBatch = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const batchId = await enhancedBatchUploadService.startBatch(selectedFiles, {
        type: 'proforma_invoice',
        priority,
        autoSave,
        notifyWhenComplete: notifyComplete
      });

      showNotification(`Started batch processing ${selectedFiles.length} files`, 'success');
      setSelectedFiles([]);
      
      // Don't close modal immediately - let user see progress
    } catch (error) {
      showNotification('Failed to start batch processing', 'error');
      console.error('Batch start error:', error);
    }
  };

  const handleCancelBatch = (batchId) => {
    enhancedBatchUploadService.cancelBatch(batchId);
    showNotification('Batch processing cancelled', 'info');
  };

  const handleDownloadResults = (batchId) => {
    const batch = activeBatches.find(b => b.id === batchId);
    if (!batch) return;

    // Create downloadable results
    const results = batch.files.map(file => ({
      fileName: file.name,
      status: file.status,
      extractedData: file.extractedData,
      error: file.error
    }));

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_results_${batchId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Batch Upload - PROFORMA INVOICE</h2>
          <div className="flex items-center space-x-2">
            {/* ✅ DEBUG: Add buttons to clear processed data */}
            <button
              onClick={clearProcessedBatches}
              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
              title="Clear processed batches (allows re-saving to database)"
            >
              Clear Batches
            </button>
            <button
              onClick={clearProcessedFiles}
              className="text-xs bg-yellow-200 text-yellow-700 px-2 py-1 rounded hover:bg-yellow-300"
              title="Clear processed files (allows reprocessing same files)"
            >
              Clear Files
            </button>
            <button
              onClick={clearAll}
              className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded hover:bg-red-300"
              title="Clear all processing history"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          {/* Upload Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Upload Files</h3>
            
            {/* Settings */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Auto-save to database</span>
                </label>
              </div>
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={notifyComplete}
                    onChange={(e) => setNotifyComplete(e.target.checked)}
                    className="mr-2 h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Notify when complete</span>
                </label>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500">Supports PDF, Images (JPG, PNG), Excel (XLSX, XLS)</p>
              
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="batch-file-input"
              />
              <label
                htmlFor="batch-file-input"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
              >
                Browse Files
              </label>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={handleStartBatch}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Start Batch Processing
                </button>
              </div>
            )}
          </div>

          {/* Active Batches */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Active Batches</h3>
              {processedBatches.size > 0 && (
                <span className="text-xs text-gray-500">
                  {processedBatches.size} batch(es) processed
                </span>
              )}
            </div>
            
            {activeBatches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active batches</p>
            ) : (
              <div className="space-y-4">
                {activeBatches.map(batch => (
                  <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                    {/* Batch Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">Batch {batch.id}</h4>
                        <p className="text-sm text-gray-500">
                          Progress: {batch.completedFiles}/{batch.totalFiles} files
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                          batch.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          batch.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {batch.status}
                        </span>
                        
                        {/* ✅ Show if batch was processed */}
                        {processedBatches.has(batch.id) && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Saved to DB
                          </span>
                        )}
                        
                        {batch.status === 'processing' && (
                          <button
                            onClick={() => handleCancelBatch(batch.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        
                        {batch.status === 'completed' && (
                          <button
                            onClick={() => handleDownloadResults(batch.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(batch.completedFiles / batch.totalFiles) * 100}%` }}
                      ></div>
                    </div>

                    {/* File Status */}
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                      {batch.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center space-x-2">
                            {file.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : file.status === 'failed' ? (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-blue-600" />
                            )}
                            <span className="text-sm text-gray-700">{file.name}</span>
                          </div>
                          
                          {file.status === 'completed' && processedBatches.has(batch.id) && (
                            <span className="text-xs text-green-600">
                              ✅ Saved to Database
                            </span>
                          )}
                          
                          {file.status === 'failed' && file.error && (
                            <span className="text-xs text-red-600 max-w-xs truncate">
                              {file.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Batch Summary */}
                    {batch.status === 'completed' && (
                      <div className="mt-3 p-2 bg-green-50 rounded">
                        <p className="text-sm text-green-800">
                          ✅ Batch completed! {batch.successfulFiles} of {batch.totalFiles} files processed successfully.
                          {processedBatches.has(batch.id) ? 
                            " All proforma invoices have been added to your database." : 
                            " Processing for database save..."
                          }
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchUploadModal;
