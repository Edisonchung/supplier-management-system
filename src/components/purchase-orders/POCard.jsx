// src/components/purchase-orders/POCard.jsx
import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';

// Inline helper function instead of importing
const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const POCard = ({ purchaseOrder, onEdit, onDelete, canEdit, canDelete }) => {
  // Safe calculation of subtotal
  const subtotal = purchaseOrder.items?.reduce((sum, item) => {
    const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
    return sum + itemTotal;
  }, 0) || 0;
  
  // Calculate fulfillment progress based on status
  const fulfillmentProgress = purchaseOrder.status === 'delivered' ? 100 : 
                             purchaseOrder.status === 'processing' ? 50 : 
                             purchaseOrder.status === 'confirmed' ? 25 : 0;

  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{purchaseOrder.poNumber || 'No PO Number'}</h3>
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(purchaseOrder.status)}`}>
            {purchaseOrder.status || 'draft'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Client:</span> {purchaseOrder.clientName || 'No client specified'}
        </p>
        {purchaseOrder.projectCode && (
    <p className="text-sm text-gray-600">
      <span className="font-medium">Project:</span> 
      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
        {purchaseOrder.projectCode}
      </span>
    </p>
  )}
        <p className="text-sm text-gray-600">
          <span className="font-medium">Amount:</span> ${subtotal.toFixed(2)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Order Date:</span> {formatDate(purchaseOrder.orderDate)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Delivery Date:</span> {formatDate(purchaseOrder.requiredDate)}
        </p>
        {purchaseOrder.items && purchaseOrder.items.length > 0 && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Items:</span> {purchaseOrder.items.length}
          </p>
        )}
      </div>

      {/* Fulfillment Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Fulfillment Progress</span>
          <span className="font-medium">{fulfillmentProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${fulfillmentProgress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onEdit(purchaseOrder)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
        >
          <Eye size={16} />
          View
        </button>
        {canEdit && (
          <button 
            onClick={() => onEdit(purchaseOrder)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition-colors"
          >
            <Edit2 size={16} />
            Edit
          </button>
        )}
        {canDelete && (
          <button 
            onClick={() => {
              if (window.confirm('Are you sure you want to delete this purchase order?')) {
                onDelete(purchaseOrder.id);
              }
            }}
            className="flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default POCard;
