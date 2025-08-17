// src/services/ecommerce/EnhancedEcommerceFirebaseService.js
// Comprehensive Firebase service for HiggsFlow e-commerce platform
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../firebase/config';

class EnhancedEcommerceFirebaseService {
  constructor() {
    this.db = db;
    this.storage = storage;
    this.collections = {
      factories: 'factories',
      products: 'products_public',
      categories: 'product_categories',
      quotes: 'quote_requests',
      orders: 'orders',
      carts: 'shopping_carts',
      reviews: 'product_reviews',
      analytics: 'user_analytics',
      notifications: 'notifications',
      suppliers: 'suppliers',
      inventory: 'inventory',
      pricing: 'pricing_tiers'
    };
  }

  // =====================================
  // FACTORY REGISTRATION & MANAGEMENT
  // =====================================

  /**
   * Register a new factory with comprehensive business validation
   */
  async registerFactory(registrationData, documents = {}) {
    try {
      console.log('🏭 Starting factory registration process...');
      
      // Validate required fields
      this.validateFactoryRegistration(registrationData);
      
      // Check for existing registration
      const existingFactory = await this.checkExistingFactory(registrationData.email);
      if (existingFactory) {
        throw new Error('A factory is already registered with this email address');
      }
      
      // Upload documents if provided
      const documentUrls = await this.uploadFactoryDocuments(documents, registrationData.email);
      
      // Create comprehensive factory profile
      const factoryProfile = {
        // Basic Information
        profile: {
          companyName: registrationData.companyName,
          registrationNumber: registrationData.registrationNumber,
          companyType: registrationData.companyType,
          establishedYear: parseInt(registrationData.establishedYear),
          website: registrationData.website || '',
          industry: registrationData.industry,
          
          // Contact Information
          contactPerson: registrationData.contactPerson,
          designation: registrationData.designation || '',
          email: registrationData.email.toLowerCase(),
          phone: registrationData.phone,
          alternatePhone: registrationData.alternatePhone || '',
          
          // Address
          address: {
            street: registrationData.address,
            city: registrationData.city,
            state: registrationData.state,
            postcode: registrationData.postcode,
            country: registrationData.country || 'Malaysia'
          },
          
          // Business Details
          businessSize: registrationData.businessSize,
          employeeCount: parseInt(registrationData.employeeCount) || 0,
          annualRevenue: registrationData.annualRevenue,
          mainProducts: registrationData.mainProducts || '',
          currentSuppliers: registrationData.suppliers || ''
        },
        
        // Procurement Profile
        procurement: {
          monthlyBudget: registrationData.procurementBudget,
          frequency: registrationData.procurementFrequency || 'monthly',
          preferredPaymentTerms: this.calculateDefaultPaymentTerms(registrationData.annualRevenue),
          creditLimit: 0, // To be set during verification
          creditUtilized: 0,
          totalOrderValue: 0,
          orderCount: 0,
          categories: [],
          preferredSuppliers: [],
          blacklistedSuppliers: []
        },
        
        // Account Status
        status: {
          registrationStatus: 'pending_verification',
          accountStatus: 'inactive',
          verificationStatus: 'pending',
          creditApprovalStatus: 'pending',
          lastStatusUpdate: serverTimestamp(),
          verificationNotes: '',
          rejectionReason: '',
          activatedAt: null,
          suspendedAt: null,
          suspensionReason: ''
        },
        
        // Documents
        documents: {
          businessLicense: documentUrls.businessLicense || null,
          ssmCertificate: documentUrls.ssmCertificate || null,
          bankStatement: documentUrls.bankStatement || null,
          uploadedAt: documentUrls.uploadedAt || null,
          verifiedAt: null,
          verifiedBy: null
        },
        
        // Preferences
        preferences: {
          communicationPreference: registrationData.communicationPreference || 'email',
          newsletterSubscription: registrationData.newsletterSubscription || false,
          emailNotifications: true,
          smsNotifications: false,
          whatsappNotifications: true,
          marketingConsent: registrationData.newsletterSubscription || false,
          language: 'en',
          currency: 'MYR',
          timezone: 'Asia/Kuala_Lumpur'
        },
        
        // Analytics & Behavior
        analytics: {
          registrationSource: 'web_form',
          lastLoginAt: null,
          loginCount: 0,
          sessionCount: 0,
          totalPageViews: 0,
          averageSessionDuration: 0,
          productViewCount: 0,
          searchCount: 0,
          quoteRequestCount: 0,
          orderCompletionRate: 0,
          preferredCategories: [],
          deviceInfo: {
            lastDevice: 'web',
            browsers: [],
            operatingSystems: []
          }
        },
        
        // Security & Compliance
        security: {
          passwordLastChanged: null,
          twoFactorEnabled: false,
          lastPasswordReset: null,
          failedLoginAttempts: 0,
          accountLockedUntil: null,
          ipAddresses: [],
          securityQuestions: false,
          gdprConsent: true,
          pdpaConsent: true,
          consentDate: serverTimestamp(),
          dataRetentionPeriod: '7_years'
        },
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'system_registration',
        lastModifiedBy: 'system_registration',
        version: '1.0'
      };
      
      // Add to database
      const factoryDoc = await addDoc(collection(this.db, this.collections.factories), factoryProfile);
      
      // Create initial analytics record
      await this.createFactoryAnalytics(factoryDoc.id, registrationData);
      
      // Send verification notification
      await this.sendVerificationNotification(factoryDoc.id, registrationData);
      
      console.log('✅ Factory registration completed successfully:', factoryDoc.id);
      
      return {
        success: true,
        factoryId: factoryDoc.id,
        registrationNumber: this.generateRegistrationNumber(),
        estimatedVerificationTime: '24-48 hours',
        nextSteps: [
          'Document verification by our team',
          'Credit assessment and limit setting',
          'Account activation notification',
          'Welcome package delivery'
        ]
      };
      
    } catch (error) {
      console.error('❌ Factory registration failed:', error);
      throw error;
    }
  }

