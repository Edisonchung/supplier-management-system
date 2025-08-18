// src/components/admin/Phase2BSetup.jsx
// Setup component using your existing Firestore services

import React, { useState, useEffect } from 'react';
import { 
  Database, Play, CheckCircle, AlertCircle, Loader, Package,
  TrendingUp, Factory, ShoppingCart, Zap, Eye
} from 'lucide-react';

// Import your existing services
import { productsService } from '../../services/firestore/products.service';
import { 
  collection, 
  getDocs, 
  query, 
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const Phase2BSetup = () => {
  const [setupStatus, setSetupStatus] = useState({
    checking: true,
    initialized: false,
    error: null
  });
  
  const [dataStatus, setDataStatus] = useState({
    products: 0,
    analytics: 0,
    factories: 0,
    quotes: 0
  });

  const [isInitializing, setIsInitializing] = useState(false);
  const [setupLog, setSetupLog] = useState([]);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setSetupLog(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const checkSetupStatus = async () => {
    try {
      addLog('Checking Phase 2B setup status...', 'info');
      
      // Check existing data using your existing services
      const [products, analytics, factories, quotes] = await Promise.all([
        getDocs(query(collection(db, 'products'), limit(5))),
        getDocs(query(collection(db, 'analytics_interactions'), limit(1))),
        getDocs(query(collection(db, 'factory_registrations'), limit(1))),
        getDocs(query(collection(db, 'quote_requests'), limit(1)))
      ]);

      const counts = {
        products: products.size,
        analytics: analytics.size,
        factories: factories.size,
        quotes: quotes.size
      };

      setDataStatus(counts);

      const isInitialized = counts.products > 0;
      
      setSetupStatus({
        checking: false,
        initialized: isInitialized,
        error: null
      });

      if (isInitialized) {
        addLog('✅ Phase 2B already set up and ready', 'success');
      } else {
        addLog('⚠️ Phase 2B needs initialization', 'warning');
      }

    } catch (error) {
      console.error('Error checking setup status:', error);
      setSetupStatus({
        checking: false,
        initialized: false,
        error: error.message
      });
      addLog(`❌ Error checking status: ${error.message}`, 'error');
    }
  };

  const initializePhase2B = async () => {
    if (isInitializing) return;

    setIsInitializing(true);
    setSetupLog([]);

    try {
      addLog('🚀 Starting HiggsFlow Phase 2B setup...', 'info');
      
      // Create sample products using your existing service
      await createSampleProductsWithExistingService();
      
      // Set up analytics config
      await setupAnalyticsConfig();
      
      addLog('✅ Phase 2B setup completed successfully!', 'success');
      addLog('🎉 Smart Catalog is now ready!', 'success');
      
      // Recheck status
      await checkSetupStatus();
      
    } catch (error) {
      console.error('Setup failed:', error);
      addLog(`❌ Setup failed: ${error.message}`, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const createSampleProductsWithExistingService = async () => {
    addLog('📦 Creating sample products...', 'info');

    const sampleProducts = [
      {
        name: 'Industrial Ball Bearing SKF 6205-2RS',
        category: 'Mechanical Components',
        sku: 'SKF-6205-2RS',
        price: 45.50,
        stock: 250,
        minStock: 20,
        featured: true,
        visibility: 'public',
        description: 'High-quality sealed ball bearing for industrial applications',
        specifications: {
          innerDiameter: '25mm',
          outerDiameter: '52mm',
          width: '15mm'
        },
        supplier: {
          name: 'SKF Malaysia',
          location: 'Shah Alam, Selangor',
          rating: 4.8
        },
        tags: ['Featured', 'High Stock', 'Industrial', 'Bearings'],
        viewCount: 0,
        searchPriority: 'high'
      },
      {
        name: 'Schneider Electric Contactor LC1D18M7',
        category: 'Electrical Components',
        sku: 'SE-LC1D18M7',
        price: 89.90,
        stock: 150,
        minStock: 15,
        featured: true,
        visibility: 'public',
        description: 'TeSys D contactor - 3P(3 NO) - AC-3 - <= 440 V 18 A',
        specifications: {
          poles: '3P',
          ratedCurrent: '18A',
          coilVoltage: '220V AC'
        },
        supplier: {
          name: 'Schneider Electric Malaysia',
          location: 'Petaling Jaya, Selangor',
          rating: 4.9
        },
        tags: ['Featured', 'High Stock', 'Electrical', 'Contactors'],
        viewCount: 0,
        searchPriority: 'high'
      },
      {
        name: 'Safety Helmet with Chin Strap - White',
        category: 'Safety Equipment',
        sku: 'SH-WH-001',
        price: 25.00,
        stock: 500,
        minStock: 50,
        featured: false,
        visibility: 'public',
        description: 'SIRIM approved safety helmet for construction and industrial use',
        specifications: {
          material: 'HDPE',
          standard: 'MS 2063:2018',
          color: 'White'
        },
        supplier: {
          name: 'Safety First Industries',
          location: 'Johor Bahru, Johor',
          rating: 4.5
        },
        tags: ['High Stock', 'Safety', 'SIRIM Approved'],
        viewCount: 0,
        searchPriority: 'medium'
      },
      {
        name: 'Digital Multimeter Fluke 87V',
        category: 'Testing Equipment',
        sku: 'FLUKE-87V',
        price: 485.00,
        stock: 45,
        minStock: 10,
        featured: true,
        visibility: 'public',
        description: 'Industrial digital multimeter with true-RMS measurements',
        specifications: {
          displayCount: '6000',
          accuracy: '0.05%',
          trueRMS: 'Yes'
        },
        supplier: {
          name: 'Fluke Malaysia',
          location: 'Kuala Lumpur',
          rating: 4.9
        },
        tags: ['Featured', 'Premium', 'Testing', 'Professional'],
        viewCount: 0,
        searchPriority: 'high'
      },
      {
        name: 'Stainless Steel Pipe Fitting Elbow 90°',
        category: 'Piping Components',
        sku: 'SS-ELB-90-25',
        price: 15.75,
        stock: 300,
        minStock: 30,
        featured: false,
        visibility: 'public',
        description: '90-degree elbow fitting in 316L stainless steel',
        specifications: {
          material: '316L Stainless Steel',
          size: '25mm (1 inch)',
          angle: '90 degrees'
        },
        supplier: {
          name: 'Precision Fittings Sdn Bhd',
          location: 'Klang, Selangor',
          rating: 4.6
        },
        tags: ['High Stock', 'Stainless Steel', 'Fittings'],
        viewCount: 0,
        searchPriority: 'medium'
      }
    ];

    for (const [index, product] of sampleProducts.entries()) {
      try {
        // Use your existing service to create products
        await productsService.create(product);
        addLog(`✅ Created product: ${product.name}`, 'success');
      } catch (error) {
        addLog(`❌ Failed to create product ${index + 1}: ${error.message}`, 'error');
      }
    }

    addLog(`📦 Sample products creation completed`, 'info');
  };

  const setupAnalyticsConfig = async () => {
    addLog('📊 Setting up analytics configuration...', 'info');

    try {
      const analyticsConfig = {
        trackingEnabled: true,
        retentionDays: 90,
        realTimeEnabled: true,
        dashboardEnabled: true,
        phase: '2B',
        features: {
          smartCatalog: true,
          factoryProfiling: true,
          conversionTracking: true,
          behavioralAnalytics: true
        },
        setupAt: serverTimestamp()
      };

      await addDoc(collection(db, 'analytics_config'), analyticsConfig);
      addLog('✅ Analytics configuration created', 'success');

    } catch (error) {
      addLog(`❌ Analytics setup failed: ${error.message}`, 'error');
      throw error;
    }
  };

  const createTestData = async () => {
    setIsInitializing(true);
    addLog('🧪 Creating test analytics data...', 'info');

    try {
      // Create test analytics events
      const testEvents = [
        {
          eventType: 'catalog_page_load',
          timestamp: serverTimestamp(),
          sessionId: 'test_session_1',
          userId: 'test_user_1',
          source: 'test_data'
        },
        {
          eventType: 'product_view',
          productId: 'test-product-1',
          productName: 'Test Industrial Product',
          timestamp: serverTimestamp(),
          sessionId: 'test_session_1',
          userId: 'test_user_1',
          source: 'test_data'
        }
      ];

      for (const event of testEvents) {
        await addDoc(collection(db, 'analytics_interactions'), event);
      }

      // Create test factory registration
      await addDoc(collection(db, 'factory_registrations'), {
        companyName: 'Test Manufacturing Sdn Bhd',
        email: 'test@manufacturing.com',
        industry: 'Electronics',
        location: 'Kuala Lumpur, Malaysia',
        contactPerson: 'John Doe',
        phone: '+60-12-345-6789',
        registeredAt: serverTimestamp(),
        status: 'pending_verification'
      });

      // Create test quote request
      await addDoc(collection(db, 'quote_requests'), {
        factoryName: 'Test Manufacturing Sdn Bhd',
        contactEmail: 'test@manufacturing.com',
        items: [
          {
            productName: 'Industrial Ball Bearing',
            quantity: 10,
            unitPrice: 45.50
          }
        ],
        totalValue: 455.00,
        notes: 'Test quote request for demonstration',
        createdAt: serverTimestamp(),
        status: 'pending'
      });

      addLog('✅ Test data created successfully', 'success');
      await checkSetupStatus();

    } catch (error) {
      addLog(`❌ Error creating test data: ${error.message}`, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  if (setupStatus.checking) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <Loader className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Checking Phase 2B Status
          </h2>
          <p className="text-gray-600">
            Verifying database setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  HiggsFlow Phase 2B Setup
                </h1>
                <p className="text-gray-600">
                  Initialize smart catalog using existing Firestore services
                </p>
              </div>
            </div>
            
            <div className={`flex items-center px-4 py-2 rounded-full text-sm font-medium ${
              setupStatus.initialized 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {setupStatus.initialized ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Ready
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Setup Needed
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[
              { key: 'products', label: 'Products', icon: Package, color: 'blue' },
              { key: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'purple' },
              { key: 'factories', label: 'Factories', icon: Factory, color: 'green' },
              { key: 'quotes', label: 'Quotes', icon: ShoppingCart, color: 'orange' }
            ].map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 text-${color}-600`} />
                  <span className={`text-sm font-medium ${
                    dataStatus[key] > 0 ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {dataStatus[key] > 0 ? '✓' : '○'}
                  </span>
                </div>
                <h3 className="font-medium text-gray-900">{label}</h3>
                <p className="text-sm text-gray-500">{dataStatus[key]} items</p>
              </div>
            ))}
          </div>

          {/* Setup Actions */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {setupStatus.initialized 
                    ? 'Phase 2B Ready' 
                    : 'Initialize Smart Catalog'
                  }
                </h3>
                <p className="text-gray-700">
                  {setupStatus.initialized 
                    ? 'Your smart catalog is ready with sample products'
                    : 'Set up sample products and analytics using existing services'
                  }
                </p>
              </div>
              
              <div className="flex space-x-3">
                {!setupStatus.initialized && (
                  <button
                    onClick={initializePhase2B}
                    disabled={isInitializing}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium ${
                      isInitializing 
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isInitializing ? (
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 mr-2" />
                    )}
                    {isInitializing ? 'Setting up...' : 'Setup Phase 2B'}
                  </button>
                )}
                
                {setupStatus.initialized && (
                  <button
                    onClick={createTestData}
                    disabled={isInitializing}
                    className={`flex items-center px-6 py-3 rounded-lg font-medium ${
                      isInitializing 
                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isInitializing ? (
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-5 h-5 mr-2" />
                    )}
                    {isInitializing ? 'Creating...' : 'Add Test Data'}
                  </button>
                )}
                
                <button
                  onClick={checkSetupStatus}
                  className="flex items-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Check Status
                </button>
              </div>
            </div>
          </div>

          {/* Setup Log */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Setup Log</h3>
            <div className="bg-black rounded p-3 h-64 overflow-y-auto font-mono text-sm">
              {setupLog.length === 0 ? (
                <div className="text-gray-500">Ready for setup...</div>
              ) : (
                setupLog.map((log, index) => (
                  <div
                    key={index}
                    className={`mb-1 ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Success Message */}
          {setupStatus.initialized && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    Phase 2B Successfully Set Up!
                  </h3>
                  <div className="text-green-800 space-y-2">
                    <p>✅ Sample products created in Firestore</p>
                    <p>✅ Analytics configuration enabled</p>
                    <p>✅ Database collections ready</p>
                    <p>✅ Using existing Firestore services</p>
                  </div>
                  <div className="mt-4 text-sm text-green-700">
                    <strong>Next:</strong> Update your components to use the enhanced 
                    products service for smart catalog functionality!
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Phase2BSetup;
