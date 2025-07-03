// src/components/common/Layout.jsx
import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract the current tab from the pathname
  const currentPath = location.pathname.substring(1) || 'dashboard';
  
  // Convert path to tab name (e.g., '/proforma-invoices' -> 'proforma-invoices')
  const activeTab = currentPath;

  const handleTabChange = (tab) => {
    // Convert tab to path
    const path = tab === 'dashboard' ? '/' : `/${tab}`;
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex">
        <Navigation 
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        
        <main className="flex-1 p-6 lg:ml-64">
          <div className="max-w-7xl mx-auto">
            <Outlet /> {/* This is where child routes render */}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
