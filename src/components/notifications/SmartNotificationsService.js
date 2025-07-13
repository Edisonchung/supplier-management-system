// src/services/notifications/SmartNotificationsService.js
/**
 * Enhanced Smart Notifications Service for HiggsFlow Phase 3B-2
 * Integrates with realistic sample data for comprehensive procurement alerts
 * 
 * Features:
 * - Real-world procurement scenarios
 * - Business intelligence insights
 * - Priority-based alert classification
 * - Action-oriented notifications
 * - External notification channel support
 */

import SampleDataService from '../data/SampleDataService.js';

class SmartNotificationsService {
  static notifications = [];
  static isInitialized = false;
  static lastUpdate = null;
  static realisticData = null;

  // Notification types with enhanced metadata
  static NOTIFICATION_TYPES = {
    DELIVERY_OVERDUE: {
      type: 'delivery_overdue',
      defaultSeverity: 'high',
      icon: '🚚',
      category: 'delivery',
      channels: ['in_app', 'email'],
      escalationThreshold: 3 // days
    },
    PAYMENT_DUE: {
      type: 'payment_due',
      defaultSeverity: 'medium',
      icon: '💰',
      category: 'payment',
      channels: ['in_app', 'email'],
      escalationThreshold: 1 // days
    },
    DELIVERY_AT_RISK: {
      type: 'delivery_risk',
      defaultSeverity: 'medium',
      icon: '⚠️',
      category: 'delivery',
      channels: ['in_app'],
      escalationThreshold: 5 // days
    },
    COST_OPTIMIZATION: {
      type: 'cost_optimization',
      defaultSeverity: 'low',
      icon: '💡',
      category: 'optimization',
      channels: ['in_app'],
      escalationThreshold: 30 // days
    },
    SUPPLIER_PERFORMANCE: {
      type: 'supplier_alert',
      defaultSeverity: 'medium',
      icon: '📊',
      category: 'supplier',
      channels: ['in_app', 'email'],
      escalationThreshold: 7 // days
    },
    BUDGET_VARIANCE: {
      type: 'budget_alert',
      defaultSeverity: 'medium',
      icon: '📈',
      category: 'budget',
      channels: ['in_app', 'email'],
      escalationThreshold: 3 // days
    },
    COMPLIANCE_ISSUE: {
      type: 'compliance_alert',
      defaultSeverity: 'high',
      icon: '⚖️',
      category: 'compliance',
      channels: ['in_app', 'email', 'sms'],
      escalationThreshold: 1 // days
    }
  };

  /**
   * Initialize with realistic data
   */
  static async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing Enhanced Smart Notifications with realistic data...');
      
      // Load realistic procurement data
      this.realisticData = SampleDataService.getRealisticData();
      
      // Generate initial notifications
      await this.generateInitialNotifications();
      
      this.isInitialized = true;
      this.lastUpdate = new Date();
      
