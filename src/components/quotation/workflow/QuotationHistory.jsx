// QuotationHistory.jsx - Quotation version history and audit trail component
// Tracks all changes, versions, and provides comparison functionality

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  Clock,
  User,
  FileText,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Plus,
  Minus,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  Loader2,
  Check,
  X,
  Copy,
  ExternalLink,
  GitBranch,
  GitCommit,
  Diff
} from 'lucide-react';
import { db } from '../../../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';

// Change type configuration
const CHANGE_TYPES = {
  created: { label: 'Created', color: 'green', icon: Plus },
  updated: { label: 'Updated', color: 'blue', icon: Edit },
  status_change: { label: 'Status Changed', color: 'purple', icon: RefreshCw },
  line_added: { label: 'Line Added', color: 'green', icon: Plus },
  line_removed: { label: 'Line Removed', color: 'red', icon: Minus },
  line_updated: { label: 'Line Updated', color: 'amber', icon: Edit },
  pricing_updated: { label: 'Pricing Updated', color: 'cyan', icon: DollarSign },
  contact_changed: { label: 'Contact Changed', color: 'indigo', icon: User },
  revision_created: { label: 'Revision Created', color: 'orange', icon: GitBranch },
  sent: { label: 'Sent to Client', color: 'teal', icon: ExternalLink },
  viewed: { label: 'Viewed by Client', color: 'gray', icon: Eye },
  downloaded: { label: 'Downloaded', color: 'gray', icon: Download }
};

// Field display names
const FIELD_LABELS = {
  clientName: 'Client Name',
  clientId: 'Client',
  contactId: 'Contact',
  contactName: 'Contact Name',
  contactEmail: 'Contact Email',
  validUntil: 'Valid Until',
  currency: 'Currency',
  paymentTerms: 'Payment Terms',
  deliveryTerms: 'Delivery Terms',
  notes: 'Notes',
  internalNotes: 'Internal Notes',
  status: 'Status',
  grandTotal: 'Grand Total',
  subtotal: 'Subtotal',
  taxAmount: 'Tax Amount',
  discountAmount: 'Discount Amount',
  shippingAmount: 'Shipping Amount',
  lines: 'Line Items'
};

