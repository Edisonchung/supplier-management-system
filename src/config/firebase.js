// src/config/firebase.js - Updated with CORS fixes and Smart Catalog integration
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

// 🔥 ENHANCED: More robust timestamp conversion
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
    
    console.warn('🕐 Unknown timestamp format:', timestamp);
    return null;
  } catch (error) {
    console.error('❌ Error converting timestamp:', error);
    return null;
  }
};

// 🔥 ENHANCED: Document transformation with better error handling
export const transformFirestoreDoc = (doc) => {
  if (!doc) return null;
  
  let data;
  if (typeof doc.data === 'function') {
    data = doc.data();
  } else if (doc.data && typeof doc.data === 'object') {
    data = doc.data;
  } else {
    console.warn('📄 Unknown document format:', doc);
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
      console.warn(`⚠️ Error transforming field ${key}:`, error);
      transformed[key] = value;
    }
  });
  
  return transformed;
};

// 🔥 ENHANCED: Advanced CORS-aware operation wrapper
export const safeFirestoreOperation = async (operation, operationName, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      const isCORSError = error.message?.includes('CORS') || 
                         error.message?.includes('access control') ||
                         error.message?.includes('XMLHttpRequest cannot load') ||
                         error.code === 'unavailable' ||
                         error.code === 'deadline-exceeded';

      if (isCORSError) {
        console.warn(`🌐 CORS issue detected in ${operationName} (attempt ${attempt}/${retries})`);
        
        if (attempt === retries) {
          return {
            success: false,
            error: 'NETWORK_ERROR',
            corsIssue: true,
            message: 'Connection issue detected. The operation will continue in offline mode.'
          };
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
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

// 🔥 ENHANCED: Firestore initialization with maximum CORS protection
const initializeFirestoreWithCORS = (app) => {
  try {
    // Method 1: Force offline-first mode with HTTP polling and modern cache settings
    const db = initializeFirestore(app, {
      experimentalForceLongPolling: true,           // Force HTTP polling instead of WebSocket
      ignoreUndefinedProperties: true,              // Handle undefined values
      merge: true,                                  // Merge configurations
      useFetchStreams: false,                       // Disable fetch streams
      experimentalTabSynchronization: false,        // Disable tab sync
      experimentalAutoDetectLongPolling: false,     // Force long polling
      // 🔥 NEW: Modern cache configuration (replaces enableIndexedDbPersistence)
      cache: {
        kind: 'persistent',
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      }
    });
    
    // Note: enableIndexedDbPersistence is deprecated, using cache settings in initializeFirestore instead
    
    console.log('🔥 Firestore initialized with maximum CORS protection');
    return db;
    
  } catch (error) {
    console.warn('⚠️ Advanced Firestore init failed, trying basic mode:', error.message);
    
    try {
      // Fallback to basic getFirestore
      const db = getFirestore(app);
      console.log('🔥 Firestore fallback mode with CORS protection');
      return db;
    } catch (fallbackError) {
      console.error('❌ All Firestore initialization methods failed:', fallbackError);
      return getFirestore(app);
    }
  }
};

// 🔥 NEW: CORS-safe real-time listener
export const createCORSSafeListener = (query, callback, errorCallback) => {
  let retryCount = 0;
  const maxRetries = 3;
  
  const createListener = () => {
    try {
      return onSnapshot(query, callback, (error) => {
        const isCORSError = error.message?.includes('CORS') || 
                           error.message?.includes('access control') ||
                           error.code === 'unavailable';
        
        if (isCORSError && retryCount < maxRetries) {
          retryCount++;
          console.warn(`🌐 Real-time listener CORS error, retrying... (${retryCount}/${maxRetries})`);
          
          setTimeout(() => {
            createListener();
          }, Math.pow(2, retryCount) * 1000);
        } else if (errorCallback) {
          errorCallback(error);
        }
      });
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
  
  // 🔥 USE CORS-PROTECTED INITIALIZATION
  db = initializeFirestoreWithCORS(app);
  
  // Initialize other services
  auth = getAuth(app);
  storage = getStorage(app);
  
  // Analytics with enhanced error handling
  if (import.meta.env.PROD && firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
      console.log('📊 Firebase Analytics initialized');
    } catch (error) {
      console.warn('⚠️ Analytics initialization failed:', error.message);
      analytics = null;
    }
  } else {
    analytics = null;
  }
  
  console.log('🔥 Firebase initialized with advanced CORS protection');
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
  
  console.log('♻️ Using existing Firebase instance');
}

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  try {
    if (!db._delegate._databaseId.database.includes('emulator')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔥 Connected to Firestore emulator');
    }
    
    if (!storage._location) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('📁 Connected to Storage emulator');
    }
  } catch (error) {
    console.warn('⚠️ Firebase emulators already connected or not available:', error.message);
  }
}

// 🔥 ENHANCED: Authentication Service
export class AuthService {
  static async signInAsGuest() {
    return safeFirestoreOperation(async () => {
      const result = await signInAnonymously(auth);
      console.log('👤 Guest user signed in:', result.user.uid);
      return result.user;
    }, 'Guest Sign In');
  }

  static async signInFactory(email, password) {
    return safeFirestoreOperation(async () => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('🏭 Factory user signed in:', result.user.email);
      return result.user;
    }, 'Factory Sign In');
  }

  static async signInAdmin(email, password) {
    return safeFirestoreOperation(async () => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('👨‍💼 Admin user signed in:', result.user.email);
      return result.user;
    }, 'Admin Sign In');
  }

  static async signInWithGoogle() {
    return safeFirestoreOperation(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      console.log('🔐 Google sign-in successful:', result.user.email);
      return result.user;
    }, 'Google Sign In');
  }

  static async createFactoryAccount(email, password, factoryData) {
    return safeFirestoreOperation(async () => {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(result.user, {
        displayName: factoryData.companyName || factoryData.contactPersonName
      });

      console.log('🏭 Factory account created:', result.user.email);
      return result.user;
    }, 'Create Factory Account');
  }

  static async signOutUser() {
    return safeFirestoreOperation(async () => {
      await signOut(auth);
      console.log('👋 User signed out successfully');
    }, 'Sign Out');
  }

  static async resetPassword(email) {
    return safeFirestoreOperation(async () => {
      await sendPasswordResetEmail(auth, email);
      console.log('📧 Password reset email sent to:', email);
    }, 'Password Reset');
  }

  static getCurrentUser() {
    return auth.currentUser;
  }

  static onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

