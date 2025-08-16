// HiggsFlow E-commerce Database Schema Implementation
// File: src/config/firestoreSchema.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, enableNetwork } from 'firebase/firestore';

// Enhanced Firestore collections for e-commerce
export const COLLECTIONS = {
  // Existing internal collections (unchanged)
  INTERNAL: {
    PRODUCTS: 'products',
    SUPPLIERS: 'suppliers', 
    USERS: 'users',
    PURCHASE_ORDERS: 'purchaseOrders',
    PROFORMA_INVOICES: 'proformaInvoices',
    CLIENT_INVOICES: 'clientInvoices',
    DELIVERIES: 'deliveries',
    SETTINGS: 'settings',
    ACTIVITY_LOGS: 'activityLogs'
  },
  
  // New e-commerce collections (public-facing)
  ECOMMERCE: {
    PRODUCTS_PUBLIC: 'products_public',        // Customer-facing product catalog
    FACTORIES: 'factories',                    // Customer accounts (all user types)
    ORDERS_ECOMMERCE: 'orders_ecommerce',      // Customer orders
    SHOPPING_CARTS: 'shopping_carts',          // Shopping cart sessions
    SUPPLIERS_MARKETPLACE: 'suppliers_marketplace', // Partner suppliers
    PRODUCT_CATEGORIES: 'product_categories',   // Category management
    PRODUCT_REVIEWS: 'product_reviews',        // Customer reviews
    WISHLISTS: 'wishlists',                   // Customer wishlists
    QUOTES: 'quotes',                         // Quote requests
    NOTIFICATIONS: 'notifications',            // Real-time notifications
    USER_ANALYTICS: 'user_analytics',         // User behavior tracking
    SEARCH_ANALYTICS: 'search_analytics'      // Search query analytics
  },
  
  // Sync and logging collections
  SYNC: {
    PRODUCT_SYNC_LOG: 'product_sync_log',
    ORDER_SYNC_LOG: 'order_sync_log',
    ERROR_LOGS: 'error_logs',
    SYNC_STATUS: 'sync_status'
  }
};

