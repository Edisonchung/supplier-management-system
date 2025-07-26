// src/utils/realCompanyStructure.js
// Complete 9-Company Definition for Edison's Business Group

export const REAL_COMPANIES = {
  'flow-solution': {
    id: 'flow-solution',
    name: 'Flow Solution Sdn Bhd',
    code: 'FS',
    category: 'core_solutions',
    description: 'Main company, KL HQ',
    region: 'Central',
    logo: '/logos/flow-solution.png',
    established: '2015',
    headquarters: 'Kuala Lumpur',
    status: 'active'
  },
  'flow-solution-engineering': {
    id: 'flow-solution-engineering',
    name: 'Flow Solution Engineering Sdn Bhd',
    code: 'FSE',
    category: 'engineering_services',
    description: 'Engineering services division',
    region: 'Central',
    logo: '/logos/flow-solution-engineering.png',
    established: '2017',
    headquarters: 'Kuala Lumpur',
    status: 'active'
  },
  'flow-solution-penang': {
    id: 'flow-solution-penang',
    name: 'Flow Solution (Penang) Sdn Bhd',
    code: 'FSP',
    category: 'regional_operations',
    description: 'Regional operations - Northern Malaysia',
    region: 'Northern',
    logo: '/logos/flow-solution-penang.png',
    established: '2018',
    headquarters: 'Penang',
    status: 'active'
  },
  'broadwater-solution': {
    id: 'broadwater-solution',
    name: 'Broadwater Solution Sdn Bhd',
    code: 'BWS',
    category: 'specialized_solutions',
    description: 'Specialized solutions and consulting',
    region: 'Central',
    logo: '/logos/broadwater-solution.png',
    established: '2019',
    headquarters: 'Selangor',
    status: 'active'
  },
  'broadwater-engineering': {
    id: 'broadwater-engineering',
    name: 'Broadwater Engineering Sdn Bhd',
    code: 'BWE',
    category: 'engineering_services',
    description: 'Advanced engineering services',
    region: 'Central',
    logo: '/logos/broadwater-engineering.png',
    established: '2020',
    headquarters: 'Selangor',
    status: 'active'
  },
  'inhaus': {
    id: 'inhaus',
    name: 'Inhaus Sdn Bhd',
    code: 'IHS',
    category: 'interior_solutions',
    description: 'Interior design and solutions',
    region: 'Central',
    logo: '/logos/inhaus.png',
    established: '2021',
    headquarters: 'Kuala Lumpur',
    status: 'active'
  },
  'futuresmiths': {
    id: 'futuresmiths',
    name: 'Futuresmiths Sdn Bhd',
    code: 'FTS',
    category: 'innovation_tech',
    description: 'Innovation & future technology',
    region: 'Central',
    logo: '/logos/futuresmiths.png',
    established: '2022',
    headquarters: 'Cyberjaya',
    status: 'active'
  },
  'emi-automation': {
    id: 'emi-automation',
    name: 'EMI Automation Sdn Bhd',
    code: 'EMIA',
    category: 'industrial_automation',
    description: 'Industrial automation solutions',
    region: 'Southern',
    logo: '/logos/emi-automation.png',
    established: '2023',
    headquarters: 'Johor',
    status: 'active'
  },
  'emi-technology': {
    id: 'emi-technology',
    name: 'EMI Technology Sdn Bhd',
    code: 'EMIT',
    category: 'technology_solutions',
    description: 'Advanced technology solutions',
    region: 'Southern',
    logo: '/logos/emi-technology.png',
    established: '2024',
    headquarters: 'Johor',
    status: 'active'
  }
};

