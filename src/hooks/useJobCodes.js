/**
 * useJobCodes.js
 * 
 * React hook for managing job codes
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, doc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import jobCodeService from '../services/JobCodeService';

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
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    q = query(q, ...constraints);
    
    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setJobCodes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching job codes:', err);
        setError(err.message);
        setLoading(false);
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