// Enhanced products_public schema (extends your existing sync)
export const PRODUCTS_PUBLIC_SCHEMA = {
  // Link to internal system
  internalProductId: 'string',     // Reference to internal products/
  
  // Customer-facing information
  displayName: 'string',           // Professional customer-friendly name
  shortDescription: 'string',      // Brief product summary
  fullDescription: 'string',       // Detailed marketing description
  category: 'string',              // Primary category
  subcategory: 'string',          // Secondary classification
  tags: 'array',                  // Searchable tags
  
  // Pricing structure
  pricing: {
    listPrice: 'number',          // Original price
    discountPrice: 'number',      // Current selling price
    discountPercentage: 'number', // Discount amount
    bulkPricing: 'array',         // Quantity-based pricing tiers
    currency: 'string',           // RM/USD
    priceValidUntil: 'timestamp', // Price expiry
    costPrice: 'number',          // Internal cost (admin only)
    margin: 'number'              // Profit margin (admin only)
  },
  
  // Images and media
  images: {
    primary: 'string',            // Main product image URL
    gallery: 'array',             // Additional images
    thumbnail: 'string',          // Small image for lists
    technical: 'string',          // Technical diagram/schematic
    aiGenerated: 'boolean',       // Whether image is AI-generated
    supplierProvided: 'array'     // Supplier-provided images
  },
  
  // Inventory and availability
  inventory: {
    stockStatus: 'string',        // In Stock/Limited/Out of Stock
    availableQuantity: 'number',  // Current stock level
    reservedQuantity: 'number',   // Reserved for orders
    leadTime: 'string',           // Delivery timeframe
    minimumOrderQty: 'number',    // MOQ
    maximumOrderQty: 'number',    // Max per order
    reorderPoint: 'number',       // When to reorder
    location: 'string'            // Storage location
  },
  
  // Supplier information
  supplier: {
    id: 'string',                // Supplier reference
    name: 'string',              // Supplier name
    rating: 'number',            // Supplier rating (1-5)
    location: 'string',          // Supplier location
    verificationStatus: 'string', // Verified/Pending
    responseTime: 'string',       // Typical response time
    certifications: 'array',     // Supplier certifications
    contactInfo: 'object'        // Contact details
  },
  
  // Product specifications
  specifications: 'object',       // Technical specifications
  features: 'array',             // Key features list
  applications: 'array',         // Use cases and applications
  certifications: 'array',       // Quality certifications
  compatibleProducts: 'array',   // Related/compatible items
  
  // SEO and search
  seo: {
    keywords: 'array',           // Search keywords
    metaTitle: 'string',         // SEO title
    metaDescription: 'string',   // SEO description
    searchTerms: 'array',        // Additional search terms
    categoryPath: 'array'        // Breadcrumb path
  },
  
  // Customer engagement
  reviews: {
    averageRating: 'number',     // Average customer rating
    totalReviews: 'number',      // Number of reviews
    lastReviewDate: 'timestamp', // Most recent review
    ratingDistribution: 'object' // Rating breakdown
  },
  
  // Analytics tracking
  analytics: {
    views: 'number',             // Total views
    uniqueViews: 'number',       // Unique viewers
    cartAdds: 'number',          // Times added to cart
    orders: 'number',            // Times ordered
    lastViewed: 'timestamp',     // Last view date
    popularityScore: 'number'    // Calculated popularity
  },
  
  // Business logic
  visibility: 'string',          // public/private/draft
  featured: 'boolean',           // Featured product flag
  trending: 'boolean',           // Trending product flag
  promotion: 'object',           // Promotional campaigns
  status: 'string',             // active/discontinued/seasonal
  
  // Audit trail
  createdAt: 'timestamp',
  updatedAt: 'timestamp',
  lastSyncAt: 'timestamp',
  syncStatus: 'string',         // success/pending/error
  syncErrors: 'array'           // Sync error messages
};

// Multi-user factory/customer schema (supports all user types)
export const FACTORIES_SCHEMA = {
  // User type classification
  userType: 'string',           // factory/system_integrator/trader/oem/consultant/government/educational/global_buyer
  
  // Company information
  companyInfo: {
    name: 'string',
    registrationNumber: 'string', // SSM number or equivalent
    companyType: 'string',        // Sdn Bhd, Corp, LLC, etc.
    industry: 'string',           // Primary industry
    subcategory: 'string',        // Industry subcategory
    website: 'string',
    establishedYear: 'number',
    description: 'string',        // Company description
    logo: 'string'               // Company logo URL
  },
  
  // Contact information
  contactInfo: {
    address: {
      line1: 'string',
      line2: 'string',
      city: 'string',
      state: 'string',
      postcode: 'string',
      country: 'string'
    },
    phone: 'string',
    email: 'string',
    fax: 'string',
    contactPerson: {
      name: 'string',
      title: 'string',
      email: 'string',
      phone: 'string'
    }
  },
  
  // Business profile (varies by user type)
  businessProfile: {
    employeeCount: 'string',     // Range
    annualRevenue: 'string',     // Range
    mainProducts: 'string',      // What they produce/need
    targetMarkets: 'array',      // Geographic markets
    certifications: 'array',     // Business certifications
    specializations: 'array',    // Areas of expertise
    clientTypes: 'array'        // Types of clients served
  },
  
  // Account status and settings
  accountStatus: {
    verificationStatus: 'string', // pending/verified/suspended
    verificationDate: 'timestamp',
    creditLimit: 'number',       // Approved credit limit
    creditUsed: 'number',        // Currently used credit
    paymentTerms: 'string',      // NET 30/60/90, COD, etc.
    riskScore: 'string',         // low/medium/high
    memberSince: 'timestamp',
    lastLogin: 'timestamp',
    accountTier: 'string'        // bronze/silver/gold/platinum
  },
  
  // User type specific data
  typeSpecificData: {
    // For System Integrators
    projectTypes: 'array',       // Types of projects handled
    certifiedBrands: 'array',    // Certified technology brands
    
    // For Traders
    tradingLicenses: 'array',    // Import/export licenses
    preferredCurrencies: 'array',
    
    // For Government
    departmentType: 'string',    // Ministry, agency, GLC
    tenderProcurement: 'boolean',
    
    // For Educational
    institutionType: 'string',   // University, college, school
    studentCount: 'number',
    researchAreas: 'array'
  },
  
  // Preferences and settings
  preferences: {
    preferredCategories: 'array',     // Product categories of interest
    preferredSuppliers: 'array',      // Trusted suppliers
    budgetRanges: 'object',          // Budget by category
    deliveryPreferences: {
      preferredTime: 'string',
      urgencyLevel: 'string',
      consolidatedShipping: 'boolean'
    },
    communicationSettings: {
      emailNotifications: 'boolean',
      smsNotifications: 'boolean',
      marketingEmails: 'boolean',
      priceAlerts: 'boolean'
    },
    languagePreference: 'string',     // en/ms/zh
    currencyPreference: 'string'      // RM/USD/SGD
  },
  
  // Purchase history and analytics
  analytics: {
    totalOrders: 'number',
    totalSpent: 'number',
    averageOrderValue: 'number',
    lastOrderDate: 'timestamp',
    favoriteProducts: 'array',
    frequentCategories: 'array',
    seasonalPatterns: 'object',
    lifetimeValue: 'number'
  },
  
  // Documents and verification
  documents: {
    ssmCertificate: 'string',    // Document URL
    businessLicense: 'string',
    taxCertificate: 'string',
    bankStatement: 'string',
    companyProfile: 'string',
    references: 'array'          // Business references
  }
};