export const COMPANY_BRANCHES = {
  // Flow Solution Division (3 companies)
  'flow-solution-kl-hq': {
    id: 'flow-solution-kl-hq',
    companyId: 'flow-solution',
    name: 'FS KL Headquarters',
    address: 'Kuala Lumpur City Centre',
    type: 'headquarters',
    manager: 'Edison Chung',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'flow-solution-kl-warehouse': {
    id: 'flow-solution-kl-warehouse',
    companyId: 'flow-solution',
    name: 'FS KL Warehouse',
    address: 'Shah Alam Industrial Area',
    type: 'warehouse',
    manager: 'Warehouse Manager',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'flow-solution-johor': {
    id: 'flow-solution-johor',
    companyId: 'flow-solution',
    name: 'FS Johor Branch',
    address: 'Johor Bahru',
    type: 'branch',
    manager: 'Southern Regional Manager',
    phone: '+60-7-xxxx-xxxx',
    status: 'active'
  },
  'fse-engineering-office': {
    id: 'fse-engineering-office',
    companyId: 'flow-solution-engineering',
    name: 'FSE Engineering Office',
    address: 'Petaling Jaya',
    type: 'office',
    manager: 'Chief Engineer',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'fse-project-site': {
    id: 'fse-project-site',
    companyId: 'flow-solution-engineering',
    name: 'FSE Project Site Office',
    address: 'Various Locations',
    type: 'project_site',
    manager: 'Project Manager',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'fsp-penang-hq': {
    id: 'fsp-penang-hq',
    companyId: 'flow-solution-penang',
    name: 'FSP Penang Headquarters',
    address: 'George Town, Penang',
    type: 'headquarters',
    manager: 'Northern Regional Manager',
    phone: '+60-4-xxxx-xxxx',
    status: 'active'
  },
  'fsp-penang-warehouse': {
    id: 'fsp-penang-warehouse',
    companyId: 'flow-solution-penang',
    name: 'FSP Penang Warehouse',
    address: 'Bayan Lepas Industrial Park',
    type: 'warehouse',
    manager: 'Warehouse Manager',
    phone: '+60-4-xxxx-xxxx',
    status: 'active'
  },

  // Broadwater Division (2 companies)
  'bws-selangor-office': {
    id: 'bws-selangor-office',
    companyId: 'broadwater-solution',
    name: 'BWS Selangor Office',
    address: 'Subang Jaya, Selangor',
    type: 'headquarters',
    manager: 'BWS Managing Director',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'bws-consulting-center': {
    id: 'bws-consulting-center',
    companyId: 'broadwater-solution',
    name: 'BWS Consulting Center',
    address: 'KLCC, Kuala Lumpur',
    type: 'consulting',
    manager: 'Senior Consultant',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'bwe-engineering-center': {
    id: 'bwe-engineering-center',
    companyId: 'broadwater-engineering',
    name: 'BWE Engineering Center',
    address: 'Cyberjaya, Selangor',
    type: 'headquarters',
    manager: 'BWE Managing Director',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'bwe-testing-lab': {
    id: 'bwe-testing-lab',
    companyId: 'broadwater-engineering',
    name: 'BWE Testing Laboratory',
    address: 'Shah Alam, Selangor',
    type: 'laboratory',
    manager: 'Lab Manager',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },

  // Inhaus Division (1 company)
  'inhaus-design-studio': {
    id: 'inhaus-design-studio',
    companyId: 'inhaus',
    name: 'Inhaus Design Studio',
    address: 'Mont Kiara, Kuala Lumpur',
    type: 'headquarters',
    manager: 'Inhaus Managing Director',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'inhaus-showroom': {
    id: 'inhaus-showroom',
    companyId: 'inhaus',
    name: 'Inhaus Showroom',
    address: 'Bangsar Shopping Centre',
    type: 'showroom',
    manager: 'Showroom Manager',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },

  // Futuresmiths Division (1 company)
  'futuresmiths-innovation-lab': {
    id: 'futuresmiths-innovation-lab',
    companyId: 'futuresmiths',
    name: 'Futuresmiths Innovation Lab',
    address: 'Cyberjaya Technology Park',
    type: 'headquarters',
    manager: 'FTS Managing Director',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },
  'futuresmiths-r&d': {
    id: 'futuresmiths-r&d',
    companyId: 'futuresmiths',
    name: 'Futuresmiths R&D Center',
    address: 'Technology Park Malaysia',
    type: 'research',
    manager: 'R&D Director',
    phone: '+60-3-xxxx-xxxx',
    status: 'active'
  },

  // EMI Division (2 companies)
  'emia-automation-factory': {
    id: 'emia-automation-factory',
    companyId: 'emi-automation',
    name: 'EMI Automation Factory',
    address: 'Johor Industrial Park',
    type: 'headquarters',
    manager: 'EMIA Managing Director',
    phone: '+60-7-xxxx-xxxx',
    status: 'active'
  },
  'emia-assembly-line': {
    id: 'emia-assembly-line',
    companyId: 'emi-automation',
    name: 'EMI Assembly Line',
    address: 'Pasir Gudang Industrial Estate',
    type: 'manufacturing',
    manager: 'Production Manager',
    phone: '+60-7-xxxx-xxxx',
    status: 'active'
  },
  'emit-tech-center': {
    id: 'emit-tech-center',
    companyId: 'emi-technology',
    name: 'EMI Technology Center',
    address: 'Iskandar Puteri, Johor',
    type: 'headquarters',
    manager: 'EMIT Managing Director',
    phone: '+60-7-xxxx-xxxx',
    status: 'active'
  },
  'emit-service-center': {
    id: 'emit-service-center',
    companyId: 'emi-technology',
    name: 'EMI Service Center',
    address: 'Johor Bahru City',
    type: 'service',
    manager: 'Service Manager',
    phone: '+60-7-xxxx-xxxx',
    status: 'active'
  }
};

export const ADMIN_HIERARCHY = {
  // Group Admin (Edison)
  group_admin: {
    role: 'group_admin',
    title: '👑 Group CEO',
    description: 'Complete oversight across all 9 companies',
    scope: {
      companyIds: ['*'], // All companies
      branchIds: ['*'],  // All branches
      permissions: ['view_all', 'edit_all', 'manage_users', 'manage_companies', 'financial_oversight']
    },
    badge: '👑 Group CEO - 9 Companies',
    level: 1
  },

  // Division Admins
  flow_division_admin: {
    role: 'division_admin',
    title: '🏢 Flow Division Director',
    description: 'Flow Solution Division: FS + FSE + FSP',
    scope: {
      companyIds: ['flow-solution', 'flow-solution-engineering', 'flow-solution-penang'],
      permissions: ['view_division', 'edit_division', 'manage_division_users']
    },
    badge: '🏢 Flow Division - 3 Companies',
    level: 2
  },

  broadwater_division_admin: {
    role: 'division_admin',
    title: '🌊 Broadwater Division Director',
    description: 'Broadwater Division: BWS + BWE',
    scope: {
      companyIds: ['broadwater-solution', 'broadwater-engineering'],
      permissions: ['view_division', 'edit_division', 'manage_division_users']
    },
    badge: '🌊 Broadwater Division - 2 Companies',
    level: 2
  },

  emi_division_admin: {
    role: 'division_admin',
    title: '⚡ EMI Division Director',
    description: 'EMI Division: EMIA + EMIT',
    scope: {
      companyIds: ['emi-automation', 'emi-technology'],
      permissions: ['view_division', 'edit_division', 'manage_division_users']
    },
    badge: '⚡ EMI Division - 2 Companies',
    level: 2
  },

  // Company Admins (Individual MDs)
  company_admin: {
    role: 'company_admin',
    title: '🏪 Managing Director',
    description: 'Individual company management',
    scope: {
      companyIds: ['single_company'], // Will be replaced with actual company ID
      permissions: ['view_company', 'edit_company', 'manage_company_users']
    },
    badge: '🏪 Company MD',
    level: 3
  },

  // Regional Admins
  northern_regional_admin: {
    role: 'regional_admin',
    title: '🌍 Northern Regional Manager',
    description: 'Penang and Northern Malaysia operations',
    scope: {
      region: 'Northern',
      companyIds: ['flow-solution-penang'],
      permissions: ['view_region', 'edit_region']
    },
    badge: '🌍 Northern Region',
    level: 3
  },

  southern_regional_admin: {
    role: 'regional_admin',
    title: '🌍 Southern Regional Manager',
    description: 'Johor and Southern Malaysia operations',
    scope: {
      region: 'Southern',
      companyIds: ['emi-automation', 'emi-technology'],
      permissions: ['view_region', 'edit_region']
    },
    badge: '🌍 Southern Region',
    level: 3
  }
};

export const COMPANY_CATEGORIES = {
  core_solutions: {
    name: 'Core Solutions',
    description: 'Main business operations and client services',
    color: 'blue',
    companies: ['flow-solution']
  },
  engineering_services: {
    name: 'Engineering Services',
    description: 'Technical and engineering solutions',
    color: 'green',
    companies: ['flow-solution-engineering', 'broadwater-engineering']
  },
  regional_operations: {
    name: 'Regional Operations',
    description: 'Geographic expansion and local operations',
    color: 'purple',
    companies: ['flow-solution-penang']
  },
  specialized_solutions: {
    name: 'Specialized Solutions',
    description: 'Niche and specialized business services',
    color: 'orange',
    companies: ['broadwater-solution']
  },
  interior_solutions: {
    name: 'Interior Solutions',
    description: 'Interior design and space solutions',
    color: 'pink',
    companies: ['inhaus']
  },
  innovation_tech: {
    name: 'Innovation & Technology',
    description: 'Future technology and innovation',
    color: 'indigo',
    companies: ['futuresmiths']
  },
  industrial_automation: {
    name: 'Industrial Automation',
    description: 'Manufacturing and automation solutions',
    color: 'red',
    companies: ['emi-automation']
  },
  technology_solutions: {
    name: 'Technology Solutions',
    description: 'Advanced technology implementations',
    color: 'teal',
    companies: ['emi-technology']
  }
};

export const DEFAULT_ADMIN_ASSIGNMENTS = {
  'edisonchung@flowsolution.net': {
    role: 'group_admin',
    companyIds: ['*'],
    branchIds: ['*'],
    permissions: ['view_all', 'edit_all', 'manage_users', 'manage_companies', 'financial_oversight'],
    assignedDate: new Date().toISOString(),
    assignedBy: 'system',
    badge: '👑 Group CEO - 9 Companies'
  }
};

// Utility functions
export const getCompanyById = (id) => REAL_COMPANIES[id];
export const getBranchesByCompany = (companyId) => 
  Object.values(COMPANY_BRANCHES).filter(branch => branch.companyId === companyId);
export const getCompaniesByCategory = (category) =>
  Object.values(REAL_COMPANIES).filter(company => company.category === category);
export const getCompanyByBranch = (branchId) => {
  const branch = COMPANY_BRANCHES[branchId];
  return branch ? REAL_COMPANIES[branch.companyId] : null;
};

export default {
  REAL_COMPANIES,
  COMPANY_BRANCHES,
  ADMIN_HIERARCHY,
  COMPANY_CATEGORIES,
  DEFAULT_ADMIN_ASSIGNMENTS,
  getCompanyById,
  getBranchesByCompany,
  getCompaniesByCategory,
  getCompanyByBranch
};
