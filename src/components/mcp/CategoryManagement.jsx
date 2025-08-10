// 🎨 Frontend Category Management UI Implementation
// File: src/components/mcp/CategoryManagement.jsx

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, FolderPlus, Tag, 
  AlertCircle, CheckCircle, Eye, BarChart3, Move,
  Palette, Type, FileText, Settings
} from 'lucide-react';

const CategoryManagement = ({ onCategoryChange, showNotification }) => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Load categories
  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const cats = await response.json();
        setCategories(cats);
        onCategoryChange?.(cats);
      } else {
        throw new Error('Failed to load categories');
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      showNotification?.('Failed to load categories', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create category
  const createCategory = async (categoryData) => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryData,
          userEmail: 'edisonchung@flowsolution.net' // Your user email
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification?.(result.message, 'success');
        await loadCategories();
        setIsCreateModalOpen(false);
        setSelectedCategory(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      showNotification?.(error.message, 'error');
    }
  };

  // Update category
  const updateCategory = async (id, categoryData) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryData,
          userEmail: 'edisonchung@flowsolution.net'
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification?.(result.message, 'success');
        await loadCategories();
        setIsCreateModalOpen(false);
        setSelectedCategory(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Failed to update category:', error);
      showNotification?.(error.message, 'error');
    }
  };

  // Delete category
  const deleteCategory = async (id, movePromptsTo = null) => {
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: 'edisonchung@flowsolution.net',
          movePromptsTo
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification?.(result.message, 'success');
        await loadCategories();
        setIsDeleteModalOpen(false);
        setDeleteTarget(null);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
      showNotification?.(error.message, 'error');
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Category Card Component
  const CategoryCard = ({ category }) => {
    const isSystemCategory = category.isSystem;
    
    return (
      <div className="bg-white rounded-lg border shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            <div>
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                {category.name}
                {isSystemCategory && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    System
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{category.description}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSelectedCategory(category);
                setIsCreateModalOpen(true);
              }}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit Category"
            >
              <Edit className="w-4 h-4" />
            </button>
            
            {!isSystemCategory && (
              <button
                onClick={() => {
                  setDeleteTarget(category);
                  setIsDeleteModalOpen(true);
                }}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            {category.promptCount || 0} prompts
          </span>
          <span className="text-xs">
            Updated {new Date(category.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    );
  };

  // Create/Edit Modal
  const CreateEditModal = () => {
    const [formData, setFormData] = useState(
      selectedCategory || {
        name: '',
        description: '',
        color: '#8B5CF6',
        icon: 'folder'
      }
    );

    const isEdit = selectedCategory?.id;
    const isSystemCategory = selectedCategory?.isSystem;

    const handleSave = async () => {
      if (!formData.name.trim()) {
        showNotification?.('Category name is required', 'error');
        return;
      }

      if (isEdit) {
        await updateCategory(selectedCategory.id, formData);
      } else {
        await createCategory(formData);
      }
    };

    const predefinedColors = [
      '#3B82F6', // Blue
      '#8B5CF6', // Purple  
      '#059669', // Green
      '#DC2626', // Red
      '#EA580C', // Orange
      '#7C2D12', // Brown
      '#6B7280', // Gray
      '#BE185D', // Pink
    ];

    if (!isCreateModalOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              {isEdit ? 'Edit Category' : 'Create New Category'}
            </h3>
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setSelectedCategory(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Category Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Product Enhancement"
                disabled={isSystemCategory}
              />
              {isSystemCategory && (
                <p className="text-xs text-gray-500 mt-1">
                  System category names cannot be changed
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 h-20"
                placeholder="Describe what this category is for..."
              />
            </div>

            {/* Color Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Color
              </label>
              <div className="flex items-center gap-2 mb-2">
                {predefinedColors.map(color => (
                  <button
                    key={color}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-300 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
              <div className="flex items-center gap-2 p-2 bg-white rounded border">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: formData.color }}
                />
                <span className="font-medium">{formData.name || 'Category Name'}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setSelectedCategory(null);
              }}
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isEdit ? 'Update' : 'Create'} Category
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Delete Confirmation Modal
  const DeleteModal = () => {
    const [moveToCategory, setMoveToCategory] = useState('');
    
    if (!isDeleteModalOpen || !deleteTarget) return null;

    const availableCategories = categories.filter(cat => 
      cat.id !== deleteTarget.id && cat.isActive
    );

    const handleDelete = () => {
      deleteCategory(deleteTarget.id, moveToCategory || null);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-xl font-semibold">Delete Category</h3>
          </div>

          <p className="text-gray-600 mb-4">
            Are you sure you want to delete the "{deleteTarget.name}" category?
          </p>

          {deleteTarget.promptCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm font-medium mb-2">
                ⚠️ This category contains {deleteTarget.promptCount} prompts
              </p>
              <label className="block text-sm font-medium text-yellow-900 mb-1">
                Move prompts to:
              </label>
              <select
                value={moveToCategory}
                onChange={(e) => setMoveToCategory(e.target.value)}
                className="w-full border border-yellow-300 rounded px-3 py-2 text-sm"
                required
              >
                <option value="">Select a category...</option>
                {availableCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteTarget(null);
                setMoveToCategory('');
              }}
              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteTarget.promptCount > 0 && !moveToCategory}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete Category
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Category Management</h2>
            <p className="text-gray-600 text-sm">Organize your prompts with custom categories</p>
          </div>
        </div>
        
        <button
          onClick={() => {
            setSelectedCategory(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading categories...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(category => (
            <CategoryCard key={category.id} category={category} />
          ))}
          
          {categories.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FolderPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600 mb-4">Create your first category to organize your prompts</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create First Category
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateEditModal />
      <DeleteModal />
    </div>
  );
};

export default CategoryManagement;
