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
import PurchaseOrders from './components/purchase-orders/PurchaseOrders';
import ClientInvoices from './components/invoices/ClientInvoices';
import DeliveryTracking from './components/tracking/DeliveryTracking';
import QuickImport from './components/import/QuickImport';
import UserManagement from './components/users/UserManagement';
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

// Placeholder Components for features not yet implemented
const PlaceholderComponent = ({ title, description }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
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
                <Suppliers showNotification={showNotification} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/products" 
            element={
              <ProtectedRoute permission="canViewProducts">
                <Products showNotification={showNotification} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/proforma-invoices" 
            element={
              <ProtectedRoute permission="canViewPI">
                <ProformaInvoices showNotification={showNotification} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/purchase-orders" 
            element={
              <ProtectedRoute permission="canViewPurchaseOrders">
                <PurchaseOrders showNotification={showNotification} />
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
                <QuickImport showNotification={showNotification} />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/users" 
            element={
              <ProtectedRoute permission="canManageUsers">
                <UserManagement showNotification={showNotification} />
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
