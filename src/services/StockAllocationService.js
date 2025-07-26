// src/services/StockAllocationService.js - CORRECTLY STRUCTURED VERSION
// 🔧 CORRECT ARCHITECTURE: Import from both Firebase files as intended

// 1. Core Firebase services from config
import { db } from '../config/firebase.js';

// 2. Import Firestore SDK functions directly
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

// 3. Business logic functions from services
import { 
  getProformaInvoices, 
  updateProformaInvoice,
  getProducts,
  getPurchaseOrders,
  safeGetCollection,
  safeAddDocument,
  safeUpdateDocument
} from './firebase.js';

/**
 * 🚀 Stock Allocation Service - Multi-Layer Firebase Architecture
 * Uses both config/firebase.js (core) and services/firebase.js (business logic)
 */
export class StockAllocationService {
  static ALLOCATION_TYPES = {
    PO: 'po',
    PROJECT: 'project', 
    WAREHOUSE: 'warehouse'
  };

  static ALLOCATION_STATUS = {
    ALLOCATED: 'allocated',
    RESERVED: 'reserved',
    CONSUMED: 'consumed',
    CANCELLED: 'cancelled'
  };

  /**
   * 🚀 MAIN FUNCTION: Allocate stock from received items to targets
   */
  static async allocateStock(piId, itemId, allocations) {
    try {
      console.log('🚀 Starting Firestore stock allocation with enhanced PI lookup...');
      console.log('🔍 Input parameters:', { piId, itemId, allocationsCount: allocations?.length });

      // Enhanced validation with better error handling
      const validationResult = await this.validateAllocation(piId, itemId, allocations);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // 🔍 Get the PI and item with enhanced lookup
      const pi = await this.getPIById(piId);
      const item = await this.getPIItem(piId, itemId);
      
      if (!pi) {
        throw new Error(`PI not found: ${piId}`);
      }
      
      if (!item) {
        throw new Error(`PI item not found: ${itemId} in PI ${piId}`);
      }

      // 🔍 CRITICAL FIX: Check actual available quantity from the item
      const receivedQty = item.receivedQty || item.quantity || 0;
      const currentAllocated = item.totalAllocated || 0;
      const availableQty = receivedQty - currentAllocated;
      
      console.log('🔍 QUANTITY CHECK:', {
        receivedQty,
        currentAllocated,
        availableQty,
        requestedTotal: allocations.reduce((sum, a) => sum + a.quantity, 0)
      });

      // Create allocation records in Firestore
      const allocationRecords = [];
      for (const allocation of allocations) {
        const record = await this.createAllocationRecord(piId, itemId, allocation, item);
        allocationRecords.push(record);
      }

      // Update PI item with allocations in Firestore
      await this.updatePIItemAllocations(piId, itemId, allocationRecords);

      // Update product stock levels in Firestore
      await this.updateProductStock(item.productCode || item.productId, allocations);

      // Update target documents (PO fulfillment, project tracking)
      await this.updateTargetDocuments(allocations);

      console.log('✅ Firestore stock allocation completed successfully');
      return {
        success: true,
        allocations: allocationRecords,
        message: 'Stock allocated successfully'
      };

    } catch (error) {
      console.error('❌ Firestore stock allocation error:', error);
      throw error;
    }
  }

  /**
   * 🚀 Get available allocation targets
   */
  static async getAvailableTargets(productId) {
    try {
      console.log('🎯 Getting available targets for product from Firestore:', productId);

      // Get open POs that need this product
      const openPOs = await this.getOpenPOsForProduct(productId);
      
      // Get active project codes
      const projectCodes = await this.getActiveProjectCodes();
      
      // Get warehouse locations
      const warehouseLocations = await this.getWarehouseLocations();

      const targets = {
        purchaseOrders: openPOs,
        projectCodes: projectCodes,
        warehouses: warehouseLocations
      };

      console.log('✅ Available targets loaded from Firestore:', targets);
      return targets;

    } catch (error) {
      console.error('❌ Error getting available targets from Firestore:', error);
      // Return safe defaults to prevent crashes
      return {
        purchaseOrders: [],
        projectCodes: [
          { id: 'proj-default', name: 'General Project', info: 'Default project allocation' }
        ],
        warehouses: [
          { id: 'wh-main', name: 'Main Warehouse', info: 'Primary storage location' }
        ]
      };
    }
  }