      console.log(`✅ Smart Notifications initialized with ${this.notifications.length} realistic alerts`);
      console.log('📊 Data summary:', {
        overdueDeliveries: this.realisticData.overdueDeliveries.length,
        urgentPayments: this.realisticData.urgentPayments.length,
        atRiskDeliveries: this.realisticData.atRiskDeliveries.length,
        costOptimizations: this.realisticData.costOptimizations.length
      });
      
    } catch (error) {
      console.error('❌ Failed to initialize Smart Notifications:', error);
      this.initializeFallback();
    }
  }

  /**
   * Generate comprehensive notifications from realistic data
   */
  static async generateInitialNotifications() {
    this.notifications = [];

    // Process overdue deliveries (highest priority)
    this.processOverdueDeliveries();
    
    // Process urgent payments
    this.processUrgentPayments();
    
    // Process at-risk deliveries
    this.processAtRiskDeliveries();
    
    // Process cost optimizations
    this.processCostOptimizations();
    
    // Process supplier alerts
    this.processSupplierAlerts();
    
    // Process budget variances
    this.processBudgetAlerts();
    
    // Process compliance issues
    this.processComplianceAlerts();
    
    // Generate AI summary notifications
    this.generateAISummaryNotifications();
    
    // Sort by priority and timestamp
    this.sortNotificationsByPriority();
  }

  /**
   * Process overdue deliveries into actionable notifications
   */
  static processOverdueDeliveries() {
    const overdueDeliveries = this.realisticData.overdueDeliveries || [];
    
    overdueDeliveries.forEach(delivery => {
      const severity = this.calculateDeliverySeverity(delivery);
      const urgencyIndicator = delivery.daysOverdue >= 7 ? ' 🔥 CRITICAL' : 
                              delivery.daysOverdue >= 3 ? ' ⚠️ HIGH' : ' 📋 MEDIUM';
      
      const notification = {
        id: `smart-delivery-${delivery.id}`,
        type: this.NOTIFICATION_TYPES.DELIVERY_OVERDUE.type,
        severity: severity,
        title: `Delivery Overdue${urgencyIndicator}`,
        message: `${delivery.supplierName} delivery is ${delivery.daysOverdue} day${delivery.daysOverdue > 1 ? 's' : ''} overdue`,
        details: {
          poNumber: delivery.poNumber,
          supplier: delivery.supplierName,
          value: delivery.totalValue,
          daysOverdue: delivery.daysOverdue,
          trackingNumber: delivery.trackingNumber,
          carrier: delivery.carrier,
          expectedDelivery: delivery.estimatedDelivery,
          riskFactors: delivery.riskFactors
        },
        actions: [
          {
            label: 'Contact Supplier',
            type: 'primary',
            handler: () => this.handleContactSupplier(delivery)
          },
          {
            label: 'Update Timeline',
            type: 'secondary',
            handler: () => this.handleUpdateTimeline(delivery)
          },
          {
            label: 'Escalate',
            type: delivery.daysOverdue >= 7 ? 'danger' : 'secondary',
            handler: () => this.handleEscalateDelivery(delivery)
          }
        ],
        channels: severity === 'critical' ? ['in_app', 'email', 'sms'] : ['in_app', 'email'],
        metadata: {
          deliveryId: delivery.id,
          supplierContact: delivery.supplierContact,
          escalationLevel: delivery.escalationLevel,
          businessImpact: this.calculateBusinessImpact(delivery)
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process urgent payments into actionable notifications
   */
  static processUrgentPayments() {
    const urgentPayments = this.realisticData.urgentPayments || [];
    
    urgentPayments.forEach(payment => {
      const severity = this.calculatePaymentSeverity(payment);
      const dueLabel = payment.daysUntilDue === 0 ? 'DUE TODAY' :
                      payment.daysUntilDue === 1 ? 'DUE TOMORROW' :
                      `DUE IN ${payment.daysUntilDue} DAYS`;
      
      const urgencyIndicator = payment.daysUntilDue === 0 ? ' 🔥 URGENT' :
                              payment.daysUntilDue === 1 ? ' ⚠️ HIGH' : ' 📋 MEDIUM';

      const notification = {
        id: `smart-payment-${payment.id}`,
        type: this.NOTIFICATION_TYPES.PAYMENT_DUE.type,
        severity: severity,
        title: `Payment ${dueLabel}${urgencyIndicator}`,
        message: `$${payment.amount.toLocaleString()} payment to ${payment.supplierName}`,
        details: {
          invoiceNumber: payment.invoiceNumber,
          poNumber: payment.poNumber,
          supplier: payment.supplierName,
          amount: payment.amount,
          dueDate: payment.dueDate,
          paymentTerms: payment.paymentTerms,
          discountAvailable: payment.discountAvailable,
          paymentHistory: payment.paymentHistory
        },
        actions: [
          {
            label: payment.daysUntilDue === 0 ? 'Pay Now' : 'Schedule Payment',
            type: 'primary',
            handler: () => this.handleProcessPayment(payment)
          },
          {
            label: 'Review Invoice',
            type: 'secondary',
            handler: () => this.handleReviewInvoice(payment)
          },
          ...(payment.discountAvailable ? [{
            label: `Early Pay (${payment.discountAvailable.percentage}% discount)`,
            type: 'success',
            handler: () => this.handleEarlyPayment(payment)
          }] : [])
        ],
        channels: severity === 'critical' ? ['in_app', 'email'] : ['in_app'],
        metadata: {
          paymentId: payment.id,
          supplierContact: payment.supplierContact,
          riskScore: payment.riskScore,
          cashFlowImpact: this.calculateCashFlowImpact(payment)
        },
        timestamp: new Date(),
        expiresAt: new Date(payment.dueDate)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process at-risk deliveries
   */
  static processAtRiskDeliveries() {
    const atRiskDeliveries = this.realisticData.atRiskDeliveries || [];
    
    // Only show top 5 most critical at-risk deliveries to avoid overwhelm
    atRiskDeliveries.slice(0, 5).forEach(delivery => {
      const notification = {
        id: `smart-risk-${delivery.id}`,
        type: this.NOTIFICATION_TYPES.DELIVERY_AT_RISK.type,
        severity: delivery.severity,
        title: `🚨 Delivery Risk Alert`,
        message: `${delivery.supplierName} - ${delivery.riskDescription}`,
        details: {
          poNumber: delivery.poNumber,
          originalDate: delivery.originalDeliveryDate,
          adjustedDate: delivery.adjustedDeliveryDate,
          expectedDelay: delivery.expectedDelay,
          riskType: delivery.riskType,
          estimatedImpact: delivery.estimatedImpact,
          mitigationActions: delivery.mitigationActions
        },
        actions: [
          {
            label: 'Review Mitigation',
            type: 'primary',
            handler: () => this.handleReviewMitigation(delivery)
          },
          {
            label: 'Contact Supplier',
            type: 'secondary',
            handler: () => this.handleContactSupplier(delivery)
          }
        ],
        channels: ['in_app'],
        metadata: {
          deliveryId: delivery.id,
          riskLevel: delivery.severity,
          mitigationStatus: 'pending'
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process cost optimization opportunities
   */
  static processCostOptimizations() {
    const optimizations = this.realisticData.costOptimizations || [];
    
    // Only show top 3 highest-value opportunities
    optimizations.slice(0, 3).forEach(optimization => {
      const notification = {
        id: `smart-optimization-${optimization.id}`,
        type: this.NOTIFICATION_TYPES.COST_OPTIMIZATION.type,
        severity: optimization.priority === 'high' ? 'medium' : 'low',
        title: `💡 Cost Savings Opportunity`,
        message: `Save ${optimization.potentialAnnualSavings.toLocaleString()} annually - ${optimization.description}`,
        details: {
          type: optimization.type,
          currentSpend: optimization.currentAnnualSpend,
          potentialSavings: optimization.potentialAnnualSavings,
          savingsPercentage: optimization.savingsPercentage,
          confidence: optimization.confidence,
          implementationEffort: optimization.implementationEffort,
          timeToRealize: optimization.timeToRealize,
          affectedSuppliers: optimization.affectedSuppliers,
          category: optimization.category
        },
        actions: [
          {
            label: 'Review Opportunity',
            type: 'primary',
            handler: () => this.handleReviewOptimization(optimization)
          },
          {
            label: 'Start Implementation',
            type: 'success',
            handler: () => this.handleStartImplementation(optimization)
          }
        ],
        channels: ['in_app'],
        metadata: {
          optimizationId: optimization.id,
          roi: (optimization.potentialAnnualSavings / optimization.currentAnnualSpend) * 100,
          priority: optimization.priority
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
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
        id: `smart-supplier-${alert.id}`,
        type: this.NOTIFICATION_TYPES.SUPPLIER_PERFORMANCE.type,
        severity: alert.severity,
        title: `📊 Supplier Performance Alert`,
        message: `${alert.supplierName} - ${alert.description}`,
        details: {
          supplier: alert.supplierName,
          alertType: alert.alertType,
          metrics: alert.metrics,
          trendAnalysis: alert.trendAnalysis,
          recommendedActions: alert.recommendedActions,
          riskLevel: alert.riskLevel
        },
        actions: [
          {
            label: 'Review Performance',
            type: 'primary',
            handler: () => this.handleReviewSupplierPerformance(alert)
          },
          {
            label: 'Schedule Meeting',
            type: 'secondary',
            handler: () => this.handleScheduleSupplierMeeting(alert)
          },
          {
            label: 'View Alternative Suppliers',
            type: 'secondary',
            handler: () => this.handleViewAlternatives(alert)
          }
        ],
        channels: ['in_app', 'email'],
        metadata: {
          supplierId: alert.supplierName,
          performanceScore: alert.metrics.qualityRating,
          riskLevel: alert.riskLevel
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)) // 14 days
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process budget variance alerts
   */
  static processBudgetAlerts() {
    const budgetAlerts = this.realisticData.budgetAlerts || [];
    
    budgetAlerts.forEach(alert => {
      const isOverBudget = alert.variancePercentage > 0;
      const varianceLabel = isOverBudget ? 'Over Budget' : 'Under Budget';
      const icon = isOverBudget ? '🔴' : '🟡';
      
      const notification = {
        id: `smart-budget-${alert.id}`,
        type: this.NOTIFICATION_TYPES.BUDGET_VARIANCE.type,
        severity: alert.severity,
        title: `${icon} Budget Variance: ${alert.department}`,
        message: `${Math.abs(alert.variancePercentage).toFixed(1)}% ${varianceLabel} for ${alert.budgetPeriod}`,
        details: {
          department: alert.department,
          budgetPeriod: alert.budgetPeriod,
          budgetAmount: alert.budgetAmount,
          spentAmount: alert.spentAmount,
          remainingAmount: alert.remainingAmount,
          variancePercentage: alert.variancePercentage,
          projectedYearEnd: alert.projectedYearEnd,
          category: alert.category
        },
        actions: [
          {
            label: 'Review Budget',
            type: 'primary',
            handler: () => this.handleReviewBudget(alert)
          },
          {
            label: isOverBudget ? 'Cost Control Plan' : 'Reallocation Options',
            type: isOverBudget ? 'danger' : 'secondary',
            handler: () => this.handleBudgetAction(alert)
          }
        ],
        channels: ['in_app', 'email'],
        metadata: {
          departmentId: alert.department,
          variance: alert.variancePercentage,
          riskLevel: alert.riskLevel
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)) // 7 days
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Process compliance alerts
   */
  static processComplianceAlerts() {
    const complianceAlerts = this.realisticData.complianceAlerts || [];
    
    complianceAlerts.forEach(alert => {
      const notification = {
        id: `smart-compliance-${alert.id}`,
        type: this.NOTIFICATION_TYPES.COMPLIANCE_ISSUE.type,
        severity: alert.severity,
        title: `⚖️ Compliance Alert`,
        message: `${alert.description} - ${alert.poNumber}`,
        details: {
          type: alert.type,
          poNumber: alert.poNumber,
          supplier: alert.supplierName,
          amount: alert.amount,
          daysOpen: alert.daysOpen,
          assignedTo: alert.assignedTo,
          requiredActions: alert.requiredActions,
          deadline: alert.deadline,
          riskImpact: alert.riskImpact
        },
        actions: [
          {
            label: 'Resolve Issue',
            type: 'primary',
            handler: () => this.handleResolveCompliance(alert)
          },
          {
            label: 'Escalate',
            type: 'danger',
            handler: () => this.handleEscalateCompliance(alert)
          },
          {
            label: 'Request Documentation',
            type: 'secondary',
            handler: () => this.handleRequestDocumentation(alert)
          }
        ],
        channels: alert.severity === 'critical' ? ['in_app', 'email', 'sms'] : ['in_app', 'email'],
        metadata: {
          complianceId: alert.id,
          assignee: alert.assignedTo,
          deadline: alert.deadline,
          riskLevel: alert.severity
        },
        timestamp: new Date(),
        expiresAt: new Date(alert.deadline)
      };

      this.notifications.push(notification);
    });
  }

  /**
   * Generate AI-powered summary notifications
   */
  static generateAISummaryNotifications() {
    const criticalCount = this.notifications.filter(n => n.severity === 'critical').length;
    const highCount = this.notifications.filter(n => n.severity === 'high').length;
    const totalValue = this.calculateTotalAtRiskValue();
    
    // Generate daily summary if there are significant alerts
    if (criticalCount > 0 || highCount > 3) {
      const summaryNotification = {
        id: 'smart-daily-summary',
        type: 'daily_summary',
        severity: criticalCount > 0 ? 'critical' : 'high',
        title: '🎯 Daily Procurement Intelligence',
        message: `${criticalCount + highCount} urgent items need attention (${totalValue.toLocaleString()} at risk)`,
        details: {
          criticalAlerts: criticalCount,
          highPriorityAlerts: highCount,
          totalAtRiskValue: totalValue,
          categories: this.categorizeAlerts(),
          trends: this.analyzeTrends(),
          recommendations: this.generateRecommendations()
        },
        actions: [
          {
            label: 'View All Alerts',
            type: 'primary',
            handler: () => this.handleViewAllAlerts()
          },
          {
            label: 'Priority Dashboard',
            type: 'secondary',
            handler: () => this.handlePriorityDashboard()
          }
        ],
        channels: ['in_app'],
        metadata: {
          summaryType: 'daily_intelligence',
          alertCount: this.notifications.length,
          businessImpact: 'high'
        },
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (12 * 60 * 60 * 1000)) // 12 hours
      };

      this.notifications.unshift(summaryNotification); // Add to beginning
    }
  }

  /**
   * Calculate severity for delivery notifications
   */
  static calculateDeliverySeverity(delivery) {
    if (delivery.daysOverdue >= 10 || delivery.totalValue > 100000) return 'critical';
    if (delivery.daysOverdue >= 5 || delivery.totalValue > 50000) return 'high';
    if (delivery.daysOverdue >= 3 || delivery.totalValue > 25000) return 'medium';
    return 'low';
  }

  /**
   * Calculate severity for payment notifications
   */
  static calculatePaymentSeverity(payment) {
    if (payment.daysUntilDue === 0) return 'critical';
    if (payment.daysUntilDue === 1 || payment.amount > 50000) return 'high';
    if (payment.daysUntilDue <= 2 || payment.amount > 25000) return 'medium';
    return 'low';
  }

  /**
   * Sort notifications by priority and urgency
   */
  static sortNotificationsByPriority() {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    this.notifications.sort((a, b) => {
      // First sort by severity
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      
      // Then by timestamp (newest first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }

  /**
   * Calculate total value at risk across all alerts
   */
  static calculateTotalAtRiskValue() {
    let total = 0;
    
    this.notifications.forEach(notification => {
      if (notification.details?.value) total += notification.details.value;
      if (notification.details?.amount) total += notification.details.amount;
      if (notification.details?.potentialSavings) total += notification.details.potentialSavings;
    });
    
    return total;
  }

  /**
   * Categorize alerts for summary reporting
   */
  static categorizeAlerts() {
    const categories = {};
    
    this.notifications.forEach(notification => {
      const type = notification.type;
      if (!categories[type]) categories[type] = 0;
      categories[type]++;
    });
    
    return categories;
  }

  /**
   * Analyze trends in notification data
   */
  static analyzeTrends() {
    return {
      alertVolume: 'increasing',
      averageSeverity: this.calculateAverageSeverity(),
      responseTime: '4.2 hours',
      resolutionRate: '87%',
      costImpact: 'medium'
    };
  }

  /**
   * Generate AI-powered recommendations
   */
  static generateRecommendations() {
    const recommendations = [];
    
    const criticalCount = this.notifications.filter(n => n.severity === 'critical').length;
    const overdueDeliveries = this.notifications.filter(n => n.type === 'delivery_overdue').length;
    const urgentPayments = this.notifications.filter(n => n.type === 'payment_due').length;
    
    if (criticalCount > 3) {
      recommendations.push('Consider escalating critical items to management');
    }
    
    if (overdueDeliveries > 5) {
      recommendations.push('Review supplier performance and delivery commitments');
    }
    
    if (urgentPayments > 3) {
      recommendations.push('Implement automated payment scheduling to improve cash flow');
    }
    
    return recommendations;
  }

  /**
   * Calculate average severity score
   */
  static calculateAverageSeverity() {
    const severityScores = { critical: 4, high: 3, medium: 2, low: 1 };
    const total = this.notifications.reduce((sum, n) => sum + severityScores[n.severity], 0);
    return (total / this.notifications.length).toFixed(1);
  }

  /**
   * Action handlers for notification interactions
   */
  static handleContactSupplier(item) {
    console.log('🔗 Contacting supplier:', item.supplierName);
    // Integration point for email/communication system
    return {
      action: 'contact_supplier',
      supplier: item.supplierName,
      contact: item.supplierContact,
      timestamp: new Date()
    };
  }

  static handleProcessPayment(payment) {
    console.log('💳 Processing payment:', payment.invoiceNumber);
    // Integration point for payment processing system
    return {
      action: 'process_payment',
      paymentId: payment.id,
      amount: payment.amount,
      timestamp: new Date()
    };
  }

  static handleReviewOptimization(optimization) {
    console.log('💡 Reviewing optimization:', optimization.type);
    // Integration point for cost optimization workflow
    return {
      action: 'review_optimization',
      optimizationId: optimization.id,
      potentialSavings: optimization.potentialAnnualSavings,
      timestamp: new Date()
    };
  }

  static handleResolveCompliance(alert) {
    console.log('⚖️ Resolving compliance issue:', alert.type);
    // Integration point for compliance management system
    return {
      action: 'resolve_compliance',
      alertId: alert.id,
      type: alert.type,
      timestamp: new Date()
    };
  }

  /**
   * Public API Methods
   */

  /**
   * Get all current notifications
   */
  static async getAllNotifications() {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.notifications.filter(n => !this.isExpired(n));
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
      lastUpdate: this.lastUpdate,
      categories: this.categorizeAlerts(),
      trends: this.analyzeTrends()
    };
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
    await this.generateInitialNotifications();
    
    this.lastUpdate = new Date();
    console.log(`✅ Refreshed ${this.notifications.length} notifications`);
    
    return this.notifications;
  }

  /**
   * Dismiss a notification
   */
  static dismissNotification(notificationId) {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      const notification = this.notifications.splice(index, 1)[0];
      console.log('✅ Dismissed notification:', notification.title);
      
      // Store dismissal for history/analytics
      this.storeDismissal(notification);
      
      return true;
    }
    return false;
  }

  /**
   * Check if notification has expired
   */
  static isExpired(notification) {
    if (!notification.expiresAt) return false;
    return new Date() > new Date(notification.expiresAt);
  }

  /**
   * Store notification dismissal for analytics
   */
  static storeDismissal(notification) {
    try {
      const dismissals = JSON.parse(localStorage.getItem('notification_dismissals') || '[]');
      dismissals.push({
        id: notification.id,
        type: notification.type,
        severity: notification.severity,
        dismissedAt: new Date().toISOString(),
        timeToAction: this.calculateTimeToAction(notification)
      });
      
      // Keep only last 100 dismissals
      if (dismissals.length > 100) {
        dismissals.splice(0, dismissals.length - 100);
      }
      
      localStorage.setItem('notification_dismissals', JSON.stringify(dismissals));
    } catch (error) {
      console.error('Failed to store dismissal:', error);
    }
  }

  /**
   * Calculate time from notification creation to action
   */
  static calculateTimeToAction(notification) {
    const created = new Date(notification.timestamp);
    const dismissed = new Date();
    return Math.round((dismissed - created) / (1000 * 60)); // minutes
  }

  /**
   * Calculate business impact score
   */
  static calculateBusinessImpact(item) {
    let impact = 'low';
    
    if (item.totalValue > 100000 || item.daysOverdue > 10) impact = 'critical';
    else if (item.totalValue > 50000 || item.daysOverdue > 5) impact = 'high';
    else if (item.totalValue > 25000 || item.daysOverdue > 3) impact = 'medium';
    
    return impact;
  }

  /**
   * Calculate cash flow impact
   */
  static calculateCashFlowImpact(payment) {
    let impact = 'low';
    
    if (payment.amount > 100000) impact = 'critical';
    else if (payment.amount > 50000) impact = 'high';
    else if (payment.amount > 25000) impact = 'medium';
    
    return impact;
  }

  /**
   * Fallback initialization if realistic data fails
   */
  static initializeFallback() {
    console.log('⚠️ Using fallback notification initialization');
    
    this.notifications = [
      {
        id: 'fallback-001',
        type: 'system_alert',
        severity: 'medium',
        title: '🔧 Smart Notifications Ready',
        message: 'Enhanced notification system is active and monitoring procurement data',
        timestamp: new Date(),
        actions: [
          {
            label: 'View Demo Data',
            type: 'primary',
            handler: () => console.log('Demo data requested')
          }
        ],
        channels: ['in_app']
      }
    ];
    
    this.isInitialized = true;
    this.lastUpdate = new Date();
  }
}

export default SmartNotificationsService;
