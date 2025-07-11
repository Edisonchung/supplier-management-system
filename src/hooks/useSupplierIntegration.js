// src/hooks/useSupplierIntegration.js
import { useState, useCallback } from 'react';

/**
 * Hook for integrating supplier creation with PI modal
 * Handles supplier search, creation, and selection logic
 */
export const useSupplierIntegration = ({ 
  suppliers, 
  addSupplier, 
  showNotification 
}) => {
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: '',
    status: 'active'
  });
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [supplierErrors, setSupplierErrors] = useState({});

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
  );

  // Validate supplier creation form
  const validateSupplierForm = useCallback(() => {
    const newErrors = {};
    
    if (!newSupplierData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }
    
    if (!newSupplierData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(newSupplierData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (newSupplierData.phone && !/^[\d\s\-\+\(\)]+$/.test(newSupplierData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }

    // Check for duplicate supplier name
    if (suppliers.some(s => s.name.toLowerCase() === newSupplierData.name.toLowerCase().trim())) {
      newErrors.name = 'A supplier with this name already exists';
    }

    // Check for duplicate email
    if (suppliers.some(s => s.email.toLowerCase() === newSupplierData.email.toLowerCase().trim())) {
      newErrors.email = 'A supplier with this email already exists';
    }
    
    setSupplierErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [newSupplierData, suppliers]);

  // Create new supplier
  const createSupplier = useCallback(async () => {
    if (!validateSupplierForm()) return null;
    
    setIsCreatingSupplier(true);
    
    try {
      const supplierToCreate = {
        ...newSupplierData,
        name: newSupplierData.name.trim(),
        email: newSupplierData.email.trim(),
        phone: newSupplierData.phone.trim(),
        contactPerson: newSupplierData.contactPerson.trim(),
        address: newSupplierData.address.trim(),
        dateAdded: new Date().toISOString()
      };

      // Call the addSupplier function (this will handle the actual creation)
      const createdSupplier = await addSupplier(supplierToCreate);
      
      // Reset form
      setNewSupplierData({
        name: '',
        email: '',
        phone: '',
        address: '',
        contactPerson: '',
        status: 'active'
      });
      
      setShowCreateSupplier(false);
      setShowSupplierDropdown(false);
      setSupplierErrors({});

      showNotification?.(`Supplier "${createdSupplier.name}" created successfully`, 'success');
      
      return createdSupplier;
      
    } catch (error) {
      console.error('Failed to create supplier:', error);
      showNotification?.('Failed to create supplier. Please try again.', 'error');
      return null;
    } finally {
      setIsCreatingSupplier(false);
    }
  }, [newSupplierData, validateSupplierForm, addSupplier, showNotification]);

  // Handle supplier search input changes
  const handleSupplierSearchChange = useCallback((value) => {
    setSupplierSearchTerm(value);
    setShowSupplierDropdown(true);
    setShowCreateSupplier(false);
  }, []);

  // Handle new supplier data changes
  const handleNewSupplierDataChange = useCallback((field, value) => {
    setNewSupplierData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (supplierErrors[field]) {
      setSupplierErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [supplierErrors]);

  // Pre-populate supplier data from extracted information
  const prePopulateSupplierFromExtraction = useCallback((extractedSupplier) => {
    if (!extractedSupplier) return;

    const supplierData = {
      name: extractedSupplier.name || extractedSupplier.company || '',
      email: extractedSupplier.email || '',
      phone: extractedSupplier.phone || extractedSupplier.mobile || '',
      address: extractedSupplier.address || '',
      contactPerson: extractedSupplier.contact || extractedSupplier.contactPerson || '',
      status: 'active'
    };

    setNewSupplierData(supplierData);
    setSupplierSearchTerm(supplierData.name);
  }, []);

  // Find supplier by name (fuzzy matching)
  const findSupplierByName = useCallback((name) => {
    if (!name) return null;
    
    const normalizedName = name.toLowerCase().trim();
    
    // Exact match first
    let found = suppliers.find(s => s.name.toLowerCase() === normalizedName);
    if (found) return found;
    
    // Partial match
    found = suppliers.find(s => 
      s.name.toLowerCase().includes(normalizedName) || 
      normalizedName.includes(s.name.toLowerCase())
    );
    
    return found;
  }, [suppliers]);

  // Reset all states
  const resetSupplierStates = useCallback(() => {
    setSupplierSearchTerm('');
    setShowSupplierDropdown(false);
    setShowCreateSupplier(false);
    setNewSupplierData({
      name: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: '',
      status: 'active'
    });
    setSupplierErrors({});
    setIsCreatingSupplier(false);
  }, []);

  // Show create supplier form with pre-populated data
  const showCreateSupplierForm = useCallback((prePopulatedData = null) => {
    if (prePopulatedData) {
      setNewSupplierData(prev => ({ ...prev, ...prePopulatedData }));
    }
    setShowCreateSupplier(true);
    setShowSupplierDropdown(false);
  }, []);

  return {
    // States
    supplierSearchTerm,
    showSupplierDropdown,
    showCreateSupplier,
    newSupplierData,
    isCreatingSupplier,
    supplierErrors,
    filteredSuppliers,
    
    // Actions
    setSupplierSearchTerm,
    setShowSupplierDropdown,
    setShowCreateSupplier,
    handleSupplierSearchChange,
    handleNewSupplierDataChange,
    createSupplier,
    validateSupplierForm,
    prePopulateSupplierFromExtraction,
    findSupplierByName,
    resetSupplierStates,
    showCreateSupplierForm
  };
};
