// src/components/purchase-orders/utils/poHelpers.js

// Generate PO number with format: PO-YYYYMMDD-XXX
export const generatePONumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `PO-${year}${month}${day}-${random}`;
};

// Get status color classes
export const getStatusColor = (status) => {
  switch (status) {
    case 'confirmed': return 'bg-green-100 text-green-800';
    case 'processing': return 'bg-blue-100 text-blue-800';
    case 'delivered': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-gray-100 text-gray-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Calculate order totals
export const calculateOrderTotals = (items) => {
  const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;
  
  return {
    subtotal,
    tax,
    total
  };
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Validate PO data
export const validatePOData = (data) => {
  const errors = {};
  
  if (!data.clientName) {
    errors.clientName = 'Client name is required';
  }
  
  if (!data.orderDate) {
    errors.orderDate = 'Order date is required';
  }
  
  if (!data.requiredDate) {
    errors.requiredDate = 'Required delivery date is required';
  }
  
  if (!data.items || data.items.length === 0) {
    errors.items = 'At least one product item is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
