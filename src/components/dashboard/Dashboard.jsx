import { useState, useEffect } from 'react';
import { Building2, Package, Clock, FileText, AlertCircle, DollarSign, BarChart3, TrendingUp, Eye, Activity } from 'lucide-react';
import { mockFirebase } from '../../services/firebase';
import StatCard from './StatCard';

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
  const [loading, setLoading] = useState(true);

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
        ...suppliers.map(s => ({ 
          ...s, 
          type: 'supplier', 
          icon: Building2,
          typeLabel: 'Supplier Added',
          color: 'text-green-600'
        })),
        ...products.map(p => ({ 
          ...p, 
          type: 'product', 
          icon: Package,
          typeLabel: 'Product Added',
          color: 'text-blue-600'
        })),
        ...pos.map(po => ({ 
          ...po, 
          type: 'purchase_order', 
          icon: FileText,
          typeLabel: 'Order Created',
          color: 'text-purple-600'
        }))
      ].sort((a, b) => new Date(b.dateCreated || b.dateAdded) - new Date(a.dateCreated || a.dateAdded))
       .slice(0, 10);

      setRecentActivity(allItems);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: 'Add Supplier', icon: Building2, color: 'bg-green-500', action: () => {} },
    { label: 'Add Product', icon: Package, color: 'bg-blue-500', action: () => {} },
    { label: 'Create PO', icon: FileText, color: 'bg-purple-500', action: () => {} },
    { label: 'Import Data', icon: Activity, color: 'bg-orange-500', action: () => {} }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome back!</h2>
            <p className="text-blue-100">Here's what's happening with your business today.</p>
          </div>
          <div className="hidden md:block">
            <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <BarChart3 size={40} className="text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Suppliers" 
          value={stats.totalSuppliers} 
          icon={Building2} 
          color="blue" 
          trend={12}
          subtitle="Active partnerships"
        />
        <StatCard 
          title="Product Catalog" 
          value={stats.totalProducts} 
          icon={Package} 
          color="green" 
          trend={8}
          subtitle="Items in stock"
        />
        <StatCard 
          title="Pending Items" 
          value={stats.pendingProducts} 
          icon={Clock} 
          color="yellow" 
          trend={-5}
          subtitle="Awaiting completion"
        />
        <StatCard 
          title="Purchase Orders" 
          value={stats.totalPOs} 
          icon={FileText} 
          color="purple" 
          trend={15}
          subtitle="This month"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatCard 
          title="Low Stock Alerts" 
          value={stats.lowStockItems} 
          icon={AlertCircle} 
          color="red"
          subtitle="Requires attention"
          priority={stats.lowStockItems > 0 ? "high" : "normal"}
        />
        <StatCard 
          title="Inventory Value" 
          value={stats.totalValue} 
          icon={DollarSign} 
          color="green" 
          format="currency"
          subtitle="Total asset value"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-600">Latest updates across your system</p>
            </div>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
              <Eye size={16} />
              View All
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {recentActivity.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentActivity.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg bg-gray-100`}>
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 truncate">{item.name || item.poNumber}</p>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                              {item.typeLabel}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {item.type === 'supplier' && `${item.email} • Contact: ${item.contactPerson || 'N/A'}`}
                            {item.type === 'product' && `$${item.price} • ${item.category} • Stock: ${item.stock || 0}`}
                            {item.type === 'purchase_order' && `${item.client} • ${item.items?.length || 0} items • $${item.totalAmount || 0}`}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{new Date(item.dateCreated || item.dateAdded).toLocaleDateString()}</span>
                            <span className={`inline-flex px-2 py-1 rounded-full font-medium ${
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
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No recent activity to display</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-600">Common tasks and shortcuts</p>
          </div>
          <div className="p-6 space-y-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform`}>
                    <Icon size={20} />
                  </div>
                  <span className="font-medium text-gray-900">{action.label}</span>
                </button>
              );
            })}
          </div>
          
          {/* System Status */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">System Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-600 font-medium">All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
