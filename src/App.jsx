// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/common/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Notification from './components/common/Notification';
import { usePermissions } from './hooks/usePermissions';

// Protected Route Component
const ProtectedRoute = ({ children, permission }) => {
  const { user } = useAuth();
  const permissions = usePermissions();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (permission && !permissions[permission]) {
    return <Navigate to="/" replace />;
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

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/login" element={<Navigate to="/" replace />} />
          
          <Route 
            path="/" 
            element={
              <ProtectedRoute permission="canViewDashboard">
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/suppliers" 
            element={
              <ProtectedRoute permission="canViewSuppliers">
                <PlaceholderComponent 
                  title="Suppliers" 
                  description="Supplier management - Create suppliers components to activate this page" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/products" 
            element={
              <ProtectedRoute permission="canViewProducts">
                <PlaceholderComponent 
                  title="Products" 
                  description="Product catalog - Create products components to activate this page" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/proforma-invoices" 
            element={
              <ProtectedRoute permission="canViewPI">
                <PlaceholderComponent 
                  title="Proforma Invoices" 
                  description="PI management - Create ProformaInvoices component to activate this page" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/purchase-orders" 
            element={
              <ProtectedRoute permission="canViewPurchaseOrders">
                <PlaceholderComponent 
                  title="Purchase Orders" 
                  description="Purchase order management coming soon" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/invoices" 
            element={
              <ProtectedRoute permission="canViewInvoices">
                <PlaceholderComponent 
                  title="Client Invoices" 
                  description="Client invoice management coming soon" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/tracking" 
            element={
              <ProtectedRoute permission="canViewTracking">
                <PlaceholderComponent 
                  title="Delivery Tracking" 
                  description="Track your deliveries in real-time" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/import" 
            element={
              <ProtectedRoute permission="canImportData">
                <PlaceholderComponent 
                  title="Quick Import" 
                  description="Bulk import functionality coming soon" 
                />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/users" 
            element={
              <ProtectedRoute permission="canManageUsers">
                <PlaceholderComponent 
                  title="User Management" 
                  description="User management coming soon" 
                />
              </ProtectedRoute>
            } 
          />
          
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