  /**
   * Validate factory registration data
   */
  validateFactoryRegistration(data) {
    const required = [
      'companyName', 'registrationNumber', 'establishedYear', 'industry',
      'contactPerson', 'email', 'phone', 'address', 'city', 'state', 'postcode',
      'businessSize', 'annualRevenue', 'procurementBudget'
    ];
    
    const missing = required.filter(field => !data[field] || data[field].toString().trim() === '');
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    // Email validation
    if (!data.email.includes('@') || !data.email.includes('.')) {
      throw new Error('Invalid email address format');
    }
    
    // Year validation
    const currentYear = new Date().getFullYear();
    if (data.establishedYear < 1900 || data.establishedYear > currentYear) {
      throw new Error('Invalid establishment year');
    }
    
    // Registration number format validation (basic)
    if (data.registrationNumber.length < 8) {
      throw new Error('Registration number appears to be invalid');
    }
  }

  /**
   * Check if factory already exists
   */
  async checkExistingFactory(email) {
    try {
      const q = query(
        collection(this.db, this.collections.factories),
        where('profile.email', '==', email.toLowerCase()),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty ? snapshot.docs[0].data() : null;
    } catch (error) {
      console.error('Error checking existing factory:', error);
      return null;
    }
  }

  /**
   * Upload factory documents to Firebase Storage
   */
  async uploadFactoryDocuments(documents, email) {
    const documentUrls = {};
    const uploadPromises = [];
    
    if (documents.businessLicense) {
      uploadPromises.push(
        this.uploadDocument(documents.businessLicense, `factory-docs/${email}/business-license`)
          .then(url => documentUrls.businessLicense = url)
      );
    }
    
    if (documents.ssmCertificate) {
      uploadPromises.push(
        this.uploadDocument(documents.ssmCertificate, `factory-docs/${email}/ssm-certificate`)
          .then(url => documentUrls.ssmCertificate = url)
      );
    }
    
    if (documents.bankStatement) {
      uploadPromises.push(
        this.uploadDocument(documents.bankStatement, `factory-docs/${email}/bank-statement`)
          .then(url => documentUrls.bankStatement = url)
      );
    }
    
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
      documentUrls.uploadedAt = serverTimestamp();
    }
    
    return documentUrls;
  }

