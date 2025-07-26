// src/components/procurement/PIModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DocumentViewer from '../common/DocumentViewer';
import StockAllocationModal from './StockAllocationModal';
import { StockAllocationService } from '../../services/StockAllocationService';
import { getProformaInvoices } from '../../services/firebase';


import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag,
  Truck, AlertCircle, CheckSquare, Square,
  DollarSign, Upload, Link, Eye, Download,
  CreditCard, MessageSquare, Briefcase, AlertTriangle,
  Building2, Mail, Phone, MapPin, User, Loader2,
  ChevronDown, Check, CheckCircle, Clock
} from 'lucide-react';

// ✅ ADD THE AUTO-FIX FUNCTION HERE - RIGHT AFTER IMPORTS
const fixPIItemPrices = (items, debug = true) => {
  if (!items || !Array.isArray(items)) {
    console.warn('No valid items array provided to fixPIItemPrices');
    return [];
  }

  if (debug) {
    console.log('🔧 FIXING PI ITEM PRICES...');
    console.log('Original items:', items);
  }

  return items.map((item, index) => {
    const originalItem = { ...item };
    
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const totalPrice = parseFloat(item.totalPrice) || 0;
    
    if (debug) {
      console.log(`Item ${index + 1} (${item.productName || item.productCode || 'Unknown'}):`, {
        quantity, unitPrice, totalPrice, calculation: quantity * unitPrice
      });
    }

    let fixedItem = { ...originalItem };

    // Strategy 1: Calculate total from quantity × unit price
    if (quantity > 0 && unitPrice > 0) {
      const calculatedTotal = quantity * unitPrice;
      const variance = totalPrice > 0 ? Math.abs(calculatedTotal - totalPrice) / totalPrice : 1;
      
      if (variance > 0.1 || totalPrice === 0) {
        if (debug) console.log(`  ✅ Fixed: Using calculated total ${calculatedTotal} (was ${totalPrice})`);
        fixedItem.totalPrice = calculatedTotal;
      }
    } 
    // Strategy 2: Calculate unit price from total ÷ quantity
    else if (quantity > 0 && totalPrice > 0 && (unitPrice === 0 || !unitPrice)) {
      const calculatedUnitPrice = totalPrice / quantity;
      if (debug) console.log(`  ✅ Fixed: Calculated unit price ${calculatedUnitPrice}`);
      fixedItem.unitPrice = calculatedUnitPrice;
    } 
    // Strategy 3: Calculate quantity from total ÷ unit price
    else if (unitPrice > 0 && totalPrice > 0 && (quantity === 0 || !quantity)) {
      const calculatedQuantity = Math.round(totalPrice / unitPrice);
      if (debug) console.log(`  ✅ Fixed: Calculated quantity ${calculatedQuantity}`);
      fixedItem.quantity = calculatedQuantity;
    } 
    // Strategy 4: Handle only total price existing
    else if (totalPrice > 0 && quantity === 0 && unitPrice === 0) {
      fixedItem.quantity = 1;
      fixedItem.unitPrice = totalPrice;
      if (debug) console.log(`  ✅ Fixed: Assumed quantity=1, unit price=${totalPrice}`);
    }

    // Ensure proper number formatting
    fixedItem.quantity = Math.max(parseFloat(fixedItem.quantity) || 1, 1);
    fixedItem.unitPrice = parseFloat(fixedItem.unitPrice) || 0;
    fixedItem.totalPrice = parseFloat(fixedItem.totalPrice) || 0;

    // Final validation
    const finalCalculation = fixedItem.quantity * fixedItem.unitPrice;
    if (Math.abs(finalCalculation - fixedItem.totalPrice) > 0.01) {
      fixedItem.totalPrice = finalCalculation;
    }

    return fixedItem;
  });
};

const validatePITotals = (formData, selectedProducts, debug = false) => {
  if (!selectedProducts || selectedProducts.length === 0) {
    return { ...formData, subtotal: 0, totalAmount: 0 };
  }

  const calculatedSubtotal = selectedProducts.reduce((sum, item) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0);

  const discount = parseFloat(formData.discount) || 0;
  const shipping = parseFloat(formData.shipping) || 0;
  const tax = parseFloat(formData.tax) || 0;
  const calculatedTotal = calculatedSubtotal - discount + shipping + tax;

  if (debug) {
    console.log('💰 PI TOTAL VALIDATION:', {
      itemsCount: selectedProducts.length,
      calculatedSubtotal,
      discount,
      shipping,
      tax,
      calculatedTotal
    });
  }

  return {
    ...formData,
    subtotal: calculatedSubtotal,
    totalAmount: calculatedTotal
  };
};

