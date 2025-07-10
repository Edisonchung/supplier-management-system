// src/services/purchaseOrderService.js
const STORAGE_KEY = 'purchase_orders';

class PurchaseOrderService {
  constructor() {
    // Initialize with empty array if no data exists
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    }
  }

  // Get all purchase orders
  async getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return JSON.parse(data || '[]');
    } catch (error) {
      console.error('Error getting purchase orders:', error);
      return [];
    }
  }

  // Get a single purchase order by ID
  async getById(id) {
    try {
      const orders = await this.getAll();
      const order = orders.find(order => order.id === id);
      
      if (!order) {
        throw new Error('Purchase order not found');
      }
      
      return order;
    } catch (error) {
      console.error('Error getting purchase order:', error);
      throw error;
    }
  }

  // Create a new purchase order
  async create(orderData) {
    try {
      const orders = await this.getAll();
      
      // Generate ID and timestamps
      const newOrder = {
        ...orderData,
        id: `PO-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      orders.push(newOrder);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      
      return newOrder;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }

  // Update an existing purchase order
  async update(id, updates) {
    try {
      const orders = await this.getAll();
      const index = orders.findIndex(order => order.id === id);
      
      if (index === -1) {
        throw new Error('Purchase order not found');
      }
      
      orders[index] = {
        ...orders[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      
      return orders[index];
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  }

  // Delete a purchase order
  async delete(id) {
    try {
      const orders = await this.getAll();
      const filteredOrders = orders.filter(order => order.id !== id);
      
      if (orders.length === filteredOrders.length) {
        throw new Error('Purchase order not found');
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredOrders));
      
      return true;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  }

  // Search purchase orders
  async search(query) {
    try {
      const orders = await this.getAll();
      const searchTerm = query.toLowerCase();
      
      return orders.filter(order => 
        order.orderNumber?.toLowerCase().includes(searchTerm) ||
        order.poNumber?.toLowerCase().includes(searchTerm) ||
        order.client?.toLowerCase().includes(searchTerm) ||
        order.clientName?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching purchase orders:', error);
      return [];
    }
  }

  // Get purchase orders by status
  async getByStatus(status) {
    try {
      const orders = await this.getAll();
      return orders.filter(order => order.status === status);
    } catch (error) {
      console.error('Error getting orders by status:', error);
      return [];
    }
  }

  // Get statistics
  async getStatistics() {
    try {
      const orders = await this.getAll();
      
      return {
        total: orders.length,
        draft: orders.filter(o => o.status === 'draft').length,
        sent: orders.filter(o => o.status === 'sent').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        totalValue: orders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0),
        averageValue: orders.length > 0 
          ? orders.reduce((sum, o) => sum + (o.total || o.totalAmount || 0), 0) / orders.length 
          : 0
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        total: 0,
        draft: 0,
        sent: 0,
        confirmed: 0,
        cancelled: 0,
        totalValue: 0,
        averageValue: 0
      };
    }
  }
}

// Create singleton instance
export const purchaseOrderService = new PurchaseOrderService();

// Export default for backward compatibility
export default purchaseOrderService;
