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
      console.log('Allocating stock:', { piId, itemId, allocations });

      // Validate allocation quantities
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

      return {
        success: true,
        allocations: allocationRecords,
        message: 'Stock allocated successfully'
      };

    } catch (error) {
      console.error('Stock allocation error:', error);
      throw error;
    }
  }

  /**
   * Get available allocation targets
   */
  static async getAvailableTargets(productId) {
    try {
      // Get open POs that need this product
      const openPOs = await this.getOpenPOsForProduct(productId);
      
      // Get active project codes
      const projectCodes = await this.getActiveProjectCodes();
      
      // Get warehouse locations
      const warehouseLocations = await this.getWarehouseLocations();

      return {
        purchaseOrders: openPOs,
        projectCodes: projectCodes,
        warehouses: warehouseLocations
      };
    } catch (error) {
      console.error('Error getting available targets:', error);
      return {
        purchaseOrders: [],
        projectCodes: [],
        warehouses: []
      };
    }
  }

  /**
   * Get open POs that need a specific product
   */
  static async getOpenPOsForProduct(productId) {
    const purchaseOrders = getLocalStorageData('purchaseOrders') || [];
    const products = getLocalStorageData('products') || [];
    
    const product = products.find(p => p.id === productId);
    if (!product) return [];

    const openPOs = purchaseOrders.filter(po => 
      ['draft', 'confirmed', 'processing'].includes(po.status) &&
      po.items && po.items.some(item => 
        this.isProductMatch(item, product)
      )
    );

    return openPOs.map(po => {
      const matchingItems = po.items.filter(item => this.isProductMatch(item, product));
      const neededQuantity = matchingItems.reduce((sum, item) => 
        sum + (item.quantity - (item.fulfilledQuantity || 0)), 0
      );

      return {
        id: po.id,
        name: po.poNumber,
        info: `${po.clientName} - Due: ${po.requiredDate}`,
        priority: this.calculatePOPriority(po),
        requiredDate: po.requiredDate,
        neededQuantity: neededQuantity,
        clientName: po.clientName
      };
    }).filter(po => po.neededQuantity > 0);
  }

  /**
   * Check if PO item matches product
   */
  static isProductMatch(poItem, product) {
    return (
      poItem.productId === product.id ||
      poItem.productCode === product.sku ||
      poItem.productName === product.name ||
      (poItem.productCode && product.sku && 
       poItem.productCode.toLowerCase() === product.sku.toLowerCase())
    );
  }

  /**
   * Calculate PO priority based on due date and client importance
   */
  static calculatePOPriority(po) {
    if (!po.requiredDate) return 'medium';
    
    const dueDate = new Date(po.requiredDate);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDue <= 7) return 'high';
    if (daysUntilDue <= 30) return 'medium';
    return 'low';
  }

  /**
   * Get active project codes
   */
  static async getActiveProjectCodes() {
    // For now, return common project patterns
    // This would eventually come from a projects table/collection
    return [
      { id: 'proj-petronas-2025', name: 'PROJ-2025-PETRONAS', info: 'Oil & Gas Division' },
      { id: 'proj-smart-city-2025', name: 'PROJ-2025-SMART-CITY', info: 'Smart Infrastructure' },
      { id: 'proj-hospitality-2025', name: 'PROJ-2025-HOSPITALITY', info: 'Tourism & Hospitality' },
      { id: 'proj-industrial-2025', name: 'PROJ-2025-INDUSTRIAL', info: 'Manufacturing' },
      { id: 'proj-research-2025', name: 'PROJ-2025-R&D', info: 'Research & Development' }
    ];
  }

  /**
   * Get warehouse locations
   */
  static async getWarehouseLocations() {
    return [
      { id: 'wh-main', name: 'Main Warehouse', info: 'Bandar Baru Nilai' },
      { id: 'wh-kl', name: 'KL Distribution Center', info: 'Kuala Lumpur' },
      { id: 'wh-penang', name: 'Northern Hub', info: 'Penang' },
      { id: 'wh-johor', name: 'Southern Hub', info: 'Johor Bahru' }
    ];
  }

  /**
   * Auto-suggest allocations based on open POs
   */
  static async suggestAllocations(piId, itemId, availableQty) {
    try {
      const pi = await this.getPIById(piId);
      const piItem = pi?.items?.find(item => item.id === itemId);
      
      if (!piItem) return [];

      const openPOs = await this.getOpenPOsForProduct(piItem.productId || piItem.productCode);
      
      const suggestions = [];
      let remainingQty = availableQty;

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

        const allocateQty = Math.min(remainingQty, po.neededQuantity);

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
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Validate allocation request
   */
  static async validateAllocation(piId, itemId, allocations) {
    try {
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

        if (allocation.allocationType === this.ALLOCATION_TYPES.PO) {
          const poValidation = await this.validatePOAllocation(allocation);
          if (!poValidation.valid) {
            return poValidation;
          }
        }
      }

      return { valid: true };
    } catch (error) {
      console.error('Validation error:', error);
      return { valid: false, error: 'Validation failed: ' + error.message };
    }
  }

  /**
   * Validate PO allocation
   */
  static async validatePOAllocation(allocation) {
    const purchaseOrders = getLocalStorageData('purchaseOrders') || [];
    const po = purchaseOrders.find(p => p.id === allocation.allocationTarget);
    
    if (!po) {
      return { valid: false, error: 'Purchase Order not found' };
    }

    if (!['draft', 'confirmed', 'processing'].includes(po.status)) {
      return { valid: false, error: 'Cannot allocate to completed or cancelled PO' };
    }

    return { valid: true };
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

    return record;
  }

  /**
   * Update PI item with allocations
   */
  static async updatePIItemAllocations(piId, itemId, allocationRecords) {
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
  }

  /**
   * Update product stock levels
   */
  static async updateProductStock(productId, allocations) {
    const products = getLocalStorageData('products') || [];
    const productIndex = products.findIndex(p => p.id === productId);
    
    if (productIndex === -1) return; // Product not found, skip update

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
  }

  /**
   * Update target documents
   */
  static async updateTargetDocuments(allocations) {
    for (const allocation of allocations) {
      if (allocation.allocationType === this.ALLOCATION_TYPES.PO) {
        await this.updatePOFulfillment(allocation);
      } else if (allocation.allocationType === this.ALLOCATION_TYPES.PROJECT) {
        await this.updateProjectAllocation(allocation);
      }
    }
  }

  /**
   * Update PO fulfillment status
   */
  static async updatePOFulfillment(allocation) {
    const purchaseOrders = getLocalStorageData('purchaseOrders') || [];
    const poIndex = purchaseOrders.findIndex(po => po.id === allocation.allocationTarget);
    
    if (poIndex === -1) return;

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
    po.fulfillment.fulfillmentRate = (po.fulfillment.totalAllocated / totalOrdered) * 100;

    po.updatedAt = new Date().toISOString();
    purchaseOrders[poIndex] = po;
    setLocalStorageData('purchaseOrders', purchaseOrders);
  }

  /**
   * Update project allocation tracking
   */
  static async updateProjectAllocation(allocation) {
    // This would update project cost tracking
    // For now, just log the allocation
    console.log('Project allocation recorded:', {
      projectCode: allocation.allocationTarget,
      quantity: allocation.quantity,
      allocatedDate: allocation.allocatedDate
    });
  }

  /**
   * Helper methods
   */
  static async getPIById(piId) {
    const proformaInvoices = getLocalStorageData('proformaInvoices') || [];
    return proformaInvoices.find(pi => pi.id === piId);
  }

  static async getPIItem(piId, itemId) {
    const pi = await this.getPIById(piId);
    return pi?.items?.find(item => item.id === itemId);
  }

  /**
   * Get allocation analytics
   */
  static async getAllocationAnalytics() {
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
  }
}
