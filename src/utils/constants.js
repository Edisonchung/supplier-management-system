// src/utils/constants.js

// User Roles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  VIEWER: 'viewer'
};

// Permission Matrix
export const PERMISSIONS = {
  // Dashboard
  canViewDashboard: ['admin', 'manager', 'employee', 'viewer'],
  
  // Suppliers
  canEditSuppliers: ['admin', 'manager'],
  canViewSuppliers: ['admin', 'manager', 'employee', 'viewer'],
  
  // Products
  canEditProducts: ['admin', 'manager', 'employee'],
  canViewProducts: ['admin', 'manager', 'employee', 'viewer'],
  
  // Purchase Orders
  canEditPurchaseOrders: ['admin', 'manager'],
  canViewPurchaseOrders: ['admin', 'manager', 'employee', 'viewer'],
  canApprovePurchaseOrders: ['admin', 'manager'],
  
  // Proforma Invoices
  canViewPI: ['admin', 'manager', 'employee', 'viewer'],
  canEditPI: ['admin', 'manager'],
  
  // Client Invoices
  canViewInvoices: ['admin', 'manager', 'employee'],
  canEditInvoices: ['admin', 'manager'],
  
  // Delivery Tracking
  canViewTracking: ['admin', 'manager', 'employee', 'viewer'],
  canUpdateDeliveryStatus: ['admin', 'manager'],
  
  // User Management
  canManageUsers: ['admin'],
  
  // Import/Export
  canImportData: ['admin', 'manager']
};


// Role options for dropdowns
export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'employee', label: 'Employee' },
  { value: 'viewer', label: 'Viewer' }
];

// Status options for various entities
export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' }
];


// Product Categories
export const PRODUCT_CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'hydraulics', label: 'Hydraulics' },
  { value: 'pneumatics', label: 'Pneumatics' },
  { value: 'automation', label: 'Automation' },
  { value: 'sensors', label: 'Sensors' },
  { value: 'cables', label: 'Cables' },
  { value: 'components', label: 'Components' }
];

// Status Options
export const SUPPLIER_STATUS = [
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'inactive', label: 'Inactive', color: 'gray' }
];

export const PRODUCT_STATUS = [
  { value: 'pending', label: 'Pending', color: 'yellow' },
  { value: 'complete', label: 'Complete', color: 'green' },
  { value: 'furnished', label: 'Furnished', color: 'blue' }
];

export const PO_STATUS = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'confirmed', label: 'Confirmed', color: 'blue' },
  { value: 'processing', label: 'Processing', color: 'yellow' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' }
];

export const PI_STATUS = [
  { value: 'draft', label: 'Draft', color: 'gray' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'orange' }
];

export const DELIVERY_STATUS = [
  { value: 'pending', label: 'Pending', color: 'gray' },
  { value: 'processing', label: 'Processing', color: 'blue' },
  { value: 'shipped', label: 'Shipped', color: 'yellow' },
  { value: 'delivered', label: 'Delivered', color: 'green' },
  { value: 'failed', label: 'Failed', color: 'red' }
];

// Payment Terms
export const PAYMENT_TERMS = [
  { value: 'net30', label: 'Net 30' },
  { value: 'net60', label: 'Net 60' },
  { value: 'cod', label: 'COD' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: '50-50', label: '50% Down, 50% on Delivery' }
];

// Delivery Terms
export const DELIVERY_TERMS = [
  { value: 'fob', label: 'FOB' },
  { value: 'cif', label: 'CIF' },
  { value: 'exw', label: 'Ex Works' },
  { value: 'dap', label: 'DAP' }
];

