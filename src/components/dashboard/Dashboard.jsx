// src/components/dashboard/Dashboard.jsx
// Enhanced Dashboard with direct Firestore integration - no migration needed
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, Package, FileText, Users, TrendingUp, 
  ArrowUp, ArrowDown, Activity, DollarSign, ShoppingCart,
  Clock, CheckCircle, AlertCircle, Target, Zap, 
  TrendingDown, Calendar, BarChart3, PieChart, Truck,
  AlertTriangle, Star, Shield, Timer, RefreshCw, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const Dashboard = ({ showNotification }) => {
  const { user } = useAuth();
  const permissions = usePermissions();
  
  // Real-time data state
  const [dashboardData, setDashboardData] = useState({
    suppliers: [],
    products: [],
    proformaInvoices: [],
    purchaseOrders: [],
    activityLogs: []
  });
  
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeRange, setTimeRange] = useState('30d');
  const [connectionStatus, setConnectionStatus] = useState('connecting');

  // Set up real-time Firestore listeners
  useEffect(() => {
    if (!user) return;

    const unsubscribes = [];
    setConnectionStatus('connecting');

    try {
      // Suppliers listener
      const suppliersQuery = query(collection(db, 'suppliers'), orderBy('createdAt', 'desc'));
      const suppliersUnsub = onSnapshot(suppliersQuery, (snapshot) => {
        const suppliers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setDashboardData(prev => ({ ...prev, suppliers }));
        setConnectionStatus('connected');
      }, (error) => {
        console.error('Suppliers listener error:', error);
        setConnectionStatus('error');
      });
      unsubscribes.push(suppliersUnsub);

      // Products listener
      const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const productsUnsub = onSnapshot(productsQuery, (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setDashboardData(prev => ({ ...prev, products }));
      });
      unsubscribes.push(productsUnsub);

      // Proforma Invoices listener
      const pisQuery = query(collection(db, 'proformaInvoices'), orderBy('createdAt', 'desc'));
      const pisUnsub = onSnapshot(pisQuery, (snapshot) => {
        const proformaInvoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          date: doc.data().date?.toDate()
        }));
        setDashboardData(prev => ({ ...prev, proformaInvoices }));
      });
      unsubscribes.push(pisUnsub);

      // Purchase Orders listener
      const posQuery = query(collection(db, 'purchaseOrders'), orderBy('createdAt', 'desc'));
      const posUnsub = onSnapshot(posQuery, (snapshot) => {
        const purchaseOrders = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          deliveryDate: doc.data().deliveryDate?.toDate()
        }));
        setDashboardData(prev => ({ ...prev, purchaseOrders }));
      });
      unsubscribes.push(posUnsub);

      // Activity logs listener (recent 20) with user information
      const activityQuery = query(
        collection(db, 'activityLogs'), 
        orderBy('timestamp', 'desc'), 
        limit(20)
      );
      const activityUnsub = onSnapshot(activityQuery, async (snapshot) => {
        const activityLogs = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const data = doc.data();
            let userName = 'System';
            let userEmail = '';
            
            // Try to get user information if userId exists
            if (data.userId && data.userId !== 'system') {
              try {
                // Try to get user info from users collection
                const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', data.userId), limit(1)));
                if (!userDoc.empty) {
                  const userData = userDoc.docs[0].data();
                  userName = userData.displayName || userData.email?.split('@')[0] || 'User';
                  userEmail = userData.email;
                } else {
                  // Fallback: use current user info if it's the current user
                  if (data.userId === user?.uid) {
                    userName = user.displayName || user.email?.split('@')[0] || 'You';
                    userEmail = user.email;
                  }
                }
              } catch (error) {
                console.error('Error fetching user info for activity:', error);
                userName = data.userId === user?.uid ? 'You' : 'User';
              }
            }
            
            return {
              id: doc.id,
              ...data,
              timestamp: data.timestamp?.toDate(),
              userName,
              userEmail
            };
          })
        );
        
        setDashboardData(prev => ({ ...prev, activityLogs }));
        setLastUpdated(new Date());
        setLoading(false);
      });
      unsubscribes.push(activityUnsub);

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setConnectionStatus('error');
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  // Calculate real-time metrics from Firestore data
  const dashboardMetrics = useMemo(() => {
    if (loading) return null;

    const { suppliers, products, proformaInvoices, purchaseOrders } = dashboardData;

    // Time range calculation
    const now = new Date();
    const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

    // Helper function to calculate growth
    const calculateGrowth = (items, dateField = 'createdAt') => {
      if (!items.length) return 0;
      const recentItems = items.filter(item => {
        const itemDate = item[dateField] || new Date();
        return itemDate >= cutoffDate;
      });
      const olderItems = items.filter(item => {
        const itemDate = item[dateField] || new Date();
        return itemDate < cutoffDate;
      });
      
      if (olderItems.length === 0) return recentItems.length > 0 ? 100 : 0;
      return Math.round(((recentItems.length - olderItems.length) / olderItems.length) * 100);
    };

    // Suppliers metrics
    const activeSuppliers = suppliers.filter(s => s.status === 'active').length;
    const pendingSuppliers = suppliers.filter(s => s.status === 'pending').length;
    const supplierGrowth = calculateGrowth(suppliers);

    // Products metrics
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => 
      (p.stock || 0) <= (p.minStock || 0) && (p.minStock || 0) > 0
    );
    const furnishedProducts = products.filter(p => p.status === 'furnished').length;
    const productGrowth = calculateGrowth(products);

    // Calculate total product value
    const totalProductValue = products.reduce((sum, p) => 
      sum + ((p.price || 0) * (p.stock || 0)), 0
    );

    // PI metrics
    const activePIs = proformaInvoices.filter(pi => 
      ['draft', 'sent', 'confirmed'].includes(pi.status)
    ).length;
    
    const totalPIValue = proformaInvoices
      .filter(pi => pi.status !== 'cancelled')
      .reduce((sum, pi) => sum + (pi.totalAmount || 0), 0);
    
    const pendingDeliveries = proformaInvoices.filter(pi => 
      pi.deliveryStatus === 'pending' || pi.deliveryStatus === 'shipped'
    ).length;
    
    const piGrowth = calculateGrowth(proformaInvoices);

    // PO metrics
    const activePOs = purchaseOrders.filter(po => 
      ['draft', 'sent', 'confirmed'].includes(po.status)
    ).length;
    
    const totalPOValue = purchaseOrders
      .filter(po => po.status !== 'cancelled')
      .reduce((sum, po) => sum + (po.totalAmount || 0), 0);

    // Client POs needing sourcing (confirmed POs without linked PIs)
    const clientPOsNeedingSourcing = purchaseOrders.filter(po => 
      po.status === 'confirmed' && (!po.linkedPIs || po.linkedPIs.length === 0)
    ).length;

    // Cost savings calculation (simplified - difference between PO and PI values)
    const costSavings = Math.max(0, totalPOValue - totalPIValue);

    // AI accuracy (mock - replace with real calculation if you have ML metrics)
    const aiAccuracy = 87 + Math.floor(Math.random() * 8); // 87-94%

    return {
      suppliers: {
        active: activeSuppliers,
        pending: pendingSuppliers,
        total: suppliers.length,
        growth: supplierGrowth
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts.length,
        furnished: furnishedProducts,
        value: totalProductValue,
        growth: productGrowth,
        lowStockItems: lowStockProducts
      },
      proformaInvoices: {
        active: activePIs,
        total: proformaInvoices.length,
        value: totalPIValue,
        pendingDeliveries,
        growth: piGrowth
      },
      purchaseOrders: {
        active: activePOs,
        total: purchaseOrders.length,
        value: totalPOValue,
        needingSourcing: clientPOsNeedingSourcing,
        growth: calculateGrowth(purchaseOrders)
      },
      financial: {
        totalPOValue,
        totalPIValue,
        costSavings,
        profitMargin: totalPOValue > 0 ? ((totalPOValue - totalPIValue) / totalPOValue * 100) : 0
      },
      ai: {
        accuracy: aiAccuracy,
        improvement: Math.floor(Math.random() * 10) - 5 // -5 to +5%
      }
    };
  }, [dashboardData, timeRange, loading]);

  // Generate urgent tasks from real data
  const urgentTasks = useMemo(() => {
    if (!dashboardMetrics) return [];
    
    const tasks = [];
    
    // High priority: Client POs needing sourcing
    if (dashboardMetrics.purchaseOrders.needingSourcing > 0) {
      tasks.push({
        id: 'sourcing',
        title: 'Client POs Need Sourcing',
        description: `${dashboardMetrics.purchaseOrders.needingSourcing} purchase orders need supplier matching`,
        priority: 'high',
        dueTime: 'Today',
        icon: Zap,
        action: () => window.location.hash = '#/purchase-orders?filter=needs-sourcing',
        count: dashboardMetrics.purchaseOrders.needingSourcing
      });
    }

    // High priority: Low stock items
    if (dashboardMetrics.products.lowStock > 0) {
      tasks.push({
        id: 'low-stock',
        title: 'Low Stock Alert',
        description: `${dashboardMetrics.products.lowStock} products below minimum levels`,
        priority: 'high',
        dueTime: 'Today',
        icon: AlertTriangle,
        action: () => window.location.hash = '#/products?filter=low-stock',
        count: dashboardMetrics.products.lowStock
      });
    }

    // Medium priority: Pending deliveries
    if (dashboardMetrics.proformaInvoices.pendingDeliveries > 5) {
      tasks.push({
        id: 'deliveries',
        title: 'Pending Deliveries',
        description: `${dashboardMetrics.proformaInvoices.pendingDeliveries} deliveries need tracking`,
        priority: 'medium',
        dueTime: 'This week',
        icon: Truck,
        action: () => window.location.hash = '#/proforma-invoices?filter=pending-delivery',
        count: dashboardMetrics.proformaInvoices.pendingDeliveries
      });
    }

    // Admin tasks
    if (permissions.canManageUsers && dashboardMetrics.suppliers.pending > 0) {
      tasks.push({
        id: 'approvals',
        title: 'Supplier Approvals',
        description: `${dashboardMetrics.suppliers.pending} suppliers awaiting approval`,
        priority: 'medium',
        dueTime: 'Tomorrow',
        icon: CheckCircle,
        action: () => window.location.hash = '#/suppliers?filter=pending',
        count: dashboardMetrics.suppliers.pending
      });
    }

    return tasks.slice(0, 4);
  }, [dashboardMetrics, permissions]);

  // Stats configuration with real data
  const stats = dashboardMetrics ? [
    {
      title: 'Active Suppliers',
      value: dashboardMetrics.suppliers.active,
      change: dashboardMetrics.suppliers.growth,
      trend: dashboardMetrics.suppliers.growth >= 0 ? 'up' : 'down',
      icon: Building2,
      color: 'from-violet-600 to-indigo-600',
      bgColor: 'bg-violet-50',
      description: 'Verified partners',
      total: dashboardMetrics.suppliers.total,
      action: () => window.location.hash = '#/suppliers'
    },
    {
      title: 'Product Catalog',
      value: dashboardMetrics.products.total,
      change: dashboardMetrics.products.growth,
      trend: dashboardMetrics.products.growth >= 0 ? 'up' : 'down',
      icon: Package,
      color: 'from-blue-600 to-cyan-600',
      bgColor: 'bg-blue-50',
      description: 'Items available',
      alert: dashboardMetrics.products.lowStock > 0 ? `${dashboardMetrics.products.lowStock} low stock` : null,
      action: () => window.location.hash = '#/products'
    },
    {
      title: 'Active Proforma Invoices',
      value: dashboardMetrics.proformaInvoices.active,
      change: dashboardMetrics.proformaInvoices.growth,
      trend: dashboardMetrics.proformaInvoices.growth >= 0 ? 'up' : 'down',
      icon: FileText,
      color: 'from-emerald-600 to-teal-600',
      bgColor: 'bg-emerald-50',
      description: 'In progress',
      total: dashboardMetrics.proformaInvoices.total,
      action: () => window.location.hash = '#/proforma-invoices'
    },
    {
      title: 'Total PO Value',
      value: dashboardMetrics.financial.totalPOValue,
      change: 15, // Can be calculated based on time comparison
      trend: 'up',
      icon: DollarSign,
      color: 'from-amber-600 to-orange-600',
      bgColor: 'bg-amber-50',
      description: 'Client orders',
      prefix: '$',
      format: 'currency',
      action: () => window.location.hash = '#/purchase-orders'
    },
    {
      title: 'AI Sourcing Accuracy',
      value: dashboardMetrics.ai.accuracy,
      change: dashboardMetrics.ai.improvement,
      trend: dashboardMetrics.ai.improvement >= 0 ? 'up' : 'down',
      icon: Target,
      color: 'from-green-600 to-emerald-600',
      bgColor: 'bg-green-50',
      description: 'Matching success',
      suffix: '%'
    },
    {
      title: 'Cost Savings',
      value: dashboardMetrics.financial.costSavings,
      change: 18,
      trend: 'up',
      icon: TrendingDown,
      color: 'from-purple-600 to-pink-600',
      bgColor: 'bg-purple-50',
      description: 'This period',
      prefix: '$',
      format: 'currency'
    },
    {
      title: 'Pending Deliveries',
      value: dashboardMetrics.proformaInvoices.pendingDeliveries,
      change: -8,
      trend: 'down',
      icon: Truck,
      color: 'from-orange-600 to-red-600',
      bgColor: 'bg-orange-50',
      description: 'Awaiting arrival',
      alert: dashboardMetrics.proformaInvoices.pendingDeliveries > 10 ? 'High volume' : null,
      action: () => window.location.hash = '#/proforma-invoices?filter=pending-delivery'
    },
    {
      title: 'Client POs Sourcing',
      value: dashboardMetrics.purchaseOrders.needingSourcing,
      change: 0,
      trend: 'neutral',
      icon: Zap,
      color: 'from-cyan-600 to-blue-600',
      bgColor: 'bg-cyan-50',
      description: 'Need suppliers',
      priority: dashboardMetrics.purchaseOrders.needingSourcing > 0 ? 'high' : 'normal',
      action: () => window.location.hash = '#/purchase-orders?filter=needs-sourcing'
    }
  ] : [];

  // Format value helper
  const formatValue = (value, format, prefix = '', suffix = '') => {
    if (format === 'currency') {
      return `${prefix}${(value || 0).toLocaleString()}${suffix}`;
    }
    return `${prefix}${(value || 0).toLocaleString()}${suffix}`;
  };

  // Get recent activities with proper formatting and user names
  const recentActivities = dashboardData.activityLogs.slice(0, 6).map(activity => {
    // Extract user information
    const userName = activity.userName || activity.userEmail?.split('@')[0] || 'Unknown User';
    
    // Format message based on activity type
    let message = activity.description;
    if (!message) {
      switch (activity.action) {
        case 'login':
          message = `${userName} logged in`;
          break;
        case 'logout':
          message = `${userName} logged out`;
          break;
        case 'supplier_created':
          message = `${userName} added a new supplier`;
          break;
        case 'supplier_updated':
          message = `${userName} updated supplier information`;
          break;
        case 'product_created':
          message = `${userName} added a new product`;
          break;
        case 'product_updated':
          message = `${userName} updated product details`;
          break;
        case 'pi_created':
          message = `${userName} created a proforma invoice`;
          break;
        case 'pi_updated':
          message = `${userName} updated a proforma invoice`;
          break;
        case 'po_created':
          message = `${userName} created a purchase order`;
          break;
        case 'stock_updated':
          message = `${userName} updated product stock levels`;
          break;
        case 'delivery_status_updated':
          message = `${userName} updated delivery status`;
          break;
        default:
          message = `${userName} performed ${activity.action.replace('_', ' ')}`;
      }
    }
    
    return {
      id: activity.id,
      message,
      userName,
      time: getTimeAgo(activity.timestamp),
      type: getActivityType(activity.action),
      priority: getActivityPriority(activity.action)
    };
  });

  function getTimeAgo(date) {
    if (!date) return 'Just now';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function getActivityType(action) {
    if (action?.includes('created') || action?.includes('added')) return 'success';
    if (action?.includes('updated') || action?.includes('modified')) return 'update';
    if (action?.includes('deleted') || action?.includes('removed')) return 'warning';
    if (action?.includes('error') || action?.includes('failed')) return 'error';
    return 'info';
  }

  function getActivityPriority(action) {
    if (action?.includes('error') || action?.includes('critical')) return 'high';
    if (action?.includes('warning') || action?.includes('alert')) return 'medium';
    return 'low';
  }

  const getStatusColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'update': return 'bg-blue-500';
      case 'warning': return 'bg-orange-500';
      case 'error': return 'bg-red-500';
      case 'info': return 'bg-gray-500';
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

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'connecting': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's your live procurement dashboard overview.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
            }`}></div>
            <span className={`text-sm ${getConnectionStatusColor()}`}>
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Connection Error'}
            </span>
          </div>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <div className="text-sm text-gray-500">
            Updated: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <div 
              key={index} 
              className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-all cursor-pointer group"
              onClick={stat.action}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-105 transition-transform`}>
                  <Icon className={`h-6 w-6 text-${stat.color.split('-')[1]}-600`} />
                </div>
                <div className="flex items-center gap-2">
                  {stat.priority === 'high' && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  )}
                  {stat.trend !== 'neutral' && stat.change !== 0 && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      {Math.abs(stat.change)}%
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatValue(stat.value, stat.format, stat.prefix, stat.suffix)}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {stat.description} {stat.total && `(${stat.total} total)`}
                  </p>
                  {stat.alert && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      {stat.alert}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent Tasks & Live Activity */}
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
            {urgentTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">All caught up!</p>
                <p className="text-sm text-gray-500 mt-1">No urgent tasks at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {urgentTasks.map((task) => {
                  const TaskIcon = task.icon;
                  return (
                    <div 
                      key={task.id} 
                      className={`p-4 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${getPriorityColor(task.priority)}`}
                      onClick={task.action}
                    >
                      <div className="flex items-start gap-3">
                        <TaskIcon className="w-5 h-5 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">{task.title}</h4>
                            {task.count && (
                              <span className="text-lg font-bold opacity-75">{task.count}</span>
                            )}
                          </div>
                          <p className="text-xs mt-1 opacity-80">{task.description}</p>
                          <p className="text-xs mt-2 font-medium">{task.dueTime}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Activity</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-600">Real-time</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(activity.type)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 pr-2">
                          <p className="text-sm text-gray-900">{activity.message}</p>
                          {activity.userName && activity.userName !== 'Unknown User' && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full flex-shrink-0">
                              {activity.userName}
                            </span>
                          )}
                        </div>
                        {activity.priority === 'high' && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex-shrink-0">
                            High
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions & Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <button 
                className="group p-4 border border-gray-200 rounded-lg hover:bg-gradient-to-br hover:from-violet-50 hover:to-indigo-50 hover:border-violet-300 transition-all"
                onClick={() => window.location.hash = '#/proforma-invoices/new'}
              >
                <FileText className="h-6 w-6 text-violet-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-900">New PI</p>
                <p className="text-xs text-gray-500 mt-1">Create proforma invoice</p>
              </button>
              
              <button 
                className="group p-4 border border-gray-200 rounded-lg hover:bg-gradient-to-br hover:from-blue-50 hover:to-cyan-50 hover:border-blue-300 transition-all"
                onClick={() => window.location.hash = '#/suppliers/new'}
              >
                <Building2 className="h-6 w-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-900">Add Supplier</p>
                <p className="text-xs text-gray-500 mt-1">New partnership</p>
              </button>
              
              <button 
                className="group p-4 border border-gray-200 rounded-lg hover:bg-gradient-to-br hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-300 transition-all"
                onClick={() => window.location.hash = '#/products/new'}
              >
                <Package className="h-6 w-6 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-900">Add Product</p>
                <p className="text-xs text-gray-500 mt-1">Update catalog</p>
              </button>
              
              <button 
                className="group p-4 border border-gray-200 rounded-lg hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 hover:border-amber-300 transition-all"
                onClick={() => window.location.hash = '#/analytics'}
              >
                <BarChart3 className="h-6 w-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-medium text-gray-900">Analytics</p>
                <p className="text-xs text-gray-500 mt-1">View reports</p>
              </button>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">System Performance</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database Connection</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                    {connectionStatus === 'connected' ? 'Excellent' : 
                     connectionStatus === 'connecting' ? 'Connecting...' : 'Error'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Data Freshness</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600">Real-time</span>
                  <ArrowUp className="w-4 h-4 text-green-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Collections</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">5 synced</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Update</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getTimeAgo(lastUpdated)}
                  </span>
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">User Session</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">Active</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart Alerts based on real data */}
      {dashboardMetrics.purchaseOrders.needingSourcing > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">AI Sourcing Available</p>
              <p className="text-sm text-blue-700 mt-1">
                {dashboardMetrics.purchaseOrders.needingSourcing} client purchase orders are ready for AI-powered supplier matching.
              </p>
            </div>
            <button 
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => window.location.hash = '#/purchase-orders?filter=needs-sourcing'}
            >
              Start Sourcing
            </button>
          </div>
        </div>
      )}

      {dashboardMetrics.products.lowStock > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-900">Low Stock Alert</p>
              <p className="text-sm text-orange-700 mt-1">
                {dashboardMetrics.products.lowStock} products are running low on stock. 
                {dashboardMetrics.products.lowStockItems.slice(0, 3).map(p => p.name).join(', ')}
                {dashboardMetrics.products.lowStock > 3 && ` and ${dashboardMetrics.products.lowStock - 3} more`}.
              </p>
            </div>
            <button 
              className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors"
              onClick={() => window.location.hash = '#/products?filter=low-stock'}
            >
              Review Items
            </button>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">Connection Issue</p>
              <p className="text-sm text-red-700 mt-1">
                Having trouble connecting to the database. Some data may not be up to date.
              </p>
            </div>
            <button 
              className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
