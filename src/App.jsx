// src/App.jsx - PHASE 2B ENHANCED VERSION - Real Data Integration + Business Registration + Image Generation Dashboard + Manual Upload
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DarkModeProvider } from './hooks/useDarkMode';
import { UnifiedDataProvider, useUnifiedData } from './context/UnifiedDataContext';
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
import { JobCodeDashboard, JobCodeDetailPage, JobCodeModal } from './components/jobs';
import { CostingDashboard, CostingSheet, CostingEntryForm, ApprovalQueue } from './components/costing';
import { 
  QuotationDashboard, 
  QuotationCreate, 
  QuotationDetail, 
  QuotationEdit 
} from './components/quotation';

// Phase 2B Analytics Service with Real Data
import { higgsFlowAnalytics, useHiggsFlowAnalytics } from './services/analyticsService';

import './App.css';

// Import lazy components - EXISTING IMPORTS
import { 
  LazyDashboard, 
  LazySuppliers, 
  LazyProducts, 
  LazyClients,
  LazyProformaInvoices,
  LazyPurchaseOrders,
  LazyClientInvoices,
  LazyQuickImport,
  LazySmartNotifications,
  LazyWrapper,
  LazySmartProductSyncDashboard
} from './components/LazyComponents';

// Lazy load additional components
import { lazy } from 'react';
const LazyMCPTools = lazy(() => import('./components/mcp/MCPTools'));
const LazySourcingDashboard = lazy(() => import('./components/sourcing/SourcingDashboard'));
const LazySupplierMatchingPage = lazy(() => import('./components/supplier-matching/SupplierMatchingPage'));
const LazyTeamManagement = lazy(() => import('./components/team/TeamManagement'));
const LazyUnifiedTrackingDashboard = lazy(() => import('./components/tracking/UnifiedTrackingDashboard'));
const LazyMigrationPage = lazy(() => import('./components/migration/MigrationPage'));

// Admin components
const LazyCompanyStructureManager = lazy(() => import('./components/admin/CompanyStructureManager'));
const LazyDualSystemDashboard = lazy(() => import('./components/mcp/DualSystemDashboard'));
const LazyPromptManagement = lazy(() => import('./components/mcp/PromptManagement'));
const LazyCategoryManagementDashboard = lazy(() => import('./components/admin/CategoryManagementDashboard'));

// Image Generation Dashboard and Manual Upload - UPDATED IMPORTS
import { LazyImageGenerationDashboard } from './components/LazyComponents';

// NEW: Manual Image Upload Component
const LazyManualImageUpload = lazy(() => 
  import('./components/mcp/ManualImageUpload').catch((error) => {
    console.warn('ManualImageUpload failed to load:', error);
    return {
      default: () => (
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 rounded-lg shadow-md">
          <div className="text-center p-8">
            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Manual Image Upload
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload custom images for products manually
            </p>
            <div className="text-sm text-green-600 dark:text-green-400 font-medium">
              Component will be available after installation
            </div>
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              Expected features: Drag & Drop Upload • Image Preview • Bulk Operations
            </div>
          </div>
        </div>
      )
    };
  })
);

// Phase 2A E-commerce Components - UPDATED WITH BUSINESS REGISTRATION
const LazyPublicCatalog = lazy(() => import('./components/ecommerce/PublicCatalog'));
const LazyProductDetailPage = lazy(() => import('./components/ecommerce/ProductDetailPage'));

// NEW: Business Registration Components (replacing Factory Registration)
const LazyBusinessRegistration = lazy(() => import('./components/ecommerce/BusinessRegistration'));
const LazyBusinessLogin = lazy(() => import('./components/ecommerce/BusinessLogin'));

// Legacy Factory Components (keep for backward compatibility)
const LazyFactoryRegistration = lazy(() => import('./components/ecommerce/FactoryRegistration'));
const LazyFactoryLogin = lazy(() => import('./components/ecommerce/FactoryLogin'));
const LazyFactoryDashboard = lazy(() => import('./components/ecommerce/FactoryDashboard'));