// Brand Patterns for Auto-Detection
export const BRAND_PATTERNS = {
  'Siemens': /^(6ES|6EP|6ED|6AV|6GK|3RT|3RV|3RW|3RM|5SY|5SL|5ST|5SM|3VA|3VM|3VL|3WT|3WL|7KM|7KT)/i,
  'Phoenix': /^(IB|UM|FL|PSR|PLC|EMG|QUINT|STEP|MINI|PT|UT|ST|MC|SAC|NBC|FBS|IBS|AXL|ELR)/i,
  'Schneider': /^(XB|ZB|XA|ZE|XE|XALK|XACA|XD|XU|XS|XX|XT|XV|XG|RE|RM|RP|RU|PM|DM|LC|LE|GV|LR|LU|LV|NS|NT|CV|EZ|TM|SR|TE|VW|SY|GS|GB|GC|GF|KN|KA|KB|KC|KD|KE|KQ|DF|MG|MT|LA|LT|LB|LD|CA|CC|CD|CE|CL|CM)/i,
  'Omron': /^(E2E|E3Z|E3JK|E3JM|TL|D4N|HL|WL|SHL|ZC|ZE|ZV|XS|F3S|F3SJ|MS|OS|A3|A4|A7|A8|G2R|G3R|G5|G6|G7|G9|H3|H5|H7|H8|LY|MY|MK|MM|G3|G4|G5|G7|G9)/i,
  'Pepperl': /^(NBB|NBN|NCB|NCN|NEB|NEN|NJ|OB|OG|UC|UB|3RG|ML|V1|V3|V11|V15|V18|V31|LGM|LGS|LFL|LME|OMH|OFH|OBE|OBS|OBT|OBD|OBG)/i,
  'Festo': /^(MS|LF|LFR|D|FRC|LFMA|MS4|MS6|MS9|MS12|FRM|PCRP|SDE|SDET|SDN|PE|PEV|VPPM|CPE|MFH|JMFH|MFH|JMFH|MEBH|JMEBH|JMN|JMDN|JMDH)/i,
  'SMC': /^(SY|VF|VFS|VT|VX|VXS|VXD|VXE|VXF|VXP|VXR|VXZ|VQ|VQC|VQD|VQZ|VS|VSA|VSS|VXA|VP|VPA|VPL|VG|VGA|VGB)/i,
  'Eaton': /^(DIL|PKE|PKZ|FAZ|PL|PLI|PLHT|PLSM|PFIM|PFTM|Z-|NZM|LZM|IZM|BZM|N-|PN-|P-|P1-|P3-|T0|T3|T5|T5B|V5|V6|W5|SVX)/i,
  'ABB': /^(1SDA|1SFA|1SCA|1SVR|2CDS|2CDH|2CDE|2CDF|2CDG|2CCA|2CCB|2CCC|2CCD|2CCF|A9|A12|A16|A26|A30|A40|A50|A63|A75|A95|A110|A145|A185|A210|A260|A300|AF|AX|B6|B7|BC6|BC7)/i
};

// Demo User Accounts
export const DEMO_USERS = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@company.com',
    password: 'admin123',
    fullName: 'Admin User',
    role: 'admin',
    status: 'active'
  },
  {
    id: '2',
    username: 'manager',
    email: 'manager@company.com',
    password: 'manager123',
    fullName: 'Manager User',
    role: 'manager',
    status: 'active'
  },
  {
    id: '3',
    username: 'employee',
    email: 'employee@company.com',
    password: 'employee123',
    fullName: 'Employee User',
    role: 'employee',
    status: 'active'
  },
  {
    id: '4',
    username: 'viewer',
    email: 'viewer@company.com',
    password: 'viewer123',
    fullName: 'Viewer User',
    role: 'viewer',
    status: 'active'
  }
];

// Pagination
export const ITEMS_PER_PAGE = 20;

// Date Format
export const DATE_FORMAT = 'MM/DD/YYYY';
export const DATETIME_FORMAT = 'MM/DD/YYYY HH:mm:ss';

// Currency
export const CURRENCY = {
  code: 'USD',
  symbol: '$',
  decimal: 2
};

// Export all constants as default
export default {
  ROLES,
  PERMISSIONS,
  PRODUCT_CATEGORIES,
  SUPPLIER_STATUS,
  PRODUCT_STATUS,
  PO_STATUS,
  PI_STATUS,
  DELIVERY_STATUS,
  PAYMENT_TERMS,
  DELIVERY_TERMS,
  BRAND_PATTERNS,
  DEMO_USERS,
  ITEMS_PER_PAGE,
  DATE_FORMAT,
  DATETIME_FORMAT,
  CURRENCY
};
