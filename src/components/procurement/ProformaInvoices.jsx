// src/components/procurement/ProformaInvoices.jsx
import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  Download, Eye, Edit, Trash2, Truck, Package,
  AlertCircle, Clock, CheckCircle, CreditCard,
  Grid, List, Briefcase, AlertTriangle
} from 'lucide-react';
import { useProformaInvoices } from '../../hooks/useProformaInvoices';
import { usePermissions } from '../../hooks/usePermissions';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts } from '../../hooks/useProducts';
import PICard from './PICard';
import PIModal from './PIModal';

const ProformaInvoices = ({ showNotification }) => {
  const permissions = usePermissions();
  const { 
    proformaInvoices, 
    loading, 
    error,
    addProformaInvoice,
    updateProformaInvoice,
    deleteProformaInvoice,
    updateDeliveryStatus,
    getPendingDeliveries
  } = useProformaInvoices();
  
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedPI, setSelectedPI] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  const canEdit = permissions.canEditPI || permissions.isAdmin;
  const canDelete = permissions.isAdmin;

  // Filter PIs based on search and filters
  const filteredPIs = proformaInvoices.filter(pi => {
    const supplier = suppliers.find(s => s.id === pi.supplierId);
    const matchesSearch = 
      pi.piNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pi.projectCode && pi.projectCode.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || pi.status === filterStatus;
    const matchesDelivery = filterDelivery === 'all' || pi.deliveryStatus === filterDelivery;
    const matchesPurpose = filterPurpose === 'all' || pi.purpose === filterPurpose;
    const matchesPriority = filterPriority === 'all' || 
  (filterPriority === 'priority' && pi.isPriority) ||
  (filterPriority === 'normal' && !pi.isPriority);
    
    return matchesSearch && matchesStatus && matchesDelivery && matchesPurpose && matchesPriority;
  });

  const handleAddPI = () => {
    setSelectedPI(null);
    setShowModal(true);
  };

  const handleEditPI = (pi) => {
    setSelectedPI(pi);
    setShowModal(true);
  };

  const handleDeletePI = async (id) => {
    if (!canDelete) return;
    
    if (window.confirm('Are you sure you want to delete this Proforma Invoice?')) {
      const result = await deleteProformaInvoice(id);
      if (result.success) {
        showNotification('Proforma Invoice deleted successfully', 'success');
      } else {
        showNotification(result.error || 'Failed to delete PI', 'error');
      }
    }
  };

  const handleSavePI = async (piData) => {
    if (selectedPI) {
      const result = await updateProformaInvoice(selectedPI.id, piData);
      if (result.success) {
        showNotification('Proforma Invoice updated successfully', 'success');
        setShowModal(false);
      } else {
        showNotification(result.error || 'Failed to update PI', 'error');
      }
    } else {
      const result = await addProformaInvoice(piData);
      if (result.success) {
        showNotification('Proforma Invoice created successfully', 'success');
        setShowModal(false);
      } else {
        showNotification(result.error || 'Failed to create PI', 'error');
      }
    }
  };

  const handleUpdateDeliveryStatus = async (pi) => {
    // If current status is pending, prompt for ETA when moving to in-transit
    if (pi.deliveryStatus === 'pending') {
      const etaDate = prompt('Enter ETA date (YYYY-MM-DD):');
      if (!etaDate) return;
      
      const result = await updateProformaInvoice(pi.id, {
        ...pi,
        deliveryStatus: 'in-transit',
        etaDate: etaDate
      });
      
      if (result.success) {
        showNotification('Delivery status updated to in-transit', 'success');
      } else {
        showNotification(result.error || 'Failed to update status', 'error');
      }
    } else if (pi.deliveryStatus === 'in-transit') {
      // When marking as delivered, open the modal to handle stock receiving
      setSelectedPI(pi);
      setShowModal(true);
      showNotification('Please update the received quantities', 'info');
    } else {
      // Reset to pending
      const result = await updateDeliveryStatus(pi.id, 'pending');
      if (result.success) {
        showNotification('Delivery status reset to pending', 'success');
      }
    }
  };

  const handleSharePI = (pi) => {
    // Generate shareable link
    const shareableLink = `${window.location.origin}/pi/view/${pi.shareableId || pi.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareableLink).then(() => {
      showNotification('PI link copied to clipboard!', 'success');
    }).catch(() => {
      showNotification('Failed to copy link', 'error');
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'partial': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const pendingCount = getPendingDeliveries().length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proforma Invoices</h1>
          <p className="text-gray-600 mt-1">Manage supplier quotations and track deliveries</p>
        </div>
        {canEdit && (
          <button
            onClick={handleAddPI}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add PI
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total PIs</p>
              <p className="text-2xl font-bold">{proformaInvoices.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold">
                {proformaInvoices.filter(pi => pi.status === 'confirmed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Delivery</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
            <Truck className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold">
                ${proformaInvoices.reduce((sum, pi) => sum + (pi.totalAmount || 0), 0).toFixed(2)}
              </p>
            </div>
            <CreditCard className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by PI number, supplier, or project code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
            
            <select
              value={filterDelivery}
              onChange={(e) => setFilterDelivery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Delivery</option>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="partial">Partial</option>
              <option value="delivered">Delivered</option>
            </select>
            
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Purpose</option>
              <option value="stock">Stock</option>
              <option value="r&d">R&D</option>
              <option value="client-order">Client Order</option>
            </select>
            
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* PI List/Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPIs.map(pi => (
            <PICard
              key={pi.id}
              proformaInvoice={pi}
              supplier={suppliers.find(s => s.id === pi.supplierId)}
              onEdit={() => handleEditPI(pi)}
              onDelete={() => handleDeletePI(pi.id)}
              onUpdateDelivery={() => handleUpdateDeliveryStatus(pi)}
              onShare={() => handleSharePI(pi)}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PI Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPIs.map(pi => {
                const supplier = suppliers.find(s => s.id === pi.supplierId);
                return (
                  <tr key={pi.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pi.piNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {pi.projectCode || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pi.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${pi.totalAmount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                        {pi.purpose?.replace('-', ' ') || 'stock'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pi.status)}`}>
                        {pi.status}
                      </span>
                      {pi.isPriority && (
                       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle size={12} className="mr-1" />
                          Priority
                      </span>
                      )}
                    </td> 
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeliveryColor(pi.deliveryStatus)}`}>
                        {pi.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(pi.paymentStatus || 'pending')}`}>
                        {pi.paymentStatus || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditPI(pi)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View/Edit"
                        >
                          <Eye size={18} />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleUpdateDeliveryStatus(pi)}
                            className="text-green-600 hover:text-green-800"
                            title="Update Delivery"
                          >
                            <Truck size={18} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDeletePI(pi.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredPIs.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Proforma Invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' || filterDelivery !== 'all' || filterPurpose !== 'all'
                ? 'No PIs found matching your filters.'
                : 'Get started by creating a new proforma invoice.'}
            </p>
            {canEdit && !searchTerm && filterStatus === 'all' && filterDelivery === 'all' && filterPurpose === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleAddPI}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Proforma Invoice
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PIModal
          proformaInvoice={selectedPI}
          suppliers={suppliers}
          products={products}
          onSave={handleSavePI}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default ProformaInvoices;
