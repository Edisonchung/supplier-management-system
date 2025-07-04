// src/components/purchase-orders/POCard.jsx
import React from 'react';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { getStatusColor } from './utils/poHelpers.js';

const POCard = ({ purchaseOrder, onEdit, onDelete, canEdit, canDelete }) => {
  const subtotal = purchaseOrder.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  const fulfillmentProgress = purchaseOrder.status === 'delivered' ? 100 : 
                             purchaseOrder.status === 'processing' ? 50 : 
                             purchaseOrder.status === 'confirmed' ? 25 : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{purchaseOrder.poNumber}</h3>
          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(purchaseOrder.status)}`}>
            {purchaseOrder.status}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Client:</span> {purchaseOrder.clientName}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Amount:</span> ${subtotal.toFixed(2)}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Order Date:</span> {new Date(purchaseOrder.orderDate).toLocaleDateString()}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Delivery Date:</span> {new Date(purchaseOrder.requiredDate).toLocaleDateString()}
        </p>
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
            onClick={() => onDelete(purchaseOrder.id)}
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
