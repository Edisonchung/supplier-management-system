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
  Clock,
  DollarSign,
  Tag,
  Filter,
  Eye,
  Camera,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Hash,
  Package2,
  ShoppingCart,
  UserPlus
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
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        stored.push({ ...data, id });
        localStorage.setItem(name, JSON.stringify(stored));
        return { id };
      }
    })
  }
};

// Initialize sample data
const initializeSampleData = () => {
  const suppliers = [
    {
      id: '1',
      name: 'HydroTech Solutions',
      email: 'sales@hydrotech.com',
      phone: '+1-555-0123',
      address: '123 Hydraulics Avenue, Industrial District',
      status: 'active',
      dateAdded: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      contactPerson: 'John Smith'
    },
    {
      id: '2',
      name: 'Automation Components Ltd',
      email: 'info@autocomp.com',
      phone: '+1-555-0456',
      address: '456 Automation Drive, Tech Park',
      status: 'active',
      dateAdded: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      contactPerson: 'Sarah Johnson'
    },
    {
      id: '3',
      name: 'Precision Parts Inc',
      email: 'orders@precisionparts.com',
      phone: '+1-555-0789',
      address: '789 Precision Blvd, Manufacturing Zone',
      status: 'pending',
      dateAdded: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      contactPerson: 'Mike Davis'
    }
  ];

  const products = [
    {
      id: '1',
      name: 'PVQ20-A2R-SS1S-10-C21D-11',
      brand: 'Parker',
      supplierId: '1',
      category: 'hydraulics',
      price: 335,
      status: 'complete',
      description: 'Variable displacement piston pump',
      dateAdded: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      sku: 'PKR-PVQ20-001',
      stock: 15,
      minStock: 5,
      photo: '',
      catalog: '',
      notes: ''
    },
    {
      id: '2',
      name: 'DG4V-5-2C-MU-C6-20',
      brand: 'Parker',
      supplierId: '1',
      category: 'hydraulics',
      price: 157,
      status: 'pending',
      description: 'Directional control valve',
      dateAdded: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      sku: 'PKR-DG4V-002',
      stock: 3,
      minStock: 5,
      photo: '',
      catalog: '',
      notes: ''
    },
    {
      id: '3',
      name: '6ES7231-5PF32-0XB0',
      brand: 'Siemens',
      supplierId: '2',
      category: 'electronics',
      price: 267,
      status: 'furnished',
      description: 'Analog input module',
      dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      sku: 'SIE-6ES7-003',
      stock: 25,
      minStock: 10,
      photo: 'https://example.com/photo.jpg',
      catalog: 'https://example.com/catalog.pdf',
      notes: 'High-precision analog module with 8 channels'
    }
  ];

  const purchaseOrders = [
    {
      id: '1',
      poNumber: 'PO-021430',
      client: 'ABC Manufacturing',
      supplier: 'HydroTech Solutions',
      status: 'confirmed',
      deliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      dateCreated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { productId: '1', productName: 'PVQ20-A2R-SS1S-10-C21D-11', quantity: 2, unitPrice: 335, description: '400CON0052' },
        { productId: '2', productName: 'DG4V-5-2C-MU-C6-20', quantity: 1, unitPrice: 157, description: '400CON0053' }
      ],
      totalAmount: 827,
      notes: 'Urgent delivery required'
    },
    {
      id: '2',
      poNumber: 'PO-021431',
      client: 'XYZ Industries',
      supplier: 'Automation Components Ltd',
      status: 'draft',
      deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      dateCreated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { productId: '3', productName: '6ES7231-5PF32-0XB0', quantity: 5, unitPrice: 267, description: 'Control module order' }
      ],
      totalAmount: 1335,
      notes: ''
    }
  ];

  const users = [
    {
      id: '1',
      fullName: 'System Administrator',
      username: 'admin',
      email: 'admin@company.com',
      role: 'admin',
      status: 'active',
      dateCreated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      fullName: 'John Manager',
      username: 'manager',
      email: 'manager@company.com',
      role: 'manager',
      status: 'active',
      dateCreated: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      fullName: 'Jane Employee',
      username: 'employee',
      email: 'employee@company.com',
      role: 'employee',
      status: 'active',
      dateCreated: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      fullName: 'Bob Viewer',
      username: 'viewer',
      email: 'viewer@company.com',
      role: 'viewer',
      status: 'active',
      dateCreated: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  if (!localStorage.getItem('suppliers')) {
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
  }
  if (!localStorage.getItem('products')) {
    localStorage.setItem('products', JSON.stringify(products));
  }
  if (!localStorage.getItem('purchaseOrders')) {
    localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders));
  }
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(users));
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

  const quickLogin = (userEmail) => {
    setEmail(userEmail);
    setPassword('password123');
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm">
          <p className="font-medium text-gray-900 mb-3">Quick Login (Demo):</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => quickLogin('admin@company.com')}
              className="px-3 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors text-xs"
            >
              Admin
            </button>
            <button
              onClick={() => quickLogin('manager@company.com')}
              className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-xs"
            >
              Manager
            </button>
            <button
              onClick={() => quickLogin('employee@company.com')}
              className="px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-xs"
            >
              Employee
            </button>
            <button
              onClick={() => quickLogin('viewer@company.com')}
              className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors text-xs"
            >
              Viewer
            </button>
          </div>
          <p className="text-gray-600 mt-2 text-xs">Password: password123</p>
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
    totalPOs: 0,
    lowStockItems: 0,
    totalValue: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [suppliersSnapshot, productsSnapshot, posSnapshot] = await Promise.all([
        mockFirebase.firestore.collection('suppliers').get(),
        mockFirebase.firestore.collection('products').get(),
        mockFirebase.firestore.collection('purchaseOrders').get()
      ]);

      const suppliers = suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const pos = posSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const lowStockItems = products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length;
      const totalValue = products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0);

      setStats({
        totalSuppliers: suppliers.length,
        totalProducts: products.length,
        pendingProducts: products.filter(p => p.status === 'pending').length,
        totalPOs: pos.length,
        lowStockItems,
        totalValue
      });

      const allItems = [
        ...suppliers.map(s => ({ ...s, type: 'supplier', icon: Building2 })),
        ...products.map(p => ({ ...p, type: 'product', icon: Package })),
        ...pos.map(po => ({ ...po, type: 'purchase_order', icon: FileText }))
      ].sort((a, b) => new Date(b.dateCreated || b.dateAdded) - new Date(a.dateCreated || a.dateAdded))
       .slice(0, 8);

      setRecentActivity(allItems);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue", trend, format = "number" }) => {
    const formatValue = (val) => {
      if (format === "currency") return `$${val.toLocaleString()}`;
      return val.toLocaleString();
    };

    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{formatValue(value)}</p>
            {trend && (
              <div className={`flex items-center mt-2 text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span className="ml-1">{Math.abs(trend)}% from last month</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 bg-${color}-100 rounded-lg flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Suppliers" 
          value={stats.totalSuppliers} 
          icon={Building2} 
          color="blue" 
          trend={12}
        />
        <StatCard 
          title="Total Products" 
          value={stats.totalProducts} 
          icon={Package} 
          color="green" 
          trend={8}
        />
        <StatCard 
          title="Pending Products" 
          value={stats.pendingProducts} 
          icon={Clock} 
          color="yellow" 
          trend={-5}
        />
        <StatCard 
          title="Purchase Orders" 
          value={stats.totalPOs} 
          icon={FileText} 
          color="purple" 
          trend={15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard 
          title="Low Stock Alerts" 
          value={stats.lowStockItems} 
          icon={AlertCircle} 
          color="red"
        />
        <StatCard 
          title="Total Inventory Value" 
          value={stats.totalValue} 
          icon={DollarSign} 
          color="green" 
          format="currency"
        />
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
                      {item.type === 'supplier' && `${item.email} • Contact: ${item.contactPerson || 'N/A'}`}
                      {item.type === 'product' && `$${item.price} • ${item.category} • Stock: ${item.stock || 0}`}
                      {item.type === 'purchase_order' && `${item.client} • ${item.items?.length || 0} items • $${item.totalAmount || 0}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {new Date(item.dateCreated || item.dateAdded).toLocaleDateString()}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active' ? 'bg-green-100 text-green-800' :
                      item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      item.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'draft' ? 'bg-gray-100 text-gray-800' :
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
    status: 'active',
    contactPerson: ''
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
        supplier.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(supplier => supplier.status === statusFilter);
    }
    
    setFilteredSuppliers(filtered);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

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
          dateAdded: new Date().toISOString()
        });
      }
      
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({ name: '', email: '', phone: '', address: '', status: 'active', contactPerson: '' });
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
      phone: supplier.phone || '',
      address: supplier.address || '',
      status: supplier.status,
      contactPerson: supplier.contactPerson || ''
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600 mt-1">Manage supplier information and contacts</p>
        </div>
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
                <div className="flex items-center gap-2">
                  <Mail size={14} />
                  <span>{supplier.email}</span>
                </div>
                {supplier.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.contactPerson && (
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    <span>{supplier.contactPerson}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Added: {new Date(supplier.dateAdded).toLocaleDateString()}</span>
                </div>
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

      {/* Supplier Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    setFormData({ name: '', email: '', phone: '', address: '', status: 'active', contactPerson: '' });
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
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFurnishModal, setShowFurnishModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [furnishingProduct, setFurnishingProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const permissions = usePermissions();

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    supplierId: '',
    category: 'electronics',
    price: '',
    description: '',
    status: 'pending',
    sku: '',
    stock: '',
    minStock: ''
  });

  const [furnishData, setFurnishData] = useState({
    photo: '',
    catalog: '',
    notes: ''
  });

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'hydraulics', label: 'Hydraulics' },
    { value: 'pneumatics', label: 'Pneumatics' },
    { value: 'automation', label: 'Automation' },
    { value: 'sensors', label: 'Sensors' },
    { value: 'cables', label: 'Cables' },
    { value: 'components', label: 'Components' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending Furnishing', color: 'yellow' },
    { value: 'complete', label: 'Complete Info', color: 'blue' },
    { value: 'furnished', label: 'Furnished', color: 'green' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchTerm, categoryFilter, supplierFilter, statusFilter]);

  const loadData = async () => {
    try {
      const [productsSnapshot, suppliersSnapshot] = await Promise.all([
        mockFirebase.firestore.collection('products').get(),
        mockFirebase.firestore.collection('suppliers').get()
      ]);

      const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const suppliersData = suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setProducts(productsData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    if (supplierFilter) {
      filtered = filtered.filter(product => product.supplierId === supplierFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.supplierId || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock) || 0,
        minStock: parseInt(formData.minStock) || 0,
        updatedAt: new Date().toISOString()
      };

      if (editingProduct) {
        await mockFirebase.firestore.collection('products').doc(editingProduct.id).update(productData);
      } else {
        await mockFirebase.firestore.collection('products').add({
          ...productData,
          dateAdded: new Date().toISOString()
        });
      }

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFurnish = (product) => {
    setFurnishingProduct(product);
    setFurnishData({
      photo: product.photo || '',
      catalog: product.catalog || '',
      notes: product.notes || ''
    });
    setShowFurnishModal(true);
  };

  const handleFurnishSubmit = async () => {
    setLoading(true);
    try {
      await mockFirebase.firestore.collection('products').doc(furnishingProduct.id).update({
        ...furnishData,
        status: 'furnished',
        furnishedAt: new Date().toISOString()
      });
      setShowFurnishModal(false);
      setFurnishingProduct(null);
      setFurnishData({ photo: '', catalog: '', notes: '' });
      loadData();
    } catch (error) {
      console.error('Error furnishing product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand || '',
      supplierId: product.supplierId,
      category: product.category,
      price: product.price.toString(),
      description: product.description || '',
      status: product.status,
      sku: product.sku || '',
      stock: product.stock?.toString() || '',
      minStock: product.minStock?.toString() || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await mockFirebase.firestore.collection('products').doc(id).delete();
        loadData();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      supplierId: '',
      category: 'electronics',
      price: '',
      description: '',
      status: 'pending',
      sku: '',
      stock: '',
      minStock: ''
    });
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };

  const getStatusColor = (status) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return statusConfig ? statusConfig.color : 'gray';
  };

  if (!permissions.canViewProducts) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view products.</p>
      </div>
    );
  }

  const stats = {
    totalProducts: products.length,
    pendingProducts: products.filter(p => p.status === 'pending').length,
    lowStockItems: products.filter(p => (p.stock || 0) <= (p.minStock || 0)).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * (p.stock || 0)), 0)
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog and inventory</p>
        </div>
        {permissions.canEditProducts && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Add Product
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Furnishing</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingProducts}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{stats.lowStockItems}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-green-600">
                ${stats.totalValue.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products, SKU, or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600">{product.brand}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  getStatusColor(product.status) === 'green' ? 'bg-green-100 text-green-800' :
                  getStatusColor(product.status) === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                  getStatusColor(product.status) === 'blue' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {statusOptions.find(s => s.value === product.status)?.label || product.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign size={14} />
                  <span className="font-medium">${product.price}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={14} />
                  <span>{getSupplierName(product.supplierId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag size={14} />
                  <span>{categories.find(c => c.value === product.category)?.label}</span>
                </div>
                {product.sku && (
                  <div className="flex items-center gap-2">
                    <Hash size={14} />
                    <span className="font-mono text-xs">{product.sku}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Package2 size={14} />
                  <span className={`font-medium ${(product.stock || 0) <= (product.minStock || 0) ? 'text-red-600' : 'text-green-600'}`}>
                    {product.stock || 0}
                  </span>
                  <span className="text-gray-400">/ {product.minStock || 0} min</span>
                </div>
              </div>

              {permissions.canEditProducts && (
                <div className="flex gap-2">
                  {product.status === 'pending' && (
                    <button
                      onClick={() => handleFurnish(product)}
                      className="flex-1 bg-yellow-100 text-yellow-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors flex items-center justify-center gap-1"
                    >
                      <Camera size={16} />
                      Furnish
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No products found</p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
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
                      Save Product
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                    resetForm();
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

      {/* Furnish Modal */}
      {showFurnishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Furnish Product Details</h3>
              <p className="text-sm text-gray-600 mt-1">{furnishingProduct?.name}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Photo URL</label>
                <input
                  type="url"
                  value={furnishData.photo}
                  onChange={(e) => setFurnishData({ ...furnishData, photo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catalog/Datasheet URL</label>
                <input
                  type="url"
                  value={furnishData.catalog}
                  onChange={(e) => setFurnishData({ ...furnishData, catalog: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={furnishData.notes}
                  onChange={(e) => setFurnishData({ ...furnishData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Additional product information, specifications, etc."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleFurnishSubmit}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Mark as Furnished
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowFurnishModal(false);
                    setFurnishingProduct(null);
                    setFurnishData({ photo: '', catalog: '', notes: '' });
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

// Purchase Orders Component
const PurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [filteredPOs, setFilteredPOs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [loading, setLoading] = useState(false);
  const permissions = usePermissions();

  const [formData, setFormData] = useState({
    poNumber: '',
    client: '',
    supplier: '',
    status: 'draft',
    deliveryDate: '',
    notes: '',
    items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, description: '' }]
  });

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'sent', label: 'Sent', color: 'blue' },
    { value: 'confirmed', label: 'Confirmed', color: 'green' },
    { value: 'delivered', label: 'Delivered', color: 'purple' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPOs();
  }, [purchaseOrders, searchTerm, statusFilter]);

  const loadData = async () => {
    try {
      const [posSnapshot, productsSnapshot] = await Promise.all([
        mockFirebase.firestore.collection('purchaseOrders').get(),
        mockFirebase.firestore.collection('products').get()
      ]);

      const posData = posSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      setPurchaseOrders(posData);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const filterPOs = () => {
    let filtered = purchaseOrders;

    if (searchTerm) {
      filtered = filtered.filter(po =>
        po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        po.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(po => po.status === statusFilter);
    }

    setFilteredPOs(filtered);
  };

  const handleSubmit = async () => {
    if (!formData.poNumber || !formData.client || !formData.deliveryDate) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const poData = {
        ...formData,
        totalAmount,
        updatedAt: new Date().toISOString()
      };

      if (editingPO) {
        await mockFirebase.firestore.collection('purchaseOrders').doc(editingPO.id).update(poData);
      } else {
        await mockFirebase.firestore.collection('purchaseOrders').add({
          ...poData,
          dateCreated: new Date().toISOString()
        });
      }

      setShowModal(false);
      setEditingPO(null);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving purchase order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (po) => {
    setEditingPO(po);
    setFormData({
      poNumber: po.poNumber,
      client: po.client,
      supplier: po.supplier,
      status: po.status,
      deliveryDate: po.deliveryDate ? new Date(po.deliveryDate).toISOString().split('T')[0] : '',
      notes: po.notes || '',
      items: po.items || [{ productId: '', productName: '', quantity: 1, unitPrice: 0, description: '' }]
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await mockFirebase.firestore.collection('purchaseOrders').doc(id).delete();
        loadData();
      } catch (error) {
        console.error('Error deleting purchase order:', error);
      }
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', productName: '', quantity: 1, unitPrice: 0, description: '' }]
    });
  };

  const removeItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].unitPrice = product.price;
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const resetForm = () => {
    setFormData({
      poNumber: '',
      client: '',
      supplier: '',
      status: 'draft',
      deliveryDate: '',
      notes: '',
      items: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, description: '' }]
    });
  };

  const generatePONumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `PO-${year}${month}${day}${random}`;
  };

  if (!permissions.canViewPOs) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-gray-600">You don't have permission to view purchase orders.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage purchase orders and client requests</p>
        </div>
        {permissions.canEditPOs && (
          <button
            onClick={() => {
              setFormData({ ...formData, poNumber: generatePONumber() });
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Create PO
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search PO number, client, or supplier..."
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
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredPOs.map((po) => (
            <div key={po.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{po.poNumber}</h3>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  po.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                  po.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  po.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {statusOptions.find(s => s.value === po.status)?.label || po.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span><strong>Client:</strong> {po.client}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 size={14} />
                  <span><strong>Supplier:</strong> {po.supplier}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShoppingCart size={14} />
                  <span><strong>Items:</strong> {po.items?.length || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} />
                  <span><strong>Total:</strong> ${po.totalAmount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span><strong>Delivery:</strong> {new Date(po.deliveryDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  <span><strong>Created:</strong> {new Date(po.dateCreated).toLocaleDateString()}</span>
                </div>
              </div>

              {permissions.canEditPOs && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(po)}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(po.id)}
                    className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredPOs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No purchase orders found</p>
          </div>
        )}
      </div>

      {/* PO Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
              </h3>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                  <input
                    type="text"
                    value={formData.client}
                    onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date *</label>
                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-900">Order Items</h4>
                  <button
                    onClick={addItem}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                          <select
                            value={item.productId}
                            onChange={(e) => updateItem(index, 'productId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="">Select Product</option>
                            {products.map(product => (
                              <option key={product.id} value={product.id}>{product.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Client part no."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            onClick={() => removeItem(index)}
                            className="w-full bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 size={16} />
                            Remove
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-right">
                        <span className="text-sm font-medium text-gray-700">
                          Total: ${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 text-right border-t border-gray-200 pt-4">
                  <span className="text-lg font-semibold text-gray-900">
                    Grand Total: ${formData.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes or special instructions..."
                />
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
                      Save PO
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingPO(null);
                    resetForm();
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

// Quick Import Component
const QuickImport = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [importData, setImportData] = useState({
    supplierId: '',
    brand: '',
    category: 'electronics',
    autoDetectBrand: true,
    bulkText: ''
  });
  const [loading, setLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const permissions = usePermissions();

  const categories = [
    { value: 'electronics', label: 'Electronics' },
    { value: 'hydraulics', label: 'Hydraulics' },
    { value: 'pneumatics', label: 'Pneumatics' },
    { value: 'automation', label: 'Automation' },
    { value: 'sensors', label: 'Sensors' },
    { value: 'cables', label: 'Cables' },
    { value: 'components', label: 'Components' }
  ];

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const snapshot = await mockFirebase.firestore.collection('suppliers').get();
      const suppliersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const detectBrand = (partNumber) => {
    const brandPatterns = {
      'Siemens': /^(6ES|6SL|6SE|6AG|6AV|6EP|3SB|3SU|3NA|3NC)/i,
      'Parker': /^(PVQ|DG4V|D1VW|D3W|RDM|PGP)/i,
      'Bosch Rexroth': /^(R90|A10|A4V|4WE|4WH|ZDR)/i,
      'Schneider': /^(ATV|LXM|BMH|BSH|VW3)/i,
      'ABB': /^(ACS|ACH|PSTX|S2|S3|S4)/i,
      'Omron': /^(E2E|E3X|CP1|CJ2|NX)/i,
      'Festo': /^(DSBC|ADVU|MFH|CPV|VUVG)/i,
      'SMC': /^(CY1|CDQ|SY|ISE|ZSE)/i
    };
    
    for (const [brand, pattern] of Object.entries(brandPatterns)) {
      if (pattern.test(partNumber)) {
        return brand;
      }
    }
    
    return '';
  };

  const parseProductLine = (line) => {
    line = line.trim();
    
    // Remove leading numbers for table format
    line = line.replace(/^\s*\d+\s+/, '');
    
    // Pattern 1: Table format "ProductName   Qty   Price   Total"
    if (/\s{3,}/.test(line)) {
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p);
      if (parts.length >= 3) {
        const partNumber = parts[0];
        const priceStr = parts.find(p => p.match(/^\d+\.?\d*$/) && parseFloat(p) > 0);
        const price = priceStr ? parseFloat(priceStr) : 0;
        if (partNumber && price > 0) {
          return { partNumber, price };
        }
      }
    }
    
    // Pattern 2: "PartNumber ----$price/unit"
    let match = line.match(/^(.+?)\s*-+\s*\$(\d+(?:\.\d+)?)\s*(?:\/\w+)?$/);
    if (match) {
      return {
        partNumber: match[1].trim(),
        price: parseFloat(match[2])
      };
    }
    
    // Pattern 3: "PartNumber EXW unit price: $price"
    match = line.match(/^(.+?)\s+EXW\s+unit\s+price:\s*\$(\d+(?:\.\d+)?)/i);
    if (match) {
      return {
        partNumber: match[1].trim(),
        price: parseFloat(match[2])
      };
    }
    
    // Pattern 4: "PartNumber $price"
    match = line.match(/^(.+?)\s+\$(\d+(?:\.\d+)?)$/);
    if (match) {
      return {
        partNumber: match[1].trim(),
        price: parseFloat(match[2])
      };
    }
    
    return null;
  };

  const handleImport = async () => {
    if (!importData.supplierId || !importData.category || !importData.bulkText) {
      alert('Please fill in supplier, category, and product list');
      return;
    }

    setLoading(true);
    
    try {
      const lines = importData.bulkText.split('\n').filter(line => line.trim());
      const results = { success: 0, failed: 0, products: [] };
      
      for (const line of lines) {
        const parsed = parseProductLine(line);
        if (parsed) {
          let detectedBrand = importData.brand;
          if (importData.autoDetectBrand && !importData.brand) {
            detectedBrand = detectBrand(parsed.partNumber);
          }
          
          const productData = {
            name: parsed.partNumber,
            brand: detectedBrand || '',
            supplierId: importData.supplierId,
            category: importData.category,
            price: parsed.price,
            status: 'pending',
            description: `Imported: ${line}`,
            dateAdded: new Date().toISOString(),
            sku: '',
            stock: 0,
            minStock: 0
          };
          
          await mockFirebase.firestore.collection('products').add(productData);
          results.success++;
          results.products.push(productData);
        } else {
          results.failed++;
        }
      }
      
      setImportResults(results);
      
      // Clear form
      setImportData({
        supplierId: '',
        brand: '',
        category: 'electronics',
        autoDetectBrand: true,
        bulkText: ''
      });
      
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Error importing products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quick Import</h1>
        <p className="text-gray-600 mt-1">Bulk import products from supplier quotes and data</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Quick Product Import</h2>
          </div>
          
          <p className="text-gray-600 mb-4">
            Quickly import products from supplier quotes. Supports various formats including table data:
          </p>
          
          <div className="bg-gray-100 p-4 rounded-lg mb-6 font-mono text-sm whitespace-pre-line text-gray-700">
{`Examples:
HJ-W50/0.5-P EXW unit price: $212
HJ-W50/0.5-S EXW unit price: $250

PVQ20-A2R-SS1S-10-C21D-11 ----$335/pcs
DG4V-5-2C-MU-C6-20 ----$157/pcs

Table format:
Siemens 6ES7231-5PF32-0XB0    1    267.00    267.00
Siemens 6SL3210-1PE34-8AL0    2    7746.00   15492.00`}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
              <select
                value={importData.supplierId}
                onChange={(e) => setImportData({ ...importData, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={importData.category}
                onChange={(e) => setImportData({ ...importData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand (Optional)</label>
              <input
                type="text"
                value={importData.brand}
                onChange={(e) => setImportData({ ...importData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Siemens, Parker, etc."
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={importData.autoDetectBrand}
                  onChange={(e) => setImportData({ ...importData, autoDetectBrand: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Auto-detect brand from part numbers</span>
              </label>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product List *</label>
            <textarea
              value={importData.bulkText}
              onChange={(e) => setImportData({ ...importData, bulkText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={15}
              placeholder="Paste your product list here..."
              required
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Import Products
                </>
              )}
            </button>
            <button
              onClick={() => setImportData({ ...importData, bulkText: '' })}
              className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {importResults && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-900">Import Results</h3>
            </div>
            <div className="text-sm text-green-800">
              <p>✅ Successfully imported: {importResults.success} products</p>
              {importResults.failed > 0 && <p>❌ Failed to parse: {importResults.failed} lines</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// User Management Component
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const permissions = usePermissions();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'viewer',
    status: 'active'
  });

  const roleOptions = [
    { value: 'admin', label: 'Admin - Full Access', color: 'purple' },
    { value: 'manager', label: 'Manager - Products & Suppliers', color: 'blue' },
    { value: 'employee', label: 'Employee - Products Only', color: 'green' },
    { value: 'viewer', label: 'Viewer - Read Only', color: 'gray' }
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      const snapshot = await mockFirebase.firestore.collection('users').get();
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.username || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      if (editingUser) {
        await mockFirebase.firestore.collection('users').doc(editingUser.id).update({
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Check for duplicate username
        const existingUser = users.find(u => u.username === formData.username);
        if (existingUser) {
          alert('Username already exists');
          setLoading(false);
          return;
        }

        await mockFirebase.firestore.collection('users').add({
          ...formData,
          dateCreated: new Date().toISOString(),
          lastLogin: null
        });
      }

      setShowModal(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await mockFirebase.firestore.collection('users').doc(id).delete();
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      username: '',
      email: '',
      role: 'viewer',
      status: 'active'
    });
  };

  const getRoleColor = (role) => {
    const roleConfig = roleOptions.find(r => r.value === role);
    return roleConfig ? roleConfig.color : 'gray';
  };

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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage user accounts and permissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            {roleOptions.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                </div>
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    getRoleColor(user.role) === 'purple' ? 'bg-purple-100 text-purple-800' :
                    getRoleColor(user.role) === 'blue' ? 'bg-blue-100 text-blue-800' :
                    getRoleColor(user.role) === 'green' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.status === 'active' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <User size={14} />
                  <span>@{user.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span>Created: {new Date(user.dateCreated).toLocaleDateString()}</span>
                </div>
                {user.lastLogin && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    <span>Last login: {new Date(user.lastLogin).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(user)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
                >
                  <Edit size={16} />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(user.id)}
                  className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No users found</p>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add User'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roleOptions.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
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
                      Save User
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    resetForm();
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

// Main App Component
const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeSampleData();
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
    setNotification({ message: 'Logged out successfully', type: 'success' });
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'manager', 'employee', 'viewer'] },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, roles: ['admin', 'manager'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['admin', 'manager', 'employee', 'viewer'] },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText, roles: ['admin', 'manager'] },
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
        {/* Header */}
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

        {/* Navigation Tabs */}
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'suppliers' && <Suppliers />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'purchase-orders' && <PurchaseOrders />}
          {activeTab === 'import' && <QuickImport />}
          {activeTab === 'users' && <UserManagement />}
        </div>

        {/* Notification */}
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
