/**
 * QuotationDashboard.jsx
 * 
 * Main dashboard for viewing, filtering, and managing quotations
 * Features: Search, filters, status tabs, quick actions, export
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Download, MoreVertical, Eye, Edit, Copy,
  Trash2, Send, CheckCircle, XCircle, Clock, FileText, Building2,
  Users, Calendar, DollarSign, RefreshCw, AlertCircle
} from 'lucide-react';
import { useQuotations } from '../../hooks/useQuotations';
import { useAuth } from '../../context/AuthContext';
import QuotationService from '../../services/QuotationService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import CrossReferenceLink from '../shared/CrossReferenceLink';

// Status configuration
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: FileText },
  pending_approval: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  approved: { label: 'Approved', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle },
  sent: { label: 'Sent', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Send },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: AlertCircle },
  converted: { label: 'Converted', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400', icon: XCircle }
};

const COMPANIES = [
  { code: 'FS', name: 'Flow Solution' },
  { code: 'FSE', name: 'Flow Solution Engineering' },
  { code: 'FSP', name: 'Flow Solution Penang' },
  { code: 'BWS', name: 'Broadwater Solution' },
  { code: 'BWE', name: 'Broadwater Engineering' },
  { code: 'EMIT', name: 'EMI Technology' },
  { code: 'EMIA', name: 'EMI Automation' },
  { code: 'FTS', name: 'Futuresmiths' },
  { code: 'IHS', name: 'Inhaus' }
];

const QuotationDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ company: '', dateFrom: '', dateTo: '', clientTier: '', minValue: '', maxValue: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedQuotations, setSelectedQuotations] = useState([]);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const { quotations, loading, error, refetch } = useQuotations({
    status: activeTab !== 'all' ? activeTab : undefined,
    companyCode: filters.company || undefined
  });

  const filteredQuotations = useMemo(() => {
    if (!quotations) return [];
    return quotations.filter(q => {
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const matchesSearch = q.quotationNumber?.toLowerCase().includes(search) ||
          q.clientName?.toLowerCase().includes(search) ||
          q.subject?.toLowerCase().includes(search) ||
          q.jobCode?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      if (filters.company && q.companyCode !== filters.company) return false;
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        const quotationDate = q.createdAt?.toDate?.() || new Date(q.createdAt);
        if (quotationDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        const quotationDate = q.createdAt?.toDate?.() || new Date(q.createdAt);
        if (quotationDate > toDate) return false;
      }
      if (filters.clientTier && q.clientTier !== filters.clientTier) return false;
      if (filters.minValue && q.grandTotal < parseFloat(filters.minValue)) return false;
      if (filters.maxValue && q.grandTotal > parseFloat(filters.maxValue)) return false;
      return true;
    });
  }, [quotations, searchQuery, filters]);

  const stats = useMemo(() => {
    if (!quotations) return { total: 0, draft: 0, pending: 0, sent: 0, totalValue: 0 };
    return {
      total: quotations.length,
      draft: quotations.filter(q => q.status === 'draft').length,
      pending: quotations.filter(q => q.status === 'pending_approval').length,
      sent: quotations.filter(q => q.status === 'sent').length,
      totalValue: quotations.filter(q => ['sent', 'accepted', 'approved'].includes(q.status))
        .reduce((sum, q) => sum + (q.grandTotalMYR || q.grandTotal || 0), 0)
    };
  }, [quotations]);

  const handleCreateNew = () => navigate('/quotations/new');
  const handleView = (id) => navigate(`/quotations/${id}`);
  const handleEdit = (id) => navigate(`/quotations/${id}/edit`);
  
  const handleDuplicate = async (quotation) => {
    try {
      setIsLoading(true);
      const newQuotation = await QuotationService.duplicateQuotation(quotation.id, user.uid);
      navigate(`/quotations/${newQuotation.id}/edit`);
    } catch (err) {
      console.error('Error duplicating quotation:', err);
      alert('Failed to duplicate quotation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;
    try {
      setIsLoading(true);
      await QuotationService.updateStatus(id, 'cancelled', user.uid);
      refetch();
    } catch (err) {
      console.error('Error deleting quotation:', err);
      alert('Failed to delete quotation');
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ company: '', dateFrom: '', dateTo: '', clientTier: '', minValue: '', maxValue: '' });
    setSearchQuery('');
  };

  const toggleSelectAll = () => {
    setSelectedQuotations(prev => 
      prev.length === filteredQuotations.length ? [] : filteredQuotations.map(q => q.id)
    );
  };

  const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const ActionMenu = ({ quotation, isOpen, onToggle }) => {
    if (!isOpen) return null;
    return (
      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
        <div className="py-1">
          <button onClick={() => { handleView(quotation.id); onToggle(); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
            <Eye className="w-4 h-4" /> View Details
          </button>
          {['draft', 'pending_approval'].includes(quotation.status) && (
            <button onClick={() => { handleEdit(quotation.id); onToggle(); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit
            </button>
          )}
          <button onClick={() => { handleDuplicate(quotation); onToggle(); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button onClick={() => { navigate(`/quotations/${quotation.id}/pdf`); onToggle(); }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2">
            <Download className="w-4 h-4" /> Export PDF
          </button>
          {quotation.status === 'approved' && (
            <button onClick={() => { navigate(`/quotations/${quotation.id}/send`); onToggle(); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-blue-600">
              <Send className="w-4 h-4" /> Send to Client
            </button>
          )}
          {['draft', 'pending_approval'].includes(quotation.status) && (
            <>
              <hr className="my-1 border-gray-200 dark:border-gray-700" />
              <button onClick={() => { handleDelete(quotation.id); onToggle(); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quotations</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and track all quotations across companies</p>
        </div>
        <button onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" /> New Quotation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FileText, color: 'blue', label: 'Total Quotes', value: stats.total },
          { icon: Clock, color: 'yellow', label: 'Pending', value: stats.pending },
          { icon: Send, color: 'purple', label: 'Sent', value: stats.sent },
          { icon: DollarSign, color: 'green', label: 'Pipeline Value', value: formatCurrency(stats.totalValue, 'MYR') }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${stat.color}-100 dark:bg-${stat.color}-900/30 rounded-lg`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by quotation number, client, subject, or job code..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilters ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            <Filter className="w-5 h-5" /> Filters
            {Object.values(filters).some(v => v) && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </button>
          <button onClick={refetch} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {selectedQuotations.length > 0 && (
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              <Download className="w-5 h-5" /> Export ({selectedQuotations.length})
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Company</label>
              <select value={filters.company} onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Companies</option>
                {COMPANIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From Date</label>
              <input type="date" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To Date</label>
              <input type="date" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client Tier</label>
              <select value={filters.clientTier} onChange={(e) => setFilters(prev => ({ ...prev, clientTier: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm">
                <option value="">All Tiers</option>
                <option value="end_user">End User</option>
                <option value="contractor">Contractor</option>
                <option value="trader">Trader</option>
                <option value="si">System Integrator</option>
                <option value="partner">Partner</option>
                <option value="dealer">Dealer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min Value</label>
              <input type="number" placeholder="0" value={filters.minValue} 
                onChange={(e) => setFilters(prev => ({ ...prev, minValue: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max Value</label>
              <input type="number" placeholder="No limit" value={filters.maxValue}
                onChange={(e) => setFilters(prev => ({ ...prev, maxValue: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm" />
            </div>
            <div className="col-span-2 md:col-span-3 lg:col-span-6 flex justify-end">
              <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All' }, { key: 'draft', label: 'Draft' }, { key: 'pending_approval', label: 'Pending' },
          { key: 'approved', label: 'Approved' }, { key: 'sent', label: 'Sent' }, { key: 'accepted', label: 'Accepted' },
          { key: 'rejected', label: 'Rejected' }, { key: 'expired', label: 'Expired' }
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quotations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Loading quotations...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button onClick={refetch} className="mt-2 text-blue-600 hover:underline">Try again</button>
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No quotations found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              {searchQuery || Object.values(filters).some(v => v) ? 'Try adjusting your search or filters' : 'Create your first quotation to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={selectedQuotations.length === filteredQuotations.length}
                      onChange={toggleSelectAll} className="rounded border-gray-300 dark:border-gray-600" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quotation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Valid Until</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">References</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredQuotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selectedQuotations.includes(quotation.id)}
                        onChange={() => setSelectedQuotations(prev => prev.includes(quotation.id) ? prev.filter(id => id !== quotation.id) : [...prev, quotation.id])}
                        className="rounded border-gray-300 dark:border-gray-600" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Building2 className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <button onClick={() => handleView(quotation.id)}
                            className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                            {quotation.quotationNumber}
                          </button>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{quotation.companyCode} • {formatDate(quotation.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{quotation.clientName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{quotation.clientTier?.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-900 dark:text-white max-w-xs truncate">{quotation.subject}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(quotation.grandTotal, quotation.currency)}</p>
                      {quotation.currency !== 'MYR' && quotation.grandTotalMYR && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">≈ {formatCurrency(quotation.grandTotalMYR, 'MYR')}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={quotation.status} />
                      {quotation.isDummyQuote && <span className="ml-2 text-xs text-orange-500">(Dummy)</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">{formatDate(quotation.validUntil)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {quotation.jobCode && <CrossReferenceLink type="jobCode" value={quotation.jobCode} id={quotation.jobCodeId} />}
                        {quotation.relatedPOs?.length > 0 && <span className="text-xs text-gray-500">{quotation.relatedPOs.length} PO(s)</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="relative">
                        <button onClick={() => setActionMenuOpen(actionMenuOpen === quotation.id ? null : quotation.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                        <ActionMenu quotation={quotation} isOpen={actionMenuOpen === quotation.id} onToggle={() => setActionMenuOpen(null)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filteredQuotations.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <span>Showing {filteredQuotations.length} of {quotations?.length || 0} quotations</span>
          <span>Total value: {formatCurrency(filteredQuotations.reduce((sum, q) => sum + (q.grandTotalMYR || q.grandTotal || 0), 0), 'MYR')}</span>
        </div>
      )}

      {actionMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setActionMenuOpen(null)} />}
    </div>
  );
};

export default QuotationDashboard;
