// Updated SmartNotificationsService.js - Firestore Integration
// Replace your existing file with this version

// Import your existing Firestore service functions
import { 
  getSuppliers, 
  getProducts, 
  getProformaInvoices, 
  getPurchaseOrders,
  getClientInvoices 
} from '../firebase.js';

class SmartNotificationsService {
  static notifications = [];
  static lastEvaluation = null;
  static realisticData = null;
  static isInitialized = false;

  /**
   * Load real procurement data from Firestore instead of localStorage
   */
  static async loadRealProcurementData() {
    try {
      console.log('🔄 Loading real data from Firestore...');
      
      // Load data from Firestore using your existing service functions
      const [suppliersResult, productsResult, piResult, poResult] = await Promise.all([
        getSuppliers(),
        getProducts(), 
        getProformaInvoices(),
        getPurchaseOrders()
      ]);

      // Extract data from results
      const suppliers = suppliersResult.success ? suppliersResult.data : [];
      const products = productsResult.success ? productsResult.data : [];
      const proformaInvoices = piResult.success ? piResult.data : [];
      const purchaseOrders = poResult.success ? poResult.data : [];

      // Try to get client invoices and client POs (if they exist)
      let clientInvoices = [];
      let clientPOs = [];
      
      try {
        const clientInvoicesResult = await getClientInvoices();
        clientInvoices = clientInvoicesResult.success ? clientInvoicesResult.data : [];
      } catch (error) {
        console.log('ℹ️ Client invoices not available:', error.message);
      }

      // Try to get client POs from localStorage as fallback
      try {
        clientPOs = JSON.parse(localStorage.getItem('clientPurchaseOrders') || '[]');
      } catch (error) {
        console.log('ℹ️ Client POs not available in localStorage');
      }

      console.log('📊 Loaded Firestore data:', {
        suppliers: suppliers.length,
        products: products.length,
        proformaInvoices: proformaInvoices.length,
        purchaseOrders: purchaseOrders.length,
        clientInvoices: clientInvoices.length,
        clientPOs: clientPOs.length
      });

      // Convert real data to notification-ready format
      const realData = {
        overdueDeliveries: this.findOverdueDeliveries(purchaseOrders, suppliers),
        urgentPayments: this.findUrgentPayments(proformaInvoices, suppliers),
        atRiskDeliveries: this.findAtRiskDeliveries(purchaseOrders, suppliers),
        costOptimizations: this.findCostOptimizations(purchaseOrders, suppliers),
        supplierAlerts: this.findSupplierIssues(suppliers, purchaseOrders),
        budgetAlerts: this.findBudgetVariances(purchaseOrders),
        complianceAlerts: this.findComplianceIssues(purchaseOrders, proformaInvoices),
        lowStockAlerts: this.findLowStockItems(products),
        pendingSourcing: this.findPendingSourcing(clientPOs),
        unpaidInvoices: this.findUnpaidInvoices(clientInvoices)
      };

      return realData;
    } catch (error) {
      console.error('❌ Error loading real procurement data from Firestore:', error);
      return this.getEmptyDataStructure();
    }
  }