// Enhanced shopping cart schema
export const SHOPPING_CART_SCHEMA = {
  factoryId: 'string',           // Customer reference
  sessionId: 'string',           // For guest users
  userType: 'string',            // User type for pricing logic
  
  items: 'array',                // Cart items
  // Each item structure:
  // {
  //   productId: 'string',
  //   displayName: 'string',
  //   quantity: 'number',
  //   unitPrice: 'number',
  //   listPrice: 'number',
  //   bulkDiscount: 'number',
  //   selectedOptions: 'object',
  //   supplierInfo: 'object',
  //   addedAt: 'timestamp',
  //   notes: 'string',
  //   urgency: 'string'         // standard/urgent/emergency
  // }
  
  totals: {
    subtotal: 'number',
    bulkDiscount: 'number',      // Total bulk discounts
    userTypeDiscount: 'number',  // User type specific discounts
    tax: 'number',               // GST/VAT
    shipping: 'number',
    total: 'number',
    savings: 'number',
    estimatedDelivery: 'string'
  },
  
  shipping: {
    method: 'string',            // standard/express/urgent
    address: 'object',           // Delivery address
    instructions: 'string',      // Special instructions
    consolidate: 'boolean'       // Consolidate with other orders
  },
  
  session: {
    createdAt: 'timestamp',
    lastUpdated: 'timestamp',
    expiresAt: 'timestamp',
    status: 'string',            // active/abandoned/converted
    deviceInfo: 'object',        // Browser/device info
    ipAddress: 'string'
  }
};

