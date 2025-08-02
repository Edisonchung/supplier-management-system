// components/mcp/DualSystemDashboard.jsx - Control panel for dual prompt system
import React, { useState, useEffect } from 'react';
import { 
  ToggleLeft, 
  ToggleRight,
  Activity,
  Users,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  TestTube,
  RefreshCw
} from 'lucide-react';

const DualSystemDashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [userPreference, setUserPreference] = useState('auto'); // 'legacy', 'mcp', 'auto'
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);

  // API base URL
  const API_BASE = import.meta.env.VITE_MCP_SERVER_URL || 'https://supplier-mcp-server-production.up.railway.app';
  const EXTRACTION_API = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

  useEffect(() => {
    loadSystemStatus();
    loadAnalytics();
    loadUserPreference();
  }, []);

  const loadSystemStatus = async () => {
    try {
      const response = await fetch(`${EXTRACTION_API}/api/prompt-system-status?userEmail=${getCurrentUserEmail()}`);
      if (response.ok) {
        const data = await response.json();
        setSystemStatus(data);
      }
    } catch (error) {
      console.warn('Failed to load system status:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${EXTRACTION_API}/api/prompt-system-analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.warn('Failed to load analytics:', error);
      // Mock analytics for demo
      setAnalytics({
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
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserPreference = () => {
    const saved = localStorage.getItem('promptSystemPreference');
    if (saved) {
      setUserPreference(saved);
    }
  };

  const getCurrentUserEmail = () => {
    // Get current user email from your auth system
    return localStorage.getItem('userEmail') || 'user@flowsolution.net';
  };

  const setPromptSystemPreference = async (preference) => {
    try {
      const response = await fetch(`${EXTRACTION_API}/api/set-prompt-system-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: getCurrentUserEmail(),
          promptSystem: preference,
          permanent: true
        })
      });

      if (response.ok) {
        setUserPreference(preference);
        localStorage.setItem('promptSystemPreference', preference);
        
        // Show success notification
        showNotification(`Prompt system set to ${preference.toUpperCase()}`, 'success');
        
        // Reload status
        await loadSystemStatus();
      }
    } catch (error) {
      console.error('Failed to set preference:', error);
      showNotification('Failed to update preference', 'error');
    }
  };

  const toggleTestMode = async () => {
    const newTestMode = !testMode;
    setTestMode(newTestMode);
    
    if (newTestMode) {
      await setPromptSystemPreference('mcp');
      showNotification('Test mode enabled - Using MCP prompts', 'info');
    } else {
      await setPromptSystemPreference('auto');
      showNotification('Test mode disabled - Using automatic selection', 'info');
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([loadSystemStatus(), loadAnalytics()]);
    setLoading(false);
  };

  const showNotification = (message, type) => {
    // Implement your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading dual system status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Dual Prompt System Control Panel</h2>
          <p className="text-gray-600">Manage and monitor legacy vs MCP prompt systems</p>
        </div>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current System */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Current System</h3>
            {systemStatus?.current_system === 'mcp' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <Activity className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">
              {systemStatus?.current_system?.toUpperCase() || 'LEGACY'}
            </div>
            <div className="text-sm text-gray-600">
              Prompt: {systemStatus?.selected_prompt?.promptName || 'Legacy Base Template'}
            </div>
            <div className="text-sm text-gray-600">
              Version: {systemStatus?.selected_prompt?.version || '1.3.0'}
            </div>
          </div>
        </div>

        {/* User Status */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Your Status</h3>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Email:</span> {getCurrentUserEmail()}
            </div>
            <div className="text-sm">
              <span className="font-medium">Test User:</span> 
              <span className={`ml-1 px-2 py-1 rounded text-xs ${
                systemStatus?.user_info?.is_test_user 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {systemStatus?.user_info?.is_test_user ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Preference:</span> 
              <span className="ml-1 font-mono text-blue-600">
                {userPreference.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">System Stats</h3>
            <BarChart3 className="w-5 h-5 text-orange-500" />
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Legacy Prompts:</span> 
              <span className="ml-1">{systemStatus?.system_stats?.legacy_prompts || 3}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">MCP Prompts:</span> 
              <span className="ml-1">{systemStatus?.system_stats?.mcp_prompts || 0}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium">Test Users:</span> 
              <span className="ml-1">{systemStatus?.system_stats?.test_users || 1}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-semibold text-gray-900 mb-4">Prompt System Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* System Preference */}
          <div>
            <label className="block text-sm font-medium mb-3">System Preference</label>
            <div className="space-y-2">
              {[
                { value: 'auto', label: 'Automatic (Recommended)', desc: 'System chooses best prompt' },
                { value: 'legacy', label: 'Legacy System Only', desc: 'Use proven legacy prompts' },
                { value: 'mcp', label: 'MCP System Only', desc: 'Use new MCP prompts' }
              ].map((option) => (
                <label key={option.value} className="flex items-start">
                  <input
                    type="radio"
                    value={option.value}
                    checked={userPreference === option.value}
                    onChange={(e) => setPromptSystemPreference(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Test Mode Toggle */}
          <div>
            <label className="block text-sm font-medium mb-3">Test Mode</label>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium">Force MCP Testing</div>
                <div className="text-sm text-gray-600">
                  Override automatic selection for testing
                </div>
              </div>
              <button
                onClick={toggleTestMode}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  testMode 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-300 text-gray-700'
                }`}
              >
                {testMode ? (
                  <>
                    <ToggleRight className="w-4 h-4 mr-2" />
                    Enabled
                  </>
                ) : (
                  <>
                    <ToggleLeft className="w-4 h-4 mr-2" />
                    Disabled
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analytics */}
      {analytics && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-4">Performance Comparison</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Extractions */}
            <div>
              <h4 className="font-medium mb-3">Daily Extractions</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium text-blue-900">Legacy System</div>
                    <div className="text-sm text-blue-700">
                      {analytics.daily_extractions.legacy_system.avg_accuracy}% accuracy • 
                      {analytics.daily_extractions.legacy_system.avg_speed}s avg
                    </div>
                  </div>
                  <div className="text-xl font-bold text-blue-900">
                    {analytics.daily_extractions.legacy_system.count}
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium text-green-900">MCP System</div>
                    <div className="text-sm text-green-700">
                      {analytics.daily_extractions.mcp_system.avg_accuracy}% accuracy • 
                      {analytics.daily_extractions.mcp_system.avg_speed}s avg
                    </div>
                  </div>
                  <div className="text-xl font-bold text-green-900">
                    {analytics.daily_extractions.mcp_system.count}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div>
              <h4 className="font-medium mb-3">Performance Improvements</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accuracy Improvement:</span>
                  <span className="font-semibold text-green-600">
                    {analytics.performance_comparison.accuracy_improvement}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Speed Improvement:</span>
                  <span className="font-semibold text-green-600">
                    {analytics.performance_comparison.speed_improvement}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">User Distribution:</span>
                  <span className="font-semibold text-blue-600">
                    {analytics.user_distribution.legacy_users + analytics.user_distribution.mcp_users} users
                  </span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="font-medium text-yellow-800">Recommendation</span>
                </div>
                <div className="text-sm text-yellow-700 mt-1">
                  {analytics.performance_comparison.recommendation}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <TestTube className="w-6 h-6 text-blue-600 mb-2" />
            <span className="text-sm font-medium">Test Extract</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <Settings className="w-6 h-6 text-gray-600 mb-2" />
            <span className="text-sm font-medium">Manage Prompts</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
            <span className="text-sm font-medium">View Analytics</span>
          </button>
          <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
            <AlertCircle className="w-6 h-6 text-orange-600 mb-2" />
            <span className="text-sm font-medium">System Health</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DualSystemDashboard;
