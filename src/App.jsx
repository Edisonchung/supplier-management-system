// src/App.jsx - PHASE 2B ENHANCED VERSION - Real Data Integration
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

// 🚀 Phase 2B Analytics Service with Real Data
import { higgsFlowAnalytics, useHiggsFlowAnalytics } from './services/analyticsService';

// 🚀 Using existing Enhanced E-commerce services from your codebase
// EnhancedEcommerceAPIService and EnhancedEcommerceFirebaseService handle catalog functionality

import './App.css';

// Import lazy components - EXISTING IMPORTS
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

// Phase 2A E-commerce Components
const LazyPublicCatalog = lazy(() => import('./components/ecommerce/PublicCatalog'));
const LazyProductDetailPage = lazy(() => import('./components/ecommerce/ProductDetailPage'));
const LazyFactoryRegistration = lazy(() => import('./components/ecommerce/FactoryRegistration'));
const LazyShoppingCart = lazy(() => import('./components/ecommerce/ShoppingCart'));
const LazyQuoteRequest = lazy(() => import('./components/ecommerce/QuoteRequest'));
const LazyFactoryLogin = lazy(() => import('./components/ecommerce/FactoryLogin'));
const LazyFactoryDashboard = lazy(() => import('./components/ecommerce/FactoryDashboard'));

// 🚀 Phase 2B Advanced Analytics Components with Real Data
const LazySmartPublicCatalog = lazy(() => import('./components/SmartPublicCatalog'));
const LazyAnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

// 🚀 HiggsFlow Analytics Phase 2B Dashboard with Real Data Integration
const LazyHiggsFlowAnalyticsDashboard = lazy(() => import('./components/analytics/HiggsFlowAnalyticsDashboard'));

// 🚀 Professional Landing Page Component
const LazyHiggsFlowLandingPage = lazy(() => import('./components/HiggsFlowLandingPage'));

// 🚀 Real Data Migration Dashboard (using existing FirestoreMigrationPanel)
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
    
    // 🚀 Track errors in analytics
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

// 🚀 Enhanced Public Route Component with Real Data Analytics
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
        console.log('📊 Public route real data analytics tracked');
      } catch (error) {
        console.error('⚠️ Error tracking public route:', error);
      }
    };

    trackPublicAccess();
  }, [analytics]);

  return children;
};

