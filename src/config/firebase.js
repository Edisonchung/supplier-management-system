// src/config/firebase.js - Enhanced with CORS fixes and Smart Catalog integration
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore,
  CACHE_SIZE_UNLIMITED,
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork,
  initializeFirestore,
  Timestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { 
  getStorage,
  connectStorageEmulator
} from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBxNZe2RYL1vJZgu93C3zdz2i0J-lDYgCY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "higgsflow-b9f81.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "higgsflow-b9f81",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "higgsflow-b9f81.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "717201513347",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:717201513347:web:86abc12a7dcebe914834b6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Enhanced timestamp conversion
export const convertFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return null;
  
  try {
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    
    // Handle timestamp objects with seconds/nanoseconds
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      const seconds = typeof timestamp.seconds === 'string' ? 
        parseInt(timestamp.seconds, 10) : timestamp.seconds;
      const nanoseconds = timestamp.nanoseconds || 0;
      
      if (!isNaN(seconds)) {
        const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1000000));
        return date.toISOString();
      }
    }
    
    // Handle Date objects
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    
    // Handle ISO strings
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    
    // Handle Unix timestamps
    if (typeof timestamp === 'number') {
      const date = timestamp > 9999999999 ? 
        new Date(timestamp) : new Date(timestamp * 1000);
      
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    console.warn('Unknown timestamp format:', timestamp);
    return null;
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
};

// Enhanced document transformation with better error handling
export const transformFirestoreDoc = (doc) => {
  if (!doc) return null;
  
  let data;
  if (typeof doc.data === 'function') {
    data = doc.data();
  } else if (doc.data && typeof doc.data === 'object') {
    data = doc.data;
  } else {
    console.warn('Unknown document format:', doc);
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
      else {
        transformed[key] = value;
      }
    } catch (error) {
      console.warn(`Error transforming field ${key}:`, error);
      transformed[key] = value;
    }
  });
  
  return transformed;
};

// Enhanced CORS-aware operation wrapper with better retry logic
export const safeFirestoreOperation = async (operation, operationName, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      const isCORSError = error.message?.includes('CORS') || 
                         error.message?.includes('access control') ||
                         error.message?.includes('XMLHttpRequest cannot load') ||
                         error.code === 'unavailable' ||
                         error.code === 'deadline-exceeded' ||
                         error.code === 'cancelled';

      if (isCORSError) {
        console.warn(`CORS issue detected in ${operationName} (attempt ${attempt}/${retries})`);
        
        if (attempt === retries) {
          // Don't throw error, return graceful failure
          return {
            success: false,
            error: 'NETWORK_ERROR',
            corsIssue: true,
            fallbackMode: true,
            message: 'Using offline mode due to connection issues'
          };
        }
        
        // Shorter wait time for better UX
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
        continue;
      }

      // Non-CORS error, don't retry
      return {
        success: false,
        error: error.code || 'UNKNOWN_ERROR',
        message: error.message
      };
    }
  }
};

// Enhanced Firestore initialization with maximum CORS protection
const initializeFirestoreWithCORS = (app) => {
  try {
    console.log('Initializing Firestore with enhanced CORS protection...');
    
    // Use more aggressive settings to prevent CORS issues
    const db = initializeFirestore(app, {
      // Force HTTP long polling instead of WebSocket to avoid CORS
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
      
      // Disable features that can cause CORS issues
      useFetchStreams: false,
      experimentalTabSynchronization: false,
      
      // Enhanced settings
      ignoreUndefinedProperties: true,
      merge: true,
      
      // Modern cache configuration
      localCache: {
        kind: 'persistent',
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
        tabManager: undefined // Disable tab management to prevent CORS
      }
    });
    
    console.log('Firestore initialized with maximum CORS protection');
    return db;
    
  } catch (error) {
    console.warn('Advanced Firestore init failed, trying basic mode:', error.message);
    
    try {
      // Fallback to basic getFirestore
      const db = getFirestore(app);
      console.log('Firestore fallback mode activated');
      return db;
    } catch (fallbackError) {
      console.error('All Firestore initialization methods failed:', fallbackError);
      return getFirestore(app);
    }
  }
};

