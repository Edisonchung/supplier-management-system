// src/App.jsx - PHASE 2B ENHANCED VERSION - Added Advanced Analytics + Smart Catalog
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider } from './hooks/useDarkMode';
import { UnifiedDataProvider } from './context/UnifiedDataContext';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/common/Layout';
import PublicPIView from './components/procurement/PublicPIView';
import Notification from './components/common/Notification';
import { usePermissions } from './hooks/usePermissions';
import { Truck, Upload, Users, Shield, Settings, Activity, Brain, ShoppingCart, Building2, Eye, BarChart3, Target } from 'lucide-react';
import FirestoreHealthCheck from './components/FirestoreHealthCheck';
import FirestoreTest from './components/FirestoreTest';
import { LoadingFeedbackProvider } from './components/common/LoadingFeedbackSystem';
import NavigationBlockerDebug from './components/debug/NavigationBlockerDebug';
import SampleDataTest from './components/test/SampleDataTest';
import EcommerceSetup from './components/setup/EcommerceSetup';
import ProductSyncDashboard from './components/sync/ProductSyncDashboard';
import CORSSafeSyncTest from './components/sync/CORSSafeSyncTest';

// 🚀 NEW: Import Phase 2B Analytics Service
import { higgsFlowAnalytics, useHiggsFlowAnalytics } from './services/analyticsService';

import './App.css';

// Import lazy components - EXISTING IMPORTS (UserManagement removed)
import { 
  LazyDashboard, 
  LazySuppliers, 
  LazyProducts, 
  LazyProformaInvoices,
  LazyPurchaseOrders,
  LazyClientInvoices,
  LazyQuickImport,
  LazySmartNotifications,
  LazyWrapper 
} from './components/LazyComponents';
const LazyMCPTools = lazy(() => import('./components/mcp/MCPTools'));

// Lazy load additional components that exist
import { lazy } from 'react';
const LazySourcingDashboard = lazy(() => import('./components/sourcing/SourcingDashboard'));
const LazySupplierMatchingPage = lazy(() => import('./components/supplier-matching/SupplierMatchingPage'));
const LazyTeamManagement = lazy(() => import('./components/team/TeamManagement'));
const LazyUnifiedTrackingDashboard = lazy(() => import('./components/tracking/UnifiedTrackingDashboard'));
const LazyMigrationPage = lazy(() => import('./components/migration/MigrationPage'));

// Existing admin components
const LazyCompanyStructureManager = lazy(() => import('./components/admin/CompanyStructureManager'));
const LazyDualSystemDashboard = lazy(() => import('./components/mcp/DualSystemDashboard'));
const LazyPromptManagement = lazy(() => import('./components/mcp/PromptManagement'));
const LazyCategoryManagementDashboard = lazy(() => import('./components/admin/CategoryManagementDashboard'));

// 🆕 EXISTING: Phase 2A E-commerce Components
const LazyPublicCatalog = lazy(() => import('./components/ecommerce/PublicCatalog'));
const LazyProductDetailPage = lazy(() => import('./components/ecommerce/ProductDetailPage'));
const LazyFactoryRegistration = lazy(() => import('./components/ecommerce/FactoryRegistration'));
const LazyShoppingCart = lazy(() => import('./components/ecommerce/ShoppingCart'));
const LazyQuoteRequest = lazy(() => import('./components/ecommerce/QuoteRequest'));
const LazyFactoryLogin = lazy(() => import('./components/ecommerce/FactoryLogin'));
const LazyFactoryDashboard = lazy(() => import('./components/ecommerce/FactoryDashboard'));

// 🚀 NEW: Phase 2B Advanced Analytics Components
const LazySmartPublicCatalog = lazy(() => import('./components/SmartPublicCatalog'));
const LazyAnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

