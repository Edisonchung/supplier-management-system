// src/components/mcp/PromptManagement.jsx - FIXED VERSION
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FileEdit, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Copy, 
  Play, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  Brain, 
  FileText, 
  Settings, 
  BarChart3,
  Loader,
  RefreshCw,
  Star,
  TrendingUp,
  Users,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PromptManagement = () => {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState([]);
  const [filteredPrompts, setFilteredPrompts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [mounted, setMounted] = useState(true);

  // API base URL
  const API_BASE = import.meta.env.VITE_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';

  // Memoize mock prompts to prevent recreating on every render
  const mockPrompts = useMemo(() => [
    {
      id: 'legacy_base_extraction',
      name: 'Base Legacy Template',
      description: 'Generic document extraction template with proven reliability',
      category: 'extraction',
      version: '1.3.0',
      isActive: true,
      usage: 45,
      accuracy: 92,
      lastUsed: '2025-01-08T10:30:00Z',
      createdBy: 'System',
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 2000,
      prompt: `Extract purchase order information with PRECISE table column identification.

CRITICAL TABLE PARSING RULES:
1. ALWAYS identify exact column order from table header
2. Common PO table patterns:
   - Line | Part Number | Description | Delivery Date | Quantity | UOM | Unit Price | Amount

3. QUANTITY vs UNIT PRICE identification:
   - Quantity: Usually smaller numbers (1-10,000 range)
   - Unit Price: Usually larger monetary values with decimals
   - Look for currency patterns: "100.00", "2,200.00"

Return structured JSON with purchase order details.`,
      suppliers: ['ALL'],
      documentTypes: ['purchase_order', 'general']
    },
    {
      id: 'mcp_advanced_extraction',
      name: 'Advanced MCP Extraction',
      description: 'Next-generation AI extraction with enhanced accuracy',
      category: 'extraction',
      version: '2.1.0',
      isActive: true,
      usage: 12,
      accuracy: 96,
      lastUsed: '2025-01-08T09:15:00Z',
      createdBy: 'AI System',
      aiProvider: 'deepseek',
      temperature: 0.05,
      maxTokens: 2500,
      prompt: `Enhanced document extraction using advanced AI reasoning.

INTELLIGENT PARSING APPROACH:
1. Context-aware field identification
2. Multi-language support
3. Fuzzy matching for variations
4. Confidence scoring for each field
5. Auto-correction of common errors

Apply sophisticated analysis to extract maximum information with highest accuracy.`,
      suppliers: ['ALL'],
      documentTypes: ['purchase_order', 'proforma_invoice', 'quote']
    },
    {
      id: 'ptp_specialized',
      name: 'PTP Specialized Template',
      description: 'Optimized for PT. PERINTIS TEKNOLOGI PERDANA documents',
      category: 'supplier_specific',
      version: '1.1.0',
      isActive: true,
      usage: 8,
      accuracy: 98,
      lastUsed: '2025-01-08T08:45:00Z',
      createdBy: 'Edison Chung',
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 1800,
      prompt: `Extract PTP-specific purchase order format.

PTP FORMAT RULES:
1. Multi-line product format: Part number on first line, description on second line
2. Never use UOM values (PCS, UNI, SET) as product names
3. Look for THRUSTER, RUBBER HOSE type descriptions below part numbers
4. Format: Line | Part Number | Quantity | UOM | Price

Extract with PTP-specific understanding.`,
      suppliers: ['PTP', 'PERINTIS TEKNOLOGI PERDANA'],
      documentTypes: ['purchase_order']
    },
    {
      id: 'chinese_supplier_pi',
      name: 'Chinese Supplier PI Template',
      description: 'Specialized for Chinese supplier proforma invoices',
      category: 'supplier_specific',
      version: '1.2.0',
      isActive: true,
      usage: 15,
      accuracy: 94,
      lastUsed: '2025-01-08T07:20:00Z',
      createdBy: 'AI System',
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 2200,
      prompt: `Extract Chinese supplier proforma invoice information.

CHINESE PI SPECIFIC RULES:
1. Table format: Sr NO | ITEMS NAME | MODEL | BRAND | QUANTITY | UNIT PRICE | TOTAL PRICE
2. Extract ALL items, not just first one
3. Items format: BEARING 32222 SKF 100 $13.00 $1,300.00
4. Currency is USD with $ symbol
5. Look for SHIPPER and RECEIVER sections

Handle Chinese supplier formatting conventions.`,
      suppliers: ['Chinese Suppliers'],
      documentTypes: ['proforma_invoice']
    },
    {
      id: 'analytics_template',
      name: 'Supplier Analytics Template',
      description: 'AI template for supplier performance analysis',
      category: 'analytics',
      version: '1.0.0',
      isActive: false,
      usage: 3,
      accuracy: 89,
      lastUsed: '2025-01-07T16:30:00Z',
      createdBy: 'Data Team',
      aiProvider: 'anthropic',
      temperature: 0.2,
      maxTokens: 3000,
      prompt: `Analyze supplier performance data and provide insights.

ANALYSIS FRAMEWORK:
1. On-time delivery metrics
2. Quality assessment scores
3. Price competitiveness analysis
4. Communication effectiveness
5. Risk factors identification

Provide actionable recommendations for supplier relationships.`,
      suppliers: ['ALL'],
      documentTypes: ['analysis_report']
    }
  ], []);

  // Load prompts from API
    const loadPrompts = useCallback(async () => {
    if (!mounted) return;
    
    setIsLoading(true);
    try {
      console.log('🔄 Loading prompts from:', `${API_BASE}/api/ai/prompts`);  // Add logging
      const response = await fetch(`${API_BASE}/api/ai/prompts`);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Raw API response:', data);  // Add logging
        
        // FIX: Handle the correct API response format
        const promptList = data.data || data.prompts || [];  // ✅ FIXED LINE
        
        if (mounted) {
          setPrompts(promptList);
          setFilteredPrompts(promptList);
          console.log('✅ Loaded prompts:', promptList.length);
          console.log('📝 Prompt names:', promptList.map(p => p.name));  // Add logging
        }
      } else {
        throw new Error(`API returned status ${response.status}`);  // Better error
      }
    } catch (error) {
      console.warn('❌ API error, using mock data:', error);  // Better logging
      if (mounted) {
        setPrompts(mockPrompts);
        setFilteredPrompts(mockPrompts);
        console.log('✅ Using mock prompts:', mockPrompts.length);
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, [API_BASE, mockPrompts, mounted]);

  // Filter prompts
  useEffect(() => {
    if (!mounted) return;
    
    let filtered = prompts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(prompt => 
        prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        prompt.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(prompt => prompt.category === selectedCategory);
    }

    setFilteredPrompts(filtered);
  }, [prompts, searchTerm, selectedCategory, mounted]);

  // Initialize
  useEffect(() => {
    if (!mounted) return;
    loadPrompts();
  }, [loadPrompts, mounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  // Get categories for filter
  const getCategories = useCallback(() => {
    const categories = [...new Set(prompts.map(p => p.category))];
    return categories.sort();
  }, [prompts]);

  // Save/Update prompt
  const savePrompt = useCallback(async (promptData) => {
    if (!mounted) return;
    
    setIsLoading(true);
    try {
      const method = promptData.id ? 'PUT' : 'POST';
      const url = promptData.id 
        ? `${API_BASE}/api/ai/prompts/${promptData.id}`
        : `${API_BASE}/api/ai/prompts`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...promptData,
          createdBy: user?.email || 'Unknown User',
          lastModified: new Date().toISOString()
        })
      });

      if (response.ok) {
        await loadPrompts(); // Reload prompts
        console.log('✅ Prompt saved successfully');
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.warn('Save failed, updating local data:', error);
      // Update local state for demo
      if (mounted) {
        if (promptData.id) {
          setPrompts(prev => prev.map(p => p.id === promptData.id ? promptData : p));
        } else {
          const newPrompt = { ...promptData, id: `custom_${Date.now()}` };
          setPrompts(prev => [...prev, newPrompt]);
        }
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, [API_BASE, user?.email, loadPrompts, mounted]);

  // Delete prompt
  const deletePrompt = useCallback(async (promptId) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    if (!mounted) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ai/prompts/${promptId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadPrompts();
        console.log('✅ Prompt deleted successfully');
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.warn('Delete failed, updating local data:', error);
      if (mounted) {
        setPrompts(prev => prev.filter(p => p.id !== promptId));
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, [API_BASE, loadPrompts, mounted]);

  // Test prompt
  const testPrompt = useCallback(async (prompt, input) => {
    if (!mounted) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/ai/prompts/${prompt.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testData: input })
      });

      if (response.ok) {
        const result = await response.json();
        if (mounted) {
          setTestResult(result);
        }
      } else {
        throw new Error('Test failed');
      }
    } catch (error) {
      console.warn('Test failed, using mock result:', error);
      if (mounted) {
        setTestResult({
          success: true,
          confidence: Math.random() * 0.3 + 0.7,
          result: { message: 'Mock test result - prompt would process this input successfully' },
          processingTime: Math.random() * 2000 + 1000
        });
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }
  }, [API_BASE, mounted]);

  // Prevent rendering if not mounted
  if (!mounted) {
    return null;
  }

  // Render prompt card
  const renderPromptCard = (prompt) => (
    <div key={prompt.id} className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
            {prompt.isActive && (
              <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                Active
              </span>
            )}
            {prompt.accuracy >= 95 && (
              <Star className="w-4 h-4 text-yellow-500 ml-2" />
            )}
          </div>
          <p className="text-sm text-gray-600 mb-3">{prompt.description}</p>
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center">
              <BarChart3 className="w-3 h-3 mr-1" />
              {prompt.accuracy}% accuracy
            </span>
            <span className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              {prompt.usage} uses
            </span>
            <span className="flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              v{prompt.version}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedPrompt(prompt)}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPrompt(prompt);
              setIsTestModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-green-600 transition-colors"
            title="Test Prompt"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setSelectedPrompt({ ...prompt });
              setIsCreateModalOpen(true);
            }}
            className="p-2 text-gray-500 hover:text-orange-600 transition-colors"
            title="Edit Prompt"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => deletePrompt(prompt.id)}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="Delete Prompt"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            prompt.category === 'extraction' ? 'bg-blue-100 text-blue-700' :
            prompt.category === 'supplier_specific' ? 'bg-purple-100 text-purple-700' :
            prompt.category === 'analytics' ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {prompt.category.replace('_', ' ')}
          </span>
          <span className="text-xs text-gray-500">
            by {prompt.createdBy}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          {new Date(prompt.lastUsed).toLocaleDateString()}
        </div>
      </div>
    </div>
  );

  // Create/Edit Modal Component
  const CreateEditModal = () => {
    const [formData, setFormData] = useState(selectedPrompt || {
      name: '',
      description: '',
      category: 'extraction',
      aiProvider: 'deepseek',
      temperature: 0.1,
      maxTokens: 2000,
      prompt: '',
      suppliers: ['ALL'],
      documentTypes: ['purchase_order'],
      isActive: true
    });

    const handleSave = async () => {
      await savePrompt(formData);
      setIsCreateModalOpen(false);
      setSelectedPrompt(null);
    };

    if (!isCreateModalOpen) return null;

    const isEdit = selectedPrompt?.id;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold">
              {isEdit ? 'Edit Prompt' : 'Create New Prompt'}
            </h3>
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setSelectedPrompt(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter prompt name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Describe what this prompt does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="purchase_order">Purchase Order</option>
                  <option value="proforma_invoice">Proforma Invoice</option>
                  <option value="bank_payment">Bank Payment</option> {/* 🆕 NEW */}
                  <option value="extraction">Extraction</option>
                  <option value="supplier_specific">Supplier Specific</option>
                  <option value="analytics">Analytics</option>
                  <option value="classification">Classification</option>
                  <option value="general">General</option>
                  
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Provider
                </label>
                <select
                  value={formData.aiProvider}
                  onChange={(e) => setFormData(prev => ({ ...prev, aiProvider: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google AI</option>
                </select>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature ({formData.temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Focused</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Tokens
                </label>
                <input
                  type="number"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min="100"
                  max="4000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Prompt Content */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prompt Content
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              rows="12"
              placeholder="Enter your prompt instructions here..."
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setSelectedPrompt(null);
              }}
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
            >
              {isLoading ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEdit ? 'Update' : 'Create'} Prompt
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <FileEdit className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold">Prompt Management</h1>
              <p className="text-gray-600">Create and manage AI prompts for document extraction</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPrompts}
              disabled={isLoading}
              className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setSelectedPrompt(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Prompt
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search prompts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                {getCategories().map(category => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Prompts Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading prompts...</span>
          </div>
        ) : filteredPrompts.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow-sm border text-center">
            <FileEdit className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No prompts found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first prompt template.'}
            </p>
            <button
              onClick={() => {
                setSelectedPrompt(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create First Prompt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPrompts.map(renderPromptCard)}
          </div>
        )}

        {/* Create/Edit Modal */}
        <CreateEditModal />

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Prompts</p>
                <p className="text-2xl font-bold text-blue-600">{prompts.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Prompts</p>
                <p className="text-2xl font-bold text-green-600">
                  {prompts.filter(p => p.isActive).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Accuracy</p>
                <p className="text-2xl font-bold text-purple-600">
                  {prompts.length > 0 ? Math.round(prompts.reduce((sum, p) => sum + p.accuracy, 0) / prompts.length) : 0}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold text-orange-600">
                  {prompts.reduce((sum, p) => sum + p.usage, 0)}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptManagement;
