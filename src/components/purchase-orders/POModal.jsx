// src/components/purchase-orders/POModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Info, TrendingUp, Users, Package, CreditCard, Loader2, Building2, ChevronDown, ChevronUp, Plus, Trash2, Calculator } from 'lucide-react';
import { AIExtractionService, ValidationService } from "../../services/ai";
import SupplierMatchingDisplay from '../supplier-matching/SupplierMatchingDisplay';
// ✅ NEW: Add DocumentViewer import
import DocumentViewer from '../common/DocumentViewer';

// ✅ NEW: Product Code Extraction Utility
const extractProductCodeFromName = (productName) => {
  if (!productName) return '';
  
  // Common patterns for product codes/part numbers/SKUs
  const patterns = [
    // Pattern 1: Alphanumeric codes in parentheses: "SIMATIC S7-400 (6ES7407-0KA02-0AA0)"
    /\(([A-Z0-9\-\.]{5,})\)/i,
    
    // Pattern 2: Standalone alphanumeric codes: "400QCR1068", "200RTG0522"
    /\b([A-Z]{2,4}[0-9]{2,}[A-Z0-9]*)\b/i,
    
    // Pattern 3: Dash-separated codes: "6XV1830-3EH10", "6SE7031-8EF84-1JC2"
    /\b([A-Z0-9]{2,}-[A-Z0-9\-]{4,})\b/i,
    
    // Pattern 4: Model numbers: "RUT240", "S7-400", "PS407"
    /\b([A-Z]{2,}[0-9]+[A-Z]*)\b/i,
    
    // Pattern 5: Part numbers with special chars: "3SE5162-0UB01-1AM4"
    /\b([0-9][A-Z0-9\-]{6,})\b/i
  ];
  
  for (const pattern of patterns) {
    const match = productName.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return '';
};

// ✅ ENHANCED: Price Fixing Functions (keep existing)
const fixPOItemPrices = (items, debug = true) => {
  if (!items || !Array.isArray(items)) {
    console.warn('No valid items array provided to fixPOItemPrices');
    return [];
  }

  if (debug) {
    console.log('🔧 FIXING PO ITEM PRICES...');
    console.log('Original items:', items);
  }

  return items.map((item, index) => {
    const originalItem = { ...item };
    
    // ✅ CRITICAL DEBUG: Log BEFORE processing
    if (debug) {
      console.log(`🔍 BEFORE processing item ${index + 1}:`, {
        clientItemCode: originalItem.clientItemCode,
        productCode: originalItem.productCode,
        productName: originalItem.productName?.substring(0, 30) + '...'
      });
    }
    
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const totalPrice = parseFloat(item.totalPrice) || 0;
    
    // ✅ CRITICAL FIX: Start with ALL original fields
    let fixedItem = { ...originalItem };

    // [Keep all your existing Strategy 1-5 code exactly as is]
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
      fixedItem.unitPrice = totalPrice;
      fixedItem.quantity = 1;
      if (debug) console.log(`  ✅ Fixed: Set unit price to total and quantity to 1`);
    }
    // Strategy 5: Default missing values
    else {
      if (fixedItem.quantity === 0 || !fixedItem.quantity) fixedItem.quantity = 1;
      if (fixedItem.unitPrice === 0 || !fixedItem.unitPrice) fixedItem.unitPrice = 0;
      if (fixedItem.totalPrice === 0 || !fixedItem.totalPrice) {
        fixedItem.totalPrice = fixedItem.quantity * fixedItem.unitPrice;
      }
    }

    // ✅ CRITICAL FIX: Explicitly preserve clientItemCode and other important fields
if (originalItem.clientItemCode) {
  fixedItem.clientItemCode = originalItem.clientItemCode;
  if (debug) {
    console.log(`🔍 Preserving clientItemCode for item ${index + 1}:`, originalItem.clientItemCode);
  }
} else if (debug) {
  console.log(`⚠️ WARNING: No clientItemCode found in originalItem for item ${index + 1}`);
  console.log(`Original item keys:`, Object.keys(originalItem));
}

// ✅ Also preserve other important fields that might get lost
if (originalItem.productCode && !fixedItem.productCode) {
  fixedItem.productCode = originalItem.productCode;
}

// ✅ CRITICAL DEBUG: Log AFTER processing
if (debug) {
  console.log(`🔍 AFTER processing item ${index + 1}:`, {
    clientItemCode: fixedItem.clientItemCode,
    productCode: fixedItem.productCode,
    productName: fixedItem.productName?.substring(0, 30) + '...'
  });
}

return fixedItem;
  });
};

