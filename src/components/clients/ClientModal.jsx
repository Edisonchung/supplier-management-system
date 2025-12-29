import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  CreditCard,
  Truck,
  DollarSign,
  Users,
  Plus,
  Trash2,
  Star,
  Loader2,
  CheckCircle,
  AlertCircle,
  Briefcase,
  Hash
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const ClientModal = ({ 
  isOpen, 
  onClose, 
  editingClient = null, 
  onSave,
  showNotification 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    email: '',
    phone: '',
    address: '',
    registrationNumber: '',
    taxId: '',
    industry: '',
    website: '',
    paymentTerms: 'Net 30',
    deliveryTerms: 'DDP',
    currency: 'MYR',
    status: 'active',
    notes: ''
  });

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false); // NEW: Loading state for contacts
  const [activeTab, setActiveTab] = useState('basic');
  const [errors, setErrors] = useState({});

  // New contact form
  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    department: '',
    email: '',
    phone: '',
    isPrimary: false
  });
  const [showAddContact, setShowAddContact] = useState(false);

  // Constants
  const PAYMENT_TERMS = ['Net 7', 'Net 14', 'Net 30', 'Net 45', 'Net 60', 'Net 90', 'COD', 'CIA', 'Upon Receipt'];
  const DELIVERY_TERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP', 'FCA', 'CPT', 'CIP'];
  const CURRENCIES = ['MYR', 'USD', 'EUR', 'SGD', 'CNY', 'JPY', 'GBP', 'AUD'];
  const INDUSTRIES = [
    'Port Operations',
    'Logistics & Shipping',
    'Manufacturing',
    'Oil & Gas',
    'Construction',
    'Automotive',
    'Electronics',
    'Food & Beverage',
    'Pharmaceutical',
    'Retail',
    'Technology',
    'Utilities',
    'Other'
  ];
  const STATUSES = [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'gray' },
    { value: 'pending', label: 'Pending', color: 'yellow' }
  ];

  // Generate short name from full name
  const generateShortName = useCallback((name) => {
    if (!name) return '';
    
    // Remove common suffixes
    const cleanName = name
      .replace(/\s*(sdn\.?\s*bhd\.?|bhd\.?|plt|llc|inc\.?|corp\.?|ltd\.?|pte\.?)\s*/gi, '')
      .trim();
    
    const words = cleanName.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 1) {
      return words[0].substring(0, 4).toUpperCase();
    }
    
    // Get initials from significant words (skip common words)
    const skipWords = ['and', 'the', 'of', 'for', '&'];
    const significantWords = words.filter(w => !skipWords.includes(w.toLowerCase()));
    
    if (significantWords.length >= 2) {
      return significantWords
        .slice(0, 4)
        .map(w => w[0])
        .join('')
        .toUpperCase();
    }
    
    return words[0].substring(0, 4).toUpperCase();
  }, []);

  // ==========================================================================
  // FIX: Load contacts from Firestore when editing a client
  // IMPORTANT: Use doc.id, remove any stored 'id' field to prevent duplicates
  // ==========================================================================
  const loadContactsForClient = useCallback(async (clientId) => {
    if (!clientId) {
      setContacts([]);
      return;
    }

    setContactsLoading(true);
    try {
      console.log('[ClientModal] Loading contacts for client:', clientId);
      
      const q = query(
        collection(db, 'clientContacts'),
        where('clientId', '==', clientId),
        orderBy('isPrimary', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      // FIXED: Use doc.id as authoritative ID, remove any stored 'id' field
      const loadedContacts = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const { id: storedId, ...cleanData } = data;  // Remove stored id if exists
        return {
          ...cleanData,
          id: docSnap.id  // Firestore document ID is the real ID
        };
      });
      
      console.log('[ClientModal] Loaded contacts:', loadedContacts.length);
      console.log('[ClientModal] Contact IDs:', loadedContacts.map(c => c.id));
      setContacts(loadedContacts);
    } catch (err) {
      console.error('[ClientModal] Error loading contacts:', err);
      // If it's an index error, try without orderBy
      if (err.code === 'failed-precondition' || err.message?.includes('index')) {
        try {
          console.log('[ClientModal] Retrying without orderBy...');
          const q = query(
            collection(db, 'clientContacts'),
            where('clientId', '==', clientId)
          );
          const snapshot = await getDocs(q);
          // FIXED: Same fix for fallback
          const loadedContacts = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const { id: storedId, ...cleanData } = data;
            return {
              ...cleanData,
              id: docSnap.id
            };
          });
          // Sort client-side
          loadedContacts.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
          setContacts(loadedContacts);
        } catch (retryErr) {
          console.error('[ClientModal] Retry also failed:', retryErr);
          setContacts([]);
        }
      } else {
        setContacts([]);
      }
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // Load editing client data
  useEffect(() => {
    if (editingClient && isOpen) {
      console.log('[ClientModal] Loading editing client:', editingClient.id);
      
      setFormData({
        name: editingClient.name || '',
        shortName: editingClient.shortName || '',
        email: editingClient.email || '',
        phone: editingClient.phone || '',
        address: editingClient.address || '',
        registrationNumber: editingClient.registrationNumber || '',
        taxId: editingClient.taxId || '',
        industry: editingClient.industry || '',
        website: editingClient.website || '',
        paymentTerms: editingClient.paymentTerms || 'Net 30',
        deliveryTerms: editingClient.deliveryTerms || 'DDP',
        currency: editingClient.currency || 'MYR',
        status: editingClient.status || 'active',
        notes: editingClient.notes || ''
      });
      
      // FIX: Load contacts from Firestore instead of using editingClient.contacts
      loadContactsForClient(editingClient.id);
      
      setActiveTab('basic');
      setErrors({});
    } else if (isOpen) {
      // Reset for new client
      setFormData({
        name: '',
        shortName: '',
        email: '',
        phone: '',
        address: '',
        registrationNumber: '',
        taxId: '',
        industry: '',
        website: '',
        paymentTerms: 'Net 30',
        deliveryTerms: 'DDP',
        currency: 'MYR',
        status: 'active',
        notes: ''
      });
      setContacts([]);
      setActiveTab('basic');
      setErrors({});
    }
  }, [editingClient, isOpen, loadContactsForClient]);

  // Auto-generate short name when name changes
  useEffect(() => {
    if (formData.name && !editingClient) {
      const generated = generateShortName(formData.name);
      setFormData(prev => ({ ...prev, shortName: generated }));
    }
  }, [formData.name, editingClient, generateShortName]);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.website && !/^https?:\/\/.+/.test(formData.website) && formData.website.length > 0) {
      // Auto-fix website URL
      setFormData(prev => ({ ...prev, website: `https://${prev.website}` }));
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field change
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Add new contact
  const handleAddContact = () => {
    if (!newContact.name.trim()) {
      showNotification?.('Contact name is required', 'error');
      return;
    }

    const contact = {
      id: `temp-${Date.now()}`,
      ...newContact,
      isPrimary: contacts.length === 0 ? true : newContact.isPrimary
    };

    // If setting as primary, unset others
    if (contact.isPrimary) {
      setContacts(prev => prev.map(c => ({ ...c, isPrimary: false })));
    }

    setContacts(prev => [...prev, contact]);
    setNewContact({
      name: '',
      title: '',
      department: '',
      email: '',
      phone: '',
      isPrimary: false
    });
    setShowAddContact(false);
  };

  // Remove contact
  const handleRemoveContact = (contactId) => {
    setContacts(prev => {
      const filtered = prev.filter(c => c.id !== contactId);
      // If removed contact was primary, make first remaining contact primary
      if (filtered.length > 0 && !filtered.some(c => c.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  // Set primary contact
  const handleSetPrimary = (contactId) => {
    setContacts(prev => prev.map(c => ({
      ...c,
      isPrimary: c.id === contactId
    })));
  };

  // Handle save
  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification?.('Please fix the errors before saving', 'error');
      return;
    }

    setLoading(true);
    try {
      const clientData = {
        ...formData,
        contacts
      };

      await onSave?.(clientData, editingClient?.id);
      showNotification?.(
        editingClient ? 'Client updated successfully' : 'Client created successfully',
        'success'
      );
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      showNotification?.('Failed to save client: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">
                {editingClient ? 'Edit Client' : 'New Client'}
              </h2>
              <p className="text-blue-100 text-sm">
                {editingClient ? `Editing: ${editingClient.name}` : 'Add a new client to your system'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 flex-shrink-0">
          <nav className="flex px-6 gap-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('business')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'business'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Business Terms
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'contacts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Contacts
              {contactsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              ) : contacts.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {contacts.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* Client Name & Short Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Pelabuhan Tanjung Pelepas Sdn. Bhd."
                    />
                  </div>
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Short Name
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => handleChange('shortName', e.target.value.toUpperCase())}
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      placeholder="AUTO"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Auto-generated from name</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="contact@company.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+60 12-345 6789"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full company address..."
                />
              </div>

              {/* Registration & Tax Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.registrationNumber}
                    onChange={(e) => handleChange('registrationNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company registration number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <CreditCard className="w-4 h-4 inline mr-2" />
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tax identification number"
                  />
                </div>
              </div>

              {/* Industry & Website */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select industry...</option>
                    {INDUSTRIES.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://company.com"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="flex gap-4">
                  {STATUSES.map(status => (
                    <label
                      key={status.value}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer transition-colors ${
                        formData.status === status.value
                          ? `border-${status.color}-500 bg-${status.color}-50`
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={status.value}
                        checked={formData.status === status.value}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="sr-only"
                      />
                      <span className={`w-2 h-2 rounded-full bg-${status.color}-500`}></span>
                      <span className={formData.status === status.value ? `text-${status.color}-700` : 'text-gray-700'}>
                        {status.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Business Terms Tab */}
          {activeTab === 'business' && (
            <div className="space-y-6">
              {/* Payment Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <CreditCard className="w-4 h-4 inline mr-2" />
                  Default Payment Terms
                </label>
                <select
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_TERMS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Will be auto-filled when creating POs for this client
                </p>
              </div>

              {/* Delivery Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Truck className="w-4 h-4 inline mr-2" />
                  Default Delivery Terms (Incoterms)
                </label>
                <select
                  value={formData.deliveryTerms}
                  onChange={(e) => handleChange('deliveryTerms', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DELIVERY_TERMS.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.deliveryTerms === 'DDP' && 'Delivered Duty Paid - Seller bears all costs and risks'}
                  {formData.deliveryTerms === 'FOB' && 'Free On Board - Risk transfers when goods are on vessel'}
                  {formData.deliveryTerms === 'CIF' && 'Cost, Insurance & Freight - Seller pays to destination port'}
                  {formData.deliveryTerms === 'EXW' && 'Ex Works - Buyer bears all costs from seller premises'}
                </p>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Default Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr} value={curr}>{curr}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about this client..."
                />
              </div>
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              {/* Loading State */}
              {contactsLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
                  <p className="text-gray-500">Loading contacts...</p>
                </div>
              ) : (
                <>
                  {/* Existing Contacts */}
                  {contacts.length > 0 ? (
                    <div className="space-y-3">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={`p-4 border rounded-lg ${
                            contact.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-gray-500" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{contact.name}</span>
                                  {contact.isPrimary && (
                                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                      <Star className="w-3 h-3" />
                                      Primary
                                    </span>
                                  )}
                                </div>
                                {(contact.title || contact.department) && (
                                  <p className="text-sm text-gray-600">
                                    {[contact.title, contact.department].filter(Boolean).join(' / ')}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                  {contact.email && (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {contact.email}
                                    </span>
                                  )}
                                  {contact.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {contact.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!contact.isPrimary && (
                                <button
                                  onClick={() => handleSetPrimary(contact.id)}
                                  className="text-sm text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveContact(contact.id)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No contacts added yet</p>
                      <p className="text-sm">Add contacts to keep track of key people at this client</p>
                    </div>
                  )}

                  {/* Add Contact Form */}
                  {showAddContact ? (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <h4 className="font-medium text-gray-900 mb-4">Add New Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={newContact.name}
                            onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Contact name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={newContact.title}
                            onChange={(e) => setNewContact(prev => ({ ...prev, title: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Procurement Manager"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={newContact.department}
                            onChange={(e) => setNewContact(prev => ({ ...prev, department: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Supply Chain Division"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={newContact.email}
                            onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="contact@company.com"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <input
                            type="tel"
                            value={newContact.phone}
                            onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+60 12-345 6789"
                          />
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newContact.isPrimary}
                              onChange={(e) => setNewContact(prev => ({ ...prev, isPrimary: e.target.checked }))}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Set as primary contact</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-4">
                        <button
                          onClick={() => {
                            setShowAddContact(false);
                            setNewContact({
                              name: '',
                              title: '',
                              department: '',
                              email: '',
                              phone: '',
                              isPrimary: false
                            });
                          }}
                          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddContact}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Contact
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddContact(true)}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Add Contact
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-white p-6 flex justify-end gap-3 flex-shrink-0 sticky bottom-0 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !formData.name}
            className="relative px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 min-w-[180px] justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                {editingClient ? (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Update Client</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Create Client</span>
                  </>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientModal;
