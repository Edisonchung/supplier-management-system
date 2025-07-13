// src/services/data/SampleDataService.js
/**
 * Enhanced Sample Data Service for HiggsFlow Phase 3B-2
 * Generates realistic procurement data for Smart Notifications
 * 
 * Features:
 * - 50+ realistic procurement scenarios
 * - Overdue deliveries with varying severity
 * - Urgent payments and cash flow alerts  
 * - Supplier performance insights
 * - Cost optimization opportunities
 * - Risk assessment data
 */

class SampleDataService {
  static suppliers = [
    {
      id: "SUP-001",
      name: "TechFlow Solutions",
      contact: { name: "Sarah Chen", email: "sarah.chen@techflow.com", phone: "+1-555-0123" },
      rating: 4.2,
      onTimeDelivery: 87,
      paymentTerms: "Net 10"
    },
    {
      id: "SUP-002", 
      name: "Global Office Supplies",
      contact: { name: "Mike Rodriguez", email: "mike.r@globalsupply.com", phone: "+1-555-0234" },
      rating: 4.7,
      onTimeDelivery: 94,
      paymentTerms: "Net 30"
    },
    {
      id: "SUP-003",
      name: "Industrial Equipment Corp",
      contact: { name: "Lisa Wang", email: "l.wang@indequip.com", phone: "+1-555-0345" },
      rating: 3.8,
      onTimeDelivery: 76,
      paymentTerms: "Net 15"
    },
    {
      id: "SUP-004",
      name: "Prime Logistics Inc",
      contact: { name: "David Johnson", email: "d.johnson@primelogistics.com", phone: "+1-555-0456" },
      rating: 4.5,
      onTimeDelivery: 91,
      paymentTerms: "Net 21"
    },
    {
      id: "SUP-005",
      name: "EcoFriendly Materials",
      contact: { name: "Amanda Green", email: "a.green@ecomaterials.com", phone: "+1-555-0567" },
      rating: 4.1,
      onTimeDelivery: 89,
      paymentTerms: "Net 14"
    }
  ];

  static departments = [
    "IT", "Operations", "Marketing", "Finance", "HR", "Facilities", "R&D", "Sales"
  ];

  static categories = [
    "Technology", "Office Supplies", "Equipment", "Services", "Materials", "Software", "Maintenance"
  ];

  /**
   * Generate complete realistic procurement dataset
   */
  static generateRealisticScenarios() {
    const now = new Date();
    
    return {
      // Critical overdue deliveries - immediate attention needed
      overdueDeliveries: this.generateOverdueDeliveries(15),
      
      // Urgent payments in next 3 days
      urgentPayments: this.generateUrgentPayments(8),
      
      // At-risk deliveries (weather, supplier issues, etc.)
      atRiskDeliveries: this.generateAtRiskDeliveries(12),
      
      // Cost optimization opportunities
      costOptimizations: this.generateCostOptimizations(5),
      
      // Supplier performance alerts
      supplierAlerts: this.generateSupplierAlerts(3),
      
      // Budget variance warnings
      budgetAlerts: this.generateBudgetAlerts(4),
      
      // Compliance and approval issues
      complianceAlerts: this.generateComplianceAlerts(6),
      
      // Summary metrics for dashboard
      summaryMetrics: this.generateSummaryMetrics()
    };
  }

