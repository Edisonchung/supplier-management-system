// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/common/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Suppliers from './components/suppliers/Suppliers';
import Products from './components/products/Products';
import ProformaInvoices from './components/procurement/ProformaInvoices';
import PublicPIView from './components/procurement/PublicPIView';
import PurchaseOrders from './components/purchase-orders';
import ClientInvoices from './components/invoices/ClientInvoices';
import QuickImport from './components/import/QuickImport';
import UserManagement from './components/users/UserManagement';
import Notification from './components/common/Notification';
import { usePermissions } from './hooks/usePermissions';
import { Truck, Upload, Users } from 'lucide-react';
import FirestoreHealthCheck from './components/FirestoreHealthCheck';
import FirestoreTest from './components/FirestoreTest';
import SourcingDashboard from './components/sourcing/SourcingDashboard';


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
  const { user } = useAuth();
  const permissions = usePermissions();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permission && permissions[permission] === false) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
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
          <Route path="/pi/view/:shareableId" element={<PublicPIView />} />
          
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
                  <Suppliers showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
            
            {/* Products */}
            <Route 
              path="/products" 
              element={
                <ProtectedRoute permission="canViewProducts">
                  <Products showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
            
            {/* Proforma Invoices */}
            <Route 
              path="/proforma-invoices" 
              element={
                <ProtectedRoute permission="canViewPI">
                  <ProformaInvoices showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
            
            {/* Purchase Orders */}
            <Route 
              path="/purchase-orders" 
              element={
                <ProtectedRoute permission="canViewPurchaseOrders">
                  <PurchaseOrders showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
            
            {/* Client Invoices */}
            <Route 
              path="/invoices" 
              element={
                <ProtectedRoute permission="canViewInvoices">
                  <ClientInvoices showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
            
            {/* Delivery Tracking - Placeholder */}
            <Route 
              path="/tracking" 
              element={
                <ProtectedRoute permission="canViewTracking">
                  <PlaceholderComponent 
                    title="Delivery Tracking" 
                    description="Track deliveries and shipment status - Feature coming soon" 
                    icon={Truck}
                  />
                </ProtectedRoute>
              } 
            />
            
            {/* Quick Import */}
            <Route 
              path="/import" 
              element={
                <ProtectedRoute permission="canImportData">
                  <QuickImport showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
            
            {/* User Management */}
            <Route 
              path="/users" 
              element={
                <ProtectedRoute permission="canManageUsers">
                  <UserManagement showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />
          </Route>
            <Route 
              path="/sourcing" 
              element={
                <ProtectedRoute requiredPermission="canViewOrders">
                  <SourcingDashboard showNotification={showNotification} />
                </ProtectedRoute>
              } 
            />

          
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
        
        {/* Firestore Test Component - Only in development when user is logged in */}
        {user && showFirestoreTest && import.meta.env.DEV && (
          <FirestoreTest />
        )}
        
        {/* Toggle button for Firestore Test (only in development) */}
        {user && import.meta.env.DEV && (
          <button
            onClick={() => setShowFirestoreTest(!showFirestoreTest)}
            className="fixed bottom-4 left-4 bg-gray-800 text-white text-xs px-3 py-1 rounded-full hover:bg-gray-700 z-50 shadow-lg"
            title={`${showFirestoreTest ? 'Hide' : 'Show'} Firestore Test Panel`}
          >
            {showFirestoreTest ? 'Hide' : 'Show'} Firestore Test
          </button>
        )}
        {console.log('Dev mode:', import.meta.env.DEV, 'User:', !!user)}
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
