// src/App.jsx
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginForm from './components/auth/LoginForm';
import Layout from './components/common/Layout';
import Dashboard from './components/dashboard/Dashboard';
import Suppliers from './components/suppliers/Suppliers';
import Products from './components/products/Products';
import PurchaseOrders from './components/purchase-orders/PurchaseOrders';
import QuickImport from './components/import/QuickImport';
import UserManagement from './components/users/UserManagement';
import Notification from './components/common/Notification';
import { initializeSampleData } from './utils/mockData';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    initializeSampleData();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm showNotification={showNotification} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'suppliers':
        return <Suppliers showNotification={showNotification} />;
      case 'products':
        return <Products showNotification={showNotification} />;
      case 'purchase-orders':
        return <PurchaseOrders showNotification={showNotification} />;
      case 'import':
        return <QuickImport showNotification={showNotification} />;
      case 'users':
        return <UserManagement showNotification={showNotification} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      showNotification={showNotification}
    >
      {renderContent()}
      
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </Layout>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