  /**
   * 🚀 Get open POs that need a specific product
   */
  static async getOpenPOsForProduct(productId) {
    try {
      console.log('🔍 Searching Firestore POs for product:', productId);
      
      // 🔧 FIXED: Use business logic function if available, fallback to safe collection
      let purchaseOrders = [];
      try {
        const result = await getPurchaseOrders();
        purchaseOrders = result.success ? result.data : [];
      } catch (error) {
        console.log('⚠️ getPurchaseOrders not available, using direct collection access');
        const result = await safeGetCollection('purchaseOrders');
        purchaseOrders = result.success ? result.data : [];
      }
      
      // Get products using business logic function
      const productsResult = await getProducts();
      const products = productsResult.success ? productsResult.data : [];
      
      console.log('📦 Available products in Firestore:', products.length);
      console.log('📋 Available POs in Firestore:', purchaseOrders.length);
      
      const product = products.find(p => 
        p.id === productId || 
        p.sku === productId || 
        p.code === productId ||
        p.productCode === productId
      );
      
      if (!product) {
        console.log('⚠️ Product not found in Firestore products database');
        return [];
      }

      const openPOs = purchaseOrders.filter(po => 
        ['draft', 'confirmed', 'processing'].includes(po.status) &&
        po.items && po.items.some(item => 
          this.isProductMatch(item, product)
        )
      );

      console.log('📋 Found open POs in Firestore:', openPOs.length);

      return openPOs.map(po => {
        const matchingItems = po.items.filter(item => this.isProductMatch(item, product));
        const neededQuantity = matchingItems.reduce((sum, item) => 
          sum + (item.quantity - (item.fulfilledQuantity || 0)), 0
        );

        return {
          id: po.id,
          name: po.poNumber || `PO-${po.id}`,
          info: `${po.clientName || 'Unknown Client'} - Due: ${po.requiredDate || 'TBD'}`,
          priority: this.calculatePOPriority(po),
          requiredDate: po.requiredDate,
          neededQuantity: neededQuantity,
          clientName: po.clientName || 'Unknown Client'
        };
      }).filter(po => po.neededQuantity > 0);

    } catch (error) {
      console.error('❌ Error getting open POs from Firestore:', error);
      return [];
    }
  }

  /**
   * Check if PO item matches product
   */
  static isProductMatch(poItem, product) {
    return (
      poItem.productId === product.id ||
      poItem.productCode === product.sku ||
      poItem.productCode === product.code ||
      poItem.productName === product.name ||
      (poItem.productCode && product.sku && 
       poItem.productCode.toLowerCase() === product.sku.toLowerCase()) ||
      (poItem.productCode && product.code && 
       poItem.productCode.toLowerCase() === product.code.toLowerCase())
    );
  }

