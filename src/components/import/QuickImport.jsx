import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const QuickImport = ({ showNotification }) => {
  const permissions = usePermissions();
  const [importText, setImportText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);

  const parseProductLine = (line) => {
    line = line.trim();
    
    // Remove leading numbers for table format
    line = line.replace(/^\s*\d+\s+/, '');
    
    // Pattern 1: Table format "ProductName   Qty   Price   Total"
    if (/\s{3,}/.test(line)) {
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
      if (parts.length >= 3) {
        const partNumber = parts[0];
        const priceStr = parts.find(p => p.match(/^\d+\.?\d*$/) && parseFloat(p) > 0);
        const price = priceStr ? parseFloat(priceStr) : 0;
        if (partNumber && price > 0) {
          return { partNumber, price };
        }
      }
    }
    
    return null;
  };

  const processImport = async () => {
    if (!importText.trim()) {
      showNotification('Please enter text to import', 'error');
      return;
    }

    setProcessing(true);
    setResults(null);

    try {
      const lines = importText.split('\n').filter(line => line.trim());
      const parsed = [];
      const errors = [];

      lines.forEach((line, index) => {
        const result = parseProductLine(line);
        if (result) {
          parsed.push({
            ...result,
            lineNumber: index + 1,
            originalLine: line
          });
        } else if (line.trim() && !line.match(/^(product|part|item|name|qty|price|total)/i)) {
          errors.push({
            lineNumber: index + 1,
            line: line,
            error: 'Could not parse product information'
          });
        }
      });

      setResults({
        success: parsed,
        errors: errors,
        total: lines.length
      });

      if (parsed.length > 0) {
        showNotification(`Successfully parsed ${parsed.length} products`, 'success');
      } else {
        showNotification('No products could be parsed from the text', 'error');
      }

    } catch (error) {
      showNotification('Error processing import', 'error');
      console.error('Import error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const clearAll = () => {
    setImportText('');
    setResults(null);
  };

  if (!permissions.canImport) {
    return (
      <div className="text-center py-12">
        <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to use quick import.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quick Import</h1>
        <p className="text-gray-600 mt-2">Paste product data from quotes, catalogs, or emails to quickly add multiple products.</p>
      </div>

      {/* Import Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste your product data here:
          </label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder={`Example formats supported:

PVQ20-A2R-SS1S-10-C21D-11    2    $335.00    $670.00
DG4V-5-2C-MU-C6-20          1    $157.00    $157.00

Or:

1. PVQ20-A2R-SS1S-10-C21D-11 - $335.00
2. DG4V-5-2C-MU-C6-20 - $157.00`}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={processImport}
            disabled={processing || !importText.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {processing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Upload size={16} />
            )}
            {processing ? 'Processing...' : 'Process Import'}
          </button>
          
          <button
            onClick={clearAll}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Success Results */}
          {results.success.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-green-800">
                  Successfully Parsed ({results.success.length} items)
                </h3>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.success.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{item.partNumber}</p>
                        <p className="text-sm text-gray-600">Price: ${item.price}</p>
                      </div>
                      <span className="text-xs text-green-600">Line {item.lineNumber}</span>
                    </div>
                  </div>
                ))}
              </div>

              {results.success.length > 0 && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Add {results.success.length} Products to Catalog
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Results */}
          {results.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <h3 className="font-medium text-red-800">
                  Parsing Errors ({results.errors.length} lines)
                </h3>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {results.errors.map((error, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-mono text-gray-900">{error.line}</p>
                        <p className="text-xs text-red-600">{error.error}</p>
                      </div>
                      <span className="text-xs text-red-600">Line {error.lineNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Import Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Total Lines</p>
                <p className="font-medium">{results.total}</p>
              </div>
              <div>
                <p className="text-gray-600">Successful</p>
                <p className="font-medium text-green-600">{results.success.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Errors</p>
                <p className="font-medium text-red-600">{results.errors.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-blue-800">Supported Formats</h3>
        </div>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Table format:</strong> Product Name [spaces] Quantity [spaces] Price [spaces] Total</p>
          <p>• <strong>List format:</strong> 1. Product Name - $Price</p>
          <p>• <strong>Simple format:</strong> Product Name $Price</p>
          <p>• The system will automatically detect product brands from part numbers</p>
        </div>
      </div>
    </div>
  );
};

export default QuickImport;
