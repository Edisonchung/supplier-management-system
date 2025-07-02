// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, Package, FileText, Users, TrendingUp, 
  ArrowUp, ArrowDown, Activity, DollarSign, ShoppingCart,
  Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const Dashboard = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  
  // Sample stats - in a real app, these would come from your data
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

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.fullName || user?.email || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's what's happening with your business today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-6 w-6 text-${stat.color.split('-')[1]}-600`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.trend === 'up' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                  {Math.abs(stat.change)}%
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.prefix}{stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'new' ? 'bg-blue-500' :
                    activity.status === 'update' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-orange-500' :
                    'bg-gray-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Building2 className="h-6 w-6 text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Add Supplier</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Package className="h-6 w-6 text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">New Product</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="h-6 w-6 text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Create PO</p>
              </button>
              <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Users className="h-6 w-6 text-gray-600 mb-2" />
                <p className="text-sm font-medium text-gray-900">Invite User</p>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-900">Low Stock Alert</p>
            <p className="text-sm text-orange-700 mt-1">
              12 products are running low on stock. Review inventory levels to avoid stockouts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
