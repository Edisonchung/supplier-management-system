// src/components/procurement/PICard.jsx
import React from 'react';
import { 
  FileText, Calendar, DollarSign, Package, 
  Edit, Trash2, Eye, Truck, MoreVertical,
  Building2, Tag, Clock, CheckCircle, AlertCircle,
  AlertTriangle
} from 'lucide-react';

const PICard = ({ 
  proformaInvoice, 
  supplier, 
  onEdit, 
  onDelete, 
  onUpdateDelivery,
  canEdit, 
  canDelete 
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDeliveryColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'partial': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={14} />;
      case 'in-transit': return <Truck size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'partial': return <AlertTriangle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getPurposeColor = (purpose) => {
    switch (purpose) {
      case 'stock': return 'text-blue-600 bg-blue-50';
      case 'r&d': return 'text-purple-600 bg-purple-50';
      case 'client-order': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Calculate if there are any discrepancies
  const hasDiscrepancies = proformaInvoice.hasDiscrepancy || false;
  
  // Calculate received vs ordered
  const totalOrdered = proformaInvoice.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalReceived = proformaInvoice.items?.reduce((sum, item) => sum + (item.receivedQty || 0), 0) || 0;

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 hover:shadow-md transition-shadow ${
      hasDiscrepancies ? 'border-orange-300' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-gray-900">{proformaInvoice.piNumber}</h3>
            {hasDiscrepancies && (
              <AlertCircle className="h-5 w-5 text-orange-500" title="Has discrepancies" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Building2 size={14} className="text-gray-400" />
            <span className="text-sm text-gray-600">{supplier?.name || 'Unknown Supplier'}</span>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(proformaInvoice.status)}`}>
          {proformaInvoice.status}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar size={14} />
            <span>Date</span>
          </div>
          <span className="text-sm font-medium">
            {new Date(proformaInvoice.date).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign size={14} />
            <span>Total Amount</span>
          </div>
          <span className="text-sm font-bold text-gray-900">
            ${proformaInvoice.totalAmount?.toFixed(2) || '0.00'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Package size={14} />
            <span>Items</span>
          </div>
          <span className="text-sm font-medium">
            {proformaInvoice.items?.length || 0} items
            {totalReceived > 0 && (
              <span className="text-gray-500"> ({totalReceived}/{totalOrdered} received)</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Tag size={14} />
            <span>Purpose</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full capitalize ${getPurposeColor(proformaInvoice.purpose)}`}>
            {proformaInvoice.purpose?.replace('-', ' ') || 'stock'}
          </span>
        </div>
      </div>

      {/* Delivery Status */}
      <div className="border-t pt-4 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Delivery Status</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getDeliveryColor(proformaInvoice.deliveryStatus)}`}>
              {getDeliveryIcon(proformaInvoice.deliveryStatus)}
              {proformaInvoice.deliveryStatus}
            </span>
          </div>
        </div>
        
        {/* Show ETA if in transit */}
        {proformaInvoice.deliveryStatus === 'in-transit' && proformaInvoice.etaDate && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium text-blue-600">
              {new Date(proformaInvoice.etaDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Show received date if delivered */}
        {(proformaInvoice.deliveryStatus === 'delivered' || proformaInvoice.deliveryStatus === 'partial') && 
         proformaInvoice.receivedDate && (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-600">Received:</span>
            <span className="font-medium text-green-600">
              {new Date(proformaInvoice.receivedDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
        >
          <Eye size={16} />
          View
        </button>
        
        {canEdit && proformaInvoice.status === 'confirmed' && (
          <button
            onClick={onUpdateDelivery}
            className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center"
            title="Update Delivery Status"
          >
            <Truck size={16} />
          </button>
        )}
        
        {canDelete && (
          <button
            onClick={onDelete}
            className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Alerts */}
      {proformaInvoice.status === 'confirmed' && proformaInvoice.deliveryStatus === 'pending' && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            <span className="text-xs text-orange-800">Awaiting delivery</span>
          </div>
        </div>
      )}

      {hasDiscrepancies && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-800">Quantity discrepancy in delivery</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PICard;