// Factory Route Component (for authenticated factory users) - Enhanced with Real Data
const FactoryRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const analytics = useHiggsFlowAnalytics();
  
  useEffect(() => {
    if (user) {
      // Track factory user session with real data integration
      const trackFactorySession = async () => {
        try {
          const sessionData = {
            userId: user.uid,
            email: user.email,
            userAgent: navigator.userAgent,
            entryPoint: 'factory_dashboard',
            ipAddress: await getClientIP(),
            timestamp: new Date().toISOString(),
            dataSource: 'real',
            userType: 'factory',
            // Enhanced factory tracking uses existing Enhanced E-commerce services
            // Your EnhancedEcommerceAPIService already handles factory profiles
            lastActivity: new Date().toISOString()
          };

          await analytics.trackSession(sessionData);
          console.log('🏭 Factory user real data analytics tracked');
        } catch (error) {
          console.error('⚠️ Error tracking factory session:', error);
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

// 🚀 Enhanced Protected Route Component with Real Data Analytics
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
            // 🚀 Enhanced admin tracking
            permissionLevel: Object.keys(permissions).filter(p => permissions[p]).length,
            lastActivity: new Date().toISOString()
          };

          await analytics.trackSession(sessionData);
          console.log('👨‍💼 Admin user real data analytics tracked');
        } catch (error) {
          console.error('⚠️ Error tracking admin session:', error);
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

function AppContent() {
  const { user, loading } = useAuth();
  
  // Add fallback for useUnifiedData in case context is not available
  let dataSource, isRealTimeActive, migrationStatus;
  try {
    const unifiedData = useUnifiedData();
    dataSource = unifiedData.dataSource;
    isRealTimeActive = unifiedData.isRealTimeActive;
    migrationStatus = unifiedData.migrationStatus;
  } catch (error) {
    console.warn('UnifiedDataContext not available, using fallback values:', error);
    dataSource = 'localStorage';
    isRealTimeActive = false;
    migrationStatus = { inProgress: false };
  }
  
  const [notification, setNotification] = useState(null);
  const [showFirestoreTest, setShowFirestoreTest] = useState(true);
  const [analyticsInitialized, setAnalyticsInitialized] = useState(false);
  
  // Real data status based on existing UnifiedDataContext
  const realDataEnabled = dataSource === 'firestore';

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // 🚀 Initialize Real Data Services and Analytics
  useEffect(() => {
    const initializeRealDataServices = async () => {
      if (!analyticsInitialized) {
        try {
          console.log('🚀 Initializing HiggsFlow Phase 2B Real Data Services...');
          
          // Initialize SmartCatalogAPIService (when available)
          // await SmartCatalogAPIService.initialize();
          
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
            sessionData.userType = user.email?.includes('higgsflow.com') ? 'admin' : 'factory';
          }

          await higgsFlowAnalytics.trackUserSession(sessionData);
          setAnalyticsInitialized(true);
          
          console.log(`✅ Analytics initialized - Data Source: ${dataSource}`);
        } catch (error) {
          console.error('⚠️ Error initializing analytics:', error);
        }
      }
    };

    initializeRealDataServices();
  }, [user, analyticsInitialized, dataSource]); // Add dataSource dependency

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
              ✅ Real Data Services Active
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
            
            {/* 🚀 Smart Catalog with Real Data AI Analytics - DEFAULT PUBLIC ROUTE */}
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
            
            {/* 🚀 Real Data Migration Dashboard - ADMIN ONLY */}
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
            
            {/* ========== FACTORY ROUTES WITH REAL DATA ========== */}
            
            {/* Factory registration - PUBLIC ACCESS */}
            <Route 
              path="/factory/register" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Factory Registration">
                    <LazyFactoryRegistration realData={realDataEnabled} />
                  </LazyWrapper>
                </PublicRoute>
              } 
            />
            
            {/* 🚀 NEW: Factory Registration - ALTERNATIVE PUBLIC ROUTE */}
            <Route 
              path="/factory-registration" 
              element={
                <PublicRoute>
                  <LazyWrapper componentName="Factory Registration">
                    <LazyFactoryRegistration realData={realDataEnabled} />
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
            
            {/* Factory dashboard (authenticated factories) with real data */}
            <Route 
              path="/factory/dashboard" 
              element={
                <FactoryRoute>
                  <LazyWrapper componentName="Factory Dashboard (Real Data)">
                    <LazyFactoryDashboard realData={realDataEnabled} />
                  </LazyWrapper>
                </FactoryRoute>
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
              
              {/* 🚀 HiggsFlow Analytics Phase 2B Dashboard - PRIMARY ANALYTICS ROUTE with Real Data */}
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
              
              {/* 🚀 Business Intelligence Route - SECONDARY ANALYTICS ACCESS */}
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
              
              {/* 🚀 Advanced Analytics Route - TERTIARY ANALYTICS ACCESS */}
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
              
              {/* 🚀 Real-time Insights Route */}
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
              
              {/* 🚀 Factory Dashboard - Protected Route with Real Data */}
              <Route 
                path="/factory-dashboard" 
                element={
                  <ProtectedRoute permission="canAccessFactoryDashboard">
                    <LazyWrapper componentName="Factory Dashboard (Real Data)">
                      <LazyFactoryDashboard realData={realDataEnabled} />
                    </LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              {/* 🚀 Quote Requests Management with Real Data */}
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

              {/* 🚀 Shopping Cart Management with Real Data */}
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
            
            {/* 🚀 Professional Landing Page for www.higgsflow.com with Real Data Analytics */}
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
            
            {/* 🚀 Analytics route redirects - FIXED: No duplicate /insights */}
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
          
          {/* 🚀 Real Data Status Indicator */}
          {analyticsInitialized && import.meta.env.DEV && (
            <div className="fixed bottom-20 right-4 z-50 space-y-2">
              <div className="bg-green-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                📊 Phase 2B Analytics Active
              </div>
              {realDataEnabled && (
                <div className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                  🔥 Real Data Integration Active
                </div>
              )}
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
              
              {/* 🚀 Real Data Analytics Debug Panel */}
              <button
                onClick={() => console.log('HiggsFlow Real Data Analytics Status:', { 
                  analytics: higgsFlowAnalytics, 
                  dataSource: dataSource,
                  isRealTimeActive: isRealTimeActive
                })}
                className="fixed bottom-4 left-32 bg-blue-600 text-white text-xs px-3 py-1 rounded-full hover:bg-blue-700 z-50 shadow-lg transition-colors"
                title="Check Real Data Analytics Status"
              >
                📊 Real Data Debug
              </button>
              
              {/* 🚀 Quick Analytics Access */}
              <button
                onClick={() => window.location.href = '/analytics'}
                className="fixed bottom-4 left-52 bg-purple-600 text-white text-xs px-3 py-1 rounded-full hover:bg-purple-700 z-50 shadow-lg transition-colors"
                title="Open Real Data Analytics Dashboard"
              >
                🚀 Phase 2B Real Data
              </button>
              
              {/* 🚀 Smart Catalog Test Button */}
              <button
                onClick={() => window.location.href = '/catalog'}
                className="fixed bottom-4 left-72 bg-green-600 text-white text-xs px-3 py-1 rounded-full hover:bg-green-700 z-50 shadow-lg transition-colors"
                title="Test Smart Catalog with Real Data"
              >
                🔥 Smart Catalog
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
