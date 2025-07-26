// src/utils/adminAssignmentSetup.js - Fix admin assignment for Edison
import { safeSetDocument, safeGetDocument } from '../config/firebase';

// Create Edison's admin assignment if it doesn't exist
export const ensureEdisonAdminAccess = async () => {
  const email = 'edisonchung@flowsolution.net';
  
  try {
    console.log('🔍 Checking Edison admin assignment...');
    
    // Check if assignment already exists
    const result = await safeGetDocument('adminAssignments', email);
    
    if (result.success && result.data?.exists) {
      console.log('✅ Edison admin assignment already exists');
      return { success: true, existed: true };
    }
    
    console.log('➕ Creating Edison admin assignment...');
    
    // Create the admin assignment
    const adminData = {
      role: 'group_admin',
      companyIds: ['*'],
      branchIds: ['*'],
      permissions: [
        'view_all', 
        'edit_all', 
        'manage_users', 
        'manage_companies', 
        'financial_oversight',
        'system_admin'
      ],
      assignedDate: new Date().toISOString(),
      assignedBy: 'system',
      badge: '👑 Group CEO - All Companies',
      title: 'Group Chief Executive Officer',
      level: 1,
      email: email,
      isSystemAdmin: true,
      isSuperAdmin: true
    };
    
    const setResult = await safeSetDocument('adminAssignments', email, adminData);
    
    if (setResult.success) {
      console.log('✅ Edison admin assignment created successfully');
      return { success: true, created: true };
    } else {
      console.error('❌ Failed to create Edison admin assignment:', setResult.error);
      return { success: false, error: setResult.error };
    }
    
  } catch (error) {
    console.error('❌ Error ensuring Edison admin access:', error);
    return { success: false, error: error.message };
  }
};

// Initialize system data for first-time setup
export const initializeSystemData = async () => {
  try {
    console.log('🚀 Initializing system data...');
    
    // 1. Ensure Edison's admin access
    const adminResult = await ensureEdisonAdminAccess();
    
    if (!adminResult.success) {
      console.error('❌ Failed to setup admin access');
      return { success: false, error: 'Admin setup failed' };
    }
    
    // 2. Create system configuration if it doesn't exist
    const configResult = await safeGetDocument('systemConfig', 'appSettings');
    
    if (!configResult.success || !configResult.data?.exists) {
      console.log('➕ Creating system configuration...');
      
      const systemConfig = {
        appName: 'HiggsFlow Supplier Management',
        version: '1.0.0',
        initialized: true,
        initializationDate: new Date().toISOString(),
        superAdmin: 'edisonchung@flowsolution.net',
        defaultRole: 'viewer',
        features: {
          multiCompany: true,
          paymentProcessing: true,
          aiExtraction: true,
          batchUpload: true
        }
      };
      
      await safeSetDocument('systemConfig', 'appSettings', systemConfig);
      console.log('✅ System configuration created');
    }
    
    // 3. Create a test document to verify write permissions
    const testData = {
      message: 'System initialization test',
      timestamp: new Date().toISOString(),
      success: true
    };
    
    const testResult = await safeSetDocument('test', 'initialization', testData);
    
    if (testResult.success) {
      console.log('✅ System initialization completed successfully');
      return { success: true, adminSetup: adminResult };
    } else {
      console.error('❌ Test write failed:', testResult.error);
      return { success: false, error: 'Write test failed' };
    }
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    return { success: false, error: error.message };
  }
};

// Call this during app startup
export const runStartupChecks = async () => {
  console.log('🔄 Running startup checks...');
  
  // Wait a bit for Firebase to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const result = await initializeSystemData();
  
  if (result.success) {
    console.log('🎉 Startup checks completed successfully');
  } else {
    console.error('❌ Startup checks failed:', result.error);
  }
  
  return result;
};
