// src/components/suppliers/Suppliers.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Filter, Mail, Phone, 
  MapPin, User, Calendar, MoreVertical
} from 'lucide-react';
import { useSuppliers } from '../../hooks/useSuppliers';
import { usePermissions } from '../../hooks/usePermissions';
import SupplierCard from './SupplierCard';
import SupplierModal from './SupplierModal';

const Suppliers = ({ showNotification }) => {
  const permissions = usePermissions();
  const { 
    suppliers, 
    loading, 
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier
  } = useSuppliers();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const canEdit = permissions.canEditSuppliers || permissions.isAdmin;

  // Filter suppliers based on search and status
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setShowModal(true);
  };

  const handleEditSupplier = (supplier) => {
    if (!canEdit) return;
    setSelectedSupplier(supplier);
    setShowModal(true);
  };

  const handleDeleteSupplier = async (id) => {
    if (!canEdit) return;
    
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      const result = await deleteSupplier(id);
      if (result.success) {
        showNotification('Supplier deleted successfully', 'success');
      } else {
        showNotification(result.error || 'Failed to delete supplier', 'error');
      }
    }
  };

  const handleSaveSupplier = async (supplierData) => {
    if (selectedSupplier) {
      const result = await updateSupplier(selectedSupplier.id, supplierData);
      if (result.success) {
        showNotification('Supplier updated successfully', 'success');
        setShowModal(false);
      } else {
        showNotification(result.error || 'Failed to update supplier', 'error');
      }
    } else {
      const result = await addSupplier(supplierData);
      if (result.success) {
        showNotification('Supplier added successfully', 'success');
        setShowModal(false);
      } else {
        showNotification(result.error || 'Failed to add supplier', 'error');
      }
    }
  };

  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    pending: suppliers.filter(s => s.status === 'pending').length,
    inactive: suppliers.filter(s => s.status === 'inactive').length
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600 mt-1">Manage your supplier relationships</p>
        </div>
        {canEdit && (
          <button
            onClick={handleAddSupplier}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Add Supplier
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Building2 className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-green-600 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-yellow-600 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            </div>
            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search suppliers..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Supplier List/Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supplier => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onEdit={() => handleEditSupplier(supplier)}
              onDelete={() => handleDeleteSupplier(supplier.id)}
              canEdit={canEdit}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {supplier.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier.contactPerson || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {supplier.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      supplier.status === 'active' ? 'bg-green-100 text-green-800' :
                      supplier.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      Edit
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Suppliers</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all'
                ? 'No suppliers found matching your filters.'
                : 'Get started by adding a new supplier.'}
            </p>
            {canEdit && !searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleAddSupplier}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Supplier
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <SupplierModal
          supplier={selectedSupplier}
          onSave={handleSaveSupplier}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default Suppliers;