  /**
   * Generate overdue deliveries with escalating severity
   */
  static generateOverdueDeliveries(count = 15) {
    const overdueDeliveries = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const supplier = this.getRandomSupplier();
      const daysOverdue = Math.floor(Math.random() * 14) + 1; // 1-14 days overdue
      const estimatedDelivery = new Date(now.getTime() - (daysOverdue * 24 * 60 * 60 * 1000));
      const value = this.generateRandomValue(500, 75000);
      
      // Determine urgency based on days overdue and value
      let urgencyLevel = "medium";
      if (daysOverdue >= 10 || value > 50000) urgencyLevel = "critical";
      else if (daysOverdue >= 5 || value > 25000) urgencyLevel = "high";
      else if (daysOverdue <= 2) urgencyLevel = "medium";

      const delivery = {
        id: `DT-2025-${String(i + 1).padStart(3, '0')}`,
        poNumber: `PO-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        supplierName: supplier.name,
        supplierContact: supplier.contact,
        items: this.generateRandomItems(1, 3),
        orderDate: new Date(estimatedDelivery.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString(),
        estimatedDelivery: estimatedDelivery.toISOString(),
        actualDelivery: null,
        currentStatus: "overdue",
        daysOverdue: daysOverdue,
        trackingNumber: this.generateTrackingNumber(),
        carrier: this.getRandomCarrier(),
        totalValue: value,
        currency: "USD",
        urgencyLevel: urgencyLevel,
        riskFactors: this.generateRiskFactors(daysOverdue, value),
        deliveryAddress: this.getDefaultDeliveryAddress(),
        lastUpdate: new Date(now.getTime() - (Math.random() * 24 * 60 * 60 * 1000)).toISOString(),
        escalationLevel: daysOverdue > 7 ? "management" : daysOverdue > 3 ? "supervisor" : "normal"
      };

      overdueDeliveries.push(delivery);
    }

    // Sort by urgency and days overdue (most critical first)
    return overdueDeliveries.sort((a, b) => {
      const urgencyOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      if (urgencyOrder[a.urgencyLevel] !== urgencyOrder[b.urgencyLevel]) {
        return urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel];
      }
      return b.daysOverdue - a.daysOverdue;
    });
  }

  /**
   * Generate urgent payments due in next 3 days
   */
  static generateUrgentPayments(count = 8) {
    const urgentPayments = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const supplier = this.getRandomSupplier();
      const daysUntilDue = Math.floor(Math.random() * 4); // 0-3 days until due
      const dueDate = new Date(now.getTime() + (daysUntilDue * 24 * 60 * 60 * 1000));
      const amount = this.generateRandomValue(1000, 100000);
      
      let urgencyLevel = "medium";
      if (daysUntilDue === 0) urgencyLevel = "critical"; // Due today
      else if (daysUntilDue === 1) urgencyLevel = "high"; // Due tomorrow
      else if (amount > 50000) urgencyLevel = "high"; // High value

      const payment = {
        id: `PT-2025-${String(i + 1).padStart(3, '0')}`,
        invoiceNumber: `INV-${supplier.name.substring(0, 3).toUpperCase()}-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        poNumber: `PO-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        supplierName: supplier.name,
        supplierContact: supplier.contact,
        invoiceDate: new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000)).toISOString(),
        dueDate: dueDate.toISOString(),
        amount: amount,
        currency: "USD",
        status: "pending",
        paymentTerms: supplier.paymentTerms,
        urgencyLevel: urgencyLevel,
        daysUntilDue: daysUntilDue,
        approvals: this.generateApprovals(),
        categories: [this.getRandomCategory()],
        riskScore: Math.floor(Math.random() * 3) + 1, // 1-3 risk score
        paymentHistory: {
          onTimePayments: Math.floor(Math.random() * 20) + 10,
          latePayments: Math.floor(Math.random() * 3),
          totalPayments: Math.floor(Math.random() * 25) + 15,
          averageDaysToPayment: Math.random() * 10 + 5
        },
        discountAvailable: Math.random() > 0.7 ? {
          percentage: 2,
          deadline: new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString()
        } : null
      };

      urgentPayments.push(payment);
    }

    return urgentPayments.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  /**
   * Generate at-risk deliveries (weather, supplier issues, etc.)
   */
  static generateAtRiskDeliveries(count = 12) {
    const atRiskDeliveries = [];
    const now = new Date();

    const riskTypes = [
      { type: "weather_delay", severity: "medium", description: "Severe weather in shipping route" },
      { type: "supplier_issue", severity: "high", description: "Supplier reporting production delays" },
      { type: "carrier_delay", severity: "medium", description: "Carrier experiencing high volume" },
      { type: "quality_hold", severity: "high", description: "Quality inspection hold at origin" },
      { type: "customs_delay", severity: "medium", description: "Customs processing delay" },
      { type: "inventory_shortage", severity: "critical", description: "Supplier inventory shortage" }
    ];

    for (let i = 0; i < count; i++) {
      const supplier = this.getRandomSupplier();
      const risk = riskTypes[Math.floor(Math.random() * riskTypes.length)];
      const expectedDelay = Math.floor(Math.random() * 7) + 1; // 1-7 days delay
      const originalDelivery = new Date(now.getTime() + (Math.random() * 14 * 24 * 60 * 60 * 1000));
      const adjustedDelivery = new Date(originalDelivery.getTime() + (expectedDelay * 24 * 60 * 60 * 1000));

      const delivery = {
        id: `AR-2025-${String(i + 1).padStart(3, '0')}`,
        poNumber: `PO-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        supplierName: supplier.name,
        supplierContact: supplier.contact,
        originalDeliveryDate: originalDelivery.toISOString(),
        adjustedDeliveryDate: adjustedDelivery.toISOString(),
        expectedDelay: expectedDelay,
        riskType: risk.type,
        riskDescription: risk.description,
        severity: risk.severity,
        totalValue: this.generateRandomValue(2000, 50000),
        currency: "USD",
        mitigationActions: this.generateMitigationActions(risk.type),
        estimatedImpact: this.calculateRiskImpact(risk.type, expectedDelay),
        lastUpdate: new Date(now.getTime() - (Math.random() * 6 * 60 * 60 * 1000)).toISOString()
      };

      atRiskDeliveries.push(delivery);
    }

