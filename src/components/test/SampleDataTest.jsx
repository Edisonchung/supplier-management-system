// src/components/test/SampleDataTest.jsx
import React, { useState } from 'react';
import SampleDataService from '../../services/data/SampleDataService.js';

const SampleDataTest = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const testSampleData = () => {
    setLoading(true);
    try {
      const realisticData = SampleDataService.getRealisticData();
      setData(realisticData);
      console.log('✅ Sample data generated successfully:', realisticData);
    } catch (error) {
      console.error('❌ Sample data generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🧪 Sample Data Test</h2>
      
      <button
        onClick={testSampleData}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Generating...' : 'Generate Sample Data'}
      </button>

      {data && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-red-50 p-3 rounded">
              <div className="text-2xl font-bold text-red-600">
                {data.overdueDeliveries?.length || 0}
              </div>
              <div className="text-sm text-red-700">Overdue Deliveries</div>
            </div>
            
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-2xl font-bold text-orange-600">
                {data.urgentPayments?.length || 0}
              </div>
              <div className="text-sm text-orange-700">Urgent Payments</div>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {data.atRiskDeliveries?.length || 0}
              </div>
              <div className="text-sm text-yellow-700">At-Risk Deliveries</div>
            </div>
            
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">
                {data.costOptimizations?.length || 0}
              </div>
              <div className="text-sm text-green-700">Cost Optimizations</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-semibold mb-2">Sample Overdue Delivery:</h3>
            {data.overdueDeliveries?.[0] && (
              <pre className="text-sm bg-white p-2 rounded overflow-auto">
                {JSON.stringify(data.overdueDeliveries[0], null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SampleDataTest;
