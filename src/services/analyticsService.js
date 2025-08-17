// 🚀 HiggsFlow Phase 2B: Advanced Analytics Service Implementation
// File: src/services/analyticsService.js

import { db, auth } from '../config/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  getDoc,
  setDoc
} from 'firebase/firestore';

// 🎯 Advanced Analytics Service for Industrial E-commerce Intelligence
export class HiggsFlowAnalyticsService {
  constructor() {
    // Firestore collections
    this.collections = {
      userSessions: collection(db, 'userSessions'),
      productInteractions: collection(db, 'productInteractions'),
      factoryProfiles: collection(db, 'factoryProfiles'),
      recommendationEvents: collection(db, 'recommendationEvents'),
      businessMetrics: collection(db, 'businessMetrics'),
      realTimeMetrics: collection(db, 'realTimeMetrics')
    };
    
    // Cache for performance optimization
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // Initialize real-time listeners
    this.initializeRealTimeAnalytics();
    
    console.log('🎯 HiggsFlow Analytics Service initialized');
  }

  // 🏭 1. FACTORY IDENTIFICATION & INTELLIGENCE

  /**
   * Advanced factory identification using multiple AI signals
   */
  async identifyFactory(sessionData) {
    try {
      console.log('🔍 Starting factory identification...', sessionData);
      
      const identificationSignals = {
        emailDomain: 0,
        ipGeolocation: 0,
        behaviorPattern: 0,
        existingProfile: 0
      };

      let factoryProfile = {
        factoryId: null,
        companyName: null,
        industry: null,
        size: null,
        location: null,
        confidence: 0,
        identificationMethod: []
      };

      // 1. Email Domain Analysis (Highest Confidence)
      if (sessionData.email) {
        const emailAnalysis = await this.analyzeEmailDomain(sessionData.email);
        identificationSignals.emailDomain = emailAnalysis.confidence;
        
        if (emailAnalysis.confidence > 0.8) {
          factoryProfile = { ...factoryProfile, ...emailAnalysis.factoryInfo };
          factoryProfile.identificationMethod.push('email_domain');
          console.log('✅ Factory identified via email domain:', factoryProfile.companyName);
        }
      }

      // 2. IP Geolocation Analysis
      if (sessionData.ipAddress) {
        const geoAnalysis = await this.analyzeGeolocation(sessionData.ipAddress);
        identificationSignals.ipGeolocation = geoAnalysis.confidence;
        
        if (geoAnalysis.confidence > 0.6) {
          factoryProfile.location = factoryProfile.location || geoAnalysis.location;
          factoryProfile.industry = factoryProfile.industry || geoAnalysis.likelyIndustry;
          factoryProfile.identificationMethod.push('ip_geolocation');
          console.log('📍 Location identified:', geoAnalysis.location);
        }
      }

      // 3. Behavior Pattern Analysis
      if (sessionData.userId) {
        const behaviorAnalysis = await this.analyzeBehaviorPattern(sessionData.userId);
        identificationSignals.behaviorPattern = behaviorAnalysis.confidence;
        
        if (behaviorAnalysis.confidence > 0.7) {
          factoryProfile.industry = factoryProfile.industry || behaviorAnalysis.predictedIndustry;
          factoryProfile.size = factoryProfile.size || behaviorAnalysis.predictedSize;
          factoryProfile.identificationMethod.push('behavior_analysis');
          console.log('🧠 Behavior pattern identified:', behaviorAnalysis.predictedIndustry);
        }
      }

      // 4. Check Existing Factory Profiles
      const existingProfile = await this.findExistingFactoryProfile(sessionData);
      if (existingProfile) {
        identificationSignals.existingProfile = 0.95;
        factoryProfile = { ...factoryProfile, ...existingProfile };
        factoryProfile.identificationMethod.push('existing_profile');
        console.log('📋 Existing factory profile found:', existingProfile.companyName);
      }

      // Calculate overall confidence score
      const overallConfidence = this.calculateConfidenceScore(identificationSignals);
      factoryProfile.confidence = overallConfidence;

      // Create or update factory profile if confidence is sufficient
      if (overallConfidence > 0.6) {
        factoryProfile.factoryId = await this.createOrUpdateFactoryProfile(factoryProfile, sessionData);
        console.log('🏭 Factory profile created/updated:', factoryProfile.factoryId);
      }

      console.log('🎯 Factory identification complete:', {
        confidence: overallConfidence,
        factoryId: factoryProfile.factoryId,
        company: factoryProfile.companyName,
        industry: factoryProfile.industry
      });

      return factoryProfile;

    } catch (error) {
      console.error('❌ Error in factory identification:', error);
      return { confidence: 0, error: error.message };
    }
  }

