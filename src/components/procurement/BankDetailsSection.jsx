// src/components/procurement/BankDetailsSection.jsx
// Reusable Bank Details Section for PI Modal
// Auto-populates from supplier's saved bank accounts with selection dropdown

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  ChevronDown, 
  ChevronUp,
  Copy, 
  CheckCircle, 
  AlertCircle,
  Star,
  Plus,
  RefreshCw
} from 'lucide-react';

const BankDetailsSection = ({ 
  bankDetails = {},
  supplierBankAccounts = [],
  selectedSupplierId,
  selectedSupplierName,
  onChange,
  onSaveToSupplier,
  showNotification,
  currency = 'USD'
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [saveToSupplier, setSaveToSupplier] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Find matching accounts by currency
  const matchingAccounts = useMemo(() => {
    if (!supplierBankAccounts || supplierBankAccounts.length === 0) return [];
    
    // Prioritize accounts matching the PI currency
    const currencyMatches = supplierBankAccounts.filter(acc => acc.currency === currency);
    const otherAccounts = supplierBankAccounts.filter(acc => acc.currency !== currency);
    
    return [...currencyMatches, ...otherAccounts];
  }, [supplierBankAccounts, currency]);

  // Auto-select default account when supplier changes
  useEffect(() => {
    if (supplierBankAccounts && supplierBankAccounts.length > 0) {
      // Find default account or first matching currency account
      const defaultAccount = supplierBankAccounts.find(acc => acc.isDefault);
      const currencyAccount = supplierBankAccounts.find(acc => acc.currency === currency);
      const accountToSelect = currencyAccount || defaultAccount || supplierBankAccounts[0];
      
      if (accountToSelect) {
        setSelectedAccountId(accountToSelect.id);
        populateFromAccount(accountToSelect);
        setIsModified(false);
      }
    } else {
      // Clear selection if no accounts
      setSelectedAccountId(null);
    }
  }, [selectedSupplierId, supplierBankAccounts, currency]);

  // Populate form from selected account
  const populateFromAccount = (account) => {
    if (!account) return;
    
    onChange({
      bankName: account.bankName || '',
      accountNumber: account.accountNumber || '',
      accountName: account.accountName || '',
      swiftCode: account.swiftCode || '',
      iban: account.iban || '',
      routingNumber: account.routingNumber || '',
      bankAddress: account.bankAddress || '',
      bankCode: account.bankCode || '',
      branchCode: account.branchCode || '',
      country: account.country || '',
      beneficiaryAddress: account.beneficiaryAddress || '',
      paymentMemo: account.paymentMemo || ''
    });
  };

  // Handle account selection change
  const handleAccountSelect = (accountId) => {
    setSelectedAccountId(accountId);
    const account = supplierBankAccounts.find(acc => acc.id === accountId);
    if (account) {
      populateFromAccount(account);
      setIsModified(false);
    }
  };

  // Handle field change
  const handleFieldChange = (field, value) => {
    onChange({
      ...bankDetails,
      [field]: value
    });
    setIsModified(true);
  };

  // Copy to clipboard
  const handleCopy = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle save to supplier
  const handleSaveToSupplier = () => {
    if (onSaveToSupplier && selectedSupplierId) {
      onSaveToSupplier({
        ...bankDetails,
        currency,
        id: `bank-${Date.now()}`,
        isDefault: supplierBankAccounts.length === 0,
        addedFrom: 'pi-extraction',
        lastUsed: new Date().toISOString()
      });
      showNotification?.('Bank account saved to supplier', 'success');
      setSaveToSupplier(false);
      setIsModified(false);
    }
  };

  // Check if we have bank details
  const hasBankDetails = bankDetails?.bankName || bankDetails?.accountNumber;
  const hasSupplierAccounts = supplierBankAccounts && supplierBankAccounts.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">Banking Details</span>
          {hasBankDetails && (
            <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
              {bankDetails.bankName}
            </span>
          )}
          {isModified && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
              Modified
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Account Selector (if supplier has saved accounts) */}
          {hasSupplierAccounts && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Select Saved Bank Account
              </label>
              <select
                value={selectedAccountId || ''}
                onChange={(e) => handleAccountSelect(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Select Account --</option>
                {matchingAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.isDefault && '⭐ '}
                    {account.bankName} - {account.currency} 
                    ({account.accountNumber.slice(-4).padStart(account.accountNumber.length, '*')})
                  </option>
                ))}
              </select>
              {matchingAccounts.length > 0 && matchingAccounts[0].currency !== currency && (
                <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No {currency} account found. Showing all available accounts.
                </p>
              )}
            </div>
          )}

          {/* No Saved Accounts Warning */}
          {!hasSupplierAccounts && selectedSupplierId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  No saved bank accounts for {selectedSupplierName || 'this supplier'}.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Enter bank details below. You can save them to the supplier for future use.
                </p>
              </div>
            </div>
          )}

          {/* Bank Details Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={bankDetails.bankName || ''}
                onChange={(e) => handleFieldChange('bankName', e.target.value)}
                placeholder="e.g., CITIBANK, N.A., Hong Kong Branch"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bankDetails.accountNumber || ''}
                  onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
                  placeholder="e.g., 3996000632141"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                />
                {bankDetails.accountNumber && (
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails.accountNumber, 'accountNumber')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    {copiedField === 'accountNumber' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Account Name / Beneficiary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beneficiary Name
              </label>
              <input
                type="text"
                value={bankDetails.accountName || ''}
                onChange={(e) => handleFieldChange('accountName', e.target.value)}
                placeholder="Account holder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SWIFT Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SWIFT/BIC Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bankDetails.swiftCode || ''}
                  onChange={(e) => handleFieldChange('swiftCode', e.target.value.toUpperCase())}
                  placeholder="e.g., CITIHKHX"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                />
                {bankDetails.swiftCode && (
                  <button
                    type="button"
                    onClick={() => handleCopy(bankDetails.swiftCode, 'swiftCode')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    {copiedField === 'swiftCode' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Bank Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Code
              </label>
              <input
                type="text"
                value={bankDetails.bankCode || ''}
                onChange={(e) => handleFieldChange('bankCode', e.target.value)}
                placeholder="e.g., 006"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Branch Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch Code
              </label>
              <input
                type="text"
                value={bankDetails.branchCode || ''}
                onChange={(e) => handleFieldChange('branchCode', e.target.value)}
                placeholder="e.g., 391"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Bank Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Address
              </label>
              <input
                type="text"
                value={bankDetails.bankAddress || ''}
                onChange={(e) => handleFieldChange('bankAddress', e.target.value)}
                placeholder="Full bank branch address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* IBAN (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IBAN <span className="text-gray-400">(if applicable)</span>
              </label>
              <input
                type="text"
                value={bankDetails.iban || ''}
                onChange={(e) => handleFieldChange('iban', e.target.value.toUpperCase())}
                placeholder="For EU banks"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Routing Number (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Routing Number <span className="text-gray-400">(if applicable)</span>
              </label>
              <input
                type="text"
                value={bankDetails.routingNumber || ''}
                onChange={(e) => handleFieldChange('routingNumber', e.target.value)}
                placeholder="For US banks"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* Beneficiary Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beneficiary Address
              </label>
              <input
                type="text"
                value={bankDetails.beneficiaryAddress || ''}
                onChange={(e) => handleFieldChange('beneficiaryAddress', e.target.value)}
                placeholder="Supplier's address for wire transfer"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Save to Supplier Option */}
          {selectedSupplierId && isModified && hasBankDetails && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="saveToSupplier"
                  checked={saveToSupplier}
                  onChange={(e) => setSaveToSupplier(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <label htmlFor="saveToSupplier" className="text-sm text-green-800">
                  Save this bank account to supplier for future use
                </label>
              </div>
              {saveToSupplier && (
                <button
                  type="button"
                  onClick={handleSaveToSupplier}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Save to Supplier
                </button>
              )}
            </div>
          )}

          {/* Quick Actions */}
          {hasBankDetails && (
            <div className="flex items-center gap-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => {
                  const details = `Bank: ${bankDetails.bankName}\nAccount: ${bankDetails.accountNumber}\nBeneficiary: ${bankDetails.accountName}\nSWIFT: ${bankDetails.swiftCode}`;
                  handleCopy(details, 'all');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                {copiedField === 'all' ? (
                  <><CheckCircle className="w-4 h-4" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4" /> Copy All Details</>
                )}
              </button>
              
              {selectedAccountId && (
                <button
                  type="button"
                  onClick={() => {
                    const account = supplierBankAccounts.find(acc => acc.id === selectedAccountId);
                    if (account) {
                      populateFromAccount(account);
                      setIsModified(false);
                    }
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" /> Reset to Saved
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BankDetailsSection;
