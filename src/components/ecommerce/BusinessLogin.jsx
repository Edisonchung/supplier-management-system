// src/components/ecommerce/BusinessLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowLeft, Loader2, Building2, Users, CreditCard, Headphones } from 'lucide-react';

const BusinessLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // TODO: Implement authentication logic
    console.log('Business login:', formData);
    
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // For demo mode, accept any credentials
      alert('Login successful! Redirecting to business dashboard...');
      navigate('/business/dashboard');
    }, 1500);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Catalog
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Building2 className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Business Account Login</h1>
            <p className="text-gray-600 mt-2">Access your industrial procurement account</p>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Business Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your.email@company.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1" />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="/forgot-password" className="text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Signing In...
                </>
              ) : (
                'Sign In to Business Account'
              )}
            </button>
          </form>
          
          {/* Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have a business account? {' '}
              <button 
                onClick={() => navigate('/business/register')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Register your business
              </button>
            </p>
          </div>

          {/* Account Benefits */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Business Account Benefits:</h4>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CreditCard className="w-4 h-4 text-green-500" />
                <span>Wholesale pricing and bulk discounts</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4 text-blue-500" />
                <span>Flexible payment terms (NET 30/60/90)</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4 text-purple-500" />
                <span>Dedicated account manager</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Headphones className="w-4 h-4 text-orange-500" />
                <span>Priority technical support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Business Types Supported */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 mb-2">Serving all types of industrial businesses:</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-400">
            <span>Manufacturing Companies</span>
            <span>•</span>
            <span>System Integrators</span>
            <span>•</span>
            <span>Trading Companies</span>
            <span>•</span>
            <span>Engineering Firms</span>
            <span>•</span>
            <span>Government Agencies</span>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm text-yellow-800 font-medium">Demo Mode Active</p>
            <p className="text-xs text-yellow-700 mt-1">
              Use any email and password to test the business login system
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessLogin;
