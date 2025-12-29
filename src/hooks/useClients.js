/**
 * useClients Hook - Client Management for HiggsFlow
 * 
 * Provides real-time client data management with Firestore integration.
 * Follows the same patterns as useSuppliers and usePurchaseOrders.
 * 
 * FIX: Updated CompanyContext import path to use .jsx extension
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  where,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
// FIX: Added .jsx extension to match actual file
import { useCompanyContext } from '../context/CompanyContext.jsx';

/**
 * Custom hook for managing clients
 * @param {Object} options - Hook options
 * @param {string} options.status - Filter by status ('active', 'inactive', 'all')
 * @returns {Object} Client data and operations
 */
export const useClients = (options = {}) => {
  const { status: statusFilter = 'all' } = options;
  
  // State
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contactsMap, setContactsMap] = useState({}); // clientId -> contacts[]
  const [selectedClientId, setSelectedClientId] = useState(null);
  
  // Context
  const { user } = useAuth();
  const { selectedCompany, selectedBranch } = useCompanyContext();

  // ============================================================================
  // Real-time Firestore Listener for Clients
  // ============================================================================
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query with multi-tenant filtering
      let q = query(
        collection(db, 'clients'),
        orderBy('createdAt', 'desc')
      );

      // Add company filter if selected
      if (selectedCompany && selectedCompany !== 'all') {
        q = query(
          collection(db, 'clients'),
          where('companyId', '==', selectedCompany),
          orderBy('createdAt', 'desc')
        );
      }

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const clientsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Apply client-side status filter if needed
          let filtered = clientsData;
          if (statusFilter && statusFilter !== 'all') {
            filtered = clientsData.filter(c => c.status === statusFilter);
          }
          
          setClients(filtered);
          setLoading(false);
          console.log(`[useClients] Loaded ${filtered.length} clients`);
        },
        (err) => {
          console.error('[useClients] Firestore error:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('[useClients] Setup error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [user, selectedCompany, statusFilter]);

  // ============================================================================
  // Load Contacts for Selected Client
  // ============================================================================
  useEffect(() => {
    if (!selectedClientId) return;

    const loadContacts = async () => {
      try {
        const q = query(
          collection(db, 'clientContacts'),
          where('clientId', '==', selectedClientId),
          orderBy('isPrimary', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const contacts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setContactsMap(prev => ({
          ...prev,
          [selectedClientId]: contacts
        }));
      } catch (err) {
        console.error('[useClients] Error loading contacts:', err);
      }
    };

    // Check if we already have contacts cached
    if (!contactsMap[selectedClientId]) {
      loadContacts();
    }
  }, [selectedClientId, contactsMap]);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Add a new client
   */
  const addClient = useCallback(async (clientData) => {
    try {
      // Generate short name if not provided
      const shortName = clientData.shortName || generateShortName(clientData.name);
      
      const newClient = {
        ...cleanFormDataForFirestore(clientData),
        shortName,
        companyId: selectedCompany || 'default',
        branchId: selectedBranch || 'default',
        status: clientData.status || 'active',
        totalPOs: 0,
        totalValue: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid || 'unknown'
      };

      // Remove contacts from client data (stored separately)
      const { contacts, ...clientWithoutContacts } = newClient;

      const docRef = await addDoc(collection(db, 'clients'), clientWithoutContacts);
      
      // Add contacts if provided
      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          await addDoc(collection(db, 'clientContacts'), {
            ...cleanFormDataForFirestore(contact),
            clientId: docRef.id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      console.log('[useClients] Client created:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('[useClients] Error adding client:', err);
      throw err;
    }
  }, [user, selectedCompany, selectedBranch]);

  /**
   * Update an existing client
   */
  const updateClient = useCallback(async (clientId, updates) => {
    try {
      const { contacts, ...clientUpdates } = updates;
      
      await updateDoc(doc(db, 'clients', clientId), {
        ...cleanFormDataForFirestore(clientUpdates),
        updatedAt: serverTimestamp()
      });

      // Update contacts if provided
      if (contacts) {
        for (const contact of contacts) {
          if (contact.id && !contact.id.startsWith('temp-')) {
            // Update existing contact
            await updateDoc(doc(db, 'clientContacts', contact.id), {
              ...cleanFormDataForFirestore(contact),
              updatedAt: serverTimestamp()
            });
          } else {
            // Add new contact
            await addDoc(collection(db, 'clientContacts'), {
              ...cleanFormDataForFirestore(contact),
              clientId,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        }
        
        // Clear cached contacts to force reload
        setContactsMap(prev => {
          const newMap = { ...prev };
          delete newMap[clientId];
          return newMap;
        });
      }

      console.log('[useClients] Client updated:', clientId);
      return { success: true };
    } catch (err) {
      console.error('[useClients] Error updating client:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a client (soft delete by default)
   */
  const deleteClient = useCallback(async (clientId, hard = false) => {
    try {
      if (hard) {
        await deleteDoc(doc(db, 'clients', clientId));
        
        // Also delete contacts
        const contactsQuery = query(
          collection(db, 'clientContacts'),
          where('clientId', '==', clientId)
        );
        const contactsSnapshot = await getDocs(contactsQuery);
        for (const contactDoc of contactsSnapshot.docs) {
          await deleteDoc(contactDoc.ref);
        }
      } else {
        // Soft delete
        await updateDoc(doc(db, 'clients', clientId), {
          status: 'inactive',
          deletedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      console.log('[useClients] Client deleted:', clientId, hard ? '(hard)' : '(soft)');
      return { success: true };
    } catch (err) {
      console.error('[useClients] Error deleting client:', err);
      throw err;
    }
  }, []);

  // ============================================================================
  // Contact Operations
  // ============================================================================

  /**
   * Add a contact to a client
   */
  const addContact = useCallback(async (clientId, contactData) => {
    try {
      // If setting as primary, unset other primaries first
      if (contactData.isPrimary) {
        const existingContacts = contactsMap[clientId] || [];
        for (const contact of existingContacts) {
          if (contact.isPrimary) {
            await updateDoc(doc(db, 'clientContacts', contact.id), {
              isPrimary: false,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      const docRef = await addDoc(collection(db, 'clientContacts'), {
        ...cleanFormDataForFirestore(contactData),
        clientId,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Clear cache to force reload
      setContactsMap(prev => {
        const newMap = { ...prev };
        delete newMap[clientId];
        return newMap;
      });

      return { success: true, id: docRef.id };
    } catch (err) {
      console.error('[useClients] Error adding contact:', err);
      throw err;
    }
  }, [contactsMap]);

  /**
   * Update a contact
   */
  const updateContact = useCallback(async (contactId, updates) => {
    try {
      await updateDoc(doc(db, 'clientContacts', contactId), {
        ...cleanFormDataForFirestore(updates),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (err) {
      console.error('[useClients] Error updating contact:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a contact
   */
  const deleteContact = useCallback(async (contactId, clientId) => {
    try {
      await deleteDoc(doc(db, 'clientContacts', contactId));

      // Clear cache
      if (clientId) {
        setContactsMap(prev => {
          const newMap = { ...prev };
          delete newMap[clientId];
          return newMap;
        });
      }

      return { success: true };
    } catch (err) {
      console.error('[useClients] Error deleting contact:', err);
      throw err;
    }
  }, []);

  /**
   * Get contacts for a specific client
   */
  const getContactsForClient = useCallback((clientId) => {
    return contactsMap[clientId] || [];
  }, [contactsMap]);

  /**
   * Get primary contact for a client
   */
  const getPrimaryContact = useCallback((clientId) => {
    const contacts = contactsMap[clientId] || [];
    return contacts.find(c => c.isPrimary) || contacts[0] || null;
  }, [contactsMap]);

  // ============================================================================
  // Search & Filter
  // ============================================================================

  /**
   * Search clients by term
   */
  const searchClients = useCallback((term) => {
    if (!term) return clients;
    
    const lowerTerm = term.toLowerCase();
    return clients.filter(client => 
      client.name?.toLowerCase().includes(lowerTerm) ||
      client.shortName?.toLowerCase().includes(lowerTerm) ||
      client.email?.toLowerCase().includes(lowerTerm) ||
      client.registrationNumber?.toLowerCase().includes(lowerTerm) ||
      client.industry?.toLowerCase().includes(lowerTerm)
    );
  }, [clients]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  /**
   * Statistics
   */
  const statistics = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const inactive = clients.filter(c => c.status === 'inactive').length;
    const pending = clients.filter(c => c.status === 'pending').length;
    
    const totalPOValue = clients.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const totalPOCount = clients.reduce((sum, c) => sum + (c.totalPOs || 0), 0);
    
    const byIndustry = {};
    clients.forEach(c => {
      const industry = c.industry || 'Other';
      byIndustry[industry] = (byIndustry[industry] || 0) + 1;
    });

    return {
      total,
      active,
      inactive,
      pending,
      totalPOValue,
      totalPOCount,
      byIndustry
    };
  }, [clients]);

  /**
   * Top clients by value
   */
  const topClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 5);
  }, [clients]);

  /**
   * Client options for dropdowns
   */
  const clientOptions = useMemo(() => {
    return clients
      .filter(c => c.status === 'active')
      .map(c => ({
        value: c.id,
        label: c.name,
        shortName: c.shortName,
        paymentTerms: c.paymentTerms || 'Net 30',
        deliveryTerms: c.deliveryTerms || 'DDP',
        currency: c.currency || 'MYR'
      }));
  }, [clients]);

  /**
   * Export clients to CSV
   */
  const exportClientsToCSV = useCallback(() => {
    const headers = ['Name', 'Short Name', 'Email', 'Phone', 'Industry', 'Status', 'Payment Terms', 'Total POs', 'Total Value'];
    const rows = clients.map(c => [
      c.name || '',
      c.shortName || '',
      c.email || '',
      c.phone || '',
      c.industry || '',
      c.status || '',
      c.paymentTerms || '',
      c.totalPOs || 0,
      c.totalValue || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [clients]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    // Data
    clients,
    loading,
    error,
    contactsMap,
    
    // Selected client
    selectedClientId,
    setSelectedClientId,
    
    // Client CRUD
    addClient,
    updateClient,
    deleteClient,
    
    // Contact operations
    addContact,
    updateContact,
    deleteContact,
    getContactsForClient,
    getPrimaryContact,
    
    // Search & filter
    searchClients,
    
    // Computed
    statistics,
    topClients,
    clientOptions,
    
    // Export
    exportClientsToCSV
  };
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate short name from company name
 */
function generateShortName(name) {
  if (!name) return '';
  
  // Remove common suffixes
  const cleanName = name
    .replace(/\s*(sdn\.?\s*bhd\.?|bhd\.?|plt|llc|inc\.?|corp\.?|ltd\.?|pte\.?)\s*/gi, '')
    .trim();
  
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 1) {
    return words[0].substring(0, 4).toUpperCase();
  }
  
  // Get initials from significant words
  const skipWords = ['and', 'the', 'of', 'for', '&'];
  const significantWords = words.filter(w => !skipWords.includes(w.toLowerCase()));
  
  if (significantWords.length >= 2) {
    return significantWords
      .slice(0, 4)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }
  
  return words[0].substring(0, 4).toUpperCase();
}

/**
 * Clean form data for Firestore (remove undefined values)
 */
function cleanFormDataForFirestore(data) {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  });
  return cleaned;
}

export default useClients;
