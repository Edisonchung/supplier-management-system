// src/components/quotation/crossref/PIReference.jsx
// Cross-reference component for linking Proforma Invoices to quotations

import React, { useState, useEffect } from 'react';
import { 
  FileText, ExternalLink, Plus, X, Search, Loader2,
  Calendar, DollarSign, Building2, Check, AlertCircle,
  Link2, Unlink
} from 'lucide-react';
import { db } from '../../../config/firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, 
  updateDoc, arrayUnion, arrayRemove, orderBy, limit 
} from 'firebase/firestore';

const PIReference = ({ 
  quotationId, 
  quotationNumber,
  clientId,
  linkedPIs = [],
  onUpdate,
  readOnly = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linkedPIDetails, setLinkedPIDetails] = useState([]);
  const [error, setError] = useState(null);

  // Fetch details for linked PIs
  useEffect(() => {
    const fetchLinkedPIs = async () => {
      if (!linkedPIs || linkedPIs.length === 0) {
        setLinkedPIDetails([]);
        return;
      }

      try {
        setLoading(true);
        const details = await Promise.all(
          linkedPIs.map(async (piId) => {
            const piDoc = await getDoc(doc(db, 'proformaInvoices', piId));
            if (piDoc.exists()) {
              return { id: piDoc.id, ...piDoc.data() };
            }
            return null;
          })
        );
        setLinkedPIDetails(details.filter(Boolean));
      } catch (err) {
        console.error('Error fetching linked PIs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedPIs();
  }, [linkedPIs]);

  // Search for PIs
  const handleSearch = async () => {
    if (!searchQuery.trim() && !clientId) return;

    try {
      setSearching(true);
      setError(null);

      let q;
      if (searchQuery.trim()) {
        // Search by PI number
        q = query(
          collection(db, 'proformaInvoices'),
          where('piNumber', '>=', searchQuery.toUpperCase()),
          where('piNumber', '<=', searchQuery.toUpperCase() + '\uf8ff'),
          limit(20)
        );
      } else if (clientId) {
        // Get PIs for the same client
        q = query(
          collection(db, 'proformaInvoices'),
          where('clientId', '==', clientId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(pi => !linkedPIs.includes(pi.id)); // Exclude already linked

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching PIs:', err);
      setError('Failed to search PIs');
    } finally {
      setSearching(false);
    }
  };

  // Load recent/client PIs when modal opens
  useEffect(() => {
    if (showLinkModal && clientId) {
      handleSearch();
    }
  }, [showLinkModal, clientId]);

  // Debounced search
  useEffect(() => {
    if (!showLinkModal) return;
    
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Link a PI to the quotation
  const handleLink = async (pi) => {
    try {
      setLoading(true);
      setError(null);

      // Update quotation with linked PI
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        linkedPIs: arrayUnion(pi.id),
        updatedAt: new Date().toISOString()
      });

      // Update PI with linked quotation
      const piRef = doc(db, 'proformaInvoices', pi.id);
      await updateDoc(piRef, {
        linkedQuotations: arrayUnion(quotationId),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const newLinkedPIs = [...linkedPIs, pi.id];
      if (onUpdate) {
        onUpdate(newLinkedPIs);
      }

      setLinkedPIDetails(prev => [...prev, pi]);
      setSearchResults(prev => prev.filter(p => p.id !== pi.id));
    } catch (err) {
      console.error('Error linking PI:', err);
      setError('Failed to link PI');
    } finally {
      setLoading(false);
    }
  };

  // Unlink a PI from the quotation
  const handleUnlink = async (piId) => {
    if (!window.confirm('Are you sure you want to unlink this PI?')) return;

    try {
      setLoading(true);
      setError(null);

      // Update quotation
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        linkedPIs: arrayRemove(piId),
        updatedAt: new Date().toISOString()
      });

      // Update PI
      const piRef = doc(db, 'proformaInvoices', piId);
      await updateDoc(piRef, {
        linkedQuotations: arrayRemove(quotationId),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const newLinkedPIs = linkedPIs.filter(id => id !== piId);
      if (onUpdate) {
        onUpdate(newLinkedPIs);
      }

      setLinkedPIDetails(prev => prev.filter(p => p.id !== piId));
    } catch (err) {
      console.error('Error unlinking PI:', err);
      setError('Failed to unlink PI');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'MYR') => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge style
  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-emerald-100 text-emerald-700',
      partial: 'bg-orange-100 text-orange-700',
      overdue: 'bg-red-100 text-red-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Proforma Invoices ({linkedPIDetails.length})
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            <Plus className="w-3 h-3" />
            Link PI
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}

      {/* Linked PIs list */}
      {loading && linkedPIDetails.length === 0 ? (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      ) : linkedPIDetails.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No linked proforma invoices
        </div>
      ) : (
        <div className="space-y-2">
          {linkedPIDetails.map((pi) => (
            <div 
              key={pi.id}
              className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/proforma-invoices/${pi.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {pi.piNumber}
                    </a>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(pi.status)}`}>
                      {pi.status?.toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {pi.clientName || 'Unknown Client'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(pi.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(pi.totals?.grandTotal, pi.currency)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <a
                    href={`/proforma-invoices/${pi.id}`}
                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                    title="View PI"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {!readOnly && (
                    <button
                      onClick={() => handleUnlink(pi.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-500"
                      title="Unlink PI"
                      disabled={loading}
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Link Proforma Invoice
              </h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by PI number..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Showing PIs for {clientId ? 'the same client' : 'all clients'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {searching ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No PIs found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((pi) => (
                    <div
                      key={pi.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleLink(pi)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pi.piNumber}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(pi.status)}`}>
                              {pi.status?.toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {pi.clientName} • {formatDate(pi.createdAt)} • {formatCurrency(pi.totals?.grandTotal, pi.currency)}
                          </div>
                        </div>
                        <button
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLink(pi);
                          }}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Link2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <p className="text-xs text-gray-500">
                Linking a PI creates a cross-reference between the quotation and proforma invoice for tracking purposes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PIReference;
