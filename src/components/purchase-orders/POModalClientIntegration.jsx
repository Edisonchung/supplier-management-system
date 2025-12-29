/**
 * POModal Client Integration - Phase 3
 * 
 * This file contains the client selection components to integrate into POModal.jsx
 * It replaces the manual clientName input with a searchable dropdown that:
 * - Auto-populates payment terms, delivery terms, currency from client
 * - Loads contacts for the selected client
 * - Supports both existing clients and manual entry for new clients
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  ChevronDown,
  Search,
  Plus,
  Star,
  X,
  Check
} from 'lucide-react';

/**
 * ClientSelector Component
 * 
 * Drop-in replacement for client name text input in POModal
 * 
 * Props:
 * - clients: Array of client objects from useClients hook
 * - selectedClientId: Currently selected client ID
 * - onClientSelect: Callback when client is selected (clientId, clientData)
 * - onManualEntry: Callback when user wants to enter client manually
 * - disabled: Whether the selector is disabled
 * - error: Error message to display
 */
export const ClientSelector = ({
  clients = [],
  selectedClientId,
  onClientSelect,
  onManualEntry,
  disabled = false,
  error = null
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // Find selected client
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients.filter(c => c.status === 'active');
    
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.status === 'active' && (
        c.name?.toLowerCase().includes(term) ||
        c.shortName?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.registrationNumber?.toLowerCase().includes(term)
      )
    );
  }, [clients, searchTerm]);

  // Handle client selection
  const handleSelect = useCallback((client) => {
    onClientSelect?.(client.id, {
      clientId: client.id,
      clientName: client.name,
      clientShortName: client.shortName,
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
      paymentTerms: client.paymentTerms || 'Net 30',
      deliveryTerms: client.deliveryTerms || 'DDP',
      currency: client.currency || 'MYR'
    });
    setIsOpen(false);
    setSearchTerm('');
    setShowManualInput(false);
  }, [onClientSelect]);

  // Handle manual entry mode
  const handleManualEntry = useCallback(() => {
    setShowManualInput(true);
    setIsOpen(false);
    onManualEntry?.();
  }, [onManualEntry]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.client-selector')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="client-selector relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Client Name <span className="text-red-500">*</span>
      </label>
      
      {/* Selected Client Display / Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg text-left flex items-center justify-between ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-blue-400'}`}
      >
        {selectedClient ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-xs">
                {selectedClient.shortName || selectedClient.name?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-900">{selectedClient.name}</span>
              {selectedClient.shortName && (
                <span className="text-gray-500 text-sm ml-2">({selectedClient.shortName})</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-500">Select a client...</span>
        )}
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Client List */}
          <div className="max-h-56 overflow-y-auto">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelect(client)}
                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center gap-3 ${
                    selectedClientId === client.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-xs">
                      {client.shortName || client.name?.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{client.name}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {client.industry || 'No industry'} • {client.paymentTerms || 'Net 30'}
                    </div>
                  </div>
                  {selectedClientId === client.id && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                No clients found
              </div>
            )}
          </div>

          {/* Manual Entry Option */}
          <div className="border-t border-gray-200 p-2">
            <button
              type="button"
              onClick={handleManualEntry}
              className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Enter client manually (new client)
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </div>
  );
};


/**
 * ClientContactSelector Component
 * 
 * Dropdown for selecting a contact person from the selected client
 * 
 * Props:
 * - contacts: Array of contact objects for the selected client
 * - selectedContactId: Currently selected contact ID
 * - onContactSelect: Callback when contact is selected
 * - clientName: Client name for display when no contacts
 * - disabled: Whether the selector is disabled
 */