// 🔥 ENHANCED: Database Service with CORS handling
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

// 🔥 ENHANCED: Session Management
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
    localStorage.removeItem('higgsflow_session_interactions');
    console.log('🗑️ Guest session cleared');
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

// 🔥 ENHANCED: User Type Detection
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

// 🔥 NEW: Smart Catalog Service for real data integration
export class SmartCatalogService {
  static async searchProducts(searchParams = {}) {
    return safeFirestoreOperation(async () => {
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

      let catalogQuery = query(
        collection(db, 'catalogProducts'),
        where('isActive', '==', true)
      );

      // Add category filter
      if (category) {
        catalogQuery = query(catalogQuery, where('category', '==', category));
      }

      // Add price range filter
      if (minPrice > 0) {
        catalogQuery = query(catalogQuery, where('price', '>=', minPrice));
      }
      if (maxPrice < 999999) {
        catalogQuery = query(catalogQuery, where('price', '<=', maxPrice));
      }

      // Add sorting
      catalogQuery = query(catalogQuery, orderBy(sortBy, sortOrder));

      // Add pagination
      catalogQuery = query(catalogQuery, limit(pageSize));

      const snapshot = await getDocs(catalogQuery);
      const products = snapshot.docs.map(doc => transformFirestoreDoc(doc));

      console.log('🔍 Smart Catalog search completed:', {
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
  }

  static async getProductById(productId) {
    return safeFirestoreOperation(async () => {
      const docRef = doc(db, 'catalogProducts', productId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return transformFirestoreDoc(docSnap);
      } else {
        throw new Error('Product not found');
      }
    }, 'Get Product By ID');
  }

  static async trackProductView(productId, userId = null) {
    return safeFirestoreOperation(async () => {
      const interaction = {
        type: 'product_view',
        productId,
        userId: userId || SessionService.getOrCreateSessionId(),
        timestamp: Timestamp.now(),
        userAgent: navigator.userAgent,
        ip: 'client-side' // Will be populated server-side
      };

      // Track locally for guests
      SessionService.trackCatalogInteraction({
        ...interaction,
        timestamp: new Date().toISOString()
      });
      
      // Store in Firestore for analytics
      await addDoc(collection(db, 'productViews'), interaction);
      
      console.log('👁️ Product view tracked:', productId);
      return { tracked: true, interaction };
    }, 'Track Product View');
  }

  static async getPopularProducts(limit = 10) {
    return safeFirestoreOperation(async () => {
      // Query products ordered by view count or popularity score
      const popularQuery = query(
        collection(db, 'catalogProducts'),
        where('isActive', '==', true),
        orderBy('viewCount', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(popularQuery);
      const products = snapshot.docs.map(doc => transformFirestoreDoc(doc));

      console.log('📈 Popular products loaded:', products.length);
      return { products, limit };
    }, 'Get Popular Products');
  }

  static async getFeaturedProducts() {
    return safeFirestoreOperation(async () => {
      const featuredQuery = query(
        collection(db, 'catalogProducts'),
        where('isActive', '==', true),
        where('isFeatured', '==', true),
        orderBy('featuredOrder', 'asc')
      );

      const snapshot = await getDocs(featuredQuery);
      const products = snapshot.docs.map(doc => transformFirestoreDoc(doc));

      console.log('⭐ Featured products loaded:', products.length);
      return { products };
    }, 'Get Featured Products');
  }

  static async getCategories() {
    return safeFirestoreOperation(async () => {
      const categoriesQuery = query(
        collection(db, 'productCategories'),
        where('isActive', '==', true),
        orderBy('displayOrder', 'asc')
      );

      const snapshot = await getDocs(categoriesQuery);
      const categories = snapshot.docs.map(doc => transformFirestoreDoc(doc));

      console.log('📂 Categories loaded:', categories.length);
      return { categories };
    }, 'Get Categories');
  }

  static async createRealTimeListener(callback, filters = {}) {
    const { category = null, maxResults = 100 } = filters;
    
    let catalogQuery = query(
      collection(db, 'catalogProducts'),
      where('isActive', '==', true),
      orderBy('updatedAt', 'desc')
    );

    if (category) {
      catalogQuery = query(catalogQuery, where('category', '==', category));
    }

    catalogQuery = query(catalogQuery, limit(maxResults));

    return createCORSSafeListener(
      catalogQuery,
      (snapshot) => {
        const products = snapshot.docs.map(doc => transformFirestoreDoc(doc));
        callback({ success: true, products });
      },
      (error) => {
        console.error('❌ Real-time listener error:', error);
        callback({ success: false, error: error.message });
      }
    );
  }
}

// 🔥 NEW: Factory Profile Service
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
      console.log('🏭 Factory profile updated:', userId);
      
      return { updated: true, userId };
    }, 'Update Factory Profile');
  }

  static async getRecommendations(userId) {
    return safeFirestoreOperation(async () => {
      // Get user profile to understand preferences
      const profile = await this.getFactoryProfile(userId);
      
      // Query products based on preferences
      let recommendQuery = query(
        collection(db, 'catalogProducts'),
        where('isActive', '==', true)
      );

      // Add category filter if user has preferences
      if (profile.data?.preferences?.categories?.length > 0) {
        recommendQuery = query(
          recommendQuery, 
          where('category', 'in', profile.data.preferences.categories)
        );
      }

      recommendQuery = query(recommendQuery, orderBy('rating', 'desc'), limit(20));

      const snapshot = await getDocs(recommendQuery);
      const recommendations = snapshot.docs.map(doc => transformFirestoreDoc(doc));

      console.log('🎯 Recommendations loaded for:', userId, recommendations.length);
      return { recommendations, userId };
    }, 'Get Recommendations');
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

// Enhanced error handling for production
if (import.meta.env.PROD) {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.code?.startsWith('auth/') || 
        event.reason?.code?.startsWith('firestore/') ||
        event.reason?.message?.includes('CORS')) {
      console.error('🔥 Firebase/CORS error:', event.reason);
      
      if (event.reason?.message?.includes('CORS') || 
          event.reason?.message?.includes('access control')) {
        console.warn('🌐 CORS issue detected - switching to offline mode');
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
  
  console.log('🔧 Development mode: Firebase services available at window.firebase');
  console.log('🔥 Smart Catalog services ready for real data integration');
  
  // Test CORS configuration
  window.firebase.testCORS = async () => {
    console.log('🧪 Testing CORS configuration...');
    const result = await SmartCatalogService.searchProducts({ pageSize: 1 });
    console.log('🧪 CORS test result:', result);
    return result;
  };
}

export default app;
