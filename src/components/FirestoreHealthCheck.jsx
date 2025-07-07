// src/components/FirestoreHealthCheck.jsx
import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, Loader, Database, 
  Zap, Users, Package, FileText, ShoppingCart 
} from 'lucide-react';
import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const FirestoreHealthCheck = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [running, setRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(true);

  const collections = [
    { name: 'suppliers', icon: Users, color: 'text-blue-600' },
    { name: 'products', icon: Package, color: 'text-green-600' },
    { name: 'proformaInvoices', icon: FileText, color: 'text-purple-600' },
    { name: 'purchaseOrders', icon: ShoppingCart, color: 'text-orange-600' },
    { name: 'clientInvoices', icon: FileText, color: 'text-pink-600' }
  ];

  const runHealthCheck = async () => {
    setRunning(true);
    setTests([]);
    
    const results = [];

    // Test 1: Check user authentication
    results.push({
      name: 'Authentication',
      status: user ? 'success' : 'error',
      message: user ? `Logged in as ${user.email}` : 'Not authenticated',
      icon: Users
    });

    // Test 2: Read permissions for each collection
    for (const col of collections) {
      try {
        const snapshot = await getDocs(collection(db, col.name));
        results.push({
          name: `Read ${col.name}`,
          status: 'success',
          message: `✓ Can read (${snapshot.size} docs)`,
          icon: col.icon,
          color: col.color
        });
      } catch (error) {
        results.push({
          name: `Read ${col.name}`,
          status: 'error',
          message: `✗ ${error.code}`,
          icon: col.icon
        });
      }
      setTests([...results]);
    }

    // Test 3: Write test (create, update, delete)
    try {
      // Create
      const testDoc = await addDoc(collection(db, 'activityLogs'), {
        action: 'health_check',
        user: user?.email || 'anonymous',
        timestamp: serverTimestamp(),
        test: true
      });
      results.push({
        name: 'Write Test - Create',
        status: 'success',
        message: `✓ Created doc ${testDoc.id}`,
        icon: Zap
      });

      // Update
      await updateDoc(doc(db, 'activityLogs', testDoc.id), {
        updated: true,
        updatedAt: serverTimestamp()
      });
      results.push({
        name: 'Write Test - Update',
        status: 'success',
        message: `✓ Updated doc ${testDoc.id}`,
        icon: Zap
      });

      // Delete
      await deleteDoc(doc(db, 'activityLogs', testDoc.id));
      results.push({
        name: 'Write Test - Delete',
        status: 'success',
        message: `✓ Deleted test doc`,
        icon: Zap
      });
    } catch (error) {
      results.push({
        name: 'Write Test',
        status: 'error',
        message: `✗ ${error.message}`,
        icon: Zap
      });
    }

    // Test 4: Test composite indexes
    try {
      // Test suppliers index
      const suppliersQuery = query(
        collection(db, 'suppliers'),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      await getDocs(suppliersQuery);
      results.push({
        name: 'Suppliers Index',
        status: 'success',
        message: '✓ Index working',
        icon: Database
      });

      // Test products index
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      await getDocs(productsQuery);
      results.push({
        name: 'Products Index',
        status: 'success',
        message: '✓ Index working',
        icon: Database
      });
    } catch (error) {
      results.push({
        name: 'Index Test',
        status: 'warning',
        message: `Index might be building: ${error.code}`,
        icon: Database
      });
    }

    setTests(results);
    setRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <Loader className="w-5 h-5 text-yellow-600" />;
      default:
        return <Loader className="w-5 h-5 text-gray-600 animate-spin" />;
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const allPassed = tests.length > 0 && errorCount === 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-md w-full z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Firestore Health Check
        </h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700"
        >
          {showDetails ? 'Hide' : 'Show'}
        </button>
      </div>

      {showDetails && (
        <>
          <div className="mb-4">
            <button
              onClick={runHealthCheck}
              disabled={running}
              className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                running 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {running ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  Running Tests...
                </span>
              ) : (
                'Run Health Check'
              )}
            </button>
          </div>

          {tests.length > 0 && (
            <>
              <div className="mb-4 p-3 rounded-lg bg-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium">
                    ✓ Passed: {successCount}
                  </span>
                  <span className="text-red-600 font-medium">
                    ✗ Failed: {errorCount}
                  </span>
                </div>
                {allPassed && (
                  <div className="mt-2 text-center text-green-600 font-medium">
                    🎉 All tests passed! Firestore is ready!
                  </div>
                )}
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {tests.map((test, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      test.status === 'success' 
                        ? 'bg-green-50' 
                        : test.status === 'error'
                        ? 'bg-red-50'
                        : 'bg-yellow-50'
                    }`}
                  >
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {test.icon && <test.icon className={`w-4 h-4 ${test.color || 'text-gray-600'}`} />}
                        {test.name}
                      </div>
                      <div className="text-xs text-gray-600">{test.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {tests.length === 0 && !running && (
            <div className="text-center text-gray-500 text-sm">
              Click the button to test your Firestore setup
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FirestoreHealthCheck;
