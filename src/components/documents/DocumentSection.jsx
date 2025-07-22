// src/components/documents/DocumentSection.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Trash2, Eye, FileText, Image, File } from 'lucide-react';
import { DocumentUploader } from './DocumentUploader';

export const DocumentSection = ({
  title,
  description,
  documents = [],
  documentType,
  section,
  onUpload,
  onDelete,
  uploading = false,
  canEdit = true
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
    if (mimeType === 'application/pdf') return <FileText size={16} className="text-red-500" />;
    return <File size={16} className="text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const handleDownload = (document) => {
    window.open(document.url, '_blank');
    // TODO: Track download count
  };

  const handleDelete = async (document) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await onDelete(documentType, document.id, section);
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete document');
      }
    }
  };

  const handleUpload = async (file, docType, docSection) => {
    try {
      await onUpload(file, docType, docSection);
      setShowUploader(false);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + error.message);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-2 text-left flex-1"
          >
            {isExpanded ? (
              <ChevronDown size={20} className="text-gray-500" />
            ) : (
              <ChevronRight size={20} className="text-gray-500" />
            )}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
          </button>
          
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </span>
            
            {canEdit && (
              <button
                onClick={() => setShowUploader(!showUploader)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {showUploader ? 'Cancel' : 'Add'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Upload Section */}
          {showUploader && canEdit && (
            <div className="border-b border-gray-200 pb-4">
              <DocumentUploader
                onUpload={handleUpload}
                documentType={documentType}
                section={section}
                uploading={uploading}
                acceptedTypes={getAcceptedTypes(documentType)}
              />
            </div>
          )}

          {/* Documents List */}
          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {getFileIcon(document.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.filename || document.originalFilename}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>Uploaded {formatDate(document.uploadDate)}</span>
                        {document.uploadedBy && (
                          <span>by {document.uploadedBy}</span>
                        )}
                      </div>
                      {document.description && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {document.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleDownload(document)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    
                    <button
                      onClick={() => window.open(document.url, '_blank')}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                      title="Preview"
                    >
                      <Eye size={16} />
                    </button>

                    {canEdit && (
                      <button
                        onClick={() => handleDelete(document)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-500">
                No documents uploaded yet
              </p>
              {canEdit && (
                <button
                  onClick={() => setShowUploader(true)}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Upload your first document
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to determine accepted file types based on document type
const getAcceptedTypes = (documentType) => {
  switch (documentType) {
    case 'productImages':
      return '.jpg,.jpeg,.png,.gif,.webp';
    case 'supplierDatasheets':
    case 'cleanedDatasheets':
    case 'installationGuides':
    case 'applicationNotes':
    case 'certifications':
      return '.pdf,.doc,.docx';
    case 'costAnalysis':
    case 'supplierQuotes':
      return '.pdf,.doc,.docx,.xlsx,.xls,.csv';
    default:
      return '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls';
  }
};
