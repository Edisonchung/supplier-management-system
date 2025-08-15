// src/components/setup/EcommerceSetup.jsx
// Temporary component to run e-commerce collections setup

import React, { useState, useEffect } from 'react';
import { setupEcommerceCollections } from '../../scripts/setupEcommerceCollections';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';

const EcommerceSetup = () => {
  const [setupStatus, setSetupStatus] = useState('ready'); // ready | running | success | error
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [existingCollections, setExistingCollections] = useState({});

  // Check existing collections on load
  useEffect(() => {
    checkExistingCollections();
  }, []);

  const checkExistingCollections = async () => {
    const internalCollections = [
      'users', 'suppliers', 'products', 'proformaInvoices', 
      'purchaseOrders', 'clientInvoices', 'deliveries', 'settings', 'activityLogs'
    ];
    
    const ecommerceCollections = [
      'products_public', 'factories', 'orders_ecommerce', 
      'shopping_carts', 'suppliers_marketplace', 'product_sync_log', 'order_sync_log'
    ];

    const status = {};

    // Check internal collections
    for (const collectionName of internalCollections) {
      try {
        const snapshot = await getDocs(query(collection(db, collectionName), limit(1)));
        status[collectionName] = { exists: true, count: snapshot.size, type: 'internal' };
      } catch (error) {
        status[collectionName] = { exists: false, error: error.message, type: 'internal' };
      }
    }

    // Check e-commerce collections
    for (const collectionName of ecommerceCollections) {
      try {
        const snapshot = await getDocs(query(collection(db, collectionName), limit(1)));
        status[collectionName] = { exists: true, count: snapshot.size, type: 'ecommerce' };
      } catch (error) {
        status[collectionName] = { exists: false, error: error.message, type: 'ecommerce' };
      }
    }

    setExistingCollections(status);
  };

  const runSetup = async () => {
    setSetupStatus('running');
    setProgress(0);
    setCurrentStep('Initializing setup...');

    try {
      // Simulate progress updates
      const progressSteps = [
        'Creating products_public collection...',
        'Creating factories collection...',
        'Creating orders_ecommerce collection...',
        'Creating shopping_carts collection...',
        'Creating suppliers_marketplace collection...',
        'Creating sync log collections...',
        'Verifying setup...'
      ];

      // Update progress during setup
      const updateProgress = (step, index) => {
        setCurrentStep(step);
        setProgress(((index + 1) / progressSteps.length) * 100);
      };

      // Simulate progress updates (in real implementation, this would be handled by the setup function)
      progressSteps.forEach((step, index) => {
        setTimeout(() => updateProgress(step, index), index * 500);
      });

      // Run the actual setup
      const setupResults = await setupEcommerceCollections();
      
      setResults(setupResults);
      setSetupStatus('success');
      setCurrentStep('Setup completed successfully!');
      setProgress(100);

      // Refresh collections status
      await checkExistingCollections();

    } catch (error) {
      console.error('Setup failed:', error);
      setSetupStatus('error');
      setCurrentStep(`Setup failed: ${error.message}`);
      setResults({ errors: [error.message] });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready': return '⏳';
      case 'running': return '🔄';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ready': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'running': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg inline-block mb-4">
            <span className="font-bold text-2xl">HF</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            HiggsFlow E-commerce Setup
          </h1>
          <p className="text-gray-600">
            Extend your existing Firestore with e-commerce capabilities
          </p>
        </div>

        {/* Current Status */}
        <div className={`p-6 rounded-lg border-2 mb-8 ${getStatusColor(setupStatus)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-2xl mr-3">{getStatusIcon(setupStatus)}</span>
              <div>
                <h3 className="font-semibold text-lg">
                  {setupStatus === 'ready' && 'Ready to Setup E-commerce Collections'}
                  {setupStatus === 'running' && 'Setting up E-commerce Collections...'}
                  {setupStatus === 'success' && 'E-commerce Setup Complete!'}
                  {setupStatus === 'error' && 'Setup Failed'}
                </h3>
                <p className="text-sm opacity-80">{currentStep}</p>
              </div>
            </div>
            
            {setupStatus === 'ready' && (
              <button
                onClick={runSetup}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                🚀 Start Setup
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {setupStatus === 'running' && (
            <div className="mt-4">
              <div className="w-full bg-white bg-opacity-50 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm mt-2 opacity-80">
                Progress: {Math.round(progress)}%
              </p>
            </div>
          )}
        </div>

        {/* Collections Status */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Internal Collections (Existing) */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-100 text-green-800 p-2 rounded-lg mr-3">🏢</span>
              Internal Collections (Existing)
            </h3>
            <div className="space-y-2">
              {Object.entries(existingCollections)
                .filter(([_, info]) => info.type === 'internal')
                .map(([name, info]) => (
                  <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{name}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      info.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {info.exists ? '✅ Active' : '❌ Missing'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>

          {/* E-commerce Collections (New) */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 p-2 rounded-lg mr-3">🛍️</span>
              E-commerce Collections (New)
            </h3>
            <div className="space-y-2">
              {Object.entries(existingCollections)
                .filter(([_, info]) => info.type === 'ecommerce')
                .map(([name, info]) => (
                  <div key={name} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{name}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      info.exists ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {info.exists ? '✅ Created' : '⏳ Pending'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Setup Results</h3>
            
            {results.success && results.success.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-green-800 mb-2">✅ Successfully Created:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {results.success.map((item, index) => (
                    <li key={index} className="text-green-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.collections && results.collections.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-blue-800 mb-2">📦 Collections Created:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {results.collections.map((collection, index) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {collection}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {results.errors && results.errors.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-red-800 mb-2">❌ Errors:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {results.errors.map((error, index) => (
                    <li key={index} className="text-red-700">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Next Steps */}
        {setupStatus === 'success' && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">🎉 Next Steps</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">1</span>
                <div>
                  <h4 className="font-semibold">Create Firestore Indexes</h4>
                  <p className="text-gray-600 text-sm">
                    Go to <a href="https://console.firebase.google.com/project/higgsflow-b9f81/firestore/indexes" target="_blank" className="text-blue-600 underline">Firebase Console → Indexes</a> and create the required composite indexes.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">2</span>
                <div>
                  <h4 className="font-semibold">Update Security Rules</h4>
                  <p className="text-gray-600 text-sm">
                    Add e-commerce rules to your <a href="https://console.firebase.google.com/project/higgsflow-b9f81/firestore/rules" target="_blank" className="text-blue-600 underline">Firestore Security Rules</a>.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-0.5">3</span>
                <div>
                  <h4 className="font-semibold">Start Building E-commerce Features</h4>
                  <p className="text-gray-600 text-sm">
                    Begin developing the public catalog, factory registration, and order sync services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <button
            onClick={checkExistingCollections}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            🔄 Refresh Status
          </button>
          
          {setupStatus === 'success' && (
            <a
              href="https://console.firebase.google.com/project/higgsflow-b9f81/firestore/data"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              📊 View Collections
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default EcommerceSetup;
