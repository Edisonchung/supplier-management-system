// ============================================
// src/components/common/TradeDocumentUpload.jsx
// ============================================

import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { DocumentStorageService } from '../../services/DocumentStorageService';

const TradeDocumentUpload = ({ 
  documentId, 
  piNumber, 
  onDocumentUploaded,
  allowedTypes = ['pdf', 'jpg', 'jpeg', 'png'] 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const documentStorageService = new DocumentStorageService();

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
          throw new Error(`File type .${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
        }

        // Upload to Firebase Storage with trade document path
        const result = await documentStorageService.storeDocument(
          file,
          'trade', // Document type
          piNumber,
          documentId
        );

        if (result.success) {
          setUploadProgress(((i + 1) / files.length) * 100);
          onDocumentUploaded?.(result.data);
          setUploadStatus('success');
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Trade document upload failed:', error);
      setUploadStatus('error');
      alert('Upload failed: ' + error.message);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus(null);
      }, 2000);
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
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Upload Trade Documents</h4>
      
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
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleInputChange}
          className="hidden"
          id="trade-document-upload"
          disabled={isUploading}
        />
        
        <label htmlFor="trade-document-upload" className={`cursor-pointer ${isUploading ? 'cursor-not-allowed' : ''}`}>
          {uploadStatus === 'success' ? (
            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
          ) : uploadStatus === 'error' ? (
            <AlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
          ) : (
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          )}
          
          <p className="text-gray-600 mb-1">
            {isUploading ? 'Uploading...' : 
             uploadStatus === 'success' ? 'Upload successful!' :
             uploadStatus === 'error' ? 'Upload failed' :
             'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-500">
            Form E, Commercial Invoice, Packing List, B/L (PDF, JPG, PNG)
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