// 🚀 NEW: Professional Landing Page Component
const LazyHiggsFlowLandingPage = lazy(() => import('./components/HiggsFlowLandingPage'));

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 🚀 NEW: Enhanced Public Route Component with Analytics
const PublicRoute = ({ children }) => {
  const analytics = useHiggsFlowAnalytics();

  useEffect(() => {
    // Track public route access
    const trackPublicAccess = async () => {
      try {
        const sessionData = {
          userAgent: navigator.userAgent,
          entryPoint: 'public_route',
          landingPage: window.location.pathname,
          referrer: document.referrer,
          ipAddress: await getClientIP()
        };

        await analytics.trackSession(sessionData);
        console.log('📊 Public route analytics tracked');
      } catch (error) {
        console.error('❌ Error tracking public route:', error);
      }
    };

    trackPublicAccess();
  }, [analytics]);

  return children;
};

// 🆕 EXISTING: Factory Route Component (for authenticated factory users)
const FactoryRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const analytics = useHiggsFlowAnalytics();
  
  useEffect(() => {
    if (user) {
      // Track factory user session
      const trackFactorySession = async () => {
        try {
          const sessionData = {
            userId: user.uid,
            email: user.email,
            userAgent: navigator.userAgent,
            entryPoint: 'factory_dashboard',
            ipAddress: await getClientIP()
          };

          await analytics.trackSession(sessionData);
          console.log('🏭 Factory user analytics tracked');
        } catch (error) {
          console.error('❌ Error tracking factory session:', error);
        }
      };

      trackFactorySession();
    }
  }, [user, analytics]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/factory/login" replace />;
  }
  
  // Check if user is a factory user (not admin)
  const isFactory = user.email && !user.email.includes('higgsflow.com') && !user.email.includes('admin');
  
  if (!isFactory) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// 🚀 ENHANCED: Protected Route Component with Analytics
const ProtectedRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  const permissions = usePermissions();
  const analytics = useHiggsFlowAnalytics();
  
  useEffect(() => {
    if (user && permission) {
      // Track admin access with permissions
      const trackAdminAccess = async () => {
        try {
          const sessionData = {
            userId: user.uid,
            email: user.email,
            userAgent: navigator.userAgent,
            entryPoint: 'admin_panel',
            permission: permission,
            ipAddress: await getClientIP()
          };

          await analytics.trackSession(sessionData);
          console.log('👨‍💼 Admin user analytics tracked');
        } catch (error) {
          console.error('❌ Error tracking admin session:', error);
        }
      };

      trackAdminAccess();
    }
  }, [user, permission, analytics]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permission && permissions[permission] === false) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to view this page</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Contact your administrator for access</p>
        </div>
      </div>
    );
  }
  
  return children;
};

// Placeholder Component for features not yet implemented
const PlaceholderComponent = ({ title, description, icon: Icon }) => (
  <div className="flex items-center justify-center h-full p-8">
    <div className="text-center">
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />}
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">{description}</p>
      <div className="mt-6 text-sm text-gray-500 dark:text-gray-500">
        <p>🚀 Feature in development</p>
        <p>Expected completion: Q1 2025</p>
      </div>
    </div>
  </div>
);

// 🚀 NEW: Get Client IP Helper Function
const getClientIP = async () => {
  try {
    // In production, use actual IP detection service
    // For demo, return localhost
    return '127.0.0.1';
  } catch {
    return 'unknown';
  }
};

