import React, { useState, useEffect } from 'react';
import { ArrowUp, ChevronRight, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Header from './Header';
import Navigation from './Navigation';

const Layout = ({ children, activeTab, setActiveTab, showNotification }) => {
  const { user } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll events for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageTitle = (tab) => {
    const titles = {
      dashboard: 'Dashboard',
      suppliers: 'Suppliers',
      products: 'Products',
      'purchase-orders': 'Purchase Orders',
      import: 'Quick Import',
      users: 'User Management'
    };
    return titles[tab] || 'Dashboard';
  };

  const getBreadcrumbs = (tab) => {
    const breadcrumbs = {
      dashboard: ['Dashboard'],
      suppliers: ['Dashboard', 'Suppliers'],
      products: ['Dashboard', 'Products'],
      'purchase-orders': ['Dashboard', 'Purchase Orders'],
      import: ['Dashboard', 'Quick Import'],
      users: ['Dashboard', 'User Management']
    };
    return breadcrumbs[tab] || ['Dashboard'];
  };

  const handleMenuToggle = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowMobileMenu(false); // Close mobile menu when tab changes
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on tab change
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 relative">
      {/* Header */}
      <Header 
        user={user}
        onMenuToggle={handleMenuToggle}
        showNotification={showNotification}
      />

      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showMobileMenu={showMobileMenu}
        onMenuClose={() => setShowMobileMenu(false)}
      />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Breadcrumb and Page Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Home size={16} />
              {getBreadcrumbs(activeTab).map((crumb, index) => (
                <span key={crumb} className="flex items-center gap-2">
                  {index > 0 && <ChevronRight size={14} />}
                  <span className={index === getBreadcrumbs(activeTab).length - 1 ? 
                    'text-blue-600 font-medium' : ''}>
                    {crumb}
                  </span>
                </span>
              ))}
            </nav>
            
            {/* Page Title */}
            <h1 className="text-2xl font-bold text-gray-900">{getPageTitle(activeTab)}</h1>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 lg:p-8 min-h-[70vh]">
            {children}
          </div>
        </div>

        {/* Scroll to Top Button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 z-40 group"
          >
            <ArrowUp size={20} className="mx-auto group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Background Decoration */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">S</span>
              </div>
              <span className="text-sm text-gray-600">© 2024 Supplier Management System. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setShowMobileMenu(false)}
        />
      )}
    </div>
  );
};

export default Layout;
