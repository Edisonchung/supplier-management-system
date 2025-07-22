/// src/components/documents/DocumentManager.jsx
// IMPROVED VERSION with better document categories

import React, { useState } from 'react';
import { FileText, Upload, Download, Trash2, Eye, Image, Book, Settings } from 'lucide-react';

export const DocumentManager = ({ product, onSave }) => {
  const [activeSection, setActiveSection] = useState('technical');

  // Improved document data structure
  const documents = product?.documents || {
    technical: {
      specifications: [],
      datasheets: [],
      technicalDrawings: [],
      testReports: []
    },
    marketing: {
      productImages: [],
      brochures: [],
      applicationNotes: [],
      caseStudies: []
    },
    support: {
      userManuals: [],
      installationGuides: [],
      troubleshooting: [],
      maintenance: []
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

  // Calculate total documents across all sections
  const totalDocs = Object.values(documents.technical || {}).flat().length +
                   Object.values(documents.marketing || {}).flat().length +
                   Object.values(documents.support || {}).flat().length;

  const publicDocs = Object.values(documents.marketing || {}).flat().length +
                    Object.values(documents.support || {}).flat().length;

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
            <div className="text-2xl font-bold text-blue-600">{totalDocs}</div>
            <div className="text-blue-700">Total Documents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{publicDocs}</div>
            <div className="text-green-700">Customer Ready</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {totalDocs - publicDocs}
            </div>
            <div className="text-orange-700">Internal Only</div>
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveSection('technical')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeSection === 'technical'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Settings size={16} />
            <span>Technical ({Object.values(documents.technical || {}).flat().length})</span>
          </button>
          <button
            onClick={() => setActiveSection('marketing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeSection === 'marketing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Image size={16} />
            <span>Marketing ({Object.values(documents.marketing || {}).flat().length})</span>
          </button>
          <button
            onClick={() => setActiveSection('support')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeSection === 'support'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Book size={16} />
            <span>Support ({Object.values(documents.support || {}).flat().length})</span>
          </button>
        </nav>
      </div>

      {/* Document Sections */}
      <div className="space-y-6">
        {activeSection === 'technical' && (
          <div className="space-y-6">
            <DocumentSection
              title="Technical Specifications"
              description="Detailed product specifications and technical data"
              documents={documents.technical.specifications || []}
              documentType="specifications"
              section="technical"
              onUpload={handleFileUpload}
              icon={<FileText size={16} className="text-blue-500" />}
            />
            
            <DocumentSection
              title="Product Datasheets"
              description="Original manufacturer datasheets and spec sheets"
              documents={documents.technical.datasheets || []}
              documentType="datasheets"
              section="technical"
              onUpload={handleFileUpload}
              icon={<FileText size={16} className="text-green-500" />}
            />
            
            <DocumentSection
              title="Technical Drawings"
              description="CAD files, schematics, and technical diagrams"
              documents={documents.technical.technicalDrawings || []}
              documentType="technicalDrawings"
              section="technical"
              onUpload={handleFileUpload}
              icon={<Settings size={16} className="text-purple-500" />}
            />

            <DocumentSection
              title="Test Reports"
              description="Quality test results and compliance reports"
              documents={documents.technical.testReports || []}
              documentType="testReports"
              section="technical"
              onUpload={handleFileUpload}
              icon={<FileText size={16} className="text-red-500" />}
            />
          </div>
        )}

        {activeSection === 'marketing' && (
          <div className="space-y-6">
            <DocumentSection
              title="Product Images"
              description="High-quality product photos and marketing images"
              documents={documents.marketing.productImages || []}
              documentType="productImages"
              section="marketing"
              onUpload={handleFileUpload}
              icon={<Image size={16} className="text-pink-500" />}
              acceptTypes=".jpg,.jpeg,.png,.gif,.webp"
            />
            
            <DocumentSection
              title="Product Brochures"
              description="Marketing brochures and product sheets"
              documents={documents.marketing.brochures || []}
              documentType="brochures"
              section="marketing"
              onUpload={handleFileUpload}
              icon={<FileText size={16} className="text-blue-500" />}
            />
            
            <DocumentSection
              title="Application Notes"
              description="Use cases and application examples"
              documents={documents.marketing.applicationNotes || []}
              documentType="applicationNotes"
              section="marketing"
              onUpload={handleFileUpload}
              icon={<Book size={16} className="text-green-500" />}
            />

            <DocumentSection
              title="Case Studies"
              description="Customer success stories and implementation examples"
              documents={documents.marketing.caseStudies || []}
              documentType="caseStudies"
              section="marketing"
              onUpload={handleFileUpload}
              icon={<FileText size={16} className="text-purple-500" />}
            />
          </div>
        )}

        {activeSection === 'support' && (
          <div className="space-y-6">
            <DocumentSection
              title="User Manuals"
              description="Complete user guides and operating instructions"
              documents={documents.support.userManuals || []}
              documentType="userManuals"
              section="support"
              onUpload={handleFileUpload}
              icon={<Book size={16} className="text-blue-500" />}
            />
            
            <DocumentSection
              title="Installation Guides"
              description="Step-by-step installation and setup instructions"
              documents={documents.support.installationGuides || []}
              documentType="installationGuides"
              section="support"
              onUpload={handleFileUpload}
              icon={<Settings size={16} className="text-green-500" />}
            />
            
            <DocumentSection
              title="Troubleshooting"
              description="Common issues and troubleshooting guides"
              documents={documents.support.troubleshooting || []}
              documentType="troubleshooting"
              section="support"
              onUpload={handleFileUpload}
              icon={<FileText size={16} className="text-orange-500" />}
            />

            <DocumentSection
              title="Maintenance"
              description="Maintenance schedules and service instructions"
              documents={documents.support.maintenance || []}
              documentType="maintenance"
              section="support"
              onUpload={handleFileUpload}
              icon={<Settings size={16} className="text-red-500" />}
            />
          </div>
        )}
      </div>

      {/* Coming Soon Notice */}
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Document Management System
        </h3>
        <p className="text-gray-600">
          Full document upload, organization, and management features are ready to implement.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          This improved structure focuses on product value rather than procurement processes.
        </p>
      </div>
    </div>
  );
};

// Enhanced Document Section Component
const DocumentSection = ({ title, description, documents = [], documentType, section, onUpload, icon, acceptTypes = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls" }) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon}
            <div>
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
              {description && (
                <p className="text-sm text-gray-600">{description}</p>
              )}
            </div>
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
                accept={acceptTypes}
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
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {icon}
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
                  <button className="p-2 text-gray-500 hover:text-blue-600 rounded-md transition-colors" title="Preview">
                    <Eye size={16} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-green-600 rounded-md transition-colors" title="Download">
                    <Download size={16} />
                  </button>
                  <button className="p-2 text-gray-500 hover:text-red-600 rounded-md transition-colors" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            {icon && <div className="flex justify-center mb-4">{icon}</div>}
            <p className="text-sm text-gray-500">No {title.toLowerCase()} uploaded yet</p>
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
