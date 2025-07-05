// src/services/aiExtractionService.js

const MCP_SERVER_URL = import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';

export class AIExtractionService {
  static async extractPOFromPDF(file) {
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${MCP_SERVER_URL}/api/extract-po`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to extract data');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Extraction failed');
      }

      // Transform the extracted data to match your form structure
      return this.transformExtractedData(result.data);
    } catch (error) {
      console.error('AI Extraction failed:', error);
      throw error;
    }
  }

  static transformExtractedData(data) {
    // Ensure all required fields are present with defaults
    return {
      clientPoNumber: data.clientPoNumber || '',
      clientName: data.clientName || '',
      clientContact: data.clientContact || '',
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      orderDate: data.orderDate || new Date().toISOString().split('T')[0],
      requiredDate: data.requiredDate || '',
      items: Array.isArray(data.items) ? data.items.map(item => ({
        productName: item.productName || '',
        productCode: item.productCode || '',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        totalPrice: Number(item.totalPrice) || 0,
      })) : [],
      paymentTerms: data.paymentTerms || '',
      deliveryTerms: data.deliveryTerms || '',
    };
  }

  static async checkServerHealth() {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }
}