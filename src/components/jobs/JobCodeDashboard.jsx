// src/components/jobs/JobCodeDashboard.jsx
// Job Code Dashboard - Based on JCCS Standard

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Calendar,
  TrendingUp,
  Package,
  Wrench,
  Beaker,
  RefreshCw,
  ChevronDown,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  ArrowUpRight,
  FileText,
  ShoppingCart,
  Building2
} from 'lucide-react';
import useJobCodes, { 
  COMPANY_PREFIXES, 
  JOB_NATURE_CODES, 
  JOB_STATUSES 
} from '../../hooks/useJobCodes';
import { doc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import jobCodeService from '../../services/JobCodeService';
import JobCodeModal from './JobCodeModal';
import JobCodeCard from './JobCodeCard';
import CrossReferenceLink, { LinkedDocumentsSummary } from '../common/CrossReferenceLink';

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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);
};

const JobCodeDashboard = ({ showNotification }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Local filter state
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterNature, setFilterNature] = useState('all');
  const [filterPrefix, setFilterPrefix] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Hook for job codes
  const {
    jobCodes,
    loading,
    error,
    createJobCode,
    updateJobCode,
    assignUser,
    removeUser
  } = useJobCodes();

  // Local state
  const [viewMode, setViewMode] = useState('list');
  const [groupByYear, setGroupByYear] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('id'));
  
  // Filter and calculate stats locally
  const filteredJobCodes = useMemo(() => {
    if (!jobCodes || !Array.isArray(jobCodes)) return [];
    
    let filtered = [...jobCodes];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(job => 
        job.id?.toLowerCase().includes(term) ||
        job.projectName?.toLowerCase().includes(term) ||
        job.clientName?.toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(job => job.status === filterStatus);
    }
    
    // Apply nature filter
    if (filterNature !== 'all') {
      filtered = filtered.filter(job => job.jobNatureCode === filterNature);
    }
    
    // Apply prefix filter
    if (filterPrefix !== 'all') {
      filtered = filtered.filter(job => job.companyPrefix === filterPrefix);
    }
    
    return filtered;
  }, [jobCodes, searchTerm, filterStatus, filterNature, filterPrefix]);
  
  // Calculate stats
  const stats = useMemo(() => {
    if (!jobCodes || !Array.isArray(jobCodes)) {
      return {
        total: 0,
        byStatus: {},
        byNature: {},
        byPrefix: {},
        totalPOValue: 0,
        totalPIValue: 0
      };
    }
    
    const byStatus = {};
    const byNature = {};
    const byPrefix = {};
    let totalPOValue = 0;
    let totalPIValue = 0;
    
    jobCodes.forEach(job => {
      // Count by status
      const status = job.status || 'draft';
      byStatus[status] = (byStatus[status] || 0) + 1;
      
      // Count by nature
      const nature = job.jobNatureCode || 'P';
      byNature[nature] = (byNature[nature] || 0) + 1;
      
      // Count by prefix
      const prefix = job.companyPrefix || 'FS';
      byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
      
      // Sum values
      totalPOValue += job.totalPOValue || 0;
      totalPIValue += job.totalPIValue || 0;
    });
    
    return {
      total: jobCodes.length,
      byStatus,
      byNature,
      byPrefix,
      totalPOValue,
      totalPIValue
    };
  }, [jobCodes]);
  
  // Delete function wrapper
  const deleteJobCode = useCallback(async (jobId) => {
    try {
      await deleteDoc(doc(db, 'jobCodes', jobId));
      return { success: true };
    } catch (err) {
      console.error('Error deleting job code:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Group jobs by year if enabled
  const jobsByYear = useMemo(() => {
    if (!groupByYear) return { 'All': filteredJobCodes };
    
    const grouped = {};
    filteredJobCodes.forEach(job => {
      const year = job.createdAt 
        ? new Date(job.createdAt).getFullYear().toString()
        : 'Unknown';
      if (!grouped[year]) grouped[year] = [];
      grouped[year].push(job);
    });
    
    // Sort years descending
    const sorted = {};
    Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .forEach(year => {
        sorted[year] = grouped[year];
      });
    
    return sorted;
  }, [filteredJobCodes, groupByYear]);

  // Handlers
  const handleCreateJob = () => {
    setEditingJob(null);
    setModalOpen(true);
  };

  const handleEditJob = (job) => {
    setEditingJob(job);
    setModalOpen(true);
  };

  const handleViewJob = (job) => {
    navigate(`/jobs/${encodeURIComponent(job.jobCode)}`);
  };

  const handleDeleteJob = async (job) => {
    if (window.confirm(`Are you sure you want to cancel job ${job.jobCode}?`)) {
      const result = await deleteJobCode(job.id);
      if (result.success) {
        showNotification?.('Job code cancelled successfully', 'success');
      }
    }
  };

  const handleSaveJob = async (jobData) => {
    try {
      if (editingJob) {
        // Update existing job code
        const updateData = {
          title: jobData.title,
          description: jobData.description,
          clientId: jobData.clientId,
          clientName: jobData.clientName,
          status: jobData.status,
          quotedValue: jobData.quotedValue || 0,
          contractValue: jobData.quotedValue || 0,
          totalRevenue: jobData.quotedValue || 0,
          currency: jobData.currency || 'MYR',
          startDate: jobData.startDate,
          expectedEndDate: jobData.expectedEndDate
        };
        const result = await updateJobCode(editingJob.id, updateData);
        if (result && result.success !== false) {
          setModalOpen(false);
          setEditingJob(null);
          showNotification?.('Job code updated successfully', 'success');
          return { success: true };
        }
        return result || { success: false };
      } else {
        // Create new job code
        const jobCode = jobData.jobCode || await jobCodeService.generateJobCode(
          jobData.companyPrefix, 
          jobData.jobNatureCode
        );
        
        const parsed = jobCodeService.parseJobCode(jobCode);
        
        // Create the job code document
        const jobCodeDoc = {
          id: jobCode,
          source: 'manual',
          companyPrefix: parsed.companyPrefix || jobData.companyPrefix,
          jobNatureCode: parsed.jobNatureCode || jobData.jobNatureCode,
          runningNumber: parsed.runningNumber || 0,
          title: jobData.title,
          projectName: jobData.title,
          description: jobData.description || '',
          clientId: jobData.clientId || '',
          clientName: jobData.clientName || '',
          status: jobData.status || 'draft',
          quotedValue: jobData.quotedValue || 0,
          contractValue: jobData.quotedValue || 0,
          totalRevenue: jobData.quotedValue || 0,
          currency: jobData.currency || 'MYR',
          startDate: jobData.startDate || null,
          expectedEndDate: jobData.expectedEndDate || null,
          costingSummary: {
            preCost: { total: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 } },
            postCost: { total: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 } },
            totalPaid: 0,
            totalPayable: 0,
            pendingApprovalCount: 0,
            pendingApprovalAmount: 0,
            byUser: {}
          },
          linkedPOs: [],
          linkedPIs: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        await setDoc(doc(db, 'jobCodes', jobCode), jobCodeDoc);
        
        // Increment counter if we generated the code
        if (!jobData.jobCode) {
          await jobCodeService.incrementJobCodeCounter(
            jobData.companyPrefix, 
            jobData.jobNatureCode
          );
        }
        
        setModalOpen(false);
        setEditingJob(null);
        showNotification?.('Job code created successfully', 'success');
        return { success: true };
      }
    } catch (error) {
      console.error('Error saving job code:', error);
      showNotification?.('Failed to save job code: ' + error.message, 'error');
      return { success: false, error: error.message };
    }
  };

  // Render stats cards
  const renderStatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      {/* Total Jobs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Briefcase className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-xs text-gray-500">Total Jobs</p>
          </div>
        </div>
      </div>

      {/* By Nature */}
      {Object.entries(JOB_NATURE_CODES).map(([code, config]) => {
        const count = stats?.byNature?.[code] || 0;
        const Icon = NATURE_ICONS[code] || Briefcase;
        
        return (
          <div 
            key={code}
            className={`bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-${config.color}-300 transition-colors`}
            onClick={() => setFilterNature(filterNature === code ? 'all' : code)}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${config.color}-100 rounded-lg`}>
                <Icon className={`w-5 h-5 text-${config.color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{config.name}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Total Value */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(stats?.totalPOValue || 0)}
            </p>
            <p className="text-xs text-gray-500">Total PO Value</p>
          </div>
        </div>
      </div>
    </div>
  );

  // Render filters
  const renderFilters = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search job codes, titles, clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          {Object.entries(JOB_STATUSES).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </select>

        {/* Nature Filter */}
        <select
          value={filterNature}
          onChange={(e) => setFilterNature(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          {Object.entries(JOB_NATURE_CODES).map(([code, config]) => (
            <option key={code} value={code}>{config.name} ({code})</option>
          ))}
        </select>

        {/* Company Prefix Filter */}
        <select
          value={filterPrefix}
          onChange={(e) => setFilterPrefix(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Companies</option>
          {Object.entries(COMPANY_PREFIXES).map(([code, config]) => (
            <option key={code} value={code}>{config.name} ({code})</option>
          ))}
        </select>

        {/* View Controls */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Grid view"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            title="List view"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setGroupByYear(!groupByYear)}
            className={`p-2 rounded ${groupByYear ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
            title="Group by year"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  // Render list view
  const renderListView = () => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Linked Docs
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PO Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredJobCodes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No job codes found</h3>
                  <p className="text-gray-500">Create your first job code or adjust filters</p>
                </td>
              </tr>
            ) : (
              filteredJobCodes.map(job => {
                const natureConfig = JOB_NATURE_CODES[job.jobNatureCode];
                const statusConfig = JOB_STATUSES[job.status];
                const NatureIcon = NATURE_ICONS[job.jobNatureCode] || Briefcase;

                return (
                  <tr 
                    key={job.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewJob(job)}
                  >
                    {/* Job Code */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                          {job.jobCode}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-${natureConfig?.color || 'gray'}-100 text-${natureConfig?.color || 'gray'}-700`}>
                        <NatureIcon className="w-3 h-3" />
                        {natureConfig?.name || job.jobNatureCode}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {job.title || '-'}
                      </div>
                    </td>

                    {/* Client */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {job.clientName ? (
                        <CrossReferenceLink
                          type="client"
                          id={job.clientId}
                          label={job.clientName}
                          variant="link"
                          size="sm"
                          showIcon={false}
                        />
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* Linked Docs */}
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <LinkedDocumentsSummary
                        linkedPOs={job.linkedPOs}
                        linkedPIs={job.linkedPIs}
                        compact={true}
                      />
                    </td>

                    {/* PO Value */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(job.totalPOValue, job.currency)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${statusConfig?.color || 'gray'}-100 text-${statusConfig?.color || 'gray'}-700`}>
                        {statusConfig?.label || job.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleViewJob(job)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditJob(job)}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Cancel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Render grid view
  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredJobCodes.length === 0 ? (
        <div className="col-span-full bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Briefcase className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No job codes found</h3>
          <p className="text-gray-500">Create your first job code or adjust filters</p>
        </div>
      ) : (
        filteredJobCodes.map(job => (
          <JobCodeCard
            key={job.id}
            job={job}
            onView={() => handleViewJob(job)}
            onEdit={() => handleEditJob(job)}
            onDelete={() => handleDeleteJob(job)}
          />
        ))
      )}
    </div>
  );

  // Render grouped content
  const renderGroupedContent = () => (
    <div className="space-y-6">
      {Object.entries(jobsByYear).map(([year, jobs]) => (
        <div key={year}>
          {groupByYear && (
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {year}
              <span className="text-sm font-normal text-gray-500">
                ({jobs.length} job{jobs.length !== 1 ? 's' : ''})
              </span>
            </h3>
          )}
          {viewMode === 'list' ? renderListView() : renderGridView()}
        </div>
      ))}
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-600">Loading job codes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Codes</h1>
          <p className="text-gray-600 mt-1">
            JCCS-compliant job tracking • {stats?.total || 0} total jobs
          </p>
        </div>
        <button
          onClick={handleCreateJob}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Job Code
        </button>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {viewMode === 'list' ? renderListView() : renderGridView()}

      {/* JCCS Reference */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">JCCS Code Reference</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {Object.entries(JOB_NATURE_CODES).map(([code, config]) => (
            <div key={code} className="flex items-start gap-2">
              <span className={`font-mono font-bold text-${config.color}-600`}>{code}</span>
              <div>
                <span className="font-medium text-gray-900">{config.name}</span>
                <p className="text-xs text-gray-500">{config.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <JobCodeModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingJob(null);
          }}
          onSave={handleSaveJob}
          editingJob={editingJob}
        />
      )}
    </div>
  );
};

export default JobCodeDashboard;
