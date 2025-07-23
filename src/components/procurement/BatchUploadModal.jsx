import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileText, Clock, CheckCircle, XCircle, RotateCcw, Pause, Play } from 'lucide-react';
import enhancedBatchUploadService from '../../services/EnhancedBatchUploadService';

const BatchUploadModal = ({ isOpen, onClose, documentType = 'proforma_invoice' }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeBatches, setActiveBatches] = useState([]);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [uploadOptions, setUploadOptions] = useState({
    priority: 'normal',
    autoSave: true,
    notifyWhenComplete: true
  });

  const fileInputRef = useRef(null);

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
      const result = await enhancedBatchUploadService.addBatch(
        selectedFiles,
        documentType,
        uploadOptions
      );

      setCurrentBatch(result);
      setSelectedFiles([]);
      
      // Show success message
      alert(`Batch upload started! ${result.totalFiles} files queued for processing.`);
      
    } catch (error) {
      console.error('Failed to start batch upload:', error);
      alert('Failed to start batch upload. Please try again.');
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
          <h2 className="text-xl font-semibold">Batch Upload - {documentType.replace('_', ' ').toUpperCase()}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
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
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchUploadModal;
