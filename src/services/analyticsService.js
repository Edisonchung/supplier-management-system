// 🚀 HiggsFlow Phase 2B: Advanced Analytics Infrastructure
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
  onSnapshot
} from 'firebase/firestore';

// 📊 Core Analytics Service Class
export class AdvancedAnalyticsService {
  constructor() {
    this.userSessions = collection(db, 'userSessions');
    this.productInteractions = collection(db, 'productInteractions');
    this.factoryProfiles = collection(db, 'factoryProfiles');
    this.recommendationEvents = collection(db, 'recommendationEvents');
    this.businessMetrics = collection(db, 'businessMetrics');
    
    // Initialize real-time listeners
    this.initializeRealTimeListeners();
  }

  // 🎯 1. USER BEHAVIOR TRACKING SYSTEM
  
  /**
   * Track user session with geographic and device intelligence
   */
  async trackUserSession(sessionData) {
    try {
      // Get geographic intelligence
      const location = await this.getGeographicIntelligence(sessionData.ipAddress);
      
      // Identify factory if possible
      const factoryInfo = await this.identifyFactory(sessionData);
      
      // Create comprehensive session record
      const sessionRecord = {
        sessionId: this.generateSessionId(),
        userId: sessionData.userId || 'anonymous',
        factoryId: factoryInfo?.factoryId || null,
        ipAddress: sessionData.ipAddress,
        location: {
          country: location.country || 'Malaysia',
          state: location.state || 'Unknown',
          city: location.city || 'Unknown',
          industrialZone: this.identifyIndustrialZone(location),
          coordinates: location.coordinates || null
        },
        deviceInfo: {
          browser: sessionData.browser,
          device: sessionData.device,
          screenSize: sessionData.screenSize,
          userAgent: sessionData.userAgent
        },
        entryPoint: sessionData.entryPoint || 'direct',
        referrer: sessionData.referrer || null,
        timestamp: serverTimestamp(),
        isActive: true
      };

      // Save session to Firebase
      const sessionDoc = await addDoc(this.userSessions, sessionRecord);
      
      // Update factory profile if identified
      if (factoryInfo?.factoryId) {
        await this.updateFactoryActivity(factoryInfo.factoryId, sessionRecord);
      }

      return {
        success: true,
        sessionId: sessionRecord.sessionId,
        factoryId: factoryInfo?.factoryId,
        location: sessionRecord.location
      };

    } catch (error) {
      console.error('Error tracking user session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Track detailed product interactions
   */
  async trackProductInteraction(interactionData) {
    try {
      const interaction = {
        sessionId: interactionData.sessionId,
        userId: interactionData.userId,
        productId: interactionData.productId,
        productName: interactionData.productName,
        category: interactionData.category,
        action: interactionData.action, // 'view', 'click', 'quote', 'compare', 'favorite'
        duration: interactionData.duration || 0,
        scrollDepth: interactionData.scrollDepth || 0,
        clickPosition: interactionData.clickPosition || null,
        previousProduct: interactionData.previousProduct || null,
        searchQuery: interactionData.searchQuery || null,
        timestamp: serverTimestamp()
      };

      await addDoc(this.productInteractions, interaction);

      // Trigger real-time recommendation update
      await this.updateRealTimeRecommendations(interactionData.userId, interaction);

      return { success: true, interactionId: interaction.id };

    } catch (error) {
      console.error('Error tracking product interaction:', error);
      return { success: false, error: error.message };
    }
  }

  // 🏭 2. FACTORY IDENTIFICATION ENGINE

  /**
   * Advanced factory identification using multiple signals
   */
  async identifyFactory(sessionData) {
    try {
      const identificationScore = {
        emailDomain: 0,
        ipLocation: 0,
        purchaseHistory: 0,
        behaviorPattern: 0
      };

      let factoryInfo = {
        factoryId: null,
        companyName: null,
        industry: null,
        size: null,
        confidence: 0
      };

      // 1. Email domain analysis
      if (sessionData.email) {
        const domainAnalysis = await this.analyzeEmailDomain(sessionData.email);
        identificationScore.emailDomain = domainAnalysis.confidence;
        if (domainAnalysis.confidence > 0.8) {
          factoryInfo = { ...factoryInfo, ...domainAnalysis.factoryInfo };
        }
      }

      // 2. IP geolocation analysis
      if (sessionData.ipAddress) {
        const locationAnalysis = await this.analyzeIPLocation(sessionData.ipAddress);
        identificationScore.ipLocation = locationAnalysis.confidence;
        if (locationAnalysis.confidence > 0.6) {
          factoryInfo.industry = factoryInfo.industry || locationAnalysis.likelyIndustry;
        }
      }

      // 3. Purchase history correlation
      if (sessionData.userId) {
        const historyAnalysis = await this.analyzePurchaseHistory(sessionData.userId);
        identificationScore.purchaseHistory = historyAnalysis.confidence;
        if (historyAnalysis.confidence > 0.7) {
          factoryInfo = { ...factoryInfo, ...historyAnalysis.factoryInfo };
        }
      }

      // 4. Behavior pattern analysis
      const behaviorAnalysis = await this.analyzeBehaviorPattern(sessionData);
      identificationScore.behaviorPattern = behaviorAnalysis.confidence;

      // Calculate overall confidence
      const overallConfidence = (
        identificationScore.emailDomain * 0.4 +
        identificationScore.ipLocation * 0.2 +
        identificationScore.purchaseHistory * 0.3 +
        identificationScore.behaviorPattern * 0.1
      );

      factoryInfo.confidence = overallConfidence;

      // If confidence is high enough, create or update factory profile
      if (overallConfidence > 0.6) {
        factoryInfo.factoryId = await this.createOrUpdateFactoryProfile(factoryInfo);
      }

      return factoryInfo;

    } catch (error) {
      console.error('Error identifying factory:', error);
      return null;
    }
  }

  /**
   * Analyze email domain for factory identification
   */
  async analyzeEmailDomain(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    
    // Known industrial domains mapping
    const industrialDomains = {
      'petronas.com': { 
        companyName: 'Petronas', 
        industry: 'Oil & Gas', 
        size: 'Enterprise',
        confidence: 0.95 
      },
      'shell.com': { 
        companyName: 'Shell Malaysia', 
        industry: 'Oil & Gas', 
        size: 'Enterprise',
        confidence: 0.95 
      },
      'intel.com': { 
        companyName: 'Intel Malaysia', 
        industry: 'Semiconductor', 
        size: 'Enterprise',
        confidence: 0.95 
      },
      'simedarby.com': { 
        companyName: 'Sime Darby', 
        industry: 'Palm Oil', 
        size: 'Enterprise',
        confidence: 0.95 
      },
      'proton.com': { 
        companyName: 'Proton Holdings', 
        industry: 'Automotive', 
        size: 'Large',
        confidence: 0.95 
      }
    };

    // Check for exact domain match
    if (industrialDomains[domain]) {
      return {
        confidence: industrialDomains[domain].confidence,
        factoryInfo: industrialDomains[domain]
      };
    }

    // Check for industry indicators in domain
    const industryKeywords = {
      'oil|gas|petro|energy': { industry: 'Oil & Gas', confidence: 0.7 },
      'semiconductor|chip|tech|electronics': { industry: 'Semiconductor', confidence: 0.7 },
      'palm|plantation|agri': { industry: 'Palm Oil', confidence: 0.7 },
      'auto|motor|car': { industry: 'Automotive', confidence: 0.6 },
      'manufacturing|factory|industrial': { industry: 'Manufacturing', confidence: 0.5 }
    };

    for (const [keywords, info] of Object.entries(industryKeywords)) {
      if (new RegExp(keywords, 'i').test(domain)) {
        return {
          confidence: info.confidence,
          factoryInfo: {
            industry: info.industry,
            companyName: this.formatCompanyName(domain)
          }
        };
      }
    }

    return { confidence: 0, factoryInfo: {} };
  }

  /**
   * Analyze IP location for industrial zone identification
   */
  async analyzeIPLocation(ipAddress) {
    try {
      // In production, use actual IP geolocation service
      // For now, simulate based on common Malaysian industrial areas
      
      const industrialZones = {
        'Klang Valley': { 
          industries: ['Manufacturing', 'Electronics', 'Automotive'],
          confidence: 0.6 
        },
        'Pengerang': { 
          industries: ['Oil & Gas', 'Petrochemical'],
          confidence: 0.8 
        },
        'Kulim Hi-Tech Park': { 
          industries: ['Semiconductor', 'Electronics'],
          confidence: 0.8 
        },
        'Port Klang': { 
          industries: ['Logistics', 'Manufacturing'],
          confidence: 0.7 
        },
        'Johor Bahru': { 
          industries: ['Manufacturing', 'Electronics', 'Automotive'],
          confidence: 0.6 
        }
      };

      // Simulate location detection (replace with actual service)
      const detectedZone = 'Klang Valley'; // This would come from IP service
      const zoneInfo = industrialZones[detectedZone];

      return {
        confidence: zoneInfo?.confidence || 0.3,
        likelyIndustry: zoneInfo?.industries[0] || 'Manufacturing',
        location: detectedZone
      };

    } catch (error) {
      console.error('Error analyzing IP location:', error);
      return { confidence: 0 };
    }
  }

  // 🤖 3. AI RECOMMENDATION ENGINE

  /**
   * Generate intelligent product recommendations
   */
  async generateRecommendations(userId, context = {}) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const factoryProfile = userProfile?.factoryId ? 
        await this.getFactoryProfile(userProfile.factoryId) : null;

      const recommendations = {
        industryPopular: await this.getIndustryPopularProducts(factoryProfile?.industry),
        geographicTrending: await this.getGeographicTrending(factoryProfile?.location),
        purchaseHistoryBased: await this.getPurchaseHistoryRecommendations(userId),
        behaviorBased: await this.getBehaviorBasedRecommendations(userId),
        crossSelling: await this.getCrossSellingSuggestions(context.currentProduct),
        urgentNeeds: await this.getUrgentNeedsRecommendations(factoryProfile)
      };

      // Rank and personalize recommendations
      const personalizedRecommendations = await this.personalizeRecommendations(
        recommendations, 
        userProfile, 
        factoryProfile, 
        context
      );

      // Track recommendation event
      await this.trackRecommendationEvent(userId, personalizedRecommendations);

      return personalizedRecommendations;

    } catch (error) {
      console.error('Error generating recommendations:', error);
      return { recommendations: [], error: error.message };
    }
  }

  /**
   * Get industry-specific popular products
   */
  async getIndustryPopularProducts(industry) {
    if (!industry) return [];

    try {
      // Query products popular in specific industry
      const q = query(
        collection(db, 'products'),
        where('popularInIndustries', 'array-contains', industry),
        orderBy('industryPopularityScore', 'desc'),
        limit(10)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recommendationType: 'industry_popular',
        reason: `Popular in ${industry} industry`
      }));

    } catch (error) {
      console.error('Error getting industry popular products:', error);
      return [];
    }
  }

  /**
   * Get geographically trending products
   */
  async getGeographicTrending(location) {
    if (!location) return [];

    try {
      // Query products trending in user's geographic area
      const q = query(
        collection(db, 'products'),
        where('trendingInRegions', 'array-contains', location),
        orderBy('regionalTrendScore', 'desc'),
        limit(8)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recommendationType: 'geographic_trending',
        reason: `Trending in ${location}`
      }));

    } catch (error) {
      console.error('Error getting geographic trending products:', error);
      return [];
    }
  }

  /**
   * Personalize and rank all recommendations
   */
  async personalizeRecommendations(recommendations, userProfile, factoryProfile, context) {
    try {
      // Flatten all recommendation types
      const allRecommendations = [
        ...recommendations.industryPopular,
        ...recommendations.geographicTrending,
        ...recommendations.purchaseHistoryBased,
        ...recommendations.behaviorBased,
        ...recommendations.crossSelling,
        ...recommendations.urgentNeeds
      ];

      // Remove duplicates
      const uniqueRecommendations = allRecommendations.filter((rec, index, self) =>
        index === self.findIndex(r => r.id === rec.id)
      );

      // Calculate personalized scores
      const scoredRecommendations = uniqueRecommendations.map(product => {
        const personalizedScore = this.calculatePersonalizedScore(
          product, 
          userProfile, 
          factoryProfile, 
          context
        );

        return {
          ...product,
          personalizedScore,
          urgencyLevel: this.calculateUrgencyLevel(product, factoryProfile),
          costBenefitScore: this.calculateCostBenefitScore(product, factoryProfile),
          confidenceScore: this.calculateConfidenceScore(product, userProfile)
        };
      });

      // Sort by personalized score
      scoredRecommendations.sort((a, b) => b.personalizedScore - a.personalizedScore);

      // Return top recommendations with insights
      return {
        recommendations: scoredRecommendations.slice(0, 12),
        insights: {
          topCategory: this.getTopRecommendedCategory(scoredRecommendations),
          avgConfidence: this.calculateAverageConfidence(scoredRecommendations),
          urgentCount: scoredRecommendations.filter(r => r.urgencyLevel === 'high').length,
          personalizedCount: scoredRecommendations.length
        }
      };

    } catch (error) {
      console.error('Error personalizing recommendations:', error);
      return { recommendations: [], insights: {} };
    }
  }

  // 📊 4. BUSINESS INTELLIGENCE FUNCTIONS

  /**
   * Get comprehensive business analytics
   */
  async getBusinessAnalytics(timeRange = '30d') {
    try {
      const analytics = {
        factoryAnalytics: await this.getFactoryAnalytics(timeRange),
        productPerformance: await this.getProductPerformance(timeRange),
        geographicInsights: await this.getGeographicInsights(timeRange),
        revenueMetrics: await this.getRevenueMetrics(timeRange),
        recommendationEffectiveness: await this.getRecommendationEffectiveness(timeRange),
        predictiveInsights: await this.getPredictiveInsights()
      };

      return analytics;

    } catch (error) {
      console.error('Error getting business analytics:', error);
      return null;
    }
  }

  /**
   * Get factory-specific analytics
   */
  async getFactoryAnalytics(timeRange) {
    try {
      // Get factory distribution by industry
      const factoryDistribution = await this.getFactoryDistribution();
      
      // Get top performing factories
      const topFactories = await this.getTopPerformingFactories(timeRange);
      
      // Get factory growth metrics
      const growthMetrics = await this.getFactoryGrowthMetrics(timeRange);

      return {
        totalFactories: factoryDistribution.total,
        industryBreakdown: factoryDistribution.byIndustry,
        sizeDistribution: factoryDistribution.bySize,
        topPerformers: topFactories,
        growthRate: growthMetrics.monthlyGrowthRate,
        churnRate: growthMetrics.churnRate,
        acquisitionCost: growthMetrics.avgAcquisitionCost
      };

    } catch (error) {
      console.error('Error getting factory analytics:', error);
      return {};
    }
  }

  // 🔄 5. REAL-TIME FEATURES

  /**
   * Initialize real-time listeners for live analytics
   */
  initializeRealTimeListeners() {
    // Real-time session monitoring
    const activeSessionsQuery = query(
      this.userSessions,
      where('isActive', '==', true),
      orderBy('timestamp', 'desc')
    );

    onSnapshot(activeSessionsQuery, (snapshot) => {
      const activeSessions = snapshot.docs.map(doc => doc.data());
      this.notifyRealTimeUpdate('activeSessions', activeSessions);
    });

    // Real-time product interaction monitoring
    const recentInteractionsQuery = query(
      this.productInteractions,
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    onSnapshot(recentInteractionsQuery, (snapshot) => {
      const recentInteractions = snapshot.docs.map(doc => doc.data());
      this.notifyRealTimeUpdate('recentInteractions', recentInteractions);
    });
  }

  /**
   * Notify components of real-time updates
   */
  notifyRealTimeUpdate(type, data) {
    // Emit custom event for real-time updates
    window.dispatchEvent(new CustomEvent('analyticsUpdate', {
      detail: { type, data }
    }));
  }

  // 🛠️ UTILITY FUNCTIONS

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatCompanyName(domain) {
    return domain.split('.')[0]
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  identifyIndustrialZone(location) {
    const zones = {
      'Petaling Jaya': 'Klang Valley',
      'Shah Alam': 'Klang Valley',
      'Johor Bahru': 'Southern Industrial Corridor',
      'Penang': 'Northern Industrial Corridor',
      'Kuantan': 'East Coast Economic Region'
    };
    
    return zones[location?.city] || 'General Industrial';
  }

  calculatePersonalizedScore(product, userProfile, factoryProfile, context) {
    let score = 0;

    // Base popularity score
    score += (product.popularityScore || 0) * 0.2;

    // Industry relevance
    if (factoryProfile?.industry && product.relevantIndustries?.includes(factoryProfile.industry)) {
      score += 30;
    }

    // Geographic relevance
    if (factoryProfile?.location && product.popularInRegions?.includes(factoryProfile.location)) {
      score += 20;
    }

    // Purchase history similarity
    if (userProfile?.purchaseCategories?.includes(product.category)) {
      score += 25;
    }

    // Price appropriateness
    const factoryBudgetRange = factoryProfile?.budgetRange || 'medium';
    const productPriceRange = this.categorizePriceRange(product.price);
    if (factoryBudgetRange === productPriceRange) {
      score += 15;
    }

    // Urgency factor
    if (product.urgencyLevel === 'high') {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  calculateUrgencyLevel(product, factoryProfile) {
    // Determine urgency based on inventory, seasonality, etc.
    if (product.stockLevel && product.stockLevel < 10) return 'high';
    if (factoryProfile?.criticalProducts?.includes(product.id)) return 'high';
    if (product.seasonalDemand && this.isSeasonalPeak(product.category)) return 'medium';
    return 'low';
  }

  calculateCostBenefitScore(product, factoryProfile) {
    // Calculate value proposition score
    const qualityScore = product.qualityRating || 5;
    const priceCompetitiveness = product.priceCompetitiveness || 5;
    const reliability = product.supplierReliability || 5;
    
    return (qualityScore + priceCompetitiveness + reliability) / 3;
  }

  calculateConfidenceScore(product, userProfile) {
    // Calculate recommendation confidence
    let confidence = 0.5; // Base confidence
    
    if (userProfile?.purchaseHistory?.length > 5) confidence += 0.2;
    if (product.reviewCount > 10) confidence += 0.2;
    if (product.verifiedSupplier) confidence += 0.1;
    
    return Math.min(1, confidence);
  }

  categorizePriceRange(price) {
    if (price < 1000) return 'low';
    if (price < 10000) return 'medium';
    if (price < 50000) return 'high';
    return 'enterprise';
  }

  isSeasonalPeak(category) {
    // Determine if current time is peak season for category
    const month = new Date().getMonth();
    const seasonalCategories = {
      'HVAC': [4, 5, 6, 7, 8], // Summer months
      'Safety Equipment': [0, 11], // Year-end safety reviews
      'Maintenance': [2, 3, 9, 10] // Spring and fall maintenance
    };
    
    return seasonalCategories[category]?.includes(month) || false;
  }
}

// 📱 Export analytics service instance
export const analyticsService = new AdvancedAnalyticsService();

// 🎯 Additional utility functions for React components
export const useAnalytics = () => {
  return {
    trackSession: analyticsService.trackUserSession.bind(analyticsService),
    trackInteraction: analyticsService.trackProductInteraction.bind(analyticsService),
    getRecommendations: analyticsService.generateRecommendations.bind(analyticsService),
    getBusinessAnalytics: analyticsService.getBusinessAnalytics.bind(analyticsService)
  };
};

// 🔄 Real-time hooks for React components
export const useRealTimeAnalytics = (type) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const handleUpdate = (event) => {
      if (event.detail.type === type) {
        setData(event.detail.data);
      }
    };

    window.addEventListener('analyticsUpdate', handleUpdate);
    return () => window.removeEventListener('analyticsUpdate', handleUpdate);
  }, [type]);

  return data;
};
