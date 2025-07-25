import React, { useState, useEffect } from 'react';
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
  Loader2
} from 'lucide-react';

const BatchPaymentProcessor = ({ onClose, onSave, availablePIs = [] }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Extract, 3: Allocate, 4: Confirm
  const [paymentSlip, setPaymentSlip] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [selectedPIs, setSelectedPIs] = useState([]);
  const [allocation, setAllocation] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSuggestions, setAutoSuggestions] = useState([]);

  // Handle payment slip upload and AI extraction
  const handleFileUpload = async (file) => {
    setIsProcessing(true);
    setPaymentSlip(file);
    
    try {
      // Simulate AI extraction of bank payment slip
      // In production, this would call your AI extraction service
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Sample extracted data based on your HongLeong slip format
      const extracted = {
        referenceNumber: `C${Date.now().toString().slice(-12)}`,
        paymentDate: new Date().toISOString().split('T')[0],
        bankName: 'Hong Leong Bank',
        accountNumber: '17301010259',
        accountName: 'FLOW SOLUTION SDN BH',
        
        // Transaction details
        paidCurrency: 'USD',
        paidAmount: 5796.00, // This would be extracted from the document
        debitCurrency: 'MYR',
        debitAmount: 25757.42, // This would be extracted from the document
        exchangeRate: 4.4449, // Calculated from amounts
        
        // Beneficiary (extracted from document)
        beneficiaryName: 'HENGSHUI ANZHISHUN TECHNOLOGY CO.,LTD',
        beneficiaryBank: 'JPMorgan Chase Bank NA',
        beneficiaryCountry: 'HONG KONG',
        
        // Additional costs
        bankCharges: 50.00, // Estimated or extracted
        totalCost: 25807.42,
        
        // Payment purpose
        paymentPurpose: '300-Goods',
        status: 'Sent to Bank'
      };
      
      setExtractedData(extracted);
      generateAutoSuggestions(extracted);
      setStep(2);
      
    } catch (error) {
      console.error('Extraction failed:', error);
      alert('Failed to extract payment slip data. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate smart PI suggestions based on extracted data
  const generateAutoSuggestions = (extracted) => {
    const suggestions = availablePIs.filter(pi => {
      // Match by supplier name (fuzzy matching)
      const supplierMatch = pi.supplierName?.toLowerCase().includes(
        extracted.beneficiaryName.toLowerCase().substring(0, 10)
      );
      
      // Match by currency
      const currencyMatch = pi.currency === extracted.paidCurrency;
      
      // Match by amount proximity (within reasonable range)
      const amountMatch = Math.abs(pi.totalAmount - extracted.paidAmount) < extracted.paidAmount * 0.5;
      
      // Only suggest PIs that aren't fully paid
      const notFullyPaid = (pi.paymentStatus || 'pending') !== 'paid';
      
      return (supplierMatch || currencyMatch || amountMatch) && notFullyPaid;
    });
    
    setAutoSuggestions(suggestions);
  };

  // Auto-allocate PIs based on smart suggestions
  const autoAllocatePIs = () => {
    if (!extractedData) return;

    // Start with auto-suggested PIs
    const suggestedPIs = autoSuggestions.length > 0 ? autoSuggestions : availablePIs.filter(pi =>
      pi.currency === extractedData.paidCurrency && (pi.paymentStatus || 'pending') !== 'paid'
    );

    setSelectedPIs(suggestedPIs.map(pi => pi.id));
    
    // Smart allocation logic
    let remainingAmount = extractedData.paidAmount;
    const newAllocation = {};
    
    // Sort by remaining amount (smaller amounts first for complete payment)
    const sortedPIs = [...suggestedPIs].sort((a, b) => {
      const remainingA = a.totalAmount - (a.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
      const remainingB = b.totalAmount - (b.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);
      return remainingA - remainingB;
    });
    
    sortedPIs.forEach(pi => {
      const alreadyPaid = pi.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const remainingForPI = pi.totalAmount - alreadyPaid;
      
      if (remainingAmount <= 0) {
        newAllocation[pi.id] = 0;
      } else if (remainingAmount >= remainingForPI) {
        newAllocation[pi.id] = remainingForPI;
        remainingAmount -= remainingForPI;
      } else {
        newAllocation[pi.id] = remainingAmount;
        remainingAmount = 0;
      }
    });
    
    setAllocation(newAllocation);
    setStep(3);
  };

  // Manual allocation adjustment
  const updateAllocation = (piId, amount) => {
    setAllocation(prev => ({
      ...prev,
      [piId]: parseFloat(amount) || 0
    }));
  };

  // Calculate totals
  const totalAllocated = Object.values(allocation).reduce((sum, amount) => sum + amount, 0);
  const unallocatedAmount = extractedData ? extractedData.paidAmount - totalAllocated : 0;
  const isFullyAllocated = Math.abs(unallocatedAmount) < 0.01; // Allow for small rounding differences

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
      bankName: extractedData.bankName,
      beneficiaryName: extractedData.beneficiaryName,
      piAllocations: selectedPIs
        .filter(piId => allocation[piId] > 0)
        .map(piId => {
          const pi = availablePIs.find(p => p.id === piId);
          return {
            piId: pi.id,
            piNumber: pi.piNumber,
            allocatedAmount: allocation[piId] || 0,
            currency: pi.currency,
            supplierName: pi.supplierName
          };
        })
    };
    
    onSave(paymentRecord);
  };

  // Get PI remaining balance
  const getPIRemainingBalance = (pi) => {
    const totalPaid = pi.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    return pi.totalAmount - totalPaid;
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
              <p className="text-gray-600 mt-1">Process bank payment slips for multiple PIs</p>
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
              { num: 2, label: 'Extract Data', icon: FileText },
              { num: 3, label: 'Allocate PIs', icon: Split },
              { num: 4, label: 'Confirm', icon: CheckCircle2 }
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= s.num ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  <s.icon size={16} />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step >= s.num ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {s.label}
                </span>
                {idx < 3 && <div className="ml-4 w-8 h-0.5 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Upload Payment Slip */}
          {step === 1 && (
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-green-400 transition-colors">
                <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload Bank Payment Slip</h3>
                <p className="text-gray-600 mb-6">
                  Upload your bank payment slip (like HongLeong Bank payment advice) for automatic data extraction
                </p>
                
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  id="payment-slip-upload"
                  disabled={isProcessing}
                />
                <label
                  htmlFor="payment-slip-upload"
                  className={`inline-flex items-center px-6 py-3 rounded-lg cursor-pointer transition-colors ${
                    isProcessing 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2" size={20} />
                      Choose File
                    </>
                  )}
                </label>
                
                <div className="mt-4 text-sm text-gray-500">
                  Supported formats: PDF, JPG, PNG (Max 10MB)
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Extracted Data Review */}
          {step === 2 && extractedData && (
            <div>
              <h3 className="text-lg font-semibold mb-6">Review Extracted Payment Data</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Bank Transaction Details */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Building2 className="text-blue-600" size={20} />
                    Bank Transaction Details
                  </h4>
                  <div className="space-y-3 text-sm">
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
                      <span className="font-medium text-green-600">{extractedData.status}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Amounts */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <DollarSign className="text-green-600" size={20} />
                    Payment Summary
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount Paid:</span>
                      <span className="font-bold text-lg text-green-600">
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
                      <span className="font-medium">{extractedData.exchangeRate.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank Charges:</span>
                      <span className="font-medium">MYR {extractedData.bankCharges.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Beneficiary Information */}
              <div className="bg-orange-50 rounded-lg p-6 mb-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Building2 className="text-orange-600" size={20} />
                  Beneficiary Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{extractedData.beneficiaryName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Bank:</span>
                    <p className="font-medium">{extractedData.beneficiaryBank}</p>
                  </div>
                </div>
              </div>

              {/* Auto-suggestions */}
              {autoSuggestions.length > 0 && (
                <div className="bg-yellow-50 rounded-lg p-4 mb-6">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="text-yellow-600" size={16} />
                    Suggested PIs ({autoSuggestions.length} found)
                  </h4>
                  <div className="text-sm text-gray-600 mb-3">
                    Based on supplier name and currency matching
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {autoSuggestions.slice(0, 3).map(pi => (
                      <span key={pi.id} className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                        {pi.piNumber} - {pi.currency} {pi.totalAmount.toLocaleString()}
                      </span>
                    ))}
                    {autoSuggestions.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{autoSuggestions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={autoAllocatePIs}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Calculator size={16} />
                  Continue to PI Allocation
                </button>
              </div>
            </div>
          )}

          {/* Step 3: PI Allocation */}
          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Allocate Payment to PIs</h3>
              
              {/* Allocation Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
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
                    <div className={`text-xl font-bold ${
                      Math.abs(unallocatedAmount) < 0.01 ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {extractedData.paidCurrency} {Math.abs(unallocatedAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Progress</div>
                    <div className="text-xl font-bold text-gray-600">
                      {((totalAllocated / extractedData.paidAmount) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all" 
                      style={{ width: `${Math.min((totalAllocated / extractedData.paidAmount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* PI Selection and Allocation */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Select PIs and Allocate Amounts</h4>
                  <div className="text-sm text-gray-600">
                    {selectedPIs.length} of {availablePIs.length} PIs selected
                  </div>
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {availablePIs.map(pi => {
                    const remainingBalance = getPIRemainingBalance(pi);
                    const isSelected = selectedPIs.includes(pi.id);
                    const allocatedAmount = allocation[pi.id] || 0;
                    
                    return (
                      <div key={pi.id} className={`border rounded-lg p-4 transition-colors ${
                        isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedPIs([...selectedPIs, pi.id]);
                                  if (!allocation[pi.id]) {
                                    updateAllocation(pi.id, Math.min(remainingBalance, unallocatedAmount + allocatedAmount));
                                  }
                                } else {
                                  setSelectedPIs(selectedPIs.filter(id => id !== pi.id));
                                  updateAllocation(pi.id, 0);
                                }
                              }}
                              className="w-4 h-4 text-green-600"
                            />
                            <div>
                              <div className="font-medium">{pi.piNumber}</div>
                              <div className="text-sm text-gray-600">{pi.supplierName}</div>
                              <div className="text-xs text-gray-500">
                                Total: {pi.currency} {pi.totalAmount.toLocaleString()} | 
                                Remaining: {pi.currency} {remainingBalance.toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-3">
                              <div className="text-right text-sm">
                                <div className="text-gray-600">Allocate:</div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={allocatedAmount}
                                    onChange={(e) => updateAllocation(pi.id, e.target.value)}
                                    className="w-32 px-3 py-1 border border-gray-300 rounded text-right text-sm"
                                    max={remainingBalance}
                                    min="0"
                                  />
                                  <span className="text-xs text-gray-600">{pi.currency}</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => updateAllocation(pi.id, remainingBalance)}
                                className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200"
                              >
                                Full
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validation Messages */}
              {unallocatedAmount > 0.01 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
                  <div>
                    <div className="font-medium text-yellow-800">Incomplete Allocation</div>
                    <div className="text-yellow-700 text-sm">
                      You have {extractedData.paidCurrency} {unallocatedAmount.toLocaleString()} unallocated. 
                      Please allocate the full amount to proceed.
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
                  Back
                </button>
                
                <button
                  onClick={() => setStep(4)}
                  disabled={!isFullyAllocated || selectedPIs.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Review & Confirm
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
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
                        <span>Total Paid:</span>
                        <span className="font-bold text-green-600">
                          {extractedData.paidCurrency} {extractedData.paidAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Exchange Rate:</span>
                        <span className="font-medium">{extractedData.exchangeRate.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Cost Breakdown</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Debit Amount:</span>
                        <span>MYR {extractedData.debitAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank Charges:</span>
                        <span>MYR {extractedData.bankCharges.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="font-medium">Total Cost:</span>
                        <span className="font-bold">MYR {extractedData.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* PI Allocations Table */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h4 className="font-medium">Payment Allocations ({selectedPIs.filter(id => allocation[id] > 0).length} PIs)</h4>
                </div>
                <div className="divide-y max-h-60 overflow-y-auto">
                  {selectedPIs
                    .filter(piId => allocation[piId] > 0)
                    .map(piId => {
                      const pi = availablePIs.find(p => p.id === piId);
                      const allocatedAmount = allocation[piId] || 0;
                      const myrAmount = allocatedAmount * extractedData.exchangeRate;
                      
                      return (
                        <div key={piId} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <div className="font-medium">{pi.piNumber}</div>
                            <div className="text-sm text-gray-600">{pi.supplierName}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              {pi.currency} {allocatedAmount.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              ≈ MYR {myrAmount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <CheckCircle2 size={20} />
                    Process Payment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BatchPaymentProcessor;
