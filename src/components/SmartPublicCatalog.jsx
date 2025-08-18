// src/components/SmartPublicCatalog.jsx
// HiggsFlow Phase 2B - Complete Smart Public Catalog with Advanced AI Analytics

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, Filter, Star, MapPin, TrendingUp, Eye, ShoppingCart, Clock, 
  Zap, Target, Brain, Factory, Globe, Activity, BarChart3, Users, 
  AlertCircle, ThumbsUp, Award, Shield, Truck, Phone, Mail, Calendar,
  ChevronDown, ChevronUp, Heart, Share2, Download, Settings
} from 'lucide-react';

// Mock Analytics Service (replace with actual import in production)
class MockAnalyticsService {
  async trackProductInteraction(data) {
    console.log('📊 Tracking interaction:', data);
  }
  
  async subscribeToRealTimeMetrics(callback) {
    // Simulate real-time updates
    setInterval(() => {
      callback({
        activeSessions: Math.floor(Math.random() * 50) + 10,
        recentInteractions: Math.floor(Math.random() * 100) + 20,
        conversionRate: Math.random() * 0.1 + 0.05
      });
    }, 5000);
  }
  
  async trackUserBehavior(sessionId, handlers) {
    console.log('🔍 Tracking behavior for session:', sessionId);
    return handlers;
  }
}

const analyticsService = new MockAnalyticsService();

