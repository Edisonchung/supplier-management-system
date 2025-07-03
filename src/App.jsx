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
import Notification from './components/common/Notification';
import { usePermissions } from './hooks/usePermissions';

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

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  // Define routes with component paths
  const routes = [
    {
      path: '/',
      element: <Dashboard />,
      permission: 'canViewDashboard'
    },
    {
      path: '/suppliers',
      element: <Suppliers showNotification={showNotification} />,
      permission: 'canViewSuppliers'
    },
    {
      path: '/products',
      element: <Products showNotification={showNotification} />,
      permission: 'canViewProducts'
    },
    {
      path: '/proforma-invoices',
      element: <ProformaInvoices showNotification={showNotification} />,
      permission: 'canViewPI'
    },
    {
      path: '/purchase-orders',
      element: <PlaceholderComponent 
        title="Purchase Orders" 
        description="PO management - Feature coming soon" 
      />,
      permission: 'canViewPurchaseOrders'
    },
    {
      path: '/invoices',
      element: <PlaceholderComponent 
        title="Client Invoices" 
        description="Invoice management - Feature coming soon" 
      />,
      permission: 'canViewInvoices'
    },
    {
      path: '/tracking',
      element: <PlaceholderComponent 
        title="Delivery Tracking" 
        description="Track deliveries - Feature coming soon" 
      />,
      permission: 'canViewTracking'
    },
    {
      path: '/import',
      element: <PlaceholderComponent 
        title="Quick Import" 
        description="Import data - Feature coming soon" 
      />,
      permission: 'canImportData'
    },
    {
      path: '/users',
      element: <PlaceholderComponent 
        title="User Management" 
        description="Manage users - Feature coming soon" 
      />,
      permission: 'canManageUsers'
    }
  ];

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public PI View Route - No Authentication Required */}
          <Route path="/pi/view/:shareableId" element={<PublicPIView />} />
          
          {/* Login Route */}
          <Route path="/login" element={!user ? <LoginForm /> : <Navigate to="/" replace />} />
          
          {/* Protected Routes */}
          <Route element={user ? <Layout /> : <Navigate to="/login" />}>
            {routes.map(route => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute permission={route.permission}>
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}
          </Route>
          
          {/* Catch all - redirect to home or login */}
          <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        </Routes>
        
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
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
