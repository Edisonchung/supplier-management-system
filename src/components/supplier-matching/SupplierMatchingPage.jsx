// src/components/supplier-matching/SupplierMatchingPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  RefreshCw, 
  Save,
  Home,
  ChevronRight,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import SupplierMatchingDisplay from './SupplierMatchingDisplay';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import { AIExtractionService } from '../../services/ai';
import { toast } from 'react-hot-toast';

const SupplierMatchingPage = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSuppliers, setSelectedSuppliers] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Load purchase order data
  const loadPurchaseOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const po = await purchaseOrderService.getById(poId);
      
      // If no supplier matching data, run it
      if (!po.sourcingPlan && !po.matchingMetrics) {
        console.log('No supplier matching data found, running matching...');
        await handleRefreshMatching(po, false);
      } else {
        setPurchaseOrder(po);
        // Load any previously selected suppliers
        const selections = {};
        po.items?.forEach(item => {
          if (item.selectedSupplierId) {
            selections[item.itemNumber] = item.selectedSupplierId;
          }
        });
        setSelectedSuppliers(selections);
      }
    } catch (err) {
      setError('Failed to load purchase order');
      console.error('Error loading PO:', err);
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    loadPurchaseOrder();
  }, [loadPurchaseOrder]);

  // Handle supplier selection
  const handleSupplierSelection = async (itemNumber, supplierId) => {
    try {
      const newSelections = {
        ...selectedSuppliers,
        [itemNumber]: supplierId
      };
      setSelectedSuppliers(newSelections);
      setHasChanges(true);
      
      // Update local state immediately for better UX
      setPurchaseOrder(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item.itemNumber === itemNumber 
            ? { ...item, selectedSupplierId: supplierId }
            : item
        )
      }));
      
      toast.success('Supplier selected. Remember to save your changes.');
    } catch (error) {
      toast.error('Failed to select supplier');
      console.error('Selection error:', error);
    }
  };

  // Save all supplier selections
  const saveSupplierSelections = async () => {
    try {
      setSaving(true);
      
      // Update items with selected suppliers
      const updatedItems = purchaseOrder.items.map(item => ({
        ...item,
        selectedSupplierId: selectedSuppliers[item.itemNumber] || item.selectedSupplierId
      }));
      
      await purchaseOrderService.update(poId, {
        items: updatedItems,
        supplierSelectionsUpdated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      setHasChanges(false);
      toast.success('Supplier selections saved successfully');
      
      // Reload to ensure data consistency
      await loadPurchaseOrder();
    } catch (error) {
      toast.error('Failed to save supplier selections');
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  // Refresh supplier matching
  const handleRefreshMatching = async (existingPO = null, showToast = true) => {
    try {
      setRefreshing(true);
      
      const po = existingPO || purchaseOrder;
      
      // Re-run supplier matching
      const result = await AIExtractionService.rerunSupplierMatching({
        items: po.items,
        documentType: 'client_purchase_order',
        poNumber: po.orderNumber || po.poNumber
      });
      
      if (result.success) {
        const updatedPO = {
          ...po,
          items: result.data.items,
          sourcingPlan: result.data.sourcingPlan,
          matchingMetrics: result.data.matchingMetrics
        };
        
        setPurchaseOrder(updatedPO);
        
        // Save the updated matching data
        await purchaseOrderService.update(poId, {
          items: result.data.items,
          sourcingPlan: result.data.sourcingPlan,
          matchingMetrics: result.data.matchingMetrics,
          lastMatchingUpdate: new Date().toISOString()
        });
        
        if (showToast) {
          toast.success('Supplier matching updated successfully');
        }
      } else {
        throw new Error(result.error || 'Failed to refresh matching');
      }
    } catch (error) {
      toast.error('Failed to refresh supplier matching');
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Export supplier report
  const exportSupplierReport = async () => {
    try {
      if (!purchaseOrder) return;
      
      // Generate CSV data
      const csvData = generateSupplierReportCSV(purchaseOrder);
      
      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `supplier-report-${purchaseOrder.orderNumber || purchaseOrder.poNumber}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  // Generate CSV data for export
  const generateSupplierReportCSV = (po) => {
    const headers = [
      'Item #',
      'Product Name',
      'Product Code',
      'Quantity',
      'Target Price',
      'Best Supplier',
      'Best Price',
      'Potential Savings',
      'Lead Time',
      'In Stock'
    ];
    
    const rows = [headers];
    
    po.items?.forEach(item => {
      const bestMatch = item.bestMatch || item.supplierMatches?.[0];
      const row = [
        item.itemNumber,
        item.productName,
        item.productCode || '',
        item.quantity,
        item.unitPrice?.toFixed(2) || '0.00',
        bestMatch?.supplierName || 'No match',
        bestMatch?.pricing?.unitPrice?.toFixed(2) || 'N/A',
        bestMatch ? ((item.unitPrice - bestMatch.pricing.unitPrice) * item.quantity).toFixed(2) : '0.00',
        bestMatch?.pricing?.leadTime || 'N/A',
        bestMatch?.pricing?.inStock ? 'Yes' : 'No'
      ];
      rows.push(row);
    });
    
    // Add summary
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Items', po.items?.length || 0]);
    rows.push(['Items with Matches', po.matchingMetrics?.itemsWithMatches || 0]);
    rows.push(['Total Potential Savings', po.matchingMetrics?.potentialSavings?.toFixed(2) || '0.00']);
    rows.push(['Average Lead Time', po.matchingMetrics?.averageLeadTime || 'Unknown']);
    rows.push(['Supplier Options', po.matchingMetrics?.supplierDiversity || 0]);
    
    // Convert to CSV string
    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !purchaseOrder) {
    return (
      <div className="max-w-2xl mx-auto mt-16">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {error || 'Purchase order not found'}
          </h3>
          <p className="text-red-700 mb-4">
            The purchase order you're looking for could not be loaded.
          </p>
          <button
            onClick={() => navigate('/purchase-orders')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Purchase Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <button 
          onClick={() => navigate('/')}
          className="hover:text-gray-900 flex items-center gap-1"
        >
          <Home className="w-4 h-4" />
          Home
        </button>
        <ChevronRight className="w-4 h-4" />
        <button 
          onClick={() => navigate('/purchase-orders')}
          className="hover:text-gray-900"
        >
          Purchase Orders
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">
          Supplier Matching
        </span>
      </nav>

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
              Purchase Order: {purchaseOrder.orderNumber || purchaseOrder.poNumber}
            </p>
          </div>
          
          <div className="flex gap-2">
            {hasChanges && (
              <button
                onClick={saveSupplierSelections}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Selections
              </button>
            )}
            <button
              onClick={() => handleRefreshMatching()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Matching
            </button>
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

      {/* Success message for changes */}
      {hasChanges && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              You have unsaved supplier selections. Remember to save your changes.
            </p>
          </div>
          <button
            onClick={saveSupplierSelections}
            className="text-yellow-600 hover:text-yellow-800 font-medium"
          >
            Save Now
          </button>
        </div>
      )}

      {/* Extended PO Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
            <p className="text-sm text-gray-600">Delivery Date</p>
            <p className="font-medium">
              {purchaseOrder.deliveryDate || purchaseOrder.requiredDate
                ? new Date(purchaseOrder.deliveryDate || purchaseOrder.requiredDate).toLocaleDateString()
                : 'Not specified'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Items</p>
            <p className="font-medium">{purchaseOrder.items?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="font-medium text-lg">${purchaseOrder.totalAmount?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <span className={`inline-block px-3 py-1 text-sm rounded-full font-medium ${
              purchaseOrder.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              purchaseOrder.status === 'sent' ? 'bg-blue-100 text-blue-700' :
              purchaseOrder.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {purchaseOrder.status || 'draft'}
            </span>
          </div>
        </div>
        
        {purchaseOrder.notes && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">Notes</p>
            <p className="text-gray-900">{purchaseOrder.notes}</p>
          </div>
        )}
      </div>

      {/* Last Update Info */}
      {purchaseOrder.lastMatchingUpdate && (
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>
            Supplier matching last updated: {' '}
            {new Date(purchaseOrder.lastMatchingUpdate).toLocaleString()}
          </span>
        </div>
      )}

      {/* Supplier Matching Display */}
      {purchaseOrder.itemsWithMatches || purchaseOrder.items ? (
        <SupplierMatchingDisplay
          items={purchaseOrder.itemsWithMatches || purchaseOrder.items}
          sourcingPlan={purchaseOrder.sourcingPlan}
          metrics={purchaseOrder.matchingMetrics}
          onSupplierSelect={handleSupplierSelection}
          selectedSuppliers={selectedSuppliers}
        />
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            No Supplier Matching Data
          </h3>
          <p className="text-yellow-700 mb-4">
            This purchase order doesn't have supplier matching data yet.
          </p>
          <button
            onClick={() => handleRefreshMatching()}
            disabled={refreshing}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
          >
            {refreshing ? 'Running Supplier Matching...' : 'Run Supplier Matching'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SupplierMatchingPage;
