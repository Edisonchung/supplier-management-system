// src/components/procurement/PIModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag,
  Truck, AlertCircle, CheckSquare, Square,
  DollarSign, Upload, Link, Eye, Download,
  CreditCard, MessageSquare, Briefcase, AlertTriangle,
  Building2, Mail, Phone, MapPin, User, Loader2,
  ChevronDown, Check
} from 'lucide-react';

// ✅ ADD THE AUTO-FIX FUNCTION HERE - RIGHT AFTER IMPORTS
const autoFixPriceCalculations = (items) => {
  return items.map((item, index) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const calculatedTotal = quantity * unitPrice;
    const currentTotal = parseFloat(item.totalPrice) || 0;
    
    // If there's a significant difference (more than 0.01), use calculated value
    const difference = Math.abs(calculatedTotal - currentTotal);
    if (difference > 0.01) {
      console.log(`Item ${index + 1}: Fixing price calculation ${currentTotal} → ${calculatedTotal}`);
      return {
        ...item,
        totalPrice: calculatedTotal
      };
    }
    
    return item;
  });
};

const PIModal = ({ proformaInvoice, suppliers, products, onSave, onClose, addSupplier, showNotification }) => {
  console.log('=== PIModal Props Debug ===');
  console.log('proformaInvoice:', proformaInvoice ? 'Present' : 'Missing');
  console.log('suppliers:', suppliers ? `Array with ${suppliers.length} items` : 'Missing');
  console.log('products:', products ? `Array with ${products.length} items` : 'Missing');
  console.log('onSave:', typeof onSave, onSave ? 'Present' : 'Missing');
  console.log('onClose:', typeof onClose, onClose ? 'Present' : 'Missing');
  console.log('addSupplier:', typeof addSupplier, addSupplier ? 'Present' : 'Missing');
  console.log('showNotification:', typeof showNotification, showNotification ? 'Present' : 'Missing');
  console.log('=== End Props Debug ===');
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

  // ✅ ADD THIS FUNCTION HERE - AFTER STATE DECLARATIONS
  const handleFixAllPrices = () => {
    const fixedProducts = autoFixPriceCalculations(selectedProducts);
    setSelectedProducts(fixedProducts);
    
    // Recalculate totals
    const itemsSubtotal = fixedProducts.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    setFormData(prev => ({
      ...prev,
      subtotal: itemsSubtotal,
      totalAmount: itemsSubtotal + (prev.shipping || 0) + (prev.tax || 0) - (prev.discount || 0)
    }));
    
    showNotification?.('Price calculations fixed!', 'success');
  };


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

  // Supplier creation states
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    status: 'active'
  });
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [supplierErrors, setSupplierErrors] = useState({});

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier => {
  const supplierName = supplier.name || '';
  const supplierEmail = supplier.email || '';
  const searchTerm = supplierSearchTerm || '';
  
  return supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
         supplierEmail.toLowerCase().includes(searchTerm.toLowerCase());
});

  // Get selected supplier details
  const selectedSupplier = suppliers.find(s => s.id === formData.supplierId);

  useEffect(() => {
    if (proformaInvoice) {
      console.log('PIModal received data:', proformaInvoice);
      
      // Handle both manually created and AI-extracted PI data
      setFormData({
        piNumber: proformaInvoice.piNumber || proformaInvoice.invoiceNumber || generatePINumber(),
        supplierId: proformaInvoice.supplierId || '',
        supplierName: proformaInvoice.supplierName || '', // For extracted data without matched supplier
        projectCode: proformaInvoice.projectCode || proformaInvoice.clientRef || '',
        isPriority: proformaInvoice.isPriority || false,
        priorityReason: proformaInvoice.priorityReason || '',
        date: proformaInvoice.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        
        // Don't set items array here - handle separately below
        
        status: proformaInvoice.status || 'draft',
        deliveryStatus: proformaInvoice.deliveryStatus || 'pending',
        purpose: proformaInvoice.purpose || 'stock',
        notes: proformaInvoice.notes || '',
        specialInstructions: proformaInvoice.specialInstructions || '',
        attachments: proformaInvoice.attachments || [],
        etaDate: proformaInvoice.etaDate?.split('T')[0] || proformaInvoice.validUntil?.split('T')[0] || '',
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
      
      // Handle items/products array separately to ensure proper structure
      const items = proformaInvoice.items || proformaInvoice.products || [];
      console.log('Processing items:', items);

      
     let itemsWithIds = items.map((item, index) => ({
  id: item.id || `item-${Date.now()}-${index}`,
  productCode: item.productCode || item.partNumber || '',
  productName: item.productName || item.description || '',
  quantity: parseInt(item.quantity) || 1,
  unitPrice: parseFloat(item.unitPrice) || 0,
  totalPrice: parseFloat(item.totalPrice) || (parseInt(item.quantity || 1) * parseFloat(item.unitPrice || 0)),
  leadTime: item.leadTime || '',
  warranty: item.warranty || '',
  notes: item.notes || '',
        // Receiving tracking fields
        received: item.received || false,
        receivedQty: item.receivedQty || 0,
        receivedDate: item.receivedDate || '',
        hasDiscrepancy: item.hasDiscrepancy || false,
        discrepancyReason: item.discrepancyReason || '',
        receivingNotes: item.receivingNotes || ''
      }));

     // ✅ Auto-fix price calculations
      itemsWithIds = autoFixPriceCalculations(itemsWithIds);
      
      setSelectedProducts(itemsWithIds);
      console.log('Set selected products:', itemsWithIds);
      
      // ✅ Recalculate totals after fixing prices
      const itemsSubtotal = itemsWithIds.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
      setFormData(prev => ({
        ...prev,
        subtotal: itemsSubtotal,
        totalAmount: itemsSubtotal + (parseFloat(prev.shipping) || 0) + (parseFloat(prev.tax) || 0) - (parseFloat(prev.discount) || 0)
      }));
      // Pre-populate supplier creation form if supplier data is extracted but not matched
      if (proformaInvoice.supplier && !proformaInvoice.supplierId) {
        const supplierInfo = proformaInvoice.supplier;
        setNewSupplierData({
          name: supplierInfo.name || proformaInvoice.supplierName || '',
          email: supplierInfo.email || '',
          phone: supplierInfo.phone || supplierInfo.mobile || '',
          address: supplierInfo.address || '',
          contactPerson: supplierInfo.contact || '',
          status: 'active'
        });
        
        // Set search term to the extracted supplier name
        setSupplierSearchTerm(supplierInfo.name || proformaInvoice.supplierName || '');
        
        // Show error message suggesting to create supplier
        if (supplierInfo.name || proformaInvoice.supplierName) {
          setErrors(prev => ({
            ...prev,
            supplier: `Supplier "${supplierInfo.name || proformaInvoice.supplierName}" not found. Please select an existing supplier or create a new one.`
          }));
        }
      } else if (proformaInvoice.supplierName && !proformaInvoice.supplierId) {
        // Handle case where only supplier name is extracted
        setNewSupplierData(prev => ({
          ...prev,
          name: proformaInvoice.supplierName
        }));
        setSupplierSearchTerm(proformaInvoice.supplierName);
        setErrors(prev => ({
          ...prev,
          supplier: `Supplier "${proformaInvoice.supplierName}" not found. Please select an existing supplier or create a new one.`
        }));
      }
      
      // If we have extracted supplier info but no match, show it in notes
      if (proformaInvoice.supplier && !proformaInvoice.supplierId) {
        const supplierInfo = proformaInvoice.supplier;
        const supplierDetails = [];
        if (supplierInfo.name) supplierDetails.push(`Supplier: ${supplierInfo.name}`);
        if (supplierInfo.contact) supplierDetails.push(`Contact: ${supplierInfo.contact}`);
        if (supplierInfo.email) supplierDetails.push(`Email: ${supplierInfo.email}`);
        if (supplierInfo.phone) supplierDetails.push(`Phone: ${supplierInfo.phone}`);
        
        if (supplierDetails.length > 0) {
          setFormData(prev => ({
            ...prev,
            notes: prev.notes ? `${prev.notes}\n\nExtracted Supplier Info:\n${supplierDetails.join('\n')}` : `Extracted Supplier Info:\n${supplierDetails.join('\n')}`
          }));
        }
      }
    } else {
      // Generate new PI number for new invoices
      const piNumber = generatePINumber();
      const shareableId = generateShareableId();
      setFormData(prev => ({ 
        ...prev, 
        piNumber, 
        shareableId,
        date: new Date().toISOString().split('T')[0]
      }));
    }
  }, [proformaInvoice]);

  // ADD THIS ENTIRE useEffect HERE
  useEffect(() => {
    const itemsTotal = (selectedProducts || []).reduce((sum, item) => {
      return sum + (parseFloat(item.totalPrice) || 0);
    }, 0);
    
    const subtotal = formData.subtotal || itemsTotal;
    const discount = formData.discount || 0;
    const shipping = formData.shipping || 0; // NEW: Include shipping in calculation
    const tax = formData.tax || 0;
    
    // Updated calculation: subtotal - discount + shipping + tax
    const total = subtotal - discount + shipping + tax;
    
   // setTotalAmount(total);
   // setFormData(prev => ({ ...prev, totalAmount: total }));
  // }, [selectedProducts, formData.subtotal, formData.discount, formData.shipping, formData.tax]);

  const generatePINumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PI-${year}${month}${day}-${random}`;
  };

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

  // Supplier creation functions
  const validateSupplierForm = () => {
    const newErrors = {};
    
    if (!newSupplierData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    
    if (!newSupplierData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(newSupplierData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (newSupplierData.phone && !/^[\d\s\-\+\(\)]+$/.test(newSupplierData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    // Check for duplicate supplier name
    if (suppliers.some(s => s.name.toLowerCase() === newSupplierData.name.toLowerCase().trim())) {
      newErrors.name = 'A supplier with this name already exists';
    }

    // Check for duplicate email
    if (suppliers.some(s => s.email.toLowerCase() === newSupplierData.email.toLowerCase().trim())) {
      newErrors.email = 'A supplier with this email already exists';
    }
    
    setSupplierErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSupplier = async () => {
  if (!validateSupplierForm()) return;
  
  setIsCreatingSupplier(true);
  
  try {
    const supplierToCreate = {
      name: newSupplierData.name.trim(),
      email: newSupplierData.email.trim(),
      phone: newSupplierData.phone.trim(),
      contactPerson: newSupplierData.contactPerson.trim(),
      address: newSupplierData.address.trim(),
      status: newSupplierData.status,
    };

    console.log('📞 Calling addSupplier with:', supplierToCreate);
    
    // Call the addSupplier function
    const createdSupplier = await addSupplier(supplierToCreate);
    
    console.log('✅ Supplier created successfully:', createdSupplier);
    
    // FIXED: Ensure we handle the response correctly
    let supplierId, supplierName;
    
    if (typeof createdSupplier === 'string') {
      // If the response is just an ID
      supplierId = createdSupplier;
      supplierName = newSupplierData.name.trim();
    } else if (createdSupplier && typeof createdSupplier === 'object') {
      // If the response is an object
      supplierId = createdSupplier.id || createdSupplier._id || createdSupplier.key;
      supplierName = createdSupplier.name || newSupplierData.name.trim();
    } else {
      // Fallback
      supplierId = `temp-${Date.now()}`;
      supplierName = newSupplierData.name.trim();
    }

    console.log('🔧 Using supplier ID:', supplierId, 'Name:', supplierName);

    // FIXED: Ensure all values are strings and not null/undefined
    setFormData(prev => ({
      ...prev,
      supplierId: supplierId || '',
      supplierName: supplierName || ''
    }));

    // FIXED: Ensure search term is a string
    setSupplierSearchTerm(supplierName || '');
    setShowCreateSupplier(false);
    setShowSupplierDropdown(false);
    
    // Clear supplier error
    setErrors(prev => {
      const { supplier, ...rest } = prev;
      return rest;
    });

    // Reset supplier form
    setNewSupplierData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      status: 'active'
    });
    setSupplierErrors({});

    showNotification?.(`Supplier "${supplierName}" created successfully`, 'success');
    
  } catch (error) {
    console.error('Failed to create supplier:', error);
    showNotification?.('Failed to create supplier. Please try again.', 'error');
  } finally {
    setIsCreatingSupplier(false);
  }
};

  const handleSupplierSelect = (supplier) => {
    setFormData(prev => ({
      ...prev,
      supplierId: supplier.id,
      supplierName: supplier.name
    }));
    setSupplierSearchTerm(supplier.name);
    setShowSupplierDropdown(false);
    setShowCreateSupplier(false);
    
    // Clear supplier error
    setErrors(prev => {
      const { supplier: supplierError, ...rest } = prev;
      return rest;
    });
  };

  const handleSupplierSearchChange = (value) => {
      const searchValue = value || '';
  setSupplierSearchTerm(searchValue);
  setShowSupplierDropdown(true);

    
   // Clear selection if search term doesn't match selected supplier
  if (selectedSupplier && selectedSupplier.name) {
    const supplierName = selectedSupplier.name || '';
    if (!supplierName.toLowerCase().includes(searchValue.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        supplierId: '',
        supplierName: ''
      }));
    }
  }
  };

  const handleNewSupplierDataChange = (field, value) => {
    setNewSupplierData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (supplierErrors[field]) {
      setSupplierErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.piNumber) newErrors.piNumber = 'PI Number is required';
    if (!formData.supplierId && !formData.supplierName) {
      newErrors.supplierId = 'Supplier is required';
    }
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
    
    // Calculate total if not already set (for manually added items)
    const calculatedTotal = selectedProducts.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const totalAmount = formData.totalAmount || calculatedTotal;
    
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
      paymentStatus,
      supplierName: selectedSupplier?.name || formData.supplierName
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
          id: `item-${Date.now()}-${selectedProducts.length}`,
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
      updated[index].totalPrice = (parseFloat(updated[index].quantity) || 0) * (parseFloat(updated[index].unitPrice) || 0);
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

  const totalAmount = formData.totalAmount || 
    selectedProducts.reduce((sum, item) => sum + (item.totalPrice || 0), 0) + 
    (formData.shipping || 0) + (formData.tax || 0) - (formData.discount || 0);
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

                {/* Enhanced Supplier Selection with Create New Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="relative">
                      <input
                        type="text"
                        value={supplierSearchTerm}
                        onChange={(e) => handleSupplierSearchChange(e.target.value)}
                        onFocus={() => setShowSupplierDropdown(true)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.supplierId ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Search suppliers or type new supplier name..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      >
                        <ChevronDown size={18} className="text-gray-400" />
                      </button>
                    </div>

                    {/* Supplier Dropdown */}
                    {showSupplierDropdown && (
                      <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                        
                        {/* Create New Supplier Option */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowCreateSupplier(true);
                            setShowSupplierDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 flex items-center gap-2 text-blue-600 font-medium"
                        >
                          <Plus size={16} />
                          Create New Supplier
                        </button>

                        {/* Existing Suppliers */}
                        {filteredSuppliers.length > 0 ? (
                          filteredSuppliers.map(supplier => (
                            <button
                              key={supplier.id}
                              type="button"
                              onClick={() => handleSupplierSelect(supplier)}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between ${
                                formData.supplierId === supplier.id ? 'bg-blue-50 text-blue-700' : ''
                              }`}
                            >
                              <div>
                                <div className="font-medium">{supplier.name}</div>
                                <div className="text-sm text-gray-500">{supplier.email}</div>
                              </div>
                              {formData.supplierId === supplier.id && (
                                <Check size={16} className="text-blue-600" />
                              )}
                            </button>
                          ))
                        ) : supplierSearchTerm.length > 0 ? (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            No suppliers found matching "{supplierSearchTerm}"
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-gray-500 text-center">
                            Type to search suppliers
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
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
                  
                  {errors.supplier && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm flex items-center gap-2">
                      <AlertTriangle size={14} className="text-yellow-600" />
                      <p className="text-yellow-800">{errors.supplier}</p>
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
                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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

              {/* Create New Supplier Form */}
              {showCreateSupplier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-blue-900">Create New Supplier</h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateSupplier(false)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Supplier Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.name}
                        onChange={(e) => handleNewSupplierDataChange('name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          supplierErrors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter supplier name"
                      />
                      {supplierErrors.name && <p className="text-red-500 text-xs mt-1">{supplierErrors.name}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={newSupplierData.email}
                        onChange={(e) => handleNewSupplierDataChange('email', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          supplierErrors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="supplier@example.com"
                      />
                      {supplierErrors.email && <p className="text-red-500 text-xs mt-1">{supplierErrors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.phone}
                        onChange={(e) => handleNewSupplierDataChange('phone', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          supplierErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="+1234567890"
                      />
                      {supplierErrors.phone && <p className="text-red-500 text-xs mt-1">{supplierErrors.phone}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={newSupplierData.contactPerson}
                        onChange={(e) => handleNewSupplierDataChange('contactPerson', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        value={newSupplierData.address}
                        onChange={(e) => handleNewSupplierDataChange('address', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Full business address"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateSupplier(false)}
                      className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateSupplier}
                      disabled={isCreatingSupplier}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isCreatingSupplier && <Loader2 size={16} className="animate-spin" />}
                      Create Supplier
                    </button>
                  </div>
                </div>
              )}

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
              
              {/* Currency and exchange rate section ends */}
              )}

              {/* ADD THIS ENTIRE SECTION HERE */}
              {/* Financial Details Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal ({formData.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount ({formData.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* NEW: Shipping Cost Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipping Cost ({formData.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.shipping || 0}
                    onChange={(e) => setFormData({ ...formData, shipping: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ({formData.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              
              {/* Banking details section (if international supplier) */}
              {formData.currency !== 'MYR' && formData.bankDetails && (
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="IBAN (if applicable)"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Product Selection */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
  <label className="block text-sm font-medium text-gray-700">
    Items ({selectedProducts.length}) <span className="text-red-500">*</span>
  </label>
  <div className="flex items-center gap-2">
    {/* ✅ ADD THIS BUTTON */}
    {selectedProducts.length > 0 && (
      <button
        type="button"
        onClick={handleFixAllPrices}
        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
        title="Auto-fix all price calculations"
      >
        <Calculator size={14} />
        Fix Prices
      </button>
    )}
    {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}
  </div>
</div>
                
                {/* Product Search - Only show if supplier is selected and no extracted items */}
                {formData.supplierId && selectedProducts.length === 0 && (
                  <div className="relative mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchProduct}
                        onChange={(e) => setSearchProduct(e.target.value)}
                        onFocus={() => setShowProductSearch(true)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {showProductSearch && searchProduct && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map(product => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => handleAddProduct(product)}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-gray-600">{product.sku} - ${product.price}</div>
                              </div>
                              <Plus size={16} className="text-gray-400" />
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-gray-500">No products found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Products */}
                {selectedProducts.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProducts.map((item, index) => (
                          <tr key={item.id || index} className="border-t">
                            <td className="px-4 py-2">
                              <div>
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-sm text-gray-600">{item.productCode}</div>
                                {item.leadTime && (
                                  <div className="text-xs text-gray-500">Lead time: {item.leadTime}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                className={`w-20 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  errors[`quantity-${index}`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                className={`w-24 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  errors[`price-${index}`] ? 'border-red-500' : 'border-gray-300'
                                }`}
                              />
                            </td>
                            <td className="px-4 py-2 font-medium">
                              {formData.currency} {item.totalPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-2">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        {/* Show financial breakdown if extracted */}
                        {formData.subtotal > 0 && (
                          <>
                            <tr>
                              <td colSpan="3" className="px-4 py-2 text-right text-sm">Subtotal:</td>
                              <td className="px-4 py-2 font-medium">{formData.currency} {formData.subtotal.toFixed(2)}</td>
                              <td></td>
                            </tr>
                            {formData.discount > 0 && (
                              <tr>
                                <td colSpan="3" className="px-4 py-2 text-right text-sm">Discount:</td>
                                <td className="px-4 py-2 font-medium text-red-600">-{formData.currency} {formData.discount.toFixed(2)}</td>
                                <td></td>
                              </tr>
                            )}
                            {formData.shipping > 0 && (
                              <tr>
                                <td colSpan="3" className="px-4 py-2 text-right text-sm">Shipping:</td>
                                <td className="px-4 py-2 font-medium">{formData.currency} {formData.shipping.toFixed(2)}</td>
                                <td></td>
                              </tr>
                            )}
                            {formData.tax > 0 && (
                              <tr>
                                <td colSpan="3" className="px-4 py-2 text-right text-sm">Tax:</td>
                                <td className="px-4 py-2 font-medium">{formData.currency} {formData.tax.toFixed(2)}</td>
                                <td></td>
                              </tr>
                            )}
                          </>
                        )}
                        <tr>
                          <td colSpan="3" className="px-4 py-2 text-right font-medium">Total:</td>
                          <td className="px-4 py-2 font-bold text-lg">{formData.currency} {totalAmount.toFixed(2)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {!formData.supplierId && selectedProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>Select a supplier to add products</p>
                  </div>
                )}
              </div>

              {/* Additional Terms Section for Extracted Data */}
              {(formData.deliveryTerms || formData.validity) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-3">Additional Terms</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {formData.deliveryTerms && (
                      <div>
                        <label className="block text-gray-600 mb-1">Delivery Terms</label>
                        <input
                          type="text"
                          value={formData.deliveryTerms}
                          onChange={(e) => setFormData({ ...formData, deliveryTerms: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {formData.validity && (
                      <div>
                        <label className="block text-gray-600 mb-1">Validity</label>
                        <input
                          type="text"
                          value={formData.validity}
                          onChange={(e) => setFormData({ ...formData, validity: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              {/* Special Instructions */}
              {formData.specialInstructions && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions
                  </label>
                  <textarea
                    value={formData.specialInstructions}
                    onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </>
          ) : activeTab === 'payment' ? (
            // Payment Tab
            <div className="space-y-6">
              {/* Payment Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold">{formData.currency} {totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Paid</p>
                    <p className="text-2xl font-bold text-green-600">{formData.currency} {totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Balance</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formData.currency} {(totalAmount - totalPaid).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="text-lg font-bold">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        formData.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        formData.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formData.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Payment Progress</span>
                    <span>{paymentProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(paymentProgress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Payment Terms</p>
                  <p className="text-sm text-gray-600 mt-1">{formData.paymentTerms}</p>
                </div>
              
              </div>

              {/* Add Payment Button */}
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Payment History</h3>
                <button
                  type="button"
                  onClick={handleAddPayment}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus size={20} />
                  Add Payment
                </button>
              </div>

              {/* Payment History */}
              <div className="space-y-4">
                {formData.payments && formData.payments.length > 0 ? (
                  formData.payments.map((payment, index) => (
                    <div key={payment.id || index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="font-medium">${payment.amount.toFixed(2)}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(payment.date).toLocaleDateString()} • {payment.type.replace('-', ' ')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          payment.type === 'down-payment' ? 'bg-blue-100 text-blue-800' :
                          payment.type === 'balance' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.type.replace('-', ' ')}
                        </span>
                      </div>

                      {payment.reference && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Reference:</span> {payment.reference}
                        </div>
                      )}

                      {payment.remark && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Remark:</span> {payment.remark}
                        </div>
                      )}

                      {payment.attachments && payment.attachments.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Attachments</p>
                          <div className="flex flex-wrap gap-2">
                            {payment.attachments.map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                              >
                                <FileText size={14} />
                                {file.name}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Receiving Tab
            <div className="space-y-6">
              {/* Receiving Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Ordered</p>
                    <p className="text-xl font-bold">{totalOrdered} items</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Received</p>
                    <p className="text-xl font-bold text-green-600">{totalReceived} items</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Pending</p>
                    <p className="text-xl font-bold text-orange-600">{totalOrdered - totalReceived} items</p>
                  </div>
                </div>
              </div>

              {/* Receiving Items */}
              <div className="space-y-4">
                {selectedProducts.map((item, index) => {
                  const hasDiscrepancy = item.receivedQty > 0 && item.receivedQty !== item.quantity;
                  
                  return (
                    <div key={item.id || index} className={`border rounded-lg p-4 ${hasDiscrepancy ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{item.productName}</h4>
                          <p className="text-sm text-gray-600">{item.productCode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleReceived(index)}
                          className="ml-4"
                        >
                          {item.isReceived ? (
                            <CheckSquare className="h-5 w-5 text-green-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Ordered Qty</label>
                          <p className="font-medium">{item.quantity}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Received Qty</label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={item.receivedQty}
                            onChange={(e) => handleUpdateItem(index, 'receivedQty', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Difference</label>
                          <p className={`font-medium ${
                            item.quantity - item.receivedQty > 0 ? 'text-orange-600' : 
                            item.quantity - item.receivedQty < 0 ? 'text-red-600' : 
                            'text-green-600'
                          }`}>
                            {item.quantity - item.receivedQty}
                          </p>
                        </div>
                      </div>

                      {hasDiscrepancy && (
                        <div className="mt-3 p-2 bg-orange-100 rounded flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-orange-800">Quantity discrepancy detected</span>
                        </div>
                      )}

                      <div className="mt-3">
                        <label className="block text-sm text-gray-600 mb-1">Receiving Notes</label>
                        <input
                          type="text"
                          value={item.receivingNotes || ''}
                          onChange={(e) => handleUpdateItem(index, 'receivingNotes', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Damaged packaging, Wrong item, etc."
                        />
                      </div>

                      {/* PO Allocation Section (Future Enhancement) */}
                      {item.receivedQty > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Note:</span> Stock allocation to POs will be available in the next update
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </form>

        <div className="p-6 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {proformaInvoice ? 'Update' : 'Create'} PI
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add Payment</h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={newPayment.date}
                  onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Type
                </label>
                <select
                  value={newPayment.type}
                  onChange={(e) => setNewPayment({ ...newPayment, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="down-payment">Down Payment</option>
                  <option value="balance">Balance Payment</option>
                  <option value="partial">Partial Payment</option>
                  <option value="full">Full Payment</option>

                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={newPayment.method}
                  onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank-transfer">Bank Transfer</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="credit-card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Transaction ID or Check Number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remark
                </label>
                <textarea
                  value={newPayment.remark}
                  onChange={(e) => setNewPayment({ ...newPayment, remark: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Payment Slip
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                        <span>Upload a file</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                  </div>
                </div>
                
                {newPayment.attachments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</p>
                    <div className="space-y-2">
                      {newPayment.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-gray-400" />
                            <span className="text-sm text-gray-700">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewPayment(prev => ({
                                ...prev,
                                attachments: prev.attachments.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PIModal;
