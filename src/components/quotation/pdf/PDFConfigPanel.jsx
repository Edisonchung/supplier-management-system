/**
 * PDFConfigPanel.jsx
 * Configure which fields appear in the quotation PDF
 * Part of HiggsFlow Quotation System
 */

import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  FileText,
  Settings,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
  DollarSign,
  Percent,
  Hash,
  Package,
  Ruler,
  Scale,
  Clock,
  Tag,
  Image
} from 'lucide-react';

// Field configuration options
const FIELD_CONFIGS = {
  line: [
    {
      key: 'showSKU',
      label: 'SKU / Product Code',
      icon: Hash,
      description: 'Show product SKU in line items',
      default: true
    },
    {
      key: 'showClientMaterialCode',
      label: 'Client Material Code',
      icon: Tag,
      description: 'Show client\'s internal material code (e.g., PTP codes)',
      default: true
    },
    {
      key: 'showBrandLogo',
      label: 'Brand Logo',
      icon: Image,
      description: 'Show brand logo next to product',
      default: false
    },
    {
      key: 'showDimensions',
      label: 'Dimensions (L×W×H)',
      icon: Ruler,
      description: 'Show product dimensions',
      default: false
    },
    {
      key: 'showWeight',
      label: 'Weight',
      icon: Scale,
      description: 'Show product weight',
      default: false
    },
    {
      key: 'showLeadTime',
      label: 'Lead Time',
      icon: Clock,
      description: 'Show estimated lead time',
      default: true
    },
    {
      key: 'showLineDiscount',
      label: 'Line Discount',
      icon: Percent,
      description: 'Show discount per line item',
      default: true
    }
  ],
  pricing: [
    {
      key: 'showCostPrice',
      label: 'Cost Price',
      icon: DollarSign,
      description: 'Show cost price (internal use only)',
      default: false,
      adminOnly: true
    },
    {
      key: 'showMargin',
      label: 'Margin',
      icon: Percent,
      description: 'Show margin percentage and amount (internal use only)',
      default: false,
      adminOnly: true
    },
    {
      key: 'showOverallDiscount',
      label: 'Overall Discount',
      icon: Percent,
      description: 'Show overall quotation discount',
      default: true
    }
  ],
  display: [
    {
      key: 'showCompanyLogo',
      label: 'Company Logo',
      icon: Image,
      description: 'Show company logo in header',
      default: true
    },
    {
      key: 'showBankDetails',
      label: 'Bank Details',
      icon: DollarSign,
      description: 'Show bank account details for payment',
      default: true
    },
    {
      key: 'showSignature',
      label: 'Signature Line',
      icon: FileText,
      description: 'Show signature area with authorized signatory',
      default: true
    },
    {
      key: 'showTermsAndConditions',
      label: 'Terms & Conditions',
      icon: FileText,
      description: 'Show terms and conditions section',
      default: true
    },
    {
      key: 'showNotes',
      label: 'Notes',
      icon: FileText,
      description: 'Show notes to client',
      default: true
    },
    {
      key: 'showPageNumbers',
      label: 'Page Numbers',
      icon: Hash,
      description: 'Show page numbers in footer',
      default: true
    }
  ]
};

