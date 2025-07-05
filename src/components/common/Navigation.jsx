// src/components/common/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Grid, Building2, Package, FileText, ShoppingCart, 
  DollarSign, Truck, Upload, Users, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';

const Navigation = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const permissions = usePermissions();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('navCollapsed');
    if (savedCollapsed === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('navCollapsed', newCollapsed.toString());
  };

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
        fixed top-0 left-0 z-40 h-screen pt-20 transition-all duration-300 bg-white border-r border-gray-200
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}>
        {/* Collapse Toggle Button - Desktop Only */}
        <button
          onClick={toggleCollapse}
          className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:shadow-md transition-shadow"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

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
                      w-full flex items-center p-2 rounded-lg transition-colors text-left group
                      ${active 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                    title={isCollapsed ? tab.label : ''}
                  >
                    <Icon className={`
                      ${isCollapsed ? 'w-6 h-6' : 'w-5 h-5'} 
                      ${active ? 'text-blue-700' : 'text-gray-500'}
                      transition-all duration-200
                    `} />
                    
                    {!isCollapsed && (
                      <>
                        <span className="ml-3">{tab.label}</span>
                        {tab.id === 'proforma-invoices' && (
                          <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            New
                          </span>
                        )}
                      </>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {tab.label}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          
          {/* User Info */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <div className={`${isCollapsed ? 'px-0' : 'px-2'} py-3`}>
              {!isCollapsed ? (
                <>
                  <p className="text-sm text-gray-500">Current Role</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">{user?.role}</p>
                </>
              ) : (
                <div className="flex justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {user?.role?.charAt(0).toUpperCase()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navigation;
