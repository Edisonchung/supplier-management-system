// src/components/common/Navigation.jsx
import React from 'react';
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
import { useClientPOsDual } from '../../hooks/useClientPOsDual';

const Navigation = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { sourcingRequired } = useClientPOsDual();
  const [expandedItems, setExpandedItems] = React.useState({});

  // Calculate sourcing count
  const sourcingCount = sourcingRequired?.length || 0;

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
    const isExpanded = expandedItems[item.name];
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
    <nav className={`bg-white shadow-lg h-full transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {!isCollapsed && (
            <h2 className="text-xl font-bold text-gray-800">HiggsFlow</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
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
  );
};

export default Navigation;
