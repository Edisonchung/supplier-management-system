// src/services/MCPProductEnhancementService.js
// ✅ FIXED: Added missing checkMCPStatus function

export class MCPProductEnhancementService {
  static MCP_SERVER_URL = 'https://supplier-mcp-server-production.up.railway.app';
  
  // ✅ MAIN: Product enhancement function (working correctly)
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
        source: result.metadata?.extraction_method === 'mcp_product_enhancement' 
          ? 'MCP TRUE AI Enhancement' 
          : 'MCP AI Enhancement',
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

  // ✅ FIX: Add missing checkMCPStatus function
  static async checkMCPStatus(userEmail = 'edisonchung@flowsolution.net') {
    try {
      const response = await fetch(`${this.MCP_SERVER_URL}/api/product-enhancement-status?userEmail=${encodeURIComponent(userEmail)}`);
      
      if (!response.ok) {
        throw new Error(`Status check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        status: result.status || 'available',
        currentSystem: result.current_system || 'pattern_fallback',
        selectedPrompt: result.selected_prompt || null,
        availablePrompts: result.available_prompts || 0,
        capabilities: result.capabilities || [],
        supportedManufacturers: result.supported_manufacturers || []
      };
      
    } catch (error) {
      console.warn('⚠️ MCP Status Check Failed:', error);
      
      // Return fallback status
      return {
        status: 'fallback',
        currentSystem: 'pattern_analysis',
        reason: error.message
      };
    }
  }

  // ✅ BONUS: Add health check function
  static async healthCheck() {
    try {
      const response = await fetch(`${this.MCP_SERVER_URL}/api/health`);
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        status: 'healthy',
        services: result.services || {},
        version: result.version || 'unknown',
        timestamp: result.timestamp
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
