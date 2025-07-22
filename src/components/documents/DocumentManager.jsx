// src/components/documents/DocumentManager.jsx
// Create this file when you're ready to add document functionality

import React, { useState } from 'react';
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react';

export const DocumentManager = ({ product, onSave }) => {
  const [activeSection, setActiveSection] = useState('internal');

  // Placeholder document data structure
  const documents = product?.documents || {
    internal: {
      supplierDatasheets: [],
      costAnalysis: [],
      supplierQuotes: []
    },
    customerFacing: {
      cleanedDatasheets: [],
      productImages: [],
      installationGuides: []
    },
    metadata: {
      completeness: 'incomplete',
      totalDocuments: 0,
      publicDocuments: 0
    }
  };

  const handleFileUpload = (event, documentType, section) => {
    const files = Array.from(event.target.files);
    console.log('Uploading files:', files, 'to', documentType, 'in', section);
    
    // TODO: Implement actual file upload logic
    alert(`File upload functionality will be implemented here.\nFiles: ${files.map(f => f.name).join(', ')}\nType: ${documentType}\nSection: ${section}`);
  };

  return (
    <div className="space-y-6">
      {/* Documentation Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-blue-900">Documentation Status</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            documents.metadata.completeness === 'complete' ? 'bg-green-100 text-green-800' :
            documents.metadata.completeness === 'basic' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {documents.metadata.completeness}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{documents.metadata.totalDocuments}</div>
            <div className="text-blue-700">Total Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{documents.metadata.publicDocuments}</div>
            <div className="text-green-700">Customer Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {documents.metadata.totalDocuments - documents.metadata.publicDocuments}
            </div>
            <div className="text-orange-700">Internal Only</div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('internal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'internal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Internal Documents ({Object.values(documents.internal).flat().length})
          </button>
          <button
            onClick={() => setActiveSection('customerFacing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'customerFacing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            Customer-Facing Documents ({Object.values(documents.customerFacing).flat().length})
          </button>
        </nav>
      </div>

      {/* Document Sections */}
      <div className="space-y-6">
        {activeSection === 'internal' && (
          <div className="space-y-6">
            <DocumentSection
              title="Supplier Datasheets"
              documents={documents.internal.supplierDatasheets}
              documentType="supplierDatasheets"
              section="internal"
              onUpload={handleFileUpload}
            />
            
            <DocumentSection
              title="Cost Analysis"
              documents={documents.internal.costAnalysis}
              documentType="costAnalysis"
              section="internal"
              onUpload={handleFileUpload}
            />
            
            <DocumentSection
              title="Supplier Quotes"
              documents={documents.internal.supplierQuotes}
              documentType="supplierQuotes"
              section="internal"
              onUpload={handleFileUpload}
            />
          </div>
        )}

        {activeSection === 'customerFacing' && (
          <div className="space-y-6">
            <DocumentSection
              title="Cleaned Datasheets"
              description="Customer-ready datasheets with our branding"
              documents={documents.customerFacing.cleanedDatasheets}
              documentType="cleanedDatasheets"
              section="customerFacing"
              onUpload={handleFileUpload}
            />
            
            <DocumentSection
              title="Product Images"
              documents={documents.customerFacing.productImages}
              documentType="productImages"
              section="customerFacing"
              onUpload={handleFileUpload}
            />
            
            <DocumentSection
              title="Installation Guides"
              documents={documents.customerFacing.installationGuides}
              documentType="installationGuides"
              section="customerFacing"
              onUpload={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Coming Soon Notice */}
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Document Management Coming Soon
        </h3>
        <p className="text-gray-600">
          Advanced document upload, organization, and branding features will be available in the next update.
        </p>
      </div>
    </div>
  );
};

// Basic Document Section Component
const DocumentSection = ({ title, description, documents = [], documentType, section, onUpload }) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </span>
            
            <label className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer">
              Add Files
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={(e) => onUpload(e, documentType, section)}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="p-4">
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((document, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <FileText size={16} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {document.filename || `Document ${index + 1}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      Uploaded: {document.uploadDate || 'Unknown date'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-500 hover:text-blue-600 rounded-md transition-colors">
                    <Eye size={16} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-green-600 rounded-md transition-colors">
                    <Download size={16} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-red-600 rounded-md transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-500">No documents uploaded yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
