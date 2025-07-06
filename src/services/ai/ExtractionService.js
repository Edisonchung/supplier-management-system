// src/services/ai/ExtractionService.js
// Handle actual extraction logic

import { AI_CONFIG, MOCK_FALLBACK } from './config';

export class ExtractionService {
  /**
   * Extract data from PDF files
   */
  static async extractFromPDF(file) {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('enhancedMode', 'true');
    formData.append('aiProvider', 'auto');
    formData.append('validateData', 'true');

    try {
      const response = await fetch(`${AI_CONFIG.MCP_SERVER_URL}/api/extract-po`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(AI_CONFIG.TIMEOUT)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        
        // Check if it's an API key issue
        if (error.message?.includes('API key') && MOCK_FALLBACK.enabled) {
          console.warn('AI API keys not configured, falling back to mock extraction');
          return this.getMockExtraction(file, 'pdf');
        }
        
        throw new Error(error.message || 'Failed to extract from PDF');
      }

      const result = await response.json();
      
      if (!result.success && MOCK_FALLBACK.enabled) {
        console.warn('Extraction failed, falling back to mock data');
        return this.getMockExtraction(file, 'pdf');
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Extraction timeout - file may be too large');
      }
      
      if (MOCK_FALLBACK.enabled) {
        console.warn('Network error, falling back to mock extraction:', error);
        return this.getMockExtraction(file, 'pdf');
      }
      
      throw error;
    }
  }

  /**
   * Extract data from image files
   */
  static async extractFromImage(file) {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('ocrMode', 'advanced');

    try {
      const response = await fetch(`${AI_CONFIG.MCP_SERVER_URL}/api/extract-image`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(AI_CONFIG.TIMEOUT)
      });

      if (!response.ok) {
        if (MOCK_FALLBACK.enabled) {
          return this.getMockExtraction(file, 'image');
        }
        throw new Error('Failed to extract from image');
      }

      return await response.json();
    } catch (error) {
      if (MOCK_FALLBACK.enabled) {
        return this.getMockExtraction(file, 'image');
      }
      throw error;
    }
  }

  /**
   * Extract data from Excel files
   */
  static async extractFromExcel(file) {
    const formData = new FormData();
    formData.append('excel', file);

    try {
      const response = await fetch(`${AI_CONFIG.MCP_SERVER_URL}/api/extract-excel`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(AI_CONFIG.TIMEOUT)
      });

      if (!response.ok) {
        if (MOCK_FALLBACK.enabled) {
          return this.getMockExtraction(file, 'excel');
        }
        throw new Error('Failed to extract from Excel');
      }

      return await response.json();
    } catch (error) {
      if (MOCK_FALLBACK.enabled) {
        return this.getMockExtraction(file, 'excel');
      }
      throw error;
    }
  }

  /**
   * Extract data from email files
   */
  static async extractFromEmail(file) {
    const formData = new FormData();
    formData.append('email', file);

    try {
      const response = await fetch(`${AI_CONFIG.MCP_SERVER_URL}/api/extract-email`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(AI_CONFIG.TIMEOUT)
      });

      if (!response.ok) {
        if (MOCK_FALLBACK.enabled) {
          return this.getMockExtraction(file, 'email');
        }
        throw new Error('Failed to extract from email');
      }

      return await response.json();
    } catch (error) {
      if (MOCK_FALLBACK.enabled) {
        return this.getMockExtraction(file, 'email');
      }
      throw error;
    }
  }

  /**
   * Determine file type
   */
  static getFileType(file) {
  // Safely get the file extension
  const fileName = file.name || '';
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Safely get the mime type (file.type might be undefined or empty)
  const mimeType = (file.type || '').toLowerCase();

  // Check for PDF
  if (mimeType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }
  
  // Check for images
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
    return 'image';
  }
  
  // Check for Excel files
  if (
    mimeType.includes('spreadsheet') || 
    mimeType.includes('excel') || 
    ['xlsx', 'xls', 'csv'].includes(extension)
  ) {
    return 'excel';
  }
  
  // Check for email files
  if (
    mimeType === 'message/rfc822' || 
    ['eml', 'msg'].includes(extension)
  ) {
    return 'email';
  }
  
  // If we can't determine the type, try to infer from extension
  if (extension) {
    console.warn(`Unknown file type for extension: ${extension}, mime: ${mimeType || 'none'}`);
  }
  
  return 'unknown';
}

  /**
   * Get mock extraction data for testing
   */
  static getMockExtraction(file, fileType) {
    const mockData = {
      success: true,
      data: {
        orderNumber: `PO-${Date.now().toString().slice(-8)}`,
        clientName: 'Mock Client Corp',
        supplierName: 'Mock Supplier Inc',
        orderDate: new Date().toISOString().split('T')[0],
        deliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentTerms: '30D',
        currency: 'MYR',
        items: [
          {
            productName: 'Sample Product A',
            productCode: 'PROD-001',
            quantity: 10,
            unitPrice: 99.99,
            totalPrice: 999.90,
            description: 'Mock extracted item from ' + file.name
          },
          {
            productName: 'Sample Product B',
            productCode: 'PROD-002',
            quantity: 5,
            unitPrice: 149.99,
            totalPrice: 749.95,
            description: 'Another mock item'
          }
        ],
        totalAmount: 1749.85,
        notes: `Mock extraction from ${fileType} file: ${file.name}`,
        extractedAt: new Date().toISOString()
      },
      confidence: MOCK_FALLBACK.confidence,
      model: MOCK_FALLBACK.provider,
      aiProvider: MOCK_FALLBACK.provider,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        fileType: fileType,
        isMockData: true
      }
    };

    // Add some randomization to make it more realistic
    const randomFactor = Math.random();
    if (randomFactor > 0.7) {
      mockData.data.items.push({
        productName: 'Sample Product C',
        productCode: 'PROD-003',
        quantity: Math.floor(Math.random() * 20) + 1,
        unitPrice: Math.random() * 200 + 50,
        totalPrice: 0
      });
      mockData.data.items[2].totalPrice = mockData.data.items[2].quantity * mockData.data.items[2].unitPrice;
      mockData.data.totalAmount = mockData.data.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }

    return mockData;
  }

  /**
   * Test backend connection
   */
  static async testConnection() {
    try {
      const response = await fetch(`${AI_CONFIG.MCP_SERVER_URL}/api/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available AI providers from backend
   */
  static async getAvailableProviders() {
    try {
      const response = await fetch(`${AI_CONFIG.MCP_SERVER_URL}/api/ai-providers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.providers || [];
      }
    } catch (error) {
      console.error('Failed to fetch AI providers:', error);
    }
    
    return ['mock'];
  }
}
