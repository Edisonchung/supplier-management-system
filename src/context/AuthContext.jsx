// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from '../services/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(email, password);
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        role: result.user.role
      };
      setUser(userData);
      localStorage.setItem('currentUser', JSON.stringify(userData));
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
      // Clear all auth-related data
      localStorage.removeItem('currentUser');
      // Clear navigation state
      localStorage.removeItem('navCollapsed');
      // Redirect will be handled by the component
    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, clear local state
      setUser(null);
      localStorage.removeItem('currentUser');
    }
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
