/**
 * JobCodeDetailPage.jsx
 * 
 * Detailed view of a job code with costing sheet
 * Shows PRE vs POST cost comparison, entries list, linked documents
 */

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Download, 
  ExternalLink,
  Calendar,
  Building2,
  User,
  MapPin,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Users
} from 'lucide-react';
import { useJobCode } from '../../hooks/useJobCodes';
import { useCostingEntries, COST_CATEGORIES, APPROVAL_STATUSES } from '../../hooks/useCostingEntries';
import CostingEntryForm from './CostingEntryForm';

// ============================================================================
// JOB CODE DETAIL PAGE
// ============================================================================

const CostingSheet = ({ currentUser, approvers = [] }) => {
  const { jobCode } = useParams();
  const navigate = useNavigate();
  
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, entries, documents
  const [costTypeFilter, setCostTypeFilter] = useState('all'); // all, pre, post
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Fetch data
  const { data: jobCodeData, loading: jobLoading, error: jobError } = useJobCode(jobCode);
  const { 
    entries, 
    loading: entriesLoading, 
    summary,
    createEntry,
    updateEntry,
    submitForApproval
  } = useCostingEntries(jobCode);
  
  // Filter entries
  const filteredEntries = useMemo(() => {
    let filtered = [...entries];
    
    if (costTypeFilter !== 'all') {
      filtered = filtered.filter(e => e.costType === costTypeFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.category === categoryFilter);
    }
    
    return filtered;
  }, [entries, costTypeFilter, categoryFilter]);
  
  // Calculate financials
  const financials = useMemo(() => {
    if (!jobCodeData) return null;
    
    const revenue = jobCodeData.totalRevenue || 0;
    const preCost = summary.preCost.total;
    const postCost = summary.postCost.total;
    const grossProfit = revenue - postCost;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const taxDeduction = grossProfit > 0 ? grossProfit * 0.25 : 0;
    const netProfit = grossProfit - taxDeduction;
    const variance = postCost - preCost;
    
    return {
      revenue,
      preCost,
      postCost,
      grossProfit,
      grossMargin,
      taxDeduction,
      netProfit,
      variance,
      varianceStatus: preCost > 0 
        ? (variance > 0 ? 'over_budget' : variance < 0 ? 'under_budget' : 'on_budget')
        : 'no_budget'
    };
  }, [jobCodeData, summary]);
  
  // Handle entry save
  const handleSaveEntry = async (data, submitForApproval = false) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, data, currentUser.uid, currentUser.displayName);
    } else {
      await createEntry({
        ...data,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName,
        branchId: currentUser.branchId,
        branchName: currentUser.branchName,
        companyId: currentUser.companyId,
        companyPrefix: jobCodeData?.companyPrefix
      }, submitForApproval);
    }
    setShowEntryForm(false);
    setEditingEntry(null);
  };
  
  // Handle submit for approval
  const handleSubmitEntry = async (data) => {
    await handleSaveEntry(data, true);
  };
  
  if (jobLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (jobError || !jobCodeData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Job code not found: {jobCode}
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/costing')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-mono text-blue-600">
                    {jobCode}
                  </h1>
                  {jobCodeData.notionProjectUrl && (
                    <a
                      href={jobCodeData.notionProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {jobCodeData.projectName || 'Untitled Project'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {/* Export to Excel */}}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setShowEntryForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Cost Entry
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Project Info & Financial Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Project Info */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Project Info</h3>
            <div className="space-y-3 text-sm">
              <InfoRow icon={<Building2 className="h-4 w-4" />} label="Client" value={jobCodeData.clientName || '-'} />
              <InfoRow icon={<User className="h-4 w-4" />} label="PIC" value={jobCodeData.clientPIC || '-'} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Venue" value={jobCodeData.venue || '-'} />
              <InfoRow 
                icon={<Calendar className="h-4 w-4" />} 
                label="Period" 
                value={jobCodeData.projectDates?.start 
                  ? `${jobCodeData.projectDates.start} - ${jobCodeData.projectDates.end || 'Ongoing'}`
                  : '-'
                } 
              />
              <InfoRow 
                icon={<Users className="h-4 w-4" />} 
                label="Assigned" 
                value={jobCodeData.assignedUsers?.map(u => u.userName).join(', ') || '-'} 
              />
            </div>
          </div>
          
          {/* Financial Summary */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Financial Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FinancialCard
                label="Contract Value"
                value={`RM ${financials?.revenue.toLocaleString() || 0}`}
                color="blue"
              />
              <FinancialCard
                label="POST-Cost"
                value={`RM ${financials?.postCost.toLocaleString() || 0}`}
                subValue={financials?.preCost > 0 ? `Budget: RM ${financials.preCost.toLocaleString()}` : null}
                color="gray"
              />
              <FinancialCard
                label="Gross Profit"
                value={`RM ${financials?.grossProfit.toLocaleString() || 0}`}
                subValue={`${financials?.grossMargin.toFixed(1) || 0}%`}
                color={financials?.grossMargin >= 20 ? 'green' : financials?.grossMargin >= 10 ? 'yellow' : 'red'}
                icon={financials?.grossMargin >= 20 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              />
              <FinancialCard
                label="Net Profit"
                value={`RM ${financials?.netProfit.toLocaleString() || 0}`}
                subValue="After 25% tax"
                color="green"
              />
            </div>
          </div>
        </div>
        
        {/* Category Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Cost Breakdown by Category</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PRE-Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">POST-Cost</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(COST_CATEGORIES).map(([code, cat]) => {
                  const pre = summary.preCost.byCategory[code] || 0;
                  const post = summary.postCost.byCategory[code] || 0;
                  const variance = post - pre;
                  
                  if (pre === 0 && post === 0) return null;
                  
                  return (
                    <tr key={code} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-3">
                        <span className="font-medium">{code}</span>
                        <span className="text-gray-500 ml-2">{cat.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {pre > 0 ? `RM ${pre.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {post > 0 ? `RM ${post.toLocaleString()}` : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right ${
                        variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''
                      }`}>
                        {pre > 0 || post > 0 ? (
                          variance > 0 ? `+RM ${variance.toLocaleString()}` :
                          variance < 0 ? `-RM ${Math.abs(variance).toLocaleString()}` :
                          '-'
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {/* Total row */}
                <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right">
                    RM {summary.preCost.total.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    RM {summary.postCost.total.toLocaleString()}
                  </td>
                  <td className={`px-4 py-3 text-right ${
                    financials?.variance > 0 ? 'text-red-600' : 
                    financials?.variance < 0 ? 'text-green-600' : ''
                  }`}>
                    {financials?.variance > 0 ? '+' : ''}
                    RM {(financials?.variance || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Entries List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">Cost Entries</h3>
            <div className="flex gap-2">
              <select
                value={costTypeFilter}
                onChange={(e) => setCostTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="all">All Types</option>
                <option value="pre">PRE-Cost</option>
                <option value="post">POST-Cost</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="all">All Categories</option>
                {Object.entries(COST_CATEGORIES).map(([code, cat]) => (
                  <option key={code} value={code}>{code} - {cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No entries found
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <EntryRow 
                  key={entry.id} 
                  entry={entry}
                  onEdit={() => {
                    setEditingEntry(entry);
                    setShowEntryForm(true);
                  }}
                />
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Entry Form Modal */}
      {showEntryForm && (
        <CostingEntryForm
          jobCode={jobCode}
          entry={editingEntry}
          onSave={handleSaveEntry}
          onSubmit={handleSubmitEntry}
          onClose={() => {
            setShowEntryForm(false);
            setEditingEntry(null);
          }}
          approvers={approvers}
          currentUser={currentUser}
          companyPrefix={jobCodeData?.companyPrefix}
        />
      )}
    </div>
  );
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-gray-400 mt-0.5">{icon}</span>
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-xs">{label}</p>
      <p className="text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

const FinancialCard = ({ label, value, subValue, color, icon }) => {
  const colorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-900 dark:text-white'
  };
  
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {icon}
        <p className={`text-lg font-semibold ${colorClasses[color]}`}>{value}</p>
      </div>
      {subValue && (
        <p className="text-xs text-gray-400">{subValue}</p>
      )}
    </div>
  );
};

const EntryRow = ({ entry, onEdit }) => {
  const category = COST_CATEGORIES[entry.category];
  
  const statusIcons = {
    draft: <Clock className="h-4 w-4 text-gray-400" />,
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    approved: <CheckCircle className="h-4 w-4 text-green-500" />,
    rejected: <XCircle className="h-4 w-4 text-red-500" />
  };
  
  const canEdit = [APPROVAL_STATUSES.draft, APPROVAL_STATUSES.rejected].includes(entry.approvalStatus);
  
  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs rounded ${
              entry.costType === 'pre'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            }`}>
              {entry.costType === 'pre' ? 'PRE' : 'POST'}
            </span>
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
              {category?.code} - {category?.name}
            </span>
            {statusIcons[entry.approvalStatus]}
          </div>
          
          <p className="font-medium text-gray-900 dark:text-white">
            {entry.vendor || entry.description || 'No description'}
          </p>
          
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>{entry.date}</span>
            {entry.invoiceNo && <span>#{entry.invoiceNo}</span>}
            <span>by {entry.createdByName}</span>
          </div>
          
          {entry.approvalStatus === 'rejected' && entry.rejectionReason && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              {entry.rejectionReason}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">
              RM {entry.amount.toLocaleString()}
            </p>
            {entry.paymentStatus === 'paid' && (
              <p className="text-xs text-green-600">Paid</p>
            )}
            {entry.paymentStatus === 'partial' && (
              <p className="text-xs text-yellow-600">Partial</p>
            )}
          </div>
          
          {canEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostingSheet;
