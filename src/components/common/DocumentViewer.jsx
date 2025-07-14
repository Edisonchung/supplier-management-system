// src/components/common/DocumentViewer.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Eye, Trash2, Calendar, 
  File, Image, Archive, AlertCircle, CheckCircle,
  ExternalLink, Clock, HardDrive
} from 'lucide-react';
import DocumentStorageService from '../../services/DocumentStorageService';

const DocumentViewer = ({ 
  documentId, 
  documentType, 
  documentNumber,
  showTitle = true,
  allowDelete = false,
  onDocumentDeleted = null 
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (documentId && documentType) {
      loadDocuments();
    }
  }, [documentId, documentType]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await DocumentStorageService.getDocumentFiles(documentId, documentType);
      
      if (result.success) {
        setDocuments(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (document) => {
    try {
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = document.downloadURL;
      link.download = document.customMetadata?.originalFileName || document.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  const handleView = (document) => {
    // Open document in new tab for viewing
    window.open(document.downloadURL, '_blank');
  };

  const handleDelete = async (document) => {
    if (!allowDelete) return;
    
    if (!confirm(`Are you sure you want to delete "${document.customMetadata?.originalFileName || document.name}"?`)) {
      return;
    }

    setDeleting(document.name);
    
    try {
      // Note: This would need to be implemented to delete individual files
      // For now, we'll just remove from local state
      setDocuments(prev => prev.filter(doc => doc.name !== document.name));
      
      if (onDocumentDeleted) {
        onDocumentDeleted(document);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
    } finally {
      setDeleting(null);
    }
  };

  const getFileIcon = (contentType, fileName) => {
    if (contentType?.startsWith('image/')) {
      return <Image size={16} className="text-purple-500" />;
    } else if (contentType === 'application/pdf') {
      return <FileText size={16} className="text-red-500" />;
    } else if (fileName?.includes('extraction')) {
      return <Archive size={16} className="text-blue-500" />;
    } else {
      return <File size={16} className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentType = (document) => {
    if (document.name.includes('extraction')) {
      return { label: 'AI Extraction Data', color: 'bg-blue-100 text-blue-800' };
    } else if (document.name.includes('original')) {
      return { label: 'Original Document', color: 'bg-green-100 text-green-800' };
    } else {
      return { label: 'Document', color: 'bg-gray-100 text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading documents...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center text-red-600 mb-2">
          <AlertCircle size={16} className="mr-2" />
          <span className="font-medium">Error Loading Documents</span>
        </div>
        <p className="text-sm text-gray-600">{error}</p>
        <button
          onClick={loadDocuments}
          className="mt-2 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p>No documents found</p>
          <p className="text-xs mt-1">Documents will appear here after upload</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {showTitle && (
        <div className="bg-gray-50 px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-gray-500" />
              <h3 className="font-medium text-gray-700">
                Stored Documents ({documents.length})
              </h3>
            </div>
            <div className="text-sm text-gray-500">
              {documentType.toUpperCase()} {documentNumber}
            </div>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {documents.map((document, index) => {
          const docType = getDocumentType(document);
          const isOriginal = document.name.includes('original');
          
          return (
            <div key={index} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {getFileIcon(document.contentType, document.name)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {document.customMetadata?.originalFileName || document.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${docType.color}`}>
                        {docType.label}
                      </span>
                      {isOriginal && (
                        <CheckCircle size={12} className="text-green-500" title="Original uploaded file" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <HardDrive size={10} />
                        {formatFileSize(document.size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(document.timeCreated)}
                      </span>
                      {document.contentType && (
                        <span className="uppercase font-mono">
                          {document.contentType.split('/')[1]}
                        </span>
                      )}
                    </div>
                    
                    {document.customMetadata?.documentNumber && (
                      <div className="mt-1 text-xs text-gray-400">
                        Document: {document.customMetadata.documentNumber}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleView(document)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="View document"
                  >
                    <Eye size={14} />
                  </button>
                  
                  <button
                    onClick={() => handleDownload(document)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="Download document"
                  >
                    <Download size={14} />
                  </button>
                  
                  {allowDelete && (
                    <button
                      onClick={() => handleDelete(document)}
                      disabled={deleting === document.name}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                      title="Delete document"
                    >
                      {deleting === document.name ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border border-red-600 border-t-transparent"></div>
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                  
                  <button
                    onClick={() => window.open(document.downloadURL, '_blank')}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentViewer;
