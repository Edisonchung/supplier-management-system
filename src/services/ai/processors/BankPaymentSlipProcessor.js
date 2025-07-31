// Updated BankPaymentSlipProcessor.js - Unified with AIExtractionService
// src/services/ai/processors/BankPaymentSlipProcessor.js

import { AIExtractionService } from '../AIExtractionService';

class BankPaymentSlipProcessor {
  /**
   * Process bank payment slip using the unified AIExtractionService
   */
  static async process(file) {
    console.log('🏦 Processing Bank Payment Slip via unified AI service:', file.name);

    try {
      // Step 1: Use the main AIExtractionService (same as POModal/PIModal)
      const extractionResult = await AIExtractionService.extractFromFile(file, {
        documentType: 'bank_payment_slip',
        extractionMode: 'bank_payment',
        includeMetadata: true
      });

      if (!extractionResult.success) {
        throw new Error(extractionResult.error || 'AI extraction failed');
      }

      console.log('✅ AI extraction successful:', extractionResult.data);

      // Step 2: Process and validate the AI-extracted data
      const processedData = this.processAIExtractedData(extractionResult.data, file);

      // Step 3: Enhance with business logic
      const enhancedData = this.enhancePaymentData(processedData);

      console.log('🔍 Final processed payment data:', enhancedData);
      return enhancedData;

    } catch (error) {
      console.error('❌ Unified AI extraction failed:', error);
      
      // Fallback to local processing only in development
      if (import.meta.env.MODE === 'development') {
        console.log('🔄 Falling back to local processing for development');
        return this.fallbackLocalProcessing(file);
      }
      
      throw new Error(`Failed to process payment slip: ${error.message}`);
    }
  }

  /**
   * Process AI-extracted data from Railway backend
   */
  static processAIExtractedData(aiData, file) {
    console.log('🔍 Processing AI extracted bank payment data...');

    // The Railway backend will return structured data like:
    // {
    //   "bank_payment": {
    //     "reference_number": "C716200525115916",
    //     "payment_amount": 1860.00,
    //     "currency": "USD",
    //     "beneficiary": "Qingzhou Tianhong Electromechanical Co. LTD",
    //     "payment_details": "TH-202500135,202500134,202500182"
    //   }
    // }

    const bankPayment = aiData.bank_payment || aiData;
    
    return {
      documentType: 'bank_payment_slip',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // Transaction details - mapped from AI extraction
      referenceNumber: bankPayment.reference_number || bankPayment.referenceNumber,
      paymentDate: this.parseDate(bankPayment.payment_date || bankPayment.paymentDate),
      
      // Bank information
      bankName: bankPayment.bank_name || 'Hong Leong Bank',
      accountNumber: bankPayment.account_number || bankPayment.accountNumber,
      accountName: bankPayment.account_name || 'FLOW SOLUTION SDN BH',
      
      // Payment amounts
      paidCurrency: bankPayment.paid_currency || 'USD',
      paidAmount: parseFloat(bankPayment.payment_amount || bankPayment.paidAmount || 0),
      debitCurrency: bankPayment.debit_currency || 'MYR',
      debitAmount: parseFloat(bankPayment.debit_amount || bankPayment.debitAmount || 0),
      exchangeRate: parseFloat(bankPayment.exchange_rate || bankPayment.exchangeRate || 4.44),
      
      // Beneficiary details
      beneficiaryName: bankPayment.beneficiary_name || bankPayment.beneficiary,
      beneficiaryBank: bankPayment.beneficiary_bank || bankPayment.beneficiaryBank,
      beneficiaryCountry: bankPayment.beneficiary_country || 'HONG KONG',
      
      // Additional details
      bankCharges: parseFloat(bankPayment.bank_charges || bankPayment.charges || 50.00),
      status: bankPayment.status || 'Completed',
      
      // Extract PI references from payment details
      piReferences: this.extractPIReferences(bankPayment.payment_details || ''),
      
      // AI metadata
      confidence: aiData.confidence || 0.9,
      extractionMethod: 'unified_ai_service'
    };
  }

  /**
   * Extract PI references from payment details string
   */
  static extractPIReferences(paymentDetails) {
    if (!paymentDetails) return [];
    
    // Match patterns like TH-202500135, PI-HBMH24111301A, etc.
    const matches = paymentDetails.match(/[A-Z]+-?[A-Z0-9]+/g);
    return matches || [];
  }

  /**
   * Parse date from various formats
   */
  static parseDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    
    // Handle DD/MM/YYYY format
    const match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (match) {
      const [, day, month, year] = match;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Enhance payment data with business logic
   */
  static enhancePaymentData(data) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate required fields
    if (!data.referenceNumber) {
      validation.errors.push('Missing reference number');
      validation.isValid = false;
    }

    if (!data.paidAmount || data.paidAmount <= 0) {
      validation.errors.push('Invalid payment amount');
      validation.isValid = false;
    }

    if (!data.beneficiaryName) {
      validation.warnings.push('Beneficiary name not found');
    }

    // Calculate total cost
    const totalCost = data.debitAmount + (data.bankCharges || 0);

    // Enhanced data with calculations and formatting
    return {
      ...data,
      
      // Calculations
      totalCost,
      
      // Formatted display values
      formattedPaidAmount: `${data.paidCurrency} ${data.paidAmount.toLocaleString()}`,
      formattedDebitAmount: `${data.debitCurrency} ${data.debitAmount.toLocaleString()}`,
      
      // Validation results
      validation,
      
      // Processing metadata
      processedAt: new Date().toISOString(),
      extractionMethod: 'unified_ai_service'
    };
  }

  /**
   * Fallback local processing (only for development)
   */
  static async fallbackLocalProcessing(file) {
    console.log('🔄 Using local fallback processing for:', file.name);
    
    // Try to extract some basic info from filename if possible
    const hasAmount = file.name.match(/(\d+[.,]?\d*)/);
    const extractedAmount = hasAmount ? parseFloat(hasAmount[1].replace(',', '')) : 1860.00;
    
    // Try to extract PI references from filename
    const piMatches = file.name.match(/[A-Z]+-?[0-9]+/g) || [];
    
    return {
      documentType: 'bank_payment_slip',
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      
      // Fallback data with some intelligence from filename
      referenceNumber: `DEV${Date.now().toString().slice(-10)}`,
      paymentDate: new Date().toISOString().split('T')[0],
      bankName: 'Hong Leong Bank',
      accountNumber: '17301010259',
      accountName: 'FLOW SOLUTION SDN BH',
      
      paidCurrency: 'USD',
      paidAmount: extractedAmount,
      debitCurrency: 'MYR',
      debitAmount: extractedAmount * 4.44,
      exchangeRate: 4.44,
      
      beneficiaryName: 'Development Beneficiary',
      beneficiaryBank: 'JPMorgan Chase Bank NA',
      beneficiaryCountry: 'HONG KONG',
      
      bankCharges: 50.00,
      totalCost: (extractedAmount * 4.44) + 50.00,
      status: 'Development Mode',
      
      piReferences: piMatches,
      
      formattedPaidAmount: `USD ${extractedAmount.toLocaleString()}`,
      formattedDebitAmount: `MYR ${(extractedAmount * 4.44).toLocaleString()}`,
      
      validation: {
        isValid: true,
        errors: [],
        warnings: ['Using development fallback']
      },
      
      confidence: 0.7,
      extractionMethod: 'development_fallback',
      processedAt: new Date().toISOString()
    };
  }
}

export default BankPaymentSlipProcessor;
export { BankPaymentSlipProcessor };