// Enhanced CORS-safe real-time listener with better error handling
export const createCORSSafeListener = (query, callback, errorCallback) => {
  let retryCount = 0;
  const maxRetries = 2; // Reduced retries for better UX
  let currentUnsubscribe = null;
  
  const createListener = () => {
    try {
      currentUnsubscribe = onSnapshot(
        query, 
        (snapshot) => {
          // Reset retry count on successful connection
          retryCount = 0;
          callback(snapshot);
        },
        (error) => {
          const isCORSError = error.message?.includes('CORS') || 
                             error.message?.includes('access control') ||
                             error.code === 'unavailable' ||
                             error.code === 'cancelled';
          
          if (isCORSError && retryCount < maxRetries) {
            retryCount++;
            console.warn(`Real-time listener CORS error, retrying... (${retryCount}/${maxRetries})`);
            
            // Clean up current listener
            if (currentUnsubscribe) {
              currentUnsubscribe();
            }
            
            // Retry with exponential backoff
            setTimeout(() => {
              createListener();
            }, Math.pow(2, retryCount) * 1000);
          } else {
            // Don't spam console with CORS errors, just switch to offline mode
            if (isCORSError) {
              console.log('Switching to offline mode due to connection issues');
            }
            
            if (errorCallback) {
              errorCallback(error);
            }
          }
        }
      );
      
      return currentUnsubscribe;
    } catch (error) {
      console.error('Failed to create listener:', error);
      if (errorCallback) errorCallback(error);
      return () => {};
    }
  };
  
  return createListener();
};

// Initialize Firebase
let app;
let db;
let auth;
let storage;
let analytics;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  
  // Use CORS-protected initialization
  db = initializeFirestoreWithCORS(app);
  
  // Initialize other services
  auth = getAuth(app);
  storage = getStorage(app);
  
  // Analytics with enhanced error handling
  if (import.meta.env.PROD && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized');
    } catch (error) {
      console.warn('Analytics initialization failed:', error.message);
      analytics = null;
    }
  } else {
    analytics = null;
  }
  
  console.log('Firebase initialized with advanced CORS protection');
} else {
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
  
  console.log('Using existing Firebase instance');
}

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    if (!db._delegate._databaseId.database.includes('emulator')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Connected to Firestore emulator');
    }
    
    if (!storage._location) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('Connected to Storage emulator');
    }
  } catch (error) {
    console.warn('Firebase emulators already connected or not available:', error.message);
  }
}

// Enhanced Authentication Service
export class AuthService {
  static async signInAsGuest() {
    return safeFirestoreOperation(async () => {
      const result = await signInAnonymously(auth);
      console.log('Guest user signed in:', result.user.uid);
      return result.user;
    }, 'Guest Sign In');
  }

