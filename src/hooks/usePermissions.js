// src/hooks/usePermissions.js
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/constants';

export const usePermissions = () => {
  const { user } = useAuth();
  
  if (!user) return {};
  
  const userRole = user.role;
  
  // Safe access with fallbacks
  return {
    // Existing permissions with safe access
    canViewDashboard: PERMISSIONS?.canViewDashboard?.includes(userRole) ?? true,
    canEditSuppliers: PERMISSIONS?.canEditSuppliers?.includes(userRole) ?? false,
    canViewSuppliers: PERMISSIONS?.canViewSuppliers?.includes(userRole) ?? false,
    canEditProducts: PERMISSIONS?.canEditProducts?.includes(userRole) ?? false,
    canViewProducts: PERMISSIONS?.canViewProducts?.includes(userRole) ?? false,
    canEditPurchaseOrders: PERMISSIONS?.canEditPurchaseOrders?.includes(userRole) ?? false,
    canViewPurchaseOrders: PERMISSIONS?.canViewPurchaseOrders?.includes(userRole) ?? false,
    canManageUsers: PERMISSIONS?.canManageUsers?.includes(userRole) ?? false,
    canImportData: PERMISSIONS?.canImportData?.includes(userRole) ?? false,
    
    // New PI permissions with safe access
    canViewPI: PERMISSIONS?.canViewPI?.includes(userRole) ?? false,
    canEditPI: PERMISSIONS?.canEditPI?.includes(userRole) ?? false,
    canViewInvoices: PERMISSIONS?.canViewInvoices?.includes(userRole) ?? false,
    canEditInvoices: PERMISSIONS?.canEditInvoices?.includes(userRole) ?? false,
    canViewTracking: PERMISSIONS?.canViewTracking?.includes(userRole) ?? false,
    canUpdateDeliveryStatus: PERMISSIONS?.canUpdateDeliveryStatus?.includes(userRole) ?? false,
    
    // General permissions
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isEmployee: userRole === 'employee',
    isViewer: userRole === 'viewer',
    role: userRole
  };
};