export const ClientContactSelector = ({
  contacts = [],
  selectedContactId,
  onContactSelect,
  clientName = '',
  disabled = false
}) => {
  // Find primary contact
  const primaryContact = useMemo(() => {
    return contacts.find(c => c.isPrimary);
  }, [contacts]);

  // Selected contact
  const selectedContact = useMemo(() => {
    return contacts.find(c => c.id === selectedContactId);
  }, [contacts, selectedContactId]);

  // Handle selection
  const handleSelect = useCallback((contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    onContactSelect?.(contactId, {
      clientContact: contact?.name || '',
      clientContactEmail: contact?.email || '',
      clientContactPhone: contact?.phone || '',
      clientContactTitle: contact?.title || ''
    });
  }, [contacts, onContactSelect]);

  if (contacts.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Person
        </label>
        <input
          type="text"
          disabled={disabled}
          placeholder={clientName ? `No contacts for ${clientName}` : 'Select a client first'}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          readOnly
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Contact Person
      </label>
      <select
        value={selectedContactId || ''}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select contact...</option>
        {contacts.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {contact.name}
            {contact.isPrimary && ' ⭐'}
            {contact.title && ` - ${contact.title}`}
          </option>
        ))}
      </select>
      {selectedContact && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
          <div className="flex items-center gap-4">
            {selectedContact.email && (
              <span className="flex items-center gap-1 text-gray-600">
                <Mail className="w-3 h-3" />
                {selectedContact.email}
              </span>
            )}
            {selectedContact.phone && (
              <span className="flex items-center gap-1 text-gray-600">
                <Phone className="w-3 h-3" />
                {selectedContact.phone}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


/**
 * ClientTermsDisplay Component
 * 
 * Shows the auto-populated business terms from the selected client
 * Allows override if needed
 * 
 * Props:
 * - paymentTerms: Current payment terms value
 * - deliveryTerms: Current delivery terms value
 * - currency: Current currency value
 * - onTermsChange: Callback when terms are changed
 * - isAutoPopulated: Whether terms were auto-populated from client
 */
export const ClientTermsDisplay = ({
  paymentTerms = 'Net 30',
  deliveryTerms = 'DDP',
  currency = 'MYR',
  onTermsChange,
  isAutoPopulated = false
}) => {
  const PAYMENT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'COD', 'CIA', 'Upon Receipt'];
  const DELIVERY_TERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA', 'CPT', 'CIP'];
  const CURRENCIES = ['MYR', 'USD', 'EUR', 'SGD', 'CNY', 'JPY', 'GBP', 'AUD'];

  return (
    <div className="space-y-4">
      {isAutoPopulated && (
        <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <Check className="w-3 h-3" />
          Terms auto-populated from client profile
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        {/* Payment Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Terms
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => onTermsChange?.('paymentTerms', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {PAYMENT_TERMS.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>

        {/* Delivery Terms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delivery Terms
          </label>
          <select
            value={deliveryTerms}
            onChange={(e) => onTermsChange?.('deliveryTerms', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {DELIVERY_TERMS.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => onTermsChange?.('currency', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {CURRENCIES.map(curr => (
              <option key={curr} value={curr}>{curr}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};


/**
 * INTEGRATION INSTRUCTIONS
 * ========================
 * 
 * 1. Import these components and useClients hook in POModal.jsx:
 * 
 *    import { useClients } from '../../hooks/useClients';
 *    import { ClientSelector, ClientContactSelector, ClientTermsDisplay } from './POModalClientIntegration';
 * 
 * 2. Add useClients hook inside POModal component:
 * 
 *    const { clients, getContactsForClient } = useClients();
 *    const [selectedClientId, setSelectedClientId] = useState(null);
 *    const [clientContacts, setClientContacts] = useState([]);
 *    const [selectedContactId, setSelectedContactId] = useState(null);
 *    const [termsAutoPopulated, setTermsAutoPopulated] = useState(false);
 * 
 * 3. Add useEffect to load contacts when client changes:
 * 
 *    useEffect(() => {
 *      if (selectedClientId) {
 *        const contacts = getContactsForClient(selectedClientId);
 *        setClientContacts(contacts);
 *        // Auto-select primary contact
 *        const primary = contacts.find(c => c.isPrimary);
 *        if (primary) setSelectedContactId(primary.id);
 *      } else {
 *        setClientContacts([]);
 *        setSelectedContactId(null);
 *      }
 *    }, [selectedClientId, getContactsForClient]);
 * 
 * 4. Replace the Client Name input section with:
 * 
 *    <ClientSelector
 *      clients={clients}
 *      selectedClientId={selectedClientId}
 *      onClientSelect={(clientId, clientData) => {
 *        setSelectedClientId(clientId);
 *        setFormData(prev => ({
 *          ...prev,
 *          clientId: clientId,
 *          clientName: clientData.clientName,
 *          paymentTerms: clientData.paymentTerms,
 *          deliveryTerms: clientData.deliveryTerms,
 *          currency: clientData.currency
 *        }));
 *        setTermsAutoPopulated(true);
 *      }}
 *      onManualEntry={() => {
 *        setSelectedClientId(null);
 *        setTermsAutoPopulated(false);
 *      }}
 *      error={validationErrors?.find(e => e.field === 'clientName')?.message}
 *    />
 * 
 * 5. Replace Contact Person input with:
 * 
 *    <ClientContactSelector
 *      contacts={clientContacts}
 *      selectedContactId={selectedContactId}
 *      onContactSelect={(contactId, contactData) => {
 *        setSelectedContactId(contactId);
 *        setFormData(prev => ({
 *          ...prev,
 *          clientContact: contactData.clientContact,
 *          clientEmail: contactData.clientContactEmail,
 *          clientPhone: contactData.clientContactPhone
 *        }));
 *      }}
 *      clientName={formData.clientName}
 *    />
 * 
 * 6. Add ClientTermsDisplay after the contact section:
 * 
 *    <ClientTermsDisplay
 *      paymentTerms={formData.paymentTerms}
 *      deliveryTerms={formData.deliveryTerms}
 *      currency={formData.currency}
 *      onTermsChange={(field, value) => handleInputChange(field, value)}
 *      isAutoPopulated={termsAutoPopulated}
 *    />
 */

export default {
  ClientSelector,
  ClientContactSelector,
  ClientTermsDisplay
};
