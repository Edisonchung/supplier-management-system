/**
 * ApprovalQueue.jsx
 * 
 * Manager view for approving/rejecting costing entries
 */

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  FileText,
  Building2,
  User,
  Calendar,
  DollarSign,
  Filter,
  ChevronDown,
  Image
} from 'lucide-react';
import { useApprovalQueue } from '../../hooks/useCostingEntries';
import { COST_CATEGORIES } from '../../services/CostingService';

// ============================================================================
// APPROVAL QUEUE COMPONENT
// ============================================================================

const ApprovalQueue = ({ 
  approverId,
  companyFilter = null,
  onViewEntry,
  onViewJobCode
}) => {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  
  const { 
    queue, 
    loading, 
    error, 
    count,
    approveEntry, 
    rejectEntry 
  } = useApprovalQueue(approverId, { companyPrefix: companyFilter });
  
  // Handle approve
  const handleApprove = async (entry) => {
    setActionLoading(entry.id);
    try {
      await approveEntry(entry.id, approverId, entry.assignedApproverName || 'Manager', '');
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Handle reject
  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    
    setActionLoading(selectedEntry.id);
    try {
      await rejectEntry(selectedEntry.id, approverId, selectedEntry.assignedApproverName || 'Manager', rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedEntry(null);
    } catch (error) {
      console.error('Rejection failed:', error);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Open reject modal
  const openRejectModal = (entry) => {
    setSelectedEntry(entry);
    setShowRejectModal(true);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        Error loading approval queue: {error}
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Approval Queue
          </h2>
          {count > 0 && (
            <span className="px-2 py-1 text-sm font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
              {count} pending
            </span>
          )}
        </div>
      </div>
      
      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">All caught up!</h3>
          <p className="text-gray-500 mt-1">No entries pending approval</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((entry) => (
            <ApprovalCard
              key={entry.id}
              entry={entry}
              onApprove={() => handleApprove(entry)}
              onReject={() => openRejectModal(entry)}
              onView={() => onViewEntry?.(entry.id)}
              onViewJobCode={() => onViewJobCode?.(entry.jobCode)}
              loading={actionLoading === entry.id}
            />
          ))}
        </div>
      )}
      
      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reject Entry
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedEntry?.jobCode} - {selectedEntry?.vendor || 'No vendor'}
              </p>
            </div>
            
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Please provide a reason for rejection..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                autoFocus
              />
            </div>
            
            <div className="flex gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedEntry(null);
                }}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || actionLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {actionLoading ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// APPROVAL CARD
// ============================================================================

const ApprovalCard = ({ 
  entry, 
  onApprove, 
  onReject, 
  onView, 
  onViewJobCode,
  loading 
}) => {
  const [expanded, setExpanded] = useState(false);
  
  // Priority indicator
  const getPriorityBadge = () => {
    if (entry.daysWaiting > 7 || entry.amount > 10000) {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
          <AlertTriangle className="h-3 w-3" />
          Urgent
        </span>
      );
    }
    if (entry.daysWaiting > 3 || entry.amount > 5000) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
          High
        </span>
      );
    }
    return null;
  };
  
  // Category info
  const category = COST_CATEGORIES[entry.category] || { name: entry.category, code: entry.category };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Main Row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Entry Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={onViewJobCode}
                className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                {entry.jobCode}
              </button>
              <span className={`px-2 py-0.5 text-xs rounded ${
                entry.costType === 'pre' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {entry.costType === 'pre' ? 'PRE' : 'POST'}
              </span>
              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                {category.code} - {category.name}
              </span>
              {getPriorityBadge()}
            </div>
            
            <p className="text-gray-900 dark:text-white font-medium truncate">
              {entry.vendor || entry.description || 'No description'}
            </p>
            
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {entry.submittedByName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {entry.date}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {entry.daysWaiting}d ago
              </span>
              {entry.hasAttachments && (
                <span className="flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  Receipt
                </span>
              )}
            </div>
          </div>
          
          {/* Right: Amount & Actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                RM {entry.amount?.toLocaleString() || '0'}
              </p>
              {entry.projectName && (
                <p className="text-xs text-gray-500 truncate max-w-[150px]">
                  {entry.projectName}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={onReject}
                disabled={loading}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Reject"
              >
                <XCircle className="h-5 w-5" />
              </button>
              <button
                onClick={onApprove}
                disabled={loading}
                className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                title="Approve"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Vendor</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {entry.vendor || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Invoice No</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {entry.invoiceNo || '-'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 dark:text-gray-400">Description</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {entry.description || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Submitted From</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {entry.submittedByBranch || '-'}
              </p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Source</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {entry.source || 'HiggsFlow'}
              </p>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={onView}
              className="flex-1 py-2 px-3 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              View Full Details
            </button>
            <button
              onClick={onApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