// Smart Public Catalog with Phase 2B Industrial Intelligence
const SmartPublicCatalog = () => {
  // Enhanced state management with Phase 2B features
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [factoryProfile, setFactoryProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    industry: 'all',
    priceRange: 'all',
    location: 'all',
    urgency: 'all',
    availability: 'all'
  });

  // Phase 2B Analytics State
  const [sessionId, setSessionId] = useState(null);
  const [pageLoadTime] = useState(Date.now());
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeSessions: 0,
    recentInteractions: 0,
    conversionRate: 0
  });
  const [aiInsights, setAiInsights] = useState({
    userBehaviorScore: 0,
    factoryConfidence: 0,
    recommendationAccuracy: 0.85
  });
  const [geographicData, setGeographicData] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid, list, compact
  const [sortOption, setSortOption] = useState('ai_relevance');

  // Initialize components
  useEffect(() => {
    initializeSession();
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, []);

  useEffect(() => {
    if (factoryProfile && factoryProfile.confidence > 0.6) {
      loadPersonalizedRecommendations();
    }
  }, [factoryProfile, products]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, activeFilters, factoryProfile, sortOption]);

  // Enhanced session initialization with Phase 2B analytics
  const initializeSession = async () => {
    try {
      console.log('🚀 Initializing HiggsFlow Phase 2B Smart Catalog...');

      // Generate unique session ID
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(newSessionId);

      // Enhanced session data collection
      const sessionData = {
        sessionId: newSessionId,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        entryPoint: 'smart_catalog',
        referrer: document.referrer,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        connectionType: navigator.connection?.effectiveType || 'unknown'
      };

      // Advanced geolocation and factory identification
      const enhancedProfile = await performFactoryIdentification(sessionData);
      setFactoryProfile(enhancedProfile);

      // Start real-time analytics tracking
      await startRealTimeTracking(newSessionId, enhancedProfile);

      // Load geographic market data
      const geoData = await loadGeographicIntelligence(enhancedProfile?.location);
      setGeographicData(geoData);

      console.log('✅ Phase 2B session initialized:', {
        sessionId: newSessionId,
        factory: enhancedProfile,
        confidence: enhancedProfile?.confidence || 0
      });

    } catch (error) {
      console.error('❌ Error initializing Phase 2B session:', error);
      const fallbackSessionId = `session_${Date.now()}_fallback`;
      setSessionId(fallbackSessionId);
    }
  };

  // Advanced factory identification using Phase 2B AI
  const performFactoryIdentification = async (sessionData) => {
    try {
      console.log('🔍 Running Phase 2B factory identification...');

      // Simulate advanced AI identification
      const identificationSignals = await Promise.all([
        analyzeUserAgent(sessionData.userAgent),
        analyzeGeolocation(),
        analyzeBrowsingPatterns(sessionData),
        checkExistingProfiles()
      ]);

      const aggregatedSignals = identificationSignals.reduce((acc, signal) => ({
        confidence: acc.confidence + signal.confidence,
        indicators: [...acc.indicators, ...signal.indicators]
      }), { confidence: 0, indicators: [] });

      // Enhanced factory profile based on signals
      const factoryProfile = {
        factoryId: `factory_${Date.now()}`,
        companyName: detectCompanyName(identificationSignals),
        industry: detectIndustry(identificationSignals),
        size: detectFactorySize(identificationSignals),
        location: detectLocation(identificationSignals),
        confidence: Math.min(aggregatedSignals.confidence / identificationSignals.length, 1),
        identificationMethod: aggregatedSignals.indicators,
        industrialZone: detectIndustrialZone(),
        technicalProfile: {
          primaryProducts: inferPrimaryProducts(identificationSignals),
          operationalScale: inferOperationalScale(identificationSignals),
          maintenanceCycle: inferMaintenanceCycle(identificationSignals)
        },
        marketIntelligence: {
          competitorAnalysis: await getCompetitorData(),
          marketPosition: calculateMarketPosition(),
          purchasingPower: estimatePurchasingPower()
        }
      };

      console.log('🎯 Advanced factory identification complete:', factoryProfile);
      return factoryProfile;

    } catch (error) {
      console.error('❌ Error in factory identification:', error);
      return getDefaultFactoryProfile();
    }
  };

  // Start real-time analytics tracking
  const startRealTimeTracking = async (sessionId, factoryProfile) => {
    try {
      // Initialize real-time metrics
      const metricsSubscription = await analyticsService.subscribeToRealTimeMetrics((metrics) => {
        setRealTimeMetrics(metrics);
      });

      // Track user behavior patterns
      const behaviorSubscription = await analyticsService.trackUserBehavior(sessionId, {
        onPageView: (data) => updateBehaviorScore(data),
        onProductInteraction: (data) => trackProductEngagement(data),
        onSearchQuery: (data) => analyzeSearchIntent(data)
      });

      // Start AI insights generation
      generateAIInsights(factoryProfile);

      console.log('📊 Real-time tracking activated');
    } catch (error) {
      console.error('❌ Error starting real-time tracking:', error);
    }
  };

  // Load geographic intelligence data
  const loadGeographicIntelligence = async (location) => {
    try {
      const geoIntelligence = {
        industrialZones: [
          {
            name: 'Port Klang Free Zone',
            distance: calculateDistance(location, 'Port Klang'),
            dominantIndustries: ['Logistics', 'Manufacturing', 'Oil & Gas'],
            averageOrderValue: 45000,
            popularProducts: ['Industrial Equipment', 'Safety Gear', 'Logistics Solutions'],
            competitionLevel: 'High',
            marketOpportunity: 'Strong'
          },
          {
            name: 'Shah Alam Industrial Area',
            distance: calculateDistance(location, 'Shah Alam'),
            dominantIndustries: ['Electronics', 'Automotive', 'Precision Manufacturing'],
            averageOrderValue: 32000,
            popularProducts: ['Precision Tools', 'Electronics', 'Automation Systems'],
            competitionLevel: 'Medium',
            marketOpportunity: 'Growing'
          },
          {
            name: 'Pengerang Industrial Complex',
            distance: calculateDistance(location, 'Pengerang'),
            dominantIndustries: ['Petrochemical', 'Oil & Gas', 'Chemical Processing'],
            averageOrderValue: 65000,
            popularProducts: ['Process Equipment', 'Safety Systems', 'Valves & Controls'],
            competitionLevel: 'Low',
            marketOpportunity: 'Excellent'
          }
        ],
        marketTrends: await getMarketTrends(location),
        competitorDensity: calculateCompetitorDensity(location),
        demandForecasting: generateDemandForecast(location)
      };

      return geoIntelligence;
    } catch (error) {
      console.error('❌ Error loading geographic intelligence:', error);
      return null;
    }
  };

  /**
   * Enhanced product catalog loading with Phase 2B intelligence
   */
  const loadCatalogData = async () => {
    try {
      setLoading(true);
      
      // Simulate intelligent loading with progress
      await simulateIntelligentLoading();

      // Enhanced product data with Phase 2B features
      const enhancedProducts = [
        {
          id: 'pump_centrifugal_001',
          name: 'Industrial Centrifugal Pump - High Flow',
          category: 'Pumps',
          subcategory: 'Centrifugal Pumps',
          price: 15600,
          originalPrice: 18200,
          image: '/api/placeholder/400/300',
          supplier: 'FlowTech Industries Sdn Bhd',
          supplierLocation: 'Shah Alam, Selangor',
          supplierContact: {
            phone: '+60 3-5521 8800',
            email: 'sales@flowtech.my',
            website: 'www.flowtech.my'
          },
          rating: 4.8,
          reviewCount: 23,
          specifications: {
            flowRate: '500 GPM',
            head: '150 ft',
            power: '75 HP',
            material: 'Stainless Steel 316',
            connection: 'Flanged ANSI 150',
            efficiency: '85%',
            operatingTemp: '-20°C to 150°C'
          },
          description: 'Heavy-duty centrifugal pump designed for industrial applications in oil & gas, chemical processing, and water treatment facilities. Features corrosion-resistant construction and high efficiency design.',
          detailedFeatures: [
            'Corrosion-resistant SS 316 construction',
            'Self-priming design for easy installation',
            'Mechanical seal for leak-free operation',
            'Balanced impeller for vibration-free operation',
            'Optional explosion-proof motor available'
          ],
          popularInIndustries: ['Oil & Gas', 'Petrochemical', 'Water Treatment', 'Chemical Processing'],
          popularInRegions: ['Pengerang', 'Klang Valley', 'Pasir Gudang'],
          urgencyLevel: 'medium',
          stockLevel: 8,
          leadTime: '2-3 weeks',
          certifications: ['API 610', 'ISO 9001', 'CE Marked', 'ATEX Certified'],
          warranty: '2 years parts & labor',
          // Phase 2B enhancements
          aiMetrics: {
            demandTrend: 'increasing',
            seasonalityScore: 0.7,
            maintenanceFrequency: 'quarterly',
            replacementCycle: '5-7 years',
            failureRate: 0.02,
            energyEfficiency: 'A++'
          },
          geographicPopularity: {
            'Port Klang Free Zone': 0.95,
            'Shah Alam Industrial': 0.82,
            'Pengerang Industrial': 0.88,
            'Pasir Gudang': 0.79
          },
          factoryCompatibility: {
            'Oil & Gas': 0.95,
            'Petrochemical': 0.90,
            'Manufacturing': 0.75,
            'Water Treatment': 0.92,
            'Chemical Processing': 0.88
          },
          predictiveInsights: {
            nextMaintenanceWindow: '2025-Q1',
            failureRiskScore: 0.15,
            energyEfficiencyRating: 'A++',
            roiProjection: '18 months',
            energySavings: '25-30%',
            maintenanceReduction: '40%',
            expectedLifespan: '15-20 years'
          },
          marketIntelligence: {
            competitorPrice: 19500,
            marketShare: '15%',
            customerSatisfaction: 4.7,
            returnRate: 0.05
          },
          personalizedScore: 0,
          trendingScore: 85,
          demandScore: 92,
          tags: ['high-efficiency', 'corrosion-resistant', 'api-certified', 'heavy-duty']
        },
        {
          id: 'safety_harness_001',
          name: 'Full Body Safety Harness System',
          category: 'Safety Equipment',
          subcategory: 'Personal Protective Equipment',
          price: 890,
          originalPrice: 1150,
          image: '/api/placeholder/400/300',
          supplier: 'SafeGuard Systems Malaysia',
          supplierLocation: 'Petaling Jaya, Selangor',
          supplierContact: {
            phone: '+60 3-7956 2200',
            email: 'safety@safeguard.my',
            website: 'www.safeguard.my'
          },
          rating: 4.9,
          reviewCount: 45,
          specifications: {
            weightCapacity: '400 lbs',
            material: 'Polyester Webbing',
            buckles: 'Auto-locking',
            certification: 'CE EN 361',
            sizesAvailable: 'S, M, L, XL, XXL',
            weight: '1.2 kg',
            color: 'High-visibility Yellow'
          },
          description: 'Professional-grade full body harness system for work at height applications in construction, oil & gas, and industrial maintenance. Meets international safety standards.',
          detailedFeatures: [
            'Auto-locking buckles for quick adjustment',
            'Padded shoulder and leg straps for comfort',
            'Multiple D-ring attachment points',
            'High-visibility reflective strips',
            'Quick-connect chest strap',
            'Tool loop attachments'
          ],
          popularInIndustries: ['Construction', 'Oil & Gas', 'Manufacturing', 'Telecommunications', 'Maintenance'],
          popularInRegions: ['Johor', 'Klang Valley', 'Pengerang', 'Sabah', 'Sarawak'],
          urgencyLevel: 'high',
          stockLevel: 25,
          leadTime: '1-2 weeks',
          certifications: ['CE EN 361', 'ANSI Z359.11', 'CSA Z259.10', 'AS/NZS 1891.1'],
          warranty: '1 year manufacturing defects',
          // Phase 2B enhancements
          aiMetrics: {
            demandTrend: 'stable',
            seasonalityScore: 0.3,
            maintenanceFrequency: 'annual',
            replacementCycle: '2-3 years',
            failureRate: 0.001,
            safetyRating: 'A++'
          },
          geographicPopularity: {
            'Construction Sites': 0.98,
            'Oil & Gas Facilities': 0.92,
            'Manufacturing Plants': 0.78,
            'Telecommunication Towers': 0.85
          },
          factoryCompatibility: {
            'Construction': 0.98,
            'Oil & Gas': 0.92,
            'Manufacturing': 0.78,
            'Telecommunications': 0.85,
            'Maintenance': 0.95
          },
          predictiveInsights: {
            safetyComplianceScore: 0.98,
            accidentReductionRate: '45%',
            regulatoryCompliance: 'Full',
            trainingRequirement: 'Minimal',
            inspectionSchedule: 'Monthly',
            replacementIndicators: 'Wear indicators included'
          },
          marketIntelligence: {
            competitorPrice: 1200,
            marketShare: '22%',
            customerSatisfaction: 4.8,
            returnRate: 0.02
          },
          personalizedScore: 0,
          trendingScore: 78,
          demandScore: 95,
          tags: ['safety-critical', 'high-visibility', 'comfortable', 'multi-standard']
        },
        {
          id: 'vfd_controller_001',
          name: 'Variable Frequency Drive Controller - 10HP',
          category: 'Electrical',
          subcategory: 'Motor Controls',
          price: 3400,
          originalPrice: 4200,
          image: '/api/placeholder/400/300',
          supplier: 'PowerControl Solutions',
          supplierLocation: 'Kulim, Kedah',
          supplierContact: {
            phone: '+60 4-403 8800',
            email: 'technical@powercontrol.my',
            website: 'www.powercontrol.my'
          },
          rating: 4.7,
          reviewCount: 31,
          specifications: {
            power: '10 HP',
            voltage: '480V',
            control: 'Vector Control',
            enclosure: 'NEMA 1',
            communication: 'Modbus RTU',
            inputFrequency: '50/60 Hz',
            outputFrequency: '0.1-400 Hz',
            efficiency: '97%'
          },
          description: 'Advanced variable frequency drive for precise motor control in HVAC, pumping, and manufacturing applications. Features intelligent control algorithms and energy optimization.',
          detailedFeatures: [
            'Vector control for precise speed regulation',
            'Built-in PID controller',
            'Energy optimization algorithms',
            'Comprehensive protection features',
            'Remote monitoring capability',
            'Easy programming interface'
          ],
          popularInIndustries: ['Manufacturing', 'HVAC', 'Water Treatment', 'Food Processing', 'Textile'],
          popularInRegions: ['Kulim Hi-Tech', 'Klang Valley', 'Penang', 'Johor'],
          urgencyLevel: 'low',
          stockLevel: 12,
          leadTime: '3-4 weeks',
          certifications: ['UL Listed', 'CE Marked', 'RoHS Compliant', 'FCC Class A'],
          warranty: '3 years parts, 1 year labor',
          // Phase 2B enhancements
          aiMetrics: {
            demandTrend: 'increasing',
            seasonalityScore: 0.4,
            maintenanceFrequency: 'bi-annual',
            replacementCycle: '8-10 years',
            failureRate: 0.03,
            energyEfficiency: 'A++'
          },
          geographicPopularity: {
            'Kulim Hi-Tech': 0.85,
            'Manufacturing Zones': 0.78,
            'Industrial Parks': 0.82
          },
          factoryCompatibility: {
            'Manufacturing': 0.90,
            'HVAC': 0.85,
            'Water Treatment': 0.80,
            'Food Processing': 0.75,
            'Textile': 0.70
          },
          predictiveInsights: {
            energySavings: '30-40%',
            motorLifeExtension: '50%',
            maintenanceReduction: '25%',
            paybackPeriod: '14 months',
            co2Reduction: '2.5 tons/year',
            productivityIncrease: '15%'
          },
          marketIntelligence: {
            competitorPrice: 4800,
            marketShare: '18%',
            customerSatisfaction: 4.6,
            returnRate: 0.04
          },
          personalizedScore: 0,
          trendingScore: 72,
          demandScore: 88,
          tags: ['energy-efficient', 'smart-control', 'industry-4.0', 'cost-saving']
        },
        {
          id: 'hvac_cooling_001',
          name: 'Industrial Cooling Unit - 50 Ton',
          category: 'HVAC',
          subcategory: 'Cooling Systems',
          price: 28900,
          originalPrice: 32500,
          image: '/api/placeholder/400/300',
          supplier: 'CoolAir Industrial Malaysia',
          supplierLocation: 'Johor Bahru, Johor',
          supplierContact: {
            phone: '+60 7-334 5500',
            email: 'industrial@coolair.my',
            website: 'www.coolair.my'
          },
          rating: 4.6,
          reviewCount: 18,
          specifications: {
            capacity: '50 Ton',
            refrigerant: 'R-410A',
            efficiency: 'High EER 11.5',
            compressor: 'Scroll Type',
            controls: 'Digital Controller',
            powerRequirement: '380V/3Ph/50Hz',
            dimensions: '2000x1200x1800mm',
            weight: '850 kg'
          },
          description: 'High-efficiency industrial cooling unit suitable for data centers, manufacturing facilities, and commercial applications. Features intelligent controls and energy management.',
          detailedFeatures: [
            'High-efficiency scroll compressors',
            'Intelligent load management',
            'Remote monitoring and control',
            'Variable speed fan control',
            'Advanced filtration system',
            'Emergency backup systems'
          ],
          popularInIndustries: ['Data Centers', 'Manufacturing', 'Commercial', 'Healthcare', 'Hospitality'],
          popularInRegions: ['Johor', 'Klang Valley', 'Kulim Hi-Tech', 'Penang'],
          urgencyLevel: 'medium',
          stockLevel: 5,
          leadTime: '4-6 weeks',
          certifications: ['AHRI Certified', 'Energy Star', 'ISO 14001', 'Green Building Certified'],
          warranty: '5 years compressor, 2 years parts',
          // Phase 2B enhancements
          aiMetrics: {
            demandTrend: 'seasonal',
            seasonalityScore: 0.8,
            maintenanceFrequency: 'quarterly',
            replacementCycle: '12-15 years',
            failureRate: 0.05,
            energyEfficiency: 'A++'
          },
          geographicPopularity: {
            'Data Centers': 0.95,
            'Manufacturing Facilities': 0.78,
            'Commercial Buildings': 0.82
          },
          factoryCompatibility: {
            'Data Centers': 0.95,
            'Manufacturing': 0.78,
            'Commercial': 0.82,
            'Healthcare': 0.88,
            'Hospitality': 0.75
          },
          predictiveInsights: {
            energySavings: '20-25%',
            carbonFootprintReduction: '30%',
            maintenanceCostSaving: '35%',
            paybackPeriod: '3.5 years',
            operationalLifespan: '15-20 years',
            peakDemandReduction: '40%'
          },
          marketIntelligence: {
            competitorPrice: 35000,
            marketShare: '12%',
            customerSatisfaction: 4.5,
            returnRate: 0.03
          },
          personalizedScore: 0,
          trendingScore: 65,
          demandScore: 82,
          tags: ['high-capacity', 'energy-star', 'smart-controls', 'eco-friendly']
        },
        {
          id: 'valve_ball_001',
          name: 'High-Pressure Ball Valve - Stainless Steel',
          category: 'Valves',
          subcategory: 'Ball Valves',
          price: 2850,
          originalPrice: 3200,
          image: '/api/placeholder/400/300',
          supplier: 'Valve Tech Malaysia',
          supplierLocation: 'Pengerang, Johor',
          supplierContact: {
            phone: '+60 7-826 7700',
            email: 'sales@valvetech.my',
            website: 'www.valvetech.my'
          },
          rating: 4.8,
          reviewCount: 27,
          specifications: {
            size: '4 inch',
            pressure: '1500 PSI',
            material: 'SS 316',
            operation: 'Manual/Actuated',
            endConnection: 'Flanged RF',
            temperature: '-29°C to 232°C',
            seatMaterial: 'PTFE',
            bodyDesign: 'Two-piece'
          },
          description: 'Premium stainless steel ball valve for high-pressure applications in oil & gas, petrochemical, and process industries. Designed for critical service applications.',
          detailedFeatures: [
            'Fire-safe design certified',
            'Blow-out proof stem design',
            'Anti-static stem design',
            'Full port for minimal pressure drop',
            'Locking device available',
            'Emergency sealant injection'
          ],
          popularInIndustries: ['Oil & Gas', 'Petrochemical', 'Chemical Processing', 'Power Generation', 'Marine'],
          popularInRegions: ['Pengerang', 'East Coast', 'Sabah', 'Sarawak'],
          urgencyLevel: 'high',
          stockLevel: 15,
          leadTime: '2-3 weeks',
          certifications: ['API 6D', 'ISO 14313', 'CE PED', 'NACE MR0175', 'Fire Safe API 607'],
          warranty: '10 years seat leakage, 5 years materials',
          // Phase 2B enhancements
          aiMetrics: {
            demandTrend: 'stable',
            seasonalityScore: 0.2,
            maintenanceFrequency: 'annual',
            replacementCycle: '15-20 years',
            failureRate: 0.01,
            reliabilityScore: 'A++'
          },
          geographicPopularity: {
            'Petrochemical Plants': 0.95,
            'Oil Refineries': 0.92,
            'Gas Processing': 0.88
          },
          factoryCompatibility: {
            'Oil & Gas': 0.95,
            'Petrochemical': 0.92,
            'Chemical Processing': 0.88,
            'Power Generation': 0.85,
            'Marine': 0.80
          },
          predictiveInsights: {
            reliabilityScore: 0.98,
            maintenanceCostSaving: '50%',
            emergencyShutdownCapability: 'Excellent',
            safetyRating: 'Critical Service Approved',
            expectedLifespan: '20-25 years',
            operationalUptime: '99.8%'
          },
          marketIntelligence: {
            competitorPrice: 3800,
            marketShare: '25%',
            customerSatisfaction: 4.9,
            returnRate: 0.01
          },
          personalizedScore: 0,
          trendingScore: 88,
          demandScore: 94,
          tags: ['high-pressure', 'fire-safe', 'api-certified', 'critical-service']
        },
        {
          id: 'sensor_pressure_001',
          name: 'Smart Pressure Transmitter - HART Protocol',
          category: 'Instrumentation',
          subcategory: 'Pressure Sensors',
          price: 1250,
          originalPrice: 1450,
          image: '/api/placeholder/400/300',
          supplier: 'InstruTech Solutions',
          supplierLocation: 'Cyberjaya, Selangor',
          supplierContact: {
            phone: '+60 3-8314 5500',
            email: 'instruments@instrutech.my',
            website: 'www.instrutech.my'
          },
          rating: 4.7,
          reviewCount: 19,
          specifications: {
            range: '0-1000 PSI',
            accuracy: '±0.1%',
            output: '4-20mA + HART',
            material: 'SS 316L',
            certification: 'SIL 2',
            operatingTemp: '-40°C to 85°C',
            protection: 'IP67',
            display: 'LCD Digital'
          },
          description: 'High-accuracy smart pressure transmitter with HART communication for process control and monitoring applications. Features advanced diagnostics and calibration.',
          detailedFeatures: [
            'HART digital communication',
            'Advanced diagnostics',
            'Local configuration via buttons',
            'Overpressure protection',
            'Lightning protection',
            'Vibration resistant design'
          ],
          popularInIndustries: ['Process Industries', 'Oil & Gas', 'Pharmaceutical', 'Food & Beverage', 'Water Treatment'],
          popularInRegions: ['Klang Valley', 'Pengerang', 'Kulim Hi-Tech', 'Penang'],
          urgencyLevel: 'low',
          stockLevel: 20,
          leadTime: '1-2 weeks',
          certifications: ['SIL 2', 'ATEX', 'IECEx', 'FM Approved', 'CSA Certified'],
          warranty: '3 years full warranty',
          // Phase 2B enhancements
          aiMetrics: {
            demandTrend: 'increasing',
            seasonalityScore: 0.1,
            maintenanceFrequency: 'annual',
            replacementCycle: '7-10 years',
            failureRate: 0.02,
            accuracyRating: 'A++'
          },
          geographicPopularity: {
            'Process Plants': 0.90,
            'Refineries': 0.85,
            'Pharmaceutical': 0.82
          },
          factoryCompatibility: {
            'Process Industries': 0.95,
            'Oil & Gas': 0.88,
            'Pharmaceutical': 0.85,
            'Food & Beverage': 0.80,
            'Water Treatment': 0.78
          },
          predictiveInsights: {
            accuracyDrift: 'Minimal over 5 years',
            calibrationInterval: '2 years',
            diagnosticCapability: 'Advanced',
            digitalTwinReady: 'Yes',
            iotIntegration: 'Full support',
            predictiveMaintenanceReady: 'Yes'
          },
          marketIntelligence: {
            competitorPrice: 1650,
            marketShare: '20%',
            customerSatisfaction: 4.6,
            returnRate: 0.03
          },
          personalizedScore: 0,
          trendingScore: 75,
          demandScore: 86,
          tags: ['smart-sensor', 'hart-protocol', 'high-accuracy', 'iot-ready']
        }
      ];

      // Apply Phase 2B AI scoring
      const productsWithAIScoring = enhancedProducts.map(product => ({
        ...product,
        personalizedScore: calculateAdvancedPersonalizedScore(product, factoryProfile),
        marketIntelligenceScore: calculateMarketIntelligenceScore(product, geographicData),
        predictiveScore: calculatePredictiveScore(product, factoryProfile)
      }));

      setProducts(productsWithAIScoring);
      console.log('✅ Enhanced catalog loaded with Phase 2B intelligence:', productsWithAIScoring.length, 'products');

    } catch (error) {
      console.error('❌ Error loading enhanced catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simulate intelligent loading process
  const simulateIntelligentLoading = () => {
    return new Promise((resolve) => {
      const loadingSteps = [
        { step: 'Analyzing factory profile...', delay: 400 },
        { step: 'Loading market intelligence...', delay: 600 },
        { step: 'Calculating product relevance...', delay: 500 },
        { step: 'Generating AI recommendations...', delay: 700 },
        { step: 'Optimizing catalog display...', delay: 300 }
      ];

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < loadingSteps.length) {
          console.log(`🔄 ${loadingSteps[currentStep].step}`);
          currentStep++;
        } else {
          clearInterval(progressInterval);
          resolve();
        }
      }, 300);
    });
  };

  /**
   * Enhanced personalized recommendations with Phase 2B AI
   */
  const loadPersonalizedRecommendations = async () => {
    try {
      console.log('🤖 Loading Phase 2B AI-powered recommendations...');

      // Advanced recommendation engine
      const aiRecommendations = await generateAdvancedRecommendations();
      
      const enhancedRecommendations = [
        {
          type: 'ai_predicted_needs',
          title: `🔮 AI-Predicted Requirements for ${factoryProfile.industry}`,
          subtitle: `Based on industry patterns and maintenance cycles`,
          products: aiRecommendations.predictedNeeds,
          confidence: 0.94,
          reason: `AI analysis indicates ${factoryProfile.industry} factories typically require these items in the next 30-90 days`,
          aiInsight: {
            predictionAccuracy: '94%',
            dataPoints: 15000,
            modelVersion: 'v2.1',
            lastUpdated: new Date().toISOString()
          }
        },
        {
          type: 'geographic_optimization',
          title: `📍 Optimized for ${factoryProfile.location?.region || 'Your Location'}`,
          subtitle: 'Products with fastest delivery and best regional support',
          products: aiRecommendations.geographicOptimized,
          confidence: 0.89,
          reason: `Suppliers in your region offer 40% faster delivery and 25% better support response times`,
          aiInsight: {
            avgDeliveryTime: '3.2 days',
            supportResponseTime: '2.1 hours',
            costOptimization: '18% savings'
          }
        },
        {
          type: 'industry_trending',
          title: `📈 Trending in ${factoryProfile.industry} Sector`,
          subtitle: 'Products gaining momentum among similar factories',
          products: aiRecommendations.industryTrending,
          confidence: 0.87,
          reason: `85% adoption increase among ${factoryProfile.industry} factories in the last quarter`,
          aiInsight: {
            adoptionRate: '+85%',
            peerFactories: 142,
            trendStrength: 'Strong',
            emergingTech: true
          }
        },
        {
          type: 'cost_optimization',
          title: '💰 Smart Cost Optimization',
          subtitle: 'Maximum value products for your budget profile',
          products: aiRecommendations.costOptimized,
          confidence: 0.91,
          reason: `These products offer the best ROI based on similar factory profiles and usage patterns`,
          aiInsight: {
            avgROI: '180%',
            paybackPeriod: '8.5 months',
            totalSavings: 'RM 45,000',
            efficiencyGain: '+32%'
          }
        }
      ];

      setRecommendations(enhancedRecommendations);
      
      // Update AI insights
      setAiInsights({
        userBehaviorScore: calculateBehaviorScore(),
        factoryConfidence: factoryProfile?.confidence || 0,
        recommendationAccuracy: 0.92
      });

      console.log('✅ Enhanced recommendations loaded:', enhancedRecommendations.length, 'sections');

    } catch (error) {
      console.error('❌ Error loading enhanced recommendations:', error);
    }
  };

  // Generate advanced AI recommendations
  const generateAdvancedRecommendations = async () => {
    const relevantProducts = products.filter(p => 
      p.popularInIndustries.includes(factoryProfile?.industry) ||
      p.popularInRegions.some(region => 
        factoryProfile?.location?.region?.includes(region.split(' ')[0])
      )
    );

    return {
      predictedNeeds: relevantProducts
        .filter(p => p.predictiveInsights?.nextMaintenanceWindow === '2025-Q1')
        .sort((a, b) => b.aiMetrics?.maintenanceFrequency === 'quarterly' ? 1 : -1)
        .slice(0, 3),
      
      geographicOptimized: relevantProducts
        .filter(p => p.geographicPopularity && 
          Object.keys(p.geographicPopularity).some(region => 
            factoryProfile?.location?.region?.includes(region.split(' ')[0])
          ))
        .sort((a, b) => b.stockLevel - a.stockLevel)
        .slice(0, 3),
      
      industryTrending: relevantProducts
        .filter(p => p.aiMetrics?.demandTrend === 'increasing')
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 3),
      
      costOptimized: relevantProducts
        .filter(p => p.predictiveInsights?.roiProjection)
        .sort((a, b) => {
          const roiA = parseInt(a.predictiveInsights?.roiProjection) || 24;
          const roiB = parseInt(b.predictiveInsights?.roiProjection) || 24;
          return roiA - roiB;
        })
        .slice(0, 3)
    };
  };

  /**
   * Enhanced personalized scoring with Phase 2B AI algorithms
   */
  const calculateAdvancedPersonalizedScore = useCallback((product, factory) => {
    if (!factory) return product.demandScore || 50;

    let score = 0;
    const weights = {
      industryRelevance: 0.35,
      geographicOptimization: 0.25,
      aiPredictiveAnalysis: 0.20,
      marketIntelligence: 0.15,
      behaviorAlignment: 0.05
    };

    // 1. Industry Relevance (35%)
    const industryMatch = product.factoryCompatibility?.[factory.industry] || 0;
    if (industryMatch > 0.8) score += weights.industryRelevance * 100;
    else if (industryMatch > 0.6) score += weights.industryRelevance * 70;
    else if (product.popularInIndustries.includes(factory.industry)) score += weights.industryRelevance * 50;

    // 2. Geographic Optimization (25%)
    const geoRelevance = product.geographicPopularity?.[factory.industrialZone] || 0;
    score += weights.geographicOptimization * geoRelevance * 100;

    // 3. AI Predictive Analysis (20%)
    if (product.predictiveInsights) {
      if (product.aiMetrics?.demandTrend === 'increasing') score += weights.aiPredictiveAnalysis * 40;
      if (product.predictiveInsights.roiProjection && parseInt(product.predictiveInsights.roiProjection) < 20) {
        score += weights.aiPredictiveAnalysis * 35;
      }
      if (product.predictiveInsights.energyEfficiencyRating === 'A++') score += weights.aiPredictiveAnalysis * 25;
    }

    // 4. Market Intelligence (15%)
    score += weights.marketIntelligence * (product.demandScore || 50);

    // 5. Behavior Alignment (5%)
    score += weights.behaviorAlignment * aiInsights.userBehaviorScore;

    return Math.min(100, Math.max(0, score));
  }, [aiInsights.userBehaviorScore]);

  // Calculate market intelligence score
  const calculateMarketIntelligenceScore = (product, geoData) => {
    if (!geoData) return 50;

    let score = 0;
    const relevantZone = geoData.industrialZones.find(zone => 
      product.popularInRegions.some(region => zone.name.includes(region))
    );

    if (relevantZone) {
      score += relevantZone.marketOpportunity === 'Strong' ? 30 : 20;
      score += relevantZone.competitionLevel === 'Low' ? 25 : 
                relevantZone.competitionLevel === 'Medium' ? 15 : 10;
      score += Math.min(25, (product.price / relevantZone.averageOrderValue) * 25);
    }

    return Math.min(100, score);
  };

  // Calculate predictive score based on AI insights
  const calculatePredictiveScore = (product, factory) => {
    if (!product.predictiveInsights) return 50;

    let score = 0;
    
    // ROI factor
    const roiMonths = parseInt(product.predictiveInsights.roiProjection) || 24;
    score += Math.max(0, 50 - roiMonths * 2);

    // Risk factor
    const riskScore = product.predictiveInsights.failureRiskScore || 0.5;
    score += (1 - riskScore) * 30;

    // Efficiency factor
    if (product.predictiveInsights.energyEfficiencyRating === 'A++') score += 20;
    else if (product.predictiveInsights.energyEfficiencyRating === 'A+') score += 15;

    return Math.min(100, score);
  };

  /**
   * Enhanced product filtering with advanced algorithms
   */
  const filterProducts = useCallback(() => {
    let filtered = [...products];

    // Search filter with enhanced matching
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.subcategory.toLowerCase().includes(query) ||
        product.supplier.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.tags.some(tag => tag.toLowerCase().includes(query)) ||
        Object.values(product.specifications).some(spec => 
          spec.toString().toLowerCase().includes(query)
        ) ||
        product.detailedFeatures.some(feature => 
          feature.toLowerCase().includes(query)
        )
      );
    }

    // Enhanced filter application
    if (activeFilters.category !== 'all') {
      filtered = filtered.filter(product => 
        product.category === activeFilters.category
      );
    }

    if (activeFilters.industry !== 'all') {
      filtered = filtered.filter(product => 
        product.popularInIndustries.includes(activeFilters.industry)
      );
    }

    if (activeFilters.priceRange !== 'all') {
      const priceRanges = {
        'low': [0, 2000],
        'medium': [2000, 10000],
        'high': [10000, 30000],
        'enterprise': [30000, Infinity]
      };
      
      const [min, max] = priceRanges[activeFilters.priceRange];
      filtered = filtered.filter(product => 
        product.price >= min && product.price < max
      );
    }

    if (activeFilters.urgency !== 'all') {
      filtered = filtered.filter(product => 
        product.urgencyLevel === activeFilters.urgency
      );
    }

    if (activeFilters.availability !== 'all') {
      if (activeFilters.availability === 'in_stock') {
        filtered = filtered.filter(product => product.stockLevel > 0);
      } else if (activeFilters.availability === 'low_stock') {
        filtered = filtered.filter(product => product.stockLevel < 10);
      }
    }

    // Enhanced sorting with AI algorithms
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'ai_relevance':
          const scoreA = factoryProfile ? a.personalizedScore : a.demandScore;
          const scoreB = factoryProfile ? b.personalizedScore : b.demandScore;
          return scoreB - scoreA;
        case 'price_low':
          return a.price - b.price;
        case 'price_high':
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'popularity':
          return b.demandScore - a.demandScore;
        case 'newest':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        default:
          return b.demandScore - a.demandScore;
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, activeFilters, factoryProfile, sortOption]);

  /**
   * Enhanced product interaction tracking with Phase 2B analytics
   */
  const trackProductInteraction = async (product, action, additionalData = {}) => {
    try {
      const interactionData = {
        sessionId,
        productId: product.id,
        action,
        timestamp: new Date().toISOString(),
        productCategory: product.category,
        productPrice: product.price,
        factoryProfile: factoryProfile ? {
          industry: factoryProfile.industry,
          location: factoryProfile.location,
          confidence: factoryProfile.confidence
        } : null,
        contextData: {
          searchQuery: searchQuery || null,
          activeFilters: { ...activeFilters },
          recommendationContext: additionalData.recommendationContext || null,
          userBehaviorScore: aiInsights.userBehaviorScore,
          timeOnPage: Date.now() - pageLoadTime,
          scrollDepth: additionalData.scrollDepth || 0,
          deviceType: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'
        },
        aiMetrics: {
          personalizedScore: product.personalizedScore,
          marketIntelligenceScore: product.marketIntelligenceScore || 0,
          predictiveScore: product.predictiveScore || 0
        },
        ...additionalData
      };

      // Send to analytics service
      await analyticsService.trackProductInteraction(interactionData);

      // Update real-time metrics
      setRealTimeMetrics(prev => ({
        ...prev,
        recentInteractions: prev.recentInteractions + 1
      }));

      // Update behavior score
      updateBehaviorScore(action, product);

      console.log(`📊 Enhanced interaction tracked: ${action} on ${product.name}`, interactionData);
      
    } catch (error) {
      console.error('❌ Error tracking enhanced interaction:', error);
    }
  };

  // Update user behavior score based on interactions
  const updateBehaviorScore = (action, product) => {
    const actionWeights = {
      'view': 1,
      'detail_view': 2,
      'quote': 5,
      'compare': 3,
      'specification_view': 2,
      'supplier_contact': 4,
      'download_specs': 3,
      'share': 2,
      'favorite': 4
    };

    const scoreIncrease = actionWeights[action] || 1;
    setAiInsights(prev => ({
      ...prev,
      userBehaviorScore: Math.min(100, prev.userBehaviorScore + scoreIncrease)
    }));
  };

  // Generate AI insights
  const generateAIInsights = (factoryProfile) => {
    setAiInsights({
      userBehaviorScore: 0,
      factoryConfidence: factoryProfile?.confidence || 0,
      recommendationAccuracy: 0.85
    });
  };

  // Event handlers
  const handleProductClick = (product) => {
    trackProductInteraction(product, 'view', {
      duration: Date.now() - pageLoadTime,
      searchQuery: searchQuery || null,
      filterContext: activeFilters
    });
  };

  const handleQuoteRequest = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'quote');
    
    // Enhanced quote request with AI insights
    const quoteData = {
      product: product,
      factoryProfile: factoryProfile,
      aiRecommendations: {
        alternativeProducts: products.filter(p => 
          p.category === product.category && p.id !== product.id
        ).slice(0, 3),
        bundleOpportunities: products.filter(p => 
          p.popularInIndustries.some(industry => 
            product.popularInIndustries.includes(industry)
          ) && p.id !== product.id
        ).slice(0, 2)
      }
    };
    
    alert(`Smart Quote Request for ${product.name}\n\nAI has identified:\n- ${quoteData.aiRecommendations.alternativeProducts.length} alternative options\n- ${quoteData.aiRecommendations.bundleOpportunities.length} bundle opportunities\n\nFull feature available in production!`);
  };

  const handleProductCompare = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'compare');
    
    alert(`${product.name} added to AI comparison\n\nPhase 2B features:\n- AI-powered feature comparison\n- ROI analysis\n- Compatibility scoring\n\nFull feature available in production!`);
  };

  const handleProductFavorite = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'favorite');
    
    alert(`${product.name} added to favorites with AI tracking!`);
  };

  const handleProductShare = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'share');
    
    alert(`Sharing ${product.name} with AI insights!`);
  };

  const handleDownloadSpecs = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'download_specs');
    
    alert(`Downloading enhanced specifications for ${product.name}!`);
  };

  const handleSupplierContact = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'supplier_contact');
    
    alert(`Contacting ${product.supplier}\n\nAI will provide:\n- Optimal contact time\n- Conversation starters\n- Negotiation insights`);
  };

  // Smart product sorting for display
  const smartSortProducts = useMemo(() => {
    return filteredProducts; // Already sorted in filterProducts
  }, [filteredProducts]);

  // Enhanced factory intelligence panel
  const FactoryIntelligencePanel = useMemo(() => {
    if (!factoryProfile || factoryProfile.confidence < 0.6) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Factory className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                🏭 {factoryProfile.companyName || 'Factory Identified'}
              </h3>
              <p className="text-sm text-gray-600">
                {factoryProfile.industry} • {factoryProfile.location?.region} • {factoryProfile.size || 'Medium Scale'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">
              {Math.round(factoryProfile.confidence * 100)}% Confidence
            </div>
            <div className="text-xs text-gray-500">Phase 2B AI Analytics</div>
          </div>
        </div>
        
        {/* AI Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Behavior Score</div>
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-purple-600">
              {Math.round(aiInsights.userBehaviorScore)}/100
            </div>
            <div className="text-xs text-gray-500">Real-time analysis</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Active Sessions</div>
              <Activity className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-xl font-bold text-green-600">
              {realTimeMetrics.activeSessions}
            </div>
            <div className="text-xs text-gray-500">Live tracking</div>
          </div>
          
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">AI Accuracy</div>
              <Brain className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-600">
              {Math.round(aiInsights.recommendationAccuracy * 100)}%
            </div>
            <div className="text-xs text-gray-500">Recommendation engine</div>
          </div>
        </div>

        {/* Feature Indicators */}
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center space-x-2 text-blue-600">
            <Brain className="w-4 h-4" />
            <span>AI Predictions Active</span>
          </div>
          <div className="flex items-center space-x-2 text-green-600">
            <Target className="w-4 h-4" />
            <span>Personalized Ranking</span>
          </div>
          <div className="flex items-center space-x-2 text-purple-600">
            <TrendingUp className="w-4 h-4" />
            <span>Market Intelligence</span>
          </div>
          <div className="flex items-center space-x-2 text-orange-600">
            <MapPin className="w-4 h-4" />
            <span>Geographic Optimization</span>
          </div>
          {factoryProfile.identificationMethod?.length > 0 && (
            <div className="flex items-center space-x-2 text-gray-600">
              <AlertCircle className="w-4 h-4" />
              <span>ID: {factoryProfile.identificationMethod.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Industrial Zone Intelligence */}
        {geographicData && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Industrial Zone Intelligence</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {geographicData.industrialZones.slice(0, 2).map((zone, index) => (
                <div key={index} className="bg-white rounded p-2 border border-gray-100">
                  <div className="font-medium text-gray-800">{zone.name}</div>
                  <div className="text-gray-600">
                    Avg Order: RM {zone.averageOrderValue.toLocaleString()} • 
                    Opportunity: {zone.marketOpportunity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [factoryProfile, aiInsights, realTimeMetrics, geographicData]);

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🚀 Initializing HiggsFlow Phase 2B</h2>
          <p className="text-gray-600 mb-4">Advanced Industrial Intelligence Loading...</p>
          
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-center space-x-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Factory identification complete</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>AI recommendation engine active</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-purple-600">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span>Market intelligence syncing</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-orange-600">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span>Geographic optimization ready</span>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            Phase 2B • Advanced Analytics • Real-time Intelligence
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🛒 HiggsFlow Smart Catalog
              </h1>
              <p className="text-sm text-gray-600">
                Malaysia's Most Advanced Industrial E-commerce Platform
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Phase 2B • AI-Powered • Real-time Intelligence
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Enhanced Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search with AI assistance..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchQuery && (
                  <div className="absolute right-3 top-2.5 text-xs text-blue-600">
                    AI Enhanced
                  </div>
                )}
              </div>
              
              {/* Real-time Activity Dashboard */}
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 text-purple-600">
                  <Brain className="w-4 h-4" />
                  <span>{Math.round(aiInsights.recommendationAccuracy * 100)}% AI accuracy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Factory Intelligence Panel */}
        {FactoryIntelligencePanel}
        
        <div className="flex gap-6">
          {/* Enhanced Filters Sidebar */}
          <div className="w-64 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Smart Filters</h3>
              </div>
              
              <div className="space-y-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    value={activeFilters.category}
                    onChange={(e) => setActiveFilters({...activeFilters, category: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Pumps">Pumps</option>
                    <option value="Safety Equipment">Safety Equipment</option>
                    <option value="Electrical">Electrical</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Valves">Valves</option>
                    <option value="Instrumentation">Instrumentation</option>
                  </select>
                </div>

                {/* Industry Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select 
                    value={activeFilters.industry}
                    onChange={(e) => setActiveFilters({...activeFilters, industry: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Industries</option>
                    <option value="Oil & Gas">Oil & Gas</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Petrochemical">Petrochemical</option>
                    <option value="Construction">Construction</option>
                    <option value="Data Centers">Data Centers</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Food Processing">Food Processing</option>
                  </select>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                  <select 
                    value={activeFilters.priceRange}
                    onChange={(e) => setActiveFilters({...activeFilters, priceRange: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Prices</option>
                    <option value="low">Under RM 2,000</option>
                    <option value="medium">RM 2,000 - 10,000</option>
                    <option value="high">RM 10,000 - 30,000</option>
                    <option value="enterprise">RM 30,000+</option>
                  </select>
                </div>

                {/* Urgency Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
                  <select 
                    value={activeFilters.urgency}
                    onChange={(e) => setActiveFilters({...activeFilters, urgency: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Urgency Levels</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>

                {/* Availability Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
                  <select 
                    value={activeFilters.availability}
                    onChange={(e) => setActiveFilters({...activeFilters, availability: e.target.value})}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Availability</option>
                    <option value="in_stock">In Stock</option>
                    <option value="low_stock">Low Stock</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Enhanced AI Insights Panel */}
            {factoryProfile && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 p-4 shadow-sm">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Phase 2B AI Insights</h3>
                </div>
                
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <span className="text-gray-700">
                      Products ranked by AI relevance score for {factoryProfile.industry}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-gray-700">
                      Geographic optimization for {factoryProfile.location?.region || 'your location'}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span className="text-gray-700">
                      Real-time market intelligence and demand forecasting
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Target className="w-4 h-4 text-orange-500 mt-0.5" />
                    <span className="text-gray-700">
                      Predictive maintenance and ROI optimization
                    </span>
                  </div>
                </div>

                {/* AI Performance Metrics */}
                <div className="mt-4 pt-3 border-t border-purple-200">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-purple-600">
                        {Math.round(aiInsights.factoryConfidence * 100)}%
                      </div>
                      <div className="text-gray-600">Factory Match</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-600">
                        {Math.round(aiInsights.userBehaviorScore)}
                      </div>
                      <div className="text-gray-600">Behavior Score</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">
                        {Math.round(aiInsights.recommendationAccuracy * 100)}%
                      </div>
                      <div className="text-gray-600">AI Accuracy</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Quick Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">📊 Intelligent Catalog Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products</span>
                  <span className="font-medium">{products.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">AI-Filtered Results</span>
                  <span className="font-medium text-blue-600">{filteredProducts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Smart Recommendations</span>
                  <span className="font-medium text-purple-600">{recommendations.length}</span>
                </div>
                {factoryProfile && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Personalization</span>
                      <span className="font-medium text-green-600">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Factory Confidence</span>
                      <span className="font-medium text-indigo-600">
                        {Math.round(factoryProfile.confidence * 100)}%
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Real-time Sessions</span>
                  <span className="font-medium text-orange-600">{realTimeMetrics.activeSessions}</span>
                </div>
              </div>

              {/* Phase 2B Features Indicator */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">Phase 2B Features:</div>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">AI Scoring</span>
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">Geo-Intel</span>
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded">Predictive</span>
                  <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded">Real-time</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Enhanced AI Recommendations Section */}
            {recommendations.length > 0 && (
              <div className="space-y-6 mb-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    🤖 Phase 2B AI-Powered Recommendations
                  </h2>
                  <p className="text-gray-600">
                    Advanced machine learning recommendations tailored for your factory
                  </p>
                </div>

                {recommendations.map((section, index) => (
                  <div key={index} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{section.subtitle}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(section.confidence * 100)}%
                          </div>
                          <Brain className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="text-xs text-gray-500">AI Confidence</div>
                      </div>
                    </div>
                    
                    {/* Enhanced AI Insight Display */}
                    {section.aiInsight && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {Object.entries(section.aiInsight).map(([key, value]) => (
                            <div key={key} className="text-center">
                              <div className="font-bold text-blue-600">{value}</div>
                              <div className="text-xs text-gray-600 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {section.products.map((product) => (
                        <RecommendationProductCard 
                          key={product.id} 
                          product={product}
                          recommendationType={section.type}
                          onProductClick={handleProductClick}
                          onQuoteRequest={handleQuoteRequest}
                          onProductCompare={handleProductCompare}
                          onProductFavorite={handleProductFavorite}
                          onProductShare={handleProductShare}
                          aiInsight={section.aiInsight}
                        />
                      ))}
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-2 text-sm">
                        <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 italic">{section.reason}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Enhanced All Products Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    🛍️ Complete Product Catalog ({filteredProducts.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {factoryProfile ? 
                      `AI-optimized ranking active • Personalized for ${factoryProfile.industry}` : 
                      'Sorted by popularity and demand'
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Sort Options */}
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Sort by:</label>
                    <select 
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ai_relevance">🤖 AI Relevance</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="rating">Rating</option>
                      <option value="popularity">Popularity</option>
                      <option value="newest">Newest</option>
                    </select>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center space-x-1 border border-gray-300 rounded">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    >
                      <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                        <div className="bg-current"></div>
                        <div className="bg-current"></div>
                        <div className="bg-current"></div>
                        <div className="bg-current"></div>
                      </div>
                    </button>
                    <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                    >
                      <div className="w-4 h-4 flex flex-col gap-0.5">
                        <div className="h-1 bg-current"></div>
                        <div className="h-1 bg-current"></div>
                        <div className="h-1 bg-current"></div>
                      </div>
                    </button>
                  </div>

                  {factoryProfile && (
                    <div className="flex items-center space-x-2 text-sm">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-600 font-medium">Phase 2B Smart Ranking</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    Updated: {new Date().toLocaleTimeString()}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <Activity className="w-4 h-4" />
                    <span>Live Data</span>
                  </div>
                </div>
              </div>

              {/* Enhanced Real-time Activity Banner */}
              {realTimeMetrics.activeSessions > 0 && (
                <div className="mb-6 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {realTimeMetrics.activeSessions} factories browsing now
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-700">
                          {realTimeMetrics.recentInteractions} recent interactions
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600">
                      Live analytics • Phase 2B
                    </div>
                  </div>
                </div>
              )}
              
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-12 h-12 mx-auto" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No products found</h4>
                  <p className="text-gray-600 mb-4">Try adjusting your search or filters</p>
                  {factoryProfile && (
                    <div className="text-sm text-blue-600">
                      AI suggestions: Try searching for "{factoryProfile.industry}" related products
                    </div>
                  )}
                </div>
              ) : (
                <div className={viewMode === 'grid' ? 
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : 
                  "space-y-4"
                }>
                  {smartSortProducts.map((product, index) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                      isPersonalized={!!factoryProfile}
                      onProductClick={handleProductClick}
                      onQuoteRequest={handleQuoteRequest}
                      onProductCompare={handleProductCompare}
                      onProductFavorite={handleProductFavorite}
                      onProductShare={handleProductShare}
                      onDownloadSpecs={handleDownloadSpecs}
                      onSupplierContact={handleSupplierContact}
                      rank={index + 1}
                      isPhase2B={true}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Recommendation Product Card Component with Phase 2B features
const RecommendationProductCard = ({ 
  product, 
  recommendationType, 
  onProductClick, 
  onQuoteRequest, 
  onProductCompare, 
  onProductFavorite,
  onProductShare,
  aiInsight 
}) => {
  const savings = product.originalPrice - product.price;
  const savingsPercent = Math.round((savings / product.originalPrice) * 100);

  return (
    <div 
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all cursor-pointer group bg-gradient-to-br from-white to-blue-50"
      onClick={() => onProductClick(product)}
    >
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
        />
        
        {/* Enhanced badges */}
        <div className="absolute top-2 left-2 space-y-1">
          {savingsPercent > 10 && (
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Save {savingsPercent}%
            </div>
          )}
          {product.urgencyLevel === 'high' && (
            <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
              Urgent
            </div>
          )}
          {product.aiMetrics?.demandTrend === 'increasing' && (
            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              📈 Trending
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2">
          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            🤖 AI Rec
          </div>
        </div>
        
        {/* AI Score overlay */}
        {product.personalizedScore > 80 && (
          <div className="absolute bottom-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
            {Math.round(product.personalizedScore)}% Match
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h4 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600 line-clamp-2">
          {product.name}
        </h4>
        <p className="text-xs text-gray-600 mb-2">{product.category}</p>
        
        {/* Enhanced pricing with AI insights */}
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="font-bold text-green-600 text-sm">
              RM {product.price.toLocaleString()}
            </span>
            {savingsPercent > 0 && (
              <span className="text-xs text-gray-500 line-through ml-1">
                RM {product.originalPrice.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-xs text-gray-600">{product.rating}</span>
          </div>
        </div>

        {/* AI Prediction Insights */}
        {product.predictiveInsights && (
          <div className="mb-2 p-2 bg-blue-50 rounded text-xs">
            <div className="font-medium text-blue-800">AI Prediction:</div>
            <div className="text-blue-700">
              ROI: {product.predictiveInsights.roiProjection} • 
              {product.predictiveInsights.energySavings && ` Saves: ${product.predictiveInsights.energySavings}`}
            </div>
          </div>
        )}
        
        <div className="flex space-x-1 mb-2">
          <button 
            className="flex-1 bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700 transition-colors"
            onClick={(e) => onQuoteRequest(product, e)}
          >
            Smart Quote
          </button>
          <button 
            className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors"
            onClick={(e) => onProductCompare(product, e)}
            title="AI Compare"
          >
            📊
          </button>
          <button 
            className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors"
            onClick={(e) => onProductFavorite(product, e)}
            title="Add to Favorites"
          >
            <Heart className="w-3 h-3" />
          </button>
          <button 
            className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors"
            onClick={(e) => onProductShare(product, e)}
            title="Share"
          >
            <Share2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Enhanced Main Product Card Component with Phase 2B features
const ProductCard = ({ 
  product, 
  isPersonalized, 
  onProductClick, 
  onQuoteRequest, 
  onProductCompare, 
  onProductFavorite,
  onProductShare,
  onDownloadSpecs,
  onSupplierContact,
  rank, 
  isPhase2B,
  viewMode = 'grid'
}) => {
  const savings = product.originalPrice - product.price;
  const savingsPercent = Math.round((savings / product.originalPrice) * 100);
  const personalizedScore = product.personalizedScore;
  const marketScore = product.marketIntelligenceScore || 0;
  const predictiveScore = product.predictiveScore || 0;

  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer"
           onClick={() => onProductClick(product)}>
        <div className="flex items-center space-x-4">
          <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{product.name}</h4>
            <p className="text-sm text-gray-600">{product.category} • {product.supplier}</p>
            <div className="flex items-center space-x-4 mt-2">
              <span className="font-bold text-green-600">RM {product.price.toLocaleString()}</span>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm">{product.rating}</span>
              </div>
              {isPersonalized && personalizedScore > 70 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                  {Math.round(personalizedScore)}% AI Match
                </span>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              onClick={(e) => onQuoteRequest(product, e)}
            >
              Quote
            </button>
            <button 
              className="border border-gray-300 px-3 py-2 rounded hover:bg-gray-50 transition-colors"
              onClick={(e) => onProductCompare(product, e)}
            >
              Compare
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all cursor-pointer group bg-white relative"
      onClick={() => onProductClick(product)}
    >
      {/* AI Ranking Badge */}
      {isPhase2B && rank <= 3 && (
        <div className="absolute top-2 left-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs px-2 py-1 rounded-full z-10">
          #{rank} AI Pick
        </div>
      )}

      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
        />
        
        {/* Enhanced Badges */}
        <div className="absolute top-2 right-2 space-y-1">
          {savingsPercent > 10 && (
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Save {savingsPercent}%
            </div>
          )}
          {product.urgencyLevel === 'high' && (
            <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>Urgent</span>
            </div>
          )}
          {product.aiMetrics?.demandTrend === 'increasing' && (
            <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              📈 Trending
            </div>
          )}
        </div>

        {/* AI Scores Overlay */}
        {isPersonalized && personalizedScore > 70 && (
          <div className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {Math.round(personalizedScore)}% AI Match
          </div>
        )}
        
        {product.stockLevel < 10 && (
          <div className="absolute bottom-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
            Low Stock ({product.stockLevel})
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="mb-2">
          <h4 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 line-clamp-2">
            {product.name}
          </h4>
          <p className="text-sm text-gray-600">{product.category} • {product.subcategory}</p>
        </div>
        
        {/* Enhanced Key Specifications */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 space-y-1">
            {Object.entries(product.specifications).slice(0, 2).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights Section */}
        {isPhase2B && product.predictiveInsights && (
          <div className="mb-3 p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="text-xs font-medium text-blue-800 mb-1">🤖 AI Insights:</div>
            <div className="text-xs text-blue-700 space-y-1">
              {product.predictiveInsights.roiProjection && (
                <div>ROI: {product.predictiveInsights.roiProjection}</div>
              )}
              {product.predictiveInsights.energyEfficiencyRating && (
                <div>Efficiency: {product.predictiveInsights.energyEfficiencyRating}</div>
              )}
              {product.predictiveInsights.energySavings && (
                <div>Saves: {product.predictiveInsights.energySavings}</div>
              )}
            </div>
          </div>
        )}
        
        {/* Enhanced Pricing */}
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="font-bold text-green-600 text-lg">
              RM {product.price.toLocaleString()}
            </span>
            {savingsPercent > 0 && (
              <div className="text-xs text-gray-500">
                <span className="line-through">RM {product.originalPrice.toLocaleString()}</span>
                <span className="text-red-600 ml-1">(-{savingsPercent}%)</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-1 mb-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm text-gray-600">{product.rating}</span>
              <span className="text-xs text-gray-500">({product.reviewCount})</span>
            </div>
            <div className="text-xs text-gray-500">
              Stock: {product.stockLevel}
            </div>
          </div>
        </div>

        {/* AI Scoring Grid */}
        {isPhase2B && isPersonalized && (
          <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
            <div className="text-center p-1 bg-blue-50 rounded">
              <div className="font-bold text-blue-600">{Math.round(personalizedScore)}</div>
              <div className="text-gray-600">Personal</div>
            </div>
            <div className="text-center p-1 bg-green-50 rounded">
              <div className="font-bold text-green-600">{Math.round(marketScore)}</div>
              <div className="text-gray-600">Market</div>
            </div>
            <div className="text-center p-1 bg-purple-50 rounded">
              <div className="font-bold text-purple-600">{Math.round(predictiveScore)}</div>
              <div className="text-gray-600">Predict</div>
            </div>
          </div>
        )}

        {/* Industry Relevance */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {product.popularInIndustries.slice(0, 2).map((industry) => (
              <span 
                key={industry}
                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
              >
                {industry}
              </span>
            ))}
            {product.factoryCompatibility && isPersonalized && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                🤖 AI Matched
              </span>
            )}
          </div>
        </div>
        
        {/* Enhanced Action Buttons */}
        <div className="space-y-2 mb-3">
          <div className="flex space-x-2">
            <button 
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
              onClick={(e) => onQuoteRequest(product, e)}
            >
              🤖 Smart Quote
            </button>
            <button 
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              onClick={(e) => onProductCompare(product, e)}
              title="AI Compare"
            >
              📊
            </button>
          </div>
          
          <div className="flex space-x-1">
            <button 
              className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              onClick={(e) => onProductFavorite(product, e)}
            >
              <Heart className="w-3 h-3" />
              <span>Save</span>
            </button>
            <button 
              className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              onClick={(e) => onProductShare(product, e)}
            >
              <Share2 className="w-3 h-3" />
              <span>Share</span>
            </button>
            <button 
              className="flex-1 text-xs py-1 px-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center space-x-1"
              onClick={(e) => onDownloadSpecs(product, e)}
            >
              <Download className="w-3 h-3" />
              <span>Specs</span>
            </button>
          </div>
        </div>
        
        {/* Supplier Info */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
            <span>{product.supplier}</span>
            <span>{product.supplierLocation}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
            <span>Lead: {product.leadTime}</span>
            <span>{product.certifications[0]}</span>
          </div>
          
          {/* Enhanced Supplier Contact */}
          <div className="flex space-x-1">
            <button 
              className="flex-1 text-xs py-1 px-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center justify-center space-x-1"
              onClick={(e) => onSupplierContact(product, e)}
            >
              <Phone className="w-3 h-3" />
              <span>Call</span>
            </button>
            <button 
              className="flex-1 text-xs py-1 px-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center justify-center space-x-1"
              onClick={(e) => onSupplierContact(product, e)}
            >
              <Mail className="w-3 h-3" />
              <span>Email</span>
            </button>
          </div>
        </div>

        {/* Phase 2B Personalization Indicator */}
        {isPhase2B && isPersonalized && personalizedScore > 60 && (
          <div className="mt-3 flex items-center space-x-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg">
            <Brain className="w-3 h-3" />
            <span>Phase 2B AI recommends this for your {product.popularInIndustries[0]} operations</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPublicCatalog;
