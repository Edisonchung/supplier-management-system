// src/App.jsx - OPTIMIZED VERSION
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/common/Layout';
import PublicPIView from './components/procurement/PublicPIView';
import Notification from './components/common/Notification';
import { usePermissions } from './hooks/usePermissions';
import { Truck, Upload, Users, Shield, Settings, Activity, Brain } from 'lucide-react';
import FirestoreHealthCheck from './components/FirestoreHealthCheck';
import FirestoreTest from './components/FirestoreTest';

// Import lazy components
import { 
  LazyDashboard, 
  LazySuppliers, 
  LazyProducts, 
  LazyProformaInvoices,
  LazyPurchaseOrders,
  LazyClientInvoices,
  LazyQuickImport,
  LazyUserManagement,
  LazyWrapper 
} from './components/LazyComponents';

// Lazy load additional components that exist
import { lazy } from 'react';
const LazySourcingDashboard = lazy(() => import('./components/sourcing/SourcingDashboard'));
const LazySupplierMatchingPage = lazy(() => import('./components/supplier-matching/SupplierMatchingPage'));
const LazyTeamManagement = lazy(() => import('./components/team/TeamManagement'));

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
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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

// Protected Route Component
const ProtectedRoute = ({ children, permission }) => {
  const { user, loading } = useAuth();
  const permissions = usePermissions();
  
  // Don't redirect while loading
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
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page</p>
          <p className="text-sm text-gray-500 mt-2">Contact your administrator for access</p>
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
      {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      <div className="mt-6 text-sm text-gray-500">
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

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading HiggsFlow...</p>
          <p className="mt-2 text-sm text-gray-500">Accelerating Supply Chain</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {/* React Hot Toast Toaster */}
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
            background: '#363636',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
            style: {
              background: '#10b981',
              color: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
          loading: {
            duration: Infinity,
            style: {
              background: '#3b82f6',
              color: '#fff',
            },
          },
        }}
      />
      
      <Router>
        <Routes>
          {/* Public PI View Route - No Authentication Required */}
          <Route path="/pi/view/:shareableId" element={<PublicPIView />} />
          
          {/* Login Route */}
          <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/" replace />} />
          
          {/* Protected Routes with Layout */}
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            {/* Dashboard - LAZY LOADED */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute permission="canViewDashboard">
                  <LazyWrapper>
                    <LazyDashboard />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Core Management Routes - LAZY LOADED */}
            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute permission="canViewSuppliers">
                  <LazyWrapper>
                    <LazySuppliers showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/products" 
              element={
                <ProtectedRoute permission="canViewProducts">
                  <LazyWrapper>
                    <LazyProducts showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Operations Routes - LAZY LOADED */}
            <Route 
              path="/sourcing" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper>
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
            
            {/* Procurement Routes - LAZY LOADED */}
            <Route 
              path="/proforma-invoices" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper>
                    <LazyProformaInvoices showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/purchase-orders" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper>
                    <LazyPurchaseOrders showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />

            {/* Supplier Matching Page - LAZY LOADED */}
            <Route 
              path="/purchase-orders/:poId/supplier-matching" 
              element={
                <ProtectedRoute permission="canViewOrders">
                  <LazyWrapper>
                    <LazySupplierMatchingPage />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Business Routes - LAZY LOADED */}
            <Route 
              path="/client-invoices" 
              element={
                <ProtectedRoute permission="canViewInvoices">
                  <LazyWrapper>
                    <LazyClientInvoices showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/delivery-tracking" 
              element={
                <ProtectedRoute permission="canViewDeliveries">
                  <PlaceholderComponent 
                    title="Delivery Tracking" 
                    description="Real-time shipment tracking and delivery status monitoring" 
                    icon={Truck}
                  />
                </ProtectedRoute>
              } 
            />
            
            {/* Tools Routes - LAZY LOADED */}
            <Route 
              path="/quick-import" 
              element={
                <ProtectedRoute permission="canImportData">
                  <LazyWrapper>
                    <LazyQuickImport showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
            
            {/* Administration Routes - LAZY LOADED */}
            <Route 
              path="/team-management" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <LazyWrapper>
                    <LazyTeamManagement showNotification={showNotification} />
                  </LazyWrapper>
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
            
            {/* Legacy Routes (keeping for compatibility) - LAZY LOADED */}
            <Route 
              path="/users" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <LazyWrapper>
                    <LazyUserManagement showNotification={showNotification} />
                  </LazyWrapper>
                </ProtectedRoute>
              } 
            />
          </Route>
          
          {/* Catch all - redirect to home or login */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
        
        {/* Global Notification */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
        
        {/* Development Tools - Only show in development mode */}
        {user && import.meta.env.DEV && (
          <>
            {/* Firestore Test Component */}
            {showFirestoreTest && <FirestoreTest />}
            
            {/* Toggle button for Firestore Test */}
            <button
              onClick={() => setShowFirestoreTest(!showFirestoreTest)}
              className="fixed bottom-4 left-4 bg-gray-800 text-white text-xs px-3 py-1 rounded-full hover:bg-gray-700 z-50 shadow-lg transition-colors"
              title={`${showFirestoreTest ? 'Hide' : 'Show'} Firestore Test Panel`}
            >
              {showFirestoreTest ? 'Hide' : 'Show'} Firestore Test
            </button>
          </>
        )}
        
        {/* Firestore Health Check - Always show when user is logged in */}
        {user && <FirestoreHealthCheck />}
      </Router>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
