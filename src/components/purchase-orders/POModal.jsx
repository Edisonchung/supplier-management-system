// src/components/purchase-orders/POModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertTriangle, CheckCircle, Info, TrendingUp, Users, Package, CreditCard, Loader2, Building2, ChevronDown, ChevronUp, Plus, Trash2, Calculator } from 'lucide-react';
import { AIExtractionService, ValidationService } from "../../services/ai";
import SupplierMatchingDisplay from '../supplier-matching/SupplierMatchingDisplay';
import DocumentViewer from '../common/DocumentViewer';

// Product Code Extraction Utility
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

// Price Fixing Functions
const fixPOItemPrices = (items, debug = true) => {
  if (!items || !Array.isArray(items)) {
    console.warn('No valid items array provided to fixPOItemPrices');
    return [];
  }

  if (debug) {
    console.log('[DEBUG] FIXING PO ITEM PRICES...');
    console.log('Original items:', items);
  }

  // Debug tracking for project codes
  console.log('[DEBUG] Items entering fixPOItemPrices:');
  items.forEach((item, i) => {
    console.log(`  Item ${i + 1}: projectCode = "${item.projectCode || 'MISSING'}", clientItemCode = "${item.clientItemCode || 'MISSING'}"`);
  });

  return items.map((item, index) => {
    const originalItem = { ...item };
    
    // Critical debug: Log BEFORE processing
    if (debug) {
      console.log(`[DEBUG] BEFORE processing item ${index + 1}:`, {
        clientItemCode: originalItem.clientItemCode,
        productCode: originalItem.productCode,
        projectCode: originalItem.projectCode,
        productName: originalItem.productName?.substring(0, 30) + '...'
      });
    }
    
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const totalPrice = parseFloat(item.totalPrice) || 0;
    
    // Critical fix: Start with ALL original fields AND immediately preserve critical fields
    let fixedItem = { ...originalItem };
    
    // Immediately preserve critical fields before ANY processing
    fixedItem.clientItemCode = originalItem.clientItemCode || '';
    fixedItem.productCode = originalItem.productCode || '';
    fixedItem.projectCode = originalItem.projectCode || '';
    fixedItem.productName = originalItem.productName || '';
    fixedItem.id = originalItem.id || `item_${index + 1}`;
    
    if (debug) {
      console.log(`[DEBUG] IMMEDIATELY PRESERVED fields for item ${index + 1}:`, {
        clientItemCode: fixedItem.clientItemCode,
        productCode: fixedItem.productCode,
        projectCode: fixedItem.projectCode
      });
    }

    // Strategy 1: Calculate total from quantity × unit price
    if (quantity > 0 && unitPrice > 0) {
      const calculatedTotal = quantity * unitPrice;
      const variance = totalPrice > 0 ? Math.abs(calculatedTotal - totalPrice) / totalPrice : 1;
      
      if (variance > 0.1 || totalPrice === 0) {
        if (debug) console.log(`  [FIXED] Using calculated total ${calculatedTotal} (was ${totalPrice})`);
        fixedItem.totalPrice = calculatedTotal;
      }
    } 
    // Strategy 2: Calculate unit price from total ÷ quantity
    else if (quantity > 0 && totalPrice > 0 && (unitPrice === 0 || !unitPrice)) {
      const calculatedUnitPrice = totalPrice / quantity;
      if (debug) console.log(`  [FIXED] Calculated unit price ${calculatedUnitPrice}`);
      fixedItem.unitPrice = calculatedUnitPrice;
    } 
    // Strategy 3: Calculate quantity from total ÷ unit price
    else if (unitPrice > 0 && totalPrice > 0 && (quantity === 0 || !quantity)) {
      const calculatedQuantity = Math.round(totalPrice / unitPrice);
      if (debug) console.log(`  [FIXED] Calculated quantity ${calculatedQuantity}`);
      fixedItem.quantity = calculatedQuantity;
    } 
    // Strategy 4: Handle only total price existing
    else if (totalPrice > 0 && quantity === 0 && unitPrice === 0) {
      fixedItem.unitPrice = totalPrice;
      fixedItem.quantity = 1;
      if (debug) console.log(`  [FIXED] Set unit price to total and quantity to 1`);
    }
    // Strategy 5: Default missing values
    else {
      if (fixedItem.quantity === 0 || !fixedItem.quantity) fixedItem.quantity = 1;
      if (fixedItem.unitPrice === 0 || !fixedItem.unitPrice) fixedItem.unitPrice = 0;
      if (fixedItem.totalPrice === 0 || !fixedItem.totalPrice) {
        fixedItem.totalPrice = fixedItem.quantity * fixedItem.unitPrice;
      }
    }

    // Double-check: Preserve critical fields again as safety net
    if (originalItem.clientItemCode) {
      fixedItem.clientItemCode = originalItem.clientItemCode;
      if (debug) {
        console.log(`[DEBUG] Double-check preserving clientItemCode for item ${index + 1}:`, originalItem.clientItemCode);
      }
    } else if (debug) {
      console.log(`[WARNING] No clientItemCode found in originalItem for item ${index + 1}`);
      console.log(`Original item keys:`, Object.keys(originalItem));
    }

    // Also preserve other important fields that might get lost
    if (originalItem.productCode && !fixedItem.productCode) {
      fixedItem.productCode = originalItem.productCode;
    }

    // Preserve project code
    if (originalItem.projectCode) {
      fixedItem.projectCode = originalItem.projectCode;
      if (debug) {
        console.log(`[DEBUG] Double-check preserving projectCode for item ${index + 1}:`, originalItem.projectCode);
      }
    } else if (debug) {
      console.log(`[WARNING] No projectCode found in originalItem for item ${index + 1}`);
    }

    // Final safety check: Ensure nothing got lost
    if (originalItem.clientItemCode && !fixedItem.clientItemCode) {
      fixedItem.clientItemCode = originalItem.clientItemCode;
      if (debug) console.log(`[EMERGENCY] clientItemCode restored for item ${index + 1}`);
    }

    // Critical debug: Log AFTER processing
    if (debug) {
      console.log(`[DEBUG] AFTER processing item ${index + 1}:`, {
        clientItemCode: fixedItem.clientItemCode,
        productCode: fixedItem.productCode,
        projectCode: fixedItem.projectCode,
        productName: fixedItem.productName?.substring(0, 30) + '...'
      });
    }

    return fixedItem;
  });
};

