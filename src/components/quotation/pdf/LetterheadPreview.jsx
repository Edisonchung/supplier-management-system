import React, { useState, useEffect } from 'react';
import { 
  FileText, Building2, Image, Palette, RefreshCw,
  Check, X, ChevronDown, ChevronUp, Eye, Edit3,
  Upload, AlertCircle, Info
} from 'lucide-react';
import QuotationPDFService from '../../../services/QuotationPDFService';

/**
 * LetterheadPreview - Preview and configure company letterhead for PDFs
 * 
 * Features:
 * - Company letterhead preview
 * - Logo display
 * - Color scheme visualization
 * - Bank details preview
 * - Multi-company support
 */
const LetterheadPreview = ({
  companyCode = 'FS',
  onLetterheadChange,
  showEditor = false,
  className = ''
}) => {
  // State
  const [letterhead, setLetterhead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(companyCode);

  // Company list
  const companies = [
    { code: 'FS', name: 'Flow Solution Sdn Bhd' },
    { code: 'FSE', name: 'Flow Solution Engineering Sdn Bhd' },
    { code: 'FSP', name: 'Flow Solution Projects Sdn Bhd' },
    { code: 'BWS', name: 'BluWater Systems Sdn Bhd' },
    { code: 'BWE', name: 'BluWater Engineering Sdn Bhd' },
    { code: 'EMIT', name: 'EMIT Technologies Sdn Bhd' },
    { code: 'EMIA', name: 'EMIT Asia Pacific Sdn Bhd' },
    { code: 'FTS', name: 'FlowTech Solutions Sdn Bhd' },
    { code: 'IHS', name: 'Industrial Hydraulics Systems Sdn Bhd' }
  ];

  // Fetch letterhead
  useEffect(() => {
    const fetchLetterhead = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await QuotationPDFService.getLetterhead(selectedCompany);
        setLetterhead(data);
        onLetterheadChange?.(data);
      } catch (err) {
        console.error('Error fetching letterhead:', err);
        setError('Failed to load letterhead');
        // Use default letterhead
        const defaultLetterhead = getDefaultLetterhead(selectedCompany);
        setLetterhead(defaultLetterhead);
        onLetterheadChange?.(defaultLetterhead);
      } finally {
        setLoading(false);
      }
    };

    fetchLetterhead();
  }, [selectedCompany]);

  // Get default letterhead configuration
  const getDefaultLetterhead = (code) => {
    const defaults = {
      FS: {
        companyCode: 'FS',
        companyName: 'Flow Solution Sdn Bhd',
        companyNo: '1234567-A',
        address: 'No. 123, Jalan Teknologi, Taman Perindustrian',
        address2: '47500 Subang Jaya, Selangor, Malaysia',
        phone: '+60 3-1234 5678',
        email: 'sales@flowsolution.com.my',
        website: 'www.flowsolution.com.my',
        primaryColor: '#0066CC',
        secondaryColor: '#004499',
        logoUrl: '/logos/fs-logo.png',
        bankName: 'Maybank',
        bankAccount: '5123 4567 8901',
        bankSwift: 'MBBEMYKL'
      },
      FSE: {
        companyCode: 'FSE',
        companyName: 'Flow Solution Engineering Sdn Bhd',
        companyNo: '1234568-B',
        address: 'No. 456, Jalan Industri, Shah Alam',
        address2: '40000 Shah Alam, Selangor, Malaysia',
        phone: '+60 3-8765 4321',
        email: 'engineering@flowsolution.com.my',
        website: 'www.flowsolution.com.my',
        primaryColor: '#0055AA',
        secondaryColor: '#003377',
        logoUrl: '/logos/fse-logo.png',
        bankName: 'CIMB Bank',
        bankAccount: '8012 3456 7890',
        bankSwift: 'CIBBMYKL'
      },
      FSP: {
        companyCode: 'FSP',
        companyName: 'Flow Solution Projects Sdn Bhd',
        companyNo: '1234569-C',
        address: 'No. 789, Jalan Projek, Petaling Jaya',
        address2: '46000 Petaling Jaya, Selangor, Malaysia',
        phone: '+60 3-5555 6666',
        email: 'projects@flowsolution.com.my',
        website: 'www.flowsolution.com.my',
        primaryColor: '#0077BB',
        secondaryColor: '#005588',
        logoUrl: '/logos/fsp-logo.png',
        bankName: 'Public Bank',
        bankAccount: '3123 4567 8901',
        bankSwift: 'PBBEMYKL'
      }
    };

    return defaults[code] || {
      companyCode: code,
      companyName: companies.find(c => c.code === code)?.name || 'Company Name',
      companyNo: '0000000-X',
      address: 'Company Address Line 1',
      address2: 'City, State, Country',
      phone: '+60 3-0000 0000',
      email: 'info@company.com',
      website: 'www.company.com',
      primaryColor: '#333333',
      secondaryColor: '#666666',
      logoUrl: null,
      bankName: 'Bank Name',
      bankAccount: '0000 0000 0000',
      bankSwift: 'XXXXXXXX'
    };
  };

  // Handle company change
  const handleCompanyChange = (code) => {
    setSelectedCompany(code);
  };

  if (loading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-8 ${className}`}>
        <div className="flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mb-3" />
          <p className="text-gray-500">Loading letterhead...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Letterhead Preview</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Company Selector */}
          <select
            value={selectedCompany}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {companies.map((company) => (
              <option key={company.code} value={company.code}>
                {company.code}
              </option>
            ))}
          </select>
          
          {/* Toggle Details */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {showDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="w-4 h-4" />
          {error} - Using default configuration
        </div>
      )}

      {/* Letterhead Preview */}
      {letterhead && (
        <div className="p-4">
          {/* Preview Card - Simulates PDF Header */}
          <div 
            className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            style={{ backgroundColor: '#fff' }}
          >
            {/* Color Bar */}
            <div 
              className="h-2"
              style={{ backgroundColor: letterhead.primaryColor }}
            />
            
            {/* Header Content */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                {/* Logo & Company Info */}
                <div className="flex items-start gap-4">
                  {/* Logo Placeholder */}
                  <div 
                    className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: letterhead.primaryColor }}
                  >
                    {letterhead.companyCode}
                  </div>
                  
                  {/* Company Details */}
                  <div>
                    <h2 
                      className="text-lg font-bold"
                      style={{ color: letterhead.primaryColor }}
                    >
                      {letterhead.companyName}
                    </h2>
                    <p className="text-xs text-gray-500">
                      Company No: {letterhead.companyNo}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {letterhead.address}
                    </p>
                    <p className="text-xs text-gray-600">
                      {letterhead.address2}
                    </p>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="text-right text-xs text-gray-600">
                  <p>{letterhead.phone}</p>
                  <p>{letterhead.email}</p>
                  <p 
                    className="font-medium"
                    style={{ color: letterhead.primaryColor }}
                  >
                    {letterhead.website}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div 
              className="h-0.5"
              style={{ backgroundColor: letterhead.secondaryColor }}
            />

            {/* Sample Content Area */}
            <div className="p-4 bg-gray-50">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                Document Content Area
              </div>
              <div className="h-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                Quotation / Invoice Content
              </div>
            </div>

            {/* Footer Preview */}
            <div 
              className="px-4 py-3 text-xs"
              style={{ backgroundColor: letterhead.primaryColor + '10' }}
            >
              <div className="flex items-center justify-between">
                <div className="text-gray-600">
                  <span className="font-medium">Bank: </span>
                  {letterhead.bankName} | {letterhead.bankAccount}
                </div>
                <div className="text-gray-500">
                  Page 1 of 1
                </div>
              </div>
            </div>
          </div>

          {/* Color Swatches */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded border border-gray-200"
                style={{ backgroundColor: letterhead.primaryColor }}
              />
              <span className="text-xs text-gray-500">
                Primary: {letterhead.primaryColor}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded border border-gray-200"
                style={{ backgroundColor: letterhead.secondaryColor }}
              />
              <span className="text-xs text-gray-500">
                Secondary: {letterhead.secondaryColor}
              </span>
            </div>
          </div>

          {/* Extended Details */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {/* Company Details */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Company Details
                  </div>
                  <dl className="space-y-1">
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Code:</dt>
                      <dd className="text-gray-900">{letterhead.companyCode}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Name:</dt>
                      <dd className="text-gray-900">{letterhead.companyName}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Company No:</dt>
                      <dd className="text-gray-900">{letterhead.companyNo}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Phone:</dt>
                      <dd className="text-gray-900">{letterhead.phone}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Email:</dt>
                      <dd className="text-gray-900">{letterhead.email}</dd>
                    </div>
                  </dl>
                </div>

                {/* Bank Details */}
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                    Bank Details
                  </div>
                  <dl className="space-y-1">
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Bank:</dt>
                      <dd className="text-gray-900">{letterhead.bankName}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">Account:</dt>
                      <dd className="text-gray-900">{letterhead.bankAccount}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-500 w-24">SWIFT:</dt>
                      <dd className="text-gray-900">{letterhead.bankSwift}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Address */}
              <div className="mt-4">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Address
                </div>
                <p className="text-sm text-gray-700">
                  {letterhead.address}<br />
                  {letterhead.address2}
                </p>
              </div>
            </div>
          )}

          {/* Info Note */}
          <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              This letterhead configuration will be used for all quotations and 
              documents generated for {letterhead.companyName}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterheadPreview;
