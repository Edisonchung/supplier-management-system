// src/components/invoices/InvoiceRecordModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';

const InvoiceRecordModal = ({ isOpen, onClose, onSave, invoice, purchaseOrders }) => {
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    poId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    totalAmount: '',
    currency: 'MYR',
    status: 'sent',
    paymentStatus: 'pending',
    paidAmount: 0,
    paymentDate: '',
    paymentMethod: '',
    notes: '',
    invoiceFile: null
  });

  const [selectedPO, setSelectedPO] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (invoice) {
      setFormData(invoice);
      const po = purchaseOrders.find(p => p.id === invoice.poId);
      setSelectedPO(po);
    } else {
      // Calculate due date (30 days from invoice date)
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
      
      setFormData(prev => ({
        ...prev,
        invoiceDate: invoiceDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0]
      }));
    }
  }, [invoice, purchaseOrders]);

  const handlePOSelect = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedPO(po);
      setFormData(prev => ({
        ...prev,
        poId: po.id,
        totalAmount: po.totalAmount || 0
      }));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, you'd upload to a server
      // For now, we'll create a local URL
      setFormData(prev => ({
        ...prev,
        invoiceFile: {
          url: URL.createObjectURL(file),
          filename: file.name,
          uploadedAt: new Date().toISOString()
        }
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.invoiceNumber) newErrors.invoiceNumber = 'Invoice number is required';
    if (!formData.poId) newErrors.poId = 'Purchase order is required';
    if (!formData.totalAmount || formData.totalAmount <= 0) newErrors.totalAmount = 'Valid amount is required';
    if (!formData.invoiceDate) newErrors.invoiceDate = 'Invoice date is required';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    onSave({
      ...formData,
      clientName: selectedPO?.clientName || '',
      poNumber: selectedPO?.poNumber || '',
      isExternalInvoice: true,
      id: invoice?.id || Date.now().toString()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {invoice ? 'Edit Invoice Record' : 'Add Invoice Record'}
            </h2>
            <p className="text-gray-600 mt-1">
              Link an external invoice to a purchase order for tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* PO Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Order *
            </label>
            <select
              value={formData.poId}
              onChange={(e) => handlePOSelect(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.poId ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select a PO</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} - {po.clientName} (MYR {po.totalAmount?.toLocaleString() || 0})
                </option>
              ))}
            </select>
            {errors.poId && <p className="text-red-500 text-sm mt-1">{errors.poId}</p>}
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.invoiceNumber ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="INV-2025-001"
                required
              />
              {errors.invoiceNumber && <p className="text-red-500 text-sm mt-1">{errors.invoiceNumber}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-24 px-2 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="MYR">MYR</option>
                  <option value="SGD">SGD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
                <input
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({...formData, totalAmount: parseFloat(e.target.value) || 0})}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.totalAmount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  step="0.01"
                  required
                />
              </div>
              {errors.totalAmount && <p className="text-red-500 text-sm mt-1">{errors.totalAmount}</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({...formData, invoiceDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Invoice File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                id="invoice-file"
              />
              <label
                htmlFor="invoice-file"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {formData.invoiceFile ? formData.invoiceFile.filename : 'Click to upload PDF or image'}
                </span>
              </label>
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {/* Payment Details (if paid) */}
          {formData.paymentStatus !== 'pending' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paid Amount
                </label>
                <input
                  type="number"
                  value={formData.paidAmount}
                  onChange={(e) => setFormData({...formData, paidAmount: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select payment method</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Online Payment">Online Payment</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows="3"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {invoice ? 'Update' : 'Save'} Invoice Record
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceRecordModal;
