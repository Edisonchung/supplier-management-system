// src/hooks/useBankAccounts.js
// Custom hook for managing supplier bank accounts
// Provides CRUD operations and smart account selection

import { useState, useCallback, useMemo } from 'react';
import { suppliersService } from '../services/firestore/suppliers.service';

/**
 * Custom hook for managing supplier bank accounts
 * @param {string} supplierId - The supplier ID to manage accounts for
 * @param {Object} options - Configuration options
 * @returns {Object} Bank account operations and state
 */
export const useBankAccounts = (supplierId, options = {}) => {
  const {
    onUpdate,
    showNotification,
    suppliers = []
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get current supplier's bank accounts
  const currentSupplier = useMemo(() => {
    return suppliers.find(s => s.id === supplierId);
  }, [suppliers, supplierId]);

  const bankAccounts = useMemo(() => {
    return currentSupplier?.bankAccounts || [];
  }, [currentSupplier]);

  // Get default bank account
  const defaultAccount = useMemo(() => {
    return bankAccounts.find(acc => acc.isDefault) || bankAccounts[0];
  }, [bankAccounts]);

  // Get accounts by currency
  const getAccountsByCurrency = useCallback((currency) => {
    return bankAccounts.filter(acc => acc.currency === currency);
  }, [bankAccounts]);

  // Get best matching account for a currency
  const getBestAccountForCurrency = useCallback((currency) => {
    const currencyAccounts = getAccountsByCurrency(currency);
    if (currencyAccounts.length > 0) {
      return currencyAccounts.find(acc => acc.isDefault) || currencyAccounts[0];
    }
    return defaultAccount;
  }, [getAccountsByCurrency, defaultAccount]);

  // Add new bank account
  const addBankAccount = useCallback(async (accountData) => {
    if (!supplierId) {
      setError('No supplier selected');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newAccount = {
        id: `bank-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...accountData,
        addedFrom: accountData.addedFrom || 'manual',
        lastUsed: null,
        createdAt: new Date().toISOString()
      };

      // If this is the first account or marked as default, update other accounts
      let updatedAccounts = [...bankAccounts];
      if (newAccount.isDefault || updatedAccounts.length === 0) {
        updatedAccounts = updatedAccounts.map(acc => ({ ...acc, isDefault: false }));
        newAccount.isDefault = true;
      }
      updatedAccounts.push(newAccount);

      // Update supplier in Firestore
      await suppliersService.update(supplierId, {
        bankAccounts: updatedAccounts,
        updatedAt: new Date().toISOString()
      });

      // Notify parent components
      onUpdate?.(updatedAccounts);
      showNotification?.('Bank account added successfully', 'success');

      return newAccount;
    } catch (err) {
      console.error('Error adding bank account:', err);
      setError(err.message);
      showNotification?.('Failed to add bank account', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [supplierId, bankAccounts, onUpdate, showNotification]);

  // Update existing bank account
  const updateBankAccount = useCallback(async (accountId, updates) => {
    if (!supplierId) {
      setError('No supplier selected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      let updatedAccounts = bankAccounts.map(acc => {
        if (acc.id === accountId) {
          return { ...acc, ...updates, updatedAt: new Date().toISOString() };
        }
        // If updated account is now default, unset others
        if (updates.isDefault && acc.id !== accountId) {
          return { ...acc, isDefault: false };
        }
        return acc;
      });

      await suppliersService.update(supplierId, {
        bankAccounts: updatedAccounts,
        updatedAt: new Date().toISOString()
      });

      onUpdate?.(updatedAccounts);
      showNotification?.('Bank account updated', 'success');

      return true;
    } catch (err) {
      console.error('Error updating bank account:', err);
      setError(err.message);
      showNotification?.('Failed to update bank account', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supplierId, bankAccounts, onUpdate, showNotification]);

  // Delete bank account
  const deleteBankAccount = useCallback(async (accountId) => {
    if (!supplierId) {
      setError('No supplier selected');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      let updatedAccounts = bankAccounts.filter(acc => acc.id !== accountId);

      // If deleted was default, set first remaining as default
      if (updatedAccounts.length > 0 && !updatedAccounts.some(acc => acc.isDefault)) {
        updatedAccounts[0].isDefault = true;
      }

      await suppliersService.update(supplierId, {
        bankAccounts: updatedAccounts,
        updatedAt: new Date().toISOString()
      });

      onUpdate?.(updatedAccounts);
      showNotification?.('Bank account deleted', 'info');

      return true;
    } catch (err) {
      console.error('Error deleting bank account:', err);
      setError(err.message);
      showNotification?.('Failed to delete bank account', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [supplierId, bankAccounts, onUpdate, showNotification]);

  // Set account as default
  const setDefaultAccount = useCallback(async (accountId) => {
    return updateBankAccount(accountId, { isDefault: true });
  }, [updateBankAccount]);

  // Record usage (update lastUsed timestamp)
  const recordUsage = useCallback(async (accountId) => {
    if (!accountId || !supplierId) return;

    try {
      const updatedAccounts = bankAccounts.map(acc => {
        if (acc.id === accountId) {
          return { ...acc, lastUsed: new Date().toISOString() };
        }
        return acc;
      });

      await suppliersService.update(supplierId, {
        bankAccounts: updatedAccounts
      });
    } catch (err) {
      console.error('Error recording bank account usage:', err);
    }
  }, [supplierId, bankAccounts]);

  // Save bank details from PI to supplier (for AI extraction)
  const saveBankDetailsFromPI = useCallback(async (bankDetails, currency = 'USD') => {
    if (!bankDetails?.bankName || !bankDetails?.accountNumber) {
      console.log('Insufficient bank details to save');
      return null;
    }

    // Check if this account already exists
    const existingAccount = bankAccounts.find(acc => 
      acc.accountNumber === bankDetails.accountNumber &&
      acc.swiftCode === bankDetails.swiftCode
    );

    if (existingAccount) {
      console.log('Bank account already exists:', existingAccount.id);
      return existingAccount;
    }

    // Create new account from PI data
    const newAccount = {
      currency,
      bankName: bankDetails.bankName,
      bankAddress: bankDetails.bankAddress || '',
      bankCode: bankDetails.bankCode || '',
      branchCode: bankDetails.branchCode || '',
      accountNumber: bankDetails.accountNumber,
      accountName: bankDetails.accountName || '',
      swiftCode: bankDetails.swiftCode || '',
      iban: bankDetails.iban || '',
      routingNumber: bankDetails.routingNumber || '',
      beneficiaryAddress: bankDetails.beneficiaryAddress || '',
      country: bankDetails.country || 'China',
      paymentMemo: bankDetails.paymentMemo || '',
      verified: false,
      addedFrom: 'ai-extraction',
      isDefault: bankAccounts.length === 0
    };

    return addBankAccount(newAccount);
  }, [bankAccounts, addBankAccount]);

  return {
    // State
    bankAccounts,
    defaultAccount,
    loading,
    error,

    // Getters
    getAccountsByCurrency,
    getBestAccountForCurrency,

    // Operations
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefaultAccount,
    recordUsage,
    saveBankDetailsFromPI
  };
};

export default useBankAccounts;
