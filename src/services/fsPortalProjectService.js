// ===== FILE: src/services/fsPortalProjectService.js =====
// Create this new file in your src/services/ directory

class FSPortalProjectService {
  constructor() {
    this.portalApiUrl = process.env.REACT_APP_FS_PORTAL_API_URL || 'https://fs-portal.com/api';
    this.portalApiKey = process.env.REACT_APP_FS_PORTAL_API_KEY;
    this.useMockData = !this.portalApiKey; // Use mock data until API is connected
  }

  /**
   * Get project codes from FS Portal system
   * Handles multiple company prefixes: FS, FSP, BWS, BWE, DDE, ES, HA
   */
  async getProjectCodes(companyFilter = null) {
    try {
      if (this.useMockData) {
        console.log('🔧 FS Portal API not configured, using cached/manual mode');
        return this.getCachedProjectCodes(companyFilter);
      }

      // Future FS Portal API integration
      const response = await fetch(`${this.portalApiUrl}/jobs/active`, {
        headers: {
          'Authorization': `Bearer ${this.portalApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`FS Portal API Error: ${response.status}`);
      }

      const portalJobs = await response.json();
      
      // Transform FS Portal data to our format
      let projects = portalJobs.map(job => ({
        id: job.id,
        projectCode: job.projectCode, // BWS-S1046, FS-P1079, etc.
        jobTitle: job.jobTitle,
        clientCompany: job.clientCompany,
        amount: job.amount,
        status: job.status,
        probability: job.probability,
        picName: job.picName,
        dateCreated: job.dateCreated,
        handledBy: job.handledBy,
        createdBy: job.createdBy,
        companyPrefix: this.extractCompanyPrefix(job.projectCode),
        projectType: this.extractProjectType(job.projectCode),
        source: 'fs-portal'
      }));

      // Filter by company if specified
      if (companyFilter) {
        projects = projects.filter(p => p.companyPrefix === companyFilter);
      }

      return projects;

    } catch (error) {
      console.error('❌ Error fetching FS Portal project codes:', error);
      console.log('🔄 Falling back to cached mode');
      return this.getCachedProjectCodes(companyFilter);
    }
  }

  /**
   * Extract company prefix from project code
   * BWS-S1046 → BWS, FS-P1079 → FS
   */
  extractCompanyPrefix(projectCode) {
    if (!projectCode) return 'UNKNOWN';
    const match = projectCode.match(/^([A-Z]+)-/);
    return match ? match[1] : 'UNKNOWN';
  }

  /**
   * Extract project type from project code  
   * BWS-S1046 → S, FS-P1079 → P, BWS-SV1001 → SV
   */
  extractProjectType(projectCode) {
    if (!projectCode) return 'UNKNOWN';
    const match = projectCode.match(/^[A-Z]+-([A-Z]+)\d+$/);
    return match ? match[1] : 'UNKNOWN';
  }

  /**
   * Get company information based on prefix
   */
  getCompanyInfo(prefix) {
    const companies = {
      'FS': {
        name: 'Flow Solution Sdn Bhd',
        fullName: 'Flow Solution',
        division: 'Main Company',
        color: '#2563eb' // blue
      },
      'FSP': {
        name: 'Flow Solution Projects',
        fullName: 'Flow Solution Projects',
        division: 'Project Division',
        color: '#7c3aed' // purple
      },
      'BWS': {
        name: 'BWS Division',
        fullName: 'BWS Engineering',
        division: 'Engineering Services',
        color: '#059669' // green
      },
      'BWE': {
        name: 'BWE Division', 
        fullName: 'BWE Solutions',
        division: 'Engineering Solutions',
        color: '#dc2626' // red
      },
      'DDE': {
        name: 'DDE Division',
        fullName: 'DDE Engineering',
        division: 'Design & Development',
        color: '#ea580c' // orange
      },
      'ES': {
        name: 'ES Division',
        fullName: 'Engineering Services',
        division: 'Technical Services',
        color: '#0891b2' // cyan
      },
      'HA': {
        name: 'HA Division',
        fullName: 'HA Solutions',
        division: 'Hardware & Automation',
        color: '#7c2d12' // brown
      }
    };

    return companies[prefix] || {
      name: `${prefix} Division`,
      fullName: `${prefix} Company`,
      division: 'Unknown Division',
      color: '#6b7280' // gray
    };
  }

  /**
   * Get project type information
   */
  getProjectTypeInfo(type) {
    const types = {
      'S': { name: 'Service', description: 'Service Projects' },
      'P': { name: 'Project', description: 'Development Projects' },
      'SV': { name: 'Service Visit', description: 'On-site Services' },
      'M': { name: 'Maintenance', description: 'Maintenance Contracts' },
      'C': { name: 'Consultation', description: 'Consulting Services' },
      'I': { name: 'Installation', description: 'Installation Projects' }
    };

    return types[type] || { name: type, description: 'General Project' };
  }

  /**
   * Cached/Manual project codes (current mode)
   */
  getCachedProjectCodes(companyFilter = null) {
    // Get from localStorage cache
    const cached = localStorage.getItem('fsPortalProjectCodes');
    let projects = cached ? JSON.parse(cached) : this.getDefaultProjectCodes();

    // Filter by company prefix if specified
    if (companyFilter) {
      projects = projects.filter(p => p.companyPrefix === companyFilter);
    }

    return projects;
  }

  /**
   * Default project codes based on your FS Portal structure
   */
  getDefaultProjectCodes() {
    return [
      {
        id: 'bws-s1046',
        projectCode: 'BWS-S1046',
        jobTitle: 'Replacement Graco Bumper (P/N 184615)',
        clientCompany: 'LFM Energy Sdn Bhd',
        amount: 1900.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Ms Loh',
        dateCreated: '22-Jul-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'S',
        source: 'manual'
      },
      {
        id: 'bws-sv1002',
        projectCode: 'BWS-SV1002', 
        jobTitle: 'Site Inspection Due to Repeated Pump Failure',
        clientCompany: 'Flow Solution Sdn Bhd',
        amount: 0.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Mr. Chung',
        dateCreated: '17-Jul-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'SV',
        source: 'manual'
      },
      {
        id: 'bws-sv1001',
        projectCode: 'BWS-SV1001',
        jobTitle: 'Grundfos CR64-3-1',
        clientCompany: 'Sinaran Teguh Engineering Sdn Bhd',
        amount: 11048.50,
        status: 'Proposal',
        probability: '50%',
        picName: 'Chan Kuan',
        dateCreated: '03-Jun-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'SV',
        source: 'manual'
      },
      {
        id: 'bws-p1080',
        projectCode: 'BWS-P1080',
        jobTitle: 'PREVENTIVE MAINTENANCE AND CORRECTION',
        clientCompany: 'PTP',
        amount: 0.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Nur Zhafrih',
        dateCreated: '04-Apr-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'P',
        source: 'manual'
      },
      {
        id: 'fs-p1079',
        projectCode: 'FS-P1079',
        jobTitle: 'Forklift Control Panel',
        clientCompany: 'Borneo Springs Sdn Bhd',
        amount: 45000.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Wan Amin',
        dateCreated: '03-Apr-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'FS',
        projectType: 'P',
        source: 'manual'
      },
      {
        id: 'bws-s1045',
        projectCode: 'BWS-S1045',
        jobTitle: 'General Service',
        clientCompany: 'Various',
        amount: 0.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'General',
        dateCreated: '03-Apr-25',
        handledBy: 'edisonchung',
        createdBy: 'edisonchung',
        companyPrefix: 'BWS',
        projectType: 'S',
        source: 'manual'
      },
      {
        id: 'fsp-s1044',
        projectCode: 'FSP-S1044',
        jobTitle: 'Grundfos CR10-22 spares',
        clientCompany: 'TMK Chemical Banting Sdn Bhd',
        amount: 1.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Rashidan',
        dateCreated: '29-Mar-25',
        handledBy: 'edisonchung',
        createdBy: 'edisonchung',
        companyPrefix: 'FSP',
        projectType: 'S',
        source: 'manual'
      },
      {
        id: 'bws-p1078',
        projectCode: 'BWS-P1078',
        jobTitle: 'Chlorine Ejector Replacement and Service',
        clientCompany: 'F&N BEVERAGES MANUFACTURING',
        amount: 18000.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Amin',
        dateCreated: '21-Mar-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'P',
        source: 'manual'
      },
      {
        id: 'bws-s1043',
        projectCode: 'BWS-S1043',
        jobTitle: 'Pump Service - 3kw Vengono QL400 stainless',
        clientCompany: 'Top Glove Sdn Bhd (F27)',
        amount: 1200.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Faizal',
        dateCreated: '21-Mar-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'S',
        source: 'manual'
      },
      {
        id: 'bws-s1042',
        projectCode: 'BWS-S1042',
        jobTitle: 'Valve Position Alarm Panel',
        clientCompany: 'Sinaran Teguh Engineering Sdn Bhd',
        amount: 2500.00,
        status: 'Proposal',
        probability: '50%',
        picName: 'Chan Kuan',
        dateCreated: '14-Mar-25',
        handledBy: 'edisonchung',
        createdBy: 'cm.kaw',
        companyPrefix: 'BWS',
        projectType: 'S',
        source: 'manual'
      }
    ];
  }

  /**
   * Validate FS Portal project code format
   */
  validateProjectCode(code) {
    // FS Portal format: {2-3 letter prefix}-{1-2 letter type}{3-4 digits}
    const fsPortalPattern = /^[A-Z]{2,3}-[A-Z]{1,2}\d{3,4}$/;
    return fsPortalPattern.test(code);
  }

  /**
   * Add manual project code to cache
   */
  addManualProjectCode(projectCode, jobTitle, clientCompany, amount = 0) {
    const cached = this.getCachedProjectCodes();
    const newProject = {
      id: `manual-${Date.now()}`,
      projectCode: projectCode,
      jobTitle: jobTitle || projectCode,
      clientCompany: clientCompany || 'Manual Entry',
      amount: parseFloat(amount) || 0,
      status: 'Active',
      probability: '100%',
      picName: 'Manual Entry',
      companyPrefix: this.extractCompanyPrefix(projectCode),
      projectType: this.extractProjectType(projectCode),
      source: 'manual',
      addedAt: new Date().toISOString()
    };
    
    // Avoid duplicates
    if (!cached.find(p => p.projectCode === projectCode)) {
      cached.push(newProject);
      localStorage.setItem('fsPortalProjectCodes', JSON.stringify(cached));
    }
    
    return newProject;
  }

  /**
   * Search projects by various criteria
   */
  searchProjects(query, projects = null) {
    if (!projects) {
      projects = this.getCachedProjectCodes();
    }

    const lowerQuery = query.toLowerCase();
    return projects.filter(project => 
      project.projectCode.toLowerCase().includes(lowerQuery) ||
      project.jobTitle.toLowerCase().includes(lowerQuery) ||
      project.clientCompany.toLowerCase().includes(lowerQuery) ||
      project.picName.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get projects by company prefix
   */
  getProjectsByCompany(companyPrefix) {
    const allProjects = this.getCachedProjectCodes();
    return allProjects.filter(project => project.companyPrefix === companyPrefix);
  }

  /**
   * Get recent projects (last 30 days)
   */
  getRecentProjects(days = 30) {
    const allProjects = this.getCachedProjectCodes();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return allProjects.filter(project => {
      if (!project.dateCreated) return true; // Include if no date
      try {
        const projectDate = new Date(project.dateCreated);
        return projectDate >= cutoffDate;
      } catch {
        return true; // Include if date parsing fails
      }
    });
  }
}

export const fsPortalProjectService = new FSPortalProjectService();
