// ApprovalWorkflow.jsx - Multi-level quotation approval workflow component
// Handles approval requests, approver assignment, approval/rejection actions

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  Users,
  Send,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  History,
  Shield,
  AlertCircle,
  Loader2,
  Eye,
  FileText,
  DollarSign,
  Calendar,
  ArrowRight,
  Check,
  X,
  RefreshCw,
  Mail,
  Bell
} from 'lucide-react';
import { db } from '../../../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// Approval threshold configuration by company
const APPROVAL_THRESHOLDS = {
  FS: [
    { level: 1, maxAmount: 50000, approverRole: 'sales_manager', label: 'Sales Manager' },
    { level: 2, maxAmount: 200000, approverRole: 'regional_manager', label: 'Regional Manager' },
    { level: 3, maxAmount: 500000, approverRole: 'director', label: 'Director' },
    { level: 4, maxAmount: Infinity, approverRole: 'ceo', label: 'CEO' }
  ],
  FSE: [
    { level: 1, maxAmount: 30000, approverRole: 'sales_manager', label: 'Sales Manager' },
    { level: 2, maxAmount: 100000, approverRole: 'director', label: 'Director' },
    { level: 3, maxAmount: Infinity, approverRole: 'ceo', label: 'CEO' }
  ],
  // Default for other companies
  DEFAULT: [
    { level: 1, maxAmount: 25000, approverRole: 'manager', label: 'Manager' },
    { level: 2, maxAmount: 100000, approverRole: 'director', label: 'Director' },
    { level: 3, maxAmount: Infinity, approverRole: 'executive', label: 'Executive' }
  ]
};

// Status configuration
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'gray', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'amber', icon: Clock },
  approved: { label: 'Approved', color: 'green', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  revision_requested: { label: 'Revision Requested', color: 'orange', icon: AlertTriangle },
  expired: { label: 'Expired', color: 'gray', icon: AlertCircle }
};

