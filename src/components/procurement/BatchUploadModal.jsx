// src/components/procurement/BatchUploadModal.jsx
// Fixed version to prevent duplicate PI generation

import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Clock, Download } from 'lucide-react';
import enhancedBatchUploadService from '../../services/EnhancedBatchUploadService';

const BatchUploadModal = ({ 
  isOpen, 
  onClose, 
  showNotification,
  addProformaInvoice,
  suppliers,
  addSupplier
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
            
            // ✅ Additional check: verify PI doesn't already exist in database
            // You should implement this check in your addProformaInvoice function
            const result = await addProformaInvoice(piData);
            
            if (result.success) {
              savedCount++;
              console.log('✅ Saved PI:', piData.piNumber);
            } else {
              throw new Error(result.error || 'Failed to save PI');
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
  }, [activeBatches, processedBatches, addProformaInvoice, showNotification]);

  // Convert extracted data to PI format
  const convertExtractedDataToPI = async (extractedData, fileName) => {
    const data = extractedData.proforma_invoice || extractedData;
    
    // Find or create supplier
    let supplierId = '';
    let supplierName = data.supplier?.name || data.supplierName || 'Unknown Supplier';
    
    if (supplierName && supplierName !== 'Unknown Supplier') {
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
            status: 'active',
            dateAdded: new Date().toISOString()
          };
          
          const result = await addSupplier(newSupplierData);
          if (result.success) {
            supplierId = result.data.id;
            console.log('✅ Created new supplier:', supplierName);
          }
        } catch (error) {
          console.error('Failed to create supplier:', error);
        }
      }
    }

    // Generate consistent PI number based on extracted data or filename
    const piNumber = data.piNumber || 
                    data.invoiceNumber || 
                    `PI-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Map products
    const products = (data.products || data.items || []).map(item => ({
      productCode: item.productCode || item.partNumber || item.code || '',
      productName: item.productName || item.description || item.name || '',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || item.price || 0,
      totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
      leadTime: item.leadTime || '',
      warranty: item.warranty || ''
    }));

    // Calculate totals
    const subtotal = products.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
    const totalAmount = data.grandTotal || data.totalAmount || subtotal;

    return {
      piNumber,
      date: data.date || new Date().toISOString().split('T')[0],
      supplierId,
      supplierName,
      currency: data.currency || 'USD',
      purpose: data.purpose || 'Stock',
      priority: 'normal',
      status: 'pending',
      paymentStatus: 'unpaid',
      deliveryStatus: 'pending',
      totalAmount,
      products,
      terms: {
        payment: data.terms?.payment || data.paymentTerms || '',
        delivery: data.terms?.delivery || data.deliveryTerms || '',
        leadTime: data.terms?.leadTime || data.leadTime || '',
        warranty: data.terms?.warranty || data.warranty || '',
        validity: data.terms?.validity || data.validity || ''
      },
      extractedFrom: fileName,
      extractedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      showNotification('Please select files to upload', 'warning');
      return;
    }

    try {
      const batchId = await enhancedBatchUploadService.startBatch(
        selectedFiles,
        'proforma_invoice',
        {
          priority,
          autoSave,
          notifyComplete
        }
      );

      showNotification(
        `Batch upload started! Processing ${selectedFiles.length} file(s)...`,
        'info'
      );

      setSelectedFiles([]);
    } catch (error) {
      console.error('Failed to start batch upload:', error);
      showNotification('Failed to start batch upload', 'error');
    }
  };

  // ✅ NEW: Clear processed batches (for debugging/admin)
  const clearProcessedBatches = () => {
    if (window.confirm('This will allow completed batches to be processed again. Continue?')) {
      setProcessedBatches(new Set());
      localStorage.removeItem('processedBatches');
      showNotification('Processed batches cleared', 'info');
    }
  };

  // File drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragOver(true);
    } else if (e.type === 'dragleave') {
      setDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      const extension = file.name.split('.').pop().toLowerCase();
      return ['pdf', 'jpg', 'jpeg', 'png', 'xlsx', 'xls'].includes(extension);
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">Batch Upload - PROFORMA INVOICE</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Upload Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Upload Files</h3>
            
            {/* Options */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border rounded px-3 py-2"
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
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="autoSave" className="text-sm">Auto-save to database</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyComplete"
                  checked={notifyComplete}
                  onChange={(e) => setNotifyComplete(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="notifyComplete" className="text-sm">Notify when complete</label>
              </div>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500">Supports PDF, images (JPG, PNG), Excel (XLSX, XLS)</p>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                ref={(input) => {
                  if (input) {
                    input.onclick = () => input.click();
                  }
                }}
              />
              <button
                onClick={() => document.querySelector('input[type="file"]').click()}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Browse Files
              </button>
            </div>

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium mb-2">Selected Files ({selectedFiles.length})</h4>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-gray-500 mr-2" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleFileUpload}
                  className="mt-4 bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  Start Upload
                </button>
              </div>
            )}
          </div>

          {/* Active Batches */}
          {activeBatches.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Active Batches</h3>
                {/* ✅ DEBUG: Add button to clear processed batches */}
                <button
                  onClick={clearProcessedBatches}
                  className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                >
                  Clear Processed (Debug)
                </button>
              </div>
              
              <div className="space-y-4">
                {activeBatches.map((batch) => (
                  <div key={batch.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <span className="font-medium">Batch {batch.id.split('_')[2]}</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          batch.status === 'completed' ? 'bg-green-100 text-green-800' :
                          batch.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          batch.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {batch.status}
                        </span>
                        {/* ✅ Show if batch was processed */}
                        {processedBatches.has(batch.id) && (
                          <span className="ml-2 px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                            Saved to DB
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        Progress: {batch.processedFiles}/{batch.totalFiles} files
                      </span>
                    </div>

                    {/* Files */}
                    <div className="space-y-2">
                      {batch.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                          <div className="flex items-center">
                            {file.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500 mr-2" />}
                            {file.status === 'processing' && <Clock className="w-4 h-4 text-blue-500 mr-2 animate-spin" />}
                            {file.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
                            <span className="text-sm">{file.fileName}</span>
                          </div>
                          {file.status === 'completed' && (
                            <span className="text-xs text-green-600">✅ Saved to Database</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Batch completion message */}
                    {batch.status === 'completed' && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">
                          ✅ Batch completed! {batch.files.filter(f => f.status === 'completed').length} of {batch.totalFiles} files processed successfully. 
                          {processedBatches.has(batch.id) ? ' All proforma invoices have been added to your database.' : ' Processing for database save...'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchUploadModal;