const PIModal = ({ proformaInvoice, suppliers, products, onSave, onClose, addSupplier, showNotification }) => {
  // Only log props debug when component mounts or key props change
useEffect(() => {
  console.log('=== PIModal Props Debug ===');
  console.log('proformaInvoice:', proformaInvoice ? 'Present' : 'Missing');
  console.log('suppliers:', suppliers ? `Array with ${suppliers.length} items` : 'Missing');
  console.log('products:', products ? `Array with ${products.length} items` : 'Missing');
  console.log('onSave:', typeof onSave, onSave ? 'Present' : 'Missing');
  console.log('onClose:', typeof onClose, onClose ? 'Present' : 'Missing');
  console.log('addSupplier:', typeof addSupplier, addSupplier ? 'Present' : 'Missing');
  console.log('showNotification:', typeof showNotification, showNotification ? 'Present' : 'Missing');
  console.log('=== End Props Debug ===');
}, [
  proformaInvoice?.id,  // Only re-log when PI ID changes
  suppliers?.length,
  products?.length
]);
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

    // ✅ ADD THESE NEW FIELDS HERE:
  ,
  // Document storage fields
  documentId: '',
  documentNumber: '',
  documentType: 'pi',
  hasStoredDocuments: false,
  storageInfo: null,
  originalFileName: '',
  fileSize: 0,
  contentType: '',
  extractedAt: '',
  storedAt: ''
});



  // ✅ ADD THIS FUNCTION HERE - AFTER STATE DECLARATIONS
  const handleFixAllPrices = () => {
    console.log('🔧 Manual price fix triggered for PI');
    
    const fixedProducts = fixPIItemPrices(selectedProducts, true); // Enable debug for manual fix
    setSelectedProducts(fixedProducts);
    
    // ✅ Recalculate totals with validation
    const validatedData = validatePITotals(formData, fixedProducts, true);
    
    setFormData(prev => ({
      ...prev,
      subtotal: validatedData.subtotal,
      totalAmount: validatedData.totalAmount
    }));
    
    // ✅ Enhanced user feedback
    const corrections = fixedProducts.filter((item, index) => {
      const original = selectedProducts[index];
      return original && Math.abs(item.totalPrice - (original.totalPrice || 0)) > 0.01;
    });
    
    if (corrections.length > 0) {
      showNotification?.(`Fixed ${corrections.length} price calculation(s)`, 'success');
    } else {
      showNotification?.('All prices are already correct', 'info');
    }
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
      console.log('🚢 SHIPPING DEBUG:', {
      originalShipping: proformaInvoice.shipping,
      extractedData: proformaInvoice,
      allFields: Object.keys(proformaInvoice)
    });
      
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

        // ✅ ADD THESE NEW LINES HERE (BEFORE THE CLOSING BRACE):
      ,
      // Document storage fields - CRITICAL FIX
      documentId: proformaInvoice.documentId || '',
      documentNumber: proformaInvoice.documentNumber || '',
      documentType: proformaInvoice.documentType || 'pi',
      hasStoredDocuments: proformaInvoice.hasStoredDocuments || false,
      storageInfo: proformaInvoice.storageInfo || null,
      originalFileName: proformaInvoice.originalFileName || '',
      fileSize: proformaInvoice.fileSize || 0,
      contentType: proformaInvoice.contentType || '',
      extractedAt: proformaInvoice.extractedAt || '',
      storedAt: proformaInvoice.storedAt || ''
    });
    
    // ✅ ADD THIS DEBUG LOG RIGHT AFTER setFormData:
    console.log('🎯 PIModal: Document storage fields set:', {
      documentId: proformaInvoice.documentId,
      hasStoredDocuments: proformaInvoice.hasStoredDocuments,
      originalFileName: proformaInvoice.originalFileName
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
        receivingNotes: item.receivingNotes || '',
        isReceived: item.isReceived || false
      }));

     // ✅ Auto-fix price calculations with enhanced function
      itemsWithIds = fixPIItemPrices(itemsWithIds);
      
      setSelectedProducts(itemsWithIds);
      console.log('Set selected products:', itemsWithIds);
      
      // ✅ Recalculate totals after fixing prices with validation
      const validatedData = validatePITotals(formData, itemsWithIds, true);
      setFormData(prev => ({
        ...prev,
        subtotal: validatedData.subtotal,
        totalAmount: validatedData.totalAmount
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

  // ✅ ENHANCED useEffect for Real-time Total Calculation with Validation
  const calculatedTotals = useMemo(() => {
  if (selectedProducts && selectedProducts.length > 0) {
    return validatePITotals(formData, selectedProducts, false);
  }
  return { subtotal: 0, totalAmount: 0 };
}, [selectedProducts, formData.discount, formData.shipping, formData.tax]);

// Update totals only when calculated values actually change
useEffect(() => {
  if (Math.abs(calculatedTotals.totalAmount - (formData.totalAmount || 0)) > 0.01) {
    setFormData(prev => ({
      ...prev,
      subtotal: calculatedTotals.subtotal,
      totalAmount: calculatedTotals.totalAmount
    }));
  }
}, [calculatedTotals.subtotal, calculatedTotals.totalAmount]);

  // ✅ Debug useEffect to monitor document storage fields
  useEffect(() => {
  console.log('🎯 PIModal: Document storage debug:', {
    documentId: formData.documentId,
    hasStoredDocuments: formData.hasStoredDocuments
  });
}, [formData.documentId]); // Only trigger when documentId actually changes

  // ✅ Debug useEffect to monitor props changes
  useEffect(() => {
    if (proformaInvoice) {
      console.log('🎯 PIModal: Props vs FormData comparison:', {
        propsDocumentId: proformaInvoice.documentId,
        propsHasStoredDocs: proformaInvoice.hasStoredDocuments,
        formDataDocumentId: formData.documentId,
        formDataHasStoredDocs: formData.hasStoredDocuments
      });
    }
  }, [proformaInvoice?.documentId, proformaInvoice?.hasStoredDocuments, formData.documentId]);

  // ✅ FIX: Ensure PI has proper Firestore ID for allocation operations
useEffect(() => {
  // When PI is loaded from Firestore, ensure we have the correct ID structure
  if (proformaInvoice && !proformaInvoice.id && proformaInvoice.piNumber) {
    console.log('🔍 PI missing Firestore ID, attempting lookup:', proformaInvoice.piNumber);
    
    // If we have a PI number but no Firestore ID, we need to get it from Firestore
    const lookupFirestoreId = async () => {
      try {
        // Import the function at the top if not already imported
        const { getProformaInvoices } = await import('../../services/firebase');
        
        const result = await getProformaInvoices();
        if (result.success) {
          const matchingPI = result.data.find(pi => 
            pi.piNumber === proformaInvoice.piNumber
          );
          
          if (matchingPI && matchingPI.id) {
            console.log('✅ Found Firestore ID for PI:', matchingPI.id);
            
            // Update the PI object with the correct Firestore ID
            setFormData(prev => ({
              ...prev,
              id: matchingPI.id,
              // Also ensure we have all the latest data from Firestore
              ...matchingPI
            }));
          }
        }
      } catch (error) {
        console.error('❌ Error looking up PI Firestore ID:', error);
      }
    };
    
    lookupFirestoreId();
  }
}, [proformaInvoice?.piNumber, proformaInvoice?.id]);
  
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

  const validateForm = useCallback(() => {
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
}, [formData.piNumber, formData.supplierId, formData.supplierName, formData.date, selectedProducts]);

const handleSubmit = useCallback((e) => {
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
  
  // CRITICAL FIX: Preserve ALL document storage fields
  const piDataToSave = {
    ...formData,  // This now includes documentId and all storage fields
    items: selectedProducts,
    totalAmount,
    hasDiscrepancy,
    totalPaid,
    paymentStatus,
    supplierName: selectedSupplier?.name || formData.supplierName,
    
    // Explicit preservation of critical document storage fields
    documentId: formData.documentId,
    documentNumber: formData.documentNumber,
    documentType: formData.documentType || 'pi',
    hasStoredDocuments: formData.hasStoredDocuments,
    storageInfo: formData.storageInfo,
    originalFileName: formData.originalFileName,
    fileSize: formData.fileSize,
    contentType: formData.contentType,
    extractedAt: formData.extractedAt,
    storedAt: formData.storedAt
  };

  // ✅ ADD THIS DEBUG LOG:
  console.log('🎯 PIModal: Saving PI with document storage fields:', {
    documentId: piDataToSave.documentId,
    hasStoredDocuments: piDataToSave.hasStoredDocuments,
    originalFileName: piDataToSave.originalFileName,
    allKeys: Object.keys(piDataToSave).filter(key => key.includes('document') || key.includes('storage') || key.includes('file'))
  });
  
  onSave(piDataToSave);
}, [formData, selectedProducts, selectedSupplier, onSave, validateForm]);

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
    
    let newProducts;
    if (existingIndex >= 0) {
      // Update quantity if product already exists
      newProducts = [...selectedProducts];
      newProducts[existingIndex].quantity += 1;
      newProducts[existingIndex].totalPrice = newProducts[existingIndex].quantity * newProducts[existingIndex].unitPrice;
    } else {
      // Add new product
      newProducts = [
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
      ];
    }
    
    // ✅ Apply price fixing to ensure consistency
    const fixedProducts = fixPIItemPrices(newProducts, false);
    setSelectedProducts(fixedProducts);
    
    setSearchProduct('');
    setShowProductSearch(false);
  };

  const handleUpdateItem = (index, field, value) => {
    setSelectedProducts(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      
      // ✅ Apply price fixing immediately after any change
      const fixedItems = fixPIItemPrices(updated, false); // Set debug=false for manual changes
      
      // Check if price was auto-corrected and notify user
      const originalTotal = updated[index].totalPrice;
      const fixedTotal = fixedItems[index].totalPrice;
      
      if (showNotification && Math.abs(originalTotal - fixedTotal) > 0.01) {
        showNotification(`Price auto-corrected for ${fixedItems[index].productName}`, 'info');
      }
      
      // Check if item is fully received (keep existing logic)
      if (field === 'receivedQty') {
        fixedItems[index].isReceived = value >= fixedItems[index].quantity;
      }
      
      return fixedItems;
    });
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
    const newProducts = selectedProducts.filter((_, i) => i !== index);
    const fixedProducts = fixPIItemPrices(newProducts, false);
    setSelectedProducts(fixedProducts);
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
    <div className="bg-white rounded-lg max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <div className="p-6 border-b flex-shrink-0">
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

      {/* Fixed Tabs */}
      {proformaInvoice && (
        <div className="border-b flex-shrink-0">
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
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'documents' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Documents
              {proformaInvoice?.id && (
                <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">
                  Stored
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
       <div className="flex-1 overflow-hidden">
  <form onSubmit={handleSubmit} className="h-full flex flex-col">
    <div className="flex-1 overflow-y-auto p-6">
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
 {/* ✅ ENHANCED Fix Prices Button with Better Styling */}
    {selectedProducts.length > 0 && (
      <button
        type="button"
        onClick={handleFixAllPrices}
        className="px-3 py-1.5 text-sm bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 flex items-center gap-2 shadow-sm transition-all duration-200"
        title="Auto-fix all price calculations"
      >
        <Calculator size={14} />
        Fix All Prices
      </button>
    )}
    {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}
  </div>
</div>
                {/* ✅ ENHANCED Price Fix Status Indicator */}
            {selectedProducts.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Calculator size={16} />
                  <span className="font-medium">Smart Price Correction:</span>
                  <span>Automatically validates quantity × unit price = total price</span>
                </div>
              </div>
            )}
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
                              <div className="flex items-center gap-2">
                                <span>{formData.currency} {item.totalPrice.toFixed(2)}</span>
                                {/* ✅ Visual indicator for auto-corrected prices */}
                                {Math.abs(item.totalPrice - (item.quantity * item.unitPrice)) < 0.01 && (
                                  <CheckCircle size={14} className="text-green-500" title="Price calculation verified" />
                                )}
                              </div>
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
          ) : activeTab === 'receiving' ?  (
            // Receiving Tab f
            <StockReceivingTab 
  pi={{
    ...formData,
    // ✅ CRITICAL: Ensure PI always has an ID for allocation operations
    id: formData.id || proformaInvoice?.id,
    piNumber: formData.piNumber || proformaInvoice?.piNumber,
    items: selectedProducts || []
  }}
  onUpdatePI={async (updatedPI) => {
    try {
      console.log('🔄 PIModal: Updating PI with allocation data:', updatedPI.id);
      
      // Ensure we preserve the Firestore ID and allocation data
      const piWithIntegrity = {
        ...updatedPI,
        id: updatedPI.id || formData.id || proformaInvoice?.id
      };
      
      if (!piWithIntegrity.id) {
        console.warn('⚠️ Attempting to update PI without Firestore ID');
        return;
      }
      
      // Update formData to reflect changes immediately in UI
      setFormData(piWithIntegrity);
      setSelectedProducts(piWithIntegrity.items || []);
      
      // Call the parent update function
      if (onSave) {
        const result = await onSave(piWithIntegrity);
        if (result?.success) {
          console.log('✅ PI updated successfully with allocation data');
        }
      }
    } catch (error) {
      console.error('❌ Error updating PI with allocation data:', error);
      showNotification('Failed to update PI', 'error');
    }
  }}
  suppliers={suppliers}
  showNotification={showNotification}
/>
          ) : activeTab === 'documents' ? (
            // Documents Tab - NEW ADDITION
            <div className="space-y-4">
              {proformaInvoice?.id ? (
                <DocumentViewer
                  documentId={proformaInvoice?.documentId || formData.documentId}
                  documentType="pi"
                  documentNumber={proformaInvoice.piNumber || formData.piNumber}
                  allowDelete={true}
                  onDocumentDeleted={(doc) => {
                    console.log('Document deleted:', doc);
                    showNotification?.('Document deleted successfully', 'success');
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="font-medium mb-1">Documents will be available after saving this PI</p>
                  <p className="text-xs">Upload and AI extraction files will be stored here automatically</p>
                </div>
              )}
            </div>
          ) : null}
       </div>

          {/* Fixed Footer with Action Buttons */}
          <div className="border-t bg-white p-6 flex justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {proformaInvoice ? 'Update' : 'Create'} PI
            </button>
          </div>
        </form>
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

// ADD THIS ENTIRE COMPONENT before the export default PIModal; line

// Stock Receiving Tab Component with Stock Allocation
const StockReceivingTab = ({ 
  pi, 
  onUpdatePI, 
  suppliers, 
  showNotification 
}) => {
  

  // Log the actual PI structure
  useEffect(() => {
  console.log('🔍 PI Object Structure:', pi?.id, pi?.piNumber);
}, [pi?.id]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [receivingForm, setReceivingForm] = useState({});

  // Initialize receiving form data
  useEffect(() => {
    if (pi && pi.items) {
      const formData = {};
      pi.items.forEach(item => {
        formData[item.id] = {
          receivedQty: item.receivedQty || 0,
          receivingNotes: item.receivingNotes || '',
          hasDiscrepancy: item.hasDiscrepancy || false,
          discrepancyReason: item.discrepancyReason || ''
        };
      });
      setReceivingForm(formData);
    }
  }, [pi]);



  const handleReceivingUpdate = (itemId, field, value) => {
    setReceivingForm(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const saveReceivingData = async (itemId) => {
    try {
      const receivingData = receivingForm[itemId];
      
      // Update the PI item
      const updatedItems = pi.items.map(item => {
        if (item.id === itemId) {
          const receivedQty = receivingData.receivedQty;
          const orderedQty = item.quantity;
          const difference = receivedQty - orderedQty;
          
          return {
            ...item,
            receivedQty: receivedQty,
            receivingNotes: receivingData.receivingNotes,
            hasDiscrepancy: receivingData.hasDiscrepancy || difference !== 0,
            discrepancyReason: difference !== 0 ? `Quantity difference: ${difference > 0 ? '+' : ''}${difference}` : receivingData.discrepancyReason,
            difference: difference,
            receivedDate: new Date().toISOString().split('T')[0],
            unallocatedQty: receivedQty - (item.totalAllocated || 0)
          };
        }
        return item;
      });

      // Update the PI
      const updatedPI = {
        ...pi,
        items: updatedItems,
        updatedAt: new Date().toISOString()
      };

      await onUpdatePI(updatedPI);
      showNotification('Receiving data saved successfully', 'success');
    } catch (error) {
      console.error('Error saving receiving data:', error);
      showNotification('Failed to save receiving data', 'error');
    }
  };

  const openAllocationModal = (item, event) => {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!item.receivedQty || item.receivedQty <= 0) {
    showNotification('Please receive items before allocating stock', 'warning');
    return;
  }

  // ✅ CRITICAL: Ensure we have a valid PI ID
  const actualPiId = pi.id || pi.piNumber;
  if (!actualPiId) {
    console.error('❌ Cannot allocate stock: PI ID is missing');
    showNotification('Cannot allocate stock: PI data is incomplete', 'error');
    return;
  }
  
  console.log('🎯 Opening allocation modal with PI ID:', actualPiId);
  
  setSelectedItem({
    ...item,
    piId: actualPiId,
    piNumber: pi.piNumber,
    supplierName: pi.supplierName,
    // Include current allocation status
    receivedQty: item.receivedQty || 0,
    totalAllocated: item.totalAllocated || 0,
    unallocatedQty: (item.receivedQty || 0) - (item.totalAllocated || 0)
  });
  
  setShowAllocationModal(true);
};


// ✅ UPDATED: StockAllocationModal JSX with consistent PI ID passing
{showAllocationModal && selectedItem && (
  <StockAllocationModal
    isOpen={showAllocationModal}
    onClose={() => {
      setShowAllocationModal(false);
      setSelectedItem(null);
    }}
    
    // ✅ FIX: Use the same PI ID logic consistently
    piId={selectedItem.piId}
    
    itemData={selectedItem}
    onAllocationComplete={handleAllocationComplete}
  />
)}


  const handleAllocationComplete = async (allocations) => {
  try {
    console.log('✅ ALLOCATION COMPLETE: Starting update process...');
    console.log('📋 Allocations received:', allocations);
    console.log('🎯 Selected item:', selectedItem);
    console.log('📄 Current PI:', pi);
    
    // Close the modal first
    setShowAllocationModal(false);
    setSelectedItem(null);
    
    if (!selectedItem || !allocations || allocations.length === 0) {
      console.error('❌ Missing required data for allocation update');
      showNotification('Allocation data is incomplete', 'error');
      return;
    }

    // 🎯 CRITICAL: Calculate the total allocated from new allocations
    const newTotalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
    console.log('🔢 New total allocated:', newTotalAllocated);

    // 🎯 IMMEDIATE LOCAL UPDATE: Update the PI items immediately
    const updatedItems = pi.items.map(item => {
      if (item.id === selectedItem.id) {
        console.log('🔄 Updating item:', item.id);
        console.log('   Before:', {
          receivedQty: item.receivedQty,
          totalAllocated: item.totalAllocated,
          allocations: item.allocations?.length || 0
        });

        // Merge existing allocations with new ones
        const existingAllocations = item.allocations || [];
        const allAllocations = [...existingAllocations, ...allocations];
        const totalAllocated = allAllocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
        const receivedQty = item.receivedQty || 0;
        const unallocatedQty = receivedQty - totalAllocated;

        const updatedItem = {
          ...item,
          allocations: allAllocations,
          totalAllocated: totalAllocated,
          unallocatedQty: unallocatedQty,
          lastAllocationUpdate: new Date().toISOString(),
          // Add allocation status for debugging
          allocationStatus: totalAllocated >= receivedQty ? 'complete' : 'partial'
        };

        console.log('   After:', {
          receivedQty: updatedItem.receivedQty,
          totalAllocated: updatedItem.totalAllocated,
          allocations: updatedItem.allocations?.length || 0,
          unallocatedQty: updatedItem.unallocatedQty,
          allocationStatus: updatedItem.allocationStatus
        });

        return updatedItem;
      }
      return item;
    });

    // Create updated PI object
    const updatedPI = {
      ...pi,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
      lastAllocationUpdate: new Date().toISOString()
    };

    console.log('💾 Updating PI with new allocation data...');
    
    // 🎯 CRITICAL: Update the parent component immediately
    try {
      await onUpdatePI(updatedPI);
      console.log('✅ PI updated successfully with allocations');
      showNotification('Stock allocated successfully', 'success');

      // 🎯 FORCE UI REFRESH: Multiple strategies to ensure re-render
      setTimeout(() => {
        console.log('🔄 Forcing UI refresh...');
        
        // Strategy 1: Update receiving form state
        setReceivingForm(prev => ({ 
          ...prev, 
          lastUpdate: Date.now(),
          [`${selectedItem.id}_allocated`]: true 
        }));

        // Strategy 2: Force component re-render by updating a dummy state
        // This will trigger the getItemStatus function to run again
        console.log('🔄 UI refresh completed');
      }, 50);

    } catch (updateError) {
      console.error('❌ Error updating PI:', updateError);
      showNotification('Failed to save allocation data', 'error');
    }

    // 🎯 BACKUP: Also try to refresh from Firestore as secondary measure
    try {
      if (pi.id || pi.piNumber) {
        const { getProformaInvoices } = await import('../../services/firebase');
        const result = await getProformaInvoices();
        
        if (result.success) {
          const refreshedPI = result.data.find(p => 
            p.id === pi.id || p.piNumber === pi.piNumber
          );
          
          if (refreshedPI) {
            console.log('🔄 Secondary refresh from Firestore successful');
            await onUpdatePI(refreshedPI);
          }
        }
      }
    } catch (refreshError) {
      console.warn('⚠️ Secondary Firestore refresh failed:', refreshError);
      // Don't throw - the primary update already succeeded
    }
    
  } catch (error) {
    console.error('❌ Critical error in allocation completion:', error);
    showNotification('Allocation failed: ' + error.message, 'error');
  }
};

  const resetItemAllocations = async (itemId) => {
  try {
    console.log('🔄 Resetting allocations for item:', itemId);
    
    // Find the item and reset its allocations
    const updatedItems = pi.items.map(item => {
      if (item.id === itemId) {
        console.log('🧹 Clearing allocations for:', {
          itemId: item.id,
          productCode: item.productCode,
          previousAllocations: item.allocations?.length || 0,
          previousTotalAllocated: item.totalAllocated || 0
        });

        return {
          ...item,
          allocations: [], // Clear all allocations
          totalAllocated: 0, // Reset total
          unallocatedQty: item.receivedQty || 0, // Reset to full received quantity
          lastAllocationReset: new Date().toISOString()
        };
      }
      return item;
    });

    // Update the PI with reset allocations
    const updatedPI = {
      ...pi,
      items: updatedItems,
      updatedAt: new Date().toISOString(),
      lastAllocationReset: new Date().toISOString()
    };

    console.log('💾 Updating PI with reset allocations...');
    await onUpdatePI(updatedPI);
    
    showNotification('Allocations reset successfully', 'success');
    
    // Force UI refresh
    setTimeout(() => {
      setReceivingForm(prev => ({ 
        ...prev, 
        [`${itemId}_reset`]: Date.now()
      }));
    }, 100);

  } catch (error) {
    console.error('❌ Error resetting allocations:', error);
    showNotification('Failed to reset allocations', 'error');
  }
};
  const getItemStatus = (item) => {
  const received = item.receivedQty || 0;
  const ordered = item.quantity || 0;
  
  // 🎯 ENHANCED: Calculate totalAllocated from multiple sources
  let allocated = 0;
  
  // Strategy 1: Use totalAllocated field if available
  if (item.totalAllocated !== undefined && item.totalAllocated !== null) {
    allocated = item.totalAllocated;
  }
  // Strategy 2: Calculate from allocations array
  else if (item.allocations && Array.isArray(item.allocations)) {
    allocated = item.allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
  }
  // Strategy 3: Use 0 as fallback
  else {
    allocated = 0;
  }

  // 🔍 ENHANCED DEBUGGING: Show full item structure when allocation is 0
  if (allocated === 0 && received > 0) {
    console.log(`🚨 ZERO ALLOCATION DEBUG for item ${item.id}:`, {
      fullItem: item,
      hasAllocations: !!item.allocations,
      allocationsArray: item.allocations,
      totalAllocatedField: item.totalAllocated,
      receivedQty: received,
      itemKeys: Object.keys(item)
    });
  }

  console.log(`🔍 Status calculation for item ${item.id || item.productCode}:`, {
    received,
    ordered,
    allocated,
    totalAllocatedField: item.totalAllocated,
    allocationsArray: item.allocations?.length || 0,
    allocationsSum: item.allocations?.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0) || 0
  });

  // Status logic with enhanced debugging
  if (received === 0) {
    console.log(`   → Status: PENDING (no items received)`);
    return { status: 'pending', color: 'gray', icon: Clock };
  }
  
  if (received !== ordered) {
    console.log(`   → Status: DISCREPANCY (received ${received} ≠ ordered ${ordered})`);
    return { status: 'discrepancy', color: 'yellow', icon: AlertTriangle };
  }
  
  if (allocated < received) {
    console.log(`   → Status: PARTIAL ALLOCATION (allocated ${allocated} < received ${received})`);
    return { status: 'partial-allocation', color: 'orange', icon: Package };
  }
  
  console.log(`   → Status: COMPLETE (allocated ${allocated} >= received ${received})`);
  return { status: 'complete', color: 'green', icon: CheckCircle };
};
  
  return (
    <div className="space-y-6">
      {/* Stock Allocation Feature Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Package className="h-5 w-5 text-blue-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              Stock Allocation Available
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Allocate received stock to Purchase Orders, Project Codes, or Warehouse inventory.
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        {pi.items && pi.items.map(item => {
          const itemForm = receivingForm[item.id] || {};
          const itemStatus = getItemStatus(item);
          const StatusIcon = itemStatus.icon;

          return (
            <div key={item.id} className="border border-gray-200 rounded-lg p-6 bg-white">
              {/* Item Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.productName}</h4>
                  <p className="text-sm text-gray-600">{item.productCode}</p>
                </div>
                <div className="flex items-center">
                  <StatusIcon className={`h-5 w-5 text-${itemStatus.color}-500 mr-2`} />
                  <span className={`text-sm font-medium text-${itemStatus.color}-700 capitalize`}>
                    {itemStatus.status.replace('-', ' ')}
                  </span>
                </div>
              </div>

              {/* Quantity Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordered Qty
                  </label>
                  <div className="text-lg font-semibold text-gray-900">
                    {item.quantity}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.receivedQty || 0}
                    onChange={(e) => handleReceivingUpdate(item.id, 'receivedQty', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difference
                  </label>
                  <div className={`text-lg font-semibold ${
                    (itemForm.receivedQty || 0) - item.quantity > 0 ? 'text-green-600' :
                    (itemForm.receivedQty || 0) - item.quantity < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {(itemForm.receivedQty || 0) - item.quantity > 0 && '+'}
                    {(itemForm.receivedQty || 0) - item.quantity}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unallocated
                  </label>
                  <div className={`text-lg font-semibold ${
                    (item.unallocatedQty || 0) > 0 ? 'text-orange-600' : 'text-gray-600'
                  }`}>
                    {item.unallocatedQty || (itemForm.receivedQty || 0) - (item.totalAllocated || 0)}
                  </div>
                </div>
              </div>

              {/* Receiving Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receiving Notes
                </label>
                <textarea
                  value={itemForm.receivingNotes || ''}
                  onChange={(e) => handleReceivingUpdate(item.id, 'receivingNotes', e.target.value)}
                  placeholder="e.g., Damaged packaging, Wrong item, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                />
              </div>

              {/* Current Allocations Display */}
              {item.allocations && item.allocations.length > 0 && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Current Allocations:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {item.allocations.map((allocation, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border flex items-center">
                        {allocation.allocationType === 'po' && <FileText className="mr-2 h-3 w-3 text-green-500" />}
                        {allocation.allocationType === 'project' && <Tag className="mr-2 h-3 w-3 text-blue-500" />}
                        {allocation.allocationType === 'warehouse' && <Package className="mr-2 h-3 w-3 text-gray-500" />}
                        <span className="font-medium">{allocation.quantity}</span>
                        <span className="mx-1">→</span>
                        <span className="text-gray-600 truncate">{allocation.targetName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

             {/* Action Buttons */}
<div className="flex justify-between items-center">
  <button
    onClick={() => saveReceivingData(item.id)}
    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
  >
    <CheckCircle className="mr-2 h-4 w-4" />
    Save Receiving Data
  </button>

  <div className="flex items-center gap-2">
    {/* Reset Allocations Button - Show for any received items */}
    {(itemForm.receivedQty || item.receivedQty || 0) > 0 && (
      <button
        onClick={() => {
          if (window.confirm(`Reset all allocations for ${item.productName}? This cannot be undone.`)) {
            resetItemAllocations(item.id);
          }
        }}
        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center text-sm"
        type="button"
        title="Reset all allocations for this item"
      >
        <X className="mr-1 h-3 w-3" />
        Reset
      </button>
    )}

    {/* Allocate Stock Button */}
    {(itemForm.receivedQty || item.receivedQty || 0) > 0 && (
      <button
        onClick={(event) => {
          console.log('🎯 Allocate Stock button clicked');
          openAllocationModal({
            ...item,
            receivedQty: itemForm.receivedQty || item.receivedQty || 0,
            unallocatedQty: (itemForm.receivedQty || item.receivedQty || 0) - (item.totalAllocated || 0)
          }, event);
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        type="button"
      >
        <Package className="mr-2 h-4 w-4" />
        Allocate Stock ({(itemForm.receivedQty || item.receivedQty || 0) - (item.totalAllocated || 0)} available)
      </button>
    )}
  </div>
</div>
            </div>
          );
        })}
      </div>

      {/* Stock Allocation Modal */}
      {showAllocationModal && selectedItem && (
        <StockAllocationModal
          isOpen={showAllocationModal}
          onClose={() => {
            setShowAllocationModal(false);
            setSelectedItem(null);
          }}
          
          piId={pi.id || pi.piNumber || 'temp-pi-id'}

          itemData={selectedItem}
          onAllocationComplete={handleAllocationComplete}
        />
      )}
    </div>
  );
};


export default PIModal;
