// Bank Payment Slip AI Extraction Service
// src/services/ai/processors/BankPaymentSlipProcessor.js

import { parseNumber, parseAmount, formatCurrency } from './utils/numberParser';
import { normalizeDate } from './utils/dateUtils';

class BankPaymentSlipProcessor {
  /**
   * Process bank payment slip data (like HongLeong Bank payment advice)
   */
  static async process(rawData, file) {
    console.log('Processing Bank Payment Slip:', file.name);
    console.log('🔍 Raw extracted data structure:', JSON.stringify(rawData, null, 2));

    const extractedData = rawData.data || rawData;
    const paymentData = extractedData.payment_slip || extractedData.bank_payment || extractedData;

    console.log('🎯 Processing payment slip data:', JSON.stringify(paymentData, null, 2));

    const processedData = {
      documentType: 'bank_payment_slip',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // Transaction identification
      referenceNumber: this.extractReferenceNumber(paymentData),
      transactionId: this.extractValue(paymentData, ['transaction id', 'tx id', 'txn id']),
      paymentDate: normalizeDate(paymentData.payment_date || paymentData.transaction_date || paymentData.date || new Date()),
      
      // Bank details
      bankName: this.extractValue(paymentData, ['bank name', 'issuing bank', 'bank']) || 'Hong Leong Bank',
      branchName: this.extractValue(paymentData, ['branch name', 'branch']),
      accountNumber: this.extractValue(paymentData, ['account number', 'account no', 'debit account']),
      accountName: this.extractValue(paymentData, ['account name', 'account holder', 'debit account name']) || 'FLOW SOLUTION SDN BH',
      
      // Payment amounts
      paidCurrency: this.extractCurrency(paymentData, 'paid') || 'USD',
      paidAmount: this.extractPaidAmount(paymentData),
      debitCurrency: this.extractCurrency(paymentData, 'debit') || 'MYR',
      debitAmount: this.extractDebitAmount(paymentData),
      
      // Exchange information
      exchangeRate: this.calculateExchangeRate(paymentData),
      
      // Beneficiary details
      beneficiaryName: this.extractBeneficiaryName(paymentData),
      beneficiaryBank: this.extractValue(paymentData, ['beneficiary bank', 'receiving bank', 'correspondent bank']),
      beneficiaryAccount: this.extractValue(paymentData, ['beneficiary account', 'credit account']),
      beneficiaryCountry: this.extractValue(paymentData, ['country', 'beneficiary country', 'destination country']),
      beneficiaryAddress: this.extractValue(paymentData, ['beneficiary address', 'address']),
      
      // Additional costs and details
      bankCharges: this.extractAmount(paymentData, ['charges', 'bank charges', 'fees', 'commission']) || 50.00,
      swiftCode: this.extractValue(paymentData, ['swift', 'swift code', 'bic']),
      
      // Status and purpose
      status: this.extractValue(paymentData, ['status', 'transaction status']) || 'Completed',
      paymentPurpose: this.extractValue(paymentData, ['purpose', 'bop code', 'payment details', 'description']),
      chargeBearer: this.extractValue(paymentData, ['charge to', 'charges borne by']) || 'OUR',
      
      // Additional metadata
      makerDate: normalizeDate(paymentData.maker_date || paymentData.created_date),
      createdBy: this.extractValue(paymentData, ['created by', 'maker', 'prepared by']),
      
      // Auto-suggest related PIs based on beneficiary
      suggestedPIs: [] // Will be populated by the calling component
    };

    // Calculate total cost
    processedData.totalCost = processedData.debitAmount + processedData.bankCharges;

    console.log('✅ Processed bank payment slip data:', processedData);
    return processedData;
  }

