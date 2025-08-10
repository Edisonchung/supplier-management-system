// src/services/MCPProductEnhancementService.js
// Quick implementation for MCP product enhancement

export class MCPProductEnhancementService {
  static MCP_SERVER_URL = 'https://supplier-mcp-server-production.up.railway.app';
  
  static async enhanceProduct(productData, userEmail = 'edisonchung@flowsolution.net') {
    console.log('🚀 MCP Product Enhancement:', productData.partNumber);
    
    try {
      const response = await fetch(`${this.MCP_SERVER_URL}/api/enhance-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productData,
          userEmail,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'product_modal'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Enhancement failed: ${response.status}`);
      }

      const result = await response.json();
      
      // Convert to your ProductModal format
      return {
        found: result.success,
        source: 'MCP AI Enhancement',
        confidence: result.confidence_score || 0.8,
        productName: result.extractedData?.enhanced_name || productData.name,
        brand: result.extractedData?.detected_brand || productData.brand,
        category: result.extractedData?.detected_category || productData.category,
        description: result.extractedData?.enhanced_description || productData.description,
        specifications: result.extractedData?.specifications || {},
        mcpMetadata: result.metadata || {}
      };
      
    } catch (error) {
      console.error('❌ MCP Enhancement Error:', error);
      
      // Fallback to existing service
      return {
        found: false,
        source: 'Fallback Pattern Analysis',
        confidence: 0.4,
        error: error.message
      };
    }
  }
}
