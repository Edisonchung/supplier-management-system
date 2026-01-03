/**
 * useQuotations.js
 * 
 * React hook for quotation state management
 * Provides real-time Firestore listeners and CRUD operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import QuotationService from '../services/QuotationService';

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useQuotations(options = {}) {
  const {
    companyId = null,
    clientId = null,
    status = null,
    jobCodeId = null,
    searchTerm = '',
    pageSize = 20,
    sortField = 'createdAt',
    sortDirection = 'desc'
  } = options;

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    sent: 0,
    accepted: 0,
    totalValue: 0
  });

  // Build query based on filters
  const buildQuery = useCallback(() => {
    let q = collection(db, 'quotations');
    const constraints = [];

    if (companyId) {
      constraints.push(where('companyId', '==', companyId));
    }

    if (clientId) {
      constraints.push(where('clientId', '==', clientId));
    }

    if (status) {
      if (Array.isArray(status)) {
        constraints.push(where('status', 'in', status));
      } else {
        constraints.push(where('status', '==', status));
      }
    }

    if (jobCodeId) {
      constraints.push(where('jobCodeId', '==', jobCodeId));
    }

    constraints.push(orderBy(sortField, sortDirection));
    constraints.push(limit(pageSize));

    return query(q, ...constraints);
  }, [companyId, clientId, status, jobCodeId, sortField, sortDirection, pageSize]);

  // Real-time listener
  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = buildQuery();

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || null,
          updatedAt: doc.data().updatedAt?.toDate?.() || null,
          validUntil: doc.data().validUntil?.toDate?.() || null
        }));

        // Filter by search term (client-side for flexibility)
        let filtered = data;
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = data.filter(q => 
            q.quotationNumber?.toLowerCase().includes(term) ||
            q.clientName?.toLowerCase().includes(term) ||
            q.subject?.toLowerCase().includes(term) ||
            q.jobCode?.toLowerCase().includes(term)
          );
        }

        setQuotations(filtered);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        setHasMore(snapshot.docs.length === pageSize);
        setLoading(false);

        // Calculate stats
        const newStats = filtered.reduce((acc, q) => {
          acc.total++;
          acc[q.status] = (acc[q.status] || 0) + 1;
          acc.totalValue += q.grandTotal || 0;
          return acc;
        }, { total: 0, totalValue: 0 });
        setStats(newStats);
      },
      (err) => {
        console.error('Quotation listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [buildQuery, searchTerm, pageSize]);

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!lastDoc || !hasMore) return;

    try {
      const q = query(
        collection(db, 'quotations'),
        ...(companyId ? [where('companyId', '==', companyId)] : []),
        ...(status ? [where('status', '==', status)] : []),
        orderBy(sortField, sortDirection),
        startAfter(lastDoc),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      const newData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setQuotations(prev => [...prev, ...newData]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
    } catch (err) {
      console.error('Load more error:', err);
      setError(err.message);
    }
  }, [lastDoc, hasMore, companyId, status, sortField, sortDirection, pageSize]);

  // CRUD Operations
  const createQuotation = useCallback(async (data) => {
    try {
      const result = await QuotationService.createQuotation(data);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const updateQuotation = useCallback(async (id, updates, userId) => {
    try {
      await QuotationService.updateQuotation(id, updates, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteQuotation = useCallback(async (id, userId) => {
    try {
      await QuotationService.updateStatus(id, 'cancelled', userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const duplicateQuotation = useCallback(async (id, userId) => {
    try {
      const result = await QuotationService.duplicateQuotation(id, userId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const createDummyQuotes = useCallback(async (masterId, companyIds, userId) => {
    try {
      const result = await QuotationService.createDummyQuotes(masterId, companyIds, userId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    quotations,
    loading,
    error,
    hasMore,
    stats,
    loadMore,
    createQuotation,
    updateQuotation,
    deleteQuotation,
    duplicateQuotation,
    createDummyQuotes,
    refresh: () => {} // Listener auto-refreshes
  };
}

// ============================================================================
// SINGLE QUOTATION HOOK
// ============================================================================

export function useQuotation(quotationId) {
  const [quotation, setQuotation] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch quotation with lines
  useEffect(() => {
    if (!quotationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Quotation listener
    const quotationUnsubscribe = onSnapshot(
      doc(db, 'quotations', quotationId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setQuotation({
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || null,
            updatedAt: data.updatedAt?.toDate?.() || null,
            validUntil: data.validUntil?.toDate?.() || null
          });
        } else {
          setQuotation(null);
          setError('Quotation not found');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Quotation fetch error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Lines listener
    const linesQuery = query(
      collection(db, 'quotationLines'),
      where('quotationId', '==', quotationId),
      orderBy('lineNumber', 'asc')
    );

    const linesUnsubscribe = onSnapshot(
      linesQuery,
      (snapshot) => {
        const linesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLines(linesData);
      },
      (err) => {
        console.error('Lines fetch error:', err);
      }
    );

    return () => {
      quotationUnsubscribe();
      linesUnsubscribe();
    };
  }, [quotationId]);

  // Line operations
  const addLine = useCallback(async (lineData) => {
    try {
      const result = await QuotationService.addQuotationLine(quotationId, lineData);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  const updateLine = useCallback(async (lineId, updates) => {
    try {
      await QuotationService.updateQuotationLine(lineId, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteLine = useCallback(async (lineId) => {
    try {
      await QuotationService.deleteQuotationLine(lineId, quotationId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  const reorderLines = useCallback(async (lineIds) => {
    try {
      await QuotationService.reorderLines(quotationId, lineIds);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  // Status operations
  const updateStatus = useCallback(async (newStatus, userId) => {
    try {
      await QuotationService.updateStatus(quotationId, newStatus, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  const submitForApproval = useCallback(async (userId) => {
    await updateStatus('pending_approval', userId);
  }, [updateStatus]);

  const approve = useCallback(async (userId) => {
    await updateStatus('approved', userId);
  }, [updateStatus]);

  const reject = useCallback(async (userId, reason) => {
    try {
      await QuotationService.updateQuotation(quotationId, {
        status: 'rejected',
        rejectionReason: reason
      }, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  const markAsSent = useCallback(async (userId, sentToEmails) => {
    try {
      await QuotationService.markAsSent(quotationId, userId, sentToEmails);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  // Cross-reference operations
  const linkJobCode = useCallback(async (jobCodeId, jobCode) => {
    try {
      await QuotationService.linkToJobCode(quotationId, jobCodeId, jobCode);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  const linkPI = useCallback(async (piId, piNumber) => {
    try {
      await QuotationService.linkPI(quotationId, piId, piNumber);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  const linkPO = useCallback(async (poId, poNumber, isClientPO = true) => {
    try {
      await QuotationService.linkPO(quotationId, poId, poNumber, isClientPO);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [quotationId]);

  // Calculated values
  const totals = useMemo(() => {
    if (!lines.length) return { subtotal: 0, discount: 0, tax: 0, shipping: 0, grandTotal: 0 };

    const subtotal = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
    
    let discount = 0;
    if (quotation?.discountType === 'percentage') {
      discount = subtotal * (quotation.discountPercentage || 0) / 100;
    } else if (quotation?.discountType === 'lump_sum') {
      discount = quotation.discountAmount || 0;
    }

    const taxableAmount = subtotal - discount;
    let tax = 0;
    if (quotation?.taxType === 'exclusive') {
      tax = taxableAmount * (quotation.taxRate || 0) / 100;
    }

    const shipping = quotation?.shippingIncluded ? 0 : (quotation?.shippingCost || 0);
    const grandTotal = taxableAmount + tax + shipping;

    return { subtotal, discount, tax, shipping, grandTotal };
  }, [lines, quotation]);

  return {
    quotation,
    lines,
    loading,
    error,
    totals,
    // Line operations
    addLine,
    updateLine,
    deleteLine,
    reorderLines,
    // Status operations
    updateStatus,
    submitForApproval,
    approve,
    reject,
    markAsSent,
    // Cross-references
    linkJobCode,
    linkPI,
    linkPO
  };
}

// ============================================================================
// QUOTATION LINES HOOK (Standalone)
// ============================================================================

export function useQuotationLines(quotationId) {
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quotationId) {
      setLines([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, 'quotationLines'),
      where('quotationId', '==', quotationId),
      orderBy('lineNumber', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLines(data);
        setLoading(false);
      },
      (err) => {
        console.error('Lines listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [quotationId]);

  return { lines, loading, error };
}

// ============================================================================
// PRICING HOOK
// ============================================================================

export function usePricing() {
  const [priceBooks, setPriceBooks] = useState([]);
  const [tierPricing, setTierPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load price books
  useEffect(() => {
    const loadPriceBooks = async () => {
      try {
        const q = query(
          collection(db, 'brandPriceBooks'),
          where('isActive', '!=', false),
          orderBy('brandName', 'asc')
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPriceBooks(data);
      } catch (err) {
        console.error('Price books load error:', err);
        setError(err.message);
      }
    };

    loadPriceBooks();
  }, []);

  // Load tier pricing
  useEffect(() => {
    const loadTierPricing = async () => {
      try {
        const q = query(
          collection(db, 'clientTierPricing'),
          where('isActive', '==', true),
          orderBy('sortOrder', 'asc')
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTierPricing(data);
        setLoading(false);
      } catch (err) {
        console.error('Tier pricing load error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadTierPricing();
  }, []);

  // Get price book for brand
  const getPriceBook = useCallback((brandId) => {
    return priceBooks.find(pb => pb.brandId === brandId);
  }, [priceBooks]);

  // Get tier config
  const getTierConfig = useCallback((tierName) => {
    return tierPricing.find(tp => tp.tierName === tierName);
  }, [tierPricing]);

  // Calculate markup for tier + brand
  const calculateMarkup = useCallback((tierName, brandId, category) => {
    const tierConfig = getTierConfig(tierName);
    if (!tierConfig) return 30; // Default markup

    // Check brand-specific markup
    const brandMarkup = tierConfig.brandMarkups?.find(bm => bm.brandId === brandId);
    if (brandMarkup) return brandMarkup.markupPercentage;

    // Check category-specific markup
    const categoryMarkup = tierConfig.categoryMarkups?.find(cm => cm.category === category);
    if (categoryMarkup) return categoryMarkup.markupPercentage;

    // Default tier markup
    return tierConfig.defaultMarkup || 30;
  }, [getTierConfig]);

  return {
    priceBooks,
    tierPricing,
    loading,
    error,
    getPriceBook,
    getTierConfig,
    calculateMarkup
  };
}

// ============================================================================
// COMPANY LETTERHEADS HOOK
// ============================================================================

export function useCompanyLetterheads() {
  const [letterheads, setLetterheads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadLetterheads = async () => {
      try {
        const q = query(
          collection(db, 'companyLetterheads'),
          where('isActive', '==', true)
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setLetterheads(data);
        setLoading(false);
      } catch (err) {
        console.error('Letterheads load error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadLetterheads();
  }, []);

  const getLetterhead = useCallback((companyId) => {
    return letterheads.find(lh => lh.companyId === companyId);
  }, [letterheads]);

  return { letterheads, loading, error, getLetterhead };
}

export default useQuotations;
