// src/services/notifications/EmailNotificationService.js
/**
 * Email Notification Service for HiggsFlow Phase 3B-2
 * Enables external notification delivery via email
 * 
 * Integration Options:
 * 1. EmailJS (Free tier - 200 emails/month)
 * 2. SendGrid (Free tier - 100 emails/day)
 * 3. Nodemailer with SMTP (Self-hosted)
 * 
 * Features:
 * - Professional email templates
 * - Priority-based delivery
 * - Delivery tracking
 * - Batch sending capabilities
 * - Template customization
 */

class EmailNotificationService {
  static isInitialized = false;
  static emailProvider = null;
  static deliveryHistory = [];
  static templates = {};

  // Email provider configurations
  static PROVIDERS = {
    EMAILJS: {
      name: 'EmailJS',
      setupRequired: ['serviceId', 'templateId', 'publicKey'],
      freeLimit: 200, // per month
      pros: ['Easy setup', 'Client-side sending', 'Good for demos'],
      cons: ['Limited customization', 'Visible API keys']
    },
    SENDGRID: {
      name: 'SendGrid',
      setupRequired: ['apiKey', 'fromEmail'],
      freeLimit: 100, // per day
      pros: ['Professional delivery', 'Advanced analytics', 'High deliverability'],
      cons: ['Requires backend', 'More complex setup']
    },
    SMTP: {
      name: 'Custom SMTP',
      setupRequired: ['host', 'port', 'username', 'password'],
      freeLimit: 'Varies',
      pros: ['Full control', 'No vendor lock-in', 'Custom branding'],
      cons: ['Requires server', 'Delivery management']
    }
  };