const validatePOTotals = (formData, debug = false) => {
  if (!formData.items || formData.items.length === 0) {
    return { ...formData, subtotal: 0, tax: 0, totalAmount: 0 };
  }

  const calculatedSubtotal = formData.items.reduce((sum, item) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0);

  const tax = parseFloat(formData.tax) || calculatedSubtotal * 0.1;
  const shipping = parseFloat(formData.shipping) || 0;
  const discount = parseFloat(formData.discount) || 0;
  const calculatedTotal = calculatedSubtotal + tax + shipping - discount;

  if (debug) {
    console.log('💰 PO TOTAL VALIDATION:', {
      itemsCount: formData.items.length,
      calculatedSubtotal,
      tax,
      shipping,
      discount,
      calculatedTotal
    });
  }

  return {
    ...formData,
    subtotal: calculatedSubtotal,
    tax,
    shipping,
    discount,
    totalAmount: calculatedTotal
  };
};

const processExtractedPOData = (extractedData, debug = true) => {
  if (debug) {
    console.log('🚀 PROCESSING EXTRACTED PO DATA');
    console.log('Original extracted data:', extractedData);
    
    // ✅ ENHANCED DEBUG
    if (extractedData.items && extractedData.items.length > 0) {
      console.log('🔍 BEFORE processing - Items details:');
      extractedData.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, {
          clientItemCode: item.clientItemCode,
          productCode: item.productCode,
          productName: item.productName?.substring(0, 40)
        });
      });
    }
  }

  let processedData = { ...extractedData };

    // ✅ NEW: Extract project codes from PO data
  processedData = extractProjectCodesFromPO(processedData);
  
  if (processedData.items && processedData.items.length > 0) {
    processedData.items = fixPOItemPrices(processedData.items, debug);
    
    // ✅ ENHANCED DEBUG
    if (debug && processedData.items.length > 0) {
      console.log('🔍 AFTER fixPOItemPrices - Items details:');
      processedData.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, {
          clientItemCode: item.clientItemCode,
          productCode: item.productCode,
          projectCode: item.projectCode, 
          productName: item.productName?.substring(0, 40)
        });
      });
    }
  }
  
  processedData = validatePOTotals(processedData, debug);
  
  return processedData;
};
// ✅ ADD THIS FUNCTION RIGHT AFTER processExtractedPOData
const extractProjectCodesFromPO = (extractedData) => {
  // Look for project codes in various formats from PTP PO
  const projectCodePatterns = [
    /FS-S\d+/gi,        // FS-S3798, FS-S3845 (from PTP)
    /BWS-S\d+/gi,       // BWS-S1046 
    /[A-Z]{2,3}-[A-Z]\d+/gi, // General pattern XX-X1234
    /Project\s*Code[:\s]+([A-Z0-9-]+)/gi,
    /Job\s*No[:\s]+([A-Z0-9-]+)/gi
  ];
  
  console.log('🏢 EXTRACTING PROJECT CODES from PO data');
  
  if (extractedData.items) {
    extractedData.items = extractedData.items.map((item, index) => {
      let projectCode = '';
      
      // Check if project code is already extracted
      if (item.projectCode) {
        projectCode = item.projectCode;
        console.log(`  ✅ Item ${index + 1}: Found existing project code: ${projectCode}`);
      } else {
        // Try to extract from description, notes, or part number
        const textToSearch = [
          item.description || '',
          item.notes || '',
          item.partNumber || '',
          item.productName || '',
          item.clientItemCode || ''
        ].join(' ');
        
        console.log(`  🔍 Item ${index + 1}: Searching in text: "${textToSearch.substring(0, 100)}..."`);
        
        for (const pattern of projectCodePatterns) {
          const match = textToSearch.match(pattern);
          if (match) {
            projectCode = match[0];
            console.log(`  ✅ Item ${index + 1}: Extracted project code: ${projectCode}`);
            break;
          }
        }
        
        if (!projectCode) {
          console.log(`  ⚠️ Item ${index + 1}: No project code found`);
        }
      }
      
      return {
        ...item,
        projectCode: projectCode || ''
      };
    });
  }
  
  return extractedData;
};

