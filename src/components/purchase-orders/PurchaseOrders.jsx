// src/components/purchase-orders/PurchaseOrders.jsx - Fixed Document Storage & Modal Integration
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePurchaseOrders } from '../../hooks/usePurchaseOrders';
import { usePermissions } from '../../hooks/usePermissions';
import { NotificationManager } from '../common/Notification';
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
  Building2,
  MapPin,
  Crown,
  Filter,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import POModal from './POModal';
import { toast } from 'react-hot-toast';
import { 
  useNotifications, 
  useLoadingStates, 
  SkeletonLoader, 
  RealtimeStatusIndicator,
  UserPresence 
} from '../common/LoadingFeedbackSystem';

const extractPartNumberFromDescription = (description) => {
  if (!description) return '';
  
  // Extract P/N codes from descriptions
  const patterns = [
    /P\/N\s+([A-Z0-9\-\.\/]{4,})/i,  // "P/N 3NA7124-6"
    /\(([A-Z0-9\-\.\/]{4,})\)/i,     // "(6XV1830-3EH10)"
  ];
  
  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return '';
};

// Simple date formatter
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options);
};

const PurchaseOrders = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  const navigate = useNavigate();
  
  // Enhanced hook with multi-company support
  const {
    purchaseOrders = [],
    allPurchaseOrders = [],
    companies = [],
    branches = [],
    loading = false,
    error = null,
    selectedCompany,
    selectedBranch,
    setSelectedCompany,
    setSelectedBranch,
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    searchPurchaseOrders,
    getStatistics,
    generatePONumber,
    refetch,
    filterByCompany,
    filterByBranch,
    resetFilters,
    getCompanyName,
    getBranchName,
    canCreatePOFor,
    userRole,
    userBadge,
    isMultiCompanyUser
  } = usePurchaseOrders() || {};
  
  // Local state declarations
  const [extracting, setExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPO, setCurrentPO] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [documentStorageStatus, setDocumentStorageStatus] = useState(null);
  const [processingFiles, setProcessingFiles] = useState(new Set());
  const [extractionProgress, setExtractionProgress] = useState({});
  const fileInputRef = useRef(null);
  
  // Notification hooks with fallbacks
  const { showSuccess, showError, showWarning } = useNotifications() || {
    showSuccess: (title, msg) => toast.success(msg || title),
    showError: (title, msg) => toast.error(msg || title),
    showWarning: (title, msg) => toast.warning(msg || title)
  };
  const { withLoading } = useLoadingStates() || { withLoading: (fn) => fn() };
  
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [syncStatus, setSyncStatus] = useState('synced');
  const [activeUsers] = useState([
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Sarah Chen' }
  ]);

  // Enhanced function to calculate PO total from items array
  const calculatePOTotal = useCallback((po) => {
    if (!po || !po.items || !Array.isArray(po.items)) return 0;
    
    // Calculate subtotal from items
    const subtotal = po.items.reduce((sum, item) => {
      const itemTotal = item.totalPrice || (item.quantity * item.unitPrice) || 0;
      return sum + (parseFloat(itemTotal) || 0);
    }, 0);
    
    // Add financial components
    const tax = parseFloat(po.tax) || 0;
    const shipping = parseFloat(po.shipping) || 0;  
    const discount = parseFloat(po.discount) || 0;
    
    const total = subtotal + tax + shipping - discount;
    
    console.log('CALCULATE TOTAL DEBUG:', {
      subtotal,
      tax: tax,
      shipping,
      discount,
      total,
      formDataTax: po.tax
    });
    
    return total;
  }, []);

  // Enhanced filtering with multi-company support
  const filteredPOs = React.useMemo(() => {
    console.log('🔍 Filtering POs:', { 
      purchaseOrdersLength: purchaseOrders?.length, 
      searchTerm, 
      statusFilter,
      selectedCompany,
      selectedBranch,
      searchPurchaseOrdersAvailable: typeof searchPurchaseOrders === 'function'
    });

    // Ensure we have valid data
    if (!purchaseOrders || !Array.isArray(purchaseOrders)) {
      console.log('⚠️ No valid purchase orders array');
      return [];
    }

    let result = [...purchaseOrders]; // Create a copy to avoid mutations

    // Apply search filter safely
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      
      if (typeof searchPurchaseOrders === 'function') {
        try {
          result = searchPurchaseOrders(searchTerm);
        } catch (error) {
          console.warn('Error using searchPurchaseOrders:', error);
          // Fallback to manual search
          result = purchaseOrders.filter(po => 
            (po.poNumber && po.poNumber.toLowerCase().includes(term)) ||
            (po.clientName && po.clientName.toLowerCase().includes(term)) ||
            (po.projectCode && po.projectCode.toLowerCase().includes(term)) ||
            (po.clientPoNumber && po.clientPoNumber.toLowerCase().includes(term)) ||
            (po.clientPONumber && po.clientPONumber.toLowerCase().includes(term)) ||
            (po.orderNumber && po.orderNumber.toLowerCase().includes(term)) ||
            (po.companyName && po.companyName.toLowerCase().includes(term)) ||
            (po.branchName && po.branchName.toLowerCase().includes(term))
          );
        }
      } else {
        // Fallback search implementation
        result = purchaseOrders.filter(po => 
          (po.poNumber && po.poNumber.toLowerCase().includes(term)) ||
          (po.clientName && po.clientName.toLowerCase().includes(term)) ||
          (po.projectCode && po.projectCode.toLowerCase().includes(term)) ||
          (po.clientPoNumber && po.clientPoNumber.toLowerCase().includes(term)) ||
          (po.clientPONumber && po.clientPONumber.toLowerCase().includes(term)) ||
          (po.orderNumber && po.orderNumber.toLowerCase().includes(term)) ||
          (po.companyName && po.companyName.toLowerCase().includes(term)) ||
          (po.branchName && po.branchName.toLowerCase().includes(term))
        );
      }
    }
    
    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter(po => po.status === statusFilter);
    }
    
    console.log('✅ Filtered result:', result?.length);
    return result || [];
  }, [purchaseOrders, searchTerm, statusFilter, selectedCompany, selectedBranch, searchPurchaseOrders]);

  // Enhanced statistics calculation with multi-company support
  const stats = React.useMemo(() => {
    console.log('📊 Calculating stats...');
    
    // Use hook statistics if available, otherwise calculate from data
    if (typeof getStatistics === 'function') {
      try {
        const hookStats = getStatistics();
        console.log('📈 Hook stats:', hookStats);
        return {
          total: hookStats.total || filteredPOs.length,
          totalAll: hookStats.totalAll || allPurchaseOrders.length,
          draft: hookStats.byStatus?.draft || hookStats.draft || 0,
          sent: hookStats.byStatus?.sent || 0,
          confirmed: hookStats.byStatus?.confirmed || hookStats.confirmed || 0,
          pending: hookStats.byStatus?.pending || 0,
          approved: hookStats.byStatus?.approved || 0,
          in_progress: hookStats.byStatus?.in_progress || 0,
          completed: hookStats.byStatus?.completed || 0,
          cancelled: hookStats.byStatus?.cancelled || 0,
          totalValue: hookStats.totalValue || 0,
          byCompany: hookStats.byCompany || {},
          byBranch: hookStats.byBranch || {}
        };
      } catch (error) {
        console.warn('Error getting statistics from hook:', error);
      }
    }

    // Fallback calculation from current data
    if (!Array.isArray(purchaseOrders)) {
      return {
        total: 0, totalAll: 0, draft: 0, sent: 0, confirmed: 0, pending: 0,
        approved: 0, in_progress: 0, completed: 0, cancelled: 0, totalValue: 0,
        byCompany: {}, byBranch: {}
      };
    }

    const statusCounts = purchaseOrders.reduce((acc, po) => {
      const status = po.status || 'draft';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Use calculatePOTotal for totalValue calculation
    const totalValue = purchaseOrders.reduce((sum, po) => {
      const amount = po.totalAmount || calculatePOTotal(po);
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);

    const result = {
      total: purchaseOrders.length,
      totalAll: allPurchaseOrders.length,
      draft: statusCounts.draft || 0,
      sent: statusCounts.sent || 0,
      confirmed: statusCounts.confirmed || 0,
      pending: statusCounts.pending || 0,
      approved: statusCounts.approved || 0,
      in_progress: statusCounts.in_progress || 0,
      completed: statusCounts.completed || 0,
      cancelled: statusCounts.cancelled || 0,
      totalValue,
      byCompany: {},
      byBranch: {}
    };

    console.log('📊 Calculated stats:', result);
    return result;
  }, [purchaseOrders, allPurchaseOrders, getStatistics, filteredPOs.length, calculatePOTotal]);

  // Update sync status when data changes
  useEffect(() => {
    setLastSyncTime(new Date());
    setSyncStatus('synced');
  }, [purchaseOrders]);

  // Company Badge Component
  const CompanyBadge = ({ companyId, className = "" }) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        <Building2 className="w-3 h-3 mr-1" />
        {company.code}
      </span>
    );
  };

  // Branch Badge Component
  const BranchBadge = ({ branchId, className = "" }) => {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return null;

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}>
        <MapPin className="w-3 h-3 mr-1" />
        {branch.name}
      </span>
    );
  };

  // Enhanced document upload with better error handling and progress tracking
  const handleDocumentUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    console.log('📄 Processing PO files with enhanced document storage:', fileArray.map(f => f.name));

    // Prevent double processing
    if (extracting) {
      console.log('Already processing files, ignoring...');
      return;
    }

    try {
      setExtracting(true);
      setUploadError(null);
      setDocumentStorageStatus('processing');
      
      // Enhanced progress tracking
      const newProcessingFiles = new Set(fileArray.map(f => f.name));
      setProcessingFiles(newProcessingFiles);
      
      const results = [];

      for (const file of fileArray) {
        if (!file.type.includes('pdf')) {
          setUploadError('Please upload PDF files only');
          toast.error('Please upload PDF files only');
          continue;
        }

        try {
          console.log(`🚀 Starting enhanced PO extraction with document storage for: ${file.name}`);
          
          // Update progress for this file
          setExtractionProgress(prev => ({
            ...prev,
            [file.name]: { status: 'processing', progress: 0 }
          }));

          let result;
          let storageSuccess = false;
          let documentMetadata = null;

          // CRITICAL FIX: Enhanced extraction with proper storage verification
          if (AIExtractionService && typeof AIExtractionService.extractPOWithStorage === 'function') {
            console.log('📦 Using extractPOWithStorage method...');
            result = await AIExtractionService.extractPOWithStorage(file);
            
            // SIMPLIFIED storage success verification
            storageSuccess = !!(
              result?.success &&
              (result?.documentStorage?.original?.downloadURL ||
               result?.documentStorage?.downloadURL ||
               result?.data?.storageInfo?.original?.downloadURL ||
               result?.data?.hasStoredDocuments)
            );
            
            documentMetadata = result?.documentStorage || result?.data?.storageInfo;
            
            console.log('🔍 Storage verification details:', {
              hasDocumentStorage: Boolean(result?.documentStorage),
              hasDataStorageInfo: Boolean(result?.data?.storageInfo),
              hasOriginalDownloadURL: Boolean(result?.documentStorage?.original?.downloadURL),
              hasDocumentStorageDownloadURL: Boolean(result?.documentStorage?.downloadURL),
              actualDocumentId: result?.data?.documentId || result?.documentStorage?.documentId,
              storageDocumentId: result?.documentStorage?.original?.documentId,
              storageSuccess: storageSuccess,
              documentMetadata: documentMetadata ? 'present' : 'missing'
            });

          } else {
            console.log('⚠️ extractPOWithStorage not found, using enhanced fallback...');
            
            // Enhanced fallback with explicit storage
            const extractionResult = await AIExtractionService.extractFromFile(file);
            if (!extractionResult.success) {
              throw new Error(extractionResult.error || 'AI extraction failed');
            }

            // Dynamic import DocumentStorageService
            const { default: DocumentStorageService } = await import('../../services/DocumentStorageService');
            
            // Generate enhanced document metadata
            const documentId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const documentNumber = extractionResult.data.clientPONumber || 
                                   extractionResult.data.poNumber || 
                                   `PO-${Date.now()}`;
            
            console.log('📁 Storing PO document to Firebase Storage...');
            const storageResult = await DocumentStorageService.storeOriginalDocument(
              file,
              'po', // document type
              documentNumber,
              documentId,
              {
                clientName: extractionResult.data.clientName,
                projectCode: extractionResult.data.projectCode,
                extractedAt: new Date().toISOString()
              }
            );
            
            storageSuccess = storageResult.success;
            documentMetadata = storageResult.data;
            
            // Enhanced result structure
            result = {
              success: true,
              data: {
                ...extractionResult.data,
                documentId: documentId,
                documentNumber: documentNumber,
                hasStoredDocuments: storageResult.success,
                storageInfo: storageResult.success ? storageResult.data : null,
                originalFileName: file.name,
                fileSize: file.size,
                contentType: file.type,
                extractedAt: new Date().toISOString()
              },
              documentStorage: storageResult.success ? storageResult.data : null
            };
          }
          
          console.log('🎯 Enhanced PO extraction result:', {
            success: result?.success,
            storageSuccess,
            hasDocumentMetadata: Boolean(documentMetadata)
          });

          if (result?.success && result?.data) {
            // Update storage status
            setDocumentStorageStatus(storageSuccess ? 'success' : 'partial');
            
            // Enhanced modal data preparation - CRITICAL FIX for document ID extraction
            const documentId = (() => {
              // Try to get from various result locations
              const directId = result?.documentStorage?.original?.documentId ||
                              result?.data?.documentId || 
                              documentMetadata?.documentId ||
                              result?.documentStorage?.documentId;
              
              console.log('🔍 Document ID extraction attempt:', {
                fromStorageOriginal: result?.documentStorage?.original?.documentId,
                fromResultData: result?.data?.documentId,
                fromMetadata: documentMetadata?.documentId,
                selectedId: directId
              });
              
              if (directId) {
                console.log('✅ Using document ID from storage:', directId);
                return directId;
              }
              
              // Parse from storage path as fallback
              const storagePath = result?.documentStorage?.original?.path || documentMetadata?.path;
              if (storagePath) {
                const pathMatch = storagePath.match(/documents\/purchase-orders\/([^\/]+)\//);
                if (pathMatch && pathMatch[1]) {
                  console.log('📋 Extracted document ID from path:', pathMatch[1]);
                  return pathMatch[1];
                }
              }
              
              // Final fallback
              const fallbackId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              console.log('⚠️ Using fallback document ID:', fallbackId);
              return fallbackId;
            })();

            const modalData = {
              // Enhanced document fields
              documentId,
              documentNumber: result?.data?.documentNumber || 
                             result?.data?.clientPONumber || 
                             result?.data?.poNumber || 
                             null,
              documentType: 'po',
              hasStoredDocuments: storageSuccess,
              storageInfo: documentMetadata,
              originalFileName: file.name,
              fileSize: file.size,
              contentType: file.type,
              extractedAt: result?.data?.extractedAt || new Date().toISOString(),
              
              // Enhanced download URL handling
              downloadURL: result?.documentStorage?.original?.downloadURL ||
                          result?.documentStorage?.downloadURL ||
                          documentMetadata?.downloadURL,
              
              // Generate new internal PO number with company prefix
              poNumber: (typeof generatePONumber === 'function') ? 
                        generatePONumber(selectedCompany !== 'all' ? selectedCompany : 'flow-solution') : 
                        `PO-${Date.now()}`,
              
              // Multi-company assignment
              companyId: selectedCompany !== 'all' ? selectedCompany : 'flow-solution',
              branchId: selectedBranch !== 'all' ? selectedBranch : 'flow-solution-kl-hq',
              
              // Use client's original PO number  
              clientPoNumber: result?.data?.clientPONumber || result?.data?.poNumber || '',
              projectCode: result?.data?.projectCode || result?.data?.clientPONumber || result?.data?.poNumber || '',

              // Extract client information
              clientName: result?.data?.clientName || result?.data?.client?.name || '',
              clientContact: result?.data?.clientContact || result?.data?.client?.contact || '',
              clientEmail: result?.data?.clientEmail || result?.data?.client?.email || '',
              clientPhone: result?.data?.clientPhone || result?.data?.client?.phone || '',
              
              // Handle dates
              orderDate: result?.data?.orderDate || new Date().toISOString().split('T')[0],
              requiredDate: result?.data?.deliveryDate || result?.data?.requiredDate || '',
              
              // Terms
              paymentTerms: result?.data?.paymentTerms || 'Net 30',
              deliveryTerms: result?.data?.deliveryTerms || 'FOB',
              
              // Status and notes
              status: 'draft',
              notes: result?.data?.notes || '',
              
              // Items array - CRITICAL FIX for client item codes
              items: (result?.data?.items || []).map((item, index) => {
                console.log(`🔍 FULL ITEM ${index + 1} DUMP:`, JSON.stringify(item, null, 2));
                
                return {
                  productName: item.productName || item.description || '',
                  productCode: extractPartNumberFromDescription(item.productName || item.description || ''),
                  clientItemCode: item.productCode || item.clientItemCode || '', // CRITICAL: Use extracted productCode as clientItemCode
                  projectCode: item.projectCode || '',
                  quantity: item.quantity || 0,
                  unitPrice: item.unitPrice || 0,
                  totalPrice: item.totalPrice || (item.quantity * item.unitPrice) || 0,
                  id: `item-${Date.now()}-${index}`
                };
              }),
              
              // Additional extracted data
              extractedData: result?.data,
              prNumbers: result?.data?.prNumbers || [],
              
              // Sourcing plan if available
              sourcingPlan: result?.data?.sourcingPlan,
              matchingMetrics: result?.data?.matchingMetrics,
              
              // Client details
              clientDetails: {
                name: result?.data?.client?.name || '',
                registration: result?.data?.client?.registration || '',
                address: result?.data?.client?.address || '',
                shipTo: result?.data?.client?.shipTo || ''
              }
            };
            
            console.log('✅ Enhanced modal data prepared:', {
              documentId: modalData.documentId,
              hasStoredDocuments: modalData.hasStoredDocuments,
              storageSuccess: storageSuccess,
              companyId: modalData.companyId,
              branchId: modalData.branchId,
              storageInfoExists: Boolean(modalData.storageInfo),
              downloadURL: Boolean(modalData.downloadURL)
            });
            
            results.push(modalData);
            
            // Update progress
            setExtractionProgress(prev => ({
              ...prev,
              [file.name]: { status: 'completed', progress: 100 }
            }));

            // Enhanced success notification
            if (storageSuccess) {
              toast.success(
                `✅ Successfully extracted: ${file.name}\nDocuments stored and assigned to ${getCompanyName ? getCompanyName(modalData.companyId) : modalData.companyId}!`,
                { duration: 4000 }
              );
            } else {
              toast.warning(
                `⚠️ Extracted: ${file.name}\nDocument processing completed but storage needs verification.`,
                { duration: 5000 }
              );
            }

          } else {
            throw new Error(result?.error || 'Extraction failed');
          }

        } catch (fileError) {
          console.error(`❌ Error processing ${file.name}:`, fileError);
          
          setExtractionProgress(prev => ({
            ...prev,
            [file.name]: { status: 'error', progress: 0, error: fileError.message }
          }));

          toast.error(`Failed to process ${file.name}: ${fileError.message}`);
        }
      }

      // Enhanced results processing
      if (results.length > 0) {
        console.log(`✅ Successfully processed ${results.length} files`);
        
        // Auto-open the first successful result
        if (results.length === 1) {
          setCurrentPO(results[0]);
          setModalOpen(true);
        } else {
          // Show summary for multiple files
          toast.success(`Successfully processed ${results.length} files`, {
            duration: 5000
          });
        }

        // Enhanced refresh logic
        if (refetch) {
          await refetch();
        }
      }

    } catch (error) {
      console.error('❌ Enhanced document upload error:', error);
      setDocumentStorageStatus('failed');
      setUploadError(error.message);
      toast.error(`Upload failed: ${error.message}`);
      
    } finally {
      setExtracting(false);
      setProcessingFiles(new Set());
      setExtractionProgress({});
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reset storage status after delay
      setTimeout(() => {
        setDocumentStorageStatus(null);
      }, 3000);
    }
  }, [extracting, selectedCompany, selectedBranch, generatePONumber, getCompanyName, refetch]);

  // Handle file upload
  const handleFileUpload = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    await handleDocumentUpload(files);
  }, [handleDocumentUpload]);

  // Handle manual PO creation with company assignment
  const handleCreatePO = useCallback(() => {
    const newPO = {
      poNumber: (typeof generatePONumber === 'function') ? 
                generatePONumber(selectedCompany !== 'all' ? selectedCompany : 'flow-solution') : 
                `PO-${Date.now()}`,
      companyId: selectedCompany !== 'all' ? selectedCompany : 'flow-solution',
      branchId: selectedBranch !== 'all' ? selectedBranch : 'flow-solution-kl-hq',
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
      items: [],
      hasStoredDocuments: false
    };
    setCurrentPO(newPO);
    setModalOpen(true);
  }, [generatePONumber, selectedCompany, selectedBranch]);

  // Enhanced PO save with refresh trigger and modal data validation
  const handleSavePO = useCallback(async (poData, options = {}) => {
    try {
      console.log('💾 Enhanced PO save with document validation:', {
        poNumber: poData.poNumber,
        companyId: poData.companyId,
        branchId: poData.branchId,
        documentId: poData.documentId,
        hasStoredDocuments: poData.hasStoredDocuments,
        originalFileName: poData.originalFileName
      });

      // Check if user can create/edit PO for this company/branch
      if (canCreatePOFor && !canCreatePOFor(poData.companyId, poData.branchId)) {
        toast.error('You do not have permission to create/edit POs for this company/branch');
        return;
      }

      await withLoading(async () => {
        let result;
        if (poData.id) {
          if (typeof updatePurchaseOrder === 'function') {
            result = await updatePurchaseOrder(poData.id, poData);
          } else {
            throw new Error('Update function not available');
          }
        } else {
          if (typeof addPurchaseOrder === 'function') {
            result = await addPurchaseOrder(poData);
          } else {
            throw new Error('Add function not available');
          }
        }
        
        if (result && result.success) {
          const companyName = getCompanyName ? getCompanyName(poData.companyId) : poData.companyId;
          
          // Enhanced success message with document storage status
          let successMsg = `PO ${poData.poNumber} has been ${poData.id ? 'updated' : 'created'} successfully for ${companyName}.`;
          if (poData.hasStoredDocuments) {
            successMsg += ' Document storage verified!';
          }
          
          toast.success(successMsg, { duration: 4000 });
          
          setModalOpen(false);
          setCurrentPO(null);

          // CRITICAL: Force refresh if requested
          if (options.shouldRefresh && typeof refetch === 'function') {
            console.log('🔄 Refreshing PO list after save...');
            await refetch();
          }
        } else {
          throw new Error(result?.error || 'Failed to save purchase order');
        }
        
        setLastSyncTime(new Date());
      });
      
    } catch (error) {
      console.error('Error saving PO:', error);
      const errorMsg = 'Unable to save purchase order. Please check your connection and try again.';
      toast.error(errorMsg);
    }
  }, [canCreatePOFor, withLoading, updatePurchaseOrder, addPurchaseOrder, getCompanyName, refetch]);

  // Handle PO deletion with permission check
  const handleDeletePO = useCallback(async (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);
    
    if (!permissions.canDeletePurchaseOrders) {
      toast.error('You do not have permission to delete purchase orders');
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete PO ${po?.poNumber || po?.orderNumber}? This action cannot be undone.`)) {
      try {
        await withLoading(async () => {
          if (typeof deletePurchaseOrder === 'function') {
            const result = await deletePurchaseOrder(poId);
            if (result && result.success) {
              const successMsg = `PO ${po?.poNumber || po?.orderNumber} has been deleted.`;
              toast.success(successMsg);
            } else {
              throw new Error(result?.error || 'Failed to delete purchase order');
            }
          } else {
            throw new Error('Delete function not available');
          }
        });
      } catch (error) {
        console.error('Error deleting PO:', error);
        toast.error('Unable to delete purchase order.');
      }
    }
  }, [purchaseOrders, permissions.canDeletePurchaseOrders, withLoading, deletePurchaseOrder]);

  // Navigate to supplier matching page
  const handleViewSupplierMatching = useCallback((po) => {
    navigate(`/purchase-orders/${po.id}/supplier-matching`);
  }, [navigate]);

  const getStatusBadge = useCallback((status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Send },
      approved: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      in_progress: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      delivered: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
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
  }, []);

  // Enhanced Document Storage Status Indicator
  const DocumentStorageIndicator = () => {
    if (!documentStorageStatus) return null;
    
    const indicators = {
      processing: { 
        color: 'bg-blue-50 border-blue-200 text-blue-800',
        icon: Loader2,
        message: 'Processing and storing documents...',
        spin: true
      },
      success: {
        color: 'bg-green-50 border-green-200 text-green-800',
        icon: CheckCircle,
        message: 'Documents stored successfully!'
      },
      partial: {
        color: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
        icon: AlertCircle,
        message: 'Document extracted but storage needs verification'
      },
      failed: {
        color: 'bg-red-50 border-red-200 text-red-800',
        icon: AlertCircle,
        message: 'Document storage failed'
      }
    };
    
    const config = indicators[documentStorageStatus];
    const Icon = config.icon;
    
    return (
      <div className={`border rounded-md p-3 mb-4 ${config.color}`}>
        <div className="flex items-center">
          <Icon className={`h-5 w-5 mr-2 ${config.spin ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">{config.message}</span>
        </div>
      </div>
    );
  };

  // Enhanced Processing Status Display
  const ProcessingStatus = () => {
    if (processingFiles.size === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Processing Files</h3>
        <div className="space-y-2">
          {Array.from(processingFiles).map(fileName => {
            const progress = extractionProgress[fileName];
            return (
              <div key={fileName} className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700 flex-1">{fileName}</span>
                {progress?.status === 'processing' && (
                  <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                )}
                {progress?.status === 'completed' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {progress?.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Enhanced Statistics Section with Multi-Company Data
  const StatisticsSection = () => (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {isMultiCompanyUser ? 'Accessible POs' : 'Total POs'}
                </dt>
                <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                {isMultiCompanyUser && stats.totalAll > stats.total && (
                  <dd className="text-xs text-gray-400">
                    {stats.totalAll} total across all companies
                  </dd>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Building2 className="h-6 w-6 text-blue-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Companies</dt>
                <dd className="text-lg font-semibold text-gray-900">{companies.length}</dd>
                <dd className="text-xs text-gray-400">
                  {Object.keys(stats.byCompany).length} with POs
                </dd>
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
  );

  // Multi-Company Filters Section
  const FiltersSection = () => (
    <div className={`bg-white p-4 rounded-lg border border-gray-200 mb-4 transition-all duration-200 ${
      showFilters ? 'block' : 'hidden'
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Company Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company
          </label>
          <select
            value={selectedCompany || 'all'}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Companies</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>
                {company.name} ({company.code})
              </option>
            ))}
          </select>
        </div>

        {/* Branch Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Branch
          </label>
          <select
            value={selectedBranch || 'all'}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={selectedCompany === 'all'}
          >
            <option value="all">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="approved">Approved</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Reset Filters */}
        <div className="flex items-end">
          <button
            onClick={resetFilters}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );

  // Early returns for loading/error states
  if (!user) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sign In Required</h3>
        <p className="text-gray-500">Please sign in to view and manage purchase orders.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Purchase Orders</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button
          onClick={() => {
            if (typeof refetch === 'function') {
              refetch();
            } else {
              window.location.reload();
            }
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Loader2 className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

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
      {/* Enhanced Header with Multi-Company Status */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Purchase Orders</h1>
              <div className="mt-1 flex items-center space-x-4">
                <p className="text-sm text-gray-500">
                  {isMultiCompanyUser ? 
                    `Managing POs across ${companies.length} companies with enhanced document storage` : 
                    'Manage your purchase orders with AI extraction and document storage'
                  }
                </p>
                {RealtimeStatusIndicator && (
                  <RealtimeStatusIndicator 
                    status={syncStatus} 
                    lastUpdated={lastSyncTime}
                  />
                )}
                {UserPresence && <UserPresence users={activeUsers} />}
              </div>
              
              {/* User Badge */}
              {userBadge && (
                <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg w-fit">
                  <Crown className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">{userBadge}</span>
                </div>
              )}
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
              
              {permissions.canEditPurchaseOrders && (
                <button
                  onClick={handleCreatePO}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create PO
                </button>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Document Storage Status */}
      <DocumentStorageIndicator />

      {/* Enhanced Processing Status */}
      <ProcessingStatus />

      {/* Upload Error Alert */}
      {uploadError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
              <p className="mt-1 text-sm text-red-700">{uploadError}</p>
              <button
                onClick={() => setUploadError(null)}
                className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Statistics Cards */}
      <StatisticsSection />

      {/* Enhanced Filters and Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search PO number, project code, client, company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Multi-Company Filters */}
        <FiltersSection />

        {/* Enhanced Quick Stats Bar */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex space-x-6">
              <span className="text-gray-500">
                Showing: <span className="font-medium text-gray-900">{filteredPOs.length}</span>
              </span>
              {selectedCompany !== 'all' && (
                <span className="text-gray-500">
                  Company: <span className="font-medium text-blue-600">{getCompanyName ? getCompanyName(selectedCompany) : selectedCompany}</span>
                </span>
              )}
              {selectedBranch !== 'all' && (
                <span className="text-gray-500">
                  Branch: <span className="font-medium text-green-600">{getBranchName ? getBranchName(selectedBranch) : selectedBranch}</span>
                </span>
              )}
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

        {/* Enhanced Table with Company/Branch Columns */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
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
                  <td colSpan="10" className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileText className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-gray-500">No purchase orders found</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {searchTerm || statusFilter !== 'all' || selectedCompany !== 'all' || selectedBranch !== 'all'
                          ? 'No purchase orders match your current filters.' 
                          : 'Upload a PO or create a new one to get started'}
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
                        {po.clientPoNumber || po.clientPONumber || po.orderNumber || po.poNumber}

                        {/* Enhanced document storage indicator */}
                        {po.hasStoredDocuments && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Documents stored successfully in Firebase">
                            📄✅
                          </span>
                        )}
                      </div>
                    </td>

                    {/* COMPANY */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <CompanyBadge 
                        companyId={po.companyId} 
                        className="bg-blue-100 text-blue-800"
                      />
                    </td>

                    {/* BRANCH */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <BranchBadge 
                        branchId={po.branchId} 
                        className="bg-green-100 text-green-800"
                      />
                    </td>

                    {/* PROJECT CODE */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {po.projectCode ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-mono">
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

                    {/* ITEMS */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-1" />
                        {po.items?.length || 0}
                      </div>
                    </td>

                    {/* TOTAL - Use calculatePOTotal fallback */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      RM {(po.totalAmount || calculatePOTotal(po)).toLocaleString()}
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
                            console.log('[DEBUG] POModal: Setting form data from editing PO:', po.poNumber);
                            setCurrentPO(po);
                            setModalOpen(true);
                          }}
                          className="text-gray-400 hover:text-gray-500 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {permissions.canEditPurchaseOrders && (
                          <button
                            onClick={() => {
                              console.log('[DEBUG] POModal: Setting form data from editing PO:', po.poNumber);
                              setCurrentPO(po);
                              setModalOpen(true);
                            }}
                            className="text-gray-400 hover:text-gray-500 transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                        {permissions.canDeletePurchaseOrders && (
                          <button
                            onClick={() => handleDeletePO(po.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Company Summary */}
      {isMultiCompanyUser && Object.keys(stats.byCompany).length > 1 && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Company Distribution
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byCompany).map(([companyId, count]) => (
              <div key={companyId} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <span className="font-medium text-gray-900">
                  {getCompanyName ? getCompanyName(companyId) : companyId}
                </span>
                <span className="text-sm font-semibold text-blue-600">
                  {count} PO{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced PO Modal with Document Storage Support */}
      <POModal
        isOpen={modalOpen}
        onClose={() => {
          console.log('Closing enhanced modal');
          setModalOpen(false);
          setCurrentPO(null);
        }}
        editingPO={currentPO}
        onSave={handleSavePO}
        companies={companies}
        branches={branches}
      />
    </div>
  );
};

export default PurchaseOrders;
