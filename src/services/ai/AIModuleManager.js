//services/ai/AIModuleManager.js
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class AIModuleManager {
  constructor() {
    this.modulesPath = path.join(__dirname, '../../data/ai/modules.json');
    this.modules = new Map();
    this.loadModules();
  }

  async loadModules() {
    try {
      const data = await fs.readFile(this.modulesPath, 'utf8');
      const modules = JSON.parse(data);
      
      modules.forEach(module => {
        this.modules.set(module.id, module);
      });
      
      console.log(`✅ Loaded ${modules.length} AI modules`);
    } catch (error) {
      console.log('🔄 Creating default AI modules configuration...');
      await this.createDefaultModules();
    }
  }

  async createDefaultModules() {
    const defaultModules = [
      {
        id: 'document_extraction',
        name: 'Document Extraction',
        description: 'Extract data from PDFs, images, and documents',
        category: 'extraction',
        status: 'active',
        version: '2.1.0',
        icon: '📄',
        features: ['PDF Processing', 'OCR', 'Table Detection', 'Supplier-Specific'],
        endpoints: ['/api/ai/extract/document', '/api/extract-po', '/api/extract-pi'],
        usage: { daily: 245, weekly: 1680, monthly: 7200 },
        accuracy: 92,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        prompts: []
      },
      {
        id: 'supplier_intelligence',
        name: 'Supplier Intelligence',
        description: 'AI-powered supplier analysis and insights',
        category: 'analytics',
        status: 'development',
        version: '1.0.0',
        icon: '🧠',
        features: ['Performance Analysis', 'Risk Assessment', 'Price Intelligence'],
        endpoints: ['/api/ai/analyze/supplier'],
        usage: { daily: 0, weekly: 0, monthly: 0 },
        accuracy: 0,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        prompts: []
      },
      {
        id: 'email_processing',
        name: 'Email Processing',
        description: 'Intelligent email classification and processing',
        category: 'communication',
        status: 'planned',
        version: '0.1.0',
        icon: '📧',
        features: ['Auto-Classification', 'Content Extraction', 'Priority Detection'],
        endpoints: ['/api/ai/classify/email'],
        usage: { daily: 0, weekly: 0, monthly: 0 },
        accuracy: 0,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        prompts: []
      }
    ];

    // Save to modules map
    defaultModules.forEach(module => {
      this.modules.set(module.id, module);
    });

    // Save to file
    await this.saveModules();
    console.log('✅ Created default AI modules');
  }

  async saveModules() {
    try {
      const modulesArray = Array.from(this.modules.values());
      
      // Ensure directory exists
      const dir = path.dirname(this.modulesPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.modulesPath, JSON.stringify(modulesArray, null, 2));
      return true;
    } catch (error) {
      console.error('❌ Failed to save AI modules:', error);
      return false;
    }
  }

  // Get module by ID
  getModule(moduleId) {
    return this.modules.get(moduleId);
  }

  // Get all modules
  getAllModules() {
    return Array.from(this.modules.values());
  }

  // Get active modules only
  getActiveModules() {
    return Array.from(this.modules.values()).filter(m => m.status === 'active');
  }

  // Update module
  async updateModule(moduleId, updates) {
    const module = this.modules.get(moduleId);
    if (!module) return false;

    const updatedModule = {
      ...module,
      ...updates,
      lastModified: new Date().toISOString()
    };

    this.modules.set(moduleId, updatedModule);
    return await this.saveModules();
  }

  // Get module for specific task
  getModuleForTask(taskType, context = {}) {
    const modules = this.getActiveModules();
    
    // Find modules that handle this task type
    const matchingModules = modules.filter(module => {
      return module.category === taskType || 
             module.features.some(feature => 
               feature.toLowerCase().includes(taskType.toLowerCase())
             );
    });

    // Return the highest version active module
    return matchingModules.sort((a, b) => 
      b.version.localeCompare(a.version, undefined, { numeric: true })
    )[0] || null;
  }

  // Update usage statistics
  async updateUsageStats(moduleId, operation = 'request') {
    const module = this.modules.get(moduleId);
    if (!module) return false;

    const usage = module.usage || { daily: 0, weekly: 0, monthly: 0 };
    usage.daily += 1;
    
    return await this.updateModule(moduleId, { usage });
  }
}

module.exports = AIModuleManager;
