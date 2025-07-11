// src/hooks/usePermissions.js
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/constants';

export const usePermissions = () => {
  const { user } = useAuth();
  
  if (!user) {
    return {
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
      isAdmin: false,
      isManager: false,
      isEmployee: false,
      isViewer: false,
      role: null
    };
  }
  
  const userRole = user.role || 'viewer';
  
  // Special admin check for Edison
  const isEdisonAdmin = user.email === 'edisonchung@flowsolution.net';
  const isAdmin = userRole === 'admin' || isEdisonAdmin;
  
  // Safe access with fallbacks
  return {
    // Dashboard permissions - everyone can view
    canViewDashboard: PERMISSIONS?.canViewDashboard?.includes(userRole) ?? 
                     ['admin', 'manager', 'employee', 'viewer'].includes(userRole),
    
    // Supplier permissions
    canEditSuppliers: PERMISSIONS?.canEditSuppliers?.includes(userRole) ?? 
                     ['admin', 'manager'].includes(userRole),
    canViewSuppliers: PERMISSIONS?.canViewSuppliers?.includes(userRole) ?? 
                     ['admin', 'manager'].includes(userRole),
    
    // Product permissions
    canEditProducts: PERMISSIONS?.canEditProducts?.includes(userRole) ?? 
                    ['admin', 'manager', 'employee'].includes(userRole),
    canViewProducts: PERMISSIONS?.canViewProducts?.includes(userRole) ?? 
                    ['admin', 'manager', 'employee', 'viewer'].includes(userRole),
    
    // Order permissions (for Sourcing & Procurement menu items)
    canViewOrders: PERMISSIONS?.canViewOrders?.includes(userRole) ?? 
                   PERMISSIONS?.canViewPurchaseOrders?.includes(userRole) ?? 
                   ['admin', 'manager'].includes(userRole),
    
    // Purchase Order permissions
    canEditPurchaseOrders: PERMISSIONS?.canEditPurchaseOrders?.includes(userRole) ?? 
                          ['admin', 'manager'].includes(userRole),
    canViewPurchaseOrders: PERMISSIONS?.canViewPurchaseOrders?.includes(userRole) ?? 
                          ['admin', 'manager'].includes(userRole),
    canApprovePurchaseOrders: PERMISSIONS?.canApprovePurchaseOrders?.includes(userRole) ?? 
                             ['admin', 'manager'].includes(userRole),
    canDeletePurchaseOrders: isAdmin,
    
    // Proforma Invoice permissions
    canViewPI: PERMISSIONS?.canViewPI?.includes(userRole) ?? 
              ['admin', 'manager', 'employee'].includes(userRole),
    canEditPI: PERMISSIONS?.canEditPI?.includes(userRole) ?? 
              ['admin', 'manager'].includes(userRole),
    
    // Invoice permissions
    canViewInvoices: PERMISSIONS?.canViewInvoices?.includes(userRole) ?? 
                    ['admin', 'manager'].includes(userRole),
    canEditInvoices: PERMISSIONS?.canEditInvoices?.includes(userRole) ?? 
                    ['admin', 'manager'].includes(userRole),
    
    // Delivery/Tracking permissions
    canViewDeliveries: PERMISSIONS?.canViewDeliveries?.includes(userRole) ?? 
                      PERMISSIONS?.canViewTracking?.includes(userRole) ?? 
                      ['admin', 'manager', 'employee'].includes(userRole),
    canViewTracking: PERMISSIONS?.canViewTracking?.includes(userRole) ?? 
                    ['admin', 'manager', 'employee'].includes(userRole),
    canUpdateDeliveryStatus: PERMISSIONS?.canUpdateDeliveryStatus?.includes(userRole) ?? 
                            ['admin', 'manager'].includes(userRole),
    
    // Import permissions
    canImportData: PERMISSIONS?.canImportData?.includes(userRole) ?? 
                  ['admin', 'manager'].includes(userRole),
    
    // Team and system management permissions - Admin only
    canManageUsers: PERMISSIONS?.canManageUsers?.includes(userRole) ?? isAdmin,
    canViewActivity: PERMISSIONS?.canViewActivity?.includes(userRole) ?? isAdmin,
    canManageSettings: PERMISSIONS?.canManageSettings?.includes(userRole) ?? isAdmin,
    
    // Role-based flags
    isAdmin: isAdmin,
    isManager: userRole === 'manager',
    isEmployee: userRole === 'employee',
    isViewer: userRole === 'viewer',
    role: userRole,
    
    // Edison special privileges
    isEdisonAdmin: isEdisonAdmin
  };
};