  /**
   * Analyze email domain for factory identification
   */
  async analyzeEmailDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Known Malaysian industrial domains
    const knownFactories = {
      'petronas.com': {
        companyName: 'Petronas',
        industry: 'Oil & Gas',
        size: 'Enterprise',
        location: 'Multiple Locations',
        confidence: 0.98
      },
      'shell.com': {
        companyName: 'Shell Malaysia',
        industry: 'Oil & Gas', 
        size: 'Enterprise',
        location: 'Multiple Locations',
        confidence: 0.95
      },
      'intel.com': {
        companyName: 'Intel Malaysia',
        industry: 'Semiconductor',
        size: 'Enterprise',
        location: 'Kulim Hi-Tech Park',
        confidence: 0.95
      },
      'simedarby.com': {
        companyName: 'Sime Darby',
        industry: 'Palm Oil',
        size: 'Enterprise',
        location: 'Klang Valley',
        confidence: 0.95
      },
      'proton.com': {
        companyName: 'Proton Holdings',
        industry: 'Automotive',
        size: 'Large',
        location: 'Shah Alam',
        confidence: 0.95
      },
      'genting.com': {
        companyName: 'Genting Group',
        industry: 'Conglomerate',
        size: 'Enterprise',
        location: 'Kuala Lumpur',
        confidence: 0.90
      },
      'maybank.com': {
        companyName: 'Maybank',
        industry: 'Financial Services',
        size: 'Enterprise',
        location: 'Kuala Lumpur',
        confidence: 0.90
      }
    };

    // Check for exact domain match
    if (knownFactories[domain]) {
      console.log(`🎯 Known factory domain detected: ${domain}`);
      return {
        confidence: knownFactories[domain].confidence,
        factoryInfo: knownFactories[domain]
      };
    }

    // Industry keyword analysis
    const industryPatterns = {
      'oil|gas|petro|energy|refin': { 
        industry: 'Oil & Gas', 
        confidence: 0.75 
      },
      'semi|conductor|chip|micro|tech|electron': { 
        industry: 'Semiconductor', 
        confidence: 0.75 
      },
      'palm|plant|agri|estate': { 
        industry: 'Palm Oil', 
        confidence: 0.75 
      },
      'auto|motor|car|vehicle': { 
        industry: 'Automotive', 
        confidence: 0.70 
      },
      'manufactur|factory|industri|mill': { 
        industry: 'Manufacturing', 
        confidence: 0.65 
      },
      'construct|build|develop': { 
        industry: 'Construction', 
        confidence: 0.60 
      },
      'logistic|transport|shipping|cargo': { 
        industry: 'Logistics', 
        confidence: 0.60 
      }
    };

    for (const [pattern, info] of Object.entries(industryPatterns)) {
      if (new RegExp(pattern, 'i').test(domain)) {
        console.log(`🔍 Industry pattern detected in domain: ${pattern} -> ${info.industry}`);
        return {
          confidence: info.confidence,
          factoryInfo: {
            industry: info.industry,
            companyName: this.formatCompanyName(domain),
            size: 'Medium' // Default assumption
          }
        };
      }
    }

    // Company size indicators
    const sizeIndicators = {
      'sdn|bhd|corporation|corp|limited|ltd|group|holding': 'Large',
      'enterprise|international|global|worldwide': 'Enterprise',
      'small|micro|startup': 'Small'
    };

    let estimatedSize = 'Medium'; // Default
    for (const [pattern, size] of Object.entries(sizeIndicators)) {
      if (new RegExp(pattern, 'i').test(domain)) {
        estimatedSize = size;
        break;
      }
    }

