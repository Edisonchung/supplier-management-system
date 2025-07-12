// src/components/tracking/UnifiedTrackingDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Package,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Download,
  RefreshCw,
  MapPin,
  CreditCard,
  Users,
  Building2,
  ChevronRight,
  Eye,
  Edit3,
  X
} from 'lucide-react';
import { useUnifiedData, usePurchaseOrders, useDeliveryTracking, usePaymentTracking } from '../../context/UnifiedDataContext';
import toast from 'react-hot-toast';

const DELIVERY_STATUSES = {
  preparing: { label: 'Preparing', color: 'bg-blue-500', icon: Package },
  shipped: { label: 'Shipped', color: 'bg-purple-500', icon: Truck },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500', icon: MapPin },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-gray-500', icon: CheckCircle }
};

const PAYMENT_STATUSES = {
  pending: { label: 'Pending', color: 'bg-orange-500', icon: Clock },
  processing: { label: 'Processing', color: 'bg-blue-500', icon: CreditCard },
  paid: { label: 'Paid', color: 'bg-green-500', icon: CheckCircle },
  overdue: { label: 'Overdue', color: 'bg-red-500', icon: AlertTriangle },
  partial: { label: 'Partial', color: 'bg-yellow-500', icon: DollarSign }
};

function StatusBadge({ status, type = 'delivery' }) {
  const statusConfig = type === 'delivery' ? DELIVERY_STATUSES : PAYMENT_STATUSES;
  const config = statusConfig[status] || { label: status, color: 'bg-gray-500', icon: AlertTriangle };
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}>
      <Icon size={12} className="mr-1" />
      {config.label}
    </span>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color.replace('text-', 'bg-').replace('-600', '-100')}`}>
          <Icon size={24} className={color} />
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center">
          <TrendingUp size={16} className="text-green-500 mr-1" />
          <span className="text-sm text-green-600">{trend}</span>
        </div>
      )}
    </div>
  );
}

function DeliveryTrackingCard({ poId, purchaseOrder, deliveryData, onUpdateStatus, onViewDetails }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentStatus = deliveryData?.status || 'preparing';
  const estimatedDelivery = deliveryData?.estimatedDelivery || purchaseOrder.expectedDelivery;
  const trackingNumber = deliveryData?.trackingNumber;
  const carrier = deliveryData?.carrier;
  
  const isOverdue = estimatedDelivery && new Date(estimatedDelivery) < new Date() && currentStatus !== 'completed';
  
  const statusProgress = {
    preparing: 25,
    shipped: 50,
    in_transit: 75,
    delivered: 90,
    completed: 100
  };
  
  const selectedSuppliers = useMemo(() => {
    if (!purchaseOrder.supplierSelections) return [];
    
    return Object.entries(purchaseOrder.supplierSelections).map(([itemNumber, supplierId]) => {
      const item = purchaseOrder.items?.find(i => i.itemNumber === parseInt(itemNumber));
      return {
        itemNumber,
        supplierId,
        item
      };
    }).filter(s => s.item);
  }, [purchaseOrder]);
  
  return (
    <div className={`bg-white rounded-lg border-l-4 shadow-sm border-gray-200 ${isOverdue ? 'border-l-red-500' : 'border-l-blue-500'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {purchaseOrder.poNumber}
              </h3>
              <p className="text-sm text-gray-600">
                Client: {purchaseOrder.clientName}
              </p>
            </div>
            {isOverdue && (
              <AlertTriangle className="text-red-500" size={20} />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <StatusBadge status={currentStatus} type="delivery" />
            <button
              onClick={onViewDetails}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight size={16} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progress</span>
            <span>{statusProgress[currentStatus]}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${statusProgress[currentStatus]}%` }}
            />
          </div>
        </div>
        
        {/* Key Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Items</p>
            <p className="font-medium">{purchaseOrder.items?.length || 0}</p>
          </div>
          <div>
            <p className="text-gray-600">Suppliers</p>
            <p className="font-medium">{selectedSuppliers.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Est. Delivery</p>
            <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
              {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : 'TBD'}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Total Value</p>
            <p className="font-medium">${(purchaseOrder.totalAmount || 0).toLocaleString()}</p>
          </div>
        </div>
        
        {trackingNumber && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Tracking: {trackingNumber}</p>
                {carrier && <p className="text-xs text-gray-600">via {carrier}</p>}
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Track Package
              </button>
            </div>
          </div>
        )}
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-6 border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Supplier Breakdown</h4>
            <div className="space-y-2">
              {selectedSuppliers.map(({ itemNumber, supplierId, item }) => (
                <div key={itemNumber} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-gray-600 ml-2">({item.quantity} units)</span>
                  </div>
                  <div className="text-gray-600">
                    Supplier: {supplierId}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex space-x-2 mt-4">
              <select
                value={currentStatus}
                onChange={(e) => onUpdateStatus(poId, e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {Object.entries(DELIVERY_STATUSES).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const trackingNumber = prompt('Enter tracking number:');
                  const carrier = prompt('Enter carrier name:');
                  if (trackingNumber && carrier) {
                    onUpdateStatus(poId, currentStatus, { trackingNumber, carrier });
                  }
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Add Tracking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentTrackingCard({ supplierId, supplierData, paymentData, onUpdatePayment }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const currentStatus = paymentData?.status || 'pending';
  const dueDate = paymentData?.dueDate;
  const amount = paymentData?.amount || 0;
  const paidAmount = paymentData?.paidAmount || 0;
  const remainingAmount = amount - paidAmount;
  
  const isOverdue = dueDate && new Date(dueDate) < new Date() && currentStatus !== 'paid';
  
  return (
    <div className={`bg-white rounded-lg border-l-4 shadow-sm border-gray-200 ${isOverdue ? 'border-l-red-500' : 'border-l-green-500'}`}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {supplierData?.name || supplierId}
              </h3>
              <p className="text-sm text-gray-600">
                Payment Due: {dueDate ? new Date(dueDate).toLocaleDateString() : 'TBD'}
              </p>
            </div>
            {isOverdue && (
              <AlertTriangle className="text-red-500" size={20} />
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <StatusBadge status={currentStatus} type="payment" />
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronRight size={16} className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Payment Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Payment Progress</span>
            <span>{amount > 0 ? Math.round((paidAmount / amount) * 100) : 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${currentStatus === 'paid' ? 'bg-green-500' : isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${amount > 0 ? (paidAmount / amount) * 100 : 0}%` }}
            />
          </div>
        </div>
        
        {/* Payment Info */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Amount</p>
            <p className="font-medium">${amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Paid</p>
            <p className="font-medium text-green-600">${paidAmount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-600">Remaining</p>
            <p className={`font-medium ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${remainingAmount.toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-6 border-t pt-4">
            <div className="flex space-x-2">
              <select
                value={currentStatus}
                onChange={(e) => onUpdatePayment(supplierId, { status: e.target.value })}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {Object.entries(PAYMENT_STATUSES).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const paymentAmount = prompt('Enter payment amount:');
                  if (paymentAmount && !isNaN(paymentAmount)) {
                    const newPaidAmount = paidAmount + parseFloat(paymentAmount);
                    const newStatus = newPaidAmount >= amount ? 'paid' : 'partial';
                    onUpdatePayment(supplierId, { 
                      paidAmount: newPaidAmount,
                      status: newStatus,
                      lastPaymentDate: new Date().toISOString()
                    });
                  }
                }}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UnifiedTrackingDashboard() {
  const { state } = useUnifiedData();
  const { purchaseOrders } = usePurchaseOrders();
  const { deliveryTracking, updateDeliveryStatus } = useDeliveryTracking();
  const { paymentTracking, updatePaymentStatus } = usePaymentTracking();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Calculate metrics
  const metrics = useMemo(() => {
    const poWithSuppliers = purchaseOrders.filter(po => po.supplierSelections);
    
    const deliveryMetrics = {
      total: poWithSuppliers.length,
      preparing: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      completed: 0,
      overdue: 0
    };
    
    const paymentMetrics = {
      total: 0,
      pending: 0,
      processing: 0,
      paid: 0,
      overdue: 0,
      totalAmount: 0,
      paidAmount: 0
    };
    
    poWithSuppliers.forEach(po => {
      const deliveryData = deliveryTracking[po.id];
      const status = deliveryData?.status || 'preparing';
      deliveryMetrics[status]++;
      
      if (deliveryData?.estimatedDelivery) {
        const isOverdue = new Date(deliveryData.estimatedDelivery) < new Date() && status !== 'completed';
        if (isOverdue) deliveryMetrics.overdue++;
      }
    });
    
    Object.values(paymentTracking).forEach(payment => {
      paymentMetrics.total++;
      paymentMetrics[payment.status]++;
      paymentMetrics.totalAmount += payment.amount || 0;
      paymentMetrics.paidAmount += payment.paidAmount || 0;
      
      if (payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status !== 'paid') {
        paymentMetrics.overdue++;
      }
    });
    
    return { deliveryMetrics, paymentMetrics };
  }, [purchaseOrders, deliveryTracking, paymentTracking]);
  
  // Filter data
  const filteredPOs = useMemo(() => {
    return purchaseOrders
      .filter(po => po.supplierSelections) // Only POs with selected suppliers
      .filter(po => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            po.poNumber?.toLowerCase().includes(term) ||
            po.clientName?.toLowerCase().includes(term) ||
            po.projectCode?.toLowerCase().includes(term)
          );
        }
        return true;
      })
      .filter(po => {
        if (statusFilter !== 'all') {
          const deliveryData = deliveryTracking[po.id];
          const status = deliveryData?.status || 'preparing';
          return status === statusFilter;
        }
        return true;
      });
  }, [purchaseOrders, deliveryTracking, searchTerm, statusFilter]);
  
  const handleUpdateDeliveryStatus = async (poId, status, additionalData = {}) => {
    try {
      await updateDeliveryStatus(poId, {
        status,
        ...additionalData,
        lastUpdated: new Date().toISOString()
      });
      toast.success('Delivery status updated successfully');
    } catch (error) {
      toast.error('Failed to update delivery status');
    }
  };
  
  const handleUpdatePaymentStatus = async (supplierId, updates) => {
    try {
      await updatePaymentStatus(supplierId, updates);
      toast.success('Payment status updated successfully');
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };
  
  const handleExportData = () => {
    // Implementation for CSV export
    toast.success('Export feature will be implemented');
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Unified Tracking Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor delivery and payment status across all purchase orders</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download size={16} className="mr-2" />
              Export
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-blue-700"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'delivery', label: 'Delivery Tracking', icon: Truck },
            { id: 'payment', label: 'Payment Status', icon: DollarSign }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={16} className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Deliveries"
              value={metrics.deliveryMetrics.total}
              subtitle={`${metrics.deliveryMetrics.overdue} overdue`}
              icon={Truck}
              color="text-blue-600"
            />
            <MetricCard
              title="Pending Payments"
              value={metrics.paymentMetrics.pending + metrics.paymentMetrics.processing}
              subtitle={`$${(metrics.paymentMetrics.totalAmount - metrics.paymentMetrics.paidAmount).toLocaleString()} outstanding`}
              icon={DollarSign}
              color="text-green-600"
            />
            <MetricCard
              title="Completion Rate"
              value={`${metrics.deliveryMetrics.total > 0 ? Math.round((metrics.deliveryMetrics.completed / metrics.deliveryMetrics.total) * 100) : 0}%`}
              subtitle="Delivered this month"
              icon={CheckCircle}
              color="text-green-600"
            />
            <MetricCard
              title="Urgent Items"
              value={metrics.deliveryMetrics.overdue + metrics.paymentMetrics.overdue}
              subtitle="Require attention"
              icon={AlertTriangle}
              color="text-red-600"
            />
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('delivery')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <Truck className="text-blue-600 mb-2" size={24} />
                <h4 className="font-medium">Update Deliveries</h4>
                <p className="text-sm text-gray-600">Track shipment status</p>
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <DollarSign className="text-green-600 mb-2" size={24} />
                <h4 className="font-medium">Process Payments</h4>
                <p className="text-sm text-gray-600">Record supplier payments</p>
              </button>
              <button
                onClick={handleExportData}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <Download className="text-purple-600 mb-2" size={24} />
                <h4 className="font-medium">Generate Reports</h4>
                <p className="text-sm text-gray-600">Export tracking data</p>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by PO number, client, or project..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-80"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="all">All Statuses</option>
                {Object.entries(DELIVERY_STATUSES).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
            </div>
            
            <div className="text-sm text-gray-600">
              {filteredPOs.length} purchase orders
            </div>
          </div>
          
          {/* Delivery Cards */}
          <div className="space-y-4">
            {filteredPOs.map(po => (
              <DeliveryTrackingCard
                key={po.id}
                poId={po.id}
                purchaseOrder={po}
                deliveryData={deliveryTracking[po.id]}
                onUpdateStatus={handleUpdateDeliveryStatus}
                onViewDetails={() => toast.info('View details feature will be implemented')}
              />
            ))}
            
            {filteredPOs.length === 0 && (
              <div className="text-center py-12">
                <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No deliveries found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'payment' && (
        <div className="space-y-6">
          {/* Payment Cards */}
          <div className="space-y-4">
            {Object.entries(paymentTracking).map(([supplierId, paymentData]) => {
              const supplierData = state.suppliers.find(s => s.id === supplierId);
              return (
                <PaymentTrackingCard
                  key={supplierId}
                  supplierId={supplierId}
                  supplierData={supplierData}
                  paymentData={paymentData}
                  onUpdatePayment={handleUpdatePaymentStatus}
                />
              );
            })}
            
            {Object.keys(paymentTracking).length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No payments to track</h3>
                <p className="text-gray-600">Payment tracking will appear here once suppliers are selected</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
