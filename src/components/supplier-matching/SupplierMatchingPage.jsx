// src/components/supplier-matching/SupplierMatchingPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import SupplierMatchingDisplay from './SupplierMatchingDisplay';
import { purchaseOrderService } from '../../services/purchaseOrderService';

const SupplierMatchingPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPurchaseOrder();
  }, [poId]);

  const loadPurchaseOrder = async () => {
    try {
      setLoading(true);
      const po = await purchaseOrderService.getById(poId);
      setPurchaseOrder(po);
    } catch (err) {
      setError('Failed to load purchase order');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierSelection = async (itemNumber, supplierId) => {
    // Save supplier selection
    console.log(`Selected supplier ${supplierId} for item ${itemNumber}`);
    // Implement saving logic here
  };

  const exportSupplierReport = () => {
    // Generate PDF report of supplier recommendations
    console.log('Exporting supplier report...');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Purchase order not found'}</p>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/purchase-orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Supplier Matching Analysis
            </h1>
            <p className="text-gray-600 mt-1">
              Purchase Order: {purchaseOrder.orderNumber}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={exportSupplierReport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* PO Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Client</p>
            <p className="font-medium">{purchaseOrder.clientName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Order Date</p>
            <p className="font-medium">
              {new Date(purchaseOrder.orderDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Items</p>
            <p className="font-medium">{purchaseOrder.items?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-medium">${purchaseOrder.totalAmount?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Supplier Matching Display */}
      {purchaseOrder.itemsWithMatches || purchaseOrder.items ? (
        <SupplierMatchingDisplay
          items={purchaseOrder.itemsWithMatches || purchaseOrder.items}
          sourcingPlan={purchaseOrder.sourcingPlan}
          metrics={purchaseOrder.matchingMetrics}
          onSupplierSelect={handleSupplierSelection}
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            No supplier matching data available. Try re-extracting the purchase order.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupplierMatchingPage;