  /**
   * Initialize email service with provider configuration
   */
  static async initialize(provider = 'EMAILJS', config = {}) {
    try {
      console.log(`📧 Initializing Email Service with ${provider}...`);
      
      this.emailProvider = provider;
      this.loadTemplates();
      
      // Validate provider configuration
      const requiredFields = this.PROVIDERS[provider]?.setupRequired || [];
      const missing = requiredFields.filter(field => !config[field]);
      
      if (missing.length > 0) {
        console.warn(`⚠️ Missing configuration for ${provider}:`, missing);
        this.initializeMockMode();
        return false;
      }
      
      // Initialize specific provider
      switch (provider) {
        case 'EMAILJS':
          await this.initializeEmailJS(config);
          break;
        case 'SENDGRID':
          await this.initializeSendGrid(config);
          break;
        case 'SMTP':
          await this.initializeSMTP(config);
          break;
        default:
          throw new Error(`Unsupported email provider: ${provider}`);
      }
      
      this.isInitialized = true;
      console.log(`✅ Email Service initialized successfully with ${provider}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Email Service:', error);
      this.initializeMockMode();
      return false;
    }
  }

  /**
   * Initialize EmailJS provider (easiest for demo/testing)
   */
  static async initializeEmailJS(config) {
    // EmailJS configuration for client-side email sending
    this.emailConfig = {
      serviceId: config.serviceId || process.env.REACT_APP_EMAILJS_SERVICE_ID,
      templateId: config.templateId || process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      publicKey: config.publicKey || process.env.REACT_APP_EMAILJS_PUBLIC_KEY
    };
    
    // Load EmailJS library if not already loaded
    if (typeof window !== 'undefined' && !window.emailjs) {
      await this.loadEmailJSScript();
    }
    
    console.log('📧 EmailJS configured for client-side sending');
  }

  /**
   * Load EmailJS script dynamically
   */
  static loadEmailJSScript() {
    return new Promise((resolve, reject) => {
      if (window.emailjs) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.onload = () => {
        window.emailjs.init(this.emailConfig.publicKey);
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize mock mode for testing/demo
   */
  static initializeMockMode() {
    console.log('🔧 Email Service running in MOCK MODE - emails will be logged only');
    this.emailProvider = 'MOCK';
    this.isInitialized = true;
    this.loadTemplates();
  }

  /**
   * Load email templates
   */
  static loadTemplates() {
    this.templates = {
      delivery_overdue: {
        subject: '🚚 HiggsFlow Alert: Delivery Overdue - {{poNumber}}',
        template: 'delivery_overdue',
        priority: 'high'
      },
      payment_due: {
        subject: '💰 HiggsFlow Alert: Payment Due - {{invoiceNumber}}',
        template: 'payment_due',
        priority: 'medium'
      },
      compliance_alert: {
        subject: '⚖️ HiggsFlow Alert: Compliance Issue - {{poNumber}}',
        template: 'compliance_alert',
        priority: 'critical'
      },
      supplier_alert: {
        subject: '📊 HiggsFlow Alert: Supplier Performance - {{supplierName}}',
        template: 'supplier_alert',
        priority: 'medium'
      },
      budget_alert: {
        subject: '📈 HiggsFlow Alert: Budget Variance - {{department}}',
        template: 'budget_alert',
        priority: 'medium'
      },
      daily_summary: {
        subject: '📋 HiggsFlow Daily Summary - {{date}}',
        template: 'daily_summary',
        priority: 'low'
      }
    };
  }

  /**
   * Send notification email
   */
  static async sendNotificationEmail(notification, recipients = [], options = {}) {
    if (!this.isInitialized) {
      console.warn('⚠️ Email service not initialized, using mock mode');
      this.initializeMockMode();
    }

    try {
      const emailData = this.prepareEmailData(notification, recipients, options);
      
      let result;
      switch (this.emailProvider) {
        case 'EMAILJS':
          result = await this.sendViaEmailJS(emailData);
          break;
        case 'SENDGRID':
          result = await this.sendViaSendGrid(emailData);
          break;
        case 'SMTP':
          result = await this.sendViaSMTP(emailData);
          break;
        case 'MOCK':
        default:
          result = await this.sendViaMock(emailData);
          break;
      }
      
      // Record delivery attempt
      this.recordDelivery(notification, recipients, result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prepare email data from notification
   */
  static prepareEmailData(notification, recipients, options) {
    const template = this.templates[notification.type] || this.templates.delivery_overdue;
    
    // Default recipients for different notification types
    const defaultRecipients = this.getDefaultRecipients(notification.type);
    const finalRecipients = recipients.length > 0 ? recipients : defaultRecipients;
    
    // Prepare template variables
    const templateVars = {
      ...notification.details,
      title: notification.title,
      message: notification.message,
      severity: notification.severity,
      timestamp: new Date().toLocaleString(),
      appUrl: process.env.REACT_APP_BASE_URL || 'https://supplier-management-system-one.vercel.app',
      ...options.templateVars
    };

    return {
      to: finalRecipients,
      subject: this.interpolateTemplate(template.subject, templateVars),
      htmlContent: this.generateEmailHTML(notification, templateVars),
      textContent: this.generateEmailText(notification, templateVars),
      priority: template.priority,
      templateVars: templateVars,
      notificationId: notification.id
    };
  }

  /**
   * Get default recipients based on notification type
   */
  static getDefaultRecipients(notificationType) {
    const defaultRecipients = {
      delivery_overdue: ['procurement@higgsflow.com', 'operations@higgsflow.com'],
      payment_due: ['finance@higgsflow.com', 'accounting@higgsflow.com'],
      compliance_alert: ['compliance@higgsflow.com', 'legal@higgsflow.com'],
      supplier_alert: ['procurement@higgsflow.com', 'supplier-relations@higgsflow.com'],
      budget_alert: ['finance@higgsflow.com', 'budget@higgsflow.com'],
      daily_summary: ['management@higgsflow.com']
    };
    
    return defaultRecipients[notificationType] || ['admin@higgsflow.com'];
  }

  /**
   * Generate HTML email content
   */
  static generateEmailHTML(notification, vars) {
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c', 
      medium: '#d97706',
      low: '#65a30d'
    };
    
    const severityColor = severityColors[notification.severity] || '#6b7280';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HiggsFlow Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🏭 HiggsFlow Procurement</h1>
            <p style="color: #d1d5db; margin: 5px 0 0 0; font-size: 14px;">Smart Procurement Management</p>
        </div>
        
        <!-- Alert Badge -->
        <div style="padding: 20px; text-align: center; background-color: #f9fafb;">
            <div style="display: inline-block; background-color: ${severityColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px;">
                ${notification.severity} Priority
            </div>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 30px;">
            <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">${notification.title}</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.5; margin: 0 0 25px 0;">${notification.message}</p>
            
            <!-- Details Section -->
            ${this.generateDetailsSection(notification.details)}
            
            <!-- Actions Section -->
            ${this.generateActionsSection(notification.actions, vars.appUrl)}
            
            <!-- Footer Info -->
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    📅 Generated: ${vars.timestamp}<br>
                    🔗 HiggsFlow Procurement System<br>
                    ⚡ This is an automated alert from your Smart Notifications system
                </p>
            </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 12px; margin: 0;">
                <a href="${vars.appUrl}" style="color: #3b82f6; text-decoration: none;">Open HiggsFlow Dashboard</a> | 
                <a href="${vars.appUrl}/notifications" style="color: #3b82f6; text-decoration: none;">View All Alerts</a>
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate details section for email
   */
  static generateDetailsSection(details) {
    if (!details || Object.keys(details).length === 0) return '';
    
    const keyMappings = {
      poNumber: 'PO Number',
      supplier: 'Supplier',
      supplierName: 'Supplier',
      value: 'Value',
      amount: 'Amount',
      daysOverdue: 'Days Overdue',
      daysUntilDue: 'Days Until Due',
      dueDate: 'Due Date',
      trackingNumber: 'Tracking',
      carrier: 'Carrier'
    };
    
    let detailsHTML = '<div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;"><h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📋 Details</h3>';
    
    Object.entries(details).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'riskFactors' && key !== 'actions') {
        const label = keyMappings[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        let displayValue = value;
        
        // Format specific types
        if (key.includes('Date') && typeof value === 'string') {
          displayValue = new Date(value).toLocaleDateString();
        } else if ((key === 'value' || key === 'amount') && typeof value === 'number') {
          displayValue = `$${value.toLocaleString()}`;
        }
        
        detailsHTML += `<p style="margin: 5px 0; color: #4b5563; font-size: 14px;"><strong>${label}:</strong> ${displayValue}</p>`;
      }
    });
    
    detailsHTML += '</div>';
    return detailsHTML;
  }

  /**
   * Generate actions section for email
   */
  static generateActionsSection(actions, appUrl) {
    if (!actions || actions.length === 0) return '';
    
    let actionsHTML = '<div style="margin: 25px 0;"><h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">🎯 Recommended Actions</h3>';
    
    actions.forEach((action, index) => {
      const buttonColors = {
        primary: '#3b82f6',
        secondary: '#6b7280',
        success: '#10b981',
        danger: '#ef4444'
      };
      
      const color = buttonColors[action.type] || buttonColors.primary;
      
      actionsHTML += `
        <a href="${appUrl}/notifications" 
           style="display: inline-block; background-color: ${color}; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 6px; margin: 5px 10px 5px 0; font-weight: 500; font-size: 14px;">
          ${action.label}
        </a>`;
    });
    
    actionsHTML += '</div>';
    return actionsHTML;
  }

  /**
   * Generate plain text email content
   */
  static generateEmailText(notification, vars) {
    let text = `HiggsFlow Procurement Alert\n`;
    text += `========================\n\n`;
    text += `${notification.title}\n`;
    text += `Priority: ${notification.severity.toUpperCase()}\n`;
    text += `Time: ${vars.timestamp}\n\n`;
    text += `${notification.message}\n\n`;
    
    if (notification.details) {
      text += `Details:\n`;
      text += `--------\n`;
      Object.entries(notification.details).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          text += `${key}: ${value}\n`;
        }
      });
      text += `\n`;
    }
    
    text += `Open HiggsFlow Dashboard: ${vars.appUrl}\n`;
    text += `View All Notifications: ${vars.appUrl}/notifications\n\n`;
    text += `This is an automated alert from HiggsFlow Smart Notifications.`;
    
    return text;
  }

  /**
   * Send via EmailJS (demo/testing)
   */
  static async sendViaEmailJS(emailData) {
    if (typeof window === 'undefined' || !window.emailjs) {
      throw new Error('EmailJS not available in this environment');
    }
    
    try {
      const templateParams = {
        to_email: emailData.to.join(', '),
        subject: emailData.subject,
        html_content: emailData.htmlContent,
        text_content: emailData.textContent,
        ...emailData.templateVars
      };
      
      const result = await window.emailjs.send(
        this.emailConfig.serviceId,
        this.emailConfig.templateId,
        templateParams
      );
      
      return {
        success: true,
        messageId: result.text,
        provider: 'EmailJS',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('EmailJS sending failed:', error);
      return {
        success: false,
        error: error.message,
        provider: 'EmailJS'
      };
    }
  }

  /**
   * Send via mock (testing/demo)
   */
  static async sendViaMock(emailData) {
    console.log('📧 MOCK EMAIL SENT:');
    console.log('To:', emailData.to);
    console.log('Subject:', emailData.subject);
    console.log('Priority:', emailData.priority);
    console.log('Content Preview:', emailData.textContent.substring(0, 200) + '...');
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      messageId: `mock-${Date.now()}`,
      provider: 'Mock',
      timestamp: new Date().toISOString(),
      mockData: {
        to: emailData.to,
        subject: emailData.subject,
        contentLength: emailData.htmlContent.length
      }
    };
  }

  /**
   * Record email delivery attempt
   */
  static recordDelivery(notification, recipients, result) {
    const delivery = {
      notificationId: notification.id,
      type: notification.type,
      severity: notification.severity,
      recipients: recipients,
      timestamp: new Date().toISOString(),
      success: result.success,
      provider: result.provider,
      messageId: result.messageId,
      error: result.error || null
    };
    
    this.deliveryHistory.push(delivery);
    
    // Keep only last 100 deliveries in memory
    if (this.deliveryHistory.length > 100) {
      this.deliveryHistory.shift();
    }
    
    // Store in localStorage for persistence
    try {
      localStorage.setItem('email_delivery_history', JSON.stringify(this.deliveryHistory.slice(-50)));
    } catch (error) {
      console.error('Failed to store delivery history:', error);
    }
  }

  /**
   * Get email delivery statistics
   */
  static getDeliveryStats() {
    const total = this.deliveryHistory.length;
    const successful = this.deliveryHistory.filter(d => d.success).length;
    const failed = total - successful;
    
    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? ((successful / total) * 100).toFixed(1) : '0',
      lastDelivery: this.deliveryHistory.length > 0 ? this.deliveryHistory[this.deliveryHistory.length - 1] : null
    };
  }

  /**
   * Template interpolation helper
   */
  static interpolateTemplate(template, vars) {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      return vars[key] || match;
    });
  }

  /**
   * Send batch notifications (for daily summaries, etc.)
   */
  static async sendBatchNotifications(notifications, recipients = [], options = {}) {
    const results = [];
    
    for (const notification of notifications) {
      const result = await this.sendNotificationEmail(notification, recipients, options);
      results.push(result);
      
      // Add delay between emails to avoid rate limiting
      if (results.length < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Test email configuration
   */
  static async testConfiguration() {
    const testNotification = {
      id: 'test-email-001',
      type: 'delivery_overdue',
      severity: 'medium',
      title: '🧪 Test Email Configuration',
      message: 'This is a test email to verify HiggsFlow email notification setup',
      details: {
        poNumber: 'TEST-001',
        supplier: 'Test Supplier',
        value: 1000
      },
      actions: [
        { label: 'View Dashboard', type: 'primary' }
      ]
    };
    
    const result = await this.sendNotificationEmail(testNotification, ['test@example.com']);
    
    console.log('📧 Email configuration test result:', result);
    return result;
  }
}

export default EmailNotificationService;
