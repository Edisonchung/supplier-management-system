// src/config/firebase.js - Updated for Phase 2A E-commerce with CORS fixes
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,  // For team member creation
  sendPasswordResetEmail,          // For password reset functionality
  signInAnonymously,               // 🆕 For guest users
  updateProfile                    // 🆕 For user profile updates
} from 'firebase/auth';
import { 
  getFirestore,
  connectFirestoreEmulator,        // 🆕 For development emulator
  enableNetwork,                   // 🆕 For network control
  disableNetwork,                  // 🆕 For offline support
  initializeFirestore              // 🔧 CORS fix
} from 'firebase/firestore';
import { 
  getStorage,
  connectStorageEmulator           // 🆕 For development emulator
} from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration (keeping your existing config)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBxNZe2RYL1vJZgu93C3zdz2i0J-lDYgCY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "higgsflow-b9f81.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "higgsflow-b9f81",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "higgsflow-b9f81.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "717201513347",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:717201513347:web:86abc12a7dcebe914834b6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 🔧 PREVENT MULTIPLE INITIALIZATION - This fixes the warning
let app;
let db;
let auth;
let storage;
let analytics;

if (!getApps().length) {
  // First time initialization
  app = initializeApp(firebaseConfig);
  
  // 🔧 Initialize Firestore with CORS-friendly settings
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true, // 🔧 CORS fix for production
    });
    console.log('🔥 Firebase initialized with CORS fixes');
  } catch (error) {
    // Fallback to regular getFirestore if initializeFirestore fails
    console.warn('⚠️ Firestore persistence failed, using default with CORS fixes:', error.message);
    db = getFirestore(app);
  }
  
  // Initialize other services
  auth = getAuth(app);
  storage = getStorage(app);
  
  // Only initialize analytics in production and if measurement ID exists
  if (import.meta.env.PROD && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
      console.log('📊 Firebase Analytics initialized for e-commerce tracking');
    } catch (error) {
      console.warn('⚠️ Analytics initialization failed:', error.message);
      analytics = null;
    }
  } else {
    analytics = null;
  }
  
  console.log('🔥 Firebase initialized');
  console.log('🔧 Environment:', import.meta.env.MODE || 'development');
  console.log('🔧 Project ID:', firebaseConfig.projectId);
  
} else {
  // 🔧 Use existing app instance to prevent double initialization
  app = getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
  
  if (import.meta.env.PROD && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
    } catch (error) {
      analytics = null;
    }
  }
  
  console.log('♻️ Using existing Firebase instance');
}

// 🆕 Connect to emulators in development (Phase 2A enhancement)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    // Check if emulator is not already connected
    if (!db._delegate._databaseId.database.includes('emulator')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔥 Connected to Firestore emulator');
    }
    
    // Connect to Storage emulator
    if (!storage._location) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('📁 Connected to Storage emulator');
    }
  } catch (error) {
    console.warn('⚠️ Firebase emulators already connected or not available:', error.message);
  }
}

// 🆕 Enhanced Authentication Functions for E-commerce
export class AuthService {
  static async signInAsGuest() {
    try {
      const result = await signInAnonymously(auth);
      console.log('👤 Guest user signed in:', result.user.uid);
      return result.user;
    } catch (error) {
      console.error('❌ Guest sign-in failed:', error);
      throw error;
    }
  }

  static async signInFactory(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('🏭 Factory user signed in:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('❌ Factory sign-in failed:', error);
      throw error;
    }
  }

  static async signInAdmin(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      // Additional admin verification can be added here
      console.log('👨‍💼 Admin user signed in:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('❌ Admin sign-in failed:', error);
      throw error;
    }
  }

