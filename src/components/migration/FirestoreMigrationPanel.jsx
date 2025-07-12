// src/components/migration/FirestoreMigrationPanel.jsx
import React, { useState, useEffect } from 'react';
import { Cloud, Database, Users, Smartphone, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useUnifiedData } from '../../context/UnifiedDataContext';

const FirestoreMigrationPanel = () => {
  const { dataSource, migrateToFirestore, isRealTimeActive } = useUnifiedData();
  const [migrationStatus, setMigrationStatus] = useState({
    suppliers: { status: 'pending', count: 0 },
    products: { status: 'pending', count: 0 },
    purchaseOrders: { status: 'pending', count: 0 },
    deliveryTracking: { status: 'pending', count: 0 },
    paymentTracking: { status: 'pending', count: 0 }
  });
  
  const [isMigrating, setIsMigrating] = useState(false);

  const benefits = [
    {
      icon: Users,
      title: 'Real-time Collaboration',
      description: 'Multiple team members can update tracking status simultaneously'
    },
    {
      icon: Smartphone,
      title: 'Cross-Device Sync',
      description: 'Start on desktop, update on mobile - changes sync instantly'
    },
    {
      icon: Cloud,
      title: 'Data Security',
      description: 'Professional backup and disaster recovery included'
    },
    {
      icon: Database,
      title: 'Better Performance',
      description: 'Faster queries and real-time updates for large datasets'
    }
  ];

  // Get current data counts from localStorage
  useEffect(() => {
    const updateCounts = () => {
      try {
        const deliveryData = JSON.parse(localStorage.getItem('deliveryTracking') || '{}');
        const paymentData = JSON.parse(localStorage.getItem('paymentTracking') || '{}');
        const supplierData = JSON.parse(localStorage.getItem('suppliers') || '[]');
        const productData = JSON.parse(localStorage.getItem('products') || '[]');
        const poData = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
        
        setMigrationStatus(prev => ({
          ...prev,
          suppliers: { ...prev.suppliers, count: supplierData.length },
          products: { ...prev.products, count: productData.length },
          purchaseOrders: { ...prev.purchaseOrders, count: poData.length },
          deliveryTracking: { ...prev.deliveryTracking, count: Object.keys(deliveryData).length },
          paymentTracking: { ...prev.paymentTracking, count: Object.keys(paymentData).length }
        }));
      } catch (error) {
        console.error('Failed to count localStorage data:', error);
      }
    };
    
    updateCounts();
  }, []);

  const migrateCollection = async (collectionName, migrationFunction) => {
    setMigrationStatus(prev => ({
      ...prev,
      [collectionName]: { ...prev[collectionName], status: 'migrating' }
    }));

    try {
      const result = await migrationFunction();
      
      setMigrationStatus(prev => ({
        ...prev,
        [collectionName]: { 
          status: 'completed', 
          count: result.migrated || result.count || 0,
          errors: result.failed || 0
        }
      }));
      
      return result;
    } catch (error) {
      setMigrationStatus(prev => ({
        ...prev,
        [collectionName]: { status: 'error', error: error.message }
      }));
      throw error;
    }
  };

  const handleFullMigration = async () => {
    setIsMigrating(true);
    
    try {
      toast.loading('Starting Firestore migration...', { id: 'migration' });
      
      // Use the UnifiedDataContext migration function
      const { migrateToFirestore } = useUnifiedData();
      const result = await migrateToFirestore();
      
      if (result.success) {
        // Update all collections as completed
        setMigrationStatus(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(key => {
            updated[key] = { ...updated[key], status: 'completed' };
          });
          return updated;
        });
        
        toast.success(`Migration completed! ${result.migrated} items moved to Firestore`, { id: 'migration' });
        setCurrentDataSource('firestore');
      } else {
        throw new Error(result.error || 'Migration failed');
      }
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error(`Migration failed: ${error.message}`, { id: 'migration' });
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'migrating': return <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <div className="h-5 w-5 border-2 border-gray-300 rounded-full" />;
    }
  };

  if (dataSource === 'firestore') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              Firestore Migration Complete
            </h3>
            <p className="text-green-700">
              Your tracking system is now using real-time cloud storage with cross-device sync.
              {isRealTimeActive && " ✨ Real-time updates are active!"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold flex items-center">
            <Cloud className="h-6 w-6 text-blue-600 mr-2" />
            Upgrade to Real-Time Tracking
          </h2>
          <p className="text-gray-600 mt-1">
            Migrate your tracking data to Firestore for real-time collaboration and cross-device sync
          </p>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {benefits.map((benefit, index) => (
          <div key={index} className="flex items-start p-4 bg-blue-50 rounded-lg">
            <benefit.icon className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900">{benefit.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Migration Status */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Migration Progress</h3>
        <div className="space-y-3">
          {Object.entries(migrationStatus).map(([key, status]) => (
            <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {getStatusIcon(status.status)}
                <span className="ml-3 font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {status.count > 0 && (
                  <span className="ml-2 text-sm text-gray-600">
                    ({status.count} items)
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500">
                {status.status === 'completed' && '✓ Done'}
                {status.status === 'migrating' && 'Migrating...'}
                {status.status === 'error' && 'Failed'}
                {status.status === 'pending' && 'Pending'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Migration Actions */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div>
          <p className="font-medium text-gray-900">Ready to upgrade?</p>
          <p className="text-sm text-gray-600">
            Your data will be safely migrated to Firestore with zero downtime
          </p>
        </div>
        <button
          onClick={handleFullMigration}
          disabled={isMigrating}
          className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMigrating ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Migrating...
            </>
          ) : (
            <>
              Start Migration
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </button>
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-800 font-medium">Before migrating:</p>
            <ul className="text-amber-700 mt-1 list-disc list-inside space-y-1">
              <li>Your localStorage data will be preserved as backup</li>
              <li>Migration typically takes 1-2 minutes</li>
              <li>You can continue using the system during migration</li>
              <li>All team members will need to refresh their browsers after migration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirestoreMigrationPanel;
