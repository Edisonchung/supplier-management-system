export const PERMISSIONS = {
  admin: {
    canViewSuppliers: true,
    canEditSuppliers: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewPOs: true,
    canEditPOs: true,
    canImport: true,
    canOnboard: true,
    canManageUsers: true
  },
  manager: {
    canViewSuppliers: true,
    canEditSuppliers: true,
    canViewProducts: true,
    canEditProducts: true,
    canViewPOs: true,
    canEditPOs: true,
    canImport: true,
    canOnboard: true,
    canManageUsers: false
  },
  employee: {
    canViewSuppliers: false,
    canEditSuppliers: false,
    canViewProducts: true,
    canEditProducts: true,
    canViewPOs: false,
    canEditPOs: false,
    canImport: true,
    canOnboard: false,
    canManageUsers: false
  },
  viewer: {
    canViewSuppliers: false,
    canEditSuppliers: false,
    canViewProducts: true,
    canEditProducts: false,
    canViewPOs: false,
    canEditPOs: false,
    canImport: false,
    canOnboard: false,
    canManageUsers: false
  }
};

export const CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'hydraulics', label: 'Hydraulics' },
  { value: 'pneumatics', label: 'Pneumatics' },
  { value: 'automation', label: 'Automation' },
  { value: 'sensors', label: 'Sensors' },
  { value: 'cables', label: 'Cables' },
  { value: 'components', label: 'Components' }
];

export const STATUS_OPTIONS = {
  PRODUCT: [
    { value: 'pending', label: 'Pending Furnishing', color: 'yellow' },
    { value: 'complete', label: 'Complete Info', color: 'blue' },
    { value: 'furnished', label: 'Furnished', color: 'green' }
  ],
  SUPPLIER: [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'inactive', label: 'Inactive', color: 'red' }
  ],
  PURCHASE_ORDER: [
    { value: 'draft', label: 'Draft', color: 'gray' },
    { value: 'sent', label: 'Sent', color: 'blue' },
    { value: 'confirmed', label: 'Confirmed', color: 'green' },
    { value: 'delivered', label: 'Delivered', color: 'purple' }
  ],
  USER: [
    { value: 'active', label: 'Active', color: 'green' },
    { value: 'inactive', label: 'Inactive', color: 'red' }
  ]
};

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin - Full Access', color: 'purple' },
  { value: 'manager', label: 'Manager - Products & Suppliers', color: 'blue' },
  { value: 'employee', label: 'Employee - Products Only', color: 'green' },
  { value: 'viewer', label: 'Viewer - Read Only', color: 'gray' }
];

export const BRAND_PATTERNS = {
  'Siemens': /^(6ES|6SL|6SE|6AG|6AV|6EP|3SB|3SU|3NA|3NC)/i,
  'Parker': /^(PVQ|DG4V|D1VW|D3W|RDM|PGP)/i,
  'Bosch Rexroth': /^(R90|A10|A4V|4WE|4WH|ZDR)/i,
  'Schneider': /^(ATV|LXM|BMH|BSH|VW3)/i,
  'ABB': /^(ACS|ACH|PSTX|S2|S3|S4)/i,
  'Omron': /^(E2E|E3X|CP1|CJ2|NX)/i,
  'Festo': /^(DSBC|ADVU|MFH|CPV|VUVG)/i,
  'SMC': /^(CY1|CDQ|SY|ISE|ZSE)/i
};
