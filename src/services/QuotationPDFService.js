/**
 * QuotationPDFService.js
 * PDF generation for quotations with company letterheads and configurable visibility
 * Part of HiggsFlow Quotation System
 */

import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Singleton instance
let instance = null;

class QuotationPDFService {
  constructor() {
    if (instance) {
      return instance;
    }
    
    this.letterheadCache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
    
    instance = this;
  }

  /**
   * Generate PDF for a quotation
   * @param {string} quotationId - Quotation ID
   * @param {Object} options - Generation options
   * @returns {Promise<Blob>} - PDF blob
   */
  async generatePDF(quotationId, options = {}) {
    const {
      includeInternalNotes = false,
      includeCostInfo = false,
      includeMargin = false,
      forceRefresh = false
    } = options;

    // Fetch quotation data
    const quotation = await this.fetchQuotationData(quotationId);
    if (!quotation) {
      throw new Error('Quotation not found');
    }

    // Fetch company letterhead
    const letterhead = await this.getLetterhead(quotation.company.id, forceRefresh);
    
    // Fetch quotation lines
    const lines = await this.fetchQuotationLines(quotationId);

    // Apply visibility rules
    const visibleLines = this.applyVisibility(lines, quotation.pdfConfig, {
      includeCostInfo,
      includeMargin
    });

    // Generate PDF document
    const pdfData = this.buildPDFDocument(quotation, visibleLines, letterhead, {
      includeInternalNotes,
      includeCostInfo,
      includeMargin
    });

    return pdfData;
  }

  /**
   * Fetch quotation data from Firestore
   */
  async fetchQuotationData(quotationId) {
    try {
      const quotationRef = doc(db, 'quotations', quotationId);
      const quotationSnap = await getDoc(quotationRef);
      
      if (!quotationSnap.exists()) {
        return null;
      }

      return {
        id: quotationSnap.id,
        ...quotationSnap.data(),
        createdAt: quotationSnap.data().createdAt?.toDate?.() || new Date(),
        validUntil: quotationSnap.data().validUntil?.toDate?.() || null,
        sentAt: quotationSnap.data().sentAt?.toDate?.() || null
      };
    } catch (error) {
      console.error('Error fetching quotation:', error);
      throw error;
    }
  }

  /**
   * Fetch quotation lines
   */
  async fetchQuotationLines(quotationId) {
    try {
      const linesQuery = query(
        collection(db, 'quotationLines'),
        where('quotationId', '==', quotationId),
        orderBy('lineNumber', 'asc')
      );
      const linesSnap = await getDocs(linesQuery);
      
      return linesSnap.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(line => !line.hideFromPDF); // Filter out hidden lines
    } catch (error) {
      console.error('Error fetching quotation lines:', error);
      throw error;
    }
  }

