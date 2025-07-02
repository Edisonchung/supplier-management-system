// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, Package, FileText, Users, TrendingUp, 
  ArrowUp, ArrowDown, Activity, DollarSign, ShoppingCart,
  Clock, CheckCircle, AlertCircle, MoreVertical,
  BarChart3, PieChart, Calendar, Filter
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const Dashboard = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [animatedValues, setAnimatedValues] = useState({
    suppliers: 0,
    products: 0,
    orders: 0,
    revenue: 0
  });

  const stats = [
    {
      title: 'Total Suppliers',
      value: 156,
      change: 12,
      trend: 'up',
      icon: Building2,
      color: 'from-violet-600 to-indigo-600',
      bgColor: 'bg-violet-50',
      description: 'Active partnerships'
    },
    {
      title: 'Products',
      value: 3842,
      change: 8,
      trend: 'up',
      icon: Package,
      color: 'from-blue-600 to-cyan-600',
      bgColor: 'bg-blue-50',
      description: 'In inventory'
    },
    {
      title: 'Purchase Orders',
      value: 428,
      change: -3,
      trend: 'down',
      icon: FileText,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'bg-emerald-50',
      description: 'This month'
    },
    {
      title: 'Revenue',
      value: 284750,
      change: 23,
      trend: 'up',
      icon: DollarSign,
      color: 'from-amber-600 to-orange-600',
      bgColor: 'bg-amber-50',
      description: 'Monthly total',
      prefix: '$'
    }
  ];

  const recentActivity = [
    { id: 1, type: 'order', message: 'New order #4821 from Acme Corp', time: '5 minutes ago', status: 'new' },
    { id: 2, type: 'supplier', message: 'Global Supplies Ltd. updated their catalog', time: '1 hour ago', status: 'update' },
    { id: 3, type: 'product', message: 'Low stock alert: Industrial Sensors', time: '2 hours ago', status: 'warning' },
    { id: 4, type: 'order', message: 'Order #4819 delivered successfully', time: '3 hours ago', status: 'complete' },
    { id: 5, type: 'supplier', message: 'New supplier registration: Tech Parts Inc.', time: '5 hours ago', status: 'new' }
  ];

  const topSuppliers = [
    { name: 'Global Supplies Ltd.', orders: 89, revenue: 45200, growth: 12 },
    { name: 'Acme Corporation', orders: 76, revenue: 38900, growth: 8 },
    { name: 'Industrial Parts Co.', orders: 64, revenue: 32100, growth: -3 },
    { name: 'Tech Components Inc.', orders: 58, revenue: 29800, growth: 15 },
    { name: 'Quality Materials Ltd.', orders: 52, revenue: 26400, growth: 5 }
  ];

  useEffect(() => {
    // Animate numbers on mount
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setAnimatedValues({
        suppliers: Math.floor(156 * progress),
        products: Math.floor(3842 * progress),
        orders: Math.floor(428 * progress),
        revenue: Math.floor(284750 * progress)
      });

      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'order': return ShoppingCart;
      case 'supplier': return Building2;
      case 'product': return Package;
      default: return Activity;
    }
  };

  const getActivityColor = (status) => {
    switch (status) {
      case 'new': return 'text-blue-600 bg-blue-100';
      case 'update': return 'text-purple-600 bg-purple-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'complete': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (!permissions.canViewDashboard) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">You don't have permission to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user?.displayName}! Here's what's happening with your business today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {['day', 'week', 'month', 'year'].map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedPeriod === period
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
            <button className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200">
              <Filter className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const animatedValue = index === 0 ? animatedValues.suppliers :
                               index === 1 ? animatedValues.products :
                               index === 2 ? animatedValues.orders :
                               animatedValues.revenue;
          
          return (
            <div key={index} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{stat.title}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold text-gray-900">
                    {stat.prefix}{animatedValue.toLocaleString()}
                  </h3>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(stat.change)}%
                  </div>
                </div>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>

              {/* Mini chart placeholder */}
              <div className="mt-4 h-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg overflow-hidden relative">
                <div className="absolute inset-0 flex items-end justify-around p-1">
                  {[40, 65, 45, 70, 55, 80, 60].map((height, i) => (
                    <div
                      key={i}
                      className={`w-1.5 bg-gradient-to-t ${stat.color} rounded-t opacity-60`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</button>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const colorClass = getActivityColor(activity.status);
              
              return (
                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{activity.message}</p>
                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {activity.time}
                    </p>
                  </div>
                  {activity.status === 'new' && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">New</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Top Suppliers</h2>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <div className="space-y-4">
            {topSuppliers.map((supplier, index) => (
              <div key={index} className="p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{supplier.name}</h3>
                  <span className={`text-sm font-medium flex items-center gap-1 ${
                    supplier.growth > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {supplier.growth > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {Math.abs(supplier.growth)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>{supplier.orders} orders</span>
                  <span className="font-medium">${supplier.revenue.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full transition-all duration-1000"
                    style={{ width: `${(supplier.revenue / 45200) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
