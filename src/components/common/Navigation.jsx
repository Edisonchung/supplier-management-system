import { BarChart3, Building2, Package, FileText, Upload, Users, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navigation = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const { user } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['admin', 'manager', 'employee', 'viewer'] },
    { id: 'suppliers', label: 'Suppliers', icon: Building2, roles: ['admin', 'manager'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['admin', 'manager', 'employee', 'viewer'] },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText, roles: ['admin', 'manager'] },
    { id: 'import', label: 'Quick Import', icon: Upload, roles: ['admin', 'manager', 'employee'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['admin'] }
  ];

  const allowedTabs = tabs.filter(tab => tab.roles.includes(user.role));

  return (
    <>
      {/* Desktop Navigation */}
      <div className="hidden lg:block bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {allowedTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
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
          
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Navigation</h2>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <nav className="p-4 space-y-2">
              {allowedTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;
