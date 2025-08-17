// src/components/ecommerce/FactoryDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShoppingCart, 
  FileText, 
  Settings, 
  Package, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Truck,
  Users,
  BarChart3,
  Eye,
  Plus,
  Download,
  Phone,
  Mail,
  Bell
} from 'lucide-react';

const FactoryDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    profile: {
      companyName: 'Advanced Manufacturing Sdn Bhd',
      contactPerson: 'Ahmad Rahman',
      email: 'ahmad@advancedmfg.com',
      accountType: 'Premium Factory',
      joinDate: '2024-01-15'
    },
    orders: {
      total: 156,
      pending: 8,
      processing: 12,
      completed: 136,
      totalValue: 2850000
    },
    quotes: {
      active: 5,
      pending: 3,
      approved: 45,
      rejected: 2
    },
    analytics: {
      monthlySpend: 485000,
      averageOrderValue: 18750,
      topCategory: 'Steel Products',
      creditUtilization: 65
    }
  });

  const [recentOrders] = useState([
    {
      id: 'PO-2024-1234',
      date: '2024-08-15',
      status: 'processing',
      value: 125000,
      items: 15,
      supplier: 'Steel Components Malaysia'
    },
    {
      id: 'PO-2024-1233',
      date: '2024-08-12',
      status: 'completed',
      value: 89500,
      items: 8,
      supplier: 'Precision Engineering'
    },
    {
      id: 'PO-2024-1232',
      date: '2024-08-10',
      status: 'pending',
      value: 67800,
      items: 12,
      supplier: 'Industrial Solutions'
    }
  ]);

  const [recentQuotes] = useState([
    {
      id: 'QT-2024-567',
      date: '2024-08-16',
      status: 'pending',
      value: 145000,
      items: 8,
      description: 'Hydraulic Components'
    },
    {
      id: 'QT-2024-566',
      date: '2024-08-14',
      status: 'approved',
      value: 78500,
      items: 5,
      description: 'Steel Pipes & Fittings'
    }
  ]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'text-green-700 bg-green-100';
      case 'processing':
        return 'text-blue-700 bg-blue-100';
      case 'pending':
        return 'text-orange-700 bg-orange-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Factory Dashboard</h1>
              <p className="text-gray-600">Welcome back, {dashboardData.profile.contactPerson}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/catalog')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Browse Catalog
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
              <button
                onClick={() => alert('Settings coming soon!')}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.orders.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              +12% from last month
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Spend</p>
                <p className="text-2xl font-bold text-gray-900">
                  RM {(dashboardData.analytics.monthlySpend / 1000).toFixed(0)}K
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              +8% from last month
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Quotes</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.quotes.active}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              {dashboardData.quotes.pending} pending review
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credit Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.analytics.creditUtilization}%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 text-sm text-orange-600">
              RM 350K available
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Orders */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                  <button
                    onClick={() => alert('Order history coming soon!')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.status)}
                            <h3 className="font-medium text-gray-900">{order.id}</h3>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {order.supplier} • {order.items} items
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          RM {(order.value / 1000).toFixed(0)}K
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions & Account Info */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/quote/request')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <Plus className="w-5 h-5 text-blue-600" />
                  <span>Request New Quote</span>
                </button>
                
                <button
                  onClick={() => navigate('/catalog')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <Eye className="w-5 h-5 text-green-600" />
                  <span>Browse Products</span>
                </button>
                
                <button
                  onClick={() => alert('Reports coming soon!')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span>View Reports</span>
                </button>
                
                <button
                  onClick={() => alert('Support coming soon!')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg"
                >
                  <Phone className="w-5 h-5 text-orange-600" />
                  <span>Contact Support</span>
                </button>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Company</p>
                  <p className="text-gray-900">{dashboardData.profile.companyName}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Account Type</p>
                  <p className="text-gray-900">{dashboardData.profile.accountType}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Member Since</p>
                  <p className="text-gray-900">
                    {new Date(dashboardData.profile.joinDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600">Contact</p>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{dashboardData.profile.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Quotes */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Quotes</h3>
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{quote.id}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(quote.status)}`}>
                        {quote.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{quote.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{quote.items} items</span>
                      <span>RM {(quote.value / 1000).toFixed(0)}K</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactoryDashboard;
