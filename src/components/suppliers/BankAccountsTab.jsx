// src/components/suppliers/BankAccountsTab.jsx
// Bank Accounts Management Tab for Supplier Modal
// Allows adding, editing, and managing multiple bank accounts per supplier

import React, { useState, useCallback } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  Star, 
  Check, 
  X,
  Globe,
  CreditCard,
  Copy,
  CheckCircle
} from 'lucide-react';

// Currency options with flags
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
];

// Country options for bank location
const COUNTRIES = [
  'China', 'Hong Kong', 'Malaysia', 'Singapore', 'United States', 
  'United Kingdom', 'Germany', 'Japan', 'Taiwan', 'Thailand', 'Vietnam'
];

// Empty bank account template
const EMPTY_BANK_ACCOUNT = {
  id: '',
  isDefault: false,
  currency: 'USD',
  bankName: '',
  bankAddress: '',
  bankCode: '',
  branchCode: '',
  accountNumber: '',
  accountName: '',
  accountType: 'current',
  swiftCode: '',
  iban: '',
  routingNumber: '',
  beneficiaryAddress: '',
  country: 'China',
  paymentMemo: '',
  verified: false,
  addedFrom: 'manual'
};

const BankAccountsTab = ({ 
  bankAccounts = [], 
  onUpdate, 
  supplierName = '',
  supplierAddress = '',
  showNotification 
}) => {
  const [editingAccount, setEditingAccount] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState(EMPTY_BANK_ACCOUNT);
  const [copiedField, setCopiedField] = useState(null);

  // Generate unique ID for new bank accounts
  const generateBankAccountId = () => {
    return `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Handle form field changes
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Start adding new account
  const handleAddNew = () => {
    setFormData({
      ...EMPTY_BANK_ACCOUNT,
      id: generateBankAccountId(),
      accountName: supplierName, // Pre-fill with supplier name
      beneficiaryAddress: supplierAddress,
      isDefault: bankAccounts.length === 0 // First account is default
    });
    setIsAddingNew(true);
    setEditingAccount(null);
  };

  // Start editing existing account
  const handleEdit = (account) => {
    setFormData({ ...account });
    setEditingAccount(account.id);
    setIsAddingNew(false);
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData(EMPTY_BANK_ACCOUNT);
    setEditingAccount(null);
    setIsAddingNew(false);
  };

  // Save account (new or edited)
  const handleSave = () => {
    // Validation
    if (!formData.bankName?.trim()) {
      showNotification?.('Bank name is required', 'error');
      return;
    }
    if (!formData.accountNumber?.trim()) {
      showNotification?.('Account number is required', 'error');
      return;
    }
    if (!formData.swiftCode?.trim()) {
      showNotification?.('SWIFT code is required for international transfers', 'error');
      return;
    }

    let updatedAccounts;
    
    if (isAddingNew) {
      // Add new account
      const newAccount = {
        ...formData,
        lastUsed: null,
        addedFrom: 'manual'
      };
      
      // If setting as default, unset other defaults
      if (newAccount.isDefault) {
        updatedAccounts = bankAccounts.map(acc => ({ ...acc, isDefault: false }));
        updatedAccounts.push(newAccount);
      } else {
        updatedAccounts = [...bankAccounts, newAccount];
      }
      
      showNotification?.('Bank account added successfully', 'success');
    } else {
      // Update existing account
      updatedAccounts = bankAccounts.map(acc => {
        if (acc.id === editingAccount) {
          return { ...formData };
        }
        // If edited account is now default, unset others
        if (formData.isDefault && acc.id !== editingAccount) {
          return { ...acc, isDefault: false };
        }
        return acc;
      });
      
      showNotification?.('Bank account updated successfully', 'success');
    }

    onUpdate(updatedAccounts);
    handleCancel();
  };

  // Delete account
  const handleDelete = (accountId) => {
    if (!window.confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    const updatedAccounts = bankAccounts.filter(acc => acc.id !== accountId);
    
    // If deleted was default and there are others, set first as default
    if (updatedAccounts.length > 0 && !updatedAccounts.some(acc => acc.isDefault)) {
      updatedAccounts[0].isDefault = true;
    }

    onUpdate(updatedAccounts);
    showNotification?.('Bank account deleted', 'info');
  };

  // Set as default
  const handleSetDefault = (accountId) => {
    const updatedAccounts = bankAccounts.map(acc => ({
      ...acc,
      isDefault: acc.id === accountId
    }));
    onUpdate(updatedAccounts);
    showNotification?.('Default bank account updated', 'success');
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

  // Get currency info
  const getCurrencyInfo = (code) => {
    return CURRENCIES.find(c => c.code === code) || CURRENCIES[0];
  };

  // Render bank account card
  const renderAccountCard = (account) => {
    const currencyInfo = getCurrencyInfo(account.currency);
    
    return (
      <div 
        key={account.id}
        className={`border rounded-lg p-4 ${
          account.isDefault 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">{account.bankName}</h4>
              <p className="text-sm text-gray-500">{account.country}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {account.isDefault && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" /> Default
              </span>
            )}
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
              {currencyInfo.flag} {account.currency}
            </span>
          </div>
        </div>

        {/* Account Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Account Name:</span>
            <span className="font-medium">{account.accountName}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Account Number:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{account.accountNumber}</span>
              <button 
                onClick={() => handleCopy(account.accountNumber, `${account.id}-account`)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {copiedField === `${account.id}-account` ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-500">SWIFT Code:</span>
            <div className="flex items-center gap-2">
              <span className="font-mono">{account.swiftCode}</span>
              <button 
                onClick={() => handleCopy(account.swiftCode, `${account.id}-swift`)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                {copiedField === `${account.id}-swift` ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {account.bankCode && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bank Code:</span>
              <span className="font-mono">{account.bankCode}</span>
            </div>
          )}

          {account.branchCode && (
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Branch Code:</span>
              <span className="font-mono">{account.branchCode}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
          {!account.isDefault && (
            <button
              onClick={() => handleSetDefault(account.id)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Star className="w-4 h-4" /> Set as Default
            </button>
          )}
          <button
            onClick={() => handleEdit(account)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(account.id)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Render add/edit form
  const renderForm = () => (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        {isAddingNew ? 'Add New Bank Account' : 'Edit Bank Account'}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bank Information */}
        <div className="md:col-span-2">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Building2 className="w-4 h-4" /> Bank Information
          </h5>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleFieldChange('bankName', e.target.value)}
            placeholder="e.g., Citibank N.A., Hong Kong Branch"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <select
            value={formData.country}
            onChange={(e) => handleFieldChange('country', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {COUNTRIES.map(country => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Address
          </label>
          <input
            type="text"
            value={formData.bankAddress}
            onChange={(e) => handleFieldChange('bankAddress', e.target.value)}
            placeholder="Full bank branch address"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SWIFT Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.swiftCode}
            onChange={(e) => handleFieldChange('swiftCode', e.target.value.toUpperCase())}
            placeholder="e.g., CITIHKHX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={(e) => handleFieldChange('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {CURRENCIES.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.flag} {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Code
          </label>
          <input
            type="text"
            value={formData.bankCode}
            onChange={(e) => handleFieldChange('bankCode', e.target.value)}
            placeholder="e.g., 006"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch Code
          </label>
          <input
            type="text"
            value={formData.branchCode}
            onChange={(e) => handleFieldChange('branchCode', e.target.value)}
            placeholder="e.g., 391"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Account Information */}
        <div className="md:col-span-2 mt-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <CreditCard className="w-4 h-4" /> Account Information
          </h5>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleFieldChange('accountNumber', e.target.value)}
            placeholder="e.g., 3996000632141"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Name (Beneficiary)
          </label>
          <input
            type="text"
            value={formData.accountName}
            onChange={(e) => handleFieldChange('accountName', e.target.value)}
            placeholder="e.g., SGG Import & Export (Weifang) Co., Ltd."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Beneficiary Address
          </label>
          <input
            type="text"
            value={formData.beneficiaryAddress}
            onChange={(e) => handleFieldChange('beneficiaryAddress', e.target.value)}
            placeholder="Full beneficiary address"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IBAN (if applicable)
          </label>
          <input
            type="text"
            value={formData.iban}
            onChange={(e) => handleFieldChange('iban', e.target.value.toUpperCase())}
            placeholder="For European banks"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Routing Number (if applicable)
          </label>
          <input
            type="text"
            value={formData.routingNumber}
            onChange={(e) => handleFieldChange('routingNumber', e.target.value)}
            placeholder="For US banks"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Memo/Instructions
          </label>
          <textarea
            value={formData.paymentMemo}
            onChange={(e) => handleFieldChange('paymentMemo', e.target.value)}
            placeholder="e.g., Please include Invoice Number in payment reference"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Options */}
        <div className="md:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Set as default bank account</span>
          </label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-2"
        >
          <X className="w-4 h-4" /> Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> Save Bank Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Bank Accounts
          </h3>
          <p className="text-sm text-gray-500">
            Manage bank accounts for international payments
          </p>
        </div>
        {!isAddingNew && !editingAccount && (
          <button
            onClick={handleAddNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Bank Account
          </button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAddingNew || editingAccount) && renderForm()}

      {/* Existing Accounts */}
      {!isAddingNew && !editingAccount && (
        <div className="space-y-3">
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No bank accounts added yet</p>
              <p className="text-sm text-gray-400">Add bank account details for faster PI creation</p>
              <button
                onClick={handleAddNew}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add your first bank account
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {bankAccounts.map(account => renderAccountCard(account))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BankAccountsTab;
