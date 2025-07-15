// src/services/StockAllocationService.js
import { mockFirebase } from './firebase';

// Helper functions to work with your existing firebase service
const getLocalStorageData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error);
    return [];
  }
};

const setLocalStorageData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error setting ${key} to localStorage:`, error);
  }
};

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
   * Allocate stock from received items to targets
   */
  static async allocateStock(piId, itemId, allocations) {
    try {
      console.log('🎯 Allocating stock:', { piId, itemId, allocations });

      // Enhanced validation with better error handling
      const validationResult = await this.validateAllocation(piId, itemId, allocations);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Create allocation records
      const allocationRecords = [];
      for (const allocation of allocations) {
        const record = await this.createAllocationRecord(piId, itemId, allocation);
        allocationRecords.push(record);
      }

      // Update PI item with allocations
      await this.updatePIItemAllocations(piId, itemId, allocationRecords);

      // Update product stock levels
      await this.updateProductStock(itemId, allocations);

      // Update target documents (PO fulfillment, project tracking)
      await this.updateTargetDocuments(allocations);

      console.log('✅ Stock allocation completed successfully');
      return {
        success: true,
        allocations: allocationRecords,
        message: 'Stock allocated successfully'
      };

    } catch (error) {
      console.error('❌ Stock allocation error:', error);
      throw error;
    }
  }

  /**
   * Get available allocation targets - Enhanced with better error handling
   */
  static async getAvailableTargets(productId) {
    try {
      console.log('🎯 Getting available targets for product:', productId);

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

      console.log('✅ Available targets loaded:', targets);
      return targets;

    } catch (error) {
      console.error('❌ Error getting available targets:', error);
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
   * Get open POs that need a specific product
   */
  static async getOpenPOsForProduct(productId) {
    try {
      const purchaseOrders = getLocalStorageData('purchaseOrders') || [];
      const products = getLocalStorageData('products') || [];
      
      console.log('🔍 Searching POs for product:', productId);
      console.log('📦 Available products:', products.length);
      console.log('📋 Available POs:', purchaseOrders.length);
      
      const product = products.find(p => 
        p.id === productId || 
        p.sku === productId || 
        p.code === productId
      );
      
      if (!product) {
        console.log('⚠️ Product not found in products database');
        return [];
      }

      const openPOs = purchaseOrders.filter(po => 
        ['draft', 'confirmed', 'processing'].includes(po.status) &&
        po.items && po.items.some(item => 
          this.isProductMatch(item, product)
        )
      );

      console.log('📋 Found open POs:', openPOs.length);

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
      console.error('❌ Error getting open POs:', error);
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
   * Get active project codes
   */
  static async getActiveProjectCodes() {
    try {
      // Get from localStorage first, fallback to defaults
      const storedProjects = getLocalStorageData('projects') || [];
      
      if (storedProjects.length > 0) {
        return storedProjects.map(project => ({
          id: project.id,
          name: project.code || project.name,
          info: project.description || project.client || 'Project allocation'
        }));
      }

      // Return default project codes
      return [
        { id: 'proj-petronas-2025', name: 'PROJ-2025-PETRONAS', info: 'Oil & Gas Division' },
        { id: 'proj-smart-city-2025', name: 'PROJ-2025-SMART-CITY', info: 'Smart Infrastructure' },
        { id: 'proj-hospitality-2025', name: 'PROJ-2025-HOSPITALITY', info: 'Tourism & Hospitality' },
        { id: 'proj-industrial-2025', name: 'PROJ-2025-INDUSTRIAL', info: 'Manufacturing' },
        { id: 'proj-research-2025', name: 'PROJ-2025-R&D', info: 'Research & Development' },
        { id: 'proj-general', name: 'GENERAL-PROJECT', info: 'General project allocation' }
      ];
    } catch (error) {
      console.error('Error getting project codes:', error);
      return [
        { id: 'proj-general', name: 'GENERAL-PROJECT', info: 'General project allocation' }
      ];
    }
  }

  /**
   * Get warehouse locations
   */
  static async getWarehouseLocations() {
    try {
      // Get from localStorage first, fallback to defaults
      const storedWarehouses = getLocalStorageData('warehouses') || [];
      
      if (storedWarehouses.length > 0) {
        return storedWarehouses.map(warehouse => ({
          id: warehouse.id,
          name: warehouse.name,
          info: warehouse.location || warehouse.address || 'Warehouse location'
        }));
      }

      // Return default warehouse locations
      return [
        { id: 'wh-main', name: 'Main Warehouse', info: 'Bandar Baru Nilai' },
        { id: 'wh-kl', name: 'KL Distribution Center', info: 'Kuala Lumpur' },
        { id: 'wh-penang', name: 'Northern Hub', info: 'Penang' },
        { id: 'wh-johor', name: 'Southern Hub', info: 'Johor Bahru' },
        { id: 'wh-backup', name: 'Backup Storage', info: 'Secondary location' }
      ];
    } catch (error) {
      console.error('Error getting warehouse locations:', error);
      return [
        { id: 'wh-main', name: 'Main Warehouse', info: 'Primary storage location' }
      ];
    }
  }

  /**
   * Auto-suggest allocations based on open POs - Enhanced
   */
  static async suggestAllocations(piId, itemId, availableQty) {
    try {
      console.log('🧠 Generating suggestions for:', { piId, itemId, availableQty });

      if (!piId || !itemId || availableQty <= 0) {
        console.log('⚠️ Invalid parameters for suggestions');
        return this.getDefaultAllocation(availableQty);
      }

      const pi = await this.getPIById(piId);
      if (!pi) {
        console.log('⚠️ PI not found, using default allocation');
        return this.getDefaultAllocation(availableQty);
      }

      const piItem = pi.items?.find(item => item.id === itemId);
      if (!piItem) {
        console.log('⚠️ PI item not found, using default allocation');
        return this.getDefaultAllocation(availableQty);
      }

      // Try to get open POs for this product
      const openPOs = await this.getOpenPOsForProduct(piItem.productId || piItem.productCode);
      
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

      console.log('✅ Generated suggestions:', suggestions);
      return suggestions;

    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
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
   * Validate allocation request - Enhanced
   */
  static async validateAllocation(piId, itemId, allocations) {
    try {
      console.log('🔍 Validating allocation:', { piId, itemId, allocations });

      if (!piId || !itemId) {
        return { valid: false, error: 'PI ID and Item ID are required' };
      }

      if (!allocations || !Array.isArray(allocations) || allocations.length === 0) {
        return { valid: false, error: 'At least one allocation is required' };
      }

      const piItem = await this.getPIItem(piId, itemId);
      
      if (!piItem) {
        return { valid: false, error: 'PI item not found' };
      }

      const totalAllocating = allocations.reduce((sum, alloc) => sum + (alloc.quantity || 0), 0);
      const availableQty = (piItem.receivedQty || 0) - (piItem.totalAllocated || 0);

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

      console.log('✅ Allocation validation passed');
      return { valid: true };

    } catch (error) {
      console.error('❌ Validation error:', error);
      return { valid: false, error: 'Validation failed: ' + error.message };
    }
  }

  /**
   * Validate PO allocation
   */
  static async validatePOAllocation(allocation) {
    try {
      const purchaseOrders = getLocalStorageData('purchaseOrders') || [];
      const po = purchaseOrders.find(p => p.id === allocation.allocationTarget);
      
      if (!po) {
        return { valid: false, error: 'Purchase Order not found' };
      }

      if (!['draft', 'confirmed', 'processing'].includes(po.status)) {
        return { valid: false, error: 'Cannot allocate to completed or cancelled PO' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Error validating PO allocation:', error);
      return { valid: false, error: 'PO validation failed' };
    }
  }

  /**
   * Create allocation record
   */
  static async createAllocationRecord(piId, itemId, allocation) {
    const record = {
      id: `alloc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      piId: piId,
      itemId: itemId,
      productId: allocation.productId,
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
      
      // Audit trail
      createdAt: new Date().toISOString(),
      history: [{
        action: 'created',
        timestamp: new Date().toISOString(),
        user: 'current-user',
        details: `Allocated ${allocation.quantity} units to ${allocation.targetName}`
      }]
    };

    // Save allocation record
    const allocations = getLocalStorageData('stockAllocations') || [];
    allocations.push(record);
    setLocalStorageData('stockAllocations', allocations);

    console.log('✅ Allocation record created:', record.id);
    return record;
  }

  /**
   * Update PI item with allocations
   */
  static async updatePIItemAllocations(piId, itemId, allocationRecords) {
    try {
      const proformaInvoices = getLocalStorageData('proformaInvoices') || [];
      const piIndex = proformaInvoices.findIndex(pi => pi.id === piId);
      
      if (piIndex === -1) {
        throw new Error('Proforma Invoice not found');
      }

      const pi = proformaInvoices[piIndex];
      const itemIndex = pi.items.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        throw new Error('PI item not found');
      }

      // Update item allocations
      const item = pi.items[itemIndex];
      item.allocations = (item.allocations || []).concat(allocationRecords);
      item.totalAllocated = item.allocations.reduce((sum, alloc) => sum + alloc.quantity, 0);
      item.unallocatedQty = (item.receivedQty || 0) - item.totalAllocated;

      // Update PI
      pi.updatedAt = new Date().toISOString();
      proformaInvoices[piIndex] = pi;
      setLocalStorageData('proformaInvoices', proformaInvoices);

      console.log('✅ PI item allocations updated');
    } catch (error) {
      console.error('❌ Error updating PI item allocations:', error);
      throw error;
    }
  }

  /**
   * Update product stock levels
   */
  static async updateProductStock(productId, allocations) {
    try {
      const products = getLocalStorageData('products') || [];
      const productIndex = products.findIndex(p => p.id === productId);
      
      if (productIndex === -1) {
        console.log('⚠️ Product not found for stock update:', productId);
        return; // Product not found, skip update
      }

      const product = products[productIndex];
      
      // Calculate allocation breakdown
      const warehouseAllocations = allocations
        .filter(alloc => alloc.allocationType === this.ALLOCATION_TYPES.WAREHOUSE)
        .reduce((sum, alloc) => sum + alloc.quantity, 0);
      
      const reservedAllocations = allocations
        .filter(alloc => alloc.allocationType !== this.ALLOCATION_TYPES.WAREHOUSE)
        .reduce((sum, alloc) => sum + alloc.quantity, 0);

      // Update stock levels
      product.stock = (product.stock || 0) + warehouseAllocations;
      product.allocatedStock = (product.allocatedStock || 0) + reservedAllocations;
      product.availableStock = product.stock - product.allocatedStock;
      
      // Update timestamp
      product.updatedAt = new Date().toISOString();
      
      products[productIndex] = product;
      setLocalStorageData('products', products);

      console.log('✅ Product stock levels updated');
    } catch (error) {
      console.error('❌ Error updating product stock:', error);
      // Don't throw - this is not critical for allocation
    }
  }

  /**
   * Update target documents
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
      console.log('✅ Target documents updated');
    } catch (error) {
      console.error('❌ Error updating target documents:', error);
      // Don't throw - this is not critical for allocation
    }
  }

  /**
   * Update PO fulfillment status
   */
  static async updatePOFulfillment(allocation) {
    try {
      const purchaseOrders = getLocalStorageData('purchaseOrders') || [];
      const poIndex = purchaseOrders.findIndex(po => po.id === allocation.allocationTarget);
      
      if (poIndex === -1) {
        console.log('⚠️ PO not found for fulfillment update:', allocation.allocationTarget);
        return;
      }

      const po = purchaseOrders[poIndex];
      
      // Update fulfillment tracking
      if (!po.fulfillment) {
        po.fulfillment = {
          allocations: [],
          totalAllocated: 0,
          fulfillmentRate: 0
        };
      }

      po.fulfillment.allocations.push({
        allocationId: allocation.id,
        quantity: allocation.quantity,
        allocatedDate: allocation.allocatedDate,
        productCode: allocation.productCode
      });

      po.fulfillment.totalAllocated += allocation.quantity;
      
      // Calculate fulfillment rate
      const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
      po.fulfillment.fulfillmentRate = totalOrdered > 0 ? (po.fulfillment.totalAllocated / totalOrdered) * 100 : 0;

      po.updatedAt = new Date().toISOString();
      purchaseOrders[poIndex] = po;
      setLocalStorageData('purchaseOrders', purchaseOrders);

      console.log('✅ PO fulfillment updated');
    } catch (error) {
      console.error('❌ Error updating PO fulfillment:', error);
    }
  }

  /**
   * Update project allocation tracking
   */
  static async updateProjectAllocation(allocation) {
    try {
      // This would update project cost tracking
      // For now, just log the allocation
      console.log('📊 Project allocation recorded:', {
        projectCode: allocation.allocationTarget,
        quantity: allocation.quantity,
        allocatedDate: allocation.allocatedDate
      });
    } catch (error) {
      console.error('Error updating project allocation:', error);
    }
  }

  /**
   * Helper methods - Enhanced
   */
  static async getPIById(piIdOrNumber) {
  try {
    const proformaInvoices = getLocalStorageData('proformaInvoices') || [];
    
    // First try to find by actual ID
    let pi = proformaInvoices.find(p => p.id === piIdOrNumber);
    
    // If not found, try to find by PI number
    if (!pi) {
      pi = proformaInvoices.find(p => p.piNumber === piIdOrNumber);
      console.log('🔍 PI found by number:', pi ? 'Yes' : 'No');
    }
    
    return pi;
  } catch (error) {
    console.error('Error getting PI by ID:', error);
    return null;
  }
}
  static async getPIItem(piId, itemId) {
    try {
      const pi = await this.getPIById(piId);
      if (!pi) return null;
      
      const item = pi.items?.find(item => item.id === itemId);
      
      if (!item) {
        console.log('⚠️ PI item not found:', { piId, itemId });
      }
      
      return item;
    } catch (error) {
      console.error('Error getting PI item:', error);
      return null;
    }
  }

  /**
   * Get allocation analytics
   */
  static async getAllocationAnalytics() {
    try {
      const allocations = getLocalStorageData('stockAllocations') || [];
      const proformaInvoices = getLocalStorageData('proformaInvoices') || [];
      
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
      console.error('Error getting allocation analytics:', error);
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
   * Debug helper - Get all allocation data
   */
  static async getAllAllocationData() {
    return {
      allocations: getLocalStorageData('stockAllocations') || [],
      proformaInvoices: getLocalStorageData('proformaInvoices') || [],
      purchaseOrders: getLocalStorageData('purchaseOrders') || [],
      products: getLocalStorageData('products') || []
    };
  }
}
