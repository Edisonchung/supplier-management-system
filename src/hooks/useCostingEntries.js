/**
 * useCostingEntries.js
 * 
 * React hooks for managing costing entries
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import costingService, { COST_CATEGORIES, APPROVAL_STATUSES } from '../services/CostingService';

/**
 * Hook for fetching costing entries for a job code
 */
export function useCostingEntries(jobCode, filters = {}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!jobCode) {
      setEntries([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    // Build query
    let q = query(
      collection(db, 'costingEntries'),
      where('jobCode', '==', jobCode),
      orderBy('date', 'desc')
    );
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        let data = snapshot.docs.map(doc => {
          const entry = doc.data();
          // Convert amounts from cents
          return {
            id: doc.id,
            ...entry,
            amount: (entry.amount || 0) / 100,
            amountPaid: (entry.amountPaid || 0) / 100,
            balancePayable: (entry.balancePayable || 0) / 100,
            unitRate: (entry.unitRate || 0) / 100
          };
        });
        
        // Apply client-side filters
        if (filters.costType) {
          data = data.filter(e => e.costType === filters.costType);
        }
        if (filters.category) {
          data = data.filter(e => e.category === filters.category);
        }
        if (filters.approvalStatus) {
          data = data.filter(e => e.approvalStatus === filters.approvalStatus);
        }
        
        setEntries(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching costing entries:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [jobCode, filters.costType, filters.category, filters.approvalStatus]);
  
  // Calculate summary
  const summary = useCallback(() => {
    const preCost = { total: 0, byCategory: {} };
    const postCost = { total: 0, byCategory: {} };
    
    // Initialize categories
    Object.keys(COST_CATEGORIES).forEach(cat => {
      preCost.byCategory[cat] = 0;
      postCost.byCategory[cat] = 0;
    });
    
    // Only count approved entries
    const approvedEntries = entries.filter(e => e.approvalStatus === APPROVAL_STATUSES.approved);
    
    for (const entry of approvedEntries) {
      const target = entry.costType === 'pre' ? preCost : postCost;
      target.total += entry.amount;
      target.byCategory[entry.category] = (target.byCategory[entry.category] || 0) + entry.amount;
    }
    
    return { preCost, postCost };
  }, [entries]);
  
  // Actions
  const createEntry = useCallback(async (data, submitForApproval = false) => {
    try {
      return await costingService.createEntry({ ...data, jobCode }, submitForApproval);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [jobCode]);
  
  const updateEntry = useCallback(async (entryId, updates, userId, userName) => {
    try {
      return await costingService.updateEntry(entryId, updates, userId, userName);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const deleteEntry = useCallback(async (entryId, userId) => {
    try {
      return await costingService.deleteEntry(entryId, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const submitForApproval = useCallback(async (entryId, userId, userName, approverId, approverName) => {
    try {
      return await costingService.submitForApproval(entryId, userId, userName, approverId, approverName);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  return {
    entries,
    loading,
    error,
    summary: summary(),
    createEntry,
    updateEntry,
    deleteEntry,
    submitForApproval,
    categories: COST_CATEGORIES
  };
}

/**
 * Hook for user's own costing entries
 */
export function useMyEntries(userId, filters = {}) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    let q = query(
      collection(db, 'costingEntries'),
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (filters.limit) {
      q = query(q, limit(filters.limit));
    }
    
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const entry = doc.data();
          return {
            id: doc.id,
            ...entry,
            amount: (entry.amount || 0) / 100,
            amountPaid: (entry.amountPaid || 0) / 100,
            balancePayable: (entry.balancePayable || 0) / 100,
            unitRate: (entry.unitRate || 0) / 100
          };
        });
        setEntries(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user entries:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [userId, filters.limit]);
  
  // Calculate stats
  const stats = useCallback(() => {
    return {
      total: entries.length,
      byStatus: {
        draft: entries.filter(e => e.approvalStatus === 'draft').length,
        pending: entries.filter(e => e.approvalStatus === 'pending').length,
        approved: entries.filter(e => e.approvalStatus === 'approved').length,
        rejected: entries.filter(e => e.approvalStatus === 'rejected').length
      },
      totalAmount: entries.reduce((sum, e) => sum + e.amount, 0),
      approvedAmount: entries
        .filter(e => e.approvalStatus === 'approved')
        .reduce((sum, e) => sum + e.amount, 0)
    };
  }, [entries]);
  
  return {
    entries,
    loading,
    error,
    stats: stats()
  };
}

/**
 * Hook for approval queue
 */
export function useApprovalQueue(approverId = null, filters = {}) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLoading(true);
    
    let q = collection(db, 'approvalQueue');
    const constraints = [];
    
    if (filters.companyId) {
      constraints.push(where('companyId', '==', filters.companyId));
    }
    if (filters.companyPrefix) {
      constraints.push(where('companyPrefix', '==', filters.companyPrefix));
    }
    
    constraints.push(orderBy('submittedAt', 'asc')); // Oldest first
    
    q = query(q, ...constraints);
    
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        let data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          amount: (doc.data().amount || 0) / 100
        }));
        
        // Filter by approver if specified
        if (approverId) {
          data = data.filter(item => 
            !item.assignedApproverId || item.assignedApproverId === approverId
          );
        }
        
        // Calculate days waiting
        const now = new Date();
        data = data.map(item => ({
          ...item,
          daysWaiting: item.submittedAt?.toDate 
            ? Math.floor((now - item.submittedAt.toDate()) / (1000 * 60 * 60 * 24))
            : 0
        }));
        
        setQueue(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching approval queue:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [approverId, filters.companyId, filters.companyPrefix]);
  
  // Actions
  const approveEntry = useCallback(async (entryId, approverId, approverName, remarks) => {
    try {
      return await costingService.approveEntry(entryId, approverId, approverName, remarks);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const rejectEntry = useCallback(async (entryId, approverId, approverName, reason) => {
    try {
      return await costingService.rejectEntry(entryId, approverId, approverName, reason);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  return {
    queue,
    loading,
    error,
    count: queue.length,
    approveEntry,
    rejectEntry
  };
}

/**
 * Hook for single costing entry
 */
export function useCostingEntry(entryId) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!entryId) {
      setEntry(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const unsubscribe = onSnapshot(
      doc(db, 'costingEntries', entryId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEntry({
            id: docSnap.id,
            ...data,
            amount: (data.amount || 0) / 100,
            amountPaid: (data.amountPaid || 0) / 100,
            balancePayable: (data.balancePayable || 0) / 100,
            unitRate: (data.unitRate || 0) / 100
          });
        } else {
          setEntry(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching entry:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [entryId]);
  
  return { entry, loading, error };
}

export { COST_CATEGORIES, APPROVAL_STATUSES };
