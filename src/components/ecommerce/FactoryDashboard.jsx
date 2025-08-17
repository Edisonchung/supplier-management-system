// src/components/ecommerce/FactoryDashboard.jsx
// Complete factory management dashboard for HiggsFlow platform
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ShoppingCart,
  FileText,
  TrendingUp,
  CreditCard,
  Package,
  Clock,
  AlertCircle,
  CheckCircle,
  User,
  Settings,
  LogOut,
  Bell,
  Search,
  Download,
  Eye,
  Plus,
  Filter,
  Calendar,
  DollarSign,
  Truck,
  Star,
  Phone,
  Mail,
  MapPin,
  Globe,
  Edit,
  Save,
  X
} from 'lucide-react';

const FactoryDashboard = () => {
  const navigate = useNavigate();
  const mountedRef = useRef(true);

  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [factoryData, setFactoryData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [orders, setOrders] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // Mock factory data (in real app, this would come from Firebase/API)
  const mockFactoryData = {
    id: 'factory_001',
    companyName: 'Advanced Manufacturing Sdn Bhd',
    email: 'procurement@advancedmfg.com',
    phone: '+60 3-1234 5678',
    registrationNumber: 'SSM202301012345',
    industry: 'Electronics',
    establishedYear: 2015,
    address: {
      street: 'No. 123, Jalan Teknologi 2/1',
      city: 'Shah Alam',
      state: 'Selangor',
      postcode: '40000',
      country: 'Malaysia'
    },
    status: {
      accountStatus: 'active',
      verificationStatus: 'verified',
      creditApprovalStatus: 'approved'
    },
    procurement: {
      creditLimit: 500000,
      creditUtilized: 150000,
      totalOrderValue: 2500000,
      orderCount: 156,
      averageOrderValue: 16025
    },
    analytics: {
      lastLoginAt: new Date().toISOString(),
      loginCount: 342,
      totalPageViews: 5678,
      productViewCount: 1234,
      quoteRequestCount: 45
    }
  };

  const mockOrders = [
    {
      id: 'ORD-2025-001',
      orderNumber: 'HF250001',
      date: '2025-01-15',
      status: 'shipped',
      totalAmount: 15750,
      itemCount: 8,
      expectedDelivery: '2025-01-20',
      supplier: 'Industrial Solutions Sdn Bhd'
    },
    {
      id: 'ORD-2025-002',
      orderNumber: 'HF250002',
      date: '2025-01-12',
      status: 'processing',
      totalAmount: 8900,
      itemCount: 3,
      expectedDelivery: '2025-01-25',
      supplier: 'Tech Components Malaysia'
    },
    {
      id: 'ORD-2025-003',
      orderNumber: 'HF250003',
      date: '2025-01-10',
      status: 'delivered',
      totalAmount: 23450,
      itemCount: 12,
      expectedDelivery: '2025-01-18',
      supplier: 'Automation Specialists'
    }
  ];

  const mockQuotes = [
    {
      id: 'QT-2025-001',
      quoteNumber: 'QT25010001',
      date: '2025-01-16',
      status: 'pending',
      itemCount: 5,
      estimatedValue: 12500,
      validUntil: '2025-01-30',
      supplier: 'Premium Industrial Supply'
    },
    {
      id: 'QT-2025-002',
      quoteNumber: 'QT25010002',
      date: '2025-01-14',
      status: 'approved',
      itemCount: 3,
      estimatedValue: 8750,
      validUntil: '2025-01-28',
      supplier: 'Quality Parts Malaysia'
    }
  ];

  // Component cleanup
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Safe state update
  const safeSetState = (setter, value) => {
    if (mountedRef.current) {
      setter(value);
    }
  };

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Simulate API loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (mountedRef.current) {
          safeSetState(setFactoryData, mockFactoryData);
          safeSetState(setOrders, mockOrders);
          safeSetState(setQuotes, mockQuotes);
          safeSetState(setLoading, false);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (mountedRef.current) {
          safeSetState(setLoading, false);
        }
      }
    };

    loadDashboardData();
  }, []);

  // Navigation helpers
  const handleLogout = () => {
    // Clear session data
    localStorage.removeItem('factorySession');
    navigate('/catalog');
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      inactive: 'text-red-600 bg-red-50',
      verified: 'text-green-600 bg-green-50',
      processing: 'text-blue-600 bg-blue-50',
      shipped: 'text-purple-600 bg-purple-50',
      delivered: 'text-green-600 bg-green-50',
      approved: 'text-green-600 bg-green-50'
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {factoryData?.companyName}
                </h1>
                <p className="text-sm text-gray-500">Factory Dashboard</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                  3
                </span>
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/catalog')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  Browse Catalog
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Credit Available</p>
                <p className="text-2xl font-bold text-green-600">
                  RM {(factoryData.procurement.creditLimit - factoryData.procurement.creditUtilized).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              of RM {factoryData.procurement.creditLimit.toLocaleString()} limit
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{factoryData.procurement.orderCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              RM {factoryData.procurement.averageOrderValue.toLocaleString()} avg. value
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Quotes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {quotes.filter(q => q.status === 'pending').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Awaiting response</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold text-purple-600">
                  {orders.filter(o => ['processing', 'shipped'].includes(o.status)).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Truck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">In progress</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'orders', label: 'Orders', icon: Package },
                { id: 'quotes', label: 'Quotes', icon: FileText },
                { id: 'profile', label: 'Company Profile', icon: Building2 },
                { id: 'settings', label: 'Settings', icon: Settings }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View all
                      </button>
                    </div>
                    <div className="space-y-3">
                      {orders.slice(0, 3).map(order => (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{order.orderNumber}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{order.supplier}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">{order.itemCount} items</span>
                            <span className="font-medium">RM {order.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Quotes */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Recent Quotes</h3>
                      <button
                        onClick={() => setActiveTab('quotes')}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        View all
                      </button>
                    </div>
                    <div className="space-y-3">
                      {quotes.slice(0, 3).map(quote => (
                        <div key={quote.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{quote.quoteNumber}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{quote.supplier}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Valid until {quote.validUntil}</span>
                            <span className="font-medium">RM {quote.estimatedValue.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <div>
                        <h4 className="font-medium text-green-900">Account Verified</h4>
                        <p className="text-sm text-green-700">Your factory account is fully verified</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-8 h-8 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-blue-900">Credit Approved</h4>
                        <p className="text-sm text-blue-700">RM {factoryData.procurement.creditLimit.toLocaleString()} credit limit available</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-600" />
                      <div>
                        <h4 className="font-medium text-yellow-900">Premium Support</h4>
                        <p className="text-sm text-yellow-700">Dedicated account manager assigned</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Order History</h3>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search orders..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Filter className="w-4 h-4" />
                      Filter
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Order
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Items
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {orders.map(order => (
                          <tr key={order.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-gray-900">{order.orderNumber}</div>
                                <div className="text-sm text-gray-500">ID: {order.id}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(order.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.supplier}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {order.itemCount} items
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              RM {order.totalAmount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center gap-2">
                                <button className="text-blue-600 hover:text-blue-700">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="text-gray-600 hover:text-gray-700">
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Quotes Tab */}
            {activeTab === 'quotes' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Quote Requests</h3>
                  <button
                    onClick={() => navigate('/quote/request')}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    New Quote Request
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quotes.map(quote => (
                    <div key={quote.id} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">{quote.quoteNumber}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Supplier:</span>
                          <span className="text-gray-900">{quote.supplier}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Items:</span>
                          <span className="text-gray-900">{quote.itemCount} items</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Est. Value:</span>
                          <span className="font-medium text-gray-900">RM {quote.estimatedValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Valid Until:</span>
                          <span className="text-gray-900">{quote.validUntil}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex gap-2">
                          <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                            View Details
                          </button>
                          <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Company Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Company Profile</h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {isEditing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    {isEditing ? 'Save Changes' : 'Edit Profile'}
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Company Information */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Company Information</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              defaultValue={factoryData.companyName}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          ) : (
                            <p className="text-gray-900">{factoryData.companyName}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                          <p className="text-gray-900">{factoryData.registrationNumber}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                          {isEditing ? (
                            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                              <option value="Electronics">Electronics</option>
                              <option value="Manufacturing">Manufacturing</option>
                              <option value="Automotive">Automotive</option>
                            </select>
                          ) : (
                            <p className="text-gray-900">{factoryData.industry}</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Established</label>
                          <p className="text-gray-900">{factoryData.establishedYear}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Contact Information</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            {isEditing ? (
                              <input
                                type="email"
                                defaultValue={factoryData.email}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <p className="text-gray-900">{factoryData.email}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            {isEditing ? (
                              <input
                                type="tel"
                                defaultValue={factoryData.phone}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <p className="text-gray-900">{factoryData.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Address & Business Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Business Address</h4>
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                        <div className="flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <textarea
                                defaultValue={factoryData.address.street}
                                rows="2"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Street address"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  defaultValue={factoryData.address.city}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="City"
                                />
                                <input
                                  type="text"
                                  defaultValue={factoryData.address.postcode}
                                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Postcode"
                                />
                              </div>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                                <option value="Selangor">Selangor</option>
                                <option value="Kuala Lumpur">Kuala Lumpur</option>
                                <option value="Johor">Johor</option>
                              </select>
                            </div>
                          ) : (
                            <div className="text-gray-900">
                              <p>{factoryData.address.street}</p>
                              <p>{factoryData.address.city} {factoryData.address.postcode}</p>
                              <p>{factoryData.address.state}, {factoryData.address.country}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Account Status */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Account Status</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Account Status</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(factoryData.status.accountStatus)}`}>
                            {factoryData.status.accountStatus.charAt(0).toUpperCase() + factoryData.status.accountStatus.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Verification</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(factoryData.status.verificationStatus)}`}>
                            {factoryData.status.verificationStatus.charAt(0).toUpperCase() + factoryData.status.verificationStatus.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Credit Approval</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(factoryData.status.creditApprovalStatus)}`}>
                            {factoryData.status.creditApprovalStatus.charAt(0).toUpperCase() + factoryData.status.creditApprovalStatus.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Procurement Statistics */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Procurement Summary</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Order Value</span>
                          <span className="font-medium text-gray-900">RM {factoryData.procurement.totalOrderValue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Total Orders</span>
                          <span className="font-medium text-gray-900">{factoryData.procurement.orderCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Average Order Value</span>
                          <span className="font-medium text-gray-900">RM {factoryData.procurement.averageOrderValue.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Credit Utilization</span>
                          <span className="font-medium text-gray-900">
                            {((factoryData.procurement.creditUtilized / factoryData.procurement.creditLimit) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Notification Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Notification Preferences</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'email_orders', label: 'Order updates via email', checked: true },
                        { id: 'sms_urgent', label: 'Urgent notifications via SMS', checked: false },
                        { id: 'email_quotes', label: 'Quote responses via email', checked: true },
                        { id: 'email_newsletter', label: 'Newsletter and promotions', checked: true },
                        { id: 'whatsapp_updates', label: 'Order updates via WhatsApp', checked: true }
                      ].map(setting => (
                        <label key={setting.id} className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            defaultChecked={setting.checked}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{setting.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Security Settings */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">Security</h4>
                    <div className="space-y-3">
                      <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Change Password</p>
                            <p className="text-sm text-gray-600">Update your account password</p>
                          </div>
                          <Edit className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                      
                      <button className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                            <p className="text-sm text-gray-600">Add extra security to your account</p>
                          </div>
                          <span className="text-sm text-yellow-600">Not enabled</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-md font-medium text-red-900 mb-4">Danger Zone</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-red-900">Deactivate Account</p>
                        <p className="text-sm text-red-700 mb-3">
                          Once you deactivate your account, you will lose access to all services. This action cannot be undone.
                        </p>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
                          Deactivate Account
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactoryDashboard;