function AppContent() {
  const { user, loading } = useAuth();
  const [notification, setNotification] = useState(null);
  const [showFirestoreTest, setShowFirestoreTest] = useState(true);
  const [analyticsInitialized, setAnalyticsInitialized] = useState(false);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // 🚀 NEW: Initialize Analytics on App Load
  useEffect(() => {
    const initializeAnalytics = async () => {
      if (!analyticsInitialized) {
        try {
          console.log('🚀 Initializing HiggsFlow Phase 2B Analytics...');
          
          // Basic analytics initialization
          const sessionData = {
            userAgent: navigator.userAgent,
            entryPoint: 'app_initialization',
            landingPage: window.location.pathname,
            referrer: document.referrer,
            ipAddress: await getClientIP()
          };

          if (user) {
            sessionData.userId = user.uid;
            sessionData.email = user.email;
          }

          await higgsFlowAnalytics.trackUserSession(sessionData);
          setAnalyticsInitialized(true);
          
          console.log('✅ Analytics initialized successfully');
        } catch (error) {
          console.error('❌ Error initializing analytics:', error);
        }
      }
    };

    initializeAnalytics();
  }, [user, analyticsInitialized]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading HiggsFlow...</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Accelerating Supply Chain</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Phase 2B • Advanced Analytics</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster 
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          className: '',
          duration: 4000,
          style: {
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
            border: '1px solid var(--border-primary)',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: 'var(--success-color)',
              secondary: 'var(--card-bg)',
            },
            style: {
              background: 'var(--success-color)',
              color: 'white',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: 'var(--error-color)',
              secondary: 'white',
            },
            style: {
              background: 'var(--error-color)',
              color: 'white',
            },
          },
          loading: {
            duration: Infinity,
            style: {
              background: 'var(--primary-color)',
              color: 'white',
            },
          },
        }}
      />
      
      <Router>
        <Routes>
          {/* ========== PUBLIC E-COMMERCE ROUTES WITH SMART ANALYTICS ========== */}
          
          {/* 🚀 NEW: Smart Catalog with AI Analytics - DEFAULT PUBLIC ROUTE */}
          <Route 
            path="/catalog" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Smart Public Catalog">
                  <LazySmartPublicCatalog />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Legacy catalog for comparison */}
          <Route 
            path="/catalog/legacy" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Legacy Public Catalog">
                  <LazyPublicCatalog />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Product detail pages with analytics */}
          <Route 
            path="/product/:productId" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Product Details">
                  <LazyProductDetailPage />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Category browsing with smart filtering */}
          <Route 
            path="/category/:categorySlug" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Smart Category Browser">
                  <LazySmartPublicCatalog />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Search results with AI recommendations */}
          <Route 
            path="/search" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Smart Search Results">
                  <LazySmartPublicCatalog />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* ========== FACTORY ROUTES ========== */}
          
          {/* Factory registration */}
          <Route 
            path="/factory/register" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Factory Registration">
                  <LazyFactoryRegistration />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Factory login */}
          <Route 
            path="/factory/login" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Factory Login">
                  <LazyFactoryLogin />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Factory dashboard (authenticated factories) */}
          <Route 
            path="/factory/dashboard" 
            element={
              <FactoryRoute>
                <LazyWrapper componentName="Factory Dashboard">
                  <LazyFactoryDashboard />
                </LazyWrapper>
              </FactoryRoute>
            } 
          />
          
          {/* ========== SHOPPING & ORDERS ROUTES ========== */}
          
          {/* Shopping cart (public + authenticated) */}
          <Route 
            path="/cart" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Shopping Cart">
                  <LazyShoppingCart />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Quote request */}
          <Route 
            path="/quote/request" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Quote Request">
                  <LazyQuoteRequest />
                </LazyWrapper>
              </PublicRoute>
            } 
          />

          {/* ========== EXISTING ROUTES ========== */}

          <Route path="/test-sample-data" element={<SampleDataTest />} />

          {/* Public PI View Route */}
          <Route path="/pi/view/:shareableId" element={<PublicPIView />} />
          
          {/* Admin Login Route */}
          <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/admin" replace />} />
          
          {/* ========== ADMIN/INTERNAL ROUTES WITH LAYOUT ========== */}
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            {/* Admin Dashboard */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute permission="canViewDashboard">
                  <LazyWrapper componentName="Dashboard">
                    <LazyDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* 🚀 NEW: Advanced Analytics Dashboard */}
            <Route 
              path="/analytics" 
              element={
                <ProtectedRoute permission="canViewDashboard">
                  <LazyWrapper componentName="Analytics Dashboard">
                    <LazyAnalyticsDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* 🚀 NEW: Business Intelligence Route */}
            <Route 
              path="/business-intelligence" 
              element={
                <ProtectedRoute permission="canViewDashboard">
                  <LazyWrapper componentName="Business Intelligence">
                    <LazyAnalyticsDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Core Management Routes */}
            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute permission="canViewSuppliers">
                  <LazyWrapper componentName="Suppliers">
                    <LazySuppliers showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/products" 
              element={
                <ProtectedRoute permission="canViewProducts">
                  <LazyWrapper componentName="Products">
                    <LazyProducts showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Operations Routes */}
            <Route 
              path="/sourcing" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper componentName="Sourcing Dashboard">
                    <LazySourcingDashboard showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/ai-matching" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <PlaceholderComponent 
                    title="AI Supplier Matching" 
                    description="AI-powered intelligent supplier matching and recommendation system" 
                    icon={Brain}
                  />
                </ProtectedRoute>
              } 
            />
            
            {/* Procurement Routes */}
            <Route 
              path="/proforma-invoices" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper componentName="Proforma Invoices">
                    <LazyProformaInvoices showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/purchase-orders" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper componentName="Purchase Orders">
                    <LazyPurchaseOrders showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Supplier Matching Page */}
            <Route 
              path="/purchase-orders/:poId/supplier-matching" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper componentName="Supplier Matching">
                    <LazySupplierMatchingPage />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Smart Notifications Route */}
            <Route 
              path="/notifications" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper componentName="Smart Notifications">
                    <LazySmartNotifications />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Tracking Routes */}
            <Route 
              path="/tracking" 
              element={
                <ProtectedRoute permission="canViewDeliveries">
                  <LazyWrapper componentName="Tracking Dashboard">
                    <LazyUnifiedTrackingDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Migration Route */}
            <Route 
              path="/migration" 
              element={
                <ProtectedRoute permission="canViewDeliveries">
                  <LazyWrapper componentName="Migration">
                    <LazyMigrationPage />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Business Routes */}
            <Route 
              path="/client-invoices" 
              element={
                <ProtectedRoute permission="canViewInvoices">
                  <LazyWrapper componentName="Client Invoices">
                    <LazyClientInvoices showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/delivery-tracking" 
              element={<Navigate to="/tracking" replace />}
            />
            
            {/* Tools Routes */}
            <Route 
              path="/quick-import" 
              element={
                <ProtectedRoute permission="canImportData">
                  <LazyWrapper componentName="Quick Import">
                    <LazyQuickImport showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* MCP Routes */}
            <Route 
              path="/mcp-tools" 
              element={
                <ProtectedRoute permission="canViewAI">
                  <LazyWrapper componentName="MCP Tools">
                    <LazyMCPTools />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Dual System Dashboard Route */}
            <Route 
              path="/dual-system-dashboard" 
              element={
                <ProtectedRoute permission="canViewAI">
                  <LazyWrapper componentName="Dual System Dashboard">
                    <LazyDualSystemDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Prompt Management Route */}
            <Route 
              path="/prompt-management" 
              element={
                <ProtectedRoute permission="canManagePrompts">
                  <LazyWrapper componentName="Prompt Management">
                    <LazyPromptManagement />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Administration Routes */}
            
            {/* Company Structure Manager Routes */}
            <Route 
              path="/admin/companies" 
              element={
                <ProtectedRoute permission="canManageCompanies">
                  <LazyWrapper componentName="Company Structure Manager">
                    <LazyCompanyStructureManager showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/company-structure" 
              element={
                <ProtectedRoute permission="canManageCompanies">
                  <LazyWrapper componentName="Company Structure Manager">
                    <LazyCompanyStructureManager showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Team Management Routes */}
            <Route 
              path="/team-management" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <LazyWrapper componentName="Team Management">
                    <LazyTeamManagement showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/team" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <LazyWrapper componentName="Team Management">
                    <LazyTeamManagement showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

             {/* Category Management Route */}
            <Route 
              path="/admin/categories" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <LazyWrapper componentName="Category Management">
                    <LazyCategoryManagementDashboard showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Other Admin Routes */}
            <Route 
              path="/admin/settings" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <PlaceholderComponent 
                    title="System Settings" 
                    description="Configure system preferences, integrations, and global settings" 
                    icon={Settings}
                  />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <PlaceholderComponent 
                    title="System Settings" 
                    description="Configure system preferences, integrations, and global settings" 
                    icon={Settings}
                  />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin/activity" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <PlaceholderComponent 
                    title="Activity Logs" 
                    description="Comprehensive audit trail and team activity monitoring" 
                    icon={Activity}
                  />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/activity-logs" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <PlaceholderComponent 
                    title="Activity Logs" 
                    description="Comprehensive audit trail and team activity monitoring" 
                    icon={Activity}
                  />
                </ProtectedRoute>
              } 
            />
            
            {/* Setup Ecommerce */}
            <Route 
              path="/setup-ecommerce" 
              element={
              <EcommerceSetup />
              } 
              />
            
            {/* Product Sync Dashboard */}
            <Route path="/sync-dashboard" element={<ProductSyncDashboard />} />

            {/* CORS-Safe Product Sync Test */}
            <Route path="/cors-safe-sync-test" element={<CORSSafeSyncTest />} />

            {/* Legacy route redirects */}
            <Route 
              path="/users" 
              element={<Navigate to="/team-management" replace />}
            />
          </Route>

          {/* ========== ROOT ROUTE WITH PROFESSIONAL LANDING PAGE ========== */}
          
          {/* 🚀 NEW: Professional Landing Page for www.higgsflow.com */}
          <Route 
            path="/" 
            element={
              user ? (
                // Logged in users get redirected to appropriate dashboard
                user.email && (user.email.includes('higgsflow.com') || user.email.includes('admin')) ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/factory/dashboard" replace />
                )
              ) : (
                // Anonymous users see the professional landing page
                <PublicRoute>
                  <LazyWrapper componentName="HiggsFlow Landing Page">
                    <LazyHiggsFlowLandingPage />
                  </LazyWrapper>
                </PublicRoute>
              )
            } 
          />

          {/* Additional route for direct landing page access */}
          <Route 
            path="/home" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="HiggsFlow Landing Page">
                  <LazyHiggsFlowLandingPage />
                </LazyWrapper>
              </PublicRoute>
            } 
          />

          {/* ========== LEGACY REDIRECTS ========== */}
          
          {/* Redirect old admin routes */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          
          {/* 🚀 NEW: Analytics route redirects */}
          <Route path="/reports" element={<Navigate to="/analytics" replace />} />
          <Route path="/insights" element={<Navigate to="/analytics" replace />} />
          
          {/* Catch all - smart redirect based on authentication */}
          <Route 
            path="*" 
            element={
              user ? (
                user.email && (user.email.includes('higgsflow.com') || user.email.includes('admin')) ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/factory/dashboard" replace />
                )
              ) : (
                <Navigate to="/catalog" replace />
              )
            } 
          />
        </Routes>
        
        {/* Global Notification */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        
        {/* 🚀 NEW: Analytics Status Indicator */}
        {analyticsInitialized && import.meta.env.DEV && (
          <div className="fixed bottom-20 right-4 bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg z-50">
            📊 Analytics Active
          </div>
        )}
        
        {/* Development Tools */}
        {user && import.meta.env.DEV && (
          <>
            {showFirestoreTest && <FirestoreTest />}
            <button
              onClick={() => setShowFirestoreTest(!showFirestoreTest)}
              className="fixed bottom-4 left-4 bg-gray-800 dark:bg-gray-700 text-white text-xs px-3 py-1 rounded-full hover:bg-gray-700 dark:hover:bg-gray-600 z-50 shadow-lg transition-colors"
              title={`${showFirestoreTest ? 'Hide' : 'Show'} Firestore Test Panel`}
            >
              {showFirestoreTest ? 'Hide' : 'Show'} Firestore Test
            </button>
            
            {/* 🚀 NEW: Analytics Debug Panel */}
            <button
              onClick={() => console.log('HiggsFlow Analytics Status:', higgsFlowAnalytics)}
              className="fixed bottom-4 left-32 bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 z-50 shadow-lg transition-colors"
              title="Check Analytics Status"
            >
              📊 Analytics Debug
            </button>
          </>
        )}
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <DarkModeProvider>
      <AuthProvider>
        <UnifiedDataProvider>
          <LoadingFeedbackProvider>
            <div className="theme-transition">
              <AppContent />
            </div>
          </LoadingFeedbackProvider>
        </UnifiedDataProvider>
      </AuthProvider>
    </DarkModeProvider>
  );
}

export default App;
