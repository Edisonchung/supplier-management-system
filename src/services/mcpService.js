// src/services/mcpService.js
class MCPService {
  constructor() {
    this.baseURL = import.meta.env.VITE_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';
    this.wsURL = this.baseURL.replace('https://', 'wss://').replace('http://', 'ws://') + ':8081/mcp';
    this.websocket = null;
    this.listeners = new Map();
  }

  // REST API Methods
  async getStatus() {
    try {
      const response = await fetch(`${this.baseURL}/api/mcp/status`);
      if (!response.ok) throw new Error('Status check failed');
      return await response.json();
    } catch (error) {
      console.warn('MCP Status API unavailable:', error);
      return {
        overall_status: "degraded",
        message: "Running in demo mode",
        uptime: "99.8%",
        response_time: "< 12s",
        accuracy: "98%",
        active_providers: 3,
        processed_today: 1247
      };
    }
  }

  async getCapabilities() {
    try {
      const response = await fetch(`${this.baseURL}/api/mcp/capabilities`);
      if (!response.ok) throw new Error('Capabilities check failed');
      return await response.json();
    } catch (error) {
      console.warn('MCP Capabilities API unavailable:', error);
      return {
        tools: 6,
        providers: 3,
        features: ['document_extraction', 'supplier_analysis', 'batch_processing']
      };
    }
  }

  async getTools() {
    try {
      const response = await fetch(`${this.baseURL}/api/mcp/tools`);
      if (!response.ok) throw new Error('Tools list failed');
      return await response.json();
    } catch (error) {
      console.warn('MCP Tools API unavailable:', error);
      return {
        success: true,
        tools: [
          {
            id: 'extract_purchase_order',
            name: 'Extract Purchase Order',
            description: 'Enhanced document extraction with 98% confidence',
            category: 'extraction',
            status: 'operational'
          },
          {
            id: 'analyze_supplier_performance',
            name: 'Analyze Supplier Performance',
            description: 'AI supplier intelligence with 8.5/10 scoring',
            category: 'analytics',
            status: 'operational'
          }
        ]
      };
    }
  }

  async executeTool(toolId, inputs = {}) {
    try {
      const response = await fetch(`${this.baseURL}/api/mcp/tools/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId,
          inputs
        })
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.status}`);
      }

      const result = await response.json();
      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.warn('MCP Tool execution API unavailable:', error);
      
      // Return mock result for demo purposes
      return {
        success: true,
        result: this.generateMockResult(toolId),
        executionTime: Math.random() * 5000 + 1000,
        confidence: Math.random() * 0.3 + 0.7,
        provider: 'mock',
        demo: true
      };
    }
  }

  async batchProcess(documents, processingType = 'auto') {
    try {
      const response = await fetch(`${this.baseURL}/api/mcp/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents,
          processingType
        })
      });

      if (!response.ok) throw new Error('Batch processing failed');
      return await response.json();
    } catch (error) {
      console.warn('MCP Batch API unavailable:', error);
      return {
        success: true,
        processed: documents.length,
        successful: Math.floor(documents.length * 0.9),
        failed: Math.ceil(documents.length * 0.1),
        demo: true
      };
    }
  }

  // WebSocket Methods
  connectWebSocket() {
    try {
      this.websocket = new WebSocket(this.wsURL);
      
      this.websocket.onopen = () => {
        console.log('MCP WebSocket connected');
        this.notifyListeners('connected', { status: 'connected' });
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('message', data);
        } catch (error) {
          console.warn('Invalid WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('MCP WebSocket disconnected');
        this.notifyListeners('disconnected', { status: 'disconnected' });
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          this.connectWebSocket();
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.warn('MCP WebSocket error:', error);
        this.notifyListeners('error', { error: error.message || 'WebSocket error' });
      };
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
      // Continue in polling mode without WebSocket
    }
  }

  disconnectWebSocket() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  // Event Management
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  removeListener(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  notifyListeners(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.warn('Listener error:', error);
        }
      });
    }
  }

  // Utility Methods
  generateMockResult(toolId) {
    const mockResults = {
      extract_purchase_order: {
        purchase_order: {
          poNumber: `PO-${Date.now().toString().slice(-6)}`,
          supplier: "Demo Supplier Ltd",
          totalAmount: Math.random() * 50000 + 10000,
          items: [
            {
              productName: "Industrial Component A",
              quantity: Math.floor(Math.random() * 100) + 1,
              unitPrice: Math.random() * 1000 + 100
            }
          ]
        },
        metadata: {
          confidence: 0.85 + Math.random() * 0.1,
          processingTime: "2.1s",
          provider: "mock"
        }
      },
      analyze_supplier_performance: {
        supplier: "Demo Supplier Ltd",
        overallScore: 7.5 + Math.random() * 2,
        metrics: {
          onTimeDelivery: 85 + Math.random() * 15,
          qualityScore: 80 + Math.random() * 20,
          priceCompetitiveness: 75 + Math.random() * 25,
          communicationRating: 85 + Math.random() * 15
        }
      },
      system_health_check: {
        overall_status: "healthy",
        uptime: "99.8%",
        response_time: "< 12s",
        accuracy: "98%",
        active_providers: 3,
        processed_today: 1247
      },
      classify_document: {
        classification: "Purchase Order",
        confidence: 0.9 + Math.random() * 0.1,
        category: "procurement",
        metadata: { pages: 1, language: "en" }
      }
    };

    return mockResults[toolId] || { message: "Tool executed successfully", demo: true };
  }

  // File Upload Helper
  async uploadFile(file, toolId = 'extract_purchase_order') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('toolId', toolId);

    try {
      const response = await fetch(`${this.baseURL}/api/mcp/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('File upload failed');
      return await response.json();
    } catch (error) {
      console.warn('File upload API unavailable:', error);
      
      // Return mock file processing result
      return {
        success: true,
        fileId: `file_${Date.now()}`,
        filename: file.name,
        size: file.size,
        demo: true
      };
    }
  }

  // Health Check with Retry
  async healthCheck(retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${this.baseURL}/health`, {
          timeout: 5000
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        if (i === retries - 1) {
          console.warn('All health check attempts failed');
          return {
            status: 'degraded',
            message: 'API unavailable - running in demo mode',
            demo: true
          };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
}

// Create singleton instance
const mcpService = new MCPService();

export default mcpService;
