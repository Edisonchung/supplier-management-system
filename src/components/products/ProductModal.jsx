// src/components/products/ProductModal.jsx - ENHANCED with MCP Prompt Selector Integration
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Package, DollarSign, Layers, Tag, Hash, Image, FileText, Info, Clock, 
  AlertCircle, Save, Sparkles, Check, RefreshCw, Loader2, Wand2, Brain,
  ExternalLink, TrendingUp, CheckCircle, AlertTriangle, Zap, Target, History, ChevronDown, Settings
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
// ENHANCED PRODUCT MODAL COMPONENT WITH MCP PROMPT SELECTOR
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

   // ✅ NEW: Clean dropdown state
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

  // ✅ NEW: Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowEnhancementDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  
  // ✅ SAFE: Using string methods instead of regex to avoid the build error
  // Siemens parts
  if (upperPartNumber.startsWith('6XV') || upperPartNumber.startsWith('6ES') || upperPartNumber.startsWith('3SE')) {
    return prompts.find(p => p.name.toLowerCase().includes('siemens')) || prompts[0];
  }
  
  // SKF bearings - check for common patterns
  if (upperPartNumber.startsWith('NJ') || upperPartNumber.startsWith('NU') || 
      (upperPartNumber.startsWith('6') && upperPartNumber.length >= 4) ||
      (upperPartNumber.startsWith('32') && upperPartNumber.length >= 5)) {
    return prompts.find(p => p.name.toLowerCase().includes('skf')) || prompts[0];
  }
  
  // ABB drives
  if (upperPartNumber.startsWith('ACS')) {
    return prompts.find(p => p.name.toLowerCase().includes('abb')) || prompts[0];
  }
  
  // Default to brand detection prompt
  return prompts.find(p => p.name.toLowerCase().includes('brand detection')) || prompts[0];
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
        
        // Simple brand detection (only most common patterns)
        let detectedBrand = null;
        const partUpper = formData.partNumber.toUpperCase();
        
        if (partUpper.match(/^6(XV|ES|EP|AV)/)) detectedBrand = 'Siemens';
        else if (partUpper.match(/^(NJ|NU|6\d{3}|32\d{3})/)) detectedBrand = 'SKF';
        else if (partUpper.match(/^ACS\d{3}/)) detectedBrand = 'ABB';
        else if (partUpper.match(/^(TM|LC1)/)) detectedBrand = 'Schneider Electric';
        else if (partUpper.match(/^(E3|CP1|MY)/)) detectedBrand = 'Omron';
        
        // Simple category detection
        let detectedCategory = formData.category || 'components';
        if (partUpper.match(/^6XV/)) detectedCategory = 'networking';
        else if (partUpper.match(/^6ES/)) detectedCategory = 'automation';
        else if (partUpper.match(/^(NJ|NU|6\d{3})/)) detectedCategory = 'bearings';
        else if (partUpper.match(/^ACS/)) detectedCategory = 'drives';
        
        suggestions = {
          productName: detectedBrand ? 
            `${detectedBrand} ${detectedCategory.charAt(0).toUpperCase() + detectedCategory.slice(1)} Component ${formData.partNumber}` :
            formData.name || `Industrial Component ${formData.partNumber}`,
          brand: detectedBrand,
          category: detectedCategory,
          description: detectedBrand ? 
            `${detectedBrand} industrial ${detectedCategory} component. Part number: ${formData.partNumber}. Professional-grade equipment for industrial applications.` :
            `Industrial component with part number ${formData.partNumber}. Manufacturer to be verified.`,
          specifications: detectedBrand ? {
            manufacturer: detectedBrand,
            category: detectedCategory,
            part_number: formData.partNumber
          } : {},
          confidence: detectedBrand ? 0.6 : 0.3,
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

  // ✅ SIMPLIFIED: Force legacy enhancement (basic fallback only)
  const enhanceWithLegacy = async () => {
    await enrichProductData('legacy');
  };

  // ✅ NEW: MCP Enhancement (Primary method)
  const enhanceWithMCP = async () => {
    if (!formData.partNumber) {
      showNotification?.('Please enter a part number first', 'warning');
      return;
    }
    
    setIsEnriching(true);
    setIsMcpEnhancing(true);
    setShowEnhancementDropdown(false);
    
    try {
      console.log('🚀 MCP Enhancement (Primary Method)...');
      
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
        const suggestions = {
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
        
        setAiSuggestions(suggestions);
        setMcpResults(mcpResult);
        setActiveTab('ai');
        setShowAIPanel(true);
        
        showNotification?.(
          `MCP enhancement complete: ${Math.round(mcpResult.confidence * 100)}% confidence`, 
          'success'
        );
      } else {
        throw new Error('MCP enhancement unsuccessful');
      }
      
    } catch (error) {
      console.warn('MCP enhancement failed, using fallback:', error);
      // Auto-fallback to pattern analysis
      await enhanceWithFallback();
    } finally {
      setIsEnriching(false);
      setIsMcpEnhancing(false);
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

  // ✅ NEW: Fallback enhancement (pattern-based)
  const enhanceWithFallback = async () => {
  if (!formData.partNumber) {
    showNotification?.('Please enter a part number first', 'warning');
    return;
  }
  
  setIsEnriching(true);
  setShowEnhancementDropdown(false);
  
  try {
    console.log('🔄 Using fallback pattern enhancement...');
    
    // ✅ SAFE: Using string methods instead of regex
    let detectedBrand = null;
    const partUpper = formData.partNumber.toUpperCase();
    
    // Brand detection using safe string methods
    if (partUpper.startsWith('6XV') || partUpper.startsWith('6ES') || partUpper.startsWith('6EP') || partUpper.startsWith('6AV')) {
      detectedBrand = 'Siemens';
    } else if (partUpper.startsWith('NJ') || partUpper.startsWith('NU') || 
               (partUpper.startsWith('6') && partUpper.length >= 4) ||
               (partUpper.startsWith('32') && partUpper.length >= 5)) {
      detectedBrand = 'SKF';
    } else if (partUpper.startsWith('ACS')) {
      detectedBrand = 'ABB';
    } else if (partUpper.startsWith('TM') || partUpper.startsWith('LC1')) {
      detectedBrand = 'Schneider Electric';
    } else if (partUpper.startsWith('E3') || partUpper.startsWith('CP1') || partUpper.startsWith('MY')) {
      detectedBrand = 'Omron';
    }
    
    // Category detection using safe string methods
    let detectedCategory = formData.category || 'components';
    if (partUpper.startsWith('6XV')) detectedCategory = 'networking';
    else if (partUpper.startsWith('6ES')) detectedCategory = 'automation';
    else if (partUpper.startsWith('NJ') || partUpper.startsWith('NU') || partUpper.startsWith('6')) detectedCategory = 'bearings';
    else if (partUpper.startsWith('ACS')) detectedCategory = 'drives';
    
    const enhancedData = {
      productName: detectedBrand ? 
        `${detectedBrand} ${detectedCategory.charAt(0).toUpperCase() + detectedCategory.slice(1)} Component ${formData.partNumber}` :
        formData.name || `Industrial Component ${formData.partNumber}`,
      brand: detectedBrand,
      category: detectedCategory,
      description: detectedBrand ? 
        `${detectedBrand} industrial ${detectedCategory} component. Part number: ${formData.partNumber}. Professional-grade equipment for industrial applications.` :
        `Industrial component with part number ${formData.partNumber}. Manufacturer to be verified.`,
      specifications: detectedBrand ? {
        manufacturer: detectedBrand,
        category: detectedCategory,
        part_number: formData.partNumber
      } : {},
      confidence: detectedBrand ? 0.7 : 0.4,
      source: 'Pattern Analysis Fallback',
      mcpEnhanced: false
    };
    
    setAiSuggestions(enhancedData);
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

  // ✅ ENHANCED: Web search enhancement (keeping existing functionality)
  const performWebSearch = async () => {
    if (!formData.partNumber) {
      showNotification?.('Please enter a part number first', 'warning');
      return;
    }

    setIsWebSearching(true);
    try {
      console.log('🔍 Starting web search for:', formData.partNumber);
      
      const response = await fetch(`${MCP_SERVER_URL}/api/web-search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          partNumber: formData.partNumber,
          brand: formData.brand,
          description: formData.description,
          type: 'product_search'
        })
      });

      console.log('Web search response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Web search failed:', response.status, errorText);
        throw new Error(`Web search failed: ${response.status} ${response.statusText}`);
      }

      const searchResults = await response.json();
      console.log('Web search results:', searchResults);
      
      setWebSearchResults(searchResults);
      
      if (searchResults.found) {
        // Merge web search results with existing suggestions
        const enhancedSuggestions = {
          ...aiSuggestions,
          ...searchResults,
          webEnhanced: true,
          confidence: Math.max(aiSuggestions?.confidence || 0, searchResults.confidence || 0.6)
        };
        setAiSuggestions(enhancedSuggestions);
        showNotification?.('Web search completed - additional data found!', 'success');
      } else {
        showNotification?.(`Web search completed: ${searchResults.reason || 'No additional data found'}`, 'info');
      }
      
    } catch (error) {
      console.error('Web search error:', error);
      showNotification?.(`Web search failed: ${error.message}`, 'error');
    } finally {
      setIsWebSearching(false);
    }
  };

  // ✅ NEW: Apply MCP suggestion
  const applyMCPSuggestion = (field, value, label) => {
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
    
    showNotification?.(`Applied ${label}: ${value}`, 'success');
  };

  // ✅ NEW: Apply all MCP suggestions
  const applyAllMCPSuggestions = () => {
    if (!mcpResults) return;

    const updates = {};
    let appliedCount = 0;

    if (mcpResults.productName && mcpResults.productName !== formData.name) {
      updates.name = mcpResults.productName;
      appliedCount++;
    }
    
    if (mcpResults.brand && mcpResults.brand !== formData.brand) {
      updates.brand = mcpResults.brand;
      appliedCount++;
    }
    
    if (mcpResults.category && mcpResults.category !== formData.category) {
      updates.category = mcpResults.category;
      appliedCount++;
    }
    
    if (mcpResults.description && mcpResults.description !== formData.description) {
      updates.description = mcpResults.description;
      appliedCount++;
    }

    setFormData(prev => ({ ...prev, ...updates }));
    showNotification?.(`Applied ${appliedCount} MCP suggestions`, 'success');
  };

  // ✅ ENHANCED: Apply AI suggestion with learning (keeping existing functionality)
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

  // ✅ ENHANCED: Handle user correction for learning (keeping existing functionality)
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

  // ✅ SIMPLIFIED: Improved validation using utility functions only
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
    
    // ✅ UTILITY: Part number validation using ProductEnrichmentService utility
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


  // ✅ NEW: Enhancement Dropdown Component
  const EnhancementDropdown = () => (
  <div className="relative" ref={dropdownRef}>
    <button
      type="button"
      onClick={() => setShowEnhancementDropdown(!showEnhancementDropdown)}
      disabled={!formData.partNumber || isEnriching}
      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors min-w-[140px]"
    >
      {isEnriching ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          {isMcpEnhancing ? 'MCP Analyzing...' : 'Enhancing...'}
        </>
      ) : (
        <>
          <Brain size={16} />
          AI Enhance
          <ChevronDown size={14} className={`transition-transform duration-200 ${
            showEnhancementDropdown ? 'rotate-180' : 'rotate-0'
          }`} />
        </>
      )}
    </button>

    {showEnhancementDropdown && !isEnriching && (
      <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
        <div className="p-1">
          {/* MCP Enhancement (Primary) */}
          {mcpStatus?.status === 'available' && (
            <button
              type="button"
              onClick={enhanceWithMCP}
              className="w-full text-left p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-lg flex items-start gap-3 transition-colors group"
            >
              <div className="flex-shrink-0 mt-1">
                <Brain size={20} className="text-purple-600 group-hover:text-purple-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm mb-1">MCP Enhancement</div>
                <div className="text-xs text-gray-600 mb-2">Advanced AI with smart prompts</div>
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Recommended • High Accuracy
                </div>
              </div>
            </button>
          )}

          {/* Specialized Prompts Section */}
          {availablePrompts.length > 1 && (
            <div className="border-t border-gray-100 mt-1 pt-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50 rounded-md mx-1 mb-1">
                Specialized Prompts
              </div>
              {availablePrompts.slice(0, 2).map(prompt => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => enhanceWithSpecificPrompt(prompt.id)}
                  className="w-full text-left p-3 hover:bg-purple-50 rounded-lg flex items-start gap-3 transition-colors group"
                >
                  <div className="flex-shrink-0 mt-1">
                    <Settings size={16} className="text-purple-500 group-hover:text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 mb-1 truncate">{prompt.name}</div>
                    <div className="text-xs text-gray-500 mb-2">{prompt.specialized_for}</div>
                    {prompt.confidence_avg && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {Math.round(prompt.confidence_avg * 100)}% avg accuracy
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Enhancement Section */}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              type="button"
              onClick={enhanceWithFallback}
              className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-start gap-3 transition-colors group"
            >
              <div className="flex-shrink-0 mt-1">
                <Sparkles size={20} className="text-blue-600 group-hover:text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm mb-1">Quick Enhancement</div>
                <div className="text-xs text-gray-600 mb-2">Pattern-based analysis</div>
                <div className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Fast • Basic Detection
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
  // ✅ ENHANCED: Improved submit handler with MCP metadata
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setActiveTab('basic');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // ✅ UTILITY: Normalize part number using ProductEnrichmentService utility
      let normalizedPartNumber = formData.partNumber;
      if (formData.partNumber) {
        const validation = ProductEnrichmentService.validateAndNormalizePartNumber(formData.partNumber);
        if (validation.isValid) {
          normalizedPartNumber = validation.normalized;
        }
      }

      // ✅ UTILITY: Generate SKU using ProductEnrichmentService utility
      let sku = formData.sku;
      if (!sku && formData.partNumber) {
        sku = ProductEnrichmentService.generateInternalSKU({
          category: formData.category,
          brand: formData.brand,
          partNumber: normalizedPartNumber
        });
      }

      // ✅ NEW: Build enhancement history including MCP data
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
        // ✅ ENHANCED: Add AI + MCP enhancement metadata
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

      // Clean undefined values
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
    // Handle user corrections for learning
    if (aiSuggestions && ['brand', 'category', 'name', 'description'].includes(field)) {
      const originalValue = aiSuggestions[field === 'name' ? 'productName' : field];
      if (originalValue && originalValue !== value) {
        handleUserCorrection(field, originalValue, value);
      }
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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

  // ✅ ENHANCED: Updated categories
  const categories = [
    'electronics',
    'hydraulics', 
    'pneumatics',
    'automation',
    'sensors',
    'cables',
    'components',
    'mechanical',
    'bearings',
    'gears',
    'couplings',
    'drives',
    'instrumentation',
    'networking',
    'diaphragm_pumps',
    'pumping_systems',
    'fluid_handling',
    'pumps',
    'valves',
    'safety',
    'electrical'
  ];

  // ✅ NEW: Prompt Selector Panel Component
  const PromptSelectorPanel = () => (
    <div className="grid grid-cols-3 gap-4 p-3 bg-white rounded-lg border mb-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          🧠 Active Prompt
        </label>
        <select 
          value={selectedPromptId || ''}
          onChange={(e) => rerunWithDifferentPrompt(e.target.value)}
          disabled={isRerunning}
          className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-purple-500"
        >
          {availablePrompts.map(prompt => (
            <option key={prompt.id} value={prompt.id}>
              {prompt.name}
              {prompt.confidence_avg && ` (${Math.round(prompt.confidence_avg * 100)}% avg)`}
            </option>
          ))}
        </select>
        {selectedPromptId && (
          <p className="text-xs text-gray-500 mt-1">
            Specialized for: {availablePrompts.find(p => p.id === selectedPromptId)?.specialized_for}
          </p>
        )}
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ⚡ AI Provider
        </label>
        <div className="flex items-center space-x-2 p-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-gray-900">
            {aiSuggestions?.mcpMetadata?.ai_provider || availablePrompts.find(p => p.id === selectedPromptId)?.aiProvider || 'deepseek'}
          </span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ⏱️ Processing Time
        </label>
        <div className="flex items-center space-x-2 p-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-gray-900">
            {aiSuggestions?.mcpMetadata?.processing_time || '0ms'}
          </span>
        </div>
      </div>
    </div>
  );

  // ✅ NEW: Prompt History Panel Component
  const PromptHistoryPanel = () => (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex items-center">
          <History className="w-4 h-4 text-gray-600 mr-2" />
          Prompt History
        </h4>
        {promptHistory.length > 0 && (
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            {showComparison ? 'Hide' : 'Compare'} Results
          </button>
        )}
      </div>
      
      {promptHistory.length > 0 ? (
        <div className="space-y-2">
          {promptHistory.slice(-3).map((entry, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {entry.promptName}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {Math.round(entry.result.confidence * 100)}% confidence
                </span>
              </div>
              <button
                onClick={() => rerunWithDifferentPrompt(entry.promptId)}
                className="text-xs text-purple-600 hover:text-purple-800"
              >
                Reuse
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No previous enhancements</p>
      )}
    </div>
  );

  // ✅ ENHANCED: MCP Suggestion Component
  const MCPSuggestionField = ({ label, field, suggestion, current }) => {
    const isApplied = appliedSuggestions.has(field);
    const isDifferent = suggestion && suggestion !== current;
    
    if (!suggestion || !isDifferent) return null;
    
    return (
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <div className="flex-1">
          <div className="font-medium text-blue-900 text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            {label}
          </div>
          <div className="text-blue-700 text-sm">{suggestion}</div>
          {current && (
            <div className="text-xs text-gray-500 mt-1">Current: {current}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => applyMCPSuggestion(field, suggestion, label)}
          disabled={isApplied}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            isApplied 
              ? 'bg-green-100 text-green-800 cursor-not-allowed flex items-center gap-1' 
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
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

  // ✅ ENHANCED: AI Suggestion Component (keeping existing functionality)
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
        {/* ✅ ENHANCED: Header with MCP Integration and Prompt Info */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
  <div className="flex justify-between items-start">
    <div className="flex-1">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {product ? 'Edit Product' : 'Add New Product'}
      </h2>
      <div className="flex items-center gap-4 flex-wrap">
        {formData.mcpEnhanced && (
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              MCP Enhanced ({Math.round(formData.confidence * 100)}% confidence)
            </span>
          </div>
        )}
        {formData.aiEnriched && !formData.mcpEnhanced && (
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              AI Enhanced ({Math.round(formData.confidence * 100)}% confidence)
            </span>
          </div>
        )}
        {mcpStatus && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
            mcpStatus.status === 'available' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            <span className={`h-2 w-2 rounded-full ${
              mcpStatus.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            {mcpStatus.status === 'available' ? 'MCP Ready' : 'Basic Mode'}
          </span>
        )}
        {availablePrompts.length > 1 && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            {availablePrompts.length} Prompts Available
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-3 ml-4">
      {formData.partNumber && <EnhancementDropdown />}
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-gray-700 transition-colors p-1"
      >
        <X size={24} />
      </button>
    </div>
  </div>
</div>

        {/* Tab Navigation */}
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

        {/* Tab Content - keeping all existing tabs and adding enhanced AI tab with prompt selector */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
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

          {/* ✅ ENHANCED: Identifiers Tab (keeping existing functionality) */}
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
                    // ✅ UTILITY: Using ProductEnrichmentService utility function only
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

          {/* ✅ ENHANCED: AI Enhancement Tab with MCP Prompt Selector Integration */}
          {activeTab === 'ai' && (
            <div className="p-6 space-y-6">
              <div className="text-center">
                <Brain className="mx-auto h-12 w-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  MCP AI Product Enhancement
                </h3>
                <p className="text-gray-600 mb-6">
                  Enhance your product data using advanced MCP AI analysis with intelligent prompt selection.
                </p>
                
                {!aiSuggestions && !mcpResults && !isEnriching && (
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    {mcpStatus?.status === 'available' && (
                      <button
                        type="button"
                        onClick={enhanceWithMCP}
                        disabled={!formData.partNumber}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Brain size={20} />
                        MCP Enhance
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={enrichProductData}
                      disabled={!formData.partNumber}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Sparkles size={20} />
                      Basic Enhance
                    </button>
                    
                    <button
                      type="button"
                      onClick={performWebSearch}
                      disabled={!formData.partNumber}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <ExternalLink size={20} />
                      Web Search
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

              {/* ✅ NEW: Prompt Selector Panel */}
              {availablePrompts.length > 0 && (aiSuggestions || mcpResults) && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      MCP Enhancement Results
                      <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        {availablePrompts.length} Prompts Available
                      </span>
                    </h4>
                    {isRerunning && (
                      <div className="flex items-center gap-2 text-purple-600">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Re-running...</span>
                      </div>
                    )}
                  </div>

                  {/* ✅ NEW: Prompt Selector Panel Component */}
                  <PromptSelectorPanel />

                  {/* ✅ NEW: Prompt History Component */}
                  <PromptHistoryPanel />
                </div>
              )}

              {/* ✅ NEW: MCP Enhancement Results Panel */}
              {mcpResults && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-6 w-6 text-blue-600" />
                        <span className="font-bold text-gray-900">MCP Enhancement Results</span>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        mcpResults.source?.includes('MCP') 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {mcpResults.source || 'MCP Analysis'}
                      </span>
                      
                      <span className="text-sm text-gray-600 flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        {Math.round(mcpResults.confidence * 100)}% confidence
                      </span>

                      {aiSuggestions?.userSelectedPrompt && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          User Selected Prompt
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={applyAllMCPSuggestions}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Apply All Suggestions
                    </button>
                  </div>

                  {/* MCP Metadata Panel */}
                  {mcpResults.mcpMetadata && (
                    <div className="bg-white rounded-lg p-4 border mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-600" />
                          <div>
                            <span className="text-gray-500 block">Prompt:</span>
                            <span className="font-medium text-blue-800">
                              {mcpResults.mcpMetadata.prompt_used || 'MCP Analysis'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-600" />
                          <div>
                            <span className="text-gray-500 block">AI Provider:</span>
                            <span className="font-medium text-gray-900">
                              {mcpResults.mcpMetadata.ai_provider || 'Advanced AI'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-orange-600" />
                          <div>
                            <span className="text-gray-500 block">Time:</span>
                            <span className="font-medium text-gray-900">
                              {mcpResults.mcpMetadata.processing_time || 'Fast'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MCP Enhancement Suggestions Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <MCPSuggestionField 
                      label="Product Name" 
                      field="productName"
                      suggestion={mcpResults.productName}
                      current={formData.name}
                    />
                    <MCPSuggestionField 
                      label="Brand" 
                      field="brand"
                      suggestion={mcpResults.brand}
                      current={formData.brand}
                    />
                    <MCPSuggestionField 
                      label="Category" 
                      field="category"
                      suggestion={mcpResults.category}
                      current={formData.category}
                    />
                    <MCPSuggestionField 
                      label="Description" 
                      field="description"
                      suggestion={mcpResults.description}
                      current={formData.description}
                    />
                  </div>

                  {/* Technical Specifications from MCP */}
                  {mcpResults.specifications && Object.keys(mcpResults.specifications).length > 0 && (
                    <div className="mt-4 bg-white rounded-lg p-4 border">
                      <h5 className="font-medium text-gray-900 mb-3">MCP Detected Specifications</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(mcpResults.specifications).map(([key, value]) => (
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

              {/* ✅ SIMPLIFIED: AI Suggestions Panel (basic fallback results) */}
              {aiSuggestions && !mcpResults && (
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-blue-600" size={20} />
                      <h4 className="font-medium text-blue-900">
                        {aiSuggestions.source === 'Basic Pattern Fallback' ? 'Basic Pattern Analysis' : 'Enhancement Results'}
                      </h4>
                      {aiSuggestions.webEnhanced && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Web Enhanced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        aiSuggestions.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                        aiSuggestions.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Confidence: {Math.round(aiSuggestions.confidence * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={enrichProductData}
                        disabled={isEnriching}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Refresh suggestions"
                      >
                        <RefreshCw size={16} className={isEnriching ? 'animate-spin' : ''} />
                      </button>
                    </div>
                  </div>
                  
                  {/* ✅ SIMPLIFIED: Show low confidence warning for basic fallback */}
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

                  {/* Web Search Results */}
                  {webSearchResults && webSearchResults.found && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h5 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        <ExternalLink size={16} />
                        Additional Web Information
                      </h5>
                      {webSearchResults.datasheetUrl && (
                        <a 
                          href={webSearchResults.datasheetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 hover:text-green-900 text-sm flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          View Datasheet
                        </a>
                      )}
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

          {/* ✅ KEEPING: Inventory Tab (existing functionality) */}
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

          {/* ✅ KEEPING: Documents Tab (existing functionality) */}
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

          {/* ✅ ENHANCED: History Tab with MCP enhancement history and prompt tracking */}
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
                    
                    {/* ✅ ENHANCED: MCP Enhancement History */}
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
                    
                    {/* ✅ KEEPING: AI Enhancement History */}
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

                  {/* ✅ ENHANCED: Enhancement History with Prompt Tracking */}
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

{/* Footer */}
{activeTab !== 'documents' && (
  <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-between items-center shadow-lg">
    <div className="flex items-center gap-4 flex-wrap">
      {formData.mcpEnhanced && (
        <div className="flex items-center gap-2 text-purple-700">
          <Brain size={16} />
          <span className="text-sm font-medium">
            MCP Enhanced ({Math.round(formData.confidence * 100)}%)
            {selectedPromptId && availablePrompts.find(p => p.id === selectedPromptId) && (
              <span className="ml-1 text-xs text-gray-500">
                via {availablePrompts.find(p => p.id === selectedPromptId)?.name}
              </span>
            )}
          </span>
        </div>
      )}
      
      {formData.aiEnriched && !formData.mcpEnhanced && (
        <div className="flex items-center gap-2 text-purple-700">
          <Sparkles size={16} />
          <span className="text-sm font-medium">
            AI Enhanced ({Math.round(formData.confidence * 100)}%)
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

      {mcpStatus && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className={`h-2 w-2 rounded-full ${
            mcpStatus.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'
          }`}></span>
          MCP System: {mcpStatus.status === 'available' ? 'Ready' : 'Basic Mode'}
          {availablePrompts.length > 0 && (
            <span className="text-xs text-gray-500 ml-1">
              ({availablePrompts.length} prompts)
            </span>
          )}
        </div>
      )}
    </div>
    
    <div className="flex items-center gap-3 ml-4">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors font-medium"
      >
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] min-w-[140px] justify-center"
      >
        {isSubmitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save size={16} />
            <span>{product ? 'Update Product' : 'Add Product'}</span>
          </>
        )}
      </button>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
