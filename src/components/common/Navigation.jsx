import { BarChart3, Building2, Package, FileText, Upload, Users, X, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navigation = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { user } = useAuth();

  const tabs = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: BarChart3, 
      roles: ['admin', 'manager', 'employee', 'viewer'],
      description: 'Overview & Analytics',
      color: 'text-blue-600'
    },
    { 
      id: 'suppliers', 
      label: 'Suppliers', 
      icon: Building2, 
      roles: ['admin', 'manager'],
      description: 'Supplier Management',
      color: 'text-green-600'
    },
    { 
      id: 'products', 
      label: 'Products', 
      icon: Package, 
      roles: ['admin', 'manager', 'employee', 'viewer'],
      description: 'Product Catalog',
      color: 'text-purple-600'
    },
    { 
      id: 'purchase-orders', 
      label: 'Purchase Orders', 
      icon: FileText, 
      roles: ['admin', 'manager'],
      description: 'Order Management',
      color: 'text-orange-600'
    },
    { 
      id: 'import', 
      label: 'Quick Import', 
      icon: Upload, 
      roles: ['admin', 'manager', 'employee'],
      description: 'Bulk Data Import',
      color: 'text-indigo-600'
    },
    { 
      id: 'users', 
      label: 'User Management', 
      icon: Users, 
      roles: ['admin'],
      description: 'User Administration',
      color: 'text-red-600'
    }
  ];

  const allowedTabs = tabs.filter(tab => tab.roles.includes(user.role));

  const getTabCount = (tabId) => {
    // Mock counts for demonstration
    const counts = {
      'suppliers': 12,
      'products': 247,
      'purchase-orders': 8,
      'users': 4
    };
    return counts[tabId];
  };

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:block bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
            {allowedTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = getTabCount(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap group hover:bg-gray-50 rounded-t-lg ${
                    isActive
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon 
                    size={20} 
                    className={`${isActive ? tab.color : 'group-hover:scale-110'} transition-transform`} 
                  />
                  <div className="flex flex-col items-start">
                    <span>{tab.label}</span>
                    {count && (
                      <span className="text-xs text-gray-400">{count} items</span>
                    )}
                  </div>
                  {count && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
          
          <div className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-2xl">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">Navigation</h2>
                    <p className="text-sm text-gray-600">Quick Access Menu</p>
                  </div>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
            
            <nav className="p-4 space-y-2">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const count = getTabCount(tab.id);
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-md border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:shadow-md'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive 
                        ? 'bg-white shadow-sm' 
                        : 'bg-gray-100 group-hover:bg-white group-hover:shadow-sm'
                    } transition-all`}>
                      <Icon 
                        size={20} 
                        className={isActive ? tab.color : 'text-gray-600 group-hover:scale-110'} 
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tab.label}</span>
                        {count && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {count}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{tab.description}</p>
                    </div>

                    {isActive && (
                      <div className="w-1 h-8 bg-blue-500 rounded-full"></div>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t border-gray-200">
              <div className="text-center">
                <p className="text-xs text-gray-500">Supplier Management System</p>
                <p className="text-xs text-gray-400">v2.0.0 - Enterprise Edition</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
