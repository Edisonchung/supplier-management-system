// src/components/mcp/components/UploadQueue.jsx
// Upload queue management component

import React from 'react';
import {
  X,
  Check,
  AlertCircle,
  Clock,
  Loader,
  Trash2,
  FileImage,
  Upload
} from 'lucide-react';

const UploadQueue = ({ uploads, onRemove, onClear, isUploading }) => {
  const pendingUploads = uploads.filter(u => u.status === 'pending');
  const uploadingUploads = uploads.filter(u => u.status === 'uploading');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const failedUploads = uploads.filter(u => u.status === 'failed');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'uploading':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <FileImage className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'uploading':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'failed':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getProductName = (productId, uploads) => {
    // Try to get product name from uploads context or use ID
    return `Product ${productId}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Upload Queue ({uploads.length})
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              {pendingUploads.length > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-600" />
                  {pendingUploads.length} pending
                </span>
              )}
              {uploadingUploads.length > 0 && (
                <span className="flex items-center gap-1">
                  <Loader className="w-3 h-3 text-blue-600 animate-spin" />
                  {uploadingUploads.length} uploading
                </span>
              )}
              {completedUploads.length > 0 && (
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-green-600" />
                  {completedUploads.length} completed
                </span>
              )}
              {failedUploads.length > 0 && (
                <span className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-red-600" />
                  {failedUploads.length} failed
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={onClear}
            disabled={isUploading}
            className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear All
          </button>
        </div>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {uploads.map((upload) => (
          <div key={upload.id} className="p-4">
            <div className="flex items-center space-x-4">
              {/* Preview Image */}
              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {upload.preview ? (
                  <img
                    src={upload.preview}
                    alt={upload.file.name}
                    className="w-12 h-12 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center">
                    <FileImage className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {upload.file.name}
                  </h4>
                  <button
                    onClick={() => onRemove(upload.id)}
                    disabled={isUploading && upload.status === 'uploading'}
                    className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <div className="text-xs text-gray-500">
                    <span>{getProductName(upload.productId)}</span>
                    <span className="mx-2">•</span>
                    <span>{formatFileSize(upload.file.size)}</span>
                  </div>
                  
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(upload.status)}`}>
                    {getStatusIcon(upload.status)}
                    {upload.status}
                  </div>
                </div>

                {/* Progress Bar */}
                {upload.status === 'uploading' && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {Math.round(upload.progress)}% complete
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {upload.status === 'failed' && upload.error && (
                  <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                    {upload.error}
                  </div>
                )}

                {/* Success Message */}
                {upload.status === 'completed' && upload.imageUrl && (
                  <div className="mt-2">
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      Upload successful!
                    </div>
                    <button
                      onClick={() => window.open(upload.imageUrl, '_blank')}
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      View uploaded image
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {uploads.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No files in upload queue</p>
        </div>
      )}
    </div>
  );
};

export default UploadQueue;