    return atRiskDeliveries.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate cost optimization opportunities
   */
  static generateCostOptimizations(count = 5) {
    const optimizations = [];
    
    const opportunityTypes = [
      { type: "bulk_discount", description: "Combine orders for bulk pricing", potentialSavings: 0.15 },
      { type: "alternative_supplier", description: "Lower cost supplier available", potentialSavings: 0.22 },
      { type: "contract_renegotiation", description: "Contract renewal opportunity", potentialSavings: 0.18 },
      { type: "payment_terms", description: "Early payment discount available", potentialSavings: 0.02 },
      { type: "shipping_optimization", description: "Consolidate shipments", potentialSavings: 0.08 }
    ];

    for (let i = 0; i < count; i++) {
      const opportunity = opportunityTypes[i % opportunityTypes.length];
      const currentSpend = this.generateRandomValue(10000, 200000);
      const potentialSavings = currentSpend * opportunity.potentialSavings;

      const optimization = {
        id: `CO-2025-${String(i + 1).padStart(3, '0')}`,
        type: opportunity.type,
        description: opportunity.description,
        currentAnnualSpend: currentSpend,
        potentialAnnualSavings: potentialSavings,
        savingsPercentage: opportunity.potentialSavings * 100,
        confidence: Math.floor(Math.random() * 30) + 70, // 70-100% confidence
        implementationEffort: this.getImplementationEffort(opportunity.type),
        timeToRealize: this.getTimeToRealize(opportunity.type),
        affectedSuppliers: this.getRandomSupplier().name,
        category: this.getRandomCategory(),
        priority: potentialSavings > 20000 ? "high" : potentialSavings > 10000 ? "medium" : "low"
      };

      optimizations.push(optimization);
    }

    return optimizations.sort((a, b) => b.potentialAnnualSavings - a.potentialAnnualSavings);
  }

