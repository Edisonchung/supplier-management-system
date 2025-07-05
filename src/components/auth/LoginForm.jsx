// src/components/auth/LoginForm.jsx
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, Package, ShoppingCart, FileText, 
  Lock, Mail, ArrowRight, Sparkles, 
  Zap, Shield, BarChart3, Globe
} from 'lucide-react';

const LoginForm = ({ showNotification }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const demoAccounts = [
    { email: 'admin@company.com', password: 'admin123', role: 'Admin', color: 'from-purple-600 to-indigo-600' },
    { email: 'manager@company.com', password: 'manager123', role: 'Manager', color: 'from-blue-600 to-cyan-600' },
    { email: 'employee@company.com', password: 'employee123', role: 'Employee', color: 'from-emerald-600 to-teal-600' },
    { email: 'viewer@company.com', password: 'viewer123', role: 'Viewer', color: 'from-orange-600 to-amber-600' }
  ];

  const features = [
    { icon: Globe, title: 'Global Supplier Network', description: 'Connect with suppliers worldwide' },
    { icon: Zap, title: 'Real-time Tracking', description: 'Monitor orders and deliveries instantly' },
    { icon: Shield, title: 'Secure & Reliable', description: 'Enterprise-grade security for your data' },
    { icon: BarChart3, title: 'Analytics & Insights', description: 'Make data-driven decisions' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      showNotification?.('Login successful!', 'success');
    } catch (error) {
      showNotification?.('Invalid email or password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);

    try {
      await login(demoEmail, demoPassword);
      showNotification?.('Login successful!', 'success');
    } catch (error) {
      showNotification?.('Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Left Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Branding */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                  <span className="text-white font-bold text-xl">HF</span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900">HiggsFlow</h1>
              </div>
            </div>
            <p className="text-lg text-gray-600 font-medium">Accelerating your supply chain</p>
          </div>

          {/* Login Form Card */}
          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      Sign in
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </button>
              </div>
            </form>

            {/* Demo Accounts */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or try a demo account</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => handleDemoLogin(account.email, account.password)}
                    className={`relative group overflow-hidden rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r ${account.color} hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200`}
                  >
                    <div className="relative z-10">
                      <div className="text-xs opacity-90">{account.role}</div>
                      <div className="flex items-center justify-center mt-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Demo
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600">
            By signing in, you agree to our{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {/* Right Panel - Features */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-blue-600 to-purple-700 text-white p-12 items-center justify-center">
        <div className="max-w-lg">
          <h2 className="text-4xl font-bold mb-6">
            Welcome to the Future of Supply Chain Management
          </h2>
          <p className="text-lg mb-8 text-blue-100">
            Streamline your procurement process, manage suppliers efficiently, and accelerate your business growth with HiggsFlow.
          </p>

          {/* Feature List */}
          <div className="space-y-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <feature.icon className="h-6 w-6 text-blue-200" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-blue-100">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-4">
            <div>
              <div className="text-3xl font-bold">500+</div>
              <div className="text-sm text-blue-200">Active Suppliers</div>
            </div>
            <div>
              <div className="text-3xl font-bold">10k+</div>
              <div className="text-sm text-blue-200">Products Managed</div>
            </div>
            <div>
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm text-blue-200">Uptime SLA</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
