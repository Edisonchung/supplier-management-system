// src/services/ai/ExtractionService.js
// Handle all API extraction calls with user context for dual prompt system

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'https://supplier-mcp-server-production.up.railway.app';
const DEFAULT_TIMEOUT = 120000;

export class ExtractionService {
  /**
   * Get current user from localStorage or context
   */
  static getCurrentUser() {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        return JSON.parse(userStr);
      }
      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Add user context to FormData for dual prompt system
   */
  static addUserContextToFormData(formData, user = null) {
    const currentUser = user || this.getCurrentUser();
    
    if (currentUser) {
      // Add user context fields expected by backend dual prompt system
      formData.append('userEmail', currentUser.email);
      formData.append('user_email', currentUser.email);
      formData.append('user', JSON.stringify({
        email: currentUser.email,
        role: currentUser.role || 'user',
        uid: currentUser.uid,
        displayName: currentUser.displayName
      }));
      
      console.log('🔧 Added user context to FormData:', {
        email: currentUser.email,
        role: currentUser.role,
        uid: currentUser.uid
      });
    } else {
      console.warn('⚠️ No user context found - extraction will use legacy system');
    }
    
    return formData;
  }

  /**
   * Call the backend extraction API with user context
   */
  static async callExtractionAPI(file, user = null) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extractionMode', 'enhanced');
    formData.append('includeOCR', 'true');
    
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
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Extraction failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Log dual system metadata
      if (result.extraction_metadata) {
        console.log('📊 Extraction Metadata:', {
          system_used: result.extraction_metadata.system_used,
          user_email: result.extraction_metadata.user_email,
          user_is_test_user: result.extraction_metadata.user_is_test_user,
          prompt_name: result.extraction_metadata.prompt_name,
          processing_time: result.extraction_metadata.processing_time
        });
      }
      
      return result;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Extraction timeout - file may be too large or complex');
      }
      throw error;
    }
  }

  /**
   * Extract from PDF files with user context
   */
  static async extractFromPDF(file, user = null) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('enhancedMode', 'true');
    formData.append('validateData', 'true');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-po`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to extract from PDF' }));
      throw new Error(error.error || 'Failed to extract from PDF');
    }

    const result = await response.json();
    
    // Log dual system results
    if (result.extraction_metadata) {
      console.log('📊 PDF Extraction Results:', result.extraction_metadata);
    }
    
    return result;
  }

  /**
   * Extract from image files (PNG, JPG, etc.) with user context
   */
  static async extractFromImage(file, user = null) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ocrMode', 'advanced');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from image');
    }

    return response.json();
  }

  /**
   * Extract from Excel files with user context
   */
  static async extractFromExcel(file, user = null) {
    const formData = new FormData();
    formData.append('excel', file);
    formData.append('parseFormat', 'auto');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-excel`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from Excel');
    }

    return response.json();
  }

  /**
   * Extract from email files (.eml, .msg) with user context
   */
  static async extractFromEmail(file, user = null) {
    const formData = new FormData();
    formData.append('email', file);
    formData.append('extractAttachments', 'true');

    // Add user context for dual prompt system
    this.addUserContextToFormData(formData, user);

    const response = await fetch(`${AI_BACKEND_URL}/api/extract-email`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to extract from email');
    }

    return response.json();
  }

  /**
   * Get the appropriate API endpoint based on file type
   */
  static getEndpointForFileType(file) {
    const type = this.getFileType(file);
    
    switch (type) {
      case 'pdf':
        return '/api/extract-po';
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
   * Batch extraction for multiple files with user context
   */
  static async batchExtract(files, user = null) {
    const results = [];
    const currentUser = user || this.getCurrentUser();
    
    for (const file of files) {
      try {
        const result = await this.callExtractionAPI(file, currentUser);
        results.push({
          file: file.name,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
}
