// src/components/purchase-orders/PurchaseOrders.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { purchaseOrderService } from '../../services/purchaseOrderService';
import AIExtractionService from '../../services/ai/AIExtractionService';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  Upload,
  Loader2,
  Eye,
  Edit,
  Trash2,
  Download,
  Send,
  X,
  TrendingUp,
  Users,
  ShoppingCart,
  Building2
} from 'lucide-react';
import POModal from './POModal';
import { generatePONumber } from '../../utils/poHelpers';
import { toast } from 'react-hot-toast';
import { 
  useNotifications, 
  useLoadingStates, 
  SkeletonLoader, 
  RealtimeStatusIndicator,
  UserPresence 
} from '../common/LoadingFeedbackSystem';

// Simple date formatter
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
};

const PurchaseOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);
  const { showSuccess, showError, showWarning } = useNotifications();
  const { withLoading } = useLoadingStates();
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState('synced');
  const [activeUsers] = useState([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Sarah Chen' }
  ]);

  // Load purchase orders
  useEffect(() => {
    loadPurchaseOrders();
  }, [user]);

  const loadPurchaseOrders = async () => {
    if (!user) return;
    
    try {
      const data = await purchaseOrderService.getAll();
      setPurchaseOrders(data);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Handle file upload with document storage
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Prevent double processing
    if (extracting) {
      console.log('Already processing a file, ignoring...');
      return;
    }

    console.log('🔄 Processing PO file with document storage:', file.name);
    setExtracting(true);
    setUploadError(null);

    try {
      // ✅ USE STORAGE-ENABLED EXTRACTION INSTEAD OF BASIC EXTRACTION
      console.log('🎯 Calling extractPOWithStorage...');
      const result = await AIExtractionService.extractPOWithStorage(file);
      console.log('🎯 PO extraction with storage result:', result);

      if (result.success && result.data) {
        console.log('📄 PO data structure:', result.data);
        console.log('🗂️ Document storage info:', result.data.storageInfo);
        console.log('📁 Document ID:', result.data.documentId);
        
        // Create POModal-compatible structure
        let modalData;
        
        if (result.data.documentType === 'client_purchase_order') {
          modalData = {
            // ✅ ADD DOCUMENT STORAGE FIELDS
            documentId: result.data.documentId,
            documentNumber: result.data.documentNumber,
            documentType: 'po',
            hasStoredDocuments: result.data.hasStoredDocuments || false,
            storageInfo: result.data.storageInfo,
            originalFileName: result.data.originalFileName,
            
            // Generate new internal PO number
            poNumber: generatePONumber(),
            
            // Use client's original PO number
            clientPoNumber: result.data.clientPONumber || result.data.poNumber || '',
            projectCode: result.data.projectCode || result.data.clientPONumber || result.data.poNumber || '',

            // Extract client information
            clientName: result.data.clientName || result.data.client?.name || '',
            clientContact: result.data.clientContact || result.data.client?.contact || '',
            clientEmail: result.data.clientEmail || result.data.client?.email || '',
            clientPhone: result.data.clientPhone || result.data.client?.phone || '',
            
            // Handle dates
            orderDate: result.data.orderDate || new Date().toISOString().split('T')[0],
            requiredDate: result.data.deliveryDate || result.data.deliveryDate || '',
            
            // Terms
            paymentTerms: result.data.paymentTerms || 'Net 30',
            deliveryTerms: result.data.deliveryTerms || 'FOB',
            
            // Status and notes
            status: 'draft',
            notes: result.data.notes || '',
            
            // Items array - ensure it matches POModal's expected structure
            items: (result.data.items || []).map(item => ({
              productName: item.productName || item.description || '',
              productCode: item.productCode || item.partNumber || '',
              quantity: item.quantity || 0,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
              id: Date.now().toString() + Math.random()
            })),
            
            // Additional extracted data
            extractedData: result.data,
            prNumbers: result.data.prNumbers || [],
            
            // Sourcing plan if available
            sourcingPlan: result.data.sourcingPlan,
            matchingMetrics: result.data.matchingMetrics,
            
            // Client details
            clientDetails: {
              name: result.data.client?.name || '',
              registration: result.data.client?.registration || '',
              address: result.data.client?.address || '',
              shipTo: result.data.client?.shipTo || ''
            }
          };
          
          console.log('✅ Modal data prepared with document storage:', {
            documentId: modalData.documentId,
            hasStoredDocuments: modalData.hasStoredDocuments,
            storageInfo: modalData.storageInfo
          });
          
          // Set the modal data and open it
          setCurrentPO(modalData);
          setModalOpen(true);
          
          // Show success message with document storage confirmation
          if (result.data.sourcingPlan && result.data.matchingMetrics) {
            const metrics = result.data.matchingMetrics;
            toast.success(
              `Successfully extracted PO: ${modalData.poNumber}\n` +
              `📁 Documents stored! Found ${metrics.supplierDiversity} suppliers! ` +
              `Potential savings: $${metrics.potentialSavings?.toFixed(2) || '0.00'}`,
              { duration: 5000 }
            );
          } else {
            toast.success(`✅ Successfully extracted PO: ${modalData.poNumber} - Documents stored in Firebase!`);
          }
          
        } else if (result.data.documentType === 'supplier_proforma') {
          // Handle supplier PI differently
          toast.info('Supplier Proforma Invoice detected. This feature is coming soon.');
          console.log('Supplier PI data:', result.data);
          
        } else {
          toast.warning('Unknown document type. Please check the extraction results.');
          console.log('Unknown document data:', result.data);
        }
        
      } else {
        throw new Error(result.error || 'Extraction failed');
      }
    } catch (error) {
      console.error('❌ PO extraction with storage failed:', error);
      setUploadError(error.message);
      toast.error('Failed to extract PO: ' + error.message);
    } finally {
      setExtracting(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Handle manual PO creation
  const handleCreatePO = () => {
    setCurrentPO({
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      clientPoNumber: '',
      clientName: '',
      clientContact: '',
      clientEmail: '',
      clientPhone: '',
      orderDate: new Date().toISOString().split('T')[0],
      requiredDate: '',
      paymentTerms: 'Net 30',
      deliveryTerms: 'FOB',
      status: 'draft',
      notes: '',
      items: []
    });
    setModalOpen(true);
  };

  // ✅ ENHANCED: Handle PO save with document field preservation
  const handleSavePO = async (poData) => {
    try {
      await withLoading(async () => {
        // ✅ ENSURE DOCUMENT FIELDS ARE PRESERVED
        console.log('💾 Saving PO with document fields:', {
          documentId: poData.documentId,
          hasStoredDocuments: poData.hasStoredDocuments,
          originalFileName: poData.originalFileName
        });
        
        if (poData.id) {
          await purchaseOrderService.update(poData.id, poData);
          showSuccess(
            'Purchase Order Updated',
            `PO ${poData.poNumber} has been updated successfully.`
          );
        } else {
          await purchaseOrderService.create(poData);
          showSuccess(
            'Purchase Order Created', 
            `PO ${poData.poNumber} has been created successfully with document storage.`
          );
        }
        
        setLastSyncTime(new Date());
        loadPurchaseOrders();
      }, {
        title: poData.id ? 'Updating Purchase Order...' : 'Creating Purchase Order...',
        message: 'Please wait while we save your changes.'
      });
      
      setModalOpen(false);
    } catch (error) {
      console.error('Error saving PO:', error);
      showError(
        'Save Failed',
        'Unable to save purchase order. Please check your connection and try again.',
        {
          actions: [
            {
              label: 'Retry',
              onClick: () => handleSavePO(poData)
            }
          ]
        }
      );
    }
  };

  // Handle PO deletion
  const handleDeletePO = async (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    
    showWarning(
      'Delete Purchase Order',
      `Are you sure you want to delete PO ${po?.poNumber || po?.orderNumber}? This action cannot be undone.`,
      {
        persistent: true,
        actions: [
          {
            label: 'Delete',
            onClick: async () => {
              try {
                await withLoading(async () => {
                  await purchaseOrderService.delete(poId);
                  loadPurchaseOrders();
                  showSuccess('Deleted', `PO ${po?.poNumber || po?.orderNumber} has been deleted.`);
                }, {
                  title: 'Deleting Purchase Order...'
                });
              } catch (error) {
                console.error('Error deleting PO:', error);
                showError('Delete Failed', 'Unable to delete purchase order.');
              }
            }
          },
          {
            label: 'Cancel',
            onClick: () => {} // Will auto-close notification
          }
        ]
      }
    );
  };

  // Navigate to supplier matching page
  const handleViewSupplierMatching = (po) => {
    navigate(`/purchase-orders/${po.id}/supplier-matching`);
  };

  // Filter purchase orders
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.projectCode?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      po.clientPoNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(po => po.status === 'draft').length,
    sent: purchaseOrders.filter(po => po.status === 'sent').length,
    confirmed: purchaseOrders.filter(po => po.status === 'confirmed').length,
    totalValue: purchaseOrders.reduce((sum, po) => sum + (po.total || po.totalAmount || 0), 0)
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      cancelled: { color: 'bg-red-100 text-red-800', icon: X }
    };
    
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Add debug effect to track modal state
  useEffect(() => {
    console.log('Modal state changed:', { modalOpen, currentPO });
  }, [modalOpen, currentPO]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <SkeletonLoader type="form" />
          </div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <SkeletonLoader type="table-row" count={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Real-time Status */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
              <div className="mt-1 flex items-center space-x-4">
                <p className="text-sm text-gray-500">
                  Manage your purchase orders with AI extraction and document storage
                </p>
                <RealtimeStatusIndicator 
                  status={syncStatus} 
                  lastUpdated={lastSyncTime}
                />
                <UserPresence users={activeUsers} />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => !extracting && fileInputRef.current?.click()}
                disabled={extracting}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {extracting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing & Storing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload PO
                  </>
                )}
              </button>
              <button
                onClick={handleCreatePO}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create PO
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="mt-1 text-sm text-red-700">{uploadError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total POs</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Draft</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.draft}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Confirmed</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.confirmed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Value</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    RM {stats.totalValue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search PO number, project code, or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex space-x-6">
              <span className="text-gray-500">
                Total: <span className="font-medium text-gray-900">{stats.total}</span>
              </span>
              <span className="text-gray-500">
                Draft: <span className="font-medium text-yellow-600">{stats.draft}</span>
              </span>
              <span className="text-gray-500">
                Confirmed: <span className="font-medium text-green-600">{stats.confirmed}</span>
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Last update: {lastSyncTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500">No purchase orders found</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Upload a PO or create a new one to get started
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    {/* PO NUMBER */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {po.orderNumber || po.poNumber}
                        {/* ✅ NEW: Show document storage indicator */}
                        {po.hasStoredDocuments && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Documents stored in Firebase">
                            📁
                          </span>
                        )}
                      </div>
                    </td>

                    {/* PROJECT CODE */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.projectCode ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono">
                          {po.projectCode}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* CLIENT */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.client || po.clientName || '-'}
                    </td>

                    {/* ORDER DATE */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(po.orderDate)}
                    </td>

                    {/* DELIVERY DATE */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(po.deliveryDate || po.requiredDate)}
                    </td>

                    {/* ITEMS */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-1" />
                        {po.items?.length || 0}
                      </div>
                    </td>

                    {/* TOTAL */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RM {(po.total || po.totalAmount || 0).toLocaleString()}
                    </td>

                    {/* STATUS */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(po.status)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewSupplierMatching(po)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View supplier matching analysis"
                        >
                          <Building2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPO(po);
                            setModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-gray-500 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPO(po);
                            setModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-gray-500 transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePO(po.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Modal */}
      <POModal
        isOpen={modalOpen}
        onClose={() => {
          console.log('Closing modal');
          setModalOpen(false);
        }}
        editingPO={currentPO}
        onSave={handleSavePO}
      />
    </div>
  );
};

export default PurchaseOrders;
