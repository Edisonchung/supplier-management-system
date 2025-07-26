// src/services/companyManagementService.js
// Dynamic Company and Branch Management Service - Updated for Real Firebase

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
  orderBy 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { 
  REAL_COMPANIES, 
  COMPANY_BRANCHES, 
  DEFAULT_ADMIN_ASSIGNMENTS,
  ADMIN_HIERARCHY,
  getCompanyById,
  getBranchesByCompany 
} from '../utils/realCompanyStructure';

class CompanyManagementService {
  constructor() {
    this.initialized = false;
  }

  // ✅ FIXED: Safe document existence check
  async documentExists(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    } catch (error) {
      console.error(`Error checking if document exists: ${collectionName}/${docId}`, error);
      return false;
    }
  }

  // ✅ FIXED: Safe document getter
  async safeGetDocument(collectionName, docId) {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          exists: true,
          data: docSnap.data(),
          id: docSnap.id
        };
      } else {
        return {
          exists: false,
          data: null,
          id: null
        };
      }
    } catch (error) {
      console.error(`Error getting document: ${collectionName}/${docId}`, error);
      return {
        exists: false,
        data: null,
        id: null,
        error: error.message
      };
    }
  }

  // Initialize all companies and branches in Firestore
  async initializeCompanyStructure() {
    try {
      console.log('🏢 Initializing company structure...');
      
      let companiesCreated = 0;
      let branchesCreated = 0;
      let adminAssignments = 0;

      // 1. Initialize Companies
      for (const [companyId, companyData] of Object.entries(REAL_COMPANIES)) {
        try {
          const companyRef = doc(db, 'companies', companyId);
          await setDoc(companyRef, {
            ...companyData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
          });
          companiesCreated++;
          console.log(`✅ Company initialized: ${companyData.name}`);
        } catch (error) {
          console.error(`❌ Failed to initialize company ${companyId}:`, error);
        }
      }

      // 2. Initialize Branches
      for (const [branchId, branchData] of Object.entries(COMPANY_BRANCHES)) {
        try {
          const branchRef = doc(db, 'branches', branchId);
          await setDoc(branchRef, {
            ...branchData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
          });
          branchesCreated++;
          console.log(`✅ Branch initialized: ${branchData.name}`);
        } catch (error) {
          console.error(`❌ Failed to initialize branch ${branchId}:`, error);
        }
      }

      // 3. Initialize Admin Assignments
      for (const [email, assignment] of Object.entries(DEFAULT_ADMIN_ASSIGNMENTS)) {
        try {
          const adminRef = doc(db, 'adminAssignments', email);
          await setDoc(adminRef, {
            ...assignment,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          adminAssignments++;
          console.log(`✅ Admin assignment created: ${email}`);
        } catch (error) {
          console.error(`❌ Failed to create admin assignment for ${email}:`, error);
        }
      }

      // 4. Set initialization flag
      try {
        const configRef = doc(db, 'systemConfig', 'companyStructure');
        await setDoc(configRef, {
          initialized: true,
          initializationDate: new Date().toISOString(),
          totalCompanies: companiesCreated,
          totalBranches: branchesCreated,
          version: '1.0.0'
        });

        this.initialized = true;
        console.log('🎉 Company structure initialization complete!');
        
        return {
          success: true,
          companiesCreated,
          branchesCreated,
          adminAssignments
        };
      } catch (error) {
        console.error('❌ Failed to set initialization flag:', error);
        return {
          success: false,
          error: error.message,
          companiesCreated,
          branchesCreated,
          adminAssignments
        };
      }

    } catch (error) {
      console.error('❌ Company structure initialization failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Check if system is initialized
  async isInitialized() {
    try {
      const result = await this.safeGetDocument('systemConfig', 'companyStructure');
      this.initialized = result.exists && result.data?.initialized === true;
      return this.initialized;
    } catch (error) {
      console.error('Error checking initialization:', error);
      return false;
    }
  }

  // Get all companies
  async getAllCompanies() {
    try {
      const companiesSnapshot = await getDocs(collection(db, 'companies'));
      const companies = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📥 Loaded ${companies.length} companies from Firestore`);
      return companies;
    } catch (error) {
      console.error('Error loading companies from Firestore:', error);
      // Fallback to static data
      console.log('📥 Fallback: Using static company data');
      return Object.entries(REAL_COMPANIES).map(([id, data]) => ({
        id,
        ...data
      }));
    }
  }

  // Get all branches
  async getAllBranches() {
    try {
      const branchesSnapshot = await getDocs(collection(db, 'branches'));
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📥 Loaded ${branches.length} branches from Firestore`);
      return branches;
    } catch (error) {
      console.error('Error loading branches from Firestore:', error);
      // Fallback to static data
      console.log('📥 Fallback: Using static branch data');
      return Object.entries(COMPANY_BRANCHES).map(([id, data]) => ({
        id,
        ...data
      }));
    }
  }

  // Get branches for specific company
  async getBranchesByCompany(companyId) {
    try {
      const q = query(collection(db, 'branches'), where('companyId', '==', companyId));
      const branchesSnapshot = await getDocs(q);
      const branches = branchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`📥 Loaded ${branches.length} branches for company ${companyId}`);
      return branches;
    } catch (error) {
      console.error('Error fetching company branches:', error);
      // Fallback to static data
      return getBranchesByCompany(companyId);
    }
  }

  // ✅ FIXED: Get user's admin assignment with proper error handling
  async getUserAdminAssignment(userEmail) {
    try {
      const result = await this.safeGetDocument('adminAssignments', userEmail);
      
      if (result.exists) {
        console.log(`📋 Admin assignment found for ${userEmail}`);
        return { id: result.id, ...result.data };
      } else {
        console.log(`📋 No admin assignment found for ${userEmail}`);
        return null;
      }
    } catch (error) {
      console.error('Error fetching admin assignment:', error);
      return null;
    }
  }

  // Update admin assignment
  async updateAdminAssignment(userEmail, assignment) {
    try {
      const adminRef = doc(db, 'adminAssignments', userEmail);
      await setDoc(adminRef, {
        ...assignment,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log(`✅ Admin assignment updated for ${userEmail}`);
      return true;
    } catch (error) {
      console.error('Error updating admin assignment:', error);
      return false;
    }
  }

  // Add new company (for yearly expansion)
  async addNewCompany(companyData) {
    try {
      const companyId = companyData.id || this.generateCompanyId(companyData.name);
      
      const companyRef = doc(db, 'companies', companyId);
      await setDoc(companyRef, {
        ...companyData,
        id: companyId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });

      console.log(`✅ New company added: ${companyData.name}`);
      return { success: true, companyId };
    } catch (error) {
      console.error('Error adding new company:', error);
      return { success: false, error: error.message };
    }
  }

  // Add new branch
  async addNewBranch(branchData) {
    try {
      const branchId = branchData.id || this.generateBranchId(branchData.name);
      
      const branchRef = doc(db, 'branches', branchId);
      await setDoc(branchRef, {
        ...branchData,
        id: branchId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      });

      console.log(`✅ New branch added: ${branchData.name}`);
      return { success: true, branchId };
    } catch (error) {
      console.error('Error adding new branch:', error);
      return { success: false, error: error.message };
    }
  }

  // Get companies accessible by user
  async getAccessibleCompanies(userEmail) {
    try {
      const adminAssignment = await this.getUserAdminAssignment(userEmail);
      
      if (!adminAssignment) {
        return []; // No access
      }

      // Group Admin - access to all companies
      if (adminAssignment.role === 'group_admin' || 
          adminAssignment.companyIds?.includes('*')) {
        return await this.getAllCompanies();
      }

      // Specific company access
      if (adminAssignment.companyIds?.length > 0) {
        const companies = [];
        for (const companyId of adminAssignment.companyIds) {
          const result = await this.safeGetDocument('companies', companyId);
          if (result.exists) {
            companies.push({ id: result.id, ...result.data });
          }
        }
        return companies;
      }

      return [];
    } catch (error) {
      console.error('Error getting accessible companies:', error);
      return [];
    }
  }

  // Get branches accessible by user
  async getAccessibleBranches(userEmail) {
    try {
      const adminAssignment = await this.getUserAdminAssignment(userEmail);
      
      if (!adminAssignment) {
        return []; // No access
      }

      // Group Admin - access to all branches
      if (adminAssignment.role === 'group_admin' || 
          adminAssignment.branchIds?.includes('*')) {
        return await this.getAllBranches();
      }

      // Access based on company permissions
      const accessibleCompanies = await this.getAccessibleCompanies(userEmail);
      const branches = [];
      
      for (const company of accessibleCompanies) {
        const companyBranches = await this.getBranchesByCompany(company.id);
        branches.push(...companyBranches);
      }

      return branches;
    } catch (error) {
      console.error('Error getting accessible branches:', error);
      return [];
    }
  }

  // Generate company ID from name
  generateCompanyId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/sdn-bhd/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Generate branch ID from name and company
  generateBranchId(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Get user permissions based on admin assignment
  async getUserPermissions(userEmail) {
    try {
      const adminAssignment = await this.getUserAdminAssignment(userEmail);
      
      if (!adminAssignment) {
        return {
          role: 'viewer',
          permissions: ['view_own'],
          companies: [],
          branches: [],
          badge: 'Viewer'
        };
      }

      const roleConfig = ADMIN_HIERARCHY[adminAssignment.role] || ADMIN_HIERARCHY.company_admin;
      
      return {
        role: adminAssignment.role,
        permissions: adminAssignment.permissions || roleConfig.scope.permissions,
        companies: await this.getAccessibleCompanies(userEmail),
        branches: await this.getAccessibleBranches(userEmail),
        badge: adminAssignment.badge || roleConfig.badge,
        title: roleConfig.title,
        level: roleConfig.level
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return {
        role: 'viewer',
        permissions: ['view_own'],
        companies: [],
        branches: [],
        badge: 'Viewer'
      };
    }
  }

  // Get company statistics
  async getCompanyStatistics() {
    try {
      const [companies, branches] = await Promise.all([
        this.getAllCompanies(),
        this.getAllBranches()
      ]);
      
      // Get PO counts by company
      let purchaseOrders = [];
      try {
        const poSnapshot = await getDocs(collection(db, 'purchaseOrders'));
        purchaseOrders = poSnapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.warn('Could not load purchase orders for statistics:', error);
      }
      
      const stats = {
        totalCompanies: companies.length,
        totalBranches: branches.length,
        totalPurchaseOrders: purchaseOrders.length,
        companiesByCategory: {},
        branchesByCompany: {},
        posByCompany: {}
      };

      // Group companies by category
      companies.forEach(company => {
        const category = company.category || 'other';
        stats.companiesByCategory[category] = (stats.companiesByCategory[category] || 0) + 1;
      });

      // Group branches by company
      branches.forEach(branch => {
        const companyId = branch.companyId;
        stats.branchesByCompany[companyId] = (stats.branchesByCompany[companyId] || 0) + 1;
      });

      // Group POs by company
      purchaseOrders.forEach(po => {
        const companyId = po.companyId || 'unassigned';
        stats.posByCompany[companyId] = (stats.posByCompany[companyId] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error getting company statistics:', error);
      return {
        totalCompanies: 0,
        totalBranches: 0,
        totalPurchaseOrders: 0,
        companiesByCategory: {},
        branchesByCompany: {},
        posByCompany: {}
      };
    }
  }

  // Migrate existing POs to include company/branch information
  async migratePurchaseOrders() {
    try {
      console.log('🔄 Migrating existing Purchase Orders...');
      
      const posSnapshot = await getDocs(collection(db, 'purchaseOrders'));
      const updates = [];

      for (const docSnap of posSnapshot.docs) {
        const data = docSnap.data();
        
        // If PO doesn't have company/branch info, assign to default (Flow Solution)
        if (!data.companyId) {
          const updateRef = doc(db, 'purchaseOrders', docSnap.id);
          updates.push(
            updateDoc(updateRef, {
              companyId: 'flow-solution',
              branchId: 'flow-solution-kl-hq',
              updatedAt: new Date().toISOString(),
              migrated: true
            })
          );
        }
      }

      await Promise.all(updates);
      console.log(`✅ Migrated ${updates.length} Purchase Orders`);
      
      return { success: true, migratedCount: updates.length };
    } catch (error) {
      console.error('❌ Error migrating Purchase Orders:', error);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const companyManagementService = new CompanyManagementService();

export default companyManagementService;
