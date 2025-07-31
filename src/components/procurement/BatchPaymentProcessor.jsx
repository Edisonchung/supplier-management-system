import React, { useState, useEffect } from 'react';
import { AIExtractionService } from '../../services/ai/AIExtractionService';
import { 
  Upload, 
  FileText, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Plus,
  Calculator,
  Split,
  Building2,
  Calendar,
  TrendingUp,
  Loader2,
  Eye,
  Download,
  Percent
} from 'lucide-react';

const BatchPaymentProcessor = ({ onClose, onSave, availablePIs = [] }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Extract, 3: Allocate, 4: Confirm
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedPIs, setSelectedPIs] = useState([]);
  const [allocation, setAllocation] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState([]);
  const [extractionError, setExtractionError] = useState(null);
  
  // NEW: Percentage allocation controls
  const [allocationMode, setAllocationMode] = useState('manual'); // 'manual' or 'percentage'
  const [paymentPercentage, setPaymentPercentage] = useState(30); // Default 30%
  const [showPercentageControls, setShowPercentageControls] = useState(true);
  

  // Real AI extraction function
  const performAIExtraction = async (file) => {
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'bank_payment_slip');
      formData.append('extractionType', 'payment_data');

      // In production, this would call your actual AI service
      // For now, we'll use OCR-like extraction logic
      const fileText = await extractTextFromFile(file);
      
      // Parse the extracted text for payment information
      const extracted = parsePaymentSlipData(fileText, file.name);
      
      return extracted;
      
    } catch (error) {
      console.error('AI extraction failed:', error);
      throw new Error('Failed to extract payment data from document. Please check the file format and try again.');
    }
  };

  // Extract text from PDF/image files
  const extractTextFromFile = async (file) => {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        // For PDF files, you'd use a PDF parser like pdf-parse or PDF.js
        // This is a simplified simulation
        const reader = new FileReader();
        reader.onload = (e) => {
          // Simulate OCR extraction - in production, use actual OCR service
          const simulatedText = `
            Cross Border Payment
            Reference Number: C723151124133258
            Payment Date: 15/11/2024
            Bank Name: Hong Leong Bank
            Account Number: 17301010259
            Account Name: FLOW SOLUTION SDN BH
            
            Beneficiary Name: HEBEI MICKEY BADGER ENGINEERING MATERIALS SALES CO.,LTD
            Beneficiary Bank: DBS Bank Hong Kong Limited
            
            Payment Amount: 21492.22 MYR
            Debit Amount: 4905.78 USD
            Exchange Rate: 4.3814
            Bank Charges: 50.00 MYR
            
            Payment Details: PI-HBMH24111301A, HBMH24102903A
            Status: Completed
          `;
          resolve(simulatedText);
        };
        reader.onerror = reject;
        reader.readAsText(file);
      } else {
        // For image files, you'd use OCR service like Tesseract.js
        const reader = new FileReader();
        reader.onload = (e) => {
          // Simulate OCR text extraction
          resolve("Simulated OCR text extraction from image");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  // Parse extracted text to structured data
  const parsePaymentSlipData = (text, filename) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const extractField = (pattern, defaultValue = '') => {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match) return match[1]?.trim() || defaultValue;
      }
      return defaultValue;
    };

    const extractAmount = (pattern) => {
      const amountStr = extractField(pattern);
      const amount = parseFloat(amountStr.replace(/[^\d.-]/g, ''));
      return isNaN(amount) ? 0 : amount;
    };

    const extractDate = (pattern) => {
      const dateStr = extractField(pattern);
      if (dateStr) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return new Date().toISOString().split('T')[0];
    };

    // Extract PI numbers from payment details
    const paymentDetails = extractField(/Payment Details[:\s]*(.+)/i);
    const piNumbers = paymentDetails.match(/[A-Z]+-[A-Z0-9]+/g) || [];

    return {
      documentType: 'bank_payment_slip',
      fileName: filename,
      extractedAt: new Date().toISOString(),
      
      // Transaction identification
      referenceNumber: extractField(/Reference Number[:\s]*([A-Z0-9]+)/i) || `C${Date.now()}`,
      paymentDate: extractDate(/Payment Date[:\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i),
      
      // Bank details
      bankName: extractField(/Bank Name[:\s]*(.+)/i) || 'Hong Leong Bank',
      accountNumber: extractField(/Account Number[:\s]*(\d+)/i),
      accountName: extractField(/Account Name[:\s]*(.+)/i) || 'FLOW SOLUTION SDN BH',
      
      // Payment amounts
      paidCurrency: 'USD', // Assuming USD as primary currency
      paidAmount: extractAmount(/Debit Amount[:\s]*([0-9,.-]+)\s*USD/i) || extractAmount(/([0-9,.-]+)\s*USD/i),
      debitCurrency: 'MYR',
      debitAmount: extractAmount(/Payment Amount[:\s]*([0-9,.-]+)\s*MYR/i) || extractAmount(/([0-9,.-]+)\s*MYR/i),
      
      // Exchange information
      exchangeRate: extractAmount(/Exchange Rate[:\s]*([0-9,.-]+)/i) || 4.44,
      
      // Beneficiary information
      beneficiaryName: extractField(/Beneficiary Name[:\s]*(.+)/i),
      beneficiaryBank: extractField(/Beneficiary Bank[:\s]*(.+)/i),
      beneficiaryCountry: extractField(/Country[:\s]*(.+)/i) || 'HONG KONG',
      
      // Additional details
      bankCharges: extractAmount(/Bank Charges[:\s]*([0-9,.-]+)/i) || 50.00,
      status: extractField(/Status[:\s]*(.+)/i) || 'Completed',
      paymentPurpose: extractField(/BOP Code[:\s]*(.+)/i) || '300-Goods',
      
      // PI references found in payment details
      piReferences: piNumbers,
      
      confidence: 0.85,
      extractionMethod: 'text_parsing'
    };
  };

  // Handle payment slip upload and AI extraction
  const handleFileUpload = async (file) => {
  setIsProcessing(true);
  setPaymentSlip(file);
  setExtractionError(null);
  
  try {
    console.log('🚀 Starting Railway backend extraction for:', file.name);
    
    // ✅ CRITICAL FIX: Call Railway backend directly instead of mock extraction
    const extracted = await AIExtractionService.extractBankPaymentSlip(file);
    
    if (!extracted.success) {
      throw new Error(extracted.error || 'Railway backend extraction failed');
    }
    
    console.log('✅ Railway backend extraction successful:', extracted.data);
    
    // Use the real data from Railway backend
    setExtractedData(extracted.data);
    generateAutoSuggestions(extracted.data);
    setStep(2);
    
  } catch (error) {
    console.error('❌ Railway backend extraction failed:', error);
    setExtractionError(error.message || 'Failed to extract payment data. Please try again.');
  } finally {
    setIsProcessing(false);
  }
};

  // Generate smart PI suggestions based on extracted data
  const generateAutoSuggestions = (extractedData) => {
    const suggestions = [];
    
    // Match by beneficiary name
    const beneficiaryMatches = availablePIs.filter(pi => {
      const supplierName = pi.supplierName?.toLowerCase() || '';
      const beneficiaryName = extractedData.beneficiaryName?.toLowerCase() || '';
      
      // Fuzzy matching for supplier names
      const words = beneficiaryName.split(' ').filter(word => word.length > 2);
      return words.some(word => supplierName.includes(word));
    });
    
    // Match by PI references in payment details
    const referenceMatches = availablePIs.filter(pi => {
      return extractedData.piReferences?.some(ref => 
        pi.piNumber?.includes(ref) || ref.includes(pi.piNumber || '')
      );
    });
    
    // Combine and prioritize matches
    const allMatches = [...new Set([...referenceMatches, ...beneficiaryMatches])];
    
    // Sort by relevance
    allMatches.forEach(pi => {
      const remainingBalance = getRemainingBalance(pi);
      const confidence = referenceMatches.includes(pi) ? 0.9 : 0.7;
      
      suggestions.push({
        pi,
        confidence,
        suggestedAmount: Math.min(remainingBalance, extractedData.paidAmount / allMatches.length),
        reason: referenceMatches.includes(pi) ? 'PI reference match' : 'Supplier name match'
      });
    });
    
    setAutoSuggestions(suggestions.sort((a, b) => b.confidence - a.confidence));
    
    // Auto-select high confidence matches
    const highConfidenceMatches = suggestions.filter(s => s.confidence >= 0.8);
    if (highConfidenceMatches.length > 0) {
      const newSelectedPIs = highConfidenceMatches.map(s => s.pi.id);
      setSelectedPIs(newSelectedPIs);
      
      // NEW: Auto-apply percentage allocation if detected as down payment
      if (isDownPaymentScenario(extractedData, highConfidenceMatches)) {
        applyPercentageAllocation(newSelectedPIs, 30); // Default 30%
        setAllocationMode('percentage');
        setShowPercentageControls(true);
      } else {
        // Use smart allocation for non-percentage scenarios
        const newAllocation = {};
        highConfidenceMatches.forEach(s => {
          newAllocation[s.pi.id] = s.suggestedAmount;
        });
        setAllocation(newAllocation);
      }
    }
  };

  // NEW: Detect if this is likely a down payment scenario
  const isDownPaymentScenario = (extractedData, matches) => {
    if (matches.length < 2) return false; // Need multiple PIs for down payment
    
    const totalPIValues = matches.reduce((sum, match) => {
      return sum + parseFloat(match.pi.totalAmount || 0);
    }, 0);
    
    const paymentRatio = extractedData.paidAmount / totalPIValues;
    
    // If payment is 20-40% of total PI values, likely a down payment
    return paymentRatio >= 0.2 && paymentRatio <= 0.4;
  };

  // NEW: Apply percentage-based allocation
  const applyPercentageAllocation = (piIds, percentage) => {
    const newAllocation = {};
    
    piIds.forEach(piId => {
      const pi = availablePIs.find(p => p.id === piId);
      if (pi) {
        const piTotal = parseFloat(pi.totalAmount || 0);
        const allocatedAmount = (piTotal * percentage) / 100;
        newAllocation[piId] = Math.round(allocatedAmount * 100) / 100; // Round to 2 decimals
      }
    });
    
    setAllocation(newAllocation);
  };

  // NEW: Handle percentage change
  const handlePercentageChange = (newPercentage) => {
    setPaymentPercentage(newPercentage);
    if (allocationMode === 'percentage' && selectedPIs.length > 0) {
      applyPercentageAllocation(selectedPIs, newPercentage);
    }
  };

  // NEW: Smart allocation distribution
  const distributeEqually = () => {
    if (selectedPIs.length === 0) return;
    
    const amountPerPI = extractedData.paidAmount / selectedPIs.length;
    const newAllocation = {};
    
    selectedPIs.forEach(piId => {
      const pi = availablePIs.find(p => p.id === piId);
      const remainingBalance = getRemainingBalance(pi);
      newAllocation[piId] = Math.min(remainingBalance, amountPerPI);
    });
    
    setAllocation(newAllocation);
    setAllocationMode('manual');
  };

  // Get remaining balance for a PI
  const getRemainingBalance = (pi) => {
    const totalPaid = (pi.payments || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    return Math.max(0, parseFloat(pi.totalAmount || 0) - totalPaid);
  };

  // Handle PI selection
  const togglePISelection = (piId) => {
    setSelectedPIs(prev => {
      const isSelected = prev.includes(piId);
      if (isSelected) {
        // Remove from selection and allocation
        setAllocation(prevAlloc => {
          const newAlloc = { ...prevAlloc };
          delete newAlloc[piId];
          return newAlloc;
        });
        return prev.filter(id => id !== piId);
      } else {
        // Add to selection
        const newPIs = [...prev, piId];
        
        // If in percentage mode, recalculate all allocations
        if (allocationMode === 'percentage') {
          setTimeout(() => applyPercentageAllocation(newPIs, paymentPercentage), 0);
        } else {
          // Manual mode: suggest amount for this PI
          const pi = availablePIs.find(p => p.id === piId);
          const remainingBalance = getRemainingBalance(pi);
          const unallocatedAmount = extractedData.paidAmount - getTotalAllocated();
          const suggestedAmount = Math.min(remainingBalance, unallocatedAmount);
          
          if (suggestedAmount > 0) {
            setAllocation(prevAlloc => ({
              ...prevAlloc,
              [piId]: suggestedAmount
            }));
          }
        }
        
        return newPIs;
      }
    });
  };

  // Update allocation amount
  const updateAllocation = (piId, amount) => {
    const numAmount = parseFloat(amount) || 0;
    setAllocation(prev => ({
      ...prev,
      [piId]: numAmount
    }));
    
    // Switch to manual mode when user manually adjusts
    if (allocationMode === 'percentage') {
      setAllocationMode('manual');
    }
  };

  // Get total allocated amount
  const getTotalAllocated = () => {
    return Object.values(allocation).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
  };

  // Calculate allocation progress
  const totalAllocated = getTotalAllocated();
  const unallocatedAmount = extractedData ? Math.max(0, extractedData.paidAmount - totalAllocated) : 0;
  const overAllocated = totalAllocated > (extractedData?.paidAmount || 0);
  
  // Updated validation for partial payments
  const isValidAllocation = () => {
    if (!extractedData || selectedPIs.length === 0) return false;
    
    // Allow allocations that match the payment amount (supports partial payments)
    const tolerance = 0.01;
    const difference = Math.abs(totalAllocated - extractedData.paidAmount);
    
    return difference < tolerance && totalAllocated > 0;
  };

  // Process final payment
  const processPayment = () => {
    const paymentRecord = {
      paymentSlipRef: extractedData.referenceNumber,
      paymentDate: extractedData.paymentDate,
      totalPaid: extractedData.paidAmount,
      currency: extractedData.paidCurrency,
      exchangeRate: extractedData.exchangeRate,
      bankCharges: extractedData.bankCharges,
      debitAmount: extractedData.debitAmount,
      debitCurrency: extractedData.debitCurrency,
      bankName: extractedData.bankName,
      beneficiaryName: extractedData.beneficiaryName,
      beneficiaryBank: extractedData.beneficiaryBank,
      extractionConfidence: extractedData.confidence,
      extractionMethod: extractedData.extractionMethod,
      
      // NEW: Allocation metadata
      allocationMode: allocationMode,
      paymentPercentage: allocationMode === 'percentage' ? paymentPercentage : null,
      
      // Attach the original bank slip document
      bankSlipDocument: {
        name: paymentSlip.name,
        type: paymentSlip.type,
        size: paymentSlip.size,
        url: URL.createObjectURL(paymentSlip),
        uploadedAt: new Date().toISOString()
      },
      
      piAllocations: selectedPIs
        .filter(piId => allocation[piId] > 0)
        .map(piId => {
          const pi = availablePIs.find(p => p.id === piId);
          const allocatedAmount = allocation[piId] || 0;
          const remainingBalance = getRemainingBalance(pi);
          const piTotal = parseFloat(pi.totalAmount || 0);
          const actualPercentage = piTotal > 0 ? (allocatedAmount / piTotal) * 100 : 0;
          
          return {
            piId: pi.id,
            piNumber: pi.piNumber,
            allocatedAmount,
            currency: extractedData.paidCurrency,
            supplierName: pi.supplierName,
            previousBalance: remainingBalance + allocatedAmount,
            newBalance: remainingBalance,
            isPartialPayment: allocatedAmount < piTotal,
            paymentPercentage: actualPercentage.toFixed(1),
            allocationMethod: allocationMode
          };
        })
    };
    
    console.log('🎯 Processing payment with percentage allocation:', paymentRecord);
    onSave(paymentRecord);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Split className="text-green-600" />
                Batch Payment Processor
              </h2>
              <p className="text-gray-600 mt-1">Process bank payment slips with smart allocation</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center mt-6 space-x-4">
            {[
              { num: 1, label: 'Upload Slip', icon: Upload },
              { num: 2, label: 'AI Extract', icon: FileText },
              { num: 3, label: 'Allocate PIs', icon: Split },
              { num: 4, label: 'Confirm', icon: CheckCircle2 }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= s.num ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > s.num ? <CheckCircle2 size={20} /> : <s.icon size={20} />}
                </div>
                <span className={`ml-2 text-sm ${step >= s.num ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {idx < 3 && <div className="w-8 h-0.5 bg-gray-300 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Upload className="text-blue-600" />
                Upload Bank Payment Slip
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  id="paymentSlip"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleFileUpload(file);
                  }}
                  className="hidden"
                />
                
                {!isProcessing ? (
                  <label htmlFor="paymentSlip" className="cursor-pointer">
                    <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Upload Bank Payment Slip
                    </p>
                    <p className="text-gray-500 mb-4">
                      PDF, JPG, or PNG files up to 10MB
                    </p>
                    <div className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Upload size={20} className="mr-2" />
                      Choose File
                    </div>
                  </label>
                ) : (
                  <div className="flex flex-col items-center">
                    <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                    <p className="text-lg font-medium text-blue-600 mb-2">
                      Processing Payment Slip...
                    </p>
                    <p className="text-gray-500">
                      Using AI to extract payment data from your document
                    </p>
                  </div>
                )}
                
                {extractionError && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle size={20} />
                      <span className="font-medium">Extraction Failed</span>
                    </div>
                    <p className="text-red-600 mt-1">{extractionError}</p>
                    <button
                      onClick={() => setExtractionError(null)}
                      className="mt-2 text-red-600 hover:text-red-800 underline"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mt-6 text-sm text-gray-600">
                <p className="font-medium mb-2">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>HongLeong Bank payment advice (PDF)</li>
                  <li>Wire transfer receipts (PDF, Image)</li>
                  <li>Cross-border payment confirmations</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Review Extracted Data */}
          {step === 2 && extractedData && (
            <div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <FileText className="text-green-600" />
                Review AI-Extracted Payment Data
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Bank Transaction Details */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20} />
                    Bank Transaction Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium">{extractedData.referenceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{extractedData.paymentDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank:</span>
                      <span className="font-medium">{extractedData.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                        {extractedData.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confidence:</span>
                      <span className="font-medium">{(extractedData.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <DollarSign className="text-green-600" size={20} />
                    Payment Summary
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-bold text-green-600">
                        {extractedData.paidCurrency} {extractedData.paidAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Debit Amount:</span>
                      <span className="font-medium">
                        {extractedData.debitCurrency} {extractedData.debitAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exchange Rate:</span>
                      <span className="font-medium">{extractedData.exchangeRate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank Charges:</span>
                      <span className="font-medium">
                        {extractedData.debitCurrency} {extractedData.bankCharges.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Information */}
              <div className="bg-orange-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-3">Beneficiary Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <div className="font-medium">{extractedData.beneficiaryName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Bank:</span>
                    <div className="font-medium">{extractedData.beneficiaryBank}</div>
                  </div>
                </div>
              </div>

              {/* PI References Found */}
              {extractedData.piReferences && extractedData.piReferences.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="text-yellow-600" size={20} />
                    PI References Found in Payment Details
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {extractedData.piReferences.map((ref, idx) => (
                      <span key={idx} className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded text-sm">
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Upload Different File
                </button>
                
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Calculator size={16} />
                  Continue to PI Allocation
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Allocate Payment to PIs */}
          {step === 3 && extractedData && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Split className="text-purple-600" />
                Allocate Payment to PIs
              </h3>

              {/* Allocation Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">Total Paid</div>
                    <div className="text-xl font-bold text-blue-600">
                      {extractedData.paidCurrency} {extractedData.paidAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Allocated</div>
                    <div className="text-xl font-bold text-green-600">
                      {extractedData.paidCurrency} {totalAllocated.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Remaining</div>
                    <div className={`text-xl font-bold ${overAllocated ? 'text-red-600' : 'text-orange-600'}`}>
                      {extractedData.paidCurrency} {overAllocated ? `-${(totalAllocated - extractedData.paidAmount).toLocaleString()}` : unallocatedAmount.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Progress</div>
                    <div className="text-xl font-bold text-purple-600">
                      {((totalAllocated / extractedData.paidAmount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        overAllocated ? 'bg-red-500' : totalAllocated === extractedData.paidAmount ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (totalAllocated / extractedData.paidAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* NEW: Allocation Mode Controls */}
              {showPercentageControls && selectedPIs.length > 1 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Percent className="text-purple-600" />
                    Smart Allocation Controls
                  </h4>
                  
                  <div className="flex items-center gap-4 mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="allocationMode"
                        value="percentage"
                        checked={allocationMode === 'percentage'}
                        onChange={() => setAllocationMode('percentage')}
                        className="text-purple-600"
                      />
                      <span className="text-sm font-medium">Percentage Payment</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="allocationMode"
                        value="manual"
                        checked={allocationMode === 'manual'}
                        onChange={() => setAllocationMode('manual')}
                        className="text-purple-600"
                      />
                      <span className="text-sm font-medium">Manual Allocation</span>
                    </label>
                  </div>
                  
                  {allocationMode === 'percentage' && (
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-gray-600">Payment Percentage:</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={paymentPercentage}
                          onChange={(e) => handlePercentageChange(parseFloat(e.target.value) || 0)}
                          min="1"
                          max="100"
                          step="0.1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                      
                      <div className="flex gap-2">
                        {[20, 30, 40, 50].map(percent => (
                          <button
                            key={percent}
                            onClick={() => handlePercentageChange(percent)}
                            className={`px-2 py-1 text-xs rounded ${
                              paymentPercentage === percent 
                                ? 'bg-purple-600 text-white' 
                                : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                            }`}
                          >
                            {percent}%
                          </button>
                        ))}
                      </div>
                      
                      <button
                        onClick={() => applyPercentageAllocation(selectedPIs, paymentPercentage)}
                        className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  
                  {allocationMode === 'manual' && (
                    <div className="flex gap-2">
                      <button
                        onClick={distributeEqually}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        Distribute Equally
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Auto Suggestions */}
              {autoSuggestions.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="text-yellow-600" />
                    AI Suggestions ({autoSuggestions.length} found)
                  </h4>
                  <div className="text-sm text-gray-700 mb-3">
                    Based on beneficiary name and PI references matching
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {autoSuggestions.slice(0, 3).map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (!selectedPIs.includes(suggestion.pi.id)) {
                            togglePISelection(suggestion.pi.id);
                          }
                        }}
                        className={`px-3 py-1 rounded text-sm border ${
                          selectedPIs.includes(suggestion.pi.id)
                            ? 'bg-yellow-200 border-yellow-400 text-yellow-800'
                            : 'bg-white border-yellow-300 text-yellow-700 hover:bg-yellow-100'
                        }`}
                      >
                        {suggestion.pi.piNumber} - {(suggestion.confidence * 100).toFixed(0)}% match
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PI Selection */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Select PIs and Allocate Amounts</h4>
                <div className="text-sm text-gray-600 mb-3">
                  {selectedPIs.length} of {availablePIs.length} PIs selected
                  {allocationMode === 'percentage' && (
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-600 rounded text-xs">
                      {paymentPercentage}% allocation mode
                    </span>
                  )}
                </div>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availablePIs.map((pi) => {
                    const remainingBalance = getRemainingBalance(pi);
                    const isSelected = selectedPIs.includes(pi.id);
                    const allocatedAmount = allocation[pi.id] || 0;
                    const piTotal = parseFloat(pi.totalAmount || 0);
                    const actualPercentage = piTotal > 0 ? (allocatedAmount / piTotal) * 100 : 0;
                    
                    return (
                      <div key={pi.id} className={`border rounded-lg p-4 ${
                        isSelected ? 'border-green-300 bg-green-50' : 'border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => togglePISelection(pi.id)}
                              className="w-4 h-4 text-green-600"
                            />
                            <div>
                              <div className="font-medium">{pi.piNumber}</div>
                              <div className="text-sm text-gray-600">{pi.supplierName}</div>
                              <div className="text-xs text-gray-500">
                                Remaining: {pi.currency} {remainingBalance.toLocaleString()} 
                                | Total: {pi.currency} {piTotal.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="text-sm text-gray-600">Allocate:</div>
                                <input
                                  type="number"
                                  value={allocatedAmount}
                                  onChange={(e) => updateAllocation(pi.id, e.target.value)}
                                  min="0"
                                  max={Math.min(remainingBalance, extractedData.paidAmount)}
                                  step="0.01"
                                  className="w-28 px-2 py-1 border border-gray-300 rounded text-center"
                                />
                                <div className="text-xs text-gray-500 mt-1">
                                  {extractedData.paidCurrency}
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => updateAllocation(pi.id, Math.min(remainingBalance, unallocatedAmount + allocatedAmount))}
                                  className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                                  title="Allocate maximum available"
                                >
                                  Max
                                </button>
                                
                                {/* NEW: Quick percentage buttons */}
                                {allocationMode === 'manual' && (
                                  <div className="flex gap-1">
                                    {[25, 30, 50].map(percent => (
                                      <button
                                        key={percent}
                                        onClick={() => updateAllocation(pi.id, (piTotal * percent) / 100)}
                                        className="text-xs bg-purple-100 text-purple-600 px-1 py-0.5 rounded hover:bg-purple-200"
                                        title={`${percent}% of PI total`}
                                      >
                                        {percent}%
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {isSelected && allocatedAmount > 0 && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="text-xs text-green-700 flex items-center justify-between">
                              <span>
                                Payment: {actualPercentage.toFixed(1)}% of total PI amount
                              </span>
                              {allocatedAmount < remainingBalance && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded">
                                  Partial Payment
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validation Messages */}
              {overAllocated && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-2">
                  <AlertCircle className="text-red-600 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-red-800">Over-allocation Detected</div>
                    <div className="text-red-700 text-sm">
                      You have allocated {extractedData.paidCurrency} {(totalAllocated - extractedData.paidAmount).toLocaleString()} more than the payment amount.
                      Please adjust the allocations.
                    </div>
                  </div>
                </div>
              )}

              {unallocatedAmount > 0.01 && !overAllocated && selectedPIs.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-yellow-800">Partial Allocation</div>
                    <div className="text-yellow-700 text-sm">
                      You have {extractedData.paidCurrency} {unallocatedAmount.toLocaleString()} unallocated. 
                      This is acceptable for partial payments. You can proceed to confirm.
                    </div>
                  </div>
                </div>
              )}

              {selectedPIs.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-2">
                  <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-blue-800">No PIs Selected</div>
                    <div className="text-blue-700 text-sm">
                      Please select at least one PI to allocate the payment to.
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back to Review
                </button>
                
                <button
                  onClick={() => setStep(4)}
                  disabled={!isValidAllocation()}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Review & Confirm Payment
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && extractedData && (
            <div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <CheckCircle2 className="text-green-600" />
                Payment Allocation Confirmation
              </h3>
              
              {/* Final Summary */}
              <div className="bg-green-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Payment Details</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Reference:</span>
                        <span className="font-medium">{extractedData.referenceNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date:</span>
                        <span className="font-medium">{extractedData.paymentDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank:</span>
                        <span className="font-medium">{extractedData.bankName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Amount:</span>
                        <span className="font-bold text-green-600">
                          {extractedData.paidCurrency} {extractedData.paidAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allocated:</span>
                        <span className="font-bold text-blue-600">
                          {extractedData.paidCurrency} {totalAllocated.toLocaleString()}
                        </span>
                      </div>
                      {allocationMode === 'percentage' && (
                        <div className="flex justify-between">
                          <span>Allocation Method:</span>
                          <span className="font-medium text-purple-600">
                            {paymentPercentage}% Down Payment
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Beneficiary</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <div className="font-medium">{extractedData.beneficiaryName}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Bank:</span>
                        <div className="font-medium">{extractedData.beneficiaryBank}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PI Allocation Summary */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">PI Allocation Summary</h4>
                <div className="space-y-3">
                  {selectedPIs.filter(piId => allocation[piId] > 0).map(piId => {
                    const pi = availablePIs.find(p => p.id === piId);
                    const allocatedAmount = allocation[piId];
                    const remainingBalance = getRemainingBalance(pi);
                    const piTotal = parseFloat(pi.totalAmount || 0);
                    const paymentPercentage = ((allocatedAmount / piTotal) * 100).toFixed(1);
                    const isPartialPayment = allocatedAmount < piTotal;
                    
                    return (
                      <div key={piId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{pi.piNumber}</div>
                            <div className="text-sm text-gray-600">{pi.supplierName}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Total PI: {pi.currency} {piTotal.toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {extractedData.paidCurrency} {allocatedAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {paymentPercentage}% of PI total
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Remaining: {pi.currency} {(piTotal - allocatedAmount).toLocaleString()}
                            </div>
                            {isPartialPayment && (
                              <div className="text-xs text-orange-600 mt-1 px-2 py-0.5 bg-orange-100 rounded">
                                Partial Payment
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Attached Documents */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <FileText className="text-blue-600" size={16} />
                  Attached Documents
                </h4>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center">
                      <FileText className="text-red-600" size={16} />
                    </div>
                    <div>
                      <div className="font-medium">{paymentSlip.name}</div>
                      <div className="text-gray-500">
                        {(paymentSlip.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 p-1">
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              {/* Final Actions */}
              <div className="flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Back to Allocation
                </button>
                
                <button
                  onClick={processPayment}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 font-medium"
                >
                  <CheckCircle2 size={20} />
                  Confirm & Save Payment Records
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchPaymentProcessor;
