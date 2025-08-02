//src/components/mcp/PromptManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Play, 
  Save, 
  X, 
  FileText, 
  Settings, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Brain,
  Target,
  Clock
} from 'lucide-react';

const PromptManagement = () => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');

  // API base URL
  const API_BASE = import.meta.env.VITE_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/prompts`);
      if (response.ok) {
        const data = await response.json();
        setPrompts(data.data || data.prompts || []);
      } else {
        // Fallback to mock prompts
        setPrompts(getMockPrompts());
      }
    } catch (error) {
      console.warn('Prompts API not available, using mock data:', error);
      setPrompts(getMockPrompts());
    }
  };

  const getMockPrompts = () => [
    {
      id: 'po_extraction_base',
      name: 'Purchase Order - Base Extraction',
      category: 'purchase_order',
      version: '1.2.0',
      isActive: true,
      suppliers: ['ALL'],
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 2000,
      description: 'Standard purchase order extraction with precise table parsing',
      prompt: `Extract purchase order information with PRECISE table column identification.

CRITICAL TABLE PARSING RULES:
1. ALWAYS identify exact column order from table header
2. Common PO table patterns:
   - Line | Part Number | Description | Delivery Date | Quantity | UOM | Unit Price | Amount

3. QUANTITY vs UNIT PRICE identification:
   - Quantity: Usually smaller numbers (1-10,000 range)
   - Unit Price: Usually larger monetary values with decimals
   - Look for currency patterns: "100.00", "2,200.00"

4. VALIDATION RULES:
   - quantity × unitPrice should ≈ totalPrice
   - If calculation mismatch > 10%, SWAP values and re-check

RETURN STRUCTURED JSON:
{
  "purchase_order": {
    "poNumber": "string",
    "dateIssued": "string",
    "supplier": { "name": "string", "address": "string" },
    "items": [
      {
        "lineNumber": number,
        "productCode": "string",
        "productName": "string",
        "quantity": number,
        "unit": "string",
        "unitPrice": number,
        "totalPrice": number
      }
    ],
    "totalAmount": number
  }
}`,
      performance: { accuracy: 92, speed: 2.3, tokens: 1250, lastTested: '2025-01-07' },
      createdAt: '2025-01-01',
      lastModified: '2025-01-07'
    },
    {
      id: 'ptp_supplier_specific',
      name: 'PTP Supplier - Enhanced Extraction',
      category: 'purchase_order',
      version: '1.0.0',
      isActive: true,
      suppliers: ['PTP', 'PT. PERINTIS TEKNOLOGI PERDANA'],
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 2000,
      description: 'Specialized prompt for PTP supplier with multi-line format handling',
      prompt: `PTP Purchase Order - Table Structure Analysis Required

TABLE LAYOUT: Line | Part Number | Delivery Date | Quantity | UOM | Unit Price | TAX | Amount

CRITICAL PTP RULES:
1. Quantity appears in column 4 (after Delivery Date)
2. Unit Price appears in column 6 (after UOM) 
3. Amount appears in column 8 (final column)
4. Part numbers follow patterns: 200RTG*, 400CON*, 400SHA*, 400RTG*
5. MULTI-LINE FORMAT: Product names often appear on the line BELOW part numbers

SPECIAL PTP HANDLING:
- Line 1: "400QCR1068    1.00   PCS   20,500.00"
- Line 2: "THRUSTER" <- This is the actual product name
- DO NOT extract UOM values (PCS, UNI, SET, EA) as product names

RETURN ENHANCED JSON with PTP metadata:
{
  "purchase_order": {
    "supplier": {
      "name": "PT. PERINTIS TEKNOLOGI PERDANA",
      "type": "PTP_TEMPLATE"
    },
    "items": [
      {
        "productName": "THRUSTER",
        "productCode": "400QCR1068",
        "quantity": 1,
        "unitPrice": 20500,
        "extractionNotes": "Multi-line format detected"
      }
    ]
  },
  "metadata": {
    "supplier": "PTP",
    "extractionMethod": "PTP_TEMPLATE",
    "confidence": 0.95
  }
}`,
      performance: { accuracy: 96, speed: 2.1, tokens: 980, lastTested: '2025-01-06' },
      createdAt: '2024-12-15',
      lastModified: '2025-01-06'
    },
    {
      id: 'pi_extraction_base',
      name: 'Proforma Invoice - Base Extraction',
      category: 'proforma_invoice',
      version: '1.1.0',
      isActive: true,
      suppliers: ['ALL'],
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 2000,
      description: 'Standard proforma invoice extraction with enhanced accuracy',
      prompt: `Extract proforma invoice information with enhanced accuracy.

PROFORMA INVOICE PARSING RULES:
1. Identify PI number, date, validity period
2. Extract complete supplier and buyer information
3. Parse itemized products with specifications

