/**
 * JobCodeService.js
 * 
 * Manages job codes with abstracted source (Manual now, CRM API ready)
 * Integrates with existing HiggsFlow company/branch structure
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ============================================================================
// JOB CODE SOURCE ABSTRACTION (API-Ready)
// ============================================================================

/**
 * Abstract interface for job code sources
 * When CRM API is ready, implement CRMApiJobCodeSource
 */
class JobCodeSourceInterface {
  async fetchJobCodes(filters = {}) { throw new Error('Not implemented'); }
  async fetchJobCode(jobCode) { throw new Error('Not implemented'); }
  async isAvailable() { throw new Error('Not implemented'); }
}

/**
 * Manual job code source - used until CRM API is ready
 */
class ManualJobCodeSource extends JobCodeSourceInterface {
  async fetchJobCodes(filters = {}) {
    let q = collection(db, 'jobCodes');
    const constraints = [];
    
    if (filters.companyId) {
      constraints.push(where('companyId', '==', filters.companyId));
    }
    if (filters.status) {
      constraints.push(where('status', '==', filters.status));
    }
    if (filters.companyPrefix) {
      constraints.push(where('companyPrefix', '==', filters.companyPrefix));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    if (filters.limit) {
      constraints.push(limit(filters.limit));
    }
    
    q = query(q, ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
  async fetchJobCode(jobCode) {
    const docRef = doc(db, 'jobCodes', jobCode);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }
  
  async isAvailable() {
    return true;
  }
}

/**
 * CRM API source - implement when API is ready
 * Just uncomment and configure when developers provide the API
 */
/*
class CRMApiJobCodeSource extends JobCodeSourceInterface {
  constructor(config) {
    super();
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }
  
  async fetchJobCodes(filters = {}) {
    const response = await fetch(`${this.baseUrl}/job-codes`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    const data = await response.json();
    return data.map(this.transformFromCRM);
  }
  
  async fetchJobCode(jobCode) {
    const response = await fetch(`${this.baseUrl}/job-codes/${jobCode}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    const data = await response.json();
    return this.transformFromCRM(data);
  }
  
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
  
  transformFromCRM(crmJob) {
    return {
      id: crmJob.jobCode,
      source: 'crm_api',
      crmJobId: crmJob.id,
      projectName: crmJob.projectName,
      clientName: crmJob.clientName,
      contractValue: crmJob.quotationValue,
      // ... map other fields
    };
  }
}
*/

// ============================================================================
// MAIN JOB CODE SERVICE
// ============================================================================

class JobCodeService {
  constructor() {
    this.manualSource = new ManualJobCodeSource();
    this.crmSource = null; // Set when CRM API available
    
    // Company prefix mappings (from your HiggsFlow structure)
    this.companyPrefixes = {
      'FS': 'Flow Solution Sdn Bhd',
      'FSE': 'Flow Solution Engineering Sdn Bhd',
      'FSP': 'Flow Solution (Penang) Sdn Bhd',
      'BWS': 'Broadwater Solution Sdn Bhd',
      'BWE': 'Broadwater Engineering Sdn Bhd',
      'EMIT': 'EMI Technology Sdn Bhd',
      'EMIA': 'EMI Automation Sdn Bhd',
      'FTS': 'Futuresmiths Sdn Bhd',
      'IHS': 'Inhaus Sdn Bhd'
    };
    
    // Job nature codes
    this.jobNatureCodes = {
      'P': 'Project',
      'S': 'Service/Supply',
      'SV': 'Service',
      'R': 'Repair'
    };
  }
  
  // --------------------------------------------------------------------------
  // FETCH OPERATIONS
  // --------------------------------------------------------------------------
  
  /**
   * Get all job codes with optional filters
   */
  async getAllJobCodes(filters = {}) {
    try {
      const jobs = await this.manualSource.fetchJobCodes(filters);
      
      // If CRM source available, merge results
      if (this.crmSource && await this.crmSource.isAvailable()) {
        const crmJobs = await this.crmSource.fetchJobCodes(filters);
        // Merge with CRM taking precedence
        for (const crmJob of crmJobs) {
          const existingIndex = jobs.findIndex(j => j.id === crmJob.id);
          if (existingIndex >= 0) {
            jobs[existingIndex] = { ...jobs[existingIndex], ...crmJob };
          } else {
            jobs.push(crmJob);
          }
        }
      }
      
      return jobs;
    } catch (error) {
      console.error('Error fetching job codes:', error);
      throw error;
    }
  }
  
  /**
   * Get single job code by ID
   */
  async getJobCode(jobCode) {
    try {
      return await this.manualSource.fetchJobCode(jobCode);
    } catch (error) {
      console.error('Error fetching job code:', error);
      throw error;
    }
  }
  
  /**
   * Get job codes assigned to a specific user
   */
  async getJobCodesForUser(userId) {
    try {
      const q = query(
        collection(db, 'jobCodes'),
        where('assignedUserIds', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching user job codes:', error);
      throw error;
    }
  }
  
  /**
   * Get job codes by company prefix
   */
  async getJobCodesByCompany(companyPrefix) {
    return this.getAllJobCodes({ companyPrefix });
  }
  
  // --------------------------------------------------------------------------
  // CREATE / UPDATE OPERATIONS
  // --------------------------------------------------------------------------
  
  /**
   * Create a new job code (manual entry)
   */
  async createJobCode(data) {
    try {
      // Generate job code
      const jobCode = await this.generateJobCode(data.companyPrefix, data.jobNatureCode);
      
      // Parse job code components
      const parsed = this.parseJobCode(jobCode);
      
      const jobCodeData = {
        id: jobCode,
        source: 'manual',
        crmJobId: null,
        
        // Job code components
        companyPrefix: parsed.companyPrefix,
        jobNatureCode: parsed.jobNatureCode,
        runningNumber: parsed.runningNumber,
        
        // Project details
        projectName: data.projectName || '',
        clientName: data.clientName || '',
        clientPIC: data.clientPIC || '',
        venue: data.venue || '',
        projectType: data.projectType || '',
        projectDates: {
          start: data.startDate || null,
          end: data.endDate || null
        },
        
        // Financial
        contractValue: data.contractValue || 0,
        variationOrders: [],
        totalRevenue: data.contractValue || 0,
        currency: 'MYR',
        
        // User assignment
        assignedUsers: data.assignedUsers || [],
        assignedUserIds: (data.assignedUsers || []).map(u => u.userId),
        
        // Notion integration
        notionProjectId: data.notionProjectId || null,
        notionProjectUrl: data.notionProjectUrl || null,
        
        // Costing summary (initial)
        costingSummary: {
          preCost: { total: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 } },
          postCost: { total: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 } },
          totalPaid: 0,
          totalPayable: 0,
          pendingApprovalCount: 0,
          pendingApprovalAmount: 0,
          byUser: {}
        },
        
        // Profit (computed)
        grossProfit: data.contractValue || 0,
        grossProfitPercentage: 100,
        taxDeduction: 0,
        netProfit: data.contractValue || 0,
        
        // Status
        status: 'active',
        costingStatus: 'not_started',
        
        // Linked documents
        linkedPOs: [],
        linkedPIs: [],
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastCostingUpdateAt: null,
        
        // Company/Branch
        companyId: data.companyId,
        branchId: data.branchId,
        
        // Created by
        createdBy: data.createdBy,
        createdByName: data.createdByName
      };
      
      await setDoc(doc(db, 'jobCodes', jobCode), jobCodeData);
      
      // Update counter
      await this.incrementJobCodeCounter(data.companyPrefix, data.jobNatureCode);
      
      return jobCode;
    } catch (error) {
      console.error('Error creating job code:', error);
      throw error;
    }
  }
  
  /**
   * Update job code details
   */
  async updateJobCode(jobCode, updates) {
    try {
      const docRef = doc(db, 'jobCodes', jobCode);
      
      // Recalculate financials if relevant fields changed
      if (updates.contractValue !== undefined || updates.variationOrders !== undefined) {
        const current = await this.getJobCode(jobCode);
        const totalRevenue = (updates.contractValue ?? current.contractValue) + 
          (updates.variationOrders ?? current.variationOrders).reduce((sum, vo) => sum + vo.amount, 0);
        
        updates.totalRevenue = totalRevenue;
        
        // Recalculate profit
        const postCostTotal = current.costingSummary?.postCost?.total || 0;
        updates.grossProfit = totalRevenue - postCostTotal;
        updates.grossProfitPercentage = totalRevenue > 0 ? (updates.grossProfit / totalRevenue) * 100 : 0;
        updates.taxDeduction = updates.grossProfit * 0.25;
        updates.netProfit = updates.grossProfit - updates.taxDeduction;
      }
      
      // Update assigned user IDs array if users changed
      if (updates.assignedUsers) {
        updates.assignedUserIds = updates.assignedUsers.map(u => u.userId);
      }
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating job code:', error);
      throw error;
    }
  }
  
  /**
   * Assign user to job code
   */
  async assignUser(jobCode, user, role = 'contributor') {
    try {
      const jobCodeData = await this.getJobCode(jobCode);
      if (!jobCodeData) throw new Error('Job code not found');
      
      const assignedUsers = jobCodeData.assignedUsers || [];
      const existingIndex = assignedUsers.findIndex(u => u.userId === user.userId);
      
      const assignment = {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        role: role, // pic, contributor, viewer
        branchId: user.branchId,
        branchName: user.branchName,
        assignedAt: new Date().toISOString(),
        assignedBy: user.assignedBy
      };
      
      if (existingIndex >= 0) {
        assignedUsers[existingIndex] = assignment;
      } else {
        assignedUsers.push(assignment);
      }
      
      await this.updateJobCode(jobCode, { assignedUsers });
      return true;
    } catch (error) {
      console.error('Error assigning user:', error);
      throw error;
    }
  }
  
  /**
   * Remove user from job code
   */
  async removeUser(jobCode, userId) {
    try {
      const jobCodeData = await this.getJobCode(jobCode);
      if (!jobCodeData) throw new Error('Job code not found');
      
      const assignedUsers = (jobCodeData.assignedUsers || [])
        .filter(u => u.userId !== userId);
      
      await this.updateJobCode(jobCode, { assignedUsers });
      return true;
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // COSTING SUMMARY UPDATES
  // --------------------------------------------------------------------------
  
  /**
   * Update costing summary (called when entries are approved/removed)
   */
  async updateCostingSummary(jobCode) {
    try {
      const CostingService = (await import('./CostingService')).default;
      const costingService = new CostingService();
      
      // Get all approved entries for this job code
      const entries = await costingService.getApprovedEntriesForJobCode(jobCode);
      
      // Calculate summaries
      const summary = {
        preCost: { total: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 } },
        postCost: { total: 0, byCategory: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 } },
        totalPaid: 0,
        totalPayable: 0,
        byUser: {}
      };
      
      for (const entry of entries) {
        const costType = entry.costType === 'pre' ? 'preCost' : 'postCost';
        const category = entry.category;
        
        // Add to totals
        summary[costType].total += entry.amount || 0;
        summary[costType].byCategory[category] = 
          (summary[costType].byCategory[category] || 0) + (entry.amount || 0);
        
        // Payment tracking
        summary.totalPaid += entry.amountPaid || 0;
        summary.totalPayable += entry.balancePayable || 0;
        
        // By user
        if (!summary.byUser[entry.createdBy]) {
          summary.byUser[entry.createdBy] = {
            userName: entry.createdByName,
            entryCount: 0,
            totalAmount: 0
          };
        }
        summary.byUser[entry.createdBy].entryCount++;
        summary.byUser[entry.createdBy].totalAmount += entry.amount || 0;
      }
      
      // Get pending entries count
      const pendingEntries = await costingService.getPendingEntriesForJobCode(jobCode);
      summary.pendingApprovalCount = pendingEntries.length;
      summary.pendingApprovalAmount = pendingEntries.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      // Get current job code for revenue
      const jobCodeData = await this.getJobCode(jobCode);
      const totalRevenue = jobCodeData.totalRevenue || 0;
      
      // Calculate profit
      const grossProfit = totalRevenue - summary.postCost.total;
      const grossProfitPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const taxDeduction = grossProfit > 0 ? grossProfit * 0.25 : 0;
      const netProfit = grossProfit - taxDeduction;
      
      // Determine variance status
      const variance = summary.postCost.total - summary.preCost.total;
      let varianceStatus = 'on_budget';
      if (summary.preCost.total > 0) {
        if (variance > 0) varianceStatus = 'over_budget';
        else if (variance < 0) varianceStatus = 'under_budget';
      }
      
      // Update job code
      await updateDoc(doc(db, 'jobCodes', jobCode), {
        costingSummary: summary,
        grossProfit,
        grossProfitPercentage,
        taxDeduction,
        netProfit,
        variance: {
          amount: variance,
          percentage: summary.preCost.total > 0 ? (variance / summary.preCost.total) * 100 : null,
          status: varianceStatus
        },
        costingStatus: entries.length > 0 ? 'in_progress' : 'not_started',
        lastCostingUpdateAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return summary;
    } catch (error) {
      console.error('Error updating costing summary:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------
  
  /**
   * Generate next job code for company/nature combination
   */
  async generateJobCode(companyPrefix, jobNatureCode) {
    try {
      // Get counter document
      const counterId = `${companyPrefix}-${jobNatureCode}`;
      const counterRef = doc(db, 'jobCodeCounters', counterId);
      const counterSnap = await getDoc(counterRef);
      
      let nextNumber = 1;
      if (counterSnap.exists()) {
        nextNumber = (counterSnap.data().lastNumber || 0) + 1;
      }
      
      // Format: FS-P1152, BWS-S5139
      return `${companyPrefix}-${jobNatureCode}${nextNumber}`;
    } catch (error) {
      console.error('Error generating job code:', error);
      throw error;
    }
  }
  
  /**
   * Increment job code counter after creation
   */
  async incrementJobCodeCounter(companyPrefix, jobNatureCode) {
    const counterId = `${companyPrefix}-${jobNatureCode}`;
    const counterRef = doc(db, 'jobCodeCounters', counterId);
    
    await setDoc(counterRef, {
      companyPrefix,
      jobNatureCode,
      lastNumber: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
  
  /**
   * Parse job code into components
   */
  parseJobCode(jobCode) {
    // Pattern: PREFIX-NATURENUMBER (e.g., FS-P1152, BWS-SV5001)
    const match = jobCode.match(/^([A-Z]+)-([A-Z]+)(\d+)$/);
    
    if (!match) {
      return { companyPrefix: null, jobNatureCode: null, runningNumber: null };
    }
    
    return {
      companyPrefix: match[1],
      jobNatureCode: match[2],
      runningNumber: parseInt(match[3], 10)
    };
  }
  
  /**
   * Validate job code format
   */
  isValidJobCode(jobCode) {
    const parsed = this.parseJobCode(jobCode);
    return parsed.companyPrefix && 
           this.companyPrefixes[parsed.companyPrefix] &&
           parsed.jobNatureCode &&
           parsed.runningNumber > 0;
  }
  
  /**
   * Get company name from prefix
   */
  getCompanyName(prefix) {
    return this.companyPrefixes[prefix] || prefix;
  }
  
  /**
   * Get job nature description
   */
  getJobNatureDescription(code) {
    return this.jobNatureCodes[code] || code;
  }
  
  /**
   * Link PO to job code
   */
  async linkPO(jobCode, poId, poNumber) {
    try {
      const jobCodeData = await this.getJobCode(jobCode);
      if (!jobCodeData) throw new Error('Job code not found');
      
      const linkedPOs = jobCodeData.linkedPOs || [];
      if (!linkedPOs.some(po => po.id === poId)) {
        linkedPOs.push({ id: poId, number: poNumber, linkedAt: new Date().toISOString() });
        
        // Fetch PO data to get totalAmount for recalculation
        let totalPOValue = jobCodeData.totalPOValue || 0;
        try {
          const poDoc = await getDoc(doc(db, 'purchaseOrders', poId));
          if (poDoc.exists()) {
            const poData = poDoc.data();
            const poAmount = parseFloat(poData.totalAmount) || 0;
            totalPOValue = (jobCodeData.totalPOValue || 0) + poAmount;
          }
        } catch (err) {
          console.warn('Could not fetch PO data for recalculation:', err);
          // Continue without updating totalPOValue
        }
        
        await this.updateJobCode(jobCode, { 
          linkedPOs,
          totalPOValue 
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error linking PO:', error);
      throw error;
    }
  }
  
  /**
   * Link PI to job code
   */
  async linkPI(jobCode, piId, piNumber) {
    try {
      const jobCodeData = await this.getJobCode(jobCode);
      if (!jobCodeData) throw new Error('Job code not found');
      
      const linkedPIs = jobCodeData.linkedPIs || [];
      if (!linkedPIs.some(pi => pi.id === piId)) {
        linkedPIs.push({ id: piId, number: piNumber, linkedAt: new Date().toISOString() });
        await this.updateJobCode(jobCode, { linkedPIs });
      }
      
      return true;
    } catch (error) {
      console.error('Error linking PI:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // NOTION INTEGRATION
  // --------------------------------------------------------------------------
  
  /**
   * Link job code to Notion project page
   */
  async linkToNotion(jobCode, notionProjectId, notionProjectUrl) {
    try {
      await this.updateJobCode(jobCode, {
        notionProjectId,
        notionProjectUrl,
        lastNotionSyncAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error linking to Notion:', error);
      throw error;
    }
  }
  
  // --------------------------------------------------------------------------
  // JOB CODE CASCADE UPDATES
  // --------------------------------------------------------------------------
  
  /**
   * Cascade update all references when job code changes
   * Updates costingEntries, approvalQueue, purchaseOrders, and proformaInvoices
   */
  async cascadeJobCodeUpdate(oldCode, newCode) {
    const batch = writeBatch(db);
    let updateCount = 0;
    
    try {
      // Update costingEntries
      const costingQuery = query(collection(db, 'costingEntries'), where('jobCode', '==', oldCode));
      const costingSnap = await getDocs(costingQuery);
      costingSnap.forEach(doc => {
        batch.update(doc.ref, { jobCode: newCode });
        updateCount++;
      });
      
      // Update approvalQueue
      const approvalQuery = query(collection(db, 'approvalQueue'), where('jobCode', '==', oldCode));
      const approvalSnap = await getDocs(approvalQuery);
      approvalSnap.forEach(doc => {
        batch.update(doc.ref, { jobCode: newCode });
        updateCount++;
      });
      
      // Update POs that reference this job code in projectCode field
      const poQuery = query(collection(db, 'purchaseOrders'), where('projectCode', '==', oldCode));
      const poSnap = await getDocs(poQuery);
      poSnap.forEach(doc => {
        batch.update(doc.ref, { projectCode: newCode });
        updateCount++;
      });
      
      // Update POs with projectCodes array containing old code
      // Note: Firestore doesn't support array-contains updates directly, so we need to read and update
      const poArrayQuery = query(collection(db, 'purchaseOrders'), where('projectCodes', 'array-contains', oldCode));
      const poArraySnap = await getDocs(poArrayQuery);
      poArraySnap.forEach(doc => {
        const data = doc.data();
        const projectCodes = data.projectCodes || [];
        const updatedCodes = projectCodes.map(c => c === oldCode ? newCode : c);
        batch.update(doc.ref, { projectCodes: updatedCodes });
        updateCount++;
      });
      
      // Update PO items that have projectCode field
      const allPOsQuery = query(collection(db, 'purchaseOrders'));
      const allPOsSnap = await getDocs(allPOsQuery);
      allPOsSnap.forEach(poDoc => {
        const poData = poDoc.data();
        if (poData.items && Array.isArray(poData.items)) {
          const updatedItems = poData.items.map(item => {
            if (item.projectCode === oldCode) {
              return { ...item, projectCode: newCode };
            }
            return item;
          });
          const hasChanges = updatedItems.some((item, idx) => item.projectCode !== poData.items[idx].projectCode);
          if (hasChanges) {
            batch.update(poDoc.ref, { items: updatedItems });
            updateCount++;
          }
        }
      });
      
      // Update Proforma Invoices that reference this job code
      const piQuery = query(collection(db, 'proformaInvoices'), where('projectCode', '==', oldCode));
      const piSnap = await getDocs(piQuery);
      piSnap.forEach(doc => {
        batch.update(doc.ref, { projectCode: newCode });
        updateCount++;
      });
      
      // Commit all updates
      if (updateCount > 0) {
        await batch.commit();
        console.log(`Cascade update completed: ${updateCount} documents updated from ${oldCode} to ${newCode}`);
      }
      
      return { success: true, updateCount };
    } catch (error) {
      console.error('Error in cascade job code update:', error);
      throw error;
    }
  }
  
  /**
   * Get count of linked records for a job code
   */
  async getLinkedRecordsCount(jobCode) {
    try {
      const [costingSnap, approvalSnap, poSnap, piSnap] = await Promise.all([
        getDocs(query(collection(db, 'costingEntries'), where('jobCode', '==', jobCode))),
        getDocs(query(collection(db, 'approvalQueue'), where('jobCode', '==', jobCode))),
        getDocs(query(collection(db, 'purchaseOrders'), where('projectCode', '==', jobCode))),
        getDocs(query(collection(db, 'proformaInvoices'), where('projectCode', '==', jobCode)))
      ]);
      
      // Also check PO items
      const allPOsSnap = await getDocs(collection(db, 'purchaseOrders'));
      let poItemsCount = 0;
      allPOsSnap.forEach(poDoc => {
        const items = poDoc.data().items || [];
        if (items.some(item => item.projectCode === jobCode)) {
          poItemsCount++;
        }
      });
      
      return {
        costingEntries: costingSnap.size,
        approvalQueue: approvalSnap.size,
        purchaseOrders: poSnap.size + poItemsCount,
        proformaInvoices: piSnap.size
      };
    } catch (error) {
      console.error('Error getting linked records count:', error);
      return {
        costingEntries: 0,
        approvalQueue: 0,
        purchaseOrders: 0,
        proformaInvoices: 0
      };
    }
  }
}

// Export singleton instance
const jobCodeService = new JobCodeService();
export default jobCodeService;
export { JobCodeService };
