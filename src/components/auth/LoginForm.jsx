// src/components/auth/LoginForm.jsx
import React from 'react';
import { Sparkles } from 'lucide-react';

const LoginForm = ({ showNotification }) => {
  const quickLogin = async (email) => {
    try {
      const { login } = await import('../../context/AuthContext').then(m => ({ login: m.useAuth().login }));
      await login(email, 'password123');
    } catch (error) {
      showNotification('Login simulation - would log in as ' + email, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Test Card */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-8 rounded-2xl shadow-2xl text-center">
          <Sparkles className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Color Test</h1>
          <p className="text-white/80">If you see purple gradient, Tailwind is working!</p>
        </div>

        {/* Demo Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => quickLogin('admin@company.com')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Login as Admin
          </button>
          <button
            onClick={() => quickLogin('manager@company.com')}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Login as Manager
          </button>
        </div>

        {/* Glass Card */}
        <div className="bg-white/10 backdrop-blur-lg p-6 rounded-xl border border-white/20">
          <p className="text-white text-center">Glass morphism test</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
