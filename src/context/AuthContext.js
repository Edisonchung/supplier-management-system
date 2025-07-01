import { createContext, useContext, useState, useEffect } from 'react';
import { mockFirebase } from '../services/firebase';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const result = await mockFirebase.auth.signInWithEmailAndPassword(email, password);
      setUser(result.user);
      localStorage.setItem('currentUser', JSON.stringify(result.user));
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await mockFirebase.auth.signOut();
    setUser(null);
    localStorage.removeItem('currentUser');
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
