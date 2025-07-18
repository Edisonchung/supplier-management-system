// src/components/procurement/ProformaInvoices.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  Download, Eye, Edit, Trash2, Truck, Package,
  AlertCircle, Clock, CheckCircle, CreditCard,
  Grid, List, Briefcase, AlertTriangle, Upload, Loader2, X
} from 'lucide-react';
import { useProformaInvoices } from '../../hooks/useProformaInvoices';
import { usePermissions } from '../../hooks/usePermissions';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts } from '../../hooks/useProducts';
import { mockFirebase } from '../../services/firebase';
import AIExtractionService from '../../services/ai/AIExtractionService';
import PICard from './PICard';
import PIModal from './PIModal';
import DocumentViewer from '../common/DocumentViewer';
import StockAllocationModal from './StockAllocationModal';
import { StockAllocationService } from '../../services/StockAllocationService';


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
  
  const { 
    suppliers, 
    loading: suppliersLoading, 
    addSupplier: hookAddSupplier,
    updateSupplier, 
    deleteSupplier 
  } = useSuppliers();
  
  // ✅ Get Products hook functions for syncing
  const { 
    products, 
    addProduct, 
    updateProduct,
    loading: productsLoading 
  } = useProducts();
  
  const [showModal, setShowModal] = useState(false);
  const [selectedPI, setSelectedPI] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [documentsModal, setDocumentsModal] = useState({ open: false, pi: null });
  const [viewMode, setViewMode] = useState('grid');
  const [groupByYear, setGroupByYear] = useState(true);
  
  // AI Extraction states
  const fileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);

  const canEdit = permissions.canEditPI || permissions.isAdmin;
  const canDelete = permissions.isAdmin;

  // ✅ NEW: Product Sync Function
  const syncPIProductsToDatabase = async (piData, savedPI) => {
    console.log('🔄 Syncing PI products to Products database...');
    
    if (!piData.items || piData.items.length === 0) {
      console.log('No items to sync');
      return { synced: 0, created: 0, updated: 0 };
    }

    // Get supplier info
    const supplier = suppliers.find(s => s.id === piData.supplierId);
    let syncStats = { synced: 0, created: 0, updated: 0 };
    
    for (const item of piData.items) {
      try {
        // Check if product already exists by product code
        const existingProduct = products.find(p => 
          p.sku === item.productCode || 
          p.name === item.productName ||
          (p.sku && item.productCode && p.sku.toLowerCase() === item.productCode.toLowerCase())
        );

        if (existingProduct) {
          // Update existing product with latest supplier pricing
          console.log(`Updating existing product: ${item.productCode}`);
          
          const updateData = {
            ...existingProduct,
            // Update price if this is a better/newer price
            price: item.unitPrice || existingProduct.price,
            unitCost: item.unitPrice || existingProduct.unitCost,
            unitPrice: item.unitPrice || existingProduct.unitPrice,
            lastUpdated: new Date().toISOString(),
            // Add supplier reference if not already linked
            supplierId: existingProduct.supplierId || piData.supplierId,
            supplierName: existingProduct.supplierName || supplier?.name,
            // Track PI references
            piReferences: [
              ...(existingProduct.piReferences || []),
              {
                piId: savedPI.id,
                piNumber: piData.piNumber,
                unitPrice: item.unitPrice,
                date: piData.date,
                supplierName: supplier?.name
              }
            ].filter((ref, index, arr) => 
              // Remove duplicates by piId
              arr.findIndex(r => r.piId === ref.piId) === index
            )
          };

          const result = await updateProduct(existingProduct.id, updateData);
          if (result.success) {
            syncStats.updated++;
            console.log(`✅ Updated product: ${existingProduct.name}`);
          }
        } else {
          // Create new product from PI item
          console.log(`Creating new product: ${item.productCode}`);
          
          const newProduct = {
            name: item.productName || 'Unnamed Product',
            sku: item.productCode || `SKU-${Date.now()}`,
            description: item.notes || item.specifications || '',
            
            // Pricing
            price: item.unitPrice || 0,
            unitCost: item.unitPrice || 0,
            unitPrice: item.unitPrice || 0,
            
            // Supplier linking
            supplierId: piData.supplierId,
            supplierName: supplier?.name || 'Unknown Supplier',
            
            // Stock management
            stock: 0,
            currentStock: 0,
            minStock: 1,
            minStockLevel: 1,
            
            // Categories (try to auto-detect from product name)
            category: detectProductCategory(item.productName),
            brand: item.brand || '',
            
            // Status
            status: 'pending',
            
            // Tracking
            dateAdded: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            source: 'pi_import',
            piReferences: [{
              piId: savedPI.id,
              piNumber: piData.piNumber,
              unitPrice: item.unitPrice,
              date: piData.date,
              supplierName: supplier?.name
            }],
            
            // Additional fields from PI
            leadTime: item.leadTime,
            warranty: item.warranty,
            notes: `Imported from PI: ${piData.piNumber}${item.notes ? ('\n' + item.notes) : ''}`,
            
            // Photo and catalog (empty for now)
            photo: '',
            catalog: ''
          };

          const result = await addProduct(newProduct);
          if (result.success) {
            syncStats.created++;
            console.log(`✅ Created product: ${newProduct.name}`);
          }
        }
        
        syncStats.synced++;
      } catch (error) {
        console.error(`Failed to sync product ${item.productCode}:`, error);
        // Continue with other products even if one fails
      }
    }
    
    console.log('✅ PI products sync completed:', syncStats);
    
    // Show notification based on results
    if (syncStats.created > 0 || syncStats.updated > 0) {
      showNotification(
        `Products synced: ${syncStats.created} created, ${syncStats.updated} updated`, 
        'success'
      );
    }
    
    return syncStats;
  };

  // Helper function to detect product category
  const detectProductCategory = (productName) => {
    if (!productName) return 'components';
    
    const name = productName.toLowerCase();
    
    if (name.includes('sensor') || name.includes('detector')) return 'sensors';
    if (name.includes('valve') || name.includes('pump') || name.includes('cylinder')) return 'hydraulics';
    if (name.includes('motor') || name.includes('drive') || name.includes('inverter')) return 'automation';
    if (name.includes('cable') || name.includes('wire') || name.includes('connector')) return 'cables';
    if (name.includes('electronic') || name.includes('controller') || name.includes('display')) return 'electronics';
    if (name.includes('pneumatic') || name.includes('air')) return 'pneumatics';
    
    return 'components'; // Default category
  };

  // Enhanced addSupplier function that works with PIModal
  const addSupplier = async (supplierData) => {
    try {
      console.log('ProformaInvoices - Adding supplier:', supplierData);
      
      // If using the hook's addSupplier function
      if (hookAddSupplier) {
        const result = await hookAddSupplier(supplierData);
        console.log('Supplier added via hook:', result);
        return result;
      }
      
      // Fallback: Direct implementation for localStorage
      const newSupplier = {
        id: `supplier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...supplierData,
        dateAdded: new Date().toISOString()
      };

      console.log('Supplier created (fallback):', newSupplier);
      showNotification?.(`Supplier "${newSupplier.name}" created successfully`, 'success');
      return newSupplier;
      
    } catch (error) {
      console.error('Error adding supplier in ProformaInvoices:', error);
      showNotification?.('Failed to create supplier. Please try again.', 'error');
      throw error;
    }
  };

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

  // Group PIs by year
  const pisByYear = groupByYear ? filteredPIs.reduce((acc, pi) => {
    const year = new Date(pi.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(pi);
    return acc;
  }, {}) : { 'All': filteredPIs };

  // Sort years descending (newest first)
  const sortedYears = Object.keys(pisByYear).sort((a, b) => {
    if (a === 'All') return 1;
    if (b === 'All') return -1;
    return b - a;
  });

  // Enhanced PO finding with better matching
  const findPOByNumber = async (poNumber) => {
    try {
      const snapshot = await mockFirebase.firestore.collection('purchaseOrders').get();
      const purchaseOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Try exact match first
      let matchedPO = purchaseOrders.find(po => 
        po.orderNumber === poNumber || po.poNumber === poNumber
      );
      
      // Try partial match if exact fails
      if (!matchedPO) {
        matchedPO = purchaseOrders.find(po => 
          po.orderNumber?.includes(poNumber) ||
          poNumber.includes(po.orderNumber) ||
          po.poNumber?.includes(poNumber) ||
          poNumber.includes(po.poNumber)
        );
      }
      
      return matchedPO;
    } catch (error) {
      console.error('Error finding PO:', error);
      return null;
    }
  };

  // Enhanced file upload handler with comprehensive document type support
  const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  setExtracting(true);
  console.log('🚀 FIXED: Starting PI extraction for:', file.name);
  
  try {
    showNotification(`Analyzing ${file.name}...`, 'info');
    
    // 🔍 FIXED: Call extraction with storage
    console.log('📞 FIXED: Calling AIExtractionService.extractPIWithStorage...');
    const result = await AIExtractionService.extractPIWithStorage(file);
    
    console.log('✅ FIXED: Extraction completed:', {
      success: result.success,
      hasData: !!result.data,
      documentId: result.data?.documentId,
      hasStorageInfo: !!result.data?.storageInfo,
      documentsStored: result.data?.hasStoredDocuments
    });
    
    if (result.success && result.data) {
      const extractedData = result.data;
      const documentType = extractedData.documentType;
      
      console.log(`📋 FIXED: Processing ${documentType} with confidence: ${result.confidence || 'unknown'}`);
      
      let piData;
      let actionMessage = '';
      
      // Handle different document types with Chinese supplier optimization
switch (documentType) {
  case 'supplier_proforma':
  case 'proforma_invoice':
    // Use optimized Chinese supplier processing
    piData = await processChineseSupplierPI(extractedData);
    actionMessage = 'Chinese Supplier PI extracted and stored!';
    break;
    
  case 'client_purchase_order':
    piData = await processClientPOForPI(extractedData);
    actionMessage = 'Client PO converted to PI template. Please select supplier and add pricing.';
    break;
    
  case 'supplier_invoice':
    piData = await processSupplierInvoiceAsPI(extractedData);
    actionMessage = 'Supplier Invoice converted to PI format.';
    break;
    
  default:
    // ✅ FIXED: Use direct processing instead of non-existent function
    piData = {
      piNumber: extractedData.piNumber || `PI-${Date.now()}`,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      expiryDate: extractedData.validUntil || '',
      supplierName: extractedData.supplier?.name || extractedData.supplierName || '',
      supplierEmail: extractedData.supplier?.email || '',
      supplierAddress: extractedData.supplier?.address || '',
      clientRef: extractedData.clientRef?.poNumber || '',
      products: extractedData.products || extractedData.items || [],
      paymentTerms: extractedData.paymentTerms || '',
      deliveryTerms: extractedData.deliveryTerms || '',
      currency: extractedData.currency || 'USD',
      exchangeRate: extractedData.exchangeRate || 1,
      subtotal: extractedData.subtotal || 0,
      discount: extractedData.discount || 0,
      shipping: extractedData.shipping || 0,
      tax: extractedData.tax || 0,
      grandTotal: extractedData.grandTotal || extractedData.subtotal || 0,
      notes: extractedData.notes || '',
      status: 'pending'
    };
    actionMessage = 'Document processed successfully. Please verify the extracted data.';
}

      // ✅ CRITICAL: Include document storage information in PI data
      const enhancedPIData = {
        ...piData,
        // Document storage identifiers
        documentId: extractedData.documentId,
        documentNumber: extractedData.documentNumber,
        documentType: 'pi',
        
        // Storage metadata
        storageInfo: extractedData.storageInfo,
        hasStoredDocuments: extractedData.hasStoredDocuments,
        
        // File information
        originalFileName: extractedData.originalFileName,
        fileSize: extractedData.fileSize,
        contentType: extractedData.contentType,
        
        // Timestamps
        extractedAt: extractedData.extractedAt,
        storedAt: extractedData.storedAt
      };

      console.log('📋 FIXED: Enhanced PI data:', {
        piNumber: enhancedPIData.piNumber,
        documentId: enhancedPIData.documentId,
        hasStoredDocuments: enhancedPIData.hasStoredDocuments,
        storageInfo: !!enhancedPIData.storageInfo
      });

      // Check for PO matches
      if (extractedData.clientRef?.poNumber) {
        try {
          const matchedPO = await findPOByNumber(extractedData.clientRef.poNumber);
          if (matchedPO) {
            showNotification(`Matched with PO: ${matchedPO.orderNumber}`, 'success');
            enhancedPIData.linkedPO = matchedPO.id;
          }
        } catch (error) {
          console.warn('PO matching failed:', error);
        }
      }

      // Set PI data for modal
      setSelectedPI(enhancedPIData);
      setShowModal(true);
      
      showNotification(actionMessage, 'success');
      
      // Show document storage status
      if (extractedData.hasStoredDocuments) {
        showNotification(`📁 ${extractedData.storageInfo?.summary?.filesStored || 2} documents stored successfully`, 'info');
      } else {
        showNotification('⚠️ Document storage failed - extraction data saved locally', 'warning');
      }
      
    } else {
      throw new Error(result.error || 'Extraction failed');
    }
    
  } catch (error) {
    console.error('❌ FIXED: Extraction failed:', error);
    showNotification(`Failed to extract PI data: ${error.message}`, 'error');
  } finally {
    setExtracting(false);
    // Clear file input
    if (event.target) {
      event.target.value = '';
    }
  }
};

  // Enhanced Chinese supplier PI processing
  const processChineseSupplierPI = async (extractedData) => {
    console.log('Processing Chinese supplier PI with optimized extractor:', extractedData);
    
    // Find supplier by name with fuzzy matching
    let matchedSupplier = null;
    if (extractedData.supplier?.name) {
      try {
        // Try exact match first
        matchedSupplier = suppliers.find(s => 
          s.companyName?.toLowerCase() === extractedData.supplier.name.toLowerCase() ||
          s.name?.toLowerCase() === extractedData.supplier.name.toLowerCase()
        );
        
        // Try partial match if exact fails
        if (!matchedSupplier) {
          matchedSupplier = suppliers.find(s => {
            const supplierWords = (s.companyName || s.name || '').toLowerCase().split(' ');
            const extractedWords = extractedData.supplier.name.toLowerCase().split(' ');
            
            // Check if any significant words match
            return extractedWords.some(word => 
              word.length > 3 && supplierWords.some(sWord => 
                sWord.includes(word) || word.includes(sWord)
              )
            );
          });
        }
        
        if (matchedSupplier) {
          console.log('Found matching supplier:', matchedSupplier.companyName || matchedSupplier.name);
          showNotification(`Matched with existing supplier: ${matchedSupplier.companyName || matchedSupplier.name}`, 'success');
        } else {
          console.log('No matching supplier found for:', extractedData.supplier.name);
          showNotification(
            `New supplier detected: ${extractedData.supplier.name}. You can add them to your database after saving.`,
            'info'
          );
        }
      } catch (error) {
        console.error('Error finding supplier:', error);
      }
    }

    const piData = {
      // Basic info
      piNumber: extractedData.piNumber || '',
      date: extractedData.date || new Date().toISOString().split('T')[0],
      expiryDate: extractedData.validUntil || '',
      
      // Supplier info (optimized extraction)
      supplierId: matchedSupplier?.id || '',
      supplierName: extractedData.supplier?.name || '',
      supplierContact: extractedData.supplier?.contact || '',
      supplierEmail: extractedData.supplier?.email || '',
      supplierPhone: extractedData.supplier?.phone || '',
      supplierAddress: extractedData.supplier?.address || '',
      supplierCountry: extractedData.supplier?.country || 'China',
      
      // Store full supplier object for create new supplier functionality
      supplier: extractedData.supplier || null,
      
      // Client reference (Flow Solution specifics)
      projectCode: extractedData.clientRef?.poNumber || '',
      clientName: extractedData.clientRef?.name || 'Flow Solution Sdn Bhd',
      clientContact: 'Edison Chung',
      clientAddress: extractedData.clientRef?.address || 'PT7257, Jalan BBN 1/2a, Bandar Baru Nilai, 71800 Negeri Sembilan',
      
      // Priority Flag
      isPriority: false,
      priorityReason: '',
      
      // Items (enhanced mapping)
      items: (extractedData.products || []).map((item, index) => ({
        id: `item-${Date.now()}-${index}`,
        productCode: item.productCode || item.partNumber || '',
        partNumber: item.partNumber || item.productCode || '',
        productName: item.productName || item.description || '',
        brand: item.brand || '',
        category: item.category || 'General',
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || 'pcs',
        unitPrice: parseFloat(item.unitPrice) || 0,
        totalPrice: parseFloat(item.totalPrice) || (parseFloat(item.quantity) * parseFloat(item.unitPrice)),
        hsCode: item.hsCode || '',
        leadTime: item.leadTime || '',
        warranty: item.warranty || '',
        specifications: item.specifications || '',
        notes: item.specifications || item.notes || '',
        // Receiving tracking fields
        received: false,
        receivedQty: 0,
        receivedDate: '',
        hasDiscrepancy: false,
        discrepancyReason: ''
      })),
      
      // Financial (USD standard for Chinese suppliers)
      currency: extractedData.currency || 'USD',
      exchangeRate: parseFloat(extractedData.exchangeRate) || 1,
      subtotal: parseFloat(extractedData.subtotal) || 0,
      discount: parseFloat(extractedData.discount) || 0,
      shipping: parseFloat(extractedData.shipping) || 0,
      tax: parseFloat(extractedData.tax) || 0,
      totalAmount: parseFloat(extractedData.grandTotal) || 0,
      
      // Terms (Chinese supplier standards)
      paymentTerms: extractedData.paymentTerms || '100% T/T in advance',
      deliveryTerms: extractedData.deliveryTerms || 'DDP',
      leadTime: extractedData.leadTime || '5-10 working days',
      warranty: extractedData.warranty || '12 months',
      validity: '30 days',
      
      // Additional Information
      notes: extractedData.notes || `Extracted from supplier: ${extractedData.supplier?.name || 'Unknown'}`,
      specialInstructions: extractedData.specialInstructions || '',
      
      // Status
      status: 'draft',
      deliveryStatus: 'pending',
      paymentStatus: 'pending',
      purpose: extractedData.clientRef?.poNumber ? 'client-order' : 'stock',
      
      // Enhanced banking details (Chinese/HK banks)
      bankDetails: {
        bankName: extractedData.bankDetails?.bankName || '',
        accountNumber: extractedData.bankDetails?.accountNumber || '',
        accountName: extractedData.bankDetails?.accountName || extractedData.supplier?.name || '',
        swiftCode: extractedData.bankDetails?.swiftCode || '',
        iban: extractedData.bankDetails?.iban || '',
        bankAddress: extractedData.bankDetails?.bankAddress || '',
        bankCode: extractedData.bankDetails?.bankCode || '',
        branchCode: extractedData.bankDetails?.branchCode || '',
        country: extractedData.supplier?.country || 'China'
      }
    };

    // Auto-calculate totals if missing
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
          piData.linkedPO = matchedPO.id;
          piData.purpose = 'client-order';
          piData.projectCode = matchedPO.orderNumber;
          showNotification(`Linked to PO: ${matchedPO.orderNumber}`, 'success');
        }
      } catch (error) {
        console.error('Error matching PO:', error);
      }
    }

    return piData;
  };

  // Process client PO for PI creation
  const processClientPOForPI = async (extractedData) => {
    console.log('Processing client PO for PI creation:', extractedData);
    
    showNotification(
      'Client Purchase Order detected. Creating PI template based on PO requirements.',
      'info'
    );

    const piData = {
      // Basic info
      piNumber: '',
      date: new Date().toISOString().split('T')[0],
      expiryDate: '',
      
      // Reference the client PO
      projectCode: extractedData.orderNumber || extractedData.poNumber || '',
      clientName: extractedData.buyer?.name || extractedData.clientInfo?.name || 'Flow Solution Sdn Bhd',
      clientContact: 'Edison Chung',
      clientAddress: 'PT7257, Jalan BBN 1/2a, Bandar Baru Nilai, 71800 Negeri Sembilan',
      
      // Empty supplier info (to be filled)
      supplierId: '',
      supplierName: '',
      supplierContact: '',
      supplierEmail: '',
      supplierPhone: '',
      supplier: null,
      
      // Priority Flag
      isPriority: false,
      priorityReason: '',
      
      // Products/Items - ensure proper mapping with COMPLETE fields
      items: (extractedData.products || extractedData.items || []).map((item, index) => {
        console.log(`Mapping ProformaInvoices item ${index + 1}:`, item);
        return {
          id: `item-${Date.now()}-${index}`,
          productCode: item.productCode || item.partNumber || item.part_number || '',
          productName: item.productName || item.description || item.product_description || item.name || '',
          quantity: parseInt(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice || item.unit_price || item.price) || 0,
          totalPrice: parseFloat(item.totalPrice || item.total_price || item.total) || 0,
          unit: item.unit || item.uom || 'pcs',
          leadTime: item.leadTime || item.lead_time || '',
          warranty: item.warranty || '',
          notes: item.notes || item.specifications || '',
          // Additional fields for receiving tracking
          received: false,
          receivedQty: 0,
          receivedDate: '',
          hasDiscrepancy: false,
          discrepancyReason: '',
          receivingNotes: ''
        };
      }),
      
      // Default values for new PI
      currency: extractedData.currency || 'USD',
      exchangeRate: 1,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      tax: 0,
      totalAmount: 0,
      
      // Default terms
      paymentTerms: '30% down payment, 70% before delivery',
      deliveryTerms: 'DDP',
      leadTime: '2-3 weeks',
      warranty: '12 months',
      validity: '30 days',
      
      // Status
      status: 'draft',
      deliveryStatus: 'pending',
      paymentStatus: 'pending',
      purpose: 'client-order',
      
      // Additional Information
      notes: `PI template created from Client PO: ${extractedData.orderNumber || 'Unknown'}\nOriginal PO Value: ${extractedData.currency || 'USD'} ${extractedData.grandTotal || 'TBD'}\n\nPlease select supplier and fill in pricing details.`,
      specialInstructions: '',
      
      // Banking details (empty)
      bankDetails: {
        bankName: '',
        accountNumber: '',
        accountName: '',
        swiftCode: '',
        iban: '',
        bankAddress: '',
        bankCode: '',
        branchCode: '',
        country: ''
      }
    };

    return piData;
    const handleViewDocuments = (pi) => {
  setDocumentsModal({ open: true, pi });
};
  };

  // Process supplier invoice as PI
  const processSupplierInvoiceAsPI = async (extractedData) => {
    console.log('Processing supplier invoice as PI:', extractedData);
    
    showNotification(
      'Supplier Invoice detected. Converting to Proforma Invoice format.',
      'info'
    );

    // Use similar logic to processChineseSupplierPI but adapt for invoice data
    const piData = await processChineseSupplierPI({
      ...extractedData,
      piNumber: extractedData.invoiceNumber || extractedData.piNumber || '',
      validUntil: '',
      notes: `${extractedData.notes || ''}\n\nConverted from Supplier Invoice: ${extractedData.invoiceNumber || 'Unknown'}`
    });

    return piData;
  };

  // Process quotation as PI
  const processQuotationAsPI = async (extractedData) => {
    console.log('Processing quotation as PI:', extractedData);
    
    showNotification(
      'Supplier Quotation detected. Converting to Proforma Invoice format.',
      'info'
    );

    const piData = await processChineseSupplierPI({
      ...extractedData,
      piNumber: extractedData.quoteNumber || extractedData.piNumber || '',
      notes: `${extractedData.notes || ''}\n\nConverted from Supplier Quotation: ${extractedData.quoteNumber || 'Unknown'}`
    });

    return piData;
  };

  // Enhanced data validation and enrichment
  const enhancePIData = async (piData, extractedData) => {
    console.log('Enhancing PI data...');
    
    // Validate required fields
    if (!piData.piNumber) {
      piData.piNumber = `PI-${Date.now()}`;
    }
    
    if (!piData.date) {
      piData.date = new Date().toISOString().split('T')[0];
    }
    
    // Ensure all items have valid data
    piData.items = piData.items.filter(item => 
      item.productCode && item.quantity > 0
    ).map(item => ({
      ...item,
      totalPrice: item.totalPrice || (item.quantity * item.unitPrice)
    }));
    
    // Recalculate totals
    const itemsTotal = piData.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    if (!piData.subtotal || piData.subtotal === 0) {
      piData.subtotal = itemsTotal;
    }
    
    if (!piData.totalAmount || piData.totalAmount === 0) {
      piData.totalAmount = piData.subtotal + (piData.shipping || 0) + (piData.tax || 0) - (piData.discount || 0);
    }
    
    // Validate currency
    if (!piData.currency) {
      piData.currency = 'USD';
    }
    
    // Set default exchange rate
    if (!piData.exchangeRate || piData.exchangeRate === 0) {
      piData.exchangeRate = 1;
    }
    
    console.log('Enhanced PI data:', piData);
    return piData;
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

  // ✅ UPDATED: Enhanced handleSavePI with product sync
  const handleSavePI = async (piData) => {
    try {
      console.log('Saving PI data:', piData);
      console.log('selectedPI:', selectedPI);
      console.log('selectedPI?.id:', selectedPI?.id);
      
      // Check if selectedPI has a valid ID, not just if it exists
      // If selectedPI exists but has no ID, it's extracted data for a NEW PI
      const isUpdate = selectedPI && selectedPI.id && selectedPI.id !== undefined && selectedPI.id !== null;
      
      console.log('isUpdate:', isUpdate);
      
      const result = isUpdate
        ? await updateProformaInvoice(selectedPI.id, piData)
        : await addProformaInvoice(piData);

      console.log('Save result:', result);

      if (result.success) {
        // ✅ NEW: Sync products to Products database
        const savedPI = result.data || { ...piData, id: result.id || selectedPI?.id };
        await syncPIProductsToDatabase(piData, savedPI);
        
        showNotification(
          isUpdate ? 'PI updated successfully' : 'PI created successfully',
          'success'
        );
        setShowModal(false);
        setSelectedPI(null);
      } else {
        showNotification('Failed to save PI', 'error');
      }
    } catch (error) {
      console.error('Error saving PI:', error);
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
                className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  onViewDocuments={() => handleViewDocuments(pi)} // ADD THIS LINE
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
                            {supplier?.name || pi.supplierName || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(pi.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pi.currency || 'USD'} {pi.totalAmount?.toFixed(2) || '0.00'}
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
    {/* ADD THIS NEW DOCUMENTS BUTTON */}
    {pi.id && (
      <button
        onClick={() => handleViewDocuments(pi)}
        className="text-purple-600 hover:text-purple-900"
        title="View Documents"
      >
        <FileText size={16} />
      </button>
    )}
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
              : 'Get started by creating a new PI or uploading a PI document'}
          </p>
          {canEdit && !searchTerm && filterStatus === 'all' && filterDelivery === 'all' && filterPurpose === 'all' && (
            <div className="mt-6 space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Upload size={20} />
                Upload PI
              </button>
              <button
                onClick={handleAddPI}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Manually
              </button>
            </div>
          )}
        </div>
      )}

{/* PI Modal with Enhanced Props */}
      {showModal && (
        <PIModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedPI(null);
          }}
          onSave={handleSavePI}
          proformaInvoice={selectedPI}
          suppliers={suppliers}
          products={products}
          addSupplier={addSupplier}
          showNotification={showNotification}
          enableStockAllocation={true}
        />
      )}

      {/* Documents Modal */}
      {documentsModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                Documents - PI {documentsModal.pi?.piNumber}
              </h2>
              <button
                onClick={() => setDocumentsModal({ open: false, pi: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <DocumentViewer
                documentId={documentsModal.pi?.id}
                documentType="pi"
                documentNumber={documentsModal.pi?.piNumber}
                allowDelete={true}
                showTitle={false}
                onDocumentDeleted={(doc) => {
                  console.log('Document deleted:', doc);
                  showNotification?.('Document deleted successfully', 'success');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProformaInvoices;