// Enhanced e-commerce orders schema
export const ORDERS_ECOMMERCE_SCHEMA = {
  // Order identification
  orderNumber: 'string',         // E-commerce order number
  internalPORef: 'string',       // Link to internal PO system
  quoteRef: 'string',           // Reference to quote if applicable
  
  // Customer information
  factoryId: 'string',
  userType: 'string',           // Customer user type
  customerInfo: {
    companyName: 'string',
    contactPerson: 'object',
    billingAddress: 'object',
    shippingAddress: 'object',
    taxId: 'string'
  },
  
  // Order details
  items: 'array',               // Ordered products with final pricing
  totals: {
    subtotal: 'number',
    discounts: 'number',
    tax: 'number',
    shipping: 'number',
    total: 'number',
    currency: 'string'
  },
  
  // Order status and workflow
  status: 'string',             // pending/confirmed/processing/shipped/delivered/cancelled
  paymentStatus: 'string',      // pending/paid/partial/overdue/failed
  fulfillmentStatus: 'string',  // pending/processing/packed/shipped/delivered
  
  // Timeline tracking
  orderDate: 'timestamp',
  confirmedDate: 'timestamp',
  requiredDate: 'timestamp',
  shippedDate: 'timestamp',
  deliveredDate: 'timestamp',
  
  // Payment and terms
  paymentTerms: 'string',       // Based on user type and credit
  paymentMethod: 'string',      // bank_transfer/credit_card/cheque
  creditApproval: 'object',     // Credit approval details
  
  // Shipping and logistics
  shipping: {
    method: 'string',
    carrier: 'string',
    trackingNumber: 'string',
    estimatedDelivery: 'timestamp',
    actualDelivery: 'timestamp',
    shippingCost: 'number',
    instructions: 'string'
  },
  
  // Additional information
  specialInstructions: 'string',
  internalNotes: 'string',      // Internal team notes
  customerNotes: 'string',      // Customer provided notes
  urgencyLevel: 'string',       // standard/urgent/emergency
  
  // Multi-supplier handling
  suppliers: 'array',           // Multiple suppliers for single order
  splitShipments: 'boolean',    // Whether order ships separately
  
  // Sync and integration
  syncedToInternal: 'boolean',
  syncedAt: 'timestamp',
  syncErrors: 'array',
  integrationStatus: 'string'   // success/pending/failed
};

// Product categories schema
export const PRODUCT_CATEGORIES_SCHEMA = {
  name: 'string',               // Category name
  slug: 'string',               // URL-friendly slug
  description: 'string',        // Category description
  icon: 'string',               // Icon identifier
  image: 'string',              // Category image URL
  parentCategory: 'string',     // Parent category (for subcategories)
  level: 'number',              // Category depth (0 = top level)
  
  // Metadata
  productCount: 'number',       // Number of products in category
  featured: 'boolean',          // Featured category
  displayOrder: 'number',       // Sort order
  
  // SEO
  seo: {
    metaTitle: 'string',
    metaDescription: 'string',
    keywords: 'array'
  },
  
  // User type relevance
  relevantUserTypes: 'array',   // Which user types this category applies to
  
  // Status
  status: 'string',             // active/inactive
  createdAt: 'timestamp',
  updatedAt: 'timestamp'
};

