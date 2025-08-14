// 🎯 Smart Category Dropdown Component
// File: src/components/forms/SmartCategoryDropdown.jsx

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Lightbulb, Check, Plus, Brain, AlertCircle } from 'lucide-react';
import { 
  hierarchicalCategories, 
  findBestCategoryMatch, 
  generateDynamicCategory,
  getCategoryDisplay,
  categoryLearning
} from '../../utils/categoryManager';

/**
 * 🚀 SMART CATEGORY DROPDOWN
 * AI-powered category selection with hierarchical structure and learning
 */
const SmartCategoryDropdown = ({ 
  value, 
  onChange, 
  aiSuggestion = null,
  onAISuggestionApply = null,
  className = "",
  disabled = false,
  showAISuggestions = true,
  allowDynamicCategories = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(value);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [aiMatchResult, setAiMatchResult] = useState(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Base categories (flat structure for backward compatibility)
  const baseCategories = [
    'electronics', 'hydraulics', 'pneumatics', 'automation', 'sensors',
    'cables', 'components', 'mechanical', 'bearings', 'gears', 'couplings',
    'drives', 'instrumentation', 'networking', 'diaphragm_pumps',
    'pumping_systems', 'fluid_handling', 'pumps', 'valves', 'safety', 'electrical'
  ];

  // 🧠 AI SUGGESTION PROCESSING
  useEffect(() => {
    if (aiSuggestion && aiSuggestion !== selectedCategory) {
      // Check if AI suggestion matches existing categories
      const matchResult = findBestCategoryMatch(aiSuggestion, [...baseCategories, ...dynamicCategories.map(c => c.value)]);
      setAiMatchResult(matchResult);
      
      // If no good match found, suggest creating new category
      if (!matchResult && allowDynamicCategories) {
        const newCategory = generateDynamicCategory(aiSuggestion);
        if (newCategory && !dynamicCategories.find(c => c.value === newCategory.value)) {
          setDynamicCategories(prev => [...prev, newCategory]);
        }
      }
    }
  }, [aiSuggestion, selectedCategory]);

  // 🔍 SEARCH FILTERING
  const getFilteredCategories = () => {
    const allCategories = [...baseCategories, ...dynamicCategories.map(c => c.value)];
    
    if (!searchTerm) return allCategories;
    
    const searchLower = searchTerm.toLowerCase();
    return allCategories.filter(category => 
      category.toLowerCase().includes(searchLower) ||
      getCategoryDisplay(category).display.toLowerCase().includes(searchLower)
    );
  };

  // 📊 HIERARCHICAL CATEGORY DISPLAY
  const getHierarchicalOptions = () => {
    const options = [];
    
    // Add AI suggestion section
    if (aiSuggestion && showAISuggestions) {
      options.push({
        type: 'ai_section',
        title: '🧠 AI Suggestions',
        items: [{
          type: 'ai_suggestion',
          value: aiSuggestion,
          confidence: aiMatchResult?.confidence || 85,
          isMatched: !!aiMatchResult,
          matchedCategory: aiMatchResult?.category
        }]
      });
    }

    // Add hierarchical categories
    Object.entries(hierarchicalCategories).forEach(([mainCategory, data]) => {
      const matchingSubcategories = data.subcategories.filter(sub => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return sub.toLowerCase().includes(searchLower) || 
               mainCategory.toLowerCase().includes(searchLower);
      });

      if (matchingSubcategories.length > 0) {
        options.push({
          type: 'hierarchical_section',
          title: `${data.icon} ${mainCategory}`,
          items: matchingSubcategories.map(sub => ({
            type: 'hierarchical_item',
            value: sub.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            label: sub,
            category: mainCategory
          }))
        });
      }
    });

    // Add flat categories section
    const filteredBaseCategories = getFilteredCategories().filter(cat => 
      !dynamicCategories.find(dc => dc.value === cat)
    );
    
    if (filteredBaseCategories.length > 0) {
      options.push({
        type: 'flat_section',
        title: '📦 Standard Categories',
        items: filteredBaseCategories.map(cat => ({
          type: 'flat_item',
          value: cat,
          label: getCategoryDisplay(cat).display
        }))
      });
    }

    // Add dynamic categories
    if (dynamicCategories.length > 0) {
      const filteredDynamic = dynamicCategories.filter(cat => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return cat.value.toLowerCase().includes(searchLower) || 
               cat.label.toLowerCase().includes(searchLower);
      });

      if (filteredDynamic.length > 0) {
        options.push({
          type: 'dynamic_section',
          title: '✨ AI-Generated Categories',
          items: filteredDynamic.map(cat => ({
            type: 'dynamic_item',
            value: cat.value,
            label: cat.label,
            confidence: cat.confidence
          }))
        });
      }
    }

    return options;
  };

  // 🎯 CATEGORY SELECTION
  const handleCategorySelect = (categoryValue, categoryData = {}) => {
    setSelectedCategory(categoryValue);
    onChange(categoryValue);
    setIsOpen(false);
    setSearchTerm('');

    // Record learning data if this was a correction from AI
    if (aiSuggestion && aiSuggestion !== categoryValue) {
      categoryLearning.recordCorrection(aiSuggestion, categoryValue, categoryData);
    }

    console.log('📂 Category selected:', {
      selected: categoryValue,
      aiSuggestion,
      type: categoryData.type || 'standard'
    });
  };

  // 🤖 AI SUGGESTION APPLICATION
  const handleAISuggestionApply = () => {
    if (aiMatchResult) {
      handleCategorySelect(aiMatchResult.category, { type: 'ai_mapped', original: aiSuggestion });
    } else if (allowDynamicCategories) {
      const newCategory = generateDynamicCategory(aiSuggestion);
      if (newCategory) {
        handleCategorySelect(newCategory.value, { type: 'ai_generated', original: aiSuggestion });
      }
    }
    
    if (onAISuggestionApply) {
      onAISuggestionApply(aiSuggestion);
    }
  };

  // 📝 NEW CATEGORY CREATION
  const handleNewCategoryCreate = () => {
    if (newCategoryName.trim()) {
      const newCategory = generateDynamicCategory(newCategoryName.trim());
      if (newCategory) {
        setDynamicCategories(prev => [...prev, newCategory]);
        handleCategorySelect(newCategory.value, { type: 'user_created' });
        setNewCategoryName('');
        setShowNewCategoryForm(false);
      }
    }
  };

  // 🎨 CLICK OUTSIDE HANDLER
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowNewCategoryForm(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 🔍 AUTO-FOCUS SEARCH
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const currentDisplay = getCategoryDisplay(selectedCategory || '');

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* 🎯 MAIN DROPDOWN BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg
          flex items-center justify-between hover:border-gray-400 focus:border-blue-500
          focus:ring-2 focus:ring-blue-200 transition-all duration-200
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
        `}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm">
            {selectedCategory ? currentDisplay.display : 'Select category...'}
          </span>
          {aiSuggestion && aiSuggestion !== selectedCategory && (
            <div className="flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
              <Brain className="h-3 w-3 mr-1" />
              AI suggests: {aiSuggestion}
            </div>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 🚀 DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden">
          {/* 🔍 SEARCH BAR */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* 📋 SCROLLABLE CONTENT */}
          <div className="max-h-80 overflow-y-auto">
            {getHierarchicalOptions().map((section, sectionIndex) => (
              <div key={sectionIndex} className="border-b border-gray-100 last:border-b-0">
                {/* 📑 SECTION HEADER */}
                <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600 sticky top-0">
                  {section.title}
                </div>

                {/* 📝 SECTION ITEMS */}
                <div className="py-1">
                  {section.items.map((item, itemIndex) => (
                    <div key={itemIndex}>
                      {/* 🧠 AI SUGGESTION ITEM */}
                      {item.type === 'ai_suggestion' && (
                        <div className="px-3 py-2 bg-blue-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Lightbulb className="h-4 w-4 text-blue-500" />
                              <span className="text-sm text-blue-700 font-medium">{item.value}</span>
                              <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                                {item.confidence}% confidence
                              </span>
                              {item.isMatched && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                  → {item.matchedCategory}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={handleAISuggestionApply}
                              className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 📂 STANDARD CATEGORY ITEMS */}
                      {(item.type === 'hierarchical_item' || item.type === 'flat_item' || item.type === 'dynamic_item') && (
                        <button
                          onClick={() => handleCategorySelect(item.value, item)}
                          className={`
                            w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between
                            ${selectedCategory === item.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                          `}
                        >
                          <div className="flex items-center space-x-2">
                            <span>{item.label}</span>
                            {item.confidence && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                AI: {item.confidence}%
                              </span>
                            )}
                          </div>
                          {selectedCategory === item.value && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* ➕ CREATE NEW CATEGORY SECTION */}
            {allowDynamicCategories && (
              <div className="border-t border-gray-200 p-3">
                {!showNewCategoryForm ? (
                  <button
                    onClick={() => setShowNewCategoryForm(true)}
                    className="w-full flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 py-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create new category</span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleNewCategoryCreate()}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                      autoFocus
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleNewCategoryCreate}
                        className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Create
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCategoryForm(false);
                          setNewCategoryName('');
                        }}
                        className="flex-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ⚠️ NO RESULTS MESSAGE */}
            {searchTerm && getFilteredCategories().length === 0 && (
              <div className="p-4 text-center text-gray-500 text-sm">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No categories found matching "{searchTerm}"</p>
                {allowDynamicCategories && (
                  <button
                    onClick={() => {
                      setNewCategoryName(searchTerm);
                      setShowNewCategoryForm(true);
                    }}
                    className="mt-2 text-blue-600 hover:text-blue-800 text-xs"
                  >
                    Create "{searchTerm}" as new category
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCategoryDropdown;
