// src/hooks/usePermissions.js
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS } from '../utils/constants';

export const usePermissions = () => {
  const { user } = useAuth();
  
  if (!user) return {};
  
  const userRole = user.role;
  
  return {
    // Existing permissions
    canViewDashboard: PERMISSIONS.canViewDashboard.includes(userRole),
    canEditSuppliers: PERMISSIONS.canEditSuppliers.includes(userRole),
    canViewSuppliers: PERMISSIONS.canViewSuppliers.includes(userRole),
    canEditProducts: PERMISSIONS.canEditProducts.includes(userRole),
    canViewProducts: PERMISSIONS.canViewProducts.includes(userRole),
    canEditPurchaseOrders: PERMISSIONS.canEditPurchaseOrders.includes(userRole),
    canViewPurchaseOrders: PERMISSIONS.canViewPurchaseOrders.includes(userRole),
    canManageUsers: PERMISSIONS.canManageUsers.includes(userRole),
    canImportData: PERMISSIONS.canImportData.includes(userRole),
    
    // New PI permissions
    canViewPI: PERMISSIONS.canViewPI?.includes(userRole) ?? PERMISSIONS.canViewPurchaseOrders.includes(userRole),
    canEditPI: PERMISSIONS.canEditPI?.includes(userRole) ?? PERMISSIONS.canEditPurchaseOrders.includes(userRole),
    canViewInvoices: PERMISSIONS.canViewInvoices?.includes(userRole) ?? PERMISSIONS.canViewPurchaseOrders.includes(userRole),
    canEditInvoices: PERMISSIONS.canEditInvoices?.includes(userRole) ?? PERMISSIONS.canEditPurchaseOrders.includes(userRole),
    canViewTracking: PERMISSIONS.canViewTracking?.includes(userRole) ?? PERMISSIONS.canViewProducts.includes(userRole),
    canUpdateDeliveryStatus: PERMISSIONS.canUpdateDeliveryStatus?.includes(userRole) ?? PERMISSIONS.canEditPurchaseOrders.includes(userRole),
    
    // General permissions
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isEmployee: userRole === 'employee',
    isViewer: userRole === 'viewer',
    role: userRole
  };
};
