// src/components/auth/LoginForm.jsx
import React, { useState } from 'react';
import { 
  Building2, Users, Package, FileText, BarChart3, 
  LogIn, ArrowRight, Shield, Sparkles, ChevronRight,
  Zap, Globe, Lock, CheckCircle, TrendingUp
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginForm = ({ showNotification }) => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hoveredRole, setHoveredRole] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (error) {
      showNotification(error.message, 'error');
    }
  };

  const quickLogin = async (email, role) => {
    try {
      await login(email, 'password123');
    } catch (error) {
      showNotification('Login failed', 'error');
    }
  };

  const roles = [
    { 
      role: 'admin', 
      email: 'admin@company.com', 
      name: 'Administrator', 
      gradient: 'from-violet-600 to-indigo-600',
      bg: 'bg-gradient-to-br from-violet-50 to-indigo-50',
      shadowColor: 'shadow-violet-500/25',
      description: 'Full system control',
      permissions: ['All Features', 'User Management', 'System Settings'],
      icon: Shield,
      stats: '100% Access'
    },
    { 
      role: 'manager', 
      email: 'manager@company.com', 
      name: 'Manager', 
      gradient: 'from-blue-600 to-cyan-600',
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      shadowColor: 'shadow-blue-500/25',
      description: 'Operations oversight',
      permissions: ['Suppliers', 'Products', 'Purchase Orders'],
      icon: Users,
      stats: '75% Access'
    },
    { 
      role: 'employee',  
      email: 'employee@company.com', 
      name: 'Employee', 
      gradient: 'from-emerald-600 to-teal-600',
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      shadowColor: 'shadow-emerald-500/25',
      description: 'Daily operations',
      permissions: ['Products', 'Import', 'Reports'],
      icon: Package,
      stats: '50% Access'
    },
    { 
      role: 'viewer', 
      email: 'viewer@company.com', 
      name: 'Viewer', 
      gradient: 'from-amber-600 to-orange-600',
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      shadowColor: 'shadow-amber-500/25',
      description: 'Read-only access',
      permissions: ['View Products', 'Basic Reports'],
      icon: BarChart3,
      stats: '25% Access'
    }
  ];

  const features = [
    { icon: Zap, text: 'Lightning-fast operations', color: 'text-yellow-600' },
    { icon: Globe, text: 'Cloud-based platform', color: 'text-blue-600' },
    { icon: Lock, text: 'Enterprise security', color: 'text-green-600' },
    { icon: TrendingUp, text: 'Advanced analytics', color: 'text-purple-600' }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-black to-indigo-900/20"></div>
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-violet-500/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-500/30 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/20 rounded-full blur-[150px] animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative">
          <div className="max-w-lg mx-auto">
            {/* Logo */}
            <div className="mb-12 transform hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center gap-3 p-4 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl">
                <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">SupplyFlow</h1>
                  <p className="text-sm text-gray-400">Enterprise Edition</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
              Streamline Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">
                Supply Chain
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-12">
              Manage suppliers, track inventory, and optimize operations with our cutting-edge platform.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 transform hover:translate-x-2 transition-all duration-300"
                >
                  <div className={`w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <span className="text-gray-300 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">10K+</div>
                <div className="text-sm text-gray-400">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-sm text-gray-400">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              {/* Form Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-violet-500/25">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400">Sign in to access your dashboard</p>
              </div>

              {/* Login Form */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-500/25 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Signing in...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-transparent text-gray-400">Or try a demo account</span>
                </div>
              </div>

              {/* Demo Accounts */}
              <div className="space-y-3">
                {roles.map((roleData, index) => {
                  const IconComponent = roleData.icon;
                  const isHovered = hoveredRole === index;
                  return (
                    <button
                      key={index}
                      onClick={() => quickLogin(roleData.email, roleData.role)}
                      onMouseEnter={() => setHoveredRole(index)}
                      onMouseLeave={() => setHoveredRole(null)}
                      className={`group w-full p-4 rounded-2xl border transition-all duration-300 ${
                        isHovered 
                          ? `bg-gradient-to-r ${roleData.gradient} border-transparent shadow-lg ${roleData.shadowColor}` 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isHovered
                            ? 'bg-white/20 scale-110'
                            : `bg-gradient-to-br ${roleData.gradient}`
                        }`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold ${isHovered ? 'text-white' : 'text-gray-200'}`}>
                              {roleData.name}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              isHovered
                                ? 'bg-white/20 text-white'
                                : 'bg-white/10 text-gray-400'
                            }`}>
                              {roleData.stats}
                            </span>
                          </div>
                          <p className={`text-sm ${isHovered ? 'text-white/80' : 'text-gray-500'}`}>
                            {roleData.description}
                          </p>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-all duration-300 ${
                          isHovered ? 'text-white translate-x-1' : 'text-gray-600'
                        }`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Password hint */}
              <div className="mt-6 p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
                <div className="flex items-center gap-2 justify-center">
                  <Lock className="w-4 h-4 text-violet-400" />
                  <p className="text-sm text-violet-300">
                    Demo password: <span className="font-mono">password123</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p>© 2024 SupplyFlow • Enterprise Supply Chain Management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
