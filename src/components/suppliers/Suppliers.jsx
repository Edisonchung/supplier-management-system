// src/components/suppliers/Suppliers.jsx
// Enhanced Suppliers with Dark Mode Support - All existing features preserved
import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Filter, Mail, Phone, 
  MapPin, User, Calendar, MoreVertical, RefreshCw
} from 'lucide-react';
import { useSuppliers } from '../../hooks/useSuppliers';
import { usePermissions } from '../../hooks/usePermissions';
import SupplierCard from './SupplierCard';
import SupplierModal from './SupplierModal';

// Import the enhanced dark mode system
import { useDarkMode } from '../../hooks/useDarkMode';
import { themeClasses, useThemeClasses, getThemeClasses } from '../../utils/theme';

const Suppliers = ({ showNotification }) => {
  const permissions = usePermissions();
  const { 
    suppliers, 
    loading, 
    error,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers();
  
  // Enhanced dark mode integration
  const { isDarkMode, themeVariant, highContrast } = useDarkMode();
  
  // Memoized theme classes for performance
  const cardClasses = useThemeClasses('card', 'hover');
  const backgroundClasses = useThemeClasses('background', 'primary');
  const textPrimaryClasses = useThemeClasses('text', 'primary');
  const textSecondaryClasses = useThemeClasses('text', 'secondary');
  const buttonPrimaryClasses = useThemeClasses('button', 'primary');
  const inputClasses = useThemeClasses('input', 'default');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const canEdit = permissions.canEditSuppliers || permissions.isAdmin;

  // Filter suppliers based on search and status (preserved exactly as before)
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // All handler functions preserved exactly as before
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
      try {
        await deleteSupplier(id);
        showNotification('Supplier deleted successfully', 'success');
      } catch (error) {
        showNotification(error.message || 'Failed to delete supplier', 'error');
      }
    }
  };

  const handleSaveSupplier = async (supplierData) => {
    try {
      if (selectedSupplier) {
        await updateSupplier(selectedSupplier.id, supplierData);
        showNotification('Supplier updated successfully', 'success');
      } else {
        await addSupplier(supplierData);
        showNotification('Supplier added successfully', 'success');
      }
      setShowModal(false);
    } catch (error) {
      showNotification(error.message || 'Failed to save supplier', 'error');
    }
  };

  // Stats calculation preserved exactly as before
  const stats = {
    total: suppliers.length,
    active: suppliers.filter(s => s.status === 'active').length,
    pending: suppliers.filter(s => s.status === 'pending').length,
    inactive: suppliers.filter(s => s.status === 'inactive').length
  };

  // Enhanced theme-aware status badge function
  const getStatusBadgeClasses = (status) => {
    const baseClasses = 'px-2 py-1 text-xs rounded-full font-medium';
    
    if (isDarkMode) {
      switch (status) {
        case 'active':
          return `${baseClasses} bg-green-900/30 text-green-400 border border-green-700/50`;
        case 'pending':
          return `${baseClasses} bg-yellow-900/30 text-yellow-400 border border-yellow-700/50`;
        case 'inactive':
          return `${baseClasses} bg-gray-800/30 text-gray-400 border border-gray-600/50`;
        default:
          return `${baseClasses} bg-gray-800/30 text-gray-400 border border-gray-600/50`;
      }
    }
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'inactive':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Enhanced theme-aware view mode button classes
  const getViewModeButtonClasses = (mode) => {
    const isActive = viewMode === mode;
    const baseClasses = 'p-2 rounded transition-colors';
    
    if (isDarkMode) {
      return isActive 
        ? `${baseClasses} bg-blue-900/30 text-blue-400 border border-blue-700/50`
        : `${baseClasses} text-gray-400 hover:text-gray-300 hover:bg-gray-800/30`;
    }
    
    return isActive
      ? `${baseClasses} bg-blue-100 text-blue-600`
      : `${baseClasses} text-gray-400 hover:text-gray-600 hover:bg-gray-100`;
  };

  // Enhanced loading state with dark mode
  if (loading && suppliers.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${backgroundClasses}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${backgroundClasses} min-h-screen`}>
      {/* Enhanced Header with Dark Mode */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${textPrimaryClasses}`}>Suppliers</h1>
          <p className={`${textSecondaryClasses} mt-1`}>
            Manage your supplier relationships
            <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">(Real-time sync enabled)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={handleAddSupplier}
              className={`${buttonPrimaryClasses} px-4 py-2 rounded-lg flex items-center gap-2 transition-colors`}
            >
              <Plus size={20} />
              Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Error Display with Dark Mode */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Enhanced Stats Cards with Dark Mode */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`${cardClasses} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textSecondaryClasses}`}>Total Suppliers</p>
              <p className={`text-2xl font-bold ${textPrimaryClasses}`}>{stats.total}</p>
            </div>
            <Building2 className={`h-8 w-8 ${textSecondaryClasses}`} />
          </div>
        </div>
        
        <div className={`${cardClasses} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textSecondaryClasses}`}>Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-green-600 dark:bg-green-400 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className={`${cardClasses} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textSecondaryClasses}`}>Pending</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</p>
            </div>
            <div className="h-8 w-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <div className="h-3 w-3 bg-yellow-600 dark:bg-yellow-400 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className={`${cardClasses} p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${textSecondaryClasses}`}>Inactive</p>
              <p className={`text-2xl font-bold ${textSecondaryClasses}`}>{stats.inactive}</p>
            </div>
            <div className={`h-8 w-8 ${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-100'} rounded-full flex items-center justify-center`}>
              <div className={`h-3 w-3 ${isDarkMode ? 'bg-gray-400' : 'bg-gray-600'} rounded-full`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Filters Section with Dark Mode */}
      <div className={`${cardClasses} p-4`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${textSecondaryClasses}`} size={20} />
              <input
                type="text"
                placeholder="Search suppliers..."
                className={`${inputClasses} w-full pl-10 pr-4 py-2 rounded-lg`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select
            className={`${inputClasses} px-4 py-2 rounded-lg`}
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
              className={getViewModeButtonClasses('grid')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={getViewModeButtonClasses('list')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Supplier List/Grid with Dark Mode */}
      {loading && suppliers.length > 0 ? (
        <div className="text-center py-4">
          <p className={textSecondaryClasses}>Updating...</p>
        </div>
      ) : viewMode === 'grid' ? (
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
        <div className={`${cardClasses} overflow-hidden`}>
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border-b border-gray-200 dark:border-gray-700`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondaryClasses} uppercase tracking-wider`}>
                  Name
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondaryClasses} uppercase tracking-wider`}>
                  Contact Person
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondaryClasses} uppercase tracking-wider`}>
                  Email
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondaryClasses} uppercase tracking-wider`}>
                  Phone
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${textSecondaryClasses} uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${textSecondaryClasses} uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`${isDarkMode ? 'bg-gray-800/20' : 'bg-white'} divide-y divide-gray-200 dark:divide-gray-700`}>
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id} className={`${isDarkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'} transition-colors`}>
                  <td className={`px-6 py-4 whitespace-nowrap font-medium ${textPrimaryClasses}`}>
                    {supplier.name}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${textSecondaryClasses}`}>
                    {supplier.contactPerson || '-'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${textSecondaryClasses}`}>
                    {supplier.email}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${textSecondaryClasses}`}>
                    {supplier.phone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={getStatusBadgeClasses(supplier.status)}>
                      {supplier.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEditSupplier(supplier)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mr-3 transition-colors"
                    >
                      Edit
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleDeleteSupplier(supplier.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
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

      {/* Enhanced Empty State with Dark Mode */}
      {filteredSuppliers.length === 0 && !loading && (
        <div className={`${cardClasses} p-12`}>
          <div className="text-center">
            <Building2 className={`mx-auto h-12 w-12 ${textSecondaryClasses}`} />
            <h3 className={`mt-2 text-sm font-medium ${textPrimaryClasses}`}>No Suppliers</h3>
            <p className={`mt-1 text-sm ${textSecondaryClasses}`}>
              {searchTerm || filterStatus !== 'all'
                ? 'No suppliers found matching your filters.'
                : 'Get started by adding a new supplier.'}
            </p>
            {canEdit && !searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  onClick={handleAddSupplier}
                  className={`${buttonPrimaryClasses} px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors`}
                >
                  <Plus size={20} />
                  Add Supplier
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal (preserved exactly as before) */}
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
