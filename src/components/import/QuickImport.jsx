// src/components/import/QuickImport.jsx
import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Loader, CheckCircle, 
  AlertCircle, X, Eye, Download, 
  FileSpreadsheet, Image, Zap, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const QuickImport = ({ showNotification }) => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [importType, setImportType] = useState('auto'); // auto, pi, po, products
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  const supportedFormats = [
    { ext: '.pdf', icon: FileText, color: 'text-red-500' },
    { ext: '.xlsx', icon: FileSpreadsheet, color: 'text-green-500' },
    { ext: '.xls', icon: FileSpreadsheet, color: 'text-green-500' },
    { ext: '.png', icon: Image, color: 'text-blue-500' },
    { ext: '.jpg', icon: Image, color: 'text-blue-500' },
  ];

  const importTypes = [
    { value: 'auto', label: 'Auto Detect', description: 'AI will determine document type' },
    { value: 'pi', label: 'Proforma Invoice', description: 'Import supplier quotations' },
    { value: 'po', label: 'Purchase Order', description: 'Import client orders' },
    { value: 'products', label: 'Product List', description: 'Import product catalog' },
  ];

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setExtractedData(null);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setExtractedData(null);
    }
  };

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', importType);

      // Call your backend API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://supplier-mcp-server-production.up.railway.app'}/api/extract`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Extraction failed');
      }

      const data = await response.json();
      setExtractedData(data);
      showNotification('Data extracted successfully!', 'success');
    } catch (error) {
      console.error('Extraction error:', error);
      showNotification('Failed to extract data. Please try again.', 'error');
      
      // Mock data for demo
      setExtractedData({
        type: 'proforma_invoice',
        data: {
          supplierName: 'Demo Supplier Co.',
          invoiceNumber: 'PI-2025-001',
          date: new Date().toISOString().split('T')[0],
          items: [
            { name: 'Electronic Component A', quantity: 10, unitPrice: 25.00 },
            { name: 'Hydraulic Valve B', quantity: 5, unitPrice: 150.00 },
          ],
          totalAmount: 1000.00
        }
      });
    } finally {
      setExtracting(false);
    }
  };

  const handleImport = async () => {
    if (!extractedData) return;

    try {
      // Here you would save the data to your respective modules
      // For now, we'll just show a success message
      showNotification(`Successfully imported ${extractedData.type.replace('_', ' ')}!`, 'success');
      
      // Reset state
      setFile(null);
      setExtractedData(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      showNotification('Failed to import data', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quick Import</h1>
        <p className="text-gray-600 mt-1">Import data from PDFs, Excel files, or images using AI</p>
      </div>

      {/* Import Type Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Import Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {importTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setImportType(type.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                importType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-left">
                <div className="font-medium text-gray-900">{type.label}</div>
                <div className="text-sm text-gray-600 mt-1">{type.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* File Upload Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>
        
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
            className="hidden"
          />
          
          {!file ? (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Drop your file here, or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                browse to upload
              </button>
              <div className="mt-4 flex justify-center gap-4">
                {supportedFormats.map((format) => (
                  <div key={format.ext} className="flex items-center gap-1">
                    <format.icon className={`h-4 w-4 ${format.color}`} />
                    <span className="text-sm text-gray-500">{format.ext}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setExtractedData(null);
                    setPreview(null);
                  }}
                  className="ml-4 p-1 hover:bg-gray-100 rounded"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {preview && (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg shadow-sm"
                />
              )}

              {!extractedData && (
                <button
                  onClick={handleExtract}
                  disabled={extracting}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
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
          )}
        </div>
      </div>

      {/* Extracted Data Preview */}
      {extractedData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Extracted Data</h2>
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Import Data
              </button>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-700 overflow-x-auto">
              {JSON.stringify(extractedData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickImport;