// Enhanced security rules
export const SECURITY_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    function isFactoryOwner(factoryId) {
      return isAuthenticated() && request.auth.uid == factoryId;
    }
    
    function getUserFactoryId() {
      return isAuthenticated() ? 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.factoryId : null;
    }
    
    function isValidUserType(userType) {
      return userType in ['factory', 'system_integrator', 'trader', 'oem', 'consultant', 'government', 'educational', 'global_buyer'];
    }
    
    // Public product catalog - read only for everyone
    match /products_public/{productId} {
      allow read: if resource.data.visibility == 'public';
      allow write: if isAdmin() || 
                  (isAuthenticated() && 
                   get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['manager']);
    }
    
    // Product categories - public read
    match /product_categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Factory accounts - owner and admin access
    match /factories/{factoryId} {
      allow read: if isFactoryOwner(factoryId) || isAdmin();
      allow create: if isAuthenticated() && 
                    request.auth.uid == factoryId &&
                    isValidUserType(request.resource.data.userType);
      allow update: if (isFactoryOwner(factoryId) || isAdmin()) &&
                    isValidUserType(request.resource.data.userType);
    }
    
    // Shopping carts - owner access only
    match /shopping_carts/{cartId} {
      allow read, write: if isAuthenticated() && 
                        (resource.data.factoryId == request.auth.uid ||
                         resource.data.sessionId == request.auth.token.session_id ||
                         isAdmin());
    }
    
    // E-commerce orders - factory owner and admin access
    match /orders_ecommerce/{orderId} {
      allow read: if isAuthenticated() && 
                 (resource.data.factoryId == request.auth.uid ||
                  isAdmin());
      allow create: if isAuthenticated() && 
                   request.resource.data.factoryId == request.auth.uid &&
                   isValidUserType(request.resource.data.userType);
      allow update: if isAdmin();
    }
    
    // Product reviews - authenticated users can create, owners can edit
    match /product_reviews/{reviewId} {
      allow read: if resource.data.approved == true || 
                 resource.data.factoryId == request.auth.uid ||
                 isAdmin();
      allow create: if isAuthenticated() && 
                   request.resource.data.factoryId == request.auth.uid;
      allow update: if (resource.data.factoryId == request.auth.uid || isAdmin());
    }
    
    // Quotes - factory owner and admin access
    match /quotes/{quoteId} {
      allow read, write: if isAuthenticated() && 
                        (resource.data.factoryId == request.auth.uid || isAdmin());
    }
    
    // Wishlists - owner access only
    match /wishlists/{wishlistId} {
      allow read, write: if isAuthenticated() && 
                        resource.data.factoryId == request.auth.uid;
    }
    
    // Analytics - admin only
    match /user_analytics/{analyticsId} {
      allow read, write: if isAdmin();
    }
    
    match /search_analytics/{searchId} {
      allow read, write: if isAdmin();
    }
    
    // Sync logs - admin only
    match /product_sync_log/{logId} {
      allow read, write: if isAdmin();
    }
    
    match /order_sync_log/{logId} {
      allow read, write: if isAdmin();
    }
    
    match /sync_status/{statusId} {
      allow read, write: if isAdmin();
    }
    
    // Notifications - recipient access
    match /notifications/{notificationId} {
      allow read: if isAuthenticated() && 
                 resource.data.recipientId == request.auth.uid;
      allow create, update: if isAdmin();
    }
    
    // Internal collections - existing access rules remain unchanged
    match /products/{productId} {
      allow read, write: if isAuthenticated() && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
    
    match /suppliers/{supplierId} {
      allow read, write: if isAuthenticated() && 
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'manager'];
    }
    
    // Default deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`;

// Required Firestore indexes
export const REQUIRED_INDEXES = [
  // products_public indexes
  {
    collectionGroup: 'products_public',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'visibility', order: 'ASCENDING' },
      { fieldPath: 'category', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'products_public',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'visibility', order: 'ASCENDING' },
      { fieldPath: 'featured', order: 'DESCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'products_public',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'visibility', order: 'ASCENDING' },
      { fieldPath: 'pricing.discountPrice', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'products_public',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'visibility', order: 'ASCENDING' },
      { fieldPath: 'inventory.stockStatus', order: 'ASCENDING' },
      { fieldPath: 'updatedAt', order: 'DESCENDING' }
    ]
  },
  
  // factories indexes
  {
    collectionGroup: 'factories',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'userType', order: 'ASCENDING' },
      { fieldPath: 'accountStatus.verificationStatus', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'factories',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'companyInfo.industry', order: 'ASCENDING' },
      { fieldPath: 'analytics.totalSpent', order: 'DESCENDING' }
    ]
  },
  
  // orders_ecommerce indexes
  {
    collectionGroup: 'orders_ecommerce',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'factoryId', order: 'ASCENDING' },
      { fieldPath: 'orderDate', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'orders_ecommerce',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'status', order: 'ASCENDING' },
      { fieldPath: 'orderDate', order: 'DESCENDING' }
    ]
  },
  {
    collectionGroup: 'orders_ecommerce',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'userType', order: 'ASCENDING' },
      { fieldPath: 'orderDate', order: 'DESCENDING' }
    ]
  },
  
  // shopping_carts indexes
  {
    collectionGroup: 'shopping_carts',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'factoryId', order: 'ASCENDING' },
      { fieldPath: 'session.lastUpdated', order: 'DESCENDING' }
    ]
  },
  
  // product_reviews indexes
  {
    collectionGroup: 'product_reviews',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'productId', order: 'ASCENDING' },
      { fieldPath: 'approved', order: 'ASCENDING' },
      { fieldPath: 'createdAt', order: 'DESCENDING' }
    ]
  }
];

