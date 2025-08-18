// src/components/SmartPublicCatalog.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Star, MapPin, TrendingUp, Eye, ShoppingCart, Clock, Zap, Target, Brain, Factory, Globe } from 'lucide-react';

// Smart Public Catalog with Industrial Intelligence
const SmartPublicCatalog = () => {
  // State management
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
    location: 'all'
  });

  // Session tracking
  const [sessionId, setSessionId] = useState(null);
  const [pageLoadTime] = useState(Date.now());

  // Initialize session tracking
  useEffect(() => {
    initializeSession();
  }, []);

  // Load catalog data
  useEffect(() => {
    loadCatalogData();
  }, []);

  // Update recommendations when factory profile changes
  useEffect(() => {
    if (factoryProfile && factoryProfile.confidence > 0.6) {
      loadPersonalizedRecommendations();
    }
  }, [factoryProfile]);

  // Filter products based on search and filters
  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, activeFilters, factoryProfile]);

  /**
   * Initialize user session with comprehensive tracking
   */
  const initializeSession = async () => {
    try {
      console.log('🚀 Initializing smart catalog session...');

      // Simulate session initialization
      const mockSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setSessionId(mockSessionId);

      // Simulate factory profile detection
      const mockProfile = {
        factoryId: 'factory_demo_001',
        companyName: 'Demo Industrial Factory',
        industry: 'Manufacturing',
        location: { region: 'Klang Valley' },
        confidence: 0.75
      };

      setFactoryProfile(mockProfile);
      console.log('🏭 Demo factory profile set for showcase');

    } catch (error) {
      console.error('❌ Error initializing session:', error);
    }
  };

  /**
   * Load product catalog with smart ranking
   */
  const loadCatalogData = async () => {
    try {
      setLoading(true);
      
      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockProducts = [
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
          rating: 4.8,
          reviewCount: 23,
          specifications: {
            flowRate: '500 GPM',
            head: '150 ft',
            power: '75 HP',
            material: 'Stainless Steel 316',
            connection: 'Flanged ANSI 150'
          },
          description: 'Heavy-duty centrifugal pump designed for industrial applications in oil & gas, chemical processing, and water treatment facilities.',
          popularInIndustries: ['Oil & Gas', 'Petrochemical', 'Water Treatment'],
          popularInRegions: ['Pengerang', 'Klang Valley'],
          urgencyLevel: 'medium',
          stockLevel: 8,
          leadTime: '2-3 weeks',
          certifications: ['API 610', 'ISO 9001'],
          personalizedScore: 0,
          trendingScore: 85,
          demandScore: 92
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
          rating: 4.9,
          reviewCount: 45,
          specifications: {
            weightCapacity: '400 lbs',
            material: 'Polyester Webbing',
            buckles: 'Auto-locking',
            certification: 'CE EN 361',
            sizesAvailable: 'S, M, L, XL'
          },
          description: 'Professional-grade full body harness system for work at height applications in construction, oil & gas, and industrial maintenance.',
          popularInIndustries: ['Construction', 'Oil & Gas', 'Manufacturing'],
          popularInRegions: ['Johor', 'Klang Valley', 'Pengerang'],
          urgencyLevel: 'high',
          stockLevel: 25,
          leadTime: '1-2 weeks',
          certifications: ['CE EN 361', 'ANSI Z359.11'],
          personalizedScore: 0,
          trendingScore: 78,
          demandScore: 95
        },
        {
          id: 'vfd_controller_001',
          name: 'Variable Frequency Drive Controller',
          category: 'Electrical',
          subcategory: 'Motor Controls',
          price: 3400,
          originalPrice: 4200,
          image: '/api/placeholder/400/300',
          supplier: 'PowerControl Solutions',
          supplierLocation: 'Kulim, Kedah',
          rating: 4.7,
          reviewCount: 31,
          specifications: {
            power: '10 HP',
            voltage: '480V',
            control: 'Vector Control',
            enclosure: 'NEMA 1',
            communication: 'Modbus RTU'
          },
          description: 'Advanced variable frequency drive for precise motor control in HVAC, pumping, and manufacturing applications.',
          popularInIndustries: ['Manufacturing', 'HVAC', 'Water Treatment'],
          popularInRegions: ['Kulim Hi-Tech', 'Klang Valley'],
          urgencyLevel: 'low',
          stockLevel: 12,
          leadTime: '3-4 weeks',
          certifications: ['UL Listed', 'CE Marked'],
          personalizedScore: 0,
          trendingScore: 72,
          demandScore: 88
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
          rating: 4.6,
          reviewCount: 18,
          specifications: {
            capacity: '50 Ton',
            refrigerant: 'R-410A',
            efficiency: 'High EER',
            compressor: 'Scroll Type',
            controls: 'Digital Controller'
          },
          description: 'High-efficiency industrial cooling unit suitable for data centers, manufacturing facilities, and commercial applications.',
          popularInIndustries: ['Data Centers', 'Manufacturing', 'Commercial'],
          popularInRegions: ['Johor', 'Klang Valley', 'Kulim Hi-Tech'],
          urgencyLevel: 'medium',
          stockLevel: 5,
          leadTime: '4-6 weeks',
          certifications: ['AHRI Certified', 'Energy Star'],
          personalizedScore: 0,
          trendingScore: 65,
          demandScore: 82
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
          rating: 4.8,
          reviewCount: 27,
          specifications: {
            size: '4 inch',
            pressure: '1500 PSI',
            material: 'SS 316',
            operation: 'Manual/Actuated',
            endConnection: 'Flanged RF'
          },
          description: 'Premium stainless steel ball valve for high-pressure applications in oil & gas, petrochemical, and process industries.',
          popularInIndustries: ['Oil & Gas', 'Petrochemical', 'Chemical Processing'],
          popularInRegions: ['Pengerang', 'East Coast'],
          urgencyLevel: 'high',
          stockLevel: 15,
          leadTime: '2-3 weeks',
          certifications: ['API 6D', 'ISO 14313'],
          personalizedScore: 0,
          trendingScore: 88,
          demandScore: 94
        },
        {
          id: 'sensor_pressure_001',
          name: 'Smart Pressure Transmitter',
          category: 'Instrumentation',
          subcategory: 'Pressure Sensors',
          price: 1250,
          originalPrice: 1450,
          image: '/api/placeholder/400/300',
          supplier: 'InstruTech Solutions',
          supplierLocation: 'Cyberjaya, Selangor',
          rating: 4.7,
          reviewCount: 19,
          specifications: {
            range: '0-1000 PSI',
            accuracy: '±0.1%',
            output: '4-20mA + HART',
            material: 'SS 316L',
            certification: 'SIL 2'
          },
          description: 'High-accuracy smart pressure transmitter with HART communication for process control and monitoring applications.',
          popularInIndustries: ['Process Industries', 'Oil & Gas', 'Pharmaceutical'],
          popularInRegions: ['Klang Valley', 'Pengerang'],
          urgencyLevel: 'low',
          stockLevel: 20,
          leadTime: '1-2 weeks',
          certifications: ['SIL 2', 'ATEX', 'IECEx'],
          personalizedScore: 0,
          trendingScore: 75,
          demandScore: 86
        }
      ];

      // Calculate personalized scores if factory profile exists
      const productsWithScores = mockProducts.map(product => ({
        ...product,
        personalizedScore: calculatePersonalizedScore(product, factoryProfile)
      }));

      setProducts(productsWithScores);
      console.log('✅ Catalog loaded with', productsWithScores.length, 'products');

    } catch (error) {
      console.error('❌ Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load personalized recommendations based on factory profile
   */
  const loadPersonalizedRecommendations = async () => {
    try {
      console.log('🤖 Loading personalized recommendations...');

      const mockRecommendations = [
        {
          type: 'industry_popular',
          title: `🔥 Popular in ${factoryProfile.industry} Industry`,
          subtitle: `Top products used by ${factoryProfile.industry} companies in ${factoryProfile.location.region}`,
          products: products.filter(p => 
            p.popularInIndustries.includes(factoryProfile.industry)
          ).slice(0, 3),
          confidence: 0.92,
          reason: `Based on purchasing patterns of ${factoryProfile.industry} factories in your region`
        },
        {
          type: 'geographic_trending',
          title: `📍 Trending in ${factoryProfile.location.region}`,
          subtitle: 'Products gaining popularity in your industrial zone',
          products: products.filter(p => 
            p.popularInRegions.some(region => 
              factoryProfile.location.region.includes(region.split(' ')[0])
            )
          ).slice(0, 3),
          confidence: 0.85,
          reason: `Popular among factories in ${factoryProfile.location.region}`
        },
        {
          type: 'urgent_needs',
          title: '⚠️ Predicted Urgent Requirements',
          subtitle: 'Items you may need soon based on industry maintenance cycles',
          products: products.filter(p => p.urgencyLevel === 'high').slice(0, 3),
          confidence: 0.78,
          reason: 'Based on typical maintenance schedules for your industry'
        }
      ];

      setRecommendations(mockRecommendations);
      console.log('✅ Recommendations loaded:', mockRecommendations.length, 'sections');

    } catch (error) {
      console.error('❌ Error loading recommendations:', error);
    }
  };

  /**
   * Calculate personalized score for products
   */
  const calculatePersonalizedScore = useCallback((product, factory) => {
    if (!factory) return product.demandScore || 50;

    let score = 0;

    // Industry relevance (40%)
    if (product.popularInIndustries.includes(factory.industry)) {
      score += 40;
    } else if (product.popularInIndustries.some(ind => 
      ['Manufacturing', 'Industrial'].includes(ind)
    )) {
      score += 20;
    }

    // Geographic relevance (25%)
    if (product.popularInRegions.some(region => 
      factory.location.region.includes(region.split(' ')[0])
    )) {
      score += 25;
    }

    // Demand and trending (20%)
    score += (product.demandScore || 50) * 0.2;

    // Urgency and availability (15%)
    if (product.urgencyLevel === 'high') score += 15;
    else if (product.urgencyLevel === 'medium') score += 10;
    else score += 5;

    return Math.min(100, Math.max(0, score));
  }, []);

  /**
   * Filter products based on search and filters
   */
  const filterProducts = useCallback(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        product.supplier.toLowerCase().includes(query) ||
        Object.values(product.specifications).some(spec => 
          spec.toString().toLowerCase().includes(query)
        )
      );
    }

    // Category filter
    if (activeFilters.category !== 'all') {
      filtered = filtered.filter(product => 
        product.category === activeFilters.category
      );
    }

    // Industry filter
    if (activeFilters.industry !== 'all') {
      filtered = filtered.filter(product => 
        product.popularInIndustries.includes(activeFilters.industry)
      );
    }

    // Price range filter
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

    // Sort by personalized score if factory is identified, otherwise by demand score
    filtered.sort((a, b) => {
      const scoreA = factoryProfile ? a.personalizedScore : a.demandScore;
      const scoreB = factoryProfile ? b.personalizedScore : b.demandScore;
      return scoreB - scoreA;
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, activeFilters, factoryProfile]);

  /**
   * Track product interaction
   */
  const trackProductInteraction = async (product, action, additionalData = {}) => {
    try {
      console.log(`📊 Tracked interaction: ${action} on ${product.name}`);
      // In production, integrate with analytics service
    } catch (error) {
      console.error('❌ Error tracking interaction:', error);
    }
  };

  /**
   * Handle product click
   */
  const handleProductClick = (product) => {
    trackProductInteraction(product, 'view', {
      duration: Date.now() - pageLoadTime,
      searchQuery: searchQuery || null,
      filterContext: activeFilters
    });
  };

  /**
   * Handle quote request
   */
  const handleQuoteRequest = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'quote');
    
    // Show quote request modal or navigate to quote page
    alert(`Quote request for ${product.name} - Feature available in full version!`);
  };

  /**
   * Handle product comparison
   */
  const handleProductCompare = (product, event) => {
    event.stopPropagation();
    trackProductInteraction(product, 'compare');
    
    // Add to comparison list
    alert(`${product.name} added to comparison - Feature available in full version!`);
  };

  // Memoized components for performance
  const FactoryIntelligencePanel = useMemo(() => {
    if (!factoryProfile || factoryProfile.confidence < 0.6) return null;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Factory className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                🏭 {factoryProfile.companyName || 'Factory Identified'}
              </h3>
              <p className="text-sm text-gray-600">
                {factoryProfile.industry} • {factoryProfile.location.region}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-green-600">
              {Math.round(factoryProfile.confidence * 100)}% Match Confidence
            </div>
            <div className="text-xs text-gray-500">AI-Powered Personalization Active</div>
          </div>
        </div>
        
        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Brain className="w-4 h-4 text-purple-500" />
            <span>Smart Recommendations</span>
          </div>
          <div className="flex items-center space-x-1">
            <Target className="w-4 h-4 text-green-500" />
            <span>Personalized Ranking</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>Industry Insights</span>
          </div>
        </div>
      </div>
    );
  }, [factoryProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🚀 Initializing Smart Catalog</h2>
          <p className="text-gray-600">Loading industrial intelligence...</p>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-500">✅ Detecting factory profile</div>
            <div className="text-sm text-gray-500">✅ Loading product catalog</div>
            <div className="text-sm text-gray-500">🔄 Generating AI recommendations</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🛒 HiggsFlow Smart Catalog
              </h1>
              <p className="text-sm text-gray-600">
                Malaysia's Most Intelligent Industrial E-commerce Platform
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, categories, specifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Real-time Activity Indicator */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Analytics</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Factory Intelligence Panel */}
        {FactoryIntelligencePanel}
        
        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <div className="w-64 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
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
              </div>
            </div>

            {/* AI Insights Panel */}
            {factoryProfile && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">AI Insights</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 mt-0.5" />
                    <span className="text-gray-700">
                      Products ranked by relevance to {factoryProfile.industry}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-gray-700">
                      Showing popular items in {factoryProfile.location.region}
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                    <span className="text-gray-700">
                      Real-time demand analytics active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">📊 Catalog Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Products</span>
                  <span className="font-medium">{products.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Filtered Results</span>
                  <span className="font-medium">{filteredProducts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">AI Recommendations</span>
                  <span className="font-medium">{recommendations.length}</span>
                </div>
                {factoryProfile && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Personalization</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* AI Recommendations Section */}
            {recommendations.length > 0 && (
              <div className="space-y-6 mb-8">
                {recommendations.map((section, index) => (
                  <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{section.subtitle}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-blue-600">
                          {Math.round(section.confidence * 100)}% Confidence
                        </div>
                        <div className="text-xs text-gray-500">AI Powered</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {section.products.map((product) => (
                        <RecommendationProductCard 
                          key={product.id} 
                          product={product}
                          recommendationType={section.type}
                          onProductClick={handleProductClick}
                          onQuoteRequest={handleQuoteRequest}
                          onProductCompare={handleProductCompare}
                        />
                      ))}
                    </div>
                    
                    <div className="mt-4 text-xs text-gray-500 italic">
                      💡 {section.reason}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All Products Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    All Products ({filteredProducts.length})
                  </h3>
                  <p className="text-sm text-gray-600">
                    {factoryProfile ? 'Personalized ranking active' : 'Sorted by popularity'}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {factoryProfile && (
                    <div className="flex items-center space-x-2 text-sm text-blue-600">
                      <Zap className="w-4 h-4" />
                      <span>Smart Ranking</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-500">
                    Updated {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Search className="w-12 h-12 mx-auto" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No products found</h4>
                  <p className="text-gray-600">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product}
                      isPersonalized={!!factoryProfile}
                      onProductClick={handleProductClick}
                      onQuoteRequest={handleQuoteRequest}
                      onProductCompare={handleProductCompare}
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

// Recommendation Product Card Component
const RecommendationProductCard = ({ product, recommendationType, onProductClick, onQuoteRequest, onProductCompare }) => {
  const savings = product.originalPrice - product.price;
  const savingsPercent = Math.round((savings / product.originalPrice) * 100);

  return (
    <div 
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group bg-gradient-to-br from-white to-gray-50"
      onClick={() => onProductClick(product)}
    >
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
        />
        {savingsPercent > 10 && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Save {savingsPercent}%
          </div>
        )}
        {product.urgencyLevel === 'high' && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
            Urgent
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h4 className="font-medium text-gray-900 text-sm mb-1 group-hover:text-blue-600 line-clamp-2">
          {product.name}
        </h4>
        <p className="text-xs text-gray-600 mb-2">{product.category}</p>
        
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
        
        <div className="flex space-x-1">
          <button 
            className="flex-1 bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700 transition-colors"
            onClick={(e) => onQuoteRequest(product, e)}
          >
            Quote
          </button>
          <button 
            className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors"
            onClick={(e) => onProductCompare(product, e)}
            title="Compare"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Product Card Component
const ProductCard = ({ product, isPersonalized, onProductClick, onQuoteRequest, onProductCompare }) => {
  const savings = product.originalPrice - product.price;
  const savingsPercent = Math.round((savings / product.originalPrice) * 100);
  const personalizedScore = product.personalizedScore;

  return (
    <div 
      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer group bg-white"
      onClick={() => onProductClick(product)}
    >
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 space-y-1">
          {savingsPercent > 10 && (
            <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              Save {savingsPercent}%
            </div>
          )}
          {product.urgencyLevel === 'high' && (
            <div className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
              Urgent Need
            </div>
          )}
        </div>

        <div className="absolute top-2 right-2 space-y-1">
          {isPersonalized && personalizedScore > 80 && (
            <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {Math.round(personalizedScore)}% Match
            </div>
          )}
          {product.stockLevel < 10 && (
            <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              Low Stock
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <div className="mb-2">
          <h4 className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 line-clamp-2">
            {product.name}
          </h4>
          <p className="text-sm text-gray-600">{product.category} • {product.subcategory}</p>
        </div>
        
        {/* Key Specifications */}
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
        
        {/* Pricing */}
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
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button 
            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
            onClick={(e) => onQuoteRequest(product, e)}
          >
            Request Quote
          </button>
          <button 
            className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors"
            onClick={(e) => onProductCompare(product, e)}
            title="Compare Product"
          >
            📋
          </button>
        </div>
        
        {/* Supplier Info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{product.supplier}</span>
            <span>{product.supplierLocation}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
            <span>Lead Time: {product.leadTime}</span>
            <span>{product.certifications[0]}</span>
          </div>
        </div>

        {/* Personalization Indicator */}
        {isPersonalized && personalizedScore > 60 && (
          <div className="mt-2 flex items-center space-x-2 text-xs text-blue-600">
            <Brain className="w-3 h-3" />
            <span>Recommended for your industry</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartPublicCatalog;
