// src/services/ClientService.js
// 🏢 Client Management Service - Phase 1 of Client Master Implementation
// Follows StockAllocationService.js pattern with multi-tenant support

import { db } from '../config/firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';

/**
 * 🏢 ClientService - Manages clients and client contacts
 * 
 * Collections:
 * - clients/ - Main client information
 * - clientContacts/ - Contact persons linked to clients
 */
export class ClientService {
  static COLLECTION_NAME = 'clients';
  static CONTACTS_COLLECTION = 'clientContacts';

  static CLIENT_STATUS = {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending'
  };

  static PAYMENT_TERMS = [
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

  static DELIVERY_TERMS = [
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

  static CURRENCIES = ['MYR', 'USD', 'EUR', 'SGD', 'CNY', 'JPY', 'GBP'];

  static INDUSTRIES = [
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
  // HELPER METHODS
  // ============================================

  /**
   * Clean undefined values from data (Firestore requirement)
   */
  static cleanData(data) {
    const cleaned = {};
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        if (data[key] === null) {
          cleaned[key] = null;
        } else if (Array.isArray(data[key])) {
          cleaned[key] = data[key].filter(item => item !== undefined);
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          cleaned[key] = this.cleanData(data[key]);
        } else {
          cleaned[key] = data[key];
        }
      }
    });
    return cleaned;
  }

  /**
   * Generate short name from full company name
   */
  static generateShortName(fullName) {
    if (!fullName) return '';
    
    // Common patterns
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

    // Extract initials from words
    const words = name.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2) {
      return words.map(w => w[0].toUpperCase()).join('');
    }
    
