// src/components/common/Navigation.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Building2, Package, FileText, 
  Upload, Users, X, ChevronRight, Truck, DollarSign
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';

const Navigation = ({ isOpen, onClose, isMobile }) => {
  const permissions = usePermissions();

  const navItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      permission: permissions.canViewDashboard
    },
    {
      path: '/suppliers',
      label: 'Suppliers',
      icon: Building2,
      permission: permissions.canViewSuppliers
    },
    {
      path: '/products',
      label: 'Products',
      icon: Package,
      permission: permissions.canViewProducts
    },
    {
      path: '/proforma-invoices',
      label: 'Proforma Invoices',
      icon: FileText,
      permission: permissions.canViewPI,
      badge: 'New'
    },
    {
      path: '/purchase-orders',
      label: 'Purchase Orders',
      icon: FileText,
      permission: permissions.canViewPurchaseOrders
    },
    {
      path: '/invoices',
      label: 'Client Invoices',
      icon: DollarSign,
      permission: permissions.canViewInvoices
    },
    {
      path: '/tracking',
      label: 'Delivery Tracking',
      icon: Truck,
      permission: permissions.canViewTracking
    },
    {
      path: '/import',
      label: 'Quick Import',
      icon: Upload,
      permission: permissions.canImportData
    },
    {
      path: '/users',
      label: 'User Management',
      icon: Users,
      permission: permissions.canManageUsers
    }
  ];

  const filteredNavItems = navItems.filter(item => item.permission);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Navigation Sidebar */}
      <nav className={`
        ${isMobile ? 'fixed' : 'relative'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isMobile ? 'w-64' : 'w-64'}
        h-full bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out z-50
        ${!isMobile && 'lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          {/* Mobile Header */}
          {isMobile && (
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Menu</h2>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => isMobile && onClose()}
                className={({ isActive }) => `
                  flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* User Role Info */}
          <div className="p-4 border-t">
            <div className="text-xs text-gray-500">
              <p className="font-medium">Current Role</p>
              <p className="mt-1 capitalize">{permissions.role}</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
