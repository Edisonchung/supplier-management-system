/**
 * JobCodeLink.jsx
 * Component for linking quotations to job codes
 * Part of HiggsFlow Quotation System
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Search,
  Link2,
  Unlink,
  ExternalLink,
  X,
  Loader2,
  Check,
  AlertCircle,
  Building2,
  Calendar,
  DollarSign,
  Plus
} from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';

const JobCodeLink = ({
  quotationId,
  currentJobCode = null,
  currentJobCodeId = null,
  onLink,
  onUnlink,
  disabled = false,
  showCreateOption = true
}) => {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState(null);
  const [recentJobCodes, setRecentJobCodes] = useState([]);

  // Fetch recent job codes on mount
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const q = query(
          collection(db, 'jobCodes'),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        setRecentJobCodes(snap.docs.map(d => ({
          id: d.id,
          ...d.data()
        })));
      } catch (err) {
        console.error('Error fetching recent job codes:', err);
      }
    };
    
    if (isOpen && !currentJobCodeId) {
      fetchRecent();
    }
  }, [isOpen, currentJobCodeId]);

  // Search job codes
  const searchJobCodes = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Search by job code (starts with)
      const codeQuery = query(
        collection(db, 'jobCodes'),
        where('jobCode', '>=', term.toUpperCase()),
        where('jobCode', '<=', term.toUpperCase() + '\uf8ff'),
        limit(10)
      );
      
      const codeSnap = await getDocs(codeQuery);
      const codeResults = codeSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Search by project name
      const nameQuery = query(
        collection(db, 'jobCodes'),
        where('projectName', '>=', term),
        where('projectName', '<=', term + '\uf8ff'),
        limit(10)
      );
      
      const nameSnap = await getDocs(nameQuery);
      const nameResults = nameSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

      // Combine and dedupe
      const combined = [...codeResults];
      for (const result of nameResults) {
        if (!combined.find(r => r.id === result.id)) {
          combined.push(result);
        }
      }

      setSearchResults(combined.slice(0, 10));
    } catch (err) {
      console.error('Error searching job codes:', err);
      setError('Failed to search job codes');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchJobCodes(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, searchJobCodes]);

  // Link job code to quotation
  const handleLink = async (jobCode) => {
    setLinking(true);
    setError(null);

    try {
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        jobCodeId: jobCode.id,
        jobCode: jobCode.jobCode,
        updatedAt: serverTimestamp()
      });

      onLink?.(jobCode);
      setIsOpen(false);
    } catch (err) {
      console.error('Error linking job code:', err);
      setError('Failed to link job code');
    } finally {
      setLinking(false);
    }
  };

  // Unlink job code
  const handleUnlink = async () => {
    setLinking(true);
    setError(null);

    try {
      const quotationRef = doc(db, 'quotations', quotationId);
      await updateDoc(quotationRef, {
        jobCodeId: null,
        jobCode: null,
        updatedAt: serverTimestamp()
      });

      onUnlink?.();
    } catch (err) {
      console.error('Error unlinking job code:', err);
      setError('Failed to unlink job code');
    } finally {
      setLinking(false);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: 'MYR'
    }).format(amount || 0);
  };

  // If already linked, show current link
  if (currentJobCodeId && currentJobCode) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Briefcase className="w-4 h-4 text-gray-400" />
            Linked Job Code
          </div>
          <button
            onClick={handleUnlink}
            disabled={disabled || linking}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
          >
            {linking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />}
            Unlink
          </button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="font-mono text-lg font-medium text-blue-600">{currentJobCode}</div>
            {/* Additional job code info could be displayed here */}
          </div>
          <a
            href={`/job-codes/${currentJobCodeId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            View
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Link selector
  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Briefcase className="w-5 h-5 text-gray-500" />
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">Link to Job Code</div>
            <div className="text-sm text-gray-500">Connect this quotation to a project</div>
          </div>
        </div>
        <Link2 className="w-5 h-5 text-gray-400" />
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Link to Job Code</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by job code or project name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Results */}
            <div className="max-h-80 overflow-y-auto">
              {/* Search Results */}
              {searchTerm && searchResults.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">
                    Search Results
                  </div>
                  {searchResults.map((jc) => (
                    <button
                      key={jc.id}
                      onClick={() => handleLink(jc)}
                      disabled={linking}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left disabled:opacity-50"
                    >
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-blue-600">{jc.jobCode}</span>
                          {jc.status === 'active' && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{jc.projectName}</div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {jc.client?.name || jc.clientName || 'N/A'}
                          </span>
                          {jc.budget && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {formatCurrency(jc.budget)}
                            </span>
                          )}
                        </div>
                      </div>
                      {linking ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <Check className="w-5 h-5 text-gray-300" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* No Results */}
              {searchTerm && searchResults.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No job codes found for "{searchTerm}"</p>
                  {showCreateOption && (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        // Navigate to create job code
                        window.location.href = `/job-codes/create?from=quotation&quotationId=${quotationId}`;
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Job Code
                    </button>
                  )}
                </div>
              )}

              {/* Recent Job Codes */}
              {!searchTerm && recentJobCodes.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">
                    Recent Job Codes
                  </div>
                  {recentJobCodes.map((jc) => (
                    <button
                      key={jc.id}
                      onClick={() => handleLink(jc)}
                      disabled={linking}
                      className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg text-left disabled:opacity-50"
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Briefcase className="w-5 h-5 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono font-medium text-gray-700">{jc.jobCode}</div>
                        <div className="text-sm text-gray-500 truncate">{jc.projectName}</div>
                      </div>
                      <Check className="w-5 h-5 text-gray-300" />
                    </button>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!searchTerm && recentJobCodes.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Start typing to search for job codes</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCodeLink;
