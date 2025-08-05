// src/components/procurement/ProformaInvoices.jsx
// Enhanced with dark mode support using optimized theme utilities while preserving ALL existing functionality

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Plus, Search, Filter, Calendar, 
  Download, Eye, Edit, Trash2, Truck, Package,
  AlertCircle, Clock, CheckCircle, CreditCard,
  Grid, List, Briefcase, AlertTriangle, Upload, Loader2, X,
  Layers  // For batch upload icon
} from 'lucide-react';
import { useProformaInvoices } from '../../hooks/useProformaInvoices';
import { usePermissions } from '../../hooks/usePermissions';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useProducts } from '../../hooks/useProducts';
import { mockFirebase } from '../../services/firebase';
import AIExtractionService from '../../services/ai/AIExtractionService';
import enhancedBatchUploadService from '../../services/EnhancedBatchUploadService';
import PICard from './PICard';
import PIModal from './PIModal';
import DocumentViewer from '../common/DocumentViewer';
import StockAllocationModal from './StockAllocationModal';
import { StockAllocationService } from '../../services/StockAllocationService';
import BatchUploadModal from './BatchUploadModal';
import BatchPaymentProcessor from './BatchPaymentProcessor';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.js';

// 🎨 NEW: Import theme utilities for optimized dark mode
import { themeClasses, tw, useThemeClasses } from '../../utils/theme';
import { useDarkMode } from '../../hooks/useDarkMode';