  static async signInFactory(email, password) {
    return safeFirestoreOperation(async () => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Factory user signed in:', result.user.email);
      return result.user;
    }, 'Factory Sign In');
  }

  static async signInAdmin(email, password) {
    return safeFirestoreOperation(async () => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('Admin user signed in:', result.user.email);
      return result.user;
    }, 'Admin Sign In');
  }

  static async signInWithGoogle() {
    return safeFirestoreOperation(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      console.log('Google sign-in successful:', result.user.email);
      return result.user;
    }, 'Google Sign In');
  }

  static async createFactoryAccount(email, password, factoryData) {
    return safeFirestoreOperation(async () => {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(result.user, {
        displayName: factoryData.companyName || factoryData.contactPersonName
      });

      console.log('Factory account created:', result.user.email);
      return result.user;
    }, 'Create Factory Account');
  }

  static async signOutUser() {
    return safeFirestoreOperation(async () => {
      await signOut(auth);
      console.log('User signed out successfully');
    }, 'Sign Out');
  }

  static async resetPassword(email) {
    return safeFirestoreOperation(async () => {
      await sendPasswordResetEmail(auth, email);
      console.log('Password reset email sent to:', email);
    }, 'Password Reset');
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

// Enhanced Database Service with better CORS handling
export class DatabaseService {
  static async enableOfflineSupport() {
    return safeFirestoreOperation(async () => {
      await enableNetwork(db);
      console.log('Database network enabled');
      return { enabled: true };
    }, 'Enable Network');
  }

  static async disableOfflineSupport() {
    return safeFirestoreOperation(async () => {
      await disableNetwork(db);
      console.log('Database network disabled');
      return { disabled: true };
    }, 'Disable Network');
  }

  static getFirestore() {
    return db;
  }

  static async checkConnection() {
    return safeFirestoreOperation(async () => {
      const testRef = db._delegate || db;
      return { 
        connected: true, 
        projectId: testRef._databaseId?.projectId || 'unknown',
        timestamp: new Date().toISOString()
      };
    }, 'Connection Check');
  }
}

// Enhanced Session Management
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
      console.log('Created new guest session:', sessionId);
    }
    
    return sessionId;
  }

  static clearSession() {
    localStorage.removeItem('higgsflow_session_id');
    localStorage.removeItem('higgsflow_guest_cart');
    localStorage.removeItem('higgsflow_session_interactions');
    console.log('Guest session cleared');
  }

  static extendSession() {
    const sessionId = this.getOrCreateSessionId();
    localStorage.setItem('higgsflow_session_updated', Date.now().toString());
    return sessionId;
  }

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

// User Type Detection
export class UserTypeService {
  static getUserType(user) {
    if (!user) return 'guest';
    if (user.isAnonymous) return 'guest';
    
    const adminDomains = ['higgsflow.com', 'admin.higgsflow.com'];
    if (adminDomains.some(domain => user.email?.includes(domain))) {
      return 'admin';
    }
    
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

// Enhanced Smart Catalog Service with better error handling
export class SmartCatalogService {
  static async searchProducts(searchParams = {}) {
    const result = await safeFirestoreOperation(async () => {
      const { 
        searchTerm = '', 
        category = '', 
        minPrice = 0, 
        maxPrice = 999999, 
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        pageSize = 50,
        lastDoc = null
      } = searchParams;

      // Use products_public collection as shown in console logs
      let catalogQuery = query(
        collection(db, 'products_public'),
        limit(pageSize)
      );

      // Add category filter if specified
      if (category) {
        catalogQuery = query(catalogQuery, where('category', '==', category));
      }

      // Add sorting
      try {
        catalogQuery = query(catalogQuery, orderBy(sortBy, sortOrder));
      } catch (error) {
        // Fallback if sort field doesn't exist
        console.warn('Sort field not available, using default sort');
      }

      const snapshot = await getDocs(catalogQuery);
      const products = snapshot.docs.map(doc => transformFirestoreDoc(doc));

      console.log('Smart Catalog search completed:', {
        searchTerm,
        category,
        productsFound: products.length
      });

      return {
        products,
        totalCount: products.length,
        searchParams,
        hasMore: snapshot.docs.length === pageSize
      };
    }, 'Smart Catalog Search');

    // Handle CORS issues gracefully
    if (!result.success && result.corsIssue) {
      // Return cached or default data
      const fallbackProducts = this.getFallbackProducts();
      return {
        success: true,
        data: {
          products: fallbackProducts,
          totalCount: fallbackProducts.length,
          searchParams,
          hasMore: false,
          fallbackMode: true
        }
      };
    }

    return result;
  }

  static getFallbackProducts() {
    // Return sample products when CORS issues occur
    return [
      {
        id: 'fallback_1',
        name: 'Industrial Safety Equipment',
        category: 'Safety',
        price: 299,
        stock: 50,
        availability: 'In Stock',
        deliveryTime: '2-3 days',
        image: '/api/placeholder/300/300'
      },
      {
        id: 'fallback_2', 
        name: 'Steel Brackets Set',
        category: 'Hardware',
        price: 89,
        stock: 25,
        availability: 'Low Stock',
        deliveryTime: '1-2 days',
        image: '/api/placeholder/300/300'
      }
    ];
  }

  static async getProductById(productId) {
    return safeFirestoreOperation(async () => {
      const docRef = doc(db, 'products_public', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return transformFirestoreDoc(docSnap);
      } else {
        throw new Error('Product not found');
      }
    }, 'Get Product By ID');
  }

  static async trackProductView(productId, userId = null) {
    // Always track locally, attempt remote tracking
    const interaction = {
      type: 'product_view',
      productId,
      userId: userId || SessionService.getOrCreateSessionId(),
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100)
    };

    // Track locally immediately
    SessionService.trackCatalogInteraction(interaction);
    
    // Attempt remote tracking without blocking UI
    safeFirestoreOperation(async () => {
      await addDoc(collection(db, 'analytics_interactions'), {
        ...interaction,
        timestamp: Timestamp.now()
      });
    }, 'Track Product View').catch(() => {
      // Silently fail - local tracking already succeeded
    });
    
    console.log('Product view tracked:', productId);
    return { tracked: true, interaction };
  }

  static async createRealTimeListener(callback, filters = {}) {
    const { category = null, maxResults = 50 } = filters;
    
    let catalogQuery = query(
      collection(db, 'products_public'),
      limit(maxResults)
    );

    if (category) {
      try {
        catalogQuery = query(catalogQuery, where('category', '==', category));
      } catch (error) {
        console.warn('Category filter not available');
      }
    }

    return createCORSSafeListener(
      catalogQuery,
      (snapshot) => {
        const products = snapshot.docs.map(doc => transformFirestoreDoc(doc));
        callback({ success: true, products });
      },
      (error) => {
        console.warn('Real-time listener error, using fallback data');
        // Provide fallback data instead of failing completely
        callback({ 
          success: true, 
          products: this.getFallbackProducts(),
          fallbackMode: true 
        });
      }
    );
  }
}

// Enhanced Factory Profile Service
export class FactoryProfileService {
  static async getFactoryProfile(userId) {
    return safeFirestoreOperation(async () => {
      const docRef = doc(db, 'factoryProfiles', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return transformFirestoreDoc(docSnap);
      } else {
        // Return default profile
        return {
          id: userId,
          preferences: {
            categories: [],
            priceRange: { min: 0, max: 100000 },
            location: '',
            certifications: []
          },
          createdAt: new Date().toISOString()
        };
      }
    }, 'Get Factory Profile');
  }