const PDFConfigPanel = ({
  config = {},
  onChange,
  onPreview,
  onDownload,
  onPrint,
  quotationNumber,
  isAdmin = false,
  loading = false,
  expanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [localConfig, setLocalConfig] = useState({
    // Line fields
    showSKU: true,
    showClientMaterialCode: true,
    showBrandLogo: false,
    showDimensions: false,
    showWeight: false,
    showLeadTime: true,
    showLineDiscount: true,
    // Pricing
    showCostPrice: false,
    showMargin: false,
    showOverallDiscount: true,
    // Display
    showCompanyLogo: true,
    showBankDetails: true,
    showSignature: true,
    showTermsAndConditions: true,
    showNotes: true,
    showPageNumbers: true,
    ...config
  });

  // Update local config when prop changes
  useEffect(() => {
    setLocalConfig(prev => ({ ...prev, ...config }));
  }, [config]);

  // Handle toggle change
  const handleToggle = (key) => {
    const newConfig = {
      ...localConfig,
      [key]: !localConfig[key]
    };
    setLocalConfig(newConfig);
    onChange?.(newConfig);
  };

  // Render toggle switch
  const renderToggle = (fieldConfig) => {
    const { key, label, icon: Icon, description, adminOnly } = fieldConfig;
    
    // Skip admin-only fields for non-admin users
    if (adminOnly && !isAdmin) {
      return null;
    }

    const isEnabled = localConfig[key];

    return (
      <div
        key={key}
        className={`flex items-center justify-between p-3 rounded-lg border ${
          isEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Icon className={`w-4 h-4 ${isEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${isEnabled ? 'text-blue-900' : 'text-gray-700'}`}>
                {label}
              </span>
              {adminOnly && (
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        
        <button
          onClick={() => handleToggle(key)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    );
  };

  // Render section
  const renderSection = (title, fields, Icon) => {
    const visibleFields = fields.filter(f => !f.adminOnly || isAdmin);
    if (visibleFields.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Icon className="w-4 h-4 text-gray-400" />
          {title}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleFields.map(field => renderToggle(field))}
        </div>
      </div>
    );
  };

  // Quick presets
  const applyPreset = (preset) => {
    let newConfig = { ...localConfig };
    
    switch (preset) {
      case 'minimal':
        newConfig = {
          ...newConfig,
          showSKU: false,
          showClientMaterialCode: false,
          showBrandLogo: false,
          showDimensions: false,
          showWeight: false,
          showLeadTime: false,
          showLineDiscount: false,
          showCostPrice: false,
          showMargin: false,
          showOverallDiscount: true,
          showBankDetails: true,
          showSignature: true,
          showTermsAndConditions: false,
          showNotes: true,
          showPageNumbers: true
        };
        break;
      case 'standard':
        newConfig = {
          ...newConfig,
          showSKU: true,
          showClientMaterialCode: true,
          showBrandLogo: false,
          showDimensions: false,
          showWeight: false,
          showLeadTime: true,
          showLineDiscount: true,
          showCostPrice: false,
          showMargin: false,
          showOverallDiscount: true,
          showBankDetails: true,
          showSignature: true,
          showTermsAndConditions: true,
          showNotes: true,
          showPageNumbers: true
        };
        break;
      case 'detailed':
        newConfig = {
          ...newConfig,
          showSKU: true,
          showClientMaterialCode: true,
          showBrandLogo: true,
          showDimensions: true,
          showWeight: true,
          showLeadTime: true,
          showLineDiscount: true,
          showCostPrice: false,
          showMargin: false,
          showOverallDiscount: true,
          showBankDetails: true,
          showSignature: true,
          showTermsAndConditions: true,
          showNotes: true,
          showPageNumbers: true
        };
        break;
      case 'internal':
        if (isAdmin) {
          newConfig = {
            ...newConfig,
            showSKU: true,
            showClientMaterialCode: true,
            showBrandLogo: false,
            showDimensions: true,
            showWeight: true,
            showLeadTime: true,
            showLineDiscount: true,
            showCostPrice: true,
            showMargin: true,
            showOverallDiscount: true,
            showBankDetails: false,
            showSignature: false,
            showTermsAndConditions: false,
            showNotes: true,
            showPageNumbers: true
          };
        }
        break;
    }
    
    setLocalConfig(newConfig);
    onChange?.(newConfig);
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">PDF Configuration</h3>
            <p className="text-sm text-gray-500">Configure fields visible in the PDF</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview?.(localConfig);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload?.(localConfig);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrint?.(localConfig);
              }}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
          
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-4 space-y-6">
          {/* Presets */}
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              Quick Presets
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset('minimal')}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                Minimal
              </button>
              <button
                onClick={() => applyPreset('standard')}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                Standard
              </button>
              <button
                onClick={() => applyPreset('detailed')}
                className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              >
                Detailed
              </button>
              {isAdmin && (
                <button
                  onClick={() => applyPreset('internal')}
                  className="px-3 py-1.5 text-sm border border-yellow-300 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100"
                >
                  Internal (Admin)
                </button>
              )}
            </div>
          </div>

          {/* Line Item Fields */}
          {renderSection('Line Item Fields', FIELD_CONFIGS.line, Package)}

          {/* Pricing Fields */}
          {renderSection('Pricing & Discounts', FIELD_CONFIGS.pricing, DollarSign)}

          {/* Display Options */}
          {renderSection('Display Options', FIELD_CONFIGS.display, Eye)}

          {/* Info Note */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Note on visibility</p>
              <p>
                Cost price and margin fields are only visible to admin users and will never 
                appear in customer-facing PDFs regardless of settings. Internal notes are 
                always excluded from exported PDFs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFConfigPanel;
