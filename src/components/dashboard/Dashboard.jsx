import { useState, useEffect } from 'react';
import { Building2, Package, Clock, FileText, AlertCircle, DollarSign, BarChart3 } from 'lucide-react';
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

export default Dashboard;