  /**
   * Generate supplier performance alerts
   */
  static generateSupplierAlerts(count = 3) {
    const alerts = [];

    for (let i = 0; i < count; i++) {
      const supplier = this.suppliers[i];
      const alertTypes = [
        { type: "declining_performance", severity: "medium" },
        { type: "quality_issues", severity: "high" },
        { type: "payment_disputes", severity: "medium" }
      ];
      
      const alertType = alertTypes[i % alertTypes.length];
      
      const alert = {
        id: `SA-2025-${String(i + 1).padStart(3, '0')}`,
        supplierName: supplier.name,
        supplierContact: supplier.contact,
        alertType: alertType.type,
        severity: alertType.severity,
        description: this.getSupplierAlertDescription(alertType.type, supplier),
        metrics: {
          onTimeDelivery: supplier.onTimeDelivery,
          qualityRating: supplier.rating,
          responseTime: Math.floor(Math.random() * 48) + 12, // 12-60 hours
          issueResolutionTime: Math.floor(Math.random() * 120) + 24 // 24-144 hours
        },
        trendAnalysis: {
          lastQuarter: Math.random() > 0.5 ? "improving" : "declining",
          yearOverYear: Math.random() > 0.6 ? "stable" : "declining"
        },
        recommendedActions: this.getSupplierRecommendations(alertType.type),
        riskLevel: alertType.severity === "high" ? "high" : "medium"
      };

      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Generate budget variance alerts
   */
  static generateBudgetAlerts(count = 4) {
    const alerts = [];
    const departments = this.departments.slice(0, count);

    departments.forEach((dept, i) => {
      const budgetAmount = this.generateRandomValue(50000, 500000);
      const spentAmount = budgetAmount * (0.7 + (Math.random() * 0.4)); // 70-110% of budget
      const variance = ((spentAmount - budgetAmount) / budgetAmount) * 100;
      
      const alert = {
        id: `BA-2025-${String(i + 1).padStart(3, '0')}`,
        department: dept,
        budgetPeriod: "Q3 2025",
        budgetAmount: budgetAmount,
        spentAmount: spentAmount,
        remainingAmount: budgetAmount - spentAmount,
        variancePercentage: variance,
        severity: Math.abs(variance) > 10 ? "high" : "medium",
        projectedYearEnd: spentAmount * (12 / 9), // Projected full year spend
        riskLevel: variance > 0 ? "over_budget" : "under_budget",
        category: this.getRandomCategory(),
        lastUpdated: new Date().toISOString()
      };

      alerts.push(alert);
    });

    return alerts.sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage));
  }

