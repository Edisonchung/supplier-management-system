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
