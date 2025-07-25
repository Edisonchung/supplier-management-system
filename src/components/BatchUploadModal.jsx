import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Clock, CheckCircle, XCircle, RotateCcw, Pause, Play, Download } from 'lucide-react';
import enhancedBatchUploadService from '../services/EnhancedBatchUploadService';

const BatchUploadModal = ({ 
  isOpen, 
  onClose, 
  documentType = 'proforma_invoice',
  showNotification,
  addProformaInvoice,
  suppliers,
  addSupplier
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [uploadOptions, setUploadOptions] = useState({
    priority: 'normal',
    autoSave: true,
    notifyWhenComplete: true
  });

  // ✅ FIX: Add processed batches tracking to prevent duplicates
  const processedBatchesRef = useRef(new Set());
  const [processedBatchesDisplay, setProcessedBatchesDisplay] = useState(new Set());

  const fileInputRef = useRef(null);

  // ✅ FIX: Load processed batches from localStorage on mount
  useEffect(() => {
    const savedProcessedBatches = localStorage.getItem('processedBatches');
    if (savedProcessedBatches) {
      try {
        const batchIds = JSON.parse(savedProcessedBatches);
        const batchSet = new Set(batchIds);
        processedBatchesRef.current = batchSet;
        setProcessedBatchesDisplay(batchSet);
      } catch (error) {
        console.error('Failed to load processed batches:', error);
      }
    }
  }, []);

  // Poll for batch updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const batches = enhancedBatchUploadService.getActiveBatches();
      setActiveBatches(batches);
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Load initial batches when modal opens
  useEffect(() => {
    if (isOpen) {
      const batches = enhancedBatchUploadService.getActiveBatches();
      setActiveBatches(batches);
    }
  }, [isOpen]);

  // ✅ FIX: Add batch completion handling with documentId fix
  useEffect(() => {
    const handleBatchComplete = async (batchId) => {
      // Check if this batch has already been processed
      if (processedBatchesRef.current.has(batchId)) {
        console.log('⚠️ Batch already processed, skipping:', batchId);
        return;
      }

      console.log('🎉 Processing completed batch for first time:', batchId);
      
      // IMMEDIATELY mark as processed to prevent re-entry
      processedBatchesRef.current.add(batchId);
      const newProcessedBatches = new Set(processedBatchesRef.current);
      setProcessedBatchesDisplay(newProcessedBatches);
      
      // Persist to localStorage immediately
      localStorage.setItem('processedBatches', JSON.stringify([...newProcessedBatches]));
      
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

        if (successfulFiles.length === 0) {
          console.log('⚠️ No successful extractions found');
          return;
        }

        let savedCount = 0;
        let errors = [];

        for (const file of successfulFiles) {
          try {
            const piData = await convertExtractedDataToPI(file.extractedData, file.fileName);
            
            // ✅ CRITICAL FIX: Ensure documentId is properly mapped
            if (file.extractedData.documentStorage) {
              piData.documentId = file.extractedData.documentStorage.documentId;
              piData.documentNumber = file.extractedData.documentStorage.documentNumber;
              piData.documentType = 'pi';
              piData.hasStoredDocuments = true;
              piData.originalFileName = file.extractedData.documentStorage.originalFile?.originalFileName;
              piData.fileSize = file.extractedData.documentStorage.originalFile?.fileSize;
              piData.contentType = file.extractedData.documentStorage.originalFile?.contentType;
              piData.extractedAt = file.extractedData.documentStorage.storedAt;
              piData.storageInfo = file.extractedData.documentStorage;
            } else if (file.extractedData.extractionMetadata) {
              // Fallback to extraction metadata
              piData.documentId = file.extractedData.extractionMetadata.documentId;
              piData.documentNumber = file.extractedData.extractionMetadata.documentNumber;
              piData.documentType = 'pi';
              piData.hasStoredDocuments = false;
              piData.originalFileName = file.extractedData.extractionMetadata.originalFileName;
              piData.fileSize = file.extractedData.extractionMetadata.fileSize;
              piData.contentType = file.extractedData.extractionMetadata.contentType;
              piData.extractedAt = file.extractedData.extractionMetadata.extractedAt;
            }
            
            // ✅ VALIDATION: Ensure documentId is never undefined
            if (!piData.documentId || piData.documentId === undefined) {
              console.warn('⚠️ DocumentId is undefined, generating fallback for:', piData.piNumber);
              piData.documentId = `doc-fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              piData.hasStoredDocuments = false;
            }
            
            console.log('📋 Saving PI with verified documentId:', piData.documentId);
            
            // Save to database
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

        // Show final notification
        if (savedCount > 0) {
          showNotification && showNotification(
            `Successfully imported ${savedCount} proforma invoice(s) to your database!`,
            'success'
          );
        }

        if (errors.length > 0) {
          showNotification && showNotification(
            `${errors.length} files had errors: ${errors.join(', ')}`,
            'error'
          );
        }

      } catch (error) {
        console.error('Batch completion error:', error);
        showNotification && showNotification('Failed to save extracted data to database', 'error');
      }
    };

    // Only check for newly completed batches
    for (const batch of activeBatches) {
      if (batch.status === 'completed' && !processedBatchesRef.current.has(batch.id)) {
        // Use setTimeout to prevent multiple rapid calls
        setTimeout(() => handleBatchComplete(batch.id), 100);
      }
    }

  }, [activeBatches.map(b => `${b.id}-${b.status}`).join(','), addProformaInvoice, showNotification]);

  // ✅ FIX: Add conversion function for extracted data to PI format
  const convertExtractedDataToPI = async (extractedData, fileName) => {
    const data = extractedData.proforma_invoice || extractedData;
    
    // Find or create supplier
    let supplierId = '';
    let supplierName = data.supplier?.name || data.supplierName || 'Unknown Supplier';
    
    if (supplierName && supplierName !== 'Unknown Supplier' && suppliers) {
      const existingSupplier = suppliers.find(s => 
        s.name.toLowerCase().includes(supplierName.toLowerCase()) ||
        supplierName.toLowerCase().includes(s.name.toLowerCase())
      );
      
      if (existingSupplier) {
        supplierId = existingSupplier.id;
        supplierName = existingSupplier.name;
      } else if (addSupplier) {
        try {
          const newSupplierData = {
            name: supplierName,
            email: data.supplier?.email || '',
            phone: data.supplier?.phone || '',
            address: data.supplier?.address || '',
            status: 'active'
          };
          
          const supplierResult = await addSupplier(newSupplierData);
          if (supplierResult && supplierResult.success !== false) {
            supplierId = supplierResult.data?.id || supplierResult.id;
            console.log('✅ Created new supplier:', supplierName);
          }
        } catch (error) {
          console.error('Failed to create supplier:', error);
        }
      }
    }

    // Format items
    const items = (data.products || data.items || []).map((item, index) => ({
      id: `item-${Date.now()}-${index}`,
      productCode: item.productCode || item.code || '',
      productName: item.productName || item.description || item.name || '',
      quantity: parseInt(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || parseFloat(item.price) || 0,
      totalPrice: parseFloat(item.totalPrice) || parseFloat(item.total) || 0
    }));

    return {
      piNumber: data.piNumber || data.invoiceNumber || `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: data.date || data.invoiceDate || new Date().toISOString().split('T')[0],
      supplierId: supplierId,
      supplierName: supplierName,
      currency: data.currency || 'USD',
      totalAmount: parseFloat(data.grandTotal || data.totalAmount || data.total) || 0,
      items: items,
      status: 'pending',
      deliveryStatus: 'pending',
      extractedFrom: fileName,
      extractedAt: new Date().toISOString()
    };
  };

  // ✅ FIX: Add debug controls for batch management
  const clearProcessedBatches = () => {
    if (window.confirm('This will allow reprocessing of completed batches. Continue?')) {
      processedBatchesRef.current = new Set();
      setProcessedBatchesDisplay(new Set());
      localStorage.removeItem('processedBatches');
      showNotification && showNotification('Processed batches cleared', 'info');
    }
  };

  const clearProcessedFiles = () => {
    if (window.confirm('This will allow reprocessing of the same files. Continue?')) {
      enhancedBatchUploadService.clearProcessedFiles();
      showNotification && showNotification('Processed files cleared - you can now reprocess the same files', 'info');
    }
  };

  const clearAll = () => {
    if (window.confirm('This will clear all processing history. Continue?')) {
      processedBatchesRef.current = new Set();
      setProcessedBatchesDisplay(new Set());
      localStorage.removeItem('processedBatches');
      enhancedBatchUploadService.clearProcessedFiles();
      showNotification && showNotification('All processing history cleared', 'info');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    addFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    addFiles(files);
  };

  const addFiles = (newFiles) => {
    // Filter for supported file types
    const supportedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls'];
    const validFiles = newFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return supportedTypes.includes(extension);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      const result = await enhancedBatchUploadService.startBatch(selectedFiles, {
        type: documentType,
        priority: uploadOptions.priority,
        autoSave: uploadOptions.autoSave,
        notifyWhenComplete: uploadOptions.notifyWhenComplete,
        storeDocuments: true
      });

      setCurrentBatch(result);
      setSelectedFiles([]);
      
      // Show success message
      showNotification && showNotification(
        `Batch upload started! ${selectedFiles.length} files queued for processing.`,
        'success'
      );
      
    } catch (error) {
      console.error('Failed to start batch upload:', error);
      showNotification && showNotification('Failed to start batch upload. Please try again.', 'error');
    }
  };

  const retryBatch = (batchId) => {
    enhancedBatchUploadService.retryFailedFiles(batchId);
  };

  const cancelBatch = (batchId) => {
    enhancedBatchUploadService.cancelBatch(batchId);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'processing':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'retrying':
        return <RotateCcw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold">
              Batch Upload - {documentType.replace('_', ' ').toUpperCase()}
            </h2>
            {processedBatchesDisplay.size > 0 && (
              <span className="text-sm text-gray-600">
                ({processedBatchesDisplay.size} processed)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* ✅ FIX: Add debug controls */}
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
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Upload Files</h3>
            
            {/* Upload Options */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={uploadOptions.priority}
                  onChange={(e) => setUploadOptions(prev => ({...prev, priority: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSave"
                  checked={uploadOptions.autoSave}
                  onChange={(e) => setUploadOptions(prev => ({...prev, autoSave: e.target.checked}))}
                  className="mr-2"
                />
                <label htmlFor="autoSave" className="text-sm text-gray-700">
                  Auto-save results
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notify"
                  checked={uploadOptions.notifyWhenComplete}
                  onChange={(e) => setUploadOptions(prev => ({...prev, notifyWhenComplete: e.target.checked}))}
                  className="mr-2"
                />
                <label htmlFor="notify" className="text-sm text-gray-700">
                  Notify when complete
                </label>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports PDF, Images (JPG, PNG), Excel (XLSX, XLS)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Browse Files
              </button>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-900">{file.name}</span>
                        <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm text-gray-600">
                    Total: {selectedFiles.length} files, Est. time: {Math.round(selectedFiles.length * 45 / 60)}min
                  </span>
                  <button
                    onClick={startBatchUpload}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Start Batch Upload
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Batches */}
          {activeBatches.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Active Batches</h3>
              
              {activeBatches.map((batch) => (
                <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">Batch {batch.id.split('_')[1]}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(batch.status)}`}>
                        {batch.status}
                      </span>
                      {processedBatchesDisplay.has(batch.id) && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Saved to DB
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {batch.status === 'processing' && (
                        <span className="text-sm text-gray-600">
                          ETA: {Math.round(batch.estimatedTimeRemaining / 60)}min
                        </span>
                      )}
                      
                      {batch.failedFiles > 0 && (
                        <button
                          onClick={() => retryBatch(batch.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Retry Failed
                        </button>
                      )}
                      
                      {batch.status !== 'completed' && (
                        <button
                          onClick={() => cancelBatch(batch.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress: {batch.processedFiles}/{batch.totalFiles}</span>
                      <span>{batch.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${batch.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Status Summary */}
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{batch.successfulFiles} Success</span>
                    </span>
                    {batch.failedFiles > 0 && (
                      <span className="flex items-center space-x-1">
                        <XCircle className="w-4 h-4 text-red-500" />
                        <span>{batch.failedFiles} Failed</span>
                      </span>
                    )}
                  </div>

                  {/* Completion Message */}
                  {batch.status === 'completed' && (
                    <div className="mt-3 p-2 bg-green-50 rounded">
                      <p className="text-sm text-green-800">
                        ✅ Batch completed! {batch.successfulFiles} of {batch.totalFiles} files processed successfully.
                        {processedBatchesDisplay.has(batch.id) ? 
                          " All proforma invoices have been added to your database." : 
                          " Processing for database save..."
                        }
                      </p>
                    </div>
                  )}

                  {/* File Details (collapsible) */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      View file details ({batch.files.length} files)
                    </summary>
                    <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                      {batch.files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(file.status)}
                            <span className="truncate max-w-xs">{file.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${getStatusColor(file.status)}`}>
                              {file.status}
                            </span>
                            {file.progress > 0 && file.progress < 100 && (
                              <span className="text-xs text-gray-500">{file.progress}%</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How Batch Upload Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload multiple PI documents at once</li>
              <li>• Processing continues in the background - you can close this window</li>
              <li>• Get notified when extraction is complete</li>
              <li>• Results are automatically saved to your PI list</li>
              <li>• Failed extractions can be retried individually</li>
              <li>• Document storage is enabled for all uploaded files</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchUploadModal;