  /**
   * Generate compliance and approval alerts
   */
  static generateComplianceAlerts(count = 6) {
    const alerts = [];
    
    const complianceTypes = [
      { type: "missing_approval", severity: "high", description: "Purchase order pending required approval" },
      { type: "contract_expiry", severity: "medium", description: "Supplier contract expiring soon" },
      { type: "certification_required", severity: "medium", description: "Supplier certification verification needed" },
      { type: "policy_violation", severity: "high", description: "Purchase exceeds approval limits" },
      { type: "documentation_incomplete", severity: "medium", description: "Required documentation missing" },
      { type: "audit_flag", severity: "critical", description: "Transaction flagged for audit review" }
    ];

    for (let i = 0; i < count; i++) {
      const compliance = complianceTypes[i % complianceTypes.length];
      const supplier = this.getRandomSupplier();

      const alert = {
        id: `CA-2025-${String(i + 1).padStart(3, '0')}`,
        type: compliance.type,
        severity: compliance.severity,
        description: compliance.description,
        poNumber: `PO-2025-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        supplierName: supplier.name,
        amount: this.generateRandomValue(5000, 150000),
        daysOpen: Math.floor(Math.random() * 14) + 1,
        assignedTo: this.getRandomApprover(),
        requiredActions: this.getComplianceActions(compliance.type),
        deadline: new Date(Date.now() + (Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        riskImpact: this.getComplianceRisk(compliance.type)
      };

      alerts.push(alert);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate summary metrics for dashboard
   */
  static generateSummaryMetrics() {
    return {
      totalActiveAlerts: 53,
      criticalAlerts: 8,
      overdueDeliveries: 15,
      urgentPayments: 8,
      potentialSavings: 145000,
      averageResponseTime: "4.2 hours",
      complianceScore: 92,
      supplierPerformance: 4.1,
      budgetUtilization: 87,
      riskExposure: "Medium",
      trends: {
        alertVolume: "increasing",
        responseTime: "improving",
        costSavings: "trending_up"
      }
    };
  }

  // Helper methods for data generation
  static getRandomSupplier() {
    return this.suppliers[Math.floor(Math.random() * this.suppliers.length)];
  }

  static getRandomCategory() {
    return this.categories[Math.floor(Math.random() * this.categories.length)];
  }

  static getRandomCarrier() {
    const carriers = ["UPS", "FedEx", "DHL", "USPS", "Amazon Logistics"];
    return carriers[Math.floor(Math.random() * carriers.length)];
  }

  static generateTrackingNumber() {
    return `1Z${Math.random().toString(36).substring(2, 15).toUpperCase()}`;
  }

  static generateRandomValue(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  static generateRandomItems(minItems = 1, maxItems = 3) {
    const itemTemplates = [
      { sku: "LAP-001", description: "Dell Latitude Laptop", unitPrice: 1299.99 },
      { sku: "MON-002", description: "27-inch 4K Monitor", unitPrice: 449.99 },
      { sku: "CHR-003", description: "Ergonomic Office Chair", unitPrice: 299.99 },
      { sku: "DSK-004", description: "Standing Desk", unitPrice: 599.99 },
      { sku: "PRN-005", description: "Color Laser Printer", unitPrice: 399.99 }
    ];

    const itemCount = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
    const items = [];

    for (let i = 0; i < itemCount; i++) {
      const template = itemTemplates[Math.floor(Math.random() * itemTemplates.length)];
      const quantity = Math.floor(Math.random() * 10) + 1;
      
      items.push({
        sku: template.sku,
        description: template.description,
        quantity: quantity,
        unitPrice: template.unitPrice,
        totalValue: quantity * template.unitPrice
      });
    }

    return items;
  }

  static generateRiskFactors(daysOverdue, value) {
    const factors = [];
    if (daysOverdue > 7) factors.push("significant_delay");
    if (value > 50000) factors.push("high_value_shipment");
    if (Math.random() > 0.7) factors.push("weather_risk");
    if (Math.random() > 0.8) factors.push("carrier_issues");
    return factors;
  }

  static getDefaultDeliveryAddress() {
    return {
      company: "HiggsFlow Corp",
      street: "123 Innovation Drive",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      country: "USA"
    };
  }

  static generateApprovals() {
    const approvers = ["Mike Johnson", "Sarah Smith", "David Lee", "Jennifer Liu"];
    return [
      {
        approver: approvers[Math.floor(Math.random() * approvers.length)],
        role: "Procurement Manager",
        status: "approved",
        timestamp: new Date(Date.now() - (Math.random() * 48 * 60 * 60 * 1000)).toISOString(),
        comments: "Approved for payment processing"
      }
    ];
  }

  static generateMitigationActions(riskType) {
    const actions = {
      weather_delay: ["Monitor weather reports", "Identify alternative routes", "Contact carrier for updates"],
      supplier_issue: ["Escalate to supplier management", "Review alternative suppliers", "Adjust delivery timeline"],
      carrier_delay: ["Switch to expedited shipping", "Use alternative carrier", "Consolidate shipments"],
      quality_hold: ["Review quality standards", "Work with supplier QC", "Expedite inspection"],
      customs_delay: ["Verify documentation", "Contact customs broker", "Prepare for inspection"],
      inventory_shortage: ["Source from alternative supplier", "Adjust order quantities", "Reschedule delivery"]
    };
    return actions[riskType] || ["Monitor situation", "Update stakeholders"];
  }

  static calculateRiskImpact(riskType, delayDays) {
    const baseImpact = delayDays * 1000; // $1000 per day delay
    const typeMultiplier = {
      weather_delay: 1.2,
      supplier_issue: 1.5,
      carrier_delay: 1.1,
      quality_hold: 2.0,
      customs_delay: 1.3,
      inventory_shortage: 2.5
    };
    return baseImpact * (typeMultiplier[riskType] || 1.0);
  }

  static getImplementationEffort(type) {
    const efforts = {
      bulk_discount: "Low",
      alternative_supplier: "Medium",
      contract_renegotiation: "High",
      payment_terms: "Low",
      shipping_optimization: "Medium"
    };
    return efforts[type] || "Medium";
  }

  static getTimeToRealize(type) {
    const timeframes = {
      bulk_discount: "1-2 weeks",
      alternative_supplier: "4-6 weeks",
      contract_renegotiation: "2-3 months",
      payment_terms: "Immediate",
      shipping_optimization: "2-4 weeks"
    };
    return timeframes[type] || "1 month";
  }

  static getSupplierAlertDescription(type, supplier) {
    const descriptions = {
      declining_performance: `${supplier.name} on-time delivery has declined to ${supplier.onTimeDelivery}% (below 90% threshold)`,
      quality_issues: `${supplier.name} quality rating dropped to ${supplier.rating}/5.0 with recent quality complaints`,
      payment_disputes: `${supplier.name} has disputed 2 recent payments, requiring resolution`
    };
    return descriptions[type] || `Performance issue detected with ${supplier.name}`;
  }

  static getSupplierRecommendations(type) {
    const recommendations = {
      declining_performance: ["Schedule supplier review meeting", "Implement performance improvement plan", "Consider backup supplier"],
      quality_issues: ["Conduct quality audit", "Review quality standards", "Implement corrective action plan"],
      payment_disputes: ["Review payment terms", "Schedule dispute resolution meeting", "Update payment processes"]
    };
    return recommendations[type] || ["Monitor performance", "Schedule review"];
  }

  static getRandomApprover() {
    const approvers = ["Mike Johnson", "Sarah Smith", "David Lee", "Jennifer Liu", "Robert Chen"];
    return approvers[Math.floor(Math.random() * approvers.length)];
  }

  static getComplianceActions(type) {
    const actions = {
      missing_approval: ["Route for approval", "Notify approver", "Update approval workflow"],
      contract_expiry: ["Review contract terms", "Initiate renewal process", "Prepare new contract"],
      certification_required: ["Request supplier certificates", "Verify compliance", "Update supplier records"],
      policy_violation: ["Review purchase limits", "Escalate to management", "Update approval process"],
      documentation_incomplete: ["Request missing documents", "Update file records", "Verify completeness"],
      audit_flag: ["Prepare audit documentation", "Review transaction details", "Coordinate with auditors"]
    };
    return actions[type] || ["Review requirements", "Take corrective action"];
  }

  static getComplianceRisk(type) {
    const risks = {
      missing_approval: "Process delay, audit findings",
      contract_expiry: "Service interruption, price increases",
      certification_required: "Compliance violation, audit risk",
      policy_violation: "Governance breach, financial risk",
      documentation_incomplete: "Audit findings, process inefficiency",
      audit_flag: "Compliance review, potential penalties"
    };
    return risks[type] || "Process compliance risk";
  }

  /**
   * Save generated data to localStorage for persistence
   */
  static saveToStorage(data) {
    try {
      localStorage.setItem('higgsflow_realistic_data', JSON.stringify(data));
      localStorage.setItem('higgsflow_data_generated', new Date().toISOString());
      return true;
    } catch (error) {
      console.error('Failed to save realistic data:', error);
      return false;
    }
  }

  /**
   * Load realistic data from localStorage
   */
  static loadFromStorage() {
    try {
      const data = localStorage.getItem('higgsflow_realistic_data');
      const generated = localStorage.getItem('higgsflow_data_generated');
      
      if (data && generated) {
        const generatedDate = new Date(generated);
        const now = new Date();
        const hoursDiff = (now - generatedDate) / (1000 * 60 * 60);
        
        // Regenerate data if older than 24 hours
        if (hoursDiff < 24) {
          return JSON.parse(data);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load realistic data:', error);
      return null;
    }
  }

  /**
   * Get fresh realistic data (generates new or loads cached)
   */
  static getRealisticData() {
    // Try to load from storage first
    let data = this.loadFromStorage();
    
    // Generate new data if not available or expired
    if (!data) {
      data = this.generateRealisticScenarios();
      this.saveToStorage(data);
    }
    
    return data;
  }
}

export default SampleDataService;
