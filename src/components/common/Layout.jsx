import { useState } from 'react';
import Header from './Header';
import Navigation from './Navigation';

const Layout = ({ children, activeTab, setActiveTab, showNotification }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onMenuToggle={() => setMobileMenuOpen(true)} 
        showNotification={showNotification}
      />
      
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
};

export default Layout;