    return {
      confidence: 0.3, // Low confidence for unknown domains
      factoryInfo: {
        companyName: this.formatCompanyName(domain),
        size: estimatedSize
      }
    };
  }

  /**
   * Analyze IP geolocation for industrial zone identification
   */
  async analyzeGeolocation(ipAddress) {
    try {
      // Malaysian industrial zones mapping
      const industrialZones = {
        'Klang Valley': {
          industries: ['Manufacturing', 'Electronics', 'Automotive', 'Logistics'],
          coordinates: { lat: 3.1390, lng: 101.6869 },
          confidence: 0.7
        },
        'Pengerang Integrated Complex': {
          industries: ['Oil & Gas', 'Petrochemical', 'Refining'],
          coordinates: { lat: 1.3644, lng: 104.1144 },
          confidence: 0.9
        },
        'Kulim Hi-Tech Park': {
          industries: ['Semiconductor', 'Electronics', 'High-Tech Manufacturing'],
          coordinates: { lat: 5.3650, lng: 100.5600 },
          confidence: 0.85
        },
        'Port Klang Free Zone': {
          industries: ['Logistics', 'Manufacturing', 'Trade'],
          coordinates: { lat: 3.0167, lng: 101.3833 },
          confidence: 0.75
        },
        'Johor Industrial Parks': {
          industries: ['Automotive', 'Electronics', 'Manufacturing'],
          coordinates: { lat: 1.4927, lng: 103.7414 },
          confidence: 0.7
        },
        'East Coast Economic Region': {
          industries: ['Oil & Gas', 'Petrochemical', 'Heavy Industry'],
          coordinates: { lat: 3.8077, lng: 103.3260 },
          confidence: 0.8
        }
      };

      // In production, use actual IP geolocation service
      // For demo, simulate based on common patterns
      const simulatedLocation = this.simulateGeolocation(ipAddress);
      
      // Find closest industrial zone
      let bestMatch = null;
      let highestConfidence = 0;

      for (const [zoneName, zoneData] of Object.entries(industrialZones)) {
        // In production, calculate actual distance
        // For demo, use pattern matching
        if (this.isLocationInZone(simulatedLocation, zoneName)) {
          if (zoneData.confidence > highestConfidence) {
            highestConfidence = zoneData.confidence;
            bestMatch = {
              location: zoneName,
              likelyIndustry: zoneData.industries[0],
              industries: zoneData.industries,
              confidence: zoneData.confidence
            };
          }
        }
      }

      if (bestMatch) {
        console.log(`📍 Industrial zone identified: ${bestMatch.location}`);
        return bestMatch;
      }

      // Default fallback
      return {
        location: 'Malaysia',
        likelyIndustry: 'Manufacturing',
        confidence: 0.3
      };

    } catch (error) {
      console.error('❌ Error in geolocation analysis:', error);
      return { confidence: 0 };
    }
  }

  /**
   * Analyze user behavior patterns to predict factory characteristics
   */
  async analyzeBehaviorPattern(userId) {
    try {
      // Get user's product interaction history
      const interactionsQuery = query(
        this.collections.productInteractions,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const interactionsSnapshot = await getDocs(interactionsQuery);
      const interactions = interactionsSnapshot.docs.map(doc => doc.data());

      if (interactions.length < 3) {
        return { confidence: 0.2, reason: 'Insufficient interaction data' };
      }

      // Analyze category preferences
      const categoryFrequency = {};
      const searchPatterns = [];
      let totalDuration = 0;

      interactions.forEach(interaction => {
        // Category analysis
        const category = interaction.category || 'Unknown';
        categoryFrequency[category] = (categoryFrequency[category] || 0) + 1;

        // Search pattern analysis
        if (interaction.searchQuery) {
          searchPatterns.push(interaction.searchQuery.toLowerCase());
        }

        // Engagement analysis
        totalDuration += interaction.duration || 0;
      });

      // Predict industry based on category preferences
      const industryMapping = {
        'Pumps': ['Oil & Gas', 'Petrochemical', 'Water Treatment'],
        'Safety Equipment': ['Construction', 'Manufacturing', 'Oil & Gas'],
        'Electrical': ['Manufacturing', 'Electronics', 'Power Generation'],
        'HVAC': ['Commercial', 'Data Centers', 'Manufacturing'],
        'Valves': ['Oil & Gas', 'Petrochemical', 'Water Treatment'],
        'Instrumentation': ['Process Industries', 'Oil & Gas', 'Pharmaceutical']
      };

      const topCategory = Object.keys(categoryFrequency)
        .reduce((a, b) => categoryFrequency[a] > categoryFrequency[b] ? a : b);

      const predictedIndustries = industryMapping[topCategory] || ['Manufacturing'];
      const predictedIndustry = predictedIndustries[0];

      // Predict company size based on behavior patterns
      const avgSessionDuration = totalDuration / interactions.length;
      const uniqueCategories = Object.keys(categoryFrequency).length;
      
      let predictedSize = 'Medium';
      if (avgSessionDuration > 300 && uniqueCategories > 5) {
        predictedSize = 'Large'; // Long sessions, diverse interests
      } else if (avgSessionDuration > 600 && uniqueCategories > 8) {
        predictedSize = 'Enterprise'; // Very long sessions, very diverse
      } else if (avgSessionDuration < 100 && uniqueCategories < 3) {
        predictedSize = 'Small'; // Quick browsing, narrow focus
      }

      const confidence = Math.min(0.9, 0.3 + (interactions.length / 50) * 0.6);

      console.log(`🧠 Behavior analysis complete:`, {
        topCategory,
        predictedIndustry,
        predictedSize,
        confidence,
        interactionCount: interactions.length
      });

      return {
        confidence,
        predictedIndustry,
        predictedSize,
        topCategory,
        categoryFrequency,
        searchPatterns,
        avgSessionDuration,
        uniqueCategories
      };

    } catch (error) {
      console.error('❌ Error in behavior pattern analysis:', error);
      return { confidence: 0 };
    }
  }

  // 🎯 2. USER SESSION TRACKING

  /**
   * Track comprehensive user session with industrial intelligence
   */
  async trackUserSession(sessionData) {
    try {
      console.log('📊 Starting user session tracking...', sessionData);

      // Generate unique session ID
      const sessionId = this.generateSessionId();

      // Detect factory information
      const factoryInfo = await this.identifyFactory(sessionData);

      // Get geographic intelligence
      const geoIntelligence = await this.analyzeGeolocation(sessionData.ipAddress || 'unknown');

      // Create comprehensive session record
      const sessionRecord = {
        sessionId,
        userId: sessionData.userId || 'anonymous',
        factoryId: factoryInfo?.factoryId || null,
        
        // User identification
        email: sessionData.email || null,
        ipAddress: sessionData.ipAddress || 'unknown',
        
        // Geographic data
        location: {
          country: 'Malaysia',
          region: geoIntelligence.location || 'Unknown',
          industrialZone: this.identifyIndustrialZone(geoIntelligence.location),
          coordinates: geoIntelligence.coordinates || null
        },

        // Device and browser info
        deviceInfo: {
          browser: this.extractBrowser(sessionData.userAgent),
          device: this.detectDevice(sessionData.userAgent),
          screenSize: sessionData.screenSize || 'unknown',
          userAgent: sessionData.userAgent || 'unknown'
        },

        // Factory intelligence
        factoryIntelligence: {
          companyName: factoryInfo?.companyName || null,
          industry: factoryInfo?.industry || null,
          size: factoryInfo?.size || null,
          confidence: factoryInfo?.confidence || 0,
          identificationMethod: factoryInfo?.identificationMethod || []
        },

        // Session metadata
        entryPoint: sessionData.entryPoint || 'direct',
        referrer: sessionData.referrer || null,
        landingPage: sessionData.landingPage || '/catalog',
        
        // Timestamps
        timestamp: serverTimestamp(),
        startTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        
        // Status
        isActive: true,
        sessionDuration: 0
      };

      // Save to Firestore
      const sessionDocRef = await addDoc(this.collections.userSessions, sessionRecord);
      
      console.log('✅ User session tracked successfully:', sessionId);

      // Update factory profile activity if identified
      if (factoryInfo?.factoryId) {
        await this.updateFactoryActivity(factoryInfo.factoryId, sessionRecord);
      }

      // Update real-time metrics
      await this.updateRealTimeMetrics('activeSession', sessionRecord);

      return {
        success: true,
        sessionId: sessionId,
        factoryId: factoryInfo?.factoryId,
        factoryName: factoryInfo?.companyName,
        industry: factoryInfo?.industry,
        location: sessionRecord.location,
        confidence: factoryInfo?.confidence || 0
      };

    } catch (error) {
      console.error('❌ Error tracking user session:', error);
      return { 
        success: false, 
        error: error.message,
        sessionId: null
      };
    }
  }

  /**
   * Track detailed product interactions for analytics
   */
  async trackProductInteraction(interactionData) {
    try {
      console.log('🛍️ Tracking product interaction:', interactionData);

      const interaction = {
        // Basic interaction data
        sessionId: interactionData.sessionId,
        userId: interactionData.userId || 'anonymous',
        
        // Product information
        productId: interactionData.productId,
        productName: interactionData.productName,
        category: interactionData.category,
        price: interactionData.price || 0,
        supplier: interactionData.supplier || 'unknown',
        
        // Interaction details
        action: interactionData.action, // 'view', 'click', 'quote', 'compare', 'favorite', 'share'
        duration: interactionData.duration || 0,
        scrollDepth: interactionData.scrollDepth || 0,
        clickPosition: interactionData.clickPosition || null,
        
        // Context information
        previousProduct: interactionData.previousProduct || null,
        searchQuery: interactionData.searchQuery || null,
        filterContext: interactionData.filterContext || null,
        recommendationType: interactionData.recommendationType || null,
        
        // Timestamps
        timestamp: serverTimestamp(),
        interactionTime: new Date().toISOString()
      };

      // Save interaction
      await addDoc(this.collections.productInteractions, interaction);

      // Update real-time product popularity
      await this.updateProductPopularity(interactionData.productId, interactionData.action);

      // Generate real-time recommendations if it's a significant interaction
      if (['view', 'quote', 'favorite'].includes(interactionData.action)) {
        await this.updateRealTimeRecommendations(interactionData.userId, interaction);
      }

      console.log('✅ Product interaction tracked successfully');

      return { 
        success: true, 
        interactionId: interaction.id,
        timestamp: interaction.interactionTime
      };

    } catch (error) {
      console.error('❌ Error tracking product interaction:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // 🎯 3. UTILITY FUNCTIONS

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Format company name from domain
   */
  formatCompanyName(domain) {
    return domain.split('.')[0]
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calculate confidence score from multiple signals
   */
  calculateConfidenceScore(signals) {
    const weights = {
      emailDomain: 0.4,
      ipGeolocation: 0.2,
      behaviorPattern: 0.25,
      existingProfile: 0.15
    };

    let totalScore = 0;
    for (const [signal, confidence] of Object.entries(signals)) {
      totalScore += (confidence * weights[signal]);
    }

    return Math.min(0.98, Math.max(0, totalScore));
  }

  /**
   * Simulate geolocation (replace with actual service in production)
   */
  simulateGeolocation(ipAddress) {
    // In production, use actual IP geolocation service
    const simulations = {
      'test': 'Klang Valley',
      'local': 'Klang Valley',
      'demo': 'Pengerang Integrated Complex'
    };

    return simulations[ipAddress] || 'Klang Valley';
  }

  /**
   * Check if location is in specific industrial zone
   */
  isLocationInZone(location, zoneName) {
    // Simple pattern matching for demo
    const patterns = {
      'Klang Valley': ['klang', 'shah alam', 'petaling', 'kuala lumpur'],
      'Pengerang Integrated Complex': ['pengerang', 'johor'],
      'Kulim Hi-Tech Park': ['kulim', 'kedah'],
      'Port Klang Free Zone': ['port klang', 'klang'],
      'Johor Industrial Parks': ['johor bahru', 'johor'],
      'East Coast Economic Region': ['kuantan', 'pahang', 'terengganu']
    };

    const zonePatterns = patterns[zoneName] || [];
    return zonePatterns.some(pattern => 
      location.toLowerCase().includes(pattern)
    );
  }

  /**
   * Identify industrial zone from location
   */
  identifyIndustrialZone(location) {
    const zoneMapping = {
      'Klang Valley': 'Klang Valley Industrial Zone',
      'Pengerang Integrated Complex': 'Pengerang Industrial Complex',
      'Kulim Hi-Tech Park': 'Northern Hi-Tech Corridor',
      'Port Klang Free Zone': 'Klang Port Industrial Zone',
      'Johor Industrial Parks': 'Southern Industrial Corridor',
      'East Coast Economic Region': 'East Coast Industrial Zone'
    };

    return zoneMapping[location] || 'General Industrial Zone';
  }

  /**
   * Extract browser from user agent
   */
  extractBrowser(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Other';
  }

  /**
   * Detect device type from user agent
   */
  detectDevice(userAgent) {
    if (!userAgent) return 'Unknown';
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'Mobile';
    if (/Tablet|iPad/.test(userAgent)) return 'Tablet';
    return 'Desktop';
  }

  /**
   * Find existing factory profile
   */
  async findExistingFactoryProfile(sessionData) {
    try {
      if (sessionData.email) {
        const domain = sessionData.email.split('@')[1];
        const profileQuery = query(
          this.collections.factoryProfiles,
          where('emailDomain', '==', domain),
          limit(1)
        );
        
        const snapshot = await getDocs(profileQuery);
        if (!snapshot.empty) {
          return snapshot.docs[0].data();
        }
      }

      if (sessionData.userId) {
        const profileQuery = query(
          this.collections.factoryProfiles,
          where('userId', '==', sessionData.userId),
          limit(1)
        );
        
        const snapshot = await getDocs(profileQuery);
        if (!snapshot.empty) {
          return snapshot.docs[0].data();
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding existing factory profile:', error);
      return null;
    }
  }

  /**
   * Create or update factory profile
   */
  async createOrUpdateFactoryProfile(factoryInfo, sessionData) {
    try {
      const factoryId = factoryInfo.factoryId || `factory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const profileData = {
        factoryId,
        companyName: factoryInfo.companyName,
        industry: factoryInfo.industry,
        size: factoryInfo.size,
        location: factoryInfo.location,
        emailDomain: sessionData.email ? sessionData.email.split('@')[1] : null,
        identificationMethod: factoryInfo.identificationMethod,
        confidence: factoryInfo.confidence,
        
        // Additional metadata
        firstSeen: factoryInfo.factoryId ? undefined : serverTimestamp(),
        lastSeen: serverTimestamp(),
        totalSessions: 1, // Will be incremented for existing profiles
        totalInteractions: 0,
        
        // Business intelligence
        averageSessionDuration: 0,
        preferredCategories: [],
        estimatedBudgetRange: this.estimateBudgetRange(factoryInfo.size),
        
        // Status
        isActive: true,
        verified: factoryInfo.confidence > 0.9
      };

      const profileRef = doc(this.collections.factoryProfiles, factoryId);
      await setDoc(profileRef, profileData, { merge: true });

      console.log('🏭 Factory profile created/updated:', factoryId);
      return factoryId;

    } catch (error) {
      console.error('❌ Error creating/updating factory profile:', error);
      return null;
    }
  }

  /**
   * Estimate budget range based on company size
   */
  estimateBudgetRange(size) {
    const budgetMapping = {
      'Small': 'low', // < RM 10K per order
      'Medium': 'medium', // RM 10K - 50K per order  
      'Large': 'high', // RM 50K - 200K per order
      'Enterprise': 'enterprise' // > RM 200K per order
    };

    return budgetMapping[size] || 'medium';
  }

  /**
   * Update factory activity
   */
  async updateFactoryActivity(factoryId, sessionData) {
    try {
      const factoryRef = doc(this.collections.factoryProfiles, factoryId);
      await updateDoc(factoryRef, {
        lastSeen: serverTimestamp(),
        lastSessionId: sessionData.sessionId,
        totalSessions: firebase.firestore.FieldValue.increment(1)
      });
    } catch (error) {
      console.error('❌ Error updating factory activity:', error);
    }
  }

  /**
   * Update real-time metrics
   */
  async updateRealTimeMetrics(metricType, data) {
    try {
      const metricsRef = doc(this.collections.realTimeMetrics, metricType);
      await setDoc(metricsRef, {
        type: metricType,
        data: data,
        timestamp: serverTimestamp(),
        count: firebase.firestore.FieldValue.increment(1)
      }, { merge: true });
    } catch (error) {
      console.error('❌ Error updating real-time metrics:', error);
    }
  }

  /**
   * Update product popularity
   */
  async updateProductPopularity(productId, action) {
    try {
      // Implement product popularity tracking
      console.log(`📈 Updating product popularity: ${productId} - ${action}`);
    } catch (error) {
      console.error('❌ Error updating product popularity:', error);
    }
  }

  /**
   * Update real-time recommendations
   */
  async updateRealTimeRecommendations(userId, interaction) {
    try {
      // Implement real-time recommendation updates
      console.log(`🤖 Updating recommendations for user: ${userId}`);
    } catch (error) {
      console.error('❌ Error updating real-time recommendations:', error);
    }
  }

  /**
   * Initialize real-time analytics listeners
   */
  initializeRealTimeAnalytics() {
    console.log('🔄 Initializing real-time analytics listeners...');
    
    // Listen for active sessions
    const activeSessionsQuery = query(
      this.collections.userSessions,
      where('isActive', '==', true),
      orderBy('timestamp', 'desc')
    );

    onSnapshot(activeSessionsQuery, (snapshot) => {
      const activeSessions = snapshot.docs.map(doc => doc.data());
      this.notifyRealTimeUpdate('activeSessions', activeSessions);
      console.log(`📊 Active sessions update: ${activeSessions.length} sessions`);
    });

    // Listen for recent interactions
    const recentInteractionsQuery = query(
      this.collections.productInteractions,
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    onSnapshot(recentInteractionsQuery, (snapshot) => {
      const recentInteractions = snapshot.docs.map(doc => doc.data());
      this.notifyRealTimeUpdate('recentInteractions', recentInteractions);
      console.log(`🛍️ Recent interactions update: ${recentInteractions.length} interactions`);
    });

    console.log('✅ Real-time analytics listeners initialized');
  }

  /**
   * Notify real-time updates
   */
  notifyRealTimeUpdate(type, data) {
    // Emit custom event for real-time updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('higgsflowAnalyticsUpdate', {
        detail: { type, data, timestamp: new Date().toISOString() }
      }));
    }
  }
}

// 🚀 Export singleton instance
export const higgsFlowAnalytics = new HiggsFlowAnalyticsService();

// 🎯 React hooks for easy component integration
export const useHiggsFlowAnalytics = () => {
  return {
    trackSession: higgsFlowAnalytics.trackUserSession.bind(higgsFlowAnalytics),
    trackInteraction: higgsFlowAnalytics.trackProductInteraction.bind(higgsFlowAnalytics),
    identifyFactory: higgsFlowAnalytics.identifyFactory.bind(higgsFlowAnalytics)
  };
};

// 🔄 Real-time analytics hook
export const useRealTimeAnalytics = (eventType) => {
  const [data, setData] = React.useState(null);
  const [lastUpdate, setLastUpdate] = React.useState(null);

  React.useEffect(() => {
    const handleUpdate = (event) => {
      if (event.detail.type === eventType) {
        setData(event.detail.data);
        setLastUpdate(event.detail.timestamp);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('higgsflowAnalyticsUpdate', handleUpdate);
      return () => window.removeEventListener('higgsflowAnalyticsUpdate', handleUpdate);
    }
  }, [eventType]);

  return { data, lastUpdate };
};

// 🎯 Factory identification hook
export const useFactoryIdentification = (sessionData) => {
  const [factoryInfo, setFactoryInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (sessionData) {
      setLoading(true);
      higgsFlowAnalytics.identifyFactory(sessionData)
        .then(setFactoryInfo)
        .finally(() => setLoading(false));
    }
  }, [sessionData]);

  return { factoryInfo, loading };
};

console.log('🚀 HiggsFlow Advanced Analytics Service loaded successfully!');
