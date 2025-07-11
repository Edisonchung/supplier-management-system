// src/components/common/Navigation.jsx - Enhanced with Team Management
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
  X,
  Settings,
  Shield,
  UserCheck,
  Activity,
  Brain,
  Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

const Navigation = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const location = useLocation();
  const { user, isAdmin, canManageUsers } = useAuth();
  const permissions = usePermissions();
  const [expandedItems, setExpandedItems] = useState({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Enhanced counters for better team awareness
  const [sourcingCount, setSourcingCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [teamOnline, setTeamOnline] = useState(0);
  
  useEffect(() => {
    // Check localStorage for various counts
    const updateCounts = () => {
      try {
        // Sourcing count
        const clientPOs = JSON.parse(localStorage.getItem('clientPurchaseOrders') || '[]');
        const needsSourcing = clientPOs.filter(po => 
          po.sourcingStatus === 'pending' || po.sourcingStatus === 'partial'
        ).length;
        setSourcingCount(needsSourcing);

        // Pending items count (draft POs, pending PIs, etc.)
        const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
        const proformaInvoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
        
        const draftPOs = purchaseOrders.filter(po => po.status === 'draft').length;
        const pendingPIs = proformaInvoices.filter(pi => pi.status === 'pending').length;
        setPendingCount(draftPOs + pendingPIs);

        // Simulate team online count (in real system, this would come from Firestore)
        setTeamOnline(Math.floor(Math.random() * 5) + 1);
      } catch (error) {
        console.error('Error getting navigation counts:', error);
      }
    };
    
    updateCounts();
    // Update periodically
    const interval = setInterval(updateCounts, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
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

  // Enhanced navigation structure with better organization
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      permission: 'canViewDashboard',
      description: 'Overview and analytics'
    },
    
    // Core Management Section
    {
      name: 'Core Management',
      section: true,
      children: [
        {
          name: 'Suppliers',
          href: '/suppliers',
          icon: Building2,
          permission: 'canViewSuppliers',
          description: 'Manage supplier relationships'
        },
        {
          name: 'Products',
          href: '/products',
          icon: Package,
          permission: 'canViewProducts',
          description: 'Product catalog and inventory'
        }
      ]
    },

    // Operations Section
    {
      name: 'Operations',
      section: true,
      children: [
        {
          name: 'Sourcing',
          href: '/sourcing',
          icon: ShoppingCart,
          permission: 'canViewOrders',
          badge: sourcingCount > 0 ? sourcingCount : null,
          badgeColor: 'bg-red-500',
          description: 'Source items from suppliers'
        },
        {
          name: 'AI Matching',
          href: '/ai-matching',
          icon: Brain,
          permission: 'canViewOrders',
          badge: 'NEW',
          badgeColor: 'bg-purple-500',
          description: 'AI-powered supplier matching'
        },
        {
          name: 'Procurement',
          icon: FileText,
          permission: 'canViewOrders',
          description: 'Purchase orders and invoices',
          children: [
            {
              name: 'Proforma Invoices',
              href: '/proforma-invoices',
              permission: 'canViewOrders',
              description: 'Supplier quotations'
            },
            {
              name: 'Purchase Orders',
              href: '/purchase-orders',
              permission: 'canViewOrders',
              badge: pendingCount > 0 ? pendingCount : null,
              badgeColor: 'bg-orange-500',
              description: 'Client purchase orders'
            }
          ]
        }
      ]
    },

    // Business Section
    {
      name: 'Business',
      section: true,
      children: [
        {
          name: 'Client Invoices',
          href: '/client-invoices',
          icon: Receipt,
          permission: 'canViewInvoices',
          description: 'Client billing and payments'
        },
        {
          name: 'Delivery Tracking',
          href: '/delivery-tracking',
          icon: Truck,
          permission: 'canViewDeliveries',
          description: 'Track shipments and deliveries'
        }
      ]
    },

    // Tools Section
    {
      name: 'Tools',
      section: true,
      children: [
        {
          name: 'Quick Import',
          href: '/quick-import',
          icon: Upload,
          permission: 'canImportData',
          description: 'Bulk import data and documents'
        }
      ]
    },

    // Administration Section (Admin/Manager only)
    ...(canManageUsers || isAdmin ? [{
      name: 'Administration',
      section: true,
      adminOnly: true,
      children: [
        {
          name: 'Team Management',
          href: '/team-management',
          icon: Users,
          permission: 'canManageUsers',
          badge: teamOnline > 0 ? `${teamOnline} online` : null,
          badgeColor: 'bg-green-500',
          description: 'Manage team members and roles'
        },
        {
          name: 'System Settings',
          href: '/settings',
          icon: Settings,
          permission: 'canManageUsers',
          description: 'Configure system preferences'
        },
        {
          name: 'Activity Logs',
          href: '/activity-logs',
          icon: Activity,
          permission: 'canManageUsers',
          description: 'View team activity and audit logs'
        }
      ]
    }] : [])
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

  const isParentActive = (children = []) => {
    return children.some(child => child.href && isActive(child.href));
  };

  const renderNavItem = (item, isChild = false, parentSection = null) => {
    if (!permissions[item.permission]) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.name] || isParentActive(item.children || []);
    const active = item.href ? isActive(item.href) : isParentActive(item.children || []);

    if (hasChildren) {
      return (
        <div key={item.name} className={isChild ? 'ml-2' : ''}>
          <button
            onClick={() => toggleExpanded(item.name)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title={isCollapsed ? item.name : item.description}
          >
            <div className="flex items-center">
              {item.icon && <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} />}
              {!isCollapsed && <span>{item.name}</span>}
            </div>
            {!isCollapsed && (
              <div className="flex items-center">
                {item.badge && (
                  <span className={`mr-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${item.badgeColor || 'bg-gray-500'}`}>
                    {item.badge}
                  </span>
                )}
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
              {item.children.map(child => renderNavItem(child, true, item.name))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.name}
        to={item.href}
        className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors group ${
          active
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
        } ${isChild ? 'pl-11' : ''}`}
        title={isCollapsed ? item.name : item.description}
      >
        {item.icon && <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} />}
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${item.badgeColor || 'bg-gray-500'}`}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  const renderSection = (section) => {
    if (section.adminOnly && !canManageUsers && !isAdmin) return null;

    return (
      <div key={section.name} className="mb-6">
        {!isCollapsed && (
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            {section.name}
            {section.adminOnly && (
              <Shield className="inline-block w-3 h-3 ml-1" />
            )}
          </h3>
        )}
        <div className="space-y-1">
          {section.children.map(item => renderNavItem(item))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:block bg-white shadow-lg h-screen fixed left-0 top-0 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="h-full flex flex-col">
          {/* Enhanced Header */}
          <div className="flex items-center justify-between p-4 border-b h-16 bg-gradient-to-r from-blue-600 to-purple-600">
            {!isCollapsed && (
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">HiggsFlow</h2>
                  <p className="text-xs text-blue-100">Accelerating Supply Chain</p>
                </div>
              </div>
            )}
            <button
              onClick={handleToggleCollapse}
              className="p-1 rounded-md hover:bg-white hover:bg-opacity-20 transition-colors"
              title={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {isCollapsed ? (
                <Menu className="h-5 w-5 text-white" />
              ) : (
                <X className="h-5 w-5 text-white" />
              )}
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Dashboard - always first */}
            {navigationItems[0] && !navigationItems[0].section && renderNavItem(navigationItems[0])}
            
            {/* Sections */}
            {navigationItems.slice(1).map(section => 
              section.section ? renderSection(section) : null
            )}
          </div>

          {/* Enhanced User Info */}
          {user && (
            <div className="p-4 border-t bg-gray-50">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      user.email?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {user.displayName || user.email}
                    </p>
                    <div className="flex items-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'employee' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role || 'User'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Enhanced Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
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
            
            {/* Mobile Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">HiggsFlow</h2>
                  <p className="text-xs text-blue-100">Team Dashboard</p>
                </div>
              </div>
            </div>

            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <nav className="px-2">
                {/* Dashboard */}
                {navigationItems[0] && !navigationItems[0].section && (
                  <div className="mb-4">
                    {renderNavItem(navigationItems[0])}
                  </div>
                )}
                
                {/* Sections */}
                {navigationItems.slice(1).map(section => 
                  section.section ? renderSection(section) : null
                )}
              </nav>
            </div>
            
            {/* Mobile User Info */}
            {user && (
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center w-full">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        user.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      {user.displayName || user.email}
                    </p>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'employee' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user.role || 'User'}
                      </span>
                      {teamOnline > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          {teamOnline} team online
                        </span>
                      )}
                    </div>
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
