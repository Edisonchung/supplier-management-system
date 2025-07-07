// src/utils/migrateToFirestore.js
import { 
  suppliersService, 
  productsService, 
  purchaseOrdersService 
} from '../services/firestore';
import { auth } from '../config/firebase';

export async function migrateLocalStorageToFirestore() {
  try {
    console.log('Starting migration to Firestore...');
    
    // Ensure user is authenticated
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to migrate data');
    }

    const userId = auth.currentUser.uid;
    const results = {
      suppliers: { migrated: 0, failed: 0 },
      products: { migrated: 0, failed: 0 },
      purchaseOrders: { migrated: 0, failed: 0 }
    };

    // Migrate Suppliers
    const suppliers = JSON.parse(localStorage.getItem('suppliers') || '[]');
    for (const supplier of suppliers) {
      try {
        // Remove localStorage specific fields
        const { id, ...supplierData } = supplier;
        
        // Add Firestore specific fields
        const firestoreSupplier = {
          ...supplierData,
          createdBy: userId,
          migratedFromLocal: true,
          originalId: id
        };
        
        await suppliersService.create(firestoreSupplier);
        results.suppliers.migrated++;
      } catch (error) {
        console.error('Failed to migrate supplier:', supplier.name, error);
        results.suppliers.failed++;
      }
    }

    // Migrate Products
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const supplierIdMap = new Map(); // Map old IDs to new IDs

    // First, create a mapping of old to new supplier IDs
    const firestoreSuppliers = await suppliersService.getAll();
    firestoreSuppliers.forEach(supplier => {
      if (supplier.originalId) {
        supplierIdMap.set(supplier.originalId, supplier.id);
      }
    });

    for (const product of products) {
      try {
        const { id, supplierId, ...productData } = product;
        
        // Map the supplier ID to the new Firestore ID
        const newSupplierId = supplierIdMap.get(supplierId) || supplierId;
        
        const firestoreProduct = {
          ...productData,
          supplierId: newSupplierId,
          createdBy: userId,
          migratedFromLocal: true,
          originalId: id
        };
        
        await productsService.create(firestoreProduct);
        results.products.migrated++;
      } catch (error) {
        console.error('Failed to migrate product:', product.name, error);
        results.products.failed++;
      }
    }

    // Migrate Purchase Orders
    const purchaseOrders = JSON.parse(localStorage.getItem('purchaseOrders') || '[]');
    
    for (const po of purchaseOrders) {
      try {
        const { id, ...poData } = po;
        
        // Update supplier ID if needed
        if (poData.supplierId) {
          poData.supplierId = supplierIdMap.get(poData.supplierId) || poData.supplierId;
        }
        
        const firestorePO = {
          ...poData,
          createdBy: userId,
          migratedFromLocal: true,
          originalId: id
        };
        
        await purchaseOrdersService.create(firestorePO);
        results.purchaseOrders.migrated++;
      } catch (error) {
        console.error('Failed to migrate PO:', po.poNumber, error);
        results.purchaseOrders.failed++;
      }
    }

    console.log('Migration completed:', results);
    return results;
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// src/components/settings/MigrationTool.jsx
import React, { useState } from 'react';
import { Database, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { migrateLocalStorageToFirestore } from '../../utils/migrateToFirestore';

const MigrationTool = () => {
  const [migrating, setMigrating] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleMigration = async () => {
    if (!window.confirm('This will migrate all your local data to Firestore. Continue?')) {
      return;
    }

    setMigrating(true);
    setError(null);
    setResults(null);

    try {
      const migrationResults = await migrateLocalStorageToFirestore();
      setResults(migrationResults);
      
      // Optionally clear localStorage after successful migration
      if (window.confirm('Migration successful! Clear local storage?')) {
        localStorage.removeItem('suppliers');
        localStorage.removeItem('products');
        localStorage.removeItem('purchaseOrders');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Database className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-semibold">Migrate to Firestore</h2>
      </div>

      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Transfer your local data to Firestore for cloud storage, real-time sync, and multi-device access.
        </p>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">Before migrating:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Ensure you're logged in with the correct account</li>
                <li>Back up your data by exporting to Excel</li>
                <li>This process may take a few minutes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {results && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
            <div className="text-sm text-green-800">
              <p className="font-semibold mb-2">Migration Complete!</p>
              <ul className="space-y-1">
                <li>Suppliers: {results.suppliers.migrated} migrated, {results.suppliers.failed} failed</li>
                <li>Products: {results.products.migrated} migrated, {results.products.failed} failed</li>
                <li>Purchase Orders: {results.purchaseOrders.migrated} migrated, {results.purchaseOrders.failed} failed</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleMigration}
        disabled={migrating}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {migrating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
            Migrating...
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 mr-2" />
            Start Migration
          </>
        )}
      </button>
    </div>
  );
};

export default MigrationTool;
