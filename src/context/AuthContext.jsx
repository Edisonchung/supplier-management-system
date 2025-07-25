// src/context/AuthContext.jsx - Enhanced version with team management and activity tracking
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  auth,
  db,
  signInWithEmailAndPassword as firebaseSignIn,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from '../config/firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs,
  updateDoc,
  addDoc,
  orderBy,
  limit
} from 'firebase/firestore';

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
  const [teamMembers, setTeamMembers] = useState([]);

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
            role: userRole,
            department: userDoc.department || 'General',
            joinedAt: userDoc.createdAt,
            lastLogin: userDoc.lastLogin
          };
          
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
          
          // 🆕 Track login activity
          await logUserActivity(firebaseUser.uid, 'login', {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            ip: await getUserIP()
          });

          // 🆕 Load team members if admin
          if (userRole === 'admin') {
            await loadTeamMembers();
          }
          
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to basic user data
          const userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            photoURL: firebaseUser.photoURL,
            role: determineUserRole(firebaseUser.email),
            department: 'General'
          };
          setUser(userData);
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }
      } else {
        // User is signed out
        setUser(null);
        setTeamMembers([]);
        localStorage.removeItem('currentUser');
      }
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // 🆕 Get user's IP address for activity tracking
  const getUserIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'Unknown';
    }
  };

  // Get or create user document in Firestore - FIXED VERSION
  const getUserDocument = async (firebaseUser) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      // Update last login - FIXED: Handle undefined photoURL properly
      const updateData = {
        lastLogin: serverTimestamp(),
        displayName: firebaseUser.displayName || userSnap.data().displayName
      };

      // Only include photoURL if it has a valid value (not null or undefined)
      const photoURL = firebaseUser.photoURL || userSnap.data().photoURL;
      if (photoURL !== null && photoURL !== undefined) {
        updateData.photoURL = photoURL;
      }

      await updateDoc(userRef, updateData);
      return { ...userSnap.data(), lastLogin: new Date() };
    } else {
      // Create new user document
      const newUserData = {
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoURL: firebaseUser.photoURL || null,
        role: determineUserRole(firebaseUser.email),
        department: 'General',
        status: 'active',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        preferences: {
          notifications: true,
          emailUpdates: true,
          theme: 'light'
        }
      };
      
      await setDoc(userRef, newUserData);
      return { ...newUserData, createdAt: new Date(), lastLogin: new Date() };
    }
  };

  // 🆕 Load team members (admin only)
  const loadTeamMembers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const members = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        lastLogin: doc.data().lastLogin?.toDate()
      }));
      
      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  // 🆕 Log user activity
  const logUserActivity = async (userId, action, metadata = {}) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        userId,
        action,
        timestamp: serverTimestamp(),
        metadata,
        sessionId: getSessionId()
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  // 🆕 Get or generate session ID
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('higgsflow_session');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('higgsflow_session', sessionId);
    }
    return sessionId;
  };

  // Helper function to determine initial user role
  const determineUserRole = (email) => {
    // Super admin - always admin regardless of Firestore data
    if (email === 'edisonchung@flowsolution.net') return 'admin';
    
    // 🆕 Your team domain - auto-assign manager role
    if (email.endsWith('@flowsolution.net')) return 'manager';
    
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
      return result;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };

  // 🆕 Create new team member account (admin only)
  const createTeamMember = async (memberData) => {
    if (user?.role !== 'admin') {
      throw new Error('Only admins can create team member accounts');
    }

    try {
      // Create Firebase auth account
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth, 
        memberData.email, 
        memberData.password
      );

      // Create Firestore user document
      const userData = {
        email: memberData.email,
        displayName: memberData.displayName || memberData.email.split('@')[0],
        role: memberData.role || 'viewer',
        department: memberData.department || 'General',
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: user.uid,
        preferences: {
          notifications: true,
          emailUpdates: true,
          theme: 'light'
        }
      };

      await setDoc(doc(db, 'users', newUser.uid), userData);

      // 🆕 Log admin activity
      await logUserActivity(user.uid, 'create_user', {
        targetUserId: newUser.uid,
        targetEmail: memberData.email,
        assignedRole: memberData.role
      });

      // Reload team members
      await loadTeamMembers();

      return { success: true, userId: newUser.uid };
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  };

  // 🆕 Send password reset email
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // 🆕 Log logout activity before signing out
      if (user) {
        await logUserActivity(user.uid, 'logout', {
          sessionDuration: Date.now() - new Date(user.lastLogin).getTime()
        });
      }

      await signOut(auth);
      localStorage.removeItem('navCollapsed');
      sessionStorage.removeItem('higgsflow_session');
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setTeamMembers([]);
      localStorage.removeItem('currentUser');
      throw error;
    }
  };

  // Function to update user role (admin only)
  const updateUserRole = async (userId, newRole, newDepartment = null) => {
    if (user?.role !== 'admin') {
      throw new Error('Only admins can update user roles');
    }
    
    try {
      const userRef = doc(db, 'users', userId);
      const updateData = { 
        role: newRole,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      if (newDepartment) {
        updateData.department = newDepartment;
      }
      
      await updateDoc(userRef, updateData);

      // 🆕 Log role change activity
      await logUserActivity(user.uid, 'update_user_role', {
        targetUserId: userId,
        oldRole: teamMembers.find(m => m.uid === userId)?.role,
        newRole: newRole,
        newDepartment: newDepartment
      });
      
      // If updating current user, refresh their data
      if (userId === user.uid) {
        const updatedUser = { ...user, role: newRole };
        if (newDepartment) updatedUser.department = newDepartment;
        
        setUser(updatedUser);
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      }

      // Reload team members
      await loadTeamMembers();
      
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  };

  // 🆕 Deactivate user account (admin only)
  const deactivateUser = async (userId) => {
    if (user?.role !== 'admin') {
      throw new Error('Only admins can deactivate users');
    }

    if (userId === user.uid) {
      throw new Error('Cannot deactivate your own account');
    }

    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: 'inactive',
        deactivatedAt: serverTimestamp(),
        deactivatedBy: user.uid
      });

      // 🆕 Log deactivation
      await logUserActivity(user.uid, 'deactivate_user', {
        targetUserId: userId
      });

      // Reload team members
      await loadTeamMembers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      throw error;
    }
  };

  // 🆕 Get recent team activity
  const getTeamActivity = async (limitCount = 50) => {
    try {
      const activityRef = collection(db, 'activityLogs');
      const q = query(
        activityRef, 
        orderBy('timestamp', 'desc'), 
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
    } catch (error) {
      console.error('Error fetching team activity:', error);
      return [];
    }
  };

  // 🆕 Get user statistics
  const getUserStats = () => {
    if (!teamMembers.length) return null;

    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    return {
      total: teamMembers.length,
      active: teamMembers.filter(m => m.status === 'active').length,
      inactive: teamMembers.filter(m => m.status === 'inactive').length,
      loggedInToday: teamMembers.filter(m => m.lastLogin && m.lastLogin > oneDayAgo).length,
      loggedInThisWeek: teamMembers.filter(m => m.lastLogin && m.lastLogin > oneWeekAgo).length,
      byRole: {
        admin: teamMembers.filter(m => m.role === 'admin').length,
        manager: teamMembers.filter(m => m.role === 'manager').length,
        employee: teamMembers.filter(m => m.role === 'employee').length,
        viewer: teamMembers.filter(m => m.role === 'viewer').length
      },
      byDepartment: teamMembers.reduce((acc, member) => {
        acc[member.department || 'General'] = (acc[member.department || 'General'] || 0) + 1;
        return acc;
      }, {})
    };
  };

  const value = {
    // Existing
    user,
    login,
    loginWithGoogle,
    logout,
    updateUserRole,
    loading,
    
    // 🆕 Enhanced team management
    teamMembers,
    createTeamMember,
    deactivateUser,
    resetPassword,
    loadTeamMembers,
    
    // 🆕 Activity tracking
    logUserActivity,
    getTeamActivity,
    
    // 🆕 Statistics
    getUserStats,
    
    // 🆕 Utility functions
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'admin' || user?.role === 'manager',
    canManageUsers: user?.role === 'admin',
    canViewReports: user?.role === 'admin' || user?.role === 'manager'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