// 🔥 CRITICAL FIX: validatePOTotals - No automatic tax application
const validatePOTotals = (formData, debug = false) => {
  if (!formData.items || formData.items.length === 0) {
    return { ...formData, subtotal: 0, tax: 0, totalAmount: 0 };
  }

  const calculatedSubtotal = formData.items.reduce((sum, item) => {
    return sum + (parseFloat(item.totalPrice) || 0);
  }, 0);

  // 🔥 FIXED: Use explicit tax value or 0 (no automatic 10% tax)
  const tax = parseFloat(formData.tax) || 0;
  const shipping = parseFloat(formData.shipping) || 0;
  const discount = parseFloat(formData.discount) || 0;
  const calculatedTotal = calculatedSubtotal + tax + shipping - discount;

  if (debug) {
    console.log('[DEBUG] PO TOTAL VALIDATION:', {
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
    console.log('[DEBUG] PROCESSING EXTRACTED PO DATA');
    console.log('Original extracted data:', extractedData);
    
    // Critical debug: Check clientItemCode at the START
    if (extractedData.items && extractedData.items.length > 0) {
      console.log('[DEBUG] BEFORE processing - Items details:');
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
  
  // Critical debug: Check AFTER copying extractedData
  if (debug && processedData.items && processedData.items.length > 0) {
    console.log('[DEBUG] AFTER copying extractedData - Items details:');
    processedData.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        clientItemCode: item.clientItemCode,
        productCode: item.productCode,
        productName: item.productName?.substring(0, 40)
      });
    });
  }

  // Extract project codes from PO data
  processedData = extractProjectCodesFromPO(processedData);
  
  // Critical debug: Check AFTER extractProjectCodesFromPO
  if (debug && processedData.items && processedData.items.length > 0) {
    console.log('[DEBUG] AFTER extractProjectCodesFromPO - Items details:');
    processedData.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        clientItemCode: item.clientItemCode,
        productCode: item.productCode,
        projectCode: item.projectCode,
        productName: item.productName?.substring(0, 40)
      });
    });
  }
  
  if (processedData.items && processedData.items.length > 0) {
    processedData.items = fixPOItemPrices(processedData.items, debug);
    
    // Enhanced debug
    if (debug && processedData.items.length > 0) {
      console.log('[DEBUG] AFTER fixPOItemPrices - Items details:');
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
  
  // Final debug: Check AFTER validatePOTotals
  if (debug && processedData.items && processedData.items.length > 0) {
    console.log('[DEBUG] FINAL - AFTER validatePOTotals - Items details:');
    processedData.items.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        clientItemCode: item.clientItemCode,
        productCode: item.productCode,
        projectCode: item.projectCode,
        productName: item.productName?.substring(0, 40)
      });
    });
  }
  
  return processedData;
};

