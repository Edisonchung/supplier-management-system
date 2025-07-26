// src/hooks/usePurchaseOrders.js - Updated with Multi-Company Support
import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  where,
  getDocs 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from './usePermissions';
import { toast } from 'react-hot-toast';
import companyManagementService from '../services/companyManagementService';

export const usePurchaseOrders = () => {
  const { user } = useAuth();
  const permissions = usePermissions();
  
  // Enhanced state for multi-company support
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [filteredPurchaseOrders, setFilteredPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Multi-company state
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Load companies and branches on mount
  useEffect(() => {
    const loadCompanyData = async () => {
      if (!permissions.loading) {
        try {
          const accessibleCompanies = permissions.getAccessibleCompanies();
          const accessibleBranches = permissions.getAccessibleBranches();
          
          setCompanies(accessibleCompanies);
          setBranches(accessibleBranches);
        } catch (error) {
          console.error('Error loading company data:', error);
        }
      }
    };

    loadCompanyData();
  }, [permissions.loading]);

  // Generate unique PO number with company prefix
  const generatePONumber = useCallback((companyId = 'flow-solution') => {
    const company = companies.find(c => c.id === companyId);
    const companyCode = company?.code || 'FS';
    
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return `${companyCode}-PO-${year}${month}${day}-${random}`;
  }, [companies]);

  // Calculate subtotal from items
  const calculateSubtotal = useCallback((items) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
      const itemTotal = Number(item.totalPrice) || (Number(item.quantity || 0) * Number(item.unitPrice || 0));
      return sum + itemTotal;
    }, 0);
  }, []);

  // Calculate total with tax
  const calculateTotal = useCallback((items, taxRate = 0.1) => {
    const subtotal = calculateSubtotal(items);
    const tax = subtotal * taxRate;
    return subtotal + tax;
  }, [calculateSubtotal]);

  // Validate and normalize PO data with company information
  const validatePOData = useCallback((poData) => {
    const items = Array.isArray(poData.items) ? poData.items.map(item => ({
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      productName: item.productName || '',
      productCode: item.productCode || '',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || (Number(item.quantity || 1) * Number(item.unitPrice || 0)),
      stockAvailable: Number(item.stockAvailable) || 0,
      category: item.category || ''
    })) : [];

    // Determine company/branch assignment
    const companyId = poData.companyId || selectedCompany !== 'all' ? selectedCompany : 'flow-solution';
    const branchId = poData.branchId || selectedBranch !== 'all' ? selectedBranch : 'flow-solution-kl-hq';

    return {
      // Core fields
      poNumber: poData.poNumber || generatePONumber(companyId),
      
      // Multi-company fields (NEW)
      companyId: companyId,
      branchId: branchId,
      
      // Client information
      clientPoNumber: poData.clientPoNumber || '',
      projectCode: poData.projectCode || '',
      clientName: poData.clientName || '',
      clientContact: poData.clientContact || '',
      clientEmail: poData.clientEmail || '',
      clientPhone: poData.clientPhone || '',
      
      // Dates
      orderDate: poData.orderDate || new Date().toISOString().split('T')[0],
      requiredDate: poData.requiredDate || '',
      
      // Items
      items: items,
      
      // Financial
      subtotal: calculateSubtotal(items),
      tax: poData.tax || calculateSubtotal(items) * 0.1,
      totalAmount: poData.totalAmount || calculateTotal(items),
      
      // Terms and status
      paymentTerms: poData.paymentTerms || 'Net 30',
      deliveryTerms: poData.deliveryTerms || 'FOB',
      status: poData.status || 'draft',
      fulfillmentProgress: Number(poData.fulfillmentProgress) || 0,
      
      // Additional fields
      notes: poData.notes || '',
      piAllocations: poData.piAllocations || [],
      
      // AI extraction metadata (if applicable)
      extractionConfidence: poData.extractionConfidence || null,
      extractionModel: poData.extractionModel || null,
      warnings: poData.warnings || [],
      recommendations: poData.recommendations || []
    };
  }, [generatePONumber, calculateSubtotal, calculateTotal, selectedCompany, selectedBranch]);

  // Enrich POs with company and branch names
  const enrichPOsWithCompanyData = useCallback(async (pos) => {
    const enriched = await Promise.all(
      pos.map(async (po) => {
        try {
          // Get company name
          const company = companies.find(c => c.id === po.companyId);
          const branch = branches.find(b => b.id === po.branchId);
          
          return {
            ...po,
            companyName: company?.name || 'Unknown Company',
            companyCode: company?.code || 'UK',
            branchName: branch?.name || 'Unknown Branch',
            branchType: branch?.type || 'office'
          };
        } catch (error) {
          console.error('Error enriching PO with company data:', error);
          return {
            ...po,
            companyName: 'Unknown Company',
            companyCode: 'UK',
            branchName: 'Unknown Branch',
            branchType: 'office'
          };
        }
      })
    );
    
    return enriched;
  }, [companies, branches]);

  // Set up real-time listener for Firestore with company filtering
  useEffect(() => {
    if (!user || permissions.loading) {
      setPurchaseOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    // Build query based on user permissions
    let q;
    
    if (permissions.isGroupAdmin) {
      // Group admin sees all POs
      q = query(
        collection(db, 'purchaseOrders'),
        orderBy('createdAt', 'desc')
      );
    } else if (permissions.accessibleCompanies.length > 0) {
      // Multi-company user - filter by accessible companies
      const companyIds = permissions.accessibleCompanies.map(c => c.id);
      q = query(
        collection(db, 'purchaseOrders'),
        where('companyId', 'in', companyIds),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Regular user - filter by creator
      q = query(
        collection(db, 'purchaseOrders'),
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, 
      async (snapshot) => {
        console.log('🔍 Firestore snapshot received:', {
          docsCount: snapshot.docs.length,
          currentUser: user?.uid,
          userRole: permissions.userCompanyRole,
          accessibleCompanies: permissions.accessibleCompanies.length
        });

        snapshot.docs.forEach((doc, index) => {
          const data = doc.data();
          console.log(`📋 Firestore Doc ${index}:`, {
            id: doc.id,
            poNumber: data.poNumber,
            clientPoNumber: data.clientPoNumber,
            companyId: data.companyId,
            branchId: data.branchId,
            createdBy: data.createdBy,
            status: data.status,
            createdAt: data.createdAt
          });
        });

        let orders = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Ensure company/branch data exists
            companyId: data.companyId || 'flow-solution',
            branchId: data.branchId || 'flow-solution-kl-hq',
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt
          };
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Enrich with company/branch names
        const enrichedOrders = await enrichPOsWithCompanyData(orders);
        
        setPurchaseOrders(enrichedOrders);
        setLoading(false);
        console.log(`📋 Loaded ${enrichedOrders.length} purchase orders from Firestore`);
      },
      (err) => {
        console.error('Firestore subscription error:', err);
        setError(err.message);
        setLoading(false);
        toast.error('Failed to sync with database');
      }
    );

    return () => unsubscribe();
  }, [user, permissions.loading, permissions.isGroupAdmin, permissions.accessibleCompanies, enrichPOsWithCompanyData]);

  // Filter POs based on selected company and branch
  useEffect(() => {
    let filtered = [...purchaseOrders];

    // Filter by company
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(po => po.companyId === selectedCompany);
    }

    // Filter by branch
    if (selectedBranch !== 'all') {
      filtered = filtered.filter(po => po.branchId === selectedBranch);
    }

    setFilteredPurchaseOrders(filtered);
  }, [purchaseOrders, selectedCompany, selectedBranch]);

  // Add new purchase order with company assignment
  const addPurchaseOrder = useCallback(async (poData) => {
    if (!user) {
      toast.error('Please sign in to create purchase orders');
      return { success: false, error: 'Not authenticated' };
    }

    // Check if user can create PO for specified company/branch
    const targetCompanyId = poData.companyId || selectedCompany !== 'all' ? selectedCompany : 'flow-solution';
    const targetBranchId = poData.branchId || selectedBranch !== 'all' ? selectedBranch : 'flow-solution-kl-hq';
    
    if (!canCreatePOFor(targetCompanyId, targetBranchId)) {
      toast.error('You do not have permission to create POs for this company/branch');
      return { success: false, error: 'Insufficient permissions' };
    }

    try {
      setLoading(true);
      
      // Validate and normalize data
      const validatedData = validatePOData(poData);
      
      const docData = {
        ...validatedData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'purchaseOrders'), docData);
      
      console.log(`📋 Added purchase order to Firestore: ${validatedData.poNumber} for ${validatedData.companyId}`);
      toast.success('Purchase order created successfully');
      
      return { 
        success: true, 
        data: {
          id: docRef.id,
          ...validatedData,
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    } catch (err) {
      console.error('Error adding purchase order:', err);
      setError('Failed to add purchase order');
      toast.error(`Failed to create purchase order: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, validatePOData, selectedCompany, selectedBranch]);

  // Update existing purchase order
  const updatePurchaseOrder = useCallback(async (id, updates) => {
    if (!user) {
      toast.error('Please sign in to update purchase orders');
      return { success: false, error: 'Not authenticated' };
    }

    try {
      setLoading(true);
      
      // Recalculate totals if items changed
      let processedUpdates = { ...updates };
      if (updates.items) {
        processedUpdates.subtotal = calculateSubtotal(updates.items);
        processedUpdates.tax = processedUpdates.subtotal * 0.1;
        processedUpdates.totalAmount = processedUpdates.subtotal + processedUpdates.tax;
      }
      
      const updateData = {
        ...processedUpdates,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };
      
      await updateDoc(doc(db, 'purchaseOrders', id), updateData);
      
      console.log(`📋 Updated purchase order in Firestore: ${id}`);
      toast.success('Purchase order updated successfully');
      
      return { success: true };
    } catch (err) {
      console.error('Error updating purchase order:', err);
      setError('Failed to update purchase order');
      toast.error(`Failed to update purchase order: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, calculateSubtotal]);

  // Delete purchase order
  const deletePurchaseOrder = useCallback(async (id) => {
    if (!user) {
      toast.error('Please sign in to delete purchase orders');
      return { success: false, error: 'Not authenticated' };
    }

    if (!permissions.canDeletePurchaseOrders) {
      toast.error('You do not have permission to delete purchase orders');
      return { success: false, error: 'Insufficient permissions' };
    }

    if (!window.confirm('Are you sure you want to delete this purchase order?')) {
      return { success: false };
    }

    try {
      setLoading(true);
      
      await deleteDoc(doc(db, 'purchaseOrders', id));
      
      console.log(`🗑️ Deleted purchase order from Firestore: ${id}`);
      toast.success('Purchase order deleted successfully');
      
      return { success: true };
    } catch (err) {
      console.error('Error deleting purchase order:', err);
      setError('Failed to delete purchase order');
      toast.error(`Failed to delete purchase order: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, permissions.canDeletePurchaseOrders]);

  // Check if user can create PO for specific company/branch
  const canCreatePOFor = useCallback((companyId, branchId) => {
    if (!permissions.canEditPurchaseOrders) return false;
    if (permissions.isGroupAdmin) return true;
    
    return permissions.canAccessCompany(companyId) && 
           permissions.canAccessBranch(branchId);
  }, [permissions]);

  // Get purchase order by ID
  const getPurchaseOrderById = useCallback((id) => {
    return filteredPurchaseOrders.find(po => po.id === id);
  }, [filteredPurchaseOrders]);

  // Get purchase orders by status
  const getPurchaseOrdersByStatus = useCallback((status) => {
    return filteredPurchaseOrders.filter(po => po.status === status);
  }, [filteredPurchaseOrders]);

  // Get purchase orders by client
  const getPurchaseOrdersByClient = useCallback((clientName) => {
    return filteredPurchaseOrders.filter(po => 
      po.clientName && po.clientName.toLowerCase().includes(clientName.toLowerCase())
    );
  }, [filteredPurchaseOrders]);

  // Get purchase orders by company
  const getPurchaseOrdersByCompany = useCallback((companyId) => {
    return purchaseOrders.filter(po => po.companyId === companyId);
  }, [purchaseOrders]);

  // Get purchase orders by branch
  const getPurchaseOrdersByBranch = useCallback((branchId) => {
    return purchaseOrders.filter(po => po.branchId === branchId);
  }, [purchaseOrders]);

  // Update purchase order status
  const updatePurchaseOrderStatus = useCallback(async (id, status) => {
    return updatePurchaseOrder(id, { status });
  }, [updatePurchaseOrder]);

  // Update fulfillment progress
  const updateFulfillmentProgress = useCallback(async (id, progress) => {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    const status = clampedProgress >= 100 ? 'delivered' : 'processing';
    
    return updatePurchaseOrder(id, { 
      fulfillmentProgress: clampedProgress,
      status
    });
  }, [updatePurchaseOrder]);

  // Search purchase orders
  const searchPurchaseOrders = useCallback((searchTerm) => {
    if (!searchTerm) return filteredPurchaseOrders;
    
    const term = searchTerm.toLowerCase();
    return filteredPurchaseOrders.filter(po => 
      po.poNumber?.toLowerCase().includes(term) ||
      po.clientPoNumber?.toLowerCase().includes(term) ||
      po.projectCode?.toLowerCase().includes(term) ||
      po.clientName?.toLowerCase().includes(term) ||
      po.companyName?.toLowerCase().includes(term) ||
      po.branchName?.toLowerCase().includes(term) ||
      po.items?.some(item => 
        item.productName?.toLowerCase().includes(term) ||
        item.productCode?.toLowerCase().includes(term)
      )
    );
  }, [filteredPurchaseOrders]);

  // Get enhanced statistics with company breakdown
  const getStatistics = useCallback(() => {
    const stats = {
      total: filteredPurchaseOrders.length,
      totalAll: purchaseOrders.length,
      byStatus: {
        draft: 0,
        confirmed: 0,
        processing: 0,
        delivered: 0,
        cancelled: 0,
        pending: 0,
        approved: 0,
        in_progress: 0,
        completed: 0
      },
      byCompany: {},
      byBranch: {},
      totalValue: 0,
      averageValue: 0,
      recentOrders: [],
      topClients: {}
    };
    
    filteredPurchaseOrders.forEach(po => {
      // Count by status
      if (stats.byStatus[po.status] !== undefined) {
        stats.byStatus[po.status]++;
      }
      
      // Count by company
      const companyId = po.companyId || 'unknown';
      stats.byCompany[companyId] = (stats.byCompany[companyId] || 0) + 1;
      
      // Count by branch
      const branchId = po.branchId || 'unknown';
      stats.byBranch[branchId] = (stats.byBranch[branchId] || 0) + 1;
      
      // Calculate total value
      const value = po.totalAmount || po.grandTotal || po.total || 0;
      stats.totalValue += Number(value);
      
      // Track top clients
      const clientName = po.clientName || 'Unknown Client';
      if (!stats.topClients[clientName]) {
        stats.topClients[clientName] = {
          name: clientName,
          orderCount: 0,
          totalValue: 0
        };
      }
      stats.topClients[clientName].orderCount++;
      stats.topClients[clientName].totalValue += Number(value);
    });
    
    // Calculate average
    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
    
    // Get recent orders (last 5)
    stats.recentOrders = [...filteredPurchaseOrders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    
    // Convert top clients to array and sort
    stats.topClients = Object.values(stats.topClients)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5);
    
    return stats;
  }, [filteredPurchaseOrders, purchaseOrders]);

  // Get available branches for selected company
  const getAvailableBranches = useCallback(() => {
    if (selectedCompany === 'all') {
      return branches;
    }
    return branches.filter(branch => branch.companyId === selectedCompany);
  }, [branches, selectedCompany]);

  // Multi-company helper functions
  const getCompanyName = useCallback((companyId) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || 'Unknown Company';
  }, [companies]);
  
  const getBranchName = useCallback((branchId) => {
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || 'Unknown Branch';
  }, [branches]);
  
  // Filtering helpers
  const filterByCompany = useCallback((companyId) => {
    setSelectedCompany(companyId);
    setSelectedBranch('all'); // Reset branch filter when company changes
  }, []);
  
  const filterByBranch = useCallback((branchId) => {
    setSelectedBranch(branchId);
  }, []);
  
  const resetFilters = useCallback(() => {
    setSelectedCompany('all');
    setSelectedBranch('all');
  }, []);

  // Refresh data (for manual refresh)
  const refetch = useCallback(() => {
    // Firestore real-time listener handles this automatically
    // This is just for UI feedback
    toast.success('Purchase orders refreshed');
  }, []);

  // Clear all purchase orders (for development/testing)
  const clearAllPurchaseOrders = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to perform this action');
      return { success: false };
    }

    if (!permissions.isGroupAdmin) {
      toast.error('Only group administrators can perform this action');
      return { success: false };
    }

    if (!window.confirm('Are you sure you want to clear all purchase orders? This cannot be undone.')) {
      return { success: false };
    }
    
    const confirmText = prompt('Type "DELETE ALL" to confirm:');
    if (confirmText !== 'DELETE ALL') {
      toast.info('Operation cancelled');
      return { success: false };
    }
    
    try {
      setLoading(true);
      
      // Delete all purchase orders (group admin only)
      const q = query(collection(db, 'purchaseOrders'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`🗑️ Deleted ${snapshot.docs.length} purchase orders`);
      toast.success(`Deleted ${snapshot.docs.length} purchase orders`);
      
      return { success: true, deleted: snapshot.docs.length };
    } catch (err) {
      console.error('Error clearing purchase orders:', err);
      setError('Failed to clear purchase orders');
      toast.error('Failed to clear purchase orders');
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [user, permissions.isGroupAdmin]);

  // Return enhanced interface with multi-company support
  return {
    // Data
    purchaseOrders: filteredPurchaseOrders,
    allPurchaseOrders: purchaseOrders,
    companies,
    branches: getAvailableBranches(),
    loading,
    error,

    // Filters
    selectedCompany,
    selectedBranch,
    setSelectedCompany,
    setSelectedBranch,
    
    // CRUD operations
    addPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    
    // Queries
    getPurchaseOrderById,
    getPurchaseOrdersByStatus,
    getPurchaseOrdersByClient,
    getPurchaseOrdersByCompany,
    getPurchaseOrdersByBranch,
    searchPurchaseOrders,
    
    // Status management
    updatePurchaseOrderStatus,
    updateFulfillmentProgress,
    
    // Multi-company helpers
    getCompanyName,
    getBranchName,
    canCreatePOFor,
    
    // Filtering helpers
    filterByCompany,
    filterByBranch,
    resetFilters,
    
    // Utilities
    getStatistics,
    generatePONumber,
    refetch,
    clearAllPurchaseOrders,
    
    // Permission checks
    canView: permissions.canViewPurchaseOrders,
    canEdit: permissions.canEditPurchaseOrders,
    canDelete: permissions.canDeletePurchaseOrders,
    canApprove: permissions.canApprovePurchaseOrders,
    
    // User role information
    userRole: permissions.userCompanyRole,
    userBadge: permissions.userBadge,
    isMultiCompanyUser: permissions.totalAccessibleCompanies > 1,
    
    // Debug information
    debug: {
      totalPOs: purchaseOrders.length,
      filteredPOs: filteredPurchaseOrders.length,
      accessibleCompanies: permissions.totalAccessibleCompanies,
      accessibleBranches: permissions.totalAccessibleBranches,
      currentFilters: { selectedCompany, selectedBranch },
      userPermissions: permissions.debug
    }
  };
};
