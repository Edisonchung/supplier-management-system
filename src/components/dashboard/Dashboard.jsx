// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, Package, FileText, Users, TrendingUp, 
  ArrowUp, ArrowDown, Activity, DollarSign, ShoppingCart,
  Clock, CheckCircle, AlertCircle, Target, Zap, 
  TrendingDown, Calendar, BarChart3, PieChart
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const Dashboard = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const [timeRange, setTimeRange] = useState('30d');
  
  // Enhanced stats with more procurement-focused metrics
  const stats = [
    {
      title: 'Active Suppliers',
      value: 156,
      change: 12,
      trend: 'up',
      icon: Building2,
      color: 'from-violet-600 to-indigo-600',
      bgColor: 'bg-violet-50',
      description: 'Verified partnerships',
      target: 180,
      priority: 'high'
    },
    {
      title: 'Products in Catalog',
      value: 3842,
      change: 8,
      trend: 'up',
      icon: Package,
      color: 'from-blue-600 to-cyan-600',
      bgColor: 'bg-blue-50',
      description: 'Available inventory',
      target: 4000,
      priority: 'medium'
    },
    {
      title: 'Active POs',
      value: 428,
      change: -3,
      trend: 'down',
      icon: FileText,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'bg-emerald-50',
      description: 'In progress',
      target: 500,
      priority: 'medium'
    },
    {
      title: 'Monthly Revenue',
      value: 284750,
      change: 23,
      trend: 'up',
      icon: DollarSign,
      color: 'from-amber-600 to-orange-600',
      bgColor: 'bg-amber-50',
      description: 'Current month',
      prefix: '$',
      target: 300000,
      priority: 'high'
    },
    {
      title: 'Sourcing Accuracy',
      value: 87,
      change: 5,
      trend: 'up',
      icon: Target,
      color: 'from-green-600 to-emerald-600',
      bgColor: 'bg-green-50',
      description: 'AI matching rate',
      suffix: '%',
      target: 90,
      priority: 'high'
    },
    {
      title: 'Cost Savings',
      value: 42300,
      change: 18,
      trend: 'up',
      icon: TrendingDown,
      color: 'from-purple-600 to-pink-600',
      bgColor: 'bg-purple-50',
      description: 'This quarter',
      prefix: '$',
      target: 50000,
      priority: 'high'
    },
    {
      title: 'Pending Deliveries',
      value: 73,
      change: -8,
      trend: 'down',
      icon: Clock,
      color: 'from-orange-600 to-red-600',
      bgColor: 'bg-orange-50',
      description: 'Awaiting arrival',
      target: 50,
      priority: 'medium'
    },
    {
      title: 'Client POs Sourcing',
      value: 24,
      change: 15,
      trend: 'up',
      icon: Zap,
      color: 'from-cyan-600 to-blue-600',
      bgColor: 'bg-cyan-50',
      description: 'Need supplier matching',
      target: 0,
      priority: 'high'
    }
  ];

  const recentActivity = [
    { 
      id: 1, 
      type: 'client_po', 
      message: 'New Client PO #CP-2025-001 imported - 8 items need sourcing', 
      time: '3 minutes ago', 
      status: 'sourcing',
      priority: 'high'
    },
    { 
      id: 2, 
      type: 'supplier_match', 
      message: 'AI found 94% match for LCD Display components', 
      time: '12 minutes ago', 
      status: 'success',
      priority: 'medium'
    },
    { 
      id: 3, 
      type: 'delivery', 
      message: 'Delivery completed: PO #4821 - Stock updated automatically', 
      time: '45 minutes ago', 
      status: 'complete',
      priority: 'low'
    },
    { 
      id: 4, 
      type: 'supplier', 
      message: 'TechParts Asia updated 156 product prices', 
      time: '1 hour ago', 
      status: 'update',
      priority: 'medium'
    },
    { 
      id: 5, 
      type: 'stock_alert', 
      message: 'Critical: Industrial Sensors below minimum threshold', 
      time: '2 hours ago', 
      status: 'warning',
      priority: 'high'
    },
    { 
      id: 6, 
      type: 'cost_saving', 
      message: 'Supplier optimization saved $2,340 on recent PO', 
      time: '3 hours ago', 
      status: 'success',
      priority: 'medium'
    }
  ];

  const urgentTasks = [
    {
      id: 1,
      title: 'Review Client PO Sourcing',
      description: '24 client POs waiting for supplier matching',
      priority: 'high',
      dueTime: 'Today',
      action: 'sourcing'
    },
    {
      id: 2,
      title: 'Low Stock Items',
      description: '12 products below minimum inventory levels',
      priority: 'high',
      dueTime: 'Today',
      action: 'procurement'
    },
    {
      id: 3,
      title: 'Pending Approvals',
      description: '8 POs awaiting manager approval',
      priority: 'medium',
      dueTime: 'Tomorrow',
      action: 'approval'
    },
    {
      id: 4,
      title: 'Delivery Confirmations',
      description: '5 deliveries need status confirmation',
      priority: 'medium',
      dueTime: 'This week',
      action: 'delivery'
    }
  ];

  const procurementMetrics = [
    { label: 'Avg PO Processing Time', value: '2.3 days', trend: 'down', good: true },
    { label: 'Supplier Response Rate', value: '94%', trend: 'up', good: true },
    { label: 'On-time Delivery Rate', value: '89%', trend: 'up', good: true },
    { label: 'Cost Variance', value: '+3.2%', trend: 'up', good: false }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'sourcing': return 'bg-blue-500';
      case 'success': return 'bg-green-500';
      case 'complete': return 'bg-gray-500';
      case 'update': return 'bg-cyan-500';
      case 'warning': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.fullName || user?.email || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your procurement dashboard overview for today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const progress = stat.target ? (stat.value / stat.target) * 100 : 0;
          
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 text-${stat.color.split('-')[1]}-600`} />
                </div>
                <div className="flex items-center gap-2">
                  {stat.priority === 'high' && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                    {Math.abs(stat.change)}%
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.prefix}{stat.value.toLocaleString()}{stat.suffix}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                {stat.target && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress to target</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full bg-gradient-to-r ${stat.color}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Urgent Tasks</h2>
              <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                {urgentTasks.filter(t => t.priority === 'high').length}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {urgentTasks.map((task) => (
                <div key={task.id} className={`p-3 rounded-lg border ${getPriorityColor(task.priority)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{task.title}</h4>
                      <p className="text-xs mt-1 opacity-80">{task.description}</p>
                      <p className="text-xs mt-2 font-medium">{task.dueTime}</p>
                    </div>
                    <button className="ml-2 px-2 py-1 bg-white border border-current rounded text-xs hover:bg-gray-50">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              <button className="text-sm text-violet-600 hover:text-violet-700">View all</button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(activity.status)}`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      {activity.priority === 'high' && (
                        <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          High
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Procurement Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hover:border-violet-300">
                <Zap className="h-6 w-6 text-violet-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">AI Sourcing</p>
                <p className="text-xs text-gray-500 mt-1">Match suppliers</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hover:border-blue-300">
                <FileText className="h-6 w-6 text-blue-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Quick Import</p>
                <p className="text-xs text-gray-500 mt-1">Upload PO/PDF</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hover:border-emerald-300">
                <Building2 className="h-6 w-6 text-emerald-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Add Supplier</p>
                <p className="text-xs text-gray-500 mt-1">New partnership</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors hover:border-amber-300">
                <BarChart3 className="h-6 w-6 text-amber-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Analytics</p>
                <p className="text-xs text-gray-500 mt-1">View reports</p>
              </button>
            </div>
          </div>
        </div>

        {/* Procurement Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Key Metrics</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {procurementMetrics.map((metric, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{metric.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{metric.value}</span>
                    <div className={`flex items-center ${
                      metric.good ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.trend === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Alerts Section */}
      <div className="space-y-4">
        {/* High Priority Alert */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Client POs Need Sourcing</p>
              <p className="text-sm text-red-700 mt-1">
                24 client purchase orders are waiting for supplier matching. Use AI sourcing to find optimal suppliers.
              </p>
            </div>
            <button className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
              Start Sourcing
            </button>
          </div>
        </div>

        {/* Medium Priority Alert */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">Low Stock Alert</p>
              <p className="text-sm text-orange-700 mt-1">
                12 products are running low on stock. Review inventory levels to avoid stockouts.
              </p>
            </div>
            <button className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors">
              View Items
            </button>
          </div>
        </div>

        {/* Success Alert */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">AI Sourcing Success</p>
              <p className="text-sm text-green-700 mt-1">
                Latest supplier matching achieved 94% accuracy and identified $2,340 in potential savings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