    // Return first 4 characters uppercase
    return name.substring(0, 4).toUpperCase();
  }

  // ============================================
  // CLIENT CRUD OPERATIONS
  // ============================================

  /**
   * 🆕 Create a new client
   */
  static async createClient(clientData, userId, companyId, branchId) {
    try {
      console.log('🏢 Creating new client:', clientData.name);

      const cleanedData = this.cleanData({
        // Basic Information
        name: clientData.name,
        shortName: clientData.shortName || this.generateShortName(clientData.name),
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
        status: clientData.status || this.CLIENT_STATUS.ACTIVE,
        
        // Multi-tenant
        companyId: companyId,
        branchId: branchId,
        
        // Notes
        notes: clientData.notes || '',
        
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId
      });

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), cleanedData);
      
      console.log('✅ Client created successfully:', docRef.id);
      
      return {
        success: true,
        id: docRef.id,
        data: { id: docRef.id, ...cleanedData }
      };
    } catch (error) {
      console.error('❌ Error creating client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📖 Get all clients with optional filtering
   */
  static async getClients(filters = {}) {
    try {
      console.log('📖 Fetching clients with filters:', filters);

      let q = query(collection(db, this.COLLECTION_NAME));

      // Apply multi-tenant filter
      if (filters.companyId && filters.companyId !== 'all') {
        q = query(q, where('companyId', '==', filters.companyId));
      }

      if (filters.branchId && filters.branchId !== 'all') {
        q = query(q, where('branchId', '==', filters.branchId));
      }

      // Apply status filter
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      // Apply industry filter
      if (filters.industry) {
        q = query(q, where('industry', '==', filters.industry));
      }

      // Apply ordering
      q = query(q, orderBy('createdAt', 'desc'));

      // Apply limit
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const snapshot = await getDocs(q);
      const clients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Found ${clients.length} clients`);

      return {
        success: true,
        data: clients
      };
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 🔍 Get client by ID
   */
  static async getClientById(clientId) {
    try {
      console.log('🔍 Fetching client by ID:', clientId);

      const docRef = doc(db, this.COLLECTION_NAME, clientId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log('⚠️ Client not found:', clientId);
        return {
          success: false,
          error: 'Client not found'
        };
      }

      const client = {
        id: docSnap.id,
        ...docSnap.data()
      };

      console.log('✅ Client found:', client.name);

      return {
        success: true,
        data: client
      };
    } catch (error) {
      console.error('❌ Error fetching client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🔍 Find client by name (fuzzy match)
   */
  static async findClientByName(name, companyId = null) {
    try {
      console.log('🔍 Searching for client:', name);

      const result = await this.getClients({ companyId });
      if (!result.success) return result;

      const searchLower = name.toLowerCase().trim();
      
      // Try exact match first
      let match = result.data.find(c => 
        c.name.toLowerCase() === searchLower ||
        c.shortName?.toLowerCase() === searchLower
      );

      // Try partial match
      if (!match) {
        match = result.data.find(c => 
          c.name.toLowerCase().includes(searchLower) ||
          searchLower.includes(c.name.toLowerCase()) ||
          c.shortName?.toLowerCase().includes(searchLower)
        );
      }

      // Try word-based match
      if (!match) {
        const searchWords = searchLower.split(/\s+/);
        match = result.data.find(c => {
          const clientWords = c.name.toLowerCase().split(/\s+/);
          return searchWords.some(sw => 
            clientWords.some(cw => cw.includes(sw) || sw.includes(cw))
          );
        });
      }

      if (match) {
        console.log('✅ Client found:', match.name);
        return { success: true, data: match };
      }

      console.log('⚠️ No matching client found');
      return { success: false, error: 'Client not found' };
    } catch (error) {
      console.error('❌ Error finding client:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✏️ Update client
   */
  static async updateClient(clientId, updates) {
    try {
      console.log('✏️ Updating client:', clientId);

      const cleanedUpdates = this.cleanData({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      const docRef = doc(db, this.COLLECTION_NAME, clientId);
      await updateDoc(docRef, cleanedUpdates);

      console.log('✅ Client updated successfully');

      return {
        success: true,
        id: clientId
      };
    } catch (error) {
      console.error('❌ Error updating client:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 🗑️ Delete client (soft delete by setting status to inactive)
   */
  static async deleteClient(clientId, hardDelete = false) {
    try {
      console.log(`🗑️ ${hardDelete ? 'Hard' : 'Soft'} deleting client:`, clientId);

      if (hardDelete) {
        // Also delete all contacts
        const contactsResult = await this.getClientContacts(clientId);
        if (contactsResult.success && contactsResult.data.length > 0) {
          const batch = writeBatch(db);
          contactsResult.data.forEach(contact => {
            batch.delete(doc(db, this.CONTACTS_COLLECTION, contact.id));
          });
          batch.delete(doc(db, this.COLLECTION_NAME, clientId));
          await batch.commit();
        } else {
          await deleteDoc(doc(db, this.COLLECTION_NAME, clientId));
        }
      } else {
        await updateDoc(doc(db, this.COLLECTION_NAME, clientId), {
          status: this.CLIENT_STATUS.INACTIVE,
          updatedAt: new Date().toISOString()
        });
      }

      console.log('✅ Client deleted successfully');

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting client:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📊 Update client metrics (called when PO is created/updated)
   */
  static async updateClientMetrics(clientId, poValue = 0, isNewPO = true) {
    try {
      console.log('📊 Updating client metrics:', clientId);

      const clientResult = await this.getClientById(clientId);
      if (!clientResult.success) {
        return clientResult;
      }

      const client = clientResult.data;
      const updates = {
        totalPOs: isNewPO ? (client.totalPOs || 0) + 1 : client.totalPOs,
        totalValue: (client.totalValue || 0) + poValue,
        lastOrderDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, this.COLLECTION_NAME, clientId), updates);

      console.log('✅ Client metrics updated');

      return { success: true };
    } catch (error) {
      console.error('❌ Error updating client metrics:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // CLIENT CONTACT OPERATIONS
  // ============================================

  /**
   * 🆕 Create a new client contact
   */
  static async createContact(contactData, clientId) {
    try {
      console.log('👤 Creating contact for client:', clientId);

      // If this is primary, unset other primary contacts
      if (contactData.isPrimary) {
        await this.unsetPrimaryContacts(clientId);
      }

      const cleanedData = this.cleanData({
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

      const docRef = await addDoc(collection(db, this.CONTACTS_COLLECTION), cleanedData);

      console.log('✅ Contact created:', docRef.id);

      return {
        success: true,
        id: docRef.id,
        data: { id: docRef.id, ...cleanedData }
      };
    } catch (error) {
      console.error('❌ Error creating contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📖 Get all contacts for a client
   */
  static async getClientContacts(clientId) {
    try {
      console.log('📖 Fetching contacts for client:', clientId);

      const q = query(
        collection(db, this.CONTACTS_COLLECTION),
        where('clientId', '==', clientId),
        orderBy('isPrimary', 'desc'),
        orderBy('name', 'asc')
      );

      const snapshot = await getDocs(q);
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`✅ Found ${contacts.length} contacts`);

      return {
        success: true,
        data: contacts
      };
    } catch (error) {
      console.error('❌ Error fetching contacts:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * 🔍 Get primary contact for a client
   */
  static async getPrimaryContact(clientId) {
    try {
      const q = query(
        collection(db, this.CONTACTS_COLLECTION),
        where('clientId', '==', clientId),
        where('isPrimary', '==', true),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Return first contact if no primary set
        const contactsResult = await this.getClientContacts(clientId);
        if (contactsResult.success && contactsResult.data.length > 0) {
          return { success: true, data: contactsResult.data[0] };
        }
        return { success: false, error: 'No contacts found' };
      }

      return {
        success: true,
        data: { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
      };
    } catch (error) {
      console.error('❌ Error fetching primary contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * ✏️ Update contact
   */
  static async updateContact(contactId, updates) {
    try {
      console.log('✏️ Updating contact:', contactId);

      // If setting as primary, unset others first
      if (updates.isPrimary) {
        const contactDoc = await getDoc(doc(db, this.CONTACTS_COLLECTION, contactId));
        if (contactDoc.exists()) {
          await this.unsetPrimaryContacts(contactDoc.data().clientId, contactId);
        }
      }

      const cleanedUpdates = this.cleanData({
        ...updates,
        updatedAt: new Date().toISOString()
      });

      await updateDoc(doc(db, this.CONTACTS_COLLECTION, contactId), cleanedUpdates);

      console.log('✅ Contact updated');

      return { success: true };
    } catch (error) {
      console.error('❌ Error updating contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🗑️ Delete contact
   */
  static async deleteContact(contactId) {
    try {
      console.log('🗑️ Deleting contact:', contactId);

      await deleteDoc(doc(db, this.CONTACTS_COLLECTION, contactId));

      console.log('✅ Contact deleted');

      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting contact:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper: Unset primary flag on all other contacts
   */
  static async unsetPrimaryContacts(clientId, exceptContactId = null) {
    try {
      const q = query(
        collection(db, this.CONTACTS_COLLECTION),
        where('clientId', '==', clientId),
        where('isPrimary', '==', true)
      );

      const snapshot = await getDocs(q);
      const batch = writeBatch(db);

      snapshot.docs.forEach(docSnap => {
        if (docSnap.id !== exceptContactId) {
          batch.update(docSnap.ref, { isPrimary: false, updatedAt: new Date().toISOString() });
        }
      });

      await batch.commit();
    } catch (error) {
      console.error('⚠️ Error unsetting primary contacts:', error);
    }
  }

  /**
   * 📊 Track contact usage (called when contact is used in PO)
   */
  static async trackContactUsage(contactId) {
    try {
      const contactDoc = await getDoc(doc(db, this.CONTACTS_COLLECTION, contactId));
      if (!contactDoc.exists()) return;

      const currentCount = contactDoc.data().poCount || 0;
      
      await updateDoc(doc(db, this.CONTACTS_COLLECTION, contactId), {
        poCount: currentCount + 1,
        lastUsed: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('✅ Contact usage tracked');
    } catch (error) {
      console.error('⚠️ Error tracking contact usage:', error);
    }
  }

  // ============================================
  // REAL-TIME LISTENERS
  // ============================================

  /**
   * 🔔 Subscribe to clients collection (real-time)
   */
  static subscribeToClients(filters, callback) {
    console.log('🔔 Setting up clients subscription');

    let q = query(collection(db, this.COLLECTION_NAME), orderBy('createdAt', 'desc'));

    if (filters.companyId && filters.companyId !== 'all') {
      q = query(
        collection(db, this.COLLECTION_NAME),
        where('companyId', '==', filters.companyId),
        orderBy('createdAt', 'desc')
      );
    }

    return onSnapshot(
      q,
      (snapshot) => {
        const clients = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(clients, null);
      },
      (error) => {
        console.error('❌ Clients subscription error:', error);
        callback([], error);
      }
    );
  }

  /**
   * 🔔 Subscribe to client contacts (real-time)
   */
  static subscribeToContacts(clientId, callback) {
    console.log('🔔 Setting up contacts subscription for client:', clientId);

    const q = query(
      collection(db, this.CONTACTS_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('isPrimary', 'desc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const contacts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(contacts, null);
      },
      (error) => {
        console.error('❌ Contacts subscription error:', error);
        callback([], error);
      }
    );
  }

  // ============================================
  // ANALYTICS & REPORTING
  // ============================================

  /**
   * 📊 Get client analytics
   */
  static async getClientAnalytics(companyId = null) {
    try {
      const result = await this.getClients({ companyId });
      if (!result.success) return result;

      const clients = result.data;
      const activeClients = clients.filter(c => c.status === this.CLIENT_STATUS.ACTIVE);

      const analytics = {
        totalClients: clients.length,
        activeClients: activeClients.length,
        inactiveClients: clients.length - activeClients.length,
        totalPOValue: clients.reduce((sum, c) => sum + (c.totalValue || 0), 0),
        totalPOCount: clients.reduce((sum, c) => sum + (c.totalPOs || 0), 0),
        topClients: [...clients]
          .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
          .slice(0, 5),
        byIndustry: this.INDUSTRIES.map(industry => ({
          industry,
          count: clients.filter(c => c.industry === industry).length
        })).filter(i => i.count > 0),
        recentActivity: [...clients]
          .filter(c => c.lastOrderDate)
          .sort((a, b) => new Date(b.lastOrderDate) - new Date(a.lastOrderDate))
          .slice(0, 10)
      };

      return { success: true, data: analytics };
    } catch (error) {
      console.error('❌ Error getting client analytics:', error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * 🔍 Search clients
   */
  static async searchClients(searchTerm, companyId = null) {
    try {
      const result = await this.getClients({ companyId, status: this.CLIENT_STATUS.ACTIVE });
      if (!result.success) return result;

      const searchLower = searchTerm.toLowerCase().trim();
      
      const matches = result.data.filter(client => 
        client.name?.toLowerCase().includes(searchLower) ||
        client.shortName?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.registrationNumber?.toLowerCase().includes(searchLower)
      );

      return { success: true, data: matches };
    } catch (error) {
      console.error('❌ Error searching clients:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * 📤 Export clients to CSV format
   */
  static async exportToCSV(companyId = null) {
    try {
      const result = await this.getClients({ companyId });
      if (!result.success) return result;

      const headers = [
        'Name', 'Short Name', 'Email', 'Phone', 'Industry',
        'Payment Terms', 'Currency', 'Total POs', 'Total Value', 'Status'
      ];

      const rows = result.data.map(c => [
        c.name, c.shortName, c.email, c.phone, c.industry,
        c.paymentTerms, c.currency, c.totalPOs, c.totalValue, c.status
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
      ].join('\n');

      return { success: true, data: csv };
    } catch (error) {
      console.error('❌ Error exporting clients:', error);
      return { success: false, error: error.message };
    }
  }
}

export default ClientService;
