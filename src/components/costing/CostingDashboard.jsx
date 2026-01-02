/**
 * JobCodeDashboard.jsx
 * 
 * Admin dashboard for managing job codes and viewing costing overview
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Briefcase,
  Users,
  Clock,
  ChevronRight,
  Building2,
  ExternalLink
} from 'lucide-react';
import { useJobCodes } from '../../hooks/useJobCodes';

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

const CostingDashboard = ({ 
  onSelectJobCode, 
  onCreateJobCode,
  companyFilter = null,
  showCreateButton = true 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Fetch job codes
  const { jobCodes, loading, error } = useJobCodes({
    companyPrefix: companyFilter
  });
  
  // Filter and sort job codes
  const filteredJobCodes = useMemo(() => {
    if (!jobCodes || !Array.isArray(jobCodes)) return [];
    let filtered = [...jobCodes];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.id.toLowerCase().includes(query) ||
        job.projectName?.toLowerCase().includes(query) ||
        job.clientName?.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter);
    }
    
    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'jobCode':
          comparison = a.id.localeCompare(b.id);
          break;
        case 'revenue':
          comparison = (a.totalRevenue || 0) - (b.totalRevenue || 0);
          break;
        case 'profit':
          comparison = (a.grossProfitPercentage || 0) - (b.grossProfitPercentage || 0);
          break;
        case 'createdAt':
        default:
          comparison = (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  }, [jobCodes, searchQuery, statusFilter, sortBy, sortOrder]);
  
  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!jobCodes || !Array.isArray(jobCodes)) {
      return {
        totalJobs: 0,
        activeJobs: 0,
        totalRevenue: 0,
        totalCost: 0,
        avgMargin: 0,
        pendingApprovals: 0
      };
    }
    
    const activeJobs = jobCodes.filter(j => j.status === 'active');
    return {
      totalJobs: jobCodes.length,
      activeJobs: activeJobs.length,
      totalRevenue: activeJobs.reduce((sum, j) => sum + (j.totalRevenue || 0), 0),
      totalCost: activeJobs.reduce((sum, j) => sum + (j.costingSummary?.postCost?.total || 0), 0),
      avgMargin: activeJobs.length > 0 
        ? activeJobs.reduce((sum, j) => sum + (j.grossProfitPercentage || 0), 0) / activeJobs.length
        : 0,
      pendingApprovals: activeJobs.reduce((sum, j) => sum + (j.costingSummary?.pendingApprovalCount || 0), 0)
    };
  }, [jobCodes]);
  
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
        Error loading job codes: {error}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Job Code Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage project costing and track profitability
          </p>
        </div>
        
        {showCreateButton && (
          <button
            onClick={onCreateJobCode}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Job Code
          </button>
        )}
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Active Jobs"
          value={summaryStats.activeJobs}
          subtitle={`${summaryStats.totalJobs} total`}
          icon={<Briefcase className="h-5 w-5" />}
          color="blue"
        />
        <SummaryCard
          title="Total Revenue"
          value={`RM ${summaryStats.totalRevenue.toLocaleString()}`}
          subtitle="Active projects"
          icon={<DollarSign className="h-5 w-5" />}
          color="green"
        />
        <SummaryCard
          title="Avg Margin"
          value={`${summaryStats.avgMargin.toFixed(1)}%`}
          subtitle="Gross profit"
          icon={summaryStats.avgMargin >= 20 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={summaryStats.avgMargin >= 20 ? 'green' : 'yellow'}
        />
        <SummaryCard
          title="Pending Approvals"
          value={summaryStats.pendingApprovals}
          subtitle="Cost entries"
          icon={<Clock className="h-5 w-5" />}
          color={summaryStats.pendingApprovals > 0 ? 'orange' : 'gray'}
        />
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search job codes, projects, clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
        </select>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="createdAt">Date Created</option>
          <option value="jobCode">Job Code</option>
          <option value="revenue">Revenue</option>
          <option value="profit">Profit Margin</option>
        </select>
      </div>
      
      {/* Job Code Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Job Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  PRE-Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  POST-Cost
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Margin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredJobCodes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No job codes found
                  </td>
                </tr>
              ) : (
                filteredJobCodes.map((job) => (
                  <JobCodeRow 
                    key={job.id} 
                    jobCode={job} 
                    onClick={() => onSelectJobCode(job.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SummaryCard = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    gray: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

const JobCodeRow = ({ jobCode, onClick }) => {
  const preCost = jobCode.costingSummary?.preCost?.total || 0;
  const postCost = jobCode.costingSummary?.postCost?.total || 0;
  const revenue = jobCode.totalRevenue || 0;
  const margin = jobCode.grossProfitPercentage || 0;
  
  // Determine margin color
  let marginColor = 'text-green-600 dark:text-green-400';
  if (margin < 10) marginColor = 'text-red-600 dark:text-red-400';
  else if (margin < 20) marginColor = 'text-yellow-600 dark:text-yellow-400';
  
  // Status badge colors
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  };
  
  return (
    <tr 
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
            {jobCode.id}
          </span>
          {jobCode.notionProjectUrl && (
            <a 
              href={jobCode.notionProjectUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900 dark:text-white truncate max-w-xs">
            {jobCode.projectName || '-'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {jobCode.clientName || '-'}
          </p>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">
        RM {revenue.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
        {preCost > 0 ? `RM ${preCost.toLocaleString()}` : '-'}
      </td>
      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
        {postCost > 0 ? `RM ${postCost.toLocaleString()}` : '-'}
      </td>
      <td className={`px-4 py-3 text-right font-medium ${marginColor}`}>
        {margin.toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[jobCode.status] || statusColors.draft}`}>
          {jobCode.status || 'draft'}
        </span>
      </td>
      <td className="px-4 py-3">
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </td>
    </tr>
  );
};

export default CostingDashboard;
