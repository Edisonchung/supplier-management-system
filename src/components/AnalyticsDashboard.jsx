// src/components/AnalyticsDashboard.jsx
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { MapPin, TrendingUp, Users, Eye, ShoppingCart, Clock, AlertTriangle, Star, Target, Activity } from 'lucide-react';

// Main Analytics Dashboard Component
const AnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Simulate API call - replace with actual analytics service
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setAnalyticsData({
        overview: {
          totalFactories: 127,
          activeUsers: 89,
          productViews: 2847,
          quoteRequests: 156,
          revenueGrowth: 24.3,
          conversionRate: 5.5
        },
        factories: [
          { name: 'Petronas Refinery', industry: 'Oil & Gas', location: 'Pengerang', revenue: 234000, growth: 18.5 },
          { name: 'Intel Malaysia', industry: 'Semiconductor', location: 'Kulim', revenue: 189000, growth: 22.1 },
          { name: 'Sime Darby Plantation', industry: 'Palm Oil', location: 'Klang', revenue: 156000, growth: 15.7 },
          { name: 'Proton Manufacturing', industry: 'Automotive', location: 'Shah Alam', revenue: 134000, growth: 12.3 }
        ],
        products: [
          { category: 'Industrial Pumps', views: 456, quotes: 23, conversion: 5.0 },
          { category: 'Safety Equipment', views: 389, quotes: 31, conversion: 8.0 },
          { category: 'Electrical Components', views: 367, quotes: 18, conversion: 4.9 },
          { category: 'HVAC Systems', views: 298, quotes: 15, conversion: 5.0 }
        ],
        geographic: [
          { region: 'Klang Valley', factories: 45, revenue: 567000 },
          { region: 'Pengerang', factories: 12, revenue: 234000 },
          { region: 'Kulim Hi-Tech', factories: 18, revenue: 189000 },
          { region: 'Johor Industrial', factories: 32, revenue: 156000 }
        ],
        trends: [
          { month: 'Jan', factories: 98, revenue: 145000 },
          { month: 'Feb', factories: 105, revenue: 167000 },
          { month: 'Mar', factories: 112, revenue: 189000 },
          { month: 'Apr', factories: 119, revenue: 201000 },
          { month: 'May', factories: 127, revenue: 234000 }
        ]
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'factories', label: 'Factory Intelligence', icon: Users },
    { id: 'products', label: 'Product Performance', icon: Target },
    { id: 'geographic', label: 'Geographic Insights', icon: MapPin },
    { id: 'recommendations', label: 'AI Recommendations', icon: Star }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🚀 HiggsFlow Analytics</h1>
            <p className="text-blue-100 mt-1">Industrial E-commerce Intelligence Platform</p>
          </div>
          <div className="flex items-center space-x-4">
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-blue-700 text-white border border-blue-500 rounded px-3 py-2"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <div className="text-right">
              <div className="text-sm text-blue-100">Live Analytics</div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-sm">Real-time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex space-x-8 px-6">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <IconComponent className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab data={analyticsData} />}
        {activeTab === 'factories' && <FactoryIntelligenceTab data={analyticsData} />}
        {activeTab === 'products' && <ProductPerformanceTab data={analyticsData} />}
        {activeTab === 'geographic' && <GeographicInsightsTab data={analyticsData} />}
        {activeTab === 'recommendations' && <RecommendationsTab data={analyticsData} />}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ data }) => {
  const kpiCards = [
    {
      title: 'Total Factories',
      value: data.overview.totalFactories,
      change: '+12%',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: data.overview.activeUsers,
      change: '+8%',
      icon: Activity,
      color: 'bg-green-500'
    },
    {
      title: 'Product Views',
      value: data.overview.productViews.toLocaleString(),
      change: '+15%',
      icon: Eye,
      color: 'bg-purple-500'
    },
    {
      title: 'Quote Requests',
      value: data.overview.quoteRequests,
      change: '+23%',
      icon: ShoppingCart,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => {
          const IconComponent = kpi.icon;
          return (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                  <p className="text-sm text-green-600 mt-1">{kpi.change} from last month</p>
                </div>
                <div className={`${kpi.color} p-3 rounded-lg`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Growth Trends Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data.trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Area 
              yAxisId="left"
              type="monotone" 
              dataKey="factories" 
              stackId="1" 
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.6}
              name="Factories"
            />
            <Area 
              yAxisId="right"
              type="monotone" 
              dataKey="revenue" 
              stackId="2" 
              stroke="#10B981" 
              fill="#10B981" 
              fillOpacity={0.6}
              name="Revenue (RM)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Key Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <TrendingUp className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Revenue Growth Accelerating</p>
                <p className="text-sm text-gray-600">24.3% month-over-month growth driven by Oil & Gas sector</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Factory Engagement Up</p>
                <p className="text-sm text-gray-600">89 active factories this month, highest engagement in Pengerang region</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Star className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">AI Recommendations Effective</p>
                <p className="text-sm text-gray-600">67% click-through rate on personalized product suggestions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚡ Real-time Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active users now</span>
              <span className="font-semibold text-green-600">23</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Products viewed (last hour)</span>
              <span className="font-semibold text-blue-600">156</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Quotes requested today</span>
              <span className="font-semibold text-purple-600">12</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">New factory registrations</span>
              <span className="font-semibold text-orange-600">3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Factory Intelligence Tab Component
const FactoryIntelligenceTab = ({ data }) => {
  const industryColors = {
    'Oil & Gas': '#EF4444',
    'Semiconductor': '#3B82F6',
    'Palm Oil': '#10B981',
    'Automotive': '#F59E0B',
    'Manufacturing': '#8B5CF6'
  };

  return (
    <div className="space-y-6">
      {/* Top Performing Factories */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Top Performing Factories</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Growth</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.factories.map((factory, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{factory.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                      style={{ backgroundColor: industryColors[factory.industry] }}
                    >
                      {factory.industry}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      {factory.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    RM {factory.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                      <span className="text-sm font-medium text-green-600">+{factory.growth}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Industry Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Industry Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.factories.map(f => ({ name: f.industry, value: f.revenue }))}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.factories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={industryColors[entry.industry]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `RM ${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Factory Intelligence Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Factory Size</span>
              <span className="font-semibold">Large Enterprise</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Identification Accuracy</span>
              <span className="font-semibold text-green-600">94.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Geographic Coverage</span>
              <span className="font-semibold">8 Industrial Zones</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Industry Penetration</span>
              <span className="font-semibold">67% of Target Market</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Average Order Value</span>
              <span className="font-semibold">RM 45,600</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customer Lifetime Value</span>
              <span className="font-semibold">RM 234,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Product Performance Tab Component
const ProductPerformanceTab = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Product Performance Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Product Performance Analysis</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.products}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="views" fill="#3B82F6" name="Views" />
            <Bar yAxisId="left" dataKey="quotes" fill="#10B981" name="Quotes" />
            <Bar yAxisId="right" dataKey="conversion" fill="#F59E0B" name="Conversion %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Product Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🔥 Trending Products</h3>
          <div className="space-y-3">
            {[
              { name: 'Industrial Centrifugal Pumps', trend: '+45%', category: 'Pumps' },
              { name: 'Safety Harness Systems', trend: '+32%', category: 'Safety' },
              { name: 'VFD Motor Controllers', trend: '+28%', category: 'Electrical' },
              { name: 'HVAC Cooling Units', trend: '+25%', category: 'HVAC' }
            ].map((product, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.category}</p>
                </div>
                <span className="text-green-600 font-semibold">{product.trend}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">⚠️ Attention Needed</h3>
          <div className="space-y-3">
            {[
              { name: 'Pneumatic Valves', issue: 'Low conversion', severity: 'high' },
              { name: 'Chemical Sensors', issue: 'Declining views', severity: 'medium' },
              { name: 'Backup Generators', issue: 'High abandonment', severity: 'high' },
              { name: 'Fire Safety Systems', issue: 'Price concerns', severity: 'low' }
            ].map((product, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-600">{product.issue}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  product.severity === 'high' ? 'bg-red-100 text-red-800' :
                  product.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {product.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Geographic Insights Tab Component
const GeographicInsightsTab = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Geographic Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🗺️ Geographic Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.geographic}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="factories" fill="#3B82F6" name="Factories" />
            <Bar yAxisId="right" dataKey="revenue" fill="#10B981" name="Revenue (RM)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Regional Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">🏆 Top Performing Region</h4>
          <div className="text-center">
            <MapPin className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-gray-900">Klang Valley</p>
            <p className="text-sm text-gray-600">45 factories</p>
            <p className="text-sm text-green-600 font-semibold">RM 567K revenue</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">📈 Fastest Growing</h4>
          <div className="text-center">
            <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-gray-900">Pengerang</p>
            <p className="text-sm text-gray-600">12 factories</p>
            <p className="text-sm text-green-600 font-semibold">+34% growth</p>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">🎯 High Potential</h4>
          <div className="text-center">
            <Target className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-lg font-bold text-gray-900">Kulim Hi-Tech</p>
            <p className="text-sm text-gray-600">18 factories</p>
            <p className="text-sm text-purple-600 font-semibold">Semiconductor hub</p>
          </div>
        </div>
      </div>

      {/* Opportunity Analysis */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Market Opportunities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Untapped Regions</h4>
            <div className="space-y-2">
              {[
                { region: 'East Coast Economic Region', potential: 'High', industries: 'Oil & Gas, Petrochemical' },
                { region: 'Northern Corridor', potential: 'Medium', industries: 'Electronics, Manufacturing' },
                { region: 'Southern Industrial', potential: 'High', industries: 'Automotive, Aerospace' }
              ].map((opportunity, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{opportunity.region}</p>
                      <p className="text-sm text-gray-600">{opportunity.industries}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      opportunity.potential === 'High' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {opportunity.potential}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Expansion Strategy</h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 1: East Coast</p>
                  <p className="text-sm text-gray-600">Target petrochemical complexes in Kuantan and Kerteh</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 2: Southern Corridor</p>
                  <p className="text-sm text-gray-600">Automotive and aerospace in Johor and Melaka</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-gray-900">Phase 3: Northern Region</p>
                  <p className="text-sm text-gray-600">Electronics manufacturing in Penang and Kedah</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Recommendations Tab Component
const RecommendationsTab = ({ data }) => {
  const [selectedFactory, setSelectedFactory] = useState('petronas');
  
  const factoryRecommendations = {
    petronas: {
      name: 'Petronas Refinery',
      industry: 'Oil & Gas',
      recommendations: [
        { product: 'High-Pressure Valves', confidence: 94, reason: 'Similar refineries purchased', urgency: 'high' },
        { product: 'Corrosion Inhibitors', confidence: 87, reason: 'Maintenance schedule prediction', urgency: 'medium' },
        { product: 'Safety Monitoring Systems', confidence: 82, reason: 'Industry compliance trends', urgency: 'low' }
      ]
    },
    intel: {
      name: 'Intel Malaysia',
      industry: 'Semiconductor',
      recommendations: [
        { product: 'Cleanroom Equipment', confidence: 96, reason: 'Production expansion detected', urgency: 'high' },
        { product: 'Precision Air Filtration', confidence: 89, reason: 'Quality control requirements', urgency: 'medium' },
        { product: 'ESD Protection Systems', confidence: 85, reason: 'Technology upgrade cycle', urgency: 'low' }
      ]
    }
  };

  const currentRecommendations = factoryRecommendations[selectedFactory];

  return (
    <div className="space-y-6">
      {/* Factory Selector */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 AI-Powered Recommendations</h3>
        <div className="flex space-x-4 mb-6">
          <select 
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="petronas">Petronas Refinery</option>
            <option value="intel">Intel Malaysia</option>
          </select>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">AI Engine Active</span>
          </div>
        </div>

        {/* Recommendations List */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900">Recommendations for {currentRecommendations.name}</h4>
            <span className="text-sm text-gray-600">{currentRecommendations.industry}</span>
          </div>
          
          {currentRecommendations.recommendations.map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{rec.product}</h5>
                  <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                  
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${rec.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{rec.confidence}%</span>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      rec.urgency === 'high' ? 'bg-red-100 text-red-800' :
                      rec.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {rec.urgency} urgency
                    </span>
                  </div>
                </div>
                
                <button className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Send Quote
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">🎯 Recommendation Accuracy</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">89.2%</div>
            <p className="text-sm text-gray-600">Average accuracy across all recommendations</p>
            <div className="mt-2 text-xs text-green-600">+5.3% from last month</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">📈 Click-through Rate</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">67.8%</div>
            <p className="text-sm text-gray-600">Users clicking on AI recommendations</p>
            <div className="mt-2 text-xs text-blue-600">+12.1% from last month</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-3">💰 Revenue Impact</h4>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">23.4%</div>
            <p className="text-sm text-gray-600">Revenue attributed to AI recommendations</p>
            <div className="mt-2 text-xs text-purple-600">+8.7% from last month</div>
          </div>
        </div>
      </div>

      {/* AI Engine Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Engine Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <p className="text-sm font-medium">Models Active</p>
            <p className="text-xs text-gray-600">3/3 Online</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-medium">Processing</p>
            <p className="text-xs text-gray-600">Real-time</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-sm font-medium">Learning</p>
            <p className="text-xs text-gray-600">Continuous</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <p className="text-sm font-medium">Last Update</p>
            <p className="text-xs text-gray-600">2 mins ago</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
