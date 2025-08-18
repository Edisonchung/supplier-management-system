import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, MapPin, AlertTriangle, Eye, Zap, Target, Globe } from 'lucide-react';

const HiggsFlowAnalyticsDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');
  const [realTimeData, setRealTimeData] = useState({
    activeUsers: 247,
    factories: 89,
    revenue: 125847,
    orders: 156
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        activeUsers: prev.activeUsers + Math.floor(Math.random() * 10 - 5),
        factories: prev.factories + Math.floor(Math.random() * 3 - 1),
        revenue: prev.revenue + Math.floor(Math.random() * 1000),
        orders: prev.orders + Math.floor(Math.random() * 5)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Sample data for charts
  const revenueData = [
    { date: 'Jan', revenue: 45000, orders: 120, factories: 45 },
    { date: 'Feb', revenue: 52000, orders: 145, factories: 52 },
    { date: 'Mar', revenue: 48000, orders: 135, factories: 48 },
    { date: 'Apr', revenue: 61000, orders: 165, factories: 58 },
    { date: 'May', revenue: 75000, orders: 195, factories: 67 },
    { date: 'Jun', revenue: 82000, orders: 220, factories: 74 },
    { date: 'Jul', revenue: 95000, orders: 245, factories: 82 },
    { date: 'Aug', revenue: 125847, orders: 280, factories: 89 }
  ];

  const factorySegments = [
    { name: 'Electronics', value: 35, color: '#3B82F6' },
    { name: 'Automotive', value: 28, color: '#10B981' },
    { name: 'Textile', value: 18, color: '#F59E0B' },
    { name: 'Chemical', value: 12, color: '#EF4444' },
    { name: 'Food Processing', value: 7, color: '#8B5CF6' }
  ];

  const userBehaviorData = [
    { hour: '00:00', visitors: 45, pageViews: 180, conversions: 5 },
    { hour: '04:00', visitors: 23, pageViews: 92, conversions: 2 },
    { hour: '08:00', visitors: 156, pageViews: 624, conversions: 18 },
    { hour: '12:00', visitors: 203, pageViews: 812, conversions: 25 },
    { hour: '16:00', visitors: 187, pageViews: 748, conversions: 22 },
    { hour: '20:00', visitors: 134, pageViews: 536, conversions: 16 }
  ];

  const productPerformance = [
    { category: 'Industrial Pumps', sales: 45, revenue: 125000, margin: 32 },
    { category: 'Electrical Components', sales: 89, revenue: 89500, margin: 28 },
    { category: 'Safety Equipment', sales: 67, revenue: 67800, margin: 35 },
    { category: 'Automation Tools', sales: 34, revenue: 156000, margin: 42 },
    { category: 'Raw Materials', sales: 78, revenue: 78900, margin: 18 }
  ];

  const geographicData = [
    { region: 'Selangor', factories: 32, revenue: 45000 },
    { region: 'Johor', factories: 28, revenue: 38000 },
    { region: 'Penang', factories: 15, revenue: 29000 },
    { region: 'Perak', factories: 8, revenue: 12000 },
    { region: 'Kedah', factories: 6, revenue: 8500 }
  ];

  const MetricCard = ({ title, value, change, icon: Icon, color = "blue" }) => (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
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

  const TabButton = ({ id, label, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm font-medium rounded-lg ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">HiggsFlow Analytics</h1>
              <p className="text-gray-600">Phase 2B - Business Intelligence Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Real-time active</span>
              </div>
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
          <TabButton id="overview" label="Overview" active={activeTab === 'overview'} onClick={setActiveTab} />
          <TabButton id="revenue" label="Revenue Intelligence" active={activeTab === 'revenue'} onClick={setActiveTab} />
          <TabButton id="customers" label="Customer Insights" active={activeTab === 'customers'} onClick={setActiveTab} />
          <TabButton id="products" label="Product Performance" active={activeTab === 'products'} onClick={setActiveTab} />
          <TabButton id="geography" label="Geographic Analysis" active={activeTab === 'geography'} onClick={setActiveTab} />
          <TabButton id="operations" label="Operations" active={activeTab === 'operations'} onClick={setActiveTab} />
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Real-time Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard 
                title="Active Users" 
                value={realTimeData.activeUsers} 
                change={12} 
                icon={Users} 
                color="blue" 
              />
              <MetricCard 
                title="Connected Factories" 
                value={realTimeData.factories} 
                change={8} 
                icon={Target} 
                color="green" 
              />
              <MetricCard 
                title="Monthly Revenue" 
                value={`RM ${realTimeData.revenue.toLocaleString()}`} 
                change={23} 
                icon={DollarSign} 
                color="yellow" 
              />
              <MetricCard 
                title="Total Orders" 
                value={realTimeData.orders} 
                change={15} 
                icon={ShoppingCart} 
                color="purple" 
              />
            </div>

            {/* Revenue Trend */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Growth Trend</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
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

            {/* Factory Segments & User Behavior */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Industry Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={factorySegments}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({name, value}) => `${name}: ${value}%`}
                    >
                      {factorySegments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily User Activity Pattern</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userBehaviorData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="visitors" stroke="#3B82F6" name="Visitors" />
                    <Line type="monotone" dataKey="conversions" stroke="#10B981" name="Conversions" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Intelligence Tab */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Total Revenue" value="RM 1.2M" change={23} icon={DollarSign} color="green" />
              <MetricCard title="Average Order Value" value="RM 4,520" change={8} icon={TrendingUp} color="blue" />
              <MetricCard title="Revenue Growth Rate" value="23.5%" change={5} icon={Activity} color="purple" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Analytics - Multi-Metric View</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Revenue (RM)" />
                  <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" name="Orders" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Factory Type</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={factorySegments}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Growth Prediction</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">September Forecast</span>
                    <span className="text-green-600 font-bold">RM 145K (+15%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Q4 Projection</span>
                    <span className="text-blue-600 font-bold">RM 485K (+28%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">2025 Target</span>
                    <span className="text-purple-600 font-bold">RM 2.1M (+67%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Insights Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard title="Total Factories" value="89" change={12} icon={Target} color="blue" />
              <MetricCard title="Active This Month" value="67" change={8} icon={Activity} color="green" />
              <MetricCard title="New Registrations" value="15" change={25} icon={Users} color="yellow" />
              <MetricCard title="Churn Risk" value="3" change={-40} icon={AlertTriangle} color="red" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Acquisition & Retention</h3>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="factories" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Total Factories" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Lifetime Value Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>High Value (>RM 50K)</span>
                    <span className="font-bold text-green-600">23 factories</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Medium Value (RM 20K-50K)</span>
                    <span className="font-bold text-blue-600">34 factories</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Low Value (<RM 20K)</span>
                    <span className="font-bold text-yellow-600">32 factories</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Average Session Duration</span>
                    <span className="font-bold">8m 34s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pages per Session</span>
                    <span className="font-bold">12.7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Monthly Active Rate</span>
                    <span className="font-bold">75.3%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Conversion Rate</span>
                    <span className="font-bold">23.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Product Performance Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Total Products" value="2,847" change={15} icon={ShoppingCart} color="blue" />
              <MetricCard title="Best Seller Category" value="Automation" change={42} icon={TrendingUp} color="green" />
              <MetricCard title="Average Margin" value="31.2%" change={8} icon={DollarSign} color="yellow" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Category Performance</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {productPerformance.map((product, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sales}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">RM {product.revenue.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Product Category</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`RM ${value.toLocaleString()}`, 'Revenue']} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" name="Revenue (RM)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Geographic Analysis Tab */}
        {activeTab === 'geography' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard title="Covered States" value="13" change={8} icon={MapPin} color="blue" />
              <MetricCard title="Top Region" value="Selangor" change={23} icon={Globe} color="green" />
              <MetricCard title="Expansion Rate" value="15%" change={12} icon={TrendingUp} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Region</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={geographicData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`RM ${value.toLocaleString()}`, 'Revenue']} />
                    <Bar dataKey="revenue" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Factory Distribution</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={geographicData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="factories" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Regional Performance Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {geographicData.map((region, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900">{region.region}</h4>
                    <p className="text-sm text-gray-600">{region.factories} factories</p>
                    <p className="text-lg font-bold text-blue-600">RM {region.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Operations Tab */}
        {activeTab === 'operations' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <MetricCard title="System Uptime" value="99.8%" change={0.2} icon={Activity} color="green" />
              <MetricCard title="Avg Response Time" value="124ms" change={-15} icon={Zap} color="blue" />
              <MetricCard title="API Calls/Hour" value="15.2K" change={18} icon={Eye} color="yellow" />
              <MetricCard title="Active Sessions" value="247" change={8} icon={Users} color="purple" />
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance Monitoring</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={userBehaviorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visitors" stroke="#3B82F6" name="Active Users" />
                  <Line type="monotone" dataKey="pageViews" stroke="#10B981" name="Page Views" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Status</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Database Performance
                    </span>
                    <span className="text-green-600 font-medium">Normal</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      API Gateway
                    </span>
                    <span className="text-green-600 font-medium">Normal</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <span className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                      Cache Hit Rate
                    </span>
                    <span className="text-yellow-600 font-medium">Warning</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Resource Utilization</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">CPU Usage</span>
                      <span className="text-sm font-medium">67%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{width: '67%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Memory Usage</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{width: '45%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Storage Usage</span>
                      <span className="text-sm font-medium">78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{width: '78%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HiggsFlowAnalyticsDashboard;
