import React, { useState, useEffect, useCallback } from 'react';
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
  Percent,
  CloudUpload // ✅ Added for drag & drop
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
  
  // Percentage allocation controls
  const [allocationMode, setAllocationMode] = useState('manual'); // 'manual' or 'percentage'
  const [paymentPercentage, setPaymentPercentage] = useState(30); // Default 30%
  const [showPercentageControls, setShowPercentageControls] = useState(true);
  
  // ✅ NEW: Drag & Drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  // ✅ NEW: Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev - 1);
    
    // Only set drag over to false when we've left all drag targets
    if (dragCounter - 1 === 0) {
      setIsDragOver(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setExtractionError('Please upload a PDF, JPG, or PNG file.');
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setExtractionError('File size must be less than 10MB.');
        return;
      }
      
      // Process the dropped file
      handleFileUpload(file);
      
      // Clear the dataTransfer
      e.dataTransfer.clearData();
    }
  }, []);

  // Enhanced file input handler
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // ✅ Helper function to extract PI references
  const extractPIReferences = (paymentDetails) => {
    if (!paymentDetails || typeof paymentDetails !== 'string') return [];
    
    // Match patterns like TH-202500135, PI-HBMH24111301A, etc.
    const patterns = [
      /TH-[0-9]{9}/g,           // TH-202500135 pattern
      /PI-[A-Z0-9]+/g,          // PI-ABC123 pattern  
      /[A-Z]+-[0-9A-Z]+/g       // General pattern
    ];
    
    let piNumbers = [];
    for (const pattern of patterns) {
      const matches = paymentDetails.match(pattern) || [];
      piNumbers = [...piNumbers, ...matches];
    }
    
    return [...new Set(piNumbers)]; // Remove duplicates
  };

  // Handle payment slip upload and AI extraction
  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setPaymentSlip(file);
    setExtractionError(null);
    
    try {
      console.log('🚀 Starting Railway backend extraction for:', file.name);
      
      const extracted = await AIExtractionService.extractBankPaymentSlip(file);
      
      if (!extracted.success) {
        throw new Error(extracted.error || 'Railway backend extraction failed');
      }
      
      console.log('✅ Railway backend extraction successful:', extracted.data);
      
      // ✅ CRITICAL FIX: Extract the bank_payment object from Railway response
      const bankPaymentData = extracted.data.bank_payment || extracted.data;
      
      // ✅ Transform Railway response to expected format
      const processedData = {
        documentType: 'bank_payment_slip',
        fileName: file.name,
        extractedAt: new Date().toISOString(),
        
        // Transaction details - map from Railway backend response
        referenceNumber: bankPaymentData.reference_number || bankPaymentData.referenceNumber || 'Unknown',
        paymentDate: bankPaymentData.payment_date || bankPaymentData.paymentDate || new Date().toISOString().split('T')[0],
        
        // Bank information
        bankName: bankPaymentData.bank_name || bankPaymentData.bankName || 'Hong Leong Bank',
        accountNumber: bankPaymentData.account_number || bankPaymentData.accountNumber || '',
        accountName: bankPaymentData.account_name || bankPaymentData.accountName || 'FLOW SOLUTION SDN BH',
        
        // Payment amounts - CRITICAL: These fields must exist for UI
        paidCurrency: bankPaymentData.paid_currency || bankPaymentData.paidCurrency || 'USD',
        paidAmount: parseFloat(bankPaymentData.payment_amount || bankPaymentData.paidAmount || bankPaymentData.debit_amount || 0),
        debitCurrency: bankPaymentData.debit_currency || bankPaymentData.debitCurrency || 'MYR',
        debitAmount: parseFloat(bankPaymentData.myr_amount || bankPaymentData.debitAmount || 0),
        exchangeRate: parseFloat(bankPaymentData.exchange_rate || bankPaymentData.exchangeRate || 4.44),
        
        // Beneficiary details
        beneficiaryName: bankPaymentData.beneficiary_name || bankPaymentData.beneficiaryName || bankPaymentData.beneficiary || 'Unknown Beneficiary',
        beneficiaryBank: bankPaymentData.beneficiary_bank || bankPaymentData.beneficiaryBank || 'Unknown Bank',
        beneficiaryCountry: bankPaymentData.beneficiary_country || bankPaymentData.beneficiaryCountry || 'HONG KONG',
        
        // Additional details
        bankCharges: parseFloat(bankPaymentData.bank_charges || bankPaymentData.bankCharges || 50.00),
        status: bankPaymentData.status || 'Completed',
        paymentPurpose: bankPaymentData.payment_purpose || bankPaymentData.paymentPurpose || '300-Goods',
        
        // Extract PI references from payment details
        piReferences: extractPIReferences(bankPaymentData.payment_details || bankPaymentData.paymentDetails || ''),
        
        // Metadata
        confidence: extracted.data.confidence || 0.9,
        extractionMethod: 'railway_backend_ai'
      };
      
      console.log('✅ Processed payment data for UI:', processedData);
      
      // Validate critical fields before proceeding
      if (!processedData.referenceNumber || processedData.paidAmount <= 0) {
        console.warn('⚠️ Missing critical payment data:', {
          referenceNumber: processedData.referenceNumber,
          paidAmount: processedData.paidAmount
        });
      }
      
      setExtractedData(processedData);
      generateAutoSuggestions(processedData);
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
          {/* Step 1: Enhanced Upload with Drag & Drop */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Upload className="text-blue-600" />
                Upload Bank Payment Slip
              </h3>
              
              {/* Enhanced Drop Zone */}
              <div 
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
                  ${isDragOver 
                    ? 'border-blue-500 bg-blue-50 scale-105' 
                    : 'border-gray-300 hover:border-gray-400'
                  }
                  ${isProcessing ? 'pointer-events-none opacity-75' : 'cursor-pointer'}
                `}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {/* Drag Overlay */}
                {isDragOver && (
                  <div className="absolute inset-0 bg-blue-500 bg-opacity-10 border-2 border-blue-500 border-dashed rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                      <CloudUpload className="mx-auto mb-2 text-blue-500" size={48} />
                      <p className="text-lg font-medium text-blue-600">
                        Drop your payment slip here
                      </p>
                    </div>
                  </div>
                )}
                
                <input
                  type="file"
                  id="paymentSlip"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isProcessing}
                />
                
                {!isProcessing ? (
                  <label htmlFor="paymentSlip" className="cursor-pointer block">
                    <div className="flex flex-col items-center">
                      {/* Icon Animation */}
                      <div className={`transition-transform duration-200 ${isDragOver ? 'scale-110' : ''}`}>
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                      </div>
                      
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        Drag & Drop or Click to Upload
                      </p>
                      <p className="text-gray-500 mb-4">
                        Bank payment slip (PDF, JPG, PNG • Max 10MB)
                      </p>
                      
                      {/* Enhanced Upload Button */}
                      <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg">
                        <Upload size={20} className="mr-2" />
                        Choose File
                      </div>
                      
                      {/* Or Drag Text */}
                      <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
                        <div className="h-px bg-gray-300 flex-1"></div>
                        <span>or drag and drop</span>
                        <div className="h-px bg-gray-300 flex-1"></div>
                      </div>
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
                    
                    {/* Processing Progress Bar */}
                    <div className="w-64 bg-gray-200 rounded-full h-2 mt-4">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                    </div>
                  </div>
                )}
                
                {/* Error Display */}
                {extractionError && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle size={20} />
                      <span className="font-medium">Upload Failed</span>
                    </div>
                    <p className="text-red-600 mt-1">{extractionError}</p>
                    <button
                      onClick={() => setExtractionError(null)}
                      className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
                    >
                      Try Again
                    </button>
                  </div>
                )}
                
                {/* File Drop Hints */}
                {!isProcessing && !extractionError && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>HongLeong Bank payment advice</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Wire transfer receipts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Cross-border payment slips</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Enhanced Support Information */}
              <div className="mt-8 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="text-gray-600" size={16} />
                  Supported Document Types
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <p className="font-medium mb-2">File Formats:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        PDF documents (.pdf)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        JPEG images (.jpg, .jpeg)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        PNG images (.png)
                      </li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Bank Types:</p>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                        Hong Leong Bank (Primary)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-orange-400 rounded-full"></span>
                        Maybank (Coming Soon)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                        CIMB Bank (Coming Soon)
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> For best results, ensure the document is clear and all text is readable. 
                    The AI extraction works better with high-quality scans or original PDFs.
                  </p>
                </div>
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
