// src/components/quotation/crossref/POReference.jsx
// Cross-reference component for linking Purchase Orders to quotations

import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, ExternalLink, Plus, X, Search, Loader2,
  Calendar, DollarSign, Building2, Truck, AlertCircle,
  Link2, Unlink, CheckCircle, Clock
} from 'lucide-react';
import { db } from '../../../firebase';
import { 
  collection, doc, getDoc, getDocs, query, where, 
  updateDoc, arrayUnion, arrayRemove, orderBy, limit 
} from 'firebase/firestore';

const POReference = ({ 
  quotationId, 
  quotationNumber,
  clientId,
  supplierId,
  linkedPOs = [],
  onUpdate,
  readOnly = false,
  type = 'client' // 'client' for client POs, 'supplier' for supplier POs
}) => {
  const [loading, setLoading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linkedPODetails, setLinkedPODetails] = useState([]);
  const [error, setError] = useState(null);

  // Determine collection based on type
  const collectionName = type === 'supplier' ? 'supplierPurchaseOrders' : 'purchaseOrders';
  const poLabel = type === 'supplier' ? 'Supplier PO' : 'Client PO';

  // Fetch details for linked POs
  useEffect(() => {
    const fetchLinkedPOs = async () => {
      if (!linkedPOs || linkedPOs.length === 0) {
        setLinkedPODetails([]);
        return;
      }

      try {
        setLoading(true);
        const details = await Promise.all(
          linkedPOs.map(async (poId) => {
            const poDoc = await getDoc(doc(db, collectionName, poId));
            if (poDoc.exists()) {
              return { id: poDoc.id, ...poDoc.data() };
            }
            return null;
          })
        );
        setLinkedPODetails(details.filter(Boolean));
      } catch (err) {
        console.error('Error fetching linked POs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedPOs();
  }, [linkedPOs, collectionName]);

  // Search for POs
  const handleSearch = async () => {
    const referenceId = type === 'supplier' ? supplierId : clientId;
    if (!searchQuery.trim() && !referenceId) return;

    try {
      setSearching(true);
      setError(null);

      let q;
      if (searchQuery.trim()) {
        // Search by PO number
        q = query(
          collection(db, collectionName),
          where('poNumber', '>=', searchQuery.toUpperCase()),
          where('poNumber', '<=', searchQuery.toUpperCase() + '\uf8ff'),
          limit(20)
        );
      } else if (type === 'supplier' && supplierId) {
        // Get POs for the same supplier
        q = query(
          collection(db, collectionName),
          where('supplierId', '==', supplierId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      } else if (type === 'client' && clientId) {
        // Get POs for the same client
        q = query(
          collection(db, collectionName),
          where('clientId', '==', clientId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
      }

      if (!q) {
        setSearchResults([]);
        return;
      }

      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(po => !linkedPOs.includes(po.id));

      setSearchResults(results);
    } catch (err) {
      console.error('Error searching POs:', err);
      setError('Failed to search POs');
    } finally {
      setSearching(false);
    }
  };

  // Load recent/related POs when modal opens
  useEffect(() => {
    if (showLinkModal && (clientId || supplierId)) {
      handleSearch();
    }
  }, [showLinkModal, clientId, supplierId]);

  // Debounced search
  useEffect(() => {
    if (!showLinkModal) return;
    
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Link a PO to the quotation
  const handleLink = async (po) => {
    try {
      setLoading(true);
      setError(null);

      const linkedField = type === 'supplier' ? 'linkedSupplierPOs' : 'linkedPOs';

      // Update quotation with linked PO
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        [linkedField]: arrayUnion(po.id),
        updatedAt: new Date().toISOString()
      });

      // Update PO with linked quotation
      const poRef = doc(db, collectionName, po.id);
      await updateDoc(poRef, {
        linkedQuotations: arrayUnion(quotationId),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const newLinkedPOs = [...linkedPOs, po.id];
      if (onUpdate) {
        onUpdate(newLinkedPOs);
      }

      setLinkedPODetails(prev => [...prev, po]);
      setSearchResults(prev => prev.filter(p => p.id !== po.id));
    } catch (err) {
      console.error('Error linking PO:', err);
      setError('Failed to link PO');
    } finally {
      setLoading(false);
    }
  };

  // Unlink a PO from the quotation
  const handleUnlink = async (poId) => {
    if (!window.confirm(`Are you sure you want to unlink this ${poLabel}?`)) return;

    try {
      setLoading(true);
      setError(null);

      const linkedField = type === 'supplier' ? 'linkedSupplierPOs' : 'linkedPOs';

      // Update quotation
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        [linkedField]: arrayRemove(poId),
        updatedAt: new Date().toISOString()
      });

      // Update PO
      const poRef = doc(db, collectionName, poId);
      await updateDoc(poRef, {
        linkedQuotations: arrayRemove(quotationId),
        updatedAt: new Date().toISOString()
      });

      // Update local state
      const newLinkedPOs = linkedPOs.filter(id => id !== poId);
      if (onUpdate) {
        onUpdate(newLinkedPOs);
      }

      setLinkedPODetails(prev => prev.filter(p => p.id !== poId));
    } catch (err) {
      console.error('Error unlinking PO:', err);
      setError('Failed to unlink PO');
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
      confirmed: 'bg-blue-100 text-blue-700',
      approved: 'bg-green-100 text-green-700',
      in_progress: 'bg-indigo-100 text-indigo-700',
      shipped: 'bg-cyan-100 text-cyan-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-green-100 text-green-700',
      partial: 'bg-orange-100 text-orange-700',
      cancelled: 'bg-red-100 text-red-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  // Get delivery status icon
  const getDeliveryIcon = (deliveryStatus) => {
    switch (deliveryStatus) {
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'shipped':
        return <Truck className="w-3 h-3 text-blue-500" />;
      case 'pending':
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          {poLabel}s ({linkedPODetails.length})
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            <Plus className="w-3 h-3" />
            Link {poLabel}
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

      {/* Linked POs list */}
      {loading && linkedPODetails.length === 0 ? (
        <div className="flex items-center justify-center py-4 text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading...
        </div>
      ) : linkedPODetails.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          No linked purchase orders
        </div>
      ) : (
        <div className="space-y-2">
          {linkedPODetails.map((po) => (
            <div 
              key={po.id}
              className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={type === 'supplier' 
                        ? `/supplier-purchase-orders/${po.id}` 
                        : `/purchase-orders/${po.id}`
                      }
                      className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {po.poNumber}
                    </a>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(po.status)}`}>
                      {po.status?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {po.deliveryStatus && getDeliveryIcon(po.deliveryStatus)}
                  </div>
                  
                  <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {type === 'supplier' 
                        ? (po.supplierName || 'Unknown Supplier')
                        : (po.clientName || 'Unknown Client')
                      }
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(po.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatCurrency(po.totals?.grandTotal || po.totalAmount, po.currency)}
                    </span>
                  </div>

                  {/* Delivery info */}
                  {po.expectedDeliveryDate && (
                    <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Expected: {formatDate(po.expectedDeliveryDate)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <a
                    href={type === 'supplier' 
                      ? `/supplier-purchase-orders/${po.id}` 
                      : `/purchase-orders/${po.id}`
                    }
                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                    title={`View ${poLabel}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  {!readOnly && (
                    <button
                      onClick={() => handleUnlink(po.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-500"
                      title={`Unlink ${poLabel}`}
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
                Link {poLabel}
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
                  placeholder={`Search by ${poLabel} number...`}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {type === 'supplier' 
                  ? `Showing supplier POs${supplierId ? ' for the same supplier' : ''}`
                  : `Showing client POs${clientId ? ' for the same client' : ''}`
                }
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
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No {poLabel}s found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((po) => (
                    <div
                      key={po.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleLink(po)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{po.poNumber}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(po.status)}`}>
                              {po.status?.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {type === 'supplier' 
                              ? po.supplierName 
                              : po.clientName
                            } • {formatDate(po.createdAt)} • {formatCurrency(po.totals?.grandTotal || po.totalAmount, po.currency)}
                          </div>
                        </div>
                        <button
                          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLink(po);
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
                Linking a {poLabel} creates a cross-reference for tracking the complete order lifecycle from quotation to delivery.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POReference;