// Extract project codes from PO data
const extractProjectCodesFromPO = (extractedData) => {
  // Look for project codes in various formats from PTP PO
  const projectCodePatterns = [
    /FS-S\d+/gi,        // FS-S3798, FS-S3845 (from PTP)
    /BWS-S\d+/gi,       // BWS-S1046 
    /[A-Z]{2,3}-[A-Z]\d+/gi, // General pattern XX-X1234
    /Project\s*Code[:\s]+([A-Z0-9-]+)/gi,
    /Job\s*No[:\s]+([A-Z0-9-]+)/gi
  ];
  
  console.log('[DEBUG] EXTRACTING PROJECT CODES from PO data');
  
  if (extractedData.items) {
    extractedData.items = extractedData.items.map((item, index) => {
      // Critical: Start with ALL original fields
      let updatedItem = { ...item };
      
      // Critical debug: Log what we're starting with
      console.log(`[DEBUG] extractProjectCodesFromPO - Item ${index + 1} BEFORE:`, {
        clientItemCode: item.clientItemCode,
        productCode: item.productCode,
        projectCode: item.projectCode,
        productName: item.productName?.substring(0, 40)
      });
      
      let projectCode = '';
      
      // Check if project code is already extracted
      if (item.projectCode) {
        projectCode = item.projectCode;
        console.log(`  [SUCCESS] Item ${index + 1}: Found existing project code: ${projectCode}`);
      } else {
        // Try to extract from description, notes, or part number
        const searchableText = [
          item.description || '',
          item.productName || '',
          item.specifications || '',
          item.notes || '',
          item.remarks || '',
          item.clientItemCode || '',
          item.partNumber || '',
          item.part_number || '',
          item.productCode || '',
          item.product_code || ''
        ].filter(Boolean).join(' ');

        console.log(`  [DEBUG] Searchable text for item ${index + 1}:`, searchableText.substring(0, 100));

        // Try each pattern
        for (const pattern of projectCodePatterns) {
          const matches = searchableText.match(pattern);
          if (matches && matches[0]) {
            projectCode = matches[0].toUpperCase();
            console.log(`  [SUCCESS] Found project code "${projectCode}" using pattern: ${pattern}`);
            break;
          }
        }
      }
      
      // Update only the projectCode, preserve everything else
      if (projectCode) {
        updatedItem.projectCode = projectCode;
      }
      
      // Critical debug: Log what we're returning
      console.log(`[DEBUG] extractProjectCodesFromPO - Item ${index + 1} AFTER:`, {
        clientItemCode: updatedItem.clientItemCode,
        productCode: updatedItem.productCode,
        projectCode: updatedItem.projectCode,
        productName: updatedItem.productName?.substring(0, 40)
      });
      
      return updatedItem;
    });
  }
  
  const foundCodes = extractedData.items?.filter(item => item.projectCode).length || 0;
  console.log(`[DEBUG] Project code extraction complete: ${foundCodes}/${extractedData.items?.length || 0} items have project codes`);
  
  return extractedData;
};