  /**
   * Get company letterhead with caching
   */
  async getLetterhead(companyId, forceRefresh = false) {
    const cacheKey = companyId;
    const cached = this.letterheadCache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const letterheadRef = doc(db, 'companyLetterheads', companyId);
      const letterheadSnap = await getDoc(letterheadRef);
      
      if (!letterheadSnap.exists()) {
        // Return default letterhead if company-specific not found
        return this.getDefaultLetterhead(companyId);
      }

      const letterhead = {
        id: letterheadSnap.id,
        ...letterheadSnap.data()
      };

      this.letterheadCache.set(cacheKey, {
        data: letterhead,
        timestamp: Date.now()
      });

      return letterhead;
    } catch (error) {
      console.error('Error fetching letterhead:', error);
      return this.getDefaultLetterhead(companyId);
    }
  }

  /**
   * Get default letterhead template
   */
  getDefaultLetterhead(companyId) {
    const companyDefaults = {
      FS: {
        name: 'Flow Solution Sdn. Bhd.',
        registrationNumber: '201401006543 (1082113-D)',
        address: 'No. 25, Jalan TSB 25/9, Taman Industri Sungai Buloh, 47000 Sungai Buloh, Selangor',
        phone: '+603-6156 3263',
        fax: '+603-6156 3261',
        email: 'sales@flowsolution.com.my',
        website: 'www.flowsolution.com.my',
        logo: null,
        primaryColor: '#1e40af',
        secondaryColor: '#3b82f6'
      },
      FSE: {
        name: 'Flow Solution Engineering Sdn. Bhd.',
        registrationNumber: '201801006789 (1234567-X)',
        address: 'No. 25, Jalan TSB 25/9, Taman Industri Sungai Buloh, 47000 Sungai Buloh, Selangor',
        phone: '+603-6156 3263',
        fax: '+603-6156 3261',
        email: 'engineering@flowsolution.com.my',
        website: 'www.flowsolution.com.my',
        logo: null,
        primaryColor: '#059669',
        secondaryColor: '#10b981'
      },
      FSP: {
        name: 'Flow Solution Projects Sdn. Bhd.',
        registrationNumber: '201901007890 (2345678-Y)',
        address: 'No. 25, Jalan TSB 25/9, Taman Industri Sungai Buloh, 47000 Sungai Buloh, Selangor',
        phone: '+603-6156 3263',
        fax: '+603-6156 3261',
        email: 'projects@flowsolution.com.my',
        website: 'www.flowsolution.com.my',
        logo: null,
        primaryColor: '#7c3aed',
        secondaryColor: '#8b5cf6'
      }
    };

    const defaults = companyDefaults[companyId] || companyDefaults.FS;
    
    return {
      id: companyId,
      company: defaults,
      fonts: {
        primary: 'Helvetica',
        secondary: 'Helvetica'
      },
      margins: {
        top: 100,
        right: 50,
        bottom: 80,
        left: 50
      },
      headerTemplate: null,
      footerTemplate: null,
      bankAccounts: [
        {
          bankName: 'Maybank',
          accountName: defaults.name,
          accountNumber: '5121 4568 7890',
          swiftCode: 'MABORJMYKL'
        }
      ],
      signatory: {
        name: 'Authorized Signatory',
        position: 'Sales Manager',
        signature: null
      }
    };
  }

  /**
   * Apply visibility rules to lines
   */
  applyVisibility(lines, pdfConfig = {}, options = {}) {
    const {
      showCostPrice = false,
      showMargin = false,
      showLineDiscount = true,
      showDimensions = false,
      showWeight = false,
      showSKU = true,
      showClientMaterialCode = true,
      showLeadTime = true,
      showBrandLogo = false
    } = pdfConfig;

    return lines.map(line => {
      const visibleLine = { ...line };
      const hiddenFields = line.hiddenFields || [];

      // Apply pdfConfig visibility
      if (!showCostPrice && !options.includeCostInfo) {
        delete visibleLine.pricing?.costPrice;
        delete visibleLine.pricing?.nettCost;
        delete visibleLine.pricing?.listPrice;
      }

      if (!showMargin && !options.includeMargin) {
        delete visibleLine.pricing?.marginPercent;
        delete visibleLine.pricing?.marginAmount;
      }

      if (!showLineDiscount) {
        delete visibleLine.pricing?.lineDiscount;
      }

      if (!showDimensions) {
        delete visibleLine.dimensions;
      }

      if (!showWeight) {
        delete visibleLine.weight;
      }

      if (!showSKU) {
        delete visibleLine.product?.sku;
      }

      if (!showClientMaterialCode) {
        delete visibleLine.clientMaterialCode;
      }

      if (!showLeadTime) {
        delete visibleLine.leadTime;
      }

      // Apply line-specific hidden fields
      hiddenFields.forEach(field => {
        const parts = field.split('.');
        let obj = visibleLine;
        for (let i = 0; i < parts.length - 1; i++) {
          if (obj[parts[i]]) {
            obj = obj[parts[i]];
          }
        }
        delete obj[parts[parts.length - 1]];
      });

      return visibleLine;
    });
  }

  /**
   * Build PDF document structure
   */
  buildPDFDocument(quotation, lines, letterhead, options = {}) {
    const {
      includeInternalNotes = false,
      includeCostInfo = false,
      includeMargin = false
    } = options;

    // This returns data structure for PDF generation
    // Actual PDF rendering is done by React component using @react-pdf/renderer
    return {
      letterhead,
      quotation: {
        number: quotation.quotationNumber,
        date: this.formatDate(quotation.createdAt),
        validUntil: this.formatDate(quotation.validUntil),
        reference: quotation.referenceNumber,
        revisionNumber: quotation.revisionNumber,
        currency: quotation.currency
      },
      client: {
        name: quotation.client?.name,
        code: quotation.client?.code,
        tier: quotation.client?.tier,
        billingAddress: quotation.billingAddress,
        deliveryAddress: quotation.deliveryAddress,
        attentionContacts: quotation.attentionContacts
      },
      lines: lines.map((line, index) => ({
        lineNumber: index + 1,
        sku: line.product?.sku,
        partNumber: line.product?.partNumber,
        brand: line.product?.brand,
        description: line.description?.displayText || line.description?.standardText,
        clientMaterialCode: line.clientMaterialCode,
        quantity: line.quantity,
        unit: line.unit || 'pcs',
        unitPrice: line.pricing?.unitPrice,
        lineTotal: line.pricing?.lineTotal,
        discount: line.pricing?.lineDiscount,
        dimensions: line.dimensions,
        weight: line.weight,
        leadTime: line.leadTime,
        // Only include if options allow
        ...(includeCostInfo && {
          costPrice: line.pricing?.costPrice,
          nettCost: line.pricing?.nettCost
        }),
        ...(includeMargin && {
          marginPercent: line.pricing?.marginPercent,
          marginAmount: line.pricing?.marginAmount
        })
      })),
      totals: {
        subtotal: quotation.totals?.subtotal,
        discount: {
          type: quotation.discount?.type,
          value: quotation.discount?.value,
          amount: quotation.totals?.discountAmount
        },
        tax: {
          rate: quotation.taxRate,
          amount: quotation.totals?.taxAmount
        },
        shipping: {
          method: quotation.shipping?.method,
          cost: quotation.totals?.shippingCost
        },
        grandTotal: quotation.totals?.grandTotal
      },
      terms: {
        payment: quotation.paymentTerms,
        delivery: quotation.deliveryTerms,
        termsAndConditions: quotation.termsAndConditions
      },
      notes: quotation.notes,
      internalNotes: includeInternalNotes ? quotation.internalNotes : null,
      jobCode: quotation.jobCode,
      createdBy: quotation.createdBy?.name,
      approvedBy: quotation.approvedBy?.name
    };
  }

  /**
   * Format date for PDF
   */
  formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-MY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Format currency for PDF
   */
  formatCurrency(amount, currency = 'MYR') {
    return new Intl.NumberFormat('en-MY', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  }

  /**
   * Generate PDF blob using server-side rendering
   * This calls an API endpoint that uses puppeteer or similar
   */
  async generatePDFBlob(quotationId, options = {}) {
    try {
      const response = await fetch(`/api/quotations/${quotationId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      return await response.blob();
    } catch (error) {
      console.error('Error generating PDF blob:', error);
      throw error;
    }
  }

  /**
   * Download PDF
   */
  async downloadPDF(quotationId, filename = null, options = {}) {
    try {
      const blob = await this.generatePDFBlob(quotationId, options);
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `quotation-${quotationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  /**
   * Preview PDF in new tab
   */
  async previewPDF(quotationId, options = {}) {
    try {
      const blob = await this.generatePDFBlob(quotationId, options);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      // Clean up URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      
      return true;
    } catch (error) {
      console.error('Error previewing PDF:', error);
      throw error;
    }
  }

  /**
   * Generate PDF for email attachment
   */
  async generatePDFForEmail(quotationId, options = {}) {
    const pdfData = await this.generatePDF(quotationId, options);
    const blob = await this.generatePDFBlob(quotationId, options);
    
    // Convert to base64 for email attachment
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          filename: `${pdfData.quotation.number}.pdf`,
          content: reader.result.split(',')[1], // base64 content
          contentType: 'application/pdf'
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Clear letterhead cache
   */
  clearCache() {
    this.letterheadCache.clear();
  }
}

// Export singleton
export default new QuotationPDFService();
export { QuotationPDFService };