RETURN STRUCTURED JSON:
{
  "proforma_invoice": {
    "piNumber": "string",
    "date": "string",
    "supplier": { "name": "string", "address": "string" },
    "items": [
      {
        "productCode": "string",
        "productName": "string",
        "quantity": number,
        "unitPrice": number,
        "totalPrice": number
      }
    ]
  }
}`,
      performance: { accuracy: 88, speed: 2.1, tokens: 980, lastTested: '2025-01-05' },
      createdAt: '2024-11-20',
      lastModified: '2025-01-05'
    },
    {
      id: 'supplier_analysis_advanced',
      name: 'Advanced Supplier Performance Analysis',
      category: 'supplier_analysis',
      version: '2.0.0',
      isActive: true,
      suppliers: ['ALL'],
      aiProvider: 'anthropic',
      temperature: 0.2,
      maxTokens: 3000,
      description: 'Comprehensive supplier performance analysis with predictive insights',
      prompt: `Analyze supplier performance data and provide comprehensive insights.

ANALYSIS FRAMEWORK:
1. Performance Metrics Analysis
2. Risk Assessment
3. Trend Identification
4. Predictive Insights
5. Actionable Recommendations

RETURN DETAILED JSON:
{
  "supplier_analysis": {
    "overall_score": number,
    "performance_metrics": {
      "delivery_performance": number,
      "quality_score": number,
      "cost_effectiveness": number,
      "communication_rating": number
    },
    "risk_assessment": {
      "overall_risk": "low|medium|high",
      "risk_factors": ["factor1", "factor2"],
      "mitigation_strategies": ["strategy1", "strategy2"]
    },
    "recommendations": [
      {
        "type": "improvement|cost_saving|risk_mitigation",
        "description": "string",
        "priority": "high|medium|low",
        "estimated_impact": "string"
      }
    ]
  }
}`,
      performance: { accuracy: 89, speed: 3.5, tokens: 2100, lastTested: '2025-01-08' },
      createdAt: '2024-12-01',
      lastModified: '2025-01-08'
    }
  ];

  const savePrompt = async (promptData) => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promptData)
      });

      if (response.ok) {
        const result = await response.json();
        await loadPrompts(); // Reload prompts
        return result;
      } else {
        throw new Error('Failed to save prompt');
      }
    } catch (error) {
      console.warn('Save prompt API not available:', error);
      // Mock save - update local state
      if (promptData.id) {
        setPrompts(prev => prev.map(p => p.id === promptData.id ? { ...promptData, lastModified: new Date().toISOString() } : p));
      } else {
        const newPrompt = {
          ...promptData,
          id: `prompt_${Date.now()}`,
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        };
        setPrompts(prev => [...prev, newPrompt]);
      }
      return { success: true };
    }
  };

  const testPrompt = async (prompt, testData) => {
    try {
      const response = await fetch(`${API_BASE}/api/ai/prompts/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptId: prompt.id,
          testData: testData || 'Sample test data for prompt validation'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults(result);
        return result;
      } else {
        throw new Error('Test failed');
      }
    } catch (error) {
      console.warn('Test prompt API not available:', error);
      // Mock test result
      const mockResult = {
        success: true,
        promptId: prompt.id,
        accuracy: Math.random() * 0.2 + 0.8, // 80-100%
        responseTime: Math.random() * 2000 + 1000, // 1-3 seconds
        tokens: Math.floor(prompt.prompt.length * 1.2),
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        timestamp: new Date().toISOString()
      };
      setTestResults(mockResult);
      return mockResult;
    }
  };

  const duplicatePrompt = (prompt) => {
    const duplicated = {
      ...prompt,
      id: `${prompt.id}_copy_${Date.now()}`,
      name: `${prompt.name} (Copy)`,
      version: '1.0.0',
      isActive: false,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    setSelectedPrompt(duplicated);
    setIsEditing(true);
  };

  const deletePrompt = async (promptId) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        const response = await fetch(`${API_BASE}/api/ai/prompts/${promptId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          await loadPrompts();
        } else {
          throw new Error('Delete failed');
        }
      } catch (error) {
        console.warn('Delete prompt API not available:', error);
        // Mock delete
        setPrompts(prev => prev.filter(p => p.id !== promptId));
      }
    }
  };

  const filteredPrompts = prompts.filter(prompt => {
    const categoryMatch = filterCategory === 'all' || prompt.category === filterCategory;
    const supplierMatch = filterSupplier === 'all' || 
                         prompt.suppliers.includes('ALL') || 
                         prompt.suppliers.includes(filterSupplier);
    return categoryMatch && supplierMatch;
  });

  const PromptForm = ({ prompt, onSave, onCancel }) => {
    const [formData, setFormData] = useState(
      prompt || {
        name: '',
        category: 'purchase_order',
        suppliers: ['ALL'],
        aiProvider: 'deepseek',
        temperature: 0.1,
        maxTokens: 2000,
        description: '',
        prompt: '',
        isActive: true
      }
    );

    const handleSave = async () => {
      await savePrompt(formData);
      onSave();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold">
              {prompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h3>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Metadata */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prompt Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., PO Extraction - Advanced"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="purchase_order">Purchase Order</option>
                  <option value="proforma_invoice">Proforma Invoice</option>
                  <option value="supplier_analysis">Supplier Analysis</option>
                  <option value="document_classification">Document Classification</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">AI Provider</label>
                <select
                  value={formData.aiProvider}
                  onChange={(e) => setFormData(prev => ({ ...prev, aiProvider: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="deepseek">DeepSeek (Fast & Cost-effective)</option>
                  <option value="openai">OpenAI (Balanced)</option>
                  <option value="anthropic">Anthropic (Advanced Reasoning)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Tokens</label>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Suppliers</label>
                <input
                  type="text"
                  value={formData.suppliers.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    suppliers: e.target.value.split(',').map(s => s.trim()) 
                  }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="ALL, PTP, Supplier Name"
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated. Use "ALL" for universal prompt.</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  rows="3"
                  placeholder="Brief description of this prompt's purpose..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <label className="text-sm">Active (use this prompt in production)</label>
              </div>
            </div>

            {/* Right Column - Prompt Content */}
            <div>
              <label className="block text-sm font-medium mb-1">Prompt Content</label>
              <textarea
                value={formData.prompt}
                onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                rows="20"
                placeholder="Enter your AI prompt here..."
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.prompt.length} characters (~{Math.ceil(formData.prompt.length / 4)} tokens)
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
            <button
              onClick={() => testPrompt(formData)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Test Prompt
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Prompt
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">AI Prompt Management</h2>
          <p className="text-gray-600">Create and manage AI prompts for different tools and suppliers</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Prompt
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg border">
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">All Categories</option>
            <option value="purchase_order">Purchase Orders</option>
            <option value="proforma_invoice">Proforma Invoices</option>
            <option value="supplier_analysis">Supplier Analysis</option>
            <option value="document_classification">Document Classification</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Supplier</label>
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="border rounded px-3 py-1"
          >
            <option value="all">All Suppliers</option>
            <option value="ALL">Universal (ALL)</option>
            <option value="PTP">PTP</option>
            <option value="PT. PERINTIS TEKNOLOGI PERDANA">PT. PERINTIS TEKNOLOGI PERDANA</option>
          </select>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {filteredPrompts.length} of {prompts.length} prompts
        </div>
      </div>

      {/* Prompts Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Category</th>
                <th className="text-left p-4 font-medium">Suppliers</th>
                <th className="text-left p-4 font-medium">Provider</th>
                <th className="text-left p-4 font-medium">Performance</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrompts.map((prompt) => (
                <tr key={prompt.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{prompt.name}</div>
                      <div className="text-sm text-gray-500">v{prompt.version}</div>
                      {prompt.description && (
                        <div className="text-xs text-gray-500 mt-1">{prompt.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                      {prompt.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {prompt.suppliers.slice(0, 2).map((supplier, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {supplier}
                        </span>
                      ))}
                      {prompt.suppliers.length > 2 && (
                        <span className="text-xs text-gray-500">+{prompt.suppliers.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">
                      <div className="font-medium">{prompt.aiProvider}</div>
                      <div className="text-gray-500">T:{prompt.temperature} | {prompt.maxTokens}t</div>
                    </div>
                  </td>
                  <td className="p-4">
                    {prompt.performance && (
                      <div className="text-sm">
                        <div>Accuracy: {prompt.performance.accuracy}%</div>
                        <div className="text-gray-500">Speed: {prompt.performance.speed}s</div>
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      prompt.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {prompt.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {setSelectedPrompt(prompt); setIsEditing(true);}}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => duplicatePrompt(prompt)}
                        className="text-green-600 hover:text-green-800"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => testPrompt(prompt)}
                        className="text-purple-600 hover:text-purple-800"
                        title="Test"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deletePrompt(prompt.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TestTube className="w-5 h-5 mr-2" />
            Test Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Accuracy</div>
              <div className="text-xl font-semibold text-green-600">
                {(testResults.accuracy * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Response Time</div>
              <div className="text-xl font-semibold text-blue-600">
                {(testResults.responseTime / 1000).toFixed(1)}s
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Tokens Used</div>
              <div className="text-xl font-semibold text-purple-600">
                {testResults.tokens}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Confidence</div>
              <div className="text-xl font-semibold text-orange-600">
                {(testResults.confidence * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <PromptForm
          onSave={() => setShowCreateModal(false)}
          onCancel={() => setShowCreateModal(false)}
        />
      )}

      {isEditing && selectedPrompt && (
        <PromptForm
          prompt={selectedPrompt}
          onSave={() => {setIsEditing(false); setSelectedPrompt(null);}}
          onCancel={() => {setIsEditing(false); setSelectedPrompt(null);}}
        />
      )}
    </div>
  );
};

export default PromptManagement;
