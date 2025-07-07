// src/components/import/QuickImport.jsx
import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Loader, CheckCircle, 
  AlertCircle, X, Eye, Download, 
  FileSpreadsheet, Image, Zap, ArrowRight,
  Info, Edit2, Save, AlertTriangle,
  Package, Building2, FileCheck, Brain
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { AIExtractionService } from '../../services/ai/AIExtractionService';
import { useSuppliersDual } from '../../hooks/useSuppliersDual';
import { useProductsDual } from '../../hooks/useProductsDual';

const QuickImport = ({ showNotification }) => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const { suppliers, addSupplier } = useSuppliersDual();
  const { products, addProduct } = useProductsDual();
  
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [importType, setImportType] = useState('auto');
  const [preview, setPreview] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  const supportedFormats = [
    { ext: '.pdf', icon: FileText, color: 'text-red-500' },
    { ext: '.xlsx', icon: FileSpreadsheet, color: 'text-green-500' },
    { ext: '.xls', icon: FileSpreadsheet, color: 'text-green-500' },
    { ext: '.png', icon: Image, color: 'text-blue-500' },
    { ext: '.jpg', icon: Image, color: 'text-blue-500' },
  ];

  const importTypes = [
    { value: 'auto', label: 'Auto Detect', description: 'AI will determine document type', icon: Brain },
    { value: 'pi', label: 'Proforma Invoice', description: 'Import supplier quotations', icon: FileText },
    { value: 'po', label: 'Purchase Order', description: 'Import client orders', icon: FileCheck },
    { value: 'products', label: 'Product List', description: 'Import product catalog', icon: Package },
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const processFile = (selectedFile) => {
    setFile(selectedFile);
    setExtractedData(null);
    setEditMode(false);
    
    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    try {
      console.log('Starting AI extraction...');
      
      // Use the AI extraction service
      const result = await AIExtractionService.extractFromFile(file);
      
      if (result.success) {
        setExtractedData(result);
        setEditedData(result.data);
        showNotification('Data extracted successfully!', 'success');
      } else {
        throw new Error('Extraction failed');
      }
    } catch (error) {
      console.error('Extraction error:', error);
      showNotification('Failed to extract data. Please try again.', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    setExtractedData({
      ...extractedData,
      data: editedData
    });
    setEditMode(false);
    showNotification('Changes saved', 'success');
  };

  const handleFieldChange = (path, value) => {
    const keys = path.split('.');
    const newData = { ...editedData };
    let current = newData;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setEditedData(newData);
  };

  const handleImport = async () => {
    if (!extractedData) return;

    try {
      const { data } = extractedData;
      let importCount = 0;

      // Import based on detected type
      if (data.type === 'purchase_order' || importType === 'po') {
        // Import as Purchase Order
        // This would integrate with your PO module
        showNotification('Purchase Order import functionality coming soon!', 'info');
      } else if (data.type === 'proforma_invoice' || importType === 'pi') {
        // Import as Proforma Invoice
        showNotification('Proforma Invoice import functionality coming soon!', 'info');
      } else if (data.type === 'product_list' || importType === 'products') {
        // Import products
        if (data.items && Array.isArray(data.items)) {
          for (const item of data.items) {
            const productData = {
              name: item.productName || item.name,
              sku: item.productCode || item.sku || `SKU-${Date.now()}`,
              category: item.category || 'General',
              brand: item.brand || '',
              supplierId: data.supplierId || suppliers[0]?.id,
              unitCost: item.unitPrice || 0,
              stock: item.quantity || 0,
              minStock: 10,
              status: 'pending'
            };
            
            const result = await addProduct(productData);
            if (result.success) importCount++;
          }
        }
        showNotification(`Successfully imported ${importCount} products!`, 'success');
      }
      
      // Reset state
      setFile(null);
      setExtractedData(null);
      setPreview(null);
      setEditedData(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      showNotification('Failed to import data', 'error');
    }
  };

  const renderExtractedData = () => {
    if (!extractedData) return null;

    const { data, validation, duplicateCheck, recommendations, metadata } = extractedData;

    return (
      <div className="space-y-6">
        {/* Metadata and Confidence */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">Extraction Summary</h3>
              <div className="mt-2 text-sm text-blue-700 space-y-1">
                <p>Confidence: <span className="font-medium">{(metadata?.confidence * 100 || 85).toFixed(0)}%</span></p>
                <p>Processing Time: <span className="font-medium">{metadata?.extractionTime?.toFixed(0) || 'N/A'}ms</span></p>
                <p>Document Type: <span className="font-medium">{data.type?.replace('_', ' ').toUpperCase() || 'Unknown'}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Validation Warnings */}
        {validation && !validation.isValid && (
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900">Validation Issues</h3>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  {validation.errors?.map((error, idx) => (
                    <li key={idx}>{error.message}</li>
                  ))}
                  {validation.warnings?.map((warning, idx) => (
                    <li key={idx}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Check */}
        {duplicateCheck?.isDuplicate && (
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">Duplicate Detected</h3>
                <p className="mt-1 text-sm text-red-700">
                  Similar document found: {duplicateCheck.similarDocument?.name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Extracted Data */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Extracted Data</h2>
            <div className="flex gap-2">
              {!editMode ? (
                <button
                  onClick={handleEdit}
                  className="text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleSaveEdit}
                  className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded-md hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                >
                  <Save className="h-4 w-4" />
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Main Data Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.supplierName && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedData.supplierName || ''}
                    onChange={(e) => handleFieldChange('supplierName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{String(data.supplierName)}</p>
                )}
              </div>
            )}

            {data.documentNumber && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Number
                </label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedData.documentNumber}
                    onChange={(e) => handleFieldChange('documentNumber', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{data.documentNumber}</p>
                )}
              </div>
            )}

            {data.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                {editMode ? (
                  <input
                    type="date"
                    value={editedData.date}
                    onChange={(e) => handleFieldChange('date', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{new Date(data.date).toLocaleDateString()}</p>
                )}
              </div>
            )}

            {data.totalAmount !== undefined && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>
                {editMode ? (
                  <input
                    type="number"
                    value={editedData.totalAmount}
                    onChange={(e) => handleFieldChange('totalAmount', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">RM {data.totalAmount?.toFixed(2)}</p>
                )}
              </div>
            )}
          </div>

          {/* Items Table */}
          {data.items && data.items.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-center">Quantity</th>
                      <th className="px-4 py-2 text-right">Unit Price</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {data.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">{String(item.productName || item.name || '')}</td>
                        <td className="px-4 py-2 text-center">{Number(item.quantity || 0)}</td>
                        <td className="px-4 py-2 text-right">RM {Number(item.unitPrice || 0).toFixed(2)}</td>
                        <td className="px-4 py-2 text-right">
                          RM {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Brain className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-green-900">AI Recommendations</h3>
                <ul className="mt-2 text-sm text-green-700 space-y-1">
                  {recommendations.map((rec, idx) => (
                    <li key={idx}>• {rec.message || rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Import Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => {
              setFile(null);
              setExtractedData(null);
              setPreview(null);
            }}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Import Data
          </button>
        </div>
      </div>
    );
  };

  if (!permissions.canImportData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You do not have permission to import data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quick Import</h1>
        <p className="text-gray-600 mt-1">Import data from PDFs, Excel files, or images using AI</p>
      </div>

      {/* Import Type Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {importTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setImportType(type.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  importType === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className={`w-8 h-8 mb-2 mx-auto ${
                  importType === type.value ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <h3 className="font-medium text-gray-900">{type.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Document</h2>
        
        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-4">
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-md" />
              ) : (
                <FileText className="w-16 h-16 text-gray-400 mx-auto" />
              )}
              
              <div>
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Change File
                </button>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              
              {!extractedData && (
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="mx-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {extracting ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Extract Data
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drag and drop your file here, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  browse
                </button>
              </p>
              <p className="text-sm text-gray-500">
                Supports: {supportedFormats.map(f => f.ext).join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Supported Formats */}
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {supportedFormats.map((format) => {
            const Icon = format.icon;
            return (
              <div
                key={format.ext}
                className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full text-sm"
              >
                <Icon className={`w-4 h-4 ${format.color}`} />
                <span className="text-gray-600">{format.ext}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Extracted Data Preview */}
      {extractedData && renderExtractedData()}
    </div>
  );
};

export default QuickImport;
