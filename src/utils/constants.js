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
  canViewDashboard: ['admin', 'manager', 'employee', 'viewer'],
  canEditSuppliers: ['admin', 'manager'],
  canViewSuppliers: ['admin', 'manager'],
  canEditProducts: ['admin', 'manager', 'employee'],
  canViewProducts: ['admin', 'manager', 'employee', 'viewer'],
  canEditPurchaseOrders: ['admin', 'manager'],
  canViewPurchaseOrders: ['admin', 'manager'],
  canManageUsers: ['admin'],
  canImportData: ['admin', 'manager'],
  
  // Procurement permissions
  canViewPI: ['admin', 'manager', 'employee'],
  canEditPI: ['admin', 'manager'],
  canViewInvoices: ['admin', 'manager'],
  canEditInvoices: ['admin', 'manager'],
  canViewTracking: ['admin', 'manager', 'employee'],
  canUpdateDeliveryStatus: ['admin', 'manager']
};

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
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'confirmed', label: 'Confirmed', color: 'green' },
  { value: 'delivered', label: 'Delivered', color: 'purple' }
];

export const DELIVERY_STATUS = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'in-transit', label: 'In Transit', color: 'blue' },
  { value: 'delivered', label: 'Delivered', color: 'green' }
];

// Brand Detection Patterns
export const BRAND_PATTERNS = {
  'Parker': /^(PVQ|DG4V|D1VW|PVP|PVH|PVS|PVV|PAV|PRV|PRM|PGP|PGM|P1|P2|P3|F11|F12|M2|M3|M4)/i,
  'Rexroth': /^(A10V|A4V|A2F|A7V|A11V|4WE|4WR|DBD|DBW|DR|DZ|M-3|M-4|PV7|PGF|MSK|MKD|MKE|MAD|MAF|MHD|MDD|HCS|HDS|HMS)/i,
  'Vickers': /^(V10|V20|VQ|VTM|PVB|PVH|PVM|PVE|DG|CG|CT|CV|CVI|CVCS|CM|CMV|DG4S4|DG4V|DG5S|DG5V)/i,
  'Denison': /^(T6|T7|T67|T6C|T6D|T6E|P6|P7|P8|P11|P14|P16|P24|P30|M1|M2|P46|P09|P05)/i,
  'Yuken': /^(PV2R|A16|A22|A37|A56|A70|A90|A145|DSG|DSHG|S-DSG|EDG|EHDG|EBG|EFBG|BSG|S-BSG|CJT|CIT)/i,
  'Daikin': /^(V15|V23|V38|V50|V70|VZ|J-V|F-V|KSO|JIS|JCS|JRS|JTS|JCP|JRP|JTP)/i,
  'Siemens': /^(3SB|3SE|3SU|6ES7|6ED1|6EP1|6AV|6AG1|1LA|1LE|1LG|1MA|1MB|1MD|1MJ|1PH|1FK|1FT|1PH|3RV|3RT|3RH|3TF|3UA|3UF|3RP|3RB|3RU|3RW|5SY|5SL|5SU|5SD|5SP|5ST|5SM|5SV|5SX|5SJ)/i,
  'Schneider': /^(LC1|LC2|LC3|LRD|LR2|LR3|GV2|GV3|NS|NSX|LV|XB|XA|ZB|ZBE|ZBZ|XS|XU|XX|XM|OT|OS|TM|LX|LXM|ATV|ATS|PM|VW3|VZ|VY|VD)/i,
  'Omron': /^(E2E|E2A|E2B|E2C|E2F|E2G|E2J|E2K|E2Q|E2V|E3|E4|E5|TL|D4|F3|G3|G9|H3|H5|H7|H8|MY|MK|LY|G2R|G5|G6|G7|G9)/i,
  'Allen Bradley': /^(1756|1769|1794|1734|1746|1747|1771|1785|2711|2711P|22|25|440|442|445|450|700|800T|802T|855T|856T|871|872)/i,
  'Mitsubishi': /^(FX|Q|L|A|QJ|QD|QH|QY|AJ|AX|AD|DA|FR-|MR-|HC-|HA-|HG-|HF-|HS-|GT1|GT2|GS2|GOT)/i,
  'Keyence': /^(FS-|FU-|FW-|PS-|PZ-|LV-|LX-|IL-|IG-|GT-|GV-|CV-|VG-|VK-|VR-|VW-|IV-|SR-|BL-|CA-|CB-)/i,
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
  DELIVERY_STATUS,
  BRAND_PATTERNS,
  DEMO_USERS,
  ITEMS_PER_PAGE,
  DATE_FORMAT,
  DATETIME_FORMAT,
  CURRENCY
};