const ApprovalWorkflow = ({
  quotationId,
  quotation,
  currentUser,
  onApprovalComplete,
  onStatusChange,
  readOnly = false,
  showHistory = true,
  companyCode = 'FS'
}) => {
  // State
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [pendingApprovers, setPendingApprovers] = useState([]);
  const [availableApprovers, setAvailableApprovers] = useState([]);
  const [selectedApprover, setSelectedApprover] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showApproverSelect, setShowApproverSelect] = useState(false);

  // Get approval thresholds for company
  const thresholds = useMemo(() => {
    return APPROVAL_THRESHOLDS[companyCode] || APPROVAL_THRESHOLDS.DEFAULT;
  }, [companyCode]);

  // Determine required approval level based on quotation amount
  const requiredLevel = useMemo(() => {
    if (!quotation?.grandTotal) return 1;
    const amount = quotation.grandTotal;
    
    for (const threshold of thresholds) {
      if (amount <= threshold.maxAmount) {
        return threshold.level;
      }
    }
    return thresholds[thresholds.length - 1].level;
  }, [quotation?.grandTotal, thresholds]);

  // Get threshold info for required level
  const requiredThreshold = useMemo(() => {
    return thresholds.find(t => t.level === requiredLevel) || thresholds[0];
  }, [thresholds, requiredLevel]);

  // Check if current user can approve
  const canApprove = useMemo(() => {
    if (!currentUser || !approvalStatus) return false;
    if (approvalStatus.status !== 'pending_approval') return false;
    
    // Check if user is an assigned approver
    const isAssignedApprover = pendingApprovers.some(
      a => a.userId === currentUser.uid && a.status === 'pending'
    );
    
    // Check if user has sufficient role level
    const userLevel = currentUser.approvalLevel || 0;
    const hasRoleLevel = userLevel >= requiredLevel;
    
    return isAssignedApprover || hasRoleLevel;
  }, [currentUser, approvalStatus, pendingApprovers, requiredLevel]);

  // Check if current user can submit for approval
  const canSubmitForApproval = useMemo(() => {
    if (!currentUser || !quotation) return false;
    if (quotation.status !== 'draft') return false;
    
    // Creator or sales person can submit
    return quotation.createdBy === currentUser.uid || 
           quotation.salesPersonId === currentUser.uid;
  }, [currentUser, quotation]);

  // Load approval data
  useEffect(() => {
    if (!quotationId) {
      setLoading(false);
      return;
    }

    const loadApprovalData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get approval status
        const approvalRef = doc(db, 'quotationApprovals', quotationId);
        const approvalSnap = await getDoc(approvalRef);
        
        if (approvalSnap.exists()) {
          setApprovalStatus(approvalSnap.data());
        } else {
          // Create default status
          setApprovalStatus({
            quotationId,
            status: quotation?.status || 'draft',
            requiredLevel,
            currentLevel: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Load available approvers
        await loadAvailableApprovers();

      } catch (err) {
        console.error('Error loading approval data:', err);
        setError('Failed to load approval information');
      } finally {
        setLoading(false);
      }
    };

    loadApprovalData();
  }, [quotationId, quotation?.status, requiredLevel]);

  // Subscribe to approval history
  useEffect(() => {
    if (!quotationId) return;

    const historyQuery = query(
      collection(db, 'approvalHistory'),
      where('quotationId', '==', quotationId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setApprovalHistory(history);
    }, (err) => {
      console.error('Error subscribing to approval history:', err);
      // Use mock data for demo
      setApprovalHistory(generateMockHistory());
    });

    return () => unsubscribe();
  }, [quotationId]);

  // Subscribe to pending approvers
  useEffect(() => {
    if (!quotationId) return;

    const approversQuery = query(
      collection(db, 'pendingApprovers'),
      where('quotationId', '==', quotationId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(approversQuery, (snapshot) => {
      const approvers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPendingApprovers(approvers);
    }, (err) => {
      console.error('Error subscribing to pending approvers:', err);
    });

    return () => unsubscribe();
  }, [quotationId]);

  // Load available approvers based on required level
  const loadAvailableApprovers = async () => {
    try {
      // In production, query users with appropriate approval roles
      // For demo, use mock data
      const mockApprovers = [
        { id: 'user1', name: 'John Smith', role: 'sales_manager', level: 1, email: 'john@flowsolution.com' },
        { id: 'user2', name: 'Sarah Johnson', role: 'regional_manager', level: 2, email: 'sarah@flowsolution.com' },
        { id: 'user3', name: 'Michael Lee', role: 'director', level: 3, email: 'michael@flowsolution.com' },
        { id: 'user4', name: 'David Chen', role: 'ceo', level: 4, email: 'david@flowsolution.com' }
      ];
      
      // Filter by required level
      const eligible = mockApprovers.filter(a => a.level >= requiredLevel);
      setAvailableApprovers(eligible);
    } catch (err) {
      console.error('Error loading approvers:', err);
    }
  };

  // Generate mock history for demo
  const generateMockHistory = () => {
    return [
      {
        id: 'hist1',
        action: 'submitted',
        userId: 'user_creator',
        userName: 'Edison Chung',
        comments: 'Please review and approve',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        id: 'hist2',
        action: 'assigned',
        userId: 'user1',
        userName: 'John Smith',
        assignedBy: 'Edison Chung',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
      }
    ];
  };

  // Submit for approval
  const handleSubmitForApproval = async () => {
    if (!selectedApprover && availableApprovers.length > 0) {
      setError('Please select an approver');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const approver = availableApprovers.find(a => a.id === selectedApprover);

      // Update quotation status
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        status: 'pending_approval',
        submittedAt: serverTimestamp(),
        submittedBy: currentUser.uid
      });

      // Create or update approval record
      const approvalRef = doc(db, 'quotationApprovals', quotationId);
      await updateDoc(approvalRef, {
        status: 'pending_approval',
        requiredLevel,
        currentLevel: 0,
        submittedAt: serverTimestamp(),
        submittedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      }).catch(async () => {
        // Create if doesn't exist
        await addDoc(collection(db, 'quotationApprovals'), {
          quotationId,
          status: 'pending_approval',
          requiredLevel,
          currentLevel: 0,
          submittedAt: serverTimestamp(),
          submittedBy: currentUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });

      // Add pending approver
      if (approver) {
        await addDoc(collection(db, 'pendingApprovers'), {
          quotationId,
          userId: approver.id,
          userName: approver.name,
          userEmail: approver.email,
          role: approver.role,
          level: approver.level,
          status: 'pending',
          assignedAt: serverTimestamp(),
          assignedBy: currentUser.uid
        });
      }

      // Add to history
      await addDoc(collection(db, 'approvalHistory'), {
        quotationId,
        action: 'submitted',
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        comments: comments || 'Submitted for approval',
        assignedTo: approver?.name,
        timestamp: serverTimestamp()
      });

      // Notify
      onStatusChange?.('pending_approval');
      setShowApproverSelect(false);
      setComments('');
      setSelectedApprover('');

    } catch (err) {
      console.error('Error submitting for approval:', err);
      setError('Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve quotation
  const handleApprove = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const userLevel = currentUser.approvalLevel || requiredLevel;
      const isFullyApproved = userLevel >= requiredLevel;

      // Update quotation status
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        status: isFullyApproved ? 'approved' : 'pending_approval',
        approvedAt: isFullyApproved ? serverTimestamp() : null,
        approvedBy: isFullyApproved ? currentUser.uid : null,
        lastApprovalAt: serverTimestamp(),
        lastApprovalBy: currentUser.uid
      });

      // Update approval record
      const approvalRef = doc(db, 'quotationApprovals', quotationId);
      await updateDoc(approvalRef, {
        status: isFullyApproved ? 'approved' : 'pending_approval',
        currentLevel: userLevel,
        updatedAt: serverTimestamp()
      });

      // Update pending approver status
      const pendingApprover = pendingApprovers.find(a => a.userId === currentUser.uid);
      if (pendingApprover) {
        const approverRef = doc(db, 'pendingApprovers', pendingApprover.id);
        await updateDoc(approverRef, {
          status: 'approved',
          approvedAt: serverTimestamp()
        });
      }

      // Add to history
      await addDoc(collection(db, 'approvalHistory'), {
        quotationId,
        action: 'approved',
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        comments: comments || 'Approved',
        level: userLevel,
        isFullyApproved,
        timestamp: serverTimestamp()
      });

      // Notify
      if (isFullyApproved) {
        onApprovalComplete?.('approved');
        onStatusChange?.('approved');
      }
      setComments('');

    } catch (err) {
      console.error('Error approving quotation:', err);
      setError('Failed to approve quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Reject quotation
  const handleReject = async () => {
    if (!comments.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Update quotation status
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        rejectedBy: currentUser.uid,
        rejectionReason: comments
      });

      // Update approval record
      const approvalRef = doc(db, 'quotationApprovals', quotationId);
      await updateDoc(approvalRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      // Update pending approver status
      const pendingApprover = pendingApprovers.find(a => a.userId === currentUser.uid);
      if (pendingApprover) {
        const approverRef = doc(db, 'pendingApprovers', pendingApprover.id);
        await updateDoc(approverRef, {
          status: 'rejected',
          rejectedAt: serverTimestamp()
        });
      }

      // Add to history
      await addDoc(collection(db, 'approvalHistory'), {
        quotationId,
        action: 'rejected',
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        comments,
        timestamp: serverTimestamp()
      });

      // Notify
      onApprovalComplete?.('rejected');
      onStatusChange?.('rejected');
      setComments('');

    } catch (err) {
      console.error('Error rejecting quotation:', err);
      setError('Failed to reject quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Request revision
  const handleRequestRevision = async () => {
    if (!comments.trim()) {
      setError('Please provide revision requirements');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Update quotation status
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        status: 'revision_requested',
        revisionRequestedAt: serverTimestamp(),
        revisionRequestedBy: currentUser.uid,
        revisionRequirements: comments
      });

      // Update approval record
      const approvalRef = doc(db, 'quotationApprovals', quotationId);
      await updateDoc(approvalRef, {
        status: 'revision_requested',
        updatedAt: serverTimestamp()
      });

      // Add to history
      await addDoc(collection(db, 'approvalHistory'), {
        quotationId,
        action: 'revision_requested',
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        comments,
        timestamp: serverTimestamp()
      });

      // Notify
      onStatusChange?.('revision_requested');
      setComments('');

    } catch (err) {
      console.error('Error requesting revision:', err);
      setError('Failed to request revision');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency
    }).format(amount || 0);
  };

  // Format relative time
  const formatRelativeTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Get status display
  const getStatusDisplay = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium bg-${config.color}-100 text-${config.color}-700`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading approval workflow...</span>
        </div>
      </div>
    );
  }

  const currentStatus = approvalStatus?.status || quotation?.status || 'draft';

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Approval Workflow</h3>
        </div>
        {getStatusDisplay(currentStatus)}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 hover:text-red-800 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Approval Requirements */}
      <div className="p-4 border-b bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Quotation Amount</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(quotation?.grandTotal, quotation?.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Required Approval</p>
            <p className="font-semibold text-gray-900">
              Level {requiredLevel} - {requiredThreshold.label}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Current Level</p>
            <p className="font-semibold text-gray-900">
              {approvalStatus?.currentLevel || 0} / {requiredLevel}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Threshold</p>
            <p className="font-semibold text-gray-900">
              {requiredThreshold.maxAmount === Infinity 
                ? 'Unlimited' 
                : `Up to ${formatCurrency(requiredThreshold.maxAmount)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Approval Level Progress */}
      <div className="p-4 border-b">
        <p className="text-sm font-medium text-gray-700 mb-3">Approval Progress</p>
        <div className="flex items-center gap-2">
          {thresholds.slice(0, requiredLevel).map((threshold, index) => {
            const isComplete = (approvalStatus?.currentLevel || 0) >= threshold.level;
            const isCurrent = threshold.level === requiredLevel;
            
            return (
              <React.Fragment key={threshold.level}>
                {index > 0 && (
                  <div className={`flex-1 h-1 rounded ${isComplete ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isComplete 
                      ? 'bg-green-500 text-white' 
                      : isCurrent && currentStatus === 'pending_approval'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isComplete ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{threshold.level}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-1 text-center max-w-[80px]">
                    {threshold.label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Pending Approvers */}
      {pendingApprovers.length > 0 && (
        <div className="p-4 border-b">
          <p className="text-sm font-medium text-gray-700 mb-3">Pending Approvers</p>
          <div className="space-y-2">
            {pendingApprovers.map((approver) => (
              <div
                key={approver.id}
                className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center">
                    <User className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{approver.userName}</p>
                    <p className="text-xs text-gray-500">{approver.role} • Level {approver.level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-amber-700">Awaiting Response</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Panel */}
      {!readOnly && (
        <div className="p-4 border-b">
          {/* Draft - Submit for Approval */}
          {currentStatus === 'draft' && canSubmitForApproval && (
            <div className="space-y-4">
              {!showApproverSelect ? (
                <button
                  onClick={() => setShowApproverSelect(true)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit for Approval
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Approver
                    </label>
                    <select
                      value={selectedApprover}
                      onChange={(e) => setSelectedApprover(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">Select an approver...</option>
                      {availableApprovers.map((approver) => (
                        <option key={approver.id} value={approver.id}>
                          {approver.name} - {approver.role} (Level {approver.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={2}
                      placeholder="Add any notes for the approver..."
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitForApproval}
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Submit
                    </button>
                    <button
                      onClick={() => {
                        setShowApproverSelect(false);
                        setSelectedApprover('');
                        setComments('');
                      }}
                      disabled={submitting}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Approval - Approve/Reject/Request Revision */}
          {currentStatus === 'pending_approval' && canApprove && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comments
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  rows={2}
                  placeholder="Add approval comments..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApprove}
                  disabled={submitting}
                  className="flex-1 min-w-[120px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve
                </button>
                <button
                  onClick={handleRequestRevision}
                  disabled={submitting || !comments.trim()}
                  className="flex-1 min-w-[120px] px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Request Revision
                </button>
                <button
                  onClick={handleReject}
                  disabled={submitting || !comments.trim()}
                  className="flex-1 min-w-[120px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Comments are required for rejection or revision requests
              </p>
            </div>
          )}

          {/* Revision Requested - Resubmit */}
          {currentStatus === 'revision_requested' && canSubmitForApproval && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Revision Requested</p>
                    <p className="text-sm text-amber-700 mt-1">
                      {quotation?.revisionRequirements || 'Please review and update the quotation'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowApproverSelect(true)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Resubmit for Approval
              </button>
            </div>
          )}

          {/* Approved Status */}
          {currentStatus === 'approved' && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-500" />
                <div>
                  <p className="font-medium text-green-800">Quotation Approved</p>
                  <p className="text-sm text-green-600">
                    {quotation?.approvedAt 
                      ? `Approved on ${new Date(quotation.approvedAt).toLocaleDateString()}`
                      : 'This quotation has been approved'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Rejected Status */}
          {currentStatus === 'rejected' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="w-8 h-8 text-red-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Quotation Rejected</p>
                  <p className="text-sm text-red-600 mt-1">
                    {quotation?.rejectionReason || 'This quotation has been rejected'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Approval History */}
      {showHistory && (
        <div className="border-t">
          <button
            onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-700">Approval History</span>
              <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">
                {approvalHistory.length}
              </span>
            </div>
            {showHistoryPanel ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showHistoryPanel && (
            <div className="px-4 pb-4 max-h-64 overflow-y-auto">
              {approvalHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No approval history yet</p>
              ) : (
                <div className="space-y-3">
                  {approvalHistory.map((item, index) => {
                    const actionConfig = {
                      submitted: { icon: Send, color: 'blue', label: 'Submitted' },
                      assigned: { icon: User, color: 'purple', label: 'Assigned' },
                      approved: { icon: CheckCircle, color: 'green', label: 'Approved' },
                      rejected: { icon: XCircle, color: 'red', label: 'Rejected' },
                      revision_requested: { icon: AlertTriangle, color: 'amber', label: 'Revision Requested' }
                    };
                    const config = actionConfig[item.action] || actionConfig.submitted;
                    const ActionIcon = config.icon;

                    return (
                      <div key={item.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full bg-${config.color}-100 flex items-center justify-center flex-shrink-0`}>
                          <ActionIcon className={`w-4 h-4 text-${config.color}-600`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900">{item.userName}</span>
                            <span className={`text-${config.color}-600 text-sm`}>{config.label}</span>
                            {item.assignedTo && (
                              <>
                                <ArrowRight className="w-3 h-3 text-gray-400" />
                                <span className="text-sm text-gray-600">{item.assignedTo}</span>
                              </>
                            )}
                          </div>
                          {item.comments && (
                            <p className="text-sm text-gray-600 mt-1">{item.comments}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeTime(item.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notification Preferences */}
      {!readOnly && currentStatus === 'pending_approval' && (
        <div className="px-4 py-3 bg-gray-50 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Bell className="w-4 h-4" />
              <span>Email notifications are enabled</span>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              Manage
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalWorkflow;
