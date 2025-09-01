// src/services/tracking/TrackingServices.js
// EMERGENCY BUILD-SAFE VERSION - All problematic methods temporarily simplified

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

// Simplified storage abstraction
class TrackingStorage {
  static getDataSource() {
    return 'localStorage';
  }
  
  static async saveDeliveryTracking(poId, data) {
    try {
      const existing = JSON.parse(localStorage.getItem('higgsflow_deliveryTracking') || '{}');
      existing[poId] = {
        ...data,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('higgsflow_deliveryTracking', JSON.stringify(existing));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  static async savePaymentTracking(supplierId, data) {
    try {
      const existing = JSON.parse(localStorage.getItem('higgsflow_paymentTracking') || '{}');
      existing[supplierId] = {
        ...data,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('higgsflow_paymentTracking', JSON.stringify(existing));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

export class DeliveryTrackingService {
  
  static DELIVERY_STATUSES = {
    preparing: 'preparing',
    shipped: 'shipped',
    in_transit: 'in_transit',
    delivered: 'delivered',
    completed: 'completed'
  };
  
  static STATUS_FLOW = [
    'preparing',
    'shipped', 
    'in_transit',
    'delivered',
    'completed'
  ];
  
  static async initializeDeliveryTracking(purchaseOrder, updateDeliveryStatusFn) {
    console.log('Delivery tracking initialized (safe mode)');
    
    // Create safe tracking data structure
    const trackingData = {
      poId: purchaseOrder?.id || 'unknown',
      status: 'preparing',
      supplierGroups: this.groupItemsBySupplier(purchaseOrder),
      estimatedDelivery: this.calculateEstimatedDelivery([]),
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Save to storage
    const saveResult = await TrackingStorage.saveDeliveryTracking(trackingData.poId, trackingData);
    
    if (saveResult.success) {
      toast.success('Delivery tracking initialized');
      return { 
        success: true, 
        data: trackingData
      };
    } else {
      toast.error('Failed to initialize tracking');
      return { 
        success: false, 
        error: saveResult.error,
        data: trackingData // Return data anyway for safe mode
      };
    }
  }
  
  static async updateDeliveryStatus(poId, currentData, newStatus, additionalData, updateFn) {
    console.log('Delivery status updated (safe mode)', { poId, newStatus });
    
    const updatedData = {
      ...currentData,
      status: newStatus,
      lastUpdated: new Date().toISOString(),
      ...additionalData
    };
    
    await TrackingStorage.saveDeliveryTracking(poId, updatedData);
    
    if (updateFn) {
      try {
        updateFn(updatedData);
      } catch (error) {
        console.warn('Update function failed:', error);
      }
    }
    
    toast.success(`Delivery status updated to ${newStatus}`);
    return { success: true, data: updatedData };
  }
  
  static async updateSupplierDeliveryStatus(poId, supplierId, status, currentData, updateFn) {
    console.log('Supplier delivery status updated (safe mode)', { poId, supplierId, status });
    
    const updatedData = {
      ...currentData,
      supplierGroups: {
        ...currentData.supplierGroups,
        [supplierId]: {
          ...currentData.supplierGroups?.[supplierId],
          status: status,
          lastUpdated: new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };
    
    await TrackingStorage.saveDeliveryTracking(poId, updatedData);
    
    if (updateFn) {
      try {
        updateFn(updatedData);
      } catch (error) {
        console.warn('Update function failed:', error);
      }
    }
    
    return { success: true, data: updatedData };
  }
  
  static calculateEstimatedDelivery(supplierGroups) {
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + 7); // Default 7-day estimate
    return estimatedDate.toISOString();
  }
  
  static groupItemsBySupplier(purchaseOrder) {
    if (!purchaseOrder?.items) {
      return {};
    }
    
    const groups = {};
    purchaseOrder.items.forEach(item => {
      const supplierId = item.supplierId || item.selectedSupplier || 'unknown';
      if (!groups[supplierId]) {
        groups[supplierId] = {
          supplierId,
          items: [],
          status: 'preparing',
          estimatedDelivery: this.calculateEstimatedDelivery([])
        };
      }
      groups[supplierId].items.push(item);
    });
    
    return groups;
  }
  
  static validateStatusTransition(currentStatus, newStatus) {
    const currentIndex = this.STATUS_FLOW.indexOf(currentStatus);
    const newIndex = this.STATUS_FLOW.indexOf(newStatus);
    
    // Allow any transition for flexibility in safe mode
    return newIndex >= currentIndex || newIndex === 0;
  }
  
  static getStatusNote(status) {
    const notes = {
      preparing: 'Order is being prepared for shipment',
      shipped: 'Package has been dispatched',
      in_transit: 'Package is in transit',
      delivered: 'Package has been delivered',
      completed: 'Delivery completed and confirmed'
    };
    return notes[status] || `Status updated to ${status}`;
  }
  
  static calculateLeadTime(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
  }
  
  static isOnTimeDelivery(estimatedDate, actualDate) {
    return new Date(actualDate) <= new Date(estimatedDate);
  }
  
  static sendDeliveryNotification(status, data) {
    console.log(`Delivery notification: ${status}`, data);
    // In safe mode, just log notifications
  }
}

export class PaymentTrackingService {
  
  static PAYMENT_STATUSES = {
    pending: 'pending',
    processing: 'processing',
    paid: 'paid',
    overdue: 'overdue',
    partial: 'partial'
  };
  
  static async initializePaymentTracking(purchaseOrder, updatePaymentStatusFn) {
    console.log('Payment tracking initialized (safe mode)');
    
    if (!purchaseOrder?.items) {
      return { success: true, data: [] };
    }
    
    // Create payment tracking entries for each supplier
    const paymentData = [];
    const supplierGroups = DeliveryTrackingService.groupItemsBySupplier(purchaseOrder);
    
    Object.keys(supplierGroups).forEach(supplierId => {
      const group = supplierGroups[supplierId];
      const totalAmount = group.items.reduce((sum, item) => 
        sum + (item.quantity * item.unitPrice), 0);
      
      const paymentEntry = {
        supplierId,
        poId: purchaseOrder.id,
        status: 'pending',
        totalAmount,
        paidAmount: 0,
        outstandingAmount: totalAmount,
        dueDate: this.calculateDueDate(purchaseOrder.paymentTerms),
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        items: group.items
      };
      
      paymentData.push(paymentEntry);
    });
    
    // Save to storage
    for (const payment of paymentData) {
      await TrackingStorage.savePaymentTracking(payment.supplierId, payment);
    }
    
    toast.success('Payment tracking initialized');
    return { success: true, data: paymentData };
  }
  
  static async recordPayment(supplierId, paymentAmount, paymentDetails, currentData, updateFn) {
    console.log('Payment recorded (safe mode)', { supplierId, paymentAmount });
    
    const updatedData = {
      ...currentData,
      paidAmount: (currentData.paidAmount || 0) + paymentAmount,
      outstandingAmount: (currentData.totalAmount || 0) - ((currentData.paidAmount || 0) + paymentAmount),
      lastUpdated: new Date().toISOString(),
      payments: [
        ...(currentData.payments || []),
        {
          id: Date.now().toString(),
          amount: paymentAmount,
          date: new Date().toISOString(),
          ...paymentDetails
        }
      ]
    };
    
    // Update status based on payment
    if (updatedData.outstandingAmount <= 0) {
      updatedData.status = 'paid';
    } else if (updatedData.paidAmount > 0) {
      updatedData.status = 'partial';
    }
    
    await TrackingStorage.savePaymentTracking(supplierId, updatedData);
    
    if (updateFn) {
      try {
        updateFn(updatedData);
      } catch (error) {
        console.warn('Update function failed:', error);
      }
    }
    
    const paymentRecord = {
      id: Date.now().toString(),
      supplierId,
      amount: paymentAmount,
      date: new Date().toISOString(),
      ...paymentDetails
    };
    
    toast.success(`Payment of $${paymentAmount} recorded`);
    return { success: true, data: updatedData, paymentRecord };
  }
  
  static async updatePaymentStatus(supplierId, newStatus, currentData, updateFn) {
    console.log('Payment status updated (safe mode)', { supplierId, newStatus });
    
    const updatedData = {
      ...currentData,
      status: newStatus,
      lastUpdated: new Date().toISOString()
    };
    
    await TrackingStorage.savePaymentTracking(supplierId, updatedData);
    
    if (updateFn) {
      try {
        updateFn(updatedData);
      } catch (error) {
        console.warn('Update function failed:', error);
      }
    }
    
    return { success: true, data: updatedData };
  }
  
  static calculateDueDate(paymentTerms) {
    const dueDate = new Date();
    const days = paymentTerms === '30D' ? 30 : 
                 paymentTerms === '60D' ? 60 : 
                 paymentTerms === '90D' ? 90 : 30;
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString();
  }
  
  static calculateClientPayment(items, purchaseOrder) {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const supplierPrice = item.quantity * (item.unitPrice || 0);
      const markup = purchaseOrder?.markupPercentage || 20;
      const clientPrice = supplierPrice * (1 + markup / 100);
      return total + clientPrice;
    }, 0);
  }
  
  static calculateProfitMetrics(paymentData) {
    if (!paymentData) return;
    
    const supplierCost = paymentData.totalAmount || 0;
    const clientRevenue = paymentData.clientAmount || supplierCost * 1.2; // Default 20% markup
    
    paymentData.profitAmount = Math.max(0, clientRevenue - supplierCost);
    paymentData.profitMargin = supplierCost > 0 ? 
      ((clientRevenue - supplierCost) / clientRevenue * 100) : 0;
  }
  
  static isOverdue(dueDate) {
    return new Date() > new Date(dueDate);
  }
  
  static getPaymentsRequiringAttention(paymentTrackingData) {
    if (!paymentTrackingData || !Array.isArray(paymentTrackingData)) {
      return [];
    }
    
    return paymentTrackingData.filter(payment => 
      payment.status === 'overdue' || 
      (payment.status === 'pending' && this.isOverdue(payment.dueDate))
    );
  }
  
  static calculatePaymentStatistics(paymentTrackingData) {
    if (!paymentTrackingData || !Array.isArray(paymentTrackingData)) {
      return {
        total: 0,
        totalAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0,
        profitAmount: 0,
        byStatus: {
          pending: 0,
          processing: 0,
          paid: 0,
          overdue: 0,
          partial: 0
        },
        averagePaymentTime: 0,
        onTimePaymentRate: 0,
        overduePayments: [],
        dueSoonPayments: []
      };
    }
    
    const stats = {
      total: paymentTrackingData.length,
      totalAmount: 0,
      paidAmount: 0,
      outstandingAmount: 0,
      profitAmount: 0,
      byStatus: {
        pending: 0,
        processing: 0,
        paid: 0,
        overdue: 0,
        partial: 0
      },
      averagePaymentTime: 0,
      onTimePaymentRate: 0,
      overduePayments: [],
      dueSoonPayments: []
    };
    
    paymentTrackingData.forEach(payment => {
      stats.totalAmount += payment.totalAmount || 0;
      stats.paidAmount += payment.paidAmount || 0;
      stats.outstandingAmount += payment.outstandingAmount || 0;
      stats.profitAmount += payment.profitAmount || 0;
      
      const status = payment.status || 'pending';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      if (this.isOverdue(payment.dueDate) && payment.status !== 'paid') {
        stats.overduePayments.push(payment);
      }
      
      // Check if due within 7 days
      const dueDate = new Date(payment.dueDate);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      
      if (dueDate <= sevenDaysFromNow && payment.status !== 'paid') {
        stats.dueSoonPayments.push(payment);
      }
    });
    
    return stats;
  }
  
  static sendPaymentNotification(status, updates, originalData) {
    console.log(`Payment notification: ${status}`, updates);
    // In safe mode, just log notifications
  }
  
  static generatePaymentReport(paymentTrackingData) {
    const stats = this.calculatePaymentStatistics(paymentTrackingData);
    
    return {
      summary: {
        totalSuppliers: stats.total,
        totalAmount: stats.totalAmount,
        paidAmount: stats.paidAmount,
        outstandingAmount: stats.outstandingAmount,
        profitAmount: stats.profitAmount,
        averagePaymentTime: stats.averagePaymentTime,
        onTimePaymentRate: stats.onTimePaymentRate
      },
      statusBreakdown: stats.byStatus,
      overduePayments: stats.overduePayments,
      dueSoonPayments: stats.dueSoonPayments,
      detailedPayments: paymentTrackingData || [],
      generatedAt: new Date().toISOString()
    };
  }
}

export class ConsolidatedTrackingService {
  
  static async initializeCompleteTracking(purchaseOrder, updateDeliveryFn, updatePaymentFn) {
    console.log('Complete tracking initialized (safe mode)');
    
    try {
      // Initialize both delivery and payment tracking
      const [deliveryResult, paymentResult] = await Promise.all([
        DeliveryTrackingService.initializeDeliveryTracking(purchaseOrder, updateDeliveryFn),
        PaymentTrackingService.initializePaymentTracking(purchaseOrder, updatePaymentFn)
      ]);
      
      if (deliveryResult.success && paymentResult.success) {
        toast.success('Complete tracking system initialized');
        return {
          success: true,
          data: {
            delivery: deliveryResult.data,
            payment: paymentResult.data
          },
          message: 'Complete tracking initialized successfully'
        };
      } else {
        throw new Error('Partial initialization failure');
      }
    } catch (error) {
      console.error('Complete tracking initialization error:', error);
      toast.error('Failed to initialize complete tracking');
      
      // Return safe fallback data
      return {
        success: false,
        error: error.message,
        data: {
          delivery: { supplierGroups: {} },
          payment: []
        },
        message: 'Tracking initialized (safe mode for build stability)'
      };
    }
  }
  
  static getDashboardData(purchaseOrders, deliveryTracking, paymentTracking) {
    const summary = {
      totalActiveOrders: purchaseOrders?.length || 0,
      deliveryCompletionRate: 0,
      paymentCompletionRate: 0,
      totalValue: 0,
      profitAmount: 0,
      overdueItems: 0,
      dataSource: TrackingStorage.getDataSource(),
      lastSync: new Date().toISOString()
    };
    
    const delivery = {
      total: 0,
      preparing: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      completed: 0,
      overdue: 0
    };
    
    const payment = PaymentTrackingService.calculatePaymentStatistics(paymentTracking);
    
    const urgentItems = {
      overdueDeliveries: [],
      overduePayments: payment.overduePayments || [],
      dueSoonPayments: payment.dueSoonPayments || []
    };
    
    return {
      summary,
      delivery,
      payment,
      urgentItems
    };
  }
  
  static generateComprehensiveReport(purchaseOrders, deliveryTracking, paymentTracking) {
    const reportMetadata = {
      title: 'HiggsFlow Comprehensive Tracking Report',
      generatedAt: new Date().toISOString(),
      dataSource: TrackingStorage.getDataSource(),
      period: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString()
      }
    };
    
    const executive_summary = {
      totalActiveOrders: purchaseOrders?.length || 0,
      deliveryCompletionRate: 0,
      paymentCompletionRate: 0,
      totalValue: 0
    };
    
    const delivery_tracking = {
      overview: {},
      active_orders: []
    };
    
    const payment_tracking = PaymentTrackingService.generatePaymentReport(paymentTracking);
    
    const performance_metrics = {
      delivery_performance: {
        completion_rate: 0,
        average_lead_time: 'TBD',
        on_time_delivery_rate: 'TBD'
      },
      payment_performance: {
        completion_rate: payment_tracking.summary.onTimePaymentRate,
        average_payment_time: payment_tracking.summary.averagePaymentTime,
        on_time_payment_rate: payment_tracking.summary.onTimePaymentRate
      }
    };
    
    const urgent_actions = {
      overdue_deliveries: 0,
      overdue_payments: payment_tracking.overduePayments?.length || 0,
      due_soon_payments: payment_tracking.dueSoonPayments?.length || 0
    };
    
    return {
      reportMetadata,
      executive_summary,
      delivery_tracking,
      payment_tracking,
      performance_metrics,
      urgent_actions
    };
  }
}
