// src/components/sync/SimpleSyncTest.jsx
// Minimal test component for Product Sync Service

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const SimpleSyncTest = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const newLog = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [newLog, ...prev.slice(0, 9)]); // Keep last 10 logs
  };

  const testFirebaseConnection = async () => {
    try {
      addLog('Testing Firebase connection...', 'info');
      
      // Test basic collection access
      const testCol = collection(db, 'products');
      const snapshot = await getDocs(query(testCol, limit(1)));
      
      addLog(`✅ Firebase connected - Found ${snapshot.size} test products`, 'success');
      return true;
    } catch (error) {
      addLog(`❌ Firebase connection failed: ${error.message}`, 'error');
      return false;
    }
  };

  const testCollectionAccess = async () => {
    try {
      addLog('Testing collection access...', 'info');
      
      const collections = ['products', 'products_public', 'product_sync_log'];
      const results = {};
      
      for (const colName of collections) {
        try {
          const snapshot = await getDocs(query(collection(db, colName), limit(1)));
          results[colName] = snapshot.size;
          addLog(`✅ ${colName}: ${snapshot.size} documents`, 'success');
        } catch (error) {
          results[colName] = `Error: ${error.message}`;
          addLog(`❌ ${colName}: ${error.message}`, 'error');
        }
      }
      
      return results;
    } catch (error) {
      addLog(`❌ Collection test failed: ${error.message}`, 'error');
      return {};
    }
  };

  const testProductSync = async () => {
    try {
      addLog('Testing product sync logic...', 'info');
      
      // Get products from internal collection
      const internalProducts = await getDocs(
        query(collection(db, 'products'), orderBy('createdAt', 'desc'), limit(5))
      );
      
      addLog(`📦 Found ${internalProducts.size} internal products`, 'info');
      
      // Check e-commerce products
      const ecommerceProducts = await getDocs(
        query(collection(db, 'products_public'), limit(5))
      );
      
      addLog(`🛍️ Found ${ecommerceProducts.size} e-commerce products`, 'info');
      
      // Simple sync test - create one e-commerce product from internal
      if (internalProducts.size > 0) {
        const firstProduct = internalProducts.docs[0];
        const productData = firstProduct.data();
        
        addLog(`🔄 Testing sync for: ${productData.name || 'Unnamed Product'}`, 'info');
        
        // Create a simple e-commerce product
        const ecommerceProduct = {
          internalProductId: firstProduct.id,
          displayName: productData.name || 'Test Product',
          customerDescription: productData.description || 'Professional industrial product',
          pricing: {
            listPrice: (productData.price || 100) * 1.2,
            discountPrice: (productData.price || 100) * 1.1,
            currency: 'MYR'
          },
          availability: {
            inStock: (productData.stock || 0) > 0,
            stockLevel: productData.stock || 0
          },
          category: productData.category || 'industrial',
          visibility: 'public',
          featured: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          syncedAt: serverTimestamp(),
          lastModifiedBy: 'sync_test',
          version: 1.0,
          dataSource: 'test_sync'
        };
        
        // Add to e-commerce collection
        const docRef = await addDoc(collection(db, 'products_public'), ecommerceProduct);
        addLog(`✅ Created e-commerce product: ${docRef.id}`, 'success');
        
        // Log the sync operation
        const syncLog = {
          internalProductId: firstProduct.id,
          ecommerceProductId: docRef.id,
          syncType: 'create',
          syncDirection: 'internal_to_ecommerce',
          syncStatus: 'success',
          syncedAt: serverTimestamp(),
          metadata: {
            triggeredBy: 'manual_test',
            productName: productData.name || 'Test Product',
            testRun: true
          }
        };
        
        await addDoc(collection(db, 'product_sync_log'), syncLog);
        addLog(`📝 Logged sync operation`, 'success');
        
        return true;
      } else {
        addLog(`⚠️ No internal products found to sync`, 'warning');
        return false;
      }
    } catch (error) {
      addLog(`❌ Sync test failed: ${error.message}`, 'error');
      return false;
    }
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setTestResults({});
    setLogs([]);
    
    addLog('🚀 Starting Product Sync Test Suite...', 'info');
    
    const results = {
      firebaseConnection: await testFirebaseConnection(),
      collectionAccess: await testCollectionAccess(),
      productSync: await testProductSync()
    };
    
    setTestResults(results);
    
    if (results.firebaseConnection && results.productSync) {
      addLog('🎉 All tests passed! Sync service should work.', 'success');
    } else {
      addLog('⚠️ Some tests failed. Check the logs above.', 'warning');
    }
    
    setIsRunning(false);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔧 Product Sync Service Test
          </h1>
          <p className="text-gray-600">
            Test the basic functionality of the Product Sync Service before running the full dashboard.
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Run Tests</h2>
            <button
              onClick={runFullTest}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isRunning 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isRunning ? '🔄 Running Tests...' : '🚀 Start Full Test'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg border-2 ${
                testResults.firebaseConnection 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <h3 className="font-semibold mb-2">Firebase Connection</h3>
                <p className={testResults.firebaseConnection ? 'text-green-600' : 'text-red-600'}>
                  {testResults.firebaseConnection ? '✅ Connected' : '❌ Failed'}
                </p>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                Object.keys(testResults.collectionAccess || {}).length > 0
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <h3 className="font-semibold mb-2">Collections Access</h3>
                {Object.entries(testResults.collectionAccess || {}).map(([name, count]) => (
                  <p key={name} className="text-sm text-gray-600">
                    {name}: {count}
                  </p>
                ))}
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                testResults.productSync 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}>
                <h3 className="font-semibold mb-2">Product Sync</h3>
                <p className={testResults.productSync ? 'text-green-600' : 'text-red-600'}>
                  {testResults.productSync ? '✅ Working' : '❌ Failed'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live Logs */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Live Test Logs</h2>
          </div>
          
          <div className="p-6">
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              {logs.length > 0 ? (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start space-x-3 text-sm">
                      <span className="text-gray-400 text-xs mt-0.5 w-16">
                        {log.timestamp}
                      </span>
                      <span className={`${getLogColor(log.type)} font-mono`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">
                  Click "Start Full Test" to begin testing...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproducts', '_blank')}
              className="text-left p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-blue-600">Internal Products</div>
              <div className="text-sm text-gray-600">View products collection</div>
            </button>
            
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproducts_public', '_blank')}
              className="text-left p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-green-600">E-commerce Products</div>
              <div className="text-sm text-gray-600">View products_public collection</div>
            </button>
            
            <button
              onClick={() => window.open('https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data/~2Fproduct_sync_log', '_blank')}
              className="text-left p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-purple-600">Sync Logs</div>
              <div className="text-sm text-gray-600">View product_sync_log collection</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleSyncTest;