const POModal = ({ isOpen, onClose, onSave, editingPO = null }) => {
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");
  const [extractedData, setExtractedData] = useState(null);
  
  // Enhanced: Add document storage fields to useState
  const [formData, setFormData] = useState({
    // Document storage fields
    documentId: '',
    documentNumber: '',
    documentType: 'po',
    hasStoredDocuments: false,
    storageInfo: null,
    originalFileName: '',
    fileSize: 0,
    contentType: '',
    extractedAt: '',
    
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
    // Financial fields
    subtotal: 0,
    tax: 0,
    shipping: 0,
    discount: 0,
    totalAmount: 0,
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
  
  // Add activeTab state for Documents tab
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

  // useEffect with enhanced document field preservation
  useEffect(() => {
    if (editingPO) {
      console.log('[DEBUG] POModal: Setting form data from editing PO:', editingPO.poNumber);
      
      if (editingPO.items && editingPO.items.length > 0) {
        console.log('[DEBUG] EDITING PO DEBUG: editingPO.items check:');
        editingPO.items.forEach((item, i) => {
          console.log(`  EditingPO Item ${i + 1} DETAILS:`);
          console.log(`    clientItemCode: "${item.clientItemCode}"`);
          console.log(`    productCode: "${item.productCode}"`);
          console.log(`    productName: "${item.productName}"`);
          console.log(`    hasClientItemCode: ${!!item.clientItemCode}`);
          console.log(`    ALL KEYS:`, Object.keys(item));
        });
      }
      
      // Enhanced document storage fields preservation
      const documentFields = {
        documentId: editingPO.documentId || '',
        documentNumber: editingPO.documentNumber || editingPO.poNumber || '',
        documentType: 'po',
        hasStoredDocuments: editingPO.hasStoredDocuments || false,
        storageInfo: editingPO.storageInfo || null,
        originalFileName: editingPO.originalFileName || '',
        fileSize: editingPO.fileSize || 0,
        contentType: editingPO.contentType || '',
        extractedAt: editingPO.extractedAt || editingPO.createdAt || new Date().toISOString()
      };
      
      console.log('[DEBUG] POModal: Document storage fields set:', documentFields);
      
      // Use correct items array (preserving existing logic)
      let itemsToUse = editingPO.items;
      
      if (editingPO.extractedData?.items && editingPO.extractedData.items.length > 0) {
        const extractedHasClientCode = editingPO.extractedData.items.some(item => item.clientItemCode);
        const editingHasClientCode = editingPO.items?.some(item => item.clientItemCode);
        
        if (extractedHasClientCode && !editingHasClientCode) {
          console.log('[CRITICAL] Using extractedData.items because it has clientItemCode');
          itemsToUse = editingPO.extractedData.items;
        }
      }
      
      setFormData({
        ...editingPO,
        ...documentFields,  // Apply enhanced document fields
        items: itemsToUse
      });
    } else {
      // Initialize new PO with basic structure
      setFormData(prev => ({
        ...prev,
        poNumber: generatePONumber(),
        documentType: 'po',
        hasStoredDocuments: false
      }));
    }
  }, [editingPO]);

  // Enhanced: AI Extraction with Document Storage (Updated handleFileUpload)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('[DEBUG] Starting PO extraction with document storage for:', file.name);
    setExtracting(true);
    setValidationErrors([]);

    try {
      // Critical: Use extractPOWithStorage instead of basic extractFromFile
      const extractedData = await AIExtractionService.extractPOWithStorage(file);
      console.log("[DEBUG] Raw extracted data with storage:", extractedData);

      // Apply price fixing to extracted data
      const processedData = processExtractedPOData(extractedData.data || extractedData, true);
      console.log("[SUCCESS] Processed data:", processedData);

      // Critical: Extract document storage information from AI response
      let documentStorageFields = {};
      
      if (extractedData.documentStorage) {
        // Primary source: Direct document storage from AI service
        documentStorageFields = {
          documentId: extractedData.documentStorage.documentId,
          documentNumber: extractedData.documentStorage.documentNumber || processedData.poNumber,
          documentType: 'po',
          hasStoredDocuments: true,
          storageInfo: extractedData.documentStorage,
          originalFileName: extractedData.documentStorage.originalFile?.originalFileName || file.name,
          fileSize: extractedData.documentStorage.originalFile?.fileSize || file.size,
          contentType: extractedData.documentStorage.originalFile?.contentType || file.type,
          extractedAt: extractedData.documentStorage.storedAt || new Date().toISOString()
        };
        console.log('[SUCCESS] Using AI document storage:', documentStorageFields.documentId);
      } 
      else if (extractedData.extractionMetadata?.documentId) {
        // Fallback source: Extraction metadata
        documentStorageFields = {
          documentId: extractedData.extractionMetadata.documentId,
          documentNumber: extractedData.extractionMetadata.documentNumber || processedData.poNumber,
          documentType: 'po',
          hasStoredDocuments: !!extractedData.extractionMetadata.hasStoredDocuments,
          originalFileName: extractedData.extractionMetadata.originalFileName || file.name,
          fileSize: extractedData.extractionMetadata.fileSize || file.size,
          contentType: extractedData.extractionMetadata.contentType || file.type,
          extractedAt: extractedData.extractionMetadata.extractedAt || new Date().toISOString(),
          storageInfo: extractedData.extractionMetadata.storageInfo || null
        };
        console.log('[SUCCESS] Using extraction metadata:', documentStorageFields.documentId);
      }
      else {
        // Generate fallback document ID if none provided
        documentStorageFields = {
          documentId: `doc-po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          documentNumber: processedData.poNumber,
          documentType: 'po',
          hasStoredDocuments: false,
          originalFileName: file.name,
          fileSize: file.size,
          contentType: file.type,
          extractedAt: new Date().toISOString(),
          storageInfo: null
        };
        console.log('[WARNING] Generated fallback document ID:', documentStorageFields.documentId);
      }
      
      // Validate the extracted data
      const validation = ValidationService.validateExtractedData(processedData);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
      }

      // Critical: Combine processed data with document storage fields
      const completeFormData = {
        ...processedData,
        ...documentStorageFields,
        // Preserve any existing form data
        ...formData,
        // Override with new extracted data
        items: processedData.items || [],
        // Ensure PO number is set
        poNumber: processedData.poNumber || formData.poNumber || generatePONumber()
      };

      console.log('[DEBUG] Setting form data with document fields:', {
        documentId: completeFormData.documentId,
        hasStoredDocuments: completeFormData.hasStoredDocuments,
        originalFileName: completeFormData.originalFileName
      });

      // Set form data with complete document integration
      setFormData(completeFormData);
      
      // Store the complete extracted data for potential reference
      setExtractedData({
        ...extractedData,
        processedData: completeFormData
      });
      
      console.log('[SUCCESS] PO extraction with document storage completed successfully');
      
    } catch (error) {
      console.error('[ERROR] PO extraction failed:', error);
      setValidationErrors([{ field: 'general', message: 'Failed to extract PO data: ' + error.message }]);
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

  // Enhanced: Item change handler with price fixing
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    const oldValue = newItems[index][field];
    
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    
    // Auto-extract product code when product name changes
    if (field === 'productName' && value !== oldValue) {
      const extractedCode = extractProductCodeFromName(value);
      if (extractedCode && !newItems[index].productCode) {
        newItems[index].productCode = extractedCode;
        console.log(`[DEBUG] Auto-extracted product code: "${extractedCode}" from "${value}"`);
      }
    }
     // Critical: Ensure project code changes are preserved
    if (field === 'projectCode') {
      console.log(`[SUCCESS] Project code for item ${index} changed from "${oldValue}" to "${value}"`);
    }
    
    // Auto-format project codes
    if (field === 'projectCode' && value) {
      value = value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      newItems[index][field] = value;
    }
    // Apply price fixing immediately after any change (your existing logic)
    const fixedItems = fixPOItemPrices(newItems, false); // Set debug=false for manual changes
    
    setFormData(prev => ({
      ...prev,
      items: fixedItems
    }));
  };

  // Product Code Bulk Extraction for all items (compatible with fixPOItemPrices)
  const handleBulkProductCodeExtraction = () => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (!item.productCode && item.productName) {
          const extractedCode = extractProductCodeFromName(item.productName);
          if (extractedCode) {
            console.log(`[DEBUG] Bulk extracted: "${extractedCode}" from "${item.productName}"`);
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

  // Enhanced: Add item with price fixing
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

  // Manual price fix button handler
  const handleFixPrices = () => {
    console.log('[DEBUG] Manual price fix triggered');
    const fixedItems = fixPOItemPrices(formData.items, true); // Enable debug for manual fix
    
    // Apply total validation after price fixing
    const validatedData = validatePOTotals({ ...formData, items: fixedItems }, true);
    
    setFormData(validatedData);
    
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

  // 🔥 CRITICAL FIX: Enhanced submit with proper total calculation AND refresh trigger
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate before saving
    const errors = [];
    if (!formData.clientName) errors.push({ field: 'clientName', message: 'Client name is required' });
    if (formData.items.length === 0) errors.push({ field: 'items', message: 'At least one item is required' });

    if (formData.projectCode && formData.projectCode.length < 3) {
      errors.push({ field: 'projectCode', message: 'Project code must be at least 3 characters' });
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    setLoading(true);
    try {
      // Final price validation before saving with corrected tax handling
      const validatedData = validatePOTotals(formData, true);
      
      // Complete document storage fields preservation
      const dataToSave = {
        ...validatedData,
        // Core document storage fields
        documentId: formData.documentId || `doc-po-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        documentNumber: formData.documentNumber || formData.poNumber,
        documentType: 'po',
        hasStoredDocuments: formData.hasStoredDocuments || false,
        storageInfo: formData.storageInfo || null,
        originalFileName: formData.originalFileName || '',
        fileSize: formData.fileSize || 0,
        contentType: formData.contentType || '',
        extractedAt: formData.extractedAt || new Date().toISOString(),
        // 🔥 CRITICAL: Add refresh trigger
        lastUpdated: new Date().toISOString()
      };
      
      console.log('[DEBUG] POModal: Saving PO with complete document storage fields:', {
        documentId: dataToSave.documentId,
        hasStoredDocuments: dataToSave.hasStoredDocuments,
        originalFileName: dataToSave.originalFileName,
        documentType: dataToSave.documentType,
        totalAmount: dataToSave.totalAmount,
        tax: dataToSave.tax
      });
      
      // 🔥 CRITICAL: Pass refresh flag to parent component
      await onSave(dataToSave, { shouldRefresh: true });
      onClose();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save purchase order');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 UPDATED: Calculate total using the same logic as validatePOTotals
  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    const tax = parseFloat(formData.tax) || 0;
    const shipping = parseFloat(formData.shipping) || 0;
    const discount = parseFloat(formData.discount) || 0;
    return subtotal + tax + shipping - discount;
  };

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">
              {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            <p className="text-blue-100 mt-1">AI-Enhanced Data Entry with Document Storage</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Manual Price Fix Button */}
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

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 flex-shrink-0">
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
            
            {/* Documents Tab */}
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

        {/* Content Area - Fixed height calculation */}
        <div className="p-6 flex-1 min-h-0" style={{ overflowY: 'auto' }}>
          {/* Tab Content */}
          {activeTab === 'details' ? (
            <>
              {/* Enhanced: AI Upload Section with Price Fix Info */}
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
                
                {/* Price Fix Status Info */}
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

                {/* 🔥 UPDATED Financial Details Section with enhanced styling */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Subtotal Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subtotal (RM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.subtotal || formData.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0)}
                        onChange={(e) => handleInputChange('subtotal', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    {/* Tax Field - CRITICAL UPDATE */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax (RM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tax}
                        onChange={(e) => handleInputChange('tax', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-1">Set to 0 for Flow Solution POs</p>
                    </div>
                    
                    {/* Shipping Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Shipping (RM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.shipping || 0}
                        onChange={(e) => handleInputChange('shipping', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                    
                    {/* Discount Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount (RM)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.discount || 0}
                        onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  
                  {/* 🔥 UPDATED Total Amount Display */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>Total Amount:</span>
                      <span className="text-blue-600">RM {calculateTotal().toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Subtotal: RM {formData.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0).toFixed(2)} + 
                      Tax: RM {(parseFloat(formData.tax) || 0).toFixed(2)} + 
                      Shipping: RM {(parseFloat(formData.shipping) || 0).toFixed(2)} - 
                      Discount: RM {(parseFloat(formData.discount) || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Items Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">Order Items</h3>
                    <div className="flex gap-2">
                      {/* Bulk Product Code Extraction Button */}
                      {formData.items.length > 0 && (
                        <button
                          type="button"
                          onClick={handleBulkProductCodeExtraction}
                          className="px-3 py-1 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                          title="Extract product codes from all product names"
                        >
                          Extract Codes
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Add Item Form */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-6 gap-3 mb-3">
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
                        <div className="grid grid-cols-9 gap-3">
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

                          {/* Product Code Field */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Product Code
                              <span className="text-purple-600 ml-1" title="Auto-extracted from product name">🔍</span>
                            </label>
                            <input
                              type="text"
                              value={item.productCode || ''}
                              onChange={(e) => handleItemChange(index, 'productCode', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                              placeholder="Auto-extracted"
                              title="Manufacturer's product code/part number"
                            />
                          </div>

                          {/* Client Item Code Field */}
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
                         
                          {/* Project Code Field */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Project Code 
                              <span className="text-blue-500 text-xs ml-1">Project</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g., BWS-S1046"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              value={item.projectCode || ''}
                              onChange={(e) => handleItemChange(index, 'projectCode', e.target.value)}
                            />
                            {/* Debug indicator to show if project code exists */}
                            {item.projectCode && (
                              <div className="text-xs text-green-600 mt-1">
                                Project code: {item.projectCode}
                              </div>
                            )}
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

                        {/* Enhanced code preview */}
                        {(item.productCode || item.clientItemCode || item.projectCode) && (
                          <div className="mt-2 text-xs bg-gray-50 px-2 py-1 rounded space-y-1">
                            {item.productCode && (
                              <div className="text-purple-600">
                                Product Code: <span className="font-mono font-medium">{item.productCode}</span>
                                {item.productName && extractProductCodeFromName(item.productName) === item.productCode && (
                                  <span className="ml-2 text-purple-500">Auto-extracted</span>
                                )}
                              </div>
                            )}
                            {item.clientItemCode && (
                              <div className="text-blue-600">
                                Client Code: <span className="font-mono font-medium">{item.clientItemCode}</span>
                                <span className="ml-2 text-blue-500">Client's unique ID</span>
                              </div>
                            )}
                            {item.projectCode && (
                              <div className="text-green-600">
                                Project Code: <span className="font-mono font-medium">{item.projectCode}</span>
                                <span className="ml-2 text-green-500">Project reference</span>
                              </div>
                            )}
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
                            {formData.items.length} items • 
                            {formData.items.filter(item => item.productCode).length} with product codes • 
                            {formData.items.filter(item => item.clientItemCode).length} with client codes • 
                            {formData.items.filter(item => item.projectCode).length} with project codes
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-blue-600">
                          RM {calculateTotal().toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        * Financial details can be adjusted in the Financial Details section above
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
            // Documents tab content
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

        {/* 🔥 ENHANCED Fixed Footer with More Prominent Button Styling */}
        <div className="border-t bg-white p-6 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          
          {/* 🔥 CRITICAL: Much more prominent Update Purchase Order button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.clientName || formData.items.length === 0}
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-2 border-green-800"
            style={{ minWidth: '220px' }}
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {editingPO ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Update Purchase Order
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create Purchase Order
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POModal;
