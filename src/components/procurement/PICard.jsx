// src/components/procurement/PICard.jsx
import React, { useMemo } from 'react';
import { 
  FileText, Calendar, DollarSign, Package, 
  Edit, Trash2, Eye, Truck, MoreVertical,
  Building2, Tag, Clock, CheckCircle, AlertCircle,
  AlertTriangle, CreditCard, Link, Share2, Briefcase
} from 'lucide-react';

const PICard = ({ 
  proformaInvoice, 
  supplier, 
  onEdit, 
  onDelete, 
  onUpdateDelivery,
  onShare,
  onViewDocuments,
  canEdit, 
  canDelete,
  // NEW: Bulk selection props
  bulkMode = false,
  isSelected = false,
  onSelectionChange,
  className = ''
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

  const getPaymentColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-red-100 text-red-800';
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
  
  // ENHANCED: Payment calculations with better error handling and synchronization
const paymentData = useMemo(() => {
  console.log('🔍 PICard: Calculating payment data for PI:', proformaInvoice.piNumber, {
    totalAmount: proformaInvoice.totalAmount,
    totalPaid: proformaInvoice.totalPaid,
    paymentStatus: proformaInvoice.paymentStatus,
    payments: proformaInvoice.payments?.length || 0
  });

  const totalAmount = parseFloat(proformaInvoice.totalAmount || 0);
  
  // ENHANCED: Calculate totalPaid from multiple sources with robust parsing
  let totalPaid = 0;
  
  // Method 1: Use direct totalPaid field (preferred - should be updated by batch payment processor)
  if (proformaInvoice.totalPaid !== undefined && proformaInvoice.totalPaid !== null) {
    const directTotalPaid = parseFloat(proformaInvoice.totalPaid || 0);
    if (!isNaN(directTotalPaid)) {
      totalPaid = directTotalPaid;
    }
  }
  
  // Method 2: Calculate from payments array as fallback - WITH ENHANCED PARSING
  if (totalPaid === 0 && proformaInvoice.payments && Array.isArray(proformaInvoice.payments)) {
    totalPaid = proformaInvoice.payments.reduce((sum, payment) => {
      // ENHANCED: Handle different payment amount field variations and types
      let paymentAmount = 0;
      
      if (payment.amount !== undefined && payment.amount !== null) {
        paymentAmount = parseFloat(payment.amount);
      } else if (payment.allocatedAmount !== undefined && payment.allocatedAmount !== null) {
        paymentAmount = parseFloat(payment.allocatedAmount);
      } else if (payment.paidAmount !== undefined && payment.paidAmount !== null) {
        paymentAmount = parseFloat(payment.paidAmount);
      }
      
      // Only add if it's a valid number
      if (!isNaN(paymentAmount) && paymentAmount > 0) {
        console.log('💰 PICard: Found payment amount:', paymentAmount, 'from payment:', payment.id || payment.reference);
        return sum + paymentAmount;
      } else {
        console.warn('⚠️ PICard: Invalid payment amount in payment:', payment);
        return sum;
      }
    }, 0);
  }
  
  // Calculate remaining balance
  const remainingBalance = Math.max(0, totalAmount - totalPaid);
  
  // Calculate payment progress percentage
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
  
  // ENHANCED: Determine payment status with more robust logic
  let actualPaymentStatus = 'pending';
  if (totalAmount > 0) {
    if (totalPaid >= totalAmount - 0.01) { // Allow small floating point differences
      actualPaymentStatus = 'paid';
    } else if (totalPaid > 0.01) { // Use small tolerance for floating point comparison
      actualPaymentStatus = 'partial';
    }
  }
  
  // Log any discrepancies between calculated and stored payment status
  if (proformaInvoice.paymentStatus && proformaInvoice.paymentStatus !== actualPaymentStatus) {
    console.warn('⚠️ PICard: Payment status mismatch detected:', {
      piNumber: proformaInvoice.piNumber,
      storedStatus: proformaInvoice.paymentStatus,
      calculatedStatus: actualPaymentStatus,
      totalAmount,
      totalPaid,
      remainingBalance,
      paymentsArray: proformaInvoice.payments
    });
  }
  
  return {
    totalAmount,
    totalPaid,
    remainingBalance,
    paymentProgress,
    paymentStatus: actualPaymentStatus, // Use calculated status as source of truth
    hasPayments: totalPaid > 0,
    isFullyPaid: totalPaid >= (totalAmount - 0.01) && totalAmount > 0,
    isPartiallyPaid: totalPaid > 0.01 && totalPaid < (totalAmount - 0.01)
  };
}, [proformaInvoice.totalAmount, proformaInvoice.totalPaid, proformaInvoice.paymentStatus, proformaInvoice.payments]);

  // Handle selection change
  const handleSelectionChange = (e) => {
    e.stopPropagation(); // Prevent card click when checking
    if (onSelectionChange) {
      onSelectionChange(proformaInvoice.id, e.target.checked);
    }
  };

  // Handle card click (only allow edit when not in bulk mode)
  const handleCardClick = () => {
    if (!bulkMode && onEdit) {
      onEdit();
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all border border-gray-100 relative ${
        isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      } ${bulkMode ? 'cursor-pointer hover:bg-gray-50' : ''} ${className}`}
      onClick={bulkMode ? handleSelectionChange : undefined}
    >
      {/* NEW: Selection Checkbox */}
      {bulkMode && (
        <div className="absolute top-3 left-3 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelectionChange}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 bg-white shadow-sm"
          />
        </div>
      )}

      {/* Header */}
      <div className={`flex items-start justify-between mb-4 ${bulkMode ? 'ml-8' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{proformaInvoice.piNumber}</h3>
            <p className="text-sm text-gray-600">{supplier?.name || 'Unknown Supplier'}</p>
            {proformaInvoice.projectCode && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Briefcase size={12} />
                {proformaInvoice.projectCode}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(proformaInvoice.status)}`}>
            {proformaInvoice.status}
          </span>
          
          {hasDiscrepancies && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800" title="Has discrepancies">
              <AlertCircle size={12} />
            </span>  
          )}
          {proformaInvoice.isPriority && (
            <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 border border-red-200 flex items-center gap-1" title={proformaInvoice.priorityReason || 'Priority Payment'}>
            <AlertTriangle size={12} />
              Priority
            </span>
          )}
        </div>
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
            ${paymentData.totalAmount.toFixed(2)}
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

        {proformaInvoice.projectCode && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase size={14} />
              <span>Project</span>
            </div>
            <span className="text-sm font-medium text-blue-600">
              {proformaInvoice.projectCode}
            </span>
          </div>
        )}

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

      {/* FIXED: Payment Status Section */}
      <div className="border-t pt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Payment Status</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${getPaymentColor(paymentData.paymentStatus)}`}>
              <CreditCard size={12} />
              {paymentData.paymentStatus}
            </span>
          </div>
        </div>
        
        {/* ENHANCED: Payment Progress with Real Data */}
        {paymentData.paymentStatus !== 'pending' && paymentData.hasPayments && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className="font-medium text-green-700">
                ${paymentData.totalPaid.toFixed(2)} paid
              </span>
              <span className="font-medium text-orange-700">
                ${paymentData.remainingBalance.toFixed(2)} balance
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  paymentData.paymentProgress >= 100 ? 'bg-green-600' : 
                  paymentData.paymentProgress >= 30 ? 'bg-yellow-600' : 'bg-orange-600'
                }`}
                style={{ width: `${Math.min(paymentData.paymentProgress, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 text-center">
              {paymentData.paymentProgress.toFixed(1)}% completed
            </div>
          </div>
        )}

        {/* Show message for pending payments */}
        {paymentData.paymentStatus === 'pending' && (
          <div className="mt-2 text-xs text-gray-500 text-center py-2 bg-gray-50 rounded">
            No payments received yet
          </div>
        )}
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

      {/* Actions - Only show when NOT in bulk mode */}
      {!bulkMode && (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
          >
            <Eye size={16} />
            View
          </button>
          
          {onViewDocuments && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDocuments();
              }}
              className="bg-purple-100 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center justify-center"
              title="View Documents"
            >
              <FileText size={16} />
            </button>
          )}
          
          {canEdit && proformaInvoice.status === 'confirmed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdateDelivery();
              }}
              className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center"
              title="Update Delivery Status"
            >
              <Truck size={16} />
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="bg-red-100 text-red-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center justify-center"
            >
              <Trash2 size={16} />
            </button>
          )}
          
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="bg-purple-100 text-purple-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center justify-center"
              title="Share PI Link"
            >
              <Share2 size={16} />
            </button>
          )}
        </div>
      )}

      {/* Bulk Mode Instruction */}
      {bulkMode && (
        <div className="text-center py-2 text-sm text-gray-500 border-t">
          {isSelected ? 'Selected for deletion' : 'Click to select for deletion'}
        </div>
      )}
    </div>
  );
};

export default PICard;
