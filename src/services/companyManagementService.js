// src/services/companyManagementService.js
// Dynamic Company and Branch Management Service

import { mockFirebase } from './firebase';
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
    this.db = mockFirebase.firestore;
    this.initialized = false;
  }

  // Initialize all companies and branches in Firestore
  async initializeCompanyStructure() {
    try {
      console.log('🏢 Initializing company structure...');
      
      // 1. Initialize Companies
      const companiesCollection = this.db.collection('companies');
      for (const [companyId, companyData] of Object.entries(REAL_COMPANIES)) {
        await companiesCollection.doc(companyId).set({
          ...companyData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        });
        console.log(`✅ Company initialized: ${companyData.name}`);
      }

      // 2. Initialize Branches
      const branchesCollection = this.db.collection('branches');
      for (const [branchId, branchData] of Object.entries(COMPANY_BRANCHES)) {
        await branchesCollection.doc(branchId).set({
          ...branchData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        });
        console.log(`✅ Branch initialized: ${branchData.name}`);
      }

      // 3. Initialize Admin Assignments
      const adminCollection = this.db.collection('adminAssignments');
      for (const [email, assignment] of Object.entries(DEFAULT_ADMIN_ASSIGNMENTS)) {
        await adminCollection.doc(email).set({
          ...assignment,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Admin assignment created: ${email}`);
      }

      // 4. Set initialization flag
      await this.db.collection('systemConfig').doc('companyStructure').set({
        initialized: true,
        initializationDate: new Date().toISOString(),
        totalCompanies: Object.keys(REAL_COMPANIES).length,
        totalBranches: Object.keys(COMPANY_BRANCHES).length,
        version: '1.0.0'
      });

      this.initialized = true;
      console.log('🎉 Company structure initialization complete!');
      
      return {
        success: true,
        companiesCreated: Object.keys(REAL_COMPANIES).length,
        branchesCreated: Object.keys(COMPANY_BRANCHES).length,
        adminAssignments: Object.keys(DEFAULT_ADMIN_ASSIGNMENTS).length
      };

    } catch (error) {
      console.error('❌ Error initializing company structure:', error);
      throw error;
    }
  }

  // Check if system is initialized
  async isInitialized() {
    try {
      const config = await this.db.collection('systemConfig').doc('companyStructure').get();
      return config.exists() && config.data()?.initialized === true;
    } catch (error) {
      console.error('Error checking initialization status:', error);
      return false;
    }
  }

  // Get all companies
  async getAllCompanies() {
    try {
      const snapshot = await this.db.collection('companies').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }

  // Get all branches
  async getAllBranches() {
    try {
      const snapshot = await this.db.collection('branches').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching branches:', error);
      return [];
    }
  }

  // Get branches for specific company
  async getBranchesByCompany(companyId) {
    try {
      const snapshot = await this.db.collection('branches')
        .where('companyId', '==', companyId)
        .get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching company branches:', error);
      return [];
    }
  }

  // Get user's admin assignment
  async getUserAdminAssignment(userEmail) {
    try {
      const doc = await this.db.collection('adminAssignments').doc(userEmail).get();
      if (doc.exists()) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching admin assignment:', error);
      return null;
    }
  }

  // Update admin assignment
  async updateAdminAssignment(userEmail, assignment) {
    try {
      await this.db.collection('adminAssignments').doc(userEmail).set({
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
      
      await this.db.collection('companies').doc(companyId).set({
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
      
      await this.db.collection('branches').doc(branchId).set({
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
          const doc = await this.db.collection('companies').doc(companyId).get();
          if (doc.exists()) {
            companies.push({ id: doc.id, ...doc.data() });
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
      const companies = await this.getAllCompanies();
      const branches = await this.getAllBranches();
      
      // Get PO counts by company
      const poSnapshot = await this.db.collection('purchaseOrders').get();
      const purchaseOrders = poSnapshot.docs.map(doc => doc.data());
      
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
      return null;
    }
  }

  // Migrate existing POs to include company/branch information
  async migratePurchaseOrders() {
    try {
      console.log('🔄 Migrating existing Purchase Orders...');
      
      const snapshot = await this.db.collection('purchaseOrders').get();
      const updates = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        
        // If PO doesn't have company/branch info, assign to default (Flow Solution)
        if (!data.companyId) {
          updates.push(
            doc.ref.update({
              companyId: 'flow-solution',
              branchId: 'flow-solution-kl-hq',
              updatedAt: new Date().toISOString(),
              migrated: true
            })
          );
        }
      });

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
