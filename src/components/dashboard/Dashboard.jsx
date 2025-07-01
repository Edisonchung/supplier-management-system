import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Building2,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  ArrowRight,
  BarChart3,
  Calendar,
  Bell
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import StatCard from './StatCard';
import { mockFirebase } from '../../services/firebase';

const Dashboard = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [stats, setStats] = useState({
    suppliers: { total: 0, active: 0 },
    products: { total: 0, inStock: 0 },
    purchaseOrders: { total: 0, pending: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load suppliers data
      const suppliersSnapshot = await mockFirebase.firestore.collection('suppliers').get();
      const suppliers = suppliersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load products data
      const productsSnapshot = await mockFirebase.firestore.collection('products').get();
      const products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Load purchase orders data
      const poSnapshot = await mockFirebase.firestore.collection('purchaseOrders').get();
      const purchaseOrders = poSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats
      setStats({
        suppliers: {
          total: suppliers.length,
          active: suppliers.filter(s => s.status === 'active').length
        },
        products: {
          total: products.length,
          inStock: products.filter(p => (p.stock || 0) > 0).length
        },
        purchaseOrders: {
          total: purchaseOrders.length,
          pending: purchaseOrders.filter(po => po.status === 'pending').length
        }
      });

      // Generate recent activity
      const activities = [
        { id: 1, type: 'supplier', action: 'added', item: 'TechCorp Solutions', time: '2 hours ago', icon: Building2 },
        { id: 2, type: 'product', action: 'updated', item: 'ARM Processor A15', time: '4 hours ago', icon: Package },
        { id: 3, type: 'order', action: 'created', item: 'PO-240701', time: '6 hours ago', icon: ShoppingCart },
        { id: 4, type: 'supplier', action: 'approved', item: 'GlobalTech Inc', time: '1 day ago', icon: CheckCircle },
        { id: 5, type: 'product', action: 'restocked', item: 'Sensor Module XZ', time: '2 days ago', icon: Package }
      ];
      setRecentActivity(activities);
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const quickActions = [
    { 
      label: 'Add Supplier', 
      icon: Building2, 
      color: 'bg-blue-500 hover:bg-blue-600', 
      action: () => console.log('Add supplier'),
      permission: permissions.canEditSuppliers
    },
    { 
      label: 'Add Product', 
      icon: Package, 
      color: 'bg-green-500 hover:bg-green-600', 
      action: () => console.log('Add product'),
      permission: permissions.canEditProducts
    },
    { 
      label: 'Create PO', 
      icon: ShoppingCart, 
      color: 'bg-purple-500 hover:bg-purple-600', 
      action: () => console.log('Create PO'),
      permission: permissions.canEditPurchaseOrders
    },
    { 
      label: 'Import Data', 
      icon: Plus, 
      color: 'bg-orange-500 hover:bg-orange-600', 
      action: () => console.log('Import data'),
      permission: permissions.canEditProducts
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {getGreeting()}, {user.displayName}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              Here's what's happening with your business today.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white/10 rounded-lg p-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Suppliers"
          value={stats.suppliers.total}
          subtitle={`${stats.suppliers.active} active partnerships`}
          icon={Building2}
          color="blue"
          trend={12}
        />
        <StatCard
          title="Product Catalog"
          value={stats.products.total}
          subtitle={`${stats.products.inStock} items in stock`}
          icon={Package}
          color="green"
          trend={8}
        />
        <StatCard
          title="Pending Items"
          value={stats.purchaseOrders.pending}
          subtitle="Awaiting completion"
          icon={Clock}
          color="orange"
          trend={-5}
        />
        <StatCard
          title="Purchase Orders"
          value={stats.purchaseOrders.total}
          subtitle="This month"
          icon={ShoppingCart}
          color="purple"
          trend={15}
        />
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              {quickActions.filter(action => action.permission).map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className={`w-full ${action.color} text-white p-4 rounded-xl flex items-center gap-3 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl`}
                >
                  <action.icon className="w-5 h-5" />
                  <span className="font-medium">{action.label}</span>
                  <ArrowRight className="w-4 h-4 ml-auto" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-500" />
                Recent Activity
              </h3>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <activity.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.item}</span> was {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Performance Overview
          </h3>
          <select className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>Last 3 months</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Supplier Performance</h4>
            <p className="text-2xl font-bold text-green-600 mt-2">94%</p>
            <p className="text-sm text-gray-500">On-time delivery rate</p>
          </div>
          
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Inventory Health</h4>
            <p className="text-2xl font-bold text-blue-600 mt-2">87%</p>
            <p className="text-sm text-gray-500">Items in stock</p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-xl">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Order Efficiency</h4>
            <p className="text-2xl font-bold text-purple-600 mt-2">92%</p>
            <p className="text-sm text-gray-500">Processing time</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
