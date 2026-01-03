// ContactSelector.jsx
// Multi-select contact picker for quotation attention contacts
// Supports selecting multiple contacts and designating a primary contact

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  User,
  Mail,
  Phone,
  Building2,
  Star,
  StarOff,
  X,
  Plus,
  ChevronDown,
  Search,
  Loader2,
  AlertCircle,
  Check,
  UserPlus
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

const ContactSelector = ({
  clientId,
  selectedContacts = [], // Array of { contactId, name, email, phone, department, isPrimary }
  onChange,
  maxContacts = 5,
  disabled = false,
  showAddNew = true,
  onAddNewContact
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load contacts when client changes
  useEffect(() => {
    if (clientId) {
      loadContacts();
    } else {
      setContacts([]);
    }
  }, [clientId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadContacts = async () => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const q = query(
        collection(db, 'clientContacts'),
        where('clientId', '==', clientId),
        where('isActive', '==', true),
        orderBy('name')
      );
      
      const snapshot = await getDocs(q);
      setContacts(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchText) return true;
    const search = searchText.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(search) ||
      contact.email?.toLowerCase().includes(search) ||
      contact.department?.toLowerCase().includes(search) ||
      contact.title?.toLowerCase().includes(search)
    );
  });

  const isSelected = (contactId) => {
    return selectedContacts.some(c => c.contactId === contactId);
  };

  const isPrimaryContact = (contactId) => {
    return selectedContacts.find(c => c.contactId === contactId)?.isPrimary || false;
  };

  const handleSelectContact = (contact) => {
    if (isSelected(contact.id)) {
      // Remove contact
      const updated = selectedContacts.filter(c => c.contactId !== contact.id);
      // If removed contact was primary, make first remaining contact primary
      if (isPrimaryContact(contact.id) && updated.length > 0) {
        updated[0].isPrimary = true;
      }
      onChange(updated);
    } else if (selectedContacts.length < maxContacts) {
      // Add contact
      const newContact = {
        contactId: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        department: contact.department,
        title: contact.title,
        isPrimary: selectedContacts.length === 0 // First contact is primary by default
      };
      onChange([...selectedContacts, newContact]);
    }
  };

  const handleSetPrimary = (contactId, e) => {
    e.stopPropagation();
    const updated = selectedContacts.map(c => ({
      ...c,
      isPrimary: c.contactId === contactId
    }));
    onChange(updated);
  };

  const handleRemoveContact = (contactId, e) => {
    e.stopPropagation();
    const updated = selectedContacts.filter(c => c.contactId !== contactId);
    // If removed contact was primary, make first remaining contact primary
    if (isPrimaryContact(contactId) && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const handleAddNew = () => {
    setIsOpen(false);
    if (onAddNewContact) {
      onAddNewContact();
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Contacts Display */}
      {selectedContacts.length > 0 && (
        <div className="space-y-2">
          {selectedContacts.map((contact, index) => (
            <div
              key={contact.contactId}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                contact.isPrimary
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {contact.name}
                  </span>
                  {contact.isPrimary && (
                    <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      Primary
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                  {contact.email && (
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3" />
                      {contact.email}
                    </span>
                  )}
                  {contact.department && (
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3" />
                      {contact.department}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                {!contact.isPrimary && selectedContacts.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleSetPrimary(contact.contactId, e)}
                    className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded"
                    title="Set as primary contact"
                  >
                    <StarOff className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => handleRemoveContact(contact.contactId, e)}
                  disabled={disabled}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
                  title="Remove contact"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Contact Dropdown */}
      {selectedContacts.length < maxContacts && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              if (!disabled && clientId) {
                setIsOpen(!isOpen);
                if (!isOpen) {
                  setTimeout(() => inputRef.current?.focus(), 100);
                }
              }
            }}
            disabled={disabled || !clientId}
            className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg transition-colors ${
              disabled || !clientId
                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              {selectedContacts.length === 0
                ? 'Select attention contact'
                : 'Add another contact'}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {!clientId && (
            <p className="text-sm text-amber-600 mt-1">
              Please select a client first
            </p>
          )}
          
          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-hidden">
              {/* Search Input */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search contacts..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Contact List */}
              <div className="max-h-52 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : error ? (
                  <div className="flex items-center gap-2 p-4 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                      {searchText ? 'No contacts found' : 'No contacts available'}
                    </p>
                  </div>
                ) : (
                  filteredContacts.map(contact => {
                    const selected = isSelected(contact.id);
                    return (
                      <div
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                          selected
                            ? 'bg-blue-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">
                              {contact.name}
                            </span>
                            {contact.title && (
                              <span className="text-xs text-gray-500 truncate">
                                • {contact.title}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            {contact.email && (
                              <span className="truncate">{contact.email}</span>
                            )}
                            {contact.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {contact.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {selected && (
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Add New Contact Option */}
              {showAddNew && onAddNewContact && (
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={handleAddNew}
                    className="w-full flex items-center gap-2 px-4 py-3 text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add New Contact</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Max contacts message */}
      {selectedContacts.length >= maxContacts && (
        <p className="text-sm text-gray-500">
          Maximum of {maxContacts} contacts allowed
        </p>
      )}
    </div>
  );
};

// Compact version for inline display
export const ContactSelectorCompact = ({
  clientId,
  selectedContacts = [],
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && clientId && setIsOpen(true)}
        disabled={disabled || !clientId}
        className={`w-full flex items-center gap-2 px-3 py-2 border rounded-lg text-left ${
          disabled || !clientId
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
            : 'border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Users className="w-4 h-4 text-gray-400" />
        <span className="flex-1 truncate">
          {selectedContacts.length === 0
            ? 'Select contacts'
            : `${selectedContacts.length} contact${selectedContacts.length !== 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {isOpen && (
        <ContactSelectorModal
          clientId={clientId}
          selectedContacts={selectedContacts}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

// Modal version for full contact selection
const ContactSelectorModal = ({
  clientId,
  selectedContacts,
  onChange,
  onClose
}) => {
  const [localSelection, setLocalSelection] = useState(selectedContacts);
  
  const handleSave = () => {
    onChange(localSelection);
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">Select Contacts</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="px-6 py-4">
            <ContactSelector
              clientId={clientId}
              selectedContacts={localSelection}
              onChange={setLocalSelection}
              maxContacts={5}
              showAddNew={false}
            />
          </div>
          
          <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSelector;
