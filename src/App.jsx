import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { usePermissions } from './hooks/usePermissions';
import Layout from './components/common/Layout';
import LoginForm from './components/auth/LoginForm';
import Dashboard from './components/dashboard/Dashboard';
import Notification from './components/common/Notification';
import FirestoreTest from './components/FirestoreTest';
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  Upload, 
  Users,
  Eye,
  Shield 
} from 'lucide-react';

// Lazy load components for better performance
const Suppliers = lazy(() => import('./components/suppliers/Suppliers'));
const Products = lazy(() => import('./components/products/Products'));
const ProformaInvoices = lazy(() => import('./components/proforma-invoices/ProformaInvoices'));
const PublicPIView = lazy(() => import('./components/proforma-invoices/PublicPIView'));
const PurchaseOrders = lazy(() => import('./components/purchase-orders/PurchaseOrders'));
const QuickImport = lazy(() => import('./components/import/QuickImport'));
const UserManagement = lazy(() => import('./components/users/UserManagement'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
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
  const permissions = usePermissions();
  
  if (permission && !permissions[permission]) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page</p>
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
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

function AppContent() {
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);
  const [showFirestoreTest, setShowFirestoreTest] = useState(true);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public PI View Route - No Authentication Required */}
          <Route path="/pi/view/:shareableId" element={
            <Suspense fallback={<LoadingSpinner />}>
              <PublicPIView />
            </Suspense>
          } />
          
          {/* Login Route */}
          <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/" replace />} />
          
          {/* Protected Routes with Layout */}
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            {/* Dashboard */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute permission="canViewDashboard">
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Suppliers */}
            <Route 
              path="/suppliers" 
              element={
                <ProtectedRoute permission="canViewSuppliers">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Suppliers showNotification={showNotification} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Products */}
            <Route 
              path="/products" 
              element={
                <ProtectedRoute permission="canViewProducts">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Products showNotification={showNotification} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Proforma Invoices */}
            <Route 
              path="/proforma-invoices" 
              element={
                <ProtectedRoute permission="canViewProformaInvoices">
                  <Suspense fallback={<LoadingSpinner />}>
                    <ProformaInvoices showNotification={showNotification} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Purchase Orders - Placeholder */}
            <Route 
              path="/purchase-orders" 
              element={
                <ProtectedRoute permission="canViewPurchaseOrders">
                  <Suspense fallback={<LoadingSpinner />}>
                    <PurchaseOrders showNotification={showNotification} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* Quick Import - Placeholder */}
            <Route 
              path="/import" 
              element={
                <ProtectedRoute permission="canImport">
                  <Suspense fallback={<LoadingSpinner />}>
                    <QuickImport showNotification={showNotification} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
            
            {/* User Management - Placeholder */}
            <Route 
              path="/users" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <Suspense fallback={<LoadingSpinner />}>
                    <UserManagement showNotification={showNotification} />
                  </Suspense>
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </Router>
      
      {/* Notification Component */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
      
      {/* Firestore Test Component - Only in development when user is logged in */}
      {user && showFirestoreTest && process.env.NODE_ENV === 'development' && (
        <FirestoreTest />
      )}
      
      {/* Toggle button for Firestore Test (only in development) */}
      {user && process.env.NODE_ENV === 'development' && (
        <button
          onClick={() => setShowFirestoreTest(!showFirestoreTest)}
          className="fixed bottom-4 left-4 bg-gray-800 text-white text-xs px-3 py-1 rounded-full hover:bg-gray-700 z-50"
        >
          {showFirestoreTest ? 'Hide' : 'Show'} Firestore Test
        </button>
      )}
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