const QuotationHistory = ({
  quotationId,
  quotation,
  onRestoreVersion,
  onCompareVersions,
  maxItems = 50,
  showFilters = true,
  showVersionControl = true,
  compactMode = false
}) => {
  // State
  const [history, setHistory] = useState([]);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [showVersionsPanel, setShowVersionsPanel] = useState(false);

  // Subscribe to history
  useEffect(() => {
    if (!quotationId) {
      setLoading(false);
      return;
    }

    const historyQuery = query(
      collection(db, 'quotationHistory'),
      where('quotationId', '==', quotationId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(historyQuery, (snapshot) => {
      const historyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
      setHistory(historyData);
      setLoading(false);
    }, (err) => {
      console.error('Error subscribing to history:', err);
      // Use mock data for demo
      setHistory(generateMockHistory());
      setLoading(false);
    });

    return () => unsubscribe();
  }, [quotationId]);

  // Subscribe to versions
  useEffect(() => {
    if (!quotationId) return;

    const versionsQuery = query(
      collection(db, 'quotationVersions'),
      where('quotationId', '==', quotationId),
      orderBy('version', 'desc')
    );

    const unsubscribe = onSnapshot(versionsQuery, (snapshot) => {
      const versionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setVersions(versionsData);
    }, (err) => {
      console.error('Error subscribing to versions:', err);
      // Use mock versions for demo
      setVersions(generateMockVersions());
    });

    return () => unsubscribe();
  }, [quotationId]);

  // Generate mock history for demo
  const generateMockHistory = () => {
    const now = Date.now();
    return [
      {
        id: 'hist1',
        type: 'created',
        userId: 'user1',
        userName: 'Edison Chung',
        timestamp: new Date(now - 7 * 24 * 60 * 60 * 1000),
        changes: []
      },
      {
        id: 'hist2',
        type: 'line_added',
        userId: 'user1',
        userName: 'Edison Chung',
        timestamp: new Date(now - 6 * 24 * 60 * 60 * 1000),
        changes: [
          { field: 'lines', added: { productName: 'Grundfos CR 10-5', quantity: 2 } }
        ]
      },
      {
        id: 'hist3',
        type: 'pricing_updated',
        userId: 'user1',
        userName: 'Edison Chung',
        timestamp: new Date(now - 5 * 24 * 60 * 60 * 1000),
        changes: [
          { field: 'grandTotal', oldValue: 15000, newValue: 18500 }
        ]
      },
      {
        id: 'hist4',
        type: 'status_change',
        userId: 'user2',
        userName: 'Sarah Johnson',
        timestamp: new Date(now - 4 * 24 * 60 * 60 * 1000),
        changes: [
          { field: 'status', oldValue: 'draft', newValue: 'pending_approval' }
        ]
      },
      {
        id: 'hist5',
        type: 'revision_created',
        userId: 'user1',
        userName: 'Edison Chung',
        timestamp: new Date(now - 2 * 24 * 60 * 60 * 1000),
        changes: [],
        version: 2,
        reason: 'Client requested updated pricing'
      },
      {
        id: 'hist6',
        type: 'sent',
        userId: 'user1',
        userName: 'Edison Chung',
        timestamp: new Date(now - 1 * 24 * 60 * 60 * 1000),
        changes: [],
        recipient: 'john.doe@client.com'
      },
      {
        id: 'hist7',
        type: 'viewed',
        userId: 'external',
        userName: 'John Doe (Client)',
        timestamp: new Date(now - 12 * 60 * 60 * 1000),
        changes: []
      }
    ];
  };

  // Generate mock versions for demo
  const generateMockVersions = () => {
    const now = Date.now();
    return [
      {
        id: 'ver1',
        quotationId,
        version: 1,
        createdAt: new Date(now - 7 * 24 * 60 * 60 * 1000),
        createdBy: 'user1',
        createdByName: 'Edison Chung',
        grandTotal: 15000,
        lineCount: 3,
        status: 'archived',
        note: 'Initial version'
      },
      {
        id: 'ver2',
        quotationId,
        version: 2,
        createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
        createdBy: 'user1',
        createdByName: 'Edison Chung',
        grandTotal: 18500,
        lineCount: 4,
        status: 'current',
        note: 'Updated pricing per client request'
      }
    ];
  };

  // Filter history
  const filteredHistory = useMemo(() => {
    let filtered = [...history];

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.userName?.toLowerCase().includes(query) ||
        item.type?.toLowerCase().includes(query) ||
        JSON.stringify(item.changes).toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (dateRange.start) {
      filtered = filtered.filter(item => item.timestamp >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(item => item.timestamp <= new Date(dateRange.end));
    }

    return filtered.slice(0, maxItems);
  }, [history, filterType, searchQuery, dateRange, maxItems]);

  // Toggle item expansion
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Toggle version selection for comparison
  const toggleVersionSelection = (versionId) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  };

  // Handle version comparison
  const handleCompareVersions = () => {
    if (selectedVersions.length === 2) {
      onCompareVersions?.(selectedVersions[0], selectedVersions[1]);
      setShowCompareModal(true);
    }
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

  // Format currency
  const formatCurrency = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency
    }).format(amount || 0);
  };

  // Format change value
  const formatChangeValue = (field, value) => {
    if (value === null || value === undefined) return 'Empty';
    
    if (['grandTotal', 'subtotal', 'taxAmount', 'discountAmount', 'shippingAmount'].includes(field)) {
      return formatCurrency(value);
    }
    
    if (field === 'validUntil' && value) {
      return new Date(value).toLocaleDateString();
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    
    return String(value);
  };

  // Render change details
  const renderChangeDetails = (change) => {
    const fieldLabel = FIELD_LABELS[change.field] || change.field;
    
    if (change.added) {
      return (
        <div className="flex items-start gap-2 p-2 bg-green-50 rounded text-sm">
          <Plus className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-green-700">Added {fieldLabel}:</span>
            <pre className="text-green-800 mt-1 text-xs whitespace-pre-wrap">
              {typeof change.added === 'object' 
                ? JSON.stringify(change.added, null, 2)
                : change.added}
            </pre>
          </div>
        </div>
      );
    }
    
    if (change.removed) {
      return (
        <div className="flex items-start gap-2 p-2 bg-red-50 rounded text-sm">
          <Minus className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-red-700">Removed {fieldLabel}:</span>
            <pre className="text-red-800 mt-1 text-xs whitespace-pre-wrap">
              {typeof change.removed === 'object'
                ? JSON.stringify(change.removed, null, 2)
                : change.removed}
            </pre>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded text-sm">
        <Edit className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-medium text-blue-700">{fieldLabel}</span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-gray-500 line-through text-xs">
              {formatChangeValue(change.field, change.oldValue)}
            </span>
            <ArrowRight className="w-3 h-3 text-gray-400" />
            <span className="text-blue-800 text-xs font-medium">
              {formatChangeValue(change.field, change.newValue)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render history item
  const renderHistoryItem = (item) => {
    const config = CHANGE_TYPES[item.type] || CHANGE_TYPES.updated;
    const TypeIcon = config.icon;
    const isExpanded = expandedItems.has(item.id);
    const hasDetails = item.changes?.length > 0 || item.reason || item.recipient;

    return (
      <div key={item.id} className="border-l-2 border-gray-200 pl-4 pb-4 last:pb-0">
        <div className="relative">
          {/* Timeline dot */}
          <div className={`absolute -left-[21px] w-3 h-3 rounded-full bg-${config.color}-500`} />
          
          {/* Main content */}
          <div className={`${hasDetails ? 'cursor-pointer' : ''}`} onClick={() => hasDetails && toggleExpanded(item.id)}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg bg-${config.color}-100`}>
                  <TypeIcon className={`w-4 h-4 text-${config.color}-600`} />
                </div>
                <div>
                  <span className={`font-medium text-${config.color}-700`}>{config.label}</span>
                  {item.version && (
                    <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                      v{item.version}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(item.timestamp)}</span>
                {hasDetails && (
                  isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
              <User className="w-3 h-3" />
              <span>{item.userName}</span>
              {item.recipient && (
                <>
                  <ArrowRight className="w-3 h-3" />
                  <span>{item.recipient}</span>
                </>
              )}
            </div>
          </div>

          {/* Expanded details */}
          {isExpanded && hasDetails && (
            <div className="mt-3 space-y-2">
              {item.reason && (
                <div className="p-2 bg-gray-50 rounded text-sm">
                  <span className="font-medium text-gray-700">Reason: </span>
                  <span className="text-gray-600">{item.reason}</span>
                </div>
              )}
              
              {item.changes?.map((change, idx) => (
                <div key={idx}>
                  {renderChangeDetails(change)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading history...</span>
        </div>
      </div>
    );
  }

  // Compact mode rendering
  if (compactMode) {
    return (
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Recent Activity</span>
          </div>
          <span className="text-xs text-gray-500">{history.length} changes</span>
        </div>
        <div className="p-4 max-h-48 overflow-y-auto">
          {filteredHistory.slice(0, 5).map(item => {
            const config = CHANGE_TYPES[item.type] || CHANGE_TYPES.updated;
            const TypeIcon = config.icon;
            
            return (
              <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className={`p-1 rounded bg-${config.color}-100`}>
                  <TypeIcon className={`w-3 h-3 text-${config.color}-600`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{config.label}</p>
                  <p className="text-xs text-gray-500">{item.userName}</p>
                </div>
                <span className="text-xs text-gray-400">{formatRelativeTime(item.timestamp)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">History & Versions</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{history.length} changes</span>
          {versions.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              v{versions[0]?.version || 1}
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b bg-gray-50">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All Types</option>
              {Object.entries(CHANGE_TYPES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateRange.start || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-2 py-2 border rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end || ''}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-2 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Version Control Panel */}
      {showVersionControl && versions.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setShowVersionsPanel(!showVersionsPanel)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-purple-500" />
              <span className="font-medium text-gray-700">Versions</span>
              <span className="px-2 py-0.5 bg-purple-100 rounded-full text-xs text-purple-700">
                {versions.length}
              </span>
            </div>
            {showVersionsPanel ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {showVersionsPanel && (
            <div className="px-4 pb-4">
              {/* Compare action */}
              {selectedVersions.length === 2 && (
                <div className="mb-3 p-2 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    Comparing v{versions.find(v => v.id === selectedVersions[0])?.version} with v{versions.find(v => v.id === selectedVersions[1])?.version}
                  </span>
                  <button
                    onClick={handleCompareVersions}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-1"
                  >
                    <Diff className="w-4 h-4" />
                    Compare
                  </button>
                </div>
              )}

              {/* Version list */}
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border ${
                      version.status === 'current' 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-200 bg-white'
                    } ${selectedVersions.includes(version.id) ? 'ring-2 ring-blue-300' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleVersionSelection(version.id)}
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedVersions.includes(version.id)
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedVersions.includes(version.id) && <Check className="w-3 h-3" />}
                        </button>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">Version {version.version}</span>
                            {version.status === 'current' && (
                              <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {version.createdByName} • {formatRelativeTime(version.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(version.grandTotal)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {version.lineCount} items
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {/* View version */}}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="View version"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {version.status !== 'current' && onRestoreVersion && (
                            <button
                              onClick={() => onRestoreVersion(version.id)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Restore this version"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {version.note && (
                      <p className="mt-2 text-sm text-gray-600 pl-8">
                        {version.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-3 text-center">
                Select two versions to compare changes
              </p>
            </div>
          )}
        </div>
      )}

      {/* History Timeline */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No history found</p>
            {(filterType !== 'all' || searchQuery || dateRange.start || dateRange.end) && (
              <button
                onClick={() => {
                  setFilterType('all');
                  setSearchQuery('');
                  setDateRange({ start: null, end: null });
                }}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {filteredHistory.map(item => renderHistoryItem(item))}
          </div>
        )}
      </div>

      {/* Footer */}
      {history.length > maxItems && (
        <div className="px-4 py-3 border-t bg-gray-50 text-center">
          <p className="text-sm text-gray-500">
            Showing {filteredHistory.length} of {history.length} changes
          </p>
        </div>
      )}

      {/* Version Comparison Modal */}
      {showCompareModal && selectedVersions.length === 2 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Diff className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Version Comparison</h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
              <div className="grid grid-cols-2 gap-4">
                {selectedVersions.map((versionId) => {
                  const version = versions.find(v => v.id === versionId);
                  return (
                    <div key={versionId} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-medium text-gray-900">
                          Version {version?.version}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatRelativeTime(version?.createdAt)}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Grand Total</p>
                          <p className="font-semibold">{formatCurrency(version?.grandTotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Line Items</p>
                          <p className="font-semibold">{version?.lineCount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Created By</p>
                          <p className="font-semibold">{version?.createdByName}</p>
                        </div>
                        {version?.note && (
                          <div>
                            <p className="text-xs text-gray-500">Note</p>
                            <p className="text-sm">{version.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 text-center">
                  Detailed field-by-field comparison would be displayed here.
                  <br />
                  This feature requires full version snapshots to be stored.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationHistory;
