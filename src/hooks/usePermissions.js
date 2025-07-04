// src/hooks/usePermissions.js
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/constants';

export const usePermissions = () => {
  const { user } = useAuth();
  
  if (!user) return {};
  
  const userRole = user.role;
  
  // Safe access with fallbacks
  return {
    // Dashboard permissions
    canViewDashboard: PERMISSIONS?.canViewDashboard?.includes(userRole) ?? true,
    
    // Supplier permissions
    canEditSuppliers: PERMISSIONS?.canEditSuppliers?.includes(userRole) ?? false,
    canViewSuppliers: PERMISSIONS?.canViewSuppliers?.includes(userRole) ?? false,
    
    // Product permissions
    canEditProducts: PERMISSIONS?.canEditProducts?.includes(userRole) ?? false,
    canViewProducts: PERMISSIONS?.canViewProducts?.includes(userRole) ?? false,
    
    // Purchase Order permissions
    canEditPurchaseOrders: PERMISSIONS?.canEditPurchaseOrders?.includes(userRole) ?? false,
    canViewPurchaseOrders: PERMISSIONS?.canViewPurchaseOrders?.includes(userRole) ?? false,
    canApprovePurchaseOrders: PERMISSIONS?.canApprovePurchaseOrders?.includes(userRole) ?? false,
    canDeletePurchaseOrders: userRole === 'admin',
    
    // Proforma Invoice permissions
    canViewPI: PERMISSIONS?.canViewPI?.includes(userRole) ?? false,
    canEditPI: PERMISSIONS?.canEditPI?.includes(userRole) ?? false,
    
    // Invoice permissions
    canViewInvoices: PERMISSIONS?.canViewInvoices?.includes(userRole) ?? false,
    canEditInvoices: PERMISSIONS?.canEditInvoices?.includes(userRole) ?? false,
    
    // Tracking permissions
    canViewTracking: PERMISSIONS?.canViewTracking?.includes(userRole) ?? false,
    canUpdateDeliveryStatus: PERMISSIONS?.canUpdateDeliveryStatus?.includes(userRole) ?? false,
    
    // User management permissions
    canManageUsers: PERMISSIONS?.canManageUsers?.includes(userRole) ?? false,
    
    // Import permissions
    canImportData: PERMISSIONS?.canImportData?.includes(userRole) ?? false,
    
    // General permissions
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isEmployee: userRole === 'employee',
    isViewer: userRole === 'viewer',
    role: userRole
  };
};
