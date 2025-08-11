// src/components/products/ProductModal.jsx - FIXED: Dropdown Enhancement + Visible Update Button
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Package, DollarSign, Layers, Tag, Hash, Image, FileText, Info, Clock, 
  AlertCircle, Save, Sparkles, Check, RefreshCw, Loader2, Wand2, Brain,
  ExternalLink, TrendingUp, CheckCircle, AlertTriangle, Zap, Target, History,
  ChevronDown, Settings
} from 'lucide-react';
import { DocumentManager } from '../documents/DocumentManager';
// ✅ SIMPLIFIED: Only import utilities from ProductEnrichmentService
import { ProductEnrichmentService } from '../../services/ProductEnrichmentService';
import { createAILearningHook } from '../../services/AILearningService';

// ✅ PRIMARY: Import MCP Product Enhancement Service (main enhancement method)
import { MCPProductEnhancementService } from '../../services/MCPProductEnhancementService';

// ✅ NEW: MCP Server URL constant
const MCP_SERVER_URL = process.env.REACT_APP_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';

// ================================================================
// FIXED PRODUCT MODAL COMPONENT WITH DROPDOWN ENHANCEMENT
// ================================================================
const ProductModal = ({ 
  product, 
  suppliers, 
  onSave, 
  onClose, 
  initialTab = 'basic', 
  showNotification,
  partNumber = '',
  basicDescription = '',
  aiService, // Optional AI service for advanced enrichment
  userEmail = 'edisonchung@flowsolution.net' // ✅ NEW: User email for MCP targeting
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    supplierId: '',
    category: 'electronics',
    price: '',
    status: 'pending',
    description: '',
    // ✅ ENHANCED: Separate identifier fields
    sku: '',
    partNumber: partNumber || '',
    manufacturerCode: '',
    clientItemCode: '',
    alternativePartNumbers: [],
    // ✅ NEW: AI enhancement fields
    detectedSpecs: {},
    aiEnriched: false,
    confidence: 0,
    lastEnhanced: null,
    enhancementHistory: [],
    source: 'manual',
    // ✅ NEW: MCP enhancement fields
    mcpEnhanced: false,
    mcpMetadata: null,
    enhancementSource: null,
    // Existing fields
    stock: 0,
    minStock: 5,
    photo: '',
    catalog: '',
    notes: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ✅ ENHANCED: AI enhancement state with MCP support
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [isEnriching, setIsEnriching] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState(null);
  const [isWebSearching, setIsWebSearching] = useState(false);
  
  // ✅ NEW: MCP system state
  const [mcpStatus, setMcpStatus] = useState(null);
  const [mcpResults, setMcpResults] = useState(null);
  const [isMcpEnhancing, setIsMcpEnhancing] = useState(false);
  const [enhancementMethod, setEnhancementMethod] = useState('auto'); // 'auto', 'mcp', 'legacy'

  // ✅ NEW: Prompt selector state
  const [availablePrompts, setAvailablePrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [promptHistory, setPromptHistory] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  // ✅ NEW: Dropdown state
  const [showEnhancementDropdown, setShowEnhancementDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const aiLearning = createAILearningHook();

  // Enhanced tab configuration
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: Info },
    { 
      id: 'ai', 
      label: 'AI Enhancement', 
      icon: Brain, 
      badge: (aiSuggestions || mcpResults) ? '!' : null 
    },
    { id: 'identifiers', label: 'Identifiers', icon: Tag },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'history', label: 'History', icon: Clock }
  ];

  // ✅ NEW: Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEnhancementDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ NEW: Enhancement options configuration
  const enhancementOptions = [
    {
      id: 'ai_primary',
      label: 'AI Enhancement',
      description: 'Full AI analysis with DeepSeek + smart prompt selection',
      icon: Brain,
      action: enhanceWithMCP,
      isPrimary: true,
      confidence: 'High (85-95%)',
      time: '20-30s',
      available: mcpStatus?.status === 'available'
    },
    {
      id: 'pattern_quick',
      label: 'Quick Pattern Analysis',
      description: 'Fast pattern-based enhancement for immediate results',
      icon: Zap,
      action: enhanceWithPattern,
      isPrimary: false,
      confidence: 'Medium (60-85%)',
      time: '1-2s',
      available: true
    },
    {
      id: 'siemens_specialist',
      label: 'Force Siemens Specialist',
      description: 'Use Siemens-specific AI prompt (for 6XV, 6ES, 3SE series)',
      icon: Target,
      action: () => enhanceWithSpecificPrompt('product-enhancement-siemens-specialist'),
      isPrimary: false,
      confidence: 'Very High (90-98%)',
      time: '25-35s',
      available: mcpStatus?.status === 'available' && formData.partNumber?.match(/^(6XV|6ES|3SE)/i)
    },
    {
      id: 'brand_detection',
      label: 'Force Brand Detection',
      description: 'Use general brand detection AI prompt for unknown parts',
      icon: Settings,
      action: () => enhanceWithSpecificPrompt('product-enhancement-brand-detection'),
      isPrimary: false,
      confidence: 'High (80-90%)',
      time: '20-30s',
      available: mcpStatus?.status === 'available'
    }
  ];

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        brand: product.brand || '',
        supplierId: product.supplierId || '',
        category: product.category || 'electronics',
        price: product.price || '',
        status: product.status || 'pending',
        description: product.description || '',
        // ✅ ENHANCED: Load new fields
        sku: product.sku || '',
        partNumber: product.partNumber || '',
        manufacturerCode: product.manufacturerCode || '',
        clientItemCode: product.clientItemCode || '',
        alternativePartNumbers: product.alternativePartNumbers || [],
        detectedSpecs: product.detectedSpecs || {},
        aiEnriched: product.aiEnriched || false,
        confidence: product.confidence || 0,
        lastEnhanced: product.lastEnhanced || null,
        enhancementHistory: product.enhancementHistory || [],
        source: product.source || 'manual',
        // ✅ NEW: MCP fields
        mcpEnhanced: product.mcpEnhanced || false,
        mcpMetadata: product.mcpMetadata || null,
        enhancementSource: product.enhancementSource || null,
        // Existing fields
        stock: product.stock || 0,
        minStock: product.minStock || 5,
        photo: product.photo || '',
        catalog: product.catalog || '',
        notes: product.notes || ''
      });
    } else {
      // Reset form for new product
      setFormData({
        name: '',
        brand: '',
        supplierId: '',
        category: 'electronics',
        price: '',
        status: 'pending',
        description: basicDescription || '',
        // ✅ ENHANCED: Initialize new fields
        sku: '',
        partNumber: partNumber || '',
        manufacturerCode: '',
        clientItemCode: '',
        alternativePartNumbers: [],
        detectedSpecs: {},
        aiEnriched: false,
        confidence: 0,
        lastEnhanced: null,
        enhancementHistory: [],
        source: 'manual',
        // ✅ NEW: MCP fields
        mcpEnhanced: false,
        mcpMetadata: null,
        enhancementSource: null,
        // Existing fields
        stock: 0,
        minStock: 5,
        photo: '',
        catalog: '',
        notes: ''
      });
    }
    setErrors({});
    setActiveTab(initialTab);
    setAiSuggestions(null);
    setMcpResults(null);
    setAppliedSuggestions(new Set());
    setWebSearchResults(null);
  }, [product, initialTab, partNumber, basicDescription]);

  // ✅ NEW: Check MCP system status and load prompts on component mount
  useEffect(() => {
    checkMCPSystemStatus();
    loadAvailablePrompts();
  }, [userEmail]);

  // ✅ NEW: Auto-trigger enhancement for new products with part numbers
  useEffect(() => {
    if (!product && formData.partNumber && formData.partNumber.length > 3 && !aiSuggestions && !mcpResults) {
      enrichProductData();
    }
  }, [formData.partNumber, product, aiSuggestions, mcpResults]);

  // ✅ NEW: Check MCP system status
  const checkMCPSystemStatus = async () => {
    try {
      const status = await MCPProductEnhancementService.checkMCPStatus(userEmail);
      setMcpStatus(status);
      console.log('🟢 MCP System Status:', status);
    } catch (error) {
      console.warn('⚠️ MCP Status Check Failed:', error);
      setMcpStatus({ status: 'error', reason: error.message });
    }
  };

  // ✅ NEW: Load available prompts with enhanced metadata
  const loadAvailablePrompts = async () => {
    try {
      const response = await fetch(`${MCP_SERVER_URL}/api/product-enhancement-status?userEmail=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      console.log('📝 Prompt Status Response:', data);
      
      if (data.available_prompts_list) {
        setAvailablePrompts(data.available_prompts_list);
        
        // Set smart default based on part number
        const smartDefault = getSmartDefaultPrompt(formData.partNumber, data.available_prompts_list);
        setSelectedPromptId(smartDefault?.id);
      } else if (data.selected_prompt) {
        // Fallback: create list from selected prompt
        const promptList = [{
          id: data.selected_prompt.id,
          name: data.selected_prompt.name,
          aiProvider: data.selected_prompt.ai_provider || 'deepseek',
          specialized_for: data.selected_prompt.specialized_for || 'General enhancement',
          confidence_avg: 0.9,
          usage_count: 1,
          recommended_for: ['general']
        }];
        setAvailablePrompts(promptList);
        setSelectedPromptId(data.selected_prompt.id);
      }
    } catch (error) {
      console.error('Failed to load available prompts:', error);
      // Create a fallback prompt option
      setAvailablePrompts([{
        id: 'fallback-basic',
        name: 'Basic Pattern Analysis',
        aiProvider: 'pattern',
        specialized_for: 'Basic enhancement using patterns',
        confidence_avg: 0.7,
        usage_count: 0,
        recommended_for: ['fallback']
      }]);
      setSelectedPromptId('fallback-basic');
    }
  };

  // ✅ NEW: Smart default prompt selection
  const getSmartDefaultPrompt = (partNumber, prompts) => {
    if (!partNumber || !prompts) return prompts[0];
    
    const upperPartNumber = partNumber.toUpperCase();
    
    // Siemens parts
    if (upperPartNumber.match(/^(6XV|6ES|3SE)/)) {
      return prompts.find(p => p.name.toLowerCase().includes('siemens')) || prompts[0];
    }
    
    // SKF bearings
    if (upperPartNumber.match(/^(NJ|NU|6\d{3}|32\d{3})/)) {
      return prompts.find(p => p.name.toLowerCase().includes('skf')) || prompts[0];
    }
    
    // ABB drives
    if (upperPartNumber.match(/^ACS\d{3}/)) {
      return prompts.find(p => p.name.toLowerCase().includes('abb')) || prompts[0];
    }
    
    // Default to brand detection prompt
    return prompts.find(p => p.name.toLowerCase().includes('brand detection')) || prompts[0];
  };

  // ✅ NEW: Quick pattern enhancement function
  const enhanceWithPattern = async () => {
    if (!formData.partNumber) {
      showNotification?.('Please enter a part number first', 'warning');
      return;
    }
    
    setIsEnriching(true);
    setShowEnhancementDropdown(false);
    
    try {
      console.log('⚡ Quick Pattern Enhancement...');
      
      // Call pattern fallback function
      const enhancedData = await enhanceProductDataFallback({
        partNumber: formData.partNumber,
        name: formData.name,
        brand: formData.brand,
        description: formData.description,
        category: formData.category
      });
      
      setAiSuggestions({
        ...enhancedData,
        source: 'Quick Pattern Analysis',
        mcpEnhanced: false,
        patternEnhanced: true
      });
      
      setActiveTab('ai');
      setShowAIPanel(true);
      
      showNotification?.(
        `Quick analysis complete with ${Math.round(enhancedData.confidence * 100)}% confidence`, 
        'success'
      );
      
    } catch (error) {
      console.error('Pattern enhancement failed:', error);
      showNotification?.('Quick enhancement failed', 'error');
    } finally {
      setIsEnriching(false);
    }
  };

  // ✅ NEW: Specific prompt enhancement
  const enhanceWithSpecificPrompt = async (promptId) => {
    if (!formData.partNumber) {
      showNotification?.('Please enter a part number first', 'warning');
      return;
    }
    
    setIsEnriching(true);
    setIsMcpEnhancing(true);
    setShowEnhancementDropdown(false);
    
    try {
      console.log(`🎯 Forcing specific prompt: ${promptId}`);
      
      const enhancementData = {
        partNumber: formData.partNumber,
        name: formData.name,
        brand: formData.brand,
        description: formData.description,
        category: formData.category,
        forcedPromptId: promptId // Force specific prompt
      };

      const mcpResult = await MCPProductEnhancementService.enhanceProduct(enhancementData, userEmail);

      if (mcpResult.found) {
        const suggestions = {
          productName: mcpResult.productName,
          brand: mcpResult.brand,
          category: mcpResult.category,
          description: mcpResult.description,
          specifications: mcpResult.specifications || {},
          confidence: mcpResult.confidence,
          mcpEnhanced: true,
          mcpMetadata: mcpResult.mcpMetadata,
          source: `${mcpResult.source} (Forced Prompt)`,
          forcedPrompt: true
        };
        
        setAiSuggestions(suggestions);
        setMcpResults(mcpResult);
        setActiveTab('ai');
        setShowAIPanel(true);
        
        const promptName = availablePrompts.find(p => p.id === promptId)?.name || 'Unknown Prompt';
        showNotification?.(
          `Enhancement complete with ${promptName} (${Math.round(mcpResult.confidence * 100)}% confidence)`, 
          'success'
        );
      }
      
    } catch (error) {
      console.error('Specific prompt enhancement failed:', error);
      showNotification?.('Enhancement failed', 'error');
    } finally {
      setIsEnriching(false);
      setIsMcpEnhancing(false);
    }
  };

  // ✅ NEW: Prompt re-run functionality
  const rerunWithDifferentPrompt = async (promptId) => {
    if (!promptId || isRerunning) return;
    
    setIsRerunning(true);
    
    try {
      const response = await fetch(`${MCP_SERVER_URL}/api/enhance-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productData: {
            partNumber: formData.partNumber,
            name: formData.name,
            brand: formData.brand,
            description: formData.description,
            category: formData.category
          },
          userEmail: userEmail,
          forcedPromptId: promptId,
          metadata: {
            rerun: true,
            originalPrompt: aiSuggestions?.mcpMetadata?.prompt_id,
            userSelected: true,
            timestamp: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Save current result to history for comparison
        if (aiSuggestions?.mcpEnhanced) {
          setPromptHistory(prev => [...prev, {
            promptId: aiSuggestions.mcpMetadata?.prompt_id,
            promptName: aiSuggestions.mcpMetadata?.prompt_used,
            result: aiSuggestions,
            timestamp: new Date().toISOString()
          }]);
        }
        
        // Apply new results
        setAiSuggestions({
          ...result.extractedData,
          mcpMetadata: result.metadata,
          mcpEnhanced: true,
          source: 'MCP AI Enhancement (User Selected)',
          userSelectedPrompt: true
        });
        
        setSelectedPromptId(promptId);
        
        showNotification?.(
          `Enhancement complete with ${result.metadata.prompt_used} (${Math.round(result.confidence_score * 100)}% confidence)`, 
          'success'
        );
      }
    } catch (error) {
      console.error('Failed to rerun with different prompt:', error);
      showNotification?.('Failed to rerun enhancement', 'error');
    } finally {
      setIsRerunning(false);
    }
  };

  // ✅ SIMPLIFIED: Master enhancement function - MCP primary, minimal fallback
  const enrichProductData = async (forceMethod = null) => {
    if (!formData.partNumber) {
      showNotification?.('Please enter a part number first', 'warning');
      return;
    }
    
    setIsEnriching(true);
    setIsMcpEnhancing(forceMethod === 'mcp' || enhancementMethod === 'mcp');
    
    try {
      let suggestions = null;
      let usedMethod = 'basic_fallback';
      
      // ✅ PRIMARY: Try MCP enhancement first (95% of use cases)
      if (forceMethod !== 'legacy') {
        try {
          console.log('🚀 Attempting MCP Product Enhancement (Primary Method)...');
          
          const enhancementData = {
            partNumber: formData.partNumber,
            name: formData.name,
            brand: formData.brand,
            description: formData.description,
            category: formData.category
          };

          // Use selected prompt if available
          if (selectedPromptId && selectedPromptId !== 'fallback-basic') {
            enhancementData.forcedPromptId = selectedPromptId;
          }

          const mcpResult = await MCPProductEnhancementService.enhanceProduct(enhancementData, userEmail);

          console.log('✅ MCP Enhancement Result:', mcpResult);
          
          if (mcpResult.found && mcpResult.confidence > 0.5) {
            suggestions = {
              productName: mcpResult.productName,
              brand: mcpResult.brand,
              category: mcpResult.category,
              description: mcpResult.description,
              specifications: mcpResult.specifications || {},
              confidence: mcpResult.confidence,
              mcpEnhanced: true,
              mcpMetadata: mcpResult.mcpMetadata,
              source: mcpResult.source || 'MCP AI Enhancement'
            };
            
            setMcpResults(mcpResult);
            usedMethod = 'mcp';
            
            showNotification?.(
              `MCP enhancement complete: ${Math.round(mcpResult.confidence * 100)}% confidence`, 
              'success'
            );
          } else {
            console.log('⚠️ MCP enhancement failed or low confidence, using basic fallback');
            throw new Error('MCP enhancement unsuccessful');
          }
          
        } catch (mcpError) {
          console.warn('MCP enhancement failed, using basic fallback:', mcpError);
          // Fall through to basic fallback
        }
      }
      
      // ✅ SIMPLIFIED: Basic fallback only (emergency use - 5% of cases)
      if (!suggestions) {
        console.log('🔄 Using basic fallback enhancement...');
        const enhancedData = await enhanceProductDataFallback(formData);
        suggestions = {
          ...enhancedData,
          source: 'Basic Pattern Fallback',
          mcpEnhanced: false
        };
        usedMethod = 'basic_fallback';
      }
      
      setAiSuggestions(suggestions);
      setShowAIPanel(true);
      
      // Auto-apply high-confidence suggestions for new products
      if (!product && suggestions.confidence > 0.8) {
        const autoApplyFields = ['brand', 'category'];
        autoApplyFields.forEach(field => {
          if (suggestions[field] && !formData[field]) {
            applySuggestion(field, suggestions[field]);
          }
        });
      }
      
      // Switch to AI tab to show suggestions
      setActiveTab('ai');
      
      // Record successful enhancement
      aiLearning.recordSuccess(suggestions, usedMethod === 'mcp');
      
      const methodLabels = {
        mcp: 'MCP AI',
        basic_fallback: 'Basic Pattern Analysis'
      };
      
      showNotification?.(
        `${methodLabels[usedMethod]} analysis complete with ${Math.round(suggestions.confidence * 100)}% confidence`, 
        suggestions.confidence > 0.7 ? 'success' : 'info'
      );
      
    } catch (error) {
      console.error('Failed to enrich product:', error);
      showNotification?.('Failed to enhance product data', 'error');
    } finally {
      setIsEnriching(false);
      setIsMcpEnhancing(false);
    }
  };

  // ✅ NEW: Force MCP enhancement
  const enhanceWithMCP = async () => {
    await enrichProductData('mcp');
  };

  // ✅ ENHANCED: Enhanced pattern fallback function
  const enhanceProductDataFallback = async (productData) => {
    const partNumber = productData.partNumber || '';
    
    console.log(`🔍 Pattern analysis for part number: ${partNumber}`);
    
    // Simple brand detection (only most common patterns)
    let detectedBrand = null;
    const partUpper = partNumber.toUpperCase();
    
    if (partUpper.match(/^6(XV|ES|EP|AV)/)) detectedBrand = 'Siemens';
    else if (partUpper.match(/^(NJ|NU|6\d{3}|32\d{3})/)) detectedBrand = 'SKF';
    else if (partUpper.match(/^ACS\d{3}/)) detectedBrand = 'ABB';
    else if (partUpper.match(/^(TM|LC1)/)) detectedBrand = 'Schneider Electric';
    else if (partUpper.match(/^(E3|CP1|MY)/)) detectedBrand = 'Omron';
    
    // Simple category detection
    let detectedCategory = productData.category || 'components';
    if (partUpper.match(/^6XV/)) detectedCategory = 'networking';
    else if (partUpper.match(/^6ES/)) detectedCategory = 'automation';
    else if (partUpper.match(/^(NJ|NU|6\d{3})/)) detectedCategory = 'bearings';
    else if (partUpper.match(/^ACS/)) detectedCategory = 'drives';
    
    return {
      productName: detectedBrand ? 
        `${detectedBrand} ${detectedCategory.charAt(0).toUpperCase() + detectedCategory.slice(1)} Component ${partNumber}` :
        productData.name || `Industrial Component ${partNumber}`,
      brand: detectedBrand,
      category: detectedCategory,
      description: detectedBrand ? 
        `${detectedBrand} industrial ${detectedCategory} component. Part number: ${partNumber}. Professional-grade equipment for industrial applications.` :
        `Industrial component with part number ${partNumber}. Manufacturer to be verified.`,
      specifications: detectedBrand ? {
        manufacturer: detectedBrand,
        category: detectedCategory,
        part_number: partNumber
      } : {},
      confidence: detectedBrand ? 0.6 : 0.3
    };
  };

  // ✅ Keep all your existing functions (unchanged)
  const applySuggestion = (field, value) => {
    const fieldMapping = {
      productName: 'name',
      category: 'category',
      brand: 'brand',
      description: 'description'
    };
    
    const formField = fieldMapping[field] || field;
    setFormData(prev => ({
      ...prev,
      [formField]: value
    }));
    
    setAppliedSuggestions(prev => new Set([...prev, field]));
    
    // Clear any validation errors for the updated field
    if (errors[formField]) {
      setErrors(prev => ({ ...prev, [formField]: '' }));
    }
  };

  const handleUserCorrection = (field, originalValue, newValue) => {
    if (aiSuggestions && originalValue !== newValue) {
      aiLearning.recordCorrection(
        { [field]: originalValue, confidence: aiSuggestions.confidence },
        { [field]: newValue },
        {
          partNumber: formData.partNumber,
          description: formData.description,
          source: 'manual_correction'
        }
      );
      showNotification?.('Thanks! This correction will improve future AI suggestions.', 'info');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    }
    
    if (!formData.supplierId) {
      newErrors.supplierId = 'Supplier is required';
    }
    
    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required';
    }
    
    if (!formData.partNumber.trim()) {
      newErrors.partNumber = 'Part number is required';
    } else {
      const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
      if (!validation.isValid) {
        newErrors.partNumber = validation.error;
      }
    }
    
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    if (formData.minStock < 0) {
      newErrors.minStock = 'Minimum stock cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setActiveTab('basic');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let normalizedPartNumber = formData.partNumber;
      if (formData.partNumber) {
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
        if (validation.isValid) {
          normalizedPartNumber = validation.normalized;
        }
      }

      let sku = formData.sku;
      if (!sku && formData.partNumber) {
        sku = ProductEnrichmentService.generateInternalSKU({
          category: formData.category,
          brand: formData.brand,
          partNumber: normalizedPartNumber
        });
      }

      const enhancementHistory = [...(formData.enhancementHistory || [])];
      if (aiSuggestions || mcpResults) {
        enhancementHistory.push({
          timestamp: new Date().toISOString(),
          confidence: mcpResults?.confidence || aiSuggestions?.confidence || 0,
          appliedFields: Array.from(appliedSuggestions),
          webEnhanced: !!aiSuggestions?.webEnhanced,
          mcpEnhanced: !!mcpResults,
          enhancementSource: mcpResults?.source || aiSuggestions?.source || 'unknown',
          mcpMetadata: mcpResults?.mcpMetadata,
          selectedPromptId: selectedPromptId,
          userSelectedPrompt: !!aiSuggestions?.userSelectedPrompt
        });
      }

      const productData = {
        ...formData,
        partNumber: normalizedPartNumber,
        sku: sku,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        aiEnriched: (aiSuggestions || mcpResults) ? true : formData.aiEnriched,
        mcpEnhanced: mcpResults ? true : formData.mcpEnhanced,
        confidence: mcpResults?.confidence || aiSuggestions?.confidence || formData.confidence,
        lastEnhanced: (aiSuggestions || mcpResults) ? new Date().toISOString() : formData.lastEnhanced,
        enhancementHistory: enhancementHistory,
        enhancementSource: mcpResults?.source || aiSuggestions?.source || formData.enhancementSource,
        detectedSpecs: mcpResults?.specifications || aiSuggestions?.specifications || formData.detectedSpecs,
        mcpMetadata: mcpResults?.mcpMetadata || formData.mcpMetadata,
        webEnhanced: !!aiSuggestions?.webEnhanced,
        selectedPromptId: selectedPromptId,
        updatedAt: new Date().toISOString(),
        dateAdded: product?.dateAdded || new Date().toISOString()
      };

      if (product?.id) {
        productData.id = product.id;
      }

      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined || productData[key] === null) {
          delete productData[key];
        }
      });

      await onSave(productData);
      
      if (showNotification) {
        const enhancementText = productData.mcpEnhanced ? ' with MCP AI enhancement' : 
                              productData.aiEnriched ? ' with AI enhancement' : '';
        showNotification(
          `Product ${product?.id ? 'updated' : 'created'} successfully${enhancementText}`, 
          'success'
        );
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
      if (showNotification) {
        showNotification('Error saving product', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    if (aiSuggestions && ['brand', 'category', 'name', 'description'].includes(field)) {
      const originalValue = aiSuggestions[field === 'name' ? 'productName' : field];
      if (originalValue && originalValue !== value) {
        handleUserCorrection(field, originalValue, value);
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDocumentSave = async (updatedProduct) => {
    try {
      await onSave(updatedProduct);
      if (showNotification) {
        showNotification('Product documents updated successfully', 'success');
      }
    } catch (error) {
      console.error('Error updating product documents:', error);
      if (showNotification) {
        showNotification('Error updating documents', 'error');
      }
    }
  };

  const categories = [
    'electronics', 'hydraulics', 'pneumatics', 'automation', 'sensors', 'cables',
    'components', 'mechanical', 'bearings', 'gears', 'couplings', 'drives',
    'instrumentation', 'networking', 'diaphragm_pumps', 'pumping_systems',
    'fluid_handling', 'pumps', 'valves', 'safety', 'electrical'
  ];

  // ✅ ENHANCED: Suggestion component
  const SuggestionField = ({ label, field, suggestion, current }) => {
    const isApplied = appliedSuggestions.has(field);
    const isDifferent = suggestion && suggestion !== current;
    
    if (!suggestion || !isDifferent) return null;
    
    return (
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex-1">
          <div className="font-medium text-blue-900 text-sm">{label}</div>
          <div className="text-blue-700 text-sm">{suggestion}</div>
          {current && (
            <div className="text-xs text-gray-500 mt-1">Current: {current}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => applySuggestion(field, suggestion)}
          disabled={isApplied}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isApplied 
              ? 'bg-green-100 text-green-800 cursor-not-allowed flex items-center gap-1' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isApplied ? (
            <>
              <Check size={12} />
              Applied
            </>
          ) : (
            'Apply'
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
        
        {/* ✅ FIXED: Header with Enhancement Dropdown */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Package className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-semibold">
                  {product ? 'Edit Product' : 'Add New Product'}
                </h2>
                {/* ✅ MCP Status Indicator */}
                <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      mcpStatus?.status === 'available' ? 'bg-green-400' : 'bg-yellow-400'
                    }`}></div>
                    <span>
                      {mcpStatus?.status === 'available' ? 'MCP Ready' : 'Basic Mode'}
                    </span>
                  </div>
                  {availablePrompts.length > 0 && (
                    <span>{availablePrompts.length} Prompts Available</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* ✅ FIXED: Enhancement Dropdown + Close Button */}
            <div className="flex items-center gap-3">
              {/* ✅ DROPDOWN: Smart Enhancement Options */}
              {formData.partNumber && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowEnhancementDropdown(!showEnhancementDropdown)}
                    disabled={isEnriching || !formData.partNumber}
                    className="bg-white/20 hover:bg-white/30 disabled:opacity-50 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium min-w-[140px]"
                  >
                    {isEnriching ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Enhancing...</span>
                      </>
                    ) : (
                      <>
                        <Brain size={16} />
                        <span>AI Enhance</span>
                        <ChevronDown size={14} className={`transition-transform ${
                          showEnhancementDropdown ? 'rotate-180' : ''
                        }`} />
                      </>
                    )}
                  </button>

                  {/* ✅ DROPDOWN MENU: Enhancement Options */}
                  {showEnhancementDropdown && (
                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-900">Enhancement Options</h4>
                        <p className="text-xs text-gray-500 mt-1">Choose the best method for your product</p>
                      </div>
                      
                      {enhancementOptions.map((option) => {
                        const Icon = option.icon;
                        const isAvailable = option.available;
                        
                        return (
                          <button
                            key={option.id}
                            onClick={() => isAvailable ? option.action() : null}
                            disabled={!isAvailable || isEnriching}
                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                              option.isPrimary ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Icon size={18} className={`mt-0.5 ${
                                option.isPrimary ? 'text-blue-600' : 'text-gray-600'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${
                                    option.isPrimary ? 'text-blue-900' : 'text-gray-900'
                                  }`}>
                                    {option.label}
                                  </span>
                                  {option.isPrimary && (
                                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                      Recommended
                                    </span>
                                  )}
                                  {!isAvailable && (
                                    <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                                      Unavailable
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {option.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                  <span>⚡ {option.time}</span>
                                  <span>🎯 {option.confidence}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      
                      <div className="px-4 py-2 border-t border-gray-100 mt-2">
                        <p className="text-xs text-gray-500">
                          💡 Tip: Start with AI Enhancement for best results, use Quick Pattern for speed
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ CLOSE BUTTON */}
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* ✅ EXISTING: Tab Navigation (unchanged) */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6">
            {tabs.map(tab => {
              const hasErrors = tab.id === 'basic' && Object.keys(errors).length > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors relative ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {hasErrors && (
                    <AlertCircle size={14} className="text-red-500" />
                  )}
                  {tab.badge && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ✅ EXISTING: Tab Content (keeping all your existing tabs) */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name <span className="text-red-500">*</span>
                    {(formData.mcpEnhanced || formData.aiEnriched) && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter product name"
                    />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                    {(formData.mcpEnhanced || formData.aiEnriched) && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleChange('brand', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Siemens, ABB, SKF"
                  />
                </div>

                {/* Supplier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => handleChange('supplierId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.supplierId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                  {errors.supplierId && <p className="text-red-500 text-xs mt-1">{errors.supplierId}</p>}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                    {(formData.mcpEnhanced || formData.aiEnriched) && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1).replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => handleChange('price', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.price ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="complete">Complete</option>
                    {product?.status === 'furnished' && <option value="furnished">Furnished</option>}
                  </select>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                    {(formData.mcpEnhanced || formData.aiEnriched) && (
                      <span className="text-purple-600 ml-1" title="AI Enhanced">✨</span>
                    )}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product description..."
                  />
                </div>

                {/* Photo URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo URL
                  </label>
                  <div className="relative">
                    <Image className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="url"
                      value={formData.photo}
                      onChange={(e) => handleChange('photo', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/photo.jpg"
                    />
                  </div>
                </div>

                {/* Catalog URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catalog URL
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="url"
                      value={formData.catalog}
                      onChange={(e) => handleChange('catalog', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/catalog.pdf"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ✅ AI Enhancement Tab (keeping your existing content but simplified) */}
          {activeTab === 'ai' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <Brain className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  AI Product Enhancement
                </h3>
                <p className="text-gray-600 mb-6">
                  Enhance your product data using advanced AI analysis with intelligent prompt selection.
                </p>
                
                {!aiSuggestions && !mcpResults && !isEnriching && (
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={enhanceWithMCP}
                      disabled={!formData.partNumber}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Brain size={20} />
                      Enhance with AI
                    </button>
                  </div>
                )}
                
                {(isEnriching || isWebSearching) && (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin text-blue-600" />
                    <span className="text-gray-600">
                      {isMcpEnhancing ? 'MCP analyzing product...' : 
                       isEnriching ? 'Analyzing product data...' : 'Searching web...'}
                    </span>
                  </div>
                )}
              </div>

              {/* ✅ AI Suggestions Panel (simplified) */}
              {aiSuggestions && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {aiSuggestions.patternEnhanced ? (
                        <Zap className="text-orange-600" size={20} />
                      ) : (
                        <Sparkles className="text-blue-600" size={20} />
                      )}
                      <h4 className="font-medium text-blue-900">
                        {aiSuggestions.source || 'Enhancement Results'}
                      </h4>
                      {aiSuggestions.patternEnhanced && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Quick Pattern
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      aiSuggestions.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                      aiSuggestions.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Confidence: {Math.round(aiSuggestions.confidence * 100)}%
                    </span>
                  </div>
                  
                  {/* Show enhancement warning for basic fallback */}
                  {aiSuggestions.source === 'Basic Pattern Fallback' && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <AlertCircle size={16} />
                        <span className="text-sm font-medium">Basic Pattern Analysis</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Using basic pattern matching. For better accuracy, ensure MCP system is available.
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <SuggestionField 
                      label="Product Name" 
                      field="productName"
                      suggestion={aiSuggestions.productName}
                      current={formData.name}
                    />
                    <SuggestionField 
                      label="Brand" 
                      field="brand"
                      suggestion={aiSuggestions.brand}
                      current={formData.brand}
                    />
                    <SuggestionField 
                      label="Category" 
                      field="category"
                      suggestion={aiSuggestions.category}
                      current={formData.category}
                    />
                    <SuggestionField 
                      label="Description" 
                      field="description"
                      suggestion={aiSuggestions.description}
                      current={formData.description}
                    />
                  </div>
                  
                  {/* Apply All Button */}
                  <div className="text-center mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (aiSuggestions.productName) applySuggestion('productName', aiSuggestions.productName);
                        if (aiSuggestions.brand) applySuggestion('brand', aiSuggestions.brand);
                        if (aiSuggestions.category) applySuggestion('category', aiSuggestions.category);
                        if (aiSuggestions.description) applySuggestion('description', aiSuggestions.description);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2 mx-auto"
                    >
                      <Wand2 size={16} />
                      Apply All Suggestions
                    </button>
                  </div>

                  {/* Detected Specifications */}
                  {aiSuggestions.specifications && Object.keys(aiSuggestions.specifications).length > 0 && (
                    <div className="p-4 bg-white rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-3">Detected Specifications</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(aiSuggestions.specifications).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!formData.partNumber && (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                  <p className="text-gray-600">
                    Please enter a part number in the Identifiers tab to enable AI enhancement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('identifiers')}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Go to Identifiers
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ✅ EXISTING: Identifiers Tab (unchanged) */}
          {activeTab === 'identifiers' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manufacturer Part Number <span className="text-red-500">*</span>
                    <span className="text-purple-600 ml-1" title="Used for AI enhancement">🔍</span>
                  </label>
                  <input
                    type="text"
                    value={formData.partNumber}
                    onChange={(e) => handleChange('partNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono ${
                      errors.partNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 6XV1830-3EH10"
                    onBlur={() => {
                      // Auto-trigger enhancement when part number is entered
                      if (formData.partNumber && !aiSuggestions && !mcpResults && !isEnriching) {
                        setTimeout(() => {
                          loadAvailablePrompts().then(() => {
                            enrichProductData();
                          });
                        }, 500);
                      }
                    }}
                  />
                  {errors.partNumber && <p className="text-red-500 text-xs mt-1">{errors.partNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal SKU
                    <span className="text-xs text-gray-500 ml-1">(Auto-generated)</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="AUTO-001234"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Item Code
                    <span className="text-blue-600 ml-1" title="Client's unique identifier">🏷️</span>
                  </label>
                  <input
                    type="text"
                    value={formData.clientItemCode}
                    onChange={(e) => handleChange('clientItemCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="e.g., 400RTG0091"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alternative Part Number
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturerCode}
                    onChange={(e) => handleChange('manufacturerCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    placeholder="Alternative manufacturer code"
                  />
                </div>
              </div>

              {/* Part Number Validation Status */}
              {formData.partNumber && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Part Number Validation</h4>
                  {(() => {
                    const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
                    return validation.isValid ? (
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle size={16} />
                        <span className="text-sm">Valid format - normalized to: <code className="bg-green-100 px-2 py-1 rounded">{validation.normalized}</code></span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-700">
                        <AlertTriangle size={16} />
                        <span className="text-sm">{validation.error}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ✅ EXISTING: Inventory Tab (unchanged) */}
          {activeTab === 'inventory' && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Stock
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => handleChange('stock', e.target.value)}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.stock ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0"
                    />
                  </div>
                  {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
                </div>

                {/* Minimum Stock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => handleChange('minStock', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.minStock ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="5"
                  />
                  {errors.minStock && <p className="text-red-500 text-xs mt-1">{errors.minStock}</p>}
                </div>
              </div>

              {/* Stock Alert */}
              {formData.stock && formData.minStock && parseInt(formData.stock) <= parseInt(formData.minStock) && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Low Stock Warning</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    Current stock ({formData.stock}) is at or below minimum level ({formData.minStock}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ✅ EXISTING: Documents Tab (unchanged) */}
          {activeTab === 'documents' && product?.id && (
            <div className="p-6">
              <DocumentManager 
                product={{ ...product, ...formData }}
                onSave={handleDocumentSave}
              />
            </div>
          )}

          {activeTab === 'documents' && !product?.id && (
            <div className="p-6">
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Save Product First
                </h3>
                <p className="text-gray-600 mb-4">
                  You need to save the product before managing documents.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Go to Basic Info
                </button>
              </div>
            </div>
          )}

          {/* ✅ EXISTING: History Tab (unchanged) */}
          {activeTab === 'history' && (
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Product History</h3>
              
              {product?.id ? (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Created:</strong> {product.dateAdded ? new Date(product.dateAdded).toLocaleDateString() : 'Unknown'}
                    </p>
                    {product.updatedAt && (
                      <p className="text-sm text-gray-600">
                        <strong>Last Modified:</strong> {new Date(product.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                    {product.status && (
                      <p className="text-sm text-gray-600">
                        <strong>Current Status:</strong> {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                      </p>
                    )}
                    
                    {/* MCP Enhancement History */}
                    {product.mcpEnhanced && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <strong>MCP Enhanced:</strong> {product.lastEnhanced ? new Date(product.lastEnhanced).toLocaleDateString() : 'Yes'}
                        </p>
                        {product.confidence && (
                          <p className="text-sm text-blue-700">
                            <strong>Confidence Score:</strong> {Math.round(product.confidence * 100)}%
                          </p>
                        )}
                        {product.enhancementSource && (
                          <p className="text-sm text-blue-700">
                            <strong>Enhancement Source:</strong> {product.enhancementSource}
                          </p>
                        )}
                        {product.mcpMetadata?.prompt_used && (
                          <p className="text-sm text-blue-700">
                            <strong>MCP Prompt:</strong> {product.mcpMetadata.prompt_used}
                          </p>
                        )}
                        {product.selectedPromptId && (
                          <p className="text-sm text-blue-700">
                            <strong>Selected Prompt ID:</strong> {product.selectedPromptId}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* AI Enhancement History */}
                    {product.aiEnriched && !product.mcpEnhanced && (
                      <div className="mt-3 p-3 bg-purple-50 rounded border border-purple-200">
                        <p className="text-sm text-purple-700">
                          <strong>AI Enhanced:</strong> {product.lastEnhanced ? new Date(product.lastEnhanced).toLocaleDateString() : 'Yes'}
                        </p>
                        {product.confidence && (
                          <p className="text-sm text-purple-700">
                            <strong>Confidence Score:</strong> {Math.round(product.confidence * 100)}%
                          </p>
                        )}
                        {product.webEnhanced && (
                          <p className="text-sm text-purple-700">
                            <strong>Web Enhanced:</strong> Yes
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Enhancement History */}
                  {formData.enhancementHistory && formData.enhancementHistory.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Enhancement History</h4>
                      {formData.enhancementHistory.map((enhancement, index) => (
                        <div key={index} className={`p-3 rounded border ${
                          enhancement.mcpEnhanced 
                            ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-800 flex items-center gap-2">
                              {enhancement.mcpEnhanced ? (
                                <Brain className="h-4 w-4 text-purple-600" />
                              ) : (
                                <Sparkles className="h-4 w-4 text-blue-600" />
                              )}
                              Enhancement #{index + 1} {enhancement.mcpEnhanced ? '(MCP)' : '(AI)'}
                              {enhancement.userSelectedPrompt && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                                  User Selected
                                </span>
                              )}
                            </span>
                            <span className="text-xs text-blue-600">
                              {new Date(enhancement.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-blue-700 mt-1">
                            Confidence: {Math.round(enhancement.confidence * 100)}%
                            {enhancement.webEnhanced && ' • Web Enhanced'}
                            {enhancement.enhancementSource && ` • ${enhancement.enhancementSource}`}
                          </div>
                          {enhancement.appliedFields && enhancement.appliedFields.length > 0 && (
                            <div className="text-xs text-blue-600 mt-1">
                              Applied to: {enhancement.appliedFields.join(', ')}
                            </div>
                          )}
                          {enhancement.mcpMetadata?.prompt_used && (
                            <div className="text-xs text-purple-600 mt-1">
                              MCP Prompt: {enhancement.mcpMetadata.prompt_used}
                            </div>
                          )}
                          {enhancement.selectedPromptId && (
                            <div className="text-xs text-gray-500 mt-1">
                              Prompt ID: {enhancement.selectedPromptId}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Detailed history tracking complete with prompt selection</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">History will be available after saving the product</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ✅ FIXED: Footer with Always Visible Update Button */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <div className="flex items-center justify-between">
            {/* ✅ LEFT: Status Indicators */}
            <div className="flex items-center gap-4 text-sm">
              {formData.mcpEnhanced && (
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle size={16} />
                  <span className="font-medium">
                    AI Enhanced ({Math.round(formData.confidence * 100)}%)
                    {aiSuggestions?.forcedPrompt && (
                      <span className="ml-1 text-xs text-gray-500">(Forced Prompt)</span>
                    )}
                  </span>
                </div>
              )}
              
              {aiSuggestions?.patternEnhanced && (
                <div className="flex items-center gap-2 text-orange-700">
                  <Zap size={16} />
                  <span className="font-medium">
                    Pattern Enhanced ({Math.round(formData.confidence * 100)}%)
                  </span>
                </div>
              )}
              
              {appliedSuggestions.size > 0 && (
                <div className="flex items-center gap-2 text-blue-700">
                  <TrendingUp size={16} />
                  <span className="text-sm">
                    {appliedSuggestions.size} suggestion(s) applied
                  </span>
                </div>
              )}

              {/* MCP System Status */}
              {mcpStatus && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className={`h-2 w-2 rounded-full ${
                    mcpStatus.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></span>
                  MCP System: {mcpStatus.status === 'available' ? 'Ready' : 'Basic Mode'}
                  {availablePrompts.length > 0 && (
                    <span className="text-xs text-gray-500">
                      ({availablePrompts.length} prompts)
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* ✅ RIGHT: Action Buttons - ALWAYS VISIBLE AND PROPERLY SPACED! */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 font-medium"
              >
                <Save size={16} />
                <span>{isSubmitting ? 'Saving...' : (product ? 'Update' : 'Add')} Product</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProductModal;
