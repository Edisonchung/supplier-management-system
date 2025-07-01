import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  User, 
  Building2, 
  Package, 
  Upload, 
  FileText, 
  Users, 
  BarChart3, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  LogOut,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

// Mock Firebase Functions
const mockFirebase = {
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: async (email, password) => {
      const users = [
        { uid: '1', email: 'admin@company.com', role: 'admin', displayName: 'System Administrator' },
        { uid: '2', email: 'manager@company.com', role: 'manager', displayName: 'John Manager' },
        { uid: '3', email: 'employee@company.com', role: 'employee', displayName: 'Jane Employee' },
        { uid: '4', email: 'viewer@company.com', role: 'viewer', displayName: 'Bob Viewer' }
      ];
      
      const user = users.find(u => u.email === email);
      if (user && password === 'password123') {
        mockFirebase.auth.currentUser = user;
        return { user };
      }
      throw new Error('Invalid credentials');
    },
    signOut: async () => {
      mockFirebase.auth.currentUser = null;
    }
  },
  firestore: {
    collection: (name) => ({
      doc: (id) => ({
        set: async (data) => {
          const stored = JSON.parse(localStorage.getItem(name) || '[]');
          const index = stored.findIndex(item => item.id === id);
          if (index >= 0) {
            stored[index] = { ...data, id };
          } else {
            stored.push({ ...data, id });
          }
          localStorage.setItem(name, JSON.stringify(stored));
        },
        update: async (data) => {
          const stored = JSON.parse(localStorage.getItem(name) || '[]');
          const index = stored.findIndex(item => item.id === id);
          if (index >= 0) {
            stored[index] = { ...stored[index], ...data };
            localStorage.setItem(name, JSON.stringify(stored));
          }
        },
        delete: async () => {
          const stored = JSON.parse(localStorage.getItem(name) || '[]');
          const filtered = stored.filter(item => item.id !== id);
          localStorage.setItem(name, JSON.stringify(filtered));
        }
      }),
      get: async () => ({
        docs: JSON.parse(localStorage.getItem(name) || '[]').map(item => ({
          id: item.id,
          data: () => item
        }))
      }),
      add: async (data) => {
        const stored = JSON.parse(localStorage.getItem(name) || '[]');
        const id = Date.now().toString();
        stored.push({ ...data, id });
        localStorage.setItem(name, JSON.stringify(stored));
        return { id };
      }
    })
  }
};

// Context for Authentication
const AuthContext = createContext(null);

// Role-based permissions
const PERMISSIONS = {
  admin: {
    canViewSuppliers: true,
    canEditSuppliers: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewPOs: true,
    canEditPOs: true,
    canImport: true,
    canOnboard: true,
    canManageUsers: true
  },
  manager: {
    canViewSuppliers: true,
    canEditSuppliers: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewPOs: true,
    canEditPOs: true,
    canImport: true,
    canOnboard: true,
    canManageUsers: false
  },
  employee: {
    canViewSuppliers: false,
    canEditSuppliers: false,
    canViewProducts: true,
    canEditProducts: true,
    canViewPOs: false,
    canEditPOs: false,
    canImport: true,
    canOnboard: false,
    canManageUsers: false
  },
  viewer: {
    canViewSuppliers: false,
    canEditSuppliers: false,
    canViewProducts: true,
    canEditProducts: false,
    canViewPOs: false,
    canEditPOs: false,
    canImport: false,
    canOnboard: false,
    canManageUsers: false
  }
};

// Custom Hook for Permissions
const usePermissions = () => {
  const { user } = useContext(AuthContext);
  return PERMISSIONS[user?.role] || {};
};

