// src/components/purchase-orders/PurchaseOrders.jsx
import React, { useState } from 'react';
import { Search, Plus, Package, Calendar, DollarSign, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import POCard from './POCard';
import POModal from './POModal';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { usePermissions } from '../../hooks/usePermissions';
import AIExtractionService from '../../services/ai/AIExtractionService';
import { generatePONumber } from '../../utils/poHelpers';

const PurchaseOrders = () => {
  const {
    purchaseOrders,
    loading,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder
  } = usePurchaseOrders();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showUploadArea, setShowUploadArea] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [notification, setNotification] = useState(null);

  const permissions = usePermissions();

  const handleEdit = (po) => {
    setSelectedPO(po);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      await deletePurchaseOrder(id);
    }
  };

  const handleSave = async (data) => {
    if (selectedPO) {
      await updatePurchaseOrder(selectedPO.id, data);
    } else {
      await addPurchaseOrder(data);
    }
    setShowModal(false);
    setSelectedPO(null);
  };

  // AI Extraction Handler
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      try {
        console.log('Processing file:', file.name);
        setExtracting(true);
        setNotification({ type: 'info', message: `Extracting data from ${file.name}...` });
        
        // Call AI extraction
        const result = await AIExtractionService.extractFromFile(file);
        
        if (result.success) {
          console.log('Extraction successful:', result);
          
          // Check document type
          if (result.data.documentType === 'client_purchase_order') {
            // This is a client PO (like PTP)
            console.log('Client PO detected:', result.data.poNumber);
            
            // Create PO from extracted data
            const newPO = {
              poNumber: result.data.poNumber || generatePONumber(),
              clientName: result.data.client?.name || '',
              clientAddress: result.data.client?.address || '',
              orderDate: result.data.orderDate || new Date().toISOString().split('T')[0],
              deliveryDate: result.data.deliveryDate || '',
              status: 'draft',
              items: result.data.items?.map(item => ({
                productCode: item.partNumber || '',
                productName: item.description || '',
                quantity: item.quantity || 0,
                unitPrice: item.unitPrice || 0,
                totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
                // Include supplier matches for visibility
                supplierMatches: item.supplierMatches || []
              })) || [],
              totalAmount: result.data.totalAmount || 0,
              paymentTerms: result.data.paymentTerms || '',
              deliveryTerms: result.data.deliveryTerms || '',
              notes: `Extracted from ${file.name}. PR Numbers: ${result.data.prNumbers?.join(', ') || 'None'}`,
              attachments: [file.name],
              
              // Add sourcing plan
              sourcingPlan: result.data.sourcingPlan,
              
              // Store extraction metadata
              extractionMetadata: {
                fileName: file.name,
                extractedAt: new Date().toISOString(),
                confidence: result.confidence,
                documentType: result.data.documentType
              }
            };
            
            // Show extracted data in modal for review
            setSelectedPO(newPO);
            setShowModal(true);
            setShowUploadArea(false);
            
            setNotification({ 
              type: 'success', 
              message: `Successfully extracted PO ${result.data.poNumber}. ${result.data.sourcingPlan?.matchedItems || 0} of ${result.data.items?.length || 0} items matched with suppliers.` 
            });
            
          } else if (result.data.documentType === 'supplier_proforma') {
            // This is a supplier PI
            console.log('Supplier PI detected:', result.data.piNumber);
            
            setNotification({ 
              type: 'info', 
              message: `Supplier quotation detected from ${result.data.supplier?.name}. This should be processed in the Proforma Invoice module.` 
            });
            
          } else {
            // Unknown document type
            setNotification({ 
              type: 'warning', 
              message: 'Document type not recognized. Please review the extracted data.' 
            });
          }
          
        } else {
          console.error('Extraction failed:', result.error);
          setNotification({ 
            type: 'error', 
            message: `Failed to extract data: ${result.error}` 
          });
        }
        
      } catch (error) {
        console.error('Error processing file:', error);
        setNotification({ 
          type: 'error', 
          message: `Error processing ${file.name}: ${error.message}` 
        });
      } finally {
        setExtracting(false);
      }
    }
    
    // Reset file input
    e.target.value = '';
  };

  // Filter logic
  const filteredOrders = purchaseOrders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.items?.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const orderDate = new Date(order.orderDate);
      const now = new Date();
      const daysDiff = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
      
      if (dateFilter === 'today') matchesDate = daysDiff === 0;
      else if (dateFilter === 'week') matchesDate = daysDiff <= 7;
      else if (dateFilter === 'month') matchesDate = daysDiff <= 30;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate summary stats
  const totalValue = filteredOrders.reduce((sum, order) => 
    sum + (order.items?.reduce((itemSum, item) => itemSum + (item.totalPrice || 0), 0) || 0), 0
  );
  const activeOrders = filteredOrders.filter(order => 
    ['confirmed', 'processing'].includes(order.status)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Orders</h1>
          <p className="text-base text-gray-500">Manage client purchase orders and track fulfillment</p>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded-lg flex items-start ${
            notification.type === 'success' ? 'bg-green-50 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 text-red-800' :
            notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
            'bg-blue-50 text-blue-800'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" /> :
             notification.type === 'error' ? <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" /> :
             <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />}
            <div className="flex-1">
              <p>{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Upload Area (Toggle) */}
        {showUploadArea && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Upload client purchase orders (PDF, Excel, or Images)
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileUpload}
                disabled={extracting}
                id="po-file-upload"
              />
              <label
                htmlFor="po-file-upload"
                className={`inline-block px-4 py-2 rounded-lg cursor-pointer ${
                  extracting 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {extracting ? 'Extracting...' : 'Select Files'}
              </label>
              <button
                onClick={() => setShowUploadArea(false)}
                className="ml-2 px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
              </div>
              <Package className="h-10 w-10 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold">{activeOrders}</p>
              </div>
              <Calendar className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold">RM {totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search by PO number, client name, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
              {permissions.canEditPurchaseOrders && (
                <>
                  <button
                    onClick={() => setShowUploadArea(!showUploadArea)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Upload size={20} />
                    Upload PO
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPO(null);
                      setShowModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add New
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading purchase orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-600">No purchase orders found</p>
            {permissions.canEditPurchaseOrders && (
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => {
                    setSelectedPO(null);
                    setShowModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Manually
                </button>
                <button
                  onClick={() => setShowUploadArea(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Upload PO
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map(order => (
              <POCard
                key={order.id}
                purchaseOrder={order}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEdit={permissions.canEditPurchaseOrders}
                canDelete={permissions.isAdmin}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        <POModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedPO(null);
          }}
          onSave={handleSave}
          purchaseOrder={selectedPO}
        />
      </div>
    </div>
  );
};

export default PurchaseOrders;
