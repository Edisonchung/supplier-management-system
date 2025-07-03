// src/components/common/Navigation.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Grid, Building2, Package, FileText, ShoppingCart, 
  DollarSign, Truck, Upload, Users, X 
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';

const Navigation = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const permissions = usePermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: Grid, permission: 'canViewDashboard' },
    { id: 'suppliers', path: '/suppliers', label: 'Suppliers', icon: Building2, permission: 'canViewSuppliers' },
    { id: 'products', path: '/products', label: 'Products', icon: Package, permission: 'canViewProducts' },
    { id: 'proforma-invoices', path: '/proforma-invoices', label: 'Proforma Invoices', icon: FileText, permission: 'canViewPI' },
    { id: 'purchase-orders', path: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, permission: 'canViewPurchaseOrders' },
    { id: 'invoices', path: '/invoices', label: 'Client Invoices', icon: DollarSign, permission: 'canViewInvoices' },
    { id: 'tracking', path: '/tracking', label: 'Delivery Tracking', icon: Truck, permission: 'canViewTracking' },
    { id: 'import', path: '/import', label: 'Quick Import', icon: Upload, permission: 'canImportData' },
    { id: 'users', path: '/users', label: 'User Management', icon: Users, permission: 'canManageUsers' }
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Navigation Sidebar */}
      <nav className={`
        fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-white border-r border-gray-200
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="h-full px-3 pb-4 overflow-y-auto">
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            <X size={20} />
          </button>
          
          <ul className="space-y-2 font-medium">
            {tabs.map(tab => {
              const hasPermission = !tab.permission || permissions[tab.permission];
              
              if (!hasPermission) return null;
              
              const Icon = tab.icon;
              const active = isActive(tab.path);
              
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => handleNavigation(tab.path)}
                    className={`
                      w-full flex items-center p-2 rounded-lg transition-colors text-left
                      ${active 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 ${active ? 'text-blue-700' : 'text-gray-500'}`} />
                    <span className="ml-3">{tab.label}</span>
                    {tab.id === 'proforma-invoices' && (
                      <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                        New
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          
          {/* User Info */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <div className="px-2 py-3">
              <p className="text-sm text-gray-500">Current Role</p>
              <p className="text-sm font-medium text-gray-900 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
