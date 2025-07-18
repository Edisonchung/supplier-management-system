// src/services/tracking/TrackingServices.js
// 🔥 ENHANCED VERSION: Your existing business logic + Firestore capabilities

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import toast from 'react-hot-toast';

// 🔥 NEW: Storage abstraction layer
class TrackingStorage {
  static getDataSource() {
    return localStorage.getItem('dataSource') || 'localStorage';
  }
  
  static async saveDeliveryTracking(poId, data) {
    if (this.getDataSource() === 'firestore') {
      try {
        // Check if document exists
        const q = query(collection(db, 'deliveryTracking'), where('poId', '==', poId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Update existing document
          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
          return { success: true, id: docRef.id };
        } else {
          // Create new document
          const docRef = await addDoc(collection(db, 'deliveryTracking'), {
            poId,
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          return { success: true, id: docRef.id };
        }
      } catch (error) {
        console.error('Firestore delivery tracking save error:', error);
        return { success: false, error: error.message };
      }
    } else {
      // localStorage fallback
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
  }
  
  static async savePaymentTracking(supplierId, data) {
    if (this.getDataSource() === 'firestore') {
      try {
        // Check if document exists
        const q = query(collection(db, 'paymentTracking'), where('supplierId', '==', supplierId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Update existing document
          const docRef = querySnapshot.docs[0].ref;
          await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
          });
          return { success: true, id: docRef.id };
        } else {
          // Create new document
          const docRef = await addDoc(collection(db, 'paymentTracking'), {
            supplierId,
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          return { success: true, id: docRef.id };
        }
      } catch (error) {
        console.error('Firestore payment tracking save error:', error);
        return { success: false, error: error.message };
      }
    } else {
      // localStorage fallback
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
}

/**
 * Delivery Tracking Service
 * 🔥 ENHANCED: Your existing business logic + Firestore capabilities
 */
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
  
  /**
   * Create initial delivery tracking for a PO with selected suppliers
   * 🔥 ENHANCED: Now saves to Firestore or localStorage automatically
   */
  static async initializeDeliveryTracking(purchaseOrder, updateDeliveryStatusFn) {
    try {
      if (!purchaseOrder.supplierSelections) {
        throw new Error('No suppliers selected for this PO');
      }
      
      // Group items by supplier (keeping your existing logic)
      const supplierGroups = this.groupItemsBySupplier(purchaseOrder);
      
      // Calculate estimated delivery dates based on suppliers (keeping your existing logic)
      const estimatedDelivery = this.calculateEstimatedDelivery(supplierGroups);
      
      const deliveryTrackingData = {
        poId: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        clientName: purchaseOrder.clientName,
        status: this.DELIVERY_STATUSES.preparing,
        
        // Supplier breakdown
        supplierGroups,
        totalSuppliers: Object.keys(supplierGroups).length,
        
        // Timeline
        createdAt: new Date().toISOString(),
        estimatedDelivery,
        actualDelivery: null,
        
        // Progress tracking
        milestones: [
          {
            status: 'preparing',
            timestamp: new Date().toISOString(),
            note: 'Order received, preparing for shipment'
          }
        ],
        
        // Shipment details
        trackingNumbers: {},
        carriers: {},
        
        // Consolidation status
        consolidationRequired: Object.keys(supplierGroups).length > 1,
        consolidationStatus: Object.keys(supplierGroups).length > 1 ? 'pending' : 'not_required',
        
        // Metrics
        metrics: {
          totalItems: purchaseOrder.items?.length || 0,
          totalValue: purchaseOrder.totalAmount || 0,
          leadTime: null,
          onTimeDelivery: null
        },
        
        // 🔥 NEW: Real-time collaboration metadata
        lastUpdatedBy: 'system',
        dataSource: TrackingStorage.getDataSource(),
        version: 1
      };
      
      // 🔥 ENHANCED: Save to Firestore or localStorage
      const saveResult = await TrackingStorage.saveDeliveryTracking(purchaseOrder.id, deliveryTrackingData);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save delivery tracking');
      }
      
      // Call the update function for real-time UI updates
      if (updateDeliveryStatusFn) {
        await updateDeliveryStatusFn(purchaseOrder.id, deliveryTrackingData);
      }
      
      console.log('✅ Delivery tracking initialized:', saveResult);
      
      return { success: true, data: deliveryTrackingData, firestoreId: saveResult.id };
      
    } catch (error) {
      console.error('Error initializing delivery tracking:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update delivery status with validation and business logic
   * 🔥 ENHANCED: Now supports real-time Firestore updates
   */
  static async updateDeliveryStatus(poId, currentData, newStatus, additionalData, updateFn) {
    try {
      // Validate status transition (keeping your existing logic)
      const canTransition = this.validateStatusTransition(currentData?.status, newStatus);
      if (!canTransition) {
        throw new Error(`Cannot transition from ${currentData?.status} to ${newStatus}`);
      }
      
      // Prepare update data (keeping your existing logic)
      const updates = {
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: additionalData?.updatedBy || 'system',
        version: (currentData?.version || 1) + 1,
        ...additionalData
      };
      
      // Add milestone (keeping your existing logic)
      const newMilestone = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        note: this.getStatusNote(newStatus),
        updatedBy: additionalData?.updatedBy || 'system',
        ...additionalData
      };
      
      updates.milestones = [
        ...(currentData?.milestones || []),
        newMilestone
      ];
      
      // Handle status-specific logic (keeping your existing logic)
      switch (newStatus) {
        case this.DELIVERY_STATUSES.shipped:
          if (additionalData.trackingNumber && additionalData.carrier) {
            updates.trackingNumbers = {
              ...currentData?.trackingNumbers,
              [additionalData.supplierId || 'default']: additionalData.trackingNumber
            };
            updates.carriers = {
              ...currentData?.carriers,
              [additionalData.supplierId || 'default']: additionalData.carrier
            };
          }
          updates.shippedAt = new Date().toISOString();
          break;
          
        case this.DELIVERY_STATUSES.delivered:
          updates.actualDelivery = new Date().toISOString();
          updates.metrics = {
            ...currentData?.metrics,
            leadTime: this.calculateLeadTime(currentData?.createdAt, new Date().toISOString()),
            onTimeDelivery: this.isOnTimeDelivery(currentData?.estimatedDelivery, new Date().toISOString())
          };
          break;
          
        case this.DELIVERY_STATUSES.completed:
          updates.completedAt = new Date().toISOString();
          break;
      }
      
      // 🔥 ENHANCED: Save to Firestore or localStorage
      const saveResult = await TrackingStorage.saveDeliveryTracking(poId, {
        ...currentData,
        ...updates
      });
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save delivery update');
      }
      
      // Call the update function for real-time UI updates
      if (updateFn) {
        await updateFn(poId, updates);
      }
      
      // Send notifications (keeping your existing logic)
      this.sendDeliveryNotification(newStatus, updates);
      
      console.log('✅ Delivery status updated:', { poId, newStatus, firestoreId: saveResult.id });
      
      return { success: true, data: updates };
      
    } catch (error) {
      console.error('Error updating delivery status:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Handle multi-supplier consolidation logic
   * 🔥 ENHANCED: Now supports real-time updates across devices
   */
  static async updateSupplierDeliveryStatus(poId, supplierId, status, currentData, updateFn) {
    try {
      const supplierGroups = currentData?.supplierGroups || {};
      
      if (!supplierGroups[supplierId]) {
        throw new Error('Supplier not found in this PO');
      }
      
      // Update individual supplier status (keeping your existing logic)
      supplierGroups[supplierId].deliveryStatus = status;
      supplierGroups[supplierId].lastUpdated = new Date().toISOString();
      
      // Check if all suppliers have delivered (keeping your existing logic)
      const allDelivered = Object.values(supplierGroups).every(
        supplier => supplier.deliveryStatus === 'delivered'
      );
      
      // Determine overall status (keeping your existing logic)
      let overallStatus = currentData.status;
      if (allDelivered && currentData.consolidationRequired) {
        overallStatus = this.DELIVERY_STATUSES.delivered;
      } else if (status === 'shipped' && overallStatus === 'preparing') {
        overallStatus = this.DELIVERY_STATUSES.shipped;
      }
      
      const updates = {
        supplierGroups,
        status: overallStatus,
        consolidationStatus: allDelivered ? 'completed' : 'in_progress',
        lastUpdated: new Date().toISOString(),
        version: (currentData?.version || 1) + 1
      };
      
      // 🔥 ENHANCED: Save to Firestore or localStorage
      const saveResult = await TrackingStorage.saveDeliveryTracking(poId, {
        ...currentData,
        ...updates
      });
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save supplier delivery update');
      }
      
      // Call the update function for real-time UI updates
      if (updateFn) {
        await updateFn(poId, updates);
      }
      
      console.log('✅ Supplier delivery status updated:', { poId, supplierId, status });
      
      return { success: true, data: updates };
      
    } catch (error) {
      console.error('Error updating supplier delivery status:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Keep all your existing utility methods unchanged
  static calculateEstimatedDelivery(supplierGroups) {
    const leadTimes = Object.values(supplierGroups).map(group => group.leadTime || 7);
    const maxLeadTime = Math.max(...leadTimes);
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + maxLeadTime);
    
    return estimatedDate.toISOString();
  }
  
  static groupItemsBySupplier(purchaseOrder) {
    const groups = {};
    
    if (!purchaseOrder.supplierSelections || !purchaseOrder.items) {
      return groups;
    }
    
    Object.entries(purchaseOrder.supplierSelections).forEach(([itemNumber, supplierId]) => {
      const item = purchaseOrder.items.find(i => i.itemNumber === parseInt(itemNumber));
      
      if (item) {
        if (!groups[supplierId]) {
          groups[supplierId] = {
            supplierId,
            items: [],
            totalValue: 0,
            deliveryStatus: 'preparing',
            leadTime: 7 // Default lead time
          };
        }
        
        groups[supplierId].items.push(item);
        groups[supplierId].totalValue += (item.price || 0) * (item.quantity || 1);
      }
    });
    
    return groups;
  }
  
  static validateStatusTransition(currentStatus, newStatus) {
    if (!currentStatus) return true; // Initial status
    
    const currentIndex = this.STATUS_FLOW.indexOf(currentStatus);
    const newIndex = this.STATUS_FLOW.indexOf(newStatus);
    
    // Allow moving forward or staying the same
    return newIndex >= currentIndex;
  }
  
  static getStatusNote(status) {
    const notes = {
      preparing: 'Order received, preparing for shipment',
      shipped: 'Package has been shipped',
      in_transit: 'Package is in transit',
      delivered: 'Package has been delivered',
      completed: 'Delivery completed and confirmed'
    };
    
    return notes[status] || 'Status updated';
  }
  
  static calculateLeadTime(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  static isOnTimeDelivery(estimatedDate, actualDate) {
    if (!estimatedDate || !actualDate) return null;
    
    return new Date(actualDate) <= new Date(estimatedDate);
  }
  
  static sendDeliveryNotification(status, data) {
    const messages = {
      shipped: `📦 Order ${data.poNumber || ''} has been shipped`,
      delivered: `✅ Order ${data.poNumber || ''} has been delivered`,
      completed: `🎉 Order ${data.poNumber || ''} is complete`
    };
    
    if (messages[status]) {
      toast.success(messages[status]);
    }
  }
}

/**
 * Payment Tracking Service
 * 🔥 ENHANCED: Your existing business logic + Firestore capabilities
 */
export class PaymentTrackingService {
  
  static PAYMENT_STATUSES = {
    pending: 'pending',
    processing: 'processing',
    paid: 'paid',
    overdue: 'overdue',
    partial: 'partial'
  };
  
  /**
   * Initialize payment tracking for selected suppliers
   * 🔥 ENHANCED: Now saves to Firestore or localStorage automatically
   */
  static async initializePaymentTracking(purchaseOrder, updatePaymentStatusFn) {
    try {
      if (!purchaseOrder.supplierSelections) {
        throw new Error('No suppliers selected for this PO');
      }
      
      const supplierGroups = DeliveryTrackingService.groupItemsBySupplier(purchaseOrder);
      
      const paymentPromises = Object.entries(supplierGroups).map(async ([supplierId, group]) => {
        const paymentData = {
          poId: purchaseOrder.id,
          poNumber: purchaseOrder.poNumber,
          supplierId,
          
          // Financial details
          amount: group.totalValue,
          paidAmount: 0,
          remainingAmount: group.totalValue,
          currency: 'USD', // Default currency
          
          // Status tracking
          status: this.PAYMENT_STATUSES.pending,
          
          // Timeline
          createdAt: new Date().toISOString(),
          dueDate: this.calculateDueDate(purchaseOrder.paymentTerms),
          lastPaymentDate: null,
          
          // Payment details
          paymentMethod: null,
          bankReference: null,
          invoiceReference: null,
          
          // Items covered by this payment
          items: group.items.map(item => ({
            itemNumber: item.itemNumber,
            productName: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: (item.price || 0) * (item.quantity || 1)
          })),
          
          // Payment history
          paymentHistory: [],
          
          // Profit calculation
          clientPayment: this.calculateClientPayment(group.items, purchaseOrder),
          profitMargin: 0,
          profitAmount: 0,
          
          // 🔥 NEW: Real-time collaboration metadata
          lastUpdatedBy: 'system',
          dataSource: TrackingStorage.getDataSource(),
          version: 1
        };
        
        // Calculate profit margins (keeping your existing logic)
        this.calculateProfitMetrics(paymentData);
        
        // 🔥 ENHANCED: Save to Firestore or localStorage
        const saveResult = await TrackingStorage.savePaymentTracking(supplierId, paymentData);
        
        if (!saveResult.success) {
          throw new Error(saveResult.error || 'Failed to save payment tracking');
        }
        
        // Call the update function for real-time UI updates
        if (updatePaymentStatusFn) {
          await updatePaymentStatusFn(supplierId, paymentData);
        }
        
        console.log('✅ Payment tracking initialized for supplier:', supplierId);
        
        return { ...paymentData, firestoreId: saveResult.id };
      });
      
      const results = await Promise.all(paymentPromises);
      
      return { success: true, data: results };
      
    } catch (error) {
      console.error('Error initializing payment tracking:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Record a payment for a supplier
   * 🔥 ENHANCED: Now supports real-time Firestore updates
   */
  static async recordPayment(supplierId, paymentAmount, paymentDetails, currentData, updateFn) {
    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid payment amount');
      }
      
      if (amount > currentData.remainingAmount) {
        throw new Error('Payment amount exceeds remaining balance');
      }
      
      const newPaidAmount = currentData.paidAmount + amount;
      const newRemainingAmount = currentData.amount - newPaidAmount;
      
      // Determine new status (keeping your existing logic)
      let newStatus;
      if (newRemainingAmount === 0) {
        newStatus = this.PAYMENT_STATUSES.paid;
      } else if (newPaidAmount > 0) {
        newStatus = this.PAYMENT_STATUSES.partial;
      } else {
        newStatus = this.PAYMENT_STATUSES.pending;
      }
      
      // Check for overdue status (keeping your existing logic)
      if (newStatus !== this.PAYMENT_STATUSES.paid && this.isOverdue(currentData.dueDate)) {
        newStatus = this.PAYMENT_STATUSES.overdue;
      }
      
      // Create payment record (keeping your existing logic)
      const paymentRecord = {
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        date: new Date().toISOString(),
        method: paymentDetails.method || 'bank_transfer',
        reference: paymentDetails.reference || '',
        bankReference: paymentDetails.bankReference || '',
        notes: paymentDetails.notes || '',
        recordedBy: paymentDetails.recordedBy || 'system'
      };
      
      const updates = {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        status: newStatus,
        lastPaymentDate: new Date().toISOString(),
        paymentHistory: [
          ...currentData.paymentHistory,
          paymentRecord
        ],
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: paymentDetails.recordedBy || 'system',
        version: (currentData?.version || 1) + 1
      };
      
      // Update profit calculations (keeping your existing logic)
      this.calculateProfitMetrics({ ...currentData, ...updates });
      
      // 🔥 ENHANCED: Save to Firestore or localStorage
      const saveResult = await TrackingStorage.savePaymentTracking(supplierId, {
        ...currentData,
        ...updates
      });
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save payment record');
      }
      
      // Call the update function for real-time UI updates
      if (updateFn) {
        await updateFn(supplierId, updates);
      }
      
      // Send notification (keeping your existing logic)
      this.sendPaymentNotification(newStatus, updates, currentData);
      
      console.log('✅ Payment recorded:', { supplierId, amount, newStatus });
      
      return { success: true, data: updates, paymentRecord };
      
    } catch (error) {
      console.error('Error recording payment:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update payment status manually
   * 🔥 ENHANCED: Now supports real-time Firestore updates
   */
  static async updatePaymentStatus(supplierId, newStatus, currentData, updateFn) {
    try {
      // Validate status change (keeping your existing logic)
      if (!Object.values(this.PAYMENT_STATUSES).includes(newStatus)) {
        throw new Error('Invalid payment status');
      }
      
      const updates = {
        status: newStatus,
        lastUpdated: new Date().toISOString(),
        lastUpdatedBy: 'system',
        version: (currentData?.version || 1) + 1
      };
      
      // Handle status-specific logic (keeping your existing logic)
      switch (newStatus) {
        case this.PAYMENT_STATUSES.processing:
          updates.processingStarted = new Date().toISOString();
          break;
          
        case this.PAYMENT_STATUSES.paid:
          if (currentData.remainingAmount > 0) {
            // Mark as fully paid
            updates.paidAmount = currentData.amount;
            updates.remainingAmount = 0;
            updates.lastPaymentDate = new Date().toISOString();
            
            // Add automatic payment record
            const autoPaymentRecord = {
              id: `auto_payment_${Date.now()}`,
              amount: currentData.remainingAmount,
              date: new Date().toISOString(),
              method: 'manual_entry',
              reference: 'Manual status update to paid',
              notes: 'Automatically recorded when status set to paid',
              recordedBy: 'system'
            };
            
            updates.paymentHistory = [
              ...currentData.paymentHistory,
              autoPaymentRecord
            ];
          }
          break;
      }
      
      // 🔥 ENHANCED: Save to Firestore or localStorage
      const saveResult = await TrackingStorage.savePaymentTracking(supplierId, {
        ...currentData,
        ...updates
      });
      
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'Failed to save payment status update');
      }
      
      // Call the update function for real-time UI updates
      if (updateFn) {
        await updateFn(supplierId, updates);
      }
      
      console.log('✅ Payment status updated:', { supplierId, newStatus });
      
      return { success: true, data: updates };
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Keep all your existing utility methods unchanged
  static calculateDueDate(paymentTerms) {
    const dueDate = new Date();
    
    if (paymentTerms) {
      // Parse payment terms (e.g., "NET 30", "15 days", etc.)
      const terms = paymentTerms.toLowerCase();
      let days = 30; // Default
      
      if (terms.includes('net')) {
        const match = terms.match(/net\s*(\d+)/);
        if (match) days = parseInt(match[1]);
      } else if (terms.includes('day')) {
        const match = terms.match(/(\d+)\s*day/);
        if (match) days = parseInt(match[1]);
      }
      
      dueDate.setDate(dueDate.getDate() + days);
    } else {
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
    }
    
    return dueDate.toISOString();
  }
  
  static calculateClientPayment(items, purchaseOrder) {
    // This would typically come from the client invoice
    // For now, estimate based on markup
    const supplierTotal = items.reduce((sum, item) => 
      sum + ((item.price || 0) * (item.quantity || 1)), 0
    );
    
    // Assume 20% markup as default
    const markup = 1.2;
    return supplierTotal * markup;
  }
  
  static calculateProfitMetrics(paymentData) {
    const supplierCost = paymentData.amount;
    const clientRevenue = paymentData.clientPayment || 0;
    
    paymentData.profitAmount = clientRevenue - supplierCost;
    paymentData.profitMargin = clientRevenue > 0 ? 
      ((paymentData.profitAmount / clientRevenue) * 100) : 0;
  }
  
  static isOverdue(dueDate) {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  }
  
  static getPaymentsRequiringAttention(paymentTrackingData) {
    const now = new Date();
    const in3Days = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    return Object.entries(paymentTrackingData)
      .map(([supplierId, data]) => ({ supplierId, ...data }))
      .filter(payment => {
        if (payment.status === this.PAYMENT_STATUSES.paid) return false;
        
        const dueDate = new Date(payment.dueDate);
        return dueDate < now || // Overdue
               (dueDate < in3Days && payment.status === this.PAYMENT_STATUSES.pending); // Due soon
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }
  
  static calculatePaymentStatistics(paymentTrackingData) {
    const payments = Object.values(paymentTrackingData);
    
    const stats = {
      total: payments.length,
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
    
    let totalPaymentDays = 0;
    let completedPayments = 0;
    let onTimePayments = 0;
    
    payments.forEach(payment => {
      stats.totalAmount += payment.amount || 0;
      stats.paidAmount += payment.paidAmount || 0;
      stats.outstandingAmount += payment.remainingAmount || 0;
      stats.profitAmount += payment.profitAmount || 0;
      
      stats.byStatus[payment.status]++;
      
      if (payment.status === this.PAYMENT_STATUSES.paid) {
        completedPayments++;
        
        if (payment.lastPaymentDate && payment.dueDate) {
          const paymentDate = new Date(payment.lastPaymentDate);
          const dueDate = new Date(payment.dueDate);
          const daysTaken = Math.ceil((paymentDate - new Date(payment.createdAt)) / (1000 * 60 * 60 * 24));
          
          totalPaymentDays += daysTaken;
          
          if (paymentDate <= dueDate) {
            onTimePayments++;
          }
        }
      }
      
      if (this.isOverdue(payment.dueDate) && payment.status !== this.PAYMENT_STATUSES.paid) {
        stats.overduePayments.push(payment);
      }
      
      // Due in next 7 days
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      if (new Date(payment.dueDate) <= weekFromNow && payment.status === this.PAYMENT_STATUSES.pending) {
        stats.dueSoonPayments.push(payment);
      }
    });
    
    stats.averagePaymentTime = completedPayments > 0 ? 
      Math.round(totalPaymentDays / completedPayments) : 0;
      
    stats.onTimePaymentRate = completedPayments > 0 ? 
      Math.round((onTimePayments / completedPayments) * 100) : 0;
    
    return stats;
  }
  
  static sendPaymentNotification(status, updates, originalData) {
    const messages = {
      paid: `💰 Payment completed for supplier ${originalData.supplierId}`,
      partial: `📝 Partial payment recorded for supplier ${originalData.supplierId}`,
      overdue: `⚠️ Payment overdue for supplier ${originalData.supplierId}`,
      processing: `🔄 Payment processing for supplier ${originalData.supplierId}`
    };
    
    if (messages[status]) {
      toast.success(messages[status]);
    }
  }
  
  static generatePaymentReport(paymentTrackingData) {
    const stats = this.calculatePaymentStatistics(paymentTrackingData);
    const payments = Object.entries(paymentTrackingData).map(([supplierId, data]) => ({
      supplierId,
      ...data
    }));
    
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
      
      detailedPayments: payments,
      
      generatedAt: new Date().toISOString()
    };
  }
}

/**
 * Consolidated Tracking Service
 * 🔥 ENHANCED: Your existing coordination logic + Firestore capabilities
 */
export class ConsolidatedTrackingService {
  
  /**
   * Initialize complete tracking for a PO after supplier selection
   * 🔥 ENHANCED: Now supports real-time Firestore updates
   */
  static async initializeCompleteTracking(purchaseOrder, updateDeliveryFn, updatePaymentFn) {
    try {
      console.log('🚀 Initializing complete tracking for PO:', purchaseOrder.poNumber);
      console.log('📊 Data source:', TrackingStorage.getDataSource());
      
      const results = await Promise.all([
        DeliveryTrackingService.initializeDeliveryTracking(purchaseOrder, updateDeliveryFn),
        PaymentTrackingService.initializePaymentTracking(purchaseOrder, updatePaymentFn)
      ]);
      
      const [deliveryResult, paymentResult] = results;
      
      if (!deliveryResult.success || !paymentResult.success) {
        throw new Error('Failed to initialize tracking systems');
      }
      
      // 🔥 NEW: Enhanced success message with data source info
      const dataSource = TrackingStorage.getDataSource();
      const message = dataSource === 'firestore' 
        ? '🔥 Real-time tracking system initialized!' 
        : '💾 Tracking system initialized locally!';
      
      toast.success(message);
      
      console.log('✅ Complete tracking initialized:', {
        delivery: deliveryResult.success,
        payment: paymentResult.success,
        dataSource,
        deliverySuppliers: Object.keys(deliveryResult.data?.supplierGroups || {}).length,
        paymentSuppliers: paymentResult.data?.length || 0
      });
      
      return {
        success: true,
        data: {
          delivery: deliveryResult.data,
          payment: paymentResult.data
        },
        message: `Tracking initialized with ${dataSource} - ${Object.keys(deliveryResult.data?.supplierGroups || {}).length} suppliers`
      };
      
    } catch (error) {
      console.error('Error initializing complete tracking:', error);
      toast.error('Failed to initialize tracking system');
      return { success: false, error: error.message };
    }
  }
  
  // Keep all your existing methods unchanged
  static getDashboardData(purchaseOrders, deliveryTracking, paymentTracking) {
    const activeOrders = purchaseOrders.filter(po => po.supplierSelections);
    
    const deliveryStats = {
      total: activeOrders.length,
      preparing: 0,
      shipped: 0,
      in_transit: 0,
      delivered: 0,
      completed: 0,
      overdue: 0
    };
    
    const paymentStats = PaymentTrackingService.calculatePaymentStatistics(paymentTracking);
    
    // Calculate delivery stats
    activeOrders.forEach(po => {
      const delivery = deliveryTracking[po.id];
      const status = delivery?.status || 'preparing';
      deliveryStats[status]++;
      
      if (delivery?.estimatedDelivery) {
        const isOverdue = new Date(delivery.estimatedDelivery) < new Date() && status !== 'completed';
        if (isOverdue) deliveryStats.overdue++;
      }
    });
    
    // Calculate efficiency metrics
    const completionRate = deliveryStats.total > 0 ? 
      (deliveryStats.completed / deliveryStats.total) * 100 : 0;
      
    const paymentCompletionRate = paymentStats.total > 0 ?
      (paymentStats.byStatus.paid / paymentStats.total) * 100 : 0;
    
    return {
      summary: {
        totalActiveOrders: activeOrders.length,
        deliveryCompletionRate: Math.round(completionRate),
        paymentCompletionRate: Math.round(paymentCompletionRate),
        totalValue: paymentStats.totalAmount,
        profitAmount: paymentStats.profitAmount,
        overdueItems: deliveryStats.overdue + paymentStats.byStatus.overdue,
        // 🔥 NEW: Real-time status
        dataSource: TrackingStorage.getDataSource(),
        lastSync: new Date().toISOString()
      },
      
      delivery: deliveryStats,
      payment: paymentStats,
      
      urgentItems: {
        overdueDeliveries: activeOrders.filter(po => {
          const delivery = deliveryTracking[po.id];
          return delivery?.estimatedDelivery && 
                 new Date(delivery.estimatedDelivery) < new Date() && 
                 delivery.status !== 'completed';
        }),
        
        overduePayments: paymentStats.overduePayments,
        dueSoonPayments: paymentStats.dueSoonPayments
      }
    };
  }
  
  static generateComprehensiveReport(purchaseOrders, deliveryTracking, paymentTracking) {
    const dashboardData = this.getDashboardData(purchaseOrders, deliveryTracking, paymentTracking);
    const paymentReport = PaymentTrackingService.generatePaymentReport(paymentTracking);
    
    return {
      reportMetadata: {
        title: 'HiggsFlow Comprehensive Tracking Report',
        generatedAt: new Date().toISOString(),
        dataSource: TrackingStorage.getDataSource(),
        period: {
          from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          to: new Date().toISOString()
        }
      },
      
      executive_summary: dashboardData.summary,
      
      delivery_tracking: {
        overview: dashboardData.delivery,
        active_orders: purchaseOrders.filter(po => po.supplierSelections).map(po => ({
          poNumber: po.poNumber,
          client: po.clientName,
          status: deliveryTracking[po.id]?.status || 'preparing',
          estimatedDelivery: deliveryTracking[po.id]?.estimatedDelivery,
          value: po.totalAmount
        }))
      },
      
      payment_tracking: paymentReport,
      
      performance_metrics: {
        delivery_performance: {
          completion_rate: dashboardData.summary.deliveryCompletionRate,
          average_lead_time: 'TBD', // Would calculate from completed deliveries
          on_time_delivery_rate: 'TBD'
        },
        
        payment_performance: {
          completion_rate: dashboardData.summary.paymentCompletionRate,
          average_payment_time: paymentReport.summary.averagePaymentTime,
          on_time_payment_rate: paymentReport.summary.onTimePaymentRate
        }
      },
      
      urgent_actions: {
        overdue_deliveries: dashboardData.urgentItems.overdueDeliveries.length,
        overdue_payments: dashboardData.urgentItems.overduePayments.length,
        due_soon_payments: dashboardData.urgentItems.dueSoonPayments.length
      }
    };
  }
}
