// src/components/admin/DataHealthMonitor.jsx
import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Cloud, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const DataHealthMonitor = ({ showNotification }) => {
  const [healthStatus, setHealthStatus] = useState({
    localStorage: { status: 'checking', count: 0, lastUpdated: null },
    firestore: { status: 'checking', count: 0, lastUpdated: null }
  });
  const [migrationStatus, setMigrationStatus] = useState({});

  useEffect(() => {
    checkDataHealth();
  }, []);

  const checkDataHealth = async () => {
    // Check localStorage
    const localStorageData = {
      suppliers: JSON.parse(localStorage.getItem('suppliers') || '[]'),
      products: JSON.parse(localStorage.getItem('products') || '[]'),
      proformaInvoices: JSON.parse(localStorage.getItem('proformaInvoices') || '[]'),
      purchaseOrders: JSON.parse(localStorage.getItem('purchaseOrders') || '[]')
    };

    const localCounts = {
      suppliers: localStorageData.suppliers.length,
      products: localStorageData.products.length,
      proformaInvoices: localStorageData.proformaInvoices.length,
      purchaseOrders: localStorageData.purchaseOrders.length
    };

    // Check Firestore
    let firestoreCounts = { suppliers: 0, products: 0, proformaInvoices: 0, purchaseOrders: 0 };
    let firestoreStatus = 'healthy';

    try {
      const collections = ['suppliers', 'products', 'proformaInvoices', 'purchaseOrders'];
      
      for (const collection of collections) {
        const snapshot = await window.firebase.firestore().collection(collection).get();
        firestoreCounts[collection] = snapshot.size;
      }
    } catch (error) {
      console.error('Firestore health check failed:', error);
      firestoreStatus = 'error';
    }

    setHealthStatus({
      localStorage: {
        status: 'healthy',
        counts: localCounts,
        total: Object.values(localCounts).reduce((a, b) => a + b, 0),
        lastUpdated: new Date().toISOString()
      },
      firestore: {
        status: firestoreStatus,
        counts: firestoreCounts,
        total: Object.values(firestoreCounts).reduce((a, b) => a + b, 0),
        lastUpdated: new Date().toISOString()
      }
    });

    // Calculate migration status
    const migration = {};
    collections.forEach(collection => {
      const localCount = localCounts[collection];
      const firestoreCount = firestoreCounts[collection];
      migration[collection] = {
        local: localCount,
        firestore: firestoreCount,
        needsMigration: localCount > firestoreCount,
        difference: localCount - firestoreCount
      };
    });
    setMigrationStatus(migration);
  };

  const migrateCollection = async (collectionName) => {
    try {
      const localData = JSON.parse(localStorage.getItem(collectionName) || '[]');
      const batch = window.firebase.firestore().batch();
      
      localData.forEach(item => {
        const docRef = window.firebase.firestore().collection(collectionName).doc();
        batch.set(docRef, {
          ...item,
          migratedAt: new Date().toISOString(),
          migratedFrom: 'localStorage'
        });
      });

      await batch.commit();
      showNotification(`${collectionName} migrated successfully`, 'success');
      checkDataHealth(); // Refresh status
    } catch (error) {
      console.error(`Migration failed for ${collectionName}:`, error);
      showNotification(`Migration failed for ${collectionName}`, 'error');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'checking': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Data Health Monitor</h2>
        <p className="text-gray-600">Monitor localStorage and Firestore data synchronization</p>
      </div>

      {/* Data Sources Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* localStorage Status */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">localStorage</h3>
            </div>
            {getStatusIcon(healthStatus.localStorage.status)}
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {healthStatus.localStorage.total || 0}
            </p>
            <p className="text-sm text-gray-600">Total records</p>
            
            {healthStatus.localStorage.counts && (
              <div className="mt-4 space-y-1">
                {Object.entries(healthStatus.localStorage.counts).map(([key, count]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Firestore Status */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Firestore</h3>
            </div>
            {getStatusIcon(healthStatus.firestore.status)}
          </div>
          
          <div className="space-y-2">
            <p className="text-2xl font-bold text-gray-900">
              {healthStatus.firestore.total || 0}
            </p>
            <p className="text-sm text-gray-600">Total documents</p>
            
            {healthStatus.firestore.counts && (
              <div className="mt-4 space-y-1">
                {Object.entries(healthStatus.firestore.counts).map(([key, count]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-600">{key}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Migration Status */}
      <div className="bg-white border rounded-lg">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Migration Status</h3>
          <p className="text-sm text-gray-600">Compare localStorage and Firestore data</p>
        </div>
        
        <div className="p-6">
          <div className="space-y-4">
            {Object.entries(migrationStatus).map(([collection, status]) => (
              <div key={collection} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{collection}</h4>
                  <p className="text-sm text-gray-600">
                    Local: {status.local} | Firestore: {status.firestore}
                    {status.difference > 0 && (
                      <span className="text-orange-600 ml-2">
                        ({status.difference} need migration)
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {status.needsMigration ? (
                    <button
                      onClick={() => migrateCollection(collection)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Migrate
                    </button>
                  ) : (
                    <span className="text-green-600 text-sm font-medium">✓ Synced</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={checkDataHealth}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default DataHealthMonitor;
