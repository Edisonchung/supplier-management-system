// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  auth,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from '../config/firebase';

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
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL,
          // Default role for new users - in production, fetch from Firestore
          role: determineUserRole(firebaseUser.email)
        };
        setUser(userData);
        localStorage.setItem('currentUser', JSON.stringify(userData));
      } else {
        // User is signed out
        setUser(null);
        localStorage.removeItem('currentUser');
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Helper function to determine user role
  // In production, this should fetch from Firestore based on user document
  const determineUserRole = (email) => {
    // Demo accounts
    if (email === 'admin@company.com') return 'admin';
    if (email === 'manager@company.com') return 'manager';
    if (email === 'employee@company.com') return 'employee';
    if (email === 'viewer@company.com') return 'viewer';
    
    // Default role for Google sign-in users
    return 'viewer'; // You can change this default role
  };

  const login = async (email, password) => {
    try {
      const result = await firebaseSignIn(auth, email, password);
      // The onAuthStateChanged listener will handle setting the user
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Optional: Add custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle setting the user
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any additional local data
      localStorage.removeItem('navCollapsed');
      // The onAuthStateChanged listener will handle clearing the user
    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, clear local state
      setUser(null);
      localStorage.removeItem('currentUser');
      throw error;
    }
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
