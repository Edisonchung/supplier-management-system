// src/services/ecommerce/BusinessRegistrationService.js
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
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';

class BusinessRegistrationService {
  constructor() {
    this.db = db;
    this.collections = {
      businesses: 'businesses', // Renamed from 'factories'
      businessVerification: 'business_verification',
      businessAnalytics: 'business_analytics',
      notifications: 'business_notifications'
    };
  }

  // =====================================
  // BUSINESS REGISTRATION & MANAGEMENT
  // =====================================

  /**
   * Register a new business with comprehensive validation
   */
  async registerBusiness(registrationData, documents = {}) {
    try {
      console.log('🏢 Starting business registration process...', registrationData.businessType);
      
      // Validate required fields based on business type
      this.validateBusinessRegistration(registrationData);
      
      // Check for existing registration
      const existingBusiness = await this.checkExistingBusiness(registrationData.email);
      if (existingBusiness) {
        throw new Error('A business is already registered with this email address');
      }
      
      // Create comprehensive business profile
      const businessProfile = {
        // Business Type & Classification
        businessType: registrationData.businessType, // manufacturer, system_integrator, trader, etc.
        
        // Basic Information
        profile: {
          companyName: registrationData.companyName.trim(),
          registrationNumber: registrationData.registrationNumber?.trim() || '',
          establishedYear: parseInt(registrationData.establishedYear) || new Date().getFullYear(),
          industry: registrationData.industry,
          primaryIndustry: registrationData.industry,
          companySize: registrationData.companySize || '',
          
          // Contact Information
          contactPerson: registrationData.contactPerson.trim(),
          email: registrationData.email.toLowerCase().trim(),
          phone: registrationData.phone.trim(),
          
          // Address Information
          address: registrationData.address.trim(),
          city: registrationData.city?.trim() || '',
          state: registrationData.state || '',
          postcode: registrationData.postcode?.trim() || '',
          country: 'Malaysia' // Default for now
        },
        
        // Business Profile
        businessProfile: {
          annualRevenue: registrationData.annualRevenue || '',
          procurementBudget: registrationData.procurementBudget || '',
          preferredPaymentTerms: registrationData.preferredPaymentTerms || 'NET 30',
          specialRequirements: registrationData.specialRequirements?.trim() || '',
          
          // Business-specific capabilities
          manufacturingCapabilities: registrationData.manufacturingCapabilities || [],
          servicesOffered: registrationData.servicesOffered || [],
          productCategories: registrationData.productCategories || [],
          certifications: registrationData.certifications || []
        },
        
        // Account & Authentication
        authentication: {
          passwordHash: '', // TODO: Implement password hashing
          emailVerified: false,
          phoneVerified: false,
          twoFactorEnabled: false,
          lastLoginAt: null,
          loginAttempts: 0,
          accountLocked: false
        },
        
        // Business Status & Verification
        verification: {
          status: 'pending', // pending, in_review, approved, rejected, suspended
          submittedAt: serverTimestamp(),
          verifiedAt: null,
          verifiedBy: null,
          
          // Document verification
          documentsSubmitted: Object.keys(documents).length > 0,
          documentsVerified: false,
          requiredDocuments: this.getRequiredDocuments(registrationData.businessType),
          
          // Business verification steps
          companyVerified: false, // SSM check
          addressVerified: false, // Address validation
          industryVerified: false, // Industry classification check
          creditAssessed: false, // Credit assessment completed
          
          verificationNotes: '',
          rejectionReason: ''
        },
        
        // Financial Information
        financial: {
          creditLimit: 0,
          currentCredit: 0,
          paymentTerms: registrationData.preferredPaymentTerms || 'NET 30',
          creditScore: null,
          creditAssessmentDate: null,
          
          // Pricing tier assignment
          pricingTier: this.getDefaultPricingTier(registrationData.businessType),
          discountLevel: this.getDefaultDiscountLevel(registrationData.businessType),
          
          // Payment preferences
          preferredPaymentMethods: ['bank_transfer', 'cheque'],
          billingAddress: registrationData.address,
          taxId: registrationData.taxId || ''
        },
        
        // Business Intelligence & AI
        aiProfile: {
          // Will be populated by MCP AI service
          industryInsights: {},
          purchasingPatterns: {},
          riskAssessment: {},
          recommendationProfile: {},
          marketIntelligence: {}
        },
        
        // Analytics & Tracking
        analytics: {
          registrationSource: 'direct_website',
          browserInfo: navigator.userAgent || '',
          referralSource: document.referrer || 'direct',
          registrationFlow: 'business_registration_v2',
          
          // User behavior tracking
          pageViews: 0,
          sessionCount: 0,
          lastActiveAt: serverTimestamp(),
          
          // Business metrics
          quotesRequested: 0,
          ordersPlaced: 0,
          totalSpent: 0,
          averageOrderValue: 0
        },
        
        // Compliance & Legal
        compliance: {
          termsAccepted: true,
          privacyPolicyAccepted: true,
          marketingConsent: false,
          dataProcessingConsent: true,
          pdpaConsent: true,
          
          consentDate: serverTimestamp(),
          dataRetentionPeriod: '7_years',
          
          // Business compliance
          businessLicenseValid: false,
          taxRegistrationValid: false,
          industrialLicenseValid: false
        },
        
        // Account Management
        accountManagement: {
          accountManager: '', // Will be assigned during approval
          accountManagerEmail: '',
          accountTier: 'standard', // standard, premium, vip
          
          // Support preferences
          preferredContactMethod: 'email',
          supportLanguage: 'english',
          timeZone: 'Asia/Kuala_Lumpur',
          
          // Business relationship
          relationshipStartDate: null,
          keyAccountStatus: false,
          strategicPartner: false
        },
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: 'business_registration_system',
        lastModifiedBy: 'business_registration_system',
        version: '2.0',
        
        // System flags
        isActive: true,
        isDeleted: false,
        migrationStatus: 'new_registration'
      };
      
      // Add to database
      const businessDoc = await addDoc(collection(this.db, this.collections.businesses), businessProfile);
      
      // Create initial analytics record
      await this.createBusinessAnalytics(businessDoc.id, registrationData);
      
      // Send verification notification
      await this.sendVerificationNotification(businessDoc.id, registrationData);
      
      // Log successful registration
      console.log('✅ Business registration completed successfully:', {
        businessId: businessDoc.id,
        businessType: registrationData.businessType,
        companyName: registrationData.companyName
      });
      
      return {
        success: true,
        businessId: businessDoc.id,
        registrationNumber: this.generateRegistrationNumber(registrationData.businessType),
        businessType: registrationData.businessType,
        estimatedVerificationTime: this.getVerificationTime(registrationData.businessType),
        nextSteps: this.getNextSteps(registrationData.businessType),
        accountManager: 'Will be assigned within 24 hours',
        welcomePackage: 'Digital onboarding materials sent via email'
      };
      
    } catch (error) {
      console.error('❌ Business registration failed:', error);
      throw error;
    }
  }