  /**
   * Upload individual document
   */
  async uploadDocument(file, path) {
    try {
      const fileName = `${path}-${Date.now()}.${file.name.split('.').pop()}`;
      const documentRef = storageRef(this.storage, fileName);
      
      const snapshot = await uploadBytes(documentRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Document uploaded:', fileName);
      return downloadURL;
    } catch (error) {
      console.error('❌ Document upload failed:', error);
      throw new Error(`Failed to upload ${path}: ${error.message}`);
    }
  }

  /**
   * Calculate default payment terms based on revenue
   */
  calculateDefaultPaymentTerms(annualRevenue) {
    const revenueMap = {
      'Below RM 300K': 'NET 15',
      'RM 300K - RM 3M': 'NET 30',
      'RM 3M - RM 20M': 'NET 45',
      'RM 20M - RM 50M': 'NET 60',
      'Above RM 50M': 'NET 90'
    };
    
    return revenueMap[annualRevenue] || 'NET 30';
  }

  /**
   * Generate registration number
   */
  generateRegistrationNumber() {
    const prefix = 'HF';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `${prefix}${year}${month}${random}`;
  }

  // =====================================
  // FACTORY AUTHENTICATION & LOGIN
  // =====================================

  /**
   * Authenticate factory login
   */
  async authenticateFactory(email, password) {
    try {
      // In a real implementation, this would verify against Firebase Auth
      // For now, we'll simulate the authentication process
      
      const factory = await this.getFactoryByEmail(email);
      
      if (!factory) {
        throw new Error('Factory not found. Please check your email address.');
      }
      
      if (factory.status.accountStatus !== 'active') {
        throw new Error(`Account is ${factory.status.accountStatus}. Please contact support.`);
      }
      
      // Update login analytics
      await this.updateFactoryLoginAnalytics(factory.id);
      
      return {
        success: true,
        factory: {
          id: factory.id,
          companyName: factory.profile.companyName,
          email: factory.profile.email,
          accountStatus: factory.status.accountStatus,
          creditLimit: factory.procurement.creditLimit,
          creditUtilized: factory.procurement.creditUtilized
        },
        sessionData: {
          loginTime: new Date().toISOString(),
          sessionId: this.generateSessionId()
        }
      };
      
    } catch (error) {
      console.error('❌ Factory authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get factory by email
   */
  async getFactoryByEmail(email) {
    try {
      const q = query(
        collection(this.db, this.collections.factories),
        where('profile.email', '==', email.toLowerCase()),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error fetching factory by email:', error);
      throw error;
    }
  }

  /**
   * Update factory login analytics
   */
  async updateFactoryLoginAnalytics(factoryId) {
    try {
      const factoryRef = doc(this.db, this.collections.factories, factoryId);
      
      await updateDoc(factoryRef, {
        'analytics.lastLoginAt': serverTimestamp(),
        'analytics.loginCount': increment(1),
        'updatedAt': serverTimestamp()
      });
      
    } catch (error) {
      console.error('Error updating login analytics:', error);
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // =====================================
  // PRODUCT CATALOG MANAGEMENT
  // =====================================

  /**
   * Get public product catalog with filtering and pagination
   */
  async getPublicCatalog(filters = {}) {
    try {
      const {
        category = 'all',
        searchTerm = '',
        priceRange = [0, 999999],
        inStockOnly = false,
        sortBy = 'relevance',
        page = 1,
        limit: pageLimit = 20
      } = filters;

      let baseQuery = collection(this.db, this.collections.products);
      const constraints = [];

      // Category filter
      if (category !== 'all' && category !== 'All Categories') {
        constraints.push(where('category', '==', category));
      }

      // Stock filter
      if (inStockOnly) {
        constraints.push(where('inStock', '==', true));
      }

      // Price range filter
      constraints.push(where('price', '>=', priceRange[0]));
      constraints.push(where('price', '<=', priceRange[1]));

      // Sorting
      switch (sortBy) {
        case 'price-low':
          constraints.push(orderBy('price', 'asc'));
          break;
        case 'price-high':
          constraints.push(orderBy('price', 'desc'));
          break;
        case 'rating':
          constraints.push(orderBy('rating', 'desc'));
          break;
        case 'newest':
          constraints.push(orderBy('createdAt', 'desc'));
          break;
        default:
          constraints.push(orderBy('featured', 'desc'), orderBy('rating', 'desc'));
      }

      // Apply limit
      constraints.push(limit(pageLimit));

      const q = query(baseQuery, ...constraints);
      const snapshot = await getDocs(q);

      let products = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Client-side search filtering (for demo purposes)
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        products = products.filter(product => 
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.brand.toLowerCase().includes(searchLower) ||
          product.keywords?.some(keyword => keyword.toLowerCase().includes(searchLower))
        );
      }

      return {
        products,
        totalCount: products.length,
        hasMore: snapshot.docs.length === pageLimit,
        page,
        filters: {
          category,
          searchTerm,
          priceRange,
          inStockOnly,
          sortBy
        }
      };

    } catch (error) {
      console.error('Error fetching public catalog:', error);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  async getProductCategories() {
    try {
      const snapshot = await getDocs(collection(this.db, this.collections.categories));
      
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return categories.sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId) {
    try {
      const productDoc = await getDoc(doc(this.db, this.collections.products, productId));
      
      if (!productDoc.exists()) {
        throw new Error('Product not found');
      }

      const productData = {
        id: productDoc.id,
        ...productDoc.data()
      };

      // Get related products
      const relatedProducts = await this.getRelatedProducts(productData.category, productId);

      // Get product reviews
      const reviews = await this.getProductReviews(productId);

      return {
        ...productData,
        relatedProducts,
        reviews
      };

    } catch (error) {
      console.error('Error fetching product details:', error);
      throw error;
    }
  }

  /**
   * Get related products
   */
  async getRelatedProducts(category, excludeId, limitCount = 4) {
    try {
      const q = query(
        collection(this.db, this.collections.products),
        where('category', '==', category),
        orderBy('rating', 'desc'),
        limit(limitCount + 1)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(product => product.id !== excludeId)
        .slice(0, limitCount);

    } catch (error) {
      console.error('Error fetching related products:', error);
      return [];
    }
  }

  // =====================================
  // SHOPPING CART MANAGEMENT
  // =====================================

  /**
   * Add item to cart (session-based for guests)
   */
  async addToCart(sessionId, productId, quantity = 1, factoryId = null) {
    try {
      const cartRef = doc(this.db, this.collections.carts, sessionId);
      const cartDoc = await getDoc(cartRef);

      const item = {
        productId,
        quantity,
        addedAt: serverTimestamp()
      };

      if (cartDoc.exists()) {
        const cartData = cartDoc.data();
        const existingItemIndex = cartData.items.findIndex(item => item.productId === productId);

        if (existingItemIndex >= 0) {
          // Update existing item
          cartData.items[existingItemIndex].quantity += quantity;
        } else {
          // Add new item
          cartData.items.push(item);
        }

        await updateDoc(cartRef, {
          items: cartData.items,
          updatedAt: serverTimestamp(),
          itemCount: cartData.items.reduce((sum, item) => sum + item.quantity, 0)
        });
      } else {
        // Create new cart
        await updateDoc(cartRef, {
          factoryId: factoryId || null,
          sessionId,
          items: [item],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          itemCount: quantity,
          status: 'active'
        });
      }

      console.log('✅ Item added to cart:', productId);
      return { success: true };

    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      throw error;
    }
  }

  /**
   * Get cart contents
   */
  async getCart(sessionId) {
    try {
      const cartDoc = await getDoc(doc(this.db, this.collections.carts, sessionId));
      
      if (!cartDoc.exists()) {
        return {
          items: [],
          itemCount: 0,
          totalValue: 0
        };
      }

      const cartData = cartDoc.data();
      
      // Get product details for each cart item
      const itemsWithDetails = await Promise.all(
        cartData.items.map(async (item) => {
          const productDoc = await getDoc(doc(this.db, this.collections.products, item.productId));
          if (productDoc.exists()) {
            const productData = productDoc.data();
            return {
              ...item,
              product: {
                id: productDoc.id,
                name: productData.name,
                price: productData.price,
                image: productData.images?.[0] || productData.image,
                inStock: productData.inStock,
                brand: productData.brand
              },
              subtotal: productData.price * item.quantity
            };
          }
          return null;
        })
      );

      const validItems = itemsWithDetails.filter(item => item !== null);
      const totalValue = validItems.reduce((sum, item) => sum + item.subtotal, 0);

      return {
        ...cartData,
        items: validItems,
        itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
        totalValue
      };

    } catch (error) {
      console.error('Error fetching cart:', error);
      throw error;
    }
  }

  // =====================================
  // QUOTE REQUEST MANAGEMENT
  // =====================================

  /**
   * Create quote request
   */
  async createQuoteRequest(quoteData) {
    try {
      const quoteRequest = {
        ...quoteData,
        status: 'pending',
        quoteNumber: this.generateQuoteNumber(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        responses: [],
        totalEstimatedValue: 0,
        expectedResponseTime: '24-48 hours'
      };

      const quoteDoc = await addDoc(collection(this.db, this.collections.quotes), quoteRequest);
      
      // Send notification to admin
      await this.sendQuoteNotification(quoteDoc.id, quoteRequest);

      console.log('✅ Quote request created:', quoteDoc.id);
      
      return {
        success: true,
        quoteId: quoteDoc.id,
        quoteNumber: quoteRequest.quoteNumber,
        expectedResponse: quoteRequest.expectedResponseTime
      };

    } catch (error) {
      console.error('❌ Error creating quote request:', error);
      throw error;
    }
  }

  /**
   * Generate quote number
   */
  generateQuoteNumber() {
    const prefix = 'QT';
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const day = new Date().getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `${prefix}${year}${month}${day}${random}`;
  }

  // =====================================
  // ANALYTICS & NOTIFICATIONS
  // =====================================

  /**
   * Create factory analytics record
   */
  async createFactoryAnalytics(factoryId, registrationData) {
    try {
      const analyticsData = {
        factoryId,
        registrationDate: serverTimestamp(),
        source: 'web_registration',
        industry: registrationData.industry,
        businessSize: registrationData.businessSize,
        annualRevenue: registrationData.annualRevenue,
        state: registrationData.state,
        acquisitionChannel: 'organic',
        initialProcurementBudget: registrationData.procurementBudget
      };

      await addDoc(collection(this.db, this.collections.analytics), analyticsData);
    } catch (error) {
      console.error('Error creating analytics record:', error);
    }
  }

  /**
   * Send verification notification
   */
  async sendVerificationNotification(factoryId, registrationData) {
    try {
      const notification = {
        type: 'factory_registration',
        factoryId,
        title: 'New Factory Registration',
        message: `${registrationData.companyName} has registered for verification`,
        data: {
          companyName: registrationData.companyName,
          email: registrationData.email,
          industry: registrationData.industry,
          registrationNumber: registrationData.registrationNumber
        },
        priority: 'high',
        createdAt: serverTimestamp(),
        readAt: null,
        actionRequired: true,
        assignedTo: 'verification_team'
      };

      await addDoc(collection(this.db, this.collections.notifications), notification);
    } catch (error) {
      console.error('Error sending verification notification:', error);
    }
  }

  /**
   * Send quote notification
   */
  async sendQuoteNotification(quoteId, quoteData) {
    try {
      const notification = {
        type: 'quote_request',
        quoteId,
        title: 'New Quote Request',
        message: `Quote request received for ${quoteData.items?.length || 0} items`,
        data: quoteData,
        priority: 'medium',
        createdAt: serverTimestamp(),
        readAt: null,
        actionRequired: true,
        assignedTo: 'sales_team'
      };

      await addDoc(collection(this.db, this.collections.notifications), notification);
    } catch (error) {
      console.error('Error sending quote notification:', error);
    }
  }

  /**
   * Get product reviews
   */
  async getProductReviews(productId, limitCount = 10) {
    try {
      const q = query(
        collection(this.db, this.collections.reviews),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    } catch (error) {
      console.error('Error fetching product reviews:', error);
      return [];
    }
  }

  // =====================================
  // UTILITY METHODS
  // =====================================

  /**
   * Initialize e-commerce collections with sample data
   */
  async initializeEcommerceData() {
    try {
      console.log('🚀 Initializing HiggsFlow e-commerce data...');
      
      // Create sample products if none exist
      const productsSnapshot = await getDocs(collection(this.db, this.collections.products));
      if (productsSnapshot.empty) {
        await this.createSampleProducts();
      }
      
      // Create categories if none exist
      const categoriesSnapshot = await getDocs(collection(this.db, this.collections.categories));
      if (categoriesSnapshot.empty) {
        await this.createSampleCategories();
      }
      
      console.log('✅ E-commerce data initialization completed');
      return { success: true };
      
    } catch (error) {
      console.error('❌ E-commerce data initialization failed:', error);
      throw error;
    }
  }

  /**
   * Create sample products
   */
  async createSampleProducts() {
    const sampleProducts = [
      {
        name: "ABB ACS580 Variable Frequency Drive",
        brand: "ABB",
        category: "Electronics",
        price: 1850,
        originalPrice: 2100,
        description: "High-performance VFD for industrial applications with advanced motor control features.",
        features: ["3-phase input", "IP20 enclosure", "Built-in EMC filter"],
        specifications: {
          "Power Rating": "5.5 kW",
          "Input Voltage": "380-480V",
          "Protection": "IP20"
        },
        images: ["/api/placeholder/300/200"],
        rating: 4.8,
        reviewCount: 124,
        inStock: true,
        stockQuantity: 15,
        leadTime: "3-5 days",
        supplierId: "supplier_001",
        supplierName: "Industrial Automation Sdn Bhd",
        keywords: ["VFD", "variable frequency drive", "motor control", "ABB"],
        featured: true,
        createdAt: serverTimestamp()
      }
      // Add more sample products as needed
    ];

    const batch = writeBatch(this.db);
    
    sampleProducts.forEach(product => {
      const docRef = doc(collection(this.db, this.collections.products));
      batch.set(docRef, product);
    });

    await batch.commit();
    console.log('✅ Sample products created');
  }

  /**
   * Create sample categories
   */
  async createSampleCategories() {
    const sampleCategories = [
      { name: "Electronics", order: 1, icon: "circuit-board", description: "Electronic components and systems" },
      { name: "Mechanical", order: 2, icon: "gear", description: "Mechanical parts and machinery" },
      { name: "Safety", order: 3, icon: "shield", description: "Safety equipment and protective gear" },
      { name: "Tools", order: 4, icon: "wrench", description: "Hand tools and power tools" },
      { name: "Hydraulics", order: 5, icon: "hydraulics", description: "Hydraulic systems and components" },
      { name: "Pneumatics", order: 6, icon: "pneumatics", description: "Pneumatic systems and components" }
    ];

    const batch = writeBatch(this.db);
    
    sampleCategories.forEach(category => {
      const docRef = doc(collection(this.db, this.collections.categories));
      batch.set(docRef, { ...category, createdAt: serverTimestamp() });
    });

    await batch.commit();
    console.log('✅ Sample categories created');
  }
}

export default new EnhancedEcommerceFirebaseService();
