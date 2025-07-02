// src/components/auth/LoginForm.jsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Package, FileText, BarChart3, 
  LogIn, ArrowRight, Shield, Sparkles, ChevronRight,
  Zap, Globe, Lock, CheckCircle, TrendingUp, Star,
  Cpu, Layers, Award, Target
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LoginForm = ({ showNotification }) => {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hoveredRole, setHoveredRole] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState('login');

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
      lightGradient: 'from-violet-500/20 to-indigo-500/20',
      shadowColor: 'shadow-violet-500/50',
      icon: Shield,
      stats: '100%',
      features: ['Full Control', 'All Modules', 'User Management'],
      description: 'Complete system access'
    },
    { 
      role: 'manager', 
      email: 'manager@company.com', 
      name: 'Manager', 
      gradient: 'from-blue-600 to-cyan-600',
      lightGradient: 'from-blue-500/20 to-cyan-500/20',
      shadowColor: 'shadow-blue-500/50',
      icon: Users,
      stats: '75%',
      features: ['Suppliers', 'Products', 'Orders'],
      description: 'Operations management'
    },
    { 
      role: 'employee',  
      email: 'employee@company.com', 
      name: 'Employee', 
      gradient: 'from-emerald-600 to-teal-600',
      lightGradient: 'from-emerald-500/20 to-teal-500/20',
      shadowColor: 'shadow-emerald-500/50',
      icon: Package,
      stats: '50%',
      features: ['Products', 'Basic Reports'],
      description: 'Daily operations'
    },
    { 
      role: 'viewer', 
      email: 'viewer@company.com', 
      name: 'Viewer', 
      gradient: 'from-amber-600 to-orange-600',
      lightGradient: 'from-amber-500/20 to-orange-500/20',
      shadowColor: 'shadow-amber-500/50',
      icon: BarChart3,
      stats: '25%',
      features: ['View Only', 'Reports'],
      description: 'Read-only access'
    }
  ];

  const features = [
    { icon: Zap, text: 'Lightning Performance', color: 'from-yellow-400 to-orange-500' },
    { icon: Shield, text: 'Bank-Level Security', color: 'from-green-400 to-emerald-500' },
    { icon: Globe, text: 'Global Infrastructure', color: 'from-blue-400 to-indigo-500' },
    { icon: Cpu, text: 'AI-Powered Insights', color: 'from-purple-400 to-pink-500' }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime', icon: TrendingUp },
    { value: '50M+', label: 'Transactions', icon: Layers },
    { value: '10K+', label: 'Companies', icon: Building2 },
    { value: '4.9', label: 'Rating', icon: Star }
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Dynamic gradient background that follows mouse */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.15), transparent 50%)`
        }}
      />
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900"></div>
        
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/30 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-[128px] animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/20 rounded-full blur-[128px] animate-pulse" style={{animationDelay: '4s'}}></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
        
        {/* Animated lines */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0" />
              <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="url(#gradient)" strokeWidth="1" className="animate-pulse" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="url(#gradient)" strokeWidth="1" className="animate-pulse" style={{animationDelay: '2s'}} />
        </svg>
      </div>

      <div className="relative z-10 min-h-screen flex">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 relative">
          <div className="max-w-lg mx-auto">
            {/* Logo */}
            <div className="mb-12 group cursor-pointer">
              <div className="inline-flex items-center gap-4 p-5 bg-white/5 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-2xl hover:shadow-violet-500/25 transition-all duration-500 hover:scale-105">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-9 h-9 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight">SupplyFlow</h1>
                  <p className="text-sm text-violet-400 font-medium">Enterprise Platform</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <h2 className="text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Next-Gen
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-pink-400 to-cyan-400 animate-gradient">
                Supply Chain
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-12 leading-relaxed">
              Revolutionize your operations with AI-powered insights, real-time analytics, and seamless collaboration.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-2 gap-4 mb-12">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="group relative p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-105 hover:bg-white/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 rounded-xl transition-opacity duration-300" />
                  <div className={`w-10 h-10 bg-gradient-to-br ${feature.color} rounded-lg flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-gray-300 font-medium text-sm">{feature.text}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/5 rounded-lg mb-2 group-hover:scale-110 transition-transform">
                    <stat.icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10 shadow-2xl hover:shadow-violet-500/10 transition-all duration-500">
              {/* Animated background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 rounded-3xl animate-gradient"></div>
              
              <div className="relative">
                {/* Form Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl mb-4 shadow-2xl animate-float">
                    <Sparkles className="w-10 h-10 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">Welcome Back</h2>
                  <p className="text-gray-400">Experience the future of supply chain</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                      activeTab === 'login' 
                        ? 'bg-white/10 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setActiveTab('demo')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-300 ${
                      activeTab === 'demo' 
                        ? 'bg-white/10 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Demo Access
                  </button>
                </div>

                {activeTab === 'login' ? (
                  /* Login Form */
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <div className="relative group">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/10"
                          placeholder="you@company.com"
                          onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10"></div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Password
                      </label>
                      <div className="relative group">
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-300 group-hover:bg-white/10"
                          placeholder="Enter your password"
                          onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-indigo-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10"></div>
                      </div>
                    </div>

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="group relative w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3.5 px-4 rounded-xl font-semibold shadow-lg hover:shadow-violet-500/25 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                            Authenticating...
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
                        Forgot password?
                      </a>
                      <a href="#" className="text-violet-400 hover:text-violet-300 transition-colors">
                        Create account
                      </a>
                    </div>
                  </div>
                ) : (
                  /* Demo Accounts */
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
                          className="group relative w-full overflow-hidden rounded-2xl transition-all duration-500"
                        >
                          {/* Background gradient */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${roleData.lightGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                          
                          {/* Border gradient */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${roleData.gradient} opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500`}></div>
                          
                          {/* Content */}
                          <div className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                            isHovered 
                              ? 'bg-white/10 border-white/20 shadow-2xl transform scale-[1.02]' 
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                isHovered
                                  ? 'scale-110 rotate-3'
                                  : ''
                              }`}>
                                <div className={`absolute inset-0 bg-gradient-to-br ${roleData.gradient} rounded-xl ${
                                  isHovered ? 'animate-pulse' : ''
                                }`}></div>
                                <IconComponent className="relative w-7 h-7 text-white" />
                              </div>
                              
                              <div className="flex-1 text-left">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className={`font-bold text-lg ${isHovered ? 'text-white' : 'text-gray-200'}`}>
                                    {roleData.name}
                                  </span>
                                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all duration-300 ${
                                    isHovered
                                      ? 'bg-white/20 text-white'
                                      : 'bg-white/10 text-gray-400'
                                  }`}>
                                    <Target className="w-3 h-3" />
                                    {roleData.stats}
                                  </div>
                                </div>
                                <p className={`text-sm mb-2 ${isHovered ? 'text-gray-200' : 'text-gray-400'}`}>
                                  {roleData.description}
                                </p>
                                <div className="flex gap-2">
                                  {roleData.features.map((feature, i) => (
                                    <span 
                                      key={i} 
                                      className={`text-xs px-2 py-1 rounded-lg transition-all duration-300 ${
                                        isHovered
                                          ? 'bg-white/20 text-white'
                                          : 'bg-white/5 text-gray-500'
                                      }`}
                                    >
                                      {feature}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              
                              <ChevronRight className={`w-6 h-6 transition-all duration-300 ${
                                isHovered ? 'text-white translate-x-1' : 'text-gray-600'
                              }`} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Password hint */}
                <div className="mt-6 p-4 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-xl border border-violet-500/20 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Lock className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm text-violet-300 font-medium">Demo Credentials</p>
                      <p className="text-xs text-violet-400/80">Password: password123</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 space-y-2">
              <p className="text-gray-500 text-sm">
                © 2024 SupplyFlow • Next Generation Supply Chain Platform
              </p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <a href="#" className="text-gray-600 hover:text-violet-400 transition-colors">Privacy</a>
                <span className="text-gray-700">•</span>
                <a href="#" className="text-gray-600 hover:text-violet-400 transition-colors">Terms</a>
                <span className="text-gray-700">•</span>
                <a href="#" className="text-gray-600 hover:text-violet-400 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
