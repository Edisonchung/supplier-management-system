/**
 * CostingService.js
 * 
 * Manages costing entries with approval workflow
 * Supports multiple entry sources: HiggsFlow direct, Notion sync, PO/PI auto-creation
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
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
import { db } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// COST CATEGORIES (Matching Excel Structure)
// ============================================================================

export const COST_CATEGORIES = {
  A: { code: 'A', name: 'Mechanical', description: 'Pumps, valves, piping, tanks' },
  B: { code: 'B', name: 'Instrumentation', description: 'Sensors, transmitters, meters' },
  C: { code: 'C', name: 'Electrical & Control', description: 'PLC, panels, cables, switchgear' },
  D: { code: 'D', name: 'Labour', description: 'Wages, contractor payments' },
  E: { code: 'E', name: 'Freight & Transport', description: 'Delivery, logistics, shipping' },
  F: { code: 'F', name: 'Travelling', description: 'Petrol, toll, accommodation' },
  G: { code: 'G', name: 'Entertainment', description: 'Client meals, gifts' },
  H: { code: 'H', name: 'Miscellaneous', description: 'Hardware, consumables, others' }
};

export const COST_TYPES = {
  pre: { code: 'pre', name: 'PRE-Cost', description: 'Budget/Estimated cost' },
  post: { code: 'post', name: 'POST-Cost', description: 'Actual cost incurred' }
};

export const APPROVAL_STATUSES = {
  draft: 'draft',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected'
};

export const PAYMENT_STATUSES = {
  unpaid: 'unpaid',
  partial: 'partial',
  paid: 'paid'
};

// ============================================================================
// MAIN COSTING SERVICE
// ============================================================================

class CostingService {
  constructor() {
    this.collectionName = 'costingEntries';
    this.approvalQueueCollection = 'approvalQueue';
  }
  
  // --------------------------------------------------------------------------
  // CREATE ENTRY
  // --------------------------------------------------------------------------
  
  /**
   * Create a new costing entry
   * @param {Object} data - Entry data
   * @param {boolean} submitForApproval - If true, submit immediately for approval
   */
  async createEntry(data, submitForApproval = false) {
    try {
      const entryId = uuidv4();
      
      // Determine payment status
      let paymentStatus = PAYMENT_STATUSES.unpaid;
      if (data.amountPaid > 0) {
        paymentStatus = data.amountPaid >= data.amount 
          ? PAYMENT_STATUSES.paid 
          : PAYMENT_STATUSES.partial;
      }
      
      const entry = {
        id: entryId,
        jobCode: data.jobCode,
        
        // Source tracking
        source: {
          type: data.sourceType || 'higgsflow', // higgsflow, notion, po_auto, pi_auto
          notionPageId: data.notionPageId || null,
          notionDatabaseId: data.notionDatabaseId || null,
          sourceRef: data.sourceRef || null // PO/PI number if auto-created
        },
        
        // Entry classification
        costType: data.costType || 'post', // pre, post
        category: data.category, // A-H
        categoryName: COST_CATEGORIES[data.category]?.name || data.category,
        
        // Entry details
        date: data.date,
        description: data.description || '',
        
        // Vendor
        vendor: data.vendor || '',
        vendorId: data.vendorId || null, // HiggsFlow supplier ID if linked
        invoiceNo: data.invoiceNo || '',
        invoiceDate: data.invoiceDate || null,
        
        // Amounts (stored as integers in cents for precision)
        quantity: data.quantity || 1,
        unit: data.unit || 'sum',
        unitRate: Math.round((data.unitRate || data.amount || 0) * 100), // Store in cents
        amount: Math.round((data.amount || 0) * 100), // Store in cents
        currency: 'MYR',
        
        // Payment
        amountPaid: Math.round((data.amountPaid || 0) * 100),
        paymentDate: data.paymentDate || null,
        balancePayable: Math.round(((data.amount || 0) - (data.amountPaid || 0)) * 100),
        paymentStatus,
        
        // Attachments
        attachments: data.attachments || [],
        
        // User & Branch
        createdBy: data.createdBy,
        createdByName: data.createdByName,
        createdByEmail: data.createdByEmail || '',
        branchId: data.branchId,
        branchName: data.branchName || '',
        
        // Company
        companyId: data.companyId,
        companyPrefix: data.companyPrefix || this.extractCompanyPrefix(data.jobCode),
        
        // Approval workflow
        approvalStatus: submitForApproval ? APPROVAL_STATUSES.pending : APPROVAL_STATUSES.draft,
        approvalHistory: submitForApproval ? [{
          status: APPROVAL_STATUSES.pending,
          timestamp: new Date().toISOString(),
          userId: data.createdBy,
          userName: data.createdByName,
          action: 'submitted'
        }] : [],
        
        // Approval assignment
        assignedApproverId: data.assignedApproverId || null,
        assignedApproverName: data.assignedApproverName || null,
        
        approvedBy: null,
        approvedByName: null,
        approvedAt: null,
        
        rejectedBy: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null,
        
        // Notes
        notes: data.notes || '',
        internalRemarks: '', // Manager notes
        
        // Notion sync
        notionSyncStatus: data.sourceType === 'notion' ? 'synced' : null,
        lastNotionSyncAt: data.sourceType === 'notion' ? serverTimestamp() : null,
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        submittedAt: submitForApproval ? serverTimestamp() : null
      };
      
      // Save to Firestore
      await setDoc(doc(db, this.collectionName, entryId), entry);
      
      // If submitted for approval, add to approval queue
      if (submitForApproval) {
        await this.addToApprovalQueue(entry);
      }
      
      return entryId;
    } catch (error) {
      console.error('Error creating costing entry:', error);
      throw error;
    }
  }
  
  /**
   * Create entry from PO (auto-link)
   */
  async createEntryFromPO(poData, jobCode, createdBy) {
    try {
      // Map PO items to cost entries
      const entries = [];
      
      for (const item of (poData.items || [])) {
        const category = this.inferCategoryFromItem(item, poData.supplierCategory);
        
        const entryId = await this.createEntry({
          jobCode,
          sourceType: 'po_auto',
          sourceRef: poData.poNumber,
          costType: 'post',
          category,
          date: poData.poDate || new Date().toISOString().split('T')[0],
          description: item.description || `PO Item: ${item.itemCode}`,
          vendor: poData.supplierName,
          vendorId: poData.supplierId,
          invoiceNo: poData.poNumber,
          quantity: item.quantity || 1,
          unit: item.unit || 'pcs',
          unitRate: item.unitPrice,
          amount: item.totalAmount || (item.quantity * item.unitPrice),
          amountPaid: 0,
          createdBy: createdBy.userId,
          createdByName: createdBy.userName,
          branchId: poData.branchId,
          branchName: poData.branchName,
          companyId: poData.companyId,
          notes: `Auto-created from PO ${poData.poNumber}`
        }, false); // Don't auto-submit, let user review first
        
        entries.push(entryId);
      }
      
      return entries;
    } catch (error) {
      console.error('Error creating entry from PO:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // FETCH ENTRIES
  // --------------------------------------------------------------------------
  
  /**
   * Get all entries for a job code
   */
  async getEntriesForJobCode(jobCode, filters = {}) {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('jobCode', '==', jobCode),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      let entries = snapshot.docs.map(doc => this.convertFromFirestore(doc.data()));
      
      // Apply filters
      if (filters.costType) {
        entries = entries.filter(e => e.costType === filters.costType);
      }
      if (filters.category) {
        entries = entries.filter(e => e.category === filters.category);
      }
      if (filters.approvalStatus) {
        entries = entries.filter(e => e.approvalStatus === filters.approvalStatus);
      }
      
      return entries;
    } catch (error) {
      console.error('Error fetching entries:', error);
      throw error;
    }
  }
  
  /**
   * Get approved entries only (for costing summary)
   */
  async getApprovedEntriesForJobCode(jobCode) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('jobCode', '==', jobCode),
        where('approvalStatus', '==', APPROVAL_STATUSES.approved)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertFromFirestore(doc.data()));
    } catch (error) {
      console.error('Error fetching approved entries:', error);
      throw error;
    }
  }
  
  /**
   * Get pending entries for a job code
   */
  async getPendingEntriesForJobCode(jobCode) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('jobCode', '==', jobCode),
        where('approvalStatus', '==', APPROVAL_STATUSES.pending)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertFromFirestore(doc.data()));
    } catch (error) {
      console.error('Error fetching pending entries:', error);
      throw error;
    }
  }
  
  /**
   * Get entries created by a specific user
   */
  async getEntriesForUser(userId, filters = {}) {
    try {
      let q = query(
        collection(db, this.collectionName),
        where('createdBy', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => this.convertFromFirestore(doc.data()));
    } catch (error) {
      console.error('Error fetching user entries:', error);
      throw error;
    }
  }
  
  /**
   * Get single entry by ID
   */
  async getEntry(entryId) {
    try {
      const docRef = doc(db, this.collectionName, entryId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) return null;
      return this.convertFromFirestore(docSnap.data());
    } catch (error) {
      console.error('Error fetching entry:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // UPDATE ENTRY
  // --------------------------------------------------------------------------
  
  /**
   * Update a costing entry (only if draft or rejected)
   */
  async updateEntry(entryId, updates, userId, userName) {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Entry not found');
      
      // Can only edit draft or rejected entries
      if (![APPROVAL_STATUSES.draft, APPROVAL_STATUSES.rejected].includes(entry.approvalStatus)) {
        throw new Error('Cannot edit entry that is pending or approved');
      }
      
      // Recalculate payment status if amounts changed
      if (updates.amount !== undefined || updates.amountPaid !== undefined) {
        const amount = updates.amount ?? entry.amount;
        const amountPaid = updates.amountPaid ?? entry.amountPaid;
        
        updates.balancePayable = Math.round((amount - amountPaid) * 100);
        updates.paymentStatus = amountPaid >= amount 
          ? PAYMENT_STATUSES.paid 
          : amountPaid > 0 ? PAYMENT_STATUSES.partial : PAYMENT_STATUSES.unpaid;
        
        // Convert to cents
        if (updates.amount !== undefined) updates.amount = Math.round(updates.amount * 100);
        if (updates.amountPaid !== undefined) updates.amountPaid = Math.round(updates.amountPaid * 100);
        if (updates.unitRate !== undefined) updates.unitRate = Math.round(updates.unitRate * 100);
      }
      
      // Update category name if category changed
      if (updates.category) {
        updates.categoryName = COST_CATEGORIES[updates.category]?.name || updates.category;
      }
      
      await updateDoc(doc(db, this.collectionName, entryId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating entry:', error);
      throw error;
    }
  }
  
  /**
   * Delete a costing entry (only if draft)
   */
  async deleteEntry(entryId, userId) {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Entry not found');
      
      // Can only delete draft entries
      if (entry.approvalStatus !== APPROVAL_STATUSES.draft) {
        throw new Error('Can only delete draft entries');
      }
      
      // Verify ownership
      if (entry.createdBy !== userId) {
        throw new Error('Can only delete your own entries');
      }
      
      await deleteDoc(doc(db, this.collectionName, entryId));
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // SUBMISSION & APPROVAL WORKFLOW
  // --------------------------------------------------------------------------
  
  /**
   * Submit entry for approval
   */
  async submitForApproval(entryId, userId, userName, assignedApproverId = null, assignedApproverName = null) {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Entry not found');
      
      if (entry.approvalStatus !== APPROVAL_STATUSES.draft && 
          entry.approvalStatus !== APPROVAL_STATUSES.rejected) {
        throw new Error('Entry must be draft or rejected to submit');
      }
      
      const approvalHistory = entry.approvalHistory || [];
      approvalHistory.push({
        status: APPROVAL_STATUSES.pending,
        timestamp: new Date().toISOString(),
        userId,
        userName,
        action: entry.approvalStatus === APPROVAL_STATUSES.rejected ? 'resubmitted' : 'submitted'
      });
      
      await updateDoc(doc(db, this.collectionName, entryId), {
        approvalStatus: APPROVAL_STATUSES.pending,
        approvalHistory,
        assignedApproverId: assignedApproverId,
        assignedApproverName: assignedApproverName,
        submittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Clear rejection fields
        rejectedBy: null,
        rejectedByName: null,
        rejectedAt: null,
        rejectionReason: null
      });
      
      // Add to approval queue
      await this.addToApprovalQueue({
        ...entry,
        approvalStatus: APPROVAL_STATUSES.pending,
        assignedApproverId,
        assignedApproverName
      });
      
      return true;
    } catch (error) {
      console.error('Error submitting for approval:', error);
      throw error;
    }
  }
  
  /**
   * Approve an entry (manager action)
   */
  async approveEntry(entryId, approverId, approverName, internalRemarks = '') {
    try {
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Entry not found');
      
      if (entry.approvalStatus !== APPROVAL_STATUSES.pending) {
        throw new Error('Entry is not pending approval');
      }
      
      // Check if approver is assigned (if assignment required)
      if (entry.assignedApproverId && entry.assignedApproverId !== approverId) {
        throw new Error('Only the assigned approver can approve this entry');
      }
      
      const approvalHistory = entry.approvalHistory || [];
      approvalHistory.push({
        status: APPROVAL_STATUSES.approved,
        timestamp: new Date().toISOString(),
        userId: approverId,
        userName: approverName,
        action: 'approved',
        remarks: internalRemarks
      });
      
      await updateDoc(doc(db, this.collectionName, entryId), {
        approvalStatus: APPROVAL_STATUSES.approved,
        approvalHistory,
        approvedBy: approverId,
        approvedByName: approverName,
        approvedAt: serverTimestamp(),
        internalRemarks,
        updatedAt: serverTimestamp()
      });
      
      // Remove from approval queue
      await this.removeFromApprovalQueue(entryId);
      
      // Update job code costing summary
      const JobCodeService = (await import('./JobCodeService')).default;
      await JobCodeService.updateCostingSummary(entry.jobCode);
      
      return true;
    } catch (error) {
      console.error('Error approving entry:', error);
      throw error;
    }
  }
  
  /**
   * Reject an entry (manager action)
   */
  async rejectEntry(entryId, approverId, approverName, rejectionReason) {
    try {
      if (!rejectionReason || rejectionReason.trim() === '') {
        throw new Error('Rejection reason is required');
      }
      
      const entry = await this.getEntry(entryId);
      if (!entry) throw new Error('Entry not found');
      
      if (entry.approvalStatus !== APPROVAL_STATUSES.pending) {
        throw new Error('Entry is not pending approval');
      }
      
      // Check if approver is assigned (if assignment required)
      if (entry.assignedApproverId && entry.assignedApproverId !== approverId) {
        throw new Error('Only the assigned approver can reject this entry');
      }
      
      const approvalHistory = entry.approvalHistory || [];
      approvalHistory.push({
        status: APPROVAL_STATUSES.rejected,
        timestamp: new Date().toISOString(),
        userId: approverId,
        userName: approverName,
        action: 'rejected',
        reason: rejectionReason
      });
      
      await updateDoc(doc(db, this.collectionName, entryId), {
        approvalStatus: APPROVAL_STATUSES.rejected,
        approvalHistory,
        rejectedBy: approverId,
        rejectedByName: approverName,
        rejectedAt: serverTimestamp(),
        rejectionReason,
        updatedAt: serverTimestamp()
      });
      
      // Remove from approval queue
      await this.removeFromApprovalQueue(entryId);
      
      // Update Notion if entry came from there
      if (entry.source?.type === 'notion' && entry.source?.notionPageId) {
        await this.updateNotionEntryStatus(entry.source.notionPageId, 'Rejected', rejectionReason);
      }
      
      return true;
    } catch (error) {
      console.error('Error rejecting entry:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // APPROVAL QUEUE
  // --------------------------------------------------------------------------
  
  /**
   * Add entry to approval queue (denormalized for fast queries)
   */
  async addToApprovalQueue(entry) {
    try {
      const queueItem = {
        id: entry.id,
        jobCode: entry.jobCode,
        projectName: '', // Will be populated from job code
        
        // Entry summary
        date: entry.date,
        category: entry.category,
        categoryName: entry.categoryName,
        costType: entry.costType,
        vendor: entry.vendor,
        amount: entry.amount,
        description: entry.description,
        
        // Submitter
        submittedBy: entry.createdBy,
        submittedByName: entry.createdByName,
        submittedByBranch: entry.branchName,
        submittedAt: serverTimestamp(),
        
        // Assigned approver
        assignedApproverId: entry.assignedApproverId || null,
        assignedApproverName: entry.assignedApproverName || null,
        
        // Source
        source: entry.source?.type || 'higgsflow',
        hasAttachments: (entry.attachments || []).length > 0,
        
        // For filtering
        companyId: entry.companyId,
        companyPrefix: entry.companyPrefix,
        branchId: entry.branchId,
        
        // Timestamps
        createdAt: serverTimestamp()
      };
      
      // Get project name from job code
      const JobCodeService = (await import('./JobCodeService')).default;
      const jobCode = await JobCodeService.getJobCode(entry.jobCode);
      if (jobCode) {
        queueItem.projectName = jobCode.projectName;
      }
      
      await setDoc(doc(db, this.approvalQueueCollection, entry.id), queueItem);
    } catch (error) {
      console.error('Error adding to approval queue:', error);
      // Don't throw - queue is supplementary
    }
  }
  
  /**
   * Remove entry from approval queue
   */
  async removeFromApprovalQueue(entryId) {
    try {
      await deleteDoc(doc(db, this.approvalQueueCollection, entryId));
    } catch (error) {
      console.error('Error removing from approval queue:', error);
      // Don't throw - queue is supplementary
    }
  }
  
  /**
   * Get approval queue for a specific approver
   */
  async getApprovalQueue(approverId = null, filters = {}) {
    try {
      let q = collection(db, this.approvalQueueCollection);
      const constraints = [];
      
      // If approver specified, only get their assigned items + unassigned items
      if (approverId) {
        // This requires a compound query - for now get all and filter
      }
      
      if (filters.companyId) {
        constraints.push(where('companyId', '==', filters.companyId));
      }
      if (filters.companyPrefix) {
        constraints.push(where('companyPrefix', '==', filters.companyPrefix));
      }
      
      constraints.push(orderBy('submittedAt', 'asc')); // Oldest first
      
      q = query(q, ...constraints);
      const snapshot = await getDocs(q);
      let items = snapshot.docs.map(doc => ({
        ...doc.data(),
        amount: doc.data().amount / 100 // Convert back from cents
      }));
      
      // Filter by approver if specified
      if (approverId) {
        items = items.filter(item => 
          !item.assignedApproverId || item.assignedApproverId === approverId
        );
      }
      
      // Calculate days waiting
      const now = new Date();
      items = items.map(item => ({
        ...item,
        daysWaiting: item.submittedAt?.toDate 
          ? Math.floor((now - item.submittedAt.toDate()) / (1000 * 60 * 60 * 24))
          : 0,
        priority: this.calculatePriority(item)
      }));
      
      return items;
    } catch (error) {
      console.error('Error fetching approval queue:', error);
      throw error;
    }
  }
  
  /**
   * Get approval queue count for badge display
   */
  async getApprovalQueueCount(approverId = null) {
    try {
      const queue = await this.getApprovalQueue(approverId);
      return queue.length;
    } catch (error) {
      console.error('Error getting queue count:', error);
      return 0;
    }
  }
  
  /**
   * Subscribe to approval queue changes (real-time)
   */
  subscribeToApprovalQueue(approverId, callback) {
    const q = query(
      collection(db, this.approvalQueueCollection),
      orderBy('submittedAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      let items = snapshot.docs.map(doc => ({
        ...doc.data(),
        amount: doc.data().amount / 100
      }));
      
      // Filter by approver
      if (approverId) {
        items = items.filter(item => 
          !item.assignedApproverId || item.assignedApproverId === approverId
        );
      }
      
      callback(items);
    });
  }
  
  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------
  
  /**
   * Convert Firestore data (amounts from cents back to decimals)
   */
  convertFromFirestore(data) {
    return {
      ...data,
      amount: (data.amount || 0) / 100,
      amountPaid: (data.amountPaid || 0) / 100,
      balancePayable: (data.balancePayable || 0) / 100,
      unitRate: (data.unitRate || 0) / 100
    };
  }
  
  /**
   * Extract company prefix from job code
   */
  extractCompanyPrefix(jobCode) {
    if (!jobCode) return null;
    const match = jobCode.match(/^([A-Z]+)-/);
    return match ? match[1] : null;
  }
  
  /**
   * Infer category from item/supplier
   */
  inferCategoryFromItem(item, supplierCategory) {
    // Simple mapping based on keywords or supplier category
    const description = (item.description || '').toLowerCase();
    
    if (description.includes('pump') || description.includes('valve') || description.includes('pipe')) {
      return 'A';
    }
    if (description.includes('sensor') || description.includes('transmitter') || description.includes('meter')) {
      return 'B';
    }
    if (description.includes('plc') || description.includes('panel') || description.includes('cable') || description.includes('electrical')) {
      return 'C';
    }
    if (description.includes('labour') || description.includes('wage') || description.includes('manpower')) {
      return 'D';
    }
    if (description.includes('freight') || description.includes('delivery') || description.includes('shipping')) {
      return 'E';
    }
    if (description.includes('travel') || description.includes('petrol') || description.includes('toll')) {
      return 'F';
    }
    if (description.includes('meal') || description.includes('entertainment') || description.includes('gift')) {
      return 'G';
    }
    
    // Default to miscellaneous
    return 'H';
  }
  
  /**
   * Calculate priority based on age and amount
   */
  calculatePriority(item) {
    const daysWaiting = item.daysWaiting || 0;
    const amount = item.amount || 0;
    
    if (daysWaiting > 7 || amount > 10000) return 'urgent';
    if (daysWaiting > 3 || amount > 5000) return 'high';
    return 'normal';
  }
  
  /**
   * Update Notion entry status (after approval/rejection)
   */
  async updateNotionEntryStatus(notionPageId, status, reason = null) {
    try {
      // This will be implemented by NotionSyncService
      const NotionSyncService = (await import('./NotionSyncService')).default;
      await NotionSyncService.updateEntryApprovalStatus(notionPageId, status, reason);
    } catch (error) {
      console.error('Error updating Notion entry:', error);
      // Don't throw - Notion update is supplementary
    }
  }
  
  // --------------------------------------------------------------------------
  // STATISTICS & REPORTING
  // --------------------------------------------------------------------------
  
  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const entries = await this.getEntriesForUser(userId);
      
      const stats = {
        total: entries.length,
        byStatus: {
          draft: 0,
          pending: 0,
          approved: 0,
          rejected: 0
        },
        totalAmount: 0,
        approvedAmount: 0,
        thisMonth: {
          count: 0,
          amount: 0
        }
      };
      
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      for (const entry of entries) {
        stats.byStatus[entry.approvalStatus]++;
        stats.totalAmount += entry.amount;
        
        if (entry.approvalStatus === APPROVAL_STATUSES.approved) {
          stats.approvedAmount += entry.amount;
        }
        
        const entryDate = new Date(entry.date);
        if (entryDate.getMonth() === thisMonth && entryDate.getFullYear() === thisYear) {
          stats.thisMonth.count++;
          stats.thisMonth.amount += entry.amount;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
  
  /**
   * Get entries for Excel export
   */
  async getEntriesForExport(jobCode) {
    try {
      const entries = await this.getApprovedEntriesForJobCode(jobCode);
      
      // Group by cost type
      const preCostEntries = entries.filter(e => e.costType === 'pre');
      const postCostEntries = entries.filter(e => e.costType === 'post');
      
      // Group by category
      const groupByCategory = (items) => {
        const grouped = {};
        for (const cat of Object.keys(COST_CATEGORIES)) {
          grouped[cat] = items.filter(e => e.category === cat);
        }
        return grouped;
      };
      
      return {
        preCost: {
          entries: preCostEntries,
          byCategory: groupByCategory(preCostEntries),
          total: preCostEntries.reduce((sum, e) => sum + e.amount, 0)
        },
        postCost: {
          entries: postCostEntries,
          byCategory: groupByCategory(postCostEntries),
          total: postCostEntries.reduce((sum, e) => sum + e.amount, 0)
        }
      };
    } catch (error) {
      console.error('Error getting entries for export:', error);
      throw error;
    }
  }
}

// Export singleton instance
const costingService = new CostingService();
export default costingService;
export { CostingService };
// Note: COST_CATEGORIES, COST_TYPES, APPROVAL_STATUSES, PAYMENT_STATUSES are already exported above
