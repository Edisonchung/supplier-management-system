// src/context/AuthContext.jsx - Enhanced version with Firestore roles
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  auth,
  db,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from '../config/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
        try {
          // Get or create user document in Firestore
          const userDoc = await getUserDocument(firebaseUser);
          
          // Always override role for super admin
          const userRole = firebaseUser.email === 'edisonchung@flowsolution.net' 
            ? 'admin' 
            : (userDoc.role || 'viewer');
          
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            role: userRole
          };
          
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to basic user data
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            role: determineUserRole(firebaseUser.email)
          };
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }
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

  // Get or create user document in Firestore
  const getUserDocument = async (firebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    } else {
      // Create new user document
      const newUserData = {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoURL: firebaseUser.photoURL || null,
        role: determineUserRole(firebaseUser.email),
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      await setDoc(userRef, newUserData);
      return newUserData;
    }
  };

  // Helper function to determine initial user role
  const determineUserRole = (email) => {
    // Super admin - always admin regardless of Firestore data
    if (email === 'edisonchung@flowsolution.net') return 'admin';
    
    // Demo accounts (for testing purposes)
    if (email === 'admin@company.com') return 'admin';
    if (email === 'manager@company.com') return 'manager';
    if (email === 'employee@company.com') return 'employee';
    if (email === 'viewer@company.com') return 'viewer';
    
    // DEFAULT: All new users are viewers
    return 'viewer';
  };

  const login = async (email, password) => {
    try {
      const result = await firebaseSignIn(auth, email, password);
      // Update last login time
      if (result.user) {
        const userRef = doc(db, 'users', result.user.uid);
        await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle creating/updating the user document
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('navCollapsed');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      localStorage.removeItem('currentUser');
      throw error;
    }
  };

  // Function to update user role (admin only)
  const updateUserRole = async (userId, newRole) => {
    if (user?.role !== 'admin') {
      throw new Error('Only admins can update user roles');
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { role: newRole }, { merge: true });
      
      // If updating current user, refresh their data
      if (userId === user.uid) {
        setUser(prev => ({ ...prev, role: newRole }));
        localStorage.setItem('currentUser', JSON.stringify({ ...user, role: newRole }));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    logout,
    updateUserRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
