// src/components/common/Navigation.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Package, 
  FileText, 
  ShoppingCart, 
  Receipt,
  Truck,
  Upload,
  Users,
  ChevronDown,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const Navigation = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const location = useLocation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const [expandedItems, setExpandedItems] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Get sourcing count from localStorage (temporary solution)
  const [sourcingCount, setSourcingCount] = useState(0);
  
  useEffect(() => {
    // Check localStorage for client POs requiring sourcing
    const checkSourcingCount = () => {
      try {
        const clientPOs = JSON.parse(localStorage.getItem('clientPurchaseOrders') || '[]');
        const needsSourcing = clientPOs.filter(po => 
          po.sourcingStatus === 'pending' || po.sourcingStatus === 'partial'
        ).length;
        setSourcingCount(needsSourcing);
      } catch (error) {
        console.error('Error getting sourcing count:', error);
      }
    };
    
    checkSourcingCount();
    // Recheck when route changes
    checkSourcingCount();
  }, [location]);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('navCollapsed') === 'true';
    setIsCollapsed(savedState);
  }, []);

  const handleToggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('navCollapsed', newState.toString());
    // Dispatch custom event for Layout to listen to
    window.dispatchEvent(new Event('navToggled'));
  };

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      permission: 'canViewDashboard'
    },
    {
      name: 'Suppliers',
      href: '/suppliers',
      icon: Building2,
      permission: 'canViewSuppliers'
    },
    {
      name: 'Products',
      href: '/products',
      icon: Package,
      permission: 'canViewProducts'
    },
    {
      name: 'Sourcing',
      href: '/sourcing',
      icon: ShoppingCart,
      permission: 'canViewOrders',
      badge: sourcingCount > 0 ? sourcingCount : null,
      badgeColor: 'bg-red-500'
    },
    {
      name: 'Procurement',
      icon: FileText,
      permission: 'canViewOrders',
      children: [
        {
          name: 'Proforma Invoices',
          href: '/proforma-invoices',
          permission: 'canViewOrders'
        },
        {
          name: 'Purchase Orders',
          href: '/purchase-orders',
          permission: 'canViewOrders'
        }
      ]
    },
    {
      name: 'Client Invoices',
      href: '/client-invoices',
      icon: Receipt,
      permission: 'canViewInvoices'
    },
    {
      name: 'Delivery Tracking',
      href: '/delivery-tracking',
      icon: Truck,
      permission: 'canViewDeliveries'
    },
    {
      name: 'Quick Import',
      href: '/quick-import',
      icon: Upload,
      permission: 'canImportData'
    },
    {
      name: 'User Management',
      href: '/users',
      icon: Users,
      permission: 'canManageUsers'
    }
  ];

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isActive = (href) => {
    return location.pathname === href;
  };

  const isParentActive = (children) => {
    return children.some(child => isActive(child.href));
  };

  const renderNavItem = (item, isChild = false) => {
    if (!permissions[item.permission]) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.name] || isParentActive(item.children || []);
    const active = item.href ? isActive(item.href) : isParentActive(item.children || []);

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title={isCollapsed ? item.name : ''}
          >
            <div className="flex items-center">
              <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} />
              {!isCollapsed && <span>{item.name}</span>}
            </div>
            {!isCollapsed && (
              <div className="ml-auto">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            )}
          </button>
          {isExpanded && !isCollapsed && (
            <div className="ml-6 mt-1 space-y-1">
              {item.children.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
        } ${isChild ? 'pl-11' : ''}`}
        title={isCollapsed ? item.name : ''}
      >
        {item.icon && <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} />}
        {!isCollapsed && (
          <span className="flex-1">{item.name}</span>
        )}
        {!isCollapsed && item.badge && (
          <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${item.badgeColor || 'bg-gray-500'}`}>
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:block bg-white shadow-lg h-screen fixed left-0 top-0 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b h-16">
            {!isCollapsed && (
              <h2 className="text-xl font-bold text-gray-800">HiggsFlow</h2>
            )}
            <button
              onClick={handleToggleCollapse}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isCollapsed ? (
                <Menu className="h-5 w-5 text-gray-600" />
              ) : (
                <X className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigationItems.map(item => renderNavItem(item))}
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-t">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                {!isCollapsed && (
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.role || 'User'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h2 className="text-xl font-bold text-gray-800">HiggsFlow</h2>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigationItems.map(item => renderNavItem(item))}
              </nav>
            </div>
            {user && (
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700">{user.email}</p>
                    <p className="text-xs text-gray-500">{user.role || 'User'}</p>
                  </div>
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </>
  );
};

export default Navigation;
