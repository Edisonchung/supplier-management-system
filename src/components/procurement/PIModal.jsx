//// src/components/procurement/PIModal.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase'; // Adjust path based on your structure

import DocumentViewer from '../common/DocumentViewer';
import StockAllocationModal from './StockAllocationModal';
import { StockAllocationService } from '../../services/StockAllocationService';
import { getProformaInvoices } from '../../services/firebase';
import FSPortalProjectInput from '../common/FSPortalProjectInput';



import { 
  X, Plus, Trash2, Search, Package, 
  FileText, Calculator, Calendar, Tag,
  Truck, AlertCircle, CheckSquare, Square,
  DollarSign, Upload, Link, Eye, Download,
  CreditCard, MessageSquare, Briefcase, AlertTriangle,
  Building2, Mail, Phone, MapPin, User, Loader2,
  ChevronDown, Check, CheckCircle, Clock, Edit2, Info,
  Brain, Target, Zap, ExternalLink, ArrowRight 
} from 'lucide-react';

// ✅ ADD THIS COMPONENT HERE - RIGHT AFTER IMPORTS, BEFORE fixPIItemPrices
const ClientPOInput = ({ value, onChange, index, className, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Sample client PO suggestions (replace with your actual data source)
  const clientPOSuggestions = [
    'PO-2025-PETRONAS-001',
    'PO-2025-PETRONAS-002',
    'PO-2025-SMART-CITY-001', 
    'PO-2025-HOSPITALITY-001',
    'PO-2025-INDUSTRIAL-001',
    'PO-2025-FN-BEVERAGES-001',
    'PO-2025-BORNEO-SPRINGS-001',
    'PO-2025-LFM-ENERGY-001',
    'PO-2025-TOP-GLOVE-001',
    'PO-2025-TMK-CHEMICAL-001'
  ];
  
  const handleInputChange = (inputValue) => {
    onChange(inputValue);
    
    if (inputValue.length > 2) {
      const filtered = clientPOSuggestions.filter(po => 
        po.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };
  
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className={className}
        placeholder={placeholder}
        title="Client Purchase Order Number"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-48 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-32 overflow-y-auto">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const getMatchingStatus = (item) => {
  const hasClientInfo = !!(item.clientPO || item.clientItemCode);
  const hasProjectCode = !!item.fsProjectCode;
  const hasAllTrackingData = hasClientInfo && hasProjectCode;
  
  // Mock supplier matching check - replace with actual logic
  const hasSupplierMatch = item.supplierMatchStatus === 'matched' || 
                          item.matchedSupplierId || 
                          item.supplierMatchConfidence > 0;
  
  const matchingScore = item.supplierMatchConfidence || 0;
  
  // Determine overall matching status
  if (hasAllTrackingData && hasSupplierMatch && matchingScore >= 85) {
    return {
      status: 'complete',
      color: 'green',
      icon: CheckCircle,
      text: 'Fully Matched',
      confidence: matchingScore,
      description: 'All data complete, high-confidence supplier match'
    };
  } else if (hasAllTrackingData && hasSupplierMatch && matchingScore >= 60) {
    return {
      status: 'good',
      color: 'blue', 
      icon: Target,
      text: 'Good Match',
      confidence: matchingScore,
      description: 'Complete tracking data with decent supplier match'
    };
  } else if (hasAllTrackingData && matchingScore < 60) {
    return {
      status: 'poor-match',
      color: 'orange',
      icon: AlertTriangle, 
      text: 'Poor Match',
      confidence: matchingScore,
      description: 'Complete data but low supplier match confidence'
    };
  } else if (hasAllTrackingData && !hasSupplierMatch) {
    return {
      status: 'ready',
      color: 'yellow',
      icon: Brain,
      text: 'Ready for Matching',
      confidence: 0,
      description: 'All tracking data present, ready for supplier matching'
    };
  } else {
    return {
      status: 'incomplete',
      color: 'gray',
      icon: Search,
      text: 'Incomplete Data',
      confidence: 0,
      description: 'Missing tracking data required for matching'
    };
  }
};

const LineMatchingStatus = ({ item, formData, onNavigateToMatching }) => {
  const matchingStatus = getMatchingStatus(item);
  const StatusIcon = matchingStatus.icon;
  
  const getStatusColor = (color) => {
    const colors = {
      green: 'bg-green-100 text-green-800 border-green-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200', 
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[color] || colors.gray;
  };

  const getActionButton = () => {
    if (matchingStatus.status === 'complete' || matchingStatus.status === 'good') {
      return (
        <button
          type="button"
          onClick={() => onNavigateToMatching?.(item)}
          className="ml-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1"
          title="View matching details"
        >
          <ExternalLink size={10} />
          View
        </button>
      );
    } else if (matchingStatus.status === 'ready') {
      return (
        <button
          type="button"
          onClick={() => onNavigateToMatching?.(item, 'auto-match')}
          className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
          title="Run AI matching"
        >
          <Brain size={10} />
          Match
        </button>
      );
    } else if (matchingStatus.status === 'poor-match') {
      return (
        <button
          type="button"
          onClick={() => onNavigateToMatching?.(item, 'manual-match')}
          className="ml-2 px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center gap-1"
          title="Improve matching manually"
        >
          <Target size={10} />
          Fix
        </button>
      );
    } else {
      return (
        <button
          type="button"
          onClick={() => onNavigateToMatching?.(item, 'setup')}
          className="ml-2 px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
          title="Complete required data first"
        >
          <Search size={10} />
          Setup
        </button>
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center px-2 py-1 rounded-md text-xs border ${getStatusColor(matchingStatus.color)}`}>
        <StatusIcon size={12} className="mr-1" />
        <span className="font-medium">{matchingStatus.text}</span>
        {matchingStatus.confidence > 0 && (
          <span className="ml-1 text-xs opacity-75">
            ({matchingStatus.confidence}%)
          </span>
        )}
        {getActionButton()}
      </div>
      
      {/* Quick status indicators */}
      <div className="flex flex-wrap gap-1 text-xs">
        <span className={`px-1 rounded ${item.clientPO ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          📋 {item.clientPO ? 'PO' : 'No PO'}
        </span>
        <span className={`px-1 rounded ${item.fsProjectCode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          🏷️ {item.fsProjectCode ? 'Proj' : 'No Proj'}
        </span>
        <span className={`px-1 rounded ${item.clientItemCode ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          🔢 {item.clientItemCode ? 'Code' : 'No Code'}
        </span>
      </div>
    </div>
  );
};

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

// 🔧 ADD THE normalizeDate FUNCTION HERE:
const normalizeDate = (dateValue) => {
  try {
    // Handle various date formats that AI might extract
    if (!dateValue) {
      return new Date().toISOString().split('T')[0]; // Default to today
    }
    
    // If it's already a proper ISO string or standard format, use it
    if (typeof dateValue === 'string') {
      // Handle different date formats from AI extraction
      let normalizedDate = dateValue;
      
      // Convert dots to hyphens: "2024.10.12" -> "2024-10-12" 
      if (dateValue.includes('.')) {
        normalizedDate = dateValue.replace(/\./g, '-');
      }
      
      // Convert slashes to hyphens: "2024/10/12" -> "2024-10-12"
      if (dateValue.includes('/')) {
        normalizedDate = dateValue.replace(/\//g, '-');
      }
      
      // Try to parse the normalized date
      const parsedDate = new Date(normalizedDate);
      
      // Check if the date is valid
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split('T')[0];
      }
    }
    
    // If dateValue is already a Date object
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }
    
    // Fallback to current date
    console.warn('Could not parse date:', dateValue, 'using current date');
    return new Date().toISOString().split('T')[0];
    
  } catch (error) {
    console.error('Error normalizing date:', error, 'using current date');
    return new Date().toISOString().split('T')[0];
  }
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

const handleNavigateToMatching = useCallback((item, action = 'view') => {
  try {
    if (!item) {
      console.warn('No item provided to handleNavigateToMatching');
      return;
    }

    // Basic navigation without complex dependencies
    const itemName = item.productName || item.productCode || 'Unknown Item';
    const piNumber = formData?.piNumber || 'unknown';
    
    // Simple URL generation
    const baseUrl = window.location.origin;
    const matchingUrl = `${baseUrl}/supplier-matching?pi=${piNumber}&item=${item.id}&action=${action}`;
    
    // Open in new tab
    window.open(matchingUrl, '_blank');
    
    // Safe notification
    if (showNotification) {
      showNotification(`Opening supplier matching for ${itemName}`, 'info');
    }
  } catch (error) {
    console.error('Error in handleNavigateToMatching:', error);
    if (showNotification) {
      showNotification('Failed to open supplier matching', 'error');
    }
  }
}, []); // ✅ Empty dependency array to avoid circular references


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
  const [editingProducts, setEditingProducts] = useState({});
  const [showPOMatchingModal, setShowPOMatchingModal] = useState(false);

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

  const handleAllocationComplete = useCallback(async (allocations) => {
  try {
    console.log('✅ ALLOCATION COMPLETE: Starting enhanced update process...');
    console.log('📋 Allocations received:', allocations);
    
    if (!allocations || allocations.length === 0) {
      console.error('❌ Missing allocation data');
      showNotification('Allocation data is incomplete', 'error');
      return;
    }

    // Calculate new totals
    const newTotalAllocated = allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
    console.log('🔢 New total allocated:', newTotalAllocated);

    // Get itemId from the first allocation
    const itemId = allocations[0]?.itemId;
    if (!itemId) {
      console.error('❌ No itemId found in allocations');
      showNotification('Allocation data missing item ID', 'error');
      return;
    }

    // ✅ CRITICAL FIX: Get the current PI ID for Firestore updates
    const currentPiId = formData.id || proformaInvoice?.id;
    if (!currentPiId) {
      console.error('❌ No PI ID found for Firestore update');
      showNotification('Cannot save allocation - PI ID missing', 'error');
      return;
    }

    console.log('💾 Updating PI in Firestore:', currentPiId);

    // ✅ ENHANCEMENT: Create update function for consistent item updates
    const updateItemAllocations = (item) => {
      if (item.id === itemId) {
        const totalAllocated = newTotalAllocated;
        const receivedQty = item.receivedQty || 0;
        
        console.log('📦 Updating item with allocation data:', {
          itemId: item.id,
          productCode: item.productCode,
          received: receivedQty,
          allocated: totalAllocated,
          allocationsCount: allocations.length
        });
        
        return {
          ...item,
          allocations: allocations, // ✅ Use new allocations
          totalAllocated: totalAllocated,
          unallocatedQty: receivedQty - totalAllocated,
          lastAllocationUpdate: new Date().toISOString(),
          // ✅ CRITICAL: Add debugging fields
          hasAllocationData: true,
          allocationDebug: {
            savedAt: new Date().toISOString(),
            totalAllocated,
            allocationsCount: allocations.length
          }
        };
      }
      return item;
    };

    // ✅ CRITICAL: Update BOTH selectedProducts AND formData.items simultaneously
    const updatedSelectedProducts = selectedProducts.map(updateItemAllocations);
    const updatedFormDataItems = formData.items ? formData.items.map(updateItemAllocations) : updatedSelectedProducts;
    
    console.log('🔄 Updating selectedProducts with allocation data...');
    setSelectedProducts(updatedSelectedProducts);
    
    console.log('🔄 Updating formData.items with allocation data...');
    const updatedFormData = {
      ...formData,
      items: updatedFormDataItems, // ✅ CRITICAL: Sync formData.items with allocations
      updatedAt: new Date().toISOString()
    };
    setFormData(updatedFormData);

    // ✅ CRITICAL: Log what we're about to save to Firestore
    const itemToSave = updatedFormDataItems.find(item => item.id === itemId);
    console.log('💾 Item that will be saved to Firestore:', {
      id: itemToSave.id,
      productCode: itemToSave.productCode,
      totalAllocated: itemToSave.totalAllocated,
      allocations: itemToSave.allocations,
      hasAllocationData: itemToSave.hasAllocationData
    });

    // ✅ CRITICAL FIX: Save to Firestore IMMEDIATELY with allocation data
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      
      console.log('💾 FIRESTORE: Updating PI with allocation data...');
      
  console.log('💾 FIRESTORE: About to update PI with these details:');
  console.log('📋 PI ID:', currentPiId);
  console.log('📋 Items to save:', updatedFormDataItems.map(item => ({
    id: item.id,
    productCode: item.productCode,
    totalAllocated: item.totalAllocated,
    allocations: item.allocations?.length || 0
  })));
      
      await updateDoc(doc(db, 'proformaInvoices', currentPiId), {
        items: updatedFormDataItems,  // ✅ Use the items with allocations
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ FIRESTORE: Allocation data saved successfully');
      console.log('✅ Local state updated - status should persist after modal close');
      
      // Enhanced success message
      const targetItem = updatedFormDataItems.find(item => item.id === itemId);
      showNotification(
        `✅ Stock allocated! ${newTotalAllocated} units allocated for ${targetItem?.productName || targetItem?.productCode || 'item'}. Data saved to database.`,
        'success'
      );
      
    } catch (firestoreError) {
      console.error('❌ FIRESTORE: Error saving allocation data:', firestoreError);
      showNotification(
        '⚠️ Stock allocated locally, but failed to save to database. Please refresh and try again if status reverts.',
        'warning'
      );
    }
    
  } catch (error) {
    console.error('❌ Error in allocation complete:', error);
    showNotification('Failed to update allocation data', 'error');
  }
}, [selectedProducts, formData, proformaInvoice?.id, setSelectedProducts, setFormData, showNotification]);




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
        date: normalizeDate(proformaInvoice.date),

        //date: proformaInvoice.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        
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

      console.log('🔍 Date Processing Debug:', {
      originalDate: proformaInvoice.date,
      dateType: typeof proformaInvoice.date,
      normalizedDate: normalizeDate(proformaInvoice.date)
    });
        
   
      
      // Handle items/products array separately to ensure proper structure
    const items = proformaInvoice.items || proformaInvoice.products || [];
    console.log('🔍 LOADING ITEMS FROM FIRESTORE:', items.map(item => ({
      id: item.id,
      productCode: item.productCode,
      totalAllocated: item.totalAllocated,
      allocations: item.allocations?.length || 0,
      hasAllocationData: item.hasAllocationData,
      allKeys: Object.keys(item)
    })));

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
      isReceived: item.isReceived || false,

      // NEW: AI Matching tracking fields
  clientPO: item.clientPO || '',              // Client PO number
  clientLineItem: item.clientLineItem || '',  // Line item number  
  clientItemCode: item.clientItemCode || '',  // Client's part number
  
  // NEW: FS Portal project code
  fsProjectCode: item.fsProjectCode || '',    // FS Portal project code
  
      
      // ✅ CRITICAL: Preserve allocation data from Firestore
      allocations: item.allocations || [],
      totalAllocated: item.totalAllocated || 0,
      unallocatedQty: item.unallocatedQty || 0,
      lastAllocationUpdate: item.lastAllocationUpdate || '',
      hasAllocationData: item.hasAllocationData || false,
      allocationDebug: item.allocationDebug || null
    }));

    console.log('🔍 ITEMS AFTER PROCESSING:', itemsWithIds.map(item => ({
      id: item.id,
      productCode: item.productCode,
      totalAllocated: item.totalAllocated,
      allocations: item.allocations?.length || 0,
      hasAllocationData: item.hasAllocationData
    })));
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

  // ✅ CRITICAL: Synchronize formData.items with selectedProducts to prevent allocation data loss
useEffect(() => {
  // Only sync if selectedProducts has data and is different from formData.items
  if (selectedProducts && selectedProducts.length > 0) {
    const currentItemsJson = JSON.stringify(formData.items || []);
    const selectedProductsJson = JSON.stringify(selectedProducts);
    
    // Only update if they're actually different (prevents infinite loops)
    if (currentItemsJson !== selectedProductsJson) {
      console.log('🔄 Synchronizing formData.items with selectedProducts (allocation data sync)');
      
      setFormData(prev => ({
        ...prev,
        items: selectedProducts  // Keep formData.items synchronized with allocations
      }));
    }
  }
}, [selectedProducts]); // Only trigger when selectedProducts changes

  // ✅ NEW: Enhanced allocation persistence useEffect
useEffect(() => {
  if (selectedProducts && selectedProducts.length > 0) {
    const hasAllocations = selectedProducts.some(item => 
      item.allocations && item.allocations.length > 0
    );
    
    if (hasAllocations) {
      const currentItemsJson = JSON.stringify(formData.items || []);
      const selectedProductsJson = JSON.stringify(selectedProducts);
      
      if (currentItemsJson !== selectedProductsJson) {
        console.log('🔄 ENHANCED: Synchronizing allocation data between arrays');
        console.log('📊 Items with allocations:', selectedProducts.filter(item => 
          item.allocations && item.allocations.length > 0
        ).map(item => ({
          id: item.id,
          productCode: item.productCode,
          allocations: item.allocations?.length || 0,
          totalAllocated: item.totalAllocated || 0
        })));
        
        setFormData(prev => ({
          ...prev,
          items: selectedProducts  // Ensure allocation data persists
        }));
      }
    }
  }
}, [selectedProducts]); // Monitor selectedProducts for allocation changes
  
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

  const handleReceivingDataUpdate = useCallback((updatedPI) => {
  // Update local state only - DO NOT close modal
  setFormData(prev => ({
    ...prev,
    ...updatedPI,
    items: updatedPI.items
  }));
  
  // Update selected products to reflect receiving changes  
  setSelectedProducts(updatedPI.items);
  
  console.log('🔄 Local PI state updated - modal stays open');
}, []);

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

  const exportAIMatchingData = (piItems) => {
  const matchingData = piItems.map(item => ({
    // Supplier side (from PI)
    supplierProduct: item.productName,
    supplierCode: item.productCode,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    
    // Client side (tracking fields)
    clientPO: item.clientPO || '',
    clientLineItem: item.clientLineItem || '',
    clientItemCode: item.clientItemCode || '',
    
    // FS Portal project
    fsProjectCode: item.fsProjectCode || '',
    
    // AI matching readiness
    hasClientInfo: !!(item.clientPO || item.clientItemCode),
    hasProjectCode: !!item.fsProjectCode,
    readyForMatching: !!(item.clientPO && item.fsProjectCode)
  }));
  
  const csvContent = [
    // CSV Headers
    'PI Number,Supplier Product,Supplier Code,Quantity,Unit Price,Total Price,Client PO,Client Line Item,Client Item Code,FS Project Code,Ready for AI Matching',
    
    // CSV Rows
    ...matchingData.map(item => [
      formData.piNumber,
      `"${item.supplierProduct}"`, // Wrap in quotes for CSV safety
      item.supplierCode,
      item.quantity,
      item.unitPrice,
      item.totalPrice,
      item.clientPO,
      item.clientLineItem,
      item.clientItemCode,
      item.fsProjectCode,
      item.readyForMatching ? 'Yes' : 'No'
    ].join(','))
  ].join('\n');
  
  // Download CSV
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formData.piNumber}-ai-matching-data.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  showNotification?.('AI matching data exported successfully! 📊', 'success');
};

  const handleProductNameEdit = (index, field, value) => {
  setSelectedProducts(prev => {
    const updated = [...prev];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    return updated;
  });
};

const toggleProductEdit = (index, field) => {
  setEditingProducts(prev => ({
    ...prev,
    [`${index}-${field}`]: !prev[`${index}-${field}`]
  }));
};

const saveProductEdit = (index, field) => {
  setEditingProducts(prev => ({
    ...prev,
    [`${index}-${field}`]: false
  }));
  
  // Show confirmation
  const item = selectedProducts[index];
  showNotification?.(`Updated ${field} for ${item.productName}`, 'success');
  
  // Track AI correction for analytics
  console.log('🎯 AI Extraction Correction:', {
    field,
    productName: item.productName,
    productCode: item.productCode,
    piNumber: formData.piNumber,
    timestamp: new Date().toISOString()
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
    <div className="bg-white rounded-lg max-w-7xl w-full h-[90vh] flex flex-col overflow-hidden">
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
      {/* EXISTING: Fix Prices Button */}
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
      
      {/* EXISTING: Bulk Edit Button */}
      {selectedProducts.length > 0 && (
        <button
          type="button"
          onClick={() => {
            const anyEditing = Object.values(editingProducts).some(editing => editing);
            if (anyEditing) {
              setEditingProducts({});
              showNotification?.('Exited bulk edit mode', 'info');
            } else {
              const newEditingState = {};
              selectedProducts.forEach((_, index) => {
                newEditingState[`${index}-productName`] = true;
              });
              setEditingProducts(newEditingState);
              showNotification?.('Entered bulk edit mode - click outside inputs to save', 'info');
            }
          }}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 shadow-sm transition-all duration-200 ${
            Object.values(editingProducts).some(editing => editing)
              ? 'bg-gray-500 text-white hover:bg-gray-600'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          title={Object.values(editingProducts).some(editing => editing) ? "Exit bulk edit mode" : "Edit all product names"}
        >
          <Edit2 size={14} />
          {Object.values(editingProducts).some(editing => editing) ? 'Exit Edit' : 'Bulk Edit'}
        </button>
      )}

      {/* NEW: Export AI Matching Data Button */}
      {selectedProducts.length > 0 && (
        <button
          type="button"
          onClick={() => exportAIMatchingData(selectedProducts)}
          className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2 shadow-sm transition-all duration-200"
          title="Export data for AI matching system"
        >
          <Download size={14} />
          Export Matching Data
        </button>
      )}

      {/* NEW: Bulk FS Project Assignment */}
      {selectedProducts.length > 0 && (
        <select
          onChange={(e) => {
            if (e.target.value) {
              const updatedProducts = selectedProducts.map(item => ({
                ...item,
                fsProjectCode: e.target.value
              }));
              setSelectedProducts(updatedProducts);
              showNotification?.(`Assigned ${e.target.value} to all items`, 'success');
              e.target.value = '';
            }
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Bulk Assign FS Project...</option>
          <option value="BWS-S1046">BWS-S1046 (Graco Bumper)</option>
          <option value="FS-P1079">FS-P1079 (Forklift Control)</option>
          <option value="BWS-P1078">BWS-P1078 (Chlorine Ejector)</option>
          <option value="BWS-SV1002">BWS-SV1002 (Site Inspection)</option>
          <option value="BWS-S1043">BWS-S1043 (Pump Service)</option>
        </select>
      )}

      {errors.items && <p className="text-red-500 text-xs">{errors.items}</p>}
    </div>
  </div>

  {/* EXISTING: Price Fix Status Indicator */}
  {selectedProducts.length > 0 && (
    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 text-sm text-blue-700">
        <Calculator size={16} />
        <span className="font-medium">Smart Price Correction:</span>
        <span>Automatically validates quantity × unit price = total price</span>
      </div>
    </div>
  )}

 {/* Enhanced AI Matching Intelligence Dashboard */}
{selectedProducts.length > 0 && (
  <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-green-600" />
        <span className="font-medium text-green-800">AI Matching Intelligence Dashboard</span>
      </div>
      <button
        type="button"
        onClick={() => exportAIMatchingData(selectedProducts)}
        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
      >
        <Download size={12} />
        Export Matching Data
      </button>
    </div>
    
    {/* Status Breakdown */}
    <div className="grid grid-cols-5 gap-4 text-sm">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {selectedProducts.filter(item => getMatchingStatus(item).status === 'complete').length}
        </div>
        <div className="text-green-700 text-xs">Fully Matched</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {selectedProducts.filter(item => getMatchingStatus(item).status === 'good').length}
        </div>
        <div className="text-blue-700 text-xs">Good Matches</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">
          {selectedProducts.filter(item => getMatchingStatus(item).status === 'ready').length}
        </div>
        <div className="text-yellow-700 text-xs">Ready to Match</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-orange-600">
          {selectedProducts.filter(item => getMatchingStatus(item).status === 'poor-match').length}
        </div>
        <div className="text-orange-700 text-xs">Need Improvement</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-600">
          {selectedProducts.filter(item => getMatchingStatus(item).status === 'incomplete').length}
        </div>
        <div className="text-gray-700 text-xs">Incomplete Data</div>
      </div>
    </div>
    
    {/* Overall Progress */}
    <div className="mt-3 pt-3 border-t border-green-200">
      <div className="flex items-center justify-between text-sm">
        <span className="text-green-700 font-medium">Overall Matching Readiness:</span>
        <span className="text-green-800 font-bold">
          {Math.round((selectedProducts.filter(item => ['complete', 'good'].includes(getMatchingStatus(item).status)).length / selectedProducts.length) * 100)}%
        </span>
      </div>
      
      <div className="mt-2 w-full bg-green-200 rounded-full h-2">
        <div 
          className="bg-green-600 h-2 rounded-full transition-all duration-300"
          style={{ 
            width: `${(selectedProducts.filter(item => ['complete', 'good'].includes(getMatchingStatus(item).status)).length / selectedProducts.length) * 100}%` 
          }}
        />
      </div>
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
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full min-w-max">
                      <thead className="bg-gray-50">
  <tr>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
    {/* AI MATCHING TRACKING FIELDS */}
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client PO</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Line Item</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client Item Code</th>
    {/* FS PORTAL PROJECT CODE */}
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">FS Project Code</th>
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-60">
      Matching Status
      <span className="ml-1 text-xs text-gray-400">(AI Ready)</span>
    </th>
    <th className="px-4 py-2"></th>
  </tr>
</thead>

                      <tbody>
                       {selectedProducts.map((item, index) => (
  <tr key={item.id || index} className="border-t">
    {/* EXISTING: Enhanced Product Name/Code Cell (your current implementation) */}
    <td className="px-4 py-2">
      <div>
        {/* Your existing editable product name and code implementation */}
        {editingProducts[`${index}-productName`] ? (
          <input
            type="text"
            value={item.productName}
            onChange={(e) => handleProductNameEdit(index, 'productName', e.target.value)}
            onBlur={() => saveProductEdit(index, 'productName')}
            onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
            className="font-medium text-gray-900 bg-blue-50 border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0 flex-1"
            autoFocus
            placeholder="Product Name"
          />
        ) : (
          <div 
            className="font-medium text-gray-900 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex-1 min-w-0 flex items-center gap-2"
            onClick={() => toggleProductEdit(index, 'productName')}
            title="Click to edit product name"
          >
            <span className="truncate">{item.productName || 'Unnamed Product'}</span>
            <Edit2 size={12} className="text-gray-400 flex-shrink-0" />
          </div>
        )}
        
        {/* Editable Product Code */}
        <div className="flex items-center gap-2 mt-1">
          {editingProducts[`${index}-productCode`] ? (
            <input
              type="text"
              value={item.productCode}
              onChange={(e) => handleProductNameEdit(index, 'productCode', e.target.value)}
              onBlur={() => saveProductEdit(index, 'productCode')}
              onKeyPress={(e) => e.key === 'Enter' && e.target.blur()}
              className="text-sm text-gray-600 bg-yellow-50 border border-yellow-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yellow-500 min-w-0 flex-1"
              autoFocus
              placeholder="Product Code/SKU"
            />
          ) : (
            <div 
              className="text-sm text-gray-600 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded flex-1 min-w-0 flex items-center gap-2"
              onClick={() => toggleProductEdit(index, 'productCode')}
              title="Click to edit product code/SKU"
            >
              <span className="truncate">{item.productCode || 'No SKU'}</span>
              <Edit2 size={10} className="text-gray-400 flex-shrink-0" />
            </div>
          )}
        </div>
        
        {item.leadTime && (
          <div className="text-xs text-gray-500 mt-1">Lead time: {item.leadTime}</div>
        )}
      </div>
    </td>

    {/* EXISTING: Quantity */}
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

    {/* EXISTING: Unit Price */}
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

    {/* EXISTING: Total Price */}
    <td className="px-4 py-2 font-medium">
      <div className="flex items-center gap-2">
        <span>{formData.currency} {item.totalPrice.toFixed(2)}</span>
        {Math.abs(item.totalPrice - (item.quantity * item.unitPrice)) < 0.01 && (
          <CheckCircle size={14} className="text-green-500" title="Price calculation verified" />
        )}
      </div>
    </td>

    {/* NEW: Client PO Number */}
    <td className="px-4 py-2">
      <ClientPOInput
        value={item.clientPO || ''}
        onChange={(value) => handleUpdateItem(index, 'clientPO', value)}
        index={index}
        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="PO-2025-001"
      />
    </td>

    {/* NEW: Client Line Item */}
    <td className="px-4 py-2">
      <input
        type="text"
        value={item.clientLineItem || ''}
        onChange={(e) => handleUpdateItem(index, 'clientLineItem', e.target.value)}
        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="LINE-01"
        title="Line item number in client PO"
      />
    </td>

    {/* NEW: Client Item Code */}
    <td className="px-4 py-2">
      <input
        type="text"
        value={item.clientItemCode || ''}
        onChange={(e) => handleUpdateItem(index, 'clientItemCode', e.target.value)}
        className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="400SHA0162"
        title="Client's part number/item code"
      />
    </td>

    {/* NEW: FS Portal Project Code */}
    <td className="px-4 py-2">
      <FSPortalProjectInput
        value={item.fsProjectCode || ''}
        onChange={(value) => handleUpdateItem(index, 'fsProjectCode', value)}
        className="w-40 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="BWS-S1046..."
      />
    </td>

    
    
    {/* EXISTING: Remove Button */}
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
  onReceivingDataUpdate={handleReceivingDataUpdate} 
  suppliers={suppliers}
  showNotification={showNotification}
  onAllocationComplete={handleAllocationComplete}
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
  onReceivingDataUpdate,
  suppliers, 
  showNotification,
  onAllocationComplete
}) => {

  // ✅ ADD THIS LINE to enable detailed debugging
  useEffect(() => {
    localStorage.setItem('piDebugMode', 'true');
    return () => localStorage.removeItem('piDebugMode');
  }, []);
  

  // Log the actual PI structure
  useEffect(() => {
  console.log('🔍 PI Object Structure:', pi?.id, pi?.piNumber);
}, [pi?.id]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [receivingForm, setReceivingForm] = useState({});

    const [skipFormInit, setSkipFormInit] = useState(false);

 

useEffect(() => {
    console.log('🔍 RECEIVING FORM STATE CHANGED:', {
      totalItems: Object.keys(receivingForm).length,
      sampleItem: Object.keys(receivingForm)[0] ? {
        id: Object.keys(receivingForm)[0],
        data: receivingForm[Object.keys(receivingForm)[0]]
      } : 'No items',
      allItems: receivingForm // Full form state for debugging
    });
  }, [receivingForm]);

  useEffect(() => {
    if (Object.keys(receivingForm).length === 0 && pi?.items?.length > 0) {
      console.log('🚨 FORM WAS CLEARED! Stack trace:');
      console.trace();
    }
  }, [receivingForm]);

  
  // Initialize receiving form data
  useEffect(() => {
  // Only initialize if ALL conditions are met AND we don't have current form data
  const shouldInitialize = pi && 
                          pi.items && 
                          pi.items.length > 0 && 
                          Object.keys(receivingForm).length === 0 && 
                          !skipFormInit;
  
  if (shouldInitialize) {
    console.log('🔄 Initializing form with PI data (including saved receiving data)...');
    const formData = {};
    pi.items.forEach(item => {
      formData[item.id] = {
        // ✅ CRITICAL FIX: Use saved receivedQty from database, not ordered quantity
        receivedQty: item.receivedQty || 0, // Use saved value instead of defaulting to item.quantity
        receivingNotes: item.receivingNotes || '',
        hasDiscrepancy: item.hasDiscrepancy || false,
        discrepancyReason: item.discrepancyReason || ''
      };
    });
    setReceivingForm(formData);
    console.log('📋 Form initialized with saved receiving data:', formData);
  } else {
    console.log('🔒 Skipping form initialization - preserving current state');
  }
}, [pi?.id, skipFormInit]);

  useEffect(() => {
    if (pi?.items) {
      console.log('📊 CURRENT ALLOCATION STATE:', pi.items.map(item => ({
        id: item.id,
        productCode: item.productCode,
        allocations: item.allocations?.length || 0,
        totalAllocated: item.totalAllocated || 0,
        unallocated: item.unallocatedQty || 0,
        lastReset: item.lastAllocationReset || 'never'
      })));
    }
  }, [pi?.items?.map(item => `${item.id}:${item.totalAllocated || 0}`).join(',')]);



  const handleReceivingUpdate = (itemId, field, value) => {
    setReceivingForm(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };
const handleSetAllAsReceived = async () => {
  if (pi && pi.items) {
    setSkipFormInit(true);  // Prevent form reinitialization

    const updatedForm = {};
    pi.items.forEach(item => {
      updatedForm[item.id] = {
        ...receivingForm[item.id],
        receivedQty: item.quantity // Set to ordered quantity
      };
    });

    console.log('🔍 BULK SET - Setting all items to received and saving to database...');
    
    setReceivingForm(updatedForm);
    
    // ✅ CRITICAL: Save to database immediately (this was missing!)
    await bulkSaveReceivingData(updatedForm);
    
    setTimeout(() => setSkipFormInit(false), 100);
    
    showNotification('All items set as fully received and saved to database', 'success');
  }
};
  
const handleClearAllReceived = async () => {
  if (pi && pi.items) {
    setSkipFormInit(true);  // Prevent form reinitialization

    const updatedForm = {};
    pi.items.forEach(item => {
      updatedForm[item.id] = {
        ...receivingForm[item.id],
        receivedQty: 0 // Clear all received quantities
      };
    });

    console.log('🔍 BULK CLEAR - Clearing form and saving to database...');
    
    setReceivingForm(updatedForm);
    
    // ✅ CRITICAL: Save to database immediately
    await bulkSaveReceivingData(updatedForm);
    
    setTimeout(() => setSkipFormInit(false), 100);
    
    showNotification('All received quantities cleared and saved to database', 'success');
  }
};

// ✅ ADD this new function right after handleClearAllReceived:
const bulkSaveReceivingData = async (formData = null) => {
  try {
    const dataToSave = formData || receivingForm;
    
    // Update all PI items with the new receiving data
    const updatedItems = pi.items.map(item => {
      const receivingData = dataToSave[item.id];
      if (receivingData) {
        const receivedQty = receivingData.receivedQty || 0;
        const orderedQty = item.quantity;
        const difference = receivedQty - orderedQty;
        
        return {
          ...item,
          receivedQty: receivedQty,
          receivingNotes: receivingData.receivingNotes || '',
          hasDiscrepancy: receivingData.hasDiscrepancy || difference !== 0,
          discrepancyReason: difference !== 0 ? `Quantity difference: ${difference > 0 ? '+' : ''}${difference}` : receivingData.discrepancyReason || ''
        };
      }
      return item;
    });

    const updatedPI = {
      ...pi,
      items: updatedItems,
      lastModified: new Date().toISOString(),
      modifiedBy: 'current-user' // You might want to use actual user ID
    };
// ✅ CRITICAL FIX: Save to Firestore IMMEDIATELY 
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      
      console.log('💾 FIRESTORE: Saving bulk receiving data immediately...');
      
      await updateDoc(doc(db, 'proformaInvoices', pi.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      
      console.log('✅ FIRESTORE: Bulk receiving data saved to database');
      
    } catch (firestoreError) {
      console.error('❌ FIRESTORE: Error saving bulk data:', firestoreError);
      showNotification('Error saving to database', 'error');
      throw firestoreError;
    }

    // ✅ Update local state AFTER successful database save
    if (onReceivingDataUpdate) {
      onReceivingDataUpdate(updatedPI);
      console.log('🔄 Bulk receiving data saved - modal stays open');
    } else {
      console.error('❌ onReceivingDataUpdate prop missing! Modal will close.');
      await onUpdatePI(updatedPI);  // Fallback but will close modal
    }
    
  } catch (error) {
    console.error('❌ Error in bulk save:', error);
    showNotification('Error saving receiving data', 'error');
    throw error;
  }
};
 const saveReceivingData = async (itemId) => {
  try {
    const receivingData = receivingForm[itemId];
    
    if (!receivingData) {
      console.warn('No receiving data found for item:', itemId);
      showNotification('No changes to save', 'info');
      return;
    }
    
    console.log('💾 SAVING INDIVIDUAL RECEIVING DATA:', {
      itemId,
      receivedQty: receivingData.receivedQty,
      notes: receivingData.receivingNotes
    });
    
    // Update the PI item with receiving data
    const updatedItems = pi.items.map(item => {
      if (item.id === itemId) {
        const receivedQty = receivingData.receivedQty || 0;
        const orderedQty = item.quantity || 0;
        const difference = receivedQty - orderedQty;
        
        return {
          ...item,
          // ✅ CRITICAL: Update all receiving fields
          receivedQty: receivedQty,
          receivingNotes: receivingData.receivingNotes || '',
          hasDiscrepancy: receivingData.hasDiscrepancy || difference !== 0,
          discrepancyReason: difference !== 0 ? 
            `Quantity difference: ${difference > 0 ? '+' : ''}${difference}` : 
            (receivingData.discrepancyReason || ''),
          difference: difference,
          receivedDate: new Date().toISOString().split('T')[0],
          unallocatedQty: receivedQty - (item.totalAllocated || 0),
          // ✅ Add metadata for tracking
          lastReceivingUpdate: new Date().toISOString(),
          receivingStatus: receivedQty === 0 ? 'pending' : 
                          receivedQty === orderedQty ? 'complete' : 'partial'
        };
      }
      return item;
    });

    // ✅ CRITICAL FIX: Save to Firestore IMMEDIATELY (this was missing!)
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../services/firebase');
      
      console.log('💾 FIRESTORE: Saving individual receiving data to database...');
      
      await updateDoc(doc(db, 'proformaInvoices', pi.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString(),
        lastReceivingDataUpdate: new Date().toISOString()
      });
      
      console.log('✅ FIRESTORE: Individual receiving data persisted successfully');
      
    } catch (firestoreError) {
      console.error('❌ FIRESTORE: Error saving individual receiving data:', firestoreError);
      showNotification('Error saving to database. Changes may be lost.', 'error');
      throw firestoreError;
    }

    // ✅ Update local state AFTER successful database save
    const updatedPI = {
      ...pi,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };
    
    // ✅ Use local update to keep modal open
    if (onReceivingDataUpdate) {
      onReceivingDataUpdate(updatedPI);
      console.log('🔄 Individual receiving data saved - modal stays open');
    } else {
      console.error('❌ onReceivingDataUpdate missing! Using fallback.');
      await onUpdatePI(updatedPI);  // Fallback but might close modal
    }
    
    // ✅ Enhanced success message
    const updatedItem = updatedItems.find(item => item.id === itemId);
    showNotification(
      `✅ Receiving data saved to database: ${updatedItem?.productCode} - ${receivingData.receivedQty} units received`,
      'success'
    );
    
  } catch (error) {
    console.error('❌ Error saving individual receiving data:', error);
    showNotification('Failed to save receiving data to database', 'error');
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



const resetItemAllocations = async (itemId) => {
  try {
    console.log('🔄 Resetting allocations for SPECIFIC item:', itemId);
    
    // ✅ STEP 1: Find and validate the specific item
    const targetItem = pi.items.find(item => item.id === itemId);
    if (!targetItem) {
      console.error('❌ Item not found:', itemId);
      showNotification('Item not found for reset', 'error');
      return;
    }

    // ✅ STEP 2: Get allocation details BEFORE reset for stock reversal
    const allocationsToReverse = targetItem.allocations || [];
    const totalAllocatedToReverse = targetItem.totalAllocated || 
      allocationsToReverse.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
    
    console.log('🧹 Clearing allocations for SPECIFIC item:', {
      itemId: targetItem.id,
      productCode: targetItem.productCode,
      productName: targetItem.productName,
      previousAllocations: allocationsToReverse.length,
      previousTotalAllocated: totalAllocatedToReverse,
      allocationsToReverse: allocationsToReverse
    });

    // ✅ STEP 3: Reverse stock levels FIRST, BEFORE updating PI
    if (totalAllocatedToReverse > 0 && targetItem.productCode) {
      console.log('📦 Reversing product stock levels for:', targetItem.productCode);
      
      try {
        const stockReversalResult = await reverseProductStockLevels({
          productCode: targetItem.productCode,
          quantity: totalAllocatedToReverse,
          allocations: allocationsToReverse,
          reason: 'User reset - allocation correction',
          piId: pi.id || pi.piNumber,
          itemId: targetItem.id
        });
        
        if (!stockReversalResult.success) {
          throw new Error(`Stock reversal failed: ${stockReversalResult.error}`);
        }
        
        console.log('✅ Product stock levels reversed successfully');
        console.log('📊 Stock reversal details:', stockReversalResult.reversalDetails);
        
      } catch (stockError) {
        console.error('❌ CRITICAL: Stock reversal failed:', stockError);
        showNotification(`Failed to reverse stock levels: ${stockError.message}`, 'error');
        return; // Don't proceed with PI update if stock reversal fails
      }
    }

    // ✅ STEP 4: Update ONLY the target item, preserve all others exactly as they are
    const updatedItems = pi.items.map(item => {
      if (item.id === itemId) {
        // Reset ONLY this specific item
        return {
          ...item, // Preserve all existing item properties
          allocations: [], // Clear allocations for THIS item only
          totalAllocated: 0, // Reset total for THIS item only
          unallocatedQty: item.receivedQty || 0, // Reset to full received quantity for THIS item only
          lastAllocationReset: new Date().toISOString(), // Mark when THIS item was reset
          resetHistory: [...(item.resetHistory || []), {
            resetAt: new Date().toISOString(),
            reversedAllocations: allocationsToReverse,
            reversedQuantity: totalAllocatedToReverse,
            reason: 'User correction'
          }]
        };
      }
      // ✅ CRITICAL: Return all other items COMPLETELY UNCHANGED
      return item; // No modifications to other items
    });

    // ✅ STEP 5: Create minimal PI update that preserves everything else
    const updatedPI = {
      ...pi, // Preserve ALL existing PI properties
      items: updatedItems, // Only update the items array
      updatedAt: new Date().toISOString()
      // Don't set lastAllocationReset on entire PI - only on specific item
    };

    console.log('💾 Updating PI with reset for SPECIFIC item only:', {
      piId: pi.id || pi.piNumber,
      resetItemId: itemId,
      resetItemProduct: targetItem.productCode,
      totalItemsInPI: updatedItems.length,
      otherItemsUnchanged: updatedItems.filter(item => item.id !== itemId).length
    });

    // ✅ STEP 6: Update Firestore and local state
    try {
      // ✅ Import all required Firestore functions with correct path
      const { updateDoc, doc, collection, query, where, getDocs, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../../config/firebase'); // ✅ CORRECT PATH
      
      console.log('💾 Updating Firestore PI document...');
      
      // Update Firestore PI document
      await updateDoc(doc(db, 'proformaInvoices', pi.id), {
        items: updatedItems,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Firestore PI updated with reset allocations');

      // Delete allocation records from Firestore
      console.log('🗑️ Deleting allocation records...');
      const allocationsRef = collection(db, 'stockAllocations');
      const allocationsQuery = query(
        allocationsRef, 
        where('piId', '==', pi.id),
        where('itemId', '==', itemId)
      );
      const allocationsSnapshot = await getDocs(allocationsQuery);
      
      for (const allocationDoc of allocationsSnapshot.docs) {
        await deleteDoc(allocationDoc.ref);
        console.log('🗑️ Deleted allocation record:', allocationDoc.id);
      }
      
      console.log('✅ All Firestore operations completed successfully');

    } catch (firestoreError) {
      console.error('❌ Error updating Firestore:', firestoreError);
      throw new Error(`Firestore update failed: ${firestoreError.message}`);
    }

    // ✅ STEP 7: Update local state (use local update to prevent modal closure)
    if (onReceivingDataUpdate) {
      onReceivingDataUpdate(updatedPI);
      console.log('✅ Local state updated - modal stays open');
    } else {
      // Fallback to full update if local update not available
      await onUpdatePI(updatedPI);
    }
    
    // ✅ STEP 8: Enhanced success message with stock reversal info
    showNotification(
      `Allocations reset for ${targetItem.productName} (${targetItem.productCode}). ` +
      `${totalAllocatedToReverse} units reversed from stock and are now available for reallocation.`,
      'success'
    );
    
    // ✅ STEP 9: Force UI refresh for the specific item only
    setTimeout(() => {
      setReceivingForm(prev => ({ 
        ...prev, 
        [`${itemId}_reset`]: Date.now() // Update only this item's form state
      }));
    }, 100);

  } catch (error) {
    console.error('❌ CRITICAL ERROR in resetItemAllocations:', error);
    showNotification(`Failed to reset allocations: ${error.message}`, 'error');
  }
};

  // ✅ CRITICAL FIX: Fixed the Firestore import path in reverseProductStockLevels function

// ✅ CRITICAL FIX 1: Correct import path and enhanced error handling
const reverseProductStockLevels = async ({ 
  productCode, 
  quantity, 
  allocations, 
  reason, 
  piId, 
  itemId 
}) => {
  try {
    console.log('🔄 Reversing stock allocation for specific product:', {
      productCode,
      quantity,
      allocations: allocations.length,
      reason
    });

    // ✅ CRITICAL FIX: Import from config/firebase, not services/firebase
    const { collection, query, where, getDocs, updateDoc, arrayUnion } = await import('firebase/firestore');
    const { db } = await import('../../config/firebase'); // ✅ FIXED PATH

    // Find the product in Firestore
    const productsRef = collection(db, 'products');
    const productQuery = query(productsRef, where('sku', '==', productCode));
    const productSnapshot = await getDocs(productQuery);
    
    if (productSnapshot.empty) {
      console.warn('⚠️ Product not found for stock reversal:', productCode);
      throw new Error(`Product not found for stock reversal: ${productCode}`);
    }

    const productDoc = productSnapshot.docs[0];
    const product = productDoc.data();
    
    console.log('📦 Found product for stock reversal:', {
      id: productDoc.id,
      name: product.name,
      sku: product.sku,
      currentStock: product.currentStock || 0,
      allocatedStock: product.allocatedStock || 0
    });

    // ✅ ENHANCED: Calculate stock reversal amounts by allocation type
    let warehouseReversals = 0;
    let reservedReversals = 0;

    console.log('🔍 Analyzing allocations for reversal:', allocations);
    
    allocations.forEach(allocation => {
      console.log('📊 Processing allocation:', {
        type: allocation.allocationType,
        quantity: allocation.quantity,
        target: allocation.targetName
      });
      
      if (allocation.allocationType === 'warehouse') {
        warehouseReversals += allocation.quantity;
      } else if (allocation.allocationType === 'po' || allocation.allocationType === 'project') {
        reservedReversals += allocation.quantity;
      }
    });

    // ✅ CRITICAL FIX: Correct stock reversal logic
    const currentTotalStock = product.currentStock || 0;
    const currentAllocatedStock = product.allocatedStock || 0;
    
    // ✅ CORRECT LOGIC: 
    // - Warehouse allocations INCREASED currentStock, so we DECREASE on reset
    // - Reserved allocations INCREASED allocatedStock, so we DECREASE on reset
    const newTotalStock = Math.max(0, currentTotalStock - warehouseReversals);
    const newAllocatedStock = Math.max(0, currentAllocatedStock - reservedReversals);
    const newAvailableStock = newTotalStock - newAllocatedStock;

    console.log('📊 CORRECTED Stock reversal calculation:', {
      productCode,
      allocationsAnalysis: {
        warehouseAllocations: warehouseReversals,
        reservedAllocations: reservedReversals,
        totalToReverse: warehouseReversals + reservedReversals
      },
      stockChanges: {
        currentStock: `${currentTotalStock} → ${newTotalStock} (${warehouseReversals > 0 ? '-' : ''}${warehouseReversals})`,
        allocatedStock: `${currentAllocatedStock} → ${newAllocatedStock} (${reservedReversals > 0 ? '-' : ''}${reservedReversals})`,
        availableStock: `${currentTotalStock - currentAllocatedStock} → ${newAvailableStock}`
      }
    });

    // ✅ CRITICAL: Validate the reversal makes sense
    if (warehouseReversals > currentTotalStock) {
      console.error('❌ CRITICAL: Trying to reverse more warehouse stock than available:', {
        trying_to_reverse: warehouseReversals,
        current_stock: currentTotalStock
      });
      throw new Error(`Cannot reverse ${warehouseReversals} units - only ${currentTotalStock} available in stock`);
    }
    
    if (reservedReversals > currentAllocatedStock) {
      console.error('❌ CRITICAL: Trying to reverse more reserved stock than allocated:', {
        trying_to_reverse: reservedReversals,
        current_allocated: currentAllocatedStock
      });
      throw new Error(`Cannot reverse ${reservedReversals} reserved units - only ${currentAllocatedStock} allocated`);
    }

    // ✅ CRITICAL FIX: Enhanced Firestore update with retry logic
    console.log('💾 Updating product stock levels in Firestore...');
    
    const updateData = {
      stock: newTotalStock, 
      currentStock: newTotalStock,
      allocatedStock: newAllocatedStock,
      availableStock: newAvailableStock,
      lastStockUpdate: new Date().toISOString(),
      stockHistory: arrayUnion({
        action: 'ALLOCATION_REVERSAL',
        quantity: -quantity, // Negative for reversal
        piId: piId,
        itemId: itemId,
        productCode: productCode,
        reason: reason,
        timestamp: new Date().toISOString(),
        reversedAllocations: allocations,
        stockChanges: {
          warehouseReversed: -warehouseReversals,
          reservedReversed: -reservedReversals,
          totalStockBefore: currentTotalStock,
          totalStockAfter: newTotalStock,
          allocatedStockBefore: currentAllocatedStock,
          allocatedStockAfter: newAllocatedStock
        }
      })
    };

    console.log('🔍 About to update Firestore with:', updateData);
    
    try {
      await updateDoc(productDoc.ref, updateData);
      console.log('✅ Firestore update completed successfully');
    } catch (updateError) {
      console.error('❌ FIRESTORE UPDATE FAILED:', updateError);
      console.error('Product reference:', productDoc.ref);
      console.error('Update data:', updateData);
      throw new Error(`Firestore update failed: ${updateError.message}`);
    }

    // ✅ VERIFICATION: Re-fetch the product to confirm the update
    const verificationSnapshot = await getDocs(productQuery);
    if (!verificationSnapshot.empty) {
      const updatedProduct = verificationSnapshot.docs[0].data();
      console.log('🔍 VERIFICATION: Stock levels after update:', {
        currentStock: updatedProduct.currentStock,
        allocatedStock: updatedProduct.allocatedStock,
        availableStock: updatedProduct.availableStock
      });
      
      // Double-check that the update actually worked
      if (updatedProduct.currentStock !== newTotalStock) {
        console.error('❌ VERIFICATION FAILED: Stock update did not persist');
        throw new Error(`Stock update verification failed. Expected ${newTotalStock}, got ${updatedProduct.currentStock}`);
      }
    }

    console.log('✅ Product stock levels reversed successfully for:', productCode);
    console.log('📊 Final verified stock levels:', {
      currentStock: newTotalStock,
      allocatedStock: newAllocatedStock,
      availableStock: newAvailableStock
    });
    
    return {
      success: true,
      productCode,
      reversalDetails: {
        warehouseReversed: warehouseReversals,
        reservedReversed: reservedReversals,
        finalStock: newTotalStock,
        finalAllocated: newAllocatedStock,
        finalAvailable: newAvailableStock
      }
    };

  } catch (error) {
    console.error('❌ CRITICAL ERROR in reverseProductStockLevels:', error);
    console.error('Error details:', {
      productCode,
      quantity,
      allocationsCount: allocations?.length,
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    // Re-throw with enhanced error message
    throw new Error(`Stock reversal failed for ${productCode}: ${error.message}`);
  }
};
  
 const getItemStatus = useCallback((item, itemFormData = {}) => {
  // ✅ CRITICAL: Prioritize form data, fallback to saved database data
  const received = itemFormData.receivedQty !== undefined 
    ? itemFormData.receivedQty 
    : (item.receivedQty || 0);
  const ordered = item.quantity || 0;
  
  // ✅ ENHANCED: Multi-strategy allocation calculation with debugging
  let allocated = 0;
  
  // Strategy 1: Use totalAllocated field (most reliable)
  if (typeof item.totalAllocated === 'number' && item.totalAllocated >= 0) {
    allocated = item.totalAllocated;
    console.log(`📊 Status calc for ${item.productCode}: Using totalAllocated = ${allocated}`);
  }
  // Strategy 2: Calculate from allocations array
  else if (item.allocations && Array.isArray(item.allocations) && item.allocations.length > 0) {
    allocated = item.allocations.reduce((sum, alloc) => sum + (parseFloat(alloc.quantity) || 0), 0);
    console.log(`📊 Status calc for ${item.productCode}: Calculated from allocations = ${allocated}`);
  }
  // Strategy 3: Check for legacy allocation data
  else if (item.allocation && typeof item.allocation === 'number') {
    allocated = item.allocation;
    console.log(`📊 Status calc for ${item.productCode}: Using legacy allocation = ${allocated}`);
  }
  // Strategy 4: Check if status was explicitly set
  else if (item.status === 'complete' || item.status === 'COMPLETED') {
    // If status is explicitly COMPLETED, assume fully allocated
    allocated = received;
    console.log(`📊 Status calc for ${item.productCode}: Status override, setting allocated = ${allocated}`);
  }
  else {
    allocated = 0;
    console.log(`📊 Status calc for ${item.productCode}: No allocation data found, using 0`);
  }
  
  // ✅ ENHANCED: Status calculation with explicit debugging
  console.log(`🔍 Status calculation for ${item.productCode}:`, {
    received,
    ordered, 
    allocated,
    totalAllocatedField: item.totalAllocated,
    allocationsArray: item.allocations?.length || 0,
    allocationsSum: item.allocations?.reduce((sum, alloc) => sum + (parseFloat(alloc.quantity) || 0), 0) || 0,
    explicitStatus: item.status,
    formReceivedQty: itemFormData.receivedQty,
    savedReceivedQty: item.receivedQty
  });
  
  // ✅ CRITICAL: Enhanced debug logging for persistence tracking
  console.log(`🔍 FORM STATE DEBUG for ${item.productCode}:`, {
    itemFormReceivedQty: itemFormData.receivedQty,
    itemSavedReceivedQty: item.receivedQty,
    itemFormExists: !!itemFormData,
    formStateKeys: Object.keys(itemFormData),
    usingFormData: itemFormData.receivedQty !== undefined,
    finalReceivedValue: received
  });
  
  // Status logic with clearer conditions
  if (received === 0) {
    console.log(`   → Status: PENDING (no items received)`);
    return { status: 'pending', color: 'gray', icon: Clock };
  }
  
  if (received !== ordered) {
    console.log(`   → Status: DISCREPANCY (received ${received} ≠ ordered ${ordered})`);
    return { status: 'discrepancy', color: 'yellow', icon: AlertTriangle };
  }
  
  // ✅ CRITICAL FIX: More precise allocation comparison
  if (allocated >= received) {
    console.log(`   → Status: COMPLETE (allocated ${allocated} >= received ${received})`);
    return { status: 'complete', color: 'green', icon: CheckCircle };
  }
  
  if (allocated > 0) {
    console.log(`   → Status: PARTIAL ALLOCATION (allocated ${allocated} < received ${received})`);
    return { status: 'partial-allocation', color: 'orange', icon: Package };
  }
  
  console.log(`   → Status: PARTIAL ALLOCATION (no allocations, but received ${received})`);
  return { status: 'partial-allocation', color: 'orange', icon: Package };
}, []); // Empty dependency array prevents infinite re-renders
  
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

      {/* Bulk Actions */}
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Quick Actions: {pi.items?.reduce((sum, item) => sum + (receivingForm[item.id]?.receivedQty || 0), 0) || 0} / {pi.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} items received
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSetAllAsReceived}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            disabled={pi.items?.every(item => receivingForm[item.id]?.receivedQty === item.quantity)}
          >
            Set All as Received
          </button>
          <button
            onClick={handleClearAllReceived}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            disabled={pi.items?.every(item => (receivingForm[item.id]?.receivedQty || 0) === 0)}
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
      
      {/* Items List */}
      <div className="space-y-4">
        {pi.items && pi.items.map(item => {
          const itemForm = receivingForm[item.id] || {};
          const itemStatus = getItemStatus(item, itemForm);
      // Add this debug log:
console.log(`🔍 FORM STATE DEBUG for ${item.productCode}:`, {
  itemFormReceivedQty: itemForm.receivedQty,
  itemSavedReceivedQty: item.receivedQty,
  itemFormExists: !!itemForm,
  formStateKeys: Object.keys(itemForm),
  statusResult: itemStatus.status
});
          const StatusIcon = itemStatus.icon;

            console.log('🎨 Rendering status badge:', item.productCode, itemStatus);

          
          return (
            <div key={item.id} className="border border-gray-200 rounded-lg p-6 bg-white">
              {/* Item Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.productName}</h4>
                  <p className="text-sm text-gray-600">{item.productCode}</p>
                </div>
                <div className="flex items-center">
  <StatusIcon className={`h-5 w-5 mr-2 ${
    itemStatus.color === 'gray' ? 'text-gray-500' :
    itemStatus.color === 'yellow' ? 'text-yellow-500' :
    itemStatus.color === 'orange' ? 'text-orange-500' :
    itemStatus.color === 'green' ? 'text-green-500' :
    'text-gray-500'
  }`} />
  <span className={`text-sm font-medium capitalize ${
    itemStatus.color === 'gray' ? 'text-gray-700' :
    itemStatus.color === 'yellow' ? 'text-yellow-700' :
    itemStatus.color === 'orange' ? 'text-orange-700' :
    itemStatus.color === 'green' ? 'text-green-700' :
    'text-gray-700'
  }`}>
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
    {/* ✅ Show when using default value */}
    {(itemForm.receivedQty === item.quantity) && (
      <span className="text-xs text-green-600 ml-1">(default)</span>
    )}
  </label>
  <div className="relative">
    <input
      type="number"
      min="0"
      value={itemForm.receivedQty !== undefined ? itemForm.receivedQty : ''}  // ✅ Handle undefined properly
  onChange={(e) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : Math.max(0, parseInt(value, 10) || 0);
    handleReceivingUpdate(item.id, 'receivedQty', numValue);
  }}
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
  placeholder="0"
/>
    {/* ✅ Quick action button to reset to default */}
    {itemForm.receivedQty !== item.quantity && (
      <button
        type="button"
        onClick={() => handleReceivingUpdate(item.id, 'receivedQty', item.quantity)}
        className="absolute right-1 top-1 bottom-1 px-2 text-xs text-blue-600 hover:bg-blue-50 rounded"
        title={`Set to ordered qty (${item.quantity})`}
      >
        ↺
      </button>
    )}
  </div>
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
    type="button"
    onClick={() => saveReceivingData(item.id)}
    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
  >
    <CheckCircle className="mr-2 h-4 w-4" />
    Save Receiving Data
  </button>

  <div className="flex items-center gap-2">
    {/* Enhanced Reset Button with Item-Specific Confirmation and Stock Reversal Info */}
  {(itemForm.receivedQty || item.receivedQty || 0) > 0 && 
 (item.allocations && item.allocations.length > 0) && (
  <button
    onClick={() => {
      // Enhanced confirmation with specific item details and stock impact
      const allocationsCount = item.allocations ? item.allocations.length : 0;
      const totalAllocated = item.totalAllocated || 
        (item.allocations ? item.allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0) : 0);
      
      const confirmMessage = 
        `Reset all allocations for ${item.productName} (${item.productCode})?\n\n` +
        `This will:\n` +
        `• Clear ${allocationsCount} allocation(s) totaling ${totalAllocated} units\n` +
        `• Reverse stock levels in the Products database\n` +
        `• Make ${totalAllocated} units available for reallocation\n` +
        `• Keep all other items unchanged\n\n` +
        `This cannot be undone.`;
        
      if (window.confirm(confirmMessage)) {
        resetItemAllocations(item.id);
      }
    }}
    className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center text-sm"
    type="button"
    title={`Reset allocations for ${item.productName} only and reverse stock levels`}
  >
    <X className="mr-1 h-3 w-3" />
    Reset {item.productCode}
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
          pi={pi}
          piId={pi.id || pi.piNumber || 'temp-pi-id'}

          itemData={selectedItem}
          onAllocationComplete={onAllocationComplete}
        />
      )}
    </div>
  );
};


export default PIModal;
