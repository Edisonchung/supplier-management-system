/**
 * useJobCodes.js
 * 
 * React hook for managing job codes
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import jobCodeService from '../services/JobCodeService';

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMPANY_PREFIXES = {
  'FS': { code: 'FS', name: 'Flow Solution Sdn Bhd' },
  'FSE': { code: 'FSE', name: 'Flow Solution Engineering Sdn Bhd' },
  'FSP': { code: 'FSP', name: 'Flow Solution (Penang) Sdn Bhd' },
  'BWS': { code: 'BWS', name: 'Broadwater Solution Sdn Bhd' },
  'BWE': { code: 'BWE', name: 'Broadwater Engineering Sdn Bhd' },
  'EMIT': { code: 'EMIT', name: 'EMI Technology Sdn Bhd' },
  'EMIA': { code: 'EMIA', name: 'EMI Automation Sdn Bhd' },
  'FTS': { code: 'FTS', name: 'Futuresmiths Sdn Bhd' },
  'IHS': { code: 'IHS', name: 'Inhaus Sdn Bhd' }
};

export const JOB_NATURE_CODES = {
  'P': { code: 'P', name: 'Project', description: 'Full project delivery', color: 'blue' },
  'S': { code: 'S', name: 'Service/Supply', description: 'Service or supply contract', color: 'green' },
  'SV': { code: 'SV', name: 'Service', description: 'Service contract', color: 'purple' },
  'R': { code: 'R', name: 'Repair', description: 'Repair and maintenance', color: 'orange' }
};

export const JOB_STATUSES = {
  'active': { value: 'active', label: 'Active', color: 'green' },
  'on-hold': { value: 'on-hold', label: 'On Hold', color: 'yellow' },
  'completed': { value: 'completed', label: 'Completed', color: 'blue' },
  'cancelled': { value: 'cancelled', label: 'Cancelled', color: 'red' }
};

/**
 * Hook for fetching and managing job codes
 */
export function useJobCodes(filters = {}) {
  const [jobCodes, setJobCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    // Build query
    let q = collection(db, 'jobCodes');
    const constraints = [];
    
    if (filters.companyId) {
      constraints.push(where('companyId', '==', filters.companyId));
    }
    if (filters.companyPrefix) {
      constraints.push(where('companyPrefix', '==', filters.companyPrefix));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.userId) {
      constraints.push(where('assignedUserIds', 'array-contains', filters.userId));
    }
    
    // Add orderBy for createdAt
    constraints.push(orderBy('createdAt', 'desc'));
    q = query(q, ...constraints);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const docData = doc.data();
          return {
            id: doc.id,
            jobCode: doc.id, // Ensure jobCode field exists for backward compatibility
            ...docData
          };
        });
        // Additional client-side sort as backup (in case server-side sort has issues)
        data.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return bTime - aTime; // Descending
        });
        setJobCodes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching job codes:', err);
        // If the error is about missing index for createdAt, try without orderBy
        if (err.code === 'failed-precondition' || err.message?.includes('index')) {
          console.warn('Retrying without orderBy due to index issue');
          const fallbackConstraints = constraints.filter(c => c.type !== 'orderBy');
          const fallbackQ = fallbackConstraints.length > 0 
            ? query(collection(db, 'jobCodes'), ...fallbackConstraints)
            : collection(db, 'jobCodes');
          
          const fallbackUnsubscribe = onSnapshot(fallbackQ,
            (snapshot) => {
              const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                  id: doc.id,
                  jobCode: doc.id,
                  ...docData
                };
              });
              // Client-side sort
              data.sort((a, b) => {
                const aTime = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
                const bTime = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
                return bTime - aTime;
              });
              setJobCodes(data);
              setLoading(false);
            },
            (fallbackErr) => {
              console.error('Error in fallback query:', fallbackErr);
              setError(fallbackErr.message);
              setLoading(false);
            }
          );
          return () => fallbackUnsubscribe();
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    );
    
    return () => unsubscribe();
  }, [filters.companyId, filters.companyPrefix, filters.status, filters.userId]);
  
  // Actions
  const createJobCode = useCallback(async (data) => {
    try {
      return await jobCodeService.createJobCode(data);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const updateJobCode = useCallback(async (jobCode, updates) => {
    try {
      return await jobCodeService.updateJobCode(jobCode, updates);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const assignUser = useCallback(async (jobCode, user, role) => {
    try {
      return await jobCodeService.assignUser(jobCode, user, role);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  const removeUser = useCallback(async (jobCode, userId) => {
    try {
      return await jobCodeService.removeUser(jobCode, userId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  
  return {
    jobCodes,
    loading,
    error,
    createJobCode,
    updateJobCode,
    assignUser,
    removeUser,
    refresh: () => {
      // Trigger refetch by changing a dependency
      // The real-time listener handles this automatically
    }
  };
}

/**
 * Hook for fetching a single job code
 */
export function useJobCode(jobCode) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!jobCode) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    const unsubscribe = onSnapshot(
      doc(db, 'jobCodes', jobCode),
      (doc) => {
        if (doc.exists()) {
          setData({ id: doc.id, ...doc.data() });
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching job code:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [jobCode]);
  
  return { data, loading, error };
}

/**
 * Hook for job codes assigned to current user
 */
export function useMyJobCodes(userId) {
  return useJobCodes({ userId });
}

// Default export for convenience
export default useJobCodes;