  /**
   * Extract reference number with various patterns
   */
  static extractReferenceNumber(data) {
    // Common patterns for Malaysian bank reference numbers
    const patterns = [
      /[A-Z]\d{12,}/g,           // C776010725152519 (HongLeong pattern)
      /REF[:\s]*([A-Z0-9]+)/gi,  // REF: ABC123
      /REFERENCE[:\s]*([A-Z0-9]+)/gi, // REFERENCE: XYZ789
      /TXN[:\s]*([A-Z0-9]+)/gi,  // TXN: 123456
      /\b[A-Z]{2,3}\d{8,}\b/g    // Generic alphanumeric patterns
    ];
    
    const dataStr = JSON.stringify(data);
    
    for (const pattern of patterns) {
      const matches = dataStr.match(pattern);
      if (matches && matches.length > 0) {
        // Return the first match, clean it up
        return matches[0].replace(/^(REF|REFERENCE|TXN)[:\s]*/i, '');
      }
    }
    
    // Fallback to any field that might contain reference
    const refFields = ['reference_number', 'ref_no', 'transaction_ref', 'payment_ref'];
    for (const field of refFields) {
      if (data[field]) return data[field];
    }
    
    return '';
  }

  /**
   * Extract paid amount (foreign currency amount)
   */
  static extractPaidAmount(data) {
    // Look for foreign currency amount fields
    const paidAmountFields = [
      'debit_amount',      // Sometimes this is the foreign amount
      'payment_amount',    // Payment amount
      'foreign_amount',    // Explicit foreign amount
      'usd_amount',        // USD amount
      'transfer_amount',   // Transfer amount
      'principal_amount'   // Principal amount
    ];
    
    for (const field of paidAmountFields) {
      const amount = parseAmount(data[field]);
      if (amount > 0) return amount;
    }
    
    // Look for amount patterns in text
    const textAmount = this.extractAmountFromText(JSON.stringify(data), ['USD', 'SGD', 'EUR']);
    if (textAmount > 0) return textAmount;
    
    return 0;
  }

  /**
   * Extract debit amount (local currency amount - MYR)
   */
  static extractDebitAmount(data) {
    // Look for MYR amount fields
    const debitAmountFields = [
      'payment_amount',    // Sometimes this is the MYR amount
      'debit_amount_myr',  // Explicit MYR amount
      'local_amount',      // Local currency amount
      'myr_amount',        // MYR amount
      'total_debit',       // Total debit
      'equivalent_amount'  // Equivalent amount
    ];
    
    for (const field of debitAmountFields) {
      const amount = parseAmount(data[field]);
      if (amount > 0) return amount;
    }
    
    // Look for MYR amount patterns in text
    const textAmount = this.extractAmountFromText(JSON.stringify(data), ['MYR', 'RM']);
    if (textAmount > 0) return textAmount;
    
    return 0;
  }

  /**
   * Extract beneficiary name with cleaning
   */
  static extractBeneficiaryName(data) {
    const beneficiaryFields = [
      'beneficiary_name',
      'beneficiary',
      'payee_name',
      'payee',
      'recipient_name',
      'recipient',
      'to_name',
      'credit_party'
    ];
    
    for (const field of beneficiaryFields) {
      if (data[field]) {
        return this.cleanBeneficiaryName(data[field]);
      }
    }
    
    return '';
  }

