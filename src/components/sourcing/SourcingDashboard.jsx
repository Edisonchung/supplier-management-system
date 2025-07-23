// src/components/sourcing/SourcingDashboard.jsx
import React, { useState } from 'react';
import { Package, ShoppingCart, AlertCircle, Search, CheckCircle, Clock, ArrowRight, Filter, X } from 'lucide-react';
import { useClientPOs } from '../../hooks/useClientPOs';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const SourcingDashboard = ({ showNotification }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { sourcingRequired, loading, error, updateItemSourcing } = useClientPOs();
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const [detailPO, setDetailPO] = useState(null);

  const getSourcingStatusColor = (status) => {
    switch (status) {
      case 'complete': return 'text-green-600 bg-green-100';
      case 'partial': return 'text-yellow-600 bg-yellow-100';
      case 'pending': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleItemSelect = (po, item) => {
    if (selectedPO?.id !== po.id) {
      setSelectedPO(po);
      setSelectedItems([item]);
    } else {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          return prev.filter(i => i.id !== item.id);
        }
        return [...prev, item];
      });
    }
  };

  const handleCreateSupplierPO = () => {
    if (!selectedPO || selectedItems.length === 0) return;
    
    // Navigate to PO creation with pre-filled items
    navigate('/purchase-orders', {
      state: {
        fromClientPO: true,
        clientPOReference: {
          id: selectedPO.id,
          poNumber: selectedPO.clientPONumber,
          clientName: selectedPO.clientName
        },
        items: selectedItems.map(item => ({
          ...item,
          productName: item.description || item.productName || item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice || (item.quantity * item.unitPrice)
        }))
      }
    });
  };

  const handleMarkAsSourced = async (poId, itemId) => {
    const result = await updateItemSourcing(poId, itemId, {
      supplierId: 'manual',
      supplierName: 'Manually Sourced',
      sourcedBy: user?.email,
      sourcedAt: new Date().toISOString()
    });
    
    if (result.success) {
      showNotification('Item marked as sourced', 'success');
    } else {
      showNotification('Failed to update sourcing status', 'error');
    }
  };

  const handleViewDetails = (po) => {
    setDetailPO(po);
    setShowDetails(true);
  };

  const filteredPOs = sourcingRequired.filter(po => {
    const matchesSearch = 
      po.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.clientPONumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.items?.some(item => 
        (item.description || item.productName || '')
          .toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesFilter = 
      filterStatus === 'all' ||
      po.sourcingStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        <p className="font-medium">Error loading sourcing data</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Sourcing Dashboard</h1>
            <p className="text-gray-600">Manage client POs that require supplier sourcing</p>
            <span className="ml-2 text-sm text-blue-600">(Real-time sync enabled)</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Sourcing</p>
              <p className="text-2xl font-bold text-gray-900">
                {sourcingRequired.filter(po => po.sourcingStatus === 'pending').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-red-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partial Sourcing</p>
              <p className="text-2xl font-bold text-gray-900">
                {sourcingRequired.filter(po => po.sourcingStatus === 'partial').length}
              </p>
            </div>
            <Package className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Items to Source</p>
              <p className="text-2xl font-bold text-gray-900">
                {sourcingRequired.reduce((acc, po) => 
                  acc + po.items.filter(item => !item.sourcingStatus || item.sourcingStatus === 'pending').length, 0
                )}
              </p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by client name, PO number, or item description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-md ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-md ${
                filterStatus === 'pending' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('partial')}
              className={`px-4 py-2 rounded-md ${
                filterStatus === 'partial' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Partial
            </button>
          </div>
        </div>
      </div>

      {/* Selected Items Bar */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-blue-900">
              <span className="font-medium">{selectedItems.length} items selected</span> from {selectedPO.clientName}
            </p>
            <button
              onClick={handleCreateSupplierPO}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Supplier PO
              <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* Client POs List */}
      <div className="space-y-4">
        {filteredPOs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No client POs require sourcing</p>
          </div>
        ) : (
          filteredPOs.map(po => (
            <div key={po.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{po.clientName}</h3>
                    <p className="text-sm text-gray-600">PO: {po.clientPONumber}</p>
                    <p className="text-sm text-gray-500">
                      Date: {new Date(po.createdAt || po.date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSourcingStatusColor(po.sourcingStatus)}`}>
                    {po.sourcingStatus === 'pending' && 'Sourcing Required'}
                    {po.sourcingStatus === 'partial' && 'Partially Sourced'}
                    {po.sourcingStatus === 'complete' && 'Fully Sourced'}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2 mb-4">
                  <p className="text-sm font-medium text-gray-700">Items:</p>
                  {po.items.map((item, index) => (
                    <div key={item.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedPO?.id === po.id && selectedItems.some(i => i.id === item.id)}
                          onChange={() => handleItemSelect(po, item)}
                          className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                          disabled={item.sourcingStatus === 'sourced'}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.description || item.productName || item.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            Qty: {item.quantity} | Unit Price: RM {item.unitPrice?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {item.sourcingStatus === 'sourced' ? (
                          <span className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Sourced
                          </span>
                        ) : (
                          <button
                            onClick={() => handleMarkAsSourced(po.id, item.id)}
                            className="flex items-center text-red-600 text-sm hover:text-red-700"
                          >
                            <AlertCircle className="h-4 w-4 mr-1" />
                            Mark as Sourced
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total Amount: <span className="font-semibold">RM {po.totalAmount?.toFixed(2) || '0.00'}</span>
                  </p>
                  <button
                    onClick={() => handleViewDetails(po)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {showDetails && detailPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Client PO Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900">Client Information</h3>
                  <dl className="mt-2 text-sm">
                    <div className="py-1">
                      <dt className="inline font-medium text-gray-600">Client: </dt>
                      <dd className="inline text-gray-900">{detailPO.clientName}</dd>
                    </div>
                    <div className="py-1">
                      <dt className="inline font-medium text-gray-600">PO Number: </dt>
                      <dd className="inline text-gray-900">{detailPO.clientPONumber}</dd>
                    </div>
                    <div className="py-1">
                      <dt className="inline font-medium text-gray-600">Date: </dt>
                      <dd className="inline text-gray-900">
                        {new Date(detailPO.createdAt || detailPO.date).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                
                {detailPO.deliveryAddress && (
                  <div>
                    <h3 className="font-medium text-gray-900">Delivery Information</h3>
                    <p className="mt-1 text-sm text-gray-600">{detailPO.deliveryAddress}</p>
                    {detailPO.deliveryDate && (
                      <p className="text-sm text-gray-600">
                        Expected: {new Date(detailPO.deliveryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium text-gray-900">Items</h3>
                  <div className="mt-2 space-y-2">
                    {detailPO.items.map((item, idx) => (
                      <div key={idx} className="text-sm border-b pb-2">
                        <p className="font-medium">{item.description || item.productName}</p>
                        <p className="text-gray-600">
                          {item.quantity} units × RM {item.unitPrice?.toFixed(2)} = RM {
                            ((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <p className="text-lg font-medium">
                    Total: RM {detailPO.totalAmount?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourcingDashboard;
