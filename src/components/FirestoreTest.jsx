// src/components/FirestoreTest.jsx
import React, { useState, useEffect } from 'react';
import { suppliersService } from '../services/firestore';
import { CheckCircle, AlertCircle, Database } from 'lucide-react';

const FirestoreTest = () => {
  const [status, setStatus] = useState('testing');
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    testFirestore();
  }, []);

  const testFirestore = async () => {
    try {
      // Test 1: Create a test supplier
      setStatus('creating');
      const testSupplier = await suppliersService.create({
        name: 'Test Supplier ' + Date.now(),
        email: 'test@example.com',
        status: 'active'
      });
      console.log('Created supplier:', testSupplier);

      // Test 2: Read all suppliers
      setStatus('reading');
      const allSuppliers = await suppliersService.getAll();
      setSuppliers(allSuppliers);
      console.log('All suppliers:', allSuppliers);

      // Test 3: Update the test supplier
      setStatus('updating');
      await suppliersService.update(testSupplier.id, {
        name: testSupplier.name + ' (Updated)'
      });

      // Test 4: Delete the test supplier
      setStatus('deleting');
      await suppliersService.delete(testSupplier.id);

      setStatus('success');
    } catch (err) {
      console.error('Firestore test failed:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center mb-2">
        <Database className="h-5 w-5 mr-2 text-blue-600" />
        <h3 className="font-semibold">Firestore Test</h3>
      </div>
      
      {status === 'testing' && (
        <div className="flex items-center text-yellow-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          Testing connection...
        </div>
      )}
      
      {status === 'success' && (
        <div className="text-green-600">
          <CheckCircle className="h-4 w-4 inline mr-1" />
          Firestore is working! Found {suppliers.length} suppliers.
        </div>
      )}
      
      {status === 'error' && (
        <div className="text-red-600">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default FirestoreTest;
