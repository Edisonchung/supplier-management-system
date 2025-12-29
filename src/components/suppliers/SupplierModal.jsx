// src/components/suppliers/SupplierModal.jsx
// Enhanced SupplierModal with Dark Mode Support - All existing features preserved
import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin, User, Loader2, AlertTriangle, Info } from 'lucide-react';
import BankAccountsTab from './BankAccountsTab';

// Import the enhanced dark mode system
import { useDarkMode } from '../../hooks/useDarkMode';
import { themeClasses, useThemeClasses, getThemeClasses } from '../../utils/theme';

const SupplierModal = ({ 
  supplier, 
  onSave, 
  onClose, 
  isOpen = true,
  prePopulatedData = null,
  showNotification,
  existingSuppliers = [] // For duplicate checking
}) => {
  // Enhanced dark mode integration
  const { isDarkMode, themeVariant, highContrast } = useDarkMode();
  
  // Memoized theme classes for performance
  const modalClasses = useThemeClasses('modal', 'container');
  const cardClasses = useThemeClasses('card', 'elevated');
  const textPrimaryClasses = useThemeClasses('text', 'primary');
  const textSecondaryClasses = useThemeClasses('text', 'secondary');
  const inputClasses = useThemeClasses('input', 'default');
  const buttonPrimaryClasses = useThemeClasses('button', 'primary');
  const buttonSecondaryClasses = useThemeClasses('button', 'secondary');

  // All state management preserved exactly as before
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    status: 'active',
    bankAccounts: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIDataInfo, setShowAIDataInfo] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // All useEffect logic preserved exactly as before
  useEffect(() => {
    if (supplier) {
      // Editing existing supplier
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        contactPerson: supplier.contactPerson || '',
        status: supplier.status || 'active',
        bankAccounts: supplier.bankAccounts || []
      });
      setShowAIDataInfo(false);
    } else if (prePopulatedData) {
      // Creating new supplier with pre-populated data (from AI extraction)
      setFormData({
        name: prePopulatedData.name || prePopulatedData.company || '',
        email: prePopulatedData.email || '',
        phone: prePopulatedData.phone || prePopulatedData.mobile || '',
        address: prePopulatedData.address || '',
        contactPerson: prePopulatedData.contact || prePopulatedData.contactPerson || '',
        status: 'active',
        bankAccounts: prePopulatedData.bankAccounts || []
      });
      setShowAIDataInfo(true);
    } else {
      // Creating new supplier from scratch
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        status: 'active',
        bankAccounts: []
      });
      setShowAIDataInfo(false);
    }
  }, [supplier, prePopulatedData]);

  // All validation logic preserved exactly as before
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Supplier name must be at least 2 characters';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    // Check for duplicate supplier name (exclude current supplier if editing)
    if (existingSuppliers.length > 0) {
      const duplicateName = existingSuppliers.find(s => 
        s.name.toLowerCase() === formData.name.toLowerCase().trim() && 
        (!supplier || s.id !== supplier.id)
      );
      if (duplicateName) {
        newErrors.name = 'A supplier with this name already exists';
      }

      // Check for duplicate email (exclude current supplier if editing)
      const duplicateEmail = existingSuppliers.find(s => 
        s.email.toLowerCase() === formData.email.toLowerCase().trim() && 
        (!supplier || s.id !== supplier.id)
      );
      if (duplicateEmail) {
        newErrors.email = 'A supplier with this email already exists';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // All handler functions preserved exactly as before
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const supplierData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        contactPerson: formData.contactPerson.trim(),
        address: formData.address.trim(),
        status: formData.status,
        bankAccounts: formData.bankAccounts || []
      };

      // Add metadata if this was created from AI extraction
      if (prePopulatedData && !supplier) {
        supplierData.createdFromAI = true;
        supplierData.extractedData = prePopulatedData;
        supplierData.dateAdded = new Date().toISOString();
      }

      await onSave(supplierData);
      
      if (!supplier) {
        // Reset form for new supplier creation
        setFormData({
          name: '',
          email: '',
          phone: '',
          address: '',
          contactPerson: '',
          status: 'active',
          bankAccounts: []
        });
        setShowAIDataInfo(false);
      }
      
      onClose();
      
    } catch (error) {
      console.error('Error saving supplier:', error);
      showNotification?.('Failed to save supplier. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClearForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      status: 'active',
      bankAccounts: []
    });
    setErrors({});
    setShowAIDataInfo(false);
  };

  const formatPhoneNumber = (phone) => {
    // Simple phone formatting for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handlePhoneChange = (value) => {
    // Allow user to type freely but format on blur
    setFormData(prev => ({ ...prev, phone: value }));
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone && formData.phone.replace(/\D/g, '').length === 10) {
      setFormData(prev => ({ ...prev, phone: formatPhoneNumber(prev.phone) }));
    }
  };

  // Enhanced theme-aware helper functions
  const getInputErrorClasses = (hasError) => {
    if (isDarkMode) {
      return hasError 
        ? 'border-red-500 dark:border-red-400 bg-red-900/10'
        : 'border-gray-600 dark:border-gray-500 bg-gray-800/50';
    }
    return hasError ? 'border-red-500' : 'border-gray-300';
  };

  const getIconColor = () => {
    return isDarkMode ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400';
  };

  const getAlertBoxClasses = (type = 'info') => {
    if (isDarkMode) {
      switch (type) {
        case 'info':
          return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
        case 'error':
          return 'bg-red-900/20 border-red-700/50 text-red-300';
        default:
          return 'bg-gray-800/20 border-gray-600/50 text-gray-300';
      }
    }
    
    switch (type) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
      <div className={`${cardClasses} rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden`}>
        {/* Enhanced Header with Dark Mode */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <h2 className={`text-xl font-semibold ${textPrimaryClasses}`}>
              {supplier ? 'Edit Supplier' : 'Create New Supplier'}
            </h2>
            <button
              onClick={onClose}
              className={`${textSecondaryClasses} hover:${textPrimaryClasses} transition-colors`}
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Enhanced AI Data Information with Dark Mode */}
          {showAIDataInfo && prePopulatedData && (
            <div className={`mt-4 p-3 border rounded-lg ${getAlertBoxClasses('info')}`}>
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">AI-Extracted Data</p>
                  <p className="mt-1">
                    This form has been pre-populated with supplier information extracted from your document. 
                    Please review and edit as needed before saving.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs underline mt-2 transition-colors"
                  >
                    Clear form and start fresh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Form Content with Dark Mode */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`pb-2 text-sm font-medium ${
                  activeTab === 'basic'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`pb-2 text-sm font-medium ${
                  activeTab === 'bank'
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Bank Accounts
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Enhanced Supplier Name Field */}
                <div>
                  <label className={`block text-sm font-medium ${textPrimaryClasses} mb-1`}>
                    Supplier Name <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${getIconColor()}`} size={18} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`${inputClasses} w-full pl-10 pr-3 py-2 rounded-lg ${getInputErrorClasses(errors.name)}`}
                      placeholder="Enter supplier name"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.name && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                      <p className="text-red-500 dark:text-red-400 text-xs">{errors.name}</p>
                    </div>
                  )}
                </div>

                {/* Enhanced Email Field */}
                <div>
                  <label className={`block text-sm font-medium ${textPrimaryClasses} mb-1`}>
                    Email <span className="text-red-500 dark:text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${getIconColor()}`} size={18} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className={`${inputClasses} w-full pl-10 pr-3 py-2 rounded-lg ${getInputErrorClasses(errors.email)}`}
                      placeholder="supplier@example.com"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                      <p className="text-red-500 dark:text-red-400 text-xs">{errors.email}</p>
                    </div>
                  )}
                </div>

                {/* Enhanced Phone Field */}
                <div>
                  <label className={`block text-sm font-medium ${textPrimaryClasses} mb-1`}>
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${getIconColor()}`} size={18} />
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      onBlur={handlePhoneBlur}
                      className={`${inputClasses} w-full pl-10 pr-3 py-2 rounded-lg ${getInputErrorClasses(errors.phone)}`}
                      placeholder="+1 (555) 123-4567"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.phone && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertTriangle size={14} className="text-red-500 dark:text-red-400" />
                      <p className="text-red-500 dark:text-red-400 text-xs">{errors.phone}</p>
                    </div>
                  )}
                </div>

                {/* Enhanced Contact Person Field */}
                <div>
                  <label className={`block text-sm font-medium ${textPrimaryClasses} mb-1`}>
                    Contact Person
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${getIconColor()}`} size={18} />
                    <input
                      type="text"
                      value={formData.contactPerson}
                      onChange={(e) => handleChange('contactPerson', e.target.value)}
                      className={`${inputClasses} w-full pl-10 pr-3 py-2 rounded-lg`}
                      placeholder="John Doe"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Enhanced Address Field */}
                <div>
                  <label className={`block text-sm font-medium ${textPrimaryClasses} mb-1`}>
                    Address
                  </label>
                  <div className="relative">
                    <MapPin className={`absolute left-3 top-3 ${getIconColor()}`} size={18} />
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      rows="3"
                      className={`${inputClasses} w-full pl-10 pr-3 py-2 rounded-lg resize-none`}
                      placeholder="123 Business St, City, State 12345"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Enhanced Status Field */}
                <div>
                  <label className={`block text-sm font-medium ${textPrimaryClasses} mb-1`}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className={`${inputClasses} w-full px-3 py-2 rounded-lg`}
                    disabled={isSubmitting}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {/* Enhanced Additional Info for AI-extracted data */}
                {prePopulatedData && showAIDataInfo && (
                  <div className={`pt-4 border-t ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                    <div className={`text-sm ${textSecondaryClasses}`}>
                      <p className={`font-medium mb-2 ${textPrimaryClasses}`}>Original Extracted Data:</p>
                      <div className={`space-y-1 text-xs p-3 rounded ${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50'}`}>
                        {prePopulatedData.name && (
                          <p><span className="font-medium">Name:</span> {prePopulatedData.name}</p>
                        )}
                        {prePopulatedData.email && (
                          <p><span className="font-medium">Email:</span> {prePopulatedData.email}</p>
                        )}
                        {prePopulatedData.phone && (
                          <p><span className="font-medium">Phone:</span> {prePopulatedData.phone}</p>
                        )}
                        {prePopulatedData.address && (
                          <p><span className="font-medium">Address:</span> {prePopulatedData.address}</p>
                        )}
                        {prePopulatedData.contact && (
                          <p><span className="font-medium">Contact:</span> {prePopulatedData.contact}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {activeTab === 'bank' && (
              <BankAccountsTab
                bankAccounts={formData.bankAccounts || []}
                onUpdate={(accounts) =>
                  setFormData(prev => ({
                    ...prev,
                    bankAccounts: accounts
                  }))
                }
                supplierName={formData.name}
                supplierAddress={formData.address}
                showNotification={showNotification}
              />
            )}
          </div>
        </div>

        {/* Enhanced Footer with Dark Mode */}
        <div className={`border-t ${isDarkMode ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200 bg-gray-50'} px-6 py-4 flex justify-end gap-3`}>
          <button
            type="button"
            onClick={onClose}
            className={`${buttonSecondaryClasses} px-4 py-2 rounded-lg disabled:opacity-50 transition-colors`}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className={`${buttonPrimaryClasses} px-4 py-2 rounded-lg disabled:opacity-50 flex items-center gap-2 transition-colors`}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {supplier ? 'Update' : 'Create'} Supplier
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierModal;