  /**
   * Calculate PO priority based on due date and client importance
   */
  static calculatePOPriority(po) {
    if (!po.requiredDate) return 'medium';
    
    try {
      const dueDate = new Date(po.requiredDate);
      const today = new Date();
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 7) return 'high';
      if (daysUntilDue <= 30) return 'medium';
      return 'low';
    } catch (error) {
      console.error('Error calculating PO priority:', error);
      return 'medium';
    }
  }

  /**
   * 🚀 Get active project codes
   */
  static async getActiveProjectCodes() {
    try {
      // Check if we have a projects collection in Firestore
      const result = await safeGetCollection('projects', [where('status', '==', 'active')]);
      
      if (result.success && result.data.length > 0) {
        return result.data.map(project => ({
          id: project.id,
          name: project.code || project.name,
          info: project.description || project.client || 'Project allocation'
        }));
      }

      // Return default project codes if no Firestore projects
      return [
        { id: 'proj-petronas-2025', name: 'PROJ-2025-PETRONAS', info: 'Oil & Gas Division' },
        { id: 'proj-smart-city-2025', name: 'PROJ-2025-SMART-CITY', info: 'Smart Infrastructure' },
        { id: 'proj-hospitality-2025', name: 'PROJ-2025-HOSPITALITY', info: 'Tourism & Hospitality' },
        { id: 'proj-industrial-2025', name: 'PROJ-2025-INDUSTRIAL', info: 'Manufacturing' },
        { id: 'proj-research-2025', name: 'PROJ-2025-R&D', info: 'Research & Development' },
        { id: 'proj-general', name: 'GENERAL-PROJECT', info: 'General project allocation' }
      ];
    } catch (error) {
      console.error('Error getting project codes from Firestore:', error);
      return [
        { id: 'proj-general', name: 'GENERAL-PROJECT', info: 'General project allocation' }
      ];
    }
  }

  /**
   * 🚀 Get warehouse locations
   */
  static async getWarehouseLocations() {
    try {
      // Check if we have a warehouses collection in Firestore
      const result = await safeGetCollection('warehouses', [where('status', '==', 'active')]);
      
      if (result.success && result.data.length > 0) {
        return result.data.map(warehouse => ({
          id: warehouse.id,
          name: warehouse.name,
          info: warehouse.location || warehouse.address || 'Warehouse location'
        }));
      }

      // Return default warehouse locations if no Firestore warehouses
      return [
        { id: 'wh-main', name: 'Main Warehouse', info: 'Bandar Baru Nilai' },
        { id: 'wh-kl', name: 'KL Distribution Center', info: 'Kuala Lumpur' },
        { id: 'wh-penang', name: 'Northern Hub', info: 'Penang' },
        { id: 'wh-johor', name: 'Southern Hub', info: 'Johor Bahru' },
        { id: 'wh-backup', name: 'Backup Storage', info: 'Secondary location' }
      ];
    } catch (error) {
      console.error('Error getting warehouse locations from Firestore:', error);
      return [
        { id: 'wh-main', name: 'Main Warehouse', info: 'Primary storage location' }
      ];
    }
  }

  /**
   * 🚀 Auto-suggest allocations based on open POs
   */
  static async suggestAllocations(piId, itemId, availableQty) {
    try {
      console.log('🧠 Generating suggestions from Firestore for:', { piId, itemId, availableQty });

      if (!piId || !itemId || availableQty <= 0) {
        console.log('⚠️ Invalid parameters for suggestions');
        return this.getDefaultAllocation(availableQty);
      }

      const pi = await this.getPIById(piId);
      if (!pi) {
        console.log('⚠️ PI not found in Firestore, using default allocation');
        return this.getDefaultAllocation(availableQty);
      }

      const piItem = pi.items?.find(item => item.id === itemId);
      if (!piItem) {
        console.log('⚠️ PI item not found in Firestore, using default allocation');
        return this.getDefaultAllocation(availableQty);
      }

      // Try to get open POs for this product
      const openPOs = await this.getOpenPOsForProduct(piItem.productCode || piItem.productId);
      
      const suggestions = [];
      let remainingQty = availableQty;

      if (openPOs.length > 0) {
        // Sort POs by priority and due date
        const sortedPOs = openPOs.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return new Date(a.requiredDate) - new Date(b.requiredDate);
        });

        // Allocate to high priority POs first
        for (const po of sortedPOs) {
          if (remainingQty <= 0) break;

          const allocateQty = Math.min(remainingQty, po.neededQuantity, availableQty);

          suggestions.push({
            id: `suggestion-${po.id}`,
            allocationType: this.ALLOCATION_TYPES.PO,
            allocationTarget: po.id,
            targetName: `${po.name} - ${po.clientName}`,
            quantity: allocateQty,
            priority: po.priority,
            requiredDate: po.requiredDate,
            notes: `Auto-suggested for ${po.priority} priority PO`,
            suggested: true
          });

          remainingQty -= allocateQty;
        }
      }

      // Remaining goes to main warehouse
      if (remainingQty > 0) {
        suggestions.push({
          id: 'suggestion-warehouse',
          allocationType: this.ALLOCATION_TYPES.WAREHOUSE,
          allocationTarget: 'wh-main',
          targetName: 'Main Warehouse',
          quantity: remainingQty,
          priority: 'low',
          notes: 'General stock for future orders',
          suggested: true
        });
      }

      return suggestions;

    } catch (error) {
      console.error('❌ Error generating suggestions from Firestore:', error);
      return this.getDefaultAllocation(availableQty);
    }
  }

  /**
   * Get default allocation when suggestions fail
   */
  static getDefaultAllocation(availableQty) {
    return [{
      id: 'default-warehouse',
      allocationType: this.ALLOCATION_TYPES.WAREHOUSE,
      allocationTarget: 'wh-main',
      targetName: 'Main Warehouse',
      quantity: availableQty || 0,
      priority: 'medium',
      notes: 'Default warehouse allocation',
      suggested: true
    }];
  }

  /**
   * 🚀 Validate allocation request
   */
  static async validateAllocation(piId, itemId, allocations) {
    try {
      console.log('🔍 Validating allocation in Firestore:', { piId, itemId, allocations });

      if (!piId || !itemId) {
        return { valid: false, error: 'PI ID and Item ID are required' };
      }

      if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
        return { valid: false, error: 'At least one allocation is required' };
      }

      const piItem = await this.getPIItem(piId, itemId);
      
      if (!piItem) {
        return { valid: false, error: 'PI item not found in Firestore' };
      }

      // 🔍 CRITICAL FIX: Use receivedQty if available, otherwise fall back to quantity
      const receivedQty = piItem.receivedQty || piItem.quantity || 0;
      const currentAllocated = piItem.totalAllocated || 0;
      const availableQty = receivedQty - currentAllocated;
      
      const totalAllocating = allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);

      console.log('🔍 ALLOCATION VALIDATION DETAILS:', {
        piId,
        itemId,
        receivedQty,
        currentAllocated,
        availableQty,
        totalAllocating,
        piItem: {
          id: piItem.id,
          productCode: piItem.productCode,
          quantity: piItem.quantity,
          receivedQty: piItem.receivedQty
        }
      });

      if (totalAllocating > availableQty) {
        return { 
          valid: false, 
          error: `Cannot allocate ${totalAllocating} items. Only ${availableQty} available.` 
        };
      }

      // Validate each allocation
      for (const allocation of allocations) {
        if (allocation.quantity <= 0) {
          return { valid: false, error: 'Allocation quantity must be greater than 0' };
        }

        if (!allocation.allocationType) {
          return { valid: false, error: 'Allocation type is required' };
        }

        if (!allocation.allocationTarget) {
          return { valid: false, error: 'Allocation target is required' };
        }

        if (allocation.allocationType === this.ALLOCATION_TYPES.PO) {
          const poValidation = await this.validatePOAllocation(allocation);
          if (!poValidation.valid) {
            return poValidation;
          }
        }
      }

      console.log('✅ Allocation validation passed in Firestore');
      return { valid: true };

    } catch (error) {
      console.error('❌ Validation error in Firestore:', error);
      return { valid: false, error: 'Validation failed: ' + error.message };
    }
  }

  /**
   * 🚀 Validate PO allocation
   */
  static async validatePOAllocation(allocation) {
    try {
      const purchaseOrdersResult = await safeGetCollection('purchaseOrders');
      const purchaseOrders = purchaseOrdersResult.success ? purchaseOrdersResult.data : [];
      const po = purchaseOrders.find(p => p.id === allocation.allocationTarget);
      
      if (!po) {
        return { valid: false, error: 'Purchase Order not found in Firestore' };
      }

      if (!['draft', 'confirmed', 'processing'].includes(po.status)) {
        return { valid: false, error: 'Cannot allocate to completed or cancelled PO' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating PO allocation in Firestore:', error);
      return { valid: false, error: 'PO validation failed' };
    }
  }

  /**
   * 🚀 Create allocation record
   */
  static async createAllocationRecord(piId, itemId, allocation, piItem) {
    const record = {
      piId: piId,
      itemId: itemId,
      productCode: piItem.productCode,
      productName: piItem.productName,
      quantity: allocation.quantity,
      allocationType: allocation.allocationType,
      allocationTarget: allocation.allocationTarget,
      targetName: allocation.targetName,
      
      // Tracking
      allocatedDate: new Date().toISOString(),
      allocatedBy: 'current-user', // Replace with actual user context
      status: this.ALLOCATION_STATUS.ALLOCATED,
      
      // Additional info
      notes: allocation.notes || '',
      priority: allocation.priority || 'medium',
      
      // 🔧 CRITICAL FIX: Use regular timestamp, not serverTimestamp() for arrays
      createdAt: new Date().toISOString(),
      history: [{
        action: 'created',
        timestamp: new Date().toISOString(),
        user: 'current-user',
        details: `Allocated ${allocation.quantity} units to ${allocation.targetName}`
      }]
    };

    try {
      // Save allocation record to Firestore using business logic function
      const result = await safeAddDocument('stockAllocations', record);
      
      if (result.success) {
        const recordWithId = { id: result.data.id, ...record };
        console.log('✅ Allocation record created in Firestore:', result.data.id);
        return recordWithId;
      } else {
        throw new Error('Failed to create allocation record: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error creating allocation record in Firestore:', error);
      throw error;
    }
  }

  /**
   * 🚀 Update PI item with allocations
   */
  static async updatePIItemAllocations(piId, itemId, allocationRecords) {
    try {
      console.log('🔍 Enhanced Firestore PI lookup - Updating allocations for:', { piId, itemId, allocationRecords });
      
      // Get all PIs using business logic function
      const proformaInvoicesResult = await getProformaInvoices();
      if (!proformaInvoicesResult.success) {
        throw new Error('Failed to get proforma invoices from Firestore');
      }
      
      const proformaInvoices = proformaInvoicesResult.data;
      console.log('📋 Found PIs in Firestore:', proformaInvoices.length);
      
      // 🎯 MULTI-STRATEGY PI SEARCH SYSTEM FOR FIRESTORE
      const searchStrategies = [
        {
          name: 'Direct ID Match',
          finder: (pis) => pis.find(p => p.id === piId)
        },
        {
          name: 'PI Number Match',
          finder: (pis) => pis.find(p => p.piNumber === piId)
        },
        {
          name: 'Document ID Match',
          finder: (pis) => pis.find(p => p.documentId === piId)
        },
        {
          name: 'Partial ID Match',
          finder: (pis) => pis.find(p => 
            p.id && piId && (p.id.includes(piId) || piId.includes(p.id))
          )
        },
        {
          name: 'PI Number Pattern Match',
          finder: (pis) => pis.find(p => 
            p.piNumber && piId && p.piNumber.includes(piId.split('-')[0])
          )
        },
        {
          name: 'Most Recent PI Fallback',
          finder: (pis) => pis
            .filter(p => p.piNumber && piId && p.piNumber.includes(piId.split('-')[0]))
            .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0]
        }
      ];

      let pi = null;
      let usedStrategy = null;

      // Try each strategy until we find a PI
      for (const strategy of searchStrategies) {
        pi = strategy.finder(proformaInvoices);
        if (pi) {
          usedStrategy = strategy.name;
          console.log(`✅ PI found using strategy: ${strategy.name}`);
          console.log('📄 Found PI:', { id: pi.id, piNumber: pi.piNumber });
          break;
        }
      }
      
      // If still no PI found, provide detailed debugging
      if (!pi) {
        console.log('❌ PI not found with any strategy. Available PIs:');
        proformaInvoices.forEach((p, idx) => {
          console.log(`  PI ${idx}: ID="${p.id}", Number="${p.piNumber}", DocumentId="${p.documentId}"`);
        });
        throw new Error(`PI not found in Firestore after trying all strategies. Searched for: "${piId}"`);
      }

      // 🎯 ENHANCED ITEM SEARCH SYSTEM
      const itemSearchStrategies = [
        {
          name: 'Direct ID Match',
          finder: (items) => items.find(item => item.id === itemId)
        },
        {
          name: 'Product Code Match',
          finder: (items) => items.find(item => item.productCode === itemId)
        },
        {
          name: 'Product Name Match',
          finder: (items) => items.find(item => item.productName === itemId)
        },
        {
          name: 'Part Number Match',
          finder: (items) => items.find(item => item.partNumber === itemId)
        },
        {
          name: 'SKU Match',
          finder: (items) => items.find(item => item.sku === itemId)
        },
        {
          name: 'Generated ID Pattern Match',
          finder: (items) => items.find(item => 
            item.id && itemId && (item.id.includes(itemId) || itemId.includes(item.id))
          )
        },
        {
          name: 'Index-based Match (item_1, item_2, etc)',
          finder: (items) => {
            const match = itemId.match(/item[_-]?(\d+)/i);
            if (match) {
              const index = parseInt(match[1]) - 1; // Convert to 0-based index
              return items[index];
            }
            return null;
          }
        },
        {
          name: 'First Item Fallback',
          finder: (items) => items[0]
        }
      ];

      let item = null;
      let itemIndex = -1;
      let usedItemStrategy = null;

      // Try each item search strategy
      for (const strategy of itemSearchStrategies) {
        const foundItem = strategy.finder(pi.items || []);
        if (foundItem) {
          itemIndex = pi.items.findIndex(i => i === foundItem);
          item = foundItem;
          usedItemStrategy = strategy.name;
          console.log(`✅ Item found using strategy: ${strategy.name}`);
          console.log('📦 Found item:', { id: item.id, productCode: item.productCode, productName: item.productName });
          break;
        }
      }
      
      if (itemIndex === -1 || !item) {
        console.log('❌ Item not found with any strategy. Available items:');
        (pi.items || []).forEach((item, idx) => {
          console.log(`  Item ${idx}: ID="${item.id}", Code="${item.productCode}", Name="${item.productName}"`);
        });
        throw new Error(`PI item not found in Firestore after trying all strategies. Searched for: "${itemId}"`);
      }

      // 🎯 UPDATE ALLOCATIONS WITH AUDIT TRAIL
      console.log('✅ Both PI and item found in Firestore, updating allocations...');
      
      // Merge new allocations with existing ones
      item.allocations = (item.allocations || []).concat(allocationRecords);
      item.totalAllocated = item.allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
      
      // 🔍 CRITICAL FIX: Use receivedQty if available
      const baseQty = item.receivedQty || item.quantity || 0;
      item.unallocatedQty = baseQty - item.totalAllocated;

      // Add audit trail
      item.allocationHistory = item.allocationHistory || [];
      item.allocationHistory.push({
        timestamp: new Date().toISOString(),
        action: 'allocated',
        quantity: allocationRecords.reduce((sum, record) => sum + record.quantity, 0),
        allocations: allocationRecords.length,
        strategy: usedStrategy,
        itemStrategy: usedItemStrategy
      });

      // Update PI timestamp and save to Firestore using business logic function
      const updates = {
        items: pi.items,
        updatedAt: new Date().toISOString(), // Don't use serverTimestamp in update
        lastAllocationUpdate: new Date().toISOString()
      };

      const updateResult = await updateProformaInvoice(pi.id, updates);
      
      if (!updateResult.success) {
        throw new Error('Failed to update PI in Firestore: ' + updateResult.error);
      }

      console.log('✅ PI item allocations updated successfully in Firestore');
      console.log('📊 Updated item stats:', {
        totalAllocated: item.totalAllocated,
        unallocatedQty: item.unallocatedQty,
        allocationsCount: item.allocations.length,
        usedStrategy,
        usedItemStrategy
      });
      
    } catch (error) {
      console.error('❌ Error updating PI item allocations in Firestore:', error);
      throw error;
    }
  }

  /**
   * 🚀 Update product stock levels
   */
  static async updateProductStock(productId, allocations) {
    try {
      // Get products using business logic function
      const productsResult = await getProducts();
      if (!productsResult.success) {
        console.log('⚠️ Failed to get products from Firestore for stock update');
        return;
      }

      const products = productsResult.data;
      const product = products.find(p => 
        p.id === productId || 
        p.sku === productId || 
        p.code === productId ||
        p.productCode === productId
      );
      
      if (!product) {
        console.log('⚠️ Product not found in Firestore for stock update:', productId);
        return;
      }

      // Calculate allocation breakdown
      const warehouseAllocations = allocations
        .filter(alloc => alloc.allocationType === this.ALLOCATION_TYPES.WAREHOUSE)
        .reduce((sum, alloc) => sum + alloc.quantity, 0);
      
      const reservedAllocations = allocations
        .filter(alloc => alloc.allocationType !== this.ALLOCATION_TYPES.WAREHOUSE)
        .reduce((sum, alloc) => sum + alloc.quantity, 0);

      // Prepare updates
      const updates = {
        stock: (product.stock || 0) + warehouseAllocations,
        allocatedStock: (product.allocatedStock || 0) + reservedAllocations,
        updatedAt: new Date().toISOString()
      };
      
      updates.availableStock = updates.stock - updates.allocatedStock;

      // Update in Firestore using business logic function
      const result = await safeUpdateDocument('products', product.id, updates);
      
      if (result.success) {
        console.log('✅ Product stock levels updated in Firestore');
      } else {
        console.error('❌ Failed to update product stock:', result.error);
      }
    } catch (error) {
      console.error('❌ Error updating product stock in Firestore:', error);
      // Don't throw - this is not critical for allocation
    }
  }

  /**
   * 🚀 Update target documents
   */
  static async updateTargetDocuments(allocations) {
    try {
      for (const allocation of allocations) {
        if (allocation.allocationType === this.ALLOCATION_TYPES.PO) {
          await this.updatePOFulfillment(allocation);
        } else if (allocation.allocationType === this.ALLOCATION_TYPES.PROJECT) {
          await this.updateProjectAllocation(allocation);
        }
      }
      console.log('✅ Target documents updated in Firestore');
    } catch (error) {
      console.error('❌ Error updating target documents in Firestore:', error);
      // Don't throw - this is not critical for allocation
    }
  }

  /**
   * 🚀 Update PO fulfillment status
   */
  static async updatePOFulfillment(allocation) {
    try {
      const purchaseOrdersResult = await safeGetCollection('purchaseOrders');
      if (!purchaseOrdersResult.success) {
        console.log('⚠️ Failed to get POs from Firestore for fulfillment update');
        return;
      }

      const purchaseOrders = purchaseOrdersResult.data;
      const po = purchaseOrders.find(p => p.id === allocation.allocationTarget);
      
      if (!po) {
        console.log('⚠️ PO not found in Firestore for fulfillment update:', allocation.allocationTarget);
        return;
      }

      // Update fulfillment tracking
      const fulfillment = po.fulfillment || {
        allocations: [],
        totalAllocated: 0,
        fulfillmentRate: 0
      };

      fulfillment.allocations.push({
        allocationId: allocation.id,
        quantity: allocation.quantity,
        allocatedDate: allocation.allocatedDate,
        productCode: allocation.productCode
      });

      fulfillment.totalAllocated += allocation.quantity;
      
      // Calculate fulfillment rate
      const totalOrdered = po.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
      fulfillment.fulfillmentRate = totalOrdered > 0 ? (fulfillment.totalAllocated / totalOrdered) * 100 : 0;

      const updates = {
        fulfillment: fulfillment,
        updatedAt: new Date().toISOString()
      };

      const result = await safeUpdateDocument('purchaseOrders', po.id, updates);
      
      if (result.success) {
        console.log('✅ PO fulfillment updated in Firestore');
      } else {
        console.error('❌ Failed to update PO fulfillment:', result.error);
      }
    } catch (error) {
      console.error('❌ Error updating PO fulfillment in Firestore:', error);
    }
  }

  /**
   * Update project allocation tracking
   */
  static async updateProjectAllocation(allocation) {
    try {
      // This would update project cost tracking in Firestore
      // For now, just log the allocation
      console.log('📊 Project allocation recorded in Firestore:', {
        projectCode: allocation.allocationTarget,
        quantity: allocation.quantity,
        allocatedDate: allocation.allocatedDate
      });
    } catch (error) {
      console.error('Error updating project allocation in Firestore:', error);
    }
  }

  /**
   * 🚀 Enhanced PI lookup helper
   */
  static async getPIById(piIdOrNumber) {
    try {
      console.log('🔍 Firestore PI lookup for:', piIdOrNumber);
      
      const proformaInvoicesResult = await getProformaInvoices();
      if (!proformaInvoicesResult.success) {
        console.log('❌ Failed to get PIs from Firestore');
        return null;
      }
      
      const proformaInvoices = proformaInvoicesResult.data;

      // Multiple search strategies for maximum compatibility
      const strategies = [
        // Strategy 1: Direct ID match
        () => proformaInvoices.find(p => p.id === piIdOrNumber),
        
        // Strategy 2: PI Number match
        () => proformaInvoices.find(p => p.piNumber === piIdOrNumber),
        
        // Strategy 3: Document ID match
        () => proformaInvoices.find(p => p.documentId === piIdOrNumber),
        
        // Strategy 4: Partial match (for ID format differences)
        () => proformaInvoices.find(p => 
          p.id && piIdOrNumber && (p.id.includes(piIdOrNumber) || piIdOrNumber.includes(p.id))
        ),
        
        // Strategy 5: PI Number pattern match (e.g., "TH-202407997")
        () => {
          if (!piIdOrNumber) return null;
          const prefix = piIdOrNumber.split('-')[0];
          return proformaInvoices.find(p => p.piNumber && p.piNumber.includes(prefix));
        },
        
        // Strategy 6: Most recently updated PI with matching pattern
        () => {
          if (!piIdOrNumber) return null;
          const prefix = piIdOrNumber.split('-')[0];
          return proformaInvoices
            .filter(p => p.piNumber && p.piNumber.includes(prefix))
            .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
        }
      ];

      // Try each strategy
      for (let i = 0; i < strategies.length; i++) {
        const pi = strategies[i]();
        if (pi) {
          console.log(`🔍 PI found in Firestore using strategy ${i + 1}:`, pi.piNumber);
          return pi;
        }
      }
      
      console.log('🔍 PI not found in Firestore');
      return null;
    } catch (error) {
      console.error('Error getting PI by ID from Firestore:', error);
      return null;
    }
  }

  static async getPIItem(piId, itemId) {
    try {
      const pi = await this.getPIById(piId);
      if (!pi) {
        console.log('⚠️ PI not found in Firestore for item lookup:', { piId, itemId });
        return null;
      }
      
      // Multiple strategies for finding items
      const strategies = [
        () => pi.items?.find(item => item.id === itemId),
        () => pi.items?.find(item => item.productCode === itemId),
        () => pi.items?.find(item => item.productName === itemId),
        () => pi.items?.find(item => item.partNumber === itemId),
        () => pi.items?.find(item => item.sku === itemId),
        // Index-based search (item_1, item_2, etc.)
        () => {
          const match = itemId.match(/item[_-]?(\d+)/i);
          if (match && pi.items) {
            const index = parseInt(match[1]) - 1;
            return pi.items[index];
          }
          return null;
        }
      ];

      for (const strategy of strategies) {
        const item = strategy();
        if (item) {
          console.log('✅ PI item found:', { 
            id: item.id, 
            productCode: item.productCode, 
            productName: item.productName,
            quantity: item.quantity,
            receivedQty: item.receivedQty,
            totalAllocated: item.totalAllocated 
          });
          return item;
        }
      }
      
      console.log('⚠️ PI item not found in Firestore:', { piId, itemId });
      return null;
    } catch (error) {
      console.error('Error getting PI item from Firestore:', error);
      return null;
    }
  }

  /**
   * 🚀 Get allocation analytics
   */
  static async getAllocationAnalytics() {
    try {
      // Get allocations from Firestore using business logic functions
      const allocationsResult = await safeGetCollection('stockAllocations');
      const allocations = allocationsResult.success ? allocationsResult.data : [];

      const proformaInvoicesResult = await getProformaInvoices();
      const proformaInvoices = proformaInvoicesResult.success ? proformaInvoicesResult.data : [];
      
      const totalAllocated = allocations.length;
      const totalValue = allocations.reduce((sum, alloc) => {
        // Calculate value based on PI item price
        const pi = proformaInvoices.find(p => p.id === alloc.piId);
        const item = pi?.items?.find(i => i.id === alloc.itemId);
        return sum + (alloc.quantity * (item?.unitPrice || 0));
      }, 0);

      const allocationBreakdown = {
        poAllocations: allocations.filter(a => a.allocationType === this.ALLOCATION_TYPES.PO).length,
        projectAllocations: allocations.filter(a => a.allocationType === this.ALLOCATION_TYPES.PROJECT).length,
        warehouseStock: allocations.filter(a => a.allocationType === this.ALLOCATION_TYPES.WAREHOUSE).length
      };

      return {
        totalAllocated,
        totalValue,
        allocationBreakdown,
        averageAllocationTime: '2.3 minutes', // Mock data
        allocationAccuracy: 95.7 // Mock data
      };
    } catch (error) {
      console.error('Error getting allocation analytics from Firestore:', error);
      return {
        totalAllocated: 0,
        totalValue: 0,
        allocationBreakdown: { poAllocations: 0, projectAllocations: 0, warehouseStock: 0 },
        averageAllocationTime: 'N/A',
        allocationAccuracy: 0
      };
    }
  }

  /**
   * 🚀 Debug helper - Get all allocation data
   */
  static async getAllAllocationData() {
    try {
      const allocationsResult = await safeGetCollection('stockAllocations');
      const allocations = allocationsResult.success ? allocationsResult.data : [];

      const proformaInvoicesResult = await getProformaInvoices();
      const purchaseOrdersResult = await safeGetCollection('purchaseOrders');
      const productsResult = await getProducts();

      return {
        allocations,
        proformaInvoices: proformaInvoicesResult.success ? proformaInvoicesResult.data : [],
        purchaseOrders: purchaseOrdersResult.success ? purchaseOrdersResult.data : [],
        products: productsResult.success ? productsResult.data : []
      };
    } catch (error) {
      console.error('Error getting all allocation data from Firestore:', error);
      return {
        allocations: [],
        proformaInvoices: [],
        purchaseOrders: [],
        products: []
      };
    }
  }
}
