// src/components/suppliers/SupplierModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin, User, Loader2, AlertTriangle, Info } from 'lucide-react';

const SupplierModal = ({ 
  supplier, 
  onSave, 
  onClose, 
  isOpen = true,
  prePopulatedData = null,
  showNotification,
  existingSuppliers = [] // For duplicate checking
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    status: 'active'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIDataInfo, setShowAIDataInfo] = useState(false);

  useEffect(() => {
    if (supplier) {
      // Editing existing supplier
      setFormData({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        contactPerson: supplier.contactPerson || '',
        status: supplier.status || 'active'
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
        status: 'active'
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
        status: 'active'
      });
      setShowAIDataInfo(false);
    }
  }, [supplier, prePopulatedData]);

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
        status: formData.status
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
          status: 'active'
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
      status: 'active'
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {supplier ? 'Edit Supplier' : 'Create New Supplier'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>
          
          {/* AI Data Information */}
          {showAIDataInfo && prePopulatedData && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-800 font-medium">AI-Extracted Data</p>
                  <p className="text-blue-700 mt-1">
                    This form has been pre-populated with supplier information extracted from your document. 
                    Please review and edit as needed before saving.
                  </p>
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="text-blue-600 hover:text-blue-800 text-xs underline mt-2"
                  >
                    Clear form and start fresh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Supplier Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter supplier name"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.name && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-red-500 text-xs">{errors.name}</p>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="supplier@example.com"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-red-500 text-xs">{errors.email}</p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    onBlur={handlePhoneBlur}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="+1 (555) 123-4567"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.phone && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle size={14} className="text-red-500" />
                    <p className="text-red-500 text-xs">{errors.phone}</p>
                  </div>
                )}
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    rows="3"
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="123 Business St, City, State 12345"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Additional Info for AI-extracted data */}
              {prePopulatedData && showAIDataInfo && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    <p className="font-medium mb-2">Original Extracted Data:</p>
                    <div className="space-y-1 text-xs bg-gray-50 p-3 rounded">
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
            </div>
          </form>
        </div>

        <div className="border-t bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || Object.keys(errors).length > 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
