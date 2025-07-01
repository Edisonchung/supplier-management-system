import { useState } from 'react';
import { Building2, AlertCircle, Eye, EyeOff, Shield, Users, Package, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginForm = ({ showNotification }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await login(email, password);
      showNotification(`Welcome back, ${result.user.displayName}!`, 'success');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail, role) => {
    setEmail(userEmail);
    setPassword('password123');
    setError('');
  };

  const features = [
    { icon: Package, title: 'Product Management', desc: 'Complete catalog control' },
    { icon: Building2, title: 'Supplier Network', desc: 'Streamlined partnerships' },
    { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Real-time insights' },
    { icon: Shield, title: 'Enterprise Security', desc: 'Role-based access control' }
  ];

  const roles = [
    { 
      role: 'admin', 
      email: 'admin@company.com', 
      name: 'Admin', 
      color: 'from-purple-500 to-purple-600',
      description: 'Full system access',
      permissions: ['All Features', 'User Management', 'System Settings']
    },
    { 
      role: 'manager', 
      email: 'manager@company.com', 
      name: 'Manager', 
      color: 'from-blue-500 to-blue-600',
      description: 'Department oversight',
      permissions: ['Suppliers', 'Products', 'Purchase Orders']
    },
    { 
      role: 'employee', 
      email: 'employee@company.com', 
      name: 'Employee', 
      color: 'from-green-500 to-green-600',
      description: 'Daily operations',
      permissions: ['Products', 'Quick Import', 'View Access']
    },
    { 
      role: 'viewer', 
      email: 'viewer@company.com', 
      name: 'Viewer', 
      color: 'from-gray-500 to-gray-600',
      description: 'Read-only access',
      permissions: ['View Products', 'Basic Reports', 'Dashboard']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-purple-900 flex">
      {/* Left Side - Features */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Supplier Management</h1>
              <p className="text-blue-200">Enterprise Solution</p>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Streamline Your <br />
              <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                Supply Chain
              </span>
            </h2>
            <p className="text-xl text-blue-200 leading-relaxed">
              Manage suppliers, track inventory, and optimize purchase orders with our comprehensive platform.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white bg-opacity-10 backdrop-blur-sm rounded-xl p-4 border border-white border-opacity-20">
                  <Icon className="w-8 h-8 text-blue-200 mb-3" />
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-blue-200">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Background Elements */}
        <div className="absolute top-1/4 right-0 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white lg:bg-transparent">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10 border border-gray-200">
            {/* Mobile Header */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
              <p className="text-gray-600 mt-1">Sign in to continue</p>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:block text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to access your dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    Signing in...
                  </div>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Demo Accounts</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Try different user roles with these demo accounts:</p>
              
              <div className="grid grid-cols-2 gap-3">
                {roles.map((roleData, index) => (
                  <button
                    key={index}
                    onClick={() => quickLogin(roleData.email, roleData.role)}
                    className="group p-3 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 bg-gradient-to-r ${roleData.color} rounded-full`}></div>
                      <span className="font-medium text-gray-900">{roleData.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{roleData.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {roleData.permissions.slice(0, 2).map((perm, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {perm}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  <span className="font-medium">Password for all accounts:</span> password123
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>© 2024 Supplier Management System</p>
            <p>Enterprise Edition v2.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
