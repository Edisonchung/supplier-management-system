// src/components/common/Navigation.jsx - Enhanced with DualSystemDashboard and PromptManagement
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
  Zap,
  BarChart3,
  Clock,
  AlertTriangle,
  Bell,
  Crown,
  MapPin,
  Globe,
  TreePine,
  Factory,
  Bot,
  GitBranch,
  FileEdit,
  Layers
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
  // Tracking counters
  const [trackingCounts, setTrackingCounts] = useState({
    activeDeliveries: 0,
    overdueItems: 0,
    pendingPayments: 0
  });
  
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
        const proformaInvoices = JSON.parse(localStorage.getItem('proformaInvoices') || '[]');
        const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
        const pendingPIs = proformaInvoices.filter(pi => pi.status === 'pending').length;
        const draftPOs = purchaseOrders.filter(po => po.status === 'draft').length;
        setPendingCount(pendingPIs + draftPOs);

        // Tracking counts
        const deliveryTracking = JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}');
        const paymentTracking = JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}');
        
        // Count active deliveries (not completed)
        const activeDeliveries = Object.values(deliveryTracking).filter(delivery => 
          delivery.status !== 'completed'
        ).length;
        
        // Count overdue deliveries
        const now = new Date();
        const overdueDeliveries = Object.values(deliveryTracking).filter(delivery => 
          delivery.estimatedDelivery && 
          new Date(delivery.estimatedDelivery) < now && 
          delivery.status !== 'completed'
        ).length;
        
        // Count overdue payments
        const overduePayments = Object.values(paymentTracking).filter(payment => 
          payment.dueDate && 
          new Date(payment.dueDate) < now && 
          payment.status !== 'paid'
        ).length;
        
        setTrackingCounts({
          activeDeliveries,
          overdueItems: overdueDeliveries + overduePayments,
          pendingPayments: Object.values(paymentTracking).filter(payment => 
            payment.status === 'pending' || payment.status === 'processing'
          ).length
        });

        // Simulate team online count (placeholder)
        setTeamOnline(Math.floor(Math.random() * 3) + 1);
      } catch (error) {
        console.error('Error updating navigation counts:', error);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [location.pathname]); // Update when navigation changes

  // Enhanced navigation structure with multi-company admin
  const navigationItems = [
    // Dashboard (no section)
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      description: 'Overview and analytics',
      permission: 'canViewDashboard'
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
          description: 'Manage supplier relationships',
          permission: 'canViewSuppliers'
        },
        {
          name: 'Products',
          href: '/products',
          icon: Package,
          description: 'Product catalog and inventory',
          permission: 'canViewProducts'
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
          icon: Brain,
          description: 'Client PO sourcing workflow',
          permission: 'canViewOrders',
          badge: sourcingCount > 0 ? sourcingCount : null,
          badgeColor: 'bg-orange-500'
        },
        {
          name: 'AI Matching',
          href: '/ai-matching',
          icon: Zap,
          description: 'AI-powered supplier matching',
          permission: 'canViewOrders'
        }
      ]
    },

    // Procurement Section
    {
      name: 'Procurement',
      section: true,
      children: [
        {
          name: 'Proforma Invoices',
          href: '/proforma-invoices',
          icon: FileText,
          description: 'Supplier quotations and PIs',
          permission: 'canViewOrders'
        },
        {
          name: 'Purchase Orders',
          href: '/purchase-orders',
          icon: ShoppingCart,
          description: 'Purchase order management',
          permission: 'canViewOrders'
        },
        {
          name: 'Smart Notifications',
          href: '/notifications',
          icon: Bell,
          description: 'AI-powered procurement alerts',
          permission: 'canViewOrders',
          badge: trackingCounts.overdueItems > 0 ? trackingCounts.overdueItems : null,
          badgeColor: 'bg-red-500'
        },
        {
          name: 'Tracking',
          href: '/tracking',
          icon: BarChart3,
          description: 'Delivery and payment tracking',
          permission: 'canViewDeliveries',
          badge: trackingCounts.overdueItems > 0 ? trackingCounts.overdueItems : 
                 trackingCounts.activeDeliveries > 0 ? trackingCounts.activeDeliveries : null,
          badgeColor: trackingCounts.overdueItems > 0 ? 'bg-red-500' : 'bg-blue-500'
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
          description: 'Client billing and invoices',
          permission: 'canViewInvoices'
        },
        {
          name: 'Delivery Tracking',
          href: '/delivery-tracking',
          icon: Truck,
          description: 'Shipment tracking and delivery status',
          permission: 'canViewDeliveries',
          badge: 'REDIRECTS',
          badgeColor: 'bg-gray-400'
        }
      ]
    },

    // Tools & AI Section - UPDATED with new items
    {
      name: 'Tools & AI',
      section: true,
      children: [
        {
          name: 'Quick Import',
          href: '/quick-import',
          icon: Upload,
          description: 'Bulk data import utilities',
          permission: 'canImportData'
        },
        {
          name: 'MCP Tools',
          href: '/mcp-tools',
          icon: Bot,
          description: 'AI-powered universal tools',
          permission: 'canViewAI',
          badge: 'AI',
          badgeColor: 'bg-purple-500'
        },
        // NEW: Dual System Dashboard
        {
          name: 'Dual System',
          href: '/dual-system-dashboard',
          icon: GitBranch,
          description: 'Revolutionary AI prompt management',
          permission: 'canViewAI',
          badge: 'NEW',
          badgeColor: 'bg-green-500'
        },
        // NEW: Prompt Management
        {
          name: 'Prompt Management',
          href: '/prompt-management',
          icon: FileEdit,
          description: 'Create and manage AI prompts',
          permission: 'canManagePrompts',
          badge: 'BETA',
          badgeColor: 'bg-blue-500'
        }
      ]
    },

    // 🆕 NEW: Multi-Company Administration Section
    {
      name: 'Multi-Company Admin',
      section: true,
      adminOnly: true,
      multiCompanyOnly: true, // New flag
      children: [
        {
          name: 'Company Structure',
          href: '/admin/companies',
          icon: TreePine,
          description: 'Manage companies, branches, and business structure',
          permission: 'canManageCompanies',
          badge: permissions.isGroupAdmin ? `${permissions.totalAccessibleCompanies || 9} Companies` : null,
          badgeColor: 'bg-purple-500'
        },
        {
          name: 'Company Analytics',
          href: '/admin/company-analytics',
          icon: BarChart3,
          description: 'Cross-company performance analytics',
          permission: 'canViewCrossCompanyReports',
          badge: permissions.isGroupAdmin || permissions.isDivisionAdmin ? 'INSIGHTS' : null,
          badgeColor: 'bg-indigo-500'
        }
      ]
    },

    // Enhanced Administration Section
    {
      name: 'Administration',
      section: true,
      adminOnly: true,
      children: [
        {
          name: 'Team Management',
          href: '/admin/team',
          icon: UserCheck,
          description: 'Team member and role management',
          permission: 'canManageUsers',
          badge: teamOnline > 0 ? `${teamOnline} online` : null,
          badgeColor: 'bg-green-500'
        },
        {
          name: 'Settings',
          href: '/admin/settings',
          icon: Settings,
          description: 'System configuration',
          permission: 'canManageUsers'
        },
        {
          name: 'Activity Logs',
          href: '/admin/activity',
          icon: Activity,
          description: 'System activity and audit logs',
          permission: 'canManageUsers'
        }
      ]
    }
  ];

  const handleToggleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    
    // Save preference to localStorage
    localStorage.setItem('navigationCollapsed', newCollapsedState);
    
    // Dispatch custom event for Layout to listen to
    window.dispatchEvent(new CustomEvent('navigationCollapsed', {
      detail: { collapsed: newCollapsedState }
    }));
    
    // Also dispatch the navToggled event for compatibility
    window.dispatchEvent(new Event('navToggled'));
  };

  // Load collapse preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('navigationCollapsed');
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  const toggleExpanded = (itemName) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemName]: !prev[itemName]
    }));
  };

  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const hasPermission = (permission) => {
    if (!permission) return true;
    return permissions[permission] !== false;
  };

  // Enhanced section visibility check for multi-company admin
  const shouldShowSection = (section) => {
    // Basic admin check
    if (section.adminOnly && !canManageUsers && !isAdmin) {
      return false;
    }
    
    // Multi-company admin check
    if (section.multiCompanyOnly) {
      // Show to Group Admin, Division Admin, or users with company management permissions
      return permissions.isGroupAdmin || 
             permissions.isDivisionAdmin || 
             permissions.canManageCompanies ||
             permissions.canViewCompanyStructure;
    }
    
    return true;
  };

  const renderNavItem = (item, isChild = false, parentName = '') => {
    if (item.permission && !hasPermission(item.permission)) {
      return null;
    }

    const active = isActive(item.href);
    const itemKey = parentName ? `${parentName}-${item.name}` : item.name;

    if (item.children) {
      const isExpanded = expandedItems[itemKey];
      return (
        <div key={itemKey}>
          <button
            onClick={() => toggleExpanded(itemKey)}
            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
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
    if (!shouldShowSection(section)) {
      return null;
    }

    return (
      <div key={section.name} className="mb-6">
        {!isCollapsed && (
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center">
            {section.name}
            {section.adminOnly && (
              <Shield className="inline-block w-3 h-3 ml-1" />
            )}
            {section.multiCompanyOnly && (
              <Crown className="inline-block w-3 h-3 ml-1 text-purple-500" />
            )}
          </h3>
        )}
        <div className="space-y-1">
          {section.children.map(item => renderNavItem(item))}
        </div>
      </div>
    );
  };

  // Enhanced user badge display
  const getUserBadgeDisplay = () => {
    if (permissions.userBadge) {
      return permissions.userBadge;
    }
    
    // Fallback to role-based display
    const roleConfig = {
      admin: { label: 'Admin', color: 'bg-purple-100 text-purple-800', icon: Shield },
      manager: { label: 'Manager', color: 'bg-blue-100 text-blue-800', icon: UserCheck },
      employee: { label: 'Employee', color: 'bg-green-100 text-green-800', icon: Users },
      viewer: { label: 'Viewer', color: 'bg-gray-100 text-gray-800', icon: null }
    };
    
    const config = roleConfig[user?.role] || roleConfig.viewer;
    return {
      text: config.label,
      color: config.color,
      icon: config.icon
    };
  };

  const userBadge = getUserBadgeDisplay();

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:block bg-white shadow-lg h-screen fixed left-0 top-0 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="h-full flex flex-col">
          {/* Enhanced Header with Multi-Company Indicator */}
          <div className="flex items-center justify-between p-4 border-b h-16 bg-gradient-to-r from-blue-600 to-purple-600">
            {!isCollapsed && (
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">HiggsFlow</h2>
                  <p className="text-xs text-blue-100">
                    {permissions.isMultiCompanyUser ? 
                      `Multi-Company Platform` : 
                      'Accelerating Supply Chain'
                    }
                  </p>
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

          {/* Enhanced User Info with Multi-Company Badge */}
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
                  {/* Enhanced online indicator with multi-company status */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                    permissions.isGroupAdmin ? 'bg-purple-400' :
                    permissions.isDivisionAdmin ? 'bg-blue-400' :
                    permissions.isCompanyAdmin ? 'bg-green-400' :
                    'bg-green-400'
                  }`}></div>
                </div>
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">
                      {user.displayName || user.email}
                    </p>
                    <div className="flex items-center mt-1">
                      {typeof userBadge === 'string' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {permissions.isGroupAdmin && <Crown className="w-3 h-3 mr-1" />}
                          {permissions.isDivisionAdmin && <Building2 className="w-3 h-3 mr-1" />}
                          {permissions.isCompanyAdmin && <Factory className="w-3 h-3 mr-1" />}
                          {permissions.isRegionalAdmin && <Globe className="w-3 h-3 mr-1" />}
                          {userBadge}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${userBadge.color}`}>
                          {userBadge.icon && <userBadge.icon className="w-3 h-3 mr-1" />}
                          {userBadge.text}
                        </span>
                      )}
                    </div>
                    
                    {/* Multi-Company Access Indicator */}
                    {permissions.isMultiCompanyUser && !isCollapsed && (
                      <div className="mt-1 text-xs text-gray-500">
                        {permissions.totalAccessibleCompanies} companies • {permissions.totalAccessibleBranches} branches
                      </div>
                    )}
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
            
            {/* Enhanced Mobile Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">HiggsFlow</h2>
                  <p className="text-xs text-blue-100">
                    {permissions.isMultiCompanyUser ? 
                      'Multi-Company Dashboard' : 
                      'Team Dashboard'
                    }
                  </p>
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

            {/* Enhanced Mobile User Info */}
            {user && (
              <div className="flex-shrink-0 bg-gray-50 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        user.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    {/* Multi-company status indicator */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full ${
                      permissions.isGroupAdmin ? 'bg-purple-400' :
                      permissions.isDivisionAdmin ? 'bg-blue-400' :
                      permissions.isCompanyAdmin ? 'bg-green-400' :
                      'bg-green-400'
                    }`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700">
                      {user.displayName || user.email}
                    </p>
                    <div className="flex items-center mt-1">
                      {typeof userBadge === 'string' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {permissions.isGroupAdmin && <Crown className="w-3 h-3 mr-1" />}
                          {permissions.isDivisionAdmin && <Building2 className="w-3 h-3 mr-1" />}
                          {permissions.isCompanyAdmin && <Factory className="w-3 h-3 mr-1" />}
                          {permissions.isRegionalAdmin && <Globe className="w-3 h-3 mr-1" />}
                          {userBadge}
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${userBadge.color}`}>
                          {userBadge.icon && <userBadge.icon className="w-3 h-3 mr-1" />}
                          {userBadge.text}
                        </span>
                      )}
                    </div>
                    
                    {/* Multi-Company Access Info on Mobile */}
                    {permissions.isMultiCompanyUser && (
                      <div className="mt-1 text-xs text-gray-500">
                        Access: {permissions.totalAccessibleCompanies} companies
                      </div>
                    )}
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
