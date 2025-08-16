// src/components/sync/CORSSafeSyncTest.jsx
// CORS-safe sync test that avoids real-time listeners

import React, { useState } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const CORSSafeSyncTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [syncStats, setSyncStats] = useState(null);

  const addLog = (message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
    console.log(`[${type.toUpperCase()}] ${message}`);
  };

  const transformToEcommerceProduct = (internalProduct) => {
    const basePrice = internalProduct.price || 100;
    const listPrice = basePrice * 1.2; // 20% markup
    const discountPrice = listPrice * 0.9; // 10% discount

    return {
      // Link to internal system
      internalProductId: internalProduct.id,
      
      // Customer-facing information
      displayName: `Professional ${internalProduct.name || 'Industrial Product'}`,
      customerDescription: internalProduct.description || 'High-quality industrial product for professional applications.',
      
      // Pricing
      pricing: {
        listPrice: Math.round(listPrice * 100) / 100,
        discountPrice: Math.round(discountPrice * 100) / 100,
        currency: 'MYR',
        priceValidUntil: '2025-12-31T23:59:59Z',
        lastPriceUpdate: serverTimestamp()
      },
      
      // Images (placeholder)
      images: {
        primary: `https://via.placeholder.com/400x400/4F46E5/FFFFFF?text=${encodeURIComponent((internalProduct.name || 'Product').substring(0, 20))}`,
        technical: 'https://via.placeholder.com/400x300/6366F1/FFFFFF?text=Technical+Specs',
        application: 'https://via.placeholder.com/400x300/8B5CF6/FFFFFF?text=Industrial+Application',
        gallery: [],
        imageGenerated: false,
        lastImageUpdate: null
      },
      
      // SEO & Search
      seo: {
        keywords: [internalProduct.name?.toLowerCase(), internalProduct.category?.toLowerCase(), 'industrial', 'malaysia'].filter(Boolean),
        searchTerms: [internalProduct.name?.toLowerCase(), internalProduct.sku?.toLowerCase()].filter(Boolean),
        categoryTags: [internalProduct.category || 'industrial', 'professional', 'quality'].filter(Boolean),
        metaTitle: `${internalProduct.name} - Professional Industrial Equipment | HiggsFlow`,
        metaDescription: `Professional ${internalProduct.category || 'industrial'} equipment. High-quality products from verified Malaysian suppliers.`
      },
      
      // Category & Classification
      category: internalProduct.category || 'industrial',
      subcategory: 'professional-grade',
      industryApplications: ['Manufacturing', 'Industrial', 'Professional'],
      productTags: [internalProduct.brand?.toLowerCase(), internalProduct.category].filter(Boolean),
      
      // Availability
      availability: {
        inStock: (internalProduct.stock || 0) > 0,
        stockLevel: internalProduct.stock || 0,
        reservedStock: 0,
        availableStock: internalProduct.stock || 0,
        leadTime: (internalProduct.stock || 0) > 10 ? '1-2 business days' : '3-5 business days',
        lastStockUpdate: serverTimestamp(),
        stockStatus: (internalProduct.stock || 0) > 10 ? 'good' : (internalProduct.stock || 0) > 0 ? 'low' : 'out_of_stock'
      },
      
      // Technical Specifications
      specifications: {
        sku: internalProduct.sku || 'Contact for details',
        brand: internalProduct.brand || 'Professional Grade',
        category: internalProduct.category || 'Industrial',
        description: internalProduct.description || 'Contact for detailed specifications'
      },
      
      // Supplier Information
      supplier: {
        name: 'Verified Industrial Supplier',
        rating: 4.5,
        location: 'Malaysia',
        verified: true,
        supplierId: internalProduct.supplierId || 'VERIFIED'
      },
      
      // E-commerce Settings
      visibility: (internalProduct.stock || 0) > 0 ? 'public' : 'private',
      featured: (internalProduct.stock || 0) > 20 && (internalProduct.price || 0) > 500,
      trending: false,
      newProduct: false,
      minOrderQty: 1,
      maxOrderQty: Math.max(1000, internalProduct.stock || 100),
      
      // Metadata
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      syncedAt: serverTimestamp(),
      lastModifiedBy: 'cors_safe_sync_test',
      version: 1.0,
      dataSource: 'internal_sync_test'
    };
  };

  const testBasicFirestore = async () => {
    try {
      addLog('🔄 Testing basic Firestore operations...', 'info');
      
      // Test read access
      const testSnapshot = await getDocs(query(collection(db, 'products'), limit(1)));
      addLog(`✅ Read access confirmed - found ${testSnapshot.size} products`, 'success');
      
      // Test write access with a small test document
      const testDoc = {
        testId: `test_${Date.now()}`,
        message: 'CORS safe sync test',
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'product_sync_log'), testDoc);
      addLog('✅ Write access confirmed', 'success');
      
      return true;
    } catch (error) {
      addLog(`❌ Basic Firestore test failed: ${error.message}`, 'error');
      return false;
    }
  };

  const performBatchSync = async () => {
    try {
      addLog('🔄 Starting batch product sync...', 'info');
      
      // Get internal products
      const internalProductsSnapshot = await getDocs(
        query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(10))
      );
      
      addLog(`📦 Found ${internalProductsSnapshot.size} internal products to sync`, 'info');
      
      if (internalProductsSnapshot.size === 0) {
        addLog('⚠️ No internal products found to sync', 'warning');
        return { synced: 0, total: 0 };
      }

      // Get existing e-commerce products
      const ecommerceSnapshot = await getDocs(collection(db, 'products_public'));
      const existingEcommerce = new Set();
      ecommerceSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.internalProductId) {
          existingEcommerce.add(data.internalProductId);
        }
      });

      addLog(`🛍️ Found ${existingEcommerce.size} existing e-commerce products`, 'info');

      // Batch sync products
      const batch = writeBatch(db);
      let syncedCount = 0;
      let createdCount = 0;
      let skippedCount = 0;

      for (const productDoc of internalProductsSnapshot.docs) {
        const internalProduct = { id: productDoc.id, ...productDoc.data() };
        
        // Skip if already exists in e-commerce
        if (existingEcommerce.has(internalProduct.id)) {
          addLog(`⏭️ Skipping ${internalProduct.name || internalProduct.id} - already synced`, 'info');
          skippedCount++;
          continue;
        }

        try {
          // Transform to e-commerce format
          const ecommerceProduct = transformToEcommerceProduct(internalProduct);
          
          // Add to batch
          const newDocRef = doc(collection(db, 'products_public'));
          batch.set(newDocRef, ecommerceProduct);
          
          addLog(`➕ Queued ${internalProduct.name || internalProduct.id} for sync`, 'success');
          createdCount++;
          
        } catch (error) {
          addLog(`❌ Failed to transform ${internalProduct.name || internalProduct.id}: ${error.message}`, 'error');
        }
      }

      // Commit the batch
      if (createdCount > 0) {
        await batch.commit();
        addLog(`✅ Batch committed: ${createdCount} products synced`, 'success');
        syncedCount = createdCount;
      } else {
        addLog('ℹ️ No new products to sync', 'info');
      }

      // Log the sync operation
      const syncLog = {
        syncType: 'batch_sync',
        syncDirection: 'internal_to_ecommerce',
        syncStatus: 'success',
        productsProcessed: internalProductsSnapshot.size,
        productsCreated: createdCount,
        productsSkipped: skippedCount,
        syncedAt: serverTimestamp(),
        metadata: {
          triggeredBy: 'cors_safe_test',
          testRun: true
        }
      };

      await addDoc(collection(db, 'product_sync_log'), syncLog);
      addLog('📝 Sync operation logged', 'success');

      return {
        synced: syncedCount,
        created: createdCount,
        skipped: skippedCount,
        total: internalProductsSnapshot.size
      };

    } catch (error) {
      addLog(`❌ Batch sync failed: ${error.message}`, 'error');
      throw error;
    }
  };

  const verifySyncResults = async () => {
    try {
      addLog('🔍 Verifying sync results...', 'info');
      
      // Count products in both collections
      const internalSnapshot = await getDocs(collection(db, 'products'));
      const ecommerceSnapshot = await getDocs(collection(db, 'products_public'));
      
      const internalCount = internalSnapshot.size;
      const ecommerceCount = ecommerceSnapshot.size;
      const coverage = internalCount > 0 ? (ecommerceCount / internalCount * 100) : 0;

      addLog(`📊 Internal products: ${internalCount}`, 'info');
      addLog(`📊 E-commerce products: ${ecommerceCount}`, 'info');
      addLog(`📊 Sync coverage: ${coverage.toFixed(1)}%`, 'info');

      // Get recent sync logs
      const syncLogsSnapshot = await getDocs(
        query(collection(db, 'product_sync_log'), orderBy('syncedAt', 'desc'), limit(5))
      );

      addLog(`📊 Recent sync operations: ${syncLogsSnapshot.size}`, 'info');

      return {
        internalCount,
        ecommerceCount,
        coverage,
        recentSyncOps: syncLogsSnapshot.size
      };

    } catch (error) {
      addLog(`❌ Verification failed: ${error.message}`, 'error');
      return null;
    }
  };

  const runFullSyncTest = async () => {
    setIsRunning(true);
    setTestResults({});
    setLogs([]);
    setSyncStats(null);
    
    try {
      addLog('🚀 Starting CORS-Safe Product Sync Test...', 'info');
      
      // Step 1: Test basic Firestore functionality
      const basicTest = await testBasicFirestore();
      if (!basicTest) {
        throw new Error('Basic Firestore test failed');
      }

      // Step 2: Perform batch sync
      const syncResult = await performBatchSync();
      
      // Step 3: Verify results
      const verification = await verifySyncResults();
      
      // Update results
      setTestResults({
        basicFirestore: basicTest,
        syncCompleted: true,
        verification
      });

      setSyncStats(syncResult);

      addLog('🎉 CORS-Safe sync test completed successfully!', 'success');
      addLog(`📊 Results: ${syncResult.created} created, ${syncResult.skipped} skipped, ${syncResult.total} total`, 'success');

    } catch (error) {
      addLog(`❌ Sync test failed: ${error.message}`, 'error');
      setTestResults({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🛡️ CORS-Safe Product Sync Test
          </h1>
          <p className="text-gray-600">
            Testing product sync functionality without real-time listeners to avoid CORS issues.
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Sync Test Controls</h2>
              <p className="text-sm text-gray-600 mt-1">
                This test performs batch synchronization from internal products to e-commerce catalog
              </p>
            </div>
            <button
              onClick={runFullSyncTest}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRunning 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRunning ? '🔄 Running Sync Test...' : '🚀 Start Sync Test'}
            </button>
          </div>
        </div>

        {/* Results Dashboard */}
        {(Object.keys(testResults).length > 0 || syncStats) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Basic Firestore */}
            <div className={`bg-white rounded-lg shadow-sm border p-6 ${
              testResults.basicFirestore ? 'border-green-200' : 'border-red-200'
            }`}>
              <h3 className="font-semibold text-lg mb-2">Firestore Access</h3>
              <div className={`text-2xl font-bold ${
                testResults.basicFirestore ? 'text-green-600' : 'text-red-600'
              }`}>
                {testResults.basicFirestore ? '✅ Working' : '❌ Failed'}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Basic read/write operations
              </p>
            </div>

            {/* Sync Results */}
            <div className={`bg-white rounded-lg shadow-sm border p-6 ${
              syncStats ? 'border-green-200' : 'border-gray-200'
            }`}>
              <h3 className="font-semibold text-lg mb-2">Sync Operations</h3>
              <div className="text-2xl font-bold text-blue-600">
                {syncStats ? `${syncStats.created} Created` : '- Pending'}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {syncStats ? `${syncStats.skipped} skipped of ${syncStats.total} total` : 'Products synchronized'}
              </p>
            </div>

            {/* Coverage */}
            <div className={`bg-white rounded-lg shadow-sm border p-6 ${
              testResults.verification ? 'border-purple-200' : 'border-gray-200'
            }`}>
              <h3 className="font-semibold text-lg mb-2">Sync Coverage</h3>
              <div className="text-2xl font-bold text-purple-600">
                {testResults.verification ? `${testResults.verification.coverage.toFixed(1)}%` : '- Pending'}
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {testResults.verification ? 
                  `${testResults.verification.ecommerceCount} of ${testResults.verification.internalCount} products` : 
                  'Coverage percentage'
                }
              </p>
            </div>
          </div>
        )}

        {/* Live Console */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Live Console</h2>
          </div>
          
          <div className="p-6">
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {logs.length > 0 ? (
                <div className="space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3">
                      <span className="text-gray-400 text-xs mt-0.5 w-20 flex-shrink-0">
                        {log.timestamp}
                      </span>
                      <span className={`${getLogColor(log.type)} flex-1`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  Console output will appear here when test starts...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Verify Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproducts', '_blank')}
              className="text-left p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-blue-600">Internal Products</div>
              <div className="text-sm text-gray-600">View source collection</div>
            </button>
            
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproducts_public', '_blank')}
              className="text-left p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-green-600">E-commerce Products</div>
              <div className="text-sm text-gray-600">View synced products</div>
            </button>
            
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproduct_sync_log', '_blank')}
              className="text-left p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-purple-600">Sync Logs</div>
              <div className="text-sm text-gray-600">View operation logs</div>
            </button>
          </div>
        </div>

        {/* Success Instructions */}
        {testResults.basicFirestore && syncStats && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">🎉 Sync Test Successful!</h3>
            <div className="text-green-700">
              <p className="mb-2">
                ✅ Created {syncStats.created} new e-commerce products from your internal catalog
              </p>
              <p className="mb-2">
                ✅ Skipped {syncStats.skipped} products that were already synced
              </p>
              <p className="mb-4">
                ✅ Processed {syncStats.total} total products with {testResults.verification?.coverage.toFixed(1)}% coverage
              </p>
              
              <div className="bg-green-100 border border-green-300 rounded p-3 mt-4">
                <h4 className="font-semibold text-green-800 mb-2">Next Steps:</h4>
                <ul className="text-sm space-y-1">
                  <li>1. ✅ Your product sync logic is working correctly</li>
                  <li>2. 🔗 Check the synced products in Firebase Console</li>
                  <li>3. 🚀 The full ProductSyncDashboard should now work</li>
                  <li>4. 🛍️ Ready to build the public e-commerce catalog!</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CORSSafeSyncTest;
