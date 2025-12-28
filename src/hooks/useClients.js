// src/hooks/useClients.js
// 🏢 React Hook for Client Management - Phase 1 of Client Master Implementation
// Follows useSuppliers.js pattern with real-time Firestore listeners

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../config/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  limit
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useCompanyContext } from '../context/CompanyContext';

// Helper: Clean undefined values for Firestore
const cleanFormDataForFirestore = (data) => {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined) {
      if (value === null) {
        cleaned[key] = null;
      } else if (Array.isArray(value)) {
        const cleanedArray = value.filter(item => item !== undefined);
        if (cleanedArray.length > 0) {
          cleaned[key] = cleanedArray;
        }
      } else if (typeof value === 'object' && value !== null) {
        const cleanedObject = cleanFormDataForFirestore(value);
        if (Object.keys(cleanedObject).length > 0) {
          cleaned[key] = cleanedObject;
        }
      } else {
        cleaned[key] = value;
      }
    }
  });
  return cleaned;
};

// Helper: Generate short name from full company name
const generateShortName = (fullName) => {
  if (!fullName) return '';
  
  const patterns = [
    /^(.+?)\s+(Sdn\.?\s*Bhd\.?|Bhd\.?|Pte\.?\s*Ltd\.?|Ltd\.?|Inc\.?|Corp\.?)$/i,
    /^(.+?)\s+(Private Limited|Limited)$/i
  ];
  
  let name = fullName;
  for (const pattern of patterns) {
    const match = fullName.match(pattern);
    if (match) {
      name = match[1];
      break;
    }
  }

  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2) {
    return words.map(w => w[0].toUpperCase()).join('');
  }
  
  return name.substring(0, 4).toUpperCase();
};

/**
 * 🏢 useClients - React hook for client management
 * 
 * Features:
 * - Real-time Firestore listeners
 * - Multi-tenant support (companyId, branchId)
 * - CRUD operations for clients and contacts
 * - Statistics and analytics
 * - Search and filtering
 */
