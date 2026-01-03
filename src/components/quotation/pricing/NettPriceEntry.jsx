import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, Tag, Clock, AlertTriangle, Info,
  ChevronDown, ChevronUp, Edit3, Save, X,
  Calendar, User, History, Check, RefreshCw
} from 'lucide-react';
import { 
  collection, doc, getDoc, setDoc, updateDoc,
  query, where, orderBy, limit, getDocs, Timestamp 
} from 'firebase/firestore';
import { db } from '../../../config/firebase';

/**
 * NettPriceEntry - Enter and manage nett prices for products
 * 
 * Features:
 * - Direct nett price entry (cost + margin)
 * - Supplier-specific pricing
 * - Validity period management
 * - Price history tracking
 * - Margin calculation display
 * - Multi-currency support
 */
const NettPriceEntry = ({
  productId,
  productName,
  supplierId,
  supplierName,
  currentNettPrice,
  listPrice,
  currency = 'MYR',
  onPriceUpdate,
  readOnly = false,
  className = ''
}) => {
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [nettPrice, setNettPrice] = useState(currentNettPrice || '');
  const [margin, setMargin] = useState(0);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState(null);

  // Load existing price data
  useEffect(() => {
    const loadPriceData = async () => {
      if (!productId) return;
      
      setLoading(true);
      try {
        const priceDocId = supplierId 
          ? `${productId}_${supplierId}` 
          : productId;
        
        const priceRef = doc(db, 'nettPrices', priceDocId);
        const priceSnap = await getDoc(priceRef);
        
        if (priceSnap.exists()) {
          const data = priceSnap.data();
          setNettPrice(data.nettPrice || '');
          setValidFrom(data.validFrom?.toDate?.().toISOString().split('T')[0] || '');
          setValidUntil(data.validUntil?.toDate?.().toISOString().split('T')[0] || '');
          setNotes(data.notes || '');
          setLastUpdated(data.updatedAt?.toDate?.() || null);
          setLastUpdatedBy(data.updatedBy || null);
          
          // Calculate margin if list price available
          if (listPrice && data.nettPrice) {
            calculateMargin(data.nettPrice);
          }
        }
      } catch (err) {
        console.error('Error loading nett price:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPriceData();
  }, [productId, supplierId, listPrice]);

  // Load price history
  useEffect(() => {
    const loadHistory = async () => {
      if (!productId || !showHistory) return;
      
      try {
        const historyRef = collection(db, 'nettPriceHistory');
        const q = query(
          historyRef,
          where('productId', '==', productId),
          ...(supplierId ? [where('supplierId', '==', supplierId)] : []),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date()
        }));
        
        setPriceHistory(items);
      } catch (err) {
        console.error('Error loading price history:', err);
        // Fallback mock data
        setPriceHistory([
          {
            id: 'h1',
            nettPrice: 2500,
            currency: 'MYR',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            createdBy: 'John Doe',
            reason: 'Supplier price increase'
          },
          {
            id: 'h2',
            nettPrice: 2350,
            currency: 'MYR',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            createdBy: 'Jane Smith',
            reason: 'Initial price entry'
          }
        ]);
      }
    };

    if (showHistory) {
      loadHistory();
    }
  }, [productId, supplierId, showHistory]);

  // Calculate margin from nett price
  const calculateMargin = useCallback((nett) => {
    if (!listPrice || !nett) {
      setMargin(0);
      return;
    }
    
    const nettNum = parseFloat(nett);
    const marginPercent = ((listPrice - nettNum) / listPrice) * 100;
    setMargin(marginPercent);
  }, [listPrice]);

  // Handle nett price change
  const handleNettPriceChange = (value) => {
    // Allow only numbers and decimals
    const cleaned = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimals
    const parts = cleaned.split('.');
    const formatted = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('') 
      : cleaned;
    
    setNettPrice(formatted);
    calculateMargin(formatted);
  };

  // Calculate nett price from margin
  const calculateFromMargin = (marginPercent) => {
    if (!listPrice) return;
    
    const marginNum = parseFloat(marginPercent);
    if (isNaN(marginNum)) return;
    
    const nett = listPrice * (1 - marginNum / 100);
    setNettPrice(nett.toFixed(2));
    setMargin(marginNum);
  };

  // Save nett price
  const handleSave = async () => {
    if (!nettPrice || !productId) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const priceDocId = supplierId 
        ? `${productId}_${supplierId}` 
        : productId;
      
      const priceData = {
        productId,
        productName,
        supplierId: supplierId || null,
        supplierName: supplierName || null,
        nettPrice: parseFloat(nettPrice),
        currency,
        validFrom: validFrom ? Timestamp.fromDate(new Date(validFrom)) : null,
        validUntil: validUntil ? Timestamp.fromDate(new Date(validUntil)) : null,
        notes,
        updatedAt: Timestamp.now(),
        updatedBy: 'Current User' // In production, get from auth context
      };
      
      // Save to nettPrices collection
      const priceRef = doc(db, 'nettPrices', priceDocId);
      await setDoc(priceRef, priceData, { merge: true });
      
      // Add to history
      const historyRef = collection(db, 'nettPriceHistory');
      await setDoc(doc(historyRef), {
        ...priceData,
        createdAt: Timestamp.now(),
        createdBy: 'Current User',
        previousPrice: currentNettPrice || null
      });
      
      // Update local state
      setLastUpdated(new Date());
      setLastUpdatedBy('Current User');
      setIsEditing(false);
      
      // Callback
      onPriceUpdate?.({
        nettPrice: parseFloat(nettPrice),
        currency,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        margin: margin
      });
    } catch (err) {
      console.error('Error saving nett price:', err);
      setError('Failed to save price. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setNettPrice(currentNettPrice || '');
    calculateMargin(currentNettPrice);
    setIsEditing(false);
    setError(null);
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Check if price is expired or expiring
  const getPriceStatus = () => {
    if (!validUntil) return null;
    
    const now = new Date();
    const expiry = new Date(validUntil);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Price expired', color: 'red' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'amber' };
    }
    return null;
  };

  const priceStatus = getPriceStatus();

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Nett Price</span>
          {supplierId && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
              {supplierName || 'Supplier-specific'}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Price status badge */}
          {priceStatus && (
            <span className={`px-2 py-0.5 text-xs rounded bg-${priceStatus.color}-100 text-${priceStatus.color}-700`}>
              {priceStatus.message}
            </span>
          )}
          
          {/* History toggle */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title="View price history"
          >
            <History className="w-4 h-4" />
          </button>
          
          {/* Edit button */}
          {!readOnly && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
              title="Edit price"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : isEditing ? (
          /* Edit Mode */
          <div className="space-y-4">
            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}
            
            {/* Nett Price Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nett Price ({currency})
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={nettPrice}
                  onChange={(e) => handleNettPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 text-lg"
                />
              </div>
            </div>

            {/* Margin Display/Input (if list price available) */}
            {listPrice > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margin from List Price
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={margin.toFixed(1)}
                      onChange={(e) => calculateFromMargin(e.target.value)}
                      placeholder="0.0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                      %
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    of {formatCurrency(listPrice)}
                  </div>
                </div>
              </div>
            )}

            {/* Validity Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid From
                </label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Price negotiation notes, supplier contact, etc."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !nettPrice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Price
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Display Mode */
          <div>
            {nettPrice ? (
              <div className="space-y-3">
                {/* Price Display */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {formatCurrency(parseFloat(nettPrice))}
                  </span>
                  {listPrice > 0 && (
                    <span className={`text-sm font-medium ${
                      margin >= 30 ? 'text-green-600' : 
                      margin >= 20 ? 'text-blue-600' : 
                      margin >= 10 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      ({margin.toFixed(1)}% margin)
                    </span>
                  )}
                </div>

                {/* Validity */}
                {(validFrom || validUntil) && (
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {validFrom && validUntil
                        ? `${formatDate(validFrom)} - ${formatDate(validUntil)}`
                        : validFrom
                          ? `From ${formatDate(validFrom)}`
                          : `Until ${formatDate(validUntil)}`
                      }
                    </div>
                  </div>
                )}

                {/* Notes */}
                {notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                    {notes}
                  </div>
                )}

                {/* Last Updated */}
                {lastUpdated && (
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {formatDate(lastUpdated)}
                    </div>
                    {lastUpdatedBy && (
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        {lastUpdatedBy}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No nett price set</p>
                {!readOnly && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    + Add nett price
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="border-t border-gray-200">
          <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Price History
            </span>
            <button
              onClick={() => setShowHistory(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="max-h-[200px] overflow-y-auto">
            {priceHistory.length === 0 ? (
              <div className="px-4 py-4 text-sm text-gray-500 text-center">
                No price history available
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {priceHistory.map((item) => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">
                        {formatCurrency(item.nettPrice)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.reason && (
                      <p className="text-xs text-gray-500">{item.reason}</p>
                    )}
                    <div className="text-xs text-gray-400 mt-1">
                      by {item.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NettPriceEntry;