// Database initialization class
export class EcommerceDatabase {
  constructor(firebaseConfig) {
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
  }
  
  // Initialize database with sample data
  async initializeSampleData() {
    console.log('🚀 Initializing e-commerce database...');
    
    // Create sample categories
    const categories = [
      {
        id: 'pumps-fluid',
        name: 'Pumps & Fluid Handling',
        slug: 'pumps-fluid-handling',
        description: 'Industrial pumps, valves, and fluid handling equipment for various applications',
        icon: 'pump',
        productCount: 0,
        featured: true,
        displayOrder: 1,
        relevantUserTypes: ['factory', 'system_integrator', 'oem'],
        status: 'active'
      },
      {
        id: 'electronics',
        name: 'Industrial Electronics',
        slug: 'industrial-electronics',
        description: 'Control systems, sensors, and electronic components for automation',
        icon: 'cpu',
        productCount: 0,
        featured: true,
        displayOrder: 2,
        relevantUserTypes: ['system_integrator', 'factory', 'oem'],
        status: 'active'
      },
      {
        id: 'automation',
        name: 'Automation Equipment',
        slug: 'automation-equipment',
        description: 'Automation systems, drives, and control equipment',
        icon: 'settings',
        productCount: 0,
        featured: true,
        displayOrder: 3,
        relevantUserTypes: ['system_integrator', 'factory', 'consultant'],
        status: 'active'
      },
      {
        id: 'safety',
        name: 'Safety Equipment',
        slug: 'safety-equipment',
        description: 'Industrial safety equipment and protective gear',
        icon: 'shield',
        productCount: 0,
        featured: false,
        displayOrder: 4,
        relevantUserTypes: ['factory', 'government', 'consultant'],
        status: 'active'
      }
    ];
    
    // Create categories
    for (const category of categories) {
      await setDoc(doc(this.db, COLLECTIONS.ECOMMERCE.PRODUCT_CATEGORIES, category.id), {
        ...category,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log('✅ Sample categories created');
    
    // Initialize sync status tracking
    await setDoc(doc(this.db, COLLECTIONS.SYNC.SYNC_STATUS, 'global'), {
      lastSyncAt: new Date(),
      totalProducts: 0,
      syncedProducts: 0,
      syncSuccess: 0,
      syncErrors: 0,
      isRunning: false
    });
    
    console.log('✅ Sync status initialized');
    
    return {
      success: true,
      categoriesCreated: categories.length,
      message: 'E-commerce database initialized successfully'
    };
  }
  
  // Get security rules for deployment
  getSecurityRules() {
    return SECURITY_RULES;
  }
  
  // Get required indexes for deployment
  getRequiredIndexes() {
    return REQUIRED_INDEXES;
  }
  
  // Validate schema compatibility
  async validateSchema() {
    try {
      // Test basic collection access
      const testCollections = [
        COLLECTIONS.ECOMMERCE.PRODUCTS_PUBLIC,
        COLLECTIONS.ECOMMERCE.FACTORIES,
        COLLECTIONS.ECOMMERCE.PRODUCT_CATEGORIES
      ];
      
      for (const collectionName of testCollections) {
        await getDocs(collection(this.db, collectionName));
      }
      
      return { valid: true, message: 'Schema validation successful' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}

// Export for use in application
export default EcommerceDatabase;
