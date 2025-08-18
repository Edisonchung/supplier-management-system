// src/components/common/Navigation.jsx - Enhanced with Phase 2B Real Data Integration
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
  Layers,
  FolderTree,
  // 🚀 Phase 2B Analytics & E-commerce Icons
  TrendingUp,
  Eye,
  Target,
  Store,
  CreditCard,
  Headphones,
  Award,
  Smartphone,
  Mail,
  Heart,
  Search,
  Filter,
  Home,
  Briefcase,
  // 🚀 NEW: Real Data Integration Icons
  Database,
  RefreshCw,
  Cpu,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  RotateCw
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
  const [categoryCounts, setCategoryCounts] = useState({
    pendingSuggestions: 0,
    aiGenerated: 0,
    totalCategories: 0
  });
  
  // 🚀 Phase 2B Analytics & E-commerce Counters
  const [analyticsCount, setAnalyticsCount] = useState(0);
  const [ecommerceCount, setEcommerceCount] = useState(0);
  const [factoryCount, setFactoryCount] = useState(0);
  
  // 🚀 NEW: Real Data Integration Status
  const [realDataStatus, setRealDataStatus] = useState({
    enabled: false,
    connected: false,
    lastSync: null,
    productCount: 0,
    catalogStatus: 'loading',
    syncInProgress: false
  });

  // 🚀 Real Data Status Checker
  useEffect(() => {
    const checkRealDataStatus = async () => {
      try {
        // Check if RealDataProvider is active
        const realDataEnabled = localStorage.getItem('higgsflow_realdata_enabled') === 'true';
        
        // Check last sync timestamp
        const lastSync = localStorage.getItem('higgsflow_last_sync');
        
        // Check product count from real data
        const realProducts = JSON.parse(localStorage.getItem('higgsflow_real_products') || '[]');
        
        // Check connection status
        const connectionStatus = localStorage.getItem('higgsflow_api_status') || 'disconnected';
        
        // Check if sync is in progress
        const syncInProgress = localStorage.getItem('higgsflow_sync_progress') === 'true';
        
        setRealDataStatus({
          enabled: realDataEnabled,
          connected: connectionStatus === 'connected',
          lastSync: lastSync ? new Date(lastSync) : null,
          productCount: realProducts.length,
          catalogStatus: realDataEnabled ? (connectionStatus === 'connected' ? 'live' : 'fallback') : 'mock',
          syncInProgress
        });
      } catch (error) {
        console.error('Error checking real data status:', error);
      }
    };

    checkRealDataStatus();
    const interval = setInterval(checkRealDataStatus, 15000); // Check every 15 seconds
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    // Check localStorage for various counts with real data integration
    const updateCounts = () => {
      try {
        // 🚀 Enhanced sourcing count with real data
        const clientPOs = JSON.parse(localStorage.getItem('clientPurchaseOrders') || '[]');
        const realClientPOs = JSON.parse(localStorage.getItem('higgsflow_real_client_pos') || '[]');
        const allPOs = realDataStatus.enabled ? realClientPOs : clientPOs;
        
        const needsSourcing = allPOs.filter(po => 
          po.sourcingStatus === 'pending' || po.sourcingStatus === 'partial'
        ).length;
        setSourcingCount(needsSourcing);

        // 🚀 Enhanced pending items count with real data
        const proformaInvoices = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_proforma_invoices' : 'proformaInvoices'
        ) || '[]');
        const purchaseOrders = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_purchase_orders' : 'purchaseOrders'
        ) || '[]');
        
        const pendingPIs = proformaInvoices.filter(pi => pi.status === 'pending').length;
        const draftPOs = purchaseOrders.filter(po => po.status === 'draft').length;
        setPendingCount(pendingPIs + draftPOs);

        // 🚀 Enhanced tracking counts with real data
        const deliveryTracking = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_deliveryTracking' : 'higgsflow_deliveryTracking'
        ) || '{}');
        const paymentTracking = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_paymentTracking' : 'higgsflow_paymentTracking'
        ) || '{}');
        
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

        // 🚀 Enhanced Phase 2B Analytics Count with real data
        const analyticsEvents = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_analytics' : 'higgsflow_analytics'
        ) || '[]');
        const recentAnalytics = analyticsEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return eventDate > dayAgo;
        }).length;
        setAnalyticsCount(recentAnalytics);

        // 🚀 Enhanced E-commerce Count with real data
        const factoryRegistrations = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_factories' : 'higgsflow_factories'
        ) || '[]');
        const activeFactories = factoryRegistrations.filter(factory => factory.status === 'active').length;
        setFactoryCount(activeFactories);
        
        const quoteRequests = JSON.parse(localStorage.getItem(
          realDataStatus.enabled ? 'higgsflow_real_quotes' : 'higgsflow_quotes'
        ) || '[]');
        const pendingQuotes = quoteRequests.filter(quote => quote.status === 'pending').length;
        setEcommerceCount(pendingQuotes);

        // Enhanced team online count
        const teamStatus = JSON.parse(localStorage.getItem('higgsflow_team_status') || '{}');
        setTeamOnline(Object.values(teamStatus).filter(member => member.online).length || Math.floor(Math.random() * 3) + 1);
        
        // Category Management counts with real data
        updateCategoryCounts();
      } catch (error) {
        console.error('Error updating navigation counts:', error);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [location.pathname, realDataStatus.enabled]); // Update when navigation changes or real data status changes

  const updateCategoryCounts = async () => {
    try {
      if (realDataStatus.enabled && realDataStatus.connected) {
        // Use real data from API
        const realCategories = JSON.parse(localStorage.getItem('higgsflow_real_categories') || '{}');
        setCategoryCounts({
          pendingSuggestions: realCategories.pendingSuggestions || 0,
          aiGenerated: realCategories.aiGenerated || 0,
          totalCategories: realCategories.totalCategories || 0
        });
      } else {
        // Mock data for immediate testing
        const mockCounts = {
          pendingSuggestions: Math.floor(Math.random() * 5) + 1, // 1-5 pending
          aiGenerated: Math.floor(Math.random() * 8) + 2,        // 2-9 AI generated
          totalCategories: 25 + Math.floor(Math.random() * 10)   // 25-35 total
        };
        setCategoryCounts(mockCounts);
      }
    } catch (error) {
      console.error('Error updating category counts:', error);
    }
  };

  // 🚀 Enhanced navigation structure with Real Data Integration indicators
  const navigationItems = [
    // Dashboard (no section) - Dynamic routing based on user type
    {
      name: 'Dashboard',
      href: user && (isAdmin || canManageUsers) ? '/admin' : '/',
      icon: LayoutDashboard,
      description: realDataStatus.enabled ? 'Real-time overview and analytics' : 'Overview and analytics',
      permission: 'canViewDashboard',
      realDataIndicator: true
    },

    // 🚀 Phase 2B Analytics Section with Real Data Integration
    {
      name: 'Analytics & Intelligence',
      section: true,
      children: [
        {
          name: 'HiggsFlow Analytics',
          href: '/analytics',
          icon: TrendingUp,
          description: realDataStatus.enabled ? 
            'Executive business intelligence with real-time data' : 
            'Executive business intelligence dashboard',
          permission: 'canViewAnalytics',
          badge: realDataStatus.enabled ? 
            (analyticsCount > 0 ? analyticsCount : 'LIVE') : 
            (analyticsCount > 0 ? analyticsCount : 'DEMO'),
          badgeColor: realDataStatus.enabled ? 'bg-green-500' : 'bg-purple-500',
          realDataIndicator: true
        },
        {
          name: 'Real-time Insights',
          href: '/insights',
          icon: Eye,
          description: 'Live data and performance metrics',
          permission: 'canViewAnalytics',
          badge: realDataStatus.connected ? 'LIVE' : 'DEMO',
          badgeColor: realDataStatus.connected ? 'bg-green-500' : 'bg-blue-500',
          realDataIndicator: true
        },
        {
          name: 'Business Intelligence',
          href: '/business-intelligence',
          icon: Brain,
          description: 'Advanced analytics and reports',
          permission: 'canViewReports',
          badge: 'AI',
          badgeColor: 'bg-indigo-500'
        }
      ]
    },

    // 🚀 Enhanced E-commerce & Public Platform Section with Real Data
    {
      name: 'E-commerce Platform',
      section: true,
      children: [
        {
          name: 'Landing Page',
          href: '/',
          icon: Home,
          description: 'HiggsFlow professional landing page',
          permission: 'canViewPublic',
          badge: 'PUBLIC',
          badgeColor: 'bg-blue-500'
        },
        {
          name: 'Smart Catalog',
          href: '/catalog',
          icon: Store,
          description: realDataStatus.enabled ? 
            'AI-powered catalog with real inventory data' : 
            'AI-powered public product catalog',
          permission: 'canViewProducts',
          badge: realDataStatus.enabled ? 
            (realDataStatus.connected ? 'LIVE' : 'CACHED') : 
            'DEMO',
          badgeColor: realDataStatus.enabled ? 
            (realDataStatus.connected ? 'bg-green-500' : 'bg-orange-500') : 
            'bg-gray-500',
          realDataIndicator: true
        },
        {
          name: 'Legacy Catalog',
          href: '/catalog/legacy',
          icon: Package,
          description: 'Legacy catalog for comparison',
          permission: 'canViewProducts',
          badge: 'MOCK',
          badgeColor: 'bg-gray-400'
        },
        {
          name: 'Data Migration',
          href: '/catalog/migration',
          icon: RefreshCw,
          description: 'Migrate from localStorage to Firestore',
          permission: 'canManageData',
          badge: realDataStatus.syncInProgress ? 'SYNCING' : 
                realDataStatus.enabled ? 'READY' : 'PENDING',
          badgeColor: realDataStatus.syncInProgress ? 'bg-yellow-500' : 
                     realDataStatus.enabled ? 'bg-green-500' : 'bg-red-500',
          realDataIndicator: true
        },
        {
          name: 'Factory Login',
          href: '/factory/login',
          icon: Users,
          description: 'Factory authentication portal',
          permission: 'canViewPublic'
        },
        {
          name: 'Factory Registration',
          href: '/factory/register',
          icon: Factory,
          description: 'New factory onboarding portal',
          permission: 'canViewFactories',
          badge: factoryCount > 0 ? `${factoryCount} Active` : null,
          badgeColor: 'bg-orange-500'
        },
        {
          name: 'Factory Dashboard',
          href: '/factory/dashboard',
          icon: Briefcase,
          description: realDataStatus.enabled ? 
            'Factory management with real-time data' : 
            'Factory management portal',
          permission: 'canManageFactories',
          realDataIndicator: true
        },
        {
          name: 'Quote Requests',
          href: '/quote-requests',
          icon: CreditCard,
          description: 'Manage customer quote requests',
          permission: 'canViewQuotes',
          badge: ecommerceCount > 0 ? ecommerceCount : null,
          badgeColor: 'bg-yellow-500'
        },
        {
          name: 'Shopping Cart',
          href: '/shopping-cart',
          icon: ShoppingCart,
          description: 'Customer shopping cart management',
          permission: 'canViewOrders'
        }
      ]
    },

    // Core Management Section with Real Data Integration
    {
      name: 'Core Management',
      section: true,
      children: [
        {
          name: 'Suppliers',
          href: '/suppliers',
          icon: Building2,
          description: realDataStatus.enabled ? 
            'Manage supplier relationships with real data' : 
            'Manage supplier relationships',
          permission: 'canViewSuppliers',
          realDataIndicator: true
        },
        {
          name: 'Products',
          href: '/products',
          icon: Package,
          description: realDataStatus.enabled ? 
            'Product catalog with real inventory' : 
            'Product catalog and inventory',
          permission: 'canViewProducts',
          badge: realDataStatus.enabled && realDataStatus.productCount > 0 ? 
            `${realDataStatus.productCount} Real` : null,
          badgeColor: 'bg-blue-500',
          realDataIndicator: true
        }
      ]
    },

    // Operations Section with Real Data
    {
      name: 'Operations',
      section: true,
      children: [
        {
          name: 'Sourcing',
          href: '/sourcing',
          icon: Brain,
          description: realDataStatus.enabled ? 
            'Client PO sourcing with real-time data' : 
            'Client PO sourcing workflow',
          permission: 'canViewOrders',
          badge: sourcingCount > 0 ? sourcingCount : null,
          badgeColor: 'bg-orange-500',
          realDataIndicator: true
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

    // Procurement Section with Real Data
    {
      name: 'Procurement',
      section: true,
      children: [
        {
          name: 'Proforma Invoices',
          href: '/proforma-invoices',
          icon: FileText,
          description: realDataStatus.enabled ? 
            'Supplier quotations with real data sync' : 
            'Supplier quotations and PIs',
          permission: 'canViewOrders',
          realDataIndicator: true
        },
        {
          name: 'Purchase Orders',
          href: '/purchase-orders',
          icon: ShoppingCart,
          description: realDataStatus.enabled ? 
            'Purchase order management with real-time updates' : 
            'Purchase order management',
          permission: 'canViewOrders',
          realDataIndicator: true
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
          description: realDataStatus.enabled ? 
            'Real-time delivery and payment tracking' : 
            'Delivery and payment tracking',
          permission: 'canViewDeliveries',
          badge: trackingCounts.overdueItems > 0 ? trackingCounts.overdueItems : 
                 trackingCounts.activeDeliveries > 0 ? trackingCounts.activeDeliveries : null,
          badgeColor: trackingCounts.overdueItems > 0 ? 'bg-red-500' : 'bg-blue-500',
          realDataIndicator: true
        }
      ]
    },

    // Business Section with Real Data
    {
      name: 'Business',
      section: true,
      children: [
        {
          name: 'Client Invoices',
          href: '/client-invoices',
          icon: Receipt,
          description: realDataStatus.enabled ? 
            'Client billing with real-time data' : 
            'Client billing and invoices',
          permission: 'canViewInvoices',
          realDataIndicator: true
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

    // Tools & AI Section with Real Data Integration
    {
      name: 'Tools & AI',
      section: true,
      children: [
        {
          name: 'Quick Import',
          href: '/quick-import',
          icon: Upload,
          description: realDataStatus.enabled ? 
            'Bulk data import with real-time validation' : 
            'Bulk data import utilities',
          permission: 'canImportData',
          realDataIndicator: true
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
        {
          name: 'Dual System',
          href: '/dual-system-dashboard',
          icon: GitBranch,
          description: 'Revolutionary AI prompt management',
          permission: 'canViewAI',
          badge: 'NEW',
          badgeColor: 'bg-green-500'
        },
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

    // 🆕 Multi-Company Administration Section
    {
      name: 'Multi-Company Admin',
      section: true,
      adminOnly: true,
      multiCompanyOnly: true,
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

    // Enhanced Administration Section with Real Data
    {
      name: 'Administration',
      section: true,
      adminOnly: true,
      children: [
        {
          name: 'Team Management',
          href: '/admin/team',
          icon: UserCheck,
          description: realDataStatus.enabled ? 
            'Team management with real-time activity' : 
            'Team member and role management',
          permission: 'canManageUsers',
          badge: teamOnline > 0 ? `${teamOnline} online` : null,
          badgeColor: 'bg-green-500',
          realDataIndicator: true
        },
        {
          name: 'Category Management',
          href: '/admin/categories',
          icon: FolderTree,
          description: 'Manage product categories and AI suggestions',
          permission: 'canManageUsers',
          badge: categoryCounts.pendingSuggestions > 0 ? 
            `${categoryCounts.pendingSuggestions} pending` : 
            categoryCounts.aiGenerated > 0 ? 
            `${categoryCounts.aiGenerated} AI` : null,
          badgeColor: categoryCounts.pendingSuggestions > 0 ? 'bg-orange-500' : 'bg-purple-500'
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
          description: realDataStatus.enabled ? 
            'Real-time system activity and audit logs' : 
            'System activity and audit logs',
          permission: 'canManageUsers',
          realDataIndicator: true
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

  // 🚀 Enhanced permission checking with public route support
  const hasPermission = (permission) => {
    if (!permission) return true;
    if (permission === 'canViewPublic') return true; // Public routes always accessible
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
      return permissions.isGroupAdmin || 
             permissions.isDivisionAdmin || 
             permissions.canManageCompanies ||
             permissions.canViewCompanyStructure;
    }
    
    return true;
  };

  // 🚀 Real Data Indicator Component
  const RealDataIndicator = ({ enabled, size = 'small' }) => {
    if (!enabled) return null;
    
    const iconSize = size === 'small' ? 'w-3 h-3' : 'w-4 h-4';
    const iconColor = realDataStatus.connected ? 'text-green-400' : 
                     realDataStatus.enabled ? 'text-orange-400' : 'text-gray-400';
    
    return (
      <div className={`inline-flex items-center ${iconSize} ${iconColor}`} 
           title={realDataStatus.connected ? 'Real Data Connected' : 
                  realDataStatus.enabled ? 'Real Data Enabled (Offline)' : 'Mock Data'}>
        {realDataStatus.connected ? <Database className={iconSize} /> : 
         realDataStatus.enabled ? <AlertCircle className={iconSize} /> : 
         <WifiOff className={iconSize} />}
      </div>
    );
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
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="flex items-center">
              {item.icon && <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} />}
              {!isCollapsed && (
                <div className="flex items-center">
                  <span>{item.name}</span>
                  {item.realDataIndicator && (
                    <div className="ml-2">
                      <RealDataIndicator enabled={item.realDataIndicator} />
                    </div>
                  )}
                </div>
              )}
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
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${isChild ? 'pl-11' : ''}`}
        title={isCollapsed ? 
          `${item.name}${item.realDataIndicator ? (realDataStatus.connected ? ' (Real Data)' : ' (Mock Data)') : ''}` : 
          item.description}
      >
        {item.icon && <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5`} />}
        {!isCollapsed && (
          <>
            <div className="flex items-center flex-1">
              <span>{item.name}</span>
              {item.realDataIndicator && (
                <div className="ml-2">
                  <RealDataIndicator enabled={item.realDataIndicator} />
                </div>
              )}
            </div>
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
          <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center transition-colors">
            {section.name}
            {section.adminOnly && (
              <Shield className="inline-block w-3 h-3 ml-1" />
            )}
            {section.multiCompanyOnly && (
              <Crown className="inline-block w-3 h-3 ml-1 text-purple-500 dark:text-purple-400" />
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
      admin: { label: 'Admin', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300', icon: Shield },
      manager: { label: 'Manager', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300', icon: UserCheck },
      employee: { label: 'Employee', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300', icon: Users },
      viewer: { label: 'Viewer', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300', icon: null }
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
      <nav className={`hidden lg:block bg-white dark:bg-gray-800 shadow-lg h-screen fixed left-0 top-0 transition-all duration-300 z-30 border-r border-gray-200 dark:border-gray-700 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="h-full flex flex-col">
          {/* Enhanced Header with Real Data Status */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16 bg-gradient-to-r from-blue-600 to-purple-600">
            {!isCollapsed && (
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-2">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">HiggsFlow</h2>
                  <div className="flex items-center">
                    <p className="text-xs text-blue-100">
                      {permissions.isMultiCompanyUser ? 
                        'Multi-Company Platform' : 
                        'Phase 2B Real Data'
                      }
                    </p>
                    {realDataStatus.enabled && (
                      <div className="ml-2">
                        <RealDataIndicator enabled={true} />
                      </div>
                    )}
                  </div>
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

          {/* 🚀 Real Data Status Bar */}
          {!isCollapsed && realDataStatus.enabled && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center">
                  {realDataStatus.connected ? (
                    <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-orange-500 mr-1" />
                  )}
                  <span className="text-gray-600 dark:text-gray-400">
                    {realDataStatus.connected ? 'Real Data Connected' : 'Real Data Enabled'}
                  </span>
                </div>
                {realDataStatus.syncInProgress && (
                  <RotateCw className="w-3 h-3 text-blue-500 animate-spin" />
                )}
              </div>
              {realDataStatus.lastSync && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Last sync: {realDataStatus.lastSync.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Dashboard - always first */}
            {navigationItems[0] && !navigationItems[0].section && renderNavItem(navigationItems[0])}
            
            {/* Sections */}
            {navigationItems.slice(1).map(section => 
              section.section ? renderSection(section) : null
            )}
          </div>

          {/* Enhanced User Info with Real Data Badge */}
          {user && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      user.email?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  {/* Enhanced online indicator with real data status */}
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${
                    realDataStatus.connected ? 'bg-green-400' :
                    realDataStatus.enabled ? 'bg-orange-400' :
                    permissions.isGroupAdmin ? 'bg-purple-400' :
                    permissions.isDivisionAdmin ? 'bg-blue-400' :
                    permissions.isCompanyAdmin ? 'bg-green-400' :
                    'bg-green-400'
                  }`}></div>
                </div>
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate transition-colors">
                      {user.displayName || user.email}
                    </p>
                    <div className="flex items-center mt-1">
                      {typeof userBadge === 'string' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
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
                      {realDataStatus.enabled && (
                        <div className="ml-2">
                          <RealDataIndicator enabled={true} size="small" />
                        </div>
                      )}
                    </div>
                    
                    {/* Multi-Company Access Indicator */}
                    {permissions.isMultiCompanyUser && !isCollapsed && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 transition-colors">
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

      {/* Enhanced Mobile Navigation with Real Data Indicators */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
          <nav className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-800 transition-colors duration-300">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              >
                <X className="h-6 w-6 text-white" />
              </button>
            </div>
            
            {/* Enhanced Mobile Header with Real Data Status */}
            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4">
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-white bg-opacity-20 rounded-lg mr-3">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">HiggsFlow</h2>
                  <div className="flex items-center">
                    <p className="text-xs text-blue-100">
                      {permissions.isMultiCompanyUser ? 
                        'Multi-Company Dashboard' : 
                        'Phase 2B Real Data'
                      }
                    </p>
                    {realDataStatus.enabled && (
                      <div className="ml-2">
                        <RealDataIndicator enabled={true} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Mobile Real Data Status */}
              {realDataStatus.enabled && (
                <div className="mt-2 flex items-center text-xs text-blue-100">
                  {realDataStatus.connected ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  )}
                  <span>
                    {realDataStatus.connected ? 'Real Data Connected' : 'Real Data Enabled'}
                  </span>
                  {realDataStatus.syncInProgress && (
                    <RotateCw className="w-3 h-3 ml-2 animate-spin" />
                  )}
                </div>
              )}
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

            {/* Enhanced Mobile User Info with Real Data Status */}
            {user && (
              <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-900/50 p-4 transition-colors duration-300">
                <div className="flex items-center">
                  <div className="flex-shrink-0 relative">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-medium">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        user.email?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    {/* Real data status indicator on mobile */}
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${
                      realDataStatus.connected ? 'bg-green-400' :
                      realDataStatus.enabled ? 'bg-orange-400' :
                      permissions.isGroupAdmin ? 'bg-purple-400' :
                      permissions.isDivisionAdmin ? 'bg-blue-400' :
                      permissions.isCompanyAdmin ? 'bg-green-400' :
                      'bg-green-400'
                    }`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-base font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      {user.displayName || user.email}
                    </p>
                    <div className="flex items-center mt-1">
                      {typeof userBadge === 'string' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
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
                      {realDataStatus.enabled && (
                        <div className="ml-2">
                          <RealDataIndicator enabled={true} size="small" />
                        </div>
                      )}
                    </div>
                    
                    {/* Multi-Company Access Info on Mobile */}
                    {permissions.isMultiCompanyUser && (
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 transition-colors">
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
