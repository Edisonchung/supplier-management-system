// src/components/common/DataSourceToggle.jsx
import React, { useState } from 'react';
import { Database, Cloud, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

const DataSourceToggle = ({ 
  dataSource, 
  onToggle, 
  onMigrate,
  loading = false,
  supplierCount = 0 
}) => {
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrationStatus(null);
    
    try {
      const result = await onMigrate();
      setMigrationStatus({
        type: 'success',
        message: `Successfully migrated ${result.migrated} suppliers to Firestore${result.failed > 0 ? ` (${result.failed} failed)` : ''}`
      });
      
      // Close dialog after successful migration
      setTimeout(() => {
        setShowMigrationDialog(false);
        setMigrationStatus(null);
      }, 3000);
    } catch (error) {
      setMigrationStatus({
        type: 'error',
        message: `Migration failed: ${error.message}`
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <>
      {/* Toggle Switch */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5 text-gray-600" />
              <span className={`font-medium ${dataSource === 'localStorage' ? 'text-gray-900' : 'text-gray-500'}`}>
                Local Storage
              </span>
            </div>

            {/* Toggle Button */}
            <button
              onClick={onToggle}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                dataSource === 'firestore' ? 'bg-blue-600' : 'bg-gray-200'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  dataSource === 'firestore' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>

            <div className="flex items-center space-x-2">
              <Cloud className="w-5 h-5 text-gray-600" />
              <span className={`font-medium ${dataSource === 'firestore' ? 'text-gray-900' : 'text-gray-500'}`}>
                Firestore
              </span>
            </div>
          </div>

          {/* Migration Button */}
          {dataSource === 'localStorage' && supplierCount > 0 && (
            <button
              onClick={() => setShowMigrationDialog(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <span>Migrate to Firestore</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Information */}
        <div className="mt-3 text-sm text-gray-600">
          {dataSource === 'localStorage' ? (
            <p>Using local storage (browser-only). Data won't sync across devices.</p>
          ) : (
            <p>Using Firestore (cloud). Data syncs in real-time across all devices.</p>
          )}
        </div>
      </div>

      {/* Migration Dialog */}
      {showMigrationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Migrate to Firestore
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>This will copy all {supplierCount} suppliers from local storage to Firestore.</p>
                  <p className="mt-2">Benefits of migration:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Access your data from any device</li>
                    <li>Real-time synchronization</li>
                    <li>Automatic backups</li>
                    <li>Better performance with large datasets</li>
                  </ul>
                </div>
              </div>

              {migrationStatus && (
                <div className={`p-3 rounded-md flex items-start space-x-2 ${
                  migrationStatus.type === 'success' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  {migrationStatus.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{migrationStatus.message}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowMigrationDialog(false)}
                disabled={isMigrating}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMigrating ? 'Migrating...' : 'Start Migration'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DataSourceToggle;