// Notification Component
const Notification = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const Icon = type === 'success' ? CheckCircle : AlertCircle;

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-2`}>
      <Icon size={20} />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2">
        <X size={16} />
      </button>
    </div>
  );
};

// Login Component
const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-gray-600 mt-2">Sign in to your account</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
          <p className="font-medium text-gray-900 mb-2">Demo Accounts:</p>
          <div className="space-y-1 text-gray-600">
            <p>Admin: admin@company.com / password123</p>
            <p>Manager: manager@company.com / password123</p>
            <p>Employee: employee@company.com / password123</p>
            <p>Viewer: viewer@company.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalProducts: 0,
    pendingProducts: 0,
    totalPOs: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const suppliersSnapshot = await mockFirebase.firestore.collection('suppliers').get();
      const productsSnapshot = await mockFirebase.firestore.collection('products').get();
      const posSnapshot = await mockFirebase.firestore.collection('purchaseOrders').get();

      const suppliers = suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pos = posSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setStats({
        totalSuppliers: suppliers.length,
        totalProducts: products.length,
        pendingProducts: products.filter(p => p.status === 'pending').length,
        totalPOs: pos.length
      });

      const allItems = [
        ...suppliers.map(s => ({ ...s, type: 'supplier', icon: Building2 })),
        ...products.map(p => ({ ...p, type: 'product', icon: Package })),
        ...pos.map(po => ({ ...po, type: 'purchase_order', icon: FileText }))
      ].sort((a, b) => new Date(b.createdAt || b.dateAdded) - new Date(a.createdAt || a.dateAdded))
       .slice(0, 6);

      setRecentActivity(allItems);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue" }) => (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Suppliers" value={stats.totalSuppliers} icon={Building2} color="blue" />
        <StatCard title="Total Products" value={stats.totalProducts} icon={Package} color="green" />
        <StatCard title="Pending Products" value={stats.pendingProducts} icon={Clock} color="yellow" />
        <StatCard title="Purchase Orders" value={stats.totalPOs} icon={FileText} color="purple" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentActivity.length > 0 ? (
            recentActivity.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name || item.poNumber}</p>
                    <p className="text-sm text-gray-600">
                      {item.type === 'supplier' && `Email: ${item.email}`}
                      {item.type === 'product' && `Price: $${item.price} • ${item.category}`}
                      {item.type === 'purchase_order' && `Client: ${item.client}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(item.createdAt || item.dateAdded).toLocaleDateString()}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active' ? 'bg-green-100 text-green-800' :
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status || 'active'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No recent activity to display</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Suppliers Component
const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const permissions = usePermissions();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    status: 'active'
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchTerm, statusFilter]);

  const loadSuppliers = async () => {
    try {
      const snapshot = await mockFirebase.firestore.collection('suppliers').get();
      const suppliersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const filterSuppliers = () => {
    let filtered = suppliers;
    
    if (searchTerm) {
      filtered = filtered.filter(supplier => 
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }
    
    setFilteredSuppliers(filtered);
  };

  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      if (editingSupplier) {
        await mockFirebase.firestore.collection('suppliers').doc(editingSupplier.id).update({
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await mockFirebase.firestore.collection('suppliers').add({
          ...formData,
          createdAt: new Date().toISOString(),
          dateAdded: new Date().toISOString()
        });
      }
      
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({ name: '', email: '', phone: '', address: '', status: 'active' });
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      status: supplier.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await mockFirebase.firestore.collection('suppliers').doc(id).delete();
        loadSuppliers();
      } catch (error) {
        console.error('Error deleting supplier:', error);
      }
    }
  };

  if (!permissions.canViewSuppliers) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view suppliers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        {permissions.canEditSuppliers && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Add Supplier
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  supplier.status === 'active' ? 'bg-green-100 text-green-800' :
                  supplier.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {supplier.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>📧 {supplier.email}</p>
                <p>📞 {supplier.phone}</p>
                {supplier.address && <p>📍 {supplier.address}</p>}
                <p>📅 Added: {new Date(supplier.dateAdded).toLocaleDateString()}</p>
              </div>

              {permissions.canEditSuppliers && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(supplier)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSuppliers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No suppliers found</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
                    setFormData({ name: '', email: '', phone: '', address: '', status: 'active' });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Products Component
const Products = () => {
  const permissions = usePermissions();
  
  if (!permissions.canViewProducts) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view products.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {permissions.canEditProducts && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Plus size={20} />
            Add Product
          </button>
        )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Products Management</h3>
        <p className="text-gray-600">Product management features will be implemented here</p>
      </div>
    </div>
  );
};

// Quick Import Component
const QuickImport = () => {
  const permissions = usePermissions();
  
  if (!permissions.canImport) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to import data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Quick Import</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Bulk Import</h3>
        <p className="text-gray-600">Import products from supplier quotes and CSV files</p>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = () => {
  const permissions = usePermissions();
  
  if (!permissions.canManageUsers) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to manage users.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus size={20} />
          Add User
        </button>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
        <p className="text-gray-600">Manage user accounts and permissions</p>
      </div>
    </div>
  );
};

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const result = await mockFirebase.auth.signInWithEmailAndPassword(email, password);
      setUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      setNotification({ message: `Welcome back, ${result.user.displayName}!`, type: 'success' });
    } catch (error) {
      throw error;
    }
  };

  const handleLogout = async () => {
    await mockFirebase.auth.signOut();
    setUser(null);
    localStorage.removeItem('currentUser');
    setActiveTab('dashboard');
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'manager', 'employee', 'viewer'] },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, roles: ['admin', 'manager'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['admin', 'manager', 'employee', 'viewer'] },
    { id: 'import', label: 'Quick Import', icon: Upload, roles: ['admin', 'manager', 'employee'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const allowedTabs = tabs.filter(tab => tab.roles.includes(user.role));

  return (
    <AuthContext.Provider value={{ user, permissions: PERMISSIONS[user.role] }}>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">Supplier Management</h1>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 transition-colors"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'import' && <QuickImport />}
          {activeTab === 'users' && <UserManagement />}
        </div>

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </AuthContext.Provider>
  );
};

export default App;