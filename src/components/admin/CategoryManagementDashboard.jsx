// 🚀 Category Management Admin Dashboard
// File: src/components/admin/CategoryManagementDashboard.jsx

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Brain, TrendingUp, BarChart3, 
  Search, Filter, Download, Upload, RefreshCw, AlertTriangle
} from 'lucide-react';
import { 
  hierarchicalCategories, 
  categoryLearning, 
  getCategoryDisplay,
  findBestCategoryMatch
} from '../../utils/categoryManager';

const CategoryManagementDashboard = () => {
  const [categories, setCategories] = useState([]);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [learningData, setLearningData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'standard', parent: '' });
  
  // 📊 LOAD DASHBOARD DATA
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load categories from various sources
      await Promise.all([
        loadStandardCategories(),
        loadDynamicCategories(),
        loadAISuggestions(),
        loadLearningData()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStandardCategories = async () => {
    // In a real app, this would fetch from API
    const standardCats = [
      'electronics', 'hydraulics', 'pneumatics', 'automation', 'sensors',
      'cables', 'components', 'mechanical', 'bearings', 'gears', 'couplings',
      'drives', 'instrumentation', 'networking', 'diaphragm_pumps',
      'pumping_systems', 'fluid_handling', 'pumps', 'valves', 'safety', 'electrical'
    ].map(cat => ({
      id: cat,
      name: cat,
      type: 'standard',
      usage_count: Math.floor(Math.random() * 100) + 10,
      ai_suggested_count: Math.floor(Math.random() * 20),
      last_used: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
    }));
    
    setCategories(standardCats);
  };

  const loadDynamicCategories = async () => {
    // Load AI-generated categories
    const dynamicCats = [
      {
        id: 'variable_frequency_drives',
        name: 'Variable Frequency Drives',
        type: 'ai_generated',
        confidence: 92,
        usage_count: 15,
        ai_suggested_count: 25,
        created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'AI Enhancement System'
      },
      {
        id: 'industrial_ethernet_cables',
        name: 'Industrial Ethernet Cables',
        type: 'ai_generated', 
        confidence: 88,
        usage_count: 8,
        ai_suggested_count: 12,
        created_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'AI Enhancement System'
      }
    ];
    
    setDynamicCategories(dynamicCats);
  };

  const loadAISuggestions = async () => {
    // Load pending AI suggestions
    const suggestions = [
      {
        id: 1,
        suggested_category: 'Industrial Automation > Motor Starters',
        frequency: 8,
        confidence: 94,
        first_suggested: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        last_suggested: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        sample_products: ['3RW4024-1BB14', 'Motor Starter 24V', 'Siemens Soft Starter']
      },
      {
        id: 2,
        suggested_category: 'Safety Systems > Emergency Stop Buttons',
        frequency: 12,
        confidence: 96,
        first_suggested: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_suggested: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        sample_products: ['3SB3000-0AA21', 'Emergency Stop', 'Red Mushroom Button']
      }
    ];
    
    setAiSuggestions(suggestions);
  };

  const loadLearningData = async () => {
    // Load correction patterns
    const corrections = categoryLearning.corrections || [];
    const learningStats = corrections.map(correction => ({
      ...correction,
      pattern_strength: Math.random() * 100
    }));
    
    setLearningData(learningStats);
  };

  // 🎯 FILTER AND SEARCH
  const getFilteredCategories = () => {
    const allCategories = [
      ...categories.map(cat => ({ ...cat, source: 'standard' })),
      ...dynamicCategories.map(cat => ({ ...cat, source: 'dynamic' }))
    ];

    let filtered = allCategories;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(searchLower) ||
        cat.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(cat => cat.type === filterType);
    }

    return filtered.sort((a, b) => b.usage_count - a.usage_count);
  };

  // ✅ APPROVE AI SUGGESTION
  const approveAISuggestion = async (suggestion) => {
    try {
      const newCategory = {
        id: suggestion.suggested_category.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        name: suggestion.suggested_category,
        type: 'ai_approved',
        confidence: suggestion.confidence,
        usage_count: 0,
        ai_suggested_count: suggestion.frequency,
        created_date: new Date().toISOString(),
        created_by: 'AI System (Approved)'
      };

      setDynamicCategories(prev => [...prev, newCategory]);
      setAiSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
      
      console.log('✅ Approved AI suggestion:', newCategory);
    } catch (error) {
      console.error('Error approving AI suggestion:', error);
    }
  };

  // ❌ REJECT AI SUGGESTION
  const rejectAISuggestion = async (suggestionId) => {
    setAiSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  // ➕ ADD NEW CATEGORY
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;

    const categoryData = {
      id: newCategory.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      name: newCategory.name,
      type: newCategory.type,
      parent: newCategory.parent || null,
      usage_count: 0,
      ai_suggested_count: 0,
      created_date: new Date().toISOString(),
      created_by: 'Admin'
    };

    if (newCategory.type === 'standard') {
      setCategories(prev => [...prev, categoryData]);
    } else {
      setDynamicCategories(prev => [...prev, categoryData]);
    }

    setNewCategory({ name: '', type: 'standard', parent: '' });
    setShowAddForm(false);
  };

  // ✏️ EDIT CATEGORY
  const handleEditCategory = (category) => {
    setEditingCategory({ ...category });
  };

  const handleSaveEdit = async () => {
    if (!editingCategory.name.trim()) return;

    const updateFunction = editingCategory.source === 'standard' ? setCategories : setDynamicCategories;
    
    updateFunction(prev => prev.map(cat => 
      cat.id === editingCategory.id ? editingCategory : cat
    ));

    setEditingCategory(null);
  };

  // 🗑️ DELETE CATEGORY
  const handleDeleteCategory = async (category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) return;

    const updateFunction = category.source === 'standard' ? setCategories : setDynamicCategories;
    updateFunction(prev => prev.filter(cat => cat.id !== category.id));
  };

  // 📊 DASHBOARD STATS
  const getDashboardStats = () => {
    const totalCategories = categories.length + dynamicCategories.length;
    const aiGeneratedCount = dynamicCategories.filter(cat => cat.type === 'ai_generated').length;
    const pendingSuggestions = aiSuggestions.length;
    const totalUsage = [...categories, ...dynamicCategories].reduce((sum, cat) => sum + cat.usage_count, 0);

    return {
      totalCategories,
      aiGeneratedCount,
      pendingSuggestions,
      totalUsage,
      aiAdoptionRate: totalCategories > 0 ? Math.round((aiGeneratedCount / totalCategories) * 100) : 0
    };
  };

  const stats = getDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Loading category data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 📊 DASHBOARD HEADER */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Category Management</h1>
            <p className="text-gray-600 mt-1">Manage and monitor AI-powered category system</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadDashboardData}
              className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </div>
        </div>

        {/* 📈 STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Categories</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCategories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">AI Generated</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.aiGeneratedCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Pending Suggestions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingSuggestions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Usage</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsage}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              <div className="ml-3">
                <p className="text-sm text-gray-600">AI Adoption</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.aiAdoptionRate}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🧠 AI SUGGESTIONS SECTION */}
      {aiSuggestions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-purple-600" />
            Pending AI Suggestions
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {aiSuggestions.map((suggestion) => (
              <div key={suggestion.id} className="p-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{suggestion.suggested_category}</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {suggestion.confidence}% confidence
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Suggested {suggestion.frequency} times
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Sample products: {suggestion.sample_products.join(', ')}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        First suggested: {new Date(suggestion.first_suggested).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => approveAISuggestion(suggestion)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectAISuggestion(suggestion.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🔍 SEARCH AND FILTERS */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="ai_generated">AI Generated</option>
              <option value="ai_approved">AI Approved</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button className="flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <button className="flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </button>
          </div>
        </div>
      </div>

      {/* 📋 CATEGORIES TABLE */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Suggestions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredCategories().map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                        <div className="text-sm text-gray-500">{category.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      category.type === 'standard' ? 'bg-blue-100 text-blue-800' :
                      category.type === 'ai_generated' ? 'bg-purple-100 text-purple-800' :
                      category.type === 'ai_approved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {category.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.usage_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.ai_suggested_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {category.last_used ? new Date(category.last_used).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ➕ ADD CATEGORY MODAL */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add New Category</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter category name..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={newCategory.type}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT CATEGORY MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Edit Category</h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={editingCategory.type}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="ai_generated">AI Generated</option>
                  <option value="ai_approved">AI Approved</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagementDashboard;
