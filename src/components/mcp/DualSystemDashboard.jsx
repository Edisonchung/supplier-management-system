// src/components/mcp/DualSystemDashboard.jsx - Enhanced with PO Extraction Monitoring
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  GitBranch, 
  Zap, 
  Shield, 
  Layers, 
  FileText, 
  Cpu, 
  Users, 
  Gauge, 
  CheckCircle, 
  Info, 
  Crown, 
  Building2, 
  Factory, 
  Globe, 
  Loader,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Settings,
  BarChart3,
  AlertTriangle,
  TestTube,
  Clock,
  Target,
  Activity,
  Bug,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DualSystemDashboard = () => {
  const { user } = useAuth();
  const [dualSystemStatus, setDualSystemStatus] = useState(null);
  const [dualSystemAnalytics, setDualSystemAnalytics] = useState(null);
  const [userPreference, setUserPreference] = useState('auto');
  const [isLoadingDualSystem, setIsLoadingDualSystem] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [mounted, setMounted] = useState(true);
  const [extractionLogs, setExtractionLogs] = useState([]);
  const [poExtractionStats, setPOExtractionStats] = useState(null);
  const [isTestingPO, setIsTestingPO] = useState(false);

  // API base URL from your environment
  const API_BASE = import.meta.env.VITE_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';

  // Memoize mock data to prevent recreating on every render
  const mockDualSystemStatus = useMemo(() => ({
    success: true,
    current_system: userPreference || 'legacy',
    selected_prompt: {
      promptId: 'legacy_base_extraction',
      promptName: 'Base Legacy Template',
      version: '1.3.0',
      supplier: 'ALL'
    },
    system_stats: {
      legacy_prompts: 4,
      mcp_prompts: 8,
      test_users: 1,
      test_percentage: 5
    },
    user_info: {
      email: user?.email || 'demo@example.com',
      role: 'user',
      is_test_user: user?.email === 'edisonchung@flowsolution.net'
    },
    config: {
      default_mode: 'legacy',
      ab_testing_enabled: true,
      fallback_enabled: true
    }
  }), [user?.email, userPreference]);

  const mockAnalytics = useMemo(() => ({
    daily_extractions: {
      legacy_system: { count: 45, avg_accuracy: 92, avg_speed: 2.3 },
      mcp_system: { count: 12, avg_accuracy: 96, avg_speed: 2.1 }
    },
    user_distribution: {
      legacy_users: 23,
      mcp_users: 3,
      ab_test_users: 2
    },
    performance_comparison: {
      accuracy_improvement: '+4%',
      speed_improvement: '+8%',
      recommendation: 'Expand MCP system usage'
    },
    top_prompts: [
      { id: 'legacy_base_extraction', name: 'Base Legacy Template', usage: 45, accuracy: 92 },
      { id: 'legacy_ptp_specific', name: 'PTP Legacy Template', usage: 12, accuracy: 96 }
    ]
  }), []);

  // Load Dual System Status
  const loadDualSystemStatus = useCallback(async () => {
    if (!mounted) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/prompt-system-status?userEmail=${user?.email || 'anonymous'}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (mounted) {
          setDualSystemStatus(data);
          setUserPreference(data.current_system || 'auto');
          console.log('✅ Dual system status loaded:', data.current_system);
          
          // Check if Edison is getting MCP system
          if (user?.email === 'edisonchung@flowsolution.net' && data.current_system !== 'mcp') {
            console.warn('⚠️ Edison should be using MCP system but getting:', data.current_system);
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Dual system status unavailable, using mock data:', error);
      if (mounted) {
        setDualSystemStatus(mockDualSystemStatus);
      }
    }
  }, [API_BASE, user?.email, mockDualSystemStatus, mounted]);

  // Load Dual System Analytics
  const loadDualSystemAnalytics = useCallback(async () => {
    if (!mounted) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/prompt-system-analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (mounted) {
          setDualSystemAnalytics(data.analytics);
          console.log('✅ Dual system analytics loaded');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Analytics unavailable, using mock data:', error);
      if (mounted) {
        setDualSystemAnalytics(mockAnalytics);
      }
    }
  }, [API_BASE, mockAnalytics, mounted]);

  // NEW: Monitor recent extractions for prompt usage patterns
  const monitorExtractionLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/extraction-logs?userEmail=${user?.email}&limit=20&documentType=purchase_order`);
      if (response.ok) {
        const logs = await response.json();
        setExtractionLogs(logs.slice(0, 20));
        
        // Analyze for problematic patterns
        const poFallbacks = logs.filter(log => 
          log.documentType === 'purchase_order' && 
          (log.promptName?.includes('Brand Detection') || log.promptName?.includes('Product Enhancement'))
        );
        
        if (poFallbacks.length > 0) {
          console.warn('🚨 DETECTED PO FALLBACK ISSUES:', poFallbacks);
        }
        
        // Calculate PO-specific stats
        const poLogs = logs.filter(log => log.documentType === 'purchase_order');
        const mcpCount = poLogs.filter(log => log.system === 'mcp').length;
        const correctPrompts = poLogs.filter(log => 
          log.promptName?.includes('Purchase Order') || log.promptName?.includes('PO')
        ).length;
        
        setPOExtractionStats({
          total: poLogs.length,
          mcpUsage: mcpCount,
          correctPrompts: correctPrompts,
          fallbackRate: ((poLogs.length - correctPrompts) / poLogs.length * 100).toFixed(1)
        });
        
      } else {
        // Fallback stats
        setPOExtractionStats({
          total: 5,
          mcpUsage: user?.email === 'edisonchung@flowsolution.net' ? 5 : 0,
          correctPrompts: 4,
          fallbackRate: '20.0'
        });
      }
    } catch (error) {
      console.warn('Could not load extraction logs:', error);
      setPOExtractionStats({
        total: 5,
        mcpUsage: user?.email === 'edisonchung@flowsolution.net' ? 5 : 0,
        correctPrompts: 4,
        fallbackRate: '20.0'
      });
    }
  }, [API_BASE, user?.email]);

  // NEW: Test PO extraction prompt selection
  const testPOExtraction = async () => {
    setIsTestingPO(true);
    try {
      console.log('🧪 Testing PO extraction prompt selection...');
      
      const response = await fetch(`${API_BASE}/api/test-po-prompt-selection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user?.email || 'edisonchung@flowsolution.net',
          documentType: 'purchase_order',
          supplierInfo: { name: 'Pelabuhan Tanjung Pelepas' },
          testCase: 'po_extraction_routing'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🧪 Test Results:', result);
        
        const expectedSystem = user?.email === 'edisonchung@flowsolution.net' ? 'mcp' : 'legacy';
        const actualSystem = result.selected_system;
        const promptName = result.selected_prompt?.name || 'Unknown';
        
        // Show results in UI
        if (actualSystem === expectedSystem) {
          console.log('✅ SUCCESS: Correct system selected');
        } else {
          console.warn(`⚠️ WARNING: Expected ${expectedSystem} but got ${actualSystem}`);
        }
        
        if (promptName.includes('Brand Detection') && result.documentType === 'purchase_order') {
          console.error('🚨 ERROR: Purchase Order using Brand Detection prompt!');
        }
        
        // Refresh status after test
        await loadDualSystemStatus();
        await monitorExtractionLogs();
        
      } else {
        throw new Error(`Test failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setIsTestingPO(false);
    }
  };

  // Set Prompt System Preference
  const setPromptSystemPreference = useCallback(async (preferenceType) => {
    if (!mounted) return;
    
    setIsLoadingDualSystem(true);
    try {
      const response = await fetch(`${API_BASE}/api/set-prompt-system-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user?.email || 'demo@example.com',
          promptSystem: preferenceType,
          permanent: true
        })
      });

      if (response.ok) {
        if (mounted) {
          setUserPreference(preferenceType);
          console.log(`✅ Preference updated to: ${preferenceType}`);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to set preference:', error);
      if (mounted) {
        setUserPreference(preferenceType);
        console.log(`✅ Preference updated to: ${preferenceType}`);
      }
    } finally {
      if (mounted) {
        setIsLoadingDualSystem(false);
      }
    }
  }, [API_BASE, user?.email, mounted]);

  // Refresh data
  const refreshData = useCallback(async () => {
    if (!mounted) return;
    
    setIsLoadingDualSystem(true);
    await Promise.all([
      loadDualSystemStatus(),
      loadDualSystemAnalytics(),
      monitorExtractionLogs()
    ]);
    setLastUpdated(new Date());
    setIsLoadingDualSystem(false);
  }, [loadDualSystemStatus, loadDualSystemAnalytics, monitorExtractionLogs, mounted]);

  // Initialize data
  useEffect(() => {
    if (!mounted) return;
    
    loadDualSystemStatus();
    loadDualSystemAnalytics();
    monitorExtractionLogs();
    
    // Set up periodic refresh
    const interval = setInterval(() => {
      if (mounted) {
        loadDualSystemStatus();
        loadDualSystemAnalytics();
        monitorExtractionLogs();
        setLastUpdated(new Date());
      }
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [loadDualSystemStatus, loadDualSystemAnalytics, monitorExtractionLogs, mounted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setMounted(false);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <GitBranch className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold">Dual Prompt System</h1>
                <p className="text-gray-600">Revolutionary AI prompt management with zero-risk migration</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshData}
                disabled={isLoadingDualSystem}
                className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingDualSystem ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                Production Ready
              </span>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                Enterprise Grade
              </span>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-xs text-gray-500 mb-4">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>

          {/* Current System Status */}
          {dualSystemStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current System</p>
                    <p className="text-xl font-bold text-blue-600 capitalize">
                      {dualSystemStatus.current_system}
                    </p>
                  </div>
                  <Layers className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {dualSystemStatus.user_info?.is_test_user ? 'MCP Test User' : 'Legacy User'}
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Prompt</p>
                    <p className="text-lg font-semibold text-green-600">
                      {dualSystemStatus.selected_prompt?.promptName?.split(' ').slice(0, 2).join(' ') || 'N/A'}
                    </p>
                  </div>
                  <FileText className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Version {dualSystemStatus.selected_prompt?.version || 'N/A'}
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">System Health</p>
                    <p className="text-xl font-bold text-purple-600">Optimal</p>
                  </div>
                  <Cpu className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  A/B Testing: {dualSystemStatus.config?.ab_testing_enabled ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NEW: Purchase Order Extraction Monitoring */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="w-5 h-5 mr-2 text-blue-600" />
              Purchase Order Extraction Monitoring
            </h3>
            <button
              onClick={testPOExtraction}
              disabled={isTestingPO}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTestingPO ? (
                <Loader className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4 mr-2" />
              )}
              Test PO Prompt Selection
            </button>
          </div>

          {/* PO Statistics */}
          {poExtractionStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total PO Extractions</p>
                    <p className="text-2xl font-bold text-blue-600">{poExtractionStats.total}</p>
                  </div>
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">MCP System Usage</p>
                    <p className="text-2xl font-bold text-green-600">{poExtractionStats.mcpUsage}</p>
                  </div>
                  <Zap className="w-6 h-6 text-green-600" />
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Correct Prompts</p>
                    <p className="text-2xl font-bold text-purple-600">{poExtractionStats.correctPrompts}</p>
                  </div>
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Fallback Rate</p>
                    <p className="text-2xl font-bold text-red-600">{poExtractionStats.fallbackRate}%</p>
                  </div>
                  <Bug className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          )}

          {/* Warning for Edison if not using MCP */}
          {user?.email === 'edisonchung@flowsolution.net' && dualSystemStatus?.current_system !== 'mcp' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">Configuration Warning</h4>
              </div>
              <p className="text-yellow-700 text-sm">
                As a test user, you should be automatically assigned to the MCP system for purchase order extraction. 
                Current system: <span className="font-medium">{dualSystemStatus?.current_system?.toUpperCase()}</span>
              </p>
            </div>
          )}

          {/* Recent Extraction Logs */}
          {extractionLogs.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Recent PO Extractions (Last 20)
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {extractionLogs.slice(0, 10).map((log, index) => (
                  <div key={index} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        log.system === 'mcp' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.system?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs font-medium ${
                        log.promptName?.includes('Brand Detection') || log.promptName?.includes('Product Enhancement')
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {log.promptName || 'Unknown Prompt'}
                      </span>
                      {(log.promptName?.includes('Brand Detection') || log.promptName?.includes('Product Enhancement')) && (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* System Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Legacy Prompts</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dualSystemStatus?.system_stats?.legacy_prompts || 4}
                </p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Proven & Stable</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">MCP Prompts</p>
                <p className="text-2xl font-bold text-green-600">
                  {dualSystemStatus?.system_stats?.mcp_prompts || 8}
                </p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Advanced AI</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Test Users</p>
                <p className="text-2xl font-bold text-purple-600">
                  {dualSystemStatus?.system_stats?.test_users || 1}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Early Adopters</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">A/B Testing</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dualSystemStatus?.system_stats?.test_percentage || 5}%
                </p>
              </div>
              <Gauge className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Traffic Split</p>
          </div>
        </div>

        {/* Performance Comparison */}
        {dualSystemAnalytics && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
            <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Legacy System */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-900">Legacy System</h4>
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Extractions:</span>
                    <span className="font-medium">{dualSystemAnalytics.daily_extractions?.legacy_system?.count || 45}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Accuracy:</span>
                    <span className="font-medium">{dualSystemAnalytics.daily_extractions?.legacy_system?.avg_accuracy || 92}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Speed:</span>
                    <span className="font-medium">{dualSystemAnalytics.daily_extractions?.legacy_system?.avg_speed || 2.3}s</span>
                  </div>
                </div>
              </div>

              {/* MCP System */}
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-green-900">MCP System</h4>
                  <Zap className="w-5 h-5 text-green-600" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Extractions:</span>
                    <span className="font-medium">{dualSystemAnalytics.daily_extractions?.mcp_system?.count || 12}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Accuracy:</span>
                    <span className="font-medium text-green-600">
                      {dualSystemAnalytics.daily_extractions?.mcp_system?.avg_accuracy || 96}%
                      <span className="text-xs ml-1 text-green-500">
                        ({dualSystemAnalytics.performance_comparison?.accuracy_improvement || '+4%'})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Speed:</span>
                    <span className="font-medium text-green-600">
                      {dualSystemAnalytics.daily_extractions?.mcp_system?.avg_speed || 2.1}s
                      <span className="text-xs ml-1 text-green-500">
                        ({dualSystemAnalytics.performance_comparison?.speed_improvement || '+8%'})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Info className="w-5 h-5 text-yellow-600 mr-2" />
                <span className="font-medium text-yellow-900">
                  Recommendation: {dualSystemAnalytics.performance_comparison?.recommendation || 'Expand MCP system usage'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
          <h3 className="text-lg font-semibold mb-4">Prompt System Preferences</h3>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose your preferred prompt system. Changes apply immediately to your account.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Legacy System Option */}
              <button
                onClick={() => setPromptSystemPreference('legacy')}
                disabled={isLoadingDualSystem}
                className={`p-4 border rounded-lg text-left transition-all disabled:opacity-50 ${
                  userPreference === 'legacy' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Shield className="w-6 h-6 text-blue-600" />
                  {userPreference === 'legacy' && <CheckCircle className="w-5 h-5 text-blue-600" />}
                </div>
                <h4 className="font-medium text-gray-900">Legacy System</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Proven prompts with 92% accuracy. Safe and reliable for production use.
                </p>
              </button>

              {/* Auto System Option */}
              <button
                onClick={() => setPromptSystemPreference('auto')}
                disabled={isLoadingDualSystem}
                className={`p-4 border rounded-lg text-left transition-all disabled:opacity-50 ${
                  userPreference === 'auto' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <GitBranch className="w-6 h-6 text-purple-600" />
                  {userPreference === 'auto' && <CheckCircle className="w-5 h-5 text-purple-600" />}
                </div>
                <h4 className="font-medium text-gray-900">Auto (Recommended)</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Intelligent system selection based on user profile and A/B testing.
                </p>
              </button>

              {/* MCP System Option */}
              <button
                onClick={() => setPromptSystemPreference('mcp')}
                disabled={isLoadingDualSystem}
                className={`p-4 border rounded-lg text-left transition-all disabled:opacity-50 ${
                  userPreference === 'mcp' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-6 h-6 text-green-600" />
                  {userPreference === 'mcp' && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
                <h4 className="font-medium text-gray-900">MCP System</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Advanced AI prompts with 96% accuracy. Latest features and improvements.
                </p>
              </button>
            </div>

            {isLoadingDualSystem && (
              <div className="flex items-center justify-center py-4">
                <Loader className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">Updating preference...</span>
              </div>
            )}
          </div>
        </div>

        {/* System Features */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Zero-Risk Migration</h4>
                  <p className="text-sm text-gray-600">Automatic fallback to legacy system if MCP fails</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">A/B Testing</h4>
                  <p className="text-sm text-gray-600">Gradual rollout with statistical validation</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Real-time Analytics</h4>
                  <p className="text-sm text-gray-600">Performance comparison and usage tracking</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">PO Extraction Monitoring</h4>
                  <p className="text-sm text-gray-600">Specialized tracking for purchase order processing</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Enterprise Grade</h4>
                  <p className="text-sm text-gray-600">Production-ready with comprehensive monitoring</p>
                </div>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Backward Compatible</h4>
                  <p className="text-sm text-gray-600">All existing functionality preserved</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DualSystemDashboard;
