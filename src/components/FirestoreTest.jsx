// src/components/FirestoreTest.jsx
import { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, limit } from 'firebase/firestore';

const FirestoreTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message) => {
    setTestResults(prev => [...prev, { test, success, message, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    let testDocId = null;

    try {
      // Test 1: Create a test document
      addResult('Creating document', true, 'Starting...');
      const testData = {
        name: 'Test Supplier',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        testField: true
      };
      
      const docRef = await addDoc(collection(db, 'test-firestore'), testData);
      testDocId = docRef.id;
      addResult('Creating document', true, `Document created with ID: ${docRef.id}`);

      // Test 2: Read documents
      addResult('Reading documents', true, 'Starting...');
      const q = query(collection(db, 'test-firestore'), limit(5));
      const querySnapshot = await getDocs(q);
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      addResult('Reading documents', true, `Found ${docs.length} documents in test collection`);

      // Test 3: Update document
      if (testDocId) {
        addResult('Updating document', true, 'Starting...');
        await updateDoc(doc(db, 'test-firestore', testDocId), {
          updatedAt: new Date().toISOString(),
          name: 'Updated Test Supplier'
        });
        addResult('Updating document', true, 'Document updated successfully');
      }

      // Test 4: Check existing collections
      const collections = ['suppliers', 'products', 'users', 'proformaInvoices', 'purchaseOrders'];
      for (const collName of collections) {
        try {
          addResult(`Checking ${collName}`, true, 'Starting...');
          const q = query(collection(db, collName), limit(1));
          const snapshot = await getDocs(q);
          addResult(`Checking ${collName}`, true, `Collection accessible (${snapshot.size} docs found)`);
        } catch (error) {
          addResult(`Checking ${collName}`, false, error.code === 'permission-denied' ? 'Permission denied - update security rules' : error.message);
        }
      }

      // Test 5: Delete test document
      if (testDocId) {
        addResult('Cleaning up', true, 'Starting...');
        await deleteDoc(doc(db, 'test-firestore', testDocId));
        addResult('Cleaning up', true, 'Test document deleted');
      }

    } catch (error) {
      console.error('Firestore test error:', error);
      addResult('Error', false, `${error.code}: ${error.message}`);
      
      // Provide helpful error messages
      if (error.code === 'permission-denied') {
        addResult('Hint', false, 'Update Firestore security rules to allow read/write access');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-md w-full z-50 max-h-[500px] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Firestore Connection Test</h3>
        <button
          onClick={clearResults}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4 transition-colors"
      >
        {loading ? 'Running Tests...' : 'Run Firestore Tests'}
      </button>

      <div className="space-y-2 overflow-y-auto flex-1">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg text-sm ${
              result.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="font-semibold">{result.test}</div>
            <div className="text-xs mt-1">{result.message}</div>
          </div>
        ))}
      </div>

      {testResults.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">Click the button to test Firestore connection</p>
          <p className="text-gray-400 text-xs mt-2">This will create and delete test documents</p>
        </div>
      )}

      {/* Security Rules Helper */}
      {testResults.some(r => r.message?.includes('permission-denied')) && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 font-semibold mb-1">Security Rules Fix:</p>
          <pre className="text-xs text-yellow-700 overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FirestoreTest;