const POModal = ({ isOpen, onClose, onSave, editingPO = null }) => {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  
  // ✅ ENHANCED: Add document storage fields to useState
  const [formData, setFormData] = useState({
    // ✅ DOCUMENT STORAGE FIELDS
    documentId: '',
    documentNumber: '',
    documentType: 'po',
    hasStoredDocuments: false,
    storageInfo: null,
    originalFileName: '',
    
    // Existing PO fields
    poNumber: '',
    clientPoNumber: '',
    projectCode: '',
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

  const [extractionResult, setExtractionResult] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentItem, setCurrentItem] = useState({
    productName: '',
    productCode: '',
    projectCode: '',
    quantity: 1,
    unitPrice: 0,
    totalPrice: 0
  });
  const [showSupplierMatching, setShowSupplierMatching] = useState(false);
  const [supplierMatchingData, setSupplierMatchingData] = useState(null);
  
  // ✅ NEW: Add activeTab state for Documents tab
  const [activeTab, setActiveTab] = useState('details');

  // Mock products for demo
  const mockProducts = [
    { id: '1', name: 'Industrial Sensor', code: 'ISM-001', price: 450.00, stock: 50 },
    { id: '2', name: 'Control Panel', code: 'CP-100', price: 1200.00, stock: 20 },
    { id: '3', name: 'Safety Valve', code: 'SV-200', price: 350.00, stock: 100 },
    { id: '4', name: 'Motor Drive', code: 'MD-300', price: 2500.00, stock: 15 },
  ];

  // Generate PO number
  const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  // ✅ ENHANCED: useEffect with document field preservation
useEffect(() => {
  if (editingPO) {
    console.log('🎯 POModal: Setting form data from editing PO:', editingPO);
    
    // ✅ CRITICAL DEBUG: Check editingPO items structure
    if (editingPO.items && editingPO.items.length > 0) {
      console.log('🔍 EDITING PO DEBUG: Items check:');
      editingPO.items.forEach((item, i) => {
        // ✅ FORCE DETAILED OUTPUT
        console.log(`  EditingPO Item ${i + 1} DETAILS:`);
        console.log(`    clientItemCode: "${item.clientItemCode}"`);
        console.log(`    productCode: "${item.productCode}"`);
        console.log(`    productName: "${item.productName?.substring(0, 40)}"`);
        console.log(`    hasClientItemCode: ${!!item.clientItemCode}`);
        console.log(`    ALL KEYS:`, Object.keys(item));
      });
    }
    
    // ✅ PRESERVE DOCUMENT STORAGE FIELDS
    const documentFields = {
      documentId: editingPO.documentId || '',
      documentNumber: editingPO.documentNumber || '',
      documentType: 'po',
      hasStoredDocuments: editingPO.hasStoredDocuments || false,
      storageInfo: editingPO.storageInfo || null,
      originalFileName: editingPO.originalFileName || ''
    };
    
    console.log('🎯 POModal: Document storage fields set:', documentFields);
    
    setFormData({
      ...editingPO,
      ...documentFields
    });
    
    // ✅ CRITICAL DEBUG: Check formData after setting
    if (editingPO.items && editingPO.items.length > 0) {
      console.log('🔍 EDITING PO DEBUG: FormData items after setting:');
      editingPO.items.forEach((item, i) => {
        console.log(`  FormData Item ${i + 1} DETAILS:`);
        console.log(`    clientItemCode: "${item.clientItemCode}"`);
        console.log(`    productCode: "${item.productCode}"`);
        console.log(`    hasClientItemCode: ${!!item.clientItemCode}`);
      });
    }
    
  } else {
    setFormData(prev => ({
      ...prev,
      poNumber: generatePONumber()
    }));
  }
}, [editingPO]);

  // ✅ ENHANCED: AI Extraction with Price Fixing
    const handleFileUpload = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
  
      console.log('🔍 PRICE FIX DEBUG: Starting PO extraction for:', file.name);
      setExtracting(true);
      setValidationErrors([]);
  
      try {
        // Use the real AI extraction service
        const extractedData = await AIExtractionService.extractFromFile(file);
        console.log("🔍 PRICE FIX DEBUG: Raw extracted data:", extractedData);
  
        // ✅ Apply price fixing to extracted data
        const processedData = processExtractedPOData(extractedData.data || extractedData, true);
        console.log("✅ PRICE FIX DEBUG: Processed data:", processedData);
  
        // ✅ CRITICAL DEBUG: Check raw vs processed data
  console.log("🔍 RAW vs PROCESSED comparison:");
  if (extractedData.data?.items || extractedData.items) {
    const rawItems = extractedData.data?.items || extractedData.items;
    console.log("Raw backend items:", rawItems.map((item, i) => ({
      index: i + 1,
      part_number: item.part_number,
      clientItemCode: item.clientItemCode,
      description: item.description?.substring(0, 40)
    })));
  }
  
  if (processedData.items) {
    console.log("Processed frontend items:", processedData.items.map((item, i) => ({
      index: i + 1,
      clientItemCode: item.clientItemCode,
      productCode: item.productCode,
      productName: item.productName?.substring(0, 40)
    })));
  }
        
        // Validate the extracted data
        const validation = ValidationService.validateExtractedData(processedData);
        
        if (!validation.isValid) {
          setValidationErrors(validation.errors);
          // Still populate form with partial data
        }
  
        // ✅ DEBUG: Check extracted items structure
  console.log("🔍 POModal DEBUG: processedData.items:", processedData.items);
  if (processedData.items && processedData.items.length > 0) {
    console.log("🔍 POModal DEBUG: First item structure:", processedData.items[0]);
    console.log("🔍 POModal DEBUG: First item clientItemCode:", processedData.items[0].clientItemCode);
  }
  
        // ✅ Update form data with processed (price-fixed) information
        setFormData(prev => ({
          ...prev,
          orderNumber: processedData.orderNumber || prev.orderNumber,
          clientName: processedData.clientName || prev.clientName,
          orderDate: processedData.orderDate || prev.orderDate,
          deliveryDate: processedData.deliveryDate || prev.deliveryDate,
          paymentTerms: processedData.paymentTerms || prev.paymentTerms,
          notes: processedData.notes || prev.notes,
          items: processedData.items || prev.items // Price-fixed items
        }));
        // ✅ DEBUG: Check form data after setting
  console.log("🔍 POModal DEBUG: Form data items after setting:", processedData.items);
  
  
        // Check if supplier matching data is available
        if (processedData.sourcingPlan || processedData.matchingMetrics) {
          setSupplierMatchingData({
            items: processedData.items,
            sourcingPlan: processedData.sourcingPlan,
            metrics: processedData.matchingMetrics
          });
          setShowSupplierMatching(true);
        }
  
        // Show recommendations if any
        if (extractedData.recommendations && extractedData.recommendations.length > 0) {
          const recommendationMessages = extractedData.recommendations
            .map(rec => rec.message)
            .join('\n');
          alert(`AI Recommendations:\n${recommendationMessages}`);
        }
        
        // Show confidence score
        if (extractedData.metadata?.confidence) {
          console.log(`Extraction confidence: ${(extractedData.metadata.confidence * 100).toFixed(0)}%`);
        }
        
      } catch (error) {
        console.error('Extraction failed:', error);
        setValidationErrors([{ field: 'file', message: error.message || 'Failed to extract data from file' }]);
      } finally {
        setExtracting(false);
        // Reset file input
        event.target.value = '';
      }
    };

  const handleInputChange = (field, value) => {
    // Auto-format project codes
    if (field === 'projectCode' && value) {
      // Convert to uppercase and remove invalid characters
      value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      
      // Optional: Auto-add dashes for common patterns
      if (value.length > 4 && !value.includes('-') && /^[A-Z]+\d+$/.test(value)) {
        value = value.replace(/(\D+)(\d+)/, '$1-$2');
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  // ✅ ENHANCED: Item change handler with price fixing
  const handleItemChange = (index, field, value) => {
  const newItems = [...formData.items];
  const oldValue = newItems[index][field];
  
  newItems[index] = {
    ...newItems[index],
    [field]: value
  };
  
  // ✅ NEW: Auto-extract product code when product name changes
  if (field === 'productName' && value !== oldValue) {
    const extractedCode = extractProductCodeFromName(value);
    if (extractedCode && !newItems[index].productCode) {
      newItems[index].productCode = extractedCode;
      console.log(`🔍 Auto-extracted product code: "${extractedCode}" from "${value}"`);
    }
  }
  
  // Apply price fixing immediately after any change (your existing logic)
  const fixedItems = fixPOItemPrices(newItems, false); // Set debug=false for manual changes
  
  setFormData(prev => ({
    ...prev,
    items: fixedItems
  }));
};


// ✅ NEW: Product Code Bulk Extraction for all items (compatible with fixPOItemPrices)
const handleBulkProductCodeExtraction = () => {
  setFormData(prev => {
    const updatedItems = prev.items.map(item => {
      if (!item.productCode && item.productName) {
        const extractedCode = extractProductCodeFromName(item.productName);
        if (extractedCode) {
          console.log(`🔍 Bulk extracted: "${extractedCode}" from "${item.productName}"`);
          return {
            ...item,
            productCode: extractedCode
          };
        }
      }
      return item;
    });
    
    // Apply your existing price fixing to all updated items
    const fixedItems = fixPOItemPrices(updatedItems, true); // debug=true for bulk operations
    
    return {
      ...prev,
      items: fixedItems
    };
  });
};
  // ✅ ENHANCED: Add item with price fixing
  const addItem = () => {
    if (currentItem.productName && currentItem.quantity > 0) {
      const newItems = [...formData.items, { 
        ...currentItem, 
        id: Date.now().toString() 
      }];
      
      // Apply price fixing to the new items list
      const fixedItems = fixPOItemPrices(newItems, false);
      
      setFormData(prev => ({
        ...prev,
        items: fixedItems
      }));
      
      // Reset current item
      setCurrentItem({
        productName: '',
        productCode: '',
        projectCode: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0
      });
      setSearchTerm('');
      setShowProductSearch(false);
    }
  };

  // ✅ NEW: Manual price fix button handler
  const handleFixPrices = () => {
    console.log('🔧 Manual price fix triggered');
    const fixedItems = fixPOItemPrices(formData.items, true); // Enable debug for manual fix
    
    setFormData(prev => ({
      ...prev,
      items: fixedItems
    }));
    
    // Show visual feedback
    alert('Item prices have been recalculated and corrected!');
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const selectProduct = (product) => {
    setCurrentItem({
      productName: product.name,
      productCode: product.code,
      quantity: 1,
      unitPrice: product.price,
      totalPrice: product.price
    });
    setSearchTerm(product.name);
    setShowProductSearch(false);
  };

  // ✅ ENHANCED: Submit with document field preservation
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before saving
    const errors = [];
    if (!formData.clientName) errors.push({ field: 'clientName', message: 'Client name is required' });
    if (formData.items.length === 0) errors.push({ field: 'items', message: 'At least one item is required' });

    // ADD PROJECT CODE VALIDATION
    if (formData.projectCode && formData.projectCode.length < 3) {
      errors.push({ field: 'projectCode', message: 'Project code must be at least 3 characters' });
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      // ✅ Final price validation before saving
      const validatedData = validatePOTotals(formData, true);
      
      // ✅ PRESERVE DOCUMENT STORAGE FIELDS
      const dataToSave = {
        ...validatedData,
        // Explicitly preserve document storage fields
        documentId: formData.documentId,
        documentNumber: formData.documentNumber,
        documentType: 'po',
        hasStoredDocuments: formData.hasStoredDocuments,
        storageInfo: formData.storageInfo,
        originalFileName: formData.originalFileName
      };
      
      console.log('🎯 POModal: Saving PO with document storage fields:', {
        documentId: dataToSave.documentId,
        hasStoredDocuments: dataToSave.hasStoredDocuments,
        originalFileName: dataToSave.originalFileName
      });
      
      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">
              {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            <p className="text-blue-100 mt-1">AI-Enhanced Data Entry with Document Storage</p>
          </div>
          <div className="flex items-center gap-3">
            {/* ✅ NEW: Manual Price Fix Button */}
            {formData.items.length > 0 && (
              <button
                type="button"
                onClick={handleFixPrices}
                className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm"
                title="Recalculate and fix all item prices"
              >
                <Calculator className="w-4 h-4" />
                Fix Prices
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ✅ NEW: Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              PO Details
            </button>
            
            {/* ✅ NEW DOCUMENTS TAB */}
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Documents
              {formData.hasStoredDocuments && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                  Stored
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Tab Content */}
          {activeTab === 'details' ? (
            <>
              {/* ✅ ENHANCED: AI Upload Section with Price Fix Info */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600 text-white rounded-lg">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">AI Document Extraction</h3>
                      <p className="text-sm text-gray-600">Upload PDF to auto-fill form with automatic price fixing</p>
                    </div>
                  </div>
                  
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                      onChange={handleFileUpload}
                      disabled={extracting}
                    />
                    <div className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                      {extracting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Extracting & Fixing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Document
                        </>
                      )}
                    </div>
                  </label>
                </div>
                
                {/* ✅ Price Fix Status Info */}
                <div className="text-sm text-purple-700 bg-purple-100 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    <span className="font-medium">Smart Price Correction:</span>
                    <span>Automatically fixes inconsistent pricing data from extracted documents</span>
                  </div>
                </div>

                {/* Extraction Error Display */}
                {extractionError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Extraction Error</p>
                      <p className="text-sm text-red-600 mt-1">{extractionError}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Client Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Client Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PO Number *
                      </label>
                      <input
                        type="text"
                        value={formData.poNumber}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client PO Number
                      </label>
                      <input
                        type="text"
                        value={formData.clientPoNumber}
                        onChange={(e) => handleInputChange('clientPoNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Code
                      </label>
                      <input
                        type="text"
                        value={formData.projectCode}
                        onChange={(e) => handleInputChange('projectCode', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          validationErrors && validationErrors.find(e => e.field === 'projectCode') 
                            ? 'border-red-500' 
                            : 'border-gray-300'
                        }`}
                        placeholder="e.g., PROJ-2025-001"
                      />
                      {validationErrors && validationErrors.find(e => e.field === 'projectCode') && (
                        <p className="text-red-500 text-xs mt-1">
                          {validationErrors.find(e => e.field === 'projectCode')?.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        For linking with CRM quotations and contacts
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          validationErrors && validationErrors.find(e => e.field === 'clientName') 
                            ? 'border-red-500' 
                            : 'border-gray-300'
                        }`}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={formData.clientContact}
                        onChange={(e) => handleInputChange('clientContact', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.clientEmail}
                        onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.clientPhone}
                        onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Order Date *
                      </label>
                      <input
                        type="date"
                        value={formData.orderDate}
                        onChange={(e) => handleInputChange('orderDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Required Date
                      </label>
                      <input
                        type="date"
                        value={formData.requiredDate}
                        onChange={(e) => handleInputChange('requiredDate', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Terms
                      </label>
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Net 30">Net 30</option>
                        <option value="Net 60">Net 60</option>
                        <option value="Net 90">Net 90</option>
                        <option value="Due on Receipt">Due on Receipt</option>
                        <option value="2/10 Net 30">2/10 Net 30</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Terms
                      </label>
                      <select
                        value={formData.deliveryTerms}
                        onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="FOB">FOB</option>
                        <option value="CIF">CIF</option>
                        <option value="DDP">DDP</option>
                        <option value="EXW">EXW</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Items Section */}
<div>
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-lg font-semibold text-gray-800">Order Items</h3>
    <div className="flex gap-2">
      {/* ✅ NEW: Bulk Product Code Extraction Button */}
      {formData.items.length > 0 && (
        <button
          type="button"
          onClick={handleBulkProductCodeExtraction}
          className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
          title="Extract product codes from all product names"
        >
          🔍 Extract Codes
        </button>
      )}
    </div>
  </div>
                  
                  {/* Add Item Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-6 gap-3 mb-3"> {/* Change from 5 to 6 */}
                      <div className="col-span-2 relative">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Product Search
                        </label>
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowProductSearch(true);
                          }}
                          onFocus={() => setShowProductSearch(true)}
                          placeholder="Search products..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        
                        {showProductSearch && searchTerm && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map(product => (
                                <div
                                  key={product.id}
                                  onClick={() => selectProduct(product)}
                                  className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                >
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-sm text-gray-600">
                                    Code: {product.code} | Price: ${product.price} | Stock: {product.stock}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="p-3 text-gray-500 text-center">
                                No products found
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({
                            ...currentItem,
                            quantity: parseInt(e.target.value) || 1,
                            totalPrice: (parseInt(e.target.value) || 1) * currentItem.unitPrice
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price
                        </label>
                        <input
                          type="number"
                          value={currentItem.unitPrice}
                          onChange={(e) => setCurrentItem({
                            ...currentItem,
                            unitPrice: parseFloat(e.target.value) || 0,
                            totalPrice: currentItem.quantity * (parseFloat(e.target.value) || 0)
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          min="0"
                          step="0.01"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total
                        </label>
                        <input
                          type="number"
                          value={currentItem.totalPrice}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          readOnly
                        />
                      </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Project Code
                        </label>
                        <input
                          type="text"
                          value={currentItem.projectCode}
                          onChange={(e) => setCurrentItem({
                            ...currentItem,
                            projectCode: e.target.value
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="BWS-S1046"
                        />
                      </div>

                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!currentItem.productName || currentItem.quantity <= 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Item
                    </button>
                  </div>

                  {/* Items List */}
                  {validationErrors && validationErrors.find(e => e.field === 'items') && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">
                        {validationErrors && validationErrors.find(e => e.field === 'items')?.message}
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={item.id || index} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-9 gap-3"> {/* ✅ CHANGE FROM 8 TO 9 COLUMNS */}
  <div className="col-span-2">
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Product Name *
    </label>
    <input
      type="text"
      value={item.productName}
      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
      required
      placeholder="Enter product description"
    />
  </div>

  {/* ✅ NEW: Product Code/SKU Field */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Product Code/SKU
      <span className="text-purple-600 ml-1" title="Auto-extracted from product name">🔍</span>
    </label>
    <input
      type="text"
      value={item.productCode || ''}
      onChange={(e) => handleItemChange(index, 'productCode', e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
      placeholder="Auto-extracted"
      title="Manufacturer's product code/part number/SKU"
    />
  </div>

  {/* ✅ NEW: Client Item Code Field */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Client Item Code
      <span className="text-blue-600 ml-1" title="Client's unique identifier">🏷️</span>
    </label>
    <input
      type="text"
      value={item.clientItemCode || ''}
      onChange={(e) => handleItemChange(index, 'clientItemCode', e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
      placeholder="e.g. 400RTG0091"
      title="Client's own unique code for this product (e.g. 400RTG0091, 200SHA0162)"
    />
  </div>
                         
                          {/* ✅ NEW: Project Code Field */}
  <div>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      Project Code
      <span className="text-green-600 ml-1" title="Project code for this item">🏢</span>
    </label>
    <input
      type="text"
      value={item.projectCode || ''}
      onChange={(e) => handleItemChange(index, 'projectCode', e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm font-mono"
      placeholder="e.g. BWS-S1046"
      title="Project code for this specific item"
    />
  </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              min="1"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Unit Price
                            </label>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Total Price
                            </label>
                            <input
                              type="number"
                              value={item.totalPrice}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-sm"
                              readOnly
                            />
                          </div>
                        </div>

                        {/* ✅ ADD THE ENHANCED CODE PREVIEW HERE - RIGHT AFTER THE CLOSING </div> OF THE GRID */}
{(item.productCode || item.clientItemCode || item.projectCode) && (
  <div className="mt-2 text-xs bg-gray-50 px-2 py-1 rounded space-y-1">
    {item.productCode && (
      <div className="text-purple-600">
        Product Code: <span className="font-mono font-medium">{item.productCode}</span>
        {item.productName && extractProductCodeFromName(item.productName) === item.productCode && (
          <span className="ml-2 text-purple-500">🔍 Auto-extracted</span>
        )}
      </div>
    )}
    {item.clientItemCode && (
      <div className="text-blue-600">
        Client Code: <span className="font-mono font-medium">{item.clientItemCode}</span>
        <span className="ml-2 text-blue-500">🏷️ Client's unique ID</span>
      </div>
    )}
  </div>
)}
    {item.projectCode && (
      <div className="text-green-600">
        Project Code: <span className="font-mono font-medium">{item.projectCode}</span>
        <span className="ml-2 text-green-500">🏢 Project reference</span>
      </div>
    )}
                        
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remove Item
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  {formData.items.length > 0 && (
  <div className="mt-4 bg-gray-50 p-4 rounded-lg">
    <div className="flex justify-between items-center">
      <div>
        <span className="text-lg font-semibold">Total Amount:</span>
        <div className="text-sm text-gray-600 mt-1">
          📋 {formData.items.length} items • 
          🔍 {formData.items.filter(item => item.productCode).length} with product codes • 
          🏷️ {formData.items.filter(item => item.clientItemCode).length} with client codes • 
          🏢 {formData.items.filter(item => item.projectCode).length} with project codes
        </div>
      </div>
      <span className="text-2xl font-bold text-blue-600">
        ${calculateTotal().toFixed(2)}
      </span>
    </div>
    <p className="text-sm text-gray-600 mt-1">
      * Tax will be calculated at checkout
    </p>
  </div>
)}
                </div>

                {/* Supplier Matching Tab */}
                {supplierMatchingData && (
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setShowSupplierMatching(!showSupplierMatching)}
                      className="w-full flex justify-between items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">
                          Supplier Recommendations Available
                        </span>
                        {supplierMatchingData.metrics && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                            {supplierMatchingData.metrics.supplierDiversity} suppliers found
                          </span>
                        )}
                      </div>
                      {showSupplierMatching ? <ChevronUp /> : <ChevronDown />}
                    </button>
                    
                    {showSupplierMatching && (
                      <div className="mt-4">
                        <SupplierMatchingDisplay
                          items={supplierMatchingData.items}
                          sourcingPlan={supplierMatchingData.sourcingPlan}
                          metrics={supplierMatchingData.metrics}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Add any internal notes..."
                  />
                </div>
              </form>
            </>
          ) : activeTab === 'documents' ? (
            // ✅ NEW DOCUMENTS TAB CONTENT
            <div className="space-y-4">
              {(editingPO?.documentId || formData.documentId) ? (
                <DocumentViewer
                  documentId={editingPO?.documentId || formData.documentId}
                  documentType="po"
                  documentNumber={editingPO?.poNumber || formData.poNumber}
                  allowDelete={true}
                  onDocumentDeleted={(doc) => {
                    console.log('Document deleted:', doc);
                    // Optional: show notification
                    alert('Document deleted successfully');
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="font-medium mb-1">Documents will be available after saving this PO</p>
                  <p className="text-xs">Upload and AI extraction files will be stored here automatically</p>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.clientName || formData.items.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editingPO ? 'Update' : 'Create'} Purchase Order
          </button>
        </div>
      </div>
    </div>
  );
};

export default POModal;
