/**
 * ApproverService.js
 * 
 * Manages approver assignments for costing entries
 * Allows assigning specific users as approvers per company/branch
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
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================================
// APPROVER CONFIGURATION
// ============================================================================

/**
 * Approver types:
 * - global: Can approve any entry across all companies
 * - company: Can approve entries for specific companies
 * - branch: Can approve entries for specific branches
 */
export const APPROVER_TYPES = {
  global: 'global',
  company: 'company',
  branch: 'branch'
};

// ============================================================================
// APPROVER SERVICE
// ============================================================================

class ApproverService {
  constructor() {
    this.collectionName = 'approvers';
  }
  
  // --------------------------------------------------------------------------
  // APPROVER MANAGEMENT
  // --------------------------------------------------------------------------
  
  /**
   * Add an approver
   */
  async addApprover(data) {
    try {
      const approverId = data.userId;
      
      const approverData = {
        id: approverId,
        userId: data.userId,
        userName: data.userName,
        email: data.email,
        
        // Approver type and scope
        approverType: data.approverType || APPROVER_TYPES.global,
        
        // For company-level approvers
        allowedCompanyIds: data.allowedCompanyIds || [],
        allowedCompanyPrefixes: data.allowedCompanyPrefixes || [],
        
        // For branch-level approvers
        allowedBranchIds: data.allowedBranchIds || [],
        
        // Settings
        autoAssign: data.autoAssign || false, // Auto-assign entries from their scope
        maxAmountLimit: data.maxAmountLimit || null, // Max amount they can approve
        
        // Status
        isActive: true,
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: data.createdBy,
        createdByName: data.createdByName
      };
      
      await setDoc(doc(db, this.collectionName, approverId), approverData);
      
      return approverId;
    } catch (error) {
      console.error('Error adding approver:', error);
      throw error;
    }
  }
  
  /**
   * Update an approver
   */
  async updateApprover(approverId, updates) {
    try {
      await updateDoc(doc(db, this.collectionName, approverId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating approver:', error);
      throw error;
    }
  }
  
  /**
   * Remove an approver
   */
  async removeApprover(approverId) {
    try {
      await deleteDoc(doc(db, this.collectionName, approverId));
      return true;
    } catch (error) {
      console.error('Error removing approver:', error);
      throw error;
    }
  }
  
  /**
   * Get all approvers
   */
  async getAllApprovers() {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('isActive', '==', true),
        orderBy('userName')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching approvers:', error);
      throw error;
    }
  }
  
  /**
   * Get approver by ID
   */
  async getApprover(approverId) {
    try {
      const docRef = doc(db, this.collectionName, approverId);
      const docSnap = await getDoc(docRef);
      
      return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
    } catch (error) {
      console.error('Error fetching approver:', error);
      throw error;
    }
  }
  
  /**
   * Check if a user is an approver
   */
  async isApprover(userId) {
    try {
      const approver = await this.getApprover(userId);
      return approver?.isActive || false;
    } catch (error) {
      console.error('Error checking approver status:', error);
      return false;
    }
  }
  
  // --------------------------------------------------------------------------
  // APPROVER SELECTION
  // --------------------------------------------------------------------------
  
  /**
   * Get available approvers for an entry
   * Based on company, branch, and amount
   */
  async getAvailableApprovers(entryData) {
    try {
      const allApprovers = await this.getAllApprovers();
      
      return allApprovers.filter(approver => {
        // Check if approver can handle this entry
        
        // Global approvers can approve anything
        if (approver.approverType === APPROVER_TYPES.global) {
          return this.checkAmountLimit(approver, entryData.amount);
        }
        
        // Company-level approvers
        if (approver.approverType === APPROVER_TYPES.company) {
          const canApprove = 
            approver.allowedCompanyIds?.includes(entryData.companyId) ||
            approver.allowedCompanyPrefixes?.includes(entryData.companyPrefix);
          
          if (!canApprove) return false;
          return this.checkAmountLimit(approver, entryData.amount);
        }
        
        // Branch-level approvers
        if (approver.approverType === APPROVER_TYPES.branch) {
          if (!approver.allowedBranchIds?.includes(entryData.branchId)) {
            return false;
          }
          return this.checkAmountLimit(approver, entryData.amount);
        }
        
        return false;
      });
    } catch (error) {
      console.error('Error getting available approvers:', error);
      throw error;
    }
  }
  
  /**
   * Get default approver for an entry (for auto-assignment)
   */
  async getDefaultApprover(entryData) {
    try {
      const allApprovers = await this.getAllApprovers();
      
      // First, look for auto-assign approvers at branch level
      let approver = allApprovers.find(a => 
        a.autoAssign &&
        a.approverType === APPROVER_TYPES.branch &&
        a.allowedBranchIds?.includes(entryData.branchId) &&
        this.checkAmountLimit(a, entryData.amount)
      );
      
      if (approver) return approver;
      
      // Then, look for auto-assign approvers at company level
      approver = allApprovers.find(a => 
        a.autoAssign &&
        a.approverType === APPROVER_TYPES.company &&
        (a.allowedCompanyIds?.includes(entryData.companyId) ||
         a.allowedCompanyPrefixes?.includes(entryData.companyPrefix)) &&
        this.checkAmountLimit(a, entryData.amount)
      );
      
      if (approver) return approver;
      
      // Finally, look for global auto-assign approver
      approver = allApprovers.find(a => 
        a.autoAssign &&
        a.approverType === APPROVER_TYPES.global &&
        this.checkAmountLimit(a, entryData.amount)
      );
      
      return approver || null;
    } catch (error) {
      console.error('Error getting default approver:', error);
      return null;
    }
  }
  
  /**
   * Check if approver can handle the amount
   */
  checkAmountLimit(approver, amount) {
    if (!approver.maxAmountLimit) return true;
    return amount <= approver.maxAmountLimit;
  }
  
  // --------------------------------------------------------------------------
  // APPROVER STATISTICS
  // --------------------------------------------------------------------------
  
  /**
   * Get approval statistics for an approver
   */
  async getApproverStats(approverId) {
    try {
      const CostingService = (await import('./CostingService')).default;
      
      // Get all entries approved by this approver
      const q = query(
        collection(db, 'costingEntries'),
        where('approvedBy', '==', approverId)
      );
      
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map(doc => doc.data());
      
      // Get pending entries assigned to this approver
      const pendingQueue = await CostingService.getApprovalQueue(approverId);
      
      // Calculate stats
      const stats = {
        totalApproved: entries.length,
        totalApprovedAmount: entries.reduce((sum, e) => sum + (e.amount / 100), 0),
        pendingCount: pendingQueue.length,
        pendingAmount: pendingQueue.reduce((sum, e) => sum + e.amount, 0),
        thisMonth: {
          approved: 0,
          amount: 0
        }
      };
      
      const now = new Date();
      const thisMonth = now.getMonth();
      const thisYear = now.getFullYear();
      
      for (const entry of entries) {
        const approvedDate = entry.approvedAt?.toDate?.() || new Date(entry.approvedAt);
        if (approvedDate.getMonth() === thisMonth && approvedDate.getFullYear() === thisYear) {
          stats.thisMonth.approved++;
          stats.thisMonth.amount += entry.amount / 100;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting approver stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
const approverService = new ApproverService();
export default approverService;
export { ApproverService, APPROVER_TYPES };
