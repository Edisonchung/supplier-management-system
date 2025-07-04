// Initialize sample data
export const initializeSampleData = () => {
  const suppliers = [
    {
      id: '1',
      name: 'HydroTech Solutions',
      email: 'sales@hydrotech.com',
      phone: '+1-555-0123',
      address: '123 Hydraulics Avenue, Industrial District',
      status: 'active',
      dateAdded: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      contactPerson: 'John Smith'
    },
    {
      id: '2',
      name: 'Automation Components Ltd',
      email: 'info@autocomp.com',
      phone: '+1-555-0456',
      address: '456 Automation Drive, Tech Park',
      status: 'active',
      dateAdded: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      contactPerson: 'Sarah Johnson'
    },
    {
      id: '3',
      name: 'Precision Parts Inc',
      email: 'orders@precisionparts.com',
      phone: '+1-555-0789',
      address: '789 Precision Blvd, Manufacturing Zone',
      status: 'pending',
      dateAdded: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      contactPerson: 'Mike Davis'
    }
  ];

  const products = [
    {
      id: '1',
      name: 'PVQ20-A2R-SS1S-10-C21D-11',
      brand: 'Parker',
      supplierId: '1',
      category: 'hydraulics',
      price: 335,
      status: 'complete',
      description: 'Variable displacement piston pump',
      dateAdded: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      sku: 'PKR-PVQ20-001',
      stock: 15,
      minStock: 5,
      photo: '',
      catalog: '',
      notes: ''
    },
    {
      id: '2',
      name: 'DG4V-5-2C-MU-C6-20',
      brand: 'Parker',
      supplierId: '1',
      category: 'hydraulics',
      price: 157,
      status: 'pending',
      description: 'Directional control valve',
      dateAdded: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      sku: 'PKR-DG4V-002',
      stock: 3,
      minStock: 5,
      photo: '',
      catalog: '',
      notes: ''
    },
    {
      id: '3',
      name: '6ES7231-5PF32-0XB0',
      brand: 'Siemens',
      supplierId: '2',
      category: 'electronics',
      price: 267,
      status: 'furnished',
      description: 'Analog input module',
      dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      sku: 'SIE-6ES7-003',
      stock: 25,
      minStock: 10,
      photo: 'https://example.com/photo.jpg',
      catalog: 'https://example.com/catalog.pdf',
      notes: 'High-precision analog module with 8 channels'
    }
  ];

  const purchaseOrders = [
    {
      id: '1',
      poNumber: 'PO-021430',
      client: 'ABC Manufacturing',
      supplier: 'HydroTech Solutions',
      status: 'confirmed',
      deliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      dateCreated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { productId: '1', productName: 'PVQ20-A2R-SS1S-10-C21D-11', quantity: 2, unitPrice: 335, description: '400CON0052' },
        { productId: '2', productName: 'DG4V-5-2C-MU-C6-20', quantity: 1, unitPrice: 157, description: '400CON0053' }
      ],
      totalAmount: 827,
      notes: 'Urgent delivery required'
    },
    {
      id: '2',
      poNumber: 'PO-021431',
      client: 'XYZ Industries',
      supplier: 'Automation Components Ltd',
      status: 'draft',
      deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      dateCreated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      items: [
        { productId: '3', productName: '6ES7231-5PF32-0XB0', quantity: 5, unitPrice: 267, description: 'Control module order' }
      ],
      totalAmount: 1335,
      notes: ''
    }
  ];

  const users = [
    {
      id: '1',
      fullName: 'System Administrator',
      username: 'admin',
      email: 'admin@company.com',
      role: 'admin',
      status: 'active',
      dateCreated: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      fullName: 'John Manager',
      username: 'manager',
      email: 'manager@company.com',
      role: 'manager',
      status: 'active',
      dateCreated: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      fullName: 'Jane Employee',
      username: 'employee',
      email: 'employee@company.com',
      role: 'employee',
      status: 'active',
      dateCreated: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '4',
      fullName: 'Bob Viewer',
      username: 'viewer',
      email: 'viewer@company.com',
      role: 'viewer',
      status: 'active',
      dateCreated: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
      lastLogin: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  if (!localStorage.getItem('suppliers')) {
    localStorage.setItem('suppliers', JSON.stringify(suppliers));
  }
  if (!localStorage.getItem('products')) {
    localStorage.setItem('products', JSON.stringify(products));
  }
  if (!localStorage.getItem('purchaseOrders')) {
    localStorage.setItem('purchaseOrders', JSON.stringify(purchaseOrders));
  }
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(users));
  }
};

  // Mock product data for Purchase Orders
export const mockProducts = [
  { id: '1', name: 'Widget A', code: 'WDG-001', price: 25.99, stock: 150 },
  { id: '2', name: 'Gadget B', code: 'GDG-002', price: 45.50, stock: 75 },
  { id: '3', name: 'Tool C', code: 'TL-003', price: 99.99, stock: 20 },
  { id: '4', name: 'Device D', code: 'DVC-004', price: 150.00, stock: 5 },
  { id: '5', name: 'Component E', code: 'CMP-005', price: 12.50, stock: 500 },
  { id: '6', name: 'Assembly F', code: 'ASM-006', price: 75.00, stock: 30 },
  { id: '7', name: 'Module G', code: 'MOD-007', price: 200.00, stock: 15 },
  { id: '8', name: 'Kit H', code: 'KIT-008', price: 350.00, stock: 10 }
];
