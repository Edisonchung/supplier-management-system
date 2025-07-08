// src/services/ai/ExtractionService.js
// Handle all API extraction calls

const AI_BACKEND_URL = import.meta.env.VITE_AI_BACKEND_URL || 'https://supplier-mcp-server-production.up.railway.app';
const DEFAULT_TIMEOUT = 120000;

export class ExtractionService {
  /**
   * Call the backend extraction API
   */
  static async callExtractionAPI(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('extractionMode', 'enhanced');
    formData.append('includeOCR', 'true');
    
    // Determine the appropriate endpoint based on file type
    const endpoint = this.getEndpointForFileType(file);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
      
      const response = await fetch(`${AI_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Extraction failed: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Extraction timeout - file may be too large or complex');
      }
      throw error;
    }
  }

  /**
   * Extract from PDF files
   */
  static async extractFromPDF(file) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('enhancedMode', 'true');
    formData.append('validateData', 'true');

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

    return response.json();
  }

  /**
   * Extract from image files (PNG, JPG, etc.)
   */
  static async extractFromImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ocrMode', 'advanced');

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
   * Extract from Excel files
   */
  static async extractFromExcel(file) {
    const formData = new FormData();
    formData.append('excel', file);
    formData.append('parseFormat', 'auto');

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
   * Extract from email files (.eml, .msg)
   */
  static async extractFromEmail(file) {
    const formData = new FormData();
    formData.append('email', file);
    formData.append('extractAttachments', 'true');

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
   * Batch extraction for multiple files
   */
  static async batchExtract(files) {
    const results = [];
    
    for (const file of files) {
      try {
        const result = await this.callExtractionAPI(file);
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
