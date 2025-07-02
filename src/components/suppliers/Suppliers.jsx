// src/components/suppliers/Suppliers.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Building2, Mail, Phone, Globe, 
  Edit2, Trash2, User, MapPin, Package, DollarSign, 
  Star, TrendingUp, Calendar, AlertCircle, CheckCircle,
  X, ChevronDown
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const Suppliers = ({ showNotification }) => {
  const permissions = usePermissions();
  const [suppliers, setSuppliers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    contactPerson: '',
    status: 'active',
    categories: []
  });

  useEffect(() => {
    // Load suppliers from localStorage
    const savedSuppliers = localStorage.getItem('suppliers');
    if (savedSuppliers) {
      const loadedSuppliers = JSON.parse(savedSuppliers);
      // Sanitize loaded data to ensure all properties exist
      const sanitizedSuppliers = loadedSuppliers.map(supplier => ({
        ...supplier,
        totalRevenue: supplier.totalRevenue || 0,
        totalOrders: supplier.totalOrders || 0,
        rating: supplier.rating || 0,
        categories: supplier.categories || [],
        performance: supplier.performance || 'new'
      }));
      setSuppliers(sanitizedSuppliers);
    } else {
      // Sample data with all required properties
      const sampleSuppliers = [
        {
          id: 1,
          name: 'Global Supplies Ltd.',
          email: 'contact@globalsupplies.com',
          phone: '+1 (555) 123-4567',
          website: 'www.globalsupplies.com',
          address: '123 Business Ave, New York, NY 10001',
          contactPerson: 'John Smith',
          status: 'active',
          rating: 4.5,
          totalOrders: 156,
          totalRevenue: 125000,
          joinDate: '2023-01-15',
          lastOrder: '2024-03-10',
          categories: ['Electronics', 'Components'],
          performance: 'excellent'
        },
        {
          id: 2,
          name: 'Acme Corporation',
          email: 'sales@acmecorp.com',
          phone: '+1 (555) 987-6543',
          website: 'www.acmecorp.com',
          address: '456 Industrial Pkwy, Chicago, IL 60601',
          contactPerson: 'Jane Doe',
          status: 'active',
          rating: 4.8,
          totalOrders: 203,
          totalRevenue: 189500,
          joinDate: '2022-11-20',
          lastOrder: '2024-03-12',
          categories: ['Raw Materials', 'Packaging'],
          performance: 'excellent'
        },
        {
          id: 3,
          name: 'Tech Components Inc.',
          email: 'info@techcomponents.com',
          phone: '+1 (555) 246-8135',
          website: 'www.techcomponents.com',
          address: '789 Tech Plaza, San Francisco, CA 94105',
          contactPerson: 'Mike Johnson',
          status: 'pending',
          rating: 0,
          totalOrders: 0,
          totalRevenue: 0,
          joinDate: '2024-03-15',
          lastOrder: null,
          categories: ['Electronics', 'Software'],
          performance: 'new'
        }
      ];
      setSuppliers(sampleSuppliers);
      localStorage.setItem('suppliers', JSON.stringify(sampleSuppliers));
    }
  }, []);

  const handleAddSupplier = () => {
    setSelectedSupplier(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      contactPerson: '',
      status: 'active',
      categories: []
    });
    setShowModal(true);
  };

  const handleEditSupplier = (supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone || '',
      website: supplier.website || '',
      address: supplier.address || '',
      contactPerson: supplier.contactPerson || '',
      status: supplier.status,
      categories: supplier.categories || []
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      const updatedSuppliers = suppliers.filter(s => s.id !== id);
      setSuppliers(updatedSuppliers);
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      showNotification('Supplier deleted successfully', 'success');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedSupplier) {
      // Update existing supplier
      const updatedSuppliers = suppliers.map(s =>
        s.id === selectedSupplier.id
          ? { 
              ...s, 
              ...formData, 
              updatedAt: new Date().toISOString(),
              // Ensure numeric fields maintain their values
              totalRevenue: s.totalRevenue || 0,
              totalOrders: s.totalOrders || 0,
              rating: s.rating || 0
            }
          : s
      );
      setSuppliers(updatedSuppliers);
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      showNotification('Supplier updated successfully', 'success');
    } else {
      // Add new supplier with all required fields
      const newSupplier = {
        id: Date.now(),
        ...formData,
        rating: 0,
        totalOrders: 0,
        totalRevenue: 0,
        joinDate: new Date().toISOString(),
        lastOrder: null,
        performance: 'new'
      };
      const updatedSuppliers = [...suppliers, newSupplier];
      setSuppliers(updatedSuppliers);
      localStorage.setItem('suppliers', JSON.stringify(updatedSuppliers));
      showNotification('Supplier added successfully', 'success');
    }
    setShowModal(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceColor = (performance) => {
    switch (performance) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'average': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-red-600 bg-red-50';
      case 'new': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         supplier.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || supplier.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (!permissions.canViewSuppliers) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Access Restricted</h2>
          <p className="text-gray-500">You don't have permission to view suppliers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Suppliers</h1>
        <p className="text-gray-600">Manage your supplier relationships and track performance</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Suppliers</p>
              <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {suppliers.filter(s => s.status === 'active').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {suppliers.filter(s => s.status === 'pending').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${suppliers.reduce((sum, s) => sum + (s.totalRevenue || 0), 0).toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {permissions.canEditSuppliers && (
            <button
              onClick={handleAddSupplier}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Status
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      )}

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{supplier.name}</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(supplier.status)}`}>
                  {supplier.status}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm font-medium text-gray-700">{supplier.rating || 0}</span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="truncate">{supplier.email}</span>
              </div>
              {supplier.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{supplier.phone}</span>
                </div>
              )}
              {supplier.website && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{supplier.website}</span>
                </div>
              )}
              {supplier.contactPerson && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{supplier.contactPerson}</span>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Orders</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{supplier.totalOrders || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-600">Revenue</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  ${(supplier.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Categories */}
            {supplier.categories && supplier.categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {supplier.categories.map((category, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-lg"
                  >
                    {category}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            {permissions.canEditSuppliers && (
              <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEditSupplier(supplier)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
          <p className="text-gray-500 mb-6">
            {searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first supplier'}
          </p>
          {permissions.canEditSuppliers && !searchQuery && filterStatus === 'all' && (
            <button
              onClick={handleAddSupplier}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Supplier
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <input
                      type="text"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categories
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Electronics', 'Components', 'Raw Materials', 'Packaging', 'Software', 'Services'].map(category => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        const categories = formData.categories || [];
                        if (categories.includes(category)) {
                          setFormData({
                            ...formData,
                            categories: categories.filter(c => c !== category)
                          });
                        } else {
                          setFormData({
                            ...formData,
                            categories: [...categories, category]
                          });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        (formData.categories || []).includes(category)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {selectedSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;
