// src/components/jobs/JobCodeDetailPage.jsx
// Detail Page for Individual Job Code with Linked Documents

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Package,
  TrendingUp,
  Wrench,
  Beaker,
  Edit,
  Trash2,
  FileText,
  ShoppingCart,
  Building2,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
  RotateCw
} from 'lucide-react';
import { useJobCode } from '../../hooks/useJobCodes';
import useJobCodes, { 
  COMPANY_PREFIXES, 
  JOB_NATURE_CODES, 
  JOB_STATUSES 
} from '../../hooks/useJobCodes';
import jobCodeService from '../../services/JobCodeService';
import { doc, getDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { toast } from 'react-hot-toast';
import CrossReferenceLink from '../common/CrossReferenceLink';
import JobCodeModal from './JobCodeModal';

// Nature code icons
const NATURE_ICONS = {
  P: Package,
  S: TrendingUp,
  SV: Wrench,
  R: Beaker
};

// Format currency
const formatCurrency = (value, currency = 'MYR') => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value || 0);
};

// Format date
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-MY', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

const JobCodeDetailPage = ({ showNotification }) => {
  const { jobCode: jobCodeParam } = useParams();
  const navigate = useNavigate();
  
  // Use the useJobCode hook for single job code fetching
  const decodedJobCode = jobCodeParam ? decodeURIComponent(jobCodeParam) : null;
  const { data: jobData, loading: hookLoading, error: hookError } = useJobCode(decodedJobCode);
  
  const { updateJobCode: updateJobCodeHook } = useJobCodes();

  const [job, setJob] = useState(null);
  const [linkedPOs, setLinkedPOs] = useState([]);
  const [linkedPIs, setLinkedPIs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Fetch full PO data for linked POs
  useEffect(() => {
    const fetchLinkedPODetails = async () => {
      if (!job?.linkedPOs || job.linkedPOs.length === 0) {
        setLinkedPOs([]);
        return;
      }
      
      try {
        const poPromises = job.linkedPOs.map(async (linkedPO) => {
          try {
            const poDoc = await getDoc(doc(db, 'purchaseOrders', linkedPO.id));
            if (poDoc.exists()) {
              const poData = poDoc.data();
              return {
                ...linkedPO,
                ...poData,
                id: poDoc.id
              };
            }
            return linkedPO; // Return minimal data if PO not found
          } catch (err) {
            console.error(`Error fetching PO ${linkedPO.id}:`, err);
            return linkedPO; // Return minimal data on error
          }
        });
        
        const enrichedPOs = await Promise.all(poPromises);
        setLinkedPOs(enrichedPOs);
      } catch (error) {
        console.error('Error fetching linked PO details:', error);
        // Fallback to minimal data
        setLinkedPOs(job.linkedPOs || []);
      }
    };
    
    if (job) {
      fetchLinkedPODetails();
    }
  }, [job]);

  // Load job details and linked documents
  useEffect(() => {
    if (!jobCodeParam) {
      setError('No job code provided');
      setLoading(false);
      return;
    }

    // Use hook data if available
    if (hookLoading) {
      setLoading(true);
      setError(null);
      return;
    }

    if (hookError) {
      setError(hookError);
      setLoading(false);
      return;
    }

    // If hook found the job code, use it
    if (jobData) {
      setJob(jobData);
      // Don't set linkedPOs here - let the useEffect fetch full data
      setLinkedPIs(jobData.linkedPIs || []);
      setLoading(false);
      return;
    }

    // If hook didn't find it (jobData is null but no error), try service as fallback
    // This handles the case where the job code doesn't exist (old PO project codes)
    if (decodedJobCode && !hookLoading && !hookError) {
      setLoading(true);
      setError(null);
      
      jobCodeService.getJobCode(decodedJobCode)
        .then(data => {
          if (data) {
            setJob(data);
            // Don't set linkedPOs here - let the useEffect fetch full data
            setLinkedPIs(data.linkedPIs || []);
          } else {
            setError(`Job code "${decodedJobCode}" not found. This may be a project code from an older purchase order that hasn't been converted to a job code yet.`);
          }
          setLoading(false);
        })
        .catch(err => {
          console.warn(`Job code ${decodedJobCode} not found in Firestore:`, err);
          setError(`Job code "${decodedJobCode}" not found. This may be a project code from an older purchase order that hasn't been converted to a job code yet.`);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [jobCodeParam, decodedJobCode, jobData, hookLoading, hookError]);

  // Handle edit
  const handleEdit = () => {
    setEditModalOpen(true);
  };

  // Handle save after edit
  const handleSaveEdit = async (updatedData) => {
    try {
      const result = await updateJobCodeHook(job.id, updatedData);
      if (result.success) {
        setJob({ ...job, ...updatedData });
        setEditModalOpen(false);
        showNotification?.('Job updated successfully', 'success');
      }
      return result;
    } catch (err) {
      console.error('Error updating job:', err);
      showNotification?.('Failed to update job', 'error');
      return { success: false, error: err.message };
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!job || !job.id) return;
    
    if (window.confirm(`Are you sure you want to cancel job ${job.id}?`)) {
      try {
        await deleteDoc(doc(db, 'jobCodes', job.id));
        showNotification?.('Job cancelled successfully', 'success');
        navigate('/jobs');
      } catch (err) {
        console.error('Error deleting job:', err);
        showNotification?.('Failed to cancel job', 'error');
      }
    }
  };
  
  // Handle refresh values from linked records
  const handleRefreshValues = async () => {
    if (!job || !job.id) return;
    
    setRefreshing(true);
    try {
      // Calculate totalPOValue from linked POs
      let totalPOValue = 0;
      if (linkedPOs && linkedPOs.length > 0) {
        totalPOValue = linkedPOs.reduce((sum, po) => {
          const amount = parseFloat(po.totalAmount) || 0;
          return sum + amount;
        }, 0);
      }
      
      // Calculate totalPIValue from linked PIs
      let totalPIValue = 0;
      if (job.linkedPIs && job.linkedPIs.length > 0) {
        // Fetch full PI data if needed
        const piPromises = job.linkedPIs.map(async (linkedPI) => {
          try {
            const piDoc = await getDoc(doc(db, 'proformaInvoices', linkedPI.id));
            if (piDoc.exists()) {
              return piDoc.data();
            }
            return null;
          } catch (err) {
            console.error(`Error fetching PI ${linkedPI.id}:`, err);
            return null;
          }
        });
        
        const piDataArray = await Promise.all(piPromises);
        totalPIValue = piDataArray.reduce((sum, piData) => {
          if (!piData) return sum;
          const amount = parseFloat(piData.totalAmount) || parseFloat(piData.total) || 0;
          return sum + amount;
        }, 0);
      }
      
      // Calculate gross margin
      const quotedValue = parseFloat(job.quotedValue) || 0;
      const grossMargin = quotedValue - totalPIValue;
      const grossMarginPercentage = quotedValue > 0 ? (grossMargin / quotedValue) * 100 : 0;
      
      // Update job code document
      await updateDoc(doc(db, 'jobCodes', job.id), {
        totalPOValue,
        totalPIValue,
        grossMargin,
        grossMarginPercentage,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setJob({
        ...job,
        totalPOValue,
        totalPIValue,
        grossMargin,
        grossMarginPercentage
      });
      
      toast.success('Financial summary updated');
      showNotification?.('Financial summary updated', 'success');
    } catch (err) {
      console.error('Error refreshing values:', err);
      toast.error('Failed to refresh values');
      showNotification?.('Failed to refresh values', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-600">Loading job details...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center max-w-2xl mx-auto">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-800 mb-2">Job Code Not Found</h3>
          <p className="text-yellow-700 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/jobs')}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              View All Job Codes
            </button>
            {decodedJobCode && (
              <button
                onClick={() => navigate('/jobs', { state: { createFromCode: decodedJobCode } })}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
              >
                Create Job Code
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!job) return null;

  const natureConfig = JOB_NATURE_CODES[job.jobNatureCode];
  const statusConfig = JOB_STATUSES[job.status];
  const NatureIcon = NATURE_ICONS[job.jobNatureCode] || Briefcase;
  const prefixConfig = COMPANY_PREFIXES[job.companyPrefix];

  return (
    <div className="p-6 space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/jobs')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-lg bg-${natureConfig?.color || 'gray'}-100`}>
                <NatureIcon className={`w-6 h-6 text-${natureConfig?.color || 'gray'}-600`} />
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{job.id || job.jobCode}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${statusConfig?.color || 'gray'}-100 text-${statusConfig?.color || 'gray'}-700`}>
                {statusConfig?.label || job.status}
              </span>
            </div>
            <p className="text-gray-500 mt-1">
              {prefixConfig?.name} • {natureConfig?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshValues}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Recalculate financial values from linked records"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Values
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview Card */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Job Overview</h2>
            </div>
            <div className="p-6">
              {/* Title */}
              <div className="mb-4">
                <h3 className="text-xl font-medium text-gray-900">{job.title || 'Untitled Job'}</h3>
                {job.description && (
                  <p className="text-gray-600 mt-2">{job.description}</p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Job Type</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2 mt-1">
                    <NatureIcon className={`w-4 h-4 text-${natureConfig?.color || 'gray'}-600`} />
                    {natureConfig?.name}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Company</p>
                  <p className="font-medium text-gray-900 mt-1">
                    {prefixConfig?.name}
                  </p>
                </div>

                {job.clientName && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 uppercase">Client</p>
                    <div className="mt-1">
                      <CrossReferenceLink
                        type="client"
                        id={job.clientId}
                        label={job.clientName}
                        variant="link"
                        size="md"
                      />
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 uppercase">Currency</p>
                  <p className="font-medium text-gray-900 mt-1">{job.currency || 'MYR'}</p>
                </div>
              </div>

              {/* Dates */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Start Date
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {formatDate(job.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expected End
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {formatDate(job.expectedEndDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Actual End
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {formatDate(job.actualEndDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Linked Purchase Orders */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-green-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                Linked Purchase Orders ({linkedPOs.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {linkedPOs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No linked purchase orders</p>
                </div>
              ) : (
                linkedPOs.map(po => (
                  <div key={po.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CrossReferenceLink
                          type="purchaseOrder"
                          id={po.id}
                          label={po.clientPoNumber || po.poNumber}
                          variant="chip"
                          size="md"
                          showArrow={true}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          {po.clientName} • {formatDate(po.orderDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(po.totalAmount, po.currency)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {po.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Linked Proforma Invoices */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-orange-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-600" />
                Linked Proforma Invoices ({linkedPIs.length})
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {linkedPIs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>No linked proforma invoices</p>
                </div>
              ) : (
                linkedPIs.map(pi => (
                  <div key={pi.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <CrossReferenceLink
                          type="proformaInvoice"
                          id={pi.id}
                          label={pi.piNumber}
                          variant="chip"
                          size="md"
                          showArrow={true}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          {pi.supplierName} • {formatDate(pi.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(pi.grandTotal, pi.currency)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {pi.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Financial Summary */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                Financial Summary
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-500">Quoted Value</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(job.quotedValue, job.currency)}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-500">Total PO Value</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(job.totalPOValue, job.currency)}
                </p>
              </div>

              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-500">Total PI Value (Cost)</p>
                <p className="text-2xl font-bold text-orange-700">
                  {formatCurrency(job.totalPIValue, job.currency)}
                </p>
              </div>

              {job.totalPOValue > 0 && job.totalPIValue > 0 && (
                <div className={`p-4 rounded-lg ${job.totalPOValue > job.totalPIValue ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-sm text-gray-500">Gross Margin</p>
                  <p className={`text-2xl font-bold ${job.totalPOValue > job.totalPIValue ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(job.totalPOValue - job.totalPIValue, job.currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {((job.totalPOValue - job.totalPIValue) / job.totalPOValue * 100).toFixed(1)}% margin
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Purchase Orders
                </span>
                <span className="font-semibold">{job.linkedPOs?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Proforma Invoices
                </span>
                <span className="font-semibold">{job.linkedPIs?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Created
                </span>
                <span className="font-semibold text-sm">{formatDate(job.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* JCCS Info */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">JCCS Code Breakdown</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Company Prefix</span>
                <code className="px-2 py-0.5 bg-white rounded text-blue-600">{job.companyPrefix}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Job Nature</span>
                <code className="px-2 py-0.5 bg-white rounded text-green-600">{job.jobNatureCode}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Running Number</span>
                <code className="px-2 py-0.5 bg-white rounded text-gray-600">{job.runningNumber}</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editModalOpen && (
        <JobCodeModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={handleSaveEdit}
          editingJob={job}
        />
      )}
    </div>
  );
};

export default JobCodeDetailPage;
