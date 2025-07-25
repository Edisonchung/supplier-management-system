// Bank Payment Slip AI Extraction Service
// src/services/ai/BankPaymentSlipProcessor.js

import { parseNumber, parseAmount, formatCurrency } from './utils/numberParser';
import { normalizeDate } from './utils/dateUtils';

export class BankPaymentSlipProcessor {
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
    
    // Look for MYR amount patterns in
