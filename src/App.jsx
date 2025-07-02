// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/common/Layout';
import Dashboard from './components/dashboard/Dashboard';
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

// Lazy load components with fallbacks
const LazyComponent = ({ path, fallbackTitle, fallbackDescription }) => {
  const [Component, setComponent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    // Try to dynamically import the component
    import(path)
      .then(module => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch(err => {
        console.log(`Component not found at ${path}, showing placeholder`);
        setError(true);
        setLoading(false);
      });
  }, [path]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !Component) {
    return <PlaceholderComponent title={fallbackTitle} description={fallbackDescription} />;
  }

  return <Component />;
};

function AppContent() {
  const { user } = useAuth();
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  if (!user) {
    return <LoginForm />;
  }

  // Define routes with component paths
  const routes = [
    {
      path: '/',
      element: <Dashboard />,
      permission: 'canViewDashboard'
    },
    {
      path: '/suppliers',
      element: <PlaceholderComponent 
        title="Suppliers" 
        description="Supplier management - Feature coming soon" 
      />,
      permission: 'canViewSuppliers'
    },
    {
      path: '/products',
      element: <PlaceholderComponent 
        title="Products" 
        description="Product catalog - Feature coming soon" 
      />,
      permission: 'canViewProducts'
    },
    {
      path: '/proforma-invoices',
      element: <PlaceholderComponent 
        title="Proforma Invoices" 
        description="PI management - Feature coming soon" 
      />,
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
        <Layout>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            
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
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {notification && (
            <Notification
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </Layout>
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
