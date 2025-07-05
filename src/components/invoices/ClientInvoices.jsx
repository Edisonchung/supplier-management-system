// src/components/invoices/ClientInvoices.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, DollarSign, Calendar, AlertCircle, CheckCircle, Upload, Eye, Edit2, Trash2, X } from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

// Invoice Record Modal Component
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

// Main Client Invoices Component
const ClientInvoices = ({ showNotification }) => {
  const permissions = usePermissions();
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const canEdit = permissions.canEditInvoices;
  const canView = permissions.canViewInvoices;

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load invoices
      const savedInvoices = JSON.parse(localStorage.getItem('clientInvoices') || '[]');
      setInvoices(savedInvoices);

      // Load purchase orders
      const savedPOs = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
      setPurchaseOrders(savedPOs);
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary stats
  const getStats = () => {
    const total = invoices.length;
    const paid = invoices.filter(inv => inv.paymentStatus === 'paid').length;
    const pending = invoices.filter(inv => inv.paymentStatus === 'pending').length;
    const partial = invoices.filter(inv => inv.paymentStatus === 'partial').length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.totalAmount) || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (parseFloat(inv.paidAmount) || 0), 0);
    const outstandingAmount = totalAmount - paidAmount;
    
    return {
      total,
      paid,
      pending,
      partial,
      totalAmount,
      paidAmount,
      outstandingAmount
    };
  };

  const stats = getStats();

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || invoice.paymentStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleAddInvoice = () => {
    setSelectedInvoice(null);
    setShowModal(true);
  };

  const handleEditInvoice = (invoice) => {
    if (!canEdit) {
      showNotification('You do not have permission to edit invoices', 'error');
      return;
    }
    setSelectedInvoice(invoice);
    setShowModal(true);
  };

  const handleSaveInvoice = async (invoiceData) => {
    try {
      const updatedInvoices = selectedInvoice
        ? invoices.map(inv => inv.id === invoiceData.id ? { ...invoiceData, updatedAt: new Date().toISOString() } : inv)
        : [...invoices, { ...invoiceData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      
      localStorage.setItem('clientInvoices', JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
      
      showNotification(
        selectedInvoice ? 'Invoice updated successfully' : 'Invoice created successfully',
        'success'
      );
      setShowModal(false);
    } catch (error) {
      console.error('Error saving invoice:', error);
      showNotification('Failed to save invoice', 'error');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!canEdit) {
      showNotification('You do not have permission to delete invoices', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to delete this invoice record?')) {
      try {
        const updatedInvoices = invoices.filter(inv => inv.id !== id);
        localStorage.setItem('clientInvoices', JSON.stringify(updatedInvoices));
        setInvoices(updatedInvoices);
        showNotification('Invoice deleted successfully', 'success');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        showNotification('Failed to delete invoice', 'error');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysOverdue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  if (!canView) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">You do not have permission to view invoices.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Loading invoices...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Client Invoices</h2>
            <p className="text-base text-gray-500">Track invoices and payment status</p>
          </div>
          {canEdit && (
            <button
              onClick={handleAddInvoice}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
              Add Invoice Record
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold">
                MYR {stats.outstandingAmount.toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by invoice number, client, or PO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => {
                const daysOverdue = getDaysOverdue(invoice.dueDate);
                const isOverdue = daysOverdue > 0 && invoice.paymentStatus !== 'paid';

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-gray-400" />
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invoice.clientName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-blue-600 hover:underline cursor-pointer">
                        {invoice.poNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                      {invoice.currency} {parseFloat(invoice.totalAmount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {new Date(invoice.dueDate).toLocaleDateString()}
                        </span>
                        {isOverdue && (
                          <span className="text-xs text-red-600">
                            ({daysOverdue} days overdue)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {invoice.invoiceFile && (
                          <button
                            onClick={() => window.open(invoice.invoiceFile.url, '_blank')}
                            className="text-blue-600 hover:text-blue-800"
                            title="View Invoice"
                          >
                            <Eye size={18} />
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No invoices found matching your criteria' 
                  : 'No invoices yet'}
              </p>
              {canEdit && !searchTerm && filterStatus === 'all' && (
                <button
                  onClick={handleAddInvoice}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Add your first invoice
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <InvoiceRecordModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveInvoice}
          invoice={selectedInvoice}
          purchaseOrders={purchaseOrders}
        />
      )}
    </div>
  );
};

export default ClientInvoices;
