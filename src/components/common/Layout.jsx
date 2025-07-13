// src/components/common/Layout.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const location = useLocation(); // Add this to track route changes

  // Force re-render when location changes
  const [renderKey, setRenderKey] = useState(0);

  // Track location changes and force re-render
  useEffect(() => {
    console.log('🔄 Layout - Route changed to:', location.pathname);
    // Force a re-render of the outlet
    setRenderKey(prev => prev + 1);
  }, [location.pathname]);

  // Check navigation collapsed state from localStorage
  useEffect(() => {
    const checkNavState = () => {
      const navCollapsed = localStorage.getItem('navigationCollapsed') === 'true';
      setIsNavCollapsed(navCollapsed);
    };

    checkNavState();

    // Listen for storage changes
    const handleStorageChange = () => checkNavState();
    const handleNavToggle = () => checkNavState();
    const handleNavCollapse = (event) => {
      setIsNavCollapsed(event.detail.collapsed);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('navToggled', handleNavToggle);
    window.addEventListener('navigationCollapsed', handleNavCollapse);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('navToggled', handleNavToggle);
      window.removeEventListener('navigationCollapsed', handleNavCollapse);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        toggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      <div className="flex">
        <Navigation 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        
        <main className={`
          flex-1 p-6 pt-24 transition-all duration-300
          ${isNavCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}>
          <div className="max-w-7xl mx-auto">
            {/* Force Outlet to re-render with key prop */}
            <div key={renderKey}>
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
