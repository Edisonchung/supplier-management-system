import React, { useState, useCallback } from 'react';
import { 
  FileDown, Loader2, Check, X, Eye, Printer,
  Mail, Settings2, AlertCircle, Download, ExternalLink,
  Copy, Share2
} from 'lucide-react';
import QuotationPDFService from '../../../services/QuotationPDFService';
import PDFConfigPanel from './PDFConfigPanel';

/**
 * PDFExport - Generate and export quotation PDFs
 * 
 * Features:
 * - PDF generation with configurable options
 * - Preview before download
 * - Direct download
 * - Print functionality
 * - Email attachment generation
 * - Share link generation
 */
const PDFExport = ({
  quotationId,
  quotationNumber,
  companyCode = 'FS',
  isAdmin = false,
  onExportComplete,
  className = ''
}) => {
  // State
  const [pdfConfig, setPdfConfig] = useState({
    showSKU: true,
    showClientMaterialCode: false,
    showBrandLogo: true,
    showDimensions: false,
    showWeight: false,
    showLeadTime: true,
    showLineDiscount: true,
    showCostPrice: false,
    showMargin: false,
    showOverallDiscount: true,
    showBankDetails: true,
    showSignature: true,
    showTerms: true,
    showNotes: true,
    showPageNumbers: true
  });
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState(null);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(null);

  // Generate PDF
  const handleGeneratePDF = useCallback(async (action = 'download') => {
    if (!quotationId) {
      setError('Quotation ID is required');
      return;
    }

    setGenerating(true);
    setError(null);
    setExportSuccess(null);

    try {
      let result;

      switch (action) {
        case 'preview':
          result = await QuotationPDFService.previewPDF(quotationId, pdfConfig, isAdmin);
          if (result.success && result.url) {
            setPreviewUrl(result.url);
            setShowPreview(true);
          }
          break;

        case 'download':
          result = await QuotationPDFService.downloadPDF(quotationId, pdfConfig, isAdmin);
          if (result.success) {
            setExportSuccess({ type: 'download', message: 'PDF downloaded successfully' });
            onExportComplete?.({ type: 'download', quotationId });
          }
          break;

        case 'print':
          result = await QuotationPDFService.previewPDF(quotationId, pdfConfig, isAdmin);
          if (result.success && result.url) {
            // Open in new window and trigger print
            const printWindow = window.open(result.url, '_blank');
            if (printWindow) {
              printWindow.onload = () => {
                setTimeout(() => {
                  printWindow.print();
                }, 500);
              };
            }
            setExportSuccess({ type: 'print', message: 'Print dialog opened' });
          }
          break;

        case 'email':
          result = await QuotationPDFService.generatePDFForEmail(quotationId, pdfConfig, isAdmin);
          if (result.success) {
            setGeneratedPdf({
              base64: result.base64,
              filename: result.filename
            });
            setExportSuccess({ type: 'email', message: 'PDF ready for email attachment' });
            onExportComplete?.({ type: 'email', quotationId, attachment: result });
          }
          break;

        default:
          break;
      }

      if (result && !result.success) {
        setError(result.error || 'Failed to generate PDF');
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setError(err.message || 'An error occurred while generating PDF');
    } finally {
      setGenerating(false);
    }
  }, [quotationId, pdfConfig, isAdmin, onExportComplete]);

  // Handle config change
  const handleConfigChange = (newConfig) => {
    setPdfConfig(newConfig);
  };

  // Close preview
  const handleClosePreview = () => {
    setShowPreview(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // Copy share link (simulated)
  const handleCopyShareLink = async () => {
    try {
      // In production, this would generate a shareable link
      const shareUrl = `${window.location.origin}/quotations/${quotationId}/view`;
      await navigator.clipboard.writeText(shareUrl);
      setExportSuccess({ type: 'share', message: 'Share link copied to clipboard' });
    } catch (err) {
      setError('Failed to copy share link');
    }
  };

  return (
    <div className={`${className}`}>
      {/* Main Export Buttons */}
      <div className="flex flex-wrap gap-2">
        {/* Preview Button */}
        <button
          onClick={() => handleGeneratePDF('preview')}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
          Preview
        </button>

        {/* Download Button */}
        <button
          onClick={() => handleGeneratePDF('download')}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Download PDF
        </button>

        {/* Print Button */}
        <button
          onClick={() => handleGeneratePDF('print')}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Printer className="w-4 h-4" />
          )}
          Print
        </button>

        {/* Email Button */}
        <button
          onClick={() => handleGeneratePDF('email')}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          Email
        </button>

        {/* Share Link Button */}
        <button
          onClick={handleCopyShareLink}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share Link
        </button>

        {/* Config Toggle */}
        <button
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showConfigPanel 
              ? 'bg-purple-100 text-purple-700' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          Options
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Display */}
      {exportSuccess && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{exportSuccess.message}</span>
          <button 
            onClick={() => setExportSuccess(null)}
            className="ml-auto p-1 hover:bg-green-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Config Panel */}
      {showConfigPanel && (
        <div className="mt-4">
          <PDFConfigPanel
            config={pdfConfig}
            onChange={handleConfigChange}
            isAdmin={isAdmin}
            onPreview={() => handleGeneratePDF('preview')}
            onDownload={() => handleGeneratePDF('download')}
            onPrint={() => handleGeneratePDF('print')}
            isGenerating={generating}
          />
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-gray-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    PDF Preview
                  </h3>
                  <p className="text-sm text-gray-500">
                    {quotationNumber || `Quotation #${quotationId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF('download')}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={() => handleGeneratePDF('print')}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Open in new tab"
                >
                  <ExternalLink className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClosePreview}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 bg-gray-100 p-4 overflow-auto">
              <iframe
                src={previewUrl}
                className="w-full h-full bg-white rounded shadow-lg"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="mt-4 text-xs text-gray-500">
        <p>
          PDF will include: {companyCode} letterhead
          {pdfConfig.showBankDetails ? ', bank details' : ''}
          {pdfConfig.showTerms ? ', terms & conditions' : ''}
          {pdfConfig.showSignature ? ', signature block' : ''}
        </p>
        {isAdmin && (
          <p className="text-amber-600 mt-1">
            Admin view enabled - cost/margin fields available
          </p>
        )}
      </div>
    </div>
  );
};

export default PDFExport;
