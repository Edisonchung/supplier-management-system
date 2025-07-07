// src/components/SetupFirestore.jsx
// Temporary component to run Firestore setup

import React, { useState } from 'react';
import { db } from '../config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

const SetupFirestore = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (message, success = true) => {
    setResults(prev => [...prev, { message, success, timestamp: new Date().toISOString() }]);
  };

  const setupCollections = async () => {
    setLoading(true);
    setResults([]);

    try {
      addResult('🚀 Starting Firestore setup...');

      // System settings
      addResult('⚙️  Creating system settings...');
      await setDoc(doc(db, 'settings', 'system'), {
        companyName: 'HiggsFlow',
        version: '1.1.0',
        setupDate: serverTimestamp(),
        features: {
          aiExtraction: true,
          emailNotifications: false,
          advancedReporting: false
        }
      });
      addResult('✅ System settings created');

      // Sample supplier
      addResult('🏢 Creating sample supplier...');
      const supplierRef = await addDoc(collection(db, 'suppliers'), {
        name: 'Sample Supplier Co.',
        email: 'sample@supplier.com',
        phone: '+1234567890',
        address: '123 Demo Street',
        contactPerson: 'John Demo',
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: 'system',
        metadata: {
          isDemo: true
        }
      });
      addResult(`✅ Supplier created: ${supplierRef.id}`);

      // Sample product
      addResult('📦 Creating sample product...');
      const productRef = await addDoc(collection(db, 'products'), {
        name: 'Sample Product',
        brand: 'Demo Brand',
        category: 'electronics',
        sku: 'DEMO-001',
        price: 100,
        stock: 50,
        minStock: 10,
        status: 'pending',
        supplierId: supplierRef.id,
        createdAt: serverTimestamp(),
        createdBy: 'system',
        metadata: {
          isDemo: true
        }
      });
      addResult(`✅ Product created: ${productRef.id}`);

      // Activity log
      addResult('📝 Creating activity log...');
      await addDoc(collection(db, 'activityLogs'), {
        action: 'system_setup',
        description: 'Initial Firestore setup completed',
        userId: 'system',
        timestamp: serverTimestamp(),
        metadata: {
          collections: ['users', 'suppliers', 'products', 'proformaInvoices', 'purchaseOrders', 'clientInvoices', 'deliveries', 'settings', 'activityLogs']
        }
      });
      addResult('✅ Activity log created');

      addResult('🎉 Setup completed successfully!');
    } catch (error) {
      console.error('Setup error:', error);
      addResult(`❌ Error: ${error.message}`, false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Firestore Setup Tool</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ This will create initial collections and sample documents in your Firestore database.
            Run this only once!
          </p>
        </div>

        <button
          onClick={setupCollections}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
        >
          {loading ? 'Setting up...' : 'Run Firestore Setup'}
        </button>

        <div className="space-y-2">
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-2 rounded text-sm ${
                result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}
            >
              {result.message}
            </div>
          ))}
        </div>

        {results.length > 0 && !loading && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800 font-semibold mb-2">Next Steps:</p>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Go to Firebase Console → Firestore → Indexes</li>
              <li>Create the required composite indexes</li>
              <li>Remove this setup component from your app</li>
              <li>Start using Firestore in your components!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default SetupFirestore;