  /**
   * Find overdue deliveries from Firestore Purchase Orders
   */
  static findOverdueDeliveries(purchaseOrders, suppliers) {
    const today = new Date();
    const overdueDeliveries = [];

    purchaseOrders.forEach(po => {
      // Check for overdue deliveries
      if (po.status === 'pending' || po.status === 'confirmed' || po.status === 'processing') {
        const expectedDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : new Date(po.createdAt);
        const daysOverdue = Math.floor((today - expectedDate) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          const supplier = suppliers.find(s => s.id === po.supplierId);
          const urgencyLevel = daysOverdue >= 7 ? 'critical' : 
                              daysOverdue >= 3 ? 'high' : 'medium';
          
          overdueDeliveries.push({
            id: po.id,
            poNumber: po.poNumber || po.id,
            supplierName: supplier?.name || po.supplierName || 'Unknown Supplier',
            supplierContact: {
              email: supplier?.contact?.email || supplier?.email || '',
              phone: supplier?.contact?.phone || supplier?.phone || ''
            },
            totalValue: po.totalAmount || po.total || 0,
            daysOverdue: daysOverdue,
            expectedDeliveryDate: po.expectedDeliveryDate,
            status: po.status,
            items: po.items || [],
            urgencyLevel: urgencyLevel,
            trackingNumber: po.trackingNumber || 'Not provided',
            carrier: po.carrier || 'Unknown',
            clientName: po.clientName || 'Internal Order'
          });
        }
      }
    });

    return overdueDeliveries.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /**
   * Find urgent payments from Firestore Proforma Invoices
   */
  static findUrgentPayments(proformaInvoices, suppliers) {
    const today = new Date();
    const urgentPayments = [];
    const urgentThreshold = 3; // days

    proformaInvoices.forEach(pi => {
      if (pi.paymentStatus === 'pending' || pi.paymentStatus === 'overdue' || !pi.paymentStatus) {
        const dueDate = pi.paymentDueDate ? new Date(pi.paymentDueDate) : new Date(pi.date || pi.createdAt);
        const daysUntilDue = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue <= urgentThreshold) {
          const supplier = suppliers.find(s => s.id === pi.supplierId);
          const urgencyLevel = daysUntilDue < 0 ? 'critical' : 
                              daysUntilDue <= 1 ? 'high' : 'medium';
          
          urgentPayments.push({
            id: pi.id,
            invoiceNumber: pi.piNumber || pi.invoiceNumber || pi.id,
            supplierName: supplier?.name || pi.supplierName || 'Unknown Supplier',
            amount: pi.totalAmount || pi.total || 0,
            currency: pi.currency || 'MYR',
            dueDate: pi.paymentDueDate,
            daysUntilDue: daysUntilDue,
            isOverdue: daysUntilDue < 0,
            paymentTerms: pi.paymentTerms || 'Net 30',
            urgencyLevel: urgencyLevel,
            discountAvailable: pi.earlyPaymentDiscount ? {
              percentage: pi.earlyPaymentDiscount,
              deadline: pi.earlyPaymentDeadline
            } : null
          });
        }
      }
    });

    return urgentPayments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  /**
   * Find low stock items from Firestore Products
   */
  static findLowStockItems(products) {
    const lowStockAlerts = [];

    products.forEach(product => {
      const currentStock = product.stock || product.currentStock || 0;
      const minStock = product.minStock || product.reorderPoint || product.minimumStock || 10;
      
      if (currentStock <= minStock) {
        const urgencyLevel = currentStock === 0 ? 'critical' : 
                            currentStock <= minStock / 2 ? 'high' : 'medium';
        
        lowStockAlerts.push({
          id: product.id,
          productName: product.name,
          productCode: product.code || product.sku || product.productCode || product.id,
          currentStock: currentStock,
          minStock: minStock,
          category: product.category,
          price: product.price || 0,
          supplier: product.preferredSupplier || product.supplierName || 'Not assigned',
          urgencyLevel: urgencyLevel,
          reorderQuantity: product.reorderQuantity || minStock * 2
        });
      }
    });

    return lowStockAlerts.sort((a, b) => a.currentStock - b.currentStock);
  }

  /**
   * Find unpaid client invoices
   */
  static findUnpaidInvoices(clientInvoices) {
    const today = new Date();
    const unpaidInvoices = [];

    clientInvoices.forEach(invoice => {
      if (invoice.paymentStatus === 'pending' || invoice.paymentStatus === 'overdue' || !invoice.paymentStatus) {
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : new Date(invoice.createdAt);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue >= 0) { // Include due today and overdue
          const urgencyLevel = daysOverdue > 30 ? 'critical' : 
                              daysOverdue > 7 ? 'high' : 'medium';
          
          unpaidInvoices.push({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber || invoice.id,
            clientName: invoice.clientName || 'Unknown Client',
            amount: invoice.totalAmount || invoice.total || 0,
            currency: invoice.currency || 'MYR',
            dueDate: invoice.dueDate,
            daysOverdue: Math.max(0, daysOverdue),
            urgencyLevel: urgencyLevel,
            paymentTerms: invoice.paymentTerms || 'Net 30'
          });
        }
      }
    });

    return unpaidInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  /**
   * Find at-risk deliveries based on supplier performance
   */
  static findAtRiskDeliveries(purchaseOrders, suppliers) {
    const atRiskDeliveries = [];
    const today = new Date();

    purchaseOrders.forEach(po => {
      if (po.status === 'pending' || po.status === 'confirmed') {
        const supplier = suppliers.find(s => s.id === po.supplierId);
        const expectedDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : new Date(po.createdAt);
        const daysUntilDue = Math.floor((expectedDate - today) / (1000 * 60 * 60 * 24));
        
        // Flag orders due soon with poor-performing suppliers
        if (daysUntilDue <= 5 && supplier) {
          const onTimeRate = supplier.onTimeDelivery || supplier.performance?.onTimeDelivery || 85;
          if (onTimeRate < 90) {
            atRiskDeliveries.push({
              id: po.id,
              poNumber: po.poNumber || po.id,
              supplierName: supplier.name,
              originalDeliveryDate: po.expectedDeliveryDate,
              adjustedDeliveryDate: new Date(expectedDate.getTime() + (2 * 24 * 60 * 60 * 1000)).toISOString(),
              riskType: 'Supplier Performance',
              riskDescription: `Low on-time delivery rate (${onTimeRate}%)`,
              expectedDelay: 2,
              severity: onTimeRate < 80 ? 'high' : 'medium',
              estimatedImpact: (po.totalAmount || po.total || 0) * 0.1 // 10% of order value
            });
          }
        }
      }
    });

    return atRiskDeliveries;
  }

  /**
   * Find cost optimization opportunities
   */
  static findCostOptimizations(purchaseOrders, suppliers) {
    const optimizations = [];
    
    // Group orders by product/category to find volume discount opportunities
    const productSpend = {};
    
    purchaseOrders.forEach(po => {
      if (po.items) {
        po.items.forEach(item => {
          const key = item.productName || item.name || item.description;
          if (!productSpend[key]) {
            productSpend[key] = { totalSpend: 0, quantity: 0, orders: 0 };
          }
          productSpend[key].totalSpend += (item.price * item.quantity) || 0;
          productSpend[key].quantity += item.quantity || 0;
          productSpend[key].orders += 1;
        });
      }
    });

    // Find high-spend items that could benefit from consolidation
    Object.entries(productSpend).forEach(([product, data], index) => {
      if (data.totalSpend > 10000 && data.orders > 3) {
        optimizations.push({
          id: `opt-${index}`,
          type: 'Volume Consolidation',
          description: `Consolidate ${product} orders for volume discounts`,
          currentAnnualSpend: data.totalSpend,
          potentialAnnualSavings: data.totalSpend * 0.15, // 15% savings
          savingsPercentage: 15,
          confidence: 85,
          implementationEffort: 'Medium',
          timeToRealize: '2-3 months',
          category: product
        });
      }
    });

    return optimizations.slice(0, 3); // Top 3 opportunities
  }

  /**
   * Find supplier performance issues
   */
  static findSupplierIssues(suppliers, purchaseOrders) {
    const supplierAlerts = [];
    
    suppliers.forEach(supplier => {
      const supplierOrders = purchaseOrders.filter(po => po.supplierId === supplier.id);
      
      if (supplierOrders.length > 0) {
        // Check on-time delivery rate
        const onTimeRate = supplier.onTimeDelivery || supplier.performance?.onTimeDelivery || 85;
        if (onTimeRate < 85) {
          supplierAlerts.push({
            id: supplier.id,
            supplierName: supplier.name,
            alertType: 'Performance',
            description: 'Below average on-time delivery performance',
            severity: onTimeRate < 70 ? 'high' : 'medium',
            metrics: {
              onTimeDelivery: onTimeRate,
              qualityRating: supplier.rating || supplier.qualityRating || 4.0,
              responseTime: 24 // hours
            },
            trendAnalysis: {
              lastQuarter: onTimeRate < 80 ? 'Declining' : 'Stable'
            }
          });
        }
      }
    });

    return supplierAlerts;
  }

  /**
   * Find budget variances (simplified)
   */
  static findBudgetVariances(purchaseOrders) {
    const budgetAlerts = [];
    const monthlySpend = {};
    
    // Calculate monthly spend
    purchaseOrders.forEach(po => {
      const date = new Date(po.createdAt || po.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlySpend[monthKey]) {
        monthlySpend[monthKey] = 0;
      }
      monthlySpend[monthKey] += po.totalAmount || po.total || 0;
    });

    // Check if current month is over typical spend
    const currentMonth = new Date();
    const currentKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
    const currentSpend = monthlySpend[currentKey] || 0;
    const avgSpend = Object.values(monthlySpend).reduce((a, b) => a + b, 0) / Object.keys(monthlySpend).length || 1;
    
    if (currentSpend > avgSpend * 1.2) { // 20% over average
      budgetAlerts.push({
        id: 'budget-current',
        department: 'Procurement',
        budgetAmount: avgSpend,
        spentAmount: currentSpend,
        variancePercentage: ((currentSpend - avgSpend) / avgSpend) * 100,
        projectedYearEnd: currentSpend * 12,
        severity: currentSpend > avgSpend * 1.5 ? 'high' : 'medium'
      });
    }

    return budgetAlerts;
  }

  /**
   * Find compliance issues (simplified)
   */
  static findComplianceIssues(purchaseOrders, proformaInvoices) {
    const complianceAlerts = [];
    
    // Check for orders without proper documentation
    purchaseOrders.forEach(po => {
      if ((po.totalAmount || po.total || 0) > 5000 && !po.approvedBy) {
        complianceAlerts.push({
          id: po.id,
          type: 'Approval Required',
          description: 'High-value order requires approval',
          poNumber: po.poNumber || po.id,
          supplierName: po.supplierName || 'Pending',
          amount: po.totalAmount || po.total || 0,
          daysOpen: Math.floor((new Date() - new Date(po.createdAt || po.date)) / (1000 * 60 * 60 * 24)),
          assignedTo: 'Procurement Manager',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          severity: 'medium'
        });
      }
    });

    return complianceAlerts;
  }

  /**
   * Find pending sourcing from Client POs (localStorage fallback)
   */
  static findPendingSourcing(clientPOs) {
    const pendingSourcing = [];

    clientPOs.forEach(clientPO => {
      if (clientPO.items) {
        clientPO.items.forEach(item => {
          if (item.sourcingStatus === 'pending' || !item.sourcingStatus) {
            pendingSourcing.push({
              id: `${clientPO.id}-${item.id}`,
              clientPONumber: clientPO.poNumber,
              itemName: item.productName || item.name,
              quantity: item.quantity,
              estimatedValue: (item.price || 0) * (item.quantity || 0),
              deadline: clientPO.requiredDate,
              urgencyLevel: this.calculateSourcingPriority(clientPO, item)
            });
          }
        });
      }
    });

    return pendingSourcing;
  }

  /**
   * Calculate sourcing priority
   */
  static calculateSourcingPriority(clientPO, item) {
    const value = (item.price || 0) * (item.quantity || 0);
    if (value > 10000) return 'high';
    if (value > 5000) return 'medium';
    return 'low';
  }

  /**
   * Get empty data structure for fallback
   */
  static getEmptyDataStructure() {
    return {
      overdueDeliveries: [],
      urgentPayments: [],
      atRiskDeliveries: [],
      costOptimizations: [],
      supplierAlerts: [],
      budgetAlerts: [],
      complianceAlerts: [],
      lowStockAlerts: [],
      pendingSourcing: [],
      unpaidInvoices: []
    };
  }

  /**
   * Enhanced business rules evaluation using REAL Firestore data
   */
  static async evaluateBusinessRules(trackingData = {}) {
    console.log('🔄 Evaluating business rules with REAL Firestore data...');

    // Load real data from Firestore instead of localStorage
    this.realisticData = await this.loadRealProcurementData();
    
    console.log('📊 Loaded real Firestore data:', {
      overdueDeliveries: this.realisticData.overdueDeliveries.length,
      urgentPayments: this.realisticData.urgentPayments.length,
      lowStockAlerts: this.realisticData.lowStockAlerts.length,
      unpaidInvoices: this.realisticData.unpaidInvoices.length,
      pendingSourcing: this.realisticData.pendingSourcing.length,
      atRiskDeliveries: this.realisticData.atRiskDeliveries.length,
      costOptimizations: this.realisticData.costOptimizations.length
    });

    this.notifications = [];

    // Process real Firestore data into notifications
    this.processOverdueDeliveries();
    this.processUrgentPayments();
    this.processLowStockAlerts();
    this.processUnpaidInvoices();
    this.processPendingSourcing();
    this.processAtRiskDeliveries();
    this.processCostOptimizations();
    this.processSupplierAlerts();
    this.processBudgetAndComplianceAlerts();
    
    // Generate AI summary if there are many alerts
    this.generateAISummary();

    // Sort by priority
    this.sortNotificationsByPriority();

    this.lastEvaluation = new Date();
    
    console.log(`✅ Generated ${this.notifications.length} notifications from real Firestore data`);
    return this.notifications;
  }

  /**
   * Process unpaid client invoices
   */
  static processUnpaidInvoices() {
    const unpaidInvoices = this.realisticData.unpaidInvoices || [];
    
    unpaidInvoices.slice(0, 5).forEach(invoice => {
      const urgencyIcon = invoice.urgencyLevel === 'critical' ? '🔴' : 
                         invoice.urgencyLevel === 'high' ? '🟡' : '💰';
      
      const notification = {
        id: `invoice-${invoice.id}`,
        type: 'payment',
        severity: invoice.urgencyLevel,
        title: `${urgencyIcon} Unpaid Invoice ${invoice.daysOverdue > 0 ? `(${invoice.daysOverdue} days overdue)` : '(Due today)'}`,
        message: `${invoice.currency} ${invoice.amount.toLocaleString()} from ${invoice.clientName}`,
        details: {
          client: invoice.clientName,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.amount,
          currency: invoice.currency,
          dueDate: new Date(invoice.dueDate).toLocaleDateString(),
          daysOverdue: invoice.daysOverdue,
          paymentTerms: invoice.paymentTerms
        },
        actions: [
          {
            label: 'Follow Up Payment',
            action: () => this.handleFollowUpPayment(invoice),
            style: 'primary'
          },
          {
            label: 'Send Reminder',
            action: () => this.handleSendReminder(invoice),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(invoice.urgencyLevel, invoice.daysOverdue)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process low stock alerts
   */
  static processLowStockAlerts() {
    const lowStockAlerts = this.realisticData.lowStockAlerts || [];
    
    lowStockAlerts.slice(0, 5).forEach(alert => {
      const urgencyIcon = alert.urgencyLevel === 'critical' ? '🔴' : 
                         alert.urgencyLevel === 'high' ? '🟡' : '📦';
      
      const notification = {
        id: `stock-${alert.id}`,
        type: 'procurement',
        severity: alert.urgencyLevel,
        title: `${urgencyIcon} Low Stock Alert`,
        message: `${alert.productName} - Only ${alert.currentStock} units left`,
        details: {
          product: alert.productName,
          code: alert.productCode,
          currentStock: alert.currentStock,
          minStock: alert.minStock,
          category: alert.category,
          price: `${alert.price}`,
          supplier: alert.supplier,
          reorderQuantity: alert.reorderQuantity
        },
        actions: [
          {
            label: 'Create Purchase Order',
            action: () => this.handleCreatePO(alert),
            style: 'primary'
          },
          {
            label: 'Update Stock Level',
            action: () => this.handleUpdateStock(alert),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(alert.urgencyLevel, alert.minStock - alert.currentStock)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process pending sourcing alerts
   */
  static processPendingSourcing() {
    const pendingSourcing = this.realisticData.pendingSourcing || [];
    
    pendingSourcing.slice(0, 3).forEach(sourcing => {
      const notification = {
        id: `sourcing-${sourcing.id}`,
        type: 'procurement',
        severity: sourcing.urgencyLevel,
        title: `🔍 Sourcing Required`,
        message: `${sourcing.itemName} for Client PO ${sourcing.clientPONumber}`,
        details: {
          clientPO: sourcing.clientPONumber,
          item: sourcing.itemName,
          quantity: sourcing.quantity,
          estimatedValue: `$${sourcing.estimatedValue.toLocaleString()}`,
          deadline: sourcing.deadline
        },
        actions: [
          {
            label: 'Start Sourcing',
            action: () => this.handleStartSourcing(sourcing),
            style: 'primary'
          },
          {
            label: 'View Client PO',
            action: () => this.handleViewClientPO(sourcing),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(sourcing.urgencyLevel, 3)
      };

      this.notifications.push(notification);
    });
  }

  // Keep all your existing processing methods (processOverdueDeliveries, etc.) but they will use Firestore data
  // I'll include the key ones here:

  /**
   * Process overdue deliveries into notifications
   */
  static processOverdueDeliveries() {
    const overdueDeliveries = this.realisticData.overdueDeliveries || [];
    
    // Process top 8 most critical overdue deliveries
    overdueDeliveries.slice(0, 8).forEach(delivery => {
      const urgencyIcon = delivery.urgencyLevel === 'critical' ? '🔥' : 
                         delivery.urgencyLevel === 'high' ? '⚠️' : '📋';
      
      const notification = {
        id: `overdue-${delivery.id}`,
        type: 'delivery',
        severity: delivery.urgencyLevel,
        title: `${urgencyIcon} Delivery ${delivery.daysOverdue} Days Overdue`,
        message: `${delivery.supplierName} - PO ${delivery.poNumber} ($${delivery.totalValue.toLocaleString()})`,
        details: {
          supplier: delivery.supplierName,
          poNumber: delivery.poNumber,
          value: delivery.totalValue,
          daysOverdue: delivery.daysOverdue,
          trackingNumber: delivery.trackingNumber,
          carrier: delivery.carrier,
          contactEmail: delivery.supplierContact.email,
          contactPhone: delivery.supplierContact.phone,
          clientName: delivery.clientName
        },
        actions: [
          {
            label: 'Contact Supplier',
            action: () => this.handleContactSupplier(delivery),
            style: 'primary'
          },
          {
            label: 'Update Timeline',
            action: () => this.handleUpdateTimeline(delivery),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(delivery.urgencyLevel, delivery.daysOverdue)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process urgent payments
   */
  static processUrgentPayments() {
    const urgentPayments = this.realisticData.urgentPayments || [];
    
    // Process top 5 most urgent payments
    urgentPayments.slice(0, 5).forEach(payment => {
      const dueLabel = payment.daysUntilDue === 0 ? 'DUE TODAY' :
                      payment.daysUntilDue === 1 ? 'DUE TOMORROW' :
                      payment.daysUntilDue < 0 ? `${Math.abs(payment.daysUntilDue)} DAYS OVERDUE` :
                      `DUE IN ${payment.daysUntilDue} DAYS`;
      
      const urgencyIcon = payment.daysUntilDue < 0 ? '🔥' :
                         payment.daysUntilDue === 0 ? '💰' : 
                         payment.daysUntilDue === 1 ? '💰' : '📅';

      const notification = {
        id: `payment-${payment.id}`,
        type: 'payment',
        severity: payment.urgencyLevel,
        title: `${urgencyIcon} Payment ${dueLabel}`,
        message: `${payment.currency} ${payment.amount.toLocaleString()} to ${payment.supplierName}`,
        details: {
          supplier: payment.supplierName,
          invoiceNumber: payment.invoiceNumber,
          amount: payment.amount,
          currency: payment.currency,
          dueDate: new Date(payment.dueDate).toLocaleDateString(),
          paymentTerms: payment.paymentTerms,
          earlyPayDiscount: payment.discountAvailable ? `${payment.discountAvailable.percentage}% discount available` : null
        },
        actions: [
          {
            label: payment.daysUntilDue <= 0 ? 'Pay Now' : 'Schedule Payment',
            action: () => this.handleProcessPayment(payment),
            style: 'primary'
          },
          {
            label: 'Review Invoice',
            action: () => this.handleReviewInvoice(payment),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(payment.urgencyLevel, 4 - payment.daysUntilDue)
      };

      if (payment.discountAvailable) {
        notification.actions.unshift({
          label: `Early Pay (${payment.discountAvailable.percentage}% discount)`,
          action: () => this.handleEarlyPayment(payment),
          style: 'success'
        });
      }

      this.notifications.push(notification);
    });
  }

  // Include all other processing methods (processAtRiskDeliveries, processCostOptimizations, etc.)
  // They are the same as before but now work with Firestore data

  /**
   * Process at-risk deliveries
   */
  static processAtRiskDeliveries() {
    const atRiskDeliveries = this.realisticData.atRiskDeliveries || [];
    
    atRiskDeliveries.slice(0, 3).forEach(delivery => {
      const notification = {
        id: `risk-${delivery.id}`,
        type: 'procurement',
        severity: delivery.severity,
        title: `⚠️ Delivery Risk Alert`,
        message: `${delivery.supplierName} - ${delivery.riskDescription}`,
        details: {
          supplier: delivery.supplierName,
          poNumber: delivery.poNumber,
          riskType: delivery.riskType,
          expectedDelay: `${delivery.expectedDelay} days`,
          originalDate: new Date(delivery.originalDeliveryDate).toLocaleDateString(),
          adjustedDate: new Date(delivery.adjustedDeliveryDate).toLocaleDateString(),
          estimatedImpact: `$${delivery.estimatedImpact.toLocaleString()}`
        },
        actions: [
          {
            label: 'Review Mitigation',
            action: () => this.handleReviewMitigation(delivery),
            style: 'primary'
          },
          {
            label: 'Contact Supplier',
            action: () => this.handleContactSupplier(delivery),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(delivery.severity, delivery.expectedDelay)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process cost optimizations
   */
  static processCostOptimizations() {
    const costOptimizations = this.realisticData.costOptimizations || [];
    
    costOptimizations.slice(0, 2).forEach(optimization => {
      const notification = {
        id: `optimization-${optimization.id}`,
        type: 'procurement',
        severity: 'low',
        title: `💡 Cost Savings Opportunity`,
        message: `Save $${optimization.potentialAnnualSavings.toLocaleString()} annually - ${optimization.description}`,
        details: {
          type: optimization.type,
          currentSpend: `$${optimization.currentAnnualSpend.toLocaleString()}`,
          potentialSavings: `$${optimization.potentialAnnualSavings.toLocaleString()}`,
          savingsPercentage: `${optimization.savingsPercentage.toFixed(1)}%`,
          confidence: `${optimization.confidence}%`,
          timeToRealize: optimization.timeToRealize,
          effort: optimization.implementationEffort
        },
        actions: [
          {
            label: 'Review Opportunity',
            action: () => this.handleReviewOptimization(optimization),
            style: 'primary'
          },
          {
            label: 'Start Implementation',
            action: () => this.handleStartImplementation(optimization),
            style: 'success'
          }
        ],
        timestamp: new Date(),
        priority: 1 // Low priority for optimization opportunities
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process supplier performance alerts
   */
  static processSupplierAlerts() {
    const supplierAlerts = this.realisticData.supplierAlerts || [];
    
    supplierAlerts.forEach(alert => {
      const notification = {
        id: `supplier-${alert.id}`,
        type: 'urgent',
        severity: alert.severity,
        title: `📊 Supplier Performance Alert`,
        message: `${alert.supplierName} - ${alert.description}`,
        details: {
          supplier: alert.supplierName,
          alertType: alert.alertType,
          onTimeDelivery: `${alert.metrics.onTimeDelivery}%`,
          qualityRating: `${alert.metrics.qualityRating}/5.0`,
          responseTime: `${alert.metrics.responseTime} hours`,
          trend: alert.trendAnalysis.lastQuarter
        },
        actions: [
          {
            label: 'Review Performance',
            action: () => this.handleReviewSupplierPerformance(alert),
            style: 'primary'
          },
          {
            label: 'Schedule Meeting',
            action: () => this.handleScheduleSupplierMeeting(alert),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(alert.severity, 3)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process budget and compliance alerts
   */
  static processBudgetAndComplianceAlerts() {
    // Budget alerts
    const budgetAlerts = this.realisticData.budgetAlerts || [];
    budgetAlerts.slice(0, 2).forEach(alert => {
      const isOverBudget = alert.variancePercentage > 0;
      const icon = isOverBudget ? '🔴' : '🟡';
      
      const notification = {
        id: `budget-${alert.id}`,
        type: 'urgent',
        severity: alert.severity,
        title: `${icon} Budget Variance: ${alert.department}`,
        message: `${Math.abs(alert.variancePercentage).toFixed(1)}% ${isOverBudget ? 'Over' : 'Under'} Budget`,
        details: {
          department: alert.department,
          budgetAmount: `$${alert.budgetAmount.toLocaleString()}`,
          spentAmount: `$${alert.spentAmount.toLocaleString()}`,
          variance: `${alert.variancePercentage > 0 ? '+' : ''}${alert.variancePercentage.toFixed(1)}%`,
          projectedYearEnd: `$${alert.projectedYearEnd.toLocaleString()}`
        },
        actions: [
          {
            label: 'Review Budget',
            action: () => this.handleReviewBudget(alert),
            style: 'primary'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(alert.severity, Math.abs(alert.variancePercentage))
      };

      this.notifications.push(notification);
    });

    // Compliance alerts
    const complianceAlerts = this.realisticData.complianceAlerts || [];
    complianceAlerts.slice(0, 3).forEach(alert => {
      const notification = {
        id: `compliance-${alert.id}`,
        type: 'urgent',
        severity: alert.severity,
        title: `⚖️ Compliance Alert`,
        message: `${alert.description} - ${alert.poNumber}`,
        details: {
          type: alert.type,
          poNumber: alert.poNumber,
          supplier: alert.supplierName,
          amount: `$${alert.amount.toLocaleString()}`,
          daysOpen: alert.daysOpen,
          assignedTo: alert.assignedTo,
          deadline: new Date(alert.deadline).toLocaleDateString()
        },
        actions: [
          {
            label: 'Resolve Issue',
            action: () => this.handleResolveCompliance(alert),
            style: 'primary'
          },
          {
            label: 'Escalate',
            action: () => this.handleEscalateCompliance(alert),
            style: 'danger'
          }
        ],
        timestamp: new Date(),
        priority: this.calculatePriority(alert.severity, alert.daysOpen)
      };

      this.notifications.push(notification);
    });
  }

  // Keep all your existing helper methods
  static generateAISummary() {
    const criticalCount = this.notifications.filter(n => n.severity === 'critical').length;
    const highCount = this.notifications.filter(n => n.severity === 'high').length;
    const totalValue = this.calculateTotalAtRiskValue();

    if (criticalCount > 0 || highCount > 2) {
      const summaryNotification = {
        id: 'ai-summary',
        type: 'urgent',
        severity: criticalCount > 0 ? 'critical' : 'high',
        title: '🎯 Procurement Intelligence Summary',
        message: `${criticalCount + highCount} urgent items need attention ($${totalValue.toLocaleString()} at risk)`,
        details: {
          criticalAlerts: criticalCount,
          highPriorityAlerts: highCount,
          totalAtRiskValue: `$${totalValue.toLocaleString()}`,
          recommendations: this.generateRecommendations(criticalCount, highCount)
        },
        actions: [
          {
            label: 'View All Alerts',
            action: () => this.handleViewAllAlerts(),
            style: 'primary'
          },
          {
            label: 'Priority Dashboard',
            action: () => this.handlePriorityDashboard(),
            style: 'secondary'
          }
        ],
        timestamp: new Date(),
        priority: 10 // Highest priority for summary
      };

      this.notifications.unshift(summaryNotification);
    }
  }

  // All other helper methods remain the same
  static calculatePriority(severity, factor) {
    const severityWeights = { critical: 8, high: 6, medium: 4, low: 2 };
    return (severityWeights[severity] || 2) + Math.min(factor || 0, 2);
  }

  static calculateTotalAtRiskValue() {
    return this.notifications.reduce((total, notification) => {
      const value = notification.details?.value || 0;
      const amount = notification.details?.amount || 0;
      return total + value + amount;
    }, 0);
  }

  static sortNotificationsByPriority() {
    this.notifications.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  static generateRecommendations(criticalCount, highCount) {
    const recommendations = [];
    if (criticalCount > 2) recommendations.push('Escalate critical items to management immediately');
    if (highCount > 3) recommendations.push('Review supplier performance and delivery commitments');
    return recommendations;
  }

  // Action handlers - add new ones for Firestore data
  static handleContactSupplier(item) {
    console.log('📞 Contacting supplier:', item.supplierName);
    return { action: 'contact_supplier', item: item.id };
  }

  static handleProcessPayment(payment) {
    console.log('💳 Processing payment:', payment.invoiceNumber);
    return { action: 'process_payment', payment: payment.id };
  }

  static handleFollowUpPayment(invoice) {
    console.log('📞 Following up payment:', invoice.invoiceNumber);
    return { action: 'follow_up_payment', invoice: invoice.id };
  }

  static handleCreatePO(alert) {
    console.log('📋 Creating PO for:', alert.productName);
    return { action: 'create_po', product: alert.id };
  }

  static handleStartSourcing(sourcing) {
    console.log('🔍 Starting sourcing for:', sourcing.itemName);
    return { action: 'start_sourcing', sourcing: sourcing.id };
  }

  static handleReviewOptimization(optimization) {
    console.log('💡 Reviewing optimization:', optimization.type);
    return { action: 'review_optimization', optimization: optimization.id };
  }

  static handleViewAllAlerts() {
    console.log('📋 Viewing all alerts');
    return { action: 'view_all_alerts' };
  }

  // Updated initialization methods for Firestore
  static async initialize() {
    console.log('🔔 SmartNotificationsService initializing with Firestore data...');
    this.realisticData = await this.loadRealProcurementData();
    this.isInitialized = true;
    return true;
  }

  static async getAllNotifications() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    // Use the updated evaluateBusinessRules method with Firestore data
    return await this.evaluateBusinessRules();
  }

  static dismissNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications.splice(index, 1)[0];
      console.log('✅ Dismissed notification:', notification.title);
      return true;
    }
    return false;
  }

  static async refreshNotifications() {
    console.log('🔄 Refreshing Smart Notifications with Firestore data...');
    
    // Reload real data from Firestore
    this.realisticData = await this.loadRealProcurementData();
    
    // Regenerate notifications
    this.notifications = [];
    const newNotifications = await this.evaluateBusinessRules();
    
    console.log(`✅ Refreshed ${newNotifications.length} notifications from Firestore`);
    return newNotifications;
  }

  static async getNotificationSummary() {
    const notifications = await this.getAllNotifications();
    
    return {
      total: notifications.length,
      critical: notifications.filter(n => n.severity === 'critical').length,
      high: notifications.filter(n => n.severity === 'high').length,
      medium: notifications.filter(n => n.severity === 'medium').length,
      low: notifications.filter(n => n.severity === 'low').length,
      totalAtRiskValue: this.calculateTotalAtRiskValue(),
      lastUpdate: this.lastEvaluation
    };
  }
}

export default SmartNotificationsService;