  /**
   * Validate business registration data based on business type
   */
  validateBusinessRegistration(data) {
    const commonRequired = [
      'businessType', 'companyName', 'contactPerson', 'email', 'phone', 'address', 'industry'
    ];
    
    const businessSpecificRequired = {
      manufacturer: ['registrationNumber', 'establishedYear'],
      system_integrator: ['companySize'],
      trader: ['registrationNumber'],
      consultant: ['companySize'],
      government: ['registrationNumber'],
      global_buyer: ['companySize']
    };
    
    const allRequired = [
      ...commonRequired,
      ...(businessSpecificRequired[data.businessType] || [])
    ];
    
    const missing = allRequired.filter(field => !data[field] || data[field].toString().trim() === '');
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    // Email validation
    if (!data.email.includes('@') || !data.email.includes('.')) {
      throw new Error('Invalid email address format');
    }
    
    // Year validation (if provided)
    if (data.establishedYear) {
      const currentYear = new Date().getFullYear();
      if (data.establishedYear < 1900 || data.establishedYear > currentYear) {
        throw new Error('Invalid establishment year');
      }
    }
  }

  /**
   * Check if business already exists
   */
  async checkExistingBusiness(email) {
    try {
      const q = query(
        collection(this.db, this.collections.businesses),
        where('profile.email', '==', email.toLowerCase()),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty ? snapshot.docs[0].data() : null;
    } catch (error) {
      console.error('Error checking existing business:', error);
      return null;
    }
  }

  /**
   * Get required documents based on business type
   */
  getRequiredDocuments(businessType) {
    const commonDocs = ['business_license', 'identification'];
    
    const businessSpecificDocs = {
      manufacturer: ['ssm_certificate', 'factory_license', 'environmental_clearance'],
      system_integrator: ['professional_certification', 'project_portfolio'],
      trader: ['trading_license', 'tax_certificate'],
      consultant: ['professional_registration', 'academic_credentials'],
      government: ['government_authorization', 'procurement_authorization'],
      global_buyer: ['import_license', 'financial_statements']
    };
    
    return [...commonDocs, ...(businessSpecificDocs[businessType] || [])];
  }

  /**
   * Get default pricing tier based on business type
   */
  getDefaultPricingTier(businessType) {
    const tierMapping = {
      manufacturer: 'tier_2', // System Integrator pricing
      system_integrator: 'tier_2',
      trader: 'tier_3', // Trader pricing
      consultant: 'tier_1', // End User pricing
      government: 'tier_1', // End User pricing
      global_buyer: 'tier_2'
    };
    
    return tierMapping[businessType] || 'tier_1';
  }

  /**
   * Get default discount level based on business type
   */
  getDefaultDiscountLevel(businessType) {
    const discountMapping = {
      manufacturer: 15, // 15% discount
      system_integrator: 15,
      trader: 25, // 25% discount
      consultant: 5, // 5% discount
      government: 5,
      global_buyer: 15
    };
    
    return discountMapping[businessType] || 5;
  }

  /**
   * Get verification time estimate based on business type
   */
  getVerificationTime(businessType) {
    const timeMapping = {
      manufacturer: '3-5 business days',
      system_integrator: '2-3 business days',
      trader: '2-3 business days',
      consultant: '1-2 business days',
      government: '5-7 business days',
      global_buyer: '3-5 business days'
    };
    
    return timeMapping[businessType] || '2-3 business days';
  }

  /**
   * Get next steps based on business type
   */
  getNextSteps(businessType) {
    const commonSteps = [
      'Email verification and account activation',
      'Document review and business verification',
      'Account manager assignment',
      'Welcome call and platform orientation'
    ];
    
    const businessSpecificSteps = {
      manufacturer: ['Factory inspection scheduling (if required)', 'Equipment financing options review'],
      system_integrator: ['Technical certification verification', 'Partner program enrollment'],
      trader: ['Distribution agreement setup', 'Inventory management system access'],
      consultant: ['Professional credentials verification', 'Project collaboration tools setup'],
      government: ['Procurement compliance verification', 'Government pricing tier activation'],
      global_buyer: ['International shipping setup', 'Multi-currency payment configuration']
    };
    
    return [...commonSteps, ...(businessSpecificSteps[businessType] || [])];
  }

  /**
   * Generate registration number based on business type
   */
  generateRegistrationNumber(businessType) {
    const typeCode = {
      manufacturer: 'MFG',
      system_integrator: 'SYS',
      trader: 'TRD',
      consultant: 'CON',
      government: 'GOV',
      global_buyer: 'GBL'
    };
    
    const prefix = typeCode[businessType] || 'BUS';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `HF-${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create initial analytics record
   */
  async createBusinessAnalytics(businessId, registrationData) {
    try {
      const analyticsData = {
        businessId: businessId,
        businessType: registrationData.businessType,
        registrationDate: serverTimestamp(),
        
        // Initial metrics
        metrics: {
          profileCompletion: this.calculateProfileCompletion(registrationData),
          verificationScore: 0,
          activityLevel: 'new',
          riskLevel: 'low'
        },
        
        // Tracking data
        tracking: {
          source: 'website_registration',
          campaign: 'organic',
          referrer: document.referrer || 'direct'
        },
        
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(this.db, this.collections.businessAnalytics), analyticsData);
    } catch (error) {
      console.error('Error creating business analytics:', error);
    }
  }

  /**
   * Calculate profile completion percentage
   */
  calculateProfileCompletion(data) {
    const totalFields = 15; // Adjust based on required fields
    let completedFields = 0;
    
    const fieldsToCheck = [
      'companyName', 'contactPerson', 'email', 'phone', 'address',
      'businessType', 'industry', 'companySize', 'establishedYear',
      'registrationNumber', 'procurementBudget', 'preferredPaymentTerms'
    ];
    
    fieldsToCheck.forEach(field => {
      if (data[field] && data[field].toString().trim() !== '') {
        completedFields++;
      }
    });
    
    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Send verification notification
   */
  async sendVerificationNotification(businessId, registrationData) {
    try {
      const notificationData = {
        businessId: businessId,
        type: 'registration_confirmation',
        title: 'Business Registration Received',
        message: `Thank you for registering ${registrationData.companyName}. Your application is being reviewed.`,
        
        data: {
          businessType: registrationData.businessType,
          companyName: registrationData.companyName,
          contactPerson: registrationData.contactPerson,
          email: registrationData.email
        },
        
        status: 'pending',
        createdAt: serverTimestamp()
      };
      
      await addDoc(collection(this.db, this.collections.notifications), notificationData);
      
      // TODO: Integrate with email service
      console.log('📧 Verification notification queued for:', registrationData.email);
      
    } catch (error) {
      console.error('Error sending verification notification:', error);
    }
  }

  // =====================================
  // BUSINESS RETRIEVAL & MANAGEMENT
  // =====================================

  /**
   * Get business by ID
   */
  async getBusinessById(businessId) {
    try {
      const businessDoc = await getDoc(doc(this.db, this.collections.businesses, businessId));
      
      if (businessDoc.exists()) {
        return { id: businessDoc.id, ...businessDoc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching business:', error);
      return null;
    }
  }

  /**
   * Get business by email
   */
  async getBusinessByEmail(email) {
    try {
      const q = query(
        collection(this.db, this.collections.businesses),
        where('profile.email', '==', email.toLowerCase()),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching business by email:', error);
      return null;
    }
  }

  /**
   * Update business verification status
   */
  async updateVerificationStatus(businessId, status, notes = '') {
    try {
      const updateData = {
        'verification.status': status,
        'verification.verificationNotes': notes,
        updatedAt: serverTimestamp()
      };
      
      if (status === 'approved') {
        updateData['verification.verifiedAt'] = serverTimestamp();
        updateData['verification.verifiedBy'] = 'admin'; // TODO: Get actual admin user
      }
      
      await updateDoc(doc(this.db, this.collections.businesses, businessId), updateData);
      
      console.log('✅ Business verification status updated:', { businessId, status });
      return true;
      
    } catch (error) {
      console.error('Error updating verification status:', error);
      return false;
    }
  }
}

export default new BusinessRegistrationService();
