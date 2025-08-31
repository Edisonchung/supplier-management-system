//src/scripts/setupEcommerceCollections.js
// E-commerce Firestore Collections Setup Script
// Run this to add e-commerce collections to your existing HiggsFlow Firestore

import { 
  collection, 
  doc, 
  addDoc, 
  setDoc,
  serverTimestamp,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase'; // Your existing Firebase config

class EcommerceFirestoreSetup {
  constructor() {
    this.db = db;
    this.results = {
      success: [],
      errors: [],
      collections: []
    };
  }

  async setupEcommerceCollections() {
    console.log('Setting up HiggsFlow E-commerce Collections...');
    console.log('Extending your existing Firestore with e-commerce capabilities\n');

    try {
      // 1. Create e-commerce product catalog
      await this.createProductsPublicCollection();
      
      // 2. Create factory customer accounts
      await this.createFactoriesCollection();
      
      // 3. Create e-commerce orders
      await this.createEcommerceOrdersCollection();
      
      // 4. Create shopping carts
      await this.createShoppingCartsCollection();
      
      // 5. Create marketplace suppliers
      await this.createMarketplaceSuppliersCollection();
      
      // 6. Create sync logs
      await this.createSyncLogCollections();
      
      // 7. Verify existing collections are intact
      await this.verifyExistingCollections();
      
      // 8. Display setup summary
      this.displaySetupSummary();
      
      console.log('\nE-commerce collections setup completed successfully!');
      console.log('Your existing internal system remains completely unchanged');
      
      return this.results;
      
    } catch (error) {
      console.error('Setup failed:', error);
      this.results.errors.push(error.message);
      throw error;
    }
  }

  // ====================================================================
  // 1. E-COMMERCE PRODUCT CATALOG (PUBLIC)
  // ====================================================================

  async createProductsPublicCollection() {
    console.log('Creating products_public collection (E-commerce Catalog)...');

    const sampleProducts = [
      {
        // Link to your internal system
        internalProductId: 'INTERNAL_PROD_001', // Will link to your existing products/
        
        // Customer-facing information
        displayName: 'Industrial Grade Steel Brackets - Heavy Duty (Set of 2)',
        customerDescription: 'Premium steel brackets engineered for heavy-duty industrial applications. Hot-dip galvanized coating provides superior corrosion resistance. Perfect for manufacturing equipment, conveyor systems, and structural support. Includes all mounting hardware and professional installation guide.',
        
        // E-commerce pricing (optimized for customers)
        pricing: {
          listPrice: 485.00,
          discountPrice: 395.00,
          bulkPricing: [
            { minQty: 10, unitPrice: 365.00, discount: '7.6%', savingsPerUnit: 30.00 },
            { minQty: 25, unitPrice: 335.00, discount: '15.2%', savingsPerUnit: 60.00 },
            { minQty: 50, unitPrice: 295.00, discount: '25.3%', savingsPerUnit: 100.00 }
          ],
          currency: 'MYR',
          priceValidUntil: '2025-12-31T23:59:59Z',
          lastPriceUpdate: serverTimestamp()
        },
        
        // AI-Generated Images (Legal & Brand-free)
        images: {
          primary: 'https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=Steel+Bracket',
          technical: 'https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Technical+Specs',
          application: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Industrial+Use',
          gallery: [
            'https://via.placeholder.com/300x300/4F46E5/FFFFFF?text=Angle+1',
            'https://via.placeholder.com/300x300/6366F1/FFFFFF?text=Angle+2',
            'https://via.placeholder.com/300x300/8B5CF6/FFFFFF?text=Dimensions'
          ],
          imageGenerated: true,
          lastImageUpdate: serverTimestamp()
        },
        
        // SEO & Search Optimization
        seo: {
          keywords: ['steel brackets', 'industrial hardware', 'mounting brackets', 'heavy duty brackets', 'galvanized steel'],
          searchTerms: ['bracket', 'steel', 'industrial', 'mounting', 'heavy duty', 'galvanized', 'structural'],
          categoryTags: ['hardware', 'steel', 'brackets', 'industrial', 'mounting', 'structural'],
          metaTitle: 'Heavy Duty Steel Brackets - Industrial Grade | HiggsFlow',
          metaDescription: 'Premium industrial steel brackets with galvanized coating. 500kg load capacity, ISO certified. Perfect for manufacturing and construction applications.',
          searchPriority: 'high'
        },
        
        // Category & Industry Classification
        category: 'Industrial Hardware',
        subcategory: 'Brackets & Mounting Systems',
        industryApplications: ['Manufacturing', 'Construction', 'Automotive', 'Electronics Assembly'],
        productTags: ['heavy-duty', 'galvanized', 'ISO-certified', 'professional-grade'],
        
        // Availability & Stock (synced from internal)
        availability: {
          inStock: true,
          stockLevel: 150,
          reservedStock: 25,
          availableStock: 125,
          leadTime: '3-5 business days',
          supplierStockLevel: 500,
          lastStockUpdate: serverTimestamp(),
          stockStatus: 'good', // good | low | critical | out_of_stock
          nextRestockDate: null
        },
        
        // Technical Specifications
        specifications: {
          material: 'Grade A Carbon Steel',
          dimensions: {
            length: '150mm',
            width: '100mm',
            thickness: '12mm',
            weight: '0.8kg per bracket'
          },
          performance: {
            loadCapacity: '500kg per bracket',
            temperatureRange: '-40°C to +80°C',
            corrosionResistance: 'Hot-dip galvanized coating'
          },
          compliance: ['ISO 9001:2015', 'CE Marking', 'OSHA Approved', 'MS 1525:2019'],
          packageContents: '2 brackets, 8 bolts M12x50, 8 washers, 8 nuts, installation guide, warranty card',
          warranty: '2 years manufacturer warranty'
        },
        
        // Supplier Information (public-facing)
        supplier: {
          name: 'Steel Components Malaysia',
          displayName: 'SCM Industries', // Customer-facing name
          rating: 4.8,
          reviewCount: 247,
          location: 'Johor Bahru, Malaysia',
          verified: true,
          supplierId: 'SUPP-001', // Links to your internal suppliers/
          yearsOfExperience: 25,
          certifications: ['ISO 9001', 'SIRIM Approved'],
          responseTime: '< 2 hours',
          onTimeDelivery: 96.5
        },
        
        // E-commerce Settings
        visibility: 'public', // public | private | draft
        featured: true,
        trending: false,
        newProduct: false,
        minOrderQty: 1,
        maxOrderQty: 1000,
        freeShippingThreshold: 200.00,
        estimatedDelivery: '3-5 business days',
        
        // Customer Analytics (initialized)
        analytics: {
          views: 0,
          uniqueViews: 0,
          inquiries: 0,
          cartAdds: 0,
          orders: 0,
          revenue: 0,
          conversionRate: 0,
          averageRating: 0,
          reviewCount: 0,
          lastViewed: null,
          popularityScore: 0
        },
        
        // Marketing & Promotions
        promotions: {
          onSale: true,
          saleEndDate: '2025-09-30T23:59:59Z',
          freeShipping: false,
          bulkDiscount: true,
          volumeDiscount: true,
          loyaltyPoints: 395, // Points earned = price in RM
          referralBonus: 20 // RM
        },
        
        // Reviews & Ratings (structure for future)
        reviews: {
          enabled: true,
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: {
            5: 0, 4: 0, 3: 0, 2: 0, 1: 0
          },
          lastReviewDate: null
        },
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedAt: null, // Will be set when synced from internal
        lastModifiedBy: 'system_setup',
        version: 1.0,
        dataSource: 'manual_setup' // manual_setup | internal_sync | supplier_feed
      },
      
      {
        internalProductId: 'INTERNAL_PROD_002',
        displayName: 'Professional Safety Goggles - ANSI Z87.1 Certified (Clear Lens)',
        customerDescription: 'High-impact safety goggles with anti-fog coating and UV protection. Essential for welding, grinding, chemical handling, and manufacturing operations. Comfortable hypoallergenic foam padding with fully adjustable elastic strap. Meets ANSI Z87.1-2020 standards.',
        
        pricing: {
          listPrice: 48.00,
          discountPrice: 35.00,
          bulkPricing: [
            { minQty: 20, unitPrice: 32.00, discount: '8.6%', savingsPerUnit: 3.00 },
            { minQty: 50, unitPrice: 28.00, discount: '20%', savingsPerUnit: 7.00 },
            { minQty: 100, unitPrice: 25.00, discount: '28.6%', savingsPerUnit: 10.00 }
          ],
          currency: 'MYR',
          priceValidUntil: '2025-12-31T23:59:59Z',
          lastPriceUpdate: serverTimestamp()
        },
        
        images: {
          primary: 'https://via.placeholder.com/400x400/10B981/FFFFFF?text=Safety+Goggles',
          technical: 'https://via.placeholder.com/400x300/059669/FFFFFF?text=ANSI+Certified',
          application: 'https://via.placeholder.com/400x300/047857/FFFFFF?text=Workplace+Safety',
          gallery: [
            'https://via.placeholder.com/300x300/10B981/FFFFFF?text=Side+View',
            'https://via.placeholder.com/300x300/059669/FFFFFF?text=Packaging'
          ],
          imageGenerated: true,
          lastImageUpdate: serverTimestamp()
        },
        
        seo: {
          keywords: ['safety goggles', 'ANSI certified', 'industrial safety', 'eye protection', 'anti-fog goggles'],
          searchTerms: ['goggles', 'safety', 'protection', 'ANSI', 'Z87.1', 'anti-fog', 'eye wear'],
          categoryTags: ['safety', 'ppe', 'goggles', 'eye protection', 'industrial'],
          metaTitle: 'ANSI Z87.1 Safety Goggles - Anti-Fog Certified | HiggsFlow',
          metaDescription: 'Professional safety goggles with anti-fog coating. ANSI Z87.1 certified for industrial use. Comfortable foam padding, UV protection included.',
          searchPriority: 'high'
        },
        
        category: 'Safety Equipment',
        subcategory: 'Personal Protective Equipment',
        industryApplications: ['Manufacturing', 'Chemical Processing', 'Welding', 'Construction', 'Laboratory'],
        productTags: ['ANSI-certified', 'anti-fog', 'UV-protection', 'comfortable-fit'],
        
        availability: {
          inStock: true,
          stockLevel: 500,
          reservedStock: 50,
          availableStock: 450,
          leadTime: '1-2 business days',
          supplierStockLevel: 2000,
          lastStockUpdate: serverTimestamp(),
          stockStatus: 'good',
          nextRestockDate: null
        },
        
        specifications: {
          certification: 'ANSI Z87.1-2020',
          lensType: 'Polycarbonate with anti-fog coating',
          lensColor: 'Clear (99.9% optical clarity)',
          frameColor: 'Black with safety yellow accents',
          uvProtection: 'UV400 (100% UVA/UVB protection)',
          weight: '85 grams',
          adjustableStrap: 'Elastic with silicone grip points',
          foamPadding: 'Hypoallergenic closed-cell foam seal',
          ventilation: 'Indirect ventilation system',
          temperatureRange: '-5°C to +55°C'
        },
        
        supplier: {
          name: 'Malaysia Safety Solutions',
          displayName: 'SafetyFirst Malaysia',
          rating: 4.9,
          reviewCount: 189,
          location: 'Shah Alam, Selangor',
          verified: true,
          supplierId: 'SUPP-002',
          yearsOfExperience: 15,
          certifications: ['DOSH Approved', 'SIRIM Certified'],
          responseTime: '< 1 hour',
          onTimeDelivery: 98.2
        },
        
        visibility: 'public',
        featured: true,
        trending: true,
        newProduct: false,
        minOrderQty: 1,
        maxOrderQty: 2000,
        freeShippingThreshold: 150.00,
        estimatedDelivery: '1-2 business days',
        
        analytics: {
          views: 0, uniqueViews: 0, inquiries: 0, cartAdds: 0, orders: 0,
          revenue: 0, conversionRate: 0, averageRating: 0, reviewCount: 0,
          lastViewed: null, popularityScore: 0
        },
        
        promotions: {
          onSale: true,
          saleEndDate: '2025-08-31T23:59:59Z',
          freeShipping: true,
          bulkDiscount: true,
          volumeDiscount: true,
          loyaltyPoints: 35,
          referralBonus: 5
        },
        
        reviews: {
          enabled: true,
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          lastReviewDate: null
        },
        
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        syncedAt: null,
        lastModifiedBy: 'system_setup',
        version: 1.0,
        dataSource: 'manual_setup'
      }
    ];

    try {
      for (const product of sampleProducts) {
        const docRef = await addDoc(collection(this.db, 'products_public'), product);
        console.log(`Created: ${product.displayName} (ID: ${docRef.id})`);
        this.results.success.push(`products_public: ${product.displayName}`);
      }
      this.results.collections.push('products_public');
    } catch (error) {
      console.error('Error creating products_public:', error);
      this.results.errors.push(`products_public: ${error.message}`);
    }
  }

  // ====================================================================
  // 2. FACTORY CUSTOMER ACCOUNTS
  // ====================================================================

  async createFactoriesCollection() {
    console.log('Creating factories collection (E-commerce Customers)...');

    const sampleFactories = [
      {
        // Company Profile
        profile: {
          companyName: 'Advanced Manufacturing Sdn Bhd',
          registrationNumber: '198801234567',
          businessType: 'Private Limited Company',
          industry: 'Electronics Manufacturing',
          subIndustry: 'Consumer Electronics Assembly',
          establishedYear: 1988,
          employeeCount: '50-100',
          annualRevenue: 'RM 10M - 50M',
          website: 'https://advancedmfg.com.my',
          description: 'Leading electronics manufacturer specializing in consumer electronics assembly and testing. ISO 9001 certified with 30+ years of experience.'
        },
        
        // Contact Information
        contact: {
          primaryContact: 'Ahmad bin Abdullah',
          designation: 'Procurement Manager',
          email: 'ahmad@advancedmfg.com.my',
          phone: '+60123456789',
          whatsapp: '+60123456789',
          alternateContact: 'Siti Nurhaliza',
          alternateDesignation: 'Assistant Procurement Manager',
          alternateEmail: 'siti@advancedmfg.com.my',
          alternatePhone: '+60187654321',
          preferredContactMethod: 'email',
          timezone: 'Asia/Kuala_Lumpur'
        },
        
        // Physical Address
        address: {
          street: 'Lot 123, Jalan Industri 15',
          area: 'Taman Industri Johor',
          city: 'Johor Bahru',
          state: 'Johor',
          postcode: '81100',
          country: 'Malaysia',
          coordinates: { lat: 1.4655, lng: 103.7578 },
          deliveryInstructions: 'Security checkpoint at main gate. Contact Ahmad for access.',
          warehouseHours: '8:00 AM - 6:00 PM (Monday-Friday)'
        },
        
        // Business Verification
        verification: {
          ssmVerified: true,
          ssmNumber: '198801234567',
          ssmExpiryDate: '2026-12-31',
          businessLicense: 'verified',
          businessLicenseNumber: 'BL-2024-001234',
          taxIdVerified: true,
          taxId: 'C12345678901',
          creditScore: 750, // AI-calculated
          creditRating: 'A',
          verificationDate: serverTimestamp(),
          verifiedBy: 'system_ai',
          documents: [
            'ssm-certificate.pdf',
            'business-license.pdf',
            'bank-statement-3months.pdf',
            'iso-certification.pdf'
          ],
          complianceStatus: 'compliant',
          lastAuditDate: '2024-12-15'
        },
        
        // Procurement Preferences
        preferences: {
          preferredCategories: ['Electronics Components', 'Safety Equipment', 'Testing Tools'],
          preferredSuppliers: ['SUPP-001', 'SUPP-002', 'SUPP-045'],
          budgetRange: {
            monthly: { min: 5000, max: 50000, currency: 'MYR' },
            perOrder: { min: 500, max: 25000, currency: 'MYR' }
          },
          paymentTerms: 'NET 30',
          preferredPaymentMethod: 'Bank Transfer',
          deliveryPreference: 'Standard',
          urgentDeliveryAccepted: true,
          communicationLanguage: ['English', 'Bahasa Malaysia'],
          workingHours: '8:00 AM - 5:30 PM',
          orderFrequency: 'weekly',
          seasonalPatterns: {
            Q1: 'low', Q2: 'medium', Q3: 'high', Q4: 'peak'
          }
        },
        
        // Customer Analytics (AI-powered insights)
        analytics: {
          customerSince: serverTimestamp(),
          totalOrders: 0,
          totalSpent: 0,
          averageOrderValue: 0,
          largestOrder: 0,
          lastOrderDate: null,
          orderFrequency: 0, // orders per month
          paymentReliability: 100, // percentage
          returnRate: 0, // percentage
          preferredOrderDays: [],
          peakOrderHours: [],
          seasonalSpending: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
          topCategories: [],
          customerLifetimeValue: 0,
          riskScore: 'low', // low | medium | high
          growthTrend: 'new', // new | growing | stable | declining
          lastAnalysisDate: serverTimestamp()
        },
        
        // Account Status & Credit
        account: {
          status: 'active', // active | suspended | pending | inactive | under_review
          accountType: 'business', // business | enterprise | vip
          creditLimit: 100000,
          availableCredit: 100000,
          creditTerms: 'NET 30',
          creditHistory: {
            onTimePayments: 0,
            latePayments: 0,
            defaultPayments: 0,
            averagePaymentDays: 0,
            creditUtilization: 0
          },
          accountManager: null,
          vipStatus: false,
          loyaltyTier: 'bronze', // bronze | silver | gold | platinum
          loyaltyPoints: 0,
          membershipStartDate: serverTimestamp()
        },
        
        // Purchase Behavior & Preferences
        behavior: {
          browserPreferences: {
            preferredDevice: 'desktop',
            averageSessionDuration: 0,
            pagesPerSession: 0,
            bounceRate: 0
          },
          purchasePatterns: {
            preferredCategories: [],
            averageItemsPerOrder: 0,
            preferredSuppliers: [],
            priceRangeFocus: 'mid-range',
            qualityVsPrice: 'quality-focused',
            urgencyProfile: 'planned-purchases'
          },
          communicationPreferences: {
            emailNotifications: true,
            smsNotifications: false,
            whatsappNotifications: true,
            callPreferences: 'business-hours-only',
            newsletterSubscribed: true,
            promotionalEmails: true
          }
        },
        
        // Security & Access
        security: {
          lastLoginAt: null,
          loginCount: 0,
          passwordLastChanged: null,
          twoFactorEnabled: false,
          securityQuestions: false,
          ipRestrictions: [],
          accessLevel: 'standard',
          dataPrivacyConsent: true,
          marketingConsent: true,
          consentDate: serverTimestamp()
        },
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActivityAt: null,
        lastModifiedBy: 'system_setup',
        version: 1.0,
        source: 'manual_registration' // manual_registration | referral | marketing_campaign
      }
    ];

    try {
      for (const factory of sampleFactories) {
        const docRef = await addDoc(collection(this.db, 'factories'), factory);
        console.log(`Created: ${factory.profile.companyName} (ID: ${docRef.id})`);
        this.results.success.push(`factories: ${factory.profile.companyName}`);
      }
      this.results.collections.push('factories');
    } catch (error) {
      console.error('Error creating factories:', error);
      this.results.errors.push(`factories: ${error.message}`);
    }
  }

  // ====================================================================
  // 3. E-COMMERCE ORDERS
  // ====================================================================

  async createEcommerceOrdersCollection() {
    console.log('Creating orders_ecommerce collection...');

    // Create structure with sample order
    const sampleOrder = {
      // Order Header
      header: {
        orderNumber: 'ECO-2025-000001',
        factoryId: 'PLACEHOLDER_FACTORY_ID',
        factoryName: 'Sample Factory (Demo Order)',
        orderDate: serverTimestamp(),
        requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: 'draft', // draft | pending | confirmed | processing | shipped | delivered | cancelled
        priority: 'standard', // urgent | high | standard | low
        totalAmount: 0,
        currency: 'MYR',
        orderType: 'standard', // standard | bulk | urgent | sample
        channel: 'website' // website | mobile | api | phone
      },
      
      // Order Items (empty for now - will be populated when customers order)
      items: [],
      
      // Integration with Internal System
      internal: {
        poRef: null, // Will be set when PO is created
        poId: null,
        syncStatus: 'pending', // pending | synced | failed
        syncedAt: null,
        syncError: null,
        lastSyncAttempt: null
      },
      
      // Fulfillment Information
      fulfillment: {
        primarySupplier: null,
        supplierOrderRefs: [],
        estimatedShipDate: null,
        actualShipDate: null,
        trackingNumbers: [],
        shippingCarrier: null,
        shippingMethod: 'Standard Delivery',
        shippingCost: 0,
        deliveryAddress: {},
        deliveryInstructions: '',
        fulfillmentStatus: 'pending', // pending | processing | packed | shipped | delivered
        deliveryDate: null,
        signedBy: null
      },
      
      // Payment Information
      payment: {
        terms: 'NET 30',
        method: 'Bank Transfer', // Bank Transfer | Credit Card | COD
        status: 'pending', // pending | authorized | paid | failed | refunded
        dueDate: null,
        invoiceNumber: null,
        invoiceDate: null,
        paymentDate: null,
        paymentReference: null,
        bankDetails: {
          accountName: 'HiggsFlow Solutions Sdn Bhd',
          accountNumber: '1234567890',
          bankName: 'Maybank',
          bankCode: 'MBBEMYKL',
          reference: 'ECO-2025-000001'
        },
        creditApproval: {
          required: false,
          status: null,
          approvedBy: null,
          approvedDate: null,
          creditAmount: 0
        }
      },
      
      // Customer Communication
      communication: {
        notifications: [],
        messages: [],
        lastContactAt: null,
        preferredLanguage: 'english',
        communicationLog: []
      },
      
      // Order Analytics & Tracking
      analytics: {
        sourceChannel: 'website',
        referralSource: 'direct',
        campaignId: null,
        deviceType: 'desktop',
        browserType: null,
        ipAddress: null,
        sessionId: null,
        processingTime: 0, // seconds from cart to confirmation
        timeToFulfillment: null,
        customerSatisfaction: null,
        conversionValue: 0
      },
      
      // Workflow & Notes
      workflow: {
        currentStage: 'order_created',
        assignedTo: null,
        internalNotes: [],
        customerNotes: '',
        specialInstructions: '',
        flagged: false,
        flagReason: null,
        reviewRequired: false,
        approvalRequired: false
      },
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: 'system_setup',
      lastModifiedBy: 'system_setup',
      version: 1.0,
      isDemo: true
    };

    try {
      const docRef = await addDoc(collection(this.db, 'orders_ecommerce'), sampleOrder);
      console.log(`Created orders_ecommerce collection structure (Sample ID: ${docRef.id})`);
      this.results.success.push('orders_ecommerce: Collection structure created');
      this.results.collections.push('orders_ecommerce');
    } catch (error) {
      console.error('Error creating orders_ecommerce:', error);
      this.results.errors.push(`orders_ecommerce: ${error.message}`);
    }
  }

  // ====================================================================
  // 4. SHOPPING CARTS
  // ====================================================================

  async createShoppingCartsCollection() {
    console.log('Creating shopping_carts collection...');

    const sampleCart = {
      // Cart Owner
      factoryId: 'PLACEHOLDER_FACTORY_ID',
      sessionId: 'SESSION_PLACEHOLDER',
      userId: null, // If user is authenticated
      
      // Cart Items (empty structure)
      items: [],
      
      // Cart Totals
      totals: {
        itemCount: 0,
        subtotal: 0,
        discount: 0,
        discountCode: null,
        tax: 0,
        taxRate: 0.06, // 6% SST
        shipping: 0,
        shippingMethod: null,
        total: 0,
        currency: 'MYR',
        lastCalculated: serverTimestamp()
      },
      
      // Session Information
      session: {
        created: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        deviceInfo: {
          userAgent: '',
          ipAddress: '',
          location: '',
          deviceType: 'unknown',
          browserType: 'unknown'
        },
        pageViews: 0,
        timeSpent: 0 // seconds
      },
      
      // Customer Preferences
      preferences: {
        currency: 'MYR',
        language: 'english',
        notifications: true,
        saveForLater: true,
        autoSave: true
      },
      
      // Saved Items & Wishlist
      savedItems: [],
      wishlistItems: [],
      
      // Checkout Information
      checkout: {
        step: 'cart', // cart | shipping | payment | review | complete
        shippingAddress: null,
        billingAddress: null,
        paymentMethod: null,
        deliveryPreferences: null,
        specialInstructions: ''
      },
      
      // Analytics
      analytics: {
        itemsAdded: 0,
        itemsRemoved: 0,
        quantityChanges: 0,
        priceChecks: 0,
        timeSpent: 0,
        pageViews: 0,
        abandonmentRisk: 'low', // low | medium | high
        lastActivity: serverTimestamp(),
        conversionProbability: 0,
        estimatedValue: 0
      },
      
      // Cart Status
      status: 'active', // active | abandoned | converted | expired
      conversionDate: null,
      orderReference: null,
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastModifiedBy: 'system_setup',
      version: 1.0,
      isDemo: true
    };

    try {
      const docRef = await addDoc(collection(this.db, 'shopping_carts'), sampleCart);
      console.log(`Created shopping_carts collection structure (Sample ID: ${docRef.id})`);
      this.results.success.push('shopping_carts: Collection structure created');
      this.results.collections.push('shopping_carts');
    } catch (error) {
      console.error('Error creating shopping_carts:', error);
      this.results.errors.push(`shopping_carts: ${error.message}`);
    }
  }

  // ====================================================================
  // 5. MARKETPLACE SUPPLIERS
  // ====================================================================

  async createMarketplaceSuppliersCollection() {
    console.log('Creating suppliers_marketplace collection...');

    const sampleSupplier = {
      // Basic Company Profile
      profile: {
        companyName: 'Steel Components Malaysia Sdn Bhd',
        displayName: 'SCM Industries', // Customer-facing name
        registrationNumber: '198765432109',
        businessType: 'Private Limited Company',
        establishedYear: 1987,
        specialization: ['Steel Products', 'Industrial Hardware', 'Custom Fabrication'],
        certifications: ['ISO 9001:2015', 'MS 1525:2019', 'SIRIM Approved'],
        languages: ['English', 'Bahasa Malaysia', 'Mandarin'],
        description: 'Leading steel components manufacturer with 35+ years of experience. Specializing in high-quality industrial hardware and custom fabrication solutions.',
        logo: 'https://via.placeholder.com/200x100/374151/FFFFFF?text=SCM+Logo',
        website: 'https://steelcomponents.com.my'
      },
      
      // Contact Information
      contact: {
        primaryContact: 'Lim Wei Ming',
        designation: 'Sales Director',
        email: 'weiming@steelcomponents.com.my',
        phone: '+6075551234',
        whatsapp: '+60125551234',
        alternateContact: 'Sarah Tan',
        alternateEmail: 'sarah@steelcomponents.com.my',
        alternatePhone: '+6075551235',
        website: 'https://steelcomponents.com.my',
        socialMedia: {
          linkedin: 'https://linkedin.com/company/steel-components-malaysia',
          facebook: null,
          instagram: null
        },
        preferredContactMethod: 'email',
        responseTime: '< 2 hours'
      },
      
      // Business Address
      address: {
        street: '88, Jalan Perindustrian 12',
        area: 'Kawasan Perindustrian Tebrau',
        city: 'Johor Bahru',
        state: 'Johor',
        postcode: '81100',
        country: 'Malaysia',
        coordinates: { lat: 1.4655, lng: 103.7578 },
        warehouseLocation: 'Same as business address',
        servingAreas: ['Johor', 'Selangor', 'Kuala Lumpur', 'Penang']
      },
      
      // Product Catalog Information
      products: {
        totalProducts: 245,
        activeProducts: 238,
        categories: ['Steel Products', 'Brackets & Mounts', 'Fasteners', 'Custom Parts'],
        priceRange: { min: 5.00, max: 5000.00, currency: 'MYR' },
        moq: { min: 1, max: 1000 }, // Minimum Order Quantity
        catalogLastUpdated: serverTimestamp(),
        newProductsThisMonth: 5,
        featuredProducts: [],
        bestSellers: [],
        specialOffers: []
      },
      
      // Performance Metrics
      performance: {
        ratings: {
          overall: 4.8,
          productQuality: 4.9,
          deliveryTime: 4.7,
          communication: 4.8,
          pricing: 4.6,
          customerService: 4.9,
          totalReviews: 156,
          reviewDistribution: { 5: 120, 4: 25, 3: 8, 2: 2, 1: 1 }
        },
        fulfillment: {
          onTimeDelivery: 96.5, // percentage
          averageLeadTime: 4.2, // days
          qualityRejects: 0.8, // percentage
          orderAccuracy: 99.2, // percentage
          lastMonthOrders: 67,
          totalOrders: 1234,
          totalRevenue: 2450000, // RM
          averageOrderValue: 1985 // RM
        },
        financial: {
          creditRating: 'AAA',
          paymentTerms: ['NET 30', 'NET 60', 'COD'],
          annualRevenue: 'RM 5M - 10M',
          yearsInBusiness: 38,
          bankingReferences: ['Maybank', 'CIMB'],
          insuranceCoverage: {
            productLiability: 'RM 5M',
            publicLiability: 'RM 2M',
            professionalIndemnity: 'RM 1M'
          }
        }
      },
      
      // Commission & Payment Structure
      commission: {
        rates: {
          standard: 10.0, // percentage
          volume: 8.5, // for orders > RM 10,000
          exclusive: 12.0, // for exclusive products
          newCustomer: 15.0 // for first-time customers
        },
        terms: 'NET 30',
        minimumCommission: 50.00,
        paymentMethod: 'Bank Transfer',
        lastPayment: null,
        totalCommissionPaid: 0,
        outstandingCommission: 0,
        paymentHistory: []
      },
      
      // Operational Details
      operations: {
        workingHours: '8:00 AM - 6:00 PM (GMT+8)',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        publicHolidays: 'Malaysia Federal Territory',
        emergencyContact: '+60125551235',
        backupContact: 'support@steelcomponents.com.my',
        seasonalShutdown: [],
        capacityStatus: 'normal', // low | normal | high | at_capacity
        leadTimeVariations: {
          peak: '+2 days',
          normal: 'standard',
          slow: '-1 day'
        }
      },
      
      // Integration & Technology
      integration: {
        apiConnected: false,
        inventorySync: 'manual', // manual | daily | real-time
        priceSync: 'daily', // manual | daily | real-time
        orderSync: 'email', // email | api | manual
        catalogSync: 'weekly',
        lastSyncAt: null,
        syncErrors: 0,
        dataFormat: 'excel', // excel | csv | xml | json
        ediCapable: false,
        webPortal: true
      },
      
      // Quality & Compliance
      quality: {
        certifications: ['ISO 9001:2015', 'MS 1525:2019', 'SIRIM Approved'],
        qualityPolicy: 'Committed to delivering products that meet or exceed customer expectations',
        testingCapabilities: ['Material testing', 'Dimensional inspection', 'Surface treatment verification'],
        warrantyPolicy: '2 years manufacturing defects',
        returnPolicy: '30 days with conditions',
        complianceStatus: 'compliant',
        lastAuditDate: '2024-11-15',
        nextAuditDue: '2025-11-15'
      },
      
      // Marketplace Status
      marketplace: {
        status: 'active', // active | suspended | pending | inactive | under_review
        joinedDate: serverTimestamp(),
        featured: true,
        verified: true,
        tierLevel: 'gold', // bronze | silver | gold | platinum
        exclusiveProducts: false,
        preferredSupplier: true,
        lastActiveAt: serverTimestamp(),
        performanceScore: 95, // out of 100
        contractEndDate: '2025-12-31',
        autoRenewal: true
      },
      
      // Analytics & Insights
      analytics: {
        monthlyStats: {
          orders: 0,
          revenue: 0,
          newCustomers: 0,
          repeatCustomers: 0,
          averageOrderValue: 0,
          conversionRate: 0
        },
        trends: {
          popularProducts: [],
          peakOrderDays: [],
          seasonalPatterns: {},
          customerSegments: []
        },
        feedback: {
          positiveReviews: 0,
          negativeReviews: 0,
          commonComplaints: [],
          improvements: []
        }
      },
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastModifiedBy: 'system_setup',
      createdBy: 'admin',
      version: 1.0,
      isDemo: true
    };

    try {
      const docRef = await addDoc(collection(this.db, 'suppliers_marketplace'), sampleSupplier);
      console.log(`Created: ${sampleSupplier.profile.companyName} (ID: ${docRef.id})`);
      this.results.success.push(`suppliers_marketplace: ${sampleSupplier.profile.companyName}`);
      this.results.collections.push('suppliers_marketplace');
    } catch (error) {
      console.error('Error creating suppliers_marketplace:', error);
      this.results.errors.push(`suppliers_marketplace: ${error.message}`);
    }
  }

  // ====================================================================
  // 6. SYNC LOG COLLECTIONS
  // ====================================================================

  async createSyncLogCollections() {
    console.log('Creating sync log collections...');

    // Product Sync Log
    const sampleProductSync = {
      syncId: 'SYNC-PROD-001',
      internalProductId: 'INTERNAL_PRODUCT_ID',
      ecommerceProductId: 'ECOMMERCE_PRODUCT_ID',
      syncType: 'create', // create | update | delete | price_update | stock_update
      syncDirection: 'internal_to_ecommerce',
      
      changes: {
        before: {},
        after: {},
        fieldsChanged: [],
        impactLevel: 'low' // low | medium | high
      },
      
      syncStatus: 'success', // pending | success | failed | partial
      syncedAt: serverTimestamp(),
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      
      metadata: {
        triggeredBy: 'scheduled_sync', // manual | scheduled_sync | real_time | api
        processingTime: 245, // milliseconds
        batchId: null,
        systemLoad: 'normal',
        userId: 'system'
      },
      
      validation: {
        preValidation: 'passed',
        postValidation: 'passed',
        dataIntegrity: 'passed',
        businessRules: 'passed'
      }
    };

    // Order Sync Log
    const sampleOrderSync = {
      syncId: 'SYNC-ORDER-001',
      ecommerceOrderId: 'ECOMMERCE_ORDER_ID',
      ecommerceOrderNumber: 'ECO-2025-000001',
      internalPOId: 'INTERNAL_PO_ID',
      internalPONumber: 'PO-2025-000001',
      syncType: 'order_creation',
      
      transformationLog: {
        originalData: {}, // Simplified for storage
        transformedData: {}, // Simplified for storage
        mappingRules: ['map_factory_to_client', 'convert_currency', 'apply_markup'],
        dataLoss: false,
        customFields: []
      },
      
      syncStatus: 'success',
      syncedAt: serverTimestamp(),
      processingTime: 1250, // milliseconds
      
      validation: {
        dataIntegrity: 'passed',
        businessRules: 'passed',
        priceValidation: 'passed',
        stockValidation: 'passed',
        creditValidation: 'passed',
        complianceCheck: 'passed'
      },
      
      workflow: {
        currentStage: 'completed',
        approvalRequired: false,
        notifications: ['customer_email', 'internal_team'],
        escalations: []
      },
      
      metrics: {
        conversionAccuracy: 100, // percentage
        dataCompleteness: 100, // percentage
        processingEfficiency: 95, // percentage
        errorCount: 0
      }
    };

    try {
      // Create product sync log
      const productSyncRef = await addDoc(collection(this.db, 'product_sync_log'), sampleProductSync);
      console.log(`Created product_sync_log collection (Sample ID: ${productSyncRef.id})`);
      
      // Create order sync log
      const orderSyncRef = await addDoc(collection(this.db, 'order_sync_log'), sampleOrderSync);
      console.log(`Created order_sync_log collection (Sample ID: ${orderSyncRef.id})`);
      
      this.results.success.push('product_sync_log: Collection created');
      this.results.success.push('order_sync_log: Collection created');
      this.results.collections.push('product_sync_log');
      this.results.collections.push('order_sync_log');
      
    } catch (error) {
      console.error('Error creating sync logs:', error);
      this.results.errors.push(`sync_logs: ${error.message}`);
    }
  }

  // ====================================================================
  // 7. VERIFY EXISTING COLLECTIONS
  // ====================================================================

  async verifyExistingCollections() {
    console.log('Verifying existing internal collections remain intact...');

    const existingCollections = [
      'users', 'suppliers', 'products', 'proformaInvoices', 
      'purchaseOrders', 'clientInvoices', 'deliveries', 'settings', 'activityLogs'
    ];

    for (const collectionName of existingCollections) {
      try {
        const snapshot = await getDocs(query(collection(this.db, collectionName), limit(1)));
        const count = snapshot.size > 0 ? 'Has data' : 'Empty';
        console.log(`${collectionName}: ${count}`);
        this.results.success.push(`Verified: ${collectionName}`);
      } catch (error) {
        console.log(`${collectionName}: Could not verify (${error.message})`);
        this.results.errors.push(`Verification failed: ${collectionName}`);
      }
    }
  }

  // ====================================================================
  // 8. SETUP SUMMARY
  // ====================================================================

  displaySetupSummary() {
    console.log('\nE-COMMERCE SETUP SUMMARY');
    console.log('='.repeat(50));
    
    console.log('\nCOLLECTIONS CREATED:');
    this.results.collections.forEach(collection => {
      console.log(`   • ${collection}`);
    });
    
    console.log('\nSUCCESS COUNT:');
    console.log(`   • Successfully created: ${this.results.success.length} items`);
    
    if (this.results.errors.length > 0) {
      console.log('\nERRORS:');
      this.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    console.log('\nNEXT STEPS:');
    console.log('   1. Create Firestore composite indexes (see instructions below)');
    console.log('   2. Update security rules (provided separately)');
    console.log('   3. Test e-commerce functionality');
    console.log('   4. Start product sync service');
    console.log('   5. Begin customer onboarding');
    
    this.displayIndexInstructions();
    this.displaySecurityRulesNote();
  }

  displayIndexInstructions() {
    console.log('\nREQUIRED FIRESTORE COMPOSITE INDEXES:');
    console.log('Go to: https://console.firebase.google.com/project/YOUR_PROJECT/firestore/indexes\n');
    
    const indexes = [
      {
        collection: 'products_public',
        fields: [
          'category ASC',
          'visibility ASC', 
          'availability.inStock ASC',
          'createdAt DESC'
        ]
      },
      {
        collection: 'products_public',
        fields: [
          'seo.categoryTags ARRAY',
          'featured DESC',
          'pricing.discountPrice ASC'
        ]
      },
      {
        collection: 'factories',
        fields: [
          'verification.ssmVerified ASC',
          'account.status ASC',
          'createdAt DESC'
        ]
      },
      {
        collection: 'orders_ecommerce',
        fields: [
          'header.factoryId ASC',
          'header.status ASC',
          'header.orderDate DESC'
        ]
      },
      {
        collection: 'suppliers_marketplace',
        fields: [
          'marketplace.status ASC',
          'marketplace.verified ASC',
          'performance.ratings.overall DESC'
        ]
      }
    ];

    indexes.forEach((index, i) => {
      console.log(`${i + 1}. Collection: ${index.collection}`);
      index.fields.forEach(field => {
        console.log(`   - ${field}`);
      });
      console.log('');
    });
  }

  displaySecurityRulesNote() {
    console.log('SECURITY RULES UPDATE REQUIRED:');
    console.log('Update your Firestore security rules to include e-commerce collections.');
    console.log('Rules will be provided in a separate file.\n');
  }
}

// ====================================================================
// USAGE FUNCTIONS
// ====================================================================

// Main setup function
export const setupEcommerceCollections = async () => {
  const setup = new EcommerceFirestoreSetup();
  
  try {
    const results = await setup.setupEcommerceCollections();
    return results;
  } catch (error) {
    console.error('Setup failed:', error);
    throw error;
  }
};

// Browser-friendly setup (for running in console)
if (typeof window !== 'undefined') {
  window.setupEcommerceCollections = setupEcommerceCollections;
  console.log('E-commerce setup ready!');
  console.log('Run: setupEcommerceCollections()');
}

export default EcommerceFirestoreSetup;
