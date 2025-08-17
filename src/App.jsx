// src/App.jsx - UPDATED VERSION - Added Phase 2A E-commerce Routes + Dark Mode Support
import React, { useState } from 'react';
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
import { Truck, Upload, Users, Shield, Settings, Activity, Brain, ShoppingCart, Building2, Eye } from 'lucide-react';
import FirestoreHealthCheck from './components/FirestoreHealthCheck';
import FirestoreTest from './components/FirestoreTest';
import { LoadingFeedbackProvider } from './components/common/LoadingFeedbackSystem';
import NavigationBlockerDebug from './components/debug/NavigationBlockerDebug';
import SampleDataTest from './components/test/SampleDataTest';
import EcommerceSetup from './components/setup/EcommerceSetup';
import ProductSyncDashboard from './components/sync/ProductSyncDashboard';
import CORSSafeSyncTest from './components/sync/CORSSafeSyncTest';

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

// 🆕 NEW: Phase 2A E-commerce Components
const LazyPublicCatalog = lazy(() => import('./components/ecommerce/PublicCatalog'));
const LazyProductDetailPage = lazy(() => import('./components/ecommerce/ProductDetailPage'));
const LazyFactoryRegistration = lazy(() => import('./components/ecommerce/FactoryRegistration'));
const LazyShoppingCart = lazy(() => import('./components/ecommerce/ShoppingCart'));
const LazyQuoteRequest = lazy(() => import('./components/ecommerce/QuoteRequest'));
const LazyFactoryLogin = lazy(() => import('./components/ecommerce/FactoryLogin'));
const LazyFactoryDashboard = lazy(() => import('./components/ecommerce/FactoryDashboard'));

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

// 🆕 NEW: Public Route Component (for e-commerce)
const PublicRoute = ({ children }) => {
  return children;
};

// 🆕 NEW: Factory Route Component (for authenticated factory users)
const FactoryRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
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

// Protected Route Component (for admin/internal users)
const ProtectedRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  const permissions = usePermissions();
  
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

function AppContent() {
  const { user, loading } = useAuth();
  const [notification, setNotification] = useState(null);
  const [showFirestoreTest, setShowFirestoreTest] = useState(true);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading HiggsFlow...</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Accelerating Supply Chain</p>
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
          {/* ========== PUBLIC E-COMMERCE ROUTES ========== */}
          
          {/* Main public catalog - HIGHEST PRIORITY */}
          <Route 
            path="/catalog" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Public Catalog">
                  <LazyPublicCatalog />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Product detail pages */}
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
          
          {/* Category browsing */}
          <Route 
            path="/category/:categorySlug" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Category Products">
                  <LazyPublicCatalog />
                </LazyWrapper>
              </PublicRoute>
            } 
          />
          
          {/* Search results */}
          <Route 
            path="/search" 
            element={
              <PublicRoute>
                <LazyWrapper componentName="Search Results">
                  <LazyPublicCatalog />
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

          {/* ========== ROOT ROUTE LOGIC ========== */}
          
          {/* Smart root routing based on user type */}
          <Route 
            path="/" 
            element={
              user ? (
                // Check if user is admin (has higgsflow.com email) or factory user
                user.email && (user.email.includes('higgsflow.com') || user.email.includes('admin')) ? (
                  <Navigate to="/admin" replace />
                ) : (
                  <Navigate to="/factory/dashboard" replace />
                )
              ) : (
                // Not logged in - show public catalog
                <PublicRoute>
                  <LazyWrapper componentName="Public Catalog">
                    <LazyPublicCatalog />
                  </LazyWrapper>
                </PublicRoute>
              )
            } 
          />

          {/* ========== LEGACY REDIRECTS ========== */}
          
          {/* Redirect old admin routes */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          
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