  static async signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      console.log('🔐 Google sign-in successful:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      throw error;
    }
  }

  static async createFactoryAccount(email, password, factoryData) {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile
      await updateProfile(result.user, {
        displayName: factoryData.companyName || factoryData.contactPersonName
      });

      console.log('🏭 Factory account created:', result.user.email);
      return result.user;
    } catch (error) {
      console.error('❌ Factory account creation failed:', error);
      throw error;
    }
  }

  static async signOutUser() {
    try {
      await signOut(auth);
      console.log('👋 User signed out successfully');
    } catch (error) {
      console.error('❌ Sign-out failed:', error);
      throw error;
    }
  }

  static async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('📧 Password reset email sent to:', email);
    } catch (error) {
      console.error('❌ Password reset failed:', error);
      throw error;
    }
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

// 🆕 Database Connection Management for E-commerce
export class DatabaseService {
  static async enableOfflineSupport() {
    try {
      await enableNetwork(db);
      console.log('🌐 Database network enabled');
    } catch (error) {
      console.warn('⚠️ Failed to enable database network:', error);
    }
  }

  static async disableOfflineSupport() {
    try {
      await disableNetwork(db);
      console.log('🔴 Database network disabled');
    } catch (error) {
      console.warn('⚠️ Failed to disable database network:', error);
    }
  }

  static getFirestore() {
    return db;
  }
}

// 🆕 Session Management for Guest Users
export class SessionService {
  static generateGuestSessionId() {
    const timestamp = Date.now();
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `guest_${timestamp}_${randomPart}`;
  }

  static getOrCreateSessionId() {
    let sessionId = localStorage.getItem('higgsflow_session_id');
    
    if (!sessionId) {
      sessionId = this.generateGuestSessionId();
      localStorage.setItem('higgsflow_session_id', sessionId);
      console.log('🆔 Created new guest session:', sessionId);
    }
    
    return sessionId;
  }

  static clearSession() {
    localStorage.removeItem('higgsflow_session_id');
    localStorage.removeItem('higgsflow_guest_cart');
    console.log('🗑️ Guest session cleared');
  }

  static extendSession() {
    const sessionId = this.getOrCreateSessionId();
    localStorage.setItem('higgsflow_session_updated', Date.now().toString());
    return sessionId;
  }
}

// 🆕 User Type Detection for E-commerce
export class UserTypeService {
  static getUserType(user) {
    if (!user) return 'guest';
    if (user.isAnonymous) return 'guest';
    
    // Check if user email contains admin domains
    const adminDomains = ['higgsflow.com', 'admin.higgsflow.com'];
    if (adminDomains.some(domain => user.email?.includes(domain))) {
      return 'admin';
    }
    
    // Default to factory user for authenticated non-admin users
    return 'factory';
  }

  static isAdmin(user) {
    return this.getUserType(user) === 'admin';
  }

  static isFactory(user) {
    return this.getUserType(user) === 'factory';
  }

  static isGuest(user) {
    return this.getUserType(user) === 'guest';
  }
}

// Export the main services (use these exports in your components)
export { db, auth, storage, analytics };

// Export ALL auth functions (including existing and new ones)
export {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,  // For creating team member accounts
  sendPasswordResetEmail,          // For password reset functionality
  signInAnonymously,               // 🆕 For guest users
  updateProfile,                   // 🆕 For user profile updates
  enableNetwork,                   // 🆕 For network control
  disableNetwork                   // 🆕 For offline support
};

// 🔧 Enhanced error handling for production
if (import.meta.env.PROD) {
  // Set up global error handling for Firebase operations
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('auth/') || event.reason?.code?.startsWith('firestore/')) {
      console.error('🔥 Firebase error:', event.reason);
      // You can send this to your error tracking service
    }
  });
}

// 🆕 Development helpers
if (import.meta.env.DEV) {
  // Make Firebase services available globally for debugging
  window.firebase = {
    app,
    auth,
    db,
    storage,
    analytics,
    AuthService,
    DatabaseService,
    SessionService,
    UserTypeService
  };
  
  console.log('🔧 Development mode: Firebase services available at window.firebase');
}

export default app;
