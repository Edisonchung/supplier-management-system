/**
 * QuotationService.js
 * 
 * Core service for quotation management in HiggsFlow
 * 
 * Features:
 * - Quotation CRUD operations
 * - Line item management
 * - Pricing integration
 * - Dummy quote generation
 * - Cross-reference to Job Code, PI, PO
 * 
 * @version 1.0.0
 * @date January 2026
 */

import { 
  collection, doc, query, where, orderBy, getDocs, getDoc, 
  setDoc, updateDoc, deleteDoc, Timestamp, serverTimestamp,
  writeBatch, increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { cleanFirestoreData } from './firebase';

// ============================================================================
// CONSTANTS
// ============================================================================

export const QUOTATION_STATUS = {
  draft: { value: 'draft', label: 'Draft', color: 'gray' },
  pending_approval: { value: 'pending_approval', label: 'Pending Approval', color: 'yellow' },
  approved: { value: 'approved', label: 'Approved', color: 'blue' },
  sent: { value: 'sent', label: 'Sent to Client', color: 'indigo' },
  accepted: { value: 'accepted', label: 'Accepted', color: 'green' },
  rejected: { value: 'rejected', label: 'Rejected', color: 'red' },
  expired: { value: 'expired', label: 'Expired', color: 'orange' },
  converted: { value: 'converted', label: 'Converted to PO', color: 'purple' },
  cancelled: { value: 'cancelled', label: 'Cancelled', color: 'gray' }
};

export const CLIENT_TIERS = {
  end_user: { value: 'end_user', label: 'End User', defaultMarkup: 40 },
  contractor: { value: 'contractor', label: 'Contractor', defaultMarkup: 30 },
  trader: { value: 'trader', label: 'Trader', defaultMarkup: 25 },
  si: { value: 'si', label: 'System Integrator', defaultMarkup: 20 },
  partner: { value: 'partner', label: 'Partner', defaultMarkup: 15 },
  dealer: { value: 'dealer', label: 'Dealer', defaultMarkup: 10 },
  oem: { value: 'oem', label: 'OEM', defaultMarkup: 12 }
};

export const CURRENCIES = {
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  RMB: { code: 'RMB', symbol: '¥', name: 'Chinese Yuan' }
};

export const SHIPPING_METHODS = {
  air_freight: { value: 'air_freight', label: 'Air Freight' },
  sea_freight: { value: 'sea_freight', label: 'Sea Freight' },
  courier: { value: 'courier', label: 'Courier (DHL/FedEx)' },
  included: { value: 'included', label: 'Included in Price' },
  ex_works: { value: 'ex_works', label: 'Ex-Works' },
  fob: { value: 'fob', label: 'FOB' },
  cif: { value: 'cif', label: 'CIF' }
};

export const COMPANY_CODES = {
  FS: { id: 'flow-solution', code: 'FS', name: 'Flow Solution Sdn Bhd' },
  FSE: { id: 'flow-solution-engineering', code: 'FSE', name: 'Flow Solution Engineering Sdn Bhd' },
  FSP: { id: 'flow-solution-penang', code: 'FSP', name: 'Flow Solution (Penang) Sdn Bhd' },
  BWS: { id: 'broadwater-solution', code: 'BWS', name: 'Broadwater Solution Sdn Bhd' },
  BWE: { id: 'broadwater-engineering', code: 'BWE', name: 'Broadwater Engineering Sdn Bhd' },
  EMIT: { id: 'emi-technology', code: 'EMIT', name: 'EMI Technology Sdn Bhd' },
  EMIA: { id: 'emi-automation', code: 'EMIA', name: 'EMI Automation Sdn Bhd' },
  FTS: { id: 'futuresmiths', code: 'FTS', name: 'Futuresmiths Sdn Bhd' },
  IHS: { id: 'inhaus', code: 'IHS', name: 'Inhaus Sdn Bhd' }
};

// ============================================================================
// QUOTATION SERVICE CLASS
// ============================================================================

class QuotationService {
  static instance = null;

  static getInstance() {
    if (!QuotationService.instance) {
      QuotationService.instance = new QuotationService();
    }
    return QuotationService.instance;
  }

  // ==========================================================================
  // QUOTATION NUMBER GENERATION
  // ==========================================================================
  
  /**
   * Generate unique quotation number: QT-{COMPANY}-{YYYYMMDD}-{SEQ}
   */
  async generateQuotationNumber(companyCode) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const seqKey = `${companyCode}-${dateStr}`;
    
    // Get or create sequence document
    const seqRef = doc(db, 'quotationSequences', seqKey);
    const seqSnap = await getDoc(seqRef);
    
    let seq = 1;
    if (seqSnap.exists()) {
      seq = (seqSnap.data().lastSequence || 0) + 1;
    }
    
    // Update sequence
    await setDoc(seqRef, {
      companyCode,
      date: dateStr,
      lastSequence: seq,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return `QT-${companyCode}-${dateStr}-${String(seq).padStart(4, '0')}`;
  }

  // ==========================================================================
  // QUOTATION CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new quotation
   */
  async createQuotation(data, user) {
    try {
      // Validate required fields
      if (!data.companyCode || !data.clientId) {
        throw new Error('Company and Client are required');
      }
      
      // Generate quotation number
      const quotationNumber = await this.generateQuotationNumber(data.companyCode);
      
      // Calculate validity date
      const validityDays = data.validityDays || 30;
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + validityDays);
      
      // Build quotation document
      const quotation = {
        // Identification
        id: quotationNumber,
        quotationNumber,
        revision: 0,
        previousRevisionId: null,
        
        // Status
        status: 'draft',
        validityDays,
        validUntil: Timestamp.fromDate(validUntil),
        
        // Company
        companyId: COMPANY_CODES[data.companyCode]?.id || data.companyId,
        companyCode: data.companyCode,
        companyName: COMPANY_CODES[data.companyCode]?.name || data.companyName,
        branchId: data.branchId || null,
        
        // Client
        clientId: data.clientId,
        clientName: data.clientName || '',
        clientTier: data.clientTier || 'end_user',
        clientInternalCode: data.clientInternalCode || null,
        
        // Addresses
        billingAddress: data.billingAddress || {
          company: '',
          attention: '',
          address1: '',
          address2: '',
          city: '',
          state: '',
          postalCode: '',
          country: 'Malaysia'
        },
        deliveryAddress: data.deliveryAddress || null,
        deliverySameAsBilling: data.deliverySameAsBilling !== false,
        
        // Attention contacts (multiple PICs)
        attentionContacts: data.attentionContacts || [],
        
        // Details
        subject: data.subject || '',
        systemName: data.systemName || null,
        reference: data.reference || '',
        
        // Currency
        currency: data.currency || 'MYR',
        exchangeRate: data.exchangeRate || null,
        exchangeRateDate: data.exchangeRateDate || null,
        
        // Financials (initialized)
        subtotal: 0,
        discountType: data.discountType || 'none',
        discountPercentage: data.discountPercentage || 0,
        discountAmount: 0,
        taxType: data.taxType || 'none',
        taxRate: data.taxRate || 0,
        taxAmount: 0,
        shippingMethod: data.shippingMethod || null,
        shippingCost: data.shippingCost || 0,
        shippingIncluded: data.shippingIncluded || false,
        grandTotal: 0,
        grandTotalMYR: 0,
        
        // Terms
        paymentTerms: data.paymentTerms || '',
        deliveryTerms: data.deliveryTerms || '',
        deliveryLeadTime: data.deliveryLeadTime || '',
        warranty: data.warranty || '',
        
        // Cross-references
        jobCodeId: data.jobCodeId || null,
        jobCode: data.jobCode || null,
        relatedPIs: [],
        relatedPOs: [],
        
        // Notes
        notes: data.notes || '',
        internalNotes: data.internalNotes || '',
        termsAndConditions: data.termsAndConditions || '',
        
        // Dummy quote tracking
        isDummyQuote: false,
        masterQuoteId: null,
        dummyQuotes: [],
        
        // PDF configuration
        pdfConfig: data.pdfConfig || {
          showCostPrice: false,
          showMargin: false,
          showLineDiscount: true,
          showOverallDiscount: true,
          showDimensions: false,
          showWeight: false,
          showSKU: true,
          showClientMaterialCode: true,
          showLeadTime: true,
          showBrandLogo: true,
          showBankDetails: true,
          template: 'standard'
        },
        
        // Metadata
        createdBy: user.uid,
        createdByName: user.displayName || user.email,
        createdByEmail: user.email,
        createdAt: serverTimestamp(),
        updatedBy: null,
        updatedAt: null,
        approvedBy: null,
        approvedAt: null,
        sentAt: null,
        sentTo: [],
        
        // History
        history: [{
          action: 'created',
          by: user.uid,
          byName: user.displayName || user.email,
          at: Timestamp.now(),
          details: null
        }]
      };
      
      // Clean data before saving to Firestore
      const cleanedQuotation = cleanFirestoreData(quotation);
      
      // Save to Firestore
      await setDoc(doc(db, 'quotations', quotationNumber), cleanedQuotation);
      
      console.log('✅ Quotation created:', quotationNumber);
      
      return { 
        success: true, 
        data: { ...quotation, id: quotationNumber },
        quotationNumber 
      };
      
    } catch (error) {
      console.error('❌ Error creating quotation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get quotation by ID
   */
  async getQuotation(quotationId) {
    try {
      const quotationSnap = await getDoc(doc(db, 'quotations', quotationId));
      
      if (!quotationSnap.exists()) {
        return { success: false, error: 'Quotation not found' };
      }
      
      const quotation = { id: quotationSnap.id, ...quotationSnap.data() };
      
      // Fetch lines
      const linesQuery = query(
        collection(db, 'quotationLines'),
        where('quotationId', '==', quotationId),
        orderBy('lineNumber', 'asc')
      );
      const linesSnap = await getDocs(linesQuery);
      quotation.lines = linesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      return { success: true, data: quotation };
      
    } catch (error) {
      console.error('❌ Error fetching quotation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update quotation
   */
  async updateQuotation(quotationId, updates, user) {
    try {
      const quotationRef = doc(db, 'quotations', quotationId);
      
      // Get current quotation
      const currentSnap = await getDoc(quotationRef);
      if (!currentSnap.exists()) {
        return { success: false, error: 'Quotation not found' };
      }
      
      const current = currentSnap.data();
      
      // Prepare update data
      const updateData = {
        ...updates,
        updatedBy: user.uid,
        updatedAt: serverTimestamp()
      };
      
      // Add to history
      const historyEntry = {
        action: 'updated',
        by: user.uid,
        byName: user.displayName || user.email,
        at: Timestamp.now(),
        details: { fields: Object.keys(updates) }
      };
      
      updateData.history = [...(current.history || []), historyEntry];
      
      // Update document
      await updateDoc(quotationRef, updateData);
      
      console.log('✅ Quotation updated:', quotationId);
      
      return { success: true, data: { id: quotationId, ...updateData } };
      
    } catch (error) {
      console.error('❌ Error updating quotation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete quotation (soft delete - set status to cancelled)
   */
  async deleteQuotation(quotationId, user) {
    try {
      return await this.updateQuotation(quotationId, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: user.uid
      }, user);
    } catch (error) {
      console.error('❌ Error deleting quotation:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // QUOTATION LINES
  // ==========================================================================

  /**
   * Add line item to quotation
   */
  async addQuotationLine(quotationId, lineData, user) {
    try {
      // Get next line number
      const linesQuery = query(
        collection(db, 'quotationLines'),
        where('quotationId', '==', quotationId),
        orderBy('lineNumber', 'desc')
      );
      const linesSnap = await getDocs(linesQuery);
      const lastLineNumber = linesSnap.docs[0]?.data()?.lineNumber || 0;
      const newLineNumber = lastLineNumber + 10;
      
      // Create line ID
      const lineId = `${quotationId}-L${String(newLineNumber).padStart(4, '0')}`;
      
      // Calculate line total
      const quantity = lineData.quantity || 1;
      const unitPrice = lineData.unitPrice || 0;
      let lineTotal = quantity * unitPrice;
      
      // Apply line discount
      let lineDiscountAmount = 0;
      if (lineData.lineDiscountType === 'percentage' && lineData.lineDiscountPercentage) {
        lineDiscountAmount = lineTotal * (lineData.lineDiscountPercentage / 100);
      } else if (lineData.lineDiscountType === 'amount') {
        lineDiscountAmount = lineData.lineDiscountAmount || 0;
      }
      lineTotal -= lineDiscountAmount;
      
      // Build line document
      const line = {
        id: lineId,
        quotationId,
        lineNumber: newLineNumber,
        
        // Product identification
        productSource: lineData.productSource || 'manual',
        productId: lineData.productId || null,
        sku: lineData.sku || '',
        partNumber: lineData.partNumber || '',
        clientMaterialCode: lineData.clientMaterialCode || '',
        brand: lineData.brand || '',
        brandId: lineData.brandId || null,
        category: lineData.category || '',
        subcategory: lineData.subcategory || '',
        
        // Description (with suggestion tracking)
        descriptionSource: lineData.descriptionSource || 'standard',
        standardDescription: lineData.standardDescription || lineData.description || '',
        aiGeneratedDescription: lineData.aiGeneratedDescription || null,
        customDescription: lineData.customDescription || null,
        description: lineData.description || '',
        descriptionHistory: [],
        technicalSpecs: lineData.technicalSpecs || {},
        
        // Quantity and UoM
        quantity,
        uom: lineData.uom || 'pcs',
        
        // Pricing
        pricingSource: lineData.pricingSource || 'manual',
        listPrice: lineData.listPrice || null,
        listPriceCurrency: lineData.listPriceCurrency || null,
        discountFromList: lineData.discountFromList || null,
        discountCategory: lineData.discountCategory || null,
        discountModelSeries: lineData.discountModelSeries || null,
        discountMarketSegment: lineData.discountMarketSegment || null,
        nettCost: lineData.nettCost || null,
        nettCostCurrency: lineData.nettCostCurrency || null,
        lastPurchaseDate: lineData.lastPurchaseDate || null,
        lastPurchaseRef: lineData.lastPurchaseRef || null,
        marketPriceEstimate: lineData.marketPriceEstimate || null,
        costPrice: lineData.costPrice || 0,
        costPriceMYR: lineData.costPriceMYR || 0,
        
        // Markup
        markupType: lineData.markupType || 'percentage',
        markupPercentage: lineData.markupPercentage || 0,
        markupAmount: lineData.markupAmount || null,
        tierMarkup: lineData.tierMarkup || null,
        
        // Selling price
        unitPrice,
        
        // Line discount
        lineDiscountType: lineData.lineDiscountType || 'none',
        lineDiscountPercentage: lineData.lineDiscountPercentage || 0,
        lineDiscountAmount: Math.round(lineDiscountAmount * 100) / 100,
        
        // Line total
        lineTotal: Math.round(lineTotal * 100) / 100,
        
        // Dimensions
        dimensions: lineData.dimensions || null,
        
        // Weight
        weight: lineData.weight || null,
        
        // Delivery
        leadTime: lineData.leadTime || '',
        stockStatus: lineData.stockStatus || 'unknown',
        estimatedDelivery: lineData.estimatedDelivery || null,
        
        // Notes
        notes: lineData.notes || '',
        internalNotes: lineData.internalNotes || '',
        
        // System component
        isSystemComponent: lineData.isSystemComponent || false,
        systemName: lineData.systemName || null,
        componentGroup: lineData.componentGroup || null,
        
        // Visibility
        hideFromPDF: lineData.hideFromPDF || false,
        hiddenFields: lineData.hiddenFields || [],
        
        // Metadata
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: null
      };
      
      // Clean data before saving to Firestore
      const cleanedLine = cleanFirestoreData(line);
      
      // Save line
      await setDoc(doc(db, 'quotationLines', lineId), cleanedLine);
      
      // Recalculate quotation totals
      await this.recalculateQuotationTotals(quotationId);
      
      console.log('✅ Line added:', lineId);
      
      return { success: true, data: line };
      
    } catch (error) {
      console.error('❌ Error adding line:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update quotation line
   */
  async updateQuotationLine(lineId, updates, user) {
    try {
      const lineRef = doc(db, 'quotationLines', lineId);
      const lineSnap = await getDoc(lineRef);
      
      if (!lineSnap.exists()) {
        return { success: false, error: 'Line not found' };
      }
      
      const currentLine = lineSnap.data();
      
      // Recalculate line total if pricing changed
      let lineTotal = (updates.quantity || currentLine.quantity) * 
                      (updates.unitPrice || currentLine.unitPrice);
      
      let lineDiscountAmount = 0;
      const discountType = updates.lineDiscountType || currentLine.lineDiscountType;
      
      if (discountType === 'percentage') {
        const percentage = updates.lineDiscountPercentage || currentLine.lineDiscountPercentage || 0;
        lineDiscountAmount = lineTotal * (percentage / 100);
      } else if (discountType === 'amount') {
        lineDiscountAmount = updates.lineDiscountAmount || currentLine.lineDiscountAmount || 0;
      }
      
      lineTotal -= lineDiscountAmount;
      
      // Prepare update
      const updateData = {
        ...updates,
        lineDiscountAmount: Math.round(lineDiscountAmount * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
        updatedAt: serverTimestamp()
      };
      
      // Track description changes
      if (updates.description && updates.description !== currentLine.description) {
        updateData.descriptionHistory = [
          ...(currentLine.descriptionHistory || []),
          {
            type: updates.descriptionSource || 'custom',
            text: currentLine.description,
            by: user.uid,
            at: Timestamp.now()
          }
        ];
      }
      
      await updateDoc(lineRef, updateData);
      
      // Recalculate quotation totals
      await this.recalculateQuotationTotals(currentLine.quotationId);
      
      console.log('✅ Line updated:', lineId);
      
      return { success: true, data: { id: lineId, ...updateData } };
      
    } catch (error) {
      console.error('❌ Error updating line:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete quotation line
   */
  async deleteQuotationLine(lineId) {
    try {
      const lineRef = doc(db, 'quotationLines', lineId);
      const lineSnap = await getDoc(lineRef);
      
      if (!lineSnap.exists()) {
        return { success: false, error: 'Line not found' };
      }
      
      const quotationId = lineSnap.data().quotationId;
      
      await deleteDoc(lineRef);
      
      // Recalculate quotation totals
      await this.recalculateQuotationTotals(quotationId);
      
      console.log('✅ Line deleted:', lineId);
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Error deleting line:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // TOTALS CALCULATION
  // ==========================================================================

  /**
   * Recalculate quotation totals
   */
  async recalculateQuotationTotals(quotationId) {
    try {
      // Get all lines
      const linesQuery = query(
        collection(db, 'quotationLines'),
        where('quotationId', '==', quotationId)
      );
      const linesSnap = await getDocs(linesQuery);
      
      // Calculate subtotal
      let subtotal = 0;
      linesSnap.docs.forEach(doc => {
        const line = doc.data();
        if (!line.hideFromPDF) {
          subtotal += line.lineTotal || 0;
        }
      });
      
      // Get quotation for discount and tax settings
      const quotationSnap = await getDoc(doc(db, 'quotations', quotationId));
      const quotation = quotationSnap.data();
      
      // Calculate discount
      let discountAmount = 0;
      if (quotation.discountType === 'percentage' && quotation.discountPercentage) {
        discountAmount = subtotal * (quotation.discountPercentage / 100);
      } else if (quotation.discountType === 'lump_sum') {
        discountAmount = quotation.discountAmount || 0;
      }
      
      const afterDiscount = subtotal - discountAmount;
      
      // Calculate tax
      let taxAmount = 0;
      if (quotation.taxType === 'exclusive' && quotation.taxRate) {
        taxAmount = afterDiscount * (quotation.taxRate / 100);
      }
      
      // Add shipping (if not included)
      const shippingCost = quotation.shippingIncluded ? 0 : (quotation.shippingCost || 0);
      
      // Grand total
      const grandTotal = afterDiscount + taxAmount + shippingCost;
      
      // Update quotation
      await updateDoc(doc(db, 'quotations', quotationId), {
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount: Math.round(discountAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Quotation totals recalculated:', quotationId);
      
      return { 
        success: true, 
        data: { subtotal, discountAmount, taxAmount, grandTotal } 
      };
      
    } catch (error) {
      console.error('❌ Error recalculating totals:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // DUMMY QUOTE GENERATION
  // ==========================================================================

  /**
   * Create dummy quotes for multiple companies
   */
  async createDummyQuotes(masterQuotationId, targetCompanyCodes, user) {
    try {
      // Get master quotation
      const masterResult = await this.getQuotation(masterQuotationId);
      if (!masterResult.success) {
        return { success: false, error: 'Master quotation not found' };
      }
      
      const master = masterResult.data;
      const dummyQuotes = [];
      const batch = writeBatch(db);
      
      for (const companyCode of targetCompanyCodes) {
        // Skip if same company as master
        if (companyCode === master.companyCode) continue;
        
        // Generate new quotation number
        const dummyNumber = await this.generateQuotationNumber(companyCode);
        
        // Create dummy quotation
        const dummyQuote = {
          ...master,
          id: dummyNumber,
          quotationNumber: dummyNumber,
          companyId: COMPANY_CODES[companyCode]?.id,
          companyCode,
          companyName: COMPANY_CODES[companyCode]?.name,
          isDummyQuote: true,
          masterQuoteId: masterQuotationId,
          dummyQuotes: [],
          createdAt: serverTimestamp(),
          history: [{
            action: 'created_as_dummy',
            masterQuoteId: masterQuotationId,
            by: user.uid,
            byName: user.displayName || user.email,
            at: Timestamp.now()
          }]
        };
        
        // Remove lines from dummy (we'll copy them separately)
        delete dummyQuote.lines;
        
        batch.set(doc(db, 'quotations', dummyNumber), dummyQuote);
        
        // Copy lines
        for (const line of master.lines || []) {
          const newLineId = `${dummyNumber}-L${String(line.lineNumber).padStart(4, '0')}`;
          const dummyLine = {
            ...line,
            id: newLineId,
            quotationId: dummyNumber,
            createdAt: serverTimestamp()
          };
          batch.set(doc(db, 'quotationLines', newLineId), dummyLine);
        }
        
        dummyQuotes.push({
          quotationId: dummyNumber,
          companyId: COMPANY_CODES[companyCode]?.id,
          companyCode
        });
      }
      
      // Update master quotation with dummy references
      batch.update(doc(db, 'quotations', masterQuotationId), {
        dummyQuotes,
        updatedAt: serverTimestamp()
      });
      
      // Commit batch
      await batch.commit();
      
      console.log('✅ Dummy quotes created:', dummyQuotes.length);
      
      return { success: true, data: dummyQuotes };
      
    } catch (error) {
      console.error('❌ Error creating dummy quotes:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // STATUS MANAGEMENT
  // ==========================================================================

  /**
   * Update quotation status
   */
  async updateStatus(quotationId, newStatus, user, details = {}) {
    try {
      const quotationRef = doc(db, 'quotations', quotationId);
      const quotationSnap = await getDoc(quotationRef);
      
      if (!quotationSnap.exists()) {
        return { success: false, error: 'Quotation not found' };
      }
      
      const current = quotationSnap.data();
      const historyEntry = {
        action: `status_changed_to_${newStatus}`,
        by: user.uid,
        byName: user.displayName || user.email,
        at: Timestamp.now(),
        details: { from: current.status, to: newStatus, ...details }
      };
      
      const updateData = {
        status: newStatus,
        history: [...(current.history || []), historyEntry],
        updatedAt: serverTimestamp()
      };
      
      // Add specific timestamps based on status
      if (newStatus === 'approved') {
        updateData.approvedBy = user.uid;
        updateData.approvedAt = serverTimestamp();
      } else if (newStatus === 'sent') {
        updateData.sentAt = serverTimestamp();
        updateData.sentTo = details.sentTo || [];
      }
      
      await updateDoc(quotationRef, updateData);
      
      console.log('✅ Status updated:', quotationId, '->', newStatus);
      
      return { success: true, data: { status: newStatus } };
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // QUERY OPERATIONS
  // ==========================================================================

  /**
   * List quotations with filters
   */
  async listQuotations(filters = {}) {
    try {
      let q = collection(db, 'quotations');
      const constraints = [];
      
      // Apply filters
      if (filters.companyCode) {
        constraints.push(where('companyCode', '==', filters.companyCode));
      }
      if (filters.clientId) {
        constraints.push(where('clientId', '==', filters.clientId));
      }
      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      }
      if (filters.createdBy) {
        constraints.push(where('createdBy', '==', filters.createdBy));
      }
      if (filters.jobCode) {
        constraints.push(where('jobCode', '==', filters.jobCode));
      }
      
      // Add ordering
      constraints.push(orderBy('createdAt', 'desc'));
      
      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }
      
      const snapshot = await getDocs(q);
      const quotations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return { success: true, data: quotations };
      
    } catch (error) {
      console.error('❌ Error listing quotations:', error);
      return { success: false, error: error.message };
    }
  }

  // ==========================================================================
  // CROSS-REFERENCE LINKING
  // ==========================================================================

  /**
   * Link quotation to Job Code
   */
  async linkToJobCode(quotationId, jobCodeId, jobCode, user) {
    return await this.updateQuotation(quotationId, {
      jobCodeId,
      jobCode
    }, user);
  }

  /**
   * Link related PI to quotation
   */
  async linkPI(quotationId, piData, user) {
    try {
      const quotationSnap = await getDoc(doc(db, 'quotations', quotationId));
      if (!quotationSnap.exists()) {
        return { success: false, error: 'Quotation not found' };
      }
      
      const current = quotationSnap.data();
      const relatedPIs = [...(current.relatedPIs || [])];
      
      // Check if PI already linked
      if (!relatedPIs.find(pi => pi.piId === piData.piId)) {
        relatedPIs.push({
          piId: piData.piId,
          piNumber: piData.piNumber,
          date: piData.date || Timestamp.now()
        });
      }
      
      return await this.updateQuotation(quotationId, { relatedPIs }, user);
      
    } catch (error) {
      console.error('❌ Error linking PI:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Link related PO to quotation
   */
  async linkPO(quotationId, poData, user) {
    try {
      const quotationSnap = await getDoc(doc(db, 'quotations', quotationId));
      if (!quotationSnap.exists()) {
        return { success: false, error: 'Quotation not found' };
      }
      
      const current = quotationSnap.data();
      const relatedPOs = [...(current.relatedPOs || [])];
      
      // Check if PO already linked
      if (!relatedPOs.find(po => po.poId === poData.poId)) {
        relatedPOs.push({
          poId: poData.poId,
          poNumber: poData.poNumber,
          date: poData.date || Timestamp.now(),
          isClientPO: poData.isClientPO || false
        });
      }
      
      return await this.updateQuotation(quotationId, { relatedPOs }, user);
      
    } catch (error) {
      console.error('❌ Error linking PO:', error);
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

const quotationService = QuotationService.getInstance();
export default quotationService;
