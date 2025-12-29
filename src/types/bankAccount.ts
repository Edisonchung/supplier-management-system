// src/types/bankAccount.ts
// Shared type definitions for supplier bank account structures

export interface BankAccount {
  id: string;
  isDefault: boolean;
  currency: 'USD' | 'EUR' | 'CNY' | 'MYR' | 'HKD' | 'GBP' | 'SGD' | 'JPY';
  bankName: string;
  bankAddress?: string;
  bankCode?: string;
  branchCode?: string;
  accountNumber: string;
  accountName: string;
  accountType?: 'current' | 'savings';
  swiftCode: string;
  iban?: string;
  routingNumber?: string;
  beneficiaryAddress?: string;
  country: string;
  paymentMemo?: string;
  lastUsed?: string;
  verified?: boolean;
  addedFrom?: 'manual' | 'ai-extraction';
  createdAt?: string;
  updatedAt?: string;
}

// Lightweight Supplier interface including bank accounts.
// Existing supplier fields can be extended via intersection types
// or declaration merging elsewhere if you adopt TypeScript broadly.
export interface Supplier {
  // ...existing supplier fields
  bankAccounts?: BankAccount[];
}


