// src/components/invoices/ClientInvoices.jsx
import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, DollarSign, Calendar, AlertCircle, CheckCircle, Upload, Eye, Edit2, Trash2 } from 'lucide-react';
import { useClientInvoices } from '../../hooks/useClientInvoices';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { usePermissions } from '../../hooks/usePermissions';
import InvoiceRecordModal from './InvoiceRecordModal';

const ClientInvoices = ({ showNotification }) => {
  const permissions = usePermissions();
  const { 
    invoices, 
    loading, 
    error, 
    addInvoice, 
    updateInvoice, 
    deleteInvoice,
    getStats,
    getOverdueInvoices 
  } = useClientInvoices();
  
  const { purchaseOrders } = usePurchaseOrders();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const canEdit = permissions.canEditInvoices;
  const canView = permissions.canViewInvoices;

  // Get stats
  const stats = getStats();

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase());
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
    const result = selectedInvoice
      ? await updateInvoice(selectedInvoice.id, invoiceData)
      : await addInvoice(invoiceData);

    if (result.success) {
      showNotification(
        selectedInvoice ? 'Invoice updated successfully' : 'Invoice created successfully',
        'success'
      );
      setShowModal(false);
    } else {
      showNotification(result.error || 'Failed to save invoice', 'error');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!canEdit) {
      showNotification('You do not have permission to delete invoices', 'error');
      return;
    }

    if (window.confirm('Are you sure you want to delete this invoice record?')) {
      const result = await deleteInvoice(id);
      if (result.success) {
        showNotification('Invoice deleted successfully', 'success');
      } else {
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
  if (error) return <div className="text-center py-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Invoices</h2>
          <p className="text-gray-600">Track invoices and payment status</p>
        </div>
        {canEdit && (
          <button
            onClick={handleAddInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Invoice Record
          </button>
        )}
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
              placeholder="Search by invoice number or client..."
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
                      {invoice.currency} {invoice.totalAmount.toLocaleString()}
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
              <p className="mt-2 text-gray-600">No invoices found</p>
              {canEdit && (
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
