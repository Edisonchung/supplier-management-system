// ============================================
// src/components/common/TradeDocumentViewer.jsx
// ============================================

import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Eye, Calendar, FileIcon, Image } from 'lucide-react';
import { DocumentStorageService } from '../../services/DocumentStorageService';

const TradeDocumentViewer = ({ 
  documentId, 
  documentType = 'trade',
  allowDelete = false,
  onDocumentDeleted 
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const documentStorageService = new DocumentStorageService();

  useEffect(() => {
    if (documentId) {
      loadTradeDocuments();
    }
  }, [documentId]);

  const loadTradeDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await documentStorageService.getDocuments(documentId, 'trade');
      
      if (result.success) {
        setDocuments(result.documents || []);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error loading trade documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (document) => {
    if (!allowDelete) return;
    
    if (window.confirm(`Are you sure you want to delete ${document.fileName}?`)) {
      try {
        const result = await documentStorageService.deleteDocument(
          documentId,
          'trade',
          document.fileName
        );
        
        if (result.success) {
          setDocuments(prev => prev.filter(doc => doc.fileName !== document.fileName));
          onDocumentDeleted?.(document);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        alert('Failed to delete document: ' + error.message);
      }
    }
  };

  const handleDownload = async (document) => {
    try {
      const result = await documentStorageService.downloadDocument(
        documentId,
        'trade',
        document.fileName
      );
      
      if (result.success) {
        // Create download link
        const link = document.createElement('a');
        link.href = result.downloadURL;
        link.download = document.originalFileName || document.fileName;
        link.click();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document: ' + error.message);
    }
  };

  const getDocumentIcon = (fileName) => {
    const extension = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
    switch (extension) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <Image className="h-5 w-5 text-blue-500" />;
      default:
        return <FileIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentCategory = (fileName) => {
    const name = fileName.toLowerCase();
    if (name.includes('form_e') || name.includes('certificate')) return 'Form E Certificate';
    if (name.includes('invoice')) return 'Commercial Invoice';
    if (name.includes('packing')) return 'Packing List';
    if (name.includes('bill_of_lading') || name.includes('bl')) return 'Bill of Lading';
    if (name.includes('insurance')) return 'Insurance Certificate';
    return 'Trade Document';
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Form E Certificate': return 'bg-green-100 text-green-800';
      case 'Commercial Invoice': return 'bg-blue-100 text-blue-800';
      case 'Packing List': return 'bg-yellow-100 text-yellow-800';
      case 'Bill of Lading': return 'bg-purple-100 text-purple-800';
      case 'Insurance Certificate': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading trade documents...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Error loading documents: {error}</span>
        </div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <p className="font-medium mb-1">No trade documents uploaded</p>
        <p className="text-xs">Upload Form E and other trade documents above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">
        Trade Documents ({documents.length})
      </h4>
      
      <div className="space-y-3">
        {documents.map((document, index) => {
          const category = getDocumentCategory(document.fileName);
          return (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {getDocumentIcon(document.fileName)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.originalFileName || document.fileName}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getCategoryColor(category)}`}>
                        {category}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <p className="text-xs text-gray-500">
                        {formatFileSize(document.fileSize)}
                      </p>
                      {document.uploadedAt && (
                        <p className="text-xs text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(document.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownload(document)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  {allowDelete && (
                    <button
                      onClick={() => handleDelete(document)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TradeDocumentViewer;