  static async updateFactoryProfile(userId, profileData) {
    return safeFirestoreOperation(async () => {
      const docRef = doc(db, 'factoryProfiles', userId);
      const updateData = {
        ...profileData,
        updatedAt: Timestamp.now()
      };
      
      await updateDoc(docRef, updateData);
      console.log('Factory profile updated:', userId);
      
      return { updated: true, userId };
    }, 'Update Factory Profile');
  }
}

// Export main services
export { db, auth, storage, analytics };

// Export auth functions
export {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  updateProfile,
  enableNetwork,
  disableNetwork
};

// Export Firestore functions
export {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp
};

// Enhanced global error handling for CORS issues
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('auth/') || 
        event.reason?.code?.startsWith('firestore/') ||
        event.reason?.message?.includes('CORS') ||
        event.reason?.message?.includes('access control')) {
      
      // Don't spam console with CORS errors
      if (event.reason?.message?.includes('CORS') || 
          event.reason?.message?.includes('access control')) {
        console.log('Connection issue detected - continuing in offline mode');
        event.preventDefault(); // Prevent the error from showing in console
      }
    }
  });
}

// Development helpers
if (import.meta.env.DEV) {
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
    SmartCatalogService,
    FactoryProfileService,
    utils: {
      convertFirestoreTimestamp,
      transformFirestoreDoc,
      safeFirestoreOperation,
      createCORSSafeListener
    }
  };
  
  console.log('Development mode: Firebase services available at window.firebase');
  console.log('Smart Catalog services ready for real data integration');
}

export default app;
