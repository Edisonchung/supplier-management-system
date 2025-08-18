// src/hooks/usePermissions.js
// Enhanced Multi-Company Permissions Hook - Phase 2B Analytics & E-commerce Integration

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/constants';
import companyManagementService from '../services/companyManagementService';

export const usePermissions = () => {
  const { user } = useAuth();
  const [companyPermissions, setCompanyPermissions] = useState(null);
  const [accessibleCompanies, setAccessibleCompanies] = useState([]);
  const [accessibleBranches, setAccessibleBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load company-specific permissions
  useEffect(() => {
    const loadCompanyPermissions = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Get user's multi-company permissions
        const permissions = await companyManagementService.getUserPermissions(user.email);
        setCompanyPermissions(permissions);
        setAccessibleCompanies(permissions.companies || []);
        setAccessibleBranches(permissions.branches || []);
        
      } catch (error) {
        console.error('Error loading company permissions:', error);
        setCompanyPermissions(null);
      } finally {
        setLoading(false);
      }
    };

    loadCompanyPermissions();
  }, [user?.email]);

  if (!user) {
    return {
      // Basic permissions - all false for unauthenticated users
      canViewDashboard: false,
      canViewSuppliers: false,
      canEditSuppliers: false,
      canViewProducts: false,
      canEditProducts: false,
      canViewPurchaseOrders: false,
      canEditPurchaseOrders: false,
      canApprovePurchaseOrders: false,
      canDeletePurchaseOrders: false,
      canViewPI: false,
      canEditPI: false,
      canViewInvoices: false,
      canEditInvoices: false,
      canViewDeliveries: false,
      canViewTracking: false,
      canUpdateDeliveryStatus: false,
      canViewOrders: false,
      canImportData: false,
      canManageUsers: false,
      canViewActivity: false,
      canManageSettings: false,
      
      // 🚀 NEW: Phase 2B Analytics Permissions
      canViewAnalytics: false,
      canViewReports: false,
      canViewInsights: false,
      canExportAnalytics: false,
      canManageAnalytics: false,
      
      // 🚀 NEW: Phase 2B E-commerce Permissions
      canViewFactories: false,
      canManageFactories: false,
      canViewQuotes: false,
      canManageQuotes: false,
      canViewCatalog: false,
      canEditCatalog: false,
      canProcessOrders: false,
      canManageShoppingCart: false,
      
      // Multi-company permissions
      canViewAllCompanies: false,
      canManageCompanies: false,
      canViewCompanyStructure: false,
      canAssignAdmins: false,
      canViewCrossCompanyReports: false,
      
      // Role flags
      isAdmin: false,
      isManager: false,
      isEmployee: false,
      isViewer: false,
      isGroupAdmin: false,
      isDivisionAdmin: false,
      isCompanyAdmin: false,
      isRegionalAdmin: false,
      
      // 🚀 NEW: Phase 2B User Types
      isFactoryUser: false,
      isSupplierUser: false,
      isAnalyticsUser: false,
      isMultiCompanyUser: false,
      
      // Company access
      accessibleCompanies: [],
      accessibleBranches: [],
      userCompanyRole: null,
      userBadge: 'Viewer',
      
      role: null,
      loading: false
    };
  }
  
  const userRole = user.role || 'viewer';
  
  // Special admin checks
  const isEdisonAdmin = user.email === 'edisonchung@flowsolution.net';
  const isAdmin = userRole === 'admin' || isEdisonAdmin;
  
  // Multi-company role checks
  const isGroupAdmin = companyPermissions?.role === 'group_admin' || isEdisonAdmin;
  const isDivisionAdmin = companyPermissions?.role === 'division_admin';
  const isCompanyAdmin = companyPermissions?.role === 'company_admin';
  const isRegionalAdmin = companyPermissions?.role === 'regional_admin';
  
  // 🚀 NEW: Phase 2B User Type Detection
  const isFactoryUser = user.email?.includes('factory') || user.userType === 'factory';
  const isSupplierUser = user.email?.includes('supplier') || user.userType === 'supplier';
  const isAnalyticsUser = ['admin', 'manager'].includes(userRole) || isGroupAdmin || isDivisionAdmin;
  const isMultiCompanyUser = isGroupAdmin || isDivisionAdmin || isCompanyAdmin || isRegionalAdmin;
  
  // Company permissions based on role
  const hasCompanyPermission = (permission) => {
    if (isGroupAdmin) return true;
    return companyPermissions?.permissions?.includes(permission) || false;
  };

  // Safe access with fallbacks for traditional permissions - ALL SYNTAX FIXED
  const basePermissions = {
    // Dashboard permissions - everyone can view
    canViewDashboard: PERMISSIONS?.canViewDashboard?.includes(userRole) ?? 
                     ['admin', 'manager', 'employee', 'viewer'].includes(userRole),
    
    // Supplier permissions - FIXED WITH GROUP ADMIN
    canEditSuppliers: (PERMISSIONS?.canEditSuppliers?.includes(userRole) ?? 
                      ['admin', 'manager'].includes(userRole)) ||
                      isGroupAdmin ||
                      hasCompanyPermission('edit_all') ||
                      hasCompanyPermission('manage_companies'),
                     
    canViewSuppliers: (PERMISSIONS?.canViewSuppliers?.includes(userRole) ?? 
                      ['admin', 'manager'].includes(userRole)) ||
                      isGroupAdmin ||
                      hasCompanyPermission('view_all'),
    
    // Product permissions - FIXED WITH GROUP ADMIN
    canEditProducts: (PERMISSIONS?.canEditProducts?.includes(userRole) ?? 
                     ['admin', 'manager', 'employee'].includes(userRole)) ||
                     isGroupAdmin ||
                     hasCompanyPermission('edit_all'),
                     
    canViewProducts: (PERMISSIONS?.canViewProducts?.includes(userRole) ?? 
                     ['admin', 'manager', 'employee', 'viewer'].includes(userRole)) ||
                     isGroupAdmin ||
                     hasCompanyPermission('view_all'),
    
    // Order permissions - FIXED TRIPLE ?? OPERATORS
    canViewOrders: (PERMISSIONS?.canViewOrders?.includes(userRole) ?? 
                   (PERMISSIONS?.canViewPurchaseOrders?.includes(userRole) ?? 
                   ['admin', 'manager'].includes(userRole))) ||
                   isGroupAdmin ||
                   hasCompanyPermission('view_all'),
    
    // Purchase Order permissions - FIXED WITH GROUP ADMIN
    canEditPurchaseOrders: (PERMISSIONS?.canEditPurchaseOrders?.includes(userRole) ?? 
                           ['admin', 'manager'].includes(userRole)) ||
                           isGroupAdmin ||
                           hasCompanyPermission('edit_all'),
                           
    canViewPurchaseOrders: (PERMISSIONS?.canViewPurchaseOrders?.includes(userRole) ?? 
                           ['admin', 'manager'].includes(userRole)) ||
                           isGroupAdmin ||
                           hasCompanyPermission('view_all'),
                           
    canApprovePurchaseOrders: (PERMISSIONS?.canApprovePurchaseOrders?.includes(userRole) ?? 
                              ['admin', 'manager'].includes(userRole)) ||
                              isGroupAdmin ||
                              hasCompanyPermission('edit_all'),
                              
    canDeletePurchaseOrders: isAdmin || isGroupAdmin,
    
    // Proforma Invoice permissions - FIXED WITH GROUP ADMIN
    canViewPI: (PERMISSIONS?.canViewPI?.includes(userRole) ?? 
               ['admin', 'manager', 'employee'].includes(userRole)) ||
               isGroupAdmin ||
               hasCompanyPermission('view_all'),
               
    canEditPI: (PERMISSIONS?.canEditPI?.includes(userRole) ?? 
               ['admin', 'manager'].includes(userRole)) ||
               isGroupAdmin ||
               hasCompanyPermission('edit_all'),
    
    // Invoice permissions - FIXED WITH GROUP ADMIN
    canViewInvoices: (PERMISSIONS?.canViewInvoices?.includes(userRole) ?? 
                     ['admin', 'manager'].includes(userRole)) ||
                     isGroupAdmin ||
                     hasCompanyPermission('view_all'),
                     
    canEditInvoices: (PERMISSIONS?.canEditInvoices?.includes(userRole) ?? 
                     ['admin', 'manager'].includes(userRole)) ||
                     isGroupAdmin ||
                     hasCompanyPermission('edit_all'),
    
    // Delivery/Tracking permissions - FIXED TRIPLE ?? OPERATORS
    canViewDeliveries: (PERMISSIONS?.canViewDeliveries?.includes(userRole) ?? 
                       (PERMISSIONS?.canViewTracking?.includes(userRole) ?? 
                       ['admin', 'manager', 'employee'].includes(userRole))) ||
                       isGroupAdmin ||
                       hasCompanyPermission('view_all'),
                       
    canViewTracking: (PERMISSIONS?.canViewTracking?.includes(userRole) ?? 
                     ['admin', 'manager', 'employee'].includes(userRole)) ||
                     isGroupAdmin ||
                     hasCompanyPermission('view_all'),
                     
    canUpdateDeliveryStatus: (PERMISSIONS?.canUpdateDeliveryStatus?.includes(userRole) ?? 
                             ['admin', 'manager'].includes(userRole)) ||
                             isGroupAdmin ||
                             hasCompanyPermission('edit_all'),
    
    // Import permissions - FIXED WITH GROUP ADMIN
    canImportData: (PERMISSIONS?.canImportData?.includes(userRole) ?? 
                   ['admin', 'manager'].includes(userRole)) ||
                   isGroupAdmin ||
                   hasCompanyPermission('edit_all'),
    
    // Team and system management permissions - FIXED WITH GROUP ADMIN
    canManageUsers: (PERMISSIONS?.canManageUsers?.includes(userRole) ?? isAdmin) ||
                    isGroupAdmin ||
                    hasCompanyPermission('manage_users'),
                    
    canViewActivity: (PERMISSIONS?.canViewActivity?.includes(userRole) ?? isAdmin) ||
                     isGroupAdmin ||
                     hasCompanyPermission('view_all'),
                     
    canManageSettings: (PERMISSIONS?.canManageSettings?.includes(userRole) ?? isAdmin) ||
                       isGroupAdmin ||
                       hasCompanyPermission('manage_companies'),

    // AI & MCP Tool permissions - EXISTING SECTION
    canViewAI: (PERMISSIONS?.canViewAI?.includes(userRole) ?? 
               ['admin', 'manager', 'employee'].includes(userRole)) ||
               isGroupAdmin ||
               hasCompanyPermission('view_all'),
               
    canExecuteAI: (PERMISSIONS?.canExecuteAI?.includes(userRole) ?? 
                  ['admin', 'manager', 'employee'].includes(userRole)) ||
                  isGroupAdmin ||
                  hasCompanyPermission('edit_all'),
                  
    canManageAI: (PERMISSIONS?.canManageAI?.includes(userRole) ?? 
                 ['admin'].includes(userRole)) ||
                 isGroupAdmin ||
                 hasCompanyPermission('manage_companies'),
    
    canManagePrompts: (PERMISSIONS?.canManagePrompts?.includes(userRole) ?? 
                  ['admin'].includes(userRole)) ||
                  user?.email === 'edisonchung@flowsolution.net' ||
                  isGroupAdmin ||
                  hasCompanyPermission('manage_companies'),
                 
    canViewMCP: (PERMISSIONS?.canViewMCP?.includes(userRole) ?? 
                ['admin', 'manager', 'employee'].includes(userRole)) ||
                isGroupAdmin ||
                hasCompanyPermission('view_all'),
                
    canExecuteMCP: (PERMISSIONS?.canExecuteMCP?.includes(userRole) ?? 
                   ['admin', 'manager', 'employee'].includes(userRole)) ||
                   isGroupAdmin ||
                   hasCompanyPermission('edit_all'),
                   
    canManageMCP: (PERMISSIONS?.canManageMCP?.includes(userRole) ?? 
                  ['admin'].includes(userRole)) ||
                  isGroupAdmin ||
                  hasCompanyPermission('manage_companies')
  };

  // 🚀 NEW: Phase 2B Analytics Permissions
  const analyticsPermissions = {
    // Analytics Dashboard Access
    canViewAnalytics: (PERMISSIONS?.canViewAnalytics?.includes(userRole) ?? 
                      ['admin', 'manager'].includes(userRole)) ||
                      isGroupAdmin ||
                      isDivisionAdmin ||
                      hasCompanyPermission('view_analytics'),
    
    // Reports and Insights
    canViewReports: (PERMISSIONS?.canViewReports?.includes(userRole) ?? 
                    ['admin', 'manager'].includes(userRole)) ||
                    isGroupAdmin ||
                    isDivisionAdmin ||
                    hasCompanyPermission('view_reports'),
                    
    canViewInsights: (PERMISSIONS?.canViewInsights?.includes(userRole) ?? 
                     ['admin', 'manager'].includes(userRole)) ||
                     isGroupAdmin ||
                     isDivisionAdmin ||
                     hasCompanyPermission('view_analytics'),
    
    // Data Export and Management
    canExportAnalytics: (PERMISSIONS?.canExportAnalytics?.includes(userRole) ?? 
                        ['admin', 'manager'].includes(userRole)) ||
                        isGroupAdmin ||
                        hasCompanyPermission('export_data'),
                        
    canManageAnalytics: (PERMISSIONS?.canManageAnalytics?.includes(userRole) ?? 
                        ['admin'].includes(userRole)) ||
                        isGroupAdmin ||
                        hasCompanyPermission('manage_analytics'),
    
    // Real-time Insights Access
    canViewRealTimeData: (PERMISSIONS?.canViewRealTimeData?.includes(userRole) ?? 
                         ['admin', 'manager'].includes(userRole)) ||
                         isGroupAdmin ||
                         isDivisionAdmin ||
                         hasCompanyPermission('view_realtime'),
                         
    // Business Intelligence
    canViewBusinessIntelligence: (PERMISSIONS?.canViewBusinessIntelligence?.includes(userRole) ?? 
                                 ['admin', 'manager'].includes(userRole)) ||
                                 isGroupAdmin ||
                                 isDivisionAdmin ||
                                 hasCompanyPermission('view_bi')
  };

  // 🚀 NEW: Phase 2B E-commerce Permissions
  const ecommercePermissions = {
    // Factory Management
    canViewFactories: (PERMISSIONS?.canViewFactories?.includes(userRole) ?? 
                      ['admin', 'manager', 'employee'].includes(userRole)) ||
                      isGroupAdmin ||
                      hasCompanyPermission('view_all') ||
                      isFactoryUser,
                      
    canManageFactories: (PERMISSIONS?.canManageFactories?.includes(userRole) ?? 
                        ['admin', 'manager'].includes(userRole)) ||
                        isGroupAdmin ||
                        hasCompanyPermission('manage_factories'),
                        
    canRegisterFactory: true, // Public registration allowed
    
    // Quote Management
    canViewQuotes: (PERMISSIONS?.canViewQuotes?.includes(userRole) ?? 
                   ['admin', 'manager', 'employee'].includes(userRole)) ||
                   isGroupAdmin ||
                   hasCompanyPermission('view_all') ||
                   isFactoryUser ||
                   isSupplierUser,
                   
    canManageQuotes: (PERMISSIONS?.canManageQuotes?.includes(userRole) ?? 
                     ['admin', 'manager'].includes(userRole)) ||
                     isGroupAdmin ||
                     hasCompanyPermission('manage_quotes') ||
                     isSupplierUser,
                     
    canCreateQuotes: isFactoryUser || 
                     ['admin', 'manager', 'employee'].includes(userRole) ||
                     isGroupAdmin,
                     
    canRespondToQuotes: isSupplierUser ||
                        ['admin', 'manager'].includes(userRole) ||
                        isGroupAdmin,
    
    // Catalog Access
    canViewCatalog: true, // Public catalog access
    
    canEditCatalog: (PERMISSIONS?.canEditCatalog?.includes(userRole) ?? 
                    ['admin', 'manager'].includes(userRole)) ||
                    isGroupAdmin ||
                    hasCompanyPermission('edit_catalog') ||
                    isSupplierUser,
                    
    canManageCatalog: (PERMISSIONS?.canManageCatalog?.includes(userRole) ?? 
                      ['admin'].includes(userRole)) ||
                      isGroupAdmin ||
                      hasCompanyPermission('manage_catalog'),
    
    // Order Processing
    canProcessOrders: (PERMISSIONS?.canProcessOrders?.includes(userRole) ?? 
                      ['admin', 'manager', 'employee'].includes(userRole)) ||
                      isGroupAdmin ||
                      hasCompanyPermission('process_orders') ||
                      isSupplierUser,
                      
    canViewOrderHistory: (PERMISSIONS?.canViewOrderHistory?.includes(userRole) ?? 
                         ['admin', 'manager', 'employee'].includes(userRole)) ||
                         isGroupAdmin ||
                         hasCompanyPermission('view_all') ||
                         isFactoryUser ||
                         isSupplierUser,
    
    // Shopping Cart
    canManageShoppingCart: isFactoryUser ||
                          ['admin', 'manager', 'employee'].includes(userRole) ||
                          isGroupAdmin,
                          
    canCheckout: isFactoryUser ||
                 ['admin', 'manager', 'employee'].includes(userRole) ||
                 isGroupAdmin,
    
    // Supplier Features
    canManageSupplierProfile: isSupplierUser ||
                             ['admin'].includes(userRole) ||
                             isGroupAdmin,
                             
    canUploadProducts: isSupplierUser ||
                       ['admin', 'manager'].includes(userRole) ||
                       isGroupAdmin,
    
    // Factory Features
    canManageFactoryProfile: isFactoryUser ||
                            ['admin'].includes(userRole) ||
                            isGroupAdmin,
                            
    canAccessFactoryDashboard: isFactoryUser ||
                              ['admin', 'manager'].includes(userRole) ||
                              isGroupAdmin
  };

  // Multi-company specific permissions
  const multiCompanyPermissions = {
    // Multi-company management
    canViewAllCompanies: isGroupAdmin || hasCompanyPermission('view_all'),
    canManageCompanies: isGroupAdmin || hasCompanyPermission('manage_companies'),
    canViewCompanyStructure: isGroupAdmin || isDivisionAdmin || isCompanyAdmin || isRegionalAdmin,
    canAssignAdmins: isGroupAdmin || hasCompanyPermission('manage_users'),
    canViewCrossCompanyReports: isGroupAdmin || isDivisionAdmin || hasCompanyPermission('financial_oversight'),
    
    // Company-specific viewing permissions
    canViewCompanyPOs: (companyId) => {
      if (isGroupAdmin) return true;
      if (!companyPermissions) return false;
      return accessibleCompanies.some(company => company.id === companyId);
    },
    
    canEditCompanyPOs: (companyId) => {
      if (isGroupAdmin) return true;
      if (!companyPermissions) return false;
      const hasEditPermission = hasCompanyPermission('edit_all') || hasCompanyPermission('edit_division') || hasCompanyPermission('edit_company');
      return hasEditPermission && accessibleCompanies.some(company => company.id === companyId);
    },
    
    // Branch-specific permissions
    canViewBranchPOs: (branchId) => {
      if (isGroupAdmin) return true;
      if (!companyPermissions) return false;
      return accessibleBranches.some(branch => branch.id === branchId);
    },
    
    // Filter companies/branches based on access
    getAccessibleCompanies: () => accessibleCompanies,
    getAccessibleBranches: () => accessibleBranches,
    getAccessibleBranchesByCompany: (companyId) => {
      return accessibleBranches.filter(branch => branch.companyId === companyId);
    }
  };

  // Role-based flags
  const roleFlags = {
    isAdmin: isAdmin,
    isManager: userRole === 'manager',
    isEmployee: userRole === 'employee',
    isViewer: userRole === 'viewer',
    
    // Multi-company role flags
    isGroupAdmin: isGroupAdmin,
    isDivisionAdmin: isDivisionAdmin,
    isCompanyAdmin: isCompanyAdmin,
    isRegionalAdmin: isRegionalAdmin,
    
    // 🚀 NEW: Phase 2B User Type Flags
    isFactoryUser: isFactoryUser,
    isSupplierUser: isSupplierUser,
    isAnalyticsUser: isAnalyticsUser,
    isMultiCompanyUser: isMultiCompanyUser,
    
    // Edison special privileges
    isEdisonAdmin: isEdisonAdmin,
    
    role: userRole
  };

  // Company access information
  const companyAccess = {
    accessibleCompanies: accessibleCompanies,
    accessibleBranches: accessibleBranches,
    userCompanyRole: companyPermissions?.role || 'viewer',
    userBadge: companyPermissions?.badge || (isAnalyticsUser ? 'Analytics User' : (isFactoryUser ? 'Factory User' : (isSupplierUser ? 'Supplier User' : 'Viewer'))),
    userTitle: companyPermissions?.title || 'Team Member',
    userLevel: companyPermissions?.level || 4,
    totalAccessibleCompanies: accessibleCompanies.length,
    totalAccessibleBranches: accessibleBranches.length
  };

  return {
    ...basePermissions,
    ...analyticsPermissions,
    ...ecommercePermissions,
    ...multiCompanyPermissions,
    ...roleFlags,
    ...companyAccess,
    loading: loading,
    
    // Helper methods
    canAccessCompany: (companyId) => {
      if (isGroupAdmin) return true;
      return accessibleCompanies.some(company => company.id === companyId);
    },
    
    canAccessBranch: (branchId) => {
      if (isGroupAdmin) return true;
      return accessibleBranches.some(branch => branch.id === branchId);
    },
    
    getCompanyAccessLevel: (companyId) => {
      if (isGroupAdmin) return 'full';
      if (isDivisionAdmin) return 'division';
      if (isCompanyAdmin) return 'company';
      if (isRegionalAdmin) return 'regional';
      return 'none';
    },
    
    hasPermission: (permission) => hasCompanyPermission(permission),
    
    // 🚀 NEW: Phase 2B Helper Methods
    getUserType: () => {
      if (isGroupAdmin) return 'group_admin';
      if (isDivisionAdmin) return 'division_admin';
      if (isCompanyAdmin) return 'company_admin';
      if (isFactoryUser) return 'factory';
      if (isSupplierUser) return 'supplier';
      if (isAnalyticsUser) return 'analytics';
      return userRole;
    },
    
    canAccessAnalyticsSection: (section) => {
      const sectionPermissions = {
        'dashboard': analyticsPermissions.canViewAnalytics,
        'reports': analyticsPermissions.canViewReports,
        'insights': analyticsPermissions.canViewInsights,
        'real-time': analyticsPermissions.canViewRealTimeData,
        'business-intelligence': analyticsPermissions.canViewBusinessIntelligence
      };
      return sectionPermissions[section] || false;
    },
    
    canAccessEcommerceSection: (section) => {
      const sectionPermissions = {
        'catalog': ecommercePermissions.canViewCatalog,
        'factory-registration': ecommercePermissions.canRegisterFactory,
        'factory-dashboard': ecommercePermissions.canAccessFactoryDashboard,
        'quotes': ecommercePermissions.canViewQuotes,
        'shopping-cart': ecommercePermissions.canManageShoppingCart
      };
      return sectionPermissions[section] || false;
    },
    
    // Company filtering helper
    filterPOsByAccess: (purchaseOrders) => {
      if (isGroupAdmin) return purchaseOrders;
      
      return purchaseOrders.filter(po => {
        // Check company access
        if (po.companyId && !accessibleCompanies.some(company => company.id === po.companyId)) {
          return false;
        }
        
        // Check branch access
        if (po.branchId && !accessibleBranches.some(branch => branch.id === po.branchId)) {
          return false;
        }
        
        return true;
      });
    },
    
    // Debug information
    debug: {
      userEmail: user.email,
      userRole: userRole,
      userType: isFactoryUser ? 'factory' : (isSupplierUser ? 'supplier' : 'internal'),
      companyPermissions: companyPermissions,
      accessibleCompaniesCount: accessibleCompanies.length,
      accessibleBranchesCount: accessibleBranches.length,
      isInitialized: !loading,
      phase2bFeatures: {
        analytics: isAnalyticsUser,
        ecommerce: isFactoryUser || isSupplierUser,
        multiCompany: isMultiCompanyUser
      }
    }
  };
};
