// src/components/analytics/HiggsFlowAnalyticsDashboard.jsx - MCP Enhanced Version

import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, MapPin, AlertTriangle, Eye, Zap, Target, Globe, Brain, Bot, Cpu } from 'lucide-react';
import { useMCPAnalytics } from '../../services/mcpAnalyticsService';

const HiggsFlowAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  
  // Use MCP-enhanced analytics hook
  const { data, loading, error, mcpConnected, refetch } = useMCPAnalytics(timeRange);

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue", mcpEnhanced = false }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 relative">
      {/* MCP Enhancement Badge */}
      {mcpEnhanced && (
        <div className="absolute top-2 right-2 flex items-center space-x-1">
          <Brain className="h-3 w-3 text-purple-500" />
          <span className="text-xs text-purple-600 font-medium">AI</span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 bg-${color}-100 rounded-full`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
      {change && (
        <div className="flex items-center mt-2">
          {change > 0 ? (
            <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
          )}
          <span className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change)}% from last month
          </span>
        </div>
      )}
    </div>
  );

  const TabButton = ({ id, label, active, onClick, badge }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg relative ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
      {badge && (
        <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs px-1 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  // MCP Status Indicator
  const MCPStatusIndicator = () => (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
      mcpConnected 
        ? 'bg-green-100 text-green-700' 
        : 'bg-yellow-100 text-yellow-700'
    }`}>
      <Bot className="h-3 w-3" />
      <span>{mcpConnected ? 'MCP AI Active' : 'Fallback Mode'}</span>
      {mcpConnected && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading MCP Analytics...</p>
          <p className="text-sm text-gray-500">Connecting to AI systems</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Analytics Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HiggsFlow Analytics</h1>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-gray-600">Phase 2B - AI-Powered Business Intelligence</p>
                <MCPStatusIndicator />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-2 mb-6">
          <TabButton id="overview" label="Overview" active={activeTab === 'overview'} onClick={setActiveTab} badge={mcpConnected ? "AI" : null} />
          <TabButton id="revenue" label="Revenue Intelligence" active={activeTab === 'revenue'} onClick={setActiveTab} />
          <TabButton id="customers" label="Customer Insights" active={activeTab === 'customers'} onClick={setActiveTab} badge={mcpConnected ? "AI" : null} />
          <TabButton id="products" label="Product Performance" active={activeTab === 'products'} onClick={setActiveTab} badge={mcpConnected ? "AI" : null} />
          <TabButton id="geography" label="Geographic Analysis" active={activeTab === 'geography'} onClick={setActiveTab} badge={mcpConnected ? "AI" : null} />
          <TabButton id="operations" label="Operations" active={activeTab === 'operations'} onClick={setActiveTab} badge={mcpConnected ? "MCP" : null} />
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Real-time Metrics with MCP Enhancement */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                title="Active Users" 
                value={data.metrics?.activeUsers || 0} 
                change={data.metrics?.growth?.users || 12} 
                icon={Users} 
                color="blue"
                mcpEnhanced={mcpConnected}
              />
              <MetricCard 
                title="Connected Factories" 
                value={data.metrics?.factories || 0} 
                change={data.metrics?.growth?.factories || 8} 
                icon={Target} 
                color="green"
                mcpEnhanced={mcpConnected}
              />
              <MetricCard 
                title="Monthly Revenue" 
                value={`RM ${(data.metrics?.revenue || 0).toLocaleString()}`} 
                change={data.metrics?.growth?.revenue || 23} 
                icon={DollarSign} 
                color="yellow"
              />
              <MetricCard 
                title="Total Orders" 
                value={data.metrics?.orders || 0} 
                change={data.metrics?.growth?.orders || 15} 
                icon={ShoppingCart} 
                color="purple"
              />
            </div>

            {/* MCP AI Insights Panel */}
            {mcpConnected && data.metrics?.mcpInsights && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">MCP AI Insights</h3>
                  <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">Live AI Analysis</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{data.metrics.mcpInsights.documentProcessingAccuracy}%</p>
                    <p className="text-sm text-gray-600">Document Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{data.metrics.mcpInsights.supplierPerformanceScore}/10</p>
                    <p className="text-sm text-gray-600">Supplier Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{data.metrics.mcpInsights.aiProcessingVolume}</p>
                    <p className="text-sm text-gray-600">AI Processed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{data.metrics.mcpInsights.confidenceScore}%</p>
                    <p className="text-sm text-gray-600">AI Confidence</p>
                  </div>
                </div>
              </div>
            )}

            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Growth Trend</h3>
                {mcpConnected && (
                  <div className="flex items-center space-x-1 text-purple-600">
                    <Cpu className="h-4 w-4" />
                    <span className="text-xs">AI Enhanced</span>
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={data.revenue || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [`RM ${value.toLocaleString()}`, name]} />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3} 
                    name="Revenue (RM)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Customer Insights Tab with MCP AI Enhancement */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard title="Total Factories" value={data.customers?.totalFactories || 0} change={12} icon={Target} color="blue" mcpEnhanced={mcpConnected} />
              <MetricCard title="Active This Month" value={data.customers?.activeThisMonth || 0} change={8} icon={Activity} color="green" />
              <MetricCard title="New Registrations" value={data.customers?.newRegistrations || 0} change={25} icon={Users} color="yellow" />
              <MetricCard title="Churn Risk" value={data.customers?.churnRisk || 0} change={-40} icon={AlertTriangle} color="red" />
            </div>

            {/* MCP AI Supplier Analysis */}
            {mcpConnected && data.customers?.mcpSupplierAnalysis && (
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Supplier Intelligence</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">Top Performers</h4>
                    <p className="text-2xl font-bold text-green-600">{data.customers.mcpSupplierAnalysis.topPerformingFactories?.length || 0}</p>
                    <p className="text-sm text-green-600">Factories identified</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <h4 className="font-medium text-red-800">Risk Factories</h4>
                    <p className="text-2xl font-bold text-red-600">{data.customers.mcpSupplierAnalysis.riskFactories?.length || 0}</p>
                    <p className="text-sm text-red-600">Need attention</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Growth Potential</h4>
                    <p className="text-2xl font-bold text-blue-600">{data.customers.mcpSupplierAnalysis.growthPotentialFactories?.length || 0}</p>
                    <p className="text-sm text-blue-600">Expansion ready</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Insights Recommendations */}
            {mcpConnected && data.customers?.aiInsights?.recommendedActions && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center space-x-2 mb-4">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
                </div>
                <div className="space-y-2">
                  {data.customers.aiInsights.recommendedActions.map((action, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-blue-800">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Tab with AI Enhancement */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Total Products" value="2,847" change={15} icon={ShoppingCart} color="blue" />
              <MetricCard title="Best Seller Category" value="Automation" change={42} icon={TrendingUp} color="green" mcpEnhanced={mcpConnected} />
              <MetricCard title="Average Margin" value="31.2%" change={8} icon={DollarSign} color="yellow" />
            </div>

            {/* Product Performance with AI Insights */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Product Category Performance</h3>
                {mcpConnected && (
                  <div className="flex items-center space-x-1 text-purple-600">
                    <Brain className="h-4 w-4" />
                    <span className="text-xs">AI Enhanced Analysis</span>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                      {mcpConnected && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Insights</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(data.products || []).map((product, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sales}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">RM {product.revenue?.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.margin}%</td>
                        {mcpConnected && product.aiInsights && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                product.aiInsights.demandPrediction === 'growing' ? 'bg-green-100 text-green-700' :
                                product.aiInsights.demandPrediction === 'stable' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {product.aiInsights.demandPrediction}
                              </span>
                              <span className="text-xs text-gray-500">demand</span>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Operations Tab with MCP System Health */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard title="System Uptime" value={data.operations?.uptime || "99.8%"} change={0.2} icon={Activity} color="green" />
              <MetricCard title="Avg Response Time" value={data.operations?.responseTime || "124ms"} change={-15} icon={Zap} color="blue" />
              <MetricCard title="API Calls/Hour" value={data.operations?.apiCalls || "15.2K"} change={18} icon={Eye} color="yellow" />
              <MetricCard title="Active Sessions" value={data.operations?.activeSessions || 247} change={8} icon={Users} color="purple" />
            </div>

            {/* MCP System Health Panel */}
            {mcpConnected && data.operations?.mcpSystemHealth && (
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                <div className="flex items-center space-x-2 mb-4">
                  <Cpu className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">MCP AI System Health</h3>
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                    {data.operations.mcpSystemHealth.status}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-lg font-bold text-purple-600">{data.operations.mcpSystemHealth.processingCapacity}</p>
                    <p className="text-sm text-gray-600">Processing Capacity</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{data.operations.mcpSystemHealth.averageResponseTime}</p>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{data.operations.mcpSystemHealth.successRate}</p>
                    <p className="text-sm text-gray-600">Success Rate</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-lg font-bold text-orange-600">{data.operations.mcpSystemHealth.documentsProcessedToday}</p>
                    <p className="text-sm text-gray-600">Docs Processed Today</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Performance Metrics */}
            {mcpConnected && data.operations?.aiPerformanceMetrics && (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Performance Metrics</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{data.operations.aiPerformanceMetrics.extractionAccuracy}%</p>
                    <p className="text-xs text-gray-600">Extraction Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">{data.operations.aiPerformanceMetrics.processingSpeed}</p>
                    <p className="text-xs text-gray-600">Processing Speed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-purple-600">{data.operations.aiPerformanceMetrics.confidenceScores}%</p>
                    <p className="text-xs text-gray-600">Confidence Score</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-600">{data.operations.aiPerformanceMetrics.errorRate}</p>
                    <p className="text-xs text-gray-600">Error Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-orange-600">{data.operations.aiPerformanceMetrics.modelEfficiency}</p>
                    <p className="text-xs text-gray-600">Model Efficiency</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HiggsFlowAnalyticsDashboard;
