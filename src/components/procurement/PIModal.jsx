// src/components/procurement/PIModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag,
  Truck, AlertCircle, CheckSquare, Square,
  DollarSign, Upload, Link, Eye, Download,
  CreditCard, MessageSquare, Briefcase, AlertTriangle
} from 'lucide-react';

const PIModal = ({ proformaInvoice, suppliers, products, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    piNumber: '',
    supplierId: '',
    supplierName: '', // For extracted data without matched supplier
    projectCode: '',
    isPriority: false,  // Flag for urgent payment
    priorityReason: '',  // Optional reason for priority
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'draft',
    deliveryStatus: 'pending',
    purpose: 'stock',
    notes: '',
    attachments: [],
    etaDate: '',
    receivedDate: '',
    hasDiscrepancy: false,
    // Payment fields
    paymentTerms: '30% down payment, 70% before delivery',
    paymentStatus: 'pending',
    totalPaid: 0,
    payments: [],
    shareableId: '',
    // Financial details for extracted data
    currency: 'USD',
    exchangeRate: 1,
    subtotal: 0,
    discount: 0,
    shipping: 0,
    tax: 0,
    totalAmount: 0,
    // Banking details for international suppliers
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      swiftCode: '',
      iban: '',
      routingNumber: ''
    },
    // Additional extracted fields
    deliveryTerms: '',
    validity: ''
  });

  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details'); // details, receiving, payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    type: 'down-payment', // down-payment, balance, partial
    method: 'bank-transfer',
    reference: '',
    remark: '',
    attachments: []
  });

  useEffect(() => {
    if (proformaInvoice) {
      // Handle both manually created and AI-extracted PI data
      setFormData({
        piNumber: proformaInvoice.piNumber || '',
        supplierId: proformaInvoice.supplierId || '',
        supplierName: proformaInvoice.supplierName || '', // For extracted data without matched supplier
        projectCode: proformaInvoice.projectCode || '',
        isPriority: proformaInvoice.isPriority || false,
        priorityReason: proformaInvoice.priorityReason || '',
        date: proformaInvoice.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        
        // Ensure items/products array has proper structure
        items: (proformaInvoice.items || proformaInvoice.products || []).map(item => ({
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          productCode: item.productCode || '',
          productName: item.productName || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
          received: item.received || false,
          receivedQty: item.receivedQty || 0,
          receivedDate: item.receivedDate || '',
          hasDiscrepancy: item.hasDiscrepancy || false,
          discrepancyReason: item.discrepancyReason || '',
          leadTime: item.leadTime || '',
          warranty: item.warranty || '',
          notes: item.notes || ''
        })),
        
        status: proformaInvoice.status || 'draft',
        deliveryStatus: proformaInvoice.deliveryStatus || 'pending',
        purpose: proformaInvoice.purpose || 'stock',
        notes: proformaInvoice.notes || '',
        specialInstructions: proformaInvoice.specialInstructions || '',
        attachments: proformaInvoice.attachments || [],
        etaDate: proformaInvoice.etaDate?.split('T')[0] || '',
        receivedDate: proformaInvoice.receivedDate?.split('T')[0] || '',
        hasDiscrepancy: proformaInvoice.hasDiscrepancy || false,
        
        // Payment fields
        paymentTerms: proformaInvoice.paymentTerms || '30% down payment, 70% before delivery',
        paymentStatus: proformaInvoice.paymentStatus || 'pending',
        totalPaid: proformaInvoice.totalPaid || 0,
        payments: proformaInvoice.payments || [],
        
        // Financial details for extracted data
        currency: proformaInvoice.currency || 'USD',
        exchangeRate: proformaInvoice.exchangeRate || 1,
        subtotal: proformaInvoice.subtotal || 0,
        discount: proformaInvoice.discount || 0,
        shipping: proformaInvoice.shipping || 0,
        tax: proformaInvoice.tax || 0,
        totalAmount: proformaInvoice.totalAmount || proformaInvoice.grandTotal || 0,
        
        // Banking details for international suppliers
        bankDetails: proformaInvoice.bankDetails || {
          bankName: '',
          accountNumber: '',
          accountName: '',
          swiftCode: '',
          iban: '',
          routingNumber: ''
        },
        
        // Additional extracted fields
        deliveryTerms: proformaInvoice.deliveryTerms || '',
        validity: proformaInvoice.validity || '',
        
        shareableId: proformaInvoice.shareableId || generateShareableId()
      });
      
      // Initialize items with receiving data
      const itemsWithReceiving = (proformaInvoice.items || []).map(item => ({
        ...item,
        id: item.id || `item-${Date.now()}-${Math.random()}`,
        received: item.received || false,
        receivedQty: item.receivedQty || 0,
        receivedDate: item.receivedDate || '',
        hasDiscrepancy: item.hasDiscrepancy || false,
        discrepancyReason: item.discrepancyReason || ''
      }));
      
      setSelectedProducts(itemsWithReceiving);
      
      // Show supplier suggestion if extracted but not matched
      if (proformaInvoice.supplierName && !proformaInvoice.supplierId) {
        setErrors(prev => ({
          ...prev,
          supplier: `Supplier "${proformaInvoice.supplierName}" not found. Please select from the list or create a new supplier.`
        }));
      }
    } else {
      // Generate PI number and shareable ID
      const date = new Date();
      const piNumber = `PI-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const shareableId = generateShareableId();
      setFormData(prev => ({ ...prev, piNumber, shareableId }));
    }
  }, [proformaInvoice]);

  const generateShareableId = () => {
    return `pi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateShareableLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/pi/view/${formData.shareableId}`;
  };

  const copyShareableLink = () => {
    const link = generateShareableLink();
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.piNumber) newErrors.piNumber = 'PI Number is required';
    if (!formData.supplierId) newErrors.supplierId = 'Supplier is required';
    if (!formData.date) newErrors.date = 'Date is required';
    if (selectedProducts.length === 0) newErrors.items = 'At least one item is required';
    
    selectedProducts.forEach((item, index) => {
      if (!item.quantity || item.quantity <= 0) {
        newErrors[`quantity-${index}`] = 'Valid quantity required';
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        newErrors[`price-${index}`] = 'Valid price required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const totalAmount = selectedProducts.reduce((sum, item) => sum + item.totalPrice, 0);
    
    // Check for discrepancies
    const hasDiscrepancy = selectedProducts.some(item => 
      item.receivedQty > 0 && item.receivedQty !== item.quantity
    );
    
    // Calculate payment status
    const totalPaid = formData.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    let paymentStatus = 'pending';
    if (totalPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }
    
    onSave({
      ...formData,
      items: selectedProducts,
      totalAmount,
      hasDiscrepancy,
      totalPaid,
      paymentStatus
    });
  };

  const handleAddPayment = () => {
    setShowPaymentModal(true);
  };

  const handleSavePayment = () => {
    if (!newPayment.amount || newPayment.amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const payment = {
      ...newPayment,
      id: `payment-${Date.now()}`,
      amount: parseFloat(newPayment.amount),
      createdAt: new Date().toISOString()
    };

    setFormData(prev => ({
      ...prev,
      payments: [...(prev.payments || []), payment]
    }));

    setShowPaymentModal(false);
    setNewPayment({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      type: 'down-payment',
      method: 'bank-transfer',
      reference: '',
      remark: '',
      attachments: []
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In a real app, this would upload to a server
      // For demo, we'll create a fake URL
      const fakeUrl = URL.createObjectURL(file);
      setNewPayment(prev => ({
        ...prev,
        attachments: [...prev.attachments, {
          name: file.name,
          url: fakeUrl,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        }]
      }));
    }
  };

  const handleAddProduct = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === product.id);
    
    if (existingIndex >= 0) {
      // Update quantity if product already exists
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalPrice = updated[existingIndex].quantity * updated[existingIndex].unitPrice;
      setSelectedProducts(updated);
    } else {
      // Add new product
      setSelectedProducts([
        ...selectedProducts,
        {
          productId: product.id,
          productName: product.name,
          productCode: product.sku || product.code,
          quantity: 1,
          unitPrice: product.price || 0,
          totalPrice: product.price || 0,
          notes: '',
          receivedQty: 0,
          isReceived: false,
          receivingNotes: '',
          allocations: []
        }
      ]);
    }
    
    setSearchProduct('');
    setShowProductSearch(false);
  };

  const handleUpdateItem = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index][field] = value;
    
    // Recalculate total if quantity or price changed
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
    }
    
    // Check if item is fully received
    if (field === 'receivedQty') {
      updated[index].isReceived = value >= updated[index].quantity;
    }
    
    setSelectedProducts(updated);
  };

  const handleToggleReceived = (index) => {
    const updated = [...selectedProducts];
    updated[index].isReceived = !updated[index].isReceived;
    
    // If marking as received, set received qty to ordered qty
    if (updated[index].isReceived) {
      updated[index].receivedQty = updated[index].quantity;
    }
    
    setSelectedProducts(updated);
  };

  const handleRemoveItem = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const filteredProducts = products.filter(product => {
    const matchesSupplier = formData.supplierId ? product.supplierId === formData.supplierId : true;
    const matchesSearch = product.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchProduct.toLowerCase());
    return matchesSupplier && matchesSearch;
  });

  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);
  const totalAmount = selectedProducts.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalReceived = selectedProducts.reduce((sum, item) => sum + (item.receivedQty || 0), 0);
  const totalOrdered = selectedProducts.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const totalPaid = formData.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
  const paymentProgress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {proformaInvoice ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}
            </h2>
            <div className="flex items-center gap-2">
              {proformaInvoice && (
                <button
                  onClick={copyShareableLink}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Copy shareable link"
                >
                  <Link size={20} />
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs for Edit Mode */}
        {proformaInvoice && (
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'details' 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                PI Details
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'payment' 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Payment
                {formData.paymentStatus === 'partial' && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                    {paymentProgress.toFixed(0)}%
                  </span>
                )}
                {formData.paymentStatus === 'paid' && (
                  <CheckSquare className="inline-block ml-2 h-4 w-4 text-green-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('receiving')}
                className={`px-6 py-3 font-medium ${
                  activeTab === 'receiving' 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stock Receiving
                {formData.hasDiscrepancy && (
                  <AlertCircle className="inline-block ml-2 h-4 w-4 text-orange-500" />
                )}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {activeTab === 'details' ? (
            <>
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PI Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.piNumber}
                    onChange={(e) => setFormData({ ...formData, piNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.piNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="PI-20240109-001"
                  />
                  {errors.piNumber && <p className="text-red-500 text-xs mt-1">{errors.piNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.supplierId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>}
                  
                  {formData.supplierName && !formData.supplierId && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                      <p className="text-yellow-800">
                        Extracted supplier: <strong>{formData.supplierName}</strong>
                      </p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Please select the correct supplier from the dropdown or create a new one.
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Code
                    <span className="ml-1 text-xs text-gray-500">(For quotation system integration)</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.projectCode}
                      onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., PROJ-2025-001"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="stock">Stock</option>
                    <option value="r&d">R&D</option>
                    <option value="client-order">Client Order</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 30% down payment, 70% before delivery"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Priority
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPriority}
                        onChange={(e) => setFormData({ ...formData, isPriority: e.target.checked })}
                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                      />
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${formData.isPriority ? 'text-red-600' : 'text-gray-400'}`} />
                        <span className="font-medium">Flag as Priority Payment</span>
                        <span className="text-xs text-gray-500">(Finance team will be alerted)</span>
                      </div>
                    </label>
                    
                    {formData.isPriority && (
                      <input
                        type="text"
                        value={formData.priorityReason}
                        onChange={(e) => setFormData({ ...formData, priorityReason: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Bank name"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">Account Number</label>
                      <input
                        type="text"
                        value={formData.bankDetails?.accountNumber || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: { ...prev.bankDetails, accountNumber: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Account number"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">SWIFT Code</label>
                      <input
                        type="text"
                        value={formData.bankDetails?.swiftCode || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: { ...prev.bankDetails, swiftCode: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="SWIFT code"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 mb-1">IBAN</label>
                      <input
                        type="text"
                        value={formData.bankDetails?.iban || ''}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          bankDetails: { ...prev.bankDetails, iban: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="IBAN (if applicable)"
                      />
                    </div>
                  </div>
                </div>
              )}2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="Reason for priority (e.g., Cashflow improvement, Urgent delivery needed)"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Status
                  </label>
                  <select
                    value={formData.deliveryStatus}
                    onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="partial">Partial Delivery</option>
                  </select>
                </div>

                {/* ETA Date - Show when in-transit */}
                {formData.deliveryStatus === 'in-transit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ETA Date
                    </label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={formData.etaDate}
                        onChange={(e) => setFormData({ ...formData, etaDate: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                )}

                {/* Received Date - Show when delivered */}
                {(formData.deliveryStatus === 'delivered' || formData.deliveryStatus === 'partial') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Received Date
                    </label>
                    <input
                      type="date"
                      value={formData.receivedDate}
                      onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {/* Currency and Exchange Rate for extracted data */}
              {formData.currency && formData.currency !== 'MYR' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Exchange Rate
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.exchangeRate}
                      onChange={(e) => setFormData({ ...formData, exchangeRate: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Banking details section (if international supplier) */}
              {formData.currency !== 'MYR' && (
  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
    <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
      <CreditCard size={16} />
      Banking Details (International Payment)
    </h4>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <label className="block text-gray-600 mb-1">Bank Name</label>
        <input
          type="text"
          value={formData.bankDetails?.bankName || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            bankDetails: { ...prev.bankDetails, bankName: e.target.value }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Bank name"
        />
      </div>
      <div>
        <label className="block text-gray-600 mb-1">Account Number</label>
        <input
          type="text"
          value={formData.bankDetails?.accountNumber || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            bankDetails: { ...prev.bankDetails, accountNumber: e.target.value }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="Account number"
        />
      </div>
      <div>
        <label className="block text-gray-600 mb-1">SWIFT Code</label>
        <input
          type="text"
          value={formData.bankDetails?.swiftCode || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            bankDetails: { ...prev.bankDetails, swiftCode: e.target.value }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="SWIFT code"
        />
      </div>
      <div>
        <label className="block text-gray-600 mb-1">IBAN</label>
        <input
          type="text"
          value={formData.bankDetails?.iban || ''}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            bankDetails: { ...prev.bankDetails, iban: e.target.value }
          }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          placeholder="IBAN (if applicable)"
        />
      </div>
    </div>
  </div>
)}
