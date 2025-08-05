// ============================================
// src/components/common/TradeDocumentUpload.jsx
// ENHANCED VERSION WITH BETTER ERROR HANDLING
// ============================================

import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { DocumentStorageService } from '../../services/DocumentStorageService';

const TradeDocumentUpload = ({ 
  documentId, 
  piNumber, 
  onDocumentUploaded,
  allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'],
  maxFileSize = 10 * 1024 * 1024 // 10MB default
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const documentStorageService = new DocumentStorageService();

  const validateFile = (file) => {
    // Check file type
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check file size
    if (file.size > maxFileSize) {
      throw new Error(`File size exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`);
    }

    return true;
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    // Check if PI is saved
    if (!documentId || !piNumber) {
      setErrorMessage('Please save the PI first before uploading trade documents');
      setUploadStatus('error');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);
    setErrorMessage('');

    const successfulUploads = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate each file
        validateFile(file);

        console.log(`📤 Uploading trade document: ${file.name}`);

        // Upload to Firebase Storage with trade document path
        const result = await documentStorageService.storeDocument(
          file,
          'trade', // Document type
          piNumber,
          documentId
        );

        if (result.success) {
          const uploadedDoc = {
            ...result.data,
            originalFileName: file.name,
            fileSize: file.size,
            uploadTime: new Date().toISOString()
          };
          
          successfulUploads.push(uploadedDoc);
          setUploadProgress(((i + 1) / files.length) * 100);
          
          console.log(`✅ Trade document uploaded successfully: ${file.name}`);
          
          // Call the callback for each successful upload
          onDocumentUploaded?.(uploadedDoc);
        } else {
          throw new Error(result.error || 'Upload failed');
        }
      }

      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      setUploadStatus('success');
      
    } catch (error) {
      console.error('❌ Trade document upload failed:', error);
      setUploadStatus('error');
      setErrorMessage(error.message);
    } finally {
      setIsUploading(false);
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus(null);
        setErrorMessage('');
      }, 3000);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
    // Reset input
    e.target.value = '';
  };

  const clearError = () => {
    setErrorMessage('');
    setUploadStatus(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Upload Trade Documents</h4>
        {uploadedFiles.length > 0 && (
          <span className="text-sm text-green-600">
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded
          </span>
        )}
      </div>
      
      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            <span className="text-red-700 text-sm">{errorMessage}</span>
          </div>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : isUploading
            ? 'border-gray-300 bg-gray-50'
            : uploadStatus === 'success'
            ? 'border-green-400 bg-green-50'
            : uploadStatus === 'error'
            ? 'border-red-400 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept={allowedTypes.map(type => `.${type}`).join(',')}
          onChange={handleInputChange}
          className="hidden"
          id="trade-document-upload"
          disabled={isUploading || !documentId || !piNumber}
        />
        
        <label htmlFor="trade-document-upload" className={`cursor-pointer ${isUploading || !documentId ? 'cursor-not-allowed opacity-60' : ''}`}>
          {uploadStatus === 'success' ? (
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
          ) : uploadStatus === 'error' ? (
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          ) : (
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          )}
          
          <p className="text-gray-600 mb-1">
            {!documentId || !piNumber 
              ? 'Save PI first to enable upload'
              : isUploading 
              ? `Uploading... (${uploadProgress.toFixed(0)}%)`
              : uploadStatus === 'success' 
              ? 'Upload successful!' 
              : uploadStatus === 'error' 
              ? 'Upload failed - try again'
              : 'Click to upload or drag and drop'
            }
          </p>
          <p className="text-xs text-gray-500">
            Form E, Commercial Invoice, Packing List, B/L ({allowedTypes.join(', ').toUpperCase()})
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Max {Math.round(maxFileSize / 1024 / 1024)}MB per file
          </p>
        </label>

        {/* Upload Progress */}
        {isUploading && (
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{uploadProgress.toFixed(0)}% uploaded</p>
          </div>
        )}
      </div>

      {/* Document Type Guidelines */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h5 className="font-medium text-gray-900 mb-2">Required Trade Documents:</h5>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Form E Certificate:</strong> ASEAN-China Free Trade Agreement Certificate of Origin</li>
          <li>• <strong>Commercial Invoice:</strong> Detailed invoice with HS codes</li>
          <li>• <strong>Packing List:</strong> Complete item manifest</li>
          <li>• <strong>Bill of Lading:</strong> Shipping documentation</li>
          <li>• <strong>Insurance Certificate:</strong> Cargo insurance (if applicable)</li>
        </ul>
      </div>
    </div>
  );
};

export default TradeDocumentUpload;