  /**
   * Clean beneficiary name (remove extra spaces, normalize case)
   */
  static cleanBeneficiaryName(name) {
    if (!name) return '';
    
    return name
      .toString()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(COMPANY|CORP|CORPORATION|LTD|LIMITED|SDN BHD|PTE LTD)\s*/i, '')
      .replace(/\s+(COMPANY|CORP|CORPORATION|LTD|LIMITED|SDN BHD|PTE LTD)$/i, ' $1');
  }

  /**
   * Calculate exchange rate from amounts
   */
  static calculateExchangeRate(data) {
    const debitAmount = this.extractDebitAmount(data);
    const paidAmount = this.extractPaidAmount(data);
    
    if (debitAmount && paidAmount && paidAmount !== 0) {
      const rate = debitAmount / paidAmount;
      // Reasonable exchange rate range check (0.1 to 10)
      if (rate >= 0.1 && rate <= 10) {
        return parseFloat(rate.toFixed(4));
      }
    }
    
    // Look for explicit exchange rate field
    const rateFields = ['exchange_rate', 'rate', 'fx_rate', 'conversion_rate'];
    for (const field of rateFields) {
      const rate = parseNumber(data[field]);
      if (rate > 0 && rate >= 0.1 && rate <= 10) {
        return rate;
      }
    }
    
    return 1;
  }

  /**
   * Extract currency from context
   */
  static extractCurrency(data, context = '') {
    const currencyFields = context === 'paid' 
      ? ['paid_currency', 'foreign_currency', 'transfer_currency']
      : ['debit_currency', 'local_currency', 'base_currency'];
    
    for (const field of currencyFields) {
      if (data[field]) {
        const currency = data[field].toString().toUpperCase();
        if (['USD', 'EUR', 'SGD', 'MYR', 'CNY', 'JPY', 'GBP'].includes(currency)) {
          return currency;
        }
      }
    }
    
    // Look for currency patterns in text
    const dataStr = JSON.stringify(data);
    const currencyPatterns = context === 'paid'
      ? ['USD', 'EUR', 'SGD', 'CNY']
      : ['MYR', 'RM'];
    
    for (const currency of currencyPatterns) {
      if (dataStr.includes(currency)) {
        return currency === 'RM' ? 'MYR' : currency;
      }
    }
    
    return context === 'paid' ? 'USD' : 'MYR';
  }

  /**
   * Extract amount from text using currency context
   */
  static extractAmountFromText(text, currencies) {
    for (const currency of currencies) {
      const patterns = [
        new RegExp(`${currency}\\s*([\\d,]+\\.\\d{2})`, 'gi'),
        new RegExp(`([\\d,]+\\.\\d{2})\\s*${currency}`, 'gi'),
        new RegExp(`${currency === 'RM' ? 'RM' : currency}\\s*([\\d,]+)`, 'gi')
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const amount = parseAmount(match[1] || match[0]);
          if (amount > 0) return amount;
        }
      }
    }
    return 0;
  }

  /**
   * Extract generic value with multiple field variations
   */
  static extractValue(data, fieldVariations) {
    for (const field of fieldVariations) {
      // Direct field match
      if (data[field]) return data[field];
      
      // Underscore variation
      const underscoreField = field.replace(/\s+/g, '_').toLowerCase();
      if (data[underscoreField]) return data[underscoreField];
      
      // Camel case variation
      const camelField = field.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toLowerCase());
      if (data[camelField]) return data[camelField];
      
      // Pascal case variation
      const pascalField = field.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/^\w/, c => c.toUpperCase());
      if (data[pascalField]) return data[pascalField];
    }
    
    return '';
  }

  /**
   * Extract amount with currency symbol removal
   */
  static extractAmount(data, fieldVariations) {
    for (const field of fieldVariations) {
      const value = this.extractValue(data, [field]);
      if (value) {
        const amount = parseAmount(value);
        if (amount > 0) return amount;
      }
    }
    return 0;
  }

  /**
   * Find related PIs based on beneficiary name and amount
   */
  static async findRelatedPIs(extractedData, availablePIs = []) {
    if (!availablePIs.length) return [];
    
    const beneficiaryName = extractedData.beneficiaryName.toLowerCase();
    const paidAmount = extractedData.paidAmount;
    const paidCurrency = extractedData.paidCurrency;
    
    const suggestions = availablePIs.filter(pi => {
      // Skip fully paid PIs
      if ((pi.paymentStatus || 'pending') === 'paid') return false;
      
      // Match by supplier name (fuzzy matching)
      const supplierMatch = pi.supplierName?.toLowerCase().includes(
        beneficiaryName.substring(0, Math.min(10, beneficiaryName.length))
      ) || beneficiaryName.includes(
        pi.supplierName?.toLowerCase().substring(0, Math.min(10, pi.supplierName?.length || 0)) || ''
      );
      
      // Match by currency
      const currencyMatch = pi.currency === paidCurrency;
      
      // Match by amount proximity (within 50% range)
      const remainingAmount = pi.totalAmount - (pi.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
      const amountMatch = Math.abs(remainingAmount - paidAmount) < paidAmount * 0.5;
      
      return supplierMatch || (currencyMatch && amountMatch);
    });
    
    // Sort by relevance (supplier name match first, then currency + amount)
    return suggestions.sort((a, b) => {
      const aSupplierMatch = a.supplierName?.toLowerCase().includes(beneficiaryName.substring(0, 10)) ? 1 : 0;
      const bSupplierMatch = b.supplierName?.toLowerCase().includes(beneficiaryName.substring(0, 10)) ? 1 : 0;
      
      if (aSupplierMatch !== bSupplierMatch) {
        return bSupplierMatch - aSupplierMatch;
      }
      
      // Secondary sort by amount proximity
      const aRemainingAmount = a.totalAmount - (a.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
      const bRemainingAmount = b.totalAmount - (b.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
      
      const aDiff = Math.abs(aRemainingAmount - paidAmount);
      const bDiff = Math.abs(bRemainingAmount - paidAmount);
      
      return aDiff - bDiff;
    });
  }

  /**
   * Validate extracted data
   */
  static validateExtractedData(data) {
    const errors = [];
    const warnings = [];
    
    // Required fields validation
    if (!data.referenceNumber) {
      errors.push('Reference number is required');
    }
    
    if (!data.paidAmount || data.paidAmount <= 0) {
      errors.push('Valid paid amount is required');
    }
    
    if (!data.debitAmount || data.debitAmount <= 0) {
      errors.push('Valid debit amount is required');
    }
    
    if (!data.beneficiaryName) {
      warnings.push('Beneficiary name not found');
    }
    
    // Exchange rate validation
    if (data.exchangeRate < 0.1 || data.exchangeRate > 10) {
      warnings.push('Exchange rate seems unusual');
    }
    
    // Amount consistency check
    const calculatedRate = data.debitAmount / data.paidAmount;
    if (Math.abs(calculatedRate - data.exchangeRate) > 0.1) {
      warnings.push('Exchange rate may not match the amount calculation');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}

// Export for use in AIExtractionService
export { BankPaymentSlipProcessor };

// Enhanced AI Extraction Service integration
// Add this method to your existing AIExtractionService.js

export const AIExtractionServiceExtension = {
  /**
   * Process bank payment slip
   */
  async processBankPaymentSlip(file) {
    console.log('🏦 Processing bank payment slip:', file.name);
    
    try {
      // Prepare form data for backend
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'bank_payment_slip');
      formData.append('extractionLevel', 'detailed');
      
      // Call your AI backend
      const response = await fetch(`${import.meta.env.VITE_AI_BACKEND_URL}/extract`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`AI extraction failed: ${response.statusText}`);
      }
      
      const rawData = await response.json();
      
      // Process with BankPaymentSlipProcessor
      const processedData = await BankPaymentSlipProcessor.process(rawData, file);
      
      // Validate the extracted data
      const validation = BankPaymentSlipProcessor.validateExtractedData(processedData);
      
      if (!validation.isValid) {
        console.warn('⚠️ Validation errors:', validation.errors);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', validation.warnings);
      }
      
      return {
        ...processedData,
        validation,
        confidence: rawData.confidence || 0.85
      };
      
    } catch (error) {
      console.error('❌ Bank payment slip extraction failed:', error);
      
      // Fallback to mock data for development
      if (import.meta.env.MODE === 'development') {
        console.log('🔄 Using mock bank payment slip data for development');
        
        return {
          documentType: 'bank_payment_slip',
          fileName: file.name,
          extractedAt: new Date().toISOString(),
          
          // Mock data based on your HongLeong slip
          referenceNumber: `C${Date.now().toString().slice(-12)}`,
          paymentDate: new Date().toISOString().split('T')[0],
          bankName: 'Hong Leong Bank',
          accountNumber: '17301010259',
          accountName: 'FLOW SOLUTION SDN BH',
          
          paidCurrency: 'USD',
          paidAmount: 5796.00,
          debitCurrency: 'MYR',
          debitAmount: 25757.42,
          exchangeRate: 4.4449,
          
          beneficiaryName: 'HENGSHUI ANZHISHUN TECHNOLOGY CO.,LTD',
          beneficiaryBank: 'JPMorgan Chase Bank NA',
          beneficiaryCountry: 'HONG KONG',
          
          bankCharges: 50.00,
          totalCost: 25807.42,
          status: 'Completed',
          paymentPurpose: '300-Goods',
          
          validation: {
            isValid: true,
            errors: [],
            warnings: []
          },
          confidence: 0.90
        };
      }
      
      throw error;
    }
  }
};