const LazyShoppingCart = lazy(() => import('./components/ecommerce/ShoppingCart'));
const LazyQuoteRequest = lazy(() => import('./components/ecommerce/QuoteRequest'));

// Phase 2B Advanced Analytics Components with Real Data
const LazySmartPublicCatalog = lazy(() => import('./components/SmartPublicCatalog'));
const LazyAnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

// HiggsFlow Analytics Phase 2B Dashboard with Real Data Integration
const LazyHiggsFlowAnalyticsDashboard = lazy(() => import('./components/analytics/HiggsFlowAnalyticsDashboard'));

// Professional Landing Page Component
const LazyHiggsFlowLandingPage = lazy(() => import('./components/HiggsFlowLandingPage'));

// Real Data Migration Dashboard (using existing FirestoreMigrationPanel)
const LazyFirestoreMigrationPanel = lazy(() => import('./components/migration/FirestoreMigrationPanel'));

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
    
    // Track errors in analytics
    if (window.higgsFlowAnalytics) {
      window.higgsFlowAnalytics.trackError({
        error: error.message,
        component: 'ErrorBoundary',
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Please refresh the page to try again</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Error has been logged for analysis
            </p>
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

// Enhanced Public Route Component with Real Data Analytics
const PublicRoute = ({ children }) => {
  const analytics = useHiggsFlowAnalytics();

  useEffect(() => {
    // Track public route access with real data
    const trackPublicAccess = async () => {
      try {
        const sessionData = {
          userAgent: navigator.userAgent,
          entryPoint: 'public_route',
          landingPage: window.location.pathname,
          referrer: document.referrer,
          ipAddress: await getClientIP(),
          timestamp: new Date().toISOString(),
          dataSource: 'real', // Flag for real data tracking
          platform: 'web'
        };

        await analytics.trackSession(sessionData);
        console.log('Public route real data analytics tracked');
      } catch (error) {
        console.error('Error tracking public route:', error);
      }
    };

    trackPublicAccess();
  }, [analytics]);

  return children;
};

// Business Route Component (for authenticated business users) - Renamed from FactoryRoute
const BusinessRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const analytics = useHiggsFlowAnalytics();
  
  useEffect(() => {
    if (user) {
      // Track business user session with real data integration
      const trackBusinessSession = async () => {
        try {
          const sessionData = {
            userId: user.uid,
            email: user.email,
            userAgent: navigator.userAgent,
            entryPoint: 'business_dashboard',
            ipAddress: await getClientIP(),
            timestamp: new Date().toISOString(),
            dataSource: 'real',
            userType: 'business', // Changed from 'factory'
            lastActivity: new Date().toISOString()
          };

          await analytics.trackSession(sessionData);
          console.log('Business user real data analytics tracked');
        } catch (error) {
          console.error('Error tracking business session:', error);
        }
      };

      trackBusinessSession();
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
    return <Navigate to="/business/login" replace />;
  }
  
  // Check if user is a business user (not admin)
  const isBusiness = user.email && !user.email.includes('higgsflow.com') && !user.email.includes('admin');
  
  if (!isBusiness) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
};

// Legacy FactoryRoute for backward compatibility
const FactoryRoute = BusinessRoute;

// Enhanced Protected Route Component with Real Data Analytics
const ProtectedRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  const permissions = usePermissions();
  const analytics = useHiggsFlowAnalytics();
  
  useEffect(() => {
    if (user && permission) {
      // Track admin access with permissions and real data
      const trackAdminAccess = async () => {
        try {
          const sessionData = {
            userId: user.uid,
            email: user.email,
            userAgent: navigator.userAgent,
            entryPoint: 'admin_panel',
            permission: permission,
            ipAddress: await getClientIP(),
            timestamp: new Date().toISOString(),
            dataSource: 'real',
            userType: 'admin',
            permissionLevel: Object.keys(permissions).filter(p => permissions[p]).length,
            lastActivity: new Date().toISOString()
          };

          await analytics.trackSession(sessionData);
          console.log('Admin user real data analytics tracked');
        } catch (error) {
          console.error('Error tracking admin session:', error);
        }
      };

      trackAdminAccess();
    }
  }, [user, permission, analytics, permissions]);
  
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
        <p>Feature in development</p>
        <p>Expected completion: Q1 2025</p>
      </div>
    </div>
  </div>
);

// Get Client IP Helper Function - Enhanced
const getClientIP = async () => {
  try {
    // Try multiple IP detection services for real data
    const services = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://ipinfo.io/json'
    ];
    
    for (const service of services) {
      try {
        const response = await fetch(service);
        const data = await response.json();
        return data.ip || data.query || '127.0.0.1';
      } catch (error) {
        continue;
      }
    }
    
    return '127.0.0.1';
  } catch {
    return 'unknown';
  }
};

// Safe UnifiedData Hook - Prevents build errors
const useUnifiedDataSafe = () => {
  try {
    return useUnifiedData();
  } catch (error) {
    console.warn('UnifiedDataContext not available, using fallback values:', error);
    return {
      dataSource: 'localStorage',
      isRealTimeActive: false,
      migrationStatus: { inProgress: false }
    };
  }
};

function AppContent() {
  const { user, loading } = useAuth();
  
  // Add fallback for useUnifiedData in case context is not available
  const { dataSource, isRealTimeActive, migrationStatus } = useUnifiedDataSafe();
  
  const [notification, setNotification] = useState(null);
  const [showFirestoreTest, setShowFirestoreTest] = useState(true);
  const [analyticsInitialized, setAnalyticsInitialized] = useState(false);
  
  // Real data status based on existing UnifiedDataContext
  const realDataEnabled = dataSource === 'firestore';

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Initialize Real Data Services and Analytics
  useEffect(() => {
    const initializeRealDataServices = async () => {
      if (!analyticsInitialized) {
        try {
          console.log('Initializing HiggsFlow Phase 2B Real Data Services...');
          
          // Basic analytics initialization with real data
          const sessionData = {
            userAgent: navigator.userAgent,
            entryPoint: 'app_initialization',
            landingPage: window.location.pathname,
            referrer: document.referrer,
            ipAddress: await getClientIP(),
            timestamp: new Date().toISOString(),
            dataSource: 'real',
            appVersion: '2.0.0-phase2b',
            buildNumber: process.env.REACT_APP_BUILD_NUMBER || 'dev'
          };

          if (user) {
            sessionData.userId = user.uid;
            sessionData.email = user.email;
            sessionData.userType = user.email?.includes('higgsflow.com') ? 'admin' : 'business';
          }

          await higgsFlowAnalytics.trackUserSession(sessionData);
          setAnalyticsInitialized(true);
          
          console.log(`Analytics initialized - Data Source: ${dataSource}`);
        } catch (error) {
          console.error('Error initializing analytics:', error);
        }
      }
    };

    initializeRealDataServices();
  }, [user, analyticsInitialized, dataSource]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading HiggsFlow...</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Accelerating Supply Chain</p>
          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
            Phase 2B • {dataSource === 'firestore' ? 'Real Data (Firestore)' : 'Mock Data (localStorage)'}
          </p>
          {realDataEnabled && (
            <p className="mt-1 text-xs text-green-600 dark:text-green-400">
              Real Data Services Active
            </p>
          )}
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
            {/* ========== PUBLIC E-COMMERCE ROUTES WITH REAL DATA SMART ANALYTICS ========== */}
            
            {/* Smart Catalog with Real Data AI Analytics - DEFAULT PUBLIC ROUTE */}
            <Route 
              path="/catalog" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Smart Public Catalog (Real Data)">
                    <LazySmartPublicCatalog realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Legacy catalog for comparison (mock data) */}
            <Route 
              path="/catalog/legacy" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Legacy Public Catalog (Mock Data)">
                    <LazyPublicCatalog />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Real Data Migration Dashboard - ADMIN ONLY */}
            <Route 
              path="/catalog/migration" 
              element={
                <ProtectedRoute permission="canManageData">
                  <LazyWrapper componentName="Firestore Migration Panel">
                    <LazyFirestoreMigrationPanel />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Product detail pages with real data analytics */}
            <Route 
              path="/product/:productId" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Product Details (Real Data)">
                    <LazyProductDetailPage realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Category browsing with smart filtering and real data */}
            <Route 
              path="/category/:categorySlug" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Smart Category Browser (Real Data)">
                    <LazySmartPublicCatalog realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Search results with AI recommendations and real data */}
            <Route 
              path="/search" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Smart Search Results (Real Data)">
                    <LazySmartPublicCatalog realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* ========== BUSINESS REGISTRATION ROUTES (NEW UNIVERSAL SYSTEM) ========== */}
            
            {/* Primary business registration route */}
            <Route 
              path="/business/register" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Business Registration">
                    <LazyBusinessRegistration realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Alternative business registration routes for SEO */}
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Business Registration">
                    <LazyBusinessRegistration realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            <Route 
              path="/company/register" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Business Registration">
                    <LazyBusinessRegistration realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Business login */}
            <Route 
              path="/business/login" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Business Login">
                    <LazyBusinessLogin realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Business dashboard (authenticated business users) */}
            <Route 
              path="/business/dashboard" 
              element={
                <BusinessRoute>
                  <LazyWrapper componentName="Business Dashboard">
                    <LazyFactoryDashboard realData={realDataEnabled} />
                  </LazyWrapper>
                </BusinessRoute>
              } 
            />
            
            {/* ========== LEGACY FACTORY ROUTES (REDIRECTS TO BUSINESS ROUTES) ========== */}
            
            {/* Redirect old factory registration routes to business registration */}
            <Route 
              path="/factory/register" 
              element={<Navigate to="/business/register" replace />}
            />
            
            <Route 
              path="/factory-registration" 
              element={<Navigate to="/business/register" replace />}
            />
            
            {/* Redirect old factory login to business login */}
            <Route 
              path="/factory/login" 
              element={<Navigate to="/business/login" replace />}
            />
            
            {/* Redirect old factory dashboard to business dashboard */}
            <Route 
              path="/factory/dashboard" 
              element={<Navigate to="/business/dashboard" replace />}
            />
            
            {/* Legacy factory routes for backward compatibility (if needed for testing) */}
            <Route 
              path="/legacy/factory/register" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Legacy Factory Registration">
                    <LazyFactoryRegistration realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            <Route 
              path="/legacy/factory/login" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Legacy Factory Login">
                    <LazyFactoryLogin realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* ========== SHOPPING & ORDERS ROUTES WITH REAL DATA ========== */}
            
            {/* Shopping cart (public + authenticated) with real data */}
            <Route 
              path="/cart" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Shopping Cart (Real Data)">
                    <LazyShoppingCart realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* Quote request with real data */}
            <Route 
              path="/quote/request" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Quote Request (Real Data)">
                    <LazyQuoteRequest realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />

            {/* ========== EXISTING ROUTES WITH REAL DATA ENHANCEMENTS ========== */}

            <Route path="/test-sample-data" element={<SampleDataTest />} />

            {/* Public PI View Route */}
            <Route path="/pi/view/:shareableId" element={<PublicPIView />} />
            
            {/* Admin Login Route */}
            <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/admin" replace />} />
            
            {/* ========== ADMIN/INTERNAL ROUTES WITH LAYOUT AND REAL DATA ========== */}
            <Route element={user ? <Layout /> : <Navigate to="/login" />}>
              {/* Admin Dashboard with real data */}
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute permission="canViewDashboard">
                    <LazyWrapper componentName="Dashboard (Real Data)">
                      <LazyDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* HiggsFlow Analytics Phase 2B Dashboard - PRIMARY ANALYTICS ROUTE with Real Data */}
              <Route 
                path="/analytics" 
                element={
                  <ProtectedRoute permission="canViewAnalytics">
                    <LazyWrapper componentName="HiggsFlow Analytics Dashboard (Real Data)">
                      <LazyHiggsFlowAnalyticsDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Business Intelligence Route - SECONDARY ANALYTICS ACCESS */}
              <Route 
                path="/business-intelligence" 
                element={
                  <ProtectedRoute permission="canViewAnalytics">
                    <LazyWrapper componentName="HiggsFlow Analytics Dashboard (Real Data)">
                      <LazyHiggsFlowAnalyticsDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Advanced Analytics Route - TERTIARY ANALYTICS ACCESS */}
              <Route 
                path="/advanced-analytics" 
                element={
                  <ProtectedRoute permission="canViewAnalytics">
                    <LazyWrapper componentName="HiggsFlow Analytics Dashboard (Real Data)">
                      <LazyHiggsFlowAnalyticsDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Real-time Insights Route */}
              <Route 
                path="/insights" 
                element={
                  <ProtectedRoute permission="canViewAnalytics">
                    <LazyWrapper componentName="Real-time Insights (Real Data)">
                      <LazyAnalyticsDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Legacy Analytics Dashboard (keeping for backward compatibility) */}
              <Route 
                path="/analytics-legacy" 
                element={
                  <ProtectedRoute permission="canViewAnalytics">
                    <LazyWrapper componentName="Analytics Dashboard (Mock Data)">
                      <LazyAnalyticsDashboard realData={false} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* ========== PHASE 2B E-COMMERCE PLATFORM ROUTES WITH REAL DATA ========== */}
              
              {/* Business Dashboard - Protected Route with Real Data (renamed from factory-dashboard) */}
              <Route 
                path="/business-dashboard" 
                element={
                  <ProtectedRoute permission="canAccessFactoryDashboard">
                    <LazyWrapper componentName="Business Dashboard (Real Data)">
                      <LazyFactoryDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Legacy factory-dashboard redirect */}
              <Route 
                path="/factory-dashboard" 
                element={<Navigate to="/business-dashboard" replace />}
              />

              {/* Quote Requests Management with Real Data */}
              <Route 
                path="/quote-requests" 
                element={
                  <ProtectedRoute permission="canViewQuotes">
                    <LazyWrapper componentName="Quote Requests (Real Data)">
                      <LazyQuoteRequest realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Shopping Cart Management with Real Data */}
              <Route 
                path="/shopping-cart" 
                element={
                  <ProtectedRoute permission="canManageShoppingCart">
                    <LazyWrapper componentName="Shopping Cart (Real Data)">
                      <LazyShoppingCart realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* ========== CORE MANAGEMENT ROUTES WITH REAL DATA ========== */}
              
              {/* Core Management Routes with Real Data */}
              <Route 
                path="/suppliers" 
                element={
                  <ProtectedRoute permission="canViewSuppliers">
                    <LazyWrapper componentName="Suppliers (Real Data)">
                      <LazySuppliers showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/products" 
                element={
                  <ProtectedRoute permission="canViewProducts">
                    <LazyWrapper componentName="Products (Real Data)">
                      <LazyProducts showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/clients" 
                element={
                  <ProtectedRoute permission="canViewSuppliers">
                    <LazyWrapper componentName="Clients (Real Data)">
                      <LazyClients showNotification={showNotification} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Operations Routes with Real Data */}
              <Route 
                path="/sourcing" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Sourcing Dashboard (Real Data)">
                      <LazySourcingDashboard showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/ai-matching" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <PlaceholderComponent 
                      title="AI Supplier Matching (Real Data)" 
                      description="AI-powered intelligent supplier matching and recommendation system with real data integration" 
                      icon={Brain}
                    />
                  </ProtectedRoute>
                } 
              />
              
              {/* Procurement Routes with Real Data */}
              <Route 
                path="/proforma-invoices" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Proforma Invoices (Real Data)">
                      <LazyProformaInvoices showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/purchase-orders" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Purchase Orders (Real Data)">
                      <LazyPurchaseOrders showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Supplier Matching Page with Real Data */}
              <Route 
                path="/purchase-orders/:poId/supplier-matching" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Supplier Matching (Real Data)">
                      <LazySupplierMatchingPage realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Smart Notifications Route with Real Data */}
              <Route 
                path="/notifications" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Smart Notifications (Real Data)">
                      <LazySmartNotifications realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Tracking Routes with Real Data */}
              <Route 
                path="/tracking" 
                element={
                  <ProtectedRoute permission="canViewDeliveries">
                    <LazyWrapper componentName="Tracking Dashboard (Real Data)">
                      <LazyUnifiedTrackingDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Migration Route with Real Data */}
              <Route 
                path="/migration" 
                element={
                  <ProtectedRoute permission="canViewDeliveries">
                    <LazyWrapper componentName="Migration (Real Data)">
                      <LazyMigrationPage realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Business Routes with Real Data */}
              <Route 
                path="/client-invoices" 
                element={
                  <ProtectedRoute permission="canViewInvoices">
                    <LazyWrapper componentName="Client Invoices (Real Data)">
                      <LazyClientInvoices showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Job Code Routes */}
              <Route 
                path="/jobs" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Job Code Dashboard">
                      <JobCodeDashboard />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/jobs/:jobCode" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Job Code Detail">
                      <JobCodeDetailPage />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Costing Routes */}
              <Route 
                path="/costing" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Costing Dashboard">
                      <CostingDashboard />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/costing/approvals" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Approval Queue">
                      <ApprovalQueue />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/costing/:jobCode" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Costing Sheet">
                      <CostingSheet />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/costing/:jobCode/entry" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Costing Entry Form">
                      <CostingEntryForm />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/costing/:jobCode/entry/:entryId" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Costing Entry Form">
                      <CostingEntryForm />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Quotation Routes */}
              <Route 
                path="/quotations" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Quotation Dashboard">
                      <QuotationDashboard />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/quotations/create" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Create Quotation">
                      <QuotationCreate />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/quotations/:id" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Quotation Detail">
                      <QuotationDetail />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/quotations/:id/edit" 
                element={
                  <ProtectedRoute permission="canViewOrders">
                    <LazyWrapper componentName="Edit Quotation">
                      <QuotationEdit />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/delivery-tracking" 
                element={<Navigate to="/tracking" replace />}
              />
              
              {/* Tools Routes with Real Data */}
              <Route 
                path="/quick-import" 
                element={
                  <ProtectedRoute permission="canImportData">
                    <LazyWrapper componentName="Quick Import (Real Data)">
                      <LazyQuickImport showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* MCP Routes with Real Data */}
              <Route 
                path="/mcp-tools" 
                element={
                  <ProtectedRoute permission="canViewAI">
                    <LazyWrapper componentName="MCP Tools (Real Data)">
                      <LazyMCPTools realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Dual System Dashboard Route with Real Data */}
              <Route 
                path="/dual-system-dashboard" 
                element={
                  <ProtectedRoute permission="canViewAI">
                    <LazyWrapper componentName="Dual System Dashboard (Real Data)">
                      <LazyDualSystemDashboard realData={realDataEnabled} />
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
              
              {/* ========== ADMINISTRATION ROUTES WITH REAL DATA ========== */}
              
              {/* Company Structure Manager Routes with Real Data */}
              <Route 
                path="/admin/companies" 
                element={
                  <ProtectedRoute permission="canManageCompanies">
                    <LazyWrapper componentName="Company Structure Manager (Real Data)">
                      <LazyCompanyStructureManager showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin/company-structure" 
                element={
                  <ProtectedRoute permission="canManageCompanies">
                    <LazyWrapper componentName="Company Structure Manager (Real Data)">
                      <LazyCompanyStructureManager showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* Team Management Routes with Real Data */}
              <Route 
                path="/team-management" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Team Management (Real Data)">
                      <LazyTeamManagement showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin/team" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Team Management (Real Data)">
                      <LazyTeamManagement showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Category Management Route with Real Data */}
              <Route 
                path="/admin/categories" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Category Management (Real Data)">
                      <LazyCategoryManagementDashboard showNotification={showNotification} realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

             {/* Smart Product Sync Dashboard with Lazy Loading */}
              <Route 
                path="/admin/product-sync" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Smart Product Sync Dashboard">
                      <LazySmartProductSyncDashboard />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* ========== IMAGE GENERATION DASHBOARD ROUTES ========== */}
              
              {/* Image Generation Dashboard Route with Real Data - PRIMARY ROUTE */}
              <Route 
                path="/admin/image-generation" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Image Generation Dashboard (Real Data)">
                      <LazyImageGenerationDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Alternative route for direct access */}
              <Route 
                path="/image-generation" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Image Generation Dashboard (Real Data)">
                      <LazyImageGenerationDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* MCP-specific image generation route */}
              <Route 
                path="/mcp/image-generation" 
                element={
                  <ProtectedRoute permission="canViewAI">
                    <LazyWrapper componentName="Image Generation Dashboard (Real Data)">
                      <LazyImageGenerationDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* ========== MANUAL IMAGE UPLOAD ROUTES - NEW ========== */}
              
              {/* Manual Image Upload Route - PRIMARY ROUTE */}
              <Route 
                path="/admin/manual-image-upload" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Manual Image Upload">
                      <LazyManualImageUpload realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* Alternative manual upload routes */}
              <Route 
                path="/manual-image-upload" 
                element={
                  <ProtectedRoute permission="canManageUsers">
                    <LazyWrapper componentName="Manual Image Upload">
                      <LazyManualImageUpload realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* MCP-specific manual upload route */}
              <Route 
                path="/mcp/manual-image-upload" 
                element={
                  <ProtectedRoute permission="canViewAI">
                    <LazyWrapper componentName="Manual Image Upload">
                      <LazyManualImageUpload realData={realDataEnabled} />
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
                      title="System Settings (Real Data)" 
                      description="Configure system preferences, integrations, and global settings with real data support" 
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
                      title="System Settings (Real Data)" 
                      description="Configure system preferences, integrations, and global settings with real data support" 
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
                      title="Activity Logs (Real Data)" 
                      description="Comprehensive audit trail and team activity monitoring with real-time data" 
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
                      title="Activity Logs (Real Data)" 
                      description="Comprehensive audit trail and team activity monitoring with real-time data" 
                      icon={Activity}
                    />
                  </ProtectedRoute>
                } 
              />
              
              {/* Setup Ecommerce */}
              <Route 
                path="/setup-ecommerce" 
                element={<EcommerceSetup />} 
              />
              
              {/* Product Sync Dashboard with Real Data */}
              <Route path="/sync-dashboard" element={<ProductSyncDashboard realData={realDataEnabled} />} />

              {/* CORS-Safe Product Sync Test with Real Data */}
              <Route path="/cors-safe-sync-test" element={<CORSSafeSyncTest realData={realDataEnabled} />} />

              {/* Legacy route redirects */}
              <Route 
                path="/users" 
                element={<Navigate to="/team-management" replace />}
              />
            </Route>

            {/* ========== ROOT ROUTE WITH PROFESSIONAL LANDING PAGE AND REAL DATA ========== */}
            
            {/* Professional Landing Page for www.higgsflow.com with Real Data Analytics */}
            <Route 
              path="/" 
              element={
                user ? (
                  // Logged in users get redirected to appropriate dashboard
                  user.email && (user.email.includes('higgsflow.com') || user.email.includes('admin')) ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/business/dashboard" replace />
                  )
                ) : (
                  // Anonymous users see the professional landing page with real data analytics
                  <PublicRoute>
                    <LazyWrapper componentName="HiggsFlow Landing Page (Real Data)">
                      <LazyHiggsFlowLandingPage realData={realDataEnabled} />
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
                  <LazyWrapper componentName="HiggsFlow Landing Page (Real Data)">
                    <LazyHiggsFlowLandingPage realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />

            {/* ========== LEGACY REDIRECTS ========== */}
            
            {/* Redirect old admin routes */}
            <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
            
            {/* Analytics route redirects */}
            <Route path="/reports" element={<Navigate to="/analytics" replace />} />
            <Route path="/bi" element={<Navigate to="/analytics" replace />} />
            <Route path="/business-analytics" element={<Navigate to="/analytics" replace />} />
            <Route path="/phase-2b" element={<Navigate to="/analytics" replace />} />
            
            {/* Catch all - smart redirect based on authentication */}
            <Route 
              path="*" 
              element={
                user ? (
                  user.email && (user.email.includes('higgsflow.com') || user.email.includes('admin')) ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/business/dashboard" replace />
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
          
          {/* Real Data Status Indicator */}
          {analyticsInitialized && import.meta.env.DEV && (
            <div className="fixed bottom-20 right-4 z-50 space-y-2">
              <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                Phase 2B Analytics Active
              </div>
              {realDataEnabled && (
                <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                  Real Data Integration Active
                </div>
              )}
              <div className="bg-purple-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                Business Registration Active
              </div>
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
              
              {/* Real Data Analytics Debug Panel */}
              <button
                onClick={() => console.log('HiggsFlow Real Data Analytics Status:', { 
                  analytics: higgsFlowAnalytics, 
                  dataSource: dataSource,
                  isRealTimeActive: isRealTimeActive
                })}
                className="fixed bottom-4 left-32 bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 z-50 shadow-lg transition-colors"
                title="Check Real Data Analytics Status"
              >
                Real Data Debug
              </button>
              
              {/* Quick Analytics Access */}
              <button
                onClick={() => window.location.href = '/analytics'}
                className="fixed bottom-4 left-52 bg-purple-600 text-white text-xs px-3 py-1 rounded-full hover:bg-purple-700 z-50 shadow-lg transition-colors"
                title="Open Real Data Analytics Dashboard"
              >
                Phase 2B Real Data
              </button>
              
              {/* Smart Catalog Test Button */}
              <button
                onClick={() => window.location.href = '/catalog'}
                className="fixed bottom-4 left-72 bg-green-600 text-white text-xs px-3 py-1 rounded-full hover:bg-green-700 z-50 shadow-lg transition-colors"
                title="Test Smart Catalog with Real Data"
              >
                Smart Catalog
              </button>
              
              {/* Business Registration Test Button */}
              <button
                onClick={() => window.location.href = '/business/register'}
                className="fixed bottom-4 left-96 bg-orange-600 text-white text-xs px-3 py-1 rounded-full hover:bg-orange-700 z-50 shadow-lg transition-colors"
                title="Test Business Registration System"
              >
                Business Registration
              </button>

              {/* Image Generation Dashboard Test Button */}
              <button
                onClick={() => window.location.href = '/admin/image-generation'}
                className="fixed bottom-16 left-4 bg-pink-600 text-white text-xs px-3 py-1 rounded-full hover:bg-pink-700 z-50 shadow-lg transition-colors"
                title="Test Image Generation Dashboard"
              >
                Image Generation
              </button>

              {/* NEW: Manual Image Upload Test Button */}
              <button
                onClick={() => window.location.href = '/admin/manual-image-upload'}
                className="fixed bottom-16 left-32 bg-teal-600 text-white text-xs px-3 py-1 rounded-full hover:bg-teal-700 z-50 shadow-lg transition-colors"
                title="Test Manual Image Upload"
              >
                Manual Upload
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