export const useClients = (options = {}) => {
  // State
  const [clients, setClients] = useState([]);
  const [contacts, setContacts] = useState({});  // Map of clientId -> contacts[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [clientContacts, setClientContacts] = useState([]);  // Contacts for selected client

  // Context
  const { user } = useAuth();
  const companyContext = useCompanyContext?.() || {};
  const { selectedCompany, selectedBranch } = companyContext;

  // Options
  const { 
    includeInactive = false,
    autoLoadContacts = false
  } = options;

  // ============================================
  // REAL-TIME LISTENERS
  // ============================================

  // Subscribe to clients collection
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    console.log('🔔 Setting up clients real-time listener');

    let q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));

    // Apply multi-tenant filter
    if (selectedCompany && selectedCompany !== 'all') {
      q = query(
        collection(db, 'clients'),
        where('companyId', '==', selectedCompany),
        orderBy('createdAt', 'desc')
      );
    }

    // Apply status filter
    if (!includeInactive) {
      // Note: Firestore composite index needed for this query
      // For now, we'll filter client-side
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let clientsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Client-side status filter
        if (!includeInactive) {
          clientsData = clientsData.filter(c => c.status !== 'inactive');
        }

        setClients(clientsData);
        setLoading(false);
        setError(null);
        console.log(`✅ Loaded ${clientsData.length} clients`);
      },
      (err) => {
        console.error('❌ Clients listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log('🔕 Cleaning up clients listener');
      unsubscribe();
    };
  }, [user, selectedCompany, selectedBranch, includeInactive]);

  // Subscribe to contacts for selected client
  useEffect(() => {
    if (!selectedClientId) {
      setClientContacts([]);
      return;
    }

    console.log('🔔 Setting up contacts listener for client:', selectedClientId);

    const q = query(
      collection(db, 'clientContacts'),
      where('clientId', '==', selectedClientId),
      orderBy('isPrimary', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const contactsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClientContacts(contactsData);
        setContacts(prev => ({
          ...prev,
          [selectedClientId]: contactsData
        }));
        console.log(`✅ Loaded ${contactsData.length} contacts for client`);
      },
      (err) => {
        console.error('❌ Contacts listener error:', err);
      }
    );

    return () => {
      console.log('🔕 Cleaning up contacts listener');
      unsubscribe();
    };
  }, [selectedClientId]);

  // ============================================
  // CLIENT CRUD OPERATIONS
  // ============================================

  /**
   * Add a new client
   */
  const addClient = useCallback(async (clientData) => {
    try {
      console.log('🏢 Adding new client:', clientData.name);

      const cleanedData = cleanFormDataForFirestore({
        // Basic Information
        name: clientData.name,
        shortName: clientData.shortName || generateShortName(clientData.name),
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        
        // Business Details
        registrationNumber: clientData.registrationNumber || '',
        taxId: clientData.taxId || '',
        industry: clientData.industry || '',
        website: clientData.website || '',
        
        // Default Terms
        paymentTerms: clientData.paymentTerms || 'Net 30',
        deliveryTerms: clientData.deliveryTerms || 'DDP',
        currency: clientData.currency || 'MYR',
        
        // Metrics (initialized)
        totalPOs: 0,
        totalValue: 0,
        lastOrderDate: null,
        
        // Status
        status: clientData.status || 'active',
        
        // Multi-tenant
        companyId: selectedCompany || clientData.companyId || 'default',
        branchId: selectedBranch || clientData.branchId || 'default',
        
        // Notes
        notes: clientData.notes || '',
        
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.uid || 'system'
      });

      const docRef = await addDoc(collection(db, 'clients'), cleanedData);
      
      console.log('✅ Client added successfully:', docRef.id);
      
      return {
        success: true,
        id: docRef.id,
        data: { id: docRef.id, ...cleanedData }
      };
    } catch (err) {
      console.error('❌ Error adding client:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [user, selectedCompany, selectedBranch]);

  /**
   * Update an existing client
   */
  const updateClient = useCallback(async (clientId, updates) => {
    try {
      console.log('✏️ Updating client:', clientId);

      const cleanedUpdates = cleanFormDataForFirestore({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'clients', clientId), cleanedUpdates);

      console.log('✅ Client updated successfully');

      return { success: true, id: clientId };
    } catch (err) {
      console.error('❌ Error updating client:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Delete a client (soft delete by default)
   */
  const deleteClient = useCallback(async (clientId, hardDelete = false) => {
    try {
      console.log(`🗑️ ${hardDelete ? 'Hard' : 'Soft'} deleting client:`, clientId);

      if (hardDelete) {
        // Delete all contacts first
        const contactsQuery = query(
          collection(db, 'clientContacts'),
          where('clientId', '==', clientId)
        );
        const contactsSnap = await getDocs(contactsQuery);
        
        const batch = writeBatch(db);
        contactsSnap.docs.forEach(contactDoc => {
          batch.delete(contactDoc.ref);
        });
        batch.delete(doc(db, 'clients', clientId));
        await batch.commit();
      } else {
        await updateDoc(doc(db, 'clients', clientId), {
          status: 'inactive',
          updatedAt: new Date().toISOString()
        });
      }

      console.log('✅ Client deleted successfully');

      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting client:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Get client by ID
   */
  const getClientById = useCallback((clientId) => {
    return clients.find(c => c.id === clientId) || null;
  }, [clients]);

  /**
   * Find client by name (fuzzy match)
   */
  const findClientByName = useCallback((name) => {
    if (!name) return null;
    
    const searchLower = name.toLowerCase().trim();
    
    // Exact match first
    let match = clients.find(c => 
      c.name?.toLowerCase() === searchLower ||
      c.shortName?.toLowerCase() === searchLower
    );

    // Partial match
    if (!match) {
      match = clients.find(c => 
        c.name?.toLowerCase().includes(searchLower) ||
        searchLower.includes(c.name?.toLowerCase()) ||
        c.shortName?.toLowerCase().includes(searchLower)
      );
    }

    return match || null;
  }, [clients]);

  // ============================================
  // CONTACT CRUD OPERATIONS
  // ============================================

  /**
   * Add a contact to a client
   */
  const addContact = useCallback(async (clientId, contactData) => {
    try {
      console.log('👤 Adding contact for client:', clientId);

      // If this is primary, unset other primary contacts
      if (contactData.isPrimary) {
        const contactsQuery = query(
          collection(db, 'clientContacts'),
          where('clientId', '==', clientId),
          where('isPrimary', '==', true)
        );
        const snapshot = await getDocs(contactsQuery);
        
        const batch = writeBatch(db);
        snapshot.docs.forEach(contactDoc => {
          batch.update(contactDoc.ref, { isPrimary: false, updatedAt: new Date().toISOString() });
        });
        await batch.commit();
      }

      const cleanedData = cleanFormDataForFirestore({
        clientId: clientId,
        name: contactData.name,
        title: contactData.title || '',
        department: contactData.department || '',
        email: contactData.email || '',
        phone: contactData.phone || '',
        isPrimary: contactData.isPrimary || false,
        poCount: 0,
        lastUsed: null,
        notes: contactData.notes || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const docRef = await addDoc(collection(db, 'clientContacts'), cleanedData);

      console.log('✅ Contact added:', docRef.id);

      return {
        success: true,
        id: docRef.id,
        data: { id: docRef.id, ...cleanedData }
      };
    } catch (err) {
      console.error('❌ Error adding contact:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Update a contact
   */
  const updateContact = useCallback(async (contactId, updates) => {
    try {
      console.log('✏️ Updating contact:', contactId);

      // If setting as primary, unset others first
      if (updates.isPrimary) {
        const contactDoc = await getDoc(doc(db, 'clientContacts', contactId));
        if (contactDoc.exists()) {
          const clientId = contactDoc.data().clientId;
          const contactsQuery = query(
            collection(db, 'clientContacts'),
            where('clientId', '==', clientId),
            where('isPrimary', '==', true)
          );
          const snapshot = await getDocs(contactsQuery);
          
          const batch = writeBatch(db);
          snapshot.docs.forEach(doc => {
            if (doc.id !== contactId) {
              batch.update(doc.ref, { isPrimary: false, updatedAt: new Date().toISOString() });
            }
          });
          await batch.commit();
        }
      }

      const cleanedUpdates = cleanFormDataForFirestore({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, 'clientContacts', contactId), cleanedUpdates);

      console.log('✅ Contact updated');

      return { success: true };
    } catch (err) {
      console.error('❌ Error updating contact:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Delete a contact
   */
  const deleteContact = useCallback(async (contactId) => {
    try {
      console.log('🗑️ Deleting contact:', contactId);

      await deleteDoc(doc(db, 'clientContacts', contactId));

      console.log('✅ Contact deleted');

      return { success: true };
    } catch (err) {
      console.error('❌ Error deleting contact:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Get contacts for a specific client (from cache or load)
   */
  const getContactsForClient = useCallback(async (clientId) => {
    // Check cache first
    if (contacts[clientId]) {
      return { success: true, data: contacts[clientId] };
    }

    try {
      const q = query(
        collection(db, 'clientContacts'),
        where('clientId', '==', clientId),
        orderBy('isPrimary', 'desc')
      );

      const snapshot = await getDocs(q);
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setContacts(prev => ({
        ...prev,
        [clientId]: contactsData
      }));

      return { success: true, data: contactsData };
    } catch (err) {
      console.error('❌ Error fetching contacts:', err);
      return { success: false, error: err.message, data: [] };
    }
  }, [contacts]);

  /**
   * Get primary contact for a client
   */
  const getPrimaryContact = useCallback(async (clientId) => {
    const result = await getContactsForClient(clientId);
    if (!result.success || result.data.length === 0) {
      return null;
    }
    
    const primary = result.data.find(c => c.isPrimary);
    return primary || result.data[0];
  }, [getContactsForClient]);

  /**
   * Track contact usage (when used in PO)
   */
  const trackContactUsage = useCallback(async (contactId) => {
    try {
      const contactDoc = await getDoc(doc(db, 'clientContacts', contactId));
      if (!contactDoc.exists()) return;

      const currentCount = contactDoc.data().poCount || 0;
      
      await updateDoc(doc(db, 'clientContacts', contactId), {
        poCount: currentCount + 1,
        lastUsed: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Contact usage tracked');
    } catch (err) {
      console.error('⚠️ Error tracking contact usage:', err);
    }
  }, []);

  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================

  const statistics = useMemo(() => {
    const activeClients = clients.filter(c => c.status === 'active');
    
    return {
      total: clients.length,
      active: activeClients.length,
      inactive: clients.length - activeClients.length,
      totalPOValue: clients.reduce((sum, c) => sum + (c.totalValue || 0), 0),
      totalPOCount: clients.reduce((sum, c) => sum + (c.totalPOs || 0), 0),
      byIndustry: clients.reduce((acc, c) => {
        if (c.industry) {
          acc[c.industry] = (acc[c.industry] || 0) + 1;
        }
        return acc;
      }, {})
    };
  }, [clients]);

  const topClients = useMemo(() => {
    return [...clients]
      .filter(c => c.status === 'active')
      .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
      .slice(0, 5);
  }, [clients]);

  // ============================================
  // SEARCH & FILTERING
  // ============================================

  /**
   * Search clients by term
   */
  const searchClients = useCallback((searchTerm) => {
    if (!searchTerm) return clients;
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    return clients.filter(client => 
      client.name?.toLowerCase().includes(searchLower) ||
      client.shortName?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.registrationNumber?.toLowerCase().includes(searchLower) ||
      client.industry?.toLowerCase().includes(searchLower)
    );
  }, [clients]);

  /**
   * Get clients for dropdown selection
   */
  const clientOptions = useMemo(() => {
    return clients
      .filter(c => c.status === 'active')
      .map(c => ({
        value: c.id,
        label: c.name,
        shortName: c.shortName,
        paymentTerms: c.paymentTerms,
        deliveryTerms: c.deliveryTerms,
        currency: c.currency
      }));
  }, [clients]);

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Update client metrics (called when PO is created)
   */
  const updateClientMetrics = useCallback(async (clientId, poValue = 0, isNewPO = true) => {
    try {
      const client = getClientById(clientId);
      if (!client) return { success: false, error: 'Client not found' };

      const updates = {
        totalPOs: isNewPO ? (client.totalPOs || 0) + 1 : client.totalPOs,
        totalValue: (client.totalValue || 0) + poValue,
        lastOrderDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'clients', clientId), updates);

      console.log('✅ Client metrics updated');

      return { success: true };
    } catch (err) {
      console.error('❌ Error updating client metrics:', err);
      return { success: false, error: err.message };
    }
  }, [getClientById]);

  /**
   * Refresh clients data
   */
  const refetch = useCallback(() => {
    // Firestore real-time listeners handle this automatically
    console.log('🔄 Clients data refreshed (real-time)');
  }, []);

  // ============================================
  // CONSTANTS
  // ============================================

  const PAYMENT_TERMS = [
    'Net 7',
    'Net 14',
    'Net 30',
    'Net 45',
    'Net 60',
    'Net 90',
    'COD',
    'Advance Payment',
    '50% Advance, 50% on Delivery'
  ];

  const DELIVERY_TERMS = [
    'EXW',
    'FCA',
    'CPT',
    'CIP',
    'DAP',
    'DPU',
    'DDP',
    'FAS',
    'FOB',
    'CFR',
    'CIF'
  ];

  const CURRENCIES = ['MYR', 'USD', 'EUR', 'SGD', 'CNY', 'JPY', 'GBP'];

  const INDUSTRIES = [
    'Port Operations',
    'Oil & Gas',
    'Manufacturing',
    'Maritime',
    'Construction',
    'Logistics',
    'Petrochemical',
    'Power & Energy',
    'Mining',
    'Other'
  ];

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data
    clients,
    clientContacts,
    contacts,
    loading,
    error,
    
    // Selected client
    selectedClientId,
    setSelectedClientId,
    
    // Client CRUD
    addClient,
    updateClient,
    deleteClient,
    getClientById,
    findClientByName,
    
    // Contact CRUD
    addContact,
    updateContact,
    deleteContact,
    getContactsForClient,
    getPrimaryContact,
    trackContactUsage,
    
    // Statistics
    statistics,
    topClients,
    
    // Search & Filtering
    searchClients,
    clientOptions,
    
    // Utilities
    updateClientMetrics,
    refetch,
    generateShortName,
    
    // Constants
    PAYMENT_TERMS,
    DELIVERY_TERMS,
    CURRENCIES,
    INDUSTRIES
  };
};

export default useClients;
