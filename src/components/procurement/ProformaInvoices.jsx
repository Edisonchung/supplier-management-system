// src/components/procurement/ProformaInvoices.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  Download, Eye, Edit, Trash2, Truck, Package,
  AlertCircle, Clock, CheckCircle, CreditCard,
  Grid, List, Briefcase, AlertTriangle, Upload, Loader2
} from 'lucide-react';
import { useProformaInvoices } from '../../hooks/useProformaInvoices';
import { usePermissions } from '../../hooks/usePermissions';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts } from '../../hooks/useProducts';
import { mockFirebase } from '../../services/firebase';
import AIExtractionService from '../../services/ai/AIExtractionService';
import PICard from './PICard';
import PIModal from './PIModal';

const ProformaInvoices = ({ showNotification }) => {
  const permissions = usePermissions();
  const { 
    proformaInvoices, 
    loading, 
    error,
    addProformaInvoice,
    updateProformaInvoice,
    deleteProformaInvoice,
    updateDeliveryStatus,
    getPendingDeliveries
  } = useProformaInvoices();
  
  const { suppliers } = useSuppliers();
  const { products } = useProducts();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedPI, setSelectedPI] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [groupByYear, setGroupByYear] = useState(true);
  
  // AI Extraction states
  const fileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);

  const canEdit = permissions.canEditPI || permissions.isAdmin;
  const canDelete = permissions.isAdmin;

  // Filter PIs based on search and filters
  const filteredPIs = proformaInvoices.filter(pi => {
    const supplier = suppliers.find(s => s.id === pi.supplierId);
    const matchesSearch = 
      pi.piNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pi.projectCode?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || pi.status === filterStatus;
    const matchesDelivery = filterDelivery === 'all' || pi.deliveryStatus === filterDelivery;
    const matchesPurpose = filterPurpose === 'all' || pi.purpose === filterPurpose;
    const matchesPriority = filterPriority === 'all' || 
      (filterPriority === 'high' && pi.isPriority) ||
      (filterPriority === 'normal' && !pi.isPriority);

    return matchesSearch && matchesStatus && matchesDelivery && matchesPurpose && matchesPriority;
  });

  // Group PIs by year - MOVED OUTSIDE OF FILTER
  const pisByYear = groupByYear ? filteredPIs.reduce((acc, pi) => {
    const year = new Date(pi.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(pi);
    return acc;
  }, {}) : { 'All': filteredPIs };

  // Sort years descending (newest first) - MOVED OUTSIDE OF FILTER
  const sortedYears = Object.keys(pisByYear).sort((a, b) => {
    if (a === 'All') return 1;
    if (b === 'All') return -1;
    return b - a;
  });

  // Find PO by number
  const findPOByNumber = async (poNumber) => {
    try {
      // First check in existing purchase orders
      const snapshot = await mockFirebase.firestore.collection('purchaseOrders').get();
      const purchaseOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      return purchaseOrders.find(po => 
        po.orderNumber === poNumber || 
        po.poNumber === poNumber
      );
    } catch (error) {
      console.error('Error finding PO:', error);
      return null;
    }
  };

  // Handle file upload for AI extraction - UPDATED VERSION
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setExtracting(true);
    try {
      console.log('Starting extraction for:', file.name);
      const result = await AIExtractionService.extractFromFile(file);
      console.log('Extraction result:', result);
      
      if (result.success) {
        const extractedData = result.data;
        
        // Handle both supplier_proforma and supplier_invoice document types
        if (extractedData.documentType === 'supplier_proforma' || 
            extractedData.documentType === 'supplier_invoice') {
          
          console.log('Mapping extracted data to form:', extractedData);
          
          // Find matching supplier by name if available
          let matchedSupplier = null;
          if (extractedData.supplier?.name) {
            matchedSupplier = suppliers.find(s => 
              s.name.toLowerCase().includes(extractedData.supplier.name.toLowerCase()) ||
              extractedData.supplier.name.toLowerCase().includes(s.name.toLowerCase())
            );
          }
          
          // Map extracted data to PI modal format
          const piData = {
            // Basic Information
            piNumber: extractedData.piNumber || extractedData.invoiceNumber || '',
            date: extractedData.date || new Date().toISOString().split('T')[0],
            etaDate: extractedData.validUntil || extractedData.expiryDate || '',
            
            // Supplier Information
            supplierId: matchedSupplier?.id || '',
            supplierName: extractedData.supplier?.name || '',
            supplierContact: extractedData.supplier?.contact || '',
            supplierEmail: extractedData.supplier?.email || '',
            supplierPhone: extractedData.supplier?.phone || '',
            
            // Client Reference
            projectCode: extractedData.clientRef?.poNumber || extractedData.projectCode || '',
            
            // Priority Flag
            isPriority: false,
            priorityReason: '',
            
            // Products/Items - ensure proper mapping
            items: (extractedData.products || extractedData.items || []).map((item, index) => ({
              id: `item-${Date.now()}-${index}`,
              productCode: item.productCode || item.partNumber || '',
              productName: item.productName || item.description || '',
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
              leadTime: item.leadTime || '',
              warranty: item.warranty || '',
              notes: item.notes || '',
              // Receiving tracking fields
              received: false,
              receivedQty: 0,
              receivedDate: '',
              hasDiscrepancy: false,
              discrepancyReason: ''
            })),
            
            // Financial Information
            currency: extractedData.currency || 'USD',
            exchangeRate: extractedData.exchangeRate || 1,
            subtotal: extractedData.subtotal || 0,
            discount: extractedData.discount || 0,
            shipping: extractedData.shipping || 0,
            tax: extractedData.tax || 0,
            totalAmount: extractedData.grandTotal || extractedData.totalAmount || 0,
            
            // Terms and Conditions
            paymentTerms: extractedData.paymentTerms || '30% down payment, 70% before delivery',
            deliveryTerms: extractedData.deliveryTerms || '',
            leadTime: extractedData.leadTime || '',
            warranty: extractedData.warranty || '',
            validity: extractedData.validity || '30 days',
            
            // Additional Information
            notes: extractedData.notes || '',
            specialInstructions: extractedData.specialInstructions || '',
            
            // Default values
            status: 'draft',
            deliveryStatus: 'pending',
            paymentStatus: 'pending',
            purpose: 'stock',
            
            // Banking details if available
            bankDetails: extractedData.bankDetails || {
              bankName: '',
              accountNumber: '',
              accountName: '',
              swiftCode: '',
              iban: '',
              bankAddress: ''
            }
          };
          
          // Calculate totals if not provided
          if (!piData.subtotal && piData.items.length > 0) {
            piData.subtotal = piData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
          }
          
          if (!piData.totalAmount) {
            piData.totalAmount = piData.subtotal + piData.shipping + piData.tax - piData.discount;
          }
          
          // Check for PO matches
          if (extractedData.clientRef?.poNumber) {
            try {
              const matchedPO = await findPOByNumber(extractedData.clientRef.poNumber);
              if (matchedPO) {
                showNotification(`Matched with PO: ${matchedPO.orderNumber}`, 'success');
                piData.linkedPO = matchedPO.id;
                piData.projectCode = matchedPO.orderNumber;
                piData.purpose = 'client-order';
              }
            } catch (error) {
              console.error('Error matching PO:', error);
            }
          }
          
          // Suggest supplier if not found
          if (!matchedSupplier && extractedData.supplier?.name) {
            showNotification(
              `Supplier "${extractedData.supplier.name}" not found. You can create it after saving the PI.`,
              'info'
            );
          }
          
          console.log('Setting PI data:', piData);
          setSelectedPI(piData);
          setShowModal(true);
          
          showNotification(
            `PI extracted successfully! ${result.confidence ? `(Confidence: ${(result.confidence * 100).toFixed(0)}%)` : ''}`,
            'success'
          );
        } else {
          throw new Error('Document type not supported. Expected Proforma Invoice.');
        }
      } else {
        throw new Error(result.error || 'Extraction failed');
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      showNotification(
        error.message || 'Failed to extract PI data. Please try again or enter manually.',
        'error'
      );
    } finally {
      setExtracting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler functions
  const handleAddPI = () => {
    setSelectedPI(null);
    setShowModal(true);
  };

  const handleEditPI = (pi) => {
    setSelectedPI(pi);
    setShowModal(true);
  };

  const handleDeletePI = async (id) => {
    if (window.confirm('Are you sure you want to delete this PI?')) {
      const result = await deleteProformaInvoice(id);
      if (result.success) {
        showNotification('Proforma Invoice deleted successfully', 'success');
      } else {
        showNotification('Failed to delete PI', 'error');
      }
    }
  };

  const handleUpdateDeliveryStatus = async (pi) => {
    const newStatus = prompt('Enter new delivery status (pending/in-transit/partial/delivered):', pi.deliveryStatus);
    if (newStatus && ['pending', 'in-transit', 'partial', 'delivered'].includes(newStatus)) {
      const result = await updateDeliveryStatus(pi.id, newStatus);
      if (result.success) {
        showNotification('Delivery status updated', 'success');
      } else {
        showNotification('Failed to update delivery status', 'error');
      }
    }
  };

  const handleSharePI = (pi) => {
    const shareUrl = `${window.location.origin}/pi/${pi.id}`;
    navigator.clipboard.writeText(shareUrl);
    showNotification('Share link copied to clipboard', 'success');
  };

  const handleSavePI = async (piData) => {
    const result = selectedPI
      ? await updateProformaInvoice(selectedPI.id, piData)
      : await addProformaInvoice(piData);

    if (result.success) {
      showNotification(
        selectedPI ? 'PI updated successfully' : 'PI created successfully',
        'success'
      );
      setShowModal(false);
    } else {
      showNotification('Failed to save PI', 'error');
    }
  };

  // Status color helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in-transit': return 'bg-blue-100 text-blue-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Proforma Invoices</h2>
          <p className="text-gray-600">Manage supplier quotations and track deliveries</p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
                disabled={extracting}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={extracting}
                className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-2 transition-colors"
              >
                {extracting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Upload PI
                  </>
                )}
              </button>
              <button
                onClick={handleAddPI}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Add PI
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total PIs</p>
              <p className="text-2xl font-bold">{proformaInvoices.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold">
                {proformaInvoices.filter(pi => pi.status === 'confirmed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Delivery</p>
              <p className="text-2xl font-bold">
                {proformaInvoices.filter(pi => pi.deliveryStatus === 'pending').length}
              </p>
            </div>
            <Truck className="h-8 w-8 text-orange-600" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Priority PIs</p>
              <p className="text-2xl font-bold">
                {proformaInvoices.filter(pi => pi.isPriority).length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by PI number, supplier, or project code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <Filter className="text-gray-400" size={20} />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
            
            <select
              value={filterDelivery}
              onChange={(e) => setFilterDelivery(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Delivery</option>
              <option value="pending">Pending</option>
              <option value="in-transit">In Transit</option>
              <option value="partial">Partial</option>
              <option value="delivered">Delivered</option>
            </select>
            
            <select
              value={filterPurpose}
              onChange={(e) => setFilterPurpose(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Purpose</option>
              <option value="stock">Stock</option>
              <option value="r&d">R&D</option>
              <option value="client-order">Client Order</option>
            </select>
            
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
            >
              <List size={20} />
            </button>
            
            <button
              onClick={() => setGroupByYear(!groupByYear)}
              className={`p-2 rounded ${groupByYear ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
              title="Group by Year"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* PI List/Grid */}
      {viewMode === 'grid' ? (
        <div className="space-y-8">
          {sortedYears.map(year => (
            <div key={year}>
              {groupByYear && (
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                  {year} ({pisByYear[year].length} PIs)
                </h3>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pisByYear[year]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(pi => (
                    <PICard
                      key={pi.id}
                      proformaInvoice={pi}
                      supplier={suppliers.find(s => s.id === pi.supplierId)}
                      onEdit={() => handleEditPI(pi)}
                      onDelete={() => handleDeletePI(pi.id)}
                      onUpdateDelivery={() => handleUpdateDeliveryStatus(pi)}
                      onShare={() => handleSharePI(pi)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PI Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedYears.map(year => (
                <React.Fragment key={year}>
                  {groupByYear && (
                    <tr className="bg-gray-50">
                      <td colSpan="10" className="px-6 py-3 text-sm font-semibold text-gray-900">
                        {year} - {pisByYear[year].length} Proforma Invoices
                      </td>
                    </tr>
                  )}
                  {pisByYear[year]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(pi => {
                      const supplier = suppliers.find(s => s.id === pi.supplierId);
                      return (
                        <tr key={pi.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pi.piNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {pi.projectCode || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {supplier?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(pi.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${pi.totalAmount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 capitalize">
                              {pi.purpose?.replace('-', ' ') || 'stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pi.status)}`}>
                              {pi.status}
                            </span>
                            {pi.isPriority && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle size={12} className="mr-1" />
                                Priority
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDeliveryColor(pi.deliveryStatus)}`}>
                              {pi.deliveryStatus}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentColor(pi.paymentStatus || 'pending')}`}>
                              {pi.paymentStatus || 'pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleSharePI(pi)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Share"
                              >
                                <Eye size={16} />
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleEditPI(pi)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDeletePI(pi.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {filteredPIs.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No proforma invoices found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' || filterDelivery !== 'all' || filterPurpose !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Get started by creating a new PI'}
          </p>
          {canEdit && !searchTerm && filterStatus === 'all' && filterDelivery === 'all' && filterPurpose === 'all' && (
            <div className="mt-6">
              <button
                onClick={handleAddPI}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Proforma Invoice
              </button>
            </div>
          )}
        </div>
      )}

      {/* PI Modal */}
      {showModal && (
        <PIModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSavePI}
          proformaInvoice={selectedPI}
          suppliers={suppliers}
          products={products}
        />
      )}
    </div>
  );
};

export default ProformaInvoices;
