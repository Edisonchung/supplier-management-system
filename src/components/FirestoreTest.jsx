// src/components/FirestoreTest.jsx
import { useState } from 'react';
import { db } from '../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const FirestoreTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message) => {
    setTestResults(prev => [...prev, { test, success, message, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Create a test document
      addResult('Creating document', true, 'Starting...');
      const testData = {
        name: 'Test Supplier',
        email: 'test@example.com',
        createdAt: new Date().toISOString(),
        testField: true
      };
      
      const docRef = await addDoc(collection(db, 'test-collection'), testData);
      addResult('Creating document', true, `Document created with ID: ${docRef.id}`);

      // Test 2: Read documents
      addResult('Reading documents', true, 'Starting...');
      const querySnapshot = await getDocs(collection(db, 'test-collection'));
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      addResult('Reading documents', true, `Found ${docs.length} documents`);

      // Test 3: Update document
      if (docRef) {
        addResult('Updating document', true, 'Starting...');
        await updateDoc(doc(db, 'test-collection', docRef.id), {
          updatedAt: new Date().toISOString(),
          name: 'Updated Test Supplier'
        });
        addResult('Updating document', true, 'Document updated successfully');
      }

      // Test 4: Delete document
      if (docRef) {
        addResult('Deleting document', true, 'Starting...');
        await deleteDoc(doc(db, 'test-collection', docRef.id));
        addResult('Deleting document', true, 'Document deleted successfully');
      }

      // Test 5: Test actual collections
      addResult('Testing suppliers collection', true, 'Starting...');
      const suppliersSnapshot = await getDocs(collection(db, 'suppliers'));
      addResult('Testing suppliers collection', true, `Suppliers collection accessible (${suppliersSnapshot.size} docs)`);

    } catch (error) {
      console.error('Firestore test error:', error);
      addResult('Error', false, error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl p-6 max-w-md w-full z-50">
      <h3 className="text-lg font-semibold mb-4">Firestore Connection Test</h3>
      
      <button
        onClick={runTests}
        disabled={loading}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
      >
        {loading ? 'Running Tests...' : 'Run Firestore Tests'}
      </button>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {testResults.map((result, index) => (
          <div
            key={index}
            className={`p-2 rounded text-sm ${
              result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            <div className="font-semibold">{result.test}</div>
            <div className="text-xs">{result.message}</div>
          </div>
        ))}
      </div>

      {testResults.length === 0 && !loading && (
        <p className="text-gray-500 text-sm text-center">Click the button to test Firestore connection</p>
      )}
    </div>
  );
};

export default FirestoreTest;
