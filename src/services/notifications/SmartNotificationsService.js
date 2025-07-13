// Update your existing src/services/notifications/SmartNotificationsService.js
// Replace the evaluateBusinessRules method with this enhanced version

import SampleDataService from '../data/SampleDataService.js';

class SmartNotificationsService {
  static notifications = [];
  static lastEvaluation = null;
  static realisticData = null;

  /**
   * Enhanced business rules evaluation using realistic data
   */
  static evaluateBusinessRules(trackingData = {}) {
    console.log('🔄 Evaluating enhanced business rules...');

    // Get or generate realistic data
    if (!this.realisticData) {
      this.realisticData = SampleDataService.getRealisticData();
      console.log('📊 Loaded realistic procurement data:', {
        overdueDeliveries: this.realisticData.overdueDeliveries.length,
        urgentPayments: this.realisticData.urgentPayments.length,
        atRiskDeliveries: this.realisticData.atRiskDeliveries.length,
        costOptimizations: this.realisticData.costOptimizations.length
      });
    }

    this.notifications = [];

    // Process overdue deliveries (highest priority)
    this.processOverdueDeliveries();
    
    // Process urgent payments
    this.processUrgentPayments();
    
    // Process at-risk deliveries (top 3 only to avoid overwhelm)
    this.processAtRiskDeliveries();
    
    // Process cost optimizations (top 2 highest value)
    this.processCostOptimizations();
    
    // Process supplier alerts
    this.processSupplierAlerts();
    
    // Process budget and compliance alerts
    this.processBudgetAndComplianceAlerts();
    
    // Generate AI summary if there are many alerts
    this.generateAISummary();

    // Sort by priority
    this.sortNotificationsByPriority();

    this.lastEvaluation = new Date();
    
    console.log(`✅ Generated ${this.notifications.length} enhanced notifications`);
    return this.notifications;
  }

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
          contactPhone: delivery.supplierContact.phone
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
                      `DUE IN ${payment.daysUntilDue} DAYS`;
      
      const urgencyIcon = payment.daysUntilDue === 0 ? '🔥' : 
                         payment.daysUntilDue === 1 ? '💰' : '📅';

      const notification = {
        id: `payment-${payment.id}`,
        type: 'payment',
        severity: payment.urgencyLevel,
        title: `${urgencyIcon} Payment ${dueLabel}`,
        message: `$${payment.amount.toLocaleString()} to ${payment.supplierName}`,
        details: {
          supplier: payment.supplierName,
          invoiceNumber: payment.invoiceNumber,
          amount: payment.amount,
          dueDate: new Date(payment.dueDate).toLocaleDateString(),
          paymentTerms: payment.paymentTerms,
          earlyPayDiscount: payment.discountAvailable ? `${payment.discountAvailable.percentage}% discount available` : null
        },
        actions: [
          {
            label: payment.daysUntilDue === 0 ? 'Pay Now' : 'Schedule Payment',
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

  /**
   * Process at-risk deliveries
   */
  static processAtRiskDeliveries() {
    const atRiskDeliveries = this.realisticData.atRiskDeliveries || [];
    
    // Show top 3 highest risk deliveries
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
    
    // Show top 2 highest value opportunities
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
    // Budget alerts (top 2)
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

    // Compliance alerts (top 3 most critical)
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

  /**
   * Generate AI summary notification
   */
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

      this.notifications.unshift(summaryNotification); // Add to beginning
    }
  }

  /**
   * Helper methods
   */
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

  // Action handlers (these can be expanded as needed)
  static handleContactSupplier(item) {
    console.log('📞 Contacting supplier:', item.supplierName);
    return { action: 'contact_supplier', item: item.id };
  }

  static handleProcessPayment(payment) {
    console.log('💳 Processing payment:', payment.invoiceNumber);
    return { action: 'process_payment', payment: payment.id };
  }

  static handleReviewOptimization(optimization) {
    console.log('💡 Reviewing optimization:', optimization.type);
    return { action: 'review_optimization', optimization: optimization.id };
  }

  static handleViewAllAlerts() {
    console.log('📋 Viewing all alerts');
    return { action: 'view_all_alerts' };
  }

  // Refresh realistic data (call this periodically or when needed)
  static refreshRealisticData() {
    console.log('🔄 Refreshing realistic data...');
    this.realisticData = SampleDataService.generateRealisticScenarios();
    SampleDataService.saveToStorage(this.realisticData);
    return this.realisticData;
  }

  // Get summary for badge counts
  static getNotificationSummary() {
    const notifications = this.notifications || [];
    return {
      total: notifications.length,
      critical: notifications.filter(n => n.severity === 'critical').length,
      high: notifications.filter(n => n.severity === 'high').length,
      urgent: notifications.filter(n => n.type === 'urgent').length
    };
  }
}

// Add these methods to the END of your SmartNotificationsService.js file

  /**
   * Initialize the service (for compatibility with enhanced component)
   */
  static async initialize() {
    console.log('🔔 SmartNotificationsService initializing...');
    this.realisticData = SampleDataService.getRealisticData();
    return true;
  }

  /**
   * Get all current notifications (main method called by component)
   */
  static async getAllNotifications() {
    if (!this.realisticData) {
      await this.initialize();
    }
    
    // Use the existing evaluateBusinessRules method
    return this.evaluateBusinessRules();
  }

  /**
   * Get notifications by severity level
   */
  static async getNotificationsBySeverity(severity) {
    const notifications = await this.getAllNotifications();
    return notifications.filter(n => n.severity === severity);
  }

  /**
   * Get critical alerts that need immediate attention
   */
  static async getCriticalAlerts() {
    return await this.getNotificationsBySeverity('critical');
  }

  /**
   * Dismiss a notification
   */
  static dismissNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications.splice(index, 1)[0];
      console.log('✅ Dismissed notification:', notification.title);
      return true;
    }
    return false;
  }

  /**
   * Refresh notifications with latest data
   */
  static async refreshNotifications() {
    console.log('🔄 Refreshing Smart Notifications...');
    
    // Regenerate realistic data
    this.realisticData = SampleDataService.generateRealisticScenarios();
    SampleDataService.saveToStorage(this.realisticData);
    
    // Regenerate notifications
    this.notifications = [];
    const newNotifications = this.evaluateBusinessRules();
    
    console.log(`✅ Refreshed ${newNotifications.length} notifications`);
    return newNotifications;
  }

  /**
   * Get notification summary for dashboard display
   */
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

export default SmartNotificationsService;