const ProformaInvoices = ({ showNotification }) => {
  // 🎨 NEW: Dark mode hook for theme awareness
  const { isDarkMode, themeVariant, highContrast } = useDarkMode();
  
  // 🎨 NEW: Memoized theme classes for performance
  const cardClasses = useThemeClasses('card', 'hover');
  const buttonClasses = useThemeClasses('button', 'primary');
  const inputClasses = useThemeClasses('input', 'default');
  const modalClasses = useThemeClasses('modal', 'large');

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
  const [showBatchModal, setShowBatchModal] = useState(false); // NEW: Batch upload modal
  const [showBatchPaymentModal, setShowBatchPaymentModal] = useState(false);

  const [selectedPI, setSelectedPI] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDelivery, setFilterDelivery] = useState('all');
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [documentsModal, setDocumentsModal] = useState({ open: false, pi: null });
  const [viewMode, setViewMode] = useState('grid');
  const [groupByYear, setGroupByYear] = useState(true);
  
  // NEW: Batch upload statistics
  const [batchStats, setBatchStats] = useState({
    activeBatches: 0,
    processingFiles: 0
  });
  const [selectedPIs, setSelectedPIs] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
    
  // AI Extraction states
  const fileInputRef = useRef(null);
  const [extracting, setExtracting] = useState(false);

  const canEdit = permissions.canEditPI || permissions.isAdmin;
  const canDelete = permissions.isAdmin;

  // Initialize batch service with notification function
  useEffect(() => {
    if (showNotification) {
      enhancedBatchUploadService.setNotificationFunction(showNotification);
    }
  }, [showNotification]);

  // NEW: Poll for batch upload statistics
  useEffect(() => {
    const interval = setInterval(() => {
      const stats = enhancedBatchUploadService.getStatistics();
      const activeBatches = enhancedBatchUploadService.getActiveBatches();
      
      setBatchStats({
        activeBatches: activeBatches.length,
        processingFiles: activeBatches.reduce((sum, batch) => 
          sum + batch.files.filter(f => f.status === 'processing').length, 0
        )
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // ✅ NEW: Product Sync Function (PRESERVED)
  const syncPIProductsToDatabase = async (piData, savedPI) => {
    try {
      console.log('🔄 Syncing PI products to Products database...');
      
      if (!piData.items || !Array.isArray(piData.items)) {
        console.log('No items to sync');
        return { synced: 0, created: 0, updated: 0 };
      }

      const syncStats = { synced: 0, created: 0, updated: 0 };
      const supplier = suppliers.find(s => s.id === piData.supplierId);

      for (const item of piData.items) {
        try {
          // Find existing product by SKU/code
          const existingProduct = products.find(p => 
            p.sku === item.productCode || 
            p.name === item.productName
        };

export default ProformaInvoices;

          if (existingProduct) {
            // Update existing product - Build clean update data - CRITICAL FIX
            const updateData = {
              // Core product info
              name: item.productName || existingProduct.name || 'Unnamed Product',
              sku: item.productCode || existingProduct.sku || `SKU-${Date.now()}`,
              description: item.notes || item.specifications || existingProduct.description || '',
              
              // Pricing - only include if values exist
              ...(item.unitPrice !== undefined && item.unitPrice !== null && { 
                price: parseFloat(item.unitPrice) || 0,
                unitCost: parseFloat(item.unitPrice) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0
              }),
              
              // Supplier info - only if available
              ...(piData.supplierId && { supplierId: piData.supplierId }),
              ...(supplier?.name && { supplierName: supplier.name }),
              
              // Stock management with defaults
              stock: existingProduct.stock || 0,
              currentStock: existingProduct.currentStock || 0,
              minStock: existingProduct.minStock || 1,
              minStockLevel: existingProduct.minStockLevel || 1,
              
              // Categories
              category: existingProduct.category || detectProductCategory(item.productName) || 'components',
              ...(item.brand && { brand: item.brand }),
              
              // Status
              status: existingProduct.status || 'active',
              
              // Tracking
              updatedAt: new Date().toISOString(),
              
              // PI References - safely merge with existing
              piReferences: [
                ...(existingProduct.piReferences || []),
                {
                  piId: savedPI.id,
                  piNumber: piData.piNumber,
                  unitPrice: parseFloat(item.unitPrice) || 0,
                  date: piData.date || new Date().toISOString(),
                  supplierName: supplier?.name || 'Unknown Supplier'
                }
              ].filter((ref, index, arr) => 
                // Remove duplicates based on piId
                arr.findIndex(r => r.piId === ref.piId) === index
              ),
              
              // Additional fields - only if they exist
              ...(item.leadTime && { leadTime: item.leadTime }),
              ...(item.warranty && { warranty: item.warranty }),
              ...(item.notes && { 
                notes: `${existingProduct.notes || ''}${existingProduct.notes ? '\n' : ''}Updated from PI: ${piData.piNumber}${item.notes ? '\n' + item.notes : ''}`.trim()
              })
            };

            // CRITICAL: Remove any undefined or null values before sending to Firestore
            Object.keys(updateData).forEach(key => {
              if (updateData[key] === undefined || updateData[key] === null) {
                delete updateData[key];
                console.log(`🧹 PRODUCTS: Removed undefined/null field: ${key}`);
              }
            });

            const result = await updateProduct(existingProduct.id, updateData);
            if (result.success) {
              syncStats.updated++;
              console.log(`✅ Updated product: ${existingProduct.name}`);
            } else {
              console.error(`❌ Failed to update product: ${existingProduct.name}`, result.error);
            }
          } else {
            // Create new product from PI item - Build clean new product data - CRITICAL FIX
            const newProduct = {
              // Core product info - with safe defaults
              name: item.productName || 'Unnamed Product',
              sku: item.productCode || `SKU-${Date.now()}`,
              description: item.notes || item.specifications || '',
              
              // Pricing - only include if values exist
              ...(item.unitPrice !== undefined && item.unitPrice !== null && { 
                price: parseFloat(item.unitPrice) || 0,
                unitCost: parseFloat(item.unitPrice) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0
              }),
              
              // Supplier info - only if available
              ...(piData.supplierId && { supplierId: piData.supplierId }),
              ...(supplier?.name && { supplierName: supplier.name }),
              
              // Stock management with safe defaults
              stock: 0,
              currentStock: 0,
              minStock: 1,
              minStockLevel: 1,
              
              // Categories
              category: detectProductCategory(item.productName) || 'components',
              ...(item.brand && { brand: item.brand }),
              
              // Status
              status: 'active',
              
              // Tracking
              dateAdded: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              source: 'pi_import',
              
              // PI References
              piReferences: [{
                piId: savedPI.id,
                piNumber: piData.piNumber,
                unitPrice: parseFloat(item.unitPrice) || 0,
                date: piData.date || new Date().toISOString(),
                supplierName: supplier?.name || 'Unknown Supplier'
              }],
              
              // Additional fields - only if they exist
              ...(item.leadTime && { leadTime: item.leadTime }),
              ...(item.warranty && { warranty: item.warranty }),
              ...(item.notes && { 
                notes: `Imported from PI: ${piData.piNumber}${item.notes ? '\n' + item.notes : ''}`
              }),
              
              // Empty fields for missing data
              photo: '',
              catalog: ''
            };

            // CRITICAL: Remove any undefined or null values before sending to Firestore
            Object.keys(newProduct).forEach(key => {
              if (newProduct[key] === undefined || newProduct[key] === null) {
                delete newProduct[key];
                console.log(`🧹 PRODUCTS: Removed undefined/null field: ${key}`);
              }
            });

            const result = await addProduct(newProduct);
            if (result.success) {
              syncStats.created++;
              console.log(`✅ Created product: ${newProduct.name}`);
            } else {
              console.error(`❌ Failed to create product: ${newProduct.name}`, result.error);
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
      } else if (syncStats.synced > 0) {
        showNotification(`${syncStats.synced} products processed (no changes needed)`, 'info');
      }
      
      return syncStats;
    } catch (error) {
      console.error('Error syncing PI products:', error);
      showNotification(`Error syncing products: ${error.message}`, 'error');
      return { synced: 0, created: 0, updated: 0, error: error.message };
    }
  };

  // Helper function to detect product category (PRESERVED)
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

  // Enhanced addSupplier function that works with PIModal (PRESERVED)
  const addSupplier = async (supplierData) => {
    try {
      console.log('ProformaInvoices - Adding supplier:', supplierData);
      
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

  // Filter PIs based on search and filters (PRESERVED)
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

  // Group PIs by year (PRESERVED)
  const pisByYear = groupByYear ? filteredPIs.reduce((acc, pi) => {
    const year = new Date(pi.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(pi);
    return acc;
  }, {}) : { 'All': filteredPIs };

  // Sort years descending (newest first) (PRESERVED)
  const sortedYears = Object.keys(pisByYear).sort((a, b) => {
    if (a === 'All') return 1;
    if (b === 'All') return -1;
    return b - a;
  });

  // Enhanced PO finding with better matching (PRESERVED)
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

  // Enhanced file upload handler with comprehensive document type support (PRESERVED + ENHANCED)
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

  // Enhanced Chinese supplier PI processing (PRESERVED)
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

  // Process client PO for PI creation (PRESERVED)
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
  };

  // Process supplier invoice as PI (PRESERVED)
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

  // Enhanced data validation and enrichment (PRESERVED)
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

  // Handler functions (PRESERVED)
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

  // Enhanced PI filtering for BatchPaymentProcessor
  const getAvailablePIsForBatchPayment = () => {
    return proformaInvoices.filter(pi => {
      const totalAmount = parseFloat(pi.totalAmount || 0);
      const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const remainingBalance = totalAmount - totalPaid;
      
      return (
        totalAmount > 0 && 
        remainingBalance > 0.01 && 
        pi.paymentStatus !== 'paid' &&
        pi.status !== 'cancelled' &&
        pi.status !== 'draft'
      );
    });
  };

  // Enhanced batch payment audit function
  const saveBatchPaymentAudit = async (auditRecord) => {
    try {
      // Save to localStorage as fallback
      const existingAudits = JSON.parse(localStorage.getItem('batchPaymentAudits') || '[]');
      existingAudits.push(auditRecord);
      
      // Keep only last 100 audit records
      if (existingAudits.length > 100) {
        existingAudits.splice(0, existingAudits.length - 100);
      }
      
      localStorage.setItem('batchPaymentAudits', JSON.stringify(existingAudits));
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save batch payment audit:', error);
      return { success: false, error: error.message };
    }
  };

  // Payment status display enhancement for PI cards
  const renderPaymentStatus = (pi) => {
    const totalAmount = parseFloat(pi.totalAmount || 0);
    const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    const remainingBalance = totalAmount - totalPaid;
    const paymentPercentage = totalAmount > 0 ? (totalPaid / totalAmount * 100) : 0;
    
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Paid' },
      partial: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: `${paymentPercentage.toFixed(0)}% Paid` },
      pending: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Pending' }
    };
    
    const config = statusConfig[pi.paymentStatus] || statusConfig.pending;
    
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
        {pi.paymentStatus === 'partial' && (
          <span className={`text-xs ${themeClasses.textSecondary}`}>
            {pi.currency} {remainingBalance.toLocaleString()} remaining
          </span>
        )}
      </div>
    );
  };

  const handlePaymentProcessed = async (paymentRecord) => {
    try {
      console.log('🎯 Processing batch payment record - TOTALS ONLY (payments already created):', paymentRecord);
      
      let updatedCount = 0;
      let errorCount = 0;
      const processedPIs = [];
      
      // 🔧 NEW: Get fresh data directly from Firestore for each PI
      // Add delay to ensure Firestore write operations complete before reading
      console.log('⏳ Waiting for Firestore write operations to complete...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      
      for (const allocation of paymentRecord.piAllocations) {
        try {
          // 🔧 CRITICAL: Get fresh PI data directly from Firestore (bypass stale state)
          console.log('🔍 Fetching fresh PI data from Firestore for:', allocation.piId);
          
          // Import Firebase functions dynamically to ensure they're available
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../../services/firebase.js');
          
          const piDocRef = doc(db, 'proformaInvoices', allocation.piId);
          const piDocSnap = await getDoc(piDocRef);
          
          if (!piDocSnap.exists()) {
            console.error('❌ PI not found in Firestore:', allocation.piId);
            errorCount++;
            continue;
          }
          
          const freshPI = { id: piDocSnap.id, ...piDocSnap.data() };
          
          console.log('🔍 Found PI for totals update (FRESH from Firestore):', {
            piNumber: freshPI.piNumber,
            currentTotalPaid: freshPI.totalPaid,
            currentPaymentStatus: freshPI.paymentStatus,
            currentPaymentsLength: (freshPI.payments || []).length
          });

          // 🔧 CRITICAL: Calculate totals from FRESH payments data
          const existingPayments = freshPI.payments || [];
          const totalPaid = existingPayments.reduce((sum, p) => {
            const amt = parseFloat(p.amount || p.allocatedAmount || p.paidAmount || 0);
            return sum + (isNaN(amt) ? 0 : amt);
          }, 0);
          
          const totalAmount = parseFloat(freshPI.totalAmount || 0);
          
          console.log('🧮 Payment calculations (from fresh Firestore data):', {
            existingPayments: existingPayments.length,
            calculatedTotalPaid: totalPaid,
            piTotalAmount: totalAmount
          });

          // Determine payment status
          let newPaymentStatus = 'pending';
          if (totalAmount > 0) {
            if (totalPaid >= totalAmount - 0.01) {
              newPaymentStatus = 'paid';
            } else if (totalPaid > 0.01) {
              newPaymentStatus = 'partial';
            }
          }

          // 🔧 CRITICAL: Only update totals - DON'T touch payments array
          const updateData = {
            totalPaid: Number(totalPaid),
            paymentStatus: newPaymentStatus,
            lastPaymentDate: paymentRecord.paymentDate,
            lastModified: new Date().toISOString(),
            lastModifiedBy: 'batch-payment-system-fresh-totals'
          };

          console.log('📝 Updating PI totals with fresh calculation:', {
            piId: allocation.piId,
            piNumber: freshPI.piNumber,
            updateData: updateData
          });

          // Update PI in Firestore (totals only)
          const result = await updateProformaInvoice(allocation.piId, updateData);
          
          console.log('📊 updateProformaInvoice result (fresh data):', {
            success: result.success,
            error: result.error
          });

          if (result.success) {
            updatedCount++;
            processedPIs.push({
              piNumber: freshPI.piNumber,
              amount: parseFloat(allocation.allocatedAmount),
              currency: allocation.currency,
              status: newPaymentStatus,
              isPartial: allocation.isPartialPayment,
              totalPaid: totalPaid,
              remainingBalance: totalAmount - totalPaid
            });
            
            console.log(`✅ Successfully updated PI ${freshPI.piNumber} totals (with fresh data):`, {
              totalPaid: totalPaid,
              paymentStatus: newPaymentStatus,
              paymentsCount: existingPayments.length
            });

          } else {
            throw new Error(result.error || 'Failed to update PI totals');
          }
        } catch (error) {
          console.error(`❌ Error processing PI ${allocation.piId}:`, error);
          errorCount++;
        }
      }
      
      // Show comprehensive success notification
      if (updatedCount > 0) {
        const partialPayments = processedPIs.filter(p => p.isPartial).length;
        const fullPayments = processedPIs.filter(p => !p.isPartial).length;
        
        let successMessage = `Batch payment totals updated successfully!\n`;
        successMessage += `• Updated ${updatedCount} PI${updatedCount > 1 ? 's' : ''}\n`;
        successMessage += `• Total: ${paymentRecord.currency} ${paymentRecord.totalPaid.toLocaleString()}\n`;
        successMessage += `• Reference: ${paymentRecord.paymentSlipRef}\n`;
        if (partialPayments > 0) {
          successMessage += `• Partial payments: ${partialPayments}\n`;
        }
        if (fullPayments > 0) {
          successMessage += `• Full payments: ${fullPayments}\n`;
        }
        if (errorCount > 0) {
          successMessage += `• ${errorCount} failed to process`;
        }
        
        showNotification(
          successMessage,
          errorCount > 0 ? 'warning' : 'success',
          8000
        );
        
        console.log('📊 Final Batch Payment Summary (with fresh data):', {
          totalProcessed: processedPIs.length,
          partialPayments,
          fullPayments,
          breakdown: processedPIs
        });

      } else {
        showNotification('No PI totals were updated. Please check the allocations.', 'warning');
      }
      
      // Close the modal
      setShowBatchPaymentModal(false);
      
    } catch (error) {
      console.error('❌ Error processing batch payment totals:', error);
      showNotification(
        `Failed to process batch payment totals: ${error.message}`,
        'error',
        10000
      );
    }
  };

  const handleViewDocuments = (pi) => {
    setDocumentsModal({ open: true, pi });
  };

  // Bulk delete functionality
  const handleBulkDelete = async () => {
    if (selectedPIs.size === 0) {
      showNotification('No PIs selected for deletion', 'warning');
      return;
    }
    
    const confirmed = window.confirm(
      `Delete ${selectedPIs.size} Proforma Invoice${selectedPIs.size > 1 ? 's' : ''}? This cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      showNotification(`Deleting ${selectedPIs.size} PIs...`, 'info');
      
      let successCount = 0;
      let errorCount = 0;
      
      // Delete each PI
      for (const piId of selectedPIs) {
        try {
          const result = await deleteProformaInvoice(piId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`Error deleting PI ${piId}:`, error);
          errorCount++;
        }
      }
      
      // Clear selections and exit bulk mode
      setSelectedPIs(new Set());
      setBulkMode(false);
      
      // Show results
      if (successCount > 0) {
        showNotification(
          `Successfully deleted ${successCount} PI${successCount > 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
          errorCount > 0 ? 'warning' : 'success'
        );
      } else {
        showNotification('Failed to delete any PIs', 'error');
      }
      
    } catch (error) {
      console.error('Bulk delete error:', error);
      showNotification(`Error during bulk delete: ${error.message}`, 'error');
    }
  };

  const handleSelectAll = () => {
    if (selectedPIs.size === filteredPIs.length) {
      // Deselect all
      setSelectedPIs(new Set());
    } else {
      // Select all filtered PIs
      setSelectedPIs(new Set(filteredPIs.map(pi => pi.id)));
    }
  };

  const handlePISelection = (piId, isSelected) => {
    const newSelection = new Set(selectedPIs);
    if (isSelected) {
      newSelection.add(piId);
    } else {
      newSelection.delete(piId);
    }
    setSelectedPIs(newSelection);
  };

  // ✅ UPDATED: Enhanced handleSavePI with product sync (PRESERVED)
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

  // 🎨 NEW: Theme-aware status color helpers
  const getStatusColor = (status) => {
    const colors = {
      confirmed: isDarkMode 
        ? 'bg-green-900 text-green-200 border-green-700' 
        : 'bg-green-100 text-green-800 border-green-200',
      pending: isDarkMode 
        ? 'bg-yellow-900 text-yellow-200 border-yellow-700' 
        : 'bg-yellow-100 text-yellow-800 border-yellow-200',
      draft: isDarkMode 
        ? 'bg-gray-800 text-gray-200 border-gray-600' 
        : 'bg-gray-100 text-gray-800 border-gray-200',
      default: isDarkMode 
        ? 'bg-gray-800 text-gray-200 border-gray-600' 
        : 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || colors.default;
  };

  const getDeliveryColor = (status) => {
    const colors = {
      delivered: isDarkMode 
        ? 'bg-green-900 text-green-200 border-green-700' 
        : 'bg-green-100 text-green-800 border-green-200',
      'in-transit': isDarkMode 
        ? 'bg-blue-900 text-blue-200 border-blue-700' 
        : 'bg-blue-100 text-blue-800 border-blue-200',
      partial: isDarkMode 
        ? 'bg-yellow-900 text-yellow-200 border-yellow-700' 
        : 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: isDarkMode 
        ? 'bg-gray-800 text-gray-200 border-gray-600' 
        : 'bg-gray-100 text-gray-800 border-gray-200',
      default: isDarkMode 
        ? 'bg-gray-800 text-gray-200 border-gray-600' 
        : 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || colors.default;
  };

  const getPaymentColor = (status) => {
    const colors = {
      paid: isDarkMode 
        ? 'bg-green-900 text-green-200 border-green-700' 
        : 'bg-green-100 text-green-800 border-green-200',
      partial: isDarkMode 
        ? 'bg-yellow-900 text-yellow-200 border-yellow-700' 
        : 'bg-yellow-100 text-yellow-800 border-yellow-200',
      pending: isDarkMode 
        ? 'bg-gray-800 text-gray-200 border-gray-600' 
        : 'bg-gray-100 text-gray-800 border-gray-200',
      default: isDarkMode 
        ? 'bg-gray-800 text-gray-200 border-gray-600' 
        : 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[status] || colors.default;
  };

  if (loading) return (
    <div className={`text-center py-8 ${themeClasses.textPrimary}`}>
      Loading...
    </div>
  );
  
  if (error) return (
    <div className={`text-center py-8 text-red-600 dark:text-red-400`}>
      Error: {error}
    </div>
  );

  return (
    <div className={`space-y-6 ${themeClasses.bgPrimary} min-h-screen`}>
      {/* 🎨 ENHANCED: Header with theme-aware styling */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
            Proforma Invoices
          </h2>
          <p className={themeClasses.textSecondary}>
            Manage supplier quotations and track deliveries
          </p>
        </div>
        <div className="flex gap-3">
          {/* NEW: Batch Status Indicator with dark mode */}
          {batchStats.activeBatches > 0 && (
            <div className={`flex items-center space-x-2 ${
              isDarkMode 
                ? 'bg-blue-900/50 border-blue-700' 
                : 'bg-blue-50 border-blue-200'
            } border rounded-lg px-3 py-2`}>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className={`text-sm ${
                isDarkMode ? 'text-blue-200' : 'text-blue-700'
              }`}>
                {batchStats.activeBatches} batch{batchStats.activeBatches > 1 ? 'es' : ''} processing
              </span>
              <button
                onClick={() => setShowBatchModal(true)}
                className={`text-sm underline ${
                  isDarkMode 
                    ? 'text-blue-400 hover:text-blue-300' 
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                View
              </button>
            </div>
          )}

          {/* NEW: Bulk Operations Controls with dark mode */}
          {canDelete && proformaInvoices.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setBulkMode(!bulkMode);
                  setSelectedPIs(new Set());
                }}
                className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                  bulkMode 
                    ? isDarkMode
                      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                    : isDarkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {bulkMode ? (
                  <>
                    <X className="w-4 h-4" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Bulk Delete
                  </>
                )}
              </button>
              
              {bulkMode && (
                <>
                  <button
                    onClick={handleSelectAll}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      isDarkMode
                        ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {selectedPIs.size === filteredPIs.length ? 'Deselect All' : 'Select All'}
                  </button>
                  
                  {selectedPIs.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                        isDarkMode
                          ? 'bg-red-700 text-red-100 hover:bg-red-600' 
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete {selectedPIs.size} PI{selectedPIs.size > 1 ? 's' : ''}
                    </button>
                  </>
                )}
            </div>
          )}
          
          {/* NEW: Batch Upload Button with dark mode */}
          {canEdit && (
            <button
              onClick={() => setShowBatchModal(true)}
              className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                isDarkMode
                  ? 'bg-purple-700 text-purple-100 hover:bg-purple-600' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              Batch Upload
            </button>
          )}

          {/* Batch Payment Button with dark mode */}
          {canEdit && proformaInvoices.some(pi => {
            const totalAmount = parseFloat(pi.totalAmount || 0);
            const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            return totalAmount > 0 && totalPaid < totalAmount && pi.status !== 'cancelled';
          }) && (
            <button
              onClick={() => setShowBatchPaymentModal(true)}
              className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                isDarkMode
                  ? 'bg-green-700 text-green-100 hover:bg-green-600' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={`Process payments for ${proformaInvoices.filter(pi => {
                const totalAmount = parseFloat(pi.totalAmount || 0);
                const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                return totalAmount > 0 && totalPaid < totalAmount && pi.status !== 'cancelled';
              }).length} unpaid PIs`}
            >
              <CreditCard className="w-4 h-4" />
              Process Payments
              <span className={`text-xs px-2 py-0.5 rounded-full ml-1 ${
                isDarkMode
                  ? 'bg-green-600 text-green-100' 
                  : 'bg-green-500 text-white'
              }`}>
                {proformaInvoices.filter(pi => {
                  const totalAmount = parseFloat(pi.totalAmount || 0);
                  const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                  return totalAmount > 0 && totalPaid < totalAmount && pi.status !== 'cancelled';
                }).length}
              </span>
            </button>
          )}

          {/* Upload and Add PI buttons with dark mode */}
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
                className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode
                    ? 'bg-gray-800 text-gray-200 border border-gray-600 hover:bg-gray-700' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
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
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  isDarkMode
                    ? 'bg-blue-700 text-blue-100 hover:bg-blue-600' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Plus size={20} />
                Add PI
              </button>
            </>
          )}
        </div>
      </div>

      {/* 🎨 ENHANCED: Stats Cards with dark mode */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={themeClasses.textSecondary}>Total PIs</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                {proformaInvoices.length}
              </p>
            </div>
            <FileText className={`h-8 w-8 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={themeClasses.textSecondary}>Confirmed</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                {proformaInvoices.filter(pi => pi.status === 'confirmed').length}
              </p>
            </div>
            <CheckCircle className={`h-8 w-8 ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={themeClasses.textSecondary}>Pending Delivery</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                {proformaInvoices.filter(pi => pi.deliveryStatus === 'pending').length}
              </p>
            </div>
            <Truck className={`h-8 w-8 ${
              isDarkMode ? 'text-orange-400' : 'text-orange-600'
            }`} />
          </div>
        </div>
        
        <div className={`p-4 rounded-lg shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={themeClasses.textSecondary}>Priority PIs</p>
              <p className={`text-2xl font-bold ${themeClasses.textPrimary}`}>
                {proformaInvoices.filter(pi => pi.isPriority).length}
              </p>
            </div>
            <AlertTriangle className={`h-8 w-8 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`} />
          </div>
        </div>
      </div>

      {/* 🎨 ENHANCED: Filters with dark mode */}
      <div className={`p-4 rounded-lg shadow-sm ${cardClasses}`}>
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <Search className={`${themeClasses.textSecondary}`} size={20} />
            <input
              type="text"
              placeholder="Search by PI number, supplier, or project code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`flex-1 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
            />
          </div>
          
          <div className="flex gap-2 items-center">
            <Filter className={themeClasses.textSecondary} size={20} />
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
            
            <select
              value={filterDelivery}
              onChange={(e) => setFilterDelivery(e.target.value)}
              className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
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
              className={`px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClasses}`}
            >
              <option value="all">All Purpose</option>
              <option value="stock">Stock</option>
              <option value="r&d">R&D</option>
              <option value="client-order">Client Order</option>
            </select>
            
            {/* View Mode Toggle with dark mode */}
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? isDarkMode
                    ? 'bg-blue-900 text-blue-200' 
                    : 'bg-blue-100 text-blue-600'
                  : themeClasses.textSecondary
              }`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? isDarkMode
                    ? 'bg-blue-900 text-blue-200' 
                    : 'bg-blue-100 text-blue-600'
                  : themeClasses.textSecondary
              }`}
            >
              <List size={20} />
            </button>
            
            <button
              onClick={() => setGroupByYear(!groupByYear)}
              className={`p-2 rounded transition-colors ${
                groupByYear 
                  ? isDarkMode
                    ? 'bg-blue-900 text-blue-200' 
                    : 'bg-blue-100 text-blue-600'
                  : themeClasses.textSecondary
              }`}
              title="Group by Year"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 🎨 ENHANCED: PI List/Grid with dark mode */}
      {viewMode === 'grid' ? (
        <div className="space-y-8">
          {sortedYears.map(year => (
            <div key={year}>
              {groupByYear && (
                <h3 className={`text-lg font-semibold pb-2 border-b mb-4 ${
                  themeClasses.textPrimary
                } ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
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
                      onViewDocuments={() => handleViewDocuments(pi)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      bulkMode={bulkMode}
                      isSelected={selectedPIs.has(pi.id)}
                      onSelectionChange={(id, selected) => {
                        const newSelection = new Set(selectedPIs);
                        if (selected) {
                          newSelection.add(id);
                        } else {
                          newSelection.delete(id);
                        }
                        setSelectedPIs(newSelection);
                      }}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-lg shadow-sm overflow-hidden ${cardClasses}`}>
          <table className="w-full">
            <thead className={`border-b ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
            }`}>
              <tr>
                {/* NEW: Bulk Selection Column with dark mode */}
                {bulkMode && (
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPIs.size === filteredPIs.length && filteredPIs.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      title="Select All"
                    />
                  </th>
                )}
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  PI Number
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Project Code
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Supplier
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Date
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Amount
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Purpose
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Delivery
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Payment
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
            }`}>
              {sortedYears.map(year => (
                <React.Fragment key={year}>
                  {groupByYear && (
                    <tr className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                      <td colSpan={bulkMode ? 11 : 10} className={`px-6 py-3 text-sm font-semibold ${
                        themeClasses.textPrimary
                      }`}>
                        {year} - {pisByYear[year].length} Proforma Invoices
                      </td>
                    </tr>
                  )}
                  {pisByYear[year]
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(pi => {
                      const supplier = suppliers.find(s => s.id === pi.supplierId);
                      const isSelected = selectedPIs.has(pi.id);
                      
                      return (
                        <tr 
                          key={pi.id}
                          className={`transition-colors ${
                            isSelected 
                              ? isDarkMode
                                ? 'bg-blue-900/50 ring-1 ring-blue-700' 
                                : 'bg-blue-50 ring-1 ring-blue-200'
                              : isDarkMode
                                ? 'hover:bg-gray-800' 
                                : 'hover:bg-gray-50'
                          } ${bulkMode ? 'cursor-pointer' : ''}`}
                          onClick={bulkMode ? () => handlePISelection(pi.id, !isSelected) : undefined}
                        >
                          {/* Bulk Selection Checkbox with dark mode */}
                          {bulkMode && (
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handlePISelection(pi.id, e.target.checked);
                                }}
                                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                            </td>
                          )}
                          
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            themeClasses.textPrimary
                          }`}>
                            {pi.piNumber}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            {pi.projectCode || '-'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            themeClasses.textSecondary
                          }`}>
                            {supplier?.name || pi.supplierName || 'Unknown'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            themeClasses.textSecondary
                          }`}>
                            {new Date(pi.date).toLocaleDateString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                            themeClasses.textPrimary
                          }`}>
                            {pi.currency || 'USD'} {pi.totalAmount?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                              isDarkMode 
                                ? 'bg-gray-800 text-gray-200' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {pi.purpose?.replace('-', ' ') || 'stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pi.status)}`}>
                              {pi.status}
                            </span>
                            {pi.isPriority && (
                              <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                isDarkMode 
                                  ? 'bg-red-900 text-red-200 border border-red-700' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
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
                          
                          {/* Actions Column - Hide individual actions in bulk mode */}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {!bulkMode && (
                              <div className="flex justify-end gap-2">
                                {/* Documents Button */}
                                {pi.id && (
                                  <button
                                    onClick={() => handleViewDocuments(pi)}
                                    className={`${
                                      isDarkMode 
                                        ? 'text-purple-400 hover:text-purple-300' 
                                        : 'text-purple-600 hover:text-purple-900'
                                    } transition-colors`}
                                    title="View Documents"
                                  >
                                    <FileText size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleSharePI(pi)}
                                  className={`${
                                    isDarkMode 
                                      ? 'text-gray-400 hover:text-gray-300' 
                                      : 'text-gray-600 hover:text-gray-900'
                                  } transition-colors`}
                                  title="Share"
                                >
                                  <Eye size={16} />
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditPI(pi)}
                                    className={`${
                                      isDarkMode 
                                        ? 'text-blue-400 hover:text-blue-300' 
                                        : 'text-blue-600 hover:text-blue-900'
                                    } transition-colors`}
                                    title="Edit"
                                  >
                                    <Edit size={16} />
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeletePI(pi.id)}
                                    className={`${
                                      isDarkMode 
                                        ? 'text-red-400 hover:text-red-300' 
                                        : 'text-red-600 hover:text-red-900'
                                    } transition-colors`}
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                            {bulkMode && (
                              <div className={`text-xs ${themeClasses.textSecondary}`}>
                                {isSelected ? 'Selected' : 'Click to select'}
                              </div>
                            )}
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

      {/* 🎨 ENHANCED: Empty State with dark mode */}
      {filteredPIs.length === 0 && (
        <div className="text-center py-12">
          <Package className={`mx-auto h-12 w-12 ${themeClasses.textSecondary}`} />
          <h3 className={`mt-2 text-sm font-medium ${themeClasses.textPrimary}`}>
            No proforma invoices found
          </h3>
          <p className={`mt-1 text-sm ${themeClasses.textSecondary}`}>
            {searchTerm || filterStatus !== 'all' || filterDelivery !== 'all' || filterPurpose !== 'all' 
              ? 'Try adjusting your filters' 
              : 'Get started by creating a new PI or uploading a PI document'}
          </p>
          {canEdit && !searchTerm && filterStatus === 'all' && filterDelivery === 'all' && filterPurpose === 'all' && (
            <div className="mt-6 space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                  isDarkMode
                    ? 'bg-blue-700 text-blue-100 hover:bg-blue-600' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Upload size={20} />
                Upload PI
              </button>
              <button
                onClick={handleAddPI}
                className={`px-4 py-2 rounded-lg inline-flex items-center gap-2 transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                <Plus size={20} />
                Add Manually
              </button>
            </div>
          )}
        </div>
      )}

      {/* PI Modal with Enhanced Props (PRESERVED) */}
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

      {/* NEW: Batch Upload Modal */}
      {showBatchModal && (
        <BatchUploadModal
          isOpen={showBatchModal}
          onClose={() => setShowBatchModal(false)}
          showNotification={showNotification}
          addProformaInvoice={addProformaInvoice}  // Pass the PI creation function
          suppliers={suppliers}                    // Pass suppliers for matching
          addSupplier={hookAddSupplier}           // Pass supplier creation function
        />
      )}

      {/* Batch Payment Modal */}
      {showBatchPaymentModal && (
        <BatchPaymentProcessor
          onClose={() => setShowBatchPaymentModal(false)}
          onSave={handleSavePI}
          availablePIs={proformaInvoices.filter(pi => {
            const totalAmount = parseFloat(pi.totalAmount || 0);
            const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            const remainingBalance = totalAmount - totalPaid;
            
            // Include PIs that:
            // 1. Have a positive total amount and remaining balance
            // 2. Are not fully paid  
            // 3. Are in active status (not cancelled/draft)
            return (
              totalAmount > 0 && 
              remainingBalance > 0.01 && 
              pi.paymentStatus !== 'paid' &&
              pi.status !== 'cancelled'
            );
          })}
          onProcessPayment={handlePaymentProcessed}
        />
      )}

      {/* 🎨 ENHANCED: Documents Modal with dark mode */}
      {documentsModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden ${modalClasses}`}>
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h2 className={`text-xl font-semibold ${themeClasses.textPrimary}`}>
                Documents - PI {documentsModal.pi?.piNumber}
              </h2>
              <button
                onClick={() => setDocumentsModal({ open: false, pi: null })}
                className={`${
                  isDarkMode 
                    ? 'text-gray-400 hover:text-gray-300' 
                    : 'text-gray-400 hover:text-gray-600'
                } transition-colors`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <DocumentViewer
                documentId={documentsModal.pi?.documentId}  // This is the document storage ID
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
