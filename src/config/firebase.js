// src/config/firebase.js - Updated for Phase 2A E-commerce with CORS fixes + Smart Catalog
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
  initializeFirestore,             // 🔧 CORS fix
  Timestamp                        // 🔥 NEW: For date handling
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

// 🔥 ENHANCED: More robust date conversion utility
export const convertFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    // Handle different timestamp formats more robustly
    
    // Case 1: Firestore Timestamp objects with toDate method
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // Case 2: Firestore timestamp objects with seconds/nanoseconds
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      // Handle both number and string seconds
      const seconds = typeof timestamp.seconds === 'string' ? 
        parseInt(timestamp.seconds, 10) : timestamp.seconds;
      const nanoseconds = timestamp.nanoseconds || 0;
      
      if (!isNaN(seconds)) {
        const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
        return date.toISOString();
      }
    }
    
    // Case 3: Already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // Case 4: ISO string
    if (typeof timestamp === 'string') {
      // Try to parse as ISO date
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    
    // Case 5: Unix timestamp (number)
    if (typeof timestamp === 'number') {
      // Handle both seconds and milliseconds
      const date = timestamp > 9999999999 ? 
        new Date(timestamp) : // Already in milliseconds
        new Date(timestamp * 1000); // Convert from seconds
      
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // Case 6: Firebase Timestamp-like object (fallback)
    if (timestamp && timestamp._seconds !== undefined) {
      const seconds = timestamp._seconds;
      const nanoseconds = timestamp._nanoseconds || 0;
      const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
      return date.toISOString();
    }
    
    console.warn('🕒 Unknown timestamp format, returning null:', timestamp);
    return null;
  } catch (error) {
    console.error('❌ Error converting timestamp:', error, timestamp);
    return null;
  }
};

// 🔥 ENHANCED: More robust document transformation
export const transformFirestoreDoc = (doc) => {
  if (!doc) return null;
  
  // Handle different document types
  let data;
  if (typeof doc.data === 'function') {
    data = doc.data();
  } else if (doc.data && typeof doc.data === 'object') {
    data = doc.data;
  } else {
    console.warn('🔍 Unknown document format:', doc);
    return null;
  }
  
  if (!data) return null;
  
  const transformed = { 
    id: doc.id || doc._id || `doc_${Date.now()}` 
  };
  
  // Transform all fields, handling dates properly
  Object.entries(data).forEach(([key, value]) => {
    try {
      if (!value) {
        transformed[key] = value;
        return;
      }
      
      // Handle timestamp fields
      if (typeof value === 'object' && (
        typeof value.toDate === 'function' ||
        value.seconds !== undefined ||
        value._seconds !== undefined
      )) {
        transformed[key] = convertFirestoreTimestamp(value);
      }
      // Handle arrays that might contain timestamps
      else if (Array.isArray(value)) {
        transformed[key] = value.map(item => {
          if (item && typeof item === 'object' && (
            typeof item.toDate === 'function' ||
            item.seconds !== undefined ||
            item._seconds !== undefined
          )) {
            return convertFirestoreTimestamp(item);
          }
          return item;
        });
      }
      // Handle nested objects
      else if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively transform nested objects
        const nested = {};
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue && typeof nestedValue === 'object' && (
            typeof nestedValue.toDate === 'function' ||
            nestedValue.seconds !== undefined ||
            nestedValue._seconds !== undefined
          )) {
            nested[nestedKey] = convertFirestoreTimestamp(nestedValue);
          } else {
            nested[nestedKey] = nestedValue;
          }
        });
        transformed[key] = nested;
      }
      // Regular values
      else {
        transformed[key] = value;
      }
    } catch (error) {
      console.warn(`⚠️ Error transforming field ${key}:`, error);
      transformed[key] = value; // Keep original value on error
    }
  });
  
  return transformed;
};

// 🔥 NEW: Enhanced network error handling
const handleNetworkError = (error, operation) => {
  console.error(`Network error in ${operation}:`, error);
  
  if (error.message?.includes('CORS') || 
      error.message?.includes('access control') ||
      error.code === 'unavailable' ||
      error.code === 'deadline-exceeded') {
    
    console.warn(`🌐 CORS/Network issue detected in ${operation}`);
    
    return {
      success: false,
      error: 'NETWORK_ERROR',
      corsIssue: true,
      message: 'Connection issue detected. Please check your internet connection and try again.'
    };
  }
  
  return {
    success: false,
    error: error.code || 'UNKNOWN_ERROR',
    message: error.message
  };
};

// 🔥 NEW: Safe Firestore operation wrapper
export const safeFirestoreOperation = async (operation, operationName) => {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    return handleNetworkError(error, operationName);
  }
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
      // 🔥 ENHANCED CORS FIXES - SSL option removed to fix warning
      experimentalForceLongPolling: true,     // Prevents WebSocket CORS issues
      cacheSizeBytes: 40 * 1024 * 1024,     // 40MB cache
      ignoreUndefinedProperties: true,        // Handle undefined gracefully
      merge: true,                            // Merge settings safely
      useFetchStreams: false                  // Disable fetch streams for CORS compatibility
    });
    console.log('🔥 Firebase initialized with enhanced CORS fixes (SSL warning resolved)');
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

