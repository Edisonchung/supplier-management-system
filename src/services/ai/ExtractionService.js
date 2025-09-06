// src/services/ai/ExtractionService.js
// Handle all API extraction calls with user context for dual prompt system

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'https://supplier-mcp-server-production.up.railway.app';
const DEFAULT_TIMEOUT = 120000;

export class ExtractionService {
  /**
   * Enhanced user context detection with multiple fallback sources
   */
  static getCurrentUser() {
    try {
      // Try multiple sources for user data
      const sources = [
        () => JSON.parse(localStorage.getItem('currentUser')),
        () => JSON.parse(sessionStorage.getItem('user')), 
        () => JSON.parse(localStorage.getItem('user')),
        () => window.currentUser,
        () => this.extractUserFromAuth()
      ];

      for (const source of sources) {
        try {
          const user = source();
          if (user && (user.email || user.userEmail)) {
            console.log('✅ Found user context:', user.email || user.userEmail);
            return user;
          }
        } catch (e) {
          continue;
        }
      }

      console.warn('⚠️ No user context found in any source');
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Extract user from Firebase Auth if available
   */
  static extractUserFromAuth() {
    if (typeof window !== 'undefined' && window.firebase?.auth) {
      const currentUser = window.firebase.auth().currentUser;
      if (currentUser) {
        return {
          email: currentUser.email,
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          role: 'user' // Default role
        };
      }
    }
    return null;
  }

  /**
   * Enhanced user context addition to FormData for dual prompt system
   */
  static addUserContextToFormData(formData, user = null) {
    const currentUser = user || this.getCurrentUser();
    
    if (currentUser) {
      // Primary user fields for dual system detection
      const userEmail = currentUser.email || currentUser.userEmail;
      const userRole = currentUser.role || 'user';
      const userId = currentUser.uid || currentUser.id;
      
      // Add user context fields expected by backend dual prompt system
      formData.append('userEmail', userEmail);
      formData.append('user_email', userEmail); // Alternative field name
      formData.append('userRole', userRole);
      formData.append('userId', userId);
      
      // Add complete user object as JSON
      formData.append('user', JSON.stringify({
        email: userEmail,
        role: userRole,
        uid: userId,
        displayName: currentUser.displayName || currentUser.name || 'Unknown'
      }));
      
      console.log('🔧 Added user context to FormData:', {
        email: userEmail,
        role: userRole,
        uid: userId,
        isTestUser: userEmail === 'edisonchung@flowsolution.net'
      });
      
      // Special logging for Edison (test user)
      if (userEmail === 'edisonchung@flowsolution.net') {
        console.log('🧪 Test user detected - should get MCP system');
      }
    } else {
      console.warn('⚠️ No user context found - extraction will use legacy system');
      // Add anonymous fallback
      formData.append('userEmail', 'anonymous');
      formData.append('user_email', 'anonymous');
    }
    
    return formData;
  }

  /**
   * Enhanced PDF extraction with explicit document type and user context
   */
  static async extractFromPDF(file, user = null) {
    console.log('📄 Starting PDF extraction for:', file.name);
    
    const formData = new FormData();
    formData.append('file', file); // Changed from 'pdf' to 'file' for consistency
    
    // ✅ CRITICAL: Explicitly set document type for purchase orders
    formData.append('documentType', 'purchase_order');
    formData.append('extractionType', 'po_extraction');
    
    // Enhanced extraction settings
    formData.append('enhancedMode', 'true');
    formData.append('validateData', 'true');
    formData.append('includeOCR', 'true');

    // ✅ CRITICAL: Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);
    
    // Add metadata to help with prompt selection
    formData.append('metadata', JSON.stringify({
      documentCategory: 'purchase_order',
      extractionType: 'po_extraction',
      timestamp: new Date().toISOString(),
      source: 'ExtractionService',
      version: '2.1.0',
      fileName: file.name,
      fileSize: file.size
    }));

    try {
      console.log('🌐 Calling PDF extraction API:', `${AI_BACKEND_URL}/api/extract-po`);
      
      const response = await fetch(`${AI_BACKEND_URL}/api/extract-po`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Add user email in header as additional context
          'x-user-email': user?.email || user?.userEmail || this.getCurrentUser()?.email || 'anonymous',
          'x-document-type': 'purchase_order'
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to extract from PDF' }));
        throw new Error(error.error || `PDF extraction failed: ${response.status}`);
      }

      const result = await response.json();
      
      // ✅ Enhanced dual system results logging
      if (result.extraction_metadata) {
        const metadata = result.extraction_metadata;
        
        console.log('📊 PDF Extraction Metadata:', {
          system_used: metadata.system_used,
          user_email: metadata.user_email,
          user_is_test_user: metadata.user_is_test_user,
          prompt_name: metadata.prompt_name,
          prompt_id: metadata.prompt_id,
          processing_time: metadata.processing_time,
          ai_provider: metadata.ai_provider
        });
        
        // ✅ CRITICAL: Check for wrong prompt usage
        if (metadata.prompt_name?.includes('Brand Detection') || 
            metadata.prompt_name?.includes('Product Enhancement')) {
          console.error('🚨 CRITICAL ERROR: Purchase Order using wrong prompt type!');
          console.error('Expected: Purchase Order prompt');
          console.error('Actual:', metadata.prompt_name);
          console.error('System used:', metadata.system_used);
          console.error('User:', metadata.user_email);
        }
        
        // ✅ Success confirmation for correct system usage
        if (metadata.system_used === 'mcp' && user?.email === 'edisonchung@flowsolution.net') {
          console.log('✅ SUCCESS: Edison using MCP system as expected');
        } else if (metadata.system_used === 'legacy' && user?.email === 'edisonchung@flowsolution.net') {
          console.warn('⚠️ WARNING: Edison should be using MCP system but got legacy');
        }
        
        // ✅ Prompt type validation
        if (metadata.prompt_name?.toLowerCase().includes('purchase order') ||
            metadata.prompt_name?.toLowerCase().includes('po extraction')) {
          console.log('✅ SUCCESS: Using Purchase Order specific prompt');
        }
      } else {
        console.warn('⚠️ No extraction metadata received from backend');
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw error;
    }
  }

  /**
   * Enhanced image extraction with user context
   */
  static async extractFromImage(file, user = null) {
    console.log('🖼️ Starting image extraction for:', file.name);
    
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ocrMode', 'advanced');
    formData.append('documentType', 'auto_detect');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'x-user-email': user?.email || user?.userEmail || this.getCurrentUser()?.email || 'anonymous'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to extract from image');
    }

    const result = await response.json();
    
    // Log dual system results
    if (result.extraction_metadata) {
      console.log('📊 Image Extraction Results:', result.extraction_metadata);
    }
    
    return result;
  }

  /**
   * Enhanced Excel extraction with user context
   */
  static async extractFromExcel(file, user = null) {
    console.log('📊 Starting Excel extraction for:', file.name);
    
    const formData = new FormData();
    formData.append('excel', file);
    formData.append('parseFormat', 'auto');
    formData.append('documentType', 'auto_detect');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-excel`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'x-user-email': user?.email || user?.userEmail || this.getCurrentUser()?.email || 'anonymous'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to extract from Excel');
    }

    const result = await response.json();
    
    // Log dual system results
    if (result.extraction_metadata) {
      console.log('📊 Excel Extraction Results:', result.extraction_metadata);
    }
    
    return result;
  }

  /**
   * Enhanced email extraction with user context
   */
  static async extractFromEmail(file, user = null) {
    console.log('📧 Starting email extraction for:', file.name);
    
    const formData = new FormData();
    formData.append('email', file);
    formData.append('extractAttachments', 'true');
    formData.append('documentType', 'auto_detect');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-email`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        'x-user-email': user?.email || user?.userEmail || this.getCurrentUser()?.email || 'anonymous'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to extract from email');
    }

    const result = await response.json();
    
    // Log dual system results
    if (result.extraction_metadata) {
      console.log('📊 Email Extraction Results:', result.extraction_metadata);
    }
    
    return result;
  }

  /**
   * Enhanced API call with better error handling and logging
   */
  static async callExtractionAPI(file, user = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extractionMode', 'enhanced');
    formData.append('includeOCR', 'true');
    formData.append('documentType', 'auto_detect');
    
    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);
    
    // Determine the appropriate endpoint based on file type
    const endpoint = this.getEndpointForFileType(file);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      console.log(`🌐 Calling extraction API: ${AI_BACKEND_URL}${endpoint}`);
      
      const response = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'x-user-email': user?.email || user?.userEmail || this.getCurrentUser()?.email || 'anonymous'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Extraction failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Enhanced dual system metadata logging
      if (result.extraction_metadata) {
        console.log('📊 Extraction Metadata:', {
          system_used: result.extraction_metadata.system_used,
          user_email: result.extraction_metadata.user_email,
          user_is_test_user: result.extraction_metadata.user_is_test_user,
          prompt_name: result.extraction_metadata.prompt_name,
          processing_time: result.extraction_metadata.processing_time,
          document_type: result.extraction_metadata.document_type
        });
        
        // Validation checks
        if (result.extraction_metadata.prompt_name?.includes('Brand Detection')) {
          console.warn('⚠️ Generic prompt used - may indicate prompt selection issue');
        }
      }
      
      return result;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Extraction timeout - file may be too large or complex');
      }
      console.error('❌ Extraction API call failed:', error);
      throw error;
    }
  }

  /**
   * Get the appropriate API endpoint based on file type
   */
  static getEndpointForFileType(file) {
    const type = this.getFileType(file);
    
    switch (type) {
      case 'pdf':
        return '/api/extract-po'; // Default to PO extraction for PDFs
      case 'image':
        return '/api/extract-image';
      case 'excel':
        return '/api/extract-excel';
      case 'email':
        return '/api/extract-email';
      default:
        return '/api/extract-generic';
    }
  }

  /**
   * Determine file type from file object
   */
  static getFileType(file) {
    const mimeType = file.type || '';
    const fileName = file.name || '';
    
    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) return 'pdf';
    if (/image\/(jpeg|jpg|png|gif|bmp)/.test(mimeType)) return 'image';
    if (mimeType.includes('excel') || /\.(xlsx|xls)$/.test(fileName)) return 'excel';
    if (/\.(eml|msg)$/.test(fileName)) return 'email';
    
    return 'unknown';
  }

  /**
   * Enhanced batch extraction with better error handling
   */
  static async batchExtract(files, user = null) {
    const results = [];
    const currentUser = user || this.getCurrentUser();
    
    console.log(`📦 Starting batch extraction for ${files.length} files`);
    
    for (const file of files) {
      try {
        console.log(`🔄 Processing file: ${file.name}`);
        const result = await this.callExtractionAPI(file, currentUser);
        results.push({
          file: file.name,
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        });
        console.log(`✅ Successfully processed: ${file.name}`);
      } catch (error) {
        console.error(`❌ Failed to process: ${file.name}`, error);
        results.push({
          file: file.name,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`📊 Batch extraction complete: ${successCount}/${files.length} successful`);
    
    return results;
  }

  /**
   * Test dual system status for current user
   */
  static async testDualSystemStatus() {
    const user = this.getCurrentUser();
    const userEmail = user?.email || user?.userEmail || 'anonymous';
    
    try {
      console.log('🧪 Testing dual system status for:', userEmail);
      
      const response = await fetch(`${AI_BACKEND_URL}/api/prompt-system-status?userEmail=${userEmail}`);
      
      if (response.ok) {
        const status = await response.json();
        console.log('📊 Dual System Status:', {
          current_system: status.current_system,
          user_is_test_user: status.user_info?.is_test_user,
          selected_prompt: status.selected_prompt?.promptName,
          mcp_prompts: status.system_stats?.mcp_prompts
        });
        return status;
      } else {
        console.warn('⚠️ Could not get dual system status');
        return null;
      }
    } catch (error) {
      console.error('❌ Error testing dual system status:', error);
      return null;
    }
  }
}
