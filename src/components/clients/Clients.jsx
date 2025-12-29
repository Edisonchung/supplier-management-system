import React, { useState, useMemo, useCallback } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
  ChevronDown,
  RefreshCw,
  Download,
  Upload,
  Star,
  Globe,
  CheckCircle,
  Clock,
  XCircle,
  Briefcase
} from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import ClientModal from './ClientModal';

const Clients = ({ showNotification }) => {
  // Hook
  const {
    clients,
    loading,
    error,
    statistics,
    topClients,
    addClient,
    updateClient,
    deleteClient,
    searchClients,
    clientOptions,
    exportClientsToCSV
  } = useClients();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClients, setSelectedClients] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Get unique industries for filter
  const industries = useMemo(() => {
    const uniqueIndustries = [...new Set(clients.map(c => c.industry).filter(Boolean))];
    return uniqueIndustries.sort();
  }, [clients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    let result = clients;

    // Search filter
    if (searchTerm) {
      result = searchClients(searchTerm);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Industry filter
    if (industryFilter !== 'all') {
      result = result.filter(c => c.industry === industryFilter);
    }

    return result;
  }, [clients, searchTerm, statusFilter, industryFilter, searchClients]);

  // Handle save client
  const handleSaveClient = useCallback(async (clientData, clientId) => {
    try {
      if (clientId) {
        await updateClient(clientId, clientData);
      } else {
        await addClient(clientData);
      }
    } catch (error) {
      throw error;
    }
  }, [addClient, updateClient]);

  // Handle edit
  const handleEdit = useCallback((client) => {
    setEditingClient(client);
    setShowModal(true);
    setActionMenuOpen(null);
  }, []);

  // Handle delete
  const handleDelete = useCallback(async (clientId) => {
    try {
      await deleteClient(clientId);
      showNotification?.('Client deleted successfully', 'success');
      setShowDeleteConfirm(null);
    } catch (error) {
      showNotification?.('Failed to delete client: ' + error.message, 'error');
    }
  }, [deleteClient, showNotification]);

  // Handle export
  const handleExport = useCallback(() => {
    try {
      exportClientsToCSV?.();
      showNotification?.('Clients exported successfully', 'success');
    } catch (error) {
      showNotification?.('Failed to export clients', 'error');
    }
  }, [exportClientsToCSV, showNotification]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const config = {
      active: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      inactive: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock }
    };
    const { bg, text, icon: Icon } = config[status] || config.pending;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Stats Cards Component
  const StatsCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Building2 className="h-6 w-6 text-blue-500" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Clients</dt>
              <dd className="text-lg font-semibold text-gray-900">{statistics.total}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
              <dd className="text-lg font-semibold text-gray-900">{statistics.active}</dd>
              <dd className="text-xs text-gray-400">
                {statistics.inactive} inactive
              </dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <FileText className="h-6 w-6 text-purple-500" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
              <dd className="text-lg font-semibold text-gray-900">{statistics.totalPOCount}</dd>
            </dl>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <DollarSign className="h-6 w-6 text-green-500" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
              <dd className="text-lg font-semibold text-gray-900">
                RM {(statistics.totalPOValue || 0).toLocaleString()}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  // Table View
  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Industry
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Terms
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              POs
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="relative px-6 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredClients.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No clients found</p>
                <p className="text-sm">
                  {searchTerm || statusFilter !== 'all' || industryFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add your first client to get started'}
                </p>
              </td>
            </tr>
          ) : (
            filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm">
                        {client.shortName || client.name?.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      {client.shortName && (
                        <div className="text-xs text-gray-500">{client.shortName}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{client.industry || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    {client.email && (
                      <div className="flex items-center gap-1 text-gray-600">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <Phone className="w-3 h-3" />
                        {client.phone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="text-gray-900">{client.paymentTerms || 'Net 30'}</div>
                    <div className="text-xs text-gray-500">{client.currency || 'MYR'}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">{client.totalPOs || 0}</div>
                    {client.totalValue > 0 && (
                      <div className="text-xs text-gray-500">
                        RM {(client.totalValue || 0).toLocaleString()}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={client.status || 'active'} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === client.id ? null : client.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {actionMenuOpen === client.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                        <button
                          onClick={() => handleEdit(client)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Client
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(client.id);
                            setActionMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Client
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  // Grid View
  const GridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredClients.length === 0 ? (
        <div className="col-span-full text-center py-12 text-gray-500">
          <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No clients found</p>
          <p className="text-sm">
            {searchTerm || statusFilter !== 'all' || industryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Add your first client to get started'}
          </p>
        </div>
      ) : (
        filteredClients.map((client) => (
          <div
            key={client.id}
            className="bg-white rounded-lg shadow border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold">
                    {client.shortName || client.name?.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 line-clamp-1">{client.name}</h3>
                  {client.industry && (
                    <p className="text-sm text-gray-500">{client.industry}</p>
                  )}
                </div>
              </div>
              <StatusBadge status={client.status || 'active'} />
            </div>

            <div className="space-y-2 mb-4">
              {client.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.website && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">POs:</span>
                  <span className="font-medium ml-1">{client.totalPOs || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Terms:</span>
                  <span className="font-medium ml-1">{client.paymentTerms || 'Net 30'}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(client)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(client.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // Delete Confirmation Modal
  const DeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;
    const client = clients.find(c => c.id === showDeleteConfirm);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Client</h3>
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete <strong>{client?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(showDeleteConfirm)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-medium">Error loading clients</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-500" />
            Client Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your clients and their business terms
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={handleExport}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              setEditingClient(null);
              setShowModal(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Filters Bar */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients by name, email, or registration number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>

            {/* Industry Filter */}
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Industries</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>

            {/* View Toggle */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm">
          <div className="flex space-x-6">
            <span className="text-gray-500">
              Showing: <span className="font-medium text-gray-900">{filteredClients.length}</span> of {clients.length}
            </span>
            {statusFilter !== 'all' && (
              <span className="text-gray-500">
                Status: <span className="font-medium text-blue-600">{statusFilter}</span>
              </span>
            )}
            {industryFilter !== 'all' && (
              <span className="text-gray-500">
                Industry: <span className="font-medium text-green-600">{industryFilter}</span>
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {viewMode === 'table' ? <TableView /> : <GridView />}
        </div>
      </div>

      {/* Top Clients (Optional Section) */}
      {topClients.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Top Clients by Value
          </h3>
          <div className="space-y-3">
            {topClients.slice(0, 5).map((client, index) => (
              <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.totalPOs || 0} POs</p>
                  </div>
                </div>
                <span className="font-semibold text-gray-900">
                  RM {(client.totalValue || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <ClientModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingClient(null);
        }}
        editingClient={editingClient}
        onSave={handleSaveClient}
        showNotification={showNotification}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmModal />

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </div>
  );
};

export default Clients;