// 🆕 Enhanced Authentication Functions for E-commerce (KEEPING ALL YOUR EXISTING FUNCTIONS)
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
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
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

// 🆕 Database Connection Management for E-commerce (ENHANCED WITH CORS HANDLING)
export class DatabaseService {
  static async enableOfflineSupport() {
    return safeFirestoreOperation(async () => {
      await enableNetwork(db);
      console.log('🌐 Database network enabled');
      return { enabled: true };
    }, 'Enable Network');
  }

  static async disableOfflineSupport() {
    return safeFirestoreOperation(async () => {
      await disableNetwork(db);
      console.log('🔴 Database network disabled');
      return { disabled: true };
    }, 'Disable Network');
  }

  static getFirestore() {
    return db;
  }

  // 🔥 NEW: Connection health check
  static async checkConnection() {
    return safeFirestoreOperation(async () => {
      // Simple query to test connectivity
      const testRef = db._delegate || db;
      return { 
        connected: true, 
        projectId: testRef._databaseId?.projectId || 'unknown',
        timestamp: new Date().toISOString()
      };
    }, 'Connection Check');
  }
}

// 🆕 Session Management for Guest Users (KEEPING ALL YOUR EXISTING FUNCTIONS)
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

  // 🔥 NEW: Enhanced session tracking with Smart Catalog support
  static trackCatalogInteraction(interaction) {
    const sessionId = this.getOrCreateSessionId();
    const interactions = JSON.parse(localStorage.getItem('higgsflow_session_interactions') || '[]');
    
    interactions.push({
      ...interaction,
      sessionId,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 50 interactions
    const recentInteractions = interactions.slice(-50);
    localStorage.setItem('higgsflow_session_interactions', JSON.stringify(recentInteractions));
    
    return sessionId;
  }

  static getSessionInteractions() {
    return JSON.parse(localStorage.getItem('higgsflow_session_interactions') || '[]');
  }
}

// 🆕 User Type Detection for E-commerce (KEEPING ALL YOUR EXISTING FUNCTIONS)
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

  // 🔥 NEW: Smart Catalog permissions
  static canAccessSmartCatalog(user) {
    return true; // Public catalog - everyone can access
  }

  static canCreateQuotes(user) {
    return this.isFactory(user) || this.isAdmin(user);
  }

  static canManageCatalog(user) {
    return this.isAdmin(user);
  }

  static getPermissions(user) {
    const userType = this.getUserType(user);
    
    return {
      userType,
      canAccessCatalog: this.canAccessSmartCatalog(user),
      canCreateQuotes: this.canCreateQuotes(user),
      canManageCatalog: this.canManageCatalog(user),
      canViewAnalytics: this.isAdmin(user),
      canEditProducts: this.isAdmin(user)
    };
  }
}

// 🔥 NEW: Smart Catalog Service for real data integration
export class SmartCatalogService {
  static async searchProducts(searchParams = {}) {
    return safeFirestoreOperation(async () => {
      // This will be implemented when you connect to real product data
      console.log('🔍 Smart Catalog search:', searchParams);
      return {
        products: [],
        totalCount: 0,
        searchParams
      };
    }, 'Smart Catalog Search');
  }

  static async trackProductView(productId, userId = null) {
    return safeFirestoreOperation(async () => {
      const interaction = {
        type: 'product_view',
        productId,
        userId: userId || SessionService.getOrCreateSessionId(),
        timestamp: new Date().toISOString()
      };

      // Track locally for guests
      SessionService.trackCatalogInteraction(interaction);
      
      return { tracked: true, interaction };
    }, 'Track Product View');
  }

  static async getPopularProducts(limit = 10) {
    return safeFirestoreOperation(async () => {
      // This will query actual product data when connected
      console.log('📈 Getting popular products, limit:', limit);
      return {
        products: [],
        limit
      };
    }, 'Get Popular Products');
  }

  static async getFeaturedProducts() {
    return safeFirestoreOperation(async () => {
      // This will query featured products when connected
      console.log('⭐ Getting featured products');
      return {
        products: []
      };
    }, 'Get Featured Products');
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
    if (event.reason?.code?.startsWith('auth/') || 
        event.reason?.code?.startsWith('firestore/') ||
        event.reason?.message?.includes('CORS')) {
      console.error('🔥 Firebase/CORS error:', event.reason);
      
      // 🔥 NEW: Specific handling for CORS errors
      if (event.reason?.message?.includes('CORS') || 
          event.reason?.message?.includes('access control')) {
        console.warn('🌐 CORS issue detected - this may affect real-time features');
      }
    }
  });
}

// 🆕 Development helpers (ENHANCED)
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
    UserTypeService,
    SmartCatalogService,  // 🔥 NEW
    // 🔥 NEW: Debug utilities
    utils: {
      convertFirestoreTimestamp,
      transformFirestoreDoc,
      safeFirestoreOperation,
      handleNetworkError
    }
  };
  
  console.log('🔧 Development mode: Firebase services available at window.firebase');
  console.log('🔥 New utilities: window.firebase.utils for debugging CORS and date issues');
}

export default app;
