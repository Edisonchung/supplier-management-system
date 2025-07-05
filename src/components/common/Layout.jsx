// src/components/common/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Navigation from './Navigation';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Check navigation collapsed state from localStorage
  useEffect(() => {
    const checkNavState = () => {
      const navCollapsed = localStorage.getItem('navCollapsed') === 'true';
      setIsNavCollapsed(navCollapsed);
    };

    // Check initially
    checkNavState();

    // Listen for storage changes (when nav is toggled)
    window.addEventListener('storage', checkNavState);
    
    // Also listen for custom event for same-tab updates
    const handleNavToggle = () => checkNavState();
    window.addEventListener('navToggled', handleNavToggle);

    return () => {
      window.removeEventListener('storage', checkNavState);
      window.removeEventListener('navToggled', handleNavToggle);
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
          flex-1 p-6 transition-all duration-300
          ${isNavCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        `}>
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
