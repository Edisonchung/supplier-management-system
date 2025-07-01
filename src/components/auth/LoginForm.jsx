import React, { useState } from 'react';
import { Building2, AlertCircle, Eye, EyeOff, Shield, Users, Package, BarChart3, Sparkles, Zap, Globe, ArrowRight } from 'lucide-react';

const ModernLoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Simulate login
    setTimeout(() => {
      setLoading(false);
      alert('Demo login successful!');
    }, 1500);
  };

  const quickLogin = (userEmail, role) => {
    setEmail(userEmail);
    setPassword('password123');
    setError('');
  };

  const features = [
    { 
      icon: Package, 
      title: 'Smart Inventory', 
      desc: 'AI-powered stock management',
      color: 'from-emerald-400 to-teal-500',
      bgColor: 'bg-emerald-50'
    },
    { 
      icon: Building2, 
      title: 'Global Network', 
      desc: 'Worldwide supplier connections',
      color: 'from-blue-400 to-indigo-500',
      bgColor: 'bg-blue-50'
    },
    { 
      icon: BarChart3, 
      title: 'Live Analytics', 
      desc: 'Real-time performance insights',
      color: 'from-purple-400 to-pink-500',
      bgColor: 'bg-purple-50'
    },
    { 
      icon: Zap, 
      title: 'Lightning Fast', 
      desc: 'Optimized for speed & efficiency',
      color: 'from-amber-400 to-orange-500',
      bgColor: 'bg-amber-50'
    }
  ];

  const roles = [
    { 
      role: 'admin', 
      email: 'admin@company.com', 
      name: 'Admin', 
      gradient: 'from-violet-500 via-purple-500 to-indigo-500',
      bg: 'bg-gradient-to-br from-violet-50 to-purple-50',
      description: 'Complete system control',
      permissions: ['All Features', 'User Management', 'System Config'],
      icon: Shield
    },
    { 
      role: 'manager', 
      email: 'manager@company.com', 
      name: 'Manager', 
      gradient: 'from-blue-500 via-cyan-500 to-teal-500',
      bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
      description: 'Department leadership',
      permissions: ['Suppliers', 'Products', 'Orders'],
      icon: Users
    },
    { 
      role: 'employee', 
      email: 'employee@company.com', 
      name: 'Employee', 
      gradient: 'from-emerald-500 via-green-500 to-lime-500',
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
      description: 'Daily operations',
      permissions: ['Products', 'Import', 'Reports'],
      icon: Package
    },
    { 
      role: 'viewer', 
      email: 'viewer@company.com', 
      name: 'Viewer', 
      gradient: 'from-orange-500 via-amber-500 to-yellow-500',
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      description: 'Read-only access',
      permissions: ['View Products', 'Basic Reports'],
      icon: BarChart3
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-pink-400/10 to-violet-400/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative">
          <div className="max-w-lg">
            {/* Logo & Branding */}
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <Building2 className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  SupplyFlow
                </h1>
                <p className="text-slate-600 font-medium">Enterprise Suite 2024</p>
              </div>
            </div>

            {/* Main Heading */}
            <div className="mb-12">
              <h2 className="text-5xl font-bold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                  Transform
                </span>
                <br />
                <span className="text-gray-900">Your Supply Chain</span>
              </h2>
              <p className="text-xl text-slate-600 leading-relaxed mb-8">
                Harness the power of modern technology to streamline operations, 
                boost efficiency, and drive growth with our next-generation platform.
              </p>
              
              {/* CTA Button */}
              <div className="flex items-center gap-4 mb-12">
                <button className="group bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 flex items-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="text-slate-600 hover:text-blue-600 font-semibold flex items-center gap-2 transition-colors">
                  <Globe className="w-5 h-5" />
                  Learn More
                </button>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <div key={index} className={`${feature.bgColor} p-6 rounded-2xl border border-white/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 group cursor-pointer`}>
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SupplyFlow
              </h1>
            </div>

            {/* Login Card */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-200/50 border border-white/50 p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                <p className="text-slate-600">Sign in to continue your journey</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-4 pr-12 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-gray-900"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-2xl hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Signing you in...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  )}
                </button>
              </div>

              {/* Demo Accounts */}
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">Try Demo Accounts</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {roles.map((roleData, index) => {
                    const IconComponent = roleData.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => quickLogin(roleData.email, roleData.role)}
                        className={`group ${roleData.bg} p-4 rounded-2xl border border-white/50 hover:scale-[1.02] transition-all duration-200 text-left hover:shadow-lg`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 bg-gradient-to-br ${roleData.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                            <IconComponent className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">{roleData.name}</span>
                              <span className="text-xs bg-white/60 text-gray-600 px-2 py-1 rounded-full">
                                {roleData.role}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{roleData.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {roleData.permissions.slice(0, 3).map((perm, i) => (
                                <span key={i} className="text-xs bg-white/80 text-gray-700 px-2 py-1 rounded-lg font-medium">
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200/50">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Shield className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-sm text-gray-700 font-medium">
                      Universal Password: <span className="font-mono bg-white px-2 py-1 rounded-lg">password123</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              <p className="flex items-center justify-center gap-2">
                <span>© 2024 SupplyFlow</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span>Enterprise Edition v2.0</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernLoginForm;
